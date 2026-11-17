// Karten als Daten. Raster: . Gras  # Pfad  ~ Wasser  ^ Anhöhe (+Reichweite)  T Baum  R Fels (räumbar)  S Schrein
// Pfad: Wegpunkte in Feld-Koordinaten (Mitte = Spalte+0,5). Zeile 0 = hinten, letzte Zeile = vorne (Schrein).
export const MAPS = {
  ahnenhain: {
    id: 'ahnenhain', name: 'Ahnenhain', sub: 'Uralter Wald der Fuchsgeister',
    desc: 'Ein verschlungener Pfad durch den heiligen Hain. In der Mitte ein Teich (nur für Wasserkreaturen), oben eine Anhöhe mit weiter Sicht.',
    grid: [
      'TT#..T..T~T',
      'T.#......~T',
      '..#######~.',
      '...^^^^.#~.',
      'T..^^^^.#~T',
      '...^^^^.#~.',
      '..#######..',
      'T.#.......T',
      '..#.~~~..R.',
      '..#.~~~....',
      '..#######.T',
      'T..RR...#..',
      '........#..',
      '~~...####.T',
      '~~...#.^^..',
      'T....#.^^.T',
      'TT..SSS..TT',
    ],
    path: [[2.5, -1.6], [2.5, 2.5], [8.5, 2.5], [8.5, 6.5], [2.5, 6.5], [2.5, 10.5], [8.5, 10.5], [8.5, 13.5], [5.5, 13.5], [5.5, 16.1]],
    theme: { grass: 0x6fbf4a, grass2: 0x88d058, dirt: 0xc9a46a, cliff: 0x8a6a48, water: 0x3fb4d8, fog: 0x9fd4c8, sky: 0xbfe6dc, blossom: 0xffa8c8 },
    music: 'forest',
  },
};
export const MAP_IDS = Object.keys(MAPS);
