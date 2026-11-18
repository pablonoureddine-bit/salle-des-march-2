// Données de marché : Yahoo Finance (API publique non officielle, sans clé).
// Pour un usage commercial, remplacer par un fournisseur sous licence (Twelve Data, Polygon, EODHD…) :
// seules les fonctions de ce fichier sont à réécrire.
import { mockChart, mockSearch } from "./mock.js";

const MOCK = process.env.MOCK === "1";
const UA = "Mozilla/5.0 (compatible; InvestZoo/1.0)";
const cache = new Map();

async function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  if (hit?.pending) return hit.pending;
  const pending = fn().then(
    (value) => { cache.set(key, { at: Date.now(), value }); return value; },
    (err) => { cache.delete(key); throw err; },
  );
  cache.set(key, { ...(hit || {}), pending, at: hit?.at ?? 0 });
  return pending;
}

// Unités de temps proposées : historique complet et fenêtre courte pour le direct.
export const INTERVALS = {
  "15m": { interval: "15m", range: "1mo", live: "1d" },
  "1h": { interval: "60m", range: "6mo", live: "5d" },
  "1d": { interval: "1d", range: "2y", live: "5d" },
  "1wk": { interval: "1wk", range: "10y", live: "1mo" },
};

async function yahoo(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Yahoo Finance a répondu ${res.status}`);
  return res.json();
}

function toBars(result) {
  const t = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const bars = [];
  for (let i = 0; i < t.length; i++) {
    const c = q.close?.[i];
    if (c == null) continue;
    const o = q.open?.[i] ?? c, h = q.high?.[i] ?? c, l = q.low?.[i] ?? c;
    bars.push({ time: t[i], open: o, high: Math.max(h, o, c), low: Math.min(l, o, c), close: c, volume: q.volume?.[i] ?? null });
  }
  return bars;
}

function toMeta(m, bars) {
  const price = m.regularMarketPrice ?? bars.at(-1)?.close ?? null;
  const prev = m.chartPreviousClose ?? m.previousClose ?? null;
  return {
    symbol: m.symbol,
    name: m.longName || m.shortName || m.symbol,
    currency: m.currency || "",
    exchange: m.fullExchangeName || m.exchangeName || "",
    type: m.instrumentType || "",
    price,
    previousClose: prev,
    marketTime: m.regularMarketTime || null,
    timezone: m.exchangeTimezoneName || "",
  };
}

export async function chart(symbol, tf = "1d", live = false) {
  const cfg = INTERVALS[tf] || INTERVALS["1d"];
  const range = live ? cfg.live : cfg.range;
  if (MOCK) return mockChart(symbol, tf, live);
  return cached(`chart:${symbol}:${tf}:${range}`, live ? 8000 : 60000, async () => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${cfg.interval}&includePrePost=false`;
    const data = await yahoo(url);
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error(data?.chart?.error?.description || "Actif introuvable");
    const bars = toBars(result);
    return { meta: toMeta(result.meta || {}, bars), bars };
  });
}

// Cours d'une liste de symboles (bandeau, liste, tableau mondial) avec une mini-courbe sur 1 mois.
export async function quotes(symbols) {
  return Promise.all(symbols.map(async (s) => {
    try {
      if (MOCK) {
        const c = await mockChart(s, "1d", false);
        return { symbol: s, price: c.meta.price, previousClose: c.meta.previousClose, spark: c.bars.slice(-22).map((b) => b.close) };
      }
      return await cached(`q:${s}`, 20000, async () => {
        const d = await yahoo(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=1mo&interval=1d`);
        const res = d?.chart?.result?.[0];
        if (!res) throw new Error("introuvable");
        const bars = toBars(res);
        const m = toMeta(res.meta || {}, bars);
        const prev = bars.length >= 2 ? bars.at(-2).close : m.previousClose;
        return { symbol: s, price: m.price, previousClose: prev, spark: bars.map((b) => b.close), marketTime: m.marketTime };
      });
    } catch {
      return { symbol: s, price: null, previousClose: null, spark: [] };
    }
  }));
}

export async function search(q) {
  if (MOCK) return mockSearch(q);
  return cached(`s:${q.toLowerCase()}`, 300000, async () => {
    const d = await yahoo(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&lang=fr-FR&region=FR`);
    return (d.quotes || []).filter((x) => x.symbol).map((x) => ({
      symbol: x.symbol,
      name: x.longname || x.shortname || x.symbol,
      exchange: x.exchDisp || x.exchange || "",
      type: x.typeDisp || x.quoteType || "",
    }));
  });
}
