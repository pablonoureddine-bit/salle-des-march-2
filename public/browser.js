// Sélecteur d'actifs de la page Marchés : un onglet par famille de titres, des cartes avec image, cours et mini-courbe.
import { $, el, api, fmt, pct, dir, spark, store } from "./util.js";
import { WORLD, STOCKS } from "./universe.js";
import { assetVisual } from "./visuals.js";
import { subscribeTickers } from "./realtime.js";

const byId = (id) => WORLD.find((g) => g.id === id).items;
export const FAMILIES = [
  { id: "indices", label: "Indices", items: [...byId("europe"), ...byId("ameriques"), ...byId("asie")] },
  { id: "actions", label: "Actions", items: STOCKS.flatMap((g) => g.items.map(([s, n]) => [s, n, g.group.replace("Actions ", "")])) },
  { id: "crypto", label: "Crypto", items: byId("crypto") },
  { id: "devises", label: "Devises", items: byId("devises") },
  { id: "matieres", label: "Matières premières", items: byId("matieres") },
  { id: "taux", label: "Taux", items: byId("taux") },
];

let ctx, fam = store.get("sdm.family", "indices"), timer = null;
export const quotes = new Map();

export function init(c) {
  ctx = c;
  $("families").replaceChildren(...FAMILIES.map((f) => el("button", { role: "tab", "data-f": f.id, onclick: () => { fam = f.id; store.set("sdm.family", fam); render(); refresh(); } }, f.label)));
  render(); refresh();
  timer = setInterval(() => !document.hidden && !$("view-marches").hidden && refresh(), 10000);
  // Cryptos : cours en temps réel sur les cartes (rendu au plus une fois par seconde).
  if (!ctx.config().mock) {
    let dirty = false;
    subscribeTickers(FAMILIES.find((f) => f.id === "crypto").items.map((x) => x[0]), (t) => {
      const prev = quotes.get(t.symbol);
      quotes.set(t.symbol, { ...(prev || {}), symbol: t.symbol, price: t.price, previousClose: prev?.previousClose ?? t.open24h, spark: prev?.spark || [], moved: prev?.price != null && t.price !== prev.price ? (t.price > prev.price ? "up" : "down") : null });
      dirty = true;
    });
    setInterval(() => { if (dirty && fam === "crypto" && !$("view-marches").hidden) { dirty = false; render(); } }, 1000);
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
      if (q.price != null) { q.moved = prev?.price != null && q.price !== prev.price ? (q.price > prev.price ? "up" : "down") : null; quotes.set(q.symbol, q); }
    }
  } catch {}
  render();
  ctx.onQuotes?.(quotes);
}

function render() {
  $("families").querySelectorAll("button").forEach((b) => { const on = b.dataset.f === fam; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
  const f = FAMILIES.find((x) => x.id === fam);
  const cur = ctx.currentSymbol();
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
