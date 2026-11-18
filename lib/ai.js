// Analyses d'anticipation générées par Claude (API Anthropic).
// Nécessite la variable d'environnement ANTHROPIC_API_KEY sur le serveur.
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
let client = null;

export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

const FORMAT = `Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de cette forme :
{"biais":"haussier|neutre|baissier","confiance":0-100,"resume":"3 à 4 phrases",
"lecture_technique":["..."],"lecture_actus":["..."],
"scenarios":[{"nom":"Haussier","probabilite":30,"declencheur":"...","objectif":123.4,"description":"..."},{"nom":"Central",...},{"nom":"Baissier",...}],
"niveaux":{"supports":[123.4],"resistances":[123.4],"invalidation":123.4},
"plan":{"approche":"...","entree":"...","stop":"...","objectifs":"...","ratio":"..."},
"risques":["..."],"a_surveiller":["..."]}`;

export function buildPrompt(p) {
  const news = (p.news || []).slice(0, 25).map((n) => `- [${n.source}${n.date ? ", " + n.date.slice(0, 16).replace("T", " ") : ""}] ${n.title}`).join("\n");
  return `Tu es un analyste de marché expérimenté. Rédige en français une analyse d'anticipation pour un trader particulier.
Actif : ${p.name} (${p.symbol}). Unité de temps du graphique : ${p.timeframe}. Horizon demandé : ${p.horizon}. Profil de risque : ${p.profil}.
Date et heure de la demande : ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC.

Règles :
- Appuie-toi UNIQUEMENT sur les données ci-dessous. N'invente ni cours, ni actualité, ni chiffre.
- Croise la lecture technique et les titres d'actualité. Les titres ne sont que des titres : n'en déduis pas de détails que tu ne vois pas. Dis-le quand l'actualité fournie a peu de rapport avec l'actif.
- Donne trois scénarios (haussier, central, baissier) dont les probabilités font 100 au total. Pour chacun : un déclencheur concret et observable sur le graphique ou dans l'actualité, et un objectif chiffré cohérent avec les niveaux et l'ATR (null si tu ne peux pas le chiffrer).
- La confiance doit refléter le désaccord entre les signaux. Reste mesuré.
- Ton pédagogique et direct, phrases courtes. Explique brièvement les termes techniques quand tu les utilises.

## Données techniques calculées
${p.technical}

## Titres d'actualité récents (sources : ${[...new Set((p.news || []).map((n) => n.source))].join(", ") || "aucune"})
${news || "Aucun titre disponible."}

## Notes macro de l'utilisateur
${String(p.notes || "").slice(0, 4000) || "Aucune."}

${FORMAT}`;
}

function parseJson(text) {
  try { return JSON.parse(text); } catch {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch {} }
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a >= 0 && b > a) return JSON.parse(text.slice(a, b + 1));
  throw new Error("Réponse non lisible");
}

export async function analyse(payload) {
  const stream = getClient().beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: payload.depth === "approfondie" ? "high" : "medium" },
    messages: [{ role: "user", content: buildPrompt(payload) }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") {
    const err = new Error("Claude n'a pas pu traiter cette demande.");
    err.status = 422;
    throw err;
  }
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return parseJson(text);
}

export { Anthropic };
