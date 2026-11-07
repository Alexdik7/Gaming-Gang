// Kalmara-Archipel, Teil 2 (Nr. 46–75): Küstenweg, Dünenhain (Oase und Sandgrotte), Glimmpfad und Glimmwald
import { C } from './creatures.js';
import { MOVES } from './moves.js';

Object.assign(MOVES, {
  dornenschuss:  { name: 'Dornenschuss',   type: 'pflanze',  cat: 'phys', pow: 55, acc: 100, pp: 20, fx: 'bolt' },
  wuestenwind:   { name: 'Wüstenwind',     type: 'erde',     cat: 'spez', pow: 60, acc: 95, pp: 15, fx: 'storm', effect: { stat: 'acc', stages: -1, target: 'foe' } },
  sonnenpanzer:  { name: 'Sonnenpanzer',   type: 'licht',    cat: 'status', pow: 0, acc: 100, pp: 15, fx: 'buff', effect: { stat: 'spd', stages: 2, target: 'self' } },
  skarabaeusrad: { name: 'Skarabäusrad',   type: 'erde',     cat: 'phys', pow: 80, acc: 95, pp: 10, fx: 'dash' },
  trugbild:      { name: 'Trugbild',       type: 'magie',    cat: 'spez', pow: 75, acc: 100, pp: 15, fx: 'beam' },
  oasenregen:    { name: 'Oasenregen',     type: 'wasser',   cat: 'status', pow: 0, acc: 100, pp: 10, fx: 'heal', effect: { heal: 0.5 } },
  aasflug:       { name: 'Aasflug',        type: 'schatten', cat: 'phys', pow: 70, acc: 95, pp: 15, fx: 'dash' },
  quarzstrahl:   { name: 'Quarzstrahl',    type: 'magie',    cat: 'spez', pow: 70, acc: 95, pp: 15, fx: 'beam' },
  tropfstein:    { name: 'Tropfstein',     type: 'erde',     cat: 'phys', pow: 75, acc: 90, pp: 15, fx: 'bolt' },
  glimmsporen:   { name: 'Glimmsporen',    type: 'licht',    cat: 'spez', pow: 55, acc: 100, pp: 20, fx: 'cloud', effect: { stat: 'acc', stages: -1, target: 'foe' } },
  nussregen:     { name: 'Nussregen',      type: 'pflanze',  cat: 'phys', pow: 60, acc: 95, pp: 20, fx: 'bolt' },
  mooswalze:     { name: 'Mooswalze',      type: 'pflanze',  cat: 'phys', pow: 90, acc: 90, pp: 10, fx: 'quake' },
  froschgift:    { name: 'Froschgift',     type: 'gift',     cat: 'spez', pow: 65, acc: 100, pp: 15, fx: 'cloud', effect: { status: 'gift', chance: 30 } },
  leuchtfunke:   { name: 'Leuchtfunke',    type: 'elektro',  cat: 'spez', pow: 50, acc: 100, pp: 25, fx: 'zap', effect: { status: 'starre', chance: 10 } },
  feenstaub:     { name: 'Feenstaub',      type: 'magie',    cat: 'status', pow: 0, acc: 100, pp: 15, fx: 'buff', effect: { stat: 'spa', stages: 1, target: 'self' } },
  geisterhuf:    { name: 'Geisterhuf',     type: 'geist',    cat: 'phys', pow: 80, acc: 100, pp: 15, fx: 'dash' },
  mondgeheul:    { name: 'Mondgeheul',     type: 'schatten', cat: 'status', pow: 0, acc: 100, pp: 15, fx: 'roar', effect: { stat: 'atk', stages: 2, target: 'self' } },
  schattenreisser:{ name: 'Schattenreißer', type: 'schatten', cat: 'phys', pow: 85, acc: 95, pp: 10, fx: 'slash' },
});

const cry = (f, f2, len, wave, wob) => ({ f, f2, len, wave, wob });

// ---------------------------------------------------------------- Dünen und Oase
C('stachelkeim', 46, 'Stachelkeim', ['pflanze', 'erde'], 'gewoehnlich', [50, 55, 60, 35, 45, 30], 200, 56,
  '1:rempler 4:dornenschuss 9:sandwirbel 14:rankenhieb 20:sandsturz', { to: 'kaktoral', lvl: 26 },
  'Ein Kaktuskeimling, der monatelang ohne Wasser auskommt. Wer ihn umarmt, bereut es sofort.',
  { kind: 'sprout', main: '#5aa858', accent: '#f8e070', glow: '#ff7aa8', size: 0.6, extras: ['spikes'] }, cry(900, 700, 0.2, 'square', 16));
C('kaktoral', 47, 'Kaktoral', ['pflanze', 'erde'], 'selten', [80, 90, 95, 55, 70, 45], 75, 160,
  '1:dornenschuss 1:sandsturz 26:dornenwall 34:bodenstoss 42:urwaldzorn', null,
  'Seine Blüte öffnet sich nur einmal im Jahr, in der heißesten Nacht. Wer sie sieht, findet in der Wüste immer Wasser.',
  { kind: 'golem', main: '#3a9a4a', accent: '#f8d860', glow: '#ff5a98', size: 1.1, extras: ['spikes', 'crown'] }, cry(500, 400, 0.4, 'square', 8));
C('skarabix', 48, 'Skarabix', ['erde', 'licht'], 'ungewoehnlich', [45, 55, 60, 40, 50, 45], 150, 60,
  '1:rempler 4:sandwirbel 9:steinwurf 14:lichtpfeil 20:sonnenpanzer', { to: 'solskarab', lvl: 27 },
  'Ein Käfer, der eine Kugel aus Sonnenlicht vor sich herrollt. Nachts schläft er darin.',
  { kind: 'beetle', main: '#3a8ab8', accent: '#f8d040', glow: '#fff8a0', size: 0.55 }, cry(1300, 1500, 0.15, 'square', 22));
C('solskarab', 49, 'Solskarab', ['erde', 'licht'], 'selten', [75, 95, 100, 70, 80, 60], 60, 170,
  '1:sonnenpanzer 1:skarabaeusrad 27:sonnenstrahl 35:felsgranate 43:lichtschwinge', null,
  'In alten Tempeln wurde Solskarab als Hüter der Morgensonne verehrt. Sein Panzer spiegelt jede Farbe des Himmels.',
  { kind: 'beetle', main: '#1e6aa8', accent: '#f8c020', glow: '#ffffc0', size: 1.05, extras: ['horns', 'aura'] }, cry(800, 1100, 0.3, 'sawtooth', 12));
C('sandvipa', 50, 'Sandvipa', ['erde'], 'gewoehnlich', [44, 60, 45, 35, 40, 62], 190, 58,
  '1:giftzahn 4:sandwirbel 9:sandsturz 15:schattenbiss 21:bodenstoss', { to: 'sahrakor', lvl: 30 },
  'Sie gräbt sich in den Sand, bis nur noch ihre Augen herausschauen. Ihr Biss ist heiß wie Mittagssand.',
  { kind: 'serpent', main: '#d8b070', accent: '#8a5a3a', glow: '#ff6a3a', size: 0.6 }, cry(1100, 1400, 0.25, 'sine', 36));
C('sahrakor', 51, 'Sahrakor', ['erde', 'drache'], 'episch', [85, 108, 85, 70, 70, 92], 45, 195,
  '1:bodenstoss 1:drachenklaue 30:wuestenwind 38:felsgranate 46:drachenodem', null,
  'Ein Sanddrache, der unter den Dünen schwimmt wie ein Fisch im Meer. Karawanen folgen seinen Rückenwellen.',
  { kind: 'serpent', main: '#c89850', accent: '#6a3a2a', glow: '#ff8a3a', size: 1.3, extras: ['horns', 'spikes'] }, cry(300, 500, 0.5, 'sawtooth', 10));
C('fennika', 52, 'Fennika', ['feuer'], 'ungewoehnlich', [42, 50, 40, 60, 50, 70], 140, 62,
  '1:kratzer 4:glutfunke 9:sprungtritt 14:gluthauch 20:trugbild', { to: 'mirageon', lvl: 28 },
  'Ein Wüstenfuchs mit riesigen Ohren, die Hitze ableiten. In der Abenddämmerung tanzt er mit seinem Schatten.',
  { kind: 'fox', main: '#f8c070', accent: '#fff4e0', glow: '#ff9a40', stage: 1, size: 0.6, extras: ['ears'] }, cry(1400, 1800, 0.22, 'square', 20));
C('mirageon', 53, 'Mirageon', ['feuer', 'magie'], 'episch', [70, 70, 65, 105, 85, 100], 45, 190,
  '1:trugbild 1:gluthauch 28:glutsturm 36:sternsplitter 44:magmaflut', null,
  'Mirageon erschafft Fata Morganen von Oasen, um Verirrte zur echten Quelle zu führen. Böse Menschen führt es im Kreis.',
  { kind: 'fox', main: '#f89a50', accent: '#fff0d0', glow: '#c890ff', stage: 2, size: 1.15, extras: ['ears', 'aura'] }, cry(1000, 1600, 0.4, 'sine', 14));
C('oasquak', 54, 'Oasquak', ['wasser', 'pflanze'], 'gewoehnlich', [55, 45, 50, 50, 55, 40], 190, 58,
  '1:wasserstrahl 4:mooskeim 9:blasenwirbel 15:oasenregen 21:blattsturm', { to: 'palmquak', lvl: 25 },
  'Ein Frosch, der in Oasen lebt und mit einem Blatt auf dem Kopf Schatten macht. Er quakt, wenn Regen kommt.',
  { kind: 'axolotl', main: '#58c890', accent: '#f8f0a0', glow: '#80d0ff', size: 0.55, extras: ['leaf'] }, cry(700, 500, 0.2, 'square', 28));
C('palmquak', 55, 'Palmquak', ['wasser', 'pflanze'], 'selten', [90, 70, 75, 85, 90, 55], 75, 165,
  '1:oasenregen 1:blattsturm 25:flutwelle 33:wurzelkraft 41:urwaldzorn', null,
  'Auf seinem Rücken wächst eine kleine Palme. Erschöpfte Reisende dürfen in ihrem Schatten schlafen.',
  { kind: 'turtle', main: '#3aa878', accent: '#f8e890', glow: '#80e0ff', size: 1.15, extras: ['leaf', 'crown'] }, cry(400, 320, 0.4, 'square', 14));
C('schwebgeier', 56, 'Schwebgeier', ['luft', 'schatten'], 'ungewoehnlich', [55, 60, 45, 40, 45, 60], 140, 62,
  '1:kreischer 4:windstoss 9:schattenbiss 15:aasflug 21:sturzflug', { to: 'thanatorr', lvl: 30 },
  'Er kreist tagelang über der Wüste, ohne mit den Flügeln zu schlagen. Er wartet. Geduldig.',
  { kind: 'bird', main: '#6a5048', accent: '#f0d8c0', glow: '#ff5a3a', size: 0.7 }, cry(600, 800, 0.3, 'sawtooth', 10));
C('thanatorr', 57, 'Thanatorr', ['luft', 'schatten'], 'selten', [85, 100, 70, 60, 70, 90], 60, 175,
  '1:aasflug 1:sturzflug 30:schattenreisser 38:orkan 46:albtraum', null,
  'Sein Schatten fällt auf die Erde, auch wenn die Sonne hinter ihm steht. Wanderer sprechen seinen Namen nicht laut aus.',
  { kind: 'bird', main: '#3a2830', accent: '#d8c0b0', glow: '#ff3a3a', size: 1.2, extras: ['crest', 'wings'] }, cry(380, 500, 0.5, 'sawtooth', 8));

// ---------------------------------------------------------------- Sandgrotte
C('quarzel', 58, 'Quarzel', ['erde', 'magie'], 'ungewoehnlich', [50, 45, 70, 55, 60, 30], 150, 60,
  '1:rempler 4:panzern 9:steinwurf 14:funkelstaub 20:quarzstrahl', { to: 'kristallux', lvl: 30 },
  'Ein Steinchen, aus dem Quarzspitzen wachsen. Wenn es sich freut, klingt es wie ein Windspiel.',
  { kind: 'blob', main: '#c8b8e8', accent: '#f8f0ff', glow: '#a8f8ff', size: 0.55, extras: ['gem', 'spikes'] }, cry(1800, 2200, 0.2, 'sine', 30));
C('kristallux', 59, 'Kristallux', ['erde', 'magie'], 'selten', [80, 70, 115, 95, 100, 40], 60, 175,
  '1:quarzstrahl 1:felsgranate 30:sternsplitter 38:glanzschild 46:runenblitz', null,
  'In seinem Innern bricht sich das Licht in sieben Farben. Bergleute sagen, es leuchtet heller, wenn Gefahr naht.',
  { kind: 'golem', main: '#a898e0', accent: '#f0e8ff', glow: '#80f8ff', size: 1.15, extras: ['gem', 'crown', 'aura'] }, cry(1400, 2000, 0.4, 'sine', 18));
C('stalakmolch', 60, 'Stalakmolch', ['wasser', 'schatten'], 'selten', [70, 70, 75, 70, 70, 50], 75, 140,
  '1:wasserstrahl 1:schattenbiss 10:tropfstein 18:aquahieb 26:mondschleier 34:flutwelle', null,
  'Er lebt in den tiefsten Wasserbecken der Grotten und hat noch nie die Sonne gesehen. Seine Haut ist fast durchsichtig.',
  { kind: 'axolotl', main: '#a8b8d0', accent: '#e8e0f0', glow: '#8af8ff', size: 0.85, extras: ['fins'] }, cry(600, 400, 0.4, 'triangle', 12));

// ---------------------------------------------------------------- Glimmwald
C('glimmhut', 61, 'Glimmhut', ['pflanze', 'licht'], 'gewoehnlich', [48, 40, 50, 55, 55, 35], 200, 56,
  '1:rempler 4:mooskeim 9:glimmsporen 15:lichtpfeil 21:waldesatem', { to: 'lumicap', lvl: 26 },
  'Ein Pilz, dessen Hut nachts türkis leuchtet. Ganze Felder von ihnen machen den Glimmwald zum hellsten Wald der Welt.',
  { kind: 'mushroom', main: '#58d8c8', accent: '#f0fff8', glow: '#a8fff0', size: 0.55, extras: ['cap'] }, cry(1500, 1300, 0.25, 'sine', 20));
C('lumicap', 62, 'Lumicap', ['pflanze', 'licht'], 'selten', [80, 60, 80, 95, 95, 50], 75, 165,
  '1:glimmsporen 1:waldesatem 26:sonnenstrahl 34:blattsturm 42:hoffnungslied', null,
  'Wenn Lumicap seine Sporen ausstößt, sieht der Wald aus wie ein Sternenhimmel, der vom Boden aufsteigt.',
  { kind: 'mushroom', main: '#38b8b8', accent: '#e8fff8', glow: '#b8fff8', size: 1.1, extras: ['cap', 'aura'] }, cry(1100, 900, 0.4, 'sine', 14));
C('nussklau', 63, 'Nussklau', ['pflanze', 'normal'], 'gewoehnlich', [45, 55, 40, 35, 40, 65], 210, 54,
  '1:kratzer 4:rankenhieb 8:sprungtritt 13:nussregen 19:zerschneider', { to: 'kronenspringer', lvl: 24 },
  'Ein Eichhörnchen, das Nüsse in seinen Backen hortet – und Kompasse, Löffel und alles, was glänzt.',
  { kind: 'bunny', main: '#c87848', accent: '#f8e0c0', glow: '#80c048', size: 0.55, extras: ['leaf'] }, cry(1700, 2000, 0.12, 'square', 30));
C('kronenspringer', 64, 'Kronenspringer', ['pflanze', 'normal'], 'selten', [70, 90, 65, 50, 65, 100], 90, 160,
  '1:nussregen 1:zerschneider 24:wurzelpeitsche 32:sprungtritt 40:urwaldzorn', null,
  'Es springt von Baumkrone zu Baumkrone, ohne je den Boden zu berühren. Jäger haben es noch nie gefangen – nur gesehen.',
  { kind: 'bunny', main: '#a85830', accent: '#f0d8b0', glow: '#70b040', size: 1.0, extras: ['ears', 'leaf'] }, cry(1300, 1700, 0.2, 'square', 20));
C('moosbrock', 65, 'Moosbrock', ['pflanze', 'erde'], 'ungewoehnlich', [65, 65, 75, 30, 50, 25], 160, 64,
  '1:rempler 4:panzern 9:mooskeim 15:steinwurf 21:mooswalze', { to: 'waldkoloss', lvl: 30 },
  'Ein Felsbrocken, auf dem so viel Moos wächst, dass er Beine bekommen hat. Er schläft am liebsten im Regen.',
  { kind: 'golem', main: '#7a9a58', accent: '#a89a80', glow: '#f8e070', size: 0.65, extras: ['leaf'] }, cry(260, 220, 0.3, 'square', 6));
C('waldkoloss', 66, 'Waldkoloss', ['pflanze', 'erde'], 'selten', [110, 105, 110, 45, 75, 30], 60, 185,
  '1:mooswalze 1:bodenstoss 30:kronenzorn 38:felsgranate 46:dornenwall', null,
  'Ein wandelnder Hügel. Auf seinen Schultern nisten Vögel, und manchmal verirrt sich ein Wanderer in seinem Bart.',
  { kind: 'golem', main: '#5a8040', accent: '#8a7a60', glow: '#f8d850', size: 1.3, extras: ['leaf', 'crown', 'spikes'] }, cry(140, 110, 0.6, 'square', 4));
C('toxquak', 67, 'Toxquak', ['gift', 'pflanze'], 'gewoehnlich', [48, 50, 45, 55, 50, 55], 190, 58,
  '1:giftzahn 4:mooskeim 9:sporenwolke 15:froschgift 21:schlammbombe', { to: 'venomlurch', lvl: 27 },
  'Seine Haut leuchtet in grellen Warnfarben. Wer klug ist, schaut nur.',
  { kind: 'axolotl', main: '#f8a020', accent: '#3a2a6a', glow: '#c8ff40', size: 0.55 }, cry(800, 600, 0.18, 'square', 30));
C('venomlurch', 68, 'Venomlurch', ['gift', 'pflanze'], 'selten', [80, 85, 70, 90, 70, 80], 60, 170,
  '1:froschgift 1:schlammbombe 27:sporentanz 35:dornenwall 43:urwaldzorn', null,
  'Venomlurch singt nachts so laut, dass der ganze Wald verstummt. Sein Gift wird von Heilern zu Medizin verarbeitet.',
  { kind: 'lizard', main: '#e88a10', accent: '#2a1a5a', glow: '#b8ff30', stage: 2, size: 1.1, extras: ['crest', 'spikes'] }, cry(500, 700, 0.4, 'sawtooth', 20));
C('funkelkaefer', 69, 'Funkelkäfer', ['licht', 'elektro'], 'gewoehnlich', [40, 35, 40, 55, 50, 65], 200, 55,
  '1:rempler 4:blitz 9:leuchtfunke 15:lichtpfeil 21:funkenkette', { to: 'leuchtkoenig', lvl: 25 },
  'Glühwürmchen, die im Schwarm Botschaften blinken. Kinder im Glimmwald lernen ihre Sprache vor dem Lesen.',
  { kind: 'beetle', main: '#4a5a3a', accent: '#f8f070', glow: '#f8ff80', size: 0.5, extras: ['wings'] }, cry(2000, 2400, 0.12, 'sine', 40));
C('leuchtkoenig', 70, 'Leuchtkönig', ['licht', 'elektro'], 'selten', [70, 55, 65, 100, 85, 95], 60, 170,
  '1:leuchtfunke 1:funkenkette 25:blitzschlag 33:sonnenstrahl 41:hoffnungslied', null,
  'Der König der Glühwürmchen trägt eine Krone aus Licht. Wenn er blinkt, antworten tausend kleine Lichter.',
  { kind: 'moth', main: '#3a4a30', accent: '#f8e860', glow: '#fffff0', size: 1.05, extras: ['crown', 'aura'] }, cry(1600, 2200, 0.3, 'sine', 20));
C('sylphie', 71, 'Sylphie', ['magie', 'pflanze'], 'selten', [50, 35, 45, 65, 70, 70], 90, 70,
  '1:funkelstaub 5:mooskeim 10:feenstaub 16:sternsplitter 22:waldesatem', { to: 'faerora', lvl: 30 },
  'Ein scheues Waldwesen, das nur Menschen mit gutem Herzen zeigt. Es liebt bittere Beeren.',
  { kind: 'wisp', main: '#a8f0b0', accent: '#ffc8f0', glow: '#fff8ff', size: 0.55, extras: ['leaf'] }, cry(1900, 2300, 0.3, 'sine', 24));
C('faerora', 72, 'Faerora', ['magie', 'pflanze'], 'episch', [75, 50, 70, 110, 105, 95], 45, 195,
  '1:sternsplitter 1:blattsturm 30:mondlicht 38:urwaldzorn 46:sternensegen', null,
  'Faerora pflanzt Blumen, wo Menschen geweint haben. Wenn sie blühen, ist die Trauer ein kleines bisschen leichter.',
  { kind: 'moth', main: '#88e0a8', accent: '#ffb8e8', glow: '#ffffff', size: 1.05, extras: ['aura', 'crown'] }, cry(1400, 2000, 0.45, 'sine', 16));
C('nebelhirsch', 73, 'Nebelhirsch', ['geist', 'pflanze'], 'episch', [80, 95, 75, 85, 80, 90], 30, 200,
  '1:spukgriff 1:rankenhieb 15:geisterhuf 25:irrflamme 35:kronenzorn 45:schattenball', null,
  'Er erscheint nur in Nebelnächten zwischen den alten Bäumen. Wer ihm folgt, findet den Weg nach Hause – oder nie wieder.',
  { kind: 'stag', main: '#98a8c0', accent: '#d8f0e0', glow: '#a8ffd8', stage: 2, size: 1.15, extras: ['horns', 'aura'] }, cry(700, 900, 0.6, 'sine', 8));
C('nachtwolp', 74, 'Nachtwolp', ['schatten'], 'ungewoehnlich', [50, 62, 45, 40, 45, 65], 150, 62,
  '1:knurren 4:schattenbiss 9:sprungtritt 15:vampirbiss 21:mondgeheul', { to: 'mondheuler', lvl: 30 },
  'Ein Wolfswelpe, der mit dem Mond aufwacht. Im Rudel ist er mutig, allein jault er nach seiner Mutter.',
  { kind: 'fox', main: '#4a4a6a', accent: '#c8c8e0', glow: '#f8f0a0', stage: 1, size: 0.65 }, cry(900, 1300, 0.35, 'triangle', 14));
C('mondheuler', 75, 'Mondheuler', ['schatten', 'magie'], 'selten', [85, 105, 75, 70, 75, 100], 55, 180,
  '1:mondgeheul 1:schattenreisser 30:mondlicht 38:albtraum 46:schattenbiss', null,
  'Wenn Mondheuler heult, antworten alle Wölfe des Archipels. Man sagt, er heult nicht den Mond an – sondern jemanden dahinter.',
  { kind: 'fox', main: '#2a2a4a', accent: '#b8b8e0', glow: '#f8e880', stage: 2, size: 1.2, extras: ['ears', 'aura'] }, cry(600, 1100, 0.6, 'triangle', 10));

export const KALMARA2 = ['stachelkeim', 'kaktoral', 'skarabix', 'solskarab', 'sandvipa', 'sahrakor', 'fennika', 'mirageon', 'oasquak', 'palmquak', 'schwebgeier', 'thanatorr', 'quarzel', 'kristallux', 'stalakmolch', 'glimmhut', 'lumicap', 'nussklau', 'kronenspringer', 'moosbrock', 'waldkoloss', 'toxquak', 'venomlurch', 'funkelkaefer', 'leuchtkoenig', 'sylphie', 'faerora', 'nebelhirsch', 'nachtwolp', 'mondheuler'];
