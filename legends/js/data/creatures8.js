// Region Drakmor (Phase 4): 10 Drachen-, Metall- und Gebirgskreaturen
import { SPECIES } from './creatures.js';
import { MOVES } from './moves.js';

Object.assign(MOVES, {
  drachenwut: { name: 'Drachenwut', type: 'drache', cat: 'spez', pow: 90, acc: 95, pp: 10, fx: 'storm' },
  erzschlag: { name: 'Erzschlag', type: 'metall', cat: 'phys', pow: 85, acc: 95, pp: 10, fx: 'quake' },
  steinhagel: { name: 'Steinhagel', type: 'erde', cat: 'spez', pow: 75, acc: 95, pp: 15, fx: 'storm' },
});

const L = str => str.trim().split(/\s+/).map(t => { const [l, id] = t.split(':'); return [+l, id]; });
const ST = a => ({ hp: a[0], atk: a[1], def: a[2], spa: a[3], spd: a[4], spe: a[5] });
function C(id, num, name, types, rarity, stats, catchRate, xp, learn, evo, lore, model, cry) {
  SPECIES[id] = { num, name, types, rarity, stats: ST(stats), catchRate, xp, learn: L(learn), evo, lore, model, cry };
}

C('drachling', 98, 'Drakit', ['drache'], 'ungewoehnlich', [60, 70, 55, 55, 55, 65], 90, 90,
  '1:kratzer 1:drachenodem 14:flammenbiss 22:drachenklaue', { to: 'flugdrache', lvl: 48 },
  'Er übt das Fliegen, indem er von Felsvorsprüngen springt. Meistens landet er im Gras.',
  { kind: 'lizard', main: '#5a8ad8', accent: '#f8e0a0', glow: '#ffb040', size: 0.8 }, { f: 420, f2: 640, len: 0.3, wave: 'sawtooth', wob: 15 });
C('flugdrache', 99, 'Aerodrak', ['drache', 'luft'], 'episch', [90, 110, 85, 90, 85, 100], 30, 200,
  '1:drachenklaue 1:sturzflug 48:drachenwut 54:orkan', null,
  'Er kreist über den Gipfeln von Drakmor. Sein Schatten allein lässt Herden ins Tal fliehen.',
  { kind: 'lizard', main: '#3a68c0', accent: '#f8e8b8', glow: '#ff8a30', size: 1.3, extras: ['wings', 'horns'] }, { f: 260, f2: 520, len: 0.6, wave: 'sawtooth', wob: 8 });
C('erzkaefer', 100, 'Ferroskarab', ['metall', 'erde'], 'gewoehnlich', [60, 80, 95, 40, 55, 40], 150, 85,
  '1:eisenkralle 1:steinwurf 14:metallstoss 22:erzschlag', null,
  'Er frisst Erzadern und glänzt danach wie frisch geschmiedet.',
  { kind: 'beetle', main: '#8a8a98', accent: '#c8784a', glow: '#f8d870', size: 0.8 }, { f: 520, f2: 380, len: 0.2, wave: 'square', wob: 25 });
C('felsadler', 101, 'Craigle', ['erde', 'luft'], 'ungewoehnlich', [75, 90, 70, 50, 60, 95], 90, 130,
  '1:sturzflug 1:steinwurf 18:fluegelschlag 26:steinhagel 34:orkan', null,
  'Er baut sein Nest in Felsspalten, die kein Kletterer erreicht.',
  { kind: 'bird', main: '#8a6a4a', accent: '#f0e8d8', glow: '#f8c040', size: 1.0, extras: ['crest'] }, { f: 1100, f2: 800, len: 0.4, wave: 'sawtooth', wob: 12 });
C('kristallwyrm', 102, 'Prismwyrm', ['drache', 'magie'], 'selten', [80, 70, 90, 100, 90, 70], 45, 180,
  '1:drachenodem 1:funkelstaub 20:runenblitz 30:drachenwut 38:mondstrahl', null,
  'Auf seinem Rücken wachsen Kristalle, die im Mondlicht Melodien summen.',
  { kind: 'serpent', main: '#a8b8f8', accent: '#f8c8f8', glow: '#ffffff', size: 1.1, extras: ['spikes', 'gem'] }, { f: 800, f2: 1400, len: 0.5, wave: 'sine', wob: 6 });
C('eisenbock', 103, 'Ferroram', ['metall', 'normal'], 'ungewoehnlich', [80, 95, 95, 40, 60, 60], 90, 130,
  '1:rempler 1:eisenkralle 16:sprungtritt 24:erzschlag', null,
  'Seine Hörner sind aus Eisen. Wenn zwei Böcke kämpfen, hört man es bis ins Tal.',
  { kind: 'stag', main: '#9898a8', accent: '#e8e0d0', glow: '#c8c8d8', size: 1.0 }, { f: 300, f2: 220, len: 0.3, wave: 'square', wob: 10 });
C('schwelwyrm', 104, 'Smolderax', ['drache', 'feuer'], 'selten', [85, 100, 80, 95, 75, 75], 45, 185,
  '1:drachenodem 1:gluthauch 22:drachenklaue 30:magmaflut 38:drachenwut', null,
  'Er schläft in erkalteten Lavaröhren. Wenn er schnarcht, raucht der halbe Berg.',
  { kind: 'serpent', main: '#c8482a', accent: '#f8d870', glow: '#ff8a20', size: 1.15, extras: ['horns', 'tailflame'] }, { f: 200, f2: 400, len: 0.55, wave: 'sawtooth', wob: 5 });
C('gipfelgolem', 105, 'Summitan', ['erde', 'eis'], 'selten', [100, 105, 120, 50, 70, 30], 45, 180,
  '1:steinwurf 1:eiszapfen 20:felsgranate 30:blizzard 36:erzschlag', null,
  'Auf seinem Kopf liegt das ganze Jahr Schnee. Bergsteiger halten ihn oft für einen Gipfel.',
  { kind: 'golem', main: '#7a7a88', accent: '#f4f8ff', glow: '#a8d8f8', size: 1.2, extras: ['cap'] }, { f: 100, f2: 80, len: 0.7, wave: 'square', wob: 3 });
C('wyvernix', 106, 'Wyvernix', ['drache', 'luft'], 'ungewoehnlich', [70, 80, 60, 70, 60, 105], 90, 135,
  '1:windstoss 1:drachenodem 16:sturzflug 24:drachenklaue 32:orkan', null,
  'Ein flinker kleiner Drache, der in Schwärmen um die Gipfel jagt.',
  { kind: 'bat', main: '#3a7a6a', accent: '#f0d878', glow: '#ff6a4a', size: 0.85, extras: ['horns'] }, { f: 1600, f2: 1100, len: 0.25, wave: 'square', wob: 40 });
C('zackenruecken', 107, 'Zackodon', ['metall', 'drache'], 'selten', [85, 100, 115, 60, 75, 55], 45, 185,
  '1:eisenkralle 1:drachenklaue 24:metallstoss 32:erzschlag 40:drachenwut', null,
  'Die Zacken auf seinem Rücken sind schärfer als Schwerter. Er schärft sie an Granit.',
  { kind: 'lizard', main: '#6a7888', accent: '#c8d0d8', glow: '#ff5a5a', size: 1.15, extras: ['spikes'] }, { f: 240, f2: 180, len: 0.45, wave: 'square', wob: 8 });

export const DRAKMOR = ['drachling', 'flugdrache', 'erzkaefer', 'felsadler', 'kristallwyrm', 'eisenbock', 'schwelwyrm', 'gipfelgolem', 'wyvernix', 'zackenruecken'];
