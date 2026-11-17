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
HEROES.raizen = {
  id: 'raizen', name: 'Raizen', title: 'Maskierter Blitz-Shinobi', model: 'raizen', color: '#7fe3ff',
  personality: 'Ruhig, präzise, spricht wenig – und trifft immer.',
  lore: 'Niemand hat Raizens Gesicht je gesehen. Man sagt, er habe den Blitz selbst zum Duell gefordert. Der Blitz kam nie wieder.',
  place: ['ground', 'high'],
  base: { atk: 'chain', dmg: 9, rate: 0.95, range: 3.2, dmgType: 'lightning', 'chain.n': 2, 'chain.range': 2.4 },
  milestones: [
    { lvl: 1,  name: 'Kettenblitz', desc: 'Blitze springen auf zwei weitere Gegner.' },
    { lvl: 3,  name: 'Stille Präzision', desc: 'Passiv: 15 % Krit (×2,5).', fx: { add: { 'crit.ch': 0.15 }, set: { 'crit.mult': 2.5 } } },
    { lvl: 5,  name: 'Blitzschlag', desc: 'Fähigkeit: Blitze treffen die 6 stärksten Gegner und betäuben sie.', ability: 'storm' },
    { lvl: 7,  name: 'Sturmauge', desc: 'Erkennt Getarnte, +0,4 Reichweite.', fx: { set: { camo: true }, add: { range: 0.4 } } },
    { lvl: 10, name: 'Donnerfall', desc: 'Ultimate: Ein Gewitter trifft JEDEN Gegner auf der Karte.', ultimate: 'thunderfall' },
    { lvl: 12, name: 'Weite Kette', desc: 'Kette +2.', fx: { add: { 'chain.n': 2 } } },
    { lvl: 15, name: 'Aufstieg', desc: 'Blitzaura: Schaden ×1,3, Tempo ×1,2.', fx: { mul: { dmg: 1.3, rate: 1.2 } }, form: 1 },
    { lvl: 20, name: 'Meisterform', desc: 'Donnerherr: Schaden ×1,6, Kette +3, Abklingzeiten −30 %.', fx: { mul: { dmg: 1.6 }, add: { 'chain.n': 3 } }, form: 2, cdr: 0.3 },
  ],
  abilities: {
    storm: { name: 'Blitzschlag', cd: 35, mul: 12, desc: 'Trifft die 6 stärksten Gegner (×12) und betäubt 1 s.' },
    thunderfall: { name: 'Donnerfall', cd: 80, mul: 20, desc: 'Trifft jeden Gegner (×20) und betäubt 1,5 s.' },
  },
  lines: {
    place: ['…', 'Bereit.', 'Ich sehe euch.'], level: ['Gut.', 'Schärfer.', 'Weiter.'], boss: ['Ein würdiger Gegner.'],
    ability: ['Fall.', 'Blitzschlag.'], ult: ['Donnerfall.', 'Der Himmel richtet.'], leak: ['Fehler. Kommt nicht wieder vor.'],
    win: ['Erledigt.'], ascend: ['Der Sturm erwacht.'], master: ['Ich bin der Donner.'],
  },
};
HEROES.mika = {
  id: 'mika', name: 'Mika', title: 'Geisterheilerin', model: 'mika', color: '#ff9ac8',
  personality: 'Sanft, mutig, glaubt an jede Kreatur – auch an die schlechtgelaunten.',
  lore: 'Mika hütet den Lotusteich hinter dem Schrein. Ihre Lieder heilen Wunden, die man nicht sehen kann – und manchmal auch den Herzkristall.',
  place: ['ground', 'high', 'water'],
  base: { proj: 'light', dmg: 4, rate: 1.1, range: 2.8, speed: 12, dmgType: 'spirit', 'slow.pct': 0.2, 'slow.dur': 1, 'support.range': 2.6, 'support.rate': 0.1 },
  milestones: [
    { lvl: 1,  name: 'Lichtgebet', desc: 'Lichtkugeln verlangsamen. Aura: Kreaturen in der Nähe +10 % Tempo.' },
    { lvl: 3,  name: 'Heilende Nähe', desc: 'Passiv: +1 Leben nach jeder Welle.', fx: { add: { lifeRegen: 1 } } },
    { lvl: 5,  name: 'Blütensegen', desc: 'Fähigkeit: Kreaturen in der Nähe +50 % Tempo (8 s), +5 Leben.', ability: 'bloom' },
    { lvl: 7,  name: 'Klarer Blick', desc: 'Erkennt Getarnte, Aura gibt Erkennung.', fx: { set: { camo: true, 'support.camo': true } } },
    { lvl: 10, name: 'Lotusheiligtum', desc: 'Ultimate: Alle Gegner 6 s stark verlangsamt, +15 Leben.', ultimate: 'sanctuary' },
    { lvl: 12, name: 'Schutzlied', desc: 'Aura: +10 % Schaden.', fx: { add: { 'support.dmg': 0.1 } } },
    { lvl: 15, name: 'Aufstieg', desc: 'Lotusflügel: Aura +8 % Tempo, +1 Leben je Welle.', fx: { add: { 'support.rate': 0.08, lifeRegen: 1 } }, form: 1 },
    { lvl: 20, name: 'Meisterform', desc: 'Göttin des Teichs: Aura +10 % Schaden, +2 Leben je Welle, Abklingzeiten −30 %.', fx: { add: { 'support.dmg': 0.1, lifeRegen: 2 } }, form: 2, cdr: 0.3 },
  ],
  abilities: {
    bloom: { name: 'Blütensegen', cd: 45, desc: 'Kreaturen in der Nähe +50 % Tempo (8 s), +5 Leben.' },
    sanctuary: { name: 'Lotusheiligtum', cd: 90, desc: 'Alle Gegner 6 s um 70 % verlangsamt, +15 Leben.' },
  },
  lines: {
    place: ['Ich passe auf euch auf!', 'Zusammen schaffen wir das.', 'Atmet tief durch.'], level: ['Ich werde stärker!', 'Danke, ihr Lieben.'], boss: ['Wir haben keine Angst!'],
    ability: ['Blüht auf!', 'Fühlt ihr das?'], ult: ['Lotus, schütze uns!'], leak: ['Oh nein – haltet durch!'],
    win: ['Alle in Sicherheit. Gut gemacht!'], ascend: ['Die Lotusflügel tragen mich!'], master: ['Der Teich singt mit mir.'],
  },
};
export const HERO_IDS = Object.keys(HEROES);
