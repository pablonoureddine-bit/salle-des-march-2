// Calendrier des événements à venir :
// - annonces économiques (inflation, emploi, banques centrales…) : flux public gratuit de Forex Factory (cette semaine et la suivante) ;
// - publications de résultats des sociétés suivies : Yahoo Finance.
import fs from "node:fs";
import path from "node:path";
import { STOCKS } from "../public/universe.js";
import { nextEarningsDate } from "./yahoo-fundamentals.js";

const MOCK = process.env.MOCK === "1";
const UA = "Mozilla/5.0 (compatible; InvestZoo/1.0)";
// Le flux public limite le nombre d'appels : cache d'une heure, pause de 15 min après un échec, sauvegarde sur disque.
const DISK = path.resolve(process.env.DATA_DIR || "data", "calendar.json");
let cache = { at: 0, value: null };
let lastTry = 0;
const TTL = 60 * 60 * 1000, RETRY = 30 * 60 * 1000;
try { cache = { at: 0, value: JSON.parse(fs.readFileSync(DISK, "utf8")) }; } catch {}

// Traductions des annonces les plus fréquentes.
const FR = [
  [/^CPI m\/m/i, "Inflation (IPC) sur un mois"], [/^CPI y\/y/i, "Inflation (IPC) sur un an"], [/^Core CPI m\/m/i, "Inflation sous-jacente sur un mois"],
  [/^Core CPI y\/y/i, "Inflation sous-jacente sur un an"], [/^Core PCE Price Index/i, "Inflation PCE sous-jacente"], [/^PPI m\/m/i, "Prix à la production sur un mois"],
  [/^Non-Farm Employment Change/i, "Créations d'emplois (NFP)"], [/^Unemployment Rate/i, "Taux de chômage"], [/^Unemployment Claims/i, "Inscriptions hebdo au chômage"],
  [/^Average Hourly Earnings/i, "Salaire horaire moyen"], [/^Federal Funds Rate/i, "Décision de taux de la Fed"], [/^FOMC Statement/i, "Communiqué de la Fed"],
  [/^FOMC Press Conference/i, "Conférence de presse de la Fed"], [/^FOMC Meeting Minutes/i, "Compte rendu de la Fed"], [/^Fed Chair .* Speaks/i, "Discours du président de la Fed"],
  [/^Main Refinancing Rate/i, "Décision de taux de la BCE"], [/^Monetary Policy Statement/i, "Communiqué de politique monétaire"], [/^ECB Press Conference/i, "Conférence de presse de la BCE"],
  [/^ECB President .* Speaks/i, "Discours de la présidente de la BCE"], [/^Official Bank Rate/i, "Décision de taux de la Banque d'Angleterre"], [/^BOJ Policy Rate/i, "Décision de taux de la Banque du Japon"],
  [/^Advance GDP q\/q|^Prelim GDP q\/q|^GDP q\/q/i, "Croissance du PIB (trimestre)"], [/^Retail Sales m\/m/i, "Ventes au détail sur un mois"], [/^Core Retail Sales m\/m/i, "Ventes au détail hors auto"],
  [/^ISM Manufacturing PMI/i, "Indice ISM manufacturier"], [/^ISM Services PMI/i, "Indice ISM des services"], [/Flash Manufacturing PMI/i, "PMI manufacturier (flash)"],
  [/Flash Services PMI/i, "PMI des services (flash)"], [/^Crude Oil Inventories/i, "Stocks de pétrole US"], [/^Consumer Confidence/i, "Confiance des consommateurs"],
  [/^Prelim UoM Consumer Sentiment/i, "Moral des ménages (Michigan)"], [/^German ifo Business Climate/i, "Climat des affaires Ifo (Allemagne)"], [/^German ZEW Economic Sentiment/i, "Sentiment économique ZEW (Allemagne)"],
  [/^Trade Balance/i, "Balance commerciale"], [/^Building Permits/i, "Permis de construire"], [/^Existing Home Sales/i, "Ventes de logements anciens"], [/^New Home Sales/i, "Ventes de logements neufs"],
  [/^Bank Holiday/i, "Jour férié (marchés fermés)"],
];
const translate = (t) => { for (const [re, fr] of FR) if (re.test(t)) return fr; return t; };
const IMPACT = { High: "fort", Medium: "moyen", Low: "faible", Holiday: "férié" };
const COUNTRY_CC = { USD: "us", EUR: "eu", GBP: "gb", JPY: "jp", CHF: "ch", CAD: "ca", AUD: "au", NZD: "nz", CNY: "cn" };

async function economic() {
  const urls = ["https://nfs.faireconomy.media/ff_calendar_thisweek.json", "https://nfs.faireconomy.media/ff_calendar_nextweek.json"];
  const lists = await Promise.allSettled(urls.map(async (u) => {
    const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const text = await r.text();
    try { return JSON.parse(text); } catch { throw new Error("réponse inattendue de la source (accès limité temporairement)"); }
  }));
  const ok = lists.filter((l) => l.status === "fulfilled");
  if (!ok.length) throw new Error("source indisponible (" + (lists[0].reason?.message || "erreur") + ")");
  return ok.flatMap((l) => l.value).filter((e) => e?.date && e.impact !== "Non-Economic").map((e) => ({
    type: "eco", date: new Date(e.date).toISOString(), title: translate(e.title), original: e.title,
    country: e.country, cc: COUNTRY_CC[e.country] || null, impact: IMPACT[e.impact] || "faible",
    forecast: e.forecast || null, previous: e.previous || null, actual: e.actual || null,
  }));
}

async function earnings() {
  const out = [];
  // Un appel à la fois pour rester discret auprès de la source.
  for (const [s, n] of STOCKS.flatMap((g) => g.items)) {
    try {
      const date = await nextEarningsDate(s);
      if (date && new Date(date) > Date.now() - 86400e3 && new Date(date) < Date.now() + 60 * 86400e3)
        out.push({ type: "earnings", date, title: `Résultats de ${n}`, symbol: s, impact: "moyen" });
    } catch {}
  }
  if (!out.length) throw new Error("aucune date de résultats trouvée");
  return out;
}

// Secours si la source du calendrier ne répond pas : grandes publications américaines à leur date habituelle.
// (Règles de calendrier connues ; elles peuvent être décalées par un jour férié, d'où la mention « date habituelle ».)
function nyToUtc(y, m, d, hh, mm) {
  const probe = new Date(Date.UTC(y, m, d, 12));
  const nyHour = +new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }).format(probe);
  return new Date(Date.UTC(y, m, d, hh + (12 - nyHour), mm)).toISOString();
}
function recurring(days = 21) {
  const out = [], today = new Date();
  const ev = (y, m, d, hh, mm, title, impact) => out.push({ type: "eco", date: nyToUtc(y, m, d, hh, mm), title, country: "USD", cc: "us", impact, estimated: true });
  for (let i = 0; i <= days; i++) {
    const dt = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + i));
    const y = dt.getUTCFullYear(), m = dt.getUTCMonth(), d = dt.getUTCDate(), wd = dt.getUTCDay();
    if (wd === 0 || wd === 6) continue;
    // Rang du jour ouvré dans le mois.
    let bd = 0; for (let k = 1; k <= d; k++) { const w = new Date(Date.UTC(y, m, k)).getUTCDay(); if (w !== 0 && w !== 6) bd++; }
    if (wd === 4) ev(y, m, d, 8, 30, "Inscriptions hebdo au chômage", "moyen");
    if (wd === 3) ev(y, m, d, 10, 30, "Stocks de pétrole US", "moyen");
    if (wd === 5 && d <= 7) { ev(y, m, d, 8, 30, "Créations d'emplois (NFP)", "fort"); ev(y, m, d, 8, 30, "Taux de chômage", "fort"); }
    if (bd === 1) ev(y, m, d, 10, 0, "Indice ISM manufacturier", "fort");
    if (bd === 3) ev(y, m, d, 10, 0, "Indice ISM des services", "moyen");
  }
  return out;
}

function mock() {
  const base = new Date(); base.setUTCHours(13, 30, 0, 0);
  const add = (d, h, o) => { const t = new Date(base); t.setUTCDate(t.getUTCDate() + d); t.setUTCHours(h, 30); return { date: t.toISOString(), ...o }; };
  return [
    add(0, 13, { type: "eco", title: "Inscriptions hebdo au chômage", country: "USD", cc: "us", impact: "moyen", forecast: "221K", previous: "218K" }),
    add(1, 9, { type: "eco", title: "PMI des services (flash)", country: "EUR", cc: "eu", impact: "moyen", forecast: "50,6", previous: "50,2" }),
    add(1, 15, { type: "eco", title: "Moral des ménages (Michigan)", country: "USD", cc: "us", impact: "moyen", forecast: "51,2", previous: "50,3" }),
    add(2, 13, { type: "eco", title: "Inflation sous-jacente sur un mois", country: "USD", cc: "us", impact: "fort", forecast: "0,3 %", previous: "0,3 %" }),
    add(3, 12, { type: "eco", title: "Décision de taux de la BCE", country: "EUR", cc: "eu", impact: "fort", forecast: "2,00 %", previous: "2,00 %" }),
    add(3, 21, { type: "earnings", title: "Résultats de Nvidia (exemple)", symbol: "NVDA", impact: "moyen" }),
    add(6, 19, { type: "eco", title: "Décision de taux de la Fed", country: "USD", cc: "us", impact: "fort", forecast: "4,25 %", previous: "4,00 %" }),
  ];
}

export async function calendar() {
  if (MOCK) return { events: mock(), sources: { eco: true, earnings: true }, demo: true };
  if (cache.value && (Date.now() - cache.at < TTL || Date.now() - lastTry < RETRY)) return cache.value;
  if (Date.now() - lastTry < RETRY) return { events: [], sources: {}, errors: ["nouvel essai automatique dans quelques minutes"] };
  lastTry = Date.now();
  const [eco, earn] = await Promise.allSettled([economic(), earnings()]);
  const prev = cache.value?.events || [];
  // Si une source échoue, on garde ses derniers événements connus.
  const events = [
    ...(eco.status === "fulfilled" ? eco.value : prev.some((e) => e.type === "eco" && !e.estimated) ? prev.filter((e) => e.type === "eco") : recurring()),
    ...(earn.status === "fulfilled" ? earn.value : prev.filter((e) => e.type === "earnings")),
  ].filter((e) => new Date(e.date) > Date.now() - 6 * 3600e3).sort((a, b) => a.date.localeCompare(b.date));
  const errors = [eco.status === "rejected" ? "Annonces économiques : " + eco.reason?.message : null, earn.status === "rejected" ? "Résultats d'entreprises : " + earn.reason?.message : null].filter(Boolean);
  const value = { events, sources: { eco: eco.status === "fulfilled", earnings: earn.status === "fulfilled" }, errors, updatedAt: new Date().toISOString() };
  cache = { at: errors.length === 2 ? 0 : Date.now(), value };
  if (errors.length < 2) { try { fs.mkdirSync(path.dirname(DISK), { recursive: true }); fs.writeFileSync(DISK, JSON.stringify(value)); } catch {} }
  if (errors.length) console.error("Calendrier :", errors.join(" | "));
  return value;
}
export { recurring };
