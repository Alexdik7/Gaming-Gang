// Pager: das alte Gerät von Liv Sund. Tabs: ZIEL · AUFGABEN · LOGBUCH · LIED · KARTE
import { G, W, H, push, pop, input, text, wrap, rr } from './engine.js';
import { sfx } from '../core/audio.js';
import { mainGoal, sideTasks, LOGS, SONG } from './story.js';
import { MAPS } from './maps.js';

const TABS = ['ZIEL', 'AUFGABEN', 'LOGBUCH', 'LIED', 'KARTE'];
const LCD = '#9fd8b8', LCD2 = '#7cc0a0', INK = '#16362a', INK2 = '#2f5a48';
// Weltkarte von Kalmara (Akt 1). Unbekannte Orte erscheinen als „???“
export const WORLD = {
  ankerbrueck: { x: 128, y: 38, name: 'Ankerbrück', town: true },
  duenenpfad: { x: 128, y: 62, name: 'Dünenpfad' },
  muschelbucht: { x: 128, y: 86, name: 'Muschelbucht', town: true },
  strand: { x: 134, y: 104, name: 'Strand' },
  duenenhain: { x: 96, y: 22, name: 'Dünenhain', town: true, future: true },
  glimmwald: { x: 62, y: 40, name: 'Glimmwald', future: true },
  funkenhafen: { x: 176, y: 24, name: 'Funkenhafen', town: true, future: true },
};
const LINKS = [['ankerbrueck', 'duenenpfad'], ['duenenpfad', 'muschelbucht'], ['muschelbucht', 'strand'], ['ankerbrueck', 'duenenhain'], ['duenenhain', 'glimmwald'], ['ankerbrueck', 'funkenhafen']];
export const worldOf = (s, id) => (WORLD[id] ? id : MAPS[id]?.indoor ? s.ret?.map : id);

class PagerScene {
  constructor(g, res) { this.g = g; this.res = res; this.tab = 0; this.scroll = 0; this.t = 0; }
  update(dt) {
    this.t += dt;
    if (input.repeat('right')) { this.tab = (this.tab + 1) % TABS.length; this.scroll = 0; sfx('click'); }
    if (input.repeat('left')) { this.tab = (this.tab + TABS.length - 1) % TABS.length; this.scroll = 0; sfx('click'); }
    if (input.repeat('down')) { this.scroll++; sfx('click'); }
    if (input.repeat('up')) { this.scroll = Math.max(0, this.scroll - 1); sfx('click'); }
    const tp = input.tap;
    if (tp) { if (tp.y < 36 && tp.x > 26 && tp.x < 214) { this.tab = Math.min(TABS.length - 1, Math.max(0, Math.floor((tp.x - 26) / 37.6))); this.scroll = 0; sfx('click'); } else if (tp.y > 140) { pop(this); this.res(); } else this.scroll++; }
    if (input.pressed('b') || input.pressed('a') || input.pressed('start')) { sfx('click'); pop(this); this.res(); }
  }
  lines() {
    const s = this.g.state, f = s.flags;
    switch (TABS[this.tab]) {
      case 'ZIEL': { const g = mainGoal(s); return [['» ' + g.t, 1], ...wrap(g.d, 168, 7.5).map(l => [l]), [''], ['Orden: ' + s.badges.filter(Boolean).length + ' / 8   ·   Chronik: ' + Object.keys(s.dex.caught).length + ' gebunden']]; }
      case 'AUFGABEN': { const t = sideTasks(s); return t.length ? t.flatMap(q => [[(q.done ? '✓ ' : '• ') + q.t, 1], ...wrap(q.d, 160, 7.5).map(l => ['   ' + l])]) : wrap('Noch keine Aufgaben. Sprich mit den Leuten in den Städten – viele brauchen Hilfe.', 168, 7.5).map(l => [l]); }
      case 'LOGBUCH': { const ks = Object.keys(LOGS).filter(k => f['log' + k]); return ks.length ? [['Logbuch der Morgenstern  ' + ks.length + '/40', 1], ...ks.flatMap(k => [['Seite ' + k, 1], ...LOGS[k].flatMap(p => wrap(p.replace('{name}', s.name), 168, 7.5)).map(l => [l])])] : wrap('Noch keine Seiten gefunden. Die Seiten aus dem Logbuch deiner Mutter sind über die Welt verstreut.', 168, 7.5).map(l => [l]); }
      case 'LIED': { const ks = Object.keys(SONG).filter(k => f[k]); return ks.length ? [['Das Lied der Gezeiten  ' + ks.length + '/8', 1], ...ks.flatMap(k => [[SONG[k][0], 1], ...SONG[k].slice(1).flatMap(p => wrap(p, 168, 7.5)).map(l => [l])])] : wrap('Noch keine Strophe. In jeder Arenastadt steht ein alter Liedstein.', 168, 7.5).map(l => [l]); }
    }
    return [];
  }
  draw(ctx) {
    const t = this.t;
    ctx.fillStyle = 'rgba(8,12,24,.72)'; ctx.fillRect(0, 0, W, H);
    // Gehäuse
    ctx.fillStyle = '#1e2232'; rr(10, 6, 220, 150, 12); ctx.fill();
    const gg = ctx.createLinearGradient(0, 8, 0, 150); gg.addColorStop(0, '#5a6a8a'); gg.addColorStop(1, '#343c58'); ctx.fillStyle = gg; rr(12, 8, 216, 146, 10); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; rr(16, 10, 208, 4, 2); ctx.fill();
    text('MORGENSTERN · PAGER', 120, 143, '#c8d4f0', 6.5, 'center', '#1a1e2a', true);
    ctx.fillStyle = (Math.sin(t * 4) > 0) ? '#f86a6a' : '#7a3030'; ctx.beginPath(); ctx.arc(214, 146, 2, 0, 7); ctx.fill();
    // Tabs
    TABS.forEach((n, i) => { const x = 26 + i * 37.6, on = i === this.tab; ctx.fillStyle = on ? LCD : '#2a3048'; rr(x, 17, 35, 12, 3); ctx.fill(); text(n, x + 17.5, 19.5, on ? INK : '#a8b4d0', 6, 'center', null, true); });
    // Display
    ctx.fillStyle = '#121a16'; rr(22, 31, 196, 108, 4); ctx.fill();
    ctx.fillStyle = LCD; rr(24, 33, 192, 104, 3); ctx.fill();
    ctx.fillStyle = LCD2; for (let y = 34; y < 137; y += 2) ctx.fillRect(25, y, 190, 1);
    ctx.save(); ctx.beginPath(); ctx.rect(24, 33, 192, 104); ctx.clip();
    if (TABS[this.tab] === 'KARTE') this.map(ctx);
    else {
      const L = this.lines(), max = 11; this.scroll = Math.min(this.scroll, Math.max(0, L.length - max));
      L.slice(this.scroll, this.scroll + max).forEach(([l, b], i) => text(l, 30, 37 + i * 9, b ? INK : INK2, 7.5, 'left', null, !!b));
      if (L.length > max) { text(this.scroll > 0 ? '▲' : '', 208, 36, INK, 6, 'center', null); text(this.scroll < L.length - max ? '▼' : '', 208, 128, INK, 6, 'center', null); }
    }
    ctx.restore();
  }
  map(ctx) {
    const s = this.g.state, here = worldOf(s, this.g.ow.id), goal = mainGoal(s).map, t = this.t;
    ctx.fillStyle = '#86c8b0'; ctx.fillRect(24, 33, 192, 104);
    for (let i = 0; i < 26; i++) { ctx.fillStyle = 'rgba(40,90,70,.25)'; ctx.fillRect(28 + (i * 37) % 184, 38 + (i * 23) % 96, 5, 1); }
    // Inseln
    ctx.fillStyle = '#5a9a7a';
    for (const [x, y, rx, ry] of [[128, 70, 24, 46], [80, 30, 34, 16], [176, 26, 18, 10], [60, 40, 14, 12]]) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = INK2;
    for (const [a, b] of LINKS) { const A = WORLD[a], B = WORLD[b]; const n = Math.hypot(B.x - A.x, B.y - A.y) / 3; for (let i = 0; i < n; i++) if (i % 2 === 0) ctx.fillRect(Math.round(A.x + (B.x - A.x) * i / n), Math.round(A.y + (B.y - A.y) * i / n), 1, 1); }
    for (const [id, P] of Object.entries(WORLD)) {
      const known = !P.future || s.flags['fly_' + id];
      ctx.fillStyle = known ? INK : 'rgba(22,54,42,.4)';
      if (P.town) ctx.fillRect(P.x - 3, P.y - 3, 6, 6); else ctx.fillRect(P.x - 1, P.y - 1, 3, 3);
      text(known ? P.name : '???', P.x + 6, P.y - 4, known ? INK : 'rgba(22,54,42,.5)', 6, 'left', null, P.town);
    }
    const H0 = WORLD[here]; if (H0 && Math.sin(t * 6) > -0.2) { ctx.fillStyle = '#e84a5f'; ctx.beginPath(); ctx.arc(H0.x, H0.y, 3, 0, 7); ctx.fill(); }
    const G0 = WORLD[goal]; if (G0) { const b = Math.abs(Math.sin(t * 3)) * 3; ctx.fillStyle = '#f8d040'; ctx.beginPath(); ctx.moveTo(G0.x, G0.y - 5 - b); ctx.lineTo(G0.x - 3, G0.y - 10 - b); ctx.lineTo(G0.x + 3, G0.y - 10 - b); ctx.fill(); }
    text('● Du   ▼ Ziel', 30, 128, INK, 6, 'left', null, true);
    text('KALMARA-ARCHIPEL', 210, 128, INK, 6, 'right', null, true);
  }
}
export function pagerScreen(g) { return new Promise(res => push(new PagerScene(g, res))); }
