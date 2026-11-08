// Elementarsystem von Aetherwild – 14 Elemente, gemeinsam für Client und Server.
// Tabelle aus Sicht des ANGREIFERS: strong = x2, weak = x0.5, none = x0. Alles andere x1.

export const TYPES = ['WILD', 'GLUT', 'FLUT', 'FLOR', 'FUNKE', 'FROST', 'FELS', 'WIND', 'GIFT', 'GEIST', 'LICHT', 'SCHATTEN', 'METALL', 'KLANG'];

export const TYPE_INFO = {
  WILD:     { name: 'Wild',     color: '#b8a888', desc: 'Ungebundener Äther. Neutral, aber Klang bringt ihn aus dem Takt.' },
  GLUT:     { name: 'Glut',     color: '#e8603c', desc: 'Hitze aus den Vulkanadern. Schmilzt Frost und Metall.' },
  FLUT:     { name: 'Flut',     color: '#3c8ce8', desc: 'Strömender Äther der Meere.' },
  FLOR:     { name: 'Flor',     color: '#54b848', desc: 'Wachstum, Wurzeln, Sporen.' },
  FUNKE:    { name: 'Funke',    color: '#f0d038', desc: 'Gewitter-Äther. Fels erdet ihn vollständig.' },
  FROST:    { name: 'Frost',    color: '#8ee0f0', desc: 'Kälte der Hochgipfel.' },
  FELS:     { name: 'Fels',     color: '#a08058', desc: 'Stein und Erde. Erdet Funken.' },
  WIND:     { name: 'Wind',     color: '#a0c8e0', desc: 'Luftströme und Flug.' },
  GIFT:     { name: 'Gift',     color: '#a050c0', desc: 'Sumpfgase und Toxine. An Metall wirkungslos.' },
  GEIST:    { name: 'Geist',    color: '#7060a8', desc: 'Echos Verstorbener. Für Wildes unberührbar.' },
  LICHT:    { name: 'Licht',    color: '#f8f0b0', desc: 'Strahlender Äther der Morgenstunden.' },
  SCHATTEN: { name: 'Schatten', color: '#403858', desc: 'Der Gegenpol des Lichts – beide verletzen einander.' },
  METALL:   { name: 'Metall',   color: '#a8b0c0', desc: 'Erz und Legierung, zäh und kalt.' },
  KLANG:    { name: 'Klang',    color: '#e88ac8', desc: 'Schwingung. Zerreißt Metall und Eis.' },
};

export const CHART = {
  WILD:     { strong: [], weak: ['FELS', 'METALL'], none: ['GEIST'] },
  GLUT:     { strong: ['FLOR', 'FROST', 'METALL'], weak: ['GLUT', 'FLUT', 'FELS'], none: [] },
  FLUT:     { strong: ['GLUT', 'FELS'], weak: ['FLUT', 'FLOR', 'FROST'], none: [] },
  FLOR:     { strong: ['FLUT', 'FELS'], weak: ['GLUT', 'FLOR', 'GIFT', 'WIND', 'METALL'], none: [] },
  FUNKE:    { strong: ['FLUT', 'WIND', 'METALL'], weak: ['FLOR', 'FUNKE'], none: ['FELS'] },
  FROST:    { strong: ['FLOR', 'WIND'], weak: ['GLUT', 'FLUT', 'FROST', 'METALL'], none: [] },
  FELS:     { strong: ['GLUT', 'FROST', 'WIND', 'FUNKE'], weak: ['FLOR', 'METALL'], none: [] },
  WIND:     { strong: ['FLOR', 'GIFT'], weak: ['FELS', 'FUNKE', 'METALL'], none: [] },
  GIFT:     { strong: ['FLOR', 'LICHT'], weak: ['GIFT', 'FELS', 'GEIST'], none: ['METALL'] },
  GEIST:    { strong: ['GEIST', 'KLANG'], weak: ['SCHATTEN'], none: ['WILD'] },
  LICHT:    { strong: ['SCHATTEN', 'GEIST'], weak: ['LICHT', 'METALL', 'GLUT'], none: [] },
  SCHATTEN: { strong: ['LICHT', 'GEIST'], weak: ['SCHATTEN', 'METALL'], none: [] },
  METALL:   { strong: ['FROST', 'FELS'], weak: ['GLUT', 'FLUT', 'FUNKE', 'METALL'], none: [] },
  KLANG:    { strong: ['METALL', 'FROST', 'WILD'], weak: ['KLANG', 'FLOR'], none: [] },
};

/** Multiplikator eines Angriffs-Elements gegen ein einzelnes Verteidiger-Element. */
export function single(atk, def) {
  const r = CHART[atk];
  if (!r) throw new Error('unknown type ' + atk);
  if (r.none.includes(def)) return 0;
  if (r.strong.includes(def)) return 2;
  if (r.weak.includes(def)) return 0.5;
  return 1;
}

/** Gesamtmultiplikator gegen eine Kreatur mit 1–2 Elementen (Produkt: 0, 0.25, 0.5, 1, 2, 4). */
export function effectiveness(atk, defTypes) {
  return defTypes.reduce((m, d) => m * single(atk, d), 1);
}
