// Animations de gain et de perte (particules sur un canevas plein écran).
// Respecte "réduire les animations" du système et le réglage de l'utilisateur.
import { store } from "./util.js";

let canvas, ctx2d, parts = [], raf = null;
const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
export const fxEnabled = () => store.get("sdm.fx", true) && !reduced();
export const setFx = (on) => store.set("sdm.fx", on);

function ensure() {
  if (canvas) return;
  canvas = document.createElement("canvas");
  canvas.className = "fx-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);
  ctx2d = canvas.getContext("2d");
  const size = () => { const r = devicePixelRatio || 1; canvas.width = innerWidth * r; canvas.height = innerHeight * r; ctx2d.setTransform(r, 0, 0, r, 0, 0); };
  size(); addEventListener("resize", size);
}

function loop() {
  ctx2d.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.life > 0);
  for (const p of parts) {
    p.life -= 1; p.x += p.vx; p.y += p.vy; p.vy += p.g; p.rot += p.vr;
    ctx2d.save(); ctx2d.globalAlpha = Math.min(1, p.life / 30); ctx2d.translate(p.x, p.y); ctx2d.rotate(p.rot); ctx2d.fillStyle = p.color;
    if (p.shape === "coin") { ctx2d.beginPath(); ctx2d.ellipse(0, 0, p.r, p.r * Math.abs(Math.cos(p.rot * 2)) + 1, 0, 0, Math.PI * 2); ctx2d.fill(); }
    else if (p.shape === "tri") { ctx2d.beginPath(); ctx2d.moveTo(0, -p.r); ctx2d.lineTo(p.r, p.r); ctx2d.lineTo(-p.r, p.r); ctx2d.fill(); }
    else if (p.shape === "drop") { ctx2d.beginPath(); ctx2d.moveTo(0, -p.r * 1.6); ctx2d.quadraticCurveTo(p.r, 0, 0, p.r); ctx2d.quadraticCurveTo(-p.r, 0, 0, -p.r * 1.6); ctx2d.fill(); }
    else ctx2d.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
    ctx2d.restore();
  }
  raf = parts.length ? requestAnimationFrame(loop) : (ctx2d.clearRect(0, 0, innerWidth, innerHeight), null);
}

const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function origin(anchor) {
  const r = anchor?.getBoundingClientRect?.();
  const visible = r && r.width && r.bottom > 100 && r.top < innerHeight - 20;
  return visible ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2.5 };
}

function floatLabel(text, kind, at) {
  const t = document.createElement("div");
  t.className = "fx-label " + kind; t.textContent = text;
  t.style.left = at.x + "px"; t.style.top = at.y + "px";
  document.body.append(t);
  setTimeout(() => t.remove(), 1600);
}

// kind : "gain" ou "loss" ; size : "small" (tick de prix) ou "big" (événement marquant)
export function burst(kind, { anchor, text, size = "small" } = {}) {
  if (!fxEnabled()) return;
  ensure();
  const at = origin(anchor);
  const n = size === "big" ? 90 : 16;
  const up = kind === "gain";
  const colors = up ? [css("--up"), css("--accent"), "#7EE2B8"] : [css("--down"), "#FF9A9A", "#8A2A35"];
  for (let i = 0; i < n; i++) {
    const a = up ? (-Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9) : (Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6);
    const sp = (size === "big" ? 5 : 2.6) * (0.5 + Math.random());
    parts.push({
      x: at.x + (Math.random() - 0.5) * 20, y: at.y, vx: Math.cos(a) * sp, vy: up ? Math.sin(a) * sp * 1.4 : Math.sin(a) * sp * 0.4 + 0.5,
      g: up ? 0.12 : 0.18, r: size === "big" ? 4 + Math.random() * 4 : 2.5 + Math.random() * 2,
      color: colors[i % colors.length], shape: up ? (i % 3 === 0 ? "coin" : i % 3 === 1 ? "tri" : "rect") : (i % 2 ? "drop" : "rect"),
      rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, life: size === "big" ? 90 + Math.random() * 40 : 45 + Math.random() * 20,
    });
  }
  if (text) floatLabel(text, kind, at);
  if (!up && anchor) { anchor.classList.remove("fx-shake"); void anchor.offsetWidth; anchor.classList.add("fx-shake"); }
  if (up && anchor) { anchor.classList.remove("fx-pop"); void anchor.offsetWidth; anchor.classList.add("fx-pop"); }
  if (!raf) raf = requestAnimationFrame(loop);
}
