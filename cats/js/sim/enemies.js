// EnemyManager: Hunde erzeugen (aus einem Pool), bewegen, Zustände und Boss-Fähigkeiten.
import { BALANCE, GRID } from '../config.js';
import { DOGS } from '../data/dogs.js';
import { posAt } from './maps.js';
import { scaleEnemy } from './waves.js';
import { calcDamage } from './damage.js';

const GW = GRID.cols + 4, GH = GRID.rows + 4;      // Suchraster mit Rand für Hunde außerhalb der Karte
const cell = (x, y) => Math.min(GH - 1, Math.max(0, Math.floor(y) + 2)) * GW + Math.min(GW - 1, Math.max(0, Math.floor(x) + 2));

export class EnemyManager {
  constructor(world) {
    this.world = world; this.list = []; this.pool = []; this.nextId = 1;
    this.grid = Array.from({ length: GW * GH }, () => []);
    this.tick = 0; this.tmp = {};
  }

  spawn(type, pi, dist = 0, o = {}) {
    const W = this.world, def = DOGS[type], path = W.map.paths[pi] || W.map.paths[0];
    const s = scaleEnemy(def, W.wave, { diff: W.diff, players: W.players.length, final: o.final, mini: o.mini, dense: o.dense });
    const e = this.pool.pop() || {};
    Object.assign(e, {
      id: this.nextId++, def, type, hp: s.hp, maxHp: s.hp, shield: s.shield, maxShield: s.shield, armor: s.armor, speed: s.speed,
      reward: s.reward, lives: def.lives || 1, path, dist, x: 0, y: 0, dx: 1, dy: 0, zone: 1,
      slowV: 0, slowT: 0, stunT: 0, burnV: 0, burnT: 0, burnBy: null, burnSpread: false, shredV: 0, shredT: 0, vulnV: 0, vulnT: 0,
      bounty: 0, healT: 0, stunCd: 0, revealT: 0, hasteV: 0, hasteT: 0, under: false, cyc: 0, phaseT: 0, enraged: false, dead: false, t: 0, hitT: 0,
      boss: !!def.boss, elite: !!def.elite, res: def.res || null, mini: !!o.mini,
      ab: def.abil ? def.abil.map(a => (a.cd || 0) * 0.6) : null
    });
    posAt(path, dist, e);
    this.list.push(e);
    if (e.boss) W.emit({ e: 'bossSpawn', id: e.id, type });
    return e;
  }

  stealthNow(e) { return (e.def.stealth || e.phaseT > 0) && e.revealT <= 0 && !this.world.revealAll; }
  // Kann diese Katze (detect?) den Hund angreifen?
  targetable(e, detect) { return !e.dead && !e.under && (detect || !this.stealthNow(e)); }

  // --- Kontroll-Effekte (ccRes und Boss-Faktor berücksichtigt)
  slow(e, v, t) {
    if (e.def.noSlow) return;
    const k = 1 - (e.def.ccRes || 0); v *= k; t *= k;
    if (v > e.slowV || e.slowT <= 0) e.slowV = v;
    e.slowT = Math.max(e.slowT, t);
  }
  stun(e, t) {
    if (e.stunCd > 0) return;                       // kurze Immunität danach: kein Dauer-Betäuben
    t *= e.boss ? BALANCE.stunBossFactor : 1 - (e.def.ccRes || 0);
    e.stunT = Math.max(e.stunT, t); e.stunCd = e.stunT + 1.2;
  }
  burn(e, dps, t, by, spread) {
    if (e.def.noBurn) return;
    if (dps >= e.burnV || e.burnT <= 0) { e.burnV = dps; e.burnBy = by; }
    e.burnT = Math.max(e.burnT, t); if (spread) e.burnSpread = true;
  }
  knock(e, d) { if (!e.def.noKnock && !e.boss) e.dist = Math.max(0, e.dist - d * (1 - (e.def.ccRes || 0))); }

  // Schaden anwenden. Gibt den tatsächlich gemachten Schaden zurück.
  damage(e, amount, type, o, by) {
    if (e.dead) return 0;
    const W = this.world, r = calcDamage(amount, type, e, Object.assign({ mod: W.map.mods[type] || 1 }, o));
    if (r.shield) { e.shield -= r.shield; if (e.shield <= 0.5) { e.shield = 0; W.emit({ e: 'shieldBreak', x: e.x, y: e.y }); } }
    e.hp -= r.hp; e.hitT = 0.12;
    const done = r.hp + r.shield;
    if (by) by.dmgDone = (by.dmgDone || 0) + done;
    if (o && o.exec && !e.boss && e.hp > 0 && e.hp < e.maxHp * o.exec) { e.hp = 0; W.emit({ e: 'exec', x: e.x, y: e.y }); }
    if (e.hp <= 0) this.kill(e, by);
    return done;
  }

  kill(e, by) {
    if (e.dead) return;
    e.dead = true;
    const W = this.world;
    if (e.def.spawn) for (let i = 0; i < e.def.spawn[1]; i++) this.spawn(e.def.spawn[0], e.path.i, Math.max(0, e.dist - i * 0.35)).t = 0.01;
    if (e.burnSpread && e.burnT > 0) this.inRange(e.x, e.y, 1.3, o => { if (o !== e) this.burn(o, e.burnV, 3, e.burnBy, true); });
    W.onKill(e, by);
  }

  // Alle lebenden Hunde im Umkreis
  inRange(x, y, r, fn) {
    const x0 = Math.floor(x - r) + 2, x1 = Math.floor(x + r) + 2, y0 = Math.floor(y - r) + 2, y1 = Math.floor(y + r) + 2, r2 = r * r;
    for (let cy = Math.max(0, y0); cy <= Math.min(GH - 1, y1); cy++) for (let cx = Math.max(0, x0); cx <= Math.min(GW - 1, x1); cx++) {
      const c = this.grid[cy * GW + cx];
      for (let i = 0; i < c.length; i++) { const e = c[i], dx = e.x - x, dy = e.y - y; if (!e.dead && dx * dx + dy * dy <= r2) fn(e, dx * dx + dy * dy); }
    }
  }
  rebuildGrid() {
    for (const c of this.grid) c.length = 0;
    for (const e of this.list) if (!e.dead) this.grid[cell(e.x, e.y)].push(e);
  }

  update(dt) {
    const W = this.world, L = this.list;
    this.tick += dt;
    const slowTick = this.tick >= 0.4; if (slowTick) this.tick = 0;
    for (let i = 0; i < L.length; i++) {
      const e = L[i]; if (e.dead) continue;
      e.t += dt; if (e.hitT > 0) e.hitT -= dt;
      // Zustände
      if (e.slowT > 0 && (e.slowT -= dt) <= 0) e.slowV = 0;
      if (e.shredT > 0) e.shredT -= dt;
      if (e.vulnT > 0) e.vulnT -= dt;
      if (e.revealT > 0) e.revealT -= dt;
      if (e.stunCd > 0) e.stunCd -= dt;
      if (e.healT > 0) e.healT -= dt;
      if (e.hasteT > 0 && (e.hasteT -= dt) <= 0) e.hasteV = 0;
      if (e.phaseT > 0) e.phaseT -= dt;
      if (e.burnT > 0) {
        e.burnT -= dt;
        e.hp -= e.burnV * dt * (1 - (e.res && e.res.fire || 0)) * (W.map.mods.fire || 1) * (e.vulnT > 0 ? 1 + e.vulnV : 1);
        if (e.burnBy) e.burnBy.dmgDone = (e.burnBy.dmgDone || 0) + e.burnV * dt;
        if (e.hp <= 0) { this.kill(e, e.burnBy); continue; }
      }
      if (e.def.burrow) { e.cyc = (e.cyc + dt) % (e.def.burrow[0] + e.def.burrow[1]); e.under = e.cyc > e.def.burrow[1]; }
      if (e.ab) this.abilities(e, dt);
      // Aura-Effekte (nur alle 0,4 s neu verteilen)
      if (slowTick) {
        if (e.def.aura) this.inRange(e.x, e.y, e.def.aura[0], o => { if (o !== e && e.def.aura[1] >= o.hasteV) { o.hasteV = e.def.aura[1]; o.hasteT = 0.6; } });
        if (e.def.heal) this.inRange(e.x, e.y, e.def.heal[0], o => { if (o !== e && !o.boss && o.hp < o.maxHp) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * e.def.heal[1] * 0.4); o.healT = 0.4; } });
        if (e.def.douse) this.inRange(e.x, e.y, e.def.douse, o => { o.burnT = 0; });
      }
      // Bewegung
      if (e.stunT > 0) { e.stunT -= dt; continue; }
      const v = e.speed * e.zone * (1 - e.slowV) * (1 + e.hasteV) * (e.enraged ? e.enraged : 1);
      e.dist += v * dt;
      if (e.dist >= e.path.len) { e.dead = true; W.onLeak(e); continue; }
      posAt(e.path, e.dist, this.tmp);
      e.x = this.tmp.x; e.y = this.tmp.y; e.dx = this.tmp.dx; e.dy = this.tmp.dy; e.zone = this.tmp.mul;
    }
    // Tote entfernen (zurück in den Pool)
    let n = 0;
    for (let i = 0; i < L.length; i++) { const e = L[i]; if (e.dead) this.pool.push(e); else L[n++] = e; }
    L.length = n;
    this.rebuildGrid();
  }

  abilities(e, dt) {
    const W = this.world, A = e.def.abil;
    for (let i = 0; i < A.length; i++) {
      const a = A[i];
      if (a.k === 'enrage') { if (!e.enraged && e.hp < e.maxHp * a.at) { e.enraged = a.speed; W.emit({ e: 'enrage', id: e.id, x: e.x, y: e.y }); } continue; }
      if ((e.ab[i] += dt) < a.cd) continue;
      e.ab[i] = 0;
      if (a.k === 'stomp') { W.towers.stunArea(e.x, e.y, a.r, a.stun); W.emit({ e: 'stomp', x: e.x, y: e.y, r: a.r }); }
      else if (a.k === 'summon') { for (let j = 0; j < a.n * (W.players.length > 2 ? 2 : 1); j++) this.spawn(a.type, e.path.i, Math.max(0, e.dist - 0.5 - j * 0.4)); W.emit({ e: 'howl', x: e.x, y: e.y, r: 1.5 }); }
      else if (a.k === 'howl') { this.inRange(e.x, e.y, a.r, o => { if (!o.boss) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * a.heal); o.hasteV = Math.max(o.hasteV, 0.3); o.hasteT = 3; }); W.emit({ e: 'howl', x: e.x, y: e.y, r: a.r }); }
      else if (a.k === 'phase') { e.phaseT = a.dur; W.emit({ e: 'phase', x: e.x, y: e.y }); }
      else if (a.k === 'shield') { e.shield = Math.min(e.maxShield, e.shield + e.maxShield * a.amount); W.emit({ e: 'shieldUp', x: e.x, y: e.y }); }
    }
  }
}
