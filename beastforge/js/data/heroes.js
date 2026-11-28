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
HEROES.hana = {
  id: 'hana', name: 'Hana', title: 'Blütenklinge', model: 'hana', color: '#ff7ab0',
  personality: 'Fröhlich, schnell gelangweilt – und schneller mit dem Schwert als mit Worten.',
  lore: 'Hana trainierte unter den Kirschbäumen des Dorfes, bis die Blüten nicht mehr fielen, ohne zerschnitten zu werden. Sie kämpft am liebsten mitten im Getümmel.',
  place: ['ground', 'high'],
  base: { atk: 'slash', dmg: 7, rate: 2.2, range: 1.6, dmgType: 'phys', cleave: 1 },
  milestones: [
    { lvl: 1,  name: 'Blütenklinge', desc: 'Schnelle Schwerthiebe treffen Gegner im Bogen.' },
    { lvl: 3,  name: 'Tanz der Klingen', desc: 'Passiv: Tempo ×1,15.', fx: { mul: { rate: 1.15 } } },
    { lvl: 5,  name: 'Blütensturm', desc: 'Fähigkeit: Ein Wirbel aus Klingen trifft alles im Umkreis schwer und lässt es bluten.', ability: 'petals' },
    { lvl: 7,  name: 'Kirschblütenblick', desc: 'Erkennt Getarnte, +0,3 Reichweite.', fx: { set: { camo: true }, add: { range: 0.3 } } },
    { lvl: 10, name: 'Tausend Schnitte', desc: 'Ultimate: Hana trifft die 12 stärksten Gegner auf der ganzen Karte.', ultimate: 'thousand' },
    { lvl: 12, name: 'Meisterschnitt', desc: 'Breiterer Bogen, 20 % Krit.', fx: { add: { cleave: 1, 'crit.ch': 0.2 } } },
    { lvl: 15, name: 'Aufstieg', desc: 'Blütenaura: Schaden ×1,3, Tempo ×1,15.', fx: { mul: { dmg: 1.3, rate: 1.15 } }, form: 1 },
    { lvl: 20, name: 'Meisterform', desc: 'Sakura-Schwertheilige: Schaden ×1,6, Abklingzeiten −30 %.', fx: { mul: { dmg: 1.6 } }, form: 2, cdr: 0.3 },
  ],
  abilities: {
    petals: { name: 'Blütensturm', cd: 35, mul: 10, desc: 'Alles im Umkreis von 3 Feldern: Schaden ×10 und Blutung.' },
    thousand: { name: 'Tausend Schnitte', cd: 80, mul: 25, desc: 'Trifft die 12 stärksten Gegner (×25).' },
  },
  lines: {
    place: ['Endlich was los!', 'Ich nehme die vorne!', 'Klinge bereit!'], level: ['Schneller!', 'Noch mal!'], boss: ['Großes Ziel – großer Spaß!'],
    ability: ['Blütensturm!', 'Tanzt mit mir!'], ult: ['Tausend Schnitte!'], leak: ['Mist, zu langsam!'],
    win: ['Das war ein Tanz!'], ascend: ['Die Kirschblüten tragen mich!'], master: ['Ein Schnitt – ein Frühling.'],
  },
};
HEROES.goro = {
  id: 'goro', name: 'Gorō', title: 'Steinmönch', model: 'goro', color: '#c8a070',
  personality: 'Langsam, freundlich, unerschütterlich – wie ein Berg mit Humor.',
  lore: 'Gorō meditierte dreißig Jahre auf einem Gipfel, bis der Berg begann, ihm zuzuhören. Wo er auf den Boden stampft, steht die Welt für einen Herzschlag still.',
  place: ['ground', 'high'],
  base: { atk: 'pulse', dmg: 14, rate: 0.6, range: 1.9, dmgType: 'earth', flying: false, 'stun.ch': 0.1, 'stun.dur': 0.6 },
  milestones: [
    { lvl: 1,  name: 'Erdstampfer', desc: 'Schockwellen um ihn herum betäuben manchmal (keine Fliegenden).' },
    { lvl: 3,  name: 'Felshaut', desc: 'Passiv: Kreaturen in der Nähe können nicht gelähmt werden (Boss-Atem).', fx: { add: { 'support.range': 2.4 }, set: { 'support.protect': true } } },
    { lvl: 5,  name: 'Steinwall', desc: 'Fähigkeit: Alle Gegner in der Nähe erstarren 3 s und nehmen schweren Erdschaden.', ability: 'wall' },
    { lvl: 7,  name: 'Bergsicht', desc: 'Erkennt Getarnte, +0,3 Reichweite.', fx: { set: { camo: true }, add: { range: 0.3 } } },
    { lvl: 10, name: 'Meteor', desc: 'Ultimate: Ein Meteor schlägt in die dichteste Gegnergruppe ein.', ultimate: 'meteor' },
    { lvl: 12, name: 'Tiefes Beben', desc: '+10 % Betäubung, Schaden ×1,2.', fx: { add: { 'stun.ch': 0.1 }, mul: { dmg: 1.2 } } },
    { lvl: 15, name: 'Aufstieg', desc: 'Granitaura: Schaden ×1,3, Aura +8 % Schaden.', fx: { mul: { dmg: 1.3 }, add: { 'support.dmg': 0.08 } }, form: 1 },
    { lvl: 20, name: 'Meisterform', desc: 'Herr der Berge: Schaden ×1,6, Abklingzeiten −30 %.', fx: { mul: { dmg: 1.6 } }, form: 2, cdr: 0.3 },
  ],
  abilities: {
    wall: { name: 'Steinwall', cd: 40, mul: 6, desc: 'Gegner im Umkreis 3,2: Schaden ×6, 3 s Erstarren (Bosse verlangsamt).' },
    meteor: { name: 'Meteor', cd: 80, mul: 40, desc: 'Meteor in die dichteste Gruppe: ×40 Schaden im Umkreis 2,5 + Brand.' },
  },
  lines: {
    place: ['Hmm. Guter Boden hier.', 'Ich bleibe stehen.', 'Der Berg ist da.'], level: ['Langsam, aber stetig.', 'Hoho!'], boss: ['Auch Berge fallen nicht.'],
    ability: ['Steh still!', 'Steinwall!'], ult: ['Vom Himmel – ein Stein!'], leak: ['Hm. Das war ein Kiesel.'],
    win: ['Der Berg hat gehalten.'], ascend: ['Granit in meinen Adern.'], master: ['Ich bin der Berg.'],
  },
};
HEROES.yoru = {
  id: 'yoru', name: 'Yoru', title: 'Mondmagierin', model: 'yoru', color: '#9fb4ff',
  personality: 'Verträumt, leise, sieht Dinge, die andere übersehen.',
  lore: 'Yoru liest die Sterne wie andere Leute Bücher. Wenn sie einen Gegner ansieht, weiß sie bereits, wo er verwundbar ist.',
  place: ['ground', 'high', 'water'],
  base: { proj: 'star', dmg: 7, rate: 1.0, range: 3.3, speed: 12, dmgType: 'astral', mark: 0.1 },
  milestones: [
    { lvl: 1,  name: 'Sternenschuss', desc: 'Astralsterne (ignorieren Widerstände), Getroffene nehmen +10 % Schaden.' },
    { lvl: 3,  name: 'Mondlicht', desc: 'Passiv: Kreaturen in der Nähe +10 % Reichweite.', fx: { add: { 'support.range': 2.6, 'support.rng': 0.1 } } },
    { lvl: 5,  name: 'Mondschleier', desc: 'Fähigkeit: Gegner in der Nähe werden enttarnt und nehmen 8 s lang +50 % Schaden.', ability: 'veil' },
    { lvl: 7,  name: 'Zwillingssterne', desc: '+1 Stern pro Schuss, erkennt Getarnte.', fx: { add: { shots: 1 }, set: { camo: true } } },
    { lvl: 10, name: 'Sternenfall', desc: 'Ultimate: 30 Sterne fallen auf zufällige Gegner der ganzen Karte.', ultimate: 'starfall' },
    { lvl: 12, name: 'Tiefe Deutung', desc: 'Verwundbarkeit +10 %, Aura +5 % Schaden.', fx: { add: { mark: 0.1, 'support.dmg': 0.05 } } },
    { lvl: 15, name: 'Aufstieg', desc: 'Sternenmantel: Schaden ×1,3, +1 Stern.', fx: { mul: { dmg: 1.3 }, add: { shots: 1 } }, form: 1 },
    { lvl: 20, name: 'Meisterform', desc: 'Herrin der Nacht: Schaden ×1,6, Abklingzeiten −30 %.', fx: { mul: { dmg: 1.6 } }, form: 2, cdr: 0.3 },
  ],
  abilities: {
    veil: { name: 'Mondschleier', cd: 40, desc: 'Gegner im Umkreis 4: enttarnt, +50 % Schaden für 8 s.' },
    starfall: { name: 'Sternenfall', cd: 85, mul: 18, desc: '30 Sterne auf zufällige Gegner (×18).' },
  },
  lines: {
    place: ['Die Sterne stehen günstig.', 'Ich sehe euren Weg.', 'Die Nacht ist mit uns.'], level: ['Klarer…', 'Ich sehe mehr.'], boss: ['Auch er hat einen Stern – und der fällt.'],
    ability: ['Mondschleier.', 'Zeig dich.'], ult: ['Sternenfall!'], leak: ['Das stand nicht in den Sternen…'],
    win: ['Wie vorhergesagt.'], ascend: ['Der Mond leuchtet durch mich.'], master: ['Ich bin die Nacht.'],
  },
};
HEROES.sora = {
  id: 'sora', name: 'Sora', title: 'Windbogenschützin', model: 'sora', color: '#8fe0a0',
  personality: 'Ruhig, geduldig, lacht selten – aber wenn, dann laut.',
  lore: 'Sora wuchs auf den Himmelsinseln auf, wo der Wind jedem Pfeil eine Richtung gibt. Sie trifft eine Kirsche auf hundert Schritt – im Sturm.',
  place: ['ground', 'high'],
  base: { proj: 'arrow', dmg: 8, rate: 1.2, range: 4.0, speed: 22, pierce: 3, dmgType: 'phys' },
  milestones: [
    { lvl: 1,  name: 'Windpfeil', desc: 'Sehr weite Reichweite, Pfeile durchbohren 3 Gegner.' },
    { lvl: 3,  name: 'Adlerauge', desc: 'Erkennt Getarnte, +0,5 Reichweite.', fx: { set: { camo: true }, add: { range: 0.5 } } },
    { lvl: 5,  name: 'Pfeilregen', desc: 'Fähigkeit: 24 Pfeile regnen auf die dichteste Gegnergruppe.', ability: 'volley' },
    { lvl: 7,  name: 'Doppelsehne', desc: '+1 Pfeil pro Schuss.', fx: { add: { shots: 1, spread: 0.12 } } },
    { lvl: 10, name: 'Himmelspfeil', desc: 'Ultimate: Ein riesiger Pfeil fliegt den ganzen Pfad entlang und trifft jeden Gegner darauf.', ultimate: 'skyshot' },
    { lvl: 12, name: 'Sturmsehne', desc: '+20 % Krit, +2 Durchschlag.', fx: { add: { 'crit.ch': 0.2, pierce: 2 } } },
    { lvl: 15, name: 'Aufstieg', desc: 'Windschwingen: Schaden ×1,3, Tempo ×1,15.', fx: { mul: { dmg: 1.3, rate: 1.15 } }, form: 1 },
    { lvl: 20, name: 'Meisterform', desc: 'Herrin der Böen: Schaden ×1,6, +1 Pfeil, Abklingzeiten −30 %.', fx: { mul: { dmg: 1.6 }, add: { shots: 1 } }, form: 2, cdr: 0.3 },
  ],
  abilities: {
    volley: { name: 'Pfeilregen', cd: 35, mul: 5, desc: '24 Pfeile (je ×5) auf die dichteste Gruppe.' },
    skyshot: { name: 'Himmelspfeil', cd: 80, mul: 22, desc: 'Trifft jeden Gegner auf dem Pfad (×22) und wirft ihn zurück.' },
  },
  lines: {
    place: ['Wind von links. Gut.', 'Ich sehe alles von hier.', 'Bereit.'], level: ['Weiter.', 'Schärfer!'], boss: ['Großes Ziel. Kein Problem.'],
    ability: ['Pfeilregen!', 'Deckung!'], ult: ['Himmelspfeil!'], leak: ['Der Wind hat gedreht…'],
    win: ['Kein Pfeil verschwendet.'], ascend: ['Der Wind trägt mich!'], master: ['Ich bin der Sturm über den Inseln.'],
  },
};
HEROES.ren = {
  id: 'ren', name: 'Ren', title: 'Schattenpuppenspieler', model: 'ren', color: '#b07bff',
  personality: 'Höflich, rätselhaft, immer einen Schritt voraus – oder drei Puppen.',
  lore: 'Ren zog als Puppenspieler von Dorf zu Dorf. Erst später merkten die Leute, dass seine Puppen auch ohne Fäden tanzen.',
  place: ['ground', 'high'],
  base: { proj: 'shadowkunai', dmg: 6, rate: 1.3, range: 3.0, speed: 15, dmgType: 'shadow', 'slow.pct': 0.15, 'slow.dur': 1 },
  milestones: [
    { lvl: 1,  name: 'Schattenfaden', desc: 'Schattenkunai verlangsamen leicht.' },
    { lvl: 3,  name: 'Unsichtbare Fäden', desc: 'Passiv: Getroffene nehmen +10 % Schaden.', fx: { add: { mark: 0.1 } } },
    { lvl: 5,  name: 'Schattenpuppen', desc: 'Fähigkeit: Drei Puppen kämpfen 8 s lang mit (×3 Angriffe).', ability: 'puppets' },
    { lvl: 7,  name: 'Dunkelsicht', desc: 'Erkennt Getarnte, +1 Kunai.', fx: { set: { camo: true }, add: { shots: 1 } } },
    { lvl: 10, name: 'Schattenbann', desc: 'Ultimate: Alle Gegner der Karte erstarren 2,5 s und werden verwundbar.', ultimate: 'bind' },
    { lvl: 12, name: 'Marionettenmeister', desc: 'Verwundbarkeit +10 %, Tempo ×1,2.', fx: { add: { mark: 0.1 }, mul: { rate: 1.2 } } },
    { lvl: 15, name: 'Aufstieg', desc: 'Schattenmantel: Schaden ×1,3, +1 Kunai.', fx: { mul: { dmg: 1.3 }, add: { shots: 1 } }, form: 1 },
    { lvl: 20, name: 'Meisterform', desc: 'Herr der Fäden: Schaden ×1,6, Abklingzeiten −30 %.', fx: { mul: { dmg: 1.6 } }, form: 2, cdr: 0.3 },
  ],
  abilities: {
    puppets: { name: 'Schattenpuppen', cd: 40, dur: 8, desc: 'Drei Puppen werfen mit (×3 Angriffe, 8 s).' },
    bind: { name: 'Schattenbann', cd: 85, mul: 8, desc: 'Alle Gegner: Schaden ×8, 2,5 s Erstarren (Bosse verlangsamt), +30 % Verwundbarkeit.' },
  },
  lines: {
    place: ['Der Vorhang hebt sich.', 'Darf ich vorstellen? Meine Puppen.', 'Pst…'], level: ['Applaus, bitte.', 'Ein neuer Akt.'], boss: ['Ein großer Gast. Wie schön.'],
    ability: ['Tanzt, meine Puppen!'], ult: ['Schattenbann. Niemand rührt sich.'], leak: ['Ein Patzer im Stück…'],
    win: ['Und – Vorhang.'], ascend: ['Die Schatten verneigen sich.'], master: ['Alle Fäden laufen bei mir zusammen.'],
  },
};
export const HERO_IDS = Object.keys(HEROES);

// ═══════════════════════ v0.55: vier neue Helden ═══════════════════════
const LV = (a) => a;   // Lesbarkeit
HEROES.akane = {
  id: 'akane', name: 'Akane', title: 'Feuerpriesterin', model: 'akane', color: '#ff6a3a',
  personality: 'Feurig, ungeduldig, herzlich – und sehr laut beim Beten.',
  lore: 'Akane hütet das ewige Feuer im Glutkrater-Schrein. Sie sagt, das Feuer spreche zu ihr. Meistens sagt es: „Mehr!“',
  place: ['ground', 'high'],
  base: { proj: 'fireshuriken', dmg: 5, rate: 1.3, range: 2.9, speed: 14, dmgType: 'fire', 'burn.dps': 3, 'burn.dur': 2.5 },
  milestones: LV([
    { lvl: 1,  name: 'Opferflamme', desc: 'Feuerzauber setzen Gegner in Brand.' },
    { lvl: 3,  name: 'Heiße Glut', desc: 'Brand +50 %.', fx: { mul: { 'burn.dps': 1.5 } } },
    { lvl: 5,  name: 'Flammenkreis', desc: 'Fähigkeit: Ein Feuerring verbrennt alle Gegner in der Nähe schwer.', ability: 'pyre' },
    { lvl: 7,  name: 'Zwillingsflamme', desc: '+1 Feuerzauber, Fläche.', fx: { add: { shots: 1, spread: 0.2, aoe: 0.5 } } },
    { lvl: 10, name: 'Inferno', desc: 'Ultimate: Die ganze Karte brennt – jeder Gegner nimmt schweren Schaden und brennt lange.', ultimate: 'inferno' },
    { lvl: 12, name: 'Schreinfeuer', desc: 'Kreaturen in der Nähe +8 % Schaden.', fx: { add: { 'support.range': 2.4, 'support.dmg': 0.08 } } },
    { lvl: 15, name: 'Aufstieg', desc: 'Feuerschwingen: Schaden ×1,3, Brand ×1,5.', fx: { mul: { dmg: 1.3, 'burn.dps': 1.5 } }, form: 1 },
    { lvl: 20, name: 'Meisterform', desc: 'Hohepriesterin der Flamme: Schaden ×1,6, Abklingzeiten −30 %.', fx: { mul: { dmg: 1.6 } }, form: 2, cdr: 0.3 },
  ]),
  abilities: {
    pyre: { name: 'Flammenkreis', cd: 35, mul: 9, desc: 'Feuerring im Umkreis 3: Schaden ×9 und starker Brand.' },
    inferno: { name: 'Inferno', cd: 85, mul: 10, desc: 'Jeder Gegner der Karte: Schaden ×10 und 6 s Brand.' },
  },
  lines: {
    place: ['Das Feuer ist bereit!', 'Wärmt euch an mir!', 'Brennt hell!'], level: ['Heißer!', 'Mehr Glut!'], boss: ['Ein großes Feuer für einen großen Feind!'],
    ability: ['Flammenkreis!', 'Brenn!'], ult: ['INFERNO!'], leak: ['Ich war zu langsam – verzeih, Feuer!'],
    win: ['Das Feuer ist zufrieden.'], ascend: ['Ich bin die Flamme!'], master: ['Das ewige Feuer wohnt in mir.'],
  },
};
HEROES.tetsu = {
  id: 'tetsu', name: 'Tetsu', title: 'Schmied-Samurai', model: 'tetsu', color: '#c8d0e0',
  personality: 'Wortkarg, gründlich, stolz auf jede Klinge, die er geschmiedet hat.',
  lore: 'Tetsu schmiedete die Klingen der halben Shinobi-Akademie. Eines Tages legte er den Hammer weg und nahm eine davon selbst in die Hand.',
  place: ['ground'],
  base: { atk: 'slash', dmg: 14, rate: 1.0, range: 1.6, dmgType: 'phys', cleave: 1, pierceArmor: 0.3, bossMul: 1.3 },
  milestones: LV([
    { lvl: 1,  name: 'Schwertstreich', desc: 'Starke Hiebe, die Panzer teilweise durchdringen.' },
    { lvl: 3,  name: 'Gehärteter Stahl', desc: 'Panzerbrechen +30 %, +10 % Krit.', fx: { add: { pierceArmor: 0.3, 'crit.ch': 0.1 } } },
    { lvl: 5,  name: 'Schmiedefeuer', desc: 'Fähigkeit: Kreaturen in der Nähe 10 s +40 % Schaden und durchdringen Panzer.', ability: 'forge' },
    { lvl: 7,  name: 'Weiter Hieb', desc: '+0,3 Reichweite, Hiebe treffen mehr Gegner.', fx: { add: { range: 0.3, cleave: 1 } } },
    { lvl: 10, name: 'Iaidō', desc: 'Ultimate: Ein einziger Schnitt in den stärksten Gegner der Karte – mit Druckwelle.', ultimate: 'iaido' },
    { lvl: 12, name: 'Meisterklinge', desc: 'Bosse ×1,3, Krit ×2,5.', fx: { mul: { bossMul: 1.3 }, set: { 'crit.mult': 2.5 } } },
    { lvl: 15, name: 'Aufstieg', desc: 'Drachenrüstung: Schaden ×1,3, Tempo ×1,2.', fx: { mul: { dmg: 1.3, rate: 1.2 } }, form: 1 },
    { lvl: 20, name: 'Meisterform', desc: 'Klingenheiliger: Schaden ×1,7, Abklingzeiten −30 %.', fx: { mul: { dmg: 1.7 } }, form: 2, cdr: 0.3 },
  ]),
  abilities: {
    forge: { name: 'Schmiedefeuer', cd: 40, dur: 10, desc: 'Kreaturen im Umkreis 3,5: +40 % Schaden, Panzerbrechen (10 s).' },
    iaido: { name: 'Iaidō', cd: 80, mul: 60, desc: 'Stärkster Gegner der Karte: Schaden ×60; Druckwelle ×15 ringsum.' },
  },
  lines: {
    place: ['Stahl ist bereit.', 'Hm.', 'Diese Klinge wartet.'], level: ['Schärfer.', 'Gut geschmiedet.'], boss: ['Großes Ziel. Gute Klinge.'],
    ability: ['Feuer der Esse!', 'Härtet euch!'], ult: ['…Iaidō.'], leak: ['Ein schlechter Schnitt.'],
    win: ['Saubere Arbeit.'], ascend: ['Der Stahl singt.'], master: ['Ich bin die Klinge.'],
  },
};
HEROES.nami = {
  id: 'nami', name: 'Nami', title: 'Wellen-Kunoichi', model: 'nami', color: '#5fd6ff',
  personality: 'Verspielt, frech, taucht immer dort auf, wo man sie nicht erwartet.',
  lore: 'Nami wuchs bei den Kappa im Fluss auf und lernte dort, dass Wasser alles bezwingt – geduldig oder auf einen Schlag.',
  place: ['ground', 'high', 'water'],
  base: { proj: 'bubble', dmg: 5, rate: 1.4, range: 3.0, speed: 14, dmgType: 'ice', knock: 0.15, 'slow.pct': 0.25, 'slow.dur': 1.2, aoe: 0.5, water: 0.3 },
  milestones: LV([
    { lvl: 1,  name: 'Wasserkunai', desc: 'Wasserkugeln verlangsamen und stoßen zurück.' },
    { lvl: 3,  name: 'Strömung', desc: '+15 % Verlangsamung, stärkerer Rückstoß.', fx: { add: { 'slow.pct': 0.15, knock: 0.1 } } },
    { lvl: 5,  name: 'Tsunami', desc: 'Fähigkeit: Eine Welle spült alle Gegner in der Nähe weit zurück.', ability: 'tsunami' },
    { lvl: 7,  name: 'Gischt', desc: '+1 Kugel, größere Fläche.', fx: { add: { shots: 1, spread: 0.25, aoe: 0.3 } } },
    { lvl: 10, name: 'Mahlstrom', desc: 'Ultimate: Ein Strudel packt jeden Gegner der Karte, zieht ihn zurück und bremst ihn stark.', ultimate: 'maelstrom' },
    { lvl: 12, name: 'Tiefsee', desc: 'Erkennt Getarnte, +0,4 Reichweite.', fx: { set: { camo: true }, add: { range: 0.4 } } },
    { lvl: 15, name: 'Aufstieg', desc: 'Wellenmantel: Schaden ×1,3, Tempo ×1,2.', fx: { mul: { dmg: 1.3, rate: 1.2 } }, form: 1 },
    { lvl: 20, name: 'Meisterform', desc: 'Herrin der Gezeiten: Schaden ×1,6, Abklingzeiten −30 %.', fx: { mul: { dmg: 1.6 } }, form: 2, cdr: 0.3 },
  ]),
  abilities: {
    tsunami: { name: 'Tsunami', cd: 35, mul: 6, desc: 'Gegner im Umkreis 3,5: Schaden ×6, weit zurückgespült, stark verlangsamt.' },
    maelstrom: { name: 'Mahlstrom', cd: 85, mul: 8, desc: 'Jeder Gegner: Schaden ×8, zurückgezogen, 5 s stark verlangsamt.' },
  },
  lines: {
    place: ['Platsch! Da bin ich!', 'Wasser marsch!', 'Hihi, Wellen!'], level: ['Mehr Welle!', 'Juhu!'], boss: ['Na, wie groß bist du denn?'],
    ability: ['Tsunami!', 'Weggespült!'], ult: ['Mahlstrom – rein mit euch!'], leak: ['Ups, durchgerutscht!'],
    win: ['Alles sauber gewaschen!'], ascend: ['Ich bin die Flut!'], master: ['Das Meer hört auf mich.'],
  },
};
HEROES.kuro = {
  id: 'kuro', name: 'Kuro', title: 'Geisterrufer', model: 'kuro', color: '#7df3ff',
  personality: 'Leise, freundlich, redet mehr mit Geistern als mit Lebenden.',
  lore: 'Kuro hört die Seelen des Ahnenhains flüstern. Sie folgen ihm – als Licht, als Nebel und manchmal als Klinge.',
  place: ['ground', 'high'],
  base: { atk: 'chain', dmg: 8, rate: 1.0, range: 2.9, dmgType: 'spirit', 'chain.n': 2, 'chain.range': 2 },
  milestones: LV([
    { lvl: 1,  name: 'Seelenfaden', desc: 'Geisterblitze springen auf 2 weitere Gegner.' },
    { lvl: 3,  name: 'Geistersicht', desc: 'Erkennt Getarnte, Kette +1.', fx: { set: { camo: true }, add: { 'chain.n': 1 } } },
    { lvl: 5,  name: 'Seelenruf', desc: 'Fähigkeit: Vier Geisterlichter umkreisen Kuro 12 s und treffen alles in der Nähe.', ability: 'spirits' },
    { lvl: 7,  name: 'Lange Kette', desc: 'Kette +2, Tempo ×1,2.', fx: { add: { 'chain.n': 2 }, mul: { rate: 1.2 } } },
    { lvl: 10, name: 'Seelenernte', desc: 'Ultimate: Gegner unter 25 % Leben werden geerntet; alle anderen nehmen schweren Geistschaden.', ultimate: 'reaper' },
    { lvl: 12, name: 'Ahnenruf', desc: 'Kreaturen in der Nähe +6 % Tempo.', fx: { add: { 'support.range': 2.4, 'support.rate': 0.06 } } },
    { lvl: 15, name: 'Aufstieg', desc: 'Geistermantel: Schaden ×1,3, Kette +1.', fx: { mul: { dmg: 1.3 }, add: { 'chain.n': 1 } }, form: 1 },
    { lvl: 20, name: 'Meisterform', desc: 'Hüter der Seelen: Schaden ×1,6, Abklingzeiten −30 %.', fx: { mul: { dmg: 1.6 } }, form: 2, cdr: 0.3 },
  ]),
  abilities: {
    spirits: { name: 'Seelenruf', cd: 40, dur: 12, desc: '4 Geisterlichter umkreisen Kuro (12 s).' },
    reaper: { name: 'Seelenernte', cd: 90, mul: 12, desc: 'Gegner unter 25 % KP (keine Bosse) vergehen; alle anderen: Schaden ×12.' },
  },
  lines: {
    place: ['Die Geister sind mit uns.', 'Psst… sie flüstern.', 'Ich bin hier.'], level: ['Die Seelen danken.', 'Heller.'], boss: ['Eine große, zornige Seele…'],
    ability: ['Kommt, ihr Lichter.', 'Seelenruf.'], ult: ['Die Ernte beginnt.'], leak: ['Eine Seele ist entwischt…'],
    win: ['Ruht in Frieden.'], ascend: ['Die Ahnen tragen mich.'], master: ['Alle Seelen kennen meinen Namen.'],
  },
};
