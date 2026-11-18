// Fiche entreprise gratuite à partir de Yahoo Finance (sans clé) :
// - comptes annuels (4 ans) via l'API "fundamentals-timeseries" ;
// - profil, ratios et PRÉVISIONS des analystes via "quoteSummary" (nécessite un cookie + "crumb").
// API non officielle : peut changer sans préavis. Les erreurs partielles n'empêchent pas d'afficher le reste.

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
let session = null; // { cookie, crumb, at }

async function getSession(force = false) {
  if (session && !force && Date.now() - session.at < 6 * 3600e3) return session;
  const r1 = await fetch("https://fc.yahoo.com/", { headers: { "User-Agent": UA }, redirect: "manual", signal: AbortSignal.timeout(10000) }).catch(() => null);
  const cookies = (r1?.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
  const r2 = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", { headers: { "User-Agent": UA, Cookie: cookies }, signal: AbortSignal.timeout(10000) });
  const crumb = (await r2.text()).trim();
  if (!r2.ok || !crumb || crumb.includes("<")) throw new Error("Yahoo Finance a refusé la session");
  session = { cookie: cookies, crumb, at: Date.now() };
  return session;
}

async function getJson(url, withSession) {
  const headers = { "User-Agent": UA, Accept: "application/json" };
  let s = null;
  if (withSession) { s = await getSession(); headers.Cookie = s.cookie; url += (url.includes("?") ? "&" : "?") + "crumb=" + encodeURIComponent(s.crumb); }
  let res = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
  if (withSession && (res.status === 401 || res.status === 403)) {
    s = await getSession(true); headers.Cookie = s.cookie;
    res = await fetch(url.replace(/crumb=[^&]+/, "crumb=" + encodeURIComponent(s.crumb)), { headers, signal: AbortSignal.timeout(12000) });
  }
  if (!res.ok) throw new Error(`Yahoo Finance a répondu ${res.status}`);
  return res.json();
}

const raw = (v) => (v && typeof v === "object" ? v.raw ?? null : Number.isFinite(v) ? v : null);

const SERIES = {
  revenue: "annualTotalRevenue", grossProfit: "annualGrossProfit", operatingIncome: "annualOperatingIncome",
  ebitda: "annualEBITDA", netIncome: "annualNetIncome", eps: "annualDilutedEPS",
  totalAssets: "annualTotalAssets", totalLiabilities: "annualTotalLiabilitiesNetMinorityInterest", equity: "annualStockholdersEquity",
  cash: "annualCashAndCashEquivalents", totalDebt: "annualTotalDebt", netDebt: "annualNetDebt",
  operatingCashFlow: "annualOperatingCashFlow", capex: "annualCapitalExpenditure", freeCashFlow: "annualFreeCashFlow", dividendsPaid: "annualCashDividendsPaid",
};

async function annualAccounts(symbol) {
  const now = Math.floor(Date.now() / 1000);
  const url = `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?symbol=${encodeURIComponent(symbol)}&type=${Object.values(SERIES).join(",")}&period1=1420070400&period2=${now}`;
  const data = await getJson(url, false);
  const byYear = {};
  for (const r of data?.timeseries?.result || []) {
    const type = r.meta?.type?.[0];
    const key = Object.keys(SERIES).find((k) => SERIES[k] === type);
    if (!key) continue;
    for (const pt of r[type] || []) {
      if (!pt?.asOfDate || pt.reportedValue?.raw == null) continue;
      const y = pt.asOfDate.slice(0, 4);
      (byYear[y] ||= { year: y, date: pt.asOfDate, currency: pt.currencyCode })[key] = pt.reportedValue.raw;
    }
  }
  return Object.values(byYear).sort((a, b) => a.year.localeCompare(b.year)).slice(-5);
}

const MODULES = "assetProfile,price,summaryDetail,defaultKeyStatistics,financialData,earningsTrend,recommendationTrend,calendarEvents,earningsHistory";

export async function yahooFundamentals(symbol) {
  const [accounts, summary] = await Promise.allSettled([
    annualAccounts(symbol),
    getJson(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${MODULES}`, true),
  ]);
  const years = accounts.status === "fulfilled" ? accounts.value : [];
  const q = summary.status === "fulfilled" ? summary.value?.quoteSummary?.result?.[0] || {} : {};
  if (!years.length && !q.price) throw Object.assign(new Error("Aucune donnée financière trouvée pour ce symbole."), { status: 404 });

  const ap = q.assetProfile || {}, pr = q.price || {}, sd = q.summaryDetail || {}, ks = q.defaultKeyStatistics || {}, fd = q.financialData || {};
  const lastYear = years.at(-1) || {};

  // Prévisions des analystes : année en cours (0y) et suivante (+1y), trimestres (0q, +1q).
  const LABEL = { "0q": "Trimestre en cours", "+1q": "Trimestre suivant", "0y": "Exercice en cours", "+1y": "Exercice suivant" };
  const estimates = (q.earningsTrend?.trend || []).filter((t) => LABEL[t.period]).map((t) => ({
    period: t.period, label: LABEL[t.period], endDate: t.endDate || null,
    revenueAvg: raw(t.revenueEstimate?.avg), revenueLow: raw(t.revenueEstimate?.low), revenueHigh: raw(t.revenueEstimate?.high),
    revenueGrowth: raw(t.revenueEstimate?.growth), revenueAnalysts: raw(t.revenueEstimate?.numberOfAnalysts),
    epsAvg: raw(t.earningsEstimate?.avg), epsLow: raw(t.earningsEstimate?.low), epsHigh: raw(t.earningsEstimate?.high),
    epsGrowth: raw(t.earningsEstimate?.growth), epsAnalysts: raw(t.earningsEstimate?.numberOfAnalysts),
  }));
  const rt = q.recommendationTrend?.trend?.[0] || null;
  const nextEarnings = raw(q.calendarEvents?.earnings?.earningsDate?.[0]);

  return {
    symbol,
    profile: {
      name: pr.longName || pr.shortName || symbol, sector: ap.sector || null, industry: ap.industry || null,
      country: ap.country || null, exchange: pr.exchangeName || null, currency: pr.currency || lastYear.currency || null,
      ceo: ap.companyOfficers?.[0]?.name || null, employees: ap.fullTimeEmployees || null, website: ap.website || null,
      image: null, description: ap.longBusinessSummary || null, ipoDate: null,
      marketCap: raw(pr.marketCap) ?? raw(sd.marketCap), price: raw(pr.regularMarketPrice), beta: raw(sd.beta) ?? raw(ks.beta),
      lastDividend: raw(sd.dividendRate), range: sd.fiftyTwoWeekLow && sd.fiftyTwoWeekHigh ? `${raw(sd.fiftyTwoWeekLow)} – ${raw(sd.fiftyTwoWeekHigh)}` : null,
    },
    ratios: {
      pe: raw(sd.trailingPE), forwardPe: raw(sd.forwardPE) ?? raw(ks.forwardPE), pb: raw(ks.priceToBook), ps: raw(sd.priceToSalesTrailing12Months),
      evEbitda: raw(ks.enterpriseToEbitda), dividendYield: raw(sd.dividendYield), payout: raw(sd.payoutRatio),
      grossMargin: raw(fd.grossMargins), operatingMargin: raw(fd.operatingMargins), netMargin: raw(fd.profitMargins),
      roe: raw(fd.returnOnEquity), roic: null, debtToEquity: raw(fd.debtToEquity) != null ? raw(fd.debtToEquity) / 100 : null, currentRatio: raw(fd.currentRatio),
    },
    years,
    forecasts: {
      estimates,
      target: { mean: raw(fd.targetMeanPrice), high: raw(fd.targetHighPrice), low: raw(fd.targetLowPrice), median: raw(fd.targetMedianPrice), analysts: raw(fd.numberOfAnalystOpinions), price: raw(fd.currentPrice) ?? raw(pr.regularMarketPrice) },
      recommendation: fd.recommendationKey || null,
      trend: rt ? { strongBuy: rt.strongBuy, buy: rt.buy, hold: rt.hold, sell: rt.sell, strongSell: rt.strongSell } : null,
      nextEarnings: nextEarnings ? new Date(nextEarnings * 1000).toISOString() : null,
    },
    earnings: (q.earningsHistory?.history || []).map((h) => ({ date: raw(h.quarter) ? new Date(raw(h.quarter) * 1000).toISOString() : null, epsActual: raw(h.epsActual), epsEstimated: raw(h.epsEstimate) })).filter((e) => e.date).reverse(),
    source: "Yahoo Finance (données publiques), d'après les comptes publiés par la société et le consensus des analystes",
    partial: summary.status !== "fulfilled" || accounts.status !== "fulfilled",
    updatedAt: new Date().toISOString(),
  };
}

// Prochaine date de publication de résultats (pour le calendrier).
export async function nextEarningsDate(symbol) {
  const d = await getJson(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=calendarEvents`, true);
  const ts = raw(d?.quoteSummary?.result?.[0]?.calendarEvents?.earnings?.earningsDate?.[0]);
  return ts ? new Date(ts * 1000).toISOString() : null;
}
