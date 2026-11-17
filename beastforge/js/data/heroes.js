// Helden: ein Held pro Run. Level 1–20 IM Run (Meilensteine), dazu ein dauerhafter Rang.
export const HEROES = {
  kairo: {
    id: 'kairo', name: 'Kairo', title: 'Fuchs-Shinobi', model: 'kairo', color: '#ff9b3d',
    personality: 'Schnell, vorlaut, mit einem Grinsen hinter der Maske.',
    lore: 'Kairo wurde als Säugling im Ahnenhain gefunden – zwischen den Pfoten einer Kitsune. Er behauptet, er sei der schnellste Shinobi der Welt. Bisher hat ihm niemand das Gegenteil bewiesen.',
    place: ['ground', 'high'],
    base: { proj: 'shuriken', dmg: 6, rate: 1.5, range: 2.8, speed: 16, dmgType: 'phys', camo: false, pierce: 2 },
    milestones: [
      { lvl: 1,  name: 'Shuriken-Wurf', desc: 'Wirft Shuriken, die 2 Gegner durchbohren.' },
      { lvl: 3,  name: 'Großmaul', desc: 'Passiv: Kreaturen in der Nähe +8 % Tempo (er feuert sie an).', fx: { add: { 'support.range': 2.2, 'support.rate': 0.08 } } },
      { lvl: 5,  name: 'Schattenklone', desc: 'Fähigkeit: drei Klone werfen 6 s lang mit.', ability: 'clones' },
      { lvl: 7,  name: 'Fuchsaugen', desc: 'Erkennt Getarnte, +0,4 Reichweite.', fx: { set: { camo: true }, add: { range: 0.4 } } },
      { lvl: 10, name: 'Klingenwirbel', desc: 'Ultimate: Kairo rast den Pfad entlang und zerschneidet alles.', ultimate: 'whirl' },
      { lvl: 12, name: 'Doppelstern', desc: '+1 Shuriken pro Wurf.', fx: { add: { shots: 1 } } },
      { lvl: 15, name: 'Aufstieg', desc: 'Fuchsflammen-Aura: Schaden ×1,3, Feuer-Shuriken.', fx: { mul: { dmg: 1.3 }, set: { dmgType: 'fire', proj: 'fireshuriken' }, add: { 'burn.dps': 6, 'burn.dur': 2 } }, form: 1 },
      { lvl: 20, name: 'Meisterform', desc: 'Neun Flammenschweife: Schaden ×1,6, Abklingzeiten −30 %.', fx: { mul: { dmg: 1.6, rate: 1.2 }, add: { shots: 1 } }, form: 2, cdr: 0.3 },
    ],
    abilities: {
      clones: { name: 'Schattenklone', cd: 40, dur: 6, desc: 'Drei Klone werfen mit (×3 Angriffe).' },
      whirl:  { name: 'Klingenwirbel', cd: 75, mul: 30, desc: 'Rast den Pfad entlang – trifft jeden Gegner.' },
    },
    lines: {
      place: ['Keine Sorge, ich bin ja jetzt da.', 'Kairo ist im Einsatz!', 'Das wird ein Spaziergang.'],
      level: ['Zu leicht!', 'Ich werde immer besser – nicht dass das möglich wäre.', 'Habt ihr das gesehen?!'],
      boss:  ['Oh. Der ist… groß.', 'Okay, DAS ist ein Gegner!'],
      ability: ['Schattenklone!', 'Drei von mir – euer Albtraum!'],
      ult: ['Klingenwirbel!!', 'Versucht mitzuhalten!'],
      leak: ['Hey! Der ist durchgerutscht!', 'Das zählt nicht!'],
      win: ['Natürlich gewonnen. War doch klar.'],
      ascend: ['Spürt ihr das? Das ist das Fuchsfeuer!'],
      master: ['Neun Schweife. Jetzt wird es ernst.'],
    },
  },
};
export const HERO_IDS = Object.keys(HEROES);
