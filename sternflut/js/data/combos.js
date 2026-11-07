// Duo-Kombos: zwei Kreaturen vereinen ihre Kräfte (einmal pro Doppelkampf, braucht den Duostein)
// Schlüssel: zwei Typen alphabetisch sortiert, mit '+' verbunden. fx: Zusatzwirkung.
export const COMBOS = {
  'feuer+wasser': { name: 'Dampfgeysir', fx: { stat: 'acc', stages: -1 } },
  'feuer+pflanze': { name: 'Glutranke', fx: { status: 'brand', chance: 40 } },
  'feuer+luft': { name: 'Feuersturm', fx: { status: 'brand', chance: 30 } },
  'elektro+wasser': { name: 'Gewitterflut', fx: { status: 'starre', chance: 35 } },
  'pflanze+wasser': { name: 'Lebensquell', fx: { heal: 0.25 } },
  'licht+pflanze': { name: 'Sonnenblüte', fx: { heal: 0.3 } },
  'eis+wasser': { name: 'Frostwelle', fx: { stat: 'spe', stages: -1 } },
  'eis+luft': { name: 'Blizzardwirbel', fx: { stat: 'spe', stages: -1 } },
  'elektro+metall': { name: 'Magnetsturm', fx: { status: 'starre', chance: 30 } },
  'erde+feuer': { name: 'Vulkanbruch', fx: { stat: 'def', stages: -1 } },
  'erde+wasser': { name: 'Schlammlawine', fx: { stat: 'spe', stages: -1 } },
  'drache+feuer': { name: 'Drachenglut', fx: { status: 'brand', chance: 30 } },
  'licht+schatten': { name: 'Zwielicht', fx: { stat: 'spd', stages: -1 } },
  'geist+schatten': { name: 'Albtraumtanz', fx: { stat: 'atk', stages: -1 } },
  'gift+pflanze': { name: 'Giftblütenregen', fx: { status: 'gift', chance: 45 } },
  'astral+licht': { name: 'Sternenregen', fx: { heal: 0.2 } },
  'astral+magie': { name: 'Galaxiewirbel', fx: { stat: 'spd', stages: -1 } },
  'luft+wasser': { name: 'Taifun', fx: { stat: 'acc', stages: -1 } },
  'elektro+luft': { name: 'Donnerorkan', fx: { status: 'starre', chance: 30 } },
  'erde+metall': { name: 'Eisenbeben', fx: { stat: 'def', stages: -1 } },
  'drache+luft': { name: 'Himmelsdrache', fx: { stat: 'def', stages: -1 } },
  'magie+licht': { name: 'Prismenstrahl', fx: { stat: 'spa', stages: -1 } },
  'eis+metall': { name: 'Kristallklinge', fx: { stat: 'def', stages: -1 } },
};
const SAME = { feuer: 'Doppelinferno', wasser: 'Doppelflut', pflanze: 'Waldchor', elektro: 'Doppelblitz', eis: 'Eiszeit', drache: 'Drachenduett', schatten: 'Finsternis', licht: 'Doppelglanz', erde: 'Erdstoß', luft: 'Zwillingswind', gift: 'Giftnebel', metall: 'Stahlhagel', geist: 'Spukchor', magie: 'Zauberreigen', astral: 'Supernova', normal: 'Doppelschlag' };
export function comboOf(a, b) {
  if (a === b) return { name: SAME[a] || 'Duo-Schlag', fx: { stat: 'atk', stages: -1 } };
  return COMBOS[[a, b].sort().join('+')] || { name: 'Duo-Sturm', fx: null };
}
