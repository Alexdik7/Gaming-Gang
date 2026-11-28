// VFX: Partikel (ein Points-Objekt), Ringe, Blitz-Bänder, Lichtsäulen, Projektil-Instanzen, Schadenszahlen (DOM-Pool).
import * as THREE from 'three';
import { glow, toon, geo, merge } from './toon.js';

const PI = Math.PI;
const tmpC = new THREE.Color();

export class Particles {
  constructor(scene, cap = 2400) {
    this.cap = cap; this.n = 0;
    this.pos = new Float32Array(cap * 3); this.col = new Float32Array(cap * 3); this.size = new Float32Array(cap); this.alpha = new Float32Array(cap);
    this.vel = new Float32Array(cap * 3); this.life = new Float32Array(cap); this.max = new Float32Array(cap); this.grav = new Float32Array(cap); this.drag = new Float32Array(cap); this.s0 = new Float32Array(cap); this.grow = new Float32Array(cap);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uScale: { value: 400 } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA; uniform float uScale;
        void main(){ vC=color; vA=alpha; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*uScale/-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 d=gl_PointCoord-0.5; float r=length(d); if(r>0.5) discard; float f=smoothstep(0.5,0.0,r); gl_FragColor=vec4(vC*(0.5+f*0.6), vA*f*0.9); }`,
    });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; scene.add(this.pts); this.g = g;
  }
  spawn(x, y, z, vx, vy, vz, color, size, life, o = {}) {
    if (this.n >= this.cap) return;
    const i = this.n++, i3 = i * 3;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    tmpC.set(color); this.col[i3] = tmpC.r; this.col[i3 + 1] = tmpC.g; this.col[i3 + 2] = tmpC.b;
    this.size[i] = this.s0[i] = size; this.life[i] = this.max[i] = life; this.alpha[i] = 1;
    this.grav[i] = o.grav ?? 0; this.drag[i] = o.drag ?? 1.5; this.grow[i] = o.grow ?? -0.6;
  }
  burst(x, y, z, color, n, speed, size, life, o = {}) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * PI * 2, e = (o.flat ? 0.15 : Math.random()) * (o.up ?? 1), sp = speed * (0.4 + Math.random() * 0.6);
      this.spawn(x, y, z, Math.cos(a) * sp * (1 - e * 0.5), sp * e + (o.lift || 0), Math.sin(a) * sp * (1 - e * 0.5), Array.isArray(color) ? color[k % color.length] : color, size * (0.6 + Math.random() * 0.6), life * (0.6 + Math.random() * 0.6), o);
    }
  }
  update(dt) {
    let w = 0;
    for (let i = 0; i < this.n; i++) {
      this.life[i] -= dt; if (this.life[i] <= 0) continue;
      const i3 = i * 3, f = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i3] *= f; this.vel[i3 + 1] = this.vel[i3 + 1] * f - this.grav[i] * dt; this.vel[i3 + 2] *= f;
      const k = this.life[i] / this.max[i];
      if (w !== i) {
        const w3 = w * 3;
        for (const A of [this.pos, this.vel, this.col]) { A[w3] = A[i3]; A[w3 + 1] = A[i3 + 1]; A[w3 + 2] = A[i3 + 2]; }
        for (const A of [this.life, this.max, this.grav, this.drag, this.s0, this.grow]) A[w] = A[i];
      }
      const w3 = w * 3;
      this.pos[w3] += this.vel[w3] * dt; this.pos[w3 + 1] += this.vel[w3 + 1] * dt; this.pos[w3 + 2] += this.vel[w3 + 2] * dt;
      if (this.pos[w3 + 1] < 0.02 && this.grav[w] > 0) { this.pos[w3 + 1] = 0.02; this.vel[w3 + 1] *= -0.3; }
      this.alpha[w] = Math.min(1, k * 2.2); this.size[w] = this.s0[w] * Math.max(0.05, 1 + this.grow[w] * (1 - k));
      w++;
    }
    this.n = w; this.g.setDrawRange(0, w);
    for (const n of ['position', 'color', 'size', 'alpha']) this.g.attributes[n].needsUpdate = true;
  }
}

// Ringe/Scheiben auf dem Boden (Schockwellen, Explosionen)
export class Rings {
  constructor(scene, n = 40) {
    this.pool = []; this.live = [];
    const g = new THREE.RingGeometry(0.9, 1, 56); g.rotateX(-PI / 2);
    const d = new THREE.CircleGeometry(1, 40); d.rotateX(-PI / 2);
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(i % 2 ? d : g, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.visible = false; m.userData.disc = i % 2 === 1; scene.add(m); this.pool.push(m); }
  }
  add(x, y, z, r0, r1, color, dur, o = {}) {
    const m = this.pool.find(p => !p.visible && p.userData.disc === !!o.disc); if (!m) return;
    m.visible = true; m.position.set(x, y, z); m.material.color.set(color); m.material.opacity = o.alpha ?? 0.9;
    this.live.push({ m, r0, r1, t: 0, dur, a: o.alpha ?? 0.9 });
  }
  update(dt) {
    this.live = this.live.filter(L => {
      L.t += dt; const k = Math.min(1, L.t / L.dur), e = 1 - Math.pow(1 - k, 3);
      L.m.scale.setScalar(L.r0 + (L.r1 - L.r0) * e); L.m.material.opacity = L.a * (1 - k);
      if (k >= 1) { L.m.visible = false; return false; } return true;
    });
  }
}

// Blitz-Bänder (Zickzack, flach über dem Boden, additiv)
export class Bolts {
  constructor(scene, n = 24) {
    this.pool = []; this.live = [];
    for (let i = 0; i < n; i++) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(64 * 6 * 3), 3));
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xbff4ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.frustumCulled = false; m.visible = false; scene.add(m); this.pool.push(m);
    }
  }
  add(pts, color = 0xbff4ff, width = 0.07, dur = 0.18, h = 0.5) {
    const m = this.pool.find(p => !p.visible); if (!m) return;
    const P = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], n = 5; for (let k = 0; k < n; k++) { const f = k / n, j = k && (Math.random() - 0.5) * 0.25; P.push([a.x + (b.x - a.x) * f + j, (a.y ?? h) + ((b.y ?? h) - (a.y ?? h)) * f + Math.abs(j), a.z + (b.z - a.z) * f - j]); } }
    const l = pts[pts.length - 1]; P.push([l.x, l.y ?? h, l.z]);
    const arr = m.geometry.attributes.position.array; let o = 0;
    for (let i = 0; i < P.length - 1 && i < 63; i++) {
      const [x1, y1, z1] = P[i], [x2, y2, z2] = P[i + 1], dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz) || 1, nx = -dz / L * width, nz = dx / L * width;
      const q = [[x1 - nx, y1, z1 - nz], [x1 + nx, y1, z1 + nz], [x2 + nx, y2, z2 + nz], [x1 - nx, y1, z1 - nz], [x2 + nx, y2, z2 + nz], [x2 - nx, y2, z2 - nz]];
      for (const v of q) { arr[o++] = v[0]; arr[o++] = v[1]; arr[o++] = v[2]; }
    }
    m.geometry.setDrawRange(0, o / 3); m.geometry.attributes.position.needsUpdate = true;
    m.material.color.set(color); m.visible = true; this.live.push({ m, t: 0, dur });
  }
  update(dt) { this.live = this.live.filter(L => { L.t += dt; L.m.material.opacity = 1 - L.t / L.dur; if (L.t >= L.dur) { L.m.visible = false; return false; } return true; }); }
}

// Lichtsäulen (Evolution, Urteil der Neun)
export class Pillars {
  constructor(scene, n = 16) {
    this.pool = []; this.live = [];
    const g = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true); g.translate(0, 0.5, 0);
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.visible = false; scene.add(m); this.pool.push(m); }
  }
  add(x, z, r, h, color, dur, delay = 0) {
    const m = this.pool.find(p => !p.visible); if (!m) return;
    m.position.set(x, 0, z); m.material.color.set(color); m.visible = true; m.scale.set(r, 0.01, r);
    this.live.push({ m, r, h, t: -delay, dur });
  }
  update(dt) {
    this.live = this.live.filter(L => {
      L.t += dt; if (L.t < 0) { L.m.material.opacity = 0; return true; }
      const k = L.t / L.dur, grow = Math.min(1, L.t * 6);
      L.m.scale.set(L.r * (1 - k * 0.6), L.h * grow, L.r * (1 - k * 0.6)); L.m.material.opacity = 0.6 * (1 - k) * (1 - k * 0.3);
      if (k >= 1) { L.m.visible = false; return false; } return true;
    });
  }
}

// Projektil-Optiken (Instanzen je Art)
const PROJ_STYLE = {
  kunai: { c: 0xdfe6f0, trail: 0xffffff, s: 1 }, firekunai: { c: 0xffa040, trail: 0xff6a20, s: 1, glow: true }, shadowkunai: { c: 0xc28bff, trail: 0x8a40ff, s: 1, glow: true },
  foxfire: { c: 0xffb050, trail: 0xff7a2a, s: 1.4, glow: true, orb: true }, fireball: { c: 0xffa030, trail: 0xff4a10, s: 2.6, glow: true, orb: true },
  rune: { c: 0xfff2a8, trail: 0xffd257, s: 1.5, glow: true, orb: true }, astral: { c: 0xcfe0ff, trail: 0x8fa0ff, s: 1.3, glow: true }, star: { c: 0xffffff, trail: 0x9fe8ff, s: 1.8, glow: true, orb: true },
  phoenix: { c: 0xffd070, trail: 0xff6a20, s: 1.35, leaf: true, glow: true },
  bubble: { c: 0xbff4ff, trail: 0x5ab8ff, s: 1.7, glow: true, orb: true }, arrow: { c: 0xf0e0c0, trail: 0xdff8ff, s: 1.4 },
  venom: { c: 0x8aff6a, trail: 0x3fd06a, s: 1.5, glow: true, orb: true }, windblade: { c: 0xdff8ff, trail: 0x8fe0ff, s: 1.5, star: true, glow: true },
  coin: { c: 0xffd257, trail: 0xffe9a0, s: 1.3, glow: true, orb: true },
  leaf: { c: 0x9af070, trail: 0x7be0a8, s: 1.1, leaf: true }, light: { c: 0xfff6c8, trail: 0xfff0a0, s: 1.2, glow: true, orb: true }, nova: { c: 0xfffbe0, trail: 0xfff2a8, s: 2.2, glow: true, orb: true },
  feather: { c: 0x3a2a5a, trail: 0xb07bff, s: 1.1, leaf: true }, voidorb: { c: 0xb070ff, trail: 0x6a20ff, s: 2.4, glow: true, orb: true },
  shuriken: { c: 0xd8dde8, trail: 0xffffff, s: 1.2, star: true }, fireshuriken: { c: 0xffb050, trail: 0xff7a2a, s: 1.3, star: true, glow: true }, shell: { c: 0x4a4a54, trail: 0xc8a060, s: 1.7, orb: true },
};
export const projStyle = k => PROJ_STYLE[k] || PROJ_STYLE.kunai;

export class Projectiles {
  constructor(scene) {
    this.scene = scene; this.meshes = {}; this.M = new THREE.Matrix4(); this.Q = new THREE.Quaternion(); this.V = new THREE.Vector3(); this.SC = new THREE.Vector3(); this.E = new THREE.Euler();
    const kunaiG = merge([[geo.cone(4), 0xffffff, [0, 0, 0.09], [PI / 2, 0, 0], [0.035, 0.16, 0.012]], [geo.cyl(6), 0x5a3a2a, [0, 0, -0.03], [PI / 2, 0, 0], [0.012, 0.08, 0.012]], [geo.torus(0.3), 0x8a8a90, [0, 0, -0.08], 0, 0.02]]);
    const orbG = geo.sphere(10), leafG = merge([[geo.sphere(6), 0xffffff, [0, 0, 0], 0, [0.04, 0.008, 0.09]]]);
    const starG = merge([[geo.box(), 0xffffff, [0, 0, 0], [0, PI / 4, 0], [0.12, 0.012, 0.03]], [geo.box(), 0xffffff, [0, 0, 0], [0, -PI / 4, 0], [0.12, 0.012, 0.03]]]);
    for (const k in PROJ_STYLE) {
      const st = PROJ_STYLE[k];
      const g = st.orb ? orbG : st.leaf ? leafG : st.star ? starG : kunaiG;
      const mat = st.glow && st.orb ? glow(st.c, 1) : st.orb ? toon(st.c) : new THREE.MeshBasicMaterial({ color: st.c, vertexColors: !st.orb });
      const m = new THREE.InstancedMesh(g, mat, 256); m.count = 0; m.frustumCulled = false; scene.add(m); this.meshes[k] = m;
      if (st.glow) { const h = new THREE.InstancedMesh(orbG, glow(st.trail, 0.35), 256); h.count = 0; h.frustumCulled = false; scene.add(h); this.meshes[k + ':h'] = h; }
    }
  }
  sync(projs, toW, t, parts, quality, fxOf = null) {
    for (const k in this.meshes) this.meshes[k].count = 0;
    for (const p of projs) {
      const k = PROJ_STYLE[p.kind] ? p.kind : 'kunai', st = PROJ_STYLE[k], m = this.meshes[k];
      if (m.count >= 256) continue;
      const [x, z] = toW(p.x, p.y), y = p.lob ? 0.45 + p.z : 0.55;
      const ang = p.lob ? 0 : Math.atan2(p.vx, p.vy);
      this.E.set(0, ang, st.star ? t * 25 : 0, 'YXZ'); if (st.star) this.E.set(0, t * 20, 0);
      this.Q.setFromEuler(this.E); const s = (st.orb ? 0.09 : 1) * st.s;
      this.M.compose(this.V.set(x, y, z), this.Q, this.SC.set(s, s, s)); m.setMatrixAt(m.count++, this.M);
      const h = this.meshes[k + ':h'];
      if (h) { const hs = (st.orb ? 0.13 : 0.07) * st.s * (1 + Math.sin(t * 30 + p.id) * 0.1); this.M.compose(this.V.set(x, y, z), this.Q, this.SC.set(hs, hs, hs)); h.setMatrixAt(h.count++, this.M); }
      if (quality <= 0) continue;
      // Spur mit Pfad-Identität der Kreatur (attackfx.js): 1 Glut fällt · 2 Geist steigt auf · 3 Schattenrauch quillt; Kreuzpfad = Akzent
      const F = fxOf?.(p), top = F?.top || 0, R = Math.random;
      if (R() < (st.orb ? 0.7 : 0.3) * (1 + top * 0.18)) {
        const col = top ? F.col : st.trail, sz = (st.orb ? 0.1 * st.s : 0.05) * (1 + top * 0.08);
        if (!top || F.dom === 0) parts.spawn(x, y, z, (R() - 0.5) * 0.12, top ? -0.2 : 0.08, (R() - 0.5) * 0.12, col, sz, 0.2 + top * 0.03, { drag: 4 });
        else if (F.dom === 1) parts.spawn(x, y, z, (R() - 0.5) * 0.08, 0.5, (R() - 0.5) * 0.08, col, sz * 1.2, 0.32, { drag: 2, grow: 0.4 });
        else parts.spawn(x, y, z, (R() - 0.5) * 0.2, 0.05, (R() - 0.5) * 0.2, R() < 0.5 ? col : 0x2a2038, sz * 1.4, 0.3, { drag: 3, grow: 0.9 });
        if (F?.accent && R() < 0.3) parts.spawn(x, y, z, (R() - 0.5) * 0.3, 0.1, (R() - 0.5) * 0.3, F.accent, sz * 0.7, 0.18, { drag: 3 });
      }
    }
    for (const k in this.meshes) { const m = this.meshes[k]; m.visible = m.count > 0; m.instanceMatrix.needsUpdate = true; }
  }
}

// Schadenszahlen & schwebende Texte (DOM, gepoolt)
export class Floaters {
  constructor(el, n = 48) {
    this.el = el; this.pool = []; this.live = [];
    for (let i = 0; i < n; i++) { const d = document.createElement('div'); d.className = 'fl'; d.style.display = 'none'; el.appendChild(d); this.pool.push(d); }
  }
  add(wx, wy, wz, text, cls = '', dur = 0.8) {
    let d = this.pool.pop();
    if (!d) { const old = this.live.shift(); if (!old) return; d = old.d; }
    d.textContent = text; d.className = 'fl ' + (cls === 'big' ? 'fbig' : cls);   // .big ist der grüne Knopf – eigener Name d.style.display = 'block';
    this.live.push({ d, p: new THREE.Vector3(wx, wy, wz), t: 0, dur, dx: (Math.random() - 0.5) * 20 });
  }
  update(dt, cam, w, h) {
    const v = new THREE.Vector3();
    this.live = this.live.filter(L => {
      L.t += dt; const k = L.t / L.dur;
      if (k >= 1) { L.d.style.display = 'none'; this.pool.push(L.d); return false; }
      v.copy(L.p).project(cam);
      const x = (v.x * 0.5 + 0.5) * w + L.dx * k, y = (-v.y * 0.5 + 0.5) * h - 34 * (1 - Math.pow(1 - k, 2));
      const s = k < 0.15 ? 0.6 + k / 0.15 * 0.6 : 1.2 - Math.min(0.2, (k - 0.15));
      L.d.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) scale(${s.toFixed(2)})`;
      L.d.style.opacity = k > 0.7 ? (1 - k) / 0.3 : 1;
      return true;
    });
  }
  clear() { for (const L of this.live) { L.d.style.display = 'none'; this.pool.push(L.d); } this.live = []; }
}

// ───────── Präzise Treffer-Effekte (v0.15) ─────────
// Aufblitzen: kleine Lichtsterne genau am Treffpunkt, immer zur Kamera gedreht (Instanzen, additiv)
function flareTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,.75)'); g.addColorStop(0.45, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  x.globalCompositeOperation = 'lighter';
  for (const [w, h] of [[30, 2.2], [2.2, 30]]) { const s = x.createRadialGradient(32, 32, 0, 32, 32, 30); s.addColorStop(0, 'rgba(255,255,255,.95)'); s.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = s; x.beginPath(); x.ellipse(32, 32, w, h, 0, 0, PI * 2); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export class Flashes {
  constructor(scene, cap = 160) {
    this.cap = cap; this.live = [];
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: flareTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false }), cap);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.renderOrder = 5; scene.add(this.mesh);
    this.M = new THREE.Matrix4(); this.V = new THREE.Vector3(); this.S = new THREE.Vector3(); this.Q = new THREE.Quaternion(); this.Qr = new THREE.Quaternion(); this.Z = new THREE.Vector3(0, 0, 1); this.C = new THREE.Color();
  }
  // s: Größe, dur: Dauer, rot: Drehung (Stern), k: Helligkeit
  add(x, y, z, color, s = 0.35, dur = 0.12, o = {}) {
    if (this.live.length >= this.cap) this.live.shift();
    this.live.push({ x, y, z, c: new THREE.Color(color), s, dur, t: -(o.delay || 0), rot: o.rot ?? Math.random() * PI, k: o.k ?? 1 });
  }
  update(dt, cam) {
    const m = this.mesh; let n = 0;
    this.live = this.live.filter(L => {
      L.t += dt; if (L.t >= L.dur) return false; if (L.t < 0) return true;
      const k = L.t / L.dur, sc = L.s * (0.55 + 0.6 * Math.sin(Math.min(1, k * 1.6) * PI * 0.5)), a = (1 - k) * (1 - k) * L.k;
      this.Qr.setFromAxisAngle(this.Z, L.rot + k * 0.4); this.Q.copy(cam.quaternion).multiply(this.Qr);
      this.M.compose(this.V.set(L.x, L.y, L.z), this.Q, this.S.set(sc, sc, sc)); m.setMatrixAt(n, this.M);
      m.setColorAt(n, this.C.copy(L.c).multiplyScalar(a)); n++;
      return true;
    });
    m.count = n; m.visible = n > 0; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true;
  }
}

// Funken als feine Striche (Linien entlang der Flugrichtung) – gerichtet, schnell, dezent
export class Sparks {
  constructor(scene, cap = 700) {
    this.cap = cap; this.n = 0;
    this.p = new Float32Array(cap * 3); this.v = new Float32Array(cap * 3); this.c = new Float32Array(cap * 3); this.life = new Float32Array(cap); this.max = new Float32Array(cap); this.len = new Float32Array(cap); this.grav = new Float32Array(cap);
    this.pos = new Float32Array(cap * 6); this.col = new Float32Array(cap * 6);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.g = g; this.lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.lines.frustumCulled = false; this.lines.renderOrder = 4; scene.add(this.lines);
  }
  add(x, y, z, vx, vy, vz, color, life = 0.18, len = 0.035, grav = 0) {
    if (this.n >= this.cap) return; const i = this.n++, i3 = i * 3;
    this.p[i3] = x; this.p[i3 + 1] = y; this.p[i3 + 2] = z; this.v[i3] = vx; this.v[i3 + 1] = vy; this.v[i3 + 2] = vz;
    tmpC.set(color); this.c[i3] = tmpC.r; this.c[i3 + 1] = tmpC.g; this.c[i3 + 2] = tmpC.b;
    this.life[i] = this.max[i] = life * (0.7 + Math.random() * 0.6); this.len[i] = len; this.grav[i] = grav;
  }
  // Fächer in Richtung (dx, dz) mit Öffnung spread
  fan(x, y, z, dx, dz, color, n, speed, spread = 0.9, o = {}) {
    const base = Math.atan2(dz, dx);
    for (let k = 0; k < n; k++) {
      const a = base + (Math.random() - 0.5) * spread * 2, sp = speed * (0.55 + Math.random() * 0.6), up = (o.up ?? 0.35) * speed * (Math.random() - 0.25);
      this.add(x, y, z, Math.cos(a) * sp, up, Math.sin(a) * sp, Array.isArray(color) ? color[k % color.length] : color, o.life ?? 0.16, o.len ?? 0.035, o.grav ?? 0);
    }
  }
  update(dt) {
    let w = 0; const P = this.pos, C = this.col;
    for (let i = 0; i < this.n; i++) {
      this.life[i] -= dt; if (this.life[i] <= 0) continue;
      const i3 = i * 3, w3 = w * 3;
      if (w !== i) { for (const A of [this.p, this.v, this.c]) { A[w3] = A[i3]; A[w3 + 1] = A[i3 + 1]; A[w3 + 2] = A[i3 + 2]; } this.life[w] = this.life[i]; this.max[w] = this.max[i]; this.len[w] = this.len[i]; this.grav[w] = this.grav[i]; }
      const f = Math.max(0, 1 - 7 * dt);
      this.v[w3] *= f; this.v[w3 + 2] *= f; this.v[w3 + 1] = this.v[w3 + 1] * f - this.grav[w] * dt;
      this.p[w3] += this.v[w3] * dt; this.p[w3 + 1] += this.v[w3 + 1] * dt; this.p[w3 + 2] += this.v[w3 + 2] * dt;
      const k = this.life[w] / this.max[w], L = this.len[w] * (0.4 + k), o = w * 6;
      P[o] = this.p[w3]; P[o + 1] = this.p[w3 + 1]; P[o + 2] = this.p[w3 + 2];
      P[o + 3] = this.p[w3] - this.v[w3] * L; P[o + 4] = this.p[w3 + 1] - this.v[w3 + 1] * L; P[o + 5] = this.p[w3 + 2] - this.v[w3 + 2] * L;
      const a = k * 1.4;
      C[o] = this.c[w3] * a; C[o + 1] = this.c[w3 + 1] * a; C[o + 2] = this.c[w3 + 2] * a; C[o + 3] = C[o + 4] = C[o + 5] = 0;
      w++;
    }
    this.n = w; this.g.setDrawRange(0, w * 2);
    this.g.attributes.position.needsUpdate = this.g.attributes.color.needsUpdate = true;
  }
}

// Hiebsicheln: dünne leuchtende Halbmonde, die in Schlagrichtung aufziehen (Mantis, Klingen, Krallen)
export class Arcs {
  constructor(scene, n = 24) {
    this.pool = []; this.live = [];
    // Sichel: Ring-Ausschnitt, innen schmaler (Dreiecke mit Verjüngung über Vertex-Farben)
    const g = new THREE.BufferGeometry(), seg = 18, P = [], C = [], I = [];
    for (let i = 0; i <= seg; i++) {
      const u = i / seg, a = (u - 0.5) * PI * 0.95, w = Math.sin(u * PI) * 0.22, br = Math.sin(u * PI);
      P.push(Math.cos(a), 0, Math.sin(a), Math.cos(a) * (1 - w), 0, Math.sin(a) * (1 - w));
      C.push(br, br, br, br * 0.15, br * 0.15, br * 0.15);
      if (i < seg) { const b = i * 2; I.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
      m.visible = false; m.renderOrder = 4; scene.add(m); this.pool.push(m);
    }
  }
  // ang: Schlagrichtung (Welt, um y), tilt: Neigung der Sichel, r: Radius
  add(x, y, z, ang, color, r = 0.45, dur = 0.16, tilt = 0.5, flip = 1) {
    const m = this.pool.find(p => !p.visible) || this.live.shift()?.m; if (!m) return;
    m.visible = true; m.position.set(x, y, z); m.rotation.set(0, 0, 0); m.rotation.order = 'YXZ';
    m.rotation.y = -ang; m.rotation.x = tilt * flip; m.rotation.z = flip < 0 ? PI : 0; m.material.color.set(color);
    this.live.push({ m, t: 0, dur, r, spin: 1.1 * flip });
  }
  update(dt) {
    this.live = this.live.filter(L => {
      L.t += dt; const k = Math.min(1, L.t / L.dur), e = 1 - Math.pow(1 - k, 3);
      L.m.scale.set(L.r * (0.7 + 0.35 * e), 1, L.r * (0.7 + 0.35 * e) * (1 - 0.3 * k));
      L.m.rotation.y += L.spin * dt * 3; L.m.material.opacity = 1 - k * k;
      if (k >= 1) { L.m.visible = false; return false; } return true;
    });
  }
}
