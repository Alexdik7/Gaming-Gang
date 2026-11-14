// WaveManager: Skalierung, Wellen-Generator und zeitgesteuertes Erscheinen der Hunde.
import { BALANCE } from '../config.js';
import { DOGS, DOG_IDS, BOSS_ORDER } from '../data/dogs.js';
import { EARLY, FIXED, THEMES_W, BOSS_ESCORT } from '../data/waves.js';
import { rng, hash } from './maps.js';

const WS = BALANCE.wave_scaling;

// --- Skalierung (nicht linear): LP wachsen erst sanft, dann immer steiler
export const waveHp = w => 1 + WS.hpLin * (w - 1) + Math.pow((w - 1) / WS.hpPowBase, WS.hpPow);
export const waveSpeed = w => Math.min(WS.speedCap, 1 + WS.speedPer10 * (w - 1) / 10);
export const waveArmor = w => 1 + WS.armorPer10 * (w - 1) / 10;
export const waveBudget = w => WS.budgetBase + WS.budgetLin * Math.pow(w, WS.budgetPow);
export const waveReward = w => (1 + WS.hpLin * (w - 1)) / (1 + WS.rewardDecay * (w - 1) * (w - 1) / 10 + (w - 1) * 0.05);

export function isBossWave(w, total) { return w === total || w % WS.bossEvery === 0; }

// Werte eines Hundes in Welle w. opts: { diff, players }
export function scaleEnemy(def, w, opts = {}) {
  const D = BALANCE.difficulty[opts.diff || 'normal'], n = Math.min(4, Math.max(1, opts.players || 1)) - 1, MP = BALANCE.multiplayer;
  let hp = def.hp * waveHp(w) * BALANCE.enemy_health_multiplier * D.hp * (opts.dense || 1);
  if (def.boss) {
    const cycle = Math.floor((w / WS.bossEvery - 1) / BOSS_ORDER.length);
    hp *= BALANCE.boss_multiplier * MP.boss[n] * Math.pow(WS.bossHpPerCycle, Math.max(0, cycle)) * (opts.final ? 1.4 : 1) * (opts.mini ? 0.55 : 1);
  } else hp *= MP.hp[n];
  const armor = (def.armor || 0) * waveArmor(w) * BALANCE.enemy_armor_multiplier;
  return {
    hp: Math.round(hp), shield: Math.round((def.shield || 0) * hp / def.hp),
    speed: def.speed * (def.boss ? 1 : waveSpeed(w)) * BALANCE.enemy_speed_multiplier * D.speed, armor,
    reward: def.reward * (def.boss ? 1 + w / 20 : waveReward(w))
  };
}

// Eine Welle als Liste von Gruppen: { type, count, gap, delay, path }
export function buildWave(w, mapDef, opts = {}) {
  const D = BALANCE.difficulty[opts.diff || 'normal'], n = Math.min(4, Math.max(1, opts.players || 1)) - 1;
  const total = opts.total || Infinity, nPaths = mapDef.paths.length, r = rng(hash(mapDef.id) + w * 7919);
  const countMul = D.count * BALANCE.multiplayer.count[n] * BALANCE.enemy_spawn_multiplier;
  const out = { groups: [], boss: null, dense: 1, w };
  const fixed = (FIXED[mapDef.id] && FIXED[mapDef.id][w]) || EARLY[w];
  if (fixed) {
    fixed.forEach(([type, count, gap, delay], i) => out.groups.push({ type, count: Math.max(1, Math.round(count * countMul)), gap, delay, path: i % nPaths }));
    return out;
  }
  let budget = waveBudget(w) * countMul;
  if (isBossWave(w, total)) {
    const final = w === total, k = Math.round(w / WS.bossEvery);
    out.boss = final ? mapDef.boss : BOSS_ORDER[(Math.max(1, k) - 1) % BOSS_ORDER.length];
    out.final = final; out.mini = !final && w === WS.bossEvery;
    out.groups.push({ type: out.boss, count: 1, gap: 1, delay: 3, path: Math.floor(r() * nPaths), boss: true });
    budget *= BOSS_ESCORT;
  }
  // Thema wählen
  const avail = DOG_IDS.map(id => DOGS[id]).filter(d => !d.boss && d.from <= w && d.w > 0);
  let themes = THEMES_W.filter(t => !t.only || avail.filter(t.only).length >= t.pick);
  let tw = themes.reduce((a, t) => a + t.w, 0), pick = r() * tw, theme = themes[0];
  for (const t of themes) { pick -= t.w; if (pick <= 0) { theme = t; break; } }
  out.theme = theme.id; budget *= theme.budget;
  const pool = (theme.only ? avail.filter(theme.only) : avail).slice();
  const chosen = [];
  for (let i = 0; i < theme.pick && pool.length; i++) {
    // neuere Hundetypen etwas bevorzugen, damit jede Welle Neues zeigt
    const weights = pool.map(d => d.w * (1 + Math.max(0, 6 - (w - d.from)) * 0.35));
    let p = r() * weights.reduce((a, b) => a + b, 0), j = 0;
    while (j < pool.length - 1 && (p -= weights[j]) > 0) j++;
    chosen.push(pool.splice(j, 1)[0]);
  }
  // Budget aufteilen; zu große Mengen werden zu „dichteren“ (zäheren) Hunden statt zu Lag
  const cap = Math.round((36 + w * 0.9) * countMul);
  let counts = chosen.map((d, i) => Math.max(1, Math.round(budget * (i === 0 ? 0.5 : 0.5 / (chosen.length - 1 || 1)) / d.cost)));
  if (chosen.length === 1) counts = [Math.max(1, Math.round(budget / chosen[0].cost))];
  const sum = counts.reduce((a, b) => a + b, 0);
  if (sum > cap) { out.dense = sum / cap; counts = counts.map(c => Math.max(1, Math.round(c * cap / sum))); }
  let delay = out.boss ? 0 : 0;
  chosen.forEach((d, i) => {
    const gap = Math.max(0.18, Math.min(2.2, (0.75 / d.speed + d.cost * 0.12) * theme.gap * (1 - Math.min(0.45, w * 0.008))));
    out.groups.push({ type: d.id, count: counts[i], gap, delay, path: nPaths > 1 ? (i + w) % nPaths : 0 });
    delay += Math.min(9, counts[i] * gap * 0.45);
  });
  return out;
}

export class WaveManager {
  constructor(world) { this.world = world; this.queue = []; this.t = 0; this.wave = null; }
  get spawning() { return this.queue.length > 0; }
  preview(w) { const W = this.world; return buildWave(w, W.map.def, { diff: W.diff, players: W.players.length, total: W.wavesTotal }); }
  start(w) {
    const W = this.world, wave = this.preview(w);
    this.wave = wave; this.t = 0; this.queue = [];
    for (const g of wave.groups) for (let i = 0; i < g.count; i++) this.queue.push({ t: g.delay + i * g.gap, type: g.type, path: g.path, boss: g.boss });
    this.queue.sort((a, b) => a.t - b.t);
    if (wave.boss) W.emit({ e: 'boss', id: wave.boss });
    return wave;
  }
  update(dt) {
    if (!this.queue.length) return;
    this.t += dt;
    const W = this.world;
    while (this.queue.length && this.queue[0].t <= this.t) {
      const s = this.queue.shift();
      W.enemies.spawn(s.type, s.path, 0, { final: this.wave.final && s.boss, mini: this.wave.mini && s.boss, dense: s.boss ? 1 : this.wave.dense });
    }
  }
}
