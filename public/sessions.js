// "Bourses ouvertes maintenant" : horaires des grandes places mondiales, calculés à l'heure locale de chaque place.
// Horaires de la séance principale, du lundi au vendredi (jours fériés non pris en compte).
import { $, el } from "./util.js";

const PLACES = [
  { name: "Wellington", flag: "nz", tz: "Pacific/Auckland", open: "10:00", close: "16:45", symbol: "^NZ50" },
  { name: "Sydney", flag: "au", tz: "Australia/Sydney", open: "10:00", close: "16:00", symbol: "^AXJO" },
  { name: "Tokyo", flag: "jp", tz: "Asia/Tokyo", open: "09:00", close: "15:30", symbol: "^N225" },
  { name: "Séoul", flag: "kr", tz: "Asia/Seoul", open: "09:00", close: "15:30", symbol: "^KS11" },
  { name: "Shanghai", flag: "cn", tz: "Asia/Shanghai", open: "09:30", close: "15:00", symbol: "000001.SS" },
  { name: "Hong Kong", flag: "hk", tz: "Asia/Hong_Kong", open: "09:30", close: "16:00", symbol: "^HSI" },
  { name: "Singapour", flag: "sg", tz: "Asia/Singapore", open: "09:00", close: "17:00", symbol: "^STI" },
  { name: "Bombay", flag: "in", tz: "Asia/Kolkata", open: "09:15", close: "15:30", symbol: "^BSESN" },
  { name: "Francfort", flag: "de", tz: "Europe/Berlin", open: "09:00", close: "17:30", symbol: "^GDAXI" },
  { name: "Paris", flag: "fr", tz: "Europe/Paris", open: "09:00", close: "17:30", symbol: "^FCHI" },
  { name: "Londres", flag: "gb", tz: "Europe/London", open: "08:00", close: "16:30", symbol: "^FTSE" },
  { name: "São Paulo", flag: "br", tz: "America/Sao_Paulo", open: "10:00", close: "17:00", symbol: "^BVSP" },
  { name: "New York", flag: "us", tz: "America/New_York", open: "09:30", close: "16:00", symbol: "^GSPC" },
];

// Heure et jour de la semaine actuels dans le fuseau d'une place.
function localNow(tz) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t)?.value;
  return { day: g("weekday"), min: +g("hour") * 60 + +g("minute") };
}
const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

export function status(p) {
  const { day, min } = localNow(p.tz);
  const weekend = day === "Sat" || day === "Sun";
  const o = toMin(p.open), c = toMin(p.close);
  if (!weekend && min >= o && min < c) return { open: true, left: c - min };
  return { open: false, in: weekend ? null : min < o ? o - min : null };
}
const dur = (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`);

export function init(ctx) {
  const render = () => {
    const list = PLACES.map((p) => ({ p, s: status(p) }));
    const open = list.filter((x) => x.s.open).length;
    $("sessions").replaceChildren(
      el("span", { class: "ss-title" }, el("i", { class: "live-dot" + (open ? " on" : "") }), open ? `${open} bourse${open > 1 ? "s" : ""} ouverte${open > 1 ? "s" : ""}` : "Toutes les bourses sont fermées"),
      ...list.map(({ p, s }) => {
        const img = el("img", { src: `https://flagcdn.com/w40/${p.flag}.png`, alt: "", width: "18", height: "13", loading: "lazy" });
        img.onerror = () => img.remove();
        return el("button", { class: "ss " + (s.open ? "open" : "closed"), title: s.open ? `${p.name} : ouverte, fermeture dans ${dur(s.left)}` : `${p.name} : fermée${s.in ? `, ouverture dans ${dur(s.in)}` : ""}`, onclick: () => ctx.open(p.symbol) },
          img, el("span", null, p.name), el("small", null, s.open ? `encore ${dur(s.left)}` : s.in ? `dans ${dur(s.in)}` : "fermée"));
      }));
  };
  render();
  setInterval(render, 30000);
}
