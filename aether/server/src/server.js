// Einstiegspunkt: HTTP (REST-API + statische Dateien) und WebSocket (/ws) auf einem Port.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { openDb } from './db.js';
import { makeAccounts, ApiError } from './accounts.js';
import { World, Bucket } from './world.js';
import { parseClient } from '../../shared/protocol.js';

const ROOT = normalize(join(dirname(fileURLToPath(import.meta.url)), '../..')); // aether/
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const ALLOWED_ORIGINS = (process.env.AETHER_ORIGINS || 'https://alexdik7.github.io').split(',');

export function startServer({ port = 8070, dbFile = join(ROOT, 'server/data/aether.db'), quiet = false } = {}) {
  const db = openDb(dbFile);
  const acc = makeAccounts(db);
  const log = quiet ? () => {} : (...a) => console.log(new Date().toISOString(), ...a);
  const world = new World({ save: (p) => acc.savePosition(p.id, p.map, p.x, p.y, p.dir), log });
  const authLimits = new Map(); // IP → Bucket (Schutz gegen Passwort-Raten)

  function cors(req, res) {
    const o = req.headers.origin;
    if (o && (ALLOWED_ORIGINS.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o))) {
      res.setHeader('Access-Control-Allow-Origin', o);
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Vary', 'Origin');
    }
  }
  const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  const bearer = (req) => (req.headers.authorization || '').replace(/^Bearer /, '');

  async function body(req) {
    let s = '';
    for await (const c of req) { s += c; if (s.length > 4096) throw new ApiError(413, 'too_big', 'Anfrage zu groß.'); }
    try { return s ? JSON.parse(s) : {}; } catch { throw new ApiError(400, 'bad_json', 'Ungültiges JSON.'); }
  }

  async function api(req, res, path) {
    const ip = req.socket.remoteAddress;
    if (path === '/api/register' || path === '/api/login') {
      if (req.method !== 'POST') throw new ApiError(405, 'method', 'POST erwartet.');
      let b = authLimits.get(ip);
      if (!b) authLimits.set(ip, (b = new Bucket(10, 6000)));
      if (!b.take()) throw new ApiError(429, 'rate', 'Zu viele Versuche. Bitte kurz warten.');
      const { username, password } = await body(req);
      return json(res, 200, path === '/api/register' ? acc.register(username, password) : acc.login(username, password));
    }
    const account = acc.auth(bearer(req));
    if (!account) throw new ApiError(401, 'auth', 'Bitte erneut anmelden.');
    if (path === '/api/logout' && req.method === 'POST') { acc.logout(bearer(req)); return json(res, 200, { ok: true }); }
    if (path === '/api/characters' && req.method === 'GET') return json(res, 200, { characters: acc.listCharacters(account.id) });
    if (path === '/api/characters' && req.method === 'POST') return json(res, 200, { character: acc.createCharacter(account.id, await body(req)) });
    throw new ApiError(404, 'not_found', 'Unbekannter Endpunkt.');
  }

  async function serveStatic(res, path) {
    const rel = path.startsWith('/shared/') ? path.slice(1) : 'client' + (path === '/' ? '/index.html' : path);
    const file = normalize(join(ROOT, rel));
    // Nur client/ und shared/ ausliefern – niemals server/ (Datenbank, Code).
    if (!file.startsWith(join(ROOT, 'client')) && !file.startsWith(join(ROOT, 'shared'))) return json(res, 404, { error: 'not_found' });
    try {
      const data = await readFile(file);
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(data);
    } catch { json(res, 404, { error: 'not_found' }); }
  }

  const http = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://x').pathname;
    cors(req, res);
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    try {
      if (path === '/health') return json(res, 200, { ok: true, ...world.stats() });
      if (path.startsWith('/api/')) return await api(req, res, path);
      return await serveStatic(res, path);
    } catch (e) {
      if (e instanceof ApiError) return json(res, e.status, { error: e.code, msg: e.message });
      log('error', e);
      json(res, 500, { error: 'server', msg: 'Interner Fehler.' });
    }
  });

  const wss = new WebSocketServer({ server: http, path: '/ws', maxPayload: 2048 });
  wss.on('connection', (ws) => {
    let player = null, bad = 0;
    const inbox = new Bucket(40, 50); // max. ~20 Nachrichten/s dauerhaft
    const send = (s) => { if (ws.readyState === 1) ws.send(s); };
    const helloTimer = setTimeout(() => !player && ws.close(4001, 'hello timeout'), 10000);
    ws.on('message', (raw) => {
      if (!inbox.take()) { bad++; if (bad > 50) ws.close(4008, 'flood'); return; }
      const m = parseClient(raw.toString());
      if (!m) { bad++; if (bad > 20) ws.close(4002, 'bad messages'); return; }
      if (!player) {
        if (m.t !== 'hello') return;
        const account = acc.auth(m.token);
        const char = account && acc.loadCharacter(account.id, m.charId);
        if (!char) { send(JSON.stringify({ t: 'err', code: 'auth', msg: 'Anmeldung ungültig.' })); return ws.close(4003, 'auth'); }
        clearTimeout(helloTimer);
        player = world.join(char, send, () => ws.close(4004, 'replaced'));
        return;
      }
      if (m.t === 'move') world.move(player, m.d, m.s);
      else if (m.t === 'face') world.face(player, m.d);
      else if (m.t === 'chat') world.chat(player, m);
      else if (m.t === 'ping') send(JSON.stringify({ t: 'pong', n: m.n }));
    });
    ws.on('close', () => { clearTimeout(helloTimer); if (player) world.leave(player); });
  });

  // Sauberes Herunterfahren: alle Positionen speichern.
  function close() {
    for (const p of [...world.players.values()]) world.leave(p);
    wss.close(); http.close(); db.close();
  }

  return new Promise((ok) => http.listen(port, () => { log(`Aetherwild-Server läuft auf :${http.address().port}`); ok({ http, world, db, close, port: http.address().port }); }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = await startServer({ port: Number(process.env.PORT) || 8070, dbFile: process.env.AETHER_DB || undefined });
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { s.close(); process.exit(0); });
}
