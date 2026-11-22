// Gegner als Daten. res = Schadens-Multiplikator je Element (fehlt = 1). phys < 1 heißt „gepanzert“.
// hp = Basis-KP (wird mit Wellen-Skalierung multipliziert), speed in Feldern/s, coins = Belohnung, xp = Charakter-XP-Basis.
export const ENEMIES = {
  slime:  { name: 'Moorschleim',   hp: 14,  speed: 1.15, coins: 8,  xp: 2,  lives: 1, r: 0.28, h: 0.45, desc: 'Langsam und weich.' },
  wolf:   { name: 'Dornwolf',      hp: 11,  speed: 2.1,  coins: 8,  xp: 2,  lives: 1, r: 0.28, h: 0.55, desc: 'Sehr schnell.' },
  boar:   { name: 'Eisenkeiler',   hp: 48,  speed: 1.0,  coins: 20, xp: 4,  lives: 2, r: 0.34, h: 0.7, res: { phys: 0.45, earth: 0.8 }, desc: 'Gepanzert: physischer Schaden halbiert.' },
  wisp:   { name: 'Irrlicht',      hp: 20,  speed: 1.55, coins: 13,  xp: 3,  lives: 1, r: 0.26, h: 1.25, flying: true, res: { fire: 0.6, spirit: 0.5 }, desc: 'Fliegt – Bodenwellen treffen nicht.' },
  shade:  { name: 'Schattenschleicher', hp: 30, speed: 1.45, coins: 17, xp: 4, lives: 1, r: 0.28, h: 0.8, camo: true, res: { shadow: 0.5 }, desc: 'Getarnt – nur Türme mit Erkennung sehen ihn.' },
  mage:   { name: 'Nebelmagier',   hp: 60,  speed: 0.95, coins: 25, xp: 6,  lives: 2, r: 0.3,  h: 0.95, shield: { every: 5, pct: 0.25, r: 1.6 }, res: { spirit: 0.7 }, desc: 'Gibt Verbündeten Schilde.' },
  healer: { name: 'Lotusmönch',    hp: 55,  speed: 0.95, coins: 25, xp: 6,  lives: 2, r: 0.3,  h: 0.9, heal: { every: 3, pct: 0.08, r: 1.6 }, desc: 'Heilt Verbündete in der Nähe (aber keine anderen Mönche).' },
  beetle: { name: 'Spaltkäfer',    hp: 42,  speed: 1.1,  coins: 14, xp: 5,  lives: 2, r: 0.32, h: 0.55, split: { kind: 'mite', n: 3 }, res: { phys: 0.8 }, desc: 'Zerfällt in drei Käferlinge.' },
  mite:   { name: 'Käferling',     hp: 9,   speed: 1.7,  coins: 3,  xp: 1,  lives: 1, r: 0.2,  h: 0.35, desc: 'Klein und flink.' },
  demon:  { name: 'Feuerdämon',    hp: 26,  speed: 1.4,  coins: 12, xp: 3,  lives: 1, r: 0.28, h: 0.8, res: { fire: 0.15, ice: 1.5 }, blast: { r: 1.6, dur: 1.6 }, desc: 'Fast feuerimmun, Eis wirkt stark. Explodiert im Tod und legt eine nahe Kreatur kurz lahm.' },
  bearer: { name: 'Schildträger',  hp: 64,  speed: 0.9,  coins: 22, xp: 6,  lives: 2, r: 0.32, h: 0.85, guard: { pct: 0.6, r: 1.4, red: 0.35 }, res: { phys: 0.8 }, desc: 'Großer Schild: schluckt zuerst Schaden und schützt Gegner in der Nähe (−35 %). Blitz und Erde brechen ihn doppelt.' },
  // Schichten-Gegner: jeder Tod setzt die nächstkleinere Schicht frei (split), Überschussschaden geht weiter
  l1:     { name: 'Tauschleim',    hp: 6,   speed: 1.0,  coins: 2,  xp: 1,  lives: 1, r: 0.22, h: 0.36, layer: 1, desc: 'Kleinste Schicht.' },
  l2:     { name: 'Moosschleim',   hp: 6,   speed: 1.18, coins: 2,  xp: 1,  lives: 1, r: 0.24, h: 0.4,  layer: 2, split: { kind: 'l1', n: 1 }, desc: 'Platzt zu einem Tauschleim.' },
  l3:     { name: 'Glutschleim',   hp: 6,   speed: 1.38, coins: 2,  xp: 1,  lives: 2, r: 0.25, h: 0.43, layer: 3, split: { kind: 'l2', n: 1 }, desc: 'Platzt zu einem Moosschleim.' },
  l4:     { name: 'Sturmschleim',  hp: 7,   speed: 1.62, coins: 2,  xp: 1,  lives: 2, r: 0.26, h: 0.46, layer: 4, split: { kind: 'l3', n: 1 }, desc: 'Schnell – platzt zu einem Glutschleim.' },
  l5:     { name: 'Sonnenschleim', hp: 7,   speed: 1.9,  coins: 3,  xp: 1,  lives: 3, r: 0.27, h: 0.5,  layer: 5, split: { kind: 'l4', n: 1 }, desc: 'Sehr schnell – fünf Schichten tief.' },
  kokon:  { name: 'Seelenkokon',   hp: 70,  speed: 0.8,  coins: 10, xp: 4,  lives: 6, r: 0.34, h: 0.7,  layer: 6, split: { kind: 'l5', n: 2 }, res: { phys: 0.6 }, desc: 'Gepanzerte Hülle – zerbricht in zwei Sonnenschleime.' },
  // Großgegner-Klasse: schwebende Seelenwale – zerbrechen in Kokons
  whale:  { name: 'Seelenwal',     hp: 520, speed: 0.42, coins: 45, xp: 14, lives: 20, r: 0.55, h: 1.0, layer: 7, hover: 0.55, heavy: true, big: true, split: { kind: 'kokon', n: 4 }, desc: 'Riesig und zäh – zerbricht in vier Seelenkokons.' },
  whale2: { name: 'Sturmwal',      hp: 1500, speed: 0.34, coins: 90, xp: 30, lives: 50, r: 0.7, h: 1.3, layer: 8, hover: 0.7, heavy: true, big: true, split: { kind: 'whale', n: 2 }, res: { phys: 0.8 }, desc: 'Ein Sturm in Walgestalt – zerbricht in zwei Seelenwale.' },
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
// Stärkere Varianten für Schwer (Welle 40) und Meister (Welle 60): gleicher Drache, größer, mehr KP, stärkere Phasen
BOSSES.vharox2 = { ...BOSSES.vharox, name: 'Vharox, Erwacht', title: 'Zorn der Aschetiefe', hp: 26000, speed: 0.38, xp: 1400, scale: 1.2, warn: 'Vharox ist erwacht – sein Zorn brennt heißer!',
  phases: BOSSES.vharox.phases.map(p => p.adds ? { ...p, adds: { every: 8, kind: 'boar', n: 4 } } : p.breath ? { ...p, breath: { every: 7, n: 4, dur: 4 } } : p) };
BOSSES.vharox3 = { ...BOSSES.vharox, name: 'Vharox, Urfeuer', title: 'Das erste Feuer der Welt', hp: 120000, speed: 0.4, xp: 3000, scale: 1.45, res: { fire: 0.3, phys: 0.8, ice: 1.2 }, warn: 'Das Urfeuer steigt auf – der letzte Kampf!',
  phases: [...BOSSES.vharox.phases.slice(0, 3).map(p => p.breath ? { ...p, breath: { every: 6, n: 5, dur: 4 } } : p),
    { at: 0.25, name: 'Weltenbrand', desc: 'Raserei: ruft Seelenwale!', enrage: 1.7, adds: { every: 10, kind: 'whale', n: 1 } }] };
BOSSES.vharox.warn = 'Vharox, der Abgrunddrache erwacht';
// Boss des Frosttempels: Hyōga, ein riesiger Wolf aus Eis (gleiches Phasen-Schema: 1 Sprung, 2 Atem, 3 Raserei)
BOSSES.hyoga = {
  name: 'Hyōga, Frostwolf', title: 'Herr des ewigen Winters', hp: 3200, speed: 0.42, coins: 0, xp: 700, lives: 100, r: 0.75, h: 2.0,
  heavy: true, boss: true, res: { ice: 0.3, fire: 1.4, phys: 0.85 }, model: 'wolf', breathColor: 0x9fe8ff, warn: 'Ein Heulen aus dem Eis – Hyōga erwacht!',
  phases: [
    { at: 1.00, name: 'Heulen',       desc: 'Der Frostwolf tritt aus dem Schneesturm.' },
    { at: 0.75, name: 'Frostsprünge', desc: 'Er springt über die Verwehungen – Bodenwellen verfehlen ihn.', fly: { every: 10, dur: 2.2, speed: 2.4 } },
    { at: 0.50, name: 'Eisatem',      desc: 'Eisatem friert Kreaturen ein!', breath: { every: 7, n: 3, dur: 3.5 } },
    { at: 0.25, name: 'Rudelruf',     desc: 'Raserei: ruft ein Rudel Dornwölfe.', enrage: 1.6, adds: { every: 8, kind: 'wolf', n: 6 } },
  ],
};
// Boss der Himmelsinseln: Fūjin, eine riesige Sturmeule (schwebt immer; Phasen 1 Sturmflug, 2 Donnerschrei, 3 Federsturm)
BOSSES.fujin = {
  name: 'Fūjin, Sturmeule', title: 'Herrin der Winde', hp: 3000, speed: 0.44, coins: 0, xp: 700, lives: 100, r: 0.75, h: 2.2,
  heavy: true, boss: true, res: { lightning: 0.3, earth: 0.6, ice: 1.3 }, model: 'owl', hover: 0.7, breathColor: 0xffe14d, warn: 'Der Himmel verdunkelt sich – Fūjin breitet die Schwingen aus!',
  phases: [
    { at: 1.00, name: 'Sturmwind',    desc: 'Die Sturmeule gleitet über die Inseln.' },
    { at: 0.75, name: 'Sturmflug',    desc: 'Sie steigt hoch auf – Bodenwellen verfehlen sie.', fly: { every: 9, dur: 3.5, speed: 2.0 } },
    { at: 0.50, name: 'Donnerschrei', desc: 'Ihr Schrei lähmt Kreaturen mit Blitzen!', breath: { every: 7, n: 3, dur: 3 } },
    { at: 0.25, name: 'Federsturm',   desc: 'Raserei: ruft Irrlichter aus den Wolken.', enrage: 1.55, adds: { every: 8, kind: 'wisp', n: 6 } },
  ],
};
BOSSES.fujin2 = { ...BOSSES.fujin, name: 'Fūjin, Gewitterherz', hp: 27000, speed: 0.46, xp: 1400, scale: 1.2, warn: 'Fūjin kehrt zurück – ein Gewitter folgt ihr!',
  phases: BOSSES.fujin.phases.map(p => p.adds ? { ...p, adds: { every: 7, kind: 'wisp', n: 10 } } : p.breath ? { ...p, breath: { every: 6, n: 4, dur: 3 } } : p) };
BOSSES.fujin3 = { ...BOSSES.fujin, name: 'Fūjin, Auge des Sturms', hp: 125000, speed: 0.48, xp: 3000, scale: 1.45, warn: 'Das Auge des Sturms öffnet sich – der letzte Kampf!',
  phases: BOSSES.fujin.phases.map(p => p.adds ? { ...p, adds: { every: 9, kind: 'whale', n: 1 } } : p.breath ? { ...p, breath: { every: 5, n: 5, dur: 3.5 } } : p) };
BOSSES.hyoga2 = { ...BOSSES.hyoga, name: 'Hyōga, Weißer Sturm', hp: 27000, speed: 0.44, xp: 1400, scale: 1.2, warn: 'Hyōga kehrt zurück – der Weiße Sturm tobt!',
  phases: BOSSES.hyoga.phases.map(p => p.adds ? { ...p, adds: { every: 7, kind: 'wolf', n: 10 } } : p.breath ? { ...p, breath: { every: 6, n: 4, dur: 3.5 } } : p) };
BOSSES.hyoga3 = { ...BOSSES.hyoga, name: 'Hyōga, Ewiger Winter', hp: 125000, speed: 0.46, xp: 3000, scale: 1.45, warn: 'Der ewige Winter bricht an – der letzte Kampf!',
  phases: BOSSES.hyoga.phases.map(p => p.adds ? { ...p, adds: { every: 9, kind: 'whale', n: 1 } } : p.breath ? { ...p, breath: { every: 5, n: 5, dur: 4 } } : p) };

export const ELEMENT_NAMES = {
  phys: 'Physisch', ice: 'Eis', fire: 'Feuer', lightning: 'Blitz', earth: 'Erde', spirit: 'Geist', shadow: 'Schatten', light: 'Licht', astral: 'Astral',
};
export const ELEMENT_COLORS = {
  phys: '#d8dde6', ice: '#9fe8ff', fire: '#ff7a2f', lightning: '#ffe14d', earth: '#c8a060', spirit: '#7df3ff', shadow: '#b07bff', light: '#fff2a8', astral: '#9fb4ff',
};
