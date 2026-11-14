// World = GameManager einer Runde. Reine Simulation ohne Browser-Abhängigkeit:
// läuft im Spiel, in Node-Tests, im Balance-Bot und als autoritativer Host im Koop.
// Alles, was Spieler tun, geht über cmd() und wird hier geprüft (Kosten, Besitz, Regeln).
import { BALANCE } from '../config.js';
import { CATS } from '../data/cats.js';
import { MAP_BY_ID } from '../data/maps.js';
import { buildMap, canBuild, rng } from './maps.js';
import { EnemyManager } from './enemies.js';
import { TowerManager } from './towers.js';
import { WaveManager } from './waves.js';
import { PowerUpManager, POWER_USES } from './powerups.js';
import { canUpgrade, upgradeCost, placeCost, NO_BONUS } from './upgrades.js';
import { TARGET_MODES } from '../data/cats.js';

export class World {
  // o: { mapId, diff, mode:'campaign'|'endless', seed, players:[{ id, name, loadout, bonus, powers:{id:n} }] }
  constructor(o) {
    this.mapDef = MAP_BY_ID[o.mapId]; this.map = buildMap(this.mapDef);
    this.diff = o.diff || 'normal'; this.mode = o.mode || 'campaign';
    const D = BALANCE.difficulty[this.diff], n = Math.min(4, o.players.length) - 1;
    this.wavesTotal = this.mode === 'endless' ? Infinity : D.waves;
    this.share = BALANCE.multiplayer.fish[n];
    this.players = o.players.slice(0, 4).map((p, i) => {
      const bonus = Object.assign({}, NO_BONUS, p.bonus || {});
      const powers = {};
      for (const id in p.powers || {}) powers[id] = Math.min(POWER_USES, p.powers[id]);
      return { i, id: p.id || 'p' + i, name: p.name || 'Spieler ' + (i + 1), loadout: p.loadout || Object.keys(CATS), bonus, powers, powerCd: {},
        fish: Math.round(BALANCE.startFish * D.fish * (1 + (bonus.startFish || 0))), discount: 0, connected: true,
        stats: { placed: 0, upgrades: 0, powerUsed: 0, earned: 0 } };
    });
    this.maxLives = this.lives = D.lives + (this.players[0].bonus.lives || 0);
    this.wave = 0; this.phase = 'build'; this.time = 0; this.auto = false; this.autoT = 0;
    this.fx = { catnip: 0, catnipV: 0, gold: 0, double: 0 };
    this.events = []; this.revealAll = false; this.result = null;
    this.stats = { kills: 0, bossKills: 0, eliteKills: 0, livesLost: 0 };
    this.rand = rng(o.seed || 1);
    this.enemies = new EnemyManager(this); this.towers = new TowerManager(this);
    this.waves = new WaveManager(this); this.power = new PowerUpManager(this);
  }

  emit(ev) { this.events.push(ev); }
  drain() { const e = this.events; this.events = []; return e; }
  get over() { return this.phase === 'won' || this.phase === 'lost'; }

  // ---------------------------------------------------------------- Befehle (autoritativ geprüft)
  cmd(pi, c) {
    const P = this.players[pi];
    if (!P || !c || this.over) return { err: 'over' };
    const T = this.towers;
    switch (c.t) {
      case 'place': {
        const def = CATS[c.cat], x = c.x | 0, y = c.y | 0;
        if (!def || P.loadout.indexOf(c.cat) < 0) return { err: 'cat' };
        if (!canBuild(this.map, x, y) || T.at(x, y)) return { err: 'tile' };
        if (def.limit && T.list.filter(t => t.cat === c.cat && t.owner === pi).length >= def.limit) return { err: 'limit' };
        const cost = placeCost(def, P.bonus);
        if (P.fish < cost) return { err: 'fish' };
        P.fish -= cost; P.stats.placed++;
        const t = T.place(pi, c.cat, x, y);
        this.emit({ e: 'place', id: t.id, x: t.x, y: t.y, pi });
        return { ok: true, id: t.id };
      }
      case 'upgrade': {
        const t = T.byId(c.id), p = c.path | 0;
        if (!t || t.owner !== pi || p < 0 || p > 2) return { err: 'tower' };
        const why = canUpgrade(t.def, t.tiers, p, P.bonus);
        if (why) return { err: why };
        const cost = upgradeCost(t.def, t.tiers, p, P.bonus, P.discount);
        if (P.fish < cost) return { err: 'fish' };
        P.fish -= cost; t.spent += cost; t.tiers[p]++; P.stats.upgrades++;
        T.recalc(t);
        this.emit({ e: 'up', id: t.id, x: t.x, y: t.y, pi, tier: t.tiers[p] });
        return { ok: true };
      }
      case 'sell': {
        const t = T.byId(c.id);
        if (!t || t.owner !== pi) return { err: 'tower' };
        P.fish += Math.round(t.spent * BALANCE.sellRefund);
        T.remove(t); this.emit({ e: 'sell', x: t.x, y: t.y, pi });
        return { ok: true };
      }
      case 'target': {
        const t = T.byId(c.id);
        if (!t || t.owner !== pi) return { err: 'tower' };
        t.mode = TARGET_MODES.indexOf(c.mode) >= 0 ? c.mode : TARGET_MODES[(TARGET_MODES.indexOf(t.mode) + 1) % TARGET_MODES.length];
        return { ok: true };
      }
      case 'start': return this.startWave() ? { ok: true } : { err: 'phase' };
      case 'auto': this.auto = !!c.on; return { ok: true };
      case 'power': { const err = this.power.use(pi, c.id, +c.x, +c.y); return err ? { err } : { ok: true }; }
      case 'gift': {
        const to = this.players[c.to], n = Math.floor(+c.n);
        if (!to || to === P || !(n > 0) || P.fish < n) return { err: 'gift' };
        P.fish -= n; to.fish += n; this.emit({ e: 'gift', pi, to: c.to, n });
        return { ok: true };
      }
    }
    return { err: 'unknown' };
  }

  startWave() {
    if (this.phase !== 'build') return false;
    this.wave++; this.phase = 'wave';
    const w = this.waves.start(this.wave);
    this.emit({ e: 'wave', w: this.wave, boss: w.boss });
    return true;
  }

  // ---------------------------------------------------------------- Zeitschritt
  step(dt) {
    if (this.over) return;
    this.time += dt;
    this.power.update(dt);
    if (this.phase === 'wave') this.waves.update(dt);
    this.enemies.update(dt);
    this.towers.update(dt);
    if (this.phase === 'wave' && !this.waves.spawning && this.enemies.list.length === 0 && !this.over) this.endWave();
    else if (this.phase === 'build' && this.auto && this.wave > 0 && (this.autoT += dt) > 1.6) { this.autoT = 0; this.startWave(); }
  }

  give(P, n) { n = Math.round(n * 10) / 10; P.fish += n; P.stats.earned += n; }

  onKill(e, by) {
    const S = this.stats;
    S.kills++; if (e.boss) S.bossKills++; if (e.elite) S.eliteKills++;
    if (by && by.kills !== undefined) by.kills++;
    const fish = e.reward * (this.fx.gold > 0 ? 2 : 1) * (1 + (e.bounty || 0)) * this.share;
    for (const P of this.players) this.give(P, fish);
    this.emit({ e: 'die', x: e.x, y: e.y, k: e.type, boss: e.boss ? 1 : 0, fish: Math.round(fish) });
  }

  onLeak(e) {
    const n = Math.min(this.lives, e.lives);
    this.lives -= n; this.stats.livesLost += n;
    this.emit({ e: 'leak', x: e.x, y: e.y, n });
    if (this.lives <= 0) this.finish(false);
  }

  endWave() {
    const w = this.wave, T = this.towers;
    for (const P of this.players) this.give(P, BALANCE.waveBonus(w) * this.share);
    // Banker-Katzen: Einkommen + Zinsen; Medic: Leben zurück
    let lifeEvery = 0, lifeMax = 0;
    for (const t of T.list) {
      const st = t.stats, P = this.players[t.owner];
      if (st.income) { const inc = st.income + Math.min(300, P.fish * Math.min(0.12, st.interest || 0)); this.give(P, inc); this.emit({ e: 'income', x: t.x, y: t.y, n: Math.round(inc), pi: t.owner }); }
      if (st.lifeEvery > 0 && (!lifeEvery || st.lifeEvery < lifeEvery)) lifeEvery = st.lifeEvery;
      lifeMax = Math.max(lifeMax, st.lifeMax || 0);
    }
    if (lifeEvery && w % lifeEvery === 0 && this.lives < this.maxLives + lifeMax) { this.lives++; this.emit({ e: 'life' }); }
    this.emit({ e: 'waveEnd', w });
    if (w >= this.wavesTotal) return this.finish(true);
    this.phase = 'build'; this.autoT = 0;
  }

  finish(win) {
    if (this.over) return;
    this.phase = win ? 'won' : 'lost';
    const S = this.stats, cleared = win ? this.wave : Math.max(0, this.wave - 1);
    this.result = {
      win, mode: this.mode, mapId: this.mapDef.id, diff: this.diff, wave: cleared, wavesTotal: this.wavesTotal, kills: S.kills, bossKills: S.bossKills,
      eliteKills: S.eliteKills, livesLost: S.livesLost, perfect: win && S.livesLost === 0, players: this.players.length, time: this.time,
      per: this.players.map(p => ({ id: p.id, placed: p.stats.placed, upgrades: p.stats.upgrades, powerUsed: p.stats.powerUsed }))
    };
    this.emit({ e: win ? 'win' : 'lose' });
  }
}
