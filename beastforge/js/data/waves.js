// Wellen als Daten: [art, anzahl, abstand(s), verzögerung(s), modifikatoren]
// Modifikatoren: fast (+30 % Tempo), armored (Panzer), regen (2 %/s), elite (×2,2 KP, Krone)
const g = (e, n, gap, delay = 0, mods = []) => ({ e, n, gap, delay, mods });

export const WAVES = [
  /* 1 */ { groups: [g('slime', 12, 0.95)] },
  /* 2 */ { groups: [g('slime', 12, 0.7), g('l2', 10, 0.5, 3)], tip: 'Seelenschleime platzen in kleinere Schichten – Tau, Moos, Glut, Sturm, Sonne.' },
  /* 3 */ { groups: [g('slime', 10, 0.8), g('wolf', 6, 0.9, 4)] },
  /* 4 */ { groups: [g('wolf', 14, 0.55), g('l3', 12, 0.45, 3)] },
  /* 5 */ { groups: [g('boar', 5, 1.6), g('slime', 16, 0.5, 2)], tip: 'Eisenkeiler sind gepanzert – Feuer, Geist oder Blitz wirken besser.' },
  /* 6 */ { groups: [g('wisp', 10, 1.0), g('wolf', 12, 0.5, 5)], tip: 'Irrlichter fliegen: Schockwellen der Schildkröte treffen sie nicht.' },
  /* 7 */ { groups: [g('boar', 6, 1.4), g('wisp', 8, 1.0, 4), g('l4', 14, 0.4, 8)] },
  /* 8 */ { groups: [g('shade', 7, 1.3), g('wolf', 14, 0.45, 2)], tip: 'Getarnte Gegner! Du brauchst Erkennung: Schattenrabe, Geistsicht oder Sternenblick.' },
  /* 9 */ { groups: [g('beetle', 8, 1.4), g('mage', 3, 3, 4), g('l5', 14, 0.4, 2)] },
  /* 10 */ { groups: [g('slime', 22, 0.35), g('boar', 6, 1.2, 3), g('oni', 1, 1, 9)], miniboss: true, tip: 'Mini-Boss: Der Oni-Hauptmann treibt seine Truppen an.' },
  /* 11 */ { groups: [g('healer', 4, 2.5), g('boar', 10, 0.9, 1), g('wolf', 18, 0.35, 6), g('kokon', 4, 1.6, 3)], tip: 'Seelenkokons sind gepanzert und zerbrechen in zwei Sonnenschleime.' },
  /* 12 */ { groups: [g('wolf', 44, 0.24, 0, ['fast'])], mods: ['fast'], tip: 'Ein Rudel – sehr schnell!' },
  /* 13 */ { groups: [g('golem', 1, 1), g('beetle', 8, 1.1, 2), g('mage', 2, 2.5, 5)] },
  /* 14 */ { groups: [g('boar', 6, 1.6, 0, ['elite']), g('shade', 10, 0.8, 2), g('wisp', 14, 0.6, 5)], mods: ['elite'] },
  /* 15 */ { groups: [g('shade', 16, 0.6), g('wisp', 20, 0.45, 3), g('healer', 4, 2, 6)] },
  /* 16 */ { groups: [g('boar', 10, 0.9, 0, ['armored']), g('mage', 6, 2, 3), g('l5', 18, 0.3, 4), g('kokon', 4, 1.6, 9)], mods: ['armored'] },
  /* 17 */ { groups: [g('golem', 2, 8), g('healer', 4, 2.4, 2), g('beetle', 10, 0.9, 4)] },
  /* 18 */ { groups: [g('wolf', 14, 0.5, 0, ['elite']), g('wisp', 8, 0.9, 2, ['elite']), g('mage', 6, 1.6, 4), g('shade', 14, 0.6, 6)], mods: ['elite'] },
  /* 19 */ { groups: [g('whale', 1, 1, 10), g('golem', 2, 6), g('boar', 8, 0.9, 2, ['regen']), g('beetle', 8, 0.8, 5), g('healer', 4, 2, 6), g('shade', 10, 0.7, 8)], mods: ['regen'] },
  /* 20 */ { groups: [g('slime', 20, 0.4), g('wolf', 12, 0.45, 4), g('vharox', 1, 1, 9)], boss: 'vharox', tip: 'BOSS: Vharox, der Abgrunddrache!' },
  // ───── Welle 21–40: Schwer (Ende 40 mit erwachtem Vharox) ─────
  /* 21 */ { groups: [g('l5', 30, 0.28, 0, ['fast']), g('kokon', 6, 1.4, 4)], tip: 'Ab hier wird es ernst: Wellen 21–40 (Schwer) und 41–60 (Meister).' },
  /* 22 */ { groups: [g('bearer', 8, 1.3), g('mage', 4, 2, 2), g('wolf', 24, 0.35, 5)], tip: 'Schildträger schützen die Gruppe – Blitz und Erde brechen Schilde schneller.' },
  /* 23 */ { groups: [g('wisp', 26, 0.45), g('shade', 14, 0.6, 3)] },
  /* 24 */ { groups: [g('kokon', 10, 1.0), g('beetle', 14, 0.7, 3), g('l4', 30, 0.25, 6)] },
  /* 25 */ { groups: [g('golem', 3, 5), g('healer', 6, 1.8, 2), g('boar', 14, 0.7, 4, ['armored'])], mods: ['armored'] },
  /* 26 */ { groups: [g('wolf', 50, 0.2, 0, ['fast', 'camo'])], mods: ['fast', 'camo'], tip: 'Ein getarntes Rudel! Ohne Erkennung läuft es durch.' },
  /* 27 */ { groups: [g('whale', 1, 1), g('kokon', 8, 1.1, 4), g('l5', 24, 0.3, 7)] },
  /* 28 */ { groups: [g('demon', 18, 0.55), g('bearer', 6, 1.4, 3), g('mage', 4, 2, 6)], tip: 'Feuerdämonen sind fast feuerfest – Eis wirkt doppelt.' },
  /* 29 */ { groups: [g('beetle', 20, 0.6), g('shade', 14, 0.7, 3, ['elite'])], mods: ['elite'] },
  /* 30 */ { groups: [g('oni', 2, 6, 6), g('boar', 10, 0.8, 0, ['elite']), g('wolf', 30, 0.3, 3)], miniboss: true, tip: 'Zwei Oni-Hauptmänner!' },
  /* 31 */ { groups: [g('whale', 2, 7), g('wisp', 24, 0.45, 2)] },
  /* 32 */ { groups: [g('l5', 70, 0.16)], tip: 'Eine Flut aus Sonnenschleimen – Flächenschaden hilft.' },
  /* 33 */ { groups: [g('golem', 4, 4, 0, ['regen']), g('healer', 8, 1.5, 2)], mods: ['regen'] },
  /* 34 */ { groups: [g('shade', 26, 0.4), g('wisp', 20, 0.5, 3, ['camo'])], mods: ['camo'] },
  /* 35 */ { groups: [g('whale2', 1, 1), g('kokon', 10, 1.0, 5)], tip: 'Ein Sturmwal: zerbricht in zwei Seelenwale!' },
  /* 36 */ { groups: [g('bearer', 12, 0.9), g('mage', 8, 1.4, 2), g('boar', 14, 0.6, 4, ['armored'])], mods: ['armored'] },
  /* 37 */ { groups: [g('wolf', 90, 0.12, 0, ['fast'])], mods: ['fast'] },
  /* 38 */ { groups: [g('golem', 6, 3), g('beetle', 24, 0.5, 2, ['elite'])], mods: ['elite'] },
  /* 39 */ { groups: [g('whale', 3, 5), g('whale2', 1, 1, 8), g('healer', 8, 1.4, 3, ['regen'])], mods: ['regen'] },
  /* 40 */ { groups: [g('golem', 4, 4), g('wolf', 30, 0.3, 3, ['elite']), g('vharox2', 1, 1, 9)], boss: 'vharox2', tip: 'BOSS: Vharox ist erwacht – stärker als je zuvor!' },
  // ───── Welle 41–60: Meister (Ende 60 mit Urfeuer-Vharox) ─────
  /* 41 */ { groups: [g('kokon', 20, 0.6), g('l5', 40, 0.2, 4)] },
  /* 42 */ { groups: [g('demon', 30, 0.35), g('wisp', 30, 0.35, 3)] },
  /* 43 */ { groups: [g('whale2', 2, 8), g('mage', 8, 1.2, 3)] },
  /* 44 */ { groups: [g('shade', 40, 0.3), g('bearer', 10, 1.0, 4, ['camo'])], mods: ['camo'] },
  /* 45 */ { groups: [g('golem', 8, 2.4, 0, ['armored']), g('healer', 10, 1.2, 3)], mods: ['armored'] },
  /* 46 */ { groups: [g('wolf', 70, 0.15, 0, ['elite'])], mods: ['elite'] },
  /* 47 */ { groups: [g('whale', 6, 3), g('kokon', 16, 0.7, 4)] },
  /* 48 */ { groups: [g('beetle', 40, 0.3), g('boar', 20, 0.5, 4, ['elite'])], mods: ['elite'] },
  /* 49 */ { groups: [g('whale2', 3, 6, 0, ['regen']), g('golem', 6, 3, 4)], mods: ['regen'] },
  /* 50 */ { groups: [g('oni', 4, 4, 4), g('whale2', 2, 8, 8), g('l5', 60, 0.18)], miniboss: true, tip: 'Vier Oni-Hauptmänner und Sturmwale!' },
  /* 51 */ { groups: [g('wolf', 40, 0.2), g('shade', 20, 0.4, 2), g('wisp', 20, 0.4, 4), g('beetle', 20, 0.4, 6), g('golem', 4, 3, 8)] },
  /* 52 */ { groups: [g('kokon', 40, 0.35)] },
  /* 53 */ { groups: [g('whale2', 4, 5), g('demon', 30, 0.3, 4)] },
  /* 54 */ { groups: [g('shade', 50, 0.25, 0, ['elite']), g('wisp', 40, 0.3, 4, ['camo'])], mods: ['elite', 'camo'] },
  /* 55 */ { groups: [g('golem', 12, 1.8), g('bearer', 16, 0.8, 3), g('mage', 10, 1.2, 5)] },
  /* 56 */ { groups: [g('wolf', 150, 0.08, 0, ['fast'])], mods: ['fast'], tip: 'Die große Hatz: 150 Dornwölfe!' },
  /* 57 */ { groups: [g('whale2', 6, 4), g('healer', 12, 1.0, 3, ['regen'])], mods: ['regen'] },
  /* 58 */ { groups: [g('whale', 10, 2.2, 0, ['elite']), g('kokon', 20, 0.6, 4)], mods: ['elite'] },
  /* 59 */ { groups: [g('whale2', 6, 3), g('golem', 10, 2), g('oni', 2, 8, 6), g('l5', 80, 0.12, 3)] },
  /* 60 */ { groups: [g('whale2', 3, 6), g('golem', 6, 3, 3), g('vharox3', 1, 1, 10)], boss: 'vharox3', tip: 'ENDBOSS: Vharox, das Urfeuer!' },
];

// Endlos ab Welle 61: Budget-Generator mit festem Seed pro Welle
const POOL = [['slime', 1], ['wolf', 1], ['boar', 3], ['wisp', 2], ['shade', 3], ['mage', 4], ['healer', 4], ['beetle', 3], ['golem', 22], ['l5', 2], ['kokon', 6], ['whale', 40]];
export function waveDef(w) {
  if (w <= WAVES.length) return WAVES[w - 1];
  let s = w * 9301 + 49297;
  const rnd = () => (s = (s * 233280 + 49297) % 2147483647) / 2147483647;
  if (w % 10 === 0) return { groups: [g('wolf', 20 + w / 2, 0.3, 0, ['elite']), g('golem', Math.floor(w / 15), 4, 3), ...(w >= 30 ? [g(w >= 40 ? 'whale2' : 'whale', Math.floor(w / 30), 6, 5)] : []), g('vharox3', 1, 1, 8)], boss: 'vharox3', mods: ['elite'] };
  let budget = 60 + w * 9, groups = [], delay = 0;
  const mods = [];
  if (w % 4 === 1) mods.push('fast'); if (w % 5 === 2) mods.push('armored'); if (w % 6 === 3) mods.push('regen'); if (w % 7 === 4) mods.push('elite');
  while (budget > 0 && groups.length < 6) {
    const [e, c] = POOL[Math.floor(rnd() * POOL.length)];
    const n = Math.max(1, Math.min(40, Math.floor((budget * (0.3 + rnd() * 0.4)) / c)));
    budget -= n * c;
    groups.push(g(e, n, Math.max(0.2, 1.4 - n * 0.03), delay, mods.length && rnd() < 0.5 ? [mods[0]] : []));
    delay += 2 + rnd() * 3;
  }
  return { groups, mods };
}

export const MOD_NAMES = { fast: '⚡ Schnell', armored: '🛡 Gepanzert', regen: '✚ Regeneration', elite: '👑 Elite', camo: '👁 Getarnt' };
