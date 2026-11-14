// ProgressionManager: Spielerlevel, Freischaltungen, dauerhafte Boni und Runden-Belohnungen.
import { BALANCE } from '../config.js';
import { CATS, CAT_IDS } from '../data/cats.js';
import { MAPS, MAP_BY_ID } from '../data/maps.js';
import { POWERUPS, POWER_IDS, RESEARCH, FEATURES } from '../data/meta.js';

export function addXp(s, xp) {
  const ups = [];
  s.xp += Math.round(xp);
  while (s.level < BALANCE.maxLevel && s.xp >= BALANCE.xpNeed(s.level)) { s.xp -= BALANCE.xpNeed(s.level); s.level++; ups.push(s.level); }
  return ups;
}

// Was wird auf einem Level freigeschaltet? (für „Level-Up“-Anzeige und die Freischalt-Liste)
export function unlocksAt(lvl) {
  const out = [];
  for (const id of CAT_IDS) if (CATS[id].unlock.lvl === lvl && lvl > 1) out.push({ kind: 'cat', id, n: [CATS[id].n, CATS[id].n] });
  for (const m of MAPS) if (m.lvl === lvl && lvl > 1) out.push({ kind: 'map', id: m.id, n: m.n });
  for (const id of POWER_IDS) if (POWERUPS[id].lvl === lvl && lvl > 1) out.push({ kind: 'power', id, n: POWERUPS[id].n });
  for (const id in RESEARCH) if (RESEARCH[id].lvl === lvl && lvl > 1) out.push({ kind: 'research', id, n: RESEARCH[id].n });
  for (const f of FEATURES) if (f.lvl === lvl) out.push({ kind: 'feature', n: f.n });
  return out;
}
export function nextUnlocks(lvl, count = 4) {
  const out = [];
  for (let l = lvl + 1; l <= BALANCE.maxLevel && out.length < count; l++) for (const u of unlocksAt(l)) out.push(Object.assign({ lvl: l }, u));
  return out.slice(0, count);
}

export const mapUnlocked = (s, id) => s.level >= MAP_BY_ID[id].lvl;
export const cleared = (s, id, diff) => (s.maps[id] && s.maps[id][diff]) || 0;
export function diffUnlocked(s, id, diff) {
  if (!mapUnlocked(s, id)) return false;
  if (diff === 'hard') return s.level >= BALANCE.difficulty.hard.minLevel && cleared(s, id, 'normal') > 0;
  if (diff === 'endless') return s.level >= BALANCE.reward.endlessFrom && cleared(s, id, 'normal') > 0;
  return true;
}

const lv = (s, id) => s.research[id] || 0;
const eff = (s, id) => lv(s, id) * RESEARCH[id].eff;
// Dauerhafte Boni des Kontos → werden der Simulation als „bonus“ übergeben
export function playerBonus(s) {
  const rank = {};
  for (const id in s.cats) rank[id] = s.cats[id].r || 0;
  return {
    dmg: eff(s, 'claws'), rate: eff(s, 'paws'), range: eff(s, 'eyes'), special: eff(s, 'special'), support: eff(s, 'team'),
    veteran: eff(s, 'veteran'), startFish: eff(s, 'capital'), lives: eff(s, 'walls'), cooldown: eff(s, 'cool'), rank
  };
}
export const loadoutSize = s => BALANCE.maxLoadout + lv(s, 'squad');
export const powerSlots = s => BALANCE.powerSlots + lv(s, 'slot');
export function playerSetup(s) { // was ein Spieler in eine Runde mitbringt
  const powers = {};
  for (const id of s.powerLoad.slice(0, powerSlots(s))) if (s.powers[id] > 0) powers[id] = s.powers[id];
  return { id: s.uid, name: s.name, loadout: s.loadout.filter(c => s.cats[c]).slice(0, loadoutSize(s)), bonus: playerBonus(s), powers };
}

// Belohnungen einer Runde (reine Funktion). result kommt aus World.finish().
export function calcRewards(result, s) {
  const R = BALANCE.reward, D = BALANCE.difficulty[result.diff], map = MAP_BY_ID[result.mapId];
  const tier = 1 + map.idx * R.mapTier, mp = BALANCE.multiplayer.reward[Math.min(4, result.players) - 1];
  const endless = result.mode === 'endless', win = result.win;
  let coins = (result.wave * R.coinsPerWave + result.kills * R.coinsPerKill) * D.coins * tier * mp * (win ? R.winMul : 1);
  let xp = (result.wave * R.xpPerWave + (win ? R.xpWin : 0)) * D.xp * tier * mp;
  if (endless) { coins *= 1 + Math.min(1.5, result.wave / 60); xp *= 1 + Math.min(1.5, result.wave / 60); }
  coins *= 1 + eff(s, 'economy'); xp *= 1 + eff(s, 'tactics');
  let crystals = 0, first = false;
  if (win) {
    crystals = D.crystals * (1 + map.idx * 0.08);
    first = !cleared(s, result.mapId, result.diff);
    if (first) crystals += D.crystals * R.firstClearCrystals;
  }
  if (result.diff !== 'easy') crystals += result.bossKills * R.bossCrystal;
  if (endless) crystals += Math.floor(result.wave / 10) * 2;
  return { coins: Math.round(coins), xp: Math.round(xp), crystals: Math.round(crystals), first };
}

// Statistik-Zuwachs einer Runde (für Missionen und Erfolge)
export function resultStats(result, uid) {
  const me = (result.per || []).find(p => p.id === uid) || { placed: 0, upgrades: 0, powerUsed: 0 }, mp = result.players > 1;
  return {
    games: 1, kills: result.kills, waves: result.wave, bossKills: result.bossKills, eliteKills: result.eliteKills,
    wins: result.win ? 1 : 0, cleanWins: result.win && result.livesLost <= 5 ? 1 : 0, perfectWins: result.perfect ? 1 : 0,
    hardWins: result.win && result.diff === 'hard' ? 1 : 0, mpGames: mp ? 1 : 0, mpWins: mp && result.win ? 1 : 0,
    placed: me.placed, upgrades: me.upgrades
  };
}
