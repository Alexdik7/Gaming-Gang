// LEGENDS UNITED – Weltserver (Node.js + WebSocket)
// Server-autoritativ für: Weltuhr, Weltfortschritt (Flags), Positionen (Kachel-Prüfung), Spielstände,
// Kämpfe zwischen Spielern (die Kampflogik läuft komplett hier) und Tauschgeschäfte.
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
const { pathToFileURL } = require('url');

// Gemeinsame Spiellogik (ES-Module aus dem Client) für serverseitige Kämpfe laden
const L = {};
const jsUrl = f => pathToFileURL(path.join(__dirname, '..', 'js', f)).href;
const logicReady = (async () => {
  Object.assign(L, await import(jsUrl('data/creatures.js')));
  await import(jsUrl('data/creatures2.js'));
  Object.assign(L, await import(jsUrl('data/mon.js')), await import(jsUrl('data/breeding.js')), await import(jsUrl('battle/battle.js')));
})().catch(e => console.error('Kampflogik konnte nicht geladen werden:', e));

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
const lookClean = l => Object.fromEntries(Object.entries(l).filter(([k, v]) => /^[a-z]{2,8}$/.test(k) && /^#[0-9a-fA-F]{3,6}$/.test(String(v))).slice(0, 10));
function validMon(m) {
  if (!m || typeof m !== 'object' || typeof m.sp !== 'string' || m.sp.length > 200 || m.egg) return false;
  if (!(m.lvl >= 1 && m.lvl <= 100) || !Array.isArray(m.moves) || m.moves.length < 1 || m.moves.length > 4) return false;
  if (JSON.stringify(m).length > 4000) return false;
  try { if (L.ensureSpecies && !L.SPECIES[m.sp] && !L.ensureSpecies(m.sp)) return false; } catch { return false; }
  return m.moves.every(x => x && typeof x.id === 'string');
}

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
    endSocial(sess, 'left');
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
    const x = Math.round(+m.x), y = Math.round(+m.y), map = clean(m.map, 20);
    if (![x, y].every(v => Number.isFinite(v) && v >= 0 && v < 256) || !map) return;
    if (s.pos && s.pos.map === map && Math.abs(x - s.pos.x) + Math.abs(y - s.pos.y) > 3 && !m.warp) return send(s.ws, { t: 'correct', map, x: s.pos.x, y: s.pos.y });
    s.pos = { map, x, y, dir: ['up', 'down', 'left', 'right'].includes(m.dir) ? m.dir : 'down', run: !!m.run };
    me.pos = { map, x, y };
    return;
  }
  if (m.t === 'look') { if (m.look && typeof m.look === 'object') me.look = lookClean(m.look); return; }
  if (m.t === 'req' || m.t === 'reqAns' || m.t.startsWith('duel') || m.t.startsWith('trade')) return social(s, m, w, me);
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
  if (!w.members[s.pid]) w.members[s.pid] = { name: clean(char?.name) || acc.name || 'Trainer', look: lookClean(char?.look || {}), joined: Date.now(), save: null };
  else if (char?.look) {
    w.members[s.pid].look = lookClean(char.look);
    if (char.name && !w.members[s.pid].save) w.members[s.pid].name = clean(char.name);
  }
  if (!acc.worlds.includes(c)) acc.worlds.push(c);
  markDirty();
  endSocial(s, 'switch');
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
    const players = list.map(s => ({ pid: s.pid, name: w.members[s.pid].name, look: w.members[s.pid].look, busy: !!(s.duel || s.trade), ...s.pos }));
    for (const s of list) send(s.ws, { t: 'snap', players: players.filter(p => p.pid !== s.pid) });
  }
}, 100);
setInterval(() => {
  for (const c of new Set([...live.values()].map(s => s.world).filter(Boolean))) {
    const w = db.worlds[c], t = worldTime(w);
    broadcast(c, { t: 'clock', time: t, weather: weatherAt(w, t), dayLength: DAY_LENGTH });
  }
}, 5000);

// ---------------------------------------------------------------- Anfragen, Kämpfe, Tausch
const byPid = (code, pid) => inWorld(code).find(o => o.pid === pid);
const nameOf = s => db.worlds[s.world]?.members[s.pid]?.name || 'Trainer';
const swapSide = e => ({ ...e, ...(e.side ? { side: e.side === 'p' ? 'f' : 'p' } : {}), ...(e.result ? { result: { win: 'lose', lose: 'win' }[e.result] || e.result } : {}) });
const healCopy = list => list.filter(validMon).slice(0, 6).map(m => { const c = JSON.parse(JSON.stringify(m)); delete c._fainted; L.healMon(c); return c; });

function social(s, m, w) {
  if (m.t === 'req') {
    const o = byPid(s.world, m.to);
    if (!o || o === s) return send(s.ws, { t: 'reqNo', why: 'Spieler nicht erreichbar.' });
    if (o.duel || o.trade || o.req) return send(s.ws, { t: 'reqNo', why: `${nameOf(o)} ist gerade beschäftigt.` });
    const kind = m.kind === 'trade' ? 'trade' : 'battle';
    if (kind === 'battle' && !L.Battle) return send(s.ws, { t: 'reqNo', why: 'Kampflogik auf dem Server nicht bereit.' });
    s.req = { to: o.pid, kind, team: kind === 'battle' ? healCopy(m.team || []) : null };
    if (s.req.team && !s.req.team.length) { s.req = null; return send(s.ws, { t: 'reqNo', why: 'Du hast keine kampffähigen Kreaturen.' }); }
    return send(o.ws, { t: 'req', from: s.pid, name: nameOf(s), kind });
  }
  if (m.t === 'reqAns') {
    const o = byPid(s.world, m.to);
    if (!o || !o.req || o.req.to !== s.pid) return;
    const req = o.req; o.req = null;
    if (!m.ok) return send(o.ws, { t: 'reqNo', why: `${nameOf(s)} hat abgelehnt.` });
    if (req.kind === 'trade') {
      const tr = { a: o, b: s, offer: new Map(), ok: new Map() };
      o.trade = s.trade = tr;
      send(o.ws, { t: 'tradeStart', with: nameOf(s) }); send(s.ws, { t: 'tradeStart', with: nameOf(o) });
      return;
    }
    const teamB = healCopy(m.team || []);
    if (!teamB.length) return send(o.ws, { t: 'reqNo', why: `${nameOf(s)} hat keine kampffähigen Kreaturen.` });
    const names = { p: nameOf(o), f: nameOf(s) };
    const battle = new L.Battle({ team: req.team, foeTeam: teamB, wild: false, pvp: true, names, trainer: { name: names.f } });
    const duel = { a: o, b: s, battle, acts: {}, need: new Set(['p', 'f']), phase: 'act', pend: [] };
    o.duel = s.duel = duel;
    const lookOf = x => db.worlds[x.world].members[x.pid].look;
    send(o.ws, { t: 'duelStart', side: 'p', team: battle.team, foeTeam: battle.foeTeam, pi: battle.pi, fi: battle.fi, foeName: names.f, foeLook: lookOf(s) });
    send(s.ws, { t: 'duelStart', side: 'f', team: battle.foeTeam, foeTeam: battle.team, pi: battle.fi, fi: battle.pi, foeName: names.p, foeLook: lookOf(o) });
    return;
  }
  if (m.t.startsWith('duel')) return duelMsg(s, m);
  if (m.t.startsWith('trade')) return tradeMsg(s, m);
}

function duelSend(d, ev) {
  const B = d.battle, needP = d.need.has('p'), needF = d.need.has('f');
  const st = { over: B.over, result: B.result };
  send(d.a.ws, { t: 'duelEv', ev, ...st, phase: d.phase, mine: needP });
  send(d.b.ws, { t: 'duelEv', ev: ev.map(swapSide), over: B.over, result: swapSide({ result: B.result }).result, phase: d.phase, mine: needF });
  if (B.over) { d.a.duel = d.b.duel = null; }
}
function duelMsg(s, m) {
  const d = s.duel; if (!d) return;
  const side = d.a === s ? 'p' : 'f', B = d.battle;
  if (m.t === 'duelQuit') { d.acts[side] = { t: 'forfeit' }; d.need = new Set(); d.phase = 'act'; const ev = B.pvpTurn(d.acts.p || { t: 'move', i: 0 }, d.acts.f || { t: 'move', i: 0 }); return duelSend(d, ev); }
  if (!d.need.has(side)) return;
  const team = side === 'p' ? B.team : B.foeTeam, cur = side === 'p' ? B.pi : B.fi;
  const okIdx = i => Number.isInteger(i) && team[i] && team[i].hp > 0 && i !== cur;
  if (d.phase === 'act' && m.t === 'duelAct') {
    const a = m.a || {};
    if (a.t === 'switch' && okIdx(a.i)) d.acts[side] = { t: 'switch', i: a.i };
    else if (a.t === 'forfeit') d.acts[side] = { t: 'forfeit' };
    else { const mv = B.mon(side).moves, i = Number.isInteger(a.i) && mv[a.i] && mv[a.i].pp > 0 ? a.i : Math.max(0, mv.findIndex(x => x.pp > 0)); d.acts[side] = { t: 'move', i }; }
    d.need.delete(side);
    if (d.need.size) return;
    const ev = B.turn(d.acts.p, d.acts.f); d.acts = {};
    d.need = new Set([...(B.awaitSwitch ? ['p'] : []), ...(B.awaitSwitchF ? ['f'] : [])]);
    d.phase = d.need.size ? 'switch' : 'act';
    if (!d.need.size) d.need = new Set(['p', 'f']);
    return duelSend(d, ev);
  }
  if (d.phase === 'switch' && m.t === 'duelSwitch' && okIdx(m.i)) {
    d.pend.push(...B.forcedSwitch(m.i, side));
    d.need.delete(side);
    if (d.need.size) return;
    const ev = d.pend; d.pend = []; d.phase = 'act'; d.need = new Set(['p', 'f']);
    return duelSend(d, ev);
  }
}

function tradeMsg(s, m) {
  const tr = s.trade; if (!tr) return;
  const other = tr.a === s ? tr.b : tr.a;
  const cancel = why => { tr.a.trade = tr.b.trade = null; send(tr.a.ws, { t: 'tradeCancel', why }); send(tr.b.ws, { t: 'tradeCancel', why }); };
  if (m.t === 'tradeCancel') return cancel(`${nameOf(s)} hat den Tausch abgebrochen.`);
  if (m.t === 'tradeOffer') {
    if (!validMon(m.mon)) return cancel('Ungültiges Angebot.');
    tr.offer.set(s, m.mon); tr.ok.clear();
    send(other.ws, { t: 'tradeOffered', name: nameOf(s) });
    if (tr.offer.size === 2) for (const x of [tr.a, tr.b]) send(x.ws, { t: 'tradeShow', mine: tr.offer.get(x), theirs: tr.offer.get(x === tr.a ? tr.b : tr.a) });
    return;
  }
  if (m.t === 'tradeOk') {
    if (tr.offer.size < 2) return;
    if (!m.ok) return cancel(`${nameOf(s)} möchte doch nicht tauschen.`);
    tr.ok.set(s, true);
    if (tr.ok.size < 2) return;
    const A = tr.offer.get(tr.a), Bm = tr.offer.get(tr.b);
    tr.a.trade = tr.b.trade = null;
    send(tr.a.ws, { t: 'tradeDone', give: A.uid, get: { ...Bm, ot: Bm.ot || nameOf(tr.b) } });
    send(tr.b.ws, { t: 'tradeDone', give: Bm.uid, get: { ...A, ot: A.ot || nameOf(tr.a) } });
  }
}
function endSocial(s, why) {
  if (s.duel) { const d = s.duel; const side = d.a === s ? 'p' : 'f'; d.need = new Set(); const ev = d.battle.pvpTurn(side === 'p' ? { t: 'forfeit' } : { t: 'move', i: 0 }, side === 'f' ? { t: 'forfeit' } : { t: 'move', i: 0 }); try { duelSend(d, ev); } catch {} d.a.duel = d.b.duel = null; }
  if (s.trade) { const tr = s.trade; tr.a.trade = tr.b.trade = null; const o = tr.a === s ? tr.b : tr.a; send(o.ws, { t: 'tradeCancel', why: 'Verbindung zum Tauschpartner verloren.' }); }
  for (const o of live.values()) if (o.req?.to === s.pid) { o.req = null; send(o.ws, { t: 'reqNo', why: 'Spieler hat die Welt verlassen.' }); }
  s.req = null;
}

server.listen(PORT, () => console.log(`Legends United Server läuft auf Port ${PORT}`));
