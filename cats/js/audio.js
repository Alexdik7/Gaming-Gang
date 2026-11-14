// AudioManager: alle Töne werden per WebAudio erzeugt (keine Dateien).
// Töne austauschen: Eintrag in SOUNDS ändern – oder mit audio.register(name, url) eine eigene Datei hinterlegen.

// [Wellenform, Startfrequenz, Endfrequenz, Dauer, Lautstärke, Rauschen-Anteil]
export const SOUNDS = {
  click: ['square', 660, 880, .05, .12], back: ['square', 520, 330, .06, .1], deny: ['sawtooth', 160, 110, .14, .14],
  place: ['sine', 300, 620, .12, .22], upgrade: ['triangle', 520, 1180, .22, .22], sell: ['triangle', 700, 380, .12, .16],
  shot: ['square', 760, 420, .045, .05], rifle: ['sawtooth', 300, 70, .16, .14, .5], minigun: ['square', 520, 340, .03, .035],
  boom: ['sine', 150, 40, .32, .3, .7], zap: ['sawtooth', 1400, 500, .09, .07], flame: ['sawtooth', 220, 160, .08, .03, .9],
  ice: ['sine', 1500, 900, .14, .06], stomp: ['sine', 100, 35, .4, .35, .5], laser: ['sine', 1100, 1000, .05, .025],
  die: ['triangle', 520, 240, .07, .06], leak: ['sawtooth', 220, 90, .3, .22], coin: ['sine', 1050, 1500, .07, .08],
  wave: ['triangle', 392, 784, .3, .16], boss: ['sawtooth', 110, 62, .9, .3, .2], power: ['sine', 440, 1320, .35, .2],
  levelup: ['triangle', 523, 1568, .5, .22], win: ['triangle', 523, 1047, .7, .24], lose: ['sawtooth', 330, 82, .9, .22],
  reward: ['sine', 880, 1760, .25, .18], crit: ['square', 1200, 1800, .06, .07], howl: ['sine', 300, 520, .5, .12]
};

// Musik als Notenfolgen (Halbtöne relativ zu A, '.' = Pause). Je Stück: Tempo, Bass, Melodie.
const MUSIC = {
  menu:   { bpm: 96, wave: 'triangle', bass: '0...7...5...7...3...7...5...2...', lead: '0.4.7.4.9.7.4.2.3.7.a.7.9.7.5.2.' },
  battle: { bpm: 128, wave: 'square', bass: '0.0.0.7.5.5.5.3.0.0.0.7.8.8.a.a.', lead: '0.3.7.a.9.7.5.3.0.3.7.c.a.9.7.5.' },
  boss:   { bpm: 150, wave: 'sawtooth', bass: '0.0.1.0.0.0.3.1.0.0.1.0.6.5.3.1.', lead: '0..1..3.6..5..3.0..1..3.8..6..5.' }
};
const semi = ch => ch === '.' ? null : parseInt(ch, 16);

export class AudioManager {
  constructor(settings) { this.set = settings; this.ctx = null; this.last = {}; this.custom = {}; this.track = null; this.step = 0; this.timer = null; }

  // Erst nach der ersten Berührung erlaubt der Browser Ton (wichtig auf dem iPhone)
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.sfx = this.ctx.createGain(); this.mus = this.ctx.createGain();
    this.sfx.connect(this.ctx.destination); this.mus.connect(this.ctx.destination);
    this.volumes();
    if (this.track) this.music(this.track, true);
  }
  volumes() { if (!this.ctx) return; this.sfx.gain.value = this.set.sfx; this.mus.gain.value = this.set.music * .35; }
  register(name, url) { const a = new Audio(url); a.preload = 'auto'; this.custom[name] = a; }

  play(name, pitch = 1) {
    const now = performance.now();
    if (now - (this.last[name] || 0) < 45) return;      // nicht stapeln
    this.last[name] = now;
    if (this.custom[name]) { const a = this.custom[name].cloneNode(); a.volume = this.set.sfx; a.play().catch(() => {}); return; }
    const S = SOUNDS[name]; if (!S || !this.ctx || this.set.sfx <= 0) return;
    const c = this.ctx, t = c.currentTime, [wave, f0, f1, dur, vol, noise = 0] = S, p = pitch * (.96 + Math.random() * .08);
    const g = c.createGain(); g.connect(this.sfx);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    if (noise < 1) { const o = c.createOscillator(); o.type = wave; o.frequency.setValueAtTime(f0 * p, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * p), t + dur); o.connect(g); o.start(t); o.stop(t + dur); }
    if (noise > 0) {
      if (!this.noise) { const b = c.createBuffer(1, c.sampleRate * .5, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this.noise = b; }
      const n = c.createBufferSource(), ng = c.createGain(), f = c.createBiquadFilter(); n.buffer = this.noise; f.type = 'lowpass'; f.frequency.value = 400 + f0 * 4;
      ng.gain.setValueAtTime(vol * noise, t); ng.gain.exponentialRampToValueAtTime(.001, t + dur); n.connect(f); f.connect(ng); ng.connect(this.sfx); n.start(t); n.stop(t + dur);
    }
  }

  music(name, force) {
    if (this.track === name && !force) return;
    this.track = name; this.step = 0;
    clearInterval(this.timer); this.timer = null;
    if (!name || !this.ctx) return;
    const M = MUSIC[name], dt = 60 / M.bpm / 2;
    let next = this.ctx.currentTime + .05;
    this.timer = setInterval(() => {
      if (!this.ctx || this.set.music <= 0 || document.hidden) { next = this.ctx ? this.ctx.currentTime + .05 : 0; return; }
      while (next < this.ctx.currentTime + .25) {
        const i = this.step++ % M.bass.length, b = semi(M.bass[i]), l = semi(M.lead[i]);
        if (b !== null) this.note(110 * Math.pow(2, b / 12), next, dt * 1.8, 'triangle', .5);
        if (l !== null) this.note(440 * Math.pow(2, l / 12), next, dt * .9, M.wave, M.wave === 'triangle' ? .3 : .12);
        if (i % 4 === 2 && name !== 'menu') this.note(2000, next, .03, 'square', .05);
        next += dt;
      }
    }, 80);
  }
  note(f, t, dur, wave, vol) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = wave; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(this.mus); o.start(t); o.stop(t + dur + .02);
  }
}

// Welcher Ton gehört zu welchem Spiel-Ereignis?
const SHOT_SOUND = { rifle: 'rifle', minigun: 'minigun', turret: 'minigun', launcher: 'rifle', claw: 'zap', sunstaff: 'laser' };
export function eventSound(ev) {
  switch (ev.e) {
    case 'shot': return SHOT_SOUND[ev.k] || 'shot';
    case 'boom': return 'boom'; case 'zap': return 'zap'; case 'cone': return 'flame'; case 'beam': return 'laser'; case 'ray': return 'laser';
    case 'pulse': return ev.k === 'ice' ? 'ice' : 'stomp'; case 'die': return ev.boss ? 'boom' : 'die'; case 'leak': return 'leak';
    case 'place': return 'place'; case 'up': return 'upgrade'; case 'sell': return 'sell'; case 'wave': return ev.boss ? 'boss' : 'wave';
    case 'stomp': return 'stomp'; case 'howl': return 'howl'; case 'power': return 'power'; case 'win': return 'win'; case 'lose': return 'lose';
    case 'crit': return 'crit'; case 'income': return 'coin'; case 'waveEnd': return 'coin';
  }
  return null;
}
