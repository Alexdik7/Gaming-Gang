// Spielstand: PlayerProfile (Konto), CharacterProgress (pro Kreatur), Held, Erfolge, Einstellungen.
// Run-Münzen werden NIE gespeichert.
import { CREATURES } from '../data/creatures.js';
import { HEROES } from '../data/heroes.js';

export const SAVE_KEY = 'beastforge.save';
const V = 1;

export function newCharProgress() { return { level: 1, xp: 0, total: 0, branch: 'spirit', mastery: 0, mp: 0, skin: 0, wins: 0, kills: 0, runs: 0 }; }

export function defaultProfile() {
  const chars = {}; for (const id in CREATURES) chars[id] = newCharProgress();
  const heroes = {}; for (const id in HEROES) heroes[id] = { rank: 1, xp: 0, runs: 0, wins: 0 };
  return {
    v: V, created: Date.now(),
    account: { level: 1, xp: 0, total: 0, frame: 'none', title: 'none' },
    chars, heroes,
    loadout: ['kitsune', 'turtle', 'raven', 'tiger', 'deer'], hero: 'kairo',
    maps: { ahnenhain: { normal: 0, hard: 0, endless: 0 } },   // beste Welle
    ach: {},
    stats: { kills: 0, runs: 0, wins: 0, waves: 0, coins: 0, dmg: 0, evolves: 0, upgrades: 0, t5: 0, abilities: 0, ults: 0, reactions: 0,
      synergies: 0, bossKills: 0, minibossKills: 0, perfect: 0, winsHard: 0, perfectHard: 0, bestEndless: 0, income: 0, rocks: 0, crits: 0,
      levelUps: 0, ninetail: 0, allFive: 0, hero10: 0, hero20: 0, playTime: 0, losses: 0 },
    settings: { music: 0.55, sfx: 0.8, quality: 'auto', dmgNums: true, shake: true, autoWave: false },
    seen: { intro: false, tips: {} },
    academy: { owned: {} },   // Shinobi-Akademie: erlernte Knoten
  };
}

// Alte/teilweise Spielstände auffüllen, nie etwas löschen
export function migrate(p) {
  const d = defaultProfile();
  if (!p || typeof p !== 'object') return d;
  const fill = (dst, src) => { for (const k in src) { if (dst[k] === undefined) dst[k] = src[k]; else if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) fill(dst[k], src[k]); } };
  fill(p, d);
  for (const id in CREATURES) { p.chars[id] = p.chars[id] || {}; fill(p.chars[id], newCharProgress()); }
  p.heroes ||= {}; for (const id in HEROES) p.heroes[id] ||= { rank: 1, xp: 0, runs: 0, wins: 0 };   // neue Helden in alten Spielständen
  p.v = V;
  return p;
}

const mem = new Map();
const store = () => (typeof localStorage !== 'undefined' ? localStorage : { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: k => mem.delete(k) });

export function loadProfile() {
  try { const raw = store().getItem(SAVE_KEY); return migrate(raw ? JSON.parse(raw) : null); }
  catch (e) { console.warn('Spielstand defekt, neu angelegt', e); return defaultProfile(); }
}
export function saveProfile(p) {
  try { store().setItem(SAVE_KEY, JSON.stringify(p)); return true; } catch (e) { console.warn('Speichern fehlgeschlagen', e); return false; }
}
export function resetProfile() { try { store().removeItem(SAVE_KEY); } catch (e) { /* egal */ } return defaultProfile(); }
