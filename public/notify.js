// Notifications : centre de notifications (cloche), pop-ups, notifications du navigateur et alertes de prix.
import { $, el, store, fmt, ago } from "./util.js";
import { fxEnabled, setFx, burst } from "./fx.js";

let items = store.get("sdm.notifs", []);
let alerts = store.get("sdm.alerts", []);
let unread = store.get("sdm.unread", 0);
let openSymbol = null;
const save = () => { store.set("sdm.notifs", items.slice(0, 60)); store.set("sdm.unread", unread); };
const KIND_ICON = { gain: "▲", loss: "▼", news: "✦", prediction: "◎", alert: "🔔", calendar: "◷", info: "i" };

export function init({ open }) {
  openSymbol = open;
  renderBadge();
  $("bell").addEventListener("click", (e) => { e.stopPropagation(); togglePanel(); });
  document.addEventListener("click", (e) => { if (!e.target.closest("#notif-panel, #bell")) $("notif-panel").hidden = true; });
  // Première visite : pop-up de bienvenue.
  if (!store.get("sdm.welcomed", false)) setTimeout(welcome, 1200);
}

function renderBadge() {
  $("bell-count").textContent = unread > 9 ? "9+" : String(unread);
  $("bell-count").hidden = !unread;
}

function togglePanel() {
  const p = $("notif-panel");
  p.hidden = !p.hidden;
  if (p.hidden) return;
  unread = 0; save(); renderBadge();
  renderPanel();
}

function renderPanel() {
  const perm = "Notification" in window ? Notification.permission : "unsupported";
  $("notif-panel").replaceChildren(
    el("div", { class: "np-head" }, el("b", null, "Notifications"), items.length ? el("button", { class: "linkbtn", onclick: () => { items = []; save(); renderPanel(); } }, "Tout effacer") : null),
    el("div", { class: "np-settings" },
      el("label", { class: "switch" }, el("input", { type: "checkbox", id: "set-fx", checked: fxEnabled() ? "" : null, onchange: (e) => setFx(e.target.checked) }), el("span", null, "Animations de gain et de perte")),
      perm === "default" ? el("button", { class: "btn-soft", onclick: async () => { await Notification.requestPermission(); renderPanel(); } }, "Recevoir les notifications même quand l'onglet est fermé")
        : perm === "granted" ? el("small", { class: "muted" }, "Notifications du navigateur activées.") : null),
    alerts.length ? el("div", { class: "np-alerts" }, el("div", { class: "eyebrow" }, "Mes alertes de prix"),
      ...alerts.map((a, i) => el("div", { class: "np-alert" }, el("span", null, `${a.name} ${a.dir === "above" ? "au-dessus de" : "en dessous de"} ${fmt(a.level)}`),
        el("button", { class: "linkbtn", onclick: () => { alerts.splice(i, 1); store.set("sdm.alerts", alerts); renderPanel(); } }, "Supprimer")))) : null,
    items.length ? el("ul", { class: "np-list" }, items.map((n) => el("li", { class: "np-item k-" + n.kind },
      el("span", { class: "np-ico" }, KIND_ICON[n.kind] || "•"),
      el("div", null, el("b", null, n.title), n.body ? el("p", null, n.body) : null, el("small", null, ago(n.at))),
      n.symbol ? el("button", { class: "linkbtn", onclick: () => { $("notif-panel").hidden = true; openSymbol(n.symbol); } }, "Voir") : null)))
      : el("p", { class: "muted np-empty" }, "Aucune notification pour l'instant. Tu seras prévenu des nouvelles prédictions, des actus importantes et de tes alertes de prix."));
}

// Notification : ajoutée au centre, affichée en pop-up, et envoyée au navigateur si l'onglet est en arrière-plan.
export function notify({ title, body = "", kind = "info", symbol = null, popup = true, browser = false }) {
  items.unshift({ title, body, kind, symbol, at: new Date().toISOString() });
  if ($("notif-panel").hidden) unread++;
  save(); renderBadge();
  if (!$("notif-panel").hidden) renderPanel();
  if (popup) showPopup({ title, body, kind, symbol });
  if (browser && document.hidden && "Notification" in window && Notification.permission === "granted") {
    try { new Notification(title, { body, tag: kind + (symbol || "") }); } catch {}
  }
}

function showPopup({ title, body, kind, symbol }) {
  const stack = $("popups");
  const card = el("div", { class: "popup k-" + kind, role: "status" },
    el("span", { class: "np-ico" }, KIND_ICON[kind] || "•"),
    el("div", null, el("b", null, title), body ? el("p", null, body) : null),
    el("div", { class: "popup-actions" },
      symbol ? el("button", { class: "linkbtn", onclick: () => { close(); openSymbol(symbol); } }, "Voir") : null,
      el("button", { class: "linkbtn", "aria-label": "Fermer", onclick: () => close() }, "✕")));
  const close = () => { card.classList.add("out"); setTimeout(() => card.remove(), 250); };
  stack.prepend(card);
  while (stack.children.length > 3) stack.lastChild.remove();
  setTimeout(close, 7000);
}

// ───── Alertes de prix ─────
export function alertForm({ symbol, name, price }) {
  const modal = el("div", { class: "modal-bg", onclick: (e) => e.target === modal && modal.remove() });
  const lvl = el("input", { type: "number", step: "any", id: "al-level", value: +(price * 1.02).toPrecision(6) });
  const dirSel = el("select", { id: "al-dir", onchange: (e) => { lvl.value = +(price * (e.target.value === "above" ? 1.02 : 0.98)).toPrecision(6); } },
    el("option", { value: "above" }, "passe au-dessus de"), el("option", { value: "below" }, "passe en dessous de"));
  modal.append(el("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "al-title" },
    el("h2", { id: "al-title" }, "Créer une alerte de prix"),
    el("p", { class: "muted" }, `${name} cote actuellement ${fmt(price)}. Tu recevras une notification dès que le cours franchit ton niveau.`),
    el("div", { class: "modal-row" }, el("span", null, "Prévenir si le cours"), dirSel, lvl),
    el("div", { class: "modal-actions" },
      el("button", { onclick: () => modal.remove() }, "Annuler"),
      el("button", { class: "primary", onclick: () => {
        const level = parseFloat(lvl.value);
        if (!(level > 0)) { lvl.focus(); return; }
        alerts.push({ symbol, name, dir: dirSel.value, level, created: Date.now() });
        store.set("sdm.alerts", alerts);
        modal.remove();
        notify({ title: "Alerte créée", body: `${name} ${dirSel.value === "above" ? "au-dessus de" : "en dessous de"} ${fmt(level)}`, kind: "alert", symbol });
        if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
      } }, "Créer l'alerte"))));
  document.body.append(modal);
  lvl.focus();
}

export const alertSymbols = () => [...new Set(alerts.map((a) => a.symbol))];

// Vérifie les alertes avec le dernier cours connu ; une alerte déclenchée est retirée.
export function checkAlerts(symbol, price, anchor) {
  if (price == null) return;
  const hit = alerts.filter((a) => a.symbol === symbol && (a.dir === "above" ? price >= a.level : price <= a.level));
  if (!hit.length) return;
  alerts = alerts.filter((a) => !hit.includes(a));
  store.set("sdm.alerts", alerts);
  for (const a of hit) {
    notify({ title: `Alerte : ${a.name} ${a.dir === "above" ? "au-dessus de" : "en dessous de"} ${fmt(a.level)}`, body: `Cours actuel : ${fmt(price)}`, kind: "alert", symbol, browser: true });
    burst(a.dir === "above" ? "gain" : "loss", { anchor, size: "big", text: fmt(price) });
  }
}

function welcome() {
  store.set("sdm.welcomed", true);
  const modal = el("div", { class: "modal-bg", onclick: (e) => e.target === modal && modal.remove() });
  modal.append(el("div", { class: "modal welcome", role: "dialog", "aria-modal": "true", "aria-labelledby": "wl-title" },
    el("div", { class: "eyebrow" }, "Ta salle des marchés"),
    el("h2", { id: "wl-title" }, "Bienvenue sur Invest Zoo"),
    el("ul", null,
      el("li", null, el("b", null, "Marchés : "), "choisis une famille (indices, actions, crypto…) puis un actif pour voir son graphique et son analyse."),
      el("li", null, el("b", null, "Prédictions : "), "les prévisions à 1–5 séances, mises à jour en continu, avec leur taux de réussite."),
      el("li", null, el("b", null, "Calendrier : "), "les annonces économiques et résultats d'entreprises à venir."),
      el("li", null, el("b", null, "Journal : "), "note tes trades et suis tes performances."),
      el("li", null, el("b", null, "La cloche 🔔 : "), "tes notifications et alertes de prix.")),
    el("div", { class: "modal-actions" }, el("button", { class: "primary", onclick: () => modal.remove() }, "C'est parti"))));
  document.body.append(modal);
}
