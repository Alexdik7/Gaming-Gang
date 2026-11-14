// LobbyManager: Raum erstellen, per Code beitreten, Map wählen, gemeinsam starten.
import { makeTransport, makeCode, cleanCode, sanitizeSetup, HostSession, ClientSession, MAX_PLAYERS } from './multiplayer.js';

export class Lobby {
  // setup: was dieser Spieler mitbringt (aus progression.playerSetup) + level
  constructor(setup, level) {
    this.setup = setup; this.level = level; this.net = null; this.code = null; this.isHost = false;
    this.players = []; this.mapId = 'city'; this.diff = 'normal'; this.mode = 'campaign';
    this.onChange = () => {}; this.onStart = () => {}; this.onError = () => {}; this.session = null;
  }

  async create() {
    this.isHost = true;
    for (let i = 0; i < 4; i++) {          // bei belegtem Code einen neuen würfeln
      this.code = makeCode(); this.net = makeTransport();
      try { await this.net.host(this.code); break; } catch (e) { this.net.close(); if (i === 3 || !e || e.type !== 'unavailable-id') throw e; }
    }
    this.players = [{ peer: 'host', setup: sanitizeSetup(this.setup), level: this.level }];
    this.net.onJoin = () => {};
    this.net.onMsg = (from, m) => this.hostMsg(from, m);
    this.net.onLeave = from => { this.players = this.players.filter(p => p.peer !== from); this.broadcast(); };
    this.onChange();
    return this.code;
  }
  hostMsg(from, m) {
    if (!m || m.t !== 'hello' || this.session) return;
    if (this.players.some(p => p.peer === from)) return;
    if (this.players.length >= MAX_PLAYERS) return this.net.send(from, { t: 'denied', why: 'full' });
    const setup = sanitizeSetup(m.setup);
    if (this.players.some(p => p.setup.id === setup.id)) setup.id += Math.floor(Math.random() * 99);
    this.players.push({ peer: from, setup, level: Math.max(1, Math.min(100, m.level | 0)) });
    this.broadcast();
  }
  broadcast() {
    const msg = { t: 'lobby', mapId: this.mapId, diff: this.diff, mode: this.mode, players: this.players.map(p => ({ name: p.setup.name, level: p.level, id: p.setup.id })) };
    this.net.send(null, msg); this.onChange();
  }
  setMap(mapId, diff) { if (!this.isHost) return; this.mapId = mapId; this.diff = diff; this.broadcast(); }

  async join(raw) {
    const code = cleanCode(raw); if (!code) throw new Error('code');
    this.isHost = false; this.code = code; this.net = makeTransport();
    this.net.onMsg = (from, m) => this.clientMsg(m);
    this.net.onLeave = () => { if (!this.session) this.onError('host'); };
    await this.net.join(code);
    this.net.send(null, { t: 'hello', setup: this.setup, level: this.level });
  }
  clientMsg(m) {
    if (!m) return;
    if (m.t === 'lobby') { this.mapId = m.mapId; this.diff = m.diff; this.mode = m.mode; this.players = m.players.map(p => ({ setup: p, level: p.level })); this.onChange(); }
    else if (m.t === 'denied') this.onError(m.why);
    else if (m.t === 'bye') this.onError('host');
    else if (m.t === 'start' && !this.session) { this.session = new ClientSession(m, this.net, this.setup); this.onStart(this.session); }
  }

  // Gastgeber startet: aus der Lobby wird eine autoritative HostSession
  start() {
    if (!this.isHost || this.session) return null;
    const players = this.players.map(p => p.setup);
    const peers = this.players.map((p, i) => ({ peer: p.peer, pi: i })).filter(p => p.peer !== 'host');
    this.session = new HostSession({ mapId: this.mapId, diff: this.diff, mode: this.mode, players, seed: Date.now() & 0xffff }, this.net, peers);
    this.onStart(this.session);
    return this.session;
  }
  leave() { if (this.net && !this.session) { try { this.net.send(null, { t: 'bye' }); } catch { } this.net.close(); } this.net = null; }
}
