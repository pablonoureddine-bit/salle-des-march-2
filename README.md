# Salle des marchés

Outil de support pour traders, en français :

- **Marchés** : graphique en chandeliers mis à jour toutes les 10 secondes, sur l'actif de ton choix (indices, actions, crypto, forex, matières premières), en 15 min, 1 h, 1 jour ou 1 semaine.
- **Analyse technique** automatique : moyennes mobiles 20/50/200, RSI, MACD, Bollinger, Ichimoku, Fibonacci, stochastique, ATR, supports et résistances, et un score de synthèse de −100 à +100.
- **Actualités** : titres récents de Boursorama, BFM Business, Bloomberg, Les Échos, Zonebourse, Investing.com, Le Figaro et Reuters, plus les actus propres à l'actif affiché.
- **Académie** : 23 leçons (bases du trading, indicateurs, grands indices). Chaque leçon affiche ce que l'indicateur dit **en ce moment** sur l'actif suivi.
- **Anticipations par Claude** : trois scénarios chiffrés (haussier, central, baissier) à partir des indicateurs et des derniers titres de presse.
- **Monde** : plus de 55 marchés rafraîchis toutes les 20 secondes (indices d'Europe, d'Amériques et d'Asie, taux US, devises, matières premières, cryptos).
- **Prédictions IA en continu** : toutes les heures, Claude relit les actus et les indicateurs de 15 actifs et met à jour sa prédiction à 1–5 séances. Les navigateurs ouverts la reçoivent en direct. Chaque prédiction est jugée après 7 jours pour afficher un taux de réussite réel.
- **Entreprises** : profil, comptes annuels sur 5 ans (compte de résultat, bilan, flux de trésorerie), ratios et publications de résultats.

## Lancer en local

Il faut [Node.js](https://nodejs.org) version 20 ou plus.

```bash
npm install
npm start
```

Puis ouvre http://localhost:3000.

Sans connexion aux marchés (pour développer) : `npm run dev`. Les cours et les actus sont alors fictifs, et un bandeau le signale.

## Mettre en ligne sur Render (gratuit)

1. Crée un compte sur [render.com](https://render.com) avec ton compte GitHub.
2. **New → Blueprint**, puis choisis ce dépôt. Render lit le fichier `render.yaml`.
3. Quand Render le demande, colle ta clé API Anthropic dans `ANTHROPIC_API_KEY` (à créer sur [console.anthropic.com](https://console.anthropic.com)). Sans clé, tout fonctionne sauf l'analyse par Claude.
4. Render te donne une adresse en `https://salle-des-marches-xxxx.onrender.com`.

En offre gratuite, le site s'endort après 15 minutes sans visite. Le premier chargement suivant prend alors environ 30 secondes.

## Variables d'environnement

Voir `.env.example` : clé Anthropic (`ANTHROPIC_API_KEY`), clé Financial Modeling Prep (`FMP_API_KEY`) et réglages des prédictions.

## Coûts des prédictions IA

Une prédiction n'est recalculée que si les actus ou le prix de l'actif ont changé, ou si elle a plus de 6 heures. Avec les réglages par défaut (15 actifs, toutes les heures), compte de l'ordre de 50 à 150 € par mois d'API Claude. Pour réduire : moins d'actifs (`PRED_SYMBOLS`), un intervalle plus long (`PRED_INTERVAL_MIN`) ou un modèle moins cher (`PRED_MODEL=claude-haiku-5-5`).

Sur l'offre gratuite de Render, le serveur s'endort sans visite : les prédictions ne tournent alors pas, et leur historique est perdu à chaque redémarrage. Pour un fonctionnement continu, passe à une offre payante avec un disque persistant monté sur `DATA_DIR`.

## Coûts de l'analyse IA

Chaque analyse appelle Claude Opus 5.5 et coûte quelques centimes. Pour protéger ta facture, le serveur limite à 10 analyses par heure et par visiteur (`AI_LIMIT_PER_HOUR`). Fixe aussi une limite de dépense dans la console Anthropic.

## Sources de données

| Donnée | Source | Remarque |
|---|---|---|
| Cours | Yahoo Finance (API publique non officielle) | Gratuit, sans clé. Selon les places, les cours peuvent avoir 15 minutes de retard. La crypto est en temps réel. |
| Actus | Google News RSS, filtré par journal | Seuls les titres et les liens sont affichés. Les articles s'ouvrent sur le site du journal. |
| Bilans et ratios | Financial Modeling Prep | Comptes repris des publications officielles des sociétés. Offre payante nécessaire pour les actions hors États-Unis. |

**Avant d'ouvrir l'outil au public ou de le faire payer**, remplace Yahoo Finance par un fournisseur sous licence : Twelve Data, Polygon.io, EODHD ou Financial Modeling Prep. Seul le fichier `lib/market.js` est à modifier. Pour les actus, vérifie les conditions d'utilisation de chaque source.

## Structure

```
server.js            serveur Express et routes /api/*
lib/market.js        cours, recherche d'actifs (Yahoo Finance)
lib/news.js          actualités (Google News RSS)
lib/ai.js            appels à Claude (API Anthropic)
lib/predictions.js   moteur de prédictions en continu et suivi du taux de réussite
lib/fundamentals.js  fiches entreprises (Financial Modeling Prep)
lib/live.js          diffusion en direct vers les navigateurs (Server-Sent Events)
lib/mock.js          données fictives pour MOCK=1
public/index.html    interface
public/app.js        logique de l'interface, graphiques, direct
public/indicators.js calcul des indicateurs techniques
public/academy.js    contenu des leçons
public/universe.js   liste des marchés suivis
public/monde.js      vue Monde
public/predictions.js vue Prédictions IA
public/entreprise.js vue Entreprises
```

## Avertissement

Cet outil aide à réfléchir. Il ne donne pas de conseil en investissement. Le trading comporte un risque de perte en capital.
