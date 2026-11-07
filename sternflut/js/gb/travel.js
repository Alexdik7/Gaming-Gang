// Reisen und Lagerleben: Schiff (Häfen), Lager mit Kochen, Reiten
import { G, W, H, push, pop, input, text, fade, wait } from './engine.js';
import { say, ask, choose } from './gbui.js';
import { sfx, cry, setMusic } from '../core/audio.js';
import { monSprite } from './sprites.js';
import { SPECIES } from '../data/creatures.js';
import { healMon, monName } from '../data/mon.js';
import { ITEMS, MAPS } from './maps.js';
import { RIDE } from '../data/kalmara3.js';

// ---------------------------------------------------------------- Häfen
export const PORTS = {
  ankerbrueck: { name: 'Ankerbrück', x: 22, y: 7, dir: 'left' },
  funkenhafen: { name: 'Funkenhafen (Ostinsel)', x: 3, y: 9, dir: 'right' },
  nebelklippe: { name: 'Nebelklippe (Nordinsel)', x: 10, y: 15, dir: 'up' },
};
export function addPort(id, P) { PORTS[id] = P; }

class SailScene {
  constructor(g, res, kind = 'ship') { this.g = g; this.res = res; this.t = 0; this.kind = kind; this.night = g.isNight(); }
  update(dt) { this.t += dt; if (this.t > 3.2 || (this.t > 0.8 && (input.pressed('a') || input.tap))) { pop(this); this.res(); } }
  draw(ctx) {
    const t = this.t, n = this.night, sky = ctx.createLinearGradient(0, 0, 0, 90);
    sky.addColorStop(0, n ? '#0c1438' : '#5aa8e8'); sky.addColorStop(1, n ? '#3a3a7a' : '#d8f0ff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 91);
    if (n) for (let i = 0; i < 50; i++) { ctx.fillStyle = `rgba(255,248,220,${0.4 + 0.6 * Math.abs(Math.sin(G.t + i))})`; ctx.fillRect((i * 97) % W, (i * 31) % 80, 1, 1); }
    else { ctx.fillStyle = '#fff8d0'; ctx.beginPath(); ctx.arc(200, 24, 11, 0, 7); ctx.fill(); for (let i = 0; i < 4; i++) { const cx = ((i * 80 - t * 6) % 300 + 300) % 300 - 30; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(cx, 18 + i * 9, 18, 5, 0, 0, 7); ctx.ellipse(cx + 10, 15 + i * 9, 11, 5, 0, 0, 7); ctx.fill(); } }
    // ferne Inseln
    for (let i = 0; i < 3; i++) { const x = ((i * 110 - t * 14) % 360 + 360) % 360 - 60; ctx.fillStyle = n ? '#1a2448' : '#7aa0b8'; ctx.beginPath(); ctx.ellipse(x, 91, 34 + i * 8, 9 + i * 3, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = n ? '#22305a' : '#5a8a6a'; ctx.beginPath(); ctx.ellipse(x - 4, 91, 18, 6 + i * 2, 0, Math.PI, 0); ctx.fill(); }
    if (this.kind === 'plane') { ctx.fillStyle = n ? '#22305a' : '#2a68b8'; ctx.fillRect(0, 91, W, H - 91); } else {
      const sea = ctx.createLinearGradient(0, 90, 0, H); sea.addColorStop(0, n ? '#1a2a6a' : '#3a8ad8'); sea.addColorStop(1, n ? '#0a1434' : '#1a4a98'); ctx.fillStyle = sea; ctx.fillRect(0, 90, W, H - 90);
      for (let y = 93, i = 0; y < H; y += 3 + i * 0.6, i++) for (let x = ((i * 31 + t * (18 + i * 6)) % 46) - 46; x < W; x += 34 + i * 4) { ctx.fillStyle = `rgba(255,255,255,${0.15 + i * 0.03})`; ctx.fillRect(x | 0, y | 0, 6 + i, 1); }
    }
    const bob = Math.sin(t * 2.6) * 2, bx = 100, by = 108 + bob;
    if (this.kind === 'plane') {
      const py = 52 + Math.sin(t * 1.8) * 3; ctx.fillStyle = '#f4f4f8'; ctx.beginPath(); ctx.ellipse(bx + 10, py, 30, 6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#c84a3a'; ctx.fillRect(bx - 4, py - 1, 34, 2); ctx.fillStyle = '#d8dce8'; ctx.beginPath(); ctx.moveTo(bx + 4, py); ctx.lineTo(bx + 20, py + 14); ctx.lineTo(bx + 26, py); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx - 16, py); ctx.lineTo(bx - 20, py - 11); ctx.lineTo(bx - 12, py); ctx.fill(); ctx.fillStyle = '#5a9ad8'; for (let i = 0; i < 5; i++) ctx.fillRect(bx + 14 + i * 5, py - 3, 3, 2);
      for (let i = 0; i < 8; i++) { ctx.fillStyle = `rgba(255,255,255,${0.4 - i * 0.05})`; ctx.fillRect(bx - 22 - i * 9 - (t * 40) % 9, py + 1, 6, 1); }
    } else {
      for (let i = 0; i < 10; i++) { ctx.fillStyle = `rgba(255,255,255,${0.5 - i * 0.05})`; ctx.fillRect(bx - 28 - i * 7 - (t * 30) % 7, by + 9 + (i % 2), 6, 1); }
      ctx.fillStyle = '#5a3a24'; ctx.beginPath(); ctx.moveTo(bx - 28, by); ctx.lineTo(bx + 34, by); ctx.lineTo(bx + 26, by + 10); ctx.lineTo(bx - 22, by + 10); ctx.fill();
      ctx.fillStyle = '#8a5a34'; ctx.fillRect(bx - 26, by, 58, 3); ctx.fillStyle = '#e8d8b0'; ctx.fillRect(bx - 18, by + 4, 40, 1);
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(bx + 2, by - 44, 2, 44);
      const sw = Math.sin(t * 1.3) * 2; ctx.fillStyle = '#f8f4e8'; ctx.beginPath(); ctx.moveTo(bx + 5, by - 42); ctx.quadraticCurveTo(bx + 30 + sw, by - 24, bx + 5, by - 6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx + 1, by - 38); ctx.quadraticCurveTo(bx - 20 + sw, by - 22, bx + 1, by - 6); ctx.fill();
      ctx.fillStyle = '#c84a3a'; ctx.beginPath(); ctx.moveTo(bx + 14, by - 28); ctx.lineTo(bx + 16, by - 24); ctx.lineTo(bx + 20, by - 23); ctx.lineTo(bx + 16, by - 21); ctx.lineTo(bx + 14, by - 17); ctx.lineTo(bx + 12, by - 21); ctx.lineTo(bx + 8, by - 23); ctx.lineTo(bx + 12, by - 24); ctx.fill();
      ctx.fillStyle = '#e84a5f'; ctx.fillRect(bx + 4, by - 50, 8, 4);
    }
    for (let i = 0; i < 3; i++) { const gx = ((i * 70 + t * 30) % 280) - 20, gy = 34 + i * 12 + Math.sin(t * 4 + i) * 3; ctx.fillStyle = '#f8f8f8'; ctx.fillRect(gx - 3, gy, 3, 1); ctx.fillRect(gx + 1, gy, 3, 1); ctx.fillRect(gx, gy + 1, 2, 1); }
  }
}
export function travelScene(g, kind) { return new Promise(res => push(new SailScene(g, res, kind))); }

export async function sailMenu(g, here) {
  const s = g.state, list = Object.entries(PORTS).filter(([id, P]) => id !== here && s.flags['port_' + id] && (P.world || 1) === (s.world || 1));
  if (!list.length) return say('Kapitän Harm: Wir haben noch kein Ziel. Komm wieder, wenn es Neuigkeiten gibt.', { name: 'Kapitän Harm' });
  const i = await choose([...list.map(([, P]) => ({ label: P.name, desc: 'Mit der Seeschwalbe dorthin segeln.' })), 'Hierbleiben'], { title: 'WOHIN?' });
  if (i === null || i >= list.length) return;
  const [id, P] = list[i];
  sfx('whoosh'); await fade(1, 300); await fade(0, 1); setMusic('town');
  await travelScene(g, 'ship');
  await fade(1, 200); g.ow.load(id, P.x, P.y, P.dir); g.ow.music(); await fade(0, 300); g.save(true);
}

// ---------------------------------------------------------------- Lager und Kochen
export const RECIPES = [
  { id: 'kraftsuppe', name: 'Kraftsuppe', need: ['pilz', 'kraeuter'], desc: 'Angriff +1 in den nächsten 3 Kämpfen.', buff: { atk: 1 } },
  { id: 'fischeintopf', name: 'Fischeintopf', need: ['fisch', 'kraeuter'], desc: 'Verteidigung +1 in den nächsten 3 Kämpfen.', buff: { def: 1 } },
  { id: 'grillfisch', name: 'Sturmgrillfisch', need: ['fisch', 'klarbeere'], desc: 'Initiative +1 in den nächsten 3 Kämpfen.', buff: { spe: 1 } },
  { id: 'sternbrot', name: 'Sternbrot', need: ['pilz', 'heilbeere'], desc: 'Spezial-Angriff +1 in den nächsten 3 Kämpfen.', buff: { spa: 1 } },
  { id: 'honigkuchen', name: 'Honigkuchen', need: ['honig', 'heilbeere'], desc: 'Heilt das ganze Team, alle werden fröhlicher (+20 Freundschaft).', heal: true },
  { id: 'gluecksspiess', name: 'Glücksspieß', need: ['muschel', 'honig'], desc: '300 Schritte lang begegnen dir viermal so oft schillernde Kreaturen.', shiny: 300 },
  { id: 'faengerbrot', name: 'Fängerbrot', need: ['pilz', 'honig'], desc: '200 Schritte lang fangen alle Kugeln 1,5-mal so gut.', catchB: 200 },
  { id: 'meeresplatte', name: 'Meeresplatte', need: ['fisch', 'muschel'], desc: 'Alle Werte +1 im nächsten Kampf.', buff: { atk: 1, def: 1, spa: 1, spd: 1, spe: 1 }, n: 1 },
];
class CampScene {
  constructor(g) { this.g = g; this.t = 0; this.team = g.state.team.filter(m => !m.egg); this.hearts = []; }
  update(dt) { this.t += dt; this.hearts = this.hearts.filter(h => (h.t += dt) < 1.4); }
  draw(ctx) {
    const t = this.t, g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a1030'); g.addColorStop(0.6, '#2a2a5a'); g.addColorStop(1, '#1a2a1a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(255,248,220,${0.3 + 0.7 * Math.abs(Math.sin(t * 0.7 + i * 1.3))})`; ctx.fillRect((i * 83) % W, (i * 37) % 70, 1, 1); }
    ctx.fillStyle = '#16301a'; ctx.beginPath(); ctx.moveTo(0, 86); for (let x = 0; x <= W; x += 12) ctx.lineTo(x, 78 + Math.sin(x * 0.07) * 6 + (x % 24 ? 0 : -8)); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    ctx.fillStyle = '#20381e'; ctx.fillRect(0, 96, W, H - 96);
    // Zelt
    ctx.fillStyle = '#c84a3a'; ctx.beginPath(); ctx.moveTo(-6, 96); ctx.lineTo(16, 64); ctx.lineTo(38, 96); ctx.fill(); ctx.fillStyle = '#8a2a24'; ctx.beginPath(); ctx.moveTo(10, 96); ctx.lineTo(16, 78); ctx.lineTo(22, 96); ctx.fill(); ctx.fillStyle = '#f8d870'; ctx.fillRect(15, 60, 2, 6);
    // Feuer mit Lichtkreis
    const fx = 76, fy = 90; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createRadialGradient(fx, fy - 6, 2, fx, fy - 6, 70 + Math.sin(t * 9) * 3); lg.addColorStop(0, 'rgba(255,170,60,.55)'); lg.addColorStop(1, 'rgba(255,120,30,0)'); ctx.fillStyle = lg; ctx.fillRect(fx - 80, fy - 80, 160, 140); ctx.restore();
    ctx.fillStyle = '#5a3a24'; ctx.fillRect(fx - 12, fy, 24, 3); ctx.fillRect(fx - 9, fy - 2, 18, 2);
    for (let i = 0; i < 9; i++) { const k = (t * 1.6 + i / 9) % 1, x = fx + Math.sin(i * 2.1 + t * 5) * (6 - k * 5), y = fy - k * 26; ctx.fillStyle = k < 0.35 ? '#fff6b0' : k < 0.65 ? '#ffb040' : '#e85030'; ctx.fillRect(x | 0, y | 0, 3 - k * 2 + 1, 3 - k * 2 + 1); }
    for (let i = 0; i < 4; i++) { const k = (t * 0.5 + i / 4) % 1; ctx.fillStyle = `rgba(255,200,120,${1 - k})`; ctx.fillRect(fx + Math.sin(i + t) * 10 * k, fy - 26 - k * 40, 1, 1); }
    // Team ums Feuer
    this.team.forEach((m, i) => { const sl = [[-26, -6], [26, -6], [-40, 8], [40, 8], [-16, 14], [16, 14]][i] || [0, 16]; const x = fx + sl[0], y = fy + sl[1];
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y + 14, 8, 2, 0, 0, 7); ctx.fill(); ctx.save(); ctx.translate(Math.round(x), Math.round(y - 16 + Math.abs(Math.sin(t * 3 + i)) * -2)); if (x < fx) ctx.scale(-1, 1); ctx.drawImage(monSprite(m.sp, 'icon', m.shiny, m.mut), -16, 0); ctx.restore(); });
    for (const h of this.hearts) { const y = h.y - h.t * 20; ctx.globalAlpha = 1 - h.t / 1.4; ctx.fillStyle = '#ff6a8a'; ctx.fillRect(h.x - 3, y, 2, 2); ctx.fillRect(h.x + 1, y, 2, 2); ctx.fillRect(h.x - 3, y + 1, 6, 2); ctx.fillRect(h.x - 2, y + 3, 4, 1); ctx.fillRect(h.x - 1, y + 4, 2, 1); ctx.globalAlpha = 1; }
    text('LAGER', 76, 4, '#ffe8b0', 9, 'center', '#2a1a10', true);
  }
}
export async function camp(g) {
  const s = g.state, ow = g.ow;
  if (!ow.M.outdoor || ow.M.cave) return say('Hier kannst du kein Lager aufschlagen. Such dir einen Platz unter freiem Himmel.');
  const C = new CampScene(g); await fade(1, 250); push(C); await fade(0, 300); setMusic('night');
  const day = Math.floor(s.playtime / 600);
  for (;;) {
    const i = await choose([{ label: 'Kochen', desc: 'Aus Zutaten Gerichte mit besonderer Wirkung zubereiten.' }, { label: 'Spielen', desc: 'Freundschaft stärken (einmal pro Rast).' }, { label: 'Rasten', desc: 'Das Team heilen und schlafen, bis der nächste Morgen oder Abend kommt.' }, { label: 'Aufbrechen', desc: 'Das Lager abbauen.' }], { title: 'LAGERFEUER', above: false, x: 150, w: 88 });
    if (i === null || i === 3) break;
    if (i === 0) await cook(g, C);
    if (i === 1) {
      if (s.flags.campPlay === day) { await say('Dein Team ist schon ganz müde vom Spielen.'); continue; }
      s.flags.campPlay = day; for (const m of C.team) { m.friendship = Math.min(255, (m.friendship || 70) + 10); C.hearts.push({ x: 76 + (Math.random() - 0.5) * 80, y: 80, t: 0 }); }
      sfx('lvl'); await say(['Ihr spielt Fangen ums Feuer, bis alle außer Atem sind.', 'Dein Team vertraut dir noch ein bisschen mehr.']);
    }
    if (i === 2) {
      await fade(1, 500); s.team.forEach(healMon); const h = g.hour(); s.time += ((h < 18 && h >= 6 ? 20 : 30) - h + 24) % 24 * 60; s.flags.campPlay = null; sfx('heal'); await wait(500); await fade(0, 500);
      await say(`Ihr habt bis zum ${g.isNight() ? 'Abend' : 'Morgen'} geschlafen. Dein Team ist erholt!`);
    }
  }
  await fade(1, 250); pop(C); ow.music(); await fade(0, 250); g.save(true);
}
async function cook(g, C) {
  const s = g.state;
  const can = r => r.need.every(k => (s.bag[k] || 0) > 0);
  const i = await choose([...RECIPES.map(r => ({ label: r.name, right: can(r) ? '✓' : '', disabled: !can(r), desc: `${r.need.map(k => ITEMS[k].name).join(' + ')} → ${r.desc}` })), 'Zurück'], { title: 'REZEPTE' });
  if (i === null || i >= RECIPES.length) return;
  const r = RECIPES[i]; r.need.forEach(k => s.bag[k]--);
  sfx('heal'); await wait(300);
  if (r.buff) s.buff = { ...r.buff, n: r.n || 3 };
  if (r.heal) { s.team.forEach(m => { healMon(m); m.friendship = Math.min(255, (m.friendship || 70) + 20); }); C.team.forEach(() => C.hearts.push({ x: 76 + (Math.random() - 0.5) * 80, y: 80, t: 0 })); }
  if (r.shiny) s.shinyBoost = r.shiny;
  if (r.catchB) s.catchBoost = r.catchB;
  s.flags['koch_' + r.id] = true;
  await say([`Es duftet herrlich … ${r.name} ist fertig!`, r.desc]);
}

// ---------------------------------------------------------------- Reiten
export const rideMon = s => s.team.find(m => !m.egg && m.hp > 0 && RIDE.includes(m.sp));
export async function toggleRide(g) {
  const s = g.state, p = g.ow.p;
  if (p.ride) { p.ride = null; sfx('click'); return say('Du steigst ab.'); }
  if (!g.ow.M.outdoor || g.ow.M.cave) return say('Hier ist kein Platz zum Reiten.');
  if (p.surf) return say('Auf dem Wasser kannst du nicht reiten.');
  const m = rideMon(s); if (!m) return say(['Keine Kreatur in deinem Team kann dich tragen.', 'Große Lauftiere wie Dunaro, Rankora, Widderkraft oder Sturmross eignen sich zum Reiten.']);
  p.ride = m.uid || m.sp; cry(SPECIES[m.sp].cry); sfx('whoosh');
  return say(`Du sitzt auf ${monName(m)} auf! Hoppla – ganz schön schnell!`);
}
