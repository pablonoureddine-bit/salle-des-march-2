// Calendrier des événements à venir :
// - annonces économiques (inflation, emploi, banques centrales…) : flux public gratuit de Forex Factory (cette semaine et la suivante) ;
// - publications de résultats des sociétés suivies : Yahoo Finance.
import { STOCKS } from "../public/universe.js";

const MOCK = process.env.MOCK === "1";
const UA = "Mozilla/5.0 (compatible; SalleDesMarches/1.0)";
let cache = { at: 0, value: null };
const TTL = 60 * 60 * 1000;

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
    return r.json();
  }));
  const ok = lists.filter((l) => l.status === "fulfilled");
  if (!ok.length) throw new Error("calendrier économique indisponible");
  return ok.flatMap((l) => l.value).filter((e) => e?.date && e.impact !== "Non-Economic").map((e) => ({
    type: "eco", date: new Date(e.date).toISOString(), title: translate(e.title), original: e.title,
    country: e.country, cc: COUNTRY_CC[e.country] || null, impact: IMPACT[e.impact] || "faible",
    forecast: e.forecast || null, previous: e.previous || null, actual: e.actual || null,
  }));
}

async function earnings() {
  const symbols = STOCKS.flatMap((g) => g.items);
  const out = await Promise.allSettled(symbols.map(async ([s, n]) => {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=1d&interval=1d&events=earnings`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const d = await r.json();
    const ts = d?.chart?.result?.[0]?.meta?.earningsTimestamp ?? d?.chart?.result?.[0]?.meta?.earningsTimestampStart;
    if (!ts || ts * 1000 < Date.now() - 86400e3) return null;
    return { type: "earnings", date: new Date(ts * 1000).toISOString(), title: `Résultats de ${n}`, symbol: s, impact: "moyen" };
  }));
  return out.filter((x) => x.status === "fulfilled" && x.value).map((x) => x.value);
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
  if (cache.value && Date.now() - cache.at < TTL) return cache.value;
  const [eco, earn] = await Promise.allSettled([economic(), earnings()]);
  const events = [...(eco.status === "fulfilled" ? eco.value : []), ...(earn.status === "fulfilled" ? earn.value : [])]
    .filter((e) => new Date(e.date) > Date.now() - 6 * 3600e3)
    .sort((a, b) => a.date.localeCompare(b.date));
  const value = { events, sources: { eco: eco.status === "fulfilled", earnings: earn.status === "fulfilled" } };
  if (events.length) cache = { at: Date.now(), value };
  return value;
}
