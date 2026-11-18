// Vue "Calendrier" : annonces économiques et résultats d'entreprises à venir, groupés par jour.
import { $, el, api, store } from "./util.js";
import { assetVisual } from "./visuals.js";
import { notify } from "./notify.js";

let ctx, data = null, filter = store.get("sdm.cal", "fort"), reminded = new Set(store.get("sdm.calrem", []));

export function init(c) {
  ctx = c;
  $("cal-filter").addEventListener("click", (e) => { const f = e.target.closest("button")?.dataset.f; if (f) { filter = f; store.set("sdm.cal", f); render(); } });
  // Rappel 15 minutes avant un événement à fort impact.
  setInterval(checkSoon, 60000);
}

export async function show() {
  if (!data) $("cal-list").replaceChildren(el("p", { class: "muted" }, "Chargement du calendrier…"));
  try { data = await api("/api/calendar"); } catch (e) { data = { events: [], error: e.message }; }
  render(); checkSoon();
}

export async function upcoming(n = 4) {
  if (!data) { try { data = await api("/api/calendar"); } catch { return []; } }
  return data.events.filter((e) => new Date(e.date) > Date.now() && (e.impact === "fort" || e.type === "earnings")).slice(0, n);
}

// Le drapeau est toujours dans un conteneur : si l'image ne charge pas, la grille garde ses colonnes.
const FLAG = (cc) => { const i = el("img", { class: "flag", src: `https://flagcdn.com/w40/${cc}.png`, alt: "", width: "22", height: "16", loading: "lazy" }); i.onerror = () => i.replaceWith(el("span", { class: "flag-txt" }, cc.toUpperCase())); return el("span", { class: "cal-flag" }, i); };

function render() {
  $("cal-filter").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.f === filter));
  if (!data) return;
  const evs = data.events.filter((e) => filter === "tout" || (filter === "fort" ? e.impact === "fort" || e.type === "earnings" : filter === "resultats" ? e.type === "earnings" : e.type === "eco"));
  if (!evs.length) {
    const errs = [data.error, ...(data.errors || [])].filter(Boolean);
    $("cal-list").replaceChildren(el("div", { class: "empty" },
      el("h2", null, "Aucun événement à afficher"),
      el("p", null, errs.length ? "Les sources du calendrier ne répondent pas pour le moment. Nouvel essai automatique dans quelques minutes." : "Essaie le filtre « Tout »."),
      ...errs.map((x) => el("p", { class: "muted small" }, "Détail : " + x))));
    return;
  }
  const days = new Map();
  for (const e of evs) {
    const k = new Date(e.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    (days.get(k) || days.set(k, []).get(k)).push(e);
  }
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  $("cal-list").replaceChildren(...[...days].map(([day, list]) => el("section", { class: "cal-day" },
    el("h2", null, day === today ? "Aujourd'hui" : day[0].toUpperCase() + day.slice(1)),
    el("ul", null, list.map((e) => {
      const past = new Date(e.date) < Date.now();
      return el("li", { class: "cal-ev imp-" + e.impact + (past ? " past" : "") },
        el("time", { class: "mono" }, new Date(e.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })),
        e.type === "earnings" ? assetVisual(e.symbol, e.title.replace("Résultats de ", ""), 28) : e.cc ? FLAG(e.cc) : el("span", { class: "cal-flag" }),
        el("div", { class: "cal-main" },
          e.type === "earnings" ? el("button", { class: "linklike", onclick: () => ctx.company(e.symbol) }, el("b", null, e.title)) : el("b", null, e.title),
          el("small", null, [e.country, e.type === "earnings" ? "publication de résultats" : null, e.forecast ? `prévu ${e.forecast}` : null, e.previous ? `précédent ${e.previous}` : null, e.actual ? `publié ${e.actual}` : null].filter(Boolean).join(" · "))),
        el("span", { class: "imp", title: "Impact attendu sur les marchés" }, e.type === "earnings" ? "résultats" : "impact " + e.impact));
    })))));
}

function checkSoon() {
  if (!data) return;
  const now = Date.now();
  for (const e of data.events) {
    const dt = new Date(e.date) - now;
    const key = e.date + e.title;
    if (e.impact === "fort" && dt > 0 && dt < 15 * 60e3 && !reminded.has(key)) {
      reminded.add(key); store.set("sdm.calrem", [...reminded].slice(-100));
      notify({ title: `Dans ${Math.max(1, Math.round(dt / 60000))} min : ${e.title}`, body: [e.country, e.forecast ? "prévu " + e.forecast : null].filter(Boolean).join(" · "), kind: "calendar", browser: true });
    }
  }
}
