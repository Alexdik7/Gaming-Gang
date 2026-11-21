// Echte 3D-Modelle (CC0: Quaternius „Ultimate Monsters“ + „Animated Animals“, Vuena „Low-Poly Animals“).
// Gegner: Laufzyklus wird beim Laden in N Posen vorgebacken (Farben aus Textur → Eckpunktfarben) → Instancing ohne Skinning.
// Kreaturen/Bosse: geklonte Skin-Modelle mit AnimationMixer + prozedurales Zubehör, das an Knochen hängt.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { gradTex, glow, toon, flat, mk, geo } from './toon.js';

const PI = Math.PI;
export const MODELS = ['blob', 'ghost', 'skull', 'wizard', 'mushking', 'bee', 'bee2', 'rockling', 'demon', 'orc', 'dragon', 'wolf', 'bull', 'husky', 'stag', 'fox', 'owl', 'cat', 'deer2', 'fox2', 'shiba', 'pigeon', 'goleling', 'kk_ninja', 'kk_golem', 'kk_large1', 'kk_large2', 'kk_raizen', 'kk_mage', 'kk_anim1', 'kk_anim2', 'kk_anim3'];
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
  l1:     { m: 'blob', cyc: 0.7, h: 1.2, mix: [0x6ff0ff, 0.6] },
  l2:     { m: 'blob', cyc: 0.7, h: 1.2, mix: [0x5ad85a, 0.55] },
  l3:     { m: 'blob', cyc: 0.7, h: 1.2, mix: [0xff8a2a, 0.6] },
  l4:     { m: 'blob', cyc: 0.7, h: 1.2, mix: [0xa05aff, 0.6] },
  l5:     { m: 'blob', cyc: 0.7, h: 1.2, mix: [0xffd23a, 0.65] },
  kokon:  { m: 'blob', cyc: 0.9, h: 1.15, mix: [0x4a3a6a, 0.55], extra: bg => { for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; addPart(bg, geo.oct(), 0x8a7ab0, new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * 0.26, 0.42, Math.sin(a) * 0.26), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, a, 0.3)), new THREE.Vector3(0.1, 0.2, 0.1))); } addPart(bg, geo.oct(), 0xffd23a, new THREE.Matrix4().compose(new THREE.Vector3(0, 0.78, 0), new THREE.Quaternion(), new THREE.Vector3(0.09, 0.14, 0.09))); } },
};

// ───────── Skin-Modelle: Klon + Mixer + Knochen-Zubehör ─────────
// Farbton-Verschiebung, die Helligkeit erhält (Textur oder Materialfarbe → Ziel-Farbe), optional Leuchten
function tintMat(src, tint, em, stripes) {
  const m = new THREE.MeshToonMaterial({ map: src.map || null, color: src.color?.clone() || new THREE.Color(1, 1, 1), vertexColors: !!src.vertexColors, gradientMap: gradTex });
  if (src.map) src.map.colorSpace = THREE.SRGBColorSpace;
  const u = { uTint: { value: new THREE.Vector4(...(tint ? [...new THREE.Color(tint[0]).toArray(), tint[1]] : [1, 1, 1, 0])) }, uEm: { value: new THREE.Color(em || 0) }, uFlash: { value: 0 },
    uStripe: { value: new THREE.Vector4(...(stripes ? [...new THREE.Color(stripes[0]).toArray(), stripes[2]] : [0, 0, 0, 0])) }, uStripeF: { value: stripes ? stripes[1] : 1 } };
  m.userData.u = u;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBfPos;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvBfPos = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec4 uTint; uniform vec3 uEm; uniform float uFlash; uniform vec4 uStripe; uniform float uStripeF; varying vec3 vBfPos;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float bfL = dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15));
        diffuseColor.rgb = mix(diffuseColor.rgb, uTint.rgb * (0.35 + bfL * 1.3), uTint.a);
        float bfS = smoothstep(0.35, 0.75, sin(vBfPos.z * uStripeF + vBfPos.y * uStripeF * 0.35)) * smoothstep(0.3, 0.45, bfL);
        diffuseColor.rgb = mix(diffuseColor.rgb, uStripe.rgb, bfS * uStripe.a);`)
      .replace('#include <dithering_fragment>', `float bfRim = 1.0 - max(dot(normalize(vViewPosition), normal), 0.0);
        gl_FragColor.rgb += vec3(1.0, 0.96, 0.9) * smoothstep(0.6, 0.92, bfRim) * 0.25 + uEm;
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), uFlash);
        #include <dithering_fragment>`);
  };
  m.customProgramCacheKey = () => 'bftint2';
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
    const g = ASSETS[name]; if (!g) throw new Error('Modell fehlt: ' + name);
    this.root = new THREE.Group(); this.norm = new THREE.Group(); this.root.add(this.norm);
    const model = SkeletonUtils.clone(g.scene); this.norm.add(model); this.model = model;
    this.mats = []; this.bones = {};
    const skinned = [];
    model.traverse(c => {
      if (c.isBone) this.bones[c.name] = c;
      if (c.isMesh) { if (!c.geometry.attributes.normal) c.geometry.computeVertexNormals(); c.material = tintMat(c.material, o.tint, o.em, o.stripes); this.mats.push(c.material); c.castShadow = true; c.frustumCulled = false; if (c.isSkinnedMesh) skinned.push(c); }
    });
    // Normieren: Höhe o.h, Füße auf 0, mittig
    this.mixer = new THREE.AnimationMixer(model); this.clips = {};
    for (const a of [...g.animations, ...(o.anims || []).flatMap(n => ASSETS[n]?.animations || [])]) this.clips[a.name] = this.mixer.clipAction(a);
    for (const [k, v] of Object.entries(o.alias || {})) if (this.clips[v]) this.clips[k] = this.clips[v];
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
  const adult = st >= 3, R = new Rig(adult ? 'fox2' : 'fox', { h: (adult ? 0.66 : 0.72) * sc, tint, em, ol: 0.012 });
  const HB = boneBy(R, /^head$/i) || boneBy(R, /head/i), TB = boneBy(R, /^tail_?1$/i) || boneBy(R, /tail/i), NB = boneBy(R, /^neck/i), PB = boneBy(R, /^hips$|^body$/i) || TB;
  const flameC = { young: 0xff9a2a, flame: 0xff7a1a, spirit: 0x7df3ff, shadow: 0xa060ff, ninetail: 0xff7a2a, celestial: 0xffe9a0, astral: 0x9fb4ff }[key];
  const head = R.bonePos(HB), tail = R.bonePos(TB), neck = R.bonePos(NB);
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
    tg.userData.a = a; tails.push(R.attach(PB, tg, tail));
  }
  if (st >= 1) add(R.root, S(), glow(flameC, 0.9), { p: [tail.x, tail.y + 0.25 * sc, tail.z - 0.12], s: 0.045 }).userData.float = 1;
  const floaters = [];
  if (st === 1) for (const sd of [-1, 1]) floaters.push(add(R.root, S(), glow(0xffa040, 0.85), { p: [sd * 0.4, 0.8 * sc, -0.1], s: 0.05 }));
  if (st === 2 && br === 'spirit') { const nk = new THREE.Group(); for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 2.4; add(nk, S(), toon(i % 2 ? 0x3ad0ff : 0xffffff, { emissive: 0x3ad0ff, emissiveIntensity: 0.5 }), { p: [Math.sin(a) * 0.09 * sc, -Math.cos(a) * 0.03, Math.cos(a) * 0.06 * sc], s: 0.022 * sc }); } R.attach(NB, nk, neck); }
  if (st === 2 && br === 'shadow') R.attach(HB, mk(geo.torus(0.25), toon(0xc77bff, { emissive: 0x8a30ff, emissiveIntensity: 0.9 }), { s: 0.07 * sc, r: [0.3, 0, 0] }), head.clone().add(new THREE.Vector3(0, 0.1 * sc, 0.03)));
  if (st >= 3) { // Shimenawa-Seil + Glocke am Hals
    const c = new THREE.Group(); add(c, geo.torus(0.22), toon(0xf2e6c8), { r: [PI / 2.2, 0, 0], s: 0.085 * sc, ol: 0.004 }); add(c, S(), toon(GOLD, { emissive: GOLD, emissiveIntensity: 0.35 }), { p: [0, -0.05 * sc, 0.08 * sc], s: 0.025 * sc, ol: 0.004 });
    for (const sd of [-1, 1]) add(c, B(), flat(0xffffff), { p: [sd * 0.05 * sc, -0.05 * sc, 0.07 * sc], r: [0, 0, sd * 0.3], s: [0.022, 0.06, 0.004].map(x => x * sc) });
    R.attach(NB, c, neck);
  }
  let halo = null, runes = null; const rings = [];
  if (st >= 4) {
    halo = R.attach(HB, mk(geo.torus(0.07), glow(GOLD, 0.95), { s: 0.16 * sc }), head.clone().add(new THREE.Vector3(0, 0.12 * sc, -0.08 * sc)));
    runes = new THREE.Group(); runes.position.y = 0.45 * sc; R.root.add(runes);
    for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; add(runes, B(), glow(GOLD, 0.9), { p: [Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55], r: [0, -a, 0], s: [0.08, 0.12, 0.01] }); }
  }
  if (st >= 5) for (let i = 0; i < 2; i++) rings.push(add(R.root, geo.torus(0.025), glow(i ? 0x9fe8ff : 0xc8a8ff, 0.8), { p: [0, 0.5 * sc, 0], r: [PI / 2 + i * 0.6, i * 0.8, 0], s: 0.7 + i * 0.12 }));
  // Pfad-Optik
  if (tiers[2] >= 1) R.attach(NB, mk(geo.torus(0.3), toon(0xc8283a), { r: [PI / 2.2, 0, 0], s: 0.08 * sc, ol: 0.004 }), neck);
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
  const R = new Rig(st ? 'stag' : 'deer2', { h: (st ? 1.05 : 0.85) * sc, tint: [[0xd8f0ff, 0xf0fff4, 0xfff6d8][st], [0.35, 0.45, 0.55][st]], em: [0, 0x061a10, 0x201a06][st], ol: 0.014 });
  const head = R.bonePos(Object.keys(R.bones).find(k => /head/i.test(k)) || '');
  const hb = Object.keys(R.bones).find(k => /head/i.test(k));
  if (st >= 1) { const bl = new THREE.Group(); for (let i = 0; i < 6; i++) add(bl, S(), toon(st === 2 ? 0xfff2a8 : 0xffb0d0, { emissive: st === 2 ? 0xffd257 : 0xff6aa0, emissiveIntensity: 0.6 }), { p: [(i % 2 ? 1 : -1) * (0.06 + (i >> 1) * 0.03) * sc, (0.12 + (i >> 1) * 0.04) * sc, -0.02 * sc], s: 0.025 * sc }); R.attach(hb, bl, head); }
  let orb = null;
  if (st >= 2) orb = add(R.root, geo.oct(), toon(0xfff2a8, { emissive: 0xffd257, emissiveIntensity: 1 }), { p: [0, 1.25 * sc, 0], s: [0.06, 0.1, 0.06] });
  const aura = add(R.root, geo.torus(0.02), glow(st === 2 ? 0xffe9a0 : 0x9fffd0, 0.5), { p: [0, 0.03, 0], r: [PI / 2, 0, 0], s: 0.55 });
  const pg = pathGear(R, o.tiers, sc);
  const tick = (t, dt, s) => { R.update(dt, s); pg(t); aura.scale.setScalar(0.55 + Math.sin(t * 2) * 0.04); if (orb) { orb.rotation.y = t * 1.5; orb.position.y = 1.25 * sc + Math.sin(t * 2.2) * 0.05; } };
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
  const R = new Rig(st ? 'owl' : 'pigeon', { h: (st ? 0.55 : 0.45) * sc, tint: [[0x3a3050, 0x6a5aa8, 0x8a4ae8][st], [0.85, 0.82, 0.82][st]], em: [0x06030e, 0x080418, 0x200a40][st], ol: 0.01 });
  if (!st) R.root.position.y = 0.12;
  R.root.position.y = 0.42; root.add(R.root);
  const head = R.bonePos(Object.keys(R.bones).find(k => /head/i.test(k)) || ''), hb = Object.keys(R.bones).find(k => /head/i.test(k));
  if (st >= 1) R.attach(hb, mk(geo.sphere(10), toon(0xf4f0ea), { s: [0.1 * sc, 0.06 * sc, 0.05 * sc], ol: 0.006 }), head.clone().add(new THREE.Vector3(0, 0.02, 0.08 * sc)));
  const wisps = [];
  if (st >= 2) for (let i = 0; i < 4; i++) wisps.push(add(root, S(), glow(0xb07bff, 0.7), { s: 0.05 }));
  const vw = [];
  if (st >= 2) for (const sd of [-1, 1]) for (let j = 0; j < 2; j++) { // vier Schwingen aus Leere
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(sd * 0.55, 0.3 - j * 0.12); sh.lineTo(sd * 0.48, 0.02 - j * 0.1); sh.lineTo(sd * 0.3, -0.12); sh.lineTo(0, 0);
    const w = new THREE.Mesh(new THREE.ShapeGeometry(sh), toon(0x2a1a4a, { side: THREE.DoubleSide, emissive: 0x5a20a0, emissiveIntensity: 0.5 })); w.position.set(sd * 0.08, 0.72 - j * 0.1, -0.05); w.userData.sd = sd; w.userData.j = j; root.add(w); vw.push(w);
  }
  const pg = pathGear(R, o.tiers, sc, { noHead: true });
  const tick = (t, dt, s) => { R.update(dt, s); pg(t); vw.forEach(w => { w.rotation.z = w.userData.sd * (Math.sin(t * 2.4 + w.userData.j) * 0.25); w.rotation.x = -0.3; }); wisps.forEach((w, i) => { const a = t * 1.6 + i * PI / 2; w.position.set(Math.cos(a) * 0.38, 0.75 + Math.sin(t * 3 + i) * 0.05, Math.sin(a) * 0.38); }); };
  return { root, tick, height: 1.05 * sc, rig: R };
}

function dragonwolf(o) {
  const st = o.stage || 0, br = o.branch, sc = [0.9, 1.0, 1.12][st] || 1;
  const fire = br === 'fire';
  const R = new Rig(['shiba', 'husky', 'wolf'][st] || 'husky', { h: [0.7, 0.85, 0.95][st] * sc, tint: [fire ? 0xff7040 : 0x9fd8ff, [0.35, 0.5, 0.6][st]], em: st >= 2 ? (fire ? 0x2a0800 : 0x061a2a) : 0, ol: 0.013 });
  const hb = Object.keys(R.bones).find(k => /head/i.test(k)), head = R.bonePos(hb || '');
  const hornM = toon(fire ? 0xffb070 : 0xdff8ff, { emissive: fire ? 0xff5a10 : 0x5ad8ff, emissiveIntensity: 0.5 });
  if (st >= 1) for (const sd of [-1, 1]) R.attach(hb, mk(C(), hornM, { r: [-0.6, 0, -sd * 0.35], s: [0.035 * sc, 0.16 * sc, 0.035 * sc], ol: 0.006 }), head.clone().add(new THREE.Vector3(sd * 0.06 * sc, 0.12 * sc, -0.04 * sc)));
  const wings = [];
  if (st >= 2) for (const sd of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(sd * 0.12, 0.62 * sc, 0); R.root.add(w);
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(sd * 1.0, 0.55); sh.lineTo(sd * 0.9, -0.1); sh.lineTo(sd * 0.6, -0.35); sh.lineTo(sd * 0.25, -0.2); sh.lineTo(0, 0);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), toon(fire ? 0xc84a2a : 0x5aa8d8, { side: THREE.DoubleSide })); m.rotation.x = -PI / 2.4; w.add(m); w.userData.sd = sd; wings.push(w);
  }
  const pg = pathGear(R, o.tiers, sc);
  const tick = (t, dt, s) => { R.update(dt, s); pg(t); wings.forEach(w => { w.rotation.z = w.userData.sd * (0.3 + Math.sin(t * 3) * 0.25); }); };
  return { root: R.root, tick, height: 0.95 * sc, rig: R };
}

function golem(o) {
  const st = o.stage || 0, sc = [0.95, 1.05, 1.2][st] || 1;
  const R = st ? new Rig('kk_golem', { h: [0, 1.0, 1.15][st] * sc, tint: [[0, 0x9fd8ff, 0x8a7a68][st], [0, 0.25, 0.75][st]], em: st === 1 ? 0x061a2a : 0x100804, ol: 0.014, anims: ['kk_large1', 'kk_large2'], alias: { attack: 'smash' } })
    : new Rig('goleling', { h: 0.75 * sc, tint: [0x9a8a78, 0.3], ol: 0.014 });
  if (st) R.play('idle');
  const crystals = [];
  if (st === 1) for (let i = 0; i < 5; i++) crystals.push(add(R.root, geo.oct(), toon(0x8ff6ff, { emissive: 0x3ad0ff, emissiveIntensity: 0.9 }), { p: [Math.cos(i * 1.26) * 0.32 * sc, 1.05 * sc + (i % 2) * 0.08, Math.sin(i * 1.26) * 0.32 * sc], s: [0.04, 0.09, 0.04] }));
  if (st === 2) { const cb = boneBy(R, /chest/), cp = R.bonePos(cb); for (let i = 0; i < 6; i++) { const q = (i / 5 - 0.5) * 2.2; R.attach(cb, mk(geo.dodec(), toon(i % 2 ? 0x5a8a3a : 0x6a5a48), { r: [i, i * 2, 0], s: [0.09, 0.07, 0.08], ol: 0.006 }), cp.clone().add(new THREE.Vector3(Math.sin(q) * 0.3, 0.32 + Math.cos(q) * 0.06, -0.08))); } const lava = mk(geo.sphere(10), glow(0xff7a2a, 0.9), { s: 0.06 }); R.attach(cb, lava, cp.clone().add(new THREE.Vector3(0, 0.1, 0.28))); crystals.push(lava); }
  const pg = pathGear(R, o.tiers, sc, { noHead: true });
  const tick = (t, dt, s) => { R.update(dt, s); pg(t); crystals.forEach((c, i) => { c.rotation.y = t + i; }); };
  return { root: R.root, tick, height: 1.1 * sc, rig: R };
}


// ───────── Sichtbare Pfadstufen (für alle Modell-Kreaturen) ─────────
// Pfad 1: Kopf (Stirnband → Juwel → Klingen/Flammen an den Schultern → Krone aus Licht)
// Pfad 2: Rücken (Kragen → Wappen → kreisende Kugeln → Heiligenschein)
// Pfad 3: Boden (Runenkreis → helle Runen → Runensteine → Lichtsäule)
export const PATH_COL = [0xff7a3d, 0x5fd6ff, 0xc39bff];
const boneBy = (R, re) => Object.keys(R.bones).find(k => re.test(k));
export function pathGear(R, tiers = [0, 0, 0], sc = 1, o = {}) {
  const anim = [], H = R.size.y, W = Math.max(R.size.x, R.size.z);
  const hb = boneBy(R, /^head$|head/i), bb = boneBy(R, /chest|spine|neck/i);
  const head = hb ? R.bonePos(hb) : new THREE.Vector3(0, H * 0.9, 0), back = bb ? R.bonePos(bb) : new THREE.Vector3(0, H * 0.6, 0);
  const [a, b, c] = tiers, k = 0.5 + H * 0.5;
  const gm = (col, i = 0.6) => toon(col, { emissive: col, emissiveIntensity: i });
  if (a >= 1 && !o.noHead) { const band = mk(geo.torus(0.18), toon(PATH_COL[0]), { r: [PI / 2, 0, 0], s: 0.11 * k, ol: 0.004 }); R.attach(hb, band, head.clone().add(new THREE.Vector3(0, 0.03 * k, 0))); }
  if (a >= 2 && !o.noHead) R.attach(hb, mk(geo.oct(), gm(0xffd257, 0.8), { s: [0.03 * k, 0.05 * k, 0.02 * k], ol: 0.004 }), head.clone().add(new THREE.Vector3(0, 0.05 * k, 0.11 * k)));
  if (a >= 3) for (const sd of [-1, 1]) { const f = mk(C(), glow(PATH_COL[0], 0.85), { s: [0.05 * k, 0.2 * k, 0.05 * k] }); f.position.set(sd * (W * 0.32 + 0.08), H * 0.72, back.z); R.root.add(f); anim.push(t => { f.scale.y = 0.2 * k * (1 + Math.sin(t * 9 + sd) * 0.15); }); }
  if (a >= 4) { const r = mk(geo.torus(0.05), glow(PATH_COL[0], 0.6), { r: [PI / 2, 0, 0], s: 0.18 * k }); r.position.set(head.x, head.y + 0.18 * k, head.z); R.root.add(r); anim.push(t => { r.rotation.z = t * 2; }); }
  if (a >= 5) { const cr = new THREE.Group(); cr.position.set(head.x, head.y + 0.24 * k, head.z); R.root.add(cr); for (let i = 0; i < 5; i++) { const q = i / 5 * PI * 2; cr.add(mk(C(4), gm(0xffd257, 1.2), { p: [Math.cos(q) * 0.12 * k, 0, Math.sin(q) * 0.12 * k], s: [0.025 * k, 0.09 * k, 0.025 * k], ol: 0.004 })); } anim.push(t => { cr.rotation.y = t * 1.2; cr.position.y = head.y + 0.24 * k + Math.sin(t * 2) * 0.02; }); }
  if (b >= 1) R.attach(bb, mk(geo.torus(0.3), toon(PATH_COL[1]), { r: [PI / 2.2, 0, 0], s: 0.13 * k * (o.collar || 1), ol: 0.004 }), back.clone());
  if (b >= 2) R.attach(bb, mk(geo.cyl(10), gm(PATH_COL[1], 0.5), { r: [PI / 2, 0, 0], s: [0.07 * k, 0.015, 0.07 * k], ol: 0.004 }), back.clone().add(new THREE.Vector3(0, 0.06 * k, -0.1 * k)));
  if (b >= 3) { const n = b >= 4 ? 4 : 2, orbs = []; for (let i = 0; i < n; i++) { const s = mk(geo.sphere(10), glow(PATH_COL[1], 0.9), { s: 0.045 * k }); R.root.add(s); orbs.push(s); } anim.push(t => orbs.forEach((s, i) => { const q = t * 2 + i * PI * 2 / n; s.position.set(Math.cos(q) * (W * 0.5 + 0.15), H * 0.55 + Math.sin(t * 3 + i) * 0.05, Math.sin(q) * (W * 0.5 + 0.15)); })); }
  if (b >= 5) { const h = mk(geo.torus(0.04), glow(PATH_COL[1], 0.8), { s: 0.28 * k }); h.position.set(back.x, H * 0.75, back.z - 0.12 * k); R.root.add(h); anim.push(t => { h.rotation.z = t; }); }
  if (c >= 1) { const ring = mk(geo.torus(0.02), glow(PATH_COL[2], c >= 2 ? 0.75 : 0.4), { r: [PI / 2, 0, 0], s: W * 0.55 + 0.2 }); ring.position.y = 0.02; R.root.add(ring); anim.push(t => { ring.rotation.z = t * 0.5; }); }
  if (c >= 3) { const n = c >= 4 ? 5 : 3; for (let i = 0; i < n; i++) { const q = i / n * PI * 2, st = mk(geo.box(), toon(0x6a6478), { p: [Math.cos(q) * (W * 0.55 + 0.2), 0.08, Math.sin(q) * (W * 0.55 + 0.2)], r: [0, -q, 0], s: [0.05, 0.16, 0.03], ol: 0.004 }); R.root.add(st); st.add(mk(geo.box(), glow(PATH_COL[2], 0.9), { p: [0, 0.1, 0.6], s: [0.6, 0.4, 0.1] })); } }
  if (c >= 5) { const col = mk(geo.cyl(16), glow(PATH_COL[2], 0.18), { p: [0, 0.9, 0], s: [W * 0.5 + 0.1, 1.8, W * 0.5 + 0.1] }); R.root.add(col); anim.push(t => { col.material.opacity = 0.14 + Math.sin(t * 2.5) * 0.05; }); }
  // Stufe 4/5: das Modell selbst verändert sich (Leuchten in Pfadfarbe, etwas größer)
  const top = Math.max(a, b, c), pi = [a, b, c].indexOf(top);
  if (top >= 4 && R.mats) { for (const m of R.mats) m.userData.u.uEm.value.lerp(new THREE.Color(PATH_COL[pi]), top >= 5 ? 0.22 : 0.1); R.norm.scale.multiplyScalar(top >= 5 ? 1.1 : 1.04); }
  return t => anim.forEach(f => f(t));
}
// Pfad-Ausrüstung auch für prozedurale Modelle (ohne Knochen): alles hängt am Wurzelobjekt
export function gearOn(m, tiers) {
  const bb = new THREE.Box3().setFromObject(m.root), size = bb.getSize(new THREE.Vector3());
  const R = { root: m.root, bones: {}, size, bonePos: () => new THREE.Vector3(0, size.y * 0.85, 0), attach: (b, obj, at) => { m.root.add(obj); if (at) obj.position.add(at); return obj; } };
  const g = pathGear(R, tiers, 1, { noHead: true }), tick = m.tick;
  m.tick = (t, dt, s) => { tick(t, dt, s); g(t); };
  return m;
}

function tiger(o) {
  const st = o.stage || 0, sc = [0.9, 1.0, 1.12][st] || 1;
  const R = new Rig('cat', { h: [0.72, 0.85, 0.98][st] * sc, tint: [[0xffa020, 0xff8a20, 0xf4f0ff][st], [0.7, 0.75, 0.85][st]], em: [0, 0x0a0a20, 0x14100a][st], stripes: [[0x24140e, 0x1a3aa8, 0x2a1a50][st], 75, 0.9], ol: 0.012 });
  const hb = boneBy(R, /head/i), head = R.bonePos(hb), hornM = toon(0xfff27a, { emissive: 0xffd000, emissiveIntensity: 0.9 });
  if (st >= 1) for (const sd of [-1, 1]) R.attach(hb, mk(C(4), hornM, { r: [-0.25, 0, -sd * 0.45], s: [0.05 * sc, 0.28 * sc, 0.05 * sc], ol: 0.005 }), head.clone().add(new THREE.Vector3(sd * 0.11 * sc, 0, 0.02)).setY(R.size.y * 0.97));
  const sparks = [];
  if (st >= 1) { const bolts = new THREE.Group(); for (const sd of [-1, 1]) bolts.add(mk(C(4), glow(0x9fd8ff, 0.9), { p: [sd * 0.22 * sc, 0.45 * sc, -0.05], r: [0, 0, sd * 0.4], s: [0.025, 0.12, 0.025] })); R.root.add(bolts); sparks.push(bolts); }
  if (st >= 2) { const mane = new THREE.Group(); for (let i = 0; i < 12; i++) { const q = i / 12 * PI * 2; mane.add(mk(C(4), toon(0xffd257, { emissive: 0xffa000, emissiveIntensity: 0.7 }), { p: [Math.cos(q) * 0.2 * sc, Math.sin(q) * 0.2 * sc, -0.06], r: [0, 0, q - PI / 2], s: [0.05, 0.16, 0.04], ol: 0.004 })); } mane.scale.setScalar(1.6); R.attach(hb, mane, head.clone().add(new THREE.Vector3(0, 0, -0.1 * sc)).setY(R.size.y * 0.66)); sparks.push(mane); }
  const g = pathGear(R, o.tiers, sc);
  const tick = (t, dt, s) => { R.update(dt, s); g(t); sparks.forEach(m => { m.rotation.z = Math.sin(t * 10) * 0.08; }); };
  return { root: R.root, tick, height: 0.8 * sc, rig: R };
}

// ───────── Helden (KayKit-Figuren, Animationen aus kk_anim*) ─────────
function hero(model, o, look) {
  const lvl = o.hlvl || 1, form = lvl >= 20 ? 2 : lvl >= 15 ? 1 : 0;
  const R = new Rig(model, { h: 0.95, tint: look.tint, em: form === 2 ? look.em : 0, ol: 0.012, anims: ['kk_anim1', 'kk_anim2', 'kk_anim3'], alias: { attack: look.atk, ...(look.alias || {}) } });
  R.play('idle');
  const hb = boneBy(R, /^head$/i), head = R.bonePos(hb), anim = [];
  look.build(R, head, hb, form, anim);
  if (form >= 1) { const a = mk(geo.torus(0.02), glow(look.col, 0.7), { r: [PI / 2, 0, 0], s: 0.42 }); a.position.y = 0.03; R.root.add(a); anim.push(t => { a.scale.setScalar(0.42 + Math.sin(t * 3) * 0.03); }); }
  if (form >= 2) { const n = 6, ps = []; for (let i = 0; i < n; i++) { const p = mk(geo.sphere(8), glow(look.col, 0.9), { s: 0.035 }); R.root.add(p); ps.push(p); } anim.push(t => ps.forEach((p, i) => { const q = t * 1.5 + i * PI * 2 / n; p.position.set(Math.cos(q) * 0.42, 0.5 + Math.sin(t * 2 + i) * 0.25, Math.sin(q) * 0.42); })); }
  const tick = (t, dt, s) => { R.update(dt, s); anim.forEach(f => f(t)); };
  return { root: R.root, tick, height: 1.1, rig: R };
}
const ear = (R, hb, head, sd, col) => R.attach(hb, mk(C(4), toon(col), { r: [0, PI / 4, -sd * 0.3], s: [0.09, 0.2, 0.06], ol: 0.006 }), head.clone().add(new THREE.Vector3(sd * 0.14, R.size.y - head.y + 0.04 + head.y - head.y, 0)).setY(R.size.y + 0.02));
const HEROES3D = {
  kairo: o => hero('kk_ninja', o, { tint: [0x2a3468, 0.35], em: 0x200a00, col: 0xff7a2a, atk: 'throw', build(R, head, hb, form, anim) {
    for (const sd of [-1, 1]) { ear(R, hb, head, sd, 0xf08a3c); R.attach(hb, mk(C(4), toon(0xfff1dc), { r: [0, PI / 4, -sd * 0.3], s: [0.045, 0.11, 0.03] }), head.clone().add(new THREE.Vector3(sd * 0.14, 0, 0.025)).setY(R.size.y + 0.01)); }
    if (form >= 2) for (let i = 0; i < 3; i++) { const tl = mk(geo.sphere(10), toon(0xf08a3c, { emissive: 0xff5a10, emissiveIntensity: 0.5 }), { s: [0.07, 0.07, 0.22], ol: 0.006 }); tl.position.set((i - 1) * 0.12, 0.38, -0.25); tl.rotation.x = -0.6; R.root.add(tl); anim.push(t => { tl.rotation.y = (i - 1) * 0.4 + Math.sin(t * 2 + i) * 0.15; }); }
  } }),
  raizen: o => hero('kk_raizen', o, { tint: [0x4a4a8a, 0.45], em: 0x1a1600, col: 0xffe14d, atk: 'magic', build(R, head, hb, form, anim) {
    R.attach(hb, mk(geo.torus(0.12), toon(0xffe14d, { emissive: 0xffc000, emissiveIntensity: 0.6 }), { r: [PI / 2, 0, 0], s: 0.24, ol: 0.005 }), head.clone().add(new THREE.Vector3(0, 0.2, 0)));
    const bolts = []; for (const sd of [-1, 1]) { const b = mk(C(4), glow(0xfff27a, 0.9), { s: [0.03, 0.14, 0.03] }); b.position.set(sd * 0.28, 0.7, 0); R.root.add(b); bolts.push(b); }
    anim.push(t => bolts.forEach((b, i) => { b.visible = Math.sin(t * 13 + i * 2) > -0.3; b.rotation.z = Math.sin(t * 20 + i) * 0.4; }));
  } }),
  mika: o => hero('kk_mage', o, { tint: [0xffc8e4, 0.5], em: 0x1a0a18, col: 0xff9ac8, atk: 'cast', build(R, head, hb, form, anim) {
    const lotus = new THREE.Group(); for (let i = 0; i < 6; i++) { const q = i / 6 * PI * 2; lotus.add(mk(geo.sphere(8), toon(0xffb0d0, { emissive: 0xff6aa0, emissiveIntensity: 0.4 }), { p: [Math.cos(q) * 0.06, 0, Math.sin(q) * 0.06], s: [0.035, 0.015, 0.02], r: [0, -q, 0.4] })); }
    R.attach(hb, lotus, head.clone().add(new THREE.Vector3(0.1, 0.33, 0)));
    const orb = mk(geo.sphere(12), glow(0xff9ac8, 0.85), { s: 0.06 }); R.root.add(orb); anim.push(t => { orb.position.set(0.32 + Math.sin(t) * 0.03, 0.75 + Math.sin(t * 2) * 0.05, 0.12); });
  } }),
};

// Glückskatze (Maneki-Neko): sitzt, winkt beim „Angriff“; Form = Fellfarbe + Schmuck
function neko(o) {
  const st = o.stage || 0, sc = [0.9, 1.0, 1.12][st] || 1;
  const R = new Rig('cat', { h: 0.7 * sc, tint: [[0xfff8f0, 0xffd257, 0xfffaf0][st], [0.8, 0.7, 0.85][st]], em: [0, 0x1a1200, 0x140c00][st], ol: 0.012, alias: { idle: 'sit', attack: 'call' } });
  R.play('idle');
  const nb = boneBy(R, /^neck/i) || boneBy(R, /head/i), neck = R.bonePos(nb), hb = boneBy(R, /^head$/i) || boneBy(R, /head/i), head = R.bonePos(hb);
  const gold = toon(0xffd257, { emissive: 0xa07010, emissiveIntensity: 0.45 }), red = toon(0xd8342c);
  const col = new THREE.Group(); add(col, geo.torus(0.25), red, { r: [PI / 2, 0, 0], s: 0.075 * sc, ol: 0.004 }); add(col, S(12), gold, { p: [0, -0.03 * sc, 0.075 * sc], s: 0.024 * sc, ol: 0.004 });
  R.attach(nb, col, neck);
  // Goldkoban vor der Brust
  const koban = mk(geo.cyl(16), gold, { r: [PI / 2, 0, 0], s: [0.07 * sc, 0.012, 0.1 * sc], ol: 0.005 }); koban.add(mk(geo.box(), toon(0x8a5a10), { p: [0, 0.6, 0], s: [0.5, 0.2, 0.08], ol: false }));
  R.attach(nb, koban, neck.clone().add(new THREE.Vector3(0, -0.11 * sc, 0.09 * sc)));
  const coins = [];
  if (st >= 1) for (let i = 0; i < (st === 2 ? 8 : 4); i++) { const c = mk(geo.cyl(12), gold, { s: [0.04, 0.008, 0.04], ol: 0.003 }); R.root.add(c); coins.push(c); }
  if (st === 2) { // kleines Torii im Rücken
    const g = new THREE.Group(); g.position.set(0, 0, -0.32 * sc); R.root.add(g);
    for (const x of [-0.17, 0.17]) add(g, geo.cyl(8), red, { p: [x * sc, 0.3 * sc, 0], s: [0.025 * sc, 0.6 * sc, 0.025 * sc], ol: 0.004 });
    add(g, geo.box(), toon(0x2a2a36), { p: [0, 0.62 * sc, 0], s: [0.5 * sc, 0.04 * sc, 0.05 * sc], ol: 0.004 }); add(g, geo.box(), red, { p: [0, 0.54 * sc, 0], s: [0.42 * sc, 0.03 * sc, 0.04 * sc], ol: 0.004 });
  }
  const pg = pathGear(R, o.tiers, sc);
  const tick = (t, dt, s) => { R.update(dt, s); pg(t); coins.forEach((c, i) => { const q = t * 1.4 + i * PI * 2 / coins.length; c.position.set(Math.cos(q) * 0.34 * sc, 0.45 * sc + Math.sin(t * 2 + i) * 0.04, Math.sin(q) * 0.34 * sc); c.rotation.set(PI / 2, 0, q); }); };
  return { root: R.root, tick, height: 0.8 * sc, rig: R };
}

export const GLB_CREATURES = { kitsune, deer, raven, dragonwolf, golem, tiger, neko, ...HEROES3D };
const SRC = { kitsune: 'fox', deer: 'stag', raven: 'owl', dragonwolf: 'husky', golem: 'rockling', tiger: 'cat', neko: 'cat', kairo: 'kk_ninja', raizen: 'kk_raizen', mika: 'kk_mage' };
export function buildGlb(id, o) { if (!(ready && GLB_CREATURES[id] && ASSETS[SRC[id]])) return null; try { return GLB_CREATURES[id](o); } catch (e) { console.warn(e.message); return null; } }

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
