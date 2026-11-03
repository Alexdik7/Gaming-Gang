// LEGENDS UNITED – Weltserver (Node.js + WebSocket)
// Server-autoritativ für: Weltuhr (Tag/Nacht/Wetter), Weltfortschritt (Flags), Positionen (Geschwindigkeitsprüfung),
// Spielstände (werden serverseitig gespeichert → Welt bleibt bestehen, auch wenn der Ersteller offline ist).
// Start: npm install && npm start   (Port über PORT, Standard 8052)
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8052;
const DATA = process.env.DATA_FILE || path.join(__dirname, 'data', 'worlds.json');
const STATIC = path.join(__dirname, '..');
const MAX_PLAYERS = 4;
const DAY_LENGTH = 24 * 60; // Sekunden pro Spieltag (24 min)
const MAX_SPEED = 11; // m/s inkl. Toleranz

// ---------------------------------------------------------------- Persistenz
let db = { worlds: {}, accounts: {} };
try { db = JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch { fs.mkdirSync(path.dirname(DATA), { recursive: true }); }
let dirty = false;
setInterval(() => { if (!dirty) return; dirty = false; fs.writeFile(DATA + '.tmp', JSON.stringify(db), e => { if (!e) fs.rename(DATA + '.tmp', DATA, () => {}); }); }, 3000);
const markDirty = () => (dirty = true);

const code = () => { let c; do { c = Array.from(crypto.randomBytes(6), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join(''); } while (db.worlds[c]); return c; };
const hashSecret = s => crypto.createHash('sha256').update(String(s)).digest('hex');

function worldTime(w) { return (w.timeBase + (Date.now() - w.timeEpoch) / 1000); }
function weatherAt(w, t) { // deterministisch alle 6 min
  const slot = Math.floor(t / 360); const r = Math.abs(Math.sin(slot * 91.7 + w.seed * 3.1)) % 1;
  if (slot <= 1) return 'klar';
  return r < 0.55 ? 'klar' : r < 0.8 ? 'wolkig' : 'regen';
}

// ---------------------------------------------------------------- Validierung
function validSave(s) {
  if (!s || typeof s !== 'object') return false;
  if (JSON.stringify(s).length > 200000) return false;
  const all = [...(s.team || []), ...(s.box || [])];
  if ((s.team || []).length > 6 || all.length > 600) return false;
  for (const m of all) if (!m || typeof m.sp !== 'string' || !(m.lvl >= 1 && m.lvl <= 100)) return false;
  if (s.money != null && (s.money < 0 || s.money > 1e9)) return false;
  return true;
}
const clean = (s, n = 24) => String(s || '').replace(/[<>]/g, '').slice(0, n);

// ---------------------------------------------------------------- HTTP (liefert auch das Spiel aus)
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200); return res.end('ok'); }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.normalize(path.join(STATIC, p));
  if (!f.startsWith(STATIC) || f.includes(path.sep + 'server' + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, buf) => {
    if (e) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(buf);
  });
});

// ---------------------------------------------------------------- WebSocket
const wss = new WebSocketServer({ server });
const live = new Map(); // ws -> session

function send(ws, msg) { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function inWorld(code) { return [...live.values()].filter(s => s.world === code); }
function broadcast(code, msg, except) { for (const s of inWorld(code)) if (s.ws !== except) send(s.ws, msg); }

wss.on('connection', ws => {
  const sess = { ws, pid: null, world: null, pos: null, lastPos: 0, msgs: 0 };
  live.set(ws, sess);
  ws.on('message', raw => {
    if (++sess.msgs > 60) return; // einfache Flood-Bremse (pro Sekunde zurückgesetzt)
    let m; try { m = JSON.parse(raw); } catch { return; }
    try { handle(sess, m); } catch (e) { send(ws, { t: 'err', msg: 'Serverfehler' }); console.error(e); }
  });
  ws.on('close', () => {
    if (sess.world) broadcast(sess.world, { t: 'left', pid: sess.pid });
    live.delete(ws);
  });
});
setInterval(() => { for (const s of live.values()) s.msgs = 0; }, 1000);

function handle(s, m) {
  if (m.t === 'hello') {
    let acc = m.pid && db.accounts[m.pid];
    if (acc && acc.secret !== hashSecret(m.secret)) acc = null;
    if (!acc) {
      const pid = crypto.randomUUID(), secret = crypto.randomBytes(18).toString('hex');
      db.accounts[pid] = { secret: hashSecret(secret), name: clean(m.name), created: Date.now(), worlds: [] }; markDirty();
      s.pid = pid; return send(s.ws, { t: 'welcome', pid, secret, worlds: [] });
    }
    s.pid = m.pid; acc.name = clean(m.name) || acc.name;
    return send(s.ws, { t: 'welcome', pid: m.pid, worlds: acc.worlds.filter(c => db.worlds[c]).map(c => ({ code: c, name: db.worlds[c].name, members: Object.keys(db.worlds[c].members).length })) });
  }
  if (!s.pid) return send(s.ws, { t: 'err', msg: 'Nicht angemeldet' });
  const acc = db.accounts[s.pid];

  if (m.t === 'create') {
    const c = code();
    db.worlds[c] = { name: clean(m.name, 32) || 'Neue Welt', owner: s.pid, seed: 52, created: Date.now(), timeBase: DAY_LENGTH * 0.3, timeEpoch: Date.now(), flags: {}, members: {} };
    markDirty();
    return join(s, c, m.char);
  }
  if (m.t === 'join') return join(s, String(m.code || '').toUpperCase().trim(), m.char);

  const w = s.world && db.worlds[s.world];
  if (!w) return;
  const me = w.members[s.pid];

  if (m.t === 'pos') {
    const now = Date.now();
    const x = +m.x, z = +m.z, y = +m.y;
    if (![x, y, z].every(Number.isFinite)) return;
    if (s.pos) {
      const dt = Math.max(0.05, (now - s.lastPos) / 1000);
      const d = Math.hypot(x - s.pos.x, z - s.pos.z);
      const okWarp = m.warp === 'heal' && Math.hypot(x - 10, z - 63) < 4; // erlaubter Rücksprung ins Heilzentrum
      if (d > MAX_SPEED * dt + 2 && !okWarp) return send(s.ws, { t: 'correct', x: s.pos.x, y: s.pos.y, z: s.pos.z });
    }
    s.pos = { x, y, z, r: +m.r || 0, s: Math.min(12, +m.s || 0), b: !!m.b }; s.lastPos = now;
    me.pos = { x, y, z };
    return;
  }
  if (m.t === 'save') {
    if (!validSave(m.data)) return send(s.ws, { t: 'err', msg: 'Spielstand abgelehnt' });
    me.save = m.data; me.savedAt = Date.now(); markDirty();
    return send(s.ws, { t: 'saved', at: me.savedAt });
  }
  if (m.t === 'flag') { // gemeinsamer Weltfortschritt (z. B. Runensteine)
    const id = clean(m.id, 40);
    if (!w.flags[id]) { w.flags[id] = { by: me.name, at: Date.now() }; markDirty(); broadcast(s.world, { t: 'flags', flags: w.flags, by: me.name, id }); }
    return;
  }
  if (m.t === 'chat') return broadcast(s.world, { t: 'chat', from: me.name, pid: s.pid, text: clean(m.text, 140) });
  if (m.t === 'emote') return broadcast(s.world, { t: 'emote', pid: s.pid, e: clean(m.e, 4) });
}

function join(s, c, char) {
  const w = db.worlds[c];
  if (!w) return send(s.ws, { t: 'err', msg: 'Welt nicht gefunden – Code prüfen.' });
  if (!w.members[s.pid] && Object.keys(w.members).length >= MAX_PLAYERS) return send(s.ws, { t: 'err', msg: 'Diese Welt ist voll (max. 4 Spieler).' });
  for (const o of inWorld(c)) if (o.pid === s.pid && o !== s) { send(o.ws, { t: 'err', msg: 'An anderem Gerät angemeldet.' }); o.ws.close(); }
  const acc = db.accounts[s.pid];
  if (!w.members[s.pid]) w.members[s.pid] = { name: clean(char?.name) || acc.name || 'Trainer', look: char?.look || {}, joined: Date.now(), save: null };
  else if (char?.look) {
    w.members[s.pid].look = char.look;
    if (char.name && !w.members[s.pid].save) w.members[s.pid].name = clean(char.name);
  }
  if (!acc.worlds.includes(c)) acc.worlds.push(c);
  markDirty();
  s.world = c; s.pos = null;
  const me = w.members[s.pid];
  send(s.ws, { t: 'joined', code: c, name: w.name, owner: w.owner === s.pid, seed: w.seed, flags: w.flags, save: me.save, time: worldTime(w), dayLength: DAY_LENGTH,
    members: Object.entries(w.members).map(([pid, mm]) => ({ pid, name: mm.name, online: inWorld(c).some(o => o.pid === pid) })) });
  broadcast(c, { t: 'chat', from: '★', text: `${me.name} hat die Welt betreten.` }, s.ws);
}

// Snapshots (10 Hz) + Uhr/Wetter (alle 5 s)
setInterval(() => {
  const byWorld = {};
  for (const s of live.values()) if (s.world && s.pos) (byWorld[s.world] ||= []).push(s);
  for (const [c, list] of Object.entries(byWorld)) {
    const w = db.worlds[c];
    const players = list.map(s => ({ pid: s.pid, name: w.members[s.pid].name, look: w.members[s.pid].look, ...s.pos }));
    for (const s of list) send(s.ws, { t: 'snap', players: players.filter(p => p.pid !== s.pid) });
  }
}, 100);
setInterval(() => {
  for (const c of new Set([...live.values()].map(s => s.world).filter(Boolean))) {
    const w = db.worlds[c], t = worldTime(w);
    broadcast(c, { t: 'clock', time: t, weather: weatherAt(w, t), dayLength: DAY_LENGTH });
  }
}, 5000);

server.listen(PORT, () => console.log(`Legends United Server läuft auf Port ${PORT}`));
