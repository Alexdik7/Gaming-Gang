// Region Frostheim (Phase 3): 10 neue Eis-Kreaturen + Eis-Attacken
import { SPECIES } from './creatures.js';
import { MOVES } from './moves.js';

Object.assign(MOVES, {
  blizzard: { name: 'Blizzard', type: 'eis', cat: 'spez', pow: 95, acc: 80, pp: 8, fx: 'storm' },
  hagelschlag: { name: 'Hagelschlag', type: 'eis', cat: 'phys', pow: 75, acc: 95, pp: 15, fx: 'bolt' },
  frostbiss: { name: 'Frostbiss', type: 'eis', cat: 'phys', pow: 65, acc: 95, pp: 15, fx: 'bite' },
  eisschild: { name: 'Eisschild', type: 'eis', cat: 'status', pow: 0, acc: 100, pp: 20, fx: 'buff', effect: { stat: 'def', stages: 1, target: 'self' } },
});

const L = str => str.trim().split(/\s+/).map(t => { const [l, id] = t.split(':'); return [+l, id]; });
const ST = a => ({ hp: a[0], atk: a[1], def: a[2], spa: a[3], spd: a[4], spe: a[5] });
function C(id, num, name, types, rarity, stats, catchRate, xp, learn, evo, lore, model, cry) {
  SPECIES[id] = { num, name, types, rarity, stats: ST(stats), catchRate, xp, learn: L(learn), evo, lore, model, cry };
}

C('schneehase', 66, 'Firnmümmel', ['eis'], 'gewoehnlich', [50, 55, 45, 40, 45, 75], 190, 60,
  '1:rempler 1:frosthauch 8:sprungtritt 14:frostbiss 20:hagelschlag', null,
  'Im Winter ist sein Fell weiß wie Neuschnee. Man sieht ihn nur, wenn er mit den Ohren wackelt.',
  { kind: 'bunny', main: '#f4f8ff', accent: '#a8c8f0', glow: '#c8f0ff', size: 0.6 }, { f: 1200, f2: 1500, len: 0.15, wave: 'triangle', wob: 30 });
C('frostfuchs', 67, 'Frostvulp', ['eis'], 'ungewoehnlich', [50, 60, 45, 55, 50, 70], 120, 70,
  '1:kratzer 1:frosthauch 9:frostbiss 15:eiszapfen', { to: 'polarfuchs', lvl: 30 },
  'Sein Atem lässt Pfützen in Sekunden gefrieren. Er spielt gern mit Eiskristallen wie mit Murmeln.',
  { kind: 'fox', main: '#c8e0f8', accent: '#ffffff', glow: '#7ad8ff', stage: 1, size: 0.8 }, { f: 800, f2: 1100, len: 0.25, wave: 'square', wob: 15 });
C('polarfuchs', 68, 'Aurovulp', ['eis', 'magie'], 'selten', [75, 85, 70, 95, 80, 95], 45, 170,
  '1:frostbiss 1:runenblitz 30:blizzard 36:frostwelle', null,
  'Wo seine neun Eisschweife über den Schnee streichen, bleibt ein Muster aus Aurorix zurück.',
  { kind: 'fox', main: '#a8c8f0', accent: '#ffffff', glow: '#c8a8ff', stage: 2, size: 1.2, extras: ['crest'] }, { f: 600, f2: 1200, len: 0.4, wave: 'sawtooth', wob: 10 });
C('pinguk', 69, 'Pinguli', ['eis', 'wasser'], 'gewoehnlich', [55, 50, 50, 45, 50, 45], 190, 60,
  '1:rempler 1:wasserstrahl 8:frosthauch 14:gischt 20:eiszapfen', { to: 'kaiserpingu', lvl: 28 },
  'Pinguli rutschen lieber auf dem Bauch, als zu laufen. Auf Eis sind sie schneller als jeder Schlitten.',
  { kind: 'bird', main: '#3a4a6a', accent: '#f8f8ff', glow: '#f8c840', size: 0.6 }, { f: 700, f2: 500, len: 0.2, wave: 'square', wob: 20 });
C('kaiserpingu', 70, 'Imperguin', ['eis', 'wasser'], 'selten', [90, 85, 80, 80, 80, 60], 60, 165,
  '1:eiszapfen 1:aquahieb 28:wellenschlag 34:blizzard', null,
  'Mit erhobenem Schnabel führt er ganze Kolonien über das Packeis. Niemand widerspricht ihm.',
  { kind: 'bird', main: '#2a3450', accent: '#f8f8ff', glow: '#f8a830', size: 1.0, extras: ['crown'] }, { f: 400, f2: 300, len: 0.45, wave: 'sawtooth', wob: 8 });
C('frosteule', 71, 'Rauhuhu', ['eis', 'luft'], 'ungewoehnlich', [65, 55, 60, 80, 75, 75], 90, 120,
  '1:windstoss 1:frosthauch 14:fluegelschlag 20:frostwelle 26:orkan', null,
  'Sie gleitet lautlos durch Schneestürme. Ihr Ruf klingt wie klirrendes Glas.',
  { kind: 'owl', main: '#e8f0f8', accent: '#9ab8d8', glow: '#ffe060', size: 0.85 }, { f: 950, f2: 700, len: 0.4, wave: 'sine', wob: 6 });
C('eiszapfling', 72, 'Zapfix', ['eis', 'metall'], 'ungewoehnlich', [60, 80, 95, 40, 60, 45], 120, 110,
  '1:eisenkralle 1:eisschild 12:hagelschlag 18:metallstoss 24:stahlwirbel', null,
  'Sein Horn ist ein Eiszapfen, der niemals schmilzt. Er hängt sich zum Schlafen kopfüber an Felsdecken.',
  { kind: 'beetle', main: '#8ab8d8', accent: '#d8e8f0', glow: '#ffffff', size: 0.8 }, { f: 1400, f2: 1700, len: 0.15, wave: 'square', wob: 45 });
C('nordlicht', 73, 'Aurorix', ['eis', 'magie'], 'episch', [70, 50, 70, 105, 95, 90], 30, 190,
  '1:funkelstaub 1:frosthauch 20:mondlicht 28:runenblitz 34:blizzard', null,
  'Man sagt, die Lichter am Nachthimmel über Frostheim seien Nordlichter, die tanzen.',
  { kind: 'wisp', main: '#7ae8c8', accent: '#c87af8', glow: '#e8fff8', size: 0.85, extras: ['aura'] }, { f: 500, f2: 1500, len: 0.6, wave: 'sine', wob: 4 });
C('firnwurm', 74, 'Firnodrak', ['eis', 'drache'], 'selten', [75, 90, 75, 70, 70, 70], 45, 165,
  '1:frostbiss 1:drachenodem 20:hagelschlag 28:drachenklaue 34:blizzard', null,
  'Er schläft unter Gletschern und erwacht nur, wenn eine Lawine ihn kitzelt.',
  { kind: 'serpent', main: '#d8ecf8', accent: '#5a88c8', glow: '#a8f0ff', size: 1.0, extras: ['horns'] }, { f: 300, f2: 600, len: 0.5, wave: 'sawtooth', wob: 6 });
C('schneeglock', 75, 'Schneeglimm', ['eis', 'pflanze'], 'ungewoehnlich', [55, 45, 60, 70, 75, 50], 120, 95,
  '1:rankenhieb 1:frosthauch 10:wurzelkraft 16:blattsturm 24:frostwelle', null,
  'Es blüht mitten im Schnee. Wo es läutet, taut der Boden ein kleines Stück auf.',
  { kind: 'sprout', main: '#e8f4f0', accent: '#98d878', glow: '#ffffff', stage: 1, size: 0.65 }, { f: 1600, f2: 1300, len: 0.3, wave: 'sine', wob: 12 });

export const FROSTHEIM = ['schneehase', 'frostfuchs', 'polarfuchs', 'pinguk', 'kaiserpingu', 'frosteule', 'eiszapfling', 'nordlicht', 'firnwurm', 'schneeglock'];
