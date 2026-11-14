/* Offline-Cache. Bei jeder Änderung CACHE erhöhen. */
const CACHE = 'gymdesk-v2';
const FILES = ['./', 'index.html', 'styles.css', 'manifest.webmanifest', 'icon.svg', 'icon-192.png',
  'js/app.js', 'js/core/ui.js', 'js/core/db.js', 'js/core/crypto.js', 'js/core/auth.js', 'js/core/validate.js', 'js/core/pricing.js',
  'js/services/data.js', 'js/services/email.js', 'js/data/seed.js',
  'js/pages/dashboard.js', 'js/pages/signup.js', 'js/pages/signature.js', 'js/pages/contractview.js', 'js/pages/members.js',
  'js/pages/forms.js', 'js/pages/offers.js', 'js/pages/settings.js',
  'film/', 'film/index.html', 'film/film.css', 'film/film.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok && r.type === 'basic') { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request).then((m) => m || caches.match('index.html'))));
});
