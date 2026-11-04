// Wolkenpfad – Endlos-Läufer durch die Dschungel-Tempelruinen (three.js / WebGL)
import * as THREE from './lib/three.module.min.js';

const $ = id => document.getElementById(id);
const cv = $('c'), hc = $('hud');
let ctx = hc.getContext('2d');
let W = 1, H = 1, DPR = 1, SAFE_T = 0, PR = Math.min(2, window.devicePixelRatio || 1);

// ---------- Speicher ----------
const KEY = 'wolkenpfad-v1';
const DEF = { best: 0, shards: 0, runs: 0, skin: 'mira', owned: ['mira'], up: { magnet: 0, shield: 0, boost: 0, double: 0 }, mlv: 1, mseq: 3, mis: null, tut: false, mute: false, ctrl: 'swipe' };
let S;
try { S = Object.assign(JSON.parse(JSON.stringify(DEF)), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { S = JSON.parse(JSON.stringify(DEF)); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }

// ---------- Konstanten ----------
const LW = 1.25, PW = 1.9, HW = 2.3, VIEW = 150;
const GRAV = 28, JV = 9.6;
const DIRS = [[0, 1], [-1, 0], [0, -1], [1, 0]]; // Index +1 = rechts abbiegen
const PH = [
  { top: [82, 120, 176], hor: [238, 206, 166], bot: [70, 92, 60], fog: [196, 186, 156], sun: [255, 214, 160], si: 2.8, hs: [190, 204, 230], hg: [70, 62, 40], hi: 0.75, night: 0 },
  { top: [52, 120, 210], hor: [206, 228, 238], bot: [70, 100, 64], fog: [170, 196, 200], sun: [255, 248, 232], si: 3.2, hs: [200, 218, 250], hg: [80, 72, 48], hi: 0.85, night: 0 },
  { top: [66, 56, 126], hor: [250, 150, 96], bot: [104, 74, 64], fog: [222, 146, 112], sun: [255, 146, 86], si: 2.3, hs: [232, 176, 164], hg: [72, 52, 50], hi: 0.85, night: 0.25 },
  { top: [8, 14, 38], hor: [40, 62, 104], bot: [14, 22, 30], fog: [30, 46, 72], sun: [150, 182, 255], si: 1.1, hs: [86, 108, 170], hg: [18, 22, 30], hi: 0.6, night: 1 },
];
const SKINS = {
  mira: { n: 'Mira', d: 'Die Entdeckerin mit dem roten Schal', cost: 0, hair: '#5a3220', skin: '#e8b48a', shirt: '#d9a75a', pants: '#5b4a3a', boots: '#3a2a20', scarf: '#d8343a', pack: '#7a5232', tail: 1 },
  taro: { n: 'Taro', d: 'Kletterer aus dem Bergdorf', cost: 1000, hair: '#1c1c24', skin: '#d9a07a', shirt: '#4f8a5a', pants: '#3b3f4f', boots: '#2a2a2a', scarf: '#3a7ad8', pack: '#5a4a3a' },
  kitsu: { n: 'Kitsu', d: 'Ein Fuchsgeist, flink wie der Wind', cost: 3000, hair: '#f08a3a', skin: '#f5d0b0', shirt: '#f4efe6', pants: '#c8452e', boots: '#3a2a20', scarf: '#ffd34a', pack: '#8a3a2a', ears: 1, fox: 1 },
  sola: { n: 'Sola', d: 'Wächterin des Sonnentempels – leuchtet', cost: 6000, hair: '#f3e2a0', skin: '#f0c8a0', shirt: '#e8c050', pants: '#b08a3a', boots: '#7a5a20', scarf: '#ffffff', pack: '#c09030', glow: '255,236,150' },
  nox: { n: 'Nox', d: 'Hat den Nebel überlebt – trägt ihn als Mantel', cost: 12000, hair: '#2a2040', skin: '#c8b0d8', shirt: '#3a2a5a', pants: '#241a38', boots: '#120c20', scarf: '#b060ff', pack: '#2a2040', glow: '176,96,255' },
};
const UPS = {
  magnet: { n: 'Münzmagnet', d: 'Zieht Münzen an', base: 9, per: 2, col: '#c070ff' },
  shield: { n: 'Schutzamulett', d: 'Schützt vor einem Aufprall', base: 15, per: 4, col: '#60e0ff' },
  boost: { n: 'Sonnenflug', d: 'Fliegt unverwundbar über alles', base: 5, per: 1, col: '#ffcf40' },
  double: { n: 'Goldrausch', d: 'Doppelte Münzen', base: 12, per: 3, col: '#7dffb0' },
};
const UPCOST = [300, 800, 1800, 3600, 7000];
const MISS = [
  ['Laufe {g} m in einem Lauf', 'dist', 500], ['Sammle {g} Münzen in einem Lauf', 'shards', 80], ['Springe {g}-mal in einem Lauf', 'jumps', 20],
  ['Rutsche {g}-mal in einem Lauf', 'slides', 15], ['Biege {g}-mal ab', 'turns', 10], ['Nimm {g} Kräfte in einem Lauf', 'pus', 2],
  ['Laufe {g} m ohne Münzen', 'nocoin', 400], ['Erreiche {g} Punkte', 'score', 3000], ['Weiche {g} Hindernissen aus', 'dodge', 30],
  ['Laufe {g} m in einem Lauf', 'dist', 1500], ['Sammle {g} Münzen in einem Lauf', 'shards', 250], ['Halte {g} m durch, ohne zu stolpern', 'clean', 1000],
];
function missAt(seq) { const m = MISS[seq % MISS.length], round = Math.floor(seq / MISS.length); return { s: seq, k: m[1], g: Math.round(m[2] * (1 + round * 0.6) / 5) * 5 || m[2], t: m[0] }; }
if (!S.mis) S.mis = [missAt(0), missAt(1), missAt(2)];
S.mis.forEach(m => { m.t = m.t.replace('Splitter', 'Münzen'); });

// ---------- Hilfen ----------
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerpC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const wrapPi = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const sm = x => x * x * (3 - 2 * x);
function mkC(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
function radial(g, x, y, r, stops) { const gr = g.createRadialGradient(x, y, 0, x, y, r); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
let seed = 7; const srnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcccccc, 20, 120);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 700);
const hemi = new THREE.HemisphereLight(0xffffff, 0x444422, 1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 70 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const SUNOFF = new THREE.Vector3(-9, 22, 12);

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = Math.round(innerWidth * DPR); H = Math.round(innerHeight * DPR);
  hc.width = W; hc.height = H;
  renderer.setPixelRatio(PR); renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  SAFE_T = $('safe').getBoundingClientRect().top * DPR;
}
addEventListener('resize', resize);

// ---------- Texturen (prozedural) ----------
function tex(c, rep = true) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t;
}
function speckle(g, s, n, cols, a0, a1, r0 = 0.6, r1 = 2.2) { for (let i = 0; i < n; i++) { g.fillStyle = cols[(srnd() * cols.length) | 0]; g.globalAlpha = a0 + srnd() * (a1 - a0); const r = r0 + srnd() * (r1 - r0); g.fillRect(srnd() * s, srnd() * s, r, r); } g.globalAlpha = 1; }
function blobs(g, s, n, col, r0, r1, a) { for (let i = 0; i < n; i++) { const x = srnd() * s, y = srnd() * s, r = r0 + srnd() * (r1 - r0); for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) { g.fillStyle = radial(g, x + dx, y + dy, r, [[0, col.replace('A', a)], [1, col.replace('A', 0)]]); g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2); } } }
const stoneC = mkC(512, 512, (g, s) => {
  g.fillStyle = '#4a4238'; g.fillRect(0, 0, s, s);
  const rows = 4, h = s / rows;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * s / 4;
    for (let c = -1; c < 3; c++) {
      const x = c * s / 2 + off, w = s / 2, k = ((c + 4) % 2) * 2 + (r % 2), tint = [-10, 6, -2, 12][k];
      g.fillStyle = `rgb(${150 + tint},${138 + tint},${118 + tint})`; g.fillRect(x + 3, r * h + 3, w - 6, h - 6);
      const gr = g.createLinearGradient(x, r * h, x + w * 0.3, r * h + h); gr.addColorStop(0, 'rgba(255,240,210,.18)'); gr.addColorStop(1, 'rgba(0,0,0,.18)');
      g.fillStyle = gr; g.fillRect(x + 3, r * h + 3, w - 6, h - 6);
      g.strokeStyle = 'rgba(255,240,210,.18)'; g.lineWidth = 2; g.strokeRect(x + 5, r * h + 5, w - 10, h - 10);
    }
  }
  speckle(g, s, 9000, ['#2a241c', '#6a5e4c', '#d8c8a8', '#8a7a62'], 0.15, 0.45);
  g.strokeStyle = 'rgba(30,24,16,.55)'; g.lineWidth = 1.5;
  for (let i = 0; i < 14; i++) { let x = srnd() * s, y = srnd() * s; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 5; j++) { x += (srnd() - 0.5) * 40; y += (srnd() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
  blobs(g, s, 22, 'rgba(70,110,40,A)', 8, 30, 0.45);
  blobs(g, s, 14, 'rgba(30,24,16,A)', 10, 40, 0.25);
});
const wallC = mkC(512, 512, (g, s) => {
  g.fillStyle = '#2e2922'; g.fillRect(0, 0, s, s);
  const rh = 64;
  for (let r = 0; r < s / rh; r++) { const off = (r % 2) * 64; for (let c = -1; c < 5; c++) { const x = c * 128 + off, t = (srnd() * 24 - 12) | 0; g.fillStyle = `rgb(${104 + t},${94 + t},${80 + t})`; g.fillRect(x + 3, r * rh + 3, 122, rh - 6); const gr = g.createLinearGradient(0, r * rh, 0, r * rh + rh); gr.addColorStop(0, 'rgba(255,255,255,.1)'); gr.addColorStop(1, 'rgba(0,0,0,.25)'); g.fillStyle = gr; g.fillRect(x + 3, r * rh + 3, 122, rh - 6); } }
  speckle(g, s, 7000, ['#1a1610', '#5a5040', '#a89a80'], 0.15, 0.4);
  for (let i = 0; i < 26; i++) { const x = srnd() * s, w = 6 + srnd() * 26, l = 60 + srnd() * 260, y = srnd() * s; const gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, 'rgba(60,110,40,.55)'); gr.addColorStop(1, 'rgba(60,110,40,0)'); g.fillStyle = gr; g.fillRect(x, y, w, l); g.fillRect(x, y - s, w, l); }
});
const barkC = mkC(256, 256, (g, s) => {
  g.fillStyle = '#5a4030'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 90; i++) { const x = srnd() * s, w = 2 + srnd() * 7; g.fillStyle = srnd() < 0.5 ? 'rgba(30,20,12,.5)' : 'rgba(140,110,80,.35)'; g.fillRect(x, 0, w, s); }
  speckle(g, s, 3000, ['#20140c', '#8a6a4a'], 0.2, 0.5);
  blobs(g, s, 10, 'rgba(70,110,40,A)', 8, 26, 0.5);
});
const groundC = mkC(512, 512, (g, s) => {
  g.fillStyle = '#26401c'; g.fillRect(0, 0, s, s);
  blobs(g, s, 90, 'rgba(70,120,40,A)', 10, 50, 0.5);
  blobs(g, s, 60, 'rgba(14,28,10,A)', 10, 44, 0.55);
  blobs(g, s, 30, 'rgba(120,110,60,A)', 6, 22, 0.3);
  speckle(g, s, 8000, ['#0e1a08', '#5a8a3a', '#9ac060'], 0.2, 0.5, 1, 3);
});
const vineC = mkC(64, 256, (g, w, h) => {
  for (let k = 0; k < 3; k++) {
    let x = 14 + k * 18; g.strokeStyle = '#2f5a24'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 0);
    for (let y = 0; y < h; y += 16) { x += (srnd() - 0.5) * 8; g.lineTo(x, y); }
    g.stroke();
    for (let y = 8; y < h - 10; y += 10 + srnd() * 10) { g.fillStyle = srnd() < 0.5 ? '#4f8a3a' : '#3a7a2e'; g.beginPath(); g.ellipse(x + (srnd() - 0.5) * 16, y, 6, 3.5, srnd() * 3, 0, 7); g.fill(); }
  }
});
const smokeC = mkC(128, 128, (g) => { g.fillStyle = radial(g, 64, 64, 64, [[0, 'rgba(26,10,40,.95)'], [0.55, 'rgba(36,14,56,.7)'], [1, 'rgba(36,14,56,0)']]); g.fillRect(0, 0, 128, 128); });
const glowC = mkC(64, 64, (g) => { g.fillStyle = radial(g, 32, 32, 32, [[0, 'rgba(255,230,160,1)'], [0.3, 'rgba(255,160,60,.55)'], [1, 'rgba(255,90,0,0)']]); g.fillRect(0, 0, 64, 64); });
const wglowC = mkC(64, 64, (g) => { g.fillStyle = radial(g, 32, 32, 32, [[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(0, 0, 64, 64); });
const flameC = mkC(64, 128, (g) => {
  g.fillStyle = radial(g, 32, 92, 40, [[0, 'rgba(255,250,210,1)'], [0.35, 'rgba(255,190,60,.95)'], [0.7, 'rgba(255,90,20,.6)'], [1, 'rgba(255,40,0,0)']]);
  g.beginPath(); g.moveTo(32, 4); g.quadraticCurveTo(62, 70, 52, 100); g.quadraticCurveTo(32, 128, 12, 100); g.quadraticCurveTo(2, 70, 32, 4); g.fill();
});
const eyeC = mkC(64, 32, (g) => { g.fillStyle = radial(g, 32, 16, 30, [[0, 'rgba(255,240,200,1)'], [0.25, 'rgba(255,80,40,1)'], [1, 'rgba(255,0,0,0)']]); g.beginPath(); g.ellipse(32, 16, 30, 14, 0, 0, 7); g.fill(); });
function arrowC(kind) {
  return mkC(256, 64, (g) => {
    g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, 256, 64);
    g.fillStyle = '#ffd35a'; g.shadowColor = '#ff9a20'; g.shadowBlur = 12;
    const ar = (cx, s) => { g.beginPath(); g.moveTo(cx + s * 44, 32); g.lineTo(cx + s * 10, 6); g.lineTo(cx + s * 10, 20); g.lineTo(cx - s * 30, 20); g.lineTo(cx - s * 30, 44); g.lineTo(cx + s * 10, 44); g.lineTo(cx + s * 10, 58); g.closePath(); g.fill(); };
    if (kind !== 'R') ar(70, -1); if (kind !== 'L') ar(186, 1);
  });
}
function orbC(col, sym) {
  return mkC(64, 64, (g) => {
    g.fillStyle = radial(g, 32, 32, 32, [[0, 'rgba(255,255,255,.95)'], [0.45, col], [0.8, col], [1, 'rgba(0,0,0,0)']]); g.fillRect(0, 0, 64, 64);
    g.save(); g.translate(32, 32); g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#2a1840'; g.fillStyle = '#2a1840';
    if (sym === 'magnet') { g.beginPath(); g.arc(0, -2, 9, Math.PI, 0); g.lineTo(9, 10); g.moveTo(-9, -2); g.lineTo(-9, 10); g.stroke(); }
    if (sym === 'shield') { g.beginPath(); g.moveTo(0, -13); g.lineTo(11, -8); g.lineTo(9, 5); g.lineTo(0, 13); g.lineTo(-9, 5); g.lineTo(-11, -8); g.closePath(); g.stroke(); }
    if (sym === 'boost') { g.beginPath(); g.moveTo(-12, 4); g.quadraticCurveTo(-4, -14, 13, -9); g.quadraticCurveTo(0, -4, -2, 10); g.stroke(); }
    if (sym === 'double') { g.font = '900 22px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('×2', 0, 1); }
    g.restore();
  });
}
const PUC = { magnet: orbC('rgba(192,112,255,.9)', 'magnet'), shield: orbC('rgba(96,224,255,.9)', 'shield'), boost: orbC('rgba(255,207,64,.95)', 'boost'), double: orbC('rgba(125,255,176,.9)', 'double') };

// ---------- Materialien & Grundformen ----------
const T = { stone: tex(stoneC), wall: tex(wallC), bark: tex(barkC), ground: tex(groundC), vine: tex(vineC) };
const M = {
  stone: new THREE.MeshStandardMaterial({ map: T.stone, roughness: 0.92 }),
  curb: new THREE.MeshStandardMaterial({ map: T.stone, color: 0xd8ccb0, roughness: 0.9 }),
  wall: new THREE.MeshStandardMaterial({ map: T.wall, roughness: 1 }),
  bark: new THREE.MeshStandardMaterial({ map: T.bark, roughness: 1 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true }),
  ground: new THREE.MeshStandardMaterial({ map: T.ground, roughness: 1 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x8a8278, roughness: 0.95, flatShading: true }),
  marble: new THREE.MeshStandardMaterial({ map: T.stone, color: 0xf0e8d8, roughness: 0.7 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xffcc40, metalness: 0.85, roughness: 0.22, emissive: 0xa06000, emissiveIntensity: 0.55 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x5a3e28, roughness: 0.9 }),
  iron: new THREE.MeshStandardMaterial({ color: 0x3a3634, roughness: 0.6, metalness: 0.6 }),
  eye: new THREE.MeshBasicMaterial({ color: 0xff7a30 }),
  vine: new THREE.MeshStandardMaterial({ map: T.vine, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 }),
};
const SP = {
  flame: new THREE.SpriteMaterial({ map: tex(flameC, false), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
  glow: new THREE.SpriteMaterial({ map: tex(glowC, false), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7 }),
  wglow: new THREE.SpriteMaterial({ map: tex(wglowC, false), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 }),
  smoke: new THREE.SpriteMaterial({ map: tex(smokeC, false), depthWrite: false, transparent: true }),
  eye: new THREE.SpriteMaterial({ map: tex(eyeC, false), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }),
};
const PUM = {}; for (const k in PUC) PUM[k] = new THREE.SpriteMaterial({ map: tex(PUC[k], false), transparent: true, depthWrite: false });
const ARROW = { L: tex(arrowC('L'), false), R: tex(arrowC('R'), false), T: tex(arrowC('T'), false) };
function jitter(geo, amt, sd) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const h = Math.sin(Math.round(v.x * 100) * 12.9898 + Math.round(v.y * 100) * 78.233 + Math.round(v.z * 100) * 37.719 + sd) * 43758.5453;
    const f = 1 + ((h - Math.floor(h)) - 0.5) * amt; p.setXYZ(i, v.x * f, v.y * f, v.z * f);
  }
  geo.computeVertexNormals(); return geo;
}
const GEO = {
  canopy: jitter(new THREE.IcosahedronGeometry(1, 1), 0.45, 1),
  rock: jitter(new THREE.IcosahedronGeometry(1, 1), 0.5, 3),
  trunk: new THREE.CylinderGeometry(0.75, 1, 1, 7, 1),
  log: new THREE.CylinderGeometry(0.38, 0.4, 5.4, 12),
  coin: new THREE.CylinderGeometry(0.24, 0.24, 0.06, 20).rotateX(Math.PI / 2),
  col: new THREE.CylinderGeometry(0.5, 0.55, 1, 12),
  post: new THREE.CylinderGeometry(0.06, 0.08, 1.4, 6),
  bowl: new THREE.CylinderGeometry(0.2, 0.1, 0.18, 10),
  box: new THREE.BoxGeometry(1, 1, 1),
  vine: new THREE.PlaneGeometry(0.7, 1),
};

// Himmel
const skyMat = new THREE.ShaderMaterial({
  uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, sunCol: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() } },
  vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.); gl_Position = p.xyww; }',
  fragmentShader: `uniform vec3 top, hor, bot, sunCol, sunDir; varying vec3 vD;
    void main(){ vec3 d = normalize(vD); float h = d.y; vec3 c = h > 0. ? mix(hor, top, pow(h, .55)) : mix(hor, bot, pow(min(1., -h * 3.), .6));
    float s = max(dot(d, normalize(sunDir)), 0.); c += sunCol * (smoothstep(.9985, .9992, s) * 2.5 + pow(s, 12.) * .35);
    gl_FragColor = vec4(c, 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`,
  side: THREE.BackSide, depthWrite: false, fog: false,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), skyMat); sky.renderOrder = -1; scene.add(sky);
// Dschungelboden
T.ground.repeat.set(800 / 12, 800 / 12);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(800, 800).rotateX(-Math.PI / 2), M.ground); floor.position.y = -18; scene.add(floor);
// Umgebungslicht für Gold
{
  const env = new THREE.Scene(); const es = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }));
  const pc = es.geometry.attributes.position, cols = []; for (let i = 0; i < pc.count; i++) { const y = pc.getY(i) / 10; cols.push(...(y > 0 ? [1, 0.95, 0.8] : [0.25, 0.3, 0.15]).map(v => v * (0.6 + Math.abs(y) * 0.6))); }
  es.geometry.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); env.add(es);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(env, 0.04).texture;
}
// Läuferlicht (Sonnenherz) – nachts wichtig
const heartLight = new THREE.PointLight(0xffc870, 0, 9, 1.6); scene.add(heartLight);

// ---------- Geometrie-Baukasten (Weltkoordinaten-UVs) ----------
class GB {
  constructor(ts) { this.ts = ts; this.p = []; this.n = []; this.u = []; this.i = []; }
  face(o, ax, ay, n) {
    const b = this.p.length / 3, la = Math.hypot(...ax), lb = Math.hypot(...ay);
    const ua = ax.map(v => v / la), ub = ay.map(v => v / lb);
    const u0 = (o[0] * ua[0] + o[1] * ua[1] + o[2] * ua[2]) / this.ts, v0 = (o[0] * ub[0] + o[1] * ub[1] + o[2] * ub[2]) / this.ts;
    const P = [o, [o[0] + ax[0], o[1] + ax[1], o[2] + ax[2]], [o[0] + ax[0] + ay[0], o[1] + ax[1] + ay[1], o[2] + ax[2] + ay[2]], [o[0] + ay[0], o[1] + ay[1], o[2] + ay[2]]];
    const U = [[u0, v0], [u0 + la / this.ts, v0], [u0 + la / this.ts, v0 + lb / this.ts], [u0, v0 + lb / this.ts]];
    for (let k = 0; k < 4; k++) { this.p.push(...P[k]); this.n.push(...n); this.u.push(...U[k]); }
    this.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  box(x0, x1, y0, y1, z0, z1, skipBottom = true) {
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
    this.face([x0, y1, z0], [0, 0, dz], [dx, 0, 0], [0, 1, 0]);
    if (!skipBottom) this.face([x0, y0, z0], [dx, 0, 0], [0, 0, dz], [0, -1, 0]);
    this.face([x1, y0, z0], [0, dy, 0], [0, 0, dz], [1, 0, 0]);
    this.face([x0, y0, z0], [0, 0, dz], [0, dy, 0], [-1, 0, 0]);
    this.face([x0, y0, z1], [dx, 0, 0], [0, dy, 0], [0, 0, 1]);
    this.face([x0, y0, z0], [0, dy, 0], [dx, 0, 0], [0, 0, -1]);
  }
  L(l0, l1, y0, y1, a0, a1) { this.box(-l1, -l0, y0, y1, a0, a1); } // Koordinaten als Querlage (rechts = +)
  mesh(mat) {
    if (!this.i.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.setIndex(this.i); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.userData.own = true; return m;
  }
}

// ---------- Ton ----------
let AC = null, master, sfxBus, musBus, noiseBuf, mStep = 0, mNext = 0;
function audioInit() {
  if (AC) { if (AC.state !== 'running') AC.resume(); return; }
  try {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = S.mute ? 0 : 0.75; master.connect(AC.destination);
    sfxBus = AC.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
    musBus = AC.createGain(); musBus.gain.value = 0.26; musBus.connect(master);
    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    mNext = AC.currentTime + 0.1; setInterval(musicTick, 50);
  } catch { AC = null; }
}
function osc(type, f0, f1, dur, vol, delay = 0, bus = sfxBus) {
  if (!AC) return; const t = AC.currentTime + delay;
  const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.03);
}
function noise(dur, vol, f, q = 1, delay = 0, f1, bus = sfxBus, type = 'bandpass') {
  if (!AC) return; const t = AC.currentTime + delay;
  const s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q; if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(bus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
let coinPitch = 0, coinT = 0;
function sfx(n) {
  if (!AC || S.mute) return;
  switch (n) {
    case 'coin': { const now = performance.now(); coinPitch = now - coinT < 250 ? Math.min(coinPitch + 1, 8) : 0; coinT = now; const f = 1568 * Math.pow(2, [0, 2, 4, 7, 9, 12, 14, 16, 19][coinPitch] / 12); osc('sine', f, 0, 0.14, 0.16); osc('square', f * 2, 0, 0.05, 0.03); break; }
    case 'jump': noise(0.18, 0.16, 1500, 1, 0, 3500); osc('sine', 220, 330, 0.12, 0.08); break;
    case 'slide': noise(0.45, 0.28, 1100, 0.6, 0, 300); break;
    case 'swish': noise(0.14, 0.14, 2600, 1.2, 0, 900); break;
    case 'turn': noise(0.28, 0.2, 700, 1, 0, 2400); break;
    case 'step': noise(0.05, 0.07, 260, 1.2); break;
    case 'land': noise(0.12, 0.22, 240, 1); osc('sine', 90, 50, 0.1, 0.12); break;
    case 'bump': osc('square', 120, 80, 0.1, 0.1); break;
    case 'stumble': osc('sawtooth', 200, 70, 0.3, 0.18); noise(0.3, 0.3, 400, 1); break;
    case 'crash': osc('sawtooth', 160, 40, 0.6, 0.3); noise(0.7, 0.5, 300, 0.7, 0, 80, sfxBus, 'lowpass'); break;
    case 'fall': osc('sine', 700, 90, 1.2, 0.2); noise(1.2, 0.2, 1200, 0.5, 0, 200); break;
    case 'roar': noise(1.6, 0.5, 180, 0.6, 0, 60, sfxBus, 'lowpass'); osc('sawtooth', 75, 42, 1.4, 0.14); osc('sawtooth', 112, 60, 1.2, 0.06, 0.1); break;
    case 'power': [0, 4, 7, 12].forEach((s, i) => osc('triangle', 523 * Math.pow(2, s / 12), 0, 0.16, 0.14, i * 0.06)); break;
    case 'shield': osc('sine', 900, 300, 0.4, 0.2); noise(0.4, 0.2, 3000, 2); break;
    case 'mission': [0, 4, 7, 12, 16].forEach((s, i) => { osc('square', 660 * Math.pow(2, s / 12), 0, 0.14, 0.05, i * 0.08); osc('sine', 660 * Math.pow(2, s / 12), 0, 0.2, 0.1, i * 0.08); }); break;
    case 'click': osc('triangle', 880, 1200, 0.06, 0.08); break;
    case 'bird': { const f = rnd(2200, 3400); osc('sine', f, f * 1.3, 0.07, 0.04); osc('sine', f * 1.1, f * 0.9, 0.09, 0.035, 0.1); break; }
  }
}
// Trommel-Musik (Am – F – C – G): Tom-Toms, Bongos, Shaker, Bass, Flöte
const NOTE = n => { if (!n || n === '.') return 0; const m = n.match(/^([A-G])(#?)(\d)$/); const i = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] ? 1 : 0) + (m[3] - 4) * 12; return 440 * Math.pow(2, i / 12); };
const MEL = ('E5 . . A5 . . G5 . E5 . D5 . E5 . . . ' + 'C5 . . F5 . . E5 . C5 . A4 . C5 . D5 . ' + 'E5 . . G5 . . C6 . B5 . G5 . E5 . G5 . ' + 'B5 . A5 . G5 . D5 . E5 . . . . . . .').trim().split(/\s+/).map(NOTE);
const MEL2 = ('A5 . . C6 . . B5 . A5 . G5 . A5 . E5 . ' + 'F5 . . A5 . . G5 . F5 . E5 . C5 . . . ' + 'G5 . . C6 . . E6 . D6 . C6 . G5 . E5 . ' + 'D5 . G5 . B5 . D6 . C6 . B5 . A5 . . .').trim().split(/\s+/).map(NOTE);
const ROOTS = [110, 87.31, 130.81, 98], CH = [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]];
function musicTick() {
  if (!AC || AC.state !== 'running') return;
  const run = G.state === 'run';
  const STEP = 60 / (run ? 128 : 96) / 4;
  if (mNext < AC.currentTime) mNext = AC.currentTime + 0.05;
  while (mNext < AC.currentTime + 0.2) {
    const st = mStep % 64, bar = st >> 4, b = st & 15, t = mNext - AC.currentTime, root = ROOTS[bar], loop = Math.floor(mStep / 64);
    const mel = loop % 2 ? MEL2 : MEL;
    if (run) {
      if ([0, 6, 8].includes(b)) osc('sine', 120, 52, 0.28, 0.55, t, musBus);
      if (b === 4 || b === 12) { osc('sine', 230, 150, 0.2, 0.32, t, musBus); noise(0.08, 0.12, 900, 1, t, 0, musBus); }
      if ([3, 7, 10, 11, 14, 15].includes(b)) osc('sine', b % 2 ? 420 : 340, b % 2 ? 300 : 250, 0.09, 0.18, t, musBus);
      noise(0.03, b % 2 ? 0.07 : 0.035, 7000, 1, t, 0, musBus, 'highpass');
      if (b === 0 || b === 8) osc('triangle', root, 0, 0.5, 0.35, t, musBus);
      if (b === 11) osc('triangle', root * 1.5, 0, 0.2, 0.25, t, musBus);
      if (mel[st] && loop % 4 !== 3) { osc('sine', mel[st], 0, 0.3, 0.1, t, musBus); osc('triangle', mel[st] * 2, 0, 0.12, 0.025, t, musBus); }
      if (G.chaseVis > 0.3 && b % 2 === 0) osc('sawtooth', root / 2, 0, 0.1, 0.08, t, musBus);
    } else {
      if (b === 0) CH[bar].forEach(s => osc('sine', root * 2 * Math.pow(2, s / 12), 0, 1.6, 0.1, t, musBus));
      if (b % 8 === 0) osc('sine', 110, 60, 0.4, 0.25, t, musBus);
      if (mel[st] && st % 2 === 0) osc('sine', mel[st], 0, 0.5, 0.06, t, musBus);
    }
    mStep++; mNext += STEP;
  }
}
function setMute(m) { S.mute = m; save(); if (master) master.gain.value = m ? 0 : 0.75; $('muteBtn').textContent = m ? '🔇 Ton aus' : '🔊 Ton an'; }

// ---------- Spielzustand ----------
const G = { state: 'menu', t: 0, s: 0, lat: 0, lane: 0, prevLane: 0, latT: 0, py: 0, vy: 0, slide: 0, ff: false, jbuf: 0, speed: 11, dist: 0, shards: 0, score: 0,
  turnQ: null, chase: 0, chaseVis: 0, chaseD: 14, slow: 0, inv: 0, pu: { magnet: 0, shield: 0, boost: 0, double: 0 }, puMax: {}, stats: {}, revives: 0, dead: null, deadT: 0,
  hint: '', hintT: 0, seen: {}, shake: 0, cleanFrom: 0, overShown: false, phase: 0, hd: 0, camBlend: 0, runT: 0 };
let cur = null, genDist = 0, nextPu = 260;
const live = new Set(), retire = [];
const cam = { yaw: 0 };

function segLen() { return 60 + rnd(60); }
function mkSeg(x, z, dir, bal, len) {
  const sg = { x, z, dir, bal, len, obs: [], coins: [], deco: [], gaps: [], pus: [], next: null, arms: null, flames: [] };
  sg.fx = DIRS[dir][0]; sg.fz = DIRS[dir][1]; sg.rx = -sg.fz; sg.rz = sg.fx;
  sg.end = bal === 0 ? (Math.random() < 0.45 ? 'T' : Math.random() < 0.5 ? 'L' : 'R') : (bal > 0 ? 'L' : 'R');
  return sg;
}
const wp = (sg, lat, y, a) => [sg.x + sg.fx * a + sg.rx * lat, y, sg.z + sg.fz * a + sg.rz * lat];
function laneSet(n) { const a = [-1, 0, 1].sort(() => Math.random() - 0.5); return a.slice(0, n); }
function populate(sg, st) {
  const sp = Math.max(G.speed, 11) + 1.5, lvl = Math.min(1, G.dist / 3500);
  const tail = Math.max(16, sp * 0.95 + 5);
  let p = st;
  for (;;) {
    p += sp * (0.85 + rnd(0.95 - lvl * 0.45));
    if (p > sg.len - tail - 5) break;
    const r = Math.random(); let o;
    if (r < 0.17) o = { t: 'low', s0: p, s1: p + 0.8, v: Math.random() < 0.6 ? 0 : 1 };
    else if (r < 0.33) o = { t: 'high', s0: p, s1: p + 0.8, v: Math.random() < 0.55 ? 0 : 1 };
    else if (r < 0.45 && G.dist + genDist > 120) { const L = 2.8 + sp * 0.07; o = { t: 'gap', s0: p, s1: p + L }; sg.gaps.push([p, p + L]); }
    else if (r < 0.57) o = { t: 'rubble', s0: p, s1: p + 0.9, lanes: laneSet(1) };
    else o = { t: 'block', s0: p, s1: p + 1.3, lanes: laneSet(Math.random() < 0.4 + lvl * 0.35 ? 2 : 1), k: Math.random() * 3 | 0 };
    sg.obs.push(o); p = o.s1;
  }
  for (let q = st + rnd(8); q < sg.len - 8;) {
    const lane = (Math.random() * 3 | 0) - 1, n = 6 + (Math.random() * 7 | 0);
    for (let i = 0; i < n; i++) {
      const cs = q + i * 1.6; if (cs > sg.len - 6) break;
      let y = 0.75, skip = false;
      for (const o of sg.obs) {
        if (cs < o.s0 - 1.6 || cs > o.s1 + 1.6) continue;
        if (o.t === 'block' && o.lanes.includes(lane)) skip = true;
        else if (o.t === 'rubble' && o.lanes.includes(lane)) y = 1.7;
        else if (o.t === 'low' || o.t === 'gap') y = 1.7;
        else if (o.t === 'high') y = 0.45;
      }
      if (!skip) sg.coins.push({ s: cs, lat: lane * LW, y, got: false });
    }
    q += n * 1.6 + 6 + rnd(16);
  }
  genDist += sg.len;
  if (genDist > nextPu) {
    for (let tries = 0; tries < 8; tries++) {
      const s = rnd(12, sg.len - tail - 4), lane = (Math.random() * 3 | 0) - 1;
      if (sg.obs.some(o => s > o.s0 - 4 && s < o.s1 + 4)) continue;
      const ks = Object.keys(UPS);
      sg.pus.push({ s, lat: lane * LW, t: ks[Math.random() * ks.length | 0], got: false });
      sg.coins = sg.coins.filter(c => Math.abs(c.s - s) > 1.5 || Math.abs(c.lat - lane * LW) > 0.5);
      nextPu = genDist + 380 + rnd(300); break;
    }
  }
}
function expand(sg) {
  if (sg.next || sg.arms) return;
  const e = wp(sg, 0, 0, sg.len);
  const mk = t => { const d = t === 'L' ? (sg.dir + 3) % 4 : (sg.dir + 1) % 4; const n = mkSeg(e[0], e[2], d, sg.bal + (t === 'L' ? -1 : 1), segLen()); populate(n, 9); buildSeg(n); return n; };
  if (sg.end === 'T') sg.arms = { L: mk('L'), R: mk('R') }; else sg.next = mk(sg.end);
}
function ensure(sg, base, depth) {
  const rem = base + sg.len;
  if (rem > VIEW || depth > 3) return;
  expand(sg);
  if (sg.next) ensure(sg.next, rem, depth + 1); else { ensure(sg.arms.L, rem, depth + 1); ensure(sg.arms.R, rem, depth + 1); }
}
function overGap(sg, s) { for (const g of sg.gaps) if (s > g[0] + 0.3 && s < g[1] - 0.3) return true; return false; }

// ---------- Strecke bauen ----------
function minusGaps(sg, a, b) {
  let parts = [[a, b]];
  for (const g of sg.gaps) { const np = []; for (const [u, v] of parts) { if (g[1] <= u || g[0] >= v) { np.push([u, v]); continue; } if (g[0] > u) np.push([u, g[0]]); if (g[1] < v) np.push([g[1], v]); } parts = np; }
  return parts;
}
function addAt(grp, obj, lat, y, a) { obj.position.set(-lat, y, a); grp.add(obj); return obj; }
function mesh(geo, mat, sx, sy, sz, shadow = true) { const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.castShadow = shadow; m.receiveShadow = true; return m; }
function sprite(mat, w, h) { const s = new THREE.Sprite(mat); s.scale.set(w, h, 1); return s; }
function addFlame(sg, grp, lat, y, a, size) {
  const f = addAt(grp, sprite(SP.flame, size * 0.6, size), lat, y + size * 0.42, a);
  const gl = addAt(grp, sprite(SP.glow, size * 2.4, size * 2.4), lat, y + size * 0.35, a);
  sg.flames.push({ f, gl, size, ph: Math.random() * 10 });
}
function buildSeg(sg) {
  const grp = new THREE.Group(); grp.position.set(sg.x, 0, sg.z); grp.rotation.y = Math.atan2(sg.fx, sg.fz);
  const top = new GB(2.5), curb = new GB(2.5), wall = new GB(4);
  const a0 = sg.first ? -12 : HW, aE = sg.len + HW, sq = sg.len - HW;
  for (const [u, v] of minusGaps(sg, a0, aE)) {
    if (u < sq) top.L(-PW, PW, -0.5, 0, u, Math.min(v, sq));
    if (v > sq) top.L(-HW, HW, -0.5, 0, Math.max(u, sq), v);
    wall.L(-HW - 0.12, HW + 0.12, -18, -0.5, u, v);
    if (u < sq) { curb.L(-HW, -PW, -0.5, 0.3, u, Math.min(v, sq)); curb.L(PW, HW, -0.5, 0.3, u, Math.min(v, sq)); }
  }
  if (sg.end === 'L') curb.L(PW, HW, -0.5, 0.3, sq, aE);
  if (sg.end === 'R') curb.L(-HW, -PW, -0.5, 0.3, sq, aE);
  curb.L(-HW - 0.3, HW + 0.3, -0.5, 1.1, aE, aE + 0.6);
  curb.L(-HW - 0.45, HW + 0.45, 1.1, 1.35, aE - 0.08, aE + 0.7);
  const mt = top.mesh(M.stone); mt.receiveShadow = true; grp.add(mt);
  const mc = curb.mesh(M.curb); mc.receiveShadow = true; mc.castShadow = true; grp.add(mc);
  grp.add(wall.mesh(M.wall));
  // Pfeile an der Kreuzungswand
  const ar = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: ARROW[sg.end], transparent: true, depthWrite: false, toneMapped: false }));
  ar.rotation.y = Math.PI; ar.userData.own = true; addAt(grp, ar, 0, 0.62, aE - 0.02); sg.arrow = ar;
  // Hindernisse
  for (const o of sg.obs) if (o.t !== 'gap') { o.mesh = obsMesh(sg, o); grp.add(o.mesh); }
  // Münzen
  if (sg.coins.length) { const im = new THREE.InstancedMesh(GEO.coin, M.gold, sg.coins.length); im.castShadow = true; im.userData.own = 'inst'; im.frustumCulled = false; grp.add(im); sg.coinMesh = im; updCoins(sg, 0); }
  for (const u of sg.pus) { u.spr = addAt(grp, sprite(PUM[u.t], 0.85, 0.85), u.lat, 1.1, u.s); u.gl = addAt(grp, sprite(SP.wglow, 1.8, 1.8), u.lat, 1.1, u.s); }
  // Fackeln auf der Brüstung
  for (let a = HW + 3 + rnd(4); a < sq - 2; a += 9 + rnd(6)) {
    const side = Math.random() < 0.5 ? -1 : 1, lat = side * (PW + 0.2);
    addAt(grp, mesh(GEO.post, M.wood, 1, 1, 1), lat, 1.0, a);
    addAt(grp, mesh(GEO.bowl, M.iron, 1, 1, 1), lat, 1.72, a);
    addFlame(sg, grp, lat, 1.78, a, 0.7);
  }
  // Ruinensäulen aus dem Dschungel
  for (let a = HW + 4; a < sq - 4; a += 7 + rnd(9)) {
    if (Math.random() < 0.45) continue;
    const side = Math.random() < 0.5 ? -1 : 1, lat = side * rnd(HW + 1.3, HW + 3), h = rnd(14, 21.5);
    addAt(grp, mesh(GEO.col, M.marble, 1, h, 1, false), lat, -18 + h / 2, a);
    if (h > 19) addAt(grp, mesh(GEO.box, M.marble, 1.4, 0.4, 1.4, false), lat, -18 + h + 0.2, a);
  }
  // Ranken an den Mauern
  for (let a = HW + 1; a < sg.len - 2; a += 2.5 + rnd(4)) {
    if (sg.gaps.some(g => a > g[0] - 1 && a < g[1] + 1)) continue;
    const side = Math.random() < 0.5 ? -1 : 1, l = rnd(2.5, 7), v = new THREE.Mesh(GEO.vine, M.vine);
    v.scale.set(rnd(0.8, 1.5), l, 1); v.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    addAt(grp, v, side * (HW + 0.14), -0.3 - l / 2, a);
  }
  // Dschungelbäume (Instanzen)
  const trees = [];
  for (let a = 6; a < sg.len - 10; a += rnd(1.8, 3.6)) for (const side of [-1, 1]) {
    const near = Math.random() < 0.55, r = near ? rnd(2.2, 3.6) : rnd(3, 5.5);
    const lat = side * (near ? HW + r * 0.85 + rnd(0.2, 2.5) : rnd(9, 42));
    const topY = near ? rnd(-6, 2.5) : rnd(-10, 5);
    trees.push([a + rnd(-1, 1), lat, topY, r]);
  }
  if (sg.first) for (let i = 0; i < 26; i++) { const side = Math.random() < 0.5 ? -1 : 1; trees.push([rnd(-40, 6), side * rnd(9, 40), rnd(-8, 4), rnd(3, 5.5)]); }
  const tr = new THREE.InstancedMesh(GEO.trunk, M.bark, trees.length), cn = new THREE.InstancedMesh(GEO.canopy, M.leaf, trees.length * 3);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  trees.forEach(([a, lat, ty, r], i) => {
    const h = ty + 18, w = r * 0.16;
    m4.compose(new THREE.Vector3(-lat, -18 + h / 2, a), q.identity(), new THREE.Vector3(w, h, w)); tr.setMatrixAt(i, m4);
    for (let k = 0; k < 3; k++) {
      const rr = r * (k ? rnd(0.55, 0.8) : 1), ox = k ? rnd(-1, 1) * r * 0.7 : 0, oz = k ? rnd(-1, 1) * r * 0.7 : 0;
      q.setFromEuler(e.set(0, rnd(6), 0));
      m4.compose(new THREE.Vector3(-lat + ox, ty - (k ? rnd(0.2, 1.2) : 0), a + oz), q, new THREE.Vector3(rr, rr * rnd(0.55, 0.75), rr)); cn.setMatrixAt(i * 3 + k, m4);
      c.setHSL(rnd(0.22, 0.33), rnd(0.4, 0.65), rnd(0.12, 0.24)); cn.setColorAt(i * 3 + k, c);
    }
  });
  tr.userData.own = cn.userData.own = 'inst'; tr.frustumCulled = cn.frustumCulled = false; grp.add(tr, cn);
  // ferne Tempeltürme
  if (Math.random() < 0.55) {
    const side = Math.random() < 0.5 ? -1 : 1, lat = side * rnd(48, 85), a = rnd(0, sg.len - 20), h = rnd(26, 40), w = rnd(7, 12);
    addAt(grp, mesh(GEO.box, M.wall, w, h, w, false), lat, -18 + h / 2, a);
    addAt(grp, mesh(GEO.box, M.wall, w * 0.7, 6, w * 0.7, false), lat, -18 + h + 3, a);
    addAt(grp, mesh(GEO.box, M.wall, w * 0.4, 5, w * 0.4, false), lat, -18 + h + 8.5, a);
  }
  if (sg.first) buildTemple(sg, grp);
  scene.add(grp); sg.grp = grp; live.add(sg);
}
function buildTemple(sg, grp) {
  const b = new GB(4);
  b.L(-9, 9, -18, 7, -26, -12); b.L(-7, 7, 7, 11, -24, -14); b.L(-4.5, 4.5, 11, 14, -22, -16);
  b.L(-2.6, -1.8, 0, 4.2, -12.6, -11.6); b.L(1.8, 2.6, 0, 4.2, -12.6, -11.6); b.L(-3, 3, 4.2, 5.2, -12.8, -11.4);
  for (let i = 0; i < 4; i++) b.L(-3.2 - i * 0.4, 3.2 + i * 0.4, -0.5 - i * 0.25, -0.25 - i * 0.25, -12 + i * 0.5, -11 + i * 0.6);
  const m = b.mesh(M.wall); m.castShadow = m.receiveShadow = true; grp.add(m);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.2), new THREE.MeshBasicMaterial({ color: 0x080406 })); door.userData.own = true; addAt(grp, door, 0, 2.1, -11.99);
  for (const s of [-1, 1]) {
    addAt(grp, mesh(GEO.box, M.marble, 1.2, 0.6, 1.2), s * 4.2, 0.3, -10.5);
    addAt(grp, mesh(GEO.box, M.marble, 0.8, 1.8, 0.8), s * 4.2, 1.5, -10.5);
    addAt(grp, mesh(GEO.box, M.marble, 0.7, 0.7, 0.7), s * 4.2, 2.75, -10.5);
    addAt(grp, mesh(GEO.post, M.wood, 1, 1.6, 1), s * 3.2, 1.1, -9.5); addFlame(sg, grp, s * 3.2, 2.2, -9.5, 0.9);
  }
}
function obsMesh(sg, o) {
  const g = new THREE.Group(), mid = (o.s0 + o.s1) / 2;
  if (o.t === 'low') {
    if (o.v === 0) { const l = mesh(GEO.log, M.bark, 1, 1, 1); l.rotation.z = Math.PI / 2; l.rotation.y = rnd(-0.08, 0.08); addAt(g, l, 0, 0.38, mid); const br = mesh(GEO.post, M.bark, 2, 0.6, 2); br.rotation.z = 0.9; addAt(g, br, rnd(-1, 1), 0.75, mid); }
    else { const b = new GB(2.5); b.L(-PW, PW, 0, 0.78, o.s0, o.s1); b.L(-PW - 0.05, PW + 0.05, 0.62, 0.86, o.s0 - 0.05, o.s1 + 0.05); const m = b.mesh(M.curb); m.castShadow = m.receiveShadow = true; g.add(m); }
  } else if (o.t === 'high') {
    if (o.v === 0) {
      const b = new GB(2.5); b.L(-HW - 0.55, -HW + 0.05, 0, 3.2, o.s0 - 0.1, o.s1 + 0.1); b.L(HW - 0.05, HW + 0.55, 0, 3.2, o.s0 - 0.1, o.s1 + 0.1); b.L(-HW - 0.8, HW + 0.8, 1.3, 2.15, o.s0, o.s1); b.L(-HW - 0.9, HW + 0.9, 2.15, 2.45, o.s0 - 0.1, o.s1 + 0.1);
      const m = b.mesh(M.curb); m.castShadow = m.receiveShadow = true; g.add(m);
      for (let i = 0; i < 6; i++) { const v = new THREE.Mesh(GEO.vine, M.vine), l = rnd(0.25, 0.45); v.scale.set(0.5, l, 1); addAt(g, v, rnd(-HW, HW), 1.3 - l / 2, o.s0 - 0.03); }
    } else {
      const l = mesh(GEO.log, M.bark, 1, 1.25, 1); l.rotation.z = Math.PI / 2 + rnd(-0.12, 0.12); addAt(g, l, 0, 1.72, mid);
      const lf = new THREE.Mesh(GEO.canopy, M.leaf); lf.scale.set(1.6, 1.1, 1.6); lf.castShadow = true; addAt(g, lf, (Math.random() < 0.5 ? -1 : 1) * (HW + 1.6), 1.9, mid);
      for (const s of [-1, 1]) addAt(g, mesh(GEO.rock, M.rock, 0.6, 0.9, 0.6), s * (HW + 0.2), 0.6, mid);
    }
  } else if (o.t === 'rubble') {
    for (const l of o.lanes) { const x = l * LW; addAt(g, mesh(GEO.rock, M.rock, 0.5, 0.38, 0.45), x - 0.25, 0.32, o.s0 + 0.3); addAt(g, mesh(GEO.rock, M.rock, 0.42, 0.42, 0.4), x + 0.3, 0.36, o.s0 + 0.55); addAt(g, mesh(GEO.rock, M.rock, 0.3, 0.25, 0.3), x, 0.62, o.s0 + 0.45); }
  } else if (o.t === 'block') {
    for (const l of o.lanes) {
      const x = l * LW;
      if (o.k === 0) {
        addAt(g, mesh(GEO.box, M.marble, 1.1, 0.45, 1.1), x, 0.22, mid);
        addAt(g, mesh(GEO.box, M.marble, 0.8, 1.4, 0.65), x, 1.15, mid);
        addAt(g, mesh(GEO.box, M.marble, 0.55, 0.55, 0.55), x, 2.12, mid);
        addAt(g, mesh(GEO.box, M.marble, 0.95, 0.15, 0.3), x, 1.75, mid - 0.2);
        for (const s of [-1, 1]) addAt(g, mesh(GEO.box, M.eye, 0.1, 0.06, 0.04, false), x + s * 0.13, 2.18, mid - 0.29);
      } else if (o.k === 1) {
        const r = mesh(GEO.rock, M.rock, 0.75, 0.95, 0.7); r.rotation.y = rnd(6); addAt(g, r, x, 0.85, mid);
        addAt(g, mesh(GEO.rock, M.rock, 0.4, 0.35, 0.4), x + 0.45, 0.25, mid - 0.4);
      } else {
        addAt(g, mesh(GEO.box, M.iron, 1.1, 0.14, 1.1), x, 0.07, mid);
        for (const s of [-0.3, 0, 0.3]) addAt(g, mesh(GEO.box, M.curb, 0.12, 0.2, 1.1), x + s, 0.1, mid);
        addFlame(sg, g, x, 0.05, mid, 1.9);
      }
    }
  }
  return g;
}
function updCoins(sg, spin) {
  const im = sg.coinMesh; if (!im) return;
  const m4 = _m4, q = _q.setFromEuler(_e.set(0, spin, 0));
  sg.coins.forEach((c, i) => { _s.setScalar(c.got ? 0 : 1); _p.set(-c.lat, c.y, c.s); m4.compose(_p, q, _s); im.setMatrixAt(i, m4); });
  im.instanceMatrix.needsUpdate = true;
}
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _v = new THREE.Vector3();
function disposeSeg(sg) {
  if (!sg.grp) return;
  scene.remove(sg.grp);
  sg.grp.traverse(o => { if (o.userData.own === true) { o.geometry.dispose(); if (o.material && o.material.map && o.material.map !== T.stone) o.material.dispose(); } else if (o.userData.own === 'inst') o.dispose(); });
  sg.grp = null; live.delete(sg);
}
function disposeTree(sg) { if (!sg) return; disposeSeg(sg); if (sg.next) disposeTree(sg.next); if (sg.arms) { disposeTree(sg.arms.L); disposeTree(sg.arms.R); } }
function disposeAll() { for (const sg of [...live]) disposeSeg(sg); retire.length = 0; }

// ---------- Läufer-Modell ----------
const P = {};
function buildPlayer() {
  const root = new THREE.Group();
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 });
  const mats = { skin: mat(0), shirt: mat(0), pants: mat(0), boots: mat(0), hair: mat(0), scarf: mat(0), pack: mat(0) };
  const part = (geo, m, x, y, z, parent, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; parent.add(o); return o; };
  const piv = (x, y, z, parent) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);
  const hips = piv(0, 0.95, 0, root);
  part(cap(0.15, 0.12), mats.pants, 0, 0, 0, hips, 1.25, 1, 0.9).rotation.z = Math.PI / 2;
  const torso = piv(0, 0.04, 0, hips);
  part(cap(0.18, 0.3), mats.shirt, 0, 0.3, 0, torso, 1.18, 1, 0.82);
  part(new THREE.BoxGeometry(0.34, 0.08, 0.26), mats.pants, 0, 0.06, 0, torso);
  const pack = part(new THREE.BoxGeometry(0.34, 0.38, 0.18), mats.pack, 0, 0.36, -0.2, torso);
  part(new THREE.BoxGeometry(0.36, 0.12, 0.2), mats.pack, 0, 0.5, -0.21, torso).material = mats.pack;
  const heart = part(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff0a0 }), 0.06, 0.58, -0.22, torso);
  const hglow = sprite(SP.glow, 0.5, 0.5); hglow.position.set(0.06, 0.58, -0.24); torso.add(hglow);
  part(new THREE.TorusGeometry(0.13, 0.05, 6, 14), mats.scarf, 0, 0.58, 0, torso).rotation.x = Math.PI / 2;
  const tails = [];
  for (const s of [-1, 1]) { const tp = piv(s * 0.05, 0.6, -0.12, torso); const t = part(new THREE.BoxGeometry(0.09, 0.5, 0.02), mats.scarf, 0, -0.25, 0, tp); tails.push(tp); }
  const head = piv(0, 0.66, 0.01, torso);
  part(new THREE.SphereGeometry(0.135, 16, 12), mats.skin, 0, 0.1, 0.01, head);
  part(new THREE.SphereGeometry(0.148, 16, 12), mats.hair, 0, 0.13, -0.03, head, 1, 0.95, 1.02);
  for (const s of [-1, 1]) part(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshBasicMaterial({ color: 0x1a1210 }), s * 0.05, 0.12, 0.128, head);
  const pony = piv(0, 0.17, -0.13, head); part(cap(0.045, 0.18), mats.hair, 0, -0.12, -0.03, pony);
  const ears = []; for (const s of [-1, 1]) { const e = part(new THREE.ConeGeometry(0.06, 0.16, 4), mats.hair, s * 0.09, 0.27, -0.01, head); e.rotation.z = -s * 0.3; ears.push(e); }
  const arms = [], legs = [];
  for (const s of [-1, 1]) {
    const sh = piv(s * 0.24, 0.5, 0, torso); part(cap(0.055, 0.2), mats.shirt, 0, -0.14, 0, sh);
    const el = piv(0, -0.29, 0, sh); part(cap(0.05, 0.18), mats.skin, 0, -0.12, 0, el); part(new THREE.SphereGeometry(0.055, 8, 6), mats.skin, 0, -0.25, 0, el);
    arms.push({ sh, el });
    const hp = piv(s * 0.1, -0.02, 0, hips); part(cap(0.075, 0.28), mats.pants, 0, -0.2, 0, hp);
    const kn = piv(0, -0.42, 0, hp); part(cap(0.065, 0.28), mats.pants, 0, -0.19, 0, kn);
    part(new THREE.BoxGeometry(0.13, 0.12, 0.27), mats.boots, 0, -0.42, 0.05, kn);
    legs.push({ hp, kn });
  }
  const ftail = piv(0, -0.05, -0.12, hips); part(cap(0.09, 0.35), mats.hair, 0, -0.22, 0, ftail); part(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff }), 0, -0.45, 0, ftail);
  const aura = sprite(SP.wglow, 2.2, 2.6); aura.position.y = 0.95; root.add(aura);
  const shieldM = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0x70e0ff, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
  shieldM.scale.set(0.75, 1.05, 0.75); shieldM.position.y = 0.95; root.add(shieldM);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }));
  scene.add(shadow);
  Object.assign(P, { root, hips, torso, head, pony, arms, legs, tails, mats, heart, hglow, ears, ftail, aura, shieldM, shadow, pack });
  scene.add(root); applySkin();
}
function applySkin() {
  const sk = SKINS[S.skin] || SKINS.mira;
  for (const k of ['skin', 'shirt', 'pants', 'boots', 'hair', 'scarf', 'pack']) P.mats[k].color.set(sk[k]);
  P.pony.visible = !!sk.tail; P.ears.forEach(e => e.visible = !!sk.ears); P.ftail.visible = !!sk.fox;
  if (sk.glow) { const [r, g, b] = sk.glow.split(',').map(Number); P.aura.material = new THREE.SpriteMaterial({ map: SP.wglow.map, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: new THREE.Color(r / 255, g / 255, b / 255), opacity: 0.5 }); P.aura.visible = true; }
  else P.aura.visible = false;
  P.skinGlow = !!sk.glow;
}
const pose = {};
function tgt(k, v, dt, rate = 16) { pose[k] = pose[k] === undefined ? v : pose[k] + (v - pose[k]) * Math.min(1, dt * rate); return pose[k]; }
let lastStep = 0;
function animPlayer(dt) {
  const st = G.state, run = st === 'run', idle = st === 'menu' || (run && G.camBlend < 0.3 && G.runT < 0.15);
  const air = (G.py > 0.05 || G.vy > 0) && G.pu.boost <= 0, sl = run && G.slide > 0, boost = G.pu.boost > 0;
  if (run || (st === 'dead' && G.deadT < 0.4)) G.phase += dt * Math.min(16, G.speed * 0.8);
  const ph = G.phase;
  let hipY = 0.95, torsoX = 0.2, torsoY = Math.sin(ph) * 0.12, rootX = 0;
  const L = [], A = [];
  for (let i = 0; i < 2; i++) {
    const p = ph + (i ? Math.PI : 0);
    let th = -Math.sin(p) * 0.95, kn = 0.25 + Math.max(0, Math.cos(p)) * 1.4, sh = Math.sin(p) * 0.85, el = -1.15, shz = 0;
    if (idle) { th = 0.05; kn = 0.1; sh = 0.1; el = -0.25; shz = 0; }
    if (air) { th = i ? -0.2 : -1.0; kn = i ? 0.9 : 1.5; sh = -2.2 - i * 0.3; el = -0.4; shz = 0.3; }
    if (boost) { th = -0.3; kn = 0.6; sh = -0.4; el = -0.2; shz = 1.2; }
    if (sl) { th = -1.45; kn = 0.15; sh = -0.5; el = -0.3; shz = 1.1; }
    L.push([th, kn]); A.push([sh, el, shz]);
  }
  if (idle) { hipY = 0.95 + Math.sin(G.t * 2) * 0.008; torsoX = 0.02 + Math.sin(G.t * 2) * 0.02; torsoY = Math.sin(G.t * 0.7) * 0.25; }
  else if (run && !air && !sl) { hipY = 0.95 + Math.abs(Math.cos(ph)) * 0.06 - 0.02; }
  if (sl) { hipY = 0.42; torsoX = -1.05; torsoY = 0; }
  if (boost) { torsoX = 0.55; }
  if (st === 'dead') { if (G.dead === 'fall') { rootX = 0.6; } else { rootX = -Math.min(1.45, G.deadT * 5); hipY = 0.95 - Math.min(0.75, G.deadT * 2.5); } }
  P.hips.position.y = tgt('hy', hipY, dt, 20);
  P.torso.rotation.x = tgt('tx', torsoX, dt); P.torso.rotation.y = tgt('ty', torsoY, dt);
  P.root.rotation.x = tgt('rx', rootX, dt, 10);
  for (let i = 0; i < 2; i++) {
    const s = i ? 1 : -1;
    P.legs[i].hp.rotation.x = tgt('th' + i, L[i][0], dt, 22); P.legs[i].kn.rotation.x = tgt('kn' + i, L[i][1], dt, 22);
    P.arms[i].sh.rotation.x = tgt('sh' + i, A[i][0], dt, 20); P.arms[i].el.rotation.x = tgt('el' + i, A[i][1], dt, 20); P.arms[i].sh.rotation.z = tgt('sz' + i, -s * A[i][2], dt);
  }
  P.head.rotation.x = tgt('hx', -torsoX * 0.6, dt);
  const fl = run ? 14 : 3;
  P.tails.forEach((t, i) => { t.rotation.x = (run ? -1.25 : -0.3) + Math.sin(G.t * fl + i * 1.7) * (run ? 0.2 : 0.06); t.rotation.z = Math.sin(G.t * fl * 0.7 + i) * 0.15; });
  P.pony.rotation.x = (run ? -0.9 : -0.2) + Math.sin(ph) * 0.25; P.pony.rotation.z = Math.cos(ph) * 0.2;
  P.ftail.rotation.x = -0.9 + Math.sin(ph * 0.5) * 0.15; P.ftail.rotation.z = Math.sin(ph) * 0.35;
  P.hglow.scale.setScalar(0.45 + Math.sin(G.t * 5) * 0.08);
  P.shieldM.visible = G.pu.shield > 0 && (G.pu.shield > 2 || Math.sin(G.t * 20) > 0);
  P.shieldM.material.opacity = 0.18 + Math.sin(G.t * 4) * 0.05;
  if (run && !air && !sl && Math.sin(ph) * Math.sin(ph - dt * G.speed * 0.8) < 0 && G.t - lastStep > 0.12) { lastStep = G.t; sfx('step'); }
}

// ---------- Nebelschlund ----------
const chaser = new THREE.Group(); scene.add(chaser);
const smokes = [];
for (let i = 0; i < 18; i++) { const s = sprite(SP.smoke, 1, 1); s.userData = { a: rnd(6.3), r: rnd(0.3, 1.5), y: rnd(0.1, 1.0), sz: rnd(0.5, 1.0), sp: rnd(0.8, 2) }; chaser.add(s); smokes.push(s); }
const shade = new THREE.MeshBasicMaterial({ color: 0x170822, transparent: true, opacity: 0.93 });
const eyes = [], beasts = [];
for (const side of [-1, 1]) {
  const g = new THREE.Group(); g.position.x = side * 1.05; g.scale.setScalar(0.72); chaser.add(g); beasts.push(g);
  const bd = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), shade); bd.scale.set(0.55, 0.75, 0.45); bd.position.y = 0.85; g.add(bd);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), shade); hd.position.set(0, 1.5, 0.12); g.add(hd);
  for (const s of [-1, 1]) { const ar = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.75, 4, 8), shade); ar.position.set(s * 0.5, 1.0, 0.3); ar.rotation.set(-1.1, 0, s * 0.45); g.add(ar); }
  for (const s of [-1, 1]) { const e = sprite(SP.eye, 0.24, 0.11); e.position.set(s * 0.13, 1.52, 0.42); g.add(e); eyes.push(e); }
}
function updChaser(dt) {
  const want = G.state === 'menu' ? 30 : G.state === 'dead' ? (G.dead === 'fall' ? 4 : 0.6) : G.runT < 2.4 ? 1.5 : G.chase > 0 ? 1.6 : 16;
  G.chaseD += (want - G.chaseD) * Math.min(1, dt * (G.state === 'dead' ? 2 : 1.4));
  const p = wp(cur, G.lat * 0.4, 0, G.s - G.chaseD);
  chaser.position.set(p[0], 0, p[2]); chaser.rotation.y = G.hd;
  chaser.visible = G.chaseD < 13;
  for (const s of smokes) { const u = s.userData; u.a += dt * u.sp; s.position.set(Math.cos(u.a) * u.r * 1.3, u.y + Math.sin(u.a * 1.3) * 0.2, Math.sin(u.a) * u.r * 0.6 - 0.4); const k = u.sz * (0.85 + Math.sin(G.t * 2 + u.a) * 0.15); s.scale.set(k, k, 1); }
  const blink = (G.t % 3.1) > 2.95 ? 0.1 : 1; eyes.forEach(e => e.scale.set(0.24, 0.11 * blink, 1));
  beasts.forEach((b, i) => { b.position.y = Math.abs(Math.sin(G.t * 9 + i * 1.6)) * 0.18; b.rotation.z = Math.sin(G.t * 9 + i) * 0.08; });
  G.chaseVis = clamp((13 - G.chaseD) / 11, 0, 1.6);
}

// ---------- Eingabe ----------
function act(a) {
  if (G.state !== 'run' || G.runT < 0.6) return;
  const boost = G.pu.boost > 0;
  if (a === 'U') {
    if (boost) return;
    if (G.py <= 0.001 && G.vy <= 0 && !overGap(cur, G.s)) { G.vy = JV; G.py = 0.001; G.slide = 0; G.ff = false; G.stats.jumps++; sfx('jump'); }
    else if (G.vy < 0 && G.py > 0) G.jbuf = 0.18;
  } else if (a === 'D') {
    if (boost) return;
    if (G.py > 0.05) { G.ff = true; G.vy = Math.min(G.vy, -7); }
    else if (G.py >= 0) { if (G.slide <= 0) { G.stats.slides++; sfx('slide'); } G.slide = 0.75; }
  } else {
    const win = Math.max(11, G.speed * 0.95);
    if (G.s > cur.len - win && (cur.end === a || cur.end === 'T')) { G.turnQ = a; return; }
    if (S.ctrl === 'tilt') return;
    const nl = G.lane + (a === 'L' ? -1 : 1);
    if (nl < -1 || nl > 1) { sfx('bump'); return; }
    G.prevLane = G.lane; G.lane = nl; G.latT = nl * LW; sfx('swish');
  }
}
const KEYS = { ArrowLeft: 'L', KeyA: 'L', ArrowRight: 'R', KeyD: 'R', ArrowUp: 'U', KeyW: 'U', Space: 'U', ArrowDown: 'D', KeyS: 'D' };
addEventListener('keydown', e => {
  audioInit();
  if (KEYS[e.code]) { e.preventDefault(); if (!e.repeat) act(KEYS[e.code]); }
  if ((e.code === 'Escape' || e.code === 'KeyP') && G.state === 'run') pause();
  if (e.code === 'Enter' && G.state === 'menu' && $('menu').classList.contains('on')) newRun();
});
let sw = null;
addEventListener('pointerdown', e => { audioInit(); if (e.target.closest('button')) return; sw = { x: e.clientX, y: e.clientY, done: false }; }, { passive: true });
addEventListener('pointermove', e => {
  if (!sw || sw.done) return;
  const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
  if (Math.hypot(dx, dy) < 20) return;
  sw.done = true;
  act(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'L' : 'R') : (dy < 0 ? 'U' : 'D'));
}, { passive: true });
addEventListener('pointerup', () => { sw = null; }, { passive: true });
addEventListener('pointercancel', () => { sw = null; }, { passive: true });
addEventListener('touchmove', e => e.preventDefault(), { passive: false });
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (G.state === 'run') pause(); save(); } else if (AC) AC.resume(); });
addEventListener('pagehide', save);
// Neigen
let tilt = 0, tilt0 = null;
addEventListener('deviceorientation', e => {
  if (e.gamma == null) return;
  const portrait = (screen.orientation ? screen.orientation.angle : (window.orientation || 0)) % 180 === 0;
  const v = portrait ? e.gamma : (e.beta || 0) * ((screen.orientation && screen.orientation.angle === 90) || window.orientation === 90 ? 1 : -1);
  tilt = v; if (tilt0 === null) tilt0 = v;
});
async function enableTilt() {
  try { if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') { const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') return false; } return true; }
  catch { return false; }
}

// ---------- Ablauf ----------
function newRun() {
  disposeAll(); genDist = 0; nextPu = 260;
  Object.assign(G, { state: 'run', t: G.t, s: 0, lat: 0, lane: 0, prevLane: 0, latT: 0, py: 0, vy: 0, slide: 0, ff: false, jbuf: 0, speed: 0, dist: 0, shards: 0, score: 0,
    turnQ: null, chase: 0, chaseD: 9, slow: 0, inv: 0, pu: { magnet: 0, shield: 0, boost: 0, double: 0 }, puMax: {}, revives: 0, dead: null, deadT: 0,
    hint: '', hintT: 0, seen: {}, shake: 0, cleanFrom: 0, overShown: false, runT: 0, camBlend: 0,
    stats: { jumps: 0, slides: 0, turns: 0, pus: 0, dodge: 0, shieldUse: 0 } });
  cur = mkSeg(0, 0, 0, 0, 120); cur.first = true; populate(cur, 30); buildSeg(cur);
  G.hd = 0; cam.yaw = 0; tilt0 = tilt;
  show(null); $('pauseBtn').style.display = 'block';
  sfx('roar');
}
function demoWorld() {
  disposeAll(); genDist = 0; nextPu = 1e9; G.dist = 0; G.speed = 11;
  cur = mkSeg(0, 0, 0, 0, 120); cur.first = true; populate(cur, 30); cur.obs = []; cur.gaps = []; cur.coins = cur.coins.filter(c => c.s > 25); buildSeg(cur);
  Object.assign(G, { s: 0, lat: 0, lane: 0, latT: 0, py: 0, vy: 0, slide: 0, state: 'menu', hd: 0, camBlend: 0, chaseD: 30, pu: { magnet: 0, shield: 0, boost: 0, double: 0 } });
  cam.yaw = 0;
}
function stepRun(dt) {
  G.runT += dt;
  const boost = G.pu.boost > 0;
  const target = G.runT < 0.5 ? 0 : Math.min(25, 11 + G.dist * 0.004) * (boost ? 1.3 : 1) * (G.slow > 0 ? 0.82 : 1);
  G.speed += (target - G.speed) * Math.min(1, dt * (G.runT < 1.5 ? 3 : 2));
  const ds = G.speed * dt; G.s += ds; G.dist += ds;
  if (S.ctrl === 'tilt') { G.latT = clamp((tilt - (tilt0 || 0)) / 20, -1, 1) * LW * 1.15; const nl = clamp(Math.round(G.latT / LW), -1, 1); if (nl !== G.lane) { G.prevLane = G.lane; G.lane = nl; } }
  G.lat += (G.latT - G.lat) * Math.min(1, dt * (S.ctrl === 'tilt' ? 10 : 15));
  if (boost) { G.py += (2.7 - G.py) * Math.min(1, dt * 5); G.vy = 0; G.slide = 0; }
  else {
    const gap = overGap(cur, G.s);
    if (G.py > 0 || G.vy > 0 || gap) {
      G.vy -= GRAV * dt * (G.ff ? 2.2 : 1); G.py += G.vy * dt;
      if (G.py <= 0 && !gap && G.py > -0.25) {
        G.py = 0; G.vy = 0; dust(6); sfx('land');
        if (G.ff) { G.ff = false; G.slide = 0.75; G.stats.slides++; sfx('slide'); }
        if (G.jbuf > 0) { G.jbuf = 0; act('U'); }
      } else if (G.py <= -0.25 && !gap) return die('fall');
      if (gap && G.py < -0.7) return die('fall');
    }
  }
  if (G.slide > 0) G.slide -= dt;
  if (G.jbuf > 0) G.jbuf -= dt;
  for (const k in G.pu) if (G.pu[k] > 0) { G.pu[k] -= dt; if (G.pu[k] <= 0) { G.pu[k] = 0; if (k === 'boost') { G.inv = 1.2; G.vy = 0; } } }
  if (G.inv > 0) G.inv -= dt; if (G.slow > 0) G.slow -= dt;
  if (G.chase > 0) { G.chase -= dt; if (G.chase <= 0) G.chase = 0; }
  const win = Math.max(11, G.speed * 0.95);
  if (boost && !G.turnQ && G.s > cur.len - win) G.turnQ = cur.end === 'T' ? (Math.random() < 0.5 ? 'L' : 'R') : cur.end;
  if (G.turnQ && G.s >= cur.len - 1.0) doTurn(G.turnQ);
  else if (G.s > cur.len + HW - 0.6) return die('wall');
  for (let i = retire.length - 1; i >= 0; i--) if (G.dist > retire[i].at) { const r = retire[i]; r.sub ? disposeTree(r.sg) : disposeSeg(r.sg); retire.splice(i, 1); }
  collide(); if (G.state !== 'run') return;
  collect(dt);
  if (!S.tut) {
    if (G.s > cur.len - win - 4 && !G.turnQ) hint(cur.end === 'T' ? '← oder → wischen: abbiegen!' : cur.end === 'L' ? '← wischen: links abbiegen!' : '→ wischen: rechts abbiegen!');
    for (const o of cur.obs) if (!G.seen[o.t] && o.s0 - G.s < 15 && o.s0 > G.s) {
      G.seen[o.t] = 1; hint({ low: '↑ wischen: springen!', high: '↓ wischen: rutschen!', gap: '↑ wischen: über die Lücke springen!', rubble: S.ctrl === 'tilt' ? 'Neigen oder springen!' : '← → ausweichen oder springen!', block: S.ctrl === 'tilt' ? 'Handy neigen: ausweichen!' : '← → wischen: ausweichen!' }[o.t]);
    }
    if (G.dist > 900) { S.tut = true; save(); }
  }
  for (const o of cur.obs) if (!o.passed && G.s > o.s1 + 0.4) { o.passed = 1; if (!o.dead) G.stats.dodge++; }
  G.score = Math.floor(G.dist) * S.mlv + G.shards * 10;
  missCheck();
}
function hint(t) { if (G.hint !== t || G.hintT <= 0) { G.hint = t; G.hintT = 2.2; } }
function doTurn(d) {
  const old = cur; expand(old);
  const nx = old.end === 'T' ? old.arms[d] : old.next;
  const along = G.s - old.len, lat = G.lat;
  let ns, nl;
  if (d === 'R') { ns = lat; nl = -along; } else { ns = -lat; nl = along; }
  G.s = ns; G.lat = nl; G.prevLane = G.lane = clamp(Math.round(nl / LW), -1, 1);
  G.latT = S.ctrl === 'tilt' ? G.latT : G.lane * LW;
  retire.push({ sg: old, at: G.dist + 70 });
  if (old.end === 'T') retire.push({ sg: old.arms[d === 'L' ? 'R' : 'L'], at: G.dist + 30, sub: true });
  G.turnQ = null; cur = nx;
  G.stats.turns++; sfx('turn');
}
function laneHit(o) { for (const l of o.lanes) if (Math.abs(G.lat - l * LW) < 0.8) return true; return false; }
function collide() {
  if (G.pu.boost > 0 || G.inv > 0) return;
  for (const o of cur.obs) {
    if (o.dead || o.t === 'gap' || G.s < o.s0 - 0.35 || G.s > o.s1 + 0.35) continue;
    let hit = false;
    if (o.t === 'low') hit = G.py < 0.95;
    else if (o.t === 'high') hit = G.slide <= 0;
    else if (o.t === 'rubble') hit = laneHit(o) && G.py < 0.75;
    else hit = laneHit(o) && G.py < 2.3;
    if (hit) return onHit(o);
  }
}
function onHit(o) {
  if (G.pu.shield > 0) { G.pu.shield = 0; o.dead = true; if (o.mesh) o.mesh.visible = false; G.inv = 0.8; G.stats.shieldUse++; burst(); sfx('shield'); G.shake = 0.4; return; }
  const moving = Math.abs(G.lat - G.latT) > 0.15 || S.ctrl === 'tilt';
  const sideways = (o.t === 'block' || o.t === 'rubble') && moving && Math.abs(G.lat - G.lane * LW) > 0.3 && !o.lanes.includes(G.prevLane);
  if (sideways) { G.lane = G.prevLane; if (S.ctrl !== 'tilt') G.latT = G.lane * LW; G.inv = 0.6; stumble(); return; }
  die('crash');
}
function stumble() {
  G.shake = 0.35; G.cleanFrom = G.dist;
  if (G.chase > 0) return die('caught');
  G.chase = 8; G.slow = 1.2; sfx('stumble'); toast('Gestolpert! Der Nebel holt auf …', 1.6);
}
function die(kind) {
  G.state = 'dead'; G.dead = kind; G.deadT = 0; G.shake = kind === 'fall' ? 0.2 : 0.6;
  G.cleanFrom = G.dist;
  if (kind === 'fall') { sfx('fall'); G.vy = Math.min(G.vy, 0); }
  else { sfx('crash'); if (kind !== 'caught') G.vy = 4; }
  setTimeout(() => sfx('roar'), 450);
  $('pauseBtn').style.display = 'none';
}
function stepDead(dt) {
  G.deadT += dt;
  if (G.dead === 'fall') { G.vy -= GRAV * dt; G.py += G.vy * dt; G.s += G.speed * dt * Math.max(0, 1 - G.deadT * 1.5); }
  else { G.s -= dt * 2.5 * Math.max(0, 1 - G.deadT * 3); if (G.py > 0 || G.vy > 0) { G.vy -= GRAV * dt; G.py = Math.max(0, G.py + G.vy * dt); } }
  if (G.deadT > 1.5 && !G.overShown) gameOver();
}
function collect(dt) {
  const mag = G.pu.magnet > 0 || G.pu.boost > 0, val = G.pu.double > 0 ? 2 : 1;
  for (const c of cur.coins) {
    if (c.got) continue;
    const rel = c.s - G.s;
    if (mag && rel > -1 && rel < 16) c.mag = true;
    if (c.mag) { const k = Math.min(1, dt * 9); c.s = G.s + rel * (1 - k); c.lat += (G.lat - c.lat) * k; c.y += (G.py + 0.9 - c.y) * k; }
    if (Math.abs(c.s - G.s) < 0.9 && Math.abs(c.lat - G.lat) < 0.8 && Math.abs(c.y - (G.py + (G.slide > 0 ? 0.4 : 0.9))) < 1.15) {
      c.got = true; G.shards += val; sfx('coin'); sparkle();
    }
  }
  for (const p of cur.pus) {
    if (p.got) continue;
    if (Math.abs(p.s - G.s) < 1 && Math.abs(p.lat - G.lat) < 0.9 && G.py < 2.2) {
      p.got = true; if (p.spr) { p.spr.visible = false; p.gl.visible = false; }
      const u = UPS[p.t], dur = u.base + u.per * S.up[p.t];
      G.pu[p.t] = dur; G.puMax[p.t] = dur; G.stats.pus++; sfx('power'); toast(u.n + '!', 1.2);
    }
  }
}
function missCheck() {
  const st = { dist: G.dist, shards: G.shards, score: G.score, nocoin: G.shards === 0 ? G.dist : 0, clean: G.dist - G.cleanFrom, ...G.stats };
  S.mis.forEach((m, i) => {
    if ((st[m.k] || 0) >= m.g) {
      const reward = 100 + 50 * S.mlv; S.shards += reward;
      toast('Mission geschafft: ' + m.t.replace('{g}', m.g.toLocaleString('de')) + '  🪙 +' + reward, 2.6); sfx('mission');
      S.mis[i] = missAt(S.mseq++); S.mdone = (S.mdone || 0) + 1;
      if (S.mdone % 3 === 0) { S.mlv++; setTimeout(() => toast('Multiplikator jetzt ×' + S.mlv + '!', 2.2), 2700); }
      save();
    }
  });
}

// ---------- Partikel (Bildschirm) ----------
const parts = [];
function scr(x, y, z) { _v.set(x, y, z).project(camera); return { x: (_v.x + 1) / 2 * W, y: (1 - _v.y) / 2 * H, ok: _v.z < 1 }; }
function pScr(dy = 1) { const p = P.root.position; return scr(p.x, p.y + dy, p.z); }
function dust(n) { const p = pScr(0.05), k = H * 0.04; for (let i = 0; i < n; i++) parts.push({ x: p.x + rnd(-1, 1) * k * 0.6, y: p.y, vx: rnd(-1, 1) * k * 1.6, vy: -rnd(0.3, 1.2) * k, life: 0.5, max: 0.5, c: '220,200,170', r: k * rnd(0.08, 0.16), g: 1 }); }
function sparkle() { const p = pScr(1.1), k = H * 0.04; for (let i = 0; i < 6; i++) parts.push({ x: p.x + rnd(-1, 1) * k * 0.4, y: p.y, vx: rnd(-1, 1) * k * 2, vy: -rnd(0.5, 2.5) * k, life: 0.45, max: 0.45, c: '255,220,90', r: k * 0.08, add: 1 }); }
function burst() { const p = pScr(1), k = H * 0.04; for (let i = 0; i < 28; i++) parts.push({ x: p.x, y: p.y, vx: rnd(-1, 1) * k * 7, vy: rnd(-1.5, 0.5) * k * 5, life: 0.7, max: 0.7, c: '120,230,255', r: k * rnd(0.05, 0.14), add: 1 }); }
function stepParts(dt) { for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.life -= dt; if (q.life <= 0) { parts.splice(i, 1); continue; } q.x += q.vx * dt; q.y += q.vy * dt; if (q.g) q.vy += H * 0.5 * dt; } }

// ---------- Licht & Kamera ----------
const col3 = (c, o) => o.setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace);
let PAL = PH[0];
function updWorld(dt) {
  const d = G.dist / 1000, i = Math.floor(d) % 4, f = d - Math.floor(d), t = sm(clamp((f - 0.8) / 0.2, 0, 1)), a = PH[i], b = PH[(i + 1) % 4];
  PAL = {}; for (const k in a) PAL[k] = Array.isArray(a[k]) ? lerpC(a[k], b[k], t) : a[k] + (b[k] - a[k]) * t;
  col3(PAL.fog, scene.fog.color);
  col3(PAL.top, skyMat.uniforms.top.value); col3(PAL.fog, skyMat.uniforms.hor.value); col3(PAL.bot, skyMat.uniforms.bot.value); col3(PAL.sun, skyMat.uniforms.sunCol.value);
  col3(PAL.sun, sun.color); sun.intensity = PAL.si; col3(PAL.hs, hemi.color); col3(PAL.hg, hemi.groundColor); hemi.intensity = PAL.hi;
  heartLight.intensity = PAL.night * 7 + 0.3;
  SP.glow.opacity = 0.55 + PAL.night * 0.4;
  const sd = new THREE.Vector3(SUNOFF.x, SUNOFF.y * (PAL.night > 0.5 ? 1.4 : 1), SUNOFF.z).normalize(); skyMat.uniforms.sunDir.value.copy(sd);
  // Animationen der sichtbaren Abschnitte
  const spin = G.t * 3.2;
  for (const sg of live) {
    updCoins(sg, spin);
    for (const fl of sg.flames) { const k = 0.85 + Math.sin(G.t * 21 + fl.ph) * 0.1 + Math.sin(G.t * 33 + fl.ph) * 0.05; fl.f.scale.set(fl.size * 0.6 * (2 - k), fl.size * k, 1); fl.gl.scale.setScalar(fl.size * (2.2 + PAL.night * 1.4) * k); }
    for (const u of sg.pus) if (u.spr && !u.got) { const y = 1.1 + Math.sin(G.t * 3 + u.s) * 0.15; u.spr.position.y = y; u.gl.position.y = y; }
    if (sg.arrow) sg.arrow.material.opacity = 0.75 + Math.sin(G.t * 6) * 0.25;
  }
}
function updCamera(dt) {
  const tyaw = Math.atan2(cur.fx, cur.fz);
  G.hd += wrapPi(tyaw - G.hd) * Math.min(1, dt * 16);
  cam.yaw += wrapPi(tyaw - cam.yaw) * Math.min(1, dt * 6.5);
  const pp = wp(cur, G.lat, Math.max(G.py, -3), G.s);
  P.root.position.set(pp[0], pp[1], pp[2]);
  P.root.rotation.y = G.hd; P.root.rotation.z = clamp((G.latT - G.lat) * 0.2, -0.3, 0.3);
  P.root.visible = !(G.state === 'dead' && G.dead === 'fall' && G.py < -8);
  const gp = wp(cur, G.lat, 0.02, G.s);
  P.shadow.position.set(gp[0], 0.02, gp[2]); P.shadow.visible = G.py > -0.1 && !overGap(cur, G.s);
  P.shadow.material.opacity = clamp(0.32 - G.py * 0.06, 0.06, 0.32);
  heartLight.position.set(pp[0], pp[1] + 1.5, pp[2]);
  sun.position.set(pp[0] + SUNOFF.x, pp[1] + SUNOFF.y, pp[2] + SUNOFF.z); sun.target.position.set(pp[0], 0, pp[2] + 3);
  const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw), rx = -fz, rz = fx;
  const base = wp(cur, G.lat * 0.55, 0, G.s);
  const cy = G.state === 'dead' && G.dead === 'fall' ? Math.max(G.py, -2) * 0.3 : G.py * 0.4;
  // Laufkamera
  const run = [base[0] - fx * 5.1, 2.85 + cy, base[2] - fz * 5.1], look = [base[0] + fx * 6, 0.8 + cy * 0.6, base[2] + fz * 6];
  // Menü-/Intro-Kamera: vor der Läuferin, Blick zurück auf den Tempel
  const ang = Math.PI * 0.84 + Math.sin(G.t * 0.25) * 0.22, rad = 6.2;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const bx = -fx * ca + rx * sa, bz = -fz * ca + rz * sa;
  const mlook = [pp[0], 1.3, pp[2]];
  const target = G.state === 'menu' ? 0 : 1;
  G.camBlend += (target - G.camBlend) * Math.min(1, dt * (G.state === 'menu' ? 3 : 1.6));
  const e = sm(clamp(G.camBlend, 0, 1));
  if (e > 0.999) camera.position.set(...run);
  else {
    // auf einem Bogen um die Läuferin schwenken statt durch sie hindurch
    const a2 = ang * (1 - e), r2 = rad + (5.15 - rad) * e, c2 = Math.cos(a2), s2 = Math.sin(a2);
    camera.position.set(pp[0] - fx * c2 * r2 + rx * s2 * r2 * 0.6 + (base[0] - pp[0]) * e, 1.9 + (2.85 + cy - 1.9) * e, pp[2] - fz * c2 * r2 + rz * s2 * r2 * 0.6 + (base[2] - pp[2]) * e);
    void bx; void bz;
  }
  const el = e * e * e;
  const lk = [mlook[0] + (look[0] - mlook[0]) * el, mlook[1] + (look[1] - mlook[1]) * el, mlook[2] + (look[2] - mlook[2]) * el];
  if (G.shake > 0) { camera.position.x += rnd(-1, 1) * G.shake * 0.25; camera.position.y += rnd(-1, 1) * G.shake * 0.25; }
  camera.lookAt(lk[0], lk[1], lk[2]);
  const portrait = camera.aspect < 1;
  camera.fov = (portrait ? 64 : 52) + clamp((G.speed - 11) * 0.45, 0, 7) + (G.pu.boost > 0 ? 5 : 0);
  camera.updateProjectionMatrix();
  sky.position.copy(camera.position);
  floor.position.x = Math.round(camera.position.x / 12) * 12; floor.position.z = Math.round(camera.position.z / 12) * 12;
}

// ---------- HUD ----------
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
function coinIcon(x, y, r) { const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r); g.addColorStop(0, '#fff2a8'); g.addColorStop(0.5, '#ffc23a'); g.addColorStop(1, '#c87818'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.strokeStyle = '#8a4a10'; ctx.lineWidth = r * 0.18; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 3.6, 5.2); ctx.stroke(); }
function hud() {
  ctx.clearRect(0, 0, W, H);
  // Nebel-Vignette
  const v = Math.min(1, G.chaseVis);
  if (v > 0.02 && G.state !== 'menu') { const vg = ctx.createLinearGradient(0, H * (1 - 0.45 * v), 0, H); vg.addColorStop(0, 'rgba(20,6,36,0)'); vg.addColorStop(1, `rgba(20,6,36,${0.4 * v})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H); }
  if (G.state === 'dead' && G.dead === 'caught') { ctx.fillStyle = `rgba(16,4,28,${Math.min(0.9, G.deadT * 0.8)})`; ctx.fillRect(0, 0, W, H); }
  for (const q of parts) { ctx.globalAlpha = q.life / q.max; ctx.fillStyle = `rgb(${q.c})`; if (q.add) ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  ctx.globalAlpha = 1;
  if (G.state === 'run' && (G.speed > 17 || G.pu.boost > 0)) {
    const n = G.pu.boost > 0 ? 18 : Math.floor((G.speed - 17) * 1.5), cx = W / 2, cy = H * 0.45;
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = DPR * 1.5;
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r0 = Math.max(W, H) * rnd(0.38, 0.55); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r0 * 1.25, cy + Math.sin(a) * r0 * 1.25); ctx.stroke(); }
  }
  if (G.state !== 'run' && G.state !== 'dead' && G.state !== 'pause') return;
  const s = DPR, top = SAFE_T + 12 * s;
  ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
  const txt = (t, x, y, size, al = 'left', col = '#fff7e6') => {
    ctx.font = `900 ${size * s}px "Avenir Next",system-ui,sans-serif`;
    if (al === 'center') { const m = ctx.measureText(t).width; if (m > W * 0.9) { size *= W * 0.9 / m; ctx.font = `900 ${size * s}px "Avenir Next",system-ui,sans-serif`; } }
    ctx.textAlign = al; ctx.lineWidth = size * s * 0.22; ctx.strokeStyle = 'rgba(27,18,30,.85)'; ctx.strokeText(t, x, y); ctx.fillStyle = col; ctx.fillText(t, x, y);
  };
  txt(G.score.toLocaleString('de'), 14 * s, top, 30);
  txt(Math.floor(G.dist) + ' m  ·  ×' + S.mlv, 14 * s, top + 36 * s, 15, 'left', '#ffd35a');
  txt(String(G.shards), W - 46 * s, top + 4 * s, 24, 'right', '#ffd35a'); coinIcon(W - 28 * s, top + 17 * s, 12 * s);
  let y = top + 64 * s;
  for (const k in UPS) if (G.pu[k] > 0) {
    const f = clamp(G.pu[k] / (G.puMax[k] || 1), 0, 1);
    ctx.drawImage(PUC[k], 12 * s, y - 2 * s, 26 * s, 26 * s);
    ctx.fillStyle = 'rgba(0,0,0,.4)'; rr(42 * s, y + 8 * s, 80 * s, 8 * s, 4 * s); ctx.fill();
    ctx.fillStyle = UPS[k].col; rr(42 * s, y + 8 * s, 80 * s * f, 8 * s, 4 * s); ctx.fill();
    y += 30 * s;
  }
  if (G.hintT > 0 && G.state === 'run') { ctx.globalAlpha = Math.min(1, G.hintT * 2); txt(G.hint, W / 2, H * 0.2, 22, 'center'); ctx.globalAlpha = 1; }
  if (G.runT > 0.4 && G.runT < 2.8 && G.state === 'run' && G.revives === 0) { ctx.globalAlpha = clamp(2.8 - G.runT, 0, 1); txt('LAUF!', W / 2, H * 0.28, 56, 'center', '#ffd35a'); ctx.globalAlpha = 1; }
}

// ---------- Hauptschleife ----------
let last = 0, fpsN = 0, fpsT = 0, fps = 60, lowT = 0, birdT = 3;
function frame(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts;
  fpsN++; fpsT += dt;
  if (fpsT > 1) { fps = fpsN / fpsT; fpsN = 0; fpsT = 0; if (fps < 45 && PR > 1) { lowT++; if (lowT >= 2) { PR = Math.max(1, PR - 0.25); renderer.setPixelRatio(PR); renderer.setSize(innerWidth, innerHeight, false); lowT = 0; } } else lowT = 0; }
  if (G.state !== 'pause') {
    G.t += dt;
    if (G.state === 'run') stepRun(dt);
    else if (G.state === 'dead') stepDead(dt);
    if (G.hintT > 0) G.hintT -= dt; if (G.shake > 0) G.shake -= dt;
    stepParts(dt);
    if ((birdT -= dt) < 0) { birdT = rnd(3, 9); if (G.state !== 'run' || Math.random() < 0.3) sfx('bird'); }
  }
  if (cur) {
    if (G.state !== 'pause') { ensure(cur, -G.s, 0); updWorld(dt); updCamera(dt); animPlayer(dt); updChaser(dt); }
    renderer.render(scene, camera);
  }
  hud();
  requestAnimationFrame(frame);
}

// ---------- Menüs ----------
function show(id) { for (const s of document.querySelectorAll('.scr')) s.classList.toggle('on', s.id === id); }
let toastT = 0;
function toast(t, sec = 1.6) { const e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), sec * 1000); }
function menu() { demoWorld(); $('pauseBtn').style.display = 'none'; applySkin(); refreshMenu(); show('menu'); }
function refreshMenu() { $('mBest').textContent = S.best.toLocaleString('de'); $('mShards').textContent = S.shards.toLocaleString('de'); $('mMult').textContent = S.mlv; setMute(S.mute); $('ctrlBtn').textContent = S.ctrl === 'tilt' ? '📱 Steuerung: Neigen' : '👆 Steuerung: Wischen'; }
function pause() { if (G.state !== 'run') return; G.state = 'pause'; show('pause'); save(); }
function gameOver() {
  G.overShown = true;
  const rec = G.score > S.best;
  if (rec) S.best = G.score;
  S.shards += G.shards; S.runs++; save();
  $('oTitle').textContent = { fall: 'Abgestürzt!', wall: 'Gegen die Mauer!', crash: 'Aufgeprallt!', caught: 'Der Nebel hat dich!' }[G.dead];
  $('oRec').style.display = rec ? 'block' : 'none';
  $('oScore').textContent = G.score.toLocaleString('de'); $('oDist').textContent = Math.floor(G.dist).toLocaleString('de'); $('oSh').textContent = G.shards;
  const cost = 250 * Math.pow(2, G.revives); $('oCost').textContent = cost; $('bRevive').style.display = S.shards >= cost ? '' : 'none';
  show('over');
}
function revive() {
  const cost = 250 * Math.pow(2, G.revives); if (S.shards < cost) return;
  S.shards -= cost; G.revives++; save();
  if (G.dead === 'wall' || G.s > cur.len - 3) { G.s = cur.len; G.lat = 0; G.lane = 0; G.latT = 0; doTurn(cur.end === 'T' ? 'L' : cur.end); }
  if (G.dead === 'fall') { const g = cur.gaps.find(g => G.s > g[0] - 2 && G.s < g[1] + 2); if (g) G.s = g[1] + 0.5; }
  for (const o of cur.obs) if (o.s1 > G.s - 2 && o.s0 < G.s + 30 && o.t !== 'gap') { o.dead = true; if (o.mesh) o.mesh.visible = false; }
  if (cur.gaps.some(g => g[1] > G.s - 1 && g[0] < G.s + 30)) { cur.gaps = cur.gaps.filter(g => g[1] < G.s - 1 || g[0] > G.s + 30); disposeSeg(cur); buildSeg(cur); }
  Object.assign(G, { state: 'run', py: 0, vy: 0, slide: 0, inv: 2.5, chase: 0, chaseD: 12, dead: null, overShown: false, speed: G.speed * 0.8, runT: 3 });
  G.shards = 0;
  show(null); $('pauseBtn').style.display = 'block'; sfx('power');
}
let shopTab = 'up';
function renderShop() {
  $('sShards').textContent = S.shards.toLocaleString('de');
  $('tUp').classList.toggle('sel', shopTab === 'up'); $('tSk').classList.toggle('sel', shopTab === 'sk');
  const L = $('shopList'); L.innerHTML = '';
  if (shopTab === 'up') for (const k in UPS) {
    const u = UPS[k], lv = S.up[k], cost = UPCOST[lv];
    const d = document.createElement('div'); d.className = 'item';
    d.innerHTML = `<img class="ava" src="${PUC[k].toDataURL()}"><div class="t"><b>${u.n}</b><small>${u.d} · ${u.base + u.per * lv} s</small><div class="lv">${[0, 1, 2, 3, 4].map(i => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div></div>`;
    const b = document.createElement('button'); b.className = 'btn small'; b.textContent = lv >= 5 ? 'MAX' : '🪙 ' + cost.toLocaleString('de'); b.disabled = lv >= 5 || S.shards < cost;
    b.onclick = () => { if (S.shards < cost) return; S.shards -= cost; S.up[k]++; save(); sfx('power'); renderShop(); };
    d.appendChild(b); L.appendChild(d);
  } else for (const k in SKINS) {
    const sk = SKINS[k], own = S.owned.includes(k);
    const d = document.createElement('div'); d.className = 'item';
    d.innerHTML = `<canvas class="ava" width="92" height="92"></canvas><div class="t"><b>${sk.n}</b><small>${sk.d}</small></div>`;
    const b = document.createElement('button'); b.className = 'btn small';
    b.textContent = S.skin === k ? 'AKTIV' : own ? 'WÄHLEN' : '🪙 ' + sk.cost.toLocaleString('de'); b.disabled = S.skin === k || (!own && S.shards < sk.cost);
    b.onclick = () => { if (!own) { if (S.shards < sk.cost) return; S.shards -= sk.cost; S.owned.push(k); } S.skin = k; save(); applySkin(); sfx('power'); renderShop(); };
    d.appendChild(b); L.appendChild(d);
    avatar(d.querySelector('canvas'), sk);
  }
}
// kleines 2D-Porträt für den Shop
function avatar(c, sk) {
  const g = c.getContext('2d'), u = 2.4; g.save(); g.translate(46, 88); g.scale(u, u); g.lineCap = 'round';
  if (sk.glow) { g.fillStyle = `rgba(${sk.glow},.35)`; g.beginPath(); g.arc(0, -18, 16, 0, 7); g.fill(); }
  g.strokeStyle = sk.pants; g.lineWidth = 4.4; g.beginPath(); g.moveTo(-2.4, -16); g.lineTo(-3, -8); g.lineTo(-3.1, -1); g.moveTo(2.4, -16); g.lineTo(3, -8); g.lineTo(3.1, -1); g.stroke();
  g.fillStyle = sk.boots; g.fillRect(-5.7, -2.5, 5.2, 3.6); g.fillRect(0.5, -2.5, 5.2, 3.6);
  g.strokeStyle = sk.shirt; g.lineWidth = 3.3; g.beginPath(); g.moveTo(-5, -27); g.lineTo(-7.4, -20); g.lineTo(-7, -15); g.moveTo(5, -27); g.lineTo(7.4, -20); g.lineTo(7, -15); g.stroke();
  g.fillStyle = sk.shirt; g.beginPath(); g.roundRect ? g.roundRect(-5.5, -28, 11, 13, 3.5) : g.rect(-5.5, -28, 11, 13); g.fill();
  g.fillStyle = sk.pack; g.fillRect(-4.2, -27, 8.4, 9);
  g.fillStyle = sk.hair; g.beginPath(); g.arc(0, -32, 4.4, 0, 7); g.fill();
  if (sk.ears) { g.beginPath(); g.moveTo(-4, -34); g.lineTo(-3.5, -40); g.lineTo(-0.8, -35.8); g.moveTo(4, -34); g.lineTo(3.5, -40); g.lineTo(0.8, -35.8); g.fill(); }
  g.fillStyle = sk.scarf; g.fillRect(-4.6, -29, 9.2, 2.8); g.strokeStyle = sk.scarf; g.lineWidth = 2.2; g.beginPath(); g.moveTo(2, -27.5); g.quadraticCurveTo(6, -24, 8, -20); g.stroke();
  g.restore();
}
function renderMiss() {
  $('msMult').textContent = '×' + S.mlv;
  $('missList').innerHTML = S.mis.map(m => `<div class="item mi"><span class="chk">◇</span><div class="t"><b>${m.t.replace('{g}', m.g.toLocaleString('de'))}</b><small>Belohnung 🪙 ${100 + 50 * S.mlv}</small></div></div>`).join('') +
    `<p style="text-align:center;font-size:13px;opacity:.75">Noch ${3 - ((S.mdone || 0) % 3)} bis zum nächsten Multiplikator</p>`;
}
$('bPlay').onclick = () => { audioInit(); sfx('click'); newRun(); };
$('bShop').onclick = () => { sfx('click'); renderShop(); show('shop'); };
$('tUp').onclick = () => { shopTab = 'up'; renderShop(); };
$('tSk').onclick = () => { shopTab = 'sk'; renderShop(); };
$('bShopBack').onclick = () => { sfx('click'); refreshMenu(); show('menu'); };
$('bMiss').onclick = () => { sfx('click'); renderMiss(); show('miss'); };
$('bMissBack').onclick = () => { sfx('click'); show('menu'); };
$('muteBtn').onclick = () => { audioInit(); setMute(!S.mute); };
$('ctrlBtn').onclick = async () => {
  sfx('click');
  if (S.ctrl === 'swipe') { if (await enableTilt()) { S.ctrl = 'tilt'; toast('Neigen: Handy kippen zum Ausweichen, Wischen zum Springen, Rutschen und Abbiegen', 3.5); } else toast('Neigen ist hier nicht verfügbar', 2); }
  else S.ctrl = 'swipe';
  save(); refreshMenu();
};
$('pauseBtn').onclick = () => pause();
$('bResume').onclick = () => { G.state = 'run'; show(null); };
$('bQuit').onclick = () => { G.state = 'dead'; G.overShown = true; S.shards += G.shards; if (G.score > S.best) S.best = G.score; save(); menu(); };
$('bAgain').onclick = () => { sfx('click'); newRun(); };
$('bMenu').onclick = () => { sfx('click'); menu(); };
$('bRevive').onclick = () => revive();

// ---------- Start ----------
resize(); buildPlayer(); demoWorld(); refreshMenu();
requestAnimationFrame(frame);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
window.WP = { G, S, act, newRun, get cur() { return cur; }, get fps() { return fps; }, get pr() { return PR; }, LW, HW, renderer };
