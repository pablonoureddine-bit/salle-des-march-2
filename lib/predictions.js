// Moteur de prédictions en continu.
// À intervalle régulier, pour chaque actif suivi : cours + indicateurs + dernières actus → Claude → prédiction.
// Une prédiction n'est régénérée que si les actus ou le prix ont vraiment changé (pour limiter le coût de l'API).
// Chaque prédiction est notée après coup (bonne ou mauvaise direction) pour afficher un taux de réussite honnête.
import fs from "node:fs";
import path from "node:path";
import { chart } from "./market.js";
import { assetNews, allNews } from "./news.js";
import { askJson, aiEnabled } from "./ai.js";
import { broadcast } from "./live.js";
import { newsTone } from "./sentiment.js";
import * as TA from "../public/indicators.js";
import { KNOWN, PRED_DEFAULT, assetClass } from "../public/universe.js";

const MOCK = process.env.MOCK === "1";
const DATA_FILE = path.resolve(process.env.DATA_DIR || "data", "predictions.json");
const SYMBOLS = (process.env.PRED_SYMBOLS || PRED_DEFAULT.join(",")).split(",").map((s) => s.trim()).filter(Boolean);
// Sans clé Claude, le modèle gratuit (indicateurs + ton des actus) tourne plus souvent : il ne coûte rien.
const INTERVAL_MIN = Number(process.env.PRED_INTERVAL_MIN || (aiEnabled() ? 60 : 15));
const useClaude = () => aiEnabled() && !MOCK;
const MAX_AGE_H = Number(process.env.PRED_MAX_AGE_H || 6);
const EVAL_DAYS = 7; // une prédiction "1 à 5 séances" est jugée au bout de 7 jours calendaires

let db = { current: {}, history: [], lastRun: null, nextRun: null, running: false };
try { db = { ...db, ...JSON.parse(fs.readFileSync(DATA_FILE, "utf8")), running: false }; } catch {}

function save() {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify({ current: db.current, history: db.history.slice(-2000), lastRun: db.lastRun }));
  } catch (e) { console.error("Sauvegarde des prédictions impossible :", e.message); }
}

const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);

function prompt({ symbol, name, A, news, general }) {
  const n = A.n;
  const list = news.map((x, i) => `[${i + 1}] (${x.source}, ${x.date ? x.date.slice(0, 16).replace("T", " ") : "date inconnue"}) ${x.title}`).join("\n");
  const gen = general.map((x, i) => `[G${i + 1}] (${x.source}) ${x.title}`).join("\n");
  return `Tu es un analyste de marché. Produis une prédiction courte et mesurée pour ${name} (${symbol}) à horizon 1 à 5 séances.
Date : ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC.

Données techniques (bougies journalières) :
Cours ${A.last} · MM20 ${A.m20[n]?.toFixed(4)} · MM50 ${A.m50[n]?.toFixed(4)} · MM200 ${A.m200[n]?.toFixed(4)}
RSI14 ${A.r[n]?.toFixed(1)} · MACD hist ${A.md.hist[n]?.toFixed(4)} · ATR14 ${A.atrNow?.toFixed(4)}
Ichimoku : nuage actuel ${A.ich.cloudNow.a?.toFixed(4)} / ${A.ich.cloudNow.b?.toFixed(4)}
Score technique ${A.score}/100 · Supports ${A.sup.map((s) => s.level.toFixed(4)).join(", ") || "—"} · Résistances ${A.res.map((s) => s.level.toFixed(4)).join(", ") || "—"}
Performances : ${A.perf.map((p) => `${p.lbl} ${p.v?.toFixed(2)} %`).join(", ")}

Titres d'actualité sur l'actif :
${list || "Aucun."}

Titres généraux des marchés :
${gen || "Aucun."}

Règles : n'utilise que ces données ; les titres ne sont que des titres, n'en invente pas le contenu. La probabilité de hausse doit rester modeste (entre 25 et 75) sauf signal exceptionnel. Les objectifs doivent rester cohérents avec l'ATR (en général moins de 3 ATR). Cite comme catalyseurs uniquement des numéros de titres réellement pertinents.
Réponds UNIQUEMENT avec ce JSON :
{"direction":"hausse|baisse|neutre","probabilite_hausse":0-100,"confiance":0-100,"objectif_haut":0,"objectif_bas":0,"invalidation":0,"resume":"2 phrases maximum","catalyseurs":[{"titre":1,"effet":"positif|négatif|neutre","pourquoi":"une phrase"}],"risques":["..."]}`;
}

// Modèle gratuit : 70 % score technique, 30 % ton des actus. Transparent et sans appel payant.
function algoPrediction(A, news) {
  const t = newsTone(news);
  const base = (A.score / 100) * 0.7 + t.avg * 0.3;
  const probUp = Math.round(50 + base * 30);
  const direction = base > 0.15 ? "hausse" : base < -0.15 ? "baisse" : "neutre";
  const techTxt = A.score >= 15 ? "les indicateurs techniques penchent à la hausse" : A.score <= -15 ? "les indicateurs techniques penchent à la baisse" : "les indicateurs techniques sont partagés";
  const newsTxt = !t.used.length ? "les actus récentes n'ont pas de ton marqué" : t.avg > 0.1 ? "le ton des actus récentes est plutôt positif" : t.avg < -0.1 ? "le ton des actus récentes est plutôt négatif" : "le ton des actus est mitigé";
  return {
    direction, probabilite_hausse: probUp, confiance: Math.round(30 + Math.abs(base) * 40),
    objectif_haut: A.last + 1.5 * A.atrNow, objectif_bas: A.last - 1.5 * A.atrNow,
    invalidation: direction === "baisse" ? A.last + 2 * A.atrNow : A.last - 2 * A.atrNow,
    resume: `Score technique de ${A.score}/100 : ${techTxt}, et ${newsTxt}. Prévision calculée par le modèle automatique.`,
    catalyseurs: t.used.slice(0, 3).map((n) => ({ titre: t.scored.indexOf(n) + 1, effet: n.tone.score > 0 ? "positif" : "négatif", pourquoi: "Mots-clés : " + n.tone.words.slice(0, 3).join(", ") })),
    risques: ["Modèle automatique simple : il ne comprend pas le sens des articles, seulement leurs mots-clés.", `Volatilité moyenne (ATR) : ${A.atrNow.toFixed(2)} par séance.`],
  };
}

// quick = calcul immédiat avec le modèle gratuit (au démarrage du serveur), Claude prend le relais ensuite.
async function predictOne(symbol, { quick = false } = {}) {
  const name = KNOWN.get(symbol) || symbol;
  const { bars, meta } = await chart(symbol, "1d", false);
  if (bars.length < 60) throw new Error("historique insuffisant");
  const A = TA.analyse(bars, "1d");
  const [an, gn] = await Promise.all([assetNews(name), allNews()]);
  const news = (an.items || []).slice(0, 12);
  const general = (gn.items || []).slice(0, 8);
  const prev = db.current[symbol];
  const sig = hash(news.map((x) => x.title).join("|") + "|" + Math.round(A.last / Math.max(A.atrNow * 0.5, 1e-9)));
  const fresh = prev && Date.now() - new Date(prev.createdAt) < MAX_AGE_H * 3600e3;
  const upgrade = !quick && useClaude() && prev?.model === "algo";
  if (prev && prev.signature === sig && fresh && !upgrade) {
    prev.checkedAt = new Date().toISOString(); prev.price = A.last;
    return null; // rien de neuf : pas d'appel à l'API
  }
  // Si Claude ne répond pas (clé refusée, crédit épuisé…), on bascule sur le modèle gratuit pour cet actif.
  let model = useClaude() && !quick ? "claude" : "algo", raw;
  if (model === "claude") {
    try { raw = await askJson(prompt({ symbol, name, A, news, general }), { effort: process.env.PRED_EFFORT || "low", model: process.env.PRED_MODEL || undefined, maxTokens: 8000 }); }
    catch (e) { console.error(`Claude indisponible pour ${symbol} :`, e.message); model = "algo"; }
  }
  if (model === "algo") raw = algoPrediction(A, news);
  const p = {
    id: `${symbol}-${Date.now()}`, symbol, name, assetClass: assetClass(symbol), currency: meta.currency,
    createdAt: new Date().toISOString(), checkedAt: new Date().toISOString(), horizon: "1 à 5 séances",
    priceAtPrediction: A.last, price: A.last, atr: A.atrNow, technicalScore: A.score, signature: sig,
    direction: ["hausse", "baisse", "neutre"].includes(raw.direction) ? raw.direction : "neutre",
    probUp: clamp(+raw.probabilite_hausse, 0, 100, 50), confidence: clamp(+raw.confiance, 0, 100, 50),
    targetHigh: finite(raw.objectif_haut), targetLow: finite(raw.objectif_bas), invalidation: finite(raw.invalidation),
    summary: String(raw.resume || "").slice(0, 600),
    catalysts: (Array.isArray(raw.catalyseurs) ? raw.catalyseurs : []).slice(0, 4).map((c) => {
      const item = news[(parseInt(c.titre, 10) || 0) - 1];
      return item ? { title: item.title, source: item.source, link: item.link, date: item.date, effect: c.effet, why: String(c.pourquoi || "").slice(0, 300) } : null;
    }).filter(Boolean),
    risks: (Array.isArray(raw.risques) ? raw.risques : []).slice(0, 4).map((r) => String(r).slice(0, 300)),
    demo: MOCK, model,
  };
  db.current[symbol] = p;
  db.history.push({ id: p.id, symbol, name, createdAt: p.createdAt, direction: p.direction, probUp: p.probUp, priceAtPrediction: p.priceAtPrediction, atr: p.atr, outcome: null });
  return p;
}

const clamp = (v, lo, hi, d) => Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
const finite = (v) => { const n = +v; return Number.isFinite(n) && n > 0 ? n : null; };

// Juge les prédictions arrivées à échéance : la direction annoncée s'est-elle produite ?
function evaluate() {
  const now = Date.now();
  for (const h of db.history) {
    if (h.outcome || now - new Date(h.createdAt) < EVAL_DAYS * 86400e3) continue;
    const cur = db.current[h.symbol]?.price;
    if (!cur) continue;
    const move = cur - h.priceAtPrediction, band = (h.atr || 0) * 1;
    const actual = move > band ? "hausse" : move < -band ? "baisse" : "neutre";
    h.outcome = { actual, correct: actual === h.direction, priceAtEval: cur, evaluatedAt: new Date().toISOString(), movePct: move / h.priceAtPrediction * 100 };
  }
}

export function stats() {
  const done = db.history.filter((h) => h.outcome);
  const by = {};
  for (const h of done) { const s = (by[h.symbol] ||= { total: 0, correct: 0 }); s.total++; if (h.outcome.correct) s.correct++; }
  return { total: done.length, correct: done.filter((h) => h.outcome.correct).length, pending: db.history.length - done.length, bySymbol: by };
}

export function snapshot() {
  return {
    enabled: true, demo: MOCK, model: useClaude() ? "claude" : "algo", symbols: SYMBOLS, intervalMin: INTERVAL_MIN,
    lastRun: db.lastRun, nextRun: db.nextRun, running: db.running,
    predictions: SYMBOLS.map((s) => db.current[s]).filter(Boolean),
    stats: stats(),
    recent: db.history.filter((h) => h.outcome).slice(-30).reverse(),
  };
}

export async function runCycle() {
  if (db.running) return;
  db.running = true;
  broadcast("predictions", { status: "running" });
  const updated = [];
  for (const s of SYMBOLS) {
    try {
      const p = await predictOne(s);
      if (p) { updated.push(p.symbol); broadcast("predictions", { status: "update", prediction: p }); }
    } catch (e) { console.error(`Prédiction ${s} :`, e.message); }
  }
  evaluate();
  db.lastRun = new Date().toISOString();
  db.nextRun = new Date(Date.now() + INTERVAL_MIN * 60e3).toISOString();
  db.running = false;
  save();
  broadcast("predictions", { status: "done", updated, lastRun: db.lastRun, nextRun: db.nextRun });
}

// Premier passage rapide : une prédiction gratuite pour chaque actif qui n'en a pas encore, 4 à la fois.
async function quickPass() {
  const todo = SYMBOLS.filter((s) => !db.current[s]);
  for (let i = 0; i < todo.length; i += 4) {
    await Promise.all(todo.slice(i, i + 4).map(async (s) => {
      try { const p = await predictOne(s, { quick: true }); if (p) broadcast("predictions", { status: "update", prediction: p }); }
      catch (e) { console.error(`Prédiction rapide ${s} :`, e.message); }
    }));
  }
  if (todo.length) { db.lastRun = new Date().toISOString(); save(); }
}

export function startPredictions() {
  db.nextRun = new Date(Date.now() + 20000).toISOString();
  setTimeout(() => quickPass().finally(() => setTimeout(runCycle, 5000)), 1000);
  setInterval(runCycle, INTERVAL_MIN * 60e3);
  console.log(`Prédictions (${useClaude() ? "Claude" : "modèle gratuit"}) : ${SYMBOLS.length} actifs, toutes les ${INTERVAL_MIN} min.`);
}
