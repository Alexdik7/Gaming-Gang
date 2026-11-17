// Balance-Bot: spielt Runs ohne Grafik. node beastforge/tools/balance.mjs [diff=normal] [level=1] [runs=20] [bot=smart]
// Gibt Siegquote, erreichte Welle, Leben, Münzen-Verlauf und Charakter-XP pro Run aus.
import { World } from '../js/sim/world.js';
import { CREATURES } from '../js/data/creatures.js';
import { dimFactor, xpGainMul } from '../js/meta/progression.js';
import { BAL } from '../js/config.js';

const [diff = 'normal', lvlArg = '1', runsArg = '20', bot = 'smart', MAP = 'ahnenhain'] = process.argv.slice(2);
const LVL = +lvlArg, RUNS = +runsArg;

// Bester freier Platz: maximale Pfadlänge in Reichweite (Abtastung alle 0,5 Felder)
export const autoSpot = (w, cid, range = 3, prefer = null) => w.suggestSpot(cid, range, prefer === 'end');
const RANGE = { kitsune: 3.1, raven: 3.4, turtle: 1.7, tiger: 2.7, deer: 2.4, kairo: 2.8 };

export function playRun({ map = 'ahnenhain', diff = 'normal', level = 1, seed = 1, strat = 'smart', team = ['kitsune', 'raven', 'turtle', 'tiger', 'deer'], hero = 'kairo', log = false } = {}) {
  const xp = {}, lv = {};
  const hooks = {
    level: cid => lv[cid] ?? level, branch: () => 'spirit',
    charXp: (cid, raw, wave) => { const v = raw * BAL.diff[diff].xp * xpGainMul(level) * dimFactor(level, wave, diff); xp[cid] = (xp[cid] || 0) + v; return v; },
    heroStart: () => 1,
  };
  const w = new World({ map, diff, loadout: team, hero, hooks, seed });
  const placedCount = c => w.towers.filter(t => t.cid === c).length;
  const coinLog = [];
  const act = () => {
    // 1) erste Kitsune, dann Team aufbauen; 2) evolvieren wenn möglich; 3) Pfade
    const want = strat === 'kitsune' ? ['kitsune', 'kitsune', 'kitsune', 'kitsune'] : ['kitsune', 'raven', 'turtle', 'kairo', 'tiger', 'kitsune', 'deer', 'raven', 'turtle', 'tiger'];
    for (const cid of want) {
      const need = want.slice(0, want.indexOf(cid) + 1).filter(c => c === cid).length;
      if (placedCount(cid) >= need) continue;
      if (w.coins < w.costOf(cid)) return;
      const spot = autoSpot(w, cid, RANGE[cid], need > 1 ? 'end' : null);
      if (spot) { w.place(cid, ...spot); return; }
    }
    for (const t of w.towers) { const n = w.nextEvo(t); if (n?.unlocked && w.coins >= n.form.cost) { w.evolve(t.id); return; } }
    const plan = { kitsune: [2, 2, 2, 0, 0, 0, 0, 2, 2], raven: [1, 1, 0, 0, 0, 1, 1, 1], turtle: [0, 0, 0, 0, 1, 1, 1], tiger: [0, 0, 1, 1, 0, 0, 0, 0], deer: [0, 0, 2, 2, 0, 0, 0] };
    let best = null;
    for (const t of w.towers) {
      if (t.hero) continue;
      const order = plan[t.cid]; const step = t.tiers.reduce((a, b) => a + b, 0); const p = order[step];
      if (p === undefined) continue;
      const c = w.canUpgrade(t, p);
      if (c.ok && (!best || c.cost < best.cost)) best = { t, p, cost: c.cost };
    }
    if (best) { w.upgrade(best.t.id, best.p); return; }
    // nichts mehr zu kaufen → weitere Kreatur nahe dem Pfadende
    const extra = ['kitsune', 'tiger', 'raven', 'kitsune', 'turtle'][w.towers.length % 5];
    if (team.includes(extra) && w.coins >= w.costOf(extra) + 200 && w.towers.length < 16) { const sp = autoSpot(w, extra, RANGE[extra], 'end'); if (sp) w.place(extra, ...sp); }
  };
  let guard = 0;
  while (!w.over && guard++ < 200000) {
    if (!w.waveRunning() && w.canStartWave()) { for (let i = 0; i < 6; i++) act(); w.startWave(); coinLog.push(w.coins); }
    for (let i = 0; i < 10; i++) w.tick(BAL.tick);
    if (guard % 30 === 0) act();
    if (w.boss && w.boss.hp / w.boss.maxHp < 0.6) for (const t of w.towers) for (const a of w.abilityInfo(t)) if (a.ready && (a.slot === 'ab' ? t.abCd : t.ultCd) <= 0) w.useAbility(t.id, a.slot);
    w.events.length = 0;
  }
  return { won: w.won, wave: w.doneWave, lives: w.lives, coins: w.stats.coins, xp, towers: w.towers.map(t => `${t.cid}${t.stage}:${t.tiers.join('')}`), leaks: w.stats.leaks, reactions: w.stats.reactions };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const res = []; const t0 = Date.now();
  for (let i = 0; i < RUNS; i++) res.push(playRun({ map: MAP, diff, level: LVL, seed: i + 1, strat: bot }));
  const wins = res.filter(r => r.won).length;
  const avg = k => (res.reduce((a, r) => a + r[k], 0) / res.length).toFixed(1);
  console.log(`${diff} Lv${LVL} bot=${bot}: Siege ${wins}/${RUNS} · Ø Welle ${avg('wave')} · Ø Leben ${avg('lives')} · Ø Münzen ${avg('coins')} · Ø Reaktionen ${avg('reactions')} · ${Date.now() - t0} ms`);
  const xpAvg = {}; for (const r of res) for (const k in r.xp) xpAvg[k] = (xpAvg[k] || 0) + r.xp[k] / RUNS;
  console.log('Ø Charakter-XP/Run:', Object.entries(xpAvg).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(' · '));
  console.log('Beispiel-Türme:', res[0].towers.join(' '), '· verloren auf Welle', res.filter(r => !r.won).map(r => r.wave + 1).join(','));
}
