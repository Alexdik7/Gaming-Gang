// Maps – reine Daten. Koordinaten sind Feld-Indizes im 12×16-Raster (−1 / 12 / 16 = außerhalb).
// paths: Wegpunkte je Weg. Ein Punkt [x, y, 'tp'] ist ein Teleporter-Ziel (Sprung ohne Laufweg).
// Der letzte Punkt ist die Katzen-Basis. water: Rechtecke [x,y,b,h] (nicht bebaubar).
// high: Hochsitze (+25 % Reichweite), power: Energiefelder (+20 % Angriffstempo).
// fast: [Weg, Abschnitt, Faktor] – Abschnitt, auf dem Hunde schneller laufen (Förderband, Glatteis).
// mods: Schadens-Faktoren je Schadensart auf dieser Map. deco: Anzahl zufälliger Hindernisse.

export const MAPS = [
  { id: 'city', n: ['Katzenstadt', 'Cat City'], lvl: 1, theme: 'city', boss: 'bulldozer', deco: 9,
    d: ['Ein langer, gewundener Weg durch die Gassen. Ideal zum Lernen.', 'A long winding road through the alleys. Ideal for learning.'],
    paths: [[[-1, 2], [9, 2], [9, 6], [2, 6], [2, 10], [9, 10], [9, 13], [12, 13]]] },
  { id: 'park', n: ['Hundepark', 'Dog Park'], lvl: 2, theme: 'park', boss: 'alpha', deco: 8,
    d: ['Eine Spirale um den Teich. Lange Geraden – ein Traum für Scharfschützen.', 'A spiral around the pond. Long straights – a sniper\'s dream.'],
    paths: [[[1, -1], [1, 13], [10, 13], [10, 2], [4, 2], [4, 10], [7, 10], [7, 5]]],
    water: [[5, 4, 2, 5]], high: [[8, 7]] },
  { id: 'harbor', n: ['Hafen', 'Harbor'], lvl: 4, theme: 'harbor', boss: 'bulldozer', deco: 5,
    d: ['Zwei Eingänge, ein Engpass am Pier. Viel Wasser, wenig Platz.', 'Two entrances, one choke point at the pier. Lots of water, little room.'],
    paths: [[[-1, 2], [3, 2], [3, 7], [6, 7], [6, 16]], [[12, 2], [8, 2], [8, 7], [6, 7], [6, 16]]],
    water: [[0, 10, 4, 6], [9, 10, 3, 6], [5, 0, 2, 1]] },
  { id: 'forest', n: ['Flüsterwald', 'Whisper Woods'], lvl: 7, theme: 'forest', boss: 'shade', deco: 16,
    d: ['Dichte Bäume, wenig Bauplatz – aber Hochsitze mit Extra-Reichweite.', 'Dense trees, little space – but high seats with extra range.'],
    paths: [[[-1, 8], [2, 8], [2, 3], [6, 3], [6, 12], [10, 12], [10, 6], [12, 6]]],
    high: [[4, 6], [8, 9], [4, 13], [8, 2]] },
  { id: 'factory', n: ['Industriegebiet', 'Industrial Zone'], lvl: 10, theme: 'factory', boss: 'mecha', deco: 10,
    d: ['Ein Förderband beschleunigt die Hunde. Bremse sie – oder sie rauschen durch.', 'A conveyor belt speeds dogs up. Slow them – or they rush through.'],
    paths: [[[3, -1], [3, 4], [9, 4], [9, 9], [2, 9], [2, 13], [12, 13]]],
    fast: [[0, 3, 1.55]], power: [[6, 6], [5, 11]] },
  { id: 'snow', n: ['Schneedorf', 'Snow Village'], lvl: 14, theme: 'snow', boss: 'alpha', deco: 11,
    d: ['Glatteis auf der Dorfstraße. Eis wirkt stärker, Feuer schwächer.', 'Black ice on the village road. Ice is stronger, fire is weaker.'],
    paths: [[[6, -1], [6, 3], [1, 3], [1, 8], [10, 8], [10, 12], [4, 12], [4, 16]]],
    fast: [[0, 3, 1.35]], mods: { ice: 1.3, fire: 0.75 }, high: [[8, 5]] },
  { id: 'desert', n: ['Wüstenruinen', 'Desert Ruins'], lvl: 18, theme: 'desert', boss: 'shade', deco: 9,
    d: ['Der Weg kreuzt sich selbst. Wer die Kreuzung hält, trifft doppelt.', 'The path crosses itself. Hold the crossing and you hit twice.'],
    paths: [[[-1, 3], [8, 3], [8, 11], [3, 11], [3, 6], [12, 6]]],
    high: [[9, 7], [2, 4]] },
  { id: 'cyber', n: ['Cyberstadt', 'Cyber City'], lvl: 23, theme: 'cyber', boss: 'mecha', deco: 8,
    d: ['Zwei getrennte Wege, zwei Ziele. Energiefelder machen Katzen schneller.', 'Two separate lanes, two goals. Power tiles make cats faster.'],
    paths: [[[2, -1], [2, 6], [5, 6], [5, 12], [2, 12], [2, 16]], [[9, -1], [9, 8], [7, 8], [7, 14], [9, 14], [9, 16]]],
    power: [[6, 10], [4, 3], [10, 11], [6, 4]], mods: { volt: 1.2 } },
  { id: 'volcano', n: ['Vulkan', 'Volcano'], lvl: 29, theme: 'volcano', boss: 'king', deco: 7,
    d: ['Ein kurzer Weg zwischen Lavaseen. Feuer brennt heißer, Eis schmilzt.', 'A short road between lava lakes. Fire burns hotter, ice melts.'],
    paths: [[[-1, 7], [4, 7], [4, 3], [8, 3], [8, 11], [12, 11]]],
    water: [[0, 0, 3, 3], [10, 0, 2, 4], [0, 12, 4, 4], [5, 5, 2, 3]], mods: { fire: 1.25, ice: 0.8 }, high: [[6, 9]] },
  { id: 'station', n: ['Forschungsstation', 'Research Station'], lvl: 35, theme: 'station', boss: 'king', deco: 8,
    d: ['Ein Teleporter und zwei Eingänge. Hier wartet der König des Rudels.', 'A teleporter and two entrances. The King of the Pack awaits.'],
    paths: [[[-1, 2], [5, 2], [5, 6], [2, 9, 'tp'], [8, 9], [8, 13], [3, 13], [3, 16]], [[12, 5], [10, 5], [10, 9], [8, 9], [8, 13], [3, 13], [3, 16]]],
    power: [[6, 11], [3, 4]], high: [[10, 11], [1, 7]] }
];

export const MAP_BY_ID = Object.fromEntries(MAPS.map((m, i) => [m.id, Object.assign(m, { idx: i })]));

// Farben und Deko je Thema (ui/render.js zeichnet daraus den Hintergrund)
export const THEMES = {
  city:    { g: '#7fbf6a', g2: '#72b35e', p: '#c9c2b4', pe: '#9a9388', w: '#4aa3df', deco: ['house', 'tree', 'lamp'], music: 0 },
  park:    { g: '#8ccf62', g2: '#7fc456', p: '#e2cfa0', pe: '#b89f6c', w: '#4fb3e8', deco: ['tree', 'bush', 'flower'], music: 0 },
  harbor:  { g: '#c2b79b', g2: '#b8ad90', p: '#8d7b68', pe: '#6a5a4a', w: '#2f8fcf', deco: ['crate', 'crate', 'lamp'], music: 1 },
  forest:  { g: '#4f9a4e', g2: '#458f45', p: '#a8875c', pe: '#7b5f3c', w: '#3f9bd0', deco: ['pine', 'pine', 'tree', 'rock'], music: 1 },
  factory: { g: '#8b8f98', g2: '#80848d', p: '#5b5f6b', pe: '#3d4049', w: '#5a7a8a', deco: ['crate', 'tank', 'pipe'], music: 2 },
  snow:    { g: '#eef4fa', g2: '#e2ebf4', p: '#b9c7d6', pe: '#93a4b6', w: '#9fd4f2', deco: ['snowpine', 'house', 'snowman'], music: 0 },
  desert:  { g: '#e8c98a', g2: '#dfbe7c', p: '#c79a5c', pe: '#9c7440', w: '#4fb3d0', deco: ['cactus', 'ruin', 'rock'], music: 1 },
  cyber:   { g: '#2a2d4a', g2: '#252843', p: '#474c7a', pe: '#22d3ee', w: '#1b6f9c', deco: ['neon', 'tank', 'neon'], music: 2 },
  volcano: { g: '#5a4a48', g2: '#51423f', p: '#8a6f5c', pe: '#3a2c2a', w: '#ff6a1a', deco: ['lavarock', 'rock', 'deadtree'], music: 2 },
  station: { g: '#b9c4d2', g2: '#aeb9c8', p: '#e6ecf3', pe: '#5c6b80', w: '#39c6c0', deco: ['tank', 'neon', 'pipe'], music: 2 }
};
