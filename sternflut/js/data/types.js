// Typensystem: 14 Elementtypen + Normal
export const TYPES = {
  normal:   { name: 'Normal',   color: '#b8b3a6' },
  feuer:    { name: 'Feuer',    color: '#ff6a2b' },
  wasser:   { name: 'Wasser',   color: '#3d9bff' },
  pflanze:  { name: 'Pflanze',  color: '#4fcf5c' },
  elektro:  { name: 'Elektro',  color: '#ffd23a' },
  eis:      { name: 'Eis',      color: '#8fe8ff' },
  drache:   { name: 'Drache',   color: '#7a5cff' },
  schatten: { name: 'Schatten', color: '#5b4a7a' },
  licht:    { name: 'Licht',    color: '#fff3a8' },
  erde:     { name: 'Erde',     color: '#c49152' },
  luft:     { name: 'Luft',     color: '#a8d8f0' },
  gift:     { name: 'Gift',     color: '#b45ce0' },
  metall:   { name: 'Metall',   color: '#9fb0bf' },
  geist:    { name: 'Geist',    color: '#8a7dd6' },
  magie:    { name: 'Magie',    color: '#ff7ad9' },
  astral:   { name: 'Astral',   color: '#7a6aff' },
};

// [stark gegen], [schwach gegen], [wirkungslos gegen]
const CHART = {
  normal:   [[], ['metall'], ['geist']],
  feuer:    [['pflanze', 'eis', 'metall'], ['feuer', 'wasser', 'erde', 'drache'], []],
  wasser:   [['feuer', 'erde'], ['wasser', 'pflanze', 'drache'], []],
  pflanze:  [['wasser', 'erde'], ['feuer', 'pflanze', 'luft', 'gift', 'metall', 'drache'], []],
  elektro:  [['wasser', 'luft'], ['elektro', 'pflanze', 'drache'], ['erde']],
  eis:      [['pflanze', 'erde', 'luft', 'drache'], ['feuer', 'wasser', 'eis', 'metall'], []],
  drache:   [['drache'], ['metall'], ['magie']],
  schatten: [['licht', 'geist', 'magie', 'astral'], ['schatten'], []],
  licht:    [['schatten', 'geist'], ['licht', 'metall'], []],
  erde:     [['feuer', 'elektro', 'gift', 'metall'], ['pflanze'], ['luft']],
  luft:     [['pflanze'], ['elektro', 'metall'], []],
  gift:     [['pflanze', 'magie'], ['gift', 'erde', 'geist'], ['metall']],
  metall:   [['eis', 'magie', 'astral'], ['feuer', 'wasser', 'elektro', 'metall'], []],
  geist:    [['geist', 'magie'], ['schatten'], ['normal']],
  magie:    [['drache', 'schatten'], ['feuer', 'metall', 'gift', 'astral'], []],
  astral:   [['magie', 'drache', 'geist', 'licht'], ['metall', 'astral', 'schatten'], []],
};

export function effectiveness(atkType, defTypes) {
  const [strong, weak, immune] = CHART[atkType] || [[], [], []];
  let m = 1;
  for (const d of defTypes) {
    if (immune.includes(d)) return 0;
    if (strong.includes(d)) m *= 2;
    if (weak.includes(d)) m *= 0.5;
  }
  return m;
}
