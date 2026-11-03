// Menüs & Dialoge im Handheld-Stil (Steuerkreuz + A/B, Antippen geht auch)
import { G, W, H, COL, push, pop, input, text, wrap, box, cursor, bar, inRect, rr } from './engine.js';
import { sfx } from '../core/audio.js';
import { SPECIES, RARITY } from '../data/creatures.js';
import { MOVES } from '../data/moves.js';
import { TYPES } from '../data/types.js';
import { calcStats, maxHp, monName, xpForLevel } from '../data/mon.js';
import { monSprite, trainerSprite } from './sprites.js';
import { eggSprite } from './pixel.js';
import { ITEMS } from './maps.js';

export const settings = { textSpeed: 2 };
const SPEED = [25, 45, 90, 400];

// ---------------------------------------------------------------- Dialog
class Dialog {
  constructor(str, opts, res) {
    this.overlay = true; this.opts = opts; this.res = res;
    const lines = wrap(str, 216, 8.5);
    this.pages = []; for (let i = 0; i < lines.length; i += 2) this.pages.push(lines.slice(i, i + 2));
    this.page = 0; this.chars = 0;
  }
  get full() { return this.pages[this.page].join('\n'); }
  update(dt) {
    this.chars = Math.min(this.full.length, this.chars + dt * SPEED[settings.textSpeed]);
    if (input.pressed('a') || input.pressed('b') || input.tap) {
      if (this.chars < this.full.length) { this.chars = this.full.length; return; }
      sfx('click');
      if (this.page < this.pages.length - 1) { this.page++; this.chars = 0; return; }
      pop(this); this.res();
    }
  }
  draw(ctx) {
    box(3, 114, 234, 43);
    if (this.opts.name) { box(6, 104, Math.min(120, this.opts.name.length * 5.2 + 12), 13, 'dark'); text(this.opts.name, 12, 107, '#fff', 7, 'left', null, true); }
    let n = Math.floor(this.chars), y = 121;
    for (const l of this.pages[this.page]) { text(l.slice(0, Math.max(0, n)), 12, y, COL.ink, 8.5); n -= l.length + 1; y += 15; }
    if (this.chars >= this.full.length && Math.sin(G.t * 8) > 0) { ctx.fillStyle = '#e84a5f'; ctx.beginPath(); ctx.moveTo(224, 147); ctx.lineTo(230, 147); ctx.lineTo(227, 151); ctx.fill(); }
  }
}
export function say(str, opts = {}) {
  const parts = Array.isArray(str) ? str : [str];
  return parts.reduce((p, s) => p.then(() => new Promise(res => push(new Dialog(s, opts, res)))), Promise.resolve());
}

// ---------------------------------------------------------------- Auswahlliste
class Choice {
  constructor(items, o, res) {
    this.overlay = true; this.items = items.map(i => (typeof i === 'string' ? { label: i } : i)); this.o = o; this.res = res;
    this.i = o.start || 0; this.scroll = 0; this.max = o.max || 6;
    const wMax = Math.max(...this.items.map(it => it.label.length * 5.4 + (it.right ? it.right.length * 5 + 14 : 0))) + 22;
    this.w = o.w || Math.min(W - 8, Math.max(64, wMax));
    this.h = Math.min(this.items.length, this.max) * 13 + 8 + (o.title ? 13 : 0);
    this.x = o.x ?? W - this.w - 3; this.y = o.y ?? (o.above === false ? 4 : 113 - this.h);
  }
  update() {
    const n = this.items.length;
    if (input.repeat('down')) { this.i = (this.i + 1) % n; sfx('click'); }
    if (input.repeat('up')) { this.i = (this.i - 1 + n) % n; sfx('click'); }
    if (this.i < this.scroll) this.scroll = this.i; if (this.i >= this.scroll + this.max) this.scroll = this.i - this.max + 1;
    const t = input.tap;
    if (t) {
      const oy = this.y + 4 + (this.o.title ? 13 : 0);
      if (inRect(t, this.x, oy, this.w, this.max * 13)) { const k = this.scroll + Math.floor((t.y - oy) / 13); if (k < n) { this.i = k; return this.pick(); } }
      else if (this.o.cancel !== false) return this.close(null);
    }
    if (input.pressed('a')) this.pick();
    if (input.pressed('b') && this.o.cancel !== false) this.close(null);
  }
  pick() { const it = this.items[this.i]; if (it.disabled) { sfx('weak'); return; } sfx('click'); this.close(this.i); }
  close(v) { pop(this); this.res(v); }
  draw() {
    box(this.x, this.y, this.w, this.h);
    let y = this.y + 5;
    if (this.o.title) { text(this.o.title, this.x + 8, y, COL.frame, 7.5, 'left', null, true); y += 13; }
    for (let k = this.scroll; k < Math.min(this.items.length, this.scroll + this.max); k++) {
      const it = this.items[k];
      if (k === this.i) cursor(this.x + 5, y + 1);
      text(it.label, this.x + 13, y, it.disabled ? COL.inkSoft : COL.ink, 8);
      if (it.right) text(it.right, this.x + this.w - 8, y, COL.inkSoft, 7.5, 'right');
      y += 13;
    }
    if (this.scroll > 0) text('▲', this.x + this.w - 10, this.y + 2, COL.inkSoft, 6);
    if (this.scroll + this.max < this.items.length) text('▼', this.x + this.w - 10, this.y + this.h - 9, COL.inkSoft, 6);
  }
}
export const choose = (items, o = {}) => new Promise(res => push(new Choice(items, o, res)));
export async function ask(q, opts = {}) { await say(q, opts); return (await choose(['Ja', 'Nein'], { cancel: true })) === 0; }

// ---------------------------------------------------------------- Name eingeben (natives Eingabefeld → Handy-Tastatur)
export function inputName(title, def = '') {
  return new Promise(res => {
    const o = document.getElementById('nameinput'); o.hidden = false;
    o.innerHTML = `<div class="ni"><label>${title}</label><input maxlength="12" value="${def}"><button>OK</button></div>`;
    const inp = o.querySelector('input'); setTimeout(() => inp.focus(), 50);
    const done = () => { const v = inp.value.trim() || def || 'Alex'; o.hidden = true; res(v.slice(0, 12)); };
    o.querySelector('button').onclick = done; inp.onkeydown = e => { if (e.key === 'Enter') done(); };
  });
}

// ---------------------------------------------------------------- Typ-Plakette
export function typeTag(t, x, y) {
  const c = G.ctx; c.fillStyle = '#28283a'; rr(x, y, 34, 10, 2); c.fill();
  c.fillStyle = TYPES[t].color; rr(x + 0.8, y + 0.8, 32.4, 8.4, 1.5); c.fill();
  text(TYPES[t].name.toUpperCase(), x + 17, y + 1.6, '#fff', 6.2, 'center', 'rgba(0,0,0,.45)', true);
}

export function monIcon(m) { return m.egg ? eggSprite(32, '#f8f0d8', SPECIES[m.sp]?.model.main || '#7fd0ff') : monSprite(m.sp, 'icon', m.shiny, m.mut); }

// ---------------------------------------------------------------- Team
class Party {
  constructor(state, o, res) { this.s = state; this.o = o; this.res = res; this.i = 0; this.swap = null; }
  get team() { return this.s.team; }
  update() {
    const n = this.team.length + 1; // + Abbrechen
    if (input.repeat('down') || input.repeat('right')) { this.i = (this.i + 1) % n; sfx('click'); }
    if (input.repeat('up') || input.repeat('left')) { this.i = (this.i - 1 + n) % n; sfx('click'); }
    const t = input.tap;
    if (t) { const k = this.hit(t); if (k != null) { this.i = k; this.act(); } }
    else if (input.pressed('a')) this.act();
    if (input.pressed('b')) { if (this.swap != null) this.swap = null; else this.close(null); }
  }
  hit(t) { for (let k = 0; k < this.team.length; k++) { const [x, y] = this.pos(k); if (inRect(t, x, y, 114, 40)) return k; } if (inRect(t, 176, 140, 60, 16)) return this.team.length; return null; }
  pos(k) { return [k % 2 ? 122 : 4, 4 + Math.floor(k / 2) * 43]; }
  async act() {
    sfx('click');
    if (this.i === this.team.length) return this.close(null);
    if (this.swap != null) { const a = this.swap, b = this.i; [this.team[a], this.team[b]] = [this.team[b], this.team[a]]; this.swap = null; return; }
    const m = this.team[this.i];
    if (this.o.select) { if (this.o.filter && !this.o.filter(m)) { sfx('weak'); return; } return this.close(this.i); }
    const k = await choose(m.egg ? ['Ansehen', 'Verschieben', 'Zurück'] : ['Bericht', 'Verschieben', 'Zurück']);
    if (k === 0) await (m.egg ? say(eggText(m)) : summary(m));
    if (k === 1) this.swap = this.i;
  }
  close(v) { pop(this); this.res(v); }
  draw(ctx) {
    ctx.fillStyle = '#3a8a6a'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#48a07a'; for (let y = 0; y < H; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < W; x += 8) ctx.fillRect(x, y, 3, 3);
    this.team.forEach((m, k) => {
      const [x, y] = this.pos(k), sel = k === this.i, sw = k === this.swap;
      box(x, y, 114, 40, sel ? 'gold' : sw ? 'red' : 'default');
      ctx.drawImage(monIcon(m), x + 2, y + 4);
      text(m.egg ? 'Ei' : monName(m), x + 34, y + 5, COL.ink, 8, 'left', COL.shadow, true);
      if (!m.egg) {
        text('Lv' + m.lvl, x + 108, y + 5, COL.ink, 7.5, 'right');
        bar(x + 46, y + 19, 60, 3.5, m.hp / maxHp(m));
        text('KP', x + 34, y + 17, COL.frame, 6.5, 'left', null, true);
        text(`${m.hp}/${maxHp(m)}`, x + 108, y + 26, COL.ink, 7, 'right');
        if (m.mut) text('MUTANT', x + 34, y + 27, '#c03a90', 6, 'left', null, true);
        if (this.o.filter && this.o.select && !this.o.filter(m)) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 2, y + 2, 110, 36); }
      } else text(`noch ca. ${Math.max(1, Math.round(m.steps / 50))} Runden`, x + 34, y + 20, COL.inkSoft, 7);
    });
    box(176, 140, 60, 17, this.i === this.team.length ? 'gold' : 'default');
    text('Zurück', 206, 144, COL.ink, 8, 'center');
    box(3, 140, 170, 17, 'dark');
    text(this.swap != null ? 'Mit wem tauschen?' : this.o.prompt || 'Wähle eine Kreatur.', 9, 144, '#fff', 7.5, 'left', null);
  }
}
export const party = (state, o = {}) => new Promise(res => push(new Party(state, o, res)));
const eggText = m => `Ein Ei von ${m.parents?.join(' und ') || 'unbekannten Eltern'}. ${m.steps > 200 ? 'Es wird wohl noch eine Weile dauern.' : m.steps > 60 ? 'Manchmal hört man es wackeln!' : 'Es bewegt sich! Gleich schlüpft es!'}`;

// ---------------------------------------------------------------- Bericht
class Summary {
  constructor(m, res) { this.m = m; this.res = res; this.page = 0; }
  update() {
    if (input.pressed('left') || input.pressed('right') || input.tap) { this.page ^= 1; sfx('click'); }
    if (input.pressed('b') || input.pressed('a')) { pop(this); this.res(); }
  }
  draw(ctx) {
    const m = this.m, S = SPECIES[m.sp];
    ctx.fillStyle = '#f0f4f8'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = TYPES[S.types[0]].color; ctx.fillRect(0, 0, W, 18);
    text(this.page ? 'ATTACKEN & GESCHICHTE' : 'BERICHT', 8, 4, '#fff', 8, 'left', 'rgba(0,0,0,.4)', true);
    text('◀ ▶', 230, 5, '#fff', 7, 'right', null);
    ctx.fillStyle = '#dfe8f0'; ctx.fillRect(4, 22, 76, 76);
    ctx.drawImage(monSprite(m.sp, 'front', m.shiny, m.mut), 10, 26);
    text(monName(m), 6, 101, COL.ink, 8.5, 'left', COL.shadow, true);
    text(`Lv ${m.lvl}  #${S.num}`, 6, 113, COL.inkSoft, 7.5);
    S.types.forEach((t, i) => typeTag(t, 6 + i * 37, 125));
    text(RARITY[S.rarity].name + (m.mut ? ' · Mutant' : '') + (m.shiny ? ' ✦' : ''), 6, 140, S.rarity === 'mutation' ? '#c03a90' : COL.inkSoft, 7, 'left', null, true);
    if (!this.page) {
      const st = calcStats(m), names = [['KP', 'hp'], ['Angriff', 'atk'], ['Verteid.', 'def'], ['Sp.-Ang.', 'spa'], ['Sp.-Vert.', 'spd'], ['Initiative', 'spe']];
      box(86, 22, 150, 86);
      names.forEach(([n, k], i) => { text(n, 94, 28 + i * 12, COL.ink, 7.5); text(k === 'hp' ? `${m.hp}/${st.hp}` : String(st[k]), 228, 28 + i * 12, COL.ink, 7.5, 'right', null, true); });
      box(86, 110, 150, 46);
      const need = xpForLevel(m.lvl + 1) - m.xp;
      text(`EP: ${m.xp}`, 94, 116, COL.ink, 7.5); text(`Bis Lv ${m.lvl + 1}: ${need}`, 94, 127, COL.ink, 7.5);
      bar(94, 141, 134, 3, (m.xp - xpForLevel(m.lvl)) / (xpForLevel(m.lvl + 1) - xpForLevel(m.lvl)), 'xp');
    } else {
      box(86, 22, 150, 62);
      m.moves.forEach((mv, i) => { const M = MOVES[mv.id]; typeTag(M.type, 92, 28 + i * 13); text(M.name, 130, 28.5 + i * 13, COL.ink, 7.5); text(`${mv.pp}/${M.pp}`, 228, 28.5 + i * 13, COL.inkSoft, 7, 'right'); });
      box(86, 86, 150, 70);
      let lore = S.lore; if (m.hatchedFrom) lore += ` Geschlüpft aus dem Ei von ${m.hatchedFrom.join(' & ')}.`;
      wrap(lore, 136, 6.8).slice(0, 7).forEach((l, i) => text(l, 92, 91 + i * 9, COL.ink, 6.8, 'left', null));
    }
  }
}
export const summary = m => new Promise(res => push(new Summary(m, res)));

// ---------------------------------------------------------------- Chronik
class Dex {
  constructor(state, res) {
    this.s = state; this.res = res; this.i = 0; this.scroll = 0;
    this.list = Object.entries(SPECIES).filter(([, S]) => !S.fusion).sort((a, b) => a[1].num - b[1].num);
    const muts = Object.keys(state.dex.caught).filter(id => SPECIES[id]?.fusion);
    this.list.push(...muts.map(id => [id, SPECIES[id]]));
  }
  update() {
    const n = this.list.length;
    if (input.repeat('down')) { this.i = Math.min(n - 1, this.i + 1); sfx('click'); }
    if (input.repeat('up')) { this.i = Math.max(0, this.i - 1); sfx('click'); }
    if (input.repeat('right')) this.i = Math.min(n - 1, this.i + 9);
    if (input.repeat('left')) this.i = Math.max(0, this.i - 9);
    if (this.i < this.scroll) this.scroll = this.i; if (this.i >= this.scroll + 10) this.scroll = this.i - 9;
    if (input.tap && input.tap.x < 110) { const k = this.scroll + Math.floor((input.tap.y - 20) / 13); if (k >= 0 && k < n) this.i = k; }
    if (input.pressed('b') || (input.tap && input.tap.x > 200 && input.tap.y < 18)) { pop(this); this.res(); }
  }
  draw(ctx) {
    ctx.fillStyle = '#c84848'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#a83838'; ctx.fillRect(0, 0, W, 17);
    const base = this.list.filter(([, S]) => !S.fusion);
    text(`CHRONIK  Gesehen ${base.filter(([id]) => this.s.dex.seen[id]).length}  Gebunden ${base.filter(([id]) => this.s.dex.caught[id]).length}/${base.length}`, 6, 4, '#fff', 7.5, 'left', null, true);
    text('B ✕', 234, 4, '#fff', 7.5, 'right', null);
    box(3, 19, 110, 138);
    for (let k = this.scroll; k < Math.min(this.list.length, this.scroll + 10); k++) {
      const [id, S] = this.list[k], seen = this.s.dex.seen[id], y = 24 + (k - this.scroll) * 13;
      if (k === this.i) cursor(7, y + 1);
      text(S.fusion ? 'MUT' : String(S.num).padStart(3, '0'), 15, y, S.fusion ? '#c03a90' : COL.inkSoft, 7);
      text(seen ? S.name : '?????', 37, y, COL.ink, 7.5);
      if (this.s.dex.caught[id]) { ctx.fillStyle = '#e84a5f'; ctx.beginPath(); ctx.arc(104, y + 4, 2.5, 0, 7); ctx.fill(); }
    }
    const [id, S] = this.list[this.i], seen = this.s.dex.seen[id], caught = this.s.dex.caught[id];
    box(116, 19, 121, 138);
    ctx.fillStyle = '#e8f0f0'; ctx.fillRect(122, 25, 109, 66);
    if (seen) {
      const spr = monSprite(id, 'front');
      if (!caught) { ctx.globalAlpha = 0.9; }
      ctx.drawImage(spr, 144, 26); ctx.globalAlpha = 1;
      text(S.name, 122, 94, COL.ink, 8.5, 'left', COL.shadow, true);
      S.types.forEach((t, i) => typeTag(t, 122 + i * 37, 106));
      if (caught) wrap(S.lore, 108, 6.5).slice(0, 4).forEach((l, i) => text(l, 122, 119 + i * 8.5, COL.ink, 6.5, 'left', null));
      else text('Noch nicht gebunden.', 122, 120, COL.inkSoft, 7);
    } else text('?', 176, 48, COL.inkSoft, 20, 'center');
  }
}
export const dex = s => new Promise(res => push(new Dex(s, res)));

// ---------------------------------------------------------------- Trainerpass
class Card {
  constructor(s, res) { this.s = s; this.res = res; }
  update() { if (input.pressed('a') || input.pressed('b') || input.tap) { pop(this); this.res(); } }
  draw(ctx) {
    const s = this.s;
    ctx.fillStyle = '#2a4a7a'; ctx.fillRect(0, 0, W, H);
    box(8, 8, 224, 144, 'gold');
    text('TRAINERPASS', 18, 16, '#a87818', 9, 'left', null, true);
    ctx.drawImage(trainerSprite(s.look), 160, 26);
    const pt = Math.floor(s.playtime / 60);
    const rows = [['Name', s.name], ['Geld', s.money + ' ◈'], ['Chronik', Object.keys(s.dex.caught).length + ' gebunden'], ['Spielzeit', `${Math.floor(pt / 60)}:${String(pt % 60).padStart(2, '0')}`], ['Schritte', String(s.steps || 0)]];
    rows.forEach(([a, b], i) => { text(a, 20, 34 + i * 14, COL.inkSoft, 8); text(b, 150, 34 + i * 14, COL.ink, 8, 'right', null, true); });
    text('ORDEN', 20, 110, '#a87818', 8, 'left', null, true);
    for (let i = 0; i < 8; i++) {
      const has = s.badges?.[i];
      ctx.fillStyle = has ? '#c9a76a' : '#e0d8c0'; ctx.beginPath(); ctx.arc(28 + i * 26, 132, 9, 0, 7); ctx.fill();
      if (has) { ctx.fillStyle = '#7a5a30'; ctx.beginPath(); ctx.moveTo(28 + i * 26, 125); ctx.lineTo(34 + i * 26, 132); ctx.lineTo(28 + i * 26, 139); ctx.lineTo(22 + i * 26, 132); ctx.fill(); }
    }
  }
}
export const card = s => new Promise(res => push(new Card(s, res)));

// ---------------------------------------------------------------- Vollbild-Ereignisse: Schlüpfen & Entwicklung
class Reveal {
  constructor(kind, a, b, res) { this.kind = kind; this.a = a; this.b = b; this.res = res; this.t = 0; this.done = false; this.parts = []; }
  update(dt) {
    this.t += dt;
    const T = this.kind === 'hatch' ? 3.6 : 4.2;
    if (this.t > T && !this.done) { this.done = true; sfx('caught'); for (let i = 0; i < 40; i++) this.parts.push({ x: 120, y: 70, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.7) * 140, l: 1 }); }
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; p.l -= dt; }
    if (this.done && this.t > T + 0.8 && (input.pressed('a') || input.pressed('b') || input.tap)) { pop(this); this.res(); }
    if (this.kind === 'hatch' && Math.floor(this.t * 2.5) !== this.lastW && this.t < T) { this.lastW = Math.floor(this.t * 2.5); if (this.lastW % 2) sfx('wobble'); }
    if (this.kind === 'evo' && this.t < T && Math.floor(this.t * 6) !== this.lastE) { this.lastE = Math.floor(this.t * 6); if (this.lastE % 3 === 0) sfx('click'); }
  }
  draw(ctx) {
    const T = this.kind === 'hatch' ? 3.6 : 4.2;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a2a4a'); g.addColorStop(1, '#4a3a6a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) { const a = G.t * 0.5 + i * 0.52; ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.moveTo(120, 70); ctx.arc(120, 70, 200, a, a + 0.2); ctx.fill(); }
    if (this.kind === 'hatch') {
      if (!this.done) {
        const wob = Math.sin(this.t * 14) * (this.t > 1 ? 0.25 * (this.t / T) : 0.05);
        ctx.save(); ctx.translate(120, 90); ctx.rotate(wob);
        ctx.drawImage(eggSprite(64, '#f8f0d8', this.a.model.main, Math.floor(this.t / T * 4)), -32, -58); ctx.restore();
        if (this.t > T - 0.4) { ctx.fillStyle = `rgba(255,255,255,${(this.t - T + 0.4) / 0.4})`; ctx.fillRect(0, 0, W, H); }
      } else ctx.drawImage(this.b, 88, 34);
    } else {
      const flick = this.t > 1 && !this.done && Math.floor(this.t * Math.min(16, 2 + this.t * 3)) % 2;
      const img = this.done ? this.b : flick ? this.b : this.a;
      if (!this.done && this.t > 1) { ctx.filter = 'brightness(0) invert(1)'; }
      ctx.drawImage(img, 88, 34); ctx.filter = 'none';
      if (this.done) { ctx.fillStyle = `rgba(255,255,255,${Math.max(0, 1 - (this.t - T) * 2)})`; ctx.fillRect(0, 0, W, H); }
    }
    for (const p of this.parts) if (p.l > 0) { ctx.fillStyle = ['#fff6a8', '#ffffff', '#9ff3ff'][Math.floor(p.x) % 3]; ctx.fillRect(p.x, p.y, 2, 2); }
    if (this.done) { box(3, 114, 234, 43); wrap(this.msg || '', 216, 8.5).slice(0, 2).forEach((l, i) => text(l, 12, 121 + i * 15, COL.ink, 8.5)); }
  }
}
export function hatchScene(eggSpecies, newSprite, msg) { return new Promise(res => { const r = new Reveal('hatch', eggSpecies, newSprite, res); r.msg = msg; push(r); }); }
export function evoScene(oldSprite, newSprite, msg) { return new Promise(res => { const r = new Reveal('evo', oldSprite, newSprite, res); r.msg = msg; push(r); }); }

export { ITEMS };
