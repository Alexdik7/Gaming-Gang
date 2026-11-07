// Welt 2 – Die Weite See, Teil 2: Wolkenreich (Wolkenhafen, Wolkenpfad, Astralis), Schattenmeer (Nocthal, Geisterbucht,
// Nachtfels), die Tiefe und die Meereskrone (Liga der Weiten See)
import { LOOK } from './maps.js';
import { MAPS2, LOOK2 } from './maps2.js';

export const LOOK3 = {
  seraphine: { skin: '#f6e2d8', hair: '#f8f0c0', outfit: '#a8d8f8', pants: '#f8f8ff', accent: '#f8e070', pony: true },
  orion: { skin: '#c98e62', hair: '#2a2a4a', outfit: '#2a2a6a', pants: '#1a1a3a', accent: '#f8e870', jaw: true },
  mortis: { skin: '#d8d0e0', hair: '#4a3a6a', outfit: '#2a2a3a', pants: '#1a1a24', cap: '#2a2a3a', accent: '#a8ffe0' },
  selene: { skin: '#e8dcf0', hair: '#c8c8f8', outfit: '#3a2a6a', pants: '#1e1430', accent: '#f8f0a0', pony: true },
  liv: { skin: '#e8b892', hair: '#c84a2a', outfit: '#f4f0e8', pants: '#2a3a6a', cap: '#2a3a6a', accent: '#f8c840', pony: true },
  korvan: { skin: '#a06a44', hair: '#1a2a4a', outfit: '#2a5a8a', pants: '#1a2a3a', accent: '#80f0ff', jaw: true },
  freya: { skin: '#f6e2d8', hair: '#f4f4f8', outfit: '#78b8e8', pants: '#e8f0f8', accent: '#ffffff', pony: true },
  nyra: { skin: '#e0d8f0', hair: '#2a1a3a', outfit: '#1e1430', pants: '#14101e', accent: '#a8ffe8' },
  solon: { skin: '#c98e62', hair: '#f4f4f4', outfit: '#f8e8a0', pants: '#c8a040', accent: '#ffffff', jaw: true },
  maris: { skin: '#f0d8c8', hair: '#38a8c8', outfit: '#f8f8ff', pants: '#2a5a9a', cap: '#f8d040', accent: '#f8d040', pony: true },
};
const L3 = LOOK3, LK = LOOK, L2 = LOOK2;
const tr = (id, x, y, dir, look, name, team, reward, line, lose, sight = 3) => ({ id, x, y, dir, look, name, trainer: { team, reward, sight, lines: [line], lose } });
const gym = (name, rows, lid, look, lname, a, b, extra = {}) => ({ name, indoor: true, gym: true, rows, ...extra, npcs: [{ id: lid, x: 5, y: 1, dir: 'down', look, name: lname }, a, b, { id: 'guide', x: 3, y: 11, dir: 'up', look: LK.jogger, name: 'Arena-Berater' }] });
const sq = (w, h, b, f) => Array.from({ length: h }, (_, y) => (y === 0 || y === h - 1) ? b.repeat(w) : b + f.repeat(w - 2) + b);
const put = (rows, y, x, str) => { rows[y] = rows[y].slice(0, x) + str + rows[y].slice(x + str.length); return rows; };

const wolkenhafen = sq(22, 18, '°', '.'); put(wolkenhafen, 8, 0, '°..' + '='.repeat(19)); put(wolkenhafen, 7, 8, 'S'); for (let y = 9; y < 17; y++) put(wolkenhafen, y, 10, '=');
for (const [y, x, t] of [[1, 18, '::'], [2, 18, '::'], [15, 2, ',,'], [16, 18, ',']]) put(wolkenhafen, y, x, t);
const astralis = sq(20, 16, '°', '.'); put(astralis, 7, 0, '='.repeat(13)); put(astralis, 6, 7, 'S');
const nocthal = MAPS2.frosthafen.rows.map((r, i) => i === 0 ? '~~~DDDDDDDDDD==DDDDDDDDD' : r.replace(/n/g, '.').replace(/G/g, 'D'));
const bucht = MAPS2.frostpfad.rows.map(r => r.replace(/G/g, 'D').replace(/n/g, '.').replace(/y/g, ':').replace(/q/g, 'R').replace(/i/g, '~').replace(/O/g, '.'));
const nachtfels = MAPS2.erzheim.rows.map((r, i, a) => i === a.length - 1 ? 'RRRRRRRRR==RRRRRRRRRRR' : r.replace(/q/g, 'R').replace(/n/g, '.'));
const meereskrone = ['TTTTTTTTTTTTTTTTTTTT', ...Array(10).fill('T........==........T'), 'TssssssssssssssssssT', '~~~~~~~~~BB~~~~~~~~~', '~~~~~~~~~~~~~~~~~~~~'];

export const MAPS3 = {
  wolkenhafen: {
    name: 'Wolkenhafen', outdoor: true, enc: null, sky: true,
    rows: wolkenhafen,
    buildings: [
      { x: 2, y: 2, w: 6, h: 4, door: 3, to: 'heal', heal: true, sign: 'HEIL', signCol: '#e8fff0' },
      { x: 13, y: 2, w: 5, h: 4, door: 2, to: 'shop', sign: 'LADEN', signCol: '#e8f0ff' },
      { x: 12, y: 10, w: 8, h: 5, door: 4, roof: '#7ab8e8', wall: '#f8fbff', to: 'arena13', sign: 'ARENA', signCol: '#f0f8ff' },
      { x: 2, y: 11, w: 5, h: 4, door: 2, roof: '#e8a8c8', to: 'haus_wh' },
    ],
    signs: { '8,7': 'WOLKENHAFEN\nDie Stadt über den Wolken.\n→ Wolkenpfad' },
    npcs: [
      { id: 'corvin_wh', x: 4, y: 7, dir: 'down', look: LK.corvin, name: 'Corvin' },
      { id: 'wh_kind', x: 15, y: 7, dir: 'left', look: LK.kid, name: 'Wolkenjunge', wander: 2 },
      { id: 'wh_frau', x: 6, y: 15, dir: 'right', look: LK.nia, name: 'Gärtnerin der Lüfte' },
    ],
    edges: { e: { to: 'wolkenpfad', dy: -1 } },
  },
  wolkenpfad: {
    name: 'Wolkenpfad', outdoor: true, enc: 'wolken', sky: true,
    rows: ['°°°°°°°°°°°°°°°°°°°°°°°°°°', '°::::...°°°°°°°°°..::::.°°', '°::::...°°°°°°°°°..::::..°', '°.......°°°::::°°........°', '°..,....°°°::::°°...,....°', '°.......°°°....°°........°', '°.......°°°....°°........°', '========BBB====BB=========', '°.......°°°....°°........°', '°..::::.°°°::::°°..::::..°', '°..::::.°°°°°°°°°..::::..°', '°.......°°°°°°°°°.......U°', '°,......°°°°°°°°°........°', '°°°°°°°°°°°°°°°°°°°°°°°°°°'],
    revier: [{ id: 'aerion', sp: 'aerion', lv: 85, x: 21, y: 5, r: 1, story: true, legend: true, showIf: 'badgeOrion', hideIf: 'aerion' }, { id: 'wp2_bock', sp: 'gewitterbock', lv: 80, x: 4, y: 11, r: 2 }],
    shy: [{ id: 'wp2_flausch', sp: 'flauschling', lv: 76, x: 13, y: 5, likes: 'honig' }],
    npcs: [
      tr('tr_pilotin', 4, 5, 'right', LK.jogger, 'Pilotin Kim', [['schwalbix', 77], ['sturmmoewe', 77], ['ballonix', 78]], 3100, 'Hier oben gibt es nur zwei Richtungen: vorwärts und abwärts!', 'Notlandung …'),
      tr('tr_wolke', 18, 8, 'left', LK.lass, 'Wolkenhirtin Mia', [['nebelschaf', 78], ['flauschling', 78], ['regenbogling', 78]], 3140, 'Meine Wolkenschafe sind die flauschigsten!', 'Verregnet …'),
    ],
    items: [{ id: 'it_wp3', x: 1, y: 12, item: 'sonderbonbon', n: 3 }, { id: 'it_wp4', x: 24, y: 2, item: 'topbeleber', n: 1 }],
    edges: { w: { to: 'wolkenhafen', dy: 1 }, e: { to: 'astralis', dy: 0 } },
  },
  astralis: {
    name: 'Astralis', outdoor: true, enc: null, sky: true,
    rows: astralis,
    buildings: [
      { x: 2, y: 1, w: 6, h: 4, door: 3, to: 'heal', heal: true, sign: 'HEIL', signCol: '#e8fff0' },
      { x: 11, y: 1, w: 5, h: 4, door: 2, to: 'shop', sign: 'LADEN', signCol: '#e8f0ff' },
      { x: 10, y: 9, w: 8, h: 5, door: 4, roof: '#2a2a6a', wall: '#e8e8f8', to: 'arena14', sign: 'STERNWARTE', signCol: '#f8f0a0' },
    ],
    signs: { '7,6': 'ASTRALIS\nDie Stadt, die den Sternen am nächsten ist.' },
    npcs: [
      { id: 'corvin_as', x: 3, y: 8, dir: 'right', look: LK.corvin, name: 'Corvin' },
      { id: 'as_forscher', x: 6, y: 12, dir: 'up', look: LK.clerk, name: 'Sternforscher Elio', wander: 1 },
    ],
    edges: { w: { to: 'wolkenpfad', dy: 0 } },
  },
  nocthal: {
    name: 'Nocthal', outdoor: true, enc: null, night: true, fog: true, fishing: true, fishEnc: 'see3',
    rows: nocthal,
    buildings: [
      { x: 5, y: 2, w: 6, h: 4, door: 3, to: 'heal', heal: true, sign: 'HEIL', signCol: '#e8fff0' },
      { x: 16, y: 2, w: 5, h: 4, door: 2, to: 'shop', sign: 'LADEN', signCol: '#e8f0ff' },
      { x: 15, y: 11, w: 8, h: 5, door: 4, roof: '#3a2a5a', wall: '#d8d0e8', to: 'arena15', sign: 'ARENA', signCol: '#e8e0ff' },
      { x: 5, y: 11, w: 5, h: 4, door: 2, roof: '#4a3a5a', wall: '#d8d0e0', to: 'haus_nt' },
    ],
    signs: { '4,7': 'NOCTHAL\nHier ist immer Nacht.\n↑ Geisterbucht' },
    npcs: [
      { id: 'crew_nt', x: 1, y: 9, dir: 'right', look: LK.jaro, name: 'Jaro (Steuermann)' },
      { id: 'nt_laterne', x: 10, y: 7, dir: 'down', look: LK.nebel, name: 'Laternenträgerin', wander: 1 },
    ],
    edges: { n: { to: 'geisterbucht', dx: -4 } },
  },
  geisterbucht: {
    name: 'Geisterbucht', outdoor: true, enc: 'schatten', night: true, fog: true,
    rows: bucht,
    revier: [{ id: 'gb_wolf', sp: 'nachtfuerst', lv: 86, x: 4, y: 14, r: 2 }],
    shy: [{ id: 'gb_falter', sp: 'seelenfalter', lv: 80, x: 16, y: 3, likes: 'klarbeere' }],
    npcs: [
      tr('tr_medium2', 5, 6, 'right', LK.nebel, 'Medium Agna', [['seelenfalter', 82], ['ballonix', 82], ['irrkrabbe', 83]], 3300, 'Die Toten haben mir von dir erzählt.', 'Sie lachen …'),
      tr('tr_wrack', 14, 14, 'left', LK.matrose, 'Wrackplünderer Sten', [['geisterkrabbe', 83], ['laternenhai', 83]], 3320, 'Das hier sind MEINE Wracks!', 'Gesunken …'),
      { id: 'vex2', x: 9, y: 2, dir: 'down', look: L2.vex, name: 'Jägerin Vex', hideIf: 'vex2' },
    ],
    items: [{ id: 'it_gb1', x: 1, y: 18, item: 'topbeleber', n: 2 }, { id: 'it_gb2', x: 18, y: 1, item: 'sternkristall', n: 5 }],
    edges: { s: { to: 'nocthal', dx: 4 }, n: { to: 'nachtfels', dx: 0 } },
  },
  nachtfels: {
    name: 'Nachtfels', outdoor: true, enc: null, night: true,
    rows: nachtfels,
    buildings: [
      { x: 2, y: 1, w: 6, h: 4, door: 3, to: 'heal', heal: true, sign: 'HEIL', signCol: '#e8fff0' },
      { x: 13, y: 1, w: 5, h: 4, door: 2, to: 'shop', sign: 'LADEN', signCol: '#e8f0ff' },
      { x: 13, y: 9, w: 8, h: 5, door: 4, roof: '#1e1430', wall: '#c8c0e0', to: 'arena16', sign: 'ARENA', signCol: '#f0e8a0', lock: 'vex2', lockText: ['Die Tür ist verschlossen. Ein Zettel: „Bin in der Geisterbucht. Die Jäger sind zurück. – Selene“'] },
    ],
    revier: [{ id: 'noctyra', sp: 'noctyra', lv: 88, x: 4, y: 8, r: 1, story: true, legend: true, showIf: 'badgeSelene', hideIf: 'noctyra' }],
    npcs: [
      { id: 'pip_nf', x: 10, y: 7, dir: 'down', look: LK.pip, name: 'Pip', showIf: 'badgeSelene', hideIf: 'tiefeOffen' },
      { id: 'tauchglocke', x: 6, y: 13, dir: 'up', look: L2.taucher, name: 'Glockentaucher Bo' },
    ],
    edges: { s: { to: 'geisterbucht', dx: 0 } },
  },
  tiefe: {
    name: 'Die Tiefe', outdoor: true, underwater: true, enc: 'tiefe', bg: 'wasser', darkRadius: 70,
    rows: ['RRRRRRRRRRRRRRRRRR', 'RsssRRsssssRRsssRR', 'Rs:sssss:::sssss:R', 'RssRRssRRRssRRsssR', 'Rs:ssss:::ssss:ssR', 'RRRssRRsssRRssRRRR', 'Rss:::sssssss:::sR', 'RssRRRRsssRRRRsssR', 'Rs:sssss:::sssss:R', 'RRssRRsssssRRssRRR', 'Rsss:::sssss:::ssR', 'RssssssssOsssssssR', 'RRRRRRRRsRRRRRRRRR'],
    warps: [{ x: 9, y: 11, to: 'nachtfels', tx: 6, ty: 14, dir: 'up' }, { x: 8, y: 12, to: 'grund', tx: 6, ty: 9, dir: 'up' }],
    npcs: [
      tr('tr_jaeger5', 4, 6, 'right', L2.jaeger, 'Gezeitenjäger', [['abyssor', 86], ['kristallkrebs', 86]], 3500, 'Die Professorin darf nicht gestört werden!', 'Zu tief …'),
      tr('tr_jaeger6', 13, 8, 'left', L2.jaeger, 'Gezeitenjägerin', [['tiefenwal', 86], ['eisenkrake', 87]], 3520, 'Der Weckruf hat begonnen. Es ist zu spät!', 'Luft … brauche Luft …'),
    ],
    items: [{ id: 'it_tf1', x: 1, y: 1, item: 'toptrank', n: 3 }, { id: 'it_tf2', x: 16, y: 10, item: 'topbeleber', n: 2 }],
  },
  grund: {
    name: 'Grund der Tiefe', outdoor: true, underwater: true, enc: null, bg: 'wasser', darkRadius: 96,
    rows: ['RRRRRRRRRRRRR', 'RsssssssssssR', 'RsssssssssssR', 'RsssssssssssR', 'RsssssssssssR', 'RsssssssssssR', 'RsssssssssssR', 'RsssssssssssR', 'RsssssssssssR', 'RsssssssssssR', 'RRRRRRsRRRRRR'],
    warps: [{ x: 6, y: 10, to: 'tiefe', tx: 8, ty: 11, dir: 'down' }],
    npcs: [
      { id: 'liv', x: 6, y: 2, dir: 'down', look: L3.liv, name: 'Kapitänin Liv', hideIf: 'livFrei' },
      { id: 'kehl_grund', x: 6, y: 5, dir: 'down', look: LK.kehl, name: 'Prof. Kehl', hideIf: 'kehlFinal' },
    ],
  },
  meereskrone: {
    name: 'Meereskrone', outdoor: true, enc: null,
    rows: meereskrone,
    buildings: [{ x: 5, y: 1, w: 10, h: 6, door: 4, roof: '#2a7ac8', wall: '#f8f8ff', to: 'liga2', sign: 'LIGA', signCol: '#e0f0ff' }],
    npcs: [{ id: 'crew_mk', x: 9, y: 12, dir: 'up', look: LK.jaro, name: 'Jaro (Steuermann)' }, { id: 'mk_waechter', x: 8, y: 8, dir: 'down', look: LK.matrose, name: 'Liga-Wächterin' }],
  },
  liga2: {
    name: 'Liga der Weiten See', indoor: true, gym: true,
    rows: ['###w###w###', 'ggggggggggg', 'ggggggggggg', 'IgggggggggI', 'ggggggggggg', 'IgggggggggI', 'ggggggggggg', 'IgggggggggI', 'ggggggggggg', 'IgggggggggI', 'ggggggggggg', 'IgggggggggI', 'ggggggggggg', 'ggggggggggg', 'gggggmggggg'],
    npcs: [
      { id: 'maris', x: 5, y: 1, dir: 'down', look: L3.maris, name: 'Meereskaiserin Maris' },
      { id: 'w2e4_4', x: 5, y: 4, dir: 'down', look: L3.solon, name: 'Top-4 Solon' },
      { id: 'w2e4_3', x: 5, y: 6, dir: 'down', look: L3.nyra, name: 'Top-4 Nyra' },
      { id: 'w2e4_2', x: 5, y: 8, dir: 'down', look: L3.freya, name: 'Top-4 Freya' },
      { id: 'w2e4_1', x: 5, y: 10, dir: 'down', look: L3.korvan, name: 'Top-4 Korvan' },
    ],
  },
  arena13: gym('Arena Wolkenhafen', ['###w###w###', 'ggggggggggg', 'g°°ggg°°ggg', 'ggggg°ggggg', '°°gggggg°°g', 'ggg°°gggggg', 'gggggg°°ggg', 'g°°gggggg°g', 'gggg°°ggggg', 'ggggggggggg', 'kgggggggggk', 'ggggggggggg', 'gggggmggggg'], 'seraphine', L3.seraphine, 'Himmelsläuferin Seraphine', tr('tr_gym13a', 1, 5, 'right', LK.jogger, 'Flugschüler Ben', [['schwalbix', 78], ['flauschling', 78]], 3120, 'Seraphine läuft über Wolken, als wären es Steine!', 'Abgestürzt …', 4), tr('tr_gym13b', 9, 9, 'left', LK.lass, 'Windtänzerin Ida', [['windgeist', 79], ['sturmfalke', 79], ['regenbogling', 79]], 3160, 'Spür den Wind – oder fall!', 'Windstill …', 4)),
  arena14: gym('Sternwarte Astralis', ['###w###w###', 'ggggggggggg', 'gIggIgIggIg', 'ggggggggggg', 'IgIIIgIIIgI', 'ggggggggggg', 'gIgIIgIIgIg', 'ggggggggggg', 'IIIgggggIII', 'ggggggggggg', 'kgggggggggk', 'ggggggggggg', 'gggggmggggg'], 'orion', L3.orion, 'Sterndeuter Orion', tr('tr_gym14a', 1, 5, 'right', LK.clerk, 'Astronomin Lyn', [['sternwisch', 80], ['teleskopix', 80]], 3200, 'Die Sterne sagen: Du verlierst!', 'Falsch berechnet …', 4), tr('tr_gym14b', 9, 7, 'left', LK.nebel, 'Sternseherin Ava', [['mondkaninchen', 80], ['nebulix', 81], ['kometara', 81]], 3240, 'Ich habe dich in den Sternen gesehen.', 'Sternschnuppe …', 4), { night: true }),
  arena15: gym('Arena Nocthal', ['###w###w###', 'ggggggggggg', 'gbgbgbgbgbg', 'ggggggggggg', 'bbbbgggbbbb', 'ggggggggggg', 'gbbbbgbbbbg', 'ggggggggggg', 'bggggbggggb', 'ggggggggggg', 'kgggggggggk', 'ggggggggggg', 'gggggmggggg'], 'mortis', L3.mortis, 'Totengräber Mortis', tr('tr_gym15a', 1, 5, 'right', LK.nebel, 'Trauerweib Hilde', [['ballonix', 82], ['irrkrabbe', 82]], 3280, 'Psst. Hier schlafen die Toten.', 'Aufgewacht …', 4), tr('tr_gym15b', 9, 7, 'left', LK.matrose, 'Geisterkapitän Ole', [['laternenhai', 83], ['wrackgolem', 83], ['seelenfalter', 83]], 3320, 'Mein Schiff sank vor hundert Jahren. Ich kämpfe trotzdem!', 'Zurück in die Tiefe …', 4), { night: true }),
  arena16: gym('Arena Nachtfels', ['###w###w###', 'ggggggggggg', 'gIggIgIggIg', 'ggggggggggg', 'IgIIIgIIIgI', 'ggggggggggg', 'gIgIIgIIgIg', 'ggggggggggg', 'IIIgggggIII', 'ggggggggggg', 'kgggggggggk', 'ggggggggggg', 'gggggmggggg'], 'selene', L3.selene, 'Mondpriesterin Selene', tr('tr_gym16a', 1, 5, 'right', LK.nebel, 'Nachtwandlerin Kia', [['schattenwolf', 84], ['schattquall', 84]], 3360, 'In der Nacht sind wir stark.', 'Der Morgen kommt …', 4), tr('tr_gym16b', 9, 7, 'left', LK.hiker, 'Schattenjäger Rune', [['nachtrochen', 85], ['finsterqualle', 85], ['mondmagier', 85]], 3400, 'Selene hat mir gezeigt, wie man im Dunkeln sieht.', 'Geblendet …', 4), { night: true }),
  haus_wh: { name: 'Wolkenhaus', indoor: true, rows: ['#K#ww#K#', 'oooooooo', 'ottooooY', 'ottooooo', 'oooouuoo', 'kooouuok', 'ooommooo'], npcs: [{ id: 'wh_alte', x: 5, y: 3, dir: 'left', look: LK.oma, name: 'Älteste der Lüfte' }] },
  haus_nt: { name: 'Laternenhaus', indoor: true, night: true, rows: ['#K#ww#K#', 'oooooooo', 'ottooooY', 'ottooooo', 'oooouuoo', 'kooouuok', 'ooommooo'], npcs: [{ id: 'nt_alte', x: 5, y: 3, dir: 'left', look: LK.oma, name: 'Laternenmacherin' }] },
};
export const ENC3 = {
  wolken: { rate: 0.13, list: [['flauschling', 20, 76, 80], ['schwalbix', 18, 76, 80], ['nebelschaf', 16, 76, 80], ['regenbogling', 10, 77, 81, 'day'], ['ballonix', 10, 77, 81], ['sturmmoewe', 12, 76, 80], ['glaskolibri', 4, 78, 81], ['windgeist', 4, 79, 82, 'night'], ['sternwisch', 10, 77, 81, 'night'], ['dornenrose', 3, 78, 81]] },
  schatten: { rate: 0.13, list: [['schattenwolf', 20, 80, 84], ['schattquall', 16, 80, 84], ['irrkrabbe', 16, 80, 84], ['seelenfalter', 10, 81, 84], ['nachtrochen', 10, 81, 85], ['sandgeist', 10, 80, 84], ['laternenhai', 6, 82, 85], ['traumschaf', 10, 80, 83], ['mondkaninchen', 8, 80, 83]] },
  tiefe: { rate: 0.12, list: [['tiefling', 26, 82, 86], ['perlenwurm', 18, 82, 86], ['kristallkrebs', 16, 83, 86], ['finsterqualle', 12, 83, 87], ['abyssor', 4, 85, 88], ['tiefenwal', 3, 85, 88], ['blitzaal', 14, 82, 86], ['eisenkrake', 5, 84, 87]] },
  see3: { rate: 1, list: [['mondfisch', 30, 80, 84], ['schattquall', 25, 80, 84], ['blitzaal', 15, 81, 85], ['schneckenhaus', 15, 80, 84], ['wellenreiterin', 6, 83, 86], ['lavawal', 2, 85, 88], ['korallendrache', 1, 86, 88]] },
};
