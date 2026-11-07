// 2D-Pixel-Art im Stil der 32-Bit-Handhelds: Kreaturen und Trainer werden aus Formen
// (Ellipsen/Polygone) gerastert, mit 3 Tonstufen schattiert (Licht oben links) und
// mit farbigen Innen- und dunklen Außenkonturen versehen. Keine 3D-Bibliothek nötig.

// ---------------------------------------------------------------- Farben
function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgb2hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  return [h, s, l];
}
function hsl2rgb([h, s, l]) {
  h = ((h % 1) + 1) % 1; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  if (!s) return [l, l, l].map(v => Math.round(v * 255));
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = ((t % 1) + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(v => Math.round(v * 255));
}
// Farbton zu Gelb (Licht) bzw. Blau/Violett (Schatten) verschieben – typisch für Handheld-Paletten
function hueToward(h, target, amt) { let d = target - h; if (d > 0.5) d -= 1; if (d < -0.5) d += 1; return h + d * amt; }
export function shiftHue(hex, d) { const [h, s, l] = rgb2hsl(hex2rgb(hex)); const [r, g, b] = hsl2rgb([h + d, s, l]); return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''); }
const rampCache = new Map();
// [Kontur, Schatten, Basis, Licht, Glanz] als RGB-Arrays
function ramp(hex) {
  if (rampCache.has(hex)) return rampCache.get(hex);
  const base = hex2rgb(hex), [h, s, l] = rgb2hsl(base);
  const r = [
    hsl2rgb([hueToward(h, 0.7, 0.25), Math.min(1, s * 0.9 + 0.1), Math.max(0.08, l * 0.32)]),
    hsl2rgb([hueToward(h, 0.7, 0.12), Math.min(1, s * 1.05), Math.max(0.12, l - 0.17 - (l > 0.85 ? 0.08 : 0))]),
    base,
    hsl2rgb([hueToward(h, 0.15, 0.08), s, Math.min(0.96, l + 0.11)]),
    hsl2rgb([hueToward(h, 0.15, 0.12), s * 0.7, Math.min(0.99, l + 0.24)]),
  ];
  rampCache.set(hex, r);
  return r;
}
const OUT = [24, 20, 32];

// ---------------------------------------------------------------- Rasterizer
const L = (() => { const v = [-0.5, -0.62, 0.6]; const n = Math.hypot(...v); return v.map(x => x / n); })();
class Canvas64 {
  constructor(n = 64) { this.n = n; this.id = new Int16Array(n * n).fill(-1); this.col = new Array(n * n).fill(null); this.tn = new Int8Array(n * n); this.parts = []; }
  // e: Ellipse  {x,y,rx,ry,a,c,tone,line}
  add(p) { const i = this.parts.length; this.parts.push(p); p.shape === 'e' ? this.ell(p, i) : this.poly(p, i); }
  set(x, y, i, c, t = 2) { if (x < 0 || y < 0 || x >= this.n || y >= this.n) return; const k = y * this.n + x; this.id[k] = i; this.col[k] = c; this.tn[k] = t; }
  ell(p, i) {
    const R = ramp(p.c), ca = Math.cos(p.a || 0), sa = Math.sin(p.a || 0), m = Math.max(p.rx, p.ry) + 1;
    for (let y = Math.floor(p.y - m); y <= p.y + m; y++) for (let x = Math.floor(p.x - m); x <= p.x + m; x++) {
      const dx = x + 0.5 - p.x, dy = y + 0.5 - p.y;
      const u = (dx * ca + dy * sa) / p.rx, v = (-dx * sa + dy * ca) / p.ry, d = u * u + v * v;
      if (d > 1) continue;
      // Normale in Bildkoordinaten zurückdrehen
      const nx = u * ca - v * sa, ny = u * sa + v * ca, nz = Math.sqrt(Math.max(0, 1 - d));
      const lum = (nx * L[0] + ny * L[1] + nz * L[2]) + (p.tone || 0) * 0.3;
      const t = p.flat ? 2 + (p.tone || 0) : lum > 0.93 && !p.matte ? 4 : lum > 0.62 ? 3 : lum > 0.18 ? 2 : 1; this.set(x, y, i, R[t], t);
    }
  }
  poly(p, i) {
    const R = ramp(p.c), pts = p.pts; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, w = (x1 - x0) / 2 + 0.5, h = (y1 - y0) / 2 + 0.5;
    for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5; let ins = false;
      for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
        const [xa, ya] = pts[a], [xb, yb] = pts[b];
        if ((ya > py) !== (yb > py) && px < (xb - xa) * (py - ya) / (yb - ya) + xa) ins = !ins;
      }
      if (!ins) continue;
      const lum = 0.55 - ((px - cx) / w) * 0.35 - ((py - cy) / h) * 0.45 + (p.tone || 0) * 0.3;
      const t = p.flat ? 2 + (p.tone || 0) : lum > 0.78 ? 3 : lum > 0.2 ? 2 : 1; this.set(x, y, i, R[t], t);
    }
  }
  // Konturen: außen dunkel, innen (Teil vor Teil) in der Konturfarbe des vorderen Teils
  lines() {
    const n = this.n, id = this.id, col = this.col, outer = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const k = y * n + x, i = id[k];
      const nb = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n).map(([a, b]) => id[b * n + a]);
      if (i < 0) { if (nb.some(j => j >= 0)) outer.push(k); continue; }
      const p = this.parts[i];
      if (p.line === false) continue;
      if (nb.some(j => j >= 0 && j < i && this.parts[j].line !== false && !this.parts[j].noInner)) { col[k] = ramp(p.c)[0]; this.tn[k] = 0; }
    }
    for (const k of outer) { const x = k % n, y = (k / n) | 0; const j = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].map(([a, b]) => (a >= 0 && b >= 0 && a < n && b < n) ? id[b * n + a] : -1).find(v => v >= 0 && v < this.parts.length); col[k] = this.parts[j].glowLine ? ramp(this.parts[j].c)[1] : OUT; id[k] = 9999; }
  }
  px(x, y, c) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= this.n || y >= this.n) return; const k = y * this.n + x; this.col[k] = typeof c === 'string' ? hex2rgb(c) : c; if (this.id[k] < 0) this.id[k] = 9998; }
  toCanvas(mirror = false) {
    const c = document.createElement('canvas'); c.width = c.height = this.n;
    const x = c.getContext('2d'), img = x.createImageData(this.n, this.n);
    for (let k = 0; k < this.n * this.n; k++) {
      const v = this.col[k]; if (!v) continue;
      const xx = k % this.n, yy = (k / this.n) | 0, o = (yy * this.n + (mirror ? this.n - 1 - xx : xx)) * 4;
      img.data[o] = v[0]; img.data[o + 1] = v[1]; img.data[o + 2] = v[2]; img.data[o + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return c;
  }
}

// ---------------------------------------------------------------- Bausteine
// Alle Vorlagen arbeiten in einem 64er-Raster, Blickrichtung nach links, Boden bei y≈60.
const E = (x, y, rx, ry, c, o = {}) => ({ shape: 'e', x, y, rx, ry, c, ...o });
const P = (c, pts, o = {}) => ({ shape: 'p', c, pts, ...o });
const tri = (c, ax, ay, bx, by, cx, cy, o) => P(c, [[ax, ay], [bx, by], [cx, cy]], o);
const limb = (c, x0, y0, x1, y1, w, o) => { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2; return P(c, [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], o); };
const BEAK = '#f8b030', HORN = '#f0e2b8', WHITE = '#f8f8f8';

// Jede Vorlage: (C = Farben, st = Stufe) → { parts, head:{x,y,r}, body:{x,y,rx,ry}, tail:{x,y}, eyes:[[x,y]], eye:'std'|'big'|'glow'|'slit', mouth }
const KIND = {
  fox(C, st) {
    const big = st === 2, parts = [];
    const tails = big ? [[-0.9, 46, 30], [-0.4, 50, 36], [0.15, 50, 44]] : [[-0.55, 47, 34]];
    for (const [a, x, y] of tails) { parts.push(E(x, y, 6, 12, C.main, { a })); parts.push(E(x + Math.sin(-a) * -8 + 2, y - Math.cos(a) * 9, 4, 5, C.glow, { a, glowLine: true })); }
    parts.push(E(44, 53, 3.5, 6, C.main, { tone: -1 }), E(26, 54, 3, 6, C.main, { tone: -1 }));
    parts.push(E(35, 44, 13, 9, C.main), E(41, 54, 3.5, 6, C.main), E(22, 54, 3.5, 6, C.main));
    parts.push(E(23, 45, 6, 6, C.accent));
    parts.push(tri(C.main, 13, 24, 15, 9, 22, 21), tri(C.main, 23, 20, 30, 8, 31, 23));
    parts.push(tri(C.accent, 15, 21, 16, 13, 20, 20, { line: false }), tri(C.accent, 25, 19, 29, 12, 29, 21, { line: false }));
    parts.push(E(22, 30, 10, 8.5, C.main), E(14, 34, 6, 3.6, C.accent));
    if (big) parts.push(tri(C.glow, 18, 22, 22, 15, 26, 22));
    return { parts, head: { x: 22, y: 29, r: 9 }, body: { x: 35, y: 44, rx: 13, ry: 9 }, tail: { x: 50, y: 30 }, eyes: [[17, 28], [25, 28]], nose: [8, 33], mouth: [12, 37] };
  },
  axolotl(C, st) {
    const parts = [];
    parts.push(E(50, 46, 12, 5, C.main, { a: -0.25 }), E(52, 42, 11, 2.5, C.accent, { a: -0.25 }));
    parts.push(E(42, 55, 3, 4, C.main, { tone: -1 }), E(26, 55, 3, 4, C.main, { tone: -1 }));
    parts.push(E(34, 48, 14, 8, C.main), E(39, 56, 3, 4, C.main), E(23, 56, 3, 4, C.main));
    if (st === 2) parts.push(P(C.accent, [[24, 41], [32, 32], [36, 40], [42, 33], [46, 42]]));
    for (const [x, y, a] of [[7, 28, -0.9], [5, 35, -0.2], [8, 42, 0.5], [33, 27, 0.9], [35, 34, 0.2], [32, 41, -0.5]]) parts.push(E(x, y, 5, 2.2, C.accent, { a }));
    parts.push(E(20, 37, 12, 10, C.main), E(19, 43, 8, 3, C.accent, { line: false, matte: true }));
    return { parts, head: { x: 20, y: 36, r: 10 }, body: { x: 34, y: 48, rx: 14, ry: 8 }, tail: { x: 56, y: 44 }, eyes: [[15, 35], [25, 35]], mouth: [20, 41], smile: true };
  },
  sprout(C, st) {
    const big = st === 2, parts = [];
    parts.push(E(25, 57, 6, 3, C.accent, { tone: -1 }), E(39, 57, 6, 3, C.accent, { tone: -1 }));
    if (big) parts.push(E(16, 45, 4.5, 8, C.main, { a: 0.4 }), E(48, 45, 4.5, 8, C.main, { a: -0.4 }));
    parts.push(E(32, 44, big ? 15 : 13, big ? 14 : 13, C.main), E(32, 49, 8, 7, C.accent, { matte: true }));
    parts.push(limb('#4a8a32', 32, 31, 33, 22, 2));
    parts.push(E(39, 20, 8, 3.8, C.glow, { a: -0.45 }), E(26, 22, 6, 3, C.main, { a: 0.55 }));
    if (big) parts.push(E(32, 18, 4, 4, '#f87890'), E(28, 20, 3, 3, '#f8a0b0'), E(36, 20, 3, 3, '#f8a0b0'));
    return { parts, head: { x: 32, y: 38, r: 12 }, body: { x: 32, y: 46, rx: 13, ry: 12 }, tail: { x: 44, y: 50 }, eyes: [[27, 40], [37, 40]], mouth: [32, 45], smile: true };
  },
  bird(C) {
    const parts = [];
    parts.push(P(C.main, [[42, 42], [58, 46], [57, 52], [44, 49]], { tone: -1 }));
    parts.push(E(44, 34, 6, 11, C.main, { tone: -1, a: 0.6 }));
    parts.push(limb(BEAK, 29, 50, 28, 58, 2), limb(BEAK, 35, 50, 36, 58, 2));
    parts.push(E(34, 42, 12, 10, C.main), E(30, 46, 7, 6, C.accent, { matte: true }));
    parts.push(E(22, 28, 9, 8, C.main), tri(BEAK, 14, 26, 5, 30, 14, 32));
    parts.push(E(40, 42, 9, 5.5, C.main, { a: 0.35, tone: 0 }));
    return { parts, head: { x: 22, y: 27, r: 8 }, body: { x: 34, y: 42, rx: 12, ry: 10 }, tail: { x: 54, y: 48 }, eyes: [[19, 26], [26, 26]] };
  },
  moth(C) {
    const parts = [];
    parts.push(E(18, 26, 14, 11, C.main, { a: -0.45 }), E(46, 26, 14, 11, C.main, { a: 0.45 }));
    parts.push(E(21, 43, 9, 7, C.accent, { a: 0.35 }), E(43, 43, 9, 7, C.accent, { a: -0.35 }));
    parts.push(E(15, 24, 4, 4, C.glow, { line: false }), E(49, 24, 4, 4, C.glow, { line: false }));
    parts.push(limb(C.main, 30, 20, 23, 7, 1.5), limb(C.main, 34, 20, 41, 7, 1.5), E(23, 7, 2, 2, C.glow), E(41, 7, 2, 2, C.glow));
    parts.push(E(32, 40, 6, 12, C.accent), E(32, 25, 7, 6, C.main));
    return { parts, head: { x: 32, y: 24, r: 6 }, body: { x: 32, y: 40, rx: 6, ry: 12 }, tail: { x: 32, y: 52 }, eyes: [[29, 24], [35, 24]], eye: 'big' };
  },
  mushroom(C) {
    const parts = [];
    parts.push(E(25, 58, 5, 2.5, C.accent, { tone: -1 }), E(39, 58, 5, 2.5, C.accent, { tone: -1 }));
    parts.push(E(32, 47, 10, 11, C.accent));
    parts.push(E(32, 29, 21, 13, C.main));
    parts.push(E(23, 24, 3.5, 3, C.accent, { line: false, matte: true }), E(38, 21, 4, 3, C.accent, { line: false, matte: true }), E(31, 32, 2.5, 2, C.accent, { line: false, matte: true }), E(45, 30, 2.5, 2.5, C.accent, { line: false, matte: true }));
    return { parts, head: { x: 32, y: 30, r: 14 }, body: { x: 32, y: 47, rx: 10, ry: 11 }, tail: { x: 42, y: 50 }, eyes: [[28, 47], [36, 47]], mouth: [32, 52] };
  },
  crab(C) {
    const parts = [];
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) parts.push(limb(C.main, 32 + s * (8 + i * 4), 48, 32 + s * (16 + i * 4), 58, 2.2, { tone: -1 }));
    parts.push(limb(C.main, 24, 44, 14, 40, 3), limb(C.main, 40, 44, 50, 40, 3));
    parts.push(E(12, 36, 7, 6, C.main), tri(C.main, 6, 33, 2, 24, 12, 31), E(52, 36, 7, 6, C.main), tri(C.main, 58, 33, 62, 24, 52, 31));
    parts.push(limb(C.accent, 26, 40, 26, 30, 2), limb(C.accent, 38, 40, 38, 30, 2));
    parts.push(E(32, 46, 15, 9, C.main), E(32, 50, 9, 4, C.accent, { line: false, matte: true }));
    parts.push(E(26, 29, 3.5, 3.5, WHITE, { matte: true }), E(38, 29, 3.5, 3.5, WHITE, { matte: true }));
    return { parts, head: { x: 32, y: 42, r: 8 }, body: { x: 32, y: 46, rx: 15, ry: 9 }, tail: { x: 32, y: 54 }, eyes: [[26, 29], [38, 29]], eye: 'dot', mouth: [32, 47] };
  },
  shade(C) {
    const parts = [];
    parts.push(P(C.main, [[19, 38], [45, 38], [42, 50], [46, 60], [37, 54], [32, 61], [27, 54], [18, 60], [22, 50]]));
    parts.push(tri(C.main, 20, 26, 15, 6, 29, 20), tri(C.main, 35, 20, 49, 6, 44, 26));
    parts.push(E(32, 33, 14, 14, C.main), E(32, 39, 8, 5, C.accent, { line: false, matte: true, tone: -1 }));
    return { parts, head: { x: 32, y: 30, r: 13 }, body: { x: 32, y: 40, rx: 13, ry: 12 }, tail: { x: 32, y: 58 }, eyes: [[26, 31], [38, 31]], eye: 'glow', grin: [32, 38] };
  },
  turtle(C) {
    const parts = [];
    parts.push(E(46, 54, 5, 5, C.accent, { tone: -1 }), E(26, 55, 5, 5, C.accent, { tone: -1 }));
    parts.push(E(54, 48, 4, 2.5, C.accent));
    parts.push(E(34, 48, 20, 6, C.accent));
    parts.push(E(34, 39, 18, 13, C.main));
    parts.push(E(20, 55, 5, 5, C.accent), E(40, 56, 5, 5, C.accent));
    parts.push(E(10, 39, 8, 7, C.accent));
    return { parts, head: { x: 10, y: 38, r: 7 }, body: { x: 34, y: 39, rx: 18, ry: 13 }, tail: { x: 54, y: 46 }, eyes: [[7, 37], [13, 37]], mouth: [8, 42], shell: true };
  },
  stag(C) {
    const parts = [];
    parts.push(limb(C.main, 46, 42, 48, 60, 3, { tone: -1 }), limb(C.main, 28, 42, 27, 60, 3, { tone: -1 }));
    parts.push(E(51, 33, 3, 4, C.accent));
    parts.push(E(37, 38, 15, 9, C.main), limb(C.main, 43, 42, 42, 61, 3.5), limb(C.main, 24, 42, 22, 61, 3.5));
    parts.push(P(C.main, [[18, 26], [27, 22], [32, 36], [24, 40]]));
    for (const s of [0, 7]) { parts.push(limb(C.glow, 15 + s, 17, 10 + s, 4, 2), limb(C.glow, 12 + s, 10, 5 + s, 8, 1.8), limb(C.glow, 11 + s, 6, 16 + s, 2, 1.6)); }
    parts.push(E(18, 21, 7, 6, C.main), E(11, 24, 4, 3, C.accent));
    parts.push(E(37, 34, 6, 3, C.accent, { line: false, matte: true }), E(30, 40, 3, 2, C.accent, { line: false, matte: true }));
    return { parts, head: { x: 18, y: 20, r: 6 }, body: { x: 37, y: 38, rx: 15, ry: 9 }, tail: { x: 51, y: 33 }, eyes: [[16, 19], [21, 19]], nose: [7, 24] };
  },
  blob(C) {
    const parts = [P(C.main, [[24, 38], [31, 21], [33, 21], [40, 38]]), E(32, 46, 18, 13, C.main), E(24, 39, 3, 4, WHITE, { line: false, flat: true })];
    return { parts, head: { x: 32, y: 42, r: 14 }, body: { x: 32, y: 46, rx: 18, ry: 13 }, tail: { x: 46, y: 50 }, eyes: [[26, 44], [38, 44]], eye: 'big', mouth: [32, 50], smile: true };
  },
  bat(C) {
    const parts = [];
    for (const s of [-1, 1]) parts.push(P(C.main, [[32 + s * 4, 34], [32 + s * 28, 20], [32 + s * 26, 34], [32 + s * 30, 44], [32 + s * 20, 40], [32 + s * 14, 48], [32 + s * 6, 42]], { tone: -1 }));
    parts.push(tri(C.main, 24, 32, 22, 18, 30, 29), tri(C.main, 34, 29, 42, 18, 40, 32));
    parts.push(tri(C.accent, 25, 29, 24, 22, 28, 28, { line: false }), tri(C.accent, 36, 28, 40, 22, 39, 29, { line: false }));
    parts.push(E(32, 40, 10, 10, C.main), E(32, 45, 6, 4, C.accent, { matte: true }));
    parts.push(E(28, 55, 2, 3, C.main, { tone: -1 }), E(36, 55, 2, 3, C.main, { tone: -1 }));
    return { parts, head: { x: 32, y: 36, r: 8 }, body: { x: 32, y: 42, rx: 10, ry: 9 }, tail: { x: 32, y: 52 }, eyes: [[28, 37], [36, 37]], fangs: [32, 42] };
  },
  fish(C) {
    const parts = [];
    parts.push(P(C.main, [[42, 40], [59, 27], [54, 40], [59, 54]]));
    parts.push(P(C.accent, [[22, 31], [34, 21], [40, 31]]));
    parts.push(E(30, 40, 16, 11, C.main), E(28, 46, 11, 4, C.accent, { line: false, matte: true }));
    parts.push(E(32, 44, 5, 3, C.accent, { a: 0.5 }));
    return { parts, head: { x: 20, y: 38, r: 8 }, body: { x: 30, y: 40, rx: 16, ry: 11 }, tail: { x: 56, y: 40 }, eyes: [[20, 37]], eye: 'big', mouth: [14, 42], hover: true };
  },
  bunny(C) {
    const parts = [];
    parts.push(E(26, 13, 3.8, 10, C.main, { a: -0.18 }), E(38, 13, 3.8, 10, C.main, { a: 0.18 }));
    parts.push(E(26, 14, 1.8, 7, C.accent, { a: -0.18, line: false, matte: true }), E(38, 14, 1.8, 7, C.accent, { a: 0.18, line: false, matte: true }));
    parts.push(E(24, 57, 6, 3, C.main, { tone: -1 }), E(40, 57, 6, 3, C.main, { tone: -1 }));
    parts.push(E(32, 46, 11, 10, C.main), E(32, 49, 6, 6, C.accent, { matte: true }));
    parts.push(E(32, 30, 11, 9, C.main));
    return { parts, head: { x: 32, y: 29, r: 9 }, body: { x: 32, y: 46, rx: 11, ry: 10 }, tail: { x: 43, y: 50 }, eyes: [[28, 29], [36, 29]], nose: [32, 33], mouth: [32, 34] };
  },
  golem(C) {
    const parts = [];
    parts.push(P(C.main, [[20, 50], [28, 50], [28, 60], [18, 60]], { tone: -1 }), P(C.main, [[36, 50], [44, 50], [46, 60], [36, 60]], { tone: -1 }));
    parts.push(P(C.main, [[16, 24], [46, 21], [54, 40], [46, 54], [18, 54], [10, 40]]));
    parts.push(P(C.main, [[4, 34], [14, 30], [16, 46], [6, 50]]), P(C.main, [[50, 30], [60, 34], [58, 50], [48, 46]]));
    parts.push(E(32, 18, 9, 7, C.main));
    parts.push(limb(C.accent, 24, 32, 30, 40, 1.2, { line: false, flat: true }), limb(C.accent, 38, 30, 42, 44, 1.2, { line: false, flat: true }));
    return { parts, head: { x: 32, y: 17, r: 7 }, body: { x: 32, y: 38, rx: 18, ry: 15 }, tail: { x: 46, y: 50 }, eyes: [[28, 17], [36, 17]], eye: 'glow' };
  },
  serpent(C) {
    const parts = [];
    parts.push(E(37, 53, 19, 6, C.main), limb(C.main, 54, 52, 60, 46, 3));
    parts.push(E(32, 45, 14, 6, C.main));
    parts.push(P(C.main, [[24, 44], [16, 30], [24, 26], [32, 42]]));
    parts.push(E(37, 55, 12, 2, C.accent, { line: false, matte: true }), E(30, 47, 8, 2, C.accent, { line: false, matte: true }));
    parts.push(E(19, 26, 9, 7, C.main), E(13, 30, 5, 3, C.accent));
    return { parts, head: { x: 19, y: 25, r: 7 }, body: { x: 34, y: 48, rx: 18, ry: 9 }, tail: { x: 58, y: 47 }, eyes: [[16, 24], [22, 24]], eye: 'slit', tongue: [8, 31] };
  },
  wisp(C) {
    const parts = [];
    parts.push(P(C.main, [[32, 6], [38, 16], [44, 26], [46, 38], [42, 48], [32, 52], [22, 48], [18, 38], [20, 26], [26, 18]], { glowLine: true }));
    parts.push(P(C.main, [[44, 30], [52, 20], [48, 36]], { glowLine: true }), P(C.main, [[20, 30], [12, 22], [16, 38]], { glowLine: true }));
    parts.push(E(32, 38, 9, 10, C.glow, { line: false }));
    parts.push(E(26, 57, 2, 2, C.glow, { glowLine: true }), E(38, 58, 1.5, 1.5, C.glow, { glowLine: true }));
    return { parts, head: { x: 32, y: 32, r: 11 }, body: { x: 32, y: 38, rx: 12, ry: 12 }, tail: { x: 32, y: 50 }, eyes: [[28, 35], [36, 35]], eye: 'dot', mouth: [32, 40], hover: true };
  },
  beetle(C) {
    const parts = [];
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) parts.push(limb(C.accent, 32 + s * 10, 40 + i * 6, 32 + s * 19, 46 + i * 6, 2, { tone: -1 }));
    parts.push(E(32, 46, 14, 12, C.main));
    parts.push(E(32, 30, 8, 6, C.accent), P(C.glow, [[29, 26], [32, 8], [35, 26]]), tri(C.glow, 32, 15, 38, 11, 33, 19));
    return { parts, head: { x: 32, y: 30, r: 6 }, body: { x: 32, y: 46, rx: 14, ry: 12 }, tail: { x: 32, y: 56 }, eyes: [[28, 30], [36, 30]], eye: 'dot', shellLine: true };
  },
  lizard(C) {
    const parts = [];
    parts.push(P(C.main, [[42, 46], [60, 38], [59, 42], [45, 54]]));
    parts.push(E(44, 55, 3, 5, C.main, { tone: -1 }), E(28, 56, 3, 5, C.main, { tone: -1 }));
    for (let i = 0; i < 4; i++) parts.push(tri(C.accent, 26 + i * 6, 40 - (i === 0 ? 2 : 0), 29 + i * 6, 33 - (i === 0 ? 2 : 0), 32 + i * 6, 40));
    parts.push(E(34, 46, 12, 7, C.main), E(32, 50, 8, 3, C.accent, { line: false, matte: true }));
    parts.push(E(40, 56, 3, 5, C.main), E(24, 56, 3, 5, C.main));
    parts.push(E(18, 37, 9, 7, C.main));
    return { parts, head: { x: 18, y: 36, r: 7 }, body: { x: 34, y: 46, rx: 12, ry: 7 }, tail: { x: 58, y: 40 }, eyes: [[15, 35], [21, 35]], eye: 'slit', mouth: [12, 40] };
  },
  owl(C) {
    const parts = [];
    parts.push(tri(C.main, 20, 22, 18, 10, 27, 18), tri(C.main, 37, 18, 46, 10, 44, 22));
    parts.push(E(18, 42, 5, 11, C.main, { a: 0.15, tone: -1 }), E(46, 42, 5, 11, C.main, { a: -0.15, tone: -1 }));
    parts.push(E(32, 38, 14, 17, C.main), E(32, 46, 9, 9, C.accent, { matte: true }));
    parts.push(E(26, 28, 6, 6, C.accent, { matte: true }), E(38, 28, 6, 6, C.accent, { matte: true }));
    parts.push(tri(BEAK, 30, 32, 34, 32, 32, 37));
    parts.push(E(28, 56, 3, 1.6, BEAK), E(36, 56, 3, 1.6, BEAK));
    return { parts, head: { x: 32, y: 28, r: 12 }, body: { x: 32, y: 40, rx: 14, ry: 16 }, tail: { x: 32, y: 54 }, eyes: [[26, 28], [38, 28]], eye: 'big', feathers: true };
  },
};

// ---------------------------------------------------------------- Zusatzteile (Entwicklungen/Mutationen)
function extras(list, M, C, front) {
  const { head: h, body: b, tail: t } = M, back = [], fr = [];
  for (const e of list || []) {
    if (e === 'horns') for (const s of [-1, 1]) fr.push(tri(HORN, h.x + s * h.r * 0.35 - 1.5, h.y - h.r * 0.6, h.x + s * h.r * 0.75, h.y - h.r * 1.55, h.x + s * h.r * 0.35 + 1.5, h.y - h.r * 0.75));
    if (e === 'crest') fr.push(P(C.glow, [[h.x - 4, h.y - h.r * 0.75], [h.x - 2, h.y - h.r - 6], [h.x + 1, h.y - h.r * 0.95], [h.x + 4, h.y - h.r - 4], [h.x + 5, h.y - h.r * 0.7]]));
    if (e === 'crown') fr.push(P('#f8d040', [[h.x - 6, h.y - h.r + 1], [h.x - 6, h.y - h.r - 5], [h.x - 3, h.y - h.r - 2], [h.x, h.y - h.r - 6], [h.x + 3, h.y - h.r - 2], [h.x + 6, h.y - h.r - 5], [h.x + 6, h.y - h.r + 1]]));
    if (e === 'gem') fr.push(P(C.glow === '#ffffff' ? '#f05888' : C.glow, [[h.x, h.y - h.r * 0.62 - 3], [h.x + 2.5, h.y - h.r * 0.62], [h.x, h.y - h.r * 0.62 + 3], [h.x - 2.5, h.y - h.r * 0.62]], { glowLine: true }));
    if (e === 'leaf') fr.push(limb('#3a8a2a', h.x, h.y - h.r + 1, h.x + 1, h.y - h.r - 4, 1.5), E(h.x + 6, h.y - h.r - 5, 6, 2.6, '#60c848', { a: -0.4 }));
    if (e === 'cap') { const cc = C.glow === '#ffffff' ? '#c84860' : C.accent; fr.push(E(h.x, h.y - h.r * 0.7, h.r * 1.15, h.r * 0.6, cc), E(h.x - 3, h.y - h.r * 0.9, 2, 1.6, WHITE, { line: false, flat: true }), E(h.x + 4, h.y - h.r * 0.75, 1.6, 1.4, WHITE, { line: false, flat: true })); }
    if (e === 'ears') for (const s of [-1, 1]) back.push(tri(C.main, h.x + s * h.r * 0.25, h.y - h.r * 0.6, h.x + s * h.r * 0.85, h.y - h.r * 1.7, h.x + s * h.r * 0.95, h.y - h.r * 0.4));
    if (e === 'wings') for (const s of [-1, 1]) back.push(E(b.x + s * (b.rx * 0.7 + 4), b.y - b.ry * 0.7, 9, 5, C.accent, { a: s * -0.6 }));
    if (e === 'spikes') for (let i = 0; i < 4; i++) { const x = b.x - b.rx * 0.5 + i * b.rx * 0.38, y = b.y - b.ry * (0.82 + (i === 1 || i === 2 ? 0.12 : 0)); back.push(tri(C.accent, x - 2.5, y + 2, x, y - 6, x + 2.5, y + 2)); }
    if (e === 'fins') for (const s of [-1, 1]) back.push(tri(C.accent, b.x + s * b.rx * 0.6, b.y - 3, b.x + s * (b.rx + 9), b.y - 9, b.x + s * (b.rx + 4), b.y + 4));
    if (e === 'tailflame') fr.push(P('#f87830', [[t.x - 4, t.y + 3], [t.x - 3, t.y - 5], [t.x, t.y - 2], [t.x + 2, t.y - 10], [t.x + 4, t.y - 2], [t.x + 5, t.y + 3]], { glowLine: true }), E(t.x + 0.5, t.y + 1, 2.5, 3, '#f8e050', { line: false }));
  }
  return { back, fr };
}

// Gesicht und Kleinteile direkt pixelgenau
function face(cv, M, C, big) {
  // Auf sehr dunklen Körpern leuchten die Augen in der Glanzfarbe, sonst wären sie unsichtbar
  const [, , lum] = rgb2hsl(hex2rgb(C.main));
  const EYE = lum < 0.36 ? ramp(C.glow)[3] : [32, 24, 40];
  const style = M.eye || 'std';
  for (const [x, y] of M.eyes) {
    if (style === 'glow') { const g = ramp(C.glow); cv.px(x, y, g[4]); cv.px(x + 1, y, g[3]); cv.px(x, y - 1, g[3]); cv.px(x + 1, y - 1, g[2]); cv.px(x - 1, y, g[2]); cv.px(x, y + 1, g[2]); continue; }
    if (style === 'dot') { cv.px(x, y, EYE); cv.px(x, y + 1, EYE); cv.px(x + 1, y, EYE); cv.px(x + 1, y + 1, EYE); cv.px(x, y, [255, 255, 255]); continue; }
    if (style === 'slit') { cv.px(x - 1, y, '#f8e040'); cv.px(x + 1, y, '#f8e040'); cv.px(x, y - 1, EYE); cv.px(x, y, EYE); cv.px(x, y + 1, EYE); continue; }
    const h = style === 'big' || big ? 4 : 3, w = style === 'big' ? 3 : 2;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) cv.px(x - (w >> 1) + xx, y - 1 + yy, EYE);
    cv.px(x - (w >> 1), y - 1, [255, 255, 255]);
    if (M.iris && style === 'std' && EYE[0] === 32) { const g = ramp(C.glow === '#ffffff' ? C.accent : C.glow)[1]; for (let xx = 0; xx < w; xx++) cv.px(x - (w >> 1) + xx, y - 1 + h - 1, g); }
    if (style === 'big') { const g = ramp(C.glow === '#ffffff' ? '#58a8f8' : C.glow); cv.px(x, y + h - 2, g[2]); cv.px(x + 1, y + h - 2, g[3]); }
  }
  const D = ramp(C.main)[0];
  if (M.nose) { cv.px(M.nose[0], M.nose[1], EYE); cv.px(M.nose[0] + 1, M.nose[1], EYE); }
  if (M.mouth) { const [x, y] = M.mouth; if (M.smile) { cv.px(x - 2, y, D); cv.px(x - 1, y + 1, D); cv.px(x, y + 1, D); cv.px(x + 1, y + 1, D); cv.px(x + 2, y, D); } else { cv.px(x, y, D); cv.px(x + 1, y, D); } }
  if (M.grin) { const [x, y] = M.grin; for (let i = -4; i <= 4; i++) cv.px(x + i, y + (i % 2 ? 1 : 0), ramp(C.glow)[3]); }
  if (M.fangs) { const [x, y] = M.fangs; cv.px(x - 2, y, [255, 255, 255]); cv.px(x + 2, y, [255, 255, 255]); cv.px(x - 2, y + 1, [255, 255, 255]); cv.px(x + 2, y + 1, [255, 255, 255]); }
  if (M.tongue) { const [x, y] = M.tongue; cv.px(x, y, '#e04858'); cv.px(x - 1, y, '#e04858'); cv.px(x - 2, y - 1, '#e04858'); cv.px(x - 2, y + 1, '#e04858'); }
}
function marks(cv, M, C) {
  const D = ramp(C.main)[0], A = ramp(C.accent)[1];
  if (M.shell) { const { x, y } = M.body; for (const [a, b] of [[-8, -4], [0, -7], [8, -4], [-4, 3], [5, 3]]) { for (let i = -2; i <= 2; i++) { cv.px(x + a + i, y + b - 3, D); cv.px(x + a + i, y + b + 3, D); } cv.px(x + a - 3, y + b - 2, D); cv.px(x + a - 3, y + b + 2, D); cv.px(x + a + 3, y + b - 2, D); cv.px(x + a + 3, y + b + 2, D); cv.px(x + a - 4, y + b, D); cv.px(x + a + 4, y + b, D); } }
  if (M.shellLine) { const { x, y, ry } = M.body; for (let i = -ry + 2; i < ry; i++) cv.px(x, y + i, D); }
  if (M.feathers) { const { x, y } = M.body; for (const [a, b] of [[-4, 4], [3, 6], [-2, 10], [4, 12]]) { cv.px(x + a, y + b, A); cv.px(x + a + 1, y + b + 1, A); cv.px(x + a + 2, y + b, A); } }
}
function sparkleAura(cv, C, seed) {
  const g = ramp(C.glow);
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2, r = 26 + rnd() * 4, x = 32 + Math.cos(a) * r, y = 36 + Math.sin(a) * r * 0.8;
    cv.px(x, y, g[3]); if (i % 3 === 0) { cv.px(x - 1, y, g[2]); cv.px(x + 1, y, g[2]); cv.px(x, y - 1, g[2]); cv.px(x, y + 1, g[2]); }
  }
}

// Skalierung aller Teile um den Fußpunkt (32,60)
// ---------------------------------------------------------------- Art-Varianten
function hashStr(t) { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function variant(spec) {
  let h = hashStr(spec.kind + spec.main + spec.accent + (spec.glow || '') + (spec.extras || []).join()); const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 10000) / 10000;
  const big = (spec.stage || 1) > 1;
  return {
    hs: (big ? 0.9 : 1.0) + rnd() * 0.3, bx: 0.86 + rnd() * 0.32, by: 0.92 + rnd() * 0.14,
    pat: ['none', 'none', 'stripes', 'spots', 'saddle', 'stripes', 'spots', 'tips'][Math.floor(rnd() * 8)], per: 5 + Math.floor(rnd() * 3), tilt: rnd() * 0.9 - 0.45, off: Math.floor(rnd() * 7),
    eye: rnd() < 0.18 ? 'dot' : undefined, brow: rnd() < 0.45, blush: rnd() < 0.5, iris: rnd() < 0.6, head: ['crest', 'horns', 'crown', 'crest', 'horns'][Math.floor(rnd() * 5)], seed: h,
  };
}
const centerOf = p => p.shape === 'e' ? [p.x, p.y] : [p.pts.reduce((a, q) => a + q[0], 0) / p.pts.length, p.pts.reduce((a, q) => a + q[1], 0) / p.pts.length];
function groupOf(M, x, y) {
  const { head: h, body: b } = M;
  if (Math.hypot(x - h.x, y - h.y) < h.r * 1.35) return 'h';
  if (((x - b.x) / (b.rx * 1.15)) ** 2 + ((y - b.y) / (b.ry * 1.15)) ** 2 < 1) return 'b';
  return '';
}
function morphFn(M, V, g) {
  const { head: h, body: b } = M;
  if (g === 'h') return [x => h.x + (x - h.x) * V.hs, y => h.y + (y - h.y) * V.hs, V.hs, V.hs];
  if (g === 'b') return [x => b.x + (x - b.x) * V.bx, y => b.y + (y - b.y) * V.by, V.bx, V.by];
  return [x => x, y => y, 1, 1];
}
function morphParts(parts, M, V) {
  return parts.map(p => {
    const [cx, cy] = centerOf(p), [fx, fy, kx, ky] = morphFn(M, V, groupOf(M, cx, cy));
    return p.shape === 'e' ? { ...p, x: fx(p.x), y: fy(p.y), rx: p.rx * kx, ry: p.ry * ky } : { ...p, pts: p.pts.map(([x, y]) => [fx(x), fy(y)]) };
  });
}
function morphMeta(M, V) {
  const pt = q => { if (!q) return q; const [fx, fy] = morphFn(M, V, groupOf(M, q[0], q[1])); return [fx(q[0]), fy(q[1])]; };
  return { ...M, head: { ...M.head, r: M.head.r * V.hs }, body: { ...M.body, rx: M.body.rx * V.bx, ry: M.body.ry * V.by }, eyes: M.eyes.map(pt), nose: pt(M.nose), mouth: pt(M.mouth), grin: pt(M.grin), fangs: pt(M.fangs), tongue: pt(M.tongue) };
}
// Fellmuster nur auf Teilen in der Hauptfarbe, Ton (Licht/Schatten) bleibt erhalten
function pattern(cv, M, C, V) {
  if (V.pat === 'none') return;
  const n = cv.n, b = M.body, h = M.head, [hh, ss, ll] = rgb2hsl(hex2rgb(C.main));
  const mark = V.pat === 'tips' ? C.accent : ll > 0.5 ? '#' + hsl2rgb([hueToward(hh, 0.72, 0.15), Math.min(1, ss * 1.1), ll - 0.24]).map(v => v.toString(16).padStart(2, '0')).join('') : '#' + hsl2rgb([hueToward(hh, 0.15, 0.1), ss * 0.85, Math.min(0.92, ll + 0.2)]).map(v => v.toString(16).padStart(2, '0')).join('');
  const R = ramp(mark);
  let sd = V.seed || 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const spots = Array.from({ length: 5 }, () => { const a = rnd() * 6.28, d = 0.25 + rnd() * 0.55; return [b.x + Math.cos(a) * b.rx * d, b.y - Math.abs(Math.sin(a)) * b.ry * d * 0.9, 1.3 + rnd() * 1.3]; });
  for (let k = 0; k < n * n; k++) {
    const i = cv.id[k], t = cv.tn[k]; if (i < 0 || i >= cv.parts.length || t < 1) continue;
    const p = cv.parts[i]; if (p.c !== C.main) continue;
    const x = k % n, y = (k / n) | 0, inB = ((x + 0.5 - b.x) / b.rx) ** 2 + ((y + 0.5 - b.y) / b.ry) ** 2;
    let on = false;
    if (V.pat === 'stripes') on = inB < 0.95 && y < b.y + b.ry * 0.35 && ((((x + y * V.tilt + V.off) % V.per) + V.per) % V.per) < 2;
    else if (V.pat === 'spots') on = spots.some(([sx, sy, r]) => (x + 0.5 - sx) ** 2 + (y + 0.5 - sy) ** 2 < r * r);
    else if (V.pat === 'saddle') on = inB < 0.9 && y < b.y - b.ry * 0.2;
    else if (V.pat === 'tips') on = inB > 1.3 && Math.hypot(x - h.x, y - h.y) > h.r * 1.25 && y < b.y + b.ry * 0.6 && (Math.hypot(x - b.x, y - b.y) > Math.max(b.rx, b.ry) * 1.45);
    if (on) cv.col[k] = R[t];
  }
}
function brows(cv, M, C) {
  const D = ramp(C.main)[0];
  for (const [x, y] of M.eyes) { const e = [Math.round(x), Math.round(y)]; cv.px(e[0] - 2, e[1] - 3, D); cv.px(e[0] - 1, e[1] - 3, D); cv.px(e[0], e[1] - 2, D); cv.px(e[0] + 1, e[1] - 2, D); }
}
function blush(cv, M) { for (const [x, y] of M.eyes) { cv.px(x - 1, y + 3, [248, 140, 150]); cv.px(x, y + 3, [248, 140, 150]); } }

function scaleParts(parts, k, ox = 32, oy = 61) {
  const tx = v => ox + (v - ox) * k, ty = v => oy + (v - oy) * k;
  return parts.map(p => p.shape === 'e' ? { ...p, x: tx(p.x), y: ty(p.y), rx: p.rx * k, ry: p.ry * k } : { ...p, pts: p.pts.map(([x, y]) => [tx(x), ty(y)]) });
}
function scaleMeta(M, k, ox = 32, oy = 61) {
  const tx = v => ox + (v - ox) * k, ty = v => oy + (v - oy) * k, pt = ([x, y]) => [Math.round(tx(x)), Math.round(ty(y))];
  return {
    ...M, head: { x: tx(M.head.x), y: ty(M.head.y), r: M.head.r * k }, body: { x: tx(M.body.x), y: ty(M.body.y), rx: M.body.rx * k, ry: M.body.ry * k }, tail: { x: tx(M.tail.x), y: ty(M.tail.y) },
    eyes: M.eyes.map(pt), nose: M.nose && pt(M.nose), mouth: M.mouth && pt(M.mouth), grin: M.grin && pt(M.grin), fangs: M.fangs && pt(M.fangs), tongue: M.tongue && pt(M.tongue),
  };
}

// ---------------------------------------------------------------- Öffentliche Funktionen
// spec: {kind, main, accent, glow, stage, size, extras}; view: 'front' | 'back'
export function paintCreature(spec, view = 'front', shiny = false, n = 64) {
  const C = { main: spec.main, accent: spec.accent, glow: spec.glow || '#ffffff' };
  if (shiny) { C.main = shiftHue(C.main, 0.45); C.accent = shiftHue(C.accent, 0.3); }
  const tpl = KIND[spec.kind] || KIND.blob;
  const M0 = tpl(C, spec.stage || 1);
  const size = spec.size || 1, k = Math.max(0.74, Math.min(1.06, 0.6 + size * 0.33));
  const back = view === 'back';
  const V0 = variant(spec), exl = (spec.size || 1) < 1.45 ? [...new Set((spec.extras || []).map(e => e === 'crown' ? V0.head : e))] : spec.extras;
  const ex = extras(exl, M0, C);
  let parts = [...ex.back, ...M0.parts, ...ex.fr];
  // Rückansicht: Dinge hinter dem Körper (Schweif, Flügel) kommen nach vorn
  if (back) {
    const behind = M0.parts.filter(p => p.tone === -1 && !p._leg);
    parts = [...M0.parts.filter(p => !behind.includes(p)), ...ex.back, ...ex.fr, ...behind.map(p => ({ ...p, tone: 0 }))];
    parts = parts.map(p => (p.c === C.accent && p.matte) ? { ...p, c: C.main } : p); // Bauchseite verdeckt
  }
  // Art-eigene Abwandlung: Kopf-/Körperproportionen, Fellmuster, Augen (fest aus den Farben abgeleitet)
  const V = V0;
  const MV = morphMeta(M0, V);
  parts = morphParts(parts, M0, V);
  const cv = new Canvas64(n), q = n / 64;
  for (const p of scaleParts(scaleParts(parts, k), q, 0, 0)) cv.add(p);
  cv.lines();
  const M = scaleMeta(scaleMeta(MV, k), q, 0, 0);
  if (n >= 64) pattern(cv, M, C, V);
  if (n < 64) { if (!back) for (const [x, y] of M.eyes) { cv.px(x, y, [32, 24, 40]); cv.px(x, y - 1, [32, 24, 40]); } return cv.toCanvas(back); }
  if (!back) { face(cv, { ...M, eye: M.eye || V.eye, iris: V.iris }, C, (spec.stage || 1) === 1 && size < 0.8); if (V.brow && (spec.stage || 1) > 1) brows(cv, M, C); if (V.blush && (spec.stage || 1) === 1) blush(cv, M); marks(cv, M, C); }
  else if (M.shell || M.shellLine) marks(cv, M, C);
  if (spec.extras?.includes('aura')) sparkleAura(cv, C, (spec.main.charCodeAt(1) * 977) | 1);
  return cv.toCanvas(back);
}

// Trainer im Ganzkörperporträt (64×64)
export function paintTrainer(look, back = false) {
  const skin = look.skin, hair = look.hair, top = look.outfit, pants = look.pants || '#2c3346', acc = look.accent || '#f2d16b', shoe = '#3a2a20';
  const parts = [];
  // Beine und Schuhe
  parts.push(P(pants, [[24, 40], [31, 40], [30, 58], [25, 58]]), P(pants, [[33, 40], [40, 40], [39, 58], [34, 58]]));
  parts.push(E(26, 59, 5, 2.5, shoe), E(38, 59, 5, 2.5, shoe));
  
  // Arme hinter dem Körper
  parts.push(limb(top, 22, 25, 19, 40, 5), limb(top, 42, 25, 45, 40, 5));
  parts.push(E(19, 42, 2.6, 2.8, skin), E(45, 42, 2.6, 2.8, skin));
  // Oberkörper
  parts.push(P(top, [[22, 22], [42, 22], [43, 42], [21, 42]]));
  parts.push(P(acc, [[21, 39], [43, 39], [43, 43], [21, 43]], { flat: true }));
  if (!back) parts.push(P(acc, [[30, 22], [34, 22], [33, 30], [31, 30]], { line: false, flat: true }));
  // Zopf hinter dem Kopf
  if (look.pony) { parts.push(P(hair, back ? [[29, 18], [35, 18], [34, 34], [30, 34]] : [[39, 12], [45, 16], [46, 30], [42, 31], [40, 20]])); parts.push(E(back ? 32 : 42, back ? 19 : 14, 2.5, 2, acc, { flat: true })); }
  // Kopf
  parts.push(E(32, 22, 4, 3, skin, { tone: -1, flat: true }));
  if (!back) {
    parts.push(E(32, 14, 9, 9.5, hair));
    parts.push(E(32, 15, 8, 8.5, skin));
    if (look.jaw) parts.push(P(skin, [[24, 15], [40, 15], [40, 20], [36, 24], [28, 24], [24, 20]]));
    parts.push(P(hair, [[23, 12], [41, 12], [41, 8], [32, 4], [23, 8]]), tri(hair, 23, 11, 23, 19, 26, 12), tri(hair, 41, 11, 41, 19, 38, 12));
  } else {
    parts.push(E(32, 14, 9, 9.5, hair));
  }
  if (back) parts.push(P(acc, [[24, 25], [40, 25], [41, 39], [23, 39]]));
  if (look.cap) { parts.push(E(32, 8, 10, 5.5, look.cap)); if (!back) parts.push(P(look.cap, [[24, 9], [40, 9], [44, 12], [20, 12]])); }
  const cv = new Canvas64(64);
  for (const p of parts) cv.add(p);
  cv.lines();
  if (!back) {
    const ink = [32, 24, 40];
    for (const x of [28, 35]) { cv.px(x, 15, ink); cv.px(x, 16, ink); cv.px(x + 1, 15, ink); cv.px(x + 1, 16, ink); cv.px(x, 15, [255, 255, 255]); }
    const m = ramp(skin)[1]; cv.px(31, 20, m); cv.px(32, 20, m); cv.px(33, 20, m);
    if (look.jaw) { const hd = ramp(look.hair)[2] || ink; for (const x of [27, 28, 29, 34, 35, 36]) cv.px(x, 13, hd); const sh = ramp(skin)[2] || m; for (let x = 28; x <= 36; x++) cv.px(x, 23, sh); cv.px(25, 20, sh); cv.px(39, 20, sh); }
  }
  return cv.toCanvas(false);
}
