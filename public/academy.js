// Contenu pédagogique de l'Académie.
// Chaque leçon peut avoir un encart "live" calculé sur l'actif affiché (fonction live(A, h)),
// un calque à afficher sur le graphique (overlay) ou un actif à ouvrir (symbol).

export const MODULES = [
  { id: "bases", title: "Les bases du trading" },
  { id: "indicateurs", title: "Indicateurs techniques" },
  { id: "indices", title: "Les grands indices" },
];

export const LESSONS = [
  // ───────────── BASES ─────────────
  {
    id: "marche", module: "bases", title: "Comprendre un cours de bourse", minutes: 5,
    body: `
<p>Un cours est le dernier prix auquel un acheteur et un vendeur se sont mis d'accord. Il bouge parce que l'équilibre entre l'offre et la demande change en permanence.</p>
<h3>Les mots à connaître</h3>
<dl>
<dt>Bid / Ask</dt><dd>Le <b>bid</b> est le meilleur prix proposé par un acheteur, l'<b>ask</b> le meilleur prix proposé par un vendeur. Quand tu achètes « au marché », tu paies l'ask.</dd>
<dt>Spread</dt><dd>L'écart entre ask et bid. C'est un coût caché à chaque aller-retour. Il est faible sur les actifs très échangés (CAC 40, EUR/USD) et plus large sur les petites valeurs.</dd>
<dt>Volatilité</dt><dd>L'amplitude habituelle des mouvements. Une action qui varie de 3 % par jour est plus volatile qu'une autre qui varie de 0,5 %.</dd>
<dt>Liquidité</dt><dd>La facilité à acheter ou vendre sans faire bouger le prix. Plus il y a d'échanges, plus c'est liquide.</dd>
<dt>Unité de temps</dt><dd>La durée représentée par une bougie : 15 minutes, 1 heure, 1 jour, 1 semaine. Un même actif peut monter en hebdomadaire et baisser en 15 minutes.</dd>
</dl>
<h3>Qui fait bouger les prix ?</h3>
<p>Les résultats des entreprises, les taux d'intérêt des banques centrales, l'inflation, les annonces politiques, mais aussi la psychologie des intervenants. L'analyse <b>fondamentale</b> étudie les causes (économie, comptes des sociétés). L'analyse <b>technique</b> étudie le prix lui-même et les comportements qu'il révèle. Les deux se complètent.</p>`,
    live: (A, h) => `Sur <b>${h.name}</b>, la volatilité moyenne (ATR 14) vaut <b>${h.fmt(A.atrNow)}</b>, soit ${h.pctAbs(A.atrNow / A.last)} du cours par bougie de ${h.tfLabel}.`,
  },
  {
    id: "chandeliers", module: "bases", title: "Lire les chandeliers japonais", minutes: 7,
    body: `
<p>Chaque bougie résume une période avec quatre prix : ouverture, plus haut, plus bas et clôture.</p>
<ul>
<li>Le <b>corps</b> relie l'ouverture à la clôture. Vert (ou creux) si la clôture est au-dessus de l'ouverture, rouge sinon.</li>
<li>Les <b>mèches</b> montrent les extrêmes atteints. Une longue mèche signale un rejet : le prix y est allé mais n'a pas tenu.</li>
</ul>
<h3>Figures utiles</h3>
<dl>
<dt>Doji</dt><dd>Ouverture et clôture presque égales. Indécision. Intéressant après un long mouvement.</dd>
<dt>Marteau</dt><dd>Petit corps en haut, longue mèche basse, après une baisse. Les vendeurs ont poussé, les acheteurs ont repris la main.</dd>
<dt>Étoile filante</dt><dd>L'inverse du marteau, après une hausse. Rejet des prix hauts.</dd>
<dt>Avalement (englobante)</dt><dd>Une bougie dont le corps recouvre entièrement celui de la précédente, en sens inverse. Signal de retournement plus fort quand il apparaît sur un support ou une résistance.</dd>
</dl>
<p class="tip">Une figure isolée ne suffit jamais. Elle prend de la valeur quand elle se forme sur un niveau clé et qu'un indicateur la confirme.</p>`,
    live: (A, h) => {
      const x = A.b.at(-1), body = Math.abs(x.close - x.open), range = x.high - x.low || 1;
      const upW = x.high - Math.max(x.open, x.close), loW = Math.min(x.open, x.close) - x.low;
      let t = x.close >= x.open ? "haussière" : "baissière";
      if (body / range < 0.1) t = "proche d'un doji (indécision)";
      else if (loW > body * 2 && upW < body) t += ", avec une longue mèche basse (rejet des prix bas)";
      else if (upW > body * 2 && loW < body) t += ", avec une longue mèche haute (rejet des prix hauts)";
      return `La dernière bougie de <b>${h.name}</b> est ${t}. Ouverture ${h.fmt(x.open)}, plus haut ${h.fmt(x.high)}, plus bas ${h.fmt(x.low)}, clôture ${h.fmt(x.close)}.`;
    },
  },
  {
    id: "tendance", module: "bases", title: "Tendance, supports et résistances", minutes: 6,
    body: `
<p>Une <b>tendance haussière</b> enchaîne des sommets et des creux de plus en plus hauts. Une tendance baissière, des sommets et des creux de plus en plus bas. Entre les deux, le marché est en <b>range</b> (il oscille latéralement).</p>
<h3>Support et résistance</h3>
<p>Un <b>support</b> est une zone où les acheteurs sont revenus plusieurs fois. Une <b>résistance</b>, une zone où les vendeurs ont repris la main. Plus un niveau a été touché, plus il est surveillé.</p>
<p>Quand une résistance est franchie nettement, elle devient souvent un support : c'est le <b>changement de polarité</b>. Les traders attendent fréquemment ce « retest » pour entrer.</p>
<p class="tip">Pense en <b>zones</b>, pas en prix exacts. L'outil regroupe les sommets et creux proches en tenant compte de la volatilité (ATR).</p>`,
    live: (A, h) => `Supports les plus proches sur <b>${h.name}</b> : ${A.sup.map((s) => h.fmt(s.level)).join(", ") || "aucun détecté"}. Résistances : ${A.res.map((s) => h.fmt(s.level)).join(", ") || "aucune détectée"}.`,
  },
  {
    id: "ordres", module: "bases", title: "Les types d'ordres", minutes: 5,
    body: `
<dl>
<dt>Ordre au marché</dt><dd>Exécuté tout de suite au meilleur prix disponible. Rapide, mais le prix final n'est pas garanti (on parle de <i>slippage</i>).</dd>
<dt>Ordre à cours limité</dt><dd>Tu fixes un prix maximum à l'achat ou minimum à la vente. Prix garanti, exécution non garantie.</dd>
<dt>Stop (stop loss)</dt><dd>Devient un ordre au marché quand un seuil est touché. Sert à couper une perte automatiquement. Indispensable.</dd>
<dt>Stop limite</dt><dd>Comme un stop, mais devient un ordre limité. Évite une exécution trop loin, au risque de ne pas être exécuté du tout lors d'un décrochage.</dd>
<dt>Stop suiveur</dt><dd>Le seuil remonte avec le prix (à l'achat) et ne redescend jamais. Il protège les gains d'une tendance.</dd>
<dt>Take profit</dt><dd>Ordre limité placé à l'objectif pour encaisser le gain.</dd>
</dl>
<p class="tip">Avant chaque position, décide de trois prix : entrée, stop et objectif. Si tu ne peux pas placer de stop logique, ne prends pas la position.</p>`,
  },
  {
    id: "risque", module: "bases", title: "Gestion du risque et taille de position", minutes: 8,
    body: `
<p>La survie d'un trader dépend moins de ses bonnes idées que de la taille de ses pertes. Trois règles simples :</p>
<ol>
<li><b>Risquer une petite part du capital par trade</b>, en général 0,5 % à 2 %. Avec 1 %, il faut 10 pertes d'affilée pour perdre environ 10 % du compte.</li>
<li><b>Viser un rapport gain/risque d'au moins 1,5 à 2.</b> Avec un ratio de 2, tu peux te tromper plus d'une fois sur deux et rester gagnant.</li>
<li><b>Calculer la taille de position à partir du stop</b>, jamais l'inverse.</li>
</ol>
<p>Formule : <code>taille = (capital × risque %) ÷ (entrée − stop)</code>.</p>
<p>Exemple : capital 10 000 €, risque 1 % (100 €), entrée 50 €, stop 48 €. Risque par action 2 €, donc 50 actions, soit une position de 2 500 €.</p>
<p>Attention à l'effet de levier (CFD, futures, turbos) : il multiplie les gains et les pertes. La règle du risque par trade s'applique toujours sur la perte possible, pas sur le montant engagé.</p>`,
    calculator: true,
  },
  {
    id: "psycho", module: "bases", title: "Psychologie et plan de trading", minutes: 5,
    body: `
<p>Les erreurs qui coûtent le plus cher sont rarement techniques :</p>
<ul>
<li><b>Déplacer son stop</b> pour « laisser une chance » à une position perdante.</li>
<li><b>Revenge trading</b> : reprendre une position plus grosse juste après une perte pour se refaire.</li>
<li><b>FOMO</b> : acheter un actif qui a déjà flambé par peur de rater le mouvement.</li>
<li><b>Couper trop tôt les gains</b> et laisser courir les pertes.</li>
</ul>
<h3>Ton plan de trading, par écrit</h3>
<ol>
<li>Les marchés et unités de temps que tu trades.</li>
<li>Tes conditions d'entrée précises (par exemple : prix au-dessus de la MM200 et RSI qui repasse au-dessus de 50).</li>
<li>Où placer le stop et l'objectif.</li>
<li>Le risque maximum par trade, par jour et par semaine.</li>
<li>Un journal : chaque trade noté avec sa raison, son résultat et ce que tu en retiens.</li>
</ol>`,
  },

  // ───────────── INDICATEURS ─────────────
  {
    id: "mm", module: "indicateurs", title: "Moyennes mobiles", minutes: 6, overlay: "mm",
    body: `
<p>Une moyenne mobile lisse le prix sur N bougies pour faire ressortir la tendance. La <b>MM simple</b> donne le même poids à chaque bougie. La <b>moyenne exponentielle</b> (EMA) réagit plus vite car elle favorise les données récentes.</p>
<h3>Les réglages classiques</h3>
<ul>
<li><b>MM20</b> : tendance courte.</li>
<li><b>MM50</b> : tendance intermédiaire, très suivie par les gérants.</li>
<li><b>MM200</b> : tendance de fond. Au-dessus, le marché est considéré comme haussier sur le long terme.</li>
</ul>
<h3>Signaux</h3>
<ul>
<li>Le prix au-dessus de ses moyennes, elles-mêmes bien rangées (MM20 > MM50 > MM200) : tendance haussière saine.</li>
<li><b>Croix dorée</b> : la MM50 passe au-dessus de la MM200. <b>Croix de la mort</b> : l'inverse. Ces signaux sont lents et arrivent souvent tard.</li>
<li>En tendance, les moyennes servent de supports ou résistances dynamiques.</li>
</ul>
<p class="tip">Les moyennes mobiles fonctionnent bien en tendance et donnent beaucoup de faux signaux en range.</p>`,
    live: (A, h) => {
      const n = A.n;
      const pos = (m, l) => m[n] == null ? `${l} pas encore calculable` : `${A.last > m[n] ? "au-dessus" : "en dessous"} de la ${l} (${h.fmt(m[n])})`;
      return `<b>${h.name}</b> est ${pos(A.m20, "MM20")}, ${pos(A.m50, "MM50")} et ${pos(A.m200, "MM200")}.`;
    },
  },
  {
    id: "rsi", module: "indicateurs", title: "RSI (Relative Strength Index)", minutes: 5,
    body: `
<p>Le RSI mesure la force des hausses par rapport aux baisses sur 14 bougies. Il oscille entre 0 et 100.</p>
<ul>
<li><b>Au-dessus de 70</b> : zone de surachat. Le mouvement est fort, peut-être excessif.</li>
<li><b>Sous 30</b> : zone de survente.</li>
<li><b>Autour de 50</b> : ligne de partage. En tendance haussière, le RSI rebondit souvent vers 40-50.</li>
</ul>
<h3>Le piège classique</h3>
<p>« Suracheté » ne veut pas dire « va baisser ». En forte tendance, le RSI peut rester au-dessus de 70 pendant des semaines. Le signal le plus fiable est la <b>divergence</b> : le prix fait un nouveau sommet mais le RSI fait un sommet plus bas. L'élan s'essouffle.</p>`,
    live: (A, h) => {
      const v = A.r[A.n];
      if (v == null) return "Pas assez d'historique pour calculer le RSI.";
      const z = v >= 70 ? "en zone de surachat" : v <= 30 ? "en zone de survente" : v >= 50 ? "au-dessus de 50, momentum plutôt acheteur" : "sous 50, momentum plutôt vendeur";
      return `RSI 14 de <b>${h.name}</b> : <b>${v.toFixed(1).replace(".", ",")}</b>, ${z}.`;
    },
  },
  {
    id: "macd", module: "indicateurs", title: "MACD", minutes: 5,
    body: `
<p>Le MACD est l'écart entre deux moyennes exponentielles (12 et 26). On lui ajoute une <b>ligne de signal</b> (moyenne à 9 du MACD) et un <b>histogramme</b> (MACD moins signal).</p>
<ul>
<li>MACD qui croise son signal vers le haut : accélération haussière.</li>
<li>Passage du MACD au-dessus de zéro : la moyenne courte repasse au-dessus de la longue, la tendance se confirme.</li>
<li>Histogramme qui rétrécit : le mouvement ralentit, souvent avant le croisement.</li>
</ul>
<p class="tip">Le MACD suit le prix avec du retard. Il confirme une tendance mieux qu'il ne l'anticipe.</p>`,
    live: (A, h) => {
      const n = A.n, m = A.md.m[n], s = A.md.sig[n], hi = A.md.hist[n], hp = A.md.hist[n - 1];
      if (m == null || s == null) return "Pas assez d'historique pour le MACD.";
      return `Sur <b>${h.name}</b>, le MACD est ${m > s ? "au-dessus" : "en dessous"} de son signal et ${m > 0 ? "au-dessus" : "en dessous"} de zéro. L'histogramme ${Math.abs(hi) > Math.abs(hp ?? 0) ? "s'élargit (le mouvement accélère)" : "se resserre (le mouvement ralentit)"}.`;
    },
  },
  {
    id: "bollinger", module: "indicateurs", title: "Bandes de Bollinger", minutes: 5, overlay: "bollinger",
    body: `
<p>Trois courbes : une moyenne à 20 et deux bandes placées à 2 écarts-types au-dessus et en dessous. Environ 95 % des clôtures restent à l'intérieur quand le marché est « normal ».</p>
<ul>
<li><b>Resserrement</b> (squeeze) : la volatilité est faible, un mouvement fort se prépare souvent. La direction n'est pas donnée par les bandes.</li>
<li><b>Prix qui longe la bande haute</b> : tendance haussière puissante, pas forcément un signal de vente.</li>
<li>En range, les contacts avec les bandes servent de zones de retournement.</li>
</ul>
<p>Le <b>%B</b> situe le prix dans les bandes : 0 % sur la bande basse, 100 % sur la bande haute.</p>`,
    live: (A, h) => {
      const n = A.n; if (A.bb.up[n] == null) return "Pas assez d'historique.";
      const w = (A.bb.up[n] - A.bb.lo[n]) / A.bb.mid[n] * 100;
      const p = (A.last - A.bb.lo[n]) / (A.bb.up[n] - A.bb.lo[n]) * 100;
      const ws = A.bb.up.slice(-120).map((u, i) => { const j = A.b.length - 120 + i; return u == null ? null : (u - A.bb.lo[j]) / A.bb.mid[j] * 100; }).filter((x) => x != null);
      const minW = Math.min(...ws);
      return `Sur <b>${h.name}</b>, le %B est à ${Math.round(p)} % et les bandes ont une largeur de ${w.toFixed(1).replace(".", ",")} %${w <= minW * 1.15 ? ", proche de leur plus bas sur 120 bougies : resserrement en cours" : ""}.`;
    },
  },
  {
    id: "fibonacci", module: "indicateurs", title: "Retracements de Fibonacci", minutes: 7, overlay: "fibonacci",
    body: `
<p>Après un mouvement fort, le prix corrige souvent une partie de ce mouvement avant de repartir. Les retracements de Fibonacci donnent des zones probables de fin de correction.</p>
<h3>Les ratios</h3>
<ul>
<li><b>23,6 %</b> : correction faible, tendance très forte.</li>
<li><b>38,2 %</b> : correction normale en tendance saine.</li>
<li><b>50 %</b> : pas un nombre de Fibonacci, mais très surveillé.</li>
<li><b>61,8 %</b> : le « nombre d'or ». Zone clé : au-delà, la tendance est sérieusement remise en cause.</li>
<li><b>78,6 %</b> : dernière ligne de défense.</li>
</ul>
<p>Ces ratios viennent de la suite de Fibonacci (1, 1, 2, 3, 5, 8, 13…), où chaque nombre divisé par le suivant tend vers 0,618.</p>
<h3>Comment les tracer</h3>
<p>En tendance haussière, du plus bas vers le plus haut du mouvement. Les niveaux se lisent alors de haut en bas. L'outil prend automatiquement le plus haut et le plus bas des 120 dernières bougies.</p>
<p class="tip">Un niveau de Fibonacci qui coïncide avec un support, une moyenne mobile ou le nuage Ichimoku est bien plus solide qu'un niveau isolé (on parle de <b>confluence</b>).</p>
<h3>Les extensions</h3>
<p>Pour fixer des objectifs au-delà du dernier sommet, on utilise 127,2 % et 161,8 % du mouvement.</p>`,
    live: (A, h) => {
      const f = A.fib;
      const near = f.levels.reduce((x, y) => Math.abs(y.price - A.last) < Math.abs(x.price - A.last) ? y : x);
      return `Mouvement de référence sur <b>${h.name}</b> : ${f.upMove ? "hausse" : "baisse"} de ${h.fmt(f.upMove ? f.lo : f.hi)} à ${h.fmt(f.upMove ? f.hi : f.lo)}.<br>${f.levels.filter((l) => l.ratio > 0 && l.ratio < 1).map((l) => `${(l.ratio * 100).toFixed(1).replace(".", ",")} % : <b>${h.fmt(l.price)}</b>`).join(" · ")}<br>Le cours est le plus proche du niveau ${(near.ratio * 100).toFixed(1).replace(".", ",")} %.`;
    },
  },
  {
    id: "ichimoku", module: "indicateurs", title: "Ichimoku Kinko Hyo", minutes: 10, overlay: "ichimoku",
    body: `
<p>Ichimoku (« équilibre en un coup d'œil ») est un système japonais complet : il donne la tendance, le momentum et des supports/résistances sur un seul graphique. Il comporte cinq lignes.</p>
<dl>
<dt>Tenkan-sen (ligne de conversion)</dt><dd>Milieu du plus haut et du plus bas des 9 dernières bougies. Tendance courte.</dd>
<dt>Kijun-sen (ligne de base)</dt><dd>Même calcul sur 26 bougies. Tendance moyenne et support/résistance clé.</dd>
<dt>Senkou Span A</dt><dd>Moyenne de Tenkan et Kijun, projetée 26 bougies dans le futur.</dd>
<dt>Senkou Span B</dt><dd>Milieu du plus haut et du plus bas sur 52 bougies, projeté 26 bougies dans le futur.</dd>
<dt>Kumo (le nuage)</dt><dd>L'espace entre Span A et Span B. Vert quand A est au-dessus de B, rouge sinon.</dd>
<dt>Chikou Span</dt><dd>Le cours de clôture décalé de 26 bougies dans le passé. Il confirme quand il est libre au-dessus (ou en dessous) des prix passés.</dd>
</dl>
<h3>Lecture en 4 questions</h3>
<ol>
<li>Le prix est-il au-dessus, dans ou sous le nuage ? Au-dessus : biais haussier. Dans : indécision.</li>
<li>Tenkan est-elle au-dessus de Kijun ? Le croisement est un signal, plus fort s'il a lieu au-dessus du nuage.</li>
<li>Le nuage futur est-il vert ou rouge ? Il annonce la tendance attendue.</li>
<li>La Chikou est-elle libre au-dessus des prix d'il y a 26 bougies ?</li>
</ol>
<p class="tip">Un nuage épais est un support ou une résistance solide. Un nuage fin se traverse facilement.</p>`,
    live: (A, h) => {
      const i = A.ich, n = A.n;
      if (i.cloudNow.a == null || i.cloudNow.b == null) return "Pas assez d'historique pour Ichimoku (il faut au moins 78 bougies).";
      const top = Math.max(i.cloudNow.a, i.cloudNow.b), bot = Math.min(i.cloudNow.a, i.cloudNow.b);
      const pos = A.last > top ? "au-dessus du nuage (biais haussier)" : A.last < bot ? "sous le nuage (biais baissier)" : "dans le nuage (indécision)";
      const tk = i.tenkan[n] > i.kijun[n] ? "au-dessus" : "en dessous";
      const fut = i.cloudFuture.a > i.cloudFuture.b ? "vert" : "rouge";
      const ch = A.c[n - 26] != null ? (A.last > A.c[n - 26] ? "au-dessus" : "en dessous") : "non calculable";
      return `<b>${h.name}</b> est ${pos}, entre ${h.fmt(bot)} et ${h.fmt(top)}. Tenkan (${h.fmt(i.tenkan[n])}) est ${tk} de Kijun (${h.fmt(i.kijun[n])}). Le nuage projeté est ${fut}. La Chikou est ${ch} du prix d'il y a 26 bougies.`;
    },
  },
  {
    id: "stochastique", module: "indicateurs", title: "Stochastique", minutes: 4,
    body: `
<p>Le stochastique situe la clôture par rapport à la fourchette des 14 dernières bougies : 100 % si elle est au plus haut, 0 % si elle est au plus bas. La ligne %D est une moyenne à 3 de %K.</p>
<ul>
<li>Au-dessus de 80 : surachat. Sous 20 : survente.</li>
<li>Le signal le plus utilisé est le croisement de %K et %D en sortie de zone extrême.</li>
</ul>
<p>Plus nerveux que le RSI, il convient bien aux marchés sans tendance et aux unités de temps courtes.</p>`,
    live: (A, h) => {
      const k = A.st.k[A.n], d = A.st.d[A.n];
      if (k == null) return "Pas assez d'historique.";
      return `Stochastique de <b>${h.name}</b> : %K ${k.toFixed(0)}, %D ${d != null ? d.toFixed(0) : "—"}${k > 80 ? ", zone de surachat" : k < 20 ? ", zone de survente" : ""}.`;
    },
  },
  {
    id: "atr", module: "indicateurs", title: "ATR et placement du stop", minutes: 4,
    body: `
<p>L'ATR (Average True Range) mesure l'amplitude moyenne d'une bougie, écarts d'ouverture compris. Il ne donne aucune direction, seulement l'agitation du marché.</p>
<p>Usage principal : placer un stop hors du « bruit ». Un stop à moins d'un ATR de l'entrée risque d'être touché par une simple oscillation normale. Beaucoup de traders utilisent 1,5 à 2 ATR.</p>
<p>Il sert aussi à adapter la taille de position : quand l'ATR double, on divise la taille par deux pour garder le même risque.</p>`,
    live: (A, h) => `ATR 14 de <b>${h.name}</b> : ${h.fmt(A.atrNow)}. Un stop à 2 ATR sous le cours se situerait vers <b>${h.fmt(A.last - 2 * A.atrNow)}</b>, au-dessus vers <b>${h.fmt(A.last + 2 * A.atrNow)}</b> pour une vente.`,
  },
  {
    id: "volume", module: "indicateurs", title: "Le volume", minutes: 4,
    body: `
<p>Le volume compte les titres échangés pendant la bougie. Il mesure la conviction derrière un mouvement.</p>
<ul>
<li>Cassure d'une résistance <b>avec</b> un fort volume : plus crédible.</li>
<li>Hausse avec un volume qui baisse : l'intérêt s'essouffle.</li>
<li>Pic de volume après une longue baisse : parfois une capitulation, qui précède un rebond.</li>
</ul>
<p class="tip">Sur les indices et le forex, le volume affiché par les fournisseurs gratuits est incomplet ou absent. Il est plus fiable sur les actions et les cryptos.</p>`,
    live: (A, h) => {
      const v = A.b.slice(-21).map((x) => x.volume).filter((x) => x);
      if (v.length < 10) return `Le volume n'est pas disponible pour <b>${h.name}</b> chez notre fournisseur de données.`;
      const last = v.at(-1), avg = v.slice(0, -1).reduce((a, b) => a + b, 0) / (v.length - 1);
      return `Volume de la dernière bougie de <b>${h.name}</b> : ${Math.round(last / avg * 100)} % de la moyenne des 20 précédentes.`;
    },
  },

  // ───────────── INDICES ─────────────
  {
    id: "indices-intro", module: "indices", title: "À quoi sert un indice ?", minutes: 4,
    body: `
<p>Un indice boursier résume l'évolution d'un panier d'actions. Il sert de thermomètre à un marché et de référence pour juger une performance.</p>
<h3>Deux façons de pondérer</h3>
<ul>
<li><b>Par la capitalisation flottante</b> (CAC 40, S&P 500, DAX, Nasdaq) : les grandes entreprises pèsent plus. Seules les actions réellement échangeables comptent.</li>
<li><b>Par le prix</b> (Dow Jones, Nikkei 225) : une action à 500 $ pèse plus qu'une action à 50 $, quelle que soit la taille de l'entreprise.</li>
</ul>
<h3>Indice de prix ou de rendement ?</h3>
<p>La plupart des indices affichés (CAC 40, S&P 500) ignorent les dividendes. Le DAX est une exception : c'est un indice de performance qui les réinvestit, ce qui le favorise sur longue période.</p>
<p>On ne peut pas acheter un indice directement. On passe par un ETF (tracker), un future, un CFD ou un produit à levier.</p>`,
  },
  {
    id: "cac40", module: "indices", title: "CAC 40", minutes: 5, symbol: "^FCHI",
    body: `
<p>L'indice phare de la Bourse de Paris (Euronext Paris), créé fin 1987 avec une base de 1 000 points. Il regroupe 40 grandes valeurs choisies parmi les plus importantes et les plus échangées.</p>
<ul>
<li><b>Pondération</b> : capitalisation flottante, avec un plafond de 15 % par valeur.</li>
<li><b>Horaires</b> : 9h00 à 17h30, heure de Paris.</li>
<li><b>Révision</b> : la composition est revue chaque trimestre par un conseil scientifique.</li>
<li><b>Profil</b> : très exposé au luxe, à l'énergie, à l'aéronautique, à la banque et à l'industrie. Une grande partie du chiffre d'affaires des sociétés est réalisée hors de France, notamment en Asie et aux États-Unis.</li>
</ul>
<h3>Ce qui le fait bouger</h3>
<p>La politique de la BCE, la demande chinoise (pour le luxe), le prix du pétrole (pour l'énergie), la parité euro/dollar et l'ouverture de Wall Street à 15h30.</p>`,
  },
  {
    id: "sp500", module: "indices", title: "S&P 500", minutes: 5, symbol: "^GSPC",
    body: `
<p>L'indice de référence mondial : environ 500 grandes entreprises américaines sélectionnées par un comité de S&P Dow Jones Indices. Elles pèsent une très grande part de la capitalisation boursière des États-Unis.</p>
<ul>
<li><b>Pondération</b> : capitalisation flottante, sans plafond. Les géants de la technologie y pèsent donc très lourd.</li>
<li><b>Horaires</b> : 9h30 à 16h00 à New York, soit 15h30 à 22h00 à Paris (avec un décalage d'une heure quelques semaines par an lors des changements d'heure).</li>
<li><b>Critères d'entrée</b> : taille, liquidité et bénéfices positifs.</li>
</ul>
<h3>Ce qui le fait bouger</h3>
<p>Les décisions de la Fed, l'inflation (CPI), l'emploi (rapport mensuel), les résultats trimestriels des grandes sociétés et les taux à 10 ans.</p>`,
  },
  {
    id: "nasdaq", module: "indices", title: "Nasdaq Composite et Nasdaq-100", minutes: 5, symbol: "^IXIC",
    body: `
<p>Le Nasdaq est d'abord une bourse électronique américaine, très tournée vers la technologie. Deux indices en portent le nom :</p>
<ul>
<li><b>Nasdaq Composite</b> : toutes les actions cotées sur le Nasdaq, soit plusieurs milliers. Base 100 en 1971.</li>
<li><b>Nasdaq-100</b> : les 100 plus grandes sociétés non financières du Nasdaq. C'est celui que suivent la plupart des ETF et futures (le « NQ »).</li>
</ul>
<p><b>Profil</b> : technologie, semi-conducteurs, internet, biotechnologies. Plus volatil que le S&P 500. Il réagit fortement aux taux d'intérêt, car la valeur des entreprises de croissance repose sur des bénéfices futurs que des taux élevés déprécient.</p>`,
  },
  {
    id: "dow", module: "indices", title: "Dow Jones Industrial Average", minutes: 4, symbol: "^DJI",
    body: `
<p>Le plus ancien indice américain encore calculé (1896). Il ne compte que 30 grandes entreprises.</p>
<ul>
<li><b>Pondération par le prix</b> : une action chère pèse plus, quelle que soit la taille de la société. C'est une méthode critiquée, mais l'indice reste très médiatisé.</li>
<li>Il représente surtout les grandes valeurs « historiques » de l'économie américaine.</li>
</ul>
<p>Pour juger le marché américain, le S&P 500 est plus représentatif. Le Dow reste utile pour comparer valeurs défensives et valeurs technologiques.</p>`,
  },
  {
    id: "dax", module: "indices", title: "DAX", minutes: 4, symbol: "^GDAXI",
    body: `
<p>L'indice vedette de la Bourse de Francfort. Il est passé de 30 à <b>40 valeurs</b> en septembre 2021.</p>
<ul>
<li><b>Indice de performance</b> : les dividendes sont réinvestis dans le calcul, contrairement au CAC 40.</li>
<li><b>Horaires</b> (Xetra) : 9h00 à 17h30.</li>
<li><b>Profil</b> : industrie, automobile, chimie, assurance, logiciels. Très sensible au commerce mondial et à la conjoncture chinoise.</li>
</ul>`,
  },
  {
    id: "stoxx50", module: "indices", title: "Euro Stoxx 50", minutes: 4, symbol: "^STOXX50E",
    body: `
<p>Les 50 plus grandes capitalisations de la zone euro, toutes places confondues (Paris, Francfort, Amsterdam, Madrid, Milan…). C'est la référence pour investir sur l'ensemble de la zone euro. La France et l'Allemagne y pèsent le plus.</p>
<p>Il réagit fortement aux décisions de la BCE et aux écarts de taux entre pays de la zone euro.</p>`,
  },
  {
    id: "autres", module: "indices", title: "FTSE 100 et Nikkei 225", minutes: 4, symbol: "^N225",
    body: `
<dl>
<dt>FTSE 100 (Londres)</dt><dd>Les 100 plus grandes capitalisations britanniques. Très exposé aux matières premières, à l'énergie, à la pharmacie et aux banques. Il monte souvent quand la livre baisse, car beaucoup de sociétés réalisent leurs revenus en dollars.</dd>
<dt>Nikkei 225 (Tokyo)</dt><dd>225 valeurs japonaises, pondérées par le prix comme le Dow Jones. Très sensible au yen : un yen faible favorise les exportateurs. Il cote pendant la nuit européenne et donne souvent le ton de l'ouverture à Paris.</dd>
</dl>`,
  },
];
