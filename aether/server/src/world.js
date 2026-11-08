// Persistente Welt: Karteninstanzen, autoritative Bewegung, Sichtbarkeit, Chat.
// Der Client schickt nur Absichten („ein Schritt nach links“); Position bestimmt ausschließlich der Server.
import { MAPS, walkable, warpAt } from '../../shared/maps.js';
import { DIRS, STEP_MIN_MS, STEP_BURST } from '../../shared/protocol.js';

export class Bucket {
  constructor(capacity, refillMs) { this.cap = capacity; this.ms = refillMs; this.tokens = capacity; this.t = Date.now(); }
  take(now = Date.now()) {
    this.tokens = Math.min(this.cap, this.tokens + (now - this.t) / this.ms);
    this.t = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}

export class World {
  constructor({ save, log = () => {} }) {
    this.save = save;           // (player) => void – schreibt Position in die DB
    this.log = log;
    this.players = new Map();   // charId → Player
    this.byName = new Map();    // lowercase name → Player
    this.maps = new Map(Object.keys(MAPS).map((k) => [k, new Set()]));
  }

  pub(p) { return { id: p.id, name: p.name, look: p.look, x: p.x, y: p.y, d: p.dir }; }

  sendMap(mapKey, msg, except = null) {
    const s = JSON.stringify(msg);
    for (const o of this.maps.get(mapKey) || []) if (o !== except) o.send(s);
  }

  join(char, send, close) {
    const old = this.players.get(char.id);
    if (old) { old.send(JSON.stringify({ t: 'err', code: 'replaced', msg: 'Anderswo angemeldet.' })); this.leave(old); old.close(); }
    let map = MAPS[char.map] ? char.map : 'funkenrast';
    let { x, y } = char;
    if (!walkable(MAPS[map], x, y)) ({ x, y } = MAPS[map].spawn); // beschädigte Position reparieren
    const p = {
      id: char.id, name: char.name, look: char.look, map, x, y, dir: char.dir || 'd',
      send: (s) => send(typeof s === 'string' ? s : JSON.stringify(s)), close,
      steps: new Bucket(STEP_BURST, STEP_MIN_MS), chat: new Bucket(5, 2000), lastSave: Date.now(),
    };
    this.players.set(p.id, p);
    this.byName.set(p.name.toLowerCase(), p);
    this.enter(p, { t: 'welcome', you: this.pub(p), team: char.team, items: char.items, money: char.money });
    this.log('join', p.name, map);
    return p;
  }

  enter(p, first) {
    this.maps.get(p.map).add(p);
    const others = [...this.maps.get(p.map)].filter((o) => o !== p).map((o) => this.pub(o));
    p.send({ ...(first || { t: 'warp' }), map: p.map, x: p.x, y: p.y, d: p.dir, players: others });
    this.sendMap(p.map, { t: 'join', p: this.pub(p) }, p);
  }

  leave(p) {
    if (this.players.get(p.id) !== p) return;
    this.maps.get(p.map).delete(p);
    this.players.delete(p.id);
    this.byName.delete(p.name.toLowerCase());
    this.sendMap(p.map, { t: 'leave', id: p.id });
    this.save(p);
    this.log('leave', p.name);
  }

  move(p, d, seq, now = Date.now()) {
    p.dir = d;
    if (!p.steps.take(now)) return p.send({ t: 'ack', s: seq, x: p.x, y: p.y, ok: false, why: 'speed' });
    const [dx, dy] = DIRS[d];
    const nx = p.x + dx, ny = p.y + dy, map = MAPS[p.map];
    const warp = warpAt(map, nx, ny);
    if (warp) {
      this.maps.get(p.map).delete(p);
      this.sendMap(p.map, { t: 'leave', id: p.id });
      p.map = warp.to; p.x = warp.tx; p.y = warp.ty;
      p.steps = new Bucket(STEP_BURST, STEP_MIN_MS);
      this.enter(p);
      this.save(p);
      return;
    }
    if (!walkable(map, nx, ny) || this.blocked(p, nx, ny)) {
      p.send({ t: 'ack', s: seq, x: p.x, y: p.y, ok: false, why: 'blocked' });
      this.sendMap(p.map, { t: 'mv', id: p.id, x: p.x, y: p.y, d }, p);
      return;
    }
    p.x = nx; p.y = ny;
    p.send({ t: 'ack', s: seq, x: p.x, y: p.y, ok: true });
    this.sendMap(p.map, { t: 'mv', id: p.id, x: p.x, y: p.y, d }, p);
    if (now - p.lastSave > 30000) { p.lastSave = now; this.save(p); }
  }

  // Spieler blockieren einander nicht in sicheren Städten (Treffpunkte sollen nicht verstopfen).
  blocked(p, x, y) {
    if (MAPS[p.map].safe) return false;
    for (const o of this.maps.get(p.map)) if (o !== p && o.x === x && o.y === y) return true;
    return false;
  }

  face(p, d) { p.dir = d; this.sendMap(p.map, { t: 'mv', id: p.id, x: p.x, y: p.y, d }, p); }

  chat(p, m) {
    if (!p.chat.take()) return p.send({ t: 'err', code: 'chat_rate', msg: 'Nicht so schnell.' });
    const out = { t: 'chat', ch: m.ch, from: p.name, msg: m.msg, ts: Date.now() };
    if (m.ch === 'map') return this.sendMap(p.map, out);
    if (m.ch === 'global') { const s = JSON.stringify(out); for (const o of this.players.values()) o.send(s); return; }
    const to = this.byName.get(m.to.toLowerCase());
    if (!to) return p.send({ t: 'err', code: 'offline', msg: `${m.to} ist nicht online.` });
    to.send({ ...out, to: to.name });
    if (to !== p) p.send({ ...out, to: to.name });
  }

  stats() { return { players: this.players.size, maps: Object.fromEntries([...this.maps].map(([k, s]) => [k, s.size])) }; }
}
