// Netzwerkprotokoll (JSON über WebSocket). Jede eingehende Nachricht wird hier geprüft, bevor der Server sie anfasst.
export const PROTOCOL_VERSION = 1;
export const DIRS = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
export const STEP_MS = 200;        // Client-Laufzeit pro Kachel
export const STEP_MIN_MS = 170;    // Server-Mindestabstand (Takt des Token-Buckets)
export const STEP_BURST = 3;       // erlaubter Puffer bei Netzschwankungen
export const CHAT_MAX = 200;
export const NAME_RE = /^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9_-]{2,15}$/;
export const LOOK = { body: [0, 1, 2, 3], hair: [0, 1, 2, 3, 4], color: [0, 1, 2, 3, 4, 5, 6, 7] };

const isInt = (v) => Number.isInteger(v);
const isStr = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max;

/** Liefert eine bereinigte Nachricht oder null (ungültig → wird verworfen und gezählt). */
export function parseClient(raw) {
  if (typeof raw !== 'string' || raw.length > 1024) return null;
  let m;
  try { m = JSON.parse(raw); } catch { return null; }
  if (!m || typeof m !== 'object' || typeof m.t !== 'string') return null;
  switch (m.t) {
    case 'hello':
      return isStr(m.token, 128) && isInt(m.charId) && m.v === PROTOCOL_VERSION ? { t: 'hello', token: m.token, charId: m.charId } : null;
    case 'move':
      return DIRS[m.d] && isInt(m.s) && m.s >= 0 ? { t: 'move', d: m.d, s: m.s } : null;
    case 'face':
      return DIRS[m.d] ? { t: 'face', d: m.d } : null;
    case 'chat': {
      if (!['map', 'global', 'whisper'].includes(m.ch) || !isStr(m.msg, CHAT_MAX)) return null;
      const msg = cleanText(m.msg);
      if (!msg) return null;
      if (m.ch === 'whisper') return NAME_RE.test(m.to || '') ? { t: 'chat', ch: 'whisper', to: m.to, msg } : null;
      return { t: 'chat', ch: m.ch, msg };
    }
    case 'ping':
      return isInt(m.n) ? { t: 'ping', n: m.n } : null;
    default:
      return null;
  }
}

/** Entfernt Steuerzeichen und überflüssige Leerzeichen. HTML wird im Client nie als HTML eingefügt. */
export function cleanText(s) {
  return s.replace(/[\t\n\r]/g, ' ').replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e]/g, '').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX);
}

export function validLook(look) {
  return look && typeof look === 'object' && Object.keys(LOOK).every((k) => LOOK[k].includes(look[k]));
}
