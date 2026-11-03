// Offline-Cache: Spieldateien werden beim ersten Start gespeichert, Updates im Hintergrund geholt
const CACHE = 'legends-v0.2.0';
const FILES = ['./', './index.html', './gb.css', './3d.html', './style.css', './manifest.webmanifest', './icon-192.png',
  './js/main.js', './js/vendor/three.module.min.js', './js/core/noise.js', './js/core/input.js', './js/core/audio.js', './js/core/ui.js',
  './js/data/types.js', './js/data/moves.js', './js/data/creatures.js', './js/data/mon.js',
  './js/world/world.js', './js/world/models.js', './js/battle/battle.js', './js/battle/battleView.js', './js/net/net.js', './js/data/creatures2.js', './js/data/breeding.js',
  './js/gb/engine.js', './js/gb/pixel.js', './js/gb/sprites.js', './js/gb/maps.js', './js/gb/gbui.js', './js/gb/battle2d.js', './js/gb/overworld.js', './js/gb/game.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
