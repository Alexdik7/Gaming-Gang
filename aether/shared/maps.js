// Karten als Zeichenraster – gemeinsam für Server (Kollision, Übergänge, Spawns) und Client (Darstellung).
// Zeichen: # Baum · . Wiese · : Weg · , hohes Gras · ~ Wasser · R Dach · H Wand · D Tür · F Zaun · f Blume · S Schild
export const SOLID = new Set(['#', '~', 'R', 'H', 'F', 'S']);
export const TILE = 16;

export const MAPS = {
  funkenrast: {
    name: 'Funkenrast', region: 'Velmar', music: 'stadt', safe: true,
    rows: [
      "########################",
      "#....,,,,...::...,,,,..#",
      "#.RRRR......::......ff.#",
      "#.HHHH......::..RRRRR..#",
      "#.HDHH..f...::..HHHHH..#",
      "#...:.......::..HHDHH..#",
      "#...::::::::::::::::...#",
      "#.f.........::.....:...#",
      "#...~~~~....::..f..:...#",
      "#...~~~~....::.....:...#",
      "#...........::...RRRR..#",
      "#..S........::...HHHH..#",
      "#....FFFF...::...HDHH..#",
      "#....f..f...::.....:...#",
      "#.......::::::::::::...#",
      "#..,,,,.....::.........#",
      "#..,,,,.....::......f..#",
      "############::##########"
    ],
    spawn: { x: 12, y: 7 },
    warps: [{ x: 12, y: 17, to: 'route-1', tx: 7, ty: 14 }, { x: 13, y: 17, to: 'route-1', tx: 8, ty: 14 }],
    signs: [{ x: 3, y: 11, text: 'Funkenrast – Wo jede Reise mit einem Funken beginnt.' }],
    encounters: [],
  },
  'route-1': {
    name: 'Route 1 · Kieselpfad', region: 'Velmar', music: 'route', safe: false,
    rows: [
      "#######::#######",
      "#,,,...::....,,#",
      "#,,,...::....,,#",
      "#......::......#",
      "#..##..::..~~..#",
      "#..##..::..~~..#",
      "#......::......#",
      "#,,,,,,::,,,,..#",
      "#,,,,,,::,,,,..#",
      "#......::......#",
      "#.S....::......#",
      "#......::..##..#",
      "#..,,,,::,,##..#",
      "#..,,,,::,,....#",
      "#......::......#",
      "#######::#######"
    ],
    spawn: { x: 7, y: 14 },
    warps: [{ x: 7, y: 15, to: 'funkenrast', tx: 12, ty: 16 }, { x: 8, y: 15, to: 'funkenrast', tx: 13, ty: 16 }],
    signs: [{ x: 2, y: 10, text: 'Route 1 – Achtung, wilde Kreaturen im hohen Gras!' }],
    // Begegnungstabelle (Meilenstein 3): Gewicht, Level, Tageszeit
    encounters: [
      { species: 9, w: 40, min: 2, max: 4 },
      { species: 10, w: 25, min: 2, max: 4, weather: ['regen', 'nebel'] },
      { species: 7, w: 35, min: 2, max: 3, time: ['abend', 'nacht'] },
    ],
  },
};

export function tileAt(map, x, y) {
  const r = map.rows[y];
  return r === undefined || x < 0 || x >= r.length ? '#' : r[x];
}
export const walkable = (map, x, y) => !SOLID.has(tileAt(map, x, y));
export const warpAt = (map, x, y) => map.warps.find((w) => w.x === x && w.y === y) || null;
