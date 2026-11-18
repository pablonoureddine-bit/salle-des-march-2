// Fiche entreprise : profil, comptes annuels (5 ans), ratios et résultats.
// Fournisseur : Financial Modeling Prep (https://site.financialmodelingprep.com), clé FMP_API_KEY.
// Les bilans y sont repris des publications officielles des sociétés (rapports annuels, 10-K…).
// Pour changer de fournisseur, seul ce fichier est à réécrire : il renvoie un objet normalisé.
import { mockFundamentals } from "./mock.js";

const MOCK = process.env.MOCK === "1";
const BASE = "https://financialmodelingprep.com/stable";
const cache = new Map();
const TTL = 6 * 3600 * 1000; // les comptes changent rarement : 6 h de cache

export const fundamentalsEnabled = () => MOCK || Boolean(process.env.FMP_API_KEY);

async function fmp(path, params) {
  const qs = new URLSearchParams({ ...params, apikey: process.env.FMP_API_KEY });
  const res = await fetch(`${BASE}/${path}?${qs}`, { signal: AbortSignal.timeout(12000) });
  if (res.status === 401 || res.status === 403) throw Object.assign(new Error("Clé Financial Modeling Prep refusée ou formule insuffisante pour cette donnée."), { status: 503 });
  if (!res.ok) throw new Error(`Financial Modeling Prep a répondu ${res.status}`);
  const data = await res.json();
  if (data && !Array.isArray(data) && data["Error Message"]) throw new Error(data["Error Message"]);
  return Array.isArray(data) ? data : [data];
}

// Les noms de champs varient selon les versions de l'API : on prend le premier présent.
const pick = (o, ...keys) => { for (const k of keys) if (o?.[k] != null && o[k] !== "") return o[k]; return null; };
const num = (o, ...keys) => { const v = pick(o, ...keys); const n = typeof v === "string" ? parseFloat(v) : v; return Number.isFinite(n) ? n : null; };

function normalize(symbol, { profile, income, balance, cash, ratios, metrics, earnings }) {
  const p = profile[0] || {};
  const r = ratios[0] || {}, m = metrics[0] || {};
  const years = income.map((inc) => {
    const y = pick(inc, "fiscalYear", "calendarYear") || String(inc.date || "").slice(0, 4);
    const bal = balance.find((b) => (pick(b, "fiscalYear", "calendarYear") || String(b.date).slice(0, 4)) === y) || {};
    const cf = cash.find((c) => (pick(c, "fiscalYear", "calendarYear") || String(c.date).slice(0, 4)) === y) || {};
    return {
      year: String(y), date: inc.date, currency: pick(inc, "reportedCurrency") || p.currency,
      revenue: num(inc, "revenue"), grossProfit: num(inc, "grossProfit"), operatingIncome: num(inc, "operatingIncome"),
      ebitda: num(inc, "ebitda"), netIncome: num(inc, "netIncome"), eps: num(inc, "epsDiluted", "epsdiluted", "eps"),
      totalAssets: num(bal, "totalAssets"), totalLiabilities: num(bal, "totalLiabilities"),
      equity: num(bal, "totalStockholdersEquity", "totalEquity"), cash: num(bal, "cashAndCashEquivalents", "cashAndShortTermInvestments"),
      totalDebt: num(bal, "totalDebt"), netDebt: num(bal, "netDebt"),
      operatingCashFlow: num(cf, "operatingCashFlow", "netCashProvidedByOperatingActivities"), capex: num(cf, "capitalExpenditure"),
      freeCashFlow: num(cf, "freeCashFlow"), dividendsPaid: num(cf, "commonDividendsPaid", "dividendsPaid", "netDividendsPaid"),
    };
  }).sort((a, b) => a.year.localeCompare(b.year));

  return {
    symbol,
    profile: {
      name: pick(p, "companyName") || symbol, sector: pick(p, "sector"), industry: pick(p, "industry"),
      country: pick(p, "country"), exchange: pick(p, "exchangeFullName", "exchange", "exchangeShortName"), currency: pick(p, "currency"),
      ceo: pick(p, "ceo"), employees: num(p, "fullTimeEmployees"), website: pick(p, "website"), image: pick(p, "image"),
      description: pick(p, "description"), ipoDate: pick(p, "ipoDate"),
      marketCap: num(p, "marketCap", "mktCap"), price: num(p, "price"), beta: num(p, "beta"),
      lastDividend: num(p, "lastDividend", "lastDiv"), range: pick(p, "range"),
    },
    ratios: {
      pe: num(r, "priceToEarningsRatioTTM", "peRatioTTM"), pb: num(r, "priceToBookRatioTTM"),
      ps: num(r, "priceToSalesRatioTTM"), evEbitda: num(m, "evToEBITDATTM", "enterpriseValueOverEBITDATTM"),
      dividendYield: num(r, "dividendYieldTTM", "dividendYielPercentageTTM"), payout: num(r, "dividendPayoutRatioTTM", "payoutRatioTTM"),
      grossMargin: num(r, "grossProfitMarginTTM"), operatingMargin: num(r, "operatingProfitMarginTTM"), netMargin: num(r, "netProfitMarginTTM"),
      roe: num(m, "returnOnEquityTTM") ?? num(r, "returnOnEquityTTM"), roic: num(m, "returnOnInvestedCapitalTTM"),
      debtToEquity: num(r, "debtToEquityRatioTTM", "debtEquityRatioTTM"), currentRatio: num(r, "currentRatioTTM"),
    },
    years,
    earnings: earnings.slice(0, 8).map((e) => ({ date: e.date, epsActual: num(e, "epsActual", "eps"), epsEstimated: num(e, "epsEstimated"), revenueActual: num(e, "revenueActual", "revenue"), revenueEstimated: num(e, "revenueEstimated") })),
    source: "Financial Modeling Prep",
    updatedAt: new Date().toISOString(),
  };
}

export async function fundamentals(symbol) {
  if (MOCK) return mockFundamentals(symbol);
  if (!process.env.FMP_API_KEY) throw Object.assign(new Error("Les données financières ne sont pas configurées : ajoute la variable FMP_API_KEY sur le serveur."), { status: 503 });
  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const opt = (p) => p.catch(() => []); // une donnée manquante ne bloque pas la fiche
  const [profile, income, balance, cash, ratios, metrics, earnings] = await Promise.all([
    fmp("profile", { symbol }),
    opt(fmp("income-statement", { symbol, period: "annual", limit: 5 })),
    opt(fmp("balance-sheet-statement", { symbol, period: "annual", limit: 5 })),
    opt(fmp("cash-flow-statement", { symbol, period: "annual", limit: 5 })),
    opt(fmp("ratios-ttm", { symbol })),
    opt(fmp("key-metrics-ttm", { symbol })),
    opt(fmp("earnings", { symbol, limit: 8 })),
  ]);
  if (!profile.length || !profile[0]?.companyName) throw Object.assign(new Error("Aucune donnée financière pour ce symbole."), { status: 404 });
  const value = normalize(symbol, { profile, income, balance, cash, ratios, metrics, earnings });
  cache.set(symbol, { at: Date.now(), value });
  return value;
}
