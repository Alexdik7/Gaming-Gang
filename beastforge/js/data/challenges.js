// Herausforderungs-Modi je Karte. need: welcher Sieg auf der Karte nötig ist. Ein Sieg gibt eine Medaille (+ Shinobi-Punkt).
export const CHALLENGES = [
  { id: 'std', name: 'Standard', icon: '⚔', desc: 'Die normalen Regeln.' },
  { id: 'basic', name: 'Nur Grundformen', icon: '🥚', desc: 'Kreaturen können im Kampf nicht erweckt werden.', need: 'normal', mods: { basic: true } },
  { id: 'half', name: 'Halbes Gold', icon: '🪙', desc: 'Alle Münzeinnahmen sind halbiert.', need: 'normal', mods: { halfCash: true } },
  { id: 'rev', name: 'Umgekehrt', icon: '↩', desc: 'Die Gegner laufen den Weg rückwärts.', need: 'normal', mods: { reverse: true } },
  { id: 'dbl', name: 'Doppelte KP', icon: '💪', desc: 'Alle Gegner haben doppelt so viele KP.', need: 'normal', mods: { dblHp: true } },
  { id: 'apoc', name: 'Apokalypse', icon: '🌋', desc: 'Die Wellen kommen ohne Pause hintereinander.', need: 'normal', mods: { apoc: true } },
  { id: 'rush', name: 'Boss-Rush', icon: '👹', desc: '6 Bosse nacheinander mit Gefolge · große Start-Kasse und Kriegskasse nach jedem Boss.', need: 'hard', mods: { rush: true }, endgame: true },
  { id: 'soul', name: 'Seelenbrand', icon: '💀', desc: 'Schwer · nur 1 Leben · kein Verkaufen · kein Einkommen.', need: 'hard', mods: { soulburn: true }, diff: 'hard' },
];
export const CH = Object.fromEntries(CHALLENGES.map(c => [c.id, c]));
export const chUnlocked = (P, mapId, id) => { const c = CH[id], mp = P.maps?.[mapId] || {}; return !c.need || (mp[c.need] || 0) >= 20; };

// Karte rückwärts: Start nach außen verlängern, Ende in die Karte holen
export function reversedMap(m) {
  const fix = p => {
    const r = [...p].reverse().map(q => [...q]), [a, b] = r;
    const dx = a[0] - b[0], dy = a[1] - b[1], L = Math.hypot(dx, dy) || 1;
    if (a[0] > 0 && a[0] < m.w && a[1] > 0 && a[1] < m.h) r[0] = [a[0] + dx / L * 1.6, a[1] + dy / L * 1.6];
    const z = r[r.length - 1]; z[0] = Math.min(m.w - 0.6, Math.max(0.6, z[0])); z[1] = Math.min(m.h - 0.6, Math.max(0.6, z[1]));
    return r;
  };
  const paths = (m.paths || [m.path]).map(fix);
  return { ...m, paths: m.paths ? paths : undefined, path: paths[0], reversed: true };
}
