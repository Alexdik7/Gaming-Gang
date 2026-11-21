// Echte 3D-Modelle (CC0: Quaternius „Ultimate Monsters“ + „Animated Animals“, Vuena „Low-Poly Animals“).
// Gegner: Laufzyklus wird beim Laden in N Posen vorgebacken (Farben aus Textur → Eckpunktfarben) → Instancing ohne Skinning.
// Kreaturen/Bosse: geklonte Skin-Modelle mit AnimationMixer + prozedurales Zubehör, das an Knochen hängt.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { gradTex, glow, toon, flat, mk, geo } from './toon.js';

const PI = Math.PI;
export const MODELS = ['blob', 'ghost', 'skull', 'wizard', 'mushking', 'bee', 'bee2', 'rockling', 'demon', 'orc', 'dragon', 'wolf', 'bull', 'husky', 'stag', 'fox', 'owl', 'cat'];
export const ASSETS = {};
let ready = false;
export const assetsReady = () => ready;
export async function loadAssets(base = 'assets/models/') {
  const L = new GLTFLoader();
  await Promise.all(MODELS.map(async n => { try { ASSETS[n] = await L.loadAsync(base + n + '.glb'); } catch (e) { console.warn('Modell fehlt:', n, e?.message); } }));
  ready = Object.keys(ASSETS).length > 0;
}

// ───────── Farben aus Textur lesen ─────────
const pix = new Map();
function pixels(tex) {
  if (!tex?.image) return null;
  if (pix.has(tex.uuid)) return pix.get(tex.uuid);
  const im = tex.image, w = im.width, h = im.height, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
  const r = { w, h, d: g.getImageData(0, 0, w, h).data }; pix.set(tex.uuid, r); return r;
}
const C0 = new THREE.Color();
function texColor(P, u, v, out) {
  const x = Math.min(P.w - 1, Math.max(0, Math.floor((u - Math.floor(u)) * P.w))), y = Math.min(P.h - 1, Math.max(0, Math.floor((v - Math.floor(v)) * P.h))), i = (y * P.w + x) * 4;
  return out.setRGB(P.d[i] / 255, P.d[i + 1] / 255, P.d[i + 2] / 255, THREE.SRGBColorSpace);
}

// ───────── Gegner: Posen backen ─────────
// spec: { m: modell, clip, n: posen, h: zielhöhe, mul: farbe, mix: [farbe, anteil], extra: (frameGeos) => void, flip }
const bakeCache = new Map();
export function bakeFrames(spec) {
  const g = ASSETS[spec.m]; if (!g) return null;
  const key = JSON.stringify(spec) + (spec.extra ? spec.extra.toString().length : ''); if (bakeCache.has(key)) return bakeCache.get(key);
  const scene = SkeletonUtils.clone(g.scene), mixer = new THREE.AnimationMixer(scene);
  const clip = THREE.AnimationClip.findByName(g.animations, spec.clip || 'walk') || g.animations[0];
  if (clip) mixer.clipAction(clip).play();
  const meshes = []; scene.traverse(o => { if (o.isMesh) meshes.push(o); });
  const n = clip ? spec.n || 6 : 1, frames = [], v = new THREE.Vector3(), col = new THREE.Color(), tmp = new THREE.Color();
  const mul = new THREE.Color(spec.mul ?? 0xffffff), mixC = spec.mix ? new THREE.Color(spec.mix[0]) : null;
  for (let f = 0; f < n; f++) {
    if (clip) { mixer.setTime(clip.duration * f / n); }
    scene.updateMatrixWorld(true);
    const pos = [], cols = [], idx = [];
    for (const m of meshes) {
      const G = m.geometry, P = G.attributes.position, uv = G.attributes.uv, vc = G.attributes.color, base = pos.length / 3;
      const tex = pixels(m.material.map), mc = m.material.color || col.set(1, 1, 1);
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i);
        if (m.isSkinnedMesh) m.applyBoneTransform(i, v);
        v.applyMatrix4(m.matrixWorld); pos.push(v.x, v.y, v.z);
        col.copy(mc);
        if (tex && uv) col.multiply(texColor(tex, uv.getX(i), uv.getY(i), tmp));
        if (vc) col.multiply(tmp.setRGB(vc.getX(i), vc.getY(i), vc.getZ(i)));
        col.multiply(mul); if (mixC) col.lerp(mixC, spec.mix[1]);
        cols.push(col.r, col.g, col.b);
      }
      if (G.index) for (let i = 0; i < G.index.count; i++) idx.push(base + G.index.getX(i)); else for (let i = 0; i < P.count; i++) idx.push(base + i);
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); bg.setIndex(idx);
    frames.push(bg);
  }
  // auf Zielhöhe normieren (Füße auf 0, mittig), Blickrichtung +Z
  frames[0].computeBoundingBox(); const bb = frames[0].boundingBox, s = (spec.h || 0.6) / Math.max(0.01, bb.max.y - bb.min.y);
  const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2, y0 = spec.fly ? (bb.min.y + bb.max.y) / 2 : bb.min.y;
  for (const bg of frames) {
    bg.translate(-cx, -y0, -cz); bg.scale(s, s, s); if (spec.flip) bg.rotateY(PI);
    spec.extra?.(bg);
    bg.computeVertexNormals(); bg.computeBoundingSphere();
  }
  bakeCache.set(key, frames); return frames;
}
// Zusatzteil (z. B. Schild) in eine gebackene Pose einfügen
export function addPart(bg, g, color, M) {
  const src = g.index ? g.toNonIndexed() : g.clone(); src.applyMatrix4(M);
  const P0 = bg.attributes.position.array, C = bg.attributes.color.array, I = bg.index.array, n0 = P0.length / 3, P1 = src.attributes.position.array, c = new THREE.Color(color);
  const pos = new Float32Array(P0.length + P1.length); pos.set(P0); pos.set(P1, P0.length);
  const col = new Float32Array(C.length + P1.length); col.set(C); for (let i = 0; i < P1.length / 3; i++) col.set([c.r, c.g, c.b], C.length + i * 3);
  const idx = Array.from(I); for (let i = 0; i < P1.length / 3; i++) idx.push(n0 + i);
  bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('color', new THREE.BufferAttribute(col, 3)); bg.setIndex(idx);
}

// Gegner → Modell (h relativ zu def.h; cyc = Felder pro Laufzyklus, 0 = zeitbasiert)
const shieldM = new THREE.Matrix4().compose(new THREE.Vector3(0.05, 0.4, 0.47), new THREE.Quaternion(), new THREE.Vector3(0.62, 0.66, 0.07));
const bossM = new THREE.Matrix4().compose(new THREE.Vector3(0.05, 0.4, 0.51), new THREE.Quaternion(), new THREE.Vector3(0.15, 0.02, 0.15));
export const ENEMY_MODELS = {
  slime:  { m: 'blob', cyc: 0.8, h: 1.25 },
  wolf:   { m: 'wolf', cyc: 1.7, h: 1.45, mix: [0x6a5a3a, 0.25] },
  boar:   { m: 'bull', cyc: 1.1, h: 1.25, mix: [0x5a6a7a, 0.3] },
  wisp:   { m: 'ghost', cyc: 0, h: 1.0, fly: true, mul: 0xc8f8ff },
  shade:  { m: 'skull', cyc: 0, h: 1.0, mix: [0x4a2a7a, 0.5] },
  mage:   { m: 'wizard', cyc: 0.9, h: 1.05 },
  healer: { m: 'mushking', cyc: 0.9, h: 1.0 },
  beetle: { m: 'bee2', cyc: 0, h: 0.9, mix: [0x2a8a8a, 0.45] },
  mite:   { m: 'bee', cyc: 0, h: 0.8, mix: [0x3aa8a0, 0.45] },
  golem:  { m: 'rockling', cyc: 0, h: 1.0 },
  demon:  { m: 'demon', cyc: 0, h: 1.0 },
  bearer: { m: 'orc', cyc: 0.9, h: 1.1, extra: bg => { addPart(bg, geo.box(), 0x8a96a8, shieldM); addPart(bg, geo.cyl(10), 0xc8a050, bossM.clone().premultiply(new THREE.Matrix4()).multiply(new THREE.Matrix4().makeRotationX(PI / 2))); } },
  bearerX:{ m: 'orc', cyc: 0.9, h: 1.1 },
};

// ───────── Skin-Modelle: Klon + Mixer + Knochen-Zubehör ─────────
// Farbton-Verschiebung, die Helligkeit erhält (Textur oder Materialfarbe → Ziel-Farbe), optional Leuchten
function tintMat(src, tint, em) {
  const m = new THREE.MeshToonMaterial({ map: src.map || null, color: src.color?.clone() || new THREE.Color(1, 1, 1), vertexColors: !!src.vertexColors, gradientMap: gradTex });
  if (src.map) src.map.colorSpace = THREE.SRGBColorSpace;
  const u = { uTint: { value: new THREE.Vector4(...(tint ? [...new THREE.Color(tint[0]).toArray(), tint[1]] : [1, 1, 1, 0])) }, uEm: { value: new THREE.Color(em || 0) }, uFlash: { value: 0 } };
  m.userData.u = u;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec4 uTint; uniform vec3 uEm; uniform float uFlash;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float bfL = dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15));
        diffuseColor.rgb = mix(diffuseColor.rgb, uTint.rgb * (0.35 + bfL * 1.3), uTint.a);`)
      .replace('#include <dithering_fragment>', `float bfRim = 1.0 - max(dot(normalize(vViewPosition), normal), 0.0);
        gl_FragColor.rgb += vec3(1.0, 0.96, 0.9) * smoothstep(0.6, 0.92, bfRim) * 0.25 + uEm;
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), uFlash);
        #include <dithering_fragment>`);
  };
  m.customProgramCacheKey = () => 'bftint';
  return m;
}
const olMats = new Map();
function skinOutline(th) {
  if (olMats.has(th)) return olMats.get(th);
  const m = new THREE.MeshBasicMaterial({ color: 0x1a1424, side: THREE.BackSide });
  m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
    mvPosition.xyz += normalize(normalMatrix * objectNormal) * ${th.toFixed(4)}; gl_Position = projectionMatrix * mvPosition;`); };
  m.customProgramCacheKey = () => 'skol' + th; olMats.set(th, m); return m;
}

export class Rig {
  // o: { h: höhe, tint: [farbe, anteil], em: leuchtfarbe, ol: umrissdicke, rotY }
  constructor(name, o = {}) {
    const g = ASSETS[name];
    this.root = new THREE.Group(); this.norm = new THREE.Group(); this.root.add(this.norm);
    const model = SkeletonUtils.clone(g.scene); this.norm.add(model); this.model = model;
    this.mats = []; this.bones = {};
    const skinned = [];
    model.traverse(c => {
      if (c.isBone) this.bones[c.name] = c;
      if (c.isMesh) { if (!c.geometry.attributes.normal) c.geometry.computeVertexNormals(); c.material = tintMat(c.material, o.tint, o.em); this.mats.push(c.material); c.castShadow = true; c.frustumCulled = false; if (c.isSkinnedMesh) skinned.push(c); }
    });
    // Normieren: Höhe o.h, Füße auf 0, mittig
    this.mixer = new THREE.AnimationMixer(model); this.clips = {};
    for (const a of g.animations) this.clips[a.name] = this.mixer.clipAction(a);
    (this.clips.idle || this.clips.walk)?.play(); this.mixer.update(0.01);
    model.updateMatrixWorld(true);
    const bb = new THREE.Box3(), v = new THREE.Vector3();
    for (const m of skinned.length ? skinned : []) { const P = m.geometry.attributes.position; for (let i = 0; i < P.count; i += 3) { v.fromBufferAttribute(P, i); m.applyBoneTransform(i, v); v.applyMatrix4(m.matrixWorld); bb.expandByPoint(v); } }
    if (bb.isEmpty()) bb.setFromObject(model);
    const s = (o.h || 1) / Math.max(0.01, bb.max.y - bb.min.y);
    this.norm.scale.setScalar(s); this.norm.position.set(-(bb.min.x + bb.max.x) / 2 * s, -bb.min.y * s, -(bb.min.z + bb.max.z) / 2 * s);
    if (o.rotY) this.root.rotation.y = o.rotY;
    this.scale = s; this.size = bb.getSize(new THREE.Vector3()).multiplyScalar(s);
    // Umrisse: zweites Skin-Mesh auf demselben Skelett
    if (o.ol !== false) for (const m of skinned) { const l = new THREE.SkinnedMesh(m.geometry, skinOutline((o.ol || 0.016))); l.bind(m.skeleton, m.bindMatrix); l.position.copy(m.position); l.quaternion.copy(m.quaternion); l.scale.copy(m.scale); l.frustumCulled = false; m.parent.add(l); }
    this.root.updateMatrixWorld(true);
    this.cur = this.clips.idle || this.clips.walk; this.busy = 0; this.t = 0;
  }
  // Position eines Knochens in Root-Koordinaten (Ruhepose)
  bonePos(name) { const b = this.bones[name]; this.root.updateMatrixWorld(true); const p = new THREE.Vector3(); if (b) b.getWorldPosition(p); return this.root.worldToLocal(p); }
  // Objekt an Knochen hängen; Koordinaten des Objekts sind Root-Koordinaten relativ zu at (oder zum Knochen)
  attach(name, obj, at) {
    const b = this.bones[name]; if (!b) { this.root.add(obj); if (at) obj.position.add(at); return obj; }
    this.root.updateMatrixWorld(true);
    const p = at ? at.clone() : this.bonePos(name);
    const target = this.root.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(p.x, p.y, p.z));
    const w = new THREE.Group(); new THREE.Matrix4().copy(b.matrixWorld).invert().multiply(target).decompose(w.position, w.quaternion, w.scale);
    b.add(w); w.add(obj); return obj;
  }
  play(name, once = false, fade = 0.15) {
    const a = this.clips[name]; if (!a || a === this.cur && !once) return;
    a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = once; a.play();
    if (this.cur && this.cur !== a) this.cur.crossFadeTo(a, fade, false);
    this.cur = a; this.busy = once ? a.getClip().duration * 0.9 : 0;
  }
  // s.atk: 1 → frischer Angriff; s.dis: lahmgelegt
  update(dt, s = {}) {
    this.t += dt;
    if (this.busy > 0) this.busy -= dt;
    if ((s.atk || 0) > 0.92 && this.clips.attack && this.busy <= 0.1) this.play('attack', true, 0.08);
    else if (s.dis && this.clips.hit && this.busy <= 0) this.play('hit', true);
    else if (this.busy <= 0 && this.cur !== this.clips.idle && this.clips.idle) this.play('idle', false, 0.25);
    this.mixer.update(dt);
  }
  flash(f) { for (const m of this.mats) m.userData.u.uFlash.value = f; }
}

// ───────── Kreaturen ─────────
const S = () => geo.sphere(12), C = (n = 8) => geo.cone(n), B = () => geo.box();
const add = (par, g, m, o = {}) => { const x = mk(g, m, { ol: false, ...o }); par.add(x); return x; };
const KIT = { // Farbton je Form [farbe, anteil], Leuchten
  young: [null], flame: [[0xff5a1a, 0.35]], spirit: [[0xeef4ff, 0.8], 0x0a2030], shadow: [[0x6a40a8, 0.72], 0x140820],
  ninetail: [[0xfff0dc, 0.7]], celestial: [[0xfff4d0, 0.78], 0x201808], astral: [[0x3a48c8, 0.8], 0x101a50],
};
const GOLD = 0xffc94a;
function kitsune(o) {
  const st = o.stage || 0, br = o.branch || 'spirit', tiers = o.tiers || [0, 0, 0];
  const key = st === 2 ? br : ['young', 'flame', 'spirit', 'ninetail', 'celestial', 'astral'][st];
  let [tint, em] = KIT[key];
  if (o.skin === 1) tint = [0xf4f4ff, 0.85]; if (o.skin === 2) { tint = [0x2a3070, 0.8]; em = 0x0a1040; }
  const sc = [0.84, 0.94, 1.0, 1.14, 1.2, 1.28][st];
  const R = new Rig('fox', { h: 0.72 * sc, tint, em, ol: 0.012 });
  const flameC = { young: 0xff9a2a, flame: 0xff7a1a, spirit: 0x7df3ff, shadow: 0xa060ff, ninetail: 0xff7a2a, celestial: 0xffe9a0, astral: 0x9fb4ff }[key];
  const head = R.bonePos('Head'), tail = R.bonePos('Tail_1'), neck = R.bonePos('Neck');
  // Zusatzschweife (Fächer), hängen an der Hüfte
  const n = [0, 1, 2, 8, 8, 8][st], fur = toon([0xf08a3c, 0xff6a2a, 0xf3f1ff, 0xfff1df, 0xfffaf0, 0x2e338a][st === 2 && br === 'shadow' ? 1 : st] ?? 0xf08a3c), tails = [];
  const furC = st === 2 && br === 'shadow' ? toon(0x3a2a52) : fur, tipM = toon(0xfff6ea, { emissive: flameC, emissiveIntensity: st ? 0.5 : 0 });
  for (let i = 0; i < n; i++) {
    const a = n === 1 ? 0.7 : (i / (n - 1) - 0.5) * (n > 2 ? 2.6 : 1.4), tg = new THREE.Group();
    tg.rotation.set(-0.5, 0, a); const k = 0.26 * sc;
    add(tg, S(), furC, { p: [0, 0.3 * k, -0.25 * k], s: [0.22 * k, 0.24 * k, 0.3 * k], ol: 0.006 });
    add(tg, S(), furC, { p: [0, 0.75 * k, -0.45 * k], s: [0.3 * k, 0.32 * k, 0.32 * k], ol: 0.006 });
    add(tg, S(), tipM, { p: [0, 1.12 * k, -0.5 * k], s: [0.22 * k, 0.26 * k, 0.22 * k], ol: 0.006 });
    if (st >= 1) add(tg, C(), glow(flameC, 0.8), { p: [0, 1.42 * k, -0.48 * k], s: [0.12 * k, 0.4 * k, 0.12 * k] });
    tg.userData.a = a; tails.push(R.attach('Hips', tg, tail));
  }
  if (st >= 1) add(R.root, S(), glow(flameC, 0.9), { p: [tail.x, tail.y + 0.25 * sc, tail.z - 0.12], s: 0.045 }).userData.float = 1;
  const floaters = [];
  if (st === 1) for (const sd of [-1, 1]) floaters.push(add(R.root, S(), glow(0xffa040, 0.85), { p: [sd * 0.4, 0.8 * sc, -0.1], s: 0.05 }));
  if (st === 2 && br === 'spirit') { const nk = new THREE.Group(); for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 2.4; add(nk, S(), toon(i % 2 ? 0x3ad0ff : 0xffffff, { emissive: 0x3ad0ff, emissiveIntensity: 0.5 }), { p: [Math.sin(a) * 0.09 * sc, -Math.cos(a) * 0.03, Math.cos(a) * 0.06 * sc], s: 0.022 * sc }); } R.attach('Neck', nk, neck); }
  if (st === 2 && br === 'shadow') R.attach('Head', mk(geo.torus(0.25), toon(0xc77bff, { emissive: 0x8a30ff, emissiveIntensity: 0.9 }), { s: 0.07 * sc, r: [0.3, 0, 0] }), head.clone().add(new THREE.Vector3(0, 0.1 * sc, 0.03)));
  if (st >= 3) { // Shimenawa-Seil + Glocke am Hals
    const c = new THREE.Group(); add(c, geo.torus(0.22), toon(0xf2e6c8), { r: [PI / 2.2, 0, 0], s: 0.085 * sc, ol: 0.004 }); add(c, S(), toon(GOLD, { emissive: GOLD, emissiveIntensity: 0.35 }), { p: [0, -0.05 * sc, 0.08 * sc], s: 0.025 * sc, ol: 0.004 });
    for (const sd of [-1, 1]) add(c, B(), flat(0xffffff), { p: [sd * 0.05 * sc, -0.05 * sc, 0.07 * sc], r: [0, 0, sd * 0.3], s: [0.022, 0.06, 0.004].map(x => x * sc) });
    R.attach('Neck', c, neck);
  }
  let halo = null, runes = null; const rings = [];
  if (st >= 4) {
    halo = R.attach('Head', mk(geo.torus(0.07), glow(GOLD, 0.95), { s: 0.16 * sc }), head.clone().add(new THREE.Vector3(0, 0.12 * sc, -0.08 * sc)));
    runes = new THREE.Group(); runes.position.y = 0.45 * sc; R.root.add(runes);
    for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; add(runes, B(), glow(GOLD, 0.9), { p: [Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55], r: [0, -a, 0], s: [0.08, 0.12, 0.01] }); }
  }
  if (st >= 5) for (let i = 0; i < 2; i++) rings.push(add(R.root, geo.torus(0.025), glow(i ? 0x9fe8ff : 0xc8a8ff, 0.8), { p: [0, 0.5 * sc, 0], r: [PI / 2 + i * 0.6, i * 0.8, 0], s: 0.7 + i * 0.12 }));
  // Pfad-Optik
  if (tiers[2] >= 1) R.attach('Neck', mk(geo.torus(0.3), toon(0xc8283a), { r: [PI / 2.2, 0, 0], s: 0.08 * sc, ol: 0.004 }), neck);
  if (tiers[0] >= 3) for (const sd of [-1, 1]) add(R.root, C(), glow(0xff8a2a, 0.75), { p: [sd * 0.13, 0.62 * sc, neck.z - 0.05], r: [0, 0, sd * 0.3], s: [0.05, 0.18, 0.05] });
  let ofuda = null;
  if (tiers[1] >= 3) { ofuda = new THREE.Group(); ofuda.position.y = 0.72 * sc; R.root.add(ofuda); for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2; const p = add(ofuda, B(), flat(0xfff8ec), { p: [Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42], r: [0, -a, 0], s: [0.07, 0.15, 0.005] }); add(p, B(), flat(0xd8203a), { p: [0, 0, 0.6], s: [0.5, 0.6, 1] }); } }
  const lift = st >= 5 ? 0.2 : 0;
  const tick = (t, dt, s) => {
    R.update(dt, s); R.norm.position.y += 0;
    R.root.position.y = lift ? lift + Math.sin(t * 1.6) * 0.04 : 0;
    tails.forEach((tg, i) => { tg.rotation.z = tg.userData.a + Math.sin(t * 2.3 + i * 0.7) * 0.12; tg.rotation.x = -0.5 + Math.sin(t * 1.9 + i) * 0.08; });
    floaters.forEach((f, i) => { f.position.y = 0.8 * sc + Math.sin(t * 2.5 + i * 3) * 0.08; });
    if (halo) halo.rotation.z = t * 0.6;
    if (runes) { runes.rotation.y = t * 0.8; runes.position.y = 0.45 * sc + Math.sin(t * 2) * 0.04; }
    if (ofuda) ofuda.rotation.y = -t * 1.1;
    rings.forEach((r, i) => { r.rotation.z = t * (0.5 + i * 0.3); });
  };
  return { root: R.root, tick, height: 0.9 * sc + lift, rig: R };
}

function deer(o) {
  const st = o.stage || 0, sc = [0.9, 1.0, 1.1][st] || 1;
  const R = new Rig('stag', { h: 1.05 * sc, tint: [[0xd8f0ff, 0xf0fff4, 0xfff6d8][st], [0.35, 0.45, 0.55][st]], em: [0, 0x061a10, 0x201a06][st], ol: 0.014 });
  const head = R.bonePos(Object.keys(R.bones).find(k => /head/i.test(k)) || '');
  const hb = Object.keys(R.bones).find(k => /head/i.test(k));
  if (st >= 1) { const bl = new THREE.Group(); for (let i = 0; i < 6; i++) add(bl, S(), toon(st === 2 ? 0xfff2a8 : 0xffb0d0, { emissive: st === 2 ? 0xffd257 : 0xff6aa0, emissiveIntensity: 0.6 }), { p: [(i % 2 ? 1 : -1) * (0.06 + (i >> 1) * 0.03) * sc, (0.12 + (i >> 1) * 0.04) * sc, -0.02 * sc], s: 0.025 * sc }); R.attach(hb, bl, head); }
  let orb = null;
  if (st >= 2) orb = add(R.root, geo.oct(), toon(0xfff2a8, { emissive: 0xffd257, emissiveIntensity: 1 }), { p: [0, 1.25 * sc, 0], s: [0.06, 0.1, 0.06] });
  const aura = add(R.root, geo.torus(0.02), glow(st === 2 ? 0xffe9a0 : 0x9fffd0, 0.5), { p: [0, 0.03, 0], r: [PI / 2, 0, 0], s: 0.55 });
  const tick = (t, dt, s) => { R.update(dt, s); aura.scale.setScalar(0.55 + Math.sin(t * 2) * 0.04); if (orb) { orb.rotation.y = t * 1.5; orb.position.y = 1.25 * sc + Math.sin(t * 2.2) * 0.05; } };
  return { root: R.root, tick, height: 1.15 * sc, rig: R };
}

function raven(o) {
  const st = o.stage || 0, sc = [0.95, 1.05, 1.15][st] || 1;
  const root = new THREE.Group();
  // Steinpfosten (wie bisher) als Sitzplatz
  const stone = toon(0x8a8478), stone2 = toon(0x6a645a);
  add(root, geo.cyl(8), stone, { p: [0, 0.03, 0], s: [0.17, 0.06, 0.17], ol: 0.01 });
  add(root, geo.cyl(8), stone2, { p: [0, 0.2, 0], s: [0.065, 0.32, 0.065], ol: 0.01 });
  add(root, B(), stone, { p: [0, 0.4, 0], s: [0.24, 0.05, 0.24], ol: 0.01 });
  const R = new Rig('owl', { h: 0.55 * sc, tint: [[0x7a5ac8, 0x6a5aa8, 0x8a4ae8][st], 0.82], em: [0x080418, 0x080418, 0x200a40][st], ol: 0.01 });
  R.root.position.y = 0.42; root.add(R.root);
  const head = R.bonePos(Object.keys(R.bones).find(k => /head/i.test(k)) || ''), hb = Object.keys(R.bones).find(k => /head/i.test(k));
  if (st >= 1) R.attach(hb, mk(geo.sphere(10), toon(0xf4f0ea), { s: [0.1 * sc, 0.06 * sc, 0.05 * sc], ol: 0.006 }), head.clone().add(new THREE.Vector3(0, 0.02, 0.08 * sc)));
  const wisps = [];
  if (st >= 2) for (let i = 0; i < 4; i++) wisps.push(add(root, S(), glow(0xb07bff, 0.7), { s: 0.05 }));
  const tick = (t, dt, s) => { R.update(dt, s); wisps.forEach((w, i) => { const a = t * 1.6 + i * PI / 2; w.position.set(Math.cos(a) * 0.38, 0.75 + Math.sin(t * 3 + i) * 0.05, Math.sin(a) * 0.38); }); };
  return { root, tick, height: 1.05 * sc, rig: R };
}

function dragonwolf(o) {
  const st = o.stage || 0, br = o.branch, sc = [0.9, 1.0, 1.12][st] || 1;
  const fire = br === 'fire';
  const R = new Rig('husky', { h: 0.85 * sc, tint: [fire ? 0xff7040 : 0x9fd8ff, [0.35, 0.5, 0.6][st]], em: st >= 2 ? (fire ? 0x2a0800 : 0x061a2a) : 0, ol: 0.013 });
  const hb = Object.keys(R.bones).find(k => /head/i.test(k)), head = R.bonePos(hb || '');
  const hornM = toon(fire ? 0xffb070 : 0xdff8ff, { emissive: fire ? 0xff5a10 : 0x5ad8ff, emissiveIntensity: 0.5 });
  if (st >= 1) for (const sd of [-1, 1]) R.attach(hb, mk(C(), hornM, { r: [-0.6, 0, -sd * 0.35], s: [0.035 * sc, 0.16 * sc, 0.035 * sc], ol: 0.006 }), head.clone().add(new THREE.Vector3(sd * 0.06 * sc, 0.12 * sc, -0.04 * sc)));
  const wings = [];
  if (st >= 2) for (const sd of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(sd * 0.12, 0.62 * sc, 0); R.root.add(w);
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(sd * 1.0, 0.55); sh.lineTo(sd * 0.9, -0.1); sh.lineTo(sd * 0.6, -0.35); sh.lineTo(sd * 0.25, -0.2); sh.lineTo(0, 0);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), toon(fire ? 0xc84a2a : 0x5aa8d8, { side: THREE.DoubleSide })); m.rotation.x = -PI / 2.4; w.add(m); w.userData.sd = sd; wings.push(w);
  }
  const tick = (t, dt, s) => { R.update(dt, s); wings.forEach(w => { w.rotation.z = w.userData.sd * (0.3 + Math.sin(t * 3) * 0.25); }); };
  return { root: R.root, tick, height: 0.95 * sc, rig: R };
}

function golem(o) {
  const st = o.stage || 0, sc = [0.95, 1.05, 1.2][st] || 1;
  const R = new Rig('rockling', { h: 1.0 * sc, tint: [[0x9a8a78, 0x8ab8d8, 0x7a6a58][st], [0.25, 0.4, 0.35][st]], em: st === 1 ? 0x061620 : 0, ol: 0.014 });
  const crystals = [];
  if (st >= 1) for (let i = 0; i < 5; i++) crystals.push(add(R.root, geo.oct(), toon(0x8ff6ff, { emissive: 0x3ad0ff, emissiveIntensity: 0.9 }), { p: [Math.cos(i * 1.26) * 0.3 * sc, 0.95 * sc + (i % 2) * 0.08, Math.sin(i * 1.26) * 0.3 * sc], s: [0.04, 0.09, 0.04] }));
  const tick = (t, dt, s) => { R.update(dt, s); crystals.forEach((c, i) => { c.rotation.y = t + i; }); };
  return { root: R.root, tick, height: 1.1 * sc, rig: R };
}

export const GLB_CREATURES = { kitsune, deer, raven, dragonwolf, golem };
export function buildGlb(id, o) { return ready && GLB_CREATURES[id] && ASSETS[{ kitsune: 'fox', deer: 'stag', raven: 'owl', dragonwolf: 'husky', golem: 'rockling' }[id]] ? GLB_CREATURES[id](o) : null; }

// ───────── Bosse / Mini-Bosse ─────────
export function buildBig(kind) {
  const isBoss = kind !== 'oni', name = isBoss ? 'dragon' : 'orc';
  if (!ready || !ASSETS[name]) return null;
  const R = new Rig(name, isBoss ? { h: 2.2, tint: [0x4a2a6a, 0.45], ol: 0.02 } : { h: 1.6, tint: [0xd8402a, 0.6], ol: 0.02 });
  if (!isBoss) { const hm = toon(0xf0e0c0); for (const sd of [-1, 1]) add(R.root, C(), hm, { p: [sd * 0.22, 1.62, 0.05], r: [0, 0, -sd * 0.35], s: [0.07, 0.26, 0.07], ol: 0.012 }); add(R.root, B(), toon(0xf0b030), { p: [0, 0.55, 0.36], s: [0.5, 0.08, 0.06], ol: 0.01 }); }
  R.play(isBoss ? 'walk' : 'walk');
  const aura = isBoss ? add(R.root, geo.torus(0.06), glow(0xff3a20, 0).clone(), { p: [0, 0.05, 0], r: [PI / 2, 0, 0], s: 1.1 }) : null;
  const big = { root: R.root, height: isBoss ? 2.4 : 1.9, flash: 0, rig: R };
  big.tick = (t, dt, s) => {
    let want = 'walk';
    if (isBoss) { if (s.roar || s.breath) want = 'attack'; else if (s.fly) want = 'fly'; }
    else if (s.cry) want = 'attack';
    if (R.clips[want] && R.cur !== R.clips[want]) R.play(want, false, 0.2);
    R.mixer.update(dt * (isBoss && s.phase >= 3 ? 1.4 : 1));
    R.root.position.y = isBoss && s.fly ? 0.8 + Math.sin(t * 2) * 0.1 : 0;
    if (aura) { aura.material.opacity = s.phase >= 2 ? 0.3 + Math.sin(t * 6) * 0.1 : 0; aura.rotation.z = t; }
    R.flash(big.flash * 0.6);
  };
  return big;
}
