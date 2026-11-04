// Region Solaria (Phase 4): 10 Wüsten- und Tempelkreaturen + legendärer Hüter Solarion
import { SPECIES } from './creatures.js';
import { MOVES } from './moves.js';

Object.assign(MOVES, {
  sandsturm: { name: 'Sandsturm', type: 'erde', cat: 'spez', pow: 80, acc: 90, pp: 10, fx: 'storm' },
  lichtklinge: { name: 'Lichtklinge', type: 'licht', cat: 'phys', pow: 80, acc: 100, pp: 15, fx: 'slash' },
  fatamorgana: { name: 'Fata Morgana', type: 'magie', cat: 'status', pow: 0, acc: 100, pp: 15, fx: 'cloud', effect: { stat: 'acc', stages: -1, target: 'foe' } },
});

const L = str => str.trim().split(/\s+/).map(t => { const [l, id] = t.split(':'); return [+l, id]; });
const ST = a => ({ hp: a[0], atk: a[1], def: a[2], spa: a[3], spd: a[4], spe: a[5] });
function C(id, num, name, types, rarity, stats, catchRate, xp, learn, evo, lore, model, cry, extra = {}) {
  SPECIES[id] = { num, name, types, rarity, stats: ST(stats), catchRate, xp, learn: L(learn), evo, lore, model, cry, ...extra };
}

C('sandechse', 87, 'Sandflitz', ['erde'], 'gewoehnlich', [55, 65, 55, 40, 45, 70], 160, 75,
  '1:kratzer 1:sandwirbel 10:steinwurf 18:bodenstoss', { to: 'duenenwaran', lvl: 38 },
  'Sie badet morgens in der Sonne und gräbt sich mittags in den kühlen Sand.',
  { kind: 'lizard', main: '#e0b870', accent: '#f8e8c0', glow: '#ffd060', size: 0.75 }, { f: 500, f2: 380, len: 0.2, wave: 'square', wob: 20 });
C('duenenwaran', 88, 'Dünodrak', ['erde', 'drache'], 'selten', [85, 105, 85, 65, 70, 80], 45, 180,
  '1:bodenstoss 1:drachenklaue 38:sandsturm 44:felsgranate', null,
  'Er wacht über die großen Dünen. Wenn er brüllt, rutscht der Sand ganzer Hänge ab.',
  { kind: 'lizard', main: '#c88a48', accent: '#f0d8a0', glow: '#ffb040', size: 1.2, extras: ['spikes', 'horns'] }, { f: 260, f2: 160, len: 0.5, wave: 'sawtooth', wob: 6 });
C('sonnenkaefer', 89, 'Solarab', ['licht', 'erde'], 'ungewoehnlich', [65, 75, 85, 60, 70, 55], 100, 120,
  '1:lichtpfeil 1:steinwurf 16:glanzschild 24:lichtklinge', null,
  'Er rollt eine kleine Kugel aus Sonnenlicht vor sich her. Man sagt, sie gehe nie aus.',
  { kind: 'beetle', main: '#3a8a8a', accent: '#f8d860', glow: '#fff8a0', size: 0.8, extras: ['gem'] }, { f: 1300, f2: 1000, len: 0.2, wave: 'square', wob: 35 });
C('kaktling', 90, 'Pieksi', ['pflanze', 'erde'], 'gewoehnlich', [60, 55, 70, 50, 60, 35], 160, 70,
  '1:rankenhieb 1:panzern 12:steinwurf 18:dornenwall', { to: 'kaktoroc', lvl: 36 },
  'Er steht so still, dass Wanderer ihren Hut an ihn hängen. Das findet er gar nicht lustig.',
  { kind: 'sprout', main: '#5aa850', accent: '#f8e0a0', glow: '#f888c0', stage: 1, size: 0.7 }, { f: 700, f2: 500, len: 0.3, wave: 'triangle', wob: 12 });
C('kaktoroc', 91, 'Stachelok', ['pflanze', 'erde'], 'selten', [95, 95, 105, 60, 80, 40], 45, 175,
  '1:dornenwall 1:bodenstoss 36:sandsturm 42:urwaldzorn', null,
  'Ein wandelnder Riesenkaktus. In seinen Armen finden Vögel Schatten und Wasser.',
  { kind: 'sprout', main: '#3a8a40', accent: '#c8a870', glow: '#ff78b0', stage: 2, size: 1.3, extras: ['spikes'] }, { f: 300, f2: 220, len: 0.5, wave: 'triangle', wob: 6 });
C('duenenwurm', 92, 'Sandwühl', ['erde'], 'ungewoehnlich', [90, 85, 75, 50, 60, 50], 100, 125,
  '1:rempler 1:sandwirbel 14:bodenstoss 22:sandsturm 30:felsgranate', null,
  'Man sieht nur die Wellen, die er unter dem Sand schlägt – bis er plötzlich auftaucht.',
  { kind: 'serpent', main: '#d8a868', accent: '#8a5a38', glow: '#ffe0a0', size: 1.0 }, { f: 140, f2: 100, len: 0.6, wave: 'sawtooth', wob: 4 });
C('fatamor', 93, 'Fatamor', ['magie', 'licht'], 'selten', [65, 40, 65, 100, 95, 90], 45, 170,
  '1:funkelstaub 1:fatamorgana 20:lichtpfeil 28:mondstrahl 34:sonnenstrahl', null,
  'Es zeigt Verdurstenden eine Oase – und führt sie, wenn sie freundlich sind, tatsächlich hin.',
  { kind: 'wisp', main: '#f8c8e8', accent: '#88d8f8', glow: '#ffffff', size: 0.85, extras: ['aura'] }, { f: 1200, f2: 1800, len: 0.6, wave: 'sine', wob: 4 });
C('sonnfalke', 94, 'Solfalk', ['feuer', 'licht'], 'selten', [75, 95, 65, 75, 65, 105], 45, 175,
  '1:sturzflug 1:gluthauch 20:lichtklinge 28:sonnenstrahl 34:magmaflut', null,
  'Er fliegt so hoch, dass er im Sonnenlicht verschwindet. Sein Schrei kündigt Mittagshitze an.',
  { kind: 'bird', main: '#f0a030', accent: '#f8f0c0', glow: '#ff6a2a', size: 0.95, extras: ['crest'] }, { f: 1700, f2: 1100, len: 0.35, wave: 'sawtooth', wob: 15 });
C('tempelgolem', 95, 'Templith', ['metall', 'licht'], 'selten', [95, 100, 125, 55, 85, 30], 45, 180,
  '1:metallstoss 1:glanzschild 24:lichtklinge 32:stahlwirbel', null,
  'Seit tausend Jahren bewacht er dieselbe Tür. Niemand weiß mehr, was dahinter liegt.',
  { kind: 'golem', main: '#c8a858', accent: '#f0e8c8', glow: '#88f8f8', size: 1.15, extras: ['gem'] }, { f: 110, f2: 90, len: 0.7, wave: 'square', wob: 3 });
C('sandspringer', 96, 'Dünhopser', ['erde', 'normal'], 'gewoehnlich', [50, 60, 45, 40, 45, 90], 180, 65,
  '1:sprungtritt 1:sandwirbel 10:steinwurf 18:sturzflug', null,
  'Mit seinen langen Ohren hört er Wasser unter dem Sand. Folge ihm, und du verdurstest nie.',
  { kind: 'bunny', main: '#e8c890', accent: '#f8f0e0', glow: '#ffd070', size: 0.6 }, { f: 1400, f2: 1800, len: 0.15, wave: 'square', wob: 40 });
C('solarion', 97, 'Solarion', ['licht', 'feuer'], 'legendaer', [100, 110, 90, 125, 100, 105], 4, 290,
  '1:sonnenstrahl 1:lichtklinge 1:magmaflut 1:glanzschild', null,
  'Hüter von Solaria. Seine Schwingen tragen die Mittagssonne. Wo es landet, wächst die Wüste zur Oase.',
  { kind: 'bird', main: '#fff4c8', accent: '#f89a28', glow: '#ff4a1a', size: 1.9, extras: ['crest', 'wings', 'aura', 'gem'] }, { f: 900, f2: 1600, len: 0.9, wave: 'sawtooth', wob: 4 }, { legendary: true });

export const SOLARIA = ['sandechse', 'duenenwaran', 'sonnenkaefer', 'kaktling', 'kaktoroc', 'duenenwurm', 'fatamor', 'sonnfalke', 'tempelgolem', 'sandspringer', 'solarion'];
