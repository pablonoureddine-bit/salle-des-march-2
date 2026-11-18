// Compte démo : 10 000 € fictifs pour s'entraîner aux vrais cours, sans risque.
// Chaque position a un sens (achat = on gagne si ça monte, vente = on gagne si ça baisse), un volume,
// et peut avoir un stop loss et un take profit qui se déclenchent automatiquement.
// Tout est enregistré dans le navigateur ; les montants sont convertis en euros au taux du moment.
import { $, el, api, store, fmt, pct, ago, spark, tween } from "./util.js";
import { assetVisual } from "./visuals.js";
import { burst } from "./fx.js";
import { notify } from "./notify.js";

export const START = 10000;
export const eur = (v) => (v == null || !isFinite(v) ? "—" : v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €");
const fresh = () => ({ v: 2, cash: START, positions: [], history: [], curve: [[Date.now(), START]], created: Date.now() });

let A = store.get("sdm.demo", null);
// Reprise d'un ancien compte (positions regroupées par actif) dans le nouveau format.
if (!A || A.v !== 2) {
  const old = A; A = fresh();
  if (old?.positions && !Array.isArray(old.positions)) {
    A.cash = old.cash ?? START; A.history = old.history || []; A.curve = old.curve?.length ? old.curve : A.curve;
    for (const [s, p] of Object.entries(old.positions)) A.positions.push({ id: s + Date.now(), symbol: s, name: p.name, side: "achat", qty: p.qty, entry: p.avg, amount: p.qty * p.avg, currency: p.currency || "EUR", sl: null, tp: null, opened: p.since || Date.now() });
  }
}
const save = () => store.set("sdm.demo", A);
const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
const changed = () => { save(); listeners.forEach((fn) => fn()); };

let ctx, prices = new Map(), fx = { EUR: 1 }, lastMilestone = null;

// ───── Conversion en euros ─────
const FX_PAIRS = ["EURUSD=X", "GBPUSD=X", "USDJPY=X", "USDCHF=X", "USDCAD=X", "AUDUSD=X", "USDCNY=X"];
function updateFx(q) {
  const g = (s) => q.get(s)?.price;
  const eurusd = g("EURUSD=X"); if (!eurusd) return;
  fx.USD = 1 / eurusd;
  if (g("GBPUSD=X")) { fx.GBP = g("GBPUSD=X") / eurusd; fx.GBp = fx.GBP / 100; }
  if (g("USDJPY=X")) fx.JPY = 1 / (g("USDJPY=X") * eurusd);
  if (g("USDCHF=X")) fx.CHF = 1 / (g("USDCHF=X") * eurusd);
  if (g("USDCAD=X")) fx.CAD = 1 / (g("USDCAD=X") * eurusd);
  if (g("AUDUSD=X")) fx.AUD = g("AUDUSD=X") / eurusd;
  if (g("USDCNY=X")) fx.CNY = 1 / (g("USDCNY=X") * eurusd);
}
export const toEur = (amount, cur) => amount * (fx[cur || "EUR"] ?? fx.USD ?? 1);
export const priceOf = (s) => prices.get(s)?.price;
// live = prix venant du graphique en direct : il reste prioritaire 15 s sur les relevés périodiques.
export function setPrice(symbol, price, currency, live = false) {
  if (price == null) return;
  const p = prices.get(symbol) || {};
  if (!live && p.live && Date.now() - p.at < 15000) return;
  prices.set(symbol, { ...p, symbol, price, currency: currency || p.currency, live, at: Date.now() });
}

// ───── Calculs ─────
export function pnl(p, price = priceOf(p.symbol) ?? p.last ?? p.entry) {
  return toEur((price - p.entry) * p.qty * (p.side === "vente" ? -1 : 1), p.currency);
}
export function totals() {
  const open = A.positions.reduce((a, p) => a + p.amount + pnl(p), 0);
  const total = A.cash + open;
  return { total, invested: open, cash: A.cash, gain: total - START, gainPct: total / START - 1, count: A.positions.length };
}
export const positions = (symbol) => (symbol ? A.positions.filter((p) => p.symbol === symbol) : A.positions);
export const cash = () => A.cash;

// Gain ou perte en euros si le prix atteint un niveau donné.
export function outcomeAt({ side, qty, entry, currency }, level) {
  if (!level) return null;
  return toEur((level - entry) * qty * (side === "vente" ? -1 : 1), currency);
}

// ───── Ouverture et clôture ─────
export function open({ symbol, name, side, amount, price, currency, sl, tp }) {
  if (!(amount > 0) || amount > A.cash + 0.001) throw new Error("Montant invalide ou supérieur à ton solde disponible.");
  if (!(price > 0)) throw new Error("Cours indisponible pour le moment.");
  if (side === "achat") {
    if (sl && sl >= price) throw new Error("À l'achat, le stop loss doit être SOUS le cours actuel.");
    if (tp && tp <= price) throw new Error("À l'achat, le take profit doit être AU-DESSUS du cours actuel.");
  } else {
    if (sl && sl <= price) throw new Error("À la vente, le stop loss doit être AU-DESSUS du cours actuel.");
    if (tp && tp >= price) throw new Error("À la vente, le take profit doit être SOUS le cours actuel.");
  }
  const qty = amount / toEur(price, currency);
  const p = { id: `${symbol}-${Date.now()}`, symbol, name, side, qty, entry: price, last: price, amount, currency, sl: sl || null, tp: tp || null, opened: Date.now() };
  A.positions.unshift(p); A.cash -= amount;
  setPrice(symbol, price, currency, true);
  A.history.unshift({ t: Date.now(), symbol, name, side, kind: "ouverture", qty, price, eur: amount });
  A.curve.push([Date.now(), totals().total]);
  changed();
  notify({ title: `${side === "achat" ? "Achat" : "Vente"} (démo) : ${name}`, body: `${eur(amount)} · volume ${qty.toLocaleString("fr-FR", { maximumFractionDigits: 6 })} à ${fmt(price)}${sl ? ` · stop ${fmt(sl)}` : ""}${tp ? ` · objectif ${fmt(tp)}` : ""}`, kind: "info", symbol, popup: true });
  return p;
}

export function close(id, { fraction = 1, reason = "manuelle", anchor = null } = {}) {
  const p = A.positions.find((x) => x.id === id); if (!p) return;
  const price = priceOf(p.symbol) ?? p.last;
  const part = Math.min(1, fraction);
  const gain = pnl(p, price) * part, back = p.amount * part + gain;
  A.cash += back;
  if (part >= 0.999) A.positions = A.positions.filter((x) => x.id !== id);
  else { p.qty *= 1 - part; p.amount *= 1 - part; }
  A.history.unshift({ t: Date.now(), symbol: p.symbol, name: p.name, side: p.side, kind: reason, price, eur: back, gain });
  A.curve.push([Date.now(), totals().total]);
  changed();
  const why = reason === "stop" ? "Stop loss touché" : reason === "objectif" ? "Take profit atteint" : "Position clôturée";
  burst(gain >= 0 ? "gain" : "loss", { anchor, size: "big", text: (gain >= 0 ? "+" : "") + eur(gain) });
  notify({ title: `${why} : ${p.name}`, body: `${gain >= 0 ? "Gain" : "Perte"} de ${eur(Math.abs(gain))} (${pct(gain / (p.amount * part || 1))})`, kind: gain >= 0 ? "gain" : "loss", symbol: p.symbol, popup: true, own: reason !== "manuelle", browser: reason !== "manuelle" });
}

let pendingReset = 0;
function reset(btn) {
  if (Date.now() - pendingReset > 4000) { pendingReset = Date.now(); btn.textContent = "Clique encore pour confirmer"; setTimeout(() => (btn.textContent = "Recommencer avec 10 000 €"), 4000); return; }
  A = fresh(); prices.clear(); lastMilestone = null; changed();
  notify({ title: "Compte démo remis à zéro", body: "Tu repars avec 10 000 € fictifs.", kind: "info" });
}

// ───── Suivi des prix : stop loss / take profit automatiques ─────
export async function refresh() {
  const syms = [...new Set([...A.positions.map((p) => p.symbol), ...FX_PAIRS])];
  try {
    const res = await api("/api/quotes?symbols=" + encodeURIComponent(syms.join(",")));
    const m = new Map(res.filter((q) => q.price != null).map((q) => [q.symbol, q]));
    updateFx(m);
    for (const [s, q] of m) setPrice(s, q.price, q.currency);
  } catch {}
  checkTriggers();
  const t = totals();
  const last = A.curve.at(-1);
  if (!last || Date.now() - last[0] > 60e3 || Math.abs(t.total - last[1]) > START * 0.001) { A.curve.push([Date.now(), Math.round(t.total * 100) / 100]); A.curve = A.curve.slice(-720); }
  const step = Math.trunc(t.gainPct * 100);
  if (lastMilestone != null && step !== lastMilestone && A.positions.length && !$("view-compte").hidden) burst(step > lastMilestone ? "gain" : "loss", { anchor: $("demo-total"), size: "big", text: pct(t.gainPct) });
  lastMilestone = step;
  changed();
}

export function checkTriggers() {
  for (const p of [...A.positions]) {
    const price = priceOf(p.symbol); if (price == null) continue;
    p.last = price;
    const buy = p.side === "achat";
    if (p.sl && (buy ? price <= p.sl : price >= p.sl)) close(p.id, { reason: "stop" });
    else if (p.tp && (buy ? price >= p.tp : price <= p.tp)) close(p.id, { reason: "objectif" });
  }
}

export function init(c) {
  ctx = c;
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-demo-reset]"); if (b) reset(b); });
  // Surveillance permanente des positions ouvertes, même hors de l'onglet Compte.
  setInterval(() => { if (!document.hidden && A.positions.length) refresh(); }, 5000);
  onChange(() => { if (!$("view-compte").hidden) render(); });
  refresh();
}

export function show() { render(); refresh(); }

// ───── Affichage de l'onglet Compte ─────
function render() {
  const t = totals(), up = t.gain >= 0;
  const curve = A.curve.map((c) => c[1]);
  let totalEl = document.getElementById("demo-total");
  if (!totalEl) {
    $("demo-hero").replaceChildren(
      el("div", { class: "dh-main" },
        el("div", { class: "eyebrow" }, "Valeur de ton compte démo"),
        totalEl = el("div", { class: "dh-total mono", id: "demo-total" }),
        el("div", { class: "dh-gain", id: "demo-gain" }),
        el("div", { class: "dh-split", id: "demo-split" }),
        el("button", { class: "primary dh-cta", onclick: () => (location.hash = "trader") }, "Acheter ou vendre")),
      el("div", { class: "dh-curve", id: "demo-curve" }));
  }
  tween(totalEl, t.total, eur);
  $("demo-gain").className = "dh-gain " + (up ? "up" : "down");
  $("demo-gain").textContent = `${up ? "▲ +" : "▼ "}${eur(t.gain)} (${pct(t.gainPct)}) depuis le départ`;
  $("demo-split").replaceChildren(el("span", null, "Investi ", el("b", { class: "mono" }, eur(t.invested))), el("span", null, "Disponible ", el("b", { class: "mono" }, eur(t.cash))), el("span", null, "Positions ", el("b", { class: "mono" }, String(t.count))));
  $("demo-curve").replaceChildren(curve.length > 1 ? spark(curve, 320, 90) : el("div", { class: "dh-empty" }, "La courbe de ton compte apparaîtra ici."));

  $("demo-positions").replaceChildren(...(A.positions.length ? A.positions.map(positionRow) : [el("div", { class: "dp-empty" },
    el("p", null, el("b", null, "Aucune position ouverte."), " Va dans l'onglet ", el("a", { href: "#trader" }, "Trader"), " pour acheter ou vendre en quelques clics."))]));
  $("demo-history").replaceChildren(...(A.history.length ? A.history.slice(0, 40).map((h) => el("li", null,
    el("span", { class: "pill " + (h.kind === "ouverture" || h.kind == null ? "flat" : h.gain >= 0 ? "up" : "down") }, h.kind === "ouverture" || h.kind == null ? (h.side === "vente" ? "Vente" : "Achat") : h.kind === "stop" ? "Stop" : h.kind === "objectif" ? "Objectif" : "Clôture"),
    el("span", null, el("b", null, h.name), el("small", null, ` ${eur(h.eur)} à ${fmt(h.price)} · ${ago(new Date(h.t).toISOString())}`)),
    h.gain != null ? el("span", { class: "mono " + (h.gain >= 0 ? "up" : "down") }, `${h.gain >= 0 ? "+" : ""}${eur(h.gain)}`) : el("span"))) : [el("li", { class: "muted" }, "Aucune opération pour l'instant.")]));
}

export function positionRow(p) {
  const price = priceOf(p.symbol) ?? p.last ?? p.entry, g = pnl(p, price);
  return el("div", { class: "dp-row" },
    el("button", { class: "linklike dp-id", onclick: () => ctx.trade(p.symbol, p.name) }, assetVisual(p.symbol, p.name, 38),
      el("div", null, el("b", null, p.name), el("small", null, el("span", { class: "pill " + (p.side === "achat" ? "up" : "down") }, p.side === "achat" ? "Achat" : "Vente"), ` volume ${p.qty.toLocaleString("fr-FR", { maximumFractionDigits: 6 })} à ${fmt(p.entry)}`))),
    el("div", { class: "dp-val" }, el("b", { class: "mono" }, fmt(price)), el("small", null, [p.sl ? `stop ${fmt(p.sl)}` : null, p.tp ? `objectif ${fmt(p.tp)}` : null].filter(Boolean).join(" · ") || "sans stop ni objectif")),
    el("div", { class: "dp-gain mono " + (g >= 0 ? "up" : "down") }, `${g >= 0 ? "+" : ""}${eur(g)}`, el("small", null, pct(g / p.amount))),
    el("div", { class: "dp-act" },
      el("button", { class: "btn-soft", onclick: (e) => close(p.id, { fraction: 0.5, anchor: e.currentTarget }) }, "Clôturer ½"),
      el("button", { class: "btn-soft", onclick: (e) => close(p.id, { anchor: e.currentTarget }) }, "Clôturer")));
}

// Ligne compacte d'une position, avec son résultat en direct et un bouton pour la clôturer.
// Utilisée sur la page d'accueil, sous le cours d'un actif et dans le graphique plein écran.
export function miniRow(p, { showName = true } = {}) {
  const g = pnl(p);
  return el("div", { class: "pos-mini " + (g >= 0 ? "pos-up" : "pos-down") },
    showName ? el("button", { class: "linklike pm-id", onclick: () => ctx.open(p.symbol, p.name) }, assetVisual(p.symbol, p.name, 26), el("b", null, p.name)) : null,
    el("span", { class: "pill " + (p.side === "achat" ? "up" : "down") }, p.side === "achat" ? "Achat" : "Vente"),
    el("span", { class: "pm-amt mono" }, eur(p.amount)),
    el("b", { class: "pm-gain mono " + (g >= 0 ? "up" : "down") }, `${g >= 0 ? "+" : ""}${eur(g)}`),
    el("button", { class: "pm-close", title: "Clôturer cette position", onclick: (e) => close(p.id, { anchor: e.currentTarget }) }, "Clôturer"));
}
