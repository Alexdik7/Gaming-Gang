// Offline-Cache für Cats Tower Defense. Bei jeder Änderung an Spieldateien CACHE erhöhen!
const CACHE = 'cats-td-v1';
const FILES = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'lib/peerjs.min.js',
  'js/main.js', 'js/config.js', 'js/session.js', 'js/audio.js',
  'js/data/cats.js', 'js/data/dogs.js', 'js/data/maps.js', 'js/data/waves.js', 'js/data/meta.js',
  'js/sim/world.js', 'js/sim/maps.js', 'js/sim/enemies.js', 'js/sim/towers.js', 'js/sim/waves.js', 'js/sim/damage.js', 'js/sim/upgrades.js', 'js/sim/powerups.js',
  'js/meta/save.js', 'js/meta/currency.js', 'js/meta/progression.js', 'js/meta/missions.js',
  'js/ui/ui.js', 'js/ui/hud.js', 'js/ui/render.js', 'js/ui/art.js', 'js/ui/icons.js',
  'js/net/multiplayer.js', 'js/net/lobby.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.startsWith('cats-td')).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// Erst Netz (damit Updates sofort ankommen), sonst Cache. Nur gute Antworten werden gespeichert.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
