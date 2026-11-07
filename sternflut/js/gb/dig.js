// Ausgrabungen: Grabstellen in Höhlen (täglich neu), Grab-Minispiel, Fossilien → Ur-Kreaturen bei Dr. Fossa
import { G, W, H, COL, push, pop, input, text, box, inRect, wait } from './engine.js';
import { MAPS, LOOK, ITEMS, SOLID } from './maps.js';
import { say, ask, choose } from './gbui.js';
import { sfx, cry } from '../core/audio.js';
import { SPECIES } from '../data/creatures.js';
import { createMon } from '../data/mon.js';
import { itemIcon } from './pixel.js';
import '../data/fossil.js';

Object.assign(ITEMS, {
  grabset: { name: 'Grabset', desc: 'Hacke und Hammer von Dr. Fossa. An glitzernden Felsen in Höhlen A drücken. Jede Grabstelle füllt sich täglich neu.', key: true },
  muschelfossil: { name: 'Muschelfossil', desc: 'Eine versteinerte Spiralmuschel. Dr. Fossa in Dünenhain kann daraus Leben erwecken.', fossil: 'ammolit' },
  krallenfossil: { name: 'Krallenfossil', desc: 'Eine riesige versteinerte Kralle. Dr. Fossa in Dünenhain kann daraus Leben erwecken.', fossil: 'krallix' },
  fluegelfossil: { name: 'Flügelfossil', desc: 'Ein Flügel aus Stein, dünn wie Papier. Dr. Fossa in Dünenhain kann daraus Leben erwecken.', fossil: 'schwingstein' },
  urbernstein: { name: 'Urbernstein', desc: 'Goldener Bernstein mit einem Insekt darin. Dr. Fossa zahlt 2000 ◈.', worth: 2000 },
  sternquarz: { name: 'Sternquarz', desc: 'Ein Kristall, in dem Funken tanzen. Dr. Fossa zahlt 1200 ◈.', worth: 1200 },
  goldmuschel: { name: 'Goldmuschel', desc: 'Eine Muschel aus purem Gold. Dr. Fossa zahlt 800 ◈.', worth: 800 },
  meteorit: { name: 'Meteorit', desc: 'Ein Stück aus dem All, noch leicht warm. Dr. Fossa zahlt 3000 ◈.', worth: 3000 },
});
const FOSSILS = ['muschelfossil', 'krallenfossil', 'fluegelfossil'];
const SHAPE = { muschelfossil: [3, 3], krallenfossil: [3, 2], fluegelfossil: [3, 3], urbernstein: [2, 2], sternquarz: [2, 2], goldmuschel: [2, 2], meteorit: [2, 2], sonderbonbon: [1, 1], toptrank: [1, 1], heilbeere: [1, 1], sternkristall: [1, 1] };
const LOOT = {
  1: [['muschelfossil', 3], ['krallenfossil', 3], ['fluegelfossil', 3], ['urbernstein', 2], ['sternquarz', 3], ['goldmuschel', 4], ['sonderbonbon', 1], ['heilbeere', 4], ['sternkristall', 3]],
  2: [['muschelfossil', 3], ['krallenfossil', 3], ['fluegelfossil', 3], ['urbernstein', 3], ['sternquarz', 4], ['goldmuschel', 3], ['sonderbonbon', 2], ['toptrank', 3]],
  3: [['muschelfossil', 2], ['krallenfossil', 2], ['fluegelfossil', 2], ['meteorit', 4], ['sternquarz', 4], ['urbernstein', 2], ['sonderbonbon', 3], ['toptrank', 3]],
};
const today = () => Math.floor(Date.now() / 864e5);

// ---------------------------------------------------------------- Grabstellen automatisch platzieren
// nur auf Feldern, deren Besetzung die Karte nicht zerschneidet (Erreichbarkeit bleibt gleich)
function freeTiles(M) {
  const taken = new Set([...(M.npcs || []).map(n => n.x + ',' + n.y), ...(M.warps || []).flatMap(w => [w.x + ',' + w.y, w.x + ',' + (w.y - 1), w.x + ',' + (w.y + 1)]), ...Object.keys(M.signs || {}), ...Object.keys(M.runes || {}), ...(M.props || []).map(p => p.x + ',' + p.y)]);
  const inB = (x, y) => (M.buildings || []).some(b => x >= b.x - 1 && x <= b.x + b.w && y >= b.y - 1 && y <= b.y + b.h);
  const ok = (x, y) => { const c = M.rows[y]?.[x]; return c !== undefined && !SOLID.has(c) && c !== '~' && !taken.has(x + ',' + y) && !inB(x, y); };
  return { ok, taken };
}
function reach(M, block) {
  const walk = (x, y) => { const c = M.rows[y]?.[x]; return c !== undefined && !SOLID.has(c) && c !== '~' && !block.has(x + ',' + y); };
  let start = null; const wp = (M.warps || [])[0];
  if (wp) for (const [dx, dy] of [[0, 0], [0, -1], [0, 1], [1, 0], [-1, 0]]) if (!start && walk(wp.x + dx, wp.y + dy)) start = [wp.x + dx, wp.y + dy];
  for (let y = 0; y < M.rows.length && !start; y++) for (let x = 0; x < M.rows[0].length; x++) if (walk(x, y)) { start = [x, y]; break; }
  const seen = new Set(), q = [start];
  while (q.length) { const [x, y] = q.pop(), k = x + ',' + y; if (seen.has(k) || !walk(x, y)) continue; seen.add(k); q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
  return seen.size;
}
export function placeSpot(M, x0, y0) {
  const { ok } = freeTiles(M), block = new Set(), base = reach(M, block), w = M.rows[0].length, h = M.rows.length, cand = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (ok(x, y)) {
    const walls = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => SOLID.has(M.rows[y + dy][x + dx])).length;
    if (walls >= 1) cand.push([Math.abs(x - x0) + Math.abs(y - y0) - walls * 0.5, x, y]);
  }
  cand.sort((a, b) => a[0] - b[0]);
  for (const [, x, y] of cand) { block.add(x + ',' + y); if (reach(M, block) === base - 1) return { x, y }; block.delete(x + ',' + y); }
  return null;
}
const SPOTS = [['sandgrotte', 2, 10], ['sandgrotte', 14, 5], ['glutkrater', 2, 2], ['glutkrater', 20, 16], ['erzmine', 2, 2], ['erzmine', 18, 14], ['kristallwald', 2, 2], ['kristallwald', 20, 14]];
const ROCK = { skin: '#000', hair: '#000', outfit: '#000', pants: '#000' };
function setupSpots() {
SPOTS.forEach(([m, x, y], i) => { const M = MAPS[m]; if (!M) return; const p = placeSpot(M, x, y); if (p) M.npcs.push({ id: 'grab_' + i, x: p.x, y: p.y, dir: 'down', look: ROCK, name: 'Glitzernder Fels', dig: 'grab_' + i, world: m === 'kristallwald' ? 3 : m === 'erzmine' ? 2 : 1 }); });
if (MAPS.duenenhain) { const p = placeSpot(MAPS.duenenhain, 19, 7); if (p) MAPS.duenenhain.npcs.push({ id: 'fossa', x: p.x, y: p.y, dir: 'down', look: { skin: '#e8c0a0', hair: '#f0f0f0', outfit: '#a87848', pants: '#5a4a3a', accent: '#f8d870', cap: '#c8a060' }, name: 'Dr. Fossa' }); }
}

// ---------------------------------------------------------------- Zeichnen in der Oberwelt
const rockCache = {};
export function digRock(on) {
  if (rockCache[on]) return rockCache[on];
  const c = document.createElement('canvas'); c.width = 16; c.height = 16; const x = c.getContext('2d');
  const px = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  px('rgba(0,0,0,.28)', 2, 13, 12, 2);
  px('#2a2028', 3, 5, 10, 9); px('#2a2028', 2, 7, 12, 6); px('#2a2028', 5, 3, 6, 2);
  px('#8a7a6a', 4, 5, 8, 8); px('#8a7a6a', 3, 7, 10, 5); px('#8a7a6a', 6, 4, 4, 1);
  px('#a89888', 5, 5, 4, 2); px('#a89888', 4, 7, 3, 2); px('#6a5a4a', 9, 9, 3, 3); px('#6a5a4a', 4, 11, 6, 1);
  if (on) { px('#7fe3ff', 7, 8, 2, 2); px('#ffffff', 7, 8, 1, 1); px('#ffd84a', 10, 6, 1, 1); }
  return (rockCache[on] = c);
}
export const digOn = (s, key) => s.flags[key] !== today();
export function drawDigActor(ctx, a, cx, cy, s) {
  const on = digOn(s, a.dig), x = Math.round(a.px - cx), y = Math.round(a.py - cy) - 2;
  ctx.drawImage(digRock(on), x, y);
  if (on && Math.sin(G.t * 4 + a.x * 1.7) > 0.55) { const k = (Math.sin(G.t * 9) + 1) / 2; ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 11, y + 1 - k * 2, 1, 3 + k * 2); ctx.fillRect(x + 10 - k, y + 2, 3 + k * 2, 1); }
}

// ---------------------------------------------------------------- Schatz-Bilder
function treasureArt(k, w, h) {
  const c = document.createElement('canvas'); c.width = w * 16; c.height = h * 16; const x = c.getContext('2d');
  const W2 = w * 16, H2 = h * 16;
  const slab = (col) => { x.fillStyle = '#2a2028'; x.beginPath(); x.ellipse(W2 / 2, H2 / 2, W2 / 2 - 1, H2 / 2 - 1, 0, 0, 7); x.fill(); x.fillStyle = col; x.beginPath(); x.ellipse(W2 / 2, H2 / 2, W2 / 2 - 3, H2 / 2 - 3, 0, 0, 7); x.fill(); };
  x.lineCap = 'round';
  if (k === 'muschelfossil') {
    slab('#d8c8a8'); x.strokeStyle = '#6a5038'; x.lineWidth = 3; x.beginPath();
    for (let t = 0; t < 14; t += 0.1) { const r = 2 + t * 1.25, a = t; const px = W2 / 2 + Math.cos(a) * r, py = H2 / 2 + Math.sin(a) * r; t ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
    x.strokeStyle = '#f8ecd0'; x.lineWidth = 1; x.stroke();
  } else if (k === 'krallenfossil') {
    slab('#d8c8a8'); x.fillStyle = '#6a5038';
    for (const o of [-12, 0, 12]) { x.beginPath(); x.moveTo(W2 / 2 + o - 5, H2 - 6); x.quadraticCurveTo(W2 / 2 + o - 6, 6, W2 / 2 + o + 5, 4); x.quadraticCurveTo(W2 / 2 + o + 1, 12, W2 / 2 + o + 4, H2 - 6); x.fill(); }
    x.fillStyle = '#f8ecd0'; for (const o of [-12, 0, 12]) x.fillRect(W2 / 2 + o - 2, 10, 2, 8);
  } else if (k === 'fluegelfossil') {
    slab('#d8c8a8'); x.strokeStyle = '#6a5038'; x.lineWidth = 2;
    for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(10, H2 - 10); x.lineTo(W2 - 8 - i * 3, 8 + i * 7); x.stroke(); }
    x.strokeStyle = '#f8ecd0'; x.lineWidth = 1; x.beginPath(); x.moveTo(10, H2 - 10); x.lineTo(W2 - 8, 8); x.stroke();
  } else if (['urbernstein', 'sternquarz', 'goldmuschel', 'meteorit'].includes(k)) {
    const col = { urbernstein: ['#f8b030', '#ffe080', '#a86010'], sternquarz: ['#a888ff', '#f0e8ff', '#5a40c8'], goldmuschel: ['#f8d040', '#fff8c0', '#b88810'], meteorit: ['#5a5068', '#ff9a50', '#2a2030'] }[k];
    x.fillStyle = '#2a2028'; x.beginPath(); x.moveTo(16, 1); x.lineTo(31, 12); x.lineTo(24, 31); x.lineTo(8, 31); x.lineTo(1, 12); x.closePath(); x.fill();
    x.fillStyle = col[0]; x.beginPath(); x.moveTo(16, 3); x.lineTo(29, 12); x.lineTo(23, 29); x.lineTo(9, 29); x.lineTo(3, 12); x.closePath(); x.fill();
    x.fillStyle = col[2]; x.beginPath(); x.moveTo(16, 16); x.lineTo(23, 29); x.lineTo(9, 29); x.closePath(); x.fill();
    x.fillStyle = col[1]; x.beginPath(); x.moveTo(16, 3); x.lineTo(16, 16); x.lineTo(3, 12); x.closePath(); x.fill();
    if (k === 'urbernstein') { x.fillStyle = '#3a2010'; x.fillRect(14, 15, 4, 3); x.fillRect(12, 14, 2, 1); x.fillRect(18, 14, 2, 1); }
  } else { const I = itemIcon(k, ITEMS[k]); x.imageSmoothingEnabled = false; x.drawImage(I, 0, 0, W2, H2); }
  return c;
}

// ---------------------------------------------------------------- Minispiel
const DIRT = [null, '#c8945a', '#a87444', '#875a34', '#6a4428', '#52341e'];
class DigScene {
  constructor(res, world) {
    this.res = res; this.cols = 13; this.rows = 7; this.ox = 16; this.oy = 30; this.cx = 6; this.cy = 3; this.tool = 0; this.meter = 0; this.max = 54; this.t = 0;
    this.parts = []; this.over = null; this.shk = 0;
    const N = this.cols * this.rows, r = () => Math.random();
    this.cell = Array.from({ length: N }, (_, i) => { const x = i % this.cols, y = (i / this.cols) | 0; return Math.max(1, Math.min(5, Math.round(2.5 + Math.sin(x * 0.9 + r() * 2) + Math.cos(y * 1.3 + r() * 2) * 0.8 + r()))); });
    this.peb = Array.from({ length: N }, () => [r() * 12 + 2 | 0, r() * 12 + 2 | 0, r() < 0.5]);
    const n = 2 + (r() < 0.6) + (r() < 0.3), L = LOOT[world] || LOOT[1], tot = L.reduce((a, [, w]) => a + w, 0), used = new Set();
    this.items = [];
    for (let k = 0; k < n; k++) {
      let p = r() * tot, id = L[0][0]; for (const [i2, w] of L) { if ((p -= w) < 0) { id = i2; break; } }
      if (k === 0 && r() < 0.55) id = FOSSILS[r() * 3 | 0];
      const [w, h] = SHAPE[id];
      for (let tries = 0; tries < 60; tries++) {
        const x = r() * (this.cols - w + 1) | 0, y = r() * (this.rows - h + 1) | 0, cells = [];
        for (let a = 0; a < w; a++) for (let b = 0; b < h; b++) cells.push((y + b) * this.cols + x + a);
        if (cells.some(c => used.has(c))) continue;
        cells.forEach(c => used.add(c)); this.items.push({ id, x, y, w, h, cells, art: treasureArt(id, w, h), found: false }); break;
      }
    }
  }
  hit(x, y) {
    if (this.over) return;
    const hammer = this.tool === 1, pat = hammer ? [[0, 0, 2], [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1], [-1, -1, 1], [1, -1, 1], [-1, 1, 1]] : [[0, 0, 2], [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1]];
    for (const [dx, dy, d] of pat) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= this.cols || Y >= this.rows) continue; const i = Y * this.cols + X; this.cell[i] = Math.max(0, this.cell[i] - d); }
    this.meter += hammer ? 2 : 1; this.shk = hammer ? 0.35 : 0.18; sfx(hammer ? 'hit' : 'click');
    const px = this.ox + x * 16 + 8, py = this.oy + y * 16 + 8;
    for (let i = 0; i < (hammer ? 16 : 9); i++) { const a = Math.random() * 6.28, v = 30 + Math.random() * 50; this.parts.push({ x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, l: 0.5, c: DIRT[1 + (Math.random() * 3 | 0)] }); }
    for (const it of this.items) if (!it.found && it.cells.every(c => this.cell[c] === 0)) { it.found = true; sfx('caught'); for (let i = 0; i < 24; i++) { const a = i / 24 * 6.28; this.parts.push({ x: this.ox + (it.x + it.w / 2) * 16, y: this.oy + (it.y + it.h / 2) * 16, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, l: 0.7, c: i % 2 ? '#ffffff' : '#ffd84a' }); } }
    if (this.items.every(it => it.found)) this.over = { win: true, t: 0 };
    else if (this.meter >= this.max) { this.over = { win: false, t: 0 }; sfx('faint'); this.shk = 1; }
  }
  update(dt) {
    this.t += dt; if (this.shk > 0) this.shk -= dt;
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.l -= dt; } this.parts = this.parts.filter(p => p.l > 0);
    const tp = input.tap;
    if (this.over) { this.over.t += dt; if (this.over.t > 0.8 && (input.pressed('a') || input.pressed('b') || tp)) { pop(this); this.res(this.items.filter(i => i.found).map(i => i.id)); } return; }
    if (input.pressed('left')) this.cx = Math.max(0, this.cx - 1); if (input.pressed('right')) this.cx = Math.min(this.cols - 1, this.cx + 1);
    if (input.pressed('up')) this.cy = Math.max(0, this.cy - 1); if (input.pressed('down')) this.cy = Math.min(this.rows - 1, this.cy + 1);
    if (input.pressed('b')) { this.tool ^= 1; sfx('click'); }
    if (input.pressed('a')) this.hit(this.cx, this.cy);
    if (tp) {
      if (inRect(tp, 150, 2, 42, 22)) { this.tool = 0; sfx('click'); }
      else if (inRect(tp, 194, 2, 42, 22)) { this.tool = 1; sfx('click'); }
      else if (inRect(tp, this.ox, this.oy, this.cols * 16, this.rows * 16)) { this.cx = (tp.x - this.ox) / 16 | 0; this.cy = (tp.y - this.oy) / 16 | 0; this.hit(this.cx, this.cy); }
    }
  }
  draw(ctx) {
    ctx.fillStyle = '#2a1c14'; ctx.fillRect(0, 0, W, H);
    const sx = this.shk > 0 ? Math.round((Math.random() - 0.5) * this.shk * 8) : 0, sy = this.shk > 0 ? Math.round((Math.random() - 0.5) * this.shk * 6) : 0;
    // Wand-Stabilität
    text('AUSGRABUNG', 6, 4, '#ffe8c0', 7.5, 'left', '#000', true);
    const k = Math.min(1, this.meter / this.max);
    ctx.fillStyle = '#120a08'; ctx.fillRect(6, 15, 138, 8); ctx.fillStyle = k > 0.75 ? '#e84a3a' : k > 0.45 ? '#f0b030' : '#78c858'; ctx.fillRect(7, 16, 136 * k, 6);
    for (let i = 1; i < 6; i++) { ctx.fillStyle = '#120a08'; ctx.fillRect(7 + i * 23, 16, 1, 6); }
    for (const [i, lab] of [[0, 'HACKE'], [1, 'HAMMER']]) { const bx = 150 + i * 44; box(bx, 2, 42, 22, this.tool === i ? 'gold' : 'dark'); text(lab, bx + 21, 9, this.tool === i ? COL.ink : '#fff', 6.5, 'center', null, true); }
    ctx.save(); ctx.translate(sx, sy);
    ctx.fillStyle = '#120a08'; ctx.fillRect(this.ox - 3, this.oy - 3, this.cols * 16 + 6, this.rows * 16 + 6);
    ctx.fillStyle = '#3a2a1e'; ctx.fillRect(this.ox, this.oy, this.cols * 16, this.rows * 16);
    for (const it of this.items) { ctx.drawImage(it.art, this.ox + it.x * 16, this.oy + it.y * 16); if (it.found) { ctx.globalAlpha = 0.25 + 0.2 * Math.sin(this.t * 6); ctx.fillStyle = '#fff8c0'; ctx.fillRect(this.ox + it.x * 16, this.oy + it.y * 16, it.w * 16, it.h * 16); ctx.globalAlpha = 1; } }
    for (let i = 0; i < this.cell.length; i++) {
      const v = this.cell[i]; if (!v) continue;
      const x = this.ox + (i % this.cols) * 16, y = this.oy + ((i / this.cols) | 0) * 16;
      ctx.fillStyle = DIRT[v]; ctx.fillRect(x, y, 16, 16);
      ctx.fillStyle = 'rgba(255,240,210,.18)'; ctx.fillRect(x, y, 16, 1); ctx.fillRect(x, y, 1, 16);
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(x, y + 15, 16, 1); ctx.fillRect(x + 15, y, 1, 16);
      const [a, b, big] = this.peb[i]; ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + a, y + b, big ? 3 : 2, 2); ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(x + a, y + b, 1, 1);
      if (v >= 4) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x + 3, y + 8, 6, 1); ctx.fillRect(x + 8, y + 4, 1, 5); }
    }
    if (!this.over) { const x = this.ox + this.cx * 16, y = this.oy + this.cy * 16, b = Math.sin(this.t * 8) > 0 ? '#ffffff' : '#ffd84a'; ctx.strokeStyle = b; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, 15, 15); if (this.tool) { ctx.globalAlpha = 0.35; ctx.strokeRect(x - 15.5, y - 15.5, 47, 47); ctx.globalAlpha = 1; } }
    for (const p of this.parts) { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }
    ctx.restore();
    const found = this.items.filter(i => i.found).length;
    text(this.over ? (this.over.win ? 'Alles freigelegt!' : 'Die Wand stürzt ein!') : `Funde: ${found} von ${this.items.length}   A graben · B Werkzeug`, W / 2, 147, this.over && !this.over.win ? '#ff9a8a' : '#ffe8c0', 7, 'center', '#000', true);
  }
}

// ---------------------------------------------------------------- Ablauf
let HE; export function init(h) { HE = h; setupSpots(); }
export const QUESTS = {}, LOGS = {}, GYMS = {};
async function digSpot(g, n) {
  const s = g.state;
  if (!s.bag.grabset) return say(['Im Fels glitzert etwas.', 'Mit Werkzeug könnte man hier graben. Dr. Fossa in Dünenhain weiß bestimmt mehr.']);
  if (!digOn(s, n.dig)) return say('Hier wurde heute schon gegraben. Morgen glitzert es bestimmt wieder.');
  if (!await ask('Im Fels glitzert etwas! Graben?')) return;
  const found = await new Promise(res => push(new DigScene(res, n.world || s.world || 1)));
  s.flags[n.dig] = today();
  if (!found.length) return say('Leider nichts gefunden. Vorsichtiger graben – sonst stürzt die Wand ein!');
  for (const k of found) { s.bag[k] = (s.bag[k] || 0) + 1; }
  sfx('caught');
  await say(found.map(k => `Du findest ${ITEMS[k].name}!`));
  s.dug = (s.dug || 0) + found.length;
  g.save?.(true);
}
async function fossa(g, n) {
  const s = g.state, N = { name: n.name };
  if (!s.bag.grabset) {
    await say(['Dr. Fossa: Oh, Besuch! Pass auf, wo du hintrittst – überall liegen meine Funde.', 'Dr. Fossa: Ich erforsche Fossilien. Kreaturen, die lange vor uns gelebt haben.', 'Dr. Fossa: In den Höhlen glitzern manche Felsen. Dahinter stecken Schätze – und manchmal Fossilien!', 'Dr. Fossa: Hier, mein altes Grabset. Bring mir Fossilien, und ich erwecke sie wieder zum Leben!'], N);
    s.bag.grabset = 1; sfx('caught');
    return say(['Du erhältst das GRABSET!', 'An glitzernden Felsen A drücken. Die Hacke ist sanft, der Hammer schnell – aber die Wand hält nicht ewig.', 'Die erste Grabstelle ist gleich in der Sandgrotte im Norden.']);
  }
  for (;;) {
    const fos = FOSSILS.filter(k => s.bag[k]), val = Object.keys(ITEMS).filter(k => ITEMS[k].worth && s.bag[k]);
    const c = await choose(['Fossil erwecken', 'Schätze verkaufen', 'Was gibt es zu finden?', 'Tschüss'], { title: 'Dr. Fossa' });
    if (c === null || c === 3) return say('Dr. Fossa: Gutes Graben!', N);
    if (c === 2) { await say(['Dr. Fossa: Drei Fossilien kenne ich: Muschel, Kralle und Flügel. Daraus werden Ammolit, Krallix und Schwingstein.', 'Dr. Fossa: Bernstein, Quarz, Goldmuscheln und Meteoriten kaufe ich dir gern ab.', `Dr. Fossa: Du hast schon ${s.dug || 0} Funde ausgegraben!`], N); continue; }
    if (c === 1) {
      if (!val.length) { await say('Dr. Fossa: Du hast gerade keine Schätze dabei.', N); continue; }
      const sum = val.reduce((a, k) => a + ITEMS[k].worth * s.bag[k], 0);
      if (!await ask(`Alle Schätze für ${sum} ◈ verkaufen?`)) continue;
      val.forEach(k => delete s.bag[k]); s.money += sum; sfx('caught'); await say(`Du erhältst ${sum} ◈!`); continue;
    }
    if (!fos.length) { await say('Dr. Fossa: Du hast kein Fossil dabei. Grab in den Höhlen danach!', N); continue; }
    const f = fos.length === 1 ? 0 : await choose(fos.map(k => ITEMS[k].name), { title: 'Welches Fossil?' });
    if (f === null) continue;
    const k = fos[f], sp = ITEMS[k].fossil;
    if (--s.bag[k] <= 0) delete s.bag[k];
    await say(['Dr. Fossa: Dann wollen wir mal! Das Fossil kommt in die Maschine …', '* summ … brumm … PLING! *'], N);
    const m = createMon(sp, 25); sfx('caught'); cry(SPECIES[sp].cry);
    g.markDex(sp, true);
    await say(`${SPECIES[sp].name} ist erwacht!`);
    if (s.team.length < 6) s.team.push(m); else { s.box.push(m); await say(`${SPECIES[sp].name} wurde in die Box geschickt.`); }
    g.save?.(true);
  }
}
export async function talk(g, n) {
  if (n.dig) { await digSpot(g, n); return true; }
  if (n.id === 'fossa') { await fossa(g, n); return true; }
  return false;
}
