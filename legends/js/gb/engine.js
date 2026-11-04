// Mini-Engine im Handheld-Stil: 240×160 logische Pixel, Szenen-Stapel, Steuerkreuz/A/B/START/SELECT
export const W = 240, H = 160;
// Auflösung des Canvas: so viele echte Bildschirmpixel pro Spielpixel wie das Gerät hat (scharf und flüssig)
export let SCALE = 3;
// Position auf die feinste darstellbare Stufe runden (1/SCALE Spielpixel) → ruckelfreies Scrollen
export const snap = v => Math.round(v * SCALE) / SCALE;
export const FONT = '"Pixelify Sans", "Trebuchet MS", sans-serif';
export const COL = {
  ink: '#28283a', inkSoft: '#6a6a80', paper: '#f8f8f0', frame: '#3a6ea8', frame2: '#8fc8f8', shadow: '#c8c8d8',
  hpG: '#48d058', hpY: '#f8c030', hpR: '#f05040', xp: '#40a8f8',
};

export const G = {
  canvas: null, ctx: null, scenes: [], t: 0, fadeA: 0, fadeTo: 0, fadeRes: null, shake: 0,
};

export function initEngine(canvas) {
  G.canvas = canvas; G.ctx = canvas.getContext('2d');
  fitCanvas();
  addEventListener('resize', fitCanvas);
  addEventListener('orientationchange', () => setTimeout(fitCanvas, 300));
}
export function fitCanvas() {
  const c = G.canvas; if (!c) return;
  const css = c.getBoundingClientRect().width || W * 3, dpr = window.devicePixelRatio || 1;
  const s = Math.max(2, Math.min(8, Math.ceil((css * dpr) / W)));
  if (s !== SCALE || c.width !== W * s) { SCALE = s; c.width = W * s; c.height = H * s; }
  G.ctx.imageSmoothingEnabled = false;
}

// ---------------------------------------------------------------- Eingabe
const BTN = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'];
const held = {}, pressedNow = {}, rep = {};
BTN.forEach(b => (held[b] = false));
export const input = {
  held: b => held[b],
  pressed: b => !!pressedNow[b],
  // Menüwiederholung für Richtungen
  repeat: b => {
    if (pressedNow[b]) return true;
    if (!held[b]) return false;
    const r = rep[b]; if (!r) return false;
    if (G.t - r.t > r.d) { r.t = G.t; r.d = 0.09; return true; }
    return false;
  },
  dir() { for (const d of ['up', 'down', 'left', 'right']) if (held[d]) return d; return null; },
  tap: null, // {x,y} in logischen Koordinaten, ein Frame lang
};
export function press(b) { if (!held[b]) { pressedNow[b] = true; rep[b] = { t: G.t, d: 0.32 }; } held[b] = true; }
export function release(b) { held[b] = false; }
export function endFrame() { for (const b of BTN) pressedNow[b] = false; input.tap = null; }

const KEYS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  KeyZ: 'a', KeyJ: 'a', Space: 'a', KeyX: 'b', KeyK: 'b', Backspace: 'b', ShiftLeft: 'b', Enter: 'start', Escape: 'start', KeyC: 'select', Tab: 'select',
};
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  const b = KEYS[e.code]; if (!b) return; e.preventDefault(); if (!e.repeat) press(b);
});
addEventListener('keyup', e => { const b = KEYS[e.code]; if (b) release(b); });
addEventListener('blur', () => BTN.forEach(release));

// Bildschirmtasten (Mehrfach-Touch, Steuerkreuz mit Wischen)
export function bindPad(root) {
  const pads = root.querySelectorAll('[data-btn]');
  const active = new Map(); // pointerId -> btn
  const dpad = root.querySelector('.dpad');
  const dirFrom = (el, x, y) => {
    const r = el.getBoundingClientRect(), dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < r.width * 0.12) return null;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  };
  const set = (id, b) => {
    const old = active.get(id);
    if (old === b) return;
    if (old) release(old);
    if (b) { press(b); active.set(id, b); navigator.vibrate?.(8); } else active.delete(id);
    root.querySelectorAll('.on').forEach(e => e.classList.remove('on'));
    for (const v of active.values()) root.querySelector(`[data-btn="${v}"], .dpad [data-d="${v}"]`)?.classList.add('on');
  };
  dpad.addEventListener('pointerdown', e => { dpad.setPointerCapture(e.pointerId); set(e.pointerId, dirFrom(dpad, e.clientX, e.clientY)); e.preventDefault(); });
  dpad.addEventListener('pointermove', e => { if (active.has(e.pointerId) || e.buttons) set(e.pointerId, dirFrom(dpad, e.clientX, e.clientY)); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) dpad.addEventListener(ev, e => set(e.pointerId, null));
  pads.forEach(p => {
    p.addEventListener('pointerdown', e => { p.setPointerCapture(e.pointerId); set(e.pointerId, p.dataset.btn); e.preventDefault(); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) p.addEventListener(ev, e => set(e.pointerId, null));
  });
  // Antippen des Bildschirms (für Menüs)
  G.canvas.addEventListener('pointerdown', e => {
    const r = G.canvas.getBoundingClientRect();
    input.tap = { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  });
}

// ---------------------------------------------------------------- Szenen
export function push(s) { G.scenes.push(s); s.enter?.(); return s; }
export function pop(s) { const i = s ? G.scenes.lastIndexOf(s) : G.scenes.length - 1; if (i >= 0) { const [x] = G.scenes.splice(i, 1); x.exit?.(); } }
export const top = () => G.scenes[G.scenes.length - 1];

export function fade(to, ms = 250) {
  return new Promise(res => { G.fadeTo = to; G.fadeSpeed = 1000 / ms; G.fadeRes = res; });
}
export const wait = ms => new Promise(r => setTimeout(r, ms));
// Kampf-Übergang: schwarze Balken schieben sich abwechselnd von links und rechts ins Bild
export function wipe(ms = 550) { return new Promise(res => { G.wipe = { t: 0, dur: ms / 1000, res }; }); }

export function frame(dt) {
  G.t += dt;
  const s = top();
  if (s && !G.fadeRes) s.update?.(dt);
  const ctx = G.ctx;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  // ab der letzten nicht-transparenten Szene zeichnen
  let start = Math.max(0, G.scenes.length - 1);
  while (start > 0 && G.scenes[start].overlay) start--;
  if (G.shake > 0) { G.shake = Math.max(0, G.shake - dt * 3); ctx.translate((Math.random() - 0.5) * G.shake * 6, (Math.random() - 0.5) * G.shake * 4); }
  for (let i = start; i < G.scenes.length; i++) G.scenes[i].draw?.(ctx);
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  if (G.fadeA !== G.fadeTo || G.fadeRes) {
    const d = G.fadeTo - G.fadeA, st = dt * G.fadeSpeed;
    G.fadeA = Math.abs(d) <= st ? G.fadeTo : G.fadeA + Math.sign(d) * st;
    if (G.fadeA === G.fadeTo && G.fadeRes) { const r = G.fadeRes; G.fadeRes = null; r(); }
  }
  if (G.fadeA > 0) { ctx.fillStyle = `rgba(0,0,0,${G.fadeA})`; ctx.fillRect(0, 0, W, H); }
  if (G.wipe) {
    const wp = G.wipe; wp.t += dt; const k = Math.min(1, wp.t / wp.dur), n = 10, bh = H / n;
    ctx.fillStyle = '#000';
    for (let i = 0; i < n; i++) {
      const ki = Math.max(0, Math.min(1, k * 1.6 - (i % 2 ? 0.25 : 0) - Math.abs(i - n / 2) * 0.03)), w = W * (1 - Math.pow(1 - ki, 3));
      if (i % 2) ctx.fillRect(W - w, i * bh, w + 1, bh + 0.5); else ctx.fillRect(0, i * bh, w + 1, bh + 0.5);
    }
    if (k >= 1) { G.wipe = null; G.fadeA = G.fadeTo = 1; wp.res(); }
  }
  endFrame();
}

// ---------------------------------------------------------------- Zeichenhilfen
export function font(size = 8, bold = false) { G.ctx.font = `${bold ? 700 : 500} ${size}px ${FONT}`; }
export function text(str, x, y, color = COL.ink, size = 8, align = 'left', shadow = COL.shadow, bold = false) {
  const c = G.ctx; font(size, bold); c.textAlign = align; c.textBaseline = 'top';
  if (shadow) { c.fillStyle = shadow; c.fillText(str, x + 0.6, y + 0.6); }
  c.fillStyle = color; c.fillText(str, x, y);
}
export function measure(str, size = 8) { font(size); return G.ctx.measureText(str).width; }
export function wrap(str, maxW, size = 8) {
  const out = [];
  for (const para of String(str).split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      const t = line ? line + ' ' + w : w;
      if (measure(t, size) > maxW && line) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  return out;
}
export function box(x, y, w, h, style = 'default') {
  const c = G.ctx;
  const th = { default: [COL.frame, COL.frame2, COL.paper], dark: ['#202838', '#506080', '#283048'], gold: ['#a87818', '#f8d870', COL.paper], red: ['#a83838', '#f89090', COL.paper] }[style];
  c.fillStyle = th[0]; rr(x, y, w, h, 3); c.fill();
  c.fillStyle = th[1]; rr(x + 1, y + 1, w - 2, h - 2, 2.5); c.fill();
  c.fillStyle = th[2]; rr(x + 2.5, y + 2.5, w - 5, h - 5, 2); c.fill();
}
export function rr(x, y, w, h, r) { const c = G.ctx; c.beginPath(); c.roundRect(x, y, w, h, r); }
export function cursor(x, y) {
  const c = G.ctx, b = Math.sin(G.t * 8) > 0 ? 1 : 0;
  c.fillStyle = COL.ink; c.beginPath(); c.moveTo(x + b, y); c.lineTo(x + 5 + b, y + 3.5); c.lineTo(x + b, y + 7); c.fill();
}
export function bar(x, y, w, h, frac, kind = 'hp') {
  const c = G.ctx; frac = Math.max(0, Math.min(1, frac));
  c.fillStyle = '#404850'; c.fillRect(x - 1, y - 1, w + 2, h + 2);
  c.fillStyle = '#f8f8f8'; c.fillRect(x, y, w, h);
  c.fillStyle = kind === 'xp' ? COL.xp : frac > 0.5 ? COL.hpG : frac > 0.2 ? COL.hpY : COL.hpR;
  c.fillRect(x, y, Math.round(w * frac), h);
  if (kind !== 'xp') { c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(x, y, Math.round(w * frac), 1); }
}
export function inRect(p, x, y, w, h) { return p && p.x >= x && p.x < x + w && p.y >= y && p.y < y + h; }
