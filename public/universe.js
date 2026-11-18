// Univers des actifs suivis (symboles Yahoo Finance). Partagé par le navigateur et le serveur.

// Tableau de bord mondial, par région et par classe d'actifs.
export const WORLD = [
  { id: "europe", title: "Europe", items: [
    ["^FCHI", "CAC 40", "France"], ["^SBF120", "SBF 120", "France"], ["^GDAXI", "DAX", "Allemagne"],
    ["^FTSE", "FTSE 100", "Royaume-Uni"], ["^STOXX50E", "Euro Stoxx 50", "Zone euro"], ["^STOXX", "Stoxx Europe 600", "Europe"],
    ["^IBEX", "IBEX 35", "Espagne"], ["FTSEMIB.MI", "FTSE MIB", "Italie"], ["^AEX", "AEX", "Pays-Bas"],
    ["^SSMI", "SMI", "Suisse"], ["^BFX", "BEL 20", "Belgique"], ["^OMX", "OMX Stockholm 30", "Suède"]] },
  { id: "ameriques", title: "Amériques", items: [
    ["^GSPC", "S&P 500", "États-Unis"], ["^DJI", "Dow Jones", "États-Unis"], ["^IXIC", "Nasdaq Composite", "États-Unis"],
    ["^NDX", "Nasdaq 100", "États-Unis"], ["^RUT", "Russell 2000", "États-Unis"], ["^VIX", "VIX (volatilité)", "États-Unis"],
    ["^GSPTSE", "S&P/TSX", "Canada"], ["^BVSP", "Bovespa", "Brésil"], ["^MXX", "IPC", "Mexique"]] },
  { id: "asie", title: "Asie-Pacifique", items: [
    ["^N225", "Nikkei 225", "Japon"], ["^HSI", "Hang Seng", "Hong Kong"], ["000001.SS", "Shanghai Composite", "Chine"],
    ["^KS11", "KOSPI", "Corée du Sud"], ["^TWII", "Taiex", "Taïwan"], ["^BSESN", "Sensex", "Inde"],
    ["^NSEI", "Nifty 50", "Inde"], ["^AXJO", "S&P/ASX 200", "Australie"], ["^NZ50", "NZX 50", "Nouvelle-Zélande"],
    ["^STI", "Straits Times", "Singapour"], ["^JKSE", "IDX Composite", "Indonésie"], ["^KLSE", "FTSE Bursa Malaysia KLCI", "Malaisie"], ["^SET.BK", "SET", "Thaïlande"]] },
  { id: "taux", title: "Taux d'intérêt US", items: [
    ["^IRX", "Taux 3 mois", "États-Unis"], ["^FVX", "Taux 5 ans", "États-Unis"], ["^TNX", "Taux 10 ans", "États-Unis"], ["^TYX", "Taux 30 ans", "États-Unis"]] },
  { id: "devises", title: "Devises", items: [
    ["EURUSD=X", "EUR/USD"], ["GBPUSD=X", "GBP/USD"], ["USDJPY=X", "USD/JPY"], ["USDCHF=X", "USD/CHF"],
    ["EURGBP=X", "EUR/GBP"], ["AUDUSD=X", "AUD/USD"], ["USDCAD=X", "USD/CAD"], ["USDCNY=X", "USD/CNY"], ["DX-Y.NYB", "Indice dollar (DXY)"]] },
  { id: "matieres", title: "Matières premières", items: [
    ["GC=F", "Or"], ["SI=F", "Argent"], ["HG=F", "Cuivre"], ["BZ=F", "Pétrole Brent"], ["CL=F", "Pétrole WTI"],
    ["NG=F", "Gaz naturel"], ["ZW=F", "Blé"], ["ZC=F", "Maïs"]] },
  { id: "crypto", title: "Cryptomonnaies", items: [
    ["BTC-USD", "Bitcoin"], ["ETH-USD", "Ethereum"], ["SOL-USD", "Solana"], ["XRP-USD", "XRP"], ["BNB-USD", "BNB"]] },
];

// Actions mises en avant dans la liste de gauche et dans "Entreprises".
export const STOCKS = [
  { group: "Actions Paris", items: [["MC.PA", "LVMH"], ["TTE.PA", "TotalEnergies"], ["AIR.PA", "Airbus"], ["BNP.PA", "BNP Paribas"], ["OR.PA", "L'Oréal"], ["SAN.PA", "Sanofi"], ["SU.PA", "Schneider Electric"], ["RMS.PA", "Hermès"]] },
  { group: "Actions US", items: [["AAPL", "Apple"], ["NVDA", "Nvidia"], ["MSFT", "Microsoft"], ["AMZN", "Amazon"], ["GOOGL", "Alphabet"], ["META", "Meta"], ["TSLA", "Tesla"]] },
  { group: "Actions Europe", items: [["ASML.AS", "ASML"], ["SAP.DE", "SAP"], ["NOVO-B.CO", "Novo Nordisk"], ["NESN.SW", "Nestlé"]] },
];

// Liste de gauche de la page Marchés.
export const WATCH = [
  { group: "Indices", items: [["^FCHI", "CAC 40"], ["^STOXX50E", "Euro Stoxx 50"], ["^GDAXI", "DAX"], ["^GSPC", "S&P 500"], ["^IXIC", "Nasdaq Composite"], ["^NDX", "Nasdaq 100"], ["^DJI", "Dow Jones"], ["^N225", "Nikkei 225"]] },
  ...STOCKS.slice(0, 2),
  { group: "Crypto", items: [["BTC-USD", "Bitcoin"], ["ETH-USD", "Ethereum"]] },
  { group: "Forex", items: [["EURUSD=X", "EUR/USD"], ["USDJPY=X", "USD/JPY"]] },
  { group: "Matières premières", items: [["GC=F", "Or"], ["BZ=F", "Pétrole Brent"]] },
];

export const KNOWN = new Map([
  ...WORLD.flatMap((g) => g.items.map(([s, n]) => [s, n])),
  ...STOCKS.flatMap((g) => g.items),
]);

export const TICKER = ["^FCHI", "^GDAXI", "^STOXX50E", "^GSPC", "^IXIC", "^N225", "^TNX", "BTC-USD", "EURUSD=X", "GC=F", "BZ=F"];

// Actifs couverts par les prédictions IA automatiques (modifiable avec PRED_SYMBOLS).
export const PRED_DEFAULT = ["^FCHI", "^GDAXI", "^STOXX50E", "^GSPC", "^IXIC", "^N225", "EURUSD=X", "GC=F", "BZ=F", "BTC-USD", "MC.PA", "TTE.PA", "AIR.PA", "NVDA", "AAPL"];

// Classe d'actif déduite du symbole.
export function assetClass(symbol) {
  if (symbol.startsWith("^") || symbol === "000001.SS" || symbol === "FTSEMIB.MI") return "indice";
  if (symbol.endsWith("=X") || symbol === "DX-Y.NYB") return "devise";
  if (symbol.endsWith("=F")) return "matiere";
  if (/-USD$|-EUR$/.test(symbol)) return "crypto";
  return "action";
}
