// Anime-Look: Toon-Schattierung (3 Stufen) + Randlicht + dunkle Umrisse (Inverted Hull).
import * as THREE from 'three';

const grad = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
export const gradTex = new THREE.DataTexture(grad, 3, 1, THREE.RGBAFormat);
gradTex.minFilter = gradTex.magFilter = THREE.NearestFilter; gradTex.needsUpdate = true;

const RIM = `
  float bfRim = 1.0 - max(dot(normalize(vViewPosition), normal), 0.0);
  gl_FragColor.rgb += vec3(1.0, 0.96, 0.9) * smoothstep(0.6, 0.92, bfRim) * 0.28;
  #include <dithering_fragment>`;

function patchRim(m) {
  m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', RIM); };
  m.customProgramCacheKey = () => 'bfrim';
  return m;
}

const cache = new Map();
export function toon(color, o = {}) {
  const key = 't' + color + JSON.stringify(o);
  if (cache.has(key)) return cache.get(key);
  const m = patchRim(new THREE.MeshToonMaterial({ color, gradientMap: gradTex, ...o }));
  cache.set(key, m); return m;
}
export function glow(color, opacity = 1, o = {}) {
  const key = 'g' + color + opacity + JSON.stringify(o);
  if (cache.has(key)) return cache.get(key);
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, ...o });
  cache.set(key, m); return m;
}
export function flat(color, o = {}) {
  const key = 'f' + color + JSON.stringify(o);
  if (cache.has(key)) return cache.get(key);
  const m = new THREE.MeshBasicMaterial({ color, ...o }); cache.set(key, m); return m;
}

// Umriss: Rückseiten entlang der Normalen aufblasen
// Dicke in Welt-Einheiten, unabhängig von der Objekt-Skalierung (View-Space)
const OLV = th => `#include <project_vertex>
  vec3 bfN = normal;
  #ifdef USE_INSTANCING
    bfN = mat3(instanceMatrix) * bfN;
  #endif
  mvPosition.xyz += normalize(normalMatrix * bfN) * ${th.toFixed(4)};
  gl_Position = projectionMatrix * mvPosition;`;
function makeOutline(th, color = 0x1a1424) {
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', OLV(th)); };
  m.customProgramCacheKey = () => 'ol' + th;
  return m;
}
const outl = new Map();
export const outline = (th = 0.018, color) => { const k = th + ':' + color; if (!outl.has(k)) outl.set(k, makeOutline(th, color)); return outl.get(k); };

// Helfer: Mesh mit optionalem Umriss
export function mk(geo, mat, o = {}) {
  const m = new THREE.Mesh(geo, mat);
  if (o.p) m.position.set(...o.p);
  if (o.r) m.rotation.set(...o.r);
  if (o.s !== undefined) Array.isArray(o.s) ? m.scale.set(...o.s) : m.scale.setScalar(o.s);
  m.castShadow = o.shadow !== false && !mat.blending;
  if (o.ol !== false && !mat.transparent) { const ol = new THREE.Mesh(geo, outline(o.ol || 0.018)); m.add(ol); }
  return m;
}

// Geometrie-Bausteine (geteilt)
const G = new Map();
export const geo = {
  sphere: (d = 14) => G.get('s' + d) || (G.set('s' + d, new THREE.SphereGeometry(1, d, Math.max(8, d * 0.7 | 0))), G.get('s' + d)),
  cone: (d = 10) => G.get('c' + d) || (G.set('c' + d, new THREE.ConeGeometry(1, 1, d)), G.get('c' + d)),
  cyl: (d = 10) => G.get('y' + d) || (G.set('y' + d, new THREE.CylinderGeometry(1, 1, 1, d)), G.get('y' + d)),
  box: () => G.get('b') || (G.set('b', new THREE.BoxGeometry(1, 1, 1)), G.get('b')),
  caps: () => G.get('cp') || (G.set('cp', new THREE.CapsuleGeometry(0.5, 1, 4, 10)), G.get('cp')),
  torus: (t = 0.12) => G.get('t' + t) || (G.set('t' + t, new THREE.TorusGeometry(1, t, 8, 28)), G.get('t' + t)),
  ico: (d = 0) => G.get('i' + d) || (G.set('i' + d, new THREE.IcosahedronGeometry(1, d)), G.get('i' + d)),
  dodec: () => G.get('dd') || (G.set('dd', new THREE.DodecahedronGeometry(1, 0)), G.get('dd')),
  oct: () => G.get('oc') || (G.set('oc', new THREE.OctahedronGeometry(1, 0)), G.get('oc')),
};

// Verschmelzen mit Vertex-Farben (für Instancing: 1 Draw-Call pro Gegnerart)
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _c = new THREE.Color();
export function merge(parts) {
  const pos = [], nor = [], col = [];
  for (const [g, color, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]] of parts) {
    const ng = g.index ? g.toNonIndexed() : g.clone();
    _m.compose(new THREE.Vector3(...p), _q.setFromEuler(_e.set(...(Array.isArray(r) ? r : [0, 0, 0]))), new THREE.Vector3(...(Array.isArray(s) ? s : [s, s, s])));
    ng.applyMatrix4(_m);
    _c.set(color);
    const P = ng.attributes.position.array, N = ng.attributes.normal.array;
    for (let i = 0; i < P.length; i += 3) { pos.push(P[i], P[i + 1], P[i + 2]); nor.push(N[i], N[i + 1], N[i + 2]); col.push(_c.r, _c.g, _c.b); }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

// Gegner-Material: Vertex-Farben + Instanz-Tönung (Treffer-Blitz, Brand, Frost, Schild)
export function enemyMat(o = {}) {
  const m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradTex, ...o });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aTint;\nvarying vec4 vTint;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec4 vTint;')
      .replace('#include <dithering_fragment>', RIM + '\ngl_FragColor.rgb = mix(gl_FragColor.rgb, vTint.rgb, vTint.a);');
  };
  m.customProgramCacheKey = () => 'enemy' + (o.transparent ? 't' : '');
  return m;
}
export function enemyOutline(th = 0.02) {
  const m = new THREE.MeshBasicMaterial({ color: 0x1a1424, side: THREE.BackSide });
  m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', OLV(th)); };
  m.customProgramCacheKey = () => 'eol' + th;
  return m;
}

// Draw-Calls sparen: in jeder Gruppe Geschwister-Meshes mit gleichem Material verschmelzen
// (inkl. ihrer Umrisse). Leuchtende/transparente Teile bleiben einzeln (werden oft animiert).
function mergeList(list) {
  const pos = [], nor = [], m3 = new THREE.Matrix3();
  for (const [g, M] of list) {
    const ng = g.index ? g.toNonIndexed() : g;
    const P = ng.attributes.position.array, N = ng.attributes.normal.array; m3.getNormalMatrix(M);
    const v = new THREE.Vector3(), n = new THREE.Vector3();
    for (let i = 0; i < P.length; i += 3) {
      v.set(P[i], P[i + 1], P[i + 2]).applyMatrix4(M); pos.push(v.x, v.y, v.z);
      n.set(N[i], N[i + 1], N[i + 2]).applyMatrix3(m3).normalize(); nor.push(n.x, n.y, n.z);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.computeBoundingSphere();
  return out;
}
export const anim = (...gs) => { for (const g of gs) if (g) g.userData.anim = true; };
export function optimize(root) {
  root.userData.anim = true;
  const anims = []; root.traverse(o => { if (!o.isMesh && o.userData.anim) anims.push(o); });
  const ok = c => c.isMesh && c.material.blending !== THREE.AdditiveBlending && !c.material.transparent && !c.userData.keep && !c.isInstancedMesh && c.geometry.attributes.normal;
  for (const A of anims) {
    const items = [];
    const walk = (o, M) => {
      for (const c of o.children) {
        if (c.isMesh) { if (ok(c)) { c.updateMatrix(); items.push([c, M.clone().multiply(c.matrix)]); } }
        else if (!c.userData.anim) { c.updateMatrix(); walk(c, M.clone().multiply(c.matrix)); }
      }
    };
    walk(A, new THREE.Matrix4());
    const buckets = new Map();
    for (const it of items) { const k = it[0].material.uuid + (it[0].castShadow ? 's' : '') + (it[0].receiveShadow ? 'r' : ''); if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(it); }
    for (const list of buckets.values()) {
      if (list.length < 2 && list[0][0].parent === A) continue;
      const first = list[0][0];
      const m = new THREE.Mesh(mergeList(list.map(([c, M]) => [c.geometry, M])), first.material); m.castShadow = first.castShadow; m.receiveShadow = first.receiveShadow;
      const byMat = new Map();
      for (const [c, M] of list) for (const k of c.children) if (k.isMesh) { k.updateMatrix(); const key = k.material.uuid; if (!byMat.has(key)) byMat.set(key, { mat: k.material, items: [] }); byMat.get(key).items.push([k.geometry, M.clone().multiply(k.matrix)]); }
      for (const { mat, items: its } of byMat.values()) m.add(new THREE.Mesh(mergeList(its), mat));
      for (const [c] of list) c.parent.remove(c);
      A.add(m);
    }
  }
  const prune = o => { for (const c of [...o.children]) { if (!c.isMesh) { prune(c); if (!c.children.length && !c.userData.anim) o.remove(c); } } };
  prune(root);
  return root;
}

// LOD durch Punkt-Bündelung: Eckpunkte in einem Raster zusammenlegen (Mittelwert von Lage, Farbe, Normale),
// entartete Dreiecke verwerfen. Schnell genug zum Vorbereiten beim Laden; für Gegner-Massen aus der Ferne gedacht.
export function lodGeo(g, cells = 9) {
  const P = g.attributes.position, C = g.attributes.color, N = g.attributes.normal; if (!P) return g;
  g.computeBoundingBox(); const bb = g.boundingBox, sz = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z) / cells || 1;
  const map = new Map(), rep = new Int32Array(P.count), acc = [];
  for (let i = 0; i < P.count; i++) {
    const key = Math.floor((P.getX(i) - bb.min.x) / sz) + ',' + Math.floor((P.getY(i) - bb.min.y) / sz) + ',' + Math.floor((P.getZ(i) - bb.min.z) / sz) + (N ? ',' + (N.getX(i) > 0 ? 1 : 0) + (N.getY(i) > 0 ? 1 : 0) + (N.getZ(i) > 0 ? 1 : 0) : '');
    let r = map.get(key); if (r === undefined) { r = acc.length; map.set(key, r); acc.push([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); }
    const a = acc[r]; a[0] += P.getX(i); a[1] += P.getY(i); a[2] += P.getZ(i); if (C) { a[3] += C.getX(i); a[4] += C.getY(i); a[5] += C.getZ(i); } if (N) { a[6] += N.getX(i); a[7] += N.getY(i); a[8] += N.getZ(i); } a[9]++; rep[i] = r;
  }
  const n = acc.length, pos = new Float32Array(n * 3), col = C ? new Float32Array(n * 3) : null, nor = N ? new Float32Array(n * 3) : null;
  acc.forEach((a, r) => { const c = a[9]; pos.set([a[0] / c, a[1] / c, a[2] / c], r * 3); if (col) col.set([a[3] / c, a[4] / c, a[5] / c], r * 3); if (nor) { const l = Math.hypot(a[6], a[7], a[8]) || 1; nor.set([a[6] / l, a[7] / l, a[8] / l], r * 3); } });
  const src = g.index ? g.index.array : [...Array(P.count).keys()], idx = [], seen = new Set();
  for (let t = 0; t < src.length; t += 3) {
    const a = rep[src[t]], b = rep[src[t + 1]], c = rep[src[t + 2]]; if (a === b || b === c || a === c) continue;
    const k = [a, b, c].sort((x, y) => x - y).join(','); if (seen.has(k)) continue; seen.add(k); idx.push(a, b, c);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3)); if (nor) out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setIndex(idx); return out;
}
