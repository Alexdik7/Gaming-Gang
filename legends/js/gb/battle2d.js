// Kampfbildschirm im Handheld-Stil
import { G, W, H, COL, push, pop, input, text, box, cursor, bar, inRect, wait, wrap, fade } from './engine.js';
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
const easeOut = t => 1 - Math.pow(1 - t, 3);
const backOut = t => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
// Einfarbige Silhouette eines Sprites (weißes Aufleuchten beim Erscheinen, dunkle Umrisse bei wilden Kreaturen)
const tintCache = new WeakMap();
export function tinted(img, col) {
  let m = tintCache.get(img); if (!m) tintCache.set(img, (m = {}));
  if (!m[col]) { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); m[col] = c; }
  return m[col];
}

class BattleScene {
  constructor(game, o, res) {
    this.g = game; this.o = o; this.res = res; this.s = game.state;
    this.b = o.remote || new Battle({ team: this.s.team, foeTeam: o.foeTeam, wild: !o.trainer, trainer: o.trainer, canCatch: o.canCatch !== false });
    this.bg = BG[o.bg || 'gras'];
    this.msg = ''; this.chars = 0; this.mode = 'msg'; this.cur = 0; this.mcur = 0;
    this.foeOff = { x: 0, y: 0, s: o.trainer ? 0 : 1, vis: !o.trainer, flash: 0 }; this.ownOff = { x: 0, y: 0, s: 0, vis: false, flash: 0 };
    this.slide = 0; this.foeDark = o.trainer ? 0 : 1; this.foeBoxK = 0; this.ownBoxK = 0; this.rings = [];
    this.trainerOwn = { x: 0, vis: true }; this.trainerFoe = { x: 0, vis: !!o.trainer };
    this.hpD = { p: this.b.p.hp, f: this.b.f.hp }; this.xpD = this.b.p.xp;
    this.parts = []; this.tweens = []; this.crystal = null; this.bolts = [];
    this.showFoeBox = false; this.showOwnBox = false;
  }
  // ---------------------------------------------------------- Ablauf
  async run() {
    const b = this.b, o = this.o;
    setMusic(o.music || o.trainer?.music || (o.intro === 'legend' ? 'legend' : o.trainer ? 'trainer' : 'battle'));
    // Auftritt: beide Plattformen gleiten mit den Trainern ins Bild
    await this.tween(0.85, k => (this.slide = easeOut(k)));
    if (o.trainer) {
      await this.say(`${o.trainer.name} fordert dich heraus!`);
      this.note(`${o.trainer.name} schickt ${monName(b.f)} in den Kampf!`);
      await this.tween(0.18, k => (this.trainerFoe.x = -6 * Math.sin(k * Math.PI)));
      const out = this.tween(0.5, k => (this.trainerFoe.x = 130 * ease(k)));
      await this.throwCrystal('f'); await out; this.trainerFoe.vis = false;
      await wait(250);
    } else {
      // wilde Kreatur: erst dunkle Silhouette, dann sichtbar
      if (o.intro === 'legend') { G.shake = 1.4; sfx('encounter'); }
      await wait(150);
      await this.tween(o.intro === 'legend' ? 0.7 : 0.35, k => (this.foeDark = 1 - k));
      cry(SPECIES[b.f.sp].cry); this.foeOff.flash = 0.6; this.tween(0.4, k => (this.foeOff.flash = 0.6 * (1 - k)));
      await this.say(o.intro === 'legend' ? `Das legendäre ${SPECIES[b.f.sp].name} erscheint!` : `Ein wildes ${SPECIES[b.f.sp].name} erscheint!`);
    }
    this.showFoeBox = true; await this.tween(0.25, k => (this.foeBoxK = easeOut(k)));
    // eigener Trainer wirft den Kristall und läuft aus dem Bild
    this.note(`Los, ${monName(b.p)}!`);
    await this.tween(0.15, k => (this.trainerOwn.x = 4 * Math.sin(k * Math.PI)));
    const exit = this.tween(0.55, k => (this.trainerOwn.x = -120 * ease(k)));
    await wait(90); await this.throwCrystal('p'); await exit; this.trainerOwn.vis = false;
    this.showOwnBox = true; await this.tween(0.25, k => (this.ownBoxK = easeOut(k)));
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
    // weicher Übergang zurück: abblenden, Kampf schließen, Welt einblenden (bei Niederlage übernimmt das Spiel)
    await fade(1, 450);
    pop(this);
    if (b.result !== 'lose' || o.remote) setTimeout(() => fade(0, 450), 30);
    this.res({ result: b.result, caught: b.caught });
  }
  // Text anzeigen, ohne auf eine Taste zu warten (läuft neben Animationen)
  note(t) { this.msg = t; this.chars = 0; this.mode = 'busy'; }
  // Bindkristall im Bogen werfen, aufleuchten lassen und die Kreatur freisetzen
  async throwCrystal(side) {
    const t = this.center(side), m = side === 'f' ? this.b.f : this.b.p;
    const from = side === 'f' ? { x: FOE.x + 46 + this.trainerFoe.x - 260 * (1 - this.slide), y: FOE.y + 22 } : { x: OWN.x + 46 + this.trainerOwn.x, y: OWN.y + 40 };
    const col = SPECIES[m.sp]?.model?.glow || '#bff8ff';
    this.crystal = { x: from.x, y: from.y, r: 0, img: crystalIcon(this.o.crystalCol || '#7fe3ff') }; sfx('throw');
    const land = { x: t.x, y: t.y + 8 }, peak = side === 'f' ? 26 : 52;
    await this.tween(0.55, k => { this.crystal.x = from.x + (land.x - from.x) * k; this.crystal.y = from.y + (land.y - from.y) * k - Math.sin(k * Math.PI) * peak; this.crystal.r = k * 14; });
    // kurzes Wackeln, dann öffnet sich der Kristall mit Lichtring
    await this.tween(0.16, k => (this.crystal.r = Math.sin(k * Math.PI * 2) * 0.4));
    this.crystal = null; sfx('whoosh');
    this.rings.push({ x: land.x, y: land.y, t: 0, c: col }, { x: land.x, y: land.y, t: -0.08, c: '#ffffff' });
    for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28, v = 40 + Math.random() * 40; this.emit(land.x, land.y, Math.cos(a) * v, Math.sin(a) * v * 0.6, i % 3 ? col : '#ffffff', 0.45, 2); }
    await this.appear(side);
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
        case 'send': this.note(e.text); if (e.side === 'p') { this.xpD = this.b.p.xp; this.hpD.p = this.b.p.hp; } else this.hpD.f = this.b.f.hp; await this.throwCrystal(e.side); if (e.side === 'f') this.g.markDex(this.b.f.sp); await this.showBox(e.side); await wait(250); break;
        case 'recall': await this.recall(e.side, e.text); break;
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
  center(side) { return side === 'f' ? { x: FOE.x + 32 + this.foeOff.x - 260 * (1 - this.slide), y: FOE.y + 36 } : { x: OWN.x + 32 + this.ownOff.x + 260 * (1 - this.slide), y: OWN.y + 36 }; }
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
    o.vis = true; o.s = 0; o.x = 0; o.flash = 1;
    for (let i = 0; i < 18; i++) { const a = i / 18 * 6.28; this.emit(c.x, c.y + 20, Math.cos(a) * 50, Math.sin(a) * 25, '#bff8ff', 0.4); }
    await this.tween(0.32, k => (o.s = backOut(k)));
    this.tween(0.35, k => (o.flash = 1 - k));
    cry(SPECIES[side === 'f' ? this.b.f.sp : this.b.p.sp].cry);
    await wait(250);
  }
  async faint(side) {
    const o = side === 'f' ? this.foeOff : this.ownOff;
    cry(SPECIES[side === 'f' ? this.b.f.sp : this.b.p.sp].cry); sfx('faint');
    await this.tween(0.5, k => (o.y = k * 64));
    o.vis = false; o.y = 0;
    await this.hideBox(side);
  }
  // Lebensanzeige ein-/ausschieben (gegnerische links, eigene rechts)
  async showBox(side) {
    if (side === 'p') { this.showOwnBox = true; if (this.ownBoxK < 1) await this.tween(0.22, k => (this.ownBoxK = Math.max(this.ownBoxK, easeOut(k)))); }
    else { this.showFoeBox = true; if (this.foeBoxK < 1) await this.tween(0.22, k => (this.foeBoxK = Math.max(this.foeBoxK, easeOut(k)))); }
  }
  async hideBox(side) {
    const key = side === 'p' ? 'ownBoxK' : 'foeBoxK', from = this[key];
    if (from > 0) await this.tween(0.18, k => (this[key] = from * (1 - k)));
    if (side === 'p') this.showOwnBox = false; else this.showFoeBox = false;
  }
  // Zurückrufen: Kreatur leuchtet auf, schrumpft und fliegt als Lichtstrahl zum Trainer zurück
  async recall(side, txt) {
    const o = side === 'f' ? this.foeOff : this.ownOff, c = this.center(side), tx = side === 'f' ? W + 20 : -20, ty = side === 'f' ? 10 : 90;
    this.note(txt); sfx('whoosh');
    const hb = this.hideBox(side);
    await this.tween(0.18, k => (o.flash = k));
    await this.tween(0.28, k => { o.s = 1 - ease(k); for (let i = 0; i < 2; i++) this.emit(c.x + (tx - c.x) * k + (Math.random() - 0.5) * 8, c.y + (ty - c.y) * k + (Math.random() - 0.5) * 8, 0, 0, i ? '#ffffff' : '#ff8aa0', 0.3, 2.5); });
    o.vis = false; o.flash = 0; await hb; await wait(150);
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
    for (const r of this.rings) r.t += dt; this.rings = this.rings.filter(r => r.t < 0.45);
    if (this.flash > 0) this.flash -= dt;
    if (this.mode === 'busy') this.chars += dt * 70;
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
    const sF = -260 * (1 - this.slide), sO = 260 * (1 - this.slide);
    for (const [cx, cy, rx, ry] of [[178 + sF, 70, 46, 10], [60 + sO, 112, 56, 12]]) {
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(cx, cy + 2, rx, ry, 0, 0, 7); ctx.fill();
      ctx.fillStyle = g2; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.ellipse(cx, cy - 2, rx - 6, ry - 4, 0, 0, 7); ctx.fill();
    }
    // Gegner
    const fo = this.foeOff;
    if (fo.vis && b.f) this.drawSprite(ctx, monSprite(b.f.sp, 'front', b.f.shiny, b.f.mut), FOE.x + fo.x + sF, FOE.y + fo.y, fo.s, 72, fo.flash, this.foeDark);
    if (this.trainerFoe.vis && this.o.trainer) ctx.drawImage(trainerSprite(this.o.trainer.look), FOE.x + this.trainerFoe.x + sF, FOE.y + 2);
    // eigene Seite
    const oo = this.ownOff;
    if (oo.vis) this.drawSprite(ctx, monSprite(b.p.sp, 'back', b.p.shiny, b.p.mut), OWN.x + oo.x + sO, OWN.y + oo.y, oo.s, 114, oo.flash);
    if (this.trainerOwn.vis) ctx.drawImage(trainerSprite(this.s.look, true), OWN.x + this.trainerOwn.x + sO, OWN.y + 4);
    // Lichtringe beim Öffnen des Kristalls
    for (const r of this.rings) if (r.t > 0) { ctx.globalAlpha = Math.max(0, 1 - r.t / 0.45); ctx.strokeStyle = r.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(r.x, r.y, 4 + r.t * 90, 2 + r.t * 40, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
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
    if (this.showFoeBox && b.f) this.infoBox(ctx, b.f, 6 - 130 * (1 - this.foeBoxK), 8, false);
    if (this.showOwnBox) this.infoBox(ctx, b.p, 128 + 130 * (1 - this.ownBoxK), 72, true);
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
  drawSprite(ctx, img, x, y, s, clipY, flash = 0, dark = 0) {
    if (s <= 0.01) return;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, clipY); ctx.clip();
    const w = 64 * s, dx = x + 32 - w / 2, dy = y + 64 - w;
    ctx.drawImage(img, dx, dy, w, w);
    if (dark > 0) { ctx.globalAlpha = dark; ctx.drawImage(tinted(img, '#1c1830'), dx, dy, w, w); }
    if (flash > 0) { ctx.globalAlpha = Math.min(1, flash); ctx.drawImage(tinted(img, '#ffffff'), dx, dy, w, w); }
    ctx.globalAlpha = 1;
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
