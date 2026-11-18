// Outils partagés par toutes les vues.
export const $ = (id) => document.getElementById(id);

export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const dec = (v) => { const a = Math.abs(v); return a >= 10 ? 2 : a >= 1 ? 4 : 6; };
export const fmt = (v) => v == null || !isFinite(v) ? "—" : v.toLocaleString("fr-FR", { minimumFractionDigits: dec(v), maximumFractionDigits: dec(v) });
export const pct = (v) => v == null || !isFinite(v) ? "—" : (v > 0 ? "+" : "") + (v * 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " %";
export const pctAbs = (v) => (v * 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " %";
export const dir = (v) => v > 0 ? "up" : v < 0 ? "down" : "flat";

// Grands montants : 1,23 Md, 456 M.
export function big(v, cur = "") {
  if (v == null || !isFinite(v)) return "—";
  const a = Math.abs(v), s = cur ? " " + cur : "";
  if (a >= 1e12) return (v / 1e12).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " T" + s;
  if (a >= 1e9) return (v / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " Md" + s;
  if (a >= 1e6) return (v / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " M" + s;
  return v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + s;
}

export const ago = (iso) => {
  if (!iso) return "";
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

export function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "style") e.style.cssText = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k instanceof Node ? k : String(k));
  return e;
}

export async function api(path, opts) {
  const res = await fetch(path, opts);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || `Erreur ${res.status}`), { status: res.status });
  return body;
}

// Mini-courbe SVG (sparkline) à partir d'une liste de prix.
export function spark(values, w = 110, h = 30) {
  const v = values.filter((x) => x != null && isFinite(x));
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`); svg.setAttribute("width", w); svg.setAttribute("height", h); svg.setAttribute("aria-hidden", "true");
  if (v.length < 2) return svg;
  const lo = Math.min(...v), hi = Math.max(...v), r = hi - lo || 1;
  const pts = v.map((x, i) => `${(i / (v.length - 1) * (w - 2) + 1).toFixed(1)},${(h - 2 - (x - lo) / r * (h - 4)).toFixed(1)}`).join(" ");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  p.setAttribute("points", pts); p.setAttribute("fill", "none"); p.setAttribute("stroke-width", "1.5");
  p.setAttribute("stroke", v.at(-1) >= v[0] ? "var(--up)" : "var(--down)");
  svg.append(p);
  return svg;
}

// Flux d'événements en direct envoyés par le serveur (prédictions, actus).
const listeners = {};
export function onLive(type, fn) { (listeners[type] ||= []).push(fn); }
export function connectLive() {
  if (!window.EventSource) return;
  const es = new EventSource("/api/stream");
  for (const type of ["predictions", "news"]) es.addEventListener(type, (e) => {
    let data; try { data = JSON.parse(e.data); } catch { return; }
    (listeners[type] || []).forEach((fn) => fn(data));
  });
}

let toastTimer;
export function toast(msg) {
  let t = document.getElementById("toast");
  if (!t) { t = el("div", { id: "toast", class: "toast", role: "status" }); document.body.append(t); }
  t.textContent = msg; t.classList.add("on");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("on"), 4000);
}
