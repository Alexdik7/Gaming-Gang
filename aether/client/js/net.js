// Verbindung zum Weltserver: REST für Login/Charaktere, WebSocket für die Welt.
import { PROTOCOL_VERSION } from '../../shared/protocol.js';

const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { return null; } };

export function serverUrl() {
  const q = new URLSearchParams(location.search).get('server');
  if (q) LS('aether-server', q);
  const saved = LS('aether-server');
  if (saved) return saved.replace(/\/$/, '');
  // Wird der Client vom Weltserver selbst ausgeliefert, ist der Server dieselbe Adresse.
  return location.hostname.endsWith('github.io') ? '' : location.origin;
}
export const setServer = (u) => LS('aether-server', u || null);
export const session = { get: () => LS('aether-token'), set: (t) => LS('aether-token', t) };

export async function api(path, body) {
  const base = serverUrl();
  if (!base) throw new Error('Kein Weltserver eingestellt.');
  const t = session.get();
  let r;
  try {
    r = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(t && { Authorization: 'Bearer ' + t }) }, body: body && JSON.stringify(body) });
  } catch { throw new Error('Server nicht erreichbar.'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.msg || 'Fehler ' + r.status); e.code = j.error; throw e; }
  return j;
}

/** Öffnet die Welt-Verbindung. handlers: { onMessage(m), onClose(code) } */
export function connectWorld(charId, handlers) {
  const ws = new WebSocket(serverUrl().replace(/^http/, 'ws') + '/ws');
  const send = (m) => ws.readyState === 1 && ws.send(JSON.stringify(m));
  ws.onopen = () => send({ t: 'hello', token: session.get(), charId, v: PROTOCOL_VERSION });
  ws.onmessage = (e) => handlers.onMessage(JSON.parse(e.data));
  ws.onclose = (e) => handlers.onClose(e.code);
  return { send, close: () => ws.close() };
}
