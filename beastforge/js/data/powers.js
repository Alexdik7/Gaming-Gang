// Kräfte: Verbrauchsgegenstände für den Run (Vorrat im Profil `P.powers`).
// target = auf die Karte tippen · inst = Sofort-Kreatur (gratis, mit fertigen Upgrades).
export const POWERS = [
  { id: 'bomb', name: 'Seelenbombe', icon: '💥', color: '#ff7a3a', target: true, desc: 'Tippe auf die Karte: gewaltige Explosion, betäubt alle Getroffenen.' },
  { id: 'freeze', name: 'Zeitstopp', icon: '⏳', color: '#9fe0ff', desc: 'Alle Gegner erstarren 4 s (Bosse 1 s).' },
  { id: 'rage', name: 'Kampfrausch', icon: '🔥', color: '#ff5a5a', desc: 'Alle Kreaturen greifen 15 s lang 60 % schneller an.' },
  { id: 'gold', name: 'Münzregen', icon: '🪙', color: '#ffd257', desc: 'Sofort Münzen – je später die Welle, desto mehr.' },
  { id: 'heal', name: 'Lebensquelle', icon: '💚', color: '#5fe68a', desc: '+25 Leben, auch über das Maximum.' },
  { id: 'inst_kitsune', name: 'Sofort-Kitsune', icon: '🦊', color: '#ff9a4a', inst: { cid: 'kitsune', tiers: [3, 0, 2] }, desc: 'Gratis Kitsune mit Upgrades 3-0-2. Wie gewohnt platzieren.' },
  { id: 'inst_turtle', name: 'Sofort-Schildkröte', icon: '🐢', color: '#7ac0a0', inst: { cid: 'turtle', tiers: [2, 3, 0] }, desc: 'Gratis Eisenschildkröte mit Upgrades 2-3-0.' },
  { id: 'inst_tiger', name: 'Sofort-Donnertiger', icon: '🐯', color: '#ffe14d', inst: { cid: 'tiger', tiers: [0, 3, 2] }, desc: 'Gratis Donnertiger mit Upgrades 0-3-2.' },
];
export const POWER = Object.fromEntries(POWERS.map(p => [p.id, p]));
export const START_POWERS = { bomb: 2, freeze: 1, rage: 1, gold: 1, heal: 1, inst_kitsune: 1 };

// Zufällige Kraft (Sofort-Kreaturen seltener)
export function rollPower(r = Math.random) {
  const pool = POWERS.flatMap(p => Array(p.inst ? 1 : 3).fill(p.id));
  return pool[Math.floor(r() * pool.length)];
}
export function givePowers(P, n, r = Math.random) {
  const got = [];
  for (let i = 0; i < n; i++) { const id = rollPower(r); P.powers[id] = (P.powers[id] || 0) + 1; got.push(id); }
  return got;
}
// Belohnung am Rundenende: 1 je 10 überstandene Wellen (max 4) + 1 für Sieg (+1 auf Schwer/Meister)
export const runPowerReward = (wave, won, diff) => Math.min(4, Math.floor(wave / 10)) + (won ? 1 : 0) + (won && (diff === 'hard' || diff === 'master') ? 1 : 0);
