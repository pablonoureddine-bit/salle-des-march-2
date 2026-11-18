// Vue "Journal" : journal de trading personnel (enregistré dans ce navigateur).
import { $, el, store, fmt, pct } from "./util.js";
import { KNOWN } from "./universe.js";
import { burst } from "./fx.js";
import { notify } from "./notify.js";

let trades = store.get("sdm.journal", []);
let ctx, editing = null;
const save = () => store.set("sdm.journal", trades);
const EMOTIONS = ["Serein", "Confiant", "Hésitant", "Stressé", "Euphorique", "Frustré"];

// Gain ou perte d'un trade clôturé, frais déduits.
function pnl(t) {
  if (t.exit == null || t.exit === "") return null;
  const q = +t.qty || 0, sign = t.side === "vente" ? -1 : 1;
  return (+t.exit - +t.entry) * q * sign - (+t.fees || 0);
}
// Résultat exprimé en "R" : gain divisé par le risque pris (distance au stop).
function rMultiple(t) {
  const p = pnl(t); if (p == null || !t.stop) return null;
  const risk = Math.abs(+t.entry - +t.stop) * (+t.qty || 0);
  return risk ? p / risk : null;
}

export function init(c) {
  ctx = c;
  $("j-form").addEventListener("submit", (e) => { e.preventDefault(); submit(); });
  $("j-cancel").addEventListener("click", () => resetForm());
  $("j-emotion").replaceChildren(el("option", { value: "" }, "—"), ...EMOTIONS.map((x) => el("option", { value: x }, x)));
}

export function show() {
  if (!$("j-symbol").value) prefill();
  render();
}

function prefill() {
  const s = ctx.currentSymbol(), price = ctx.currentPrice();
  $("j-symbol").value = KNOWN.get(s) || s;
  if (price) $("j-entry").value = +price.toPrecision(6);
  $("j-date").value = new Date().toISOString().slice(0, 10);
}

function resetForm() {
  editing = null; $("j-form").reset(); $("j-submit").textContent = "Ajouter le trade"; $("j-cancel").hidden = true; prefill();
}

function submit() {
  const f = (id) => $(id).value.trim();
  const t = {
    id: editing || Date.now(), date: f("j-date"), symbol: f("j-symbol"), side: f("j-side"),
    entry: parseFloat(f("j-entry")), exit: f("j-exit") === "" ? null : parseFloat(f("j-exit")), qty: parseFloat(f("j-qty")),
    stop: f("j-stop") === "" ? null : parseFloat(f("j-stop")), target: f("j-target") === "" ? null : parseFloat(f("j-target")),
    fees: f("j-fees") === "" ? 0 : parseFloat(f("j-fees")), setup: f("j-setup"), emotion: f("j-emotion"), notes: f("j-notes"),
  };
  if (!t.symbol || !(t.entry > 0) || !(t.qty > 0)) { $("j-msg").textContent = "Renseigne au moins l'actif, le prix d'entrée et la quantité."; return; }
  $("j-msg").textContent = "";
  const wasOpen = editing ? trades.find((x) => x.id === editing)?.exit == null : true;
  trades = editing ? trades.map((x) => (x.id === editing ? t : x)) : [t, ...trades];
  save();
  const p = pnl(t);
  if (p != null && wasOpen) {
    const anchor = $("j-stats");
    burst(p >= 0 ? "gain" : "loss", { anchor, size: "big", text: (p >= 0 ? "+" : "") + fmt(p) });
    notify({ title: p >= 0 ? `Trade gagnant sur ${t.symbol}` : `Trade perdant sur ${t.symbol}`, body: `${p >= 0 ? "+" : ""}${fmt(p)}${rMultiple(t) != null ? ` (${rMultiple(t).toFixed(2).replace(".", ",")} R)` : ""}`, kind: p >= 0 ? "gain" : "loss", popup: false });
  }
  resetForm(); render();
}

function edit(t) {
  editing = t.id;
  for (const [id, k] of [["j-date", "date"], ["j-symbol", "symbol"], ["j-side", "side"], ["j-entry", "entry"], ["j-exit", "exit"], ["j-qty", "qty"], ["j-stop", "stop"], ["j-target", "target"], ["j-fees", "fees"], ["j-setup", "setup"], ["j-emotion", "emotion"], ["j-notes", "notes"]])
    $(id).value = t[k] ?? "";
  $("j-submit").textContent = t.exit == null ? "Enregistrer (ajoute le prix de sortie pour clôturer)" : "Enregistrer les modifications";
  $("j-cancel").hidden = false;
  $("j-form").scrollIntoView({ behavior: "smooth", block: "start" });
}

function render() {
  const closed = trades.filter((t) => pnl(t) != null).sort((a, b) => a.date.localeCompare(b.date));
  const wins = closed.filter((t) => pnl(t) > 0), losses = closed.filter((t) => pnl(t) <= 0);
  const total = closed.reduce((a, t) => a + pnl(t), 0);
  const rs = closed.map(rMultiple).filter((x) => x != null);
  const avgWin = wins.length ? wins.reduce((a, t) => a + pnl(t), 0) / wins.length : null;
  const avgLoss = losses.length ? losses.reduce((a, t) => a + pnl(t), 0) / losses.length : null;
  const stat = (big, label, cls = "") => el("div", { class: "stat" }, el("b", { class: cls }, big), el("span", null, label));
  $("j-stats").replaceChildren(
    stat((total >= 0 ? "+" : "") + fmt(total), "résultat total", total > 0 ? "up" : total < 0 ? "down" : ""),
    stat(closed.length ? Math.round(wins.length / closed.length * 100) + " %" : "—", `de trades gagnants (${wins.length}/${closed.length})`),
    stat(rs.length ? (rs.reduce((a, b) => a + b, 0) / rs.length).toFixed(2).replace(".", ",") + " R" : "—", "gain moyen par unité de risque"),
    stat(avgWin != null && avgLoss ? (avgWin / Math.abs(avgLoss)).toFixed(2).replace(".", ",") : "—", "gain moyen / perte moyenne"),
  );
  $("j-curve").replaceChildren(closed.length >= 2 ? curve(closed) : el("p", { class: "muted" }, "La courbe de tes résultats apparaîtra après deux trades clôturés."));
  const open = trades.filter((t) => pnl(t) == null);
  $("j-list").replaceChildren(...(trades.length ? trades.map((t) => {
    const p = pnl(t), r = rMultiple(t);
    return el("tr", null,
      el("td", null, new Date(t.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })),
      el("td", null, el("b", null, t.symbol), t.setup ? el("small", null, t.setup) : null),
      el("td", null, el("span", { class: "pill " + (t.side === "vente" ? "down" : "up") }, t.side === "vente" ? "Vente" : "Achat")),
      el("td", { class: "r mono" }, fmt(t.entry)), el("td", { class: "r mono" }, t.exit != null ? fmt(t.exit) : el("span", { class: "muted" }, "en cours")),
      el("td", { class: "r mono " + (p > 0 ? "up" : p < 0 ? "down" : "") }, p != null ? (p >= 0 ? "+" : "") + fmt(p) : "—", r != null ? el("small", null, r.toFixed(2).replace(".", ",") + " R") : null),
      el("td", { class: "hide-sm" }, t.emotion || ""),
      el("td", { class: "r" }, el("button", { class: "linkbtn", onclick: () => edit(t) }, t.exit == null ? "Clôturer" : "Modifier"),
        el("button", { class: "linkbtn danger", onclick: () => { if (confirmDelete(t)) { trades = trades.filter((x) => x.id !== t.id); save(); render(); } } }, "Supprimer")));
  }) : [el("tr", null, el("td", { colspan: "8", class: "muted" }, "Aucun trade pour l'instant. Ajoute ton premier trade avec le formulaire."))]));
  $("j-open").textContent = open.length ? `${open.length} position${open.length > 1 ? "s" : ""} en cours` : "";
}

// Confirmation intégrée (deuxième clic dans les 3 secondes).
let pendingDelete = null;
function confirmDelete(t) {
  if (pendingDelete === t.id) { pendingDelete = null; return true; }
  pendingDelete = t.id; $("j-msg").textContent = `Clique encore sur « Supprimer » pour confirmer la suppression du trade ${t.symbol}.`;
  setTimeout(() => { if (pendingDelete === t.id) { pendingDelete = null; $("j-msg").textContent = ""; } }, 3000);
  return false;
}

// Courbe des résultats cumulés (SVG à l'échelle).
function curve(closed) {
  let cum = 0; const pts = [0, ...closed.map((t) => (cum += pnl(t)))];
  const W = 640, H = 160, pad = 10;
  const lo = Math.min(...pts), hi = Math.max(...pts), r = hi - lo || 1;
  const x = (i) => pad + i / (pts.length - 1) * (W - pad * 2), y = (v) => H - pad - (v - lo) / r * (H - pad * 2);
  const NS = "http://www.w3.org/2000/svg";
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", `0 0 ${W} ${H}`); s.setAttribute("class", "j-svg"); s.setAttribute("role", "img"); s.setAttribute("aria-label", "Courbe des résultats cumulés");
  const color = cum >= 0 ? "var(--up)" : "var(--down)";
  s.innerHTML = `<line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line)" stroke-dasharray="4 4"/>
    <path d="M${x(0)},${y(0)} ${pts.map((v, i) => `L${x(i)},${y(v)}`).join(" ")} L${x(pts.length - 1)},${y(0)} Z" fill="${color}" opacity=".12"/>
    <polyline points="${pts.map((v, i) => `${x(i)},${y(v)}`).join(" ")}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="${x(pts.length - 1)}" cy="${y(cum)}" r="4.5" fill="${color}"/>`;
  return s;
}
