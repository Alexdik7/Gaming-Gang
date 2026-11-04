// Prozedurale Pixel-Art: Kacheln (16×16), Gebäude, Spielfiguren (16×18, 4 Richtungen × 3 Frames), Objekte
import { mulberry } from '../core/noise.js';
import { snap } from './engine.js';

export const T = 16;
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))); return '#' + ((f(r) << 16) | (f(g) << 8) | f(b)).toString(16).padStart(6, '0'); };
export { shade };

// ---------------------------------------------------------------- Kacheln
const PAL = { g1: '#70c858', g2: '#58b048', g3: '#98e070', gD: '#3e8a3a', path: '#e0c890', path2: '#c8a870', sand: '#f0e0a8', w1: '#4890e0', w2: '#78b8f8', w3: '#2868b8' };

// Pixelgenaue Struktur: jedes Pixel bekommt einen von mehreren Tönen (Rauschen, wolkig statt gleichmäßig)
const hash = (a, b, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function noiseFill(x, tones, seed, w = 16, h = 16, ox = 0, oy = 0) {
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    // grobes + feines Rauschen → weiche Flecken mit Körnung
    const v = hash(Math.floor((px + seed * 5) / 3), Math.floor((py + seed * 3) / 3), seed) * 0.6 + hash(px, py, seed + 7) * 0.4;
    x.fillStyle = tones[Math.min(tones.length - 1, Math.floor(v * tones.length))]; x.fillRect(ox + px, oy + py, 1, 1);
  }
}
const baseNoise = (x, hex, s) => noiseFill(x, [shade(hex, -0.1), shade(hex, -0.04), hex, shade(hex, 0.05)], s + 20);
const GRASS = ['#5aae48', '#62b84e', '#6cc456', '#72ca5a', '#7ad262'], GRASS_D = ['#3c8a40', '#43944a', '#4a9c4c', '#52a654', '#5aae58'];
function grass(x, seed, dark = false) {
  const r = mulberry(seed * 31 + 5);
  noiseFill(x, dark ? GRASS_D : GRASS, seed);
  // kleine Halmbüschel mit Licht oben und Schatten unten
  for (let i = 0; i < 6; i++) {
    const a = 1 + Math.floor(r() * 13), b = 2 + Math.floor(r() * 12);
    x.fillStyle = dark ? '#2e6e34' : '#3f8e3a'; x.fillRect(a, b, 1, 2); x.fillRect(a + 2, b, 1, 2);
    x.fillStyle = dark ? '#6aba6a' : '#9ade74'; x.fillRect(a + 1, b - 1, 1, 2);
  }
  // seltene Details: Kieselstein oder Kleeblatt
  if (seed % 5 === 3) { x.fillStyle = '#9a9a88'; x.fillRect(11, 12, 2, 1); x.fillStyle = '#d8d8c8'; x.fillRect(11, 11, 1, 1); }
  if (seed % 5 === 1 && !dark) { x.fillStyle = '#4e9e40'; x.fillRect(4, 12, 3, 1); x.fillRect(5, 11, 1, 3); }
}
// Schattierte Kugel/Krone aus Einzelpixeln: Licht von oben links, Büschel-Struktur, dunkle Kontur
function shadedBlob(x, cx, cy, rx, ry, tones, seed, outline) {
  const pts = [];
  for (let py = Math.floor(cy - ry - 1); py <= Math.ceil(cy + ry + 1); py++) for (let px = Math.floor(cx - rx - 1); px <= Math.ceil(cx + rx + 1); px++) {
    const dx = (px + 0.5 - cx) / rx, dy = (py + 0.5 - cy) / ry, d = dx * dx + dy * dy;
    // Rand leicht ausgefranst wie Laub
    const edge = 1 - hash(px, py, seed) * 0.18;
    if (d > edge) continue;
    pts.push([px, py, dx, dy, d]);
  }
  const inside = new Set(pts.map(([a, b]) => a + ',' + b));
  for (const [px, py, dx, dy] of pts) {
    const border = !inside.has(px + 1 + ',' + py) || !inside.has(px - 1 + ',' + py) || !inside.has(px + ',' + (py + 1)) || !inside.has(px + ',' + (py - 1));
    if (border && outline) { x.fillStyle = outline; x.fillRect(px, py, 1, 1); continue; }
    const clump = hash(Math.floor((px + seed) / 3), Math.floor((py + seed * 2) / 3), seed + 3);
    let l = 0.55 - dx * 0.35 - dy * 0.45 + (clump - 0.5) * 0.55 + (hash(px, py, seed + 9) - 0.5) * 0.15;
    x.fillStyle = tones[Math.max(0, Math.min(tones.length - 1, Math.floor(l * tones.length)))]; x.fillRect(px, py, 1, 1);
  }
}
// Hohe Bäume (16×24): unten 16 Pixel als Kachel, oben 8 Pixel als Krone über den Figuren
const TREES = {
  oak: { tones: ['#1e5a2c', '#2a7034', '#358640', '#46a04c', '#62bc5a', '#8ad670'], outline: '#143a20', trunk: ['#4a2e1a', '#6a4428', '#8a5a34'] },
  dark: { tones: ['#123a34', '#1a4c42', '#235e50', '#2f7260', '#428a74', '#5ea48a'], outline: '#0a221e', trunk: ['#30201a', '#4a3020', '#5e3e28'] },
};
const treeCache = new Map();
function tallTree(kind, seed = 0) {
  const k = kind + seed; if (treeCache.has(k)) return treeCache.get(k);
  const [c, x] = cv(16, 24);
  if (kind === 'pine' || kind === 'snowpine') {
    const snow = kind === 'snowpine', tones = snow ? ['#1a4a44', '#245a52', '#2e6a5a', '#3a7c68', '#4a8e76'] : ['#163e26', '#1e5030', '#28623a', '#337646', '#438a52'];
    x.fillStyle = '#3a2416'; x.fillRect(7, 19, 2, 5); x.fillStyle = '#6a4428'; x.fillRect(7, 19, 1, 5);
    const layers = [[1, 3], [4, 6], [8, 9], [12, 12], [16, 15]];
    for (const [ty, hw] of layers) {
      for (let row = 0; row < 5; row++) {
        const y = ty + row, w = Math.round(hw * (0.45 + row * 0.14));
        for (let px = 8 - w; px < 8 + w; px++) {
          const side = (px - 8 + 0.5) / w, l = 0.6 - side * 0.5 - row * 0.06 + (hash(px, y, seed) - 0.5) * 0.3;
          const edge = px === 8 - w || px === 8 + w - 1 || row === 4;
          x.fillStyle = edge ? (snow ? '#12302c' : '#0e2a18') : tones[Math.max(0, Math.min(4, Math.floor(l * 5)))]; x.fillRect(px, y, 1, 1);
          if (snow && row === 0 && !edge && hash(px, y, 4) > 0.35) { x.fillStyle = '#f4f8ff'; x.fillRect(px, y, 1, 1); }
          if (snow && row === 1 && !edge && side < 0 && hash(px, y, 5) > 0.5) { x.fillStyle = '#dce8f4'; x.fillRect(px, y, 1, 1); }
        }
      }
    }
  } else {
    const T = TREES[kind];
    // Stamm mit Wurzeln
    x.fillStyle = T.trunk[0]; x.fillRect(5, 15, 6, 9); x.fillRect(4, 22, 8, 2);
    x.fillStyle = T.trunk[1]; x.fillRect(6, 15, 4, 8); x.fillRect(5, 22, 2, 1); x.fillRect(9, 22, 2, 1);
    x.fillStyle = T.trunk[2]; x.fillRect(6, 15, 1, 8);
    x.fillStyle = T.trunk[0]; x.fillRect(8, 18, 1, 2);
    shadedBlob(x, 8, 9, 7.9, 8.6, T.tones, seed, T.outline);
    // ein paar Blätter hängen über den Rand
    x.fillStyle = T.tones[2]; x.fillRect(3, 17, 2, 1); x.fillRect(11, 16, 2, 1);
  }
  treeCache.set(k, c); return c;
}
export function treeCrown(kind, seed = 0) {
  const k = 'crown' + kind + seed; if (treeCache.has(k)) return treeCache.get(k);
  const [c, x] = cv(16, 8); x.drawImage(tallTree(kind, seed), 0, 0, 16, 8, 0, 0, 16, 8); treeCache.set(k, c); return c;
}
export const TREE_KIND = { T: 'oak', D: 'dark', P: 'pine', G: 'snowpine' };
function treeTile(x, kind, seed) { x.drawImage(tallTree(kind, seed % 3), 0, 8, 16, 16, 0, 0, 16, 16); }
const DRAW = {
  grass: (x, f, s) => grass(x, s),
  flowers: (x, f, s) => {
    grass(x, s);
    const cols = [['#f85878', '#ffd0e0'], ['#f8f8f8', '#f8e060'], ['#f8d030', '#fff8b0']];
    for (const [a, b, k] of [[3, 4, 0], [10, 9, 1], [5, 12, 2], [12, 2, 1]]) {
      const [c1, c2] = cols[(k + s) % 3]; const o = f ? 1 : 0;
      x.fillStyle = c1; x.fillRect(a - 1, b + o, 3, 1); x.fillRect(a, b - 1 + o, 1, 3); x.fillStyle = c2; x.fillRect(a, b + o, 1, 1);
    }
  },
  tall: (x, f, s) => { baseNoise(x, '#4fa444', s); tallBlades(x, f, 0); },
  path: (x, f, s) => {
    noiseFill(x, ['#cdb27c', '#d6bc86', '#dcc490', '#e2cc9a', '#e8d4a4'], s + 40);
    const r = mulberry(s + 9);
    // Kiesel mit Licht und Schatten
    for (let i = 0; i < 3; i++) { const a = 1 + Math.floor(r() * 13), b = 1 + Math.floor(r() * 13); x.fillStyle = '#a08a68'; x.fillRect(a, b + 1, 2, 1); x.fillStyle = '#f4e8c8'; x.fillRect(a, b, 1, 1); x.fillStyle = '#c0a878'; x.fillRect(a + 1, b, 1, 1); }
    x.fillStyle = 'rgba(120,90,50,.18)'; x.fillRect(Math.floor(r() * 10), 4 + Math.floor(r() * 8), 5, 1);
  },
  sand: (x, f, s) => {
    noiseFill(x, ['#e4d098', '#eadaa4', '#f0e0ae', '#f4e6b8', '#f8ecc4'], s + 60);
    const r = mulberry(s + 3); for (let i = 0; i < 3; i++) { x.fillStyle = '#c8b480'; x.fillRect(Math.floor(r() * 15), Math.floor(r() * 15), 1, 1); }
    if (s % 4 === 1) { x.fillStyle = '#f8f0e0'; x.fillRect(4, 9, 2, 1); x.fillStyle = '#e8b0a0'; x.fillRect(5, 9, 1, 1); }
  },
  water: (x, f, s) => {
    // Tiefe: leicht wolkiges Blau, darüber wandernde Wellenkämme mit Lichtkante
    noiseFill(x, ['#2f70c4', '#3478ca', '#3a80d0', '#4088d6', '#4890dc'], s + 80);
    const waves = [[1, 3, 5], [9, 7, 4], [3, 11, 5], [11, 14, 3], [6, 1, 3]];
    for (const [a, b, w] of waves) {
      const xx = (a + f * 2 + 16) % 16;
      x.fillStyle = '#2a64b4'; for (let i = 0; i < w; i++) x.fillRect((xx + i) % 16, b + 1, 1, 1);
      x.fillStyle = '#78b8f4'; for (let i = 0; i < w; i++) x.fillRect((xx + i) % 16, b, 1, 1);
      x.fillStyle = '#c8e8ff'; x.fillRect((xx + 1) % 16, b, 1, 1);
    }
    if ((s + f) % 3 === 0) { x.fillStyle = '#ffffff'; x.fillRect((5 + s * 3) % 14, (9 + s) % 14, 1, 1); }
  },
  tree: (x, f, s) => { grass(x, s); treeTile(x, 'oak', s); },
  dtree: (x, f, s) => { grass(x, s, true); treeTile(x, 'dark', s); },
  pine: (x, f, s) => { grass(x, s); treeTile(x, 'pine', s); },
  crock: (x, f, s) => { DRAW.cave(x, f, s); DRAW.rockTop(x); },
  rockTop: x => {
    x.fillStyle = '#404048'; x.beginPath(); x.ellipse(8, 9, 7, 6, 0, 0, 7); x.fill();
    x.fillStyle = '#98989c'; x.beginPath(); x.ellipse(8, 8.5, 6, 5, 0, 0, 7); x.fill();
    x.fillStyle = '#c8c8cc'; x.fillRect(5, 5, 4, 2); x.fillStyle = '#707078'; x.fillRect(9, 11, 4, 1);
  },
  rock: (x, f, s) => {
    grass(x, s); x.fillStyle = '#404048'; x.beginPath(); x.ellipse(8, 9, 7, 6, 0, 0, 7); x.fill();
    x.fillStyle = '#98989c'; x.beginPath(); x.ellipse(8, 8.5, 6, 5, 0, 0, 7); x.fill();
    x.fillStyle = '#c8c8cc'; x.fillRect(5, 5, 4, 2); x.fillStyle = '#707078'; x.fillRect(9, 11, 4, 1);
  },
  fence: (x, f, s) => {
    grass(x, s); x.fillStyle = '#5a3a20'; x.fillRect(0, 6, 16, 4); x.fillRect(2, 3, 3, 11); x.fillRect(11, 3, 3, 11);
    x.fillStyle = '#c89058'; x.fillRect(0, 7, 16, 2); x.fillRect(3, 4, 1, 9); x.fillRect(12, 4, 1, 9);
  },
  ledge: (x, f, s) => {
    grass(x, s); x.fillStyle = '#3e7a30'; x.fillRect(0, 10, 16, 3); x.fillStyle = '#a8784a'; x.fillRect(0, 13, 16, 3); x.fillStyle = '#7a5030'; x.fillRect(0, 15, 16, 1);
    x.fillStyle = '#98e070'; x.fillRect(0, 9, 16, 1);
  },
  sign: (x, f, s) => {
    grass(x, s); x.fillStyle = '#5a3a20'; x.fillRect(7, 9, 2, 6); x.fillRect(2, 2, 12, 9);
    x.fillStyle = '#d8a868'; x.fillRect(3, 3, 10, 7); x.fillStyle = '#8a6038'; x.fillRect(4, 5, 8, 1); x.fillRect(4, 7, 6, 1);
  },
  bridge: (x, f, s) => {
    DRAW.water(x, f, s); x.fillStyle = '#6a4a28'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#b8884a';
    for (let i = 0; i < 4; i++) x.fillRect(0, i * 4 + 1, 16, 2);
    x.fillStyle = '#4a3018'; x.fillRect(0, 0, 1, 16); x.fillRect(15, 0, 1, 16);
  },
  cave: (x, f, s) => { const r = mulberry(s + 77); x.fillStyle = '#a88a68'; x.fillRect(0, 0, 16, 16); for (let i = 0; i < 6; i++) { x.fillStyle = r() < 0.5 ? '#8a7050' : '#c0a080'; x.fillRect(Math.floor(r() * 15), Math.floor(r() * 15), 2, 1); } },
  cwall: (x, f, s) => {
    const r = mulberry(s + 55); x.fillStyle = '#5a4030'; x.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 5; i++) { const a = Math.floor(r() * 12), b = Math.floor(r() * 12); x.fillStyle = '#7a5a40'; x.fillRect(a, b, 5, 3); x.fillStyle = '#9a7a58'; x.fillRect(a, b, 5, 1); }
    x.fillStyle = '#3a2818'; x.fillRect(0, 14, 16, 2);
  },
  hole: (x, f, s) => { DRAW.cwall(x, f, s); x.fillStyle = '#100808'; x.beginPath(); x.ellipse(8, 11, 6, 7, 0, Math.PI, 0); x.fill(); x.fillRect(2, 11, 12, 5); },
  stone: (x, f, s) => {
    x.fillStyle = '#b8b0a0'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#9a9282'; x.fillRect(0, 7, 16, 1); x.fillRect(0, 15, 16, 1); x.fillRect(7, 0, 1, 7); x.fillRect(3, 8, 1, 7); x.fillRect(12, 8, 1, 7);
    x.fillStyle = '#6aa848'; if (s % 3 === 0) x.fillRect(1, 13, 3, 2);
  },
  pillar: (x, f, s) => {
    DRAW.stone(x, f, s); x.fillStyle = '#5a5850'; x.fillRect(3, 0, 10, 16); x.fillStyle = '#d8d0c0'; x.fillRect(4, 0, 8, 15); x.fillStyle = '#b0a898'; x.fillRect(9, 0, 3, 15); x.fillRect(4, 3, 8, 1);
    x.fillStyle = '#6aa848'; x.fillRect(4, 12, 3, 3);
  },
  altar: (x, f, s) => {
    DRAW.stone(x, f, s); x.fillStyle = '#4a4840'; x.fillRect(1, 6, 14, 10); x.fillStyle = '#8a8478'; x.fillRect(2, 7, 12, 8);
    x.fillStyle = f ? '#9cffc8' : '#5aa888'; x.beginPath(); x.moveTo(8, 0); x.lineTo(12, 5); x.lineTo(8, 10); x.lineTo(4, 5); x.fill();
    x.fillStyle = '#ffffff'; x.fillRect(7, 2, 1, 3);
  },
  rune: (x, f, s) => {
    grass(x, s, true); x.fillStyle = '#3a3a40'; x.fillRect(3, 1, 10, 15); x.fillStyle = '#8a8890'; x.fillRect(4, 2, 8, 13);
    x.fillStyle = '#5a5860'; x.fillRect(6, 5, 4, 1); x.fillRect(7, 5, 2, 6); x.fillRect(5, 9, 6, 1);
  },
  runeOn: (x, f, s) => {
    grass(x, s, true); x.fillStyle = '#3a3a40'; x.fillRect(3, 1, 10, 15); x.fillStyle = '#9aa8a0'; x.fillRect(4, 2, 8, 13);
    x.fillStyle = f ? '#5affd0' : '#c8fff0'; x.fillRect(6, 5, 4, 1); x.fillRect(7, 5, 2, 6); x.fillRect(5, 9, 6, 1);
  },
  // Innenräume
  floor: (x, f, s) => { x.fillStyle = '#e0b880'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#c89860'; x.fillRect(0, 7, 16, 1); x.fillRect(0, 15, 16, 1); x.fillRect((s % 2) * 8 + 3, 0, 1, 7); x.fillRect(((s + 1) % 2) * 8 + 5, 8, 1, 7); },
  tilefl: (x, f, s) => { x.fillStyle = '#f0f0e8'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#d0d8e0'; x.fillRect(0, 0, 8, 8); x.fillRect(8, 8, 8, 8); },
  wall: (x, f, s) => { x.fillStyle = '#f8ecd0'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#e0d0b0'; for (let i = 0; i < 16; i += 4) x.fillRect(i, 0, 1, 12); x.fillStyle = '#a07850'; x.fillRect(0, 12, 16, 4); x.fillStyle = '#c89868'; x.fillRect(0, 12, 16, 1); },
  window: (x, f, s) => { DRAW.wall(x, f, s); x.fillStyle = '#6a4a30'; x.fillRect(3, 2, 10, 8); x.fillStyle = '#a8e0ff'; x.fillRect(4, 3, 8, 6); x.fillStyle = '#ffffff'; x.fillRect(5, 4, 2, 2); x.fillStyle = '#6a4a30'; x.fillRect(7, 3, 1, 6); },
  counter: (x, f, s) => { DRAW.tilefl(x, f, s); x.fillStyle = '#7a4a2a'; x.fillRect(0, 2, 16, 13); x.fillStyle = '#c87848'; x.fillRect(0, 2, 16, 4); x.fillStyle = '#e8a070'; x.fillRect(0, 2, 16, 1); },
  table: (x, f, s) => { DRAW.floor(x, f, s); x.fillStyle = '#6a4020'; x.fillRect(1, 3, 14, 10); x.fillStyle = '#b8783a'; x.fillRect(2, 4, 12, 7); x.fillStyle = '#d89858'; x.fillRect(2, 4, 12, 1); x.fillStyle = '#6a4020'; x.fillRect(2, 13, 2, 3); x.fillRect(12, 13, 2, 3); },
  bed: (x, f, s) => { DRAW.floor(x, f, s); x.fillStyle = '#4a3020'; x.fillRect(1, 0, 14, 16); x.fillStyle = '#ffffff'; x.fillRect(2, 1, 12, 4); x.fillStyle = '#e85870'; x.fillRect(2, 6, 12, 9); x.fillStyle = '#f888a0'; x.fillRect(2, 6, 12, 2); },
  tv: (x, f, s) => { DRAW.floor(x, f, s); x.fillStyle = '#303038'; x.fillRect(1, 2, 14, 11); x.fillStyle = f ? '#68a8f0' : '#88c8ff'; x.fillRect(3, 4, 10, 7); x.fillStyle = '#5a3a20'; x.fillRect(2, 13, 12, 3); },
  shelf: (x, f, s) => { DRAW.wall(x, f, s); x.fillStyle = '#5a3a20'; x.fillRect(1, 0, 14, 16); const c = ['#e85858', '#5878e8', '#58c868', '#f8c838', '#a868e8']; for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) { x.fillStyle = c[(i + r + s) % 5]; x.fillRect(2 + i * 2.5, 1 + r * 5, 2, 4); } },
  machine: (x, f, s) => { DRAW.tilefl(x, f, s); x.fillStyle = '#3a4a5a'; x.fillRect(1, 0, 14, 15); x.fillStyle = '#c8d8e8'; x.fillRect(2, 1, 12, 6); x.fillStyle = f ? '#5affb0' : '#38c888'; for (let i = 0; i < 3; i++) x.fillRect(3 + i * 4, 9, 3, 3); },
  pc: (x, f, s) => { DRAW.tilefl(x, f, s); x.fillStyle = '#5a6070'; x.fillRect(2, 1, 12, 10); x.fillStyle = f ? '#58f8a8' : '#48d090'; x.fillRect(3, 2, 10, 7); x.fillStyle = '#8890a0'; x.fillRect(1, 11, 14, 4); },
  plant: (x, f, s) => { DRAW.floor(x, f, s); x.fillStyle = '#b8582a'; x.fillRect(4, 10, 8, 6); x.fillStyle = '#2e8a3e'; x.beginPath(); x.arc(8, 6, 6, 0, 7); x.fill(); x.fillStyle = '#58c060'; x.fillRect(5, 3, 3, 3); },
  rug: (x, f, s) => { x.fillStyle = '#c84848'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#f8d870'; x.fillRect(1, 1, 14, 1); x.fillRect(1, 14, 14, 1); x.fillStyle = '#e86868'; x.fillRect(3, 4, 10, 8); },
  mat: (x, f, s) => { DRAW.floor(x, f, s); x.fillStyle = '#7a2838'; x.fillRect(2, 4, 12, 10); x.fillStyle = '#b84858'; x.fillRect(3, 5, 10, 8); },
  orbs: (x, f, s) => { DRAW.table(x, f, s); for (const [a, c] of [[3, '#ff7a33'], [8, '#3d9bff'], [13, '#4fcf5c']]) { x.fillStyle = '#202030'; x.beginPath(); x.arc(a, 6.5, 2.4, 0, 7); x.fill(); x.fillStyle = c; x.beginPath(); x.arc(a, 6.5, 1.7, 0, 7); x.fill(); x.fillStyle = '#fff'; x.fillRect(a - 1, 5, 1, 1); } },
  // Beerenbusch (Variante bestimmt Beerenfarbe)
  berry: (x, f, s) => {
    grass(x, s); x.fillStyle = 'rgba(0,40,0,.25)'; x.fillRect(2, 13, 12, 2);
    x.fillStyle = '#1e4a24'; x.beginPath(); x.arc(8, 8, 7, 0, 7); x.fill();
    x.fillStyle = '#3a8a3a'; x.beginPath(); x.arc(8, 8, 6, 0, 7); x.fill();
    x.fillStyle = '#5aaa4a'; x.beginPath(); x.arc(7, 6.5, 4, 0, 7); x.fill();
    const c = s % 2 ? ['#4a68e8', '#a8c0ff'] : ['#e83a4a', '#ffb0b8'];
    for (const [a, b] of [[4, 6], [9, 4], [11, 9], [6, 10]]) { x.fillStyle = c[0]; x.fillRect(a, b, 2, 2); x.fillStyle = c[1]; x.fillRect(a, b, 1, 1); }
  },
  // Region Drakmor
  mground: (x, f, s) => {
    const r = mulberry(s + 41); x.fillStyle = '#a8987a'; x.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 7; i++) { x.fillStyle = r() < 0.5 ? '#8a7a60' : '#c0b090'; x.fillRect(Math.floor(r() * 15), Math.floor(r() * 15), r() < 0.4 ? 2 : 1, 1); }
    if (s % 5 === 2) { x.fillStyle = '#6a8a48'; x.fillRect(3, 12, 2, 2); x.fillRect(5, 13, 1, 1); }
  },
  mgrass: (x, f, s) => { baseNoise(x, '#6e8052', s); tallBlades(x, f, 0, 'mount'); },
  cliff: (x, f, s) => {
    x.fillStyle = '#4a4038'; x.fillRect(0, 0, 16, 16);
    x.fillStyle = '#6a5c4c'; x.fillRect(1, 1, 7, 6); x.fillRect(9, 3, 6, 5); x.fillRect(2, 9, 6, 5); x.fillRect(10, 10, 5, 5);
    x.fillStyle = '#8a7a64'; x.fillRect(1, 1, 7, 1); x.fillRect(9, 3, 6, 1); x.fillRect(2, 9, 6, 1); x.fillRect(10, 10, 5, 1);
    x.fillStyle = '#2e2620'; x.fillRect(0, 7, 16, 1); x.fillRect(8, 0, 1, 7);
  },
  hole: (x, f, s) => {
    const fl = DRAW.__floor || DRAW.gym; fl(x, f, s);
    x.fillStyle = '#1a1410'; x.beginPath(); x.ellipse(8, 8.5, 6.5, 5.5, 0, 0, 7); x.fill();
    x.fillStyle = '#3a2e24'; x.fillRect(3, 5, 10, 1); x.fillStyle = '#0a0806'; x.beginPath(); x.ellipse(8, 9.5, 4.5, 3.5, 0, 0, 7); x.fill();
  },
  holeFilled: (x, f, s) => { DRAW.gym(x, f, s); x.fillStyle = '#8a7a6a'; x.beginPath(); x.ellipse(8, 8.5, 6, 5, 0, 0, 7); x.fill(); x.fillStyle = '#a89888'; x.fillRect(5, 6, 4, 2); },
  // Region Solaria
  dune: (x, f, s) => {
    const r = mulberry(s + 21); x.fillStyle = '#f0d898'; x.fillRect(0, 0, 16, 16);
    x.fillStyle = '#e0c480'; x.fillRect(0, 5 + (s % 3), 16, 1); x.fillRect(0, 12 - (s % 2), 16, 1);
    x.fillStyle = '#f8ecc0'; x.fillRect(0, 4 + (s % 3), 16, 1);
    for (let i = 0; i < 4; i++) { x.fillStyle = r() < 0.5 ? '#d0b070' : '#fff4d0'; x.fillRect(Math.floor(r() * 15), Math.floor(r() * 15), 1, 1); }
  },
  brush: (x, f, s) => { DRAW.dune(x, f, s); tallBlades(x, f, 0, 'dry'); },
  cactus: (x, f, s) => {
    DRAW.dune(x, f, s); x.fillStyle = 'rgba(120,80,20,.25)'; x.fillRect(4, 14, 9, 2);
    x.fillStyle = '#1e5a2a'; x.fillRect(6, 1, 5, 15); x.fillRect(2, 5, 3, 6); x.fillRect(12, 3, 3, 6); x.fillRect(4, 9, 3, 2); x.fillRect(10, 7, 3, 2);
    x.fillStyle = '#3a9a48'; x.fillRect(7, 2, 3, 13); x.fillRect(3, 6, 1, 4); x.fillRect(13, 4, 1, 4);
    x.fillStyle = '#7ad078'; x.fillRect(7, 2, 1, 12);
    x.fillStyle = s % 2 ? '#f878a8' : '#f8e0a0'; x.fillRect(8, 0, 2, 2);
  },
  sandwall: (x, f, s) => {
    x.fillStyle = '#a8784a'; x.fillRect(0, 0, 16, 16);
    x.fillStyle = '#c8985a'; x.fillRect(0, 0, 7, 3); x.fillRect(8, 0, 8, 3); x.fillRect(0, 4, 3, 3); x.fillRect(4, 4, 8, 3); x.fillRect(13, 4, 3, 3); x.fillRect(0, 8, 7, 3); x.fillRect(8, 8, 8, 3);
    x.fillStyle = '#e0b878'; x.fillRect(0, 0, 7, 1); x.fillRect(8, 0, 8, 1); x.fillRect(4, 4, 8, 1); x.fillRect(0, 8, 7, 1); x.fillRect(8, 8, 8, 1);
    x.fillStyle = '#6a4828'; x.fillRect(0, 12, 16, 4); x.fillStyle = '#8a5e34'; x.fillRect(0, 12, 16, 1);
  },
  tfloor: (x, f, s) => {
    x.fillStyle = '#d8b878'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#b8945a'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 0, 1, 16);
    x.fillStyle = '#e8cc90'; x.fillRect(1, 1, 14, 1); if (s % 4 === 0) { x.fillStyle = '#c8a46a'; x.fillRect(5, 7, 6, 1); x.fillRect(7, 5, 2, 5); }
  },
  gate: (x, f, s) => {
    DRAW.tfloor(x, f, s); x.fillStyle = '#4a3a2a'; x.fillRect(1, 0, 14, 16);
    x.fillStyle = '#c89838'; for (let i = 0; i < 4; i++) x.fillRect(2 + i * 3.5, 1, 2, 14);
    x.fillStyle = '#f8d870'; for (let i = 0; i < 4; i++) x.fillRect(2 + i * 3.5, 1, 1, 14);
    x.fillStyle = '#8a6a2a'; x.fillRect(1, 7, 14, 2);
  },
  gateOpen: (x, f, s) => { DRAW.tfloor(x, f, s); x.fillStyle = '#8a6a2a'; x.fillRect(1, 0, 14, 2); x.fillStyle = '#c89838'; for (let i = 0; i < 4; i++) x.fillRect(2 + i * 3.5, 0, 2, 1); },
  plate: (x, f, s) => { DRAW.tfloor(x, f, s); x.fillStyle = '#6a5038'; x.fillRect(2, 2, 12, 12); x.fillStyle = '#a88858'; x.fillRect(3, 3, 10, 10); x.fillStyle = '#f8d870'; x.fillRect(6, 6, 4, 4); x.fillStyle = '#fff4c0'; x.fillRect(6, 6, 2, 1); },
  plateOn: (x, f, s) => { DRAW.tfloor(x, f, s); x.fillStyle = '#4a3a28'; x.fillRect(2, 2, 12, 12); x.fillStyle = '#7a6040'; x.fillRect(3, 3, 10, 10); x.fillStyle = f ? '#88f8f8' : '#58d8e8'; x.fillRect(6, 6, 4, 4); },
  // Region Frostheim
  snow: (x, f, s) => {
    const r = mulberry(s + 13); x.fillStyle = '#eef4fa'; x.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 6; i++) { x.fillStyle = r() < 0.6 ? '#d4e0ee' : '#ffffff'; x.fillRect(Math.floor(r() * 15), Math.floor(r() * 15), r() < 0.5 ? 2 : 1, 1); }
    if (s % 4 === 1) { x.fillStyle = '#b8c8dc'; x.fillRect(4, 11, 3, 1); }
  },
  snowtall: (x, f, s) => { baseNoise(x, '#d4e0ee', s); tallBlades(x, f, 0, 'snow'); },
  ice: (x, f, s) => {
    x.fillStyle = '#a8d4f0'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#c4e4f8'; x.fillRect(0, 0, 16, 2); x.fillRect(0, 8, 16, 1);
    x.fillStyle = '#ffffff'; x.fillRect(3 + (s % 3), 3, 4, 1); x.fillRect(4 + (s % 3), 4, 2, 1); x.fillRect(10, 11, 3, 1);
    x.fillStyle = '#88b8dc'; x.fillRect(12, 2, 1, 4); x.fillRect(1, 12, 4, 1);
  },
  snowpine: (x, f, s) => { DRAW.snow(x, f, s); treeTile(x, 'snowpine', s); },
  snowrock: (x, f, s) => {
    DRAW.snow(x, f, s); x.fillStyle = '#3a4658'; x.beginPath(); x.ellipse(8, 9, 7, 6, 0, 0, 7); x.fill();
    x.fillStyle = '#8a98aa'; x.beginPath(); x.ellipse(8, 9, 6, 5, 0, 0, 7); x.fill();
    x.fillStyle = '#f4f8ff'; x.beginPath(); x.ellipse(7, 6, 5, 2.5, 0, 0, 7); x.fill(); x.fillStyle = '#5a687a'; x.fillRect(9, 11, 4, 1);
  },
  // Eklipse-Versteck
  metal: (x, f, s) => {
    x.fillStyle = '#5a6070'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#48505e'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 0, 1, 16); x.fillRect(8, 0, 1, 16); x.fillRect(0, 8, 16, 1);
    x.fillStyle = '#6e7686'; x.fillRect(1, 1, 7, 1); x.fillRect(9, 9, 7, 1); x.fillStyle = '#8a92a2'; x.fillRect(3, 4, 1, 1); x.fillRect(12, 12, 1, 1);
    if (s % 5 === 0) { x.fillStyle = '#9a7ae8'; x.fillRect(5, 11, 6, 1); }
  },
  mwall: (x, f, s) => {
    x.fillStyle = '#1e1a2a'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#2e2840'; x.fillRect(1, 1, 14, 11); x.fillStyle = '#3e3656'; x.fillRect(1, 1, 14, 2);
    x.fillStyle = '#140f1e'; x.fillRect(0, 13, 16, 3); x.fillStyle = f ? '#c8a8ff' : '#8a6ad8'; x.fillRect(6, 6, 4, 2);
  },
  // Region Ignis
  ash: (x, f, s) => {
    const r = mulberry(s + 31); x.fillStyle = '#9a8a7a'; x.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 7; i++) { x.fillStyle = r() < 0.5 ? '#867664' : '#b0a090'; x.fillRect(Math.floor(r() * 15), Math.floor(r() * 15), r() < 0.5 ? 2 : 1, 1); }
    if (s % 4 === 0) { x.fillStyle = '#5a4a40'; x.fillRect(10, 11, 2, 1); x.fillStyle = '#c8b8a8'; x.fillRect(10, 10, 2, 1); }
  },
  ashtall: (x, f, s) => { baseNoise(x, '#847462', s); tallBlades(x, f, 0, 'ash'); },
  lava: (x, f, s) => {
    x.fillStyle = '#e8481a'; x.fillRect(0, 0, 16, 16);
    x.fillStyle = '#f88a2a'; for (const [a, b] of [[2, 2], [9, 6], [4, 11], [12, 12]]) x.fillRect((a + f * 2) % 16, b, 4, 2);
    x.fillStyle = '#ffd860'; for (const [a, b] of [[3, 3], [10, 7], [5, 12]]) x.fillRect((a + f * 2) % 16, b, 2, 1);
    x.fillStyle = '#8a2010'; for (const [a, b] of [[7, 1], [1, 8], [12, 4]]) x.fillRect((a + 16 - f) % 16, b, 3, 1);
  },
  basalt: (x, f, s) => {
    DRAW.ash(x, f, s);
    x.fillStyle = '#1e1a1c'; x.fillRect(1, 2, 14, 14); x.fillRect(3, 0, 10, 2);
    x.fillStyle = '#4a4248'; x.fillRect(2, 2, 12, 12); x.fillRect(4, 1, 8, 1);
    x.fillStyle = '#6a6068'; x.fillRect(3, 2, 5, 2); x.fillRect(3, 4, 2, 4);
    x.fillStyle = '#2e282c'; x.fillRect(9, 9, 4, 4); x.fillRect(2, 13, 12, 1);
    if (s % 3 === 0) { x.fillStyle = '#ff7a2a'; x.fillRect(10, 6, 1, 3); x.fillRect(11, 8, 2, 1); }
  },
  ember: (x, f, s) => {
    x.fillStyle = '#7a3a2a'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#5a2a20'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 0, 1, 16);
    x.fillStyle = '#9a4a32'; x.fillRect(2, 2, 12, 12); x.fillStyle = '#b85a3a'; x.fillRect(2, 2, 12, 1);
    if ((s + f) % 3 === 0) { x.fillStyle = '#ffb04a'; x.fillRect(7, 8, 2, 1); }
  },
  void: x => { x.fillStyle = '#000'; x.fillRect(0, 0, 16, 16); },
  gym: (x, f, s) => { x.fillStyle = '#c8b090'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#a89070'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 0, 1, 16); x.fillStyle = '#e0c8a8'; x.fillRect(2, 2, 3, 2); },
  boulder: (x, f, s) => { DRAW.gym(x, f, s); x.fillStyle = '#404048'; x.beginPath(); x.ellipse(8, 9, 7, 6, 0, 0, 7); x.fill(); x.fillStyle = '#a89888'; x.beginPath(); x.ellipse(8, 8.5, 6, 5, 0, 0, 7); x.fill(); x.fillStyle = '#d0c0b0'; x.fillRect(5, 5, 4, 2); },
};
function treeTop(x, c1, c2, c3, o) {
  // Schatten am Boden, Stamm mit Licht-/Schattenkante
  x.fillStyle = 'rgba(0,40,0,.25)'; x.fillRect(3, 14, 10, 2);
  x.fillStyle = '#3a2414'; x.fillRect(5, 10, 6, 6);
  x.fillStyle = '#6a4428'; x.fillRect(6, 10, 4, 6); x.fillStyle = '#8a5a34'; x.fillRect(6, 10, 1, 6); x.fillStyle = '#4a2e1a'; x.fillRect(9, 10, 1, 6);
  // Krone: Kontur, Grundton, Schattenseite unten rechts, Lichtbüschel oben links
  x.fillStyle = o; x.beginPath(); x.arc(8, 6.5, 7.5, 0, 7); x.fill(); x.fillRect(1, 6, 14, 5);
  x.fillStyle = c1; x.beginPath(); x.arc(8, 6.5, 6.5, 0, 7); x.fill(); x.fillRect(2, 6, 12, 4);
  x.fillStyle = c2; x.beginPath(); x.arc(7, 5.5, 5, 0, 7); x.fill();
  x.fillStyle = c1; x.fillRect(4, 9, 3, 1); x.fillRect(9, 8, 4, 1);
  x.fillStyle = c3; x.fillRect(4, 3, 3, 1); x.fillRect(3, 4, 2, 2); x.fillRect(8, 2, 2, 1); x.fillRect(7, 6, 2, 1); x.fillRect(10, 4, 1, 1);
  x.fillStyle = o; x.fillRect(5, 10, 1, 1); x.fillRect(11, 9, 1, 1);
}
const BLADE = { green: ['#2e7a30', '#48a040', '#90d868'], ash: ['#4a4038', '#7a6a58', '#b8a488'], snow: ['#7a98b8', '#c8dcf0', '#ffffff'], dry: ['#8a6a30', '#b8944a', '#e8d08a'], mount: ['#3a5a30', '#6a8a48', '#a8c870'] };
export function tallBlades(x, f, oy, pal = 'green') {
  const o = f ? 1 : 0, [c1, c2, c3] = BLADE[pal];
  for (const [a, b] of [[1, 2], [6, 0], [11, 2], [3, 8], [9, 7], [13, 9], [0, 10], [7, 9]]) {
    x.fillStyle = c1; x.fillRect(a + o, b + 3 - oy, 1, 5); x.fillRect(a + 2, b + 2 - oy, 1, 6);
    x.fillStyle = c2; x.fillRect(a + 1, b - oy, 1, 7);
    x.fillStyle = c3; x.fillRect(a + 1 + o, b - oy, 1, 2);
  }
}

const tileCache = new Map();
export function tile(name, frame = 0, variant = 0) {
  const k = name + frame + ':' + variant;
  if (!tileCache.has(k)) { const [c, x] = cv(16, 16); (DRAW[name] || DRAW.void)(x, frame, variant); tileCache.set(k, c); }
  return tileCache.get(k);
}
// Hohes Gras: oberer Teil, der über die Füße der Figur gezeichnet wird
const tallTop = {};
export function tallOverlay(f, pal = 'green') {
  tallTop[pal] ||= [0, 1].map(fr => { const [c, x] = cv(16, 8); x.translate(0, -8); tallBlades(x, fr, 0, pal); return c; });
  return tallTop[pal][f];
}

// ---------------------------------------------------------------- Gebäude
const bCache = new Map();
export function building(b) {
  const k = JSON.stringify(b);
  if (bCache.has(k)) return bCache.get(k);
  const w = b.w * 16, h = b.h * 16, [c, x] = cv(w, h);
  const roofH = (b.h - 2) * 16 + 6, wallY = roofH - 2;
  const roof = b.roof || '#c84848', wall = b.wall || '#f0e8d8', ink = '#2e2636';
  // ---- Wand: Holzbretter mit Körnung, Eckpfosten, Steinsockel
  x.fillStyle = ink; x.fillRect(1, wallY, w - 2, h - wallY);
  for (let yy = wallY; yy < h - 1; yy++) for (let xx = 2; xx < w - 2; xx++) {
    const plank = (yy - wallY) % 4 === 3, n = hash(Math.floor(xx / 5), yy, 11) - 0.5;
    x.fillStyle = shade(wall, plank ? -0.1 : n * 0.06); x.fillRect(xx, yy, 1, 1);
  }
  x.fillStyle = shade(wall, -0.18); x.fillRect(2, wallY, 2, h - wallY - 1); x.fillRect(w - 4, wallY, 2, h - wallY - 1);
  x.fillStyle = shade(wall, 0.15); x.fillRect(2, wallY, 1, h - wallY - 1);
  // Steinsockel
  for (let xx = 2; xx < w - 2; xx++) for (let yy = h - 5; yy < h - 1; yy++) {
    const brick = ((xx + (yy % 2 ? 3 : 0)) % 6 === 0) || yy === h - 5;
    x.fillStyle = brick ? '#5a5866' : ['#8a8896', '#9694a2', '#a2a0ae'][Math.floor(hash(xx, yy, 5) * 3)]; x.fillRect(xx, yy, 1, 1);
  }
  // Dachüberstand wirft Schatten auf die Wand
  x.fillStyle = 'rgba(30,20,40,.35)'; x.fillRect(2, wallY, w - 4, 3);
  // ---- Fenster
  for (let i = 0; i < b.w; i++) {
    if (i === b.door) continue;
    const wx = i * 16 + 3, wy = wallY + 5;
    if (i === 0 || i === b.w - 1 || (b.w > 4 && i % 2 === 0)) {
      x.fillStyle = ink; x.fillRect(wx, wy, 10, 10);
      x.fillStyle = '#e8e0d0'; x.fillRect(wx + 1, wy + 1, 8, 8);
      for (let yy = 0; yy < 6; yy++) { x.fillStyle = b.night ? ['#fff0a8', '#ffe088', '#ffd070', '#f8c060', '#f0b050', '#e8a048'][yy] : ['#d8f0ff', '#b8e0fc', '#98d0f4', '#80c0ec', '#70b0e0', '#68a4d4'][yy]; x.fillRect(wx + 2, wy + 2 + yy, 6, 1); }
      x.fillStyle = b.night ? '#c87830' : '#5888b8'; x.fillRect(wx + 4, wy + 2, 1, 6); x.fillRect(wx + 2, wy + 5, 6, 1);
      if (!b.night) { x.fillStyle = '#ffffff'; x.fillRect(wx + 2, wy + 2, 2, 1); x.fillRect(wx + 2, wy + 3, 1, 1); }
      x.fillStyle = shade(wall, 0.25); x.fillRect(wx - 1, wy + 10, 12, 1); x.fillStyle = shade(wall, -0.3); x.fillRect(wx - 1, wy + 11, 12, 1);
    }
  }
  // ---- Tür mit Rahmen, Füllungen, Klinke und Stufe
  const dx = b.door * 16, dc = b.doorCol || '#8a5a30';
  x.fillStyle = ink; x.fillRect(dx + 2, h - 18, 12, 18);
  x.fillStyle = shade(dc, 0.15); x.fillRect(dx + 3, h - 17, 10, 1);
  x.fillStyle = dc; x.fillRect(dx + 3, h - 16, 10, 15);
  x.fillStyle = shade(dc, -0.25); x.fillRect(dx + 4, h - 14, 3, 5); x.fillRect(dx + 9, h - 14, 3, 5); x.fillRect(dx + 4, h - 7, 3, 4); x.fillRect(dx + 9, h - 7, 3, 4);
  x.fillStyle = shade(dc, 0.3); x.fillRect(dx + 4, h - 14, 3, 1); x.fillRect(dx + 9, h - 14, 3, 1);
  x.fillStyle = '#f8d870'; x.fillRect(dx + 10, h - 9, 2, 2); x.fillStyle = '#a07820'; x.fillRect(dx + 11, h - 8, 1, 1);
  x.fillStyle = '#b8b4c0'; x.fillRect(dx + 1, h - 1, 14, 1);
  // ---- Dach: Ziegelreihen, versetzt, Verlauf von hell (oben) nach dunkel
  x.fillStyle = ink; x.fillRect(0, 2, w, roofH);
  for (let yy = 3; yy < roofH + 1; yy++) {
    const row = Math.floor((yy - 3) / 4), inRow = (yy - 3) % 4, grad = 0.18 - (yy / roofH) * 0.36;
    for (let xx = 1; xx < w - 1; xx++) {
      const off = row % 2 ? 3 : 0, seam = (xx + off) % 6 === 0;
      let k2 = grad + (inRow === 0 ? 0.14 : inRow === 3 ? -0.2 : 0) + (seam ? -0.16 : 0) + (hash(Math.floor((xx + off) / 6), row, 21) - 0.5) * 0.1;
      x.fillStyle = shade(roof, k2); x.fillRect(xx, yy, 1, 1);
    }
  }
  x.fillStyle = shade(roof, 0.35); x.fillRect(1, 3, w - 2, 1);
  x.fillStyle = shade(roof, -0.45); x.fillRect(1, roofH, w - 2, 1);
  x.fillStyle = shade(roof, 0.12); x.fillRect(1, 3, 1, roofH - 2);
  // ---- Schild
  if (b.sign) {
    const sx = Math.round(w / 2 - 14), sy = Math.max(6, roofH - 18);
    x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(sx, sy + 1, 30, 12);
    x.fillStyle = ink; x.fillRect(sx - 1, sy - 1, 30, 12); x.fillStyle = b.signCol || '#f8f8f8'; x.fillRect(sx, sy, 28, 10);
    x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(sx, sy, 28, 1);
    x.fillStyle = b.signInk || '#3a3040'; x.font = 'bold 8px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(b.sign, sx + 14, sy + 5.5);
  }
  if (b.chimney) { x.fillStyle = ink; x.fillRect(w - 14, 0, 8, 10); for (let yy = 1; yy < 9; yy++) for (let xx = w - 13; xx < w - 7; xx++) { x.fillStyle = ((xx + (yy % 2) * 2) % 4 === 0 || yy % 3 === 0) ? '#6a3828' : '#a86048'; x.fillRect(xx, yy, 1, 1); } }
  bCache.set(k, c);
  return c;
}

// ---------------------------------------------------------------- Atmosphäre: Kanten, Schatten, Wolken, Licht
const fxCache = new Map();
const memo = (k, fn) => { if (!fxCache.has(k)) fxCache.set(k, fn()); return fxCache.get(k); };
// Gras wächst über den Rand eines Weges/Sandes (side: n, s, w, e)
export function grassFringe(side, pal = 'green', v = 0) {
  return memo('fr' + side + pal + v, () => {
    const [c, x] = cv(16, 16), tones = pal === 'dark' ? GRASS_D : GRASS;
    for (let i = 0; i < 16; i++) {
      const depth = 1 + Math.floor(hash(i, v, side.charCodeAt(0)) * 3) + (hash(Math.floor(i / 3), v, 9) > 0.6 ? 1 : 0);
      for (let d = 0; d < depth; d++) {
        const [px, py] = side === 'n' ? [i, d] : side === 's' ? [i, 15 - d] : side === 'w' ? [d, i] : [15 - d, i];
        x.fillStyle = d === depth - 1 ? (pal === 'dark' ? '#2e6e34' : '#3f8e3a') : tones[1 + Math.floor(hash(px, py, 3) * 3)]; x.fillRect(px, py, 1, 1);
      }
      // dunkler Saum auf dem Weg = Schatten der Grasnarbe
      const [sx, sy] = side === 'n' ? [i, depth] : side === 's' ? [i, 15 - depth] : side === 'w' ? [depth, i] : [15 - depth, i];
      x.fillStyle = 'rgba(90,70,30,.25)'; x.fillRect(sx, sy, 1, 1);
    }
    return c;
  });
}
// Ufer: Schaum und flacheres Wasser am Rand
export function shore(side, f = 0) {
  return memo('sh' + side + f, () => {
    const [c, x] = cv(16, 16);
    for (let i = 0; i < 16; i++) {
      const foam = 1 + ((i + f * 3) % 7 < 3 ? 1 : 0);
      for (let d = 0; d < 4; d++) {
        const [px, py] = side === 'n' ? [i, d] : side === 's' ? [i, 15 - d] : side === 'w' ? [d, i] : [15 - d, i];
        x.fillStyle = d < foam ? (d === 0 ? '#e8f6ff' : '#b8e0fa') : d < foam + 1 ? 'rgba(120,200,240,.6)' : 'rgba(110,190,235,.3)'; x.fillRect(px, py, 1, 1);
      }
    }
    return c;
  });
}
// weicher Schattenfleck (für Bäume, Steine)
export function softShadow(w, h, a = 0.24) {
  return memo('ss' + w + h + a, () => {
    const [c, x] = cv(w, h), g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, `rgba(10,20,30,${a})`); g.addColorStop(0.7, `rgba(10,20,30,${a * 0.6})`); g.addColorStop(1, 'rgba(10,20,30,0)');
    x.setTransform(1, 0, 0, h / w, 0, 0); x.fillStyle = g; x.fillRect(0, 0, w, w); return c;
  });
}
// große, weiche Wolke für ziehende Wolkenschatten
export function cloudShadow() {
  return memo('cloud', () => {
    const [c, x] = cv(160, 80);
    for (const [cx, cy, r] of [[50, 42, 34], [86, 34, 40], [118, 46, 30], [76, 52, 30]]) {
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(20,40,70,.14)'); g.addColorStop(1, 'rgba(20,40,70,0)');
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
    }
    return c;
  });
}
// warmes Lichtfeld (Fenster bei Nacht, Laternen)
export function glow(r = 18, col = '255,200,110') {
  return memo('gl' + r + col, () => {
    const [c, x] = cv(r * 2, r * 2), g = x.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, `rgba(${col},.55)`); g.addColorStop(0.5, `rgba(${col},.2)`); g.addColorStop(1, `rgba(${col},0)`);
    x.fillStyle = g; x.fillRect(0, 0, r * 2, r * 2); return c;
  });
}

// ---------------------------------------------------------------- Figuren
const C = s => { const p = Math.floor((16 - s.length) / 2); return '.'.repeat(p) + s + '.'.repeat(16 - s.length - p); };
const HEAD_DOWN = ['oooooooo', 'occcccccco', 'occccccccco', 'oCCCCCCCCCCo', 'ohssssssssho', 'ohsessssesho', 'ohsessssesho', 'osssssssso', 'oossssoo'].map(C);
const HEAD_UP = ['oooooooo', 'occcccccco', 'occccccccco', 'occccccccco', 'ohhhhhhhhhho', 'ohhhhhhhhhho', 'ohhhhhhhhhho', 'ohhhhhhhho', 'oossssoo'].map(C);
const BODY_DOWN = ['obbbbbbbbo', 'obbbbbbbbbbo', 'obBbbbbbbBbo', 'osbbbbbbbbso', 'opppppppppo'.slice(0, 10), 'oppppppppo'].map(C);
const BODY_UP = ['obaaaaaabo', 'obaaaaaaaabo', 'obaaaaaaaabo', 'osbaaaaaabso', 'oppppppppo', 'oppppppppo'].map(C);
const LEGS = { stand: ['opppoopppo', 'okko..okko', 'oooo..oooo'].map(C), w1: ['opppoopppo', 'okko..oppo', 'oooo..okko'].map(C), w2: ['opppoopppo', 'oppo..okko', 'okko..oooo'].map(C) };
const SIDE = {
  stand: ['......oooooo....', '.....occcccco...', '....occcccccco..', '..oCCCCcccccco..', '...ohsshhhhhho..', '...osessshhhho..', '...ossssshhhho..', '....ossssssho...', '.....oossoo.....',
    '.....obbbbo.....', '....obbbbbbo....', '....obbsbbbo....', '....obbsbbao....', '.....opppo......', '.....opppo......', '.....opppo......', '.....okkko......', '.....ooooo......'],
};
SIDE.w1 = [...SIDE.stand.slice(0, 13), '.....opppo......', '....oppopo......', '...oppo.opo.....', '...okko.okko....', '...oooo.oooo....'];
SIDE.w2 = [...SIDE.stand.slice(0, 11), '....obsbbbo.....', '....obsbbao.....', '.....opppo......', '.....oppo.......', '....oppoppo.....', '....okko.oko....', '....oooo.ooo....'];

function frameRows(dir, step) {
  const legs = LEGS[step];
  const pants = [C('oppppppppo'), C('oppppppppo')];
  if (dir === 'down') return [...HEAD_DOWN, ...BODY_DOWN.slice(0, 4), ...pants, ...legs];
  if (dir === 'up') return [...HEAD_UP, ...BODY_UP.slice(0, 4), ...pants, ...legs];
  return SIDE[step];
}
// Figuren im Format der GBA-Ära: 16×24, großer Kopf, dunkler Umriss, 3 Laufphasen je Richtung
function figure(look, dir, step) {
  const [c, x] = cv(16, 24);
  const P = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  const hair = look.hair, skin = look.skin, out = look.outfit, pants = look.pants || '#384868', cap = look.cap, acc = look.accent || '#f2d16b';
  const hairD = shade(hair, -0.3), skinD = shade(skin, -0.18), outD = shade(out, -0.28), pantsD = shade(pants, -0.25), shoe = '#3a2a24';
  const bob = step ? 1 : 0, side = dir === 'left' || dir === 'right';
  const head = (rows) => rows.forEach(([y, a, b]) => P(a, y + bob, b - a + 1, 1, skin));
  if (!side) {
    // Beine
    const ly = 18 + bob, lL = step === 1 ? 3 : 4, lR = step === 2 ? 3 : 4;
    P(5, ly, 2, lL, pants); P(9, ly, 2, lR, pants); P(6, ly, 1, lL, pantsD); P(10, ly, 1, lR, pantsD);
    P(4, ly + lL, 3, 1, shoe); P(9, ly + lR, 3, 1, shoe);
    // Körper
    P(4, 12 + bob, 8, 6, out); P(10, 12 + bob, 2, 6, outD); P(4, 17 + bob, 8, 1, outD);
    if (dir === 'down') { P(6, 12 + bob, 4, 1, acc); P(7, 13 + bob, 2, 3, acc); }
    else { P(5, 13 + bob, 6, 4, shade(acc, -0.1)); P(5, 13 + bob, 6, 1, shade(acc, -0.35)); }
    // Arme (schwingen beim Gehen)
    const aL = step === 1 ? 1 : step === 2 ? -1 : 0;
    P(3, 12 + bob, 1, 4 + aL, out); P(12, 12 + bob, 1, 4 - aL, outD);
    P(3, 16 + bob + aL, 1, 1, skin); P(12, 16 + bob - aL, 1, 1, skinD);
    // Kopf
    head([[1, 4, 11], [2, 3, 12], [3, 2, 13], [4, 2, 13], [5, 2, 13], [6, 2, 13], [7, 2, 13], [8, 2, 13], [9, 2, 13], [10, 3, 12], [11, 4, 11]]);
    P(12, 4 + bob, 2, 6, skinD);
    if (dir === 'down') {
      P(3, 1 + bob, 10, 4, hair); P(2, 3 + bob, 1, 6, hair); P(13, 3 + bob, 1, 6, hairD); P(4, 1 + bob, 8, 1, shade(hair, 0.2));
      P(4, 5 + bob, 1, 1, hair); P(7, 5 + bob, 2, 1, hair); P(11, 5 + bob, 1, 1, hair); P(12, 4 + bob, 1, 3, hairD);
      P(5, 7 + bob, 1, 2, '#202030'); P(10, 7 + bob, 1, 2, '#202030'); P(5, 7 + bob, 1, 1, '#4a4a68'); P(10, 7 + bob, 1, 1, '#4a4a68');
      P(7, 10 + bob, 2, 1, skinD); P(4, 9 + bob, 1, 1, shade(skin, 0.1)); 
    } else {
      P(2, 1 + bob, 12, 10, hair); P(4, 1 + bob, 8, 1, shade(hair, 0.2)); P(11, 2 + bob, 2, 8, hairD); P(5, 11 + bob, 6, 1, skinD);
    }
    if (cap) { P(3, 0 + bob, 10, 4, cap); P(4, 0 + bob, 8, 1, shade(cap, 0.25)); P(11, 1 + bob, 2, 3, shade(cap, -0.3)); if (dir === 'down') { P(2, 4 + bob, 12, 1, shade(cap, -0.35)); P(7, 1 + bob, 2, 2, acc); } else P(5, 4 + bob, 6, 1, shade(cap, -0.35)); }
  } else {
    // Seitenansicht nach links (rechts wird gespiegelt)
    const ly = 18 + bob;
    if (step === 0) { P(6, ly, 3, 4, pants); P(8, ly, 1, 4, pantsD); P(5, ly + 4, 4, 1, shoe); }
    else { const f = step === 1; P(4, ly, 2, 3, pants); P(9, ly, 2, 3, pantsD); P(3, ly + 3, 3, 1, shoe); P(9, ly + 3, 3, 1, shoe); P(6, ly, 3, 2, pants); if (!f) { P(4, ly, 2, 3, pantsD); P(9, ly, 2, 3, pants); } }
    P(5, 12 + bob, 6, 6, out); P(9, 12 + bob, 2, 6, outD); P(5, 17 + bob, 6, 1, outD); P(10, 13 + bob, 2, 4, shade(acc, -0.1));
    const sw = step === 1 ? -2 : step === 2 ? 2 : 0;
    P(7 + sw / 2, 12 + bob, 2, 4, outD); P(7 + sw, 16 + bob, 2, 1, skin);
    head([[1, 4, 11], [2, 3, 12], [3, 2, 12], [4, 2, 12], [5, 2, 12], [6, 2, 12], [7, 2, 12], [8, 2, 12], [9, 3, 12], [10, 3, 11], [11, 5, 10]]);
    P(1, 7 + bob, 1, 2, skin);
    P(3, 1 + bob, 10, 4, hair); P(7, 4 + bob, 6, 6, hair); P(10, 3 + bob, 3, 7, hairD); P(4, 1 + bob, 7, 1, shade(hair, 0.2)); P(3, 5 + bob, 1, 1, hair);
    P(4, 7 + bob, 1, 2, '#202030'); P(4, 7 + bob, 1, 1, '#4a4a68'); P(3, 10 + bob, 2, 1, skinD); P(7, 7 + bob, 1, 2, skinD);
    if (cap) { P(3, 0 + bob, 10, 4, cap); P(4, 0 + bob, 7, 1, shade(cap, 0.25)); P(10, 1 + bob, 2, 3, shade(cap, -0.3)); P(0, 4 + bob, 7, 1, shade(cap, -0.35)); }
  }
  // dunkler Umriss um alles Gemalte
  const id = x.getImageData(0, 0, 16, 24), d = id.data, o = new Uint8ClampedArray(d);
  const at = (i, j) => i >= 0 && j >= 0 && i < 16 && j < 24 && d[(j * 16 + i) * 4 + 3] > 0;
  for (let j = 0; j < 24; j++) for (let i = 0; i < 16; i++) if (!at(i, j) && (at(i - 1, j) || at(i + 1, j) || at(i, j - 1) || at(i, j + 1))) { const k = (j * 16 + i) * 4; o[k] = 0x28; o[k + 1] = 0x20; o[k + 2] = 0x2c; o[k + 3] = 255; }
  x.putImageData(new ImageData(o, 16, 24), 0, 0);
  if (dir === 'right') { const [m, mx] = cv(16, 24); mx.translate(16, 0); mx.scale(-1, 1); mx.drawImage(c, 0, 0); return m; }
  return c;
}
const sprCache = new Map();
export function charSheet(look) {
  const k = JSON.stringify(look);
  if (sprCache.has(k)) return sprCache.get(k);
  // Blatt: 3 Frames × 4 Richtungen (down, up, left, right), je 16×24
  const [c, x] = cv(48, 96);
  ['down', 'up', 'left', 'right'].forEach((d, di) => [0, 1, 2].forEach(si => x.drawImage(figure(look, d, si), si * 16, di * 24)));
  sprCache.set(k, c);
  return c;
}
export const DIRS = ['down', 'up', 'left', 'right'];
export function drawChar(ctx, look, dir, frame, x, y, hop = 0) {
  const sh = charSheet(look), k = 1 - Math.min(0.4, hop / 25);
  ctx.fillStyle = `rgba(0,0,0,${0.22 * k})`; ctx.beginPath(); ctx.ellipse(x + 8, y + 15 + hop, 5.5 * k, 2 * k, 0, 0, 7); ctx.fill();
  ctx.drawImage(sh, frame * 16, DIRS.indexOf(dir) * 24, 16, 24, snap(x), snap(y - 9), 16, 24);
}

// ---------------------------------------------------------------- Objekte
export function crystalIcon(color = '#7fe3ff') {
  const [c, x] = cv(16, 16);
  x.fillStyle = '#203040'; x.beginPath(); x.moveTo(8, 1); x.lineTo(14, 8); x.lineTo(8, 15); x.lineTo(2, 8); x.fill();
  x.fillStyle = color; x.beginPath(); x.moveTo(8, 2.5); x.lineTo(12.5, 8); x.lineTo(8, 13.5); x.lineTo(3.5, 8); x.fill();
  x.fillStyle = '#ffffff'; x.fillRect(6, 5, 2, 3); x.fillStyle = shade(color, -0.3); x.fillRect(8, 8, 3, 4);
  return c;
}
export function eggSprite(size, c1 = '#f8f0d8', c2 = '#7fd0ff', crack = 0) {
  const [c, x] = cv(size, size), s = size / 32;
  x.scale(s, s);
  x.fillStyle = '#383040'; x.beginPath(); x.ellipse(16, 18, 11, 13.5, 0, 0, 7); x.fill();
  x.fillStyle = c1; x.beginPath(); x.ellipse(16, 18, 10, 12.5, 0, 0, 7); x.fill();
  x.fillStyle = c2; for (const [a, b, r] of [[11, 13, 2.5], [20, 10, 2], [19, 22, 3], [12, 24, 1.8]]) { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); }
  x.fillStyle = '#ffffff'; x.fillRect(10, 9, 3, 4);
  if (crack) { x.strokeStyle = '#383040'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(7, 16); for (let i = 0; i < 5 + crack * 2; i++) x.lineTo(9 + i * 2.5, 14 + (i % 2 ? 3 : -2)); x.stroke(); }
  return c;
}
export function itemBall() {
  // Fundstück: kleiner leuchtender Kristall auf einem Sockel (eigenes Design)
  const [c, x] = cv(16, 16);
  x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(8, 14, 5, 1.6, 0, 0, 7); x.fill();
  x.fillStyle = '#28202c'; x.beginPath(); x.moveTo(8, 1); x.lineTo(13, 7); x.lineTo(8, 14); x.lineTo(3, 7); x.fill();
  x.fillStyle = '#ffd36b'; x.beginPath(); x.moveTo(8, 2.5); x.lineTo(11.6, 7); x.lineTo(8, 12.5); x.lineTo(4.4, 7); x.fill();
  x.fillStyle = '#fff6c8'; x.fillRect(6, 5, 2, 3); x.fillStyle = '#c8901a'; x.fillRect(8, 8, 2, 3);
  return c;
}
