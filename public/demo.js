// Compte démo : 10 000 € fictifs pour s'entraîner à acheter et vendre aux vrais cours, sans risque.
// Tout est enregistré dans le navigateur. Les montants sont convertis en euros avec les taux de change du moment.
import { $, el, api, store, fmt, pct, ago, spark } from "./util.js";
import { KNOWN } from "./universe.js";
import { assetVisual } from "./visuals.js";
import { burst } from "./fx.js";
import { notify } from "./notify.js";

const START = 10000;
// Montants en euros : toujours deux décimales.
const eur = (v) => (v == null || !isFinite(v) ? "—" : v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €");
const fresh = () => ({ cash: START, positions: {}, history: [], curve: [[Date.now(), START]], created: Date.now() });
let A = store.get("sdm.demo", null) || fresh();
const save = () => store.set("sdm.demo", A);
let ctx, prices = new Map(), fx = { EUR: 1 }, timer = null, lastMilestone = null;

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
const toEur = (amount, cur) => amount * (fx[cur || "EUR"] ?? fx.USD ?? 1);

// ───── Valeur du compte ─────
function valueOf(sym) { const p = A.positions[sym]; const q = prices.get(sym); return p ? toEur(p.qty * (q?.price ?? p.lastPrice ?? p.avg), p.currency) : 0; }
export function totals() {
  const invested = Object.keys(A.positions).reduce((a, s) => a + valueOf(s), 0);
  const total = A.cash + invested;
  return { total, invested, cash: A.cash, gain: total - START, gainPct: total / START - 1 };
}

export function init(c) {
  ctx = c;
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-demo-reset]"); if (b) reset(b); });
}

export function show() {
  render(); refresh();
  clearInterval(timer);
  timer = setInterval(() => { if ($("view-compte").hidden || document.hidden) return; refresh(); }, 5000);
}

async function refresh() {
  const syms = [...new Set([...Object.keys(A.positions), ...FX_PAIRS])];
  try {
    const res = await api("/api/quotes?symbols=" + encodeURIComponent(syms.join(",")));
    const m = new Map(res.filter((q) => q.price != null).map((q) => [q.symbol, q]));
    updateFx(m);
    for (const [s, q] of m) {
      const before = prices.get(s)?.price;
      prices.set(s, q);
      const p = A.positions[s];
      if (p) { p.lastPrice = q.price; if (q.currency) p.currency = q.currency; p.moved = before != null && q.price !== before ? (q.price > before ? "up" : "down") : null; }
    }
  } catch {}
  const t = totals();
  // Courbe de la valeur du compte (un point par minute au plus).
  const last = A.curve.at(-1);
  // Un point par minute, ou tout de suite si la valeur a nettement bougé (achat, vente, gros mouvement).
  if (!last || Date.now() - last[0] > 60e3 || Math.abs(t.total - last[1]) > START * 0.001) { A.curve.push([Date.now(), Math.round(t.total * 100) / 100]); A.curve = A.curve.slice(-720); }
  // Paliers : +1 %, +2 %… ou −1 %, −2 %… sur le compte.
  const step = Math.trunc(t.gainPct * 100);
  if (lastMilestone != null && step !== lastMilestone && Object.keys(A.positions).length) {
    burst(step > lastMilestone ? "gain" : "loss", { anchor: $("demo-total"), size: "big", text: pct(t.gainPct) });
  }
  lastMilestone = step;
  save(); render();
}

// ───── Achat / vente ─────
export function buyForm({ symbol, name, price, currency }) {
  if (!price) return;
  const modal = el("div", { class: "modal-bg", onclick: (e) => e.target === modal && modal.remove() });
  const amount = el("input", { type: "number", min: "1", step: "any", id: "dm-amount", value: Math.min(1000, Math.floor(A.cash)) });
  const info = el("p", { class: "muted small" });
  const upd = () => {
    const amt = parseFloat(amount.value) || 0, unit = toEur(price, currency);
    info.textContent = amt > A.cash ? `Il te reste seulement ${eur(A.cash)} disponibles.` : `≈ ${(amt / unit).toLocaleString("fr-FR", { maximumFractionDigits: 6 })} unité(s) à ${fmt(price)} ${currency || ""} · reste ${eur(A.cash - amt)}`;
  };
  amount.addEventListener("input", upd);
  modal.append(el("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "dm-title" },
    el("div", { class: "eyebrow" }, "Compte démo · argent fictif"),
    el("h2", { id: "dm-title" }, `Acheter ${name}`),
    el("p", null, `Cours actuel : `, el("b", null, `${fmt(price)} ${currency || ""}`), `. Disponible : `, el("b", null, eur(A.cash))),
    el("label", { class: "dm-amount" }, "Montant à investir (€)", amount),
    el("div", { class: "dm-quick" }, [100, 500, 1000, 2500].map((v) => el("button", { type: "button", onclick: () => { amount.value = Math.min(v, Math.floor(A.cash)); upd(); } }, v.toLocaleString("fr-FR") + " €")),
      el("button", { type: "button", onclick: () => { amount.value = Math.floor(A.cash * 100) / 100; upd(); } }, "Tout")),
    info,
    el("div", { class: "modal-actions" },
      el("button", { onclick: () => modal.remove() }, "Annuler"),
      el("button", { class: "primary", onclick: () => {
        const amt = parseFloat(amount.value);
        if (!(amt > 0) || amt > A.cash + 0.001) { amount.focus(); info.textContent = "Montant invalide ou supérieur à ton solde."; return; }
        const unit = toEur(price, currency), qty = amt / unit;
        const p = A.positions[symbol] || { qty: 0, avg: 0, name, currency, since: Date.now() };
        p.avg = (p.avg * p.qty + price * qty) / (p.qty + qty); p.qty += qty; p.lastPrice = price; p.currency = currency;
        A.positions[symbol] = p; A.cash -= amt;
        A.history.unshift({ t: Date.now(), symbol, name, side: "achat", qty, price, eur: amt });
        prices.set(symbol, { ...(prices.get(symbol) || {}), symbol, price, currency });
        A.curve.push([Date.now(), totals().total]);
        save(); modal.remove();
        burst("gain", { size: "small", text: `−${eur(amt)}` });
        notify({ title: `Achat (démo) : ${name}`, body: `${eur(amt)} investis à ${fmt(price)} ${currency || ""}`, kind: "info", symbol, popup: true });
        if (!$("view-compte").hidden) render();
      } }, "Acheter"))));
  document.body.append(modal); upd(); amount.focus();
}

function sell(symbol, fraction, btn) {
  const p = A.positions[symbol]; if (!p) return;
  const price = prices.get(symbol)?.price ?? p.lastPrice;
  const qty = p.qty * fraction, amt = toEur(qty * price, p.currency), cost = toEur(qty * p.avg, p.currency);
  const gain = amt - cost;
  A.cash += amt; p.qty -= qty;
  if (p.qty < 1e-9 || fraction >= 1) delete A.positions[symbol];
  A.history.unshift({ t: Date.now(), symbol, name: p.name, side: "vente", qty, price, eur: amt, gain });
  A.curve.push([Date.now(), totals().total]);
  save();
  burst(gain >= 0 ? "gain" : "loss", { anchor: btn, size: "big", text: (gain >= 0 ? "+" : "") + eur(gain) });
  notify({ title: gain >= 0 ? `Vente gagnante : ${p.name}` : `Vente en perte : ${p.name}`, body: `${gain >= 0 ? "+" : ""}${eur(gain)} (${pct(amt / cost - 1)})`, kind: gain >= 0 ? "gain" : "loss", popup: true });
  render();
}

let pendingReset = 0;
function reset(btn) {
  if (Date.now() - pendingReset > 4000) { pendingReset = Date.now(); btn.textContent = "Clique encore pour confirmer"; setTimeout(() => (btn.textContent = "Recommencer avec 10 000 €"), 4000); return; }
  A = fresh(); save(); prices.clear(); lastMilestone = null; render();
  notify({ title: "Compte démo remis à zéro", body: "Tu repars avec 10 000 € fictifs.", kind: "info" });
}

// ───── Affichage ─────
function render() {
  const t = totals(), up = t.gain >= 0;
  const pos = Object.entries(A.positions);
  const curve = A.curve.map((c) => c[1]);
  $("demo-hero").replaceChildren(
    el("div", { class: "dh-main" },
      el("div", { class: "eyebrow" }, "Valeur de ton compte démo"),
      el("div", { class: "dh-total mono", id: "demo-total" }, eur(t.total)),
      el("div", { class: "dh-gain " + (up ? "up" : "down") }, `${up ? "▲ +" : "▼ "}${eur(t.gain)} (${pct(t.gainPct)}) depuis le départ`),
      el("div", { class: "dh-split" }, el("span", null, "Investi ", el("b", { class: "mono" }, eur(t.invested))), el("span", null, "Disponible ", el("b", { class: "mono" }, eur(t.cash))))),
    curve.length > 1 ? el("div", { class: "dh-curve" }, spark(curve, 320, 90)) : el("div", { class: "dh-curve dh-empty" }, "La courbe de ton compte apparaîtra ici."));
  $("demo-positions").replaceChildren(...(pos.length ? pos.map(([s, p]) => {
    const q = prices.get(s), price = q?.price ?? p.lastPrice ?? p.avg;
    const val = toEur(p.qty * price, p.currency), cost = toEur(p.qty * p.avg, p.currency), g = val - cost;
    const row = el("div", { class: "dp-row" + (p.moved ? " tick-" + p.moved : "") },
      el("button", { class: "linklike dp-id", onclick: () => ctx.open(s, p.name) }, assetVisual(s, p.name, 38), el("div", null, el("b", null, p.name), el("small", null, `${p.qty.toLocaleString("fr-FR", { maximumFractionDigits: 6 })} à ${fmt(p.avg)} ${p.currency || ""}`))),
      el("div", { class: "dp-val" }, el("b", { class: "mono" }, eur(val)), el("small", { class: "mono" }, `cours ${fmt(price)}`)),
      el("div", { class: "dp-gain mono " + (g >= 0 ? "up" : "down") }, `${g >= 0 ? "+" : ""}${eur(g)}`, el("small", null, pct(cost ? val / cost - 1 : 0))),
      el("div", { class: "dp-act" },
        el("button", { class: "btn-soft", onclick: (e) => sell(s, 0.5, e.currentTarget) }, "Vendre ½"),
        el("button", { class: "btn-soft", onclick: (e) => sell(s, 1, e.currentTarget) }, "Tout vendre")));
    p.moved = null;
    return row;
  }) : [el("div", { class: "dp-empty" },
    el("p", null, el("b", null, "Ton portefeuille est vide."), " Choisis un actif dans l'onglet Marchés et clique sur « Acheter (démo) »."),
    el("div", { class: "dp-ideas" }, [["^FCHI", "CAC 40"], ["^GSPC", "S&P 500"], ["BTC-USD", "Bitcoin"], ["GC=F", "Or"], ["AAPL", "Apple"], ["MC.PA", "LVMH"]].map(([s, n]) =>
      el("button", { class: "dp-idea", onclick: () => ctx.open(s, n) }, assetVisual(s, n, 28), n))))]));
  $("demo-history").replaceChildren(...(A.history.length ? A.history.slice(0, 30).map((h) => el("li", null,
    el("span", { class: "pill " + (h.side === "achat" ? "flat" : h.gain >= 0 ? "up" : "down") }, h.side === "achat" ? "Achat" : "Vente"),
    el("span", null, el("b", null, h.name), el("small", null, ` ${eur(h.eur)} à ${fmt(h.price)} · ${ago(new Date(h.t).toISOString())}`)),
    h.side === "vente" ? el("span", { class: "mono " + (h.gain >= 0 ? "up" : "down") }, `${h.gain >= 0 ? "+" : ""}${eur(h.gain)}`) : el("span"))) : [el("li", { class: "muted" }, "Aucune opération pour l'instant.")]));
}
