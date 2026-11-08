// Persistenz. Entwicklung/Tests: eingebautes SQLite (node:sqlite, keine Abhängigkeit).
// Produktion: PostgreSQL über denselben Repository-Schnitt (siehe docs/DATABASE_SCHEMA.md, Meilenstein 4).
// Alle Abfragen sind vorbereitete Statements – keine String-Verkettung mit Nutzereingaben.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const MIGRATIONS = [
  `CREATE TABLE accounts (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     username TEXT NOT NULL UNIQUE COLLATE NOCASE,
     pass_hash TEXT NOT NULL,
     role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player','mod','gm','admin')),
     banned_until INTEGER,
     created_at INTEGER NOT NULL
   );
   CREATE TABLE sessions (
     token_hash TEXT PRIMARY KEY,
     account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
     created_at INTEGER NOT NULL,
     expires_at INTEGER NOT NULL
   );
   CREATE INDEX sessions_account ON sessions(account_id);
   CREATE TABLE characters (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
     name TEXT NOT NULL UNIQUE COLLATE NOCASE,
     look TEXT NOT NULL,
     map TEXT NOT NULL, x INTEGER NOT NULL, y INTEGER NOT NULL, dir TEXT NOT NULL DEFAULT 'd',
     money INTEGER NOT NULL DEFAULT 3000 CHECK (money >= 0),
     created_at INTEGER NOT NULL, last_seen INTEGER
   );
   CREATE TABLE creatures (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     owner_id INTEGER NOT NULL REFERENCES characters(id),
     original_owner_id INTEGER NOT NULL,
     species INTEGER NOT NULL,
     slot INTEGER,            -- 0–5 = Team, NULL = Box
     data TEXT NOT NULL,      -- Level, Anlagen, Wesen, Attacken … (JSON, serverseitig erzeugt)
     version INTEGER NOT NULL DEFAULT 1, -- optimistisches Sperren für Handel
     created_at INTEGER NOT NULL
   );
   CREATE INDEX creatures_owner ON creatures(owner_id);
   CREATE TABLE inventory (
     character_id INTEGER NOT NULL REFERENCES characters(id),
     item TEXT NOT NULL,
     qty INTEGER NOT NULL CHECK (qty >= 0),
     PRIMARY KEY (character_id, item)
   );
   CREATE TABLE audit_log (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     ts INTEGER NOT NULL, actor INTEGER, kind TEXT NOT NULL, detail TEXT
   );`,
];

export function openDb(file) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (v INTEGER NOT NULL)');
  let v = db.prepare('SELECT v FROM schema_version').get()?.v;
  if (v === undefined) { db.exec('INSERT INTO schema_version VALUES (0)'); v = 0; }
  for (let i = v; i < MIGRATIONS.length; i++) {
    tx(db, () => { db.exec(MIGRATIONS[i]); db.prepare('UPDATE schema_version SET v = ?').run(i + 1); });
  }
  return db;
}

/** Transaktion: alles oder nichts. Grundlage für sicheren Handel (Meilenstein 7). */
export function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

export function audit(db, actor, kind, detail) {
  db.prepare('INSERT INTO audit_log (ts, actor, kind, detail) VALUES (?, ?, ?, ?)').run(Date.now(), actor ?? null, kind, JSON.stringify(detail ?? null));
}
