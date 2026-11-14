// Katzen-Soldaten – reine Daten. Neue Katze = neuer Eintrag (plus optional neues Zubehör in ui/art.js).
//
// base: Grundwerte. atk = Angriffsart (shot | cone | pulse | chain | beam | support | eco)
//   dmg/rate(Angriffe pro s)/range(Felder)/type(phys|fire|ice|volt|boom|shadow|light|acid)
// paths: 3 Pfade × 3 Stufen: [NameDE, NameEN, Kosten, Effekte]
//   Effekte: dmg/rate/range = prozentual (0.3 = +30 %), Zahlen sonst = addieren, true/Text = setzen.
// cls: Klassen (dmg, support, cc, eco, def, area, sniper, util, legend)
// unlock: { lvl, coins | crystals } – Starter haben lvl 1 und keine Kosten.

const P = (de, en, tiers) => ({ n: [de, en], tiers });

export const CATS = {
  scout: {
    n: 'Scout Cat', cls: ['dmg', 'util'], cost: 100, unlock: { lvl: 1 },
    d: ['Günstiger Allrounder mit guter Reichweite. Der perfekte Start.', 'Cheap all-rounder with good range. The perfect opener.'],
    base: { atk: 'shot', type: 'phys', dmg: 6, rate: 1.25, range: 3.2 },
    look: { fur: '#f2a03d', fur2: '#fff1d6', pat: 'stripes', eye: '#3fa34d', acc: 'cap', cloth: '#4f8a3c', weapon: 'slingshot' },
    paths: [
      P('Schaden', 'Damage', [['Spitze Steine', 'Sharp Stones', 70, { dmg: 0.5 }], ['Stahlkugeln', 'Steel Balls', 160, { dmg: 0.7, pen: 0.3 }], ['Meisterschütze', 'Marksman', 420, { dmg: 1.4, crit: 0.2 }]]),
      P('Tempo', 'Speed', [['Flinke Pfoten', 'Quick Paws', 80, { rate: 0.35 }], ['Doppelschuss', 'Double Shot', 190, { shots: 1 }], ['Dauerfeuer', 'Rapid Fire', 460, { rate: 0.9, shots: 1 }]]),
      P('Späher', 'Recon', [['Fernglas', 'Binoculars', 60, { range: 0.2, detect: true }], ['Markieren', 'Mark Target', 170, { vuln: 0.12 }], ['Leuchtfeuer', 'Flare', 380, { reveal: true, range: 0.25, vuln: 0.1 }]])
    ]
  },
  bomb: {
    n: 'Bomb Cat', cls: ['area'], cost: 260, unlock: { lvl: 1 },
    d: ['Wirft Wollknäuel-Bomben. Stark gegen dichte Gruppen.', 'Lobs yarn bombs. Strong against tight groups.'],
    base: { atk: 'shot', type: 'boom', dmg: 13, rate: 0.6, range: 2.8, splash: 1.1, arc: true },
    look: { fur: '#5b5f6b', fur2: '#d9dde6', pat: 'patch', eye: '#ffcf3a', acc: 'helmet', cloth: '#3d5a40', weapon: 'bomb' },
    paths: [
      P('Sprengkraft', 'Payload', [['Dickere Bomben', 'Bigger Bombs', 150, { dmg: 0.45 }], ['Splitter', 'Shrapnel', 330, { dmg: 0.6, splash: 0.25 }], ['Megabombe', 'Mega Bomb', 820, { dmg: 1.6, splash: 0.5 }]]),
      P('Nachladen', 'Reload', [['Kurze Lunte', 'Short Fuse', 140, { rate: 0.3 }], ['Zwei Pfoten', 'Two Paws', 300, { rate: 0.5 }], ['Bombenteppich', 'Carpet Bombing', 760, { rate: 0.8, cluster: 3 }]]),
      P('Schock', 'Shock', [['Rauchbombe', 'Smoke Bomb', 130, { slow: 0.2, slowT: 1.5 }], ['Blendgranate', 'Flashbang', 340, { stun: 0.6 }], ['Erschütterung', 'Concussion', 700, { stun: 0.6, shred: 3, shredT: 4 }]])
    ]
  },
  ice: {
    n: 'Ice Cat', cls: ['cc'], cost: 240, unlock: { lvl: 2, coins: 250 },
    d: ['Friert die Luft ein und bremst alle Hunde in ihrer Nähe.', 'Chills the air and slows every dog nearby.'],
    base: { atk: 'pulse', type: 'ice', dmg: 2, rate: 0.8, range: 2.0, slow: 0.35, slowT: 1.6 },
    look: { fur: '#eaf6ff', fur2: '#bfe3ff', pat: 'point', eye: '#3aa0ff', acc: 'earmuffs', cloth: '#5cc8ff', weapon: 'snow' },
    paths: [
      P('Frostbiss', 'Frostbite', [['Eissplitter', 'Ice Shards', 140, { dmg: 2.0 }], ['Tiefkühlung', 'Deep Chill', 300, { dmg: 2.5, vuln: 0.1 }], ['Absoluter Nullpunkt', 'Absolute Zero', 800, { dmg: 5, vuln: 0.15 }]]),
      P('Kältewelle', 'Cold Wave', [['Weiter Atem', 'Wide Breath', 120, { range: 0.25 }], ['Schneller Puls', 'Quick Pulse', 260, { rate: 0.6 }], ['Blizzard', 'Blizzard', 720, { range: 0.4, rate: 0.6 }]]),
      P('Starre', 'Freeze', [['Klebriger Frost', 'Sticky Frost', 150, { slow: 0.12, slowT: 0.8 }], ['Eisblock', 'Ice Block', 380, { freeze: 0.18 }], ['Ewiges Eis', 'Permafrost', 900, { freeze: 0.2, slow: 0.13 }]])
    ]
  },
  gunner: {
    n: 'Machine Gun Cat', cls: ['dmg'], cost: 230, unlock: { lvl: 3, coins: 350 },
    d: ['Extrem schnelle Schüsse mit wenig Schaden. Schwach gegen Rüstung.', 'Extremely fast shots, low damage. Weak against armor.'],
    base: { atk: 'shot', type: 'phys', dmg: 3.2, rate: 5.5, range: 2.5 },
    look: { fur: '#8a5a3c', fur2: '#f1d9b8', pat: 'none', eye: '#f25f4c', acc: 'bandana', cloth: '#d83a3a', weapon: 'minigun' },
    paths: [
      P('Kaliber', 'Caliber', [['Hartkern', 'Hard Core', 150, { dmg: 0.4, pen: 0.2 }], ['Panzerbrecher', 'Armor Piercer', 340, { dmg: 0.5, pen: 0.4 }], ['Schwere Gatling', 'Heavy Gatling', 900, { dmg: 1.4, pierce: 1 }]]),
      P('Feuerrate', 'Fire Rate', [['Geölter Lauf', 'Oiled Barrel', 140, { rate: 0.3 }], ['Doppellauf', 'Twin Barrel', 320, { rate: 0.5 }], ['Kugelhagel', 'Bullet Storm', 850, { rate: 1.1 }]]),
      P('Unterdrückung', 'Suppression', [['Zielfernrohr', 'Scope', 110, { range: 0.3 }], ['Sperrfeuer', 'Suppressing Fire', 300, { slow: 0.15, slowT: 0.6 }], ['Brandmunition', 'Incendiary', 780, { burn: 6, burnT: 3 }]])
    ]
  },
  sniper: {
    n: 'Sniper Cat', cls: ['sniper', 'dmg'], cost: 320, unlock: { lvl: 4, coins: 500 },
    d: ['Riesige Reichweite, hoher Einzelschaden, langsamer Schuss. Durchschlägt Rüstung.', 'Huge range, high single-target damage, slow shot. Pierces armor.'],
    base: { atk: 'shot', type: 'phys', dmg: 55, rate: 0.38, range: 7, instant: true, pen: 0.5, mode: 'strong' },
    look: { fur: '#c9c2b8', fur2: '#ffffff', pat: 'stripes', eye: '#6b8cff', acc: 'beret', cloth: '#6b4a2f', weapon: 'rifle' },
    paths: [
      P('Durchschlag', 'Penetration', [['Vollmantel', 'Full Metal', 220, { dmg: 0.5 }], ['Panzerbüchse', 'Anti-Armor', 480, { dmg: 0.7, pen: 0.5 }], ['Boss-Jäger', 'Boss Hunter', 1200, { dmg: 1.3, bossDmg: 1.0 }]]),
      P('Repetierer', 'Bolt Action', [['Schneller Bolzen', 'Quick Bolt', 200, { rate: 0.35 }], ['Halbautomatik', 'Semi-Auto', 450, { rate: 0.6 }], ['Trommelfeuer', 'Full Auto', 1100, { rate: 1.3 }]]),
      P('Spezialmunition', 'Special Ammo', [['Wärmebild', 'Thermal Scope', 180, { detect: true, range: 0.15 }], ['Betäubungspfeil', 'Stun Dart', 420, { stun: 0.8 }], ['Durchschuss', 'Rail Shot', 1000, { line: true, crit: 0.25 }]])
    ]
  },
  fire: {
    n: 'Fire Cat', cls: ['area', 'dmg'], cost: 280, unlock: { lvl: 5, coins: 600 },
    d: ['Flammenwerfer: trifft alle Hunde im Kegel und setzt sie in Brand.', 'Flamethrower: hits every dog in a cone and sets them ablaze.'],
    base: { atk: 'cone', type: 'fire', dmg: 4, rate: 3, range: 2.0, burn: 4, burnT: 3 },
    look: { fur: '#e2572b', fur2: '#ffd9a0', pat: 'none', eye: '#ffd23f', acc: 'goggles', cloth: '#7a2b1c', weapon: 'flamer' },
    paths: [
      P('Hitze', 'Heat', [['Blaue Flamme', 'Blue Flame', 160, { dmg: 0.5 }], ['Weißglut', 'White Heat', 360, { dmg: 0.6, burn: 4 }], ['Inferno', 'Inferno', 900, { dmg: 1.5, burn: 8 }]]),
      P('Druck', 'Pressure', [['Großer Tank', 'Big Tank', 130, { range: 0.25 }], ['Hochdruck', 'High Pressure', 300, { rate: 0.4, range: 0.15 }], ['Feuerwalze', 'Fire Roller', 800, { rate: 0.6, cone: 0.5 }]]),
      P('Nachbrennen', 'Afterburn', [['Klebriges Öl', 'Sticky Oil', 140, { burnT: 2, burn: 2 }], ['Schmelze', 'Meltdown', 380, { shred: 2, shredT: 3 }], ['Flächenbrand', 'Wildfire', 850, { spread: true, burn: 6 }]])
    ]
  },
  banker: {
    n: 'Banker Cat', cls: ['eco'], cost: 360, unlock: { lvl: 6, coins: 800 },
    d: ['Kämpft nicht, bringt aber nach jeder Welle Futter ein. Lohnt sich in langen Spielen.', 'Does not fight but earns fish after each wave. Pays off in long games.'],
    base: { atk: 'eco', type: 'phys', dmg: 0, rate: 0, range: 2.2, income: 45 },
    look: { fur: '#f4f0e6', fur2: '#d8c9a6', pat: 'none', eye: '#2f7f5f', acc: 'tophat', cloth: '#2b2b3a', weapon: 'coinbag' },
    paths: [
      P('Rendite', 'Yield', [['Sparbuch', 'Savings', 200, { income: 30 }], ['Fischfonds', 'Fish Fund', 480, { income: 60 }], ['Goldader', 'Gold Vein', 1300, { income: 150 }]]),
      P('Zinsen', 'Interest', [['Zinseszins', 'Compound', 240, { interest: 0.03 }], ['Großbank', 'Big Bank', 520, { interest: 0.03 }], ['Börsenkater', 'Stock Cat', 1200, { interest: 0.05 }]]),
      P('Kopfgeld', 'Bounty', [['Trinkgeld', 'Tips', 180, { bounty: 0.15 }], ['Rabattmarke', 'Coupon', 420, { discount: 0.1 }], ['Kopfgeldjäger', 'Bounty Hunter', 950, { bounty: 0.25, discount: 0.08 }]])
    ]
  },
  medic: {
    n: 'Medic Cat', cls: ['support'], cost: 300, unlock: { lvl: 8, coins: 1000 },
    d: ['Hält Katzen in der Nähe wach (weniger Betäubung) und macht sie schneller.', 'Keeps nearby cats awake (less stun) and makes them faster.'],
    base: { atk: 'support', type: 'phys', dmg: 0, rate: 0, range: 2.4, aRate: 0.1, aStun: 0.5 },
    look: { fur: '#ffffff', fur2: '#ffd6e0', pat: 'patch', eye: '#e2466f', acc: 'nurse', cloth: '#ffffff', weapon: 'medkit' },
    paths: [
      P('Katzenminze-Tee', 'Catnip Tea', [['Starker Aufguss', 'Strong Brew', 220, { aRate: 0.07 }], ['Doppelte Dosis', 'Double Dose', 500, { aRate: 0.08 }], ['Adrenalin', 'Adrenaline', 1200, { aRate: 0.12 }]]),
      P('Feldlazarett', 'Field Hospital', [['Größeres Zelt', 'Bigger Tent', 160, { range: 0.3 }], ['Riechsalz', 'Smelling Salts', 380, { aStun: 0.3 }], ['Unerschütterlich', 'Unshakable', 900, { aStun: 0.2, range: 0.2 }]]),
      P('Basis-Pflege', 'Base Care', [['Pflaster', 'Band-Aid', 250, { lifeEvery: 4 }], ['Notarzt', 'Paramedic', 550, { lifeEvery: -1 }], ['Chefarzt', 'Chief Medic', 1300, { lifeEvery: -1, lifeMax: 10 }]])
    ]
  },
  sumo: {
    n: 'Sumo Cat', cls: ['def', 'cc'], cost: 320, unlock: { lvl: 9, coins: 1200 },
    d: ['Stampft auf den Boden und schleudert Hunde zurück. Der Türsteher am Engpass.', 'Stomps the ground and knocks dogs back. The bouncer at the choke point.'],
    base: { atk: 'pulse', type: 'phys', dmg: 12, rate: 0.42, range: 1.6, knock: 0.7 },
    look: { fur: '#f7d7b0', fur2: '#fff6ea', pat: 'none', eye: '#33303a', acc: 'topknot', cloth: '#3b4cc0', weapon: 'none', fat: 1.25 },
    paths: [
      P('Wucht', 'Force', [['Schwere Pfoten', 'Heavy Paws', 180, { dmg: 0.6 }], ['Erdbeben', 'Earthquake', 420, { dmg: 0.9, range: 0.15 }], ['Meteorsprung', 'Meteor Jump', 1000, { dmg: 2, pen: 0.6 }]]),
      P('Ausdauer', 'Stamina', [['Kondition', 'Conditioning', 170, { rate: 0.35 }], ['Dauerstampfer', 'Rapid Stomp', 400, { rate: 0.5 }], ['Unermüdlich', 'Tireless', 950, { rate: 0.9 }]]),
      P('Türsteher', 'Bouncer', [['Rauswurf', 'Throw Out', 190, { knock: 0.4 }], ['Benommen', 'Dazed', 440, { stun: 0.5 }], ['Hausverbot', 'Banned', 1050, { knock: 0.6, stun: 0.4 }]])
    ]
  },
  engineer: {
    n: 'Engineer Cat', cls: ['util', 'dmg'], cost: 380, unlock: { lvl: 10, coins: 1500 },
    d: ['Schießt selbst und baut laufend kleine Geschütze an den Weg.', 'Shoots and keeps building small turrets along the path.'],
    base: { atk: 'shot', type: 'phys', dmg: 8, rate: 1.0, range: 3.0, turretCd: 9, turretLife: 14, turretDmg: 4, turretRate: 2.5, turrets: 2 },
    look: { fur: '#b97a3f', fur2: '#f7e2c0', pat: 'patch', eye: '#3a9bd9', acc: 'hardhat', cloth: '#f2b632', weapon: 'wrench' },
    paths: [
      P('Geschütze', 'Turrets', [['Bessere Läufe', 'Better Barrels', 220, { turretDmg: 3 }], ['Zwillingsgeschütz', 'Twin Turret', 500, { turretRate: 2.5 }], ['Wachturm', 'Sentry Tower', 1250, { turretDmg: 9, turretPen: 0.5 }]]),
      P('Fließband', 'Assembly Line', [['Schnellbau', 'Quick Build', 200, { turretCd: -2 }], ['Lagerhaltung', 'Stockpile', 460, { turrets: 1, turretLife: 6 }], ['Fabrik', 'Factory', 1150, { turretCd: -3, turrets: 2 }]]),
      P('Werkstatt', 'Workshop', [['Nagelpistole', 'Nail Gun', 180, { dmg: 0.6, rate: 0.3 }], ['Wartung', 'Maintenance', 420, { aRange: 0.1 }], ['Tüftler', 'Tinkerer', 980, { aRange: 0.1, discount: 0.12 }]])
    ]
  },
  commander: {
    n: 'Commander Cat', cls: ['support'], cost: 450, unlock: { lvl: 12, coins: 2000 },
    d: ['Mit Sonnenbrille und Befehlston: Katzen im Umkreis teilen mehr Schaden aus.', 'Shades and a commanding voice: cats in range deal more damage.'],
    base: { atk: 'support', type: 'phys', dmg: 0, rate: 0, range: 2.6, aDmg: 0.15 },
    look: { fur: '#3b3b46', fur2: '#e9e4d8', pat: 'patch', eye: '#111', acc: 'shades', cloth: '#2f5d3a', weapon: 'baton' },
    paths: [
      P('Drill', 'Drill', [['Appell', 'Roll Call', 280, { aDmg: 0.07 }], ['Elitetruppe', 'Elite Squad', 620, { aDmg: 0.1 }], ['Kriegsrat', 'War Council', 1500, { aDmg: 0.15, aCrit: 0.1 }]]),
      P('Logistik', 'Logistics', [['Funkgerät', 'Radio', 200, { range: 0.3 }], ['Fernrohre', 'Spyglasses', 480, { aRange: 0.12 }], ['Luftaufklärung', 'Air Recon', 1100, { aRange: 0.1, reveal: true }]]),
      P('Taktik', 'Tactics', [['Schwachstellen', 'Weak Spots', 260, { aPen: 0.25 }], ['Sturmbefehl', 'Charge!', 560, { aRate: 0.1 }], ['Generalstab', 'General Staff', 1400, { aRate: 0.1, aPen: 0.25 }]])
    ]
  },
  tesla: {
    n: 'Tesla Cat', cls: ['area', 'dmg'], cost: 420, unlock: { lvl: 14, coins: 2400 },
    d: ['Kettenblitze springen von Hund zu Hund. Doppelter Schaden gegen Schilde.', 'Chain lightning jumps from dog to dog. Double damage against shields.'],
    base: { atk: 'chain', type: 'volt', dmg: 9, rate: 0.9, range: 2.7, chain: 4, jump: 1.6 },
    look: { fur: '#f5e663', fur2: '#fffbe0', pat: 'stripes', eye: '#35c5ff', acc: 'coil', cloth: '#3b4a7a', weapon: 'tesla' },
    paths: [
      P('Spannung', 'Voltage', [['Hochspannung', 'High Voltage', 240, { dmg: 0.5 }], ['Überladung', 'Overcharge', 540, { dmg: 0.8 }], ['Gewitterkater', 'Thunder Cat', 1350, { dmg: 1.8, crit: 0.15 }]]),
      P('Leitung', 'Conduction', [['Längere Kette', 'Longer Chain', 220, { chain: 2 }], ['Weite Sprünge', 'Wide Jumps', 480, { jump: 0.6, chain: 2 }], ['Kugelblitz', 'Ball Lightning', 1200, { chain: 5, rate: 0.4 }]]),
      P('Kurzschluss', 'Short Circuit', [['Zucken', 'Twitch', 230, { slow: 0.2, slowT: 0.8 }], ['Lähmung', 'Paralysis', 560, { stun: 0.35 }], ['EMP', 'EMP', 1300, { stun: 0.3, shieldBreak: true }]])
    ]
  },
  scientist: {
    n: 'Scientist Cat', cls: ['util', 'area'], cost: 360, unlock: { lvl: 16, coins: 2800 },
    d: ['Verrücktes Labor: Säure-Kolben zerfressen Rüstung und machen Hunde verwundbar.', 'Mad lab: acid flasks eat armor and make dogs vulnerable.'],
    base: { atk: 'shot', type: 'acid', dmg: 6, rate: 0.7, range: 3.0, splash: 0.9, shred: 3, shredT: 5, arc: true },
    look: { fur: '#b7e07a', fur2: '#f4ffe0', pat: 'none', eye: '#a347d6', acc: 'lab', cloth: '#ffffff', weapon: 'flask' },
    paths: [
      P('Säure', 'Acid', [['Konzentrat', 'Concentrate', 200, { shred: 3, dmg: 0.5 }], ['Ätzwolke', 'Corrosive Cloud', 460, { burn: 5, burnT: 4 }], ['Auflöser', 'Dissolver', 1150, { shred: 8, burn: 8 }]]),
      P('Serienversuch', 'Test Series', [['Mehr Kolben', 'More Flasks', 190, { rate: 0.4 }], ['Großer Kolben', 'Big Flask', 420, { splash: 0.4, rate: 0.3 }], ['Kettenreaktion', 'Chain Reaction', 1050, { rate: 0.7, cluster: 2 }]]),
      P('Mutagen', 'Mutagen', [['Schwächeserum', 'Weakness Serum', 240, { vuln: 0.12 }], ['Schrumpfstrahl', 'Shrink Ray', 540, { slow: 0.25, slowT: 2 }], ['Genie', 'Genius', 1300, { vuln: 0.13, shieldBreak: true }]])
    ]
  },
  rocket: {
    n: 'Rocket Cat', cls: ['area', 'sniper'], cost: 620, unlock: { lvl: 18, coins: 3500 },
    d: ['Raketen mit riesigem Explosionsradius und großer Reichweite. Langsam, aber gewaltig.', 'Rockets with a huge blast radius and long range. Slow but mighty.'],
    base: { atk: 'shot', type: 'boom', dmg: 46, rate: 0.3, range: 5.5, splash: 1.6 },
    look: { fur: '#7d8fa8', fur2: '#e6edf7', pat: 'stripes', eye: '#ff7b2e', acc: 'pilot', cloth: '#44506a', weapon: 'launcher' },
    paths: [
      P('Sprengkopf', 'Warhead', [['Schwerer Kopf', 'Heavy Head', 380, { dmg: 0.5 }], ['Hohlladung', 'Shaped Charge', 800, { dmg: 0.7, pen: 0.5 }], ['Hundeschreck', 'Dog Scare', 2000, { dmg: 1.8, bossDmg: 0.5 }]]),
      P('Salve', 'Salvo', [['Schnelllader', 'Quick Loader', 340, { rate: 0.35 }], ['Doppelrohr', 'Twin Tube', 760, { rate: 0.6 }], ['Raketensturm', 'Rocket Storm', 1900, { rate: 0.9, cluster: 3 }]]),
      P('Napalm', 'Napalm', [['Brandsatz', 'Incendiary', 360, { burn: 6, burnT: 4 }], ['Druckwelle', 'Shockwave', 780, { stun: 0.5, splash: 0.3 }], ['Feuersturm', 'Firestorm', 1800, { burn: 12, splash: 0.4 }]])
    ]
  },
  ninja: {
    n: 'Ninja Cat', cls: ['dmg', 'util'], cost: 480, unlock: { lvl: 20, coins: 4200 },
    d: ['Blitzschnelle Wurfsterne, die durch Hunde fliegen. Sieht getarnte Hunde.', 'Lightning-fast shuriken that fly through dogs. Sees stealthed dogs.'],
    base: { atk: 'shot', type: 'phys', dmg: 9, rate: 2.1, range: 2.9, shots: 2, pierce: 1, detect: true, crit: 0.1 },
    look: { fur: '#2c2c36', fur2: '#55556a', pat: 'none', eye: '#ffe14d', acc: 'hood', cloth: '#1c1c24', weapon: 'shuriken' },
    paths: [
      P('Klinge', 'Blade', [['Geschliffen', 'Honed', 280, { dmg: 0.5 }], ['Giftklingen', 'Poison Blades', 620, { burn: 6, burnT: 4, dmg: 0.3 }], ['Tausend Schnitte', 'Thousand Cuts', 1500, { dmg: 1.5, crit: 0.25 }]]),
      P('Hagel', 'Flurry', [['Dritter Stern', 'Third Star', 260, { shots: 1 }], ['Wirbelwurf', 'Whirl Throw', 580, { rate: 0.5, pierce: 1 }], ['Sternensturm', 'Star Storm', 1450, { shots: 2, rate: 0.4 }]]),
      P('Schatten', 'Shadow', [['Rauchkugel', 'Smoke Ball', 300, { stun: 0.25 }], ['Schattenschritt', 'Shadow Step', 640, { range: 0.4, instant: true }], ['Attentat', 'Assassinate', 1500, { exec: 0.12, bossDmg: 0.4 }]])
    ]
  },
  shadow: {
    n: 'Shadow Cat', cls: ['dmg', 'util'], cost: 520, unlock: { lvl: 23, coins: 5000 },
    d: ['Schlägt aus dem Schatten zu: ignoriert Schilde und Rüstung, sieht Getarnte.', 'Strikes from the shadows: ignores shields and armor, sees stealth.'],
    base: { atk: 'shot', type: 'shadow', dmg: 36, rate: 0.8, range: 3.4, instant: true, detect: true },
    look: { fur: '#4a3a6b', fur2: '#8d7ab8', pat: 'point', eye: '#c77dff', acc: 'cloak', cloth: '#2a1f44', weapon: 'claw' },
    paths: [
      P('Dunkelheit', 'Darkness', [['Tiefe Schatten', 'Deep Shadows', 320, { dmg: 0.5 }], ['Seelenriss', 'Soul Rend', 700, { dmg: 0.6, vuln: 0.1 }], ['Finsternis', 'Eclipse', 1700, { dmg: 1.6, bossDmg: 0.6 }]]),
      P('Phantom', 'Phantom', [['Zweite Kralle', 'Second Claw', 300, { rate: 0.35 }], ['Schattenklon', 'Shadow Clone', 660, { shots: 1 }], ['Heimsuchung', 'Haunting', 1600, { rate: 0.8, shots: 1 }]]),
      P('Fluch', 'Curse', [['Schwächefluch', 'Weakening Hex', 280, { slow: 0.2, slowT: 1.5 }], ['Hinrichtung', 'Execution', 680, { exec: 0.15 }], ['Albtraum', 'Nightmare', 1650, { exec: 0.1, stun: 0.4 }]])
    ]
  },
  laser: {
    n: 'Laser Cat', cls: ['dmg'], cost: 650, unlock: { lvl: 26, coins: 6000 },
    d: ['Dauerstrahl, der immer heißer wird, je länger er dasselbe Ziel trifft.', 'A continuous beam that grows hotter the longer it stays on one target.'],
    base: { atk: 'beam', type: 'volt', dmg: 4.5, rate: 8, range: 3.5, ramp: 1.0 },
    look: { fur: '#e8e8f0', fur2: '#ffffff', pat: 'none', eye: '#ff2e63', acc: 'visor', cloth: '#b01e4a', weapon: 'laser' },
    paths: [
      P('Fokus', 'Focus', [['Rubinlinse', 'Ruby Lens', 400, { dmg: 0.45 }], ['Schmelzstrahl', 'Melt Beam', 880, { ramp: 1.0, dmg: 0.3 }], ['Todesstrahl', 'Death Ray', 2200, { dmg: 1.4, ramp: 1.0 }]]),
      P('Prisma', 'Prism', [['Weitwinkel', 'Wide Angle', 350, { range: 0.25 }], ['Strahlteiler', 'Beam Splitter', 820, { beams: 1 }], ['Lichtorgel', 'Light Show', 2000, { beams: 2 }]]),
      P('Brenner', 'Burner', [['Einbrennen', 'Sear', 380, { burn: 6, burnT: 3 }], ['Durchstrahl', 'Piercing Beam', 860, { line: true }], ['Blendung', 'Dazzle', 1900, { slow: 0.3, slowT: 0.5, pen: 0.5 }]])
    ]
  },
  sphinx: {
    n: 'Sphinx Ra', cls: ['legend', 'dmg', 'support'], cost: 1400, unlock: { lvl: 35, crystals: 160 }, limit: 1,
    d: ['LEGENDÄR. Ein Sonnenstrahl durchbohrt die ganze Reihe; ihre Aura stärkt alle Katzen.', 'LEGENDARY. A sun ray pierces the whole line; her aura empowers every cat.'],
    base: { atk: 'shot', type: 'light', dmg: 70, rate: 0.7, range: 5, instant: true, line: true, detect: true, gDmg: 0.08 },
    look: { fur: '#e9c9a0', fur2: '#f7e6cf', pat: 'none', eye: '#19c3b1', acc: 'pharaoh', cloth: '#f2c230', weapon: 'sunstaff', bald: true },
    paths: [
      P('Sonnenzorn', 'Sun Wrath', [['Mittagshitze', 'Noon Heat', 900, { dmg: 0.5, burn: 10, burnT: 3 }], ['Sonnenfinsternis', 'Solar Flare', 1900, { dmg: 0.8 }], ['Supernova', 'Supernova', 4500, { dmg: 2.0, splash: 1.2 }]]),
      P('Ewigkeit', 'Eternity', [['Zeitsand', 'Time Sand', 850, { rate: 0.35 }], ['Sandsturm', 'Sandstorm', 1800, { rate: 0.5, slow: 0.25, slowT: 1 }], ['Zeitschleife', 'Time Loop', 4200, { rate: 1.0 }]]),
      P('Segen', 'Blessing', [['Sonnensegen', 'Sun Blessing', 950, { gDmg: 0.07 }], ['Allsehend', 'All-Seeing', 1700, { gReveal: true, gRange: 0.08 }], ['Göttlich', 'Divine', 4000, { gDmg: 0.1, gRate: 0.1 }]])
    ]
  },
  nyx: {
    n: 'Nyx', cls: ['legend', 'cc', 'dmg'], cost: 1500, unlock: { lvl: 40, crystals: 220 }, limit: 1,
    d: ['LEGENDÄR. Leere-Kugeln und ein Schwarzes Loch, das Hunde den Weg zurückzieht.', 'LEGENDARY. Void orbs and a black hole that drags dogs back down the path.'],
    base: { atk: 'shot', type: 'shadow', dmg: 44, rate: 1.0, range: 4.2, splash: 0.8, detect: true, hole: 14, holePull: 1.6 },
    look: { fur: '#1b1b3a', fur2: '#3d3d7a', pat: 'stars', eye: '#7df9ff', acc: 'halo', cloth: '#5b2a86', weapon: 'orb' },
    paths: [
      P('Leere', 'Void', [['Dunkle Materie', 'Dark Matter', 950, { dmg: 0.5 }], ['Antimaterie', 'Antimatter', 2000, { dmg: 0.8, splash: 0.3 }], ['Urknall', 'Big Bang', 4600, { dmg: 2.0, exec: 0.1 }]]),
      P('Gravitation', 'Gravity', [['Sog', 'Pull', 900, { holePull: 0.8 }], ['Ereignishorizont', 'Event Horizon', 1900, { hole: -4 }], ['Singularität', 'Singularity', 4300, { hole: -4, holePull: 1.2, holeDmg: 120 }]]),
      P('Sternenstaub', 'Stardust', [['Kometen', 'Comets', 880, { rate: 0.4 }], ['Sternschnuppen', 'Shooting Stars', 1850, { shots: 1 }], ['Galaxie', 'Galaxy', 4400, { shots: 1, rate: 0.5, vuln: 0.15 }]])
    ]
  }
};

export const CAT_IDS = Object.keys(CATS);
for (const id of CAT_IDS) CATS[id].id = id;

export const CLASSES = {
  dmg: ['Schaden', 'Damage'], support: ['Support', 'Support'], cc: ['Kontrolle', 'Crowd Control'], eco: ['Wirtschaft', 'Economy'],
  def: ['Verteidigung', 'Defense'], area: ['Fläche', 'Area'], sniper: ['Scharfschütze', 'Sniper'], util: ['Utility', 'Utility'], legend: ['Legendär', 'Legendary']
};
export const DMG_TYPES = {
  phys: ['Physisch', 'Physical'], fire: ['Feuer', 'Fire'], ice: ['Eis', 'Ice'], volt: ['Blitz', 'Electric'], boom: ['Explosion', 'Explosive'],
  shadow: ['Schatten', 'Shadow'], light: ['Licht', 'Light'], acid: ['Säure', 'Acid']
};
export const TARGET_MODES = ['first', 'last', 'strong', 'close'];
