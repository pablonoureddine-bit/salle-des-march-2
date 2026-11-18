// Lexique illustré de la finance : définitions simples, exemples et petits schémas.
import { el } from "./util.js";

const NS = "http://www.w3.org/2000/svg";
const svg = (inner, w = 120, h = 70) => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", `0 0 ${w} ${h}`); s.setAttribute("aria-hidden", "true"); s.innerHTML = inner; return s; };

export const CATS = [
  { id: "bourse", label: "Bourse et marchés", c1: "#14284B", c2: "#3E5C94", icon: '<path d="M3 17l5-5 4 3 8-8" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 7h5v5" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>' },
  { id: "produits", label: "Produits financiers", c1: "#3B2C7A", c2: "#7B6CF0", icon: '<rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="#fff" stroke-width="2"/><path d="M4 10h16M9 14h6" stroke="#fff" stroke-width="2"/>' },
  { id: "fondamental", label: "Analyse fondamentale", c1: "#14583F", c2: "#2FAE7A", icon: '<path d="M5 19V11M10 19V7M15 19v-5M20 19V5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>' },
  { id: "technique", label: "Analyse technique", c1: "#7A4A0E", c2: "#E3A33E", icon: '<path d="M6 4v16M6 8h-2v6h4V8zM13 6v14M11 9h4v5h-4zM20 3v14M18 6h4v6h-4z" stroke="#fff" stroke-width="1.6" fill="#fff"/>' },
  { id: "macro", label: "Économie et banques centrales", c1: "#2E4C8F", c2: "#5C86D6", icon: '<path d="M4 9l8-5 8 5H4zm2 1h2v7H6zm5 0h2v7h-2zm5 0h2v7h-2zM4 18h16v2H4z" fill="#fff"/>' },
  { id: "risque", label: "Risque et trading", c1: "#5A1F2B", c2: "#C24B5A", icon: '<path d="M12 3l9 16H3z" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M12 9v5M12 16.5v.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>' },
  { id: "crypto", label: "Crypto", c1: "#7A4A0E", c2: "#F2A43A", icon: '<text x="12" y="17" text-anchor="middle" font-size="14" font-weight="700" fill="#fff" font-family="sans-serif">₿</text>' },
  { id: "epargne", label: "Épargne et fiscalité en France", c1: "#0F4C5C", c2: "#2BA3B5", icon: '<path d="M5 11a7 6 0 0 1 14 0v4a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" fill="none" stroke="#fff" stroke-width="2"/><path d="M10 8h4" stroke="#fff" stroke-width="2"/><circle cx="12" cy="13" r="1.6" fill="#fff"/>' },
];

// Petits schémas pour les notions qui se comprennent mieux en image.
const UP = "var(--up)", DN = "var(--down)", INK = "var(--ink)", MU = "var(--muted)", AC = "var(--accent)";
const D = {
  chandelier: `<line x1="35" y1="6" x2="35" y2="64" stroke="${UP}" stroke-width="2"/><rect x="25" y="18" width="20" height="30" fill="${UP}" rx="2"/><line x1="85" y1="8" x2="85" y2="62" stroke="${DN}" stroke-width="2"/><rect x="75" y="20" width="20" height="26" fill="${DN}" rx="2"/><text x="55" y="22" font-size="8" fill="${MU}" text-anchor="middle">mèche</text><text x="55" y="38" font-size="8" fill="${MU}" text-anchor="middle">corps</text>`,
  support: `<polyline points="4,20 22,48 40,30 58,50 76,28 94,49 116,14" fill="none" stroke="${INK}" stroke-width="2"/><line x1="0" y1="50" x2="120" y2="50" stroke="${UP}" stroke-width="2" stroke-dasharray="4 3"/><line x1="0" y1="26" x2="120" y2="26" stroke="${DN}" stroke-width="2" stroke-dasharray="4 3"/>`,
  tendance: `<polyline points="4,60 24,42 36,50 58,30 70,38 92,16 116,8" fill="none" stroke="${UP}" stroke-width="2.4"/><line x1="4" y1="62" x2="116" y2="24" stroke="${MU}" stroke-dasharray="3 3"/>`,
  spread: `<rect x="10" y="14" width="40" height="18" rx="4" fill="${UP}" opacity=".85"/><text x="30" y="27" font-size="9" fill="#fff" text-anchor="middle">99,98</text><rect x="70" y="14" width="40" height="18" rx="4" fill="${DN}" opacity=".85"/><text x="90" y="27" font-size="9" fill="#fff" text-anchor="middle">100,02</text><path d="M50 50h20" stroke="${AC}" stroke-width="2"/><text x="60" y="62" font-size="9" fill="${MU}" text-anchor="middle">écart = spread</text><text x="30" y="44" font-size="8" fill="${MU}" text-anchor="middle">bid</text><text x="90" y="44" font-size="8" fill="${MU}" text-anchor="middle">ask</text>`,
  levier: `<line x1="10" y1="52" x2="110" y2="30" stroke="${INK}" stroke-width="3"/><path d="M55 56l8-14 8 14z" fill="${AC}"/><rect x="12" y="38" width="12" height="12" fill="${MU}"/><rect x="90" y="8" width="20" height="20" fill="${UP}"/>`,
  dividende: `<circle cx="40" cy="35" r="22" fill="none" stroke="${INK}" stroke-width="2"/><path d="M40 13a22 22 0 0 1 22 22H40z" fill="${AC}"/><path d="M70 35h30M92 28l8 7-8 7" stroke="${UP}" stroke-width="2.4" fill="none"/>`,
  gap: `<rect x="20" y="30" width="14" height="24" fill="${UP}"/><rect x="40" y="26" width="14" height="10" fill="${UP}"/><rect x="66" y="8" width="14" height="10" fill="${UP}"/><rect x="86" y="6" width="14" height="14" fill="${UP}"/><rect x="54" y="18" width="12" height="8" fill="${AC}" opacity=".35"/><text x="60" y="48" font-size="9" fill="${MU}" text-anchor="middle">gap</text>`,
  diversification: `<circle cx="60" cy="35" r="26" fill="${AC}"/><path d="M60 35V9a26 26 0 0 1 24 16z" fill="${UP}"/><path d="M60 35l24-10a26 26 0 0 1-6 28z" fill="#5C86D6"/><path d="M60 35l18 18a26 26 0 0 1-30 4z" fill="${DN}"/>`,
  interets: `<polyline points="6,62 26,58 46,52 66,42 86,28 110,8" fill="none" stroke="${UP}" stroke-width="2.6"/><polyline points="6,62 110,40" fill="none" stroke="${MU}" stroke-width="1.6" stroke-dasharray="4 3"/>`,
  courbe: `<polyline points="8,56 30,36 55,26 85,20 112,17" fill="none" stroke="${AC}" stroke-width="2.6"/><text x="12" y="66" font-size="8" fill="${MU}">court terme</text><text x="80" y="66" font-size="8" fill="${MU}">long terme</text>`,
};

// [catégorie, terme, définition, exemple, schéma optionnel]
export const TERMS = [
  ["bourse", "Action", "Une part de propriété d'une entreprise. L'actionnaire peut toucher des dividendes et voter en assemblée générale.", "Acheter 10 actions LVMH, c'est posséder une toute petite partie de LVMH."],
  ["bourse", "Indice boursier", "Un panier d'actions qui sert de thermomètre à un marché.", "Le CAC 40 suit les 40 grandes valeurs de la Bourse de Paris."],
  ["bourse", "Capitalisation boursière", "La valeur totale d'une entreprise en bourse : cours de l'action × nombre d'actions.", "Une société de 100 millions d'actions à 50 € vaut 5 milliards d'euros."],
  ["bourse", "Bid / Ask", "Le bid est le meilleur prix proposé par un acheteur, l'ask celui proposé par un vendeur.", "", "spread"],
  ["bourse", "Spread", "L'écart entre le prix acheteur et le prix vendeur. C'est un coût à chaque aller-retour.", "Bid 99,98 €, ask 100,02 € : spread de 0,04 €.", "spread"],
  ["bourse", "Liquidité", "La facilité à acheter ou vendre un actif sans faire bouger son prix.", "EUR/USD est très liquide ; une petite action peu échangée ne l'est pas."],
  ["bourse", "Volatilité", "L'ampleur habituelle des variations d'un prix. Plus elle est forte, plus le risque est grand.", "Le bitcoin est bien plus volatil qu'un fonds monétaire."],
  ["bourse", "Marché haussier (bull market)", "Une longue période de hausse généralisée des cours, souvent définie par +20 % depuis un creux.", ""],
  ["bourse", "Marché baissier (bear market)", "Une longue période de baisse, souvent définie par −20 % depuis un sommet.", ""],
  ["bourse", "Introduction en bourse (IPO)", "Le moment où une entreprise met pour la première fois ses actions en vente au public.", ""],
  ["bourse", "Carnet d'ordres", "La liste des ordres d'achat et de vente en attente, classés par prix.", ""],
  ["bourse", "Séance", "Une journée de cotation, de l'ouverture à la clôture du marché.", "Euronext Paris : 9h00 – 17h30."],
  ["produits", "Obligation", "Un prêt fait à un État ou à une entreprise, qui verse des intérêts (le coupon) puis rembourse le capital à l'échéance.", "Une obligation à 3 % sur 5 ans rapporte 3 € par an pour 100 € prêtés."],
  ["produits", "ETF (tracker)", "Un fonds coté qui réplique un indice. Il permet d'acheter tout un marché en une seule fois, avec peu de frais.", "Un ETF CAC 40 suit l'indice à la hausse comme à la baisse."],
  ["produits", "Fonds (OPCVM)", "Un portefeuille géré par des professionnels, dans lequel on achète des parts.", ""],
  ["produits", "Dividende", "La part des bénéfices qu'une entreprise verse à ses actionnaires.", "Dividende de 2 € pour une action à 50 € : rendement de 4 %.", "dividende"],
  ["produits", "Contrat à terme (future)", "Un engagement à acheter ou vendre un actif à un prix fixé, à une date future. Très utilisé avec effet de levier.", ""],
  ["produits", "Option", "Le droit, mais pas l'obligation, d'acheter (call) ou de vendre (put) un actif à un prix fixé avant une date donnée.", ""],
  ["produits", "CFD", "Un contrat qui permet de parier sur la hausse ou la baisse d'un prix, sans posséder l'actif. Avec levier, il peut faire perdre très vite.", "La majorité des comptes particuliers perdent de l'argent sur les CFD."],
  ["produits", "Turbo / warrant", "Des produits à effet de levier émis par des banques. Un turbo est désactivé si le prix touche sa barrière.", ""],
  ["produits", "Matières premières", "Les ressources naturelles échangées sur les marchés : pétrole, or, blé, cuivre…", ""],
  ["fondamental", "Chiffre d'affaires", "Le total des ventes d'une entreprise sur une période.", ""],
  ["fondamental", "Résultat net (bénéfice)", "Ce qu'il reste à l'entreprise une fois toutes les dépenses, intérêts et impôts payés.", ""],
  ["fondamental", "Bilan", "La photographie du patrimoine d'une entreprise à une date : ce qu'elle possède (actif) et ce qu'elle doit (passif).", ""],
  ["fondamental", "Compte de résultat", "Le film de l'année : ventes, coûts et bénéfice.", ""],
  ["fondamental", "BPA (bénéfice par action)", "Le résultat net divisé par le nombre d'actions.", "Bénéfice de 1 milliard, 100 millions d'actions : BPA de 10 €."],
  ["fondamental", "PER", "Le prix de l'action divisé par le bénéfice par action. Il indique combien d'années de bénéfices on paie.", "Action à 150 €, BPA de 10 € : PER de 15."],
  ["fondamental", "Marge nette", "La part du chiffre d'affaires qui se transforme en bénéfice.", "100 € de ventes, 12 € de bénéfice : marge nette de 12 %."],
  ["fondamental", "ROE", "La rentabilité des capitaux propres : le bénéfice rapporté à l'argent des actionnaires.", ""],
  ["fondamental", "Dette nette", "Les dettes financières moins la trésorerie disponible.", ""],
  ["fondamental", "Flux de trésorerie disponible", "L'argent réellement généré par l'activité, une fois les investissements payés. Il finance dividendes et rachats d'actions.", ""],
  ["fondamental", "Consensus des analystes", "La moyenne des prévisions des analystes sur le chiffre d'affaires, les bénéfices ou le cours d'une société.", ""],
  ["technique", "Chandelier japonais", "Une représentation du prix sur une période avec quatre valeurs : ouverture, plus haut, plus bas et clôture.", "", "chandelier"],
  ["technique", "Tendance", "La direction générale des prix : haussière, baissière ou latérale (range).", "", "tendance"],
  ["technique", "Support / Résistance", "Des zones de prix où les acheteurs (support) ou les vendeurs (résistance) se sont manifestés à plusieurs reprises.", "", "support"],
  ["technique", "Moyenne mobile", "La moyenne des derniers cours, recalculée à chaque bougie, pour lisser le prix et faire ressortir la tendance.", ""],
  ["technique", "RSI", "Un indicateur de 0 à 100 qui mesure la force des hausses face aux baisses. Au-dessus de 70 : surachat ; sous 30 : survente.", ""],
  ["technique", "MACD", "L'écart entre deux moyennes exponentielles, avec une ligne de signal. Il suit l'accélération de la tendance.", ""],
  ["technique", "Fibonacci", "Des niveaux (23,6 %, 38,2 %, 61,8 %…) où une correction s'arrête souvent avant que la tendance reprenne.", ""],
  ["technique", "Ichimoku", "Un système japonais complet avec un « nuage » qui montre tendance, momentum, supports et résistances.", ""],
  ["technique", "Gap", "Un écart entre la clôture d'une séance et l'ouverture de la suivante, sans échange entre les deux.", "", "gap"],
  ["technique", "Volume", "Le nombre de titres échangés sur une période. Il mesure la conviction derrière un mouvement.", ""],
  ["technique", "Divergence", "Quand le prix et un indicateur vont dans des directions opposées. C'est souvent le signe d'un essoufflement.", ""],
  ["macro", "Inflation", "La hausse générale des prix. Elle réduit le pouvoir d'achat de la monnaie.", "Une inflation de 3 % : ce qui coûtait 100 € en coûte 103 un an plus tard."],
  ["macro", "Taux directeur", "Le taux auquel une banque centrale prête aux banques. Il influence tous les taux de crédit de l'économie.", ""],
  ["macro", "Fed", "La banque centrale des États-Unis. Ses décisions de taux font bouger tous les marchés du monde.", ""],
  ["macro", "BCE", "La Banque centrale européenne, qui fixe les taux de la zone euro.", ""],
  ["macro", "PIB", "Le produit intérieur brut, c'est-à-dire la valeur de tout ce qu'un pays produit. Sa variation mesure la croissance.", ""],
  ["macro", "Récession", "Un recul de l'activité économique, souvent défini par deux trimestres de baisse du PIB.", ""],
  ["macro", "Courbe des taux", "Les taux d'emprunt d'un État classés par durée. Quand elle s'inverse (taux courts plus hauts que les longs), c'est souvent un signal de ralentissement.", "", "courbe"],
  ["macro", "NFP (emploi américain)", "Le rapport mensuel des créations d'emplois aux États-Unis. C'est l'une des annonces les plus suivies.", ""],
  ["macro", "Dollar index (DXY)", "La valeur du dollar face à un panier de grandes devises.", ""],
  ["risque", "Effet de levier", "Emprunter pour investir plus que sa mise. Les gains comme les pertes sont multipliés.", "Levier ×5 : une baisse de 20 % efface toute ta mise.", "levier"],
  ["risque", "Stop loss", "Un ordre qui vend automatiquement si le prix atteint un seuil de perte fixé à l'avance.", ""],
  ["risque", "Take profit", "Un ordre qui encaisse automatiquement le gain à un prix objectif.", ""],
  ["risque", "Ratio gain/risque", "Le gain visé divisé par la perte acceptée. Avec un ratio de 2, une victoire compense deux pertes.", ""],
  ["risque", "Drawdown", "La baisse d'un portefeuille entre son plus haut et son plus bas suivant.", "De 10 000 € à 8 000 € : drawdown de 20 %."],
  ["risque", "Diversification", "Répartir son argent sur plusieurs actifs, secteurs et pays pour réduire le risque.", "", "diversification"],
  ["risque", "Vente à découvert", "Vendre un titre qu'on ne possède pas, pour le racheter moins cher plus tard. On gagne si le prix baisse.", ""],
  ["risque", "Slippage", "L'écart entre le prix demandé et le prix réellement obtenu, fréquent quand le marché bouge vite.", ""],
  ["risque", "Scalping, day trading, swing", "Trois styles selon la durée des positions : quelques secondes ou minutes, une journée, quelques jours à semaines.", ""],
  ["crypto", "Bitcoin", "La première cryptomonnaie (2009), au nombre d'unités limité à 21 millions.", ""],
  ["crypto", "Blockchain", "Un registre partagé et infalsifiable où sont inscrites toutes les transactions.", ""],
  ["crypto", "Stablecoin", "Une cryptomonnaie conçue pour garder une valeur stable, en général 1 dollar.", ""],
  ["crypto", "Portefeuille (wallet)", "L'outil qui garde les clés donnant accès à tes cryptos. Clés perdues, fonds perdus.", ""],
  ["crypto", "Halving", "La division par deux des nouveaux bitcoins créés, environ tous les quatre ans.", ""],
  ["epargne", "PEA", "Le plan d'épargne en actions : une enveloppe française pour les actions européennes. Après 5 ans, les gains sont exonérés d'impôt sur le revenu (les prélèvements sociaux restent dus).", ""],
  ["epargne", "Compte-titres ordinaire (CTO)", "Un compte pour acheter tous types de titres du monde entier, sans avantage fiscal particulier.", ""],
  ["epargne", "Assurance-vie", "Un placement très utilisé en France, qui combine fonds en euros et unités de compte, avec une fiscalité allégée après 8 ans.", ""],
  ["epargne", "Flat tax (PFU)", "Le prélèvement forfaitaire unique sur les revenus du capital en France : impôt et prélèvements sociaux en un seul taux.", ""],
  ["epargne", "Intérêts composés", "Les intérêts produisent eux-mêmes des intérêts. Sur le long terme, l'effet boule de neige est puissant.", "1 000 € à 7 % par an deviennent environ 2 000 € en 10 ans.", "interets"],
  ["epargne", "DCA (investissement programmé)", "Investir la même somme à intervalles réguliers, quel que soit le prix, pour lisser son prix d'achat.", ""],
];

let cat = "all", q = "";

export function lexiqueBlock() {
  const box = el("section", { class: "lexique" });
  const list = el("div", { class: "lex-grid" });
  const search = el("input", { type: "search", placeholder: "Chercher un mot (PER, levier, ETF…)", "aria-label": "Chercher dans le lexique", oninput: (e) => { q = e.target.value.trim().toLowerCase(); render(); } });
  const tabs = el("div", { class: "families" });
  box.append(el("div", { class: "lex-head" }, el("p", { class: "muted", style: "margin:0" }, `${TERMS.length} notions essentielles, expliquées simplement.`), search), tabs, list);
  function render() {
    tabs.replaceChildren(el("button", { class: cat === "all" ? "on" : "", onclick: () => { cat = "all"; render(); } }, "Tout"),
      ...CATS.map((c) => el("button", { class: cat === c.id ? "on" : "", onclick: () => { cat = c.id; render(); } }, c.label)));
    const items = TERMS.filter(([c, t, d]) => (cat === "all" || c === cat) && (!q || (t + " " + d).toLowerCase().includes(q)))
      .sort((a, b) => a[1].localeCompare(b[1], "fr"));
    list.replaceChildren(...(items.length ? items.map(([c, term, def, ex, dia]) => {
      const C = CATS.find((x) => x.id === c);
      const pic = dia ? el("div", { class: "lex-dia" }, svg(D[dia])) : el("div", { class: "lex-ico", style: `background:linear-gradient(135deg, ${C.c1}, ${C.c2})` }, svg(C.icon, 24, 24));
      return el("article", { class: "lex-card" }, pic,
        el("div", null, el("small", null, C.label), el("h3", null, term), el("p", null, def), ex ? el("p", { class: "lex-ex" }, "Exemple : " + ex) : null));
    }) : [el("p", { class: "muted" }, "Aucun mot ne correspond à ta recherche.")]));
  }
  render();
  return box;
}
