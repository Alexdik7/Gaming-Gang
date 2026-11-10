// Signatur-Animationen: jede Attacke hat ihren eigenen Ablauf (Ausholen → Wirkung → Einschlag).
// Baut auf den Partikeln aus fx.js auf und ergänzt Bühnen-Effekte (Farbschleier, Säulen, Wellen, Ranken, Kiefer …).
// Szene braucht: parts, tween(dur, fn), bolts, beamFx; neu: ov (Liste von Zeichen-Objekten).
import { G } from './engine.js';
import { sfx } from '../core/audio.js';
import { TS, spawn, impactFx, beam, projectile, volley } from './fx.js';

const R = (a, b) => a + Math.random() * (b - a), lerp = (a, b, k) => a + (b - a) * k;
const pal = t => (TS[t] || TS.normal).pal;
const wait = ms => new Promise(r => setTimeout(r, ms));
const BH = 114; // Höhe des Kampfbilds

// ---------------------------------------------------------------- Bühnen-Objekte
function ov(sc, dur, draw, add = false) { return new Promise(res => (sc.ov ||= []).push({ t: 0, dur, draw, add, res })); }
export function tickOv(sc, dt) { if (!sc.ov) return; for (const o of sc.ov) o.t += dt; sc.ov = sc.ov.filter(o => { if (o.t < o.dur) return true; o.res(); return false; }); }
export function drawOv(ctx, sc) {
  if (!sc.ov?.length) return;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 240, BH); ctx.clip();
  for (const o of sc.ov) { ctx.globalCompositeOperation = o.add ? 'lighter' : 'source-over'; ctx.globalAlpha = 1; o.draw(ctx, Math.min(1, o.t / o.dur)); }
  ctx.restore(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}
const bell = k => Math.sin(Math.min(1, k) * Math.PI);
const tint = (sc, c, a = 0.4, dur = 0.6) => ov(sc, dur, (ctx, k) => { ctx.globalAlpha = a * bell(k); ctx.fillStyle = c; ctx.fillRect(0, 0, 240, BH); });
const flash = (sc, c = '#ffffff', dur = 0.16) => ov(sc, dur, (ctx, k) => { ctx.globalAlpha = 0.85 * (1 - k); ctx.fillStyle = c; ctx.fillRect(0, 0, 240, BH); });
function glowDot(ctx, x, y, r, P) { ctx.fillStyle = P[2] || P[1]; ctx.globalAlpha *= 0.35; ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, 7); ctx.fill(); ctx.globalAlpha /= 0.35; ctx.fillStyle = P[1]; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.fillStyle = P[0]; ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.5, 0, 7); ctx.fill(); }

// ---------------------------------------------------------------- Bausteine
// Energie sammeln: Partikel strömen zusammen, Kern wächst
async function charge(sc, type, p, dur = 0.45, r0 = 34) {
  sfx('buff'); const P = pal(type);
  const o = ov(sc, dur, (ctx, k) => glowDot(ctx, p.x, p.y, 1 + k * 6, P), true);
  await sc.tween(dur, k => { for (let i = 0; i < 2; i++) { const an = R(0, 6.28), r = r0 * (1 - k * 0.4); spawn(sc, type, p.x + Math.cos(an) * r, p.y + Math.sin(an) * r, -Math.cos(an) * r * 3, -Math.sin(an) * r * 3, { life: 0.3, sz: R(1.5, 3), g: 0 }); } });
  await o;
}
// Großes leuchtendes Geschoss
async function orb(sc, type, a, t, { dur = 0.5, arc = 14, r = 6, wobble = 0 } = {}) {
  const P = pal(type); let x = a.x, y = a.y;
  const o = ov(sc, dur, ctx => glowDot(ctx, x, y, r * (0.85 + Math.sin(G.t * 30) * 0.15), P), true);
  sfx('whoosh');
  await sc.tween(dur, k => { const e = k * k * (3 - 2 * k); x = lerp(a.x, t.x, e) + Math.sin(k * 18) * wobble; y = lerp(a.y, t.y, e) - Math.sin(k * Math.PI) * arc; for (let i = 0; i < 2; i++) spawn(sc, type, x + R(-r, r), y + R(-r, r), R(-20, 20), R(-20, 20), { life: R(0.2, 0.4), sz: R(1.5, 3) }); });
  await o;
}
// Säule von oben (Sonnenstrahl, Blitz, Mondlicht)
const pillar = (sc, type, p, dur = 0.6, w = 12) => { const P = pal(type); return ov(sc, dur, (ctx, k) => { const e = bell(k), ww = w * e; for (const [m, c, al] of [[1.8, P[2] || P[1], 0.35], [1, P[1], 0.7], [0.4, P[0], 1]]) { ctx.globalAlpha = al * e; ctx.fillStyle = c; ctx.fillRect(p.x - ww * m / 2, 0, ww * m, p.y + 26); } }, true); };
// Regen von oben auf das Ziel (Felsen, Eiszapfen, Sterne, Blätter)
async function rain(sc, type, t, { n = 10, shape, spread = 30, gap = 45, sz = [2.5, 4] } = {}) {
  for (let i = 0; i < n; i++) { const x = t.x + R(-spread, spread); spawn(sc, type, x + R(-20, 20), -6, R(-20, 20), R(240, 320), { shape, life: (t.y + 10) / 280, sz: R(...sz), g: 120 }); if (i % 3 === 2) sfx('click'); await wait(gap); }
  await wait(260);
}
// Stacheln brechen aus dem Boden
const spikes = (sc, type, t, { n = 5, h = 26, w = 6, dur = 0.7 } = {}) => {
  const P = pal(type), L = Array.from({ length: n }, (_, i) => ({ x: t.x + (i - (n - 1) / 2) * (w * 1.4) + R(-2, 2), h: h * R(0.6, 1.1), d: R(0, 0.25) })); sfx('hit'); G.shake = 0.8;
  return ov(sc, dur, (ctx, k) => { const gy = t.y + 26; for (const s of L) { const q = Math.max(0, Math.min(1, (k - s.d) * 4)) * (k > 0.75 ? (1 - k) * 4 : 1), hh = s.h * q; if (hh <= 0) continue; ctx.fillStyle = P[3] || P[2]; ctx.beginPath(); ctx.moveTo(s.x - w / 2, gy); ctx.lineTo(s.x, gy - hh); ctx.lineTo(s.x + w / 2, gy); ctx.fill(); ctx.fillStyle = P[1]; ctx.beginPath(); ctx.moveTo(s.x - w / 4, gy); ctx.lineTo(s.x, gy - hh); ctx.lineTo(s.x + 0.5, gy); ctx.fill(); } });
};
// Welle rollt vom Angreifer zum Ziel
const wave = (sc, type, a, t, dur = 0.8, hgt = 34) => {
  const P = pal(type); sfx('whoosh');
  return ov(sc, dur, (ctx, k) => {
    const fx = lerp(a.x - 40 * Math.sign(t.x - a.x), t.x + 30 * Math.sign(t.x - a.x), k), gy = Math.min(BH + 2, Math.max(a.y, t.y) + 30), dirn = Math.sign(t.x - a.x) || 1;
    for (const [c, s, al] of [[P[3] || P[2], 1, 0.9], [P[2], 0.75, 0.9], [P[1], 0.45, 1]]) {
      ctx.globalAlpha = al * (k > 0.85 ? (1 - k) / 0.15 : 1); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(fx - dirn * 120, gy);
      for (let i = 0; i <= 24; i++) { const x = fx - dirn * 120 + dirn * i * 5, q = i / 24, y = gy - hgt * s * Math.pow(q, 2.2) * (0.9 + Math.sin(G.t * 9 + i) * 0.05); ctx.lineTo(x, y); }
      ctx.lineTo(fx + dirn * 4, gy - hgt * s * 0.7); ctx.lineTo(fx, gy); ctx.fill();
    }
    if (Math.random() < 0.7) spawn(sc, type, fx, gy - hgt * 0.95, R(-30, 30) + dirn * 40, R(-60, -20), { shape: 'drop', life: 0.4, sz: R(1.5, 2.5) });
  });
};
// Ranken/Peitschen wachsen vom Angreifer zum Ziel
const vines = (sc, a, t, { n = 3, col = '#3a9a34', light = '#7ad850', dur = 0.65, lash = true } = {}) => {
  const L = Array.from({ length: n }, (_, i) => ({ off: (i - (n - 1) / 2) * 10, ph: R(0, 6) })); sfx('whoosh');
  return ov(sc, dur, (ctx, k) => {
    const g = Math.min(1, k * 1.8), out = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    for (const v of L) {
      ctx.lineCap = 'round'; const pts = []; for (let i = 0; i <= 14; i++) { const q = i / 14 * g, x = lerp(a.x, t.x, q), y = lerp(a.y + v.off * 0.3, t.y + v.off, q) - Math.sin(q * Math.PI) * 18 + Math.sin(q * 9 + v.ph + G.t * (lash ? 14 : 5)) * 5 * q; pts.push([x, y]); }
      for (const [w, c] of [[3.2, col], [1.2, light]]) { ctx.globalAlpha = out; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
      const [ex, ey] = pts[pts.length - 1]; ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(ex, ey, 3.5, 1.8, 0.6, 0, 7); ctx.fill();
    }
    ctx.lineCap = 'butt';
  });
};
// Krallen/Schnitte: n parallele Hiebe nacheinander, optional als Kreuz
async function claws(sc, t, col, { n = 3, cross = false, len = 18, rot = -0.85, white = true } = {}) {
  for (let pass = 0; pass < (cross ? 2 : 1); pass++) {
    const r = pass ? -rot : rot; sfx('whoosh');
    for (let s = 0; s < n; s++) sc.parts.push({ x: t.x - 8 + s * 7 * (pass ? -1 : 1) + (pass ? 14 : 0), y: t.y - 2 + s * 2, vx: 0, vy: 0, l: 0.3, ml: 0.3, sz: len, c: s === 1 && white ? '#ffffff' : col, pal: [col], shape: 'slash', add: true, g: 0, rot: r, vr: 0, grow: 6, drag: 0 });
    await wait(110);
  }
}
// Kiefer schnappen zu
const fangs = (sc, t, col = '#ffffff', dark = '#3a2030', dur = 0.42) => ov(sc, dur, (ctx, k) => {
  const c = k < 0.55 ? 1 - Math.pow(k / 0.55, 2) : 0, gap = 4 + c * 16, al = k > 0.8 ? (1 - k) * 5 : 1; ctx.globalAlpha = al;
  for (const s of [-1, 1]) { const y0 = t.y + s * gap; ctx.strokeStyle = dark; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(t.x, y0 + s * 14, 22, s < 0 ? 0.35 : Math.PI + 0.35, s < 0 ? Math.PI - 0.35 : 2 * Math.PI - 0.35); ctx.stroke(); for (let i = 0; i < 5; i++) { const x = t.x - 17 + i * 7, yy = y0 + s * (Math.abs(i - 2) * 1.6); ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + 3.5, yy - s * (i === 0 || i === 4 ? 11 : 7)); ctx.lineTo(x + 7, yy); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.stroke(); } }
  if (k > 0.5 && k < 0.6) { G.shake = 0.6; }
});
// Ringe breiten sich aus
async function rings(sc, p, col, { n = 3, gap = 90, big = 1 } = {}) { for (let i = 0; i < n; i++) { sc.parts.push({ x: p.x, y: p.y, vx: 0, vy: 0, l: 0.45, ml: 0.45, sz: 4 * big, c: col, pal: [col], shape: 'ring', add: true, g: 0, rot: 0, vr: 0, grow: 20 * big, drag: 0 }); await wait(gap); } }
// Wirbelsäule am Ziel (Tornado)
async function tornado(sc, type, t, dur = 0.85, wide = 26) {
  sfx('whoosh');
  await sc.tween(dur, k => { for (let i = 0; i < 5; i++) { const h = R(0, 1), an = G.t * 14 + h * 8 + i, r = (6 + h * wide) * (0.6 + k * 0.4); spawn(sc, type, t.x + Math.cos(an) * r, t.y + 28 - h * 70 + Math.sin(an) * r * 0.25, -Math.sin(an) * 60, -30, { life: 0.25, sz: R(1.5, 3.5) }); } });
  G.shake = 0.5;
}
// Blitze vom Himmel (mit Verästelung)
async function lightning(sc, t, { n = 4, col = '#fff6a0', top = true, from } = {}) {
  for (let i = 0; i < n; i++) {
    const a = from || { x: t.x + R(-14, 14), y: top ? -4 : t.y - 70 }; sc.bolts.push({ a, t: { x: t.x + R(-6, 6), y: t.y }, c: i % 2 ? '#ffffff' : col, l: 0.16 });
    if (i % 2) sc.bolts.push({ a: { x: lerp(a.x, t.x, 0.5), y: lerp(a.y, t.y, 0.5) }, t: { x: t.x + R(-26, 26), y: t.y + R(0, 20) }, c: col, l: 0.12 });
    sfx('click'); G.shake = 0.5; for (let j = 0; j < 6; j++) spawn(sc, 'elektro', t.x, t.y, R(-120, 120), R(-120, 60), { life: 0.25 }); await wait(75);
  }
}
// Schutzschild (Sechseck) um sich selbst
const shield = (sc, p, col, dur = 0.8) => ov(sc, dur, (ctx, k) => { const r = 14 + bell(Math.min(1, k * 2)) * 4 + k * 8; ctx.globalAlpha = 0.9 * (1 - k); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 6; i++) { const an = i / 6 * 6.28 + G.t; ctx[i ? 'lineTo' : 'moveTo'](p.x + Math.cos(an) * r * 1.3, p.y + Math.sin(an) * r); } ctx.stroke(); ctx.globalAlpha *= 0.25; ctx.fillStyle = col; ctx.fill(); }, true);
// Magiekreis unter dem Ziel
const runeCircle = (sc, p, col, dur = 0.9) => ov(sc, dur, (ctx, k) => { const r = 22 * Math.min(1, k * 3), al = k > 0.75 ? (1 - k) * 4 : 1; ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = 1.2; const y = p.y + 24; ctx.beginPath(); ctx.ellipse(p.x, y, r, r * 0.35, 0, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.ellipse(p.x, y, r * 0.7, r * 0.25, 0, 0, 7); ctx.stroke(); for (let i = 0; i < 5; i++) { const a1 = i / 5 * 6.28 + G.t * 2, a2 = a1 + 2.51; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a1) * r * 0.7, y + Math.sin(a1) * r * 0.25); ctx.lineTo(p.x + Math.cos(a2) * r * 0.7, y + Math.sin(a2) * r * 0.25); ctx.stroke(); } }, true);
// Schallbögen (Knurren, Kreischer)
const soundArcs = (sc, a, t, col, dur = 0.7) => ov(sc, dur, (ctx, k) => { const dx = t.x - a.x, dy = t.y - a.y, ang = Math.atan2(dy, dx); for (let i = 0; i < 4; i++) { const q = (k * 1.4 - i * 0.18); if (q < 0 || q > 1) continue; const x = a.x + dx * q, y = a.y + dy * q, r = 6 + q * 14; ctx.globalAlpha = 1 - q; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, ang - 0.9, ang + 0.9); ctx.stroke(); } });
// Mondsichel über dem Anwender
const moon = (sc, p, dur = 1) => ov(sc, dur, (ctx, k) => { const e = bell(k), y = p.y - 44 + (1 - Math.min(1, k * 2)) * 10; ctx.globalAlpha = e; ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.arc(p.x, y, 9, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(p.x + 4, y - 3, 8, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 * e; ctx.fillStyle = '#c8d8ff'; ctx.fillRect(p.x - 10, y, 20, p.y + 26 - y); });
// Schattenhände aus dem Boden
const hands = (sc, t, col = '#2e2440', dur = 0.8) => ov(sc, dur, (ctx, k) => { const g = Math.min(1, k * 2.2), al = k > 0.75 ? (1 - k) * 4 : 1; ctx.globalAlpha = al; for (const s of [-1, 1]) { const bx = t.x + s * 16, by = t.y + 30, tx = t.x + s * 6, ty = t.y + 30 - 34 * g; ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + s * 8, (by + ty) / 2, tx, ty); ctx.stroke(); for (let f = -1; f <= 1; f++) { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx - s * 4 + f * 3, ty - 6); ctx.stroke(); } } ctx.lineCap = 'butt'; });
// Bewegungen der Kreatur
const lunge = async (sc, o, dir, dist = 22) => { await sc.tween(0.12, k => (o.x = dir * -5 * Math.sin(k * Math.PI))); await sc.tween(0.13, k => (o.x = dir * dist * k)); };
const back = (sc, o, dir, dist = 22) => sc.tween(0.2, k => (o.x = dir * dist * (1 - k)));
const hop = (sc, o, h = 26, dur = 0.4) => sc.tween(dur, k => (o.y = -Math.sin(k * Math.PI) * h));
const wobble = (sc, o, amp = 4, dur = 0.35) => sc.tween(dur, k => (o.x = Math.sin(k * 40) * amp * (1 - k)));
const pulse = (sc, o, amt = 0.12, dur = 0.4) => sc.tween(dur, k => (o.s = 1 + Math.sin(k * Math.PI) * amt)).then(() => (o.s = 1));
const burst = (sc, type, p, n = 24, sp = 110, o = {}) => { for (let i = 0; i < n; i++) { const an = R(0, 6.28), v = R(sp * 0.3, sp); spawn(sc, type, p.x, p.y, Math.cos(an) * v, Math.sin(an) * v * 0.8, o); } };
const rise = async (sc, type, p, dur = 0.7, o = {}) => sc.tween(dur, () => { for (let i = 0; i < 2; i++) spawn(sc, type, p.x + R(-16, 16), p.y + R(0, 24), R(-8, 8), R(-70, -30), { life: 0.6, sz: R(1.5, 3), g: 0, ...o }); });
const cloud = async (sc, type, t, dur = 0.8, c) => { await sc.tween(dur, () => { for (let i = 0; i < 2; i++) spawn(sc, type, t.x + R(-26, 26), t.y + R(-18, 22), R(-12, 12), R(-14, 4), { shape: 'smoke', c, sz: R(4, 7), grow: 6, life: 0.9, add: false }); }); };

// Schwarzes Loch: zieht Partikel und das Ziel in sich
async function blackhole(sc, t, dur = 1, to) {
  const o = ov(sc, dur, (ctx, k) => { const r = 4 + bell(k) * 18; ctx.globalAlpha = 0.9 * bell(k); ctx.fillStyle = '#8a6aff'; ctx.beginPath(); ctx.arc(t.x, t.y, r + 3, 0, 7); ctx.fill(); ctx.fillStyle = '#05030c'; ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, 7); ctx.fill(); });
  await sc.tween(dur, k => { for (let i = 0; i < 3; i++) { const an = R(0, 6.28), r = R(30, 50); spawn(sc, 'astral', t.x + Math.cos(an) * r, t.y + Math.sin(an) * r, -Math.cos(an) * r * 2.4, -Math.sin(an) * r * 2.4, { life: 0.4, g: 0, sz: R(1, 2.5) }); } if (to) to.x = Math.sin(k * 50) * 2 * bell(k); });
  await o; G.shake = 1.2;
}
// Helle Explosion, die das Bild füllt
const nova = (sc, p, col = '#ffffff', dur = 0.7, big = 1) => ov(sc, dur, (ctx, k) => { ctx.globalAlpha = 1 - k; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, 6 + k * 140 * big, 0, 7); ctx.fill(); }, true);
// Regenbogen als Bogen zum Ziel
const rainbow = (sc, a, t, dur = 0.9) => ov(sc, dur, (ctx, k) => { const g = Math.min(1, k * 2), al = k > 0.7 ? (1 - k) / 0.3 : 1; ['#ff5a5a', '#ffa53a', '#ffe14a', '#5ad85a', '#4ab0ff', '#9a6aff'].forEach((c, i) => { ctx.globalAlpha = al; ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); for (let j = 0; j <= 20 * g; j++) { const q = j / 20, x = lerp(a.x, t.x, q), y = lerp(a.y, t.y, q) - Math.sin(q * Math.PI) * (40 - i * 2.5) + i * 2; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }); }, true);
// Nordlicht-Vorhänge am Himmel
const aurora = (sc, dur = 1) => ov(sc, dur, (ctx, k) => { const e = bell(k); for (let i = 0; i < 40; i++) { const x = i * 6, h = 30 + Math.sin(i * 0.5 + G.t * 3) * 12; ctx.globalAlpha = 0.35 * e; ctx.fillStyle = i % 3 ? '#5affb0' : '#8fe8ff'; ctx.fillRect(x, 4 + Math.sin(i * 0.3 + G.t * 2) * 6, 5, h); } }, true);
// Meteor aus der Ecke
const meteor = (sc, type, t, r = 7, dur = 0.5) => orb(sc, type, { x: t.x - 110, y: -24 }, t, { dur, arc: 0, r });
// Typ-Hieb mit Vorstoß (für viele Nahkampf-Attacken)
const strike = (n = 3, len = 20, cross = false, dist = 18) => async (sc, x, type, col) => { await lunge(sc, x.o, x.dir, dist); await claws(sc, x.t, col || pal(type)[1], { n, len, cross }); if (x.hit) burst(sc, type, x.t, 16, 100); await back(sc, x.o, x.dir, dist); };
const ram = (dist = 60, trail) => async (sc, x, type) => { await charge(sc, type, x.a, 0.2, 24); sfx('whoosh'); await sc.tween(0.15, k => { x.o.x = x.dir * dist * k; for (let i = 0; i < 2; i++) spawn(sc, type, x.a.x + x.o.x - x.dir * R(0, 16), x.a.y + R(-10, 10), -x.dir * 60, 0, { life: 0.25, shape: trail }); }); if (x.hit) { G.shake = 1.1; await rings(sc, x.t, pal(type)[1], { n: 1 }); burst(sc, type, x.t, 20, 130); } await back(sc, x.o, x.dir, dist); };

// ---------------------------------------------------------------- Die Attacken
// x: { a, t, o (Angreifer-Versatz), to (Ziel-Versatz), dir, hit }
const A = {
  rempler: async (sc, x) => { await lunge(sc, x.o, x.dir, 26); if (x.hit) { burst(sc, 'normal', x.t, 12, 90, { shape: 'star' }); wobble(sc, x.to); } await back(sc, x.o, x.dir, 26); },
  zerschneider: async (sc, x) => { await lunge(sc, x.o, x.dir, 14); await claws(sc, x.t, '#ffffff', { n: 1, len: 28, cross: true }); await back(sc, x.o, x.dir, 14); },
  kratzer: async (sc, x) => { await lunge(sc, x.o, x.dir, 12); await claws(sc, x.t, '#ffffff', { n: 3, len: 14 }); await back(sc, x.o, x.dir, 12); },
  zertruemmerer: async (sc, x) => { await hop(sc, x.o, 30, 0.35); G.shake = 1.4; sfx('hit'); await Promise.all([spikes(sc, 'erde', x.t, { n: 4, h: 18 }), rings(sc, { x: x.t.x, y: x.t.y + 24 }, '#c49152', { n: 2 })]); },
  surfer: async (sc, x) => { await hop(sc, x.o, 14, 0.3); await wave(sc, 'wasser', x.a, x.t, 0.9, 44); burst(sc, 'wasser', x.t, 26, 120, { shape: 'drop' }); },
  blitz: async (sc, x) => { await charge(sc, 'licht', x.a, 0.35); await flash(sc, '#ffffff', 0.35); },
  fliegen: async (sc, x) => { sfx('whoosh'); await sc.tween(0.3, k => (x.o.y = -k * 140)); await wait(250); sfx('whoosh'); x.o.x = x.dir * 60; await sc.tween(0.18, k => (x.o.y = -140 * (1 - k))); if (x.hit) { G.shake = 1; burst(sc, 'luft', x.t, 20, 120); } await back(sc, x.o, x.dir, 60); },
  sturzflug: async (sc, x) => { await sc.tween(0.25, k => (x.o.y = -k * 60)); sfx('whoosh'); await sc.tween(0.16, k => { x.o.x = x.dir * 70 * k; x.o.y = -60 + 60 * k; spawn(sc, 'luft', x.a.x + x.o.x, x.a.y + x.o.y, 0, 0, { life: 0.3 }); }); if (x.hit) { G.shake = 0.9; burst(sc, 'luft', x.t, 16); } await back(sc, x.o, x.dir, 70); },
  fluegelschlag: async (sc, x) => { for (let i = 0; i < 2; i++) { await pulse(sc, x.o, 0.1, 0.18); } await projectile(sc, 'luft', x.a, x.t, 0.3, 4, 5); await claws(sc, x.t, '#e0f4ff', { n: 2, len: 22, rot: -0.3 }); },
  sprungtritt: async (sc, x) => { sfx('whoosh'); await sc.tween(0.35, k => { x.o.x = x.dir * 60 * k; x.o.y = -Math.sin(k * Math.PI) * 50; }); if (x.hit) { G.shake = 1; burst(sc, 'normal', x.t, 14, 110, { shape: 'star' }); await rings(sc, x.t, '#ffffff', { n: 1 }); } await back(sc, x.o, x.dir, 60); },
  knurren: async (sc, x) => { await Promise.all([wobble(sc, x.o, 3, 0.5), soundArcs(sc, x.a, x.t, '#c8c0b0')]); },
  kreischer: async (sc, x) => { await Promise.all([pulse(sc, x.o, 0.15, 0.5), soundArcs(sc, x.a, x.t, '#ff7ad9', 0.6), tint(sc, '#ff7ad9', 0.18, 0.6)]); wobble(sc, x.to, 4); },
  panzern: async (sc, x) => { await Promise.all([shield(sc, x.a, '#dce4ec'), pulse(sc, x.o, 0.08, 0.4)]); },
  glutfunke: async (sc, x) => { for (let i = 0; i < 3; i++) { projectile(sc, 'feuer', x.a, { x: x.t.x + R(-8, 8), y: x.t.y + R(-6, 6) }, 0.34, 10 + i * 6, 3.5); await wait(90); } await wait(320); },
  flammenbiss: async (sc, x) => { await lunge(sc, x.o, x.dir, 16); await fangs(sc, x.t, '#fff6b0', '#7a2a1a'); if (x.hit) burst(sc, 'feuer', x.t, 22, 90); await back(sc, x.o, x.dir, 16); },
  feuerwirbel: async (sc, x) => { await charge(sc, 'feuer', x.a, 0.3); await Promise.all([tornado(sc, 'feuer', x.t, 0.9, 30), tint(sc, '#ff6a2a', 0.18, 0.9)]); },
  wasserstrahl: async (sc, x) => { sfx('whoosh'); await beam(sc, 'wasser', x.a, x.t, 0.5); burst(sc, 'wasser', x.t, 16, 90, { shape: 'drop' }); },
  blasenwirbel: async (sc, x) => { for (let i = 0; i < 6; i++) { orb(sc, 'gift', x.a, { x: x.t.x + R(-12, 12), y: x.t.y + R(-10, 10) }, { dur: 0.6, arc: R(4, 20), r: R(2.5, 4), wobble: 4 }).then(() => { spawn(sc, 'wasser', x.t.x + R(-10, 10), x.t.y + R(-8, 8), 0, 0, { shape: 'ring', life: 0.25, sz: 2, grow: 30 }); sfx('click'); }); await wait(70); } await wait(560); },
  flutwelle: async (sc, x) => { await tint(sc, '#1f6ad0', 0.15, 0.25); await Promise.all([wave(sc, 'wasser', x.a, x.t, 1.0, 56), tint(sc, '#1f6ad0', 0.22, 1)]); G.shake = 1.2; },
  aquahieb: async (sc, x) => { await lunge(sc, x.o, x.dir, 16); await claws(sc, x.t, '#9ad4ff', { n: 2, len: 22, cross: true }); if (x.hit) burst(sc, 'wasser', x.t, 18, 110, { shape: 'drop' }); await back(sc, x.o, x.dir, 16); },
  rankenhieb: async (sc, x) => { await vines(sc, x.a, x.t, { n: 2, dur: 0.55 }); if (x.hit) { G.shake = 0.5; await claws(sc, x.t, '#7ad850', { n: 1, len: 26 }); } },
  blattsturm: async (sc, x) => { await volley(sc, 'pflanze', x.a, x.t, 8, 20); await tornado(sc, 'pflanze', x.t, 0.6, 24); },
  wurzelkraft: async (sc, x) => { await Promise.all([vines(sc, { x: x.a.x - 20, y: x.a.y + 30 }, { x: x.a.x, y: x.a.y }, { n: 3, lash: false, dur: 0.7 }), rise(sc, 'pflanze', x.a, 0.8, { shape: 'leaf' })]); sfx('heal'); await rise(sc, 'licht', x.a, 0.4); },
  dornenwall: async (sc, x) => { await charge(sc, 'pflanze', x.a, 0.3); await Promise.all([spikes(sc, 'pflanze', x.t, { n: 7, h: 34, w: 5 }), vines(sc, { x: x.t.x - 30, y: x.t.y + 30 }, x.t, { n: 2, dur: 0.6 })]); },
  urwaldzorn: async (sc, x) => { await Promise.all([tint(sc, '#246a24', 0.3, 1.3), (async () => { await charge(sc, 'pflanze', x.a, 0.35); await vines(sc, x.a, x.t, { n: 4, dur: 0.6 }); await spikes(sc, 'pflanze', x.t, { n: 6, h: 32 }); })()]); burst(sc, 'pflanze', x.t, 26, 130, { shape: 'leaf' }); },
  windstoss: async (sc, x) => { for (let i = 0; i < 3; i++) { projectile(sc, 'luft', x.a, x.t, 0.3, 2 + i * 7, 4); await wait(70); } await wait(260); await wobble(sc, x.to, 5, 0.3); },
  orkan: async (sc, x) => { await Promise.all([tornado(sc, 'luft', x.t, 1.0, 36), tint(sc, '#a8d8f0', 0.25, 1), sc.tween(1, k => (x.to.x = Math.sin(k * 30) * 3))]); x.to.x = 0; },
  funkenschlag: async (sc, x) => { await charge(sc, 'elektro', x.a, 0.25); await lightning(sc, x.t, { n: 3, from: x.a }); },
  donnerflug: async (sc, x) => { sfx('whoosh'); await sc.tween(0.2, k => (x.o.y = -k * 30)); await sc.tween(0.15, k => { x.o.x = x.dir * 70 * k; spawn(sc, 'elektro', x.a.x + x.o.x, x.a.y + x.o.y, R(-30, 30), R(-30, 30), { life: 0.25 }); }); await lightning(sc, x.t, { n: 2, top: false }); await sc.tween(0.2, k => { x.o.x = x.dir * 70 * (1 - k); x.o.y = -30 * (1 - k); }); },
  blitzschlag: async (sc, x) => { await tint(sc, '#1a1a3a', 0.5, 0.3); await Promise.all([pillar(sc, 'elektro', x.t, 0.45, 10), lightning(sc, x.t, { n: 5 }), flash(sc, '#fff6a0', 0.3)]); G.shake = 1.4; },
  funkensprung: async (sc, x) => { await lunge(sc, x.o, x.dir, 20); if (x.hit) { await lightning(sc, x.t, { n: 2, top: false }); burst(sc, 'elektro', x.t, 16); } await back(sc, x.o, x.dir, 20); },
  sporenwolke: async (sc, x) => { await pulse(sc, x.o, 0.1, 0.25); await sc.tween(0.6, k => { const px = lerp(x.a.x, x.t.x, k), py = lerp(x.a.y, x.t.y, k) - Math.sin(k * Math.PI) * 20; spawn(sc, 'gift', px + R(-6, 6), py + R(-6, 6), R(-10, 10), R(-10, 10), { shape: 'bubble', life: 0.7, sz: R(1, 2) }); }); await cloud(sc, 'gift', x.t, 0.6, '#9a3ac8'); },
  giftnebel: async (sc, x) => { await Promise.all([cloud(sc, 'gift', x.t, 0.9, '#7a2a9a'), tint(sc, '#5a1a7a', 0.2, 0.9), sc.tween(0.9, () => spawn(sc, 'gift', x.t.x + R(-20, 20), x.t.y + R(-10, 20), 0, R(-30, -10), { shape: 'bubble', life: 0.5, sz: R(1.5, 3) }))]); },
  schlammbombe: async (sc, x) => { await orb(sc, 'gift', x.a, x.t, { dur: 0.55, arc: 40, r: 8 }); G.shake = 1; sfx('hit'); burst(sc, 'gift', x.t, 30, 140, { shape: 'drop', g: 300 }); await cloud(sc, 'gift', x.t, 0.4, '#5a1a7a'); },
  gifthieb: async (sc, x) => { await lunge(sc, x.o, x.dir, 16); await claws(sc, x.t, '#c87ae8', { n: 3, len: 18 }); if (x.hit) rise(sc, 'gift', x.t, 0.4, { shape: 'bubble' }); await back(sc, x.o, x.dir, 16); },
  giftzahn: async (sc, x) => { await lunge(sc, x.o, x.dir, 16); await fangs(sc, x.t, '#f0c8ff', '#5a1a7a'); if (x.hit) burst(sc, 'gift', x.t, 16, 80, { shape: 'bubble' }); await back(sc, x.o, x.dir, 16); },
  steinwurf: async (sc, x) => { await hop(sc, x.o, 10, 0.2); await orb(sc, 'erde', x.a, x.t, { dur: 0.45, arc: 34, r: 6 }); G.shake = 0.9; burst(sc, 'erde', x.t, 18, 120, { shape: 'rock' }); },
  bodenstoss: async (sc, x) => { await hop(sc, x.o, 28, 0.35); G.shake = 1.5; sfx('hit'); await Promise.all([rings(sc, { x: x.t.x, y: x.t.y + 26 }, '#c49152', { n: 3, big: 1.4 }), spikes(sc, 'erde', x.t, { n: 3, h: 22, w: 9 })]); },
  felsgranate: async (sc, x) => { await tint(sc, '#5a3a1a', 0.25, 0.3); await rain(sc, 'erde', x.t, { n: 7, shape: 'rock', sz: [3, 5.5], gap: 70 }); G.shake = 1.5; burst(sc, 'erde', x.t, 20, 140, { shape: 'rock' }); },
  sandwirbel: async (sc, x) => { await Promise.all([tornado(sc, 'erde', x.t, 0.8, 30), tint(sc, '#e8c890', 0.3, 0.8)]); },
  eisenkralle: async (sc, x) => { await Promise.all([flash(sc, '#ffffff', 0.08), lunge(sc, x.o, x.dir, 18)]); await claws(sc, x.t, '#dce4ec', { n: 3, len: 22 }); if (x.hit) burst(sc, 'metall', x.t, 14, 120, { shape: 'spark', c: '#fff6a0' }); await back(sc, x.o, x.dir, 18); },
  metallstoss: async (sc, x) => { await charge(sc, 'metall', x.a, 0.25); sfx('whoosh'); await sc.tween(0.14, k => { x.o.x = x.dir * 64 * k; for (let i = 0; i < 3; i++) spawn(sc, 'metall', x.a.x + x.o.x - x.dir * R(0, 20), x.a.y + R(-10, 10), -x.dir * 80, 0, { shape: 'spark', life: 0.2 }); }); if (x.hit) { G.shake = 1.1; await rings(sc, x.t, '#ffffff', { n: 1 }); burst(sc, 'metall', x.t, 18, 140, { shape: 'spark' }); } await back(sc, x.o, x.dir, 64); },
  stahlwirbel: async (sc, x) => { await sc.tween(0.9, k => { for (let i = 0; i < 3; i++) { const an = k * 20 + i * 2.09, r = 28 * (1 - k * 0.5); spawn(sc, 'metall', x.t.x + Math.cos(an) * r, x.t.y + Math.sin(an) * r * 0.6, 0, 0, { shape: 'shard', life: 0.12, sz: 3.5, g: 0 }); } if (Math.random() < 0.2) sfx('click'); }); G.shake = 0.8; burst(sc, 'metall', x.t, 20, 150, { shape: 'shard' }); },
  schattenbiss: async (sc, x) => { await tint(sc, '#120c1c', 0.35, 0.25); await lunge(sc, x.o, x.dir, 16); await fangs(sc, x.t, '#a890d0', '#120c1c'); if (x.hit) burst(sc, 'schatten', x.t, 16, 80); await back(sc, x.o, x.dir, 16); },
  vampirbiss: async (sc, x) => { await Promise.all([tint(sc, '#3a0c1c', 0.35, 1), (async () => { await lunge(sc, x.o, x.dir, 16); await fangs(sc, x.t, '#ffffff', '#5a0c1c'); if (x.hit) await sc.tween(0.4, k => spawn(sc, 'feuer', lerp(x.t.x, x.a.x, k) + R(-4, 4), lerp(x.t.y, x.a.y, k) + R(-4, 4), 0, 0, { c: '#e04858', shape: 'drop', life: 0.25, g: 0, add: false })); await back(sc, x.o, x.dir, 16); })()]); },
  nachtschleier: async (sc, x) => { await Promise.all([tint(sc, '#120c1c', 0.55, 1), cloud(sc, 'schatten', x.t, 0.8, '#2e2440')]); },
  albtraum: async (sc, x) => { await tint(sc, '#120c1c', 0.5, 0.3); await Promise.all([tint(sc, '#2e0c3a', 0.5, 1), hands(sc, x.t), sc.tween(0.9, () => spawn(sc, 'schatten', x.t.x + R(-26, 26), x.t.y + 28, 0, R(-60, -20), { life: 0.6, sz: R(2, 4) }))]); G.shake = 0.8; },
  spukgriff: async (sc, x) => { await Promise.all([hands(sc, x.t, '#8a7dd6', 0.65), sc.tween(0.65, k => (x.to.x = Math.sin(k * 26) * 3 * k))]); x.to.x = 0; },
  schattenball: async (sc, x) => { await charge(sc, 'geist', x.a, 0.4); await orb(sc, 'geist', x.a, x.t, { dur: 0.55, arc: 6, r: 8, wobble: 6 }); burst(sc, 'geist', x.t, 26, 120); },
  lichtpfeil: async (sc, x) => { for (let i = 0; i < 3; i++) { projectile(sc, 'licht', x.a, { x: x.t.x + (i - 1) * 8, y: x.t.y }, 0.25, 0, 3); await wait(60); } await wait(220); burst(sc, 'licht', x.t, 14, 90, { shape: 'star' }); },
  sonnenstrahl: async (sc, x) => { await Promise.all([tint(sc, '#fff3a8', 0.35, 1.4), (async () => { await charge(sc, 'licht', x.a, 0.55, 44); await Promise.all([beam(sc, 'licht', x.a, x.t, 0.6), pillar(sc, 'licht', x.t, 0.6, 16)]); })()]); G.shake = 1.2; },
  glanzschild: async (sc, x) => { await Promise.all([shield(sc, x.a, '#fff3a8'), rise(sc, 'licht', x.a, 0.6, { shape: 'star' })]); },
  frosthauch: async (sc, x) => { sfx('whoosh'); await sc.tween(0.55, k => { for (let i = 0; i < 3; i++) { const q = R(0, k); spawn(sc, 'eis', lerp(x.a.x, x.t.x, q) + R(-6, 6), lerp(x.a.y, x.t.y, q) + R(-6, 6), R(-10, 10), R(-10, 10), { shape: 'star', life: 0.35, sz: R(1.5, 3) }); } }); await tint(sc, '#8fe8ff', 0.25, 0.3); },
  eiszapfen: async (sc, x) => { await rain(sc, 'eis', x.t, { n: 6, shape: 'shard', sz: [3, 4.5], gap: 60, spread: 18 }); burst(sc, 'eis', x.t, 14, 100, { shape: 'shard' }); },
  frostwelle: async (sc, x) => { await Promise.all([tint(sc, '#e0f8ff', 0.35, 1.1), (async () => { await wave(sc, 'eis', x.a, x.t, 0.8, 40); await spikes(sc, 'eis', x.t, { n: 6, h: 30, w: 6, dur: 0.6 }); })()]); },
  runenblitz: async (sc, x) => { await Promise.all([runeCircle(sc, x.t, '#ff7ad9', 0.9), (async () => { await wait(250); await lightning(sc, x.t, { n: 3, col: '#ff7ad9' }); })()]); },
  sternensegen: async (sc, x) => { await Promise.all([rain(sc, 'magie', x.a, { n: 8, shape: 'star', spread: 20, gap: 50, sz: [2, 3.5] }), runeCircle(sc, x.a, '#ffd0f0', 0.8)]); sfx('heal'); },
  mondlicht: async (sc, x) => { await Promise.all([moon(sc, x.a, 1), tint(sc, '#1a1a4a', 0.3, 1), rise(sc, 'magie', x.a, 0.9, { shape: 'star', c: '#fff6c8' })]); sfx('heal'); },
  funkelstaub: async (sc, x) => { await sc.tween(0.6, k => { const px = lerp(x.a.x, x.t.x, k), py = lerp(x.a.y, x.t.y, k) - Math.sin(k * Math.PI) * 24; for (let i = 0; i < 2; i++) spawn(sc, 'magie', px + R(-8, 8), py + R(-8, 8), R(-20, 20), R(-20, 20), { shape: 'star', life: 0.5, sz: R(1.5, 3) }); }); burst(sc, 'magie', x.t, 22, 80, { shape: 'star' }); },
  drachenklaue: async (sc, x) => { await Promise.all([tint(sc, '#4a2ad0', 0.2, 0.7), (async () => { await lunge(sc, x.o, x.dir, 18); await claws(sc, x.t, '#b49aff', { n: 3, len: 24, cross: true }); if (x.hit) burst(sc, 'drache', x.t, 18); await back(sc, x.o, x.dir, 18); })()]); },
  drachenodem: async (sc, x) => { await charge(sc, 'drache', x.a, 0.3); sfx('whoosh'); await sc.tween(0.6, k => { for (let i = 0; i < 4; i++) { const q = R(0, k), sp = q * 14; spawn(sc, 'drache', lerp(x.a.x, x.t.x, q) + R(-sp, sp), lerp(x.a.y, x.t.y, q) + R(-sp, sp), R(-20, 20), R(-30, 0), { life: 0.35, sz: R(2, 4) }); } }); },
  gluthauch: async (sc, x) => { sfx('whoosh'); await sc.tween(0.55, k => { for (let i = 0; i < 4; i++) { const q = R(0, k), sp = q * 12; spawn(sc, 'feuer', lerp(x.a.x, x.t.x, q) + R(-sp, sp), lerp(x.a.y, x.t.y, q) + R(-sp, sp), R(-15, 15), R(-30, 0), { life: 0.35, sz: R(2, 4) }); } }); await tint(sc, '#ff8a2a', 0.2, 0.3); },
  magmaflut: async (sc, x) => { await Promise.all([tint(sc, '#7a2a1a', 0.35, 1.3), (async () => { await spikes(sc, 'feuer', x.t, { n: 5, h: 20, w: 8, dur: 0.5 }); await wave(sc, 'feuer', x.a, x.t, 0.8, 40); })()]); G.shake = 1.3; burst(sc, 'feuer', x.t, 28, 140); },
  // ---- weitere Attacken aus den Welten 1–3
  zunderklaue: (sc, x) => strike(3, 18)(sc, x, 'feuer', '#ffd23a'),
  aschefaust: async (sc, x) => { await lunge(sc, x.o, x.dir, 22); if (x.hit) { G.shake = 1; burst(sc, 'feuer', x.t, 14, 90); await cloud(sc, 'feuer', x.t, 0.35, '#5a5058'); } await back(sc, x.o, x.dir, 22); },
  glutsturm: async (sc, x) => { await Promise.all([tint(sc, '#e8401a', 0.22, 1), rain(sc, 'feuer', x.t, { n: 10, spread: 34, gap: 45 })]); await tornado(sc, 'feuer', x.t, 0.5, 26); },
  drachenvulkan: async (sc, x) => { await Promise.all([tint(sc, '#7a2a1a', 0.4, 1.6), (async () => { await spikes(sc, 'feuer', x.t, { n: 5, h: 22, w: 9, dur: 0.6 }); await rain(sc, 'drache', x.t, { n: 8, gap: 50 }); await pillar(sc, 'feuer', x.t, 0.5, 18); })()]); G.shake = 1.5; burst(sc, 'feuer', x.t, 30, 150); },
  gischtstoss: ram(54, 'drop'),
  gezeitenschlag: async (sc, x) => { await Promise.all([wave(sc, 'wasser', x.a, x.t, 0.6, 26), (async () => { await wait(250); await claws(sc, x.t, '#9ad4ff', { n: 1, len: 30 }); })()]); },
  brandungsklinge: (sc, x) => strike(2, 30, true, 20)(sc, x, 'wasser', '#f0faff'),
  mahlstrom: async (sc, x) => { await Promise.all([tint(sc, '#1f6ad0', 0.3, 1.2), sc.tween(1.2, k => { for (let i = 0; i < 4; i++) { const an = k * 26 + i * 1.57, r = 40 * (1 - k * 0.7); spawn(sc, 'wasser', x.t.x + Math.cos(an) * r, x.t.y + 10 + Math.sin(an) * r * 0.4, 0, 0, { shape: 'drop', life: 0.18, g: 0 }); } x.to.x = Math.sin(k * 26) * 3; })]); },
  perlenhagel: async (sc, x) => { for (let i = 0; i < 7; i++) { orb(sc, 'licht', x.a, { x: x.t.x + R(-14, 14), y: x.t.y + R(-10, 10) }, { dur: 0.35, arc: R(10, 30), r: 2.5 }).then(() => sfx('click')); await wait(55); } await wait(400); },
  mooskeim: async (sc, x) => { await orb(sc, 'pflanze', x.a, x.t, { dur: 0.45, arc: 26, r: 3 }); await vines(sc, { x: x.t.x, y: x.t.y + 26 }, x.t, { n: 3, lash: false, dur: 0.6 }); },
  wurzelpeitsche: async (sc, x) => { await vines(sc, { x: x.a.x, y: x.a.y + 26 }, x.t, { n: 1, dur: 0.5, col: '#6a4a24', light: '#a8804a' }); G.shake = 0.7; await claws(sc, x.t, '#a8804a', { n: 1, len: 30 }); },
  waldesatem: async (sc, x) => { await Promise.all([tint(sc, '#3a9a34', 0.2, 1), rise(sc, 'pflanze', x.a, 0.9, { shape: 'leaf' }), rings(sc, x.a, '#7ad850', { n: 3, gap: 200 })]); sfx('heal'); },
  kronenzorn: async (sc, x) => { await charge(sc, 'pflanze', x.a, 0.35); await Promise.all([rain(sc, 'pflanze', x.t, { n: 10, shape: 'leaf', gap: 40 }), spikes(sc, 'pflanze', x.t, { n: 8, h: 36, w: 5, dur: 0.8 })]); G.shake = 1.4; },
  salzwind: async (sc, x) => { await sc.tween(0.7, k => { for (let i = 0; i < 3; i++) spawn(sc, i ? 'luft' : 'eis', lerp(x.a.x, x.t.x, R(0, k)) + R(-10, 10), lerp(x.a.y, x.t.y, R(0, k)) + R(-10, 10), x.dir * 80, R(-10, 10), { shape: i ? 'wind' : 'star', life: 0.4, sz: R(1.5, 3) }); }); },
  kreiselboe: async (sc, x) => { await sc.tween(0.35, k => (x.o.s = 1 + Math.sin(k * 30) * 0.06)); x.o.s = 1; await lunge(sc, x.o, x.dir, 40); if (x.hit) await tornado(sc, 'luft', x.t, 0.4, 20); await back(sc, x.o, x.dir, 40); },
  sternsplitter: async (sc, x) => { await orb(sc, 'magie', x.a, x.t, { dur: 0.4, arc: 18, r: 5 }); G.shake = 0.6; burst(sc, 'magie', x.t, 28, 140, { shape: 'star' }); await flash(sc, '#ffd0f0', 0.15); },
  sandsturz: async (sc, x) => { await rain(sc, 'erde', x.t, { n: 14, shape: 'smoke', spread: 24, gap: 30, sz: [3, 5] }); G.shake = 1; burst(sc, 'erde', x.t, 14, 80, { shape: 'rock' }); },
  funkenkette: async (sc, x) => { let p = x.a; for (let i = 0; i < 4; i++) { const q = { x: lerp(x.a.x, x.t.x, (i + 1) / 4) + R(-10, 10), y: lerp(x.a.y, x.t.y, (i + 1) / 4) + R(-14, 14) }; sc.bolts.push({ a: p, t: q, c: '#fff6a0', l: 0.35 }); sfx('click'); p = q; await wait(70); } burst(sc, 'elektro', x.t, 16); await wait(200); },
  irrflamme: async (sc, x) => { for (let i = 0; i < 3; i++) { orb(sc, 'geist', x.a, { x: x.t.x + R(-8, 8), y: x.t.y + R(-8, 8) }, { dur: 0.7, arc: 30 - i * 20, r: 3.5, wobble: 10 }); await wait(110); } await wait(600); burst(sc, 'geist', x.t, 16); },
  scherenschnitt: async (sc, x) => { await lunge(sc, x.o, x.dir, 18); await claws(sc, x.t, '#dce4ec', { n: 1, len: 30, cross: true, rot: -0.4 }); if (x.hit) burst(sc, 'metall', x.t, 12, 110, { shape: 'spark' }); await back(sc, x.o, x.dir, 18); },
  nesselschock: async (sc, x) => { await vines(sc, x.a, x.t, { n: 2, col: '#c8a830', light: '#fff6a0', dur: 0.45 }); await lightning(sc, x.t, { n: 2, top: false }); },
  mondschleier: async (sc, x) => { await Promise.all([moon(sc, x.t, 1), tint(sc, '#120c3a', 0.45, 1), cloud(sc, 'schatten', x.t, 0.8, '#3a2a6a')]); },
  echoschrei: async (sc, x) => { await Promise.all([soundArcs(sc, x.a, x.t, '#ffffff', 0.5), (async () => { await wait(200); await soundArcs(sc, x.a, x.t, '#a8d8f0', 0.5); })(), pulse(sc, x.o, 0.14, 0.5)]); wobble(sc, x.to, 5); },
  panzerwalze: async (sc, x) => { sfx('hit'); await sc.tween(0.4, k => { x.o.x = x.dir * 64 * k; G.shake = 0.5; if (Math.random() < 0.5) spawn(sc, 'erde', x.a.x + x.o.x, x.a.y + 26, -x.dir * R(20, 60), R(-60, -20), { shape: 'rock', life: 0.4 }); }); if (x.hit) { G.shake = 1.4; burst(sc, 'erde', x.t, 20, 120, { shape: 'rock' }); } await back(sc, x.o, x.dir, 64); },
  sporentanz: async (sc, x) => { await sc.tween(0.4, k => (x.o.x = Math.sin(k * 18) * 5)); await sc.tween(0.7, k => { for (let i = 0; i < 2; i++) { const an = k * 12 + i * 3.14; spawn(sc, 'gift', x.t.x + Math.cos(an) * 26, x.t.y + Math.sin(an) * 12, 0, R(-10, 10), { shape: 'bubble', life: 0.6, sz: R(1.5, 3) }); } }); },
  lichtschwinge: async (sc, x) => { await Promise.all([tint(sc, '#fffbe0', 0.25, 0.8), (async () => { await lunge(sc, x.o, x.dir, 26); await claws(sc, x.t, '#fff3a8', { n: 2, len: 28, rot: -0.3 }); burst(sc, 'licht', x.t, 18, 110, { shape: 'star' }); await back(sc, x.o, x.dir, 26); })()]); },
  hoffnungslied: async (sc, x) => { await Promise.all([rings(sc, x.a, '#fff3a8', { n: 4, gap: 150 }), rise(sc, 'licht', x.a, 0.9, { shape: 'star' }), tint(sc, '#fff3a8', 0.18, 0.9)]); },
  muschelwall: async (sc, x) => { await Promise.all([shield(sc, x.a, '#9ad4ff', 0.9), rise(sc, 'wasser', x.a, 0.6, { shape: 'bubble' })]); },
  dornenschuss: (sc, x) => volley(sc, 'pflanze', x.a, x.t, 6, 10),
  wuestenwind: async (sc, x) => { await Promise.all([tint(sc, '#f8c878', 0.35, 1), sc.tween(1, () => { for (let i = 0; i < 4; i++) spawn(sc, 'erde', R(0, 240), R(10, 100), 220, R(-10, 10), { shape: 'smoke', sz: R(1.5, 3), life: 0.5, add: false }); })]); },
  sonnenpanzer: async (sc, x) => { await Promise.all([shield(sc, x.a, '#ffd860', 0.9), pillar(sc, 'licht', x.a, 0.7, 14)]); },
  skarabaeusrad: async (sc, x) => { await sc.tween(0.45, k => { x.o.x = x.dir * 64 * k; x.o.y = -Math.abs(Math.sin(k * 9)) * 6; if (Math.random() < 0.6) spawn(sc, 'erde', x.a.x + x.o.x, x.a.y + 24, -x.dir * 50, -30, { shape: 'smoke', life: 0.4, sz: 3, add: false }); }); if (x.hit) { G.shake = 1.2; burst(sc, 'erde', x.t, 18, 110, { shape: 'rock' }); } await back(sc, x.o, x.dir, 64); },
  trugbild: async (sc, x) => { await Promise.all([sc.tween(0.7, k => (x.o.x = Math.sin(k * 40) * 8 * bell(k))), tint(sc, '#ff7ad9', 0.2, 0.7)]); await beam(sc, 'magie', x.a, x.t, 0.4); },
  oasenregen: async (sc, x) => { await Promise.all([rain(sc, 'wasser', x.a, { n: 12, shape: 'drop', spread: 24, gap: 45, sz: [1.5, 2.5] }), tint(sc, '#3d9bff', 0.15, 0.8)]); sfx('heal'); },
  aasflug: async (sc, x) => { await tint(sc, '#120c1c', 0.35, 0.2); await sc.tween(0.25, k => (x.o.y = -k * 70)); await sc.tween(0.18, k => { x.o.x = x.dir * 70 * k; x.o.y = -70 + 70 * k; spawn(sc, 'schatten', x.a.x + x.o.x, x.a.y + x.o.y, 0, 0, { life: 0.35 }); }); if (x.hit) { G.shake = 1; await claws(sc, x.t, '#a890d0', { n: 2, len: 22 }); } await back(sc, x.o, x.dir, 70); },
  quarzstrahl: async (sc, x) => { await charge(sc, 'magie', x.a, 0.3); await beam(sc, 'magie', x.a, x.t, 0.5); burst(sc, 'eis', x.t, 14, 110, { shape: 'shard', c: '#ffd0f0' }); },
  tropfstein: async (sc, x) => { await rain(sc, 'erde', x.t, { n: 4, shape: 'shard', spread: 10, gap: 90, sz: [4, 6] }); G.shake = 1; burst(sc, 'erde', x.t, 14, 90, { shape: 'rock' }); },
  glimmsporen: async (sc, x) => { await sc.tween(0.9, () => { for (let i = 0; i < 2; i++) spawn(sc, 'licht', x.t.x + R(-30, 30), x.t.y + R(-20, 24), R(-8, 8), R(-20, -5), { shape: 'star', life: 0.7, sz: R(1, 2.5) }); }); },
  nussregen: async (sc, x) => { await rain(sc, 'erde', x.t, { n: 9, shape: 'rock', spread: 22, gap: 50, sz: [2, 3] }); burst(sc, 'pflanze', x.t, 10, 60, { shape: 'leaf' }); },
  mooswalze: async (sc, x) => { await sc.tween(0.45, k => { x.o.x = x.dir * 64 * k; G.shake = 0.4; spawn(sc, 'pflanze', x.a.x + x.o.x, x.a.y + 20, -x.dir * 40, -40, { shape: 'leaf', life: 0.5 }); }); if (x.hit) { G.shake = 1.4; await spikes(sc, 'pflanze', x.t, { n: 4, h: 18 }); } await back(sc, x.o, x.dir, 64); },
  froschgift: async (sc, x) => { await hop(sc, x.o, 12, 0.25); await orb(sc, 'gift', x.a, x.t, { dur: 0.4, arc: 20, r: 4 }); await cloud(sc, 'gift', x.t, 0.6, '#9a3ac8'); },
  leuchtfunke: async (sc, x) => { await orb(sc, 'elektro', x.a, x.t, { dur: 0.45, arc: 10, r: 4, wobble: 4 }); await lightning(sc, x.t, { n: 1, top: false }); burst(sc, 'elektro', x.t, 14); },
  feenstaub: async (sc, x) => { await Promise.all([sc.tween(0.8, k => { const an = k * 14; spawn(sc, 'magie', x.a.x + Math.cos(an) * 22, x.a.y + Math.sin(an) * 10 - k * 20, 0, -10, { shape: 'star', life: 0.5 }); }), pulse(sc, x.o, 0.08, 0.8)]); },
  geisterhuf: async (sc, x) => { await Promise.all([tint(sc, '#4a3a8a', 0.25, 0.8), (async () => { await sc.tween(0.15, k => (x.o.y = -k * 16)); await lunge(sc, x.o, x.dir, 40); x.o.y = 0; if (x.hit) { G.shake = 1.1; burst(sc, 'geist', x.t, 22); await rings(sc, x.t, '#b0a4f0', { n: 2 }); } await back(sc, x.o, x.dir, 40); })()]); },
  mondgeheul: async (sc, x) => { await Promise.all([moon(sc, x.a, 1), tint(sc, '#1a1a4a', 0.35, 1), soundArcs(sc, x.a, { x: x.a.x, y: x.a.y - 60 }, '#c8d8ff', 0.8), pulse(sc, x.o, 0.12, 0.8)]); },
  schattenreisser: async (sc, x) => { await tint(sc, '#120c1c', 0.45, 0.3); await Promise.all([tint(sc, '#120c1c', 0.45, 0.6), strike(4, 26, true, 22)(sc, x, 'schatten', '#a890d0')]); },
  kurzschluss: async (sc, x) => { await lunge(sc, x.o, x.dir, 24); if (x.hit) { await Promise.all([lightning(sc, x.t, { n: 3, top: false }), flash(sc, '#fff6a0', 0.2)]); sc.bolts.push({ a: x.t, t: x.a, c: '#fff6a0', l: 0.2 }); } await back(sc, x.o, x.dir, 24); },
  zahnradwurf: async (sc, x) => { await sc.tween(0.45, k => { const px = lerp(x.a.x, x.t.x, k), py = lerp(x.a.y, x.t.y, k) - Math.sin(k * Math.PI) * 20; for (let i = 0; i < 6; i++) { const an = k * 30 + i * 1.05; spawn(sc, 'metall', px + Math.cos(an) * 6, py + Math.sin(an) * 6, 0, 0, { shape: 'rock', life: 0.06, sz: 1.6, g: 0 }); } }); G.shake = 0.8; burst(sc, 'metall', x.t, 14, 110, { shape: 'spark' }); },
  hochspannung: async (sc, x) => { await Promise.all([tint(sc, '#1a1a3a', 0.45, 1.1), (async () => { await charge(sc, 'elektro', x.a, 0.4, 40); await Promise.all([lightning(sc, x.t, { n: 6 }), pillar(sc, 'elektro', x.t, 0.5, 14)]); await flash(sc, '#ffffff', 0.25); })()]); G.shake = 1.5; },
  hornramme: ram(64, 'star'),
  galopp: async (sc, x) => { for (let i = 0; i < 3; i++) await sc.tween(0.1, k => { x.o.x = x.dir * (i * 20 + 20 * k); x.o.y = -Math.sin(k * Math.PI) * 8; }); if (x.hit) { G.shake = 1; burst(sc, 'luft', x.t, 16, 110); } await back(sc, x.o, x.dir, 60); },
  nebelschleier: async (sc, x) => { await Promise.all([cloud(sc, 'geist', x.t, 1, '#b0a4f0'), tint(sc, '#e8e0ff', 0.3, 1)]); },
  seelenwelle: async (sc, x) => { await Promise.all([rings(sc, x.a, '#b0a4f0', { n: 4, gap: 120, big: 1.5 }), sc.tween(0.8, k => { for (let i = 0; i < 2; i++) spawn(sc, 'geist', lerp(x.a.x, x.t.x, k) + R(-10, 10), lerp(x.a.y, x.t.y, k) + R(-10, 10), R(-20, 20), R(-20, 20), { life: 0.4 }); })]); burst(sc, 'geist', x.t, 20); },
  ankerwurf: async (sc, x) => { await orb(sc, 'metall', { x: x.t.x + 10, y: -30 }, x.t, { dur: 0.4, arc: 0, r: 8 }); G.shake = 1.6; sfx('hit'); await Promise.all([rings(sc, { x: x.t.x, y: x.t.y + 24 }, '#dce4ec', { n: 2, big: 1.3 }), burst(sc, 'wasser', x.t, 20, 140, { shape: 'drop' })]); },
  geisterzange: async (sc, x) => { await Promise.all([hands(sc, x.t, '#8a7dd6', 0.5), (async () => { await wait(150); await fangs(sc, x.t, '#e8e0ff', '#4a3a8a'); })()]); },
  totenruf: async (sc, x) => { await Promise.all([tint(sc, '#120c1c', 0.5, 0.9), soundArcs(sc, x.a, x.t, '#8a7dd6', 0.8), rise(sc, 'geist', x.t, 0.8)]); },
  lavawelle: async (sc, x) => { await Promise.all([tint(sc, '#7a2a1a', 0.3, 1), wave(sc, 'feuer', x.a, x.t, 0.95, 44)]); burst(sc, 'feuer', x.t, 24, 140); },
  basaltfaust: async (sc, x) => { await charge(sc, 'erde', x.a, 0.25); await lunge(sc, x.o, x.dir, 26); if (x.hit) { G.shake = 1.5; await Promise.all([rings(sc, x.t, '#c49152', { n: 2 }), spikes(sc, 'erde', x.t, { n: 3, h: 20, w: 9 })]); } await back(sc, x.o, x.dir, 26); },
  falkenglut: async (sc, x) => { await sc.tween(0.25, k => (x.o.y = -k * 60)); await sc.tween(0.18, k => { x.o.x = x.dir * 70 * k; x.o.y = -60 + 60 * k; for (let i = 0; i < 3; i++) spawn(sc, 'feuer', x.a.x + x.o.x + R(-6, 6), x.a.y + x.o.y + R(-6, 6), 0, 0, { life: 0.4 }); }); if (x.hit) { G.shake = 1.2; burst(sc, 'feuer', x.t, 26, 140); } await back(sc, x.o, x.dir, 70); },
  himmelsriss: async (sc, x) => { await Promise.all([tint(sc, '#e0f4ff', 0.4, 1.2), (async () => { await claws(sc, { x: x.t.x, y: 30 }, '#ffffff', { n: 1, len: 60, rot: 1.3 }); await tornado(sc, 'luft', x.t, 0.7, 34); })()]); G.shake = 1.3; },
  wolkenbett: async (sc, x) => { await Promise.all([cloud(sc, 'luft', { x: x.a.x, y: x.a.y + 16 }, 0.9, '#ffffff'), rise(sc, 'licht', x.a, 0.9, { shape: 'star' })]); sfx('heal'); },
  drachentanz: async (sc, x) => { await Promise.all([sc.tween(0.9, k => { x.o.x = Math.sin(k * 12) * 6; x.o.y = -Math.abs(Math.sin(k * 6)) * 8; spawn(sc, 'drache', x.a.x + R(-20, 20), x.a.y + 24, 0, -60, { life: 0.5 }); }), tint(sc, '#4a2ad0', 0.2, 0.9)]); },
  kronenbiss: async (sc, x) => { await charge(sc, 'drache', x.a, 0.3); await lunge(sc, x.o, x.dir, 20); await Promise.all([fangs(sc, x.t, '#f8d040', '#24145a', 0.5), flash(sc, '#b49aff', 0.2)]); if (x.hit) burst(sc, 'drache', x.t, 26, 130); await back(sc, x.o, x.dir, 20); },
  juwelstrahl: async (sc, x) => { await charge(sc, 'magie', x.a, 0.35); await Promise.all([beam(sc, 'magie', x.a, x.t, 0.6), sc.tween(0.6, () => spawn(sc, 'eis', x.t.x + R(-14, 14), x.t.y + R(-14, 14), R(-80, 80), R(-80, 40), { shape: 'shard', c: ['#ff7ad9', '#8fe8ff', '#ffd860'][Math.floor(R(0, 3))], life: 0.35 }))]); },
  urfeuer: async (sc, x) => { await tint(sc, '#000000', 0.5, 0.3); await Promise.all([tint(sc, '#e8401a', 0.45, 1.4), (async () => { await charge(sc, 'feuer', x.a, 0.45, 46); await Promise.all([beam(sc, 'feuer', x.a, x.t, 0.5), pillar(sc, 'feuer', x.t, 0.7, 22), spikes(sc, 'feuer', x.t, { n: 7, h: 30, w: 7 })]); await nova(sc, x.t, '#ffd23a', 0.5); })()]); G.shake = 1.6; },
  zephyrschwinge: async (sc, x) => { await Promise.all([tint(sc, '#a8d8f0', 0.35, 1.2), (async () => { await sc.tween(0.3, k => (x.o.y = -k * 20)); for (let i = 0; i < 4; i++) { projectile(sc, 'luft', x.a, x.t, 0.3, -10 + i * 10, 5); await wait(60); } await tornado(sc, 'luft', x.t, 0.6, 36); x.o.y = 0; })()]); },
  kronenschlag: async (sc, x) => { await charge(sc, 'drache', x.a, 0.35); await hop(sc, x.o, 40, 0.4); await Promise.all([pillar(sc, 'drache', x.t, 0.5, 18), spikes(sc, 'drache', x.t, { n: 6, h: 30, w: 8 }), rings(sc, { x: x.t.x, y: x.t.y + 24 }, '#b49aff', { n: 3, big: 1.5 })]); G.shake = 1.6; },
  korallenpfeil: async (sc, x) => { for (let i = 0; i < 3; i++) { projectile(sc, 'feuer', x.a, { x: x.t.x + (i - 1) * 6, y: x.t.y }, 0.3, 4, 3); await wait(50); } await wait(250); burst(sc, 'wasser', x.t, 16, 100, { shape: 'drop' }); },
  tintenwolke: async (sc, x) => { await orb(sc, 'schatten', x.a, x.t, { dur: 0.35, arc: 10, r: 4 }); await Promise.all([cloud(sc, 'schatten', x.t, 0.9, '#120c1c'), tint(sc, '#120c1c', 0.4, 0.9)]); },
  walgesang: async (sc, x) => { await Promise.all([rings(sc, x.a, '#9ad4ff', { n: 5, gap: 160, big: 1.6 }), tint(sc, '#1f6ad0', 0.25, 1), rise(sc, 'wasser', x.a, 0.9, { shape: 'bubble' })]); sfx('heal'); },
  tiefendruck: async (sc, x) => { await tint(sc, '#0a1a3a', 0.5, 0.3); await Promise.all([tint(sc, '#0a1a3a', 0.5, 1), sc.tween(1, k => { x.to.y = bell(k) * 6; x.to.s = 1 - bell(k) * 0.08; spawn(sc, 'wasser', x.t.x + R(-30, 30), x.t.y - 40, 0, 120, { shape: 'drop', life: 0.4 }); })]); x.to.y = 0; x.to.s = 1; G.shake = 1.3; },
  perlglanz: async (sc, x) => { await charge(sc, 'licht', x.a, 0.35); await Promise.all([beam(sc, 'licht', x.a, x.t, 0.5), rings(sc, x.t, '#ffffff', { n: 2 })]); },
  palmenhieb: (sc, x) => strike(2, 30, false, 20)(sc, x, 'pflanze', '#d8f890'),
  eissplitter: (sc, x) => volley(sc, 'eis', x.a, x.t, 7, 12),
  frostbiss: async (sc, x) => { await lunge(sc, x.o, x.dir, 16); await fangs(sc, x.t, '#e0f8ff', '#1a4a6a'); if (x.hit) { await spikes(sc, 'eis', x.t, { n: 3, h: 14, w: 5, dur: 0.4 }); } await back(sc, x.o, x.dir, 16); },
  blizzard: async (sc, x) => { await Promise.all([tint(sc, '#ffffff', 0.45, 1.3), sc.tween(1.3, () => { for (let i = 0; i < 6; i++) spawn(sc, 'eis', R(-40, 240), R(-10, 100), 260, 60, { shape: i % 2 ? 'star' : 'shard', life: 0.6, sz: R(1.5, 3) }); }), sc.tween(1.3, k => (x.to.x = Math.sin(k * 40) * 2))]); x.to.x = 0; },
  nordlicht: async (sc, x) => { await Promise.all([aurora(sc, 1.2), tint(sc, '#0a1a3a', 0.35, 1.2), (async () => { await wait(350); await beam(sc, 'eis', { x: x.t.x, y: 0 }, x.t, 0.5); })()]); },
  gletscherramme: async (sc, x) => { await Promise.all([spikes(sc, 'eis', x.a, { n: 4, h: 16, dur: 0.5 }), ram(66, 'shard')(sc, x, 'eis')]); },
  polarnacht: async (sc, x) => { await tint(sc, '#05030c', 0.6, 0.4); await Promise.all([tint(sc, '#05030c', 0.6, 1), rain(sc, 'eis', x.t, { n: 10, shape: 'star', spread: 40, gap: 45, sz: [1.5, 2.5] }), cloud(sc, 'schatten', x.t, 0.8, '#1a1a3a')]); },
  erzbohrer: async (sc, x) => { await sc.tween(0.3, k => (x.o.s = 1 + Math.sin(k * 40) * 0.05)); await lunge(sc, x.o, x.dir, 30); if (x.hit) await sc.tween(0.4, () => { spawn(sc, 'metall', x.t.x, x.t.y, R(-140, 140), R(-140, 60), { shape: 'spark', life: 0.2 }); G.shake = 0.6; }); await back(sc, x.o, x.dir, 30); },
  ewiges_eis: async (sc, x) => { await tint(sc, '#ffffff', 0.6, 0.3); await Promise.all([tint(sc, '#8fe8ff', 0.45, 1.5), (async () => { await aurora(sc, 0.5); await spikes(sc, 'eis', x.t, { n: 9, h: 44, w: 7, dur: 0.9 }); })(), sc.tween(1.2, () => spawn(sc, 'eis', R(0, 240), -4, R(-20, 20), R(60, 120), { shape: 'star', life: 1, g: 0 }))]); await nova(sc, x.t, '#e0f8ff', 0.5); G.shake = 1.5; },
  wolkenschlag: async (sc, x) => { await cloud(sc, 'luft', { x: x.t.x, y: x.t.y - 40 }, 0.4, '#ffffff'); await lightning(sc, x.t, { n: 2, col: '#e0f4ff' }); await lunge(sc, x.o, x.dir, 26); G.shake = 1; await back(sc, x.o, x.dir, 26); },
  regenbogen: async (sc, x) => { await Promise.all([rainbow(sc, x.a, x.t, 1), tint(sc, '#fffbe0', 0.2, 1)]); burst(sc, 'licht', x.t, 22, 110, { shape: 'star' }); },
  sternenregen: async (sc, x) => { await Promise.all([tint(sc, '#140c3a', 0.5, 1.4), rain(sc, 'magie', x.t, { n: 16, shape: 'star', spread: 44, gap: 55, sz: [2, 4] })]); G.shake = 1; },
  kometenhieb: async (sc, x) => { await sc.tween(0.25, k => (x.o.y = -k * 80)); await sc.tween(0.2, k => { x.o.x = x.dir * 70 * k; x.o.y = -80 + 80 * k; for (let i = 0; i < 3; i++) spawn(sc, 'magie', x.a.x + x.o.x + R(-5, 5), x.a.y + x.o.y + R(-5, 5), 0, 0, { shape: 'star', life: 0.4 }); }); if (x.hit) { G.shake = 1.3; await nova(sc, x.t, '#ffd0f0', 0.35, 0.3); } await back(sc, x.o, x.dir, 70); },
  schattensee: async (sc, x) => { await Promise.all([tint(sc, '#05030c', 0.55, 1.3), wave(sc, 'schatten', x.a, x.t, 1, 40), (async () => { await wait(500); await hands(sc, x.t, '#2e2440', 0.7); })()]); },
  geisterflut: async (sc, x) => { await Promise.all([tint(sc, '#2e1a4a', 0.4, 1.2), sc.tween(1.1, () => { for (let i = 0; i < 4; i++) spawn(sc, 'geist', x.a.x + R(-10, 10), x.a.y + R(-10, 10), (x.t.x - x.a.x) * R(1.6, 2.4), (x.t.y - x.a.y) * R(1.6, 2.4) + R(-40, 40), { life: 0.6, sz: R(2, 4) }); })]); burst(sc, 'geist', x.t, 26, 130); },
  abgrund: async (sc, x) => { await tint(sc, '#000000', 0.6, 0.3); await Promise.all([tint(sc, '#000000', 0.6, 1.1), hands(sc, x.t, '#05030c', 0.9), sc.tween(0.9, k => (x.to.y = bell(k) * 10))]); x.to.y = 0; G.shake = 1.4; },
  wiegenlied: async (sc, x) => { await Promise.all([tint(sc, '#1a1a4a', 0.3, 1), rise(sc, 'magie', x.a, 1, { shape: 'star' }), rings(sc, x.a, '#ffd0f0', { n: 4, gap: 200 })]); sfx('heal'); },
  himmelssturm: async (sc, x) => { await tint(sc, '#1a1a3a', 0.5, 0.3); await Promise.all([tint(sc, '#1a1a3a', 0.5, 1.4), tornado(sc, 'luft', x.t, 1.3, 44), (async () => { await wait(300); await lightning(sc, x.t, { n: 5, col: '#e0f4ff' }); })()]); G.shake = 1.5; },
  nachtgesang: async (sc, x) => { await tint(sc, '#05030c', 0.6, 0.3); await Promise.all([tint(sc, '#05030c', 0.6, 1.4), moon(sc, x.a, 1.4), soundArcs(sc, x.a, x.t, '#a890d0', 0.7), (async () => { await wait(500); await soundArcs(sc, x.a, x.t, '#ffffff', 0.7); })(), (async () => { await wait(700); await hands(sc, x.t, '#2e2440', 0.7); })()]); },
  ursprungsflut: async (sc, x) => { await tint(sc, '#0a1a3a', 0.5, 0.3); await Promise.all([tint(sc, '#1f6ad0', 0.4, 1.5), (async () => { await wave(sc, 'wasser', x.a, x.t, 0.9, 64); await pillar(sc, 'wasser', x.t, 0.5, 22); })(), rain(sc, 'wasser', x.t, { n: 14, shape: 'drop', spread: 50, gap: 70 })]); G.shake = 1.7; },
  sternenstaub: async (sc, x) => { await sc.tween(0.55, k => { for (let i = 0; i < 3; i++) spawn(sc, 'astral', lerp(x.a.x, x.t.x, R(0, k)) + R(-8, 8), lerp(x.a.y, x.t.y, R(0, k)) + R(-8, 8), R(-15, 15), R(-15, 15), { shape: 'star', life: 0.45, sz: R(1.5, 3) }); }); burst(sc, 'astral', x.t, 18, 90, { shape: 'star' }); },
  gravitation: async (sc, x) => { await Promise.all([tint(sc, '#140c3a', 0.4, 1), sc.tween(1, k => { x.to.y = bell(k) * 8; x.to.s = 1 - bell(k) * 0.1; }), rings(sc, { x: x.t.x, y: x.t.y + 24 }, '#8a6aff', { n: 4, gap: 160, big: 1.3 })]); x.to.y = 0; x.to.s = 1; G.shake = 1.2; },
  nova: async (sc, x) => { await charge(sc, 'astral', x.t, 0.5, 40); await Promise.all([nova(sc, x.t, '#d8c8ff', 0.6, 0.6), flash(sc, '#ffffff', 0.25)]); burst(sc, 'astral', x.t, 30, 160, { shape: 'star' }); G.shake = 1.3; },
  orbitklinge: async (sc, x) => { await sc.tween(0.6, k => { for (let i = 0; i < 2; i++) { const an = k * 16 + i * 3.14; spawn(sc, 'astral', x.t.x + Math.cos(an) * 26, x.t.y + Math.sin(an) * 10, 0, 0, { shape: 'shard', life: 0.15, sz: 3.5, g: 0 }); } }); await claws(sc, x.t, '#d8c8ff', { n: 2, len: 26, cross: true }); },
  schwerelos: async (sc, x) => { await Promise.all([sc.tween(1, k => (x.o.y = -bell(k) * 18)), rise(sc, 'astral', x.a, 1, { shape: 'star' }), tint(sc, '#140c3a', 0.3, 1)]); },
  kosmosstrahl: async (sc, x) => { await tint(sc, '#05030c', 0.5, 0.3); await Promise.all([tint(sc, '#140c3a', 0.5, 1), (async () => { await charge(sc, 'astral', x.a, 0.4, 44); await beam(sc, 'astral', x.a, x.t, 0.6); })()]); burst(sc, 'astral', x.t, 26, 140, { shape: 'star' }); },
  meteorsturz: async (sc, x) => { await tint(sc, '#3a1a0a', 0.4, 0.3); for (let i = 0; i < 3; i++) { meteor(sc, i === 1 ? 'feuer' : 'erde', { x: x.t.x + (i - 1) * 16, y: x.t.y }, 5 + i, 0.45); await wait(140); } await wait(380); G.shake = 1.7; burst(sc, 'erde', x.t, 26, 160, { shape: 'rock' }); await nova(sc, x.t, '#ff8a2a', 0.35, 0.4); },
  supernova: async (sc, x) => { await tint(sc, '#000000', 0.7, 0.4); await Promise.all([tint(sc, '#05030c', 0.6, 1.4), (async () => { await charge(sc, 'astral', x.a, 0.55, 50); await orb(sc, 'astral', x.a, x.t, { dur: 0.45, arc: 10, r: 7 }); await Promise.all([nova(sc, x.t, '#ffffff', 0.7, 1.4), flash(sc, '#ffffff', 0.4)]); })()]); burst(sc, 'astral', x.t, 40, 200, { shape: 'star' }); G.shake = 2; },
  ereignishorizont: async (sc, x) => { await tint(sc, '#000000', 0.6, 0.3); await Promise.all([tint(sc, '#000000', 0.55, 1.5), blackhole(sc, x.t, 1.4, x.to)]); await flash(sc, '#d8c8ff', 0.3); },
};

// Spielt die passende Animation; false = keine eigene vorhanden (dann alter Ablauf)
export async function signature(sc, id, x) {
  const f = A[id]; if (!f) return false;
  sc.ov ||= [];
  try { await f(sc, x); } finally { x.o.x = 0; x.o.y = 0; x.o.s = x.o.s || 1; if (x.to) { x.to.x = 0; } }
  return true;
}
export const SIGNATURES = Object.keys(A);
