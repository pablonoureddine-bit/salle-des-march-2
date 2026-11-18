// Annuaire des grandes entreprises cotées, classées par pays, avec une courte présentation de leur activité.
// Un clic ouvre la fiche complète (bilans, prévisionnel). Cours et variation du jour mis à jour en direct.
import { $, el, api, fmt, pct, dir, store } from "./util.js";
import { assetVisual } from "./visuals.js";

// [symbole Yahoo, nom, secteur, présentation]
export const COUNTRIES = [
  { id: "fr", name: "France", flag: "fr", list: [
    ["MC.PA", "LVMH", "Luxe", "Numéro un mondial du luxe : mode et maroquinerie, vins et spiritueux, parfums, montres et joaillerie."],
    ["RMS.PA", "Hermès", "Luxe", "Maison de luxe familiale connue pour ses sacs en cuir, ses carrés de soie et son savoir-faire artisanal."],
    ["KER.PA", "Kering", "Luxe", "Groupe de maisons de mode de luxe, dont Gucci et Saint Laurent."],
    ["OR.PA", "L'Oréal", "Cosmétiques", "Leader mondial de la beauté : maquillage, soins de la peau et des cheveux, parfums."],
    ["TTE.PA", "TotalEnergies", "Énergie", "Producteur de pétrole et de gaz qui développe aussi l'électricité et les énergies renouvelables."],
    ["AIR.PA", "Airbus", "Aéronautique", "Constructeur européen d'avions de ligne, d'hélicoptères et d'équipements spatiaux."],
    ["SAF.PA", "Safran", "Aéronautique", "Moteurs d'avions, trains d'atterrissage et équipements embarqués."],
    ["SAN.PA", "Sanofi", "Santé", "Laboratoire pharmaceutique : médicaments, vaccins et traitements des maladies rares."],
    ["EL.PA", "EssilorLuxottica", "Santé", "Verres correcteurs, montures et lunettes de soleil, avec un vaste réseau de magasins d'optique."],
    ["AI.PA", "Air Liquide", "Chimie", "Gaz pour l'industrie et la santé : oxygène, azote, hydrogène."],
    ["SU.PA", "Schneider Electric", "Industrie", "Gestion de l'énergie et automatismes pour les bâtiments, les usines et les centres de données."],
    ["DG.PA", "Vinci", "Construction", "Construction et concessions : autoroutes, aéroports, grands chantiers."],
    ["BNP.PA", "BNP Paribas", "Banque", "Grande banque européenne : banque de détail, financement des entreprises, gestion d'actifs."],
    ["ORA.PA", "Orange", "Télécoms", "Opérateur de téléphonie et d'internet en France, en Europe et en Afrique."],
  ] },
  { id: "de", name: "Allemagne", flag: "de", list: [
    ["SAP.DE", "SAP", "Logiciels", "Logiciels de gestion pour les entreprises (comptabilité, achats, ressources humaines), de plus en plus dans le cloud."],
    ["SIE.DE", "Siemens", "Industrie", "Automatisation des usines, infrastructures, logiciels industriels et ferroviaire."],
    ["ALV.DE", "Allianz", "Assurance", "L'un des plus grands assureurs et gestionnaires d'actifs du monde."],
    ["DTE.DE", "Deutsche Telekom", "Télécoms", "Opérateur allemand, actionnaire principal de T-Mobile aux États-Unis."],
    ["MBG.DE", "Mercedes-Benz", "Automobile", "Voitures et utilitaires haut de gamme."],
    ["BMW.DE", "BMW", "Automobile", "Voitures BMW, Mini et Rolls-Royce, motos BMW."],
    ["VOW3.DE", "Volkswagen", "Automobile", "Premier constructeur européen : Volkswagen, Audi, Porsche, Skoda, Seat…"],
    ["BAS.DE", "BASF", "Chimie", "Le plus grand groupe de chimie au monde : matériaux, produits pour l'agriculture et l'industrie."],
    ["ADS.DE", "Adidas", "Consommation", "Chaussures, vêtements et équipements de sport."],
  ] },
  { id: "nl", name: "Pays-Bas", flag: "nl", list: [
    ["ASML.AS", "ASML", "Semi-conducteurs", "Fabrique les machines de lithographie indispensables pour graver les puces électroniques les plus avancées."],
    ["PRX.AS", "Prosus", "Internet", "Investisseur dans les sociétés technologiques, important actionnaire de Tencent."],
    ["INGA.AS", "ING", "Banque", "Banque néerlandaise très présente en Europe, pionnière de la banque en ligne."],
    ["HEIA.AS", "Heineken", "Boissons", "Deuxième brasseur mondial."],
    ["AD.AS", "Ahold Delhaize", "Distribution", "Chaînes de supermarchés en Europe et aux États-Unis."],
  ] },
  { id: "gb", name: "Royaume-Uni", flag: "gb", list: [
    ["AZN.L", "AstraZeneca", "Santé", "Laboratoire pharmaceutique : cancer, maladies cardiaques et respiratoires."],
    ["SHEL.L", "Shell", "Énergie", "Géant du pétrole et du gaz, premier négociant mondial de gaz naturel liquéfié."],
    ["BP.L", "BP", "Énergie", "Groupe pétrolier et gazier britannique."],
    ["HSBA.L", "HSBC", "Banque", "Grande banque internationale, très présente en Asie."],
    ["ULVR.L", "Unilever", "Consommation", "Produits du quotidien : hygiène, entretien, alimentation."],
    ["RIO.L", "Rio Tinto", "Mines", "Extraction de minerai de fer, de cuivre et d'aluminium."],
    ["GSK.L", "GSK", "Santé", "Laboratoire pharmaceutique, l'un des leaders mondiaux des vaccins."],
    ["DGE.L", "Diageo", "Boissons", "Numéro un mondial des spiritueux (whiskies, bières stout, gins…)."],
  ] },
  { id: "ch", name: "Suisse", flag: "ch", list: [
    ["NESN.SW", "Nestlé", "Alimentation", "Premier groupe alimentaire mondial : café, produits laitiers, petfood, nutrition."],
    ["ROG.SW", "Roche", "Santé", "Médicaments contre le cancer et leader mondial des tests de diagnostic."],
    ["NOVN.SW", "Novartis", "Santé", "Laboratoire pharmaceutique centré sur les médicaments innovants."],
    ["UBSG.SW", "UBS", "Banque", "Première banque suisse, spécialiste de la gestion de fortune."],
    ["CFR.SW", "Richemont", "Luxe", "Joaillerie et horlogerie de luxe."],
  ] },
  { id: "it", name: "Italie", flag: "it", list: [
    ["RACE.MI", "Ferrari", "Automobile", "Voitures de sport de luxe produites en petites séries, et écurie de Formule 1."],
    ["STLAM.MI", "Stellantis", "Automobile", "Constructeur né de la fusion PSA–Fiat Chrysler : Peugeot, Citroën, Fiat, Jeep…"],
    ["ENEL.MI", "Enel", "Électricité", "Producteur et distributeur d'électricité, grand acteur des renouvelables."],
    ["ENI.MI", "Eni", "Énergie", "Groupe pétrolier et gazier italien."],
    ["ISP.MI", "Intesa Sanpaolo", "Banque", "Première banque italienne."],
  ] },
  { id: "es", name: "Espagne", flag: "es", list: [
    ["ITX.MC", "Inditex", "Distribution", "Leader mondial de la mode à petits prix, maison mère de Zara."],
    ["IBE.MC", "Iberdrola", "Électricité", "Grand producteur d'électricité renouvelable (éolien, solaire)."],
    ["SAN.MC", "Banco Santander", "Banque", "Grande banque présente en Europe et en Amérique latine."],
    ["BBVA.MC", "BBVA", "Banque", "Banque espagnole très implantée au Mexique."],
  ] },
  { id: "nord", name: "Pays nordiques", flag: "dk", list: [
    ["NOVO-B.CO", "Novo Nordisk", "Santé", "Danois, leader des traitements du diabète et de l'obésité."],
    ["ERIC-B.ST", "Ericsson", "Télécoms", "Suédois, fabricant d'équipements pour les réseaux mobiles (4G, 5G)."],
    ["VOLV-B.ST", "Volvo", "Industrie", "Suédois, camions, bus et engins de chantier."],
    ["ATCO-A.ST", "Atlas Copco", "Industrie", "Suédois, compresseurs, outils et équipements industriels."],
  ] },
  { id: "us", name: "États-Unis", flag: "us", list: [
    ["AAPL", "Apple", "Technologie", "iPhone, Mac, iPad et services (App Store, musique, paiement)."],
    ["MSFT", "Microsoft", "Logiciels", "Windows, Office, cloud Azure et intelligence artificielle."],
    ["NVDA", "Nvidia", "Semi-conducteurs", "Puces graphiques et processeurs qui font tourner l'intelligence artificielle."],
    ["AMZN", "Amazon", "Commerce en ligne", "Premier site marchand mondial et leader du cloud avec AWS."],
    ["GOOGL", "Alphabet", "Internet", "Maison mère de Google, YouTube et Android ; revenus tirés surtout de la publicité."],
    ["META", "Meta", "Internet", "Facebook, Instagram et WhatsApp ; revenus tirés de la publicité."],
    ["TSLA", "Tesla", "Automobile", "Voitures électriques, batteries et stockage d'énergie."],
    ["BRK-B", "Berkshire Hathaway", "Holding", "Holding de Warren Buffett : assurance, chemin de fer, énergie et participations."],
    ["JPM", "JPMorgan Chase", "Banque", "Première banque américaine."],
    ["V", "Visa", "Paiements", "Réseau mondial de paiement par carte."],
    ["LLY", "Eli Lilly", "Santé", "Laboratoire pharmaceutique en pointe sur le diabète et l'obésité."],
    ["JNJ", "Johnson & Johnson", "Santé", "Médicaments et dispositifs médicaux."],
    ["XOM", "ExxonMobil", "Énergie", "Premier groupe pétrolier américain."],
    ["KO", "Coca-Cola", "Boissons", "Boissons sans alcool vendues dans le monde entier."],
    ["WMT", "Walmart", "Distribution", "Première chaîne de supermarchés au monde."],
  ] },
  { id: "ca", name: "Canada", flag: "ca", list: [
    ["RY.TO", "Banque Royale du Canada", "Banque", "Première banque canadienne."],
    ["SHOP.TO", "Shopify", "Logiciels", "Logiciels qui permettent aux commerçants de créer leur boutique en ligne."],
    ["ENB.TO", "Enbridge", "Énergie", "Réseau de pipelines de pétrole et de gaz en Amérique du Nord."],
    ["CNR.TO", "Canadien National", "Transport", "Grande compagnie de chemin de fer de marchandises."],
  ] },
  { id: "br", name: "Brésil", flag: "br", list: [
    ["PETR4.SA", "Petrobras", "Énergie", "Compagnie pétrolière contrôlée par l'État brésilien."],
    ["VALE3.SA", "Vale", "Mines", "L'un des premiers producteurs mondiaux de minerai de fer."],
    ["ITUB4.SA", "Itaú Unibanco", "Banque", "Première banque privée d'Amérique latine."],
  ] },
  { id: "jp", name: "Japon", flag: "jp", list: [
    ["7203.T", "Toyota", "Automobile", "Premier constructeur automobile mondial en nombre de véhicules, pionnier de l'hybride."],
    ["6758.T", "Sony", "Technologie", "Consoles PlayStation, capteurs photo, musique et cinéma."],
    ["7974.T", "Nintendo", "Jeux vidéo", "Consoles et jeux vidéo, avec des licences très connues."],
    ["6861.T", "Keyence", "Industrie", "Capteurs et systèmes de mesure pour l'automatisation des usines."],
    ["8306.T", "Mitsubishi UFJ", "Banque", "Première banque japonaise."],
    ["9984.T", "SoftBank Group", "Investissement", "Investisseur dans les sociétés technologiques du monde entier."],
  ] },
  { id: "cn", name: "Chine et Hong Kong", flag: "cn", list: [
    ["0700.HK", "Tencent", "Internet", "Messagerie WeChat, jeux vidéo, paiement et cloud."],
    ["9988.HK", "Alibaba", "Commerce en ligne", "Plateformes de commerce en ligne et cloud en Chine."],
    ["1211.HK", "BYD", "Automobile", "Voitures électriques et hybrides, batteries."],
    ["3690.HK", "Meituan", "Internet", "Livraison de repas et services de proximité en Chine."],
    ["1299.HK", "AIA", "Assurance", "Assureur vie présent dans toute l'Asie."],
  ] },
  { id: "kr", name: "Corée du Sud", flag: "kr", list: [
    ["005930.KS", "Samsung Electronics", "Technologie", "Smartphones, écrans et puces mémoire."],
    ["000660.KS", "SK Hynix", "Semi-conducteurs", "Puces mémoire, notamment celles utilisées pour l'IA."],
    ["005380.KS", "Hyundai Motor", "Automobile", "Constructeur automobile coréen (Hyundai, Kia, Genesis)."],
  ] },
  { id: "tw", name: "Taïwan", flag: "tw", list: [
    ["2330.TW", "TSMC", "Semi-conducteurs", "Premier fabricant mondial de puces pour le compte d'autres sociétés (Apple, Nvidia…)."],
    ["2317.TW", "Hon Hai (Foxconn)", "Technologie", "Premier assembleur mondial d'appareils électroniques."],
  ] },
  { id: "in", name: "Inde", flag: "in", list: [
    ["RELIANCE.NS", "Reliance Industries", "Conglomérat", "Raffinage, pétrochimie, télécoms et grande distribution."],
    ["TCS.NS", "Tata Consultancy Services", "Services informatiques", "Services informatiques et conseil pour les grandes entreprises."],
    ["INFY.NS", "Infosys", "Services informatiques", "Développement de logiciels et services numériques."],
    ["HDFCBANK.NS", "HDFC Bank", "Banque", "Première banque privée indienne."],
  ] },
  { id: "au", name: "Australie", flag: "au", list: [
    ["BHP.AX", "BHP", "Mines", "Géant minier : minerai de fer, cuivre, charbon métallurgique."],
    ["CBA.AX", "Commonwealth Bank", "Banque", "Première banque australienne."],
    ["CSL.AX", "CSL", "Santé", "Biotechnologies : produits issus du plasma sanguin et vaccins."],
  ] },
];

let ctx, country = store.get("sdm.annu", "fr"), sector = "Tous", q = "", quotes = new Map(), timer = null;

export function init(c) {
  ctx = c;
  $("annu-search").addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); render(); });
}

export function show() {
  render(); refresh();
  clearInterval(timer);
  timer = setInterval(() => { if ($("view-annuaire").hidden) { clearInterval(timer); return; } if (!document.hidden) refresh(); }, 15000);
}

const current = () => (q ? COUNTRIES.flatMap((c) => c.list.map((x) => [...x, c])) : COUNTRIES.find((c) => c.id === country).list.map((x) => [...x, COUNTRIES.find((c) => c.id === country)]));

async function refresh() {
  const syms = current().map((x) => x[0]).slice(0, 80);
  try {
    const res = await api("/api/quotes?symbols=" + encodeURIComponent(syms.join(",")));
    for (const r of res) if (r.price != null) quotes.set(r.symbol, r);
  } catch {}
  render();
}

function flag(cc) { const i = el("img", { src: `https://flagcdn.com/w40/${cc}.png`, alt: "", width: "20", height: "14", loading: "lazy" }); i.onerror = () => i.remove(); return i; }

function render() {
  $("annu-countries").replaceChildren(...COUNTRIES.map((c) => el("button", { class: c.id === country && !q ? "on" : "", onclick: () => { country = c.id; store.set("sdm.annu", c.id); sector = "Tous"; q = ""; $("annu-search").value = ""; render(); refresh(); } },
    flag(c.flag), c.name, el("small", null, String(c.list.length)))));
  let rows = current();
  if (q) rows = rows.filter(([s, n, sec, bio, c]) => (s + " " + n + " " + sec + " " + bio + " " + c.name).toLowerCase().includes(q));
  const sectors = ["Tous", ...new Set(rows.map((r) => r[2]))];
  if (!sectors.includes(sector)) sector = "Tous";
  $("annu-sectors").replaceChildren(...sectors.map((s) => el("button", { class: s === sector ? "on" : "", onclick: () => { sector = s; render(); } }, s)));
  if (sector !== "Tous") rows = rows.filter((r) => r[2] === sector);
  $("annu-title").textContent = q ? `${rows.length} résultat${rows.length > 1 ? "s" : ""} pour « ${q} »` : `${COUNTRIES.find((c) => c.id === country).name} · ${rows.length} entreprise${rows.length > 1 ? "s" : ""}`;
  $("annu-grid").replaceChildren(...(rows.length ? rows.map(([s, n, sec, bio, c]) => {
    const qt = quotes.get(s), ch = qt?.price != null && qt.previousClose ? qt.price / qt.previousClose - 1 : null;
    return el("article", { class: "annu-card", tabindex: "0", role: "link", "aria-label": `Fiche de ${n}`, onclick: () => ctx.company(s), onkeydown: (e) => e.key === "Enter" && ctx.company(s) },
      el("div", { class: "annu-top" }, assetVisual(s, n, 42),
        el("div", { class: "annu-id" }, el("b", null, n), el("small", null, flag(c.flag), ` ${s}`)),
        el("div", { class: "annu-px" }, el("span", { class: "mono" }, qt?.price != null ? fmt(qt.price) : "…"), ch != null ? el("span", { class: "chip " + dir(ch) }, pct(ch)) : null)),
      el("span", { class: "annu-sector" }, sec),
      el("p", null, bio),
      el("div", { class: "annu-actions" },
        el("span", { class: "linkbtn" }, "Voir la fiche →"),
        el("button", { class: "btn-soft", onclick: (e) => { e.stopPropagation(); ctx.full(s, n); } }, "Graphique"),
        el("button", { class: "btn-soft", onclick: (e) => { e.stopPropagation(); ctx.trade(s, n); } }, "Trader")));
  }) : [el("p", { class: "muted" }, "Aucune entreprise ne correspond.")]));
}
