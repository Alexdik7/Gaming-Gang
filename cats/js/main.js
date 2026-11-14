// CATS TOWER DEFENSE – Einstieg. Die App verbindet Spielstand, Ton, Menüs (UIManager) und Runden (GameScreen).
import { VERSION } from './config.js';
import { SaveManager } from './meta/save.js';
import { ensureMissions, bumpStats, finishRound } from './meta/missions.js';
import { playerSetup, unlocksAt } from './meta/progression.js';
import { AudioManager } from './audio.js';
import { Menus } from './ui/ui.js';
import { GameScreen } from './ui/hud.js';
import { LocalSession } from './session.js';
import { clearSprites } from './ui/art.js';

const $ = s => document.querySelector(s);

class App {
  constructor() {
    this.sm = new SaveManager(); this.save = this.sm.load();
    ensureMissions(this.save);
    this.audio = new AudioManager(this.save.settings);
    this.menus = new Menus(this); this.game = new GameScreen(this);
    this.version = VERSION;
    // Ton erst nach der ersten Berührung; Klick-Geräusche für alle Knöpfe
    addEventListener('pointerdown', () => { this.audio.unlock(); }, { passive: true });
    document.addEventListener('click', e => { if (e.target.closest('button')) this.audio.play(e.target.closest('.back,.x') ? 'back' : 'click'); }, true);
    // sicher speichern, wenn die App in den Hintergrund geht
    const flush = () => this.sm.save();
    addEventListener('pagehide', flush); document.addEventListener('visibilitychange', () => { if (document.hidden) { flush(); this.game.autoPause(); } });
    setInterval(() => this.sm.flush(), 15000);
    addEventListener('resize', () => this.game.resize());
    addEventListener('orientationchange', () => setTimeout(() => this.game.resize(), 300));
    document.addEventListener('gesturestart', e => e.preventDefault());
    this.menus.show('home');
    if (this.sm.recovered) this.toast(this.tr('Spielstand aus der Sicherung wiederhergestellt.', 'Save restored from backup.'));
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // --- Sprache
  get lang() { return this.save.settings.lang === 'en' ? 1 : 0; }
  tr(de, en) { return this.lang ? en : de; }
  L(pair) { return Array.isArray(pair) ? pair[this.lang] : pair; }

  changed() { this.sm.touch(); }
  toast(msg, bad) {
    const d = document.createElement('div'); d.className = 'toast' + (bad ? ' bad' : ''); d.innerHTML = msg;
    $('#toasts').appendChild(d); setTimeout(() => d.remove(), 2700);
    if (bad) this.audio.play('deny');
  }
  // Fenster: gibt das Element zurück; Klick auf [data-close] oder den Hintergrund schließt
  modal(html, o = {}) {
    const m = $('#modal'); m.innerHTML = `<div class="sheet ${o.mid ? 'mid' : ''}">${html}</div>`; m.classList.remove('hidden');
    m.onclick = e => { if ((e.target === m && !o.sticky) || e.target.closest('[data-close]')) this.closeModal(); };
    this.modalClose = o.onClose || null;
    return m.firstElementChild;
  }
  closeModal() { $('#modal').classList.add('hidden'); $('#modal').innerHTML = ''; const f = this.modalClose; this.modalClose = null; if (f) f(); }

  // --- Runde starten (Einzelspieler oder fertige Koop-Session)
  startSolo(mapId, diff, mode) {
    const s = this.save; s.lastMap = mapId; s.lastDiff = diff; this.changed();
    const session = new LocalSession({ mapId, diff, mode, players: [playerSetup(s)], seed: (Date.now() & 0xfffff) + 1 });
    this.startSession(session);
  }
  startSession(session) {
    $('#menu').classList.add('hidden'); $('#game').classList.remove('hidden');
    this.game.start(session);
  }
  // Verbrauchte Power-ups sofort abbuchen (auch wenn man die Runde abbricht)
  usedPower(id) { const s = this.save; if (s.powers[id] > 0) s.powers[id]--; bumpStats(s, { powerUsed: 1 }); this.sm.save(); }

  // Rundenende: Belohnungen verbuchen und zurückgeben (für den Ergebnis-Bildschirm)
  finish(result) {
    const s = this.save, before = s.level;
    const got = finishRound(s, result);
    got.unlocks = []; for (let l = before + 1; l <= s.level; l++) got.unlocks.push(...unlocksAt(l));
    got.levelBefore = before;
    this.sm.save();
    return got;
  }
  toMenu(screen = 'home') {
    $('#game').classList.add('hidden'); $('#menu').classList.remove('hidden');
    this.audio.music('menu'); this.menus.show(screen);
  }
  qualityChanged() { clearSprites(); this.game.resize(); }
}

window.addEventListener('DOMContentLoaded', () => { window.CTD = new App(); });
