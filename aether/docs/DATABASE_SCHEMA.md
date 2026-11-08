# Datenbankschema

Migrationen liegen in `server/src/db.js` (`MIGRATIONS`, versioniert über `schema_version`). Alle Zeitstempel sind Millisekunden (UTC).

**Legende:** ✅ = umgesetzt (Migration 1) · 🔜 = geplant mit Meilenstein

## Umgesetzt (Migration 1)

### accounts ✅
| Spalte | Typ | Hinweis |
|---|---|---|
| id | INTEGER PK | |
| username | TEXT UNIQUE NOCASE | 3–16 Zeichen |
| pass_hash | TEXT | `scrypt$salt$hash` |
| role | TEXT | player / mod / gm / admin (CHECK) |
| banned_until | INTEGER NULL | Sperre bis |
| created_at | INTEGER | |

Bewusst **keine** E-Mail-Pflicht (Datensparsamkeit). Eine E-Mail wird später optional für die Passwort-Wiederherstellung.

### sessions ✅
| Spalte | Typ | Hinweis |
|---|---|---|
| token_hash | TEXT PK | SHA-256 des Tokens; das Token selbst wird nie gespeichert |
| account_id | FK accounts | |
| created_at, expires_at | INTEGER | 30 Tage |

### characters ✅
| Spalte | Typ | Hinweis |
|---|---|---|
| id | INTEGER PK | |
| account_id | FK accounts | max. 3 pro Account (in Transaktion geprüft) |
| name | TEXT UNIQUE NOCASE | |
| look | TEXT (JSON) | `{body, hair, color}` |
| map, x, y, dir | | letzte Position (gespeichert bei Kartenwechsel, alle 30 s, beim Trennen und Herunterfahren) |
| money | INTEGER CHECK ≥ 0 | |
| created_at, last_seen | INTEGER | |

### creatures ✅
| Spalte | Typ | Hinweis |
|---|---|---|
| id | INTEGER PK | eindeutige Exemplar-ID |
| owner_id | FK characters | aktueller Besitzer |
| original_owner_id | INTEGER | Original-Trainer (bleibt beim Tausch) |
| species | INTEGER | Art-ID |
| slot | INTEGER NULL | 0–5 = Team, NULL = Box |
| data | TEXT (JSON) | Level, EP, Anlagen, Training, Wesen, Attacken, Bindung, Schimmer |
| version | INTEGER | optimistisches Sperren (Handel) |
| created_at | INTEGER | |

`data` liegt als JSON vor, damit neue Kreatur-Felder keine Migration brauchen. Spalten, nach denen gesucht wird (`species`, `owner_id`), sind echte Spalten mit Index. In Postgres wird daraus `JSONB`.

### inventory ✅
`(character_id, item)` PK, `qty` CHECK ≥ 0. Durch die CHECK-Bedingung schlägt jede Abbuchung unter null fehl, und die Transaktion wird zurückgerollt.

### audit_log ✅
`id, ts, actor, kind, detail(JSON)`: Registrierung, Charaktererstellung, später Handel, Admin-Aktionen, seltene Funde.

## Geplant

| Tabelle | Zweck | Meilenstein |
|---|---|---|
| friends `(a, b, status, since)` | Freundesliste, Anfragen, Blockieren (`status = 'blocked'`) | 🔜 4 |
| parties `(id, leader)`, party_members | Gruppen (RAM, nur für Wiederverbindung persistent) | 🔜 4 |
| chat_reports `(id, reporter, target, msg, ts, handled_by)` | Moderation | 🔜 4 |
| flags `(character_id, key, value)` | Story- und Quest-Flags | 🔜 5 |
| quests `(character_id, quest_id, step, progress JSON, done_at)` | Questfortschritt | 🔜 5 |
| dex `(character_id, species, seen, caught, research JSON)` | Bestiarium | 🔜 5 |
| trades `(id, a, b, offer_a JSON, offer_b JSON, ts)` | unveränderliche Handelsübersicht | 🔜 7 |
| market_listings `(id, seller, kind, ref, price, expires_at, status)` | Handelshaus | 🔜 7 |
| guilds, guild_members `(guild_id, character_id, rank)`, guild_ranks | Gilden | 🔜 7 |
| ratings `(character_id, season, rating, rd, wins, losses)` | Rangliste (Glicko-2) | 🔜 7 |
| events `(id, starts, ends, scope JSON, effects JSON, created_by)` | Eventsystem | 🔜 8 |
| achievements `(character_id, key, at)` | Erfolge | 🔜 8 |
| professions `(character_id, kind, level, exp)` | Berufe | 🔜 8 |
| metrics_daily `(day, key, value)` | aggregierte Analytics, ohne Personenbezug | 🔜 8 |

## Backups (Produktion)
- `pg_dump` nächtlich, 14 Tage aufbewahrt, und einmal pro Woche außerhalb des Servers gespeichert (z. B. Hetzner Storage Box).
- Wiederherstellung wird pro Release-Kandidat geprobt.
