import * as TA from "./indicators.js";
import { MODULES, LESSONS } from "./academy.js";

const $ = (id) => document.getElementById(id);
const LW = window.LightweightCharts;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

/* ───────── Actifs suivis ───────── */
const WATCH = [
  { group: "Indices", items: [
    ["^FCHI", "CAC 40"], ["^STOXX50E", "Euro Stoxx 50"], ["^GDAXI", "DAX"], ["^FTSE", "FTSE 100"],
    ["^GSPC", "S&P 500"], ["^IXIC", "Nasdaq Composite"], ["^NDX", "Nasdaq 100"], ["^DJI", "Dow Jones"], ["^N225", "Nikkei 225"]] },
  { group: "Actions Paris", items: [["MC.PA", "LVMH"], ["TTE.PA", "TotalEnergies"], ["AIR.PA", "Airbus"], ["BNP.PA", "BNP Paribas"], ["OR.PA", "L'Oréal"]] },
  { group: "Actions US", items: [["AAPL", "Apple"], ["NVDA", "Nvidia"], ["MSFT", "Microsoft"], ["TSLA", "Tesla"], ["AMZN", "Amazon"]] },
  { group: "Crypto", items: [["BTC-USD", "Bitcoin"], ["ETH-USD", "Ethereum"], ["SOL-USD", "Solana"]] },
  { group: "Forex", items: [["EURUSD=X", "EUR/USD"], ["GBPUSD=X", "GBP/USD"], ["USDJPY=X", "USD/JPY"]] },
  { group: "Matières premières", items: [["GC=F", "Or"], ["SI=F", "Argent"], ["BZ=F", "Pétrole Brent"], ["CL=F", "Pétrole WTI"]] },
];
const KNOWN = new Map(WATCH.flatMap((g) => g.items));
const TICKER = ["^FCHI", "^GDAXI", "^STOXX50E", "^GSPC", "^IXIC", "^DJI", "BTC-USD", "EURUSD=X", "GC=F", "BZ=F"];
const TF_LABEL = { "15m": "15 minutes", "1h": "1 heure", "1d": "1 jour", "1wk": "1 semaine" };
const LIVE_MS = 10000;

const state = {
  symbol: store.get("sdm.symbol", "^FCHI"),
  name: "",
  tf: store.get("sdm.tf", "1d"),
  overlays: new Set(store.get("sdm.overlays", ["mm", "levels"])),
  data: null, A: null, quotes: new Map(), assetNews: [], allNews: null, config: {},
};

/* ───────── Formats ───────── */
const dec = (v) => { const a = Math.abs(v); return a >= 1000 ? 2 : a >= 10 ? 2 : a >= 1 ? 4 : 6; };
const fmt = (v) => v == null || !isFinite(v) ? "—" : v.toLocaleString("fr-FR", { minimumFractionDigits: dec(v), maximumFractionDigits: dec(v) });
const pct = (v) => v == null || !isFinite(v) ? "—" : (v > 0 ? "+" : "") + (v * 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " %";
const pctAbs = (v) => (v * 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " %";
const dir = (v) => v > 0 ? "up" : v < 0 ? "down" : "flat";
const ago = (iso) => {
  if (!iso) return "";
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return "à l'instant"; if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `il y a ${h} h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};
function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v; else if (k === "style") e.style.cssText = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k instanceof Node ? k : String(k));
  return e;
}
async function api(path, opts) {
  const res = await fetch(path, opts);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`);
  return body;
}
const displayName = () => KNOWN.get(state.symbol) || state.name || state.symbol;

/* ───────── Navigation ───────── */
function route() {
  const [view, sub] = location.hash.replace("#", "").split("/");
  const v = ["marches", "actus", "academie"].includes(view) ? view : "marches";
  for (const id of ["marches", "actus", "academie"]) $("view-" + id).hidden = id !== v;
  document.querySelectorAll(".tabs a").forEach((a) => a.classList.toggle("on", a.dataset.view === v));
  if (v === "marches") requestAnimationFrame(() => charts.forEach((c) => c.timeScale().applyOptions({})));
  if (v === "actus") renderNews();
  if (v === "academie") renderAcademy(sub);
  window.scrollTo({ top: 0 });
}
window.addEventListener("hashchange", route);

/* ───────── Bandeau et liste ───────── */
function renderWatch() {
  $("watchlist").replaceChildren(...WATCH.map((g) => el("div", { class: "wl-group" },
    el("h3", null, g.group),
    g.items.map(([s, n]) => {
      const q = state.quotes.get(s);
      const ch = q?.price != null && q?.previousClose ? q.price / q.previousClose - 1 : null;
      return el("button", { class: "wl-item" + (s === state.symbol ? " on" : ""), onclick: () => loadSymbol(s) },
        el("span", { class: "nm" }, n), el("span", { class: "v" }, q?.price != null ? fmt(q.price) : ""),
        el("span", { class: "s" }, s), el("span", { class: "c " + dir(ch) }, ch != null ? pct(ch) : ""));
    }))));
}
function renderTicker() {
  $("ticker").replaceChildren(...TICKER.map((s) => {
    const q = state.quotes.get(s);
    const ch = q?.price != null && q?.previousClose ? q.price / q.previousClose - 1 : null;
    return el("button", { class: "tk", onclick: () => { loadSymbol(s); location.hash = "marches"; } },
      el("b", null, KNOWN.get(s) || s), el("span", { class: "mono" }, q?.price != null ? fmt(q.price) : "…"),
      el("span", { class: "mono " + dir(ch) }, ch != null ? pct(ch) : ""));
  }));
}
async function refreshQuotes() {
  const all = [...new Set([...TICKER, ...WATCH.flatMap((g) => g.items.map((x) => x[0]))])];
  const chunks = [all.slice(0, 20), all.slice(20)].filter((c) => c.length);
  try {
    const res = (await Promise.all(chunks.map((c) => api("/api/quotes?symbols=" + encodeURIComponent(c.join(",")))))).flat();
    res.forEach((q) => q.price != null && state.quotes.set(q.symbol, q));
  } catch {}
  renderTicker(); renderWatch();
}

/* ───────── Recherche ───────── */
let searchTimer;
$("search").addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  const q = e.target.value.trim();
  if (q.length < 2) { $("search-res").hidden = true; return; }
  searchTimer = setTimeout(async () => {
    try {
      const res = await api("/api/search?q=" + encodeURIComponent(q));
      $("search-res").replaceChildren(...(res.length ? res.map((r) => el("button", { onclick: () => { $("search").value = ""; $("search-res").hidden = true; loadSymbol(r.symbol, r.name); location.hash = "marches"; } },
        el("span", null, r.name), el("span", { class: "mono" }, r.symbol), el("small", null, [r.type, r.exchange].filter(Boolean).join(" · ")))) : [el("p", { class: "muted", style: "padding:8px 12px;margin:0" }, "Aucun résultat")]));
      $("search-res").hidden = false;
    } catch { $("search-res").hidden = true; }
  }, 300);
});
document.addEventListener("click", (e) => { if (!e.target.closest(".search")) $("search-res").hidden = true; });

/* ───────── Graphiques ───────── */
let charts = [], S = {}, priceLines = [];
const tok = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function chartOpts(el, priceFmt) {
  return {
    autoSize: true, height: el.clientHeight,
    layout: { background: { type: "solid", color: "transparent" }, textColor: tok("--muted"), fontFamily: "IBM Plex Mono, monospace", fontSize: 11 },
    grid: { vertLines: { color: tok("--soft") }, horzLines: { color: tok("--soft") } },
    rightPriceScale: { borderColor: tok("--line"), minimumWidth: 78 },
    timeScale: { borderColor: tok("--line"), timeVisible: state.tf === "15m" || state.tf === "1h", rightOffset: 4 },
    crosshair: { mode: 0 },
    localization: { locale: "fr-FR", priceFormatter: priceFmt || fmt },
  };
}
const line = (arr, b) => { const o = []; arr.forEach((v, i) => v != null && o.push({ time: b[i].time, value: v })); return o; };

function buildCharts() {
  charts.forEach((c) => c.remove()); charts = []; S = {}; priceLines = [];
  if (!LW) { $("chart-err").hidden = false; $("chart-err").textContent = "La bibliothèque de graphiques n'a pas pu se charger."; return; }
  const up = tok("--up"), down = tok("--down");
  const cp = LW.createChart($("c-price"), chartOpts($("c-price")));
  const thin = { lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false };
  S.bbU = cp.addLineSeries({ ...thin, color: tok("--muted"), lineStyle: 2 });
  S.bbL = cp.addLineSeries({ ...thin, color: tok("--muted"), lineStyle: 2 });
  S.ssa = cp.addLineSeries({ ...thin, color: up });
  S.ssb = cp.addLineSeries({ ...thin, color: down });
  S.tenkan = cp.addLineSeries({ ...thin, color: tok("--tenkan"), lineWidth: 2 });
  S.kijun = cp.addLineSeries({ ...thin, color: tok("--kijun"), lineWidth: 2 });
  S.chikou = cp.addLineSeries({ ...thin, color: tok("--muted"), lineStyle: 1 });
  S.m20 = cp.addLineSeries({ ...thin, color: tok("--ma20"), lineWidth: 2 });
  S.m50 = cp.addLineSeries({ ...thin, color: tok("--ma50"), lineWidth: 2 });
  S.m200 = cp.addLineSeries({ ...thin, color: tok("--ma200"), lineWidth: 2 });
  S.candles = cp.addCandlestickSeries({ upColor: up, downColor: down, borderUpColor: up, borderDownColor: down, wickUpColor: up, wickDownColor: down });

  const cr = LW.createChart($("c-rsi"), chartOpts($("c-rsi"), (p) => p.toFixed(0)));
  S.rsi = cr.addLineSeries({ color: tok("--accent"), lineWidth: 2, priceLineVisible: false });
  S.rsi.createPriceLine({ price: 70, color: down, lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
  S.rsi.createPriceLine({ price: 30, color: up, lineWidth: 1, lineStyle: 2, axisLabelVisible: false });

  const cm = LW.createChart($("c-macd"), chartOpts($("c-macd"), (p) => p.toFixed(Math.abs(p) < 1 ? 4 : 2)));
  S.hist = cm.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false });
  S.macd = cm.addLineSeries({ color: tok("--accent"), lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
  S.sig = cm.addLineSeries({ color: tok("--ma20"), lineWidth: 1, priceLineVisible: false, lastValueVisible: false });

  charts = [cp, cr, cm];
  let sync = false;
  charts.forEach((c) => c.timeScale().subscribeVisibleLogicalRangeChange((r) => {
    if (sync || !r) return; sync = true; charts.forEach((o) => o !== c && o.timeScale().setVisibleLogicalRange(r)); sync = false;
  }));
}

function paintSeries(first) {
  const A = state.A, b = A.b, on = state.overlays, up = tok("--up"), down = tok("--down");
  if (first) S.candles.setData(b.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
  else S.candles.update((({ time, open, high, low, close }) => ({ time, open, high, low, close }))(b.at(-1)));
  const set = (s, data, show) => s.setData(show ? data : []);
  set(S.m20, line(A.m20, b), on.has("mm")); set(S.m50, line(A.m50, b), on.has("mm")); set(S.m200, line(A.m200, b), on.has("mm"));
  set(S.bbU, line(A.bb.up, b), on.has("bollinger")); set(S.bbL, line(A.bb.lo, b), on.has("bollinger"));
  set(S.tenkan, line(A.ich.tenkan, b), on.has("ichimoku")); set(S.kijun, line(A.ich.kijun, b), on.has("ichimoku"));
  set(S.ssa, A.ich.ssa, on.has("ichimoku")); set(S.ssb, A.ich.ssb, on.has("ichimoku")); set(S.chikou, A.ich.chikou, on.has("ichimoku"));
  S.rsi.setData(line(A.r, b));
  S.hist.setData(A.md.hist.map((v, i) => v == null ? null : { time: b[i].time, value: v, color: v >= 0 ? up : down }).filter(Boolean));
  S.macd.setData(line(A.md.m, b)); S.sig.setData(line(A.md.sig, b));

  priceLines.forEach((p) => S.candles.removePriceLine(p)); priceLines = [];
  if (on.has("levels")) {
    A.res.forEach((x) => priceLines.push(S.candles.createPriceLine({ price: x.level, color: down, lineWidth: 1, lineStyle: 1, title: "R" })));
    A.sup.forEach((x) => priceLines.push(S.candles.createPriceLine({ price: x.level, color: up, lineWidth: 1, lineStyle: 1, title: "S" })));
  }
  if (on.has("fibonacci")) {
    A.fib.levels.forEach((l) => priceLines.push(S.candles.createPriceLine({ price: l.price, color: tok("--fib"), lineWidth: 1, lineStyle: l.ratio === 0 || l.ratio === 1 ? 0 : 2, title: "Fib " + (l.ratio * 100).toFixed(1).replace(".0", "") + "%" })));
  }
  S.lastTime = b.at(-1).time;
  if (first) charts[0].timeScale().setVisibleLogicalRange({ from: Math.max(0, b.length - 160), to: b.length + 6 });

  const leg = [];
  if (on.has("mm")) leg.push(["--ma20", "MM20"], ["--ma50", "MM50"], ["--ma200", "MM200"]);
  if (on.has("bollinger")) leg.push(["--muted", "Bollinger 20, 2σ"]);
  if (on.has("ichimoku")) leg.push(["--tenkan", "Tenkan"], ["--kijun", "Kijun"], ["--up", "Span A"], ["--down", "Span B"], ["--muted", "Chikou"]);
  if (on.has("fibonacci")) leg.push(["--fib", `Fibonacci (${A.fib.upMove ? "repli de la hausse" : "rebond de la baisse"} sur 120 bougies)`]);
  $("legend").replaceChildren(...leg.map(([c, t]) => el("span", null, el("i", { style: `background:var(${c})` }), t)));
}

/* ───────── Panneaux d'analyse ───────── */
function renderQuote(prevPrice) {
  const m = state.data.meta, A = state.A;
  const price = A.last;
  const ref = m.previousClose && state.tf !== "1wk" ? m.previousClose : A.prev;
  $("q-name").textContent = displayName();
  $("q-sym").textContent = state.symbol;
  $("q-px").textContent = fmt(price);
  $("q-chg").textContent = `${pct(price / ref - 1)}  ${price - ref >= 0 ? "+" : ""}${fmt(price - ref)}`;
  $("q-chg").className = "chg mono " + dir(price - ref);
  const t = A.b.at(-1).time;
  $("q-meta").textContent = [m.exchange, m.currency, "bougies " + TF_LABEL[state.tf], "maj " + new Date().toLocaleTimeString("fr-FR"), "dernière bougie " + new Date(t * 1000).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: state.tf === "1d" || state.tf === "1wk" ? undefined : "short" })].filter(Boolean).join(" · ");
  if (prevPrice != null && prevPrice !== price) {
    const px = $("q-px"); px.classList.remove("flash-up", "flash-down"); void px.offsetWidth;
    px.classList.add(price > prevPrice ? "flash-up" : "flash-down");
    setTimeout(() => px.classList.remove("flash-up", "flash-down"), 50);
  }
  document.title = `${displayName()} ${fmt(price)} · Salle des marchés`;
}

function renderPanels() {
  const A = state.A;
  $("perf").replaceChildren(...A.perf.map((p) => el("div", null, el("b", { class: p.v == null ? "" : dir(p.v) }, p.v == null ? "—" : pct(p.v / 100)), el("span", null, p.lbl))));
  const [vt, vc] = TA.verdictOf(A.score);
  $("verdict").textContent = vt; $("verdict").className = "verdict " + vc;
  $("score-num").textContent = (A.score > 0 ? "+" : "") + A.score + " / 100";
  $("needle").style.left = 50 + A.score / 2 + "%";
  const sc = (s) => s > 0.2 ? "up" : s < -0.2 ? "down" : "flat";
  $("rows").replaceChildren(...A.sig.map((s) => el("div", { class: "row" },
    el("div", { class: "lbl" }, el("a", { href: "#academie/" + s.lesson, title: "Comprendre cet indicateur" }, s.label), el("small", null, s.detail)),
    el("span", { class: "val" }, s.value), el("span", { class: "pill " + sc(s.s) }, s.txt))));
  const lv = [];
  [...A.res].reverse().forEach((x) => lv.push(el("div", { class: "lvl res" }, el("span", null, "R ", el("small", null, `${x.touches} contact${x.touches > 1 ? "s" : ""}`)), el("span", null, fmt(x.level), el("small", null, " " + pct(x.level / A.last - 1))))));
  lv.push(el("div", { class: "lvl now" }, el("span", null, "Cours"), el("span", null, fmt(A.last))));
  A.sup.forEach((x) => lv.push(el("div", { class: "lvl sup" }, el("span", null, "S ", el("small", null, `${x.touches} contact${x.touches > 1 ? "s" : ""}`)), el("span", null, fmt(x.level), el("small", null, " " + pct(x.level / A.last - 1))))));
  lv.push(el("div", { class: "lvl" }, el("small", null, "ATR 14"), el("span", null, fmt(A.atrNow))));
  lv.push(el("div", { class: "lvl" }, el("small", null, "Plus haut / bas 1 an"), el("span", null, `${fmt(A.hi52)} / ${fmt(A.lo52)}`)));
  $("levels").replaceChildren(...lv);
}

/* ───────── Chargement et direct ───────── */
let liveTimer = null, loadSeq = 0;
async function loadSymbol(symbol, name) {
  state.symbol = symbol; state.name = name || KNOWN.get(symbol) || "";
  store.set("sdm.symbol", symbol);
  renderWatch();
  const seq = ++loadSeq;
  $("chart-err").hidden = true; $("live-dot").classList.remove("on");
  $("result").hidden = true; $("ai-status").textContent = "";
  try {
    const data = await api(`/api/chart?symbol=${encodeURIComponent(symbol)}&tf=${state.tf}`);
    if (seq !== loadSeq) return;
    if (data.bars.length < 30) throw new Error("Pas assez d'historique pour cet actif sur cette unité de temps.");
    state.data = data;
    if (!state.name) state.name = data.meta.name;
    state.A = TA.analyse(data.bars, state.tf);
    buildCharts(); paintSeries(true); renderQuote(); renderPanels();
    $("live-dot").classList.add("on");
    loadAssetNews();
    refreshLesson();
  } catch (e) {
    if (seq !== loadSeq) return;
    $("chart-err").hidden = false; $("chart-err").textContent = "Impossible de charger " + symbol + " : " + e.message;
  }
  clearInterval(liveTimer);
  liveTimer = setInterval(liveTick, LIVE_MS);
}

async function liveTick() {
  if (document.hidden || !state.data) return;
  const seq = loadSeq;
  try {
    const live = await api(`/api/live?symbol=${encodeURIComponent(state.symbol)}&tf=${state.tf}`);
    if (seq !== loadSeq || !live.bars.length) return;
    const bars = state.data.bars;
    const prevPrice = state.A.last;
    for (const nb of live.bars) {
      const last = bars.at(-1);
      if (nb.time === last.time) bars[bars.length - 1] = nb;
      else if (nb.time > last.time) bars.push(nb);
    }
    if (live.meta?.previousClose) state.data.meta.previousClose = live.meta.previousClose;
    state.A = TA.analyse(bars, state.tf);
    const appended = live.bars.filter((nb) => nb.time > S.lastTime).length > 1;
    if (appended) S.candles.setData(bars.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
    paintSeries(false);
    renderQuote(prevPrice); renderPanels(); refreshLesson(true);
    $("live-dot").classList.add("on");
  } catch {
    $("live-dot").classList.remove("on");
  }
}

$("tf").addEventListener("click", (e) => {
  const tf = e.target.closest("button")?.dataset.tf; if (!tf) return;
  state.tf = tf; store.set("sdm.tf", tf);
  $("tf").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.tf === tf));
  loadSymbol(state.symbol, state.name);
});
function setOverlay(ov, on) {
  on ? state.overlays.add(ov) : state.overlays.delete(ov);
  store.set("sdm.overlays", [...state.overlays]);
  $("overlays").querySelectorAll("button").forEach((b) => b.classList.toggle("on", state.overlays.has(b.dataset.ov)));
  if (state.A && S.candles) paintSeries(false);
}
$("overlays").addEventListener("click", (e) => {
  const ov = e.target.closest("button")?.dataset.ov; if (!ov) return;
  setOverlay(ov, !state.overlays.has(ov));
});

/* ───────── Actualités ───────── */
const newsItem = (n) => el("li", null,
  el("a", { href: n.link, target: "_blank", rel: "noopener noreferrer" }, n.title),
  el("span", { class: "meta" }, el("span", { class: "src" }, n.source), el("span", null, ago(n.date))));

async function loadAssetNews() {
  const name = displayName();
  $("asset-news").replaceChildren(el("li", { class: "muted" }, "Chargement…"));
  try {
    const r = await api("/api/news/asset?q=" + encodeURIComponent(name));
    state.assetNews = r.items || [];
  } catch { state.assetNews = []; }
  const list = state.assetNews.slice(0, 8);
  $("asset-news").replaceChildren(...(list.length ? list.map(newsItem) : [el("li", { class: "muted" }, "Aucune actu récente trouvée pour " + name + ".")]));
  $("news-asset-title").textContent = "Sur " + name;
  $("news-asset").replaceChildren(...(state.assetNews.length ? state.assetNews.slice(0, 20).map(newsItem) : [el("li", { class: "muted" }, "Aucune actu récente.")]));
}

let newsSource = "all";
async function loadNews() {
  try { state.allNews = await api("/api/news"); } catch (e) { state.allNews = { items: [], status: [], error: e.message }; }
  if (!$("view-actus").hidden) renderNews();
}
function renderNews() {
  const d = state.allNews;
  if (!d) { loadNews(); return; }
  $("news-sources").replaceChildren(
    el("button", { class: "chip" + (newsSource === "all" ? " on" : ""), onclick: () => { newsSource = "all"; renderNews(); } }, "Toutes les sources"),
    ...d.status.map((s) => el("button", { class: "chip" + (newsSource === s.id ? " on" : ""), title: s.ok ? `${s.count} titres` : "Source indisponible pour le moment", onclick: () => { newsSource = s.id; renderNews(); } },
      el("span", { class: "dot" + (s.ok ? "" : " ko") }), s.label)));
  const f = $("news-filter").value.trim().toLowerCase();
  const items = d.items.filter((n) => (newsSource === "all" || n.sourceId === newsSource) && (!f || n.title.toLowerCase().includes(f))).slice(0, 120);
  $("news-list").replaceChildren(...(items.length ? items.map(newsItem) : [el("li", { class: "muted" }, d.error ? "Actualités indisponibles : " + d.error : "Aucun titre ne correspond.")]));
}
$("news-filter").addEventListener("input", renderNews);

/* ───────── Analyse IA ───────── */
function technicalSummary() {
  const A = state.A, b = A.b, n = A.n;
  const recent = b.slice(-30).map((x) => `${new Date(x.time * 1000).toISOString().slice(0, state.tf === "1d" || state.tf === "1wk" ? 10 : 16)};${fmt(x.open)};${fmt(x.high)};${fmt(x.low)};${fmt(x.close)}`).join("\n");
  return `Dernier cours : ${fmt(A.last)} ${state.data.meta.currency || ""}
MM20 ${fmt(A.m20[n])} · MM50 ${fmt(A.m50[n])} · MM200 ${fmt(A.m200[n])}
RSI14 ${A.r[n]?.toFixed(1) ?? "—"} · Stochastique %K ${A.st.k[n]?.toFixed(0) ?? "—"} · ATR14 ${fmt(A.atrNow)}
Ichimoku : Tenkan ${fmt(A.ich.tenkan[n])}, Kijun ${fmt(A.ich.kijun[n])}, nuage actuel ${fmt(A.ich.cloudNow.a)} / ${fmt(A.ich.cloudNow.b)}, nuage projeté ${fmt(A.ich.cloudFuture.a)} / ${fmt(A.ich.cloudFuture.b)}
Fibonacci (${A.fib.upMove ? "repli de la hausse" : "rebond de la baisse"} ${fmt(A.fib.lo)} → ${fmt(A.fib.hi)}) : ${A.fib.levels.map((l) => (l.ratio * 100).toFixed(1) + "% " + fmt(l.price)).join(", ")}
Plus haut / bas sur 1 an : ${fmt(A.hi52)} / ${fmt(A.lo52)}
Performances : ${A.perf.map((p) => p.lbl + " " + (p.v == null ? "—" : pct(p.v / 100))).join(" · ")}
Score technique synthétique : ${A.score}/100 (${TA.verdictOf(A.score)[0]})
Signaux :
${A.sig.map((s) => `- ${s.label} : ${s.value} → ${s.txt} (${s.detail})`).join("\n")}
Résistances : ${A.res.map((x) => `${fmt(x.level)} (${x.touches} contacts)`).join(", ") || "aucune proche"}
Supports : ${A.sup.map((x) => `${fmt(x.level)} (${x.touches} contacts)`).join(", ") || "aucun proche"}
30 dernières bougies (date;ouverture;haut;bas;clôture) :
${recent}`;
}

let aiBusy = false;
$("go").addEventListener("click", async () => {
  if (aiBusy || !state.A) return;
  aiBusy = true; $("go").disabled = true;
  $("ai-status").className = "status"; $("ai-status").textContent = "Claude analyse le graphique et les actus… (souvent 20 à 60 secondes)";
  const general = (state.allNews?.items || []).slice(0, 12);
  const news = [...state.assetNews.slice(0, 13), ...general].map(({ title, source, date }) => ({ title, source, date }));
  try {
    const data = await api("/api/analyse", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: state.symbol, name: displayName(), timeframe: TF_LABEL[state.tf], horizon: $("horizon").value, profil: $("profil").value, depth: $("depth").value, notes: $("notes").value, technical: technicalSummary(), news }),
    });
    showResult(data);
    $("ai-status").textContent = "Analyse générée à " + new Date().toLocaleTimeString("fr-FR") + " sur le cours de " + fmt(state.A.last) + ".";
  } catch (e) {
    $("ai-status").className = "status err"; $("ai-status").textContent = e.message;
  } finally { aiBusy = false; $("go").disabled = !state.config.ai; }
});

function showResult(d) {
  const R = $("result"); R.replaceChildren();
  const bias = String(d.biais || "neutre").toLowerCase();
  const bc = bias.startsWith("haus") ? "up" : bias.startsWith("bais") ? "down" : "flat";
  R.append(el("div", { class: "res-head" }, el("span", { class: "verdict " + bc }, bias[0].toUpperCase() + bias.slice(1)), el("span", { class: "mono muted" }, `confiance ${Math.round(+d.confiance || 0)} / 100`)));
  if (d.resume) R.append(el("p", { class: "summary" }, d.resume));
  if (Array.isArray(d.scenarios)) R.append(el("div", { class: "scen" }, d.scenarios.slice(0, 3).map((s) => {
    const nm = String(s.nom || ""), c = /haus/i.test(nm) ? "--up" : /bais/i.test(nm) ? "--down" : "--warn";
    const p = Math.max(0, Math.min(100, +s.probabilite || 0));
    const obj = s.objectif != null && isFinite(+s.objectif) ? +s.objectif : null;
    return el("div", { class: "sc" }, el("div", { class: "sc-top" }, el("b", null, nm), el("span", null, p + " %")),
      el("div", { class: "bar-p" }, el("i", { style: `width:${p}%;background:var(${c})` })),
      obj != null ? el("div", { class: "mono small muted" }, `Objectif ${fmt(obj)} (${pct(obj / state.A.last - 1)})`) : null,
      s.declencheur ? el("p", null, el("b", null, "Déclencheur : "), s.declencheur) : null,
      s.description ? el("p", { class: "muted" }, s.description) : null);
  })));
  const list = (t, a) => Array.isArray(a) && a.length ? el("div", null, el("div", { class: "eyebrow" }, t), el("ul", null, a.map((x) => el("li", null, String(x))))) : null;
  R.append(el("div", { class: "cols" }, list("Lecture technique", d.lecture_technique), list("Lecture de l'actualité", d.lecture_actus)));
  const nv = d.niveaux || {}, p = d.plan || {};
  const rows = [["Supports", (nv.supports || []).map((x) => fmt(+x)).join(" · ")], ["Résistances", (nv.resistances || []).map((x) => fmt(+x)).join(" · ")], ["Invalidation", nv.invalidation != null ? fmt(+nv.invalidation) : ""], ["Approche", p.approche], ["Entrée", p.entree], ["Stop", p.stop], ["Objectifs", p.objectifs], ["Gain / risque", p.ratio]].filter(([, v]) => v);
  if (rows.length) R.append(el("div", { class: "plan" }, el("div", { class: "eyebrow" }, "Niveaux et plan indicatif"), el("dl", null, rows.flatMap(([k, v]) => [el("dt", null, k), el("dd", null, String(v))]))));
  R.append(el("div", { class: "cols" }, list("Risques", d.risques), list("À surveiller", d.a_surveiller)));
  R.hidden = false;
}

/* ───────── Académie ───────── */
let currentLesson = null;
const helpers = () => ({ name: displayName(), fmt, pct, pctAbs, tfLabel: TF_LABEL[state.tf].toLowerCase() });
function renderAcademy(id) {
  const lesson = LESSONS.find((l) => l.id === id) || currentLesson || LESSONS[0];
  currentLesson = lesson;
  $("lessons").replaceChildren(...MODULES.map((m) => el("div", null, el("h3", null, m.title),
    LESSONS.filter((l) => l.module === m.id).map((l) => el("a", { href: "#academie/" + l.id, class: l.id === lesson.id ? "on" : "" }, l.title, el("span", null, l.minutes + " min"))))));
  const idx = LESSONS.indexOf(lesson), prev = LESSONS[idx - 1], next = LESSONS[idx + 1];
  const mod = MODULES.find((m) => m.id === lesson.module);
  const body = el("div"); body.innerHTML = lesson.body; // contenu statique écrit dans academy.js
  const actions = el("div", { class: "lesson-actions" },
    lesson.overlay ? el("button", { class: "primary", onclick: () => { setOverlay(lesson.overlay, true); location.hash = "marches"; } }, "Afficher sur le graphique de " + displayName()) : null,
    lesson.symbol ? el("button", { class: "primary", onclick: () => { loadSymbol(lesson.symbol); location.hash = "marches"; } }, "Ouvrir le graphique de " + (KNOWN.get(lesson.symbol) || lesson.symbol)) : null);
  $("lesson").replaceChildren(
    el("div", { class: "eyebrow" }, mod.title + " · " + lesson.minutes + " min"),
    el("h1", null, lesson.title),
    el("div", { id: "livebox" }),
    body,
    lesson.calculator ? calculator() : null,
    actions.childElementCount ? actions : null,
    el("div", { class: "lesson-nav" },
      prev ? el("a", { href: "#academie/" + prev.id }, "← " + prev.title) : el("span"),
      next ? el("a", { href: "#academie/" + next.id }, next.title + " →") : el("span")));
  refreshLesson();
}
function refreshLesson() {
  const box = document.getElementById("livebox");
  if (!box || !currentLesson) return;
  const L = currentLesson;
  let html = null;
  if (L.symbol && state.quotes.get(L.symbol)) {
    const q = state.quotes.get(L.symbol);
    html = `<b>${KNOWN.get(L.symbol)}</b> cote <b>${fmt(q.price)}</b> (${pct(q.price / q.previousClose - 1)} sur la séance).`;
  } else if (L.live && state.A) {
    try { html = L.live(state.A, helpers()); } catch { html = null; }
  }
  if (!html) { box.replaceChildren(); box.className = ""; return; }
  box.className = "livebox";
  box.innerHTML = `<div class="eyebrow"><span class="live-dot on"></span>En ce moment, sur ${L.symbol ? "le marché" : "l'actif suivi"}</div><p>${html}</p>`;
}
function calculator() {
  const wrap = el("div", { class: "calc" });
  const f = (id, label, val) => el("label", null, label, el("input", { id, type: "number", value: val, step: "any", min: "0" }));
  const last = state.A?.last ? +state.A.last.toPrecision(5) : 50;
  const stop = state.A?.atrNow ? +(state.A.last - 2 * state.A.atrNow).toPrecision(5) : 48;
  wrap.append(f("k-cap", "Capital (€)", 10000), f("k-risk", "Risque par trade (%)", 1), f("k-in", "Prix d'entrée", last), f("k-stop", "Stop", stop), f("k-tp", "Objectif", +(last + (last - stop) * 2).toPrecision(5)), el("p", { class: "calc-out", id: "k-out" }));
  const calc = () => {
    const v = (id) => parseFloat(wrap.querySelector("#" + id).value);
    const cap = v("k-cap"), r = v("k-risk") / 100, e = v("k-in"), s = v("k-stop"), t = v("k-tp");
    const per = Math.abs(e - s), out = wrap.querySelector("#k-out");
    if (!(cap > 0 && r > 0 && e > 0 && per > 0)) { out.textContent = "Renseigne un capital, un risque et un stop différent du prix d'entrée."; return; }
    const qty = cap * r / per, rr = t > 0 ? Math.abs(t - e) / per : null;
    out.innerHTML = `Risque accepté : <b>${fmt(cap * r)} €</b> · Taille : <b>${qty >= 10 ? Math.floor(qty) : qty.toFixed(4).replace(".", ",")} unités</b> · Position : <b>${fmt(qty * e)} €</b> (${Math.round(qty * e / cap * 100)} % du capital)${rr ? ` · Gain/risque : <b>${rr.toFixed(2).replace(".", ",")}</b>` : ""}`;
  };
  wrap.addEventListener("input", calc); setTimeout(calc);
  return wrap;
}

/* ───────── Démarrage ───────── */
window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { if (state.A) { buildCharts(); paintSeries(true); } });
$("tf").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.tf === state.tf));
$("overlays").querySelectorAll("button").forEach((b) => b.classList.toggle("on", state.overlays.has(b.dataset.ov)));

(async () => {
  try { state.config = await api("/api/config"); } catch { state.config = {}; }
  $("mock-banner").hidden = !state.config.mock;
  $("ai-state").textContent = state.config.ai ? "IA active" : "IA non configurée";
  $("ai-state").className = "badge " + (state.config.ai ? "ok" : "ko");
  $("go").disabled = !state.config.ai;
  if (!state.config.ai) $("ai-status").textContent = "Pour activer l'analyse, l'administrateur du site doit ajouter une clé API Anthropic (variable ANTHROPIC_API_KEY).";
  renderTicker(); renderWatch();
  route();
  loadSymbol(state.symbol);
  refreshQuotes(); setInterval(refreshQuotes, 20000);
  loadNews(); setInterval(loadNews, 5 * 60 * 1000);
})();
