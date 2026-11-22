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

// ───────────────────────── SCHLANGENMAGIERIN ─────────────────────────
// Form 0 Natter (zusammengerollt) · 1 Kobra-Magierin (Haube, Giftkugel) · 2 Hohepriesterin (Krone, Fluchrunen, goldene Ringe)
const NPAL = [
  { body: 0x3fae6a, body2: 0x2a7a4a, belly: 0xf0e4a0, hood: 0x1f5a3a, mark: 0xb8f070, orb: 0x8aff6a, rune: 0xc08aff, iris: 0xffd23a },
  { body: 0xdfe8f4, body2: 0x9ab0d0, belly: 0xffffff, hood: 0x6a80b0, mark: 0x9fd8ff, orb: 0x9fe8ff, rune: 0xdfe8ff, iris: 0x6ab8ff },
  { body: 0x2a2a5a, body2: 0x161638, belly: 0x8a8aff, hood: 0x101030, mark: 0xffd257, orb: 0xffd257, rune: 0xff9af0, iris: 0xffd257 },
];
export function naga(o = {}) {
  const st = o.stage || 0, pal = NPAL[skinOf(o.skin)], k = [0.85, 1, 1.12][st];
  const root = new THREE.Group(), mB = toon(pal.body), mB2 = toon(pal.body2), mBelly = toon(pal.belly), gold = toon(0xffd257, { emissive: 0x3a2000, emissiveIntensity: 0.4 });
  // Sockel: flacher Tempelstein mit Runenring
  add(root, Y(10), toon(0x6a7a70), { p: [0, 0.03, 0], s: [0.24, 0.06, 0.24], ol: 0.01 });
  add(root, geo.torus(0.05), glow(pal.rune, 0.5), { p: [0, 0.065, 0], r: [PI / 2, 0, 0], s: 0.2, ol: false });
  // Zusammengerollter Schwanz (Spirale aus Kugeln)
  const nCoil = 16 + st * 4;
  for (let i = 0; i < nCoil; i++) {
    const u = i / nCoil, a = u * PI * 3.2, r = (0.19 - u * 0.09) * k, sz = (0.075 - u * 0.022) * k;
    add(root, S(10), i % 3 === 0 ? mB2 : mB, { p: [Math.cos(a) * r, 0.09 + u * 0.1 * k, Math.sin(a) * r], s: [sz, sz * 0.85, sz], ol: 0.008 });
    if (st === 2 && i % 4 === 2) add(root, Y(10), gold, { p: [Math.cos(a) * r, 0.09 + u * 0.1 * k, Math.sin(a) * r], r: [PI / 2, 0, a], s: [sz * 1.05, sz * 0.4, sz * 1.05], ol: 0.004 });
  }
  // Aufgerichteter Oberkörper als Gelenkkette
  const segs = [], nS = 5; let par = grp(root, [0.02, 0.2 * k, 0.02]);
  for (let i = 0; i < nS; i++) {
    const seg = grp(par, i ? [0, 0.075 * k, 0] : [0, 0, 0]); const sz = (0.07 - i * 0.004) * k;
    add(seg, S(10), mB, { p: [0, 0.035 * k, 0], s: [sz, sz * 1.15, sz * 0.95], ol: 0.008 });
    add(seg, S(8), mBelly, { p: [0, 0.035 * k, sz * 0.55], s: [sz * 0.7, sz * 0.9, sz * 0.4], ol: false });
    segs.push(seg); par = seg;
  }
  const head = grp(par, [0, 0.1 * k, 0.02]), hs = 0.085 * k;
  // Haube (Kobra) ab Form 1
  if (st) {
    const hood = grp(head, [0, -hs * 0.3, -hs * 0.35]);
    add(hood, S(12), toon(pal.hood), { s: [hs * 2.1, hs * 2.0, hs * 0.35], ol: 0.008 });
    add(hood, S(10), mB, { p: [0, 0, hs * 0.12], s: [hs * 1.6, hs * 1.6, hs * 0.3], ol: false });
    for (const sd of [-1, 1]) add(hood, S(8), glow(pal.mark, 0.85), { p: [sd * hs * 0.75, hs * 0.35, hs * 0.25], s: [hs * 0.25, hs * 0.32, hs * 0.08], ol: false });
  }
  add(head, S(12), mB, { s: [hs, hs * 0.85, hs * 1.15], ol: 0.01 });
  add(head, S(10), mB, { p: [0, -hs * 0.18, hs * 0.75], s: [hs * 0.7, hs * 0.5, hs * 0.6], ol: 0.008 });
  for (const sd of [-1, 1]) eye(head, [sd * hs * 0.5, hs * 0.2, hs * 0.72], hs * 0.3, pal.iris, sd, st === 2);
  const tongue = grp(head, [0, -hs * 0.35, hs * 1.25]);
  for (const sd of [-1, 1]) add(tongue, Y(5), flat(0xff3a5a), { p: [sd * hs * 0.06, 0, hs * 0.12], r: [PI / 2, 0, sd * 0.35], s: [hs * 0.04, hs * 0.3, hs * 0.04], ol: false });
  // Krone (Form 2)
  if (st === 2) for (let i = 0; i < 5; i++) { const a = (i / 4 - 0.5) * 1.6; add(head, C(5), gold, { p: [Math.sin(a) * hs * 0.6, hs * 0.85, -Math.cos(a) * hs * 0.15], r: [0, 0, -a * 0.6], s: [hs * 0.12, hs * (i === 2 ? 0.6 : 0.4), hs * 0.12], ol: 0.004 }); }
  // Schwebende Giftkugel (Form 1+) bzw. Fluchrunen (Form 2)
  const orb = st ? grp(root, [0.22, 0.6 * k, 0.18]) : null, runes = [];
  if (orb) { add(orb, S(12), glow(pal.orb, 0.9), { s: 0.065, ol: false }); add(orb, geo.torus(0.08), glow(pal.rune, 0.8), { s: 0.1, ol: false }); }
  if (st === 2) for (let i = 0; i < 3; i++) { const r = grp(root, [0, 0.7, 0]); add(r, B(), glow(pal.rune, 0.85), { s: [0.05, 0.07, 0.01], r: [0, 0, PI / 4], ol: false }); runes.push(r); }
  anim(head, tongue, ...segs, ...(orb ? [orb] : []), ...runes);
  const tick = (t, dt, s) => {
    const a = s.atk || 0;
    segs.forEach((g, i) => { g.rotation.z = Math.sin(t * 1.6 - i * 0.7) * 0.09; g.rotation.x = (i > 2 ? -a * 0.35 : 0) + Math.sin(t * 1.2 - i * 0.5) * 0.05 + (i === 4 ? 0.15 : 0); });
    head.rotation.x = -a * 0.4 + Math.sin(t * 2) * 0.05; head.rotation.y = Math.sin(t * 0.7) * 0.25 * (1 - a);
    tongue.scale.z = 0.4 + Math.max(0, Math.sin(t * 7)) * 0.9; tongue.visible = Math.sin(t * 3.5) > 0.2;
    if (orb) { orb.position.y = 0.6 * k + Math.sin(t * 2.3) * 0.04 + a * 0.06; orb.rotation.y = t * 2; orb.scale.setScalar(1 + a * 0.4 + Math.sin(t * 5) * 0.05); }
    runes.forEach((r, i) => { const ang = t * 1.1 + i * PI * 2 / 3; r.position.set(Math.cos(ang) * 0.34, 0.45 + Math.sin(t * 2 + i) * 0.08, Math.sin(ang) * 0.34); r.rotation.y = -ang; });
  };
  return { root, tick, height: [0.6, 0.85, 1.0][st] };
}

// ───────────────────────── WINDMÖNCH ─────────────────────────
// Form 0 Windäffchen (Kissen) · 1 Windmönch (Wolke, Stab) · 2 Sturmerleuchteter (schwebt, Windringe, Stirnband)
const WMPAL = [
  { fur: 0xa8703a, face: 0xffd8b0, robe: 0xff9a3a, robe2: 0xd8641a, sash: 0x8fe0ff, bead: 0x6a3a1a, iris: 0x3a2410, wind: 0xdff8ff },
  { fur: 0xeef2f8, face: 0xffe4e4, robe: 0x7ab0ff, robe2: 0x4a78d8, sash: 0xffffff, bead: 0x2a3a6a, iris: 0x2a4a8a, wind: 0xdff4ff },
  { fur: 0x3a2a5a, face: 0xd8c0ff, robe: 0x2a1a4a, robe2: 0xffd257, sash: 0xff9af0, bead: 0xffd257, iris: 0xffd257, wind: 0xffd8ff },
];
export function monk(o = {}) {
  const st = o.stage || 0, pal = WMPAL[skinOf(o.skin)], k = [0.9, 1, 1.08][st];
  const root = new THREE.Group(), mF = toon(pal.fur), mFace = toon(pal.face), mR = toon(pal.robe), mR2 = toon(pal.robe2);
  // Unterlage: Kissen bzw. Wolke
  const cloud = grp(root, [0, st === 2 ? 0.2 : 0.1, 0]);
  if (st === 0) { add(cloud, S(14), toon(0xc83a3a), { s: [0.2, 0.06, 0.2], ol: 0.01 }); for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) add(cloud, S(6), toon(0xffd257), { p: [x * 0.13, 0, z * 0.13], s: 0.022, ol: false }); }
  else for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2; add(cloud, S(10), toon(0xffffff, { emissive: 0xbfe8ff, emissiveIntensity: 0.25 }), { p: [Math.cos(a) * 0.15, (i % 2) * 0.02, Math.sin(a) * 0.15], s: [0.11, 0.07, 0.11], ol: 0.008 }); }
  const body = grp(cloud, [0, 0.06, 0]);
  // Robe (Kegel + Bauch), gekreuzte Beine
  add(body, C(14), mR, { p: [0, 0.11 * k, 0], s: [0.16 * k, 0.24 * k, 0.15 * k], ol: 0.01 });
  add(body, S(12), mR2, { p: [0, 0.03, 0.02], s: [0.17 * k, 0.06, 0.15 * k], ol: 0.01 });
  add(body, Y(10), toon(pal.sash), { p: [0, 0.12 * k, 0], s: [0.105 * k, 0.025, 0.1 * k], ol: 0.005 });
  // Gebetskette
  for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2; add(body, S(6), toon(pal.bead), { p: [Math.cos(a) * 0.075 * k, 0.21 * k - Math.abs(Math.sin(a)) * 0.0, Math.sin(a) * 0.075 * k + 0.01], s: 0.018 * k, ol: 0.003 }); }
  // Kopf
  const head = grp(body, [0, 0.31 * k, 0.01]), hs = 0.11 * k;
  add(head, S(14), mF, { s: [hs, hs * 0.95, hs * 0.95], ol: 0.01 });
  add(head, S(12), mFace, { p: [0, -hs * 0.1, hs * 0.55], s: [hs * 0.75, hs * 0.65, hs * 0.5], ol: false });
  add(head, S(10), mFace, { p: [0, -hs * 0.35, hs * 0.72], s: [hs * 0.45, hs * 0.3, hs * 0.3], ol: false });
  for (const sd of [-1, 1]) { add(head, S(10), mF, { p: [sd * hs * 1.0, 0, 0], s: [hs * 0.38, hs * 0.42, hs * 0.2], ol: 0.008 }); add(head, S(8), mFace, { p: [sd * hs * 1.03, 0, hs * 0.05], s: [hs * 0.24, hs * 0.28, hs * 0.12], ol: false }); }
  for (const sd of [-1, 1]) eye(head, [sd * hs * 0.32, hs * 0.08, hs * 0.92], hs * 0.24, pal.iris, sd, st === 2);
  add(head, S(6), flat(0x3a2410), { p: [0, -hs * 0.42, hs * 0.98], s: [hs * 0.16, hs * 0.04, hs * 0.04], ol: false });
  if (st === 2) { add(head, Y(14), toon(pal.sash), { p: [0, hs * 0.45, 0], s: [hs * 1.02, hs * 0.16, hs * 1.02], ol: 0.004 }); }
  const ribbons = [];
  if (st === 2) for (const sd of [-1, 1]) { const rb = grp(head, [sd * hs * 0.3, hs * 0.45, -hs * 0.9]); add(rb, B(), toon(pal.sash), { p: [0, -0.06, -0.04], s: [0.03, 0.14, 0.01], ol: 0.003 }); ribbons.push(rb); }
  // Arme (Schulter → Hand)
  const arms = [];
  for (const sd of [-1, 1]) {
    const A = grp(body, [sd * 0.11 * k, 0.21 * k, 0.02], [0, 0, sd * 0.4]);
    add(A, S(10), mR, { p: [0, -0.06, 0], s: [0.04, 0.08, 0.04], ol: 0.008 });
    add(A, S(8), mFace, { p: [0, -0.14, 0.02], s: 0.035, ol: 0.006 });
    A.userData.sd = sd; arms.push(A);
  }
  // Stab (Form 1+)
  let staff = null;
  if (st) { staff = grp(arms[1], [0, -0.14, 0.02], [0.1, 0, -0.5]); add(staff, Y(6), toon(0x8a5a32), { s: [0.012, 0.5, 0.012], ol: 0.004 }); add(staff, geo.torus(0.12), glow(pal.wind, 0.85), { p: [0, 0.27, 0], s: 0.06, ol: false }); }
  // Schwanz (Kette, eingerollt)
  const tail = grp(body, [0, 0.04, -0.13]); let tp = tail;
  for (let i = 0; i < 6; i++) { const g = grp(tp, [0, 0.03, -0.03], [0.45, 0, 0]); add(g, S(8), mF, { s: 0.025 - i * 0.002, ol: 0.004 }); tp = g; }
  // Windringe (Form 2)
  const rings = [];
  if (st === 2) for (let i = 0; i < 2; i++) rings.push(add(root, geo.torus(0.04), glow(pal.wind, 0.55), { p: [0, 0.25 + i * 0.25, 0], r: [PI / 2, 0, 0], s: 0.32 + i * 0.06, ol: false }));
  anim(cloud, body, head, tail, ...arms, ...ribbons, ...rings, ...(staff ? [staff] : []));
  const cy = cloud.position.y;
  const tick = (t, dt, s) => {
    const a = s.atk || 0;
    cloud.position.y = cy + (st ? Math.sin(t * 1.8) * 0.03 : 0);
    body.rotation.z = Math.sin(t * 1.1) * 0.04; head.rotation.y = Math.sin(t * 0.8) * 0.2 * (1 - a); head.rotation.x = Math.sin(t * 1.5) * 0.04 - a * 0.15;
    // Handflächen-Stoß nach vorn beim Angriff, sonst Meditation
    arms.forEach(A => { const sd = A.userData.sd; A.rotation.x = -a * 1.4 - 0.25; A.rotation.z = sd * (0.4 - a * 0.25) + Math.sin(t * 2 + sd) * 0.03; });
    tail.rotation.y = Math.sin(t * 1.7) * 0.4;
    ribbons.forEach((r, i) => { r.rotation.x = 0.4 + Math.sin(t * 6 + i) * 0.25; });
    rings.forEach((r, i) => { r.rotation.z = t * (i ? -1.2 : 1.5); r.scale.setScalar(0.32 + i * 0.06 + Math.sin(t * 2 + i) * 0.015 + a * 0.05); });
  };
  return { root, tick, height: [0.6, 0.75, 0.95][st] };
}

// ───────────────────────── LEERENKATZE ─────────────────────────
// Form 0 Schattenkätzchen · 1 Leerenkatze (zwei Schweife, Sichelmond) · 2 Sternenschlingerin (schwebt, kosmische Mähne, Schwarzes Loch)
const VPAL = [
  { fur: 0x1e1838, fur2: 0x2e2458, inner: 0xff7ad8, star: 0xffffff, eye: 0x7af6ff, glowC: 0xa070ff, moon: 0xe8e0ff },
  { fur: 0xe8ecf8, fur2: 0xc8d0f0, inner: 0x9fd8ff, star: 0x8fa0ff, eye: 0x6a8aff, glowC: 0x9fd8ff, moon: 0xffffff },
  { fur: 0x3a1a0a, fur2: 0x6a2a10, inner: 0xffb43a, star: 0xffe27a, eye: 0xffd257, glowC: 0xff8a2a, moon: 0xffd257 },
];
export function voidcat(o = {}) {
  const st = o.stage || 0, pal = VPAL[skinOf(o.skin)], k = [0.85, 1, 1.08][st];
  const root = new THREE.Group(), mF = toon(pal.fur, { emissive: pal.glowC, emissiveIntensity: 0.12 }), mF2 = toon(pal.fur2), mIn = glow(pal.inner, 0.85);
  // Sockel: Sternenportal
  add(root, Y(12), toon(0x2a2440), { p: [0, 0.03, 0], s: [0.22, 0.06, 0.22], ol: 0.01 });
  const portal = add(root, geo.torus(0.06), glow(pal.glowC, 0.6), { p: [0, 0.065, 0], r: [PI / 2, 0, 0], s: 0.2, ol: false });
  const body = grp(root, [0, st === 2 ? 0.2 : 0.08, 0]);
  // Sitzender Körper
  add(body, S(14), mF, { p: [0, 0.13 * k, -0.02], r: [-0.35, 0, 0], s: [0.11 * k, 0.15 * k, 0.12 * k], ol: 0.01 });
  add(body, S(10), mF2, { p: [0, 0.16 * k, 0.07 * k], s: [0.06 * k, 0.09 * k, 0.04 * k], ol: false });
  for (const sd of [-1, 1]) { add(body, S(10), mF, { p: [sd * 0.08 * k, 0.05, 0.02], s: [0.06 * k, 0.05, 0.08 * k], ol: 0.008 }); add(body, Y(8), mF, { p: [sd * 0.045 * k, 0.08, 0.08 * k], s: [0.025, 0.08, 0.025], ol: 0.006 }); add(body, S(8), mF2, { p: [sd * 0.045 * k, 0.03, 0.1 * k], s: [0.032, 0.025, 0.04], ol: 0.005 }); }
  // Sterne im Fell
  for (let i = 0; i < 8 + st * 4; i++) { const th = i * 2.4, ph = 0.5 + (i % 5) * 0.28; add(body, S(5), glow(pal.star, 0.9), { p: [Math.sin(ph) * Math.cos(th) * 0.112 * k, 0.13 * k + Math.cos(ph) * 0.14 * k, Math.sin(ph) * Math.sin(th) * 0.12 * k - 0.02], s: 0.008 + (i % 3) * 0.004, ol: false }); }
  // Kopf
  const head = grp(body, [0, 0.31 * k, 0.04]), hs = 0.1 * k;
  add(head, S(14), mF, { s: [hs * 1.05, hs * 0.92, hs * 0.95], ol: 0.01 });
  add(head, S(10), mF2, { p: [0, -hs * 0.3, hs * 0.65], s: [hs * 0.45, hs * 0.32, hs * 0.35], ol: false });
  add(head, S(6), flat(pal.inner), { p: [0, -hs * 0.18, hs * 0.95], s: [hs * 0.12, hs * 0.08, hs * 0.06], ol: false });
  for (const sd of [-1, 1]) {
    const ear = grp(head, [sd * hs * 0.55, hs * 0.65, -hs * 0.05], [0, 0, -sd * 0.3]);
    add(ear, C(4), mF, { s: [hs * 0.38, hs * 0.75, hs * 0.22], ol: 0.008 }); add(ear, C(4), mIn, { p: [0, -hs * 0.05, hs * 0.08], s: [hs * 0.22, hs * 0.5, hs * 0.08], ol: false });
    eye(head, [sd * hs * 0.42, hs * 0.05, hs * 0.75], hs * 0.3, pal.eye, sd, true);
    for (let w = 0; w < 2; w++) add(head, Y(4), flat(pal.star), { p: [sd * hs * 0.6, -hs * (0.25 + w * 0.12), hs * 0.7], r: [0, 0, PI / 2 + sd * (0.1 - w * 0.15)], s: [0.003, hs * 0.55, 0.003], ol: false });
  }
  // Mähne (Form 2)
  if (st === 2) for (let i = 0; i < 10; i++) { const a = (i / 9 - 0.5) * 2.6; add(head, C(5), glow(i % 2 ? pal.glowC : pal.inner, 0.75), { p: [Math.sin(a) * hs * 0.95, -hs * 0.4 + Math.cos(a) * hs * 0.1, -hs * 0.3 - Math.cos(a) * hs * 0.3], r: [-0.9, 0, -a * 0.8], s: [hs * 0.15, hs * 0.7, hs * 0.15], ol: false }); }
  // Schweife: Gelenkketten mit leuchtender Spitze
  const tails = [];
  for (let n = 0; n < (st ? 2 : 1); n++) {
    const T = grp(body, [(n ? 0.03 : -0.03) * (st ? 1 : 0), 0.06, -0.13 * k], [0, (n ? 0.35 : -0.35) * (st ? 1 : 0), 0]); let tp = T; const links = [];
    for (let i = 0; i < 7; i++) { const g = grp(tp, i ? [0, 0.035, -0.01] : [0, 0, 0], [0.32, 0, 0]); add(g, S(8), mF, { s: 0.026 - i * 0.002, ol: 0.004 }); links.push(g); tp = g; }
    add(tp, S(8), glow(pal.glowC, 0.9), { p: [0, 0.03, 0], s: 0.03, ol: false });
    tails.push(links);
  }
  // Sichelmond (Form 1+) und Schwarzes Loch (Form 2)
  let moon = null, hole = null;
  if (st) { moon = grp(body, [0, 0.42 * k, -0.18]); add(moon, new THREE.TorusGeometry(1, 0.13, 8, 24, PI * 1.25), glow(pal.moon, 0.8), { r: [0, 0, PI * 0.9], s: 0.13, ol: false }); }
  if (st === 2) { hole = grp(root, [0.26, 0.75, 0]); add(hole, S(12), flat(0x05030a), { s: 0.05, ol: false }); add(hole, geo.torus(0.12), glow(pal.glowC, 0.9), { r: [PI / 2.4, 0, 0], s: 0.085, ol: false }); }
  anim(body, head, portal, ...tails.flat(), ...(moon ? [moon] : []), ...(hole ? [hole] : []));
  const by = body.position.y;
  const tick = (t, dt, s) => {
    const a = s.atk || 0;
    body.position.y = by + (st === 2 ? Math.sin(t * 1.7) * 0.04 : 0);
    head.rotation.y = Math.sin(t * 0.6) * 0.3 * (1 - a); head.rotation.x = -a * 0.3 + Math.sin(t * 1.4) * 0.04; head.rotation.z = Math.sin(t * 0.9) * 0.06;
    body.rotation.x = -a * 0.12;
    tails.forEach((L, n) => L.forEach((g, i) => { g.rotation.z = Math.sin(t * 2 - i * 0.6 + n * 1.5) * 0.18; g.rotation.x = 0.32 + Math.sin(t * 1.3 - i * 0.4 + n) * 0.06; }));
    portal.rotation.z = t * 0.8; portal.scale.setScalar(0.2 + a * 0.05);
    if (moon) { moon.rotation.z = Math.sin(t * 0.8) * 0.15; moon.position.y = 0.42 * k + Math.sin(t * 1.6) * 0.02; }
    if (hole) { const ang = t * 0.9; hole.position.set(Math.cos(ang) * 0.3, 0.75 + Math.sin(t * 2) * 0.05, Math.sin(ang) * 0.3); hole.rotation.y = t * 3; hole.scale.setScalar(1 + a * 0.4); }
  };
  return { root, tick, height: [0.55, 0.75, 0.95][st] };
}

// ───────────────────────── KAPPA ─────────────────────────
// Form 0 Kappa-Kind · 1 Flusskappa (Kieselpanzer) · 2 Wasserfall-Kappa (Wasserfall auf dem Rücken)
const KPAL = [
  { skin: 0x5fc88a, skin2: 0x3a9a6a, belly: 0xf0e8a0, shell: 0x6a8a3a, rim: 0xc8a050, beak: 0xffc83a, water: 0x7ad8ff },
  { skin: 0xbfe4ff, skin2: 0x8ab0d8, belly: 0xffffff, shell: 0x6a7ab0, rim: 0xdfe8ff, beak: 0xdfe8ff, water: 0xdff4ff },
  { skin: 0x2a3a6a, skin2: 0x1a2448, belly: 0x9fb4ff, shell: 0x3a2a6a, rim: 0xffd257, beak: 0xffd257, water: 0xffd8ff },
];
export function kappa(o = {}) {
  const st = o.stage || 0, pal = KPAL[skinOf(o.skin)], k = [0.9, 1, 1.1][st];
  const root = new THREE.Group(), mS = toon(pal.skin), mS2 = toon(pal.skin2), mB = toon(pal.belly);
  add(root, Y(10), toon(0x8a9aa0), { p: [0, 0.03, 0], s: [0.2, 0.06, 0.2], ol: 0.01 });   // Flussstein
  const body = grp(root, [0, 0.06, 0]);
  add(body, S(14), mS, { p: [0, 0.17 * k, 0], s: [0.12 * k, 0.13 * k, 0.11 * k], ol: 0.01 });
  add(body, S(12), mB, { p: [0, 0.16 * k, 0.06 * k], s: [0.085 * k, 0.1 * k, 0.06 * k], ol: false });
  // Panzer auf dem Rücken
  const shell = grp(body, [0, 0.18 * k, -0.07 * k], [0.25, 0, 0]);
  add(shell, S(14), toon(pal.shell), { s: [0.13 * k, 0.14 * k, 0.07 * k], ol: 0.008 });
  add(shell, geo.torus(0.06), toon(pal.rim), { r: [0, 0, 0], s: [0.125 * k, 0.135 * k, 0.1], ol: 0.004 });
  if (st >= 1) for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; add(shell, D(), toon(0x9aa0a8), { p: [Math.cos(a) * 0.07 * k, Math.sin(a) * 0.08 * k, -0.06 * k], s: 0.025 * k, ol: 0.004 }); }
  // Beine + Arme
  for (const sd of [-1, 1]) { add(body, S(8), mS2, { p: [sd * 0.07 * k, 0.04, 0.02], s: [0.045, 0.04, 0.06], ol: 0.006 }); }
  const arms = []; for (const sd of [-1, 1]) { const A = grp(body, [sd * 0.11 * k, 0.2 * k, 0.02], [0, 0, sd * 0.5]); add(A, S(8), mS, { p: [0, -0.05, 0], s: [0.03, 0.07, 0.03], ol: 0.006 }); add(A, S(8), mS2, { p: [0, -0.11, 0.01], s: 0.03, ol: 0.005 }); A.userData.sd = sd; arms.push(A); }
  // Kopf mit Schnabel, Haarkranz und Wasserschale
  const head = grp(body, [0, 0.37 * k, 0.01]), hs = 0.11 * k;
  add(head, S(14), mS, { s: [hs, hs * 0.95, hs], ol: 0.01 });
  add(head, C(8), toon(pal.beak), { p: [0, -hs * 0.2, hs * 0.95], r: [PI / 2 + 0.15, 0, 0], s: [hs * 0.35, hs * 0.5, hs * 0.2], ol: 0.006 });
  for (const sd of [-1, 1]) eye(head, [sd * hs * 0.42, hs * 0.15, hs * 0.75], hs * 0.3, 0x2a4a3a, sd);
  for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; add(head, C(4), mS2, { p: [Math.cos(a) * hs * 0.82, hs * 0.55, Math.sin(a) * hs * 0.82], r: [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6], s: [hs * 0.12, hs * 0.35, hs * 0.12], ol: 0.004 }); }
  add(head, Y(14), toon(0xe8e0c8), { p: [0, hs * 0.75, 0], s: [hs * 0.6, hs * 0.1, hs * 0.6], ol: 0.004 });
  const dish = add(head, Y(14), glow(pal.water, 0.85), { p: [0, hs * 0.81, 0], s: [hs * 0.5, hs * 0.03, hs * 0.5], ol: false });
  // Wasserfall (Form 2): Säule aus Tropfen über dem Panzer
  const drops = [];
  if (st === 2) for (let i = 0; i < 10; i++) drops.push(add(root, S(6), glow(pal.water, 0.8), { s: [0.025, 0.05, 0.025], ol: false }));
  anim(body, head, shell, dish, ...arms, ...drops);
  const tick = (t, dt, s) => {
    const a = s.atk || 0;
    body.position.y = 0.06 + Math.abs(Math.sin(t * 3)) * 0.012; head.rotation.z = Math.sin(t * 1.4) * 0.08; head.rotation.x = -a * 0.25;
    arms.forEach(A => { const sd = A.userData.sd; A.rotation.x = sd > 0 ? -a * 2.2 - 0.1 : Math.sin(t * 2) * 0.1; A.rotation.z = sd * (0.5 - (sd > 0 ? a * 0.3 : 0)); });
    dish.scale.y = hs * 0.03 * (1 + Math.sin(t * 5) * 0.3);
    drops.forEach((d, i) => { const f = (t * 0.9 + i / drops.length) % 1; d.position.set(Math.sin(i * 2.3) * 0.04, 0.62 * k - f * 0.45, -0.16 * k - f * 0.05); d.scale.set(0.025 * (1 - f * 0.4), 0.05 * (1 - f * 0.4), 0.025 * (1 - f * 0.4)); });
  };
  return { root, tick, height: [0.6, 0.7, 0.8][st] };
}

// ───────────────────────── KIRIN ─────────────────────────
// Form 0 Fohlen · 1 Kirin (Mähne, Geweih) · 2 Himmelskirin (schwebt auf Wolken, Heiligenschein)
const QPAL = [
  { body: 0xfff2c8, body2: 0xe8c878, mane: 0xffd257, horn: 0xffe27a, hoof: 0xffb43a, scale: 0x9fe8c8, eye: 0x3a5a8a },
  { body: 0xeef4ff, body2: 0xb8c8e8, mane: 0x9fd8ff, horn: 0xdff4ff, hoof: 0x8ab0d8, scale: 0xc8b8ff, eye: 0x3a4a8a },
  { body: 0x2a2a5a, body2: 0x1a1a3a, mane: 0xff9af0, horn: 0xffd257, hoof: 0xffd257, scale: 0x9fb4ff, eye: 0xffd257 },
];
export function kirin(o = {}) {
  const st = o.stage || 0, pal = QPAL[skinOf(o.skin)], k = [0.85, 1, 1.08][st];
  const root = new THREE.Group(), mB = toon(pal.body, { emissive: pal.mane, emissiveIntensity: st ? 0.15 : 0.05 }), mB2 = toon(pal.body2), mM = toon(pal.mane, { emissive: pal.mane, emissiveIntensity: 0.45 });
  const base = grp(root, [0, st === 2 ? 0.16 : 0, 0]);
  if (st === 2) for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; add(root, S(10), toon(0xffffff, { emissive: 0xfff2c8, emissiveIntensity: 0.3 }), { p: [Math.cos(a) * 0.16, 0.08, Math.sin(a) * 0.12], s: [0.1, 0.06, 0.1], ol: 0.006 }); }
  else add(root, Y(10), toon(0xd8d0c0), { p: [0, 0.03, 0], s: [0.2, 0.06, 0.2], ol: 0.01 });
  const body = grp(base, [0, 0.3 * k, 0]);
  add(body, S(14), mB, { s: [0.09 * k, 0.09 * k, 0.17 * k], ol: 0.01 });
  for (let i = 0; i < 8; i++) add(body, S(6), toon(pal.scale, { emissive: pal.scale, emissiveIntensity: 0.3 }), { p: [(i % 2 ? 0.07 : -0.07) * k, 0.02 * k, (0.1 - i * 0.03) * k], s: [0.02, 0.025, 0.02], ol: false });
  // Beine mit leuchtenden Hufen
  const legs = [];
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const L = grp(body, [x * 0.05 * k, -0.04 * k, z * 0.1 * k]); add(L, Y(8), mB2, { p: [0, -0.1 * k, 0], s: [0.022, 0.2 * k, 0.022], ol: 0.005 }); add(L, Y(8), glow(pal.hoof, 0.9), { p: [0, -0.2 * k, 0], s: [0.03, 0.03, 0.03], ol: false }); legs.push(L); }
  // Hals + Kopf
  add(body, Y(10), mB, { p: [0, 0.09 * k, 0.12 * k], r: [-0.5, 0, 0], s: [0.04 * k, 0.16 * k, 0.04 * k], ol: 0.008 });
  const head = grp(body, [0, 0.18 * k, 0.18 * k]), hs = 0.07 * k;
  add(head, S(12), mB, { s: [hs, hs * 0.95, hs * 1.3], ol: 0.01 });
  add(head, S(10), mB, { p: [0, -hs * 0.25, hs * 1.1], s: [hs * 0.6, hs * 0.5, hs * 0.6], ol: 0.008 });
  for (const sd of [-1, 1]) eye(head, [sd * hs * 0.55, hs * 0.15, hs * 0.75], hs * 0.3, pal.eye, sd, st === 2);
  // Horn bzw. Geweih
  if (st === 0) add(head, C(6), glow(pal.horn, 0.9), { p: [0, hs * 1.1, hs * 0.2], r: [-0.3, 0, 0], s: [hs * 0.15, hs * 0.6, hs * 0.15], ol: false });
  else for (const sd of [-1, 1]) { const A = grp(head, [sd * hs * 0.35, hs * 0.8, -hs * 0.1], [-0.4, 0, -sd * 0.35]); add(A, Y(6), glow(pal.horn, 0.9), { p: [0, hs * 0.5, 0], s: [hs * 0.08, hs, hs * 0.08], ol: false }); add(A, Y(6), glow(pal.horn, 0.9), { p: [sd * hs * 0.2, hs * 0.7, 0], r: [0, 0, -sd * 0.8], s: [hs * 0.06, hs * 0.5, hs * 0.06], ol: false }); }
  // Mähne + Schweif aus Lichtflammen
  const flames = [];
  for (let i = 0; i < (st ? 7 : 4); i++) { const f = add(body, C(6), mM, { p: [0, 0.12 * k - i * 0.01, (0.14 - i * 0.035) * k], r: [-1.1, 0, 0], s: [0.025, 0.09 * k, 0.025], ol: 0.004 }); flames.push(f); }
  const tail = grp(body, [0, 0.03, -0.17 * k], [0.9, 0, 0]); add(tail, C(6), mM, { p: [0, 0.08 * k, 0], s: [0.04, 0.16 * k, 0.04], ol: 0.004 });
  // Heiligenschein (Form 2)
  const halo = st === 2 ? add(body, geo.torus(0.05), glow(pal.horn, 0.8), { p: [0, 0.3 * k, 0.1 * k], r: [PI / 2.4, 0, 0], s: 0.12, ol: false }) : null;
  anim(base, body, head, tail, ...legs, ...flames, ...(halo ? [halo] : []));
  const tick = (t, dt, s) => {
    const a = s.atk || 0;
    base.position.y = (st === 2 ? 0.16 : 0) + (st === 2 ? Math.sin(t * 1.6) * 0.03 : 0);
    head.rotation.x = -a * 0.4 + Math.sin(t * 1.2) * 0.05; head.rotation.y = Math.sin(t * 0.7) * 0.2 * (1 - a);
    body.rotation.x = -a * 0.15;
    legs.forEach((L, i) => { L.rotation.x = (i < 2 ? -a * 0.6 : 0) + Math.sin(t * 2 + i) * 0.05; });
    flames.forEach((f, i) => { f.scale.y = 0.09 * k * (1 + Math.sin(t * 9 + i * 1.3) * 0.2); });
    tail.rotation.z = Math.sin(t * 2.4) * 0.3;
    if (halo) halo.rotation.z = t;
  };
  return { root, tick, height: [0.55, 0.7, 0.85][st] };
}

// ───────────────────────── KOMAINU ─────────────────────────
// Form 0 Welpe · 1 Tempelwächter (Lockenmähne) · 2 Steinlöwe (goldene Mähne, Glutaugen)
const LPAL = [
  { stone: 0xd8c8a8, stone2: 0xa89878, mane: 0x8a7a68, glowC: 0xff8a2a, base: 0x8a8478 },
  { stone: 0x9ad8b0, stone2: 0x6aa888, mane: 0x4a8a6a, glowC: 0x9ff6ff, base: 0x6a7a70 },
  { stone: 0x3a3a5a, stone2: 0x2a2a44, mane: 0xffd257, glowC: 0xff9af0, base: 0x2a2a3a },
];
export function komainu(o = {}) {
  const st = o.stage || 0, pal = LPAL[skinOf(o.skin)], k = [0.85, 1, 1.12][st];
  const gold = st === 2 && !skinOf(o.skin);
  const root = new THREE.Group(), mS = toon(pal.stone), mS2 = toon(pal.stone2), mMane = toon(gold ? 0xffc84a : pal.mane, { emissive: gold ? 0x6a3a00 : 0, emissiveIntensity: 0.4 });
  // Steinsockel
  add(root, B(), toon(pal.base), { p: [0, 0.05, 0], s: [0.36, 0.1, 0.36], ol: 0.01 });
  add(root, B(), toon(pal.base), { p: [0, 0.12, 0], s: [0.3, 0.04, 0.3], ol: 0.008 });
  const body = grp(root, [0, 0.14, 0]);
  // sitzender Löwenhund
  add(body, S(14), mS, { p: [0, 0.14 * k, -0.04], r: [-0.4, 0, 0], s: [0.11 * k, 0.15 * k, 0.12 * k], ol: 0.01 });
  for (const sd of [-1, 1]) { add(body, Y(8), mS, { p: [sd * 0.06 * k, 0.07 * k, 0.07 * k], s: [0.035, 0.14 * k, 0.035], ol: 0.006 }); add(body, S(8), mS2, { p: [sd * 0.06 * k, 0.01, 0.09 * k], s: [0.045, 0.03, 0.05], ol: 0.005 }); add(body, S(10), mS, { p: [sd * 0.09 * k, 0.04, -0.06], s: [0.06, 0.05, 0.08], ol: 0.006 }); }
  // Pfote auf einer Kugel (Wächterpose)
  add(body, S(12), toon(gold ? 0xffd257 : pal.stone2), { p: [0.1 * k, 0.03, 0.12 * k], s: 0.04 * k, ol: 0.005 });
  // Kopf mit Lockenmähne
  const head = grp(body, [0, 0.33 * k, 0.04]), hs = 0.1 * k;
  const nMane = [8, 14, 18][st];
  for (let i = 0; i < nMane; i++) { const a = i / nMane * PI * 2; add(head, S(8), mMane, { p: [Math.cos(a) * hs * 1.05, Math.sin(a) * hs * 1.0, -hs * 0.25], s: hs * (st ? 0.38 : 0.3), ol: 0.004 }); }
  add(head, S(14), mS, { s: [hs, hs * 0.92, hs * 0.95], ol: 0.01 });
  add(head, S(10), mS2, { p: [0, -hs * 0.3, hs * 0.75], s: [hs * 0.55, hs * 0.4, hs * 0.4], ol: 0.006 });
  add(head, S(6), toon(0x2a2a2a), { p: [0, -hs * 0.15, hs * 1.05], s: [hs * 0.14, hs * 0.1, hs * 0.08], ol: false });
  const jaw = grp(head, [0, -hs * 0.55, hs * 0.55]); add(jaw, S(8), mS2, { s: [hs * 0.4, hs * 0.15, hs * 0.35], ol: 0.004 });
  for (const sd of [-1, 1]) add(jaw, C(4), toon(0xffffff), { p: [sd * hs * 0.18, hs * 0.08, hs * 0.2], r: [PI, 0, 0], s: [hs * 0.06, hs * 0.14, hs * 0.06], ol: false });
  for (const sd of [-1, 1]) eye(head, [sd * hs * 0.42, hs * 0.18, hs * 0.75], hs * 0.26, st === 2 ? pal.glowC : 0x3a2a1a, sd, st === 2);
  for (const sd of [-1, 1]) add(head, S(8), mS2, { p: [sd * hs * 0.75, hs * 0.65, -hs * 0.1], s: [hs * 0.2, hs * 0.28, hs * 0.1], ol: 0.004 });
  // Schweif-Flamme
  const tail = grp(body, [0, 0.12 * k, -0.15 * k], [-0.6, 0, 0]);
  for (let i = 0; i < 3; i++) add(tail, S(8), mMane, { p: [0, i * 0.05 * k, -i * 0.02], s: (0.045 - i * 0.008) * k, ol: 0.004 });
  const embers = []; if (st === 2) for (let i = 0; i < 5; i++) embers.push(add(root, S(6), glow(pal.glowC, 0.85), { s: 0.02, ol: false }));
  anim(body, head, jaw, tail, ...embers);
  const tick = (t, dt, s) => {
    const a = s.atk || 0;
    head.rotation.x = -a * 0.35 + Math.sin(t * 1.1) * 0.04; head.rotation.y = Math.sin(t * 0.6) * 0.2 * (1 - a);
    jaw.rotation.x = a * 0.7; body.position.z = a * 0.05; tail.rotation.z = Math.sin(t * 2) * 0.25;
    embers.forEach((e, i) => { const q = t * 1.3 + i * 1.26; e.position.set(Math.cos(q) * 0.3, 0.3 + Math.sin(t * 2 + i) * 0.1, Math.sin(q) * 0.3); });
  };
  return { root, tick, height: [0.55, 0.65, 0.8][st] };
}
