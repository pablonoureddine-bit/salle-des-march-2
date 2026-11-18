// Actualités financières : titres + liens uniquement (jamais le contenu des articles).
// Les sources passent par la recherche RSS de Google News, filtrée par site.
// Ce format est stable et identique pour tous les journaux.
import { XMLParser } from "fast-xml-parser";
import { mockNews } from "./mock.js";

const MOCK = process.env.MOCK === "1";
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@" });

export const SOURCES = [
  { id: "boursorama", label: "Boursorama", query: "site:boursorama.com bourse" },
  { id: "bfm", label: "BFM Business", query: "site:bfmtv.com économie OR bourse" },
  { id: "bloomberg", label: "Bloomberg", query: "site:bloomberg.com markets", lang: "en" },
  { id: "lesechos", label: "Les Échos", query: "site:lesechos.fr marchés" },
  { id: "zonebourse", label: "Zonebourse", query: "site:zonebourse.com" },
  { id: "investing", label: "Investing.com", query: "site:fr.investing.com" },
  { id: "lefigaro", label: "Le Figaro Bourse", query: "site:lefigaro.fr bourse" },
  { id: "reuters", label: "Reuters", query: "site:reuters.com markets", lang: "en" },
];

const cache = new Map();
const TTL = 5 * 60 * 1000;

function gnewsUrl(query, lang = "fr") {
  const loc = lang === "en" ? "hl=en-US&gl=US&ceid=US:en" : "hl=fr&gl=FR&ceid=FR:fr";
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query + " when:3d")}&${loc}`;
}

function clean(s) {
  return String(s ?? "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").trim();
}

async function fetchFeed(url, fallbackSource) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; SalleDesMarches/1.0)" }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = parser.parse(await res.text());
  let items = xml?.rss?.channel?.item ?? xml?.feed?.entry ?? [];
  if (!Array.isArray(items)) items = [items];
  return items.map((it) => {
    const src = typeof it.source === "object" ? clean(it.source["#text"]) : clean(it.source);
    let title = clean(typeof it.title === "object" ? it.title["#text"] : it.title);
    // Google News ajoute " - Nom du journal" à la fin du titre.
    if (src && title.endsWith(" - " + src)) title = title.slice(0, -(src.length + 3));
    const link = typeof it.link === "object" ? it.link["@href"] : it.link;
    const date = it.pubDate || it.published || it.updated;
    return { title, link: String(link || ""), source: src || fallbackSource, date: date ? new Date(date).toISOString() : null };
  }).filter((x) => x.title && x.link.startsWith("http"));
}

async function cachedFeed(key, url, label) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit;
  try {
    const items = MOCK ? mockNews(label) : await fetchFeed(url, label);
    const entry = { at: Date.now(), ok: true, items };
    cache.set(key, entry);
    return entry;
  } catch (e) {
    // On garde les anciens titres si la source tombe temporairement.
    const entry = { at: Date.now(), ok: false, error: e.message, items: hit?.items ?? [] };
    cache.set(key, entry);
    return entry;
  }
}

export async function allNews() {
  const results = await Promise.all(SOURCES.map(async (s) => {
    const r = await cachedFeed("src:" + s.id, gnewsUrl(s.query, s.lang), s.label);
    return { source: s, ...r };
  }));
  const items = results.flatMap((r) => r.items.slice(0, 25).map((it) => ({ ...it, source: r.source.label, sourceId: r.source.id })));
  return {
    items: dedupe(items).sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    status: results.map((r) => ({ id: r.source.id, label: r.source.label, ok: r.ok, count: r.items.length, error: r.error || null })),
  };
}

// Actus liées à un actif : recherche Google News sur son nom.
export async function assetNews(name) {
  const q = String(name || "").slice(0, 80);
  if (!q) return { items: [] };
  const r = await cachedFeed("asset:" + q.toLowerCase(), gnewsUrl(`"${q}" bourse OR cours OR marché`), "Google News");
  return { ok: r.ok, items: dedupe(r.items).slice(0, 30) };
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((it) => {
    const k = it.title.toLowerCase().replace(/\W+/g, " ").slice(0, 90);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
