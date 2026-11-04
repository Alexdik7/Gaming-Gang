// Geheimbasis: Plätze in der Welt, Basis-Räume, Möbel (Pixel-Art), Platzieren, Basis-Code zum Teilen
import { G, W, H, VH, COL, input, text, box, pop, push } from './engine.js';
import { MAPS } from './maps.js';
import { sfx } from '../core/audio.js';
import { monSprite } from './sprites.js';
import { shade } from './pixel.js';

const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };

// ---------------------------------------------------------------- Plätze
const SPOT_MAPS = { route1: 'baum', route2: 'baum', altwald: 'baum', route3: 'fels', route4: 'baum', route5: 'schnee', route6: 'baum', route7: 'fels', route8: 'fels' };
const SPOT_TILES = { baum: 'TPD', fels: 'RqXH^', schnee: 'GqT' };
let _spots = null;
// Pro Karte ein fester Platz: ein Baum/Fels mit begehbarem Feld darunter, möglichst mittig
export function baseSpots() {
  if (_spots) return _spots;
  _spots = {};
  for (const [id, theme] of Object.entries(SPOT_MAPS)) {
    const M = MAPS[id]; if (!M?.rows) continue;
    const h = M.rows.length, w = M.rows[0].length; let best = null;
    for (let y = 1; y < h - 2; y++) for (let x = 1; x < w - 1; x++) {
      const c = M.rows[y][x], below = M.rows[y + 1][x];
      if (!SPOT_TILES[theme].includes(c) || !'.,=_sndal'.includes(below)) continue;
      if ((M.buildings || []).some(b => x >= b.x && x < b.x + b.w && y + 1 >= b.y && y + 1 < b.y + b.h)) continue;
      if ((M.npcs || []).some(n => n.x === x && n.y === y + 1) || (M.items || []).some(i => i.x === x && i.y === y + 1)) continue;
      const d = Math.abs(y - h / 2) + Math.abs(x - w / 2) * 0.6;
      if (!best || d < best.d) best = { x, y, d };
    }
    if (best) _spots[id] = { map: id, x: best.x, y: best.y, theme };
  }
  return _spots;
}
export const spotAt = (map, x, y) => { const s = baseSpots()[map]; return s && s.x === x && s.y === y ? s : null; };

// Markierung am Platz: Baumhöhle mit Ranken bzw. Felsspalt
export function drawSpot(ctx, sp, cx, cy, owned, top) {
  const x = sp.x * 16 - cx, y = sp.y * 16 - cy;
  if (top) { // Ranken über der Krone bzw. Moos am Fels – gut sichtbar
    if (sp.theme === 'fels') { ctx.fillStyle = '#58a048'; ctx.fillRect(x + 2, y - 2, 12, 2); ctx.fillStyle = '#3a7a34'; for (const a of [3, 6, 10, 12]) ctx.fillRect(x + a, y, 1, 3 + (a % 3)); }
    else { const vc = sp.theme === 'schnee' ? ['#a8c8e0', '#e8f4ff'] : ['#2e6a2a', '#5ab048']; for (const [a, l] of [[2, 9], [4, 6], [11, 7], [13, 10]]) { ctx.fillStyle = vc[0]; ctx.fillRect(x + a, y - 6, 1, l); ctx.fillStyle = vc[1]; ctx.fillRect(x + a - 1, y - 6 + l - 2, 2, 2); } ctx.fillStyle = '#ff8ab0'; ctx.fillRect(x + 3, y - 1, 2, 2); ctx.fillStyle = '#ffd36b'; ctx.fillRect(x + 12, y + 1, 2, 2); }
    if (owned) { ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 13, y - 10, 1, 9); ctx.fillStyle = '#e84a5f'; ctx.fillRect(x + 14, y - 10, 5, 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 15, y - 9, 2, 1); }
    return;
  }
  if (sp.theme === 'fels') {
    ctx.fillStyle = '#2a2026'; ctx.beginPath(); ctx.moveTo(x + 4, y + 16); ctx.lineTo(x + 6, y + 8); ctx.lineTo(x + 8, y + 5); ctx.lineTo(x + 10, y + 8); ctx.lineTo(x + 12, y + 16); ctx.fill();
    ctx.fillStyle = '#100c12'; ctx.fillRect(x + 7, y + 9, 3, 7);
  } else {
    ctx.fillStyle = '#3a2416'; ctx.beginPath(); ctx.ellipse(x + 8, y + 11, 4.5, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#140c0a'; ctx.beginPath(); ctx.ellipse(x + 8, y + 12, 3.2, 4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = sp.theme === 'schnee' ? '#e8f4ff' : '#4aa040';
  }
}

// ---------------------------------------------------------------- Räume
const THEME = {
  baum: { name: 'Baumhöhle', top: '###w##w###', floor: 'o' },
  fels: { name: 'Felsenhöhle', top: 'WWWWWWWWWW', floor: 'c' },
  schnee: { name: 'Eishöhle', top: 'WWWWWWWWWW', floor: 'n' },
};
export function baseMap(theme, name = 'Geheimbasis', decor = []) {
  const T = THEME[theme] || THEME.baum, f = T.floor;
  const row = f.repeat(10);
  return { name, indoor: true, base: true, rows: [T.top, 'Q' + f.repeat(9), row, row, row, row, row, f.repeat(4) + 'mm' + f.repeat(4)], npcs: [], decor };
}

// ---------------------------------------------------------------- Möbel
export const DECOR = {
  stuhl: { name: 'Sitzkissen', price: 200, solid: false },
  tisch: { name: 'Holztisch', price: 400, solid: true },
  pflanze: { name: 'Topfpflanze', price: 300, solid: true },
  regal: { name: 'Bücherregal', price: 600, solid: true },
  lampe: { name: 'Leuchtkugel', price: 700, solid: true },
  teppich_rot: { name: 'Roter Teppich', price: 500, w: 2, h: 2, solid: false, floor: true },
  teppich_blau: { name: 'Blauer Teppich', price: 500, w: 2, h: 2, solid: false, floor: true },
  bett: { name: 'Gemütliches Bett', price: 900, h: 2, solid: true },
  fernseher: { name: 'Fernseher', price: 1200, solid: true },
  aquarium: { name: 'Aquarium', price: 2500, w: 2, solid: true },
  statue: { name: 'Kristallstatue', price: 3000, solid: true },
  pokal: { name: 'Orden-Pokal', price: 1500, solid: true },
  pluesch: { name: 'Plüschfigur', price: 1000, solid: true, plush: true },
  poster: { name: 'Kreaturen-Poster', price: 400, solid: false, wall: true, plush: true },
  sprungmatte: { name: 'Sprungmatte', price: 800, solid: false, floor: true },
};
export const dsize = id => [DECOR[id].w || 1, DECOR[id].h || 1];
const artCache = {};
export function decorArt(id, sp) {
  const key = id + (sp || '');
  if (artCache[key]) return artCache[key];
  const [w, h] = dsize(id), [c, x] = cv(w * 16, h * 16 + 8), o = 8; // 8 px Luft nach oben für hohe Möbel
  const R = (col, a, b, ww, hh) => { x.fillStyle = col; x.fillRect(a, b + o, ww, hh); };
  const ol = '#2a2026';
  switch (id) {
    case 'stuhl': R('rgba(0,0,0,.2)', 2, 11, 12, 3); R(ol, 2, 5, 12, 8); R('#e86a7a', 3, 6, 10, 6); R('#ff9aa8', 4, 6, 8, 2); R('#c84a5a', 3, 10, 10, 2); R('#ffd36b', 7, 8, 2, 1); break;
    case 'tisch': R('rgba(0,0,0,.22)', 1, 13, 14, 3); R(ol, 1, 3, 14, 7); R('#c88a50', 2, 4, 12, 4); R('#e0a868', 2, 4, 12, 1); R('#a0683a', 2, 8, 12, 1); R(ol, 2, 9, 2, 6); R(ol, 12, 9, 2, 6); R('#8a5a30', 3, 9, 1, 5); R('#8a5a30', 12, 9, 1, 5); break;
    case 'pflanze': R('rgba(0,0,0,.2)', 3, 14, 10, 2); R(ol, 4, 9, 8, 6); R('#c8643a', 5, 10, 6, 4); R('#e8845a', 5, 10, 6, 1);
      for (const [a, b, r, col] of [[8, 2, 4, '#2e7a34'], [5, 5, 3.5, '#3a9a40'], [11, 5, 3.5, '#3a9a40'], [8, 6, 3, '#58c050'], [6, 3, 1.5, '#8ae070']]) { x.fillStyle = col; x.beginPath(); x.arc(a, b + o, r, 0, 7); x.fill(); } R('#a8f088', 9, 1, 1, 1); break;
    case 'regal': R(ol, 1, -6, 14, 21); R('#8a5a30', 2, -5, 12, 19); R('#5a3a1a', 3, -4, 10, 5); R('#5a3a1a', 3, 2, 10, 5); R('#5a3a1a', 3, 8, 10, 5);
      [['#e84a5f', '#3d8bfd', '#f6d23c', '#7ad05a', '#c86aff'], ['#3d8bfd', '#7ad05a', '#e84a5f', '#ffffff', '#f6a03c'], ['#f6d23c', '#c86aff', '#3d8bfd', '#e84a5f', '#7ad05a']].forEach((row, j) => row.forEach((col, i) => R(col, 3 + i * 2, -3 + j * 6 + (i % 2), 2, 4 - (i % 2)))); break;
    case 'lampe': { const g = x.createRadialGradient(8, 4 + o, 1, 8, 4 + o, 9); g.addColorStop(0, 'rgba(255,240,170,.8)'); g.addColorStop(1, 'rgba(255,220,120,0)'); x.fillStyle = g; x.fillRect(-1, -5 + o, 18, 18);
      R('rgba(0,0,0,.2)', 4, 14, 8, 2); R(ol, 7, 6, 2, 9); R(ol, 5, 13, 6, 2); R('#a0a8b8', 6, 13, 4, 1); x.fillStyle = ol; x.beginPath(); x.arc(8, 3 + o, 5, 0, 7); x.fill(); x.fillStyle = '#ffe890'; x.beginPath(); x.arc(8, 3 + o, 4, 0, 7); x.fill(); R('#ffffff', 6, 1, 2, 2); break; }
    case 'teppich_rot': case 'teppich_blau': { const b = id === 'teppich_rot' ? ['#a83a4a', '#d85a6a', '#ffd36b'] : ['#2a5aa8', '#4a8ad8', '#e8f0ff']; R(b[0], 1, 1, 30, 30); R(b[1], 3, 3, 26, 26); x.strokeStyle = b[2]; x.lineWidth = 1; x.strokeRect(5.5, 5.5 + o, 21, 21); R(b[2], 14, 14, 4, 4); R(b[0], 15, 15, 2, 2); for (let i = 0; i < 4; i++) { R(b[2], 2 + i * 8, 0, 2, 1); R(b[2], 2 + i * 8, 31, 2, 1); } break; }
    case 'bett': R('rgba(0,0,0,.2)', 1, 28, 14, 3); R(ol, 1, -2, 14, 31); R('#8a5a30', 2, -1, 12, 4); R('#f4f4f4', 2, 3, 12, 6); R('#d8e0ec', 2, 7, 12, 2); R('#3d8bfd', 2, 9, 12, 18); R('#6aa8ff', 2, 9, 12, 2); R('#2a6ad8', 2, 24, 12, 3); R('#ffffff', 4, 4, 4, 2); break;
    case 'fernseher': R('rgba(0,0,0,.22)', 1, 13, 14, 3); R(ol, 1, 1, 14, 13); R('#5a5a6a', 2, 2, 12, 11); R('#1a2a3a', 3, 3, 10, 7); R('#3a6a8a', 3, 3, 10, 2); R('#c8e8ff', 4, 4, 2, 1); R('#e84a5f', 11, 11, 1, 1); R('#7ad05a', 9, 11, 1, 1); R(ol, 6, -2, 1, 3); R(ol, 9, -2, 1, 3); break;
    case 'aquarium': R('rgba(0,0,0,.22)', 1, 13, 30, 3); R(ol, 1, 0, 30, 14); R('#7ac8f0', 2, 1, 28, 11); R('#9adcff', 2, 1, 28, 2); R('#3a8ac8', 2, 9, 28, 3); R('#e8d8a0', 2, 11, 28, 1); R('#3a9a40', 6, 5, 1, 6); R('#3a9a40', 24, 4, 1, 7); R('#58c050', 25, 6, 1, 4); R('#8a8a9a', 0, 12, 32, 3); R('#ffffff', 4, 2, 1, 4); break;
    case 'statue': { R('rgba(0,0,0,.25)', 2, 13, 12, 3); R(ol, 3, 11, 10, 5); R('#a0a8b8', 4, 12, 8, 3); R('#d0d8e8', 4, 12, 8, 1);
      x.fillStyle = ol; x.beginPath(); x.moveTo(8, -6 + o); x.lineTo(13, 3 + o); x.lineTo(8, 12 + o); x.lineTo(3, 3 + o); x.fill();
      x.fillStyle = '#7fe3ff'; x.beginPath(); x.moveTo(8, -4.5 + o); x.lineTo(11.6, 3 + o); x.lineTo(8, 10.5 + o); x.lineTo(4.4, 3 + o); x.fill();
      x.fillStyle = '#3aa8d8'; x.beginPath(); x.moveTo(8, 3 + o); x.lineTo(11.6, 3 + o); x.lineTo(8, 10.5 + o); x.fill(); R('#ffffff', 6, -1, 2, 3); break; }
    case 'pokal': R('rgba(0,0,0,.22)', 3, 14, 10, 2); R(ol, 4, 12, 8, 4); R('#8a5a30', 5, 13, 6, 2); R(ol, 7, 8, 2, 5); R(ol, 3, -1, 10, 10); R('#f6c83c', 4, 0, 8, 8); R('#ffe890', 4, 0, 8, 2); R('#c8961a', 4, 6, 8, 2); R(ol, 1, 1, 2, 4); R(ol, 13, 1, 2, 4); R('#ffffff', 5, 1, 2, 2); break;
    case 'sprungmatte': R(ol, 1, 3, 14, 11); R('#58c050', 2, 4, 12, 9); R('#8ae070', 2, 4, 12, 2); R('#ffd36b', 5, 7, 6, 3); R('#3a9a40', 2, 11, 12, 2); break;
    case 'pluesch': { R('rgba(0,0,0,.22)', 2, 13, 12, 3); if (sp) { const im = monSprite(sp, 'icon'); x.drawImage(im, 0, 0, im.width, im.height, -2, -6 + o, 20, 20); } break; }
    case 'poster': { R(ol, 1, -6, 14, 18); R('#f8f0d8', 2, -5, 12, 16); R('#d8e8f8', 3, -4, 10, 10); if (sp) { const im = monSprite(sp, 'icon'); x.drawImage(im, 0, 0, im.width, im.height, 2, -6 + o, 12, 12); } R('#e84a5f', 3, 8, 10, 2); break; }
  }
  return (artCache[key] = c);
}
// Möbel einer Basis auf der Karte zeichnen (nach y sortiert, Teppiche zuerst)
export function drawDecor(ctx, list, cx, cy) {
  const L = [...list].sort((a, b) => (DECOR[b.d].floor ? 1 : 0) - (DECOR[a.d].floor ? 1 : 0) || a.y - b.y);
  for (const it of L) {
    const img = decorArt(it.d, it.sp), px = it.x * 16 - cx, py = it.y * 16 - cy - 8;
    ctx.drawImage(img, px, py);
    if (it.d === 'aquarium') { for (let i = 0; i < 3; i++) { const fx = px + 4 + ((G.t * (10 + i * 4) + i * 9) % 22), fy = py + 8 + 4 + i * 2 + Math.round(Math.sin(G.t * 2 + i) * 1); ctx.fillStyle = ['#ff8a3a', '#ffd23a', '#e84a5f'][i]; ctx.fillRect(Math.round(fx), fy, 3, 2); ctx.fillRect(Math.round(fx) - 1, fy, 1, 2); } }
    if (it.d === 'fernseher') { ctx.fillStyle = `hsla(${(G.t * 90) % 360},70%,60%,.45)`; ctx.fillRect(px + 3, py + 8 + 5, 10, 5); }
    if (it.d === 'statue' && Math.sin(G.t * 3 + it.x) > 0.9) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px + 11, py + 6, 1, 3); ctx.fillRect(px + 10, py + 7, 3, 1); }
  }
}
export function decorAt(list, x, y) { return list.find(it => { const [w, h] = dsize(it.d); return x >= it.x && x < it.x + w && y >= it.y && y < it.y + h; }); }

// ---------------------------------------------------------------- Platzieren
class PlaceScene {
  constructor(ow, id, sp, res) {
    this.overlay = true; this.ow = ow; this.id = id; this.sp = sp; this.res = res;
    const p = ow.p; this.x = p.x; this.y = Math.max(1, p.y - 1);
  }
  ok() {
    const [w, h] = dsize(this.id), D = DECOR[this.id], list = this.ow.M.decor;
    for (let yy = this.y; yy < this.y + h; yy++) for (let xx = this.x; xx < this.x + w; xx++) {
      const c = this.ow.ch(xx, yy); if (c === null) return false;
      if (D.wall ? yy !== 0 : yy === 0 || c === 'm' || c === 'Q') return false;
      if (!D.wall && !D.floor && (this.ow.p.x === xx && this.ow.p.y === yy)) return false;
      const other = list.find(it => { const [ow2, oh] = dsize(it.d); return xx >= it.x && xx < it.x + ow2 && yy >= it.y && yy < it.y + oh && !!DECOR[it.d].floor === !!D.floor && !!DECOR[it.d].wall === !!D.wall; });
      if (other) return false;
    }
    // Ausgang frei lassen
    if (!D.floor && !D.wall && this.y + h - 1 >= this.ow.h - 2 && [4, 5].some(mx => mx >= this.x && mx < this.x + w)) return false;
    return true;
  }
  update() {
    const [w, h] = dsize(this.id);
    for (const [k, dx, dy] of [['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]]) if (input.repeat(k)) { this.x = Math.max(0, Math.min(this.ow.w - w, this.x + dx)); this.y = Math.max(0, Math.min(this.ow.h - h, this.y + dy)); sfx('click'); }
    const t = input.tap;
    if (t) { const cam = this.ow.view || { cx: 0, cy: 0 }; const tx = Math.floor((t.x + cam.cx) / 16), ty = Math.floor((t.y - (H - VH) + cam.cy) / 16); if (tx === this.x && ty === this.y) return this.place(); this.x = Math.max(0, Math.min(this.ow.w - w, tx)); this.y = Math.max(0, Math.min(this.ow.h - h, ty)); sfx('click'); return; }
    if (input.pressed('a')) return this.place();
    if (input.pressed('b')) { pop(this); this.res(null); }
  }
  place() { if (!this.ok()) { sfx('weak'); return; } sfx('caught'); pop(this); this.res({ x: this.x, y: this.y }); }
  draw(ctx) {
    ctx.save(); ctx.translate(0, H - VH);
    const cam = this.ow.view || { cx: 0, cy: 0 }, [w, h] = dsize(this.id), ok = this.ok();
    const px = this.x * 16 - cam.cx, py = this.y * 16 - cam.cy;
    ctx.globalAlpha = 0.75 + Math.sin(G.t * 8) * 0.2; ctx.drawImage(decorArt(this.id, this.sp), px, py - 8); ctx.globalAlpha = 1;
    ctx.strokeStyle = ok ? '#7dffb0' : '#ff5a5a'; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, w * 16 - 1, h * 16 - 1);
    ctx.restore();
    box(0, H - 22, W, 22);
    text(`${DECOR[this.id].name}: Pfeile bewegen · A platzieren · B zurück`, W / 2, H - 15, COL.ink, 7, 'center', COL.shadow, true);
  }
}
export function placeDecor(ow, id, sp) { return new Promise(res => push(new PlaceScene(ow, id, sp, res))); }

// ---------------------------------------------------------------- Basis-Code
export function encodeBase(s) {
  const o = { v: 1, n: s.name, l: s.look, th: s.base.theme, d: s.base.items.map(i => [i.d, i.x, i.y, i.sp || 0]), t: s.team.filter(m => !m.egg).slice(0, 6).map(m => [m.sp, m.lvl, m.shiny ? 1 : 0]), b: s.badges.filter(Boolean).length };
  return 'LU-' + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
}
export function decodeBase(code) {
  try {
    const raw = String(code).trim().replace(/^LU-/, '').replace(/\s+/g, '');
    const o = JSON.parse(decodeURIComponent(escape(atob(raw))));
    if (o.v !== 1 || !Array.isArray(o.t) || !Array.isArray(o.d)) return null;
    o.d = o.d.filter(([d]) => DECOR[d]).map(([d, x, y, sp]) => ({ d, x, y, sp: sp || undefined }));
    return o;
  } catch { return null; }
}
