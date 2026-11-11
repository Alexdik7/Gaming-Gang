// Offline-Cache für Turbofieber. Bei jeder Änderung CACHE erhöhen!
const CACHE = 'turbofieber-v0.5.0';
const FILES = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
  'js/main.js', 'js/world.js', 'js/car.js', 'js/fx.js', 'js/audio.js', 'js/outskirts.js', 'js/traffic.js', 'js/weather.js', 'js/cars.js', 'js/save.js', 'js/score.js', 'js/garage.js', 'js/races.js', 'js/missions.js', 'js/police.js', 'lib/three.module.min.js',
  'lib/addons/postprocessing/EffectComposer.js', 'lib/addons/postprocessing/RenderPass.js', 'lib/addons/postprocessing/ShaderPass.js',
  'lib/addons/postprocessing/Pass.js', 'lib/addons/postprocessing/MaskPass.js', 'lib/addons/postprocessing/UnrealBloomPass.js',
  'lib/addons/postprocessing/OutputPass.js', 'lib/addons/shaders/CopyShader.js', 'lib/addons/shaders/LuminosityHighPassShader.js',
  'lib/addons/shaders/OutputShader.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => {
    const net = fetch(e.request).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res; }).catch(() => r);
    return r || net;
  }));
});
