// Upgrade-Optik als Baukasten: jede Kreatur listet pro Pfad und Stufe die Bauteile, die dazukommen.
// Regel: Stufe 1–2 Zubehör · 3 Farbe/Material · 4 Umriss · 5 eigene Gestalt. Stufen wirken kumulativ, Kreuzpfade kombinieren sich.
import * as THREE from 'three';
import { toon, glow, mk, geo } from './toon.js';

const PI = Math.PI;
export const PCOL = [0xff7a2a, 0x5fd6ff, 0xc39bff];
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const put = (par, g, m, o) => { const x = mk(g, m, o); par.add(x); return x; };

// Stufe 3–5: Modell färbt sich in Pfadfarbe ein, Stufe 5 wird es größer
export function tintByTier(R, tiers, cols = PCOL) {
  const top = Math.max(...tiers), pi = tiers.indexOf(top);
  if (top >= 3 && R.mats) for (const m of R.mats) m.userData.u?.uEm?.value.lerp(new THREE.Color(cols[pi]), [0, 0, 0, 0.05, 0.09, 0.15][top]);
  if (top >= 5 && R.norm) R.norm.scale.multiplyScalar(1.08);
}

// ───────── Bauteile: (ctx, farbe, n) → optionale Animation ─────────
// ctx: { R, root, H (Höhe), W (Breite), head, back (Positionen), hb, bb (Knochen), sc }
const PART = {
  horns: (c, col, n = 1) => { for (const sd of [-1, 1]) c.R.attach(c.hb, mk(geo.cone(6), toon(col, { emissive: col, emissiveIntensity: 0.3 }), { r: [-0.3, 0, -sd * 0.5], s: [0.04 * n, 0.14 * n, 0.04 * n], ol: 0.004 }), c.head.clone().add(V(sd * 0.07, 0.09 + c.H * 0.08, 0))); },
  gem: (c, col) => c.R.attach(c.hb, mk(geo.oct(), glow(col, 0.95), { s: [0.045, 0.065, 0.025], ol: false }), c.head.clone().add(V(0, c.H * 0.2, c.H * 0.32))),
  mask: (c, col) => c.R.attach(c.hb, mk(geo.box(), toon(col), { s: [0.16, 0.06, 0.03], ol: 0.003 }), c.head.clone().add(V(0, c.H * 0.05, c.H * 0.2))),
  collar: (c, col) => c.R.attach(c.bb, mk(geo.torus(0.14), toon(col, { emissive: col, emissiveIntensity: 0.25 }), { r: [PI / 2.2, 0, 0], s: 0.07 + c.H * 0.07, ol: 0.004 }), c.back.clone()),
  halo: (c, col, n = 1) => { const h = put(c.root, geo.torus(0.06), glow(col, 0.9), { r: [PI / 2, 0, 0], s: 0.13 * n }); h.position.set(c.head.x, Math.max(c.head.y + 0.2, c.H + 0.06), c.head.z); return t => { h.rotation.z = t; }; },
  crown: (c, col, n = 7) => { const g = new THREE.Group(); const cy = Math.max(c.head.y + 0.22, c.H + 0.1); g.position.set(c.head.x, cy, c.head.z); c.root.add(g); for (let i = 0; i < n; i++) { const q = i / n * PI * 2; put(g, geo.cone(4), glow(col, 0.95), { p: [Math.cos(q) * 0.1, 0, Math.sin(q) * 0.1], s: [0.03, i % 2 ? 0.09 : 0.14, 0.03] }); } return t => { g.rotation.y = t * 0.8; g.position.y = cy + Math.sin(t * 2) * 0.02; }; },
  orbs: (c, col, n = 3) => { const L = []; for (let i = 0; i < n; i++) L.push(put(c.root, geo.sphere(10), glow(col, 0.9), { s: 0.05 })); return t => L.forEach((o, i) => { const q = t * 1.6 + i * PI * 2 / n; o.position.set(Math.cos(q) * (c.W * 0.5 + 0.3), c.H * 0.6 + Math.sin(t * 3 + i) * 0.05, Math.sin(q) * (c.W * 0.5 + 0.3)); }); },
  shards: (c, col, n = 4) => { const L = []; for (let i = 0; i < n; i++) L.push(put(c.root, geo.oct(), glow(col, 0.9), { s: [0.04, 0.09, 0.04] })); return t => L.forEach((o, i) => { const q = -t * 0.9 + i * PI * 2 / n; o.position.set(Math.cos(q) * (c.W * 0.5 + 0.38), c.H * 0.85 + Math.sin(t * 2 + i) * 0.06, Math.sin(q) * (c.W * 0.5 + 0.38)); o.rotation.y = t * 2; }); },
  coins: (c, col = 0xffd257, n = 4) => { const L = []; for (let i = 0; i < n; i++) L.push(put(c.root, geo.cyl(12), toon(0xffd257, { emissive: 0xa07010, emissiveIntensity: 0.5 }), { s: [0.05, 0.01, 0.05], ol: 0.003 })); return t => L.forEach((o, i) => { const q = t * 1.3 + i * PI * 2 / n; o.position.set(Math.cos(q) * (c.W * 0.5 + 0.3), c.H * 0.5 + Math.sin(t * 2 + i) * 0.08, Math.sin(q) * (c.W * 0.5 + 0.3)); o.rotation.set(PI / 2, t * 3, 0); }); },
  ring: (c, col, n = 1) => { const r = put(c.root, geo.torus(0.02), glow(col, 0.75), { r: [PI / 2, 0, 0], s: c.W * 0.55 + 0.2 * n }); r.position.y = 0.03; return t => { r.rotation.z = t * 0.6; }; },
  flames: (c, col, n = 10) => { const L = []; for (let i = 0; i < n; i++) { const q = i / n * PI * 2; L.push(put(c.root, geo.cone(6), glow(i % 2 ? col : 0xffd27a, 0.8), { p: [Math.cos(q) * (c.W * 0.5 + 0.26), 0.08, Math.sin(q) * (c.W * 0.5 + 0.26)], s: [0.05, 0.16, 0.05] })); } return t => L.forEach((f, i) => { f.scale.y = 0.16 * (1 + Math.sin(t * 10 + i * 1.7) * 0.3); }); },
  bolts: (c, col, n = 3) => { const L = []; for (let i = 0; i < n; i++) { const g = new THREE.Group(); put(g, geo.box(), glow(col, 0.95), { p: [0, 0.05, 0], r: [0, 0, 0.5], s: [0.02, 0.1, 0.02] }); put(g, geo.box(), glow(0xffffff, 0.95), { p: [0.02, -0.03, 0], r: [0, 0, -0.5], s: [0.02, 0.09, 0.02] }); c.root.add(g); L.push(g); }
    return t => L.forEach((g, i) => { const q = t * 0.7 + i * PI * 2 / n; g.position.set(Math.cos(q) * (c.W * 0.5 + 0.18), c.H * (0.4 + (i % 3) * 0.22), Math.sin(q) * (c.W * 0.5 + 0.18)); g.visible = Math.sin(t * 17 + i * 3) > -0.4; g.rotation.y = -q; }); },
  cloud: (c, col, n = 1) => { const g = new THREE.Group(); for (let i = 0; i < 5; i++) put(g, geo.sphere(10), toon(0x6a7a9a, { emissive: col, emissiveIntensity: 0.25 }), { p: [(i - 2) * 0.08 * n, Math.abs(i - 2) * -0.02, (i % 2) * 0.05], s: (0.08 - Math.abs(i - 2) * 0.012) * n, ol: 0.004 });
    const b = put(g, geo.box(), glow(col, 0.95), { p: [0, -0.12 * n, 0], r: [0, 0, 0.4], s: [0.02, 0.14 * n, 0.02] }); g.position.set(0, c.H + 0.25 * n, 0); c.root.add(g); return t => { g.position.y = c.H + 0.25 * n + Math.sin(t * 1.6) * 0.03; b.visible = Math.sin(t * 9) > 0.3; }; },
  drums: (c, col, n = 6) => { const g = new THREE.Group(); put(g, geo.torus(0.04), toon(0xc8283a), { s: 0.36, ol: 0.004 }); for (let i = 0; i < n; i++) { const q = i / n * PI * 2; put(g, geo.cyl(12), toon(0xf4ead8, { emissive: col, emissiveIntensity: 0.2 }), { p: [Math.cos(q) * 0.36, Math.sin(q) * 0.36, 0], r: [PI / 2, 0, 0], s: [0.06, 0.04, 0.06], ol: 0.004 }); }
    g.position.set(c.back.x, c.H * 0.75, c.back.z - 0.18); c.root.add(g); return t => { g.rotation.z = t * 0.6; }; },
  wings: (c, col, n = 1) => { const W = []; for (const sd of [-1, 1]) { const w = new THREE.Group(); w.position.set(sd * 0.06, c.H * 0.62, c.back.z - 0.08); for (let i = 0; i < 5; i++) put(w, geo.cone(6), glow(i % 2 ? col : 0xffffff, 0.75), { p: [sd * (0.08 + i * 0.07) * n, i * 0.035 * n, 0], r: [0, 0, -sd * (1.1 - i * 0.12)], s: [0.035 * n, (0.22 - i * 0.02) * n, 0.02] }); c.root.add(w); W.push(w); } return t => W.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(t * 3) * 0.12; }); },
  pillar: (c, col) => { const p = put(c.root, geo.cyl(16), glow(col, 0.16), { p: [0, c.H * 0.9, 0], s: [c.W * 0.5 + 0.12, c.H * 1.8, c.W * 0.5 + 0.12] }); return t => { p.material.opacity = 0.12 + Math.sin(t * 2.5) * 0.05; }; },
  shield: (c, col, n = 1) => { const s = put(c.root, geo.sphere(16), glow(col, 0.16), { p: [0, c.H * 0.45, 0], s: [(c.W * 0.5 + 0.22) * n, c.H * 0.6 * n, (c.W * 0.5 + 0.22) * n] }); return t => { s.material.opacity = 0.12 + Math.sin(t * 2) * 0.04; }; },
  spikes: (c, col, n = 4) => { for (let i = 0; i < n; i++) { const f = n > 1 ? i / (n - 1) - 0.5 : 0; put(c.root, geo.cone(5), toon(col), { p: [0, c.H * 0.72 + Math.abs(f) * -0.06, c.back.z + f * 0.4], r: [f * -0.6, 0, 0], s: [0.035, 0.12, 0.035], ol: 0.004 }); } },
  cannon: (c, col, n = 1) => { const g = new THREE.Group(); put(g, geo.cyl(10), toon(0x3a3a44, { emissive: col, emissiveIntensity: 0.15 }), { r: [PI / 2 - 0.5, 0, 0], s: [0.045 * n, 0.26 * n, 0.045 * n], ol: 0.005 }); put(g, geo.torus(0.3), toon(col), { p: [0, 0.06 * n, 0.1 * n], r: [-0.5, 0, 0], s: 0.05 * n, ol: 0.003 });
    g.position.set(0.0, c.H * 0.85, c.back.z - 0.02); c.root.add(g); },
  twin: (c, col) => { for (const sd of [-1, 1]) { const g = new THREE.Group(); put(g, geo.cyl(10), toon(0x3a3a44), { r: [PI / 2 - 0.5, 0, 0], s: [0.04, 0.22, 0.04], ol: 0.005 }); g.position.set(sd * 0.1, c.H * 0.85, c.back.z - 0.02); c.root.add(g); } },
  crates: (c, col) => { for (const sd of [-1, 1]) put(c.root, geo.box(), toon(0x8a6a3a), { p: [sd * (c.W * 0.4 + 0.05), c.H * 0.45, c.back.z - 0.1], s: [0.09, 0.07, 0.09], ol: 0.004 }); },
  muzzle: (c, col) => { const f = put(c.root, geo.cone(6), glow(col, 0.85), { p: [0, c.H * 0.95, c.back.z + 0.12], r: [-0.9, 0, 0], s: [0.04, 0.12, 0.04] }); return t => { f.scale.y = 0.12 * (1 + Math.sin(t * 13) * 0.35); }; },
  stones: (c, col, n = 4) => { for (let i = 0; i < n; i++) { const q = i / n * PI * 2 + 0.4; put(c.root, geo.box(), toon(0x7a7488, { emissive: col, emissiveIntensity: 0.25 }), { p: [Math.cos(q) * (c.W * 0.5 + 0.28), 0.1, Math.sin(q) * (c.W * 0.5 + 0.28)], r: [0, -q, 0], s: [0.06, 0.2, 0.04], ol: 0.004 }); } },
  roots: (c, col, n = 6) => { for (let i = 0; i < n; i++) { const q = i / n * PI * 2; put(c.root, geo.cone(5), toon(col), { p: [Math.cos(q) * (c.W * 0.4 + 0.14), 0.03, Math.sin(q) * (c.W * 0.4 + 0.14)], r: [PI / 2, 0, -q + PI / 2], s: [0.03, 0.22, 0.03], ol: 0.003 }); } },
  leaves: (c, col, n = 4) => { const L = []; for (let i = 0; i < n; i++) L.push(put(c.root, geo.sphere(8), toon(col, { emissive: col, emissiveIntensity: 0.3 }), { s: [0.05, 0.012, 0.03], ol: 0.003 })); return t => L.forEach((o, i) => { const q = t * 0.9 + i * PI * 2 / n; o.position.set(Math.cos(q) * (c.W * 0.5 + 0.28), c.H * 0.5 + Math.sin(t * 2 + i) * 0.12, Math.sin(q) * (c.W * 0.5 + 0.28)); o.rotation.set(t + i, t * 2, 0); }); },
  trees: (c, col, n = 5) => { for (let i = 0; i < n; i++) { const q = i / n * PI * 2 + 0.3, x = Math.cos(q) * (c.W * 0.5 + 0.3), z = Math.sin(q) * (c.W * 0.5 + 0.3); put(c.root, geo.cyl(5), toon(0x6a4a32), { p: [x, 0.06, z], s: [0.015, 0.12, 0.015], ol: 0.003 }); put(c.root, geo.cone(6), toon(col), { p: [x, 0.17, z], s: [0.06, 0.16, 0.06], ol: 0.003 }); } },
  torii: (c, col, n = 1) => { const g = new THREE.Group(), red = toon(0xd8342c); for (const x of [-1, 1]) put(g, geo.cyl(8), red, { p: [x * 0.17 * n, 0.2 * n, 0], s: [0.022 * n, 0.4 * n, 0.022 * n], ol: 0.003 }); put(g, geo.box(), toon(0x2a2a36), { p: [0, 0.42 * n, 0], s: [0.46 * n, 0.035 * n, 0.05 * n], ol: 0.003 }); put(g, geo.box(), red, { p: [0, 0.35 * n, 0], s: [0.38 * n, 0.025 * n, 0.04 * n], ol: 0.003 });
    put(g, geo.sphere(8), glow(col, 0.9), { p: [0, 0.29 * n, 0], s: 0.04 * n }); g.position.set(0, 0, c.back.z - 0.3); c.root.add(g); },
  blades: (c, col, n = 3) => { const g = new THREE.Group(); for (let i = 0; i < n; i++) { const q = i / n * PI * 2, k = new THREE.Group(); put(k, geo.cone(4), toon(0xe8e0ff, { emissive: col, emissiveIntensity: 0.5 }), { p: [0, 0.06, 0], s: [0.02, 0.1, 0.008], ol: 0.003 }); put(k, geo.box(), toon(col), { p: [0, -0.01, 0], s: [0.012, 0.04, 0.012], ol: 0.003 });
    k.position.set(Math.cos(q) * (c.W * 0.5 + 0.3), 0, Math.sin(q) * (c.W * 0.5 + 0.3)); k.rotation.set(PI / 2, 0, -q - PI / 2); g.add(k); } c.root.add(g); return t => { g.rotation.y = t * 2.2; g.position.y = c.H * 0.55; }; },
  hole: (c, col, n = 1) => { const g = new THREE.Group(); put(g, geo.sphere(12), new THREE.MeshBasicMaterial({ color: 0x05030a }), { s: 0.07 * n, ol: false }); put(g, geo.torus(0.1), glow(col, 0.9), { r: [PI / 2.4, 0, 0], s: 0.11 * n }); c.root.add(g);
    return t => { const q = t * 0.9; g.position.set(Math.cos(q) * (c.W * 0.5 + 0.3), c.H + 0.1, Math.sin(q) * (c.W * 0.5 + 0.3)); g.rotation.y = t * 3; }; },
  eyes: (c, col) => { for (const sd of [-1, 1]) c.R.attach(c.hb, mk(geo.sphere(8), glow(col, 0.95), { s: [0.03, 0.018, 0.012], ol: false }), c.head.clone().add(V(sd * c.H * 0.08, c.H * 0.06, c.H * 0.2))); },
  claws: (c, col) => { for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) put(c.root, geo.cone(4), toon(col), { p: [sd * 0.11 + (i - 1) * 0.035, 0.05, c.H * 0.24], r: [PI / 2.4, 0, 0], s: [0.03, 0.13, 0.03], ol: 0.003 }); },
  stripes: (c, col, n = 4) => { for (let i = 0; i < n; i++) c.R.attach(c.bb, mk(geo.box(), toon(col), { s: [0.24, 0.015, 0.02], ol: false }), c.back.clone().add(V(0, 0.06, -0.06 * i))); },
  rocks: (c, col, n = 3) => { const L = []; for (let i = 0; i < n; i++) L.push(put(c.root, geo.dodec(), toon(col), { s: 0.05 + (i % 2) * 0.025, ol: 0.004 })); return t => L.forEach((o, i) => { const q = t * 0.7 + i * PI * 2 / n; o.position.set(Math.cos(q) * (c.W * 0.5 + 0.34), c.H * 0.55 + Math.sin(t * 1.4 + i) * 0.08, Math.sin(q) * (c.W * 0.5 + 0.34)); o.rotation.set(t + i, t * 0.6, 0); }); },
  scythe: (c, col, n = 1) => { const g = new THREE.Group(); put(g, geo.cyl(6), toon(0x2a1a2a), { s: [0.015 * n, 0.5 * n, 0.015 * n], ol: 0.003 }); put(g, new THREE.TorusGeometry(1, 0.05, 5, 16, PI * 0.7), glow(col, 0.9), { p: [0.06 * n, 0.24 * n, 0], r: [0, 0, PI * 0.25], s: 0.16 * n, ol: false });
    g.position.set(c.W * 0.3, c.H * 0.7, c.back.z - 0.08); g.rotation.z = -0.4; c.root.add(g); },
  chest: (c, col, n = 1) => { const g = new THREE.Group(); put(g, geo.box(), toon(0x8a4a22), { p: [0, 0.05 * n, 0], s: [0.16 * n, 0.09 * n, 0.11 * n], ol: 0.004 }); put(g, geo.box(), toon(col, { emissive: col, emissiveIntensity: 0.4 }), { p: [0, 0.11 * n, 0], s: [0.17 * n, 0.04 * n, 0.12 * n], ol: 0.004 }); put(g, geo.sphere(8), glow(0xfff2a8, 0.9), { p: [0, 0.15 * n, 0], s: 0.04 * n });
    g.position.set(c.W * 0.5 + 0.12, 0, 0.1); c.root.add(g); },
  lanterns: (c, col, n = 2) => { const L = []; for (let i = 0; i < n; i++) { const g = new THREE.Group(); put(g, geo.sphere(10), toon(col, { emissive: col, emissiveIntensity: 0.5 }), { s: [0.05, 0.065, 0.05], ol: 0.003 }); put(g, geo.cyl(8), toon(0x2a2a2a), { p: [0, 0.07, 0], s: [0.025, 0.015, 0.025], ol: false }); c.root.add(g); L.push(g); }
    return t => L.forEach((g, i) => { const q = t * 0.5 + i * PI * 2 / n; g.position.set(Math.cos(q) * (c.W * 0.5 + 0.32), c.H * 0.85 + Math.sin(t * 1.8 + i) * 0.04, Math.sin(q) * (c.W * 0.5 + 0.32)); }); },
  clover: (c, col) => { const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const q = i / 4 * PI * 2; put(g, geo.sphere(8), toon(col, { emissive: col, emissiveIntensity: 0.3 }), { p: [Math.cos(q) * 0.035, 0, Math.sin(q) * 0.035], s: [0.035, 0.01, 0.035], ol: 0.003 }); }
    g.position.set(c.head.x, Math.max(c.head.y + 0.12, c.H + 0.02), c.head.z); c.root.add(g); return t => { g.rotation.y = t; }; },
};

// ───────── Optik je Kreatur: [Pfad][Stufe 0..4] = Liste [bauteil, farbe, n] ─────────
export const KIT = {
  tiger: { cols: [0x9fd8ff, 0xff6a3a, 0xffe14d], paths: [
    [[['collar', 0x5ab8ff]], [['bolts', 0x9fd8ff, 2]], [['cloud', 0x9fd8ff]], [['ring', 0x5ab8ff], ['bolts', 0x9fd8ff, 5]], [['cloud', 0xffe14d, 2], ['pillar', 0x9fd8ff], ['crown', 0x9fd8ff, 9]]],
    [[['claws', 0xf4f0ea]], [['collar', 0x3a1a1a], ['eyes', 0xff5a2a]], [['spikes', 0x2a1a1a, 4]], [['flames', 0xff5a2a, 10], ['horns', 0xf4e8d8, 1.2]], [['crown', 0xff5a2a, 7], ['flames', 0xff3a10, 16], ['horns', 0xffd8c8, 1.8]]],
    [[['gem', 0xffe14d]], [['halo', 0xffe14d]], [['orbs', 0xffe14d, 3]], [['drums', 0xffe14d, 6]], [['drums', 0xffd257, 8], ['pillar', 0xffe14d], ['crown', 0xffd257, 9]]],
  ] },
  turtle: { cols: [0x5fb8ff, 0xff8a3a, 0xc39bff], paths: [
    [[['spikes', 0x9aa0a8, 3]], [['ring', 0xc8a070]], [['shield', 0x5fb8ff]], [['spikes', 0xffd257, 6], ['collar', 0xffd257]], [['shield', 0x9fd8ff, 1.3], ['pillar', 0x5fb8ff], ['crown', 0x9fd8ff, 7]]],
    [[['cannon', 0xff8a3a]], [['crates', 0xff8a3a]], [['muzzle', 0xff8a2a]], [['twin', 0xff8a3a]], [['cannon', 0xffb43a, 1.8], ['flames', 0xff6a1a, 12], ['pillar', 0xff8a3a]]],
    [[['spikes', 0xf4f0ea, 5]], [['ring', 0xc39bff]], [['stones', 0xc39bff, 4]], [['horns', 0xe8e0d0, 1.8], ['stones', 0xc39bff, 6]], [['shards', 0xc39bff, 6], ['crown', 0xc39bff, 9], ['pillar', 0x9a7aff]]],
  ] },
  deer: { cols: [0x7be07a, 0xffd257, 0xfff2c8], paths: [
    [[['roots', 0x6a4a32]], [['leaves', 0x7be07a, 3]], [['collar', 0x5aa84a], ['ring', 0x7be07a]], [['trees', 0x3a8a4a, 6]], [['leaves', 0x9aff8a, 8], ['crown', 0x9aff8a, 9], ['pillar', 0x7be07a]]],
    [[['coins', 0xffd257, 2]], [['gem', 0xffd257], ['coins', 0xffd257, 4]], [['torii', 0xffd257]], [['halo', 0xffd257], ['coins', 0xffd257, 7]], [['torii', 0xffd257, 1.6], ['crown', 0xffd257, 9], ['pillar', 0xffd257]]],
    [[['gem', 0xfff2c8]], [['orbs', 0xffffff, 2]], [['halo', 0xfff2c8, 1.3]], [['wings', 0xfff2c8, 1.3]], [['shards', 0xffffff, 6], ['crown', 0xfff2a8, 9], ['pillar', 0xfff2c8]]],
  ] },
  raven: { cols: [0x9a7bff, 0xff3a4a, 0x6a2aa8], paths: [
    [[['eyes', 0xd8b8ff]], [['halo', 0xe8ecff]], [['wings', 0x9a7bff]], [['orbs', 0x6a4aa8, 5]], [['crown', 0xe8ecff, 7], ['wings', 0x9a7bff, 1.6], ['pillar', 0x6a4aa8]]],
    [[['collar', 0xd8283a]], [['mask', 0x1a1626]], [['blades', 0xff3a4a, 3]], [['blades', 0xff3a4a, 6], ['eyes', 0xff3a2a]], [['blades', 0xff5a5a, 9], ['flames', 0xd8283a, 12], ['crown', 0xff3a4a, 7]]],
    [[['orbs', 0x6a2aa8, 1]], [['ring', 0x8a3ad8]], [['shards', 0x8a3ad8, 4]], [['hole', 0xb07bff]], [['hole', 0xd8a8ff, 2], ['pillar', 0x3a1a6a], ['wings', 0x5a20a0, 1.5]]],
  ] },
  dragonwolf: { cols: [0x9fe8ff, 0xff6a1a, 0xb07bff], paths: [
    [[['collar', 0x9fe8ff]], [['spikes', 0xcff4ff, 4]], [['ring', 0x9fe8ff], ['shards', 0xbff4ff, 3]], [['stones', 0xbff4ff, 6], ['eyes', 0x9fe8ff]], [['shards', 0xffffff, 6], ['crown', 0x9fe8ff, 9], ['wings', 0xcff4ff, 1.4], ['pillar', 0x9fe8ff]]],
    [[['eyes', 0xff8a2a]], [['collar', 0xff6a1a]], [['flames', 0xff6a1a, 8]], [['spikes', 0xff8a2a, 5], ['flames', 0xff3a10, 14]], [['horns', 0x2a1a1a, 1.8], ['wings', 0xff6a1a, 1.5], ['pillar', 0xff6a1a]]],
    [[['horns', 0xe8d8c8, 1]], [['wings', 0x9a7bff, 0.8]], [['orbs', 0xc39bff, 2]], [['horns', 0xffd257, 1.5], ['wings', 0x9a7bff, 1.3]], [['crown', 0xffd257, 9], ['wings', 0xc39bff, 1.8], ['pillar', 0x9a7bff]]],
  ] },
  mantis: { cols: [0xff3a4a, 0x7af07a, 0xc8283a], head: [-0.12, 0.66, 0.02], paths: [
    [[['mask', 0x1a1626]], [['eyes', 0xff3a4a]], [['collar', 0x3a1a2a]], [['blades', 0xff3a4a, 4]], [['scythe', 0xff3a4a, 1.4], ['crown', 0xff3a4a, 7], ['pillar', 0x6a1a2a]]],
    [[['gem', 0x7af07a]], [['blades', 0x7af07a, 2]], [['ring', 0x7af07a], ['blades', 0x7af07a, 4]], [['blades', 0x9aff9a, 8]], [['blades', 0xc8ffc8, 12], ['wings', 0x7af07a, 1.4], ['crown', 0x9aff9a, 9]]],
    [[['collar', 0xc8283a]], [['eyes', 0xff2a4a]], [['coins', 0xffd257, 3]], [['coins', 0xffd257, 6], ['flames', 0xc8283a, 8]], [['scythe', 0xff2a4a, 1.8], ['hole', 0xff3a4a], ['pillar', 0x8a0a1a]]],
  ] },
  golem: { cols: [0xc8a070, 0xff5a10, 0xe8e0d8], paths: [
    [[['spikes', 0x9a8a78, 3]], [['ring', 0xc8a070]], [['stones', 0xc8a070, 4]], [['horns', 0x9a8a78, 1.6], ['stones', 0xc8a070, 6]], [['rocks', 0x8a7a68, 6], ['crown', 0xc8a070, 9], ['pillar', 0xc8a070]]],
    [[['shards', 0x3a2a5a, 2]], [['shards', 0x2a1a3a, 4]], [['flames', 0xff5a10, 8]], [['spikes', 0x1a1426, 6], ['flames', 0xff3a10, 14]], [['shards', 0xff6a1a, 8], ['crown', 0xff5a10, 9], ['eyes', 0xff6a1a], ['pillar', 0xff5a10]]],
    [[['rocks', 0x8a7a68, 2]], [['rocks', 0x9a8a78, 4]], [['rocks', 0x7a6a58, 6]], [['trees', 0x3a8a4a, 5], ['ring', 0x9a8a78]], [['rocks', 0xa89888, 10], ['crown', 0xffffff, 9], ['pillar', 0xc8c0b0]]],
  ] },
  neko: { cols: [0xffd257, 0xff5a3a, 0x5adf5a], paths: [
    [[['coins', 0xffd257, 2]], [['coins', 0xffd257, 4]], [['chest', 0xffd257]], [['coins', 0xffd257, 8], ['halo', 0xffd257]], [['chest', 0xffd257, 1.6], ['crown', 0xffd257, 9], ['pillar', 0xffd257]]],
    [[['lanterns', 0xff3a2a, 1]], [['lanterns', 0xff3a2a, 2]], [['torii', 0xff8a3a]], [['lanterns', 0xff5a2a, 4], ['ring', 0xff8a3a]], [['torii', 0xffd257, 1.6], ['lanterns', 0xffb43a, 6], ['pillar', 0xff8a3a]]],
    [[['clover', 0x5adf5a]], [['gem', 0x5adf5a]], [['leaves', 0x5adf5a, 4]], [['orbs', 0xffe14d, 4], ['halo', 0x5adf5a]], [['shards', 0xffe14d, 6], ['crown', 0x9aff8a, 9], ['pillar', 0x5adf5a]]],
  ] },
  phoenix: { cols: [0xffb43a, 0xff6a1a, 0xff5a3a], head: [0, 0.8, 0.12], paths: [
    [[['blades', 0xffb43a, 2]], [['blades', 0xffb43a, 4]], [['wings', 0xff8a2a, 1.2]], [['blades', 0xffd257, 8]], [['wings', 0xffd257, 1.8], ['crown', 0xffd257, 9], ['pillar', 0xff8a2a]]],
    [[['gem', 0xffd257]], [['halo', 0xff8a2a]], [['flames', 0xff6a1a, 8]], [['flames', 0xff3a10, 14], ['orbs', 0xffd27a, 3]], [['halo', 0xffe14d, 2.2], ['shards', 0xffe14d, 6], ['pillar', 0xffd257]]],
    [[['ring', 0xff5a3a]], [['orbs', 0xc8a8a0, 3]], [['stones', 0x5a4a48, 4]], [['shield', 0xff8a2a]], [['wings', 0xff5a3a, 1.6], ['crown', 0xff8a2a, 9], ['pillar', 0xff5a3a]]],
  ] },
  naga: { cols: [0x8aff6a, 0xc08aff, 0xff9af0], head: [0, 0.85, 0.06], paths: [
    [[['eyes', 0x8aff6a]], [['orbs', 0x8aff6a, 2]], [['flames', 0x5adf5a, 8]], [['shards', 0x8aff6a, 4]], [['flames', 0x8aff6a, 14], ['crown', 0x8aff6a, 9], ['pillar', 0x3fd06a]]],
    [[['gem', 0xc08aff]], [['ring', 0xc08aff]], [['orbs', 0xc08aff, 3]], [['hole', 0xc08aff]], [['hole', 0xe0b8ff, 2], ['crown', 0xc08aff, 7], ['pillar', 0x6a2aa8]]],
    [[['halo', 0xff9af0]], [['eyes', 0xff9af0]], [['ring', 0xff9af0, 1.5]], [['shards', 0xff9af0, 6]], [['halo', 0xff9af0, 2], ['wings', 0xff9af0, 1.3], ['pillar', 0xff9af0]]],
  ] },
  monk: { cols: [0x8fe0ff, 0x9af0c8, 0xffd257], head: [0, 0.7, 0.05], paths: [
    [[['blades', 0x8fe0ff, 2]], [['blades', 0x8fe0ff, 4]], [['ring', 0xdff8ff]], [['blades', 0xdff8ff, 8]], [['blades', 0xffffff, 12], ['cloud', 0x8fe0ff, 1.5], ['crown', 0x8fe0ff, 9]]],
    [[['leaves', 0x9af0c8, 3]], [['leaves', 0x9af0c8, 6]], [['ring', 0x9af0c8, 1.5]], [['wings', 0x9af0c8, 1.2], ['leaves', 0x9af0c8, 9]], [['wings', 0xdff8ff, 1.8], ['crown', 0x9af0c8, 9], ['pillar', 0x9af0c8]]],
    [[['gem', 0xffd257]], [['halo', 0xffd257]], [['orbs', 0xffd257, 3]], [['torii', 0xffd257]], [['halo', 0xffd257, 2], ['torii', 0xffd257, 1.5], ['pillar', 0xffd257]]],
  ] },
  voidcat: { cols: [0x9a6aff, 0xff9af0, 0xfff2a8], head: [0, 0.58, 0.06], paths: [
    [[['eyes', 0xd8b8ff]], [['orbs', 0x6a2aa8, 2]], [['ring', 0x9a6aff]], [['hole', 0x9a6aff]], [['hole', 0xd8a8ff, 2], ['crown', 0x9a6aff, 9], ['pillar', 0x3a1a6a]]],
    [[['shards', 0xff9af0, 2]], [['shards', 0xff9af0, 4]], [['bolts', 0xff9af0, 3]], [['shards', 0xffffff, 8]], [['wings', 0xff9af0, 1.6], ['crown', 0xff9af0, 7], ['pillar', 0xff9af0]]],
    [[['gem', 0xfff2a8]], [['orbs', 0xfff2a8, 2]], [['orbs', 0xfff2a8, 4]], [['halo', 0xfff2a8, 1.3], ['shards', 0xfff2a8, 4]], [['shards', 0xffffff, 8], ['crown', 0xfff2a8, 9], ['pillar', 0xfff2a8]]],
  ] },
  kappa: { cols: [0x5ab8ff, 0x9fe8ff, 0x6ad04a], head: [0, 0.62, 0.05], paths: [
    [[['orbs', 0x7ad8ff, 2]], [['ring', 0x5ab8ff]], [['orbs', 0x7ad8ff, 4]], [['shield', 0x5ab8ff]], [['cloud', 0x5ab8ff, 1.5], ['crown', 0x9fe8ff, 9], ['pillar', 0x5ab8ff]]],
    [[['collar', 0x3a9ad8]], [['ring', 0x9fe8ff]], [['ring', 0x9fe8ff, 2], ['shards', 0x9fe8ff, 3]], [['wings', 0x9fe8ff, 1.2]], [['shield', 0xdff8ff, 1.3], ['wings', 0xffffff, 1.6], ['pillar', 0x9fe8ff]]],
    [[['leaves', 0x6ad04a, 2]], [['crates', 0x6ad04a]], [['lanterns', 0xff5a3a, 2]], [['coins', 0xffd257, 6], ['chest', 0xffd257]], [['torii', 0x6ad04a, 1.5], ['coins', 0xffd257, 10], ['crown', 0x9aff8a, 9]]],
  ] },
  tanuki: { cols: [0x9af070, 0xff9a4a, 0xffd257], head: [0, 0.62, 0.06], paths: [
    [[['leaves', 0x9af070, 3]], [['leaves', 0x9af070, 6]], [['ring', 0x7be07a]], [['leaves', 0xffb43a, 10], ['wings', 0x9af070, 1.1]], [['cloud', 0x9af070, 1.5], ['crown', 0x9af070, 9], ['pillar', 0x7be07a]]],
    [[['eyes', 0xff9a4a]], [['shards', 0xff9a4a, 3]], [['lanterns', 0xff5a3a, 2]], [['halo', 0xff9a4a], ['shards', 0xff9a4a, 6]], [['halo', 0xffd257, 2], ['crown', 0xff9a4a, 9], ['pillar', 0xff9a4a]]],
    [[['coins', 0xffd257, 2]], [['crates', 0xc8904a]], [['coins', 0xffd257, 6]], [['chest', 0xffd257], ['lanterns', 0xd8342c, 2]], [['torii', 0xd8342c, 1.5], ['coins', 0xffd257, 10], ['crown', 0xffd257, 9]]],
  ] },
  usagi: { cols: [0x9fe8ff, 0xbfe4ff, 0xfff2a8], head: [0, 0.7, 0.05], paths: [
    [[['shards', 0x9fe8ff, 2]], [['gem', 0x9fe8ff]], [['shards', 0xdff8ff, 5]], [['wings', 0x9fe8ff, 1.2]], [['crown', 0xdff8ff, 9], ['shards', 0xffffff, 10], ['pillar', 0x9fe8ff]]],
    [[['collar', 0xbfe4ff]], [['cloud', 0xffffff]], [['ring', 0xbfe4ff]], [['ring', 0xdff8ff, 2], ['cloud', 0xffffff, 1.3]], [['shield', 0xdff8ff, 1.3], ['wings', 0xffffff, 1.6], ['pillar', 0xbfe4ff]]],
    [[['halo', 0xfff2a8]], [['orbs', 0xfff2a8, 2]], [['halo', 0xfff2a8, 1.4]], [['orbs', 0xfff2a8, 4], ['halo', 0xfff2a8, 1.6]], [['halo', 0xffffff, 2], ['crown', 0xfff2a8, 9], ['pillar', 0xfff2a8]]],
  ] },
  kodama: { cols: [0x8ad070, 0x9af0c8, 0xffb8d4], head: [0, 0.66, 0.04], paths: [
    [[['spikes', 0x6a8a3a, 3]], [['leaves', 0x8ad070, 4]], [['spikes', 0x6a8a3a, 6]], [['shield', 0x8ad070]], [['cloud', 0x8ad070, 1.5], ['crown', 0x8ad070, 9], ['pillar', 0x6a8a3a]]],
    [[['leaves', 0x9af0c8, 3]], [['ring', 0x9af0c8]], [['halo', 0x9af0c8]], [['torii', 0x9af0c8]], [['halo', 0xdff8ff, 2], ['wings', 0x9af0c8, 1.6], ['pillar', 0x9af0c8]]],
    [[['leaves', 0xffb8d4, 2]], [['leaves', 0xffb8d4, 5]], [['orbs', 0xffb8d4, 3]], [['leaves', 0xffb8d4, 10], ['halo', 0xffb8d4]], [['crown', 0xffb8d4, 9], ['leaves', 0xffffff, 12], ['pillar', 0xffb8d4]]],
  ] },
  koi: { cols: [0x5fd6ff, 0x3fb4d8, 0xffd257], head: [0, 0.6, 0.12], paths: [
    [[['orbs', 0x7ad8ff, 2]], [['ring', 0x5fd6ff]], [['orbs', 0x7ad8ff, 4]], [['wings', 0x5fd6ff, 1.1]], [['cloud', 0x5fd6ff, 1.5], ['crown', 0x9fe8ff, 9], ['pillar', 0x5fd6ff]]],
    [[['collar', 0x3fb4d8]], [['ring', 0x3fb4d8]], [['ring', 0x9fe8ff, 2], ['shards', 0x9fe8ff, 3]], [['cloud', 0x3fb4d8, 1.2]], [['shield', 0xdff8ff, 1.3], ['wings', 0xffffff, 1.6], ['pillar', 0x3fb4d8]]],
    [[['gem', 0xffd257]], [['coins', 0xffd257, 3]], [['halo', 0xffd257]], [['coins', 0xffd257, 6], ['halo', 0xffd257, 1.4]], [['crown', 0xffd257, 9], ['wings', 0xffd257, 1.5], ['pillar', 0xffd257]]],
  ] },
  hotaru: { cols: [0xfff27a, 0xffd257, 0x9ff6ff], head: [0, 0.7, 0.02], paths: [
    [[['orbs', 0xfff27a, 2]], [['orbs', 0xfff27a, 4]], [['shards', 0xffd257, 4]], [['flames', 0xff9a4a, 8]], [['crown', 0xfff27a, 9], ['orbs', 0xffffff, 8], ['pillar', 0xfff27a]]],
    [[['lanterns', 0xff9a4a, 1]], [['lanterns', 0xff9a4a, 2]], [['eyes', 0xffd257]], [['halo', 0xffd257], ['lanterns', 0xff5a3a, 3]], [['torii', 0xd8342c, 1.4], ['halo', 0xffd257, 1.6], ['pillar', 0xffd257]]],
    [[['ring', 0x9ff6ff]], [['orbs', 0x9ff6ff, 3]], [['ring', 0x9ff6ff, 2]], [['orbs', 0x9ff6ff, 6], ['halo', 0x9ff6ff]], [['wings', 0x9ff6ff, 1.6], ['crown', 0x9ff6ff, 9], ['pillar', 0x9ff6ff]]],
  ] },
  kumo: { cols: [0xe8e0f0, 0x8aff6a, 0x9a6aff], head: [0, 0.62, 0.08], paths: [
    [[['ring', 0xe8e0f0]], [['ring', 0xe8e0f0, 1.4]], [['shards', 0xe8e0f0, 4]], [['ring', 0xffffff, 2], ['shards', 0xe8e0f0, 6]], [['crown', 0xe8e0f0, 9], ['wings', 0xe8e0f0, 1.5], ['pillar', 0xe8e0f0]]],
    [[['eyes', 0x8aff6a]], [['orbs', 0x8aff6a, 2]], [['flames', 0x8aff6a, 6]], [['orbs', 0x8aff6a, 4], ['flames', 0x3fd06a, 10]], [['halo', 0x8aff6a, 2], ['crown', 0x8aff6a, 9], ['pillar', 0x3fd06a]]],
    [[['orbs', 0x9a6aff, 2]], [['spikes', 0x6a2aa8, 4]], [['orbs', 0x9a6aff, 4]], [['horns', 0x9a6aff, 1.3]], [['crown', 0x9a6aff, 9], ['hole', 0x9a6aff], ['pillar', 0x6a2aa8]]],
  ] },
  komainu: { cols: [0xffd257, 0xff7a3d, 0xd8342c], head: [0, 0.72, 0.06], paths: [
    [[['claws', 0xf4f0ea]], [['collar', 0xd8342c]], [['spikes', 0x8a7a68, 4]], [['horns', 0xffd257, 1.4]], [['crown', 0xffd257, 9], ['eyes', 0xff5a2a], ['pillar', 0xffd257]]],
    [[['eyes', 0xff7a3d]], [['ring', 0xff7a3d]], [['flames', 0xff7a3d, 8]], [['ring', 0xff7a3d, 2], ['flames', 0xff3a10, 14]], [['wings', 0xff7a3d, 1.5], ['crown', 0xff5a2a, 9], ['pillar', 0xff7a3d]]],
    [[['gem', 0xd8342c]], [['lanterns', 0xd8342c, 1]], [['torii', 0xd8342c]], [['shield', 0xd8342c], ['lanterns', 0xd8342c, 3]], [['torii', 0xffd257, 1.6], ['halo', 0xffd257, 1.5], ['pillar', 0xd8342c]]],
  ] },
  kirin: { cols: [0xffe27a, 0xfffbe0, 0x9aff9a], head: [0, 0.68, 0.26], paths: [
    [[['bolts', 0xffe27a, 2]], [['bolts', 0xffe27a, 4]], [['halo', 0xffe27a]], [['bolts', 0xffd257, 7], ['ring', 0xffe27a]], [['crown', 0xffe27a, 9], ['wings', 0xffe27a, 1.4], ['pillar', 0xffe27a]]],
    [[['gem', 0xffffff]], [['eyes', 0xffffff]], [['shards', 0xfffbe0, 3]], [['shards', 0xfffbe0, 6]], [['halo', 0xffffff, 2], ['shards', 0xffffff, 10], ['pillar', 0xfffbe0]]],
    [[['leaves', 0x9aff9a, 2]], [['orbs', 0x9aff9a, 3]], [['ring', 0x9aff9a]], [['trees', 0x5adf5a, 5]], [['wings', 0x9aff9a, 1.6], ['crown', 0x9aff9a, 9], ['pillar', 0x9aff9a]]],
  ] },
};

// Baukasten anwenden (Rig mit Knochen oder prozedurales Modell)
export function kitGear(R, tiers = [0, 0, 0], sc = 1, spec) {
  tiers = tiers || [0, 0, 0];
  const H = R.size.y, W = Math.min(Math.max(R.size.x, R.size.z), H * 0.9);   // Schwanz/Flügel nicht als Breite zählen
  const find = re => Object.keys(R.bones || {}).find(k => re.test(k));
  const hb = find(/^head$|head/i), bb = find(/chest|spine|neck/i);
  const head = spec.head ? V(spec.head[0] * H, spec.head[1] * H, spec.head[2] * H) : hb ? R.bonePos(hb) : V(0, H * 0.9, 0.05), back = bb ? R.bonePos(bb) : V(0, H * 0.6, 0);
  const c = { R, root: R.root, H, W, head, back, hb, bb, sc }, anim = [];
  tintByTier(R, tiers, spec.cols);
  spec.paths.forEach((tl, pi) => { for (let k = 0; k < tiers[pi]; k++) for (const [name, col, n] of tl[k] || []) { const f = PART[name]?.(c, col, n); if (typeof f === 'function') anim.push(f); } });
  const tick = t => anim.forEach(f => f(t)); tick(0.3);
  return tick;
}
