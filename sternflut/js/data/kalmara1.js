// Kalmara-Archipel, Teil 1 (Nr. 1–45): Starter, Küste, Dünen, Wälder rund um Muschelbucht und Ankerbrück
import { C } from './creatures.js';
import { MOVES } from './moves.js';

// Neue Attacken von Sternflut (fx: dash slash quake storm beam bolt bite zap cloud heal buff roar)
Object.assign(MOVES, {
  zunderklaue:   { name: 'Zunderklaue',    type: 'feuer',    cat: 'phys', pow: 50, acc: 100, pp: 25, fx: 'slash', effect: { status: 'brand', chance: 10 } },
  aschefaust:    { name: 'Aschefaust',     type: 'feuer',    cat: 'phys', pow: 75, acc: 100, pp: 15, fx: 'dash' },
  glutsturm:     { name: 'Glutsturm',      type: 'feuer',    cat: 'spez', pow: 90, acc: 95, pp: 10, fx: 'storm', effect: { status: 'brand', chance: 20 } },
  drachenvulkan: { name: 'Drachenvulkan',  type: 'feuer',    cat: 'spez', pow: 110, acc: 90, pp: 5, fx: 'quake', effect: { status: 'brand', chance: 30 } },
  gischtstoss:   { name: 'Gischtstoß',     type: 'wasser',   cat: 'phys', pow: 45, acc: 100, pp: 25, fx: 'dash' },
  gezeitenschlag:{ name: 'Gezeitenschlag', type: 'wasser',   cat: 'phys', pow: 75, acc: 100, pp: 15, fx: 'slash' },
  brandungsklinge:{ name: 'Brandungsklinge', type: 'wasser', cat: 'phys', pow: 90, acc: 95, pp: 10, fx: 'slash' },
  mahlstrom:     { name: 'Mahlstrom',      type: 'wasser',   cat: 'spez', pow: 110, acc: 90, pp: 5, fx: 'storm', effect: { stat: 'spe', stages: -1, target: 'foe' } },
  perlenhagel:   { name: 'Perlenhagel',    type: 'wasser',   cat: 'spez', pow: 55, acc: 100, pp: 20, fx: 'bolt' },
  mooskeim:      { name: 'Mooskeim',       type: 'pflanze',  cat: 'spez', pow: 45, acc: 100, pp: 25, fx: 'bolt' },
  wurzelpeitsche:{ name: 'Wurzelpeitsche', type: 'pflanze',  cat: 'phys', pow: 70, acc: 100, pp: 15, fx: 'slash' },
  waldesatem:    { name: 'Waldesatem',     type: 'pflanze',  cat: 'status', pow: 0, acc: 100, pp: 10, fx: 'heal', effect: { heal: 0.5 } },
  kronenzorn:    { name: 'Kronenzorn',     type: 'pflanze',  cat: 'phys', pow: 110, acc: 90, pp: 5, fx: 'quake', effect: { stat: 'def', stages: -1, target: 'foe' } },
  salzwind:      { name: 'Salzwind',       type: 'luft',     cat: 'spez', pow: 50, acc: 100, pp: 25, fx: 'storm', effect: { stat: 'acc', stages: -1, target: 'foe' } },
  kreiselboe:    { name: 'Kreiselböe',     type: 'luft',     cat: 'phys', pow: 65, acc: 100, pp: 15, fx: 'dash' },
  sternsplitter: { name: 'Sternsplitter',  type: 'magie',    cat: 'spez', pow: 65, acc: 100, pp: 15, fx: 'bolt' },
  sandsturz:     { name: 'Sandsturz',      type: 'erde',     cat: 'phys', pow: 65, acc: 95, pp: 15, fx: 'quake' },
  funkenkette:   { name: 'Funkenkette',    type: 'elektro',  cat: 'spez', pow: 60, acc: 100, pp: 20, fx: 'zap', effect: { status: 'starre', chance: 20 } },
  irrflamme:     { name: 'Irrflamme',      type: 'geist',    cat: 'spez', pow: 65, acc: 100, pp: 15, fx: 'bolt', effect: { status: 'brand', chance: 15 } },
  scherenschnitt:{ name: 'Scherenschnitt', type: 'metall',   cat: 'phys', pow: 70, acc: 100, pp: 15, fx: 'slash' },
  nesselschock:  { name: 'Nesselschock',   type: 'elektro',  cat: 'phys', pow: 50, acc: 100, pp: 20, fx: 'zap', effect: { status: 'starre', chance: 30 } },
  mondschleier:  { name: 'Mondschleier',   type: 'schatten', cat: 'spez', pow: 70, acc: 100, pp: 15, fx: 'cloud' },
  echoschrei:    { name: 'Echoschrei',     type: 'luft',     cat: 'spez', pow: 60, acc: 100, pp: 15, fx: 'roar' },
  panzerwalze:   { name: 'Panzerwalze',    type: 'erde',     cat: 'phys', pow: 85, acc: 90, pp: 10, fx: 'dash' },
  sporentanz:    { name: 'Sporentanz',     type: 'gift',     cat: 'spez', pow: 60, acc: 100, pp: 15, fx: 'cloud', effect: { status: 'gift', chance: 30 } },
  lichtschwinge: { name: 'Lichtschwinge',  type: 'licht',    cat: 'phys', pow: 70, acc: 100, pp: 15, fx: 'dash' },
  hoffnungslied: { name: 'Hoffnungslied',  type: 'licht',    cat: 'status', pow: 0, acc: 100, pp: 10, fx: 'buff', effect: { stat: 'spa', stages: 2, target: 'self' } },
  muschelwall:   { name: 'Muschelwall',    type: 'wasser',   cat: 'status', pow: 0, acc: 100, pp: 15, fx: 'buff', effect: { stat: 'def', stages: 2, target: 'self' } },
});

const cry = (f, f2, len, wave, wob) => ({ f, f2, len, wave, wob });

// ---------------------------------------------------------------- Starter
C('zundrak', 1, 'Zundrak', ['feuer'], 'selten', [39, 58, 42, 55, 45, 66], 45, 62,
  '1:kratzer 1:knurren 5:glutfunke 9:zunderklaue 14:gluthauch 19:flammenbiss', { to: 'pyroskar', lvl: 16 },
  'Ein Echsenjunges, das in der Glut alter Lagerfeuer schläft. Sein Schwanz brennt heller, wenn es sich freut.',
  { kind: 'lizard', main: '#ff7b3a', accent: '#ffe0a8', glow: '#ffd04a', stage: 1, size: 0.7, extras: ['tailflame'] }, cry(640, 900, 0.26, 'square', 12));
C('pyroskar', 2, 'Pyroskar', ['feuer'], 'episch', [58, 80, 60, 72, 60, 82], 45, 142,
  '1:zunderklaue 1:gluthauch 16:aschefaust 22:feuerwirbel 28:drachenklaue 34:glutsturm', { to: 'vulkadras', lvl: 34 },
  'Auf seinem Rücken glühen Narben wie Lavaadern. Seeleute erzählen, es habe einst ein brennendes Schiff allein an Land geschoben.',
  { kind: 'lizard', main: '#e8502a', accent: '#ffd28a', glow: '#ff9a3a', stage: 2, size: 1.0, extras: ['tailflame', 'crest'] }, cry(520, 960, 0.36, 'sawtooth', 9));
C('vulkadras', 3, 'Vulkadras', ['feuer', 'drache'], 'episch', [78, 104, 80, 100, 80, 98], 45, 240,
  '1:aschefaust 1:drachenklaue 34:drachenvulkan 42:glutsturm 50:drachenodem 58:magmaflut', null,
  'Wenn Vulkadras brüllt, steigen Funken bis in die Wolken. Es heißt, sein Herz sei aus dem Kern eines Vulkans geboren.',
  { kind: 'lizard', main: '#c8321e', accent: '#ffc66a', glow: '#ffef7a', stage: 2, size: 1.35, extras: ['tailflame', 'wings', 'horns'] }, cry(300, 880, 0.55, 'sawtooth', 6));
C('tidolin', 4, 'Tidolin', ['wasser'], 'selten', [44, 48, 50, 56, 52, 52], 45, 62,
  '1:rempler 1:knurren 5:wasserstrahl 9:gischtstoss 14:perlenhagel 19:blasenwirbel', { to: 'kaskadon', lvl: 16 },
  'Ein Schwanzlurch, der mit der Flut kommt und mit der Ebbe geht. Seine Kiemen singen leise, wenn ein Sturm naht.',
  { kind: 'axolotl', main: '#4ab8ff', accent: '#bff0ff', glow: '#7affea', stage: 1, size: 0.7 }, cry(820, 600, 0.28, 'triangle', 14));
C('kaskadon', 5, 'Kaskadon', ['wasser'], 'episch', [64, 66, 70, 76, 70, 66], 45, 142,
  '1:gischtstoss 1:perlenhagel 16:gezeitenschlag 22:muschelwall 28:flutwelle 34:brandungsklinge', { to: 'maelstrax', lvl: 34 },
  'Seine Kiemenfedern wachsen zu Fächern, mit denen es Wellen lenkt. Fischer folgen ihm, weil es immer die ruhigste Strömung findet.',
  { kind: 'axolotl', main: '#2a8ae8', accent: '#a8e8ff', glow: '#5affd8', stage: 2, size: 1.0, extras: ['fins'] }, cry(700, 520, 0.38, 'triangle', 10));
C('maelstrax', 6, 'Maelstrax', ['wasser', 'drache'], 'episch', [90, 92, 90, 102, 90, 84], 45, 240,
  '1:brandungsklinge 1:drachenodem 34:mahlstrom 42:flutwelle 50:drachenklaue 58:surfer', null,
  'Ein Seedrache, der ganze Strudel um sich kreisen lässt. In alten Seekarten ist dort, wo er lebt, nur ein Auge gezeichnet.',
  { kind: 'serpent', main: '#1e6ad0', accent: '#8ae0ff', glow: '#4affe0', stage: 2, size: 1.35, extras: ['fins', 'horns'] }, cry(260, 540, 0.6, 'sawtooth', 7));
C('moospip', 7, 'Moospip', ['pflanze'], 'selten', [45, 52, 54, 48, 54, 47], 45, 62,
  '1:rempler 1:knurren 5:mooskeim 9:rankenhieb 14:waldesatem 19:blattsturm', { to: 'rankora', lvl: 16 },
  'Auf seinem Kopf wächst ein Moospolster, in dem winzige Blüten nisten. Es schläft am liebsten in Baumhöhlen.',
  { kind: 'sprout', main: '#5cc85a', accent: '#d8f0a0', glow: '#f8f070', stage: 1, size: 0.7, extras: ['leaf'] }, cry(900, 1100, 0.24, 'triangle', 18));
C('rankora', 8, 'Rankora', ['pflanze'], 'episch', [65, 74, 74, 62, 70, 60], 45, 142,
  '1:rankenhieb 1:waldesatem 16:wurzelpeitsche 22:panzern 28:dornenwall 34:blattsturm', { to: 'sylvatan', lvl: 34 },
  'Mit seinen Ranken klettert es auf die höchsten Bäume, um nach Schiffen Ausschau zu halten. Es vergisst nie ein Gesicht.',
  { kind: 'stag', main: '#3fa846', accent: '#c8e890', glow: '#f0e060', stage: 1, size: 1.0, extras: ['leaf'] }, cry(600, 820, 0.36, 'square', 10));
C('sylvatan', 9, 'Sylvatan', ['pflanze', 'erde'], 'episch', [95, 104, 100, 80, 90, 66], 45, 240,
  '1:wurzelpeitsche 1:bodenstoss 34:kronenzorn 42:dornenwall 50:felsgranate 58:urwaldzorn', null,
  'Auf seinem Geweih wächst ein ganzer Wald. Wo Sylvatan ruht, entsteht nach hundert Jahren eine Insel.',
  { kind: 'stag', main: '#2e8a3a', accent: '#b8a070', glow: '#f8e070', stage: 2, size: 1.35, extras: ['leaf', 'horns', 'crown'] }, cry(240, 420, 0.6, 'square', 5));

// ---------------------------------------------------------------- Küste, Dünen, Wiesen
C('brisel', 10, 'Brisel', ['normal', 'luft'], 'gewoehnlich', [40, 45, 38, 35, 35, 58], 255, 50,
  '1:rempler 3:windstoss 7:kreischer 12:salzwind 18:kreiselboe', { to: 'boebrisel', lvl: 14 },
  'Eine kleine Seeschwalbe, die im Schwarm über die Wellen tanzt. Sie stiehlt gern glänzende Muscheln.',
  { kind: 'bird', main: '#e8eef4', accent: '#3a4a6a', glow: '#f8b030', size: 0.6 }, cry(1500, 1900, 0.18, 'square', 22));
C('boebrisel', 11, 'Böbrisel', ['normal', 'luft'], 'ungewoehnlich', [60, 66, 55, 50, 52, 80], 120, 110,
  '1:windstoss 1:salzwind 14:kreiselboe 22:fluegelschlag 30:sturzflug', { to: 'zyklorn', lvl: 30 },
  'Es reitet auf Sturmböen und warnt Seeleute mit schrillem Ruf vor Unwettern.',
  { kind: 'bird', main: '#d0dcea', accent: '#2a3a5a', glow: '#f8a020', size: 0.9, extras: ['crest'] }, cry(1200, 1600, 0.26, 'square', 16));
C('zyklorn', 12, 'Zyklorn', ['luft'], 'selten', [78, 92, 72, 70, 70, 102], 45, 200,
  '1:kreiselboe 1:sturzflug 30:orkan 38:fliegen', null,
  'Wenn Zyklorn mit den Flügeln schlägt, drehen sich Windräder auf drei Inseln. Es nistet nur auf Leuchttürmen.',
  { kind: 'bird', main: '#5a7ab8', accent: '#e8f0f8', glow: '#ffd040', size: 1.2, extras: ['crest', 'wings'] }, cry(900, 1400, 0.34, 'sawtooth', 10));
C('hoppsand', 13, 'Hoppsand', ['normal'], 'gewoehnlich', [45, 50, 40, 30, 40, 60], 255, 50,
  '1:rempler 4:knurren 8:sprungtritt 13:sandwirbel 19:zerschneider', { to: 'dunaro', lvl: 18 },
  'Ein Dünenhase mit riesigen Ohren, die jedes Knirschen im Sand hören.',
  { kind: 'bunny', main: '#e8d0a0', accent: '#fff4e0', glow: '#f8a8a8', size: 0.6 }, cry(1300, 1500, 0.15, 'square', 20));
C('dunaro', 14, 'Dunaro', ['normal', 'erde'], 'ungewoehnlich', [72, 82, 62, 45, 58, 88], 120, 120,
  '1:sprungtritt 1:sandwirbel 18:sandsturz 26:bodenstoss 34:zerschneider', null,
  'Mit einem einzigen Sprung überquert es eine ganze Düne. Seine Spuren verwehen nie ganz.',
  { kind: 'bunny', main: '#c8a060', accent: '#f8e8c8', glow: '#e88050', size: 1.0, extras: ['ears'] }, cry(1000, 1250, 0.22, 'square', 14));
C('kneifling', 15, 'Kneifling', ['wasser'], 'gewoehnlich', [40, 62, 65, 30, 35, 40], 200, 55,
  '1:kratzer 5:gischtstoss 10:panzern 15:scherenschnitt 21:aquahieb', { to: 'scherator', lvl: 22 },
  'Eine Strandkrabbe, die alles kneift, was glänzt. Ihre Schere ist stärker als sie aussieht.',
  { kind: 'crab', main: '#f06848', accent: '#ffd8b0', glow: '#ffffff', size: 0.6 }, cry(900, 700, 0.14, 'square', 24));
C('scherator', 16, 'Scherator', ['wasser', 'metall'], 'selten', [65, 102, 110, 45, 60, 52], 75, 150,
  '1:scherenschnitt 1:aquahieb 22:metallstoss 30:brandungsklinge 38:eisenkralle', null,
  'Seine Scheren sind hart wie Ankereisen. Es hat schon Ketten von Piratenschiffen durchtrennt.',
  { kind: 'crab', main: '#b84a3a', accent: '#c8d0d8', glow: '#ffffff', size: 1.05, extras: ['spikes'] }, cry(600, 480, 0.26, 'sawtooth', 12));
C('quallux', 17, 'Quallux', ['wasser', 'elektro'], 'ungewoehnlich', [45, 35, 40, 62, 60, 55], 150, 65,
  '1:wasserstrahl 4:funkenschlag 9:nesselschock 15:perlenhagel 21:funkenkette', { to: 'medusprak', lvl: 26 },
  'Nachts leuchten ganze Buchten blau, wenn Quallux in Scharen treiben. Wer sie berührt, kribbelt stundenlang.',
  { kind: 'blob', main: '#8ad8ff', accent: '#f0a8ff', glow: '#f8f870', size: 0.6, extras: ['gem'] }, cry(1400, 1000, 0.3, 'sine', 30));
C('medusprak', 18, 'Medusprak', ['wasser', 'elektro'], 'selten', [70, 50, 62, 96, 90, 80], 60, 165,
  '1:nesselschock 1:funkenkette 26:blitzschlag 34:flutwelle 42:donnerflug', null,
  'Ihre Tentakel speichern die Energie von hundert Gewittern. Bei Sturm steigt sie an die Oberfläche, um zu tanken.',
  { kind: 'wisp', main: '#6ab0ff', accent: '#e890ff', glow: '#ffff80', size: 1.1, extras: ['aura'] }, cry(1100, 700, 0.42, 'sine', 24));
C('chitrix', 19, 'Chitrix', ['pflanze'], 'gewoehnlich', [42, 50, 55, 30, 40, 42], 230, 52,
  '1:rempler 4:rankenhieb 8:panzern 13:mooskeim 19:wurzelpeitsche', { to: 'ruestkor', lvl: 20 },
  'Ein Käfer mit einem Panzer aus gepresstem Laub. Er rollt sich bei Gefahr zu einer Kugel.',
  { kind: 'beetle', main: '#6ab848', accent: '#e8e070', glow: '#ffffff', size: 0.55 }, cry(1600, 1400, 0.12, 'square', 30));
C('ruestkor', 20, 'Rüstkor', ['pflanze', 'metall'], 'selten', [68, 88, 108, 42, 70, 50], 75, 150,
  '1:wurzelpeitsche 1:eisenkralle 20:metallstoss 28:dornenwall 36:stahlwirbel', null,
  'Sein Laubpanzer ist mit Eisen aus dem Boden durchwachsen. Ritter der alten Inseln trugen ihn als Wappen.',
  { kind: 'beetle', main: '#4a8a3a', accent: '#a8b8c8', glow: '#ffffff', size: 1.0, extras: ['horns'] }, cry(700, 600, 0.24, 'sawtooth', 14));
C('lumoth', 21, 'Lumoth', ['licht', 'luft'], 'ungewoehnlich', [40, 30, 38, 58, 55, 62], 180, 60,
  '1:windstoss 5:blitz 9:lichtpfeil 15:funkelstaub 21:lichtschwinge', { to: 'sternmott', lvl: 24 },
  'Ein Nachtfalter, dessen Flügelstaub im Dunkeln glimmt. Verirrte Kinder folgen seinem Licht nach Hause.',
  { kind: 'moth', main: '#f8e8a0', accent: '#a8c8ff', glow: '#fff8c0', size: 0.6 }, cry(1800, 2100, 0.22, 'sine', 28));
C('sternmott', 22, 'Sternmott', ['licht', 'magie'], 'selten', [65, 45, 60, 98, 85, 90], 60, 160,
  '1:lichtschwinge 1:funkelstaub 24:sternsplitter 30:hoffnungslied 36:sonnenstrahl 42:mondlicht', null,
  'Auf seinen Flügeln sieht man Sternbilder, die es am Himmel nicht gibt. Gelehrte streiten, ob sie aus der Zukunft stammen.',
  { kind: 'moth', main: '#e8d070', accent: '#6a7ae8', glow: '#ffffff', size: 1.05, extras: ['aura'] }, cry(1500, 2200, 0.36, 'sine', 18));
C('myzelchen', 23, 'Myzelchen', ['pflanze', 'gift'], 'gewoehnlich', [50, 40, 45, 50, 50, 30], 220, 55,
  '1:rempler 4:sporenwolke 9:mooskeim 14:giftnebel 20:sporentanz', { to: 'fungorax', lvl: 24 },
  'Ein Pilzchen, das nachts über den Waldboden wandert. Seine Sporen riechen nach Regen.',
  { kind: 'mushroom', main: '#e8a070', accent: '#f8f0e0', glow: '#c8f880', size: 0.55, extras: ['cap'] }, cry(1000, 1200, 0.2, 'triangle', 20));
C('fungorax', 24, 'Fungorax', ['pflanze', 'gift'], 'selten', [85, 70, 80, 90, 85, 40], 75, 155,
  '1:sporentanz 1:giftnebel 24:schlammbombe 32:wurzelkraft 40:urwaldzorn', null,
  'Unter dem Waldboden ist es mit allen Pilzen der Insel verbunden. Es weiß, was im Wald geschieht, bevor es geschieht.',
  { kind: 'mushroom', main: '#b84a6a', accent: '#f8e0c8', glow: '#b8ff60', size: 1.05, extras: ['cap', 'gem'] }, cry(500, 700, 0.4, 'triangle', 10));
C('echolot', 25, 'Echolot', ['schatten', 'luft'], 'gewoehnlich', [42, 48, 38, 40, 40, 60], 220, 55,
  '1:kreischer 4:windstoss 9:schattenbiss 14:echoschrei 20:fluegelschlag', { to: 'nachtschwing', lvl: 22 },
  'Es sieht mit den Ohren. In Höhlen findet es jeden Ausgang, auch wenn es keinen gibt.',
  { kind: 'bat', main: '#5a4a8a', accent: '#c8a8e8', glow: '#ff6a8a', size: 0.55 }, cry(2200, 2600, 0.12, 'square', 40));
C('nachtschwing', 26, 'Nachtschwing', ['schatten', 'luft'], 'selten', [75, 80, 65, 70, 65, 98], 80, 155,
  '1:echoschrei 1:vampirbiss 22:mondschleier 30:sturzflug 38:albtraum', null,
  'Seine Flügel verschlucken jedes Licht. Wer es am Himmel sieht, sieht nur ein Loch zwischen den Sternen.',
  { kind: 'bat', main: '#3a2a5a', accent: '#a888d8', glow: '#ff4a6a', size: 1.0, extras: ['ears'] }, cry(1400, 2000, 0.24, 'sawtooth', 20));
C('flackerl', 27, 'Flackerl', ['geist', 'feuer'], 'ungewoehnlich', [40, 30, 40, 60, 50, 55], 150, 62,
  '1:glutfunke 5:spukgriff 10:irrflamme 16:gluthauch 22:schattenball', { to: 'laternix', lvl: 26 },
  'Ein Irrlicht, das in alten Leuchttürmen haust. Es kichert, wenn jemand die Treppe hinauf stolpert.',
  { kind: 'wisp', main: '#a888f8', accent: '#ffb860', glow: '#ffe060', size: 0.55 }, cry(1300, 900, 0.3, 'sine', 26));
C('laternix', 28, 'Laternix', ['geist', 'feuer'], 'selten', [62, 45, 65, 100, 90, 70], 60, 165,
  '1:irrflamme 1:schattenball 26:glutsturm 34:albtraum 42:magmaflut', null,
  'In seiner Laterne flackern die Lichter versunkener Schiffe. Es leuchtet Seelen den Weg nach Hause.',
  { kind: 'wisp', main: '#7a5ad8', accent: '#ff9a40', glow: '#fff070', size: 1.05, extras: ['crown'] }, cry(900, 600, 0.45, 'sine', 18));
C('silberzack', 29, 'Silberzack', ['wasser'], 'gewoehnlich', [40, 55, 40, 35, 40, 70], 230, 50,
  '1:rempler 4:wasserstrahl 9:gischtstoss 14:aquahieb 20:gezeitenschlag', { to: 'klingenhai', lvl: 28 },
  'Ein Fisch, der in Schwärmen blitzschnelle Zickzack-Muster zieht. Möwen fallen ständig darauf herein.',
  { kind: 'fish', main: '#b8c8e0', accent: '#5a8ad8', glow: '#ffffff', size: 0.55 }, cry(1200, 900, 0.16, 'triangle', 24));
C('klingenhai', 30, 'Klingenhai', ['wasser', 'drache'], 'episch', [80, 112, 75, 60, 70, 98], 45, 190,
  '1:gezeitenschlag 1:drachenklaue 28:brandungsklinge 36:schattenbiss 44:drachenklaue', null,
  'Seine Rückenflosse schneidet durch Holz wie durch Wasser. Kapitäne fürchten das Geräusch eines Kiels, der zerreißt.',
  { kind: 'fish', main: '#5a6a8a', accent: '#d8e0f0', glow: '#ff5050', size: 1.25, extras: ['fins', 'spikes'] }, cry(400, 300, 0.4, 'sawtooth', 8));
C('perlschild', 31, 'Perlschild', ['wasser', 'erde'], 'gewoehnlich', [55, 48, 70, 35, 50, 25], 200, 58,
  '1:rempler 4:panzern 8:wasserstrahl 13:steinwurf 19:muschelwall', { to: 'riffkoloss', lvl: 28 },
  'Eine Schildkröte, auf deren Panzer Perlmuscheln wachsen. Taucher bringen ihr Seetang als Dank.',
  { kind: 'turtle', main: '#58b8a8', accent: '#f0e8d8', glow: '#f8d8f8', size: 0.6 }, cry(500, 420, 0.3, 'triangle', 10));
C('riffkoloss', 32, 'Riffkoloss', ['wasser', 'erde'], 'selten', [100, 82, 118, 60, 80, 32], 60, 175,
  '1:muschelwall 1:steinwurf 28:panzerwalze 36:flutwelle 44:felsgranate', null,
  'Auf seinem Rücken wächst ein ganzes Korallenriff mit eigenen Fischen. Es schläft hundert Jahre am Meeresgrund.',
  { kind: 'turtle', main: '#3a8a7a', accent: '#f08878', glow: '#f8f0a0', size: 1.25, extras: ['spikes'] }, cry(220, 180, 0.6, 'triangle', 5));
C('kieselkopp', 33, 'Kieselkopp', ['erde'], 'gewoehnlich', [48, 62, 72, 25, 35, 25], 220, 58,
  '1:rempler 4:panzern 8:steinwurf 13:sandwirbel 19:sandsturz', { to: 'basaltor', lvl: 25 },
  'Ein Steinwesen, das sich als Kiesel am Strand tarnt. Wer darauf tritt, bekommt einen Schreck.',
  { kind: 'golem', main: '#a89a8a', accent: '#d8c8b0', glow: '#f8a040', size: 0.55 }, cry(300, 260, 0.2, 'square', 8));
C('basaltor', 34, 'Basaltor', ['erde', 'metall'], 'selten', [80, 100, 120, 40, 60, 35], 75, 165,
  '1:sandsturz 1:eisenkralle 25:felsgranate 33:metallstoss 41:bodenstoss', null,
  'Aus Säulen erkalteter Lava geformt. Es hält ganze Klippen zusammen, damit sie nicht ins Meer stürzen.',
  { kind: 'golem', main: '#5a5a6a', accent: '#c87850', glow: '#ff8a3a', size: 1.15, extras: ['spikes'] }, cry(160, 120, 0.5, 'sawtooth', 4));
C('sibilith', 35, 'Sibilith', ['gift'], 'gewoehnlich', [42, 55, 40, 40, 45, 55], 200, 55,
  '1:giftzahn 4:knurren 9:gifthieb 14:sandwirbel 20:giftnebel', { to: 'toxicobra', lvl: 24 },
  'Eine Dünennatter mit hypnotischem Zischen. Sie hasst laute Musik.',
  { kind: 'serpent', main: '#a868d8', accent: '#f0e070', glow: '#c8ff60', size: 0.6 }, cry(1100, 1300, 0.3, 'sine', 40));
C('toxicobra', 36, 'Toxicobra', ['gift', 'drache'], 'selten', [72, 92, 70, 82, 70, 85], 60, 170,
  '1:gifthieb 1:drachenodem 24:schlammbombe 32:drachenklaue 40:sporentanz', null,
  'Ihr Nackenschild zeigt ein Muster, das wie ein zweites Gesicht starrt. Ihr Gift kann Holz schmelzen.',
  { kind: 'serpent', main: '#7a3ab8', accent: '#e8d050', glow: '#a8ff40', size: 1.15, extras: ['horns', 'crest'] }, cry(700, 900, 0.4, 'sawtooth', 30));
C('hulora', 37, 'Hulora', ['schatten', 'luft'], 'ungewoehnlich', [55, 45, 48, 55, 60, 50], 160, 62,
  '1:kreischer 4:windstoss 9:schattenbiss 15:salzwind 21:mondschleier', { to: 'strigon', lvl: 27 },
  'Eine Eule, die nur bei Neumond ruft. Ihre Augen sehen, was gestern geschah.',
  { kind: 'owl', main: '#6a5a7a', accent: '#d8c8a8', glow: '#f8d040', size: 0.6 }, cry(600, 500, 0.4, 'triangle', 8));
C('strigon', 38, 'Strigon', ['schatten', 'luft'], 'selten', [85, 70, 70, 88, 92, 72], 60, 165,
  '1:mondschleier 1:sturzflug 27:albtraum 35:orkan 43:mondlicht', null,
  'Strigon wacht über die Gräber der Seeleute. Wer es sieht, soll an jemanden denken, den er vermisst.',
  { kind: 'owl', main: '#4a3a5a', accent: '#c8b898', glow: '#ffe060', size: 1.1, extras: ['crest'] }, cry(420, 380, 0.55, 'triangle', 6));
C('vulpria', 39, 'Vulpria', ['magie'], 'ungewoehnlich', [45, 40, 42, 62, 58, 65], 120, 64,
  '1:kratzer 5:funkelstaub 10:sternsplitter 16:mondlicht 22:runenblitz', { to: 'arkanuvia', lvl: 28 },
  'Ein Nebelfuchs, der in Morgendunst erscheint und verschwindet. Er kann Illusionen von Leuchtfeuern erzeugen.',
  { kind: 'fox', main: '#c8a8f8', accent: '#fff0ff', glow: '#a8f8ff', stage: 1, size: 0.7 }, cry(1300, 1700, 0.28, 'sine', 18));
C('arkanuvia', 40, 'Arkanuvia', ['magie', 'licht'], 'episch', [75, 60, 70, 105, 95, 100], 45, 190,
  '1:runenblitz 1:lichtpfeil 28:sternsplitter 36:sonnenstrahl 44:sternensegen', null,
  'Ihre neun Schweife zeichnen Lichtkarten in den Himmel. Alte Navigatoren segelten nach ihren Spuren.',
  { kind: 'fox', main: '#a888e8', accent: '#fff8e0', glow: '#80f8ff', stage: 2, size: 1.2, extras: ['aura'] }, cry(1000, 1800, 0.42, 'sine', 12));
C('cervalis', 41, 'Cervalis', ['licht'], 'selten', [80, 75, 70, 85, 85, 85], 45, 180,
  '1:lichtpfeil 1:sprungtritt 10:glanzschild 20:lichtschwinge 30:sonnenstrahl 40:hoffnungslied', null,
  'Ein weißer Hirsch, der nur im ersten Licht des Morgens zu sehen ist. Sein Geweih zeigt immer zur aufgehenden Sonne.',
  { kind: 'stag', main: '#f0f0f8', accent: '#f8d880', glow: '#fff8a0', stage: 2, size: 1.1, extras: ['horns', 'aura'] }, cry(1200, 1500, 0.5, 'sine', 8));
C('umbrakit', 42, 'Umbrakit', ['schatten'], 'gewoehnlich', [45, 55, 40, 45, 40, 65], 190, 56,
  '1:kratzer 4:knurren 9:schattenbiss 15:sprungtritt 21:vampirbiss', { to: 'noktara', lvl: 26 },
  'Ein Kätzchen aus Abendschatten. Es schleicht sich auf Schiffe und frisst die Fische der Köche.',
  { kind: 'shade', main: '#4a4060', accent: '#b8a8d8', glow: '#ffe040', size: 0.55 }, cry(1500, 1800, 0.18, 'triangle', 22));
C('noktara', 43, 'Noktara', ['schatten', 'magie'], 'selten', [70, 90, 62, 80, 62, 102], 60, 165,
  '1:vampirbiss 1:runenblitz 26:mondschleier 34:albtraum 42:schattenbiss', null,
  'Sie wandelt lautlos über Dächer. In Hafenstädten glaubt man, sie bringe dem Glück, der sie zuerst grüßt.',
  { kind: 'shade', main: '#2a2040', accent: '#9878d8', glow: '#ffd020', size: 1.0, extras: ['ears', 'gem'] }, cry(1000, 1400, 0.3, 'triangle', 14));
C('zappgecko', 44, 'Zappgecko', ['elektro'], 'gewoehnlich', [40, 45, 38, 55, 42, 68], 200, 56,
  '1:rempler 4:funkenschlag 9:funkensprung 15:funkenkette 21:donnerflug', { to: 'fulgurax', lvl: 25 },
  'Ein Gecko, der an Masten klebt und Blitze anzieht. Er knistert, wenn man ihn streichelt.',
  { kind: 'lizard', main: '#f8d840', accent: '#5a6a8a', glow: '#80f8ff', stage: 1, size: 0.55 }, cry(1700, 2000, 0.15, 'square', 34));
C('fulgurax', 45, 'Fulgurax', ['elektro', 'drache'], 'selten', [72, 78, 65, 95, 70, 100], 60, 170,
  '1:funkenkette 1:drachenodem 25:blitzschlag 33:drachenklaue 41:donnerflug', null,
  'Sein Kamm lädt sich bei Gewitter auf, bis die Luft summt. Ein Schrei von ihm lässt Kompassnadeln tanzen.',
  { kind: 'lizard', main: '#e8b820', accent: '#3a4a6a', glow: '#80ffff', stage: 2, size: 1.15, extras: ['crest', 'spikes'] }, cry(1100, 1700, 0.3, 'sawtooth', 20));

// ---------------------------------------------------------------- Das stille Ei (Legendäre, schlüpft erst am Ende von Welt 2)
C('aurelune', 250, 'Aurelune', ['wasser', 'licht'], 'legendaer', [100, 90, 100, 120, 120, 100], 3, 330,
  '1:mahlstrom 1:sonnenstrahl 1:mondlicht 1:hoffnungslied', null,
  'Die Mutter der Gezeiten. Man sagt, jede Welle auf jedem Meer sei ein Atemzug von ihr.',
  { kind: 'serpent', main: '#f8f0ff', accent: '#80c8ff', glow: '#ffd8a0', stage: 2, size: 1.4, extras: ['crown', 'fins', 'aura'] }, cry(700, 1400, 0.8, 'sine', 6), { legendary: true });

export const KALMARA1 = ['zundrak', 'pyroskar', 'vulkadras', 'tidolin', 'kaskadon', 'maelstrax', 'moospip', 'rankora', 'sylvatan', 'brisel', 'boebrisel', 'zyklorn', 'hoppsand', 'dunaro', 'kneifling', 'scherator', 'quallux', 'medusprak', 'chitrix', 'ruestkor', 'lumoth', 'sternmott', 'myzelchen', 'fungorax', 'echolot', 'nachtschwing', 'flackerl', 'laternix', 'silberzack', 'klingenhai', 'perlschild', 'riffkoloss', 'kieselkopp', 'basaltor', 'sibilith', 'toxicobra', 'hulora', 'strigon', 'vulpria', 'arkanuvia', 'cervalis', 'umbrakit', 'noktara', 'zappgecko', 'fulgurax'];
