// Erweiterte Kreaturen (2D-Version): Entwicklungen der Wildarten + 26 neue Arten → insgesamt 45
import './creatures3.js';
import './creatures4.js';
import './creatures5.js';
import './creatures6.js';
import './creatures7.js';
import './creatures8.js';
import './creatures9.js';
import './creatures10.js';
import './creatures11.js';
import { SPECIES, RARITY } from './creatures.js';

RARITY.mutation = { name: 'Mutation', color: '#ff7ad9' };

const L = str => str.trim().split(/\s+/).map(t => { const [l, id] = t.split(':'); return [+l, id]; });
const ST = a => ({ hp: a[0], atk: a[1], def: a[2], spa: a[3], spd: a[4], spe: a[5] });
function C(id, num, name, types, rarity, stats, catchRate, xp, learn, evo, lore, model, cry) {
  SPECIES[id] = { num, name, types, rarity, stats: ST(stats), catchRate, xp, learn: L(learn), evo, lore, model, cry };
}

// Entwicklungen der bestehenden Wildarten
SPECIES.zirpfink.evo = { to: 'sturmfink', lvl: 18 };
SPECIES.voltmotte.evo = { to: 'donnerfalter', lvl: 22 };
SPECIES.sporlich.evo = { to: 'sporanox', lvl: 20 };
SPECIES.kieselkrebs.evo = { to: 'felsklaue', lvl: 24, trade: true };
SPECIES.schemenohr.evo = { to: 'nachtmahr', lvl: 25, trade: true };
SPECIES.moospanzer.evo = { to: 'hainfeste', lvl: 28 };
SPECIES.glutfux.model.extras = ['crest'];
SPECIES.gezeitenmolch.model.extras = ['horns'];
SPECIES.knorrwurz.model.extras = ['crown'];
SPECIES.sylvaron.model.extras = [];
SPECIES.zirpfink.learn.push([14, 'fluegelschlag']);
SPECIES.sporlich.learn.push([12, 'giftzahn']);
SPECIES.kieselkrebs.learn.push([15, 'sandwirbel']);
SPECIES.funkfux.learn.push([14, 'gluthauch']);
SPECIES.tropfmolch.learn.push([14, 'aquahieb']);
SPECIES.sprossling.learn.push([17, 'rankenhieb']);

C('sturmfink', 14, 'Galeko', ['luft', 'normal'], 'ungewoehnlich', [65, 72, 58, 50, 52, 92], 90, 120,
  '1:rempler 1:windstoss 18:sturzflug 24:orkan', null,
  'Sein Gesang kündigt Gewitter an. Schwärme von Sturmfinken reiten auf Böen über ganze Gebirge.',
  { kind: 'bird', main: '#ff9f2e', accent: '#c4462e', glow: '#fff', size: 0.85, extras: ['crest'] }, { f: 1300, f2: 1900, len: 0.25, wave: 'sawtooth', wob: 20 });
C('donnerfalter', 15, 'Voltaria', ['elektro', 'luft'], 'selten', [65, 45, 60, 95, 75, 95], 60, 140,
  '1:funkenschlag 1:windstoss 22:donnerflug 28:blitzschlag', null,
  'Bei Gewitter tanzt es zwischen den Blitzen. Sein Flügelstaub knistert noch Tage später.',
  { kind: 'moth', main: '#2d3266', accent: '#ffe14a', glow: '#9ff3ff', size: 1.0, extras: ['aura'] }, { f: 900, f2: 1400, len: 0.3, wave: 'square', wob: 45 });
C('sporanox', 16, 'Mycelord', ['gift', 'pflanze'], 'ungewoehnlich', [80, 62, 75, 85, 80, 40], 90, 130,
  '1:sporenwolke 1:giftnebel 20:schlammbombe 26:wurzelkraft', null,
  'Ein wandelnder Pilzhut, unter dem ganze Familien von Sporlichen Schutz vor Regen finden.',
  { kind: 'mushroom', main: '#8e2a52', accent: '#fff2dc', glow: '#d6ff9f', size: 1.0, extras: ['spikes'] }, { f: 380, f2: 260, len: 0.35, wave: 'triangle', wob: 15 });
C('felsklaue', 17, 'Klakkolith', ['erde', 'metall'], 'selten', [72, 95, 115, 40, 60, 40], 60, 150,
  '1:eisenkralle 1:steinwurf 24:felsgranate 30:metallstoss', null,
  'Seine Scheren knacken Granit wie Nüsse. Es baut Burgen aus den schönsten Steinen am Fluss.',
  { kind: 'crab', main: '#6c6a74', accent: '#c9a76a', glow: '#7fe3ff', size: 1.0, extras: ['spikes'] }, { f: 240, f2: 200, len: 0.25, wave: 'square', wob: 40 });
C('nachtmahr', 18, 'Noctumbra', ['schatten', 'geist'], 'episch', [70, 95, 60, 85, 65, 105], 45, 170,
  '1:schattenbiss 1:nachtschleier 25:albtraum 30:schattenball', null,
  'Man sagt, es schleiche durch Träume. Wer es sieht, erinnert sich am Morgen nur an zwei leuchtende Augen.',
  { kind: 'shade', main: '#1d1630', accent: '#b07bff', glow: '#ff7ad9', size: 1.0, extras: ['horns', 'aura'] }, { f: 700, f2: 200, len: 0.5, wave: 'sawtooth', wob: 6 });
C('hainfeste', 19, 'Moosaurox', ['pflanze', 'erde'], 'selten', [100, 80, 115, 60, 85, 30], 45, 170,
  '1:rankenhieb 1:steinwurf 28:felsgranate 34:dornenwall', null,
  'Auf seinem Panzer wächst ein ganzer Wald. Vögel nisten darin, ohne zu merken, dass er wandert.',
  { kind: 'turtle', main: '#4a7a35', accent: '#9a7a52', glow: '#ffd36a', size: 1.2, extras: ['crown'] }, { f: 140, f2: 110, len: 0.6, wave: 'sine', wob: 3 });

C('glibbo', 20, 'Glupsi', ['wasser'], 'gewoehnlich', [55, 35, 45, 50, 50, 40], 200, 48,
  '1:rempler 4:wasserstrahl 9:panzern 14:blasenwirbel', { to: 'glibborax', lvl: 18 },
  'Ein wabbelnder Wassertropfen, der in Pfützen schläft. Wenn er lacht, spritzt es.',
  { kind: 'blob', main: '#5cc6ff', accent: '#2f8fe0', glow: '#bff3ff', size: 0.6 }, { f: 520, f2: 760, len: 0.2, wave: 'sine', wob: 25 });
C('glibborax', 21, 'Toxiglup', ['wasser', 'gift'], 'ungewoehnlich', [85, 60, 70, 80, 75, 50], 90, 125,
  '1:blasenwirbel 1:giftnebel 18:schlammbombe 26:flutwelle', null,
  'Es hat einmal zu lange in einem Sumpf gebadet. Seitdem schimmert es violett und riecht nach Moor.',
  { kind: 'blob', main: '#7b5ce0', accent: '#4a2a9a', glow: '#d6ff9f', size: 0.95, extras: ['crown'] }, { f: 300, f2: 500, len: 0.35, wave: 'triangle', wob: 18 });
C('frostglibber', 22, 'Frizzglup', ['eis'], 'selten', [60, 40, 65, 70, 70, 45], 75, 90,
  '1:rempler 1:frosthauch 10:panzern 16:eiszapfen 24:frostwelle', null,
  'Ein Glupsi, das in einer Eishöhle eingeschlafen ist. Es taut nie ganz auf.',
  { kind: 'blob', main: '#bff3ff', accent: '#7fb8ff', glow: '#ffffff', size: 0.65, extras: ['gem'] }, { f: 900, f2: 1300, len: 0.2, wave: 'sine', wob: 30 });
C('flatterlo', 23, 'Batzi', ['luft', 'schatten'], 'gewoehnlich', [45, 45, 35, 30, 40, 70], 200, 50,
  '1:rempler 1:kreischer 6:windstoss 12:schattenbiss', { to: 'vampyra', lvl: 22 },
  'Flatterlos schlafen kopfüber in Höhlen und orientieren sich mit einem Pfeifen, das nur Kinder hören.',
  { kind: 'bat', main: '#4a3a6a', accent: '#8a5ab8', glow: '#ffef7a', size: 0.6 }, { f: 2000, f2: 2600, len: 0.12, wave: 'square', wob: 60 });
C('vampyra', 24, 'Nosferion', ['luft', 'schatten'], 'ungewoehnlich', [75, 80, 65, 60, 70, 100], 90, 130,
  '1:schattenbiss 1:windstoss 22:vampirbiss 28:orkan', null,
  'Lautlose Jägerin der Nacht. Ihre Flügel sind so dünn, dass der Mond durch sie hindurchscheint.',
  { kind: 'bat', main: '#2a1a3a', accent: '#c43a5a', glow: '#ff5d6c', size: 0.95, extras: ['ears'] }, { f: 1500, f2: 900, len: 0.3, wave: 'sawtooth', wob: 30 });
C('flossling', 25, 'Finnel', ['wasser'], 'gewoehnlich', [40, 45, 40, 35, 40, 75], 220, 40,
  '1:rempler 5:wasserstrahl 12:aquahieb', { to: 'tiefenkiemer', lvl: 25 },
  'Ein neugieriger kleiner Fisch, der Angelhaken für Spielzeug hält.',
  { kind: 'fish', main: '#ff9f4a', accent: '#ffe2a8', glow: '#ffffff', size: 0.6 }, { f: 700, f2: 500, len: 0.15, wave: 'sine', wob: 35 });
C('tiefenkiemer', 26, 'Abyssharq', ['wasser', 'drache'], 'selten', [85, 100, 75, 70, 80, 85], 45, 170,
  '1:aquahieb 1:drachenodem 25:drachenklaue 32:flutwelle', null,
  'Aus den tiefsten Seen steigt es nur bei Vollmond auf. Seine Schuppen schimmern wie altes Gold.',
  { kind: 'fish', main: '#1f6fb8', accent: '#ffd36b', glow: '#9ff3ff', size: 1.15, extras: ['horns', 'fins'] }, { f: 260, f2: 160, len: 0.5, wave: 'sawtooth', wob: 8 });
C('hoppel', 27, 'Bunzel', ['normal'], 'gewoehnlich', [50, 50, 40, 35, 40, 70], 220, 45,
  '1:rempler 4:knurren 9:sprungtritt 15:kreischer', { to: 'hoppelion', lvl: 20 },
  'Bunzel springen so hoch, dass sie manchmal in Baumkronen landen – und dort einfach weiterschlafen.',
  { kind: 'bunny', main: '#f2e6d0', accent: '#d9b98a', glow: '#ffb0c8', size: 0.6 }, { f: 1100, f2: 1500, len: 0.15, wave: 'triangle', wob: 25 });
C('hoppelion', 28, 'Luxlapin', ['normal', 'licht'], 'ungewoehnlich', [80, 85, 65, 70, 65, 95], 90, 125,
  '1:sprungtritt 1:lichtpfeil 20:glanzschild 26:sonnenstrahl', null,
  'Seine Ohren leuchten in der Dämmerung wie Laternen. Verirrte Wanderer folgen ihm nach Hause.',
  { kind: 'bunny', main: '#fff6d8', accent: '#ffd36b', glow: '#fff27a', size: 0.9, extras: ['gem'] }, { f: 900, f2: 1300, len: 0.25, wave: 'triangle', wob: 15 });
C('funkenhase', 29, 'Zaplapin', ['elektro'], 'ungewoehnlich', [55, 60, 45, 65, 50, 90], 120, 70,
  '1:rempler 1:funkenschlag 8:funkensprung 14:sprungtritt 20:donnerflug', null,
  'Reibt es seine Ohren aneinander, sprühen Funken. Bei trockenem Wetter knistert sein ganzes Fell.',
  { kind: 'bunny', main: '#ffe14a', accent: '#2b2d42', glow: '#9ff3ff', size: 0.65, extras: ['tailflame'] }, { f: 1400, f2: 2000, len: 0.15, wave: 'square', wob: 40 });
C('brockel', 30, 'Pebbo', ['erde'], 'gewoehnlich', [55, 70, 85, 25, 35, 20], 180, 60,
  '1:rempler 1:panzern 6:steinwurf 12:sandwirbel 18:bodenstoss', { to: 'brockolith', lvl: 25, trade: true },
  'Liegt Pebbo still, hält man es für einen Stein. Wanderer haben schon auf ihm Picknick gemacht.',
  { kind: 'golem', main: '#9a8a74', accent: '#6b5a48', glow: '#ffcf6b', size: 0.6 }, { f: 160, f2: 120, len: 0.3, wave: 'square', wob: 10 });
C('brockolith', 31, 'Monolor', ['erde', 'metall'], 'selten', [85, 105, 125, 40, 55, 30], 60, 160,
  '1:steinwurf 1:metallstoss 25:felsgranate 32:stahlwirbel', null,
  'In seinem Inneren glühen Erzadern. Bergleute folgen ihm, um neue Stollen zu finden.',
  { kind: 'golem', main: '#7a7a86', accent: '#4a4a56', glow: '#ff9d3c', size: 1.0, extras: ['spikes'] }, { f: 110, f2: 80, len: 0.5, wave: 'sawtooth', wob: 6 });
C('schuppling', 32, 'Drakini', ['drache'], 'episch', [55, 70, 55, 55, 55, 60], 45, 90,
  '1:kratzer 1:knurren 8:drachenodem 16:schattenbiss 24:drachenklaue', { to: 'drakonar', lvl: 30 },
  'Ein junger Drache, der in der Tiefe der Höhlen schlüpft. Es heißt, er wachse nur, wenn er vertraut.',
  { kind: 'serpent', main: '#5a7aff', accent: '#bfd0ff', glow: '#ffef7a', size: 0.65 }, { f: 400, f2: 700, len: 0.35, wave: 'sawtooth', wob: 12 });
C('drakonar', 33, 'Drakonar', ['drache', 'luft'], 'legendaer', [91, 120, 90, 100, 90, 85], 25, 270,
  '1:drachenklaue 1:drachenodem 30:orkan 40:felsgranate', null,
  'Wenn Drakonar über die Berge zieht, verstummen alle anderen Kreaturen. Nur wenige haben ihn je gesehen.',
  { kind: 'serpent', main: '#3a4ad9', accent: '#ffd36b', glow: '#ff9d3c', size: 1.3, stage: 2, extras: ['horns', 'crest'] }, { f: 180, f2: 420, len: 0.8, wave: 'sawtooth', wob: 5 });
C('toxnatter', 34, 'Viprax', ['gift'], 'ungewoehnlich', [55, 70, 50, 45, 50, 70], 120, 70,
  '1:rempler 1:giftzahn 10:gifthieb 18:schlammbombe', null,
  'Ihr Schwanz rasselt wie trockenes Laub. Wer das Geräusch hört, sollte langsam zurückgehen.',
  { kind: 'serpent', main: '#7fcf3a', accent: '#3a2a4a', glow: '#d6ff9f', size: 0.6, extras: ['spikes'] }, { f: 1600, f2: 1200, len: 0.3, wave: 'sawtooth', wob: 80 });
C('irrlicht', 35, 'Flimmo', ['geist'], 'ungewoehnlich', [45, 40, 45, 75, 65, 70], 120, 75,
  '1:spukgriff 1:nachtschleier 10:schattenball 18:lichtpfeil', { to: 'spukflamme', lvl: 26, trade: true },
  'Es lockt Wanderer mit einem warmen Licht vom Weg ab – nur um ihnen dann den kürzesten Heimweg zu zeigen.',
  { kind: 'wisp', main: '#b8a8ff', accent: '#ffffff', glow: '#8a7dd6', size: 0.6 }, { f: 1200, f2: 600, len: 0.5, wave: 'sine', wob: 6 });
C('spukflamme', 36, 'Phantoflamm', ['geist', 'feuer'], 'selten', [65, 55, 65, 110, 85, 90], 45, 160,
  '1:schattenball 1:glutfunke 26:gluthauch 32:magmaflut', null,
  'Seine Flamme wärmt nicht – sie brennt nur Erinnerungen. Die schönsten bewahrt es für immer.',
  { kind: 'wisp', main: '#5a3aa8', accent: '#ff9d3c', glow: '#ff6a2b', size: 0.95, extras: ['crown'] }, { f: 800, f2: 300, len: 0.6, wave: 'sawtooth', wob: 5 });
C('kaeferix', 37, 'Ferrobit', ['metall'], 'gewoehnlich', [50, 60, 75, 30, 50, 40], 190, 55,
  '1:kratzer 1:panzern 7:eisenkralle 14:metallstoss', { to: 'hornkoloss', lvl: 24 },
  'Sein Panzer glänzt wie poliertes Silber. Ferrobit-Kämpfe sind auf Dorffesten sehr beliebt.',
  { kind: 'beetle', main: '#8fa3b8', accent: '#d9e6f0', glow: '#7fe3ff', size: 0.6 }, { f: 600, f2: 400, len: 0.15, wave: 'square', wob: 50 });
C('hornkoloss', 38, 'Cornutan', ['metall', 'erde'], 'selten', [80, 110, 115, 40, 70, 45], 60, 160,
  '1:metallstoss 1:steinwurf 24:felsgranate 30:stahlwirbel', null,
  'Mit seinem Horn hebt es Felsen, die zehnmal so schwer sind wie es selbst.',
  { kind: 'beetle', main: '#5a6a7a', accent: '#c9a76a', glow: '#ff9d3c', size: 1.05, extras: ['horns'] }, { f: 300, f2: 200, len: 0.4, wave: 'square', wob: 25 });
C('runenkaefer', 39, 'Glyphscara', ['magie', 'metall'], 'episch', [60, 55, 85, 95, 85, 60], 45, 130,
  '1:funkelstaub 1:panzern 12:runenblitz 20:stahlwirbel 28:mondlicht', null,
  'Die Muster auf seinem Panzer sind uralte Runen. Gelehrte streiten, ob sie eine Karte oder ein Gedicht sind.',
  { kind: 'beetle', main: '#3a2a6a', accent: '#ff7ad9', glow: '#9cffc8', size: 0.65, extras: ['gem'] }, { f: 1000, f2: 1600, len: 0.3, wave: 'triangle', wob: 20 });
C('glutechse', 40, 'Sizzlizz', ['feuer'], 'ungewoehnlich', [48, 60, 45, 60, 45, 72], 120, 65,
  '1:kratzer 1:glutfunke 9:flammenbiss 15:gluthauch', { to: 'lavawaran', lvl: 22 },
  'Sie sonnt sich auf heißen Steinen. Ihre Rückenzacken glühen auf, wenn sie sich freut.',
  { kind: 'lizard', main: '#d9543a', accent: '#ffd0a8', glow: '#ffcf4a', size: 0.65 }, { f: 650, f2: 950, len: 0.2, wave: 'sawtooth', wob: 30 });
C('lavawaran', 41, 'Pyroguana', ['feuer', 'erde'], 'selten', [80, 95, 80, 90, 65, 70], 45, 160,
  '1:flammenbiss 1:steinwurf 22:magmaflut 28:felsgranate', null,
  'Wo es entlangläuft, bleiben glühende Fußspuren im Stein zurück.',
  { kind: 'lizard', main: '#7a2a2a', accent: '#3a2a2a', glow: '#ff6a2b', size: 1.1, extras: ['horns', 'spikes'] }, { f: 300, f2: 500, len: 0.45, wave: 'sawtooth', wob: 10 });
C('eulix', 42, 'Owlumen', ['licht', 'luft'], 'ungewoehnlich', [60, 45, 50, 70, 70, 55], 120, 70,
  '1:rempler 1:lichtpfeil 8:windstoss 14:glanzschild 20:fluegelschlag', { to: 'sternuhu', lvl: 24 },
  'Owlumen bewacht nachts die Wege. Seine Augen leuchten so hell, dass sie Laternen ersetzen.',
  { kind: 'owl', main: '#8a6a4a', accent: '#f2e6d0', glow: '#ffef7a', size: 0.65 }, { f: 500, f2: 420, len: 0.4, wave: 'sine', wob: 4 });
C('sternuhu', 43, 'Celestowl', ['licht', 'magie'], 'selten', [80, 55, 75, 105, 95, 75], 45, 165,
  '1:lichtpfeil 1:funkelstaub 24:sonnenstrahl 30:mondlicht', null,
  'Es kennt den Namen jedes Sterns. In klaren Nächten zeichnet es mit seinem Flug Sternbilder nach.',
  { kind: 'owl', main: '#2a2a5a', accent: '#c6b8ff', glow: '#9ff3ff', size: 0.95, extras: ['crown', 'aura'] }, { f: 420, f2: 840, len: 0.6, wave: 'sine', wob: 3 });
C('frostling', 44, 'Glacimo', ['eis'], 'selten', [55, 70, 80, 40, 60, 35], 60, 90,
  '1:rempler 1:frosthauch 10:eiszapfen 18:panzern 26:frostwelle', { to: 'gletscherkoloss', lvl: 30 },
  'Ein kleiner Eisblock mit großem Herz. Im Sommer versteckt es sich tief in den Höhlen.',
  { kind: 'golem', main: '#bfe6ff', accent: '#7fb8ff', glow: '#ffffff', size: 0.55, extras: ['gem'] }, { f: 1100, f2: 800, len: 0.25, wave: 'triangle', wob: 20 });
C('gletscherkoloss', 45, 'Glaciath', ['eis', 'metall'], 'episch', [95, 110, 120, 60, 80, 30], 30, 200,
  '1:eiszapfen 1:metallstoss 30:frostwelle 36:felsgranate', null,
  'Man sagt, es sei aus dem ältesten Eis der Welt geformt – älter als die Berge selbst.',
  { kind: 'golem', main: '#8fd0ff', accent: '#4a7ab8', glow: '#e8faff', size: 1.05, extras: ['crown', 'spikes'] }, { f: 120, f2: 90, len: 0.7, wave: 'triangle', wob: 4 });

// Signatur-Merkmal je Körpertyp (für Mutationen: das zweite Elternteil vererbt dieses Merkmal)
export const SIGNATURE = {
  fox: 'ears', axolotl: 'fins', sprout: 'leaf', bird: 'wings', moth: 'wings', mushroom: 'cap', crab: 'spikes', shade: 'ears',
  turtle: 'spikes', stag: 'horns', blob: 'gem', bat: 'wings', fish: 'fins', bunny: 'ears', golem: 'spikes', serpent: 'horns',
  wisp: 'aura', beetle: 'horns', lizard: 'crest', owl: 'crest',
};
