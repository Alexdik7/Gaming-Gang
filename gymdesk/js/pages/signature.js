// @ts-check
/* Unterschriftsfeld: Pointer Events (Finger, Apple Pencil, Maus), Druckstärke, geglättete Linien,
   scharf auf Retina, Größe passt sich an. Kein Scrollen beim Schreiben (touch-action: none). */
import { h } from '../core/ui.js';

/** @param {{onChange?:(empty:boolean)=>void}} [o] */
export function signaturePad(o = {}) {
  const canvas = /** @type {HTMLCanvasElement} */ (h('canvas', { class: 'sig-canvas', 'aria-label': 'Unterschriftsfeld – hier mit Finger oder Stift unterschreiben' }));
  const line = h('div', { class: 'sig-line' }, h('span', null, '✕'), h('i'));
  const wrap = h('div', { class: 'sig-wrap' }, canvas, line, h('p', { class: 'sig-hint' }, 'Hier unterschreiben'));
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  /** @type {{x:number,y:number,p:number}[][]} */ let strokes = [];
  /** @type {{x:number,y:number,p:number}[]|null} */ let cur = null;
  let w = 0, hgt = 0;

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    w = r.width; hgt = r.height;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(hgt * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }
  function redraw() {
    ctx.clearRect(0, 0, w, hgt);
    for (const s of strokes) drawStroke(s, 0);
  }
  /** @param {{x:number,y:number,p:number}[]} s @param {number} from */
  function drawStroke(s, from) {
    ctx.strokeStyle = '#0f172a'; ctx.fillStyle = '#0f172a'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (s.length === 1) { ctx.beginPath(); ctx.arc(s[0].x * w, s[0].y * hgt, 1.6, 0, 7); ctx.fill(); return; }
    for (let i = Math.max(1, from); i < s.length; i++) {
      const a = s[i - 1], b = s[i], pa = s[i - 2] || a;
      ctx.lineWidth = 1.4 + 2.6 * b.p;
      ctx.beginPath();
      ctx.moveTo(((pa.x + a.x) / 2) * w, ((pa.y + a.y) / 2) * hgt);
      ctx.quadraticCurveTo(a.x * w, a.y * hgt, ((a.x + b.x) / 2) * w, ((a.y + b.y) / 2) * hgt);
      ctx.stroke();
    }
  }
  /** @param {PointerEvent} e */
  function pt(e) {
    const r = canvas.getBoundingClientRect();
    const p = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : e.pointerType === 'touch' ? 0.55 : 0.5;
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, p };
  }
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    cur = [pt(e)]; strokes.push(cur);
    wrap.classList.add('signed');
    drawStroke(cur, 0);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!cur) return;
    e.preventDefault();
    const evs = /** @type {any} */ (e).getCoalescedEvents?.() || [e];
    const start = cur.length;
    for (const ce of evs) cur.push(pt(ce));
    drawStroke(cur, start);
  });
  const end = () => { if (cur) { cur = null; o.onChange?.(isEmpty()); } };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const isEmpty = () => strokes.reduce((n, s) => n + s.length, 0) < 8;
  return {
    el: wrap,
    isEmpty,
    clear() { strokes = []; redraw(); wrap.classList.remove('signed'); o.onChange?.(true); },
    /** Exportiert zugeschnitten auf die Unterschrift (PNG mit weißem Hintergrund). */
    toDataURL() {
      let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
      for (const s of strokes) for (const p of s) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
      const pad = 16, W = 900, scale = W / w;
      const cw = Math.max(80, (x1 - x0) * w * scale + pad * 2), ch = Math.max(60, (y1 - y0) * hgt * scale + pad * 2);
      const c = document.createElement('canvas'); c.width = Math.round(cw); c.height = Math.round(ch);
      const g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      g.strokeStyle = '#0f172a'; g.lineCap = 'round'; g.lineJoin = 'round';
      const X = (/** @type {number} */ v) => (v - x0) * w * scale + pad, Y = (/** @type {number} */ v) => (v - y0) * hgt * scale + pad;
      for (const s of strokes) for (let i = 1; i < s.length; i++) {
        const a = s[i - 1], b = s[i], pa = s[i - 2] || a;
        g.lineWidth = (1.4 + 2.6 * b.p) * scale;
        g.beginPath(); g.moveTo(X((pa.x + a.x) / 2), Y((pa.y + a.y) / 2));
        g.quadraticCurveTo(X(a.x), Y(a.y), X((a.x + b.x) / 2), Y((a.y + b.y) / 2)); g.stroke();
      }
      return c.toDataURL('image/png');
    },
    destroy() { ro.disconnect(); },
  };
}
