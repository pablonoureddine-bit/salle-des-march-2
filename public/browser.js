// Sélecteur d'actifs de la page Marchés : un onglet par famille de titres, des cartes avec image, cours et mini-courbe.
import { $, el, api, fmt, pct, dir, spark, store } from "./util.js";
import { WORLD, STOCKS, KNOWN } from "./universe.js";
import { assetVisual } from "./visuals.js";
import { subscribeTickers } from "./realtime.js";

const byId = (id) => WORLD.find((g) => g.id === id).items;
// Mon suivi : les favoris de l'utilisateur, rafraîchis toutes les 5 secondes avec une courbe en direct.
let favs = store.get("sdm.favs", ["^FCHI", "^GSPC", "BTC-USD", "GC=F", "EURUSD=X", "AAPL"]);
const live = new Map(); // symbole → cours relevés depuis l'ouverture de la page
export const isFav = (s) => favs.includes(s);
export function toggleFav(s) {
  favs = isFav(s) ? favs.filter((x) => x !== s) : [...favs, s].slice(-12);
  store.set("sdm.favs", favs);
  render();
  return isFav(s);
}
export const FAMILIES = [
  { id: "suivi", label: "★ Mon suivi", get items() { return favs.map((s) => [s, KNOWN.get(s) || s]); } },
  { id: "indices", label: "Indices", items: [...byId("europe"), ...byId("ameriques"), ...byId("asie")] },
  { id: "actions", label: "Actions", items: STOCKS.flatMap((g) => g.items.map(([s, n]) => [s, n, g.group.replace("Actions ", "")])) },
  { id: "crypto", label: "Crypto", items: byId("crypto") },
  { id: "devises", label: "Devises", items: byId("devises") },
  { id: "matieres", label: "Matières premières", items: byId("matieres") },
  { id: "taux", label: "Taux", items: byId("taux") },
];

let ctx, fam = store.get("sdm.family", "suivi"), timer = null, tick = 0;
export const quotes = new Map();

export function init(c) {
  ctx = c;
  $("families").replaceChildren(...FAMILIES.map((f) => el("button", { role: "tab", "data-f": f.id, onclick: () => { fam = f.id; store.set("sdm.family", fam); render(); refresh(); } }, f.label)));
  render(); refresh();
  // Mon suivi : toutes les 5 s ; autres familles : toutes les 10 s.
  timer = setInterval(() => { tick++; if (!document.hidden && !$("view-marches").hidden && (fam === "suivi" || tick % 2 === 0)) refresh(); }, 5000);
  // Cryptos : cours en temps réel sur les cartes (rendu au plus une fois par seconde).
  if (!ctx.config().mock) {
    let dirty = false;
    subscribeTickers(FAMILIES.find((f) => f.id === "crypto").items.map((x) => x[0]), (t) => {
      pushLive(t.symbol, t.price);
      const prev = quotes.get(t.symbol);
      quotes.set(t.symbol, { ...(prev || {}), symbol: t.symbol, price: t.price, previousClose: prev?.previousClose ?? t.open24h, spark: prev?.spark || [], moved: prev?.price != null && t.price !== prev.price ? (t.price > prev.price ? "up" : "down") : null });
      dirty = true;
    });
    setInterval(() => { if (dirty && (fam === "crypto" || fam === "suivi") && !$("view-marches").hidden) { dirty = false; render(); } }, 1000);
  }
}

export function familyOf(symbol) { return FAMILIES.find((f) => f.items.some(([s]) => s === symbol))?.id; }
export function showFamilyOf(symbol) { const f = familyOf(symbol); if (f && f !== fam) { fam = f; store.set("sdm.family", fam); render(); refresh(); } else render(); }

async function refresh() {
  const f = FAMILIES.find((x) => x.id === fam);
  try {
    const res = await api("/api/quotes?symbols=" + encodeURIComponent(f.items.map((x) => x[0]).join(",")));
    for (const q of res) {
      const prev = quotes.get(q.symbol);
      if (q.price != null) { q.moved = prev?.price != null && q.price !== prev.price ? (q.price > prev.price ? "up" : "down") : null; quotes.set(q.symbol, q); pushLive(q.symbol, q.price); }
    }
  } catch {}
  render();
  ctx.onQuotes?.(quotes);
}

function pushLive(s, price) {
  const arr = live.get(s) || [];
  if (arr.at(-1) !== price) arr.push(price);
  live.set(s, arr.slice(-180));
}

function render() {
  $("families").querySelectorAll("button").forEach((b) => { const on = b.dataset.f === fam; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
  const f = FAMILIES.find((x) => x.id === fam);
  const cur = ctx.currentSymbol();
  $("cards").classList.toggle("wall", fam === "suivi");
  if (fam === "suivi") { renderWall(f, cur); return; }
  $("cards").replaceChildren(...f.items.map(([s, n, sub]) => {
    const q = quotes.get(s);
    const ch = q?.price != null && q.previousClose ? q.price / q.previousClose - 1 : null;
    const card = el("button", { class: "acard" + (s === cur ? " on" : "") + (q?.moved ? " tick-" + q.moved : ""), onclick: () => ctx.select(s, n), title: `Voir ${n}` },
      el("div", { class: "acard-top" }, assetVisual(s, n, 34), el("div", { class: "acard-id" }, el("b", null, n), el("small", null, sub || s))),
      el("div", { class: "acard-px" }, el("span", { class: "mono" }, q?.price != null ? fmt(q.price) : "…"), el("span", { class: "chip " + dir(ch) }, ch != null ? pct(ch) : "")),
      q?.spark?.length ? spark(q.spark, 150, 28) : el("span", { class: "spark-ph" }));
    if (q) q.moved = null;
    return card;
  }));
  // Les meilleures et moins bonnes performances de la famille.
  const ranked = f.items.map(([s, n]) => { const q = quotes.get(s); return q?.price != null && q.previousClose ? { s, n, ch: q.price / q.previousClose - 1 } : null; }).filter(Boolean).sort((a, b) => b.ch - a.ch);
  $("movers").replaceChildren(...(ranked.length >= 4 ? [
    el("span", { class: "muted small" }, "Aujourd'hui :"),
    ...[...ranked.slice(0, 2), ...ranked.slice(-2).reverse()].map((m) => el("button", { class: "mv " + dir(m.ch), onclick: () => ctx.select(m.s, m.n) }, m.ch >= 0 ? "▲ " : "▼ ", m.n, " ", pct(m.ch))),
  ] : []));
}

// Mur de suivi : grandes cartes avec courbe en direct depuis l'ouverture de la page (sinon le mois écoulé).
function renderWall(f, cur) {
  $("movers").replaceChildren();
  if (!f.items.length) {
    $("cards").replaceChildren(el("div", { class: "empty" }, el("h2", null, "Ton mur de suivi est vide"), el("p", null, "Ouvre un actif dans une autre famille et clique sur « ☆ Suivre » pour l'ajouter ici.")));
    return;
  }
  $("cards").replaceChildren(...f.items.map(([s, n]) => {
    const q = quotes.get(s), pts = live.get(s) || [];
    const ch = q?.price != null && q.previousClose ? q.price / q.previousClose - 1 : null;
    const isLive = pts.length >= 3;
    const open = () => ctx.select(s, n);
    const card = el("div", { class: "acard wcard" + (s === cur ? " on" : "") + (q?.moved ? " tick-" + q.moved : ""), role: "button", tabindex: "0", title: `Voir ${n}`, onclick: open, onkeydown: (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open()) },
      el("div", { class: "acard-top" }, assetVisual(s, n, 40), el("div", { class: "acard-id" }, el("b", null, n), el("small", null, s)),
        el("button", { class: "wfav", title: "Retirer du suivi", "aria-label": `Retirer ${n} du suivi`, onclick: (e) => { e.stopPropagation(); toggleFav(s); } }, "★")),
      el("div", { class: "acard-px" }, el("span", { class: "mono big" }, q?.price != null ? fmt(q.price) : "…"), el("span", { class: "chip " + dir(ch) }, ch != null ? pct(ch) : "")),
      (isLive ? pts : q?.spark || []).length > 1 ? spark(isLive ? pts : q.spark, 300, 70) : el("span", { class: "spark-ph" }),
      el("small", { class: "wlabel" }, isLive ? el("span", null, el("i", { class: "live-dot on" }), ` en direct · ${pts.length} relevés`) : "1 mois · la courbe en direct démarre dans quelques secondes"));
    if (q) q.moved = null;
    return card;
  }));
}
