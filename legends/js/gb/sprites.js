// Kreaturen- und Trainer-Sprites: 3D-Modelle werden offscreen gerendert und zu Pixel-Art verarbeitet
import * as THREE from '../vendor/three.module.min.js';
import { buildCreature, buildHuman, shiftHue } from '../world/models.js';
import { SPECIES } from '../data/creatures.js';
import { ensureSpecies } from '../data/breeding.js';

let R = null, scene, cam, holder;
function init() {
  if (R) return;
  const canvas = document.createElement('canvas');
  R = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, preserveDrawingBuffer: true });
  R.setPixelRatio(1); R.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  scene.add(new THREE.HemisphereLight('#ffffff', '#606880', 1.6));
  const d = new THREE.DirectionalLight('#ffffff', 2.2); d.position.set(-2, 4, 5); scene.add(d);
  holder = new THREE.Group(); scene.add(holder);
}

function renderObj(obj, size, yaw, pitch = 0.18, zoom = 1) {
  init();
  holder.clear(); holder.add(obj);
  obj.rotation.y = yaw;
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
  const r = Math.max(sz.x, sz.y, sz.z) * 0.62 / zoom;
  const dist = r / Math.tan(THREE.MathUtils.degToRad(15));
  cam.position.set(c.x, c.y + Math.sin(pitch) * dist, c.z + Math.cos(pitch) * dist);
  cam.lookAt(c);
  R.setSize(size, size, false);
  R.setClearColor(0x000000, 0);
  R.render(scene, cam);
  // Nachbearbeitung: Farbreduktion + dunkle Outline
  const out = document.createElement('canvas'); out.width = out.height = size;
  const x = out.getContext('2d'); x.drawImage(R.domElement, 0, 0);
  const img = x.getImageData(0, 0, size, size), d = img.data;
  const a = i => d[i * 4 + 3] > 100;
  const solid = new Uint8Array(size * size);
  for (let i = 0; i < size * size; i++) {
    solid[i] = a(i) ? 1 : 0;
    if (solid[i]) { for (let k = 0; k < 3; k++) d[i * 4 + k] = Math.round(d[i * 4 + k] / 24) * 24; d[i * 4 + 3] = 255; } else d[i * 4 + 3] = 0;
  }
  for (let y = 0; y < size; y++) for (let xx = 0; xx < size; xx++) {
    const i = y * size + xx; if (solid[i]) continue;
    if ((xx > 0 && solid[i - 1]) || (xx < size - 1 && solid[i + 1]) || (y > 0 && solid[i - size]) || (y < size - 1 && solid[i + size])) {
      d[i * 4] = 32; d[i * 4 + 1] = 26; d[i * 4 + 2] = 40; d[i * 4 + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  holder.clear();
  return out;
}

const cache = new Map();
// view: 'front' | 'back' | 'icon'
export function monSprite(sp, view = 'front', shiny = false, mut = false) {
  const k = sp + view + shiny + mut;
  if (cache.has(k)) return cache.get(k);
  const S = SPECIES[sp] || ensureSpecies(sp);
  let spec = S.model;
  if (mut) spec = { ...spec, main: shiftHue(spec.main, -0.12), extras: [...new Set([...(spec.extras || []), 'gem'])] };
  const obj = buildCreature(spec, shiny);
  const size = view === 'icon' ? 32 : 64;
  const img = renderObj(obj, size, view === 'back' ? Math.PI + 0.55 : -0.55, view === 'back' ? 0.28 : 0.15, 1);
  cache.set(k, img);
  return img;
}
export function trainerSprite(look, back = false) {
  const k = 'tr' + JSON.stringify(look) + back;
  if (cache.has(k)) return cache.get(k);
  const img = renderObj(buildHuman({ pants: '#384868', accent: '#f2d16b', ...look }), 64, back ? Math.PI + 0.3 : -0.25, 0.1, 1.05);
  cache.set(k, img);
  return img;
}
