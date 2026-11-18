// Graphique en plein écran (pensé d'abord pour le téléphone) : prix en direct, unités de temps,
// positions du compte démo sur le graphique, et boutons Acheter / Vendre en bas.
import { el, api, fmt, pct, dir, store, tween } from "./util.js";
import { KNOWN } from "./universe.js";
import { assetVisual } from "./visuals.js";
import * as RT from "./realtime.js";
import * as Demo from "./demo.js";

const TFS = [["1m", "Direct"], ["15m", "15 min"], ["1h", "1 h"], ["1d", "1 jour"], ["1wk", "1 sem."]];
let ctx, cur = null, afterBack = null;
const tok = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

export function init(c) {
  ctx = c;
  // Le bouton « retour » du téléphone ferme le plein écran.
  addEventListener("popstate", () => {
    if (cur) close(false);
    if (afterBack) { const f = afterBack; afterBack = null; f(); }
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && cur) close(); });
}

export function open(symbol, name) {
  if (cur) close(false);
  name ||= KNOWN.get(symbol) || symbol;
  const tf = store.get("sdm.fc.tf", "1m");
  const chartBox = el("div", { class: "fcv-chart" });
  const price = el("span", { class: "fcv-price mono" }), chg = el("span", { class: "chip" }), mkt = el("span", { class: "mkt" });
  const tfs = el("div", { class: "seg fcv-tf" });
  const box = el("div", { class: "fcv", role: "dialog", "aria-modal": "true", "aria-label": `Graphique de ${name}` },
    el("header", { class: "fcv-head" },
      el("button", { class: "fcv-back", "aria-label": "Fermer le plein écran", onclick: () => close() }, "←"),
      assetVisual(symbol, name, 34),
      el("div", { class: "fcv-id" }, el("b", null, name), el("div", { class: "fcv-sub" }, price, chg)),
      el("button", { class: "fcv-max", title: "Plein écran total", "aria-label": "Plein écran total", onclick: maximize }, "⤢")),
    el("div", { class: "fcv-bar" }, mkt, tfs),
    chartBox,
    el("footer", { class: "fcv-foot" },
      el("button", { class: "fcv-sell", onclick: () => close(true, () => ctx.trade(symbol, name, "vente")) }, "Vendre"),
      el("button", { class: "fcv-more", onclick: () => close(true, () => ctx.open(symbol, name)) }, "Analyse"),
      el("button", { class: "fcv-buy", onclick: () => close(true, () => ctx.trade(symbol, name, "achat")) }, "Acheter")));
  document.body.append(box);
  document.body.classList.add("fcv-open");
  history.pushState({ fcv: 1 }, "");
  cur = { box, symbol, name, tf, chartBox, price, chg, mkt, tfs, chart: null, series: null, stop: null, timer: null, seq: 0, prev: null };
  tfs.replaceChildren(...TFS.map(([k, l]) => el("button", { "data-tf": k, onclick: () => { cur.tf = k; store.set("sdm.fc.tf", k); load(); } }, l)));
  load();
}

function maximize() {
  const b = cur?.box; if (!b) return;
  (b.requestFullscreen?.() || Promise.reject()).then(() => screen.orientation?.lock?.("landscape").catch(() => {})).catch(() => {});
}

// "after" : action à lancer une fois le plein écran refermé (et l'historique revenu en place).
export function close(back = true, after = null) {
  if (!cur) return;
  cur.stop?.(); clearInterval(cur.timer); cur.chart?.remove(); cur.box.remove();
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  document.body.classList.remove("fcv-open");
  cur = null;
  if (back && history.state?.fcv) { afterBack = after; history.back(); }
  else after?.();
}

async function load() {
  const c = cur, my = ++c.seq;
  c.stop?.(); clearInterval(c.timer);
  c.tfs.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.tf === c.tf));
  const useRT = RT.hasRealtime(c.symbol) && !ctx.config().mock;
  let data = null;
  try {
    if (useRT) { try { data = { meta: { currency: "USD", isOpen: true, session: "24h/24" }, bars: await RT.history(c.symbol, c.tf) }; } catch {} }
    data ||= await api(`/api/chart?symbol=${encodeURIComponent(c.symbol)}&tf=${c.tf}`);
  } catch (e) { c.chartBox.replaceChildren(el("p", { class: "status err" }, "Graphique indisponible : " + e.message)); return; }
  if (my !== c.seq || cur !== c) return;
  c.meta = data.meta || {}; c.bars = data.bars;
  c.prev = c.meta.previousClose || (c.bars.length > 1 ? c.bars.at(-2).close : null);
  c.chart?.remove();
  c.chartBox.replaceChildren();
  const up = tok("--up"), down = tok("--down");
  c.chart = window.LightweightCharts.createChart(c.chartBox, {
    autoSize: true,
    layout: { background: { type: "solid", color: "transparent" }, textColor: tok("--muted"), fontFamily: "JetBrains Mono, monospace", fontSize: 11 },
    grid: { vertLines: { visible: false }, horzLines: { color: tok("--soft") } },
    rightPriceScale: { borderVisible: false }, timeScale: { borderVisible: false, timeVisible: c.tf !== "1d" && c.tf !== "1wk", rightOffset: 3 },
    localization: { locale: "fr-FR", priceFormatter: fmt }, crosshair: { mode: 0 },
    handleScroll: true, handleScale: true,
  });
  c.series = c.chart.addCandlestickSeries({ upColor: up, downColor: down, borderUpColor: up, borderDownColor: down, wickUpColor: up, wickDownColor: down, priceLineColor: tok("--accent"), priceLineWidth: 2 });
  c.series.setData(c.bars.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
  c.chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, c.bars.length - 90), to: c.bars.length + 3 });
  for (const p of Demo.positions(c.symbol)) {
    c.series.createPriceLine({ price: p.entry, color: tok("--accent"), lineWidth: 1, title: p.side === "achat" ? "Achat" : "Vente" });
    if (p.sl) c.series.createPriceLine({ price: p.sl, color: down, lineWidth: 1, lineStyle: 2, title: "Stop" });
    if (p.tp) c.series.createPriceLine({ price: p.tp, color: up, lineWidth: 1, lineStyle: 2, title: "Objectif" });
  }
  c.price.dataset.v = "";
  header();
  const apply = (bars) => {
    for (const nb of bars) {
      const last = c.bars.at(-1);
      if (nb.time === last.time) c.bars[c.bars.length - 1] = nb; else if (nb.time > last.time) c.bars.push(nb); else continue;
      c.series.update({ time: nb.time, open: nb.open, high: nb.high, low: nb.low, close: nb.close });
    }
    header();
  };
  if (useRT && c.meta.session === "24h/24") c.stop = RT.subscribeCandles(c.symbol, c.tf, (b) => cur === c && apply([b]));
  else c.timer = setInterval(async () => {
    if (document.hidden || cur !== c) return;
    try { const l = await api(`/api/live?symbol=${encodeURIComponent(c.symbol)}&tf=${c.tf}`); if (cur === c && my === c.seq) { Object.assign(c.meta, { isOpen: l.meta?.isOpen, session: l.meta?.session }); apply(l.bars); } } catch {}
  }, 3000);
}

function header() {
  const c = cur, p = c.bars.at(-1).close;
  tween(c.price, p, fmt);
  Demo.setPrice(c.symbol, p, c.meta.currency || "EUR", true);
  const ch = c.prev ? p / c.prev - 1 : null;
  c.chg.className = "chip " + dir(ch); c.chg.textContent = ch != null ? pct(ch) : "";
  const o = c.meta.isOpen;
  c.mkt.hidden = o == null; c.mkt.className = "mkt " + (o ? "open" : "closed");
  c.mkt.replaceChildren(el("i"), o ? "Ouvert" : "Fermé");
  c.mkt.title = c.meta.session || "";
}
