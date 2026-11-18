// Vue "Entreprises" : profil, comptes annuels, ratios et résultats d'une société cotée.
import { $, el, api, fmt, pct, big } from "./util.js";
import { STOCKS, KNOWN, assetClass } from "./universe.js";

let ctx, current = null, seq = 0;

export function init(c) {
  ctx = c;
  $("ent-list").replaceChildren(...STOCKS.map((g) => el("div", null, el("h3", null, g.group),
    g.items.map(([s, n]) => el("a", { href: "#entreprise/" + encodeURIComponent(s), "data-s": s }, n, el("span", null, s))))));
  let t;
  $("ent-search").addEventListener("input", (e) => {
    clearTimeout(t);
    const q = e.target.value.trim();
    if (q.length < 2) { $("ent-res").hidden = true; return; }
    t = setTimeout(async () => {
      try {
        const res = (await api("/api/search?q=" + encodeURIComponent(q))).filter((r) => /equity|action|stock/i.test(r.type) || assetClass(r.symbol) === "action");
        $("ent-res").replaceChildren(...(res.length ? res.map((r) => el("a", { href: "#entreprise/" + encodeURIComponent(r.symbol), onclick: () => { $("ent-res").hidden = true; e.target.value = ""; } }, r.name, el("span", null, `${r.symbol} · ${r.exchange}`))) : [el("p", { class: "muted" }, "Aucune action trouvée.")]));
        $("ent-res").hidden = false;
      } catch { $("ent-res").hidden = true; }
    }, 300);
  });
}

export async function show(symbol) {
  if (assetClass(symbol) !== "action") symbol = current || "MC.PA";
  current = symbol;
  $("ent-list").querySelectorAll("a").forEach((a) => a.classList.toggle("on", a.dataset.s === symbol));
  const box = $("ent-body"), my = ++seq;
  box.replaceChildren(el("p", { class: "muted" }, `Chargement de la fiche ${KNOWN.get(symbol) || symbol}…`));
  try {
    const d = await api("/api/fundamentals?symbol=" + encodeURIComponent(symbol));
    if (my === seq) render(d);
  } catch (e) {
    if (my !== seq) return;
    box.replaceChildren(el("div", { class: "empty" },
      el("h2", null, KNOWN.get(symbol) || symbol),
      el("p", null, e.status === 503 ? e.message : "Fiche indisponible : " + e.message),
      el("button", { class: "primary", onclick: () => ctx.open(symbol) }, "Voir le graphique")));
  }
}

function render(d) {
  const p = d.profile, r = d.ratios, Y = d.years, cur = Y.at(-1)?.currency || p.currency || "";
  const last = Y.at(-1), prevY = Y.at(-2);
  const growth = (k) => last?.[k] != null && prevY?.[k] ? last[k] / prevY[k] - 1 : null;
  const ratio = (v, isPct) => v == null ? "—" : isPct ? (v * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " %" : v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  // Certains fournisseurs donnent le rendement en %, d'autres en fraction.
  const dy = r.dividendYield == null ? null : r.dividendYield > 1 ? r.dividendYield / 100 : r.dividendYield;

  $("ent-body").replaceChildren(
    d.demo ? el("p", { class: "banner-inline" }, "Données fictives (mode démonstration).") : null,
    el("header", { class: "ent-head" },
      p.image ? el("img", { src: p.image, alt: "", class: "logo-img", width: "48", height: "48", loading: "lazy" }) : null,
      el("div", null,
        el("h1", null, p.name),
        el("p", { class: "muted" }, [d.symbol, p.exchange, p.sector, p.industry, p.country].filter(Boolean).join(" · "))),
      el("div", { class: "ent-actions" },
        el("button", { class: "primary", onclick: () => ctx.open(d.symbol, p.name) }, "Graphique et analyse"),
        p.website ? el("a", { class: "btn", href: p.website, target: "_blank", rel: "noopener noreferrer" }, "Site de la société ↗") : null)),
    el("div", { class: "kpis" },
      kpi("Capitalisation", big(p.marketCap, p.currency)),
      kpi("PER (12 mois)", ratio(r.pe)),
      kpi("Rendement du dividende", dy != null ? ratio(dy, true) : "—"),
      kpi("Chiffre d'affaires " + (last?.year || ""), big(last?.revenue, cur), growth("revenue")),
      kpi("Résultat net " + (last?.year || ""), big(last?.netIncome, cur), growth("netIncome")),
      kpi("Dette nette", big(last?.netDebt, cur))),
    Y.length ? el("section", { class: "panel" }, el("div", { class: "panel-head" }, el("h2", null, "Chiffre d'affaires et résultat net"), el("span", { class: "muted small" }, cur)), bars(Y, cur)) : null,
    el("div", { class: "ent-cols" },
      el("section", { class: "panel" }, el("h2", null, "Ratios clés"), el("dl", { class: "ratios" },
        ...[["PER", ratio(r.pe)], ["Cours / valeur comptable", ratio(r.pb)], ["Cours / ventes", ratio(r.ps)], ["VE / EBITDA", ratio(r.evEbitda)],
          ["Marge brute", ratio(r.grossMargin, true)], ["Marge opérationnelle", ratio(r.operatingMargin, true)], ["Marge nette", ratio(r.netMargin, true)],
          ["Rentabilité des capitaux propres (ROE)", ratio(r.roe, true)], ["Rentabilité des capitaux investis (ROIC)", ratio(r.roic, true)],
          ["Dette / capitaux propres", ratio(r.debtToEquity)], ["Liquidité courante", ratio(r.currentRatio)], ["Taux de distribution", ratio(r.payout, true)], ["Bêta", ratio(p.beta)]]
          .flatMap(([k, v]) => [el("dt", null, k), el("dd", { class: "mono" }, v)]))),
      el("section", { class: "panel" }, el("h2", null, "Profil"),
        p.description ? el("p", { class: "desc" }, p.description) : null,
        el("dl", { class: "ratios" }, ...[["Dirigeant", p.ceo], ["Salariés", p.employees ? p.employees.toLocaleString("fr-FR") : null], ["Introduction en bourse", p.ipoDate], ["Fourchette 52 semaines", p.range], ["Dernier dividende", p.lastDividend != null ? fmt(p.lastDividend) + " " + (p.currency || "") : null]]
          .filter(([, v]) => v).flatMap(([k, v]) => [el("dt", null, k), el("dd", null, v)])))),
    Y.length ? table("Compte de résultat", Y, cur, [["Chiffre d'affaires", "revenue"], ["Marge brute", "grossProfit"], ["Résultat opérationnel", "operatingIncome"], ["EBITDA", "ebitda"], ["Résultat net", "netIncome"], ["Bénéfice par action", "eps", true]]) : null,
    Y.length ? table("Bilan", Y, cur, [["Total actif", "totalAssets"], ["Total passif", "totalLiabilities"], ["Capitaux propres", "equity"], ["Trésorerie", "cash"], ["Dette totale", "totalDebt"], ["Dette nette", "netDebt"]]) : null,
    Y.length ? table("Flux de trésorerie", Y, cur, [["Flux opérationnel", "operatingCashFlow"], ["Investissements (capex)", "capex"], ["Flux de trésorerie disponible", "freeCashFlow"], ["Dividendes versés", "dividendsPaid"]]) : null,
    d.earnings?.length ? el("section", { class: "panel" }, el("h2", null, "Publications de résultats"),
      el("div", { class: "tbl-wrap" }, el("table", { class: "tbl" },
        el("thead", null, el("tr", null, el("th", null, "Date"), el("th", { class: "r" }, "BPA publié"), el("th", { class: "r" }, "BPA attendu"), el("th", { class: "r" }, "Écart"))),
        el("tbody", null, d.earnings.map((e) => {
          const surprise = e.epsActual != null && e.epsEstimated ? e.epsActual / e.epsEstimated - 1 : null;
          const future = new Date(e.date) > new Date();
          return el("tr", null, el("td", null, new Date(e.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }), future ? el("small", null, "à venir") : null),
            el("td", { class: "r mono" }, fmt(e.epsActual)), el("td", { class: "r mono" }, fmt(e.epsEstimated)),
            el("td", { class: "r mono " + (surprise > 0 ? "up" : surprise < 0 ? "down" : "") }, surprise != null ? pct(surprise) : ""));
        }))))) : null,
    el("p", { class: "muted small" }, `Source : ${d.source}, d'après les comptes publiés par la société. Mis à jour ${new Date(d.updatedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}.`),
  );
}

function kpi(label, value, g) {
  return el("div", { class: "kpi" }, el("span", null, label), el("b", { class: "mono" }, value),
    g != null ? el("small", { class: g >= 0 ? "up" : "down" }, `${pct(g)} sur un an`) : null);
}

function table(title, Y, cur, rows) {
  return el("section", { class: "panel" }, el("div", { class: "panel-head" }, el("h2", null, title), el("span", { class: "muted small" }, cur)),
    el("div", { class: "tbl-wrap" }, el("table", { class: "tbl fin" },
      el("thead", null, el("tr", null, el("th", null, ""), ...Y.map((y) => el("th", { class: "r" }, y.year)))),
      el("tbody", null, rows.map(([label, k, raw]) => el("tr", null, el("td", null, label), ...Y.map((y) => el("td", { class: "r mono" }, raw ? fmt(y[k]) : big(y[k])))))))));
}

// Barres groupées (chiffre d'affaires / résultat net) dessinées en SVG, à l'échelle.
function bars(Y, cur) {
  const W = 640, H = 220, padL = 8, padB = 26, padT = 18;
  const max = Math.max(...Y.map((y) => Math.max(y.revenue || 0, y.netIncome || 0)), 1);
  const min = Math.min(0, ...Y.map((y) => y.netIncome || 0));
  const scale = (v) => (H - padB) - (v - min) / (max - min) * (H - padB - padT);
  const gw = (W - padL * 2) / Y.length, bw = Math.min(34, gw / 3);
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("class", "fin-chart"); svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `Chiffre d'affaires et résultat net par année, en ${cur}`);
  const add = (tag, a, text) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (text) e.textContent = text; svg.append(e); return e; };
  add("line", { x1: 0, x2: W, y1: scale(0), y2: scale(0), stroke: "var(--line)" });
  Y.forEach((y, i) => {
    const cx = padL + gw * i + gw / 2;
    [["revenue", "var(--accent)", -1], ["netIncome", "var(--up)", 1]].forEach(([k, color, side]) => {
      const v = y[k] || 0, x = cx + (side < 0 ? -bw - 2 : 2), y0 = scale(0), y1 = scale(v);
      add("rect", { x, y: Math.min(y0, y1), width: bw, height: Math.max(1, Math.abs(y1 - y0)), fill: v < 0 ? "var(--down)" : color, rx: 2 });
      add("text", { x: x + bw / 2, y: Math.min(y0, y1) - 4, "text-anchor": "middle", class: "fin-lbl" }, big(v));
    });
    add("text", { x: cx, y: H - 8, "text-anchor": "middle", class: "fin-year" }, y.year);
  });
  const wrap = el("div", { class: "fin-wrap" }, svg,
    el("div", { class: "legend" }, el("span", null, el("i", { style: "background:var(--accent)" }), "Chiffre d'affaires"), el("span", null, el("i", { style: "background:var(--up)" }), "Résultat net")));
  return wrap;
}
