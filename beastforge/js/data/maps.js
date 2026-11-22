// Karten als Daten (Querformat). Das Raster wird aus Pfad + Merkmalen erzeugt.
// Zeichen: . Gras  # Pfad  ~ Wasser  ^ Anhöhe (+Reichweite)  T Baum  R Fels (räumbar)  S Schrein  L Lava (nur Flöße)  V offener Himmel  B Brücke (Pfad über V)
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
    for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n, cx = Math.floor(x), cy = Math.floor(y); set(cx, cy, g[cy]?.[cx] === 'V' || g[cy]?.[cx] === 'B' ? 'B' : '#'); }
  }
  return g.map(r => r.join(''));
}

// Basalt-Flöße treiben zwischen a und b hin und her (weich, Periode in s). Gleiche Formel für Simulation und Grafik.
export function raftPos(r, t, out = {}) {
  const f = 0.5 - 0.5 * Math.cos((t / r.period + (r.off || 0)) * Math.PI * 2);
  out.x = r.a[0] + (r.b[0] - r.a[0]) * f; out.y = r.a[1] + (r.b[1] - r.a[1]) * f; return out;
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
  glut: {
    id: 'glut', name: 'Glutkrater', sub: 'Lava, Asche und treibender Basalt', level: 'Schwer', hpMul: 1.4,
    desc: 'Lava-Spalten am Weg brechen regelmäßig aus und verbrennen Gegner. Auf den treibenden Basalt-Flößen stehen Kreaturen mitten im Lavasee (+15 % Schaden).',
    w: 22, h: 13,
    path: [[-1.6, 10.5], [4.5, 10.5], [4.5, 2.5], [9.5, 2.5], [9.5, 8.5], [15.5, 8.5], [15.5, 2.5], [19.5, 2.5], [19.5, 6.5], [21.2, 6.5]],
    rects: [
      [11, 1, 14, 6, 'L'],               // Lavasee in der Mittelschleife
      [7, 10, 17, 12, 'L'],              // Lavastrom unten
      [1, 4, 2, 6, '^'], [6, 4, 7, 5, '^'], [17, 4, 18, 7, '^'],   // Basalt-Anhöhen
      [21, 5, 21, 7, 'S'],
    ],
    cells: [[5, 6, 'L'], [8, 7, 'L'], [16, 5, 'L'], [20, 4, 'L'],  // Lava-Spalten (brechen aus)
      [0, 0, 'T'], [3, 0, 'T'], [0, 8, 'T'], [7, 0, 'T'], [19, 11, 'T'], [20, 12, 'T'], [21, 0, 'T'], [2, 12, 'T'],
      [3, 1, 'R'], [13, 9, 'R'], [21, 11, 'R'], [6, 8, 'R']],
    vents: [[5, 6], [8, 7], [16, 5], [20, 4]],
    lava: { every: 14, warn: 1.6, r: 1.7, dmg: 16 },
    rafts: [
      { a: [12.95, 2.3], b: [12.95, 5.7], w: 2.0, h: 1.5, period: 18 },
      { a: [8.6, 11.5], b: [16.4, 11.5], w: 2.0, h: 1.5, period: 24, off: 0.25 },
    ],
    theme: { grass: 0x5e4c48, grass2: 0x6e5650, grass3: 0x8a5a40, dirt: 0x9a7a62, cliff: 0x2e2224, high: 0x4a3c3e, water: 0x3fb4d8, fog: 0x7a4234, sky: 0x9a5a44,
      blossom: 0xff8a3a, ground: 0x3e302e, ash: true, dead: true, rock: 0x5a5058 },
    music: 'crater',
    // Glutkrater-Wellen: Eisenkeiler werden zu Schildträgern, ab Welle 3 kommen Feuerdämonen dazu
    mix(w, groups) {
      const out = groups.map(g => g.e === 'boar' ? { ...g, e: 'bearer' } : g);
      if (w >= 3 && !groups.some(g => g.e === 'vharox')) out.push({ e: 'demon', n: Math.min(24, 2 + Math.floor(w * 0.55)), gap: 0.85, delay: 2.5, mods: w > 20 ? out[0].mods : [] });
      return { groups: out, tip: w === 1 ? 'Glutkrater: Lava-Spalten brechen alle 14 s aus und verbrennen Gegner. Basalt-Flöße tragen Kreaturen über den Lavasee (+15 % Schaden).' : null };
    },
  },
  frost: {
    id: 'frost', name: 'Frosttempel', sub: 'Eisbahnen, Schneestürme und ein Wolf aus Eis', level: 'Schwer', hpMul: 1.35,
    desc: 'Auf den spiegelglatten Eisbahnen rutschen Gegner 40 % schneller. Alle 28 s zieht ein Schneesturm auf: Gegner werden langsamer, Eiskreaturen schneller – alle anderen frieren etwas.',
    w: 22, h: 13,
    path: [[-1.6, 6.5], [3.5, 6.5], [3.5, 1.5], [8.5, 1.5], [8.5, 11.5], [13.5, 11.5], [13.5, 4.5], [17.5, 4.5], [17.5, 8.5], [21.2, 8.5]],
    ice: [[4, 1, 8, 1], [9, 11, 13, 11], [14, 4, 17, 4]],   // Eisbahnen (Pfadfelder): Gegner rutschen schneller
    storm: { every: 28, dur: 7, slow: 0.25, ice: 1.25, cold: 0.85 },
    rects: [
      [10, 5, 12, 9, '~'],               // gefrorener Tempelsee
      [5, 8, 6, 10, '^'], [15, 0, 17, 2, '^'], [19, 10, 20, 11, '^'],   // Eisfelsen
      [21, 7, 21, 9, 'S'],
    ],
    cells: [[0, 0, 'T'], [1, 0, 'T'], [0, 10, 'T'], [1, 12, 'T'], [6, 4, 'T'], [11, 0, 'T'], [12, 0, 'T'], [20, 0, 'T'], [21, 1, 'T'], [15, 12, 'T'], [21, 12, 'T'],
      [2, 3, 'R'], [10, 3, 'R'], [19, 6, 'R'], [6, 12, 'R']],
    theme: { grass: 0xe6eef8, grass2: 0xd2e2f2, dirt: 0x9aaec4, cliff: 0x5e7088, high: 0xbcd0e6, water: 0x8ad4f0, fog: 0xc8dcf0, sky: 0xd4e6f8, blossom: 0xbfe8ff, snow: true, rock: 0x8a9ab0, ground: 0xdde6f0 },
    music: 'forest',
    // Frosttempel: der Boss ist Hyōga, der Frostwolf (statt Vharox); Irrlichter kommen als Eisgeister öfter
    mix(w, groups) {
      const B = { vharox: 'hyoga', vharox2: 'hyoga2', vharox3: 'hyoga3' };
      const out = groups.map(g => B[g.e] ? { ...g, e: B[g.e] } : g);
      return { groups: out, boss: out.find(g => g.e.startsWith('hyoga'))?.e, tip: w === 1 ? 'Frosttempel: Eisbahnen (helle Pfadstücke) lassen Gegner rutschen. Im Schneesturm sind Eiskreaturen im Vorteil.' : null };
    },
  },
  sky: {
    id: 'sky', name: 'Himmelsinseln', sub: 'Brücken über den Wolken, Böen und eine Sturmeule', level: 'Schwer', hpMul: 1.1,
    desc: 'Drei schwebende Inseln, verbunden durch Holzbrücken. Über offenem Himmel kann nichts stehen. Windböen drücken Bodengegner auf den Brücken zurück – Fliegende werden dabei schneller.',
    w: 22, h: 13,
    path: [[-1.6, 3.5], [4.5, 3.5], [4.5, 9.5], [10.5, 9.5], [10.5, 2.5], [17.5, 2.5], [17.5, 9.5], [21.2, 9.5]],
    rects: [
      [6, 0, 7, 12, 'V'], [14, 0, 15, 12, 'V'],                 // Himmelsschluchten zwischen den Inseln
      [0, 0, 1, 1, 'V'], [0, 11, 2, 12, 'V'], [8, 0, 9, 0, 'V'], [11, 12, 13, 12, 'V'], [19, 0, 21, 0, 'V'], [20, 12, 21, 12, 'V'],
      [1, 6, 2, 8, '^'], [12, 5, 13, 7, '^'], [19, 4, 20, 6, '^'],   // Windfelsen
      [8, 4, 9, 6, '~'],                                       // Wolkenquelle
      [21, 8, 21, 10, 'S'],
    ],
    cells: [[3, 0, 'T'], [5, 12, 'T'], [2, 4, 'T'], [13, 0, 'T'], [8, 11, 'T'], [16, 11, 'T'], [21, 2, 'T'], [3, 7, 'R'], [12, 10, 'R'], [19, 7, 'R']],
    gust: { every: 20, dur: 4, back: 0.4, fly: 1.15 },
    theme: { grass: 0x8fd86a, grass2: 0xa8e47a, dirt: 0xd8c49a, cliff: 0x9a8a7a, high: 0xc8d8a0, water: 0x9ae0ff, fog: 0x9cc8ec, sky: 0x8cc0ec, blossom: 0xffd8ec, isles: true, bridge: 0xb08850 },
    music: 'forest',
    // Himmelsinseln: Boss ist Fūjin, die Sturmeule; ab Welle 4 kommen zusätzlich Irrlichter (Fliegende)
    mix(w, groups) {
      const B = { vharox: 'fujin', vharox2: 'fujin2', vharox3: 'fujin3' };
      const out = groups.map(g => B[g.e] ? { ...g, e: B[g.e] } : g), boss = out.find(g => g.e.startsWith('fujin'))?.e;
      if (w >= 4 && !boss) out.push({ e: 'wisp', n: Math.min(24, 1 + Math.floor(w * 0.3)), gap: 0.9, delay: 3, mods: w > 20 ? (out[0].mods || []) : [] });
      return { groups: out, boss, tip: w === 1 ? 'Himmelsinseln: Über offenem Himmel kann nichts stehen. Windböen drücken Gegner auf den Brücken zurück – Fliegende werden schneller.' : null };
    },
  },
};
for (const m of Object.values(MAPS)) { m.grid = build(m); m.path = (m.paths || [m.path])[0]; }
export const MAP_IDS = Object.keys(MAPS);
