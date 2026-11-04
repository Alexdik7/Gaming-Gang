// Doppelkampf-Bildschirm (2 gegen 2 oder 2 gegen Boss), lokal oder als Koop über den Server
import { G, W, H, COL, push, pop, input, text, box, cursor, bar, inRect, wait, wrap } from './engine.js';
import { DoubleBattle, SIDE, FOES } from '../battle/double.js';
import { SPECIES } from '../data/creatures.js';
import { MOVES } from '../data/moves.js';
import { TYPES } from '../data/types.js';
import { maxHp, monName, evolve } from '../data/mon.js';
import { sfx, cry, setMusic } from '../core/audio.js';
import { monSprite, trainerSprite } from './sprites.js';
import { choose, party, evoScene, typeTag, say, ask, waitMsg } from './gbui.js';
import { ITEMS } from './maps.js';
import { itemFilter } from './battle2d.js';

const BG = {
  gras: ['#a8e0f8', '#e0f8d0', '#78c858', '#58a848'], hoehle: ['#3a2a20', '#6a5040', '#9a7a58', '#7a5a40'], vulkan: ['#3a1a1a', '#b8583a', '#8a7a68', '#6a5a4a'], schnee: ['#a8c8e8', '#eef6ff', '#e0ecf8', '#c0d4e8'], wueste: ['#f8c878', '#fff0c8', '#e8c888', '#d0a868'], berg: ['#7898c8', '#d8e4f0', '#a89878', '#8a7a60'], arena: ['#d8c8a8', '#f0e8d0', '#c8a878', '#a88858'],
};
// Sprite-Positionen (linke obere Ecke, Größe 64 × Skalierung)
const POS = { f0: { x: 116, y: 0, s: 0.85 }, f1: { x: 168, y: 12, s: 0.85 }, p0: { x: 0, y: 46, s: 1 }, p1: { x: 58, y: 54, s: 1 } };
const BOSS = { x: 132, y: -6, s: 1.15 };
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

class DoubleScene {
  // o: { b (DoubleBattle oder RemoteDouble), mine: ['p0','p1'] | ['p0'], trainers: [{name,look}], title, bg, remote, boss }
  constructor(game, o, res) {
    this.g = game; this.o = o; this.res = res; this.s = game.state; this.b = o.b;
    this.bg = BG[o.bg] || BG.gras; this.msg = ''; this.chars = 0; this.mode = 'msg'; this.cur = 0; this.mcur = 0; this.tcur = 0;
    this.off = {}; this.hpD = {};
    for (const id of this.b.ids()) { this.off[id] = { x: 0, y: 0, s: 0, vis: false }; const m = this.b.mon(id); this.hpD[id] = m ? m.hp : 0; }
    this.parts = []; this.tweens = []; this.bolts = []; this.showBoxes = false; this.trainersVis = true; this.ownTrainers = true;
  }
  pos(id) { return this.o.boss && SIDE(id) === 'f' ? BOSS : POS[id]; }
  center(id) { const p = this.pos(id), o = this.off[id] || { x: 0 }; return { x: p.x + 32 * p.s + o.x, y: p.y + 38 * p.s }; }

  // ---------------------------------------------------------- Ablauf
  async run() {
    const b = this.b, o = this.o;
    setMusic('battle');
    await this.say(o.boss ? `${o.title} greift an!` : `${o.title} fordern euch heraus!`);
    this.trainersVis = false;
    for (const id of ['f0', 'f1']) if (b.mon(id)) { if (!o.boss) await this.say(`${b.slots[id].owner} schickt ${monName(b.mon(id))}!`, 500); await this.appear(id); this.g.markDex(b.mon(id).sp); }
    this.ownTrainers = false;
    const own = ['p0', 'p1'].filter(id => b.mon(id));
    await this.say(`Los, ${own.map(id => monName(b.mon(id))).join(' und ')}!`, 600);
    for (const id of own) await this.appear(id);
    this.showBoxes = true;
    while (!b.over) {
      const acts = {}, mine = o.mine.filter(id => b.alive(id));
      if (!mine.length && o.remote) { await this.play(await this.remote(() => b.recv())); continue; }
      let quit = false;
      for (const id of mine) {
        const a = await this.chooseAction(id);
        acts[id] = a; if (a.t === 'forfeit') { quit = true; break; }
      }
      await this.play(await this.remote(() => b.turn(acts)));
      while (!b.over && b.need.some(id => o.mine.includes(id))) {
        for (const id of b.need.filter(x => o.mine.includes(x))) {
          const pool = b.slots[id].pool; let k = null;
          while (k === null) k = await party({ ...this.s, team: pool }, { select: true, prompt: 'Wer soll kämpfen?', filter: m => b.canSwitchTo(id, pool.indexOf(m)) });
          await this.play(await this.remote(() => b.forcedSwitch(id, k)));
        }
      }
      if (o.remote && !b.over && b.need.length) await this.play(await this.remote(() => b.recv()));
      if (quit) break;
    }
    if (!o.remote) for (const pe of b.pendingEvos) {
      const m = this.s.team.find(x => x.uid === pe.uid); if (!m || m.hp <= 0) continue;
      const name = monName(m); sfx('evo');
      await evoScene(monSprite(m.sp, 'front', m.shiny, m.mut), monSprite(pe.to, 'front', m.shiny, m.mut), `${name} hat sich zu ${SPECIES[pe.to].name} entwickelt!`);
      evolve(m, pe.to); cry(SPECIES[pe.to].cry); this.g.markDex(pe.to, true);
    }
    pop(this);
    this.res({ result: b.result, xpLog: b.xpLog });
  }
  async remote(fn) {
    if (!this.o.remote) return fn();
    this.mode = 'busy'; this.msg = '';
    const close = waitMsg('Warte auf deinen Partner');
    try { return await fn(); } finally { close(); }
  }
  tween(dur, fn) { return new Promise(res => this.tweens.push({ t: 0, dur, fn, res })); }
  say(t, hold = 900) { this.msg = t; this.chars = 0; this.mode = 'msg'; return new Promise(res => { this.msgRes = res; this.msgHold = hold; this.msgDone = 0; }); }

  // ---------------------------------------------------------- Eingabe
  chooseAction(id) {
    this.actor = id; this.mode = 'menu'; this.cur = 0; this.msg = `Was soll ${monName(this.b.mon(id))} tun?`; this.chars = 999;
    return new Promise(res => (this.actRes = res));
  }
  done(a) { this.mode = 'busy'; const r = this.actRes; this.actRes = null; r(a); }
  async onMenu(i) {
    const b = this.b, id = this.actor, pool = b.slots[id].pool;
    if (i === 0) { const m = b.mon(id); if (m.moves.every(x => x.pp <= 0)) m.moves[0].pp = 1; this.mode = 'moves'; this.mcur = 0; return; }
    this.mode = 'busy';
    if (i === 1) {
      if (this.o.remote) { await say('Im Koop-Kampf sind keine Items erlaubt.'); this.mode = 'menu'; return; }
      const bag = this.s.bag, opts = Object.keys(ITEMS).filter(k => bag[k] && (ITEMS[k].heal || ITEMS[k].cure || ITEMS[k].revive)).map(k => ({ k, label: ITEMS[k].name, right: '×' + bag[k] }));
      if (!opts.length) { await say('Du hast keine Heilmittel.'); this.mode = 'menu'; return; }
      const c = await choose(opts, { title: 'BEUTEL' }); if (c === null) { this.mode = 'menu'; return; }
      const I = ITEMS[opts[c].k];
      const t = await party({ ...this.s, team: pool }, { select: true, prompt: 'Für wen?', filter: m => itemFilter(I)(m) && !(I.revive && this.b.ids().some(o => this.b.slots[o].pool === pool && pool[this.b.slots[o].i] === m)) });
      if (t === null) { this.mode = 'menu'; return; }
      this.s.bag[opts[c].k]--; return this.done({ t: 'item', target: t, amount: I.heal, cure: I.cure, revive: I.revive });
    }
    if (i === 2) {
      const k = await party({ ...this.s, team: pool }, { select: true, prompt: 'Welche Kreatur einwechseln?', filter: m => b.canSwitchTo(id, pool.indexOf(m)) });
      if (k === null) { this.mode = 'menu'; return; }
      return this.done({ t: 'switch', i: k });
    }
    if (i === 3) {
      if (this.o.remote && await ask('Möchtest du aufgeben? Der Kampf endet dann für euch beide.')) return this.done({ t: 'forfeit' });
      if (!this.o.remote) await say('Aus diesem Kampf gibt es kein Entkommen!');
      this.mode = 'menu';
    }
  }
  pickMove() {
    const m = this.b.mon(this.actor), mv = m.moves[this.mcur]; if (!mv || mv.pp <= 0) { sfx('weak'); return; }
    const M = MOVES[mv.id], self = M.cat === 'status' && (M.effect?.target === 'self' || M.effect?.heal);
    const foes = FOES(this.actor).filter(f => this.b.alive(f));
    sfx('click');
    if (self || foes.length < 2) return this.done({ t: 'move', i: this.mcur, target: foes[0] });
    this.mode = 'target'; this.tcur = 0; this.tlist = foes;
  }

  // ---------------------------------------------------------- Ereignisse
  async play(events) {
    for (const e of events) {
      this.b.apply?.(e);
      const id = e.slot;
      switch (e.t) {
        case 'msg': await this.say(e.text); break;
        case 'move': await this.animMove(id, e.target, e.move, e.hit); break;
        case 'hp':
          if (e.heal) { this.burst(id, '#7dffb0', 16, 40); sfx('heal'); }
          else if (e.dot) { this.burst(id, TYPES[e.type].color, 14); this.blink(id); sfx('weak'); }
          else this.impact(id, e);
          await this.tween(Math.min(0.9, 0.25 + Math.abs(this.hpD[id] - e.hp) * 0.02), ((from) => k => (this.hpD[id] = from + (e.hp - from) * k))(this.hpD[id]));
          break;
        case 'stat': this.burst(id, e.up ? '#ffb24a' : '#6aa8ff', 18, 40); sfx(e.up ? 'buff' : 'debuff'); await wait(400); break;
        case 'status': this.burst(id, { brand: '#ff6a2b', gift: '#b45ce0', starre: '#ffd23a' }[e.status], 20); await wait(300); break;
        case 'faint': { const o = this.off[id]; cry(SPECIES[this.b.mon(id)?.sp || 'hoppel'].cry); sfx('faint'); await this.tween(0.5, k => (o.y = k * 64)); o.vis = false; o.y = 0; break; }
        case 'send': await this.say(e.text, 600); this.hpD[id] = this.b.mon(id).hp; await this.appear(id); if (SIDE(id) === 'f') this.g.markDex(this.b.mon(id).sp); break;
        case 'recall': { const o = this.off[id]; await this.say(e.text, 500); await this.tween(0.25, k => (o.s = 1 - k)); o.vis = false; break; }
        case 'lvl': sfx('lvl'); this.hpD[id] = this.b.mon(id)?.hp ?? this.hpD[id]; await this.say(e.text); break;
        case 'learn': await this.learn(this.s.team.find(m => m.uid === e.uid), e.id); break;
      }
    }
  }
  async learn(m, id) {
    if (!m) return;
    const M = MOVES[id];
    if (m.moves.length < 4) { m.moves.push({ id, pp: M.pp }); sfx('lvl'); return this.say(`${monName(m)} hat ${M.name} erlernt!`); }
    await this.say(`${monName(m)} möchte ${M.name} lernen, kennt aber schon vier Attacken. Eine vergessen?`);
    this.mode = 'busy';
    const i = await choose([...m.moves.map(mv => MOVES[mv.id].name), `${M.name} nicht lernen`], { title: 'Vergessen:', cancel: true });
    if (i === null || i === 4) return this.say(`${monName(m)} hat ${M.name} nicht erlernt.`);
    m.moves[i] = { id, pp: M.pp }; return this.say(`${monName(m)} hat ${M.name} erlernt!`);
  }

  // ---------------------------------------------------------- Animationen
  emit(x, y, vx, vy, c, life = 0.6, sz = 2) { this.parts.push({ x, y, vx, vy, c, l: life, ml: life, sz }); }
  burst(id, c, n = 20, sp = 60) { const p = this.center(id); for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = sp * (0.3 + Math.random()); this.emit(p.x, p.y, Math.cos(a) * v, Math.sin(a) * v, c, 0.5 + Math.random() * 0.3, 1.5 + Math.random() * 2); } }
  blink(id) { const o = this.off[id]; let n = 0; const iv = setInterval(() => { o.vis = !o.vis; if (++n >= 6) { o.vis = true; clearInterval(iv); } }, 70); }
  impact(id, e) {
    if (e.eff === 0) { sfx('weak'); return; }
    const big = e.eff > 1 || e.crit;
    this.burst(id, TYPES[e.type].color, big ? 36 : 20, big ? 100 : 65); this.blink(id);
    G.shake = big ? 0.9 : 0.35; sfx(big ? 'super' : e.eff < 1 ? 'weak' : 'hit');
  }
  async appear(id) {
    const o = this.off[id], c = this.center(id), m = this.b.mon(id); if (!m) return;
    o.vis = true; o.s = 0; o.x = 0; o.y = 0; sfx('whoosh');
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28; this.emit(c.x, c.y + 18, Math.cos(a) * 45, Math.sin(a) * 22, '#bff8ff', 0.4); }
    await this.tween(0.3, k => (o.s = ease(k)));
    cry(SPECIES[m.sp].cry); await wait(200);
  }
  async animMove(id, tg, mv, hit) {
    const M = MOVES[mv], col = TYPES[M.type].color, o = this.off[id], dir = SIDE(id) === 'p' ? 1 : -1;
    const a = this.center(id), t = this.center(tg || id);
    if (['dash', 'slash', 'bite'].includes(M.fx)) {
      sfx('whoosh'); await this.tween(0.15, k => (o.x = dir * 16 * k)); await this.tween(0.2, k => (o.x = dir * 16 * (1 - k)));
    } else if (tg && tg !== id && M.cat !== 'status') {
      sfx('whoosh');
      await this.tween(0.4, k => { const px = a.x + (t.x - a.x) * ease(k), py = a.y + (t.y - a.y) * ease(k) - Math.sin(k * Math.PI) * 16; for (let i = 0; i < 3; i++) this.emit(px, py, (Math.random() - .5) * 20, (Math.random() - .5) * 20, col, 0.25, 3); });
      if (M.fx === 'quake') G.shake = 1.2;
    } else await this.tween(0.3, k => (o.s = 1 + Math.sin(k * Math.PI) * 0.08));
    o.s = 1;
  }

  // ---------------------------------------------------------- Update & Zeichnen
  update(dt) {
    for (let i = this.tweens.length - 1; i >= 0; i--) { const tw = this.tweens[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(k); if (k >= 1) { this.tweens.splice(i, 1); tw.res(); } }
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt; } this.parts = this.parts.filter(p => p.l > 0);
    const tp = input.tap;
    if (this.mode === 'msg') {
      this.chars += dt * 70;
      if (this.chars >= this.msg.length && this.msgRes) { this.msgDone += dt; if (this.msgDone * 1000 > this.msgHold || input.pressed('a') || input.pressed('b') || tp) { const r = this.msgRes; this.msgRes = null; r(); } }
      else if ((input.pressed('a') || tp) && this.chars < this.msg.length) this.chars = this.msg.length;
    } else if (this.mode === 'menu') {
      if (input.pressed('right') || input.pressed('left')) { this.cur ^= 1; sfx('click'); }
      if (input.pressed('down') || input.pressed('up')) { this.cur ^= 2; sfx('click'); }
      if (tp && inRect(tp, 120, 114, 117, 43)) { this.cur = (tp.x > 178 ? 1 : 0) + (tp.y > 135 ? 2 : 0); sfx('click'); this.onMenu(this.cur); }
      else if (input.pressed('a')) { sfx('click'); this.onMenu(this.cur); }
    } else if (this.mode === 'moves') {
      const n = this.b.mon(this.actor).moves.length;
      if (input.pressed('right') || input.pressed('left')) { const k = this.mcur ^ 1; if (k < n) this.mcur = k; sfx('click'); }
      if (input.pressed('down') || input.pressed('up')) { const k = this.mcur ^ 2; if (k < n) this.mcur = k; sfx('click'); }
      if (tp && tp.y > 114 && tp.x < 160) { const k = (tp.x > 82 ? 1 : 0) + (tp.y > 135 ? 2 : 0); if (k < n) { this.mcur = k; this.pickMove(); } }
      else if (tp && tp.y > 114) { this.mode = 'menu'; sfx('click'); }
      else if (input.pressed('a')) this.pickMove();
      if (input.pressed('b')) { this.mode = 'menu'; sfx('click'); }
    } else if (this.mode === 'target') {
      if (input.pressed('right') || input.pressed('left') || input.pressed('up') || input.pressed('down')) { this.tcur ^= 1; sfx('click'); }
      if (tp) { const k = this.tlist.findIndex(f => { const p = this.pos(f); return inRect(tp, p.x, p.y, 64 * p.s, 64 * p.s); }); if (k >= 0) { this.tcur = k; this.done({ t: 'move', i: this.mcur, target: this.tlist[k] }); } }
      else if (input.pressed('a')) { sfx('click'); this.done({ t: 'move', i: this.mcur, target: this.tlist[this.tcur] }); }
      if (input.pressed('b')) { this.mode = 'moves'; sfx('click'); }
    }
  }

  draw(ctx) {
    const [sky, sky2, g1, g2] = this.bg, b = this.b;
    const gr = ctx.createLinearGradient(0, 0, 0, 114); gr.addColorStop(0, sky); gr.addColorStop(0.55, sky2); gr.addColorStop(0.56, g1); gr.addColorStop(1, g2);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, 114);
    for (const [cx, cy, rx, ry] of [[178, 64, 58, 11], [62, 112, 64, 12]]) {
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(cx, cy + 2, rx, ry, 0, 0, 7); ctx.fill();
      ctx.fillStyle = g2; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 7); ctx.fill();
    }
    if (this.trainersVis && this.o.trainers) this.o.trainers.forEach((t, k) => ctx.drawImage(trainerSprite(t.look), 124 + k * 50 - (this.o.trainers.length === 1 ? -20 : 0), 2));
    for (const id of ['f1', 'f0', 'p1', 'p0']) {
      const m = b.mon(id), o = this.off[id]; if (!m || !o?.vis) continue;
      const p = this.pos(id), img = monSprite(m.sp, SIDE(id) === 'f' ? 'front' : 'back', m.shiny, m.mut), w = 64 * p.s * o.s;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, 114); ctx.clip();
      ctx.drawImage(img, p.x + o.x + 32 * p.s - w / 2, p.y + o.y + 64 * p.s - w, w, w); ctx.restore();
    }
    if (this.ownTrainers && this.o.ownLooks) this.o.ownLooks.forEach((l, k) => ctx.drawImage(trainerSprite(l, true), 6 + k * 56, 50));
    if (this.mode === 'target') { const p = this.pos(this.tlist[this.tcur]); const x = p.x + 32 * p.s, y = p.y + 2 + Math.sin(G.t * 8) * 2; ctx.fillStyle = '#e84a5f'; ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 6); ctx.fill(); }
    for (const p of this.parts) { ctx.globalAlpha = Math.min(1, p.l / p.ml * 1.5); ctx.fillStyle = p.c; ctx.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz); }
    ctx.globalAlpha = 1;
    if (this.showBoxes) {
      ['f0', 'f1'].forEach((id, k) => b.mon(id) && this.infoBox(id, 3, 3 + k * 23, false));
      ['p0', 'p1'].forEach((id, k) => b.mon(id) && this.infoBox(id, 133, 67 + k * 23, true));
    }
    box(0, 113, W, 47, 'dark');
    if (this.mode === 'moves' || this.mode === 'target') return this.drawMoves();
    const lines = wrap(this.msg, this.mode === 'menu' ? 108 : 220, 8.5);
    let n = Math.floor(this.chars), y = 121;
    for (const l of lines.slice(0, 2)) { text(l.slice(0, Math.max(0, n)), 9, y, '#fff', 8.5, 'left', '#50586a'); n -= l.length + 1; y += 15; }
    if (this.mode === 'menu') {
      box(120, 114, 117, 43);
      ['KAMPF', 'BEUTEL', 'TEAM', this.o.remote ? 'AUFGEBEN' : 'FLUCHT'].forEach((s, i) => { const x = 134 + (i % 2) * 52, yy = 121 + Math.floor(i / 2) * 16; if (this.cur === i) cursor(x - 9, yy + 1); text(s, x, yy, COL.ink, s.length > 6 ? 7 : 8.5, 'left', COL.shadow, true); });
    }
  }
  infoBox(id, x, y, own) {
    const m = this.b.mon(id); if (!m) return;
    box(x, y, 104, 21, this.actor === id && (this.mode === 'menu' || this.mode === 'moves') ? 'gold' : 'default');
    text(monName(m).slice(0, 11), x + 6, y + 3, COL.ink, 7, 'left', COL.shadow, true);
    text('Lv' + m.lvl, x + 99, y + 3, COL.ink, 6.5, 'right');
    const hp = this.hpD[id] ?? m.hp;
    if (m.status) text({ brand: 'BRD', gift: 'GIF', starre: 'STR' }[m.status], x + 6, y + 12, '#c84848', 5.5, 'left', null, true);
    bar(x + 24, y + 14, own ? 46 : 74, 3, hp / maxHp(m));
    if (own) text(`${Math.round(hp)}/${maxHp(m)}`, x + 99, y + 11.5, COL.ink, 6, 'right', null);
  }
  drawMoves() {
    const ms = this.b.mon(this.actor).moves;
    box(0, 113, 160, 47);
    if (this.mode === 'target') { text('Welches Ziel? (A)', 10, 121, COL.ink, 8, 'left', COL.shadow, true); text(monName(this.b.mon(this.tlist[this.tcur])), 10, 137, COL.frame, 8, 'left', null, true); }
    else ms.forEach((mv, i) => { const x = 14 + (i % 2) * 74, y = 121 + Math.floor(i / 2) * 16; if (this.mcur === i) cursor(x - 9, y + 1); text(MOVES[mv.id].name, x, y, mv.pp ? COL.ink : COL.inkSoft, 7.8, 'left', COL.shadow, true); });
    box(160, 113, 80, 47);
    const mv = ms[this.mcur];
    if (mv) { const M = MOVES[mv.id]; text(`AP ${mv.pp}/${M.pp}`, 200, 120, COL.ink, 8, 'center', COL.shadow, true); typeTag(M.type, 183, 133); text(M.cat === 'status' ? 'Status' : `Stärke ${M.pow}`, 200, 146, COL.inkSoft, 6.5, 'center', null); }
  }
}

export function doubleBattle(game, o) {
  return new Promise(res => { const s = new DoubleScene(game, o, res); push(s); s.run(); });
}

// Lokaler Doppelkampf: beide eigenen Plätze aus dem eigenen Team
export function localDouble(game, foeSlots) {
  const s = game.state;
  return new DoubleBattle({ slots: { p0: { pool: s.team, owner: s.name }, p1: { pool: s.team, owner: s.name }, ...foeSlots } });
}
