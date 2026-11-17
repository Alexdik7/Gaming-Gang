// Offline-Cache für Beastforge. Bei jeder Änderung CACHE erhöhen!
const CACHE = 'beastforge-v0.2.0';
const FILES = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
  'js/main.js', 'js/game.js', 'js/audio.js', 'js/config.js',
  'js/data/creatures.js', 'js/data/enemies.js', 'js/data/heroes.js', 'js/data/maps.js', 'js/data/meta.js', 'js/data/waves.js',
  'js/meta/profile.js', 'js/meta/progression.js', 'js/sim/world.js', 'js/sim/stats.js',
  'js/render/stage.js', 'js/render/view.js', 'js/render/mapview.js', 'js/render/models.js', 'js/render/toon.js', 'js/render/fx.js', 'js/render/icons.js',
  'js/ui/hud.js', 'js/ui/menus.js',
  'lib/three.module.min.js', 'lib/addons/postprocessing/EffectComposer.js', 'lib/addons/postprocessing/RenderPass.js', 'lib/addons/postprocessing/ShaderPass.js',
  'lib/addons/postprocessing/Pass.js', 'lib/addons/postprocessing/MaskPass.js', 'lib/addons/postprocessing/UnrealBloomPass.js',
  'lib/addons/postprocessing/OutputPass.js', 'lib/addons/shaders/CopyShader.js', 'lib/addons/shaders/LuminosityHighPassShader.js', 'lib/addons/shaders/OutputShader.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => {
    const net = fetch(e.request).then(res => { if (res.ok && res.type === 'basic') caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res; }).catch(() => r);
    return r || net;
  }));
});
