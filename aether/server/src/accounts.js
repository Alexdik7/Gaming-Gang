// Accounts, Sitzungen und Charaktere. Passwörter: scrypt mit Salt; Sitzungs-Tokens nur als SHA-256-Hash gespeichert.
import { scryptSync, randomBytes, timingSafeEqual, createHash, randomInt } from 'node:crypto';
import { tx, audit } from './db.js';
import { NAME_RE, validLook } from '../../shared/protocol.js';
import { STARTERS } from '../../shared/creatures.js';
import { createMon } from '../../shared/mon.js';
import { MAPS } from '../../shared/maps.js';

const SESSION_MS = 30 * 24 * 3600 * 1000;
const MAX_CHARS = 3;
const START_MAP = 'funkenrast';

export class ApiError extends Error {
  constructor(status, code, msg) { super(msg); this.status = status; this.code = code; }
}

export function hashPassword(pw) {
  const salt = randomBytes(16);
  const h = scryptSync(pw, salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${h.toString('base64')}`;
}
export function verifyPassword(pw, stored) {
  const [alg, s, h] = stored.split('$');
  if (alg !== 'scrypt') return false;
  const want = Buffer.from(h, 'base64');
  const got = scryptSync(pw, Buffer.from(s, 'base64'), want.length, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(want, got);
}
const sha = (t) => createHash('sha256').update(t).digest('hex');
const secureRand = () => randomInt(0, 2 ** 32) / 2 ** 32;

function checkCredentials(username, password) {
  if (typeof username !== 'string' || !NAME_RE.test(username)) throw new ApiError(400, 'bad_username', 'Name: 3–16 Zeichen, Buchstaben, Ziffern, _ oder -.');
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new ApiError(400, 'bad_password', 'Passwort: mindestens 8 Zeichen.');
}

export function makeAccounts(db) {
  const q = {
    byName: db.prepare('SELECT * FROM accounts WHERE username = ?'),
    insAcc: db.prepare('INSERT INTO accounts (username, pass_hash, created_at) VALUES (?, ?, ?)'),
    insSess: db.prepare('INSERT INTO sessions (token_hash, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)'),
    sess: db.prepare('SELECT a.* FROM sessions s JOIN accounts a ON a.id = s.account_id WHERE s.token_hash = ? AND s.expires_at > ?'),
    delSess: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    chars: db.prepare('SELECT id, name, look, map, x, y, dir, money FROM characters WHERE account_id = ? ORDER BY id'),
    countChars: db.prepare('SELECT COUNT(*) AS n FROM characters WHERE account_id = ?'),
    charByName: db.prepare('SELECT id FROM characters WHERE name = ?'),
    insChar: db.prepare('INSERT INTO characters (account_id, name, look, map, x, y, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    insMon: db.prepare('INSERT INTO creatures (owner_id, original_owner_id, species, slot, data, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
    insItem: db.prepare('INSERT INTO inventory (character_id, item, qty) VALUES (?, ?, ?)'),
    charOwned: db.prepare('SELECT * FROM characters WHERE id = ? AND account_id = ?'),
    team: db.prepare('SELECT id, species, slot, data FROM creatures WHERE owner_id = ? AND slot IS NOT NULL ORDER BY slot'),
    items: db.prepare('SELECT item, qty FROM inventory WHERE character_id = ? AND qty > 0'),
    savePos: db.prepare('UPDATE characters SET map = ?, x = ?, y = ?, dir = ?, last_seen = ? WHERE id = ?'),
  };

  function issueSession(accountId) {
    const token = randomBytes(32).toString('base64url');
    const now = Date.now();
    q.insSess.run(sha(token), accountId, now, now + SESSION_MS);
    return token;
  }

  return {
    register(username, password) {
      checkCredentials(username, password);
      if (q.byName.get(username)) throw new ApiError(409, 'taken', 'Dieser Name ist vergeben.');
      const id = Number(q.insAcc.run(username, hashPassword(password), Date.now()).lastInsertRowid);
      audit(db, id, 'register', { username });
      return { token: issueSession(id), account: { id, username, role: 'player' } };
    },
    login(username, password) {
      checkCredentials(username, password);
      const a = q.byName.get(username);
      // Gleicher Fehler für „unbekannt“ und „falsch“: keine Account-Aufzählung.
      if (!a || !verifyPassword(password, a.pass_hash)) throw new ApiError(401, 'bad_login', 'Name oder Passwort falsch.');
      if (a.banned_until && a.banned_until > Date.now()) throw new ApiError(403, 'banned', 'Dieser Account ist gesperrt.');
      return { token: issueSession(a.id), account: { id: a.id, username: a.username, role: a.role } };
    },
    auth(token) {
      if (typeof token !== 'string' || token.length > 128) return null;
      const a = q.sess.get(sha(token), Date.now());
      if (!a || (a.banned_until && a.banned_until > Date.now())) return null;
      return a;
    },
    logout(token) { q.delSess.run(sha(token)); },
    listCharacters(accountId) {
      return q.chars.all(accountId).map((c) => ({ ...c, look: JSON.parse(c.look) }));
    },
    createCharacter(accountId, { name, look, starter }) {
      if (typeof name !== 'string' || !NAME_RE.test(name)) throw new ApiError(400, 'bad_name', 'Charaktername: 3–16 Zeichen.');
      if (!validLook(look)) throw new ApiError(400, 'bad_look', 'Ungültiges Aussehen.');
      if (!STARTERS.includes(starter)) throw new ApiError(400, 'bad_starter', 'Ungültiger Partner.');
      return tx(db, () => {
        if (q.countChars.get(accountId).n >= MAX_CHARS) throw new ApiError(409, 'limit', `Höchstens ${MAX_CHARS} Charaktere.`);
        if (q.charByName.get(name)) throw new ApiError(409, 'taken', 'Dieser Charaktername ist vergeben.');
        const sp = MAPS[START_MAP].spawn, now = Date.now();
        const cleanLook = { body: look.body, hair: look.hair, color: look.color };
        const id = Number(q.insChar.run(accountId, name, JSON.stringify(cleanLook), START_MAP, sp.x, sp.y, now).lastInsertRowid);
        const mon = createMon(starter, 5, secureRand); // Werte würfelt der Server, nie der Client
        q.insMon.run(id, id, starter, 0, JSON.stringify(mon), now);
        q.insItem.run(id, 'fangkugel', 5);
        q.insItem.run(id, 'trank', 3);
        audit(db, accountId, 'char_create', { id, name, starter });
        return { id, name, look: cleanLook, map: START_MAP, x: sp.x, y: sp.y, dir: 'd', money: 3000 };
      });
    },
    loadCharacter(accountId, charId) {
      const c = q.charOwned.get(charId, accountId);
      if (!c) return null;
      return {
        ...c, look: JSON.parse(c.look),
        team: q.team.all(charId).map((m) => ({ id: m.id, slot: m.slot, ...JSON.parse(m.data) })),
        items: q.items.all(charId),
      };
    },
    savePosition(charId, map, x, y, dir) { q.savePos.run(map, x, y, dir, Date.now(), charId); },
  };
}
