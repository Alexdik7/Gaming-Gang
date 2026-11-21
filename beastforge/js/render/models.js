// Prozedurale 3D-Modelle (eigene Designs, keine Fremd-Assets). Jedes Modell blickt nach +z, Ursprung am Boden.
// buildModel(id, {stage, branch, tiers, skin}) → { root, tick(t, dt, st) }   st = { atk 0..1, dis, hlvl }
import * as THREE from 'three';
import { toon, glow, flat, mk, geo, merge, optimize, anim } from './toon.js';
import { buildGlb, gearOn } from './assets.js';
import { turtle as turtleX, mantis as mantisX } from './beasts.js';

const PI = Math.PI;
const S = () => geo.sphere(12), C = () => geo.cone(12), Y = () => geo.cyl(12), B = () => geo.box(), CP = () => geo.caps();
const add = (par, g, m, o) => { const x = mk(g, m, o); par.add(x); return x; };
const grp = (par, p = [0, 0, 0], r = [0, 0, 0]) => { const g = new THREE.Group(); g.position.set(...p); g.rotation.set(...r); par.add(g); return g; };
const lerpHex = (a, b, f) => new THREE.Color(a).lerp(new THREE.Color(b), f).getHex();
function skinPal(P, skin) {
  if (!skin) return P;
  const o = { ...P };
  if (skin === 'moon') { o.fur = lerpHex(P.fur, 0xe9eef9, 0.7); o.cream = 0xffffff; o.sock = lerpHex(P.sock, 0x8fa3c8, 0.6); }
  if (skin === 'star') { o.fur = 0x26305e; o.cream = 0x8fa0ff; o.sock = 0x121638; o.stars = true; }
  return o;
}
function sparkles(par, n, r, h, color = 0xffffff) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(add(par, S(), glow(color, 0.9), { p: [(Math.random() - 0.5) * r, h * 0.4 + Math.random() * h, (Math.random() - 0.5) * r], s: 0.018 + Math.random() * 0.015, ol: false }));
  return out;
}

// ───────────────────────── Detail-Bausteine ─────────────────────────
const SM = () => geo.sphere(8);
// Anime-Auge: Weiß, Iris, Pupille, zwei Glanzpunkte, Lidstrich. Blickt nach +z (lokal), sd = Seite
function eye(par, x, y, z, s, iris, o = {}) {
  const g = grp(par, [x, y, z], [0, (o.side || 0) * 0.35, 0]);
  if (!o.noWhite) add(g, S(), flat(0xfffaf4), { s: [s, s * 1.25, s * 0.45], ol: 0.008 });
  const im = o.glow ? toon(iris, { emissive: iris, emissiveIntensity: 1.3 }) : toon(iris);
  add(g, S(), im, { p: [0, -s * 0.08, s * 0.32], s: [s * 0.78, s * 1.0, s * 0.3], ol: false });
  add(g, SM(), flat(o.glow ? 0xffffff : 0x140a18), { p: [0, -s * 0.08, s * 0.44], s: [s * 0.36, s * 0.55, s * 0.12], ol: false });
  add(g, SM(), flat(0xffffff), { p: [s * 0.28 * (o.side || 1), s * 0.35, s * 0.52], s: s * 0.2, ol: false });
  add(g, SM(), flat(0xffffff), { p: [-s * 0.22 * (o.side || 1), -s * 0.35, s * 0.5], s: s * 0.1, ol: false });
  if (!o.noLid) add(g, B(), flat(0x1a1020), { p: [s * 0.1 * (o.side || 0), s * 1.22, s * 0.16], r: [0, 0, (o.side || 0) * -0.28], s: [s * 1.7, s * 0.13, s * 0.2], ol: false });
  return g;
}
const tuft = (par, p, r, s, m) => add(par, geo.cone(6), m, { p, r, s, ol: 0.01 });
function paw(par, x, y, z, m, claw, s = 1) {
  add(par, S(), m, { p: [x, y, z], s: [0.07 * s, 0.045 * s, 0.085 * s], ol: 0.01 });
  for (const k of [-1, 0, 1]) {
    add(par, SM(), m, { p: [x + k * 0.032 * s, y - 0.005, z + 0.065 * s], s: [0.026 * s, 0.026 * s, 0.03 * s], ol: 0.006 });
    if (claw) add(par, geo.cone(5), claw, { p: [x + k * 0.032 * s, y - 0.01, z + 0.1 * s], r: [PI / 2, 0, 0], s: [0.008 * s, 0.03 * s, 0.008 * s], ol: false });
  }
}
function whiskers(par, x, y, z, sd, m) { for (let i = 0; i < 3; i++) add(par, B(), m, { p: [x + sd * 0.07, y + (i - 1) * 0.018, z], r: [0, sd * 0.25, sd * (i - 1) * 0.18], s: [0.14, 0.004, 0.004], ol: false }); }

// ───────────────────────── KITSUNE ─────────────────────────
const FOX = {
  young:     { fur: 0xf08a3c, cream: 0xfff1dc, sock: 0x4a2a22, inner: 0xffc0b0, tip: 0xfff6ea, iris: 0xd88a1a },
  flame:     { fur: 0xff6a2a, cream: 0xffe6c8, sock: 0x5a221a, inner: 0xff9b7a, mark: 0xe8202a, tip: 0xffe2a0, flame: 0xff9a2a, iris: 0xff5a10 },
  spirit:    { fur: 0xf3f1ff, cream: 0xffffff, sock: 0x8fb8ff, inner: 0x9ff0ff, mark: 0x3ad0ff, eye: 0x6ff6ff, tip: 0xdffcff, flame: 0x7df3ff, iris: 0x3ad0ff },
  shadow:    { fur: 0x3a2a52, cream: 0x6d5a8c, sock: 0x1c1428, inner: 0xb07bff, mark: 0xc77bff, eye: 0xd28bff, tip: 0x9a7bd0, flame: 0xa060ff, iris: 0xc77bff },
  ninetail:  { fur: 0xfff1df, cream: 0xffffff, sock: 0xd65a3a, inner: 0xff8a8a, mark: 0xe8203a, eye: 0xffc94a, tip: 0xffd9b0, flame: 0xff7a2a, gold: 0xffc94a, iris: 0xffb020 },
  celestial: { fur: 0xfffaf0, cream: 0xffffff, sock: 0xf2c35a, inner: 0xffe2a8, mark: 0xffb020, eye: 0xfff2a8, tip: 0xfff7d8, flame: 0xffe9a0, gold: 0xffd257, iris: 0xffd257 },
  astral:    { fur: 0x2e338a, cream: 0x7884ff, sock: 0x141640, inner: 0x9fe8ff, mark: 0x9fe8ff, eye: 0xe8f8ff, tip: 0xbfe9ff, flame: 0x9fb4ff, gold: 0xc8d8ff, em: 0x1c2470, stars: true, iris: 0x9fe8ff },
};
function fox(o) {
  const st = o.stage || 0, br = o.branch || 'spirit', tiers = o.tiers || [0, 0, 0];
  const key = st === 2 ? br : ['young', 'flame', 'spirit', 'ninetail', 'celestial', 'astral'][st];
  const P = skinPal(FOX[key], o.skin);
  const root = new THREE.Group(), body = grp(root);
  const sc = [0.84, 0.94, 1.0, 1.14, 1.2, 1.28][st]; body.scale.setScalar(sc);
  const fur = toon(P.fur, P.em ? { emissive: P.em, emissiveIntensity: 0.7 } : {}), cream = toon(P.cream), sock = toon(P.sock), dark = toon(0x231a2a), claw = toon(0xf4eee4);
  // Rumpf mit Brustkrause und Rückenfell
  add(body, S(), fur, { p: [0, 0.42, -0.02], s: [0.25, 0.24, 0.35] });
  add(body, S(), cream, { p: [0, 0.37, 0.05], s: [0.19, 0.17, 0.28], ol: false });
  add(body, S(), fur, { p: [0, 0.5, 0.18], s: [0.21, 0.22, 0.17] });
  for (let i = 0; i < 5; i++) tuft(body, [(i - 2) * 0.055, 0.4 - Math.abs(i - 2) * 0.02, 0.29], [0.5, 0, (i - 2) * 0.2], [0.05, 0.13, 0.04], cream);
  for (let i = 0; i < 3; i++) tuft(body, [0, 0.64 - i * 0.02, -0.04 - i * 0.12], [-0.9, 0, 0], [0.05, 0.1, 0.04], fur);
  // Beine: Ober-/Unterschenkel + Pfoten mit Zehen
  for (const [x, z, f] of [[-0.12, 0.2, 1], [0.12, 0.2, 1], [-0.13, -0.18, 0], [0.13, -0.18, 0]]) {
    add(body, CP(), fur, { p: [x, f ? 0.3 : 0.33, z], r: [f ? 0 : 0.25, 0, 0], s: [f ? 0.1 : 0.14, 0.13, f ? 0.1 : 0.15] });
    add(body, CP(), sock, { p: [x, 0.13, z + (f ? 0.01 : -0.02)], s: [0.075, 0.13, 0.075] });
    paw(body, x, 0.04, z + 0.02, sock, claw, 0.9);
  }
  // Kopf
  const head = grp(body, [0, 0.72, 0.27]);
  add(head, S(), fur, { s: [0.21, 0.19, 0.2] });
  add(head, S(), fur, { p: [0, 0.06, -0.04], s: [0.18, 0.15, 0.17] });
  add(head, C(), fur, { p: [0, -0.045, 0.19], r: [PI / 2, 0, 0], s: [0.1, 0.22, 0.075] });
  add(head, S(), cream, { p: [0, -0.085, 0.15], s: [0.1, 0.06, 0.12], ol: 0.01 });
  add(head, S(), dark, { p: [0, -0.038, 0.3], s: [0.03, 0.024, 0.024], ol: false });
  add(head, SM(), flat(0xffffff), { p: [-0.008, -0.03, 0.322], s: 0.007, ol: false });
  add(head, B(), dark, { p: [0, -0.1, 0.22], s: [0.05, 0.006, 0.006], ol: false });
  for (const sd of [-1, 1]) {
    // Wangenfell (drei Büschel)
    for (let i = 0; i < 3; i++) tuft(head, [sd * (0.17 + i * 0.015), -0.06 - i * 0.025, 0.02 - i * 0.03], [0.2, 0, sd * (1.9 + i * 0.25)], [0.045, 0.12, 0.035], cream);
    // Ohren mit Innenfell
    const ear = grp(head, [sd * 0.11, 0.16, -0.03], [-0.1, 0, -sd * 0.28]);
    add(ear, C(), fur, { p: [0, 0.14, 0], s: [0.09, 0.29, 0.06] });
    add(ear, C(), toon(P.inner), { p: [0, 0.11, 0.022], s: [0.055, 0.19, 0.03], ol: false });
    tuft(ear, [sd * 0.01, 0.06, 0.035], [0.3, 0, sd * 0.3], [0.025, 0.08, 0.015], cream);
    add(ear, C(), sock, { p: [0, 0.255, 0], s: [0.045, 0.07, 0.033], ol: false });
    eye(head, sd * 0.085, 0.035, 0.155, 0.046, P.iris, { side: sd, glow: !!P.eye });
    if (P.mark) { add(head, B(), flat(P.mark), { p: [sd * 0.135, -0.015, 0.12], r: [0, sd * 0.7, sd * 0.35], s: [0.085, 0.016, 0.01], ol: false }); add(head, B(), flat(P.mark), { p: [sd * 0.12, -0.045, 0.13], r: [0, sd * 0.7, sd * 0.15], s: [0.06, 0.013, 0.01], ol: false }); }
  }
  for (let i = 0; i < 3; i++) tuft(head, [(i - 1) * 0.04, 0.17, 0.05 - Math.abs(i - 1) * 0.02], [0.6, 0, (i - 1) * 0.4], [0.035, 0.09, 0.03], fur);
  if (P.mark) add(head, geo.oct(), toon(P.mark, { emissive: P.mark, emissiveIntensity: 0.6 }), { p: [0, 0.13, 0.16], r: [0.5, 0, 0], s: [0.022, 0.04, 0.012], ol: false });
  // Schweife: buschig, mehrschichtig, Spitze mit Flammenbüschel
  const n = [1, 2, 3, 9, 9, 9][st], tails = [];
  const tipM = P.flame ? toon(P.tip, { emissive: P.flame, emissiveIntensity: 0.45 }) : toon(P.tip);
  for (let i = 0; i < n; i++) {
    const base = n === 1 ? 0 : (i / (n - 1) - 0.5) * (n > 3 ? 2.5 : 1.0);
    const tg = grp(body, [0, 0.44, -0.3], [-0.2, base * 0.25, base]);
    const k = n > 3 ? 0.82 : 1;
    add(tg, S(), fur, { p: [0, 0.05 * k, -0.12 * k], s: [0.1 * k, 0.1 * k, 0.14 * k] });
    add(tg, S(), fur, { p: [0, 0.19 * k, -0.24 * k], s: [0.15 * k, 0.15 * k, 0.17 * k] });
    add(tg, S(), fur, { p: [0, 0.34 * k, -0.3 * k], s: [0.15 * k, 0.15 * k, 0.15 * k] });
    for (let j = 0; j < 3; j++) tuft(tg, [(j - 1) * 0.06 * k, 0.33 * k, -0.4 * k], [-1.2, 0, (j - 1) * 0.5], [0.05 * k, 0.12 * k, 0.04 * k], fur);
    add(tg, S(), tipM, { p: [0, 0.48 * k, -0.3 * k], s: [0.11 * k, 0.12 * k, 0.11 * k] });
    for (let j = 0; j < 3; j++) tuft(tg, [(j - 1) * 0.045 * k, 0.58 * k, -0.3 * k], [0, 0, (j - 1) * 0.45], [0.04 * k, 0.11 * k, 0.04 * k], tipM);
    if (P.flame && st >= 1) add(tg, C(), glow(P.flame, 0.8), { p: [0, 0.7 * k, -0.28 * k], s: [0.07 * k, 0.22 * k, 0.07 * k], ol: false });
    tg.userData.base = base; tails.push(tg);
  }
  const floaters = [];
  if (st === 1) for (const sd of [-1, 1]) floaters.push(add(root, S(), glow(0xffa040, 0.85), { p: [sd * 0.45, 0.85, -0.1], s: 0.05, ol: false }));
  if (st === 2 && br === 'spirit') { // Magatama-Kette
    for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 2.2; add(body, SM(), toon(i % 2 ? 0x3ad0ff : 0xffffff, { emissive: 0x3ad0ff, emissiveIntensity: 0.4 }), { p: [Math.sin(a) * 0.17, 0.58 - Math.cos(a) * 0.05, 0.2 + Math.cos(a) * 0.08], s: 0.028, ol: 0.006 }); }
  }
  if (st === 2 && br === 'shadow') add(head, geo.torus(0.25), toon(0xc77bff, { emissive: 0x8a30ff, emissiveIntensity: 0.8 }), { p: [0, 0.14, 0.13], r: [0.4, 0, 0.6], s: 0.035, ol: false });
  if (st >= 3) { // Shimenawa-Seil mit Papierstreifen + Glocke
    add(body, geo.torus(0.22), toon(0xf2e6c8), { p: [0, 0.6, 0.2], r: [PI / 2.4, 0, 0], s: 0.16 });
    add(body, geo.torus(0.12), toon(0xd8342c), { p: [0, 0.6, 0.2], r: [PI / 2.4, 0, 0.3], s: 0.17, ol: false });
    for (const sd of [-1, 1]) { const sh = grp(body, [sd * 0.1, 0.52, 0.31]); for (let j = 0; j < 3; j++) add(sh, B(), flat(0xffffff), { p: [(j % 2) * 0.012 * sd, -j * 0.03, 0], r: [0, 0, (j % 2 ? 1 : -1) * 0.4], s: [0.03, 0.03, 0.004], ol: false }); }
    add(body, S(), toon(P.gold, { emissive: P.gold, emissiveIntensity: 0.35 }), { p: [0, 0.48, 0.34], s: 0.048 });
  }
  let halo = null, runes = null, rings = [];
  if (st >= 4) {
    halo = add(head, geo.torus(0.07), glow(P.gold, 0.95), { p: [0, 0.14, -0.14], s: 0.25, ol: false });
    // Goldene Stirnkrone + Schulterplatten
    add(head, B(), toon(P.gold, { emissive: 0x7a5a10, emissiveIntensity: 0.4 }), { p: [0, 0.14, 0.12], r: [0.5, 0, 0], s: [0.14, 0.03, 0.02], ol: 0.008 });
    add(head, geo.oct(), toon(0x6ff6ff, { emissive: 0x3ad0ff, emissiveIntensity: 1 }), { p: [0, 0.16, 0.135], s: [0.025, 0.04, 0.015], ol: false });
    for (const sd of [-1, 1]) add(body, S(), toon(P.gold, { emissive: 0x7a5a10, emissiveIntensity: 0.3 }), { p: [sd * 0.17, 0.55, 0.15], r: [0, 0, sd * 0.5], s: [0.09, 0.04, 0.11] });
    runes = grp(root, [0, 0.55 * sc, 0]);
    for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; add(runes, B(), glow(P.gold, 0.9), { p: [Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62], r: [0, -a, 0], s: [0.09, 0.13, 0.01], ol: false }); }
  }
  if (st >= 5) {
    for (const sd of [-1, 1]) add(head, geo.oct(), toon(0xbfe9ff, { emissive: 0x6fa0ff, emissiveIntensity: 0.9 }), { p: [sd * 0.06, 0.2, 0.02], r: [-0.4, 0, -sd * 0.3], s: [0.025, 0.09, 0.025], ol: 0.008 });
    for (let i = 0; i < 2; i++) rings.push(add(root, geo.torus(0.025), glow(i ? 0x9fe8ff : 0xc8a8ff, 0.8), { p: [0, 0.6, 0], r: [PI / 2 + i * 0.6, i * 0.8, 0], s: 0.75 + i * 0.12, ol: false }));
  }
  if (P.stars) sparkles(body, 16, 0.55, 0.8, 0xdfe8ff);
  // Pfad-Optik
  if (tiers[2] >= 1) {
    add(body, geo.torus(0.3), toon(0xc8283a), { p: [0, 0.58, 0.16], r: [PI / 2.3, 0, 0], s: 0.15 });
    const rib = grp(body, [0.08, 0.6, 0.05]);
    add(rib, B(), toon(0xc8283a), { p: [0.04, -0.02, -0.14], r: [0.6, 0.3, 0], s: [0.06, 0.012, 0.22] });
  }
  if (tiers[2] >= 3) { add(body, B(), toon(0x2a2a3a), { p: [0.24, 0.38, 0], r: [0, 0, 0.2], s: [0.03, 0.12, 0.16] }); for (let j = 0; j < 3; j++) add(body, C(4), toon(0xc8ccd8), { p: [0.26, 0.47, -0.05 + j * 0.05], s: [0.012, 0.07, 0.012], ol: false }); }
  if (tiers[0] >= 3) for (const sd of [-1, 1]) add(body, C(), glow(0xff8a2a, 0.75), { p: [sd * 0.12, 0.68, -0.08], r: [0, 0, sd * 0.3], s: [0.06, 0.22, 0.06], ol: false });
  let ofuda = null;
  if (tiers[1] >= 3) {
    ofuda = grp(root, [0, 0.8 * sc, 0]);
    for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2; const p = add(ofuda, B(), flat(0xfff8ec), { p: [Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45], r: [0, -a, 0], s: [0.07, 0.16, 0.005], ol: false }); add(p, B(), flat(0xd8203a), { p: [0, 0.1, 0.6], s: [0.6, 0.15, 1], ol: false }); }
  }
  anim(body, head, runes, ofuda, ...tails);
  const tick = (t, dt, s) => {
    const float = st >= 5 ? 0.22 + Math.sin(t * 1.6) * 0.05 : 0;
    body.position.y = Math.abs(Math.sin(t * 3.4)) * 0.012 + float;
    body.position.z = (s.atk || 0) * 0.07;
    head.rotation.x = -(s.atk || 0) * 0.35 + Math.sin(t * 1.3) * 0.04;
    head.rotation.z = Math.sin(t * 0.9) * 0.05;
    tails.forEach((tg, i) => { tg.rotation.z = tg.userData.base + Math.sin(t * 2.3 + i * 0.7) * 0.12; tg.rotation.x = -0.2 + Math.sin(t * 1.9 + i) * 0.08; });
    floaters.forEach((f, i) => { f.position.y = 0.85 + Math.sin(t * 2.5 + i * 3) * 0.08; });
    if (halo) halo.rotation.z = t * 0.6;
    if (runes) { runes.rotation.y = t * 0.8; runes.position.y = 0.55 * sc + float + Math.sin(t * 2) * 0.04; }
    if (ofuda) ofuda.rotation.y = -t * 1.1;
    rings.forEach((r, i) => { r.rotation.z = t * (0.5 + i * 0.3); r.position.y = 0.6 * sc + float; });
  };
  return { root, tick, height: 1.0 * sc };
}

// ───────────────────────── DONNERTIGER ─────────────────────────
function tiger(o) {
  const st = o.stage || 0;
  const P = skinPal({ fur: [0xf2b02c, 0xffc83a, 0xfff2d8][st], cream: 0xfff6e6, sock: 0x1d2550, inner: 0xff9a8a }, o.skin);
  const root = new THREE.Group(), body = grp(root); const sc = [0.9, 1.05, 1.22][st]; body.scale.setScalar(sc);
  const fur = toon(P.fur), cream = toon(P.cream), stripe = toon(st === 2 ? 0x2a3ea0 : P.sock), elec = 0x7fe3ff, claw = toon(0xf4f0e8);
  // muskulöser Körper: Brust, Schultern, Hüfte
  add(body, CP(), fur, { p: [0, 0.42, -0.02], r: [PI / 2, 0, 0], s: [0.38, 0.36, 0.4] });
  add(body, S(), fur, { p: [0, 0.47, 0.2], s: [0.22, 0.22, 0.2] });
  add(body, S(), fur, { p: [0, 0.44, -0.24], s: [0.2, 0.2, 0.18] });
  add(body, S(), cream, { p: [0, 0.35, 0.08], s: [0.15, 0.11, 0.28], ol: false });
  for (let i = 0; i < 5; i++) tuft(body, [(i - 2) * 0.05, 0.36, 0.33], [0.6, 0, (i - 2) * 0.2], [0.04, 0.1, 0.035], cream);
  for (let i = 0; i < 5; i++) for (const sd of [-1, 1]) add(body, B(), stripe, { p: [sd * 0.185, 0.5 - (i % 2) * 0.03, -0.26 + i * 0.12], r: [0, 0, sd * 0.45], s: [0.045, 0.17, 0.03], ol: false });
  for (let i = 0; i < 4; i++) add(body, B(), stripe, { p: [0, 0.645, -0.22 + i * 0.12], r: [0, (i % 2 - 0.5) * 0.3, 0], s: [0.2, 0.02, 0.032], ol: false });
  for (const [x, z, f] of [[-0.14, 0.2, 1], [0.14, 0.2, 1], [-0.14, -0.22, 0], [0.14, -0.22, 0]]) {
    add(body, S(), fur, { p: [x, 0.43, z], s: [0.12, 0.14, 0.13] });
    add(body, CP(), fur, { p: [x, 0.2, z], s: [0.12, 0.22, 0.12] });
    add(body, B(), stripe, { p: [x + Math.sign(x) * 0.055, 0.25, z], r: [0, 0, 0.3 * Math.sign(x)], s: [0.012, 0.06, 0.05], ol: false });
    paw(body, x, 0.05, z + 0.02, fur, claw, 1.2);
  }
  const head = grp(body, [0, 0.64, 0.36]);
  add(head, S(), fur, { s: [0.22, 0.2, 0.2] });
  add(head, S(), cream, { p: [0, -0.06, 0.12], s: [0.15, 0.1, 0.11] });
  for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) tuft(head, [sd * (0.18 + i * 0.01), -0.07 - i * 0.03, 0.02], [0, 0, sd * (2 + i * 0.25)], [0.04, 0.11, 0.03], cream);
  add(head, S(), toon(0x3a2030), { p: [0, -0.02, 0.21], s: [0.045, 0.03, 0.03], ol: false });
  add(head, B(), toon(0x3a2030), { p: [0, -0.1, 0.2], s: [0.06, 0.006, 0.01], ol: false });
  for (const sd of [-1, 1]) {
    add(head, S(), fur, { p: [sd * 0.15, 0.15, -0.02], s: [0.075, 0.075, 0.04] });
    add(head, S(), toon(P.inner), { p: [sd * 0.15, 0.15, 0.005], s: [0.045, 0.045, 0.012], ol: false });
    eye(head, sd * 0.085, 0.035, 0.165, 0.038, st ? elec : 0x5ab84a, { side: sd, glow: st > 0 });
    for (let i = 0; i < 2; i++) add(head, B(), stripe, { p: [sd * (0.05 + i * 0.05), 0.14 - i * 0.02, 0.14 - i * 0.03], r: [0.3, 0, sd * (0.4 + i * 0.2)], s: [0.025, 0.08, 0.01], ol: false });
    add(head, B(), stripe, { p: [sd * 0.19, 0.02, 0.06], r: [0, sd * 0.9, 0], s: [0.07, 0.018, 0.01], ol: false });
    whiskers(head, sd * 0.09, -0.06, 0.16, sd, flat(0xffffff));
    if (st >= 1) {
      const h = grp(head, [sd * 0.1, 0.17, -0.02], [-0.3, 0, -sd * 0.35]);
      const hm = toon(0xffe14d, { emissive: 0xffd000, emissiveIntensity: 0.8 });
      add(h, B(), hm, { p: [0, 0.06, 0], r: [0, 0, sd * 0.4], s: [0.035, 0.12, 0.035], ol: 0.01 });
      add(h, B(), hm, { p: [sd * 0.03, 0.15, 0], r: [0, 0, -sd * 0.4], s: [0.03, 0.1, 0.03], ol: 0.01 });
      add(h, B(), hm, { p: [0, 0.23, 0], r: [0, 0, sd * 0.4], s: [0.022, 0.08, 0.022], ol: 0.01 });
    }
  }
  for (let i = 0; i < 3; i++) add(head, B(), stripe, { p: [(i - 1) * 0.04, 0.17, 0.1], r: [0.5, 0, (i - 1) * 0.3], s: [0.018, 0.07, 0.01], ol: false });
  let mane = null;
  if (st >= 1) add(body, geo.torus(0.18), toon(0x2a3a7a, { emissive: 0x2a5aff, emissiveIntensity: 0.3 }), { p: [0, 0.58, 0.28], r: [PI / 2.2, 0, 0], s: 0.17 });
  if (st >= 2) {
    mane = grp(body, [0, 0.6, 0.24]);
    for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; add(mane, C(), toon(0xfff2d8, { emissive: elec, emissiveIntensity: 0.3 }), { p: [Math.cos(a) * 0.19, Math.sin(a) * 0.19, -0.02], r: [0, 0, a - PI / 2], s: [0.065, 0.22, 0.065] }); }
    for (const sd of [-1, 1]) { add(body, S(), toon(0x3a5ad8, { emissive: 0x1a3aaa, emissiveIntensity: 0.3 }), { p: [sd * 0.2, 0.55, 0.17], r: [0, 0, sd * 0.5], s: [0.1, 0.05, 0.12] }); add(body, C(4), toon(0xffe14d, { emissive: 0xffc000, emissiveIntensity: 0.6 }), { p: [sd * 0.25, 0.6, 0.17], r: [0, 0, -sd * 1.1], s: [0.03, 0.09, 0.03], ol: false }); }
  }
  const tail = grp(body, [0, 0.5, -0.38], [-0.9, 0, 0]);
  add(tail, CP(), fur, { p: [0, 0.18, 0], s: [0.07, 0.3, 0.07] });
  for (let i = 0; i < 3; i++) add(tail, geo.cyl(10), stripe, { p: [0, 0.1 + i * 0.09, 0], s: [0.072, 0.018, 0.072], ol: false });
  const tipC = add(tail, S(), st ? glow(elec, 0.9) : stripe, { p: [0, 0.38, 0], s: 0.065, ol: false });
  if (o.tiers?.[2] >= 4) add(body, geo.torus(0.06), glow(elec, 0.6), { p: [0, 0.05, 0], r: [PI / 2, 0, 0], s: 0.7, ol: false });
  anim(body, head, tail, mane);
  const tick = (t, dt, s) => {
    body.position.y = Math.sin(t * 2.6) * 0.01; body.position.z = (s.atk || 0) * 0.06;
    head.rotation.x = -(s.atk || 0) * 0.45; tail.rotation.z = Math.sin(t * 2) * 0.35;
    tipC.scale.setScalar(0.065 * (st ? 1 + Math.sin(t * 20) * 0.2 : 1));
    if (mane) mane.rotation.z = Math.sin(t * 3) * 0.05;
  };
  return { root, tick, height: 0.9 * sc };
}

// ───────────────────────── EISENSCHILDKRÖTE ─────────────────────────
// ───────────────────────── GEISTHIRSCH ─────────────────────────
function deer(o) {
  const st = o.stage || 0, tiers = o.tiers || [0, 0, 0];
  const P = skinPal({ fur: [0xc68a52, 0xd99a5e, 0xf5f0ff][st], cream: 0xfff3e2, sock: 0x3a2a24, inner: 0xffb8b0 }, o.skin);
  const root = new THREE.Group(), body = grp(root); const sc = [0.85, 1.0, 1.12][st]; body.scale.setScalar(sc);
  const fur = toon(P.fur, st === 2 ? { emissive: 0x3a4a7a, emissiveIntensity: 0.2 } : {}), cream = toon(P.cream), hoof = toon(P.sock);
  add(body, S(), fur, { p: [0, 0.56, 0], s: [0.19, 0.19, 0.33] });
  add(body, S(), cream, { p: [0, 0.5, 0.05], s: [0.14, 0.12, 0.26], ol: false });
  add(body, S(), fur, { p: [0, 0.6, 0.2], s: [0.16, 0.18, 0.14] });
  for (let i = 0; i < 9; i++) add(body, SM(), cream, { p: [(i % 2 ? 1 : -1) * (0.1 + (i % 3) * 0.02), 0.67 - (i % 3) * 0.03, -0.2 + i * 0.045], s: [0.022, 0.01, 0.022], ol: false });
  for (const [x, z, f] of [[-0.1, 0.18, 1], [0.1, 0.18, 1], [-0.1, -0.22, 0], [0.1, -0.22, 0]]) {
    add(body, S(), fur, { p: [x, 0.47, z], s: [0.07, 0.11, 0.08] });
    add(body, Y(), fur, { p: [x, 0.3, z + (f ? 0 : -0.02)], s: [0.035, 0.24, 0.035], ol: 0.01 });
    add(body, S(), fur, { p: [x, 0.19, z], s: 0.035, ol: 0.008 });
    add(body, Y(), fur, { p: [x, 0.11, z], s: [0.028, 0.16, 0.028], ol: 0.008 });
    add(body, Y(6), hoof, { p: [x, 0.03, z + 0.005], s: [0.035, 0.05, 0.04], ol: 0.008 });
  }
  add(body, Y(), fur, { p: [0, 0.8, 0.27], r: [0.45, 0, 0], s: [0.065, 0.34, 0.065] });
  add(body, S(), cream, { p: [0, 0.76, 0.33], r: [0.45, 0, 0], s: [0.05, 0.13, 0.04], ol: false });
  tuft(body, [0, 0.6, -0.33], [-2.4, 0, 0], [0.05, 0.1, 0.04], cream);
  const head = grp(body, [0, 0.99, 0.38]);
  add(head, S(), fur, { s: [0.12, 0.12, 0.14] });
  add(head, S(), fur, { p: [0, -0.04, 0.12], s: [0.075, 0.07, 0.1] });
  add(head, S(), cream, { p: [0, -0.07, 0.13], s: [0.06, 0.04, 0.08], ol: false });
  add(head, S(), toon(0x2a1a20), { p: [0, -0.025, 0.215], s: [0.028, 0.02, 0.02], ol: false });
  for (const sd of [-1, 1]) {
    eye(head, sd * 0.078, 0.03, 0.08, 0.034, st === 2 ? 0x9ff0ff : 0x5a3a24, { side: sd, glow: st === 2 });
    for (let i = 0; i < 3; i++) add(head, B(), flat(0x1a1020), { p: [sd * (0.09 + i * 0.008), 0.075 + i * 0.006, 0.09 - i * 0.004], r: [0, 0, sd * (0.4 + i * 0.3)], s: [0.025, 0.004, 0.004], ol: false });
    const ear = grp(head, [sd * 0.12, 0.07, -0.03], [0, 0, sd * 0.6]);
    add(ear, S(), fur, { p: [sd * 0.03, 0, 0], s: [0.07, 0.03, 0.04] });
    add(ear, S(), toon(P.inner), { p: [sd * 0.035, 0, 0.012], s: [0.045, 0.018, 0.02], ol: false });
  }
  const ant = st === 2 ? toon(0xbff6ff, { emissive: 0x6fd8ff, emissiveIntensity: 0.7 }) : toon(0xe8d8b8);
  const leaf = st === 0 ? 0x8fe86a : st === 1 ? 0xffa8c8 : 0xbff6ff;
  const lights = [];
  for (const sd of [-1, 1]) {
    const a = grp(head, [sd * 0.06, 0.1, -0.02], [0, 0, -sd * 0.35]);
    const L = 0.22 + st * 0.07;
    add(a, Y(6), ant, { p: [0, L / 2, 0], s: [0.018, L, 0.018], ol: 0.008 });
    for (let k = 0; k < 2 + st; k++) {
      const y = L * (0.35 + k * 0.25), br = grp(a, [0, y, 0], [0, 0, sd * (0.8 + k * 0.1)]);
      add(br, Y(6), ant, { p: [0, 0.06, 0], s: [0.014, 0.12, 0.014], ol: 0.008 });
      lights.push(add(br, S(), glow(leaf, 0.95), { p: [0, 0.13, 0], s: 0.03 + st * 0.008, ol: false }));
      if (st < 2) add(br, S(), toon(st ? 0xff8ab8 : 0x6ac04a), { p: [sd * 0.02, 0.09, 0.01], s: [0.025, 0.012, 0.018], ol: false });
    }
  }
  // Blütenkranz am Hals
  for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * 2.6; add(body, SM(), toon(i % 3 === 0 ? 0xffffff : leaf === 0xbff6ff ? 0x9fe8ff : 0xff9ac8), { p: [Math.sin(a) * 0.1, 0.84 - Math.cos(a) * 0.03, 0.3 + Math.cos(a) * 0.06], s: 0.024, ol: 0.005 }); }
  if (tiers[1] >= 2) add(body, geo.torus(0.25), toon(0xffc94a, { emissive: 0xffa000, emissiveIntensity: 0.4 }), { p: [0, 0.72, 0.2], r: [PI / 2.2, 0, 0], s: 0.08 });
  let orbs = null;
  anim(body, head);
  if (st >= 1 || tiers[0] >= 3) { orbs = grp(root, [0, 0.9, 0]); anim(orbs); for (let i = 0; i < 3; i++) { const a = i / 3 * PI * 2; add(orbs, S(), glow(leaf, 0.85), { p: [Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5], s: 0.04, ol: false }); } }
  const tick = (t, dt, s) => {
    head.rotation.x = Math.sin(t * 0.7) * 0.1 - (s.atk || 0) * 0.3; body.position.y = Math.sin(t * 1.8) * 0.008;
    lights.forEach((l, i) => l.scale.setScalar((0.03 + st * 0.008) * (1 + Math.sin(t * 3 + i) * 0.25)));
    if (orbs) { orbs.rotation.y = t * 0.6; orbs.position.y = 0.9 * sc + Math.sin(t * 1.5) * 0.06; }
  };
  return { root, tick, height: 1.2 * sc };
}

// ───────────────────────── SCHATTENRABE ─────────────────────────
function raven(o) {
  const st = o.stage || 0;
  const P = skinPal({ fur: [0x2a2340, 0x241c38, 0x1a1030][st], cream: 0xffffff, sock: 0x5a5060, inner: 0x9a7bff }, o.skin);
  const root = new THREE.Group();
  const stone = toon(0x9a9aa0), stone2 = toon(0x8a8a90);
  add(root, Y(8), stone, { p: [0, 0.03, 0], s: [0.17, 0.06, 0.17] });
  add(root, Y(8), stone2, { p: [0, 0.2, 0], s: [0.065, 0.32, 0.065] });
  add(root, B(), stone, { p: [0, 0.4, 0], s: [0.24, 0.05, 0.24] });
  add(root, Y(8), toon(0x6a4a32), { p: [0, 0.45, 0], r: [0, 0, PI / 2], s: [0.03, 0.3, 0.03] });
  const body = grp(root, [0, 0.62, 0]); const sc = [0.9, 1.0, 1.18][st]; body.scale.setScalar(sc);
  const fur = toon(P.fur, st === 2 ? { emissive: 0x3a1a6a, emissiveIntensity: 0.4 } : {}), fur2 = toon(lerpHex(P.fur, 0x6a5aa0, 0.35)), purple = 0xb07bff, beak = toon(0x4a4a58), talon = toon(0x3a3640);
  add(body, S(), fur, { p: [0, 0.12, 0], r: [0.3, 0, 0], s: [0.15, 0.17, 0.24] });
  add(body, S(), fur2, { p: [0, 0.08, 0.06], r: [0.3, 0, 0], s: [0.11, 0.12, 0.15], ol: false });
  for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) add(body, S(), fur, { p: [sd * 0.08, 0.18 - i * 0.02, -0.04 - i * 0.05], r: [0.4, sd * 0.3, 0], s: [0.06, 0.02, 0.08], ol: 0.008 });
  for (const sd of [-1, 1]) { add(body, Y(6), talon, { p: [sd * 0.05, -0.08, 0.02], s: [0.012, 0.1, 0.012], ol: false }); for (const k of [-1, 0, 1]) add(body, C(5), talon, { p: [sd * 0.05 + k * 0.018, -0.15, 0.04], r: [PI / 2, 0, 0], s: [0.008, 0.05, 0.008], ol: false }); }
  const head = grp(body, [0, 0.3, 0.14]);
  add(head, S(), fur, { s: 0.12 });
  add(head, C(), beak, { p: [0, -0.01, 0.15], r: [PI / 2, 0, 0], s: [0.04, 0.15, 0.035] });
  add(head, C(), beak, { p: [0, -0.035, 0.12], r: [PI / 2 + 0.2, 0, 0], s: [0.03, 0.09, 0.022], ol: false });
  for (let i = 0; i < 3; i++) tuft(head, [0, 0.1 - i * 0.01, -0.03 - i * 0.04], [-1 - i * 0.2, 0, 0], [0.025, 0.1, 0.018], fur);
  for (const sd of [-1, 1]) eye(head, sd * 0.065, 0.03, 0.085, 0.026, 0xff3a5a, { side: sd, glow: true, noWhite: true });
  if (st >= 1) {
    add(head, S(), toon(0xf6f2ea), { p: [0, 0.02, 0.05], s: [0.11, 0.09, 0.1], ol: 0.008 });
    for (const sd of [-1, 1]) { add(head, B(), flat(0xd8203a), { p: [sd * 0.05, 0.06, 0.145], r: [0, 0, sd * 0.5], s: [0.05, 0.012, 0.01], ol: false }); add(head, B(), flat(0xd8203a), { p: [sd * 0.06, -0.02, 0.135], r: [0, 0, -sd * 0.4], s: [0.03, 0.01, 0.01], ol: false }); add(head, S(), toon(0xff3a5a, { emissive: 0xff2040, emissiveIntensity: 1.4 }), { p: [sd * 0.05, 0.025, 0.142], s: 0.02, ol: false }); }
  }
  const wings = [];
  const nW = st >= 2 ? 2 : 1;
  for (let k = 0; k < nW; k++) for (const sd of [-1, 1]) {
    const w = grp(body, [sd * 0.12, 0.2 - k * 0.08, -0.02 - k * 0.05]);
    add(w, S(), fur, { p: [sd * 0.15, 0, -0.02], s: [0.18, 0.035, 0.11] });
    for (let f = 0; f < 5; f++) add(w, B(), f % 2 ? fur : fur2, { p: [sd * (0.22 + f * 0.045), -0.01, -0.07 - f * 0.015], r: [0, sd * (0.15 + f * 0.12), 0], s: [0.04, 0.012, 0.2 + f * 0.015], ol: 0.006 });
    if (st >= 2) add(w, S(), glow(purple, 0.7), { p: [sd * 0.3, -0.01, -0.18], s: [0.22, 0.012, 0.03], ol: false });
    w.userData = { sd, k }; wings.push(w);
  }
  const tail = grp(body, [0, 0.06, -0.22]);
  for (let i = -2; i <= 2; i++) add(tail, B(), i % 2 ? fur2 : fur, { p: [i * 0.03, 0, -0.1], r: [0.2, i * 0.22, 0], s: [0.04, 0.012, 0.22], ol: 0.006 });
  let aura = null; if (st >= 2) aura = add(root, geo.torus(0.05), glow(purple, 0.5), { p: [0, 0.48, 0], r: [PI / 2, 0, 0], s: 0.35, ol: false });
  anim(body, head, tail, ...wings);
  const tick = (t, dt, s) => {
    const a = s.atk || 0;
    body.position.y = 0.62 + Math.sin(t * 2.4) * 0.03 + a * 0.05;
    for (const w of wings) { const f = Math.sin(t * (5 + w.userData.k * 2) + w.userData.k) * 0.25 + a * 0.9; w.rotation.z = w.userData.sd * (0.25 + f); }
    head.rotation.x = -a * 0.5; head.rotation.y = Math.sin(t * 0.7) * 0.3; tail.rotation.x = Math.sin(t * 2) * 0.1;
    if (aura) aura.rotation.z = t;
  };
  return { root, tick, height: 1.1 * sc };
}

// ───────────────────────── HELD: KAIRO ─────────────────────────
function kairo(o) {
  const lvl = o.hlvl || 1, form = lvl >= 20 ? 2 : lvl >= 15 ? 1 : 0;
  const root = new THREE.Group(), body = grp(root); body.scale.setScalar(0.95 + form * 0.06);
  const skin = toon(0xffd9bd), suit = toon(form === 2 ? 0x1c1a3a : 0x23305a), suit2 = toon(form === 2 ? 0x2a2858 : 0x34457a), trim = toon(form === 2 ? 0xffd257 : 0xff9b3d);
  const hair = toon(0xff8a2a, form ? { emissive: 0xff5a00, emissiveIntensity: 0.25 } : {}), red = toon(0xd6283a), dark = toon(0x2a2a36), wrap = toon(0xf2ece0), metal = toon(0xc8ccd8);
  const legs = [];
  for (const sd of [-1, 1]) {
    const l = grp(body, [sd * 0.07, 0.3, 0]);
    add(l, CP(), suit, { p: [0, -0.12, 0], s: [0.09, 0.19, 0.09] });
    for (let i = 0; i < 3; i++) add(l, geo.torus(0.3), wrap, { p: [0, -0.17 - i * 0.025, 0], r: [PI / 2, 0, 0], s: 0.045, ol: false });
    add(l, B(), dark, { p: [0, -0.27, 0.02], s: [0.07, 0.03, 0.12], ol: 0.008 });
    add(l, B(), red, { p: [0, -0.25, 0.04], s: [0.075, 0.012, 0.02], ol: false });
    legs.push(l);
  }
  add(body, B(), dark, { p: [0.11, 0.25, 0.03], s: [0.05, 0.08, 0.06] }); // Kunai-Tasche
  add(body, CP(), suit, { p: [0, 0.46, 0], s: [0.2, 0.2, 0.15] });
  add(body, B(), suit2, { p: [0, 0.5, 0.07], r: [0, 0, 0.0], s: [0.04, 0.18, 0.02], ol: false });
  for (const sd of [-1, 1]) add(body, B(), trim, { p: [sd * 0.045, 0.52, 0.075], r: [0, 0, sd * 0.35], s: [0.025, 0.18, 0.012], ol: false });
  add(body, geo.torus(0.25), trim, { p: [0, 0.38, 0], r: [PI / 2, 0, 0], s: 0.105 });
  add(body, S(), trim, { p: [0.06, 0.37, 0.09], s: [0.03, 0.025, 0.02], ol: 0.006 });
  for (const sd of [-1, 1]) add(body, B(), trim, { p: [0.06 + sd * 0.012, 0.32, 0.095], r: [0, 0, sd * 0.3], s: [0.018, 0.08, 0.008], ol: false });
  const arms = [];
  for (const sd of [-1, 1]) {
    const a = grp(body, [sd * 0.13, 0.55, 0]);
    add(a, S(), suit2, { p: [0, 0, 0], s: [0.065, 0.06, 0.065] });
    add(a, CP(), suit, { p: [0, -0.1, 0], s: [0.065, 0.13, 0.065] });
    for (let i = 0; i < 3; i++) add(a, geo.torus(0.3), wrap, { p: [0, -0.13 - i * 0.025, 0], r: [PI / 2, 0, 0], s: 0.036, ol: false });
    add(a, S(), dark, { p: [0, -0.21, 0], s: 0.045, ol: 0.01 });
    if (sd > 0) add(a, C(4), metal, { p: [0, -0.27, 0.03], r: [PI / 2.5, 0, 0], s: [0.018, 0.12, 0.006], ol: 0.006 });
    a.userData.sd = sd; arms.push(a);
  }
  const blade = grp(body, [0.05, 0.5, -0.11], [0, 0, 0.7]);
  add(blade, B(), toon(0x2a1a14), { p: [0, -0.06, 0], s: [0.03, 0.2, 0.03] });
  for (let i = 0; i < 4; i++) add(blade, B(), wrap, { p: [0, 0.07 + i * 0.022, 0], r: [0, 0, (i % 2 ? 0.3 : -0.3)], s: [0.034, 0.01, 0.034], ol: false });
  add(blade, B(), toon(0xffd257), { p: [0, 0.04, 0], s: [0.06, 0.012, 0.04], ol: 0.005 });
  add(body, geo.torus(0.35), red, { p: [0, 0.6, 0.0], r: [PI / 2, 0, 0], s: 0.115 });
  add(body, geo.torus(0.3), red, { p: [0, 0.64, 0.0], r: [PI / 2, 0, 0], s: 0.1, ol: false });
  const scarf = grp(body, [0.04, 0.6, -0.08]);
  add(scarf, B(), red, { p: [0.03, -0.04, -0.12], r: [0.5, 0.2, 0], s: [0.07, 0.012, 0.24] });
  add(scarf, B(), red, { p: [-0.04, -0.06, -0.1], r: [0.7, -0.3, 0], s: [0.06, 0.012, 0.2], ol: false });
  const head = grp(body, [0, 0.82, 0]);
  add(head, S(), skin, { s: [0.17, 0.17, 0.16] });
  add(head, S(), toon(0x3a3a48), { p: [0, -0.065, 0.06], s: [0.155, 0.095, 0.13], ol: 0.01 });
  for (const sd of [-1, 1]) {
    eye(head, sd * 0.062, 0.025, 0.135, 0.03, form === 2 ? 0xffc94a : form ? 0xff8a2a : 0x3a7ad8, { side: sd, glow: form > 0 });
    add(head, B(), hair, { p: [sd * 0.065, 0.07, 0.14], r: [0, 0, sd * -0.25], s: [0.05, 0.012, 0.01], ol: false });
    const ear = grp(head, [sd * 0.1, 0.15, -0.02], [0, 0, -sd * 0.35]);
    add(ear, C(), hair, { p: [0, 0.07, 0], s: [0.055, 0.15, 0.035] });
    add(ear, C(), toon(0xffe0c8), { p: [0, 0.06, 0.015], s: [0.03, 0.09, 0.015], ol: false });
  }
  add(head, S(), hair, { p: [0, 0.07, -0.03], s: [0.18, 0.14, 0.17] });
  for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * 2.6; add(head, C(), hair, { p: [Math.sin(a) * 0.13, 0.13 + Math.cos(a) * 0.07, -0.07 + (i % 2) * 0.03], r: [-0.7 - (i % 2) * 0.3, 0, -a * 0.8], s: [0.06 + (i % 3) * 0.008, 0.2, 0.06] }); }
  for (let i = 0; i < 3; i++) add(head, C(), hair, { p: [-0.05 + i * 0.05, 0.12, 0.12], r: [1.2, 0, (i - 1) * 0.4], s: [0.045, 0.14, 0.035] });
  const m = grp(head, [-0.15, 0.06, 0.02], [0, -1.1, 0.2]); add(m, S(), toon(0xfaf6ee), { s: [0.07, 0.08, 0.04], ol: 0.008 }); add(m, B(), flat(0xd6283a), { p: [0, 0.02, 0.04], s: [0.06, 0.008, 0.005], ol: false });
  for (const sd of [-1, 1]) add(m, C(), toon(0xfaf6ee), { p: [sd * 0.04, 0.08, 0], r: [0, 0, -sd * 0.3], s: [0.02, 0.05, 0.015], ol: false });
  const tails = [];
  const nT = form === 2 ? 9 : form === 1 ? 3 : 0;
  for (let i = 0; i < nT; i++) { const b = nT === 1 ? 0 : (i / (nT - 1) - 0.5) * 2.2; const tg = grp(body, [0, 0.36, -0.08], [-0.5, b * 0.2, b]); add(tg, C(), glow(form === 2 ? 0xffb030 : 0xff7a2a, 0.75), { p: [0, 0.2, -0.08], r: [-0.4, 0, 0], s: [0.06, 0.42, 0.06], ol: false }); tg.userData.base = b; tails.push(tg); }
  anim(body, head, scarf, ...arms, ...tails);
  let aura = null; if (form) aura = add(root, geo.torus(0.05), glow(0xff8a2a, 0.55), { p: [0, 0.04, 0], r: [PI / 2, 0, 0], s: 0.4, ol: false });
  const tick = (t, dt, s) => {
    const a = s.atk || 0;
    body.position.y = Math.abs(Math.sin(t * 3)) * 0.015;
    arms.forEach(ar => { ar.rotation.x = ar.userData.sd > 0 ? -a * 2.2 + Math.sin(t * 3) * 0.1 : Math.sin(t * 3 + 1) * 0.1; });
    head.rotation.y = Math.sin(t * 0.8) * 0.15; scarf.rotation.y = Math.sin(t * 4) * 0.2;
    tails.forEach((tg, i) => { tg.rotation.z = tg.userData.base + Math.sin(t * 3 + i) * 0.12; });
    if (aura) aura.scale.setScalar(0.4 + Math.sin(t * 4) * 0.03);
  };
  return { root, tick, height: 1.1 };
}

// ───────────────────────── DRACHENWOLF ─────────────────────────
function dragonwolf(o) {
  const st = o.stage || 0, tiers = o.tiers || [0, 0, 0];
  const fire = tiers[1] >= 1;
  const P = skinPal({ fur: [0xbfe4ff, 0x9fd0ff, 0x8ab8ff][st], cream: 0xf4fbff, sock: 0x2a3a6a, inner: 0x9fd8ff }, o.skin);
  const root = new THREE.Group(), body = grp(root); const sc = [0.92, 1.06, 1.22][st]; body.scale.setScalar(sc);
  const fur = toon(P.fur), cream = toon(P.cream), scale = toon(fire ? 0x6a2a2a : 0x2a4a8a), horn = toon(0xe8f4ff, { emissive: fire ? 0xff6a20 : 0x6ad0ff, emissiveIntensity: 0.35 }), claw = toon(0xf0f4ff);
  const glowC = fire ? 0xff8a30 : 0x8fe8ff;
  add(body, CP(), fur, { p: [0, 0.42, -0.02], r: [PI / 2, 0, 0], s: [0.34, 0.34, 0.38] });
  add(body, S(), fur, { p: [0, 0.48, 0.2], s: [0.21, 0.22, 0.19] });
  add(body, S(), cream, { p: [0, 0.36, 0.1], s: [0.14, 0.1, 0.25], ol: false });
  for (let i = 0; i < 6; i++) tuft(body, [(i - 2.5) * 0.045, 0.4, 0.33], [0.6, 0, (i - 2.5) * 0.18], [0.04, 0.12, 0.035], cream);
  for (let i = 0; i < 6; i++) add(body, geo.oct(), scale, { p: [0, 0.62 - i * 0.012, 0.18 - i * 0.1], r: [0.3, 0, 0], s: [0.05, 0.08, 0.06], ol: 0.008 });
  for (const [x, z] of [[-0.13, 0.2], [0.13, 0.2], [-0.13, -0.2], [0.13, -0.2]]) {
    add(body, S(), fur, { p: [x, 0.42, z], s: [0.1, 0.12, 0.11] });
    add(body, CP(), fur, { p: [x, 0.2, z], s: [0.1, 0.22, 0.1] });
    add(body, geo.oct(), scale, { p: [x * 1.3, 0.26, z], s: [0.025, 0.05, 0.04], ol: false });
    paw(body, x, 0.05, z + 0.02, toon(P.sock), claw, 1.05);
  }
  const head = grp(body, [0, 0.64, 0.33]);
  add(head, S(), fur, { s: [0.19, 0.17, 0.19] });
  add(head, C(), fur, { p: [0, -0.04, 0.19], r: [PI / 2, 0, 0], s: [0.1, 0.24, 0.08] });
  add(head, S(), cream, { p: [0, -0.08, 0.16], s: [0.09, 0.05, 0.12], ol: 0.01 });
  add(head, S(), toon(0x1a2030), { p: [0, -0.03, 0.31], s: [0.03, 0.022, 0.022], ol: false });
  for (const sd of [-1, 1]) {
    add(head, C(5), claw, { p: [sd * 0.04, -0.1, 0.24], r: [PI, 0, 0], s: [0.012, 0.04, 0.012], ol: false });
    for (let i = 0; i < 3; i++) tuft(head, [sd * (0.15 + i * 0.015), -0.05 - i * 0.025, 0.0], [0.2, 0, sd * (2 + i * 0.2)], [0.04, 0.11, 0.03], cream);
    const ear = grp(head, [sd * 0.1, 0.14, -0.04], [-0.2, 0, -sd * 0.2]);
    add(ear, C(), fur, { p: [0, 0.1, 0], s: [0.07, 0.22, 0.05] });
    add(ear, C(), toon(P.inner), { p: [0, 0.08, 0.018], s: [0.04, 0.14, 0.02], ol: false });
    eye(head, sd * 0.075, 0.035, 0.145, 0.04, glowC, { side: sd, glow: true });
    if (st >= 1) { const h = grp(head, [sd * 0.08, 0.12, -0.1], [-0.9, 0, -sd * 0.35]); add(h, C(), horn, { p: [0, 0.1, 0], s: [0.035, 0.22, 0.035], ol: 0.008 }); add(h, C(), horn, { p: [sd * 0.03, 0.06, 0.03], r: [0.4, 0, -sd * 0.5], s: [0.02, 0.1, 0.02], ol: false }); }
  }
  const wings = [];
  if (st >= 2) for (const sd of [-1, 1]) {
    const w = grp(body, [sd * 0.16, 0.6, 0.05]);
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(sd * 0.45, 0.24); sh.lineTo(sd * 0.4, -0.03); sh.lineTo(sd * 0.3, -0.13); sh.lineTo(sd * 0.16, -0.1); sh.lineTo(0, -0.08);
    const mem = new THREE.Mesh(new THREE.ShapeGeometry(sh), toon(fire ? 0x8a2a2a : 0x2a4aa8, { side: THREE.DoubleSide })); mem.rotation.x = -PI / 2; mem.castShadow = true; w.add(mem);
    add(w, Y(6), scale, { p: [sd * 0.22, 0.01, -0.11], r: [0, 0, PI / 2], s: [0.02, 0.46, 0.02], ol: false });
    w.userData.sd = sd; wings.push(w);
  }
  const tail = grp(body, [0, 0.48, -0.4], [-0.6, 0, 0]);
  add(tail, CP(), fur, { p: [0, 0.16, 0], s: [0.09, 0.28, 0.09] });
  for (let i = 0; i < 3; i++) add(tail, geo.oct(), scale, { p: [0, 0.08 + i * 0.1, -0.06], s: [0.03, 0.05, 0.04], ol: false });
  const tip = add(tail, C(), glow(glowC, 0.85), { p: [0, 0.38, 0], s: [0.07, 0.18, 0.07], ol: false });
  if (tiers[0] >= 3) for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; add(body, C(5), toon(0xdff8ff, { emissive: 0x6ad0ff, emissiveIntensity: 0.6 }), { p: [Math.cos(a) * 0.2, 0.63, Math.sin(a) * 0.15], r: [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6], s: [0.025, 0.12, 0.025], ol: false }); }
  anim(body, head, tail, ...wings);
  const tick = (t, dt, s) => {
    const a = s.atk || 0;
    body.position.y = Math.sin(t * 2.5) * 0.01; head.rotation.x = -a * 0.25 + Math.sin(t * 1.1) * 0.05; body.position.z = a * 0.04;
    tail.rotation.z = Math.sin(t * 2.2) * 0.35; { const f = 1 + Math.sin(t * 14) * 0.15; tip.scale.set(0.07 * f, 0.18 * f, 0.07 * f); }
    wings.forEach(w => { w.rotation.z = w.userData.sd * (0.3 + Math.sin(t * 2) * 0.15 + a * 0.4); });
  };
  return { root, tick, height: 0.9 * sc };
}

// ───────────────────────── MANTISKLINGE ─────────────────────────

// ───────────────────────── FELSGOLEM ─────────────────────────
function golem(o) {
  const st = o.stage || 0, tiers = o.tiers || [0, 0, 0];
  const lava = tiers[1] >= 3;
  const P = skinPal({ fur: [0x9a9288, 0x8a8aa0, 0x7a7068][st], cream: 0x5aa040, sock: 0x6a6258, inner: 0xffa040 }, o.skin);
  const root = new THREE.Group(), body = grp(root); const sc = [1.0, 1.1, 1.3][st]; body.scale.setScalar(sc);
  const rock = toon(P.fur), rock2 = toon(lerpHex(P.fur, 0x000000, 0.18)), moss = toon(P.cream), glowC = lava ? 0xff6a20 : st === 1 ? 0x6ad0ff : 0xffb040;
  const rune = toon(glowC, { emissive: glowC, emissiveIntensity: 1.1 });
  const legs = [];
  for (const sd of [-1, 1]) { const l = grp(body, [sd * 0.13, 0.22, 0]); add(l, geo.dodec(), rock2, { p: [0, -0.06, 0], s: [0.1, 0.14, 0.11] }); add(l, B(), rock, { p: [0, -0.18, 0.02], s: [0.15, 0.07, 0.18] }); legs.push(l); }
  add(body, geo.dodec(), rock, { p: [0, 0.5, 0], s: [0.27, 0.25, 0.22] });
  add(body, geo.dodec(), rock2, { p: [0, 0.36, 0.02], s: [0.2, 0.12, 0.17] });
  add(body, S(), moss, { p: [0.04, 0.68, -0.04], s: [0.22, 0.05, 0.16] });
  for (let i = 0; i < 4; i++) tuft(body, [-0.12 + i * 0.08, 0.72, -0.02 + (i % 2) * 0.05], [0, 0, (i - 1.5) * 0.3], [0.025, 0.07, 0.025], toon(0x7ac85a));
  add(body, B(), rune, { p: [0, 0.52, 0.205], s: [0.06, 0.06, 0.01], r: [0, 0, PI / 4], ol: false });
  for (const sd of [-1, 1]) add(body, B(), rune, { p: [sd * 0.12, 0.45, 0.19], r: [0, 0, sd * 0.6], s: [0.012, 0.09, 0.01], ol: false });
  const head = grp(body, [0, 0.76, 0.06]);
  add(head, geo.dodec(), rock, { s: [0.13, 0.11, 0.12] });
  add(head, B(), rock2, { p: [0, 0.03, 0.08], s: [0.18, 0.03, 0.06], ol: false });
  for (const sd of [-1, 1]) add(head, B(), rune, { p: [sd * 0.05, 0.0, 0.11], s: [0.035, 0.02, 0.01], ol: false });
  const arms = [];
  for (const sd of [-1, 1]) {
    const a = grp(body, [sd * 0.3, 0.6, 0.02]);
    add(a, geo.dodec(), rock2, { s: [0.11, 0.1, 0.1] });
    add(a, geo.dodec(), rock, { p: [sd * 0.03, -0.17, 0.02], s: [0.09, 0.13, 0.09] });
    add(a, geo.dodec(), rock, { p: [sd * 0.04, -0.34, 0.04], s: [0.12, 0.1, 0.12] });
    a.userData.sd = sd; arms.push(a);
  }
  if (st >= 1) for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; add(body, geo.oct(), toon(st === 1 ? 0x9fe8ff : 0xc8a8ff, { emissive: st === 1 ? 0x3ad0ff : 0x8a5aff, emissiveIntensity: 0.6 }), { p: [Math.cos(a) * 0.18, 0.66 + (i % 2) * 0.05, -0.08 + Math.sin(a) * 0.1], r: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5], s: [0.035, 0.1, 0.035], ol: 0.006 }); }
  if (st >= 2) { for (const sd of [-1, 1]) { add(body, C(5), rock2, { p: [sd * 0.3, 0.76, 0], r: [0, 0, -sd * 0.3], s: [0.1, 0.22, 0.1] }); add(body, C(5), toon(0xf4f4f8), { p: [sd * 0.31, 0.86, 0], r: [0, 0, -sd * 0.3], s: [0.05, 0.08, 0.05], ol: false }); } add(body, C(6), toon(0x2f7a46), { p: [-0.1, 0.8, -0.08], s: [0.05, 0.14, 0.05], ol: 0.006 }); add(body, C(6), toon(0x2f7a46), { p: [0.12, 0.79, -0.1], s: [0.04, 0.11, 0.04], ol: 0.006 }); }
  if (tiers[2] >= 1) { add(body, geo.dodec(), rock2, { p: [0.05, 0.8, -0.16], s: 0.09 }); }
  if (lava) for (let i = 0; i < 3; i++) add(body, B(), rune, { p: [-0.08 + i * 0.08, 0.6 - i * 0.05, -0.2], r: [0, 0, 0.5 * i], s: [0.012, 0.1, 0.01], ol: false });
  anim(body, head, ...arms, ...legs);
  const tick = (t, dt, s) => {
    const a = s.atk || 0;
    body.position.y = Math.sin(t * 1.2) * 0.01 - a * 0.05;
    arms.forEach(ar => { ar.rotation.x = -a * 1.6 + Math.sin(t * 1.2 + ar.userData.sd) * 0.05; ar.rotation.z = ar.userData.sd * (0.1 + a * 0.3); });
    head.rotation.y = Math.sin(t * 0.5) * 0.2;
  };
  return { root, tick, height: 1.0 * sc };
}

// ───────────────────────── HELD: RAIZEN ─────────────────────────
function raizen(o) {
  const lvl = o.hlvl || 1, form = lvl >= 20 ? 2 : lvl >= 15 ? 1 : 0;
  const root = new THREE.Group(), body = grp(root); body.scale.setScalar(1.0 + form * 0.05);
  const suit = toon(0x1a1e30), suit2 = toon(0x2a3050), steel = toon(0x9aa4b8), wrap = toon(0x3a4058), elec = 0x7fe3ff;
  const hair = toon(0xeef4ff, form ? { emissive: 0x6ad0ff, emissiveIntensity: 0.2 } : {}), visor = toon(elec, { emissive: elec, emissiveIntensity: 1.5 });
  for (const sd of [-1, 1]) { const l = grp(body, [sd * 0.07, 0.32, 0]); add(l, CP(), suit, { p: [0, -0.13, 0], s: [0.085, 0.21, 0.085] }); add(l, B(), steel, { p: [0, -0.15, 0.045], s: [0.06, 0.1, 0.02], ol: 0.006 }); add(l, B(), toon(0x10121a), { p: [0, -0.29, 0.02], s: [0.07, 0.03, 0.12], ol: 0.008 }); }
  add(body, CP(), suit, { p: [0, 0.5, 0], s: [0.2, 0.22, 0.15] });
  add(body, B(), steel, { p: [0, 0.54, 0.075], s: [0.14, 0.12, 0.02], ol: 0.008 });
  for (let i = 0; i < 3; i++) add(body, B(), suit2, { p: [0, 0.6 - i * 0.04, 0.088], s: [0.12, 0.01, 0.005], ol: false });
  add(body, geo.torus(0.25), wrap, { p: [0, 0.4, 0], r: [PI / 2, 0, 0], s: 0.105 });
  const arms = [];
  for (const sd of [-1, 1]) {
    const a = grp(body, [sd * 0.14, 0.58, 0]);
    add(a, S(), steel, { s: [0.07, 0.06, 0.07] });
    add(a, CP(), suit, { p: [0, -0.11, 0], s: [0.065, 0.14, 0.065] });
    add(a, B(), steel, { p: [0, -0.15, 0.03], s: [0.05, 0.08, 0.02], ol: 0.006 });
    add(a, S(), toon(0x10121a), { p: [0, -0.22, 0], s: 0.045, ol: 0.008 });
    a.userData.sd = sd; arms.push(a);
  }
  const sword = grp(body, [-0.06, 0.52, -0.1], [0, 0, -0.6]);
  add(sword, B(), toon(0x10121a), { p: [0, -0.04, 0], s: [0.03, 0.14, 0.03] });
  add(sword, B(), toon(0xdff8ff, { emissive: elec, emissiveIntensity: form ? 0.8 : 0.3 }), { p: [0, 0.2, 0], s: [0.02, 0.34, 0.035], ol: 0.006 });
  const head = grp(body, [0, 0.85, 0]);
  add(head, S(), suit, { s: [0.16, 0.16, 0.15] });
  add(head, B(), visor, { p: [0, 0.02, 0.135], s: [0.18, 0.03, 0.03], ol: false });
  add(head, S(), steel, { p: [0, -0.05, 0.08], s: [0.13, 0.08, 0.1], ol: 0.008 });
  for (let i = 0; i < 6; i++) { const a = (i / 5 - 0.5) * 2; add(head, C(), hair, { p: [Math.sin(a) * 0.11, 0.13, -0.06], r: [-0.9, 0, -a * 0.7], s: [0.05, 0.2, 0.05] }); }
  const tail = grp(head, [0, 0.08, -0.14], [-1.2, 0, 0]); add(tail, C(), hair, { p: [0, 0.16, 0], s: [0.05, 0.34, 0.05] });
  let aura = null; if (form) aura = add(root, geo.torus(0.04), glow(elec, 0.6), { p: [0, 0.04, 0], r: [PI / 2, 0, 0], s: 0.42, ol: false });
  const sparks = []; if (form === 2) for (let i = 0; i < 3; i++) sparks.push(add(root, B(), glow(elec, 0.9), { p: [0, 0.6, 0], s: [0.012, 0.18, 0.012], ol: false }));
  anim(body, head, tail, ...arms);
  const tick = (t, dt, s) => {
    const a = s.atk || 0;
    body.position.y = Math.sin(t * 2) * 0.008;
    arms.forEach(ar => { ar.rotation.x = ar.userData.sd > 0 ? -a * 2 : Math.sin(t * 2) * 0.05; });
    tail.rotation.z = Math.sin(t * 3) * 0.2; visor.emissiveIntensity = 1.2 + Math.sin(t * 6) * 0.4;
    if (aura) aura.rotation.z = t * 2;
    sparks.forEach((sp, i) => { const ang = t * 3 + i * 2.1; sp.position.set(Math.cos(ang) * 0.32, 0.4 + Math.sin(t * 7 + i) * 0.2, Math.sin(ang) * 0.32); sp.rotation.z = Math.sin(t * 20 + i); });
  };
  return { root, tick, height: 1.15 };
}

// ───────────────────────── HELDIN: MIKA ─────────────────────────
function mika(o) {
  const lvl = o.hlvl || 1, form = lvl >= 20 ? 2 : lvl >= 15 ? 1 : 0;
  const root = new THREE.Group(), body = grp(root); body.scale.setScalar(0.95 + form * 0.05);
  const skin = toon(0xffe0cc), robe = toon(0xfaf6ff), robe2 = toon(0xff8ab8), hair = toon(0x2a6a7a, form ? { emissive: 0x2a8aa0, emissiveIntensity: 0.25 } : {}), gold = toon(0xffd257), pink = 0xff9ac8;
  add(body, C(), robe, { p: [0, 0.25, 0], s: [0.2, 0.5, 0.18] });
  add(body, geo.cyl(16), robe2, { p: [0, 0.04, 0], s: [0.205, 0.05, 0.185], ol: 0.008 });
  add(body, CP(), robe, { p: [0, 0.48, 0], s: [0.16, 0.16, 0.13] });
  for (const sd of [-1, 1]) add(body, B(), robe2, { p: [sd * 0.035, 0.5, 0.065], r: [0, 0, sd * 0.4], s: [0.025, 0.2, 0.01], ol: false });
  add(body, geo.torus(0.3), robe2, { p: [0, 0.42, 0], r: [PI / 2, 0, 0], s: 0.095 });
  add(body, B(), robe2, { p: [0, 0.4, -0.1], s: [0.14, 0.06, 0.04], ol: 0.006 });
  const arms = [];
  for (const sd of [-1, 1]) {
    const a = grp(body, [sd * 0.11, 0.55, 0]);
    add(a, C(), robe, { p: [0, -0.1, 0], s: [0.07, 0.2, 0.07] });
    add(a, S(), skin, { p: [0, -0.21, 0.01], s: 0.03, ol: 0.006 });
    a.userData.sd = sd; arms.push(a);
  }
  const staff = grp(arms[1], [0, -0.2, 0.03]);
  add(staff, Y(6), toon(0x8a6a4a), { p: [0, 0.1, 0], s: [0.015, 0.6, 0.015], ol: 0.006 });
  add(staff, geo.torus(0.15), gold, { p: [0, 0.42, 0], s: 0.05, ol: 0.005 });
  const bell = add(staff, S(), glow(pink, 0.9), { p: [0, 0.42, 0], s: 0.03, ol: false });
  const head = grp(body, [0, 0.78, 0]);
  add(head, S(), skin, { s: [0.15, 0.15, 0.14] });
  for (const sd of [-1, 1]) { eye(head, sd * 0.055, 0.0, 0.12, 0.03, form === 2 ? 0xffd257 : 0xd85aa0, { side: sd, glow: form > 0 }); add(head, SM(), toon(0xffb0c0), { p: [sd * 0.08, -0.04, 0.11], s: [0.025, 0.012, 0.01], ol: false }); }
  add(head, S(), hair, { p: [0, 0.05, -0.02], s: [0.16, 0.13, 0.15] });
  add(head, B(), hair, { p: [0, 0.07, 0.11], r: [0.3, 0, 0], s: [0.2, 0.05, 0.03], ol: 0.006 });
  for (const sd of [-1, 1]) add(head, CP(), hair, { p: [sd * 0.13, -0.08, -0.02], s: [0.05, 0.22, 0.05] });
  add(head, CP(), hair, { p: [0, -0.12, -0.12], r: [0.2, 0, 0], s: [0.09, 0.3, 0.07] });
  const lotus = grp(head, [0.1, 0.1, 0.02]);
  for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; add(lotus, S(), toon(pink), { p: [Math.cos(a) * 0.03, 0, Math.sin(a) * 0.03], r: [0, -a, 0.6], s: [0.025, 0.01, 0.015], ol: false }); }
  add(lotus, SM(), gold, { s: 0.012, ol: false });
  const orbs = grp(root, [0, 0.6, 0]);
  for (let i = 0; i < 3; i++) { const a = i / 3 * PI * 2; add(orbs, S(), glow(i % 2 ? pink : 0xbff6ff, 0.8), { p: [Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32], s: 0.035, ol: false }); }
  const wings = [];
  if (form) for (const sd of [-1, 1]) for (let k = 0; k < (form === 2 ? 3 : 2); k++) { const w = grp(body, [sd * 0.06, 0.55, -0.08], [0, 0, sd * (0.4 + k * 0.4)]); add(w, S(), glow(form === 2 ? 0xffd2e8 : pink, 0.5), { p: [sd * 0.18, 0, -0.03], s: [0.2, 0.06, 0.012], ol: false }); w.userData = { sd, k }; wings.push(w); }
  anim(body, head, orbs, ...arms, ...wings);
  const tick = (t, dt, s) => {
    const a = s.atk || 0;
    body.position.y = Math.sin(t * 1.8) * 0.012 + (form ? 0.05 : 0);
    arms.forEach(ar => { ar.rotation.x = ar.userData.sd > 0 ? -a * 1.4 - 0.2 : Math.sin(t * 2) * 0.08; });
    orbs.rotation.y = t * 0.9; orbs.position.y = 0.6 + Math.sin(t * 1.5) * 0.05;
    bell.scale.setScalar(0.03 * (1 + Math.sin(t * 5) * 0.2));
    wings.forEach(w => { w.rotation.z = w.userData.sd * (0.4 + w.userData.k * 0.4 + Math.sin(t * 2.5) * 0.1); });
  };
  return { root, tick, height: 1.1 };
}

const BUILDERS = { kitsune: fox, tiger, turtle: turtleX, deer, raven, kairo, dragonwolf, mantis: mantisX, golem, raizen, mika };
export function buildModel(id, o = {}) { const g = buildGlb(id, o); if (g) return g; const m = (BUILDERS[id] || fox)(o); optimize(m.root); return (id === 'turtle' || id === 'mantis') && o.tiers ? gearOn(m, o.tiers) : m; }

// ───────────────────────── GEGNER (verschmolzen für Instancing) ─────────────────────────
const sp = () => geo.sphere(12), cn = () => geo.cone(8), bx = () => geo.box(), cy = () => geo.cyl(8), cap = () => geo.caps();
export const ENEMY_GEO = {
  slime: () => merge([[sp(), 0x7fd05a, [0, 0.24, 0], 0, [0.3, 0.24, 0.3]], [sp(), 0xa8f080, [0.06, 0.38, 0.06], 0, [0.1, 0.06, 0.1]],
    [sp(), 0xffffff, [-0.09, 0.38, 0.17], 0, [0.07, 0.08, 0.06]], [sp(), 0xffffff, [0.09, 0.38, 0.17], 0, [0.07, 0.08, 0.06]], [sp(), 0x1a1424, [-0.09, 0.4, 0.21], 0, 0.04], [sp(), 0x1a1424, [0.09, 0.4, 0.21], 0, 0.04],
    [sp(), 0x4a9a2a, [0, 0.33, 0.27], 0, [0.05, 0.02, 0.02]], [geo.cone(6), 0x9af070, [0.02, 0.5, -0.02], [0, 0, -0.3], [0.05, 0.12, 0.05]]]),
  wolf: () => merge([[cap(), 0x5a5a3a, [0, 0.32, 0], [PI / 2, 0, 0], [0.24, 0.3, 0.24]], [sp(), 0x6a6a44, [0, 0.42, 0.28], 0, [0.13, 0.12, 0.14]], [cn(), 0x4a4a30, [0, 0.38, 0.42], [PI / 2, 0, 0], [0.07, 0.16, 0.06]],
    [cn(), 0x4a4a30, [-0.07, 0.56, 0.24], 0, [0.04, 0.1, 0.03]], [cn(), 0x4a4a30, [0.07, 0.56, 0.24], 0, [0.04, 0.1, 0.03]], [sp(), 0xffe14d, [-0.06, 0.45, 0.39], 0, 0.022], [sp(), 0xffe14d, [0.06, 0.45, 0.39], 0, 0.022],
    ...[0, 1, 2, 3].map(i => [cn(), 0xd8d0b0, [0, 0.47, 0.12 - i * 0.12], [-0.4, 0, 0], [0.04, 0.14, 0.04]]),
    ...[[-0.1, 0.14], [0.1, 0.14], [-0.1, -0.14], [0.1, -0.14]].map(([x, z]) => [cy(), 0x4a4a30, [x, 0.12, z], 0, [0.04, 0.24, 0.04]]), [cn(), 0x5a5a3a, [0, 0.36, -0.3], [-1.9, 0, 0], [0.06, 0.25, 0.06]]]),
  boar: () => merge([[sp(), 0x7a5040, [0, 0.38, 0], 0, [0.3, 0.27, 0.38]], [sp(), 0x6a4434, [0, 0.36, 0.34], 0, [0.17, 0.16, 0.16]], [cy(), 0xe0a0a0, [0, 0.32, 0.5], [PI / 2, 0, 0], [0.07, 0.04, 0.06]],
    [cn(), 0xfff4e0, [-0.1, 0.3, 0.46], [0.6, 0, 0.3], [0.03, 0.14, 0.03]], [cn(), 0xfff4e0, [0.1, 0.3, 0.46], [0.6, 0, -0.3], [0.03, 0.14, 0.03]],
    [bx(), 0x8a96a8, [0, 0.62, 0], 0, [0.36, 0.06, 0.5]], [bx(), 0x9aa6b8, [0, 0.58, 0.18], [0.2, 0, 0], [0.3, 0.05, 0.16]], [bx(), 0x8a96a8, [0, 0.5, 0.36], [0.4, 0, 0], [0.26, 0.04, 0.14]],
    [sp(), 0xff4a3a, [-0.08, 0.42, 0.47], 0, 0.022], [sp(), 0xff4a3a, [0.08, 0.42, 0.47], 0, 0.022],
    ...[[-0.15, 0.2], [0.15, 0.2], [-0.15, -0.2], [0.15, -0.2]].map(([x, z]) => [cy(), 0x4a3028, [x, 0.12, z], 0, [0.06, 0.24, 0.06]])]),
  wisp: () => merge([[sp(), 0xdffcff, [0, 0, 0], 0, 0.15], [sp(), 0x7df3ff, [0, 0, 0], 0, 0.21], [cn(), 0x5ad8ff, [0, 0.02, -0.22], [-PI / 2, 0, 0], [0.13, 0.36, 0.13]],
    [sp(), 0x1a3a5a, [-0.06, 0.03, 0.17], 0, 0.03], [sp(), 0x1a3a5a, [0.06, 0.03, 0.17], 0, 0.03]]),
  shade: () => merge([[cn(), 0x2a1a40, [0, 0.38, 0], 0, [0.26, 0.76, 0.26]], [sp(), 0x1c1030, [0, 0.74, 0.02], 0, [0.15, 0.16, 0.15]], [cn(), 0x2a1a40, [0, 0.86, -0.04], [-0.3, 0, 0], [0.16, 0.2, 0.16]],
    [sp(), 0xd07bff, [-0.05, 0.75, 0.14], 0, 0.025], [sp(), 0xd07bff, [0.05, 0.75, 0.14], 0, 0.025]]),
  mage: () => merge([[cn(), 0x5a3a9a, [0, 0.36, 0], 0, [0.26, 0.72, 0.26]], [sp(), 0xf0d0b0, [0, 0.76, 0], 0, 0.13], [cn(), 0x3a2a7a, [0, 1.0, -0.02], [-0.2, 0, 0], [0.16, 0.4, 0.16]],
    [cy(), 0x3a2a7a, [0, 0.86, 0], 0, [0.22, 0.02, 0.22]], [cy(), 0x7a5a3a, [0.22, 0.5, 0.06], 0, [0.02, 0.9, 0.02]], [sp(), 0xc8a8ff, [0.22, 0.98, 0.06], 0, 0.07],
    [sp(), 0x1a1424, [-0.04, 0.78, 0.12], 0, 0.02], [sp(), 0x1a1424, [0.04, 0.78, 0.12], 0, 0.02]]),
  healer: () => merge([[cn(), 0xe8842a, [0, 0.34, 0], 0, [0.27, 0.68, 0.27]], [bx(), 0xc04a2a, [0, 0.42, 0.06], [0, 0, 0.6], [0.06, 0.6, 0.27]], [sp(), 0xf0c8a0, [0, 0.72, 0], 0, 0.13],
    [geo.torus(0.15), 0xff9ac8, [0, 0.78, -0.12], 0, 0.18], ...[0, 1, 2, 3, 4].map(i => [sp(), 0xffc0dc, [Math.cos(i * 1.256) * 0.18, 0.78 + Math.sin(i * 1.256) * 0.18, -0.12], 0, [0.05, 0.05, 0.02]]),
    [sp(), 0x1a1424, [-0.04, 0.74, 0.12], 0, 0.018], [sp(), 0x1a1424, [0.04, 0.74, 0.12], 0, 0.018]]),
  beetle: () => merge([[sp(), 0x2a8a8a, [0, 0.28, -0.02], 0, [0.3, 0.22, 0.34]], [bx(), 0x1a5a5a, [0, 0.42, -0.02], 0, [0.015, 0.1, 0.6]], [sp(), 0x1a3a3a, [0, 0.22, 0.3], 0, [0.15, 0.12, 0.12]],
    [cn(), 0x8affd8, [0, 0.32, 0.42], [0.9, 0, 0], [0.035, 0.2, 0.035]], [sp(), 0xff6a3a, [-0.07, 0.26, 0.4], 0, 0.02], [sp(), 0xff6a3a, [0.07, 0.26, 0.4], 0, 0.02],
    ...[-1, 1].flatMap(sd => [0, 1, 2].map(i => [cy(), 0x1a2a2a, [sd * 0.3, 0.1, -0.15 + i * 0.15], [0, 0, sd * 0.9], [0.025, 0.25, 0.025]]))]),
  mite: () => merge([[sp(), 0x3aa8a0, [0, 0.16, 0], 0, [0.18, 0.13, 0.2]], [sp(), 0x1a3a3a, [0, 0.13, 0.18], 0, [0.09, 0.07, 0.07]], [sp(), 0xff6a3a, [-0.04, 0.15, 0.24], 0, 0.015], [sp(), 0xff6a3a, [0.04, 0.15, 0.24], 0, 0.015],
    ...[-1, 1].flatMap(sd => [0, 1].map(i => [cy(), 0x1a2a2a, [sd * 0.17, 0.06, -0.05 + i * 0.1], [0, 0, sd * 0.9], [0.015, 0.15, 0.015]]))]),
  golem: () => merge([[bx(), 0x8a8478, [0, 0.85, 0], [0, 0, 0.05], [0.7, 0.62, 0.48]], [bx(), 0x9a9488, [0, 1.28, 0.08], 0, [0.36, 0.3, 0.32]], [bx(), 0x5aa040, [0, 1.18, -0.05], 0, [0.6, 0.08, 0.4]],
    [bx(), 0x7a7468, [-0.48, 0.72, 0.05], [0, 0, 0.15], [0.24, 0.6, 0.24]], [bx(), 0x7a7468, [0.48, 0.72, 0.05], [0, 0, -0.15], [0.24, 0.6, 0.24]], [bx(), 0x6a6458, [-0.18, 0.26, 0], 0, [0.24, 0.52, 0.26]], [bx(), 0x6a6458, [0.18, 0.26, 0], 0, [0.24, 0.52, 0.26]],
    [bx(), 0xffa040, [-0.08, 1.3, 0.25], 0, [0.07, 0.04, 0.02]], [bx(), 0xffa040, [0.08, 1.3, 0.25], 0, [0.07, 0.04, 0.02]], [bx(), 0xff8a2a, [0.1, 0.9, 0.245], [0, 0, 0.6], [0.02, 0.3, 0.01]]]),
  demon: () => merge([[cn(), 0xc8321a, [0, 0.3, 0], 0, [0.24, 0.6, 0.24]], [sp(), 0xe04a20, [0, 0.62, 0.02], 0, [0.17, 0.16, 0.16]], [sp(), 0xff9a2a, [0, 0.36, 0.1], 0, [0.12, 0.14, 0.08]],
    [cn(), 0x2a1a18, [-0.1, 0.78, 0], [0, 0, 0.5], [0.04, 0.16, 0.04]], [cn(), 0x2a1a18, [0.1, 0.78, 0], [0, 0, -0.5], [0.04, 0.16, 0.04]],
    [cn(), 0xffb040, [0, 0.86, -0.06], [-0.3, 0, 0], [0.09, 0.22, 0.09]], [cn(), 0xffe080, [0, 0.92, -0.08], [-0.3, 0, 0], [0.05, 0.14, 0.05]],
    [sp(), 0xfff27a, [-0.06, 0.65, 0.15], 0, 0.03], [sp(), 0xfff27a, [0.06, 0.65, 0.15], 0, 0.03], [bx(), 0x2a1a18, [0, 0.56, 0.16], 0, [0.08, 0.012, 0.01]],
    [cy(), 0xc8321a, [-0.2, 0.4, 0.05], [0.3, 0, 0.9], [0.04, 0.26, 0.04]], [cy(), 0xc8321a, [0.2, 0.4, 0.05], [0.3, 0, -0.9], [0.04, 0.26, 0.04]],
    [cn(), 0xff7a2a, [0, 0.2, -0.22], [-2.2, 0, 0], [0.05, 0.25, 0.05]]]),
  bearer: () => merge([[cy(), 0x6a5a4a, [0, 0.36, 0], 0, [0.22, 0.5, 0.2]], [sp(), 0xd8b090, [0, 0.72, 0], 0, 0.12], [cn(), 0x4a4a52, [0, 0.84, 0], 0, [0.15, 0.12, 0.15]],
    [bx(), 0x8a96a8, [0, 0.46, 0.27], 0, [0.52, 0.66, 0.06]], [bx(), 0xc8a050, [0, 0.46, 0.31], 0, [0.4, 0.06, 0.02]], [bx(), 0xc8a050, [0, 0.46, 0.31], 0, [0.06, 0.5, 0.02]],
    [sp(), 0xd8342c, [0, 0.46, 0.32], 0, [0.07, 0.07, 0.02]], [cy(), 0x7a5a3a, [0.22, 0.5, -0.05], [0.2, 0, 0], [0.02, 0.9, 0.02]], [cn(), 0xd8dde6, [0.22, 0.98, -0.0], [0.2, 0, 0], [0.04, 0.14, 0.04]],
    [cy(), 0x3a3030, [-0.08, 0.1, 0], 0, [0.06, 0.2, 0.06]], [cy(), 0x3a3030, [0.08, 0.1, 0], 0, [0.06, 0.2, 0.06]]]),
  bearerX: () => merge([[cy(), 0x6a5a4a, [0, 0.36, 0], 0, [0.22, 0.5, 0.2]], [sp(), 0xd8b090, [0, 0.72, 0], 0, 0.12], [cn(), 0x4a4a52, [0, 0.84, 0], 0, [0.15, 0.12, 0.15]],
    [bx(), 0x5a6474, [-0.12, 0.3, 0.27], [0, 0, 0.4], [0.2, 0.3, 0.05]], [cy(), 0x7a5a3a, [0.22, 0.5, -0.05], [0.2, 0, 0], [0.02, 0.9, 0.02]], [cn(), 0xd8dde6, [0.22, 0.98, -0.0], [0.2, 0, 0], [0.04, 0.14, 0.04]],
    [cy(), 0x3a3030, [-0.08, 0.1, 0], 0, [0.06, 0.2, 0.06]], [cy(), 0x3a3030, [0.08, 0.1, 0], 0, [0.06, 0.2, 0.06]]]),
};
for (const k of ['l1', 'l2', 'l3', 'l4', 'l5', 'kokon', 'whale', 'whale2']) ENEMY_GEO[k] = ENEMY_GEO.slime; // Rückfall ohne 3D-Modelle
export const ENEMY_GLOW = { wisp: true };
export const ENEMY_ALPHA = { shade: 0.62 };

// Mini-Boss und Boss: einzelne Gruppen mit Animation
export function buildOni() {
  const root = new THREE.Group(), body = grp(root); body.scale.setScalar(1.25);
  const sk = toon(0xd23a3a), pelt = toon(0xf0b030), dk = toon(0x2a2030);
  for (const sd of [-1, 1]) add(body, CP(), sk, { p: [sd * 0.14, 0.25, 0], s: [0.14, 0.3, 0.14] });
  add(body, B(), pelt, { p: [0, 0.48, 0], s: [0.42, 0.18, 0.3] });
  for (let i = 0; i < 3; i++) add(body, B(), dk, { p: [-0.1 + i * 0.1, 0.48, 0.155], s: [0.03, 0.18, 0.01], ol: false });
  add(body, CP(), sk, { p: [0, 0.78, 0], s: [0.38, 0.32, 0.28] });
  const head = grp(body, [0, 1.12, 0.04]);
  add(head, S(), sk, { s: [0.19, 0.18, 0.18] });
  for (const sd of [-1, 1]) {
    add(head, C(), toon(0xfff2d8), { p: [sd * 0.1, 0.18, 0], r: [0, 0, -sd * 0.3], s: [0.045, 0.18, 0.045] });
    add(head, S(), toon(0xffe14d, { emissive: 0xffc000, emissiveIntensity: 1 }), { p: [sd * 0.07, 0.03, 0.155], s: [0.035, 0.022, 0.02], ol: false });
    add(head, C(), toon(0xffffff), { p: [sd * 0.05, -0.1, 0.15], r: [PI, 0, 0], s: [0.02, 0.06, 0.02], ol: false });
  }
  add(head, S(), toon(0x2a1a1a), { p: [0, 0.12, -0.05], s: [0.18, 0.1, 0.16] });
  const arm = grp(body, [0.3, 0.92, 0]); add(arm, CP(), sk, { p: [0, -0.18, 0], s: [0.12, 0.3, 0.12] });
  const club = grp(arm, [0, -0.34, 0.05], [1.2, 0, 0]); add(club, Y(8), toon(0x5a4a40), { p: [0, 0.3, 0], s: [0.07, 0.65, 0.07] });
  for (let i = 0; i < 6; i++) add(club, C(6), toon(0xc8c8d0), { p: [Math.cos(i) * 0.08, 0.45 + (i % 3) * 0.08, Math.sin(i) * 0.08], r: [0, 0, PI / 2 + i], s: [0.025, 0.07, 0.025], ol: false });
  const arm2 = grp(body, [-0.3, 0.92, 0]); add(arm2, CP(), sk, { p: [0, -0.18, 0], s: [0.12, 0.3, 0.12] });
  anim(body, head, arm, arm2);
  const tick = (t, dt, s) => { body.position.y = Math.abs(Math.sin(t * 4)) * 0.04; arm.rotation.x = Math.sin(t * 2) * 0.3 - (s.cry ? 1.2 : 0); arm2.rotation.x = -Math.sin(t * 4) * 0.4; head.rotation.z = Math.sin(t * 4) * 0.06; };
  optimize(root);
  return { root, tick, height: 1.9 };
}

export function buildDragon() {
  const root = new THREE.Group(), body = grp(root); body.scale.setScalar(1.35);
  const scale = toon(0x3a2050), belly = toon(0xb0503a), horn = toon(0xe8dcc8);
  const magma = toon(0xff6a2a, { emissive: 0xff4a10, emissiveIntensity: 1.2 });
  add(body, S(), scale, { p: [0, 0.6, 0], s: [0.42, 0.36, 0.62] });
  add(body, S(), belly, { p: [0, 0.48, 0.12], s: [0.32, 0.25, 0.45] });
  for (let i = 0; i < 5; i++) add(body, C(), toon(0x6a2a40), { p: [0, 0.95 - i * 0.02, 0.35 - i * 0.2], r: [-0.4, 0, 0], s: [0.06, 0.22, 0.06] });
  for (let i = 0; i < 4; i++) add(body, B(), magma, { p: [(i % 2 ? 1 : -1) * 0.3, 0.66, 0.2 - i * 0.18], r: [0, 0.3, (i % 2 ? -1 : 1) * 0.8], s: [0.02, 0.18, 0.01], ol: false });
  for (const [x, z] of [[-0.3, 0.32], [0.3, 0.32], [-0.3, -0.3], [0.3, -0.3]]) { add(body, CP(), scale, { p: [x, 0.25, z], s: [0.15, 0.35, 0.15] }); add(body, C(), horn, { p: [x, 0.04, z + 0.1], r: [PI / 2, 0, 0], s: [0.04, 0.1, 0.04], ol: false }); }
  const neck = grp(body, [0, 0.8, 0.5], [-0.5, 0, 0]);
  add(neck, CP(), scale, { p: [0, 0.2, 0], s: [0.2, 0.42, 0.2] });
  const head = grp(neck, [0, 0.48, 0.05], [0.9, 0, 0]);
  add(head, S(), scale, { s: [0.2, 0.17, 0.26] });
  const jaw = grp(head, [0, -0.06, 0.05]); add(jaw, B(), belly, { p: [0, -0.04, 0.17], s: [0.2, 0.06, 0.3] });
  const mouth = add(head, S(), glow(0xff8a2a, 0).clone(), { p: [0, -0.06, 0.3], s: 0.08, ol: false });
  add(head, B(), scale, { p: [0, 0.02, 0.2], s: [0.22, 0.1, 0.26] });
  for (const sd of [-1, 1]) {
    add(head, C(), horn, { p: [sd * 0.12, 0.16, -0.12], r: [-1.1, 0, -sd * 0.3], s: [0.05, 0.32, 0.05] });
    add(head, S(), toon(0xffe14d, { emissive: 0xffa000, emissiveIntensity: 1.4 }), { p: [sd * 0.11, 0.06, 0.15], s: [0.04, 0.025, 0.03], ol: false });
  }
  const wings = [];
  for (const sd of [-1, 1]) {
    const w = grp(body, [sd * 0.3, 0.85, 0.1]);
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(sd * 1.1, 0.5); shape.lineTo(sd * 1.0, -0.1); shape.lineTo(sd * 0.75, -0.35); shape.lineTo(sd * 0.45, -0.3); shape.lineTo(sd * 0.2, -0.45); shape.lineTo(0, -0.2);
    const mem = new THREE.Mesh(new THREE.ShapeGeometry(shape), toon(0x6a2a50, { side: THREE.DoubleSide }));
    mem.rotation.x = -PI / 2; mem.castShadow = true; w.add(mem);
    add(w, Y(6), toon(0x2a1838), { p: [sd * 0.55, 0.01, -0.25], r: [0, 0, PI / 2], s: [0.03, 1.15, 0.03], ol: false });
    w.userData.sd = sd; wings.push(w);
  }
  const tail = []; let prev = body;
  for (let i = 0; i < 5; i++) { const g = grp(prev, i ? [0, 0, -0.22] : [0, 0.55, -0.55]); add(g, S(), scale, { p: [0, 0, -0.1], s: [0.15 - i * 0.022, 0.13 - i * 0.02, 0.16] }); tail.push(g); prev = g; }
  add(prev, C(), magma, { p: [0, 0, -0.25], r: [-PI / 2, 0, 0], s: [0.08, 0.2, 0.08], ol: false });
  const aura = add(root, geo.torus(0.06), glow(0xff3a20, 0).clone(), { p: [0, 0.05, 0], r: [PI / 2, 0, 0], s: 1.1, ol: false });
  anim(body, neck, head, jaw, ...wings, ...tail);
  const tick = (t, dt, s) => {
    const fly = s.fly ? 1 : 0;
    body.position.y += ((fly ? 1.1 : 0) + Math.sin(t * (fly ? 3 : 1.5)) * 0.05 - body.position.y) * Math.min(1, dt * 4);
    wings.forEach(w => { const flap = fly ? Math.sin(t * 9) * 0.7 : Math.sin(t * 1.5) * 0.1 - 0.6; w.rotation.z = w.userData.sd * flap; w.rotation.y = w.userData.sd * (fly ? 0 : 0.9); });
    tail.forEach((g, i) => { g.rotation.y = Math.sin(t * 2 - i * 0.6) * 0.25; });
    neck.rotation.x = -0.5 + Math.sin(t * 1.2) * 0.08 + (s.roar ? -0.3 : 0);
    jaw.rotation.x = s.breath || s.roar ? 0.5 : Math.max(0, Math.sin(t * 0.7)) * 0.1;
    mouth.material.opacity = s.breath ? 0.9 : 0.2 * (s.phase >= 2 ? 1 : 0);
    aura.material.opacity = s.phase >= 3 ? 0.5 + Math.sin(t * 8) * 0.2 : 0;
  };
  optimize(root);
  return { root, tick, height: 2.6 };
}
