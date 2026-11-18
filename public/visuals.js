// Images associées aux informations : logos d'entreprises, drapeaux, icônes d'actifs et illustrations par thème d'actu.
// Tout est généré localement (SVG) sauf les logos et drapeaux, chargés depuis des services publics gratuits,
// avec un repli automatique sur un monogramme si l'image ne charge pas.
import { el } from "./util.js";
import { assetClass } from "./universe.js";

const NS = "http://www.w3.org/2000/svg";
function svg(paths, size = 24, vb = 24) {
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", `0 0 ${vb} ${vb}`); s.setAttribute("width", size); s.setAttribute("height", size); s.setAttribute("aria-hidden", "true");
  s.innerHTML = paths;
  return s;
}

// Pays des indices (code ISO pour les drapeaux).
const COUNTRY = {
  "^FCHI": "fr", "^SBF120": "fr", "^GDAXI": "de", "^FTSE": "gb", "^STOXX50E": "eu", "^STOXX": "eu", "^IBEX": "es", "FTSEMIB.MI": "it",
  "^AEX": "nl", "^SSMI": "ch", "^BFX": "be", "^OMX": "se", "^GSPC": "us", "^DJI": "us", "^IXIC": "us", "^NDX": "us", "^RUT": "us",
  "^VIX": "us", "^GSPTSE": "ca", "^BVSP": "br", "^MXX": "mx", "^N225": "jp", "^HSI": "hk", "000001.SS": "cn", "^KS11": "kr",
  "^TWII": "tw", "^BSESN": "in", "^NSEI": "in", "^AXJO": "au", "^STI": "sg", "^IRX": "us", "^FVX": "us", "^TNX": "us", "^TYX": "us",
};
const CCY = { EUR: "eu", USD: "us", GBP: "gb", JPY: "jp", CHF: "ch", AUD: "au", CAD: "ca", CNY: "cn" };

const flag = (cc, cls = "flag") => {
  const img = el("img", { class: cls, src: `https://flagcdn.com/w80/${cc}.png`, alt: "", loading: "lazy", width: "28", height: "20" });
  img.onerror = () => img.replaceWith(el("span", { class: cls + " flag-txt" }, cc.toUpperCase()));
  return img;
};

const ICONS = {
  "GC=F": ["#E2B33C", '<rect x="3" y="12" width="8" height="6" rx="1" fill="currentColor"/><rect x="13" y="12" width="8" height="6" rx="1" fill="currentColor"/><rect x="8" y="5" width="8" height="6" rx="1" fill="currentColor"/>'],
  "SI=F": ["#9AA6B8", '<rect x="3" y="12" width="8" height="6" rx="1" fill="currentColor"/><rect x="13" y="12" width="8" height="6" rx="1" fill="currentColor"/><rect x="8" y="5" width="8" height="6" rx="1" fill="currentColor"/>'],
  "HG=F": ["#C2703D", '<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/>'],
  "BZ=F": ["#3C4A63", '<path d="M12 3c3.5 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2.5-6 6-11z" fill="currentColor"/>'],
  "CL=F": ["#3C4A63", '<path d="M12 3c3.5 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2.5-6 6-11z" fill="currentColor"/>'],
  "NG=F": ["#4A8FE7", '<path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 3-6 1 2 2 3 3 3 0-3-1-5 0-8z" fill="currentColor"/>'],
  "ZW=F": ["#C99A3D", '<path d="M12 21V8M12 8c-3 0-4-3-4-5 2 0 4 1 4 5zm0 0c3 0 4-3 4-5-2 0-4 1-4 5zm0 5c-3 0-4-3-4-5 2 0 4 1 4 5zm0 0c3 0 4-3 4-5-2 0-4 1-4 5z" stroke="currentColor" stroke-width="1.6" fill="currentColor"/>'],
  "ZC=F": ["#D9B23A", '<ellipse cx="12" cy="11" rx="4" ry="7" fill="currentColor"/><path d="M8 14c-2 2-2 5-1 7M16 14c2 2 2 5 1 7" stroke="#3E8E4E" stroke-width="2" fill="none"/>'],
  "BTC-USD": ["#F2A43A", '<text x="12" y="17" text-anchor="middle" font-size="14" font-weight="700" fill="#fff" font-family="sans-serif">₿</text>'],
  "ETH-USD": ["#6F7BD9", '<path d="M12 3l6 9-6 3.5L6 12zM6 13.5l6 3.5 6-3.5L12 21z" fill="#fff"/>'],
  "SOL-USD": ["#8E5BEA", '<path d="M6 7h11l-2 2H4zM6 11h11l-2 2H4zM6 15h11l-2 2H4z" fill="#fff"/>'],
  "XRP-USD": ["#2B3A55", '<path d="M6 6l6 5 6-5M6 18l6-5 6 5" stroke="#fff" stroke-width="2" fill="none"/>'],
  "BNB-USD": ["#E8B830", '<path d="M12 4l3 3-3 3-3-3zM6 10l3 2-3 2-2-2zM18 10l2 2-2 2-3-2zM12 14l3 3-3 3-3-3z" fill="#fff"/>'],
};

// Petite image carrée représentant un actif (logo, drapeau, icône).
export function assetVisual(symbol, name = "", size = 36) {
  const cls = assetClass(symbol);
  const box = el("span", { class: "av", style: `--s:${size}px` });
  if (ICONS[symbol]) {
    const [bg, paths] = ICONS[symbol];
    box.style.background = bg; box.style.color = "#fff";
    if (symbol.endsWith("=F")) { box.style.background = "var(--soft)"; box.style.color = bg; }
    box.append(svg(paths, size * 0.62));
    return box;
  }
  if (cls === "indice" && COUNTRY[symbol]) { box.classList.add("av-flag"); box.append(flag(COUNTRY[symbol])); return box; }
  if (cls === "devise") {
    const m = symbol.match(/^([A-Z]{3})([A-Z]{3})=X$/);
    if (m && CCY[m[1]] && CCY[m[2]]) { box.classList.add("av-pair"); box.append(flag(CCY[m[1]], "flag f1"), flag(CCY[m[2]], "flag f2")); return box; }
    box.classList.add("av-mono"); box.textContent = "$"; return box;
  }
  if (cls === "action") {
    const mono = () => { box.classList.add("av-mono"); box.textContent = (name || symbol).replace(/[^A-Za-zÀ-ÿ]/g, "").slice(0, 2).toUpperCase(); };
    const img = el("img", { src: `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`, alt: "", loading: "lazy" });
    img.onerror = () => { img.remove(); mono(); };
    box.classList.add("av-logo"); box.append(img);
    return box;
  }
  box.classList.add("av-mono"); box.textContent = (name || symbol).slice(0, 2).toUpperCase();
  return box;
}

// ───── Thèmes d'actualité : classement par mots-clés + illustration ─────
export const TOPICS = [
  { id: "banques-centrales", label: "Banques centrales et taux", c1: "#2E4C8F", c2: "#5C86D6", re: /\b(fed|bce|ecb|banque centrale|central bank|taux|rate|powell|lagarde|inflation|cpi|treasury|obligat|bond|yield)/i,
    icon: '<path d="M4 9l8-5 8 5H4zm2 1h2v7H6zm5 0h2v7h-2zm5 0h2v7h-2zM4 18h16v2H4z" fill="#fff"/>' },
  { id: "energie", label: "Énergie et matières premières", c1: "#22324D", c2: "#D99A2B", re: /(pétrole|petrole|oil|brent|wti|opep|opec|gaz|gas|énergie|energy|or |gold|argent|silver|cuivre|copper|blé|wheat|matières premières|commodit)/i,
    icon: '<path d="M12 3c3.5 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2.5-6 6-11z" fill="#fff"/>' },
  { id: "crypto", label: "Crypto", c1: "#7A4A0E", c2: "#F2A43A", re: /(bitcoin|crypto|ethereum|ether\b|blockchain|stablecoin|btc|etf bitcoin|solana)/i,
    icon: '<text x="12" y="17" text-anchor="middle" font-size="14" font-weight="700" fill="#fff" font-family="sans-serif">₿</text>' },
  { id: "tech", label: "Tech et IA", c1: "#3B2C7A", c2: "#7B6CF0", re: /(nvidia|apple|microsoft|google|alphabet|meta|amazon|tesla|semi|puce|chip|intelligence artificielle|\bia\b|\bai\b|tech|logiciel|software|asml|cloud)/i,
    icon: '<rect x="6" y="6" width="12" height="12" rx="2" fill="none" stroke="#fff" stroke-width="2"/><rect x="9.5" y="9.5" width="5" height="5" fill="#fff"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" stroke="#fff" stroke-width="2"/>' },
  { id: "resultats", label: "Résultats d'entreprises", c1: "#14583F", c2: "#2FAE7A", re: /(résultat|resultat|earnings|bénéfice|benefice|chiffre d'affaires|revenue|profit|dividende|dividend|guidance|prévisions|trimestre|quarter|ventes|sales)/i,
    icon: '<path d="M5 19V11M10 19V7M15 19v-5M20 19V5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>' },
  { id: "geopolitique", label: "Géopolitique et politique", c1: "#5A1F2B", c2: "#C24B5A", re: /(guerre|war|sanction|élection|election|trump|chine|china|russie|russia|ukraine|tarif|tariff|douane|droits de douane|gouvernement|government|budget|politique)/i,
    icon: '<circle cx="12" cy="12" r="8" fill="none" stroke="#fff" stroke-width="2"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16" stroke="#fff" stroke-width="1.6" fill="none"/>' },
  { id: "devises", label: "Devises", c1: "#0F4C5C", c2: "#2BA3B5", re: /(dollar|euro|yen|livre sterling|pound|devise|currency|forex|change)/i,
    icon: '<text x="12" y="17" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" font-family="sans-serif">€$</text>' },
  { id: "marches", label: "Marchés et Bourse", c1: "#1C2B4A", c2: "#3E5C94", re: /./,
    icon: '<path d="M3 17l5-5 4 3 8-8" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 7h5v5" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>' },
];
export const topicOf = (title) => TOPICS.find((t) => t.re.test(title)) || TOPICS.at(-1);

// Vignette illustrée d'un thème (dégradé + pictogramme), utilisée à côté de chaque actu.
export function topicVisual(topic, size = 56) {
  const box = el("span", { class: "tv", style: `--s:${size}px;background:linear-gradient(135deg, ${topic.c1}, ${topic.c2})`, title: topic.label });
  box.append(svg(topic.icon, size * 0.5));
  return box;
}
