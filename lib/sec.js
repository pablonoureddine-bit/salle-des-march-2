// Comptes officiels des sociétés américaines depuis la SEC (EDGAR, données XBRL des rapports 10-K).
// Gratuit, sans clé. La SEC demande d'identifier l'application : variable SEC_CONTACT conseillée
// (par exemple "Invest Zoo contact@mondomaine.fr"), voir https://www.sec.gov/os/accessing-edgar-data
const UA = process.env.SEC_CONTACT ? `InvestZoo/1.0 ${process.env.SEC_CONTACT}` : "InvestZoo/1.0 (https://salle-des-marches.onrender.com)";
let tickers = { at: 0, map: null };

async function getJson(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`SEC a répondu ${r.status}`);
  return r.json();
}

async function cikOf(symbol) {
  if (!tickers.map || Date.now() - tickers.at > 24 * 3600e3) {
    const d = await getJson("https://www.sec.gov/files/company_tickers.json");
    tickers = { at: Date.now(), map: new Map(Object.values(d).map((x) => [x.ticker.toUpperCase(), { cik: x.cik_str, title: x.title }])) };
  }
  return tickers.map.get(symbol.toUpperCase().replace(".", "-"));
}

// Valeurs annuelles (rapports 10-K) d'une rubrique comptable, la plus récente pour chaque exercice.
function annual(facts, tags, unit = "USD", instant = false) {
  for (const tag of tags) {
    const rows = facts?.["us-gaap"]?.[tag]?.units?.[unit];
    if (!rows?.length) continue;
    const byYear = {};
    for (const r of rows) {
      if (r.form !== "10-K" || r.fp !== "FY") continue;
      if (!instant) {
        if (!r.start) continue;
        const days = (new Date(r.end) - new Date(r.start)) / 86400e3;
        if (days < 340 || days > 380) continue;
      }
      const y = r.end.slice(0, 4);
      if (!byYear[y] || r.filed > byYear[y].filed) byYear[y] = r;
    }
    const out = Object.fromEntries(Object.entries(byYear).map(([y, r]) => [y, r.val]));
    if (Object.keys(out).length) return out;
  }
  return {};
}

export const isUsTicker = (s) => /^[A-Z]{1,5}$/.test(s);

export async function secFundamentals(symbol) {
  const c = await cikOf(symbol);
  if (!c) throw new Error("société introuvable dans la base SEC");
  const d = await getJson(`https://data.sec.gov/api/xbrl/companyfacts/CIK${String(c.cik).padStart(10, "0")}.json`);
  const f = d.facts;
  const S = {
    revenue: annual(f, ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet"]),
    grossProfit: annual(f, ["GrossProfit"]),
    operatingIncome: annual(f, ["OperatingIncomeLoss"]),
    netIncome: annual(f, ["NetIncomeLoss"]),
    eps: annual(f, ["EarningsPerShareDiluted", "EarningsPerShareBasic"], "USD/shares"),
    totalAssets: annual(f, ["Assets"], "USD", true),
    totalLiabilities: annual(f, ["Liabilities"], "USD", true),
    equity: annual(f, ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"], "USD", true),
    cash: annual(f, ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"], "USD", true),
    totalDebt: annual(f, ["LongTermDebt", "LongTermDebtNoncurrent"], "USD", true),
    operatingCashFlow: annual(f, ["NetCashProvidedByUsedInOperatingActivities"]),
    capexPos: annual(f, ["PaymentsToAcquirePropertyPlantAndEquipment"]),
    dividendsPos: annual(f, ["PaymentsOfDividends", "PaymentsOfDividendsCommonStock"]),
  };
  const years = [...new Set(Object.values(S.revenue).length ? Object.keys(S.revenue) : Object.keys(S.netIncome))].sort().slice(-5);
  if (!years.length) throw new Error("aucun rapport annuel exploitable");
  const rows = years.map((y) => {
    const capex = S.capexPos[y] != null ? -S.capexPos[y] : null;
    const ocf = S.operatingCashFlow[y] ?? null;
    return {
      year: y, currency: "USD",
      revenue: S.revenue[y] ?? null, grossProfit: S.grossProfit[y] ?? null, operatingIncome: S.operatingIncome[y] ?? null, ebitda: null,
      netIncome: S.netIncome[y] ?? null, eps: S.eps[y] ?? null,
      totalAssets: S.totalAssets[y] ?? null, totalLiabilities: S.totalLiabilities[y] ?? null, equity: S.equity[y] ?? null,
      cash: S.cash[y] ?? null, totalDebt: S.totalDebt[y] ?? null,
      netDebt: S.totalDebt[y] != null && S.cash[y] != null ? S.totalDebt[y] - S.cash[y] : null,
      operatingCashFlow: ocf, capex, freeCashFlow: ocf != null && capex != null ? ocf + capex : null,
      dividendsPaid: S.dividendsPos[y] != null ? -S.dividendsPos[y] : null,
    };
  });
  const last = rows.at(-1);
  return {
    symbol,
    profile: { name: d.entityName || c.title, currency: "USD", country: "États-Unis", website: null, description: null },
    ratios: {
      netMargin: last.revenue && last.netIncome != null ? last.netIncome / last.revenue : null,
      grossMargin: last.revenue && last.grossProfit != null ? last.grossProfit / last.revenue : null,
      operatingMargin: last.revenue && last.operatingIncome != null ? last.operatingIncome / last.revenue : null,
      roe: last.equity && last.netIncome != null ? last.netIncome / last.equity : null,
      debtToEquity: last.equity && last.totalDebt != null ? last.totalDebt / last.equity : null,
    },
    years: rows,
    earnings: [],
    secCik: c.cik,
    source: "SEC EDGAR : rapports annuels (10-K) déposés par la société",
    updatedAt: new Date().toISOString(),
  };
}
