// Offline-Cache für Beastforge. Bei jeder Änderung CACHE erhöhen!
const CACHE = 'beastforge-v0.52.0';
const FILES = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
  'js/main.js', 'js/game.js', 'js/audio.js', 'js/config.js',
  'js/data/creatures.js', 'js/data/enemies.js', 'js/data/heroes.js', 'js/data/maps.js', 'js/data/meta.js', 'js/data/waves.js', 'js/data/academy.js', 'js/data/challenges.js', 'js/data/daily.js', 'js/data/powers.js', 'js/data/events.js', 'js/data/codex.js', 'js/data/megas.js', 'js/data/tower.js', 'js/net.js', 'lib/peerjs.min.js', 'js/data/fusions.js',
  'js/meta/profile.js', 'js/meta/progression.js', 'js/sim/world.js', 'js/sim/stats.js',
  'js/render/stage.js', 'js/render/view.js', 'js/render/mapview.js', 'js/render/models.js', 'js/render/toon.js', 'js/render/fx.js', 'js/render/icons.js', 'js/render/assets.js', 'js/render/looks.js', 'js/render/ambient.js', 'js/render/attackfx.js', 'js/render/beasts.js',
  'js/ui/hud.js', 'js/ui/menus.js', 'js/ui/loading.js', 'js/ui/anim.js',
  'lib/three.module.min.js', 'lib/addons/postprocessing/EffectComposer.js', 'lib/addons/postprocessing/RenderPass.js', 'lib/addons/postprocessing/ShaderPass.js',
  'lib/addons/postprocessing/Pass.js', 'lib/addons/postprocessing/MaskPass.js', 'lib/addons/postprocessing/UnrealBloomPass.js',
  'lib/addons/postprocessing/OutputPass.js', 'lib/addons/shaders/CopyShader.js', 'lib/addons/shaders/LuminosityHighPassShader.js', 'lib/addons/shaders/OutputShader.js',
  'lib/addons/loaders/GLTFLoader.js', 'lib/addons/utils/SkeletonUtils.js', 'lib/addons/utils/BufferGeometryUtils.js',
  'assets/models/blob.glb', 'assets/models/ghost.glb', 'assets/models/skull.glb', 'assets/models/wizard.glb', 'assets/models/mushking.glb', 'assets/models/bee.glb', 'assets/models/bee2.glb', 'assets/models/rockling.glb', 'assets/models/demon.glb', 'assets/models/orc.glb', 'assets/models/dragon.glb', 'assets/models/wolf.glb', 'assets/models/bull.glb', 'assets/models/husky.glb', 'assets/models/stag.glb', 'assets/models/fox.glb', 'assets/models/owl.glb', 'assets/models/cat.glb', 'assets/models/whale.glb', 'assets/models/kk_raizen.glb', 'assets/models/deer2.glb', 'assets/models/fox2.glb', 'assets/models/shiba.glb', 'assets/models/pigeon.glb', 'assets/models/goleling.glb', 'assets/models/kk_ninja.glb', 'assets/models/kk_golem.glb', 'assets/models/kk_large1.glb', 'assets/models/kk_large2.glb', 'assets/models/kk_mage.glb', 'assets/models/kk_anim1.glb', 'assets/models/kk_anim2.glb', 'assets/models/kk_anim3.glb'];
// cache: 'reload' umgeht den Browser-Puffer – sonst landet beim Update die alte Datei im neuen Cache
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Modelle/Bilder: zuerst Cache (groß, ändern sich selten). Code/HTML/CSS: zuerst Netz (immer aktuell), offline aus dem Cache.
  const heavy = /\.(glb|png|jpg|webp|mp3|ogg)$/i.test(new URL(e.request.url).pathname);
  const put = res => { if (res.ok && res.type === 'basic') { const c2 = res.clone(); caches.open(CACHE).then(c => c.put(e.request, c2)); } return res; };
  if (heavy) { e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(put))); return; }
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(put).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
