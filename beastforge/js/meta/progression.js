// Fortschritts-Logik (ohne DOM). Drei getrennte Systeme:
//   A) Run-Münzen – leben nur in sim/world.js
//   B) Charakter-XP/Level – pro Kreatur, hier
//   C) Konto-XP/Level – Spieler, hier
import { BAL, LEVEL_PERKS } from '../config.js';
import { CREATURES } from '../data/creatures.js';
import { HEROES } from '../data/heroes.js';
import { ACCOUNT_REWARDS, ACHIEVEMENTS } from '../data/meta.js';

export const charNeed = L => BAL.char.need(L);
export const accNeed = L => BAL.acc.need(L);

// ---- Formen / Evolution ----
export function formsFor(cid, branch) {
  const def = CREATURES[cid];
  const br = branch || 'spirit';
  return def.forms.filter(f => !f.branch || f.branch === br || !def.forms.some(o => o.branch === br && o.stage === f.stage));
}
export function hasBranch(cid) { return CREATURES[cid].forms.some(f => f.branch); }
export function maxStage(cid, level, branch) {
  let s = 0;
  for (const f of formsFor(cid, branch)) if (level >= f.lvl) s = Math.max(s, f.stage);
  return s;
}
export function formAt(cid, stage, branch) { return formsFor(cid, branch).find(f => f.stage === stage); }
export function nextFormByLevel(cid, level, branch) { return formsFor(cid, branch).find(f => f.lvl > level) || null; }

// ---- permanente Boni (klein) ----
export function levelFx(cid, level) {
  const def = CREATURES[cid], out = [];
  for (const p of LEVEL_PERKS) {
    if (level < p.lvl) continue;
    if (p.fx) out.push(p.fx);
    if (p.passive && def.passives?.[p.passive]?.fx) out.push(def.passives[p.passive].fx);
  }
  return out;
}
export function perkList(cid) {
  const def = CREATURES[cid];
  return LEVEL_PERKS.map(p => {
    let name = p.name, desc = '';
    if (p.passive) { const ps = def.passives[p.passive]; name = (p.lvl === 50 ? 'Meister: ' : 'Passiv: ') + ps.name; desc = ps.desc; }
    if (p.ability) { name = 'Fähigkeit: ' + def.ability.name; desc = def.ability.desc; }
    return { lvl: p.lvl, name, desc };
  });
}
export function xpGainMul(level) { return 1 + LEVEL_PERKS.filter(p => p.xp && level >= p.lvl).reduce((a, p) => a + p.xp, 0); }

// Abnehmender Ertrag: wer weit über dem Niveau der Welle liegt, bekommt weniger
export function dimFactor(level, wave, diffKey) {
  const dm = diffKey === 'hard' ? 1.3 : 1;
  const over = level - BAL.char.expected(wave) * dm;
  return Math.max(BAL.char.dimFloor, Math.min(1, 1 - Math.max(0, over) * BAL.char.dimStep));
}

// ---- System B: Charakter-XP ----
export function addCharXp(p, cid, raw, ctx = {}) {
  const c = p.chars[cid]; if (!c || raw <= 0) return { xp: 0, ups: [] };
  const diff = BAL.diff[ctx.diff || 'normal'];
  let xp = raw * diff.xp * xpGainMul(c.level);
  if (!ctx.flat) xp *= dimFactor(c.level, ctx.wave || 1, ctx.diff);
  c.xpFrac = (c.xpFrac || 0) + xp;
  const whole = Math.floor(c.xpFrac); c.xpFrac -= whole;
  const ups = [];
  if (c.level >= BAL.char.maxLevel) { c.total += whole; return { xp: whole, ups }; }
  c.xp += whole; c.total += whole;
  while (c.level < BAL.char.maxLevel && c.xp >= charNeed(c.level)) {
    c.xp -= charNeed(c.level); c.level++;
    const forms = formsFor(cid, c.branch).filter(f => f.lvl === c.level).map(f => f.name);
    const perks = perkList(cid).filter(k => k.lvl === c.level).map(k => k.name);
    ups.push({ cid, lvl: c.level, forms, perks });
    p.stats.levelUps = (p.stats.levelUps || 0) + 1;
  }
  if (c.level >= BAL.char.maxLevel) c.xp = 0;
  return { xp: whole, ups };
}

// ---- System C: Konto-XP ----
export function addAccXp(p, amt) {
  const a = p.account, ups = [];
  if (amt <= 0) return { xp: 0, ups };
  a.xp += Math.round(amt); a.total = (a.total || 0) + Math.round(amt);
  while (a.level < BAL.acc.maxLevel && a.xp >= accNeed(a.level)) {
    a.xp -= accNeed(a.level); a.level++;
    ups.push({ lvl: a.level, rewards: ACCOUNT_REWARDS.filter(r => r.lvl === a.level) });
  }
  return { xp: Math.round(amt), ups };
}

export function unlocked(p, type, id) {
  const r = ACCOUNT_REWARDS.find(x => x.type === type && x.id === id);
  if (p.dev?.unlockAll) return true;
  return !r || p.account.level >= r.lvl;
}
export function unlockLevel(type, id) { return ACCOUNT_REWARDS.find(x => x.type === type && x.id === id)?.lvl || 1; }
export const unlockedCreatures = p => Object.keys(CREATURES).filter(id => unlocked(p, 'creature', id));

// ---- Held: dauerhafter Rang ----
export function addHeroRankXp(p, hid, amt) {
  const h = p.heroes[hid]; if (!h || amt <= 0) return [];
  h.xp += Math.round(amt); const ups = [];
  while (h.rank < BAL.hero.rankMax && h.xp >= BAL.hero.rankNeed(h.rank)) { h.xp -= BAL.hero.rankNeed(h.rank); h.rank++; ups.push(h.rank); }
  return ups;
}
export const heroStartLevel = rank => 1 + Math.floor((rank - 1) / 10);

// ---- Mastery ----
export function masteryOf(mp) { let m = 0; BAL.mastery.forEach((need, i) => { if (mp >= need && i > 0) m = i; }); return m; }
export function addMastery(p, cid, pts) {
  const c = p.chars[cid]; if (!c) return null;
  const before = c.mastery; c.mp += pts; c.mastery = masteryOf(c.mp);
  return c.mastery > before ? c.mastery : null;
}
export const MASTERY_REWARDS = [
  null,
  { text: 'Titel der Kreatur' },
  { text: 'Porträtrahmen Bronze' },
  { text: 'Skin I + Aura' },
  { text: 'Porträtrahmen Silber + Spur' },
  { text: 'Skin II + Goldrahmen' },
];

// ---- Erfolge ----
export function achValue(p, a) { return a.get ? a.get(p) : (p.stats[a.stat] || 0); }
export function checkAchievements(p) {
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (p.ach[a.id]) continue;
    if (achValue(p, a) >= a.goal) { p.ach[a.id] = Date.now(); fresh.push(a); }
  }
  return fresh;
}
export const heroDef = id => HEROES[id];
