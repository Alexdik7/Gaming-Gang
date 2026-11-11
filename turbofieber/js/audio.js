// Turbofieber – synthetischer Motorsound, Reifenquietschen, Nitro und Aufprall (Web Audio).
export class CarAudio {
  constructor() {
    this.ac = null;
    this.muted = false;
    this.rain = 0;
    try { this.muted = localStorage.getItem('tf.mute') === '1'; } catch (e) { /* ignorieren */ }
  }

  // Erst nach einer Nutzergeste starten (iOS)
  unlock() {
    if (this.muted) return;
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.build(new AC()); } catch (e) { this.ac = null; }
  }

  build(ac) {
    this.ac = ac;
    const master = this.master = ac.createGain();
    master.gain.value = 0.55;
    master.connect(ac.destination);

    // Motor: zwei Sägezähne + Rechteck durch Tiefpass
    this.engGain = ac.createGain();
    this.engGain.gain.value = 0;
    this.engFilter = ac.createBiquadFilter();
    this.engFilter.type = 'lowpass';
    this.engFilter.Q.value = 4;
    this.engFilter.connect(this.engGain);
    this.engGain.connect(master);
    this.osc = [['sawtooth', 1, 0.5], ['sawtooth', 0.5, 0.6], ['square', 2, 0.12]].map(([type, mul, vol]) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; g.gain.value = vol;
      o.connect(g); g.connect(this.engFilter);
      o.start();
      return { o, mul };
    });

    // Rauschen für Reifen und Nitro
    const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    const loop = (type, freq, q) => {
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = buf; s.loop = true;
      f.type = type; f.frequency.value = freq; f.Q.value = q;
      g.gain.value = 0;
      s.connect(f); f.connect(g); g.connect(master);
      s.start();
      return g;
    };
    this.tireGain = loop('bandpass', 1300, 6);
    this.nitroGain = loop('highpass', 2500, 0.7);
    this.windGain = loop('lowpass', 500, 0.5);
    this.rainGain = loop('bandpass', 2600, 0.4);
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('tf.mute', m ? '1' : '0'); } catch (e) { /* ignorieren */ }
    if (this.ac) this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ac.currentTime, 0.05);
    if (!m) this.unlock();
  }

  update(car, active) {
    if (!this.ac) return;
    const t = this.ac.currentTime, on = active ? 1 : 0;
    const f = 28 + car.rpm / 60 * 0.9;          // Grundton aus der Drehzahl
    for (const { o, mul } of this.osc) o.frequency.setTargetAtTime(f * mul, t, 0.03);
    this.engFilter.frequency.setTargetAtTime(300 + car.throttle * 1700 + car.rpm * 0.12, t, 0.05);
    this.engGain.gain.setTargetAtTime(on * (0.16 + car.throttle * 0.16), t, 0.06);
    const skid = Math.min(1, Math.max(0, car.slip - 3) / 9) + (car.braking && car.speed > 8 ? 0.4 : 0);
    this.tireGain.gain.setTargetAtTime(on * Math.min(0.5, skid * 0.45), t, 0.05);
    this.nitroGain.gain.setTargetAtTime(on * (car.nitroOn ? 0.22 : 0), t, 0.08);
    this.windGain.gain.setTargetAtTime(on * Math.min(0.25, car.speed / 300), t, 0.2);
    this.rainGain.gain.setTargetAtTime(on * this.rain * 0.16, t, 0.3);
  }

  // Kurzer Ton beim Hochschalten und dumpfer Schlag bei Aufprall
  shift() {
    if (!this.ac || this.muted) return;
    const t = this.ac.currentTime;
    this.engGain.gain.cancelScheduledValues(t);
    this.engGain.gain.setValueAtTime(0.08, t);
  }
  hit(power) {
    if (!this.ac || this.muted || power < 2) return;
    const ac = this.ac, t = ac.currentTime;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = this.noiseBuf;
    f.type = 'lowpass'; f.frequency.value = 500;
    g.gain.setValueAtTime(Math.min(0.9, power / 15), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t); s.stop(t + 0.45);
  }
  // Menü-Töne: tick, buy, no
  ui(kind) {
    if (!this.ac || this.muted) return;
    const ac = this.ac, t = ac.currentTime;
    const notes = kind === 'buy' ? [880, 1320] : kind === 'no' ? [180, 140] : [1500];
    notes.forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = kind === 'no' ? 'square' : 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.08);
      g.gain.exponentialRampToValueAtTime(kind === 'tick' ? 0.06 : 0.14, t + i * 0.08 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.08 + 0.14);
      o.connect(g); g.connect(this.master);
      o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.16);
    });
  }
  // Donner: tiefes, langes Grollen
  thunder() {
    if (!this.ac || this.muted) return;
    const ac = this.ac, t = ac.currentTime;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = this.noiseBuf;
    f.type = 'lowpass'; f.frequency.value = 140;
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.6);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t); s.stop(t + 2.7);
  }
  suspend() { if (this.ac && this.ac.state === 'running') this.ac.suspend(); }
}
