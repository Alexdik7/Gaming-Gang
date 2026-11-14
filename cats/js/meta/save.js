// SaveManager: robuster Spielstand. Zwei Kopien (Haupt + Sicherung) mit Prüfsumme;
// ist die Hauptkopie beschädigt, wird automatisch die Sicherung geladen.
import { VERSION } from '../config.js';

const KEY = 'ctd.save', BAK = 'ctd.save.bak';
const sum = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };

export function defaultSave() {
  return {
    v: 1, uid: Math.random().toString(36).slice(2, 10), name: 'Katze' + Math.floor(100 + Math.random() * 900),
    level: 1, xp: 0, coins: 300, crystals: 5,
    cats: { scout: { r: 0 }, bomb: { r: 0 } },          // besessene Katzen mit Rang
    loadout: ['scout', 'bomb'],
    powers: { catnip: 2, megapaw: 2 }, powerLoad: ['megapaw', 'catnip'],
    research: {}, maps: {},                              // maps[id] = { easy: n, normal: n, hard: n, endless: besteWelle }
    daily: { day: 0, last: 0, streak: 0 },
    missions: { date: '', list: [] },
    ach: {}, stats: {}, seen: {},
    settings: { music: 0.5, sfx: 0.8, quality: 'auto', lang: 'de', fx: true, fps: 60, auto: false, shake: true },
    tutorial: 0, lastMap: 'city', lastDiff: 'easy'
  };
}

// Fehlende Felder aus dem Standard ergänzen (alte Spielstände bleiben gültig)
function migrate(s) {
  const d = defaultSave();
  for (const k in d) if (s[k] === undefined) s[k] = d[k];
  for (const k in d.settings) if (s.settings[k] === undefined) s.settings[k] = d.settings[k];
  if (!s.cats.scout) s.cats.scout = { r: 0 };
  s.loadout = (s.loadout || []).filter(c => s.cats[c]); if (!s.loadout.length) s.loadout = ['scout'];
  return s;
}

export class SaveManager {
  constructor(storage) {
    this.store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.data = null; this.dirty = false;
  }
  read(key) {
    try {
      const raw = this.store && this.store.getItem(key); if (!raw) return null;
      const o = JSON.parse(raw);
      if (!o || typeof o.d !== 'string' || sum(o.d) !== o.c) return null;
      const s = JSON.parse(o.d);
      return s && typeof s === 'object' && s.cats ? s : null;
    } catch { return null; }
  }
  load() {
    this.recovered = false;
    let s = this.read(KEY);
    if (!s) { s = this.read(BAK); this.recovered = !!s; }
    this.data = migrate(s || defaultSave());
    return this.data;
  }
  save() {
    if (!this.store || !this.data) return false;
    try {
      const d = JSON.stringify(this.data), packed = JSON.stringify({ c: sum(d), d, ver: VERSION, t: Date.now() });
      const old = this.store.getItem(KEY);
      if (old && this.read(KEY)) this.store.setItem(BAK, old);     // nur eine GÜLTIGE Kopie wird zur Sicherung
      this.store.setItem(KEY, packed);
      this.dirty = false; return true;
    } catch { return false; }
  }
  touch() { this.dirty = true; }
  flush() { if (this.dirty) this.save(); }
  reset() { this.data = defaultSave(); this.save(); return this.data; }

  // Sicherungs-Code zum Übertragen auf ein anderes Gerät
  exportCode() { const d = JSON.stringify(this.data); return 'CTD1.' + sum(d) + '.' + btoa(unescape(encodeURIComponent(d))); }
  importCode(code) {
    try {
      const [tag, c, b] = String(code).trim().split('.');
      if (tag !== 'CTD1') return false;
      const d = decodeURIComponent(escape(atob(b)));
      if (sum(d) !== c) return false;
      const s = JSON.parse(d); if (!s || !s.cats) return false;
      this.data = migrate(s); this.save(); return true;
    } catch { return false; }
  }
}
