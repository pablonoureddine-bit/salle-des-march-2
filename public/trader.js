// Onglet "Trader" : acheter ou vendre en quelques clics avec le compte démo.
// Graphique en direct, prix qui défile, stop loss / take profit avec le gain ou la perte en euros affichés à l'avance.
import { $, el, api, fmt, pct, dir, store, tween } from "./util.js";
import { KNOWN, assetClass } from "./universe.js";
import { assetVisual } from "./visuals.js";
import * as RT from "./realtime.js";
import * as Demo from "./demo.js";

const POPULAR = [["^FCHI", "CAC 40"], ["^GSPC", "S&P 500"], ["^IXIC", "Nasdaq"], ["^N225", "Nikkei 225"], ["BTC-USD", "Bitcoin"], ["ETH-USD", "Ethereum"], ["GC=F", "Or"], ["EURUSD=X", "EUR/USD"], ["AAPL", "Apple"], ["NVDA", "Nvidia"], ["MC.PA", "LVMH"], ["TTE.PA", "TotalEnergies"]];
const TFS = [["1m", "Direct"], ["15m", "15 min"], ["1h", "1 h"], ["1d", "1 jour"]];

let ctx, S = { symbol: store.get("sdm.trade.symbol", "^FCHI"), name: "", tf: store.get("sdm.trade.tf", "1m"), side: "achat", meta: {}, bars: [] };
let chart, candles, lines = [], stopRT = null, pollTimer = null, seq = 0, mock = false;
const tok = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

export function init(c) {
  ctx = c; mock = !!ctx.config().mock;
  $("tr-popular").replaceChildren(...POPULAR.map(([s, n]) => el("button", { class: "tr-chip", "data-s": s, onclick: () => select(s, n) }, assetVisual(s, n, 22), n)));
  $("tr-tf").replaceChildren(...TFS.map(([k, l]) => el("button", { "data-tf": k, onclick: () => { S.tf = k; store.set("sdm.trade.tf", k); load(); } }, l)));
  $("tr-side").addEventListener("click", (e) => { const b = e.target.closest("button[data-side]"); if (!b) return; S.side = b.dataset.side; renderTicket(); drawLines(); });
  for (const id of ["tr-amount", "tr-sl", "tr-tp"]) $(id).addEventListener("input", () => { if (id === "tr-amount") $("tr-amount").dataset.touched = "1"; renderTicket(); drawLines(); });
  $("tr-quick").addEventListener("click", (e) => { const v = e.target.closest("button")?.dataset.v; if (!v) return; $("tr-amount").value = v === "max" ? Math.floor(Demo.cash() * 100) / 100 : Math.min(+v, Math.floor(Demo.cash())); renderTicket(); });
  $("tr-sl-quick").addEventListener("click", (e) => { const v = e.target.closest("button")?.dataset.v; if (v != null) setLevel("tr-sl", v === "" ? null : -v); });
  $("tr-tp-quick").addEventListener("click", (e) => { const v = e.target.closest("button")?.dataset.v; if (v != null) setLevel("tr-tp", v === "" ? null : +v); });
  $("tr-go").addEventListener("click", submit);
  let t;
  $("tr-search").addEventListener("input", (e) => {
    clearTimeout(t); const q = e.target.value.trim();
    if (q.length < 2) { $("tr-res").hidden = true; return; }
    t = setTimeout(async () => {
      try {
        const res = await api("/api/search?q=" + encodeURIComponent(q));
        $("tr-res").replaceChildren(...(res.length ? res.map((r) => el("button", { onclick: () => { e.target.value = ""; $("tr-res").hidden = true; select(r.symbol, r.name); } }, el("span", null, r.name), el("span", { class: "mono" }, r.symbol), el("small", null, [r.type, r.exchange].filter(Boolean).join(" · ")))) : [el("p", { class: "muted" }, "Aucun résultat")]));
        $("tr-res").hidden = false;
      } catch { $("tr-res").hidden = true; }
    }, 300);
  });
  Demo.onChange(() => { if (!$("view-trader").hidden) { renderPositions(); renderTicket(); drawLines(); } });
}

export function show(symbol, name) {
  if (symbol) { S.symbol = symbol; S.name = name || KNOWN.get(symbol) || symbol; }
  load();
}
export function hide() { stopRT?.(); stopRT = null; clearInterval(pollTimer); }

function select(symbol, name) { S.symbol = symbol; S.name = name || KNOWN.get(symbol) || symbol; $("tr-sl").value = ""; $("tr-tp").value = ""; load(); }

// Niveau en % du cours ; le sens (au-dessus / en dessous) dépend d'achat ou vente.
function setLevel(id, p) {
  const price = S.price; if (!price) return;
  if (p == null) { $(id).value = ""; renderTicket(); drawLines(); return; }
  const sign = S.side === "achat" ? 1 : -1;
  const v = price * (1 + (sign * p) / 100);
  $(id).value = +v.toPrecision(6);
  renderTicket(); drawLines();
}

async function load() {
  hide();
  const my = ++seq;
  store.set("sdm.trade.symbol", S.symbol);
  S.name ||= KNOWN.get(S.symbol) || S.symbol;
  $("tr-popular").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.s === S.symbol));
  $("tr-tf").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.tf === S.tf));
  $("tr-visual").replaceChildren(assetVisual(S.symbol, S.name, 44));
  $("tr-name").textContent = S.name; $("tr-sym").textContent = S.symbol;
  $("tr-err").hidden = true;
  let data = null;
  const useRT = RT.hasRealtime(S.symbol) && !mock;
  try {
    if (useRT) { try { data = { meta: { currency: "USD", isOpen: true, session: "24h/24 · temps réel" }, bars: await RT.history(S.symbol, S.tf) }; } catch { data = null; } }
    data ||= await api(`/api/chart?symbol=${encodeURIComponent(S.symbol)}&tf=${S.tf}`);
  } catch (e) {
    if (my !== seq) return;
    $("tr-err").hidden = false; $("tr-err").textContent = "Impossible de charger le graphique : " + e.message; return;
  }
  if (my !== seq) return;
  S.meta = data.meta || {}; S.bars = data.bars;
  if (!S.meta.previousClose && S.bars.length > 1) S.meta.previousClose = S.bars.at(-2).close;
  build();
  candles.setData(S.bars.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
  chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, S.bars.length - 120), to: S.bars.length + 4 });
  S.price = null; $("tr-price").dataset.v = ""; tick(S.bars.at(-1).close);
  renderMarket(); renderPositions(); drawLines();
  if (!$("tr-amount").dataset.touched) $("tr-amount").value = Math.min(1000, Math.floor(Demo.cash()));
  renderTicket();
  if (useRT && S.meta.session.includes("temps réel")) {
    stopRT = RT.subscribeCandles(S.symbol, S.tf, (bar) => { if (my === seq) apply([bar]); }, (on) => $("tr-live").classList.toggle("on", on));
  } else {
    // Actions, indices, devises : nouvelle donnée toutes les 3 secondes.
    pollTimer = setInterval(async () => {
      if (document.hidden || $("view-trader").hidden) return;
      try { const l = await api(`/api/live?symbol=${encodeURIComponent(S.symbol)}&tf=${S.tf}`); if (my === seq) { if (l.meta) Object.assign(S.meta, { isOpen: l.meta.isOpen, session: l.meta.session }); apply(l.bars); renderMarket(); } } catch {}
    }, 3000);
  }
}

function apply(newBars) {
  for (const nb of newBars) {
    const last = S.bars.at(-1);
    if (nb.time === last.time) S.bars[S.bars.length - 1] = nb;
    else if (nb.time > last.time) S.bars.push(nb);
    else continue;
    candles.update({ time: nb.time, open: nb.open, high: nb.high, low: nb.low, close: nb.close });
  }
  tick(S.bars.at(-1).close);
}

// Nouveau prix : chiffres qui défilent, compte démo à jour, stop/objectif vérifiés.
function tick(price) {
  S.price = price;
  Demo.setPrice(S.symbol, price, S.meta.currency || "EUR", true);
  Demo.checkTriggers();
  tween($("tr-price"), price, fmt);
  const ref = S.meta.previousClose;
  const ch = ref ? price / ref - 1 : null;
  $("tr-chg").className = "chip big " + dir(ch);
  $("tr-chg").textContent = ch != null ? `${pct(ch)}` : "";
  $("tr-time").textContent = "mis à jour à " + new Date().toLocaleTimeString("fr-FR");
  renderTicket(); renderPositions();
}

function renderMarket() {
  const o = S.meta.isOpen;
  $("tr-market").className = "mkt " + (o === false ? "closed" : "open");
  $("tr-market").replaceChildren(el("i"), o === false ? "Marché fermé" : "Marché ouvert");
  $("tr-session").textContent = S.meta.session ? `(${S.meta.session})` : "";
  $("tr-closed").hidden = o !== false;
}

function build() {
  if (chart) chart.remove();
  const LW = window.LightweightCharts, up = tok("--up"), down = tok("--down");
  chart = LW.createChart($("tr-chart"), {
    autoSize: true, height: $("tr-chart").clientHeight,
    layout: { background: { type: "solid", color: "transparent" }, textColor: tok("--muted"), fontFamily: "JetBrains Mono, monospace", fontSize: 11 },
    grid: { vertLines: { color: tok("--soft") }, horzLines: { color: tok("--soft") } },
    rightPriceScale: { borderColor: tok("--line") }, timeScale: { borderColor: tok("--line"), timeVisible: S.tf !== "1d", secondsVisible: false, rightOffset: 4 },
    localization: { locale: "fr-FR", priceFormatter: fmt }, crosshair: { mode: 0 },
  });
  candles = chart.addCandlestickSeries({ upColor: up, downColor: down, borderUpColor: up, borderDownColor: down, wickUpColor: up, wickDownColor: down, priceLineColor: tok("--accent"), priceLineWidth: 2 });
  lines = [];
}

// Lignes sur le graphique : entrées des positions, stop loss et take profit (ceux du ticket en pointillés).
function drawLines() {
  if (!candles) return;
  lines.forEach((l) => candles.removePriceLine(l)); lines = [];
  const add = (price, color, title, style = 0) => price && lines.push(candles.createPriceLine({ price, color, lineWidth: 1, lineStyle: style, axisLabelVisible: true, title }));
  for (const p of Demo.positions(S.symbol)) {
    add(p.entry, tok("--accent"), p.side === "achat" ? "Achat" : "Vente");
    add(p.sl, tok("--down"), "Stop"); add(p.tp, tok("--up"), "Objectif");
  }
  add(parseFloat($("tr-sl").value), tok("--down"), "Stop prévu", 2);
  add(parseFloat($("tr-tp").value), tok("--up"), "Objectif prévu", 2);
}

function renderTicket() {
  const price = S.price, buy = S.side === "achat";
  $("tr-side").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.side === S.side));
  $("tr-side-help").textContent = buy ? "Acheter : tu gagnes si le prix MONTE." : "Vendre : tu gagnes si le prix BAISSE.";
  $("tr-sl-quick").replaceChildren(...[["", "Aucun"], ["1", "−1 %"], ["2", "−2 %"], ["5", "−5 %"]].map(([v, l]) => el("button", { type: "button", "data-v": v }, l)));
  $("tr-tp-quick").replaceChildren(...[["", "Aucun"], ["2", "+2 %"], ["5", "+5 %"], ["10", "+10 %"]].map(([v, l]) => el("button", { type: "button", "data-v": v }, l)));
  $("tr-cash").textContent = `Disponible : ${Demo.eur(Demo.cash())}`;
  const amount = parseFloat($("tr-amount").value) || 0;
  const cur = S.meta.currency || "EUR";
  const unit = price ? Demo.toEur(price, cur) : 0;
  const qty = unit ? amount / unit : 0;
  $("tr-volume").textContent = qty ? `Volume : ${qty.toLocaleString("fr-FR", { maximumFractionDigits: 6 })} unité${qty >= 2 ? "s" : ""} à ${fmt(price)} ${cur}` : "";
  const sl = parseFloat($("tr-sl").value) || null, tp = parseFloat($("tr-tp").value) || null;
  const draft = { side: S.side, qty, entry: price, currency: cur };
  const loss = Demo.outcomeAt(draft, sl), gain = Demo.outcomeAt(draft, tp);
  const rows = [];
  if (sl) rows.push(el("div", { class: "tr-sum-row" }, el("span", null, "Si le stop est touché"), el("b", { class: "down mono" }, loss != null ? Demo.eur(loss) : "—")));
  else rows.push(el("div", { class: "tr-sum-row muted" }, el("span", null, "Sans stop loss, ta perte n'est pas limitée.")));
  if (tp) rows.push(el("div", { class: "tr-sum-row" }, el("span", null, "Si l'objectif est atteint"), el("b", { class: "up mono" }, gain != null ? "+" + Demo.eur(gain) : "—")));
  if (sl && tp && loss) rows.push(el("div", { class: "tr-sum-row" }, el("span", null, "Rapport gain / risque"), el("b", { class: "mono" }, (Math.abs(gain / loss)).toFixed(2).replace(".", ","))));
  $("tr-summary").replaceChildren(...rows);
  const btn = $("tr-go");
  btn.textContent = `${buy ? "Acheter" : "Vendre"} ${S.name || ""} pour ${Demo.eur(amount)}`;
  btn.className = "tr-go " + (buy ? "buy" : "sell");
  btn.disabled = !price || !(amount > 0);
}

function submit() {
  const amount = parseFloat($("tr-amount").value);
  const sl = parseFloat($("tr-sl").value) || null, tp = parseFloat($("tr-tp").value) || null;
  try {
    Demo.open({ symbol: S.symbol, name: S.name, side: S.side, amount, price: S.price, currency: S.meta.currency || "EUR", sl, tp });
    $("tr-msg").textContent = ""; $("tr-sl").value = ""; $("tr-tp").value = "";
    renderTicket(); drawLines();
  } catch (e) { $("tr-msg").textContent = e.message; }
}

function renderPositions() {
  const list = Demo.positions(S.symbol);
  $("tr-positions").replaceChildren(...(list.length ? list.map(Demo.positionRow) : [el("p", { class: "muted small", style: "margin:0" }, `Aucune position ouverte sur ${S.name}.`)]));
  const t = Demo.totals();
  $("tr-account").replaceChildren(el("span", null, "Compte démo ", el("b", { class: "mono" }, Demo.eur(t.total))), el("span", { class: "mono " + (t.gain >= 0 ? "up" : "down") }, `${t.gain >= 0 ? "+" : ""}${Demo.eur(t.gain)}`));
}
