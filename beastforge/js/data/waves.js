// Wellen als Daten: [art, anzahl, abstand(s), verzögerung(s), modifikatoren]
// Modifikatoren: fast (+30 % Tempo), armored (Panzer), regen (2 %/s), elite (×2,2 KP, Krone)
const g = (e, n, gap, delay = 0, mods = []) => ({ e, n, gap, delay, mods });

export const WAVES = [
  /* 1 */ { groups: [g('slime', 12, 0.95)] },
  /* 2 */ { groups: [g('slime', 18, 0.7)] },
  /* 3 */ { groups: [g('slime', 10, 0.8), g('wolf', 6, 0.9, 4)] },
  /* 4 */ { groups: [g('wolf', 14, 0.55), g('slime', 12, 0.55, 3)] },
  /* 5 */ { groups: [g('boar', 5, 1.6), g('slime', 16, 0.5, 2)], tip: 'Eisenkeiler sind gepanzert – Feuer, Geist oder Blitz wirken besser.' },
  /* 6 */ { groups: [g('wisp', 10, 1.0), g('wolf', 12, 0.5, 5)], tip: 'Irrlichter fliegen: Schockwellen der Schildkröte treffen sie nicht.' },
  /* 7 */ { groups: [g('boar', 6, 1.4), g('wisp', 8, 1.0, 4), g('slime', 14, 0.45, 8)] },
  /* 8 */ { groups: [g('shade', 7, 1.3), g('wolf', 14, 0.45, 2)], tip: 'Getarnte Gegner! Du brauchst Erkennung: Schattenrabe, Geistsicht oder Sternenblick.' },
  /* 9 */ { groups: [g('beetle', 8, 1.4), g('mage', 3, 3, 4), g('slime', 16, 0.4, 2)] },
  /* 10 */ { groups: [g('slime', 22, 0.35), g('boar', 6, 1.2, 3), g('oni', 1, 1, 9)], miniboss: true, tip: 'Mini-Boss: Der Oni-Hauptmann treibt seine Truppen an.' },
  /* 11 */ { groups: [g('healer', 4, 2.5), g('boar', 10, 0.9, 1), g('wolf', 18, 0.35, 6)] },
  /* 12 */ { groups: [g('wolf', 44, 0.24, 0, ['fast'])], mods: ['fast'], tip: 'Ein Rudel – sehr schnell!' },
  /* 13 */ { groups: [g('golem', 1, 1), g('beetle', 8, 1.1, 2), g('mage', 2, 2.5, 5)] },
  /* 14 */ { groups: [g('boar', 6, 1.6, 0, ['elite']), g('shade', 10, 0.8, 2), g('wisp', 14, 0.6, 5)], mods: ['elite'] },
  /* 15 */ { groups: [g('shade', 16, 0.6), g('wisp', 20, 0.45, 3), g('healer', 4, 2, 6)] },
  /* 16 */ { groups: [g('boar', 10, 0.9, 0, ['armored']), g('mage', 6, 2, 3), g('slime', 30, 0.25, 4)], mods: ['armored'] },
  /* 17 */ { groups: [g('golem', 2, 8), g('healer', 4, 2.4, 2), g('beetle', 10, 0.9, 4)] },
  /* 18 */ { groups: [g('wolf', 14, 0.5, 0, ['elite']), g('wisp', 8, 0.9, 2, ['elite']), g('mage', 6, 1.6, 4), g('shade', 14, 0.6, 6)], mods: ['elite'] },
  /* 19 */ { groups: [g('golem', 2, 6), g('boar', 8, 0.9, 2, ['regen']), g('beetle', 8, 0.8, 5), g('healer', 4, 2, 6), g('shade', 10, 0.7, 8)], mods: ['regen'] },
  /* 20 */ { groups: [g('slime', 20, 0.4), g('wolf', 12, 0.45, 4), g('vharox', 1, 1, 9)], boss: 'vharox', tip: 'BOSS: Vharox, der Abgrunddrache!' },
];

// Endlos ab Welle 21: Budget-Generator mit festem Seed pro Welle
const POOL = [['slime', 1], ['wolf', 1], ['boar', 3], ['wisp', 2], ['shade', 3], ['mage', 4], ['healer', 4], ['beetle', 3], ['golem', 22]];
export function waveDef(w) {
  if (w <= WAVES.length) return WAVES[w - 1];
  let s = w * 9301 + 49297;
  const rnd = () => (s = (s * 233280 + 49297) % 2147483647) / 2147483647;
  if (w % 10 === 0) return { groups: [g('wolf', 20 + w / 2, 0.3, 0, ['elite']), g('golem', Math.floor(w / 15), 4, 3), g('vharox', 1, 1, 8)], boss: 'vharox', mods: ['elite'] };
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
