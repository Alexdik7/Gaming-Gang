// Turbofieber – Stadt Velara: Straßenraster, Gebäude mit Fenster-Shader, Leuchtreklamen,
// Laternen, Markierungen, Parks, Skyline, Himmel und Tageszeiten.
import * as THREE from 'three';

export const BLOCK = 64;              // Kantenlänge eines Häuserblocks (inkl. Gehweg)
export const ROAD = 22;               // Straßenbreite
export const N = 9;                   // Blöcke pro Richtung
export const CELL = BLOCK + ROAD;
export const SIZE = N * CELL + ROAD;  // Ausdehnung inkl. Ringstraße
export const OFF = -SIZE / 2;         // Weltursprung in der Stadtmitte

// Mittellinie der k-ten Straße (k = 0 … N)
export const roadCenter = k => OFF + ROAD / 2 + k * CELL;
// Rechteck des Blocks (i, j)
export function blockRect(i, j) {
  const x0 = OFF + ROAD + i * CELL, z0 = OFF + ROAD + j * CELL;
  return { x0, x1: x0 + BLOCK, z0, z1: z0 + BLOCK };
}

// Fester Zufall: jede Sitzung sieht gleich aus
function mulberry(a) {
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NEON = ['#ff2a8a', '#22e8ff', '#ffd23a', '#a64aff', '#2aff8a', '#ff6a2a'];
const FACADES = ['#8a8f99', '#6f7c8f', '#9a8a7a', '#5d6a7a', '#b0a898', '#7a6f8a', '#4f5a68', '#a39486'];

// Weiche Kreis-Textur für Lichtkegel und Rauch
export function softCircle(size = 64, inner = 0) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, inner, size / 2, size / 2, size / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Asphalt mit feinem Rauschen und Flecken
function asphaltTexture() {
  const s = 256, c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  g.fillStyle = '#2b2d31';
  g.fillRect(0, 0, s, s);
  const img = g.getImageData(0, 0, s, s), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 26;
    d[i] += n; d[i + 1] += n; d[i + 2] += n + 2;
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 18; i++) {           // dunkle Flecken / Ausbesserungen
    g.fillStyle = `rgba(10,10,12,${0.08 + Math.random() * 0.12})`;
    g.beginPath(); g.ellipse(Math.random() * s, Math.random() * s, 8 + Math.random() * 30, 5 + Math.random() * 18, Math.random() * 3, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Gebäude-Material: Fenster werden im Shader aus der Weltposition berechnet (kein Textur-Strecken)
function buildingMaterial(uniforms) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.05 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uLit = uniforms.uLit;
    sh.uniforms.uWinGlow = uniforms.uWinGlow;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTfPos;\nvarying vec3 vTfNrm;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 tfW = vec4(transformed, 1.0);
        mat3 tfN = mat3(modelMatrix);
        #ifdef USE_INSTANCING
          tfW = instanceMatrix * tfW;
          tfN = tfN * mat3(instanceMatrix);
        #endif
        tfW = modelMatrix * tfW;
        vTfPos = tfW.xyz;
        vTfNrm = normalize(tfN * objectNormal);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTfPos;\nvarying vec3 vTfNrm;\nuniform float uLit;\nuniform float uWinGlow;\nfloat tfHash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }')
      .replace('#include <roughnessmap_fragment>', `
        vec3 tfN = normalize(vTfNrm);
        float tfRoof = step(0.5, tfN.y);
        vec2 tfF = abs(tfN.x) > 0.5 ? vec2(vTfPos.z, vTfPos.y) : vec2(vTfPos.x, vTfPos.y);
        vec2 tfCell = vec2(tfF.x / 3.1, (tfF.y - 0.6) / 3.5);
        vec2 tfFr = fract(tfCell);
        float tfWin = step(0.16, tfFr.x) * step(tfFr.x, 0.84) * step(0.22, tfFr.y) * step(tfFr.y, 0.86);
        tfWin *= (1.0 - tfRoof) * step(4.2, vTfPos.y);
        float tfR = tfHash(floor(tfCell) + sign(tfN.xz) * 17.0 + floor(vTfPos.xz / 40.0) * 3.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.06, 0.08, 0.11), tfWin * 0.9);
        diffuseColor.rgb *= mix(1.0, 0.55, tfRoof);
        #include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.12, tfWin);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, 0.7, tfWin);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float tfLit = step(tfR, uLit) * tfWin;
        vec3 tfWarm = mix(vec3(1.0, 0.62, 0.3), vec3(0.45, 0.72, 1.0), step(0.72, fract(tfR * 7.13)));
        totalEmissiveRadiance += tfLit * tfWarm * uWinGlow * (0.7 + 0.6 * fract(tfR * 3.7));`);
  };
  return m;
}

// Himmel: Verlauf, Sonne/Mond, Sterne. Gleiche Uniforms für Szene und Umgebungs-Map.
function skyMaterial(u) {
  return new THREE.ShaderMaterial({
    uniforms: u,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uGround; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uNight;
      varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.55));
        col = mix(col, uGround, smoothstep(0.0, -0.12, h));
        float sd = max(dot(d, uSunDir), 0.0);
        col += uSunCol * (pow(sd, 900.0) * 14.0 + pow(sd, 18.0) * 0.35 + pow(sd, 3.0) * 0.08);
        vec3 p = floor(d * 320.0);
        float st = fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
        col += vec3(0.9, 0.95, 1.0) * step(0.9965, st) * uNight * smoothstep(0.04, 0.35, h) * (0.5 + 0.5 * fract(st * 91.0));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
}

// Farbschlüssel der Tageszeit nach Sonnenhöhe
const KEYS = [
  { e: -0.35, top: '#03050f', hor: '#0e1430', ground: '#05060a', sun: '#6f84c8', sunI: 0.35, hemi: 0.34, fog: '#0b1024', exp: 1.15 },
  { e: -0.06, top: '#141c46', hor: '#3a2a5a', ground: '#0a0a12', sun: '#8a90d0', sunI: 0.3, hemi: 0.3, fog: '#251f40', exp: 1.1 },
  { e: 0.02, top: '#2a3a80', hor: '#ff7a4a', ground: '#1a1218', sun: '#ff8a4a', sunI: 1.4, hemi: 0.55, fog: '#c06a5a', exp: 1.0 },
  { e: 0.18, top: '#3a6ec8', hor: '#ffc89a', ground: '#2a2420', sun: '#ffd8a8', sunI: 2.4, hemi: 0.85, fog: '#c8b0a0', exp: 0.95 },
  { e: 0.6, top: '#2f6fd8', hor: '#bfe0ff', ground: '#3a3a3a', sun: '#fff4e0', sunI: 3.0, hemi: 1.0, fog: '#b8cfe6', exp: 0.9 }
];
const tmpA = new THREE.Color(), tmpB = new THREE.Color();
function lerpKey(e, field, out) {
  let a = KEYS[0], b = KEYS[KEYS.length - 1];
  if (e <= a.e) return out.set(a[field]);
  if (e >= b.e) return out.set(b[field]);
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (e >= KEYS[i].e && e <= KEYS[i + 1].e) { a = KEYS[i]; b = KEYS[i + 1]; break; }
  }
  const t = (e - a.e) / (b.e - a.e);
  return out.copy(tmpA.set(a[field])).lerp(tmpB.set(b[field]), t);
}
function lerpNum(e, field) {
  let a = KEYS[0], b = KEYS[KEYS.length - 1];
  if (e <= a.e) return a[field];
  if (e >= b.e) return b[field];
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (e >= KEYS[i].e && e <= KEYS[i + 1].e) { a = KEYS[i]; b = KEYS[i + 1]; break; }
  }
  return a[field] + (b[field] - a[field]) * (e - a.e) / (b.e - a.e);
}

export class World {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.rng = mulberry(20261111);
    this.blocks = [];          // { i, j, type, rect }
    this.u = {                 // gemeinsame Uniforms (Gebäude)
      uLit: { value: 0 },
      uWinGlow: { value: 0 }
    };
    this.sky = {
      uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uGround: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() }, uNight: { value: 0 }
    };
    this.night = 0;
    this.envTime = -99;
    this.build();
  }

  build() {
    const s = this.scene, r = this.rng;
    // --- Blocktypen festlegen
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const center = Math.hypot(i - (N - 1) / 2, j - (N - 1) / 2);
      let type = 'city';
      if (r() < 0.1 && center > 1.5) type = 'park';
      this.blocks.push({ i, j, type, rect: blockRect(i, j), center });
    }

    // --- Boden
    const tex = asphaltTexture();
    tex.repeat.set(SIZE / 12, SIZE / 12);
    this.groundMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0.0, color: 0xffffff });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(SIZE + 1600, SIZE + 1600), this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    tex.repeat.set((SIZE + 1600) / 12, (SIZE + 1600) / 12);
    s.add(ground);

    this.buildBlocks();
    this.buildMarkings();
    this.buildLamps();
    this.buildSkyline();
    this.buildSky();
  }

  // Gehwege, Parks, Gebäude, Leuchtreklamen, Bäume
  buildBlocks() {
    const r = this.rng, s = this.scene;
    const unit = new THREE.BoxGeometry(1, 1, 1);
    unit.translate(0, 0.5, 0);
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();

    // Gehwege / Parkflächen
    const walk = new THREE.InstancedMesh(unit, new THREE.MeshStandardMaterial({ roughness: 0.9 }), this.blocks.length * 2);
    let wi = 0;
    for (const b of this.blocks) {
      const { x0, x1, z0, z1 } = b.rect;
      dummy.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
      dummy.scale.set(BLOCK, 0.22, BLOCK);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      walk.setMatrixAt(wi, dummy.matrix);
      walk.setColorAt(wi++, col.set('#77787c'));
      if (b.type === 'park') {
        dummy.position.y = 0.01;
        dummy.scale.set(BLOCK - 6, 0.3, BLOCK - 6);
        dummy.updateMatrix();
        walk.setMatrixAt(wi, dummy.matrix);
        walk.setColorAt(wi++, col.set('#3d6b34'));
      }
    }
    walk.count = wi;
    walk.receiveShadow = true;
    s.add(walk);

    // Gebäude
    const lots = [];
    for (const b of this.blocks) {
      if (b.type !== 'city') continue;
      const { x0, x1, z0, z1 } = b.rect, inset = 3;
      const ax0 = x0 + inset, ax1 = x1 - inset, az0 = z0 + inset, az1 = z1 - inset;
      const pattern = r();
      const mx = (ax0 + ax1) / 2 + (r() - 0.5) * 10, mz = (az0 + az1) / 2 + (r() - 0.5) * 10;
      let rects;
      if (pattern < 0.2) rects = [[ax0, ax1, az0, az1]];
      else if (pattern < 0.5) rects = r() < 0.5 ? [[ax0, mx, az0, az1], [mx, ax1, az0, az1]] : [[ax0, ax1, az0, mz], [ax0, ax1, mz, az1]];
      else rects = [[ax0, mx, az0, mz], [mx, ax1, az0, mz], [ax0, mx, mz, az1], [mx, ax1, mz, az1]];
      const down = Math.max(0, 1 - b.center / 5.5);     // Innenstadt = höher
      for (const [a0, a1, c0, c1] of rects) {
        const h = 9 + r() * 18 + down * down * (40 + r() * 75);
        lots.push({ x0: a0 + 0.8, x1: a1 - 0.8, z0: c0 + 0.8, z1: c1 - 0.8, h, block: b });
      }
    }
    const extra = lots.filter(l => l.h > 45).length;
    const bMat = buildingMaterial(this.u);
    this.buildings = new THREE.InstancedMesh(unit, bMat, lots.length + extra + 140);
    let bi = 0;
    const addBox = (cx, cz, w, d, h, y, c) => {
      dummy.position.set(cx, y, cz);
      dummy.scale.set(w, h, d);
      dummy.updateMatrix();
      this.buildings.setMatrixAt(bi, dummy.matrix);
      this.buildings.setColorAt(bi++, col.set(c));
    };
    const signs = [];
    for (const l of lots) {
      const w = l.x1 - l.x0, d = l.z1 - l.z0, cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2;
      const c = FACADES[Math.floor(r() * FACADES.length)];
      addBox(cx, cz, w, d, l.h, 0, c);
      if (l.h > 45) addBox(cx, cz, w * 0.62, d * 0.62, 6 + r() * 14, l.h, c);   // gestufte Turmspitze
      // Leuchtreklamen an den Seiten, die zur Straße zeigen
      const br = l.block.rect;
      const sides = [];
      if (Math.abs(l.x0 - (br.x0 + 3.8)) < 0.2) sides.push([-1, 0]);
      if (Math.abs(l.x1 - (br.x1 - 3.8)) < 0.2) sides.push([1, 0]);
      if (Math.abs(l.z0 - (br.z0 + 3.8)) < 0.2) sides.push([0, -1]);
      if (Math.abs(l.z1 - (br.z1 - 3.8)) < 0.2) sides.push([0, 1]);
      for (const [sx, sz] of sides) {
        const neon = NEON[Math.floor(r() * NEON.length)];
        const along = sx ? d : w;
        if (r() < 0.75) {        // Ladenschild im Erdgeschoss
          const off = (r() - 0.5) * along * 0.5;
          signs.push({ x: sx ? (sx > 0 ? l.x1 : l.x0) + sx * 0.2 : cx + off, z: sz ? (sz > 0 ? l.z1 : l.z0) + sz * 0.2 : cz + off, y: 3.4, w: sx ? 0.25 : Math.min(7, along * 0.5), d: sx ? Math.min(7, along * 0.5) : 0.25, h: 0.9, c: neon });
        }
        if (l.h > 22 && r() < 0.5) {   // hohes, senkrechtes Schild
          const off = (r() - 0.5) * along * 0.6, hh = 6 + r() * Math.min(18, l.h * 0.35);
          signs.push({ x: sx ? (sx > 0 ? l.x1 : l.x0) + sx * 0.9 : cx + off, z: sz ? (sz > 0 ? l.z1 : l.z0) + sz * 0.9 : cz + off, y: 7 + r() * 6, w: sx ? 1.6 : 0.5, d: sx ? 0.5 : 1.6, h: hh, c: NEON[Math.floor(r() * NEON.length)] });
        }
      }
      // Dachkante leuchtet bei manchen Türmen
      if (l.h > 50 && r() < 0.6) signs.push({ x: cx, z: cz, y: l.h + 0.1, w: w + 0.4, d: d + 0.4, h: 0.5, c: NEON[Math.floor(r() * NEON.length)], ring: true });
    }
    this.buildingCount = bi;
    this.buildingsNext = bi;
    this.buildings.castShadow = true;
    this.buildings.receiveShadow = true;
    s.add(this.buildings);
    this.lots = lots;

    // Leuchtreklamen (eigene Instanzen, leuchten über den Bloom-Effekt)
    this.signMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const signMesh = new THREE.InstancedMesh(unit, this.signMat, signs.length);
    signs.forEach((g, k) => {
      dummy.position.set(g.x, g.y, g.z);
      dummy.scale.set(g.w, g.h, g.d);
      dummy.updateMatrix();
      signMesh.setMatrixAt(k, dummy.matrix);
      signMesh.setColorAt(k, col.set(g.c));
    });
    s.add(signMesh);

    // Bäume in Parks
    const parks = this.blocks.filter(b => b.type === 'park');
    const trees = [];
    for (const b of parks) {
      const { x0, x1, z0, z1 } = b.rect;
      for (let k = 0; k < 26; k++) trees.push([x0 + 6 + r() * (BLOCK - 12), z0 + 6 + r() * (BLOCK - 12), 0.8 + r() * 0.7]);
    }
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 6).translate(0, 1.5, 0), new THREE.MeshStandardMaterial({ color: '#4a3424', roughness: 1 }), trees.length);
    const crownGeo = new THREE.IcosahedronGeometry(2.4, 1);
    const crown = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true }), trees.length);
    trees.forEach(([x, z, sc], k) => {
      dummy.position.set(x, 0.3, z); dummy.scale.setScalar(sc); dummy.rotation.set(0, r() * 6, 0); dummy.updateMatrix();
      trunk.setMatrixAt(k, dummy.matrix);
      dummy.position.y = 0.3 + 4 * sc; dummy.scale.set(sc, sc * 1.15, sc); dummy.updateMatrix();
      crown.setMatrixAt(k, dummy.matrix);
      crown.setColorAt(k, col.setHSL(0.28 + r() * 0.06, 0.45, 0.25 + r() * 0.1));
    });
    trunk.castShadow = crown.castShadow = true;
    s.add(trunk, crown);

    // Leitplanken am Stadtrand
    const wallMat = new THREE.MeshStandardMaterial({ color: '#9a9a96', roughness: 0.8 });
    const L = SIZE + 2;
    for (const [x, z, w, d] of [[0, OFF - 0.6, L, 1.2], [0, -OFF + 0.6, L, 1.2], [OFF - 0.6, 0, 1.2, L], [-OFF + 0.6, 0, 1.2, L]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, d), wallMat);
      m.position.set(x, 0.55, z);
      m.receiveShadow = true;
      s.add(m);
    }
  }

  // Mittelstreifen und Zebrastreifen
  buildMarkings() {
    const plane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: '#d8d6cc', roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 });
    const items = [];
    for (let k = 0; k <= N; k++) {
      const c = roadCenter(k);
      for (let seg = 0; seg < N; seg++) {
        const a = OFF + ROAD + seg * CELL;              // Segment zwischen zwei Kreuzungen
        for (let t = a + 8; t < a + BLOCK - 6; t += 6) {
          items.push([c, t + 1.5, 0.22, 3]);           // senkrechte Straße
          items.push([t + 1.5, c, 3, 0.22]);           // waagrechte Straße
        }
        // Zebrastreifen an beiden Enden des Segments
        for (const zEnd of [a + 2.2, a + BLOCK - 2.2]) {
          for (let q = -4; q <= 4; q++) {
            items.push([c + q * 2.1, zEnd, 1.1, 3.2]);
            items.push([zEnd, c + q * 2.1, 3.2, 1.1]);
          }
        }
      }
    }
    const mesh = new THREE.InstancedMesh(plane, mat, items.length);
    const dummy = new THREE.Object3D();
    items.forEach(([x, z, w, d], k) => {
      dummy.position.set(x, 0.015, z); dummy.scale.set(w, 1, d); dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
    });
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  // Straßenlaternen mit Lichtkegeln auf dem Asphalt
  buildLamps() {
    const spots = [];
    for (const b of this.blocks) {
      const { x0, x1, z0, z1 } = b.rect;
      for (const f of [0.25, 0.75]) {
        spots.push([x0 + BLOCK * f, z0 + 1.2, 0, -1]);
        spots.push([x0 + BLOCK * f, z1 - 1.2, 0, 1]);
        spots.push([x0 + 1.2, z0 + BLOCK * f, -1, 0]);
        spots.push([x1 - 1.2, z0 + BLOCK * f, 1, 0]);
      }
    }
    const poleGeo = new THREE.CylinderGeometry(0.09, 0.13, 7, 6).translate(0, 3.5, 0);
    const poles = new THREE.InstancedMesh(poleGeo, new THREE.MeshStandardMaterial({ color: '#3a3d42', metalness: 0.6, roughness: 0.4 }), spots.length);
    this.lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a0'), toneMapped: false });
    const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 0.18, 0.5), this.lampMat, spots.length);
    this.poolMat = new THREE.MeshBasicMaterial({ map: softCircle(64), color: '#ffc880', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.poolMat, spots.length);
    const dummy = new THREE.Object3D();
    spots.forEach(([x, z, dx, dz], k) => {
      dummy.position.set(x, 0.2, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
      poles.setMatrixAt(k, dummy.matrix);
      dummy.position.set(x + dx * 0.9, 7.1, z + dz * 0.9); dummy.rotation.set(0, dx ? Math.PI / 2 : 0, 0); dummy.updateMatrix();
      heads.setMatrixAt(k, dummy.matrix);
      dummy.position.set(x + dx * 3.2, 0.03, z + dz * 3.2); dummy.rotation.set(0, 0, 0); dummy.scale.set(11, 1, 11); dummy.updateMatrix();
      pools.setMatrixAt(k, dummy.matrix);
    });
    poles.castShadow = true;
    this.scene.add(poles, heads, pools);
  }

  // Ferne Skyline rund um die Stadt (füllt den Horizont)
  buildSkyline() {
    const r = this.rng, dummy = new THREE.Object3D(), col = new THREE.Color();
    for (let k = 0; k < 140; k++) {
      const a = (k / 140) * Math.PI * 2 + r() * 0.03;
      const dist = SIZE / 2 + 160 + r() * 380;
      const h = 30 + r() * 120;
      dummy.position.set(Math.cos(a) * dist, 0, Math.sin(a) * dist);
      dummy.scale.set(20 + r() * 30, h, 20 + r() * 30);
      dummy.rotation.set(0, r() * 3, 0);
      dummy.updateMatrix();
      this.buildings.setMatrixAt(this.buildingsNext, dummy.matrix);
      this.buildings.setColorAt(this.buildingsNext++, col.set(FACADES[Math.floor(r() * FACADES.length)]).multiplyScalar(0.7));
    }
    this.buildings.count = this.buildingsNext;
  }

  buildSky() {
    const mat = skyMaterial(this.sky);
    this.skyMesh = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), mat);
    this.skyMesh.frustumCulled = false;
    this.skyMesh.renderOrder = -1;
    this.scene.add(this.skyMesh);
    // eigene kleine Szene, aus der die Spiegelungen (Umgebungs-Map) berechnet werden
    this.envScene = new THREE.Scene();
    this.envScene.add(new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), mat));
    this.pmrem = new THREE.PMREMGenerator(this.renderer);

    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 400;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x333333, 0.8);
    this.scene.add(this.hemi);
    this.scene.fog = new THREE.Fog(0x000000, 140, 720);
  }

  // Tageszeit anwenden. tod in Stunden (0–24)
  setTime(tod, focus) {
    const ang = (tod - 6) / 24 * Math.PI * 2;             // 6 Uhr Aufgang, 18 Uhr Untergang
    const e = Math.sin(ang);
    const sunDir = new THREE.Vector3(Math.cos(ang) * 0.75, e, 0.55).normalize();
    const night = 1 - THREE.MathUtils.smoothstep(e, -0.12, 0.12);
    this.night = night;
    const sk = this.sky;
    lerpKey(e, 'top', sk.uTop.value);
    lerpKey(e, 'hor', sk.uHorizon.value);
    lerpKey(e, 'ground', sk.uGround.value);
    const lightDir = e > -0.05 ? sunDir : new THREE.Vector3(-sunDir.x, -sunDir.y, -sunDir.z).normalize();   // nachts der Mond
    sk.uSunDir.value.copy(lightDir);
    lerpKey(e, 'sun', sk.uSunCol.value);
    sk.uNight.value = night;

    lerpKey(e, 'sun', this.sun.color);
    this.sun.intensity = e > -0.05 ? lerpNum(e, 'sunI') : 0.55;
    this.hemi.intensity = lerpNum(e, 'hemi');
    this.hemi.color.copy(sk.uTop.value).lerp(tmpA.set('#ffffff'), 0.5);
    this.hemi.groundColor.set(night > 0.5 ? '#1a1820' : '#4a4640');
    lerpKey(e, 'fog', this.scene.fog.color);
    this.exposure = lerpNum(e, 'exp');

    this.u.uLit.value = 0.05 + night * 0.3;
    this.u.uWinGlow.value = 0.1 + night * 0.85;
    this.signMat.color.setScalar(0.8 + night * 1.8);
    this.lampMat.color.set('#ffd9a0').multiplyScalar(night > 0.3 ? 3 : 0.6);
    this.poolMat.opacity = night * 0.5;
    this.groundMat.roughness = 0.82 - night * 0.42;      // nachts wirkt der Asphalt feucht und spiegelt

    // Schatten folgen dem Auto
    if (focus) {
      this.sun.target.position.copy(focus);
      this.sun.position.copy(focus).addScaledVector(lightDir, 160);
    }
    // Umgebungs-Map nur bei spürbarer Änderung neu berechnen (teuer)
    if (Math.abs(tod - this.envTime) > 0.2) {
      this.envTime = tod;
      const rt = this.pmrem.fromScene(this.envScene, 0, 1, 1000);
      if (this.envRT) this.envRT.dispose();
      this.envRT = rt;
      this.scene.environment = rt.texture;
    }
  }

  // Kreis gegen Häuserblöcke und Stadtrand. Gibt Aufprallnormale und Tiefe zurück (oder null).
  collide(x, z, rad) {
    const lim = -OFF - rad;
    if (x < -lim) return { nx: 1, nz: 0, depth: -lim - x };
    if (x > lim) return { nx: -1, nz: 0, depth: x - lim };
    if (z < -lim) return { nx: 0, nz: 1, depth: -lim - z };
    if (z > lim) return { nx: 0, nz: -1, depth: z - lim };
    const ci = Math.floor((x - OFF - ROAD / 2) / CELL), cj = Math.floor((z - OFF - ROAD / 2) / CELL);
    for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) {
      if (i < 0 || j < 0 || i >= N || j >= N) continue;
      const { x0, x1, z0, z1 } = blockRect(i, j);
      const px = Math.max(x0, Math.min(x, x1)), pz = Math.max(z0, Math.min(z, z1));
      const dx = x - px, dz = z - pz, d2 = dx * dx + dz * dz;
      if (d2 < rad * rad) {
        if (d2 > 1e-6) { const d = Math.sqrt(d2); return { nx: dx / d, nz: dz / d, depth: rad - d }; }
        // Mittelpunkt im Block: zur nächsten Kante hinaus
        const opts = [[x - x0, -1, 0], [x1 - x, 1, 0], [z - z0, 0, -1], [z1 - z, 0, 1]].sort((a, b) => a[0] - b[0]);
        return { nx: opts[0][1], nz: opts[0][2], depth: opts[0][0] + rad };
      }
    }
    return null;
  }
}
