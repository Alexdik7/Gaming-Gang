// Oberwelt: Kachelbewegung, Kamera, NPCs, Trainer-Sichtlinien, Türen, Begegnungen, Tag/Nacht
import { G, W, H, COL, push, input, text, box, wait, fade, snap } from './engine.js';
import { MAPS, TILE, SOLID, ENC } from './maps.js';
import { charSheet, DIRS, tile, building, drawChar, tallOverlay, itemBall, treeCrown, TREE_KIND, grassFringe, shore, softShadow, cloudShadow, glow } from './pixel.js';
// Untergründe, an deren Rand Gras über Wege/Sand wächst
const GRASSY = new Set('.,:TPrUF'.split(''));
const LANDISH = c => c !== null && c !== '~' && c !== 'B';
// Licht + Vignette einmal vorzeichnen (in halber Auflösung, weich skaliert) statt jeden Frame Verläufe zu berechnen
const LL = {};
function lightLayer(sun) {
  if (LL[sun]) return LL[sun];
  const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2; const x = c.getContext('2d'); x.scale(2, 2);
  if (sun) { const sg = x.createLinearGradient(0, 0, W, H); sg.addColorStop(0, 'rgba(255,240,200,.12)'); sg.addColorStop(0.5, 'rgba(255,240,200,0)'); sg.addColorStop(1, 'rgba(40,30,60,.08)'); x.fillStyle = sg; x.fillRect(0, 0, W, H); }
  const g = x.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.62); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,10,.22)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  return (LL[sun] = c);
}
import { sfx, setMusic } from '../core/audio.js';
import { say, choose } from './gbui.js';
import { monSprite } from './sprites.js';

const DX = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

export class Overworld {
  constructor(game) { this.g = game; this.busy = false; this.banner = null; this.notice = null; this.emote = null; this.ball = itemBall(); this.parts = []; this.prints = []; }

  load(id, x, y, dir) {
    const M = MAPS[id]; this.id = id; this.M = M;
    this.w = M.rows[0].length; this.h = M.rows.length;
    const s = this.g.state; s.map = id;
    this.p = { x, y, dir: dir || s.dir || 'down', px: x * 16, py: y * 16, moving: false, step: 0, turnT: 0, jump: 0 };
    s.surf = !!s.surf && M.rows[y]?.[x] === '~'; this.p.surf = s.surf;
    this.npcs = (M.npcs || []).filter(n => !(n.hideIf && s.flags[n.hideIf]) && !(n.showIf && !s.flags[n.showIf])).map(n => ({ ...n, ox: n.x, oy: n.y, px: n.x * 16, py: n.y * 16, moving: false, wt: 1 + Math.random() * 3, step: 0 }));
    this.items = (M.items || []).filter(i => !s.flags[i.id]);
    s.bpos ||= {};
    this.boulders = (s.bpos[id] || (M.boulders || []).map(b => [...b])).filter(Boolean).map(([bx, by]) => ({ x: bx, y: by }));
    this.blds = M.buildings || [];
    this.banner = (M.outdoor || M.cave || M.banner) ? { t: 2.2, name: M.name } : null;
    this.music();
    this.g.onMapLoad?.(id);
  }
  music() {
    const M = this.M, n = this.g.isNight();
    const town = M.indoor || (M.buildings || []).some(b => b.heal);
    const dungeon = M.cave || M.banner || (M.dark && !M.outdoor);
    setMusic(M.music || (M.gym ? 'gym' : dungeon ? 'cave' : n && M.outdoor ? 'night' : town ? 'town' : 'route'));
  }

  ch(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.M.rows[y][x]; }
  bldAt(x, y) { return this.blds.find(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h); }
  boulderAt(x, y) { return this.boulders?.find(b => b.x === x && b.y === y); }
  holeOpen(x, y) { return this.ch(x, y) === '@' && !this.g.state.flags[`hole:${this.id}:${x},${y}`]; }
  npcAt(x, y) { return this.npcs.find(n => (n.x === x && n.y === y) || (n.moving && n.tx === x && n.ty === y)); }
  solid(x, y, forNpc = false) {
    const c = this.ch(x, y); if (c === null) return true;
    if (SOLID.has(c)) return true;
    if (c === '@' && this.holeOpen(x, y)) return true;
    if (this.boulderAt(x, y)) return true;
    if (c === 'E' && !this.g.state.flags[this.M.gates?.[x + ',' + y]]) return true;
    if (c === 'L') return true;
    const b = this.bldAt(x, y); if (b && !(x === b.x + b.door && y === b.y + b.h - 1)) return true;
    if (forNpc && b) return true;
    if (this.npcAt(x, y)) return true;
    if (this.items.some(i => i.x === x && i.y === y)) return true;
    if (forNpc && ((this.p.x === x && this.p.y === y) || (this.p.moving && this.p.tx === x && this.p.ty === y))) return true;
    if (forNpc && 'mO:'.includes(c)) return true;
    return false;
  }

  // ---------------------------------------------------------- Update
  update(dt) {
    const p = this.p, s = this.g.state;
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
    if (this.notice) { this.notice.t -= dt; if (this.notice.t <= 0) this.notice = null; }
    if (this.emote) { this.emote.t -= dt; if (this.emote.t <= 0) this.emote = null; }
    this.updateNpcs(dt);
    for (const f of this.prints) f.t -= dt; if (this.prints.length && this.prints[0].t <= 0) this.prints = this.prints.filter(f => f.t > 0);
    if (this.rustle) { this.rustle.t -= dt; if (this.rustle.t <= 0) this.rustle = null; }
    for (const q of this.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 30 * dt; q.l -= dt; } this.parts = this.parts.filter(q => q.l > 0);
    if (p.moving) { this.stepMove(dt); return; }
    if (!this.dirty) p.frame = 0;
    this.dirty = false;
    p.px = p.x * 16; p.py = p.y * 16;
    if (this.busy) return;
    if (this.g.online?.idle()) return;
    if (input.pressed('start')) { sfx('open'); this.g.startMenu(); return; }
    if (input.pressed('select')) { this.g.quickTeam?.(); return; }
    if (input.pressed('a')) { this.interact(); return; }
    const d = input.dir();
    if (!d) { p.turnT = 0; return; }
    if (p.dir !== d) { p.dir = d; p.turnT = 0.08; return; }
    if (p.turnT > 0) { p.turnT -= dt; return; }
    this.tryMove(d);
    if (p.moving) {
      this.g.online?.pos();
      // Restzeit des letzten Schritts übernehmen und sofort weiterlaufen → kein Halt zwischen den Feldern
      const carry = this.carry || 0; this.carry = 0;
      if (G.t - (this.arrivedAt || 0) < 0.05) this.stepMove(carry + dt);
    }
  }
  moveDur() { const p = this.p; return p.jump ? 0.42 : p.slide ? 0.1 : (input.held('b') && !this.M.indoor ? 0.13 : 0.22); }
  stepMove(dt) {
    const p = this.p;
    p.t += dt / this.moveDur();
    const k = Math.min(1, p.t);
    p.px = (p.fx + (p.tx - p.fx) * k) * 16; p.py = (p.fy + (p.ty - p.fy) * k) * 16;
    p.hop = p.jump ? Math.sin(k * Math.PI) * 10 : 0;
    // Gang: 4 Phasen pro Feld (Fuß links, Mitte, Fuß rechts, Mitte) und leichtes Wippen
    p.frame = p.slide ? 0 : k > 0.15 && k < 0.65 ? (p.step % 2 ? 1 : 2) : 0;
    p.bob = p.slide || p.jump ? 0 : Math.abs(Math.sin(k * Math.PI)) * 0.67;
    if (k >= 1) {
      this.carry = (p.t - 1) * this.moveDur(); this.arrivedAt = G.t;
      p.moving = false; p.x = p.tx; p.y = p.ty; p.jump = 0; p.hop = 0; p.bob = 0; p.step++; this.arrive();
      // gleich im selben Frame weiter, wenn die Richtung gehalten wird und nichts passiert
      if (!p.moving && !this.busy && input.dir() === p.dir) {
        this.dirty = true;
        // Überschuss schon jetzt anzeigen, damit der Übergang zum nächsten Feld nicht stockt
        const [dx, dy] = DX[p.dir];
        if (!this.solid(p.x + dx, p.y + dy) && this.ch(p.x + dx, p.y + dy) !== null) { const e = (this.carry / this.moveDur()) * 16; p.px += dx * e; p.py += dy * e; }
      }
    }
  }

  tryMove(d) {
    const p = this.p, [dx, dy] = DX[d], nx = p.x + dx, ny = p.y + dy;
    // Kartenrand → Nachbarkarte
    if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) {
      const e = this.M.edges?.[{ up: 'n', down: 's', left: 'w', right: 'e' }[d]];
      if (e) this.edge(e, d, nx, ny); else this.bump();
      return;
    }
    const c = this.ch(nx, ny);
    if (c === 'L' && d === 'down' && !this.solid(nx, ny + 1)) return this.startMove(nx, ny + 1, true);
    // Tür (nur von unten)
    const b = this.bldAt(nx, ny);
    if (b && nx === b.x + b.door && ny === b.y + b.h - 1) { if (d === 'up') return this.enterDoor(b); return this.bump(); }
    if (p.surf && c === '~' && !this.npcAt(nx, ny)) return this.startMove(nx, ny, false);
    const bo = this.boulderAt(nx, ny);
    if (bo) {
      const bx = nx + dx, by = ny + dy, bc = this.ch(bx, by);
      if (bc === null || this.boulderAt(bx, by) || this.npcAt(bx, by) || (SOLID.has(bc)) || bc === '~' || (bc === 'E' && !this.g.state.flags[this.M.gates?.[bx + ',' + by]]) || this.bldAt(bx, by)) return this.bump();
      const s = this.g.state;
      if (this.holeOpen(bx, by)) { s.flags[`hole:${this.id}:${bx},${by}`] = true; this.boulders = this.boulders.filter(b => b !== bo); sfx('faint'); G.shake = 0.6; this.notify('Der Brocken füllt das Loch!'); }
      else { bo.x = bx; bo.y = by; sfx('hit'); G.shake = 0.2; const pf = bc === 'N' && this.M.plates?.[bx + ',' + by]; if (pf && !s.flags[pf]) { s.flags[pf] = true; this.notify('Klick! Irgendwo hat sich ein Tor geöffnet.'); } }
      s.bpos[this.id] = this.boulders.map(b => [b.x, b.y]);
      return;
    }
    if (this.solid(nx, ny)) return this.bump();
    if (this.g.blockMove?.(this.id, nx, ny, d)) return;
    this.startMove(nx, ny, false);
  }
  startMove(tx, ty, jump) {
    this.dust(); const p = this.p; p.moving = true; p.fx = p.x; p.fy = p.y; p.tx = tx; p.ty = ty; p.t = 0; p.jump = jump; if (jump) sfx('whoosh'); }
  // Laufpartikel: Staub auf Wegen/Sand, Halme im hohen Gras, Schnee, Asche
  dust() {
    const p = this.p, c = this.ch(p.x, p.y); if (p.surf || p.slide) return;
    const col = c === '=' || c === 's' || c === '_' || c === 'd' ? ['#d8c090', '#c8ac78'] : c === ':' || c === '%' ? ['#58b048', '#90d868'] : c === 'n' || c === 'y' ? ['#ffffff', '#d8e8f8'] : c === 'a' || c === 'h' ? ['#8a7a68', '#b8a488'] : null;
    if (!col || this.parts.length > 40) return;
    for (let i = 0; i < 3; i++) this.parts.push({ x: p.x * 16 + 5 + Math.random() * 6, y: p.y * 16 + 14, vx: (Math.random() - 0.5) * 14, vy: -10 - Math.random() * 10, c: col[i % 2], l: 0.35, ml: 0.35, sz: 1 });
  }
  bump() { if (G.t - (this.lastBump || 0) > 0.35) { this.lastBump = G.t; sfx('step'); } }

  async arrive() {
    const p = this.p, s = this.g.state, c = this.ch(p.x, p.y);
    s.steps = (s.steps || 0) + 1;
    if ((c === 's' || c === 'd') && !p.surf) { this.prints.push({ x: p.x, y: p.y, dir: p.dir, t: 4 }); if (this.prints.length > 40) this.prints.shift(); }
    if ((c === ':' || c === 'h' || c === 'y' || c === 'f' || c === '%') && !p.surf) {
      this.rustle = { x: p.x, y: p.y, t: 0.32 }; sfx('grass');
      const col = c === 'y' ? ['#ffffff', '#cfe0f0'] : c === 'h' ? ['#8a7a68', '#b0a088'] : c === 'f' ? ['#c8a860', '#a88a48'] : ['#3c9a3c', '#7ad05a'];
      for (let i = 0; i < 5; i++) this.parts.push({ x: p.x * 16 + 3 + Math.random() * 10, y: p.y * 16 + 8 + Math.random() * 4, vx: (Math.random() - 0.5) * 40, vy: -22 - Math.random() * 18, c: col[i % 2], l: 0.4, ml: 0.4, sz: i % 2 ? 2 : 1 });
    }
    this.g.onStep?.();
    if (this.M.indoor && c === 'm') return this.exitInterior();
    const wp = (this.M.warps || []).find(w => w.x === p.x && w.y === p.y);
    if (wp) return this.warp(wp.to, wp.tx, wp.ty, wp.dir);
    // Eis: in Laufrichtung weiterrutschen, bis ein Hindernis kommt
    if (c === 'i') {
      const [dx, dy] = DX[p.dir], nx = p.x + dx, ny = p.y + dy;
      if (nx >= 0 && ny >= 0 && nx < this.w && ny < this.h && !this.solid(nx, ny) && !this.bldAt(nx, ny)) { p.slide = true; this.startMove(nx, ny, false); return; }
    }
    p.slide = false;
    // Druckplatte: öffnet zugehörige Tore
    const pf = c === 'N' && this.M.plates?.[p.x + ',' + p.y];
    if (pf && !s.flags[pf]) { s.flags[pf] = true; sfx('lvl'); G.shake = 0.4; this.notify('Klick! Irgendwo hat sich ein Tor geöffnet.'); }
    if (p.surf && c !== '~') { p.surf = false; s.surf = false; this.music(); }
    if (await this.checkTrainers()) return;
    if (p.surf && this.M.surfEnc) { if (Math.random() < ENC[this.M.surfEnc].rate) await this.g.wildBattle(this.M.surfEnc, 'wasser'); return; }
    const encId = this.M.enc;
    if (encId && ((c === ':' || c === 'h' || c === 'y' || c === 'f' || c === '%') || (this.M.cave && c === 'c'))) {
      if (Math.random() < ENC[encId].rate) await this.g.wildBattle(encId, this.M.cave ? 'hoehle' : this.id === 'altwald' ? 'wald' : this.M.bg || 'gras');
    }
  }

  async edge(e, d, nx, ny) {
    if (this.g.blockEdge?.(this.id, e.to)) return;
    const T = MAPS[e.to], tw = T.rows[0].length, th = T.rows.length;
    let x = nx, y = ny;
    if (d === 'up') { x = nx + (e.dx || 0); y = th - 1; }
    if (d === 'down') { x = nx + (e.dx || 0); y = 0; }
    if (d === 'left') { x = tw - 1; y = ny + (e.dy || 0); }
    if (d === 'right') { x = 0; y = ny + (e.dy || 0); }
    await this.warp(e.to, x, y, d, true);
  }
  async warp(to, x, y, dir, quick) {
    this.busy = true; sfx(quick ? 'step' : 'whoosh');
    await fade(1, quick ? 120 : 220);
    this.load(to, x, y, dir); this.p.dir = dir || this.p.dir;
    await fade(0, quick ? 120 : 220);
    this.busy = false;
    this.g.save(true);
  }
  async enterDoor(b) {
    if (b.lock && !this.g.state.flags[b.lock]) { this.busy = true; await say('Die Tür ist verschlossen. Ein Zettel hängt daran: „Bin bei der Insel im Osten. – Meri“'); this.busy = false; return; }
    const s = this.g.state; s.ret = { map: this.id, x: b.x + b.door, y: b.y + b.h, heal: !!b.heal };
    if (b.heal) s.healPoint = { map: this.id, x: b.x + b.door, y: b.y + b.h };
    const I = MAPS[b.to]; let mx = 0, my = 0;
    I.rows.forEach((r, yy) => { const k = r.indexOf('m'); if (k >= 0 && !mx) { mx = k; my = yy; } });
    sfx('open'); this.busy = true; this.door = { x: b.x + b.door, y: b.y + b.h - 1 };
    await wait(260); this.door = null;
    await this.warp(b.to, mx, my, 'up');
  }
  async exitInterior() { const r = this.g.state.ret || { map: 'moosgrund', x: 4, y: 9 }; await this.warp(r.map, r.x, r.y, 'down'); }

  // ---------------------------------------------------------- NPCs
  updateNpcs(dt) {
    for (const n of this.npcs) {
      if (n.moving) {
        n.t += dt / 0.3; const k = Math.min(1, n.t);
        n.px = (n.x + (n.tx - n.x) * k) * 16; n.py = (n.y + (n.ty - n.y) * k) * 16; n.frame = k > 0.25 && k < 0.75 ? (n.step % 2 ? 1 : 2) : 0;
        if (k >= 1) { n.moving = false; n.x = n.tx; n.y = n.ty; n.step++; n.frame = 0; n.res?.(); }
        continue;
      }
      if (!n.wander || this.busy) continue;
      n.wt -= dt; if (n.wt > 0) continue;
      n.wt = 1.5 + Math.random() * 3;
      const d = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)];
      n.dir = d; const [dx, dy] = DX[d], tx = n.x + dx, ty = n.y + dy;
      if (Math.abs(tx - n.ox) > n.wander || Math.abs(ty - n.oy) > n.wander || this.solid(tx, ty, true)) continue;
      this.npcStep(n, tx, ty);
    }
  }
  npcStep(n, tx, ty) { return new Promise(res => { n.moving = true; n.tx = tx; n.ty = ty; n.t = 0; n.res = res; }); }
  async npcWalkTo(n, x, y) {
    while (n.x !== x || n.y !== y) {
      const dx = Math.sign(x - n.x), dy = Math.sign(y - n.y);
      n.dir = dx ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      await this.npcStep(n, n.x + dx, n.y + (dx ? 0 : dy));
    }
  }

  async checkTrainers() {
    const p = this.p, s = this.g.state;
    for (const n of this.npcs) {
      const tr = n.trainer; if (!tr || s.flags[n.id]) continue;
      const [dx, dy] = DX[n.dir];
      for (let i = 1; i <= (tr.sight || 3); i++) {
        const x = n.x + dx * i, y = n.y + dy * i;
        if (x === p.x && y === p.y) {
          this.busy = true;
          this.emote = { n, t: 0.8 }; sfx('encounter');
          await wait(800);
          await this.npcWalkTo(n, p.x - dx, p.y - dy);
          p.dir = OPP[n.dir];
          await this.g.trainerBattle(n);
          this.busy = false;
          return true;
        }
        const c = this.ch(x, y); if (c === null || SOLID.has(c) || this.npcAt(x, y)) break;
      }
    }
    return false;
  }

  // ---------------------------------------------------------- Interaktion
  async interact() {
    const p = this.p, [dx, dy] = DX[p.dir], fx = p.x + dx, fy = p.y + dy;
    let n = this.npcAt(fx, fy);
    if (!n && this.ch(fx, fy) === 'C') n = this.npcAt(fx + dx, fy + dy);
    const rp = !n && this.g.online?.playerAt(this.id, fx, fy);
    this.busy = true;
    try {
      if (rp) { await this.g.online.interact(rp); return; }
      if (n) { if (!n.trainer || this.g.state.flags[n.id]) n.dir = OPP[p.dir]; await this.g.talk(n); return; }
      const it = this.items.find(i => i.x === fx && i.y === fy);
      if (it) { await this.g.pickup(it); this.items = this.items.filter(i => i !== it); return; }
      const c = this.ch(fx, fy);
      const sign = this.M.signs?.[fx + ',' + fy];
      if (sign) { await say(sign.split('\n').join(' – ')); return; }
      if (c === 'r') { await this.g.rune(this.M.runes[fx + ',' + fy]); return; }
      if (c === 'A') { await this.g.altar(); return; }
      if (c === 'Z') { await this.g.orbs(); return; }
      if (c === 'Q') { await this.g.pc(); return; }
      if (c === 'V') { await say('Im Fernsehen läuft eine Sendung über Kreaturen, die nur nachts erscheinen.'); return; }
      if (c === 'K') { await say(['Ein Regal voller Bücher.', '„Mutationen – Wenn zwei Kreaturen ein Ei teilen“, Band 3…'][Math.floor(Math.random() * 2)]); return; }
      if (c === 'M') { await say('Eine summende Maschine. Lämpchen blinken in allen Farben.'); return; }
      if (c === 'Y' && this.id === 'home') { await this.g.rest(); return; }
      if (c === '~' && !this.p.surf) { await this.g.water(fx, fy); return; }
      if (c === '~' && this.M.fishing !== false) { await this.g.fish(); return; }
      if (c === 'U') { await this.g.berry(fx, fy); return; }
      if (c === 'b') { await say('Ein schwerer Felsbrocken. Er bewegt sich keinen Millimeter.'); return; }
    } finally { this.busy = false; }
  }

  // ---------------------------------------------------------- Wetter (Regen wechselt täglich, Asche am Vulkan, Schnee im Norden)
  weather() {
    if (!this.M.outdoor) return null;
    const W0 = { route3: 'ash', ignis: 'ash', kraterherz: 'ash', route5: 'snow', frostheim: 'snow', frostgipfel: 'snow' };
    if (W0[this.id]) return W0[this.id];
    const day = Math.floor(Date.now() / 864e5), R = ['route1', 'route2', 'altwald', 'route4', 'aqualis', 'route8'], i = R.indexOf(this.id);
    return i >= 0 && (day + i) % 3 === 0 ? 'rain' : null;
  }
  drawWeather(ctx, cx, cy) {
    const w = this.weather(); if (!w) return;
    const t = G.t, md = (v, m) => ((v % m) + m) % m;
    if (w === 'rain') {
      ctx.fillStyle = 'rgba(30,40,70,.18)'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(200,220,255,.55)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i < 80; i++) { const x = md(i * 53.7 - t * 60 - cx, W + 20) - 10, y = md(i * 31.3 + t * 260 - cy, H + 20) - 10; ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 8); }
      ctx.stroke();
      ctx.fillStyle = 'rgba(220,235,255,.6)'; for (let i = 0; i < 14; i++) { const k = md(t * 3 + i * 0.37, 1); if (k > 0.3) continue; ctx.fillRect(md(i * 71.3 + Math.floor(t * 3 + i * 0.37) * 37 - cx, W), md(i * 47.9 + Math.floor(t * 3 + i * 0.37) * 53 - cy, H), 2 + k * 6, 1); }
    } else {
      const ash = w === 'ash', n = ash ? 45 : 60;
      ctx.fillStyle = ash ? 'rgba(210,200,195,.85)' : 'rgba(255,255,255,.9)';
      for (let i = 0; i < n; i++) { const x = md(i * 47.3 + Math.sin(t * 1.3 + i) * 6 + t * (ash ? 8 : -6) - cx, W + 10) - 5, y = md(i * 29.7 + t * (ash ? 16 : 22) * (0.7 + (i % 5) * 0.1) - cy, H + 10) - 5; ctx.fillRect(x, y, i % 3 ? 1.5 : 2.5, i % 3 ? 1.5 : 2); }
      if (ash) { ctx.fillStyle = 'rgba(120,90,80,.12)'; ctx.fillRect(0, 0, W, H); }
    }
  }

  // ---------------------------------------------------------- Zeichnen
  draw(ctx) {
    const p = this.p, mw = this.w * 16, mh = this.h * 16;
    let cx = p.px + 8 - W / 2, cy = p.py + 8 - H / 2;
    cx = mw <= W ? (mw - W) / 2 : Math.max(0, Math.min(mw - W, cx));
    cy = mh <= H ? (mh - H) / 2 : Math.max(0, Math.min(mh - H, cy));
    cx = snap(cx); cy = snap(cy);
    this.cam = { x: cx, y: cy };
    const f2 = Math.floor(G.t * 2) % 2, f3 = Math.floor(G.t * 2.5) % 3;
    const flags = this.g.worldFlags();
    const runesOn = Object.values(this.M.runes || {}).filter(r => flags[r]).length;
    const x0 = Math.floor(cx / 16), y0 = Math.floor(cy / 16), crowns = [], rocks = [];
    for (let y = y0; y <= y0 + 11; y++) for (let x = x0; x <= x0 + 15; x++) {
      const c = this.ch(x, y); if (c === null) continue;
      let name = TILE[c] || 'void', fr = 0;
      if (c === '~' || c === 'v') fr = f3; else if (c === ',' || c === ':' || c === 'h' || c === 'y' || c === 'f' || c === '%' || c === 'N' || c === 'e' || c === 'V' || c === 'M' || c === 'Q') fr = f2;
      if (c === 'r') { const id = this.M.runes?.[x + ',' + y]; if (flags[id]) { name = 'runeOn'; fr = f2; } }
      if (c === 'A') fr = runesOn >= 3 ? f2 : 0;
      if (c === 'R' && this.M.cave) name = 'crock';
      if (c === 'E' && flags[this.M.gates?.[x + ',' + y]]) name = 'gateOpen';
      if (c === 'N' && flags[this.M.plates?.[x + ',' + y]]) name = 'plateOn';
      if (c === '@' && flags[`hole:${this.id}:${x},${y}`]) name = 'holeFilled';
      const v = (x * 7 + y * 13) % 5;
      ctx.drawImage(tile(name, fr, v), x * 16 - cx, y * 16 - cy);
      // Übergänge: Gras über Weg-/Sandränder, Schaum am Ufer
      if (c === '=' || c === 's') {
        for (const [sd, nx, ny] of [['n', x, y - 1], ['s', x, y + 1], ['w', x - 1, y], ['e', x + 1, y]]) if (GRASSY.has(this.ch(nx, ny))) ctx.drawImage(grassFringe(sd, 'green', (x + y) % 3), x * 16 - cx, y * 16 - cy);
      } else if (c === '~') {
        for (const [sd, nx, ny] of [['n', x, y - 1], ['s', x, y + 1], ['w', x - 1, y], ['e', x + 1, y]]) if (LANDISH(this.ch(nx, ny))) ctx.drawImage(shore(sd, f2), x * 16 - cx, y * 16 - cy);
      }
      if (TREE_KIND[c]) crowns.push([TREE_KIND[c], x, y, v % 3]);
      else if ((c === 'R' || c === 'q') && !this.M.indoor) rocks.push([x, y]);
    }
    // Schatten: Bäume und Felsen werfen weiche Schatten nach rechts unten
    for (const [, x, y] of crowns) ctx.drawImage(softShadow(20, 8), x * 16 - cx + 4, y * 16 - cy + 11);
    for (const [x, y] of rocks) ctx.drawImage(softShadow(16, 6), x * 16 - cx + 3, y * 16 - cy + 12);
    const night = this.g.isNight();
    for (const b of this.blds) { const bx = b.x * 16 - cx, by = b.y * 16 - cy; ctx.fillStyle = 'rgba(10,20,40,.2)'; ctx.fillRect(bx + b.w * 16, by + 8, 4, b.h * 16 - 6); ctx.fillRect(bx + 4, by + b.h * 16, b.w * 16, 3); }
    for (const b of this.blds) ctx.drawImage(building({ ...b, night }), b.x * 16 - cx, b.y * 16 - cy);
    for (const b of this.boulders || []) ctx.drawImage(tile('rockTop'), b.x * 16 - cx, b.y * 16 - cy);
    for (const i of this.items) ctx.drawImage(this.ball, i.x * 16 - cx, i.y * 16 - cy - Math.round(Math.sin(G.t * 3 + i.x) * 1));
    // geöffnete Tür
    if (this.door) { const dx = this.door.x * 16 - cx, dy = this.door.y * 16 - cy; ctx.fillStyle = '#28202c'; ctx.fillRect(dx + 3, dy + 3, 10, 13); ctx.fillStyle = '#100c14'; ctx.fillRect(dx + 4, dy + 4, 8, 12); ctx.fillStyle = 'rgba(255,220,150,.25)'; ctx.fillRect(dx + 4, dy + 13, 8, 3); }
    // Fußspuren im Sand
    for (const f of this.prints) {
      ctx.fillStyle = `rgba(100,70,35,${Math.min(1, f.t / 1.5) * 0.55})`; const bx = f.x * 16 - cx, by = f.y * 16 - cy;
      if (f.dir === 'up' || f.dir === 'down') { ctx.fillRect(bx + 5, by + 5, 2, 3); ctx.fillRect(bx + 9, by + 9, 2, 3); } else { ctx.fillRect(bx + 4, by + 6, 3, 2); ctx.fillRect(bx + 9, by + 9, 3, 2); }
    }
    // Figuren nach y sortiert
    const actors = [...this.npcs.map(n => ({ mon: n.mon, look: n.look, dir: n.dir, frame: n.frame || 0, px: n.px, py: n.py, x: n.moving ? n.tx : n.x, y: n.moving ? n.ty : n.y })),
      { look: this.g.state.look, dir: p.dir, frame: p.frame, hop: p.hop || 0, px: p.px, py: p.py - (p.hop || 0) - (p.bob || 0), x: p.moving ? p.tx : p.x, y: p.moving ? p.ty : p.y, me: true },
      ...(this.g.remoteActors?.(this.id) || [])];
    actors.sort((a, b) => a.py - b.py);
    for (const a of actors) {
      if (a.me && p.surf) { const sm = this.g.surfMon?.(); const bob = Math.round(Math.sin(G.t * 4)); if (sm) ctx.drawImage(monSprite(sm.sp, 'icon', sm.shiny, sm.mut), a.px - cx - 8, a.py - cy - 6 + bob); drawChar(ctx, a.look, a.dir, 0, a.px - cx, a.py - cy - 7 + bob); continue; }
      if (a.mon) ctx.drawImage(monSprite(a.mon, 'icon'), a.px - cx - 8, a.py - cy - 16 + Math.round(Math.sin(G.t * 2) * 1));
      else {
        if (this.ch(a.x, a.y + 1) === '~') { // Spiegelung im Wasser
          const wx = a.x * 16 - cx, wy = (a.y + 1) * 16 - cy;
          ctx.save(); ctx.beginPath(); ctx.rect(wx - 2, wy, 20, 16); ctx.clip(); ctx.globalAlpha = 0.35 + Math.sin(G.t * 3) * 0.04;
          ctx.translate(Math.round(a.px - cx) + Math.round(Math.sin(G.t * 2.5 + a.x)), wy * 2 - 2); ctx.scale(1, -1);
          ctx.drawImage(charSheet(a.look), (a.frame || 0) * 16, DIRS.indexOf(a.dir) * 24, 16, 24, 0, Math.round(a.py - cy) - 9, 16, 24); ctx.restore();
        }
        drawChar(ctx, a.look, a.dir, a.frame, a.px - cx, a.py - cy, a.hop || 0);
      }
      { const tc = this.ch(a.x, a.y); if ((tc === ':' || tc === 'h' || tc === 'y' || tc === 'f' || tc === '%') && !(a.me && p.jump)) { const rs = a.me && this.rustle ? Math.round(Math.sin(this.rustle.t * 45) * 1.4) : 0; ctx.drawImage(tallOverlay(f2, tc === 'h' ? 'ash' : tc === 'y' ? 'snow' : tc === 'f' ? 'dry' : tc === '%' ? 'mount' : 'green'), a.px - cx + rs, a.py - cy + 8 - Math.abs(rs)); } }
      if (a.name) { const w = a.name.length * 4.2 + 6; ctx.fillStyle = 'rgba(20,40,80,.8)'; ctx.fillRect(a.px - cx + 8 - w / 2, a.py - cy - 19, w, 8); text(a.name, a.px - cx + 8, a.py - cy - 18.5, '#ffd36b', 6, 'center', null); }
    }
    // Baumkronen über den Figuren: wer hinter einem Baum steht, verschwindet halb im Laub
    for (const [k, x, y, v] of crowns) ctx.drawImage(treeCrown(k, v), x * 16 - cx, y * 16 - cy - 8);
    // Staub- und Grasteilchen
    for (const q of this.parts) { ctx.globalAlpha = Math.max(0, q.l / q.ml); ctx.fillStyle = q.c; ctx.fillRect(q.x - cx, q.y - cy, q.sz, q.sz); }
    ctx.globalAlpha = 1;
    // Ziehende Wolkenschatten (draußen, tagsüber)
    if (this.M.outdoor && !night && !this.M.night && !this.M.sandstorm) {
      const cl = cloudShadow(), span = mw + 320;
      for (let i = 0; i < 3; i++) { const wx = ((i * 260 + G.t * (5 + i * 2)) % span) - 160, wy = ((i * 173) % Math.max(1, mh)) - 30; ctx.drawImage(cl, wx - cx, wy - cy); }
    }
    this.drawWeather(ctx, cx, cy);
    if (this.emote) {
      const n = this.emote.n, x = n.px - cx + 4, y = n.py - cy - 22;
      ctx.fillStyle = '#28202c'; ctx.fillRect(x - 1, y - 1, 10, 12); ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 8, 10); text('!', x + 4, y + 0.5, '#e84a5f', 9, 'center', null, true);
    }
    // Tag/Nacht
    if (this.M.outdoor || this.M.cave || this.M.night) {
      const dark = (night ? 0.45 : this.g.dusk() * 0.25) + (this.M.dark || 0) + (this.M.cave ? 0.15 : 0);
      if (this.M.night && !this.M.darkRadius) { ctx.fillStyle = 'rgba(10,8,34,.38)'; ctx.fillRect(0, 0, W, H); }
      if (dark > 0) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(${night ? '40,50,120' : '120,80,90'},${Math.min(0.7, dark)})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
    }
    // Nachts leuchten Fenster und werfen Licht auf den Boden; Glühwürmchen über Wiesen
    if ((night || this.M.night) && this.M.outdoor) {
      ctx.globalCompositeOperation = 'lighter';
      for (const b of this.blds) {
        const wallY = (b.h - 2) * 16 + 4;
        for (let i = 0; i < b.w; i++) {
          if (i === b.door || !(i === 0 || i === b.w - 1 || (b.w > 4 && i % 2 === 0))) continue;
          const gx = b.x * 16 + i * 16 + 8 - cx, gy = b.y * 16 + wallY + 10 - cy;
          ctx.drawImage(glow(14), gx - 14, gy - 14); ctx.drawImage(glow(10), gx - 10, b.y * 16 + b.h * 16 + 2 - cy - 10);
        }
      }
      if (!this.M.cave) for (let i = 0; i < 14; i++) {
        const fx = ((i * 97 + Math.sin(G.t * 0.5 + i) * 30) % (W + 20)) - 10, fy = ((i * 61 + Math.cos(G.t * 0.4 + i * 2) * 20) % (H + 10)) - 5, on = (Math.sin(G.t * 2 + i * 1.7) + 1) / 2;
        ctx.globalAlpha = on; ctx.drawImage(glow(4, '200,255,120'), fx - 4, fy - 4); ctx.fillStyle = '#f8ffb0'; ctx.fillRect(fx, fy, 1, 1);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    // Sonnenlicht von oben links und sanfte Vignette → mehr Tiefe
    ctx.drawImage(lightLayer(this.M.outdoor && !night && !this.M.night), 0, 0, W, H);
    // Sandsturm: wehende Sandschleier
    if (this.M.sandstorm) {
      const gust = 0.24 + Math.sin(G.t * 0.7) * 0.08;
      ctx.fillStyle = `rgba(226,186,110,${gust})`; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 110; i++) {
        const sp = 150 + (i % 7) * 35, x = ((i * 53 + G.t * sp) % (W + 60)) - 30, y = ((i * 37 + Math.sin(G.t * 2 + i) * 8) % H);
        ctx.fillStyle = i % 3 ? 'rgba(255,236,180,.75)' : 'rgba(176,126,60,.6)'; ctx.fillRect(x, y, 8 + (i % 5) * 3, 1);
        if (i % 9 === 0) ctx.fillRect(x + 4, y + 1, 4, 1);
      }
    }
    // Dunkelheit mit Lichtkreis um den Spieler (Ruinen, Schatten-Arena)
    if (this.M.darkRadius) {
      const L = (this.lightCv ||= Object.assign(document.createElement('canvas'), { width: W, height: H })), lx = L.getContext('2d');
      lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, W, H); lx.fillStyle = 'rgba(6,4,16,.96)'; lx.fillRect(0, 0, W, H);
      const px = p.px - cx + 8, py = p.py - cy + 6, r = this.M.darkRadius + Math.sin(G.t * 3) * 1.5;
      const gr = lx.createRadialGradient(px, py, r * 0.45, px, py, r);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      lx.globalCompositeOperation = 'destination-out'; lx.fillStyle = gr; lx.beginPath(); lx.arc(px, py, r, 0, 7); lx.fill();
      ctx.drawImage(L, 0, 0);
    }
    if (this.banner) {
      const k = Math.min(1, this.banner.t * 3, (2.2 - this.banner.t) * 4);
      box(4, -20 + 26 * k, 96, 20, 'default');
      text(this.banner.name, 52, -14 + 26 * k, COL.ink, 8.5, 'center', COL.shadow, true);
    }
    if (this.notice) { box(20, 4, 200, 20, 'gold'); text(this.notice.text, 120, 10, COL.ink, 7.5, 'center', null, true); }
  }
  notify(t) { this.notice = { text: t, t: 3.5 }; sfx('lvl'); }
}
