// Doppelkampf-Logik (2 gegen 2, oder 2 gegen 1 Boss). Rein logisch, läuft im Browser und auf dem Server.
// Plätze: p0, p1 (eigene Seite, im Raid bis p3), f0, f1 (Gegner). Mehrere Plätze dürfen sich ein Team teilen (Einzelspieler-Doppelkampf).
import { SPECIES } from '../data/creatures.js';
import { MOVES } from '../data/moves.js';
import { effectiveness } from '../data/types.js';
import { calcStats, maxHp, monName, giveXp, xpBonus } from '../data/mon.js';
import { STAGE, ACC_STAGE, STAT_NAME, STATUS_NAME, freshStages } from './battle.js';

export const SIDE = id => id[0];
export const SLOTS = ['p0', 'p1', 'p2', 'p3', 'f0', 'f1'];
export const FOES = id => (SIDE(id) === 'p' ? ['f0', 'f1'] : ['p0', 'p1', 'p2', 'p3']);
export const ALLY = id => id[0] + (id[1] === '0' ? '1' : '0');

export class DoubleBattle {
  // slots: { p0: { pool, owner, ai }, p1: {...}, f0: {...}, f1?: {...} }
  // xpMode: 'apply' (EP direkt geben) | 'log' (EP nur zählen, Clients wenden sie an)
  constructor({ slots, rnd = Math.random, xpMode = 'apply', trainerName = 'Gegner' }) {
    this.rnd = rnd; this.xpMode = xpMode; this.trainerName = trainerName;
    this.slots = {}; this.over = false; this.result = null; this.pendingEvos = []; this.xpLog = {}; this.need = [];
    for (const id of SLOTS) {
      const d = slots[id]; if (!d) continue;
      this.slots[id] = { ...d, i: -1, st: freshStages(), acts: d.acts || 1 };
      this.slots[id].i = this.nextFor(id);
    }
  }
  ids() { return Object.keys(this.slots); }
  mon(id) { const s = this.slots[id]; return s && s.i >= 0 ? s.pool[s.i] : null; }
  alive(id) { const m = this.mon(id); return !!m && m.hp > 0; }
  active(side) { return this.ids().filter(id => SIDE(id) === side && this.alive(id)); }
  // nächste kampffähige Kreatur im Team, die nicht schon auf einem anderen Platz steht
  nextFor(id) {
    const s = this.slots[id];
    const used = new Set(this.ids().filter(o => o !== id && this.slots[o].pool === s.pool && this.slots[o].i >= 0).map(o => this.slots[o].i));
    return s.pool.findIndex((m, k) => !m.egg && m.hp > 0 && !used.has(k));
  }
  canSwitchTo(id, k) {
    const s = this.slots[id], m = s.pool[k];
    if (!m || m.egg || m.hp <= 0 || k === s.i) return false;
    return !this.ids().some(o => o !== id && this.slots[o].pool === s.pool && this.slots[o].i === k);
  }
  label(id) { const m = this.mon(id); return SIDE(id) === 'f' ? `${monName(m)} (Gegner)` : `${monName(m)} (${this.slots[id].owner})`; }
  eff(id, k) {
    const m = this.mon(id); let v = calcStats(m)[k] * STAGE(this.slots[id].st[k]);
    if (k === 'spe' && m.status === 'starre') v *= 0.5;
    return v;
  }

  // ---------------------------------------------------------- KI
  aiAction(id) {
    const m = this.mon(id), foes = this.active(SIDE(id) === 'p' ? 'f' : 'p');
    let best = { t: 'move', i: 0, target: foes[0] }, bestScore = -1;
    m.moves.forEach((mv, i) => {
      if (mv.pp <= 0) return;
      const M = MOVES[mv.id];
      for (const tg of foes) {
        let score = M.pow * effectiveness(M.type, SPECIES[this.mon(tg).sp].types) * (SPECIES[m.sp].types.includes(M.type) ? 1.5 : 1);
        if (M.effect?.heal) score = m.hp < maxHp(m) * 0.4 ? 120 : 5;
        if (M.cat === 'status' && !M.effect?.heal) score = this.rnd() < 0.25 ? 50 : 10;
        score *= 0.7 + this.rnd() * 0.6;
        if (score > bestScore) { bestScore = score; best = { t: 'move', i, target: tg }; }
      }
    });
    return best;
  }

  // ---------------------------------------------------------- Runde
  // actions: { p0: {t:'move', i, target} | {t:'switch', i} | {t:'item', target, amount}, ... } – fehlende → KI
  turn(actions = {}) {
    if (this.over) return [];
    const ev = [], list = [];
    for (const id of this.ids()) {
      if (!this.alive(id)) continue;
      const s = this.slots[id];
      for (let n = 0; n < s.acts; n++) list.push({ id, a: (!s.ai && actions[id]) || this.aiAction(id), n });
    }
    for (const x of list.filter(x => x.a.t === 'forfeit')) { ev.push({ t: 'msg', text: `${this.slots[x.id].owner} gibt auf!` }); return this.finish(ev, 'lose'); }
    for (const x of list.filter(x => x.a.t === 'switch')) if (this.canSwitchTo(x.id, x.a.i)) this.doSwitch(x.id, x.a.i, ev);
    for (const x of list.filter(x => x.a.t === 'item')) {
      const s = this.slots[x.id], m = s.pool[x.a.target]; if (!m || (m.hp <= 0 && !x.a.revive)) continue;
      if (x.a.cure) { m.status = null; ev.push({ t: 'msg', text: `${monName(m)} ist wieder ganz gesund.` }); continue; }
      const amt = x.a.revive ? Math.floor(maxHp(m) * x.a.revive) : Math.min(maxHp(m) - m.hp, x.a.amount);
      m.hp = x.a.revive ? amt : m.hp + amt; delete m._fainted;
      ev.push({ t: 'msg', text: x.a.revive ? `${monName(m)} ist wieder kampfbereit!` : `${monName(m)} wurde um ${amt} KP geheilt.` });
      const on = this.ids().find(o => this.slots[o].pool === s.pool && this.slots[o].i === x.a.target);
      if (on) ev.push({ t: 'hp', slot: on, hp: m.hp, max: maxHp(m), heal: true });
    }
    const movers = list.filter(x => x.a.t === 'move').map(x => ({ ...x, spe: this.eff(x.id, 'spe') + this.rnd() * 0.01 - x.n * 1000 }));
    movers.sort((a, b) => b.spe - a.spe);
    for (const x of movers) {
      if (this.over) break;
      if (!this.alive(x.id)) continue;
      this.useMove(x.id, x.a, ev);
      this.checkFaints(ev);
    }
    if (!this.over) this.endOfTurn(ev);
    if (!this.over) this.refill(ev);
    return ev;
  }

  doSwitch(id, i, ev) {
    const s = this.slots[id];
    ev.push({ t: 'recall', slot: id, text: `${s.owner}: ${monName(this.mon(id))}, zurück!` });
    s.i = i; s.st = freshStages();
    ev.push({ t: 'send', slot: id, mon: this.mon(id), text: `${s.owner} schickt ${monName(this.mon(id))}!` });
  }

  resolveTarget(id, a, M) {
    const self = M.cat === 'status' && (M.effect?.target === 'self' || M.effect?.heal);
    if (self) return id;
    let tg = a.target;
    if (!tg || SIDE(tg) === SIDE(id) || !this.alive(tg)) tg = FOES(id).find(f => this.alive(f) && f === a.target) || FOES(id).find(f => this.alive(f));
    return tg;
  }

  useMove(id, a, ev) {
    const user = this.mon(id), slot = user.moves[a.i] || user.moves[0];
    const M = MOVES[slot?.id] || MOVES.rempler;
    const tg = this.resolveTarget(id, a, M); if (!tg) return;
    const target = this.mon(tg);
    if (slot) slot.pp = Math.max(0, slot.pp - 1);
    if (user.status === 'starre' && this.rnd() < 0.25) { ev.push({ t: 'msg', text: `${this.label(id)} ist starr und kann sich nicht bewegen!` }); return; }
    ev.push({ t: 'msg', text: `${this.label(id)} setzt ${M.name} ein!` });
    const hit = M.acc >= 100 && M.cat === 'status' && M.effect?.target !== 'foe' ? true : this.rnd() * 100 < M.acc * ACC_STAGE(this.slots[id].st.acc);
    ev.push({ t: 'move', slot: id, target: tg, move: slot?.id || 'rempler', hit });
    if (!hit) { ev.push({ t: 'msg', text: 'Die Attacke ging daneben!' }); return; }
    if (M.cat !== 'status' && tg !== id) {
      const phys = M.cat === 'phys';
      const A = this.eff(id, phys ? 'atk' : 'spa') * (phys && user.status === 'brand' ? 0.5 : 1), D = this.eff(tg, phys ? 'def' : 'spd');
      const e = effectiveness(M.type, SPECIES[target.sp].types), stab = SPECIES[user.sp].types.includes(M.type) ? 1.5 : 1, crit = this.rnd() < 1 / 16;
      let dmg = Math.floor((((2 * user.lvl) / 5 + 2) * M.pow * (A / D)) / 50 + 2);
      dmg = Math.max(e === 0 ? 0 : 1, Math.floor(dmg * stab * e * (crit ? 1.5 : 1) * (0.85 + this.rnd() * 0.15)));
      target.hp = Math.max(0, target.hp - dmg);
      ev.push({ t: 'hp', slot: tg, hp: target.hp, max: maxHp(target), eff: e, crit, type: M.type });
      if (crit && dmg > 0) ev.push({ t: 'msg', text: 'Ein Volltreffer!' });
      if (e === 0) ev.push({ t: 'msg', text: `Es hat keine Wirkung auf ${this.label(tg)}…` });
      else if (e > 1) ev.push({ t: 'msg', text: 'Das ist sehr effektiv!' });
      else if (e < 1) ev.push({ t: 'msg', text: 'Das ist nicht sehr effektiv…' });
    }
    const fx = M.effect; if (!fx) return;
    if (fx.heal) {
      const amt = Math.min(maxHp(user) - user.hp, Math.floor(maxHp(user) * fx.heal)); user.hp += amt;
      ev.push({ t: 'hp', slot: id, hp: user.hp, max: maxHp(user), heal: true });
      ev.push({ t: 'msg', text: amt > 0 ? `${this.label(id)} regeneriert Kraft.` : 'Doch die KP sind bereits voll.' });
    }
    if (fx.stat) {
      const ts = fx.target === 'self' ? id : tg, st = this.slots[ts].st, cur = st[fx.stat], nv = Math.max(-6, Math.min(6, cur + fx.stages));
      if (nv === cur) ev.push({ t: 'msg', text: 'Es hatte keinen Effekt.' });
      else { st[fx.stat] = nv; ev.push({ t: 'stat', slot: ts, up: fx.stages > 0 }); ev.push({ t: 'msg', text: `${STAT_NAME[fx.stat]} von ${this.label(ts)} ${fx.stages > 0 ? 'steigt' : 'sinkt'}!` }); }
    }
    if (fx.status && target.hp > 0 && !target.status && tg !== id && this.rnd() * 100 < fx.chance) {
      const T = SPECIES[target.sp].types;
      const immune = (fx.status === 'brand' && T.includes('feuer')) || (fx.status === 'gift' && T.some(t => t === 'gift' || t === 'metall')) || (fx.status === 'starre' && T.includes('elektro'));
      if (!immune) { target.status = fx.status; ev.push({ t: 'status', slot: tg, status: fx.status }); ev.push({ t: 'msg', text: `${this.label(tg)} erleidet ${STATUS_NAME[fx.status]}!` }); }
      else if (M.cat === 'status') ev.push({ t: 'msg', text: 'Es hatte keinen Effekt.' });
    }
  }

  endOfTurn(ev) {
    for (const id of this.ids()) {
      const m = this.mon(id);
      if (m && m.hp > 0 && (m.status === 'brand' || m.status === 'gift')) {
        m.hp = Math.max(0, m.hp - Math.max(1, Math.floor(maxHp(m) / (m.status === 'gift' ? 8 : 16))));
        ev.push({ t: 'msg', text: `${this.label(id)} leidet unter ${STATUS_NAME[m.status]}.` });
        ev.push({ t: 'hp', slot: id, hp: m.hp, max: maxHp(m), type: m.status === 'gift' ? 'gift' : 'feuer', dot: true });
      }
    }
    this.checkFaints(ev);
  }

  checkFaints(ev) {
    for (const id of this.ids()) {
      const m = this.mon(id);
      if (!m || m.hp > 0 || m._fainted) continue;
      m._fainted = true;
      ev.push({ t: 'faint', slot: id });
      ev.push({ t: 'msg', text: `${this.label(id)} ist kampfunfähig!` });
      if (SIDE(id) === 'f') this.awardXp(m, ev);
    }
    const pAlive = this.ids().some(id => SIDE(id) === 'p' && (this.alive(id) || this.nextFor(id) >= 0));
    const fAlive = this.ids().some(id => SIDE(id) === 'f' && (this.alive(id) || this.nextFor(id) >= 0));
    if (!fAlive) return this.finish(ev, 'win');
    if (!pAlive) { ev.push({ t: 'msg', text: 'Keine kampffähigen Kreaturen mehr…' }); return this.finish(ev, 'lose'); }
  }

  // Leere Plätze am Rundenende auffüllen: KI-Plätze sofort, Spieler-Plätze per Auswahl (this.need)
  refill(ev) {
    this.need = [];
    for (const id of this.ids()) {
      if (this.alive(id)) continue;
      const s = this.slots[id], k = this.nextFor(id);
      if (k < 0) { s.i = -1; continue; }
      if (s.ai) { s.i = k; s.st = freshStages(); ev.push({ t: 'send', slot: id, mon: this.mon(id), text: `${s.owner} schickt ${monName(this.mon(id))}!` }); }
      else this.need.push(id);
    }
    for (const id of this.need) ev.push({ t: 'needSwitch', slot: id });
  }
  forcedSwitch(id, k) {
    const ev = [];
    if (!this.need.includes(id)) return ev;
    if (!this.canSwitchTo(id, k)) k = this.nextFor(id);
    const s = this.slots[id]; s.i = k; s.st = freshStages();
    this.need = this.need.filter(x => x !== id);
    ev.push({ t: 'send', slot: id, mon: this.mon(id), text: `${s.owner} schickt ${monName(this.mon(id))}!` });
    return ev;
  }

  awardXp(f, ev) {
    const base = Math.floor((SPECIES[f.sp].xp * f.lvl) / 5 * 1.5 * (f.boss ? 3 : 1));
    for (const id of this.ids().filter(x => SIDE(x) === 'p')) {
      const m = this.alive(id) && this.mon(id); if (!m) continue;
      const amt = Math.max(1, Math.floor(base * 0.75 * xpBonus(m)));
      ev.push({ t: 'msg', text: `${monName(m)} erhält ${amt} EP!` });
      if (this.xpMode === 'log') { this.xpLog[m.uid] = (this.xpLog[m.uid] || 0) + amt; continue; }
      const res = giveXp(m, amt);
      ev.push({ t: 'xp', slot: id, uid: m.uid });
      for (const r of res) {
        if (r.t === 'lvl') ev.push({ t: 'lvl', slot: id, uid: m.uid, text: `${monName(m)} erreicht Level ${r.lvl}!` });
        if (r.t === 'learn') ev.push({ t: 'learn', uid: m.uid, id: r.id });
        if (r.t === 'evo' && !this.pendingEvos.some(p => p.uid === m.uid)) this.pendingEvos.push({ uid: m.uid, to: r.to });
      }
    }
  }

  finish(ev, result) { this.over = true; this.result = result; ev.push({ t: 'end', result }); return ev; }
}
