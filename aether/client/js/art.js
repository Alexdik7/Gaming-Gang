// Prozedurale Pixel-Art (keine Asset-Dateien). Kacheln 16×16, Figuren 16×20. Licht von oben links.
// Palette und Regeln: docs/ASSET_GUIDE.md
export const T = 16;

const cache = new Map();
function sprite(key, w, h, draw) {
  let c = cache.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g); cache.set(key, c); }
  return c;
}
function hash(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
const px = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

const P = {
  grass: ['#5fae4e', '#6cbd58', '#529a44', '#7bcb63'], path: ['#d8bf8a', '#cdb07a', '#e4cd9a', '#bfa16c'],
  tall: ['#3f8c3c', '#2f7430', '#58a64a'], water: ['#3a7fd0', '#4c93e0', '#7ab8f0', '#2c66b0'],
  tree: ['#1f5a32', '#2d7a40', '#3f9450', '#5fb060', '#5a3a24'], roof: ['#b0483c', '#cc5a48', '#8a3430'],
  wall: ['#efe2c8', '#d8c8a8', '#b8a684'], wood: ['#8a5a34', '#6a4224', '#a87444'],
};

function grass(g, x, y) {
  px(g, P.grass[0], 0, 0, T, T);
  for (let i = 0; i < 14; i++) { const a = hash(x, y, i), b = hash(y, x, i + 9); px(g, P.grass[1 + (i % 3)], (a * 16) | 0, (b * 16) | 0); }
}
const DRAW = {
  '.': (g, x, y) => grass(g, x, y),
  'f': (g, x, y) => { grass(g, x, y); const c = ['#f06878', '#f8d848', '#ffffff', '#b070e0'][(hash(x, y, 3) * 4) | 0]; for (const [a, b] of [[3, 4], [10, 9], [5, 12]]) { px(g, c, a, b, 2, 2); px(g, '#fff8c0', a, b); } },
  ':': (g, x, y) => { px(g, P.path[0], 0, 0, T, T); for (let i = 0; i < 10; i++) px(g, P.path[1 + (i % 3)], (hash(x, y, i) * 15) | 0, (hash(y, x, i) * 15) | 0, 2, 1); },
  ',': (g, x, y) => { px(g, P.tall[0], 0, 0, T, T); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const ox = c * 4 + (r & 1) * 2 - 1, oy = r * 4 + 1; px(g, P.tall[1], ox, oy + 2, 4, 2); px(g, P.tall[2], ox + 1, oy, 1, 3); px(g, P.tall[2], ox + 3, oy + 1, 1, 2); px(g, '#78c060', ox + 1, oy); } },
  '~': (g, x, y, f) => { px(g, P.water[0], 0, 0, T, T); for (let i = 0; i < 4; i++) { const yy = (i * 4 + f) % 16; px(g, P.water[1], ((hash(x, i) * 8) | 0) + ((f + i) % 4), yy, 6, 1); } px(g, P.water[2], ((x * 5 + f) % 12), (y * 3 + f * 2) % 16, 2, 1); },
  '#': (g, x, y) => { grass(g, x, y); px(g, 'rgba(0,0,0,.25)', 2, 12, 13, 4); px(g, P.tree[4], 7, 10, 3, 5); px(g, P.tree[0], 1, 1, 14, 11); px(g, P.tree[1], 2, 1, 12, 9); px(g, P.tree[2], 3, 2, 8, 6); px(g, P.tree[3], 4, 3, 3, 2); px(g, P.tree[0], 0, 4, 1, 6); px(g, P.tree[0], 15, 4, 1, 6); },
  'R': (g) => { px(g, P.roof[2], 0, 0, T, T); for (let r = 0; r < 16; r += 4) { px(g, P.roof[0], 0, r, T, 3); px(g, P.roof[1], 0, r, T, 1); } },
  'H': (g, x) => { px(g, P.wall[0], 0, 0, T, T); px(g, P.wall[1], 0, 13, T, 3); if (x % 2) { px(g, '#5a7ab0', 4, 4, 8, 6); px(g, '#a8d0f8', 5, 5, 3, 2); px(g, P.wood[1], 3, 10, 10, 1); } },
  'D': (g) => { px(g, P.wall[0], 0, 0, T, T); px(g, P.wood[1], 3, 2, 10, 14); px(g, P.wood[0], 4, 3, 8, 13); px(g, '#f8d848', 10, 9, 1, 2); },
  'F': (g, x, y) => { grass(g, x, y); px(g, P.wood[1], 0, 6, T, 2); px(g, P.wood[1], 0, 11, T, 2); for (const c of [2, 13]) { px(g, P.wood[0], c, 3, 2, 11); px(g, P.wood[2], c, 3, 1, 1); } },
  'S': (g, x, y) => { grass(g, x, y); px(g, P.wood[1], 7, 9, 2, 6); px(g, P.wood[1], 2, 2, 12, 8); px(g, P.wood[2], 3, 3, 10, 6); px(g, P.wood[1], 4, 5, 8, 1); },
};

export function tile(ch, x, y, frame = 0) {
  const animated = ch === '~';
  const key = animated ? `~${x % 4},${y % 4},${frame}` : `${ch}${(x * 7 + y * 13) % 8}`;
  return sprite(key, T, T, (g) => (DRAW[ch] || DRAW['.'])(g, animated ? x : (x * 7 + y * 13) % 8, animated ? y : 0, frame));
}

// --- Figuren ---------------------------------------------------------------------------------------
export const SKIN = ['#f4d0b0', '#e0b090', '#b07a54', '#7a4e34'];
export const HAIR = ['#3a2a20', '#e8c060', '#c04a30', '#2a2a3a', '#f0f0f0'];
export const SHIRT = ['#d84848', '#3c7ad8', '#48a848', '#e8b030', '#9850c8', '#e870a8', '#40b0b0', '#505868'];

export function figure(look, dir, frame) {
  return sprite(`p${look.body}${look.hair}${look.color}${dir}${frame}`, 16, 20, (g) => {
    const skin = SKIN[look.body], hair = HAIR[look.hair], shirt = SHIRT[look.color], dark = 'rgba(0,0,0,.28)';
    const step = frame === 1 ? 1 : frame === 3 ? -1 : 0;
    px(g, 'rgba(0,0,0,.25)', 3, 18, 10, 2);
    // Beine
    px(g, '#2c3048', 5, 14 - (step > 0 ? 1 : 0), 2, 4 + (step > 0 ? 1 : 0)); px(g, '#2c3048', 9, 14 - (step < 0 ? 1 : 0), 2, 4 + (step < 0 ? 1 : 0));
    px(g, '#1a1a24', 5, 17, 2, 1); px(g, '#1a1a24', 9, 17, 2, 1);
    // Körper
    px(g, shirt, 4, 9, 8, 6); px(g, dark, 4, 13, 8, 2); px(g, 'rgba(255,255,255,.25)', 5, 9, 3, 1);
    // Arme
    const arm = dir === 'l' || dir === 'r' ? 0 : step;
    px(g, shirt, 3, 9 + arm, 1, 4); px(g, shirt, 12, 9 - arm, 1, 4); px(g, skin, 3, 13 + arm, 1, 1); px(g, skin, 12, 13 - arm, 1, 1);
    // Kopf
    px(g, skin, 4, 2, 8, 7); px(g, hair, 3, 1, 10, 3);
    if (dir === 'u') px(g, hair, 3, 1, 10, 7);
    else if (dir === 'l') { px(g, hair, 7, 1, 6, 6); px(g, '#1a1a24', 5, 5, 1, 2); }
    else if (dir === 'r') { px(g, hair, 3, 1, 6, 6); px(g, '#1a1a24', 10, 5, 1, 2); }
    else { px(g, hair, 3, 3, 1, 3); px(g, hair, 12, 3, 1, 3); px(g, '#1a1a24', 6, 5, 1, 2); px(g, '#1a1a24', 9, 5, 1, 2); px(g, '#d08070', 7, 7, 2, 1); }
    // Umriss (sel-out)
    const d = g.getImageData(0, 0, 16, 20), o = g.createImageData(16, 20);
    for (let y = 0; y < 20; y++) for (let x = 0; x < 16; x++) {
      const i = (y * 16 + x) * 4;
      if (d.data[i + 3] > 200) continue;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const xx = x + a, yy = y + b; return xx >= 0 && yy >= 0 && xx < 16 && yy < 18 && d.data[(yy * 16 + xx) * 4 + 3] > 200; });
      if (n) { o.data[i] = 24; o.data[i + 1] = 20; o.data[i + 2] = 32; o.data[i + 3] = 255; }
    }
    const tmp = document.createElement('canvas'); tmp.width = 16; tmp.height = 20; tmp.getContext('2d').putImageData(o, 0, 0);
    g.globalCompositeOperation = 'destination-over'; g.drawImage(tmp, 0, 0);
  });
}
