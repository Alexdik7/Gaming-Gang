// Offline-Cache: Spieldateien werden beim ersten Start gespeichert, Updates im Hintergrund geholt
const CACHE = 'sternflut-v1.5.8';
const FILES = ['./', './index.html', './gb.css', './manifest.webmanifest', './icon-192.png', './apple-touch-icon.png', './fonts/fonts.css', './fonts/pixelify-latin.woff2', './fonts/atkinson-400.woff2', './fonts/atkinson-700.woff2', './fonts/pixelify-latin-ext.woff2',
  './js/core/noise.js', './js/core/audio.js', './js/core/music.js', './js/battle/battle.js', './js/battle/double.js', './js/data/coop.js', './js/data/combos.js', './js/data/fossil.js',
  './js/data/types.js', './js/data/moves.js', './js/data/creatures.js', './js/data/creatures2.js', './js/data/kalmara1.js', './js/data/kalmara2.js', './js/data/kalmara3.js', './js/data/kalmara4.js', './js/data/welt2a.js', './js/data/welt2b.js', './js/data/welt3.js', './js/data/mon.js', './js/data/breeding.js',
  './js/gb/engine.js', './js/gb/pixel.js', './js/gb/monart.js', './js/gb/sprites.js', './js/gb/maps.js', './js/gb/gbui.js',
  './js/gb/battle2d.js', './js/gb/battlebg.js', './js/gb/base.js', './js/gb/boxui.js', './js/gb/codes.js', './js/gb/people.js', './js/gb/fx.js', './js/gb/double2d.js', './js/gb/overworld.js', './js/gb/story.js', './js/gb/akt3.js', './js/gb/akt4.js', './js/gb/akt5.js', './js/gb/maps2.js', './js/gb/akt6.js', './js/gb/maps3.js', './js/gb/akt7.js', './js/gb/extras.js', './js/gb/duo.js', './js/gb/dig.js', './js/gb/island.js', './js/gb/ari.js', './js/gb/vato.js', './js/gb/maps4.js', './js/gb/travel.js', './js/gb/pager.js', './js/gb/game.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // Netz zuerst, aber nur gute Antworten speichern. Fehlerseiten (404, Server weg) nie über die gespeicherte Version legen –
  // dann lieber die letzte funktionierende Fassung aus dem Speicher zeigen.
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => {
    if (r.ok) { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); return r; }
    return caches.match(e.request, { ignoreSearch: true }).then(m => m || r);
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(m => m || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined))));
});
