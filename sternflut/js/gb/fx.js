// Attacken-Effekte: typ-spezifische Partikel (Flammen, Tropfen, Blätter, Splitter, Felsen, Funken …),
// Geschosse, Strahlen, Wirbel und Einschläge. Arbeitet auf der Kampfszene (parts, tween, center).
import { G } from './engine.js';
import { sfx } from '../core/audio.js';

// Stil je Typ: Palette (hell → dunkel), Form, additive Leuchtkraft
export const TS = {
  normal: { pal: ['#ffffff', '#f0ece0', '#c8c0b0'], shape: 'star' },
  feuer: { pal: ['#fff6b0', '#ffd23a', '#ff8a2a', '#e8401a', '#7a2a1a'], shape: 'flame', add: true, smoke: true },
  wasser: { pal: ['#f0faff', '#9ad4ff', '#3d9bff', '#1f6ad0'], shape: 'drop' },
  pflanze: { pal: ['#d8f890', '#7ad850', '#3a9a34', '#246a24'], shape: 'leaf' },
  elektro: { pal: ['#ffffff', '#fff6a0', '#ffd23a'], shape: 'spark', add: true },
  eis: { pal: ['#ffffff', '#e0f8ff', '#8fe8ff', '#58b8e0'], shape: 'shard', add: true },
  drache: { pal: ['#f0e0ff', '#b49aff', '#7a5cff', '#4a2ad0', '#24145a'], shape: 'flame', add: true },
  schatten: { pal: ['#a890d0', '#5b4a7a', '#2e2440', '#120c1c'], shape: 'wisp' },
  licht: { pal: ['#ffffff', '#fffbe0', '#fff3a8', '#ffd860'], shape: 'star', add: true },
  erde: { pal: ['#e8c890', '#c49152', '#8a6030', '#5a3a1a'], shape: 'rock', dust: true },
  luft: { pal: ['#ffffff', '#e0f4ff', '#a8d8f0'], shape: 'wind', add: true },
  gift: { pal: ['#f0c8ff', '#c87ae8', '#9a3ac8', '#5a1a7a'], shape: 'bubble' },
  metall: { pal: ['#ffffff', '#dce4ec', '#9fb0bf', '#5a6878'], shape: 'shard' },
  geist: { pal: ['#e8e0ff', '#b0a4f0', '#8a7dd6', '#4a3a8a'], shape: 'wisp', add: true },
  magie: { pal: ['#ffffff', '#ffd0f0', '#ff7ad9', '#c83aa8'], shape: 'star', add: true },
  astral: { pal: ['#ffffff', '#d8c8ff', '#8a6aff', '#3a2a8a', '#140c3a'], shape: 'star', add: true },
};
const st = t => TS[t] || TS.normal;
const R = (a, b) => a + Math.random() * (b - a);

export function spawn(sc, type, x, y, vx, vy, o = {}) {
  const S = st(type), shape = o.shape || S.shape, life = o.life ?? R(0.35, 0.6);
  sc.parts.push({ x, y, vx, vy, l: life, ml: life, sz: o.sz ?? R(2, 4), c: o.c || S.pal[Math.floor(Math.random() * Math.min(3, S.pal.length))], pal: S.pal, shape, add: o.add ?? S.add, g: o.g ?? ({ drop: 260, rock: 320, leaf: 30, shard: 120 }[shape] || 0), rot: R(0, 6.28), vr: o.vr ?? R(-10, 10), grow: o.grow || 0, drag: o.drag ?? (shape === 'flame' || shape === 'wisp' || shape === 'smoke' ? 1.8 : 0.4) });
}
export function updateParts(parts, dt) {
  for (const p of parts) {
    if (p.shape === undefined) { p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt; continue; }
    const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d; p.vy += p.g * dt;
    if (p.shape === 'flame' || p.shape === 'wisp') p.vy -= 40 * dt; // Aufsteigen
    if (p.shape === 'leaf') p.vx += Math.sin(p.rot * 2) * 40 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.sz += p.grow * dt; p.l -= dt;
  }
}
export function drawParts(ctx, parts) {
  for (const p of parts) {
    const k = Math.max(0, p.l / p.ml), age = 1 - k;
    if (p.shape === undefined) { ctx.globalAlpha = Math.min(1, k * 1.5); ctx.fillStyle = p.c; ctx.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz); continue; }
    ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
    ctx.globalAlpha = Math.min(1, k * 1.6);
    const s = p.sz;
    switch (p.shape) {
      case 'flame': { const i = Math.min(p.pal.length - 1, Math.floor(age * p.pal.length)), r = s * (0.5 + k * 0.8); ctx.fillStyle = p.pal[i]; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill(); if (k > 0.5) { ctx.fillStyle = p.pal[0]; ctx.beginPath(); ctx.arc(p.x, p.y + r * 0.2, r * 0.45, 0, 7); ctx.fill(); } break; }
      case 'smoke': ctx.globalAlpha = k * 0.35; ctx.fillStyle = '#5a5058'; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, 7); ctx.fill(); break;
      case 'drop': { const sp = Math.hypot(p.vx, p.vy) || 1, ax = p.vx / sp, ay = p.vy / sp; ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(p.x, p.y, s * 0.7 + Math.min(4, sp / 60), s * 0.6, Math.atan2(ay, ax), 0, 7); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.fillRect(p.x - ax * s * 0.3, p.y - 1, 1, 1); break; }
      case 'leaf': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(0, 0, s * 1.1, s * 0.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = p.pal[3] || '#246a24'; ctx.fillRect(-s, -0.3, s * 2, 0.7); ctx.restore(); break;
      case 'shard': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.beginPath(); ctx.moveTo(0, -s * 1.4); ctx.lineTo(s * 0.6, 0); ctx.lineTo(0, s * 1.4); ctx.lineTo(-s * 0.6, 0); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.fillRect(-0.5, -s, 1, s * 0.8); ctx.restore(); break;
      case 'rock': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.pal[3]; ctx.fillRect(-s, -s, s * 2, s * 2); ctx.fillStyle = p.pal[1]; ctx.fillRect(-s + 0.5, -s + 0.5, s * 2 - 1.5, s * 2 - 1.5); ctx.fillStyle = p.pal[0]; ctx.fillRect(-s + 0.5, -s + 0.5, s, 1); ctx.restore(); break;
      case 'spark': ctx.strokeStyle = p.c; ctx.lineWidth = Math.max(1, s * 0.5); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke(); break;
      case 'star': { const r = s * (0.6 + k * 0.6); ctx.fillStyle = p.c; ctx.fillRect(p.x - r, p.y - 0.5, r * 2, 1); ctx.fillRect(p.x - 0.5, p.y - r, 1, r * 2); ctx.fillRect(p.x - r * 0.4, p.y - r * 0.4, r * 0.8, r * 0.8); break; }
      case 'wisp': { const r = s * (0.6 + age * 0.9); ctx.fillStyle = p.pal[Math.min(p.pal.length - 1, Math.floor(age * p.pal.length))]; ctx.beginPath(); ctx.arc(p.x + Math.sin(p.rot) * 2, p.y, r, 0, 7); ctx.fill(); break; }
      case 'bubble': ctx.strokeStyle = p.c; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, 7); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(p.x - s * 0.5, p.y - s * 0.5, 1, 1); break;
      case 'wind': ctx.strokeStyle = p.c; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(p.x, p.y, s * 1.8, p.rot, p.rot + 2.2); ctx.stroke(); break;
      case 'ring': ctx.strokeStyle = p.c; ctx.lineWidth = 2 * k + 0.5; ctx.beginPath(); ctx.ellipse(p.x, p.y, s + age * 30, (s + age * 30) * 0.45, 0, 0, 7); ctx.stroke(); break;
      case 'slash': ctx.strokeStyle = p.c; ctx.lineWidth = 2.5 * k + 0.5; ctx.beginPath(); ctx.moveTo(p.x - Math.cos(p.rot) * s, p.y - Math.sin(p.rot) * s); ctx.lineTo(p.x + Math.cos(p.rot) * s, p.y + Math.sin(p.rot) * s); ctx.stroke(); break;
    }
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}

// Einschlag am Ziel – Wucht skaliert mit Effektivität/Volltreffer
export function impactFx(sc, type, x, y, big) {
  const S = st(type), n = big ? 34 : 20;
  for (let i = 0; i < n; i++) { const a = R(0, 6.28), v = R(30, big ? 150 : 100); spawn(sc, type, x, y, Math.cos(a) * v, Math.sin(a) * v * 0.8 - (S.shape === 'flame' ? 30 : 0), { sz: R(1.5, big ? 4.5 : 3.5) }); }
  sc.parts.push({ x, y: y + 6, vx: 0, vy: 0, l: 0.35, ml: 0.35, sz: 4, c: S.pal[1], pal: S.pal, shape: 'ring', add: true, g: 0, rot: 0, vr: 0, grow: 0, drag: 0 });
  if (S.smoke || S.dust) for (let i = 0; i < 8; i++) spawn(sc, type, x + R(-12, 12), y + R(-4, 10), R(-15, 15), R(-30, -10), { shape: 'smoke', sz: R(3, 6), grow: 10, life: R(0.6, 1), add: false });
  if (type === 'wasser') for (let i = 0; i < 10; i++) spawn(sc, type, x + R(-10, 10), y + 10, R(-60, 60), R(-160, -80), { sz: R(1.5, 2.5) });
  if (type === 'eis') for (let i = 0; i < 6; i++) spawn(sc, type, x + R(-16, 16), y + R(-16, 16), 0, 0, { sz: R(3, 5), life: 0.7, vr: 0 });
}

const lerp = (a, b, k) => a + (b - a) * k;
// Geschoss: Kern fliegt im Bogen, Typ-Partikel als Spur
export async function projectile(sc, type, a, t, dur = 0.42, arc = 16, size = 4) {
  const S = st(type);
  await sc.tween(dur, k => {
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, x = lerp(a.x, t.x, e), y = lerp(a.y, t.y, e) - Math.sin(k * Math.PI) * arc;
    for (let i = 0; i < 3; i++) spawn(sc, type, x + R(-2, 2), y + R(-2, 2), R(-15, 15), R(-15, 15), { sz: R(size * 0.5, size), life: R(0.18, 0.35) });
    if (S.shape === 'flame' || S.add) sc.parts.push({ x, y, vx: 0, vy: 0, l: 0.05, ml: 0.05, sz: size + 1, c: S.pal[0], pal: S.pal, shape: 'flame', add: true, g: 0, rot: 0, vr: 0, grow: 0, drag: 0 });
  });
}
// Mehrere Geschosse (Blätter, Splitter, Tropfen, Felsen) hintereinander
export async function volley(sc, type, a, t, n = 6, arc = 22) {
  const L = [];
  for (let i = 0; i < n; i++) {
    const off = R(-10, 10), delay = i * 0.06, rot = R(0, 6);
    L.push(sc.tween(0.38 + delay, k => {
      const q = Math.max(0, (k * (0.38 + delay) - delay) / 0.38); if (q <= 0) return;
      const x = lerp(a.x, t.x + off, q), y = lerp(a.y, t.y + off * 0.5, q) - Math.sin(q * Math.PI) * arc;
      spawn(sc, type, x, y, 0, 0, { life: 0.06, sz: 3.2, g: 0, vr: 0 }); sc.parts[sc.parts.length - 1].rot = rot + q * 12;
    }));
  }
  await Promise.all(L);
}
// Strahl: leuchtender Balken mit pulsierender Breite
export async function beam(sc, type, a, t, dur = 0.55) {
  const S = st(type);
  sc.beamFx = { a, t, pal: S.pal, w: 0 };
  await sc.tween(dur, k => { sc.beamFx.w = Math.sin(Math.min(1, k * 1.4) * Math.PI) * 8 + 1.5; for (let i = 0; i < 2; i++) { const q = Math.random(); spawn(sc, type, lerp(a.x, t.x, q), lerp(a.y, t.y, q), R(-20, 20), R(-20, 20), { sz: R(1.5, 3), life: 0.3 }); } });
  sc.beamFx = null;
}
export function drawBeam(ctx, b) {
  if (!b) return;
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const [w, c, al] of [[b.w * 2.2, b.pal[2] || b.pal[1], 0.35], [b.w * 1.3, b.pal[1], 0.7], [Math.max(1, b.w * 0.5), b.pal[0], 1]]) { ctx.globalAlpha = al; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(b.a.x, b.a.y); ctx.lineTo(b.t.x, b.t.y); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt';
}
// Wirbel um das Ziel (Feuersturm, Strudel, Blättersturm, Blizzard, Sandsturm …)
async function vortex(sc, type, t, dur = 0.85) {
  await sc.tween(dur, k => { for (let i = 0; i < 4; i++) { const an = k * 18 + i * 1.57, r = 30 - k * 12; spawn(sc, type, t.x + Math.cos(an) * r, t.y + 22 - k * 44 + Math.sin(an) * r * 0.35, -Math.sin(an) * 40, -20, { life: 0.35, sz: R(2, 3.5) }); } });
}
// Boden: Risse/Felsen/Fontänen aus dem Boden
async function ground(sc, type, t) {
  for (let r = 0; r < 3; r++) {
    G.shake = 1.2; sfx('hit');
    for (let i = 0; i < 12; i++) spawn(sc, type, t.x + R(-26, 26), t.y + 28, R(-50, 50), R(-200, -90), { shape: type === 'wasser' ? 'drop' : type === 'feuer' ? 'flame' : 'rock', sz: R(2, 4), life: R(0.5, 0.8) });
    for (let i = 0; i < 5; i++) spawn(sc, 'erde', t.x + R(-30, 30), t.y + 30, R(-20, 20), R(-20, -5), { shape: 'smoke', sz: R(3, 5), grow: 8, life: 0.8, add: false });
    await new Promise(r2 => setTimeout(r2, 150));
  }
}

// Hauptfunktion: liefert true, wenn ein Effekt gespielt wurde
export async function moveFx(sc, M, side, a, t, o, dir, hit) {
  const type = M.type, S = st(type);
  switch (M.fx) {
    case 'bolt': {
      sfx('whoosh');
      if (S.shape === 'leaf' || S.shape === 'shard' || S.shape === 'rock' || S.shape === 'drop') await volley(sc, type, a, t, S.shape === 'rock' ? 4 : 7, S.shape === 'rock' ? 34 : 18);
      else if (S.shape === 'wind') { for (let i = 0; i < 3; i++) { projectile(sc, type, a, t, 0.32, 4 + i * 6, 4); await new Promise(r => setTimeout(r, 70)); } await new Promise(r => setTimeout(r, 260)); }
      else await projectile(sc, type, a, t, 0.42, 16, S.shape === 'flame' ? 5 : 4);
      return true;
    }
    case 'beam': sfx('whoosh'); await beam(sc, type, a, t); return true;
    case 'storm': sfx('whoosh'); await vortex(sc, type, t); G.shake = 0.5; return true;
    case 'quake': await ground(sc, type, t); return true;
    case 'zap': {
      for (let i = 0; i < 4; i++) { sc.bolts.push({ a: { x: t.x + R(-6, 6), y: t.y - 70 }, t, c: i % 2 ? '#ffffff' : S.pal[1], l: 0.15 }); sfx('click'); for (let j = 0; j < 6; j++) spawn(sc, 'elektro', t.x, t.y, R(-120, 120), R(-120, 60), { life: 0.25 }); await new Promise(r => setTimeout(r, 70)); }
      return true;
    }
    case 'dash': case 'slash': case 'bite': {
      sfx('whoosh');
      await sc.tween(0.12, k => (o.x = dir * -5 * Math.sin(k * Math.PI))); // ausholen
      await sc.tween(0.14, k => (o.x = dir * 22 * k));
      if (hit) {
        if (M.fx === 'slash') for (let s = 0; s < 3; s++) sc.parts.push({ x: t.x - 6 + s * 6, y: t.y - 2 + s * 2, vx: 0, vy: 0, l: 0.28, ml: 0.28, sz: 16, c: s === 1 ? S.pal[0] : '#ffffff', pal: S.pal, shape: 'slash', add: true, g: 0, rot: -0.9, vr: 0, grow: 0, drag: 0 });
        if (M.fx === 'bite') for (const sy of [-1, 1]) for (let i = 0; i < 5; i++) spawn(sc, 'normal', t.x - 10 + i * 5, t.y + sy * 14, 0, -sy * 90, { shape: 'shard', c: '#ffffff', life: 0.18, sz: 2.5, g: 0, vr: 0 });
        if (type !== 'normal') for (let i = 0; i < 10; i++) spawn(sc, type, t.x + R(-8, 8), t.y + R(-8, 8), R(-60, 60), R(-60, 40));
      }
      await sc.tween(0.2, k => (o.x = dir * 22 * (1 - k)));
      return true;
    }
  }
  return false;
}
