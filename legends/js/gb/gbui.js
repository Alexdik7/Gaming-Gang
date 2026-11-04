// Menüs & Dialoge im Handheld-Stil (Steuerkreuz + A/B, Antippen geht auch)
import { G, W, H, COL, push, pop, input, text, wrap, box, cursor, bar, inRect, rr } from './engine.js';
import { sfx } from '../core/audio.js';
import { SPECIES, RARITY } from '../data/creatures.js';
import { MOVES } from '../data/moves.js';
import { TYPES } from '../data/types.js';
import { calcStats, maxHp, monName, xpForLevel } from '../data/mon.js';
import { monSprite, trainerSprite } from './sprites.js';
import { eggSprite, crystalIcon } from './pixel.js';
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
    if (this.o.tabs && (input.repeat('left') || input.repeat('right'))) { sfx('open'); return this.close(input.repeat('left') ? 'L' : 'R'); }
    if (input.pressed('a')) this.pick();
    if (input.pressed('b') && this.o.cancel !== false) this.close(null);
  }
  pick() { const it = this.items[this.i]; if (it.disabled) { sfx('weak'); return; } sfx('click'); this.close(this.i); }
  close(v) { pop(this); this.res(v); }
  draw(ctx) {
    this.o.side?.(ctx);
    const dsc = this.items[this.i]?.desc;
    if (dsc !== undefined) { box(0, 113, W, 47, 'dark'); wrap(dsc, 224, 8).slice(0, 2).forEach((l, i) => text(l, 9, 121 + i * 14, '#fff', 8, 'left', '#50586a')); }
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
// Nicht blockierende Wartemeldung (z. B. auf Mitspieler warten) → gibt Schließen-Funktion zurück
class Waiting {
  constructor(t) { this.overlay = true; this.t = t; }
  draw() { box(3, 114, 234, 43); const l = wrap(this.t + '.'.repeat(Math.floor(G.t * 3) % 4), 216, 8.5); l.slice(0, 2).forEach((s, i) => text(s, 12, 121 + i * 15, COL.ink, 8.5)); }
}
export function waitMsg(t) { const w = new Waiting(t); push(w); return () => pop(w); }
export const choose = (items, o = {}) => new Promise(res => push(new Choice(items, o, res)));
export async function ask(q, opts = {}) { await say(q, opts); return (await choose(['Ja', 'Nein'], { cancel: true })) === 0; }

// ---------------------------------------------------------------- Name eingeben (natives Eingabefeld → Handy-Tastatur)
export function inputName(title, def = '', max = 12) {
  return new Promise(res => {
    const o = document.getElementById('nameinput'); o.hidden = false;
    o.innerHTML = `<div class="ni"><label>${title}</label><input maxlength="${max}" value="${def}" autocapitalize="off" autocomplete="off"><button>OK</button></div>`;
    const inp = o.querySelector('input'); setTimeout(() => inp.focus(), 50);
    const done = () => { const v = inp.value.trim() || (max === 12 ? def || 'Alex' : ''); inp.blur(); o.hidden = true; res(v.slice(0, max)); };
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
  constructor(state, o, res) { this.s = state; this.o = o; this.res = res; this.i = o.filter ? Math.max(0, state.team.findIndex(o.filter)) : 0; this.swap = null; }
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
  hit(t) { for (let k = 0; k < this.team.length; k++) { const [x, y, w, h] = this.pos(k); if (inRect(t, x, y, w, h)) return k; } if (inRect(t, 176, 140, 60, 16)) return this.team.length; return null; }
  // erste Kreatur groß links, die anderen als Leisten rechts
  pos(k) { return k === 0 ? [4, 20, 86, 58] : [94, 4 + (k - 1) * 26, 143, 24]; }
  async act() {
    sfx('click');
    if (this.i === this.team.length) return this.close(null);
    if (this.swap != null) { const a = this.swap, b = this.i; [this.team[a], this.team[b]] = [this.team[b], this.team[a]]; this.swap = null; return; }
    const m = this.team[this.i];
    if (this.o.select) { if (this.o.filter && !this.o.filter(m)) { sfx('weak'); return; } return this.close(this.i); }
    const fo = !m.egg && this.o.field ? this.o.field(m) : [];
    const k = await choose(m.egg ? ['Ansehen', 'Verschieben', 'Zurück'] : ['Bericht', ...fo.map(f => f.label), 'Verschieben', 'Zurück']);
    if (k === null) return;
    if (k === 0) return void await (m.egg ? say(eggText(m)) : summary(m));
    if (!m.egg && k <= fo.length) { this.o.picked = fo[k - 1]; return this.close(null); }
    if (k === (m.egg ? 1 : fo.length + 1)) this.swap = this.i;
  }
  close(v) { pop(this); this.res(v); }
  draw(ctx) {
    // Hintergrund: Blaugrün mit schrägen Streifen
    ctx.fillStyle = '#287868'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#30887a'; for (let x = -H; x < W; x += 12) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + 6, H); ctx.lineTo(x + 6 + H, 0); ctx.lineTo(x + H, 0); ctx.fill(); }
    const panel = (x, y, w, h, sel, sw, fainted) => {
      ctx.fillStyle = '#183830'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      if (fainted) { g.addColorStop(0, '#d89090'); g.addColorStop(1, '#b86868'); }
      else if (sel) { g.addColorStop(0, '#f8c070'); g.addColorStop(1, '#e88838'); }
      else if (sw) { g.addColorStop(0, '#f89898'); g.addColorStop(1, '#d85858'); }
      else { g.addColorStop(0, '#68b8f0'); g.addColorStop(1, '#3888c8'); }
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + 1, y + 1, w - 2, 1);
      if (sel) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
    };
    this.team.forEach((m, k) => {
      const [x, y, w, h] = this.pos(k), sel = k === this.i, sw = k === this.swap, big = k === 0;
      panel(x, y, w, h, sel, sw, !m.egg && m.hp <= 0);
      const hop = sel && !m.egg ? (Math.floor(G.t * 4) % 2) * -2 : 0;
      if (big) ctx.drawImage(monIcon(m), x + 2, y + 2 + hop); else ctx.drawImage(monIcon(m), x - 2, y - 6 + hop);
      const nx = big ? x + 6 : x + 30, ny = big ? y + 32 : y + 3;
      text(m.egg ? 'Ei' : monName(m), nx, ny, '#ffffff', 7.5, 'left', '#1a3a5a', true);
      if (!m.egg) {
        text('Lv' + m.lvl, big ? x + 40 : x + 30, big ? y + 6 : y + 13, '#ffffff', 7, 'left', '#1a3a5a', true);
        const bx = big ? x + 18 : x + 80, by = big ? y + 44 : y + 6, bw = big ? 62 : 56;
        ctx.fillStyle = '#183830'; ctx.fillRect(bx - 14, by - 1, bw + 15, 6);
        ctx.fillStyle = '#f8b030'; ctx.fillRect(bx - 13, by, 11, 4); text('KP', bx - 7.5, by - 0.5, '#583000', 4.5, 'center', null, true);
        bar(bx, by + 0.5, bw, 3, m.hp / maxHp(m));
        text(`${m.hp}/${maxHp(m)}`, big ? x + w - 6 : x + w - 5, big ? y + 50 : y + 13, '#ffffff', 7, 'right', '#1a3a5a', true);
        if (m.mut) text('MUT', big ? x + 64 : x + 30, big ? y + 6 : y + 13, '#ffd0f0', 6, 'left', null, true);
        if (m.status) text({ brand: 'BRD', gift: 'GIF', starre: 'STR' }[m.status], big ? x + 64 : x + 55, big ? y + 16 : y + 13, '#ffe08a', 6, 'left', '#5a2020', true);
        if (this.o.filter && this.o.select && !this.o.filter(m)) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, y, w, h); }
      } else text(`noch ca. ${Math.max(1, Math.round(m.steps / 50))} Runden`, nx, big ? y + 44 : y + 13, '#e8f0ff', 6.5);
    });
    for (let k = this.team.length; k < 6; k++) { if (k === 0) continue; const [x, y, w, h] = this.pos(k); ctx.fillStyle = 'rgba(10,40,40,.45)'; ctx.fillRect(x, y, w, h); }
    box(176, 140, 60, 17, this.i === this.team.length ? 'gold' : 'default');
    text('Zurück', 206, 144, COL.ink, 8, 'center');
    box(3, 140, 170, 17, 'dark');
    text(this.swap != null ? 'Mit wem tauschen?' : this.o.prompt || 'Wähle eine Kreatur.', 9, 144, '#fff', 7.5, 'left', null);
  }
}
export const party = (state, o = {}) => new Promise(res => push(new Party(state, o, res)));
const eggText = m => `Ein Ei von ${m.parents?.join(' und ') || 'unbekannten Eltern'}. ${m.steps > 200 ? 'Es wird wohl noch eine Weile dauern.' : m.steps > 60 ? 'Manchmal hört man es wackeln!' : 'Es bewegt sich! Gleich schlüpft es!'}`;

// ---------------------------------------------------------------- Bericht
const STATN = { atk: 'den Angriff', def: 'die Verteidigung', spa: 'den Spezial-Angriff', spd: 'die Spezial-Verteidigung', spe: 'die Initiative', acc: 'die Genauigkeit' };
function moveDesc(M) {
  const e = M.effect || {}, T = TYPES[M.type]?.name || M.type;
  let d = M.cat === 'phys' ? `Ein körperlicher ${T}-Angriff.` : M.cat === 'status' ? `Eine ${T}-Statusattacke.` : `Ein ${T}-Angriff mit Spezialkraft.`;
  if (e.stat) d += ` ${e.stages > 0 ? 'Erhöht' : 'Senkt'} ${STATN[e.stat] || e.stat} ${e.target === 'self' ? 'des Anwenders' : 'des Gegners'}${Math.abs(e.stages) > 1 ? ' stark' : ''}.`;
  if (e.status) d += ` Kann ${{ brand: 'Verbrennungen', gift: 'eine Vergiftung', starre: 'Starre' }[e.status]} verursachen${e.chance ? ` (${Math.round(e.chance * (e.chance <= 1 ? 100 : 1))} %)` : ''}.`;
  if (e.heal) d += ' Heilt den Anwender.';
  return d;
}
class Summary {
  constructor(m, res) { this.m = m; this.res = res; this.page = 0; this.mc = 0; }
  update() {
    if (input.pressed('right') || (input.tap && input.tap.x > 120)) { this.page = (this.page + 1) % 3; sfx('click'); }
    else if (input.pressed('left') || (input.tap && input.tap.x <= 120)) { this.page = (this.page + 2) % 3; sfx('click'); }
    if (this.page === 2 && this.m.moves.length) { if (input.repeat('down')) { this.mc = (this.mc + 1) % this.m.moves.length; sfx('click'); } if (input.repeat('up')) { this.mc = (this.mc - 1 + this.m.moves.length) % this.m.moves.length; sfx('click'); } }
    if (input.pressed('b') || input.pressed('a')) { pop(this); this.res(); }
  }
  draw(ctx) {
    const m = this.m, S = SPECIES[m.sp], tc = TYPES[S.types[0]].color, P = ['INFO', 'WERTE', 'ATTACKEN'];
    ctx.fillStyle = '#e8e0c8'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#d8cfb0'; for (let y = 0; y < H; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < W; x += 8) ctx.fillRect(x, y, 2, 2);
    // Kopfzeile mit Seiten
    ctx.fillStyle = '#304860'; ctx.fillRect(0, 0, W, 16);
    text('KREATUREN-' + P[this.page], 6, 4, '#fff', 7.5, 'left', null, true);
    P.forEach((_, i) => { ctx.fillStyle = i === this.page ? '#f8d050' : '#6a88a8'; ctx.fillRect(196 + i * 13, 5, 10, 6); });
    // linke Seite: Bild, Name, Level
    ctx.fillStyle = '#28202c'; ctx.fillRect(3, 19, 82, 84); const g = ctx.createLinearGradient(0, 20, 0, 102); g.addColorStop(0, '#f8f8f0'); g.addColorStop(1, tc); ctx.fillStyle = g; ctx.fillRect(4, 20, 80, 82);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(44, 88, 30, 7, 0, 0, 7); ctx.fill();
    ctx.drawImage(monSprite(m.sp, 'front', m.shiny, m.mut), 12, 24 + Math.round(Math.sin(G.t * 3)));
    if (m.shiny) text('✦', 78, 22, '#f8c830', 9, 'right', null, true);
    box(3, 106, 82, 50);
    text(monName(m), 9, 111, COL.ink, 8, 'left', COL.shadow, true);
    text('Lv' + m.lvl, 9, 124, COL.ink, 7.5, 'left', null, true);
    text('Nr.' + String(S.num).padStart(3, '0'), 79, 124, COL.inkSoft, 7, 'right');
    S.types.forEach((t, i) => typeTag(t, 8 + i * 37, 138));
    // rechte Seite
    box(89, 19, 148, 138);
    const L = (a, b, y, col = COL.ink) => { text(a, 96, y, COL.inkSoft, 7.5); text(b, 230, y, col, 7.5, 'right', null, true); };
    if (this.page === 0) {
      L('Art', S.name, 27); L('Seltenheit', RARITY[S.rarity].name + (m.mut ? ' · Mutant' : ''), 39);
      L('Trainer', m.ot || 'Du', 51); if (m.ball && ITEMS[m.ball]) { ctx.drawImage(crystalIcon(ITEMS[m.ball].col || '#7fe3ff'), 150, 49, 10, 10); } L('Freundschaft', '♥'.repeat(Math.max(1, Math.min(5, Math.round((m.friendship || 70) / 51)))), 63, (m.friendship || 70) >= 200 ? '#e89a10' : '#e84a6a');
      ctx.fillStyle = '#d8d0b8'; ctx.fillRect(96, 76, 134, 1);
      let lore = S.lore; if (m.hatchedFrom) lore += ` Geschlüpft aus dem Ei von ${m.hatchedFrom.join(' & ')}.`;
      wrap(lore, 132, 7).slice(0, 7).forEach((l, i) => text(l, 96, 82 + i * 10, COL.ink, 7, 'left', null));
    } else if (this.page === 1) {
      const st = calcStats(m), names = [['KP', 'hp'], ['Angriff', 'atk'], ['Verteid.', 'def'], ['Sp.-Ang.', 'spa'], ['Sp.-Vert.', 'spd'], ['Initiative', 'spe']];
      names.forEach(([n, k], i) => {
        const y = 26 + i * 13; text(n, 96, y, COL.ink, 7.5); text(k === 'hp' ? `${m.hp}/${st.hp}` : String(st[k]), 230, y, COL.ink, 7.5, 'right', null, true);
        const v = Math.min(1, (k === 'hp' ? st.hp / 1.6 : st[k]) / (m.lvl * 2 + 40)); ctx.fillStyle = '#d8d0b8'; ctx.fillRect(150, y + 3, 44, 3); ctx.fillStyle = tc; ctx.fillRect(150, y + 3, Math.round(44 * v), 3);
      });
      ctx.fillStyle = '#d8d0b8'; ctx.fillRect(96, 105, 134, 1);
      const need = xpForLevel(m.lvl + 1) - m.xp;
      text('EP', 96, 111, COL.inkSoft, 7.5); text(String(m.xp), 230, 111, COL.ink, 7.5, 'right', null, true);
      text('Bis Lv ' + (m.lvl + 1), 96, 124, COL.inkSoft, 7.5); text(String(Math.max(0, need)), 230, 124, COL.ink, 7.5, 'right', null, true);
      bar(96, 140, 134, 3, (m.xp - xpForLevel(m.lvl)) / (xpForLevel(m.lvl + 1) - xpForLevel(m.lvl)), 'xp');
    } else {
      m.moves.forEach((mv, i) => {
        const M = MOVES[mv.id], y = 24 + i * 18;
        if (i === this.mc) { ctx.fillStyle = 'rgba(248,208,80,.35)'; ctx.fillRect(93, y - 2, 140, 17); }
        typeTag(M.type, 95, y + 1); text(M.name, 133, y, COL.ink, 7.5, 'left', null, true); text(`AP ${mv.pp}/${M.pp}`, 230, y + 8, COL.inkSoft, 6.5, 'right');
      });
      const mv = m.moves[this.mc];
      if (mv) {
        const M = MOVES[mv.id]; ctx.fillStyle = '#d8d0b8'; ctx.fillRect(96, 98, 134, 1);
        text(M.cat === 'status' ? 'Status-Attacke' : `Stärke ${M.pow}`, 96, 103, COL.ink, 7.5, 'left', null, true);
        text(M.acc ? `Genauigkeit ${M.acc}` : 'trifft immer', 230, 103, COL.inkSoft, 7, 'right');
        wrap(moveDesc(M), 132, 7).slice(0, 4).forEach((l, i) => text(l, 96, 115 + i * 10, COL.ink, 7, 'left', null));
      }
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

// ---------------------------------------------------------------- Chronik-Eintrag nach dem ersten Fang (wie die Pokédex-Seite)
class DexEntry {
  constructor(sp, count, res) { this.sp = sp; this.n = count; this.res = res; this.t = 0; sfx('dex'); }
  update(dt) { this.t += dt; if (this.t > 0.8 && (input.pressed('a') || input.pressed('b') || input.tap)) { sfx('click'); pop(this); this.res(); } }
  draw(ctx) {
    const S = SPECIES[this.sp], k = Math.min(1, this.t / 0.35);
    ctx.fillStyle = '#b83030'; ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 4) { ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(0, y, W, 2); }
    ctx.fillStyle = '#8a2020'; ctx.fillRect(0, 0, W, 16);
    text('CHRONIK – NEUER EINTRAG', 8, 4, '#fff', 7.5, 'left', null, true);
    text(`Gebunden: ${this.n}`, 232, 4, '#ffd8d8', 7, 'right', null, true);
    // Bildschirm mit Raster
    ctx.fillStyle = '#28303a'; ctx.fillRect(8, 22, 100, 88); ctx.fillStyle = '#d8f0e8'; ctx.fillRect(11, 25, 94, 82);
    ctx.strokeStyle = 'rgba(40,120,100,.18)'; ctx.lineWidth = 1; for (let i = 0; i < 94; i += 8) { ctx.beginPath(); ctx.moveTo(11 + i + 0.5, 25); ctx.lineTo(11 + i + 0.5, 107); ctx.stroke(); } for (let i = 0; i < 82; i += 8) { ctx.beginPath(); ctx.moveTo(11, 25 + i + 0.5); ctx.lineTo(105, 25 + i + 0.5); ctx.stroke(); }
    ctx.save(); ctx.globalAlpha = k; ctx.drawImage(monSprite(this.sp, 'front'), 26, 34 + (1 - k) * 10); ctx.restore();
    // Datenfeld
    box(114, 22, 120, 88);
    text('Nr.' + String(S.num).padStart(3, '0'), 122, 29, COL.inkSoft, 7.5, 'left', null, true);
    text(S.name, 122, 41, COL.ink, 10, 'left', COL.shadow, true);
    S.types.forEach((t, i) => typeTag(t, 122 + i * 37, 57));
    const r = RARITY[S.rarity]; if (r) { ctx.fillStyle = r.color; ctx.beginPath(); ctx.arc(125, 75.5, 3, 0, 7); ctx.fill(); text(r.name, 131, 72, COL.inkSoft, 7, 'left', null, true); }
    const st = S.stats, tot = st.hp + st.atk + st.def + st.spa + st.spd + st.spe;
    text('Basiswerte ' + tot, 122, 84, COL.inkSoft, 7);
    ctx.drawImage(crystalIcon('#7fe3ff'), 212, 88, 12, 12);
    box(6, 114, 228, 43);
    wrap(S.lore, 210, 7.5).slice(0, 3).forEach((l, i) => text(l, 14, 119 + i * 11, COL.ink, 7.5));
    if (this.t > 0.8 && Math.sin(G.t * 8) > 0) { ctx.fillStyle = '#e84a5f'; ctx.beginPath(); ctx.moveTo(222, 151); ctx.lineTo(228, 151); ctx.lineTo(225, 155); ctx.fill(); }
  }
}
export const dexEntry = (sp, count) => new Promise(res => push(new DexEntry(sp, count, res)));

// ---------------------------------------------------------------- Heilmaschine im Heilzentrum
class HealAnim {
  constructor(n, res) { this.overlay = true; this.n = Math.max(1, Math.min(6, n)); this.res = res; this.t = 0; this.placed = 0; }
  update(dt) {
    this.t += dt;
    const want = Math.min(this.n, Math.floor(this.t / 0.28) + 1);
    if (want > this.placed && this.t < this.n * 0.28 + 0.1) { this.placed = want; sfx('click'); }
    if (!this.jingle && this.t > this.n * 0.28 + 0.25) { this.jingle = true; sfx('jHeal'); }
    if (this.t > this.n * 0.28 + 2.4) { pop(this); this.res(); }
  }
  draw(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, W, H);
    const x = 84, y = 34;
    ctx.fillStyle = '#3a3a48'; ctx.fillRect(x - 2, y - 2, 76, 56);
    ctx.fillStyle = '#d8dce8'; ctx.fillRect(x, y, 72, 52); ctx.fillStyle = '#b8bcc8'; ctx.fillRect(x, y + 40, 72, 12);
    ctx.fillStyle = '#28303a'; ctx.fillRect(x + 6, y + 4, 60, 32);
    const on = this.jingle && Math.floor(this.t * 6) % 2;
    ctx.fillStyle = on ? '#78f8c8' : '#3a8a70'; ctx.fillRect(x + 8, y + 6, 56, 2);
    for (let i = 0; i < this.placed; i++) {
      const cx = x + 14 + (i % 3) * 18, cy = y + 12 + Math.floor(i / 3) * 12;
      ctx.fillStyle = '#1a2028'; ctx.fillRect(cx - 1, cy - 1, 12, 10);
      ctx.drawImage(crystalIcon(on ? '#ffffff' : '#7fe3ff'), cx, cy - 1, 10, 10);
      if (on) { ctx.fillStyle = 'rgba(255,255,200,.35)'; ctx.beginPath(); ctx.arc(cx + 5, cy + 4, 7, 0, 7); ctx.fill(); }
    }
    ctx.fillStyle = '#e84a5f'; ctx.fillRect(x + 30, y + 44, 12, 4);
  }
}
export const healAnim = n => new Promise(res => push(new HealAnim(n, res)));

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
