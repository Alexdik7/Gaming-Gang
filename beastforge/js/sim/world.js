// Simulation eines Runs – ohne DOM, ohne three.js. Darstellung/Ton lesen nur world.events.
// RunState: coins, lives, wave, towers (CharacterInstances), enemies, projs.
// Fortschritt (Charakter-/Konto-XP) wird über hooks gemeldet – die Welt kennt das Profil nicht.
import { BAL } from '../config.js';
import { CREATURES } from '../data/creatures.js';
import { HEROES } from '../data/heroes.js';
import { ENEMIES, BOSSES } from '../data/enemies.js';
import { MAPS, PATH_HALF, raftPos } from '../data/maps.js';
import { waveDef } from '../data/waves.js';
import { REACTIONS, SYNERGIES } from '../data/meta.js';
import { baseStats, applyFx, canTier } from './stats.js';
import { maxStage, formAt } from '../meta/progression.js';

const PLACE = { '.': 'ground', '^': 'high', '~': 'water' };
export const RAFT_BONUS = 0.15;   // +Schaden auf Basalt-Flößen
export const TOWER_R = 0.42;   // Fußabdruck einer Kreatur (Felder)
export const TARGETS = ['first', 'last', 'strong', 'weak', 'close', 'fast', 'boss', 'random'];
export const TARGET_NAMES = { first: 'Erster', last: 'Letzter', strong: 'Stärkster', weak: 'Schwächster', close: 'Nächster', fast: 'Schnellster', boss: 'Boss/Elite', random: 'Zufall' };
const ELEMENTAL = new Set(['fire', 'lightning', 'earth', 'spirit', 'shadow', 'light']);

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export class World {
  constructor(o) {
    this.mapId = o.map || 'ahnenhain'; this.map = MAPS[this.mapId];
    this.diffKey = o.diff || 'normal'; this.diff = BAL.diff[this.diffKey];
    this.hooks = o.hooks || {};
    this.loadout = o.loadout || Object.keys(CREATURES);
    this.heroId = o.hero || null;
    this.rng = mulberry(o.seed ?? 12345);
    this.grid = this.map.grid.map(r => r.split(''));
    this.H = this.grid.length; this.W = this.grid[0].length;
    this.paths = (this.map.paths || [this.map.path]).map(pts => this.buildPath(pts));
    ({ pts: this.pts, cum: this.cum, len: this.len } = this.paths[0]); this.spawnPi = 0;
    this.ac = o.academy || {};   // Shinobi-Akademie: dauerhafte Boni (data/academy.js)
    this.coins = this.diff.start + (this.ac.startCoins || 0); this.lives = this.diff.lives + (this.ac.lives || 0); this.maxLives = this.lives;
    this.wave = 0; this.maxWave = this.diff.waves; this.doneWave = 0;
    this.spawners = []; this.towers = []; this.enemies = []; this.projs = []; this.events = [];
    this.t = 0; this.acc = 0; this.nid = 1; this.over = false; this.won = false; this.god = false;
    this.dirty = true; this.synergies = []; this.boss = null; this.timeScale = 1;
    this.rafts = (this.map.rafts || []).map(r => ({ ...r, x: r.a[0], y: r.a[1] })); this.updRafts();
    const L = this.map.lava; this.vents = (this.map.vents || []).map(([x, y], i) => ({ x: x + 0.5, y: y + 0.5, cd: L.every * (0.45 + i * 0.22), warned: false }));
    this.stats = { kills: 0, coins: 0, leaks: 0, crits: 0, reactions: 0, evolves: 0, upgrades: 0, t5: 0, abilities: 0, ults: 0, income: 0, rocks: 0,
      dmg: {}, xp: {}, heroXp: 0, used: new Set(), bossKills: 0, minibossKills: 0, synergySeen: new Set() };
  }

  // ───────── Pfad ─────────
  buildPath(raw) {
    const pts = raw.map(([x, y]) => ({ x, y })), cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    return { pts, cum, len: cum[cum.length - 1] };
  }
  pathLen(pi = 0) { return this.paths[pi].len; }
  posAt(d, out = {}, pi = 0) {
    const P = this.paths[pi] || this.paths[0], pts = P.pts, cum = P.cum;
    d = Math.max(0, Math.min(P.len, d));
    let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
    const a = pts[i - 1], b = pts[i], seg = cum[i] - cum[i - 1], f = seg ? (d - cum[i - 1]) / seg : 0;
    out.x = a.x + (b.x - a.x) * f; out.y = a.y + (b.y - a.y) * f; out.ang = Math.atan2(b.y - a.y, b.x - a.x);
    return out;
  }
  emit(e) { if (this.events.length < 4000) this.events.push(e); }

  // ───────── Glutkrater: Flöße + Lava-Ausbrüche ─────────
  updRafts() {
    for (const r of this.rafts) raftPos(r, this.t, r);
    for (const t of this.towers) if (t.raft != null) { const r = this.rafts[t.raft]; t.x = r.x + t.ox; t.y = r.y + t.oy; }
  }
  raftAt(x, y) {
    const m = TOWER_R * 0.8;
    return this.rafts.findIndex(r => Math.abs(x - r.x) <= r.w / 2 - m && Math.abs(y - r.y) <= r.h / 2 - m);
  }
  updVents(dt) {
    if (!this.vents.length || !this.enemies.length) return;
    const L = this.map.lava;
    for (const v of this.vents) {
      v.cd -= dt;
      if (!v.warned && v.cd <= L.warn) { v.warned = true; this.emit({ t: 'ventWarn', x: v.x, y: v.y, r: L.r }); }
      if (v.cd > 0) continue;
      v.cd = L.every; v.warned = false;
      const w = Math.max(1, this.wave), dmg = L.dmg * this.diff.hp * (this.map.hpMul || 1) * BAL.hpScale(w) * BAL.endlessScale(w);
      for (const e of this.enemies) {
        if (!e.alive || e.flying || Math.hypot(e.x - v.x, e.y - v.y) > L.r) continue;
        this.damage(e, dmg * (e.boss || e.miniboss ? 0.3 : 1), 'fire', null, { big: true });
        if (e.alive) { e.burnDps = Math.max(e.burnDps, dmg * 0.15); e.burnT = Math.max(e.burnT, 2); }
      }
      this.emit({ t: 'erupt', x: v.x, y: v.y, r: L.r });
    }
  }

  // ───────── Befehle (prüfen alles, geben {ok, why} zurück) ─────────
  cellType(cx, cy) { return this.grid[cy]?.[cx]; }
  terrainAt(x, y) { return this.cellType(Math.floor(x), Math.floor(y)); }
  towerNear(x, y, r = TOWER_R + 0.12) { let best = null, bd = r; for (const t of this.towers) { const d = Math.hypot(t.x - x, t.y - y); if (d < bd) { bd = d; best = t; } } return best; }
  pathDist(x, y) {
    let best = Infinity;
    for (const P of this.paths) for (let i = 1; i < P.pts.length; i++) {
      const a = P.pts[i - 1], b = P.pts[i], dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy;
      const f = L ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / L)) : 0;
      best = Math.min(best, Math.hypot(x - a.x - dx * f, y - a.y - dy * f));
    }
    return best;
  }
  costOf(cid) { return cid === this.heroId ? BAL.hero.cost : Math.round(CREATURES[cid].cost * (1 - (this.ac.cost || 0))); }
  upCost(c) { return Math.round(c * (1 - (this.ac.upCost || 0))); }
  // Bester freier Platz (max. Pfadlänge in Reichweite) – für Bot, Tests und Hinweise
  suggestSpot(cid, range = 3, preferEnd = false) {
    let best = null, bv = -1;
    for (let y = 0.5; y < this.H; y += 0.5) for (let x = 0.5; x < this.W; x += 0.5) {
      if (!this.canPlace(cid, x, y).ok) continue;
      let cov = 0; this.paths.forEach((P, pi) => { for (let d = 0; d < P.len; d += 0.5) { const p = this.posAt(d, {}, pi); if (Math.hypot(p.x - x, p.y - y) <= range) cov += 0.5 * (preferEnd ? 0.5 + d / P.len : 1); } });
      if (this.terrainAt(x, y) === '^') cov *= 1.15;
      if (cov > bv) { bv = cov; best = [x, y]; }
    }
    return best;
  }
  // Freie Platzierung: Mittelpunkt (x, y) in Feld-Koordinaten, Kreis-Fußabdruck TOWER_R
  // Nächster gültiger Platz um (x, y) – macht das Platzieren mit dem Finger verzeihend
  nearestPlace(cid, x, y, maxR = 0.9) {
    const c = this.canPlace(cid, x, y); if (c.ok || /Münzen|Team|vorbei|Held|Zu viele/.test(c.why)) return { x, y, c };
    for (let r = 0.15; r <= maxR + 1e-6; r += 0.15) for (let k = 0; k < 12; k++) {
      const a = k / 12 * Math.PI * 2, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r, q = this.canPlace(cid, px, py);
      if (q.ok) return { x: px, y: py, c: q };
    }
    return { x, y, c };
  }
  canPlace(cid, x, y) {
    if (this.over) return { ok: false, why: 'Run ist vorbei' };
    const isHero = cid === this.heroId && HEROES[cid];
    if (!isHero && !this.loadout.includes(cid)) return { ok: false, why: 'Nicht im Team' };
    if (x < TOWER_R || y < TOWER_R || x > this.W - TOWER_R || y > this.H - TOWER_R) return { ok: false, why: 'Außerhalb der Karte' };
    if (this.pathDist(x, y) < PATH_HALF + TOWER_R * 0.75) return { ok: false, why: 'Zu nah am Pfad' };
    const raft = this.raftAt(x, y), ch = raft >= 0 ? '.' : this.terrainAt(x, y), kind = PLACE[ch];
    if (ch === 'R') return { ok: false, why: 'Fels – antippen zum Räumen' };
    if (ch === 'L') return { ok: false, why: 'Lava! Nur auf den Basalt-Flößen' };
    if (!kind) return { ok: false, why: 'Hier ist kein Platz' };
    const r = TOWER_R * 0.7;
    if (raft < 0) for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]]) { const k = PLACE[this.terrainAt(x + dx, y + dy)]; if (!k || (kind === 'water') !== (k === 'water')) return { ok: false, why: kind === 'water' ? 'Ganz ins Wasser setzen' : 'Hier ist kein Platz' }; }
    const allowed = isHero ? HEROES[cid].place : CREATURES[cid].place;
    if (!allowed.includes(kind)) return { ok: false, why: kind === 'water' ? 'Nur Wasserkreaturen im Wasser' : 'Ungeeigneter Boden' };
    if (this.towers.some(t => Math.hypot(t.x - x, t.y - y) < TOWER_R * 2)) return { ok: false, why: 'Zu nah an einer Kreatur' };
    if (isHero && this.towers.some(t => t.hero)) return { ok: false, why: 'Nur ein Held pro Run' };
    if (this.towers.length >= BAL.run.maxTowers) return { ok: false, why: 'Zu viele Kreaturen' };
    if (this.coins < this.costOf(cid)) return { ok: false, why: 'Zu wenig Münzen' };
    return { ok: true, kind, raft: raft >= 0 ? raft : null };
  }
  place(cid, x, y) {
    const c = this.canPlace(cid, x, y); if (!c.ok) return c;
    const cost = this.costOf(cid); this.coins -= cost;
    const hero = cid === this.heroId && !!HEROES[cid];
    const t = { id: this.nid++, cid, hero, cx: Math.floor(x), cy: Math.floor(y), x, y, ground: c.kind, stage: 0, tiers: [0, 0, 0], spent: cost,
      target: 'first', cd: 0.2, mcd: 0.5, cnt: 0, kills: 0, dmg: 0, ang: Math.PI / 2, abCd: 0, ultCd: 0, disabledT: 0, buffs: [], orbT: 0, dashCd: 3, clonesT: 0,
      hlvl: hero ? (this.hooks.heroStart?.() || 1) : 0, hxp: 0, s: null, prot: false, raft: c.raft };
    if (c.raft != null) { const rf = this.rafts[c.raft]; t.ox = x - rf.x; t.oy = y - rf.y; }
    this.towers.push(t); this.stats.used.add(cid); this.dirty = true; this.refresh();
    this.emit({ t: 'place', tower: t });
    if (hero) this.say(t, 'place');
    if (!hero && [...this.stats.used].filter(id => CREATURES[id]).length >= 5) this.hooks.stat?.('allFive', 1, true);
    return { ok: true, tower: t };
  }
  canUpgrade(t, p) {
    if (t.hero) return { ok: false, why: 'Helden steigen durch Kämpfen auf' };
    const tier = CREATURES[t.cid].paths[p].tiers[t.tiers[p]];
    const r = canTier(t.tiers, p); if (!r.ok) return r;
    const cost = this.upCost(tier.cost);
    if (this.coins < cost) return { ok: false, why: 'Zu wenig Münzen', cost };
    return { ok: true, cost };
  }
  upgrade(id, p) {
    const t = this.tower(id); if (!t) return { ok: false, why: 'Kein Turm' };
    const c = this.canUpgrade(t, p); if (!c.ok) return c;
    this.coins -= c.cost; t.spent += c.cost; t.tiers[p]++; this.stats.upgrades++;
    if (t.tiers[p] === 5) { this.stats.t5++; this.hooks.stat?.('t5', 1); }
    this.hooks.stat?.('upgrades', 1);
    this.dirty = true; this.refresh();
    this.emit({ t: 'upgrade', tower: t, path: p, tier: t.tiers[p] });
    return { ok: true };
  }
  levelOf(cid) { return this.hooks.level?.(cid) ?? 1; }
  branchOf(cid) { return this.hooks.branch?.(cid) ?? 'spirit'; }
  nextEvo(t) {
    if (t.hero) return null;
    const f = formAt(t.cid, t.stage + 1, this.branchOf(t.cid));
    if (!f) return null;
    return { form: f, unlocked: maxStage(t.cid, this.levelOf(t.cid), this.branchOf(t.cid)) >= f.stage };
  }
  evolve(id) {
    const t = this.tower(id); if (!t) return { ok: false, why: 'Kein Turm' };
    const n = this.nextEvo(t);
    if (!n) return { ok: false, why: 'Höchste Form' };
    if (!n.unlocked) return { ok: false, why: `Ab Charakter-Level ${n.form.lvl}` };
    if (this.coins < n.form.cost) return { ok: false, why: 'Zu wenig Münzen' };
    this.coins -= n.form.cost; t.spent += n.form.cost; t.stage++; this.stats.evolves++;
    this.hooks.stat?.('evolves', 1);
    if (t.cid === 'kitsune' && t.stage === 3) this.hooks.stat?.('ninetail', 1);
    this.dirty = true; this.refresh();
    this.emit({ t: 'evolve', tower: t, form: n.form });
    return { ok: true };
  }
  sell(id) {
    const i = this.towers.findIndex(t => t.id === id); if (i < 0) return { ok: false };
    const t = this.towers[i], v = Math.floor(t.spent * (BAL.run.sellRefund + (this.ac.sell || 0)));
    this.coins += v; this.towers.splice(i, 1); this.dirty = true; this.refresh();
    this.emit({ t: 'sell', tower: t, value: v });
    return { ok: true, value: v };
  }
  setTarget(id, mode) { const t = this.tower(id); if (t && TARGETS.includes(mode)) { t.target = mode; return { ok: true }; } return { ok: false }; }
  clearRock(cx, cy) {
    if (this.cellType(cx, cy) !== 'R') return { ok: false, why: 'Kein Fels' };
    if (this.coins < BAL.run.rockClear) return { ok: false, why: 'Zu wenig Münzen' };
    this.coins -= BAL.run.rockClear; this.grid[cy][cx] = '.'; this.stats.rocks++; this.hooks.stat?.('rocks', 1);
    this.emit({ t: 'rock', cx, cy }); return { ok: true };
  }
  tower(id) { return this.towers.find(t => t.id === id); }

  // ───────── Wellen ─────────
  canStartWave() {
    if (this.over) return false;
    if (this.wave >= this.maxWave) return false;
    return this.spawners.length === 0;
  }
  startWave() {
    if (!this.canStartWave()) return { ok: false };
    if (this.enemies.length > 0 && this.wave > 0) { const b = BAL.run.earlyCall(this.wave); this.gain(b); this.emit({ t: 'early', coins: b }); }
    this.wave++;
    let def = waveDef(this.wave);
    const mx = this.map.mix?.(this.wave, def.groups); if (mx) def = { ...def, groups: mx.groups, tip: mx.tip || def.tip };
    for (const g of def.groups) this.spawners.push({ e: g.e, left: Math.round(g.n), gap: g.gap, t: g.delay, mods: g.mods || [], wave: this.wave });
    this.emit({ t: 'wave', wave: this.wave, def });
    if (def.boss) this.emit({ t: 'bossWarn', boss: def.boss });
    return { ok: true };
  }
  waveRunning() { return this.spawners.length > 0 || this.enemies.length > 0; }

  spawn(kind, mods = [], d = 0, wave = this.wave, pi = null) {
    if (pi === null) { pi = this.spawnPi; this.spawnPi = (this.spawnPi + 1) % this.paths.length; }
    const def = ENEMIES[kind] || BOSSES[kind]; if (!def) return null;
    const boss = !!def.boss, elite = mods.includes('elite');
    const scale = BAL.endlessScale(wave);
    let hp = def.hp * this.diff.hp * (this.map.hpMul || 1) * scale * (boss || def.miniboss ? 1 : BAL.hpScale(wave));
    if (elite) hp *= 2.2;
    const res = { ...(def.res || {}) };
    if (mods.includes('armored')) res.phys = Math.max(0.25, (res.phys ?? 1) * 0.6);
    const e = { id: this.nid++, kind, def, hp, maxHp: hp, d, x: 0, y: 0, ang: 0, r: def.r * (elite ? 1.2 : 1), h: def.h,
      speed: def.speed * this.diff.speed * (mods.includes('fast') ? 1.3 : 1), slowPct: 0, slowT: 0, burnDps: 0, burnT: 0, burnSrc: null,
      stunT: 0, shield: 0, flying: !!def.flying, camo: !!def.camo || mods.includes('camo'), elite, mods, res, dmgBy: {}, vuln: 0, vulnT: 0, revealT: 0, brkT: 0,
      elem: null, elemT: 0, reactT: 0, abT: 1 + this.rng() * 2, regen: mods.includes('regen') ? 0.02 : 0, wave, boss, miniboss: !!def.miniboss,
      guard: def.guard ? hp * def.guard.pct : 0, guardT: 0,
      heavy: !!def.heavy, pi, phase: 0, flyT: 0, flyCd: 6, breathCd: 4, addCd: 5, roarT: 0, cryT: 0, hitT: 0, alive: true, coinMul: 1 };
    this.posAt(d, e, pi);
    this.enemies.push(e);
    if (boss) { this.boss = e; this.emit({ t: 'boss', e }); }
    this.emit({ t: 'spawn', e });
    return e;
  }

  // ───────── Hauptschleife ─────────
  tick(dt) {
    if (this.over) return;
    this.acc += dt * this.timeScale;
    let n = 0;
    while (this.acc >= BAL.tick && n < BAL.maxSubsteps) { this.step(BAL.tick); this.acc -= BAL.tick; n++; }
    if (n >= BAL.maxSubsteps) this.acc = 0;
  }
  step(dt) {
    this.t += dt;
    for (const s of this.spawners) {
      s.t -= dt;
      while (s.t <= 0 && s.left > 0) { this.spawn(s.e, s.mods, 0, s.wave); s.left--; s.t += s.gap; }
    }
    this.spawners = this.spawners.filter(s => s.left > 0);
    if (this.rafts.length) this.updRafts();
    this.updVents(dt);
    let buffChange = false;
    for (const t of this.towers) {
      if (t.buffs.length) { const before = t.buffs.length; t.buffs = t.buffs.filter(b => (b.t -= dt) > 0); if (t.buffs.length !== before) buffChange = true; }
    }
    if (buffChange) this.dirty = true;
    if (this.dirty) this.refresh();
    for (const e of this.enemies) if (e.alive) this.updEnemy(e, dt);
    if (this.over) return; // verloren: kein Wellenende/Sieg mehr im selben Schritt
    for (const t of this.towers) this.updTower(t, dt);
    this.updProjs(dt);
    if (this.enemies.some(e => !e.alive)) this.enemies = this.enemies.filter(e => e.alive);
    if (this.spawners.length === 0 && this.enemies.length === 0 && this.doneWave < this.wave) this.waveEnd();
  }

  // ───────── Gegner ─────────
  updEnemy(e, dt) {
    if (e.hitT > 0) e.hitT -= dt;
    if (e.slowT > 0 && (e.slowT -= dt) <= 0) e.slowPct = 0;
    if (e.vulnT > 0 && (e.vulnT -= dt) <= 0) e.vuln = 0;
    if (e.revealT > 0) e.revealT -= dt;
    if (e.brkT > 0) e.brkT -= dt;
    if (e.elemT > 0 && (e.elemT -= dt) <= 0) e.elem = null;
    if (e.reactT > 0) e.reactT -= dt;
    if (e.cryT > 0) e.cryT -= dt;
    if (e.guardT > 0) e.guardT -= dt;
    if (e.burnT > 0) { e.burnT -= dt; this.damage(e, e.burnDps * dt, 'fire', e.burnSrc, { dot: true }); if (!e.alive) return; }
    if (e.regen && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.regen * dt);
    const def = e.def;
    if (def.guard && e.guard > 0) for (const o of this.enemies) if (o !== e && o.alive && Math.hypot(o.x - e.x, o.y - e.y) <= def.guard.r) o.guardT = 0.25;
    if (def.heal || def.shield || def.cry) {
      e.abT -= dt;
      if (e.abT <= 0) {
        const a = def.heal || def.shield || def.cry; e.abT = a.every;
        for (const o of this.enemies) {
          if (!o.alive || o === e && !def.cry || Math.hypot(o.x - e.x, o.y - e.y) > a.r) continue;
          if (def.heal) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * a.pct);
          if (def.shield) o.shield = Math.max(o.shield, o.maxHp * a.pct);
          if (def.cry) o.cryT = a.dur;
        }
        this.emit({ t: def.heal ? 'heal' : def.shield ? 'shield' : 'cry', x: e.x, y: e.y, r: a.r });
      }
    }
    if (e.boss) this.updBoss(e, dt);
    if (e.stunT > 0) { e.stunT -= dt; return; }
    if (e.roarT > 0) { e.roarT -= dt; return; }
    let sp = e.speed * (1 - Math.min(0.75, e.slowPct * (e.heavy ? 0.5 : 1)));
    if (e.cryT > 0) sp *= 1 + (ENEMIES.oni.cry.speed);
    if (e.boss) { const ph = def.phases[e.phase]; if (e.flyT > 0) sp *= def.phases[1].fly.speed; if (e.phase >= 3) sp *= ph.enrage || 1; }
    e.d += sp * dt;
    this.posAt(e.d, e, e.pi);
    if (e.d >= this.paths[e.pi].len) this.leak(e);
  }
  updBoss(e, dt) {
    const def = e.def, ratio = e.hp / e.maxHp;
    let ph = 0; def.phases.forEach((p, i) => { if (ratio <= p.at) ph = i; });
    if (ph > e.phase) { e.phase = ph; e.roarT = 1.4; this.emit({ t: 'bossPhase', e, phase: ph, name: def.phases[ph].name, desc: def.phases[ph].desc }); }
    if (e.phase >= 1) {
      const f = def.phases[1].fly;
      if (e.flyT > 0) { e.flyT -= dt; if (e.flyT <= 0) { e.flying = false; this.emit({ t: 'bossLand', e }); } }
      else if ((e.flyCd -= dt) <= 0) { e.flyCd = f.every; e.flyT = f.dur; e.flying = true; this.emit({ t: 'bossFly', e }); }
    }
    if (e.phase >= 2 && e.flyT <= 0) {
      const b = def.phases[2].breath;
      if ((e.breathCd -= dt) <= 0) {
        e.breathCd = b.every;
        const ts = this.towers.filter(t => !t.prot).map(t => ({ t, d: Math.hypot(t.x - e.x, t.y - e.y) })).filter(o => o.d < 4).sort((a, c) => a.d - c.d).slice(0, b.n);
        for (const o of ts) o.t.disabledT = b.dur;
        e.roarT = Math.max(e.roarT, 0.9);
        this.emit({ t: 'breath', e, targets: ts.map(o => o.t) });
      }
    }
    if (e.phase >= 3) {
      const a = def.phases[3].adds;
      if ((e.addCd -= dt) <= 0) { e.addCd = a.every; for (let i = 0; i < a.n; i++) this.spawn(a.kind, [], Math.max(0, e.d - 0.6 - i * 0.4), e.wave, e.pi); this.emit({ t: 'bossSummon', e }); }
    }
  }
  leak(e) {
    e.alive = false; this.stats.leaks++;
    const lost = Math.min(this.lives, e.def.lives);
    if (!this.god) this.lives -= lost;
    this.emit({ t: 'leak', e, lives: lost });
    const hero = this.towers.find(t => t.hero); if (hero && this.rng() < 0.4) this.say(hero, 'leak');
    if (e.boss) this.boss = null;
    if (this.lives <= 0 && !this.god) { this.lives = 0; this.over = true; this.won = false; this.emit({ t: 'lose' }); }
  }

  // ───────── Schaden / Status / Reaktionen ─────────
  damage(e, amount, type, src, o = {}) {
    if (!e.alive || amount <= 0) return 0;
    const s = src?.s;
    let mul = type === 'astral' ? 1 : (e.res[type] ?? 1);
    if (type === 'phys' && mul < 1) mul += (1 - mul) * Math.min(1, (s?.pierceArmor || 0) + (e.brkT > 0 ? 1 : 0));
    if (o.ignoreRes) mul = 1;
    let dmg = amount * mul * (o.mul || 1);
    if (e.vulnT > 0) dmg *= 1 + e.vuln;
    if (s && (e.boss || e.miniboss)) dmg *= s.bossMul;
    let crit = false;
    if (!o.dot && s && s.crit.ch > 0 && this.rng() < s.crit.ch) { dmg *= s.crit.mult; crit = true; this.stats.crits++; }
    if (e.guardT > 0) dmg *= 1 - ENEMIES.bearer.guard.red;
    if (e.guard > 0) {
      const m = type === 'lightning' || type === 'earth' ? 2 : 1, a = Math.min(e.guard, dmg * m);
      e.guard -= a; dmg -= a / m;
      if (e.guard <= 0) this.emit({ t: 'guardBreak', e, x: e.x, y: e.y });
      if (dmg <= 0.0001) { e.hitT = 0.08; if (!o.dot) this.emit({ t: 'hit', e, x: e.x, y: e.y, dmg: 0, crit, type, guard: true }); return 0; }
    }
    if (e.shield > 0) { const a = Math.min(e.shield, dmg); e.shield -= a; dmg -= a; if (dmg <= 0) { e.hitT = 0.08; return 0; } }
    const real = Math.min(e.hp, dmg);
    e.hp -= dmg; e.hitT = o.dot ? e.hitT : 0.09;
    if (src) {
      const k = src.cid; e.dmgBy[k] = (e.dmgBy[k] || 0) + real; src.dmg += real;
      this.stats.dmg[k] = (this.stats.dmg[k] || 0) + real;
      if (src.hero) this.heroXp(src, real * BAL.hero.dmgXp);
    }
    if (!o.dot) this.emit({ t: 'hit', e, x: e.x, y: e.y, dmg, crit, type, big: o.big });
    // Reaktion: anderes Element auf markiertem Gegner
    if (!o.dot && !o.noReact && ELEMENTAL.has(type)) {
      if (e.elem && e.elem !== type && e.elemT > 0 && e.reactT <= 0) {
        const key = [e.elem, type].sort().join('+'), r = REACTIONS[key];
        if (r) this.react(e, r, dmg, src);
      }
      e.elem = type; e.elemT = BAL.elem.mark;
    }
    if (e.hp <= 0) this.kill(e, src, -e.hp, type);
    return real;
  }
  react(e, r, dmg, src) {
    e.reactT = BAL.elem.reactCd; this.stats.reactions++; this.hooks.stat?.('reactions', 1);
    this.emit({ t: 'react', e, x: e.x, y: e.y, name: r.name, color: r.color });
    const base = Math.max(6, dmg);
    if (r.bonus) this.damage(e, base * r.bonus * (1 + (this.ac.react || 0)), 'astral', src, { noReact: true });
    if (r.brk) e.brkT = r.brk;
    if (r.slow) { e.slowPct = Math.max(e.slowPct, r.slow[0]); e.slowT = Math.max(e.slowT, r.slow[1]); }
    if (r.stun && !e.boss) e.stunT = Math.max(e.stunT, r.stun);
    if (r.burnMul) { e.burnDps = Math.max(e.burnDps, base * r.burnMul / 3); e.burnT = 3; e.burnSrc = src; }
    if (r.coins) this.gain(r.coins);
    if (r.aoe) for (const o of this.enemies) if (o !== e && o.alive && Math.hypot(o.x - e.x, o.y - e.y) < r.aoe) this.damage(o, base * r.aoeMul, 'astral', src, { noReact: true });
  }
  applyStatus(e, s, src) {
    if (!e.alive) return;
    if (s.burn.dps > 0) { if (s.burn.dps >= e.burnDps || e.burnT <= 0) { e.burnDps = s.burn.dps; e.burnSrc = src; } e.burnT = Math.max(e.burnT, s.burn.dur); }
    if (s.slow.pct > 0) { e.slowPct = Math.max(e.slowPct, s.slow.pct); e.slowT = Math.max(e.slowT, s.slow.dur); }
    if (s.stun.ch > 0 && !e.boss && this.rng() < s.stun.ch * (e.heavy ? 0.4 : 1)) { e.stunT = Math.max(e.stunT, s.stun.dur); this.emit({ t: 'stun', e }); }
    if (s.mark > 0) { e.vuln = Math.max(e.vuln, s.mark); e.vulnT = Math.max(e.vulnT, 3); }
    if (s.brk > 0) e.brkT = Math.max(e.brkT, s.brk);
  }
  kill(e, src, over = 0, type = 'phys') {
    if (!e.alive) return; e.alive = false;
    const def = e.def;
    const coins = Math.round((def.coins || 0) * this.diff.coins * (e.elite ? 2 : 1) * e.coinMul);
    this.gain(coins);
    this.stats.kills++; this.hooks.stat?.('kills', 1);
    if (src) { src.kills++; if (src.s?.bounty) this.gain(src.s.bounty); }
    // Charakter-XP nach Schadensanteil verteilen (mehrere Kreaturen am selben Gegner teilen fair)
    const base = (def.xp || 1) * (e.elite ? 2.5 : 1) * (1 + BAL.char.waveScale * this.wave) * (e.boss ? BAL.char.bossMul : 1);
    const total = Object.values(e.dmgBy).reduce((a, b) => a + b, 0);
    if (total > 0) for (const k in e.dmgBy) {
      const share = base * e.dmgBy[k] / total;
      if (k === this.heroId) { const ht = this.towers.find(t => t.hero); if (ht) this.heroXp(ht, share * 3); }
      else this.charXp(k, share);
    }
    if (e.boss) { this.stats.bossKills++; this.hooks.stat?.('bossKills', 1); this.hooks.accXp?.(BAL.acc.bossKill * this.diff.acc, 'boss'); this.boss = null; this.emit({ t: 'bossDie', e }); }
    if (e.miniboss) { this.stats.minibossKills++; this.hooks.stat?.('minibossKills', 1); this.hooks.accXp?.(BAL.acc.miniBoss * this.diff.acc, 'miniboss'); }
    if (def.blast) {
      let tb = null, bd = def.blast.r;
      for (const t of this.towers) { const d = Math.hypot(t.x - e.x, t.y - e.y); if (!t.prot && d < bd) { bd = d; tb = t; } }
      if (tb) tb.disabledT = Math.max(tb.disabledT, def.blast.dur);
      this.emit({ t: 'blast', x: e.x, y: e.y, r: def.blast.r, tower: tb });
    }
    if (def.split) {
      const kids = [], mods = e.mods.filter(m => m !== 'elite');
      for (let i = 0; i < def.split.n; i++) { const m = this.spawn(def.split.kind, e.elite ? ['elite', ...mods] : mods, Math.max(0, e.d - (def.layer ? 0.18 : 0.25) * i), e.wave, e.pi); if (m) { m.coinMul = 1; kids.push(m); } }
      if (def.layer) this.emit({ t: 'pop', x: e.x, y: e.y, layer: def.layer, n: kids.length });
      if (over > 0.5 && kids[0]) this.damage(kids[0], over, type, src, { noReact: true, ignoreRes: true });   // Treffer reißt mehrere Schichten durch
    }
    this.emit({ t: 'kill', e, x: e.x, y: e.y, coins, src });
  }
  charXp(cid, raw) {
    const got = this.hooks.charXp ? this.hooks.charXp(cid, raw, this.wave) : raw;
    this.stats.xp[cid] = (this.stats.xp[cid] || 0) + (got || 0);
  }
  gain(c) { if (c > 0) { this.coins += c; this.stats.coins += c; } }

  // ───────── Held ─────────
  heroXp(t, amt) {
    if (amt <= 0) return;
    t.hxp += amt; this.stats.heroXp += amt; this.hooks.heroXp?.(amt);
    const h = HEROES[t.cid];
    while (t.hlvl < BAL.hero.maxLevel && t.hxp >= BAL.hero.need(t.hlvl)) {
      t.hxp -= BAL.hero.need(t.hlvl); t.hlvl++;
      const m = h.milestones.find(x => x.lvl === t.hlvl);
      this.emit({ t: 'heroLevel', tower: t, lvl: t.hlvl, milestone: m });
      if (t.hlvl === 15) this.say(t, 'ascend'); else if (t.hlvl === 20) this.say(t, 'master'); else if (m || this.rng() < 0.3) this.say(t, 'level');
      if (t.hlvl >= 10) this.hooks.stat?.('hero10', 1, true);
      if (t.hlvl >= 20) this.hooks.stat?.('hero20', 1, true);
      this.dirty = true;
    }
  }
  say(t, kind) {
    const lines = HEROES[t.cid]?.lines?.[kind]; if (!lines) return;
    this.emit({ t: 'say', tower: t, text: lines[Math.floor(this.rng() * lines.length)] });
  }
  heroForm(t) { const ms = HEROES[t.cid].milestones; let f = 0; for (const m of ms) if (t.hlvl >= m.lvl && m.form) f = m.form; return f; }
  heroCdr(t) { const ms = HEROES[t.cid].milestones; return ms.filter(m => t.hlvl >= m.lvl && m.cdr).reduce((a, m) => a + m.cdr, 0); }

  // ───────── Werte neu berechnen: Basis → Synergien → Auren → Buffs ─────────
  refresh() {
    this.dirty = false;
    const A = this.ac;
    for (const t of this.towers) {
      const s = t.s = t.hero ? baseStats(t) : baseStats(t, this.levelOf(t.cid), this.branchOf(t.cid));
      s.dmg *= (1 + (A.dmg || 0)) * (s.dmgType && s.dmgType !== 'phys' ? 1 + (A.elem || 0) : 1); s.rate *= 1 + (A.rate || 0); s.range *= 1 + (A.range || 0);
      if (A.crit) s.crit.ch += A.crit; if (A.boss) s.bossMul *= 1 + A.boss;
      if (A.burn) s.burn.dps *= 1 + A.burn; if (A.slow) s.slow.pct = Math.min(0.85, s.slow.pct * (1 + A.slow));
      if (A.income && s.income) s.income *= 1 + A.income;
    }
    const R = BAL.run.synergyRange, act = [];
    for (const sy of SYNERGIES) {
      const A = this.towers.filter(t => t.cid === sy.a), B = this.towers.filter(t => t.cid === sy.b);
      const pairA = new Set(), pairB = new Set(), links = [];
      for (const a of A) for (const b of B) if (Math.hypot(a.x - b.x, a.y - b.y) <= R) { pairA.add(a); pairB.add(b); links.push([a, b]); }
      for (const a of pairA) applyFx(a.s, sy.fxA);
      for (const b of pairB) applyFx(b.s, sy.fxB);
      if (links.length) { act.push({ sy, links }); if (!this.stats.synergySeen.has(sy.id)) { this.stats.synergySeen.add(sy.id); this.hooks.stat?.('synergies', 1); this.emit({ t: 'synergy', sy }); } }
    }
    this.synergies = act;
    // Auren: pro Wert gilt die stärkste Quelle (kein Stapeln)
    const aura = new Map();
    for (const src of this.towers) {
      const sp = src.s.support; if (!sp.range) continue;
      for (const t of this.towers) {
        if (t === src || Math.hypot(t.x - src.x, t.y - src.y) > sp.range) continue;
        const a = aura.get(t) || { rate: 0, dmg: 0, rng: 0, camo: false, prot: false };
        a.rate = Math.max(a.rate, sp.rate); a.dmg = Math.max(a.dmg, sp.dmg); a.rng = Math.max(a.rng, sp.rng);
        a.camo ||= sp.camo; a.prot ||= sp.protect; aura.set(t, a);
      }
    }
    for (const t of this.towers) {
      const s = t.s, a = aura.get(t);
      t.prot = false;
      if (a) { s.rate *= 1 + a.rate; s.dmg *= 1 + a.dmg; s.range *= 1 + a.rng; if (a.camo) s.camo = true; t.prot = a.prot; s.aura = a; }
      for (const b of t.buffs) applyFx(s, b.fx);
      if (t.ground === 'high') { s.range *= 1 + BAL.run.highRange; s.mortar.range *= 1 + BAL.run.highRange; }
      if (t.ground === 'water' && s.water) s.rate *= 1 + s.water;
      if (t.raft != null) s.dmg *= 1 + RAFT_BONUS;
    }
  }

  // ───────── Türme ─────────
  canSee(s, e) { return (!e.camo || s.camo || e.revealT > 0) && (!e.flying || s.flying); }
  pick(t, range, mode, filter) {
    const s = t.s, r2 = range * range; let best = null, bv = -Infinity, cands = mode === 'random' ? [] : null;
    for (const e of this.enemies) {
      if (!e.alive || !this.canSee(s, e) || (filter && !filter(e))) continue;
      const dx = e.x - t.x, dy = e.y - t.y, d2 = dx * dx + dy * dy; if (d2 > r2) continue;
      let v; const pr = e.d - this.paths[e.pi].len;
      switch (mode) {
        case 'last': v = -pr; break;
        case 'strong': v = e.hp * 1000 + pr; break;
        case 'weak': v = -e.hp * 1000 + pr; break;
        case 'close': v = -d2; break;
        case 'fast': v = e.speed * 100 + pr; break;
        case 'boss': v = (e.boss ? 3e6 : e.miniboss ? 2e6 : e.elite ? 1e6 : 0) + pr; break;
        case 'random': cands.push(e); continue;
        default: v = pr;
      }
      if (v > bv) { bv = v; best = e; }
    }
    if (cands) best = cands.length ? cands[Math.floor(this.rng() * cands.length)] : null;
    return best;
  }
  updTower(t, dt) {
    const s = t.s; if (!s) return;
    if (t.abCd > 0) t.abCd -= dt; if (t.ultCd > 0) t.ultCd -= dt;
    if (t.clonesT > 0) t.clonesT -= dt;
    if (t.disabledT > 0) { t.disabledT -= dt; return; }
    // Orbs
    if (s.orbs.n > 0 && (t.orbT -= dt) <= 0) {
      t.orbT = 0.4; const R = s.orbs.r + 0.15 * s.orbs.n;
      for (let i = 0; i < s.orbs.n; i++) {
        const a = this.t * 2.2 + i * Math.PI * 2 / s.orbs.n, ox = t.x + Math.cos(a) * R, oy = t.y + Math.sin(a) * R;
        for (const e of this.enemies) if (e.alive && this.canSee(s, e) && Math.hypot(e.x - ox, e.y - oy) < 0.55) {
          this.damage(e, s.orbs.dmg, 'spirit', t);
          if (s.orbs.slow) { e.slowPct = Math.max(e.slowPct, s.orbs.slow); e.slowT = Math.max(e.slowT, 0.6); }
        }
      }
    }
    // Ahnenfuchs-Sprint
    if (s.dash.every > 0 && this.enemies.length && (t.dashCd -= dt) <= 0) {
      t.dashCd = s.dash.every;
      this.emit({ t: 'dash', tower: t });
      for (const e of this.enemies) if (e.alive && !e.flying) this.damage(e, s.dmg * s.dash.mul, 'spirit', t, { big: true });
    }
    // Mörser
    if (s.mortar.dmg > 0 && (t.mcd -= dt) <= 0) {
      const e = this.pick(t, s.mortar.range, t.target === 'first' ? 'strong' : t.target, o => !o.flying);
      if (e) {
        t.mcd = 1 / s.mortar.rate;
        const lead = Math.min(this.paths[e.pi].len, e.d + e.speed * 0.9), p = this.posAt(lead, {}, e.pi);
        this.projs.push({ lob: true, sx: t.x, sy: t.y, x: t.x, y: t.y, tx: p.x, ty: p.y, T: 0.9, tt: 0, dmg: s.mortar.dmg, aoe: s.mortar.aoe, type: 'earth', src: t, kind: 'shell',
          burn: s.mortar.burn, stun: s.mortar.stun, id: this.nid++ });
        this.emit({ t: 'mortar', tower: t });
      } else t.mcd = 0.2;
    }
    if (s.atk === 'none') return;
    t.cd -= dt;
    if (t.cd > 0) return;
    const range = s.range;
    const tgt = s.atk === 'pulse' ? this.pick(t, range, 'first') : this.pick(t, range, t.target);
    if (!tgt) { t.cd = 0.05; return; }
    t.cd = 1 / s.rate;
    t.ang = Math.atan2(tgt.y - t.y, tgt.x - t.x);
    t.cnt++;
    this.attack(t, tgt, 0, 0);
    if (s.multi > 0 && this.rng() < s.multi) this.attack(t, tgt, 0, 0, true);
    if (t.clonesT > 0) for (let i = 0; i < 3; i++) { const a = i * 2.1 + this.t; this.attack(t, tgt, Math.cos(a) * 0.9, Math.sin(a) * 0.9, true); }
  }
  attack(t, tgt, ox, oy, extra) {
    const s = t.s, x = t.x + ox, y = t.y + oy;
    const ev = (sp, key) => sp.n > 0 && t.cnt % sp.n === 0 && !extra;
    if (s.atk === 'pulse') {
      for (const e of this.enemies) {
        if (!e.alive || !this.canSee(s, e) || Math.hypot(e.x - t.x, e.y - t.y) > s.range) continue;
        this.damage(e, s.dmg, s.dmgType, t); this.applyStatus(e, s, t);
        if (s.knock && !e.heavy && e.alive) { e.d = Math.max(0, e.d - s.knock); this.posAt(e.d, e, e.pi); }
      }
      this.emit({ t: 'pulse', tower: t, r: s.range });
      return;
    }
    const specials = (tx, ty) => {
      for (const sp of [s.every, s.every2]) if (ev(sp)) {
        if (sp.proj === 'reap') this.strike(t, t.x, t.y, s.dmg * sp.mul, sp.aoe, sp.dmgType || s.dmgType, 'reap');
        else this.fire(t, x, y, Math.atan2(ty - y, tx - x), tgt, { dmg: s.dmg * sp.mul, aoe: sp.aoe, type: sp.dmgType || s.dmgType, kind: sp.proj, pierce: 1, homing: true, speed: 11 });
      }
    };
    if (s.atk === 'breath') { // Atem-Kegel: alle Gegner im Kegel Richtung Ziel
      const aim = Math.atan2(tgt.y - y, tgt.x - x);
      for (const e of this.enemies) {
        if (!e.alive || !this.canSee(s, e)) continue;
        const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy); if (d > s.range + e.r) continue;
        let da = Math.abs(Math.atan2(dy, dx) - aim); if (da > Math.PI) da = 2 * Math.PI - da;
        if (da > s.cone / 2 && d > 0.5) continue;
        this.damage(e, s.dmg, s.dmgType, t); this.applyStatus(e, s, t);
        if (s.knock && !e.heavy && e.alive) { e.d = Math.max(0, e.d - s.knock * 0.3); this.posAt(e.d, e, e.pi); }
      }
      this.emit({ t: 'cone', tower: t, ang: aim, r: s.range, cone: s.cone, type: s.dmgType });
      specials(tgt.x, tgt.y);
      return;
    }
    if (s.atk === 'slash') { // Nahkampf-Hieb + Nachbartreffer
      this.damage(tgt, s.dmg, s.dmgType, t); this.applyStatus(tgt, s, t);
      let n = s.cleave;
      for (const e of this.enemies) { if (n <= 0) break; if (e === tgt || !e.alive || !this.canSee(s, e) || Math.hypot(e.x - tgt.x, e.y - tgt.y) > 0.8) continue; this.damage(e, s.dmg * 0.7, s.dmgType, t); this.applyStatus(e, s, t); n--; }
      this.emit({ t: 'slash', tower: t, x: tgt.x, y: tgt.y });
      specials(tgt.x, tgt.y);
      return;
    }
    if (s.atk === 'chain') {
      const hit = [tgt], pts = [{ x, y }, { x: tgt.x, y: tgt.y }]; let dmg = s.dmg, cur = tgt;
      this.damage(tgt, dmg, s.dmgType, t); this.applyStatus(tgt, s, t);
      for (let i = 0; i < s.chain.n; i++) {
        dmg *= s.chain.fall; let nb = null, nd = s.chain.range;
        for (const e of this.enemies) { if (!e.alive || hit.includes(e) || !this.canSee(s, e)) continue; const d = Math.hypot(e.x - cur.x, e.y - cur.y); if (d < nd) { nd = d; nb = e; } }
        if (!nb) break;
        hit.push(nb); pts.push({ x: nb.x, y: nb.y }); this.damage(nb, dmg, s.dmgType, t); this.applyStatus(nb, s, t); cur = nb;
      }
      this.emit({ t: 'bolt', tower: t, pts });
      for (const sp of [s.every, s.every2]) if (ev(sp)) this.strike(t, tgt.x, tgt.y, s.dmg * sp.mul, sp.aoe, sp.dmgType || s.dmgType, sp.proj);
      return;
    }
    // Projektile
    const aim = Math.atan2(tgt.y - y, tgt.x - x);
    let special = false;
    for (const sp of [s.every, s.every2]) if (ev(sp)) {
      special = true;
      const n = sp.shots || 1;
      for (let i = 0; i < n; i++) {
        const a = aim + (i - (n - 1) / 2) * 0.35;
        this.fire(t, x, y, a, tgt, { dmg: s.dmg * sp.mul, aoe: sp.aoe, type: sp.dmgType || s.dmgType, kind: sp.proj, pierce: 1, homing: true, speed: s.speed * 0.85 });
      }
    }
    if (special && s.every.n && t.cnt % s.every.n === 0 && s.every.proj === 'fireball') { this.emit({ t: 'shot', tower: t, n: 1, special: true, extra: !!extra, ox, oy }); return; } // Feuerball ersetzt den Wurf
    for (let i = 0; i < s.shots; i++) {
      const off = (i - (s.shots - 1) / 2) * s.spread;
      this.fire(t, x, y, aim + off, tgt, { dmg: s.dmg, aoe: s.aoe, type: s.dmgType, kind: s.proj, pierce: s.pierce, homing: s.homing && Math.abs(off) < 0.01, speed: s.speed });
    }
    this.emit({ t: 'shot', tower: t, n: s.shots, extra: !!extra, ox, oy });
  }
  fire(t, x, y, a, tgt, o) {
    const sp = o.speed || 14;
    this.projs.push({ id: this.nid++, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, sp, dmg: o.dmg, aoe: o.aoe || 0, type: o.type, kind: o.kind, pierce: o.pierce || 1,
      homing: o.homing, tgt, src: t, life: t.s.range / sp * 1.8 + 0.35, hits: [] });
  }
  strike(t, x, y, dmg, aoe, type, kind) {
    for (const e of this.enemies) if (e.alive && Math.hypot(e.x - x, e.y - y) <= aoe + e.r) { this.damage(e, dmg, type, t, { big: true }); this.applyStatus(e, t.s, t); }
    this.emit({ t: 'strike', x, y, r: aoe, kind, tower: t });
  }
  updProjs(dt) {
    const keep = [];
    for (const p of this.projs) {
      if (p.lob) {
        p.tt += dt; const f = Math.min(1, p.tt / p.T);
        p.x = p.sx + (p.tx - p.sx) * f; p.y = p.sy + (p.ty - p.sy) * f; p.z = Math.sin(f * Math.PI) * 2.2;
        if (f >= 1) {
          for (const e of this.enemies) if (e.alive && !e.flying && Math.hypot(e.x - p.x, e.y - p.y) <= p.aoe + e.r) {
            this.damage(e, p.dmg, p.type, p.src, { big: true });
            if (p.burn) { e.burnDps = Math.max(e.burnDps, p.burn); e.burnT = Math.max(e.burnT, 3); e.burnSrc = p.src; }
            if (p.stun && !e.boss) e.stunT = Math.max(e.stunT, p.stun);
          }
          this.emit({ t: 'boom', x: p.x, y: p.y, r: p.aoe, kind: 'shell' });
          continue;
        }
        keep.push(p); continue;
      }
      if (p.homing && p.tgt?.alive) {
        const a = Math.atan2(p.tgt.y - p.y, p.tgt.x - p.x); p.vx = Math.cos(a) * p.sp; p.vy = Math.sin(a) * p.sp;
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      const s = p.src.s;
      for (const e of this.enemies) {
        if (!e.alive || p.hits.includes(e.id) || (e.flying && !s.flying) || (e.camo && !s.camo && e.revealT <= 0)) continue;
        const rr = e.r + 0.14; const dx = e.x - p.x, dy = e.y - p.y;
        if (dx * dx + dy * dy > rr * rr) continue;
        p.hits.push(e.id);
        this.damage(e, p.dmg, p.type, p.src, { big: p.aoe > 0.9 }); this.applyStatus(e, s, p.src);
        if (p.aoe > 0) {
          for (const o of this.enemies) if (o !== e && o.alive && !o.flying && Math.hypot(o.x - p.x, o.y - p.y) <= p.aoe + o.r) { this.damage(o, p.dmg * 0.7, p.type, p.src); this.applyStatus(o, s, p.src); }
          this.emit({ t: 'boom', x: p.x, y: p.y, r: p.aoe, kind: p.kind });
        }
        if (--p.pierce <= 0) break;
      }
      if (p.pierce > 0 && p.life > 0 && p.x > -2 && p.y > -3 && p.x < this.W + 2 && p.y < this.H + 2) keep.push(p);
      else this.emit({ t: 'projEnd', p });
    }
    this.projs = keep;
  }

  // ───────── Fähigkeiten ─────────
  abilityInfo(t) {
    if (t.hero) {
      const h = HEROES[t.cid], out = [];
      for (const m of h.milestones) {
        if (m.ability) out.push({ slot: 'ab', ...h.abilities[m.ability], id: m.ability, ready: t.hlvl >= m.lvl, need: `Held Lv ${m.lvl}`, left: t.abCd });
        if (m.ultimate) out.push({ slot: 'ult', ...h.abilities[m.ultimate], id: m.ultimate, ready: t.hlvl >= m.lvl, need: `Held Lv ${m.lvl}`, left: t.ultCd });
      }
      return out;
    }
    const d = CREATURES[t.cid], out = [], lvl = this.levelOf(t.cid);
    if (d.ability) out.push({ slot: 'ab', ...d.ability, ready: lvl >= d.ability.lvl && t.stage >= d.ability.stage, need: lvl < d.ability.lvl ? `Charakter-Lv ${d.ability.lvl}` : `${formAt(t.cid, d.ability.stage, this.branchOf(t.cid)).name}`, left: t.abCd });
    if (d.ultimate) out.push({ slot: 'ult', ...d.ultimate, ready: t.stage >= d.ultimate.stage, need: formAt(t.cid, d.ultimate.stage, this.branchOf(t.cid))?.name || '', left: t.ultCd });
    return out;
  }
  useAbility(id, slot = 'ab') {
    const t = this.tower(id); if (!t || this.over) return { ok: false };
    const info = this.abilityInfo(t).find(a => a.slot === slot);
    if (!info || !info.ready) return { ok: false, why: 'Noch nicht freigeschaltet' };
    if ((slot === 'ab' ? t.abCd : t.ultCd) > 0) return { ok: false, why: 'Lädt noch' };
    if (t.disabledT > 0) return { ok: false, why: 'Gestört!' };
    const s = t.s, cdr = t.hero ? this.heroCdr(t) : 0;
    let ok = true;
    switch (info.id) {
      case 'foxstorm': {
        let best = null, bn = -1;
        for (const e of this.enemies) { if (!e.alive || Math.hypot(e.x - t.x, e.y - t.y) > s.range * 1.8) continue; let n = 0; for (const o of this.enemies) if (o.alive && Math.hypot(o.x - e.x, o.y - e.y) < 1.8) n++; if (n > bn) { bn = n; best = e; } }
        if (!best) { ok = false; break; }
        const x = best.x, y = best.y;
        this.emit({ t: 'ability', id: 'foxstorm', tower: t, x, y });
        for (const e of this.enemies) if (e.alive && Math.hypot(e.x - x, e.y - y) < 2.2) { this.damage(e, s.dmg * 22, 'fire', t, { big: true }); if (e.alive) { e.burnDps = Math.max(e.burnDps, s.dmg * 2.5); e.burnT = 4; e.burnSrc = t; } }
        break;
      }
      case 'judgement': {
        const ts = this.enemies.filter(e => e.alive).sort((a, b) => b.hp - a.hp).slice(0, 9);
        if (!ts.length) { ok = false; break; }
        this.emit({ t: 'ability', id: 'judgement', tower: t, targets: ts.map(e => ({ x: e.x, y: e.y })) });
        for (const e of ts) { this.damage(e, s.dmg * 45, 'astral', t, { big: true }); if (e.alive && !e.boss) e.stunT = Math.max(e.stunT, 1.2); }
        this.stats.ults++; this.hooks.stat?.('ults', 1);
        break;
      }
      case 'roar': {
        const ts = this.enemies.filter(e => e.alive && Math.hypot(e.x - t.x, e.y - t.y) < 5).sort((a, b) => b.d - a.d).slice(0, 12);
        if (!ts.length) { ok = false; break; }
        this.emit({ t: 'ability', id: 'roar', tower: t, pts: [{ x: t.x, y: t.y }, ...ts.map(e => ({ x: e.x, y: e.y }))] });
        for (const e of ts) { this.damage(e, s.dmg * 10, 'lightning', t, { big: true }); if (e.alive && !e.boss) e.stunT = Math.max(e.stunT, 1.5); }
        break;
      }
      case 'fortress': {
        this.emit({ t: 'ability', id: 'fortress', tower: t, r: 3.5 });
        for (const e of this.enemies) if (e.alive && Math.hypot(e.x - t.x, e.y - t.y) < 3.5) {
          this.damage(e, s.dmg * 8, 'earth', t, { big: true });
          if (e.alive) { if (!e.heavy) { e.d = Math.max(0, e.d - 1.5); this.posAt(e.d, e, e.pi); } e.slowPct = Math.max(e.slowPct, 0.6); e.slowT = 4; }
        }
        break;
      }
      case 'blessing': {
        this.emit({ t: 'ability', id: 'blessing', tower: t, r: 3.5 });
        for (const o of this.towers) if (Math.hypot(o.x - t.x, o.y - t.y) <= 3.5) o.buffs.push({ id: 'blessing', t: 8, fx: { mul: { rate: 1.4, dmg: 1.2 } } });
        this.dirty = true; break;
      }
      case 'eclipse': {
        this.emit({ t: 'ability', id: 'eclipse', tower: t });
        for (const e of this.enemies) if (e.alive) { e.vuln = Math.max(e.vuln, 0.3); e.vulnT = 8; e.revealT = 8; }
        break;
      }
      case 'clones': t.clonesT = HEROES[t.cid].abilities.clones.dur; this.emit({ t: 'ability', id: 'clones', tower: t }); this.say(t, 'ability'); break;
      case 'blizzard': {
        this.emit({ t: 'ability', id: 'blizzard', tower: t, r: 4 });
        for (const e of this.enemies) if (e.alive && Math.hypot(e.x - t.x, e.y - t.y) < 4) { this.damage(e, s.dmg * 10, 'ice', t, { big: true }); if (e.alive && !e.boss) e.stunT = Math.max(e.stunT, 2.5); if (e.alive) { e.slowPct = Math.max(e.slowPct, 0.5); e.slowT = 5; } }
        break;
      }
      case 'flurry': t.buffs.push({ id: 'flurry', t: 6, fx: { mul: { rate: 3 } } }); this.dirty = true; this.emit({ t: 'ability', id: 'flurry', tower: t }); break;
      case 'quake': {
        this.emit({ t: 'ability', id: 'quake', tower: t, r: 4 });
        for (const e of this.enemies) if (e.alive && !e.flying && Math.hypot(e.x - t.x, e.y - t.y) < 4) { this.damage(e, s.dmg * 12, 'earth', t, { big: true }); if (e.alive && !e.boss) e.stunT = Math.max(e.stunT, 2); }
        break;
      }
      case 'storm': {
        const ts = this.enemies.filter(e => e.alive).sort((a, b) => b.hp - a.hp).slice(0, 6);
        if (!ts.length) { ok = false; break; }
        this.emit({ t: 'ability', id: 'storm', tower: t, targets: ts.map(e => ({ x: e.x, y: e.y })) }); this.say(t, 'ability');
        for (const e of ts) { this.damage(e, s.dmg * 12, 'lightning', t, { big: true }); if (e.alive && !e.boss) e.stunT = Math.max(e.stunT, 1); }
        break;
      }
      case 'thunderfall': {
        if (!this.enemies.length) { ok = false; break; }
        this.emit({ t: 'ability', id: 'thunderfall', tower: t, targets: this.enemies.slice(0, 30).map(e => ({ x: e.x, y: e.y })) }); this.say(t, 'ult');
        for (const e of [...this.enemies]) if (e.alive) { this.damage(e, s.dmg * 20, 'lightning', t, { big: true }); if (e.alive && !e.boss) e.stunT = Math.max(e.stunT, 1.5); }
        break;
      }
      case 'bloom': {
        this.emit({ t: 'ability', id: 'bloom', tower: t, r: 4 }); this.say(t, 'ability');
        for (const o of this.towers) if (Math.hypot(o.x - t.x, o.y - t.y) <= 4) o.buffs.push({ id: 'bloom', t: 8, fx: { mul: { rate: 1.5 } } });
        this.lives = Math.min(this.maxLives, this.lives + 5); this.dirty = true; break;
      }
      case 'sanctuary': {
        this.emit({ t: 'ability', id: 'sanctuary', tower: t }); this.say(t, 'ult');
        for (const e of this.enemies) if (e.alive) { e.slowPct = Math.max(e.slowPct, 0.7); e.slowT = Math.max(e.slowT, 6); }
        this.lives = Math.min(this.maxLives, this.lives + 15); break;
      }
      case 'whirl': {
        if (!this.enemies.length) { ok = false; break; }
        this.emit({ t: 'ability', id: 'whirl', tower: t }); this.say(t, 'ult');
        for (const e of this.enemies) if (e.alive) this.damage(e, s.dmg * HEROES[t.cid].abilities.whirl.mul, s.dmgType, t, { big: true });
        break;
      }
      default: ok = false;
    }
    if (!ok) return { ok: false, why: 'Keine Ziele' };
    const acd = 1 - (this.ac.abCd || 0); if (slot === 'ab') t.abCd = info.cd * (1 - cdr) * acd; else t.ultCd = info.cd * (1 - cdr) * acd;
    this.stats.abilities++; this.hooks.stat?.('abilities', 1);
    this.timeScale = 1;
    return { ok: true };
  }

  // ───────── Wellenende / Sieg ─────────
  waveEnd() {
    if (this.over) return;
    while (this.doneWave < this.wave) {
      this.doneWave++;
      const w = this.doneWave, bonus = Math.round(BAL.run.waveBonus(w) * this.diff.coins * (1 + (this.ac.waveBonus || 0)));
      let income = 0, heal = 0; for (const t of this.towers) { income += t.s?.income || 0; heal += t.s?.lifeRegen || 0; }
      if (heal && this.lives < this.maxLives) { this.lives = Math.min(this.maxLives, this.lives + heal); this.emit({ t: 'heal2', lives: heal }); }
      this.gain(bonus + income); this.stats.income += income; if (income) this.hooks.stat?.('income', income);
      const used = new Set(this.towers.filter(t => !t.hero).map(t => t.cid));
      for (const cid of used) this.charXp(cid, BAL.char.survive(w));
      const ht = this.towers.find(t => t.hero); if (ht) this.heroXp(ht, BAL.hero.waveXp(w));
      this.hooks.accXp?.(BAL.acc.wave(w) * this.diff.acc, 'wave');
      this.hooks.stat?.('waves', 1);
      this.emit({ t: 'waveEnd', wave: w, bonus, income });
    }
    if (this.doneWave >= this.maxWave) { this.over = true; this.won = true; this.emit({ t: 'win' }); const ht = this.towers.find(t => t.hero); if (ht) this.say(ht, 'win'); }
  }
}
