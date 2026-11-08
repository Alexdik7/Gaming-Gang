import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TYPES, CHART, effectiveness, single } from '../../shared/types.js';
import { calcStat, TEMPERAMENTS, rng, levelForExp, GROWTH } from '../../shared/stats.js';
import { SPECIES, STARTERS } from '../../shared/creatures.js';
import { MOVES } from '../../shared/moves.js';
import { createMon } from '../../shared/mon.js';
import { MAPS, walkable, tileAt } from '../../shared/maps.js';
import { parseClient, cleanText, PROTOCOL_VERSION } from '../../shared/protocol.js';
import { Bucket } from '../src/world.js';
import { hashPassword, verifyPassword } from '../src/accounts.js';

test('Elementtabelle ist vollständig und konsistent', () => {
  assert.equal(TYPES.length, 14);
  for (const t of TYPES) {
    const r = CHART[t];
    const all = [...r.strong, ...r.weak, ...r.none];
    assert.equal(new Set(all).size, all.length, `${t}: Element doppelt eingetragen`);
    for (const d of all) assert.ok(TYPES.includes(d), `${t}: unbekannt ${d}`);
    if (t !== 'WILD') assert.ok(r.strong.length > 0, `${t} braucht eine Stärke`);
    assert.ok(TYPES.some((a) => single(a, t) === 2), `${t} braucht eine Schwäche`);
  }
  assert.equal(effectiveness('FUNKE', ['FLUT', 'WIND']), 4);
  assert.equal(effectiveness('FUNKE', ['FELS', 'FLUT']), 0);
  assert.equal(effectiveness('GLUT', ['FLUT', 'FLOR']), 1);
});

test('Wertformel und Wesenszüge', () => {
  assert.equal(TEMPERAMENTS.length, 25);
  assert.equal(TEMPERAMENTS.filter((t) => !t.up).length, 5);
  assert.equal(calcStat('kp', 50, 50, 31, 0), 125);
  const up = TEMPERAMENTS.find((t) => t.up === 'atk' && t.down === 'ini');
  assert.ok(calcStat('atk', 100, 50, 31, 0, up) > calcStat('atk', 100, 50, 31, 0));
  assert.equal(levelForExp('medium', GROWTH.medium(37)), 37);
});

test('Bestiarium: Daten vollständig, Attacken und Entwicklungen gültig', () => {
  assert.equal(SPECIES.size, 10);
  assert.equal(STARTERS.length, 3);
  for (const s of SPECIES.values()) {
    for (const f of ['name', 'desc', 'lore', 'behavior', 'class', 'rarity', 'sound', 'sprite', 'ability']) assert.ok(s[f], `${s.name}.${f}`);
    for (const [, m] of s.learnset) assert.ok(MOVES[m], `${s.name}: Attacke ${m}`);
    for (const e of s.evolves) assert.ok(SPECIES.has(e.to), `${s.name}: Entwicklung`);
    for (const t of s.types) assert.ok(TYPES.includes(t));
  }
  for (const m of Object.values(MOVES)) assert.ok(TYPES.includes(m.type));
});

test('Exemplare sind individuell und reproduzierbar mit festem Seed', () => {
  const a = createMon(1, 5, rng(1)), b = createMon(1, 5, rng(2)), c = createMon(1, 5, rng(1));
  assert.notDeepEqual(a.ivs, b.ivs);
  assert.deepEqual(a, c);
  assert.equal(a.hp, a.stats.kp);
  assert.ok(a.moves.length >= 2 && a.moves.length <= 4);
});

test('Karten: rechteckig, Spawns begehbar, Übergänge führen auf begehbare Felder', () => {
  for (const [k, m] of Object.entries(MAPS)) {
    assert.equal(new Set(m.rows.map((r) => r.length)).size, 1, k);
    assert.ok(walkable(m, m.spawn.x, m.spawn.y), k + ' spawn');
    for (const w of m.warps) {
      assert.ok(MAPS[w.to], k + ' warp-Ziel');
      assert.ok(walkable(MAPS[w.to], w.tx, w.ty), `${k} → ${w.to}`);
      assert.ok(!MAPS[w.to].warps.some((v) => v.x === w.tx && v.y === w.ty), 'Warp-Schleife');
    }
  }
  assert.equal(tileAt(MAPS.funkenrast, -1, 0), '#');
});

test('Protokoll verwirft Ungültiges', () => {
  assert.equal(parseClient('nope'), null);
  assert.equal(parseClient(JSON.stringify({ t: 'move', d: 'x', s: 1 })), null);
  assert.equal(parseClient(JSON.stringify({ t: 'hello', token: 'a', charId: 1, v: PROTOCOL_VERSION + 1 })), null);
  assert.equal(parseClient(JSON.stringify({ t: 'chat', ch: 'map', msg: '\u0000​ ' })), null);
  assert.equal(parseClient(JSON.stringify({ t: 'chat', ch: 'admin', msg: 'x' })), null);
  assert.deepEqual(parseClient(JSON.stringify({ t: 'move', d: 'l', s: 3, x: 99 })), { t: 'move', d: 'l', s: 3 });
  assert.equal(cleanText('  Hallo\n\nWelt  '), 'Hallo Welt');
});

test('Token-Bucket begrenzt Tempo', () => {
  const b = new Bucket(3, 100); const t = b.t;
  assert.ok(b.take(t) && b.take(t) && b.take(t));
  assert.equal(b.take(t), false);
  assert.ok(b.take(t + 100));
});

test('Passwort-Hash', () => {
  const h = hashPassword('geheim123');
  assert.ok(verifyPassword('geheim123', h));
  assert.ok(!verifyPassword('geheim124', h));
  assert.notEqual(hashPassword('geheim123'), h);
});
