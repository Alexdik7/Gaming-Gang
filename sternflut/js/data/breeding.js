// Brutstätte: Aus zwei Kreaturen entsteht ein Ei. Verschiedene Arten → Mutation (Fusion beider Eltern).
import { SPECIES } from './creatures.js';
import { SIGNATURE } from './creatures2.js';
import { createMon, giveXp, newUid, genderOf } from './mon.js';
import { MOVES } from './moves.js';

const VOW = 'aeiouäöüy';
const isV = c => VOW.includes(c.toLowerCase());
const SIGN_NAME = { ears: 'Ohren', fins: 'Flossen', leaf: 'Kopfblatt', wings: 'Flügel', cap: 'Pilzhut', spikes: 'Stacheln', horns: 'Hörner', gem: 'Stirnjuwel', aura: 'Lichtring', crest: 'Kamm', crown: 'Krone', tailflame: 'Schweifflamme' };

export const fusionId = (a, b) => `fx(${a}|${b})`;
export function parseFx(id) {
  if (!id || !id.startsWith('fx(')) return null;
  const s = id.slice(3, -1); let d = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') d++; else if (s[i] === ')') d--; else if (s[i] === '|' && d === 0) return [s.slice(0, i), s.slice(i + 1)];
  }
  return null;
}

function nameHead(n) {
  let i = 1; while (i < n.length && !isV(n[i])) i++;
  while (i < n.length && isV(n[i])) i++;
  if (i < n.length && !isV(n[i])) {
    const pair = n.slice(i, i + 2).toLowerCase();
    i += (pair.length === 2 && !isV(pair[1]) && (pair[0] === pair[1] || ['nk', 'ck', 'ch', 'st', 'pf', 'rn', 'rk', 'lb', 'mp'].includes(pair))) ? 2 : 1;
  }
  return n.slice(0, Math.max(3, i));
}
function nameTail(n) {
  const L = n.length; let i = Math.floor(L * 0.45);
  while (i < L && !isV(n[i])) i++;
  i = Math.max(2, i - 1);
  return n.slice(i).toLowerCase();
}
export function fusionName(a, b) {
  let h = nameHead(a), t = nameTail(b);
  if (h.slice(-1).toLowerCase() === t[0]) t = t.slice(1);
  const n = h + t; return n.charAt(0).toUpperCase() + n.slice(1);
}

// Stellt sicher, dass eine (Fusions-)Art im SPECIES-Register existiert
export function ensureSpecies(id) {
  if (SPECIES[id]) return SPECIES[id];
  const p = parseFx(id); if (!p) return null;
  const A = ensureSpecies(p[0]), B = ensureSpecies(p[1]); if (!A || !B) return null;
  const tA = A.types[0];
  let tB = B.types[0] !== tA ? B.types[0] : (B.types[1] || A.types[1]);
  const types = tB && tB !== tA ? [tA, tB] : [tA];
  const stats = {};
  for (const k of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) stats[k] = Math.round((A.stats[k] + B.stats[k]) / 2 * 1.05);
  const lv = new Map();
  for (const [l, m] of [...A.learn, ...B.learn]) if (MOVES[m] && (!lv.has(m) || lv.get(m) > l)) lv.set(m, l);
  const learn = [...lv.entries()].map(([m, l]) => [l, m]).sort((x, y) => x[0] - y[0]);
  const sig = SIGNATURE[B.model.kind];
  const extras = [...new Set([...(A.model.extras || []), sig, ...(B.model.extras || []).slice(0, 1)].filter(Boolean))].slice(0, 4);
  let evo = null;
  if (A.evo && B.evo) evo = { to: fusionId(A.evo.to, B.evo.to), lvl: Math.max(A.evo.lvl, B.evo.lvl) };
  else if (A.evo) evo = { to: fusionId(A.evo.to, p[1]), lvl: A.evo.lvl };
  else if (B.evo) evo = { to: fusionId(p[0], B.evo.to), lvl: B.evo.lvl };
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  SPECIES[id] = {
    num: 1000 + (h % 9000), name: fusionName(A.name, B.name), types, rarity: 'mutation', stats, catchRate: 45,
    xp: Math.round((A.xp + B.xp) / 2 * 1.1), learn, evo, fusion: true, parents: p,
    lore: `Eine Mutation aus ${A.name} und ${B.name}, geschlüpft in der Brutstätte. Körperbau von ${A.name}, Farben${sig ? ' und ' + SIGN_NAME[sig] : ''} von ${B.name}.`,
    model: { ...A.model, main: B.model.main, accent: A.model.accent, glow: B.model.glow, size: Math.min(1.3, Math.max(0.6, (A.model.size + B.model.size) / 2)), extras, stage: A.model.stage },
    cry: { f: Math.round((A.cry.f + B.cry.f) / 2), f2: B.cry.f2, len: (A.cry.len + B.cry.len) / 2, wave: A.cry.wave, wob: B.cry.wob },
  };
  return SPECIES[id];
}

// Grundform einer Art (rückwärts durch die Entwicklungskette)
export function baseForm(sp) {
  const p = parseFx(sp); if (p) return fusionId(baseForm(p[0]), baseForm(p[1]));
  for (const [id, S] of Object.entries(SPECIES)) if (S.evo?.to === sp && !S.fusion) return baseForm(id);
  return sp;
}

export function canBreed(m) {
  const S = SPECIES[m.sp];
  return !m.egg && S && !S.legendary && S.rarity !== 'legendaer';
}

export function compatibility(a, b) {
  if (!canBreed(a) || !canBreed(b)) return 0;
  if (genderOf(a) === genderOf(b)) return 0; // braucht Männchen + Weibchen
  const A = SPECIES[a.sp], B = SPECIES[b.sp];
  if (a.sp === b.sp) return 3;
  return A.types.some(t => B.types.includes(t)) ? 2 : 1;
}

export function childSpecies(mother, father) {
  const a = baseForm(mother.sp), b = baseForm(father.sp);
  if (a === b) return a;
  const id = fusionId(a, b); ensureSpecies(id); return id;
}

// Brutzeit in Schritten: deutlich länger als früher (260/360), seltene Arten noch länger
const RAR_MUL = { gewoehnlich: 1, ungewoehnlich: 1.1, selten: 1.25, episch: 1.5 };
export function eggSteps(sp) { const S = SPECIES[sp]; return Math.round((S.fusion ? 1400 : 1000) * (RAR_MUL[S.rarity] || 1.15)); }
// Mutter = Weibchen (vererbt Körperbau), Vater = Männchen
export function parentsOf(dc) { const [a, b] = dc.mons; return genderOf(a) === 2 ? [a, b] : [b, a]; }

export function makeEgg(mother, father, rnd = Math.random) {
  const sp = childSpecies(mother, father);
  return {
    uid: newUid(), egg: true, sp, lvl: 1, hp: 0, xp: 0, moves: [], iv: {},
    steps: eggSteps(sp), mut: SPECIES[sp].fusion && rnd() < 0.18,
    parents: [mother.nick || SPECIES[mother.sp].name, father.nick || SPECIES[father.sp].name],
    inherit: [mother.moves[Math.floor(rnd() * mother.moves.length)]?.id, father.moves[Math.floor(rnd() * father.moves.length)]?.id].filter(Boolean),
    ivFrom: [mother.iv, father.iv],
  };
}

export function hatch(egg, rnd = Math.random) {
  ensureSpecies(egg.sp);
  const m = createMon(egg.sp, 5, rnd, { friendship: 120, mut: egg.mut });
  if (egg.mut && rnd() < 0.1) m.shiny = true;
  // 3 Werte von den Eltern erben
  const keys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].sort(() => rnd() - 0.5).slice(0, 3);
  for (const k of keys) { const src = egg.ivFrom[Math.floor(rnd() * 2)]; if (src && src[k] != null) m.iv[k] = src[k]; }
  // Erbattacken
  for (const id of egg.inherit) {
    if (!MOVES[id] || m.moves.some(x => x.id === id)) continue;
    if (m.moves.length < 4) m.moves.push({ id, pp: MOVES[id].pp }); else m.moves[m.moves.length - 1] = { id, pp: MOVES[id].pp };
  }
  m.hatchedFrom = egg.parents;
  m.hp = 1e9; // wird beim Heilen gekappt
  return m;
}

// Pro Schritt aufrufen: Brutstätte + Eier im Team. Liefert Ereignisse.
export function stepBreeding(state, rnd = Math.random) {
  const ev = [];
  const dc = state.daycare;
  if (dc && dc.mons.length) {
    dc.steps = (dc.steps || 0) + 1;
    for (const m of dc.mons) { const before = m.lvl; giveXp(m, 1); if (m.lvl > before) m.hp = Math.max(m.hp, 1); }
    // Paarung: nur alle 256 Schritte eine Chance, höchstens ein Ei wartet
    if (dc.mons.length === 2 && !dc.egg && dc.steps % 256 === 0) {
      const c = compatibility(dc.mons[0], dc.mons[1]);
      if (c && rnd() < [0, 0.2, 0.35, 0.5][c]) { const [mo, fa] = parentsOf(dc); dc.egg = makeEgg(mo, fa, rnd); ev.push({ t: 'eggReady' }); }
    }
  }
  const warm = state.team.some(m => !m.egg && m.hp > 0 && SPECIES[m.sp]?.types.includes('feuer'));
  for (const m of state.team) if (m.egg) {
    m.steps -= warm ? 2 : 1;
    if (m.steps <= 0) ev.push({ t: 'hatch', uid: m.uid });
  }
  return ev;
}
