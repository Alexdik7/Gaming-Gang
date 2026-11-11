// Turbofieber – Verkehr: Stadtautos fahren von Kreuzung zu Kreuzung, Highway-Autos auf dem Ring.
// Alle Autos eines Typs sind EIN InstancedMesh (wenige Draw-Calls fürs iPhone).
import * as THREE from 'three';
import { roadCenter, N } from './world.js';
import { ringAt, RING_LEN } from './outskirts.js';

const LANE = 4;          // Abstand der Fahrspur zur Straßenmitte (Rechtsverkehr)

// --- Geometrie-Helfer: Teile einfärben und zu einer Geometrie zusammenführen
function paint(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
function merge(parts) {
  let n = 0;
  for (const g of parts) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    col.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}
function side(points, width, bevel) {      // Seitenprofil [z, y] → Karosserie
  const s = new THREE.Shape();
  points.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2 });
  g.rotateY(-Math.PI / 2);
  g.translate(width / 2, 0, 0);
  g.computeVertexNormals();
  return g;
}
const box = (w, h, d, x, y, z, rx = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); g.translate(x, y, z); return g; };
function wheels(halfX, z, r) {
  const out = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const g = new THREE.CylinderGeometry(r, r, 0.26, 14).rotateZ(Math.PI / 2);
    g.translate(sx * halfX, r, sz * z);
    out.push(paint(g, '#111111'));
  }
  return out;
}
// Weiß = Lackfläche (wird pro Auto eingefärbt), dunkle Teile bleiben dunkel
const GLASS = '#0b0e14', BLACK = '#151515';
function sedanGeo(taxi) {
  const parts = [
    paint(side([[-2.25, 0.3], [2.25, 0.3], [2.32, 0.62], [1.95, 0.84], [0.9, 0.93], [-1.5, 0.96], [-2.25, 0.86], [-2.32, 0.55]], 1.74, 0.06), '#ffffff'),
    paint(side([[-1.45, 0.9], [-0.9, 1.4], [0.45, 1.42], [1.0, 0.9]], 1.5, 0.05), GLASS),
    paint(box(1.6, 0.12, 0.1, 0, 0.42, 2.3), BLACK),
    ...wheels(0.82, 1.4, 0.34)
  ];
  if (taxi) parts.push(paint(box(0.6, 0.2, 0.28, 0, 1.55, -0.1), '#ffffff'));
  return merge(parts);
}
function vanGeo() {
  return merge([
    paint(side([[-2.5, 0.35], [2.5, 0.35], [2.58, 0.9], [2.3, 1.3], [1.95, 2.1], [-2.5, 2.18]], 1.9, 0.06), '#ffffff'),
    paint(box(1.7, 0.7, 0.08, 0, 1.68, 2.12, -0.5), GLASS),
    paint(box(1.98, 0.45, 1.3, 0, 1.75, 1.15), GLASS),
    paint(box(1.7, 0.14, 0.1, 0, 0.5, 2.6), BLACK),
    ...wheels(0.9, 1.65, 0.38)
  ]);
}

const TYPES = [
  { geo: () => sedanGeo(false), colors: ['#e8e8e8', '#b8bcc4', '#20232a', '#1d3f7a', '#8a1c24', '#4c5a52', '#c9b48a'], len: 2.3, light: [0.62, 0.62, 0.75] },
  { geo: vanGeo, colors: ['#f2f2f2', '#9aa1aa', '#2c4f8a', '#e2e2d8'], len: 2.55, light: [0.7, 0.75, 0.9] },
  { geo: () => sedanGeo(true), colors: ['#f5c518'], len: 2.3, light: [0.62, 0.62, 0.75] }
];

export class Traffic {
  constructor(scene, opts = {}) {
    this.cars = [];
    const cityN = opts.city ?? 28, ringN = opts.ring ?? 16, total = cityN + ringN;
    const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: 0.45, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.1 });
    this.meshes = TYPES.map(t => {
      const m = new THREE.InstancedMesh(t.geo(), mat, total);
      m.castShadow = true;
      m.count = 0;
      scene.add(m);
      return m;
    });
    this.headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff3d8'), toneMapped: false });
    this.tailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2030'), toneMapped: false });
    this.heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.12, 0.06), this.headMat, total * 2);
    this.tails = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.1, 0.06), this.tailMat, total * 2);
    scene.add(this.heads, this.tails);
    this.dummy = new THREE.Object3D();
    this.col = new THREE.Color();
    this.tmp = {};
    for (let i = 0; i < cityN; i++) this.spawnCity(i);
    for (let i = 0; i < ringN; i++) this.spawnRing(i, ringN);
  }

  addCar(kind) {
    const ti = kind === 'ring' ? (Math.random() < 0.75 ? 0 : 1) : (Math.random() < 0.6 ? 0 : Math.random() < 0.5 ? 1 : 2);
    const T = TYPES[ti], mesh = this.meshes[ti];
    const car = { kind, type: ti, slot: mesh.count++, x: 0, z: 0, heading: 0, speed: 0, cruise: 0, stun: 0, kx: 0, kz: 0, ox: 0, oz: 0 };
    mesh.setColorAt(car.slot, this.col.set(T.colors[Math.floor(Math.random() * T.colors.length)]));
    mesh.instanceColor.needsUpdate = true;
    this.cars.push(car);
    return car;
  }

  // ---- Stadt: Kreuzungen (a, b) mit a, b = 0 … N
  spawnCity(k) {
    const c = this.addCar('city');
    const a = Math.floor(Math.random() * (N + 1)), b = Math.floor(Math.random() * (N + 1));
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => this.inGrid(a + dx, b + dz));
    const [dx, dz] = dirs[Math.floor(Math.random() * dirs.length)];
    c.dir = [dx, dz];
    c.ti = [a + dx, b + dz];                    // Ziel-Kreuzung
    const t = 0.3 + Math.random() * 0.4;        // irgendwo auf dem Abschnitt
    const ax = roadCenter(a), az = roadCenter(b), bx = roadCenter(a + dx), bz = roadCenter(b + dz);
    c.x = ax + (bx - ax) * t - dz * LANE;       // rechts = (−dz, dx)
    c.z = az + (bz - az) * t + dx * LANE;
    c.heading = Math.atan2(dx, dz);
    c.cruise = 10 + Math.random() * 5;
    c.speed = c.cruise * 0.6;
    this.planCity(c);
  }
  inGrid(a, b) { return a >= 0 && b >= 0 && a <= N && b <= N; }
  // Wegpunkte bis zur nächsten Kreuzung festlegen; die Abbiegerichtung wird schon vorher gewählt
  planCity(c) {
    const [a, b] = c.ti, [dx, dz] = c.dir;
    const cx = roadCenter(a), cz = roadCenter(b);
    const opts = [[dx, dz], [dx, dz], [-dz, dx], [dz, -dx]].filter(([ex, ez]) => this.inGrid(a + ex, b + ez));
    c.next = opts.length ? opts[Math.floor(Math.random() * opts.length)] : [-dx, -dz];
    const [nx, nz] = c.next;
    c.wps = [
      [cx - dx * 13 - dz * LANE, cz - dz * 13 + dx * LANE],    // Einfahrt in die Kreuzung
      [cx + nx * 13 - nz * LANE, cz + nz * 13 + nx * LANE]     // Ausfahrt in neue Richtung
    ];
    c.turning = nx !== dx || nz !== dz;
  }

  // ---- Highway: Weg s auf dem Ring, Spur nach außen (positiv) oder innen
  spawnRing(i, n) {
    const c = this.addCar('ring');
    c.dirS = i % 2 ? 1 : -1;
    c.lane = (c.dirS > 0 ? -1 : 1) * (Math.random() < 0.5 ? 3.5 : 10.5);
    c.s = (i / n) * RING_LEN + Math.random() * 30;
    c.cruise = 22 + Math.random() * 9;
    c.speed = c.cruise;
  }

  // Freier Weg vor einem Auto (Meter) – berücksichtigt andere Autos und den Spieler
  gapAhead(me, player) {
    const fx = Math.sin(me.heading), fz = Math.cos(me.heading);
    let gap = 99;
    const test = (x, z) => {
      const rx = x - me.x, rz = z - me.z, ahead = rx * fx + rz * fz;
      if (ahead <= 0 || ahead > 30) return;
      if (Math.abs(rx * fz - rz * fx) < 2.4) gap = Math.min(gap, ahead);
    };
    for (const o of this.cars) if (o !== me) test(o.x, o.z);
    test(player.pos.x, player.pos.z);
    return gap;
  }

  // Angefahren: kurz stehen bleiben und wegrutschen
  knock(c, kx, kz) {
    c.stun = 1.6;
    c.kx += kx; c.kz += kz;
    c.speed = 0;
  }

  update(dt, player, night) {
    const tmp = this.tmp;
    for (const c of this.cars) {
      // Stoß abklingen lassen
      if (c.kx || c.kz) {
        c.ox += c.kx * dt; c.oz += c.kz * dt;
        const k = Math.exp(-3 * dt); c.kx *= k; c.kz *= k;
        if (Math.abs(c.kx) + Math.abs(c.kz) < 0.05) c.kx = c.kz = 0;
      }
      if (c.stun > 0) { c.stun -= dt; }
      const gap = this.gapAhead(c, player);
      let want = c.stun > 0 ? 0 : c.cruise;
      if (gap < 30) want = Math.min(want, Math.max(0, (gap - 7) * 1.1));

      if (c.kind === 'city') {
        const [tx, tz] = c.wps[0];
        const dx = tx - c.x, dz = tz - c.z, dist = Math.hypot(dx, dz);
        if (c.turning && c.wps.length === 2 && dist < 22) want = Math.min(want, 7);
        if (c.wps.length === 1) want = Math.min(want, c.turning ? 7 : want);
        const desired = Math.atan2(dx, dz);
        const diff = Math.atan2(Math.sin(desired - c.heading), Math.cos(desired - c.heading));
        const rate = 2.2 * Math.min(1, 0.4 + c.speed / 8);
        c.heading += Math.max(-rate * dt, Math.min(rate * dt, diff));
        c.speed += Math.max(-10 * dt, Math.min(4 * dt, want - c.speed));
        c.x += Math.sin(c.heading) * c.speed * dt;
        c.z += Math.cos(c.heading) * c.speed * dt;
        // Stoß wirkt direkt auf die Position, damit das Auto wieder zur Spur zurücklenkt
        if (c.ox || c.oz) { c.x += c.ox; c.z += c.oz; c.ox = c.oz = 0; }
        if (dist < 3) {
          c.wps.shift();
          if (!c.wps.length) {                        // Kreuzung verlassen → nächste planen
            c.dir = c.next;
            c.ti = [c.ti[0] + c.dir[0], c.ti[1] + c.dir[1]];
            this.planCity(c);
          }
        }
      } else {
        c.speed += Math.max(-12 * dt, Math.min(3 * dt, want - c.speed));
        c.s += c.dirS * c.speed * dt;
        ringAt(c.s, c.lane, tmp);
        c.ox *= Math.exp(-1.5 * dt); c.oz *= Math.exp(-1.5 * dt);   // Stoß klingt ab, Auto kehrt in die Spur
        c.x = tmp.x + c.ox; c.z = tmp.z + c.oz;
        c.heading = Math.atan2(tmp.tx * c.dirS, tmp.tz * c.dirS);
      }
    }
    this.draw(night);
  }

  draw(night) {
    const d = this.dummy;
    const lights = [0, 0];
    for (const c of this.cars) {
      const T = TYPES[c.type];
      d.position.set(c.x, 0, c.z);
      d.rotation.set(0, c.heading, 0);
      d.scale.set(1, 1, 1);
      d.updateMatrix();
      this.meshes[c.type].setMatrixAt(c.slot, d.matrix);
      const sh = Math.sin(c.heading), ch = Math.cos(c.heading);
      const [lx, ly, lyT] = T.light;
      for (const sx of [-1, 1]) {
        // vorn
        d.position.set(c.x + sh * (T.len + 0.02) + ch * sx * lx, ly, c.z + ch * (T.len + 0.02) - sh * sx * lx);
        d.updateMatrix();
        this.heads.setMatrixAt(lights[0]++, d.matrix);
        // hinten
        d.position.set(c.x - sh * (T.len + 0.02) + ch * sx * lx, lyT, c.z - ch * (T.len + 0.02) - sh * sx * lx);
        d.updateMatrix();
        this.tails.setMatrixAt(lights[1]++, d.matrix);
      }
    }
    for (const m of this.meshes) m.instanceMatrix.needsUpdate = true;
    this.heads.count = lights[0]; this.tails.count = lights[1];
    this.heads.instanceMatrix.needsUpdate = this.tails.instanceMatrix.needsUpdate = true;
    this.headMat.color.set('#fff3d8').multiplyScalar(0.6 + night * 2.6);
    this.tailMat.color.set('#ff2030').multiplyScalar(0.6 + night * 1.8);
  }
}
