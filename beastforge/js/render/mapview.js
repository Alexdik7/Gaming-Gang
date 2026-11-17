// 3D-Karte aus dem Raster (Daten in data/maps.js). Viele gleiche Teile → InstancedMesh.
import * as THREE from 'three';
import { toon, glow, flat, mk, geo, merge, gradTex, optimize, anim } from './toon.js';

const PI = Math.PI;
export const HEIGHT = { '.': 0, 'T': 0, 'R': 0, '#': -0.05, '~': -0.32, '^': 0.34, 'S': 0 };

function tileGeo(top, side, h = 1) {
  const g = new THREE.BoxGeometry(1, h, 1).toNonIndexed();
  g.translate(0, -h / 2, 0);
  const col = [], c1 = new THREE.Color(top), c2 = new THREE.Color(side), n = g.attributes.normal.array, p = g.attributes.position.array;
  for (let i = 0; i < n.length; i += 3) { const c = n[i + 1] > 0.5 ? c1 : (p[i + 1] > -0.12 ? c1.clone().lerp(c2, 0.55) : c2); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

export class MapView {
  constructor(scene, map) {
    this.map = map; this.scene = scene; this.root = new THREE.Group(); scene.add(this.root);
    this.H = map.grid.length; this.W = map.grid[0].length; this.rocks = new Map(); this.t = 0; this.paths = map.paths || [map.path];
    const th = map.theme;
    const vmat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradTex });
    const cells = { grass: [], path: [], water: [], high: [] };
    map.grid.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '#') cells.path.push([x, y]); else if (ch === '~') cells.water.push([x, y]); else if (ch === '^') cells.high.push([x, y]); else cells.grass.push([x, y, ch]);
    }));
    const inst = (g, list, yOf, colFn) => {
      const m = new THREE.InstancedMesh(g, vmat, list.length); const M = new THREE.Matrix4(), c = new THREE.Color();
      list.forEach((cell, i) => { const [x, y] = cell; M.makeTranslation(this.wx(x), yOf(cell), this.wz(y)); m.setMatrixAt(i, M); m.setColorAt(i, colFn(cell, c)); });
      m.receiveShadow = true; this.root.add(m); return m;
    };
    const rnd = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5; return s - Math.floor(s); };
    inst(tileGeo(th.grass, 0x7a5a3a, 0.6), cells.grass, ([x, y]) => (rnd(x, y) - 0.5) * 0.02, ([x, y], c) => c.setHSL(0, 0, 0.92 + rnd(x + 3, y) * 0.12).lerp(new THREE.Color(th.grass2), (x + y) % 2 ? 0.08 : 0));
    inst(tileGeo(th.dirt, 0x8a6a48, 0.6), cells.path, () => HEIGHT['#'], ([x, y], c) => c.setHSL(0, 0, 0.94 + rnd(x, y + 7) * 0.08));
    inst(tileGeo(0x2a7a9a, 0x5a4a3a, 0.6), cells.water, () => -0.42, (_, c) => c.setRGB(1, 1, 1));
    inst(tileGeo(th.high || 0x88c85a, th.cliff, 1.0), cells.high, () => HEIGHT['^'], ([x, y], c) => c.setHSL(0, 0, 0.95 + rnd(x, y) * 0.08));
    if (th.roof) { // Dachziegel-Reihen + First auf den Dächern
      const rows = []; for (const [x, y] of cells.high) for (let k = 0; k < 3; k++) rows.push([this.wx(x), HEIGHT['^'] + 0.02, this.wz(y) - 0.33 + k * 0.33]);
      const rm = new THREE.InstancedMesh(geo.box(), toon(0x5a3a32), rows.length), RM = new THREE.Matrix4();
      rows.forEach(([x, y, z], i) => { RM.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(1, 0.04, 0.06)); rm.setMatrixAt(i, RM); });
      this.root.add(rm);
    }
    // Ränder der Anhöhe: Steinkante
    for (const [x, y] of cells.high) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (map.grid[y + dy]?.[x + dx] === '^') continue;
        const e = mk(geo.box(), toon(0x9a8a78), { p: [this.wx(x) + dx * 0.47, HEIGHT['^'] + 0.01, this.wz(y) + dy * 0.47], s: [dy ? 1 : 0.07, 0.06, dx ? 1 : 0.07], ol: 0.01 });
        e.receiveShadow = true; this.root.add(e);
      }
    }
    // Pfad: Trittsteine + Randsteinchen
    const pebbles = [];
    cells.path.forEach(([x, y]) => { for (let i = 0; i < 3; i++) pebbles.push([this.wx(x) + (rnd(x * 3 + i, y) - 0.5) * 0.8, this.wz(y) + (rnd(x, y * 5 + i) - 0.5) * 0.8, 0.04 + rnd(i, x + y) * 0.05]); });
    const peb = new THREE.InstancedMesh(geo.sphere(6), toon(0xb09878), pebbles.length), M = new THREE.Matrix4();
    pebbles.forEach(([x, z, s], i) => { M.compose(new THREE.Vector3(x, HEIGHT['#'], z), new THREE.Quaternion(), new THREE.Vector3(s * 1.4, s * 0.45, s)); peb.setMatrixAt(i, M); });
    this.root.add(peb);
    // Gras-Büschel
    const tufts = [];
    cells.grass.forEach(([x, y, ch]) => { if (ch !== '.') return; const n = 2 + Math.floor(rnd(x, y) * 3); for (let i = 0; i < n; i++) tufts.push([this.wx(x) + (rnd(x + i, y * 2) - 0.5) * 0.85, this.wz(y) + (rnd(x * 2, y + i) - 0.5) * 0.85, rnd(i, y) * PI]); });
    cells.high.forEach(([x, y]) => { for (let i = 0; i < 2; i++) tufts.push([this.wx(x) + (rnd(x + i, y) - 0.5) * 0.8, this.wz(y) + (rnd(x, y + i) - 0.5) * 0.8, 0, HEIGHT['^']]); });
    const tg = merge([[geo.cone(4), th.grass2, [0, 0.06, 0], [0, 0, 0.2], [0.03, 0.14, 0.03]], [geo.cone(4), th.grass, [0.04, 0.05, 0.01], [0, 0, -0.3], [0.025, 0.11, 0.025]], [geo.cone(4), 0x9ad86a, [-0.03, 0.045, -0.02], [0.2, 0, 0.1], [0.025, 0.1, 0.025]]]);
    const tm = new THREE.InstancedMesh(tg, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradTex }), tufts.length);
    tufts.forEach(([x, z, r, h = 0], i) => { M.compose(new THREE.Vector3(x, h, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r, 0)), new THREE.Vector3(1, 1, 1)); tm.setMatrixAt(i, M); });
    this.root.add(tm);
    // Blumen
    const fl = []; cells.grass.forEach(([x, y, ch]) => { if (ch === '.' && rnd(x * 7, y) > 0.72) fl.push([this.wx(x) + (rnd(x, y * 3) - 0.5) * 0.7, this.wz(y) + (rnd(x * 3, y) - 0.5) * 0.7, rnd(x, y) > 0.5 ? 0xffe14d : 0xffffff]); });
    const fm = new THREE.InstancedMesh(geo.sphere(6), toon(0xffffff), fl.length);
    fl.forEach(([x, z, c], i) => { M.compose(new THREE.Vector3(x, 0.05, z), new THREE.Quaternion(), new THREE.Vector3(0.035, 0.02, 0.035)); fm.setMatrixAt(i, M); fm.setColorAt(i, new THREE.Color(c)); });
    this.root.add(fm);
    this.buildWater(cells.water);
    this.buildTrees(cells, rnd, th);
    // Felsen (räumbar)
    map.grid.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch !== 'R') return;
      const g = new THREE.Group(); g.position.set(this.wx(x), 0, this.wz(y));
      g.add(mk(geo.dodec(), toon(0x8a8a90), { p: [0, 0.2, 0], r: [0.3, 0.5, 0.2], s: [0.36, 0.28, 0.32] }));
      g.add(mk(geo.dodec(), toon(0x9a9aa0), { p: [0.2, 0.12, 0.15], r: [0.1, 1, 0.4], s: [0.18, 0.14, 0.16] }));
      g.add(mk(geo.sphere(8), toon(0x5aa040), { p: [-0.05, 0.38, 0], s: [0.2, 0.06, 0.18], ol: false }));
      this.root.add(g); this.rocks.set(x + ',' + y, g);
    }));
    this.buildShrine(); this.buildTorii(); this.buildLanterns(rnd);
    // Umgebung
    // Umgebung: vier Flächen rund um die Karte (nicht darüber – sonst verdecken sie Pfad und Wasser)
    const gm = toon(0x5a9a40), W2 = this.W / 2, H2 = this.H / 2, F = 40;
    for (const [x, z, w, h] of [[-W2 - F / 2, 0, F, 2 * F], [W2 + F / 2, 0, F, 2 * F], [0, -H2 - F / 2, this.W, F], [0, H2 + F / 2, this.W, F]]) {
      const g = new THREE.Mesh(new THREE.PlaneGeometry(w, h), gm); g.rotation.x = -PI / 2; g.position.set(x, -0.012, z); g.receiveShadow = true; this.root.add(g);
    }
    anim(this.heart, ...this.rocks.values());
    optimize(this.root);
  }
  wx(x) { return x + 0.5 - this.W / 2; }
  wz(y) { return y + 0.5 - this.H / 2; }
  heightAt(cx, cy) { return HEIGHT[this.map.grid[cy]?.[cx]] ?? 0; }

  buildWater(list) {
    if (!list.length) return;
    this.waterMat = new THREE.ShaderMaterial({
      transparent: true, uniforms: { uT: { value: 0 }, uA: { value: new THREE.Color(0x2aa6e6) }, uB: { value: new THREE.Color(0xc4f8ff) } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
      fragmentShader: `uniform float uT; uniform vec3 uA; uniform vec3 uB; varying vec3 vW;
        void main(){ float w = sin(vW.x*3.1+uT*1.3)*sin(vW.z*2.7-uT*1.1) + sin((vW.x+vW.z)*5.0+uT*2.0)*0.5;
          float s = smoothstep(0.75, 1.0, w); vec3 c = mix(uA, uB, 0.3 + w*0.12) + s*0.4;
          gl_FragColor = vec4(c, 0.94); }`,
    });
    const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-PI / 2);
    const m = new THREE.InstancedMesh(g, this.waterMat, list.length), M = new THREE.Matrix4();
    list.forEach(([x, y], i) => { M.makeTranslation(this.wx(x), -0.12, this.wz(y)); m.setMatrixAt(i, M); });
    this.root.add(m);
    // Seerosen
    const pads = list.filter(([x, y]) => (x * 7 + y * 3) % 4 === 0);
    for (const [x, y] of pads) {
      this.root.add(mk(geo.cyl(10), toon(0x4aa040), { p: [this.wx(x) + 0.2, -0.11, this.wz(y) - 0.15], s: [0.16, 0.01, 0.16], ol: 0.008 }));
      this.root.add(mk(geo.sphere(8), toon(0xffb0d0), { p: [this.wx(x) + 0.22, -0.08, this.wz(y) - 0.12], s: [0.05, 0.035, 0.05], ol: 0.008 }));
    }
  }

  buildTrees(cells, rnd, th) {
    const spots = [];
    cells.grass.forEach(([x, y, ch]) => { if (ch === 'T') spots.push([this.wx(x), this.wz(y), rnd(x, y)]); });
    // Waldrand: links, rechts, hinten (vorne bleibt frei, damit die Kamera nichts verdeckt)
    for (let i = 0; i < 160; i++) {
      const side = i % 3, a = rnd(i, 1), b = rnd(i, 2);
      let x, z;
      if (side === 0) { x = -this.W / 2 - 0.6 - a * 7; z = -this.H / 2 - 3 + b * (this.H + 2); }
      else if (side === 1) { x = this.W / 2 + 0.6 + a * 7; z = -this.H / 2 - 3 + b * (this.H + 2); }
      else { x = -this.W / 2 - 6 + a * (this.W + 12); z = -this.H / 2 - 0.7 - b * 6; }
      if (this.paths.some(P => Math.abs(z - this.wz(P[0][1])) < 1.2) && x < -this.W / 2 + 0.5) continue; // Pfad-Eingänge frei
      spots.push([x, z, rnd(i, 3)]);
    }
    const kinds = {
      pine: merge([[geo.cyl(6), 0x6a4a32, [0, 0.25, 0], 0, [0.07, 0.5, 0.07]], [geo.cone(7), 0x2f7a46, [0, 0.62, 0], 0, [0.42, 0.6, 0.42]], [geo.cone(7), 0x3a8a50, [0, 0.95, 0], 0, [0.33, 0.5, 0.33]], [geo.cone(7), 0x4a9a5a, [0, 1.22, 0], 0, [0.22, 0.4, 0.22]]]),
      round: merge([[geo.cyl(6), 0x6a4a32, [0, 0.3, 0], 0, [0.08, 0.6, 0.08]], [geo.ico(1), 0x4f9a3e, [0, 0.85, 0], 0, 0.42], [geo.ico(1), 0x63b04a, [0.18, 1.05, 0.08], 0, 0.28], [geo.ico(1), 0x5aa844, [-0.2, 0.95, -0.05], 0, 0.3]]),
      blossom: merge([[geo.cyl(6), 0x5a3a2a, [0, 0.3, 0], [0, 0, 0.1], [0.07, 0.6, 0.07]], [geo.ico(1), th.blossom, [0, 0.85, 0], 0, 0.4], [geo.ico(1), 0xffc8dc, [0.2, 1.0, 0.1], 0, 0.27], [geo.ico(1), 0xff98bc, [-0.2, 0.92, -0.08], 0, 0.28]]),
    };
    const mats = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradTex });
    const buckets = { pine: [], round: [], blossom: [] };
    for (const [x, z, r] of spots) buckets[r < 0.4 ? 'pine' : r < 0.75 ? 'round' : 'blossom'].push([x, z, r]);
    const M = new THREE.Matrix4();
    for (const k in buckets) {
      const L = buckets[k]; if (!L.length) continue;
      const m = new THREE.InstancedMesh(kinds[k], mats, L.length);
      L.forEach(([x, z, r], i) => { const s = 0.8 + r * 0.6; M.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r * 6, 0)), new THREE.Vector3(s, s, s)); m.setMatrixAt(i, M); });
      m.castShadow = true; m.receiveShadow = true; this.root.add(m);
    }
  }

  buildShrine() {
    const S = []; this.map.grid.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'S') S.push([x, y]); }));
    const last = this.map.path[this.map.path.length - 1];
    const cx = S.reduce((a, s) => a + s[0], 0) / S.length + 0.5, cy = last[1];
    const g = new THREE.Group(); g.position.set(cx - this.W / 2 + 0.25, 0, cy - this.H / 2); g.rotation.y = -Math.PI / 2; g.scale.setScalar(0.9); this.root.add(g);
    const stone = toon(0xd8d2c4), wood = toon(0xd8342c), roof = toon(0x3f9a86), gold = toon(0xffc94a, { emissive: 0x7a5a10, emissiveIntensity: 0.4 });
    g.add(mk(geo.box(), stone, { p: [0, 0.08, 0], s: [2.6, 0.16, 0.95] }));
    g.add(mk(geo.box(), stone, { p: [0, 0.2, -0.05], s: [2.2, 0.1, 0.8] }));
    for (const x of [-0.95, 0.95]) for (const z of [-0.3, 0.25]) g.add(mk(geo.cyl(8), wood, { p: [x, 0.65, z], s: [0.07, 0.9, 0.07] }));
    g.add(mk(geo.box(), wood, { p: [0, 1.1, -0.02], s: [2.3, 0.08, 0.75] }));
    g.add(mk(geo.box(), roof, { p: [0, 1.22, -0.02], s: [2.7, 0.08, 1.05] }));
    g.add(mk(geo.cone(4), roof, { p: [0, 1.38, -0.02], r: [0, PI / 4, 0], s: [1.75, 0.28, 0.8] }));
    for (const x of [-1.32, 1.32]) g.add(mk(geo.cone(6), roof, { p: [x, 1.32, -0.02], r: [0, 0, x > 0 ? -1.2 : 1.2], s: [0.07, 0.25, 0.07] }));
    g.add(mk(geo.sphere(8), gold, { p: [0, 1.72, -0.02], s: 0.08 }));
    // Herzkristall
    this.heart = new THREE.Group(); this.heart.position.set(0, 0.7, 0); g.add(this.heart);
    this.heartCore = mk(geo.oct(), toon(0x8ff6ff, { emissive: 0x3ad0ff, emissiveIntensity: 1.2 }), { s: [0.17, 0.3, 0.17], ol: 0.012 });
    this.heart.add(this.heartCore);
    this.heartGlow = mk(geo.sphere(12), glow(0x6ff6ff, 0.3).clone(), { s: 0.38, ol: false }); this.heart.add(this.heartGlow);
    this.heartLight = new THREE.PointLight(0x6ff6ff, 1.5, 3.5); this.heartLight.position.set(0, 0.7, 0.3); g.add(this.heartLight);
    for (const x of [-1.15, 1.15]) { g.add(mk(geo.box(), stone, { p: [x, 0.35, 0.4], s: [0.16, 0.5, 0.16] })); g.add(mk(geo.cone(4), roof, { p: [x, 0.68, 0.4], r: [0, PI / 4, 0], s: [0.2, 0.16, 0.2] })); g.add(mk(geo.sphere(6), glow(0xffd27a, 0.9), { p: [x, 0.5, 0.4], s: 0.05, ol: false })); }
  }
  buildTorii() { for (const P of this.paths) this.torii(P); }
  torii(P) {
    const [px, py] = P[0], [qx, qy] = P[1], a = Math.atan2(qy - py, qx - px);
    const g = new THREE.Group(); g.position.set(0.35 - this.W / 2, 0, py - this.H / 2); g.rotation.y = Math.PI / 2 - a; this.root.add(g);
    const red = toon(0xd8342c), blk = toon(0x2a2a36);
    for (const x of [-0.48, 0.48]) { g.add(mk(geo.cyl(10), red, { p: [x, 0.65, 0], s: [0.06, 1.3, 0.06] })); g.add(mk(geo.cyl(10), blk, { p: [x, 0.06, 0], s: [0.08, 0.12, 0.08] })); }
    g.add(mk(geo.box(), red, { p: [0, 1.06, 0], s: [1.15, 0.07, 0.08] }));
    g.add(mk(geo.box(), blk, { p: [0, 1.32, 0], s: [1.45, 0.08, 0.13] }));
    g.add(mk(geo.box(), red, { p: [0, 1.25, 0], s: [1.3, 0.07, 0.1] }));
    g.add(mk(geo.box(), blk, { p: [0, 1.17, 0.05], s: [0.16, 0.14, 0.02] }));
  }
  buildLanterns(rnd) {
    // Laternen: in regelmäßigen Abständen neben dem Pfad, wo Gras ist
    const spots = [];
    for (const P of this.paths) for (let i = 1; i < P.length; i++) { const [ax, ay] = P[i - 1], [bx, by] = P[i], L = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / L, ny = (bx - ax) / L; for (let d = 2.5; d < L - 1; d += 5) { const side = (spots.length % 2) ? 1 : -1; spots.push([ax + (bx - ax) * d / L + nx * 0.7 * side, ay + (by - ay) * d / L + ny * 0.7 * side]); } }
    this.lanternLights = []; this.lanterns = [];
    for (const [x, y] of spots) {
      if (this.map.grid[Math.floor(y)]?.[Math.floor(x)] !== '.') continue;
      this.lanterns.push([x, y]);
      const g = new THREE.Group(); g.position.set(x - this.W / 2, 0, y - this.H / 2); g.scale.setScalar(0.75); this.root.add(g);
      const st = toon(0xa8a49a);
      g.add(mk(geo.cyl(6), st, { p: [0, 0.08, 0], s: [0.12, 0.08, 0.12] }));
      g.add(mk(geo.cyl(6), st, { p: [0, 0.28, 0], s: [0.05, 0.32, 0.05] }));
      g.add(mk(geo.box(), st, { p: [0, 0.48, 0], s: [0.18, 0.14, 0.18] }));
      g.add(mk(geo.cone(4), toon(0x7a766e), { p: [0, 0.63, 0], r: [0, PI / 4, 0], s: [0.2, 0.14, 0.2] }));
      const l = mk(geo.box(), glow(0xffc870, 0.95), { p: [0, 0.48, 0], s: [0.12, 0.09, 0.19], ol: false }); g.add(l); this.lanternLights.push(l);
    }
  }
  removeRock(cx, cy) { const g = this.rocks.get(cx + ',' + cy); if (g) { this.root.remove(g); this.rocks.delete(cx + ',' + cy); } }
  update(dt, livesFrac = 1) {
    this.t += dt;
    if (this.waterMat) this.waterMat.uniforms.uT.value = this.t;
    if (this.heart) {
      this.heart.rotation.y = this.t * 0.8; this.heart.position.y = 0.72 + Math.sin(this.t * 2) * 0.05;
      const f = Math.max(0.15, livesFrac);
      this.heartCore.material.emissiveIntensity = 0.3 + f * 1.1;
      this.heartGlow.material.opacity = 0.12 + f * 0.25 + Math.sin(this.t * 3) * 0.04;
      this.heartLight.intensity = 0.5 + f * 1.2;
    }
  }
}
