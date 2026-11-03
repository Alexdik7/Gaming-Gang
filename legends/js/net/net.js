// Netzwerk-Client: Verbindung zum Weltserver, automatische Wiederverbindung, Fern-Spieler
const LS = 'lu-account';
export class Net {
  constructor() {
    this.ws = null; this.url = null; this.handlers = {}; this.world = null; this.char = null;
    this.retry = 0; this.wanted = false; this.status = 'offline';
    try { this.acc = JSON.parse(localStorage.getItem(LS)) || {}; } catch { this.acc = {}; }
  }
  on(t, fn) { (this.handlers[t] ||= []).push(fn); }
  emit(t, m) { (this.handlers[t] || []).forEach(f => f(m)); }
  setStatus(s) { this.status = s; this.emit('status', s); }

  connect(url, name) {
    this.url = url.replace(/^http/, 'ws'); this.name = name; this.wanted = true;
    return new Promise((res, rej) => {
      this.setStatus('verbinde…');
      let ws;
      try { ws = new WebSocket(this.url); } catch (e) { this.setStatus('offline'); return rej(e); }
      this.ws = ws;
      const to = setTimeout(() => { ws.close(); rej(new Error('Zeitüberschreitung')); }, 8000);
      ws.onopen = () => { clearTimeout(to); this.retry = 0; this.send({ t: 'hello', pid: this.acc.pid, secret: this.acc.secret, name }); };
      ws.onmessage = e => {
        let m; try { m = JSON.parse(e.data); } catch { return; }
        if (m.t === 'welcome') {
          if (m.secret) { this.acc = { pid: m.pid, secret: m.secret }; try { localStorage.setItem(LS, JSON.stringify(this.acc)); } catch {} }
          this.pid = m.pid; this.setStatus('online'); res(m);
          if (this.world) this.send({ t: 'join', code: this.world, char: this.char }); // Wiederverbindung
        }
        if (m.t === 'joined') this.world = m.code;
        this.emit(m.t, m);
      };
      ws.onclose = () => {
        clearTimeout(to); this.setStatus('offline');
        if (this.wanted && this.retry < 30) {
          const d = Math.min(15000, 1000 * 2 ** this.retry++);
          this.setStatus(`getrennt – neuer Versuch in ${Math.round(d / 1000)} s`);
          setTimeout(() => this.wanted && this.connect(this.url, this.name).catch(() => {}), d);
        }
        rej(new Error('Verbindung fehlgeschlagen'));
      };
    });
  }
  send(m) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(m)); }
  create(name, char) { this.char = char; this.send({ t: 'create', name, char }); }
  join(code, char) { this.char = char; this.send({ t: 'join', code, char }); }
  disconnect() { this.wanted = false; this.world = null; this.ws?.close(); }
  get online() { return this.status === 'online' && !!this.world; }
}
