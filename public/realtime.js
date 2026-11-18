// Temps réel pour les cryptos : flux public et gratuit de Binance (sans clé), directement depuis le navigateur.
// Mises à jour du graphique en continu. Si Binance n'est pas joignable (réseau, pays), on revient au mode normal.

const MAP = { "BTC-USD": "BTCUSDT", "ETH-USD": "ETHUSDT", "SOL-USD": "SOLUSDT", "XRP-USD": "XRPUSDT", "BNB-USD": "BNBUSDT" };
const TF = { "1m": "1m", "15m": "15m", "1h": "1h", "1d": "1d", "1wk": "1w" };
export const hasRealtime = (symbol) => Boolean(MAP[symbol]);

export async function history(symbol, tf) {
  const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${MAP[symbol]}&interval=${TF[tf]}&limit=500`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error("Binance " + res.status);
  const rows = await res.json();
  return rows.map((r) => ({ time: Math.floor(r[0] / 1000), open: +r[1], high: +r[2], low: +r[3], close: +r[4], volume: +r[5] }));
}

// Ouvre un flux et le rouvre automatiquement en cas de coupure. Renvoie une fonction pour l'arrêter.
function stream(url, onMsg, onState) {
  let ws, stopped = false, retry = 1000, timer;
  const open = () => {
    try { ws = new WebSocket(url); } catch { onState?.(false); return; }
    ws.onopen = () => { retry = 1000; onState?.(true); };
    ws.onmessage = (e) => { try { onMsg(JSON.parse(e.data)); } catch {} };
    ws.onclose = () => { onState?.(false); if (!stopped) timer = setTimeout(open, (retry = Math.min(retry * 2, 30000))); };
    ws.onerror = () => ws.close();
  };
  open();
  return () => { stopped = true; clearTimeout(timer); ws?.close(); };
}

// Bougie en cours, mise à jour plusieurs fois par seconde.
export function subscribeCandles(symbol, tf, onBar, onState) {
  return stream(`wss://stream.binance.com:9443/ws/${MAP[symbol].toLowerCase()}@kline_${TF[tf]}`, (m) => {
    const k = m.k; if (!k) return;
    onBar({ time: Math.floor(k.t / 1000), open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v });
  }, onState);
}

// Cours de plusieurs cryptos (cartes de la page Marchés).
export function subscribeTickers(symbols, onQuote) {
  const list = symbols.filter((s) => MAP[s]);
  if (!list.length) return () => {};
  const back = Object.fromEntries(list.map((s) => [MAP[s], s]));
  return stream(`wss://stream.binance.com:9443/stream?streams=${list.map((s) => MAP[s].toLowerCase() + "@miniTicker").join("/")}`, (m) => {
    const d = m.data; if (!d || !back[d.s]) return;
    onQuote({ symbol: back[d.s], price: +d.c, open24h: +d.o });
  });
}
