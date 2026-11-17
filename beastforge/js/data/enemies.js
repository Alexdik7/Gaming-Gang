// Gegner als Daten. res = Schadens-Multiplikator je Element (fehlt = 1). phys < 1 heißt „gepanzert“.
// hp = Basis-KP (wird mit Wellen-Skalierung multipliziert), speed in Feldern/s, coins = Belohnung, xp = Charakter-XP-Basis.
export const ENEMIES = {
  slime:  { name: 'Moorschleim',   hp: 14,  speed: 1.15, coins: 8,  xp: 2,  lives: 1, r: 0.28, h: 0.45, desc: 'Langsam und weich.' },
  wolf:   { name: 'Dornwolf',      hp: 11,  speed: 2.1,  coins: 8,  xp: 2,  lives: 1, r: 0.28, h: 0.55, desc: 'Sehr schnell.' },
  boar:   { name: 'Eisenkeiler',   hp: 48,  speed: 1.0,  coins: 20, xp: 4,  lives: 2, r: 0.34, h: 0.7, res: { phys: 0.45, earth: 0.8 }, desc: 'Gepanzert: physischer Schaden halbiert.' },
  wisp:   { name: 'Irrlicht',      hp: 20,  speed: 1.55, coins: 13,  xp: 3,  lives: 1, r: 0.26, h: 1.25, flying: true, res: { fire: 0.6, spirit: 0.5 }, desc: 'Fliegt – Bodenwellen treffen nicht.' },
  shade:  { name: 'Schattenschleicher', hp: 30, speed: 1.45, coins: 17, xp: 4, lives: 1, r: 0.28, h: 0.8, camo: true, res: { shadow: 0.5 }, desc: 'Getarnt – nur Türme mit Erkennung sehen ihn.' },
  mage:   { name: 'Nebelmagier',   hp: 60,  speed: 0.95, coins: 25, xp: 6,  lives: 2, r: 0.3,  h: 0.95, shield: { every: 5, pct: 0.25, r: 1.6 }, res: { spirit: 0.7 }, desc: 'Gibt Verbündeten Schilde.' },
  healer: { name: 'Lotusmönch',    hp: 55,  speed: 0.95, coins: 25, xp: 6,  lives: 2, r: 0.3,  h: 0.9, heal: { every: 3, pct: 0.08, r: 1.6 }, desc: 'Heilt Verbündete in der Nähe.' },
  beetle: { name: 'Spaltkäfer',    hp: 42,  speed: 1.1,  coins: 14, xp: 5,  lives: 2, r: 0.32, h: 0.55, split: { kind: 'mite', n: 3 }, res: { phys: 0.8 }, desc: 'Zerfällt in drei Käferlinge.' },
  mite:   { name: 'Käferling',     hp: 9,   speed: 1.7,  coins: 3,  xp: 1,  lives: 1, r: 0.2,  h: 0.35, desc: 'Klein und flink.' },
  golem:  { name: 'Felskoloss',    hp: 620, speed: 0.5,  coins: 154, xp: 30, lives: 10, r: 0.5, h: 1.6, heavy: true, res: { phys: 0.75, earth: 0.4, lightning: 1.25 }, desc: 'Titan: riesige KP, kein Rückstoß.' },
  oni:    { name: 'Oni-Hauptmann', hp: 1600, speed: 0.62, coins: 490, xp: 120, lives: 10, r: 0.55, h: 1.8, heavy: true, miniboss: true, cry: { every: 6, r: 2.2, speed: 0.35, dur: 3 }, res: { phys: 0.8 }, desc: 'Mini-Boss: Kriegsschrei beschleunigt Verbündete.' },
};

// Bosse: hp ohne Wellen-Skalierung (nur Schwierigkeit/Endlos). Phasen nach KP-Anteil.
export const BOSSES = {
  vharox: {
    name: 'Vharox, Abgrunddrache', title: 'Herr der Aschetiefe', hp: 3000, speed: 0.36, coins: 0, xp: 700, lives: 100, r: 0.8, h: 2.4,
    heavy: true, boss: true, res: { fire: 0.4, phys: 0.85 },
    phases: [
      { at: 1.00, name: 'Erwachen',     desc: 'Der Drache kriecht aus der Tiefe.' },
      { at: 0.75, name: 'Schwingen',    desc: 'Er fliegt in Stößen – Bodenwellen verfehlen ihn.', fly: { every: 13, dur: 4, speed: 1.8 } },
      { at: 0.50, name: 'Feuersturm',   desc: 'Feueratem legt Türme lahm!', breath: { every: 8, n: 3, dur: 4 } },
      { at: 0.25, name: 'Raserei',      desc: 'Raserei: schneller, ruft Diener.', enrage: 1.55, adds: { every: 9, kind: 'wolf', n: 4 } },
    ],
  },
};

export const ELEMENT_NAMES = {
  phys: 'Physisch', ice: 'Eis', fire: 'Feuer', lightning: 'Blitz', earth: 'Erde', spirit: 'Geist', shadow: 'Schatten', light: 'Licht', astral: 'Astral',
};
export const ELEMENT_COLORS = {
  phys: '#d8dde6', ice: '#9fe8ff', fire: '#ff7a2f', lightning: '#ffe14d', earth: '#c8a060', spirit: '#7df3ff', shadow: '#b07bff', light: '#fff2a8', astral: '#9fb4ff',
};
