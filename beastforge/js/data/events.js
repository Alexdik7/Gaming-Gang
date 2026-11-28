// Wochen-Events, Truhen und Kosmetik (Profil: P.chests, P.cos, P.event).
import { givePowers, POWER } from './powers.js';

// Kosmetik: Herzkristall-Farbe und Plopp-Effekt beim Besiegen
export const COSMETICS = {
  heart: [
    { id: 'default', name: 'Seelenkristall', core: 0x8ff6ff, glow: 0x6ff6ff },
    { id: 'ember', name: 'Glutkristall', core: 0xffb070, glow: 0xff7a2a },
    { id: 'sakura', name: 'Blütenkristall', core: 0xffc8dc, glow: 0xff8ab8 },
    { id: 'jade', name: 'Jadekristall', core: 0x9af0a0, glow: 0x3ad070 },
    { id: 'void', name: 'Leerenkristall', core: 0xc8a0ff, glow: 0x8a4aff },
    { id: 'sun', name: 'Sonnenkristall', core: 0xffe68a, glow: 0xffc020 },
  ],
  pop: [
    { id: 'default', name: 'Standard', cols: null },
    { id: 'confetti', name: 'Konfetti', cols: [0xff5a6a, 0xffd257, 0x5ae8d8, 0x8a7aff, 0x7aff8a] },
    { id: 'sakura', name: 'Kirschblüten', cols: [0xffb8d0, 0xffffff, 0xff8ab8] },
    { id: 'stars', name: 'Sternenstaub', cols: [0xffd257, 0xffffff, 0xfff2a8] },
    { id: 'ink', name: 'Tusche', cols: [0x2a2030, 0x5a4a7a, 0x1a1420] },
    { id: 'flame', name: 'Fuchsfeuer', cols: [0xff7a2a, 0xffd257, 0x5fe6ff] },
  ],
};
export const COS_KINDS = { heart: 'Herzkristall', pop: 'Plopp-Effekt' };
export const cosOf = (P, kind) => COSMETICS[kind].find(c => c.id === P.cos?.[kind]) || COSMETICS[kind][0];
export const hasCos = (P, kind, id) => id === 'default' || !!P.cos.owned[kind + '_' + id];

// Wochen-Events: Fortschritt = Statistik seit Wochenbeginn, 3 Stufen geben Truhen
export const EVENTS = [
  { id: 'slime', name: 'Schleimflut', icon: '🫧', desc: 'Lass Seelenschleime platzen!', stat: 'pops', goals: [400, 1500, 4000] },
  { id: 'boss', name: 'Bossjagd', icon: '👹', desc: 'Besiege Bosse auf beliebigen Karten.', stat: 'bossKills', goals: [2, 5, 10] },
  { id: 'elem', name: 'Elementfest', icon: '🌈', desc: 'Löse Elementreaktionen aus.', stat: 'reactions', goals: [150, 500, 1200] },
  { id: 'gold', name: 'Goldrausch', icon: '💰', desc: 'Verdiene Münzen durch Einkommen.', stat: 'income', goals: [5000, 20000, 60000] },
  { id: 'waves', name: 'Wellenreiter', icon: '🌊', desc: 'Überstehe Wellen.', stat: 'waves', goals: [60, 180, 400] },
  { id: 'hunt', name: 'Große Jagd', icon: '⚔', desc: 'Besiege Gegner.', stat: 'kills', goals: [2000, 7000, 18000] },
];
export const EVENT_CHESTS = [1, 2, 3];

// Wochenschlüssel: Montag als Wochenbeginn (lokale Zeit)
export function weekKey(d = new Date()) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate()); m.setDate(m.getDate() - (m.getDay() + 6) % 7);
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`;
}
export function daysLeft(d = new Date()) { return 7 - (d.getDay() + 6) % 7; }
export function ensureEvent(P, now = new Date()) {
  const wk = weekKey(now);
  if (P.event?.week === wk) return P.event;
  let h = 0; for (const c of wk) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const ev = EVENTS[h % EVENTS.length];
  P.event = { week: wk, id: ev.id, snap: P.stats[ev.stat] || 0, claimed: [] };
  return P.event;
}
export const eventDef = P => EVENTS.find(e => e.id === ensureEvent(P).id);
export const eventProgress = P => { const E = ensureEvent(P), d = eventDef(P); return Math.max(0, (P.stats[d.stat] || 0) - E.snap); };
export function claimEvent(P, i) {
  const E = ensureEvent(P), d = eventDef(P);
  if (E.claimed.includes(i) || eventProgress(P) < d.goals[i]) return 0;
  E.claimed.push(i); P.chests += EVENT_CHESTS[i]; return EVENT_CHESTS[i];
}
export const eventDot = P => { const d = eventDef(P), E = P.event; return P.chests > 0 || d.goals.some((g, i) => !E.claimed.includes(i) && eventProgress(P) >= g); };

// Truhe öffnen: 40 % neue Kosmetik (falls noch eine fehlt), sonst Kräfte oder Konto-XP
// Truhen-Seltenheiten (Vision P10): beim Öffnen gewürfelt, skalieren Kräfte/XP; ab Episch Bonus-Kraft, ab Legendär Shinobi-Punkte
export const RARITY = [
  { id: 'common', name: 'Gewöhnlich', w: 58, col: '#c9b58a', pow: 2, xp: 300 },
  { id: 'rare', name: 'Selten', w: 27, col: '#4aa8ff', pow: 3, xp: 450 },
  { id: 'epic', name: 'Episch', w: 11, col: '#b07bff', pow: 4, xp: 700, bonusPow: 1 },
  { id: 'legend', name: 'Legendär', w: 3.4, col: '#ffb020', pow: 5, xp: 1000, bonusPow: 2, sp: 1 },
  { id: 'myth', name: 'Mythisch', w: 0.6, col: '#ff4fa0', pow: 7, xp: 1600, bonusPow: 3, sp: 2 },
];
export function rollRarity(x) { const T = RARITY.reduce((a, q) => a + q.w, 0); let v = x * T; for (const q of RARITY) { if ((v -= q.w) < 0) return q; } return RARITY[0]; }
export function openChest(P, r = Math.random, rr = Math.random) {
  if (!(P.chests > 0)) return null;
  P.chests--;
  const rar = rollRarity(rr()), base = { rarity: rar };
  if (rar.sp) P.chestSp = (P.chestSp || 0) + rar.sp;   // zählt in shinobiPoints
  const extra = rar.bonusPow ? givePowers(P, rar.bonusPow, r).map(id => POWER[id]) : [];
  const missing = Object.entries(COSMETICS).flatMap(([k, L]) => L.filter(c => !hasCos(P, k, c.id)).map(c => [k, c]));
  const x = r();
  if (missing.length && x < 0.4) { const [kind, c] = missing[Math.floor(r() * missing.length)]; P.cos.owned[kind + '_' + c.id] = 1; return { ...base, type: 'cos', kind, item: c, extra }; }
  if (x < 0.75) { const got = givePowers(P, rar.pow, r); return { ...base, type: 'powers', got: [...got.map(id => POWER[id]), ...extra], extra: [] }; }
  return { ...base, type: 'xp', xp: rar.xp, extra };
}
