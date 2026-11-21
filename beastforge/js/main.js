// BEASTFORGE – Einstieg: App, Menü-Szene, Hauptschleife, Dev-Menü (nur ?dev), Test-API window.BF
import * as THREE from 'three';
import { Stage } from './render/stage.js';
import { MapView } from './render/mapview.js';
import { buildModel } from './render/models.js';
import { loadAssets, ASSETS } from './render/assets.js';
import { toon, glow, mk, geo } from './render/toon.js';
import { Audio } from './audio.js';
import { Menus } from './ui/menus.js';
import { Game } from './game.js';
import { Loader } from './ui/loading.js';
import { portrait, mapThumb } from './render/icons.js';
import { unlockedCreatures } from './meta/progression.js';
import { MAPS } from './data/maps.js';
import { CREATURES } from './data/creatures.js';
import { BAL, VERSION } from './config.js';
import { loadProfile, saveProfile } from './meta/profile.js';
import { maxStage, addCharXp, addAccXp, charNeed } from './meta/progression.js';

const DEV = /[?&]dev\b/.test(location.search);

class App {
  constructor() {
    this.profile = loadProfile();
    this.stage = new Stage(document.getElementById('gl'));
    this.audio = new Audio();
    this.menus = new Menus(this);
    this.game = null; this.t = 0; this.last = performance.now();
    this.applySettings();
    this.loader = new Loader(); this.loader.show();
    this.boot();
    addEventListener('pointerdown', () => this.audio.init(), { once: true });
    const save = () => saveProfile(this.profile);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { save(); if (this.game && !this.game.paused && !this.game.world.over) this.game.hud.pause(); } });
    addEventListener('pagehide', save);
    this.perf = { n: 0, sum: 0, checked: false };
    if (DEV) this.devMenu();
    requestAnimationFrame(n => this.loop(n));
  }
  applySettings() {
    const S = this.profile.settings;
    this.audio.setVol(S.music, S.sfx);
    const q = S.quality === 'auto' ? (this.autoQ ?? (Math.min(innerWidth, innerHeight) < 500 ? 1 : 2)) : +S.quality;
    if (q !== this.stage.quality) this.stage.setQuality(q);
  }

  // Menü-Hintergrund: Ahnenhain + Kreaturen-Schaukasten
  buildMenuScene() {
    this.menuRoot = new THREE.Group(); this.stage.scene.add(this.menuRoot);
    this.menuMap = new MapView(this.menuRoot, MAPS.ahnenhain);
    this.showcase = new THREE.Group(); this.menuRoot.add(this.showcase);
    this.refreshShowcase();
  }
  refreshShowcase() {
    const P = this.profile, S = this.showcase; S.clear(); this.showModels = [];
    const ped = (x, z, r, h) => { S.add(mk(geo.cyl(16), toon(0xb8b4a8), { p: [x, h / 2, z], s: [r, h, r] })); S.add(mk(geo.torus(0.05), glow(0x9ff6ff, 0.6), { p: [x, h + 0.01, z], r: [Math.PI / 2, 0, 0], s: r * 0.98, ol: false })); };
    ped(0, 0, 0.75, 0.42);
    const k = P.chars.kitsune, main = buildModel('kitsune', { stage: maxStage('kitsune', k.level, k.branch), branch: k.branch });
    main.root.position.set(0, 0.42, 0); main.root.scale.setScalar(1.5); S.add(main.root); this.showModels.push(main);
    const others = ['tiger', 'turtle', 'deer', 'raven', 'kairo'];
    others.forEach((id, i) => {
      const a = -Math.PI / 2 + (i - 2) * 0.62, x = Math.sin(a) * 1.9, z = Math.cos(a) * 1.9 * -1;
      ped(x, z, 0.42, 0.25);
      const c = P.chars[id]; const m = buildModel(id, id === 'kairo' ? { hlvl: 1 } : { stage: maxStage(id, c.level, c.branch), branch: c.branch });
      m.root.position.set(x, 0.25, z); m.root.rotation.y = Math.atan2(-x, -z) * 0.5; S.add(m.root); this.showModels.push(m);
    });
    S.position.set(0, 0, 0);
  }
  showMenuScene(on) {
    this.menuRoot.visible = true;
    this.stage.setMode('menu');
    this.menuFocus = on === 'home';
    // Kamerafahrt je Bildschirm: Titel weit, Hub nah, Unterseiten seitlich (Hintergrund ist dann abgedunkelt)
    this.camT = { title: { r: 12.5, y: 6.2, ly: 0.7, ox: 0 }, home: { r: 7.6, y: 3.2, ly: 0.25, ox: 0 }, play: { r: 15, y: 9, ly: 0, ox: 0 } }[on] || { r: 5.6, y: 2.4, ly: 1.0, ox: 1.6 };
  }

  async boot() {
    const P = this.profile;
    await this.loader.run([
      ['Kreaturen erwachen …', () => /[?&]models=0/.test(location.search) ? null : loadAssets()],
      ['Der Ahnenhain erwacht …', () => this.buildMenuScene()],
      ['Kreaturen werden beschworen …', () => { for (const id of unlockedCreatures(P)) portrait(id, { stage: 0, branch: P.chars[id].branch }); }],
      ['Fuchsfeuer wird entzündet …', () => { this.stage.setMode('menu'); this.stage.renderer.compile(this.stage.scene, this.stage.camera); }],
      ['Karten werden gezeichnet …', () => Promise.all(Object.keys(MAPS).map(id => mapThumb(id)))],
      ['Schriftrollen werden geöffnet …', () => document.fonts?.ready],
    ], 1400);
    this.menus.show('title');
    this.loader.hide();
  }
  async startRun(map, diff) {
    this.loader.show(MAPS[map].name, 'Betrete ' + MAPS[map].name + ' …');
    await this.loader.run([
      ['Gelände wird geformt …', () => this._startRun(map, diff)],
      ['Gegner sammeln sich am Tor …', () => this.stage.renderer.compile(this.stage.scene, this.stage.camera)],
      ['Kreaturen machen sich bereit …', () => { for (const id of this.game.loadout) portrait(id, { stage: 0, branch: this.profile.chars[id].branch }); }],
    ], 1100);
    this.loader.hide();
  }
  _startRun(map, diff) {
    if (this.game) { this.game.destroy(); this.game = null; }
    document.getElementById('menu').innerHTML = ''; this.menus.closePreview();
    this.menuRoot.visible = false;
    this.game = new Game(this, { map, diff });
    this.perf = { n: 0, sum: 0, checked: this.profile.settings.quality !== 'auto' };
  }
  results(r) {
    const g = this.game; this.game = null; g.destroy();
    this.menuRoot.visible = true; this.refreshShowcase(); this.stage.setMode('menu');
    this.menus.s_results(r);
    this.audio.playSong('menu');
  }

  loop(now) {
    requestAnimationFrame(n => this.loop(n));
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.t += dt;
    this.profile.stats.playTime = (this.profile.stats.playTime || 0) + dt;
    if (this.game) {
      this.game.update(dt);
      // Automatische Qualität: in den ersten Sekunden messen
      if (!this.perf.checked) { this.perf.n++; this.perf.sum += dt; if (this.perf.n >= 150) { const avg = this.perf.sum / this.perf.n; this.perf.checked = true; if (avg > 0.026 && this.stage.quality > 0) { this.autoQ = this.stage.quality - 1; this.applySettings(); } } }
    } else if (this.menuMap) {
      for (const m of this.showModels || []) m.tick(this.t, dt, { atk: Math.max(0, Math.sin(this.t * 1.3 + m.root.position.x) - 0.92) * 12 });
      this.menuMap.update(dt, 1);
      const T = this.camT || { r: 8.2, y: 4.1, ly: 1.05, ox: 0 }, C = this.camC ||= { ...T }, k = Math.min(1, dt * 2.2);
      for (const key in T) C[key] += (T[key] - C[key]) * k;
      const a = this.t * 0.07, cam = this.stage.camera;
      cam.position.set(Math.sin(a) * C.r, C.y, Math.cos(a) * C.r); cam.lookAt(Math.cos(a) * C.ox, C.ly, -Math.sin(a) * C.ox);
    }
    if (this.game) this.stage.update(dt, this.t);
    this.stage.render();
    if (this.fpsEl) { this.fc = (this.fc || 0) + 1; this.ft = (this.ft || 0) + dt; if (this.ft > 0.5) { this.fpsEl.textContent = Math.round(this.fc / this.ft) + ' fps · ' + this.stage.renderer.info.render.calls + ' dc · q' + this.stage.quality; this.fc = 0; this.ft = 0; } }
  }

  // ───────── Dev-Menü (nur mit ?dev in der URL – nie im normalen Spiel sichtbar) ─────────
  devMenu() {
    const el = document.getElementById('dev'); el.classList.remove('hidden');
    const P = () => this.profile, W = () => this.game?.world;
    const acts = {
      '◈ +5000 Münzen': () => { if (W()) W().coins += 5000; },
      '✦ +5000 XP alle Kreaturen': () => { for (const id in CREATURES) addCharXp(P(), id, 5000, { flat: true }); },
      '✦ Alle Lv 5': () => this.devLevel(5), '✦ Alle Lv 15': () => this.devLevel(15), '✦ Alle Lv 30': () => this.devLevel(30), '✦ Alle Lv 50': () => this.devLevel(50),
      '♛ +5000 Konto-XP': () => addAccXp(P(), 5000),
      '🔓 Alles freischalten': () => { P().dev = { unlockAll: true }; },
      '⏭ Welle überspringen': () => { const w = W(); if (!w) return; w.spawners = []; for (const e of w.enemies) w.kill(e, null); },
      '👾 Gegner: Golem': () => W()?.spawn('golem'), '👾 Gegner: Oni': () => W()?.spawn('oni'), '🐉 Boss Vharox': () => W()?.spawn('vharox'),
      '👾 10 Schatten': () => { for (let i = 0; i < 10; i++) W()?.spawn('shade', [], i * 0.4); },
      '🛡 Gott-Modus': () => { this.devGod = !this.devGod; if (W()) W().god = this.devGod; },
      '📈 FPS anzeigen': () => { if (!this.fpsEl) { this.fpsEl = document.createElement('div'); this.fpsEl.id = 'fps'; document.body.appendChild(this.fpsEl); } },
      '◎ Reichweiten zeigen': () => { const g = this.game; if (g) for (const t of g.world.towers) g.view.showRange(t.x, t.y, t.s.range); },
      '✕ Menü einklappen': () => el.classList.add('hidden'),
    };
    el.innerHTML = '<b style="color:#f0f">DEV</b>' + Object.keys(acts).map((k, i) => `<button data-i="${i}">${k}</button>`).join('');
    el.querySelectorAll('button').forEach(b => b.onclick = () => { Object.values(acts)[+b.dataset.i](); saveProfile(this.profile); if (this.game) { this.game.world.dirty = true; this.game.hud.buildTray(); } });
  }
  devLevel(L) { for (const id in CREATURES) { const c = this.profile.chars[id]; c.level = L; c.xp = 0; } if (this.game) this.game.world.dirty = true; else { this.refreshShowcase(); } }
}

const app = new App();
// Test-/Debug-Schnittstelle
window.BF = {
  app, VERSION, BAL,
  get game() { return app.game; }, get world() { return app.game?.world; }, get profile() { return app.profile; },
  start: (d = 'normal', map = 'ahnenhain') => app._startRun(map, d),
  menu: n => app.menus.show(n),
  level: (L) => app.devLevel(L),
  charNeed,
  spot: (cid, r = 3) => app.game?.world.suggestSpot(cid, r),
  models: () => Object.keys(ASSETS),
  put: (cid, r = 3) => { const w = app.game?.world, p = w?.suggestSpot(cid, r); return p ? w.place(cid, ...p) : { ok: false }; },
};
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
