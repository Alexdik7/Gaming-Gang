// MapManager: macht aus Map-Daten Geometrie (Wege, bebaubare Felder, Boni).
import { GRID } from '../config.js';
import { THEMES } from '../data/maps.js';

export function rng(seed) { // mulberry32 – kleiner, fester Zufallsgenerator
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

export const T_FREE = 0, T_PATH = 1, T_WATER = 2, T_DECO = 3;
const idx = (x, y) => y * GRID.cols + x;
const inGrid = (x, y) => x >= 0 && y >= 0 && x < GRID.cols && y < GRID.rows;

export function buildMap(def) {
  const tiles = new Uint8Array(GRID.cols * GRID.rows), bonus = new Uint8Array(GRID.cols * GRID.rows);
  const paths = [], portals = [], samples = [];
  def.paths.forEach((pts, pi) => {
    const segs = []; let len = 0;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1, tp] = pts[i];
      if (tp === 'tp') { portals.push({ from: { x: x0 + .5, y: y0 + .5 }, to: { x: x1 + .5, y: y1 + .5 } }); continue; }
      const l = Math.hypot(x1 - x0, y1 - y0);
      const fast = (def.fast || []).find(f => f[0] === pi && f[1] === i - 1);
      segs.push({ x0: x0 + .5, y0: y0 + .5, dx: (x1 - x0) / l, dy: (y1 - y0) / l, len: l, start: len, mul: fast ? fast[2] : 1 });
      for (let d = 0; d <= l; d += 0.25) {
        const tx = Math.floor(x0 + .5 + (x1 - x0) / l * d), ty = Math.floor(y0 + .5 + (y1 - y0) / l * d);
        if (inGrid(tx, ty)) tiles[idx(tx, ty)] = T_PATH;
      }
      len += l;
    }
    const path = { segs, len, i: pi };
    paths.push(path);
    const o = {};
    for (let d = 0; d < len; d += 0.5) { posAt(path, d, o); if (inGrid(Math.floor(o.x), Math.floor(o.y))) samples.push({ x: o.x, y: o.y, pi }); }
  });
  for (const [x, y, w, h] of def.water || []) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (inGrid(i, j) && !tiles[idx(i, j)]) tiles[idx(i, j)] = T_WATER;
  for (const [x, y] of def.high || []) bonus[idx(x, y)] = 1;
  for (const [x, y] of def.power || []) bonus[idx(x, y)] = 2;
  // Deko: feste Zufallsfolge je Map, nie auf Weg/Wasser/Bonus
  const r = rng(hash(def.id)), deco = [], kinds = THEMES[def.theme].deco;
  for (let n = 0, guard = 0; n < (def.deco || 0) && guard < 500; guard++) {
    const x = Math.floor(r() * GRID.cols), y = Math.floor(r() * GRID.rows), i = idx(x, y);
    if (tiles[i] || bonus[i]) continue;
    tiles[i] = T_DECO; deco.push({ x, y, kind: kinds[Math.floor(r() * kinds.length)], s: r() }); n++;
  }
  const last = p => { const o = {}; posAt(p, p.len, o); return { x: o.x, y: o.y }; };
  const first = p => { const o = {}; posAt(p, 0, o); return { x: o.x, y: o.y, dx: o.dx, dy: o.dy }; };
  return { def, theme: THEMES[def.theme], tiles, bonus, paths, portals, samples, deco, bases: paths.map(last), entries: paths.map(first), mods: def.mods || {} };
}

// Position auf einem Weg nach zurückgelegter Strecke
export function posAt(path, dist, out) {
  const segs = path.segs; let s = segs[segs.length - 1];
  for (let i = 0; i < segs.length; i++) if (dist < segs[i].start + segs[i].len) { s = segs[i]; break; }
  const d = Math.min(Math.max(dist - s.start, 0), s.len);
  out.x = s.x0 + s.dx * d; out.y = s.y0 + s.dy * d; out.dx = s.dx; out.dy = s.dy; out.mul = s.mul;
  return out;
}

export const tileAt = (map, x, y) => inGrid(x, y) ? map.tiles[idx(x, y)] : T_WATER;
export const bonusAt = (map, x, y) => inGrid(x, y) ? map.bonus[idx(x, y)] : 0;
export const canBuild = (map, x, y) => inGrid(x, y) && map.tiles[idx(x, y)] === T_FREE;
