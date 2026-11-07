// Welt 3 – Nyxara (violetter Planet) und die Raumstation Halo
import { LOOK } from './maps.js';
import { LOOK2 } from './maps2.js';

export const LOOK4 = {
  oru: { skin: '#a898e8', hair: '#f8f0ff', outfit: '#3a2a6a', pants: '#2a1a4a', accent: '#80f8ff', jaw: true },
  nyxari: { skin: '#b8a8f0', hair: '#5a3aa8', outfit: '#e8e0ff', pants: '#5a4a8a', accent: '#f8e070' },
  nyxari2: { skin: '#a898e8', hair: '#f8a8e8', outfit: '#4a3a8a', pants: '#2a2050', accent: '#80ffff', pony: true },
  rask: { skin: '#d8c8b8', hair: '#3a3a4a', outfit: '#3a3a4a', pants: '#1a1a24', cap: '#5a5a6a', accent: '#ff5a5a', jaw: true },
  robo: { skin: '#a8b8c8', hair: '#5a6a7a', outfit: '#7a8a9a', pants: '#4a5a6a', accent: '#80ffff' },
  aura: { skin: '#a8f0ff', hair: '#e8f8ff', outfit: '#58c8e8', pants: '#3a8ab8', accent: '#ffffff', pony: true },
};
const L4 = LOOK4, LK = LOOK, L2 = LOOK2;
const tr = (id, x, y, dir, look, name, team, reward, line, lose, sight = 3) => ({ id, x, y, dir, look, name, trainer: { team, reward, sight, lines: [line], lose } });
const sq = (w, h, b, f) => Array.from({ length: h }, (_, y) => (y === 0 || y === h - 1) ? b.repeat(w) : b + f.repeat(w - 2) + b);
const put = (rows, y, x, str) => { rows[y] = rows[y].slice(0, x) + str + rows[y].slice(x + str.length); return rows; };

const lumara = sq(22, 16, 'D', '.'); put(lumara, 15, 9, '..'); for (let y = 1; y < 15; y++) put(lumara, y, 9, '=='); put(lumara, 6, 2, '='.repeat(18)); put(lumara, 9, 7, 'S'); put(lumara, 12, 14, 'A');
const station = (w, h) => sq(w, h, 'J', 'j');
const dock = station(18, 14); put(dock, 13, 8, 'jj'); put(dock, 0, 8, 'j'); put(dock, 4, 1, 'JJJJJJjJJJJJJJJJ'); put(dock, 9, 1, 'JJJJJJJJJjJJJJJJ'); put(dock, 2, 3, 'MM'); put(dock, 2, 13, 'MM'); put(dock, 6, 4, 'M'); put(dock, 7, 12, 'M'); put(dock, 11, 3, 'Q');
const kern = station(14, 12); put(kern, 11, 6, 'jj'); put(kern, 2, 2, 'M'); put(kern, 2, 11, 'M'); put(kern, 5, 3, 'I'); put(kern, 5, 10, 'I'); put(kern, 8, 3, 'I'); put(kern, 8, 10, 'I');
const herz = sq(16, 13, '°', 'p'); put(herz, 12, 7, 'pp'); for (const [y, x] of [[3, 3], [3, 12], [9, 3], [9, 12]]) put(herz, y, x, 'I');

export const MAPS4 = {
  landeplatz: {
    name: 'Nyxara – Landeplatz', outdoor: true, alien: true, enc: 'nyx1', bg: 'liga',
    rows: ['DDDDDDDDDDDDDDDDDDDD', 'D::::....R....::::.D', 'D::::..........:::.D', 'D....RR.....R......D', 'D..,.......,....R..D', 'D.......R..........D', 'D..:::.......:::....', 'D..:::.......:::....', 'D........R.........D', 'D.R....,.......R...D', 'D::::..........::::D', 'D::::....R.....::::D', 'D..................D', 'DDDDDDDDDDDDDDDDDDDD'],
    npcs: [{ id: 'pip_ny', x: 9, y: 6, dir: 'down', look: LK.pip, name: 'Pip', hideIf: 'nyxStart' }, { id: 'jaro_ny', x: 7, y: 6, dir: 'right', look: LK.jaro, name: 'Jaro', hideIf: 'nyxStart' }],
    items: [{ id: 'it_ny1', x: 1, y: 12, item: 'sternkristall', n: 5 }, { id: 'it_ny2', x: 18, y: 1, item: 'topbeleber', n: 2 }],
    edges: { e: { to: 'kristallwald', dy: 1 } },
  },
  kristallwald: {
    name: 'Kristallwald', outdoor: true, alien: true, enc: 'nyx2', bg: 'liga',
    rows: ['DDDDDDDDDDDD..DDDDDDDDDD', 'D:::....DD....DD....:::D', 'D:::....DD....DD....:::D', 'D......................D', 'D..RR..::::....::::..RRD', 'D......::::....::::....D', 'D...........RR.........D', '=......................=', '=......................=', 'D..::::..........::::..D', 'D..::::..DD..DD..::::..D', 'D........DD..DD........D', 'D.U..R..............R..D', 'D,....................,D', 'DDDDDDDDDDDDDDDDDDDDDDDD'],
    revier: [{ id: 'kw_baum', sp: 'kristallbaum', lv: 93, x: 21, y: 12, r: 2 }, { id: 'nyxion', sp: 'nyxion', lv: 95, x: 12, y: 1, r: 1, story: true, legend: true, showIf: 'oruMet', hideIf: 'nyxion' }],
    shy: [{ id: 'kw_fohlen', sp: 'sternenfohlen', lv: 90, x: 3, y: 12, likes: 'honig' }],
    npcs: [
      tr('tr_nyx1', 6, 3, 'down', L4.nyxari, 'Sternjäger Ulo', [['sternkatze', 91], ['meteorhund', 91], ['kometling', 92]], 4000, 'Ein Fremder! Bist du einer von den Stations-Leuten?', 'Du bist anders als sie …'),
      tr('tr_nyx2', 17, 11, 'left', L4.nyxari2, 'Kristallsängerin Mira-Ae', [['kristallspinne', 92], ['astroschnecke', 92], ['traumfalter', 92]], 4040, 'Die Kristalle singen von dir!', 'Dein Lied ist schön.'),
    ],
    items: [{ id: 'it_kw4', x: 22, y: 1, item: 'sonderbonbon', n: 5 }],
    edges: { w: { to: 'landeplatz', dy: -1 }, e: { to: 'halofuss', dy: 0 }, n: { to: 'lumara', dx: -3 } },
  },
  lumara: {
    name: 'Lumara', outdoor: true, alien: true, enc: null,
    rows: lumara,
    buildings: [
      { x: 2, y: 1, w: 6, h: 4, door: 3, to: 'heal', heal: true, sign: 'HEIL', signCol: '#e8fff0' },
      { x: 13, y: 1, w: 5, h: 4, door: 2, to: 'shop', sign: 'LADEN', signCol: '#e8f0ff' },
      { x: 13, y: 8, w: 6, h: 4, door: 3, roof: '#7a5ad8', wall: '#e8e0ff', to: 'haus_oru', sign: 'ÄLTESTER', signCol: '#f0e8ff' },
    ],
    signs: { '7,9': 'LUMARA\nDas Dorf der Nyxari.\nWillkommen, Sternenkind.' },
    npcs: [{ id: 'ly_kind', x: 5, y: 11, dir: 'right', look: L4.nyxari2, name: 'Nyxari-Kind', wander: 2 }, { id: 'ly_frau', x: 17, y: 13, dir: 'left', look: L4.nyxari, name: 'Nyxari-Händlerin' }],
    edges: { s: { to: 'kristallwald', dx: 3 } },
  },
  halofuss: {
    name: 'Fuß des Himmelsfadens', outdoor: true, alien: true, enc: 'nyx2', bg: 'liga',
    rows: ['DDDDDDDDDDDDDDDDDD', 'D......jjjj......D', 'D......jjjj......D', 'D..::..jjjj..::..D', 'D..::........::..D', 'D................D', 'D.R............R.D', '=................D', '=..::::....::::..D', 'D..::::....::::..D', 'D................D', 'DDDDDDDDDDDDDDDDDD'],
    warps: [{ x: 8, y: 1, to: 'halo_dock', tx: 8, ty: 12, dir: 'up' }, { x: 9, y: 1, to: 'halo_dock', tx: 9, ty: 12, dir: 'up' }],
    npcs: [
      tr('tr_robo1', 6, 4, 'right', L4.robo, 'Wachdroide K-7', [['satellor', 93], ['stationsmaus', 93]], 4100, 'ZUTRITT VERWEIGERT. EINDRINGLING ERKANNT.', 'SYSTEM … ÜBERLASTET …'),
      tr('tr_robo2', 11, 4, 'left', L4.robo, 'Wachdroide K-9', [['funkenwurm', 93], ['kristallspinne', 93], ['satellor', 94]], 4140, 'BEFEHL DER PROFESSORIN: NIEMAND BETRITT DEN HIMMELSFADEN.', 'FEHLER 404 …'),
    ],
    edges: { w: { to: 'kristallwald', dy: 0 } },
  },
  halo_dock: {
    name: 'Station Halo – Andockring', banner: true, enc: null, station: true,
    rows: dock,
    warps: [{ x: 8, y: 13, to: 'halofuss', tx: 8, ty: 2, dir: 'down' }, { x: 9, y: 13, to: 'halofuss', tx: 9, ty: 2, dir: 'down' }, { x: 8, y: 0, to: 'halo_kern', tx: 6, ty: 10, dir: 'up' }],
    npcs: [
      tr('tr_jaeger7', 3, 7, 'right', L2.jaeger, 'Gezeitenjäger', [['nebelhai', 94], ['gravitroll', 94]], 4200, 'Die Professorin ist im Kern. Du kommst zu spät!', 'Schwerelos besiegt …'),
      tr('tr_jaeger8', 13, 6, 'left', L2.jaeger, 'Gezeitenjägerin', [['kosmomeduse', 94], ['pulsarpanther', 95]], 4240, 'Diese Station gehört jetzt uns!', 'Nicht mehr lange …'),
      { id: 'rask', x: 8, y: 1, dir: 'down', look: L4.rask, name: 'Kommandant Rask', hideIf: 'haloFrei' },
      { id: 'aura_ki', x: 4, y: 11, dir: 'right', look: L4.aura, name: 'AURA (Stations-KI)' },
    ],
  },
  halo_kern: {
    name: 'Station Halo – Kern', banner: true, enc: null, station: true,
    rows: kern,
    warps: [{ x: 6, y: 11, to: 'halo_dock', tx: 8, ty: 1, dir: 'down' }, { x: 7, y: 11, to: 'halo_dock', tx: 8, ty: 1, dir: 'down' }],
    revier: [{ id: 'halora', sp: 'halora', lv: 96, x: 6, y: 2, r: 1, story: true, legend: true, showIf: 'haloFrei', hideIf: 'halora' }],
    npcs: [{ id: 'tor_herz', x: 7, y: 2, dir: 'down', look: LK.pip, name: 'Pip', showIf: 'haloFrei', hideIf: 'finale3' }],
  },
  sternenherz: {
    name: 'Das Sternenherz', outdoor: true, alien: true, space: true, enc: null, bg: 'liga',
    rows: herz,
    warps: [{ x: 7, y: 12, to: 'halo_kern', tx: 7, ty: 9, dir: 'down' }, { x: 8, y: 12, to: 'halo_kern', tx: 7, ty: 9, dir: 'down' }],
    revier: [{ id: 'kosmara', sp: 'kosmara', lv: 100, x: 7, y: 2, r: 1, story: true, legend: true, showIf: 'finale3', hideIf: 'kosmara' }],
    npcs: [{ id: 'kehl_herz', x: 7, y: 4, dir: 'down', look: LK.kehl, name: 'Maren Kehl', hideIf: 'finale3' }],
  },
  haus_oru: { name: 'Haus des Ältesten', indoor: true, rows: ['#K#ww#K#', 'oooooooo', 'ottooooY', 'ottooooo', 'oooouuoo', 'kooouuok', 'ooommooo'], npcs: [{ id: 'oru', x: 5, y: 3, dir: 'left', look: L4.oru, name: 'Ältester Oru' }] },
};
export const ENC4 = {
  nyx1: { rate: 0.13, list: [['kometling', 20, 88, 92], ['orbitling', 18, 88, 92], ['sternkatze', 14, 88, 92], ['mondsplitter', 14, 88, 92], ['lichtqualle', 12, 89, 92], ['sonnenkaefer2', 10, 88, 91], ['mikrostern', 8, 89, 92], ['nebelmoll', 8, 89, 93, 'night'], ['leerling', 6, 90, 93, 'night']] },
  nyx2: { rate: 0.13, list: [['kristallspinne', 14, 90, 94], ['astroschnecke', 14, 90, 94], ['meteorhund', 14, 90, 94], ['weltraumpilz', 12, 90, 93], ['kosmokoi', 10, 90, 93], ['funkenwurm', 10, 90, 93], ['planetkrabbe', 8, 91, 94], ['traumfalter', 8, 91, 94], ['zwielicht', 6, 91, 94, 'night'], ['schwarzloch', 4, 92, 95], ['sternenkind', 2, 93, 95], ['kernling', 2, 93, 95]] },
};
