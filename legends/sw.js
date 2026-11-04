// Offline-Cache: Spieldateien werden beim ersten Start gespeichert, Updates im Hintergrund geholt
const CACHE = 'legends-v2.1.0';
const FILES = ['./', './index.html', './gb.css', './manifest.webmanifest', './icon-192.png', './apple-touch-icon.png', './fonts/fonts.css', './fonts/pixelify-latin.woff2', './fonts/pixelify-latin-ext.woff2',
  './js/core/noise.js', './js/core/audio.js', './js/core/music.js', './js/net/net.js', './js/battle/battle.js', './js/battle/double.js', './js/data/coop.js',
  './js/data/types.js', './js/data/moves.js', './js/data/creatures.js', './js/data/creatures2.js', './js/data/creatures3.js', './js/data/creatures4.js', './js/data/creatures5.js', './js/data/creatures6.js', './js/data/creatures7.js', './js/data/creatures8.js', './js/data/creatures9.js', './js/data/creatures10.js', './js/data/creatures11.js', './js/data/mon.js', './js/data/breeding.js',
  './js/gb/engine.js', './js/gb/pixel.js', './js/gb/monart.js', './js/gb/sprites.js', './js/gb/maps.js', './js/gb/gbui.js',
  './js/gb/battle2d.js', './js/gb/battlebg.js', './js/gb/base.js', './js/gb/boxui.js', './js/gb/double2d.js', './js/gb/overworld.js', './js/gb/online.js', './js/gb/game.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
