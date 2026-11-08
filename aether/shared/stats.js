// Statuswerte, Wesenszüge und Individualität einer Kreatur. Reine Funktionen, gemeinsam für Client und Server.
// Werte: kp, atk, def, sat (Spezialangriff), sdf (Spezialverteidigung), ini (Geschwindigkeit).

export const STATS = ['kp', 'atk', 'def', 'sat', 'sdf', 'ini'];
export const STAT_NAMES = { kp: 'KP', atk: 'Angriff', def: 'Verteidigung', sat: 'Sp.-Angriff', sdf: 'Sp.-Vert.', ini: 'Initiative' };
export const MAX_LEVEL = 100;
export const IV_MAX = 31;       // „Anlage“ pro Wert, bei Begegnung festgelegt
export const EV_STAT_MAX = 252; // „Training“ pro Wert
export const EV_TOTAL_MAX = 510;

// 25 Wesenszüge: 5 ausgeglichene, 20 mit +10 % / −10 % auf zwei Nicht-KP-Werte.
const UP = ['atk', 'def', 'sat', 'sdf', 'ini'];
const NAMES = [
  ['Ruhig', 'Draufgängerisch', 'Stur', 'Raufend', 'Ungestüm'],
  ['Behäbig', 'Gelassen', 'Verschmitzt', 'Bedächtig', 'Wachsam'],
  ['Grüblerisch', 'Mild', 'Scheu', 'Funkelnd', 'Hitzig'],
  ['Sanft', 'Taktvoll', 'Vorsichtig', 'Würdevoll', 'Kühl'],
  ['Hastig', 'Fröhlich', 'Naiv', 'Flink', 'Verträumt'],
];
export const TEMPERAMENTS = [];
UP.forEach((up, i) => UP.forEach((down, j) => {
  TEMPERAMENTS.push({ id: TEMPERAMENTS.length, name: NAMES[i][j], up: i === j ? null : up, down: i === j ? null : down });
}));

export function temperamentMod(t, stat) {
  if (!t || !t.up) return 1;
  if (t.up === stat) return 1.1;
  if (t.down === stat) return 0.9;
  return 1;
}

/** Berechnet einen Wert. Formel bewusst offen dokumentiert (TECHNICAL_ARCHITECTURE.md). */
export function calcStat(stat, base, level, iv = 0, ev = 0, temperament = null) {
  const core = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100);
  if (stat === 'kp') return core + level + 10;
  return Math.floor((core + 5) * temperamentMod(temperament, stat));
}

export function calcAll(species, level, ivs, evs, temperamentId) {
  const t = TEMPERAMENTS[temperamentId];
  const out = {};
  for (const s of STATS) out[s] = calcStat(s, species.base[s], level, ivs[s], evs[s], t);
  return out;
}

/** EP-Kurven: Gesamt-EP, um Level n zu erreichen. */
export const GROWTH = {
  fast:   (n) => Math.floor((4 * n ** 3) / 5),
  medium: (n) => n ** 3,
  slow:   (n) => Math.floor((5 * n ** 3) / 4),
};
export function levelForExp(growth, exp) {
  const f = GROWTH[growth];
  let l = 1;
  while (l < MAX_LEVEL && f(l + 1) <= exp) l++;
  return l;
}

/** Einfacher, seedbarer Zufall (mulberry32). Server nutzt crypto-Seeds, Tests feste Seeds. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SHINY_ODDS = 1 / 2048; // „Schimmer“-Farbvariante
