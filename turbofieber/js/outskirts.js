// Turbofieber – Umland von Velara: Highway-Ring, Ausfahrten, Hafen, Bergstraße mit Gelände.
// Liefert befahrbare Bereiche (Kollision) und die Höhe der Bergstraße.
import * as THREE from 'three';
import { OFF, roadCenter } from './world.js';

export const HALF = -OFF;                    // Stadtrand (398 m)
export const HW_IN = 456, HW_OUT = 484;      // Highway-Ring: innerer / äußerer Rand
export const HW_MID = (HW_IN + HW_OUT) / 2;  // Mittellinie
export const EXIT = roadCenter(4);           // Mittellinie der Ausfahrten
export const HARBOR = { x0: -380, x1: 380, z0: -760, z1: -560 };

const rect = (x0, x1, z0, z1) => ({ x0, x1, z0, z1 });

/* ---------- Highway als abgerundetes Quadrat (für den Verkehr) ---------- */
const RA = HW_MID, RR = 22, RS = 2 * (RA - RR), RQ = Math.PI * RR / 2;
const RING_SEG = [
  { line: true, len: RS, p: [RA, -(RA - RR)], t: [0, 1] },
  { line: false, len: RQ, c: [RA - RR, RA - RR], a0: 0 },
  { line: true, len: RS, p: [RA - RR, RA], t: [-1, 0] },
  { line: false, len: RQ, c: [-(RA - RR), RA - RR], a0: Math.PI / 2 },
  { line: true, len: RS, p: [-RA, RA - RR], t: [0, -1] },
  { line: false, len: RQ, c: [-(RA - RR), -(RA - RR)], a0: Math.PI },
  { line: true, len: RS, p: [-(RA - RR), -RA], t: [1, 0] },
  { line: false, len: RQ, c: [RA - RR, -(RA - RR)], a0: Math.PI * 1.5 }
];
export const RING_LEN = RING_SEG.reduce((a, s) => a + s.len, 0);
// Punkt auf dem Ring: s = Weg, off = Abstand nach außen. Schreibt x, z, tx, tz (Tangente) in out.
export function ringAt(s, off, out) {
  s = ((s % RING_LEN) + RING_LEN) % RING_LEN;
  for (const g of RING_SEG) {
    if (s > g.len) { s -= g.len; continue; }
    let px, pz, nx, nz;
    if (g.line) {
      px = g.p[0] + g.t[0] * s; pz = g.p[1] + g.t[1] * s;
      out.tx = g.t[0]; out.tz = g.t[1];
      nx = g.t[1]; nz = -g.t[0];
    } else {
      const a = g.a0 + s / RR;
      nx = Math.cos(a); nz = Math.sin(a);
      px = g.c[0] + nx * RR; pz = g.c[1] + nz * RR;
      out.tx = -nz; out.tz = nx;
    }
    out.x = px + nx * off; out.z = pz + nz * off;
    return out;
  }
  return out;
}

/* ---------- Bergstraße ---------- */
const MOUNTAIN_CTRL = [
  [EXIT, 0, 470], [EXIT, 0, 540], [-10, 3, 610], [80, 8, 650], [180, 14, 680], [240, 20, 760], [200, 27, 850],
  [90, 33, 890], [-40, 40, 870], [-150, 46, 900], [-210, 52, 980], [-150, 59, 1060], [-30, 64, 1090], [80, 68, 1070]
];
export const ROAD_W = 7;                     // halbe Breite der Bergstraße
const curve = new THREE.CatmullRomCurve3(MOUNTAIN_CTRL.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'centripetal');
export const MOUNTAIN = curve.getSpacedPoints(320);  // ≈ 4 m Abstand
for (const p of MOUNTAIN) p.y = Math.max(0, p.y);   // Kurve schwingt am Anfang leicht unter 0 – abschneiden
export const SUMMIT = MOUNTAIN[MOUNTAIN.length - 1];

// Nächster Punkt auf der Bergstraße (Polylinie): Abstand, Höhe, Index
function nearestRoad(x, z) {
  let best = Infinity, bh = 0, bi = 0;
  for (let i = 0; i < MOUNTAIN.length - 1; i++) {
    const a = MOUNTAIN[i], b = MOUNTAIN[i + 1];
    const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz;
    let t = ((x - a.x) * dx + (z - a.z) * dz) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = a.x + dx * t, pz = a.z + dz * t, d2 = (x - px) * (x - px) + (z - pz) * (z - pz);
    if (d2 < best) { best = d2; bh = a.y + (b.y - a.y) * t; bi = i; }
  }
  return { d: Math.sqrt(best), h: bh, i: bi };
}

// Rohes Bergrelief (vor dem Einschneiden der Straße)
function hills(x, z) {
  const ramp = THREE.MathUtils.smoothstep(z, 520, 760) * (1 - THREE.MathUtils.smoothstep(Math.abs(x), 640, 900));
  if (ramp <= 0) return 0;
  const n = 34 * (0.5 + 0.5 * Math.sin(x * 0.0042 + 1.3) * Math.cos(z * 0.0051)) +
    22 * Math.pow(Math.sin(x * 0.011 + z * 0.0068), 2) +
    9 * Math.sin(x * 0.031) * Math.sin(z * 0.027);
  return ramp * (n + (z - 520) * 0.075);
}

/* ---------- Texturen ---------- */
function mountainRoadTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#2c2e33'; g.fillRect(0, 0, 128, 256);
  const img = g.getImageData(0, 0, 128, 256), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 24; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
  g.fillStyle = '#dcd9cf';
  g.fillRect(5, 0, 4, 256); g.fillRect(119, 0, 4, 256);          // Randlinien
  g.fillStyle = '#e8c23a'; g.fillRect(62, 0, 4, 128);           // gestrichelte Mitte
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export class Outskirts {
  constructor(world) {
    this.world = world;
    this.scene = world.scene;
    this.rects = [
      rect(-HALF, HALF, -HALF, HALF),                                         // Stadt
      rect(-HW_OUT, HW_OUT, HW_IN, HW_OUT), rect(-HW_OUT, HW_OUT, -HW_OUT, -HW_IN),
      rect(HW_IN, HW_OUT, -HW_OUT, HW_OUT), rect(-HW_OUT, -HW_IN, -HW_OUT, HW_OUT),
      rect(EXIT - 11, EXIT + 11, HALF - 30, HW_IN + 14), rect(EXIT - 11, EXIT + 11, -HW_IN - 14, -HALF + 30),   // Ausfahrten N/S
      rect(HALF - 30, HW_IN + 14, EXIT - 11, EXIT + 11), rect(-HW_IN - 14, -HALF + 30, EXIT - 11, EXIT + 11),   // Ausfahrten O/W
      rect(EXIT - 11, EXIT + 11, HARBOR.z1 - 20, -HW_OUT + 14),                                               // Hafenzufahrt
      rect(HARBOR.x0, HARBOR.x1, HARBOR.z0, HARBOR.z1)                                                        // Hafengelände
    ];
    this.obstacles = [];   // Container, Lagerhallen, Kräne
    this.build();
  }

  build() {
    const w = this.world;
    // Asphalt: Highway, Ausfahrten, Hafenzufahrt
    for (const r of this.rects.slice(1, 10)) this.scene.add(w.flat(r.x0, r.x1, r.z0, r.z1, 0.004, w.groundMat));
    this.buildHighwayDetails();
    this.buildHarbor();
    this.buildMountain();
  }

  // Fahrbahnmarkierungen, Leitplanken und Laternen am Highway
  buildHighwayDetails() {
    const items = [];
    const dash = (x, z, alongX, len) => items.push(alongX ? [x, z, len, 0.25] : [x, z, 0.25, len]);
    for (const sgn of [-1, 1]) {
      for (let t = -HW_OUT + 10; t < HW_OUT - 10; t += 9) {
        for (const o of [-7, 7]) {                                  // gestrichelte Spurtrenner
          dash(t, sgn * (HW_MID + o), true, 4);
          dash(sgn * (HW_MID + o), t, false, 4);
        }
      }
      for (const o of [-13, -0.3, 0.3, 13]) {                        // Randlinien + doppelte Mittellinie
        items.push([0, sgn * (HW_MID + o), HW_OUT * 2, 0.22]);
        items.push([sgn * (HW_MID + o), 0, 0.22, HW_OUT * 2]);
      }
    }
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#d8d6cc', roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }), items.length);
    const d = new THREE.Object3D();
    items.forEach(([x, z, sx, sz], k) => { d.position.set(x, 0.02, z); d.scale.set(sx, 1, sz); d.updateMatrix(); mesh.setMatrixAt(k, d.matrix); });
    this.scene.add(mesh);

    // Leitplanken (mit Lücken an den Ausfahrten)
    const rails = [];
    const gap = [EXIT - 12, EXIT + 12];
    const railLine = (fixed, alongX, from, to, gaps) => {
      let a = from;
      for (const [g0, g1] of gaps.concat([[to, to]])) {
        if (g0 > a) rails.push(alongX ? [(a + g0) / 2, fixed, g0 - a, 0.35] : [fixed, (a + g0) / 2, 0.35, g0 - a]);
        a = g1;
      }
    };
    for (const sgn of [-1, 1]) {
      // innen: Lücken für alle vier Ausfahrten
      railLine(sgn * (HW_IN - 0.6), true, -HW_IN, HW_IN, [gap]);
      railLine(sgn * (HW_IN - 0.6), false, -HW_IN, HW_IN, [gap]);
      // außen: Norden (Bergstraße) und Süden (Hafen) offen
      railLine(sgn * (HW_OUT + 0.6), true, -HW_OUT, HW_OUT, [gap]);
      railLine(sgn * (HW_OUT + 0.6), false, -HW_OUT, HW_OUT, []);
    }
    const rm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.8, 1).translate(0, 0.4, 0),
      new THREE.MeshStandardMaterial({ color: '#b9bec6', metalness: 0.7, roughness: 0.35 }), rails.length);
    rails.forEach(([x, z, sx, sz], k) => { d.position.set(x, 0, z); d.scale.set(sx, 1, sz); d.updateMatrix(); rm.setMatrixAt(k, d.matrix); });
    rm.castShadow = true;
    this.scene.add(rm);
    this.hwRails = rails;

    // Laternen am Außenrand
    const spots = [];
    for (let t = -HW_OUT + 20; t < HW_OUT; t += 44) {
      if (Math.abs(t - EXIT) < 16) continue;
      spots.push([t, HW_OUT + 1.5, 0, -1], [t, -HW_OUT - 1.5, 0, 1], [HW_OUT + 1.5, t, -1, 0], [-HW_OUT - 1.5, t, 1, 0]);
    }
    this.world.addLamps(spots, 10);
  }

  // Hafen: Containerstapel, Kräne, Lagerhallen, Kai und Wasser
  buildHarbor() {
    const w = this.world, s = this.scene, r = w.rng;
    // Betonboden des Hafens
    const concrete = new THREE.MeshStandardMaterial({ map: w.groundMat.map, color: '#a8a49c', roughness: 0.85 });
    w.wetMats.push({ m: concrete, r: 0.85 });
    s.add(w.flat(HARBOR.x0, HARBOR.x1, HARBOR.z0, HARBOR.z1, 0.006, concrete));
    // Wasser
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(4000, 1700).rotateX(-Math.PI / 2),
      new THREE.MeshPhysicalMaterial({ color: '#0b2a3c', roughness: 0.07, metalness: 0.25, clearcoat: 0.6 }));
    this.water.position.set(0, -1.5, HARBOR.z0 - 850);
    s.add(this.water);

    const boxes = [];            // [x, y, z, sx, sy, sz, color]
    const COLORS = ['#c0392b', '#2471a3', '#1e8449', '#d68910', '#7d3c98', '#5d6d7e', '#a04000', '#117a65', '#e6e6e6'];
    // Kaimauer
    boxes.push([0, -1.5, HARBOR.z0 - 0.8, HARBOR.x1 - HARBOR.x0, 1.5, 1.6, '#8f8b84']);
    // Containerreihen
    for (let row = 0; row < 5; row++) {
      const rz = -605 - row * 28;
      for (let cx = HARBOR.x0 + 30; cx < HARBOR.x1 - 30; cx += 16) {
        if (Math.abs(cx - EXIT) < 22 || r() < 0.18) continue;
        const stacks = 3, levels = 1 + Math.floor(r() * 4);
        for (let k = 0; k < stacks; k++) for (let l = 0; l < levels; l++) {
          if (l > 0 && r() < 0.25) break;
          boxes.push([cx, l * 2.6, rz + (k - 1) * 2.5, 12.1, 2.55, 2.4, COLORS[Math.floor(r() * COLORS.length)]]);
        }
        this.obstacles.push(rect(cx - 6.2, cx + 6.2, rz - 3.8, rz + 3.8));
      }
    }
    // Lagerhallen
    for (const [x0, x1] of [[-330, -170], [90, 250]]) {
      boxes.push([(x0 + x1) / 2, 0, -575, x1 - x0, 13, 26, '#6e747c']);
      boxes.push([(x0 + x1) / 2, 13, -575, x1 - x0 + 2, 1.2, 28, '#4e545c']);
      this.obstacles.push(rect(x0, x1, -588, -562));
    }
    // Containerkräne am Kai
    this.craneLights = [];
    for (const cx of [-260, -95, 70, 235]) {
      const z = HARBOR.z0 + 14;
      for (const [lx, lz] of [[-9, -6], [9, -6], [-9, 6], [9, 6]]) boxes.push([cx + lx, 0, z + lz, 1.4, 42, 1.4, '#e67e22']);
      boxes.push([cx, 40, z, 22, 3, 15, '#d35400']);
      boxes.push([cx, 38.5, z - 32, 3.2, 2.4, 70, '#e67e22']);           // Ausleger übers Wasser
      boxes.push([cx, 30, z - 52, 4, 2, 4, '#222222']);                   // Greifer
      boxes.push([cx, 31, z - 52, 0.15, 8, 0.15, '#222222']);
      for (const [lx, lz] of [[-9, -6], [9, -6], [-9, 6], [9, 6]]) this.obstacles.push(rect(cx + lx - 1.2, cx + lx + 1.2, z + lz - 1.2, z + lz + 1.2));
      this.craneLights.push([cx, 43.6, z], [cx, 40, z - 67]);
    }
    const unit = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const mesh = new THREE.InstancedMesh(unit, new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.35 }), boxes.length);
    const d = new THREE.Object3D(), col = new THREE.Color();
    boxes.forEach(([x, y, z, sx, sy, sz, c], k) => {
      d.position.set(x, y, z); d.scale.set(sx, sy, sz); d.updateMatrix();
      mesh.setMatrixAt(k, d.matrix);
      mesh.setColorAt(k, col.set(c));
    });
    mesh.castShadow = mesh.receiveShadow = true;
    s.add(mesh);
    // Rote Warnlichter auf den Kränen (blinken)
    this.warnMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2020'), toneMapped: false });
    const warn = new THREE.InstancedMesh(new THREE.SphereGeometry(0.6, 8, 6), this.warnMat, this.craneLights.length);
    this.craneLights.forEach(([x, y, z], k) => { d.position.set(x, y, z); d.scale.set(1, 1, 1); d.updateMatrix(); warn.setMatrixAt(k, d.matrix); });
    s.add(warn);
    // Laternen im Hafen
    const spots = [];
    for (let x = HARBOR.x0 + 20; x < HARBOR.x1; x += 60) spots.push([x, -594, 0, -1], [x, -742, 0, 1]);
    this.world.addLamps(spots, 9);
  }

  // Gelände im Norden mit eingeschnittener Bergstraße, Leitplanken, Wald und Gipfelplateau
  buildMountain() {
    const s = this.scene, r = this.world.rng;
    // --- Gelände (Raster 8 m)
    const X0 = -900, X1 = 900, Z0 = 492, Z1 = 1420, step = 8;
    const nx = Math.round((X1 - X0) / step), nz = Math.round((Z1 - Z0) / step);
    const geo = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, nx, nz).rotateX(-Math.PI / 2);
    geo.translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
    const pos = geo.attributes.position, colors = new Float32Array(pos.count * 3);
    const hgrid = new Float32Array(pos.count);
    const grass = new THREE.Color('#3d6a34'), grass2 = new THREE.Color('#5b7a3a'), rock = new THREE.Color('#6d655c'), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      let h = hills(x, z);
      if (z > 470) {
        const nr = nearestRoad(x, z);
        const k = THREE.MathUtils.smoothstep(nr.d, ROAD_W + 2.5, ROAD_W + 34);
        h = (nr.h - 0.25) * (1 - k) + h * k;           // Straße einschneiden bzw. Damm aufschütten
        if (nr.i >= MOUNTAIN.length - 4 && nr.d < 30) h = SUMMIT.y - 0.25;   // flaches Plateau
      }
      h -= 0.03;
      pos.setY(i, h);
      hgrid[i] = h;
      c.copy(grass).lerp(grass2, 0.5 + 0.5 * Math.sin(x * 0.05) * Math.cos(z * 0.04)).lerp(rock, THREE.MathUtils.smoothstep(h, 45, 85));
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
    terrain.receiveShadow = true;
    s.add(terrain);
    const terrainH = (x, z) => {                       // bilinear aus dem Raster
      const fx = (x - X0) / step, fz = (z - Z0) / step;
      const ix = Math.max(0, Math.min(nx - 1, Math.floor(fx))), iz = Math.max(0, Math.min(nz - 1, Math.floor(fz)));
      const tx = fx - ix, tz = fz - iz, row = nx + 1;
      const h00 = hgrid[iz * row + ix], h10 = hgrid[iz * row + ix + 1], h01 = hgrid[(iz + 1) * row + ix], h11 = hgrid[(iz + 1) * row + ix + 1];
      return (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz;
    };

    // --- Straßenband
    const n = MOUNTAIN.length;
    const vp = new Float32Array(n * 2 * 3), uv = new Float32Array(n * 2 * 2), idx = [];
    const railL = [], railR = [];
    let dist = 0;
    for (let i = 0; i < n; i++) {
      const p = MOUNTAIN[i], a = MOUNTAIN[Math.max(0, i - 1)], b = MOUNTAIN[Math.min(n - 1, i + 1)];
      let tx = b.x - a.x, tz = b.z - a.z;
      const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
      const sx = -tz, sz = tx;                           // Seitenrichtung
      if (i > 0) dist += MOUNTAIN[i].distanceTo(MOUNTAIN[i - 1]);
      vp.set([p.x + sx * ROAD_W, p.y + 0.03, p.z + sz * ROAD_W, p.x - sx * ROAD_W, p.y + 0.03, p.z - sz * ROAD_W], i * 6);
      uv.set([0, dist / 16, 1, dist / 16], i * 4);
      if (i < n - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      railL.push([p.x + sx * (ROAD_W + 0.4), p.y, p.z + sz * (ROAD_W + 0.4)]);
      railR.push([p.x - sx * (ROAD_W + 0.4), p.y, p.z - sz * (ROAD_W + 0.4)]);
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(vp, 3));
    rg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    rg.setIndex(idx);
    rg.computeVertexNormals();
    const roadMat = new THREE.MeshStandardMaterial({ map: mountainRoadTexture(), roughness: 0.8, side: THREE.DoubleSide });
    this.world.wetMats.push({ m: roadMat, r: 0.8 });
    const road = new THREE.Mesh(rg, roadMat);
    road.receiveShadow = true;
    s.add(road);

    // Leitplanken als Bänder (nicht am Plateau)
    const railMat = new THREE.MeshStandardMaterial({ color: '#c3c7cd', metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide });
    const ribbon = pts => {
      const m = pts.length - 6, v = new Float32Array(m * 2 * 3), ix = [];
      for (let i = 0; i < m; i++) {
        const [x, y, z] = pts[i];
        v.set([x, y + 0.35, z, x, y + 0.85, z], i * 6);
        if (i < m - 1) ix.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(v, 3));
      g.setIndex(ix);
      g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, railMat);
      mesh.castShadow = true;
      s.add(mesh);
    };
    ribbon(railL.slice(10)); ribbon(railR.slice(10));
    // Pfosten
    const posts = railL.slice(10, -6).concat(railR.slice(10, -6)).filter((_, k) => k % 2 === 0);
    const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.9, 0.14).translate(0, 0.45, 0), railMat, posts.length);
    const d = new THREE.Object3D();
    posts.forEach(([x, y, z], k) => { d.position.set(x, y, z); d.updateMatrix(); pm.setMatrixAt(k, d.matrix); });
    s.add(pm);

    // Gipfelplateau mit Aussichtsgeländer und Laternen
    const plat = new THREE.Mesh(new THREE.CircleGeometry(26, 40).rotateX(-Math.PI / 2), roadMat);
    plat.position.set(SUMMIT.x, SUMMIT.y + 0.02, SUMMIT.z);
    plat.receiveShadow = true;
    s.add(plat);
    const lamps = [];
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; lamps.push([SUMMIT.x + Math.cos(a) * 24, SUMMIT.z + Math.sin(a) * 24, -Math.cos(a), -Math.sin(a)]); }
    this.world.addLamps(lamps, 8, SUMMIT.y);

    // Nadelwald abseits der Straße
    const trees = [];
    for (let k = 0; k < 2600 && trees.length < 700; k++) {
      const x = X0 + 40 + r() * (X1 - X0 - 80), z = Z0 + 40 + r() * (Z1 - Z0 - 80);
      const h = terrainH(x, z);
      if (h < 2) continue;
      if (nearestRoad(x, z).d < ROAD_W + 6) continue;
      trees.push([x, h, z, 0.8 + r() * 0.8]);
    }
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.35, 2.4, 5).translate(0, 1.2, 0), new THREE.MeshStandardMaterial({ color: '#4a3424', roughness: 1 }), trees.length);
    const crown = new THREE.InstancedMesh(new THREE.ConeGeometry(2.4, 7, 7).translate(0, 5.5, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true }), trees.length);
    const col = new THREE.Color();
    trees.forEach(([x, y, z, sc], k) => {
      d.position.set(x, y - 0.2, z); d.scale.setScalar(sc); d.rotation.set(0, r() * 6, 0); d.updateMatrix();
      trunk.setMatrixAt(k, d.matrix); crown.setMatrixAt(k, d.matrix);
      crown.setColorAt(k, col.setHSL(0.3 + r() * 0.05, 0.4, 0.17 + r() * 0.08));
    });
    crown.castShadow = true;
    s.add(trunk, crown);
  }

  // Blinklichter und Wellen
  update(t) {
    this.warnMat.color.setRGB(Math.sin(t * 3) > 0 ? 4 : 0.3, 0.1, 0.1);
  }

  // Höhe der Fahrbahn (nur auf der Bergstraße ≠ 0)
  heightAt(x, z) {
    if (z < 470 || Math.abs(x) > 700) return 0;
    const dx = x - SUMMIT.x, dz = z - SUMMIT.z;
    if (dx * dx + dz * dz < 27 * 27) return SUMMIT.y;
    const nr = nearestRoad(x, z);
    return nr.d < ROAD_W + 4 ? nr.h : 0;
  }

  // Kreis gegen Hindernisse und befahrbare Bereiche. Gibt Normale + Tiefe zurück oder null.
  collide(x, z, rad) {
    // Hindernisse im Hafen
    if (z < HARBOR.z1 + 10) {
      for (const o of this.obstacles) {
        const px = Math.max(o.x0, Math.min(x, o.x1)), pz = Math.max(o.z0, Math.min(z, o.z1));
        const dx = x - px, dz = z - pz, d2 = dx * dx + dz * dz;
        if (d2 < rad * rad) {
          if (d2 > 1e-6) { const d = Math.sqrt(d2); return { nx: dx / d, nz: dz / d, depth: rad - d }; }
          const opts = [[x - o.x0, -1, 0], [o.x1 - x, 1, 0], [z - o.z0, 0, -1], [o.z1 - z, 0, 1]].sort((a, b) => a[0] - b[0]);
          return { nx: opts[0][1], nz: opts[0][2], depth: opts[0][0] + rad };
        }
      }
    }
    // befahrbare Bereiche: Punkt muss (mit Radius) in mindestens einem liegen
    let best = Infinity, bx = x, bz = z;
    for (const r of this.rects) {
      const px = Math.max(r.x0 + rad, Math.min(x, r.x1 - rad)), pz = Math.max(r.z0 + rad, Math.min(z, r.z1 - rad));
      const d2 = (x - px) * (x - px) + (z - pz) * (z - pz);
      if (d2 === 0) return null;
      if (d2 < best) { best = d2; bx = px; bz = pz; }
    }
    if (z > 440) {
      // Bergstraße als Kette von Kapseln + rundes Plateau
      const lim = ROAD_W - rad;
      for (let i = 0; i < MOUNTAIN.length - 1; i++) {
        const a = MOUNTAIN[i], b = MOUNTAIN[i + 1];
        const dx = b.x - a.x, dz = b.z - a.z;
        let t = ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz);
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const cx = a.x + dx * t, cz = a.z + dz * t, ex = x - cx, ez = z - cz, d = Math.hypot(ex, ez);
        if (d <= lim) return null;
        const over = (d - lim) * (d - lim);
        if (over < best) { best = over; bx = cx + ex / d * lim; bz = cz + ez / d * lim; }
      }
      const ex = x - SUMMIT.x, ez = z - SUMMIT.z, d = Math.hypot(ex, ez), plim = 25 - rad;
      if (d <= plim) return null;
      if ((d - plim) * (d - plim) < best) { best = (d - plim) * (d - plim); bx = SUMMIT.x + ex / d * plim; bz = SUMMIT.z + ez / d * plim; }
    }
    const d = Math.sqrt(best);
    return { nx: (bx - x) / d, nz: (bz - z) / d, depth: d };
  }
}
