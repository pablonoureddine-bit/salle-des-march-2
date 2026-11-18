// Données fictives pour le développement hors ligne (MOCK=1). Jamais utilisées en production.
const STEP = { "15m": 900, "1h": 3600, "1d": 86400, "1wk": 604800 };
const BASE = { "^FCHI": 7400, "^GSPC": 7400, "^IXIC": 24000, "^NDX": 26000, "^DJI": 46000, "^GDAXI": 23000, "^STOXX50E": 5400, "^FTSE": 9300, "^N225": 48000, "BTC-USD": 63000, "ETH-USD": 2400, "EURUSD=X": 1.07, "GC=F": 3850, "BZ=F": 91.7 };

function seeded(str) {
  let s = [...str].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export async function mockChart(symbol, tf = "1d", live = false) {
  const step = STEP[tf] || 86400;
  const rnd = seeded(symbol + tf);
  const n = 500;
  const now = Math.floor(Date.now() / 1000 / step) * step;
  let c = BASE[symbol] ?? 100;
  const bars = [];
  for (let i = n; i >= 0; i--) {
    const t = now - i * step;
    const o = c;
    c = o * (1 + (rnd() - 0.49) * 0.02);
    const h = Math.max(o, c) * (1 + rnd() * 0.006), l = Math.min(o, c) * (1 - rnd() * 0.006);
    bars.push({ time: t, open: o, high: h, low: l, close: c, volume: Math.round(1e6 * (0.5 + rnd())) });
  }
  // Variation "en direct" : la dernière bougie bouge avec l'horloge.
  const last = bars.at(-1);
  const wiggle = 1 + Math.sin(Date.now() / 7000) * 0.003;
  last.close = last.open * wiggle;
  last.high = Math.max(last.high, last.close); last.low = Math.min(last.low, last.close);
  const out = live ? bars.slice(-5) : bars;
  return {
    meta: { symbol, name: `${symbol} (données fictives)`, currency: "EUR", exchange: "Démo", type: "INDEX", price: last.close, previousClose: bars.at(-2).close, marketTime: now, timezone: "Europe/Paris" },
    bars: out,
  };
}

export async function mockSearch(q) {
  return [{ symbol: q.toUpperCase(), name: `${q} (démo)`, exchange: "Démo", type: "Action" }];
}

// Titres fictifs, variés pour tester les thèmes et le ton (MOCK=1).
const MOCK_TITLES = [
  "La Fed pourrait relever ses taux en décembre, selon un responsable (exemple)",
  "Le pétrole recule sur des craintes de surabondance (exemple)",
  "Le bitcoin rebondit après une semaine de sorties des ETF (exemple)",
  "Nvidia dépasse les attentes, le titre grimpe (exemple)",
  "Le CAC 40 progresse, porté par le luxe (exemple)",
  "Droits de douane : nouvelles tensions entre Washington et Pékin (exemple)",
  "L'euro recule face au dollar (exemple)",
  "Résultats trimestriels solides pour un géant de la consommation (exemple)",
];
export function mockNews(label) {
  const now = Date.now();
  const k = [...label].reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: 6 }, (_, i) => ({
    title: MOCK_TITLES[(k + i) % MOCK_TITLES.length].replace("(exemple)", `(exemple ${label})`),
    link: "https://example.com/",
    source: label,
    date: new Date(now - i * 3600e3 - (k % 50) * 60e3).toISOString(),
  }));
}

// Fiche entreprise fictive (MOCK=1).
export function mockFundamentals(symbol) {
  let s = [...symbol].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const rev0 = 20e9 + rnd() * 60e9;
  const years = Array.from({ length: 5 }, (_, i) => {
    const revenue = rev0 * (1 + 0.06 * i + (rnd() - 0.5) * 0.05), net = revenue * (0.08 + rnd() * 0.1);
    return { year: String(2021 + i), revenue, grossProfit: revenue * 0.55, operatingIncome: net * 1.35, ebitda: net * 1.8, netIncome: net, eps: net / 5e8,
      totalAssets: revenue * 1.6, totalLiabilities: revenue * 0.9, equity: revenue * 0.7, cash: revenue * 0.15, totalDebt: revenue * 0.35, netDebt: revenue * 0.2,
      operatingCashFlow: net * 1.4, capex: -net * 0.4, freeCashFlow: net, dividendsPaid: -net * 0.4, currency: "EUR" };
  });
  return {
    symbol, demo: true,
    profile: { name: `${symbol} (entreprise fictive)`, sector: "Biens de consommation", industry: "Exemple", country: "FR", exchange: "Démo", currency: "EUR",
      ceo: "—", employees: 50000, website: "https://example.com", description: "Données fictives générées pour la démonstration. En production, cette fiche est remplie avec les comptes publiés par la société.",
      marketCap: rev0 * 3, price: 100, beta: 1.05, lastDividend: 2.4, range: "80-120" },
    ratios: { pe: 18.4, pb: 3.1, ps: 2.6, evEbitda: 11.2, dividendYield: 0.024, payout: 0.42, grossMargin: 0.55, operatingMargin: 0.17, netMargin: 0.12, roe: 0.18, roic: 0.13, debtToEquity: 0.5, currentRatio: 1.3 },
    years,
    forecasts: {
      estimates: [
        { period: "0y", label: "Exercice en cours", endDate: "2026-12-31", revenueAvg: rev0 * 1.32, revenueGrowth: 0.05, revenueAnalysts: 24, epsAvg: 10.4, epsGrowth: 0.05, epsAnalysts: 26 },
        { period: "+1y", label: "Exercice suivant", endDate: "2027-12-31", revenueAvg: rev0 * 1.4, revenueGrowth: 0.06, revenueAnalysts: 22, epsAvg: 11.3, epsGrowth: 0.09, epsAnalysts: 25 },
      ],
      target: { mean: 118, high: 145, low: 88, median: 120, analysts: 27, price: 100 },
      recommendation: "buy", trend: { strongBuy: 6, buy: 11, hold: 8, sell: 2, strongSell: 0 }, nextEarnings: "2027-02-12T00:00:00Z",
    },
    earnings: [{ date: "2027-02-12", epsActual: null, epsEstimated: 4.1 }, { date: "2026-10-23", epsActual: 3.9, epsEstimated: 3.7 }, { date: "2026-07-24", epsActual: 3.5, epsEstimated: 3.6 }],
    source: "Données fictives", updatedAt: new Date().toISOString(),
  };
}

// Prédiction fictive (MOCK=1) : suit simplement le score technique.
export function mockPrediction(symbol, A) {
  const up = 50 + A.score / 4;
  return {
    direction: A.score > 15 ? "hausse" : A.score < -15 ? "baisse" : "neutre",
    probabilite_hausse: Math.round(up), confiance: 40,
    objectif_haut: A.last + 1.5 * A.atrNow, objectif_bas: A.last - 1.5 * A.atrNow, invalidation: A.score >= 0 ? A.last - 2 * A.atrNow : A.last + 2 * A.atrNow,
    resume: `Exemple de prédiction générée sans IA (mode démonstration), à partir du score technique de ${A.score}/100.`,
    catalyseurs: [{ titre: 1, effet: "neutre", pourquoi: "Titre d'exemple utilisé pour illustrer l'affichage." }],
    risques: ["Données fictives : ne pas utiliser pour décider."],
  };
}
