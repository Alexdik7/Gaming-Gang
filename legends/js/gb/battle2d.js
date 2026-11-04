// Kampfbildschirm im Handheld-Stil
import { G, W, H, COL, push, pop, input, text, box, cursor, bar, inRect, wait, wrap } from './engine.js';
import { Battle } from '../battle/battle.js';
import { SPECIES } from '../data/creatures.js';
import { MOVES } from '../data/moves.js';
import { TYPES } from '../data/types.js';
import { maxHp, monName, xpForLevel, evolve } from '../data/mon.js';
import { sfx, cry, setMusic } from '../core/audio.js';
import { monSprite, trainerSprite } from './sprites.js';
import { crystalIcon } from './pixel.js';
import { choose, party, evoScene, typeTag, say, ask, waitMsg } from './gbui.js';
import { ITEMS } from './maps.js';

const BG = {
  gras: ['#a8e0f8', '#e0f8d0', '#78c858', '#58a848'], wald: ['#406858', '#88b098', '#3e7a48', '#2e6038'], hoehle: ['#3a2a20', '#6a5040', '#9a7a58', '#7a5a40'], vulkan: ['#3a1a1a', '#b8583a', '#8a7a68', '#6a5a4a'], schnee: ['#a8c8e8', '#eef6ff', '#e0ecf8', '#c0d4e8'], wueste: ['#f8c878', '#fff0c8', '#e8c888', '#d0a868'], berg: ['#7898c8', '#d8e4f0', '#a89878', '#8a7a60'],
  arena: ['#d8c8a8', '#f0e8d0', '#c8a878', '#a88858'], wasser: ['#88c8f8', '#d0f0ff', '#58a8e8', '#3888d0'], ruine: ['#1a1440', '#4a3a7a', '#5a6a5a', '#3a4a3a'], liga: ['#3a2a6a', '#c8b8f0', '#b8a8e0', '#8a78c0'],
};
const FOE = { x: 146, y: 8 }, OWN = { x: 26, y: 50 };
export const itemFilter = it => m => !m.egg && (it.revive ? m.hp <= 0 : it.cure ? m.hp > 0 && !!m.status : m.hp > 0 && m.hp < maxHp(m));
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

class BattleScene {
  constructor(game, o, res) {
    this.g = game; this.o = o; this.res = res; this.s = game.state;
    this.b = o.remote || new Battle({ team: this.s.team, foeTeam: o.foeTeam, wild: !o.trainer, trainer: o.trainer, canCatch: o.canCatch !== false });
    this.bg = BG[o.bg || 'gras'];
    this.msg = ''; this.chars = 0; this.mode = 'msg'; this.cur = 0; this.mcur = 0;
    this.foeOff = { x: -200, y: 0, s: 1, vis: true, flash: false }; this.ownOff = { x: 0, y: 0, s: 0, vis: false, flash: false };
    this.trainerOwn = { x: 0, vis: true }; this.trainerFoe = { x: 0, vis: !!o.trainer };
    this.hpD = { p: this.b.p.hp, f: this.b.f.hp }; this.xpD = this.b.p.xp;
    this.parts = []; this.tweens = []; this.crystal = null; this.bolts = [];
    this.showFoeBox = false; this.showOwnBox = false;
  }
  // ---------------------------------------------------------- Ablauf
  async run() {
    const b = this.b, o = this.o;
    setMusic(o.intro === 'legend' ? 'legend' : 'battle');
    await this.tween(0.7, k => (this.foeOff.x = -200 * (1 - ease(k))));
    if (o.trainer) {
      await this.say(`${o.trainer.name} fordert dich heraus!`);
      await this.tween(0.4, k => (this.trainerFoe.x = k * 120));
      this.trainerFoe.vis = false;
      await this.say(`${o.trainer.name} schickt ${monName(b.f)} in den Kampf!`, 700);
      await this.appear('f');
    } else {
      cry(SPECIES[b.f.sp].cry);
      await this.say(o.intro === 'legend' ? `Das legendäre ${SPECIES[b.f.sp].name} erscheint!` : `Ein wildes ${SPECIES[b.f.sp].name} erscheint!`);
    }
    this.showFoeBox = true;
    await this.tween(0.35, k => (this.trainerOwn.x = -110 * k)); this.trainerOwn.vis = false;
    await this.say(`Los, ${monName(b.p)}!`, 600);
    await this.appear('p');
    this.showOwnBox = true;
    while (!b.over) {
      const action = await this.chooseAction();
      if (!action) continue;
      await this.play(await this.remote(() => b.turn(action)));
      if (b.awaitSwitch) {
        let i = null; while (i === null) i = await party(this.teamState(), { select: true, prompt: 'Wer soll kämpfen?', filter: m => !m.egg && m.hp > 0 });
        await this.play(await this.remote(() => b.forcedSwitch(i)));
      }
      if (b.waitingOther) await this.play(await this.remote(() => b.recv()));
    }
    if (b.result === 'win' && o.trainer && !o.remote) {
      this.trainerFoe.vis = true; this.trainerFoe.x = 120;
      await this.tween(0.4, k => (this.trainerFoe.x = 120 * (1 - k)));
      if (o.trainer.lose) await this.say(o.trainer.lose);
      if (o.trainer.reward) { this.s.money += o.trainer.reward; await this.say(`Du erhältst ${o.trainer.reward} ◈ Preisgeld!`); }
    }
    if (b.result === 'lose' && !o.remote) await this.say(`${this.s.name} hat keine kampffähigen Kreaturen mehr… Alles wird schwarz.`);
    // Entwicklungen
    for (const pe of b.pendingEvos) {
      const m = this.s.team.find(x => x.uid === pe.uid);
      if (!m || m.hp <= 0) continue;
      const oldName = monName(m), oldSpr = monSprite(m.sp, 'front', m.shiny, m.mut);
      sfx('evo');
      const newSpr = monSprite(pe.to, 'front', m.shiny, m.mut);
      await evoScene(oldSpr, newSpr, `${oldName} hat sich zu ${SPECIES[pe.to].name} entwickelt!`);
      evolve(m, pe.to); cry(SPECIES[pe.to].cry);
      this.g.markDex(pe.to, true);
    }
    pop(this);
    this.res({ result: b.result, caught: b.caught });
  }

  // Online: während auf den Server/Mitspieler gewartet wird, Wartemeldung zeigen
  async remote(fn) {
    if (!this.o.remote) return fn();
    this.mode = 'busy'; this.msg = '';
    const close = waitMsg(`Warte auf ${this.b.foeName}`);
    try { return await fn(); } finally { close(); }
  }
  teamState() { return this.o.remote ? { ...this.s, team: this.b.team } : this.s; }
  tween(dur, fn) { return new Promise(res => this.tweens.push({ t: 0, dur, fn, res })); }
  say(t, hold = 900) {
    this.msg = t; this.chars = 0; this.mode = 'msg';
    return new Promise(res => { this.msgRes = res; this.msgHold = hold; this.msgDone = 0; });
  }

  chooseAction() {
    this.mode = 'menu'; this.msg = `Was soll ${monName(this.b.p)} tun?`; this.chars = 999;
    return new Promise(res => (this.actRes = res));
  }
  async onMenu(i) {
    const b = this.b, done = a => { this.mode = 'busy'; const r = this.actRes; this.actRes = null; r(a); };
    if (i === 0) { if (b.p.moves.every(m => m.pp <= 0)) b.p.moves[0].pp = 1; this.mode = 'moves'; return; }
    if (i === 1 && this.o.remote) { this.mode = 'busy'; await say('Im Freundschaftskampf sind keine Items erlaubt.'); this.mode = 'menu'; return; }
    if (i === 3 && this.o.remote) { this.mode = 'busy'; if (await ask('Möchtest du aufgeben?')) return done({ t: 'forfeit' }); this.mode = 'menu'; return; }
    if (i === 1) {
      this.mode = 'busy';
      const bag = this.s.bag, opts = [];
      for (const k of Object.keys(ITEMS)) { const I = ITEMS[k]; if (bag[k] && (I.ball || I.heal || I.cure || I.revive)) opts.push({ k, label: I.name, right: '×' + bag[k], disabled: I.ball && !b.canCatch }); }
      if (!opts.length) { await say('Dein Beutel ist leer.'); this.mode = 'menu'; return; }
      const c = await choose(opts, { title: 'BEUTEL' });
      if (c === null) { this.mode = 'menu'; return; }
      const it = ITEMS[opts[c].k];
      if (it.ball) { bag[opts[c].k]--; return done({ t: 'catch', bonus: it.ball * (SPECIES[b.f.sp].legendary ? 1.2 : 1), item: opts[c].k }); }
      const ti = await party(this.s, { select: true, prompt: it.revive ? 'Wen beleben?' : it.cure ? 'Wen kurieren?' : 'Wen heilen?', filter: itemFilter(it) });
      if (ti === null) { this.mode = 'menu'; return; }
      bag[opts[c].k]--; return done({ t: 'item', target: ti, amount: it.heal, cure: it.cure, revive: it.revive });
    }
    if (i === 2) {
      this.mode = 'busy';
      const ti = await party(this.teamState(), { select: true, prompt: 'Welche Kreatur einwechseln?', filter: m => !m.egg && m.hp > 0 && m !== b.p });
      if (ti === null) { this.mode = 'menu'; return; }
      return done({ t: 'switch', i: ti });
    }
    if (i === 3) return done({ t: 'run' });
  }

  // ---------------------------------------------------------- Ereignisse
  async play(events) {
    for (const e of events) {
      this.b.apply?.(e);
      switch (e.t) {
        case 'msg': await this.say(e.text); break;
        case 'move': await this.animMove(e.side, e.move, e.hit); break;
        case 'hp':
          if (e.heal) { this.sparkle(e.side, '#7dffb0', true); sfx('heal'); }
          else if (e.dot) { this.burst(e.side, TYPES[e.type].color, 14); this.blink(e.side); sfx('weak'); }
          else this.impact(e.side, e);
          await this.drainTo(e.side, e.hp); break;
        case 'stat': this.sparkle(e.side, e.up ? '#ffb24a' : '#6aa8ff', e.up); sfx(e.up ? 'buff' : 'debuff'); await wait(450); break;
        case 'status': this.burst(e.side, { brand: '#ff6a2b', gift: '#b45ce0', starre: '#ffd23a' }[e.status], 20); await wait(300); break;
        case 'faint': await this.faint(e.side); break;
        case 'send': await this.say(e.text, 600); if (e.side === 'p') { this.xpD = this.b.p.xp; this.hpD.p = this.b.p.hp; } else this.hpD.f = this.b.f.hp; await this.appear(e.side); if (e.side === 'f') this.g.markDex(this.b.f.sp); break;
        case 'recall': { const ro = e.side === 'f' ? this.foeOff : this.ownOff; await this.say(e.text, 500); await this.tween(0.25, k => (ro.s = 1 - k)); ro.vis = false; break; }
        case 'catch': await this.catchAnim(e.shakes, e.ok); break;
        case 'xp': { const m = this.b.team.find(x => x.uid === e.uid); if (m === this.b.p) await this.fillXp(); break; }
        case 'lvl': sfx('lvl'); this.sparkle('p', '#ffe27a', true); this.hpD.p = this.b.p.hp; await this.say(e.text); break;
        case 'learn': await this.learn(this.b.team.find(m => m.uid === e.uid), e.id); break;
      }
    }
  }
  drainTo(side, hp) { const from = this.hpD[side]; return this.tween(Math.min(0.9, 0.25 + Math.abs(from - hp) * 0.02), k => (this.hpD[side] = from + (hp - from) * k)); }
  async fillXp() {
    const m = this.b.p, from = this.xpD, to = m.xp;
    await this.tween(0.6, k => (this.xpD = from + (to - from) * k));
  }
  async learn(m, id) {
    if (!m) return;
    const M = MOVES[id];
    if (m.moves.length < 4) { m.moves.push({ id, pp: M.pp }); sfx('lvl'); return this.say(`${monName(m)} hat ${M.name} erlernt!`); }
    await this.say(`${monName(m)} möchte ${M.name} lernen, kennt aber schon vier Attacken. Eine vergessen?`);
    this.mode = 'busy';
    const i = await choose([...m.moves.map(mv => MOVES[mv.id].name), `${M.name} nicht lernen`], { title: 'Vergessen:', cancel: true });
    if (i === null || i === 4) return this.say(`${monName(m)} hat ${M.name} nicht erlernt.`);
    const old = MOVES[m.moves[i].id].name; m.moves[i] = { id, pp: M.pp };
    return this.say(`1, 2 und … Schwupp! ${old} vergessen und ${M.name} erlernt!`);
  }

  // ---------------------------------------------------------- Animationen
  center(side) { return side === 'f' ? { x: FOE.x + 32 + this.foeOff.x, y: FOE.y + 36 } : { x: OWN.x + 32 + this.ownOff.x, y: OWN.y + 36 }; }
  emit(x, y, vx, vy, c, life = 0.6, sz = 2) { this.parts.push({ x, y, vx, vy, c, l: life, ml: life, sz }); }
  burst(side, c, n = 20, sp = 60) { const p = this.center(side); for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = sp * (0.3 + Math.random()); this.emit(p.x, p.y, Math.cos(a) * v, Math.sin(a) * v, c, 0.5 + Math.random() * 0.3, 1.5 + Math.random() * 2); } }
  sparkle(side, c, up) { const p = this.center(side); for (let i = 0; i < 24; i++) this.emit(p.x + (Math.random() - 0.5) * 50, p.y + (up ? 20 : -25) - Math.random() * 10, 0, up ? -40 - Math.random() * 30 : 40, c, 0.8, 2); }
  blink(side) { const o = side === 'f' ? this.foeOff : this.ownOff; let n = 0; const iv = setInterval(() => { o.vis = !o.vis; if (++n >= 6) { o.vis = true; clearInterval(iv); } }, 70); }
  impact(side, e) {
    if (e.eff === 0) { sfx('weak'); return; }
    const big = e.eff > 1 || e.crit;
    this.burst(side, TYPES[e.type].color, big ? 40 : 22, big ? 110 : 70);
    this.burst(side, '#ffffff', 8, 40);
    this.blink(side);
    const o = side === 'f' ? this.foeOff : this.ownOff, dir = side === 'f' ? 1 : -1;
    this.tween(0.3, k => (o.x = Math.sin(k * Math.PI * 3) * 4 * dir * (1 - k)));
    G.shake = big ? 1 : 0.4;
    sfx(big ? 'super' : e.eff < 1 ? 'weak' : 'hit');
    if (big) this.flash = 0.25;
  }
  async appear(side) {
    const o = side === 'f' ? this.foeOff : this.ownOff, c = this.center(side);
    o.vis = true; o.s = 0; o.x = 0; sfx('whoosh');
    for (let i = 0; i < 18; i++) { const a = i / 18 * 6.28; this.emit(c.x, c.y + 20, Math.cos(a) * 50, Math.sin(a) * 25, '#bff8ff', 0.4); }
    await this.tween(0.3, k => (o.s = ease(k)));
    cry(SPECIES[side === 'f' ? this.b.f.sp : this.b.p.sp].cry);
    await wait(250);
  }
  async faint(side) {
    const o = side === 'f' ? this.foeOff : this.ownOff;
    cry(SPECIES[side === 'f' ? this.b.f.sp : this.b.p.sp].cry); sfx('faint');
    await this.tween(0.5, k => (o.y = k * 64));
    o.vis = false; o.y = 0;
    if (side === 'p') this.showOwnBox = false;
  }
  async animMove(side, id, hit) {
    const M = MOVES[id], col = TYPES[M.type].color, foe = side === 'p' ? 'f' : 'p';
    const o = side === 'f' ? this.foeOff : this.ownOff, dir = side === 'p' ? 1 : -1;
    const a = this.center(side), t = this.center(foe);
    switch (M.fx) {
      case 'dash': case 'slash': case 'bite':
        sfx('whoosh');
        await this.tween(0.15, k => (o.x = dir * 18 * k));
        if (hit && M.fx === 'slash') for (let s = 0; s < 3; s++) for (let i = 0; i < 8; i++) this.emit(t.x - 14 + i * 4 + s * 4, t.y - 14 + i * 4 - s * 3, 0, 0, '#ffffff', 0.25, 1.5);
        if (hit && M.fx === 'bite') for (const sy of [-1, 1]) for (let i = 0; i < 6; i++) this.emit(t.x - 10 + i * 4, t.y + sy * 16, 0, -sy * 60, '#ffffff', 0.2, 2);
        await this.tween(0.2, k => (o.x = dir * 18 * (1 - k)));
        break;
      case 'bolt': case 'beam':
        sfx('whoosh');
        await this.tween(M.fx === 'beam' ? 0.45 : 0.35, k => {
          if (M.fx === 'beam') for (let i = 0; i < 3; i++) { const q = Math.random() * k; this.emit(a.x + (t.x - a.x) * q, a.y + (t.y - a.y) * q, 0, 0, col, 0.2, 2.5); }
          else { const px = a.x + (t.x - a.x) * ease(k), py = a.y + (t.y - a.y) * ease(k) - Math.sin(k * Math.PI) * 18; for (let i = 0; i < 3; i++) this.emit(px, py, (Math.random() - .5) * 20, (Math.random() - .5) * 20, col, 0.25, 3); }
        });
        break;
      case 'zap':
        for (let i = 0; i < 4; i++) { this.bolts.push({ a, t, c: i % 2 ? '#ffffff' : col, l: 0.15 }); sfx('click'); await wait(70); }
        break;
      case 'storm':
        sfx('whoosh');
        await this.tween(0.8, k => { for (let i = 0; i < 4; i++) { const ang = k * 16 + i * 1.57, r = 30 - k * 14; this.emit(t.x + Math.cos(ang) * r, t.y + 18 - k * 40 + Math.sin(ang) * r * 0.3, 0, -10, i % 2 ? col : '#fff', 0.3, 2.5); } });
        G.shake = 0.5; break;
      case 'quake':
        G.shake = 1.4; sfx('hit');
        for (let r = 0; r < 3; r++) { for (let i = 0; i < 14; i++) this.emit(t.x, t.y + 26, (Math.random() - 0.5) * 140, -40 - Math.random() * 60, col, 0.5, 3); await wait(150); }
        break;
      case 'cloud':
        for (let i = 0; i < 30; i++) this.emit(t.x + (Math.random() - 0.5) * 40, t.y + (Math.random() - 0.5) * 30, (Math.random() - .5) * 10, -8, col, 0.9, 4);
        await wait(450); break;
      case 'roar':
        cry(SPECIES[this.b.mon(side).sp].cry);
        await this.tween(0.4, k => (o.s = 1 + Math.sin(k * Math.PI) * 0.15)); o.s = 1; break;
      default:
        await this.tween(0.3, k => (o.s = 1 + Math.sin(k * Math.PI) * 0.08)); o.s = 1;
    }
  }
  async catchAnim(shakes, ok) {
    const t = this.center('f');
    this.crystal = { x: 40, y: 110, r: 0, img: crystalIcon(this.o.crystalCol || '#7fe3ff') };
    sfx('throw');
    await this.tween(0.55, k => { this.crystal.x = 40 + (t.x - 40) * k; this.crystal.y = 110 + (t.y - 10 - 110) * k - Math.sin(k * Math.PI) * 50; this.crystal.r = k * 10; });
    for (let i = 0; i < 24; i++) this.emit(t.x, t.y - 10, (Math.random() - .5) * 120, (Math.random() - .5) * 120, '#bff8ff', 0.4);
    await this.tween(0.3, k => (this.foeOff.s = 1 - k)); this.foeOff.vis = false;
    await this.tween(0.3, k => { this.crystal.y = t.y - 10 + k * 34; this.crystal.r = 0; });
    for (let i = 0; i < shakes; i++) { await wait(400); sfx('wobble'); await this.tween(0.4, k => (this.crystal.r = Math.sin(k * Math.PI * 2) * 0.5)); }
    await wait(350);
    if (ok) {
      sfx('caught');
      for (let i = 0; i < 3; i++) this.emit(this.crystal.x + (i - 1) * 10, this.crystal.y, (i - 1) * 20, -50, '#fff6a8', 0.8, 3);
      this.crystal.done = true; await wait(700);
    } else {
      for (let i = 0; i < 30; i++) this.emit(this.crystal.x, this.crystal.y, (Math.random() - .5) * 140, (Math.random() - .5) * 140, '#bff8ff', 0.4);
      this.crystal = null; this.foeOff.vis = true;
      await this.tween(0.25, k => (this.foeOff.s = k)); cry(SPECIES[this.b.f.sp].cry);
    }
  }

  // ---------------------------------------------------------- Update & Zeichnen
  update(dt) {
    for (let i = this.tweens.length - 1; i >= 0; i--) { const tw = this.tweens[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(k); if (k >= 1) { this.tweens.splice(i, 1); tw.res(); } }
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt; } this.parts = this.parts.filter(p => p.l > 0);
    for (const b of this.bolts) b.l -= dt; this.bolts = this.bolts.filter(b => b.l > 0);
    if (this.flash > 0) this.flash -= dt;
    if (this.mode === 'msg') {
      this.chars += dt * 70;
      const n = this.msg.length;
      if (this.chars >= n && this.msgRes) { this.msgDone += dt; if (this.msgDone * 1000 > this.msgHold || input.pressed('a') || input.pressed('b') || input.tap) { const r = this.msgRes; this.msgRes = null; r(); } }
      else if ((input.pressed('a') || input.tap) && this.chars < n) this.chars = n;
    } else if (this.mode === 'menu') {
      if (input.pressed('right') || input.pressed('left')) { this.cur ^= 1; sfx('click'); }
      if (input.pressed('down') || input.pressed('up')) { this.cur ^= 2; sfx('click'); }
      const tp = input.tap;
      if (tp && inRect(tp, 120, 114, 117, 43)) { this.cur = (tp.x > 178 ? 1 : 0) + (tp.y > 135 ? 2 : 0); sfx('click'); this.onMenu(this.cur); }
      else if (input.pressed('a')) { sfx('click'); this.onMenu(this.cur); }
    } else if (this.mode === 'moves') {
      const n = this.b.p.moves.length;
      if (input.pressed('right') || input.pressed('left')) { this.mcur = (this.mcur ^ 1) % Math.max(1, n); if (this.mcur >= n) this.mcur = 0; sfx('click'); }
      if (input.pressed('down') || input.pressed('up')) { const k = this.mcur ^ 2; if (k < n) this.mcur = k; sfx('click'); }
      const tp = input.tap;
      if (tp && tp.y > 114 && tp.x < 160) { const k = (tp.x > 82 ? 1 : 0) + (tp.y > 135 ? 2 : 0); if (k < n) { this.mcur = k; this.pickMove(); } }
      else if (tp && tp.y > 114 && tp.x >= 160) { this.mode = 'menu'; sfx('click'); }
      else if (input.pressed('a')) this.pickMove();
      if (input.pressed('b')) { this.mode = 'menu'; sfx('click'); }
    }
  }
  pickMove() {
    const mv = this.b.p.moves[this.mcur]; if (!mv || mv.pp <= 0) { sfx('weak'); return; }
    sfx('click'); this.mode = 'busy'; const r = this.actRes; this.actRes = null; r({ t: 'move', i: this.mcur });
  }

  draw(ctx) {
    const [sky, sky2, g1, g2] = this.bg, b = this.b;
    const gr = ctx.createLinearGradient(0, 0, 0, 114); gr.addColorStop(0, sky); gr.addColorStop(0.55, sky2); gr.addColorStop(0.56, g1); gr.addColorStop(1, g2);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, 114);
    // Plattformen
    for (const [cx, cy, rx, ry] of [[178 + this.foeOff.x * 0, 70, 46, 10], [60, 112, 56, 12]]) {
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(cx, cy + 2, rx, ry, 0, 0, 7); ctx.fill();
      ctx.fillStyle = g2; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.ellipse(cx, cy - 2, rx - 6, ry - 4, 0, 0, 7); ctx.fill();
    }
    // Gegner
    const fo = this.foeOff;
    if (this.trainerFoe.vis && this.o.trainer) ctx.drawImage(trainerSprite(this.o.trainer.look), FOE.x + this.trainerFoe.x, FOE.y + 2);
    else if (fo.vis && b.f) this.drawSprite(ctx, monSprite(b.f.sp, 'front', b.f.shiny, b.f.mut), FOE.x + fo.x, FOE.y + fo.y, fo.s, 72);
    // eigene Seite
    const oo = this.ownOff;
    if (this.trainerOwn.vis) ctx.drawImage(trainerSprite(this.s.look, true), OWN.x + this.trainerOwn.x, OWN.y + 4);
    else if (oo.vis) this.drawSprite(ctx, monSprite(b.p.sp, 'back', b.p.shiny, b.p.mut), OWN.x + oo.x, OWN.y + oo.y, oo.s, 114);
    // Kristall
    if (this.crystal) { ctx.save(); ctx.translate(this.crystal.x, this.crystal.y); ctx.rotate(this.crystal.r); ctx.drawImage(this.crystal.img, -8, -8); ctx.restore(); }
    // Blitze & Partikel
    for (const bo of this.bolts) {
      ctx.strokeStyle = bo.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bo.a.x, bo.a.y);
      for (let i = 1; i <= 6; i++) { const k = i / 6; ctx.lineTo(bo.a.x + (bo.t.x - bo.a.x) * k + (i < 6 ? (Math.random() - .5) * 14 : 0), bo.a.y + (bo.t.y - bo.a.y) * k + (i < 6 ? (Math.random() - .5) * 14 : 0)); }
      ctx.stroke();
    }
    for (const p of this.parts) { ctx.globalAlpha = Math.min(1, p.l / p.ml * 1.5); ctx.fillStyle = p.c; ctx.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz); }
    ctx.globalAlpha = 1;
    // Infoboxen
    if (this.showFoeBox && b.f) this.infoBox(ctx, b.f, 6, 8, false);
    if (this.showOwnBox) this.infoBox(ctx, b.p, 128, 72, true);
    // Text & Menüs
    box(0, 113, W, 47, 'dark');
    if (this.mode === 'moves') return this.drawMoves(ctx);
    const lines = wrap(this.msg, this.mode === 'menu' ? 108 : 220, 8.5);
    let n = Math.floor(this.chars), y = 121;
    for (const l of lines.slice(0, 2)) { text(l.slice(0, Math.max(0, n)), 9, y, '#fff', 8.5, 'left', '#50586a'); n -= l.length + 1; y += 15; }
    if (this.mode === 'menu') {
      box(120, 114, 117, 43);
      ['KAMPF', 'BEUTEL', 'TEAM', 'FLUCHT'].forEach((s, i) => { const x = 134 + (i % 2) * 52, yy = 121 + Math.floor(i / 2) * 16; if (this.cur === i) cursor(x - 9, yy + 1); text(s, x, yy, COL.ink, 8.5, 'left', COL.shadow, true); });
    }
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flash * 2})`; ctx.fillRect(0, 0, W, H); }
  }
  drawSprite(ctx, img, x, y, s, clipY) {
    if (s <= 0.01) return;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, clipY); ctx.clip();
    const w = 64 * s; ctx.drawImage(img, x + 32 - w / 2, y + 64 - w, w, w);
    ctx.restore();
  }
  infoBox(ctx, m, x, y, own) {
    const h = own ? 38 : 30;
    box(x, y, 106, h);
    text(monName(m), x + 7, y + 5, COL.ink, 8, 'left', COL.shadow, true);
    text('Lv' + m.lvl, x + 100, y + 5, COL.ink, 7.5, 'right');
    if (m.status) text({ brand: 'BRD', gift: 'GIF', starre: 'STR' }[m.status], x + 7, y + 16, '#c84848', 6.5, 'left', null, true);
    text('KP', x + 28, y + 16, '#d07818', 6.5, 'left', null, true);
    const hpd = own ? this.hpD.p : this.hpD.f;
    bar(x + 40, y + 17.5, 60, 3.5, hpd / maxHp(m));
    if (own) {
      text(`${Math.round(hpd)}/${maxHp(m)}`, x + 100, y + 23, COL.ink, 7.5, 'right');
      const lo = xpForLevel(m.lvl), hi = xpForLevel(m.lvl + 1);
      bar(x + 8, y + 33, 92, 1.5, (Math.min(this.xpD, hi) - lo) / (hi - lo), 'xp');
    }
  }
  drawMoves(ctx) {
    const ms = this.b.p.moves;
    box(0, 113, 160, 47);
    ms.forEach((mv, i) => { const x = 14 + (i % 2) * 74, y = 121 + Math.floor(i / 2) * 16; if (this.mcur === i) cursor(x - 9, y + 1); text(MOVES[mv.id].name, x, y, mv.pp ? COL.ink : COL.inkSoft, 7.8, 'left', COL.shadow, true); });
    box(160, 113, 80, 47);
    const mv = ms[this.mcur];
    if (mv) { const M = MOVES[mv.id]; text(`AP ${mv.pp}/${M.pp}`, 200, 120, COL.ink, 8, 'center', COL.shadow, true); typeTag(M.type, 183, 133); text(M.cat === 'status' ? 'Status' : `Stärke ${M.pow}`, 200, 146, COL.inkSoft, 6.5, 'center', null); }
  }
}

export function battle(game, o) {
  return new Promise(res => { const s = new BattleScene(game, o, res); push(s); s.run(); });
}
