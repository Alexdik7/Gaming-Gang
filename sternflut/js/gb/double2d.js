// Doppelkampf-Bildschirm (2 gegen 2 oder 2 gegen Boss), lokal oder als Koop über den Server
import { G, W, H, COL, push, pop, input, text, box, cursor, bar, inRect, wait, wrap, fade } from './engine.js';
import { bgArt, platArt } from './battlebg.js';
import { DoubleBattle, SIDE, FOES } from '../battle/double.js';
import { SPECIES } from '../data/creatures.js';
import { MOVES } from '../data/moves.js';
import { TYPES } from '../data/types.js';
import { maxHp, monName, evolve } from '../data/mon.js';
import { sfx, cry, setMusic } from '../core/audio.js';
import { monSprite, trainerSprite } from './sprites.js';
import { choose, party, evoScene, typeTag, say, ask, waitMsg } from './gbui.js';
import { ITEMS } from './maps.js';
import { itemFilter, tinted, effMark } from './battle2d.js';
import { effectiveness } from '../data/types.js';
import { crystalIcon } from './pixel.js';
const backOut = t => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

const BG = {
  gras: ['#a8e0f8', '#e0f8d0', '#78c858', '#58a848'], hoehle: ['#3a2a20', '#6a5040', '#9a7a58', '#7a5a40'], vulkan: ['#3a1a1a', '#b8583a', '#8a7a68', '#6a5a4a'], schnee: ['#a8c8e8', '#eef6ff', '#e0ecf8', '#c0d4e8'], wueste: ['#f8c878', '#fff0c8', '#e8c888', '#d0a868'], berg: ['#7898c8', '#d8e4f0', '#a89878', '#8a7a60'], arena: ['#d8c8a8', '#f0e8d0', '#c8a878', '#a88858'],
  wasser: ['#88c8f8', '#d0f0ff', '#58a8e8', '#3888d0'], ruine: ['#1a1440', '#4a3a7a', '#5a6a5a', '#3a4a3a'], liga: ['#3a2a6a', '#c8b8f0', '#b8a8e0', '#8a78c0'],
};
// Sprite-Positionen (linke obere Ecke, Größe 64 × Skalierung)
const POS = { f0: { x: 116, y: 0, s: 0.85 }, f1: { x: 168, y: 12, s: 0.85 }, p0: { x: 0, y: 46, s: 1 }, p1: { x: 58, y: 54, s: 1 } };
const BOSS = { x: 132, y: -6, s: 1.15 };
// Raid: vier eigene Kreaturen in einer Reihe
const RPOS = { p0: { x: 0, y: 66, s: 0.72 }, p1: { x: 44, y: 70, s: 0.72 }, p2: { x: 88, y: 66, s: 0.72 }, p3: { x: 132, y: 70, s: 0.72 } };
const EFFW = e => e === 0 ? ['Keine Wirkung', '#808080'] : e > 1 ? ['Sehr effektiv', '#209040'] : e < 1 ? ['Wenig effektiv', '#d05020'] : ['Normal', COL.inkSoft];
const EFFS = e => { const [w, c] = EFFW(e); return [{ 'Sehr effektiv': 'Sehr eff.', 'Wenig effektiv': 'Wenig eff.', 'Keine Wirkung': 'Keine' }[w] || w, c]; };
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

class DoubleScene {
  // o: { b (DoubleBattle oder RemoteDouble), mine: ['p0','p1'] | ['p0'], trainers: [{name,look}], title, bg, remote, boss }
  constructor(game, o, res) {
    this.g = game; this.o = o; this.res = res; this.s = game.state; this.b = o.b;
    this.bgKey = BG[o.bg] ? o.bg : 'gras'; this.bg = BG[this.bgKey]; this.msg = ''; this.chars = 0; this.mode = 'msg'; this.cur = 0; this.mcur = 0; this.tcur = 0;
    this.off = {}; this.hpD = {}; this.dm = {}; // dm: angezeigte Kreatur pro Platz (folgt den Ereignissen, nicht dem fertig berechneten Zug)
    for (const id of this.b.ids()) { this.off[id] = { x: 0, y: 0, s: 0, vis: false }; const m = this.b.mon(id); this.dm[id] = m; this.hpD[id] = m ? m.hp : 0; }
    this.raid = !!this.b.slots.p2;
    this.parts = []; this.tweens = []; this.bolts = []; this.showBoxes = false; this.trainersVis = true; this.ownTrainers = true;
  }
  pos(id) { return this.o.boss && SIDE(id) === 'f' ? BOSS : this.raid && SIDE(id) === 'p' ? RPOS[id] : POS[id]; }
  center(id) { const p = this.pos(id), o = this.off[id] || { x: 0 }; return { x: p.x + 32 * p.s + o.x, y: p.y + 38 * p.s }; }

  // ---------------------------------------------------------- Ablauf
  async run() {
    const b = this.b, o = this.o;
    setMusic(o.music || (this.raid ? 'legend' : o.boss ? 'boss' : 'trainer'));
    await this.say(o.intro || (o.boss ? `${o.title} greift an!` : `${o.title} fordern euch heraus!`));
    this.trainersVis = false;
    for (const id of ['f0', 'f1']) if (b.mon(id)) { if (!o.boss) await this.say(`${b.slots[id].owner} schickt ${monName(b.mon(id))}!`, 500); await this.appear(id); this.g.markDex(b.mon(id).sp); }
    this.ownTrainers = false;
    const own = ['p0', 'p1', 'p2', 'p3'].filter(id => b.mon(id));
    if (this.raid) for (const id of own) { await this.say(`${b.slots[id].owner} schickt ${monName(b.mon(id))}!`, 350); await this.appear(id); }
    else { await this.say(`Los, ${own.map(id => monName(b.mon(id))).join(' und ')}!`, 600); for (const id of own) await this.appear(id); }
    this.showBoxes = true;
    while (!b.over) {
      const acts = {}, mine = o.mine.filter(id => b.alive(id));
      if (!mine.length && o.remote) { await this.play(await this.remote(() => b.recv())); continue; }
      let quit = false;
      for (const id of mine) {
        if (id === 'p1' && acts.p0?.t === 'combo') continue;
        const a = await this.chooseAction(id);
        acts[id] = a; if (a.t === 'forfeit') { quit = true; break; }
      }
      await this.play(await this.remote(() => b.turn(acts)));
      while (!b.over && b.need.some(id => o.mine.includes(id))) {
        for (const id of b.need.filter(x => o.mine.includes(x))) {
          const pool = b.slots[id].pool; let k = null;
          if (b.nextFor && b.nextFor(id) < 0) { await this.play(await this.remote(() => b.forcedSwitch(id, -1))); continue; }
          while (k === null) k = await party({ ...this.s, team: pool }, { select: true, prompt: 'Wer soll kämpfen?', filter: m => b.canSwitchTo(id, pool.indexOf(m)) });
          await this.play(await this.remote(() => b.forcedSwitch(id, k)));
        }
      }
      if (o.remote && !b.over && b.need.length) await this.play(await this.remote(() => b.recv()));
      if (quit) break;
    }
    if (b.result === 'win' && o.trainer) {
      this.trainersVis = true;
      if (o.trainer.lose) await this.say(o.trainer.lose);
      if (o.trainer.reward) { this.s.money += o.trainer.reward; await this.say(`Du erhältst ${o.trainer.reward} ◈ Preisgeld!`); }
    }
    if (b.result === 'lose' && !o.remote) await this.say(`${this.s.name} hat keine kampffähigen Kreaturen mehr… Alles wird schwarz.`);
    if (!o.remote) for (const pe of b.pendingEvos) {
      const m = this.s.team.find(x => x.uid === pe.uid); if (!m || m.hp <= 0) continue;
      const name = monName(m); sfx('evo');
      await evoScene(monSprite(m.sp, 'front', m.shiny, m.mut), monSprite(pe.to, 'front', m.shiny, m.mut), `${name} hat sich zu ${SPECIES[pe.to].name} entwickelt!`);
      evolve(m, pe.to); cry(SPECIES[pe.to].cry); this.g.markDex(pe.to, true);
    }
    // weicher Übergang zurück ins Spiel
    await fade(1, 450);
    pop(this);
    if (b.result !== 'lose' || this.o.remote) setTimeout(() => fade(0, 450), 30);
    this.res({ result: b.result, xpLog: b.xpLog });
  }
  async remote(fn) {
    if (!this.o.remote) return fn();
    this.mode = 'busy'; this.msg = '';
    const close = waitMsg(this.raid ? 'Warte auf die Mitspieler' : 'Warte auf deinen Partner');
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
    if (i === 3 && this.comboReady()) {
      if (await ask(`Duo-Kombo einsetzen? ${monName(b.mon('p0'))} und ${monName(b.mon('p1'))} greifen zusammen alle Gegner an. (Nur einmal pro Kampf!)`)) { sfx('buff'); return this.done({ t: 'combo' }); }
      this.mode = 'menu'; return;
    }
    if (i === 3) {
      if (this.o.remote && await ask(this.raid ? 'Möchtest du aufgeben? Der Raid endet dann für alle.' : 'Möchtest du aufgeben? Der Kampf endet dann für euch beide.')) return this.done({ t: 'forfeit' });
      if (!this.o.remote) await say('Aus diesem Kampf gibt es kein Entkommen!');
      this.mode = 'menu';
    }
  }
  comboReady() { const b = this.b; return !this.o.remote && !this.raid && this.actor === 'p0' && !!this.s.bag.duostein && !b.combo?.p && b.alive('p0') && b.alive('p1'); }
  async animCombo(e) {
    const A = this.off[e.slot], B = this.off[e.ally], ca = TYPES[e.types[0]].color, cb = TYPES[e.types[1]].color;
    sfx('whoosh'); G.shake = 0.4;
    await this.tween(0.35, k => { A.x = 14 * Math.sin(k * Math.PI); B.x = 14 * Math.sin(k * Math.PI); A.y = B.y = -10 * Math.sin(k * Math.PI); });
    const p = this.center(e.slot), q = this.center(e.ally), mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2 - 10;
    for (let i = 0; i < 40; i++) { const a = i / 40 * 6.28; this.emit(mx + Math.cos(a) * 30, my + Math.sin(a) * 16, -Math.cos(a) * 60, -Math.sin(a) * 30, i % 2 ? ca : cb, 0.5, 2.5); }
    this.flashCol = '#ffffff'; this.flashT = 0.5; sfx('super');
    await wait(450);
    for (const f of FOES(e.slot).filter(f => this.dm[f] && this.hpD[f] > 0)) { const t = this.center(f); for (let i = 0; i < 26; i++) { const k = i / 26; this.emit(mx + (t.x - mx) * k, my + (t.y - my) * k, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, i % 2 ? ca : cb, 0.6, 3); } }
    G.shake = 1; await wait(350);
  }
  pickMove() {
    const m = this.b.mon(this.actor), mv = m.moves[this.mcur]; if (!mv || mv.pp <= 0) { sfx('weak'); return; }
    const M = MOVES[mv.id], self = M.cat === 'status' && (M.effect?.target === 'self' || M.effect?.heal);
    const foes = FOES(this.actor).filter(f => this.b.slots[f] && this.b.alive(f));
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
        case 'combo': await this.animCombo(e); break;
        case 'hp':
          if (e.heal) { this.burst(id, '#7dffb0', 16, 40); sfx('heal'); }
          else if (e.dot) { this.burst(id, TYPES[e.type].color, 14); this.blink(id); sfx('weak'); }
          else this.impact(id, e);
          await this.tween(Math.min(0.9, 0.25 + Math.abs(this.hpD[id] - e.hp) * 0.02), ((from) => k => (this.hpD[id] = from + (e.hp - from) * k))(this.hpD[id]));
          break;
        case 'stat': this.burst(id, e.up ? '#ffb24a' : '#6aa8ff', 18, 40); sfx(e.up ? 'buff' : 'debuff'); await wait(400); break;
        case 'status': this.burst(id, { brand: '#ff6a2b', gift: '#b45ce0', starre: '#ffd23a' }[e.status], 20); await wait(300); break;
        case 'faint': { const o = this.off[id], fm = this.dm[id]; if (fm && SPECIES[fm.sp]) cry(SPECIES[fm.sp].cry); sfx('faint'); this.hpD[id] = 0; await this.tween(0.5, k => (o.y = k * 64)); o.vis = false; o.y = 0; this.dm[id] = null; break; }
        case 'send': { const nm = this.b.apply ? this.b.mon(id) : e.mon || this.b.mon(id); this.off[id].vis = false; this.dm[id] = nm; this.hpD[id] = e.hp ?? nm.hp; await this.say(e.text, 600); await this.appear(id); if (SIDE(id) === 'f') this.g.markDex(nm.sp); break; }
        case 'recall': { const o = this.off[id]; await this.say(e.text, 500); await this.tween(0.25, k => (o.s = 1 - k)); o.vis = false; break; }
        case 'lvl': sfx('lvl'); this.hpD[id] = this.dm[id]?.hp ?? this.hpD[id]; await this.say(e.text); break;
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
    const o = this.off[id], c = this.center(id), m = this.dm[id]; if (!m) return;
    // Bindball vom Bildrand im Bogen werfen (Bosse erscheinen direkt)
    if (!(this.o.boss && SIDE(id) === 'f')) {
      const from = SIDE(id) === 'f' ? { x: W + 10, y: 10 } : { x: -10, y: 100 }, land = { x: c.x, y: c.y + 14 };
      this.crystal = { x: from.x, y: from.y, r: 0, img: crystalIcon('#7fe3ff') }; sfx('throw');
      await this.tween(0.45, k => { this.crystal.x = from.x + (land.x - from.x) * k; this.crystal.y = from.y + (land.y - from.y) * k - Math.sin(k * Math.PI) * 30; this.crystal.r = k * 12; });
      this.crystal = null;
    }
    o.vis = true; o.s = 0; o.x = 0; o.y = 0; o.flash = 1; sfx('whoosh');
    const col = SPECIES[m.sp]?.model?.glow || '#bff8ff';
    for (let i = 0; i < 18; i++) { const a = i / 18 * 6.28; this.emit(c.x, c.y + 18, Math.cos(a) * 50, Math.sin(a) * 24, i % 3 ? col : '#ffffff', 0.45); }
    await this.tween(0.3, k => (o.s = backOut(k)));
    this.tween(0.35, k => (o.flash = 1 - k));
    cry(SPECIES[m.sp].cry); await wait(200);
  }
  async animMove(id, tg, mv, hit) {
    const M = MOVES[mv], col = TYPES[M.type].color, o = this.off[id], dir = SIDE(id) === 'p' ? 1 : -1;
    const a = this.center(id), t = this.center(tg || id), foeHit = tg && tg !== id && M.cat !== 'status';
    switch (foeHit ? M.fx : M.cat === 'status' ? (M.fx === 'heal' ? 'heal' : M.fx === 'roar' ? 'roar' : 'buff') : M.fx) {
      case 'dash': case 'slash': case 'bite':
        sfx('whoosh'); await this.tween(0.15, k => (o.x = dir * 16 * k));
        if (hit && M.fx === 'slash') for (let s2 = 0; s2 < 3; s2++) for (let i = 0; i < 7; i++) this.emit(t.x - 12 + i * 4 + s2 * 4, t.y - 12 + i * 4 - s2 * 3, 0, 0, '#ffffff', 0.25, 1.5);
        if (hit && M.fx === 'bite') for (const sy of [-1, 1]) for (let i = 0; i < 5; i++) this.emit(t.x - 8 + i * 4, t.y + sy * 14, 0, -sy * 55, '#ffffff', 0.2, 2);
        await this.tween(0.2, k => (o.x = dir * 16 * (1 - k))); break;
      case 'beam':
        sfx('whoosh'); await this.tween(0.45, k => { for (let i = 0; i < 3; i++) { const q = Math.random() * k; this.emit(a.x + (t.x - a.x) * q, a.y + (t.y - a.y) * q, 0, 0, col, 0.2, 2.5); } }); break;
      case 'zap':
        for (let i = 0; i < 4; i++) { this.bolts.push({ a, t, c: i % 2 ? '#ffffff' : col, l: 0.15 }); sfx('click'); await wait(70); } break;
      case 'storm':
        sfx('whoosh'); await this.tween(0.7, k => { for (let i = 0; i < 4; i++) { const ang = k * 16 + i * 1.57, r = 26 - k * 12; this.emit(t.x + Math.cos(ang) * r, t.y + 16 - k * 36 + Math.sin(ang) * r * 0.3, 0, -10, i % 2 ? col : '#fff', 0.3, 2.5); } });
        G.shake = 0.5; break;
      case 'quake':
        G.shake = 1.3; sfx('hit');
        for (let r = 0; r < 3; r++) { for (let i = 0; i < 12; i++) this.emit(t.x, t.y + 22, (Math.random() - 0.5) * 130, -40 - Math.random() * 60, col, 0.5, 3); await wait(140); } break;
      case 'cloud':
        for (let i = 0; i < 26; i++) this.emit(t.x + (Math.random() - 0.5) * 36, t.y + (Math.random() - 0.5) * 26, (Math.random() - .5) * 10, -8, col, 0.9, 4);
        await wait(400); break;
      case 'roar':
        cry(SPECIES[this.dm[id].sp].cry); await this.tween(0.4, k => (o.s = 1 + Math.sin(k * Math.PI) * 0.15)); o.s = 1; break;
      case 'heal':
        for (let i = 0; i < 16; i++) this.emit(a.x + (Math.random() - 0.5) * 30, a.y + 16, 0, -40 - Math.random() * 30, '#7dffb0', 0.7, 2.5);
        sfx('heal'); await wait(350); break;
      case 'buff':
        await this.tween(0.3, k => (o.s = 1 + Math.sin(k * Math.PI) * 0.08)); o.s = 1; break;
      default:
        if (foeHit) {
          sfx('whoosh');
          await this.tween(0.4, k => { const px = a.x + (t.x - a.x) * ease(k), py = a.y + (t.y - a.y) * ease(k) - Math.sin(k * Math.PI) * 16; for (let i = 0; i < 3; i++) this.emit(px, py, (Math.random() - .5) * 20, (Math.random() - .5) * 20, col, 0.25, 3); });
        } else { await this.tween(0.3, k => (o.s = 1 + Math.sin(k * Math.PI) * 0.08)); o.s = 1; }
    }
  }


  // ---------------------------------------------------------- Update & Zeichnen
  update(dt) {
    for (let i = this.tweens.length - 1; i >= 0; i--) { const tw = this.tweens[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(k); if (k >= 1) { this.tweens.splice(i, 1); tw.res(); } }
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt; } this.parts = this.parts.filter(p => p.l > 0);
    if (this.flashT > 0) this.flashT -= dt;
    for (const bo of this.bolts) bo.l -= dt; this.bolts = this.bolts.filter(bo => bo.l > 0);
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
    const b = this.b;
    ctx.drawImage(bgArt(this.bgKey, this.bg), 0, 0);
    for (const [cx, cy, rx, ry] of this.raid ? [[178, 64, 58, 11], [92, 112, 98, 9]] : [[178, 64, 58, 11], [62, 112, 64, 12]]) { const pa = platArt(this.bgKey, this.bg, rx, ry); ctx.drawImage(pa, Math.round(cx - pa.width / 2), Math.round(cy - ry - 2)); }
    if (this.trainersVis && this.o.trainers) this.o.trainers.forEach((t, k) => ctx.drawImage(trainerSprite(t.look), 124 + k * 50 - (this.o.trainers.length === 1 ? -20 : 0), 2));
    for (const id of ['f1', 'f0', 'p3', 'p2', 'p1', 'p0']) {
      const m = this.dm[id], o = this.off[id]; if (!m || !o?.vis) continue;
      const p = this.pos(id), img = monSprite(m.sp, SIDE(id) === 'f' ? 'front' : 'back', m.shiny, m.mut), w = 64 * p.s * o.s;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, 114); ctx.clip();
      const dx = p.x + o.x + 32 * p.s - w / 2, dy = p.y + o.y + 64 * p.s - w;
      ctx.drawImage(img, dx, dy, w, w);
      if (o.flash > 0) { ctx.globalAlpha = Math.min(1, o.flash); ctx.drawImage(tinted(img, '#ffffff'), dx, dy, w, w); ctx.globalAlpha = 1; }
      ctx.restore();
    }
    if (this.flashT > 0) { ctx.globalAlpha = Math.min(0.8, this.flashT * 1.6); ctx.fillStyle = this.flashCol; ctx.fillRect(0, 0, W, 114); ctx.globalAlpha = 1; }
    if (this.crystal) { ctx.save(); ctx.translate(this.crystal.x, this.crystal.y); ctx.rotate(this.crystal.r); ctx.drawImage(this.crystal.img, -8, -8); ctx.restore(); }
    if (this.ownTrainers && this.o.ownLooks) this.o.ownLooks.forEach((l, k) => ctx.drawImage(trainerSprite(l, true), 6 + k * 56, 50));
    if (this.mode === 'target') { const p = this.pos(this.tlist[this.tcur]); const x = p.x + 32 * p.s, y = p.y + 2 + Math.sin(G.t * 8) * 2; ctx.fillStyle = '#e84a5f'; ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 6); ctx.fill(); }
    for (const bo of this.bolts) { ctx.strokeStyle = bo.c; ctx.lineWidth = 2; ctx.beginPath(); let x = bo.a.x, y = bo.a.y; ctx.moveTo(x, y); for (let i = 1; i <= 6; i++) { x = bo.a.x + (bo.t.x - bo.a.x) * i / 6 + (i < 6 ? (Math.random() - 0.5) * 14 : 0); y = bo.a.y + (bo.t.y - bo.a.y) * i / 6 + (i < 6 ? (Math.random() - 0.5) * 14 : 0); ctx.lineTo(x, y); } ctx.stroke(); }
    for (const p of this.parts) { ctx.globalAlpha = Math.min(1, p.l / p.ml * 1.5); ctx.fillStyle = p.c; ctx.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz); }
    ctx.globalAlpha = 1;
    if (this.showBoxes) {
      ['f0', 'f1'].forEach((id, k) => this.dm[id] && this.infoBox(id, 3, 3 + k * 23, false));
      if (this.raid) ['p0', 'p1', 'p2', 'p3'].forEach((id, k) => this.dm[id] && this.miniBox(id, 3 + (k % 2) * 66, 26 + Math.floor(k / 2) * 19));
      else ['p0', 'p1'].forEach((id, k) => this.dm[id] && this.infoBox(id, 133, 67 + k * 23, true));
    }
    if (this.mode === 'target') this.drawTargetEff(ctx);
    box(0, 113, W, 47, 'dark');
    if (this.mode === 'moves' || this.mode === 'target') return this.drawMoves();
    const lines = wrap(this.msg, this.mode === 'menu' ? 108 : 220, 8.5);
    let n = Math.floor(this.chars), y = 121;
    for (const l of lines.slice(0, 2)) { text(l.slice(0, Math.max(0, n)), 9, y, '#fff', 8.5, 'left', '#50586a'); n -= l.length + 1; y += 15; }
    if (this.mode === 'menu') {
      box(120, 114, 117, 43);
      ['KAMPF', 'BEUTEL', 'TEAM', this.o.remote ? 'AUFGEBEN' : this.comboReady() ? 'KOMBO' : 'FLUCHT'].forEach((s, i) => { const x = 134 + (i % 2) * 52, yy = 121 + Math.floor(i / 2) * 16; if (this.cur === i) cursor(x - 9, yy + 1); text(s, x, yy, s === 'KOMBO' ? '#c87800' : COL.ink, s.length > 6 ? 7 : 8.5, 'left', COL.shadow, true); });
    }
  }
  miniBox(id, x, y) {
    const m = this.dm[id]; if (!m) return;
    box(x, y, 64, 18, this.actor === id && (this.mode === 'menu' || this.mode === 'moves') ? 'gold' : this.o.mine.includes(id) ? 'default' : 'dark');
    text(monName(m).slice(0, 8), x + 5, y + 2.5, this.o.mine.includes(id) ? COL.ink : '#fff', 6, 'left', null, true);
    text(String(m.lvl), x + 60, y + 2.5, this.o.mine.includes(id) ? COL.ink : '#fff', 5.5, 'right');
    bar(x + 5, y + 12, 54, 3, (this.hpD[id] ?? m.hp) / maxHp(m));
  }
  infoBox(id, x, y, own) {
    const m = this.dm[id]; if (!m) return;
    box(x, y, 104, 21, this.actor === id && (this.mode === 'menu' || this.mode === 'moves') ? 'gold' : 'default');
    text(monName(m).slice(0, 11), x + 6, y + 3, COL.ink, 7, 'left', COL.shadow, true);
    text('Lv' + m.lvl, x + 99, y + 3, COL.ink, 6.5, 'right');
    const hp = this.hpD[id] ?? m.hp;
    if (m.status) text({ brand: 'BRD', gift: 'GIF', starre: 'STR' }[m.status], x + 6, y + 12, '#c84848', 5.5, 'left', null, true);
    bar(x + 24, y + 14, own ? 46 : 74, 3, hp / maxHp(m));
    if (own) text(`${Math.round(hp)}/${maxHp(m)}`, x + 99, y + 11.5, COL.ink, 6, 'right', null);
  }
  // Wirkung einer Attacke auf einen Platz (null = Status-Attacke oder kein Ziel)
  effOn(M, id) { const m = this.dm[id]; return !m || this.hpD[id] <= 0 || M.cat === 'status' ? null : effectiveness(M.type, SPECIES[m.sp].types); }
  foesShown() { return FOES(this.actor).filter(f => this.b.slots[f] && this.dm[f] && this.hpD[f] > 0); }
  drawMoves() {
    const ctx = G.ctx, ms = this.b.mon(this.actor).moves, foes = this.foesShown();
    box(0, 113, 160, 47);
    const mv = ms[this.mcur], M = mv && MOVES[mv.id];
    if (this.mode === 'target') {
      const tg = this.tlist[this.tcur], e = M ? this.effOn(M, tg) : null;
      text('Welches Ziel? (A)', 10, 121, COL.ink, 8, 'left', COL.shadow, true); text(monName(this.dm[tg] || this.b.mon(tg)), 10, 137, COL.frame, 8, 'left', null, true);
      if (e !== null) { const [w, c] = EFFW(e); text(w, 150, 138, c, 6.5, 'right', null, true); }
    } else ms.forEach((mv, i) => {
      const x = 14 + (i % 2) * 74, y = 121 + Math.floor(i / 2) * 16; if (this.mcur === i) cursor(x - 9, y + 1);
      text(MOVES[mv.id].name, x, y, mv.pp ? COL.ink : COL.inkSoft, 7.8, 'left', COL.shadow, true);
      // je Gegner ein Zeichen, in derselben Reihenfolge wie die Gegner oben stehen (links, rechts)
      foes.forEach((f, k) => { const e = this.effOn(MOVES[mv.id], f); if (e !== null && e !== 1) effMark(ctx, x + 63 - (foes.length - 1 - k) * 6, y + 3, e); });
    });
    box(160, 113, 80, 47);
    if (!M) return;
    text(`AP ${mv.pp}/${M.pp}`, 166, 119, COL.ink, 6.8, 'left', COL.shadow, true); typeTag(M.type, 201, 118);
    if (M.cat === 'status') { text('Status-Attacke', 200, 138, COL.inkSoft, 6.5, 'center', null); return; }
    foes.forEach((f, k) => {
      const y = 131 + k * 12, e = this.effOn(M, f), [w, c] = EFFS(e), sel = this.mode === 'target' && this.tlist[this.tcur] === f;
      text(monName(this.dm[f]).slice(0, 7), 166, y, sel ? COL.frame : COL.ink, 6.2, 'left', null, true);
      text(w, 235, y, c, 6.2, 'right', null, true);
    });
  }
  // Wirkungs-Hinweis über den Gegnern während der Zielwahl
  drawTargetEff(ctx) {
    const mv = this.b.mon(this.actor).moves[this.mcur], M = mv && MOVES[mv.id]; if (!M) return;
    for (const f of this.tlist) { const e = this.effOn(M, f); if (e === null) continue; const p = this.pos(f), [w, c] = EFFW(e); text(w, p.x + 32 * p.s, p.y + 64 * p.s - 11, c, 6.5, 'center', '#000', true); }
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
