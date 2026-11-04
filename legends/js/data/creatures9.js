// Postgame (Phase 4.5): vier erwachte Hüter und 10 Kreaturen ihrer Heiligtümer
import { SPECIES } from './creatures.js';
import { MOVES } from './moves.js';

Object.assign(MOVES, {
  urfeuer: { name: 'Urfeuer', type: 'feuer', cat: 'phys', pow: 110, acc: 90, pp: 5, fx: 'quake', effect: { status: 'brand', chance: 20 } },
  gezeitensang: { name: 'Gezeitensang', type: 'wasser', cat: 'spez', pow: 100, acc: 95, pp: 5, fx: 'beam' },
  polarsturm: { name: 'Polarsturm', type: 'eis', cat: 'spez', pow: 110, acc: 85, pp: 5, fx: 'storm' },
  drachenstahl: { name: 'Drachenstahl', type: 'metall', cat: 'phys', pow: 100, acc: 95, pp: 5, fx: 'slash' },
});

const L = str => str.trim().split(/\s+/).map(t => { const [l, id] = t.split(':'); return [+l, id]; });
const ST = a => ({ hp: a[0], atk: a[1], def: a[2], spa: a[3], spd: a[4], spe: a[5] });
function C(id, num, name, types, rarity, stats, catchRate, xp, learn, evo, lore, model, cry, extra = {}) {
  SPECIES[id] = { num, name, types, rarity, stats: ST(stats), catchRate, xp, learn: L(learn), evo, lore, model, cry, ...extra };
}

// ---------------------------------------------------------------- Kreaturen der Heiligtümer
C('funkwiesel', 108, 'Wieselzap', ['elektro'], 'ungewoehnlich', [55, 60, 45, 70, 50, 100], 120, 95,
  '1:funkenschlag 1:kratzer 12:funkensprung 24:donnerflug 36:blitzschlag', { to: 'blitzwiesel', lvl: 40 },
  'Es reibt sein Fell an Felsen, bis es knistert. Wer es streichelt, hat danach wilde Haare.',
  { kind: 'fox', main: '#f8d848', accent: '#fff8d8', glow: '#78d8ff', size: 0.7, extras: ['ears'] }, { f: 1700, f2: 2300, len: 0.18, wave: 'square', wob: 45 });
C('blitzwiesel', 109, 'Fulminor', ['elektro', 'normal'], 'selten', [75, 95, 65, 100, 70, 125], 45, 190,
  '1:funkensprung 1:sprungtritt 40:blitzschlag 48:donnerflug', null,
  'So schnell, dass man nur den Donner hört, nicht das Wiesel. Es jagt Gewitter über die Gipfel.',
  { kind: 'fox', main: '#f0c020', accent: '#fff0b0', glow: '#a8f0ff', size: 1.0, extras: ['ears', 'spikes'] }, { f: 1400, f2: 2600, len: 0.25, wave: 'sawtooth', wob: 30 });
C('glutviper', 110, 'Glutzisch', ['feuer', 'gift'], 'selten', [75, 100, 70, 90, 70, 95], 60, 180,
  '1:giftzahn 1:flammenbiss 30:gifthieb 40:magmaflut 50:schlammbombe', null,
  'Sie schwimmt durch flüssige Lava. Ihr Biss brennt zweimal: erst heiß, dann giftig.',
  { kind: 'serpent', main: '#2a1a1a', accent: '#ff8a28', glow: '#b8ff48', size: 1.0, extras: ['tailflame'] }, { f: 500, f2: 300, len: 0.4, wave: 'sawtooth', wob: 20 });
C('obsidrak', 111, 'Obsidrak', ['erde', 'drache'], 'selten', [95, 110, 115, 60, 75, 50], 45, 195,
  '1:steinwurf 1:drachenodem 30:felsgranate 40:drachenklaue 50:drachenwut', null,
  'Seine Schuppen sind aus Vulkanglas. Fällt eine ab, schleifen die Leute in Ignis Messer daraus.',
  { kind: 'lizard', main: '#1e1e2a', accent: '#6a5a8a', glow: '#ff5a2a', size: 1.2, extras: ['spikes', 'horns'] }, { f: 160, f2: 120, len: 0.6, wave: 'square', wob: 6 });
C('perlnixe', 112, 'Perlinde', ['wasser', 'magie'], 'selten', [80, 55, 75, 105, 100, 85], 60, 185,
  '1:gischt 1:funkelstaub 30:mondstrahl 40:flutwelle 50:sternensegen', null,
  'Sie singt in Grotten, und das Echo klingt wie ein ganzer Chor. Seeleute folgen ihr zu sicheren Buchten.',
  { kind: 'axolotl', main: '#f0d8f0', accent: '#78c8f8', glow: '#ffffff', size: 0.95, extras: ['gem', 'fins'] }, { f: 1200, f2: 1700, len: 0.5, wave: 'sine', wob: 8 });
C('nachtkrake', 113, 'Tintenox', ['wasser', 'schatten'], 'selten', [90, 95, 80, 85, 80, 70], 45, 190,
  '1:aquahieb 1:schattenbiss 30:schattenklaue 40:wellenschlag 50:albtraum', null,
  'Er lebt in Höhlen, in die nie Licht fällt. Seine acht Arme leuchten nur, wenn er jagt.',
  { kind: 'blob', main: '#2a1a4a', accent: '#8a6ae8', glow: '#58f8e8', size: 1.1, extras: ['horns'] }, { f: 220, f2: 160, len: 0.6, wave: 'sine', wob: 10 });
C('firnwolf', 114, 'Lykofrost', ['eis', 'schatten'], 'selten', [85, 105, 75, 70, 75, 100], 60, 185,
  '1:frostbiss 1:schattenbiss 30:schattenklaue 40:hagelschlag 50:blizzard', null,
  'Er heult nur bei Neumond. Wer das Heulen hört, findet am nächsten Morgen frische Spuren um sein Zelt.',
  { kind: 'fox', main: '#e8f0f8', accent: '#9aa4c8', glow: '#7ad8ff', size: 1.1, extras: ['ears', 'spikes'] }, { f: 600, f2: 1100, len: 0.7, wave: 'sine', wob: 12 });
C('sturmyak', 115, 'Blizzyak', ['eis', 'normal'], 'ungewoehnlich', [115, 100, 95, 50, 80, 45], 90, 175,
  '1:rempler 1:eiszapfen 30:sprungtritt 40:hagelschlag 50:frostwelle', null,
  'Sein Fell hält jeden Schneesturm ab. Ganze Herden wandern im Gänsemarsch über den Gipfel.',
  { kind: 'stag', main: '#8a7a6a', accent: '#f4f8ff', glow: '#a8d8f8', size: 1.2, extras: ['horns'] }, { f: 140, f2: 110, len: 0.6, wave: 'square', wob: 4 });
C('donnerdrache', 116, 'Fulgodrak', ['elektro', 'drache'], 'episch', [90, 100, 80, 110, 80, 105], 30, 220,
  '1:funkensprung 1:drachenodem 30:donnerflug 40:drachenwut 50:blitzschlag', null,
  'Er schläft in Gewitterwolken. Jeder Blitz über dem Drachengipfel ist ein Flügelschlag von ihm.',
  { kind: 'lizard', main: '#3a4a8a', accent: '#f8e848', glow: '#a8f8ff', size: 1.25, extras: ['wings', 'crest'] }, { f: 300, f2: 900, len: 0.6, wave: 'sawtooth', wob: 14 });
C('wolkenwal', 117, 'Cumuwal', ['luft', 'wasser'], 'selten', [130, 70, 80, 85, 90, 50], 45, 190,
  '1:windstoss 1:wasserstrahl 30:fluegelschlag 40:flutwelle 50:orkan', null,
  'Er schwimmt durch die Wolken wie andere durchs Meer. Wenn er bläst, regnet es im Tal.',
  { kind: 'fish', main: '#c8d8f0', accent: '#f8f8ff', glow: '#78b8f8', size: 1.4, extras: ['fins'] }, { f: 120, f2: 260, len: 1.0, wave: 'sine', wob: 2 });

// ---------------------------------------------------------------- Die vier erwachten Hüter
C('ignarok', 118, 'Ignarok', ['feuer', 'erde'], 'legendaer', [110, 130, 115, 95, 90, 70], 3, 300,
  '1:urfeuer 1:felsgranate 1:lavabrocken 1:hitzeschild', null,
  'Hüter von Ignis. Er schläft im Herzen des Vulkans. Wenn er atmet, steigt die Lava.',
  { kind: 'golem', main: '#3a1a14', accent: '#ff7a1a', glow: '#ffd040', size: 1.9, extras: ['horns', 'aura', 'tailflame'] }, { f: 90, f2: 60, len: 1.0, wave: 'sawtooth', wob: 3 }, { legendary: true });
C('maristra', 119, 'Maristra', ['wasser', 'magie'], 'legendaer', [100, 70, 90, 115, 110, 85], 3, 300,
  '1:gezeitensang 1:mondstrahl 1:wellenschlag 1:sternensegen', null,
  'Hüterin von Aqualis. Ihr Lied lenkt Ebbe und Flut. Sie wohnt in einer Grotte, die nur bei Niedrigwasser zu sehen ist.',
  { kind: 'serpent', main: '#2a7ad8', accent: '#f0e8ff', glow: '#ff9ae8', size: 1.9, extras: ['fins', 'crown', 'aura'] }, { f: 500, f2: 1200, len: 1.0, wave: 'sine', wob: 4 }, { legendary: true });
C('boreon', 120, 'Boreon', ['eis', 'luft'], 'legendaer', [95, 85, 90, 130, 100, 115], 3, 300,
  '1:polarsturm 1:orkan 1:hagelschlag 1:eisschild', null,
  'Hüter von Frostheim. Ein Schlag seiner Schwingen, und der ganze Pass liegt unter Schnee.',
  { kind: 'bird', main: '#e8f4ff', accent: '#5a8ad8', glow: '#9ff3ff', size: 1.9, extras: ['crest', 'wings', 'aura'] }, { f: 1300, f2: 700, len: 0.9, wave: 'sine', wob: 5 }, { legendary: true });
C('ferrodrakon', 121, 'Ferrodrakon', ['drache', 'metall'], 'legendaer', [110, 125, 125, 90, 95, 75], 3, 300,
  '1:drachenstahl 1:drachenwut 1:erzschlag 1:panzern', null,
  'Hüter von Drakmor. Sein Panzer wurde im Feuer des ersten Vulkans geschmiedet. Alle Drachen der Welt stammen von ihm ab.',
  { kind: 'lizard', main: '#4a5268', accent: '#f0c040', glow: '#ff4a3a', size: 1.9, extras: ['crown', 'spikes', 'aura'] }, { f: 150, f2: 320, len: 1.0, wave: 'sawtooth', wob: 4 }, { legendary: true });

export const POSTGAME = ['funkwiesel', 'blitzwiesel', 'glutviper', 'obsidrak', 'perlnixe', 'nachtkrake', 'firnwolf', 'sturmyak', 'donnerdrache', 'wolkenwal', 'ignarok', 'maristra', 'boreon', 'ferrodrakon'];
export const HUETER = ['sylvaron', 'ignarok', 'maristra', 'boreon', 'lunareth', 'solarion', 'ferrodrakon'];
