// Ton des titres d'actualité (positif / négatif) par mots-clés, en français et en anglais.
// Simple et transparent : sert au modèle de prédiction gratuit, sans IA.
const POS = [
  "hausse", "rebond", "rebondit", "bondit", "grimpe", "s'envole", "record", "progresse", "gagne", "optimisme", "accord", "relève", "dépasse",
  "solide", "croissance", "embellie", "reprise", "soutien", "baisse des taux", "assouplissement", "meilleur que prévu", "supérieur aux attentes",
  "surge", "rally", "rallies", "gains", "rises", "jumps", "soars", "upgrade", "beats", "strong", "boost", "record high", "optimism", "rate cut",
];
const NEG = [
  "baisse", "chute", "recule", "plonge", "perd", "inquiétude", "crainte", "récession", "sanction", "avertissement", "abaisse", "déçoit",
  "décroche", "dégringole", "repli", "tension", "guerre", "faillite", "licenciement", "hausse des taux", "resserrement", "inférieur aux attentes",
  "moins bon que prévu", "falls", "drops", "slump", "plunge", "fears", "downgrade", "warning", "cuts", "selloff", "sell-off", "loses", "slides",
  "tumbles", "weak", "rate hike", "outflows", "sorties",
];
// "hausse des taux" est négatif pour les actions : on retire "hausse" quand l'expression complète est présente.
export function tone(title) {
  const t = " " + String(title).toLowerCase() + " ";
  const hits = { pos: [], neg: [] };
  for (const w of NEG) if (t.includes(w)) hits.neg.push(w);
  for (const w of POS) if (t.includes(w) && !hits.neg.some((n) => n.includes(w))) hits.pos.push(w);
  const score = hits.pos.length - hits.neg.length;
  return { score: Math.max(-1, Math.min(1, score / 2)), words: [...hits.pos, ...hits.neg] };
}

export function newsTone(items) {
  const scored = items.map((n) => ({ ...n, tone: tone(n.title) }));
  const used = scored.filter((n) => n.tone.score !== 0);
  const avg = used.length ? used.reduce((a, n) => a + n.tone.score, 0) / used.length : 0;
  return { avg, scored, used };
}
