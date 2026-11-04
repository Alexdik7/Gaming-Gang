// Oberwelt: Kachelbewegung, Kamera, NPCs, Trainer-Sichtlinien, Türen, Begegnungen, Tag/Nacht
import { G, W, H, COL, push, input, text, box, wait, fade } from './engine.js';
import { MAPS, TILE, SOLID, ENC } from './maps.js';
import { tile, building, drawChar, tallOverlay, itemBall } from './pixel.js';
import { sfx, setMusic } from '../core/audio.js';
import { say, choose } from './gbui.js';
import { monSprite } from './sprites.js';

const DX = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

export class Overworld {
  constructor(game) { this.g = game; this.busy = false; this.banner = null; this.notice = null; this.emote = null; this.ball = itemBall(); }

  load(id, x, y, dir) {
    const M = MAPS[id]; this.id = id; this.M = M;
    this.w = M.rows[0].length; this.h = M.rows.length;
    const s = this.g.state; s.map = id;
    this.p = { x, y, dir: dir || s.dir || 'down', px: x * 16, py: y * 16, moving: false, step: 0, turnT: 0, jump: 0 };
    s.surf = !!s.surf && M.rows[y]?.[x] === '~'; this.p.surf = s.surf;
    this.npcs = (M.npcs || []).filter(n => !(n.hideIf && s.flags[n.hideIf]) && !(n.showIf && !s.flags[n.showIf])).map(n => ({ ...n, ox: n.x, oy: n.y, px: n.x * 16, py: n.y * 16, moving: false, wt: 1 + Math.random() * 3, step: 0 }));
    this.items = (M.items || []).filter(i => !s.flags[i.id]);
    this.blds = M.buildings || [];
    this.banner = (M.outdoor || M.cave || M.banner) ? { t: 2.2, name: M.name } : null;
    this.music();
    this.g.onMapLoad?.(id);
  }
  music() { const n = this.g.isNight(); setMusic(this.M.gym ? 'battle' : (n && (this.M.outdoor || this.M.cave)) ? 'night' : 'day'); }

  ch(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.M.rows[y][x]; }
  bldAt(x, y) { return this.blds.find(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h); }
  npcAt(x, y) { return this.npcs.find(n => (n.x === x && n.y === y) || (n.moving && n.tx === x && n.ty === y)); }
  solid(x, y, forNpc = false) {
    const c = this.ch(x, y); if (c === null) return true;
    if (SOLID.has(c)) return true;
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
    if (p.moving) {
      const dur = p.jump ? 0.42 : p.slide ? 0.1 : (input.held('b') && !this.M.indoor ? 0.13 : 0.22);
      p.t += dt / dur;
      const k = Math.min(1, p.t);
      p.px = (p.fx + (p.tx - p.fx) * k) * 16; p.py = (p.fy + (p.ty - p.fy) * k) * 16;
      p.hop = p.jump ? Math.sin(k * Math.PI) * 10 : 0;
      p.frame = p.slide ? 0 : k > 0.25 && k < 0.75 ? (p.step % 2 ? 1 : 2) : 0;
      if (k >= 1) { p.moving = false; p.x = p.tx; p.y = p.ty; p.jump = 0; p.hop = 0; p.step++; this.arrive(); }
      return;
    }
    p.frame = 0;
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
    if (p.moving) this.g.online?.pos();
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
    if (this.solid(nx, ny)) return this.bump();
    if (this.g.blockMove?.(this.id, nx, ny, d)) return;
    this.startMove(nx, ny, false);
  }
  startMove(tx, ty, jump) { const p = this.p; p.moving = true; p.fx = p.x; p.fy = p.y; p.tx = tx; p.ty = ty; p.t = 0; p.jump = jump; if (jump) sfx('whoosh'); }
  bump() { if (G.t - (this.lastBump || 0) > 0.35) { this.lastBump = G.t; sfx('step'); } }

  async arrive() {
    const p = this.p, s = this.g.state, c = this.ch(p.x, p.y);
    s.steps = (s.steps || 0) + 1;
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
    if (p.surf && c !== '~') { p.surf = false; s.surf = false; this.music(); }
    if (await this.checkTrainers()) return;
    if (p.surf && this.M.surfEnc) { if (Math.random() < ENC[this.M.surfEnc].rate) await this.g.wildBattle(this.M.surfEnc, 'wasser'); return; }
    const encId = this.M.enc;
    if (encId && ((c === ':' || c === 'h' || c === 'y') || (this.M.cave && c === 'c'))) {
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
    sfx('open');
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
      if (c === 'b') { await say('Ein schwerer Felsbrocken. Er bewegt sich keinen Millimeter.'); return; }
    } finally { this.busy = false; }
  }

  // ---------------------------------------------------------- Zeichnen
  draw(ctx) {
    const p = this.p, mw = this.w * 16, mh = this.h * 16;
    let cx = p.px + 8 - W / 2, cy = p.py + 8 - H / 2;
    cx = mw <= W ? (mw - W) / 2 : Math.max(0, Math.min(mw - W, cx));
    cy = mh <= H ? (mh - H) / 2 : Math.max(0, Math.min(mh - H, cy));
    cx = Math.round(cx); cy = Math.round(cy);
    this.cam = { x: cx, y: cy };
    const f2 = Math.floor(G.t * 2) % 2, f3 = Math.floor(G.t * 2.5) % 3;
    const flags = this.g.worldFlags();
    const runesOn = Object.values(this.M.runes || {}).filter(r => flags[r]).length;
    const x0 = Math.floor(cx / 16), y0 = Math.floor(cy / 16);
    for (let y = y0; y <= y0 + 11; y++) for (let x = x0; x <= x0 + 15; x++) {
      const c = this.ch(x, y); if (c === null) continue;
      let name = TILE[c] || 'void', fr = 0;
      if (c === '~' || c === 'v') fr = f3; else if (c === ',' || c === ':' || c === 'h' || c === 'y' || c === 'e' || c === 'V' || c === 'M' || c === 'Q') fr = f2;
      if (c === 'r') { const id = this.M.runes?.[x + ',' + y]; if (flags[id]) { name = 'runeOn'; fr = f2; } }
      if (c === 'A') fr = runesOn >= 3 ? f2 : 0;
      if (c === 'R' && this.M.cave) name = 'crock';
      ctx.drawImage(tile(name, fr, (x * 7 + y * 13) % 5), x * 16 - cx, y * 16 - cy);
    }
    const night = this.g.isNight();
    for (const b of this.blds) ctx.drawImage(building({ ...b, night }), b.x * 16 - cx, b.y * 16 - cy);
    for (const i of this.items) ctx.drawImage(this.ball, i.x * 16 - cx, i.y * 16 - cy - Math.round(Math.sin(G.t * 3 + i.x) * 1));
    // Figuren nach y sortiert
    const actors = [...this.npcs.map(n => ({ mon: n.mon, look: n.look, dir: n.dir, frame: n.frame || 0, px: n.px, py: n.py, x: n.moving ? n.tx : n.x, y: n.moving ? n.ty : n.y })),
      { look: this.g.state.look, dir: p.dir, frame: p.frame, px: p.px, py: p.py - (p.hop || 0), x: p.moving ? p.tx : p.x, y: p.moving ? p.ty : p.y, me: true },
      ...(this.g.remoteActors?.(this.id) || [])];
    actors.sort((a, b) => a.py - b.py);
    for (const a of actors) {
      if (a.me && p.surf) { const sm = this.g.surfMon?.(); const bob = Math.round(Math.sin(G.t * 4)); if (sm) ctx.drawImage(monSprite(sm.sp, 'icon', sm.shiny, sm.mut), a.px - cx - 8, a.py - cy - 6 + bob); drawChar(ctx, a.look, a.dir, 0, a.px - cx, a.py - cy - 7 + bob); continue; }
      if (a.mon) ctx.drawImage(monSprite(a.mon, 'icon'), a.px - cx - 8, a.py - cy - 16 + Math.round(Math.sin(G.t * 2) * 1));
      else drawChar(ctx, a.look, a.dir, a.frame, a.px - cx, a.py - cy);
      { const tc = this.ch(a.x, a.y); if ((tc === ':' || tc === 'h' || tc === 'y') && !(a.me && p.jump)) ctx.drawImage(tallOverlay(f2, tc === 'h' ? 'ash' : tc === 'y' ? 'snow' : 'green'), a.px - cx, a.py - cy + 8); }
      if (a.name) { const w = a.name.length * 4.2 + 6; ctx.fillStyle = 'rgba(20,40,80,.8)'; ctx.fillRect(a.px - cx + 8 - w / 2, a.py - cy - 12, w, 8); text(a.name, a.px - cx + 8, a.py - cy - 11.5, '#ffd36b', 6, 'center', null); }
    }
    if (this.emote) {
      const n = this.emote.n, x = n.px - cx + 4, y = n.py - cy - 16;
      ctx.fillStyle = '#28202c'; ctx.fillRect(x - 1, y - 1, 10, 12); ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 8, 10); text('!', x + 4, y + 0.5, '#e84a5f', 9, 'center', null, true);
    }
    // Tag/Nacht
    if (this.M.outdoor || this.M.cave) {
      const dark = (night ? 0.45 : this.g.dusk() * 0.25) + (this.M.dark || 0) + (this.M.cave ? 0.15 : 0);
      if (dark > 0) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(${night ? '40,50,120' : '120,80,90'},${Math.min(0.7, dark)})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
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
