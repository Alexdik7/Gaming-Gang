// Kleines Animations-Werkzeugset (Vision P1/P2): Easings + DOM-Effekte über die Web Animations API.
// Rein optisch – nie in der Simulation verwenden.
export const ease = {
  outCubic: k => 1 - Math.pow(1 - k, 3),
  outBack: (k, c = 1.7) => 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2),
  outElastic: k => k === 0 || k === 1 ? k : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * (2 * Math.PI / 3)) + 1,
  inOutSine: k => -(Math.cos(Math.PI * k) - 1) / 2,
};
const ok = el => el && el.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches;
// Kurzer Größen-Schlag (z. B. Zähler, Knopf)
export function punch(el, s = 1.22, ms = 260) { if (!ok(el)) return; el.animate([{ transform: 'scale(1)' }, { transform: `scale(${s})`, offset: 0.35 }, { transform: 'scale(1)' }], { duration: ms, easing: 'cubic-bezier(.3,1.6,.5,1)' }); }
// Wackeln
export function shake(el, px = 5, ms = 320) { if (!ok(el)) return; el.animate([0, -px, px, -px * 0.6, px * 0.4, 0].map(x => ({ transform: `translateX(${x}px)` })), { duration: ms }); }
// Pulsierender Ring um ein Element (z. B. Ultimate bereit)
export function ring(el, color = '#ffd257') {
  if (!ok(el)) return; const r = el.getBoundingClientRect(), d = document.createElement('i');
  d.className = 'fxring'; Object.assign(d.style, { left: r.left + r.width / 2 + 'px', top: r.top + r.height / 2 + 'px', width: r.width + 'px', height: r.height + 'px', borderColor: color });
  document.body.appendChild(d);
  d.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(2.1)', opacity: 0 }], { duration: 650, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => d.remove();
}
// Ein Symbol fliegt im Bogen von (x,y) zu einem Ziel-Element (z. B. ◈ zum Münzzähler)
let flying = 0;
export function flyTo(x, y, target, html = '◈', cls = 'fxcoin', onEnd) {
  if (!ok(target) || flying > 8) { onEnd?.(); return; }
  const r = target.getBoundingClientRect(), tx = r.left + r.width * 0.3, ty = r.top + r.height / 2, d = document.createElement('i');
  d.className = cls; d.innerHTML = html; d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d); flying++;
  const mx = (x + tx) / 2 + (Math.random() - 0.5) * 60, my = Math.min(y, ty) - 40 - Math.random() * 40;
  d.animate([{ transform: 'translate(-50%,-50%) scale(.6)', offset: 0 }, { transform: `translate(calc(-50% + ${mx - x}px), calc(-50% + ${my - y}px)) scale(1.15)`, offset: 0.45 }, { transform: `translate(calc(-50% + ${tx - x}px), calc(-50% + ${ty - y}px)) scale(.7)`, offset: 1 }],
    { duration: 520 + Math.random() * 120, easing: 'cubic-bezier(.5,0,.6,1)' }).onfinish = () => { d.remove(); flying--; onEnd?.(); };
}
