// Prüfungsturm (Vision P11): 10 Etagen mit wachsenden Regeln. Etage n braucht Etage n-1.
// Jede Etage einmalig: Truhe; alle 5 Etagen +1 Shinobi-Punkt (zählt in shinobiPoints über towerSp).
export const TOWER_LVL = 15;   // Konto-Level zum Freischalten
const F = (n, map, diff, waves, mods, name, desc) => ({ id: 'tower_' + n, n, map, diff, mods: { ...mods, waves }, name, desc, waves });
export const FLOORS = [
  F(1, 'ahnenhain', 'normal', 15, { basic: true }, 'Tor der Anfänger', 'Nur Grundformen.'),
  F(2, 'dorf', 'normal', 15, { halfCash: true }, 'Halle des Geizes', 'Halbes Gold.'),
  F(3, 'glut', 'normal', 20, { reverse: true }, 'Umgekehrte Glut', 'Gegner laufen rückwärts.'),
  F(4, 'frost', 'normal', 20, { dblHp: true }, 'Eiserne Wand', 'Doppelte KP.'),
  F(5, 'sky', 'normal', 20, { physWeak: 0.5 }, 'Wolkenschrein', 'Physischer Schaden −50 %.'),
  F(6, 'ahnenhain', 'hard', 25, { apoc: true }, 'Sturm ohne Pause', 'Schwer · Wellen ohne Pause.'),
  F(7, 'dorf', 'hard', 25, { lifeCap: 20, noSell: true }, 'Letzte Mauer', 'Schwer · 20 Leben · kein Verkaufen.'),
  F(8, 'glut', 'hard', 25, { dblHp: true, halfCash: true }, 'Aschekammer', 'Schwer · doppelte KP · halbes Gold.'),
  F(9, 'frost', 'hard', 30, { reverse: true, apoc: true }, 'Spiegeleis', 'Schwer · rückwärts · ohne Pause.'),
  F(10, 'sky', 'hard', 6, { rush: true, physWeak: 0.3 }, 'Gipfel der Bosse', 'Schwer · Boss-Rush · Physisch −30 %.'),
];
export const FLOOR = Object.fromEntries(FLOORS.map(f => [f.id, f]));
export const towerBest = P => P.tower?.best || 0;
export const towerSp = P => Math.floor(towerBest(P) / 5);
export const floorOpen = (P, f) => (P.account?.level || 1) >= TOWER_LVL && f.n <= towerBest(P) + 1;
// Sieg auf Etage → Rekord; gibt true beim ersten Mal
export function clearFloor(P, id) { const f = FLOOR[id]; if (!f) return false; P.tower ||= { best: 0 }; if (f.n <= P.tower.best) return false; P.tower.best = f.n; return true; }
