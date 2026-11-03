// Synthetischer Sound: Effekte, Kreaturenrufe, prozedurale Musik (keine Audiodateien nötig)
let ctx = null, master = null, musicGain = null, sfxGain = null;
export const audioState = { music: true, sfx: true };

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = audioState.music ? 0.32 : 0; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = audioState.sfx ? 0.8 : 0; sfxGain.connect(master);
  } catch (e) { ctx = null; }
}
export function setAudio(kind, on) {
  audioState[kind] = on;
  if (!ctx) return;
  if (kind === 'music') musicGain.gain.setTargetAtTime(on ? 0.32 : 0, ctx.currentTime, 0.2);
  if (kind === 'sfx') sfxGain.gain.value = on ? 0.8 : 0;
}

function tone(f, t0, dur, { type = 'sine', vol = 0.3, f2 = null, out = sfxGain, attack = 0.01, wob = 0 } = {}) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
  if (wob) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = wob; lg.gain.value = f * 0.06; l.connect(lg); lg.connect(o.frequency); l.start(t0); l.stop(t0 + dur + 0.05); }
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.05);
}
function noise(t0, dur, vol = 0.3, freq = 1200, out = sfxGain) {
  if (!ctx) return;
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = ctx.createBufferSource(); s.buffer = b;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  const g = ctx.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(out); s.start(t0);
}

export function sfx(name) {
  if (!ctx || !audioState.sfx) return;
  const t = ctx.currentTime;
  switch (name) {
    case 'click': tone(880, t, 0.06, { type: 'triangle', vol: 0.15 }); break;
    case 'open': tone(520, t, 0.08, { type: 'triangle', vol: 0.15 }); tone(780, t + 0.06, 0.1, { type: 'triangle', vol: 0.15 }); break;
    case 'hit': noise(t, 0.18, 0.5, 900); tone(160, t, 0.15, { type: 'square', vol: 0.18, f2: 60 }); break;
    case 'super': noise(t, 0.35, 0.7, 1500); tone(220, t, 0.3, { type: 'sawtooth', vol: 0.22, f2: 50 }); tone(880, t + 0.05, 0.2, { vol: 0.15, f2: 1760 }); break;
    case 'weak': noise(t, 0.12, 0.25, 600); break;
    case 'whoosh': noise(t, 0.3, 0.35, 2400); break;
    case 'heal': [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.08, 0.25, { vol: 0.14 })); break;
    case 'buff': tone(400, t, 0.3, { type: 'triangle', vol: 0.15, f2: 900 }); break;
    case 'debuff': tone(700, t, 0.3, { type: 'triangle', vol: 0.15, f2: 250 }); break;
    case 'throw': tone(300, t, 0.35, { type: 'sine', vol: 0.15, f2: 1200 }); break;
    case 'wobble': tone(240, t, 0.12, { type: 'square', vol: 0.1 }); tone(200, t + 0.12, 0.12, { type: 'square', vol: 0.1 }); break;
    case 'caught': [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.1, 0.3, { type: 'triangle', vol: 0.18 })); break;
    case 'faint': tone(500, t, 0.6, { type: 'sawtooth', vol: 0.12, f2: 80 }); break;
    case 'lvl': [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, t + i * 0.07, 0.2, { type: 'square', vol: 0.09 })); break;
    case 'encounter': for (let i = 0; i < 6; i++) tone(i % 2 ? 660 : 880, t + i * 0.06, 0.06, { type: 'square', vol: 0.12 }); break;
    case 'rune': [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.13, 0.9, { vol: 0.12 })); break;
    case 'step': noise(t, 0.05, 0.05, 400); break;
    case 'evo': for (let i = 0; i < 16; i++) tone(300 + i * 60, t + i * 0.09, 0.15, { type: 'triangle', vol: 0.1 }); break;
  }
}

export function cry(c) {
  if (!ctx || !audioState.sfx || !c) return;
  const t = ctx.currentTime;
  tone(c.f, t, c.len, { type: c.wave, vol: 0.2, f2: c.f2, wob: c.wob, attack: 0.02 });
  tone(c.f * 1.5, t + 0.02, c.len * 0.8, { type: 'sine', vol: 0.06, f2: c.f2 * 1.5 });
}

// ---------------------------------------------------------------- Musik
const SCALES = {
  day: { root: 60, scale: [0, 2, 4, 7, 9], bpm: 84, chords: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]] },
  night: { root: 57, scale: [0, 3, 5, 7, 10], bpm: 64, chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]] },
  battle: { root: 57, scale: [0, 2, 3, 7, 8], bpm: 150, chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]] },
  legend: { root: 50, scale: [0, 2, 5, 7, 9], bpm: 100, chords: [[0, 5, 9], [-2, 2, 5], [-5, 0, 4], [-7, -3, 0]] },
};
let mode = null, timer = null, step = 0, nextT = 0;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
export function setMusic(m) {
  if (m === mode) return;
  mode = m; step = 0;
  if (timer) clearInterval(timer), (timer = null);
  if (!ctx || !m) return;
  nextT = ctx.currentTime + 0.1;
  timer = setInterval(schedule, 60);
}
function schedule() {
  if (!ctx || !mode) return;
  const S = SCALES[mode], beat = 60 / S.bpm / 2;
  while (nextT < ctx.currentTime + 0.25) {
    const bar = Math.floor(step / 16) % 4, s = step % 16, ch = S.chords[bar];
    if (s === 0) ch.forEach(n => tone(mtof(S.root + n - 12), nextT, beat * 15, { type: 'triangle', vol: mode === 'battle' ? 0.05 : 0.07, out: musicGain, attack: 0.3 }));
    if (mode === 'battle') {
      tone(mtof(S.root + ch[0] - 24 + (s % 4 === 2 ? 12 : 0)), nextT, beat * 0.9, { type: 'sawtooth', vol: 0.06, out: musicGain });
      if (s % 4 === 0) noise(nextT, 0.08, 0.12, 120, musicGain);
      if (s % 8 === 4) noise(nextT, 0.1, 0.1, 2500, musicGain);
    } else if (s % 4 === 0) tone(mtof(S.root + ch[0] - 24), nextT, beat * 3.5, { type: 'sine', vol: 0.08, out: musicGain });
    const r = Math.sin(step * 12.9898 + bar * 78.233) * 43758.5453 % 1;
    const play = mode === 'battle' ? s % 2 === 0 : (s % 2 === 0 && Math.abs(r) > 0.35);
    if (play) {
      const deg = Math.floor(Math.abs(r) * 100) % S.scale.length, oct = Math.abs(r * 7) % 1 > 0.7 ? 12 : 0;
      tone(mtof(S.root + S.scale[deg] + oct + 12), nextT, beat * (mode === 'battle' ? 1.6 : 2.5), { type: mode === 'night' ? 'sine' : 'triangle', vol: 0.06, out: musicGain, attack: 0.02 });
    }
    step++; nextT += beat;
  }
}
