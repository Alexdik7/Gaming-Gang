// Karten als Daten (Querformat). Das Raster wird aus Pfad + Merkmalen erzeugt.
// Zeichen: . Gras  # Pfad  ~ Wasser  ^ Anhöhe (+Reichweite)  T Baum  R Fels (räumbar)  S Schrein
// Kreaturen werden FREI platziert (Kreis-Fußabdruck); das Raster liefert nur Gelände und Höhe.
export const PATH_HALF = 0.5;   // halbe Pfadbreite in Feldern

function build(m) {
  const g = Array.from({ length: m.h }, () => Array(m.w).fill('.'));
  const set = (x, y, c) => { if (y >= 0 && y < m.h && x >= 0 && x < m.w) g[y][x] = c; };
  for (const [x0, y0, x1, y1, c] of m.rects || []) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c);
  for (const [x, y, c] of m.cells || []) set(x, y, c);
  // Pfad rastern (über die Rechtecke schreiben)
  for (const path of m.paths || [m.path]) for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1], [bx, by] = path[i], n = Math.ceil(Math.hypot(bx - ax, by - ay) * 4);
    for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n; set(Math.floor(x), Math.floor(y), '#'); }
  }
  return g.map(r => r.join(''));
}

export const MAPS = {
  ahnenhain: {
    id: 'ahnenhain', name: 'Ahnenhain', sub: 'Uralter Wald der Fuchsgeister', level: 'Anfänger',
    desc: 'Ein verschlungener Pfad durch den heiligen Hain. Ein Teich für Wasserkreaturen, eine Anhöhe mit weiter Sicht und ein Bach am Waldrand.',
    w: 22, h: 13,
    path: [[-1.6, 2.5], [5.5, 2.5], [5.5, 9.5], [10.5, 9.5], [10.5, 3.5], [16.5, 3.5], [16.5, 10.5], [21.2, 10.5]],
    rects: [
      [7, 5, 8, 7, '~'],                 // Teich in der ersten Schleife
      [12, 5, 14, 8, '^'],               // Anhöhe in der zweiten Schleife
      [13, 0, 21, 0, '~'], [19, 1, 21, 1, '~'],   // Bach oben rechts
      [21, 9, 21, 11, 'S'],              // Schrein
      [0, 11, 1, 12, '~'],               // Tümpel unten links
    ],
    cells: [[0, 0, 'T'], [1, 0, 'T'], [0, 5, 'T'], [0, 7, 'T'], [3, 12, 'T'], [8, 12, 'T'], [12, 12, 'T'], [19, 12, 'T'], [20, 12, 'T'], [21, 6, 'T'], [11, 0, 'T'], [8, 0, 'T'],
      [2, 6, 'R'], [19, 6, 'R'], [13, 11, 'R']],
    theme: { grass: 0x6fbf4a, grass2: 0x88d058, dirt: 0xd8b47a, cliff: 0x8a6a48, water: 0x3fb4d8, fog: 0x9fd4c8, sky: 0xbfe6dc, blossom: 0xffa8c8 },
    music: 'forest',
  },
  dorf: {
    id: 'dorf', name: 'Shinobi-Dorf', sub: 'Zwei Tore, ein Weg zum Schrein', level: 'Mittel', hpMul: 1.25,
    desc: 'Gegner kommen abwechselnd durch zwei Tore und treffen sich auf dem Dorfplatz. Auf den Dächern (Anhöhe) stehen deine Kreaturen sicher und sehen weiter.',
    w: 22, h: 13,
    paths: [
      [[-1.6, 1.5], [7.5, 1.5], [7.5, 6.5], [12.5, 6.5], [12.5, 2.5], [18.5, 2.5], [18.5, 9.5], [21.2, 9.5]],
      [[-1.6, 11.5], [7.5, 11.5], [7.5, 6.5], [12.5, 6.5], [12.5, 2.5], [18.5, 2.5], [18.5, 9.5], [21.2, 9.5]],
    ],
    rects: [
      [1, 4, 3, 5, '^'], [1, 7, 3, 8, '^'],      // Dächer links
      [9, 8, 11, 10, '^'], [14, 4, 16, 6, '^'],  // Dächer Mitte
      [14, 9, 16, 11, '^'], [20, 4, 21, 6, '^'],
      [9, 2, 10, 4, '~'],                        // Brunnenteich
      [21, 8, 21, 10, 'S'],
    ],
    cells: [[0, 6, 'T'], [5, 6, 'T'], [5, 0, 'T'], [13, 12, 'T'], [20, 12, 'T'], [21, 12, 'T'], [21, 0, 'T'], [11, 0, 'T'], [4, 9, 'R'], [19, 6, 'R']],
    theme: { grass: 0x8fbf5a, grass2: 0xa0d06a, dirt: 0xc8a47a, cliff: 0x6a4a3a, high: 0x8a5a4a, water: 0x3fb4d8, fog: 0xd8c8b8, sky: 0xf0dcc8, blossom: 0xffb8d0, roof: true },
    music: 'forest',
  },
};
for (const m of Object.values(MAPS)) { m.grid = build(m); m.path = (m.paths || [m.path])[0]; }
export const MAP_IDS = Object.keys(MAPS);
