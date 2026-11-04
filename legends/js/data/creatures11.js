// Phase 5: 17 weitere Kreaturen für die frühen und mittleren Gebiete → 150 Arten
import { SPECIES } from './creatures.js';

const L = str => str.trim().split(/\s+/).map(t => { const [l, id] = t.split(':'); return [+l, id]; });
const ST = a => ({ hp: a[0], atk: a[1], def: a[2], spa: a[3], spd: a[4], spe: a[5] });
function C(id, num, name, types, rarity, stats, catchRate, xp, learn, evo, lore, model, cry, extra = {}) {
  SPECIES[id] = { num, name, types, rarity, stats: ST(stats), catchRate, xp, learn: L(learn), evo, lore, model, cry, ...extra };
}

C('mausbit', 134, 'Squeakit', ['normal'], 'gewoehnlich', [40, 50, 35, 30, 35, 70], 220, 45,
  '1:kratzer 1:knurren 6:rempler 12:sprungtritt 20:eisenkralle', { to: 'mausritter', lvl: 22 },
  'Sie sammelt glänzende Dinge: Knöpfe, Schrauben, Bindkristalle. Prüf lieber deine Taschen.',
  { kind: 'bunny', main: '#a89888', accent: '#f0e0d0', glow: '#f8a8a8', size: 0.55, extras: ['ears'] }, { f: 1900, f2: 2500, len: 0.12, wave: 'square', wob: 50 });
C('mausritter', 135, 'Mousquire', ['normal', 'metall'], 'ungewoehnlich', [70, 90, 85, 40, 60, 85], 90, 140,
  '1:eisenkralle 1:sprungtritt 22:metallstoss 30:panzern 38:erzschlag', null,
  'Aus gesammeltem Blech hat sie sich eine Rüstung gebaut. Sie verteidigt ihr Nest wie eine Burg.',
  { kind: 'bunny', main: '#8a8a98', accent: '#e8e0d0', glow: '#f8d040', size: 0.85, extras: ['ears', 'crest'] }, { f: 1500, f2: 1100, len: 0.2, wave: 'square', wob: 30 });
C('raupling', 136, 'Larvix', ['pflanze'], 'gewoehnlich', [45, 40, 45, 35, 40, 35], 230, 40,
  '1:rankenhieb 1:sporenwolke 8:blattsturm', { to: 'falterling', lvl: 14 },
  'Sie frisst jeden Tag ihr eigenes Gewicht an Blättern – und schläft danach den halben Nachmittag.',
  { kind: 'serpent', main: '#88c848', accent: '#f8e868', glow: '#f8a830', size: 0.55 }, { f: 900, f2: 1200, len: 0.2, wave: 'triangle', wob: 20 });
C('falterling', 137, 'Iridia', ['pflanze', 'luft'], 'ungewoehnlich', [60, 45, 55, 80, 70, 80], 120, 115,
  '1:blattsturm 1:windstoss 14:fluegelschlag 22:sporenwolke 30:orkan', null,
  'Seine Flügel sehen aus wie zwei große Blätter. Im Herbst ist er fast unsichtbar.',
  { kind: 'moth', main: '#68b048', accent: '#f8d860', glow: '#ff9a40', size: 0.9 }, { f: 1300, f2: 1700, len: 0.3, wave: 'sine', wob: 22 });
C('glimmwurm', 138, 'Glowurm', ['erde', 'licht'], 'ungewoehnlich', [60, 55, 70, 65, 60, 40], 120, 95,
  '1:steinwurf 1:lichtpfeil 14:bodenstoss 24:sonnenstrahl', null,
  'Er leuchtet in dunklen Höhlen und zeigt Verirrten den Weg nach draußen.',
  { kind: 'serpent', main: '#8a7a5a', accent: '#f8f0a8', glow: '#fff8a0', size: 0.75, extras: ['aura'] }, { f: 700, f2: 1100, len: 0.35, wave: 'sine', wob: 10 });
C('glutkueken', 139, 'Emberchick', ['feuer'], 'gewoehnlich', [45, 55, 40, 50, 40, 60], 200, 55,
  '1:glutfunke 1:kratzer 10:flammenbiss 18:sturzflug', { to: 'glutgockel', lvl: 30 },
  'Wenn es piept, fliegen Funken. In Ignis weckt es morgens die ganze Straße.',
  { kind: 'bird', main: '#f8a830', accent: '#fff0b0', glow: '#ff5a20', size: 0.55 }, { f: 2000, f2: 2600, len: 0.15, wave: 'square', wob: 40 });
C('glutgockel', 140, 'Flarooster', ['feuer', 'luft'], 'selten', [75, 95, 65, 80, 65, 90], 60, 160,
  '1:flammenbiss 1:sturzflug 30:feuerwirbel 38:orkan 46:magmaflut', null,
  'Sein Kamm brennt wie eine Fackel. Er kräht so laut, dass der Vulkan antwortet.',
  { kind: 'bird', main: '#e84a20', accent: '#f8d040', glow: '#ffe060', size: 1.0, extras: ['crest', 'tailflame'] }, { f: 1100, f2: 1800, len: 0.4, wave: 'sawtooth', wob: 25 });
C('wellenfohlen', 141, 'Marecolt', ['wasser'], 'ungewoehnlich', [55, 60, 50, 55, 55, 70], 120, 90,
  '1:wasserstrahl 1:sprungtritt 16:blasenwirbel 24:aquahieb', { to: 'wogenross', lvl: 28 },
  'Es galoppiert über die Wellenkämme. Wenn es müde wird, lässt es sich einfach treiben.',
  { kind: 'stag', main: '#68b8e8', accent: '#e8f8ff', glow: '#a8f0ff', size: 0.75 }, { f: 1100, f2: 900, len: 0.3, wave: 'sine', wob: 14 });
C('flockling', 142, 'Flakelet', ['eis', 'magie'], 'ungewoehnlich', [55, 40, 60, 75, 80, 70], 120, 110,
  '1:frosthauch 1:funkelstaub 20:eiszapfen 28:mondstrahl', null,
  'Keine zwei Flocklinge sehen gleich aus. Sie tanzen im Schneegestöber und lachen dabei.',
  { kind: 'wisp', main: '#e8f4ff', accent: '#c8b8f8', glow: '#ffffff', size: 0.65, extras: ['gem'] }, { f: 2100, f2: 2800, len: 0.25, wave: 'sine', wob: 30 });
C('irrpilz', 143, 'Illushroom', ['pflanze', 'schatten'], 'ungewoehnlich', [75, 70, 70, 70, 75, 40], 120, 120,
  '1:sporenwolke 1:schattenbiss 24:blattsturm 32:albtraum', null,
  'Er wandert nachts durch den Dämmerwald und stellt sich mitten auf die Wege.',
  { kind: 'mushroom', main: '#4a3a6a', accent: '#d8d0e8', glow: '#78f8a8', size: 0.8 }, { f: 500, f2: 900, len: 0.4, wave: 'triangle', wob: 18 });
C('skorpix', 144, 'Skorpix', ['gift', 'erde'], 'ungewoehnlich', [55, 75, 70, 40, 50, 65], 120, 100,
  '1:giftzahn 1:sandwirbel 20:gifthieb 30:bodenstoss', { to: 'skorpator', lvl: 42 },
  'Er gräbt sich bis zum Schwanz in den Sand und wartet. Stunden. Tage.',
  { kind: 'crab', main: '#c89848', accent: '#f8e8b8', glow: '#b8ff48', size: 0.7, extras: ['spikes'] }, { f: 700, f2: 500, len: 0.25, wave: 'square', wob: 25 });
C('skorpator', 145, 'Skorpatron', ['gift', 'erde'], 'selten', [80, 105, 100, 55, 70, 80], 45, 175,
  '1:gifthieb 1:bodenstoss 42:schlammbombe 48:felsgranate', null,
  'Der Herrscher der Dünen. Sein Stachel glänzt wie Bernstein in der Sonne.',
  { kind: 'crab', main: '#a86828', accent: '#f8d8a0', glow: '#a8ff38', size: 1.15, extras: ['spikes', 'horns'] }, { f: 400, f2: 260, len: 0.4, wave: 'sawtooth', wob: 12 });
C('bergmurmel', 146, 'Marmotor', ['erde', 'normal'], 'gewoehnlich', [80, 70, 75, 40, 60, 55], 150, 110,
  '1:rempler 1:steinwurf 30:bodenstoss 40:felsgranate', null,
  'Wenn Gefahr droht, pfeift er so schrill, dass alle Murmel ins Loch springen.',
  { kind: 'bunny', main: '#a07850', accent: '#e8d0b0', glow: '#f8c060', size: 0.75 }, { f: 2400, f2: 1800, len: 0.2, wave: 'square', wob: 15 });
C('eichhuscher', 147, 'Squirrix', ['pflanze', 'normal'], 'gewoehnlich', [50, 55, 45, 45, 50, 80], 180, 70,
  '1:kratzer 1:rankenhieb 12:sprungtritt 20:blattsturm', null,
  'Er versteckt Eicheln im ganzen Altwald – und vergisst die Hälfte. Daraus wachsen neue Bäume.',
  { kind: 'fox', main: '#c87838', accent: '#f8e8c8', glow: '#88d848', size: 0.6, extras: ['ears'] }, { f: 1700, f2: 2100, len: 0.15, wave: 'square', wob: 45 });
C('summsel', 148, 'Buzzle', ['gift', 'luft'], 'gewoehnlich', [45, 55, 40, 50, 45, 75], 180, 70,
  '1:giftzahn 1:windstoss 12:giftnebel 20:fluegelschlag', null,
  'Sie summt von Blüte zu Blüte. Ihr Honig ist süß, ihr Stachel nicht.',
  { kind: 'moth', main: '#f8c830', accent: '#2a2a2a', glow: '#ffffff', size: 0.55 }, { f: 2200, f2: 2400, len: 0.3, wave: 'sawtooth', wob: 60 });
C('goldbarbe', 149, 'Aurifin', ['wasser', 'licht'], 'selten', [70, 60, 70, 85, 85, 80], 30, 160,
  '1:wasserstrahl 1:lichtpfeil 18:blasenwirbel 28:flutwelle 36:sonnenstrahl', null,
  'Angler Jo sucht sie seit Jahren. Wer eine fängt, soll ein Leben lang Glück haben.',
  { kind: 'fish', main: '#f8c838', accent: '#fff8d0', glow: '#ffffff', size: 0.85, extras: ['fins', 'aura'] }, { f: 1400, f2: 1900, len: 0.4, wave: 'sine', wob: 8 });
C('blitzkaefer', 150, 'Voltscara', ['elektro', 'metall'], 'ungewoehnlich', [65, 80, 95, 65, 70, 55], 90, 140,
  '1:funkenschlag 1:eisenkralle 30:funkensprung 40:metallstoss 46:blitzschlag', null,
  'Er sitzt auf Gipfelkreuzen und wartet auf Gewitter. Jeder Blitz lädt ihn für eine Woche auf.',
  { kind: 'beetle', main: '#4a5a78', accent: '#f8e848', glow: '#88e8ff', size: 0.85, extras: ['horns'] }, { f: 800, f2: 1300, len: 0.25, wave: 'square', wob: 35 });

export const NEU5 = ['mausbit', 'mausritter', 'raupling', 'falterling', 'glimmwurm', 'glutkueken', 'glutgockel', 'wellenfohlen', 'flockling', 'irrpilz', 'skorpix', 'skorpator', 'bergmurmel', 'eichhuscher', 'summsel', 'goldbarbe', 'blitzkaefer'];
