// CurrencyManager: Münzen (coins) und Kristalle (crystals) – beide nur durch Spielen erhältlich.
import { CATS } from '../data/cats.js';
import { POWERUPS, POWER_IDS, RESEARCH, RANK } from '../data/meta.js';
import { addXp } from './progression.js';

export const canAfford = (s, cost) => (s.coins >= (cost.coins || 0)) && (s.crystals >= (cost.crystals || 0));
export function pay(s, cost) {
  if (!canAfford(s, cost)) return false;
  s.coins -= cost.coins || 0; s.crystals -= cost.crystals || 0;
  return true;
}
const bump = (s, k, n = 1) => { s.stats[k] = (s.stats[k] || 0) + n; };

// Belohnung gutschreiben: { coins, crystals, xp, power } – power = n zufällige freigeschaltete Power-ups
export function grant(s, r, rand = Math.random) {
  const got = { coins: r.coins || 0, crystals: r.crystals || 0, xp: r.xp || 0, powers: {}, levels: [] };
  s.coins += got.coins; s.crystals += got.crystals;
  if (got.coins) bump(s, 'coinsEarned', got.coins);
  if (got.xp) got.levels = addXp(s, got.xp);
  const pool = POWER_IDS.filter(id => POWERUPS[id].lvl <= s.level);
  for (let i = 0; i < (r.power || 0); i++) {
    const id = pool[Math.floor(rand() * pool.length)];
    s.powers[id] = (s.powers[id] || 0) + 1; got.powers[id] = (got.powers[id] || 0) + 1;
  }
  return got;
}

// --- Käufe (geben null bei Erfolg oder einen Grund zurück)
export const catCost = def => ({ coins: def.unlock.coins || 0, crystals: def.unlock.crystals || 0 });
export function buyCat(s, id) {
  const def = CATS[id];
  if (!def || s.cats[id]) return 'owned';
  if (s.level < def.unlock.lvl) return 'level';
  if (!pay(s, catCost(def))) return 'money';
  s.cats[id] = { r: 0 };
  return null;
}
export function buyRank(s, id) {
  const c = s.cats[id];
  if (!c) return 'owned';
  if (c.r >= RANK.max) return 'max';
  if (s.level < 3) return 'level';
  if (!pay(s, RANK.cost(c.r))) return 'money';
  c.r++; bump(s, 'researchDone');
  return null;
}
export function buyResearch(s, id) {
  const R = RESEARCH[id], lv = s.research[id] || 0;
  if (!R) return 'unknown';
  if (lv >= R.max) return 'max';
  if (s.level < R.lvl) return 'level';
  if (!pay(s, R.cost(lv))) return 'money';
  s.research[id] = lv + 1; bump(s, 'researchDone');
  return null;
}
export function buyPower(s, id, n = 1) {
  const P = POWERUPS[id];
  if (!P) return 'unknown';
  if (s.level < P.lvl) return 'level';
  if ((s.powers[id] || 0) + n > 99) return 'max';
  if (!pay(s, { coins: P.price * n })) return 'money';
  s.powers[id] = (s.powers[id] || 0) + n;
  return null;
}
