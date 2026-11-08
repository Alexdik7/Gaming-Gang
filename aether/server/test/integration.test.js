// Integrationstests: echter Server, echte WebSockets, SQLite-Datei. Prüft Login, Charaktere,
// Mehrspieler-Sichtbarkeit, autoritative Bewegung, Anti-Speedhack, Chat, Neustart-Persistenz, Sicherheit.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';
import { startServer } from '../src/server.js';
import { PROTOCOL_VERSION } from '../../shared/protocol.js';

const dir = mkdtempSync(join(tmpdir(), 'aether-'));
const dbFile = join(dir, 'test.db');
let srv, base;

async function boot() { srv = await startServer({ port: 0, dbFile, quiet: true }); base = `http://127.0.0.1:${srv.port}`; }
before(boot);
after(() => { srv.close(); rmSync(dir, { recursive: true, force: true }); });

async function api(path, body, token, method = body ? 'POST' : 'GET') {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) }, body: body && JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
}

function connect(token, charId) {
  const ws = new WebSocket(base.replace('http', 'ws') + '/ws');
  const inbox = [], waiters = [];
  ws.on('message', (d) => {
    const m = JSON.parse(d);
    const i = waiters.findIndex((w) => w.pred(m));
    if (i >= 0) waiters.splice(i, 1)[0].ok(m); else inbox.push(m);
  });
  const c = {
    ws,
    send: (m) => ws.send(JSON.stringify(m)),
    next: (pred, ms = 2000) => {
      const i = inbox.findIndex(pred);
      if (i >= 0) return Promise.resolve(inbox.splice(i, 1)[0]);
      return new Promise((ok, no) => { waiters.push({ pred, ok }); setTimeout(() => no(new Error('timeout')), ms); });
    },
    closed: new Promise((ok) => ws.on('close', (code) => ok(code))),
  };
  ws.on('open', () => c.send({ t: 'hello', token, charId, v: PROTOCOL_VERSION }));
  return c;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const look = { body: 1, hair: 2, color: 3 };
let A, B;

async function step(c, d, s) { c.send({ t: 'move', d, s }); const k = await c.next((m) => (m.t === 'ack' && m.s === s) || m.t === 'warp'); await sleep(185); return k; }

test('Registrierung, Login, Fehlerfälle', async () => {
  assert.equal((await api('/api/register', { username: 'Alex', password: 'kurz' })).status, 400);
  let r = await api('/api/register', { username: 'Alex', password: 'sicher123' });
  assert.equal(r.status, 200); assert.ok(r.body.token);
  assert.equal((await api('/api/register', { username: 'alex', password: 'sicher123' })).status, 409);
  assert.equal((await api('/api/login', { username: 'Alex', password: 'falsch123' })).status, 401);
  assert.equal((await api('/api/login', { username: 'Niemand', password: 'falsch123' })).body.error, 'bad_login');
  r = await api('/api/login', { username: 'Alex', password: 'sicher123' });
  assert.equal(r.status, 200);
  A = { token: r.body.token };
  B = { token: (await api('/api/register', { username: 'Mia', password: 'sicher456' })).body.token };
  assert.equal((await api('/api/characters', null, 'falsch')).status, 401);
});

test('Charaktererstellung: Validierung, Starter vom Server gewürfelt', async () => {
  assert.equal((await api('/api/characters', { name: 'X', look, starter: 1 }, A.token)).status, 400);
  assert.equal((await api('/api/characters', { name: 'Funki', look: { body: 9, hair: 0, color: 0 }, starter: 1 }, A.token)).status, 400);
  assert.equal((await api('/api/characters', { name: 'Funki', look, starter: 8 }, A.token)).status, 400, 'kein Nicht-Starter');
  let r = await api('/api/characters', { name: 'Funki', look: { ...look, admin: true }, starter: 1, money: 999999 }, A.token);
  assert.equal(r.status, 200);
  A.char = r.body.character;
  assert.equal(A.char.money, 3000);
  assert.equal(A.char.look.admin, undefined);
  assert.equal((await api('/api/characters', { name: 'funki', look, starter: 3 }, B.token)).status, 409);
  B.char = (await api('/api/characters', { name: 'Miaflo', look, starter: 3 }, B.token)).body.character;
  r = await api('/api/characters', null, A.token);
  assert.deepEqual(r.body.characters.map((c) => c.name), ['Funki']);
});

test('Fremder Charakter wird am Socket abgewiesen', async () => {
  const c = connect(A.token, B.char.id);
  assert.equal((await c.next((m) => m.t === 'err')).code, 'auth');
  assert.equal(await c.closed, 4003);
});

test('Zwei Spieler sehen sich, Bewegung ist autoritativ, Chat funktioniert', async () => {
  const a = connect(A.token, A.char.id);
  const wa = await a.next((m) => m.t === 'welcome');
  assert.equal(wa.map, 'funkenrast');
  assert.equal(wa.team.length, 1); assert.equal(wa.team[0].species, 1); assert.equal(wa.team[0].level, 5);
  const b = connect(B.token, B.char.id);
  const wb = await b.next((m) => m.t === 'welcome');
  assert.ok(wb.players.some((p) => p.name === 'Funki'), 'B sieht A');
  assert.equal((await a.next((m) => m.t === 'join')).p.name, 'Miaflo');

  const k = await step(a, 'd', 1);
  assert.deepEqual([k.ok, k.x, k.y], [true, 12, 8]);
  const mv = await b.next((m) => m.t === 'mv' && m.id === A.char.id);
  assert.deepEqual([mv.x, mv.y], [12, 8]);

  // Speedhack: 10 Schritte auf einmal → höchstens Burst (3) erlaubt
  await sleep(600);
  for (let i = 0; i < 10; i++) a.send({ t: 'move', d: 'd', s: 10 + i });
  const acks = [];
  for (let i = 0; i < 10; i++) acks.push(await a.next((m) => m.t === 'ack' && m.s === 10 + i));
  const okSteps = acks.filter((x) => x.ok).length;
  assert.ok(okSteps >= 1 && okSteps <= 3, `Schritte erlaubt: ${okSteps}`);
  assert.ok(acks.some((x) => x.why === 'speed'));
  A.lastY = 8 + okSteps;
  assert.equal(acks.at(-1).y, A.lastY, 'abgelehnte Schritte melden die echte Position');

  a.send({ t: 'chat', ch: 'map', msg: 'Hallo <b>Mia</b>' });
  const ch = await b.next((m) => m.t === 'chat');
  assert.deepEqual([ch.from, ch.msg, ch.ch], ['Funki', 'Hallo <b>Mia</b>', 'map']); // Client setzt Text, nie HTML
  b.send({ t: 'chat', ch: 'whisper', to: 'funki', msg: 'psst' });
  assert.equal((await a.next((m) => m.t === 'chat' && m.ch === 'whisper')).msg, 'psst');
  b.send({ t: 'chat', ch: 'whisper', to: 'Niemand', msg: 'hallo' });
  assert.equal((await b.next((m) => m.t === 'err')).code, 'offline');
  for (let i = 0; i < 8; i++) a.send({ t: 'chat', ch: 'global', msg: 'spam ' + i });
  assert.equal((await a.next((m) => m.t === 'err')).code, 'chat_rate');

  a.ws.close();
  assert.equal((await b.next((m) => m.t === 'leave')).id, A.char.id);
  b.ws.close(); await sleep(100);
});

test('Position bleibt gespeichert, Wände blockieren, Kartenwechsel', async () => {
  const a = connect(A.token, A.char.id);
  const w = await a.next((m) => m.t === 'welcome');
  assert.equal(w.y, A.lastY, 'Position nach Neuverbindung');
  let s = 100;
  for (let y = w.y; y < 14; y++) assert.ok((await step(a, 'd', ++s)).ok);
  let k;
  do { k = await step(a, 'l', ++s); } while (k.ok);
  assert.deepEqual([k.why, k.x], ['blocked', 1]);
  for (let i = 1; i < 12; i++) assert.ok((await step(a, 'r', ++s)).ok);
  assert.ok((await step(a, 'd', ++s)).ok);
  assert.ok((await step(a, 'd', ++s)).ok);
  const warp = await step(a, 'd', ++s);
  assert.deepEqual([warp.t, warp.map, warp.x, warp.y], ['warp', 'route-1', 7, 14]);
  a.ws.close(); await sleep(100);
});

test('Doppelte Anmeldung verdrängt die alte Verbindung', async () => {
  const a1 = connect(A.token, A.char.id); await a1.next((m) => m.t === 'welcome');
  const a2 = connect(A.token, A.char.id); await a2.next((m) => m.t === 'welcome');
  assert.equal((await a1.next((m) => m.t === 'err')).code, 'replaced');
  assert.equal(srv.world.players.size, 1);
  a2.ws.close(); await sleep(100);
});

test('Serverneustart: Sitzung und Position bleiben erhalten', async () => {
  srv.close(); await boot();
  const r = await api('/api/characters', null, A.token);
  assert.equal(r.status, 200);
  assert.equal(r.body.characters[0].map, 'route-1');
});

test('Sicherheit: keine Server-Dateien, große Anfragen, Müll-Nachrichten', async () => {
  for (const p of ['/server/data/test.db', '/../server/src/db.js', '/%2e%2e/server/src/db.js', '/server/package.json']) {
    assert.equal((await fetch(base + p)).status, 404, p);
  }
  assert.equal((await fetch(base + '/')).status, 200);
  assert.equal((await fetch(base + '/api/login', { method: 'POST', body: 'x'.repeat(10000) })).status, 413);
  const c = connect(A.token, A.char.id); await c.next((m) => m.t === 'welcome');
  for (let i = 0; i < 25; i++) c.ws.send('{"t":"evil"}');
  assert.equal(await c.closed, 4002);
});

test('Login-Rate-Limit', async () => {
  let last;
  for (let i = 0; i < 15; i++) last = await api('/api/login', { username: 'Alex', password: 'falsch123' });
  assert.equal(last.status, 429);
});
