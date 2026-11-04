// Kampfhintergründe & Plattformen im Stil der GBA-Ära (eigene Pixel-Art, einmal gezeichnet und gecacht)
const cache = {};
const R = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mixc = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };
const dark = (c, t) => mixc(c, '#101018', t), light = (c, t) => mixc(c, '#ffffff', t);
const OUT = new Set(['gras', 'wald', 'schnee', 'wueste', 'berg', 'wasser', 'vulkan']);

function cloud(g, x, y, w, col, sh) {
  const p = [[0, 4, 6], [5, 1, 7], [12, 0, 8], [19, 3, 6], [8, 5, 7]];
  g.fillStyle = sh; for (const [dx, dy, r] of p) { g.beginPath(); g.arc(x + dx * w / 24, y + dy + 2, r * w / 24, 0, 7); g.fill(); }
  g.fillStyle = col; for (const [dx, dy, r] of p) { g.beginPath(); g.arc(x + dx * w / 24, y + dy, r * w / 24, 0, 7); g.fill(); }
}
function treeLine(g, y, h, col, hi, rnd, step = 9) {
  for (let x = -6; x < 250; x += step * (0.7 + rnd() * 0.6)) {
    const r = h * (0.6 + rnd() * 0.5);
    g.fillStyle = col; g.beginPath(); g.arc(x, y - r * 0.4, r, Math.PI, 0); g.lineTo(x + r, y + 2); g.lineTo(x - r, y + 2); g.fill();
    g.fillStyle = hi; g.beginPath(); g.arc(x - r * 0.25, y - r * 0.6, r * 0.45, Math.PI, 0); g.fill();
  }
  g.fillStyle = col; g.fillRect(0, y, 240, 3);
}
function pines(g, y, h, col, hi, rnd, snow) {
  for (let x = -4; x < 250; x += 8 + rnd() * 9) {
    const hh = h * (0.7 + rnd() * 0.5);
    g.fillStyle = col; g.beginPath(); g.moveTo(x, y - hh); g.lineTo(x + hh * 0.38, y); g.lineTo(x - hh * 0.38, y); g.fill();
    g.fillStyle = hi; g.beginPath(); g.moveTo(x, y - hh); g.lineTo(x + hh * 0.12, y - hh * 0.55); g.lineTo(x - hh * 0.1, y - hh * 0.5); g.fill();
    if (snow) { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x, y - hh); g.lineTo(x + hh * 0.14, y - hh * 0.62); g.lineTo(x - hh * 0.14, y - hh * 0.62); g.fill(); }
  }
}
function mountains(g, y, col, hi, cap, rnd, n = 5, hmax = 34) {
  for (let i = 0; i < n; i++) {
    const x = -20 + i * (280 / n) + rnd() * 20, w = 50 + rnd() * 40, h = hmax * (0.6 + rnd() * 0.4);
    g.fillStyle = col; g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x, y - h); g.lineTo(x + w / 2, y); g.fill();
    g.fillStyle = hi; g.beginPath(); g.moveTo(x, y - h); g.lineTo(x - w / 2, y); g.lineTo(x - w * 0.1, y); g.fill();
    if (cap) { g.fillStyle = cap; g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + w * 0.13, y - h * 0.72); g.lineTo(x + w * 0.03, y - h * 0.78); g.lineTo(x - w * 0.06, y - h * 0.7); g.lineTo(x - w * 0.12, y - h * 0.74); g.fill(); }
  }
}
function groundBands(g, y0, c1, c2, rnd, tufts, tuftCol) {
  const gr = g.createLinearGradient(0, y0, 0, 114); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, y0, 240, 114 - y0);
  // waagerechte Bänder wie auf dem Handheld
  for (let y = y0 + 3, i = 0; y < 114; y += 3 + i * 1.3, i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.06)'; g.fillRect(0, y, 240, 1 + (i >> 2)); }
  for (let i = 0; i < 260; i++) { const y = y0 + rnd() * (114 - y0), d = (y - y0) / (114 - y0); g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.1)'; g.fillRect(Math.floor(rnd() * 240), Math.floor(y), 1 + Math.round(d), 1); }
  if (tufts) for (let i = 0; i < 46; i++) {
    const y = y0 + 4 + rnd() * (110 - y0), x = rnd() * 240, s = 1 + (y - y0) / 26;
    g.fillStyle = tuftCol; g.fillRect(Math.floor(x), Math.floor(y - s * 2), 1, Math.ceil(s * 2)); g.fillRect(Math.floor(x + s), Math.floor(y - s * 3), 1, Math.ceil(s * 3)); g.fillRect(Math.floor(x + s * 2), Math.floor(y - s * 2), 1, Math.ceil(s * 2));
  }
}

export function bgArt(key, cols) {
  if (cache[key]) return cache[key];
  const c = document.createElement('canvas'); c.width = 240; c.height = 114; const g = c.getContext('2d');
  const [sky, sky2, g1, g2] = cols, rnd = R(key.length * 977 + 13);
  const hz = key === 'wasser' ? 54 : 58;
  g.fillStyle = g2; g.fillRect(0, 0, 240, 114);
  // Himmel bzw. Rückwand
  let gr = g.createLinearGradient(0, 0, 0, hz); gr.addColorStop(0, sky); gr.addColorStop(1, sky2); g.fillStyle = gr; g.fillRect(0, 0, 240, hz + 1);
  if (OUT.has(key) && key !== 'vulkan') {
    for (let i = 0; i < 5; i++) cloud(g, rnd() * 230 - 10, 6 + rnd() * 22, 22 + rnd() * 26, light(sky2, 0.6), mixc(sky, sky2, 0.5));
  }
  switch (key) {
    case 'gras':
      mountains(g, hz - 6, mixc(sky, '#5a8ab0', 0.45), mixc(sky, '#7aa8c8', 0.35), null, rnd, 4, 22);
      treeLine(g, hz, 9, '#3a8a48', '#58a858', rnd, 10); treeLine(g, hz + 3, 7, '#2e7038', '#4a9848', rnd, 8);
      groundBands(g, hz + 4, g1, g2, rnd, true, dark(g1, 0.35)); break;
    case 'wald':
      for (let k = 0; k < 3; k++) pines(g, hz - 8 + k * 6, 30 - k * 4, mixc('#183828', '#2e6040', k / 2), mixc('#2e5a40', '#4a8a58', k / 2), rnd, false);
      groundBands(g, hz + 4, g1, g2, rnd, true, dark(g1, 0.4)); break;
    case 'berg':
      mountains(g, hz + 2, '#7a8aa8', '#98a8c0', '#f0f4ff', rnd, 4, 44); mountains(g, hz + 4, '#8a7a68', '#a8987a', null, rnd, 6, 18);
      groundBands(g, hz + 4, g1, g2, rnd, false); for (let i = 0; i < 14; i++) { g.fillStyle = dark(g1, 0.3); g.beginPath(); g.ellipse(rnd() * 240, hz + 10 + rnd() * 48, 2 + rnd() * 3, 1 + rnd() * 1.5, 0, 0, 7); g.fill(); } break;
    case 'schnee':
      mountains(g, hz, '#c8d8ec', '#e4eef8', '#ffffff', rnd, 4, 30); pines(g, hz + 2, 18, '#3a6a6a', '#5a8a8a', rnd, true);
      groundBands(g, hz + 4, g1, g2, rnd, false); for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(rnd() * 240, rnd() * hz, 1, 1); } break;
    case 'wueste':
      for (let k = 0; k < 2; k++) { g.fillStyle = k ? '#e0b070' : '#f0c890'; g.beginPath(); g.moveTo(0, hz + 2); for (let x = 0; x <= 240; x += 20) g.quadraticCurveTo(x + 10, hz - 10 - rnd() * 10 + k * 6, x + 20, hz + 2); g.lineTo(240, hz + 4); g.lineTo(0, hz + 4); g.fill(); }
      for (let i = 0; i < 3; i++) { const x = 20 + rnd() * 200; g.fillStyle = '#5a8a48'; g.fillRect(x, hz - 12, 3, 14); g.fillRect(x - 3, hz - 8, 3, 2); g.fillRect(x - 3, hz - 11, 2, 4); g.fillRect(x + 3, hz - 6, 3, 2); g.fillRect(x + 4, hz - 9, 2, 4); }
      groundBands(g, hz + 4, g1, g2, rnd, false); break;
    case 'wasser':
      g.fillStyle = mixc(g1, sky2, 0.4); g.fillRect(0, hz - 2, 240, 3);
      gr = g.createLinearGradient(0, hz, 0, 114); gr.addColorStop(0, light(g1, 0.2)); gr.addColorStop(1, g2); g.fillStyle = gr; g.fillRect(0, hz, 240, 114 - hz);
      for (let y = hz + 3, i = 0; y < 114; y += 3 + i * 0.9, i++) for (let x = (i * 13) % 30; x < 240; x += 24 + rnd() * 20) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(Math.floor(x), Math.floor(y), 4 + i, 1); }
      break;
    case 'vulkan':
      mountains(g, hz + 2, '#4a2a2a', '#6a3a32', null, rnd, 3, 40);
      for (let i = 0; i < 4; i++) { const x = rnd() * 240; g.fillStyle = 'rgba(255,120,40,.5)'; g.fillRect(x, hz - 20 + rnd() * 10, 2, 20); }
      g.fillStyle = 'rgba(255,90,30,.35)'; g.fillRect(0, hz - 2, 240, 3);
      groundBands(g, hz + 4, g1, g2, rnd, false); for (let i = 0; i < 10; i++) { g.fillStyle = '#e85a20'; g.fillRect(rnd() * 240, hz + 8 + rnd() * 50, 3 + rnd() * 6, 1); } break;
    case 'hoehle':
      g.fillStyle = '#2a1e18'; for (let x = 0; x < 240; x += 10 + rnd() * 12) { const h = 6 + rnd() * 18; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 4, h); g.lineTo(x + 8, 0); g.fill(); }
      g.fillStyle = '#4a382c'; for (let x = -10; x < 250; x += 16 + rnd() * 14) { const h = 10 + rnd() * 16; g.beginPath(); g.moveTo(x, hz + 3); g.lineTo(x + 8, hz - h); g.lineTo(x + 18, hz + 3); g.fill(); }
      groundBands(g, hz + 3, g1, g2, rnd, false); break;
    case 'ruine': case 'liga': case 'arena': {
      const pc = key === 'arena' ? '#b8a07a' : key === 'liga' ? '#9a88d0' : '#3a3060';
      for (let x = 8; x < 240; x += 34) { g.fillStyle = dark(pc, 0.2); g.fillRect(x, 8, 12, hz - 6); g.fillStyle = light(pc, 0.15); g.fillRect(x, 8, 3, hz - 6); g.fillStyle = light(pc, 0.25); g.fillRect(x - 2, 6, 16, 4); g.fillRect(x - 2, hz - 2, 16, 4); }
      if (key !== 'ruine') { g.fillStyle = 'rgba(255,255,255,.14)'; for (let x = 0; x < 240; x += 6) g.fillRect(x, hz - 10, 3, 2); }
      groundBands(g, hz + 3, g1, g2, rnd, false);
      if (key !== 'ruine') { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.beginPath(); g.ellipse(120, 92, 80, 14, 0, 0, 7); g.stroke(); }
      break;
    }
    default: groundBands(g, hz + 4, g1, g2, rnd, false);
  }
  return (cache[key] = c);
}

// Plattform: Oval mit hellem Rand, dunklem Saum und Grashalmen
export function platArt(key, cols, rx, ry) {
  const k = key + rx + 'x' + ry; if (cache[k]) return cache[k];
  const [, , g1, g2] = cols, w = rx * 2 + 4, h = ry * 2 + 8;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), rnd = R(rx * 31 + ry);
  const cx = w / 2, cy = ry + 2;
  g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(cx, cy + 3, rx, ry, 0, 0, 7); g.fill();
  g.fillStyle = dark(g2, 0.35); g.beginPath(); g.ellipse(cx, cy + 1, rx, ry, 0, 0, 7); g.fill();
  const top = key === 'wasser' ? light(g1, 0.35) : key === 'hoehle' || key === 'vulkan' ? light(g1, 0.1) : light(g1, 0.12);
  g.fillStyle = mixc(g1, g2, 0.4); g.beginPath(); g.ellipse(cx, cy, rx - 1, ry - 1, 0, 0, 7); g.fill();
  g.fillStyle = top; g.beginPath(); g.ellipse(cx, cy - 1, rx - 4, ry - 3, 0, 0, 7); g.fill();
  g.fillStyle = light(top, 0.25); g.beginPath(); g.ellipse(cx - rx * 0.15, cy - ry * 0.35, rx * 0.5, ry * 0.3, 0, 0, 7); g.fill();
  if (key === 'gras' || key === 'wald') {
    for (let i = 0; i < 26; i++) { const a = rnd() * Math.PI * 2, x = cx + Math.cos(a) * (rx - 3), y = cy + Math.sin(a) * (ry - 2); g.fillStyle = dark(g1, 0.3); g.fillRect(Math.floor(x), Math.floor(y - 2), 1, 2); g.fillRect(Math.floor(x + 1), Math.floor(y - 3), 1, 3); }
    for (let i = 0; i < 18; i++) { g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(Math.floor(cx + (rnd() - 0.5) * rx * 1.4), Math.floor(cy + (rnd() - 0.5) * ry * 1.2), 2, 1); }
  }
  return (cache[k] = c);
}
