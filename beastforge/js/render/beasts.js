// Aufwendige prozedurale Kreaturen (kein passendes CC0-Modell): Eisenschildkröte und Mantisklinge.
// Jede Form hat eine eigene Silhouette; Gelenke sind Gruppen und werden in tick() animiert.
import * as THREE from 'three';
import { toon, glow, flat, mk, geo, anim } from './toon.js';

const PI = Math.PI;
const S = (n = 14) => geo.sphere(n), C = (n = 10) => geo.cone(n), Y = (n = 10) => geo.cyl(n), B = () => geo.box(), D = () => geo.dodec();
const add = (par, g, m, o = {}) => { const x = mk(g, m, o); par.add(x); return x; };
const grp = (par, p = [0, 0, 0], r = [0, 0, 0]) => { const g = new THREE.Group(); g.position.set(...p); g.rotation.set(...r); par.add(g); return g; };
const UP = new THREE.Vector3(0, 1, 0);
// Glänzendes Anime-Auge (Weiß, Iris, Pupille, zwei Glanzpunkte)
function eye(par, p, s, iris, sd, glowIt = false) {
  const g = grp(par, p, [0, sd * 0.45, 0]);
  add(g, S(), flat(glowIt ? iris : 0xfffaf4), { s: [s, s * 1.2, s * 0.5], ol: 0.006 });
  if (!glowIt) { add(g, S(), flat(iris), { p: [0, -s * 0.05, s * 0.3], s: [s * 0.72, s * 0.9, s * 0.3], ol: false }); add(g, S(8), flat(0x10101a), { p: [0, -s * 0.05, s * 0.44], s: [s * 0.36, s * 0.5, s * 0.12], ol: false }); }
  add(g, S(8), flat(0xffffff), { p: [s * 0.25, s * 0.32, s * 0.5], s: s * 0.2, ol: false });
  add(g, S(8), flat(0xffffff), { p: [-s * 0.2, -s * 0.3, s * 0.48], s: s * 0.1, ol: false });
  return g;
}
// Teil auf eine Ellipsoid-Oberfläche setzen, Achse +Y entlang der Normalen
function onShell(par, g, m, th, ph, R, size, o = {}) {
  const n = new THREE.Vector3(Math.sin(ph) * Math.cos(th) / R[0], Math.cos(ph) / R[1], Math.sin(ph) * Math.sin(th) / R[2]).normalize();
  const p = new THREE.Vector3(Math.sin(ph) * Math.cos(th) * R[0], R[3] + Math.cos(ph) * R[1], Math.sin(ph) * Math.sin(th) * R[2]);
  const x = mk(g, m, { ol: o.ol ?? 0.006 }); x.position.copy(p).addScaledVector(n, o.lift || 0); x.quaternion.setFromUnitVectors(UP, n); x.scale.set(...size); par.add(x); return x;
}
const skinOf = s => s === 1 || s === 'moon' ? 1 : s === 2 || s === 'star' ? 2 : 0;

// ───────────────────────── EISENSCHILDKRÖTE ─────────────────────────
const TPAL = [
  { shell: 0x3f86a8, plate: 0x6fb8d4, edge: 0x2a5a78, rim: 0xe0b860, skin: 0x3aa088, skin2: 0x9ae0c0, belly: 0xf0d898, iris: 0x2a8a6a },
  { shell: 0x3a4250, plate: 0x8c98ac, edge: 0x262c38, rim: 0xd0a040, skin: 0x2f8070, skin2: 0x86d0b0, belly: 0xe0c888, iris: 0x2a7a8a },
  { shell: 0x6a6052, plate: 0x8a806c, edge: 0x4a4236, rim: 0x6e8a4a, skin: 0x4a8a62, skin2: 0xa0d0a8, belly: 0xd8c898, iris: 0x3ad0a0 },
];
export function turtle(o) {
  const st = o.stage || 0, tiers = o.tiers || [0, 0, 0], sk = skinOf(o.skin);
  const P = { ...TPAL[st] };
  if (sk === 1) Object.assign(P, { shell: 0xc8d8f0, plate: 0xf0f6ff, edge: 0x8aa0c8, rim: 0xffffff });
  if (sk === 2) Object.assign(P, { shell: 0x26305e, plate: 0x4a5aa8, edge: 0x141838, rim: 0x9fb4ff });
  const root = new THREE.Group(), body = grp(root), sc = [0.95, 1.12, 1.32][st]; body.scale.setScalar(sc);
  const shellM = toon(P.shell), plateM = toon(P.plate), edgeM = toon(P.edge), rimM = toon(P.rim), skin = toon(P.skin), skin2 = toon(P.skin2), belly = toon(P.belly), claw = toon(0xf0e8d8);
  const R = [0.44, 0.34, 0.5, 0.17]; // Panzer-Ellipsoid (rx, ry, rz, y)
  add(body, new THREE.SphereGeometry(1, 28, 14, 0, PI * 2, 0, PI / 2), shellM, { p: [0, R[3], 0], s: [R[0], R[1], R[2]], ol: 0.012 });
  add(body, S(), belly, { p: [0, 0.14, 0], s: [0.4, 0.07, 0.46] });
  add(body, geo.torus(0.12), rimM, { p: [0, R[3], 0], r: [PI / 2, 0, 0], s: [R[0] + 0.01, R[2] + 0.01, 0.55], ol: 0.008 });
  // Randschilde
  for (let i = 0; i < 18; i++) { const a = i / 18 * PI * 2; add(body, B(), i % 2 ? rimM : edgeM, { p: [Math.cos(a) * (R[0] + 0.035), R[3] - 0.01, Math.sin(a) * (R[2] + 0.035)], r: [0, -a, 0.25], s: [0.05, 0.05, 0.1], ol: false }); }
  // Rückenschuppen: Mitte + zwei Ringe (Sechsecke mit dunkler Kante)
  const scutes = [[0, 0, 0.15], ...Array.from({ length: 6 }, (_, i) => [i / 6 * PI * 2 + PI / 6, 0.72, 0.12]), ...Array.from({ length: 9 }, (_, i) => [i / 9 * PI * 2, 1.18, 0.095])];
  if (st < 2) for (const [th, ph, s] of scutes) {
    onShell(body, Y(6), edgeM, th, ph, R, [s * 1.15, 0.03, s * 1.15], { ol: false });
    onShell(body, Y(6), plateM, th, ph, R, [s, 0.045, s], { lift: 0.012, ol: false });
    if (st === 1) { onShell(body, S(8), toon(0xd0d6e0), th, ph, R, [0.018, 0.018, 0.018], { lift: 0.04, ol: false }); if (ph > 0.5 && ph < 1) onShell(body, C(), toon(0xe8ecf2), th, ph, R, [0.04, 0.14, 0.04], { lift: 0.06 }); }
  }
  if (st === 1) { // Stahlband + Schulterplatten
    add(body, geo.torus(0.06), toon(0x5a6272), { p: [0, R[3] + 0.06, 0], r: [PI / 2, 0, 0], s: [R[0] - 0.02, R[2] - 0.02, 0.6], ol: 0.006 });
    for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; add(body, S(8), toon(0xffd257), { p: [Math.cos(a) * (R[0] - 0.02), R[3] + 0.07, Math.sin(a) * (R[2] - 0.02)], s: 0.016, ol: false }); }
  }
  const drops = [];
  if (st === 2) { // Der Panzer ist ein Berg: Gipfel, Schnee, Kiefern, Wasserfall, Schrein
    const rock = toon(0x8a8274), rock2 = toon(0x6e675c), snow = toon(0xf4f8ff), pine = toon(0x2f7a46), pine2 = toon(0x3f9a56), moss = toon(0x5a9a40);
    for (const [x, y, z, s, r] of [[0, 0.62, -0.04, 0.24, 0], [-0.2, 0.5, 0.08, 0.17, 1], [0.21, 0.5, -0.1, 0.18, 2], [0.02, 0.48, 0.2, 0.14, 3], [-0.1, 0.46, -0.26, 0.15, 4]]) {
      add(body, D(), r % 2 ? rock2 : rock, { p: [x, y, z], r: [r, r * 1.7, r * 0.6], s: [s, s * 1.25, s], ol: 0.01 });
      add(body, C(7), snow, { p: [x, y + s * 1.05, z], r: [0, r, 0], s: [s * 0.55, s * 0.5, s * 0.55], ol: 0.006 });
    }
    add(body, C(7), snow, { p: [0, 0.98, -0.04], s: [0.09, 0.16, 0.09], ol: 0.006 });
    for (let i = 0; i < 9; i++) { const a = i / 9 * PI * 2 + 0.3, r = 0.33 + (i % 3) * 0.03; const pg = grp(body, [Math.cos(a) * r, 0.36, Math.sin(a) * r * 1.1]); add(pg, C(7), i % 2 ? pine : pine2, { p: [0, 0.07, 0], s: [0.05, 0.12, 0.05], ol: 0.005 }); add(pg, C(7), i % 2 ? pine2 : pine, { p: [0, 0.13, 0], s: [0.035, 0.09, 0.035], ol: 0.005 }); }
    for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2; add(body, S(8), moss, { p: [Math.cos(a) * (R[0] + 0.02), R[3] + 0.04, Math.sin(a) * (R[2] + 0.02)], s: [0.06, 0.03, 0.06], ol: false }); }
    add(body, B(), glow(0x7fd8ff, 0.75), { p: [0.26, 0.44, 0.16], r: [0, -0.6, -0.15], s: [0.05, 0.3, 0.01] });   // Wasserfall
    add(body, S(10), glow(0xbff4ff, 0.6), { p: [0.3, 0.29, 0.22], s: [0.07, 0.02, 0.06] });
    for (let i = 0; i < 4; i++) drops.push(add(body, S(6), glow(0xdff8ff, 0.9), { p: [0.27, 0.55, 0.17], s: 0.012 }));
    const sh = grp(body, [-0.16, 0.66, 0.12]); // kleiner Schrein auf einem Felsvorsprung
    add(sh, B(), toon(0xd8342c), { p: [0, 0.04, 0], s: [0.07, 0.07, 0.06], ol: 0.004 }); add(sh, C(4), toon(0x2a2a36), { p: [0, 0.1, 0], r: [0, PI / 4, 0], s: [0.075, 0.05, 0.075], ol: 0.004 });
    add(sh, S(8), glow(0xffd27a, 0.9), { p: [0, 0.04, 0.035], s: 0.012 });
  }
  // Hals + Kopf
  const neck = grp(body, [0, 0.19, 0.42]);
  add(neck, Y(), skin, { p: [0, 0.03, 0.05], r: [1.1, 0, 0], s: [0.085, 0.16, 0.085], ol: 0.008 });
  for (let i = 0; i < 3; i++) add(neck, geo.torus(0.25), skin2, { p: [0, 0.01 + i * 0.03, 0.02 + i * 0.03], r: [1.1, 0, 0], s: 0.085, ol: false });
  const head = grp(neck, [0, 0.1, 0.15]);
  add(head, S(), skin, { s: [0.16, 0.135, 0.17], ol: 0.01 });
  add(head, S(), skin2, { p: [0, -0.05, 0.06], s: [0.12, 0.07, 0.12], ol: false });
  add(head, C(4), toon(st === 2 ? 0x8a8274 : 0xe0d098), { p: [0, -0.02, 0.165], r: [PI / 2, PI / 4, 0], s: [0.055, 0.06, 0.035], ol: 0.006 });
  for (const sd of [-1, 1]) {
    eye(head, [sd * 0.085, 0.04, 0.115], 0.042, P.iris, sd, st === 2);
    add(head, S(8), flat(0xff9aa8), { p: [sd * 0.11, -0.025, 0.11], s: [0.025, 0.012, 0.01], ol: false });
  }
  if (st === 1) { // Stahlhelm mit Nasenhorn
    add(head, new THREE.SphereGeometry(1, 16, 8, 0, PI * 2, 0, PI / 2), toon(0x5a6272), { p: [0, 0.035, -0.01], s: [0.17, 0.12, 0.175], ol: 0.008 });
    add(head, B(), toon(0xffd257), { p: [0, 0.07, 0.12], r: [0.5, 0, 0], s: [0.025, 0.06, 0.02], ol: 0.004 });
    add(head, C(6), toon(0xe8ecf2), { p: [0, 0.04, 0.2], r: [1.1, 0, 0], s: [0.025, 0.08, 0.025], ol: 0.006 });
  }
  if (st === 2) { add(head, D(), toon(0x8a8274), { p: [0, 0.09, 0.02], r: [0.3, 0.5, 0], s: [0.14, 0.05, 0.12], ol: 0.008 }); for (const sd of [-1, 1]) add(head, S(8), toon(0x5a9a40), { p: [sd * 0.09, 0.1, -0.03], s: [0.04, 0.02, 0.04], ol: false }); }
  // Beine mit Gelenk
  const legs = [];
  for (const [x, z] of [[-0.31, 0.25], [0.31, 0.25], [-0.31, -0.25], [0.31, -0.25]]) {
    const L = grp(body, [x, 0.13, z]);
    add(L, CP(), skin, { p: [0, -0.04, 0], r: [0, 0, Math.sign(x) * 0.5], s: [0.085, 0.09, 0.085], ol: 0.008 });
    const foot = grp(L, [Math.sign(x) * 0.03, -0.09, 0]);
    add(foot, S(), skin, { s: [0.08, 0.045, 0.095], ol: 0.008 });
    for (const k of [-1, 0, 1]) add(foot, C(6), claw, { p: [k * 0.035, -0.01, 0.08 * Math.sign(z)], r: [Math.sign(z) * PI / 2, 0, 0], s: [0.012, 0.035, 0.012], ol: false });
    if (st >= 1) add(L, Y(8), toon(st === 1 ? 0x5a6272 : 0x6e675c), { p: [0, -0.02, 0], s: [0.1, 0.04, 0.1], ol: 0.005 });
    L.userData.ph = (x > 0) !== (z > 0) ? 0 : PI; legs.push(L);
  }
  const tail = grp(body, [0, 0.13, -0.5]); add(tail, C(), skin, { p: [0, 0, -0.04], r: [-PI / 2, 0, 0], s: [0.045, 0.11, 0.045], ol: 0.006 });
  // Pfad 2 (Festung): Kanone auf dem Panzer
  let cannon = null;
  if (tiers[1] >= 1) {
    cannon = grp(body, [0, st === 2 ? 0.72 : 0.55, -0.05]);
    add(cannon, S(), toon(0x4a4f5a), { s: [0.12, 0.1, 0.12], ol: 0.008 });
    add(cannon, Y(), toon(0x3a3e48), { p: [0, 0.07, 0.12], r: [PI / 2.6, 0, 0], s: [0.05 + tiers[1] * 0.008, 0.28, 0.05 + tiers[1] * 0.008], ol: 0.008 });
    add(cannon, geo.torus(0.3), toon(0xc8a060), { p: [0, 0.12, 0.25], r: [PI / 2.6 - PI / 2, 0, 0], s: 0.06, ol: false });
    if (tiers[1] >= 4) add(cannon, Y(), toon(0x3a3e48), { p: [0.09, 0.07, 0.12], r: [PI / 2.6, 0, 0], s: [0.04, 0.26, 0.04], ol: 0.006 });
  }
  anim(body, neck, head, tail, cannon, ...legs);
  const tick = (t, dt, s) => {
    const a = s.atk || 0, br = Math.sin(t * 1.6);
    // Angriff: aufbäumen (a≈1) und stampfen (a→0) – Stauchung beim Aufsetzen
    const lift = a > 0.5 ? (1 - a) * 0.16 : a * 0.16, squash = a > 0 && a < 0.35 ? (0.35 - a) * 0.25 : 0;
    body.position.y = lift; body.rotation.x = -lift * 1.2;
    body.scale.set(sc * (1 + squash + br * 0.008), sc * (1 - squash * 1.4 + br * 0.012), sc * (1 + squash + br * 0.008));
    neck.rotation.x = Math.sin(t * 0.9) * 0.08 - a * 0.25; head.rotation.y = Math.sin(t * 0.6) * 0.25; head.rotation.z = Math.sin(t * 0.7) * 0.05;
    legs.forEach(L => { L.rotation.x = Math.sin(t * 2.2 + L.userData.ph) * 0.12; L.rotation.z = a * 0.3 * Math.sign(L.position.x); });
    tail.rotation.y = Math.sin(t * 2.5) * 0.35;
    drops.forEach((d, i) => { const f = (t * 0.8 + i / drops.length) % 1; d.position.set(0.27 + f * 0.03, 0.55 - f * 0.26, 0.17 + f * 0.04); });
    if (cannon) cannon.rotation.y = s.cannon || 0;
  };
  return { root, tick, height: [0.72, 0.8, 1.25][st] * sc };
}
const CP = () => geo.caps();

// ───────────────────────── MANTISKLINGE ─────────────────────────
const MPAL = [
  { body: 0x5ac84a, body2: 0x8ae86a, belly: 0xd0f8a8, dark: 0x2a5a2a, blade: 0xe8fff0, eye: 0xffe14d, wing: 0xb8ffb0, acc: 0xffe14d },
  { body: 0x2aa88e, body2: 0x5ad8b8, belly: 0xb8f8e8, dark: 0x1a4a40, blade: 0xfff4c8, eye: 0xff6a9a, wing: 0x9ff0e0, acc: 0xffd257 },
  { body: 0x8a1a3a, body2: 0xc02a50, belly: 0xff9ab0, dark: 0x2a0a14, blade: 0xff4a6a, eye: 0xff3a3a, wing: 0xff6a8a, acc: 0xff2a5a },
];
export function mantis(o) {
  const st = o.stage || 0, sk = skinOf(o.skin), P = { ...MPAL[st] };
  if (sk === 1) Object.assign(P, { body: 0xd8f0e0, body2: 0xffffff, dark: 0x8aa8a0 });
  if (sk === 2) Object.assign(P, { body: 0x26305e, body2: 0x4a5aa8, dark: 0x141838, belly: 0x8fa0ff });
  const root = new THREE.Group(), body = grp(root), sc = [0.95, 1.08, 1.2][st]; body.scale.setScalar(sc);
  const bM = toon(P.body), b2 = toon(P.body2), bel = toon(P.belly), dark = toon(P.dark), acc = toon(P.acc, { emissive: P.acc, emissiveIntensity: st === 2 ? 0.6 : 0.25 });
  const bladeM = toon(P.blade, st === 2 ? { emissive: 0xff1a4a, emissiveIntensity: 0.9 } : {});
  // Laufbeine (2 Paare, Ober- + Unterschenkel)
  const legs = [];
  for (const [z, sp] of [[-0.02, 1], [-0.16, 1.15]]) for (const sd of [-1, 1]) {
    const L = grp(body, [sd * 0.05, 0.2, z], [0, 0, 0]);
    add(L, Y(6), bM, { p: [sd * 0.06, 0.03, 0], r: [0, 0, -sd * 1.15], s: [0.02, 0.15 * sp, 0.02], ol: 0.006 });
    const knee = grp(L, [sd * 0.13 * sp, 0.065, 0]);
    add(knee, Y(6), b2, { p: [sd * 0.05, -0.13, 0], r: [0, 0, sd * 0.4], s: [0.016, 0.29, 0.016], ol: 0.006 });
    L.userData.sd = sd; L.userData.ph = z * 9 + sd; legs.push(L);
  }
  // Hinterleib: Segmente schräg nach hinten oben
  const abd = grp(body, [0, 0.23, -0.06], [0.25, 0, 0]);
  for (let i = 0; i < 5; i++) {
    const s = 0.085 - i * 0.008 + (i === 1 ? 0.01 : 0);
    add(abd, S(), i % 2 ? b2 : bM, { p: [0, 0, -0.07 - i * 0.075], s: [s * 1.05, s * 0.85, s * 0.9], ol: 0.008 });
    add(abd, S(10), bel, { p: [0, -s * 0.45, -0.07 - i * 0.075], s: [s * 0.8, s * 0.35, s * 0.7], ol: false });
    if (st === 2 && i < 4) add(abd, C(6), dark, { p: [0, s * 0.85, -0.07 - i * 0.075], r: [-0.5, 0, 0], s: [0.02, 0.07, 0.02], ol: 0.005 });
  }
  // Flügel: angelegt (Stufe 0/1) bzw. ausgebreitet (Purpur)
  const wings = [];
  const wingMat = new THREE.MeshToonMaterial({ color: P.wing, transparent: true, opacity: st === 2 ? 0.75 : 0.55, side: THREE.DoubleSide, emissive: st === 2 ? 0x6a0a20 : 0x000000 });
  for (const sd of [-1, 1]) for (let j = 0; j < (st === 2 ? 2 : 1); j++) {
    const w = grp(body, [sd * 0.035, 0.32 - j * 0.02, -0.08]);
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(sd * 0.14, -0.12, sd * 0.06, -0.44 + j * 0.08); sh.quadraticCurveTo(sd * 0.0, -0.3, 0, 0);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh, 8), wingMat); m.rotation.x = -PI / 2 + 0.35; w.add(m);
    add(w, B(), dark, { p: [sd * 0.05, -0.02, -0.18 + j * 0.03], r: [0.35, 0, -sd * 0.15], s: [0.004, 0.004, 0.34], ol: false }); // Ader
    w.userData.sd = sd; w.userData.j = j; wings.push(w);
  }
  // Brust (lang, aufrecht) + Kopf
  const chest = grp(body, [0, 0.25, 0.02], [-0.55, 0, 0]);
  add(chest, CP(), bM, { p: [0, 0.13, 0], s: [0.05, 0.14, 0.05], ol: 0.008 });
  add(chest, S(10), bel, { p: [0, 0.1, 0.03], s: [0.035, 0.11, 0.03], ol: false });
  const head = grp(chest, [0, 0.3, 0.02], [0.55, 0, 0]);
  add(head, S(), bM, { p: [0, 0, 0.02], s: [0.1, 0.075, 0.07], ol: 0.008 });
  add(head, C(3), b2, { p: [0, -0.06, 0.06], r: [PI, 0, 0], s: [0.06, 0.08, 0.04], ol: 0.006 });
  for (const sd of [-1, 1]) {
    // Facettenauge: groß, glänzend, mit Pupille
    add(head, S(), toon(P.eye, { emissive: P.eye, emissiveIntensity: st === 2 ? 0.8 : 0.2 }), { p: [sd * 0.085, 0.02, 0.02], s: [0.045, 0.055, 0.045], ol: 0.006 });
    add(head, S(8), flat(0x10101a), { p: [sd * 0.1, 0.02, 0.055], s: [0.015, 0.025, 0.01], ol: false });
    add(head, S(8), flat(0xffffff), { p: [sd * 0.095, 0.045, 0.058], s: 0.01, ol: false });
    add(head, C(5), dark, { p: [sd * 0.02, -0.11, 0.07], r: [PI - 0.3, 0, sd * 0.4], s: [0.012, 0.035, 0.012], ol: false });
    const an = grp(head, [sd * 0.03, 0.06, 0.03], [-0.5, 0, sd * 0.5]); add(an, Y(5), dark, { p: [0, 0.08, 0], s: [0.006, 0.16, 0.006], ol: false });
    const an2 = grp(an, [0, 0.16, 0], [0.9, 0, 0]); add(an2, Y(5), dark, { p: [0, 0.07, 0], s: [0.005, 0.14, 0.005], ol: false }); add(an2, S(6), acc, { p: [0, 0.14, 0], s: 0.012, ol: false });
  }
  if (st === 1) { // Krone der Sichelkönigin
    const cr = grp(head, [0, 0.07, 0.0]); add(cr, geo.torus(0.25), acc, { r: [PI / 2, 0, 0], s: 0.05, ol: 0.004 });
    for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; add(cr, C(4), acc, { p: [Math.cos(a) * 0.05, 0.025, Math.sin(a) * 0.05], s: [0.012, 0.04, 0.012], ol: 0.004 }); }
    add(cr, geo.oct(), toon(0xff6a9a, { emissive: 0xff2a6a, emissiveIntensity: 0.7 }), { p: [0, 0.03, 0.05], s: [0.014, 0.022, 0.01], ol: false });
  }
  // Fangarme mit Sicheln (Purpur/Königin: zwei Paare)
  const arms = [];
  const mkArm = (sd, y, z, k) => {
    const A = grp(chest, [sd * 0.05, y, z], [0, 0, 0]);
    add(A, S(10), b2, { p: [0, -0.03, 0.07], r: [1.2, 0, 0], s: [0.035 * k, 0.1 * k, 0.03 * k], ol: 0.006 });
    const fore = grp(A, [0, -0.06 * k, 0.14 * k], [-2.2, 0, 0]);
    add(fore, S(10), bM, { p: [0, 0.07 * k, 0], s: [0.03 * k, 0.09 * k, 0.026 * k], ol: 0.006 });
    const bl = add(fore, C(4), bladeM, { p: [0, 0.24 * k, 0.02], r: [0.15, 0, 0], s: [0.016 * k, 0.26 * k, 0.05 * k], ol: 0.006 });
    for (let i = 0; i < 3; i++) add(fore, C(4), dark, { p: [0, 0.03 * k + i * 0.04 * k, -0.018 * k], r: [-0.6, 0, 0], s: [0.006, 0.02 * k, 0.006], ol: false });
    if (st >= 1) add(fore, geo.torus(0.3), acc, { p: [0, 0.11 * k, 0], r: [PI / 2, 0, 0], s: 0.025 * k, ol: false });
    if (st === 2) add(fore, C(4), glow(0xff2a5a, 0.5), { p: [0, 0.24 * k, 0.02], r: [0.15, 0, 0], s: [0.03 * k, 0.3 * k, 0.08 * k], ol: false });
    A.userData.sd = sd; A.userData.k = k; A.userData.fore = fore; arms.push(A); return bl;
  };
  for (const sd of [-1, 1]) { mkArm(sd, 0.2, 0.03, 1.15); if (st >= 1) mkArm(sd, 0.1, 0.03, 0.9); }
  let aura = null;
  if (st === 2) { aura = add(root, geo.torus(0.03), glow(0xff2a5a, 0.5), { p: [0, 0.03, 0], r: [PI / 2, 0, 0], s: 0.45, ol: false }); for (let i = 0; i < 3; i++) add(body, C(5), dark, { p: [0, 0.38 - i * 0.03, -0.02 - i * 0.07], r: [-0.4, 0, 0], s: [0.02, 0.07, 0.02], ol: 0.004 }); }
  anim(body, abd, chest, head, ...legs, ...wings, ...arms, ...arms.map(a => a.userData.fore));
  const tick = (t, dt, s) => {
    const a = s.atk || 0, sway = Math.sin(t * 1.4);
    body.position.y = Math.abs(Math.sin(t * 2.8)) * 0.006; body.rotation.y = sway * 0.06;
    chest.rotation.x = -0.55 + sway * 0.04 - a * 0.25; head.rotation.x = 0.55 + Math.sin(t * 1.1) * 0.1 + a * 0.2; head.rotation.y = Math.sin(t * 0.7) * 0.3;
    abd.rotation.x = 0.25 + Math.sin(t * 1.4 + 1) * 0.04;
    legs.forEach(L => { L.rotation.x = Math.sin(t * 3 + L.userData.ph) * 0.06; });
    // „Betende“ Haltung, Angriff: Sicheln schnellen nach vorn (zweites Paar versetzt)
    arms.forEach((A, i) => { const hit = Math.max(0, a - (A.userData.k < 1 ? 0.25 : 0)); A.rotation.x = -hit * 1.4 + Math.sin(t * 1.4 + i) * 0.05; A.userData.fore.rotation.x = -2.2 + hit * 1.9; });
    wings.forEach(w => { const open = st === 2 ? 0.7 + Math.sin(t * 9 + w.userData.j) * 0.15 : a * 0.8 + Math.max(0, Math.sin(t * 0.7) - 0.9) * 3; w.rotation.z = w.userData.sd * open * (1 - w.userData.j * 0.3); w.rotation.y = w.userData.sd * open * 0.4; });
    if (aura) aura.material.opacity = 0.35 + Math.sin(t * 4) * 0.12;
  };
  return { root, tick, height: [0.8, 0.88, 0.98][st] * sc };
}

// ───────────────────────── PHÖNIX ─────────────────────────
// Form 0 Glutküken (rund, sitzt im Nest) · 1 Feuervogel (schwebt, Federfächer) · 2 Sonnenphönix (golden, Sonnenrad)
const PPAL = [
  { body: [0xff7a2a, 0xe8461a, 0xfff0d8], wing: [0xc8281a, 0xff6a1a, 0xffb43a], tip: 0xffe27a, glowC: 0xff8a2a, beak: 0xffc83a, iris: 0x7a2a10 },
  { body: [0x6ab8ff, 0x3a6ae8, 0xf0f8ff], wing: [0x2a48c8, 0x4a8aff, 0x9ad8ff], tip: 0xdff6ff, glowC: 0x6ad0ff, beak: 0xdfe8ff, iris: 0x1a2a6a },
  { body: [0xb07bff, 0x6a3ad8, 0xfff4d8], wing: [0x4a2aa8, 0x8a5aff, 0xffd257], tip: 0xfff2a8, glowC: 0xc8a0ff, beak: 0xffd257, iris: 0x3a1a6a },
];
export function phoenix(o = {}) {
  const st = o.stage || 0, pal = PPAL[skinOf(o.skin)], sc = [0.9, 1.0, 1.1][st];
  const gold = st === 2 && !skinOf(o.skin);
  const bodyC = gold ? [0xffc84a, 0xff8a2a, 0xfffaf0] : pal.body, wingC = gold ? [0xff8a2a, 0xffb43a, 0xfff0a0] : pal.wing;
  const root = new THREE.Group(), stone = toon(0x8a8478), stone2 = toon(0x5a544c);
  // Sockel: Nest (Küken) bzw. Feuerschale
  if (st === 0) {
    add(root, Y(10), stone, { p: [0, 0.05, 0], s: [0.2, 0.1, 0.2], ol: 0.01 });
    const twig = toon(0x8a5a32);
    for (let i = 0; i < 9; i++) { const a = i / 9 * PI * 2; add(root, Y(5), twig, { p: [Math.cos(a) * 0.15, 0.13, Math.sin(a) * 0.15], r: [PI / 2, 0, a + 0.6], s: [0.018, 0.17, 0.018], ol: 0.004 }); }
  } else {
    add(root, Y(8), stone2, { p: [0, 0.03, 0], s: [0.2, 0.06, 0.2], ol: 0.01 });
    add(root, Y(8), stone, { p: [0, 0.14, 0], s: [0.07, 0.18, 0.07], ol: 0.01 });
    add(root, C(10), stone, { p: [0, 0.28, 0], r: [PI, 0, 0], s: [0.17, 0.1, 0.17], ol: 0.01 });
    add(root, Y(12), toon(gold ? 0xffd257 : 0xc8a060, { emissive: 0x3a2000, emissiveIntensity: 0.4 }), { p: [0, 0.335, 0], s: [0.175, 0.02, 0.175], ol: 0.006 });
  }
  const fire = [];
  for (let i = 0; i < 3; i++) fire.push(add(root, C(6), glow(i ? pal.tip : pal.glowC, 0.75), { p: [(i - 1) * 0.05, st ? 0.38 : 0.2, (i % 2) * 0.03], s: [0.04, 0.12, 0.04], ol: false }));

  const body = grp(root, [0, st ? 0.62 : 0.3, 0]);
  const mB = toon(bodyC[0], { emissive: bodyC[1], emissiveIntensity: st ? 0.35 : 0.2 }), mB2 = toon(bodyC[1]), mBelly = toon(bodyC[2]);
  const k = [1.25, 1, 1.1][st];
  // Rumpf
  if (st === 0) { add(body, S(), mB, { s: [0.17, 0.16, 0.17], ol: 0.012 }); add(body, S(), mBelly, { p: [0, -0.03, 0.08], s: [0.12, 0.11, 0.09], ol: false }); }
  else { add(body, S(), mB, { r: [0.45, 0, 0], s: [0.085 * k, 0.1 * k, 0.17 * k], ol: 0.01 }); add(body, S(), mBelly, { p: [0, -0.01, 0.06 * k], r: [0.5, 0, 0], s: [0.065 * k, 0.08 * k, 0.09 * k], ol: false }); }
  // Hals + Kopf
  const head = grp(body, st === 0 ? [0, 0.15, 0.04] : [0, 0.16 * k, 0.12 * k]);
  if (st) add(body, Y(8), mB, { p: [0, 0.09 * k, 0.08 * k], r: [0.5, 0, 0], s: [0.05 * k, 0.12 * k, 0.05 * k], ol: 0.008 });
  const hs = st === 0 ? 0.13 : 0.085 * k;
  add(head, S(), mB, { s: [hs, hs * 0.95, hs], ol: 0.01 });
  add(head, C(8), toon(pal.beak), { p: [0, -hs * 0.1, hs * 1.0], r: [PI / 2 + 0.25, 0, 0], s: [hs * 0.28, hs * 0.55, hs * 0.22], ol: 0.006 });
  for (const sd of [-1, 1]) eye(head, [sd * hs * 0.48, hs * 0.18, hs * 0.72], hs * (st === 0 ? 0.32 : 0.24), st === 2 ? pal.tip : pal.iris, sd, st === 2);
  // Federkrone: flackernde Flammen
  const crest = [], nC = [3, 3, 5][st];
  for (let i = 0; i < nC; i++) {
    const a = (i / (nC - 1) - 0.5) * 0.9, c = grp(head, [Math.sin(a) * hs * 0.4, hs * 0.75, -hs * 0.15], [-0.5 - Math.abs(a) * 0.3, 0, -a * 0.9]);
    add(c, C(6), toon(wingC[1], { emissive: wingC[1], emissiveIntensity: 0.5 }), { p: [0, hs * 0.5, 0], s: [hs * 0.14, hs * (st ? 1.1 : 0.7), hs * 0.1], ol: 0.005 });
    const tipF = add(c, S(8), glow(pal.tip, 0.85), { p: [0, hs * (st ? 1.1 : 0.75), 0], s: hs * 0.14, ol: false }); tipF.userData.c = c; crest.push(c);
  }
  // Schwingen: Federfächer am Schultergelenk
  const wings = [], nF = [4, 7, 9][st], wl = [0.13, 0.4, 0.5][st];
  for (const sd of [-1, 1]) {
    const W = grp(body, st === 0 ? [sd * 0.15, 0.02, -0.02] : [sd * 0.08 * k, 0.07 * k, 0.02]);
    for (let row = 0; row < (st === 2 ? 2 : 1); row++) for (let i = 0; i < nF; i++) {
      const u = i / (nF - 1), b = (st ? -0.25 : 0.05) + u * (st ? 1.35 : 1.0), len = wl * (row ? 0.6 : 1) * (0.55 + 0.45 * Math.sin((1 - u * 0.75) * PI * 0.6 + 0.4));
      const F = grp(W, [0, row * 0.012, 0], [0, sd > 0 ? b : PI - b, 0]);
      const col = row ? wingC[2] : u < 0.35 ? wingC[0] : wingC[1];
      add(F, S(8), toon(col, { emissive: col, emissiveIntensity: st ? 0.35 : 0.15 }), { p: [len * 0.5, 0, 0], s: [len * 0.5, 0.012, 0.03 + 0.012 * st], ol: 0.004 });
      if (st && !row) add(F, S(6), glow(pal.tip, 0.7), { p: [len * 0.95, 0, 0], s: [0.035, 0.012, 0.02], ol: false });
    }
    W.userData.sd = sd; wings.push(W);
  }
  // Schwanzfedern
  const tail = [], nT = [2, 3, 5][st];
  for (let i = 0; i < nT; i++) {
    const a = (i / Math.max(1, nT - 1) - 0.5) * (nT > 1 ? 0.9 : 0), T = grp(body, [0, st ? -0.03 : 0, st ? -0.15 * k : -0.14], [0.6 + (st ? 0.25 : -0.2), a, 0]);
    const L = [0.08, 0.3, 0.42][st] * (1 - Math.abs(a) * 0.3);
    add(T, S(8), toon(wingC[0], { emissive: wingC[0], emissiveIntensity: 0.25 }), { p: [0, -L * 0.15, -L * 0.45], s: [0.025, 0.012, L * 0.5], ol: 0.004 });
    add(T, S(8), glow(i % 2 ? pal.tip : pal.glowC, 0.8), { p: [0, -L * 0.28, -L * 0.95], s: [0.04, 0.015, 0.06], ol: false });
    T.userData.a = a; T.userData.i = i; tail.push(T);
  }
  // Sonnenrad (Form 2) hinter dem Körper
  let sun = null;
  if (st === 2) {
    sun = grp(body, [0, 0.12, -0.16]);
    add(sun, geo.torus(0.06), glow(pal.tip, 0.8), { s: 0.3, ol: false });
    for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; add(sun, C(4), glow(i % 2 ? pal.glowC : pal.tip, 0.7), { p: [Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0], r: [0, 0, a - PI / 2], s: [0.025, 0.09, 0.01], ol: false }); }
  }
  // Glühende Funken, die um den Vogel kreisen (Form 1+)
  const embers = [];
  if (st) for (let i = 0; i < 4 + st * 2; i++) embers.push(add(root, S(6), glow(i % 2 ? pal.tip : pal.glowC, 0.85), { s: 0.022, ol: false }));
  anim(body, head, ...wings, ...tail, ...crest, ...fire, ...embers, ...(sun ? [sun] : []));
  const baseY = body.position.y;
  const tick = (t, dt, s) => {
    const a = s.atk || 0, fl = st === 0 ? 14 : 6;
    body.position.y = baseY + (st ? Math.sin(t * 2.2) * 0.035 : Math.abs(Math.sin(t * 3)) * 0.01);
    body.rotation.x = -a * 0.25; head.rotation.x = -a * 0.35 + Math.sin(t * 1.3) * 0.06; head.rotation.y = Math.sin(t * 0.6) * 0.25 * (1 - a);
    // Flügelschlag; beim Angriff schlagen die Schwingen nach vorn
    const flap = st === 0 ? 0.3 + Math.sin(t * fl) * 0.35 : 0.2 + Math.sin(t * fl) * 0.45;
    wings.forEach(W => { const sd = W.userData.sd; W.rotation.z = sd * (flap - a * 0.9); W.rotation.y = -sd * a * 0.75; });
    tail.forEach(T => { T.rotation.y = T.userData.a + Math.sin(t * 1.6 + T.userData.i) * 0.12; T.rotation.x = (st ? 0.85 : 0.4) + Math.sin(t * 2.2 + T.userData.i) * 0.08 + a * 0.2; });
    crest.forEach((c, i) => { const f = 1 + Math.sin(t * 11 + i * 1.7) * 0.12 + a * 0.3; c.scale.set(1, f, 1); });
    fire.forEach((f, i) => { const q = 1 + Math.sin(t * 13 + i * 2.1) * 0.25; f.scale.set(0.04 * (2 - q) * 0.9 + 0.01, 0.12 * q, 0.04); f.rotation.y = t * 2 + i; });
    embers.forEach((e, i) => { const ang = t * (1.2 + i * 0.13) + i * 1.9, r = 0.32 + (i % 3) * 0.06; e.position.set(Math.cos(ang) * r, baseY + 0.1 + Math.sin(t * 2.5 + i) * 0.15, Math.sin(ang) * r); });
    if (sun) { sun.rotation.z = t * 0.5; const p = 1 + Math.sin(t * 3) * 0.04 + a * 0.15; sun.scale.setScalar(p); }
  };
  return { root, tick, height: [0.55, 0.95, 1.1][st] * sc };
}
