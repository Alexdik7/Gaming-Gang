// Koop zu zweit über einen Raumcode (BF-1234). Lockstep: beide Handys rechnen dieselbe Welt (gleicher Seed,
// fester Zeitschritt, eigener Zufall). Der GASTGEBER gibt den Takt vor: er verschickt seine Schrittzahl und alle
// Befehle mit dem Schritt, vor dem sie gelten. Der Mitspieler rechnet bis zu dieser Schrittzahl nach und schickt
// eigene Befehle an den Gastgeber, der sie einreiht. Transport: WebRTC über PeerJS (lib/), Tests: BroadcastChannel (?net=local).
// Transport-Klassen übernommen aus cats/js/net/multiplayer.js.
export const makeCode = () => 'BF-' + Math.floor(1000 + Math.random() * 9000);
export const cleanCode = s => { const d = String(s || '').replace(/\D/g, '').slice(0, 4); return d.length === 4 ? 'BF-' + d : null; };

class LocalTransport {   // gleiche Maschine/Browser – für automatische Tests
  constructor() { this.id = 'c' + Math.random().toString(36).slice(2, 8); }
  open(code, asHost) {
    this.isHost = asHost; this.code = code; if (asHost) this.id = 'host';
    this.ch = new BroadcastChannel('bf-' + code);
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
  // ICE: mehrere STUN-Server + die TURN-Relays von PeerJS (für Mobilfunk-NAT, wenn keine direkte Verbindung klappt)
  opts() { return { debug: 0, config: { iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] },
    { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' },
  ] } }; }
  // Gastgeber: Raum bleibt offen, auch wenn iOS die App kurz in den Hintergrund schickt (Code per Nachricht teilen!)
  async host(code) {
    await this.lib(); this.isHost = true; this.code = code; this.closed = false;
    await this.openHost(true);
    this.onVis = () => { if (!document.hidden) this.heal(); };
    document.addEventListener('visibilitychange', this.onVis);
    this.healT = setInterval(() => this.heal(), 4000);
  }
  openHost(first) {
    return new Promise((res, rej) => {
      try { this.peer?.destroy(); } catch { }
      const p = this.peer = new window.Peer('bf-' + this.code.toLowerCase(), this.opts());
      const to = setTimeout(() => { if (first) rej(new Error('timeout')); else res(); }, 12000);
      p.on('open', () => { clearTimeout(to); this.setStatus('open'); res(); });
      p.on('error', e => { clearTimeout(to); if (first && !p.open) { rej(e); return; } this.setStatus('lost'); res(); });
      p.on('connection', conn => { conn.on('open', () => { this.conns.set(conn.peer, conn); this.wire(conn); this.onJoin && this.onJoin(conn.peer); }); });
      p.on('disconnected', () => { this.setStatus('lost'); try { p.reconnect(); } catch { } });
      p.on('close', () => this.setStatus('lost'));
    });
  }
  heal() {   // Verbindung zum Vermittler wiederherstellen (bestehende Datenkanäle bleiben davon unberührt)
    if (this.closed || !this.isHost || this.healing) return;
    const p = this.peer; if (p && p.open && !p.disconnected) { this.setStatus('open'); return; }
    if (this.conns.size) return;   // Mitspieler ist schon verbunden – Vermittler wird nicht mehr gebraucht
    this.healing = true; const done = () => { this.healing = false; };
    if (p && p.disconnected && !p.destroyed) { try { p.reconnect(); } catch { } setTimeout(done, 3000); return; }
    this.openHost(false).then(done, done);
  }
  setStatus(s) { if (this.status !== s) { this.status = s; this.onStatus && this.onStatus(s); } }
  // Mitspieler: mehrere Versuche (Gastgeber kann gerade neu verbinden)
  async join(code) {
    await this.lib(); this.isHost = false; this.code = code;
    let last;
    for (let i = 0; i < 3; i++) {
      try { await this.joinOnce(); return; } catch (e) { last = e; try { this.peer?.destroy(); } catch { } if (i < 2) await new Promise(r => setTimeout(r, 2500)); }
    }
    throw last;
  }
  joinOnce() {
    return new Promise((res, rej) => {
      const p = this.peer = new window.Peer(this.opts());
      const to = setTimeout(() => rej(new Error('timeout')), 15000);
      p.on('error', e => { clearTimeout(to); rej(e); });
      p.on('open', () => this.dial().then(() => { clearTimeout(to); res(); }, e => { clearTimeout(to); rej(e); }));
    });
  }
  dial() {
    return new Promise((res, rej) => {
      const conn = this.peer.connect('bf-' + this.code.toLowerCase(), { reliable: true });
      const to = setTimeout(() => rej(new Error('ice')), 12000);   // Vermittler ok, aber keine direkte Verbindung
      conn.on('open', () => { clearTimeout(to); this.conns.set('host', conn); this.wire(conn); this.hostConn = conn; res(); });
      conn.on('error', e => { clearTimeout(to); rej(e); });
    });
  }
  send(to, msg) {
    if (!this.isHost) { if (this.hostConn && this.hostConn.open) this.hostConn.send(msg); return; }
    if (to) { const c = this.conns.get(to); if (c && c.open) c.send(msg); } else for (const c of this.conns.values()) if (c.open) c.send(msg);
  }
  close() { this.closed = true; clearInterval(this.healT); if (this.onVis) document.removeEventListener('visibilitychange', this.onVis); try { this.peer && this.peer.destroy(); } catch { } this.conns.clear(); }
}
export const makeTransport = () => (typeof location !== 'undefined' && /net=local/.test(location.search)) ? new LocalTransport() : new PeerTransport();

// Verständliche Fehlermeldung je PeerJS-Fehlertyp
export function explain(e) {
  const t = e?.type || e?.message || String(e);
  if (/peer-unavailable/.test(t)) return 'Raum nicht gefunden. Code richtig? Der Gastgeber muss im Koop-Bildschirm bleiben (oder kurz zurück in die App wechseln).';
  if (/unavailable-id/.test(t)) return 'Dieser Raumcode ist gerade belegt – bitte neu erstellen.';
  if (/^ice$/.test(t)) return 'Raum gefunden, aber keine direkte Verbindung. Probiert beide mobile Daten statt WLAN (manche WLANs blockieren das).';
  if (/network|server-error|socket|timeout/.test(t)) return 'Vermittlungs-Server nicht erreichbar. Internet an? Sonst in ein paar Minuten nochmal.';
  if (/browser-incompatible|lib/.test(t)) return 'Koop wird hier nicht unterstützt – App neu laden.';
  return 'Verbindung fehlgeschlagen (' + String(t).slice(0, 40) + ').';
}

// Befehle, die die Welt verändern dürfen (alles andere wird verworfen)
export const CMDS = new Set(['place', 'upgrade', 'sell', 'evolve', 'ascend', 'fuse', 'setTarget', 'clearRock', 'startWave', 'useAbility', 'usePower']);

export class Coop {
  constructor(tr, host) { this.tr = tr; this.host = host; this.out = []; this.inbox = []; this.hostN = 0; this.peer = null; this.on = {}; this.lastSent = -1; }
  static async create(code) { const tr = makeTransport(); await tr.host(code); const c = new Coop(tr, true); c.code = code; c.wire(); return c; }
  static async join(code) { const tr = makeTransport(); await tr.join(code); const c = new Coop(tr, false); c.code = code; c.wire(); return c; }
  wire() {
    this.tr.onStatus = st => this.on.status?.(st);
    this.tr.onJoin = id => { if (this.peer) return; this.peer = id; this.on.join?.(id); };
    this.tr.onLeave = id => { if (this.host && id !== this.peer) return; this.gone = true; this.on.leave?.(); };
    this.tr.onMsg = (from, m) => {
      if (!m || typeof m !== 'object') return;
      if (this.host) {
        if (m.hello) { this.peer = this.peer || from; this.mate = m.hello; this.on.hello?.(m.hello); }
        else if (Array.isArray(m.c) && CMDS.has(m.c[0]) && Array.isArray(m.c[1])) this.inbox.push(m.c);
        else if (m.bye) { this.gone = true; this.on.leave?.(); }
      } else {
        if (m.setup) this.on.setup?.(m.setup);
        else if (typeof m.n === 'number') { this.hostN = Math.max(this.hostN, m.n); if (m.cmds) this.inbox.push(...m.cmds); if (m.h) this.hashes = [...(this.hashes || []).slice(-8), m.h]; this.hostPaused = !!m.p; if (m.end) this.on.end?.(); }
        else if (m.bye) { this.gone = true; this.on.leave?.(); }
      }
    };
  }
  send(m) { this.tr.send(null, m); }
  hello(info) { this.send({ hello: info }); }
  close() { try { this.send({ bye: 1 }); } catch (e) { /* egal */ } setTimeout(() => this.tr.close(), 100); }
}

// Prüfsumme des Weltzustands (für die Asynchron-Warnung)
export function worldHash(w) {
  let h = Math.round(w.coins) * 31 + w.lives * 7 + w.enemies.length * 131 + w.towers.length * 1009 + w.wave * 17;
  for (const e of w.enemies) h = (h * 33 + Math.round(e.hp) + Math.round(e.d * 100)) % 2147483647;
  for (const t of w.towers) h = (h * 33 + t.tiers[0] * 7 + t.tiers[1] * 11 + t.tiers[2] * 13 + Math.round(t.x * 100)) % 2147483647;
  return h;
}
