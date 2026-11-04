// Region Aqualis (Phase 3): 10 neue Küsten- und Meereskreaturen + Wasser-Attacken
import { SPECIES } from './creatures.js';
import { MOVES } from './moves.js';

Object.assign(MOVES, {
  wellenschlag: { name: 'Wellenschlag', type: 'wasser', cat: 'phys', pow: 80, acc: 95, pp: 12, fx: 'dash' },
  gischt: { name: 'Gischt', type: 'wasser', cat: 'spez', pow: 55, acc: 100, pp: 20, fx: 'beam' },
  perlenglanz: { name: 'Perlenglanz', type: 'licht', cat: 'status', pow: 0, acc: 100, pp: 10, fx: 'heal', effect: { heal: 0.5 } },
  nesselhieb: { name: 'Nesselhieb', type: 'gift', cat: 'phys', pow: 65, acc: 100, pp: 15, fx: 'slash', effect: { status: 'gift', chance: 30 } },
});

const L = str => str.trim().split(/\s+/).map(t => { const [l, id] = t.split(':'); return [+l, id]; });
const ST = a => ({ hp: a[0], atk: a[1], def: a[2], spa: a[3], spd: a[4], spe: a[5] });
function C(id, num, name, types, rarity, stats, catchRate, xp, learn, evo, lore, model, cry) {
  SPECIES[id] = { num, name, types, rarity, stats: ST(stats), catchRate, xp, learn: L(learn), evo, lore, model, cry };
}

C('moewix', 56, 'Kreischi', ['wasser', 'luft'], 'gewoehnlich', [45, 50, 40, 45, 40, 70], 200, 55,
  '1:rempler 1:windstoss 7:gischt 13:fluegelschlag 19:blasenwirbel', { to: 'sturmmoewe', lvl: 25 },
  'Kreischi klauen Fischern die Brotzeit und lachen dabei so laut, dass man ihnen nicht böse sein kann.',
  { kind: 'bird', main: '#f0f4f8', accent: '#5aa8e8', glow: '#f8c840', size: 0.6 }, { f: 1400, f2: 1100, len: 0.2, wave: 'square', wob: 40 });
C('sturmmoewe', 57, 'Möwentor', ['wasser', 'luft'], 'ungewoehnlich', [70, 80, 65, 70, 65, 95], 90, 140,
  '1:gischt 1:fluegelschlag 25:wellenschlag 30:orkan', null,
  'Sie reitet auf Gewitterwolken über das Meer und taucht pfeilschnell nach Beute.',
  { kind: 'bird', main: '#d8e0e8', accent: '#2a5a9a', glow: '#f8c840', size: 0.95, extras: ['crest'] }, { f: 1100, f2: 700, len: 0.35, wave: 'sawtooth', wob: 20 });
C('quallo', 58, 'Quabbel', ['wasser', 'gift'], 'gewoehnlich', [50, 35, 45, 55, 70, 50], 190, 60,
  '1:wasserstrahl 1:giftnebel 9:nesselhieb 15:blasenwirbel', { to: 'quallissima', lvl: 27 },
  'Quabbel treiben in Schwärmen durch die Bucht. Nachts leuchten ihre Schirme wie kleine Laternen.',
  { kind: 'wisp', main: '#a8d8f8', accent: '#e878c8', glow: '#f8f0ff', size: 0.6 }, { f: 520, f2: 640, len: 0.3, wave: 'sine', wob: 15 });
C('quallissima', 59, 'Quabbelissa', ['wasser', 'gift'], 'selten', [80, 60, 70, 85, 110, 70], 60, 165,
  '1:nesselhieb 1:blasenwirbel 27:schlammbombe 33:flutwelle', null,
  'Ihre Tentakel sind so lang wie ein Fischerboot. Seeleute weichen weit aus, wenn sie ihr Leuchten sehen.',
  { kind: 'wisp', main: '#6ab0f0', accent: '#c848a8', glow: '#ffd8f8', size: 1.0, extras: ['crown', 'aura'] }, { f: 380, f2: 520, len: 0.5, wave: 'sine', wob: 8 });
C('perlpanzer', 60, 'Perlschild', ['wasser', 'metall'], 'ungewoehnlich', [65, 70, 110, 55, 80, 30], 100, 120,
  '1:panzern 1:gischt 12:eisenkralle 18:perlenglanz 24:metallstoss', null,
  'In seinem Panzer wächst eine einzige Perle. Je älter er wird, desto heller schimmert sie.',
  { kind: 'turtle', main: '#e8b8d0', accent: '#a8c8d8', glow: '#ffffff', size: 0.8, extras: ['gem'] }, { f: 300, f2: 250, len: 0.4, wave: 'triangle', wob: 6 });
C('wogenross', 61, 'Equaris', ['wasser', 'drache'], 'selten', [70, 85, 70, 80, 70, 85], 60, 160,
  '1:wasserstrahl 1:drachenodem 14:aquahieb 22:drachenklaue 28:wellenschlag', null,
  'Man sagt, wer ein Equaris reitet, kann einen Sturm überholen.',
  { kind: 'serpent', main: '#3a9ad8', accent: '#f0e0a0', glow: '#a8f0ff', size: 0.9, extras: ['fins'] }, { f: 600, f2: 900, len: 0.35, wave: 'triangle', wob: 12 });
C('korallgolem', 62, 'Korallith', ['wasser', 'erde'], 'selten', [90, 90, 105, 50, 75, 25], 60, 160,
  '1:steinwurf 1:wasserstrahl 14:panzern 20:wellenschlag 28:felsgranate', null,
  'Ein wandelndes Riff. Kleine Fische wohnen zwischen seinen Korallenästen und folgen ihm überallhin.',
  { kind: 'golem', main: '#f07870', accent: '#f8d0a0', glow: '#a8f0ff', size: 1.05, extras: ['spikes'] }, { f: 150, f2: 120, len: 0.5, wave: 'square', wob: 5 });
C('sternquappe', 63, 'Stellkaulo', ['wasser', 'licht'], 'ungewoehnlich', [55, 40, 55, 75, 70, 60], 120, 95,
  '1:gischt 1:lichtpfeil 12:perlenglanz 18:blasenwirbel 24:sonnenstrahl', null,
  'In klaren Nächten sammeln sich Sternquappen an der Oberfläche und spiegeln den Himmel.',
  { kind: 'blob', main: '#f8e070', accent: '#5a98e0', glow: '#ffffff', size: 0.6, extras: ['crown'] }, { f: 900, f2: 1200, len: 0.25, wave: 'sine', wob: 25 });
C('geisterflosse', 64, 'Phantomflos', ['wasser', 'geist'], 'selten', [60, 75, 55, 80, 70, 90], 60, 150,
  '1:wasserstrahl 1:spukgriff 16:schattenball 24:wellenschlag', null,
  'Ein bleicher Fisch, der durch Schiffsrümpfe schwimmt. Angler erzählen, er lächle ihnen zu.',
  { kind: 'fish', main: '#c8d8e8', accent: '#7a6aaa', glow: '#c8f0ff', size: 0.8, extras: ['aura'] }, { f: 700, f2: 300, len: 0.45, wave: 'sine', wob: 10 });
C('tangechse', 65, 'Algarisk', ['wasser', 'pflanze'], 'ungewoehnlich', [65, 70, 65, 60, 65, 70], 120, 100,
  '1:kratzer 1:gischt 10:rankenhieb 16:aquahieb 22:blattsturm', null,
  'Sie liegt reglos zwischen Seetang und wartet. Erst wenn sie blinzelt, merkt man, dass dort eine Echse ist.',
  { kind: 'lizard', main: '#3a9a7a', accent: '#a8e070', glow: '#e0ff9a', size: 0.8 }, { f: 420, f2: 360, len: 0.3, wave: 'triangle', wob: 14 });

export const AQUALIS = ['moewix', 'sturmmoewe', 'quallo', 'quallissima', 'perlpanzer', 'wogenross', 'korallgolem', 'sternquappe', 'geisterflosse', 'tangechse'];
