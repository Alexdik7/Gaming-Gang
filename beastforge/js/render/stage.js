// Renderer, Kamera, Licht, Nachbearbeitung (Bloom), Größenanpassung, Qualitätsstufen.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xbfe6dc);
    this.scene.fog = new THREE.Fog(0xbfe6dc, 22, 48);
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 120);
    this.hemi = new THREE.HemisphereLight(0xdff4ff, 0x5a7a3a, 1.25); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0d8, 2.1);
    this.sun.position.set(-6, 14, 5); this.sun.castShadow = true;
    const sc = this.sun.shadow.camera; sc.left = -9; sc.right = 9; sc.top = 11; sc.bottom = -11; sc.near = 1; sc.far = 40;
    this.sun.shadow.mapSize.set(1024, 1024); this.sun.shadow.bias = -0.0008; this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.45, 0.82);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.quality = 2; this.shake = 0; this.shakeDir = new THREE.Vector2(); this.camBase = new THREE.Vector3(); this.camLook = new THREE.Vector3();
    this.insets = { top: 60, bottom: 0, left: 0, right: 0 }; this.mode = 'game'; this.zoomPunch = 0; this.focus = null;
    this.mapW = 11; this.mapH = 17;
    this.resize();
    addEventListener('resize', () => this.resize());
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; });
    canvas.addEventListener('webglcontextrestored', () => { this.lost = false; });
  }
  setQuality(q) {
    this.quality = q;
    this.renderer.shadowMap.enabled = q >= 1;
    this.sun.castShadow = q >= 1;
    this.resize();
  }
  resize() {
    const w = innerWidth, h = innerHeight, dpr = Math.min(devicePixelRatio || 1, [1, 1.5, 2][this.quality] || 1.5);
    this.w = w; this.h = h;
    this.renderer.setPixelRatio(dpr); this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(dpr); this.composer.setSize(w, h);
    this.bloom.resolution.set(w * dpr / 2, h * dpr / 2);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.fit();
  }
  // Karte in den freien Bereich zwischen HUD oben und Leiste unten einpassen:
  // Kamera für Seitenverhältnis w/freiH einpassen, dann per setViewOffset auf den ganzen Bildschirm erweitern.
  fit() {
    const cam = this.camera;
    if (this.mode === 'menu') { cam.fov = 32; cam.clearViewOffset(); cam.aspect = this.w / this.h; cam.updateProjectionMatrix(); this.scene.fog.near = 14; this.scene.fog.far = 40; return; }
    // Genre-Kamera: steil von schräg oben (≈64°), wenig Perspektive, Karte füllt den freien Bereich
    const I = this.insets, W = this.mapW + 0.2, H = this.mapH + 0.2, tilt = 1.12, tz = 0.3;
    cam.fov = 24;
    const dir = new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt));
    const freeW = Math.max(120, this.w - I.left - I.right), freeH = Math.max(120, this.h - I.top - I.bottom);
    cam.clearViewOffset(); cam.aspect = freeW / freeH; cam.updateProjectionMatrix();
    const corners = [[-W / 2, -H / 2], [W / 2, -H / 2], [-W / 2, H / 2], [W / 2, H / 2]].map(([x, z]) => new THREE.Vector3(x, 0, z));
    const place = d => { cam.position.copy(dir).multiplyScalar(d).add(new THREE.Vector3(0, 0, tz)); cam.lookAt(0, 0, tz); cam.updateMatrixWorld(); };
    const box = () => { let a = 9, b = -9, c = 9, e = -9; for (const k of corners) { const p = k.clone().project(cam); a = Math.min(a, p.x); b = Math.max(b, p.x); c = Math.min(c, p.y); e = Math.max(e, p.y); } return [a, b, c, e]; };
    let lo = 4, hi = 120;
    for (let it = 0; it < 34; it++) { const d = (lo + hi) / 2; place(d); const [a, b, c, e] = box(); if (b - a <= 1.99 && e - c <= 1.99) hi = d; else lo = d; }
    place(hi);
    const [a, b, c, e] = box(), cx = (a + b) / 2, cy = (c + e) / 2;
    cam.setViewOffset(freeW, freeH, -I.left + cx * freeW / 2, -I.top - cy * freeH / 2, this.w, this.h);
    this.camBase.copy(cam.position); this.camLook.set(0, 0, tz);
    this.scene.fog.near = hi * 1.1; this.scene.fog.far = hi * 2.6;
  }
  setMode(m) { this.mode = m; this.fit(); }
  setInsets(i) { const o = this.insets; if (o.top !== i.top || o.bottom !== i.bottom || o.left !== i.left || o.right !== i.right) { this.insets = { left: 0, right: 0, top: 0, bottom: 0, ...i }; this.fit(); } }
  addShake(a, dx = 0, dy = 0) { this.shake = Math.min(1.2, this.shake + a); this.shakeDir.set(dx, dy); }
  update(dt, t) {
    const cam = this.camera;
    if (this.mode === 'menu') {
      const a = t * 0.08; cam.position.set(Math.sin(a) * 13, 7.5, Math.cos(a) * 13); cam.lookAt(0, 0.6, 0); return;
    }
    cam.position.copy(this.camBase);
    if (this.zoomPunch > 0.001) { const f = this.focus || this.camLook; cam.position.lerp(f.clone().add(new THREE.Vector3(0, 3.5, 3)), this.zoomPunch * 0.25); this.zoomPunch *= Math.pow(0.04, dt); }
    if (this.shake > 0.001) {
      const s = this.shake * this.shake * 0.25;
      cam.position.x += (Math.random() - 0.5) * s + this.shakeDir.x * s; cam.position.y += (Math.random() - 0.5) * s; cam.position.z += (Math.random() - 0.5) * s + this.shakeDir.y * s;
      this.shake = Math.max(0, this.shake - dt * 2.2);
    }
    cam.lookAt(this.camLook.x + (cam.position.x - this.camBase.x) * 0.6, this.camLook.y, this.camLook.z + (cam.position.z - this.camBase.z) * 0.6);
  }
  render() {
    if (this.lost) return;
    if (this.quality >= 1) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }
  // Bildschirm → Boden (y = h)
  ground(clientX, clientY, h = 0) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, this.camera);
    const p = new THREE.Vector3(); return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -h), p) ? p : null;
  }
}
