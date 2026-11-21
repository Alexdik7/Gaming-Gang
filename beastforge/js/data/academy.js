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
  const spent = Object.keys(owned(P)).reduce((a, id) => a + (ACADEMY_BY_ID[id]?.cost || 0), 0);
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
export function resetAcademy(P) { P.academy = { owned: {} }; }
// Alle erlernten Boni aufsummiert – geht als `academy` an die Welt
export function academyFx(P) {
  const fx = {};
  for (const id in owned(P)) for (const [k, v] of Object.entries(ACADEMY_BY_ID[id]?.fx || {})) fx[k] = (fx[k] || 0) + v;
  return fx;
}
