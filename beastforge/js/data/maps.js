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
  for (let i = 1; i < m.path.length; i++) {
    const [ax, ay] = m.path[i - 1], [bx, by] = m.path[i], n = Math.ceil(Math.hypot(bx - ax, by - ay) * 4);
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
};
for (const m of Object.values(MAPS)) m.grid = build(m);
export const MAP_IDS = Object.keys(MAPS);
