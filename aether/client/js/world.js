// Weltansicht: Rendering, Eingabe, Vorhersage eigener Schritte, Interpolation anderer Spieler.
import { MAPS, tileAt, walkable, warpAt } from '../../shared/maps.js';
import { DIRS, STEP_MS } from '../../shared/protocol.js';
import { tile, figure, T } from './art.js';

const VW = 15, VH = 11; // sichtbare Kacheln (Hochformat-tauglich, wird skaliert)

export class WorldView {
  constructor(canvas, net, hud) {
    this.c = canvas; this.g = canvas.getContext('2d'); this.net = net; this.hud = hud;
    this.others = new Map(); this.seq = 0; this.pending = 0; this.held = null; this.frame = 0;
    this.resize(); addEventListener('resize', () => this.resize());
    this.bindInput();
    this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }

  resize() {
    const dpr = devicePixelRatio || 1, r = this.c.parentElement.getBoundingClientRect();
    this.scale = Math.max(1, Math.floor(Math.min(r.width / (VW * T), r.height / (VH * T)) * dpr));
    this.c.width = VW * T * this.scale; this.c.height = VH * T * this.scale;
    this.c.style.width = this.c.width / dpr + 'px'; this.c.style.height = this.c.height / dpr + 'px';
    this.g.imageSmoothingEnabled = false;
  }

  // --- Nachrichten vom Server -------------------------------------------------------------------
  onMessage(m) {
    if (m.t === 'welcome' || m.t === 'warp') {
      this.map = MAPS[m.map]; this.mapKey = m.map;
      this.me = { ...(m.you || this.me), x: m.x, y: m.y, d: m.d, fx: m.x, fy: m.y, moving: null };
      this.others = new Map(m.players.map((p) => [p.id, this.mkOther(p)]));
      this.pending = 0;
      this.hud.place(this.map.name, this.others.size + 1);
    } else if (m.t === 'join') { this.others.set(m.p.id, this.mkOther(m.p)); this.hud.place(this.map.name, this.others.size + 1); }
    else if (m.t === 'leave') { this.others.delete(m.id); this.hud.place(this.map.name, this.others.size + 1); }
    else if (m.t === 'mv') {
      const o = this.others.get(m.id); if (!o) return;
      o.d = m.d;
      if (o.x !== m.x || o.y !== m.y) { o.from = [o.fx, o.fy]; o.x = m.x; o.y = m.y; o.t0 = performance.now(); }
    } else if (m.t === 'ack') {
      this.pending = Math.max(0, this.pending - 1);
      if (!m.ok) { // Server hat abgelehnt → auf echte Position zurücksetzen
        this.me.x = m.x; this.me.y = m.y; this.me.fx = m.x; this.me.fy = m.y; this.me.moving = null; this.pending = 0;
      }
    }
  }
  mkOther(p) { return { ...p, fx: p.x, fy: p.y, from: null, t0: 0 }; }

  // --- Eingabe ------------------------------------------------------------------------------
  bindInput() {
    const K = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r' };
    addEventListener('keydown', (e) => { if (document.activeElement?.tagName === 'INPUT') return; if (K[e.key]) { this.held = K[e.key]; e.preventDefault(); } });
    addEventListener('keyup', (e) => { if (K[e.key] === this.held) this.held = null; });
    for (const b of document.querySelectorAll('[data-dir]')) {
      const d = b.dataset.dir;
      b.addEventListener('pointerdown', (e) => { this.held = d; b.setPointerCapture(e.pointerId); e.preventDefault(); });
      for (const ev of ['pointerup', 'pointercancel']) b.addEventListener(ev, () => { if (this.held === d) this.held = null; });
    }
  }

  tryStep(now) {
    const me = this.me;
    if (!me || me.moving || !this.held || this.pending >= 2) return;
    const d = this.held, [dx, dy] = DIRS[d], nx = me.x + dx, ny = me.y + dy;
    // Antippen dreht nur, Halten läuft (wie in klassischen Handheld-RPGs)
    if (me.d !== d) { me.d = d; this.turnT = now; this.net.send({ t: 'face', d }); return; }
    if (now - (this.turnT || 0) < 90) return;
    if (!walkable(this.map, nx, ny) && !warpAt(this.map, nx, ny)) return;
    me.moving = { from: [me.x, me.y], t0: now }; me.x = nx; me.y = ny;
    this.pending++;
    this.net.send({ t: 'move', d, s: ++this.seq });
  }

  // --- Zeichnen -----------------------------------------------------------------------------
  loop(now) {
    requestAnimationFrame(this.loop);
    if (!this.map) return;
    this.tryStep(now);
    const me = this.me;
    if (me.moving) {
      const k = Math.min(1, (now - me.moving.t0) / STEP_MS);
      me.fx = me.moving.from[0] + (me.x - me.moving.from[0]) * k; me.fy = me.moving.from[1] + (me.y - me.moving.from[1]) * k;
      me.walk = k; if (k >= 1) { me.moving = null; me.steps = (me.steps || 0) + 1; this.tryStep(now); }
    }
    for (const o of this.others.values()) {
      if (!o.from) continue;
      const k = Math.min(1, (now - o.t0) / STEP_MS);
      o.fx = o.from[0] + (o.x - o.from[0]) * k; o.fy = o.from[1] + (o.y - o.from[1]) * k; o.walk = k;
      if (k >= 1) { o.from = null; o.steps = (o.steps || 0) + 1; }
    }
    this.draw(now);
  }

  draw(now) {
    const g = this.g, s = this.scale, me = this.me;
    const camX = me.fx - (VW - 1) / 2, camY = me.fy - (VH - 1) / 2;
    const frame = Math.floor(now / 250) % 4;
    g.setTransform(s, 0, 0, s, 0, 0);
    g.fillStyle = '#1f5a32'; g.fillRect(0, 0, VW * T, VH * T);
    const x0 = Math.floor(camX), y0 = Math.floor(camY);
    const ox = Math.round((x0 - camX) * T * s) / s, oy = Math.round((y0 - camY) * T * s) / s;
    for (let y = -1; y <= VH + 1; y++) for (let x = -1; x <= VW + 1; x++) {
      const mx = x0 + x, my = y0 + y, ch = tileAt(this.map, mx, my);
      g.drawImage(tile(ch, mx, my, frame), ox + x * T, oy + y * T);
    }
    const all = [...this.others.values(), me].sort((a, b) => a.fy - b.fy);
    g.font = '5px sans-serif'; g.textAlign = 'center';
    for (const p of all) {
      const sx = Math.round((p.fx - camX) * T * s) / s, sy = Math.round((p.fy - camY) * T * s) / s;
      const moving = p === me ? !!me.moving : !!p.from;
      const f = moving ? (((p.steps || 0) % 2) * 2 + (p.walk < 0.5 ? 1 : 0)) % 4 : 0;
      g.drawImage(figure(p.look, p.d, moving ? [1, 0, 3, 0][f] : 0), sx, sy - 6);
      // hohes Gras verdeckt die Füße
      if (tileAt(this.map, Math.round(p.fx), Math.round(p.fy)) === ',' && !moving) g.drawImage(tile(',', Math.round(p.fx), Math.round(p.fy)), 0, 10, 16, 6, sx, sy + 10, 16, 6);
      if (p !== me) { g.fillStyle = 'rgba(0,0,0,.55)'; const w = g.measureText(p.name).width + 4; g.fillRect(sx + 8 - w / 2, sy - 13, w, 6); g.fillStyle = '#fff'; g.fillText(p.name, sx + 8, sy - 8.5); }
    }
  }
}
