// Prozedurale, stilisierte 3D-Modelle (Toon-Shading + Outline). Keine externen Assets nötig.
import * as THREE from '../vendor/three.module.min.js';

const grad = (() => {
  const d = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
const matCache = new Map();
export function toon(color, emissive = null, ei = 0.8) {
  const k = color + '|' + emissive + '|' + ei;
  if (!matCache.has(k)) {
    const m = new THREE.MeshToonMaterial({ color, gradientMap: grad });
    if (emissive) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = ei; }
    matCache.set(k, m);
  }
  return matCache.get(k);
}
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x14121c, side: THREE.BackSide });

const G = {
  sph: new THREE.SphereGeometry(1, 18, 14),
  sphLo: new THREE.SphereGeometry(1, 10, 8),
  cone: new THREE.ConeGeometry(1, 1, 12),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  half: new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
  circ: new THREE.CircleGeometry(1, 20),
  ico: new THREE.IcosahedronGeometry(1, 0),
  oct: new THREE.OctahedronGeometry(1, 0),
};

function part(geo, mat, pos, scale, rot, outline = false) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(...pos);
  if (scale) typeof scale === 'number' ? m.scale.setScalar(scale) : m.scale.set(...scale);
  if (rot) m.rotation.set(...rot);
  m.castShadow = true;
  if (outline) {
    const o = new THREE.Mesh(geo, outlineMat); o.scale.setScalar(1.07); o.castShadow = false; m.add(o);
  }
  return m;
}
function pivot(pos) { const g = new THREE.Group(); if (pos) g.position.set(...pos); return g; }

function eyes(parent, y, z, spread, r = 0.09, color = '#1b1626', glow = null) {
  const out = [];
  for (const s of [-1, 1]) {
    const w = part(G.sph, toon('#ffffff'), [s * spread, y, z], r);
    const pu = part(G.sph, glow ? toon(color, glow, 1.4) : toon(color), [0, 0, 0.55], 0.62);
    const hl = part(G.sphLo, toon('#ffffff', '#ffffff', 1), [0.25, 0.3, 0.95], 0.22);
    w.add(pu); w.add(hl); parent.add(w); out.push(w);
  }
  return out;
}

// ------------------------------------------------------------------ Kreaturen
const BUILD = {
  fox(s, g, P) {
    const big = s.stage === 2;
    const body = part(G.sph, toon(s.main), [0, 0.5, 0], [0.42, 0.38, 0.62], null, true); g.add(body); P.body = body;
    const belly = part(G.sph, toon(s.accent), [0, 0.42, 0.12], [0.32, 0.28, 0.45]); g.add(belly);
    const head = pivot([0, 0.88, 0.45]); g.add(head); P.head = head;
    head.add(part(G.sph, toon(s.main), [0, 0, 0], [0.36, 0.32, 0.32], null, true));
    head.add(part(G.sph, toon(s.accent), [0, -0.08, 0.2], [0.2, 0.15, 0.22]));
    head.add(part(G.sph, toon('#241a1a'), [0, -0.02, 0.42], 0.05));
    for (const x of [-1, 1]) {
      const ear = part(G.cone, toon(s.main), [x * 0.2, 0.34, -0.02], [0.13, 0.36, 0.1], [0, 0, -x * 0.25], true);
      ear.add(part(G.cone, toon(s.accent), [0, -0.05, 0.25], [0.55, 0.7, 0.4]));
      head.add(ear);
    }
    eyes(head, 0.06, 0.25, 0.15, 0.085);
    P.legs = [];
    for (const [x, z] of [[-0.22, 0.32], [0.22, 0.32], [-0.22, -0.3], [0.22, -0.3]]) {
      const leg = pivot([x, 0.42, z]); g.add(leg);
      leg.add(part(G.cyl, toon(s.main), [0, -0.2, 0], [0.08, 0.42, 0.08]));
      leg.add(part(G.sph, toon(s.accent), [0, -0.4, 0.03], [0.1, 0.07, 0.12]));
      P.legs.push(leg);
    }
    P.tails = []; P.glow = [];
    const tails = big ? [-0.5, 0, 0.5] : [0];
    for (const a of tails) {
      const t = pivot([0, 0.6, -0.55]); t.rotation.set(-0.6, a, 0); g.add(t);
      t.add(part(G.sph, toon(s.main), [0, 0.15, -0.2], [0.17, 0.17, 0.32], null, true));
      t.add(part(G.sph, toon(s.accent), [0, 0.32, -0.5], [0.15, 0.16, 0.18]));
      const fl = part(G.cone, toon(s.glow, s.glow, 1.6), [0, 0.5, -0.56], [0.13, 0.36, 0.13]);
      t.add(fl); P.glow.push(fl); P.tails.push(t);
    }
    if (big) {
      const ruff = part(G.sph, toon(s.accent), [0, 0.72, 0.3], [0.4, 0.28, 0.25]); g.add(ruff);
      head.add(part(G.oct, toon(s.glow, s.glow, 1.4), [0, 0.12, 0.3], [0.06, 0.09, 0.03]));
    }
  },
  axolotl(s, g, P) {
    const big = s.stage === 2;
    const body = part(G.sph, toon(s.main), [0, 0.32, -0.05], [0.36, 0.28, 0.62], null, true); g.add(body); P.body = body;
    g.add(part(G.sph, toon(s.glow), [0, 0.24, 0], [0.28, 0.2, 0.5]));
    const head = pivot([0, 0.5, 0.5]); g.add(head); P.head = head;
    head.add(part(G.sph, toon(s.main), [0, 0, 0], [0.42, 0.3, 0.32], null, true));
    head.add(part(G.cyl, toon('#2a1f33'), [0, -0.1, 0.3], [0.12, 0.012, 0.012], [0, 0, Math.PI / 2]));
    eyes(head, 0.08, 0.24, 0.22, 0.075);
    P.glow = [];
    for (const x of [-1, 1]) for (let i = 0; i < 3; i++) {
      const gl = part(G.cone, toon(s.accent, s.accent, 0.6), [x * (0.36 + i * 0.02), 0.15 - i * 0.12, -0.08], [0.06, 0.32, 0.06], [0, 0, -x * (0.9 + i * 0.35)]);
      head.add(gl); P.glow.push(gl);
    }
    P.legs = [];
    for (const [x, z] of [[-0.3, 0.25], [0.3, 0.25], [-0.3, -0.3], [0.3, -0.3]]) {
      const leg = pivot([x, 0.22, z]); g.add(leg);
      leg.add(part(G.sph, toon(s.main), [x * 0.2, -0.12, 0], [0.09, 0.14, 0.09]));
      P.legs.push(leg);
    }
    const tail = pivot([0, 0.34, -0.6]); g.add(tail); P.tails = [tail];
    tail.add(part(G.sph, toon(s.main), [0, 0, -0.32], [0.08, 0.24, 0.42], null, true));
    tail.add(part(G.sph, toon(s.glow, s.glow, 0.4), [0, 0.12, -0.4], [0.03, 0.18, 0.36]));
    if (big) {
      for (let i = 0; i < 4; i++) g.add(part(G.cone, toon(s.accent, s.accent, 0.5), [0, 0.6, 0.15 - i * 0.2], [0.05, 0.25 - i * 0.03, 0.12]));
      for (const x of [-1, 1]) head.add(part(G.cone, toon('#e8f4ff'), [x * 0.14, 0.3, -0.08], [0.05, 0.3, 0.05], [-0.5, 0, -x * 0.3]));
    }
  },
  sprout(s, g, P) {
    const big = s.stage === 2;
    const body = part(G.sph, toon(s.main), [0, 0.45, 0], [0.42, 0.42, 0.4], null, true); g.add(body); P.body = body;
    g.add(part(G.sph, toon(s.accent), [0, 0.36, 0.18], [0.3, 0.28, 0.25]));
    const head = pivot([0, 0.55, 0.2]); g.add(head); P.head = head;
    eyes(head, 0.08, 0.17, 0.15, 0.085);
    head.add(part(G.sph, toon('#ff9a9a'), [-0.26, -0.04, 0.12], [0.06, 0.035, 0.03]));
    head.add(part(G.sph, toon('#ff9a9a'), [0.26, -0.04, 0.12], [0.06, 0.035, 0.03]));
    P.legs = [];
    for (const x of [-0.18, 0.18]) {
      const leg = pivot([x, 0.14, 0.02]); g.add(leg);
      leg.add(part(G.sph, toon(s.accent), [0, -0.06, 0.05], [0.13, 0.09, 0.16]));
      P.legs.push(leg);
    }
    const stem = pivot([0, 0.85, -0.02]); g.add(stem); P.tails = [stem];
    stem.add(part(G.cyl, toon('#4a8a3a'), [0, 0.12, 0], [0.03, 0.26, 0.03]));
    const leafs = big ? [[-0.6, 0.6], [0.6, 0.6], [0, 0], [-1.2, 0.35], [1.2, 0.35]] : [[-0.45, 0], [0.45, 0]];
    P.glow = [];
    for (const [a, h] of leafs) {
      const l = part(G.sph, toon(s.main), [Math.sin(a) * 0.22, 0.28 + h * 0.2, Math.cos(a) * 0.02], [0.2, 0.04, 0.12], [0, a * 0.3, -a * 0.9], true);
      stem.add(l);
    }
    if (big) {
      const fl = part(G.ico, toon(s.glow, s.glow, 1.2), [0, 0.5, 0], 0.11); stem.add(fl); P.glow.push(fl);
      body.material = toon(s.main);
      for (const x of [-1, 1]) g.add(part(G.cone, toon(s.accent), [x * 0.42, 0.55, 0], [0.08, 0.4, 0.08], [0, 0, -x * 1.1]));
    }
  },
  bird(s, g, P) {
    const body = part(G.sph, toon(s.main), [0, 0.42, 0], [0.3, 0.3, 0.34], null, true); g.add(body); P.body = body;
    g.add(part(G.sph, toon('#fff4d6'), [0, 0.36, 0.12], [0.22, 0.22, 0.22]));
    const head = pivot([0, 0.72, 0.12]); g.add(head); P.head = head;
    head.add(part(G.sph, toon(s.main), [0, 0, 0], 0.22, null, true));
    head.add(part(G.cone, toon('#ff9b2f'), [0, -0.02, 0.24], [0.06, 0.14, 0.06], [Math.PI / 2, 0, 0]));
    head.add(part(G.cone, toon(s.accent), [0, 0.22, -0.04], [0.05, 0.18, 0.05], [-0.4, 0, 0]));
    eyes(head, 0.05, 0.15, 0.11, 0.06);
    P.wings = [];
    for (const x of [-1, 1]) {
      const w = pivot([x * 0.26, 0.5, 0]); g.add(w);
      w.add(part(G.sph, toon(s.accent), [x * 0.16, -0.02, -0.04], [0.2, 0.05, 0.16], null, true));
      P.wings.push(w);
    }
    const tail = pivot([0, 0.42, -0.3]); g.add(tail); P.tails = [tail];
    tail.add(part(G.sph, toon(s.accent), [0, 0.04, -0.12], [0.12, 0.03, 0.18], [0.4, 0, 0]));
    P.legs = [];
    for (const x of [-0.09, 0.09]) {
      const leg = pivot([x, 0.16, 0.02]); g.add(leg);
      leg.add(part(G.cyl, toon('#e88a2a'), [0, -0.07, 0], [0.02, 0.16, 0.02]));
      P.legs.push(leg);
    }
  },
  moth(s, g, P) {
    P.hover = 0.55;
    const body = part(G.sph, toon(s.main), [0, 0.5, -0.05], [0.18, 0.18, 0.34], null, true); g.add(body); P.body = body;
    g.add(part(G.sph, toon('#f4f1e6'), [0, 0.62, 0.18], [0.24, 0.16, 0.14]));
    const head = pivot([0, 0.64, 0.28]); g.add(head); P.head = head;
    head.add(part(G.sph, toon(s.main), [0, 0, 0], 0.16, null, true));
    eyes(head, 0.02, 0.1, 0.09, 0.06, '#1b1626', s.glow);
    for (const x of [-1, 1]) {
      const a = part(G.cyl, toon('#2a2a3a'), [x * 0.07, 0.2, 0.05], [0.012, 0.3, 0.012], [0.4, 0, -x * 0.4]); head.add(a);
      head.add(part(G.sph, toon(s.accent, s.accent, 1.2), [x * 0.13, 0.33, 0.12], 0.035));
    }
    P.wings = []; P.glow = [];
    const wmat = toon(s.main); wmat.side = THREE.DoubleSide;
    for (const x of [-1, 1]) {
      const w = pivot([x * 0.1, 0.55, 0]); g.add(w);
      const up = new THREE.Mesh(G.circ, wmat); up.scale.set(0.38, 0.28, 1); up.position.set(x * 0.36, 0.08, 0.05); up.rotation.set(-Math.PI / 2, 0, x * 0.3); w.add(up);
      const lo = new THREE.Mesh(G.circ, wmat); lo.scale.set(0.26, 0.2, 1); lo.position.set(x * 0.26, 0.02, -0.25); lo.rotation.set(-Math.PI / 2, 0, -x * 0.4); w.add(lo);
      const spot = part(G.sph, toon(s.accent, s.accent, 1.3), [x * 0.42, 0.1, 0.05], [0.09, 0.02, 0.09]); w.add(spot); P.glow.push(spot);
      const spot2 = part(G.sph, toon(s.glow, s.glow, 1.1), [x * 0.28, 0.04, -0.25], [0.05, 0.02, 0.05]); w.add(spot2);
      P.wings.push(w);
    }
    P.legs = [];
  },
  mushroom(s, g, P) {
    const body = part(G.sph, toon(s.accent), [0, 0.3, 0], [0.26, 0.3, 0.24], null, true); g.add(body); P.body = body;
    const head = pivot([0, 0.33, 0.15]); g.add(head); P.head = head;
    eyes(head, 0.02, 0.07, 0.1, 0.06);
    head.add(part(G.sph, toon('#3a1a26'), [0, -0.1, 0.1], [0.04, 0.025, 0.02]));
    const cap = pivot([0, 0.52, 0]); g.add(cap); P.tails = [cap];
    cap.add(part(G.half, toon(s.main), [0, 0, 0], [0.48, 0.34, 0.48], null, true));
    cap.add(part(G.cyl, toon('#efd9c8'), [0, -0.01, 0], [0.47, 0.03, 0.47]));
    P.glow = [];
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4, r = i === 0 ? 0 : 0.28;
      const d = part(G.sph, toon(s.glow, s.glow, 0.5), [Math.cos(a) * r, i === 0 ? 0.33 : 0.24, Math.sin(a) * r], [0.07, 0.04, 0.07]);
      cap.add(d); P.glow.push(d);
    }
    P.legs = [];
    for (const x of [-0.12, 0.12]) {
      const leg = pivot([x, 0.07, 0.04]); g.add(leg);
      leg.add(part(G.sph, toon(s.accent), [0, -0.02, 0.03], [0.08, 0.06, 0.1]));
      P.legs.push(leg);
    }
  },
  crab(s, g, P) {
    const body = part(G.sph, toon(s.main), [0, 0.32, 0], [0.48, 0.24, 0.38], null, true); g.add(body); P.body = body;
    g.add(part(G.sph, toon(s.accent), [0, 0.24, 0.05], [0.4, 0.14, 0.32]));
    P.glow = [];
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3;
      const peb = part(G.ico, i === 2 ? toon(s.glow, s.glow, 1.0) : toon(['#b4ab9b', '#6f6a62', '#d1c7b4'][i % 3]), [Math.cos(a) * 0.22, 0.52, Math.sin(a) * 0.16], 0.08 + (i % 2) * 0.03);
      g.add(peb); if (i === 2) P.glow.push(peb);
    }
    const head = pivot([0, 0.42, 0.3]); g.add(head); P.head = head;
    for (const x of [-1, 1]) {
      head.add(part(G.cyl, toon(s.main), [x * 0.1, 0.12, 0], [0.025, 0.22, 0.025]));
    }
    const e = eyes(head, 0.26, 0.0, 0.1, 0.06); e.forEach(w => (w.position.z = 0.02));
    P.wings = [];
    for (const x of [-1, 1]) {
      const arm = pivot([x * 0.4, 0.34, 0.25]); g.add(arm);
      arm.add(part(G.cyl, toon(s.main), [x * 0.08, 0, 0.08], [0.05, 0.25, 0.05], [Math.PI / 2.6, 0, -x * 0.8]));
      const cl = part(G.sph, toon(s.main), [x * 0.18, 0.06, 0.28], [0.16, 0.12, 0.18], null, true); arm.add(cl);
      cl.add(part(G.cone, toon(s.accent), [0, 0.4, 0.8], [0.4, 1, 0.4], [1.2, 0, 0]));
      P.wings.push(arm);
    }
    P.legs = [];
    for (const x of [-1, 1]) for (let i = 0; i < 3; i++) {
      const leg = pivot([x * 0.38, 0.25, -0.15 + i * 0.13]); g.add(leg);
      leg.add(part(G.cyl, toon(s.main), [x * 0.1, -0.08, 0], [0.025, 0.28, 0.025], [0, 0, x * 0.9]));
      P.legs.push(leg);
    }
  },
  shade(s, g, P) {
    const body = part(G.sph, toon(s.main), [0, 0.42, -0.05], [0.26, 0.28, 0.45], null, true); g.add(body); P.body = body;
    const head = pivot([0, 0.74, 0.3]); g.add(head); P.head = head;
    head.add(part(G.sph, toon(s.main), [0, 0, 0], [0.26, 0.24, 0.24], null, true));
    head.add(part(G.cone, toon(s.main), [0, -0.06, 0.2], [0.09, 0.18, 0.08], [Math.PI / 2, 0, 0]));
    eyes(head, 0.04, 0.17, 0.1, 0.07, '#ffffff', s.glow).forEach(w => (w.children[0].material = toon(s.glow, s.glow, 2)));
    P.glow = [];
    for (const x of [-1, 1]) {
      const ear = pivot([x * 0.14, 0.18, -0.02]); ear.rotation.z = -x * 0.45; head.add(ear);
      ear.add(part(G.cone, toon(s.main), [0, 0.32, 0], [0.16, 0.65, 0.07], null, true));
      const inner = part(G.cone, toon(s.accent, s.accent, 0.9), [0, 0.3, 0.035], [0.1, 0.5, 0.03]); ear.add(inner); P.glow.push(inner);
    }
    P.legs = [];
    for (const [x, z] of [[-0.14, 0.2], [0.14, 0.2], [-0.14, -0.25], [0.14, -0.25]]) {
      const leg = pivot([x, 0.3, z]); g.add(leg);
      leg.add(part(G.cyl, toon('#1c1729'), [0, -0.14, 0], [0.05, 0.3, 0.05]));
      P.legs.push(leg);
    }
    const tail = pivot([0, 0.5, -0.45]); g.add(tail); P.tails = [tail];
    for (let i = 0; i < 5; i++) tail.add(part(G.sph, toon(i === 4 ? s.accent : s.main, i === 4 ? s.glow : null, 1.2), [0, 0.06 * i + 0.04 * i * i * 0.3, -0.1 * i], 0.07 - i * 0.006));
  },
  turtle(s, g, P) {
    const shell = part(G.half, toon(s.main), [0, 0.28, 0], [0.55, 0.42, 0.62], null, true); g.add(shell); P.body = shell;
    g.add(part(G.cyl, toon(s.accent), [0, 0.28, 0], [0.56, 0.06, 0.63]));
    P.glow = [];
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05, r = 0.25 + (i % 2) * 0.08;
      const y = 0.28 + Math.sqrt(Math.max(0, 1 - (r / 0.55) ** 2)) * 0.4;
      shell.parent; g.add(part(G.ico, toon(['#5a7f3a', '#7fa955', '#4d6e31'][i % 3]), [Math.cos(a) * r, y, Math.sin(a) * r], [0.12, 0.08, 0.12]));
      if (i % 2 === 0) { const f = part(G.sph, toon(s.glow, s.glow, 0.8), [Math.cos(a) * r, y + 0.07, Math.sin(a) * r], 0.045); g.add(f); P.glow.push(f); }
    }
    const head = pivot([0, 0.32, 0.6]); g.add(head); P.head = head;
    head.add(part(G.sph, toon(s.accent), [0, 0, 0.05], [0.2, 0.18, 0.22], null, true));
    eyes(head, 0.05, 0.17, 0.1, 0.055);
    P.legs = [];
    for (const [x, z] of [[-0.38, 0.32], [0.38, 0.32], [-0.38, -0.32], [0.38, -0.32]]) {
      const leg = pivot([x, 0.2, z]); g.add(leg);
      leg.add(part(G.sph, toon(s.accent), [0, -0.08, 0], [0.12, 0.14, 0.12]));
      P.legs.push(leg);
    }
    P.tails = [];
  },
  stag(s, g, P) {
    const body = part(G.sph, toon(s.main), [0, 1.0, 0], [0.42, 0.42, 0.75], null, true); g.add(body); P.body = body;
    g.add(part(G.sph, toon(s.accent), [0, 1.08, 0.05], [0.3, 0.12, 0.7]));
    const neck = part(G.cyl, toon(s.main), [0, 1.35, 0.55], [0.17, 0.6, 0.17], [0.6, 0, 0], true); g.add(neck);
    const head = pivot([0, 1.68, 0.8]); g.add(head); P.head = head;
    head.add(part(G.sph, toon(s.main), [0, 0, 0], [0.2, 0.2, 0.3], null, true));
    head.add(part(G.sph, toon(s.main), [0, -0.05, 0.25], [0.12, 0.11, 0.16]));
    eyes(head, 0.06, 0.12, 0.13, 0.055, '#0f3a2a', s.glow);
    head.add(part(G.oct, toon(s.glow, s.glow, 2), [0, 0.14, 0.2], [0.05, 0.08, 0.02]));
    P.glow = [];
    for (const x of [-1, 1]) {
      const ant = pivot([x * 0.1, 0.14, -0.05]); head.add(ant);
      const segs = [[0, 0.3, 0, -x * 0.35], [x * 0.18, 0.6, -0.05, -x * 0.7], [x * 0.05, 0.62, 0.08, x * 0.2], [x * 0.38, 0.85, -0.1, -x * 0.9], [x * 0.26, 0.92, 0.05, -x * 0.1]];
      for (const [px, py, pz, rz] of segs) ant.add(part(G.cyl, toon('#cfc3a2'), [px, py, pz], [0.03, 0.34, 0.03], [0, 0, rz]));
      for (const [px, py, pz] of [[x * 0.5, 1.0, -0.1], [x * 0.3, 1.08, 0.08], [x * 0.12, 0.8, 0.12], [x * 0.35, 0.7, -0.05]]) {
        const leaf = part(G.oct, toon(s.accent, s.glow, 1.3), [px, py, pz], [0.07, 0.11, 0.05]); ant.add(leaf); P.glow.push(leaf);
      }
    }
    P.legs = [];
    for (const [x, z] of [[-0.24, 0.45], [0.24, 0.45], [-0.24, -0.45], [0.24, -0.45]]) {
      const leg = pivot([x, 0.85, z]); g.add(leg);
      leg.add(part(G.cyl, toon(s.main), [0, -0.4, 0], [0.07, 0.82, 0.07]));
      leg.add(part(G.cyl, toon(s.accent, s.glow, 0.4), [0, -0.8, 0], [0.09, 0.08, 0.09]));
      P.legs.push(leg);
    }
    const tail = pivot([0, 1.15, -0.72]); g.add(tail); P.tails = [tail];
    tail.add(part(G.sph, toon(s.accent, s.glow, 0.5), [0, 0, -0.1], [0.1, 0.18, 0.12]));
    // schwebender Runenring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.02, 6, 48), toon(s.glow, s.glow, 2));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; g.add(ring); P.ring = ring;
  },
};

export function buildCreature(spec, shiny = false) {
  const g = new THREE.Group(), P = { legs: [], tails: [], wings: [], glow: [] };
  const s = { ...spec };
  if (shiny) { s.main = shiftHue(s.main, 0.45); s.accent = shiftHue(s.accent, 0.3); }
  BUILD[s.kind](s, g, P);
  const inner = g; const root = new THREE.Group(); root.add(inner);
  inner.scale.setScalar(s.size || 1);
  root.userData = { P, inner, phase: Math.random() * 10, kind: s.kind, size: s.size || 1 };
  return root;
}

function shiftHue(hex, d) { const c = new THREE.Color(hex); const h = {}; c.getHSL(h); c.setHSL((h.h + d) % 1, h.s, h.l); return '#' + c.getHexString(); }

// Animation: mode = idle | walk | hover ; t = Zeit in s
export function animateCreature(root, t, moving = false) {
  const { P, inner, phase } = root.userData; const tt = t + phase;
  const hov = P.hover || 0;
  const fly = P.wings.length && (root.userData.kind === 'bird' || root.userData.kind === 'moth');
  inner.position.y = hov + (fly && hov ? Math.sin(tt * 3) * 0.08 : Math.abs(Math.sin(tt * (moving ? 9 : 2.2))) * (moving ? 0.06 : 0.025));
  if (P.head) { P.head.rotation.x = Math.sin(tt * 1.3) * 0.06; P.head.rotation.y = Math.sin(tt * 0.7) * 0.15; }
  P.tails.forEach((tl, i) => { tl.rotation.y = (tl.userData.ry ??= tl.rotation.y) + Math.sin(tt * (moving ? 10 : 4) + i) * 0.3; });
  P.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(tt * 12 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.6 : 0; });
  if (root.userData.kind === 'bird') P.wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * (moving ? Math.sin(tt * 22) * 0.9 : Math.sin(tt * 2) * 0.1)));
  else if (root.userData.kind === 'moth') P.wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * Math.sin(tt * 14) * 0.55));
  else if (root.userData.kind === 'crab') P.wings.forEach((w, i) => (w.rotation.x = Math.sin(tt * 3 + i) * 0.15));
  P.glow.forEach((m, i) => { const k = 1 + Math.sin(tt * 6 + i * 1.7) * 0.12; m.scale.y = (m.userData.sy ??= m.scale.y) * k; });
  if (P.ring) { P.ring.rotation.z = tt * 0.6; P.ring.position.y = 0.05 + Math.sin(tt) * 0.05; }
}

// ------------------------------------------------------------------ Spielercharakter
export function buildHuman(look) {
  const g = new THREE.Group(), P = { legs: [], arms: [] };
  const skin = toon(look.skin), outfit = toon(look.outfit), pants = toon(look.pants || '#2c3346'), hair = toon(look.hair);
  const inner = new THREE.Group(); g.add(inner);
  const torso = part(G.sph, outfit, [0, 1.02, 0], [0.27, 0.36, 0.2], null, true); inner.add(torso);
  inner.add(part(G.cyl, toon(look.accent || '#f2d16b'), [0, 0.78, 0], [0.26, 0.05, 0.19]));
  const head = pivot([0, 1.55, 0]); inner.add(head); P.head = head;
  head.add(part(G.sph, skin, [0, 0, 0], [0.24, 0.26, 0.24], null, true));
  head.add(part(G.half, hair, [0, 0.04, -0.02], [0.26, 0.26, 0.27]));
  head.add(part(G.sph, hair, [0, 0.0, -0.12], [0.24, 0.22, 0.16]));
  if (look.cap) {
    head.add(part(G.half, toon(look.cap), [0, 0.1, 0], [0.27, 0.2, 0.27]));
    head.add(part(G.cyl, toon(look.cap), [0, 0.11, 0.2], [0.18, 0.02, 0.14]));
  }
  for (const x of [-1, 1]) {
    const e = part(G.sph, toon('#1d1a26'), [x * 0.085, 0.0, 0.215], [0.035, 0.05, 0.02]); head.add(e);
  }
  for (const x of [-1, 1]) {
    const arm = pivot([x * 0.32, 1.25, 0]); inner.add(arm);
    arm.add(part(G.cyl, outfit, [0, -0.17, 0], [0.075, 0.36, 0.075]));
    arm.add(part(G.sph, skin, [0, -0.4, 0], 0.075));
    P.arms.push(arm);
    const leg = pivot([x * 0.12, 0.78, 0]); inner.add(leg);
    leg.add(part(G.cyl, pants, [0, -0.33, 0], [0.09, 0.66, 0.09]));
    leg.add(part(G.sph, toon('#3a2a20'), [0, -0.7, 0.05], [0.1, 0.07, 0.15]));
    P.legs.push(leg);
  }
  const pack = part(G.sph, toon(look.accent || '#f2d16b'), [0, 1.08, -0.22], [0.2, 0.24, 0.1], null, true); inner.add(pack);
  g.userData = { P, inner, phase: 0, human: true };
  return g;
}

export function animateHuman(g, t, speed = 0) {
  const { P, inner } = g.userData;
  const w = Math.min(1, speed / 4), f = speed > 6 ? 15 : 10;
  P.legs.forEach((l, i) => (l.rotation.x = Math.sin(t * f + (i ? Math.PI : 0)) * 0.7 * w));
  P.arms.forEach((a, i) => (a.rotation.x = Math.sin(t * f + (i ? 0 : Math.PI)) * 0.6 * w));
  inner.position.y = Math.abs(Math.sin(t * f)) * 0.06 * w + Math.sin(t * 2) * 0.008;
  if (P.head) P.head.rotation.y = Math.sin(t * 0.5) * 0.1 * (1 - w);
}
