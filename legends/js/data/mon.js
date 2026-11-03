// Kreatur-Instanzen: Werte, Level, EP, Attacken lernen, Entwicklung
import { SPECIES } from './creatures.js';
import { MOVES } from './moves.js';

let uidCounter = Date.now() % 100000;
export const newUid = () => (Date.now().toString(36) + (uidCounter++).toString(36) + Math.random().toString(36).slice(2, 6));

export const xpForLevel = l => Math.floor(Math.pow(l, 3) * 0.8);

export function calcStats(m) {
  const b = SPECIES[m.sp].stats, L = m.lvl, iv = m.iv, mu = m.mut ? 1.1 : 1;
  const s = k => Math.floor((Math.floor(((2 * b[k] + (iv[k] || 0)) * L) / 100) + 5) * mu);
  return {
    hp: Math.floor((Math.floor(((2 * b.hp + (iv.hp || 0)) * L) / 100) + L + 10) * mu),
    atk: s('atk'), def: s('def'), spa: s('spa'), spd: s('spd'), spe: s('spe'),
  };
}

export function movesAt(sp, lvl) {
  const all = SPECIES[sp].learn.filter(([l]) => l <= lvl).map(([, id]) => id);
  return [...new Set(all)].slice(-4);
}

export function createMon(sp, lvl, rnd = Math.random, extra = {}) {
  const iv = {};
  for (const k of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) iv[k] = Math.floor(rnd() * 32);
  const m = {
    uid: newUid(), sp, lvl, xp: xpForLevel(lvl), iv, nick: null,
    moves: movesAt(sp, lvl).map(id => ({ id, pp: MOVES[id].pp })),
    status: null, friendship: 70, shiny: rnd() < 1 / 512, ...extra,
  };
  m.hp = calcStats(m).hp;
  return m;
}

export const monName = m => m.nick || SPECIES[m.sp].name;
export const maxHp = m => calcStats(m).hp;

export function healMon(m) {
  if (m.egg) return;
  m.hp = maxHp(m); m.status = null;
  for (const mv of m.moves) mv.pp = MOVES[mv.id].pp;
}

// EP geben → liefert Ereignisse (Levelaufstiege, neue Attacken, Entwicklung)
export function giveXp(m, amount) {
  const ev = [];
  m.xp += amount;
  while (m.lvl < 100 && m.xp >= xpForLevel(m.lvl + 1)) {
    const before = maxHp(m);
    m.lvl++;
    m.hp += maxHp(m) - before;
    ev.push({ t: 'lvl', lvl: m.lvl });
    for (const [l, id] of SPECIES[m.sp].learn) {
      if (l === m.lvl && !m.moves.some(x => x.id === id)) ev.push({ t: 'learn', id });
    }
  }
  const evo = SPECIES[m.sp].evo;
  if (evo && m.lvl >= evo.lvl) ev.push({ t: 'evo', to: evo.to });
  return ev;
}

export function evolve(m, to) {
  const before = maxHp(m);
  m.sp = to;
  m.hp += maxHp(m) - before;
}
