// Shinobi-Akademie: dauerhafte Boni (Wissensbaum). Shinobi-Punkte gibt es pro Konto-Level und für erste Siege.
// Jede Schule ist eine Kette: Stufe n setzt Stufe n-1 derselben Schule voraus. Kosten wachsen mit der Stufe.
export const SCHOOLS = [
  { id: 'kampf', name: 'Kampfkunst', icon: '🗡', color: '#ff7a3d', desc: 'Schaden, Tempo, Reichweite' },
  { id: 'element', name: 'Elementarwissen', icon: '🔥', color: '#5fd6ff', desc: 'Brand, Frost, Reaktionen' },
  { id: 'handel', name: 'Handelshaus', icon: '💰', color: '#ffd257', desc: 'Münzen, Preise, Einkommen' },
  { id: 'schrein', name: 'Ahnenschrein', icon: '🏯', color: '#c39bff', desc: 'Leben, Helden, Erfahrung' },
];
const N = (school, tier, id, name, desc, fx) => ({ school, tier, id, name, desc, fx, cost: [1, 1, 1, 2, 2, 3][tier - 1] });
export const ACADEMY = [
  N('kampf', 1, 'k1', 'Scharfe Klingen', 'Alle Kreaturen +4 % Schaden.', { dmg: 0.04 }),
  N('kampf', 2, 'k2', 'Flinke Hände', 'Alle Kreaturen +4 % Angriffstempo.', { rate: 0.04 }),
  N('kampf', 3, 'k3', 'Adlerblick', 'Alle Kreaturen +5 % Reichweite.', { range: 0.05 }),
  N('kampf', 4, 'k4', 'Schwachstelle', '+5 % Krit-Chance für alle.', { crit: 0.05 }),
  N('kampf', 5, 'k5', 'Drachentöter', '+12 % Schaden gegen Bosse und Mini-Bosse.', { boss: 0.12 }),
  N('kampf', 6, 'k6', 'Weg der Klinge', '+6 % Schaden und +6 % Tempo für alle.', { dmg: 0.06, rate: 0.06 }),
  N('element', 1, 'e1', 'Glutfunke', 'Brandschaden +15 %.', { burn: 0.15 }),
  N('element', 2, 'e2', 'Eishauch', 'Verlangsamung +10 % stärker.', { slow: 0.1 }),
  N('element', 3, 'e3', 'Resonanz', 'Elementreaktionen +20 % Schaden.', { react: 0.2 }),
  N('element', 4, 'e4', 'Elementarfokus', 'Element-Angriffe (nicht physisch) +8 % Schaden.', { elem: 0.08 }),
  N('element', 5, 'e5', 'Seelenecho', 'Brand +20 %, Reaktionen +20 %.', { burn: 0.2, react: 0.2 }),
  N('element', 6, 'e6', 'Weisheit der Fünf', 'Element-Angriffe +12 %, Reaktionen +30 %.', { elem: 0.12, react: 0.3 }),
  N('handel', 1, 'h1', 'Spargroschen', '+100 Startmünzen.', { startCoins: 100 }),
  N('handel', 2, 'h2', 'Feilschen', 'Kreaturen kosten 5 % weniger.', { cost: 0.05 }),
  N('handel', 3, 'h3', 'Lehrgeld', 'Upgrades kosten 5 % weniger.', { upCost: 0.05 }),
  N('handel', 4, 'h4', 'Wellenlohn', '+15 % Münzen am Wellenende.', { waveBonus: 0.15 }),
  N('handel', 5, 'h5', 'Guter Händler', 'Verkaufen bringt +10 % mehr zurück.', { sell: 0.1 }),
  N('handel', 6, 'h6', 'Schatzmeister', '+250 Startmünzen, Einkommen +20 %.', { startCoins: 250, income: 0.2 }),
  N('schrein', 1, 's1', 'Schutzgeist', '+15 Leben zu Beginn.', { lives: 15 }),
  N('schrein', 2, 's2', 'Heldenweihe', 'Der Held startet 1 Level höher.', { heroLvl: 1 }),
  N('schrein', 3, 's3', 'Lehrmeister', '+10 % Charakter-XP für Kreaturen.', { charXp: 0.1 }),
  N('schrein', 4, 's4', 'Innere Ruhe', 'Fähigkeiten laden 10 % schneller.', { abCd: 0.1 }),
  N('schrein', 5, 's5', 'Ruhm', '+10 % Konto-XP.', { accXp: 0.1 }),
  N('schrein', 6, 's6', 'Ahnenwache', '+25 Leben, Held startet 2 Level höher.', { lives: 25, heroLvl: 2 }),
];
export const ACADEMY_BY_ID = Object.fromEntries(ACADEMY.map(n => [n.id, n]));

const owned = P => (P.academy ||= { owned: {} }).owned;
// Verdiente Punkte: 1 je Konto-Level ab Level 2, +1 je erstem Sieg (Karte × Normal/Schwer)
export function shinobiPoints(P) {
  let earned = Math.max(0, (P.account?.level || 1) - 1);
  for (const m of Object.values(P.maps || {})) { if ((m.normal || 0) >= 20) earned++; if ((m.hard || 0) >= 20) earned++; earned += Object.keys(m.medals || {}).length; }
  earned += P.daily?.sp || 0;   // Tageskämpfe
  earned += P.chestSp || 0;   // legendäre/mythische Truhen
  const ac = P.academy || {};
  earned += Object.keys(ac.master || {}).length * TRIAL_SP;   // Meistersiegel
  const spent = Object.keys(owned(P)).reduce((a, id) => a + (ACADEMY_BY_ID[id]?.cost || (SECRET[id] ? SECRET_COST : 0)), 0) + Object.keys(ac.spec || {}).length * SPEC_COST;
  return { earned, spent, free: earned - spent };
}
export function canLearn(P, id) {
  const n = ACADEMY_BY_ID[id]; if (!n) return { ok: false, why: '?' };
  const o = owned(P);
  if (o[id]) return { ok: false, why: 'Schon erlernt' };
  if (n.tier > 1 && !o[ACADEMY.find(x => x.school === n.school && x.tier === n.tier - 1).id]) return { ok: false, why: 'Erst die Stufe davor erlernen' };
  if (shinobiPoints(P).free < n.cost) return { ok: false, why: 'Zu wenig Shinobi-Punkte' };
  return { ok: true };
}
export function learn(P, id) { const c = canLearn(P, id); if (c.ok) owned(P)[id] = 1; return c; }
export function resetAcademy(P) { const m = P.academy?.master || {}; P.academy = { owned: {}, master: m, spec: {} }; }   // Siegel bleiben
// Alle erlernten Boni aufsummiert – geht als `academy` an die Welt
export function academyFx(P) {
  const fx = {};
  for (const id in owned(P)) for (const [k, v] of Object.entries((ACADEMY_BY_ID[id] || SECRET[id])?.fx || {})) fx[k] = (fx[k] || 0) + v;
  for (const id of Object.values(P.academy?.spec || {})) for (const [k, v] of Object.entries(SPEC[id]?.fx || {})) fx[k] = (fx[k] || 0) + v;
  return fx;
}

// ───────── Akademie 2.0 (Vision P9): Meisterprüfungen → Spezialisierungen, geheime Knoten ─────────
// Meisterprüfung je Schule: freigeschaltet ab Stufe 4 der Schule. Sieg (Welle 20) = Meistersiegel (+2 Shinobi-Punkte, Truhe)
// und öffnet die Wahl einer von zwei Spezialisierungen.
export const TRIAL_NEED = 4;
export const TRIALS = [
  { id: 'trial_kampf', school: 'kampf', name: 'Prüfung der Klinge', icon: '🗡', map: 'ahnenhain', diff: 'normal', desc: 'Doppelte KP und keine Pausen zwischen den Wellen.', mods: { dblHp: true, apoc: true } },
  { id: 'trial_element', school: 'element', name: 'Prüfung der Elemente', icon: '🔥', map: 'dorf', diff: 'normal', desc: 'Physischer Schaden ist um 60 % geschwächt – nur Elemente tragen.', mods: { physWeak: 0.6 } },
  { id: 'trial_handel', school: 'handel', name: 'Prüfung des Händlers', icon: '💰', map: 'ahnenhain', diff: 'normal', desc: 'Halbes Gold und die Gegner laufen rückwärts.', mods: { halfCash: true, reverse: true } },
  { id: 'trial_schrein', school: 'schrein', name: 'Prüfung des Schreins', icon: '🏯', map: 'dorf', diff: 'normal', desc: 'Nur 10 Leben, kein Verkaufen.', mods: { lifeCap: 10, noSell: true } },
];
export const TRIAL = Object.fromEntries(TRIALS.map(t => [t.id, t]));
// Spezialisierung: nach dem Siegel genau eine von zwei pro Schule (Wechsel jederzeit kostenlos)
export const SPECS = [
  { id: 'sp_klinge', school: 'kampf', name: 'Klingenmeister', icon: '⚔', desc: 'Kritische Treffer +40 % stärker, +5 % Krit-Chance.', fx: { critMul: 0.4, crit: 0.05 } },
  { id: 'sp_falke', school: 'kampf', name: 'Falkenauge', icon: '🦅', desc: '+10 % Reichweite, +8 % Tempo.', fx: { range: 0.1, rate: 0.08 } },
  { id: 'sp_pyro', school: 'element', name: 'Glutweber', icon: '🔥', desc: 'Brand +40 %, Element-Angriffe +6 %.', fx: { burn: 0.4, elem: 0.06 } },
  { id: 'sp_kette', school: 'element', name: 'Kettenweber', icon: '⛓', desc: 'Kettenreaktionen +15 % je Glied, Reaktionen +20 %.', fx: { chain: 0.15, react: 0.2 } },
  { id: 'sp_kopf', school: 'handel', name: 'Kopfgeldjäger', icon: '🎯', desc: 'Jeder Besiegte bringt +15 % Münzen.', fx: { bounty: 0.15 } },
  { id: 'sp_zins', school: 'handel', name: 'Zinsmeister', icon: '🏦', desc: '+20 % Wellenlohn, Einkommen +25 %.', fx: { waveBonus: 0.2, income: 0.25 } },
  { id: 'sp_held', school: 'schrein', name: 'Heldenpfad', icon: '🦸', desc: 'Helden +25 % Schaden, starten 1 Level höher.', fx: { heroDmg: 0.25, heroLvl: 1 } },
  { id: 'sp_geist', school: 'schrein', name: 'Geistwächter', icon: '👻', desc: '+30 Leben, Fähigkeiten laden 8 % schneller.', fx: { lives: 30, abCd: 0.08 } },
];
export const SPEC = Object.fromEntries(SPECS.map(s => [s.id, s]));
// Geheime Knoten: erst als „???“ mit Hinweis sichtbar, enthüllt durch eine Tat; kosten je 1 Punkt
export const SECRETS = [
  { id: 'x_combo', name: 'Fluss des Kampfes', icon: '🌊', hint: 'Erreiche eine Combo von ×50.', test: P => (P.stats?.bestCombo || 0) >= 50, desc: '+5 % Angriffstempo, Combos halten 0,5 s länger.', fx: { rate: 0.05, comboWin: 0.5 } },
  { id: 'x_codex', name: 'Gelehrter', icon: '📜', hint: 'Entdecke 40 Codex-Einträge.', test: P => Object.keys(P.codex?.seen || {}).length >= 40, desc: 'Reaktionen +15 %.', fx: { react: 0.15 } },
  { id: 'x_mega', name: 'Mega-Erbe', icon: '✴', hint: 'Erwecke eine Mega-Form.', test: P => Object.keys(P.codex?.seen || {}).some(k => k.startsWith('m:')), desc: 'Alle Kreaturen +5 % Schaden.', fx: { dmg: 0.05 } },
  { id: 'x_stag', name: 'Bossbrecher', icon: '💥', hint: 'Unterbrich 5-mal einen Boss-Angriff.', test: P => (P.stats?.staggers || 0) >= 5, desc: '+10 % Schaden gegen Bosse.', fx: { boss: 0.1 } },
];
export const SECRET = Object.fromEntries(SECRETS.map(s => [s.id, s]));
export const SECRET_COST = 1, SPEC_COST = 2, TRIAL_SP = 2;

const A2 = P => { const a = P.academy ||= { owned: {} }; a.master ||= {}; a.spec ||= {}; return a; };
export const trialOpen = (P, t) => !!A2(P).owned[ACADEMY.find(n => n.school === t.school && n.tier === TRIAL_NEED).id];
export const hasSeal = (P, school) => !!A2(P).master[school];
export const secretFound = (P, id) => !!SECRET[id]?.test(P);
// Spezialisierung wählen/wechseln (Punkte zählt shinobiPoints über spentExtra)
export function chooseSpec(P, id) {
  const s = SPEC[id], a = A2(P); if (!s) return { ok: false, why: '?' };
  if (!hasSeal(P, s.school)) return { ok: false, why: 'Erst die Meisterprüfung bestehen' };
  if (a.spec[s.school] === id) return { ok: false, why: 'Schon gewählt' };
  if (!a.spec[s.school] && shinobiPoints(P).free < SPEC_COST) return { ok: false, why: 'Zu wenig Shinobi-Punkte' };
  a.spec[s.school] = id; return { ok: true };
}
export function canLearnSecret(P, id) {
  if (A2(P).owned[id]) return { ok: false, why: 'Schon erlernt' };
  if (!secretFound(P, id)) return { ok: false, why: 'Noch verborgen' };
  if (shinobiPoints(P).free < SECRET_COST) return { ok: false, why: 'Zu wenig Shinobi-Punkte' };
  return { ok: true };
}
export function learnSecret(P, id) { const c = canLearnSecret(P, id); if (c.ok) A2(P).owned[id] = 1; return c; }
// Prüfung bestanden → Siegel; gibt true beim ersten Mal
export function passTrial(P, trialId) { const t = TRIAL[trialId], a = A2(P); if (!t || a.master[t.school]) return false; a.master[t.school] = 1; return true; }
