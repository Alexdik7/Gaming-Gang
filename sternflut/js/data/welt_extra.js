// Neue Arten Nr. 262–276: Kreaturen mit besonderem Auftreten (nur bei Regen, Nebel, Ebbe, Schnee, nachts …)
import { C } from './creatures.js';
const cry = (f, f2, len, wave, wob) => ({ f, f2, len, wave, wob });
const M = (kind, main, accent, glow, size, extras, stage = 1) => ({ kind, main, accent, glow, size, extras, stage });

// Pfützling → Regenunke: erscheinen nur, wenn es regnet
C('pfuetzling', 262, 'Pfützling', ['wasser'], 'ungewoehnlich', [50, 40, 45, 55, 50, 55], 160, 60,
  '1:rempler 1:wasserstrahl 6:blasenwirbel 12:knurren 18:aquahieb 24:funkenschlag', { to: 'regenunke', lvl: 24 },
  'Taucht nur auf, wenn es regnet. Es springt von Pfütze zu Pfütze und quakt dabei so laut, dass man es für ein Gewitter hält.',
  M('blob', '#5ab8e8', '#d8f4ff', '#a8f0ff', 0.6, ['gem']), cry(700, 900, 0.18, 'square', 12));
C('regenunke', 263, 'Regenunke', ['wasser', 'elektro'], 'selten', [80, 70, 75, 95, 80, 80], 70, 170,
  '1:aquahieb 1:funkenschlag 24:donnerflug 30:flutwelle 38:blitzschlag 46:surfer', null,
  'Wenn sie singt, ziehen Wolken auf. Fischer sagen: Hörst du eine Regenunke, hol die Netze ein.',
  M('axolotl', '#2a7ab8', '#fff088', '#ffe040', 1.1, ['fins', 'gem'], 2), cry(260, 520, 0.4, 'sawtooth', 8));

// Nebelmotte → Schleierfalter: nachts im Nebel von Nebelklippe
C('nebelmotte', 264, 'Nebelmotte', ['geist', 'luft'], 'ungewoehnlich', [55, 40, 50, 70, 70, 75], 130, 90,
  '1:windstoss 1:nachtschleier 30:spukgriff 34:fluegelschlag 40:schattenball 46:orkan', { to: 'schleierfalter', lvl: 42 },
  'Seine Flügel sind aus Nebel gewebt. Wer es fangen will, greift oft ins Leere – es ist nur zur Hälfte da.',
  M('moth', '#b8c0d8', '#f0f4ff', '#c8f0ff', 0.75), cry(900, 600, 0.3, 'sine', 4));
C('schleierfalter', 265, 'Schleierfalter', ['geist', 'luft'], 'selten', [75, 55, 70, 105, 95, 100], 60, 180,
  '1:schattenball 1:orkan 42:albtraum 48:seelenwelle 56:himmelsriss', null,
  'Wo es fliegt, verschwimmen die Wege. Seeleute folgen ihm, wenn der Nebel zu dicht ist – es führt sie immer heim.',
  M('moth', '#7a80b8', '#e8ecff', '#a8f8ff', 1.2, ['aura'], 2), cry(500, 800, 0.5, 'sine', 6));

// Ebbkrebs → Gezeitenpanzer: nur bei Ebbe in der Gezeitengrotte
C('ebbkrebs', 266, 'Ebbkrebs', ['wasser', 'erde'], 'ungewoehnlich', [60, 75, 85, 35, 50, 40], 120, 90,
  '1:kratzer 1:wasserstrahl 12:steinwurf 16:aquahieb 22:zertruemmerer 28:tropfstein', { to: 'gezeitenpanzer', lvl: 30 },
  'Verlässt seine Höhle nur bei Ebbe. Es zählt die Wellen – und kehrt um, kurz bevor das Wasser zurückkommt.',
  M('crab', '#c86a4a', '#f8d8b0', '#ffe0a0', 0.65), cry(400, 300, 0.2, 'square', 6));
C('gezeitenpanzer', 267, 'Gezeitenpanzer', ['wasser', 'erde'], 'selten', [90, 105, 125, 50, 75, 40], 50, 190,
  '1:tropfstein 1:aquahieb 30:bodenstoss 36:gezeitenschlag 44:felsgranate 52:tiefendruck', null,
  'Auf seinem Panzer wachsen Muscheln, die bei Ebbe leise singen. Man sagt, es trägt den Rhythmus der Gezeiten in sich.',
  M('turtle', '#8a5a3a', '#e8d0a0', '#80e8ff', 1.25, ['armor'], 2), cry(200, 160, 0.6, 'triangle', 4));

// Glühwurmling → Lampyra: nachts im Glimmwald
C('gluehwurmling', 268, 'Glühwurmling', ['licht', 'pflanze'], 'gewoehnlich', [45, 40, 45, 60, 55, 60], 170, 60,
  '1:rempler 1:lichtpfeil 8:rankenhieb 14:glimmsporen 20:funkelstaub 26:sonnenstrahl', { to: 'lampyra', lvl: 26 },
  'Kommt nur nachts heraus. Hundert Glühwurmlinge zusammen sind heller als eine Laterne – und viel freundlicher.',
  M('beetle', '#5a8a3a', '#f8f0a0', '#fff060', 0.55, ['gem']), cry(1100, 1300, 0.12, 'sine', 14));
C('lampyra', 269, 'Lampyra', ['licht', 'pflanze'], 'selten', [70, 60, 70, 100, 90, 85], 70, 170,
  '1:sonnenstrahl 1:funkelstaub 26:glanzschild 32:urwaldzorn 40:perlglanz', null,
  'Ihr Leuchten folgt dem Lied der Gezeiten. Die Leute im Glimmwald stellen ihre Uhren nach ihr.',
  M('moth', '#3a6a2a', '#fff4b0', '#ffe850', 1.0, ['aura'], 2), cry(800, 1200, 0.35, 'sine', 10));

// Zuckfuchs → Donnerfähe: tagsüber auf der Ostweide
C('zuckfuchs', 270, 'Zuckfuchs', ['elektro'], 'ungewoehnlich', [55, 70, 50, 60, 50, 90], 120, 90,
  '1:kratzer 1:funkenschlag 24:funkensprung 30:leuchtfunke 36:kurzschluss 42:blitzschlag', { to: 'donnerfaehe', lvl: 40 },
  'Seine Schwanzspitze sprüht Funken, wenn es sich freut. Bei Gewitter rennt es den Blitzen hinterher.',
  M('fox', '#f8c030', '#fff0c0', '#80e0ff', 0.7), cry(1000, 700, 0.18, 'square', 16));
C('donnerfaehe', 271, 'Donnerfähe', ['elektro', 'licht'], 'selten', [80, 100, 70, 95, 70, 120], 60, 190,
  '1:kurzschluss 1:blitzschlag 40:lichtschwinge 48:hochspannung 56:sonnenstrahl', null,
  'Man sieht sie nur als gelben Streifen am Horizont. Wer ihr folgt, findet manchmal einen Ort, an dem der Blitz eingeschlagen hat – und dort Gold.',
  M('fox', '#e8a020', '#fff8d0', '#a0f0ff', 1.2, ['mane'], 2), cry(600, 1100, 0.4, 'sawtooth', 12));

// Firnkauz: nur bei Schneefall in Frosthafens Bergen
C('firnkauz', 272, 'Firnkauz', ['eis', 'luft'], 'selten', [85, 80, 80, 95, 95, 85], 45, 200,
  '1:frosthauch 1:fluegelschlag 60:eiszapfen 66:frostwelle 72:blizzard 80:zephyrschwinge', null,
  'Sitzt nur bei Schneefall auf den Klippen. Seine Federn sind so weiß, dass man es erst sieht, wenn es blinzelt.',
  M('owl', '#e8f0f8', '#a8c8e8', '#80d8ff', 1.0, ['crest']), cry(400, 350, 0.5, 'triangle', 3));

// Wolkenhüpfer → Himmelshase: in den Wolkengärten
C('wolkenhuepfer', 273, 'Wolkenhüpfer', ['luft', 'magie'], 'ungewoehnlich', [65, 60, 60, 75, 70, 90], 110, 140,
  '1:windstoss 1:funkelstaub 60:sprungtritt 66:fluegelschlag 72:sternsplitter', { to: 'himmelshase', lvl: 80 },
  'Es springt von Wolke zu Wolke und landet nie auf dem Boden. Kinder in Wolkenhafen behaupten, es kann den Regen festhalten.',
  M('bunny', '#f0f4ff', '#c8d8ff', '#ffc8f0', 0.75), cry(1200, 1000, 0.15, 'sine', 10));
C('himmelshase', 274, 'Himmelshase', ['luft', 'magie'], 'selten', [85, 85, 80, 100, 90, 115], 50, 210,
  '1:sternsplitter 1:zephyrschwinge 80:regenbogen 86:himmelsriss', null,
  'Ein Sprung von ihm reicht bis zu den Sternen, sagt man. Es kommt immer zurück – mit Sternenstaub im Fell.',
  M('bunny', '#d8e4ff', '#ffffff', '#ffa8e8', 1.25, ['wings'], 2), cry(900, 1300, 0.35, 'sine', 12));

// Sternschnuppling → Kometenwächter: nachts auf Nyxara
C('sternschnuppling', 275, 'Sternschnuppling', ['astral'], 'selten', [65, 55, 60, 95, 80, 100], 60, 200,
  '1:sternenstaub 1:funkelstaub 90:kosmosstrahl 95:nova', { to: 'kometenwaechter', lvl: 96 },
  'Fällt jede Nacht vom Himmel und klettert vor Sonnenaufgang wieder hinauf. Wer es fängt, darf sich etwas wünschen.',
  M('wisp', '#8a6aff', '#ffffff', '#ffe8a0', 0.7), cry(1400, 900, 0.3, 'sine', 18));
C('kometenwaechter', 276, 'Kometenwächter', ['astral', 'drache'], 'episch', [95, 115, 90, 120, 95, 110], 30, 260,
  '1:kosmosstrahl 1:kometenhieb 96:meteorsturz 100:supernova', null,
  'Es zieht einen Schweif aus Sternenlicht hinter sich her. Seit Thalassyr schläft, bewacht es den Himmel über Nyxara.',
  M('serpent', '#3a2a8a', '#d8c8ff', '#ffe0a0', 1.4, ['horns', 'aura'], 2), cry(220, 600, 0.7, 'sawtooth', 6));

// Wo und wann sie auftauchen: [Begegnungstabelle, Art, Gewicht, Bedingung] – Level passend zur Tabelle
// Bedingungen: 'rain' (Regen), 'snow' (Schnee), 'night', 'day', 'ebbe' (Ebbe)
export const SPAWNS = [
  ['duenen', 'pfuetzling', 30, 'rain'], ['kueste', 'pfuetzling', 25, 'rain'], ['kueste2', 'pfuetzling', 25, 'rain'],
  ['nebel', 'nebelmotte', 18, 'night'], ['gezeiten', 'ebbkrebs', 30, 'ebbe'], ['wald', 'gluehwurmling', 25, 'night'],
  ['glimmpfad', 'gluehwurmling', 15, 'night'], ['ostweide', 'zuckfuchs', 14, 'day'], ['frost', 'firnkauz', 12, 'snow'],
  ['eismeer', 'firnkauz', 8, 'snow'], ['wolken', 'wolkenhuepfer', 14], ['nyx1', 'sternschnuppling', 8, 'night'], ['nyx2', 'sternschnuppling', 6, 'night'],
];
