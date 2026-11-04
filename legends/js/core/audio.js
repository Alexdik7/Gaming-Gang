// Synthetischer Sound: Effekte, Kreaturenrufe und komponierte Musik (keine Audiodateien nötig)
import { compiled } from './music.js';
let ctx = null, master = null, musicGain = null, sfxGain = null;
export const audioState = { music: true, sfx: true };

// iPhone: Ton auch bei eingeschaltetem Stummschalter (wie bei Spiele-Apps) und nach Anruf/App-Wechsel wieder aufnehmen
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
const wake = () => { if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume().catch(() => {}); };
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  addEventListener('pointerdown', wake, true); addEventListener('touchend', wake, true); addEventListener('keydown', wake, true);
}

export function initAudio() {
  if (ctx) { if (ctx.state !== 'running') ctx.resume(); return; }
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
    case 'grass': noise(t, 0.09, 0.12, 3200); noise(t + 0.05, 0.07, 0.08, 2400); break;
    case 'shiny': [1568, 2093, 2637, 3136].forEach((f, i) => tone(f, t + i * 0.06, 0.18, { type: 'triangle', vol: 0.1 })); tone(4186, t + 0.3, 0.4, { vol: 0.06 }); break;
    case 'dex': tone(1318, t, 0.07, { type: 'square', vol: 0.08 }); tone(1760, t + 0.09, 0.12, { type: 'square', vol: 0.08 }); break;
    case 'jHeal': [[523, 0, .18], [659, .18, .18], [784, .36, .18], [659, .54, .18], [1046, .72, .5], [784, 1.22, .2], [1046, 1.42, .6]].forEach(([f, d, l]) => { tone(f, t + d, l, { type: 'square', vol: 0.07 }); tone(f / 2, t + d, l, { type: 'triangle', vol: 0.12 }); }); break;
    case 'jCatch': [[784, 0, .14], [784, .15, .14], [784, .3, .14], [1046, .45, .3], [988, .78, .14], [880, .93, .14], [988, 1.08, .14], [1175, 1.23, .5]].forEach(([f, d, l]) => { tone(f, t + d, l, { type: 'square', vol: 0.07 }); tone(f / 2, t + d, l, { type: 'triangle', vol: 0.1 }); }); break;
    case 'evo': for (let i = 0; i < 16; i++) tone(300 + i * 60, t + i * 0.09, 0.15, { type: 'triangle', vol: 0.1 }); break;
  }
}

export function cry(c) {
  if (!ctx || !audioState.sfx || !c) return;
  const t = ctx.currentTime;
  tone(c.f, t, c.len, { type: c.wave, vol: 0.2, f2: c.f2, wob: c.wob, attack: 0.02 });
  tone(c.f * 1.5, t + 0.02, c.len * 0.8, { type: 'sine', vol: 0.06, f2: c.f2 * 1.5 });
}

// ---------------------------------------------------------------- Musik (komponierte Stücke aus music.js)
let mode = null, timer = null, step = 0, nextT = 0;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
export function setMusic(m) {
  if (m === mode) return;
  mode = m; step = 0;
  if (timer) clearInterval(timer), (timer = null);
  if (!ctx || !m || !compiled(m)) return;
  nextT = ctx.currentTime + 0.1;
  timer = setInterval(schedule, 60);
}
export function currentMusic() { return mode; }
const ARP = [0, 1, 2, 3, 2, 1, 0, 1];
// Einen Achtel-Schritt eines Stücks ab Zeitpunkt t spielen
function playStep(T, st, t, beat) {
  const out = musicGain, s = st % 8, bar = Math.floor(st / 8) % T.chords.length, ch = T.chords[bar];
  const fast = T.bpm >= 140;
  // Melodie
  const e = T.lead[st % T.steps];
  if (e) tone(mtof(e.midi), t, beat * e.len * 0.95, { type: T.voice, vol: T.voice === 'square' ? 0.045 : 0.075, out, attack: 0.012, wob: e.len > 2 ? 5 : 0 });
  // Bass
  const root = ch[0] - 12;
  if (T.bass === 'walk' && s % 2 === 0) tone(mtof(s % 4 === 0 ? root : root + 7), t, beat * 1.8, { type: 'triangle', vol: 0.11, out });
  if (T.bass === 'pulse') tone(mtof(root + (s % 2 ? 12 : 0)), t, beat * 0.85, { type: 'triangle', vol: 0.11, out });
  if (T.bass === 'long' && s % 4 === 0) tone(mtof(root), t, beat * 3.8, { type: 'triangle', vol: 0.1, out, attack: 0.05 });
  // Begleitung
  if (T.arp === 'up') { const k = ARP[s], n = k === 3 ? ch[0] + 12 : ch[k]; tone(mtof(n + 12), t, beat * 0.9, { type: fast ? 'square' : 'triangle', vol: fast ? 0.018 : 0.035, out }); }
  if (T.arp === 'block' && s === 0) ch.forEach(n => tone(mtof(n + 12), t, beat * 7.8, { type: 'triangle', vol: 0.03, out, attack: 0.25 }));
  // Schlagzeug
  const d = T.drums;
  if (d === 'rock') { if (s === 0 || s === 4) noise(t, 0.09, 0.16, 110, out); if (s === 2 || s === 6) noise(t, 0.12, 0.11, 1900, out); noise(t, 0.03, 0.04, 7000, out); }
  if (d === 'march') { if (s === 0 || s === 3 || s === 4) noise(t, 0.09, 0.15, 110, out); if (s === 2 || s === 6) noise(t, 0.12, 0.1, 1900, out); if (s === 7) noise(t, 0.06, 0.05, 1900, out); }
  if (d === 'soft' && s % 2 === 0) noise(t, 0.03, s === 0 ? 0.05 : 0.03, 6000, out);
}
function schedule() {
  if (!ctx || !mode) return;
  const T = compiled(mode), beat = 60 / T.bpm / 2;
  while (nextT < ctx.currentTime + 0.25) { playStep(T, step, nextT, beat); step++; nextT += beat; }
}
// Ein Stück offline rendern (für Tests und Hörproben): liefert einen AudioBuffer
export async function renderTrack(name, seconds = 20) {
  const T = compiled(name); if (!T) return null;
  const save = [ctx, musicGain, sfxGain];
  const off = new OfflineAudioContext(1, Math.ceil(44100 * seconds), 44100);
  ctx = off; musicGain = off.createGain(); musicGain.gain.value = 0.32 * 0.7; musicGain.connect(off.destination); sfxGain = musicGain;
  const beat = 60 / T.bpm / 2; let t = 0.05, st = 0;
  while (t < seconds - 0.3) { playStep(T, st, t, beat); st++; t += beat; }
  [ctx, musicGain, sfxGain] = save;
  return off.startRendering();
}
