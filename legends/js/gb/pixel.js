// Prozedurale Pixel-Art: Kacheln (16×16), Gebäude, Spielfiguren (16×18, 4 Richtungen × 3 Frames), Objekte
import { mulberry } from '../core/noise.js';

export const T = 16;
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))); return '#' + ((f(r) << 16) | (f(g) << 8) | f(b)).toString(16).padStart(6, '0'); };
export { shade };

// ---------------------------------------------------------------- Kacheln
const PAL = { g1: '#70c858', g2: '#58b048', g3: '#98e070', gD: '#3e8a3a', path: '#e0c890', path2: '#c8a870', sand: '#f0e0a8', w1: '#4890e0', w2: '#78b8f8', w3: '#2868b8' };

function grass(x, seed, dark = false) {
  const r = mulberry(seed);
  x.fillStyle = dark ? '#4a9a48' : PAL.g1; x.fillRect(0, 0, 16, 16);
  for (let i = 0; i < 7; i++) { const a = Math.floor(r() * 15), b = Math.floor(r() * 14); x.fillStyle = dark ? '#3a7a3a' : PAL.g2; x.fillRect(a, b, 1, 2); x.fillStyle = dark ? '#5aaa58' : PAL.g3; x.fillRect(a + 1, b, 1, 1); }
}
const DRAW = {
  grass: (x, f, s) => grass(x, s),
  flowers: (x, f, s) => {
    grass(x, s);
    const cols = [['#f85878', '#ffd0e0'], ['#f8f8f8', '#f8e060'], ['#f8d030', '#fff8b0']];
    for (const [a, b, k] of [[3, 4, 0], [10, 9, 1], [5, 12, 2], [12, 2, 1]]) {
      const [c1, c2] = cols[(k + s) % 3]; const o = f ? 1 : 0;
      x.fillStyle = c1; x.fillRect(a - 1, b + o, 3, 1); x.fillRect(a, b - 1 + o, 1, 3); x.fillStyle = c2; x.fillRect(a, b + o, 1, 1);
    }
  },
  tall: (x, f, s) => {
    x.fillStyle = '#58b048'; x.fillRect(0, 0, 16, 16);
    tallBlades(x, f, 0);
  },
  path: (x, f, s) => {
    const r = mulberry(s + 9); x.fillStyle = PAL.path; x.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 5; i++) { x.fillStyle = PAL.path2; x.fillRect(Math.floor(r() * 15), Math.floor(r() * 15), 2, 1); }
    x.fillStyle = '#f0e0b0'; x.fillRect(Math.floor(r() * 14), Math.floor(r() * 14), 1, 1);
  },
  sand: (x, f, s) => { const r = mulberry(s + 3); x.fillStyle = PAL.sand; x.fillRect(0, 0, 16, 16); for (let i = 0; i < 4; i++) { x.fillStyle = '#d8c888'; x.fillRect(Math.floor(r() * 15), Math.floor(r() * 15), 1, 1); } },
  water: (x, f, s) => {
    x.fillStyle = PAL.w1; x.fillRect(0, 0, 16, 16);
    x.fillStyle = '#3c80d0'; x.fillRect(0, 0, 16, 2); x.fillRect(0, 8, 16, 1);
    if ((s + f) % 4 === 0) { x.fillStyle = '#e8f8ff'; x.fillRect(6, 5, 1, 1); }
    x.fillStyle = PAL.w2; for (const [a, b] of [[2, 3], [9, 7], [4, 12], [12, 13]]) x.fillRect((a + f * 2) % 16, b, 4, 1);
    x.fillStyle = PAL.w3; for (const [a, b] of [[7, 1], [1, 8], [11, 4]]) x.fillRect((a + 16 - f) % 16, b, 3, 1);
  },
  tree: (x, f, s) => { grass(x, s); treeTop(x, '#2e8a3e', '#48a850', '#78d068', '#1a4a28'); },
  dtree: (x, f, s) => { grass(x, s, true); treeTop(x, '#24584a', '#2f7058', '#4a9a78', '#0e2a26'); },
  pine: (x, f, s) => {
    grass(x, s); const o = '#163a24';
    x.fillStyle = '#6a4a30'; x.fillRect(7, 12, 2, 4);
    for (const [y, w] of [[1, 2], [3, 6], [6, 10], [9, 14]]) { x.fillStyle = o; x.fillRect(8 - w / 2 - 1, y, w + 2, 4); }
    for (const [y, w] of [[1, 2], [3, 6], [6, 10], [9, 14]]) { x.fillStyle = '#2a7a44'; x.fillRect(8 - w / 2, y + 1, w, 3); x.fillStyle = '#48a860'; x.fillRect(8 - w / 2, y + 1, Math.max(1, w / 3), 1); }
  },
  crock: (x, f, s) => { DRAW.cave(x, f, s); DRAW.rockTop(x); },
  rockTop: x => {
    x.fillStyle = '#404048'; x.beginPath(); x.ellipse(8, 9, 7, 6, 0, 0, 7); x.fill();
    x.fillStyle = '#98989c'; x.beginPath(); x.ellipse(8, 8.5, 6, 5, 0, 0, 7); x.fill();
    x.fillStyle = '#c8c8cc'; x.fillRect(5, 5, 4, 2); x.fillStyle = '#707078'; x.fillRect(9, 11, 4, 1);
  },
  rock: (x, f, s) => {
    grass(x, s); x.fillStyle = '#404048'; x.beginPath(); x.ellipse(8, 9, 7, 6, 0, 0, 7); x.fill();
    x.fillStyle = '#98989c'; x.beginPath(); x.ellipse(8, 8.5, 6, 5, 0, 0, 7); x.fill();
    x.fillStyle = '#c8c8cc'; x.fillRect(5, 5, 4, 2); x.fillStyle = '#707078'; x.fillRect(9, 11, 4, 1);
  },
  fence: (x, f, s) => {
    grass(x, s); x.fillStyle = '#5a3a20'; x.fillRect(0, 6, 16, 4); x.fillRect(2, 3, 3, 11); x.fillRect(11, 3, 3, 11);
    x.fillStyle = '#c89058'; x.fillRect(0, 7, 16, 2); x.fillRect(3, 4, 1, 9); x.fillRect(12, 4, 1, 9);
  },
  ledge: (x, f, s) => {
    grass(x, s); x.fillStyle = '#3e7a30'; x.fillRect(0, 10, 16, 3); x.fillStyle = '#a8784a'; x.fillRect(0, 13, 16, 3); x.fillStyle = '#7a5030'; x.fillRect(0, 15, 16, 1);
    x.fillStyle = '#98e070'; x.fillRect(0, 9, 16, 1);
  },
  sign: (x, f, s) => {
    grass(x, s); x.fillStyle = '#5a3a20'; x.fillRect(7, 9, 2, 6); x.fillRect(2, 2, 12, 9);
    x.fillStyle = '#d8a868'; x.fillRect(3, 3, 10, 7); x.fillStyle = '#8a6038'; x.fillRect(4, 5, 8, 1); x.fillRect(4, 7, 6, 1);
  },
  bridge: (x, f, s) => {
    DRAW.water(x, f, s); x.fillStyle = '#6a4a28'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#b8884a';
    for (let i = 0; i < 4; i++) x.fillRect(0, i * 4 + 1, 16, 2);
    x.fillStyle = '#4a3018'; x.fillRect(0, 0, 1, 16); x.fillRect(15, 0, 1, 16);
  },
  cave: (x, f, s) => { const r = mulberry(s + 77); x.fillStyle = '#a88a68'; x.fillRect(0, 0, 16, 16); for (let i = 0; i < 6; i++) { x.fillStyle = r() < 0.5 ? '#8a7050' : '#c0a080'; x.fillRect(Math.floor(r() * 15), Math.floor(r() * 15), 2, 1); } },
  cwall: (x, f, s) => {
    const r = mulberry(s + 55); x.fillStyle = '#5a4030'; x.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 5; i++) { const a = Math.floor(r() * 12), b = Math.floor(r() * 12); x.fillStyle = '#7a5a40'; x.fillRect(a, b, 5, 3); x.fillStyle = '#9a7a58'; x.fillRect(a, b, 5, 1); }
    x.fillStyle = '#3a2818'; x.fillRect(0, 14, 16, 2);
  },
  hole: (x, f, s) => { DRAW.cwall(x, f, s); x.fillStyle = '#100808'; x.beginPath(); x.ellipse(8, 11, 6, 7, 0, Math.PI, 0); x.fill(); x.fillRect(2, 11, 12, 5); },
  stone: (x, f, s) => {
    x.fillStyle = '#b8b0a0'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#9a9282'; x.fillRect(0, 7, 16, 1); x.fillRect(0, 15, 16, 1); x.fillRect(7, 0, 1, 7); x.fillRect(3, 8, 1, 7); x.fillRect(12, 8, 1, 7);
    x.fillStyle = '#6aa848'; if (s % 3 === 0) x.fillRect(1, 13, 3, 2);
  },
  pillar: (x, f, s) => {
    DRAW.stone(x, f, s); x.fillStyle = '#5a5850'; x.fillRect(3, 0, 10, 16); x.fillStyle = '#d8d0c0'; x.fillRect(4, 0, 8, 15); x.fillStyle = '#b0a898'; x.fillRect(9, 0, 3, 15); x.fillRect(4, 3, 8, 1);
    x.fillStyle = '#6aa848'; x.fillRect(4, 12, 3, 3);
  },
  altar: (x, f, s) => {
    DRAW.stone(x, f, s); x.fillStyle = '#4a4840'; x.fillRect(1, 6, 14, 10); x.fillStyle = '#8a8478'; x.fillRect(2, 7, 12, 8);
    x.fillStyle = f ? '#9cffc8' : '#5aa888'; x.beginPath(); x.moveTo(8, 0); x.lineTo(12, 5); x.lineTo(8, 10); x.lineTo(4, 5); x.fill();
    x.fillStyle = '#ffffff'; x.fillRect(7, 2, 1, 3);
  },
  rune: (x, f, s) => {
    grass(x, s, true); x.fillStyle = '#3a3a40'; x.fillRect(3, 1, 10, 15); x.fillStyle = '#8a8890'; x.fillRect(4, 2, 8, 13);
    x.fillStyle = '#5a5860'; x.fillRect(6, 5, 4, 1); x.fillRect(7, 5, 2, 6); x.fillRect(5, 9, 6, 1);
  },
  runeOn: (x, f, s) => {
    grass(x, s, true); x.fillStyle = '#3a3a40'; x.fillRect(3, 1, 10, 15); x.fillStyle = '#9aa8a0'; x.fillRect(4, 2, 8, 13);
    x.fillStyle = f ? '#5affd0' : '#c8fff0'; x.fillRect(6, 5, 4, 1); x.fillRect(7, 5, 2, 6); x.fillRect(5, 9, 6, 1);
  },
  // Innenräume
  floor: (x, f, s) => { x.fillStyle = '#e0b880'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#c89860'; x.fillRect(0, 7, 16, 1); x.fillRect(0, 15, 16, 1); x.fillRect((s % 2) * 8 + 3, 0, 1, 7); x.fillRect(((s + 1) % 2) * 8 + 5, 8, 1, 7); },
  tilefl: (x, f, s) => { x.fillStyle = '#f0f0e8'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#d0d8e0'; x.fillRect(0, 0, 8, 8); x.fillRect(8, 8, 8, 8); },
  wall: (x, f, s) => { x.fillStyle = '#f8ecd0'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#e0d0b0'; for (let i = 0; i < 16; i += 4) x.fillRect(i, 0, 1, 12); x.fillStyle = '#a07850'; x.fillRect(0, 12, 16, 4); x.fillStyle = '#c89868'; x.fillRect(0, 12, 16, 1); },
  window: (x, f, s) => { DRAW.wall(x, f, s); x.fillStyle = '#6a4a30'; x.fillRect(3, 2, 10, 8); x.fillStyle = '#a8e0ff'; x.fillRect(4, 3, 8, 6); x.fillStyle = '#ffffff'; x.fillRect(5, 4, 2, 2); x.fillStyle = '#6a4a30'; x.fillRect(7, 3, 1, 6); },
  counter: (x, f, s) => { DRAW.tilefl(x, f, s); x.fillStyle = '#7a4a2a'; x.fillRect(0, 2, 16, 13); x.fillStyle = '#c87848'; x.fillRect(0, 2, 16, 4); x.fillStyle = '#e8a070'; x.fillRect(0, 2, 16, 1); },
  table: (x, f, s) => { DRAW.floor(x, f, s); x.fillStyle = '#6a4020'; x.fillRect(1, 3, 14, 10); x.fillStyle = '#b8783a'; x.fillRect(2, 4, 12, 7); x.fillStyle = '#d89858'; x.fillRect(2, 4, 12, 1); x.fillStyle = '#6a4020'; x.fillRect(2, 13, 2, 3); x.fillRect(12, 13, 2, 3); },
  bed: (x, f, s) => { DRAW.floor(x, f, s); x.fillStyle = '#4a3020'; x.fillRect(1, 0, 14, 16); x.fillStyle = '#ffffff'; x.fillRect(2, 1, 12, 4); x.fillStyle = '#e85870'; x.fillRect(2, 6, 12, 9); x.fillStyle = '#f888a0'; x.fillRect(2, 6, 12, 2); },
  tv: (x, f, s) => { DRAW.floor(x, f, s); x.fillStyle = '#303038'; x.fillRect(1, 2, 14, 11); x.fillStyle = f ? '#68a8f0' : '#88c8ff'; x.fillRect(3, 4, 10, 7); x.fillStyle = '#5a3a20'; x.fillRect(2, 13, 12, 3); },
  shelf: (x, f, s) => { DRAW.wall(x, f, s); x.fillStyle = '#5a3a20'; x.fillRect(1, 0, 14, 16); const c = ['#e85858', '#5878e8', '#58c868', '#f8c838', '#a868e8']; for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) { x.fillStyle = c[(i + r + s) % 5]; x.fillRect(2 + i * 2.5, 1 + r * 5, 2, 4); } },
  machine: (x, f, s) => { DRAW.tilefl(x, f, s); x.fillStyle = '#3a4a5a'; x.fillRect(1, 0, 14, 15); x.fillStyle = '#c8d8e8'; x.fillRect(2, 1, 12, 6); x.fillStyle = f ? '#5affb0' : '#38c888'; for (let i = 0; i < 3; i++) x.fillRect(3 + i * 4, 9, 3, 3); },
  pc: (x, f, s) => { DRAW.tilefl(x, f, s); x.fillStyle = '#5a6070'; x.fillRect(2, 1, 12, 10); x.fillStyle = f ? '#58f8a8' : '#48d090'; x.fillRect(3, 2, 10, 7); x.fillStyle = '#8890a0'; x.fillRect(1, 11, 14, 4); },
  plant: (x, f, s) => { DRAW.floor(x, f, s); x.fillStyle = '#b8582a'; x.fillRect(4, 10, 8, 6); x.fillStyle = '#2e8a3e'; x.beginPath(); x.arc(8, 6, 6, 0, 7); x.fill(); x.fillStyle = '#58c060'; x.fillRect(5, 3, 3, 3); },
  rug: (x, f, s) => { x.fillStyle = '#c84848'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#f8d870'; x.fillRect(1, 1, 14, 1); x.fillRect(1, 14, 14, 1); x.fillStyle = '#e86868'; x.fillRect(3, 4, 10, 8); },
  mat: (x, f, s) => { DRAW.floor(x, f, s); x.fillStyle = '#7a2838'; x.fillRect(2, 4, 12, 10); x.fillStyle = '#b84858'; x.fillRect(3, 5, 10, 8); },
  orbs: (x, f, s) => { DRAW.table(x, f, s); for (const [a, c] of [[3, '#ff7a33'], [8, '#3d9bff'], [13, '#4fcf5c']]) { x.fillStyle = '#202030'; x.beginPath(); x.arc(a, 6.5, 2.4, 0, 7); x.fill(); x.fillStyle = c; x.beginPath(); x.arc(a, 6.5, 1.7, 0, 7); x.fill(); x.fillStyle = '#fff'; x.fillRect(a - 1, 5, 1, 1); } },
  // Beerenbusch (Variante bestimmt Beerenfarbe)
  berry: (x, f, s) => {
    grass(x, s); x.fillStyle = 'rgba(0,40,0,.25)'; x.fillRect(2, 13, 12, 2);
    x.fillStyle = '#1e4a24'; x.beginPath(); x.arc(8, 8, 7, 0, 7); x.fill();
    x.fillStyle = '#3a8a3a'; x.beginPath(); x.arc(8, 8, 6, 0, 7); x.fill();
    x.fillStyle = '#5aaa4a'; x.beginPath(); x.arc(7, 6.5, 4, 0, 7); x.fill();
    const c = s % 2 ? ['#4a68e8', '#a8c0ff'] : ['#e83a4a', '#ffb0b8'];
    for (const [a, b] of [[4, 6], [9, 4], [11, 9], [6, 10]]) { x.fillStyle = c[0]; x.fillRect(a, b, 2, 2); x.fillStyle = c[1]; x.fillRect(a, b, 1, 1); }
  },
  // Region Frostheim
  snow: (x, f, s) => {
    const r = mulberry(s + 13); x.fillStyle = '#eef4fa'; x.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 6; i++) { x.fillStyle = r() < 0.6 ? '#d4e0ee' : '#ffffff'; x.fillRect(Math.floor(r() * 15), Math.floor(r() * 15), r() < 0.5 ? 2 : 1, 1); }
    if (s % 4 === 1) { x.fillStyle = '#b8c8dc'; x.fillRect(4, 11, 3, 1); }
  },
  snowtall: (x, f, s) => { x.fillStyle = '#d8e4f0'; x.fillRect(0, 0, 16, 16); tallBlades(x, f, 0, 'snow'); },
  ice: (x, f, s) => {
    x.fillStyle = '#a8d4f0'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#c4e4f8'; x.fillRect(0, 0, 16, 2); x.fillRect(0, 8, 16, 1);
    x.fillStyle = '#ffffff'; x.fillRect(3 + (s % 3), 3, 4, 1); x.fillRect(4 + (s % 3), 4, 2, 1); x.fillRect(10, 11, 3, 1);
    x.fillStyle = '#88b8dc'; x.fillRect(12, 2, 1, 4); x.fillRect(1, 12, 4, 1);
  },
  snowpine: (x, f, s) => {
    DRAW.snow(x, f, s); const o = '#1e3a3a';
    x.fillStyle = 'rgba(40,60,90,.2)'; x.fillRect(3, 14, 10, 2);
    x.fillStyle = '#5a3a24'; x.fillRect(7, 12, 2, 4);
    for (const [y, w] of [[1, 2], [3, 6], [6, 10], [9, 14]]) { x.fillStyle = o; x.fillRect(8 - w / 2 - 1, y, w + 2, 4); }
    for (const [y, w] of [[1, 2], [3, 6], [6, 10], [9, 14]]) { x.fillStyle = '#2e6a5a'; x.fillRect(8 - w / 2, y + 1, w, 3); x.fillStyle = '#f4f8ff'; x.fillRect(8 - w / 2, y + 1, Math.max(1, w * 0.6), 1); }
  },
  snowrock: (x, f, s) => {
    DRAW.snow(x, f, s); x.fillStyle = '#3a4658'; x.beginPath(); x.ellipse(8, 9, 7, 6, 0, 0, 7); x.fill();
    x.fillStyle = '#8a98aa'; x.beginPath(); x.ellipse(8, 9, 6, 5, 0, 0, 7); x.fill();
    x.fillStyle = '#f4f8ff'; x.beginPath(); x.ellipse(7, 6, 5, 2.5, 0, 0, 7); x.fill(); x.fillStyle = '#5a687a'; x.fillRect(9, 11, 4, 1);
  },
  // Eklipse-Versteck
  metal: (x, f, s) => {
    x.fillStyle = '#5a6070'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#48505e'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 0, 1, 16); x.fillRect(8, 0, 1, 16); x.fillRect(0, 8, 16, 1);
    x.fillStyle = '#6e7686'; x.fillRect(1, 1, 7, 1); x.fillRect(9, 9, 7, 1); x.fillStyle = '#8a92a2'; x.fillRect(3, 4, 1, 1); x.fillRect(12, 12, 1, 1);
    if (s % 5 === 0) { x.fillStyle = '#9a7ae8'; x.fillRect(5, 11, 6, 1); }
  },
  mwall: (x, f, s) => {
    x.fillStyle = '#1e1a2a'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#2e2840'; x.fillRect(1, 1, 14, 11); x.fillStyle = '#3e3656'; x.fillRect(1, 1, 14, 2);
    x.fillStyle = '#140f1e'; x.fillRect(0, 13, 16, 3); x.fillStyle = f ? '#c8a8ff' : '#8a6ad8'; x.fillRect(6, 6, 4, 2);
  },
  // Region Ignis
  ash: (x, f, s) => {
    const r = mulberry(s + 31); x.fillStyle = '#9a8a7a'; x.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 7; i++) { x.fillStyle = r() < 0.5 ? '#867664' : '#b0a090'; x.fillRect(Math.floor(r() * 15), Math.floor(r() * 15), r() < 0.5 ? 2 : 1, 1); }
    if (s % 4 === 0) { x.fillStyle = '#5a4a40'; x.fillRect(10, 11, 2, 1); x.fillStyle = '#c8b8a8'; x.fillRect(10, 10, 2, 1); }
  },
  ashtall: (x, f, s) => { x.fillStyle = '#8a7a68'; x.fillRect(0, 0, 16, 16); tallBlades(x, f, 0, 'ash'); },
  lava: (x, f, s) => {
    x.fillStyle = '#e8481a'; x.fillRect(0, 0, 16, 16);
    x.fillStyle = '#f88a2a'; for (const [a, b] of [[2, 2], [9, 6], [4, 11], [12, 12]]) x.fillRect((a + f * 2) % 16, b, 4, 2);
    x.fillStyle = '#ffd860'; for (const [a, b] of [[3, 3], [10, 7], [5, 12]]) x.fillRect((a + f * 2) % 16, b, 2, 1);
    x.fillStyle = '#8a2010'; for (const [a, b] of [[7, 1], [1, 8], [12, 4]]) x.fillRect((a + 16 - f) % 16, b, 3, 1);
  },
  basalt: (x, f, s) => {
    DRAW.ash(x, f, s);
    x.fillStyle = '#1e1a1c'; x.fillRect(1, 2, 14, 14); x.fillRect(3, 0, 10, 2);
    x.fillStyle = '#4a4248'; x.fillRect(2, 2, 12, 12); x.fillRect(4, 1, 8, 1);
    x.fillStyle = '#6a6068'; x.fillRect(3, 2, 5, 2); x.fillRect(3, 4, 2, 4);
    x.fillStyle = '#2e282c'; x.fillRect(9, 9, 4, 4); x.fillRect(2, 13, 12, 1);
    if (s % 3 === 0) { x.fillStyle = '#ff7a2a'; x.fillRect(10, 6, 1, 3); x.fillRect(11, 8, 2, 1); }
  },
  ember: (x, f, s) => {
    x.fillStyle = '#7a3a2a'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#5a2a20'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 0, 1, 16);
    x.fillStyle = '#9a4a32'; x.fillRect(2, 2, 12, 12); x.fillStyle = '#b85a3a'; x.fillRect(2, 2, 12, 1);
    if ((s + f) % 3 === 0) { x.fillStyle = '#ffb04a'; x.fillRect(7, 8, 2, 1); }
  },
  void: x => { x.fillStyle = '#000'; x.fillRect(0, 0, 16, 16); },
  gym: (x, f, s) => { x.fillStyle = '#c8b090'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#a89070'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 0, 1, 16); x.fillStyle = '#e0c8a8'; x.fillRect(2, 2, 3, 2); },
  boulder: (x, f, s) => { DRAW.gym(x, f, s); x.fillStyle = '#404048'; x.beginPath(); x.ellipse(8, 9, 7, 6, 0, 0, 7); x.fill(); x.fillStyle = '#a89888'; x.beginPath(); x.ellipse(8, 8.5, 6, 5, 0, 0, 7); x.fill(); x.fillStyle = '#d0c0b0'; x.fillRect(5, 5, 4, 2); },
};
function treeTop(x, c1, c2, c3, o) {
  // Schatten am Boden, Stamm mit Licht-/Schattenkante
  x.fillStyle = 'rgba(0,40,0,.25)'; x.fillRect(3, 14, 10, 2);
  x.fillStyle = '#3a2414'; x.fillRect(5, 10, 6, 6);
  x.fillStyle = '#6a4428'; x.fillRect(6, 10, 4, 6); x.fillStyle = '#8a5a34'; x.fillRect(6, 10, 1, 6); x.fillStyle = '#4a2e1a'; x.fillRect(9, 10, 1, 6);
  // Krone: Kontur, Grundton, Schattenseite unten rechts, Lichtbüschel oben links
  x.fillStyle = o; x.beginPath(); x.arc(8, 6.5, 7.5, 0, 7); x.fill(); x.fillRect(1, 6, 14, 5);
  x.fillStyle = c1; x.beginPath(); x.arc(8, 6.5, 6.5, 0, 7); x.fill(); x.fillRect(2, 6, 12, 4);
  x.fillStyle = c2; x.beginPath(); x.arc(7, 5.5, 5, 0, 7); x.fill();
  x.fillStyle = c1; x.fillRect(4, 9, 3, 1); x.fillRect(9, 8, 4, 1);
  x.fillStyle = c3; x.fillRect(4, 3, 3, 1); x.fillRect(3, 4, 2, 2); x.fillRect(8, 2, 2, 1); x.fillRect(7, 6, 2, 1); x.fillRect(10, 4, 1, 1);
  x.fillStyle = o; x.fillRect(5, 10, 1, 1); x.fillRect(11, 9, 1, 1);
}
const BLADE = { green: ['#2e7a30', '#48a040', '#90d868'], ash: ['#4a4038', '#7a6a58', '#b8a488'], snow: ['#7a98b8', '#c8dcf0', '#ffffff'] };
export function tallBlades(x, f, oy, pal = 'green') {
  const o = f ? 1 : 0, [c1, c2, c3] = BLADE[pal];
  for (const [a, b] of [[1, 2], [6, 0], [11, 2], [3, 8], [9, 7], [13, 9]]) {
    x.fillStyle = c1; x.fillRect(a + o, b + 3 - oy, 1, 5); x.fillRect(a + 2, b + 2 - oy, 1, 6);
    x.fillStyle = c2; x.fillRect(a + 1, b - oy, 1, 7);
    x.fillStyle = c3; x.fillRect(a + 1 + o, b - oy, 1, 2);
  }
}

const tileCache = new Map();
export function tile(name, frame = 0, variant = 0) {
  const k = name + frame + ':' + variant;
  if (!tileCache.has(k)) { const [c, x] = cv(16, 16); (DRAW[name] || DRAW.void)(x, frame, variant); tileCache.set(k, c); }
  return tileCache.get(k);
}
// Hohes Gras: oberer Teil, der über die Füße der Figur gezeichnet wird
const tallTop = {};
export function tallOverlay(f, pal = 'green') {
  tallTop[pal] ||= [0, 1].map(fr => { const [c, x] = cv(16, 8); x.translate(0, -8); tallBlades(x, fr, 0, pal); return c; });
  return tallTop[pal][f];
}

// ---------------------------------------------------------------- Gebäude
const bCache = new Map();
export function building(b) {
  const k = JSON.stringify(b);
  if (bCache.has(k)) return bCache.get(k);
  const w = b.w * 16, h = b.h * 16, [c, x] = cv(w, h);
  const roofH = (b.h - 2) * 16 + 6, wallY = roofH - 2;
  const roof = b.roof || '#c84848', wall = b.wall || '#f0e8d8';
  // Wand
  x.fillStyle = '#3a3040'; x.fillRect(1, wallY, w - 2, h - wallY);
  x.fillStyle = wall; x.fillRect(2, wallY, w - 4, h - wallY - 1);
  x.fillStyle = shade(wall, -0.12); x.fillRect(2, h - 5, w - 4, 4);
  // Fenster
  for (let i = 0; i < b.w; i++) {
    if (i === b.door) continue;
    const wx = i * 16 + 4;
    if (i === 0 || i === b.w - 1 || (b.w > 4 && i % 2 === 0)) {
      x.fillStyle = '#3a3040'; x.fillRect(wx, wallY + 6, 9, 9);
      x.fillStyle = b.night ? '#ffe088' : '#a8d8f8'; x.fillRect(wx + 1, wallY + 7, 7, 7);
      x.fillStyle = '#ffffff'; x.fillRect(wx + 2, wallY + 8, 2, 2);
    }
  }
  // Tür
  const dx = b.door * 16;
  x.fillStyle = '#3a3040'; x.fillRect(dx + 2, h - 17, 12, 17);
  x.fillStyle = b.doorCol || '#8a5a30'; x.fillRect(dx + 3, h - 16, 10, 16);
  x.fillStyle = shade(b.doorCol || '#8a5a30', 0.3); x.fillRect(dx + 4, h - 15, 8, 1);
  x.fillStyle = '#f8d870'; x.fillRect(dx + 10, h - 8, 2, 2);
  // Dach
  x.fillStyle = '#3a3040'; x.fillRect(0, 2, w, roofH);
  x.fillStyle = roof; x.fillRect(1, 3, w - 2, roofH - 2);
  x.fillStyle = shade(roof, -0.2); for (let y = 8; y < roofH; y += 5) x.fillRect(1, y, w - 2, 1);
  x.fillStyle = shade(roof, 0.25); x.fillRect(1, 3, w - 2, 2);
  x.fillStyle = shade(roof, -0.35); x.fillRect(1, roofH - 1, w - 2, 1);
  // Schild
  if (b.sign) {
    const sx = Math.round(w / 2 - 14), sy = Math.max(6, roofH - 18);
    x.fillStyle = '#3a3040'; x.fillRect(sx - 1, sy - 1, 30, 12); x.fillStyle = b.signCol || '#f8f8f8'; x.fillRect(sx, sy, 28, 10);
    x.fillStyle = b.signInk || '#3a3040'; x.font = 'bold 8px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(b.sign, sx + 14, sy + 5.5);
  }
  if (b.chimney) { x.fillStyle = '#3a3040'; x.fillRect(w - 14, 0, 8, 10); x.fillStyle = '#a06048'; x.fillRect(w - 13, 1, 6, 8); }
  bCache.set(k, c);
  return c;
}

// ---------------------------------------------------------------- Figuren
const C = s => { const p = Math.floor((16 - s.length) / 2); return '.'.repeat(p) + s + '.'.repeat(16 - s.length - p); };
const HEAD_DOWN = ['oooooooo', 'occcccccco', 'occccccccco', 'oCCCCCCCCCCo', 'ohssssssssho', 'ohsessssesho', 'ohsessssesho', 'osssssssso', 'oossssoo'].map(C);
const HEAD_UP = ['oooooooo', 'occcccccco', 'occccccccco', 'occccccccco', 'ohhhhhhhhhho', 'ohhhhhhhhhho', 'ohhhhhhhhhho', 'ohhhhhhhho', 'oossssoo'].map(C);
const BODY_DOWN = ['obbbbbbbbo', 'obbbbbbbbbbo', 'obBbbbbbbBbo', 'osbbbbbbbbso', 'opppppppppo'.slice(0, 10), 'oppppppppo'].map(C);
const BODY_UP = ['obaaaaaabo', 'obaaaaaaaabo', 'obaaaaaaaabo', 'osbaaaaaabso', 'oppppppppo', 'oppppppppo'].map(C);
const LEGS = { stand: ['opppoopppo', 'okko..okko', 'oooo..oooo'].map(C), w1: ['opppoopppo', 'okko..oppo', 'oooo..okko'].map(C), w2: ['opppoopppo', 'oppo..okko', 'okko..oooo'].map(C) };
const SIDE = {
  stand: ['......oooooo....', '.....occcccco...', '....occcccccco..', '..oCCCCcccccco..', '...ohsshhhhhho..', '...osessshhhho..', '...ossssshhhho..', '....ossssssho...', '.....oossoo.....',
    '.....obbbbo.....', '....obbbbbbo....', '....obbsbbbo....', '....obbsbbao....', '.....opppo......', '.....opppo......', '.....opppo......', '.....okkko......', '.....ooooo......'],
};
SIDE.w1 = [...SIDE.stand.slice(0, 13), '.....opppo......', '....oppopo......', '...oppo.opo.....', '...okko.okko....', '...oooo.oooo....'];
SIDE.w2 = [...SIDE.stand.slice(0, 11), '....obsbbbo.....', '....obsbbao.....', '.....opppo......', '.....oppo.......', '....oppoppo.....', '....okko.oko....', '....oooo.ooo....'];

function frameRows(dir, step) {
  const legs = LEGS[step];
  const pants = [C('oppppppppo'), C('oppppppppo')];
  if (dir === 'down') return [...HEAD_DOWN, ...BODY_DOWN.slice(0, 4), ...pants, ...legs];
  if (dir === 'up') return [...HEAD_UP, ...BODY_UP.slice(0, 4), ...pants, ...legs];
  return SIDE[step];
}
const sprCache = new Map();
export function charSheet(look) {
  const k = JSON.stringify(look);
  if (sprCache.has(k)) return sprCache.get(k);
  const pal = {
    o: '#28202c', h: look.hair, H: shade(look.hair, -0.3), c: look.cap || look.hair, C: shade(look.cap || look.hair, -0.35),
    s: look.skin, S: shade(look.skin, -0.2), e: '#202030', b: look.outfit, B: shade(look.outfit, -0.25), p: look.pants || '#384868', k: '#3a2a22',
    a: look.accent || '#f2d16b', w: '#ffffff',
  };
  // Blatt: 3 Frames × 4 Richtungen (down, up, left, right), je 16×18
  const [c, x] = cv(48, 72);
  const dirs = ['down', 'up', 'left', 'right'], steps = ['stand', 'w1', 'w2'];
  dirs.forEach((d, di) => steps.forEach((st, si) => {
    const rows = frameRows(d === 'right' ? 'left' : d, st);
    const bob = st === 'stand' ? 0 : 1;
    rows.forEach((row, y) => {
      for (let i = 0; i < 16; i++) {
        const ch = row[d === 'right' ? 15 - i : i]; if (!ch || ch === '.') continue;
        x.fillStyle = pal[ch] || '#ff00ff'; x.fillRect(si * 16 + i, di * 18 + y + bob, 1, 1);
      }
    });
  }));
  sprCache.set(k, c);
  return c;
}
export const DIRS = ['down', 'up', 'left', 'right'];
export function drawChar(ctx, look, dir, frame, x, y) {
  const sh = charSheet(look);
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x + 8, y + 15, 5.5, 2, 0, 0, 7); ctx.fill();
  ctx.drawImage(sh, frame * 16, DIRS.indexOf(dir) * 18, 16, 18, Math.round(x), Math.round(y - 3), 16, 18);
}

// ---------------------------------------------------------------- Objekte
export function crystalIcon(color = '#7fe3ff') {
  const [c, x] = cv(16, 16);
  x.fillStyle = '#203040'; x.beginPath(); x.moveTo(8, 1); x.lineTo(14, 8); x.lineTo(8, 15); x.lineTo(2, 8); x.fill();
  x.fillStyle = color; x.beginPath(); x.moveTo(8, 2.5); x.lineTo(12.5, 8); x.lineTo(8, 13.5); x.lineTo(3.5, 8); x.fill();
  x.fillStyle = '#ffffff'; x.fillRect(6, 5, 2, 3); x.fillStyle = shade(color, -0.3); x.fillRect(8, 8, 3, 4);
  return c;
}
export function eggSprite(size, c1 = '#f8f0d8', c2 = '#7fd0ff', crack = 0) {
  const [c, x] = cv(size, size), s = size / 32;
  x.scale(s, s);
  x.fillStyle = '#383040'; x.beginPath(); x.ellipse(16, 18, 11, 13.5, 0, 0, 7); x.fill();
  x.fillStyle = c1; x.beginPath(); x.ellipse(16, 18, 10, 12.5, 0, 0, 7); x.fill();
  x.fillStyle = c2; for (const [a, b, r] of [[11, 13, 2.5], [20, 10, 2], [19, 22, 3], [12, 24, 1.8]]) { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); }
  x.fillStyle = '#ffffff'; x.fillRect(10, 9, 3, 4);
  if (crack) { x.strokeStyle = '#383040'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(7, 16); for (let i = 0; i < 5 + crack * 2; i++) x.lineTo(9 + i * 2.5, 14 + (i % 2 ? 3 : -2)); x.stroke(); }
  return c;
}
export function itemBall() {
  // Fundstück: kleiner leuchtender Kristall auf einem Sockel (eigenes Design)
  const [c, x] = cv(16, 16);
  x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(8, 14, 5, 1.6, 0, 0, 7); x.fill();
  x.fillStyle = '#28202c'; x.beginPath(); x.moveTo(8, 1); x.lineTo(13, 7); x.lineTo(8, 14); x.lineTo(3, 7); x.fill();
  x.fillStyle = '#ffd36b'; x.beginPath(); x.moveTo(8, 2.5); x.lineTo(11.6, 7); x.lineTo(8, 12.5); x.lineTo(4.4, 7); x.fill();
  x.fillStyle = '#fff6c8'; x.fillRect(6, 5, 2, 3); x.fillStyle = '#c8901a'; x.fillRect(8, 8, 2, 3);
  return c;
}
