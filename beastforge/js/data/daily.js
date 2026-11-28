// Täglich: Tageskampf (feste Bedingungen je Datum) + 3 Tagesaufgaben (Fortschritt = Statistik seit Tagesbeginn).
import { MAPS } from './maps.js';
import { CHALLENGES } from './challenges.js';

export const QUESTS = [
  { id: 'kills1', text: 'Besiege 300 Gegner', stat: 'kills', goal: 300, xp: 150 },
  { id: 'kills2', text: 'Besiege 900 Gegner', stat: 'kills', goal: 900, xp: 300 },
  { id: 'pops', text: 'Lass 250 Seelenschleime platzen', stat: 'pops', goal: 250, xp: 200 },
  { id: 'waves', text: 'Überstehe 25 Wellen', stat: 'waves', goal: 25, xp: 200 },
  { id: 'win', text: 'Gewinne einen Run', stat: 'wins', goal: 1, xp: 250 },
  { id: 'react', text: 'Löse 60 Elementreaktionen aus', stat: 'reactions', goal: 60, xp: 200 },
  { id: 'up', text: 'Kaufe 15 Upgrades', stat: 'upgrades', goal: 15, xp: 150 },
  { id: 'evo', text: 'Erwecke 3 Formen im Kampf', stat: 'evolves', goal: 3, xp: 200 },
  { id: 'ab', text: 'Setze 4 Fähigkeiten ein', stat: 'abilities', goal: 4, xp: 150 },
  { id: 'boss', text: 'Besiege einen Boss', stat: 'bossKills', goal: 1, xp: 300 },
  { id: 'gold', text: 'Verdiene 4.000 Münzen durch Einkommen', stat: 'income', goal: 4000, xp: 200 },
  { id: 'perfect', text: 'Gewinne ohne ein Leben zu verlieren', stat: 'perfect', goal: 1, xp: 350 },
  // v0.53: mehr Abwechslung
  { id: 'fuse', text: 'Verschmelze 1 Fusion', stat: 'fusions', goal: 1, xp: 300 },
  { id: 'mega', text: 'Erwecke eine Mega-Form', stat: 'megas', goal: 1, xp: 400 },
  { id: 'chain', text: 'Löse 5 Kettenreaktionen aus', stat: 'chains', goal: 5, xp: 250 },
  { id: 'ult', text: 'Setze 3 Ultimates ein', stat: 'ults', goal: 3, xp: 200 },
  { id: 'mini', text: 'Besiege 3 Mini-Bosse', stat: 'minibossKills', goal: 3, xp: 250 },
  { id: 'stag', text: 'Unterbrich einen Boss-Angriff', stat: 'staggers', goal: 1, xp: 300 },
  { id: 'syn', text: 'Aktiviere 4 Synergien', stat: 'synergies', goal: 4, xp: 200 },
];
export const DAILY_XP = 500;

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function rng(key) { let h = 2166136261; for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h = Math.imul(h ^ h >>> 15, 2246822507) ^ Math.imul(h ^ h >>> 13, 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }

// Neuer Tag → neue Aufgaben, Statistik-Schnappschuss als Startpunkt
export function ensureDaily(P, now = new Date()) {
  const day = dayKey(now);
  if (P.daily?.day === day) return P.daily;
  const r = rng(day + 'q'), pool = [...QUESTS], quests = [];
  while (quests.length < 3) quests.push(pool.splice(Math.floor(r() * pool.length), 1)[0].id);
  P.daily = { day, quests, claimed: {}, won: false, snap: Object.fromEntries(QUESTS.map(q => [q.stat, P.stats[q.stat] || 0])), sp: P.daily?.sp || 0 };
  return P.daily;
}
export const questProgress = (P, q) => Math.max(0, (P.stats[q.stat] || 0) - (P.daily.snap[q.stat] || 0));

// Tageskampf: gleiche Bedingungen für alle an diesem Datum (aus freigeschalteten Karten)
export function dailyChallenge(P, okMap = () => true, day = dayKey()) {
  const r = rng(day + 'c'), maps = Object.keys(MAPS).filter(okMap);
  const map = maps[Math.floor(r() * maps.length)] || 'ahnenhain';
  const pool = CHALLENGES.filter(c => c.mods && !c.mods.soulburn && !c.endgame), mods = [];
  while (mods.length < 2) { const c = pool.splice(Math.floor(r() * pool.length), 1)[0]; mods.push(c.id); }
  return { map, diff: r() < 0.3 ? 'hard' : 'normal', mods };
}
