// Postgame Teil 2 (Phase 4.5b): Kreaturen aus dem Dimensionsriss, drei Raid-Bosse und Nihilux
import { SPECIES } from './creatures.js';
import { MOVES } from './moves.js';

Object.assign(MOVES, {
  zeitriss: { name: 'Zeitriss', type: 'magie', cat: 'spez', pow: 100, acc: 95, pp: 5, fx: 'beam', effect: { status: 'starre', chance: 20 } },
  leersog: { name: 'Leersog', type: 'schatten', cat: 'spez', pow: 95, acc: 100, pp: 10, fx: 'storm' },
  prismastrahl: { name: 'Prismastrahl', type: 'licht', cat: 'spez', pow: 100, acc: 95, pp: 5, fx: 'beam' },
  weltenende: { name: 'Weltenende', type: 'schatten', cat: 'spez', pow: 120, acc: 90, pp: 5, fx: 'quake' },
  splitterhieb: { name: 'Splitterhieb', type: 'magie', cat: 'phys', pow: 80, acc: 100, pp: 15, fx: 'slash' },
});

const L = str => str.trim().split(/\s+/).map(t => { const [l, id] = t.split(':'); return [+l, id]; });
const ST = a => ({ hp: a[0], atk: a[1], def: a[2], spa: a[3], spd: a[4], spe: a[5] });
function C(id, num, name, types, rarity, stats, catchRate, xp, learn, evo, lore, model, cry, extra = {}) {
  SPECIES[id] = { num, name, types, rarity, stats: ST(stats), catchRate, xp, learn: L(learn), evo, lore, model, cry, ...extra };
}

// ---------------------------------------------------------------- Wilde Kreaturen des Risses
C('splitterling', 122, 'Splittix', ['magie'], 'ungewoehnlich', [60, 65, 70, 75, 70, 70], 90, 110,
  '1:funkelstaub 1:kratzer 20:splitterhieb 34:runenblitz 46:mondstrahl', { to: 'splitterdrache', lvl: 50 },
  'Ein Bruchstück einer anderen Welt, das plötzlich lebendig wurde. Es klirrt bei jedem Schritt.',
  { kind: 'lizard', main: '#c8a8f8', accent: '#f8f0ff', glow: '#78f8f8', size: 0.75, extras: ['gem'] }, { f: 1800, f2: 2400, len: 0.2, wave: 'sine', wob: 30 });
C('splitterdrache', 123, 'Fraktodrak', ['magie', 'drache'], 'selten', [90, 105, 95, 105, 90, 90], 45, 210,
  '1:splitterhieb 1:drachenklaue 50:drachenwut 56:mondstrahl', null,
  'Seine Flügel sind aus Glas, das andere Himmel spiegelt. Wer hineinsieht, sieht fremde Sterne.',
  { kind: 'lizard', main: '#9a78e8', accent: '#f0e8ff', glow: '#68f8f8', size: 1.25, extras: ['wings', 'gem', 'spikes'] }, { f: 900, f2: 1900, len: 0.5, wave: 'sine', wob: 14 });
C('leerfalter', 124, 'Nullfalter', ['schatten', 'luft'], 'ungewoehnlich', [65, 55, 60, 95, 75, 100], 90, 140,
  '1:windstoss 1:nachtschleier 30:leersog 40:orkan', null,
  'Wo er flattert, verschwinden für einen Moment die Farben. Danach riecht es nach Regen.',
  { kind: 'moth', main: '#1a1428', accent: '#5a4a8a', glow: '#f8f8ff', size: 0.9 }, { f: 1300, f2: 800, len: 0.4, wave: 'sine', wob: 20 });
C('zeitkaefer', 125, 'Tickskarab', ['metall', 'magie'], 'selten', [80, 90, 115, 80, 95, 45], 60, 170,
  '1:eisenkralle 1:funkelstaub 30:metallstoss 40:zeitriss', null,
  'Auf seinem Panzer drehen sich Zeiger. Niemand weiß, welche Zeit sie anzeigen.',
  { kind: 'beetle', main: '#c8b070', accent: '#f8f0d8', glow: '#78d8f8', size: 0.95, extras: ['gem'] }, { f: 700, f2: 700, len: 0.3, wave: 'square', wob: 60 });
C('nebelmolch', 126, 'Nebelotl', ['gift', 'geist'], 'ungewoehnlich', [75, 60, 70, 90, 85, 65], 90, 140,
  '1:giftnebel 1:spukgriff 30:schattenball 40:schlammbombe', null,
  'Halb hier, halb woanders. Fasst man ihn an, greift man durch kalten Nebel.',
  { kind: 'axolotl', main: '#88a898', accent: '#d8f0e0', glow: '#c878f8', size: 0.9 }, { f: 400, f2: 600, len: 0.5, wave: 'sine', wob: 9 });
C('sternqualle', 127, 'Astromedu', ['licht', 'wasser'], 'selten', [85, 50, 75, 100, 105, 70], 60, 170,
  '1:lichtpfeil 1:gischt 30:flutwelle 40:prismastrahl', null,
  'Sie treibt durch den Riss wie durch ein Meer aus Sternen. In ihr leuchtet eine kleine Galaxie.',
  { kind: 'blob', main: '#a8d8f8', accent: '#fff8d0', glow: '#ffffff', size: 1.0, extras: ['aura'] }, { f: 1500, f2: 1100, len: 0.6, wave: 'sine', wob: 6 });
C('echopilz', 128, 'Resonpilz', ['pflanze', 'geist'], 'ungewoehnlich', [90, 70, 85, 80, 90, 40], 90, 145,
  '1:rankenhieb 1:spukgriff 30:schattenball 40:urwaldzorn', null,
  'Er wiederholt jedes Geräusch, das er hört – nur ein paar Sekunden zu spät.',
  { kind: 'mushroom', main: '#7a5aa8', accent: '#e8e0f8', glow: '#a8ff88', size: 0.9 }, { f: 600, f2: 1200, len: 0.4, wave: 'triangle', wob: 25 });
C('phasenhase', 129, 'Phasmümmel', ['normal', 'magie'], 'ungewoehnlich', [70, 85, 60, 70, 65, 115], 90, 140,
  '1:sprungtritt 1:funkelstaub 30:splitterhieb 40:mondstrahl', null,
  'Er springt nicht – er ist einfach plötzlich woanders. Fangen ist sehr, sehr schwer.',
  { kind: 'bunny', main: '#f0e8ff', accent: '#a888e8', glow: '#78f8f8', size: 0.75, extras: ['ears'] }, { f: 1900, f2: 2600, len: 0.15, wave: 'square', wob: 50 });

// ---------------------------------------------------------------- Raid-Bosse
C('chronoth', 130, 'Chronoth', ['metall', 'magie'], 'legendaer', [110, 100, 120, 110, 110, 70], 3, 310,
  '1:zeitriss 1:erzschlag 1:mondstrahl 1:eisschild', null,
  'Wächter der Zeit zwischen den Welten. In seiner Brust schlägt ein Uhrwerk, das nie stehen bleibt.',
  { kind: 'golem', main: '#b89848', accent: '#f8f0d8', glow: '#58e8f8', size: 1.9, extras: ['gem', 'crown', 'aura'] }, { f: 120, f2: 240, len: 1.0, wave: 'square', wob: 6 }, { legendary: true });
C('vortyx', 131, 'Vortyx', ['schatten', 'luft'], 'legendaer', [100, 110, 90, 115, 90, 115], 3, 310,
  '1:leersog 1:orkan 1:schattenklaue 1:nachtschleier', null,
  'Ein Sturm aus Leere mit Flügeln. Was er verschluckt, taucht in einer anderen Welt wieder auf.',
  { kind: 'bird', main: '#1a1030', accent: '#7a5ae8', glow: '#ff5ae8', size: 1.9, extras: ['wings', 'crest', 'aura'] }, { f: 300, f2: 120, len: 1.0, wave: 'sawtooth', wob: 4 }, { legendary: true });
C('prismora', 132, 'Prismora', ['licht', 'magie'], 'legendaer', [105, 80, 100, 125, 120, 90], 3, 310,
  '1:prismastrahl 1:mondstrahl 1:glanzschild 1:sternensegen', null,
  'Ein lebender Kristall, der das Licht aller Welten bricht. Ihr Leuchten heilt und blendet zugleich.',
  { kind: 'wisp', main: '#f8f0ff', accent: '#f8a8e8', glow: '#88f8ff', size: 1.9, extras: ['gem', 'crown', 'aura'] }, { f: 1400, f2: 2100, len: 1.0, wave: 'sine', wob: 3 }, { legendary: true });

// ---------------------------------------------------------------- Nihilux
C('nihilux', 133, 'Nihilux', ['schatten', 'drache'], 'legendaer', [120, 120, 105, 130, 105, 100], 3, 360,
  '1:weltenende 1:drachenwut 1:leersog 1:zeitriss', null,
  'Das Wesen zwischen den Welten. Es hat schon viele Welten enden sehen – und war in jeder allein.',
  { kind: 'serpent', main: '#0e0a1a', accent: '#c8a8ff', glow: '#ff3a8a', size: 1.9, extras: ['wings', 'horns', 'aura', 'gem'] }, { f: 80, f2: 400, len: 1.2, wave: 'sawtooth', wob: 2 }, { legendary: true });

export const RISS = ['splitterling', 'splitterdrache', 'leerfalter', 'zeitkaefer', 'nebelmolch', 'sternqualle', 'echopilz', 'phasenhase', 'chronoth', 'vortyx', 'prismora', 'nihilux'];
