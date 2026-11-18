// Vue "Prédictions" : prédictions IA mises à jour en continu par le serveur, reçues en direct.
import { $, el, api, fmt, pct, ago, onLive, toast } from "./util.js";
import { assetClass } from "./universe.js";

let ctx, data = null, filter = "all", clock = null;
const CLASS_LABEL = { all: "Tout", indice: "Indices", action: "Actions", devise: "Devises", matiere: "Matières premières", crypto: "Crypto" };

export function init(c) {
  ctx = c;
  onLive("predictions", (m) => {
    if (!data) return;
    if (m.status === "running") data.running = true;
    if (m.status === "update" && m.prediction) {
      const i = data.predictions.findIndex((p) => p.symbol === m.prediction.symbol);
      if (i >= 0) data.predictions[i] = m.prediction; else data.predictions.push(m.prediction);
      if (!$("view-predictions").hidden) toast(`Nouvelle prédiction : ${m.prediction.name}`);
      flash = m.prediction.symbol;
    }
    if (m.status === "done") { data.running = false; data.lastRun = m.lastRun; data.nextRun = m.nextRun; load(); }
    if (!$("view-predictions").hidden) render();
  });
  $("pred-filter").addEventListener("click", (e) => { const f = e.target.closest("button")?.dataset.f; if (f) { filter = f; render(); } });
}
let flash = null;

export async function show() {
  render();
  await load();
  clearInterval(clock);
  clock = setInterval(() => { if ($("view-predictions").hidden) clearInterval(clock); else renderStatus(); }, 30000);
}

async function load() {
  try { data = await api("/api/predictions"); } catch (e) { data = { error: e.message, predictions: [] }; }
  if (!$("view-predictions").hidden) render();
}

function renderStatus() {
  const s = $("pred-status");
  if (!data) { s.textContent = "Chargement…"; return; }
  if (data.error) { s.textContent = "Prédictions indisponibles : " + data.error; return; }
  if (!data.enabled) { s.textContent = "Les prédictions automatiques ne sont pas encore activées : l'administrateur du site doit ajouter une clé API Anthropic."; return; }
  const parts = [];
  if (data.running) parts.push("Mise à jour en cours…");
  else if (data.lastRun) parts.push(`Dernière mise à jour ${ago(data.lastRun)}`);
  if (data.nextRun && !data.running) {
    const m = Math.max(0, Math.round((new Date(data.nextRun) - Date.now()) / 60000));
    parts.push(m < 1 ? "prochaine dans moins d'une minute" : `prochaine dans ${m} min`);
  }
  parts.push(`${data.symbols?.length || 0} actifs suivis`);
  s.textContent = parts.join(" · ");
}

function render() {
  renderStatus();
  const classes = ["all", ...new Set((data?.predictions || []).map((p) => p.assetClass || assetClass(p.symbol)))];
  $("pred-filter").replaceChildren(...classes.map((c) => el("button", { "data-f": c, class: c === filter ? "on" : "" }, CLASS_LABEL[c] || c)));
  const st = data?.stats;
  $("pred-stats").replaceChildren(...(st ? [
    stat(st.total ? Math.round(st.correct / st.total * 100) + " %" : "—", "de bonnes directions", st.total ? `sur ${st.total} prédictions arrivées à échéance` : "aucune prédiction encore arrivée à échéance (7 jours)"),
    stat(String(st.pending), "en cours", "prédictions pas encore jugées"),
    stat(data.demo ? "Démo" : (data.intervalMin ? data.intervalMin + " min" : "—"), data.demo ? "données fictives" : "entre deux mises à jour", "seuls les actifs dont les actus ou le prix ont changé sont recalculés"),
  ] : []));
  const list = (data?.predictions || []).filter((p) => filter === "all" || (p.assetClass || assetClass(p.symbol)) === filter);
  $("pred-grid").replaceChildren(...(list.length ? list.map(card) : [el("p", { class: "muted" }, data?.enabled ? "Les premières prédictions arrivent dans quelques minutes." : "")]));
  flash = null;
}

const stat = (big, label, small) => el("div", { class: "stat" }, el("b", null, big), el("span", null, label), el("small", null, small));

function card(p) {
  const c = p.direction === "hausse" ? "up" : p.direction === "baisse" ? "down" : "flat";
  const move = p.price && p.priceAtPrediction ? p.price / p.priceAtPrediction - 1 : null;
  return el("article", { class: "panel pcard" + (flash === p.symbol ? " fresh" : "") },
    el("header", null,
      el("button", { class: "linklike", onclick: () => ctx.open(p.symbol, p.name), title: "Ouvrir le graphique" }, el("h3", null, p.name)),
      el("span", { class: "pill " + c }, p.direction === "hausse" ? "↗ Hausse" : p.direction === "baisse" ? "↘ Baisse" : "→ Neutre")),
    el("div", { class: "pmeta mono" }, `${fmt(p.priceAtPrediction)} au moment de la prédiction`, move != null && Math.abs(move) > 0 ? el("span", { class: move > 0 ? "up" : "down" }, ` · ${pct(move)} depuis`) : null),
    el("div", { class: "prob" },
      el("div", { class: "prob-bar" }, el("i", { style: `width:${p.probUp}%` })),
      el("div", { class: "prob-lbl" }, el("span", null, `${p.probUp} % de chances de hausse`), el("span", { class: "muted" }, `confiance ${p.confidence}/100`))),
    el("dl", { class: "targets mono" },
      el("dt", null, "Objectif haut"), el("dd", { class: "up" }, fmt(p.targetHigh)),
      el("dt", null, "Objectif bas"), el("dd", { class: "down" }, fmt(p.targetLow)),
      el("dt", null, "Invalidation"), el("dd", null, fmt(p.invalidation))),
    p.summary ? el("p", { class: "psum" }, p.summary) : null,
    p.catalysts?.length ? el("div", null, el("div", { class: "eyebrow" }, "Actus prises en compte"),
      el("ul", { class: "cat" }, p.catalysts.map((k) => el("li", { class: k.effect === "positif" ? "pos" : k.effect === "négatif" ? "neg" : "" },
        el("a", { href: k.link, target: "_blank", rel: "noopener noreferrer" }, k.title), el("small", null, ` ${k.source}`), k.why ? el("span", null, k.why) : null)))) : null,
    p.risks?.length ? el("details", null, el("summary", null, "Risques"), el("ul", null, p.risks.map((r) => el("li", null, r)))) : null,
    el("footer", { class: "muted small" }, `Horizon ${p.horizon} · générée ${ago(p.createdAt)}${p.demo ? " · exemple fictif" : ""}`));
}
