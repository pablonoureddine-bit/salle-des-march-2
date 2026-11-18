// Vue "Monde" : tous les indices, taux, devises, matières premières et cryptos, rafraîchis en continu.
import { $, el, api, fmt, pct, dir, spark, store } from "./util.js";
import { WORLD } from "./universe.js";

let ctx, timer = null, quotes = new Map(), filter = store.get("sdm.monde", "all");
const REFRESH_MS = 20000;

export function init(c) {
  ctx = c;
  $("monde-filter").addEventListener("click", (e) => {
    const f = e.target.closest("button")?.dataset.f; if (!f) return;
    filter = f; store.set("sdm.monde", f); render();
  });
}

export function setVisible(on) {
  clearInterval(timer); timer = null;
  if (!on) return;
  render(); refresh();
  timer = setInterval(() => !document.hidden && refresh(), REFRESH_MS);
}

async function refresh() {
  const all = WORLD.flatMap((g) => g.items.map((x) => x[0]));
  try {
    const res = (await Promise.all([all.slice(0, 40), all.slice(40)].filter((c) => c.length)
      .map((c) => api("/api/quotes?symbols=" + encodeURIComponent(c.join(",")))))).flat();
    res.forEach((q) => quotes.set(q.symbol, q));
    $("monde-time").textContent = "Mis à jour à " + new Date().toLocaleTimeString("fr-FR");
  } catch {
    $("monde-time").textContent = "Mise à jour impossible pour le moment. Nouvel essai dans 20 secondes.";
  }
  render();
}

function render() {
  $("monde-filter").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.f === filter));
  const groups = WORLD.filter((g) => filter === "all" || g.id === filter);
  // Plus fortes variations du jour, toutes classes confondues.
  const moves = WORLD.flatMap((g) => g.items).map(([s, n]) => { const q = quotes.get(s); return q?.price && q.previousClose ? { s, n, ch: q.price / q.previousClose - 1 } : null; }).filter(Boolean).sort((a, b) => b.ch - a.ch);
  $("monde-movers").replaceChildren(...(moves.length ? [
    el("div", null, el("div", { class: "eyebrow" }, "Meilleures performances du jour"), ...moves.slice(0, 3).map(mover)),
    el("div", null, el("div", { class: "eyebrow" }, "Moins bonnes performances du jour"), ...moves.slice(-3).reverse().map(mover)),
  ] : []));
  $("monde-grid").replaceChildren(...groups.map((g) => el("section", { class: "panel" },
    el("h2", null, g.title),
    el("div", { class: "tbl-wrap" }, el("table", { class: "tbl" },
      el("thead", null, el("tr", null, el("th", null, "Marché"), el("th", { class: "r" }, "Cours"), el("th", { class: "r" }, "Variation"), el("th", { class: "r hide-sm" }, "1 mois"))),
      el("tbody", null, g.items.map(([s, n, country]) => {
        const q = quotes.get(s);
        const ch = q?.price != null && q.previousClose ? q.price / q.previousClose - 1 : null;
        return el("tr", { tabindex: "0", onclick: () => ctx.open(s, n), onkeydown: (e) => e.key === "Enter" && ctx.open(s, n), title: "Ouvrir le graphique" },
          el("td", null, el("b", null, n), country ? el("small", null, country) : null),
          el("td", { class: "r mono" }, q?.price != null ? fmt(q.price) : "…"),
          el("td", { class: "r mono " + dir(ch) }, ch != null ? pct(ch) : ""),
          el("td", { class: "r hide-sm" }, q?.spark?.length ? spark(q.spark) : ""));
      })))))));
}

const mover = (m) => el("button", { class: "mover", onclick: () => ctx.open(m.s, m.n) }, el("span", null, m.n), el("span", { class: "mono " + dir(m.ch) }, pct(m.ch)));
