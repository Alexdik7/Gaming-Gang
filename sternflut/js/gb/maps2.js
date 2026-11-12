// Welt 2 – Die Weite See, Teil 1: Treibholzinsel, Perlhafen, Korallenriff (unter Wasser), Korallenstadt, Frostholm
import { LOOK } from './maps.js';

export const LOOK2 = {
  nalu: { skin: '#a06a44', hair: '#1a1a2a', outfit: '#e8584a', pants: '#f8e0a0', accent: '#58c8d8', pony: true },
  kalle: { skin: '#c98e62', hair: '#d8d8d8', outfit: '#5a4a3a', pants: '#3a3a4a', cap: '#c84a3a', accent: '#f8c840', jaw: true },
  nami: { skin: '#c98e62', hair: '#58a8e8', outfit: '#2a4a8a', pants: '#f8f8ff', accent: '#80f0ff', pony: true },
  thalia: { skin: '#f0d8d0', hair: '#f87a9a', outfit: '#3aa888', pants: '#2a6a5a', accent: '#f8e0a0', pony: true },
  ingrid: { skin: '#f6e2d8', hair: '#f4f4f8', outfit: '#5a8ac8', pants: '#e8f0f8', cap: '#e8f0f8', accent: '#a8e8ff' },
  bjarne: { skin: '#d8a880', hair: '#c86a2a', outfit: '#6a6a78', pants: '#3a3a44', accent: '#e8b040', jaw: true },
  jaeger: { skin: '#c98e62', hair: '#2a2a3a', outfit: '#2a3a3a', pants: '#1a2020', cap: '#3a4a4a', accent: '#e8584a' },
  vex: { skin: '#e8c8b0', hair: '#c8303a', outfit: '#1a2a2a', pants: '#101818', accent: '#f8d040', pony: true },
  taucher: { skin: '#e8b892', hair: '#3a2a1a', outfit: '#2a6a9a', pants: '#2a3a5a', cap: '#f8c040', accent: '#f8f8ff' },
};
const L2 = LOOK2, LK = LOOK;
const tr = (id, x, y, dir, look, name, team, reward, line, lose, sight = 3) => ({ id, x, y, dir, look, name, trainer: { team, reward, sight, lines: [line], lose } });
const house = (name, id, look, nm) => ({ name, indoor: true, rows: ['#K#ww#K#', 'oooooooo', 'ottooooY', 'ottooooo', 'oooouuoo', 'kooouuok', 'ooommooo'], npcs: [{ id, x: 5, y: 3, dir: 'left', look, name: nm }] });
// Arena-Dungeon: Leiter oben Mitte, Berater unten, beliebig viele Trainer/Personen
const dgym = (name, rows, lid, look, lname, npcs, extra = {}) => ({ name, indoor: true, gym: true, rows, ...extra, npcs: [{ id: lid, x: 6, y: 1, dir: 'down', look, name: lname }, ...npcs, { id: 'guide', x: 4, y: 15, dir: 'up', look: LK.jogger, name: 'Arena-Berater' }] });
const gym = (name, rows, lid, look, lname, a, b, extra = {}) => ({ name, indoor: true, gym: true, rows, ...extra, npcs: [{ id: lid, x: 5, y: 1, dir: 'down', look, name: lname }, a, b, { id: 'guide', x: 3, y: 11, dir: 'up', look: LK.jogger, name: 'Arena-Berater' }] });
const town = (g) => ['~~~' + g.repeat(21), ...Array(6).fill('~~~s' + '.'.repeat(19) + g), '~~~sS' + '.'.repeat(18) + g, '~~~s' + '='.repeat(19) + g, '~BBBs' + '.'.repeat(18) + g, ...Array(5).fill('~~~s' + '.'.repeat(19) + g), '~BBBs' + '.'.repeat(18) + g, ...Array(3).fill('~~~s' + '.'.repeat(19) + g), '~~~' + g.repeat(21)];

export const MAPS2 = {
  treibholz: {
    name: 'Treibholzinsel', outdoor: true, enc: 'treib', fishing: true, fishEnc: 'see2', bg: 'strand',
    rows: ['~~~~~~~~~~~~~~~~~~~~~~', '~~~ssssssssssssss~~~~~', '~~ssTTTsssss::::ss~~~~', '~ssTTT:::sssss:::sss~~', '~ss:::::sssssss::ssss~', '~sss:::ssssssssssssss~', '~ssssssssssssssssssss~', '~ss::sssssssssss::sss~', '~ss::sssssssssss::sBB~', '~sssssssssssssssssss~~', '~~ssssTTsssss::sss~~~~', '~~~ssTTTsss::::ss~~~~~', '~~~~ssssssssss~~~~~~~~', '~~~~~~~~~~~~~~~~~~~~~~', '~~~~~~~~~~~~~~~~~~~~~~', '~~~~~~~~~~~~~~~~~~~~~~'],
    npcs: [
      { id: 'nalu', x: 20, y: 8, dir: 'left', look: L2.nalu, name: 'Fischerin Nalu' },
      { id: 'jaro_w2', x: 8, y: 6, dir: 'right', look: LK.jaro, name: 'Jaro', hideIf: 'w2crew' },
      { id: 'pip_w2a', x: 12, y: 6, dir: 'left', look: LK.pip, name: 'Pip', hideIf: 'w2crew' },
    ],
    shy: [{ id: 'tb_gecko', sp: 'blattgecko', lv: 60, x: 3, y: 9, likes: 'heilbeere' }],
    items: [{ id: 'it_tb1', x: 16, y: 1, item: 'sternkristall', n: 5 }, { id: 'it_tb2', x: 4, y: 12, item: 'hypertrank', n: 3 }],
  },
  perlhafen: {
    name: 'Perlhafen', outdoor: true, enc: null, fishing: true, fishEnc: 'see2',
    props: [{ k: 'stand', x: 17, y: 7, col: '#38b8c8', name: 'Perlmarkt', hello: 'Perlen, Muscheln, Kugeln aus allen Meeren!', goods: [['flutkristall', 900], ['muschel', 200], ['fisch', 180], ['tiefseekugel', 1800], ['toptrank', 2400], ['topbeleber', 3000]] }],
    rows: town('T'),
    buildings: [
      { x: 5, y: 2, w: 6, h: 4, door: 3, to: 'heal', heal: true, sign: 'HEIL', signCol: '#e8fff0' },
      { x: 13, y: 2, w: 5, h: 4, door: 2, to: 'shop', sign: 'LADEN', signCol: '#e8f0ff' },
      { x: 19, y: 2, w: 4, h: 4, door: 1, roof: '#38a8b8', to: 'haus_ph' },
      { x: 5, y: 11, w: 8, h: 5, door: 4, roof: '#7a5a3a', wall: '#e8d8c0', to: 'werft2', sign: 'WERFT', signCol: '#f0e0c0' },
      { x: 15, y: 11, w: 8, h: 5, door: 4, roof: '#2a7ac8', wall: '#e8f4ff', to: 'arena9', sign: 'ARENA', signCol: '#d8f0ff' },
    ],
    signs: { '4,7': 'PERLHAFEN\nDas Tor zur Weiten See.' },
    npcs: [
      { id: 'nalu_ph', x: 1, y: 9, dir: 'right', look: L2.nalu, name: 'Fischerin Nalu', hideIf: 'morgenstern' },
      { id: 'crew_ph', x: 1, y: 9, dir: 'right', look: LK.jaro, name: 'Jaro (Steuermann)', showIf: 'morgenstern' },
      { id: 'tauchmeister', x: 1, y: 15, dir: 'right', look: L2.taucher, name: 'Tauchmeister Oke' },
      { id: 'ph_frau', x: 10, y: 7, dir: 'down', look: LK.nia, name: 'Perlenhändlerin', wander: 1 },
      { id: 'pip_ph', x: 20, y: 17, dir: 'left', look: LK.pip, name: 'Pip', showIf: 'w2crew' },
    ],
  },
  korallenriff: {
    name: 'Korallenriff', outdoor: true, underwater: true, enc: 'riff', bg: 'wasser',
    rows: ['RRRRRRRRRssRRRRRRRRR', 'R:::ssssssss::::ss:R', 'R:::ssRRsssss::::ssR', 'Rssssss:::sssRRsss:R', 'Rss::ss:::ssssssss:R', 'RRRsssssssRRRsssssRR', 'R:::sss::::sss:::ssR', 'R:::sss::::sss:::ssR', 'RssssssssssssssssssR', 'Rss:::RRsssRR:::sssR', 'Rss:::RRsssRR:::sssR', 'RssssssssssssssssssR', 'R::::sssbsss::::sssR', 'R::::sssssss::::sssR', 'RsssssssssOssssssssR', 'RRRRRRRRRRRRRRRRRRRR'],
    warps: [{ x: 10, y: 14, to: 'perlhafen', tx: 2, ty: 15, dir: 'right' }],
    revier: [{ id: 'kr_hai', sp: 'tiefenhai', lv: 70, x: 14, y: 8, r: 2 }],
    shy: [{ id: 'kr_stern', sp: 'sternseer', lv: 64, x: 2, y: 8, likes: 'klarbeere' }],
    items: [{ id: 'it_kr1', x: 18, y: 1, item: 'tiefseekugel', n: 3 }, { id: 'it_kr2', x: 1, y: 11, item: 'muschel', n: 3 }],
    edges: { n: { to: 'korallenstadt', dx: 0 } },
  },
  korallenstadt: {
    name: 'Korallenstadt Coralis', outdoor: true, underwater: true, enc: null, bg: 'wasser',
    rows: ['RRRRRRRRRRRRRRRRRRRRRR', ...Array(5).fill('Rssssssss==ssssssssssR'), 'Rss================ssR', ...Array(10).fill('Rssssssss==ssssssssssR'), 'RRRRRRRRR==RRRRRRRRRRR'],
    buildings: [
      { x: 2, y: 1, w: 6, h: 4, door: 3, to: 'heal', heal: true, sign: 'HEIL', signCol: '#e8fff0' },
      { x: 13, y: 1, w: 5, h: 4, door: 2, to: 'shop', sign: 'LADEN', signCol: '#e8f0ff' },
      { x: 13, y: 9, w: 8, h: 5, door: 4, roof: '#e8687a', wall: '#f8e8e0', to: 'arena10', sign: 'ARENA', signCol: '#ffe8f0', lock: 'vex1', lockText: ['Die Tür ist versiegelt. Eine Wächterin: „Thalia verteidigt den Tempel gegen die Gezeitenjäger!“'] },
      { x: 2, y: 9, w: 5, h: 4, door: 2, roof: '#58b8a8', to: 'tempel_ks', sign: 'TEMPEL', signCol: '#e8fff8' },
    ],
    npcs: [
      { id: 'ks_waechterin', x: 11, y: 8, dir: 'down', look: L2.thalia, name: 'Korallenwächterin', wander: 1 },
      { id: 'ks_kind', x: 16, y: 15, dir: 'left', look: LK.kid, name: 'Kind mit Taucherhelm', wander: 2 },
      { id: 'ks_alte', x: 6, y: 15, dir: 'up', look: LK.oma, name: 'Alte Korallenhüterin' },
    ],
    edges: { s: { to: 'korallenriff', dx: 0 } },
  },
  tempel_ks: {
    name: 'Korallentempel', indoor: true, banner: true,
    rows: ['###w####w###', 'xxxxxZZxxxxx', 'xxIxxxxxxIxx', 'xxxxxxxxxxxx', 'xIxxxxxxxxIx', 'xxxxxxxxxxxx', 'xxxxxmmxxxxx'],
    npcs: [
      tr('tr_jaeger1', 2, 4, 'right', L2.jaeger, 'Gezeitenjäger', [['riffhai', 64], ['krakador', 65]], 2600, 'Das Sternenglas gehört der Professorin!', 'Tsk.'),
      tr('tr_jaeger2', 9, 3, 'left', L2.jaeger, 'Gezeitenjägerin', [['muraenix', 65], ['tiefenkrake', 65]], 2640, 'Noch ein Schritt und du bist Fischfutter!', 'Verdammt …'),
      { id: 'vex', x: 6, y: 2, dir: 'down', look: L2.vex, name: 'Jägerin Vex', hideIf: 'vex1' },
      { id: 'thalia_t', x: 3, y: 1, dir: 'down', look: L2.thalia, name: 'Thalia', hideIf: 'vex1' },
    ],
  },
  frosthafen: {
    name: 'Frosthafen', outdoor: true, enc: null, fishing: true, fishEnc: 'eismeer', bg: 'schnee',
    rows: town('G').map((r, i) => i === 0 ? '~~~GGGGGGGGGG==GGGGGGGGG' : r.replace(/\./g, 'n')),
    buildings: [
      { x: 5, y: 2, w: 6, h: 4, door: 3, to: 'heal', heal: true, sign: 'HEIL', signCol: '#e8fff0' },
      { x: 16, y: 2, w: 5, h: 4, door: 2, to: 'shop', sign: 'LADEN', signCol: '#e8f0ff' },
      { x: 15, y: 11, w: 8, h: 5, door: 4, roof: '#5a8ac8', wall: '#f0f8ff', to: 'arena11', sign: 'ARENA', signCol: '#e8f4ff' },
      { x: 5, y: 11, w: 5, h: 4, door: 2, roof: '#8a5a4a', wall: '#f0e8e0', to: 'haus_fr' },
    ],
    signs: { '4,7': 'FROSTHAFEN\nWo das Meer zu Eis wird.\n↑ Frostpfad' },
    npcs: [
      { id: 'crew_fr', x: 1, y: 9, dir: 'right', look: LK.jaro, name: 'Jaro (Steuermann)' },
      { id: 'fr_fischer', x: 10, y: 7, dir: 'down', look: LK.fischer, name: 'Eisfischer', wander: 1 },
      { id: 'fr_kind', x: 12, y: 17, dir: 'up', look: LK.kid, name: 'Mädchen im Pelz', wander: 2 },
    ],
    edges: { n: { to: 'frostpfad', dx: -4 } },
  },
  frostpfad: {
    name: 'Frostpfad', outdoor: true, enc: 'frost', bg: 'schnee',
    rows: ['GGGGGGGGG==GGGGGGGGG', 'Gnnyyynnn==nnnyyyynG', 'Gnnyyynnn==nnnyyyynG', 'GnnnnqnnnnnnnnnnqnnG', 'GyyynnnnniiiinnnnyyG', 'GyyynnnnniiiinnnnyyG', 'GnnnnnqnnnnnnnnnnnnG', 'GLLLLLLLnnnnLLLLLLLG', 'GnnyyyynnnnnnnyyynnG', 'GnnyyyynnnnnnnyyynqG', 'GnnnnnnnnnnnnnnnnOqG', 'GGnnnnnnnnnnnnnnnnqG', 'GnyyyynnnnnnnnyyyynG', 'GnyyyynnnnnnnnyyyynG', 'GnnnnnnnnnnnnnnnnnnG', 'GnnUnnnnnnnnnnnnnnnG', 'GyyynnnnnnnnnnnyyynG', 'GyyynnnnnnnnnnnyyynG', 'GnnnnnnnnnnnnnnnnnnG', 'GGGGGGGGGnnGGGGGGGGG'],
    warps: [{ x: 17, y: 10, to: 'erzmine', tx: 7, ty: 10, dir: 'up' }],
    revier: [{ id: 'fp_baer', sp: 'gletschbaer', lv: 74, x: 4, y: 14, r: 3 }],
    shy: [{ id: 'fp_hase', sp: 'firnhase', lv: 68, x: 16, y: 3, likes: 'heilbeere' }],
    npcs: [
      tr('tr_ski', 5, 6, 'right', LK.lass, 'Skiläuferin Frida', [['firnhase', 69], ['pingulo', 69], ['firneule', 70]], 2800, 'Ich fahre schneller als jede Lawine!', 'Hingefallen …'),
      tr('tr_pelz', 14, 14, 'left', LK.hiker, 'Pelzjäger Arvid', [['flockfuchs', 70], ['rentiro', 70], ['frostbrumm', 70]], 2840, 'Im Schnee überlebt nur der Stärkere!', 'Erfroren …'),
    ],
    items: [{ id: 'it_fp1', x: 1, y: 18, item: 'sonderbonbon', n: 2 }, { id: 'it_fp2', x: 18, y: 1, item: 'hypertrank', n: 3 }],
    edges: { s: { to: 'frosthafen', dx: 4 }, n: { to: 'eisgipfel', dx: 0 } },
  },
  eisgipfel: {
    name: 'Eisgipfel', outdoor: true, enc: 'frost', bg: 'schnee',
    rows: ['GGGGGGGGGGGGGGGGGGGG', 'GnnnnnnnnnnnnnnnnnnG', 'GnnqqnnnnnnnnnnqqnnG', 'GnnnnnnniiiinnnnnnnG', 'GnnnnnniiiiiinnnnnnG', 'GnnnnnnniiiinnnnnnnG', 'GnnqnnnnnnnnnnnnqnnG', 'GnnnnnnnnnnnnnnnnnnG', 'GGGGGGGGGnnGGGGGGGGG'],
    revier: [{ id: 'boreal', sp: 'boreal', lv: 80, x: 9, y: 2, r: 1, story: true, legend: true, showIf: 'erzFrei', hideIf: 'boreal' }],
    items: [{ id: 'it_eg1', x: 1, y: 1, item: 'topbeleber', n: 2 }],
    edges: { s: { to: 'frostpfad', dx: 0 } },
  },
  erzmine: {
    name: 'Erzmine', cave: true, enc: 'mine', bg: 'hoehle',
    rows: ['WWWWWWWcWWWWWWWW', 'WccccccccccccccW', 'WccWWccccccWWccW', 'WccWWccWWccWWccW', 'WccccccWWccccccW', 'WWWccWWccWWccWWW', 'WccccccccccccccW', 'WccWWWWccWWWWccW', 'WccccccccccccccW', 'WWWWWccccccWWWWW', 'WWWWWWccccWWWWWW', 'WWWWWWWcWWWWWWWW'],
    warps: [{ x: 7, y: 11, to: 'frostpfad', tx: 17, ty: 11, dir: 'down' }, { x: 7, y: 0, to: 'erzheim', tx: 10, ty: 15, dir: 'up' }],
    npcs: [
      tr('tr_jaeger3', 3, 6, 'right', L2.jaeger, 'Gezeitenjäger', [['bohrkoenig', 72], ['tiefenhai', 72]], 2880, 'Die Professorin bohrt nach Sternenglas. Störenfriede werden begraben!', 'Verschüttet …'),
      tr('tr_jaeger4', 12, 8, 'left', L2.jaeger, 'Gezeitenjägerin', [['frostkoloss', 73], ['krakador', 73]], 2920, 'Hier geht es nicht weiter!', 'Doch, geht es …'),
      { id: 'kehl_mine', x: 7, y: 2, dir: 'down', look: LK.kehl, name: 'Prof. Kehl', hideIf: 'kehlMine' },
    ],
    items: [{ id: 'it_em1', x: 1, y: 1, item: 'ak_sandsturz', n: 1 }, { id: 'it_em2', x: 14, y: 6, item: 'sternkristall', n: 4 }],
  },
  erzheim: {
    name: 'Erzheim', outdoor: true, enc: null, bg: 'berg',
    rows: ['qqqqqqqqqqqqqqqqqqqqqq', 'qnnnnnnnnnnnnnnnnnnnnq', 'qnnnnnnnnnnnnnnnnnnnnq', 'qnnnnnnnnnnnnnnnnnnnnq', 'qnnnnnnnnnnnnnnnnnnnnq', 'qnnnnnnnnnnnnnnnnnnnnq', 'qnn================nnq', 'qnnnnnnnn==nnnnnnnnnnq', 'qnnnnnnnn==nnnnnnnnnnq', 'qnnnnnnnn==nnnnnnnnnnq', 'qnnnnnnnn==nnnnnnnnnnq', 'qnnnnnnnn==nnnnnnnnnnq', 'qnnnnnnnn==nnnnnnnnnnq', 'qnnnnnnnn==nnnnnnnnnnq', 'qnnnnnnnn==nnnnnnnnnnq', 'qnnnnnnnn==nnnnnnnnnnq', 'qqqqqqqqqnqqqqqqqqqqqq'],
    warps: [{ x: 9, y: 16, to: 'erzmine', tx: 7, ty: 1, dir: 'down' }],
    buildings: [
      { x: 2, y: 1, w: 6, h: 4, door: 3, to: 'heal', heal: true, sign: 'HEIL', signCol: '#e8fff0' },
      { x: 13, y: 1, w: 5, h: 4, door: 2, to: 'shop', sign: 'LADEN', signCol: '#e8f0ff' },
      { x: 13, y: 9, w: 8, h: 5, door: 4, roof: '#6a6a78', wall: '#e0e0e8', to: 'arena12', sign: 'ARENA', signCol: '#f0f0f8', lock: 'kehlMine', lockText: ['Die Tür ist verriegelt. Ein Bergmann: „Bjarne ist in der Mine. Fremde bohren dort, wo sie nicht sollen.“'] },
    ],
    npcs: [{ id: 'eh_bergmann', x: 5, y: 8, dir: 'right', look: LK.hiker, name: 'Bergmann Sven' }, { id: 'eh_alte', x: 16, y: 15, dir: 'left', look: LK.oma, name: 'Alte Erzhändlerin' }],
  },
  werft2: { name: 'Werft von Perlhafen', indoor: true, rows: ['#w##w##w##w#', 'oooooooooooo', 'oKKoootooKKo', 'oooooooooooo', 'ottoooooooto', 'oooooooooooo', 'ooooommooooo'], npcs: [{ id: 'kalle', x: 5, y: 1, dir: 'down', look: L2.kalle, name: 'Werftmeister Kalle' }] },
  arena9: dgym('Arena Perlhafen', ['###w#####w###', 'kgggggggggggk', 'ggggggggggggg', '~~~~~~E~~~~~~', '~ggggggggggg~', '~gNggggggggg~', '~ggggg+ggggg~', '~~~~~~~~~~~~~', '~ggg~~~~~ggg~', '~g+g~~~~~g+g~', '~ggg~~~~~ggg~', '~~~~~~~~~~~~~', 'ggg+gg+gg+ggg', 'ggggggggggggg', 'ggggggggggggg', 'kgggggggggggk', 'ggggggmgggggg'], 'nami', L2.nami, 'Taucherin Nami', [tr('tr_gym9a', 1, 8, 'down', L2.taucher, 'Taucher Mo', [['tauchling', 61], ['lumifin', 61]], 2440, 'Nami taucht ohne Luft bis zum Grund!', 'Blubb …', 1), tr('tr_gym9b', 11, 8, 'down', LK.surfer, 'Surferin Kaia', [['perlmu', 62], ['riffhai', 62], ['walbo', 62]], 2480, 'Die Welle kommt – und sie trägt dich weg!', 'Abgeritten …', 2), tr('tr_gym9c', 10, 5, 'left', L2.taucher, 'Strudeltaucherin Fenja', [['walbo', 63], ['riffhai', 63]], 2520, 'Du hast den richtigen Strudel gefunden? Respekt!', 'Weggestrudelt …', 4), { id: 'arena_fan9', x: 3, y: 2, dir: 'down', look: L2.taucher, name: 'Strudelwärter Jannik', showIf: 'orden_nami' }], { hint: ['Rätsel-Tipp: Die Strudel tragen dich zu anderen Inseln – manche spülen dich zurück an den Anfang.', 'Auf der obersten Insel öffnet eine Platte die Schleuse zu Nami.'], gates: { '6,3': 'namiG' }, plates: { '2,5': 'namiG' }, warps: [{ x: 3, y: 12, to: 'arena9', tx: 1, ty: 10, dir: 'down' }, { x: 9, y: 12, to: 'arena9', tx: 11, ty: 10, dir: 'down' }, { x: 6, y: 12, to: 'arena9', tx: 6, ty: 14, dir: 'down' }, { x: 2, y: 9, to: 'arena9', tx: 4, ty: 4, dir: 'down' }, { x: 10, y: 9, to: 'arena9', tx: 6, ty: 14, dir: 'down' }, { x: 6, y: 6, to: 'arena9', tx: 6, ty: 14, dir: 'down' }], items: [{ id: 'it_ar9a', x: 9, y: 8, item: 'toptrank', n: 2 }, { id: 'it_ar9b', x: 12, y: 14, item: 'sternkristall', n: 3 }] }),
  arena10: dgym('Arena Coralis', ['###w#####w###', 'kgggggggggggk', 'ggggggggggggg', 'RRRRRRERRRRRR', 'NgggRgNgRgggN', 'ggggRgggRgggg', 'R@RRRgggRgggg', 'ggggRgggRgggg', 'ggggRgggRgggg', 'ggggRgggRgggg', 'ggggRgggRgggg', 'RgRRRRgRRRRgR', 'ggggggggggggg', 'ggggggggggggg', 'ggggggggggggg', 'kgggggggggggk', 'ggggggmgggggg'], 'thalia', L2.thalia, 'Riffhüterin Thalia', [tr('tr_gym10a', 6, 6, 'down', L2.taucher, 'Rifftaucher Lu', [['korallo', 66], ['kokokrabb', 66]], 2640, 'Das Riff schützt uns – und wir das Riff!', 'Ausgetaucht …', 4), tr('tr_gym10b', 2, 13, 'right', LK.nia, 'Anemonen-Pflegerin Tia', [['blattgecko', 66], ['sternseer', 67], ['perlmu', 67]], 2680, 'Psst, du störst die Anemonen!', 'Die armen Anemonen …', 3), tr('tr_gym10c', 10, 2, 'left', L2.taucher, 'Perlenwächterin Marei', [['korallo', 68], ['perlmu', 68]], 2720, 'Drei Perlenschalen hast du geöffnet. Jetzt öffne mich!', 'Die Schale klappt zu …', 4), { id: 'arena_fan10', x: 3, y: 2, dir: 'down', look: L2.taucher, name: 'Korallenpflegerin Svea', showIf: 'orden_thalia' }], { underwater: true, bReset: ['thalA', 'thalC'], hint: ['Rätsel-Tipp: Drei Perlenschalen öffnen das Riff-Tor.', 'Links musst du erst ein Loch füllen, rechts braucht die Schale einen schweren Brocken.'], gates: { '6,3': ['thalA', 'thalB', 'thalC'] }, plates: { '0,4': 'thalA', '6,4': 'thalB', '12,4': 'thalC' }, heavy: ['12,4'], boulders: [[1, 8], [12, 7]], items: [{ id: 'it_ar10a', x: 3, y: 4, item: 'toptrank', n: 2 }, { id: 'it_ar10b', x: 12, y: 10, item: 'sternkristall', n: 3 }] }),
  arena11: dgym('Arena Frosthafen', ['###w#####w###', 'kgggggggggggk', 'ggggggggggggg', 'bbbbbbEbbbbbb', 'iiiiiiiiiiibb', 'iibibiNiiiiii', 'iiiiiiiibiiii', 'iiiiiiiiiiiib', 'iibiiNiiibiii', 'iiiiiiiiibiii', 'ibiiiiiiiibbi', 'iiiiiiiiiiiii', 'iiiibiiiibiii', 'iiiibibbiiiii', 'iiiiibiibiibi', 'kgggggggggggk', 'ggggggmgggggg'], 'ingrid', L2.ingrid, 'Eiskönigin Ingrid', [tr('tr_gym11a', 1, 15, 'right', LK.lass, 'Eisläuferin Lene', [['pingulo', 70], ['kristallflocke', 70]], 2800, 'Auf dem Eis bin ich unschlagbar!', 'Ausgerutscht …', 2), tr('tr_gym11b', 10, 2, 'left', LK.hiker, 'Eisfischer Hakon', [['robbsi', 71], ['walrosser', 71]], 2840, 'Ingrid ist die Kälteste von allen. Im besten Sinne!', 'Eingebrochen …', 3), tr('tr_gym11c', 11, 15, 'left', LK.lass, 'Eistänzerin Malin', [['kristallflocke', 72], ['pingulo', 72]], 2880, 'Auf diesem Eis rutscht jeder – außer mir!', 'Pirouette verpatzt …', 2), { id: 'arena_fan11', x: 3, y: 2, dir: 'down', look: LK.hiker, name: 'Eisbildhauer Torvald', showIf: 'orden_ingrid' }], { hint: ['Rätsel-Tipp: Auf dem Eis rutschst du, bis dich etwas aufhält.', 'Zwei Frostsiegel liegen im Eisfeld. Erst wenn beide leuchten, öffnet sich Ingrids Tor.'], gates: { '6,3': ['ingA', 'ingB'] }, plates: { '6,5': 'ingA', '5,8': 'ingB' }, items: [{ id: 'it_ar11a', x: 1, y: 2, item: 'toptrank', n: 2 }, { id: 'it_ar11b', x: 11, y: 1, item: 'sternkristall', n: 3 }] }),
  arena12: dgym('Arena Erzheim', ['###w#####w###', 'kgggggggggggk', 'ggggggggggggg', 'MMMMMMEMMMMMM', 'ggggggggggggg', 'gMMMgggggMMMg', 'gggggggNggggg', 'ggggggggggggg', 'MM@MMMMMMM@MM', 'ggggggggggggg', 'gggggMgMggggg', 'ggggggggggggg', 'MMMM@MMM@MMMM', 'ggggggggggggg', 'ggggggggggggg', 'kgggggggggggk', 'ggggggmgggggg'], 'bjarne', L2.bjarne, 'Bergkönig Bjarne', [tr('tr_gym12a', 11, 13, 'left', LK.hiker, 'Bergmann Tor', [['erzkaefer', 74], ['zahnradling', 74]], 2960, 'Unter Tage gibt es kein Licht. Nur Erz!', 'Verschüttet …', 3), tr('tr_gym12b', 1, 9, 'right', LK.clerk, 'Schmiedin Lova', [['getriebor', 75], ['frostkoloss', 75]], 3000, 'Bjarne hat mir das Schmieden beigebracht!', 'Glühend heiß …', 3), tr('tr_gym12c', 11, 4, 'left', LK.hiker, 'Sprengmeister Knut', [['erzkaefer', 76], ['getriebor', 76]], 3040, 'Zwei Stollen freigeräumt? Jetzt kommt die Sprengung!', 'Blindgänger …', 4), { id: 'arena_fan12', x: 3, y: 2, dir: 'down', look: LK.hiker, name: 'Grubenwart Edda', showIf: 'orden_bjarne' }], { bReset: 'bjarG', hint: ['Rätsel-Tipp: Schieb die Erzbrocken in die Schächte, dann kommst du tiefer in die Grube.', 'Ganz oben braucht die Weichenplatte einen Brocken. Verkantet? Geh kurz raus.'], gates: { '6,3': 'bjarG' }, plates: { '7,6': 'bjarG' }, heavy: ['7,6'], boulders: [[4, 13], [8, 13], [2, 10], [10, 10], [7, 5]], items: [{ id: 'it_ar12a', x: 0, y: 4, item: 'toptrank', n: 2 }, { id: 'it_ar12b', x: 12, y: 9, item: 'sternkristall', n: 3 }] }),
  haus_ph: house('Perlenhaus', 'ph_alte', LK.oma, 'Alte Perlentaucherin'),
  haus_fr: house('Pelzhaus', 'fr_alte', LK.oma, 'Großmutter Siv'),
};

// Begegnungen in Welt 2 (Teil 1)
export const ENC2 = {
  treib: { rate: 0.12, list: [['palmspatz', 30, 58, 62], ['kokokrabb', 25, 58, 62], ['blattgecko', 20, 58, 62], ['tauchling', 10, 59, 62], ['sternseer', 4, 60, 63], ['tukarra', 3, 62, 64]] },
  see2: { rate: 1, list: [['tauchling', 30, 60, 66], ['tintling', 25, 60, 66], ['lumifin', 15, 61, 66], ['riffhai', 12, 62, 67], ['walbo', 8, 63, 67], ['muraenix', 8, 63, 67], ['mantarion', 2, 66, 68]] },
  riff: { rate: 0.13, list: [['korallo', 22, 62, 67], ['tauchling', 18, 62, 66], ['tintling', 16, 62, 66], ['perlmu', 12, 63, 67], ['lumifin', 12, 63, 67], ['riffhai', 8, 64, 68], ['muraenix', 6, 64, 68], ['walbo', 4, 65, 68], ['sirenia', 1, 68, 70], ['tiefenkrake', 1, 68, 70, 'night']] },
  eismeer: { rate: 1, list: [['robbsi', 40, 68, 72], ['pingulo', 30, 68, 72], ['walbo', 15, 68, 72], ['walrosser', 10, 71, 73], ['tiefenhai', 5, 72, 74]] },
  frost: { rate: 0.13, list: [['flockfuchs', 18, 68, 73], ['firnhase', 18, 68, 72], ['pingulo', 14, 68, 72], ['rentiro', 14, 69, 73], ['frostbrumm', 10, 69, 73], ['kristallflocke', 10, 70, 73], ['firneule', 6, 70, 74], ['frostdrak', 3, 71, 74], ['mammuto', 2, 72, 75], ['firngeist', 8, 70, 74, 'night'], ['aurorafalter', 1, 73, 75, 'night'], ['frostschwinge', 2, 72, 75]] },
  mine: { rate: 0.09, list: [['erzkaefer', 30, 70, 74], ['kristallflocke', 18, 70, 74], ['frostbrumm', 16, 70, 74], ['bohrkoenig', 8, 73, 75], ['echolot', 16, 70, 73], ['frostkoloss', 3, 74, 76], ['frostdrak', 4, 71, 74]] },
};
export const ITEMS2 = {
  taucherhelm: { name: 'Taucherhelm', desc: 'Von Taucherin Nami. Damit tauchst du an Tauchstellen unter Wasser (Tauchmeister am Steg).', key: true },
  tiefseekugel: { name: 'Tiefseekugel', desc: 'Unter Wasser und bei Wasser-Kreaturen 4-fache Chance.', ball: 1, col: '#1a4a98', cond: 'tief' },
};
