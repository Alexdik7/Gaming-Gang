// Region 1: VERDANTIA — prozedural erzeugte, aber handgestaltete Waldregion
import * as THREE from '../vendor/three.module.min.js';
import { makeNoise2D, fbm, mulberry, smooth, clamp, lerp } from '../core/noise.js';
import { toon } from './models.js';

export const SIZE = 260;
export const VILLAGE = { x: 0, z: 66 };
export const TEMPLE = { x: 0, z: -80 };
export const LAKE = { x: 52, z: -8, r: 26 };
export const ISLAND = { x: 60, z: -12, r: 5 };
export const FALLS = { x: 78, z: -94 };
export const GROVE = { x: -76, z: -42, r: 20 };
export const RUNES = [
  { id: 'rune_insel', x: 60.5, z: -12.5, name: 'Runenstein der Gezeiten', hint: 'Er ruht auf einer Insel, die man trockenen Fußes erreicht.' },
  { id: 'rune_fall', x: 78, z: -96.2, name: 'Runenstein des Rauschens', hint: 'Er schläft hinter dem Lied des fallenden Wassers.' },
  { id: 'rune_hain', x: -82, z: -47, name: 'Runenstein der Schatten', hint: 'Er wartet im dunkelsten Hain, wo das Licht nicht hinfällt.' },
];
export const GRASS = [
  { x: -30, z: 34, r: 13 }, { x: 28, z: 36, r: 11 }, { x: -42, z: -12, r: 14 },
  { x: 22, z: -44, r: 12 }, { x: -18, z: -55, r: 9 }, { x: 40, z: 14, r: 9 },
];
const PATHS = [
  [[0, 82], [0, 52], [0, 28], [-6, 2], [-2, -30], [0, -52], [0, -62]],
  [[-4, 8], [16, 2], [30, -4]],
  [[-5, -6], [-26, -20], [-48, -32], [-60, -38]],
  [[0, 40], [30, 34], [56, 26], [70, 0], [74, -40], [76, -82]],
];
const RIVER = [[77, -85], [74, -70], [68, -50], [62, -30], [56, -18]];
const SANDBAR = [[30, -2], [44, -8], [56, -12]];

function segDist(px, pz, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = clamp(((px - a[0]) * dx + (pz - a[1]) * dz) / (dx * dx + dz * dz), 0, 1);
  return Math.hypot(px - (a[0] + dx * t), pz - (a[1] + dz * t));
}
const polyDist = (x, z, poly) => { let d = 1e9; for (let i = 0; i < poly.length - 1; i++) d = Math.min(d, segDist(x, z, poly[i], poly[i + 1])); return d; };
export const pathDist = (x, z) => Math.min(...PATHS.map(p => polyDist(x, z, p)));

export class World {
  constructor(scene, seed = 52) {
    this.scene = scene; this.seed = seed;
    this.n1 = makeNoise2D(seed); this.n2 = makeNoise2D(seed + 7); this.n3 = makeNoise2D(seed + 13);
    this.rnd = mulberry(seed * 991);
    this.colliders = []; this.treeGrid = new Map(); this.interact = []; this.runeObjs = {};
    this.uniforms = { uTime: { value: 0 }, uWind: { value: 1 } };
    this.windowMats = []; this.lamps = [];
    this.root = new THREE.Group(); scene.add(this.root);
    this.buildTerrain(); this.buildWater(); this.buildTrees(); this.buildGrass();
    this.buildProps(); this.buildVillage(); this.buildTemple(); this.buildRunes(); this.buildFalls();
    this.buildSky(); this.buildFx();
  }

  // ------------------------------------------------------------ Höhenfeld
  height(x, z) {
    let h = 1.6 + fbm(this.n1, x * 0.011, z * 0.011, 4) * 5.5 + fbm(this.n2, x * 0.05, z * 0.05, 2) * 0.8;
    // Gebirge am Rand
    const d = Math.max(Math.abs(x), Math.abs(z));
    h += smooth(92, 124, d) * (26 + fbm(this.n3, x * 0.03, z * 0.03, 3) * 14);
    // Klippe am Wasserfall
    if (x > 58 && x < 100 && z < -93) h = Math.max(h, 1 + 15 * smooth(-93, -97, z) * smooth(58, 66, x));
    // Dorf & Tempelplateau
    const dv = Math.hypot(x - VILLAGE.x, z - VILLAGE.z);
    h = lerp(h, 1.2 + fbm(this.n2, x * 0.03, z * 0.03, 2) * 0.3, 1 - smooth(26, 40, dv));
    const dt = Math.hypot(x - TEMPLE.x, z - TEMPLE.z);
    h = lerp(h, 4.2, 1 - smooth(20, 30, dt));
    // Wege glätten
    const pd = pathDist(x, z);
    if (pd < 6) h = lerp(h, h * 0.85 + 0.2, 1 - smooth(1.5, 6, pd));
    // Höhle hinter dem Wasserfall
    if (x > 74 && x < 82 && z < -93 && z > -98.5) h = Math.min(h, 0.7);
    // Fluss
    const rd = polyDist(x, z, RIVER);
    h = lerp(h, -1.4, 1 - smooth(2.5, 6.5, rd));
    // See + Insel + Sandbank
    const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
    h = lerp(h, -2.6 + fbm(this.n2, x * 0.1, z * 0.1, 2) * 0.4, 1 - smooth(LAKE.r - 9, LAKE.r + 3, dl));
    const sb = polyDist(x, z, SANDBAR);
    if (dl < LAKE.r + 4) h = Math.max(h, lerp(h, -0.28, 1 - smooth(1.3, 2.6, sb)));
    const di = Math.hypot(x - ISLAND.x, z - ISLAND.z);
    h = Math.max(h, lerp(-3, 1.0, 1 - smooth(ISLAND.r - 2, ISLAND.r + 1.5, di)));
    // sonst: Land nie unter Wasser
    const nearWater = Math.min(rd - 6.5, dl - LAKE.r - 3);
    if (nearWater > 0) h = Math.max(h, 0.45);
    return h;
  }
  forestDensity(x, z) { return fbm(this.n3, x * 0.02 + 40, z * 0.02, 3); }
  inGrass(x, z) { return GRASS.find(g => Math.hypot(x - g.x, z - g.z) < g.r * (0.85 + this.n2(x * 0.2, z * 0.2) * 0.25)); }
  zoneAt(x, z) {
    const h = this.height(x, z);
    if (Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < 34) return 'dorf';
    if (this.inGrass(x, z)) return 'wiese';
    if (Math.hypot(x - TEMPLE.x, z - TEMPLE.z) < 30) return 'ruinen';
    if (h < 1.2 && (polyDist(x, z, RIVER) < 11 || Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 8)) return 'ufer';
    if (Math.hypot(x - GROVE.x, z - GROVE.z) < GROVE.r + 6) return 'wald';
    if (this.forestDensity(x, z) > 0.05) return 'wald';
    return 'wiese';
  }

  buildTerrain() {
    const seg = 200;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, seg, seg); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    const c = new THREE.Color(), cA = new THREE.Color('#5fae4c'), cB = new THREE.Color('#3f8a3c'), cMeadow = new THREE.Color('#86c25a'),
      cPath = new THREE.Color('#b9925f'), cSand = new THREE.Color('#dcc890'), cRock = new THREE.Color('#8c877a'), cDeep = new THREE.Color('#3b5b4a'),
      cDark = new THREE.Color('#2f5a35'), cStone = new THREE.Color('#a8a293'), cSnow = new THREE.Color('#e8eef0');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = this.height(x, z);
      pos.setY(i, h);
      const slope = Math.abs(this.height(x + 1, z) - h) + Math.abs(this.height(x, z + 1) - h);
      c.copy(cA).lerp(cB, clamp(this.n1(x * 0.08, z * 0.08) * 0.5 + 0.5, 0, 1));
      if (this.inGrass(x, z)) c.lerp(cMeadow, 0.6);
      if (Math.hypot(x - GROVE.x, z - GROVE.z) < GROVE.r) c.lerp(cDark, 0.7);
      const pd = pathDist(x, z);
      if (pd < 2.4) c.lerp(cPath, 1 - smooth(1.2, 2.4, pd));
      if (Math.hypot(x - TEMPLE.x, z - TEMPLE.z) < 22) c.lerp(cStone, 0.55 * (1 - smooth(16, 22, Math.hypot(x - TEMPLE.x, z - TEMPLE.z))));
      if (h < 0.9) c.lerp(cSand, smooth(0.9, 0.3, h));
      if (h < -0.5) c.lerp(cDeep, smooth(-0.5, -2, h));
      if (slope > 1.1 || h > 9) c.lerp(cRock, clamp(Math.max((slope - 1.1) * 1.5, (h - 9) / 4), 0, 1));
      if (h > 24) c.lerp(cSnow, smooth(24, 30, h));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.terrain = new THREE.Mesh(geo, mat); this.terrain.receiveShadow = true;
    this.root.add(this.terrain);
  }

  buildWater() {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, 1, 1); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      transparent: true, fog: true, depthWrite: false,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uDay: { value: 1 }, uSky: { value: new THREE.Color('#9fd3ff') } }]),
      vertexShader: `varying vec3 vW;
#include <fog_pars_vertex>
        void main(){ vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; vec4 mvPosition = viewMatrix*w; gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
 }`,
      fragmentShader: `uniform float uTime; uniform float uDay; uniform vec3 uSky; varying vec3 vW;
#include <fog_pars_fragment>
        void main(){
          float w = sin(vW.x*0.6+uTime*1.3)*sin(vW.z*0.5-uTime*1.1) + sin((vW.x+vW.z)*1.7+uTime*2.3)*0.4;
          vec3 deep = vec3(0.07,0.32,0.45), shallow = vec3(0.22,0.62,0.68);
          vec3 col = mix(deep, shallow, 0.5+0.25*w);
          col = mix(col, uSky, 0.18);
          float spark = smoothstep(1.05,1.3,w);
          col += spark*0.35*uDay;
          col *= mix(0.35,1.0,uDay);
          gl_FragColor = vec4(col, 0.82);
#include <fog_fragment>
        }`,
    });
    this.waterMat = mat;
    const water = new THREE.Mesh(geo, mat); water.position.y = 0.02; this.root.add(water);
  }

  addTreeCollider(x, z, r) {
    const k = Math.floor(x / 8) + ',' + Math.floor(z / 8);
    if (!this.treeGrid.has(k)) this.treeGrid.set(k, []);
    this.treeGrid.get(k).push([x, z, r]);
  }

  buildTrees() {
    const R = this.rnd;
    const trees = [];
    const ok = (x, z) => {
      const h = this.height(x, z);
      if (h < 0.6 || h > 16) return false;
      if (pathDist(x, z) < 3.5) return false;
      if (Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < 36) return false;
      if (Math.hypot(x - TEMPLE.x, z - TEMPLE.z) < 24) return false;
      if (this.inGrass(x, z)) return false;
      if (Math.hypot(x - ISLAND.x, z - ISLAND.z) < 3) return false;
      if (x > 70 && x < 86 && z < -84) return false;
      for (const r of RUNES) if (Math.hypot(x - r.x, z - r.z) < 4) return false;
      return true;
    };
    for (let x = -125; x < 125; x += 3.6) for (let z = -125; z < 125; z += 3.6) {
      const px = x + (R() - 0.5) * 3, pz = z + (R() - 0.5) * 3;
      if (!ok(px, pz)) continue;
      const grove = Math.hypot(px - GROVE.x, pz - GROVE.z) < GROVE.r;
      const gap = grove && segDist(px, pz, [-60, -38], [-80, -46]) < 2.6;
      if (gap) continue;
      const dens = this.forestDensity(px, pz);
      const edge = Math.max(Math.abs(px), Math.abs(pz)) > 95;
      if (!grove && dens < -0.05 && R() > 0.06 && !edge) continue;
      if (!grove && R() > (edge ? 0.5 : 0.75)) continue;
      trees.push({ x: px, z: pz, y: this.height(px, pz), s: 0.8 + R() * 0.7, kind: grove ? 2 : (R() < 0.35 ? 1 : 0), r: R() });
    }
    // Uralte Riesenbäume am Tempel
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; const x = TEMPLE.x + Math.cos(a) * 30, z = TEMPLE.z + Math.sin(a) * 30; trees.push({ x, z, y: this.height(x, z), s: 2.6, kind: 0, r: 0.5, giant: true }); }
    this.treeCount = trees.length;
    const trunkG = new THREE.CylinderGeometry(0.22, 0.32, 2.4, 6); trunkG.translate(0, 1.2, 0);
    const blobG = new THREE.IcosahedronGeometry(1.4, 1);
    const coneG = new THREE.ConeGeometry(1.5, 2.6, 7);
    const groups = {
      trunk: new THREE.InstancedMesh(trunkG, toon('#6b4a32'), trees.length),
      blob: new THREE.InstancedMesh(blobG, new THREE.MeshLambertMaterial({ flatShading: true }), trees.length * 3),
      cone: new THREE.InstancedMesh(coneG, new THREE.MeshLambertMaterial({ flatShading: true }), trees.length * 3),
    };
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
    let bi = 0, ci = 0;
    this.treeInst = groups; this.treeRec = [];
    const leafCols = ['#3f9a3e', '#4cab45', '#358a3a', '#5bb84a'], pineCols = ['#2d6e3e', '#2f7a44', '#26663a'], darkCols = ['#2a3f4a', '#2f4636', '#3a3156'];
    trees.forEach((t, i) => {
      q.setFromEuler(new THREE.Euler(0, t.r * 6, 0));
      m.compose(p.set(t.x, t.y - 0.2, t.z), q, s.set(t.s, t.s * (t.kind === 1 ? 1.1 : 1), t.s)); groups.trunk.setMatrixAt(i, m);
      this.addTreeCollider(t.x, t.z, 0.45 * t.s);
      const rec = { x: t.x, z: t.z, i, blobs: [], cones: [] }; this.treeRec.push(rec);
      if (t.kind === 1) {
        for (let k = 0; k < 3; k++) {
          const sc = t.s * (1.1 - k * 0.28);
          m.compose(p.set(t.x, t.y + t.s * (2.4 + k * 1.15), t.z), q, s.set(sc, sc, sc)); rec.cones.push(ci); groups.cone.setMatrixAt(ci, m);
          groups.cone.setColorAt(ci++, col.set(pineCols[(i + k) % 3]));
        }
      } else {
        const cols = t.kind === 2 ? darkCols : leafCols;
        const n = t.giant ? 3 : 2 + (t.r > 0.5 ? 1 : 0);
        for (let k = 0; k < n; k++) {
          const ox = Math.sin(t.r * 20 + k * 2.1) * 0.7 * t.s, oz = Math.cos(t.r * 13 + k * 2.1) * 0.7 * t.s;
          const sc = t.s * (k === 0 ? 1.15 : 0.85);
          m.compose(p.set(t.x + (k ? ox : 0), t.y + t.s * (2.9 + k * 0.5), t.z + (k ? oz : 0)), q, s.set(sc, sc * 0.9, sc)); rec.blobs.push(bi); groups.blob.setMatrixAt(bi, m);
          groups.blob.setColorAt(bi++, col.set(cols[(i + k) % cols.length]));
        }
      }
    });
    groups.blob.count = bi; groups.cone.count = ci;
    for (const g of Object.values(groups)) { g.castShadow = true; g.receiveShadow = true; this.root.add(g); }
  }

  // Bäume rund um eine Kampfarena ausblenden (und später wiederherstellen)
  hideTreesNear(pts, r) {
    this.restoreTrees();
    const zero = new THREE.Matrix4().makeScale(0, 0, 0), m = new THREE.Matrix4(), G = this.treeInst;
    this.hidden = [];
    for (const t of this.treeRec) {
      if (!pts.some(p => Math.hypot(t.x - p.x, t.z - p.z) < r)) continue;
      const save = { t, trunk: new THREE.Matrix4(), blobs: [], cones: [] };
      G.trunk.getMatrixAt(t.i, save.trunk); G.trunk.setMatrixAt(t.i, zero);
      for (const b of t.blobs) { G.blob.getMatrixAt(b, m); save.blobs.push(m.clone()); G.blob.setMatrixAt(b, zero); }
      for (const c of t.cones) { G.cone.getMatrixAt(c, m); save.cones.push(m.clone()); G.cone.setMatrixAt(c, zero); }
      this.hidden.push(save);
    }
    for (const g of Object.values(G)) g.instanceMatrix.needsUpdate = true;
  }
  restoreTrees() {
    if (!this.hidden) return;
    const G = this.treeInst;
    for (const h of this.hidden) {
      G.trunk.setMatrixAt(h.t.i, h.trunk);
      h.t.blobs.forEach((b, k) => G.blob.setMatrixAt(b, h.blobs[k]));
      h.t.cones.forEach((c, k) => G.cone.setMatrixAt(c, h.cones[k]));
    }
    this.hidden = null;
    for (const g of Object.values(G)) g.instanceMatrix.needsUpdate = true;
  }

  buildGrass() {
    const R = this.rnd;
    const blade = new THREE.BufferGeometry();
    blade.setAttribute('position', new THREE.Float32BufferAttribute([-0.09, 0, 0, 0.09, 0, 0, 0, 0.9, 0.04, -0.07, 0, 0.02, 0.07, 0, -0.02, 0.02, 0.75, -0.05], 3));
    blade.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
    mat.onBeforeCompile = sh => {
      sh.uniforms.uTime = this.uniforms.uTime; sh.uniforms.uWind = this.uniforms.uWind;
      sh.vertexShader = 'uniform float uTime; uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        `#include <begin_vertex>
         vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
         float sw = sin(uTime*2.2 + ip.x*0.35 + ip.y*0.25)*0.5 + sin(uTime*3.7+ip.x)*0.2;
         transformed.x += sw * position.y * 0.35 * uWind; transformed.z += sw * position.y * 0.15 * uWind;`);
    };
    const pts = [];
    for (const g of GRASS) {
      const n = Math.floor(g.r * g.r * 7.5);
      for (let i = 0; i < n; i++) {
        const a = R() * Math.PI * 2, r = Math.sqrt(R()) * g.r;
        const x = g.x + Math.cos(a) * r, z = g.z + Math.sin(a) * r;
        if (!this.inGrass(x, z)) continue;
        pts.push([x, z]);
      }
    }
    const inst = new THREE.InstancedMesh(blade, mat, pts.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
    pts.forEach(([x, z], i) => {
      q.setFromEuler(new THREE.Euler(0, R() * 6.3, (R() - 0.5) * 0.3));
      const sc = 0.9 + R() * 0.8;
      m.compose(new THREE.Vector3(x, this.height(x, z) - 0.05, z), q, new THREE.Vector3(sc, sc * (1 + R() * 0.4), sc));
      inst.setMatrixAt(i, m);
      inst.setColorAt(i, col.setHSL(0.26 + R() * 0.06, 0.55, 0.32 + R() * 0.14));
    });
    inst.receiveShadow = true;
    this.root.add(inst);
    this.grassCount = pts.length;
  }

  buildProps() {
    const R = this.rnd;
    // Blumen
    const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.12, 0), new THREE.MeshLambertMaterial(), 1400);
    const stem = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 3), new THREE.MeshLambertMaterial({ color: '#3d7a32' }), 1400);
    const m = new THREE.Matrix4(), col = new THREE.Color(); let n = 0;
    const fc = ['#ff8fb1', '#fff27a', '#ffffff', '#b89bff', '#ff9d5c', '#7fd0ff'];
    for (let i = 0; i < 6000 && n < 1400; i++) {
      const x = (R() - 0.5) * 220, z = (R() - 0.5) * 220, h = this.height(x, z);
      if (h < 0.7 || h > 8 || this.forestDensity(x, z) > 0.1) continue;
      if (Math.hypot(x - GROVE.x, z - GROVE.z) < GROVE.r) continue;
      m.makeTranslation(x, h + 0.33, z); fl.setMatrixAt(n, m); fl.setColorAt(n, col.set(fc[Math.floor(R() * fc.length)]));
      m.makeTranslation(x, h + 0.16, z); stem.setMatrixAt(n, m); n++;
    }
    fl.count = stem.count = n; this.root.add(fl, stem);
    // Felsen
    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: '#8f8a80', flatShading: true }), 220);
    let r = 0; const q = new THREE.Quaternion();
    for (let i = 0; i < 2000 && r < 220; i++) {
      const x = (R() - 0.5) * 230, z = (R() - 0.5) * 230, h = this.height(x, z);
      if (h < -0.5 || pathDist(x, z) < 3 || Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < 34) continue;
      if (Math.hypot(x - ISLAND.x, z - ISLAND.z) < 4 || polyDist(x, z, SANDBAR) < 3) continue;
      const nearW = polyDist(x, z, RIVER) < 9 || Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 6;
      if (!nearW && R() > 0.25) continue;
      const s = 0.3 + R() * (nearW ? 0.8 : 1.4);
      q.setFromEuler(new THREE.Euler(R() * 3, R() * 3, R() * 3));
      m.compose(new THREE.Vector3(x, h, z), q, new THREE.Vector3(s, s * 0.7, s)); rocks.setMatrixAt(r++, m);
      if (s > 0.8) this.addTreeCollider(x, z, s * 0.8);
    }
    rocks.count = r; rocks.castShadow = rocks.receiveShadow = true; this.root.add(rocks);
  }

  box(x, y, z, w, h, d, mat, rotY = 0) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(x, y, z); b.rotation.y = rotY;
    b.castShadow = b.receiveShadow = true; this.root.add(b); return b;
  }

  house(x, z, rot, wall, roof, label, opts = {}) {
    const g = new THREE.Group(); g.position.set(x, this.height(x, z) - 0.1, z); g.rotation.y = rot;
    const W = opts.w || 7, D = opts.d || 6, H = opts.h || 3.4;
    const add = (geo, mat, px, py, pz, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    add(new THREE.BoxGeometry(W + 0.4, 0.5, D + 0.4), toon('#8d8578'), 0, 0.25, 0);
    add(new THREE.BoxGeometry(W, H, D), toon(wall), 0, H / 2 + 0.4, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.BoxGeometry(0.35, H, 0.35), toon('#6e4b33'), sx * W / 2, H / 2 + 0.4, sz * D / 2);
    const roofG = new THREE.CylinderGeometry(D * 0.72, D * 0.72, W + 1, 3); roofG.rotateZ(Math.PI / 2); roofG.rotateX(Math.PI / 6 + Math.PI);
    const rf = add(roofG, toon(roof), 0, H + 0.4 + D * 0.3, 0);
    rf.rotation.x = Math.PI; rf.scale.y = 0.55;
    add(new THREE.BoxGeometry(1.3, 2.1, 0.15), toon('#5a3a26'), 0, 1.45, D / 2 + 0.05);
    const wm = toon('#ffe9a8', '#ffcc66', 0); this.windowMats.push(wm);
    for (const sx of [-1, 1]) add(new THREE.BoxGeometry(1.1, 1, 0.15), wm, sx * W * 0.3, 2.4, D / 2 + 0.05);
    add(new THREE.BoxGeometry(0.7, 1.6, 0.7), toon('#7a6e64'), W * 0.3, H + 1.6, -D * 0.15);
    if (opts.sign) {
      const s = add(new THREE.BoxGeometry(2.2, 0.9, 0.15), toon(opts.sign, opts.sign, 0.6), 0, H + 0.1, D / 2 + 0.12);
      if (opts.emblem) add(new THREE.OctahedronGeometry(0.42, 0), toon(opts.emblem, opts.emblem, 1.2), 0, H + 0.1, D / 2 + 0.35);
    }
    if (opts.dome) add(new THREE.SphereGeometry(2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon('#dfe8ef'), -W * 0.2, H + 0.6, 0);
    this.root.add(g);
    // Kollision (achsenparallel angenähert)
    const swap = Math.abs(Math.sin(rot)) > 0.7;
    this.colliders.push({ x, z, hw: (swap ? D : W) / 2 + 0.4, hd: (swap ? W : D) / 2 + 0.4 });
    const door = new THREE.Vector3(0, 0, D / 2 + 1.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
    if (label) this.interact.push({ id: opts.id, x: x + door.x, z: z + door.z, r: 2.2, label });
    return g;
  }

  buildVillage() {
    const V = VILLAGE;
    this.house(V.x - 16, V.z - 6, Math.PI / 2, '#f3eadb', '#4e7fb5', 'Labor von Prof. Linde', { id: 'lab', w: 10, d: 7, h: 4, sign: '#6fa8dc', dome: true });
    this.house(V.x + 16, V.z - 6, -Math.PI / 2, '#fff3f0', '#d9534f', 'Heilzentrum', { id: 'heal', w: 8, d: 7, sign: '#7cf2a0', emblem: '#5dffa2' });
    this.house(V.x + 15, V.z + 12, -Math.PI / 2, '#f6e3c4', '#3f9a6a', 'Kristallladen', { id: 'shop', sign: '#ffd36b', emblem: '#7fe3ff' });
    this.house(V.x - 15, V.z + 12, Math.PI / 2, '#e8dccb', '#a0522d', 'Dein Zuhause', { id: 'home' });
    this.house(V.x - 4, V.z + 24, 0, '#efe2cf', '#7b5ea7', null);
    this.house(V.x + 9, V.z + 26, 0, '#e3eadc', '#c0803a', null, { w: 6, d: 5 });
    // Brunnen + Platz
    const wy = this.height(V.x, V.z);
    const well = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.9, 14), toon('#9a948a')); well.position.set(V.x, wy + 0.45, V.z); well.castShadow = true; this.root.add(well);
    const wt = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.1, 14), toon('#4aa3c8', '#2a7fa8', 0.3)); wt.position.set(V.x, wy + 0.85, V.z); this.root.add(wt);
    this.colliders.push({ x: V.x, z: V.z, hw: 1.7, hd: 1.7 });
    this.interact.push({ id: 'well', x: V.x, z: V.z + 2.4, r: 2, label: 'Alter Brunnen' });
    // Laternen
    for (const [lx, lz] of [[-5, 4], [5, 4], [-5, -14], [5, -14], [-5, 20], [5, 20], [0, -30]]) {
      const x = V.x + lx, z = V.z + lz, y = this.height(x, z);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3, 6), toon('#3a3a42')); pole.position.set(x, y + 1.5, z); pole.castShadow = true; this.root.add(pole);
      const lm = toon('#fff1b8', '#ffcf6b', 0.2); this.windowMats.push(lm);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), lm); lamp.position.set(x, y + 3.1, z); this.root.add(lamp);
      this.lamps.push(lamp.position.clone());
    }
    this.villageLight = new THREE.PointLight('#ffcf80', 0, 30, 1.6); this.villageLight.position.set(V.x, wy + 4, V.z); this.root.add(this.villageLight);
    // Zäune
    const fm = toon('#9b7653');
    for (let i = -6; i <= 6; i++) for (const sx of [-1, 1]) {
      const x = V.x + sx * 30, z = V.z + i * 3; if (Math.abs(i) < 1) continue;
      this.box(x, this.height(x, z) + 0.5, z, 0.15, 1, 0.15, fm);
      this.box(x, this.height(x, z) + 0.75, z + 1.5, 0.08, 0.12, 3, fm);
    }
    // Ortsschild
    const sx = 3, sz = V.z - 33;
    this.box(sx, this.height(sx, sz) + 1, sz, 0.15, 2, 0.15, fm);
    this.box(sx, this.height(sx, sz) + 1.9, sz, 2.4, 0.8, 0.12, toon('#d9c7a0'));
    this.interact.push({ id: 'sign_dorf', x: sx, z: sz + 0.8, r: 1.8, label: 'Schild' });
  }

  buildTemple() {
    const T = TEMPLE, y = 4.2, stone = toon('#b8b2a3'), dark = toon('#8a8475'), moss = toon('#6f9a55');
    this.box(T.x, y - 0.1, T.z, 26, 0.5, 26, dark);
    this.box(T.x, y + 0.25, T.z, 18, 0.5, 18, stone);
    this.box(T.x, y + 0.6, T.z, 9, 0.5, 9, stone);
    for (let i = 0; i < 4; i++) this.box(T.x, y - 0.35 + i * 0.25 * 1.2, T.z + 13 + 2.2 - i * 1.1, 6, 0.4, 1.2, stone);
    const colG = new THREE.CylinderGeometry(0.55, 0.65, 1, 10);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2, x = T.x + Math.cos(a) * 11, z = T.z + Math.sin(a) * 11;
      const hgt = [6, 3.2, 6, 6, 1.8, 6, 4.5, 6, 6, 2.6][i];
      const c = new THREE.Mesh(colG, stone); c.scale.y = hgt; c.position.set(x, y + 0.5 + hgt / 2, z); c.castShadow = c.receiveShadow = true; this.root.add(c);
      if (hgt === 6) { const cap = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.6), dark); cap.position.set(x, y + 6.75, z); cap.castShadow = true; this.root.add(cap); }
      const ms = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), moss); ms.scale.set(1, 0.35, 1); ms.position.set(x, y + 0.6, z); this.root.add(ms);
      this.colliders.push({ x, z, hw: 0.75, hd: 0.75 });
    }
    // Torbogen
    for (const sx of [-1, 1]) this.box(T.x + sx * 3, y + 3.5, T.z + 11, 1, 6, 1, stone);
    this.box(T.x, y + 6.8, T.z + 11, 8, 0.9, 1.3, dark);
    this.colliders.push({ x: T.x - 3, z: T.z + 11, hw: 0.6, hd: 0.6 }, { x: T.x + 3, z: T.z + 11, hw: 0.6, hd: 0.6 });
    // Altar + Kristall
    this.box(T.x, y + 1.3, T.z, 2.4, 1, 2.4, dark);
    this.altarMat = toon('#6fd6a8', '#3cff9a', 0.15);
    this.crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), this.altarMat); this.crystal.scale.y = 1.6;
    this.crystal.position.set(T.x, y + 3.2, T.z); this.crystal.castShadow = true; this.root.add(this.crystal);
    this.altarLight = new THREE.PointLight('#5dffb0', 0, 25, 1.5); this.altarLight.position.set(T.x, y + 4, T.z); this.root.add(this.altarLight);
    this.colliders.push({ x: T.x, z: T.z, hw: 1.4, hd: 1.4 });
    this.interact.push({ id: 'altar', x: T.x, z: T.z + 2.6, r: 2.4, label: 'Altar des Waldes' });
  }

  buildRunes() {
    for (const r of RUNES) {
      const y = this.height(r.x, r.z);
      const g = new THREE.Group(); g.position.set(r.x, y, r.z);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 2.6, 5), toon('#7d7a72')); st.position.y = 1.2; st.castShadow = true; g.add(st);
      const mat = toon('#5a6670', '#5affd0', 0.0);
      const glyph = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.06, 6, 20), mat); glyph.position.set(0, 1.6, 0.55); glyph.rotation.x = -0.15; g.add(glyph);
      const glyph2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), mat); glyph2.position.set(0, 1.6, 0.58); g.add(glyph2);
      const light = new THREE.PointLight('#5affd0', 0, 10, 1.6); light.position.set(0, 2, 1); g.add(light);
      g.rotation.y = Math.atan2(VILLAGE.x - r.x, VILLAGE.z - r.z) * 0.3;
      if (r.id === 'rune_fall') g.rotation.y = 0;
      this.root.add(g);
      this.runeObjs[r.id] = { mat, light, g };
      this.colliders.push({ x: r.x, z: r.z, hw: 0.6, hd: 0.6 });
      this.interact.push({ id: r.id, x: r.x, z: r.z + 1.6, r: 2, label: r.name });
    }
  }
  setRuneActive(id, on) {
    const o = this.runeObjs[id]; if (!o) return;
    o.mat.emissiveIntensity = on ? 1.6 : 0; o.mat.color.set(on ? '#bfffe9' : '#5a6670'); o.light.intensity = on ? 3 : 0;
  }
  setAltar(level) { // 0..3
    this.altarMat.emissiveIntensity = 0.15 + level * 0.5; this.altarLight.intensity = level * 1.5;
  }

  buildFalls() {
    const F = FALLS;
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uTime: this.uniforms.uTime },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform float uTime; varying vec2 vUv;
        float h(float n){return fract(sin(n)*43758.5);}
        void main(){ float col = floor(vUv.x*28.);
          float s = fract(vUv.y*3. + uTime*(1.6+h(col)*0.8) + h(col)*7.);
          float streak = smoothstep(0.0,0.5,s)*smoothstep(1.0,0.6,s);
          vec3 c = mix(vec3(0.55,0.8,0.9), vec3(0.95,1.,1.), streak);
          float a = 0.55 + streak*0.35; a *= smoothstep(0.,0.06,vUv.x)*smoothstep(1.,0.94,vUv.x);
          gl_FragColor = vec4(c, a); }`,
    });
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(8, 15, 1, 1), mat);
    fall.position.set(F.x, 7.6, F.z + 0.6); this.root.add(fall);
    // Gischt
    const n = 120, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = F.x + (Math.random() - 0.5) * 8; pos[i * 3 + 1] = Math.random() * 2; pos[i * 3 + 2] = F.z + 1 + Math.random() * 3; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.mist = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 0.5, transparent: true, opacity: 0.55, depthWrite: false }));
    this.root.add(this.mist);
  }

  buildSky() {
    this.skyU = { uTop: { value: new THREE.Color('#4a9be8') }, uBot: { value: new THREE.Color('#cfeaff') }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color('#fff4d6') }, uNight: { value: 0 } };
    const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, uniforms: this.skyU,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `uniform vec3 uTop, uBot, uSun, uSunCol; uniform float uNight; varying vec3 vD;
        void main(){ float h = clamp(vD.y*1.4+0.15,0.,1.); vec3 c = mix(uBot,uTop,h);
          float sd = max(dot(normalize(vD), normalize(uSun)),0.);
          c += uSunCol*pow(sd,900.)*3. + uSunCol*pow(sd,12.)*0.25;
          vec3 md = -normalize(uSun); float m = max(dot(normalize(vD), md),0.);
          c += vec3(0.85,0.9,1.)*pow(m,1400.)*2.*uNight + vec3(0.3,0.4,0.7)*pow(m,20.)*0.15*uNight;
          gl_FragColor = vec4(c,1.); }`,
    }));
    sky.renderOrder = -1; this.sky = sky; this.scene.add(sky);
    // Sterne
    const n = 900, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      p[i * 3] = Math.cos(a) * r * 400; p[i * 3 + 1] = Math.abs(u) * 400 + 20; p[i * 3 + 2] = Math.sin(a) * r * 400;
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.scene.add(this.stars);
    // Wolken
    this.clouds = new THREE.Group();
    const cm = new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true, transparent: true, opacity: 0.92 });
    const cg = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 22; i++) {
      const c = new THREE.Group();
      for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(cg, cm); b.position.set(k * 3 - 6 + Math.random() * 2, Math.random() * 1.5, Math.random() * 3); b.scale.setScalar(2.5 + Math.random() * 2.5); b.scale.y *= 0.6; c.add(b); }
      c.position.set((Math.random() - 0.5) * 360, 55 + Math.random() * 25, (Math.random() - 0.5) * 360);
      this.clouds.add(c);
    }
    this.cloudMat = cm; this.scene.add(this.clouds);
  }

  buildFx() {
    // Glühwürmchen
    const n = 260, p = new Float32Array(n * 3); this.ffBase = [];
    for (let i = 0; i < n; i++) {
      let x, z; do { x = (Math.random() - 0.5) * 200; z = (Math.random() - 0.5) * 200; } while (this.height(x, z) < 0.5 || this.height(x, z) > 8);
      this.ffBase.push([x, this.height(x, z) + 0.6 + Math.random() * 2, z, Math.random() * 10]);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.fireflies = new THREE.Points(g, new THREE.PointsMaterial({ color: '#d8ff7a', size: 0.35, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.root.add(this.fireflies);
    // Regen
    const rn = 1600, rp = new Float32Array(rn * 6);
    for (let i = 0; i < rn; i++) { const x = (Math.random() - 0.5) * 60, y = Math.random() * 30, z = (Math.random() - 0.5) * 60; rp.set([x, y, z, x + 0.1, y - 0.9, z], i * 6); }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: '#b8d4ff', transparent: true, opacity: 0, depthWrite: false }));
    this.rain.frustumCulled = false; this.scene.add(this.rain);
  }

  // liegt ein Punkt in einer Baumkrone? (für die Kamera)
  inFoliage(x, y, z) {
    const arr = this.treeGrid.get(Math.floor(x / 8) + ',' + Math.floor(z / 8)); if (!arr) return false;
    for (const [tx, tz, tr] of arr) {
      const s = tr / 0.45; if (s > 2) continue;
      const gy = this.height(tx, tz);
      if (y > gy + 0.5 && y < gy + s * 4.6 && (x - tx) ** 2 + (z - tz) ** 2 < (s * 1.5) ** 2) return true;
    }
    return false;
  }

  // Kollision: true wenn Position blockiert
  blocked(x, z, r = 0.4) {
    if (Math.abs(x) > 122 || Math.abs(z) > 122) return true;
    if (this.height(x, z) < -0.55) return true;
    for (const c of this.colliders) if (Math.abs(x - c.x) < c.hw + r && Math.abs(z - c.z) < c.hd + r) return true;
    const cx = Math.floor(x / 8), cz = Math.floor(z / 8);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const arr = this.treeGrid.get((cx + i) + ',' + (cz + j)); if (!arr) continue;
      for (const [tx, tz, tr] of arr) if ((x - tx) ** 2 + (z - tz) ** 2 < (tr + r) ** 2) return true;
    }
    return false;
  }

  // Tageszeit tod ∈ [0,1): 0.25 Sonnenaufgang, 0.5 Mittag, 0.75 Sonnenuntergang
  update(dt, t, tod, weather, focus, lights) {
    this.uniforms.uTime.value = t; this.waterMat.uniforms.uTime.value = t;
    const ang = (tod - 0.25) * Math.PI * 2;
    const sunDir = new THREE.Vector3(Math.cos(ang) * 0.8, Math.sin(ang), 0.45).normalize();
    const day = smooth(-0.12, 0.2, sunDir.y), dusk = Math.max(0, 1 - Math.abs(sunDir.y) * 4) * (sunDir.y > -0.25 ? 1 : 0);
    const rainy = weather === 'regen' ? 1 : weather === 'wolkig' ? 0.5 : 0;
    const top = new THREE.Color('#0b1430').lerp(new THREE.Color('#3f8fe0'), day).lerp(new THREE.Color('#7a8794'), rainy * 0.7 * day);
    const bot = new THREE.Color('#1b2240').lerp(new THREE.Color('#cdeaff'), day).lerp(new THREE.Color('#ff9a6a'), dusk * 0.7).lerp(new THREE.Color('#a8b0b8'), rainy * 0.6 * day);
    this.skyU.uTop.value.copy(top); this.skyU.uBot.value.copy(bot);
    this.skyU.uSun.value.copy(sunDir); this.skyU.uNight.value = 1 - day;
    this.skyU.uSunCol.value.set('#fff1d0').lerp(new THREE.Color('#ff8a4a'), dusk);
    this.sky.position.copy(focus); this.stars.position.copy(focus); this.stars.position.y = 0;
    this.stars.material.opacity = (1 - day) * (1 - rainy) * 0.9;
    this.scene.fog.color.copy(bot);
    this.scene.fog.near = lerp(60, 25, rainy); this.scene.fog.far = lerp(210, 110, rainy);
    const { sun, hemi } = lights;
    const night = 1 - day;
    sun.position.copy(focus).addScaledVector(sunDir.y > 0 ? sunDir : sunDir.clone().negate(), 80);
    sun.target.position.copy(focus);
    sun.intensity = lerp(0.7, 2.4, day) * (1 - rainy * 0.45);
    sun.color.set('#9fb4ff').lerp(new THREE.Color('#fff2dd'), day).lerp(new THREE.Color('#ffb070'), dusk * 0.6);
    hemi.intensity = lerp(1.0, 1.1, day);
    hemi.color.set('#7086cc').lerp(new THREE.Color('#d8ecff'), day);
    hemi.groundColor.set('#1d2a28').lerp(new THREE.Color('#4a6a3a'), day);
    this.waterMat.uniforms.uDay.value = lerp(0.45, 1, day); this.waterMat.uniforms.uSky.value.copy(top);
    for (const m of this.windowMats) m.emissiveIntensity = night * 1.4;
    this.villageLight.intensity = night * 40;
    this.cloudMat.color.set('#ffffff').lerp(new THREE.Color('#6a7380'), rainy * 0.8).multiplyScalar(lerp(0.35, 1, day));
    this.clouds.children.forEach((c, i) => { c.position.x += dt * (0.8 + (i % 3) * 0.3); if (c.position.x > 200) c.position.x = -200; });
    this.uniforms.uWind.value = 1 + rainy * 1.2;
    // Glühwürmchen
    const fp = this.fireflies.geometry.attributes.position;
    this.ffBase.forEach(([x, y, z, ph], i) => fp.setXYZ(i, x + Math.sin(t * 0.5 + ph) * 1.5, y + Math.sin(t * 1.3 + ph * 2) * 0.4, z + Math.cos(t * 0.4 + ph) * 1.5));
    fp.needsUpdate = true;
    this.fireflies.material.opacity = night * 0.95 * (1 - rainy * 0.7);
    // Regen
    this.rain.material.opacity = weather === 'regen' ? 0.55 : 0;
    if (weather === 'regen') {
      const rp = this.rain.geometry.attributes.position, a = rp.array;
      for (let i = 0; i < a.length; i += 6) { a[i + 1] -= dt * 28; a[i + 4] -= dt * 28; if (a[i + 1] < 0) { a[i + 1] += 30; a[i + 4] += 30; } }
      rp.needsUpdate = true; this.rain.position.set(focus.x, focus.y - 8, focus.z);
    }
    const mp = this.mist.geometry.attributes.position;
    for (let i = 0; i < mp.count; i++) { let y = mp.getY(i) + dt * 1.2; if (y > 3) y = 0; mp.setY(i, y); }
    mp.needsUpdate = true;
    this.crystal.rotation.y = t * 0.6; this.crystal.position.y = 7.4 + Math.sin(t * 1.4) * 0.15;
    return { day, night, sunDir };
  }

  // Minikarte als Canvas (einmalig)
  makeMap(px = 256) {
    const cv = document.createElement('canvas'); cv.width = cv.height = px;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(px, px);
    for (let j = 0; j < px; j++) for (let i = 0; i < px; i++) {
      const x = (i / px - 0.5) * SIZE, z = (j / px - 0.5) * SIZE, h = this.height(x, z);
      let c;
      if (h < -0.05) c = [52, 128, 170];
      else if (pathDist(x, z) < 1.8) c = [200, 170, 120];
      else if (h > 9) c = [130, 124, 112];
      else if (this.inGrass(x, z)) c = [140, 200, 90];
      else if (Math.hypot(x - GROVE.x, z - GROVE.z) < GROVE.r) c = [44, 70, 60];
      else if (Math.hypot(x - TEMPLE.x, z - TEMPLE.z) < 14) c = [180, 175, 160];
      else c = this.forestDensity(x, z) > -0.05 ? [52, 120, 60] : [92, 168, 78];
      const k = (j * px + i) * 4; const sh = 0.85 + clamp(h / 30, 0, 0.3);
      img.data[k] = c[0] * sh; img.data[k + 1] = c[1] * sh; img.data[k + 2] = c[2] * sh; img.data[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }
}
