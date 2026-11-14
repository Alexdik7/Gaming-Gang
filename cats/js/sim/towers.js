// TowerManager: Katzen, ihre Angriffe, Geschosse (Pool), Geschütze/Notfall-Katzen und Auren.
import { BALANCE } from '../config.js';
import { CATS } from '../data/cats.js';
import { bonusAt } from './maps.js';
import { computeStats, placeCost } from './upgrades.js';

const ZERO = () => ({ dmg: 0, rate: 0, range: 0, crit: 0, pen: 0, stun: 0 });
const SPEED = { rifle: 26, minigun: 20, slingshot: 13, shuriken: 15, bomb: 7.5, flask: 8, launcher: 10, orb: 9, wrench: 14, turret: 16 };

export class TowerManager {
  constructor(world) {
    this.world = world; this.list = []; this.proj = []; this.pool = []; this.minions = []; this.holes = [];
    this.nextId = 1; this.buffT = 0; this.g = { dmg: 0, rate: 0, range: 0 }; this.cand = [];
  }
  at(tx, ty) { return this.list.find(t => t.tx === tx && t.ty === ty); }
  byId(id) { return this.list.find(t => t.id === id); }

  place(owner, catId, tx, ty) {
    const W = this.world, def = CATS[catId], P = W.players[owner];
    const t = {
      id: this.nextId++, def, cat: catId, tx, ty, x: tx + .5, y: ty + .5, owner, tiers: [0, 0, 0], stats: null, range: 0,
      cd: 0.3, angle: Math.PI / 2, target: null, targetId: 0, mode: null, stunT: 0, buff: ZERO(), tile: bonusAt(W.map, tx, ty),
      spent: placeCost(def, P.bonus), kills: 0, dmgDone: 0, fireT: 0, beam: [], beamT: 0, rampN: 0, rampId: 0, turretT: 0, holeT: 4, born: W.time
    };
    this.recalc(t); t.mode = t.stats.mode;
    this.list.push(t); this.buffs();
    return t;
  }
  remove(t) { this.list.splice(this.list.indexOf(t), 1); this.minions = this.minions.filter(m => m.by !== t); this.buffs(); }
  recalc(t) { t.stats = computeStats(t.def, t.tiers, this.world.players[t.owner].bonus); this.buffs(); }

  // Auren neu verteilen: gleiche Boni stapeln NICHT, es zählt der stärkste (verhindert ein einzelnes Meta)
  buffs() {
    const W = this.world, L = this.list, g = this.g;
    g.dmg = g.rate = g.range = 0; W.revealAll = false;
    for (const P of W.players) { P.discount = 0; P.bounty = 0; }
    for (const t of L) { const b = t.buff; b.dmg = b.rate = b.range = b.crit = b.pen = b.stun = 0; }
    for (const s of L) {
      const st = s.stats; if (!st) continue;
      g.dmg = Math.max(g.dmg, st.gDmg || 0); g.rate = Math.max(g.rate, st.gRate || 0); g.range = Math.max(g.range, st.gRange || 0);
      if (st.gReveal) W.revealAll = true;
      const P = W.players[s.owner];
      if (st.discount) P.discount = Math.max(P.discount, st.discount);
      if (!(st.aDmg || st.aRate || st.aRange || st.aCrit || st.aPen || st.aStun)) continue;
      const r2 = st.range * st.range;
      for (const t of L) {
        if ((t.x - s.x) ** 2 + (t.y - s.y) ** 2 > r2) continue;
        const b = t.buff;
        b.dmg = Math.max(b.dmg, st.aDmg || 0); b.rate = Math.max(b.rate, st.aRate || 0); b.range = Math.max(b.range, st.aRange || 0);
        b.crit = Math.max(b.crit, st.aCrit || 0); b.pen = Math.max(b.pen, st.aPen || 0); b.stun = Math.max(b.stun, st.aStun || 0);
      }
    }
    for (const t of L) if (t.stats) t.range = t.stats.range * (1 + t.buff.range + g.range) * (t.tile === 1 ? 1.25 : 1);
  }

  stunArea(x, y, r, dur) {
    for (const t of this.list) if ((t.x - x) ** 2 + (t.y - y) ** 2 <= r * r) {
      const d = dur * (1 - Math.min(0.95, t.buff.stun));
      if (d > 0.2) { t.stunT = Math.max(t.stunT, d); t.rampN = 0; }
    }
  }

  // Ziele wählen: bis zu n Hunde nach Zielmodus sortiert
  pick(x, y, range, mode, detect, n, out) {
    const E = this.world.enemies; out.length = 0;
    E.inRange(x, y, range, (e, d2) => {
      if (!E.targetable(e, detect)) return;
      e._s = mode === 'first' ? e.dist - e.path.len : mode === 'last' ? e.path.len - e.dist : mode === 'strong' ? e.hp + e.shield + (e.boss ? 1e6 : 0) : -d2;
      out.push(e);
    });
    if (out.length > 1) out.sort((a, b) => b._s - a._s);
    if (out.length > n) out.length = n;
    return out;
  }

  update(dt) {
    const W = this.world, E = W.enemies, fx = W.fx;
    if ((this.buffT -= dt) <= 0) {
      this.buffT = 0.25; this.buffs();
      for (const t of this.list) {
        if (t.stats.reveal) E.inRange(t.x, t.y, t.range, e => { e.revealT = 0.45; });
        if (t.stats.bounty) E.inRange(t.x, t.y, t.range, e => { e.bounty = Math.max(e.bounty || 0, t.stats.bounty); });
      }
    }
    const any = E.list.length > 0;
    for (const t of this.list) {
      const st = t.stats;
      if (t.fireT > 0) t.fireT -= dt;
      if (t.beamT > 0 && (t.beamT -= dt) <= 0) t.beam.length = 0;
      if (t.stunT > 0) { t.stunT -= dt; continue; }
      if (st.atk === 'eco' || st.atk === 'support') continue;
      if (any && st.turretCd && (t.turretT += dt) >= st.turretCd) this.buildTurret(t);
      if (any && st.hole && (t.holeT += dt) >= st.hole) this.openHole(t);
      if ((t.cd -= dt) > 0) continue;
      const targets = any ? this.pick(t.x, t.y, t.range, t.mode, st.detect, 1 + (st.shots || 0) + (st.beams || 0), this.cand) : this.cand;
      if (!any || !targets.length) { t.cd = 0; t.rampN = 0; continue; }
      const rate = st.rate * (1 + t.buff.rate + this.g.rate + (fx.catnip > 0 ? fx.catnipV : 0)) * (t.tile === 2 ? 1.2 : 1);
      t.cd = Math.max(t.cd + 1 / rate, 0) || 1 / rate;
      const e0 = targets[0];
      t.angle = Math.atan2(e0.y - t.y, e0.x - t.x); t.fireT = 0.14;
      this.fire(t, st, targets);
    }
    this.updateProj(dt); this.updateMinions(dt); this.updateHoles(dt);
  }

  dmgOf(t, st) { return st.dmg * (1 + t.buff.dmg + this.g.dmg) * (this.world.fx.double > 0 ? 2 : 1); }

  fire(t, st, targets) {
    const W = this.world, E = W.enemies, dmg = this.dmgOf(t, st), e0 = targets[0], wp = t.def.look.weapon;
    if (st.atk === 'shot') {
      const n = 1 + (st.shots || 0);
      for (let i = 0; i < n; i++) {
        const e = targets[i % targets.length];
        if (st.instant) {
          W.emit({ e: 'shot', k: wp, x: t.x, y: t.y, tx: e.x, ty: e.y, inst: 1, id: t.id });
          if (st.line) this.lineHit(t, st, e, dmg); else if (st.splash) this.explode(e.x, e.y, st.splash, dmg, t, st); else this.hit(t, e, dmg, st, true);
        } else this.shoot(t, st, e, dmg, wp, i ? (i % 2 ? 1 : -1) * 0.16 * Math.ceil(i / 2) : 0);
      }
      if (!st.instant) W.emit({ e: 'shot', k: wp, x: t.x, y: t.y, tx: e0.x, ty: e0.y, id: t.id });
    } else if (st.atk === 'cone') {
      const half = 0.55 * (1 + (st.cone || 0));
      E.inRange(t.x, t.y, t.range, e => {
        if (e.under) return;
        let da = Math.atan2(e.y - t.y, e.x - t.x) - t.angle; da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) <= half) this.hit(t, e, dmg, st);
      });
      W.emit({ e: 'cone', x: t.x, y: t.y, a: t.angle, r: t.range, half, id: t.id });
    } else if (st.atk === 'pulse') {
      E.inRange(t.x, t.y, t.range, e => { if (!e.under) this.hit(t, e, dmg, st); });
      W.emit({ e: 'pulse', k: st.type, x: t.x, y: t.y, r: t.range, id: t.id });
    } else if (st.atk === 'chain') {
      const seen = [e0]; let cur = e0, d = dmg; const pts = [t.x, t.y, e0.x, e0.y];
      this.hit(t, e0, d, st);
      for (let i = 1; i < st.chain; i++) {
        let best = null, bd = 1e9;
        E.inRange(cur.x, cur.y, st.jump, (e, d2) => { if (d2 < bd && !e.under && seen.indexOf(e) < 0 && E.targetable(e, st.detect)) { bd = d2; best = e; } });
        if (!best) break;
        seen.push(best); cur = best; d *= 0.85; pts.push(best.x, best.y);
        this.hit(t, best, d, st);
      }
      W.emit({ e: 'zap', pts, id: t.id });
    } else if (st.atk === 'beam') {
      if (t.rampId !== e0.id) { t.rampId = e0.id; t.rampN = 0; }
      t.rampN = Math.min(1, t.rampN + 1 / (st.rate * 2.5));        // volle Hitze nach 2,5 s
      t.beam.length = 0; t.beamT = 0.2;
      targets.forEach((e, i) => {
        const d = dmg * (i === 0 ? 1 + (st.ramp || 0) * t.rampN : 1);
        t.beam.push(e.x, e.y);
        if (st.line && i === 0) this.lineHit(t, st, e, d); else this.hit(t, e, d, st);
      });
      W.emit({ e: 'beam', id: t.id });
    }
  }

  shoot(t, st, e, dmg, kind, spread) {
    const p = this.pool.pop() || {};
    const a = Math.atan2(e.y - t.y, e.x - t.x) + spread, sp = SPEED[kind] || 13, straight = !!(st.pierce) || spread !== 0 && !st.splash;
    Object.assign(p, { x: t.x, y: t.y, x0: t.x, y0: t.y, tx: e.x, ty: e.y, e, eid: e.id, t, st, dmg, sp, kind, a,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, straight, pierce: st.pierce || 0, life: (t.range * 1.35) / sp, hits: p.hits || [], arc: !!st.arc, total: 0, dead: false });
    p.hits.length = 0; p.total = Math.hypot(e.x - t.x, e.y - t.y) || 0.01;
    this.proj.push(p);
  }

  updateProj(dt) {
    const E = this.world.enemies, P = this.proj;
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      if (p.straight) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if ((p.life -= dt) <= 0) { p.dead = true; continue; }
        E.inRange(p.x, p.y, 0.42, e => {
          if (p.dead || p.hits.indexOf(e.id) >= 0 || !E.targetable(e, p.st.detect)) return;
          p.hits.push(e.id); this.hit(p.t, e, p.dmg, p.st, true);
          if (--p.pierce < 0) p.dead = true;
        });
      } else {
        const alive = p.e.id === p.eid && !p.e.dead;
        if (alive) { p.tx = p.e.x; p.ty = p.e.y; }
        const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), step = p.sp * dt;
        if (d <= step + 0.15) {
          p.dead = true;
          if (p.st.splash) this.explode(p.tx, p.ty, p.st.splash, p.dmg, p.t, p.st);
          else if (alive) this.hit(p.t, p.e, p.dmg, p.st, true);
        } else { p.x += dx / d * step; p.y += dy / d * step; p.a = Math.atan2(dy, dx); }
      }
    }
    let n = 0;
    for (let i = 0; i < P.length; i++) { if (P[i].dead) this.pool.push(P[i]); else P[n++] = P[i]; }
    P.length = n;
  }

  // Treffer anwenden: Ausweichen, Krit, Schaden, Zusatzeffekte
  hit(t, e, dmg, st, isProj) {
    const W = this.world, E = W.enemies;
    if (e.dead) return;
    if (isProj && e.def.dodge && !st.splash && W.rand() < e.def.dodge) { W.emit({ e: 'miss', x: e.x, y: e.y }); return; }
    const b = t.buff || ZERO();
    const crit = (st.crit || 0) + b.crit;
    if (crit > 0 && W.rand() < crit) { dmg *= BALANCE.critMul; W.emit({ e: 'crit', x: e.x, y: e.y }); }
    const o = this.o || (this.o = {});
    o.pen = Math.min(1, (st.pen || 0) + b.pen); o.bossDmg = st.bossDmg; o.shieldBreak = st.shieldBreak; o.exec = st.exec;
    E.damage(e, dmg, st.type, o, t);
    if (e.dead) return;
    if (st.slow) E.slow(e, st.slow, st.slowT || 1);
    if (st.stun) E.stun(e, st.stun);
    if (st.freeze && W.rand() < st.freeze) { E.stun(e, 1.1); W.emit({ e: 'freeze', x: e.x, y: e.y }); }
    if (st.burn) E.burn(e, st.burn * (1 + b.dmg), st.burnT || 3, t, st.spread);
    if (st.shred) { e.shredV = Math.max(e.shredT > 0 ? e.shredV : 0, st.shred); e.shredT = st.shredT || 3; }
    if (st.vuln) { e.vulnV = Math.max(e.vulnT > 0 ? e.vulnV : 0, st.vuln); e.vulnT = 3; }
    if (st.knock) E.knock(e, st.knock);
  }

  explode(x, y, r, dmg, t, st, sub) {
    const W = this.world, E = W.enemies;
    E.inRange(x, y, r, e => { if (!e.under) this.hit(t, e, dmg, st); });
    W.emit({ e: 'boom', k: st.type, x, y, r });
    if (st.cluster && !sub) for (let i = 0; i < st.cluster; i++) {
      const a = W.rand() * 6.283, d = r * (0.5 + W.rand() * 0.6);
      this.explode(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.6, dmg * 0.4, t, st, true);
    }
  }

  // Strahl durch die ganze Reihe: alle Hunde nahe der Linie Katze → Ziel (bis Reichweite)
  lineHit(t, st, e, dmg) {
    const W = this.world, E = W.enemies, a = Math.atan2(e.y - t.y, e.x - t.x), ux = Math.cos(a), uy = Math.sin(a), len = t.range * 1.15;
    E.inRange(t.x + ux * len / 2, t.y + uy * len / 2, len / 2 + 0.5, o => {
      const px = o.x - t.x, py = o.y - t.y, along = px * ux + py * uy;
      if (along < 0 || along > len || Math.abs(px * uy - py * ux) > 0.45 || !E.targetable(o, st.detect)) return;
      if (st.splash && o === e) return;
      this.hit(t, o, dmg, st);
    });
    if (st.splash) this.explode(e.x, e.y, st.splash, dmg, t, st);
    W.emit({ e: 'ray', x: t.x, y: t.y, a, len, k: st.type, id: t.id });
  }

  // --- Ingenieur: Geschütz neben den Weg stellen
  buildTurret(t) {
    const W = this.world, st = t.stats;
    t.turretT = 0;
    if (this.minions.filter(m => m.by === t).length >= st.turrets) return;
    const near = W.map.samples.filter(s => (s.x - t.x) ** 2 + (s.y - t.y) ** 2 <= t.range * t.range);
    if (!near.length) return;
    const s = near[Math.floor(W.rand() * near.length)], a = W.rand() * 6.283;
    this.addMinion({ kind: 'turret', x: s.x + Math.cos(a) * 0.55, y: s.y + Math.sin(a) * 0.55, dmg: st.turretDmg, rate: st.turretRate, range: 2.3, life: st.turretLife, pen: st.turretPen || 0, by: t, owner: t.owner });
  }
  addMinion(m) {
    m.cd = 0.3; m.angle = 0; m.id = this.nextId++; m.max = m.life; m.fireT = 0;
    m.st = { type: 'phys', pen: m.pen || 0, detect: m.kind === 'ecat' };
    m.buff = m.by ? m.by.buff : ZERO(); m.dmgDone = 0;
    this.minions.push(m); this.world.emit({ e: 'minion', x: m.x, y: m.y, k: m.kind });
    return m;
  }
  updateMinions(dt) {
    const W = this.world, M = this.minions;
    for (const m of M) {
      m.life -= dt; if (m.fireT > 0) m.fireT -= dt;
      if ((m.cd -= dt) > 0 || !W.enemies.list.length) continue;
      const tg = this.pick(m.x, m.y, m.range, 'first', m.st.detect, 1, this.cand);
      if (!tg.length) { m.cd = 0; continue; }
      const rate = m.rate * (1 + (W.fx.catnip > 0 ? W.fx.catnipV : 0));
      m.cd = 1 / rate; m.angle = Math.atan2(tg[0].y - m.y, tg[0].x - m.x); m.fireT = 0.1;
      const src = m.by || m;
      const saveX = src.x, saveY = src.y, saveR = src.range;
      // Geschoss startet beim Geschütz, der Schaden zählt für die Ingenieur-Katze
      src.x = m.x; src.y = m.y; src.range = m.range;
      this.shoot(src, m.st, tg[0], m.dmg * (W.fx.double > 0 ? 2 : 1), 'turret', 0);
      src.x = saveX; src.y = saveY; src.range = saveR;
      W.emit({ e: 'shot', k: 'turret', x: m.x, y: m.y, tx: tg[0].x, ty: tg[0].y });
    }
    if (M.some(m => m.life <= 0)) this.minions = M.filter(m => m.life > 0);
  }

  // --- Nyx: Schwarzes Loch zieht Hunde den Weg zurück
  openHole(t) {
    const st = t.stats, tg = this.pick(t.x, t.y, t.range, 'first', true, 1, this.cand);
    if (!tg.length) return;
    t.holeT = 0;
    this.holes.push({ x: tg[0].x, y: tg[0].y, t: 2.2, max: 2.2, r: 1.8, pull: st.holePull, dmg: st.holeDmg || 0, by: t });
    this.world.emit({ e: 'hole', x: tg[0].x, y: tg[0].y });
  }
  updateHoles(dt) {
    const E = this.world.enemies, H = this.holes;
    for (const h of H) {
      h.t -= dt;
      E.inRange(h.x, h.y, h.r, e => {
        if (e.under) return;
        if (!e.boss && !e.def.noKnock) e.dist = Math.max(0, e.dist - (h.pull + e.speed) * dt * (1 - (e.def.ccRes || 0)));
        if (h.dmg) E.damage(e, h.dmg * dt, 'shadow', null, h.by);
      });
    }
    if (H.some(h => h.t <= 0)) this.holes = H.filter(h => h.t > 0);
  }
}
