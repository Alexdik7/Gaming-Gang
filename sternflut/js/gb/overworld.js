// Oberwelt: Kachelbewegung, Kamera, NPCs, Trainer-Sichtlinien, Türen, Begegnungen, Tag/Nacht
import { G, W, H, VH, COL, push, input, text, box, wait, fade, snap } from './engine.js';
import { MAPS, TILE, SOLID, ENC } from './maps.js';
import { drawDigActor } from './dig.js';
import { standArt, charSheet, DIRS, tile, building, drawChar, tallOverlay, itemBall, treeCrown, TREE_KIND, grassFringe, shore, softShadow, cloudShadow, glow } from './pixel.js';
// Untergründe, an deren Rand Gras über Wege/Sand wächst
const GRASSY = new Set('.,:TPrUF'.split(''));
const LANDISH = c => c !== null && c !== '~' && c !== 'B';
// Licht + Vignette einmal vorzeichnen (in halber Auflösung, weich skaliert) statt jeden Frame Verläufe zu berechnen
const LL = {};
// rote Silhouette (Umriss der Alpha-Kreaturen), einmal pro Art erzeugt
const RED = new Map();
function redSil(sp, img, col = '#ff2a2a') {
  const key = sp + col; if (RED.has(key)) return RED.get(key);
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d');
  x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  RED.set(key, c); return c;
}
function lightLayer(sun) {
  const key = sun + ':' + VH; if (LL[key]) return LL[key];
  const c = document.createElement('canvas'); c.width = W * 2; c.height = VH * 2; const x = c.getContext('2d'); x.scale(2, 2);
  if (sun) { const sg = x.createLinearGradient(0, 0, W, VH); sg.addColorStop(0, 'rgba(255,240,200,.12)'); sg.addColorStop(0.5, 'rgba(255,240,200,0)'); sg.addColorStop(1, 'rgba(40,30,60,.08)'); x.fillStyle = sg; x.fillRect(0, 0, W, VH); }
  const g = x.createRadialGradient(W / 2, VH / 2, Math.min(W, VH) * 0.45, W / 2, VH / 2, Math.max(W, VH) * 0.62); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,10,.22)'); x.fillStyle = g; x.fillRect(0, 0, W, VH);
  return (LL[key] = c);
}
import { sfx, setMusic } from '../core/audio.js';
import { say, choose } from './gbui.js';
import { monSprite } from './sprites.js';
import { SPECIES } from '../data/creatures.js';
import { baseSpots, drawSpot, drawDecor, decorAt, DECOR } from './base.js';

const DX = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

export class Overworld {
  constructor(game) { this.tall = true; this.g = game; this.busy = false; this.banner = null; this.notice = null; this.emote = null; this.ball = itemBall(); this.parts = []; this.prints = []; }

  load(id, x, y, dir) {
    const M = MAPS[id]; this.id = id; this.M = M;
    this.w = M.rows[0].length; this.h = M.rows.length;
    const s = this.g.state; s.map = id;
    this.p = { x, y, dir: dir || s.dir || 'down', px: x * 16, py: y * 16, moving: false, step: 0, turnT: 0, jump: 0, ride: M.outdoor && !M.cave ? s.ride || null : null };
    s.surf = !!s.surf && M.rows[y]?.[x] === '~'; this.p.surf = s.surf;
    this.npcs = (M.npcs || []).filter(n => !(n.hideIf && s.flags[n.hideIf]) && !(n.showIf && !s.flags[n.showIf])).map(n => ({ ...n, ox: n.x, oy: n.y, px: n.x * 16, py: n.y * 16, moving: false, wt: 1 + Math.random() * 3, step: 0 }));
    this.items = (M.items || []).filter(i => !s.flags[i.id] && i.item !== 'ball52');
    // 52-Bälle liegen unsichtbar und erscheinen erst mit genug Orden bzw. als Champion
    const nb = (s.badges || []).filter(Boolean).length;
    this.secret = (M.items || []).filter(i => i.item === 'ball52' && !s.flags[i.id] && (i.need === 'champion' ? s.flags.champion : nb >= (i.need || 0)));
    s.bpos ||= {};
    if (M.bReset && ![M.bReset].flat().every(f => s.flags[f])) delete s.bpos[id]; // Rätsel ungelöst: Brocken beim Betreten zurück an den Start (kein Festsitzen)
    this.boulders = (s.bpos[id] || (M.boulders || []).map(b => [...b])).filter(Boolean).map(([bx, by]) => ({ x: bx, y: by }));
    this.blds = M.buildings || [];
    // Steckt die Figur in einer Wand (alter Fehler, umgebaute Karte o. Ä.), auf das nächste freie Feld setzen
    this.cleared = new Map();
    this.tideLow = M.tide ? !!this.g.tideLow?.() : undefined;
    // Bei Flut auf der Gezeiteninsel: ein Fischerboot bringt dich an den Strand
    const TR = M.tideRefuge; if (TR && !this.tideLow && x >= TR[0] && y >= TR[1] && x <= TR[2] && y <= TR[3]) { [x, y] = M.tideSafe; this.p.x = x; this.p.y = y; this.p.px = x * 16; this.p.py = y * 16; setTimeout(() => this.notify('Flut! Ein Fischerboot hat dich zurück an den Strand gebracht.'), 400); }
    if (this.wallAt(x, y)) {
      const seen = new Set([x + ',' + y]), q = [[x, y]]; let first = null;
      while (q.length) {
        const [cx, cy] = q.shift();
        if (!first && !this.wallAt(cx, cy)) first = [cx, cy];
        if (!this.wallAt(cx, cy) && !(M.warps || []).some(w => w.x === cx && w.y === cy) && this.canLeave(cx, cy)) { x = cx; y = cy; break; }
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const nx = cx + dx, ny = cy + dy, k = nx + ',' + ny; if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h || seen.has(k)) continue; seen.add(k); q.push([nx, ny]); }
      }
      if (this.wallAt(x, y) && first) [x, y] = first;
      Object.assign(this.p, { x, y, px: x * 16, py: y * 16 });
    }
    this.trail = null;
    this.cleared = new Map(); this.heavyHint = false; this.revealed = false; this.flashLit = 0; this.springUsed = false; this.fTalked = false;
    this.f = { x, y, px: x * 16, py: y * 16, fx: x, fy: y, tx: x, ty: y, dir: this.p.dir, vis: false };
    this.hidden = this.genHidden(id, M).filter(h => !s.flags[h.id]);
    // Alpha-Kreatur des Tages auf dieser Route (im hohen Gras oder auf freier Fläche)
    const A = this.g.alphaFor?.(id);
    if (A) {
      let h = A.seed; const rnd = () => ((h = (h * 1103515245 + 12345) >>> 0) / 4294967296);
      for (let t = 0; t < 400; t++) {
        const ax = 2 + Math.floor(rnd() * (this.w - 4)), ay = 2 + Math.floor(rnd() * (this.h - 4));
        if (!(t < 250 ? '.,' : ':.,').includes(M.rows[ay][ax]) || this.solid(ax, ay, true) || Math.abs(ax - x) + Math.abs(ay - y) < 5) continue;
        this.npcs.push({ id: 'alpha', alpha: A, mon: A.sp, x: ax, y: ay, ox: ax, oy: ay, px: ax * 16, py: ay * 16, dir: 'down', moving: false, wander: 2, wt: 1 + rnd() * 2, step: 0 });
        this.notify(`Ein ALPHA-${SPECIES[A.sp].name} streift hier umher!`);
        break;
      }
    }
    // Revierkreaturen (täglich neu, Story-Reviere bleiben bis zum Sieg) und scheue Kreaturen zum Füttern
    { const day = Math.floor(Date.now() / 864e5);
      for (const R of M.revier || []) {
        if ((R.showIf && !s.flags[R.showIf]) || (R.hideIf && s.flags[R.hideIf]) || (!R.story && s.flags[`rv:${day}:${R.id}`])) continue;
        this.npcs.push({ id: 'rv_' + R.id, revier: R, mon: R.sp, x: R.x, y: R.y, ox: R.x, oy: R.y, px: R.x * 16, py: R.y * 16, dir: 'down', moving: false, wander: R.story ? 0 : 1, wt: 2, step: 0 });
      }
      for (const S of M.shy || []) {
        if (s.flags['shy_' + S.id] || s.flags[`shyFled:${day}:${S.id}`]) continue;
        this.npcs.push({ id: 'sh_' + S.id, shy: S, mon: S.sp, x: S.x, y: S.y, ox: S.x, oy: S.y, px: S.x * 16, py: S.y * 16, dir: 'down', moving: false, wander: 1, wt: 3, step: 0 });
      } }
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

  ch(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null; const c = this.M.tide && this.tideLow && this.M.tide.includes(x + ',' + y) ? 's' : this.M.rows[y][x]; return (c === '$' || c === '&') && this.cleared?.has(x + ',' + y) ? this.cleared.get(x + ',' + y) : c; }
  // versteckte Gegenstände: je Route zwei feste, unsichtbare Fundorte (Erd-/Metall-Fähigkeit zeigt sie an)
  genHidden(id, M) {
    if (!M.outdoor || !M.enc) return [];
    let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => ((h = (h * 1103515245 + 12345) >>> 0) / 4294967296), out = [];
    const POOL = ['heilbeere', 'trank', 'kristall', 'klarbeere', 'supertrank', 'sternkristall', 'sonderbonbon', 'heilbeere'];
    const busy = new Set([...(M.npcs || []), ...(M.items || [])].map(o => o.x + ',' + o.y));
    for (let tries = 0; tries < 200 && out.length < 2; tries++) {
      const x = 1 + Math.floor(rnd() * (this.w - 2)), y = 1 + Math.floor(rnd() * (this.h - 2)), c = M.rows[y][x];
      if (!'.,=sna'.includes(c) || busy.has(x + ',' + y) || this.bldAt?.(x, y) || (M.buildings || []).some(b => x >= b.x && x < b.x + b.w && y >= b.y && y <= b.y + b.h)) continue;
      busy.add(x + ',' + y); out.push({ id: `hid:${id}:${out.length}`, x, y, item: POOL[Math.floor(rnd() * POOL.length)], n: 1 });
    }
    return out;
  }
  bldAt(x, y) { return this.blds.find(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h); }
  // Tor offen? Wert ist ein Flag oder eine Liste von Flags (dann müssen alle gesetzt sein)
  gateOpen(x, y) { const f = this.M.gates?.[x + ',' + y], F = this.g.state.flags; return Array.isArray(f) ? f.every(k => F[k]) : !!F[f]; }
  plateMsg(pf) { const multi = Object.values(this.M.gates || {}).find(v => Array.isArray(v) && v.includes(pf)); if (!multi) return 'Klick! Irgendwo hat sich ein Tor geöffnet.'; const n = multi.filter(k => this.g.state.flags[k]).length; return n < multi.length ? `Klick! ${n} von ${multi.length} Schaltern aktiv.` : 'Klick! Alle Schalter aktiv – das Tor öffnet sich!'; }
  boulderAt(x, y) { return this.boulders?.find(b => b.x === x && b.y === y); }
  holeOpen(x, y) { return this.ch(x, y) === '@' && !this.g.state.flags[`hole:${this.id}:${x},${y}`]; }
  npcAt(x, y) { return this.npcs.find(n => (n.x === x && n.y === y) || (n.moving && n.tx === x && n.ty === y)); }
  // Kommt man von (x,y) zu einem Ausgang (Warp, Fußmatte, Tür, Kartenrand)? Verhindert, dass die Rettung hinter ein Tor setzt.
  canLeave(x, y) {
    const M = this.M, seen = new Set([x + ',' + y]), q = [[x, y]];
    if (!M.warps?.length && !M.indoor && !this.blds.length && !Object.keys(M.edges || {}).length) return true;
    while (q.length) {
      const [cx, cy] = q.shift(), c = this.ch(cx, cy);
      if ((M.warps || []).some(w => Math.abs(w.x - cx) + Math.abs(w.y - cy) <= 1) || (M.indoor && c === 'm') || this.bldAt(cx, cy) && !this.wallAt(cx, cy)) return true;
      if (M.edges && (cx === 0 || cy === 0 || cx === this.w - 1 || cy === this.h - 1)) return true;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const nx = cx + dx, ny = cy + dy, k = nx + ',' + ny; if (seen.has(k) || this.wallAt(nx, ny)) continue; seen.add(k); q.push([nx, ny]); }
    }
    return false;
  }
  // nur feste Umgebung (Wände, Gebäude, Tore, Felsen) – ohne Personen und Gegenstände
  wallAt(x, y) {
    const c = this.ch(x, y); if (c === null) return true;
    if (c === '~') return !this.p?.surf;
    if (SOLID.has(c) || c === 'L' || this.boulderAt(x, y)) return true;
    if (c === 'E' && !this.gateOpen(x, y)) return true;
    if (c === 'v' && this.M.gym) return true; // Lava in Arenen ist unbetretbar
    if (this.M.decor) { const d = decorAt(this.M.decor, x, y); if (d && DECOR[d.d].solid) return true; }
    if (this.M.props?.some(q => y === q.y && x >= q.x && x <= q.x + 1)) return true;
    const b = this.bldAt(x, y); return !!b && !(x === b.x + b.door && y === b.y + b.h - 1);
  }
  solid(x, y, forNpc = false) {
    const c = this.ch(x, y); if (c === null) return true;
    if (SOLID.has(c)) return true;
    if (c === '@' && this.holeOpen(x, y)) return true;
    if (this.boulderAt(x, y)) return true;
    if (this.M.decor) { const d = decorAt(this.M.decor, x, y); if (d && DECOR[d.d].solid) return true; }
    if (this.M.props?.some(q => y === q.y && x >= q.x && x <= q.x + 1)) return true;
    if (c === 'E' && !this.gateOpen(x, y)) return true;
    if (c === 'v' && this.M.gym) return true;
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
    // Ebbe und Flut: Sandbänke tauchen auf und verschwinden (alle 3 Spielstunden)
    if (this.M.tide) { const low = !!this.g.tideLow?.(); if (low !== this.tideLow) { const first = this.tideLow === undefined; this.tideLow = low; if (!first) { this.notify(low ? 'Ebbe! Das Wasser zieht sich zurück.' : 'Die Flut kommt! Die Sandbank verschwindet.'); const TR = this.M.tideRefuge, onIsle = TR && this.p.x >= TR[0] && this.p.y >= TR[1] && this.p.x <= TR[2] && this.p.y <= TR[3]; if (!low && !this.p.moving && (onIsle || this.wallAt(this.p.x, this.p.y))) this.load(this.id, this.p.x, this.p.y, this.p.dir); } } }
    const p = this.p, s = this.g.state;
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
    // Mitläufer: stellt sich hinter den Rücken des Spielers und schaut ihn an
    { const F = this.f, p = this.p;
      if (F?.vis && !p.surf) {
        if (F.anim) { const A = F.anim; A.t = Math.min(1, A.t + dt / 0.24); F.px = (A.fx + (A.tx - A.fx) * A.t) * 16; F.py = (A.fy + (A.ty - A.fy) * A.t) * 16; F.k = A.t; if (A.t >= 1) { F.x = A.tx; F.y = A.ty; F.anim = null; } }
        else if (!p.moving && !this.busy) {
          const [dx, dy] = DX[p.dir], bx = p.x - dx, by = p.y - dy;
          if (F.x !== bx || F.y !== by) {
            F.idle = (F.idle || 0) + dt;
            if (F.idle > 0.45 && !this.solid(bx, by, true) && this.ch(bx, by) !== '~' && !this.bldAt(bx, by)) { F.anim = { t: 0, fx: F.x, fy: F.y, tx: bx, ty: by }; F.idle = 0; }
          } else F.idle = 0;
        } else F.idle = 0;
        // Blickrichtung: beim Laufen in die eigene Laufrichtung, im Stand wie der Spieler (Blick auf seinen Rücken)
        const A = F.anim, mx = A ? A.tx - A.fx : p.moving ? F.tx - F.fx : 0, my = A ? A.ty - A.fy : p.moving ? F.ty - F.fy : 0;
        if (mx || my) F.dir = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 'right' : 'left') : (my > 0 ? 'down' : 'up');
        else if (!p.moving) { const [dx, dy] = DX[p.dir]; F.dir = F.x === p.x - dx && F.y === p.y - dy ? p.dir : (Math.abs(p.x - F.x) > Math.abs(p.y - F.y) ? (p.x > F.x ? 'right' : 'left') : (p.y > F.y ? 'down' : 'up')); }
      } }
    // Zwischensequenz: Kinobalken + Kameraschwenk; endet von selbst, sobald die Steuerung frei ist
    if (this.cine) { const C = this.cine; if (!this.busy) C.on = false; const mv = (v, to, sp) => (v < to ? Math.min(to, v + sp * dt) : Math.max(to, v - sp * dt)); C.b = mv(C.b, C.on ? 1 : 0, 2.6); C.k = mv(C.k, C.on && C.focus ? 1 : 0, 1.5); if (!C.on && C.b === 0 && C.k === 0) this.cine = null; }
    if (this.notice) { this.notice.t -= dt; if (this.notice.t <= 0) this.notice = null; }
    if (this.fEmote) this.fEmote.t -= dt;
    if (this.emote) { this.emote.t -= dt; if (this.emote.t <= 0) this.emote = null; }
    this.updateNpcs(dt);
    for (const f of this.prints) f.t -= dt; if (this.prints.length && this.prints[0].t <= 0) this.prints = this.prints.filter(f => f.t > 0);
    if (this.rustle) { this.rustle.t -= dt; if (this.rustle.t <= 0) this.rustle = null; }
    if (this.trail) { const T = this.trail; T.pt -= dt; if (T.pt <= 0) { T.pt = 0.5 + Math.random() * 0.6; const col = T.kind === 'glitzer' ? ['#fff6a8', '#ffffff'] : ['#3c9a3c', '#8ad86a']; for (let i = 0; i < 3; i++) this.parts.push({ x: T.x * 16 + 3 + Math.random() * 10, y: T.y * 16 + 6, vx: (Math.random() - 0.5) * 30, vy: -18 - Math.random() * 14, c: col[i % 2], l: 0.45, ml: 0.45, sz: 1 }); if (T.kind !== 'glitzer' && Math.random() < 0.4) sfx('grass'); } }
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
  moveDur() { const p = this.p; return p.jump ? 0.42 : p.slide ? 0.1 : this.M.underwater ? 0.3 : p.ride ? 0.115 : p.sneak ? 0.34 : (input.held('b') && !this.M.indoor ? (this.g.state.wind > 0 ? 0.095 : 0.13) : this.g.state.wind > 0 ? 0.17 : 0.22); }
  stepMove(dt) {
    const p = this.p;
    p.t += dt / this.moveDur();
    const k = Math.min(1, p.t);
    p.px = (p.fx + (p.tx - p.fx) * k) * 16; p.py = (p.fy + (p.ty - p.fy) * k) * 16;
    const F = this.f; if (F) { F.px = (F.fx + (F.tx - F.fx) * k) * 16; F.py = (F.fy + (F.ty - F.fy) * k) * 16; F.k = k; if (k >= 1) { F.x = F.tx; F.y = F.ty; } }
    p.hop = p.jump ? Math.sin(k * Math.PI) * 10 : 0;
    // Gang: 4 Phasen pro Feld (Fuß links, Mitte, Fuß rechts, Mitte) und leichtes Wippen
    p.frame = p.slide ? 0 : k < 0.55 ? (p.step % 2 ? 1 : 2) : 3; // Schritt, dann Durchgang (Beine beisammen)
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
      if (bc === null || this.boulderAt(bx, by) || this.npcAt(bx, by) || (SOLID.has(bc)) || bc === '~' || (bc === 'E' && !this.gateOpen(bx, by)) || (bc === 'v' && this.M.gym) || this.bldAt(bx, by)) return this.bump();
      const s = this.g.state;
      if (this.holeOpen(bx, by)) { s.flags[`hole:${this.id}:${bx},${by}`] = true; this.boulders = this.boulders.filter(b => b !== bo); sfx('faint'); G.shake = 0.6; this.notify('Der Brocken füllt das Loch!'); }
      else { bo.x = bx; bo.y = by; sfx('hit'); G.shake = 0.2; const pf = bc === 'N' && this.M.plates?.[bx + ',' + by]; if (pf && !s.flags[pf]) { s.flags[pf] = true; this.notify(this.plateMsg(pf)); } }
      s.bpos[this.id] = this.boulders.map(b => [b.x, b.y]);
      return;
    }
    if (this.solid(nx, ny)) return this.bump();
    if (this.g.blockMove?.(this.id, nx, ny, d)) return;
    this.startMove(nx, ny, false);
  }
  startMove(tx, ty, jump) {
    this.dust(); const p = this.p; p.moving = true; p.fx = p.x; p.fy = p.y; p.tx = tx; p.ty = ty; p.t = 0; p.jump = jump; if (jump) sfx('whoosh');
    const F = this.f;
    if (F) {
      if (F.anim) { F.x = F.anim.tx; F.y = F.anim.ty; F.anim = null; }
      F.fx = F.x; F.fy = F.y; F.tx = p.x; F.ty = p.y;
      if (p.surf) { F.fx = F.tx = tx; F.fy = F.ty = ty; F.vis = false; }
      else { const ddx = F.tx - F.fx, ddy = F.ty - F.fy; if (ddx || ddy) F.dir = Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 'right' : 'left') : (ddy > 0 ? 'down' : 'up'); F.vis = this.ch(F.tx, F.ty) !== '~' && (F.tx !== tx || F.ty !== ty); }
    }
  }
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
    if (s.wind > 0 && !--s.wind) this.notify('Der Rückenwind hat sich gelegt.');
    if (s.repel > 0 && !--s.repel) this.notify('Der Schleier löst sich auf.');
    if (s.lure > 0 && !--s.lure) this.notify('Das Lockfutter ist aufgebraucht.');
    if ((c === 's' || c === 'd') && !p.surf) { this.prints.push({ x: p.x, y: p.y, dir: p.dir, t: 4 }); if (this.prints.length > 40) this.prints.shift(); }
    if ((c === ':' || c === 'h' || c === 'y' || c === 'f' || c === '%') && !p.surf) {
      this.rustle = { x: p.x, y: p.y, t: 0.32 }; sfx('grass');
      const col = c === 'y' ? ['#ffffff', '#cfe0f0'] : c === 'h' ? ['#8a7a68', '#b0a088'] : c === 'f' ? ['#c8a860', '#a88a48'] : ['#3c9a3c', '#7ad05a'];
      for (let i = 0; i < 5; i++) this.parts.push({ x: p.x * 16 + 3 + Math.random() * 10, y: p.y * 16 + 8 + Math.random() * 4, vx: (Math.random() - 0.5) * 40, vy: -22 - Math.random() * 18, c: col[i % 2], l: 0.4, ml: 0.4, sz: i % 2 ? 2 : 1 });
    }
    this.g.onStep?.();
    if (this.M.decor) { const d = decorAt(this.M.decor, p.x, p.y); if (d?.d === 'sprungmatte') { this.busy = true; for (let k = 0; k < 2; k++) { sfx('click'); const t0 = G.t; while (G.t - t0 < 0.3) { p.bob = Math.sin((G.t - t0) / 0.3 * Math.PI) * 9; await wait(16); } } p.bob = 0; this.busy = false; } }
    if (this.M.indoor && c === 'm') return this.exitInterior();
    const wp = (this.M.warps || []).find(w => w.x === p.x && w.y === p.y);
    if (wp) return this.warp(wp.to, wp.tx, wp.ty, wp.dir);
    // Eis: in Laufrichtung weiterrutschen, bis ein Hindernis kommt
    if (c === 'i') {
      const [dx, dy] = DX[p.dir], nx = p.x + dx, ny = p.y + dy;
      if (nx >= 0 && ny >= 0 && nx < this.w && ny < this.h && !this.solid(nx, ny) && !this.bldAt(nx, ny)) { p.slide = true; this.startMove(nx, ny, false); return; }
    }
    // Wind: trägt die Figur weiter, bis etwas im Weg ist
    const wd = this.M.wind?.[p.x + ',' + p.y];
    if (wd) { const [dx, dy] = DX[wd], nx = p.x + dx, ny = p.y + dy; if (!this.solid(nx, ny)) { p.slide = true; this.startMove(nx, ny, false); return; } }
    p.slide = false;
    // Druckplatte: öffnet zugehörige Tore (mehrteilige Tore brauchen alle ihre Platten)
    const pf = c === 'N' && this.M.plates?.[p.x + ',' + p.y];
    if (pf && !s.flags[pf] && this.M.heavy?.includes(p.x + ',' + p.y)) { if (!this.heavyHint) { this.heavyHint = true; this.notify('Die Platte rührt sich nicht. Sie braucht etwas Schweres …'); } }
    else if (pf && !s.flags[pf]) { s.flags[pf] = true; sfx('lvl'); G.shake = 0.4; this.notify(this.plateMsg(pf)); }
    if (p.surf && c !== '~') { p.surf = false; s.surf = false; this.music(); }
    if (await this.checkTrainers()) return;
    if (p.sneak && !this.isGrass(p.x, p.y)) { p.sneak = false; this.notify('Du stehst wieder auf.'); }
    this.scareShy();
    if (await this.revierCheck()) return;
    if (p.surf && this.M.surfEnc) { if (Math.random() < ENC[this.M.surfEnc].rate) await this.g.wildBattle(this.M.surfEnc, 'wasser'); return; }
    const encId = this.M.enc;
    // Kreaturen-Spuren: raschelnde oder funkelnde Stelle im hohen Gras
    const T = this.trail;
    if (T && T.x === p.x && T.y === p.y) { this.trail = null; await this.g.trailBattle(T, this.M.cave ? 'hoehle' : this.id === 'altwald' ? 'wald' : this.M.bg || 'gras'); return; }
    if (T) {
      if (--T.life <= 0) this.trail = null;
      else if (!p.sneak && T.hops < 2 && Math.abs(T.x - p.x) + Math.abs(T.y - p.y) <= 1 && Math.random() < 0.3) {
        const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [T.x + a, T.y + b]).filter(([a, b]) => this.isGrass(a, b) && Math.abs(a - p.x) + Math.abs(b - p.y) > 1 && !this.npcAt(a, b));
        if (opts.length) { const [a, b] = opts[Math.floor(Math.random() * opts.length)]; T.px = T.x; T.py = T.y; T.x = a; T.y = b; T.hops++; T.pt = 0; sfx('grass'); this.notify('Es ist weggehuscht! Schleich dich näher heran …'); }
      }
    } else if (encId && this.M.outdoor && !p.surf && Math.random() < 0.045) this.spawnTrail();
    if (encId && !(s.repel > 0) && ((c === ':' || c === 'h' || c === 'y' || c === 'f' || c === '%') || (this.M.cave && c === 'c'))) {
      if (Math.random() < ENC[encId].rate * (s.lure > 0 ? 2 : 1) * (p.sneak ? 0.6 : 1) * (p.ride ? 0.5 : 1)) await this.g.wildBattle(encId, this.M.cave ? 'hoehle' : this.M.bg || 'gras', null, { sneak: !!p.sneak });
    }
  }

  // Revier: im Umkreis r warnt die Kreatur; wer trotzdem näher kommt (oder direkt daneben steht), wird angegriffen. Geduckt ist der Umkreis nur 1.
  async revierCheck() {
    const p = this.p;
    for (const n of this.npcs) {
      if (!n.revier) continue;
      const R = n.revier, d = Math.abs(n.x - p.x) + Math.abs(n.y - p.y);
      if (!this.seesPlayer(n)) { if (d > R.r) n.warned = false; n.lastD = d; continue; }
      if (d <= 1 || (n.warned && d < n.lastD)) { this.emote = { n, t: 0.8 }; sfx('encounter'); G.shake = 0.8; await this.g.revierBattle(n, true); return true; }
      if (!n.warned) { n.warned = true; this.emote = { n, t: 1.2 }; G.shake = 0.5; sfx('encounter'); this.notify(`${SPECIES[R.sp].name} warnt: Revier! Zurück oder duck dich.`); }
      n.lastD = d;
    }
    return false;
  }
  // Sichtkegel einer Revierkreatur: in Blickrichtung bis zur Reichweite, nach vorn breiter werdend.
  // Geduckt im hohen Gras sieht sie dich erst direkt vor der Nase; geduckt außerhalb nur halb so weit.
  coneRange(n) { const p = this.p; return p.sneak ? (this.isGrass(p.x, p.y) ? 1 : Math.ceil(n.revier.r / 2)) : n.revier.r + 1; }
  inCone(n, x, y, r) {
    const [dx, dy] = DX[n.dir] || [0, 1], rx = x - n.x, ry = y - n.y, f = rx * dx + ry * dy, l = Math.abs(rx * dy - ry * dx);
    if (Math.abs(rx) + Math.abs(ry) <= 1) return true;
    return f >= 1 && f <= r && l <= Math.ceil(f / 2);
  }
  seesPlayer(n) { return this.inCone(n, this.p.x, this.p.y, this.coneRange(n)); }
  // Scheue Kreaturen: wer rennt oder reitet, verscheucht sie aus der Nähe
  scareShy() {
    const p = this.p, run = p.ride || input.held('b');
    if (!run) return;
    for (const n of [...this.npcs]) if (n.shy && Math.abs(n.x - p.x) + Math.abs(n.y - p.y) <= 3) {
      const day = Math.floor(Date.now() / 864e5); this.g.state.flags[`shyFled:${day}:${n.shy.id}`] = true;
      this.npcs = this.npcs.filter(x => x !== n); sfx('whoosh');
      this.notify(`${SPECIES[n.shy.sp].name} erschrickt und flieht! Nicht rennen – leise anschleichen.`);
    }
  }
  isGrass(x, y) { const c = this.ch(x, y); return x >= 0 && y >= 0 && x < this.w && y < this.h && (c === ':' || c === 'h' || c === 'y' || c === 'f' || c === '%'); }
  spawnTrail() {
    const p = this.p, C = [];
    for (let y = p.y - 6; y <= p.y + 6; y++) for (let x = p.x - 7; x <= p.x + 7; x++) { const d = Math.abs(x - p.x) + Math.abs(y - p.y); if (d >= 3 && d <= 8 && this.isGrass(x, y) && !this.npcAt(x, y)) C.push([x, y]); }
    if (!C.length) return;
    const [x, y] = C[Math.floor(Math.random() * C.length)];
    this.trail = { x, y, kind: Math.random() < 0.13 ? 'glitzer' : 'rare', life: 32, hops: 0, pt: 0 };
    this.notify(this.trail.kind === 'glitzer' ? 'Irgendwo im Gras funkelt etwas …' : 'Irgendwo im Gras raschelt es …');
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
    if (b.lock && !this.g.state.flags[b.lock]) { this.busy = true; await say(b.lockText || 'Die Tür ist verschlossen.'); this.busy = false; return; }
    const s = this.g.state; s.ret = { map: this.id, x: b.x + b.door, y: b.y + b.h, heal: !!b.heal };
    if (b.heal) s.healPoint = { map: this.id, x: b.x + b.door, y: b.y + b.h };
    const I = MAPS[b.to]; let mx = 0, my = 0;
    let mat = false; I.rows.forEach((r, yy) => { const k = r.indexOf('m'); if (k >= 0 && !mat) { mx = k; my = yy; mat = true; } });
    // ohne Fußmatte: ein Feld über dem Ausgang, der zurück auf diese Karte führt (z. B. Kraftwerk)
    if (!mat) { const w = (I.warps || []).find(q => q.to === this.id) || I.warps?.[0]; if (w) { mx = w.x; my = Math.max(0, w.y - 1); } }
    sfx('open'); this.busy = true; this.door = { x: b.x + b.door, y: b.y + b.h - 1 };
    await wait(260); this.door = null;
    await this.warp(b.to, mx, my, 'up');
  }
  async exitInterior() { const r = this.g.state.ret || { map: 'muschelbucht', x: 4, y: 9 }; await this.warp(r.map, r.x, r.y, 'down'); }

  // ---------------------------------------------------------- NPCs
  updateNpcs(dt) {
    for (const n of this.npcs) {
      if (n.revier && !n.moving) { n.lookT = (n.lookT ?? 1.5 + Math.random() * 2) - dt; if (n.lookT <= 0) { n.lookT = 1.8 + Math.random() * 2.2; const o = ['up', 'down', 'left', 'right'].filter(d => d !== n.dir); n.dir = o[Math.floor(Math.random() * o.length)]; } }
      if (n.moving) {
        n.t += dt / 0.3; const k = Math.min(1, n.t);
        n.px = (n.x + (n.tx - n.x) * k) * 16; n.py = (n.y + (n.ty - n.y) * k) * 16; n.frame = k < 0.55 ? (n.step % 2 ? 1 : 2) : 3;
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
      if (n) { if (!n.dig) n.dir = OPP[p.dir]; await this.g.talk(n); return; } // alle Menschen und Trainer drehen sich zum Spieler
      const it = this.items.find(i => i.x === fx && i.y === fy);
      if (it) { await this.g.pickup(it); this.items = this.items.filter(i => i !== it); return; }
      if (this.f?.vis && this.f.x === fx && this.f.y === fy && !this.p.moving) { await this.g.talkFollower(); return; }
      const sc = this.secret?.find(h => h.x === fx && h.y === fy);
      if (sc) { await this.g.pickup(sc); this.secret = this.secret.filter(h => h !== sc); return; }
      const hd = this.hidden.find(h => h.x === fx && h.y === fy);
      if (hd) { await this.g.pickup(hd); this.hidden = this.hidden.filter(h => h !== hd); return; }
      { const sp = baseSpots()[this.id]; if (sp && sp.x === fx && sp.y === fy) { await this.g.baseSpot(sp); return; } }
      if (this.M.decor) { const d = decorAt(this.M.decor, fx, fy); if (d) { await this.g.decorTalk(d); return; } }
      { const q = this.M.props?.find(q => fy === q.y && fx >= q.x && fx <= q.x + 1); if (q) { await this.g.shop(q.goods, q.name, q.hello); return; } }
      if (this.ch(fx, fy) === '$') { await this.g.fieldObstacle('zerschneider', fx, fy); return; }
      if (this.ch(fx, fy) === '&') { await this.g.fieldObstacle('zertruemmerer', fx, fy); return; }
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
      if (c === 'Y' && (this.id === 'home' || this.id === 'inselhaus')) { await this.g.rest(); return; }
      if (c === '~' && !this.p.surf) { await this.g.water(fx, fy); return; }
      if (c === '~' && this.M.fishing !== false) { await this.g.fish(); return; }
      if (c === 'U') { await this.g.berry(fx, fy); return; }
      if (c === 'b') { await say('Ein schwerer Felsbrocken. Er bewegt sich keinen Millimeter.'); return; }
      if (this.isGrass(p.x, p.y) && this.g.state.team.length) { p.sneak = !p.sneak; sfx('grass'); this.notify(p.sneak ? 'Du duckst dich ins Gras. Ganz leise … (A: aufstehen)' : 'Du stehst wieder auf.'); return; }
    } finally { this.busy = false; }
  }

  // ---------------------------------------------------------- Wetter (Regen wechselt täglich, Asche am Vulkan, Schnee im Norden)
  weather() {
    if (!this.M.outdoor) return null;
    const wx = this.g.state.wx; if (wx && wx.until > Date.now()) return wx.w === 'sun' ? null : wx.w;
    if (this.M.fog) return 'fog';
    const W0 = { route3: 'ash', ignis: 'ash', kraterherz: 'ash', route5: 'snow', frostheim: 'snow', frostgipfel: 'snow', eisgipfel: 'snow' };
    // Frostpfad: an manchen Tagen Schneefall (dann zeigt sich der Firnkauz)
    if (this.id === 'frostpfad' && Math.floor(Date.now() / 864e5) % 2 === 0) return 'snow';
    if (W0[this.id]) return W0[this.id];
    const day = Math.floor(Date.now() / 864e5), R = ['duenenpfad', 'ankerbrueck', 'muschelbucht'], i = R.indexOf(this.id);
    return i >= 0 && (day + i) % 3 === 0 ? 'rain' : null;
  }
  // Möwen kreisen über Küstenorten und Stränden (tagsüber)
  drawGulls(ctx) {
    if (!this.M.outdoor || !this.M.fishing || this.g.isNight() || this.M.underwater) return;
    for (let i = 0; i < 3; i++) {
      const sp = 14 + i * 5, span = W + 80, x = ((G.t * sp + i * 97) % span) - 40, y = 18 + i * 22 + Math.sin(G.t * 0.8 + i * 2) * 8, f = Math.sin(G.t * 9 + i) > 0 ? 2 : 0;
      ctx.strokeStyle = '#3a3a48'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 4, y - f); ctx.lineTo(x, y + 1); ctx.lineTo(x + 4, y - f); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x - 3.5, y - f); ctx.lineTo(x, y + 0.8); ctx.lineTo(x + 3.5, y - f); ctx.stroke();
    }
  }
  drawWeather(ctx, cx, cy) {
    const w = this.weather(); if (!w) return;
    const t = G.t, md = (v, m) => ((v % m) + m) % m;
    if (w === 'fog') { // Nebelschwaden in zwei Ebenen
      ctx.fillStyle = 'rgba(220,226,240,.18)'; ctx.fillRect(0, 0, W, VH);
      for (let i = 0; i < 9; i++) { const y = md(i * 47 - cy * 0.3, VH + 40) - 20, x = md(i * 91 + t * (6 + (i % 3) * 3) - cx * 0.5, W + 160) - 80; ctx.fillStyle = `rgba(235,240,250,${0.16 + (i % 3) * 0.05})`; ctx.beginPath(); ctx.ellipse(x, y, 70 + (i % 4) * 14, 12 + (i % 3) * 4, 0, 0, 7); ctx.fill(); }
      return;
    }
    if (w === 'rain') {
      ctx.fillStyle = 'rgba(30,40,70,.18)'; ctx.fillRect(0, 0, W, VH);
      ctx.strokeStyle = 'rgba(200,220,255,.55)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i < 80; i++) { const x = md(i * 53.7 - t * 60 - cx, W + 20) - 10, y = md(i * 31.3 + t * 260 - cy, VH + 20) - 10; ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 8); }
      ctx.stroke();
      ctx.fillStyle = 'rgba(220,235,255,.6)'; for (let i = 0; i < 14; i++) { const k = md(t * 3 + i * 0.37, 1); if (k > 0.3) continue; ctx.fillRect(md(i * 71.3 + Math.floor(t * 3 + i * 0.37) * 37 - cx, W), md(i * 47.9 + Math.floor(t * 3 + i * 0.37) * 53 - cy, VH), 2 + k * 6, 1); }
    } else {
      const ash = w === 'ash', n = ash ? 45 : 60;
      ctx.fillStyle = ash ? 'rgba(210,200,195,.85)' : 'rgba(255,255,255,.9)';
      for (let i = 0; i < n; i++) { const x = md(i * 47.3 + Math.sin(t * 1.3 + i) * 6 + t * (ash ? 8 : -6) - cx, W + 10) - 5, y = md(i * 29.7 + t * (ash ? 16 : 22) * (0.7 + (i % 5) * 0.1) - cy, VH + 10) - 5; ctx.fillRect(x, y, i % 3 ? 1.5 : 2.5, i % 3 ? 1.5 : 2); }
      if (ash) { ctx.fillStyle = 'rgba(120,90,80,.12)'; ctx.fillRect(0, 0, W, VH); }
    }
  }

  // ---------------------------------------------------------- Zeichnen
  draw(ctx) {
    const p = this.p, mw = this.w * 16, mh = this.h * 16;
    let cx = p.px + 8 - W / 2, cy = p.py + 8 - VH / 2;
    cx = mw <= W ? (mw - W) / 2 : Math.max(0, Math.min(mw - W, cx));
    cy = mh <= VH ? (mh - VH) / 2 : Math.max(0, Math.min(mh - VH, cy));
    if (this.cine?.focus && this.cine.k > 0) { // Kamera gleitet weich zum Ziel der Szene
      const F = this.cine.focus, e = this.cine.k * this.cine.k * (3 - 2 * this.cine.k);
      let fx = F.px + 8 - W / 2, fy = F.py + 8 - VH / 2;
      fx = mw <= W ? (mw - W) / 2 : Math.max(0, Math.min(mw - W, fx)); fy = mh <= VH ? (mh - VH) / 2 : Math.max(0, Math.min(mh - VH, fy));
      cx += (fx - cx) * e; cy += (fy - cy) * e;
    }
    cx = snap(cx); cy = snap(cy); this.view = { cx, cy };
    this.cam = { x: cx, y: cy };
    const f2 = Math.floor(G.t * 2) % 2, f3 = Math.floor(G.t * 2.5) % 3;
    const flags = this.g.worldFlags();
    const runesOn = Object.values(this.M.runes || {}).filter(r => flags[r]).length;
    const x0 = Math.floor(cx / 16), y0 = Math.floor(cy / 16), crowns = [], rocks = [], winds = [];
    for (let y = y0; y <= y0 + Math.ceil(VH / 16) + 1; y++) for (let x = x0; x <= x0 + 15; x++) {
      const c = this.ch(x, y); if (c === null) continue;
      let name = TILE[c] || 'void', fr = 0;
      if (c === '~' || c === 'v') fr = f3; else if (c === ',' || c === ':' || c === 'h' || c === 'y' || c === 'f' || c === '%' || c === 'N' || c === '+' || c === 'e' || c === 'V' || c === 'M' || c === 'Q') fr = f2;
      if (c === 'r') { const id = this.M.runes?.[x + ',' + y]; if (flags[id]) { name = 'runeOn'; fr = f2; } }
      if (c === 'A') fr = runesOn >= 3 ? f2 : 0;
      if (c === 'R' && this.M.cave) name = 'crock';
      if (c === 'E') { const op = this.gateOpen(x, y); name = this.M.gateLook ? this.M.gateLook[op ? 1 : 0] : op ? 'gateOpen' : 'gate'; }
      if (this.M.wind?.[x + ',' + y]) winds.push([x, y, this.M.wind[x + ',' + y]]);
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
    // Sichtkegel der Revierkreaturen (nur in der Nähe): rötliche Felder, kräftiger, wenn sie dich gesehen hat
    for (const n of this.npcs) {
      if (!n.revier || Math.abs(n.x - this.p.x) + Math.abs(n.y - this.p.y) > n.revier.r + 5) continue;
      const r = this.coneRange(n); ctx.fillStyle = n.warned ? 'rgba(230,50,40,.34)' : 'rgba(250,110,50,.24)';
      for (let yy = n.y - r; yy <= n.y + r; yy++) for (let xx = n.x - r; xx <= n.x + r; xx++) if ((xx !== n.x || yy !== n.y) && this.inCone(n, xx, yy, r) && !this.wallAt(xx, yy)) ctx.fillRect(xx * 16 - cx, yy * 16 - cy, 16, 16);
    }
    // Windfelder: wandernde helle Streifen in Windrichtung
    if (winds.length) { ctx.fillStyle = 'rgba(255,255,255,.55)'; for (const [x, y, d] of winds) { const [dx, dy] = DX[d]; for (let i = 0; i < 2; i++) { const q = ((G.t * 1.6 + i * 0.5 + (x + y) * 0.13) % 1) * 16 - 8, px = x * 16 - cx + 8 + dx * q + (dy ? (i ? 4 : -4) : 0), py = y * 16 - cy + 8 + dy * q + (dx ? (i ? 4 : -4) : 0); ctx.fillRect(px - (dx ? 3 : 0.5), py - (dy ? 3 : 0.5), dx ? 6 : 1, dy ? 6 : 1); } } }
    // Schatten: Bäume und Felsen werfen weiche Schatten nach rechts unten
    for (const [, x, y] of crowns) ctx.drawImage(softShadow(20, 8), x * 16 - cx + 4, y * 16 - cy + 11);
    for (const [x, y] of rocks) ctx.drawImage(softShadow(16, 6), x * 16 - cx + 3, y * 16 - cy + 12);
    const night = this.g.isNight();
    for (const b of this.blds) { if (b.tower) continue; const bx = b.x * 16 - cx, by = b.y * 16 - cy; ctx.fillStyle = 'rgba(10,20,40,.2)'; ctx.fillRect(bx + b.w * 16, by + 8, 4, b.h * 16 - 6); ctx.fillRect(bx + 4, by + b.h * 16, b.w * 16, 3); }
    for (const b of this.blds) {
      const im = building({ ...b, night, lit: !b.beam || !!this.g.state.flags[b.beam] }), bx = b.x * 16 - cx, by = (b.y + b.h) * 16 - im.height - cy;
      ctx.drawImage(im, bx, by);
      // Rauch aus dem Schornstein (Wohnhäuser): drei Wölkchen steigen auf und verblassen
      const house = !b.tower && !b.heal && !['LADEN', 'ARENA', 'LIGA', 'LABOR'].includes(b.sign);
      if (house && this.M.outdoor && bx > -40 && bx < W + 40) for (let i = 0; i < 3; i++) {
        const k = (G.t * 0.35 + i / 3 + (b.x * 0.37 % 1)) % 1, sx = bx + im.width - 10 + Math.sin(k * 5 + b.x) * 3 + k * 6, sy = by - 2 - k * 22;
        ctx.globalAlpha = (1 - k) * 0.45; ctx.fillStyle = night ? '#8a8aa0' : '#e8e8ee'; ctx.beginPath(); ctx.arc(sx, sy, 2 + k * 3.5, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    for (const b of this.boulders || []) ctx.drawImage(tile('rockTop'), b.x * 16 - cx, b.y * 16 - cy);
    for (const i of this.items) ctx.drawImage(this.ball, i.x * 16 - cx, i.y * 16 - cy - Math.round(Math.sin(G.t * 3 + i.x) * 1));
    if (this.revealed) for (const h of this.hidden) { const on = Math.sin(G.t * 6 + h.x) > 0; ctx.fillStyle = on ? '#fff8c0' : '#ffd36b'; const hx = h.x * 16 - cx + 8, hy = h.y * 16 - cy + 8; ctx.fillRect(hx - 1, hy - (on ? 4 : 3), 2, on ? 8 : 6); ctx.fillRect(hx - (on ? 4 : 3), hy - 1, on ? 8 : 6, 2); }
    // geöffnete Tür
    if (this.door) { const dx = this.door.x * 16 - cx, dy = this.door.y * 16 - cy; ctx.fillStyle = '#28202c'; ctx.fillRect(dx + 3, dy + 3, 10, 13); ctx.fillStyle = '#100c14'; ctx.fillRect(dx + 4, dy + 4, 8, 12); ctx.fillStyle = 'rgba(255,220,150,.25)'; ctx.fillRect(dx + 4, dy + 13, 8, 3); }
    // Fußspuren im Sand
    for (const f of this.prints) {
      ctx.fillStyle = `rgba(100,70,35,${Math.min(1, f.t / 1.5) * 0.55})`; const bx = f.x * 16 - cx, by = f.y * 16 - cy;
      if (f.dir === 'up' || f.dir === 'down') { ctx.fillRect(bx + 5, by + 5, 2, 3); ctx.fillRect(bx + 9, by + 9, 2, 3); } else { ctx.fillRect(bx + 4, by + 6, 3, 2); ctx.fillRect(bx + 9, by + 9, 3, 2); }
    }
    // Geheimbasis: Platz in der Welt und Möbel im Raum
    { const sp = baseSpots()[this.id]; if (sp) { const b = this.g.state.base; drawSpot(ctx, sp, cx, cy, b && b.map === sp.map); } }
    if (this.M.decor) drawDecor(ctx, this.M.decor, cx, cy);
    for (const q of this.M.props || []) ctx.drawImage(standArt(q.col), q.x * 16 - cx, q.y * 16 - cy - 10);
    // Kreaturen-Spur: wackelnde Halme, Pfotenabdrücke, Funkeln
    if (this.trail) {
      const T = this.trail, bx = T.x * 16 - cx, by = T.y * 16 - cy, w = Math.sin(G.t * 22) * (Math.sin(G.t * 3) > 0.2 ? 1.6 : 0.3);
      if (T.px != null) { ctx.fillStyle = 'rgba(70,45,25,.45)'; const ax = T.px * 16 - cx, ay = T.py * 16 - cy; [[4, 4], [9, 9]].forEach(([q, r]) => { ctx.fillRect(ax + q, ay + r, 3, 2); ctx.fillRect(ax + q - 1, ay + r - 2, 1, 1); ctx.fillRect(ax + q + 1, ay + r - 2, 1, 1); ctx.fillRect(ax + q + 3, ay + r - 2, 1, 1); }); }
      ctx.fillStyle = T.kind === 'glitzer' ? '#a8e070' : '#3a8a34';
      for (let i = 0; i < 4; i++) { const hx = bx + 3 + i * 3.4 + w * (i % 2 ? 1 : -1); ctx.fillRect(Math.round(hx), by + 2 - (i % 2), 2, 9); }
      ctx.fillStyle = '#78c850'; for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(bx + 3 + i * 3.4 + w * (i % 2 ? 1 : -1)), by + 2 - (i % 2), 1, 3);
      if (T.kind === 'glitzer') { const on = Math.sin(G.t * 7) > 0, sx = bx + 8 + Math.round(Math.sin(G.t * 1.7) * 3), sy = by + 1; ctx.fillStyle = on ? '#ffffff' : '#ffe36b'; ctx.fillRect(sx - 1, sy - (on ? 4 : 2), 2, on ? 8 : 4); ctx.fillRect(sx - (on ? 4 : 2), sy - 1, on ? 8 : 4, 2); }
    }
    // Figuren nach y sortiert
    const actors = [...this.npcs.map(n => ({ dig: n.dig, alpha: n.alpha, revier: n.revier, shy: n.shy, mon: n.mon, look: n.look, dir: n.dir, frame: n.frame || 0, px: n.px, py: n.py, x: n.moving ? n.tx : n.x, y: n.moving ? n.ty : n.y })),
      { look: this.g.state.look, dir: p.dir, frame: p.frame, hop: p.hop || 0, px: p.px, py: p.py - (p.hop || 0) - (p.bob || 0) + (p.sneak ? 4 : 0), x: p.moving ? p.tx : p.x, y: p.moving ? p.ty : p.y, me: true },
      ...(this.g.remoteActors?.(this.id) || [])];
    const lead = this.f?.vis && !p.surf && !p.ride && this.g.state.team.find(m => !m.egg && m.hp > 0);
    if (lead) { const F = this.f; actors.push({ follow: lead, px: F.px, py: F.py, x: F.x, y: F.y, dir: F.dir }); }
    actors.sort((a, b) => a.py - b.py);
    for (const a of actors) {
      if (a.me && p.ride && !p.surf) { // Reiten: Reittier unter der Figur, Figur sitzt erhöht
        const rm = this.g.state.team.find(m => (m.uid || m.sp) === p.ride) || this.g.state.team.find(m => !m.egg), up = a.dir === 'up', gal = p.moving ? Math.round(Math.abs(Math.sin((p.t || 0) * Math.PI * 2)) * -2) : Math.round(Math.sin(G.t * 3));
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(a.px - cx + 8, a.py - cy + 14, 9, 3, 0, 0, 7); ctx.fill();
        if (rm) { ctx.save(); ctx.translate(Math.round(a.px - cx + 8), Math.round(a.py - cy - 14 + gal)); if (a.dir === 'right') ctx.scale(-1, 1); ctx.drawImage(monSprite(rm.sp, up ? 'iconback' : 'icon', rm.shiny, rm.mut), -16, 0); ctx.restore(); }
        drawChar(ctx, a.look, a.dir, 0, a.px - cx, a.py - cy - 17 + gal); continue;
      }
      if (a.me && p.surf) { const sm = this.g.surfMon?.(); const bob = Math.round(Math.sin(G.t * 4)); if (sm) { const up = a.dir === 'up'; ctx.save(); ctx.translate(Math.round(a.px - cx + 8), Math.round(a.py - cy - 6 + bob)); if (a.dir === 'right') ctx.scale(-1, 1); ctx.drawImage(monSprite(sm.sp, up ? 'iconback' : 'icon', sm.shiny, sm.mut), -16, 0); ctx.restore(); } drawChar(ctx, a.look, a.dir, 0, a.px - cx, a.py - cy - 7 + bob); continue; }
      if (a.follow) {
        const m = a.follow, img = monSprite(m.sp, a.dir === 'up' ? 'iconback' : 'icon', m.shiny, m.mut), mv = p.moving || !!this.f.anim, hopY = mv ? -Math.round(Math.abs(Math.sin((this.f.k || 0) * Math.PI)) * 2) : (Math.floor(G.t * 2) % 2 ? -1 : 0);
        ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(a.px - cx + 8, a.py - cy + 14, 6, 2, 0, 0, 7); ctx.fill();
        ctx.save(); ctx.translate(Math.round(a.px - cx + 8), Math.round(a.py - cy - 15 + hopY)); if (a.dir === 'right') ctx.scale(-1, 1); ctx.drawImage(img, -16, 0); ctx.restore();
        if (this.fEmote?.t > 0) { const ex = a.px - cx + 4, ey = a.py - cy - 22; ctx.fillStyle = '#28202c'; ctx.fillRect(ex - 1, ey - 1, 10, 9); ctx.fillStyle = '#fff'; ctx.fillRect(ex, ey, 8, 7); ctx.fillStyle = '#e84a6a'; [[1, 1, 2, 2], [5, 1, 2, 2], [1, 2, 6, 2], [2, 4, 4, 1], [3, 5, 2, 1]].forEach(([q, w2, e, r]) => ctx.fillRect(ex + q, ey + w2, e, r)); }
      } else if (a.dig) { drawDigActor(ctx, a, cx, cy, this.g.state);
      } else if (a.alpha || a.revier) { // Alpha (rot) und Revier (orange): groß, Aura, Schatten, leichtes Atmen
        const img = monSprite(a.mon, 'icon'), b = Math.sin(G.t * 2.4), sz = Math.round((a.revier ? 40 : 44) + b), ax = Math.round(a.px - cx + 8), ay = Math.round(a.py - cy + 14);
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(ax, ay, 11, 3, 0, 0, 7); ctx.fill();
        ctx.globalAlpha = 0.55 + b * 0.2; ctx.drawImage(glow(26, a.revier?.legend ? '255,230,120' : a.revier ? '255,150,40' : '255,40,40'), ax - 26, ay - 44); ctx.globalAlpha = 1;
        const red = redSil(a.mon, img, a.revier?.legend ? '#fff0a0' : a.revier ? '#ff9a30' : undefined);
        ctx.imageSmoothingEnabled = false; ctx.save(); ctx.translate(ax, ay - sz + 6); if (a.dir === 'right') ctx.scale(-1, 1);
        ctx.globalAlpha = 0.8 + b * 0.2; for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(red, -sz / 2 + ox, oy, sz, sz); ctx.globalAlpha = 1;
        ctx.drawImage(img, -sz / 2, 0, sz, sz); ctx.restore();
        if (a.revier) { ctx.globalAlpha = 0.25 + 0.1 * Math.sin(G.t * 3); ctx.strokeStyle = '#ffb040'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.ellipse(ax, ay - 2, a.revier.r * 16 + 8, a.revier.r * 8 + 4, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
        if (!a.revier && Math.floor(G.t * 1.5) % 4 === 0) { ctx.fillStyle = '#ff3030'; ctx.fillRect(ax - 3, ay - sz - 2, 2, 2); ctx.fillRect(ax + 1, ay - sz - 2, 2, 2); }
      } else if (a.mon) { ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(a.px - cx + 8, a.py - cy + 14, 6, 2, 0, 0, 7); ctx.fill(); ctx.save(); ctx.translate(Math.round(a.px - cx + 8), Math.round(a.py - cy - 16 + Math.sin(G.t * 2))); if (a.dir === 'right') ctx.scale(-1, 1); ctx.drawImage(monSprite(a.mon, 'icon'), -16, 0); ctx.restore();
        if (a.shy && Math.floor(G.t * 0.8) % 3 === 0) { const hx = a.px - cx + 4, hy = a.py - cy - 24; ctx.fillStyle = '#28202c'; ctx.fillRect(hx - 1, hy - 1, 10, 9); ctx.fillStyle = '#fff'; ctx.fillRect(hx, hy, 8, 7); text('?', hx + 4, hy - 1, '#3a8ad8', 8, 'center', null, true); } }
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
    // 52-Ball: nur ein kurzes Funkeln, wenn man direkt daneben steht
    for (const h of this.secret || []) {
      if (Math.abs(h.x - this.p.x) + Math.abs(h.y - this.p.y) > 1 || (G.t + h.x * 0.37) % 2.6 > 0.22) continue;
      const k = ((G.t + h.x * 0.37) % 2.6) / 0.22, r = Math.round(1 + Math.sin(k * Math.PI) * 3), hx = h.x * 16 - cx + 8 + (h.y % 3) - 1, hy = h.y * 16 - cy + 6;
      ctx.fillStyle = '#fff6c8'; ctx.fillRect(hx, hy - r, 1, r * 2 + 1); ctx.fillRect(hx - r, hy, r * 2 + 1, 1);
    }
    { const sp = baseSpots()[this.id]; if (sp) { const b = this.g.state.base; drawSpot(ctx, sp, cx, cy, b && b.map === sp.map, true); } }
    // Staub- und Grasteilchen
    for (const q of this.parts) { ctx.globalAlpha = Math.max(0, q.l / q.ml); ctx.fillStyle = q.c; ctx.fillRect(q.x - cx, q.y - cy, q.sz, q.sz); }
    ctx.globalAlpha = 1;
    // Ziehende Wolkenschatten (draußen, tagsüber)
    if (this.M.outdoor && !night && !this.M.night && !this.M.sandstorm) {
      const cl = cloudShadow(), span = mw + 320;
      for (let i = 0; i < 3; i++) { const wx = ((i * 260 + G.t * (5 + i * 2)) % span) - 160, wy = ((i * 173) % Math.max(1, mh)) - 30; ctx.drawImage(cl, wx - cx, wy - cy); }
    }
    this.drawGulls(ctx); this.drawWeather(ctx, cx, cy);
    if (this.emote) {
      const n = this.emote.n, x = n.px - cx + 4, y = n.py - cy - 22;
      ctx.fillStyle = '#28202c'; ctx.fillRect(x - 1, y - 1, 10, 12); ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 8, 10); text('!', x + 4, y + 0.5, '#e84a5f', 9, 'center', null, true);
    }
    // Tag/Nacht
    if (this.M.outdoor || this.M.cave || this.M.night) {
      const dark = (night ? 0.45 : this.g.dusk() * 0.25) + (this.M.dark || 0) + (this.M.cave ? 0.15 : 0);
      if (this.M.night && !this.M.darkRadius) { ctx.fillStyle = 'rgba(10,8,34,.38)'; ctx.fillRect(0, 0, W, VH); }
      if (dark > 0) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(${night ? '40,50,120' : '120,80,90'},${Math.min(0.7, dark)})`; ctx.fillRect(0, 0, W, VH); ctx.globalCompositeOperation = 'source-over'; }
    }
    // Nachts leuchten Fenster und werfen Licht auf den Boden; Glühwürmchen über Wiesen
    if ((night || this.M.night) && this.M.outdoor) {
      ctx.globalCompositeOperation = 'lighter';
      for (const b of this.blds) {
        if (b.tower) continue;
        const wallY = (b.h - 2) * 16 + 4;
        for (let i = 0; i < b.w; i++) {
          if (i === b.door || !(i === 0 || i === b.w - 1 || (b.w > 4 && i % 2 === 0))) continue;
          const gx = b.x * 16 + i * 16 + 8 - cx, gy = b.y * 16 + wallY + 10 - cy;
          ctx.drawImage(glow(14), gx - 14, gy - 14); ctx.drawImage(glow(10), gx - 10, b.y * 16 + b.h * 16 + 2 - cy - 10);
        }
      }
      if (!this.M.cave) for (let i = 0; i < 14; i++) {
        const fx = ((i * 97 + Math.sin(G.t * 0.5 + i) * 30) % (W + 20)) - 10, fy = ((i * 61 + Math.cos(G.t * 0.4 + i * 2) * 20) % (VH + 10)) - 5, on = (Math.sin(G.t * 2 + i * 1.7) + 1) / 2;
        ctx.globalAlpha = on; ctx.drawImage(glow(4, '200,255,120'), fx - 4, fy - 4); ctx.fillStyle = '#f8ffb0'; ctx.fillRect(fx, fy, 1, 1);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    // Nyxara: violettes Licht, schwebende Lichtfunken; Station: kühles Licht und Statuslämpchen
    if (this.M.alien) {
      ctx.fillStyle = this.M.space ? 'rgba(40,10,90,.42)' : 'rgba(120,50,200,.32)'; ctx.fillRect(0, 0, W, VH);
      for (let i = 0; i < 24; i++) { const k = (G.t * 0.08 + i / 24) % 1, x = ((i * 89 - cx * 0.2) % W + W) % W + Math.sin(G.t + i) * 4, y = VH - k * VH; ctx.fillStyle = i % 3 ? 'rgba(200,170,255,.7)' : 'rgba(140,255,240,.8)'; ctx.fillRect(x | 0, y | 0, 1 + (i % 2), 1 + (i % 2)); }
      if (this.M.space) for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,250,230,${0.4 + 0.6 * Math.abs(Math.sin(G.t * 1.3 + i))})`; ctx.fillRect((i * 61) % W, (i * 37) % VH, 1, 1); }
    }
    if (this.M.station) { ctx.fillStyle = 'rgba(40,120,170,.12)'; ctx.fillRect(0, 0, W, VH); for (let y = (G.t * 20) % 4; y < VH; y += 4) { ctx.fillStyle = 'rgba(160,230,255,.04)'; ctx.fillRect(0, y | 0, W, 1); } }
    // Unter Wasser: blaue Tönung, Lichtstrahlen von oben, aufsteigende Blasen
    if (this.M.underwater) {
      ctx.fillStyle = 'rgba(20,90,170,.30)'; ctx.fillRect(0, 0, W, VH);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) { const x = ((i * 53 - cx * 0.4 + Math.sin(G.t * 0.4 + i) * 14) % (W + 60) + W + 60) % (W + 60) - 30; ctx.fillStyle = `rgba(150,220,255,${0.06 + 0.03 * Math.sin(G.t + i)})`; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 18, 0); ctx.lineTo(x + 48, VH); ctx.lineTo(x + 26, VH); ctx.fill(); }
      ctx.restore();
      for (let i = 0; i < 18; i++) { const k = (G.t * 0.25 + i / 18) % 1, bx = ((i * 71) % W) + Math.sin(G.t * 2 + i) * 3, by = VH - k * (VH + 20); ctx.fillStyle = 'rgba(220,245,255,.55)'; ctx.fillRect(bx | 0, by | 0, 2, 2); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(bx | 0, by | 0, 1, 1); }
      const ppx = p.px - cx + 10, ppy = p.py - cy - 10 - ((G.t * 18) % 16); ctx.fillStyle = 'rgba(230,250,255,.7)'; ctx.fillRect(ppx | 0, ppy | 0, 2, 2);
    }
    // Leuchttürme: rotierender Lichtkegel in Dämmerung und Nacht
    if (this.M.outdoor && (night || this.g.dusk() > 0.15)) for (const b of this.blds) {
      if (!b.tower || (b.beam && !this.g.state.flags[b.beam])) continue;
      const lx = b.x * 16 + b.w * 8 - cx, ly = (b.y + b.h) * 16 - 62 - cy, a = G.t * 0.8;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const off of [0, Math.PI]) { const ang = a + off, len = 150, sp = 0.13; const gr = ctx.createLinearGradient(lx, ly, lx + Math.cos(ang) * len, ly + Math.sin(ang) * len * 0.55); gr.addColorStop(0, 'rgba(255,236,160,.5)'); gr.addColorStop(1, 'rgba(255,236,160,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + Math.cos(ang - sp) * len, ly + Math.sin(ang - sp) * len * 0.55); ctx.lineTo(lx + Math.cos(ang + sp) * len, ly + Math.sin(ang + sp) * len * 0.55); ctx.fill(); }
      ctx.drawImage(glow(18), lx - 18, ly - 18); ctx.restore();
    }
    // Sonnenlicht von oben links und sanfte Vignette → mehr Tiefe
    ctx.drawImage(lightLayer(this.M.outdoor && !night && !this.M.night), 0, 0, W, VH);
    // Sandsturm: wehende Sandschleier
    if (this.M.sandstorm) {
      const gust = 0.24 + Math.sin(G.t * 0.7) * 0.08;
      ctx.fillStyle = `rgba(226,186,110,${gust})`; ctx.fillRect(0, 0, W, VH);
      for (let i = 0; i < 110; i++) {
        const sp = 150 + (i % 7) * 35, x = ((i * 53 + G.t * sp) % (W + 60)) - 30, y = ((i * 37 + Math.sin(G.t * 2 + i) * 8) % VH);
        ctx.fillStyle = i % 3 ? 'rgba(255,236,180,.75)' : 'rgba(176,126,60,.6)'; ctx.fillRect(x, y, 8 + (i % 5) * 3, 1);
        if (i % 9 === 0) ctx.fillRect(x + 4, y + 1, 4, 1);
      }
    }
    // Dunkelheit mit Lichtkreis um den Spieler (Ruinen, Schatten-Arena)
    if (this.M.darkRadius) {
      if (this.lightCv && this.lightCv.height !== VH) this.lightCv = null;
      const L = (this.lightCv ||= Object.assign(document.createElement('canvas'), { width: W, height: VH })), lx = L.getContext('2d');
      lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, W, VH); lx.fillStyle = 'rgba(6,4,16,.96)'; lx.fillRect(0, 0, W, VH);
      const px = p.px - cx + 8, py = p.py - cy + 6, r = this.M.darkRadius + (this.flashLit || 0) + Math.sin(G.t * 3) * 1.5;
      const gr = lx.createRadialGradient(px, py, r * 0.45, px, py, r);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      lx.globalCompositeOperation = 'destination-out'; lx.fillStyle = gr; lx.beginPath(); lx.arc(px, py, r, 0, 7); lx.fill();
      ctx.drawImage(L, 0, 0);
    }
    if (this.cine) { // Kinobalken und leichte Abdunklung
      const e = this.cine.b * this.cine.b * (3 - 2 * this.cine.b), bh = Math.round(22 * e);
      ctx.fillStyle = `rgba(10,8,20,${0.18 * e})`; ctx.fillRect(0, 0, W, VH);
      ctx.fillStyle = '#05040a'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, VH - bh, W, bh);
    }
    if (this.banner) {
      const k = Math.min(1, this.banner.t * 3, (2.2 - this.banner.t) * 4);
      box(4, -20 + 26 * k, 96, 20, 'default');
      text(this.banner.name, 52, -14 + 26 * k, COL.ink, 8.5, 'center', COL.shadow, true);
    }
    if (!this.cine?.on && !this.g.state.flags.miniOff && (this.M.outdoor || this.M.cave)) this.drawMini(ctx);
    if (this.notice) { box(20, 4, 200, 20, 'gold'); text(this.notice.text, 120, 10, COL.ink, 7.5, 'center', null, true); }
  }
  notify(t) { this.notice = { text: t, t: 3.5 }; sfx('lvl'); }
  // Minikarte oben rechts: Kacheln als Farbpunkte (pro Karte gecacht), Häuser, Ziel des Pagers, Spieler blinkt
  drawMini(ctx) {
    const M = this.M;
    if (!this.miniCv || this.miniId !== this.id) {
      const cv = document.createElement('canvas'); cv.width = this.w; cv.height = this.h; const x = cv.getContext('2d');
      const C = { '~': '#3a7ad0', s: '#e8d8a0', d: '#d8c088', '=': '#d8b878', ':': '#3a9a48', '.': '#6ac860', ',': '#7ad070', T: '#1e5a32', P: '#1e5a32', D: '#1e4a2a', R: '#8a8478', L: '#6a9a50', B: '#a87a48', W: '#4a4048', c: '#8a7a68', f: '#5aa850' };
      for (let y = 0; y < this.h; y++) for (let xx = 0; xx < this.w; xx++) { x.fillStyle = C[M.rows[y][xx]] || '#6ac860'; x.fillRect(xx, y, 1, 1); }
      for (const b of this.blds) { x.fillStyle = b.heal ? '#e85a4a' : b.sign === 'ARENA' ? '#f8c040' : '#c8b8a8'; x.fillRect(b.x, b.y, b.w, b.h); }
      this.miniCv = cv; this.miniId = this.id;
    }
    const k = Math.max(1, Math.min(2, Math.floor(52 / Math.max(this.w, this.h * 0.8)))), mw = this.w * k, mh = this.h * k, x0 = W - mw - 5, y0 = 5;
    ctx.globalAlpha = 0.88; ctx.fillStyle = '#1a1e2a'; ctx.fillRect(x0 - 2, y0 - 2, mw + 4, mh + 4); ctx.fillStyle = '#e8e0c8'; ctx.fillRect(x0 - 1, y0 - 1, mw + 2, mh + 2);
    ctx.drawImage(this.miniCv, x0, y0, mw, mh); ctx.globalAlpha = 1;
    for (const n of this.npcs) if (n.trainer && !this.g.state.flags[n.id]) { ctx.fillStyle = '#e84a5f'; ctx.fillRect(x0 + n.x * k, y0 + n.y * k, k, k); }
    if (Math.sin(G.t * 7) > -0.3) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x0 + this.p.x * k - 1, y0 + this.p.y * k - 1, k + 2, k + 2); ctx.fillStyle = '#e84a5f'; ctx.fillRect(x0 + this.p.x * k, y0 + this.p.y * k, k, k); }
  }
}
