import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chart, quotes, search, INTERVALS } from "./lib/market.js";
import { allNews, assetNews } from "./lib/news.js";
import { analyse, aiEnabled, Anthropic } from "./lib/ai.js";
import { streamHandler, broadcast } from "./lib/live.js";
import { startPredictions, snapshot as predictionsSnapshot, runCycle } from "./lib/predictions.js";
import { fundamentals, fundamentalsEnabled } from "./lib/fundamentals.js";
import { calendar } from "./lib/calendar.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "200kb" }));
app.use(express.static(path.join(here, "public"), { maxAge: "5m" }));
app.use("/vendor", express.static(path.join(here, "node_modules/lightweight-charts/dist"), { maxAge: "7d" }));

const SYMBOL = /^[\w.^=\-]{1,20}$/;
const wrap = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (e) { res.status(e.status || 502).json({ error: e.message || "Erreur" }); }
};
const bad = (msg) => Object.assign(new Error(msg), { status: 400 });

app.get("/api/config", (req, res) => res.json({ ai: aiEnabled(), fundamentals: fundamentalsEnabled(), mock: process.env.MOCK === "1", timeframes: Object.keys(INTERVALS) }));

// Flux en direct (prédictions, actus) et prédictions IA.
app.get("/api/stream", streamHandler);
app.get("/api/predictions", (req, res) => res.json(predictionsSnapshot()));
app.post("/api/predictions/run", (req, res) => {
  // Relance manuelle réservée à l'administrateur (variable ADMIN_TOKEN).
  if (!process.env.ADMIN_TOKEN || req.get("x-admin-token") !== process.env.ADMIN_TOKEN) return res.status(403).json({ error: "Accès refusé" });
  runCycle(); res.json({ ok: true });
});

// Calendrier des événements à venir.
app.get("/api/calendar", wrap(() => calendar()));

// Fiche entreprise.
app.get("/api/fundamentals", wrap(async (req) => {
  const { symbol } = req.query;
  if (!SYMBOL.test(symbol || "")) throw bad("Symbole invalide");
  return fundamentals(symbol);
}));

app.get("/api/chart", wrap(async (req) => {
  const { symbol, tf = "1d" } = req.query;
  if (!SYMBOL.test(symbol || "")) throw bad("Symbole invalide");
  return chart(symbol, tf, false);
}));

app.get("/api/live", wrap(async (req) => {
  const { symbol, tf = "1d" } = req.query;
  if (!SYMBOL.test(symbol || "")) throw bad("Symbole invalide");
  return chart(symbol, tf, true);
}));

app.get("/api/quotes", wrap(async (req) => {
  const list = String(req.query.symbols || "").split(",").filter((s) => SYMBOL.test(s)).slice(0, 80);
  return quotes(list);
}));

app.get("/api/search", wrap(async (req) => {
  const q = String(req.query.q || "").trim().slice(0, 50);
  return q.length < 1 ? [] : search(q);
}));

app.get("/api/news", wrap(() => allNews()));
app.get("/api/news/asset", wrap((req) => assetNews(String(req.query.q || ""))));

// Limite simple : 10 analyses par heure et par adresse IP (l'API Claude est payante).
const hits = new Map();
function allow(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  if (list.length >= Number(process.env.AI_LIMIT_PER_HOUR || 10)) return false;
  list.push(now); hits.set(ip, list); return true;
}

app.post("/api/analyse", async (req, res) => {
  if (!aiEnabled()) return res.status(503).json({ error: "L'analyse IA n'est pas configurée : ajoute la variable ANTHROPIC_API_KEY sur le serveur." });
  if (!allow(req.ip)) return res.status(429).json({ error: "Limite atteinte : 10 analyses par heure. Réessaie plus tard." });
  const b = req.body || {};
  if (!SYMBOL.test(b.symbol || "") || typeof b.technical !== "string") return res.status(400).json({ error: "Requête incomplète" });
  try {
    const data = await analyse({
      symbol: b.symbol, name: String(b.name || b.symbol).slice(0, 120), timeframe: String(b.timeframe || "").slice(0, 30),
      horizon: String(b.horizon || "").slice(0, 60), profil: String(b.profil || "").slice(0, 30), depth: b.depth,
      technical: b.technical.slice(0, 12000), news: Array.isArray(b.news) ? b.news.slice(0, 25) : [], notes: b.notes,
    });
    res.json(data);
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return res.status(503).json({ error: "Clé API Anthropic invalide." });
    if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ error: "L'API Claude est saturée. Réessaie dans une minute." });
    if (e instanceof Anthropic.APIError) return res.status(502).json({ error: `Erreur de l'API Claude (${e.status ?? "réseau"}).` });
    res.status(e.status || 500).json({ error: e.message || "Erreur pendant l'analyse" });
  }
});

// Actus rafraîchies en tâche de fond : les navigateurs ouverts sont prévenus des nouveaux titres.
let knownTitles = new Set();
async function refreshNews() {
  try {
    const { items } = await allNews();
    const fresh = items.filter((n) => !knownTitles.has(n.title));
    if (knownTitles.size && fresh.length) broadcast("news", { count: fresh.length, latest: fresh.slice(0, 5) });
    knownTitles = new Set(items.map((n) => n.title));
  } catch (e) { console.error("Actus :", e.message); }
}
refreshNews();
setInterval(refreshNews, 5 * 60 * 1000 + 5000);
startPredictions();

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Salle des marchés : http://localhost:${port}${process.env.MOCK === "1" ? " (données fictives)" : ""}`));
