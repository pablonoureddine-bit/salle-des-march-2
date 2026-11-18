// Indicateurs techniques, calculés dans le navigateur à partir des bougies OHLC.
export const closes = (b) => b.map((x) => x.close);

export function sma(a, n) {
  const o = Array(a.length).fill(null); let s = 0;
  for (let i = 0; i < a.length; i++) { s += a[i]; if (i >= n) s -= a[i - n]; if (i >= n - 1) o[i] = s / n; }
  return o;
}

export function ema(a, n) {
  const o = Array(a.length).fill(null); const k = 2 / (n + 1); let e = null, run = 0, sum = 0;
  for (let i = 0; i < a.length; i++) {
    const v = a[i];
    if (v == null) { run = 0; sum = 0; continue; }
    if (e == null) { run++; sum += v; if (run === n) { e = sum / n; o[i] = e; } continue; }
    e = v * k + e * (1 - k); o[i] = e;
  }
  return o;
}

export function rsi(a, n = 14) {
  const o = Array(a.length).fill(null); let g = 0, l = 0;
  for (let i = 1; i < a.length; i++) {
    const d = a[i] - a[i - 1], up = Math.max(d, 0), dn = Math.max(-d, 0);
    if (i <= n) { g += up; l += dn; if (i === n) { g /= n; l /= n; o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); } }
    else { g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n; o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); }
  }
  return o;
}

export function macd(a, f = 12, s = 26, sg = 9) {
  const ef = ema(a, f), es = ema(a, s);
  const m = a.map((_, i) => ef[i] != null && es[i] != null ? ef[i] - es[i] : null);
  const sig = ema(m, sg);
  return { m, sig, hist: m.map((v, i) => v != null && sig[i] != null ? v - sig[i] : null) };
}

export function bollinger(a, n = 20, k = 2) {
  const mid = sma(a, n), up = [], lo = [];
  for (let i = 0; i < a.length; i++) {
    if (mid[i] == null) { up.push(null); lo.push(null); continue; }
    let s = 0; for (let j = i - n + 1; j <= i; j++) s += (a[j] - mid[i]) ** 2;
    const sd = Math.sqrt(s / n); up.push(mid[i] + k * sd); lo.push(mid[i] - k * sd);
  }
  return { mid, up, lo };
}

export function atr(b, n = 14) {
  const o = Array(b.length).fill(null); let v = null, sum = 0;
  for (let i = 0; i < b.length; i++) {
    const x = b[i];
    const tr = i === 0 ? x.high - x.low : Math.max(x.high - x.low, Math.abs(x.high - b[i - 1].close), Math.abs(x.low - b[i - 1].close));
    if (i < n) { sum += tr; if (i === n - 1) { v = sum / n; o[i] = v; } continue; }
    v = (v * (n - 1) + tr) / n; o[i] = v;
  }
  return o;
}

export function stochastic(b, n = 14, d = 3) {
  const k = b.map((_, i) => {
    if (i < n - 1) return null;
    const seg = b.slice(i - n + 1, i + 1);
    const hi = Math.max(...seg.map((x) => x.high)), lo = Math.min(...seg.map((x) => x.low));
    return hi === lo ? 50 : (b[i].close - lo) / (hi - lo) * 100;
  });
  const first = k.findIndex((x) => x != null);
  const dd = Array(b.length).fill(null);
  if (first >= 0) sma(k.slice(first), d).forEach((v, j) => (dd[first + j] = v));
  return { k, d: dd };
}

// Ichimoku Kinko Hyo : Tenkan 9, Kijun 26, SSB 52, décalage 26.
export function ichimoku(b, t = 9, k = 26, sb = 52, shift = 26) {
  const mid = (i, n) => {
    if (i < n - 1) return null;
    let hi = -Infinity, lo = Infinity;
    for (let j = i - n + 1; j <= i; j++) { hi = Math.max(hi, b[j].high); lo = Math.min(lo, b[j].low); }
    return (hi + lo) / 2;
  };
  const tenkan = b.map((_, i) => mid(i, t));
  const kijun = b.map((_, i) => mid(i, k));
  const ssaRaw = b.map((_, i) => tenkan[i] != null && kijun[i] != null ? (tenkan[i] + kijun[i]) / 2 : null);
  const ssbRaw = b.map((_, i) => mid(i, sb));
  // Les deux lignes du nuage sont projetées "shift" bougies dans le futur.
  const step = b.length > 1 ? b.at(-1).time - b.at(-2).time : 86400;
  const timeAt = (i) => (i < b.length ? b[i].time : b.at(-1).time + (i - b.length + 1) * step);
  const ssa = [], ssb = [];
  for (let i = 0; i < b.length; i++) {
    if (ssaRaw[i] != null) ssa.push({ time: timeAt(i + shift), value: ssaRaw[i] });
    if (ssbRaw[i] != null) ssb.push({ time: timeAt(i + shift), value: ssbRaw[i] });
  }
  const chikou = b.slice(shift).map((x, i) => ({ time: b[i].time, value: x.close }));
  // Nuage applicable à la bougie actuelle = valeurs calculées il y a "shift" bougies.
  const n = b.length - 1;
  const cloudNow = { a: ssaRaw[n - shift] ?? null, b: ssbRaw[n - shift] ?? null };
  const cloudFuture = { a: ssaRaw[n], b: ssbRaw[n] };
  return { tenkan, kijun, ssa, ssb, chikou, cloudNow, cloudFuture };
}

// Retracements de Fibonacci sur le dernier mouvement significatif (plus haut / plus bas de la fenêtre).
export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
export function fibonacci(b, lookback = 120) {
  const seg = b.slice(-lookback);
  let hiI = 0, loI = 0;
  seg.forEach((x, i) => { if (x.high > seg[hiI].high) hiI = i; if (x.low < seg[loI].low) loI = i; });
  const hi = seg[hiI].high, lo = seg[loI].low;
  const upMove = loI < hiI; // le creux précède le sommet : on mesure le repli d'une hausse
  const levels = FIB_LEVELS.map((r) => ({ ratio: r, price: upMove ? hi - (hi - lo) * r : lo + (hi - lo) * r }));
  return { hi, lo, upMove, levels, from: seg[upMove ? loI : hiI].time, to: seg[upMove ? hiI : loI].time };
}

export function pivots(b, atrNow) {
  const look = b.slice(-250), w = 5, pts = [];
  for (let i = w; i < look.length - w; i++) {
    let isHi = true, isLo = true;
    for (let j = i - w; j <= i + w; j++) { if (look[j].high > look[i].high) isHi = false; if (look[j].low < look[i].low) isLo = false; }
    if (isHi) pts.push(look[i].high);
    if (isLo) pts.push(look[i].low);
  }
  const tol = (atrNow || look.at(-1).close * 0.01) * 0.8;
  const clusters = [];
  pts.sort((x, y) => x - y).forEach((p) => {
    const c = clusters.at(-1);
    if (c && p - c.max <= tol) { c.sum += p; c.n++; c.max = p; } else clusters.push({ sum: p, n: 1, max: p });
  });
  return clusters.map((c) => ({ level: c.sum / c.n, touches: c.n }));
}

export function interval(b) {
  const d = [];
  for (let i = Math.max(1, b.length - 60); i < b.length; i++) d.push(b[i].time - b[i - 1].time);
  d.sort((x, y) => x - y);
  return d[Math.floor(d.length / 2)] || 86400;
}

// Analyse complète + score synthétique de -100 à +100.
export function analyse(b, tf) {
  const c = closes(b), n = b.length - 1;
  const m20 = sma(c, 20), m50 = sma(c, 50), m200 = sma(c, 200);
  const r = rsi(c), md = macd(c), bb = bollinger(c), at = atr(b), st = stochastic(b), ich = ichimoku(b), fib = fibonacci(b);
  const last = c[n], prev = c[n - 1];
  const per = tf === "1d" ? [[5, "1 semaine"], [21, "1 mois"], [63, "3 mois"], [252, "1 an"]]
    : tf === "1wk" ? [[4, "1 mois"], [13, "3 mois"], [26, "6 mois"], [52, "1 an"]]
    : [[5, "5 bougies"], [20, "20 bougies"], [60, "60 bougies"], [200, "200 bougies"]];
  const perf = per.map(([k, lbl]) => ({ lbl, v: n - k >= 0 ? (last / c[n - k] - 1) * 100 : null }));
  const win = b.slice(-Math.min(tf === "1d" ? 252 : 200, b.length));
  const hi52 = Math.max(...win.map((x) => x.high)), lo52 = Math.min(...win.map((x) => x.low));

  const sig = []; let score = 0, wsum = 0;
  const add = (label, detail, value, s, w, txt, lesson) => { sig.push({ label, detail, value, s, txt, lesson }); score += s * w; wsum += w; };
  const pc = (v) => (v > 0 ? "+" : "") + (v * 100).toFixed(2).replace(".", ",") + " %";
  if (m50[n] != null) add("Prix / MM50", "tendance intermédiaire", pc(last / m50[n] - 1), last > m50[n] ? 1 : -1, 1.2, last > m50[n] ? "Au-dessus" : "En dessous", "mm");
  if (m200[n] != null) add("Prix / MM200", "tendance de fond", pc(last / m200[n] - 1), last > m200[n] ? 1 : -1, 1.5, last > m200[n] ? "Au-dessus" : "En dessous", "mm");
  if (m50[n] != null && m200[n] != null) { const up = m50[n] > m200[n]; add("MM50 / MM200", up ? "configuration haussière" : "configuration baissière", up ? "croix dorée" : "croix de la mort", up ? 1 : -1, 1, up ? "Haussier" : "Baissier", "mm"); }
  if (r[n] != null) { const v = r[n]; let s, t; if (v >= 70) { s = -0.3; t = "Suracheté"; } else if (v >= 55) { s = 1; t = "Haussier"; } else if (v > 45) { s = 0; t = "Neutre"; } else if (v > 30) { s = -1; t = "Baissier"; } else { s = 0.3; t = "Survendu"; } add("RSI 14", v >= 70 || v <= 30 ? "zone extrême" : "momentum", v.toFixed(1).replace(".", ","), s, 1, t, "rsi"); }
  if (md.m[n] != null && md.sig[n] != null) { const up = md.m[n] > md.sig[n]; const acc = md.hist[n] > (md.hist[n - 1] ?? 0); add("MACD", up ? (acc ? "au-dessus du signal, accélère" : "au-dessus du signal, ralentit") : (acc ? "sous le signal, se redresse" : "sous le signal, s'aggrave"), md.hist[n].toFixed(Math.abs(md.hist[n]) < 1 ? 4 : 2).replace(".", ","), up ? (acc ? 1 : 0.5) : (acc ? -0.5 : -1), 1, up ? "Haussier" : "Baissier", "macd"); }
  if (ich.cloudNow.a != null && ich.cloudNow.b != null) {
    const top = Math.max(ich.cloudNow.a, ich.cloudNow.b), bot = Math.min(ich.cloudNow.a, ich.cloudNow.b);
    const pos = last > top ? 1 : last < bot ? -1 : 0;
    const tk = ich.tenkan[n] > ich.kijun[n];
    add("Ichimoku", (tk ? "Tenkan au-dessus de Kijun" : "Tenkan sous Kijun") + (ich.cloudFuture.a > ich.cloudFuture.b ? ", nuage futur vert" : ", nuage futur rouge"), pos > 0 ? "au-dessus du nuage" : pos < 0 ? "sous le nuage" : "dans le nuage", pos === 0 ? 0 : pos * (tk === (pos > 0) ? 1 : 0.5), 1.2, pos > 0 ? "Haussier" : pos < 0 ? "Baissier" : "Indécis", "ichimoku");
  }
  if (bb.up[n] != null) { const p = (last - bb.lo[n]) / (bb.up[n] - bb.lo[n]); add("Bollinger %B", `largeur ${((bb.up[n] - bb.lo[n]) / bb.mid[n] * 100).toFixed(1).replace(".", ",")} %`, Math.round(p * 100) + " %", p > 1 ? -0.3 : p < 0 ? 0.3 : p > 0.5 ? 0.5 : -0.5, 0.6, p > 1 ? "Hors bande haute" : p < 0 ? "Hors bande basse" : p > 0.5 ? "Moitié haute" : "Moitié basse", "bollinger"); }
  if (st.k[n] != null) { const v = st.k[n]; add("Stochastique", "%K 14", v.toFixed(0), v > 80 ? -0.3 : v < 20 ? 0.3 : v > 50 ? 0.4 : -0.4, 0.5, v > 80 ? "Suracheté" : v < 20 ? "Survendu" : v > 50 ? "Haussier" : "Baissier", "stochastique"); }

  const finalScore = wsum ? Math.round(score / wsum * 100) : 0;
  const atrNow = at[n];
  const lv = pivots(b, atrNow);
  const res = lv.filter((x) => x.level > last * 1.002).sort((x, y) => x.level - y.level).slice(0, 3);
  const sup = lv.filter((x) => x.level < last * 0.998).sort((x, y) => y.level - x.level).slice(0, 3);
  return { b, c, n, m20, m50, m200, r, md, bb, at, st, ich, fib, last, prev, perf, sig, score: finalScore, res, sup, atrNow, hi52, lo52, iv: interval(b) };
}

export function verdictOf(s) {
  if (s >= 45) return ["Haussier", "up"];
  if (s >= 15) return ["Plutôt haussier", "up"];
  if (s > -15) return ["Neutre", "flat"];
  if (s > -45) return ["Plutôt baissier", "down"];
  return ["Baissier", "down"];
}
