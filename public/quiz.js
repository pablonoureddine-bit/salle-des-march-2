// Académie ludique : quiz par leçon, points d'expérience (XP), niveaux, badges et mini-jeu "Devine la suite".
import { el, store, api, fmt, pct } from "./util.js";
import { burst } from "./fx.js";
import { notify } from "./notify.js";

// ───── Questions (une à trois par leçon) ─────
export const QUIZ = {
  marche: [
    { q: "Le spread, c'est…", a: ["L'écart entre le prix acheteur et le prix vendeur", "La commission du courtier", "La variation du jour"], ok: 0, why: "C'est un coût caché payé à chaque aller-retour." },
    { q: "Un actif qui varie souvent de 3 % par jour est…", a: ["Peu liquide", "Volatil", "Défensif"], ok: 1, why: "La volatilité mesure l'amplitude habituelle des mouvements." },
  ],
  chandeliers: [
    { q: "Une bougie dont l'ouverture et la clôture sont presque égales s'appelle…", a: ["Un marteau", "Un doji", "Un avalement"], ok: 1, why: "Le doji traduit l'indécision." },
    { q: "Une longue mèche basse après une baisse indique plutôt…", a: ["Un rejet des prix bas", "Une accélération de la baisse", "Rien du tout"], ok: 0, why: "Les vendeurs ont poussé, mais les acheteurs ont repris la main." },
  ],
  tendance: [
    { q: "Une tendance haussière, c'est…", a: ["Des sommets et des creux de plus en plus hauts", "Un prix au-dessus de 100", "Trois bougies vertes d'affilée"], ok: 0, why: "C'est la définition de base d'une tendance." },
    { q: "Une résistance franchie nettement devient souvent…", a: ["Une nouvelle résistance", "Un support", "Inutile"], ok: 1, why: "C'est le changement de polarité." },
  ],
  ordres: [
    { q: "Quel ordre coupe automatiquement une perte ?", a: ["L'ordre à cours limité", "Le stop loss", "Le take profit"], ok: 1, why: "Le stop se déclenche quand un seuil de perte est touché." },
    { q: "Un ordre à cours limité garantit…", a: ["Le prix, pas l'exécution", "L'exécution, pas le prix", "Les deux"], ok: 0, why: "Il ne s'exécute qu'à ton prix ou mieux, s'il est atteint." },
  ],
  risque: [
    { q: "Capital 5 000 €, risque 1 %, entrée 20 €, stop 18 €. Combien d'actions ?", a: ["25", "50", "250"], ok: 0, why: "Risque 50 € ÷ 2 € par action = 25 actions." },
    { q: "Avec un rapport gain/risque de 2, pour rester gagnant il faut avoir raison…", a: ["Plus d'une fois sur deux", "Plus d'une fois sur trois", "Toujours"], ok: 1, why: "Une victoire rapporte deux pertes : un tiers de réussite suffit à l'équilibre." },
  ],
  psycho: [
    { q: "Reprendre une grosse position juste après une perte pour « se refaire », c'est…", a: ["Du revenge trading", "Une bonne gestion", "Du scalping"], ok: 0, why: "C'est l'une des erreurs les plus coûteuses." },
  ],
  mm: [
    { q: "La « croix dorée », c'est quand…", a: ["La MM50 passe au-dessus de la MM200", "Le prix touche la MM20", "La MM200 monte"], ok: 0, why: "C'est un signal haussier, souvent tardif." },
    { q: "Les moyennes mobiles marchent mal…", a: ["En tendance", "En range (marché sans direction)", "Le lundi"], ok: 1, why: "En range, elles donnent beaucoup de faux signaux." },
  ],
  rsi: [
    { q: "Un RSI au-dessus de 70 signifie…", a: ["Qu'il faut vendre tout de suite", "Que le mouvement est fort, peut-être excessif", "Que l'actif est bon marché"], ok: 1, why: "En forte tendance, le RSI peut rester longtemps au-dessus de 70." },
    { q: "Le prix fait un nouveau sommet, mais le RSI un sommet plus bas : c'est…", a: ["Une divergence", "Une croix dorée", "Un gap"], ok: 0, why: "L'élan s'essouffle." },
  ],
  macd: [
    { q: "Le MACD est l'écart entre…", a: ["Deux moyennes exponentielles", "Le plus haut et le plus bas", "Le cours et le volume"], ok: 0, why: "Par défaut, les moyennes à 12 et 26 périodes." },
  ],
  bollinger: [
    { q: "Des bandes de Bollinger très resserrées annoncent souvent…", a: ["Un mouvement fort à venir", "Une baisse certaine", "La fin de la bourse"], ok: 0, why: "C'est le « squeeze » ; la direction reste inconnue." },
  ],
  fibonacci: [
    { q: "Quel retracement est surnommé le « nombre d'or » ?", a: ["38,2 %", "50 %", "61,8 %"], ok: 2, why: "0,618 est le rapport vers lequel tend la suite de Fibonacci." },
    { q: "Le niveau 50 % fait-il partie de la suite de Fibonacci ?", a: ["Oui", "Non, mais il est très surveillé"], ok: 1, why: "C'est une convention de marché." },
  ],
  ichimoku: [
    { q: "Dans Ichimoku, le prix au-dessus du nuage indique…", a: ["Un biais haussier", "Un biais baissier", "Une indécision"], ok: 0, why: "Dans le nuage, c'est l'indécision." },
    { q: "La Chikou Span est…", a: ["Le cours de clôture décalé dans le passé", "Une moyenne à 200", "Le volume"], ok: 0, why: "Elle est décalée de 26 bougies en arrière." },
  ],
  stochastique: [
    { q: "Le stochastique compare la clôture à…", a: ["La fourchette des 14 dernières bougies", "La moyenne à 200", "L'indice de référence"], ok: 0, why: "100 % = au plus haut, 0 % = au plus bas." },
  ],
  atr: [
    { q: "L'ATR indique…", a: ["La direction du marché", "L'amplitude moyenne des mouvements", "Le volume"], ok: 1, why: "Il sert surtout à placer son stop hors du « bruit »." },
  ],
  volume: [
    { q: "Une cassure de résistance est plus crédible…", a: ["Avec un fort volume", "Avec un volume faible", "Le volume ne compte pas"], ok: 0, why: "Le volume mesure la conviction." },
  ],
  "indices-intro": [
    { q: "Le Dow Jones est pondéré…", a: ["Par la capitalisation", "Par le prix des actions", "À parts égales"], ok: 1, why: "Une action chère pèse plus, quelle que soit la taille de l'entreprise." },
  ],
  cac40: [
    { q: "Combien de valeurs compte le CAC 40 ?", a: ["30", "40", "50"], ok: 1, why: "Son nom le dit !" },
    { q: "Quel est le poids maximum d'une valeur dans le CAC 40 ?", a: ["10 %", "15 %", "Il n'y a pas de limite"], ok: 1, why: "Un plafond de 15 % évite qu'une seule société domine l'indice." },
  ],
  sp500: [
    { q: "À quelle heure de Paris ouvre Wall Street, en temps normal ?", a: ["9h00", "15h30", "18h00"], ok: 1, why: "9h30 à New York, soit 15h30 à Paris." },
  ],
  nasdaq: [
    { q: "Le Nasdaq-100 exclut…", a: ["Les valeurs technologiques", "Les sociétés financières", "Les sociétés américaines"], ok: 1, why: "Il regroupe les 100 plus grandes sociétés non financières du Nasdaq." },
  ],
  dow: [
    { q: "Combien de sociétés compte le Dow Jones ?", a: ["30", "100", "500"], ok: 0, why: "C'est un petit indice très médiatisé." },
  ],
  dax: [
    { q: "Qu'a de particulier le DAX ?", a: ["Il réinvestit les dividendes", "Il ne compte que des banques", "Il cote la nuit"], ok: 0, why: "C'est un indice de performance." },
  ],
  stoxx50: [
    { q: "L'Euro Stoxx 50 regroupe des sociétés…", a: ["Françaises uniquement", "De toute la zone euro", "Du monde entier"], ok: 1, why: "Ce sont les 50 plus grandes capitalisations de la zone euro." },
  ],
  autres: [
    { q: "Un yen faible favorise plutôt…", a: ["Les exportateurs japonais", "Les importateurs japonais", "Personne"], ok: 0, why: "Leurs produits deviennent moins chers à l'étranger." },
  ],
};

// ───── Progression ─────
const LEVELS = [
  [0, "Débutant"], [60, "Apprenti"], [150, "Investisseur"], [280, "Analyste"], [450, "Stratège"], [700, "Gérant"], [1000, "Légende des marchés"],
];
const BADGES = [
  { id: "first", label: "Premier pas", desc: "Réussir un premier quiz", icon: "🎓", test: (p) => Object.keys(p.done).length >= 1 },
  { id: "bases", label: "Bases solides", desc: "Réussir tous les quiz des bases", icon: "🧱", test: (p, L) => L.filter((l) => l.module === "bases").every((l) => p.done[l.id]) },
  { id: "tech", label: "Technicien", desc: "Réussir tous les quiz d'indicateurs", icon: "📈", test: (p, L) => L.filter((l) => l.module === "indicateurs").every((l) => p.done[l.id]) },
  { id: "world", label: "Globe-trotter", desc: "Réussir tous les quiz sur les indices", icon: "🌍", test: (p, L) => L.filter((l) => l.module === "indices").every((l) => p.done[l.id]) },
  { id: "perfect", label: "Sans faute", desc: "5 quiz réussis du premier coup", icon: "💎", test: (p) => Object.values(p.done).filter((d) => d.first).length >= 5 },
  { id: "oracle", label: "Oracle", desc: "5 bonnes réponses au jeu « Devine la suite »", icon: "🔮", test: (p) => (p.gameWins || 0) >= 5 },
  { id: "streak", label: "Régulier", desc: "Revenir apprendre 3 jours d'affilée", icon: "🔥", test: (p) => (p.streak || 0) >= 3 },
];

let P = store.get("sdm.progress", { xp: 0, done: {}, badges: [], gameWins: 0, gamePlays: 0, streak: 0, lastDay: null });
const save = () => store.set("sdm.progress", P);

export function levelOf(xp) {
  let i = 0; while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++;
  const [from, name] = LEVELS[i], to = LEVELS[i + 1]?.[0] ?? from;
  return { n: i + 1, name, from, to, pct: to > from ? (xp - from) / (to - from) : 1 };
}

// Série de jours : comptée à chaque visite de l'Académie.
export function touchStreak() {
  const today = new Date().toISOString().slice(0, 10);
  if (P.lastDay === today) return;
  const y = new Date(Date.now() - 86400e3).toISOString().slice(0, 10);
  P.streak = P.lastDay === y ? (P.streak || 0) + 1 : 1;
  P.lastDay = today; save();
}

function gainXp(n, anchor, LESSONS) {
  const before = levelOf(P.xp);
  P.xp += n;
  const after = levelOf(P.xp);
  burst("gain", { anchor, text: `+${n} XP`, size: n >= 20 ? "big" : "small" });
  if (after.n > before.n) {
    setTimeout(() => { burst("gain", { size: "big", text: `Niveau ${after.n} !` }); notify({ title: `Niveau ${after.n} atteint : ${after.name}`, body: "Continue comme ça !", kind: "gain", own: true }); }, 700);
  }
  for (const b of BADGES) if (!P.badges.includes(b.id) && b.test(P, LESSONS)) {
    P.badges.push(b.id);
    setTimeout(() => notify({ title: `Badge débloqué : ${b.icon} ${b.label}`, body: b.desc, kind: "gain", own: true }), 1200);
  }
  save();
  document.dispatchEvent(new CustomEvent("progress"));
}

export function progress() { return P; }
export const isDone = (id) => Boolean(P.done[id]);

// Carte de progression (en-tête de l'Académie).
export function progressCard(LESSONS) {
  const lv = levelOf(P.xp), done = LESSONS.filter((l) => P.done[l.id]).length;
  return el("div", { class: "prog" },
    el("div", { class: "prog-lvl" }, el("span", { class: "prog-n" }, lv.n), el("div", null, el("b", null, lv.name), el("small", null, `${P.xp} XP${lv.to > lv.from ? ` · encore ${lv.to - P.xp} XP pour le niveau suivant` : ""}`))),
    el("div", { class: "prog-bar" }, el("i", { style: `width:${Math.round(lv.pct * 100)}%` })),
    el("div", { class: "prog-stats" },
      el("span", null, `📚 ${done}/${LESSONS.length} leçons validées`), el("span", null, `🔥 ${P.streak || 0} jour${(P.streak || 0) > 1 ? "s" : ""} d'affilée`), el("span", null, `🔮 ${P.gameWins || 0}/${P.gamePlays || 0} au jeu`)),
    el("div", { class: "badges" }, BADGES.map((b) => el("span", { class: "badge-item" + (P.badges.includes(b.id) ? " on" : ""), title: `${b.label} : ${b.desc}` }, el("i", null, b.icon), el("small", null, b.label)))));
}

// Quiz d'une leçon.
export function quizBlock(lesson, LESSONS) {
  const qs = QUIZ[lesson.id];
  if (!qs) return null;
  let answered = 0, correct = 0, firstTry = true;
  const box = el("section", { class: "quiz" }, el("div", { class: "quiz-head" }, el("h3", null, "Quiz"), el("span", { class: "muted small" }, P.done[lesson.id] ? "✓ déjà réussi" : `+${qs.length * 10} XP à gagner`)));
  qs.forEach((item, qi) => {
    const fb = el("p", { class: "quiz-fb", role: "status" });
    const opts = el("div", { class: "quiz-opts" }, item.a.map((txt, ai) => el("button", { class: "quiz-opt", onclick: (e) => {
      const btn = e.currentTarget;
      if (btn.closest(".quiz-q").dataset.done) return;
      if (ai === item.ok) {
        btn.classList.add("good"); btn.closest(".quiz-q").dataset.done = "1";
        fb.textContent = "Bonne réponse ! " + item.why; fb.className = "quiz-fb good";
        answered++; correct++;
        if (!P.done[lesson.id]) gainXp(10, btn, LESSONS); else burst("gain", { anchor: btn });
        if (answered === qs.length) finish();
      } else {
        btn.classList.add("bad"); btn.disabled = true; firstTry = false;
        fb.textContent = "Pas tout à fait… réessaie !"; fb.className = "quiz-fb bad";
        burst("loss", { anchor: btn });
      }
    } }, txt)));
    box.append(el("div", { class: "quiz-q" }, el("p", null, el("b", null, `${qi + 1}. `), item.q), opts, fb));
  });
  function finish() {
    if (P.done[lesson.id]) return;
    P.done[lesson.id] = { at: Date.now(), first: firstTry };
    gainXp(20, box, LESSONS);
    box.append(el("p", { class: "quiz-done" }, `🎉 Leçon validée ! ${firstTry ? "Sans faute, bravo." : ""}`));
  }
  return box;
}

// ───── Mini-jeu : devine la suite du graphique ─────
const GAME_SYMBOLS = [["^FCHI", "CAC 40"], ["^GSPC", "S&P 500"], ["^IXIC", "Nasdaq"], ["^GDAXI", "DAX"], ["BTC-USD", "Bitcoin"], ["ETH-USD", "Ethereum"], ["GC=F", "Or"], ["EURUSD=X", "EUR/USD"], ["MC.PA", "LVMH"], ["AAPL", "Apple"], ["NVDA", "Nvidia"], ["TTE.PA", "TotalEnergies"]];
const HORIZON = 10; // bougies révélées

export function gameBlock(LESSONS) {
  const wrap = el("section", { class: "panel game" });
  let round = null;
  const canvasBox = el("div", { class: "game-chart" });
  const info = el("p", { class: "game-info" });
  const btns = el("div", { class: "game-btns" },
    el("button", { class: "game-up", onclick: () => answer("up") }, "▲ Ça monte"),
    el("button", { class: "game-down", onclick: () => answer("down") }, "▼ Ça baisse"));
  const next = el("button", { class: "primary", hidden: "", onclick: () => start() }, "Nouvelle partie");
  wrap.append(
    el("div", { class: "panel-head" }, el("h2", null, "🔮 Devine la suite"), el("span", { class: "muted small" }, "+15 XP par bonne réponse")),
    el("p", { class: "muted", style: "margin:0 0 10px" }, "Un vrai graphique passé s'affiche, sans le nom de l'actif. D'après toi, le prix sera-t-il plus haut ou plus bas 10 séances plus tard ?"),
    canvasBox, info, btns, next);

  async function start() {
    next.hidden = true; btns.hidden = false; info.textContent = "Chargement d'un graphique…";
    const [sym, name] = GAME_SYMBOLS[Math.floor(Math.random() * GAME_SYMBOLS.length)];
    try {
      const { bars } = await api(`/api/chart?symbol=${encodeURIComponent(sym)}&tf=1d`);
      if (bars.length < 140) throw new Error("historique trop court");
      const end = 90 + Math.floor(Math.random() * (bars.length - 90 - HORIZON - 1));
      round = { sym, name, shown: bars.slice(end - 90, end), hidden: bars.slice(end, end + HORIZON) };
      draw(false);
      info.textContent = `Graphique journalier de 90 séances. Actif mystère.`;
    } catch (e) { info.textContent = "Impossible de charger un graphique pour le moment : " + e.message; btns.hidden = true; next.hidden = false; }
  }

  function answer(guess) {
    if (!round || btns.hidden) return;
    btns.hidden = true;
    const from = round.shown.at(-1).close, to = round.hidden.at(-1).close;
    const real = to >= from ? "up" : "down", win = guess === real;
    P.gamePlays = (P.gamePlays || 0) + 1;
    if (win) P.gameWins = (P.gameWins || 0) + 1;
    save();
    draw(true);
    const date = new Date(round.shown.at(-1).time * 1000).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    info.replaceChildren(el("b", { class: win ? "up" : "down" }, win ? "Bien vu ! " : "Raté ! "),
      `C'était ${round.name} en ${date}. En 10 séances, il est passé de ${fmt(from)} à ${fmt(to)} (${pct(to / from - 1)}).`);
    if (win) gainXp(15, wrap, LESSONS); else { burst("loss", { anchor: canvasBox, size: "big", text: pct(to / from - 1) }); document.dispatchEvent(new CustomEvent("progress")); }
    next.hidden = false;
  }

  // Graphique en chandeliers sur canevas (le futur apparaît en surbrillance après la réponse).
  function draw(reveal) {
    const all = reveal ? [...round.shown, ...round.hidden] : round.shown;
    const total = round.shown.length + HORIZON;
    const cv = document.createElement("canvas");
    const W = canvasBox.clientWidth || 600, H = 240, r = devicePixelRatio || 1;
    cv.width = W * r; cv.height = H * r; cv.style.width = "100%"; cv.style.height = H + "px";
    const g = cv.getContext("2d"); g.scale(r, r);
    const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const lo = Math.min(...all.map((b) => b.low)), hi = Math.max(...all.map((b) => b.high)), span = hi - lo || 1;
    const y = (v) => 10 + (hi - v) / span * (H - 20), cw = W / total;
    if (!reveal) { g.fillStyle = css("--soft"); g.fillRect(round.shown.length * cw, 0, HORIZON * cw, H); g.fillStyle = css("--muted"); g.font = "600 13px sans-serif"; g.textAlign = "center"; g.fillText("?", (round.shown.length + HORIZON / 2) * cw, H / 2); }
    all.forEach((b, i) => {
      const upb = b.close >= b.open, x = i * cw + cw / 2;
      g.globalAlpha = i >= round.shown.length ? 1 : reveal ? 0.45 : 1;
      g.strokeStyle = g.fillStyle = upb ? css("--up") : css("--down");
      g.beginPath(); g.moveTo(x, y(b.high)); g.lineTo(x, y(b.low)); g.stroke();
      g.fillRect(x - cw * 0.35, Math.min(y(b.open), y(b.close)), cw * 0.7, Math.max(1, Math.abs(y(b.open) - y(b.close))));
    });
    g.globalAlpha = 1;
    canvasBox.replaceChildren(cv);
  }

  setTimeout(start, 50);
  return wrap;
}
