// Turbofieber – Sportwagen (im Code modelliert) und Arcade-Fahrphysik mit Drift und Nitro.
import * as THREE from 'three';
import { softCircle } from './world.js';

// Seitenprofil (z = Länge, y = Höhe) mit Radausschnitten → wird zur Karosserie extrudiert
function bodyShape() {
  const s = new THREE.Shape();
  const R = 0.5, wy = 0.38;
  s.moveTo(-2.2, 0.32);
  s.lineTo(-1.36 - R, 0.32);
  s.absarc(-1.36, wy, R, Math.PI, 0, true);
  s.lineTo(1.36 - R, 0.32);
  s.absarc(1.36, wy, R, Math.PI, 0, true);
  s.lineTo(2.22, 0.32);
  s.quadraticCurveTo(2.36, 0.4, 2.3, 0.56);       // Frontlippe
  s.quadraticCurveTo(2.15, 0.72, 1.7, 0.8);       // Haubenansatz
  s.lineTo(0.95, 0.9);
  s.lineTo(-1.15, 0.95);
  s.quadraticCurveTo(-2.05, 0.95, -2.2, 0.86);    // Heckdeckel
  s.quadraticCurveTo(-2.34, 0.62, -2.2, 0.32);
  return s;
}
function cabinShape() {
  const s = new THREE.Shape();
  s.moveTo(-1.15, 0.9);
  s.quadraticCurveTo(-0.75, 1.3, -0.35, 1.34);
  s.lineTo(0.35, 1.34);
  s.quadraticCurveTo(0.7, 1.28, 1.0, 0.88);
  s.lineTo(-1.15, 0.9);
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

export function buildCar(paint = '#e0262f') {
  const car = new THREE.Group();
  const body = new THREE.Group();          // kippt bei Kurven/Bremsen
  car.add(body);

  const paintMat = new THREE.MeshPhysicalMaterial({ color: paint, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.04 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: '#0b0f16', metalness: 0.3, roughness: 0.05, clearcoat: 1 });
  const blackMat = new THREE.MeshStandardMaterial({ color: '#101114', roughness: 0.55, metalness: 0.3 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: '#d8dce2', metalness: 1, roughness: 0.18 });
  const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#dff4ff'), toneMapped: false });
  const tailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff1830'), toneMapped: false });

  const shell = new THREE.Mesh(extrudeSide(bodyShape(), 1.78, 0.1), paintMat);
  shell.castShadow = true;
  body.add(shell);
  const cabin = new THREE.Mesh(extrudeSide(cabinShape(), 1.42, 0.08), glassMat);
  cabin.castShadow = true;
  body.add(cabin);

  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); body.add(m); return m; };
  box(1.5, 0.16, 0.08, blackMat, 0, 0.44, 2.36);                       // Lufteinlass vorn
  box(0.42, 0.07, 0.1, headMat, 0.62, 0.66, 2.24).rotation.x = -0.4;  // Scheinwerfer
  box(0.42, 0.07, 0.1, headMat, -0.62, 0.66, 2.24).rotation.x = -0.4;
  box(1.62, 0.07, 0.06, tailMat, 0, 0.8, -2.3);                        // Rücklicht-Band
  box(1.9, 0.12, 4.0, blackMat, 0, 0.3, 0);                            // Seitenschweller
  box(1.5, 0.12, 0.12, blackMat, 0, 0.42, -2.32);                      // Diffusor
  // Heckflügel
  box(0.06, 0.24, 0.12, blackMat, 0.6, 1.04, -1.95);
  box(0.06, 0.24, 0.12, blackMat, -0.6, 1.04, -1.95);
  const wing = box(1.86, 0.05, 0.38, paintMat, 0, 1.17, -2.0);
  wing.rotation.x = 0.08; wing.castShadow = true;
  // Außenspiegel
  box(0.2, 0.1, 0.16, paintMat, 0.95, 1.02, 0.72);
  box(0.2, 0.1, 0.16, paintMat, -0.95, 1.02, 0.72);
  // Auspuffrohre
  for (const x of [-0.42, 0.42]) {
    const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 10).rotateX(Math.PI / 2), chromeMat);
    ex.position.set(x, 0.38, -2.36);
    body.add(ex);
  }

  // Räder: Reifen + Felge mit 5 Speichen
  const tireGeo = new THREE.CylinderGeometry(0.37, 0.37, 0.3, 22).rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.31, 18).rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: '#2a2c30', metalness: 0.9, roughness: 0.3 });
  const wheels = [];
  for (const [x, z] of [[0.9, 1.36], [-0.9, 1.36], [0.9, -1.36], [-0.9, -1.36]]) {
    const pivot = new THREE.Group();          // lenkt (vorne)
    pivot.position.set(x, 0.37, z);
    const spin = new THREE.Group();           // dreht sich
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;
    spin.add(tire, new THREE.Mesh(rimGeo, rimMat));
    for (let k = 0; k < 5; k++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.07), chromeMat);
      sp.position.x = Math.sign(x) * 0.16;
      sp.rotation.x = k * Math.PI * 2 / 5;
      spin.add(sp);
    }
    pivot.add(spin);
    car.add(pivot);
    wheels.push({ pivot, spin, front: z > 0 });
  }

  // weicher Bodenschatten (wirkt auch ohne Schattenkarte)
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 5.2).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: softCircle(64), color: '#000000', transparent: true, opacity: 0.55, depthWrite: false }));
  blob.position.y = 0.04;
  car.add(blob);

  // Scheinwerfer-Licht (nachts)
  const head = new THREE.SpotLight('#e8f4ff', 0, 90, 0.5, 0.55, 1.6);
  head.position.set(0, 0.8, 2.0);
  head.target.position.set(0, 0, 14);
  car.add(head, head.target);

  // Nitro-Flammen
  const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#5ab8ff'), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const flames = [-0.42, 0.42].map(x => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.9, 10).rotateX(-Math.PI / 2).translate(0, 0, -0.45), flameMat);
    f.position.set(x, 0.38, -2.42);
    f.visible = false;
    body.add(f);
    return f;
  });

  car.userData = { body, wheels, paintMat, headMat, tailMat, head, flames };
  return car;
}

// Gänge: Höchstgeschwindigkeit je Gang in m/s
const GEARS = [0, 13, 24, 35, 46, 57, 90];

export class Car {
  constructor(scene, paint) {
    this.mesh = buildCar(paint);
    scene.add(this.mesh);
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
  }

  get speed() { return Math.hypot(this.vx, this.vz); }
  get forwardSpeed() { return this.vx * Math.sin(this.heading) + this.vz * Math.cos(this.heading); }

  place(x, z, heading) {
    this.pos.set(x, 0, z);
    this.heading = heading;
    this.vx = this.vz = this.yaw = 0;
  }

  update(dt, inp) {
    const sh = Math.sin(this.heading), ch = Math.cos(this.heading);
    // Geschwindigkeit in Fahrzeugkoordinaten: vF vorwärts, vR nach rechts (rechts = (−cos, sin))
    let vF = this.vx * sh + this.vz * ch;
    let vR = -this.vx * ch + this.vz * sh;
    const spd = Math.abs(vF);

    // Lenkung weich nachführen
    const target = inp.steer;
    const rate = target === 0 ? 6 : (Math.sign(target) !== Math.sign(this.steer) ? 9 : 4.5);
    this.steer += Math.max(-rate * dt, Math.min(rate * dt, target - this.steer));

    // Nitro
    this.nitroOn = inp.nitro && this.nitro > 0.01 && inp.gas && vF > 2;
    if (this.nitroOn) this.nitro = Math.max(0, this.nitro - dt * 0.28);
    else this.nitro = Math.min(1, this.nitro + dt * (0.015 + (this.drifting ? 0.16 : 0)));
    const vmax = this.nitroOn ? 82 : 64;

    // Antrieb / Bremse (wirken entlang der Fahrzeugnase)
    this.throttle = inp.gas ? 1 : 0;
    this.braking = inp.brake && vF > 0.5;
    if (inp.gas) {
      const k = Math.max(0, 1 - Math.max(0, vF) / vmax);
      vF += (8.5 * Math.pow(k, 0.6) + 1.2 * k + (this.nitroOn ? 8 : 0)) * dt;
    } else if (inp.brake) {
      if (vF > 0.5) vF -= 17 * dt;
      else vF = Math.max(-13, vF - 7 * dt);          // rückwärts
    } else {
      vF -= Math.sign(vF) * Math.min(Math.abs(vF), (1.6 + 0.0007 * vF * vF) * dt);   // ausrollen
    }
    if (vF > vmax) vF -= (vF - vmax) * 2 * dt;
    if (inp.drift) vF -= Math.sign(vF) * Math.min(Math.abs(vF), 2.5 * dt);           // Handbremse
    this.vx = vF * sh - vR * ch;
    this.vz = vF * ch + vR * sh;

    // Drift starten / beenden
    const slipAng = spd > 3 ? Math.abs(Math.atan2(vR, Math.abs(vF))) : 0;
    if (inp.drift && spd > 10 && this.steer !== 0) this.drifting = true;
    if (this.drifting && !inp.drift && (slipAng < 0.1 || spd < 6)) this.drifting = false;

    // Gierrate: Einspurmodell, begrenzt durch die Reifenhaftung (Querbeschleunigung)
    const maxA = 0.62 / (1 + spd / 30);
    let yawT = -vF * Math.tan(this.steer * maxA) / 2.6;
    const gripLimit = 17 / Math.max(spd, 1);
    yawT = Math.max(-gripLimit, Math.min(gripLimit, yawT));
    if (this.drifting) yawT = -this.steer * 1.75 * Math.min(1, spd / 14) + yawT * 0.3;   // Heck schwenkt aus
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
      const rate = this.drifting ? (inp.drift ? 1.3 : 2.4) : 12;
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
    this.wheelRot += vF * dt / 0.37;
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
    m.rotation.y = this.heading;
    u.body.rotation.z = this.roll;
    u.body.rotation.x = this.pitch;
    for (const w of u.wheels) {
      w.spin.rotation.x = this.wheelRot;
      if (w.front) w.pivot.rotation.y = -this.steer * 0.45;
    }
    u.tailMat.color.set('#ff1830').multiplyScalar(this.braking ? 4 : 1.2 + night);
    u.headMat.color.set('#dff4ff').multiplyScalar(1 + night * 2.5);
    u.head.intensity = night * 1800;
    const fl = this.nitroOn;
    for (const f of u.flames) {
      f.visible = fl;
      if (fl) f.scale.set(1, 1, 0.7 + Math.random() * 0.8);
    }
  }
}
