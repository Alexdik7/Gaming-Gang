// Turbofieber – Autos (im Code modelliert, frei tunebar) und Arcade-Fahrphysik mit Drift und Nitro.
import * as THREE from 'three';
import { softCircle } from './world.js';
import { MODELS, statsFor, defaultCfg, defaultPerf } from './cars.js';

// Lackarten → Materialwerte
const FINISH = {
  glanz: { metalness: 0.1, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03 },
  metallic: { metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.04 },
  matt: { metalness: 0.15, roughness: 0.62, clearcoat: 0, clearcoatRoughness: 0.5 },
  perl: { metalness: 0.4, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 0.8, iridescenceIOR: 1.6 },
  chrom: { metalness: 1, roughness: 0.07, clearcoat: 1, clearcoatRoughness: 0.02 }
};
const BEVEL = 0.1;

// Seitenprofil mit Radausschnitten → wird zur Karosserie extrudiert
function bodyShape(m) {
  const s = new THREE.Shape(), R = m.wheelR + 0.13, wy = m.wheelR + 0.01, y0 = 0.32;
  s.moveTo(m.rear, y0);
  s.lineTo(-m.wheelZ - R, y0);
  s.absarc(-m.wheelZ, wy, R, Math.PI, 0, true);
  s.lineTo(m.wheelZ - R, y0);
  s.absarc(m.wheelZ, wy, R, Math.PI, 0, true);
  s.lineTo(m.front, y0);
  for (const [z, y] of m.top) s.lineTo(z, y);
  return s;
}
function polyShape(pts) {
  const s = new THREE.Shape();
  pts.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y)));
  return s;
}
// Profil um +90° drehen: Form-x → Auto-z, Extrusion → Auto-x, zentriert
function extrudeSide(shape, width, bevel) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 14 });
  g.rotateY(-Math.PI / 2);
  g.translate(width / 2, 0, 0);
  g.computeVertexNormals();
  return g;
}

// Rennstreifen: Alpha-Textur entlang der Breite (UV v = 1 − Extrusionstiefe)
function stripeTexture(width) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 4, 256);
  const span = width + 2 * BEVEL;
  g.fillStyle = '#fff';
  for (const o of [-0.15, 0.15]) {
    const t0 = (width / 2 + BEVEL + o - 0.08) / span, t1 = (width / 2 + BEVEL + o + 0.08) / span;
    g.fillRect(0, (1 - t1) * 256, 4, (t1 - t0) * 256);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  const vmin = 1 - width - BEVEL;
  t.repeat.set(1, 1 / span);
  t.offset.set(0, -vmin / span);
  return t;
}

// Felgen in fünf Designs
function buildRim(design, r, side, rimMat, chromeMat, darkMat) {
  const g = new THREE.Group(), x = side * 0.16, rr = r * 0.68;
  const spoke = (w, len, rot, mat = rimMat, tilt = 0) => {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.05, len, w), mat);
    sp.position.x = x; sp.rotation.x = rot; sp.rotation.y = tilt;
    g.add(sp);
  };
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, 0.31, 20).rotateZ(Math.PI / 2), design === 'mono' ? rimMat : darkMat));
  if (design === 'speichen5') for (let k = 0; k < 5; k++) spoke(0.08, rr * 2 * 0.95, k * Math.PI * 2 / 5);
  else if (design === 'mesh') for (let k = 0; k < 10; k++) spoke(0.035, rr * 2 * 0.95, k * Math.PI / 10);
  else if (design === 'turbine') for (let k = 0; k < 8; k++) spoke(0.11, rr * 0.95, k * Math.PI * 2 / 8, rimMat, 0.5);
  else if (design === 'tiefbett') {
    const lip = new THREE.Mesh(new THREE.TorusGeometry(rr * 0.95, 0.03, 6, 24).rotateY(Math.PI / 2), chromeMat);
    lip.position.x = x + side * 0.01;
    g.add(lip);
    for (let k = 0; k < 6; k++) spoke(0.05, rr * 2 * 0.8, k * Math.PI / 6);
  } else if (design === 'mono') {
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI * 2 / 6, hole = new THREE.Mesh(new THREE.CylinderGeometry(rr * 0.2, rr * 0.2, 0.02, 10).rotateZ(Math.PI / 2), darkMat);
      hole.position.set(x + side * 0.005, Math.cos(a) * rr * 0.58, Math.sin(a) * rr * 0.58);
      g.add(hole);
    }
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.33, 10).rotateZ(Math.PI / 2), chromeMat);
  g.add(hub);
  return g;
}

export function buildCar(carId = 'kestrel', cfg = defaultCfg()) {
  const m = MODELS[carId];
  const car = new THREE.Group();
  const body = new THREE.Group();          // kippt bei Kurven/Bremsen
  body.position.y = -0.03 * cfg.lower;
  car.add(body);

  const paintMat = new THREE.MeshPhysicalMaterial(Object.assign({ color: cfg.paint }, FINISH[cfg.finish] || FINISH.metallic));
  const tintCol = ['#3a4550', '#151b24', '#0b0f16', '#030405'][cfg.tint] || '#0b0f16';
  const glassMat = new THREE.MeshPhysicalMaterial({ color: tintCol, metalness: 0.3, roughness: 0.05, clearcoat: 1 });
  const blackMat = new THREE.MeshStandardMaterial({ color: '#101114', roughness: 0.55, metalness: 0.3 });
  const carbonMat = new THREE.MeshStandardMaterial({ color: '#1a1c20', roughness: 0.35, metalness: 0.5 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: '#d8dce2', metalness: 1, roughness: 0.18 });
  const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#dff4ff'), toneMapped: false });
  const tailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff1830'), toneMapped: false });

  const bodyGeo = extrudeSide(bodyShape(m), m.width, BEVEL);
  const shell = new THREE.Mesh(bodyGeo, paintMat);
  shell.castShadow = true;
  body.add(shell);
  if (cfg.stripes && cfg.stripes !== 'off') {
    const stripe = new THREE.Mesh(bodyGeo, new THREE.MeshPhysicalMaterial({
      color: cfg.stripes, alphaMap: stripeTexture(m.width), transparent: true, depthWrite: false,
      roughness: 0.3, clearcoat: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
    }));
    body.add(stripe);
  }
  const cabin = new THREE.Mesh(extrudeSide(polyShape(m.cabin), m.cabinW, 0.08), glassMat);
  cabin.castShadow = true;
  body.add(cabin);

  const box = (w, h, d, mat, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(x, y, z); body.add(b); return b; };
  const W = m.width, F = m.front + 0.1, Rr = m.rear - 0.1;
  box(W * 0.84, 0.16, 0.08, blackMat, 0, 0.44, F + 0.04);                    // Lufteinlass vorn
  box(0.42, 0.07, 0.1, headMat, W * 0.35, m.headY, F - 0.02).rotation.x = -0.4;   // Scheinwerfer
  box(0.42, 0.07, 0.1, headMat, -W * 0.35, m.headY, F - 0.02).rotation.x = -0.4;
  box(W * 0.9, 0.07, 0.06, tailMat, 0, m.tailY, Rr - 0.02);                   // Rücklicht-Band
  box(W + 0.12, 0.12, (m.front - m.rear) * 0.9, blackMat, 0, 0.3, (m.front + m.rear) / 2);   // Seitenschweller
  box(W * 0.84, 0.12, 0.12, blackMat, 0, 0.42, Rr - 0.04);                   // Diffusor
  // Außenspiegel
  const mz = m.cabin[m.cabin.length - 1][0] - 0.3;
  box(0.2, 0.1, 0.16, paintMat, W / 2 + 0.06, m.hoodY + 0.16, mz);
  box(0.2, 0.1, 0.16, paintMat, -W / 2 - 0.06, m.hoodY + 0.16, mz);
  // Bodykit
  if (cfg.kit >= 1) {
    box(W + 0.1, 0.05, 0.5, carbonMat, 0, 0.27, F - 0.1);                   // Frontsplitter
    box(W + 0.22, 0.08, (m.front - m.rear) * 0.7, carbonMat, 0, 0.24, (m.front + m.rear) / 2);
    for (const x of [-0.45, 0, 0.45]) box(0.04, 0.2, 0.4, carbonMat, x, 0.36, Rr + 0.05);   // Diffusor-Finnen
  }
  if (cfg.kit >= 2) {                                                          // Kotflügelverbreiterung
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const fl = box(0.14, 0.24, m.wheelR * 2.6, paintMat, sx * (W / 2 + 0.07), m.wheelR * 1.35, sz * m.wheelZ);
      fl.castShadow = true;
    }
  }
  // Spoiler
  const dz = m.deckZ, dy = m.deckY;
  if (cfg.spoiler === 'gt' || cfg.spoiler === 'big') {
    const big = cfg.spoiler === 'big', ph = big ? 0.46 : 0.24;
    for (const sx of [-1, 1]) box(0.06, ph, 0.12, blackMat, sx * 0.6, dy + ph / 2 - 0.03, dz);
    const wing = box(big ? W + 0.12 : W * 1.04, 0.05, big ? 0.46 : 0.38, big ? carbonMat : paintMat, 0, dy + ph - 0.01, dz - 0.05);
    wing.rotation.x = big ? 0.14 : 0.08;
    wing.castShadow = true;
    if (big) for (const sx of [-1, 1]) box(0.04, 0.24, 0.5, carbonMat, sx * (W / 2 + 0.06), dy + ph - 0.04, dz - 0.05);
  } else if (cfg.spoiler === 'lip') {
    box(W * 0.92, 0.04, 0.22, paintMat, 0, dy + 0.03, m.rear + 0.2).rotation.x = -0.35;
  }
  // Auspuffrohre
  for (const x of [-0.42, 0.42]) {
    const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 10).rotateX(Math.PI / 2), chromeMat);
    ex.position.set(x, 0.38, Rr - 0.06);
    body.add(ex);
  }

  // Räder
  const r = m.wheelR, wx = m.wheelX + (cfg.kit >= 2 ? 0.08 : 0);
  const tireGeo = new THREE.CylinderGeometry(r, r, 0.3, 22).rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: cfg.rimColor, metalness: 0.9, roughness: 0.25 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#0d0e10', metalness: 0.5, roughness: 0.5 });
  const wheels = [];
  for (const [x, z] of [[wx, m.wheelZ], [-wx, m.wheelZ], [wx, -m.wheelZ], [-wx, -m.wheelZ]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, r, z);
    const spin = new THREE.Group();
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;
    spin.add(tire, buildRim(cfg.rims, r, Math.sign(x), rimMat, chromeMat, darkMat));
    pivot.add(spin);
    car.add(pivot);
    wheels.push({ pivot, spin, front: z > 0 });
  }

  // weicher Bodenschatten
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.8, (m.front - m.rear) + 0.8).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: softCircle(64), color: '#000000', transparent: true, opacity: 0.55, depthWrite: false }));
  blob.position.y = 0.04;
  car.add(blob);
  // Unterbodenbeleuchtung
  let glowMat = null;
  if (cfg.glow && cfg.glow !== 'off') {
    glowMat = new THREE.MeshBasicMaterial({ map: softCircle(64), color: new THREE.Color(cfg.glow).multiplyScalar(2.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(W + 2.4, (m.front - m.rear) + 2.6).rotateX(-Math.PI / 2), glowMat);
    glow.position.y = 0.06;
    car.add(glow);
  }

  // Scheinwerfer-Licht (nachts)
  const head = new THREE.SpotLight('#e8f4ff', 0, 90, 0.5, 0.55, 1.6);
  head.position.set(0, 0.8, m.front - 0.2);
  head.target.position.set(0, 0, 14);
  car.add(head, head.target);

  // Nitro-Flammen
  const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#5ab8ff'), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const flames = [-0.42, 0.42].map(x => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.9, 10).rotateX(-Math.PI / 2).translate(0, 0, -0.45), flameMat);
    f.position.set(x, 0.38, Rr - 0.12);
    f.visible = false;
    body.add(f);
    return f;
  });

  car.userData = { body, wheels, paintMat, headMat, tailMat, head, flames, glowMat, wheelR: r };
  return car;
}

// Alles freigeben, was ein Auto belegt (beim Umbauen)
export function disposeTree(obj) {
  obj.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      for (const mt of [].concat(o.material)) {
        for (const k of ['map', 'alphaMap']) if (mt[k]) mt[k].dispose();
        mt.dispose();
      }
    }
  });
}

// Gänge: Höchstgeschwindigkeit je Gang in m/s
const GEARS = [0, 13, 24, 35, 46, 57, 90];

export class Car {
  constructor(scene, carId = 'kestrel', cfg = defaultCfg(), perf = defaultPerf()) {
    this.scene = scene;
    this.setConfig(carId, cfg, perf);
    this.pos = new THREE.Vector3();
    this.heading = 0;           // 0 = Blick nach +z
    this.vx = 0; this.vz = 0;   // Weltgeschwindigkeit
    this.yaw = 0;               // Drehrate
    this.steer = 0;             // geglättete Lenkung −1 … 1 (+ = rechts)
    this.nitro = 1;             // Tank 0 … 1
    this.nitroOn = false;
    this.drifting = false;
    this.slip = 0;              // Querschlupf (für Rauch, Spuren, Ton)
    this.gear = 1;
    this.rpm = 900;
    this.throttle = 0;
    this.braking = false;
    this.wheelRot = 0;
    this.roll = 0; this.pitch = 0;
    this.prevSpeed = 0;
    this.grade = 0;             // Steigung (Höhe pro Meter, + = bergauf)
    this.grip = 1;              // Haftung (Regen < 1)
  }

  // Modell, Optik und Upgrades übernehmen (baut das Modell neu)
  setConfig(carId, cfg, perf) {
    if (this.mesh) { this.scene.remove(this.mesh); disposeTree(this.mesh); }
    this.carId = carId;
    this.cfg = cfg;
    this.perfLv = perf;
    this.mesh = buildCar(carId, cfg);
    this.scene.add(this.mesh);
    this.st = statsFor(carId, perf);
  }

  // Auto aus der Szene nehmen und Speicher freigeben
  dispose() { this.scene.remove(this.mesh); disposeTree(this.mesh); }

  get speed() { return Math.hypot(this.vx, this.vz); }
  get forwardSpeed() { return this.vx * Math.sin(this.heading) + this.vz * Math.cos(this.heading); }

  place(x, z, heading) {
    this.pos.set(x, 0, z);
    this.heading = heading;
    this.vx = this.vz = this.yaw = 0;
  }

  update(dt, inp) {
    const st = this.st;
    const sh = Math.sin(this.heading), ch = Math.cos(this.heading);
    // Geschwindigkeit in Fahrzeugkoordinaten: vF vorwärts, vR nach rechts (rechts = (−cos, sin))
    let vF = this.vx * sh + this.vz * ch;
    let vR = -this.vx * ch + this.vz * sh;
    const spd = Math.abs(vF);

    // Lenkung weich nachführen
    const target = inp.steer;
    const rate = (target === 0 ? 6 : (Math.sign(target) !== Math.sign(this.steer) ? 9 : 4.5)) * st.steer;
    this.steer += Math.max(-rate * dt, Math.min(rate * dt, target - this.steer));

    // Nitro
    this.nitroOn = inp.nitro && this.nitro > 0.01 && inp.gas && vF > 2;
    if (this.nitroOn) this.nitro = Math.max(0, this.nitro - dt * st.nitroDrain);
    else this.nitro = Math.min(1, this.nitro + dt * (0.015 + (this.drifting ? 0.16 : 0)) * st.nitroRegen);
    const vmax = this.nitroOn ? st.vmax + 18 : st.vmax;

    // Antrieb / Bremse (wirken entlang der Fahrzeugnase)
    this.throttle = inp.gas ? 1 : 0;
    this.braking = inp.brake && vF > 0.5;
    if (inp.gas) {
      const k = Math.max(0, 1 - Math.max(0, vF) / vmax);
      vF += ((8.5 * Math.pow(k, 0.6) + 1.2 * k) * st.accel + (this.nitroOn ? st.nitroPow : 0)) * dt;
    } else if (inp.brake) {
      if (vF > 0.5) vF -= 17 * dt;
      else vF = Math.max(-13, vF - 7 * dt);          // rückwärts
    } else {
      vF -= Math.sign(vF) * Math.min(Math.abs(vF), (1.6 + 0.0007 * vF * vF) * dt);   // ausrollen
    }
    if (vF > vmax) vF -= (vF - vmax) * 2 * dt;
    vF -= 9.81 * this.grade * dt;                     // Hangabtrieb
    if (inp.drift) vF -= Math.sign(vF) * Math.min(Math.abs(vF), 2.5 * dt);           // Handbremse
    this.vx = vF * sh - vR * ch;
    this.vz = vF * ch + vR * sh;

    // Drift starten / beenden
    const slipAng = spd > 3 ? Math.abs(Math.atan2(vR, Math.abs(vF))) : 0;
    if (inp.drift && spd > 10 && this.steer !== 0) this.drifting = true;
    if (this.drifting && !inp.drift && (slipAng < 0.1 || spd < 6)) this.drifting = false;

    // Gierrate: Einspurmodell, begrenzt durch die Reifenhaftung (Querbeschleunigung)
    const maxA = 0.62 * (0.85 + 0.15 * st.steer) / (1 + spd / 30);
    let yawT = -vF * Math.tan(this.steer * maxA) / 2.6;
    const gripLimit = st.grip * this.grip / Math.max(spd, 1);
    yawT = Math.max(-gripLimit, Math.min(gripLimit, yawT));
    if (this.drifting) yawT = -this.steer * 1.75 * Math.sqrt(st.drift) * Math.min(1, spd / 14) + yawT * 0.3;   // Heck schwenkt aus
    this.yaw += (yawT - this.yaw) * Math.min(1, dt * (this.drifting ? 5 : 10));
    this.heading += this.yaw * dt;
    // Driftwinkel begrenzen (≈ 60°), damit das Auto kontrollierbar bleibt
    if (this.drifting && spd > 3) {
      const phiV = Math.atan2(this.vx, this.vz);
      const d = Math.atan2(Math.sin(this.heading - phiV), Math.cos(this.heading - phiV));
      if (Math.abs(d) > 1.05) { this.heading = phiV + Math.sign(d) * 1.05; this.yaw *= 0.5; }
    }

    // Fahrtrichtung zieht zur Nase: normal schnell (Haftung), im Drift langsam (Rutschen).
    // Der Betrag bleibt erhalten → Drifts kosten kaum Tempo.
    const sp = Math.hypot(this.vx, this.vz);
    if (sp > 0.05) {
      let phi = Math.atan2(this.vx, this.vz);
      const back = !this.drifting && vF < -0.5;
      const target = back ? this.heading + Math.PI : this.heading;
      const diff = Math.atan2(Math.sin(target - phi), Math.cos(target - phi));
      const rate = this.drifting ? (inp.drift ? 1.3 : 2.4) / st.drift : 12 * this.grip;
      phi += diff * (1 - Math.exp(-rate * dt));
      let mag = sp;
      if (this.drifting) mag *= 1 - 0.18 * dt;                  // etwas Reibung im Drift
      else mag *= 1 - Math.min(0.5, Math.abs(diff)) * 0.6 * dt; // leichtes Radieren in engen Kurven
      this.vx = Math.sin(phi) * mag;
      this.vz = Math.cos(phi) * mag;
    }
    const sh2 = Math.sin(this.heading), ch2 = Math.cos(this.heading);
    vF = this.vx * sh2 + this.vz * ch2;
    vR = -this.vx * ch2 + this.vz * sh2;
    this.slip = Math.abs(vR);
    this.pos.x += this.vx * dt;
    this.pos.z += this.vz * dt;

    // Getriebe und Drehzahl
    const s = Math.max(0, vF);
    let g = 1;
    while (g < 6 && s > GEARS[g] * 0.97) g++;
    if (g !== this.gear) { this.shifted = g > this.gear; this.gear = g; }
    const lo = g > 1 ? GEARS[g - 1] * 0.6 : 0;
    const rpmT = 1000 + 6600 * Math.min(1, (s - lo) / (GEARS[g] - lo)) * (inp.gas || s > 1 ? 1 : 0.2) + (this.drifting && inp.gas ? 900 : 0);
    this.rpm += (Math.min(8200, rpmT) - this.rpm) * Math.min(1, dt * 10);

    // Fahrwerks-Optik: Rollen und Nicken
    const accel = (vF - this.prevSpeed) / Math.max(dt, 1e-4);
    this.prevSpeed = vF;
    this.roll += ((this.yaw * spd * 0.004) - this.roll) * Math.min(1, dt * 6);
    this.pitch += (Math.max(-0.05, Math.min(0.05, -accel * 0.003)) - this.pitch) * Math.min(1, dt * 5);
    this.wheelRot += vF * dt / this.mesh.userData.wheelR;
  }

  // Aufprall auf eine Wand mit Normale n: Bewegung in die Wand abbauen, etwas abprallen
  bounce(nx, nz, depth) {
    this.pos.x += nx * depth;
    this.pos.z += nz * depth;
    const vn = this.vx * nx + this.vz * nz;
    if (vn < 0) {
      this.vx -= nx * vn * 1.35;
      this.vz -= nz * vn * 1.35;
      this.vx *= 0.82; this.vz *= 0.82;
      this.drifting = false;
      return -vn;
    }
    return 0;
  }

  syncMesh(night) {
    const m = this.mesh, u = m.userData;
    m.position.copy(this.pos);
    m.rotation.order = 'YXZ';
    m.rotation.y = this.heading;
    m.rotation.x = -Math.atan(this.grade);
    u.body.rotation.z = this.roll;
    u.body.rotation.x = this.pitch;
    for (const w of u.wheels) {
      w.spin.rotation.x = this.wheelRot;
      if (w.front) w.pivot.rotation.y = -this.steer * 0.45;
    }
    u.tailMat.color.set('#ff1830').multiplyScalar(this.braking ? 4 : 1.2 + night);
    u.headMat.color.set('#dff4ff').multiplyScalar(1 + night * 2.5);
    u.head.intensity = this.npc ? 0 : night * 1800;   // Rivalen ohne Lichtkegel (blenden sonst)
    const fl = this.nitroOn;
    for (const f of u.flames) {
      f.visible = fl;
      if (fl) f.scale.set(1, 1, 0.7 + Math.random() * 0.8);
    }
  }
}
