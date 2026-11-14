// Renderer: zeichnet Spielfeld, Katzen, Hunde, Geschosse und Effekte auf das Canvas.
// Liest nur den Zustand (World oder Netz-Ansicht) – verändert ihn nie.
import { GRID } from '../config.js';
import { T_PATH, T_WATER, T_FREE } from '../sim/maps.js';
import { catSprite, weaponSprite, dogSprite, weaponAims, shade, OL } from './art.js';

const TAU = Math.PI * 2;
const TYPE_COL = { phys: '#ffe9a8', fire: '#ff8a3d', ice: '#9fe4ff', volt: '#7df0ff', boom: '#ffb02e', shadow: '#c77dff', light: '#fff3a0', acid: '#9be04a' };
export const OWNER_COL = ['#ffd23f', '#5ad1ff', '#ff7ab8', '#7ae04a'];
const PATH_COL = ['#ff5d5d', '#5ab4ff', '#6fd15a'];

export class Renderer {
  constructor(canvas, settings) {
    this.cv = canvas; this.c = canvas.getContext('2d'); this.set = settings;
    this.view = null; this.bg = null; this.ts = 32; this.time = 0; this.shake = 0;
    this.parts = []; this.pool = []; this.flash = 0;
  }

  setView(view) { this.view = view; this.parts.length = 0; this.resize(); }

  // Canvas an den verfügbaren Platz anpassen (Seitenverhältnis 12:16, scharf in Geräteauflösung)
  resize() {
    const box = this.cv.parentElement.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const s = Math.min((box.width - 10) / GRID.cols, (box.height - 8) / GRID.rows), q = this.set.quality;
    const dpr = Math.min(q === 'low' ? 1 : q === 'high' ? 3 : 2, window.devicePixelRatio || 1);
    this.css = s; this.ts = Math.max(8, Math.floor(s * dpr));
    this.cv.width = this.ts * GRID.cols; this.cv.height = this.ts * GRID.rows;
    this.cv.style.width = s * GRID.cols + 'px'; this.cv.style.height = s * GRID.rows + 'px';
    if (this.view) this.buildBg();
  }
  toWorld(clientX, clientY) {
    const r = this.cv.getBoundingClientRect();
    return { x: (clientX - r.left) / r.width * GRID.cols, y: (clientY - r.top) / r.height * GRID.rows };
  }
  toScreen(x, y) { const r = this.cv.getBoundingClientRect(); return { x: r.left + x / GRID.cols * r.width, y: r.top + y / GRID.rows * r.height }; }

  // ---------------------------------------------------------------- Hintergrund (einmal vorzeichnen)
  buildBg() {
    const map = this.view.map, T = map.theme, ts = this.ts;
    const b = this.bg = document.createElement('canvas'); b.width = this.cv.width; b.height = this.cv.height;
    const c = b.getContext('2d');
    c.scale(ts, ts); c.lineJoin = c.lineCap = 'round';
    c.fillStyle = T.g; c.fillRect(0, 0, GRID.cols, GRID.rows);
    for (let y = 0; y < GRID.rows; y++) for (let x = 0; x < GRID.cols; x++) if ((x + y) % 2) { c.fillStyle = T.g2; c.fillRect(x, y, 1, 1); }
    // ruhige Fläche mit wenigen gezielten Details
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 46; i++) { const x = rnd() * GRID.cols, y = rnd() * GRID.rows; c.fillStyle = i % 2 ? shade(T.g, .12) : shade(T.g, -.1); c.beginPath(); c.ellipse(x, y, .05 + rnd() * .05, .03, 0, 0, TAU); c.fill(); }
    // Wasser / Lava
    for (const [x, y, w, h] of map.def.water || []) {
      c.fillStyle = shade(T.w, -.25); c.beginPath(); c.roundRect(x + .04, y + .04, w - .08, h - .08, .35); c.fill();
      c.fillStyle = T.w; c.beginPath(); c.roundRect(x + .1, y + .1, w - .2, h - .2, .3); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = .05;
      for (let i = 0; i < w * h / 2; i++) { const px = x + .4 + rnd() * (w - .9), py = y + .35 + rnd() * (h - .7); c.beginPath(); c.moveTo(px, py); c.lineTo(px + .28, py); c.stroke(); }
    }
    // Wege
    const stroke = (w, col) => {
      c.strokeStyle = col; c.lineWidth = w;
      map.def.paths.forEach(pts => { c.beginPath(); pts.forEach(([x, y, tp], i) => { if (i === 0 || tp) c.moveTo(x + .5, y + .5); else c.lineTo(x + .5, y + .5); }); c.stroke(); });
    };
    stroke(.98, 'rgba(0,0,0,.18)'); stroke(.9, T.pe); stroke(.74, T.p);
    c.setLineDash([.12, .5]); stroke(.07, shade(T.p, -.14)); c.setLineDash([]);
    // schnelle Abschnitte (Förderband / Glatteis): Pfeile
    map.paths.forEach(p => p.segs.forEach(s => {
      if (s.mul === 1) return;
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = .07;
      for (let d = .4; d < s.len; d += .7) {
        const x = s.x0 + s.dx * d, y = s.y0 + s.dy * d;
        c.beginPath(); c.moveTo(x - s.dx * .12 - s.dy * .16, y - s.dy * .12 + s.dx * .16); c.lineTo(x + s.dx * .1, y + s.dy * .1); c.lineTo(x - s.dx * .12 + s.dy * .16, y - s.dy * .12 - s.dx * .16); c.stroke();
      }
    }));
    // Bonusfelder
    for (let y = 0; y < GRID.rows; y++) for (let x = 0; x < GRID.cols; x++) {
      const bo = map.bonus[y * GRID.cols + x]; if (!bo) continue;
      if (bo === 1) { c.fillStyle = '#b98a4a'; c.strokeStyle = '#6b4a2f'; c.lineWidth = .06; c.beginPath(); c.roundRect(x + .1, y + .1, .8, .8, .12); c.fill(); c.stroke(); c.strokeStyle = '#8a6a3a'; for (const o of [.36, .64]) { c.beginPath(); c.moveTo(x + .14, y + o); c.lineTo(x + .86, y + o); c.stroke(); } }
      else { c.fillStyle = 'rgba(40,220,255,.28)'; c.strokeStyle = '#22d3ee'; c.lineWidth = .06; c.beginPath(); for (let i = 0; i < 6; i++) c.lineTo(x + .5 + Math.cos(i * TAU / 6) * .4, y + .5 + Math.sin(i * TAU / 6) * .4); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#eaffff'; c.beginPath(); c.moveTo(x + .56, y + .24); c.lineTo(x + .38, y + .54); c.lineTo(x + .5, y + .54); c.lineTo(x + .44, y + .78); c.lineTo(x + .64, y + .46); c.lineTo(x + .52, y + .46); c.closePath(); c.fill(); }
    }
    // Teleporter
    for (const p of map.portals) for (const q of [p.from, p.to]) { for (let i = 3; i > 0; i--) { c.fillStyle = ['#fff', '#7df9ff', '#7b5cff'][i - 1]; c.beginPath(); c.ellipse(q.x, q.y, .14 * i, .14 * i, 0, 0, TAU); c.fill(); } }
    // Eingänge: Pfotenabdrücke + Warnschild
    map.entries.forEach(e => {
      const x = Math.min(GRID.cols - .5, Math.max(.5, e.x + e.dx * .9)), y = Math.min(GRID.rows - .5, Math.max(.5, e.y + e.dy * .9));
      c.fillStyle = '#e2334d'; c.strokeStyle = OL; c.lineWidth = .05; c.beginPath(); c.moveTo(x, y - .3); c.lineTo(x + .3, y + .22); c.lineTo(x - .3, y + .22); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#fff'; c.fillRect(x - .03, y - .1, .06, .17); c.fillRect(x - .03, y + .1, .06, .06);
    });
    // Deko
    for (const d of map.deco) { c.save(); c.translate(d.x + .5, d.y + .5); c.lineWidth = .045; c.strokeStyle = OL; (DECO[d.kind] || DECO.rock)(c, d.s, T); c.restore(); }
    // Katzen-Basis am Ziel
    const done = [];
    for (const bse of map.bases) {
      const x = Math.min(GRID.cols - .6, Math.max(.6, bse.x)), y = Math.min(GRID.rows - .55, Math.max(.75, bse.y));
      if (done.some(d => Math.hypot(d.x - x, d.y - y) < .5)) continue; done.push({ x, y });
      c.save(); c.translate(x, y); c.lineWidth = .05; c.strokeStyle = OL;
      c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(0, .42, .55, .12, 0, 0, TAU); c.fill();
      c.fillStyle = '#f7e2c0'; c.beginPath(); c.roundRect(-.45, -.15, .9, .58, .06); c.fill(); c.stroke();
      c.fillStyle = '#e2466f'; c.beginPath(); c.moveTo(-.58, -.12); c.lineTo(0, -.62); c.lineTo(.58, -.12); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#e2466f'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * .34, -.36); c.lineTo(s * .42, -.66); c.lineTo(s * .18, -.48); c.closePath(); c.fill(); c.stroke(); }
      c.fillStyle = '#4a3324'; c.beginPath(); c.roundRect(-.14, .08, .28, .35, [.14, .14, 0, 0]); c.fill(); c.stroke();
      c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(0, -.2, .08, 0, TAU); c.fill(); c.stroke();
      c.restore();
    }
    // weiche Vignette
    c.setTransform(1, 0, 0, 1, 0, 0);
    const g = c.createRadialGradient(b.width / 2, b.height / 2, b.height * .35, b.width / 2, b.height / 2, b.height * .75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,20,.22)');
    c.fillStyle = g; c.fillRect(0, 0, b.width, b.height);
  }

  // ---------------------------------------------------------------- Partikel (Pool)
  p(o) {
    if (this.set.quality === 'low' && o.k === 0 && Math.random() < .5) return;
    if (this.parts.length > 420) return;
    const q = this.pool.pop() || {};
    q.x = o.x; q.y = o.y; q.vx = o.vx || 0; q.vy = o.vy || 0; q.max = q.life = o.life || .4; q.size = o.size || .08; q.col = o.col || '#fff';
    q.k = o.k || 0; q.g = o.g || 0; q.txt = o.txt; q.pts = o.pts; q.r = o.r || 0; q.a = o.a || 0; q.w = o.w || 0;
    this.parts.push(q);
  }
  burst(x, y, n, col, sp = 2, size = .07, life = .4, g = 0) {
    if (!this.set.fx) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = sp * (.4 + Math.random() * .6); this.p({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, col, size: size * (.6 + Math.random() * .7), life: life * (.6 + Math.random() * .6), g }); }
  }
  text(x, y, txt, col, size = .3) { this.p({ k: 2, x, y, vy: -.9, txt, col, size, life: .8 }); }

  // Ereignisse aus der Simulation → Effekte. Gibt zurück, welcher Ton passt (für den AudioManager).
  handle(ev) {
    switch (ev.e) {
      case 'shot': if (ev.inst) { this.p({ k: 3, pts: [ev.x, ev.y, ev.tx, ev.ty], col: ev.k === 'claw' ? '#c77dff' : ev.k === 'sunstaff' ? '#fff3a0' : '#fff7d0', life: .12, size: ev.k === 'rifle' ? .05 : .09 }); this.burst(ev.tx, ev.ty, 4, '#fff', 1.6, .05, .2); } break;
      case 'boom': this.p({ k: 1, x: ev.x, y: ev.y, r: ev.r, col: TYPE_COL[ev.k] || '#ffb02e', life: .32 }); this.burst(ev.x, ev.y, Math.round(6 + ev.r * 6), TYPE_COL[ev.k] || '#ffb02e', 2.5 + ev.r, .1, .45); this.burst(ev.x, ev.y, 4, '#5a5a66', 1.2, .14, .6); if (ev.r > 1.3) this.shake = Math.max(this.shake, .06); break;
      case 'cone': for (let i = 0; i < 5; i++) { const a = ev.a + (Math.random() - .5) * ev.half * 2, v = ev.r * (2 + Math.random()); this.p({ x: ev.x + Math.cos(a) * .3, y: ev.y + Math.sin(a) * .3, vx: Math.cos(a) * v, vy: Math.sin(a) * v, col: Math.random() < .5 ? '#ffb02e' : '#ff5a36', size: .13, life: .42 }); } break;
      case 'pulse': this.p({ k: 1, x: ev.x, y: ev.y, r: ev.r, col: TYPE_COL[ev.k] || '#fff', life: .35, w: 1 }); if (ev.k === 'phys') this.shake = Math.max(this.shake, .04); break;
      case 'zap': this.p({ k: 3, pts: ev.pts, col: '#7df0ff', life: .16, size: .07, a: 1 }); break;
      case 'ray': this.p({ k: 3, pts: [ev.x, ev.y, ev.x + Math.cos(ev.a) * ev.len, ev.y + Math.sin(ev.a) * ev.len], col: TYPE_COL[ev.k] || '#fff', life: .2, size: .16 }); break;
      case 'crit': this.text(ev.x, ev.y - .3, 'KRIT!', '#ffd23f', .3); this.burst(ev.x, ev.y, 6, '#ffd23f', 2.4, .07, .3); break;
      case 'miss': this.text(ev.x, ev.y - .3, '~', '#d0d6e0', .3); break;
      case 'exec': this.text(ev.x, ev.y - .3, '✗', '#c77dff', .4); break;
      case 'freeze': this.burst(ev.x, ev.y, 6, '#bfe8ff', 1.4, .08, .5); break;
      case 'die': this.burst(ev.x, ev.y, ev.boss ? 40 : 7, '#fff', ev.boss ? 4 : 1.8, ev.boss ? .16 : .09, ev.boss ? .9 : .35); if (ev.boss) { this.shake = .18; this.flash = .25; this.burst(ev.x, ev.y, 30, '#ffd23f', 5, .12, 1, 3); } if (ev.fish > 0 && (ev.boss || this.set.quality !== 'low')) this.text(ev.x, ev.y - .2, '+' + ev.fish, '#ffe680', ev.boss ? .42 : .22); break;
      case 'leak': this.text(Math.min(11, Math.max(1, ev.x)), Math.min(15, Math.max(1, ev.y)), '−' + ev.n + ' ♥', '#ff5d7a', .42); this.shake = Math.max(this.shake, .1); this.flash = Math.max(this.flash, .12); break;
      case 'place': this.p({ k: 1, x: ev.x, y: ev.y, r: .7, col: '#fff', life: .3 }); this.burst(ev.x, ev.y + .3, 8, '#e8dcc0', 1.5, .1, .4); break;
      case 'up': this.p({ k: 1, x: ev.x, y: ev.y, r: .9, col: '#ffd23f', life: .4 }); for (let i = 0; i < 8; i++) this.p({ x: ev.x + (Math.random() - .5) * .6, y: ev.y + .3, vy: -1.5 - Math.random(), col: '#ffd23f', size: .08, life: .6, k: 4 }); break;
      case 'sell': this.burst(ev.x, ev.y, 8, '#ffe680', 2, .08, .4); break;
      case 'income': this.text(ev.x, ev.y - .4, '+' + ev.n, '#ffe680', .3); break;
      case 'stomp': this.p({ k: 1, x: ev.x, y: ev.y, r: ev.r, col: '#ff5d5d', life: .5 }); this.shake = .16; break;
      case 'howl': this.p({ k: 1, x: ev.x, y: ev.y, r: ev.r, col: '#c9a0ff', life: .6, w: 1 }); break;
      case 'phase': case 'shieldUp': case 'shieldBreak': this.burst(ev.x, ev.y, 12, ev.e === 'phase' ? '#7b5cff' : '#5ad1ff', 2.4, .09, .5); break;
      case 'enrage': this.text(ev.x, ev.y - .8, '!!!', '#ff3b3b', .5); this.shake = .15; break;
      case 'hole': this.burst(ev.x, ev.y, 10, '#7b5cff', 1.5, .08, .5); break;
      case 'minion': this.burst(ev.x, ev.y, 8, '#e8dcc0', 1.6, .09, .4); break;
      case 'power':
        if (ev.id === 'megapaw') { this.p({ k: 5, x: ev.x, y: ev.y, life: .55 }); this.shake = .22; this.burst(ev.x, ev.y, 30, '#ffb02e', 5, .14, .7); }
        else if (ev.id === 'freeze') { this.flash = .2; this.flashCol = '#bfe8ff'; }
        else this.flash = .14;
        break;
      case 'win': for (let i = 0; i < 90; i++) this.p({ x: Math.random() * GRID.cols, y: -Math.random() * 3, vx: (Math.random() - .5) * 2, vy: 3 + Math.random() * 3, col: ['#ffd23f', '#ff5d7a', '#5ad1ff', '#7ae04a'][i % 4], size: .13, life: 2.5, k: 4 }); break;
    }
  }

  // ---------------------------------------------------------------- Bild zeichnen
  draw(dt, ui) {
    const V = this.view, c = this.c, ts = this.ts; if (!V || !this.bg) return;
    this.time += dt; const time = this.time;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(this.bg, 0, 0);
    if (this.shake > 0.002 && this.set.shake) { c.translate((Math.random() - .5) * this.shake * ts, (Math.random() - .5) * this.shake * ts); this.shake *= Math.pow(.02, dt); } else this.shake = 0;
    c.scale(ts, ts); c.lineJoin = c.lineCap = 'round';
    const T = V.towers, E = V.enemies;

    // Bau-Raster beim Platzieren
    if (ui.placing) {
      for (let y = 0; y < GRID.rows; y++) for (let x = 0; x < GRID.cols; x++) {
        if (V.map.tiles[y * GRID.cols + x] !== T_FREE || T.at(x, y)) continue;
        c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.roundRect(x + .08, y + .08, .84, .84, .16); c.fill();
      }
    }
    // Schwarze Löcher
    for (const h of T.holes) { const k = Math.min(1, h.t / .3, (h.max - h.t) / .3); for (let i = 3; i > 0; i--) { c.fillStyle = ['#000', '#3d2a7a', 'rgba(123,92,255,.35)'][i - 1]; c.beginPath(); c.arc(h.x, h.y, h.r * k * i / 4, 0, TAU); c.fill(); } c.strokeStyle = '#7df9ff'; c.lineWidth = .04; c.beginPath(); c.arc(h.x, h.y, h.r * k * .8, time * 6, time * 6 + 2); c.stroke(); }

    // Reichweite der gewählten Katze
    const sel = ui.sel && T.byId(ui.sel);
    if (sel) this.ring(sel.x, sel.y, sel.range, '#fff');

    // Hunde
    const L = E.list, frame = Math.floor(time * 7) % 4;
    for (let i = 0; i < L.length; i++) this.dog(c, L[i], E, time, frame, ts);

    // Geschütze / Notfall-Katze
    for (const m of T.minions) {
      const fade = Math.min(1, m.life / 1.5);
      c.globalAlpha = fade;
      if (m.kind === 'ecat') { this.blit(catSprite('gunner', ts * 1.15, 0), m.x, m.y - .1, 1.15 * 1.4); this.rot(weaponSprite('minigun', ts * 1.15), m.x + .1, m.y + .12, m.angle, 1.15 * 1.6, m.fireT > 0 ? -.06 : 0); }
      else { c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(m.x, m.y + .16, .2, .06, 0, 0, TAU); c.fill(); c.fillStyle = '#8a929c'; c.strokeStyle = OL; c.lineWidth = .04; c.beginPath(); c.roundRect(m.x - .14, m.y - .02, .28, .18, .05); c.fill(); c.stroke(); this.rot(weaponSprite('turret', ts * .9), m.x, m.y - .02, m.angle, .9 * 1.6, m.fireT > 0 ? -.05 : 0); }
      c.globalAlpha = 1;
      c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(m.x - .2, m.y + .3, .4, .05); c.fillStyle = '#7ae04a'; c.fillRect(m.x - .2, m.y + .3, .4 * Math.max(0, m.life / m.max), .05);
    }

    // Katzen
    for (const t of T.list) this.cat(c, t, time, ts, ui);

    // Strahlen (Laser)
    for (const t of T.list) if (t.beamT > 0 && t.beam.length) {
      const hot = t.rampN || 0;
      for (let i = 0; i < t.beam.length; i += 2) {
        c.strokeStyle = 'rgba(255,46,99,.35)'; c.lineWidth = .16 + hot * .12; c.beginPath(); c.moveTo(t.x, t.y - .05); c.lineTo(t.beam[i], t.beam[i + 1]); c.stroke();
        c.strokeStyle = '#fff'; c.lineWidth = .05 + hot * .04; c.stroke();
        if (Math.random() < .5) this.burst(t.beam[i], t.beam[i + 1], 1, '#ff8fb0', 1.5, .06, .2);
      }
    }

    // Geschosse
    for (const p of T.proj) this.projectile(c, p, time);

    // Partikel
    this.particles(c, dt, ts);

    // Platzier-Vorschau
    if (ui.placing && ui.placing.tx >= 0) {
      const P = ui.placing, x = P.tx + .5, y = P.ty + .5;
      this.ring(x, y, P.range, P.ok ? '#7ae04a' : '#ff5d5d');
      c.globalAlpha = .75; this.blit(catSprite(P.cat, ts, 0), x, y - .05, 1.4); c.globalAlpha = 1;
      if (!P.ok) { c.strokeStyle = '#ff5d5d'; c.lineWidth = .1; c.beginPath(); c.moveTo(x - .3, y - .3); c.lineTo(x + .3, y + .3); c.moveTo(x + .3, y - .3); c.lineTo(x - .3, y + .3); c.stroke(); }
    }
    if (ui.aim) { this.ring(ui.aim.x, ui.aim.y, ui.aim.r, ui.aim.col); }

    // Bildschirm-Blitz
    if (this.flash > 0) { c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = this.flashCol || '#fff'; c.globalAlpha = Math.min(.5, this.flash * 2); c.fillRect(0, 0, this.cv.width, this.cv.height); c.globalAlpha = 1; this.flash -= dt; if (this.flash <= 0) this.flashCol = null; }
    // aktive Power-ups: farbiger Rand
    const fx = V.fx; c.setTransform(1, 0, 0, 1, 0, 0);
    const glow = fx.double > 0 ? '#c77dff' : fx.catnip > 0 ? '#6fd15a' : fx.gold > 0 ? '#ffd23f' : null;
    if (glow) { c.strokeStyle = glow; c.globalAlpha = .5 + Math.sin(time * 8) * .2; c.lineWidth = ts * .18; c.strokeRect(0, 0, this.cv.width, this.cv.height); c.globalAlpha = 1; }
  }

  ring(x, y, r, col) {
    const c = this.c;
    c.fillStyle = 'rgba(255,255,255,.1)'; c.strokeStyle = col; c.lineWidth = .05; c.setLineDash([.18, .14]); c.lineDashOffset = -this.time * .6;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.stroke(); c.setLineDash([]);
  }
  blit(s, x, y, size, sx = 1, sy = 1) { this.c.drawImage(s, x - size * sx / 2, y - size * sy / 2, size * sx, size * sy); }
  rot(s, x, y, a, size, back = 0) {
    const c = this.c; c.save(); c.translate(x, y);
    if (Math.abs(a) > Math.PI / 2) { c.scale(-1, 1); a = Math.PI - a; }
    c.rotate(a); c.drawImage(s, -size / 2 + back, -size / 2, size, size); c.restore();
  }

  cat(c, t, time, ts, ui) {
    const born = Math.min(1, (time - (t._b || (t._b = time))) / .25), pop = born < 1 ? 1 + Math.sin(born * Math.PI) * .25 : 1;
    const breathe = 1 + Math.sin(time * 2.4 + t.id) * .025, rec = t.fireT > 0 ? t.fireT / .14 : 0;
    const sx = pop * (1 + rec * .07), sy = pop * breathe * (1 - rec * .08);
    const blink = ((time * .7 + t.id * .37) % 3.1) < .12;
    if (V_OWNER(this.view) && t.owner !== undefined) { c.strokeStyle = OWNER_COL[t.owner % 4]; c.lineWidth = .05; c.beginPath(); c.ellipse(t.x, t.y + .36, .34, .1, 0, 0, TAU); c.stroke(); }
    const flip = Math.cos(t.angle) < -.2 ? -1 : 1, wp = t.def.look.weapon;
    c.save(); c.translate(t.x, t.y + .42); c.scale(sx * flip * 1.18, sy * 1.18); c.translate(0, -.45);
    if (t.stunT > 0) c.globalAlpha = .65;
    c.drawImage(catSprite(t.cat, ts, blink || t.stunT > 0), -.7, -.7, 1.4, 1.4);
    c.restore();
    if (wp && wp !== 'none') {
      const aims = weaponAims(wp), a = aims ? t.angle : (flip < 0 ? Math.PI + .35 : -.35);
      this.rot(weaponSprite(wp, ts), t.x + flip * .14, t.y + .12, a, 1.6 * 1.18, -rec * .07);
    }
    // Upgrade-Punkte (Farbe = Pfad)
    let n = 0; const tot = t.tiers[0] + t.tiers[1] + t.tiers[2];
    for (let p = 0; p < 3; p++) for (let i = 0; i < t.tiers[p]; i++) { c.fillStyle = OL; c.beginPath(); c.arc(t.x - (tot - 1) * .065 + n * .13, t.y + .46, .06, 0, TAU); c.fill(); c.fillStyle = PATH_COL[p]; c.beginPath(); c.arc(t.x - (tot - 1) * .065 + n * .13, t.y + .46, .042, 0, TAU); c.fill(); n++; }
    if (t.stunT > 0) for (let i = 0; i < 3; i++) { const a = time * 5 + i * TAU / 3; c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(t.x + Math.cos(a) * .25, t.y - .5 + Math.sin(a) * .08, .05, 0, TAU); c.fill(); }
    if (t.tile === 2) { c.strokeStyle = 'rgba(34,211,238,.8)'; c.lineWidth = .04; c.beginPath(); c.arc(t.x, t.y + .1, .45, time * 3, time * 3 + 1.2); c.stroke(); }
    if (t.buff && (t.buff.dmg > 0 || t.buff.rate > 0) && this.set.quality !== 'low') { c.fillStyle = t.buff.dmg > 0 ? '#ff8a3d' : '#6fd15a'; c.beginPath(); c.moveTo(t.x + .32, t.y - .42); c.lineTo(t.x + .4, t.y - .3); c.lineTo(t.x + .24, t.y - .3); c.closePath(); c.fill(); }
  }

  dog(c, e, E, time, frame, ts) {
    const L = e.def.look, size = L.size * (e.mini ? .75 : 1);
    if (e.under) { c.fillStyle = '#7a5a3a'; c.beginPath(); c.ellipse(e.x, e.y + .12, .26, .13, 0, 0, TAU); c.fill(); c.fillStyle = '#5a4028'; c.beginPath(); c.ellipse(e.x + Math.sin(time * 20 + e.id) * .03, e.y + .06, .14, .08, 0, 0, TAU); c.fill(); return; }
    const stealth = E.stealthNow(e), hidden = e.def.stealth || e.phaseT > 0;
    if (e.dx < -.1) e._f = -1; else if (e.dx > .1) e._f = 1;
    const f = e._f || 1, bob = Math.abs(Math.sin(time * 9 + e.id)) * .04 * (e.stunT > 0 ? 0 : 1);
    const spawn = Math.min(1, e.t / .2), sc = 2.05 * size * spawn, hit = e.hitT > 0 ? 1.08 : 1;
    c.globalAlpha = stealth ? .32 : hidden ? .7 : 1;
    c.save(); c.translate(e.x, e.y - bob - .06 * size); c.scale(f * hit, hit);
    c.drawImage(dogSprite(e.type, ts, e.stunT > 0 ? 0 : (frame + e.id) % 4), -sc / 2, -sc / 2, sc, sc);
    c.restore(); c.globalAlpha = 1;
    const top = e.y - .42 * size - .1;
    if (e.shield > 0) { c.strokeStyle = 'rgba(90,209,255,.9)'; c.fillStyle = 'rgba(90,209,255,.18)'; c.lineWidth = .04; c.beginPath(); c.ellipse(e.x, e.y - .02, .44 * size, .4 * size, 0, 0, TAU); c.fill(); c.stroke(); }
    if (e.slowV > 0) { c.fillStyle = 'rgba(160,228,255,.55)'; c.beginPath(); c.ellipse(e.x, e.y + .3 * size, .3 * size, .08 * size, 0, 0, TAU); c.fill(); }
    if (e.burnT > 0 && (frame + e.id) % 2 === 0 && this.set.fx) this.p({ x: e.x + (Math.random() - .5) * .3 * size, y: e.y - .1, vy: -1.2, col: Math.random() < .5 ? '#ffb02e' : '#ff5a36', size: .08, life: .3 });
    if (e.stunT > 0) for (let i = 0; i < 2; i++) { const a = time * 6 + i * Math.PI; c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(e.x + Math.cos(a) * .2 * size, top + Math.sin(a) * .05, .045, 0, TAU); c.fill(); }
    if (e.vulnT > 0 || e.shredT > 0) { c.strokeStyle = e.shredT > 0 ? '#9be04a' : '#ff5d7a'; c.lineWidth = .035; c.beginPath(); c.arc(e.x, e.y + .02, .34 * size, 0, TAU); c.setLineDash([.08, .1]); c.stroke(); c.setLineDash([]); }
    if (e.healT > 0) { c.fillStyle = '#7ae04a'; c.fillRect(e.x - .02, top - .12, .04, .12); c.fillRect(e.x - .06, top - .08, .12, .04); }
    if (e.hasteV > 0) { c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = .03; for (const o of [-.1, .05]) { c.beginPath(); c.moveTo(e.x - f * .35 * size, e.y + o); c.lineTo(e.x - f * .55 * size, e.y + o); c.stroke(); } }
    // Lebensbalken (nur wenn verletzt oder Boss)
    if (e.hp < e.maxHp || e.boss || e.shield > 0) {
      const w = e.boss ? 1.3 : .5 * Math.max(.8, size), h = e.boss ? .11 : .065, x = e.x - w / 2;
      c.fillStyle = OL; c.fillRect(x - .02, top - .02, w + .04, h + .04);
      c.fillStyle = e.boss ? '#ff3b6b' : e.hp / e.maxHp > .5 ? '#7ae04a' : e.hp / e.maxHp > .25 ? '#ffd23f' : '#ff5d5d'; c.fillRect(x, top, w * Math.max(0, e.hp / e.maxHp), h);
      if (e.maxShield > 0 && e.shield > 0) { c.fillStyle = '#5ad1ff'; c.fillRect(x, top - .045, w * e.shield / e.maxShield, .035); }
    }
  }

  projectile(c, p, time) {
    let x = p.x, y = p.y;
    const k = p.kind;
    if (p.arc) { const d = Math.hypot(p.tx - p.x0, p.ty - p.y0) || 1, pr = Math.min(1, Math.hypot(p.x - p.x0, p.y - p.y0) / d), h = Math.sin(pr * Math.PI) * Math.min(1.1, d * .3); c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(x, y + .1, .1, .04, 0, 0, TAU); c.fill(); y -= h; }
    c.strokeStyle = OL; c.lineWidth = .03;
    if (k === 'bomb') { c.fillStyle = '#2c2c36'; c.beginPath(); c.arc(x, y, .12, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#ffb02e'; c.beginPath(); c.arc(x + .08, y - .12, .04, 0, TAU); c.fill(); }
    else if (k === 'flask') { c.fillStyle = '#7ae04a'; c.beginPath(); c.arc(x, y, .1, 0, TAU); c.fill(); c.stroke(); }
    else if (k === 'launcher') { c.save(); c.translate(x, y); c.rotate(p.a); c.fillStyle = '#e8e8f0'; c.beginPath(); c.roundRect(-.16, -.05, .28, .1, .04); c.fill(); c.stroke(); c.fillStyle = '#e2334d'; c.beginPath(); c.moveTo(.12, -.05); c.lineTo(.22, 0); c.lineTo(.12, .05); c.fill(); c.restore(); if (this.set.fx) this.p({ x: x - Math.cos(p.a) * .2, y: y - Math.sin(p.a) * .2, col: Math.random() < .5 ? '#ffb02e' : '#b8b8c4', size: .09, life: .3 }); }
    else if (k === 'shuriken') { c.save(); c.translate(x, y); c.rotate(time * 25); c.fillStyle = '#c9d1dc'; c.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? .04 : .12; c.lineTo(Math.cos(i * TAU / 8) * r, Math.sin(i * TAU / 8) * r); } c.closePath(); c.fill(); c.stroke(); c.restore(); }
    else if (k === 'orb') { c.fillStyle = 'rgba(123,92,255,.4)'; c.beginPath(); c.arc(x, y, .18, 0, TAU); c.fill(); c.fillStyle = '#7df9ff'; c.beginPath(); c.arc(x, y, .08, 0, TAU); c.fill(); }
    else if (k === 'slingshot' || k === 'wrench') { c.fillStyle = k === 'wrench' ? '#aab3c2' : '#8a8f9c'; c.beginPath(); c.arc(x, y, .07, 0, TAU); c.fill(); c.stroke(); }
    else { c.strokeStyle = '#fff3a0'; c.lineWidth = .06; c.beginPath(); c.moveTo(x, y); c.lineTo(x - Math.cos(p.a) * .22, y - Math.sin(p.a) * .22); c.stroke(); }
  }

  particles(c, dt, ts) {
    const P = this.parts; let n = 0;
    for (let i = 0; i < P.length; i++) {
      const q = P[i]; q.life -= dt;
      if (q.life <= 0) { this.pool.push(q); continue; }
      const k = q.life / q.max;
      q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.g * dt;
      if (q.k === 0) { q.vx *= .93; q.vy *= .93; c.globalAlpha = Math.min(1, k * 2); c.fillStyle = q.col; c.beginPath(); c.arc(q.x, q.y, q.size * (.5 + k * .5), 0, TAU); c.fill(); }
      else if (q.k === 1) { const r = q.r * (q.w ? 1 - k * .15 : 1 - k * k * .6); c.globalAlpha = k * .9; c.strokeStyle = q.col; c.lineWidth = .05 + k * .12; c.beginPath(); c.arc(q.x, q.y, r, 0, TAU); c.stroke(); c.globalAlpha = k * .25; c.fillStyle = q.col; c.fill(); }
      else if (q.k === 2) { q.vy *= .94; c.globalAlpha = Math.min(1, k * 2.5); c.font = `900 ${q.size}px ui-rounded, system-ui, sans-serif`; c.textAlign = 'center'; c.lineWidth = q.size * .22; c.strokeStyle = OL; c.strokeText(q.txt, q.x, q.y); c.fillStyle = q.col; c.fillText(q.txt, q.x, q.y); }
      else if (q.k === 3) { c.globalAlpha = k; c.strokeStyle = q.col; c.lineWidth = q.size * (.5 + k); c.beginPath(); c.moveTo(q.pts[0], q.pts[1]); for (let j = 2; j < q.pts.length; j += 2) { if (q.a) { const mx = (q.pts[j - 2] + q.pts[j]) / 2 + (Math.random() - .5) * .3, my = (q.pts[j - 1] + q.pts[j + 1]) / 2 + (Math.random() - .5) * .3; c.lineTo(mx, my); } c.lineTo(q.pts[j], q.pts[j + 1]); } c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = q.size * .35; c.stroke(); }
      else if (q.k === 4) { c.globalAlpha = Math.min(1, k * 2); c.fillStyle = q.col; c.save(); c.translate(q.x, q.y); c.rotate(q.life * 9); c.fillRect(-q.size / 2, -q.size / 4, q.size, q.size / 2); c.restore(); }
      else if (q.k === 5) { const s = 2.6 * (1 + k * .6); c.globalAlpha = Math.min(1, k * 3); c.fillStyle = '#ffb02e'; c.strokeStyle = OL; c.lineWidth = .08; c.beginPath(); c.ellipse(q.x, q.y + .3, s * .32, s * .28, 0, 0, TAU); c.fill(); c.stroke(); for (let j = 0; j < 4; j++) { c.beginPath(); c.ellipse(q.x + (j - 1.5) * s * .2, q.y - s * .16 - (j === 1 || j === 2 ? s * .08 : 0), s * .1, s * .13, 0, 0, TAU); c.fill(); c.stroke(); } }
      P[n++] = q;
    }
    P.length = n; c.globalAlpha = 1;
  }
}
const V_OWNER = v => v.players && v.players.length > 1;

// ---------------------------------------------------------------- Deko-Zeichnungen (Einheit: Feld, Mitte = 0,0)
const circ = (c, x, y, r, f) => { c.fillStyle = f; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.stroke(); };
const box = (c, x, y, w, h, f, r = .04) => { c.fillStyle = f; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); c.stroke(); };
const tri = (c, a, f) => { c.fillStyle = f; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(a[2], a[3]); c.lineTo(a[4], a[5]); c.closePath(); c.fill(); c.stroke(); };
const shadow = c => { c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(0, .36, .36, .1, 0, 0, TAU); c.fill(); };
const DECO = {
  tree(c, s) { shadow(c); box(c, -.07, .0, .14, .38, '#7a4a2a'); circ(c, -.14, -.05, .22, '#3f9a3f'); circ(c, .14, -.02, .2, '#3f9a3f'); circ(c, 0, -.22, .26, s > .5 ? '#55b548' : '#49a844'); },
  pine(c) { shadow(c); box(c, -.06, .15, .12, .22, '#6b4226'); tri(c, [-.34, .2, 0, -.2, .34, .2], '#2f7d3a'); tri(c, [-.27, -.02, 0, -.38, .27, -.02], '#37903f'); tri(c, [-.19, -.22, 0, -.5, .19, -.22], '#41a348'); },
  snowpine(c) { shadow(c); box(c, -.06, .15, .12, .22, '#6b4226'); tri(c, [-.34, .2, 0, -.2, .34, .2], '#3d7f5a'); tri(c, [-.27, -.02, 0, -.38, .27, -.02], '#eaf4fb'); tri(c, [-.19, -.22, 0, -.5, .19, -.22], '#ffffff'); },
  bush(c) { shadow(c); circ(c, -.15, .15, .18, '#4fa64a'); circ(c, .15, .15, .18, '#4fa64a'); circ(c, 0, .02, .22, '#5cb854'); c.fillStyle = '#ff7ab8'; for (const [x, y] of [[-.1, .0], [.12, .1], [0, .2]]) { c.beginPath(); c.arc(x, y, .04, 0, TAU); c.fill(); } },
  flower(c, s) { for (const [x, y] of [[-.2, .1], [.15, -.1], [.05, .25], [-.05, -.2]]) { c.fillStyle = s > .5 ? '#ffd23f' : '#ff7ab8'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(x + Math.cos(i * 1.257) * .06, y + Math.sin(i * 1.257) * .06, .045, 0, TAU); c.fill(); } c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, .035, 0, TAU); c.fill(); } },
  house(c, s) { shadow(c); box(c, -.34, -.08, .68, .46, s > .5 ? '#f7e2c0' : '#dfe8f2'); tri(c, [-.42, -.06, 0, -.46, .42, -.06], s > .66 ? '#c0503a' : s > .33 ? '#4f7fb0' : '#7a5a8a'); box(c, -.08, .12, .16, .26, '#6b4226', .02); box(c, .14, .02, .13, .13, '#bfe6ff', .02); },
  lamp(c) { shadow(c); box(c, -.03, -.3, .06, .66, '#3a3a44', .02); circ(c, 0, -.34, .11, '#ffe680'); },
  crate(c, s) { shadow(c); box(c, -.3, -.24, .6, .6, s > .5 ? '#b98a4a' : '#4f7fb0'); c.beginPath(); c.moveTo(-.3, -.24); c.lineTo(.3, .36); c.moveTo(.3, -.24); c.lineTo(-.3, .36); c.stroke(); },
  tank(c, s) { shadow(c); box(c, -.26, -.34, .52, .7, s > .5 ? '#c9d1dc' : '#7ad0c0', .14); box(c, -.26, -.08, .52, .1, '#5c6470', 0); circ(c, 0, -.34, .08, '#e2334d'); },
  pipe(c) { shadow(c); box(c, -.42, -.05, .84, .26, '#8a929c', .1); box(c, -.12, -.1, .24, .36, '#5c6470', .04); },
  snowman(c) { shadow(c); circ(c, 0, .16, .22, '#fff'); circ(c, 0, -.16, .16, '#fff'); tri(c, [0, -.16, .16, -.12, 0, -.1], '#ff8a3d'); c.fillStyle = OL; for (const x of [-.06, .06]) { c.beginPath(); c.arc(x, -.21, .022, 0, TAU); c.fill(); } },
  cactus(c) { shadow(c); box(c, -.09, -.36, .18, .74, '#4f9a55', .09); box(c, -.3, -.12, .12, .3, '#4f9a55', .06); box(c, -.3, .08, .26, .1, '#4f9a55', .05); box(c, .18, -.24, .12, .28, '#4f9a55', .06); box(c, .06, -.06, .24, .1, '#4f9a55', .05); },
  ruin(c) { shadow(c); box(c, -.34, .2, .68, .16, '#cdb58a', .02); box(c, -.26, -.36, .16, .58, '#dcc79e', .02); box(c, .08, -.14, .16, .36, '#dcc79e', .02); box(c, -.3, -.42, .24, .08, '#cdb58a', .02); },
  rock(c, s) { shadow(c); c.fillStyle = s > .5 ? '#9aa0aa' : '#868c96'; c.beginPath(); c.moveTo(-.34, .34); c.lineTo(-.28, -.02); c.lineTo(-.06, -.24); c.lineTo(.22, -.14); c.lineTo(.36, .34); c.closePath(); c.fill(); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.moveTo(-.18, -.02); c.lineTo(-.04, -.14); c.stroke(); },
  neon(c, s) { shadow(c); box(c, -.28, -.46, .56, .84, '#1c1f3a', .03); c.fillStyle = s > .5 ? '#22d3ee' : '#ff3db8'; for (let y = -.36; y < .3; y += .16) { c.fillRect(-.2, y, .16, .07); c.fillRect(.04, y, .16, .07); } },
  lavarock(c) { shadow(c); c.fillStyle = '#3a2c2a'; c.beginPath(); c.moveTo(-.36, .34); c.lineTo(-.24, -.1); c.lineTo(.02, -.3); c.lineTo(.3, -.06); c.lineTo(.36, .34); c.closePath(); c.fill(); c.stroke(); c.strokeStyle = '#ff6a1a'; c.lineWidth = .05; c.beginPath(); c.moveTo(-.1, -.1); c.lineTo(.0, .1); c.lineTo(-.08, .28); c.moveTo(0, .1); c.lineTo(.16, .18); c.stroke(); },
  deadtree(c) { shadow(c); c.strokeStyle = OL; c.lineWidth = .14; c.beginPath(); c.moveTo(0, .36); c.lineTo(0, -.2); c.moveTo(0, 0); c.lineTo(-.24, -.3); c.moveTo(0, -.1); c.lineTo(.22, -.36); c.stroke(); c.strokeStyle = '#5a4038'; c.lineWidth = .07; c.stroke(); }
};
