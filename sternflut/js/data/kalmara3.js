// Kalmara-Archipel, Teil 3 (Nr. 76–95): Ostinsel (Funkenhafen, Ostweide) und Nordinsel (Nebelklippe, Geisterwrack)
import { C } from './creatures.js';
import { MOVES } from './moves.js';

Object.assign(MOVES, {
  kurzschluss:   { name: 'Kurzschluss',    type: 'elektro',  cat: 'phys', pow: 80, acc: 95, pp: 15, fx: 'zap', effect: { status: 'starre', chance: 20 } },
  zahnradwurf:   { name: 'Zahnradwurf',    type: 'metall',   cat: 'phys', pow: 65, acc: 100, pp: 20, fx: 'bolt' },
  hochspannung:  { name: 'Hochspannung',   type: 'elektro',  cat: 'spez', pow: 100, acc: 85, pp: 5, fx: 'zap', effect: { status: 'starre', chance: 30 } },
  hornramme:     { name: 'Hornramme',      type: 'normal',   cat: 'phys', pow: 75, acc: 100, pp: 15, fx: 'dash' },
  galopp:        { name: 'Galopp',         type: 'luft',     cat: 'phys', pow: 80, acc: 100, pp: 15, fx: 'dash' },
  nebelschleier: { name: 'Nebelschleier',  type: 'geist',    cat: 'status', pow: 0, acc: 100, pp: 15, fx: 'cloud', effect: { stat: 'acc', stages: -2, target: 'foe' } },
  seelenwelle:   { name: 'Seelenwelle',    type: 'geist',    cat: 'spez', pow: 85, acc: 100, pp: 10, fx: 'storm' },
  ankerwurf:     { name: 'Ankerwurf',      type: 'metall',   cat: 'phys', pow: 95, acc: 90, pp: 10, fx: 'quake' },
  geisterzange:  { name: 'Geisterzange',   type: 'geist',    cat: 'phys', pow: 70, acc: 100, pp: 15, fx: 'bite' },
  totenruf:      { name: 'Totenruf',       type: 'geist',    cat: 'spez', pow: 60, acc: 100, pp: 15, fx: 'roar', effect: { stat: 'spd', stages: -1, target: 'foe' } },
});
const cry = (f, f2, len, wave, wob) => ({ f, f2, len, wave, wob });

C('kabelwurm', 76, 'Kabelwurm', ['elektro', 'metall'], 'gewoehnlich', [48, 55, 60, 50, 45, 50], 190, 60,
  '1:rempler 4:funkenschlag 9:eisenkralle 15:funkenkette 21:kurzschluss', { to: 'voltrex', lvl: 30 },
  'Er nistet in alten Leitungen und frisst Strom. Wenn in Funkenhafen das Licht flackert, ist meist ein Kabelwurm schuld.',
  { kind: 'serpent', main: '#e8c838', accent: '#3a3a4a', glow: '#80f0ff', size: 0.6 }, cry(1500, 1900, 0.2, 'square', 30));
C('voltrex', 77, 'Voltrex', ['elektro', 'metall'], 'selten', [80, 95, 95, 90, 70, 75], 60, 175,
  '1:kurzschluss 1:metallstoss 30:hochspannung 38:stahlwirbel 46:blitzschlag', null,
  'Sein Körper ist ein lebendes Stromkabel. Er kann ein ganzes Dorf eine Nacht lang beleuchten.',
  { kind: 'serpent', main: '#d8a820', accent: '#2a2a3a', glow: '#80ffff', size: 1.25, extras: ['spikes', 'crest'] }, cry(800, 1500, 0.4, 'sawtooth', 20));
C('funkmaus', 78, 'Funkmaus', ['elektro'], 'gewoehnlich', [38, 45, 35, 55, 45, 75], 200, 54,
  '1:kratzer 4:funkenschlag 8:sprungtritt 13:leuchtfunke 19:funkenkette', { to: 'blitzhase', lvl: 26 },
  'Ihre Schnurrhaare sind Antennen. Sie hört jedes Radio im Umkreis von drei Häusern.',
  { kind: 'bunny', main: '#f8e060', accent: '#f8f8f0', glow: '#80d8ff', size: 0.5 }, cry(2000, 2400, 0.12, 'square', 36));
C('blitzhase', 79, 'Blitzhase', ['elektro'], 'selten', [65, 75, 60, 90, 70, 110], 75, 165,
  '1:funkenkette 1:sprungtritt 26:blitzschlag 34:kurzschluss 42:hochspannung', null,
  'Wenn er rennt, zieht er einen Blitz hinter sich her. Bei Gewitter sieht man ihn auf Hügeln tanzen.',
  { kind: 'bunny', main: '#f8c820', accent: '#fff8e0', glow: '#80ffff', size: 1.0, extras: ['ears', 'aura'] }, cry(1500, 2100, 0.2, 'square', 24));
C('zahnradling', 80, 'Zahnradling', ['metall'], 'gewoehnlich', [45, 55, 75, 35, 50, 35], 200, 58,
  '1:rempler 4:panzern 9:eisenkralle 15:zahnradwurf 21:metallstoss', { to: 'getriebor', lvl: 32 },
  'Ein Zahnrad, das sich selbstständig gemacht hat. Es dreht sich vor Freude im Kreis.',
  { kind: 'blob', main: '#a8b0b8', accent: '#d8a040', glow: '#80d8ff', size: 0.5, extras: ['spikes'] }, cry(700, 900, 0.15, 'square', 40));
C('getriebor', 81, 'Getriebor', ['metall', 'elektro'], 'selten', [80, 100, 120, 70, 80, 45], 60, 180,
  '1:zahnradwurf 1:funkenkette 32:stahlwirbel 40:hochspannung 48:ankerwurf', null,
  'Hunderte Zahnräder greifen in ihm ineinander. Ingenieure behaupten, es könne jede Maschine reparieren – oder zerlegen.',
  { kind: 'golem', main: '#8a98a8', accent: '#d89838', glow: '#80f0ff', size: 1.2, extras: ['spikes', 'gem'] }, cry(300, 500, 0.4, 'sawtooth', 16));
C('oelmotte', 82, 'Ölmotte', ['gift', 'metall'], 'ungewoehnlich', [55, 50, 65, 75, 60, 70], 120, 120,
  '1:windstoss 5:sporenwolke 10:giftnebel 18:eisenkralle 26:schlammbombe 34:stahlwirbel', null,
  'Ihre Flügel schimmern wie Öl auf Wasser. Sie liebt das Brummen von Maschinen und schläft auf warmen Motoren.',
  { kind: 'moth', main: '#4a4a5a', accent: '#a868d8', glow: '#58f8a8', size: 0.85 }, cry(900, 700, 0.3, 'sawtooth', 18));
C('wollhorn', 83, 'Wollhorn', ['normal'], 'gewoehnlich', [60, 55, 55, 35, 50, 40], 200, 58,
  '1:rempler 4:knurren 9:hornramme 15:panzern 21:sprungtritt', { to: 'widderkraft', lvl: 30 },
  'Seine Wolle ist so weich, dass Kissen aus Ostweide überall im Archipel begehrt sind.',
  { kind: 'stag', main: '#f0e8d8', accent: '#8a6a4a', glow: '#f8d870', stage: 1, size: 0.65, extras: ['horns'] }, cry(500, 400, 0.3, 'square', 14));
C('widderkraft', 84, 'Widderkraft', ['normal', 'erde'], 'selten', [95, 105, 90, 45, 70, 60], 75, 170,
  '1:hornramme 1:bodenstoss 30:felsgranate 38:panzerwalze 46:sprungtritt', null,
  'Ein Kopfstoß von ihm versetzt Felsbrocken. Auf Ostweide trägt er Kinder auf dem Rücken über die Weiden.',
  { kind: 'stag', main: '#e8dcc8', accent: '#6a4a30', glow: '#f8c040', stage: 2, size: 1.2, extras: ['horns', 'crown'] }, cry(300, 260, 0.5, 'square', 8));
C('fohlenwind', 85, 'Fohlenwind', ['luft', 'normal'], 'ungewoehnlich', [55, 60, 45, 45, 50, 75], 120, 66,
  '1:rempler 4:windstoss 9:sprungtritt 15:kreiselboe 21:galopp', { to: 'sturmross', lvl: 32 },
  'Ein Fohlen, dessen Mähne aus Wind besteht. Es wird nie müde – nur verspielt.',
  { kind: 'stag', main: '#c8e0f8', accent: '#ffffff', glow: '#a8e8ff', stage: 1, size: 0.7 }, cry(1100, 1500, 0.3, 'triangle', 12));
C('sturmross', 86, 'Sturmross', ['luft'], 'selten', [85, 100, 70, 70, 70, 115], 45, 185,
  '1:galopp 1:kreiselboe 32:orkan 40:sturzflug 48:lichtschwinge', null,
  'Sturmross galoppiert über das Meer, ohne nasse Hufe zu bekommen. Wer es reitet, überholt jede Möwe.',
  { kind: 'stag', main: '#a8c8f0', accent: '#f8f8ff', glow: '#c8f8ff', stage: 2, size: 1.2, extras: ['wings', 'aura'] }, cry(800, 1400, 0.45, 'triangle', 8));
C('nebelquall', 87, 'Nebelquall', ['geist', 'wasser'], 'ungewoehnlich', [55, 35, 50, 70, 70, 50], 140, 66,
  '1:wasserstrahl 5:spukgriff 10:nebelschleier 16:irrflamme 22:seelenwelle', { to: 'phantomedusa', lvl: 33 },
  'Sie treibt im Nebel, nicht im Wasser. Seefahrer verwechseln sie oft mit Laternen – zu spät.',
  { kind: 'wisp', main: '#c8d8f0', accent: '#a888f8', glow: '#e8f8ff', size: 0.6 }, cry(900, 600, 0.45, 'sine', 20));
C('phantomedusa', 88, 'Phantomedusa', ['geist', 'wasser'], 'selten', [85, 50, 75, 105, 100, 70], 60, 180,
  '1:seelenwelle 1:flutwelle 33:albtraum 41:mahlstrom 49:nebelschleier', null,
  'Ihre Tentakel reichen bis in die Träume. Wer bei Nebel am Ufer einschläft, hört ihr Lied.',
  { kind: 'wisp', main: '#a8b8e8', accent: '#8868e8', glow: '#ffffff', size: 1.2, extras: ['crown', 'aura'] }, cry(600, 400, 0.6, 'sine', 14));
C('bilgenratz', 89, 'Bilgenratz', ['schatten', 'wasser'], 'gewoehnlich', [45, 55, 40, 40, 40, 65], 210, 54,
  '1:kratzer 4:schattenbiss 9:aquahieb 15:vampirbiss 21:gezeitenschlag', null,
  'Auf jedem Schiff lebt ein Bilgenratz. Kapitäne sagen: Ein Schiff ohne ihn ist ein Schiff ohne Glück.',
  { kind: 'shade', main: '#5a5868', accent: '#c8b8a8', glow: '#80e8ff', size: 0.5 }, cry(1800, 2100, 0.12, 'square', 28));
C('kraehwacht', 90, 'Krähwacht', ['geist', 'luft'], 'gewoehnlich', [48, 55, 42, 50, 45, 62], 190, 58,
  '1:kreischer 4:windstoss 9:spukgriff 15:totenruf 21:fluegelschlag', { to: 'totenrabe', lvl: 32 },
  'Sie sitzt auf Grabsteinen und Masten. Es heißt, sie zähle die Seelen, die das Meer behält.',
  { kind: 'bird', main: '#3a3848', accent: '#a8a0c8', glow: '#a8f0ff', size: 0.6 }, cry(700, 900, 0.3, 'sawtooth', 16));
C('totenrabe', 91, 'Totenrabe', ['geist', 'luft'], 'selten', [80, 95, 70, 85, 75, 95], 60, 175,
  '1:totenruf 1:sturzflug 32:seelenwelle 40:orkan 48:albtraum', null,
  'Er fliegt den Verirrten voraus. Wer ihm folgt, findet den Hafen – oder das Jenseits. Er entscheidet.',
  { kind: 'bird', main: '#28263a', accent: '#9890c0', glow: '#80ffff', size: 1.15, extras: ['crest', 'wings'] }, cry(450, 650, 0.5, 'sawtooth', 10));
C('ankerling', 92, 'Ankerling', ['geist', 'metall'], 'ungewoehnlich', [55, 70, 80, 40, 55, 30], 140, 70,
  '1:rempler 4:spukgriff 9:eisenkralle 15:geisterzange 22:ankerwurf', { to: 'ankerfuerst', lvl: 35 },
  'Ein rostiger Anker, in dem ein Seemannsgeist wohnt. Er klammert sich an alles, was schwimmt.',
  { kind: 'golem', main: '#7a6a5a', accent: '#5a8a8a', glow: '#a8f8f0', size: 0.6 }, cry(250, 200, 0.4, 'square', 6));
C('ankerfuerst', 93, 'Ankerfürst', ['geist', 'metall'], 'episch', [90, 115, 115, 60, 85, 45], 45, 200,
  '1:ankerwurf 1:geisterzange 35:seelenwelle 43:stahlwirbel 51:albtraum', null,
  'Er war einst der Anker eines Königsschiffs. Heute bewacht er den Meeresgrund, auf dem es liegt.',
  { kind: 'golem', main: '#5a4a40', accent: '#4a7a7a', glow: '#80fff0', size: 1.3, extras: ['crown', 'spikes'] }, cry(140, 120, 0.7, 'square', 4));
C('seelenkrebs', 94, 'Seelenkrebs', ['geist', 'wasser'], 'ungewoehnlich', [60, 85, 90, 45, 60, 40], 120, 120,
  '1:kratzer 5:spukgriff 10:geisterzange 18:aquahieb 26:scherenschnitt 34:seelenwelle', null,
  'Er trägt einen Schädel aus Muschelkalk als Haus. Niemand weiß, wem er gehörte.',
  { kind: 'crab', main: '#8878b0', accent: '#e8e0d0', glow: '#a8ffe8', size: 0.8 }, cry(800, 600, 0.25, 'square', 22));
C('spukbuddel', 95, 'Spukbuddel', ['geist'], 'selten', [60, 45, 60, 85, 85, 65], 45, 140,
  '1:spukgriff 1:nebelschleier 15:irrflamme 25:schattenball 35:albtraum', null,
  'Ein Geist, der in einer Flaschenpost wohnt. Manchmal enthält die Flasche einen Brief – an jemanden, der noch nicht geboren ist.',
  { kind: 'blob', main: '#b8e8d8', accent: '#78a898', glow: '#ffffff', size: 0.6, extras: ['aura'] }, cry(1300, 900, 0.4, 'sine', 30));

// Reittiere: diese Arten tragen dich mit dem Sattel über Land (START → REITEN)
export const RIDE = ['dunaro', 'rankora', 'sylvatan', 'pyroskar', 'vulkadras', 'sahrakor', 'mirageon', 'arkanuvia', 'cervalis', 'kronenspringer', 'nebelhirsch', 'mondheuler', 'widderkraft', 'fohlenwind', 'sturmross', 'waldkoloss', 'kaktoral'];
export const KALMARA3 = ['kabelwurm', 'voltrex', 'funkmaus', 'blitzhase', 'zahnradling', 'getriebor', 'oelmotte', 'wollhorn', 'widderkraft', 'fohlenwind', 'sturmross', 'nebelquall', 'phantomedusa', 'bilgenratz', 'kraehwacht', 'totenrabe', 'ankerling', 'ankerfuerst', 'seelenkrebs', 'spukbuddel'];
