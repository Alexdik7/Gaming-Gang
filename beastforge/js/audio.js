// Audio komplett per WebAudio-Synthese: eigene Stücke (In-/Yo-Tonleiter), Koto, Flöte, Taiko, Effekte.
const N = (s) => 440 * Math.pow(2, (s - 69) / 12);
export class Audio {
  constructor() { this.ctx = null; this.music = 0.55; this.sfx = 0.8; this.song = null; this.step = 0; this.next = 0; this.intensity = 0; this.hitBudget = 0; this.last = {}; }
  init() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* alt */ }
    this.ctx = new AC();
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 0.9;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp); comp.connect(c.destination);
    this.mBus = c.createGain(); this.mBus.gain.value = this.music; this.mBus.connect(this.master);
    this.sBus = c.createGain(); this.sBus.gain.value = this.sfx; this.sBus.connect(this.master);
    // Hall (kurzer, gefalteter Rausch-Impuls)
    const len = c.sampleRate * 1.6, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    this.rev = c.createConvolver(); this.rev.buffer = ir; const rg = c.createGain(); rg.gain.value = 0.28; this.rev.connect(rg); rg.connect(this.master);
    this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate); const nd = this.noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    setInterval(() => this.tick(), 50);
    const res = () => { if (this.ctx.state !== 'running') this.ctx.resume(); };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) res(); });
    addEventListener('pageshow', res);
  }
  setVol(m, s) { this.music = m; this.sfx = s; if (this.mBus) { this.mBus.gain.value = m; this.sBus.gain.value = s; } }

  // ───────── Instrumente ─────────
  env(g, t, a, peak, dec, sus = 0.0001) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus), t + a + dec); }
  osc(type, f, t, dur, vol, bus, o = {}) {
    const c = this.ctx, os = c.createOscillator(), g = c.createGain(); os.type = type; os.frequency.setValueAtTime(f, t);
    if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + (o.toT || dur));
    if (o.det) os.detune.value = o.det;
    let node = os;
    if (o.lp) { const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.lp; f2.Q.value = o.q || 0.7; os.connect(f2); node = f2; }
    node.connect(g); g.connect(bus); if (o.rev) g.connect(this.rev);
    this.env(g, t, o.a || 0.005, vol, dur); os.start(t); os.stop(t + dur + 0.1);
    return os;
  }
  noiseHit(t, dur, vol, bus, o = {}) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f || 1200, t); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur); f.Q.value = o.q || 1;
    s.connect(f); f.connect(g); g.connect(bus); if (o.rev) g.connect(this.rev);
    this.env(g, t, o.a || 0.002, vol, dur); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  koto(m, t, v = 0.16, bus = this.mBus) { const f = N(m); this.osc('triangle', f, t, 1.1, v, bus, { lp: 3200, rev: true }); this.osc('sawtooth', f * 1.003, t, 0.35, v * 0.35, bus, { lp: 2400 }); this.osc('sine', f * 2, t, 0.25, v * 0.2, bus); }
  flute(m, t, dur, v = 0.09, bus = this.mBus) {
    const c = this.ctx, os = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    os.type = 'sine'; os.frequency.value = N(m); lfo.frequency.value = 5.2; lg.gain.value = N(m) * 0.012; lfo.connect(lg); lg.connect(os.frequency);
    os.connect(g); g.connect(bus); g.connect(this.rev);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.09); g.gain.setValueAtTime(v, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    os.start(t); lfo.start(t); os.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
    this.noiseHit(t, 0.12, v * 0.25, bus, { f: 2400, q: 0.8 });
  }
  taiko(t, v = 0.5, bus = this.mBus, low = 1) { this.osc('sine', 90 * low, t, 0.45, v, bus, { to: 42 * low, toT: 0.3 }); this.noiseHit(t, 0.08, v * 0.35, bus, { type: 'lowpass', f: 900 }); }
  shime(t, v = 0.15, bus = this.mBus) { this.noiseHit(t, 0.06, v, bus, { type: 'highpass', f: 2600 }); this.osc('triangle', 380, t, 0.06, v * 0.4, bus); }
  bass(m, t, dur, v = 0.16) { this.osc('triangle', N(m), t, dur, v, this.mBus, { lp: 600 }); }
  pad(ms, t, dur, v = 0.035) { for (const m of ms) { for (const d of [-7, 7]) { const c = this.ctx, os = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(); os.type = 'sawtooth'; os.frequency.value = N(m); os.detune.value = d; f.type = 'lowpass'; f.frequency.value = 900; os.connect(f); f.connect(g); g.connect(this.mBus); g.connect(this.rev); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); os.start(t); os.stop(t + dur + 0.1); } } }

  // ───────── Musik (eigene Stücke, 16tel-Raster) ─────────
  playSong(name) {
    if (!this.ctx) { this.pending = name; return; }
    if (this.song?.name === name) return;
    this.song = SONGS[name] ? { name, ...SONGS[name] } : null; this.step = 0; this.next = this.ctx.currentTime + 0.1;
  }
  setIntensity(x) { this.intensity = x; }
  tick() {
    const c = this.ctx; if (!c || !this.song) return;
    if (this.pending) { const p = this.pending; this.pending = null; this.playSong(p); }
    const S = this.song, spb = 60 / (S.bpm * (this.intensity > 1.5 ? 1.1 : 1)) / 4;
    while (this.next < c.currentTime + 0.25) { S.play(this, this.step, this.next, spb, this.intensity); this.step++; this.next += spb; }
  }

  // ───────── Prioritäten: bei vielen gleichzeitigen Klängen fallen unwichtige weg (Boss, Ultimate, Entwicklung bleiben hörbar) ─────────
  admit(prio, now) {
    this.load = (this.load || 0) * Math.exp(-(now - (this.loadT || now)) / 220); this.loadT = now;
    if (prio === 0 && this.load > 7) return false;
    this.load += prio === 0 ? 1 : 0.5; return true;
  }
  // ───────── Klangsignatur je Kreatur (leise Schicht über dem Angriffsklang, höher mit Stufe) ─────────
  voice(cid, tier = 0) {
    const c = this.ctx; if (!c || this.sfx <= 0) return;
    const now = performance.now(); if (now - (this.last['v_' + cid] || 0) < 120) return; this.last['v_' + cid] = now;
    if (!this.admit(0, now)) return;
    const t = c.currentTime + 0.005, B = this.sBus, k = 1 + tier * 0.04 + (Math.random() - 0.5) * 0.05, v = 0.05 + tier * 0.006;
    switch (VOICE[cid] || 'chime') {
      case 'bell': this.osc('sine', 1568 * k, t, 0.35, v, B, { rev: true }); this.osc('sine', 2349 * k, t + 0.02, 0.25, v * 0.5, B, { rev: true }); break;   // Kitsune: Glöckchen
      case 'thunder': this.osc('sine', 70 * k, t, 0.2, v * 2.2, B, { to: 40 }); this.noiseHit(t, 0.08, v * 1.2, B, { type: 'highpass', f: 3000 }); break;   // Tiger: Wumms + Knistern
      case 'water': this.osc('sine', 900 * k, t, 0.12, v * 1.2, B, { to: 260, toT: 0.1 }); this.osc('sine', 110, t, 0.18, v, B); break;   // Schildkröte: Blubb + Panzer
      case 'chimes': for (let i = 0; i < 3; i++) this.osc('sine', [2093, 2637, 3136][i] * k, t + i * 0.04, 0.4, v * 0.6, B, { rev: true }); break;   // Kirin
      case 'pipe': this.osc('triangle', 1175 * k, t, 0.12, v, B, { lp: 3000 }); break;   // Hirsch
      case 'caw': this.osc('sawtooth', 700 * k, t, 0.1, v * 0.6, B, { to: 380, lp: 1800 }); break;   // Rabe
      case 'breath': this.noiseHit(t, 0.25, v * 1.4, B, { type: 'lowpass', f: 900, to: 300 }); break;   // Drachenwolf
      case 'shing': this.noiseHit(t, 0.08, v * 1.2, B, { type: 'bandpass', f: 6000, q: 6 }); this.osc('sine', 2637 * k, t, 0.15, v * 0.5, B); break;   // Mantis
      case 'rock': this.osc('sine', 60 * k, t, 0.2, v * 2, B, { to: 35 }); this.noiseHit(t, 0.1, v, B, { type: 'lowpass', f: 400 }); break;   // Golem
      case 'jingle': this.osc('square', 2637 * k, t, 0.05, v * 0.4, B, { lp: 5000 }); this.osc('square', 3136 * k, t + 0.04, 0.06, v * 0.35, B, { lp: 5000 }); break;   // Glückskatze
      case 'whoosh': this.noiseHit(t, 0.22, v * 1.3, B, { type: 'bandpass', f: 600, to: 2400, q: 1.2 }); break;   // Phönix
      case 'hiss': this.noiseHit(t, 0.16, v, B, { type: 'highpass', f: 5000 }); break;   // Schlangenmagierin
      case 'wind': this.noiseHit(t, 0.2, v * 1.2, B, { type: 'bandpass', f: 1400, to: 700, q: 2 }); break;   // Mönch
      case 'warp': { const o = this.osc('sine', 520 * k, t, 0.25, v, B, { to: 1040 * k, rev: true }); void o; break; }   // Leerenkatze
      case 'bubble': this.osc('sine', 600 * k, t, 0.06, v * 1.2, B, { to: 1400 }); break;   // Kappa
      case 'growl': this.osc('sawtooth', 95 * k, t, 0.18, v * 0.9, B, { lp: 500, to: 70 }); break;   // Komainu
      default: this.osc('sine', 1760 * k, t, 0.2, v * 0.6, B, { rev: true });
    }
  }

  // ───────── Effekte ─────────
  play(name, o = {}) {
    const c = this.ctx; if (!c || this.sfx <= 0) return;
    const t = c.currentTime + 0.005, B = this.sBus, now = performance.now();
    const thr = THROTTLE[name]; if (thr) { if (now - (this.last[name] || 0) < thr) return; this.last[name] = now; }
    if (!this.admit(LOWPRIO.has(name) ? 0 : 1, now)) return;
    const p = 1 + (Math.random() - 0.5) * 0.08;
    switch (name) {
      case 'whoosh': this.noiseHit(t, 0.32, 0.07, B, { f: 500, to: 3800, q: 1.2 }); this.osc('sine', 220 * p, t, 0.2, 0.04, B, { to: 520 }); break;
      case 'start': this.taiko(t, 0.8, B, 0.9); [0, 7, 12, 16, 19].forEach((s, i) => this.koto(62 + s, t + 0.05 + i * 0.06, 0.15, B)); this.noiseHit(t, 0.5, 0.06, B, { f: 800, to: 5000, q: 1 }); break;
      case 'click': this.osc('triangle', 900 * p, t, 0.05, 0.12, B); break;
      case 'error': this.osc('square', 180, t, 0.12, 0.08, B, { lp: 800 }); this.osc('square', 140, t + 0.08, 0.14, 0.08, B, { lp: 800 }); break;
      case 'place': this.taiko(t, 0.35, B, 1.4); this.osc('triangle', 520 * p, t + 0.02, 0.15, 0.12, B); this.osc('triangle', 780 * p, t + 0.08, 0.2, 0.1, B, { rev: true }); break;
      case 'sell': for (let i = 0; i < 4; i++) this.osc('triangle', 1200 + i * 250, t + i * 0.04, 0.12, 0.07, B); break;
      case 'coin': this.osc('square', 1567 * p, t, 0.05, 0.035, B, { lp: 4000 }); this.osc('square', 2093 * p, t + 0.045, 0.08, 0.03, B, { lp: 4000 }); break;
      case 'upgrade': [0, 4, 7, 12].forEach((s, i) => this.osc('triangle', N(74 + s + (o.tier || 0)), t + i * 0.05, 0.25, 0.1, B, { rev: true })); this.noiseHit(t, 0.3, 0.05, B, { f: 6000, q: 0.5 }); break;
      case 'tier5': [0, 7, 12, 16, 19, 24].forEach((s, i) => this.osc('sawtooth', N(62 + s), t + i * 0.06, 0.6, 0.07, B, { lp: 3000, rev: true })); this.taiko(t, 0.6, B); this.taiko(t + 0.3, 0.6, B); break;
      case 'evolve': {
        this.noiseHit(t, 0.6, 0.12, B, { f: 300, to: 8000, q: 2, a: 0.4 });
        [0, 3, 7, 10, 12, 15, 19].forEach((s, i) => this.osc('triangle', N(62 + s), t + i * 0.07, 0.5, 0.1, B, { rev: true }));
        const h = t + 0.55; this.taiko(h, 0.9, B); this.taiko(h, 0.6, B, 0.6);
        [62, 69, 74, 78].forEach(m => this.osc('sawtooth', N(m), h, 1.6, 0.06, B, { lp: 2800, rev: true }));
        this.noiseHit(h, 1.2, 0.15, B, { f: 5000, q: 0.4, rev: true });
        break;
      }
      case 'levelup': [0, 4, 7, 12, 16].forEach((s, i) => this.koto(72 + s, t + i * 0.07, 0.14, B)); break;
      case 'acclevel': [0, 4, 7, 11, 14, 19].forEach((s, i) => this.osc('triangle', N(67 + s), t + i * 0.08, 0.6, 0.11, B, { rev: true })); this.taiko(t + 0.48, 0.5, B); break;
      case 'kunai': this.noiseHit(t, 0.06, 0.07, B, { f: 4200 * p, q: 3 }); break;
      case 'frost': this.noiseHit(t, 0.22, 0.07, B, { type: 'highpass', f: 3000 * p, to: 6000 }); this.osc('sine', 1800 * p, t, 0.1, 0.03, B, { to: 2600 }); break;
      case 'slash': this.noiseHit(t, 0.05, 0.06, B, { f: 5200 * p, to: 2500, q: 4 }); break;
      case 'fire': this.noiseHit(t, 0.25, 0.09, B, { f: 700 * p, to: 2400, q: 0.7 }); break;
      case 'zap': this.osc('sawtooth', 1800 * p, t, 0.09, 0.05, B, { to: 300, lp: 5000 }); this.noiseHit(t, 0.12, 0.08, B, { f: 5200, q: 0.6 }); break;
      case 'thunder': this.noiseHit(t, 0.9, 0.3, B, { type: 'lowpass', f: 2500, to: 200, rev: true }); this.osc('sine', 60, t, 0.6, 0.3, B, { to: 30 }); break;
      case 'pulse': this.osc('sine', 120 * p, t, 0.3, 0.22, B, { to: 50 }); this.noiseHit(t, 0.18, 0.08, B, { type: 'lowpass', f: 600 }); break;
      case 'mortar': this.osc('sine', 200, t, 0.15, 0.12, B, { to: 90 }); this.noiseHit(t, 0.1, 0.1, B, { f: 800 }); break;
      case 'boom': this.noiseHit(t, 0.5, 0.22, B, { type: 'lowpass', f: 1400, to: 120 }); this.osc('sine', 80, t, 0.4, 0.25, B, { to: 35 }); break;
      case 'feather': this.noiseHit(t, 0.08, 0.05, B, { f: 3000 * p, to: 6000, q: 2 }); break;
      case 'leaf': this.osc('sine', 1400 * p, t, 0.08, 0.04, B, { to: 2200 }); break;
      case 'shuriken': this.noiseHit(t, 0.1, 0.06, B, { f: 6000 * p, q: 6 }); break;
      case 'hit': this.osc('triangle', 260 * p, t, 0.05, 0.06, B, { to: 140 }); break;
      case 'crit': this.osc('square', 1300 * p, t, 0.06, 0.06, B, { lp: 5000 }); this.noiseHit(t, 0.1, 0.1, B, { f: 3500, q: 1 }); break;
      case 'pop': { const L = o.layer || 0; this.osc('sine', (500 + L * 110) * p, t, 0.07, 0.08, B, { to: 900 + L * 220 }); if (L) this.noiseHit(t, 0.04, 0.04, B, { f: 2500 + L * 600, q: 2 }); break; }
      case 'bigdie': this.noiseHit(t, 0.9, 0.25, B, { type: 'lowpass', f: 2000, to: 100, rev: true }); this.taiko(t, 0.8, B, 0.7); break;
      case 'leak': this.osc('sawtooth', 220, t, 0.3, 0.1, B, { to: 110, lp: 1200 }); this.osc('sine', 110, t, 0.35, 0.2, B, { to: 55 }); break;
      case 'react': this.osc('triangle', 880 * p, t, 0.15, 0.08, B, { to: 1760 }); this.noiseHit(t, 0.15, 0.06, B, { f: 5000 }); break;
      case 'wave': this.taiko(t, 0.7, B); this.taiko(t + 0.18, 0.5, B); this.taiko(t + 0.36, 0.8, B); this.flute(74, t + 0.1, 0.7, 0.08, B); break;
      case 'waveEnd': [0, 5, 7].forEach((s, i) => this.koto(74 + s, t + i * 0.09, 0.12, B)); break;
      case 'bossWarn': for (let i = 0; i < 6; i++) this.taiko(t + i * 0.32, 0.9, B, 0.8); this.osc('sawtooth', N(38), t, 2.2, 0.08, B, { lp: 500, rev: true }); this.osc('sawtooth', N(39), t, 2.2, 0.07, B, { lp: 500 }); break;
      case 'roar': this.noiseHit(t, 1.4, 0.35, B, { f: 300, to: 120, q: 2, rev: true }); this.osc('sawtooth', 90, t, 1.2, 0.18, B, { to: 50, lp: 700 }); break;
      case 'breath': this.noiseHit(t, 1.2, 0.3, B, { f: 500, to: 2500, q: 0.6 }); break;
      case 'ability': this.noiseHit(t, 0.5, 0.15, B, { f: 400, to: 6000, q: 1.5 }); this.osc('sawtooth', N(50), t + 0.4, 0.8, 0.12, B, { lp: 1600, rev: true }); this.taiko(t + 0.45, 0.9, B); break;
      case 'ult': for (let i = 0; i < 9; i++) this.osc('triangle', N(62 + [0, 3, 7, 10, 12, 15, 19, 22, 24][i]), t + i * 0.06, 0.8, 0.08, B, { rev: true }); this.taiko(t + 0.6, 1, B, 0.6); this.noiseHit(t + 0.6, 1.5, 0.2, B, { f: 3000, q: 0.4, rev: true }); break;
      case 'win': [0, 4, 7, 12, 7, 12, 16, 19].forEach((s, i) => this.koto(67 + s, t + i * 0.12, 0.16, B)); this.flute(79, t + 0.96, 1.4, 0.1, B); this.taiko(t + 0.96, 0.7, B); break;
      case 'lose': [0, -2, -5, -9].forEach((s, i) => this.flute(69 + s, t + i * 0.35, 0.6, 0.09, B)); this.taiko(t + 1.4, 0.5, B, 0.6); break;
      case 'say': this.osc('square', 600 + Math.random() * 200, t, 0.04, 0.03, B, { lp: 2000 }); this.osc('square', 700 + Math.random() * 200, t + 0.06, 0.04, 0.03, B, { lp: 2000 }); break;
    }
  }
}
// Klangsignatur je Kreatur (Fusionen nutzen den Körper)
const VOICE = { kitsune: 'bell', tiger: 'thunder', turtle: 'water', kirin: 'chimes', deer: 'pipe', raven: 'caw', dragonwolf: 'breath', mantis: 'shing', golem: 'rock', neko: 'jingle', phoenix: 'whoosh', naga: 'hiss', monk: 'wind', voidcat: 'warp', kappa: 'bubble', komainu: 'growl' };
const LOWPRIO = new Set(['hit', 'pop', 'coin', 'kunai', 'feather', 'leaf', 'shuriken', 'slash', 'frost', 'fire', 'zap', 'pulse', 'mortar', 'crit']);
const THROTTLE = { frost: 110, slash: 55, kunai: 60, fire: 90, zap: 80, hit: 45, coin: 50, crit: 70, pulse: 120, feather: 60, leaf: 80, shuriken: 70, pop: 40, boom: 90, react: 120, mortar: 120 };

// Tonleitern: In (D Es G A B) = Kampf/Boss, Yo (D E G A H) = Menü
const IN = [0, 1, 5, 7, 8], YO = [0, 2, 5, 7, 9];
const deg = (scale, root, i) => root + scale[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5);
const SONGS = {
  menu: { bpm: 80, play(a, s, t, spb) {
    const bar = Math.floor(s / 16) % 8, st = s % 16, root = 62, prog = [0, 0, 3, 2, 0, 0, 4, 2];
    if (st % 2 === 0) a.koto(deg(YO, root, prog[bar] + [0, 2, 4, 5, 7, 5, 4, 2][st / 2]), t, 0.08);
    if (st === 0) { a.pad([deg(YO, root - 12, prog[bar]), deg(YO, root - 12, prog[bar] + 2), deg(YO, root - 12, prog[bar] + 4)], t, spb * 16, 0.025); a.bass(deg(YO, root - 24, prog[bar]), t, spb * 14, 0.1); }
    const mel = [[7, -1, -1, -1, 6, -1, 5, -1, 4, -1, -1, -1, -1, -1, -1, -1], [5, -1, 6, -1, 7, -1, -1, -1, 9, -1, 8, -1, 7, -1, -1, -1]][bar % 2];
    if (bar >= 2 && mel[st] >= 0) a.flute(deg(YO, root + 12, mel[st] - 5), t, spb * 6, 0.06);
  } },
  forest: { bpm: 108, play(a, s, t, spb, I) {
    const bar = Math.floor(s / 16) % 8, st = s % 16, root = 62, prog = [0, 0, 3, 1, 0, 0, 3, 4];
    const ost = [0, 2, 4, 2, 5, 4, 2, 4];
    if (st % 2 === 0) a.koto(deg(IN, root, prog[bar] + ost[(st / 2) % 8]), t, 0.07 + I * 0.03);
    if (st === 0) { a.bass(deg(IN, root - 24, prog[bar]), t, spb * 6, 0.14); a.pad([deg(IN, root - 12, prog[bar]), deg(IN, root - 12, prog[bar] + 3)], t, spb * 16, 0.02); }
    if (st === 8) a.bass(deg(IN, root - 24, prog[bar] + 3), t, spb * 6, 0.12);
    if (I > 0.4) { if (st === 0 || st === 10) a.taiko(t, 0.32); if (st === 6 || st === 14) a.taiko(t, 0.16, a.mBus, 1.3); if (st % 4 === 2) a.shime(t, 0.06); }
    else if (st === 0) a.taiko(t, 0.18);
    const mel = [[10, -1, -1, 9, -1, 7, -1, -1, 8, -1, 7, -1, 5, -1, -1, -1], [7, -1, 8, -1, 10, -1, -1, -1, 12, -1, 10, -1, 9, -1, 7, -1]];
    if (bar >= 4 && I > 0.4) { const m = mel[bar % 2][st]; if (m >= 0) a.flute(deg(IN, root, m), t, spb * 3.5, 0.055); }
  } },
  crater: { bpm: 116, play(a, s, t, spb, I) {
    const bar = Math.floor(s / 16) % 8, st = s % 16, root = 57, prog = [0, 0, 1, -1, 0, 0, 3, 1];
    const ost = [0, 1, 3, 1, 4, 3, 1, 0];
    if (st % 2 === 0) a.koto(deg(IN, root, prog[bar] + ost[(st / 2) % 8]), t, 0.06 + I * 0.03);
    if (st === 0 || st === 6 || st === 10) a.bass(deg(IN, root - 24, prog[bar]), t, spb * 3, 0.15);
    if (st === 0) a.pad([deg(IN, root - 12, prog[bar]), deg(IN, root - 12, prog[bar] + 1)], t, spb * 16, 0.025);
    if (st === 0 || st === 3 || st === 8) a.taiko(t, I > 0.4 ? 0.34 : 0.2, a.mBus, st === 3 ? 1.2 : 0.9);
    if (I > 0.4 && st % 4 === 2) a.shime(t, 0.06);
    const mel = [[5, -1, 6, -1, 8, -1, -1, -1, 6, -1, 5, -1, 3, -1, -1, -1], [8, -1, -1, 9, 10, -1, 9, -1, 8, -1, 6, -1, 5, -1, -1, -1]];
    if (bar >= 4 && I > 0.4) { const m = mel[bar % 2][st]; if (m >= 0) a.flute(deg(IN, root, m), t, spb * 3, 0.05); }
  } },
  boss: { bpm: 132, play(a, s, t, spb, I) {
    const bar = Math.floor(s / 16) % 4, st = s % 16, root = 50, prog = [0, 0, 1, -1];
    if (st % 2 === 0) a.bass(deg(IN, root - 12, prog[bar] + (st % 4 === 0 ? 0 : 3)), t, spb * 1.6, 0.18);
    if ([0, 3, 6, 8, 11, 14].includes(st)) a.taiko(t, 0.42, a.mBus, st % 8 === 0 ? 0.8 : 1.1);
    if (st % 2 === 1) a.shime(t, 0.05 + (I > 1.5 ? 0.04 : 0));
    if (st % 4 === 0) a.koto(deg(IN, root + 12, prog[bar] + [0, 1, 3, 4][st / 4]), t, 0.08);
    if (st === 0) a.pad([deg(IN, root, prog[bar]), deg(IN, root, prog[bar] + 1)], t, spb * 16, 0.035);
    if (I > 1.5 && st % 2 === 0) a.koto(deg(IN, root + 24, (st / 2) % 5), t, 0.05);
  } },
};
