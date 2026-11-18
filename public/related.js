// Actifs probablement touchés par une information, déduits des mots du titre.
// Simple et transparent : noms d'entreprises, d'indices, de devises et thèmes (pétrole, taux, crypto…).
const RULES = [
  // Entreprises
  [/nvidia/i, ["NVDA", "^NDX"]], [/\bapple\b|iphone/i, ["AAPL", "^NDX"]], [/microsoft/i, ["MSFT"]], [/amazon/i, ["AMZN"]],
  [/alphabet|google/i, ["GOOGL"]], [/\bmeta\b|facebook|instagram/i, ["META"]], [/tesla|musk/i, ["TSLA"]],
  [/lvmh|louis vuitton|arnault/i, ["MC.PA", "^FCHI"]], [/herm[eè]s/i, ["RMS.PA"]], [/l'or[ée]al/i, ["OR.PA"]],
  [/totalenergies|\btotal\b/i, ["TTE.PA", "BZ=F"]], [/airbus/i, ["AIR.PA"]], [/bnp/i, ["BNP.PA"]], [/sanofi/i, ["SAN.PA"]],
  [/schneider/i, ["SU.PA"]], [/asml/i, ["ASML.AS"]], [/\bsap\b/i, ["SAP.DE"]], [/novo nordisk|wegovy|ozempic/i, ["NOVO-B.CO"]], [/nestl[ée]/i, ["NESN.SW"]],
  // Indices et places
  [/cac ?40|bourse de paris|paris bourse/i, ["^FCHI"]], [/\bdax\b|francfort|allemagne|germany/i, ["^GDAXI"]],
  [/euro ?stoxx|zone euro|eurozone/i, ["^STOXX50E"]], [/ftse|londres|london|royaume-uni|\buk\b/i, ["^FTSE"]],
  [/wall street|s&p|dow jones|\bdow\b/i, ["^GSPC", "^DJI"]], [/nasdaq|tech stocks|valeurs technologiques/i, ["^IXIC"]],
  [/nikkei|japon|japan|tokyo|\bboj\b|banque du japon/i, ["^N225", "USDJPY=X"]], [/hang seng|hong kong/i, ["^HSI"]],
  [/chine|china|p[ée]kin|beijing|shanghai/i, ["000001.SS", "^HSI"]], [/inde\b|india|sensex|nifty/i, ["^BSESN"]],
  [/australie|australia|asx/i, ["^AXJO"]], [/cor[ée]e|korea|kospi/i, ["^KS11"]],
  // Banques centrales, taux, inflation
  [/\bfed\b|r[ée]serve f[ée]d[ée]rale|powell|fomc/i, ["^GSPC", "^TNX", "EURUSD=X", "GC=F"]],
  [/\bbce\b|\becb\b|lagarde/i, ["EURUSD=X", "^STOXX50E"]], [/inflation|\bcpi\b|prix [àa] la consommation/i, ["^TNX", "^GSPC", "GC=F"]],
  [/taux|rate|treasur|obligat|yield|bond/i, ["^TNX"]], [/emploi|ch[ôo]mage|payrolls|\bnfp\b|jobs/i, ["^GSPC", "EURUSD=X"]],
  // Devises
  [/dollar/i, ["DX-Y.NYB", "EURUSD=X"]], [/\beuro\b/i, ["EURUSD=X"]], [/\byen\b/i, ["USDJPY=X"]], [/livre sterling|pound|sterling/i, ["GBPUSD=X"]],
  // Matières premières
  [/p[ée]trole|\boil\b|brent|\bwti\b|opep|opec/i, ["BZ=F", "CL=F", "TTE.PA"]], [/\bgaz\b|natural gas/i, ["NG=F"]],
  [/\bor\b|\bgold\b/i, ["GC=F"]], [/argent m[ée]tal|\bsilver\b/i, ["SI=F"]], [/cuivre|copper/i, ["HG=F"]], [/bl[ée]\b|wheat|c[ée]r[ée]ales/i, ["ZW=F"]],
  // Crypto
  [/bitcoin|\bbtc\b/i, ["BTC-USD"]], [/ethereum|\beth\b|ether\b/i, ["ETH-USD"]], [/crypto|stablecoin|blockchain/i, ["BTC-USD", "ETH-USD"]], [/solana/i, ["SOL-USD"]],
  // Thèmes larges
  [/intelligence artificielle|\bia\b|\bai\b|semi-?conducteur|puces?|chips?/i, ["NVDA", "^NDX"]], [/luxe|luxury/i, ["MC.PA", "RMS.PA"]],
  [/droits de douane|tarif|tariff|guerre commerciale|trade war/i, ["^GSPC", "^HSI", "EURUSD=X"]], [/banques?\b|bank/i, ["BNP.PA"]],
];

export function relatedAssets(title, max = 4) {
  const out = [];
  for (const [re, syms] of RULES) if (re.test(title)) for (const s of syms) if (!out.includes(s)) out.push(s);
  return out.slice(0, max);
}
