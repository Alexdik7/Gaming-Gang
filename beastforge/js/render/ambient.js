// Lebendige Karten: Wind in Bäumen und Gras, Schmetterlinge, Vögel mit Schatten, springende Fische, flackernde Laternen.
// Rein optisch, ohne Einfluss auf die Simulation. Bei Qualität 0 bleibt alles still.
import * as THREE from 'three';
import { geo } from './toon.js';

const PI = Math.PI;
export const WIND = { value: 0 };

// Wind-Wiegen für InstancedMesh-Materialien: Auslenkung wächst mit der Höhe im Modell, Phase je Instanz-Position
export function addSway(mat, amp = 0.05, speed = 1.6) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uWind = WIND;
    sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
      vec2 ph = instanceMatrix[3].xz;
      #else
      vec2 ph = vec2(0.0);
      #endif
      float sw = sin(uWind * ${speed.toFixed(2)} + ph.x * 0.55 + ph.y * 0.35) + 0.4 * sin(uWind * ${(speed * 2.7).toFixed(2)} + ph.x * 1.3);
      float hh = max(0.0, position.y);
      transformed.x += sw * ${amp.toFixed(3)} * hh * hh;
      transformed.z += sw * ${(amp * 0.5).toFixed(3)} * hh * hh;`);
  };
  mat.customProgramCacheKey = () => 'sway' + amp + speed;
  return mat;
}

const rnd = (a, b) => a + Math.random() * (b - a);

export class Ambient {
  constructor(root, mv, theme, fx) {
    this.root = new THREE.Group(); root.add(this.root); this.mv = mv; this.fx = fx; this.t = 0;
    const W = mv.W, H = mv.H; this.W = W; this.H = H;
    const calm = !theme.ash;   // Glutkrater: keine Falter, keine Fische
    // Schmetterlinge (im Schnee: keine)
    this.flies = [];
    if (calm && !theme.snow) {
      const cols = [0xffe14d, 0xffffff, 0x8ad4ff, 0xffa8c8, 0xffb43a];
      const wg = new THREE.CircleGeometry(0.09, 10); wg.scale(1, 0.8, 1); wg.translate(0.085, 0.02, 0); wg.rotateX(-PI / 2);
      for (let i = 0; i < 9; i++) {
        const m = new THREE.MeshBasicMaterial({ color: cols[i % cols.length], side: THREE.DoubleSide });
        const g = new THREE.Group(), L = new THREE.Mesh(wg, m), R = new THREE.Mesh(wg, m);
        R.rotation.y = PI; g.add(L, R); g.add(new THREE.Mesh(geo.sphere(6), new THREE.MeshBasicMaterial({ color: 0x2a2030 }))); g.children[2].scale.set(0.012, 0.012, 0.05);
        const hx = rnd(-W / 2 + 1, W / 2 - 1), hz = rnd(-H / 2 + 1, H / 2 - 1);
        this.flies.push({ g, L, R, hx, hz, a: rnd(0, 7), b: rnd(0, 7), sp: rnd(0.25, 0.5), r: rnd(0.8, 2.2), y: rnd(0.35, 0.8) });
        this.root.add(g);
      }
    }
    // Vögel: kreisen hoch über der Karte und werfen Schatten
    this.birds = [];
    if (!theme.ash) {
      const bm = new THREE.MeshLambertMaterial({ color: 0xf4f2ee, side: THREE.DoubleSide });
      const wg = new THREE.PlaneGeometry(0.42, 0.13); wg.translate(0.21, 0, 0); wg.rotateX(-PI / 2);
      for (let i = 0; i < 3; i++) {
        const g = new THREE.Group(), L = new THREE.Mesh(wg, bm), R = new THREE.Mesh(wg, bm); R.scale.x = -1;
        const body = new THREE.Mesh(geo.sphere(6), bm); body.scale.set(0.05, 0.04, 0.16);
        g.add(L, R, body); g.scale.setScalar(0.6); for (const c of g.children) c.castShadow = true;
        this.birds.push({ g, L, R, cx: rnd(-2, 2), cz: rnd(-2, 2), rad: rnd(10, 13), a: i * 1.7, sp: rnd(0.12, 0.2) * (i % 2 ? 1 : -1), y: rnd(4.5, 5.5), fl: rnd(0, 6) });
        this.root.add(g);
      }
    }
    // Fische: springen ab und zu aus dem Wasser
    this.water = calm ? mv.map.grid.flatMap((row, y) => [...row].map((c, x) => c === '~' ? [x, y] : null)).filter(Boolean) : [];
    this.fish = null; this.fishT = rnd(3, 6);
    if (this.water.length) {
      this.fish = new THREE.Mesh(geo.sphere(8), new THREE.MeshToonMaterial({ color: theme.snow ? 0x9fc8e8 : 0xff8a3a })); this.fish.scale.set(0.05, 0.05, 0.13); this.fish.visible = false; this.root.add(this.fish);
    }
  }
  update(dt, quality = 2) {
    this.t += dt; WIND.value = this.t; const t = this.t;
    const on = quality > 0; this.root.visible = on; if (!on) return;
    for (const f of this.flies) {
      const a = f.a + t * f.sp, x = f.hx + Math.sin(a) * f.r, z = f.hz + Math.sin(a * 1.7 + f.b) * f.r * 0.6;
      const dx = Math.cos(a) * f.r, dz = Math.cos(a * 1.7 + f.b) * f.r * 1.02;
      f.g.position.set(x, f.y + Math.sin(t * 3 + f.b) * 0.12, z); f.g.rotation.y = Math.atan2(dx, dz) - PI / 2;
      const flap = 0.2 + Math.sin(t * 16 + f.b) * 0.9; f.L.rotation.x = 0; f.L.rotation.z = flap; f.R.rotation.z = -flap;
    }
    for (const b of this.birds) {
      b.a += b.sp * dt; const x = b.cx + Math.cos(b.a) * b.rad, z = b.cz + Math.sin(b.a) * b.rad * 0.6;
      b.g.position.set(x, b.y + Math.sin(t * 0.7 + b.fl) * 0.2, z);
      b.g.rotation.y = -b.a - (b.sp > 0 ? 0 : PI);
      const glide = Math.sin(t * 0.5 + b.fl) > 0.3, flap = glide ? 0.12 : Math.sin(t * 9 + b.fl) * 0.6;
      b.L.rotation.z = flap; b.R.rotation.z = -flap;
    }
    if (this.fish) {
      const F = this.fish;
      if (F.visible) {
        F.j += dt / 0.9; const u = F.j;
        if (u >= 1) { F.visible = false; this.splash(F.x1, F.z1); }
        else { F.position.set(F.x0 + (F.x1 - F.x0) * u, -0.3 + Math.sin(u * PI) * 0.55, F.z0 + (F.z1 - F.z0) * u); F.rotation.x = (u - 0.5) * 2.2; }
      } else if ((this.fishT -= dt) <= 0) {
        this.fishT = rnd(3, 8);
        const [cx, cy] = this.water[Math.floor(Math.random() * this.water.length)], x0 = cx + 0.5 - this.W / 2, z0 = cy + 0.5 - this.H / 2, ang = rnd(0, 2 * PI);
        Object.assign(F, { x0, z0, x1: x0 + Math.cos(ang) * 0.5, z1: z0 + Math.sin(ang) * 0.5, j: 0 }); F.rotation.y = -ang + PI / 2; F.visible = true; this.splash(x0, z0);
      }
    }
    // Laternen flackern leicht
    if (this.mv.lanternLights) this.mv.lanternLights.forEach((l, i) => { const k = 1 + Math.sin(t * 7 + i * 2.1) * 0.06 + Math.sin(t * 13.7 + i) * 0.04; l.scale.set(0.12 * k, 0.09 * k, 0.19 * k); });
  }
  splash(x, z) { this.fx?.rings?.add(x, -0.3, z, 0.05, 0.35, 0xffffff, 0.5); this.fx?.parts?.burst(x, -0.28, z, [0xffffff, 0xbfeaff], 8, 0.8, 0.05, 0.5, { up: 2, grav: 4 }); }
}
