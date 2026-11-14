// MultiplayerManager: Koop für bis zu 4 Spieler über einen Raumcode (CAT-1234).
// Der GASTGEBER ist autoritativ: nur seine World rechnet Gegner, Schaden, Futter, Käufe, Wellen, Sieg.
// Mitspieler schicken nur Wünsche („setze Katze X auf Feld Y“), der Gastgeber prüft sie in World.cmd().
// Transport: WebRTC-Datenkanal über PeerJS (kein eigener Server nötig). Für Tests: BroadcastChannel (?net=local).
import { LocalSession } from '../session.js';
import { CATS, CAT_IDS } from '../data/cats.js';
import { DOGS, DOG_IDS } from '../data/dogs.js';
import { MAP_BY_ID } from '../data/maps.js';
import { POWERUPS, RANK, RESEARCH } from '../data/meta.js';
import { buildMap } from '../sim/maps.js';
import { computeStats, NO_BONUS } from '../sim/upgrades.js';
import { BALANCE } from '../config.js';

export const MAX_PLAYERS = 4;
export const makeCode = () => 'CAT-' + Math.floor(1000 + Math.random() * 9000);
export const cleanCode = s => { const d = String(s || '').replace(/\D/g, '').slice(0, 4); return d.length === 4 ? 'CAT-' + d : null; };

// ---------------------------------------------------------------- Transporte
// Gemeinsame Schnittstelle: host(code), join(code), send(to|null, msg), onMsg(from, msg), onJoin(id), onLeave(id), close()
class LocalTransport {   // gleiche Maschine/Browser – für automatische Tests
  constructor() { this.id = 'c' + Math.random().toString(36).slice(2, 8); }
  open(code, asHost) {
    this.isHost = asHost; this.code = code; if (asHost) this.id = 'host';
    this.ch = new BroadcastChannel('ctd-' + code);
    let ready = null;
    this.ch.onmessage = e => {
      const m = e.data; if (m.to && m.to !== this.id) return; if (m.from === this.id) return;
      if (m.sys === 'join') { if (this.isHost) { this.ch.postMessage({ from: 'host', to: m.from, sys: 'hostHere' }); this.onJoin && this.onJoin(m.from); } return; }
      if (m.sys === 'leave') { if (this.isHost || m.from === 'host') this.onLeave && this.onLeave(m.from); return; }
      if (m.sys === 'hostHere') { ready && ready(); ready = null; return; }
      if (!this.isHost && m.from !== 'host') return;
      this.onMsg && this.onMsg(m.from, m.msg);
    };
    if (asHost) return Promise.resolve();
    return new Promise((res, rej) => {
      ready = res; this.ch.postMessage({ from: this.id, to: 'host', sys: 'join' });
      setTimeout(() => { if (ready) { ready = null; rej(new Error('timeout')); } }, 1500);
    });
  }
  dial() { if (!this.ch) return this.open(this.code, false); return new Promise((res, rej) => { this.ch.postMessage({ from: this.id, to: 'host', sys: 'join' }); setTimeout(res, 200); }); }
  host(code) { return this.open(code, true); }
  join(code) { return this.open(code, false); }
  send(to, msg) { this.ch && this.ch.postMessage({ from: this.id, to: this.isHost ? to : 'host', msg }); }
  close() { if (this.ch) { this.ch.postMessage({ from: this.id, sys: 'leave' }); this.ch.close(); this.ch = null; } }
}

class PeerTransport {    // echtes Internet: WebRTC über den öffentlichen PeerJS-Vermittler
  constructor() { this.conns = new Map(); }
  lib() {
    if (window.Peer) return Promise.resolve();
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'lib/peerjs.min.js'; s.onload = res; s.onerror = () => rej(new Error('lib')); document.head.appendChild(s); });
  }
  wire(conn) {
    conn.on('data', d => this.onMsg && this.onMsg(conn.peer, d));
    conn.on('close', () => { this.conns.delete(conn.peer); this.onLeave && this.onLeave(conn.peer); });
    conn.on('error', () => {});
  }
  async host(code) {
    await this.lib(); this.isHost = true;
    return new Promise((res, rej) => {
      const p = this.peer = new window.Peer('ctd-' + code.toLowerCase());
      const to = setTimeout(() => rej(new Error('timeout')), 12000);      // Vermittler nicht erreichbar
      p.on('open', () => { clearTimeout(to); res(); });
      p.on('error', e => { clearTimeout(to); rej(e); });
      p.on('connection', conn => { conn.on('open', () => { this.conns.set(conn.peer, conn); this.wire(conn); this.onJoin && this.onJoin(conn.peer); }); });
      p.on('disconnected', () => { try { p.reconnect(); } catch { } });
    });
  }
  async join(code) {
    await this.lib(); this.isHost = false; this.code = code;
    return new Promise((res, rej) => {
      const p = this.peer = new window.Peer();
      const to = setTimeout(() => rej(new Error('timeout')), 12000);
      p.on('error', e => { clearTimeout(to); rej(e); });
      p.on('open', () => this.dial().then(() => { clearTimeout(to); res(); }, e => { clearTimeout(to); rej(e); }));
    });
  }
  dial() {
    return new Promise((res, rej) => {
      const conn = this.peer.connect('ctd-' + this.code.toLowerCase(), { reliable: true });
      const to = setTimeout(() => rej(new Error('timeout')), 9000);
      conn.on('open', () => { clearTimeout(to); this.conns.set('host', conn); this.wire(conn); this.hostConn = conn; res(); });
      conn.on('error', e => { clearTimeout(to); rej(e); });
    });
  }
  send(to, msg) {
    if (!this.isHost) { if (this.hostConn && this.hostConn.open) this.hostConn.send(msg); return; }
    if (to) { const c = this.conns.get(to); if (c && c.open) c.send(msg); } else for (const c of this.conns.values()) if (c.open) c.send(msg);
  }
  close() { try { this.peer && this.peer.destroy(); } catch { } this.conns.clear(); }
}
export const makeTransport = () => (typeof location !== 'undefined' && /net=local/.test(location.search)) ? new LocalTransport() : new PeerTransport();

// ---------------------------------------------------------------- Sicherheit: Angaben der Mitspieler begrenzen
// Mitspieler melden ihre Akademie-Boni selbst. Der Gastgeber kappt sie auf das, was im Spiel maximal möglich ist.
export function sanitizeSetup(p) {
  const num = (v, max) => Math.max(0, Math.min(max, +v || 0)), b = p && p.bonus || {}, R = RESEARCH;
  const cap = id => R[id].max * R[id].eff, rank = {};
  for (const id of CAT_IDS) rank[id] = Math.round(num(b.rank && b.rank[id], RANK.max));
  const loadout = (Array.isArray(p && p.loadout) ? p.loadout : []).filter((c, i, a) => CATS[c] && a.indexOf(c) === i).slice(0, BALANCE.maxLoadout + R.squad.max);
  const powers = {};
  for (const id in (p && p.powers) || {}) if (POWERUPS[id] && Object.keys(powers).length < BALANCE.powerSlots + 1) powers[id] = Math.round(num(p.powers[id], 3));
  return {
    id: String(p && p.id || '').slice(0, 16), name: String(p && p.name || 'Katze').replace(/[<>&]/g, '').slice(0, 14),
    loadout: loadout.length ? loadout : ['scout'], powers,
    bonus: { dmg: num(b.dmg, cap('claws')), rate: num(b.rate, cap('paws')), range: num(b.range, cap('eyes')), special: num(b.special, cap('special')), support: num(b.support, cap('team')), veteran: num(b.veteran, cap('veteran')), startFish: num(b.startFish, cap('capital')), lives: num(b.lives, cap('walls')), cooldown: num(b.cooldown, cap('cool')), rank }
  };
}

// ---------------------------------------------------------------- Zustand packen (Gastgeber → Mitspieler)
const r2 = v => Math.round(v * 100) / 100;
export function packState(W) {
  const E = W.enemies, T = W.towers;
  return {
    w: W.wave, ph: W.phase, l: W.lives, ml: W.maxLives, sp: W.waves.spawning ? 1 : 0, auto: W.auto ? 1 : 0,
    fx: [r2(W.fx.catnip), r2(W.fx.gold), r2(W.fx.double), W.fx.catnipV],
    P: W.players.map(p => [Math.floor(p.fish), p.discount, p.powers, p.powerCd, p.connected ? 1 : 0]),
    T: T.list.map(t => [t.id, CAT_IDS.indexOf(t.cat), t.tx, t.ty, t.owner, t.tiers[0], t.tiers[1], t.tiers[2], r2(t.angle), r2(Math.max(0, t.stunT)), r2(t.range), t.mode, t.spent, t.kills, r2(t.rampN), t.beamT > 0 ? t.beam.map(r2) : 0, r2(Math.max(0, t.fireT)), Math.round(t.dmgDone), t.buff.dmg > 0 ? 1 : t.buff.rate > 0 ? 2 : 0]),
    E: E.list.map(e => [e.id, DOG_IDS.indexOf(e.type), r2(e.x), r2(e.y), e.dx < -.1 ? -1 : e.dx > .1 ? 1 : 0, Math.round(e.hp), e.maxHp, Math.round(e.shield), e.maxShield,
      (e.slowV > 0 ? 1 : 0) | (e.burnT > 0 ? 2 : 0) | (e.stunT > 0 ? 4 : 0) | (e.under ? 8 : 0) | (E.stealthNow(e) ? 16 : 0) | (e.phaseT > 0 ? 32 : 0) | (e.vulnT > 0 ? 64 : 0) | (e.shredT > 0 ? 128 : 0) | (e.hasteV > 0 ? 256 : 0) | (e.healT > 0 ? 512 : 0) | (e.mini ? 1024 : 0)]),
    M: T.minions.map(m => [m.id, m.kind === 'ecat' ? 1 : 0, r2(m.x), r2(m.y), r2(m.angle), r2(m.life), m.max]),
    H: T.holes.map(h => [r2(h.x), r2(h.y), r2(h.t), h.max, h.r])
  };
}

// Ansicht eines Mitspielers: sieht aus wie eine World (für Renderer und HUD), rechnet aber nichts Wichtiges selbst.
export class NetView {
  constructor(start) {
    this.mapDef = MAP_BY_ID[start.mapId]; this.map = buildMap(this.mapDef);
    this.diff = start.diff; this.mode = start.mode; this.wavesTotal = start.mode === 'endless' ? Infinity : BALANCE.difficulty[start.diff].waves;
    this.players = start.players.map((p, i) => ({ i, id: p.id, name: p.name, loadout: p.loadout, bonus: Object.assign({}, NO_BONUS, p.bonus), powers: Object.assign({}, p.powers), powerCd: {}, fish: 0, discount: 0, connected: true, stats: {} }));
    this.wave = 0; this.phase = 'build'; this.lives = this.maxLives = 20; this.fx = { catnip: 0, catnipV: 0, gold: 0, double: 0 }; this.result = null; this.auto = false;
    this.events = []; this.spawning = false; this.time = 0;
    const self = this;
    this.towers = { list: [], minions: [], holes: [], proj: [], byId(id) { return this.list.find(t => t.id === id); }, at(x, y) { return this.list.find(t => t.tx === x && t.ty === y); } };
    this.enemies = { list: [], stealthNow: e => e.st };
    this.waves = { get spawning() { return self.spawning; }, preview: () => null };
    this.tmap = new Map(); this.emap = new Map(); this.mmap = new Map();
  }
  get over() { return this.phase === 'won' || this.phase === 'lost'; }
  apply(s) {
    this.wave = s.w; this.phase = s.ph; this.lives = s.l; this.maxLives = s.ml; this.spawning = !!s.sp; this.auto = !!s.auto;
    this.fx.catnip = s.fx[0]; this.fx.gold = s.fx[1]; this.fx.double = s.fx[2]; this.fx.catnipV = s.fx[3];
    s.P.forEach((p, i) => { const P = this.players[i]; if (!P) return; P.fish = p[0]; P.discount = p[1]; P.powers = p[2]; P.powerCd = p[3]; P.connected = !!p[4]; });
    // Katzen
    const tl = [], seenT = new Map();
    for (const a of s.T) {
      let t = this.tmap.get(a[0]);
      const cat = CAT_IDS[a[1]];
      if (!t) t = { id: a[0], cat, def: CATS[cat], tx: a[2], ty: a[3], x: a[2] + .5, y: a[3] + .5, owner: a[4], tiers: [0, 0, 0], beam: [], buff: { dmg: 0, rate: 0 }, tile: this.map.bonus[a[3] * 12 + a[2]], stats: null, tk: '' };
      const tk = '' + a[5] + a[6] + a[7];
      if (t.tk !== tk) { t.tiers = [a[5], a[6], a[7]]; t.tk = tk; t.stats = computeStats(t.def, t.tiers, this.players[t.owner] ? this.players[t.owner].bonus : NO_BONUS); }
      t.angle = a[8]; t.stunT = a[9]; t.range = a[10]; t.mode = a[11]; t.spent = a[12]; t.kills = a[13]; t.rampN = a[14];
      if (a[15]) { t.beam = a[15]; t.beamT = .25; } else { t.beam = []; t.beamT = 0; }
      t.fireT = Math.max(t.fireT || 0, a[16]); t.dmgDone = a[17]; t.buff.dmg = a[18] === 1 ? 1 : 0; t.buff.rate = a[18] === 2 ? 1 : 0;
      tl.push(t); seenT.set(t.id, t);
    }
    this.towers.list = tl; this.tmap = seenT;
    // Hunde (Positionen werden weich nachgeführt)
    const el = [], seenE = new Map();
    for (const a of s.E) {
      let e = this.emap.get(a[0]);
      const type = DOG_IDS[a[1]];
      if (!e) e = { id: a[0], type, def: DOGS[type], x: a[2], y: a[3], t: 0, hitT: 0, boss: !!DOGS[type].boss, dx: 1, dy: 0 };
      e.nx = a[2]; e.ny = a[3]; if (a[4]) e.dx = a[4];
      if (a[5] < e.hp - .5) e.hitT = .12;
      e.hp = a[5]; e.maxHp = a[6]; e.shield = a[7]; e.maxShield = a[8];
      const f = a[9];
      e.slowV = f & 1; e.burnT = f & 2 ? 1 : 0; e.stunT = f & 4 ? 1 : 0; e.under = !!(f & 8); e.st = !!(f & 16); e.phaseT = f & 32 ? 1 : 0; e.vulnT = f & 64 ? 1 : 0; e.shredT = f & 128 ? 1 : 0; e.hasteV = f & 256 ? 1 : 0; e.healT = f & 512 ? 1 : 0; e.mini = !!(f & 1024);
      el.push(e); seenE.set(e.id, e);
    }
    this.enemies.list = el; this.emap = seenE;
    const ml = [], seenM = new Map();
    for (const a of s.M) { let m = this.mmap.get(a[0]) || { id: a[0], kind: a[1] ? 'ecat' : 'turret', fireT: 0 }; m.x = a[2]; m.y = a[3]; m.angle = a[4]; m.life = a[5]; m.max = a[6]; ml.push(m); seenM.set(m.id, m); }
    this.towers.minions = ml; this.mmap = seenM;
    this.towers.holes = s.H.map(a => ({ x: a[0], y: a[1], t: a[2], max: a[3], r: a[4] }));
  }
  // Ereignisse vom Gastgeber: Schüsse werden hier zu rein optischen Geschossen
  pushEvents(list) {
    for (const ev of list) {
      this.events.push(ev);
      if (ev.e === 'shot' && !ev.inst) {
        const d = Math.hypot(ev.tx - ev.x, ev.ty - ev.y) || .01, sp = ev.k === 'bomb' || ev.k === 'flask' ? 8 : ev.k === 'launcher' ? 10 : 16;
        this.towers.proj.push({ x: ev.x, y: ev.y, x0: ev.x, y0: ev.y, tx: ev.tx, ty: ev.ty, kind: ev.k, a: Math.atan2(ev.ty - ev.y, ev.tx - ev.x), arc: ev.k === 'bomb' || ev.k === 'flask', life: d / sp, sp });
      }
    }
  }
  step(dt) {
    this.time += dt;
    const k = Math.min(1, dt * 14);
    for (const e of this.enemies.list) { e.x += (e.nx - e.x) * k; e.y += (e.ny - e.y) * k; e.t += dt; if (e.hitT > 0) e.hitT -= dt; }
    for (const t of this.towers.list) { if (t.fireT > 0) t.fireT -= dt; if (t.beamT > 0) t.beamT -= dt; }
    const P = this.towers.proj; let n = 0;
    for (const p of P) { p.life -= dt; if (p.life <= 0) continue; p.x += Math.cos(p.a) * p.sp * dt; p.y += Math.sin(p.a) * p.sp * dt; P[n++] = p; }
    P.length = n;
    for (const pl of this.players) for (const id in pl.powerCd) if (pl.powerCd[id] > 0) pl.powerCd[id] -= dt;
  }
  drain() { const e = this.events; this.events = []; return e; }
}

// ---------------------------------------------------------------- Gastgeber-Sitzung
export class HostSession extends LocalSession {
  // peers: [{ peer, pi }] – wer (Verbindungs-ID) steuert welchen Spieler
  constructor(opts, net, peers) {
    super(opts);
    this.net = net; this.peers = new Map(peers.map(p => [p.peer, p.pi])); this.online = true; this.snapT = 0; this.buf = [];
    this.start = { t: 'start', mapId: opts.mapId, diff: opts.diff, mode: opts.mode || 'campaign', players: opts.players };
    net.onMsg = (from, m) => this.onMsg(from, m);
    net.onLeave = from => { const pi = this.peers.get(from); if (pi !== undefined) { this.world.players[pi].connected = false; this.peers.delete(from); } };
    for (const [peer, pi] of this.peers) net.send(peer, Object.assign({ me: pi }, this.start));
  }
  onMsg(from, m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'cmd') {
      const pi = this.peers.get(from);                       // Identität kommt von der Verbindung, nie aus der Nachricht
      if (pi === undefined || !m.c || m.c.t === 'auto') return;
      const r = this.world.cmd(pi, m.c);
      if (r.err) this.net.send(from, { t: 'no', err: r.err, c: m.c.t });
    } else if (m.t === 'hello') {                            // Wiedereinstieg: gleiche Spieler-ID wie vorher
      const pi = this.world.players.findIndex(p => p.id === String(m.id) && !p.connected);
      if (pi < 0) return this.net.send(from, { t: 'denied', why: 'running' });
      this.peers.set(from, pi); this.world.players[pi].connected = true;
      this.net.send(from, Object.assign({ me: pi, resume: 1 }, this.start));
    }
  }
  step(dt) {
    super.step(dt);
    if ((this.snapT += dt) >= 0.1) {
      this.snapT = 0;
      const s = packState(this.world); s.t = 'snap'; s.ev = this.buf.splice(0, 80); this.buf.length = 0;
      this.net.send(null, s);
      if (this.world.result && !this.sentEnd) { this.sentEnd = true; this.net.send(null, { t: 'end', result: this.world.result }); }
    }
  }
  drain() { const e = this.world.drain(); for (const ev of e) if (this.buf.length < 200) this.buf.push(ev); return e; }
  close() { this.net.send(null, { t: 'bye' }); setTimeout(() => this.net.close(), 200); }
}

// ---------------------------------------------------------------- Mitspieler-Sitzung
export class ClientSession {
  constructor(start, net, setup) {
    this.net = net; this.view = new NetView(start); this.me = start.me; this.speed = 1; this.paused = false; this.isHost = false; this.online = true;
    this.result = null; this.lost = false; this.setup = setup; this.lastSnap = performance.now(); this.onNo = null;
    net.onMsg = (from, m) => this.onMsg(m);
    net.onLeave = () => this.reconnect();
  }
  onMsg(m) {
    if (!m) return;
    if (m.t === 'snap') { this.lastSnap = performance.now(); this.lost = false; this.view.apply(m); if (m.ev) this.view.pushEvents(m.ev); }
    else if (m.t === 'end') { this.result = m.result; this.view.result = m.result; }
    else if (m.t === 'no') this.onNo && this.onNo(m.err);
    else if (m.t === 'bye') { this.lost = true; this.gone = true; }
  }
  cmd(c) { this.net.send(null, { t: 'cmd', c }); return { ok: true, sent: true }; }
  step(dt) {
    this.view.step(dt);
    if (!this.lost && !this.result && performance.now() - this.lastSnap > 4000) this.reconnect();
  }
  // Verbindung weg: bis zu 60 s lang immer wieder beim Gastgeber anklopfen
  reconnect() {
    if (this.lost || this.result) return;
    this.lost = true; const t0 = performance.now();
    const again = () => {
      if (!this.lost || this.gone || this.closed || performance.now() - t0 > 60000) { if (this.lost) this.gone = true; return; }
      const dial = this.net.dial ? this.net.dial() : Promise.resolve();
      dial.then(() => { this.net.send(null, { t: 'hello', id: this.setup.id }); setTimeout(() => { if (this.lost) again(); }, 3000); }, () => setTimeout(again, 3000));
    };
    again();
  }
  drain() { return this.view.drain(); }
  close() { this.closed = true; this.net.close(); }
}
