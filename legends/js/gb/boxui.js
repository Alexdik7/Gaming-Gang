// Kreaturen-Box im Handheld-Stil: 8 Boxen × 30 Plätze, Team-Spalte, Verschieben/Tauschen, Bericht, Freilassen, Umbenennen, Hintergründe
import { G, W, H, COL, push, pop, input, text, box, rr } from './engine.js';
import { sfx, cry } from '../core/audio.js';
import { SPECIES } from '../data/creatures.js';
import { TYPES } from '../data/types.js';
import { healMon, monName, maxHp, genderOf } from '../data/mon.js';
import { measure } from './engine.js';
import { monSprite } from './sprites.js';
import { choose, ask, say, summary, monIcon, typeTag, inputName, genderMark } from './gbui.js';

export const NB = 8, PER = 30, COLS = 6;
const WALL = [['Wiese', '#88d070', '#68b858'], ['Strand', '#f0d890', '#88c8f0'], ['Wald', '#4a9a5a', '#2e7a44'], ['Vulkan', '#e8885a', '#a84a3a'], ['Eis', '#c8e8f8', '#98c8e8'], ['Nacht', '#5a5aa8', '#34346a'], ['Wüste', '#e8c888', '#c8a060'], ['Kristall', '#d8a8f0', '#a878d0']];

// Box-Plätze vergeben (alte Spielstände: Reihenfolge bleibt erhalten)
export function ensureSlots(s) {
  s.boxMeta ||= Array.from({ length: NB }, (_, i) => ({ name: 'Box ' + (i + 1), wall: i }));
  const used = new Set(s.box.filter(m => m.slot != null).map(m => m.slot));
  let k = 0;
  for (const m of s.box) if (m.slot == null || m.slot >= NB * PER) { while (used.has(k)) k++; m.slot = k; used.add(k); }
}

class BoxScene {
  constructor(g, res) {
    this.g = g; this.s = g.state; this.res = res; ensureSlots(this.s);
    this.b = 0; this.zone = 'box'; this.i = 0; this.held = null; this.bob = 0;
  }
  get team() { return this.s.team; }
  at(zone, i) { return zone === 'team' ? this.team[i] : this.s.box.find(m => m.slot === this.b * PER + i); }
  cur() { return this.zone === 'head' ? null : this.at(this.zone, this.i); }
  healthy(excl) { return this.team.filter(m => m !== excl && !m.egg && m.hp > 0).length; }

  update(dt) {
    this.bob += dt;
    if (this.busy) return;
    const t = input.tap;
    if (t) return this.tapAt(t);
    if (input.pressed('b')) { if (this.held) { this.drop(this.held.from, this.held.fi, true); return; } sfx('click'); pop(this); this.res(); return; }
    if (input.pressed('start')) { pop(this); this.res(); return; }
    if (input.pressed('select') && this.zone !== 'head') { const m = this.cur(); if (m || this.held) return this.grab(); }
    const d = ['up', 'down', 'left', 'right'].find(k => input.repeat(k));
    if (d) this.move(d);
    if (input.pressed('a')) this.act();
  }
  move(d) {
    sfx('click');
    if (this.zone === 'head') {
      if (d === 'left' || d === 'right') { this.b = (this.b + (d === 'left' ? NB - 1 : 1)) % NB; }
      else if (d === 'down') { this.zone = 'box'; this.i = 2; }
      else if (d === 'up') { this.zone = 'box'; this.i = 26; }
      return;
    }
    if (this.zone === 'team') {
      const c = this.i % 2, r = Math.floor(this.i / 2);
      if (d === 'up') this.i = r > 0 ? this.i - 2 : this.i; else if (d === 'down') this.i = r < 2 ? this.i + 2 : this.i;
      else if (d === 'left' && c === 1) this.i--; else if (d === 'right') { if (c === 0) this.i++; else { this.zone = 'box'; this.i = r * 2 * COLS; } }
      return;
    }
    const c = this.i % COLS, r = Math.floor(this.i / COLS);
    if (d === 'up') { if (r === 0) this.zone = 'head'; else this.i -= COLS; }
    else if (d === 'down') { if (r === 4) this.zone = 'head'; else this.i += COLS; }
    else if (d === 'left') { if (c === 0) { this.zone = 'team'; this.i = Math.min(2, Math.floor(r / 2)) * 2 + 1; } else this.i--; }
    else if (d === 'right') { if (c === COLS - 1) { this.b = (this.b + 1) % NB; this.i -= COLS - 1; } else this.i++; }
  }
  // Antippen: Zelle wählen; zweites Antippen = Aktion
  tapAt(t) {
    let hit = null;
    if (t.y >= 4 && t.y < 20 && t.x > 84) { if (t.x < 102) { this.b = (this.b + NB - 1) % NB; sfx('click'); return; } if (t.x > 220) { this.b = (this.b + 1) % NB; sfx('click'); return; } hit = ['head', 0]; }
    for (let i = 0; i < PER && !hit; i++) { const [x, y] = this.cell(i); if (t.x >= x && t.x < x + 24 && t.y >= y && t.y < y + 25) hit = ['box', i]; }
    for (let i = 0; i < 6 && !hit; i++) { const [x, y] = this.tcell(i); if (t.x >= x && t.x < x + 37 && t.y >= y && t.y < y + 22) hit = ['team', i]; }
    if (t.x < 84 && t.y > 140) return this.close();
    if (!hit) return;
    if (hit[0] === this.zone && hit[1] === this.i) return this.act();
    this.zone = hit[0]; this.i = hit[1]; sfx('click');
    if (this.held) this.act();
  }
  close() { if (this.held) this.drop(this.held.from, this.held.fi, true); sfx('click'); pop(this); this.res(); }
  async act() {
    if (this.zone === 'head') return this.boxMenu();
    if (this.held) return this.place();
    const m = this.cur(); if (!m) return;
    this.busy = true;
    try {
      const opts = ['Verschieben', 'Bericht', this.zone === 'team' ? 'Ablegen' : 'Ins Team', 'Spitzname', 'Freilassen', 'Zurück'];
      const k = await choose(opts, { title: monName(m) });
      if (k === 0) this.grab();
      else if (k === 1) { if (m.egg) await say('Ein Ei. Was wohl daraus schlüpft?'); else await summary(m); }
      else if (k === 2) this.quick(m);
      else if (k === 3 && !m.egg) { m.nick = await inputName('Spitzname', monName(m)); if (m.nick === SPECIES[m.sp].name) m.nick = null; }
      else if (k === 4) await this.release(m);
    } finally { this.busy = false; }
  }
  // Schnell zwischen Team und Box hin- und herlegen
  quick(m) {
    const s = this.s;
    if (this.zone === 'team') {
      if (!m.egg && m.hp > 0 && this.healthy(m) < 1) { sfx('weak'); return this.toast('Mindestens eine kampffähige Kreatur muss im Team bleiben!'); }
      const free = this.freeSlot(); if (free < 0) { sfx('weak'); return this.toast('Alle Boxen sind voll!'); }
      s.team.splice(s.team.indexOf(m), 1); m.slot = free; s.box.push(m); sfx('caught'); this.toast(`${monName(m)} → ${s.boxMeta[Math.floor(free / PER)].name}`);
      this.i = Math.min(this.i, Math.max(0, s.team.length - 1));
    } else {
      if (s.team.length >= 6) { sfx('weak'); return this.toast('Dein Team ist voll!'); }
      s.box.splice(s.box.indexOf(m), 1); delete m.slot; healMon(m); s.team.push(m); sfx('caught'); this.toast(`${monName(m)} ist jetzt im Team.`);
    }
  }
  freeSlot() { const used = new Set(this.s.box.map(m => m.slot)); for (let k = this.b * PER; k < NB * PER; k++) if (!used.has(k)) return k; for (let k = 0; k < this.b * PER; k++) if (!used.has(k)) return k; return -1; }
  grab() {
    const m = this.cur(); if (!m) return;
    this.held = { m, from: this.zone, fi: this.i, b: this.b };
    if (this.zone === 'team') this.s.team.splice(this.i, 1); else this.s.box.splice(this.s.box.indexOf(m), 1);
    sfx('open');
  }
  // Ablegen: auf leeren Platz oder mit dortiger Kreatur tauschen
  place() {
    const s = this.s, H0 = this.held, m = H0.m, tgt = this.cur();
    if (this.zone === 'team') {
      if (!tgt && s.team.length >= 6) return;
      // Tausch würde letzte kampffähige Kreatur in die Box schicken?
      const after = s.team.filter(x => x !== tgt).concat(m);
      if (!after.some(x => !x.egg && x.hp > 0)) { sfx('weak'); return this.toast('Mindestens eine kampffähige Kreatur muss im Team bleiben!'); }
      delete m.slot; if (H0.from === 'box') healMon(m);
      if (tgt) { const ti = s.team.indexOf(tgt); s.team[ti] = m; this.held = { m: tgt, from: 'team', fi: ti, b: this.b }; }
      else { s.team.push(m); this.held = null; }
    } else {
      const slot = this.b * PER + this.i;
      if (!s.team.some(x => !x.egg && x.hp > 0)) { sfx('weak'); return this.toast('Mindestens eine kampffähige Kreatur muss im Team bleiben!'); }
      if (tgt) {
        s.box.splice(s.box.indexOf(tgt), 1); delete tgt.slot; this.held = { m: tgt, from: 'box', fi: this.i, b: this.b };
      } else this.held = null;
      m.slot = slot; s.box.push(m);
    }
    sfx('caught');
  }
  // Abbrechen: zurück an den Ursprungsplatz
  drop(from, fi, cancel) {
    const H0 = this.held; if (!H0) return; const s = this.s, m = H0.m;
    if (from === 'team' && s.team.length < 6) s.team.splice(Math.min(fi, s.team.length), 0, m);
    else { const used = new Set(s.box.map(x => x.slot)); let slot = H0.b * PER + fi; if (from === 'team' || used.has(slot)) slot = this.freeSlot(); if (slot < 0) { s.team.push(m); } else { m.slot = slot; s.box.push(m); } }
    this.held = null; if (cancel) sfx('click');
  }
  async release(m) {
    if (this.zone === 'team' && !m.egg && m.hp > 0 && this.healthy(m) < 1) { sfx('weak'); return this.toast('Das ist deine letzte kampffähige Kreatur!'); }
    if (!await ask(`${monName(m)} wirklich freilassen?`)) return;
    if (!await ask('Bist du dir ganz sicher? Das kann man nicht rückgängig machen.')) return;
    const s = this.s; if (this.zone === 'team') s.team.splice(s.team.indexOf(m), 1); else s.box.splice(s.box.indexOf(m), 1);
    if (!m.egg) cry(SPECIES[m.sp].cry);
    await say(`${monName(m)} wurde freigelassen. Mach's gut, ${monName(m)}!`);
  }
  async boxMenu() {
    this.busy = true;
    try {
      const M = this.s.boxMeta[this.b];
      const k = await choose(['Hintergrund', 'Umbenennen', 'Nach Nummer sortieren', 'Nach Level sortieren', 'Zurück'], { title: M.name });
      if (k === 0) { const w = await choose(WALL.map(w => w[0]), { title: 'HINTERGRUND', max: 8 }); if (w != null) M.wall = w; }
      else if (k === 1) { M.name = (await inputName('Box-Name', M.name, 10)) || M.name; }
      else if (k === 2 || k === 3) {
        const lo = this.b * PER, L = this.s.box.filter(m => m.slot >= lo && m.slot < lo + PER);
        L.sort(k === 2 ? (a, b) => (SPECIES[a.sp]?.num || 999) - (SPECIES[b.sp]?.num || 999) : (a, b) => b.lvl - a.lvl).forEach((m, j) => (m.slot = lo + j)); sfx('caught');
      }
    } finally { this.busy = false; }
  }
  toast(t) { this.msg = { t, l: 2 }; }

  cell(i) { return [87 + (i % COLS) * 25, 23 + Math.floor(i / COLS) * 26]; }
  tcell(i) { return [4 + (i % 2) * 39, 86 + Math.floor(i / 2) * 23]; }
  draw(ctx) {
    const s = this.s, M = s.boxMeta[this.b], Wl = WALL[M.wall % WALL.length];
    ctx.fillStyle = '#2a3048'; ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 8) for (let x = (y / 8) % 2 ? 0 : 8; x < W; x += 16) { ctx.fillStyle = '#323a56'; ctx.fillRect(x, y, 8, 8); }
    // Box-Kopf
    box(84, 3, 154, 17);
    text('◀', 92, 7, COL.frame, 8, 'center', null, true); text('▶', 230, 7, COL.frame, 8, 'center', null, true);
    text(M.name, 161, 7, COL.ink, 8, 'center', COL.shadow, true);
    if (this.zone === 'head') { ctx.strokeStyle = '#f8d040'; ctx.lineWidth = 1.5; rr(85, 4, 152, 15, 2); ctx.stroke(); }
    // Box-Fläche mit Hintergrund
    ctx.fillStyle = '#202436'; ctx.fillRect(84, 21, 154, 136);
    const g = ctx.createLinearGradient(0, 22, 0, 156); g.addColorStop(0, Wl[1]); g.addColorStop(1, Wl[2]); ctx.fillStyle = g; ctx.fillRect(85, 22, 152, 134);
    ctx.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(100 + i * 27, 40 + (i % 3) * 40, 9 + (i % 2) * 5, 0, 7); ctx.fill(); }
    for (let i = 0; i < PER; i++) {
      const [x, y] = this.cell(i), m = this.at('box', i);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x + 2, y + 18, 20, 4);
      if (m) ctx.drawImage(monIcon(m), x - 2, y - 3, 28, 28);
      if (m?.shiny) { ctx.fillStyle = '#fff8a0'; ctx.fillRect(x + 20, y + 1, 2, 2); }
    }
    // Team-Spalte
    box(2, 84, 80, 72);
    text('TEAM', 42, 76, '#f8f8f8', 7, 'center', null, true);
    for (let i = 0; i < 6; i++) {
      const [x, y] = this.tcell(i), m = this.team[i];
      ctx.fillStyle = m ? (m.hp <= 0 && !m.egg ? '#e8c0c0' : '#d8ecf8') : '#e8e8e0'; rr(x, y, 37, 21, 3); ctx.fill();
      if (m) { ctx.drawImage(monIcon(m), x - 2, y - 4, 26, 26); if (!m.egg) { text('Lv' + m.lvl, x + 35, y + 2, COL.ink, 6, 'right', null, true); const f = m.hp / maxHp(m); ctx.fillStyle = '#404850'; ctx.fillRect(x + 22, y + 13, 13, 3); ctx.fillStyle = f > 0.5 ? COL.hpG : f > 0.2 ? COL.hpY : COL.hpR; ctx.fillRect(x + 22, y + 13, Math.round(13 * f), 3); } }
    }
    // Infofeld zur gewählten Kreatur
    box(2, 3, 80, 72);
    const m = this.held?.m || this.cur();
    if (m) {
      const img = m.egg ? monIcon(m) : monSprite(m.sp, 'front', m.shiny, m.mut);
      ctx.drawImage(img, 21, 4, 42, 42);
      text(monName(m), 42, 50, COL.ink, 7, 'center', COL.shadow, true);
      if (!m.egg) genderMark(ctx, genderOf(m), Math.round(42 + measure(monName(m), 7) / 2 + 2), 51);
      if (!m.egg) { text('Lv' + m.lvl, 8, 60, COL.inkSoft, 6.5, 'left', null, true); SPECIES[m.sp].types.slice(0, 1).forEach(t => typeTag(t, 42, 60)); }
    } else text(this.zone === 'head' ? 'A: Box-Menü' : '– leer –', 42, 34, COL.inkSoft, 7, 'center', null);
    // Cursor (Hand) und gehaltene Kreatur
    let cx, cy;
    if (this.zone === 'box') [cx, cy] = this.cell(this.i); else if (this.zone === 'team') [cx, cy] = this.tcell(this.i); else [cx, cy] = [155, 4];
    const bob = Math.round(Math.sin(this.bob * 7) * 1.5);
    if (this.zone !== 'head') { ctx.strokeStyle = '#f8d040'; ctx.lineWidth = 1.5; rr(cx - 0.5, cy - 0.5, this.zone === 'team' ? 38 : 25, this.zone === 'team' ? 22 : 26, 3); ctx.stroke(); }
    if (this.held) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(cx + 12, cy + 22, 8, 2, 0, 0, 7); ctx.fill(); ctx.drawImage(monIcon(this.held.m), cx - 2, cy - 12 + bob, 28, 28); }
    // Hand-Cursor
    const hx = cx + 14, hy = cy - (this.held ? 16 : 6) + bob;
    ctx.fillStyle = '#28283a'; ctx.fillRect(hx - 1, hy - 1, 8, 9); ctx.fillStyle = '#ffffff'; ctx.fillRect(hx, hy, 6, 7); ctx.fillStyle = '#f8d040'; ctx.fillRect(hx + 1, hy + 4, 4, 2); ctx.fillStyle = '#28283a'; ctx.fillRect(hx + 2, hy + 1, 1, 3);
    // Hilfe / Meldung
    const help = this.held ? 'A: ablegen/tauschen · B: zurück' : 'A: Menü · SELECT: greifen · B: Ende';
    if (this.msg && (this.msg.l -= 1 / 60) > 0) { box(20, 62, 200, 22); text(this.msg.t, 120, 69, COL.ink, 7, 'center', COL.shadow, true); }
    ctx.fillStyle = 'rgba(20,24,40,.75)'; ctx.fillRect(85, 150, 152, 8); text(help, 161, 151, '#f8f8f8', 5.5, 'center', null);
  }
}
export function boxScreen(game) { return new Promise(res => push(new BoxScene(game, res))); }
