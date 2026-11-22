// Porträts aus den echten 3D-Modellen (ein kleiner zweiter Renderer) + drehbare Vorschau für Sammlung/Held.
import * as THREE from 'three';
import { buildModel } from './models.js';

let R = null, scene, cam, holder;
const cache = new Map();
function setup() {
  if (R) return;
  const c = document.createElement('canvas');
  R = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true });
  R.outputColorSpace = THREE.SRGBColorSpace; R.setPixelRatio(1); R.setSize(160, 160, false);
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a5a8a, 1.6));
  const d = new THREE.DirectionalLight(0xfff0e0, 2.2); d.position.set(-2, 3, 3); scene.add(d);
  const rim = new THREE.DirectionalLight(0x9fe8ff, 1.2); rim.position.set(2, 1, -3); scene.add(rim);
  cam = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  holder = new THREE.Group(); scene.add(holder);
}
function frame(m, angle = 0.6, close = 1) {
  holder.clear(); holder.add(m.root); m.root.rotation.y = angle;
  m.tick?.(1.2, 0, {});
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(m.root), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  const r = Math.max(size.x, size.y, size.z) * 0.62 * close;
  cam.position.set(ctr.x, ctr.y + r * 0.35, ctr.z + r * 3.3); cam.lookAt(ctr.x, ctr.y - r * 0.05, ctr.z);
}
// key: z. B. 'kitsune:3:spirit' – gibt eine data-URL zurück
export function portrait(id, o = {}) {
  const key = id + ':' + (o.stage || 0) + ':' + (o.branch || '') + ':' + (o.skin || '') + ':' + (o.hlvl || 0) + ':' + (o.tiers || '');
  if (cache.has(key)) return cache.get(key);
  setup();
  const m = buildModel(id, o);
  try { m.tick?.(0.6, 0.016, {}); } catch (e) { /* Porträt auch ohne Animation */ }   // Pose + kreisende Teile in Startlage
  frame(m, 0.55, id === 'raven' ? 1.15 : 1);
  R.setClearColor(0, 0); R.render(scene, cam);
  const url = R.domElement.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

// Live-Vorschau in einem Canvas (für Sammlung/Held)
export class Preview {
  constructor(canvas) {
    this.r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.r.outputColorSpace = THREE.SRGBColorSpace; this.r.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x5a4a7a, 1.5));
    const d = new THREE.DirectionalLight(0xfff0e0, 2.4); d.position.set(-2, 4, 3); this.scene.add(d);
    const rim = new THREE.DirectionalLight(0x9fe8ff, 1.4); rim.position.set(2, 1.5, -3); this.scene.add(rim);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.9, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8a6aff, transparent: true, opacity: 0.18 })); this.scene.add(disc);
    this.cam = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
    this.t = 0; this.drag = 0; this.rot = 0.5; this.alive = true; this.m = null; this.atk = 0;
    let lx = null;
    canvas.addEventListener('pointerdown', e => { lx = e.clientX; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => { if (lx !== null) { this.rot += (e.clientX - lx) * 0.012; lx = e.clientX; this.drag = 1.2; } });
    canvas.addEventListener('pointerup', () => { lx = null; this.atk = 1; });
    this.canvas = canvas;
    const loop = () => { if (!this.alive) return; requestAnimationFrame(loop); this.draw(); };
    this.last = performance.now(); loop();
  }
  show(id, o = {}) {
    if (this.m) this.scene.remove(this.m.root);
    this.m = buildModel(id, o); this.scene.add(this.m.root);
    this.m.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.m.root), size = box.getSize(new THREE.Vector3());
    this.h = Math.max(size.y, 0.8); this.span = Math.max(size.x, size.z, size.y);
    this.pop = 0;
  }
  draw() {
    const now = performance.now(), dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.t += dt;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight; if (!w) return;
    if (this.canvas.width !== Math.round(w * this.r.getPixelRatio())) this.r.setSize(w, h, false);
    this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
    const s = this.span || 1; this.cam.position.set(0, this.h * 0.7 + s * 0.22, s * 1.75 + 0.35); this.cam.lookAt(0, this.h * 0.45, 0);
    if (this.drag > 0) this.drag -= dt; else this.rot += dt * 0.5;
    this.atk = Math.max(0, this.atk - dt * 3);
    if (this.m) { this.pop = Math.min(1, (this.pop || 0) + dt * 3); const k = this.pop, c = 1.9; this.m.root.scale.setScalar(1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2)); this.m.root.rotation.y = this.rot; this.m.tick(this.t, dt, { atk: this.atk }); }
    this.r.render(this.scene, this.cam);
  }
  dispose() { this.alive = false; this.r.dispose(); this.r.forceContextLoss?.(); }
}

// Karten-Vorschaubild (von schräg oben gerendert, gecacht)
const mapCache = new Map();
export async function mapThumb(mapId) {
  if (mapCache.has(mapId)) return mapCache.get(mapId);
  const { MAPS } = await import('../data/maps.js'); const { MapView } = await import('./mapview.js');
  const c = document.createElement('canvas'); const r = new THREE.WebGLRenderer({ canvas: c, antialias: true, preserveDrawingBuffer: true });
  r.setSize(640, 360, false); r.outputColorSpace = THREE.SRGBColorSpace;
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x4f8f3a);
  sc.add(new THREE.HemisphereLight(0xdff4ff, 0x5a7a3a, 1.3)); const d = new THREE.DirectionalLight(0xfff0d8, 2.1); d.position.set(-6, 14, 5); sc.add(d);
  const m = MAPS[mapId], mv = new MapView(sc, m);
  const cam = new THREE.PerspectiveCamera(24, 16 / 9, 0.1, 200), t = 1.12, dist = m.w * 1.9;
  cam.position.set(0, Math.sin(t) * dist, Math.cos(t) * dist + 0.3); cam.lookAt(0, 0, 0.3);
  mv.update(0.5, 1); r.render(sc, cam);
  const url = c.toDataURL('image/jpeg', 0.85); r.dispose(); r.forceContextLoss?.();
  mapCache.set(mapId, url); return url;
}
