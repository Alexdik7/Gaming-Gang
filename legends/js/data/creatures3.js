// Region Ignis (Phase 3): 10 neue Kreaturen + neue Feuer-Attacken
import { SPECIES } from './creatures.js';
import { MOVES } from './moves.js';

Object.assign(MOVES, {
  lavabrocken: { name: 'Lavabrocken', type: 'feuer', cat: 'phys', pow: 75, acc: 95, pp: 15, fx: 'quake', effect: { status: 'brand', chance: 10 } },
  hitzeschild: { name: 'Hitzeschild', type: 'feuer', cat: 'status', pow: 0, acc: 100, pp: 20, fx: 'buff', effect: { stat: 'def', stages: 1, target: 'self' } },
  aschesturm: { name: 'Aschesturm', type: 'erde', cat: 'spez', pow: 70, acc: 95, pp: 15, fx: 'storm' },
});

const L = str => str.trim().split(/\s+/).map(t => { const [l, id] = t.split(':'); return [+l, id]; });
const ST = a => ({ hp: a[0], atk: a[1], def: a[2], spa: a[3], spd: a[4], spe: a[5] });
function C(id, num, name, types, rarity, stats, catchRate, xp, learn, evo, lore, model, cry) {
  SPECIES[id] = { num, name, types, rarity, stats: ST(stats), catchRate, xp, learn: L(learn), evo, lore, model, cry };
}

C('aschwurm', 46, 'Cindrill', ['feuer', 'erde'], 'gewoehnlich', [50, 55, 50, 40, 40, 45], 190, 60,
  '1:rempler 1:sandwirbel 6:glutfunke 12:steinwurf 18:lavabrocken', { to: 'magmawurm', lvl: 26 },
  'Er gräbt sich durch warme Asche und hinterlässt glühende Tunnel, die noch tagelang leuchten.',
  { kind: 'serpent', main: '#6a5a58', accent: '#ff8a3a', glow: '#ffd34a', size: 0.7 }, { f: 260, f2: 180, len: 0.3, wave: 'sawtooth', wob: 12 });
C('magmawurm', 47, 'Magmorath', ['feuer', 'erde'], 'selten', [80, 95, 80, 70, 65, 60], 60, 165,
  '1:lavabrocken 1:bodenstoss 26:magmaflut 32:felsgranate', null,
  'Wenn er sich unter einem Berg zusammenrollt, beginnt der Berg zu rauchen.',
  { kind: 'serpent', main: '#3a2a2a', accent: '#ff5a1a', glow: '#ffe07a', size: 1.2, extras: ['spikes'] }, { f: 160, f2: 90, len: 0.6, wave: 'sawtooth', wob: 6 });
C('glutling', 48, 'Blazlet', ['feuer'], 'gewoehnlich', [45, 40, 40, 55, 45, 50], 200, 55,
  '1:rempler 1:glutfunke 8:hitzeschild 14:gluthauch', { to: 'vulkanox', lvl: 24 },
  'Ein hüpfender Glutklumpen. Wer ihn streichelt, braucht danach Handschuhe – und einen neuen Ärmel.',
  { kind: 'blob', main: '#ff8a3a', accent: '#ffd34a', glow: '#fff2a0', size: 0.6 }, { f: 700, f2: 980, len: 0.18, wave: 'square', wob: 30 });
C('vulkanox', 49, 'Eruptor', ['feuer', 'erde'], 'ungewoehnlich', [80, 70, 85, 90, 75, 45], 75, 150,
  '1:gluthauch 1:hitzeschild 24:aschesturm 30:magmaflut', null,
  'Auf seinem Kopf brodelt ein kleiner Krater. Bei guter Laune spuckt er Funkenregen.',
  { kind: 'blob', main: '#c83a1a', accent: '#5a3020', glow: '#ffcf4a', size: 1.0, extras: ['crown', 'tailflame'] }, { f: 300, f2: 520, len: 0.4, wave: 'sawtooth', wob: 10 });
C('rauchfalter', 50, 'Fumalia', ['feuer', 'luft'], 'ungewoehnlich', [55, 45, 50, 75, 60, 85], 120, 90,
  '1:windstoss 1:glutfunke 10:gluthauch 16:fluegelschlag 22:feuerwirbel', null,
  'Seine Flügel bestehen aus dichtem Rauch. Er tanzt in den warmen Aufwinden über den Kratern.',
  { kind: 'moth', main: '#4a4040', accent: '#ff9a4a', glow: '#ffdd80', size: 0.8 }, { f: 1100, f2: 800, len: 0.25, wave: 'triangle', wob: 25 });
C('schlackgolem', 51, 'Schlackor', ['erde', 'feuer'], 'selten', [85, 90, 110, 45, 60, 30], 60, 160,
  '1:steinwurf 1:panzern 12:lavabrocken 20:felsgranate 28:magmaflut', null,
  'Aus abgekühlter Lava geformt. In seiner Brust glimmt ein Kern, der nie ganz erkaltet.',
  { kind: 'golem', main: '#4a3a38', accent: '#ff6a2a', glow: '#ffb04a', size: 1.1 }, { f: 120, f2: 90, len: 0.6, wave: 'square', wob: 4 });
C('funkenkaefer', 52, 'Scintillo', ['feuer', 'metall'], 'ungewoehnlich', [60, 75, 80, 45, 55, 55], 120, 95,
  '1:eisenkralle 1:glutfunke 12:flammenbiss 18:metallstoss', null,
  'Wenn er seine Panzerflügel aneinanderreibt, sprühen Funken wie von einem Schleifstein.',
  { kind: 'beetle', main: '#b84a2a', accent: '#f0c060', glow: '#fff0a0', size: 0.8 }, { f: 1500, f2: 1200, len: 0.15, wave: 'square', wob: 50 });
C('kohlenkrebs', 53, 'Vaporklaw', ['feuer', 'wasser'], 'selten', [60, 80, 90, 55, 60, 45], 75, 120,
  '1:rempler 1:wasserstrahl 9:glutfunke 15:aquahieb 21:lavabrocken', null,
  'Er lebt an heißen Quellen. Sein Panzer dampft, sobald ein Regentropfen ihn trifft.',
  { kind: 'crab', main: '#3a3436', accent: '#ff6a3a', glow: '#ffd080', size: 0.8 }, { f: 280, f2: 240, len: 0.2, wave: 'square', wob: 35 });
C('flammeule', 54, 'Infernowl', ['feuer', 'licht'], 'episch', [70, 55, 65, 95, 85, 90], 40, 180,
  '1:lichtpfeil 1:gluthauch 18:glanzschild 26:sonnenstrahl 32:magmaflut', null,
  'Man sieht sie nur in der Dämmerung über dem Vulkan. Ihr Ruf soll verirrten Wanderern den Weg zeigen.',
  { kind: 'owl', main: '#e86a2a', accent: '#ffe0a0', glow: '#fff6c0', size: 0.95, extras: ['crest'] }, { f: 600, f2: 400, len: 0.5, wave: 'sine', wob: 5 });
C('ascheohr', 55, 'Ashlop', ['feuer', 'schatten'], 'ungewoehnlich', [55, 70, 50, 60, 50, 85], 120, 95,
  '1:kratzer 1:glutfunke 10:schattenbiss 16:flammenbiss 24:albtraum', null,
  'Nachts verschmilzt sein grauer Pelz mit der Asche. Nur seine glühenden Ohrspitzen verraten ihn.',
  { kind: 'bunny', main: '#5a5056', accent: '#ff8a4a', glow: '#ffc06a', size: 0.7 }, { f: 900, f2: 1300, len: 0.2, wave: 'triangle', wob: 20 });

export const IGNIS = ['aschwurm', 'magmawurm', 'glutling', 'vulkanox', 'rauchfalter', 'schlackgolem', 'funkenkaefer', 'kohlenkrebs', 'flammeule', 'ascheohr'];
