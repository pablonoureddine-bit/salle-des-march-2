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

export function mockNews(label) {
  const now = Date.now();
  return Array.from({ length: 6 }, (_, i) => ({
    title: `Titre d'exemple ${i + 1} (${label})`,
    link: "https://example.com/",
    source: label,
    date: new Date(now - i * 3600e3).toISOString(),
  }));
}
