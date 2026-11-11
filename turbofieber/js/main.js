// Turbofieber – Hauptprogramm: Renderer, Spielschleife, Kamera, Touch-Steuerung, HUD, Minikarte.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { World, roadCenter, blockRect, OFF, ROAD, SIZE, N } from './world.js';
import { Car } from './car.js';
import { Effects } from './fx.js';
import { CarAudio } from './audio.js';

const $ = id => document.getElementById(id);

/* ---------- Einstellungen ---------- */
const settings = { quality: 'auto', time: 'auto', paint: '#e0262f' };
try { Object.assign(settings, JSON.parse(localStorage.getItem('tf.settings') || '{}')); } catch (e) { /* ignorieren */ }
const saveSettings = () => { try { localStorage.setItem('tf.settings', JSON.stringify(settings)); } catch (e) { /* ignorieren */ } };
const PAINTS = ['#e0262f', '#f2f2f0', '#1c1d22', '#1f6fe0', '#ffb51e', '#2ad4a0', '#9a3cff'];
const QUALITY = {                       // Pixeldichte, Schatten, Glühen
  hoch: { pr: 1.6, shadow: 1024, bloom: true },
  mittel: { pr: 1.25, shadow: 512, bloom: true },
  niedrig: { pr: 1, shadow: 0, bloom: false }
};
const TIMES = [['auto', 'Auto'], ['tag', 'Tag', 13], ['abend', 'Abend', 18.9], ['nacht', 'Nacht', 23.5]];

/* ---------- Renderer & Szene ---------- */
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.4, 2600);
const world = new World(scene, renderer);
const car = new Car(scene, settings.paint);
const fx = new Effects(scene);
const audio = new CarAudio();

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.35, 1.05);   // nur echte HDR-Lichter glühen
composer.addPass(bloom);
composer.addPass(new OutputPass());

let quality = settings.quality === 'auto' ? 'hoch' : settings.quality;
function applyQuality() {
  const q = QUALITY[quality];
  renderer.shadowMap.enabled = q.shadow > 0;
  world.sun.castShadow = q.shadow > 0;
  if (q.shadow) {
    world.sun.shadow.mapSize.set(q.shadow, q.shadow);
    if (world.sun.shadow.map) { world.sun.shadow.map.dispose(); world.sun.shadow.map = null; }
  }
  scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  resize();
  $('qualityBtn').textContent = 'Grafik: ' + (settings.quality === 'auto' ? `Auto (${quality})` : quality);
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const pr = Math.min(window.devicePixelRatio || 1, QUALITY[quality].pr);
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
  composer.setPixelRatio(pr);
  composer.setSize(w, h);
  bloom.setSize(Math.round(w * pr / 2), Math.round(h * pr / 2));   // Glühen in halber Auflösung
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  fx.setViewport(h * pr);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 250));

/* ---------- Startposition ---------- */
function spawn() {
  const r = blockRect(4, 3);
  car.place(roadCenter(4) - 3, (r.z0 + r.z1) / 2, 0);
  camYaw = 0;
}

/* ---------- Eingabe: Touch-Knöpfe und Tastatur ---------- */
const touch = { left: false, right: false, gas: false, brake: false, nitro: false, drift: false };
const keys = new Set();
document.querySelectorAll('[data-ctl]').forEach(el => {
  const k = el.dataset.ctl;
  const on = e => { e.preventDefault(); audio.unlock(); touch[k] = true; el.classList.add('on'); try { el.setPointerCapture(e.pointerId); } catch (_) { /* ignorieren */ } };
  const off = () => { touch[k] = false; el.classList.remove('on'); };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointercancel', off);
  el.addEventListener('lostpointercapture', off);
});
window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape' || e.code === 'KeyP') { if (state === 'drive') pause(); else if (state === 'pause') resume(); return; }
  keys.add(e.code);
  audio.unlock();
});
window.addEventListener('keyup', e => keys.delete(e.code));
function input() {
  const k = c => keys.has(c);
  const left = touch.left || k('ArrowLeft') || k('KeyA');
  const right = touch.right || k('ArrowRight') || k('KeyD');
  return {
    steer: (right ? 1 : 0) - (left ? 1 : 0),
    gas: touch.gas || k('ArrowUp') || k('KeyW'),
    brake: touch.brake || k('ArrowDown') || k('KeyS'),
    drift: touch.drift || k('Space'),
    nitro: touch.nitro || k('ShiftLeft') || k('ShiftRight') || k('KeyN')
  };
}
const NO_INPUT = { steer: 0, gas: false, brake: false, drift: false, nitro: false };
document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());

/* ---------- Spielzustand ---------- */
let state = 'title';                    // title | drive | pause
let tod = 18.4;                         // Tageszeit in Stunden (Start: Abenddämmerung)
let camYaw = 0, shake = 0, distance = 0, topSpeed = 0;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();

function setState(s) {
  state = s;
  document.body.dataset.state = s;
}
function start() {
  audio.unlock();
  setState('drive');
  camPos.set(car.pos.x - Math.sin(car.heading) * 7, 2.6, car.pos.z - Math.cos(car.heading) * 7);
}
function pause() { setState('pause'); audio.suspend(); }
function resume() { setState('drive'); audio.unlock(); }

$('startBtn').addEventListener('click', start);
$('pauseBtn').addEventListener('click', () => (state === 'pause' ? resume() : pause()));
$('resumeBtn').addEventListener('click', resume);
$('titleBtn').addEventListener('click', () => { setState('title'); audio.suspend(); });
$('respawnBtn').addEventListener('click', () => { spawn(); resume(); });
$('qualityBtn').addEventListener('click', () => {
  const order = ['auto', 'hoch', 'mittel', 'niedrig'];
  settings.quality = order[(order.indexOf(settings.quality) + 1) % order.length];
  quality = settings.quality === 'auto' ? 'hoch' : settings.quality;
  saveSettings();
  perf.reset();
  applyQuality();
});
$('muteBtn').addEventListener('click', () => { audio.setMuted(!audio.muted); $('muteBtn').textContent = audio.muted ? 'Ton: aus' : 'Ton: an'; });
$('muteBtn').textContent = audio.muted ? 'Ton: aus' : 'Ton: an';
$('timeBtn').addEventListener('click', () => {
  const i = TIMES.findIndex(t => t[0] === settings.time);
  settings.time = TIMES[(i + 1) % TIMES.length][0];
  saveSettings();
  updateTimeLabel();
});
function updateTimeLabel() { $('timeMode').textContent = TIMES.find(t => t[0] === settings.time)[1]; }
updateTimeLabel();

// Lackfarben auf dem Titelbildschirm
const sw = $('paints');
for (const p of PAINTS) {
  const b = document.createElement('button');
  b.className = 'swatch' + (p === settings.paint ? ' on' : '');
  b.style.background = p;
  b.setAttribute('aria-label', 'Lackfarbe');
  b.addEventListener('click', () => {
    settings.paint = p; saveSettings();
    car.mesh.userData.paintMat.color.set(p);
    sw.querySelectorAll('.swatch').forEach(x => x.classList.toggle('on', x === b));
  });
  sw.append(b);
}

document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'drive') pause(); });
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); $('lost').hidden = false; });

/* ---------- Minikarte ---------- */
const mini = $('mini'), mctx = mini.getContext('2d');
const mapImg = document.createElement('canvas');
mapImg.width = mapImg.height = 512;
(() => {
  const g = mapImg.getContext('2d'), s = 512 / SIZE;
  g.fillStyle = '#5a6070'; g.fillRect(0, 0, 512, 512);
  for (const b of world.blocks) {
    const { x0, x1, z0, z1 } = b.rect;
    g.fillStyle = b.type === 'park' ? '#2f5a34' : '#1c2030';
    // Karte: −x nach rechts, −z nach unten (Blick nach +z = oben)
    g.fillRect((-x1 - OFF) * s, (-z1 - OFF) * s, (x1 - x0) * s, (z1 - z0) * s);
  }
})();
function drawMini() {
  const W = mini.width, R = W / 2, view = 230;           // Radius in Metern
  const k = (R / view) / (512 / SIZE);
  mctx.clearRect(0, 0, W, W);
  mctx.save();
  mctx.beginPath(); mctx.arc(R, R, R - 2, 0, Math.PI * 2); mctx.clip();
  mctx.fillStyle = '#0d0f18'; mctx.fillRect(0, 0, W, W);
  mctx.translate(R, R);
  mctx.rotate(car.heading);
  mctx.scale(k, k);
  const s = 512 / SIZE;
  mctx.drawImage(mapImg, -(-car.pos.x - OFF) * s, -(-car.pos.z - OFF) * s);
  mctx.restore();
  // eigenes Auto
  mctx.fillStyle = '#ffcf3a'; mctx.strokeStyle = '#000'; mctx.lineWidth = 2;
  mctx.beginPath(); mctx.moveTo(R, R - 9); mctx.lineTo(R + 6, R + 7); mctx.lineTo(R, R + 3); mctx.lineTo(R - 6, R + 7); mctx.closePath();
  mctx.fill(); mctx.stroke();
}

/* ---------- HUD ---------- */
const hud = { speed: $('speed'), gear: $('gear'), rpm: $('rpmArc'), nitro: $('nitroFill'), clock: $('clock') };
const RPM_LEN = 100;                    // Bogenlänge (pathLength im SVG)
let lastHud = '';
function updateHud() {
  const kmh = Math.round(Math.abs(car.forwardSpeed) * 3.6);
  const gear = car.forwardSpeed < -0.5 ? 'R' : String(car.gear);
  const key = kmh + gear;
  if (key !== lastHud) { hud.speed.textContent = kmh; hud.gear.textContent = gear; lastHud = key; }
  hud.rpm.style.strokeDashoffset = String(RPM_LEN * (1 - Math.min(1, car.rpm / 8200)));
  hud.rpm.classList.toggle('red', car.rpm > 7200);
  hud.nitro.style.transform = `scaleX(${car.nitro.toFixed(3)})`;
  hud.nitro.classList.toggle('active', car.nitroOn);
  const hh = Math.floor(tod) % 24, mm = Math.floor((tod % 1) * 60);
  hud.clock.textContent = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}

/* ---------- Leistung messen, Qualität automatisch anpassen ---------- */
const perf = {
  sum: 0, n: 0, wait: 2,
  reset() { this.sum = 0; this.n = 0; this.wait = 2; },
  add(dt) {
    if (settings.quality !== 'auto' || state !== 'drive') return;
    if (this.wait > 0) { this.wait -= dt; return; }
    this.sum += dt; this.n++;
    if (this.n >= 150) {
      const avg = this.sum / this.n;
      if (avg > 1 / 40 && quality !== 'niedrig') { quality = quality === 'hoch' ? 'mittel' : 'niedrig'; applyQuality(); }
      this.reset();
    }
  }
};

/* ---------- Kamera ---------- */
function updateCamera(dt) {
  const spd = car.speed;
  if (state === 'title') {                 // langsame Fahrt um das Auto
    const a = performance.now() / 6000;
    camera.position.set(car.pos.x + Math.sin(a) * 7.5, 2.2 + Math.sin(a * 0.7) * 0.4, car.pos.z + Math.cos(a) * 7.5);
    camera.lookAt(car.pos.x, 0.8, car.pos.z);
    camera.fov = 50; camera.updateProjectionMatrix();
    return;
  }
  // Kamera folgt der Fahrtrichtung, beim Rückwärtsfahren dem Kurs
  const vF = car.forwardSpeed;
  let target = car.heading;
  if (spd > 4 && vF > 0) target = Math.atan2(car.vx, car.vz) * 0.35 + car.heading * 0.65;
  const diff = Math.atan2(Math.sin(target - camYaw), Math.cos(target - camYaw));
  camYaw += diff * Math.min(1, dt * 4.5);
  const portrait = camera.aspect < 1;                // Hochformat: weiter weg und höher, damit das Auto ins Bild passt
  const dist = (6.4 + Math.min(spd, 80) * 0.03) * (portrait ? 1.45 : 1), h = (2.25 + Math.min(spd, 80) * 0.006) * (portrait ? 1.5 : 1);
  const want = new THREE.Vector3(car.pos.x - Math.sin(camYaw) * dist, h, car.pos.z - Math.cos(camYaw) * dist);
  camPos.lerp(want, Math.min(1, dt * 9));
  camera.position.copy(camPos);
  if (shake > 0) camera.position.add(new THREE.Vector3((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake));
  camLook.set(car.pos.x + Math.sin(car.heading) * 3, 1.0, car.pos.z + Math.cos(car.heading) * 3);
  camera.lookAt(camLook);
  const fov = 58 + Math.min(spd, 85) * 0.22 + (car.nitroOn ? 7 : 0);
  if (Math.abs(fov - camera.fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
  shake = Math.max(0, shake - dt * 3);
  if (car.nitroOn) shake = Math.max(shake, 0.05);
}

/* ---------- Physik-Schritt ---------- */
function physics(dt, inp) {
  car.update(dt, inp);
  // zwei Kollisionskreise (vorn / hinten)
  const sh = Math.sin(car.heading), ch = Math.cos(car.heading);
  for (const o of [1.3, -1.3]) {
    const cx = car.pos.x + sh * o, cz = car.pos.z + ch * o;
    const hit = world.collide(cx, cz, 1.05);
    if (hit) {
      const power = car.bounce(hit.nx, hit.nz, hit.depth);
      if (power > 3) {
        audio.hit(power);
        fx.crash(cx - hit.nx * 1.0, 0.6, cz - hit.nz * 1.0, power);
        shake = Math.min(0.6, power * 0.03);
      }
    }
  }
  if (car.shifted) { car.shifted = false; audio.shift(); }
  distance += car.speed * dt;
  topSpeed = Math.max(topSpeed, car.speed);
}

/* ---------- Spielschleife ---------- */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  perf.add(dt);

  // Tageszeit
  const mode = TIMES.find(t => t[0] === settings.time);
  if (state !== 'pause') {
    if (mode[0] === 'auto') tod = (tod + dt * 0.05) % 24;          // 8 Minuten = 1 Tag
    else {
      let d = mode[2] - tod;
      if (d > 12) d -= 24; else if (d < -12) d += 24;
      tod = (tod + Math.sign(d) * Math.min(Math.abs(d), dt * 4) + 24) % 24;
    }
  }

  if (state === 'drive') {
    const inp = input();
    const steps = Math.ceil(dt / (1 / 120)), h = dt / steps;
    for (let i = 0; i < steps; i++) physics(h, inp);
    fx.tires(car, dt);
  } else if (state === 'title') {
    car.update(0, NO_INPUT);
  }
  if (state !== 'pause') fx.update(dt);

  world.setTime(tod, car.pos);
  car.syncMesh(world.night);
  audio.update(car, state === 'drive');
  updateCamera(state === 'pause' ? 0 : dt);
  world.skyMesh.position.copy(camera.position);
  renderer.toneMappingExposure = world.exposure;
  bloom.strength = 0.18 + world.night * 0.32;

  if (QUALITY[quality].bloom) composer.render();
  else renderer.render(scene, camera);

  if (state === 'drive') { updateHud(); drawMini(); }
}

/* ---------- Start ---------- */
spawn();
resize();
applyQuality();
setState('title');
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});

// Test-Schnittstelle
window.TF = {
  get state() { return state; }, car, world, touch, bloom,
  get quality() { return quality; },
  get tod() { return tod; }, set tod(v) { tod = v; },
  start, pause, resume, spawn, step: physics,
  stats: () => ({ distance, topSpeed, fps: 0 })
};
