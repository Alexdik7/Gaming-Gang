// Rundenbasierte Kampflogik (rein logisch, ohne Grafik). Liefert Ereignislisten, die battleView.js abspielt.
import { SPECIES } from '../data/creatures.js';
import { MOVES } from '../data/moves.js';
import { effectiveness, TYPES } from '../data/types.js';
import { calcStats, maxHp, monName, giveXp, xpBonus } from '../data/mon.js';

export const STAGE = s => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));
export const ACC_STAGE = s => (s >= 0 ? (3 + s) / 3 : 3 / (3 - s));
export const STAT_NAME = { atk: 'Angriff', def: 'Verteidigung', spa: 'Spezial-Angriff', spd: 'Spezial-Vert.', spe: 'Initiative', acc: 'Genauigkeit' };
export const STATUS_NAME = { brand: 'Verbrennung', gift: 'Vergiftung', starre: 'Starre' };
export const freshStages = () => ({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 });

export class Battle {
  constructor({ team, foeTeam, wild = true, trainer = null, rnd = Math.random, canCatch = true, pvp = false, names = null }) {
    this.team = team; this.foeTeam = foeTeam; this.wild = wild && !pvp; this.trainer = trainer;
    this.pvp = pvp; this.names = names || { p: 'Du', f: trainer?.name || 'Gegner' };
    this.rnd = rnd; this.canCatch = canCatch && wild;
    this.pi = team.findIndex(m => m.hp > 0); this.fi = 0;
    this.st = { p: freshStages(), f: freshStages() };
    this.over = false; this.result = null; this.runTries = 0;
    this.participants = new Set([team[this.pi].uid]);
    this.pendingEvos = [];
  }
  get p() { return this.team[this.pi]; }
  get f() { return this.foeTeam[this.fi]; }
  mon(side) { return side === 'p' ? this.p : this.f; }
  label(side) { const m = this.mon(side); if (this.pvp) return `${monName(m)} (${this.names[side]})`; return side === 'p' ? monName(m) : (this.wild ? 'Das wilde ' : 'Gegnerisches ') + monName(m); }
  eff(side, k) {
    const m = this.mon(side); let v = calcStats(m)[k] * STAGE(this.st[side][k]);
    if (k === 'spe' && m.status === 'starre') v *= 0.5;
    if (m.reso && k !== 'hp') v *= 1.3;
    return v;
  }

  // Hauptschleife einer Runde
  turn(action, foeAction) {
    if (this.over) return [];
    if (this.pvp) return this.pvpTurn(action, foeAction || { t: 'move', i: 0 });
    const ev = [];
    let playerMoves = null;
    this.resoUsed ||= {};
    // Resonanz-Form: einmal pro Kampf, wenn die Bindung stark genug ist
    if (action.t === 'move' && action.reso && !this.resoUsed.p && (this.p.friendship || 0) >= RESO_MIN) {
      this.resoUsed.p = true; this.p.reso = true;
      ev.push({ t: 'msg', text: `${monName(this.p)} spürt deine Gefühle …!` }, { t: 'reso', side: 'p' }, { t: 'msg', text: `${monName(this.p)} erreicht die Resonanz-Form!` });
    }
    // Bosse lassen ihre letzte Kreatur in Resonanz gehen
    if (this.trainer?.reso && !this.resoUsed.f && this.foeTeam.filter(m => m.hp > 0).length === 1 && this.f.hp > 0) {
      this.resoUsed.f = true; this.f.reso = true;
      ev.push({ t: 'msg', text: `${this.trainer.name} und ${monName(this.f)} sind ein Herz und eine Seele …!` }, { t: 'reso', side: 'f' }, { t: 'msg', text: `${this.label('f')} erreicht die Resonanz-Form!` });
    }
    if (action.t === 'run') {
      if (!this.wild) { ev.push({ t: 'msg', text: 'Aus einem Trainerkampf kannst du nicht fliehen!' }); return ev; }
      this.runTries++;
      if (SPECIES[this.f.sp].legendary) ev.push({ t: 'msg', text: 'Ein Bann aus Licht hält dich fest!' });
      else {
        const chance = 0.55 + 0.2 * this.runTries + (this.eff('p', 'spe') >= this.eff('f', 'spe') ? 0.3 : 0);
        if (this.rnd() < chance) { ev.push({ t: 'msg', text: 'Du bist entkommen!' }); return this.finish(ev, 'fled'); }
        ev.push({ t: 'msg', text: 'Flucht gescheitert!' });
      }
    } else if (action.t === 'switch') {
      ev.push({ t: 'recall', side: 'p', text: `${monName(this.p)}, zurück!` });
      delete this.p.reso; this.pi = action.i; this.st.p = freshStages(); this.participants.add(this.p.uid);
      ev.push({ t: 'send', side: 'p', mon: this.p, text: `Los, ${monName(this.p)}!` });
    } else if (action.t === 'item') {
      const m = this.team[action.target];
      if (action.cure) { m.status = null; ev.push({ t: 'msg', text: `${monName(m)} ist wieder ganz gesund.` }); }
      else {
        const amt = action.revive ? Math.floor(maxHp(m) * action.revive) : Math.min(maxHp(m) - m.hp, action.amount);
        m.hp = action.revive ? amt : m.hp + amt; delete m._fainted;
        ev.push({ t: 'msg', text: action.revive ? `${monName(m)} ist wieder kampfbereit!` : `${monName(m)} wurde um ${amt} KP geheilt.` });
        if (action.target === this.pi) ev.push({ t: 'hp', side: 'p', hp: m.hp, max: maxHp(m), heal: true });
      }
    } else if (action.t === 'catch') {
      const r = this.tryCatch(ev, action.bonus || 1, action);
      if (r) return ev;
    } else if (action.t === 'move') {
      playerMoves = action.i;
    }

    const foeMove = this.chooseFoeMove();
    if (playerMoves !== null) {
      const pFirst = this.eff('p', 'spe') > this.eff('f', 'spe') || (this.eff('p', 'spe') === this.eff('f', 'spe') && this.rnd() < 0.5);
      const order = pFirst ? [['p', playerMoves], ['f', foeMove]] : [['f', foeMove], ['p', playerMoves]];
      for (const [side, mi] of order) {
        if (this.over) break;
        if (this.mon(side).hp <= 0) continue;
        this.useMove(side, mi, ev);
        if (this.checkFaints(ev)) break;
      }
    } else {
      this.useMove('f', foeMove, ev);
      this.checkFaints(ev);
    }
    if (!this.over && !this.awaitSwitch) this.endOfTurn(ev);
    return ev;
  }

  chooseFoeMove() {
    const f = this.f; let best = 0, bestScore = -1;
    f.moves.forEach((mv, i) => {
      if (mv.pp <= 0) return;
      const M = MOVES[mv.id];
      let score = M.pow * effectiveness(M.type, SPECIES[this.p.sp].types) * (SPECIES[f.sp].types.includes(M.type) ? 1.5 : 1);
      if (M.effect?.heal) score = f.hp < maxHp(f) * 0.4 ? 120 : 5;
      if (M.cat === 'status' && !M.effect?.heal) score = this.rnd() < 0.25 ? 50 : 10;
      score *= 0.75 + this.rnd() * 0.5;
      if (score > bestScore) { bestScore = score; best = i; }
    });
    return best;
  }

  useMove(side, mi, ev) {
    const foe = side === 'p' ? 'f' : 'p';
    const user = this.mon(side), target = this.mon(foe);
    const slot = user.moves[mi];
    const M = MOVES[slot?.id] || MOVES.rempler;
    if (slot) slot.pp = Math.max(0, slot.pp - 1);
    if (user.status === 'starre' && this.rnd() < 0.25) {
      ev.push({ t: 'msg', text: `${this.label(side)} ist starr und kann sich nicht bewegen!` }); return;
    }
    ev.push({ t: 'msg', text: `${this.label(side)} setzt ${M.name} ein!` });
    const accMul = ACC_STAGE(this.st[side].acc);
    const hit = M.acc >= 100 && M.cat === 'status' && M.effect?.target !== 'foe' ? true : this.rnd() * 100 < M.acc * accMul;
    ev.push({ t: 'move', side, move: slot?.id || 'rempler', hit });
    if (!hit) { ev.push({ t: 'msg', text: 'Die Attacke ging daneben!' }); return; }

    if (M.cat !== 'status') {
      const phys = M.cat === 'phys';
      const A = this.eff(side, phys ? 'atk' : 'spa') * (phys && user.status === 'brand' ? 0.5 : 1);
      const D = this.eff(foe, phys ? 'def' : 'spd');
      const types = SPECIES[target.sp].types;
      const e = effectiveness(M.type, types);
      const stab = SPECIES[user.sp].types.includes(M.type) ? 1.5 : 1;
      const crit = this.rnd() < 1 / 16;
      let dmg = Math.floor((((2 * user.lvl) / 5 + 2) * M.pow * (A / D)) / 50 + 2);
      dmg = Math.max(e === 0 ? 0 : 1, Math.floor(dmg * stab * e * (crit ? 1.5 : 1) * (user.reso && stab > 1 ? 1.2 : 1) * (0.85 + this.rnd() * 0.15)));
      target.hp = Math.max(0, target.hp - dmg);
      ev.push({ t: 'hp', side: foe, hp: target.hp, max: maxHp(target), eff: e, crit, type: M.type });
      if (crit && dmg > 0) ev.push({ t: 'msg', text: 'Ein Volltreffer!' });
      if (e === 0) ev.push({ t: 'msg', text: `Es hat keine Wirkung auf ${this.label(foe)}…` });
      else if (e > 1) ev.push({ t: 'msg', text: 'Das ist sehr effektiv!' });
      else if (e < 1) ev.push({ t: 'msg', text: 'Das ist nicht sehr effektiv…' });
    }
    const fx = M.effect;
    if (!fx) return;
    if (fx.heal) {
      const amt = Math.min(maxHp(user) - user.hp, Math.floor(maxHp(user) * fx.heal));
      user.hp += amt;
      ev.push({ t: 'hp', side, hp: user.hp, max: maxHp(user), heal: true });
      ev.push({ t: 'msg', text: amt > 0 ? `${this.label(side)} regeneriert Kraft.` : 'Doch die KP sind bereits voll.' });
    }
    if (fx.stat) {
      const tgtSide = fx.target === 'self' ? side : foe;
      const cur = this.st[tgtSide][fx.stat];
      const nv = Math.max(-6, Math.min(6, cur + fx.stages));
      if (nv === cur) ev.push({ t: 'msg', text: 'Es hatte keinen Effekt.' });
      else {
        this.st[tgtSide][fx.stat] = nv;
        ev.push({ t: 'stat', side: tgtSide, up: fx.stages > 0 });
        ev.push({ t: 'msg', text: `${STAT_NAME[fx.stat]} von ${this.label(tgtSide)} ${fx.stages > 0 ? 'steigt' : 'sinkt'}!` });
      }
    }
    if (fx.status && target.hp > 0 && !target.status && this.rnd() * 100 < fx.chance) {
      const immune = (fx.status === 'brand' && SPECIES[target.sp].types.includes('feuer')) ||
        (fx.status === 'gift' && SPECIES[target.sp].types.some(t => t === 'gift' || t === 'metall')) ||
        (fx.status === 'starre' && SPECIES[target.sp].types.includes('elektro'));
      if (!immune) {
        target.status = fx.status;
        ev.push({ t: 'status', side: foe, status: fx.status });
        ev.push({ t: 'msg', text: `${this.label(foe)} erleidet ${STATUS_NAME[fx.status]}!` });
      } else if (M.cat === 'status') ev.push({ t: 'msg', text: 'Es hatte keinen Effekt.' });
    } else if (fx.status && M.cat === 'status' && target.status) ev.push({ t: 'msg', text: 'Es hatte keinen Effekt.' });
  }

  endOfTurn(ev) {
    for (const side of ['p', 'f']) {
      const m = this.mon(side);
      if (m.hp > 0 && (m.status === 'brand' || m.status === 'gift')) {
        const d = Math.max(1, Math.floor(maxHp(m) / (m.status === 'gift' ? 8 : 16)));
        m.hp = Math.max(0, m.hp - d);
        ev.push({ t: 'msg', text: `${this.label(side)} leidet unter ${STATUS_NAME[m.status]}.` });
        ev.push({ t: 'hp', side, hp: m.hp, max: maxHp(m), type: m.status === 'gift' ? 'gift' : 'feuer', dot: true });
      }
    }
    this.checkFaints(ev);
  }

  // ---------------------------------------------------------- Spieler gegen Spieler (Server-autoritativ)
  pvpTurn(a, b) {
    const ev = [], acts = { p: a, f: b };
    for (const side of ['p', 'f']) if (acts[side].t === 'forfeit') {
      ev.push({ t: 'msg', text: `${this.names[side]} gibt auf!` });
      return this.finish(ev, side === 'p' ? 'lose' : 'win');
    }
    for (const side of ['p', 'f']) if (acts[side].t === 'switch') this.doSwitch(side, acts[side].i, ev);
    const movers = ['p', 'f'].filter(s => acts[s].t === 'move');
    if (movers.length === 2) {
      const sp = this.eff('p', 'spe'), sf = this.eff('f', 'spe');
      if (sf > sp || (sf === sp && this.rnd() < 0.5)) movers.reverse();
    }
    for (const side of movers) {
      if (this.over || this.awaitSwitch || this.awaitSwitchF) break;
      if (this.mon(side).hp <= 0) continue;
      this.useMove(side, acts[side].i, ev);
      if (this.checkFaints(ev)) break;
    }
    if (!this.over && !this.awaitSwitch && !this.awaitSwitchF) this.endOfTurn(ev);
    return ev;
  }
  doSwitch(side, i, ev) {
    const m = this.mon(side);
    ev.push({ t: 'recall', side, text: `${this.names[side]} ruft ${monName(m)} zurück!` }); delete m.reso;
    if (side === 'p') this.pi = i; else this.fi = i;
    this.st[side] = freshStages();
    ev.push({ t: 'send', side, mon: this.mon(side), text: `${this.names[side]} schickt ${monName(this.mon(side))} in den Kampf!` });
  }
  checkFaintsPvp(ev) {
    let any = false;
    for (const side of ['f', 'p']) {
      const m = this.mon(side);
      if (m.hp <= 0 && !m._fainted) { m._fainted = true; any = true; ev.push({ t: 'faint', side }); ev.push({ t: 'msg', text: `${this.label(side)} ist kampfunfähig!` }); }
    }
    if (!any) return false;
    const aliveP = this.team.some(m => m.hp > 0), aliveF = this.foeTeam.some(m => m.hp > 0);
    if (!aliveP || !aliveF) {
      const res = aliveP ? 'win' : aliveF ? 'lose' : 'draw';
      ev.push({ t: 'msg', text: res === 'draw' ? 'Unentschieden!' : `${this.names[res === 'win' ? 'p' : 'f']} gewinnt den Kampf!` });
      this.finish(ev, res); return true;
    }
    if (this.p.hp <= 0) { this.awaitSwitch = true; ev.push({ t: 'needSwitch', side: 'p' }); }
    if (this.f.hp <= 0) { this.awaitSwitchF = true; ev.push({ t: 'needSwitch', side: 'f' }); }
    return true;
  }

  checkFaints(ev) {
    if (this.pvp) return this.checkFaintsPvp(ev);
    let any = false;
    if (this.f.hp <= 0 && !this.f._fainted) {
      this.f._fainted = true; any = true;
      ev.push({ t: 'faint', side: 'f' });
      ev.push({ t: 'msg', text: `${this.label('f')} wurde besiegt!` });
      this.awardXp(ev);
      const next = this.foeTeam.findIndex(m => m.hp > 0);
      if (next < 0) return this.finish(ev, 'win'), true;
      this.fi = next; this.st.f = freshStages();
      ev.push({ t: 'send', side: 'f', mon: this.f, text: `${this.trainer?.name || 'Der Gegner'} schickt ${monName(this.f)} in den Kampf!` });
    }
    if (this.p.hp <= 0 && !this.over) {
      any = true;
      ev.push({ t: 'faint', side: 'p' });
      ev.push({ t: 'msg', text: `${monName(this.p)} ist kampfunfähig!` });
      if (this.team.some(m => m.hp > 0)) { this.awaitSwitch = true; ev.push({ t: 'needSwitch' }); }
      else { ev.push({ t: 'msg', text: 'Du hast keine kampffähigen Kreaturen mehr…' }); this.finish(ev, 'lose'); }
    }
    return any;
  }

  forcedSwitch(i, side = 'p') {
    if (this.pvp) {
      if (side === 'p') { this.awaitSwitch = false; this.pi = i; } else { this.awaitSwitchF = false; this.fi = i; }
      this.st[side] = freshStages();
      return [{ t: 'send', side, mon: this.mon(side), text: `${this.names[side]} schickt ${monName(this.mon(side))} in den Kampf!` }];
    }
    this.awaitSwitch = false; this.pi = i; this.st.p = freshStages(); this.participants.add(this.p.uid);
    return [{ t: 'send', side: 'p', mon: this.p, text: `Los, ${monName(this.p)}!` }];
  }

  awardXp(ev) {
    const f = this.f;
    const base = Math.floor((SPECIES[f.sp].xp * f.lvl) / 5 * (this.wild ? 1 : 1.5));
    const alive = this.team.filter(m => this.participants.has(m.uid) && m.hp > 0);
    for (const m of alive) {
      const amt = Math.max(1, Math.floor(base / alive.length * xpBonus(m)));
      ev.push({ t: 'msg', text: `${monName(m)} erhält ${xpBonus(m) > 1 ? 'satte ' : ''}${amt} EP!` });
      const res = giveXp(m, amt);
      ev.push({ t: 'xp', uid: m.uid });
      for (const r of res) {
        if (r.t === 'lvl') ev.push({ t: 'lvl', uid: m.uid, lvl: r.lvl, text: `${monName(m)} erreicht Level ${r.lvl}!` });
        if (r.t === 'learn') ev.push({ t: 'learn', uid: m.uid, id: r.id });
        if (r.t === 'evo' && !this.pendingEvos.some(p => p.uid === m.uid)) this.pendingEvos.push({ uid: m.uid, to: r.to });
      }
    }
    this.participants = new Set([this.p.uid]);
  }

  tryCatch(ev, bonus, act = {}) {
    const f = this.f;
    ev.push({ t: 'msg', text: `Du wirfst einen ${act.name || 'Bindball'}!` });
    if (!this.canCatch) { ev.push({ t: 'msg', text: 'Diese Kreatur lässt sich nicht binden!' }); return false; }
    const max = maxHp(f);
    const statusB = f.status ? 1.5 : 1;
    const a = ((3 * max - 2 * f.hp) * SPECIES[f.sp].catchRate * bonus * statusB) / (3 * max);
    const p = Math.min(1, a / 255);
    const shakeP = Math.pow(p, 0.25);
    let shakes = 0, ok;
    // Kritischer Fang (perfekter Wurf): nur eine einzige Prüfung, der Kristall wackelt nur einmal
    if (act.crit) { ok = this.rnd() < Math.min(1, shakeP * 1.15); shakes = ok ? 1 : 0; }
    else { while (shakes < 4 && this.rnd() < shakeP) shakes++; ok = shakes >= 4; }
    ev.push({ t: 'catch', shakes: Math.min(3, shakes), ok, crit: !!act.crit, col: act.col });
    if (ok) {
      ev.push({ t: 'msg', text: `Super! ${SPECIES[f.sp].name} wurde gebunden!` });
      this.caught = f;
      this.finish(ev, 'caught');
      return true;
    }
    ev.push({ t: 'msg', text: ['Oh nein! Es hat sich befreit!', 'Fast! Es ist wieder frei!', 'Argh! Beinahe!'][Math.min(2, shakes)] });
    return false;
  }

  finish(ev, result) {
    this.over = true; this.result = result;
    ev.push({ t: 'end', result });
    return ev;
  }
}

export { TYPES };
export const RESO_MIN = 200;
