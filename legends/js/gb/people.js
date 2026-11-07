// Menschen-Figuren 16×24 (Handheld-Stil, eigene Pixel-Art)
// - Farbrampen statt einfachem Abdunkeln: Schatten kühler und satter, Licht wärmer
// - 5 Bilder je Richtung: 0 Stand, 1 Schritt A, 2 Schritt B, 3 Durchgang (Beine beisammen), 4 Blinzeln
// - Licht von oben links, Haar-Glanz, Wangen, Ohren, Hände, Schuhe mit Sohle, selektiver Umriss
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const hex2rgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgb2hex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
function toHsl(h) {
  let [r, g, b] = hex2rgb(h).map(v => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [hh / 6, s, l];
}
function fromHsl(h, s, l) {
  h = ((h % 1) + 1) % 1; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  if (!s) return rgb2hex(l * 255, l * 255, l * 255);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = ((t % 1) + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return rgb2hex(f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255);
}
// Rampe: [tiefer Schatten, Schatten, Grundton, Licht]; Schatten wandern Richtung Blau/Violett
function ramp(c) {
  const [h, s, l] = toHsl(c), cool = h > 0.1 && h < 0.6 ? 0.02 : -0.03;
  return [fromHsl(h + cool * 2, s + 0.1, l * 0.55), fromHsl(h + cool, s + 0.06, l * 0.78), c, fromHsl(h - cool, s - 0.08, Math.min(0.92, l + (1 - l) * 0.35))];
}
const mix = (a, b, k) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k); };

export function figure(look, dir, f) {
  const [c, x] = cv(16, 24);
  const P = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  const H = ramp(look.hair), S = ramp(look.skin), O = ramp(look.outfit), L = ramp(look.pants || '#384868'), A = ramp(look.accent || '#f2d16b');
  const CP = look.cap ? ramp(look.cap) : null;
  const shoe = ['#1e1620', '#3a2a2c', '#5a4440'], eye = '#1c1830', iris = '#3a4a78', blush = mix(look.skin, '#f06070', 0.3), lid = mix('#1c1830', look.skin, 0.35);
  const stride = f === 1 || f === 2, bob = stride ? 1 : 0, blink = f === 4;
  const side = dir === 'left' || dir === 'right';
  const rows = (spans, y0, col) => spans.forEach(([a, b], i) => P(a, y0 + i + bob, b - a + 1, 1, col));

  if (!side) {
    const front = dir === 'down';
    // ---- Beine (Hüfte bei Zeile 18; bei Schritten 1 px tiefer)
    const hy = 18 + bob;
    const leg = (lx, len, col, colD, shoeW, shoeX) => { P(lx, hy, 2, len, col); P(lx + 1, hy, 1, len, colD); P(shoeX, hy + len, shoeW, 1, shoe[1]); P(shoeX, hy + len, 1, 1, shoe[2]); };
    if (f === 1) { leg(5, 3, L[2], L[1], 4, 4); leg(9, 2, L[1], L[0], 3, 9); }          // linkes Bein vorn (zum Betrachter)
    else if (f === 2) { leg(5, 2, L[1], L[0], 3, 4); leg(9, 3, L[2], L[1], 4, 8); }     // rechtes Bein vorn
    else if (f === 3) { leg(5, 4, L[2], L[1], 3, 4); leg(9, 3, L[1], L[0], 3, 9); }     // Durchgang: ein Bein angehoben
    else { leg(5, 4, L[2], L[1], 3, 4); leg(9, 4, L[2], L[1], 3, 9); }
    // ---- Rumpf
    const ty = 12 + bob;
    P(4, ty, 8, 6, O[2]); P(4, ty, 1, 5, O[3]); P(10, ty, 2, 6, O[1]); P(4, ty + 5, 8, 1, O[1]);
    P(4, ty + 5, 8, 1, L[0]); // Gürtel
    if (front) {
      P(6, ty, 4, 1, A[2]); P(7, ty, 2, 1, S[1]);                       // Kragen mit Hals
      P(7, ty + 1, 2, 4, A[2]); P(7, ty + 1, 1, 4, A[3]); P(8, ty + 4, 1, 1, A[1]); // Shirt unter der Jacke
      P(6, ty + 1, 1, 3, O[1]);                                        // Jackenkante
    } else {
      P(5, ty + 1, 6, 4, A[1]); P(5, ty + 1, 6, 1, A[0]); P(5, ty + 1, 1, 4, A[2]); P(6, ty + 2, 4, 1, A[2]); // Rucksack
      P(5, ty, 1, 1, A[0]); P(10, ty, 1, 1, A[0]);
    }
    // ---- Arme schwingen gegengleich zu den Beinen
    const aL = f === 1 ? -1 : f === 2 ? 1 : 0, aR = -aL;
    P(3, ty, 1, 4 + aL, O[2]); P(3, ty, 1, 1, O[3]); P(3, ty + 4 + aL, 1, 1, S[2]);
    P(12, ty, 1, 4 + aR, O[1]); P(12, ty + 4 + aR, 1, 1, S[1]);
    // ---- Kopf (rund, ca. 45 % der Höhe)
    const hy0 = 0;
    rows([[5, 10], [4, 11], [3, 12], [3, 12], [3, 12], [3, 12], [3, 12], [3, 12], [3, 12], [3, 12], [4, 11], [5, 10]], hy0, S[2]);
    P(2, 6 + bob, 1, 2, S[2]); P(13, 6 + bob, 1, 2, S[1]);             // Ohren
    if (front) {
      P(11, 5 + bob, 2, 5, S[1]); P(5, 11 + bob, 6, 1, S[1]); P(4, 10 + bob, 1, 1, S[1]); // Schatten rechts und am Kinn
      // Haar: Oberkopf, Pony, Seiten
      rows([[5, 10], [4, 11], [3, 12], [3, 12], [3, 12]], 0, H[2]);
      P(3, 5 + bob, 2, 1, H[2]); P(6, 5 + bob, 1, 1, H[2]); P(9, 5 + bob, 1, 1, H[1]); P(11, 5 + bob, 2, 1, H[1]);
      P(3, 6 + bob, 1, 3, H[2]); P(12, 6 + bob, 1, 3, H[1]);
      P(10, 1 + bob, 2, 4, H[1]); P(12, 3 + bob, 1, 2, H[0]); P(3, 4 + bob, 9, 1, H[1]);
      P(5, 1 + bob, 3, 1, H[3]); P(4, 2 + bob, 2, 1, H[3]); P(8, 2 + bob, 1, 1, H[3]);   // Glanz
      // Gesicht
      if (blink) { P(5, 7 + bob, 1, 1, lid); P(10, 7 + bob, 1, 1, lid); }
      else { P(5, 6 + bob, 1, 2, eye); P(10, 6 + bob, 1, 2, eye); P(5, 7 + bob, 1, 1, iris); P(10, 7 + bob, 1, 1, iris); }
      P(4, 8 + bob, 1, 1, blush); P(11, 8 + bob, 1, 1, blush);
      P(7, 9 + bob, 2, 1, S[1]); P(7, 8 + bob, 1, 1, S[3]);             // Mund, Nasenlicht
      if (look.jaw) { P(5, 5 + bob, 2, 1, H[0]); P(9, 5 + bob, 2, 1, H[0]); P(3, 10 + bob, 10, 1, S[2]); P(4, 11 + bob, 8, 1, S[1]); P(11, 10 + bob, 2, 1, S[1]); }
      if (look.pony) { P(2, 4 + bob, 1, 5, H[2]); P(13, 4 + bob, 1, 6, H[1]); P(13, 4 + bob, 1, 1, A[2]); P(2, 4 + bob, 1, 1, A[2]); }
      if (CP) { rows([[5, 10], [4, 11], [3, 12], [3, 12]], 0, CP[2]); P(4, 0 + bob, 4, 1, CP[3]); P(10, 1 + bob, 2, 3, CP[1]); P(2, 4 + bob, 12, 1, CP[0]); P(3, 4 + bob, 4, 1, CP[1]); P(7, 1 + bob, 2, 2, A[3]); }
    } else {
      // Hinterkopf: fast nur Haar, unten Nacken
      rows([[5, 10], [4, 11], [3, 12], [3, 12], [3, 12], [3, 12], [3, 12], [3, 12], [3, 12], [4, 11]], 0, H[2]);
      P(10, 1 + bob, 2, 9, H[1]); P(12, 3 + bob, 1, 6, H[0]); P(5, 9 + bob, 6, 1, H[1]); P(7, 3 + bob, 1, 2, H[1]);
      P(5, 1 + bob, 3, 1, H[3]); P(4, 2 + bob, 2, 2, H[3]);
      P(5, 10 + bob, 6, 1, S[1]); P(6, 11 + bob, 4, 1, S[1]);
      if (look.pony) { P(7, 8 + bob, 2, 6, H[2]); P(8, 8 + bob, 1, 6, H[1]); P(7, 8 + bob, 2, 1, A[2]); P(7, 13 + bob, 2, 1, H[0]); }
      if (CP) { rows([[5, 10], [4, 11], [3, 12], [3, 12], [3, 12]], 0, CP[2]); P(4, 0 + bob, 4, 1, CP[3]); P(10, 1 + bob, 2, 4, CP[1]); P(6, 4 + bob, 4, 1, CP[0]); P(7, 4 + bob, 2, 1, A[2]); }
    }
  } else {
    // ---- Seitenansicht nach links (rechts = gespiegelt)
    const hy = 18 + bob, near = f === 2 ? 'b' : 'a';
    const LN = near === 'a' ? [L[2], L[1]] : [L[1], L[0]], LF = near === 'a' ? [L[1], L[0]] : [L[2], L[1]];
    if (stride) {
      // hinteres Bein schräg nach hinten, vorderes schräg nach vorn
      P(8, hy, 2, 1, LF[0]); P(9, hy + 1, 2, 1, LF[0]); P(10, hy + 2, 1, 1, LF[1]); P(9, hy + 3, 3, 1, shoe[0]);
      P(6, hy, 2, 1, LN[0]); P(5, hy + 1, 2, 1, LN[0]); P(4, hy + 2, 2, 1, LN[1]); P(2, hy + 3, 4, 1, shoe[1]); P(2, hy + 3, 1, 1, shoe[2]);
    } else if (f === 3) {
      P(6, hy, 2, 4, L[2]); P(7, hy, 1, 4, L[1]); P(4, hy + 4, 4, 1, shoe[1]); P(4, hy + 4, 1, 1, shoe[2]);
      P(8, hy, 2, 2, L[1]); P(9, hy + 2, 1, 1, L[0]); P(8, hy + 3, 3, 1, shoe[0]);
    } else {
      P(6, hy, 3, 4, L[2]); P(8, hy, 1, 4, L[1]); P(4, hy + 4, 5, 1, shoe[1]); P(4, hy + 4, 1, 1, shoe[2]);
    }
    const ty = 12 + bob;
    P(5, ty, 6, 6, O[2]); P(5, ty, 1, 5, O[3]); P(9, ty, 2, 6, O[1]); P(5, ty + 5, 6, 1, L[0]);
    P(10, ty + 1, 2, 4, A[1]); P(11, ty + 1, 1, 4, A[0]); P(10, ty + 1, 1, 1, A[2]);   // Rucksack
    P(5, ty, 2, 1, A[2]);                                                             // Kragen
    // Arm: vorn, hinten oder hängend
    if (f === 1 || f === 2) {
      if ((f === 1) === (near === 'a')) { P(6, ty, 2, 2, O[1]); P(5, ty + 2, 2, 1, O[1]); P(4, ty + 3, 2, 1, S[2]); }
      else { P(8, ty, 2, 2, O[1]); P(9, ty + 2, 2, 1, O[1]); P(10, ty + 3, 2, 1, S[1]); }
    } else { P(7, ty, 2, 4, O[1]); P(7, ty, 1, 4, O[2]); P(7, ty + 4, 2, 1, S[2]); }
    // Kopf
    rows([[5, 10], [4, 11], [3, 12], [3, 12], [3, 12], [3, 12], [3, 12], [3, 12], [3, 12], [3, 11], [4, 10], [5, 9]], 0, S[2]);
    P(2, 7 + bob, 1, 1, S[2]);                                                         // Nase
    rows([[5, 10], [4, 11], [3, 12], [3, 12], [3, 12]], 0, H[2]);
    P(8, 5 + bob, 5, 5, H[2]); P(10, 3 + bob, 3, 7, H[1]); P(12, 4 + bob, 1, 5, H[0]); P(9, 10 + bob, 2, 1, H[1]);
    P(3, 5 + bob, 2, 1, H[2]); P(5, 1 + bob, 3, 1, H[3]); P(4, 2 + bob, 2, 1, H[3]);
    P(8, 6 + bob, 1, 2, S[2]); P(8, 7 + bob, 1, 1, S[1]);                              // Ohr
    P(7, 10 + bob, 2, 1, S[1]);                                                       // Kinn-Schatten
    if (blink) P(4, 7 + bob, 1, 1, lid);
    else { P(4, 6 + bob, 1, 2, eye); P(4, 7 + bob, 1, 1, iris); }
    P(5, 8 + bob, 1, 1, blush);
    if (look.jaw) { P(4, 5 + bob, 2, 1, H[0]); P(3, 10 + bob, 5, 1, S[2]); P(4, 11 + bob, 4, 1, S[1]); }
    if (look.pony) { P(12, 4 + bob, 2, 2, A[2]); P(13, 5 + bob, 2, 6, H[2]); P(14, 6 + bob, 1, 5, H[1]); }
    if (CP) { rows([[5, 10], [4, 11], [3, 12], [3, 12]], 0, CP[2]); P(4, 0 + bob, 4, 1, CP[3]); P(10, 1 + bob, 2, 3, CP[1]); P(0, 4 + bob, 8, 1, CP[0]); P(1, 4 + bob, 3, 1, CP[1]); }
  }
  // Selektiver Umriss: unten/rechts fast schwarz-kühl, oben/links ein dunkler Ton der Nachbarfarbe
  const id = x.getImageData(0, 0, 16, 24), d = id.data, o = new Uint8ClampedArray(d);
  const at = (i, j) => i >= 0 && j >= 0 && i < 16 && j < 24 && d[(j * 16 + i) * 4 + 3] > 0;
  for (let j = 0; j < 24; j++) for (let i = 0; i < 16; i++) {
    if (at(i, j)) continue;
    const nb = [[i + 1, j], [i, j + 1], [i - 1, j], [i, j - 1]].find(([a, b]) => at(a, b)); if (!nb) continue;
    const k = (j * 16 + i) * 4, lit = nb[0] > i || nb[1] > j; // Nachbar rechts/unten → wir sind oben/links = Lichtseite
    if (lit) { const q = (nb[1] * 16 + nb[0]) * 4; o[k] = d[q] * 0.35 + 10; o[k + 1] = d[q + 1] * 0.3 + 8; o[k + 2] = d[q + 2] * 0.35 + 16; }
    else { o[k] = 0x22; o[k + 1] = 0x1a; o[k + 2] = 0x2a; }
    o[k + 3] = 255;
  }
  x.putImageData(new ImageData(o, 16, 24), 0, 0);
  if (dir === 'right') { const [m, mx] = cv(16, 24); mx.translate(16, 0); mx.scale(-1, 1); mx.drawImage(c, 0, 0); return m; }
  return c;
}
export const FRAMES = 5;
