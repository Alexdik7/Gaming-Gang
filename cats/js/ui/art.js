// Zeichnungen: Katzen, Hunde, Waffen und Symbole – alles per Code (keine Bilddateien).
// Einheit: 1.0 = ein Feld. Sprites werden einmal gezeichnet und als Offscreen-Canvas gemerkt.
import { CATS } from '../data/cats.js';
import { DOGS } from '../data/dogs.js';

export const OL = '#2a2030';          // Umrissfarbe (überall gleich = einheitlicher Stil)
const LW = 0.045, TAU = Math.PI * 2;

function el(c, x, y, rx, ry, fill, stroke, rot = 0) {
  c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.stroke(); }
}
function poly(c, pts, fill, stroke, close = true) {
  c.beginPath(); c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  if (close) c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.stroke(); }
}
function rr(c, x, y, w, h, r, fill, stroke) {
  c.beginPath(); c.roundRect(x, y, w, h, r);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.stroke(); }
}
function line(c, pts, col, w) { c.save(); c.lineWidth = w; poly(c, pts, null, col, false); c.restore(); }
export function shade(hex, f) { // f<0 dunkler, f>0 heller
  const n = parseInt(hex.slice(1), 16), ch = s => { let v = n >> s & 255; v = f < 0 ? v * (1 + f) : v + (255 - v) * f; return Math.max(0, Math.min(255, Math.round(v))); };
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
const setup = c => { c.lineJoin = c.lineCap = 'round'; c.lineWidth = LW; c.strokeStyle = OL; };

// ====================================================================== KATZEN
const EYES_HIDDEN = { shades: 1, visor: 1, goggles: 1 };

export function drawCat(c, L, o = {}) {
  const fat = L.fat || 1, F = L.fur, F2 = L.fur2, dark = shade(F, -0.25);
  setup(c);
  el(c, 0, .41, .27 * fat, .065, 'rgba(0,0,0,.22)');
  // Schwanz
  c.beginPath(); c.moveTo(-.16 * fat, .3); c.bezierCurveTo(-.5 * fat, .34, -.5 * fat, -.02, -.36 * fat, -.1);
  c.lineWidth = .1 + LW * 2; c.strokeStyle = OL; c.stroke(); c.lineWidth = .1; c.strokeStyle = L.pat === 'point' ? dark : F; c.stroke(); c.lineWidth = LW; c.strokeStyle = OL;
  // Körper + Kleidung + Pfoten
  el(c, 0, .2, .22 * fat, .2, F, OL);
  if (L.cloth) { c.save(); c.beginPath(); c.ellipse(0, .2, .22 * fat, .2, 0, 0, TAU); c.clip(); c.fillStyle = L.cloth; c.fillRect(-.4, .13, .8, .4); c.fillStyle = shade(L.cloth, -.2); c.fillRect(-.03, .13, .06, .4); c.restore(); el(c, 0, .2, .22 * fat, .2, null, OL); }
  el(c, -.11 * fat, .37, .075, .05, F2, OL); el(c, .11 * fat, .37, .075, .05, F2, OL);
  // Ohren
  if (!L.noEars) for (const s of [-1, 1]) {
    poly(c, [s * .27, -.2, s * .31, -.5, s * .07, -.31], L.pat === 'point' || (L.pat === 'patch' && s < 0) ? dark : F, OL);
    poly(c, [s * .245, -.27, s * .27, -.42, s * .14, -.31], '#f7a7b7');
  }
  // Kopf
  el(c, 0, -.08, .31, .265, F, OL);
  c.save(); c.beginPath(); c.ellipse(0, -.08, .31, .265, 0, 0, TAU); c.clip();
  if (L.pat === 'stripes') { c.fillStyle = dark; for (const x of [-.09, 0, .09]) rr(c, x - .022, -.37, .044, x ? .1 : .13, .02, dark); for (const s of [-1, 1]) { rr(c, s * .3 - .06, -.08, .12, .035, .015, dark); rr(c, s * .3 - .06, -.01, .12, .035, .015, dark); } }
  if (L.pat === 'patch') el(c, -.17, -.17, .15, .14, dark);
  if (L.pat === 'point') el(c, 0, .0, .15, .13, dark);
  if (L.pat === 'stars') { c.fillStyle = '#fff'; for (const [x, y] of [[-.2, -.22], [.18, -.25], [.24, -.02], [-.25, .0], [0, -.3]]) el(c, x, y, .014, .014, '#fff'); }
  c.restore();
  // Schnauze
  el(c, 0, .035, .115, .078, L.pat === 'point' ? shade(F2, .3) : F2);
  poly(c, [-.028, -.012, .028, -.012, 0, .02], '#f58aa0', OL);
  c.lineWidth = .025; c.beginPath(); c.moveTo(0, .02); c.quadraticCurveTo(-.045, .075, -.07, .04); c.moveTo(0, .02); c.quadraticCurveTo(.045, .075, .07, .04); c.stroke();
  c.lineWidth = .016; for (const s of [-1, 1]) { line(c, [s * .15, .03, s * .33, .0], OL, .016); line(c, [s * .15, .055, s * .33, .07], OL, .016); }
  c.lineWidth = LW;
  // Augen
  if (!EYES_HIDDEN[L.acc]) for (const s of [-1, 1]) {
    if (o.blink) { line(c, [s * .07, -.08, s * .18, -.08], OL, .035); continue; }
    el(c, s * .125, -.085, .062, .075, L.eye, OL);
    el(c, s * .125, -.08, .03, .058, '#1a1420');
    el(c, s * .105, -.11, .018, .018, '#fff');
    line(c, [s * .06, -.18, s * .19, -.155], OL, .035);      // entschlossene Braue
  }
  (ACC[L.acc] || (() => {}))(c, L);
}

const ACC = {
  cap(c, L) { c.beginPath(); c.ellipse(0, -.26, .26, .15, 0, Math.PI, TAU); c.closePath(); c.fillStyle = L.cloth; c.fill(); c.stroke(); rr(c, .02, -.285, .32, .06, .03, shade(L.cloth, -.2), OL); el(c, 0, -.4, .03, .025, shade(L.cloth, .3), OL); },
  helmet(c, L) { c.beginPath(); c.ellipse(0, -.2, .31, .22, 0, Math.PI, TAU); c.closePath(); c.fillStyle = L.cloth; c.fill(); c.stroke(); rr(c, -.33, -.225, .66, .05, .02, shade(L.cloth, -.2), OL); el(c, -.12, -.32, .06, .03, shade(L.cloth, .3), null, -.5); },
  earmuffs(c, L) { c.lineWidth = .06; c.beginPath(); c.arc(0, -.1, .33, Math.PI * 1.1, Math.PI * 1.9); c.strokeStyle = OL; c.stroke(); c.lineWidth = LW; for (const s of [-1, 1]) el(c, s * .32, -.07, .075, .1, L.cloth, OL); },
  bandana(c, L) { rr(c, -.31, -.27, .62, .085, .04, L.cloth, OL); poly(c, [.28, -.24, .45, -.3, .4, -.2], L.cloth, OL); poly(c, [.28, -.22, .44, -.14, .36, -.12], L.cloth, OL); },
  beret(c, L) { el(c, -.03, -.31, .27, .1, L.cloth, OL, -.15); el(c, -.03, -.41, .03, .03, L.cloth, OL); },
  goggles(c) { rr(c, -.31, -.14, .62, .05, .02, '#4a3a2a', OL); for (const s of [-1, 1]) { el(c, s * .125, -.09, .09, .085, '#ffb02e', OL); el(c, s * .1, -.12, .03, .025, '#fff3c0'); } },
  tophat(c, L) { rr(c, -.25, -.33, .5, .06, .03, L.cloth, OL); rr(c, -.16, -.6, .32, .29, .03, L.cloth, OL); rr(c, -.16, -.4, .32, .06, 0, '#e2b33c'); el(c, .2, -.03, .07, .07, 'rgba(255,255,255,.25)', '#e2b33c'); },
  nurse(c) { c.beginPath(); c.moveTo(-.2, -.26); c.lineTo(-.24, -.44); c.lineTo(.24, -.44); c.lineTo(.2, -.26); c.closePath(); c.fillStyle = '#fff'; c.fill(); c.stroke(); rr(c, -.025, -.41, .05, .13, .01, '#e2334d'); rr(c, -.065, -.37, .13, .05, .01, '#e2334d'); },
  topknot(c, L) { el(c, 0, -.38, .08, .07, '#2a2030', OL); rr(c, -.07, -.345, .14, .03, .01, '#e2334d'); },
  hardhat(c, L) { c.beginPath(); c.ellipse(0, -.22, .28, .2, 0, Math.PI, TAU); c.closePath(); c.fillStyle = L.cloth; c.fill(); c.stroke(); rr(c, -.34, -.245, .68, .055, .025, shade(L.cloth, -.15), OL); rr(c, -.035, -.43, .07, .2, .02, shade(L.cloth, .35), OL); },
  shades(c) { rr(c, -.3, -.135, .6, .03, .01, OL); for (const s of [-1, 1]) { rr(c, s * .125 - .095, -.14, .19, .115, .04, '#15151c', OL); line(c, [s * .125 - .05, -.115, s * .125 + .01, -.06], '#6f7a99', .025); } c.beginPath(); c.ellipse(0, -.26, .27, .13, 0, Math.PI, TAU); c.closePath(); c.fillStyle = '#2f5d3a'; c.fill(); c.stroke(); rr(c, -.3, -.285, .6, .055, .02, '#1f3f27', OL); poly(c, [0, -.38, .025, -.33, .075, -.33, .035, -.3, .05, -.25, 0, -.28, -.05, -.25, -.035, -.3, -.075, -.33, -.025, -.33], '#ffd23f'); },
  coil(c) { for (const s of [-1, 1]) poly(c, [s * .1, -.32, s * .2, -.5, s * .02, -.4], '#fff6a0', OL); for (const s of [-1, 1]) { el(c, s * .125, -.085, .085, .085, 'rgba(120,220,255,.35)', OL); } rr(c, -.04, -.1, .08, .025, .01, OL); },
  lab(c) { for (const [x, y, r] of [[-.25, -.3, .09], [-.1, -.38, .1], [.08, -.38, .1], [.25, -.3, .09]]) el(c, x, y, r, r, '#f4f4f4', OL); el(c, 0, -.3, .2, .08, '#f4f4f4'); for (const s of [-1, 1]) el(c, s * .125, -.085, .09, .09, 'rgba(255,255,255,.3)', OL); rr(c, -.04, -.1, .08, .025, .01, OL); },
  pilot(c, L) { c.beginPath(); c.ellipse(0, -.16, .32, .24, 0, Math.PI * .95, Math.PI * 2.05); c.closePath(); c.fillStyle = '#7a4a2a'; c.fill(); c.stroke(); for (const s of [-1, 1]) { el(c, s * .1, -.3, .075, .06, '#bfe6ff', OL); el(c, s * .31, -.02, .05, .11, '#7a4a2a', OL); } },
  hood(c, L) { c.beginPath(); c.ellipse(0, -.08, .315, .27, 0, Math.PI * .98, Math.PI * 2.02); c.closePath(); c.fillStyle = L.cloth; c.fill(); c.beginPath(); c.ellipse(0, -.08, .315, .27, 0, Math.PI * .1, Math.PI * .9); c.closePath(); c.fill(); el(c, 0, -.08, .31, .265, null, OL); rr(c, -.31, -.2, .62, .04, .01, '#d83a3a'); poly(c, [.29, -.18, .46, -.24, .42, -.13], '#d83a3a', OL); },
  cloak(c, L) { c.beginPath(); c.moveTo(-.33, .0); c.quadraticCurveTo(-.36, -.42, 0, -.46); c.quadraticCurveTo(.36, -.42, .33, .0); c.quadraticCurveTo(.2, -.28, 0, -.29); c.quadraticCurveTo(-.2, -.28, -.33, .0); c.fillStyle = L.cloth; c.fill(); c.stroke(); },
  visor(c, L) { rr(c, -.31, -.15, .62, .12, .05, '#20202a', OL); rr(c, -.26, -.125, .52, .065, .03, L.eye); el(c, -.15, -.1, .05, .012, '#fff'); },
  pharaoh(c, L) { for (const s of [-1, 1]) { poly(c, [s * .2, -.3, s * .42, -.05, s * .36, .22, s * .22, .16, s * .29, -.05], L.cloth, OL); line(c, [s * .34, -.08, s * .27, -.02], '#2a5fb0', .04); line(c, [s * .36, .04, s * .27, .07], '#2a5fb0', .04); } c.beginPath(); c.ellipse(0, -.2, .29, .2, 0, Math.PI, TAU); c.closePath(); c.fillStyle = L.cloth; c.fill(); c.stroke(); for (const x of [-.16, 0, .16]) rr(c, x - .02, -.38, .04, .16, .01, '#2a5fb0'); el(c, 0, -.4, .04, .05, '#e2334d', OL); },
  halo(c) { c.lineWidth = .04; c.beginPath(); c.ellipse(0, -.47, .2, .055, 0, 0, TAU); c.strokeStyle = '#7df9ff'; c.stroke(); c.lineWidth = LW; c.strokeStyle = OL; }
};

// Waffen zeigen nach rechts (Winkel 0) und werden beim Zeichnen zum Ziel gedreht.
const GUN = {   // [Länge, Dicke, Farbe, Lauf-Farbe]
  rifle: [.62, .07, '#6b4a2f', '#3a3a44'], minigun: [.42, .13, '#4a4a56', '#22222a'], flamer: [.4, .11, '#b03a2a', '#3a3a44'],
  launcher: [.5, .16, '#4f6a4a', '#2c3a2a'], laser: [.44, .1, '#e8e8f0', '#ff2e63'], turret: [.3, .09, '#6a7280', '#33363f']
};
export function drawWeapon(c, kind) {
  setup(c);
  const g = GUN[kind];
  if (g) {
    rr(c, -.08, -g[1] / 2, g[0] * .55, g[1], .03, g[2], OL);
    rr(c, g[0] * .4, -g[1] * .32, g[0] * .6, g[1] * .64, .02, g[3], OL);
    if (kind === 'minigun') for (const y of [-.035, .035]) rr(c, .16, y - .012, .28, .024, .01, '#8a8a99');
    if (kind === 'flamer') { el(c, -.1, .07, .07, .07, '#e2b33c', OL); poly(c, [.42, -.05, .5, 0, .42, .05], '#ffb02e', OL); }
    if (kind === 'launcher') poly(c, [.5, -.06, .6, 0, .5, .06], '#e2334d', OL);
    if (kind === 'laser') el(c, .45, 0, .04, .04, '#ff8fb0', OL);
    if (kind === 'rifle') { rr(c, .1, -.1, .12, .04, .01, '#22222a', OL); poly(c, [-.08, -.035, -.22, -.02, -.22, .07, -.08, .035], g[2], OL); }
    return;
  }
  if (kind === 'slingshot') { line(c, [0, 0, .2, 0], '#7a4a2a', .06); line(c, [.2, 0, .32, -.11], '#7a4a2a', .05); line(c, [.2, 0, .32, .11], '#7a4a2a', .05); line(c, [.32, -.11, .22, 0, .32, .11], '#e2334d', .02); }
  else if (kind === 'bomb') { el(c, .2, 0, .11, .11, '#2c2c36', OL); el(c, .17, -.04, .03, .025, '#6a6a7a'); line(c, [.28, -.07, .34, -.14], '#b98a4a', .03); el(c, .35, -.15, .03, .03, '#ffb02e'); }
  else if (kind === 'flask') { poly(c, [.14, -.03, .2, -.03, .2, -.08, .26, -.08, .26, -.03, .34, .1, .08, .1], 'rgba(200,255,220,.5)', OL); poly(c, [.13, .03, .31, .03, .34, .1, .08, .1], '#7ae04a'); }
  else if (kind === 'wrench') { line(c, [0, 0, .3, 0], OL, .1); line(c, [0, 0, .3, 0], '#aab3c2', .055); el(c, .32, 0, .07, .07, '#aab3c2', OL); rr(c, .32, -.025, .09, .05, 0, '#fff0'); }
  else if (kind === 'shuriken') { c.save(); c.translate(.24, 0); poly(c, [0, -.11, .03, -.03, .11, 0, .03, .03, 0, .11, -.03, .03, -.11, 0, -.03, -.03], '#c9d1dc', OL); el(c, 0, 0, .02, .02, OL); c.restore(); }
  else if (kind === 'claw') { for (const y of [-.06, 0, .06]) poly(c, [.12, y - .02, .34, y, .12, y + .02], '#c77dff', OL); }
  else if (kind === 'baton') { line(c, [0, 0, .34, -.0], OL, .075); line(c, [0, 0, .34, 0], '#7a4a2a', .035); poly(c, [.2, -.02, .44, -.14, .44, .02], '#e2334d', OL); }
  else if (kind === 'tesla') { line(c, [0, 0, .28, 0], OL, .08); line(c, [0, 0, .28, 0], '#b98a4a', .04); el(c, .3, 0, .075, .075, '#7df0ff', OL); el(c, .28, -.02, .025, .025, '#fff'); }
  else if (kind === 'sunstaff') { line(c, [-.1, 0, .32, 0], OL, .075); line(c, [-.1, 0, .32, 0], '#e2b33c', .035); el(c, .36, 0, .085, .085, '#ffd23f', OL); el(c, .36, 0, .04, .04, '#fff6c0'); }
  else if (kind === 'orb') { el(c, .26, 0, .1, .1, '#3d2a7a', OL); el(c, .26, 0, .055, .055, '#7df9ff'); el(c, .23, -.03, .02, .02, '#fff'); }
  else if (kind === 'coinbag') { el(c, .22, .04, .11, .12, '#c9a05a', OL); rr(c, .16, -.1, .12, .05, .02, '#8a6a3a', OL); c.fillStyle = OL; c.font = 'bold .13px sans-serif'; c.textAlign = 'center'; c.fillText('$', .22, .09); }
  else if (kind === 'medkit') { rr(c, .1, -.08, .22, .17, .03, '#fff', OL); rr(c, .19, -.05, .04, .11, .005, '#e2334d'); rr(c, .155, -.015, .11, .04, .005, '#e2334d'); }
  else if (kind === 'snow') { line(c, [0, 0, .26, 0], OL, .07); line(c, [0, 0, .26, 0], '#bfe3ff', .03); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; line(c, [.3, 0, .3 + Math.cos(a) * .09, Math.sin(a) * .09], '#eaf6ff', .03); } el(c, .3, 0, .03, .03, '#fff'); }
}
const STATIC_WEAPON = { bomb: 1, flask: 1, coinbag: 1, medkit: 1, snow: 1, baton: 1, tesla: 1, sunstaff: 1, orb: 1, wrench: 1, claw: 1, shuriken: 1, slingshot: 0 };
export const weaponAims = kind => !STATIC_WEAPON[kind];

// ====================================================================== HUNDE (Seitenansicht, schauen nach rechts)
export function drawDog(c, L, frame = 0, o = {}) {
  setup(c);
  const C = L.c, C2 = L.c2, dark = shade(C, -.28), ph = frame * Math.PI / 2;
  const by = L.slim ? .12 : L.flat ? .2 : .16, bx = L.long ? .4 : .31, leg = L.long ? .12 : L.slim ? .26 : .2;
  el(c, 0, .36, bx * 1.05, .06, 'rgba(0,0,0,.22)');
  // Schwanz (wedelt)
  const wag = Math.sin(ph) * .08;
  c.beginPath(); c.moveTo(-bx + .04, .02); c.quadraticCurveTo(-bx - .12, -.1, -bx - .08 + wag, -.26);
  c.lineWidth = .075 + LW * 2; c.strokeStyle = OL; c.stroke(); c.lineWidth = .075; c.strokeStyle = C; c.stroke(); c.lineWidth = LW; c.strokeStyle = OL;
  // Beine (hinten dunkler)
  const sw = Math.sin(ph) * .07;
  for (const [x, s, col] of [[-bx * .62, -sw, dark], [bx * .55, sw, dark], [-bx * .45, sw, C], [bx * .72, -sw, C]]) {
    rr(c, x + s - .05, .36 - leg - .04, .1, leg + .04, .04, col, OL);
  }
  // Körper
  el(c, 0, .08, bx, by, C, OL);
  c.save(); c.beginPath(); c.ellipse(0, .08, bx, by, 0, 0, TAU); c.clip();
  el(c, .05, .08 + by * .9, bx * .8, by * .6, C2);
  if (L.spots) for (const [x, y, r] of [[-.15, .0, .06], [.05, .1, .05], [-.02, -.06, .04], [.18, -.02, .045]]) el(c, x, y, r, r, C2);
  c.restore();
  (DACC_BODY[L.acc] || (() => {}))(c, L, bx, by);
  // Kopf
  const hx = bx * .92, hy = -.1, hr = L.flat ? .19 : .17;
  if (L.ear === 'point' || L.ear === 'bat' || L.ear === 'crop') { const h = L.ear === 'bat' ? .26 : L.ear === 'crop' ? .13 : .18, w = L.ear === 'bat' ? .13 : .08; poly(c, [hx - .13, hy - .08, hx - .1, hy - .1 - h, hx - .13 + w, hy - .13], dark, OL); }
  el(c, hx, hy, hr, hr * .95, C, OL);
  el(c, hx + (L.flat ? .1 : .14), hy + .045, L.flat ? .09 : .115, .075, C2, OL);
  el(c, hx + (L.flat ? .17 : .245), hy + .01, .035, .03, '#1a1420');
  line(c, [hx + .1, hy + .09, hx + .2, hy + .085], OL, .022);
  if (L.acc === 'mask2') el(c, hx - .02, hy - .06, .13, .09, dark);
  // Auge + böse Braue
  if (L.acc === 'robot') { rr(c, hx - .02, hy - .075, .13, .05, .02, C2, OL); }
  else { el(c, hx + .04, hy - .045, .035, .04, '#fff', OL); el(c, hx + .05, hy - .04, .018, .022, '#1a1420'); line(c, [hx - .03, hy - .115, hx + .09, hy - .075], OL, .035); }
  // Ohr
  if (L.ear === 'flop') el(c, hx - .1, hy + .0, .065, .115, dark, OL, .3);
  else if (L.ear === 'long') el(c, hx - .09, hy + .07, .06, .17, dark, OL, .15);
  else if (L.ear === 'back') poly(c, [hx - .08, hy - .12, hx - .27, hy - .13, hx - .1, hy - .03], dark, OL);
  else if (L.ear === 'fold') poly(c, [hx - .12, hy - .14, hx - .02, hy - .19, hx - .03, hy - .06], dark, OL);
  else if (L.ear === 'puff') { el(c, hx - .1, hy - .02, .1, .11, '#fff', OL); el(c, hx, hy - .17, .09, .08, '#fff', OL); }
  else if (L.ear === 'antenna') { line(c, [hx - .05, hy - .15, hx - .1, hy - .32], OL, .03); el(c, hx - .1, hy - .33, .035, .035, C2, OL); }
  else if (L.ear === 'point' || L.ear === 'bat' || L.ear === 'crop') { const h = L.ear === 'bat' ? .26 : L.ear === 'crop' ? .13 : .18, w = L.ear === 'bat' ? .13 : .08; poly(c, [hx - .06, hy - .1, hx + .0, hy - .12 - h, hx - .06 + w + .03, hy - .13], C, OL); }
  (DACC_HEAD[L.acc] || (() => {}))(c, L, hx, hy, hr);
}

const DACC_BODY = {
  armor(c, L, bx, by) { rr(c, -bx * .7, .08 - by - .02, bx * 1.4, by * 1.35, .08, '#9aa3ad', OL); for (const x of [-.12, .05]) el(c, x, .02, .02, .02, '#5c6470'); line(c, [-bx * .7, .08, bx * .7, .08], '#5c6470', .025); },
  backpack(c, L, bx, by) { rr(c, -.2, -.2, .26, .2, .05, '#4f7a3a', OL); rr(c, -.16, -.13, .18, .05, .02, '#3a5a2a'); },
  vest(c, L, bx, by) { rr(c, -bx * .55, .08 - by - .01, bx * 1.1, by * 1.3, .06, '#2a3550', OL); el(c, .05, .04, .04, .045, '#ffd23f', OL); },
  cross(c) { rr(c, -.18, -.14, .24, .2, .04, '#fff', OL); rr(c, -.08, -.11, .04, .14, 0, '#e2334d'); rr(c, -.13, -.06, .14, .04, 0, '#e2334d'); },
  drum(c) { el(c, -.02, -.1, .15, .07, '#e2334d', OL); rr(c, -.17, -.1, .3, .12, 0, '#e2334d'); line(c, [-.17, -.1, -.17, .02], OL, LW); line(c, [.13, -.1, .13, .02], OL, LW); el(c, -.02, -.1, .15, .07, '#fff3d6', OL); },
  barrel(c, L, bx) { rr(c, bx * .55, .12, .16, .12, .04, '#8a5a2a', OL); line(c, [bx * .55, .16, bx * .55 + .16, .16], '#d9b36a', .025); },
  robot(c, L, bx, by) { for (const x of [-.18, 0, .18]) el(c, x, .02, .018, .018, '#4a525c'); rr(c, -.1, .08, .2, .07, .02, L.c2, OL); },
  bulldozer(c, L, bx, by) { rr(c, -bx * .5, .08 - by - .02, bx, by * .7, .05, '#f2b632', OL); for (const x of [-.1, .02]) line(c, [x, .08 - by, x + .06, .08 - by * .4], OL, .03); },
  miner(c) { }, spikes(c, L, bx) { }, crown(c, L, bx, by) { poly(c, [-bx * .8, .0, -bx * .2, -by, bx * .5, -by, bx * .55, .1, -bx * .8, .2], '#b0263a', OL); el(c, -.02, -.02, .05, .05, '#fff', OL); }
};
const DACC_HEAD = {
  armor(c, L, hx, hy, hr) { c.beginPath(); c.ellipse(hx - .01, hy - .03, hr * 1.02, hr * .9, 0, Math.PI * 1.02, Math.PI * 1.98); c.closePath(); c.fillStyle = '#9aa3ad'; c.fill(); c.stroke(); },
  hat(c, L, hx, hy, hr) { c.beginPath(); c.ellipse(hx, hy - .08, hr * .95, hr * .7, 0, Math.PI, TAU); c.closePath(); c.fillStyle = '#7a6a4a'; c.fill(); c.stroke(); rr(c, hx - .02, hy - .1, .26, .045, .02, '#5a4a30', OL); },
  mask(c, L, hx, hy) { rr(c, hx - .16, hy - .085, .3, .075, .03, '#1c1c24', OL); el(c, hx + .05, hy - .045, .03, .02, '#fff'); poly(c, [hx - .15, hy - .06, hx - .3, hy - .12, hx - .27, hy - .01], '#1c1c24', OL); },
  firehat(c, L, hx, hy, hr) { c.beginPath(); c.ellipse(hx - .01, hy - .07, hr, hr * .85, 0, Math.PI, TAU); c.closePath(); c.fillStyle = '#e2334d'; c.fill(); c.stroke(); rr(c, hx - .26, hy - .095, .48, .05, .02, '#b0263a', OL); el(c, hx + .02, hy - .15, .035, .04, '#ffd23f', OL); },
  spikes(c, L, hx, hy) { rr(c, hx - .16, hy + .1, .2, .055, .02, '#3a3a44', OL); for (const x of [-.13, -.07, -.01]) poly(c, [hx + x, hy + .15, hx + x + .025, hy + .22, hx + x + .05, hy + .15], '#c9d1dc', OL); },
  miner(c, L, hx, hy, hr) { c.beginPath(); c.ellipse(hx - .01, hy - .07, hr * .95, hr * .8, 0, Math.PI, TAU); c.closePath(); c.fillStyle = '#f2b632'; c.fill(); c.stroke(); el(c, hx + .1, hy - .14, .04, .04, '#fff6c0', OL); },
  ghost(c, L, hx, hy) { rr(c, hx - .17, hy - .1, .2, .06, .03, '#2a3040', OL); },
  bulldozer(c, L, hx, hy, hr) { c.beginPath(); c.ellipse(hx - .01, hy - .07, hr, hr * .8, 0, Math.PI, TAU); c.closePath(); c.fillStyle = '#f2b632'; c.fill(); c.stroke(); rr(c, hx + .12, hy - .02, .07, .34, .02, '#8a929c', OL); for (const y of [.02, .1, .18]) poly(c, [hx + .19, hy + y, hx + .26, hy + y + .03, hx + .19, hy + y + .06], '#c9d1dc', OL); },
  scar(c, L, hx, hy) { line(c, [hx + .0, hy - .15, hx + .09, hy + .03], '#b0263a', .03); for (const [x, y] of [[-.12, -.12], [-.17, -.02], [-.14, .08]]) poly(c, [hx + x, hy + y, hx + x - .1, hy + y - .02, hx + x - .02, hy + y + .07], shade(L.c, -.35), OL); },
  shadow(c, L, hx, hy) { el(c, hx + .04, hy - .045, .045, .05, '#c77dff', OL); el(c, hx + .05, hy - .04, .018, .022, '#fff'); for (const [x, y] of [[-.1, -.2], [-.2, -.08]]) poly(c, [hx + x, hy + y, hx + x - .09, hy + y - .1, hx + x + .03, hy + y - .03], L.c2, OL); },
  robot(c, L, hx, hy) { el(c, hx + .06, hy - .05, .025, .018, '#fff'); for (const [x, y] of [[-.1, .05], [.0, -.13]]) el(c, hx + x, hy + y, .016, .016, '#4a525c'); },
  crown(c, L, hx, hy, hr) { poly(c, [hx - .13, hy - .12, hx - .15, hy - .3, hx - .07, hy - .22, hx - .01, hy - .33, hx + .05, hy - .22, hx + .13, hy - .3, hx + .11, hy - .12], '#ffd23f', OL); for (const x of [-.07, .05]) el(c, hx + x, hy - .16, .02, .02, '#e2334d'); for (const [x, y] of [[-.13, -.02], [-.17, .08]]) poly(c, [hx + x, hy + y, hx + x - .11, hy + y + .01, hx + x - .02, hy + y + .08], shade(L.c, -.2), OL); }
};

// ====================================================================== Sprite-Cache
const cache = new Map();
function sprite(key, px, pad, draw) {
  let s = cache.get(key);
  if (s) return s;
  const size = Math.ceil(px * pad);
  s = document.createElement('canvas'); s.width = s.height = size;
  const c = s.getContext('2d');
  c.translate(size / 2, size / 2); c.scale(px, px);
  draw(c);
  cache.set(key, s);
  return s;
}
export const clearSprites = () => cache.clear();
export const catSprite = (id, px, blink) => sprite(`c:${id}:${px | 0}:${blink ? 1 : 0}`, px, 1.4, c => drawCat(c, CATS[id].look, { blink }));
export const weaponSprite = (kind, px) => sprite(`w:${kind}:${px | 0}`, px, 1.6, c => drawWeapon(c, kind));
export const dogSprite = (id, px, frame) => { const L = DOGS[id].look; return sprite(`d:${id}:${px | 0}:${frame}`, px * L.size, 1.7 / Math.min(1, L.size) * Math.min(1, L.size), c => drawDog(c, L, frame)); };

// Porträt für Menüs (Katze + Waffe), als Daten-URL
const urls = new Map();
export function catPortrait(id, px = 96) {
  const k = id + px; if (urls.has(k)) return urls.get(k);
  const s = document.createElement('canvas'); s.width = s.height = px;
  const c = s.getContext('2d'), L = CATS[id].look;
  c.translate(px / 2, px * .56); c.scale(px * .92, px * .92);
  drawCat(c, L);
  if (L.weapon && L.weapon !== 'none') { c.save(); c.translate(.2, .2); c.rotate(-.35); drawWeapon(c, L.weapon); c.restore(); }
  const u = s.toDataURL(); urls.set(k, u); return u;
}
export function dogPortrait(id, px = 96) {
  const k = 'd' + id + px; if (urls.has(k)) return urls.get(k);
  const s = document.createElement('canvas'); s.width = s.height = px;
  const c = s.getContext('2d'), L = DOGS[id].look, sc = px * .95 / Math.max(1, L.size * .85);
  c.translate(px * .45, px * .55); c.scale(sc * L.size, sc * L.size);
  drawDog(c, L, 0);
  const u = s.toDataURL(); urls.set(k, u); return u;
}
