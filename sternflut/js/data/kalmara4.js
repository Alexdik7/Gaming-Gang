// Kalmara-Archipel, Teil 4 (Nr. 96–110): Glutinsel, Sturmspitze, Kronfels + die drei Wächter des Archipels
import { C } from './creatures.js';
import { MOVES } from './moves.js';

Object.assign(MOVES, {
  lavawelle:     { name: 'Lavawelle',      type: 'feuer',    cat: 'spez', pow: 95, acc: 95, pp: 10, fx: 'storm', effect: { status: 'brand', chance: 20 } },
  basaltfaust:   { name: 'Basaltfaust',    type: 'erde',     cat: 'phys', pow: 90, acc: 95, pp: 10, fx: 'quake' },
  falkenglut:    { name: 'Falkenglut',     type: 'feuer',    cat: 'phys', pow: 90, acc: 100, pp: 10, fx: 'dash' },
  himmelsriss:   { name: 'Himmelsriss',    type: 'luft',     cat: 'spez', pow: 100, acc: 90, pp: 5, fx: 'storm' },
  wolkenbett:    { name: 'Wolkenbett',     type: 'luft',     cat: 'status', pow: 0, acc: 100, pp: 10, fx: 'heal', effect: { heal: 0.5 } },
  drachentanz:   { name: 'Drachentanz',    type: 'drache',   cat: 'status', pow: 0, acc: 100, pp: 15, fx: 'buff', effect: { stat: 'atk', stages: 2, target: 'self' } },
  kronenbiss:    { name: 'Kronenbiss',     type: 'drache',   cat: 'phys', pow: 100, acc: 90, pp: 10, fx: 'bite' },
  juwelstrahl:   { name: 'Juwelstrahl',    type: 'magie',    cat: 'spez', pow: 90, acc: 100, pp: 10, fx: 'beam' },
  urfeuer:       { name: 'Urfeuer',        type: 'feuer',    cat: 'spez', pow: 120, acc: 90, pp: 5, fx: 'storm', effect: { status: 'brand', chance: 30 } },
  zephyrschwinge:{ name: 'Zephyrschwinge', type: 'luft',     cat: 'spez', pow: 120, acc: 90, pp: 5, fx: 'storm', effect: { stat: 'spe', stages: 1, target: 'self' } },
  kronenschlag:  { name: 'Kronenschlag',   type: 'drache',   cat: 'phys', pow: 120, acc: 90, pp: 5, fx: 'quake' },
});
const cry = (f, f2, len, wave, wob) => ({ f, f2, len, wave, wob });

C('aschling', 96, 'Aschling', ['feuer', 'erde'], 'gewoehnlich', [55, 65, 70, 45, 50, 35], 180, 64,
  '1:rempler 4:glutfunke 9:steinwurf 15:flammenbiss 21:sandsturz 28:basaltfaust', { to: 'magmator', lvl: 38 },
  'Ein Steinchen aus erkalteter Lava, das innen noch glüht. Es schläft am liebsten in heißer Asche.',
  { kind: 'golem', main: '#5a4a48', accent: '#ff7a3a', glow: '#ffd040', size: 0.6 }, cry(300, 400, 0.2, 'square', 10));
C('magmator', 97, 'Magmator', ['feuer', 'erde'], 'selten', [95, 115, 105, 70, 75, 45], 60, 190,
  '1:basaltfaust 1:lavawelle 38:felsgranate 46:magmaflut 54:bodenstoss', null,
  'Wenn Magmator wütend wird, quillt Lava aus den Rissen in seiner Haut. Er schützt die Dörfer am Vulkan.',
  { kind: 'golem', main: '#3a2a2a', accent: '#ff5a1a', glow: '#ffe060', size: 1.3, extras: ['spikes', 'crown'] }, cry(150, 220, 0.6, 'sawtooth', 6));
C('lavaschleim', 98, 'Lavaschleim', ['feuer'], 'ungewoehnlich', [80, 50, 60, 85, 75, 35], 120, 120,
  '1:glutfunke 6:panzern 12:gluthauch 20:lavawelle 30:magmaflut', null,
  'Ein Klumpen flüssiger Lava mit Augen. Er ist freundlich – aber umarmen sollte man ihn nicht.',
  { kind: 'blob', main: '#ff6a2a', accent: '#ffd040', glow: '#fff080', size: 0.8 }, cry(400, 300, 0.4, 'sine', 16));
C('glutfalke', 99, 'Glutfalke', ['feuer', 'luft'], 'selten', [75, 100, 65, 80, 65, 105], 45, 175,
  '1:glutfunke 1:sturzflug 15:falkenglut 30:glutsturm 40:orkan', null,
  'Er jagt über den Lavaseen der Glutinsel. Seine Federn sind so heiß, dass Regentropfen verdampfen, bevor sie ihn berühren.',
  { kind: 'bird', main: '#e84a2a', accent: '#f8d060', glow: '#ffef80', size: 1.1, extras: ['tailflame', 'crest'] }, cry(1200, 1700, 0.3, 'sawtooth', 14));
C('windfink', 100, 'Windfink', ['luft'], 'gewoehnlich', [45, 55, 40, 45, 40, 75], 200, 58,
  '1:windstoss 4:kreischer 9:kreiselboe 15:salzwind 22:sturzflug', { to: 'orkanadler', lvl: 36 },
  'Ein kleiner Bergvogel, der sich von Aufwinden tragen lässt, ohne einmal mit den Flügeln zu schlagen.',
  { kind: 'bird', main: '#a8d8f0', accent: '#f8f8ff', glow: '#f8d040', size: 0.55 }, cry(1800, 2200, 0.15, 'square', 26));
C('orkanadler', 101, 'Orkanadler', ['luft'], 'selten', [85, 105, 80, 70, 75, 105], 60, 185,
  '1:sturzflug 1:kreiselboe 36:himmelsriss 44:orkan 52:fliegen', null,
  'Er baut sein Nest im Auge des Sturms. Bergsteiger, die ihn sehen, kehren sofort um – zu Recht.',
  { kind: 'bird', main: '#6a8ac8', accent: '#f0f4ff', glow: '#ffe060', size: 1.25, extras: ['crest', 'wings'] }, cry(900, 1500, 0.4, 'sawtooth', 10));
C('wolkli', 102, 'Wolkli', ['luft', 'magie'], 'gewoehnlich', [60, 35, 50, 55, 65, 50], 190, 60,
  '1:windstoss 5:funkelstaub 10:wolkenbett 16:salzwind 23:sternsplitter', { to: 'nimbora', lvl: 36 },
  'Ein Wölkchen, das gern auf Bergspitzen sitzt. Wenn es traurig ist, regnet es ein bisschen.',
  { kind: 'blob', main: '#f0f4ff', accent: '#a8c8f8', glow: '#ffd8f8', size: 0.6 }, cry(1300, 1600, 0.3, 'sine', 20));
C('nimbora', 103, 'Nimbora', ['luft', 'magie'], 'selten', [100, 55, 80, 100, 105, 70], 60, 185,
  '1:wolkenbett 1:sternsplitter 36:himmelsriss 44:mondlicht 52:donnerflug', null,
  'Sie trägt ganze Gewitter in sich. Bauern auf Sturmspitze bitten sie um Regen – und bekommen manchmal Blitze.',
  { kind: 'wisp', main: '#d8e0f8', accent: '#8890d8', glow: '#ffff90', size: 1.2, extras: ['aura', 'crown'] }, cry(700, 1100, 0.5, 'sine', 12));
C('drakling', 104, 'Drakling', ['drache'], 'selten', [50, 70, 50, 45, 50, 55], 45, 70,
  '1:kratzer 1:knurren 7:drachenodem 15:schattenbiss 24:drachenklaue 33:drachentanz', { to: 'schuppenwyrm', lvl: 36 },
  'Ein Drachenjunges, das auf den Klippen von Kronfels schlüpft. Es beißt in alles – auch in Felsen.',
  { kind: 'lizard', main: '#6a5ad8', accent: '#f8e0a0', glow: '#ff8a5a', stage: 1, size: 0.6, extras: ['horns'] }, cry(900, 1200, 0.25, 'sawtooth', 16));
C('schuppenwyrm', 105, 'Schuppenwyrm', ['drache'], 'episch', [75, 100, 80, 65, 70, 75], 45, 160,
  '1:drachenklaue 1:drachentanz 36:kronenbiss 44:felsgranate', { to: 'kronwyrm', lvl: 50 },
  'Seine Schuppen sind so hart wie Stahl. Er wächst langsam – aber er hört nie auf zu wachsen.',
  { kind: 'serpent', main: '#5a4ab8', accent: '#e8d8a0', glow: '#ff7a4a', size: 1.0, extras: ['horns', 'spikes'] }, cry(500, 800, 0.4, 'sawtooth', 10));
C('kronwyrm', 106, 'Kronwyrm', ['drache', 'metall'], 'episch', [100, 130, 110, 90, 90, 80], 45, 270,
  '1:kronenbiss 1:metallstoss 50:drachentanz 58:kronenschlag 66:stahlwirbel', null,
  'Der König der Drachen von Kronfels. Auf seinem Kopf wächst eine Krone aus Erz – je älter er wird, desto prächtiger.',
  { kind: 'serpent', main: '#3a3a98', accent: '#d8c070', glow: '#ff6a3a', size: 1.45, extras: ['crown', 'spikes', 'wings'] }, cry(220, 600, 0.7, 'sawtooth', 6));
C('juwelwyrm', 107, 'Juwelwyrm', ['drache', 'magie'], 'episch', [80, 85, 90, 110, 100, 85], 30, 220,
  '1:drachenodem 1:funkelstaub 20:juwelstrahl 35:drachenklaue 45:sternsplitter 55:kronenbiss', null,
  'Ein seltener Drache, dessen Schuppen Edelsteine sind. Er erscheint nur in klaren Nächten auf den höchsten Gipfeln.',
  { kind: 'lizard', main: '#d878c8', accent: '#88f0f8', glow: '#ffffff', stage: 2, size: 1.15, extras: ['gem', 'wings', 'aura'] }, cry(1200, 1800, 0.45, 'sine', 12));

// ---------------------------------------------------------------- Die drei Wächter des Archipels
C('ignivar', 108, 'Ignivar', ['feuer', 'erde'], 'legendaer', [100, 125, 100, 120, 90, 95], 3, 300,
  '1:urfeuer 1:basaltfaust 1:lavawelle 1:drachentanz', null,
  'Der Wächter der Glut. Er schläft im Herzen des Vulkans, und jedes Beben ist ein Atemzug von ihm.',
  { kind: 'bird', main: '#c83a1a', accent: '#3a2a2a', glow: '#ffe040', size: 1.45, extras: ['tailflame', 'crown', 'wings'] }, cry(260, 700, 0.9, 'sawtooth', 5), { legendary: true });
C('zephyra', 109, 'Zephyra', ['luft', 'magie'], 'legendaer', [95, 90, 95, 130, 110, 120], 3, 300,
  '1:zephyrschwinge 1:sternsplitter 1:wolkenbett 1:himmelsriss', null,
  'Die Wächterin der Winde. Wo sie fliegt, ordnen sich die Wolken zu Spiralen. Sie hat das Lied der Gezeiten als Erste gesungen.',
  { kind: 'moth', main: '#e8f4ff', accent: '#9ab8f8', glow: '#fff4b0', size: 1.4, extras: ['aura', 'crown'] }, cry(1100, 1900, 0.9, 'sine', 8), { legendary: true });
C('kronar', 110, 'Kronar', ['drache', 'metall'], 'legendaer', [110, 130, 125, 100, 100, 85], 3, 320,
  '1:kronenschlag 1:metallstoss 1:drachentanz 1:kronenbiss', null,
  'Der Wächter des Tors. Er schlief tausend Jahre unter Kronfels, bis Admiral Brann ihn bat, das Tor zu versiegeln.',
  { kind: 'serpent', main: '#2a2a5a', accent: '#e8c860', glow: '#a8f8ff', size: 1.5, extras: ['crown', 'horns', 'wings', 'aura'] }, cry(180, 500, 1.0, 'sawtooth', 4), { legendary: true });

export const KALMARA4 = ['aschling', 'magmator', 'lavaschleim', 'glutfalke', 'windfink', 'orkanadler', 'wolkli', 'nimbora', 'drakling', 'schuppenwyrm', 'kronwyrm', 'juwelwyrm', 'ignivar', 'zephyra', 'kronar'];
