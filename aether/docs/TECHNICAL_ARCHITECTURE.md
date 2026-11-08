# Technische Architektur

## 1. Architekturentscheidung (ADR-001)

### Ausgangslage
- Der Hauptnutzer spielt auf dem **iPhone**, und zwar als Web-App über „Zum Home-Bildschirm“. Android ist zweitrangig.
- Im Repository existieren bereits bewährte Bausteine:
  - Canvas-Engines (Legends United, Sternflut)
  - Node.js-WebSocket-Server auf Render
  - Veröffentlichung über GitHub Pages
- Das Budget ist anfangs nahe null. Das Team besteht aus einer Person plus KI-Unterstützung.

### Verglichene Optionen

| Kriterium | **A: Godot 4 + Nakama + PostgreSQL** (Vorschlag aus dem Auftrag) | **B: Web-Client (Canvas/JS) + eigener Node.js-Server + PostgreSQL** | C: Unity + Photon/Mirror |
|---|---|---|---|
| iPhone als Web-App | Godot-Web-Export auf iOS-Safari: große WASM-Datei (30+ MB), Threads/Audio-Eigenheiten, kein stabiler Offline-Start | Nativ: wenige 100 KB, startet sofort, Updates über `sw.js` | Web-Export schwer, sonst App Store nötig |
| Gemeinsame Spielregeln Client/Server | GDScript im Client, Nakama-Logik in Go/TS/Lua: **doppelte** Kampflogik | **Ein** Satz JS-Module (`shared/`), läuft im Browser und in Node | C#-Server möglich, aber Lizenz/Photon-Kosten |
| Fertige MMO-Bausteine | Nakama bietet Auth, Chat, Gruppen, Matchmaking, Leaderboards | Selbst bauen (Auth, Chat schon fertig), weitere Bausteine sind überschaubar | Photon: Räume, kein persistentes MMO |
| Hosting / Kosten | Nakama + Postgres/Cockroach: VPS nötig (ab ca. 5–10 €/Monat), kein Gratis-Tarif sinnvoll | Ein Node-Prozess + Postgres: VPS ab ca. 4 €/Monat oder Render/Neon gratis zum Testen | Photon CCU-Preise |
| Vorhandenes Wissen und Code | Neu für dieses Projekt | Engine, Tests, Deploy und PWA existieren bereits | Neu |
| Skalierung | Sehr gut (Cluster) | Gut bis ca. 500–1000 gleichzeitige Spieler pro Prozess; danach Zonen-Server + Redis | Gut |
| Bauzeit bis Vertical Slice | lang (zwei Codebasen) | **kurz** | lang |

### Entscheidung: **Option B**
Gründe:
1. Das iPhone-Ziel spricht klar dagegen, Godot im Web zu nutzen.
2. Gemeinsame Regel-Module verhindern Abweichungen zwischen Client und Server. Das ist für Kämpfe, Fangen und Handel sicherheitsrelevant.
3. Kein Build-Schritt und keine schweren Abhängigkeiten (Server: nur `ws`).
4. Das Wissen aus Legends United und Sternflut lässt sich wiederverwenden.

**Offene Tür:** Das Protokoll ist JSON mit Versionsnummer. Ein späterer nativer Client (Godot oder Capacitor) kann denselben Server benutzen. Sollte die Spielerzahl über ca. 1000 gleichzeitige Spieler steigen, wird die Welt in Zonen-Prozesse aufgeteilt (siehe §5). Die Datenbank bleibt PostgreSQL.

### Datenbank (ADR-002)
- **Entwicklung und Tests: SQLite** über das eingebaute `node:sqlite`. Es braucht keine Installation, Tests laufen in Sekunden, und Absturz- und Neustart-Szenarien sind echt testbar.
- **Produktion: PostgreSQL.** Das Schema ist bewusst portabel gehalten (Standard-SQL, CHECK-Constraints, keine SQLite-Spezialitäten außer `AUTOINCREMENT`, das zu `GENERATED ALWAYS AS IDENTITY` wird). Der Zugriff läuft über ein Repository-Modul (`accounts.js` …). In Meilenstein 4 kommt ein `pg`-Adapter mit identischer Schnittstelle hinzu, und die Integrationstests laufen dann gegen beide Datenbanken.
- **Redis:** zunächst nicht nötig. Es wird erst bei mehreren Zonen-Prozessen gebraucht, für Pub/Sub von Chat und Präsenz.

### Hosting (Entscheidung mit Kostenfolgen – Empfehlung, Nutzer entscheidet)

| Variante | Kosten | Eignung |
|---|---|---|
| Render Free + Neon Free (Postgres) | 0 € | Gut zum Testen mit Freunden. **Render schläft nach 15 min ein**, also kein echtes MMO-Gefühl. |
| **Hetzner CX22 (2 vCPU, 4 GB) + Postgres auf demselben Server, Docker Compose** | ca. 4–5 €/Monat | **Empfehlung ab der geschlossenen Testphase.** Immer wach, eigene Backups. |
| Managed (Fly.io/Railway + Supabase) | ca. 10–25 €/Monat | Komfortabel, teurer |

Der Client liegt kostenlos auf GitHub Pages. Er verbindet sich mit der Serveradresse, die eingestellt ist (`?server=` oder das Eingabefeld beim Start).

## 2. Aufbau des Repositorys

```
aether/
  shared/       Spielregeln und Daten – identisch in Browser und Node (ES-Module, keine Abhängigkeiten)
    types.js      14 Elemente + Effektivitätstabelle
    stats.js      Werteformel, Wesenszüge, EP-Kurven, seedbarer Zufall
    creatures.js  Bestiarium (Daten)
    moves.js      Attacken (Daten)
    mon.js        Exemplar-Erzeugung (nur Server ruft sie mit echtem Zufall auf)
    maps.js       Karten, Kollision, Übergänge, Begegnungstabellen
    protocol.js   Nachrichtenformat + Validierung jeder Client-Nachricht
  server/
    src/server.js    HTTP (REST + statische Dateien) + WebSocket /ws
    src/db.js        Verbindung, Migrationen, Transaktionen, Audit-Log
    src/accounts.js  Accounts, Sitzungen, Charaktere
    src/world.js     Karteninstanzen, Bewegung, Chat, Rate-Limits
    test/            Unit- und Integrationstests (node:test)
  client/
    index.html, style.css
    js/net.js    REST + WebSocket
    js/world.js  Rendering, Eingabe, Vorhersage, Interpolation
    js/art.js    prozedurale Pixel-Art
    js/main.js   Bildschirmfluss (Login → Charakter → Welt)
  tools/        e2e.cjs (zwei Browser-Spieler), typechart.mjs
  docs/         alle Konzept- und Technikdokumente
```

## 3. Multiplayer-Konzept

### Verbindung
1. `POST /api/login` → Sitzungs-Token (32 Byte Zufall, in der DB nur als SHA-256 gespeichert, 30 Tage gültig).
2. `GET /api/characters` → Charakterwahl.
3. WebSocket `/ws`. Die erste Nachricht muss innerhalb von 10 s `hello {token, charId, v}` sein, sonst wird getrennt.
4. Der Server prüft, ob Token und Charakter zum Account passen, und antwortet mit `welcome` (eigene Daten, Team, Inventar, alle Spieler der Karte).

### Nachrichten (Version 1)

| Richtung | Typ | Inhalt |
|---|---|---|
| C→S | `move` | `d` (u/d/l/r), `s` (Sequenznummer) – nur eine **Absicht** |
| C→S | `face` | Blickrichtung |
| C→S | `chat` | `ch` (map/global/whisper), `msg`, `to` |
| C→S | `ping` | `n` |
| S→C | `welcome` / `warp` | Karte, Position, Spieler der Karte |
| S→C | `ack` | Sequenz, bestätigte Position, `ok`, `why` (speed/blocked) |
| S→C | `join` / `leave` / `mv` | andere Spieler betreten, verlassen, bewegen sich |
| S→C | `chat` / `err` / `pong` | |

### Autoritative Bewegung
- Die Welt ist ein Kachelraster. Der Client **sagt voraus**: Er läuft sofort los (200 ms pro Kachel) und schickt `move`.
- Der Server prüft:
  1. das Tempo (Token-Bucket: 3 Schritte Puffer, 1 neuer alle 170 ms)
  2. Kollision mit Karte und Spielern (Spieler nur außerhalb von Städten)
  3. Kartenränder und Übergänge
- Bei Ablehnung kommt `ack ok:false` mit der echten Position, und der Client setzt zurück.
- Andere Spieler werden zwischen bestätigten Kacheln **interpoliert**.
- Teleport, Speedhack und Laufen durch Wände sind damit unmöglich. Der Test „Speedhack“ belegt das.

### Instanzen und Sichtbarkeit
- Jede Karte ist eine Instanz (`World.maps`), und Nachrichten gehen nur an Spieler derselben Karte.
- **Später (ab ca. 100 Spieler pro Karte):** Instanz-Kanäle (Kanal 1, 2 …) und eine Sichtbarkeits-Zelle von 20×20 Kacheln.
- **Doppelanmeldung:** Eine neue Verbindung verdrängt die alte. So entsteht nie ein Charakter zweimal in der Welt, was Duplikate verhindern hilft.

### Zukünftige Skalierung
1. Ein Prozess mit allen Karten (heute).
2. Zonen-Prozesse pro Kontinent, ein Gateway leitet Sockets weiter, Chat und Präsenz laufen über Redis Pub/Sub.
3. Kampf-Worker als eigene Prozesse (Kämpfe sind reine Funktionen, also leicht auszulagern).

## 4. Serverseitige Autorität – was der Client NIE bestimmt

| Bereich | Wie gesichert |
|---|---|
| Kreaturenwerte | `createMon` läuft nur auf dem Server mit `crypto.randomInt`. Der Client sendet nur die Starter-ID, die gegen eine Whitelist geprüft wird. |
| Startgeld, Inventar | Feste Serverwerte. Zusätzliche Felder in Anfragen werden ignoriert (Test: `money: 999999` wirkt nicht). |
| Bewegung | siehe §3 |
| Kämpfe, EP, Beute (Meilenstein 3) | Kampf-Engine auf dem Server. Der Client schickt nur die gewählte Aktion. |
| Quests (Meilenstein 5) | Der Fortschritt kommt aus Server-Ereignissen. |
| Handel (Meilenstein 7) | siehe §6 |

## 5. Sicherheit

**Umgesetzt und getestet:**
- scrypt-Passwort-Hashes mit Salt; Vergleich mit `timingSafeEqual`.
- Gleiche Fehlermeldung für unbekannten Namen und falsches Passwort (keine Account-Aufzählung).
- Rate-Limits:
  - Login/Registrierung: 10 Versuche, dann 1 pro 6 s pro IP
  - WebSocket: ca. 20 Nachrichten/s
  - Chat: 5 Nachrichten pro 10 s
- Eingabevalidierung jeder Nachricht in `protocol.js`: Whitelist der Typen und Felder, Längen, Regex für Namen.
- Grenzen: max. 2 KB pro WebSocket-Nachricht, 4 KB pro REST-Body. Nach 20 ungültigen Nachrichten wird getrennt.
- Steuer- und unsichtbare Zeichen werden aus dem Chat entfernt. Der Client fügt Chat **nur als Text** ein (`textContent`), also kein XSS.
- Statische Auslieferung nur aus `client/` und `shared/`. Path-Traversal ist getestet.
- Vorbereitete SQL-Statements überall.
- CORS nur für die eigene Pages-Domain und localhost.
- Sperren (`banned_until`) greifen beim Login und bei jeder Token-Prüfung.

**Geplant:**
- HTTPS/WSS über einen Reverse-Proxy (Caddy) in Produktion.
- Token-Rotation.
- Moderationsrollen (`role`: player/mod/gm/admin).
- Admin-Aktionen im `audit_log`.
- Wortfilter (konfigurierbar).
- Replay-Schutz für Handel über Sequenznummern und Versionsfelder.

## 6. Handel ohne Duplikate (Entwurf für Meilenstein 7)
1. Beide Seiten legen Angebote in eine serverseitige `trade`-Sitzung (nur im RAM, an Socket gebunden).
2. Jede Änderung setzt beide Bestätigungen zurück. Nach „bereit“ auf beiden Seiten gilt eine Sperre von 3 s, dann folgt die endgültige Bestätigung.
3. Ausführung in **einer** DB-Transaktion (`tx()`):
   - Besitz prüfen mit `UPDATE creatures SET owner_id=?, version=version+1 WHERE id=? AND owner_id=? AND version=?`. Wenn nicht genau 1 Zeile betroffen ist, wird alles zurückgerollt.
   - Geld und Items mit CHECK `qty >= 0` und `money >= 0`.
   - Eine unveränderliche Zeile in `trades` plus Eintrag im `audit_log`.
4. Bei Verbindungsabbruch vor dem Commit passiert nichts. Danach ist alles vollständig erledigt, denn es gibt keinen Zwischenzustand.
5. Tests: parallele Doppelangebote desselben Exemplars, Abbruch mitten im Ablauf, Neustart.

## 7. Technische Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmaßnahme |
|---|---|---|---|
| Umfang (MMO + 500 Arten + 3 Kontinente) übersteigt die Kapazität | hoch | hoch | Vertical Slice zuerst, Inhalte als Daten, Generator-Werkzeuge für Karten und Sprites |
| Kostenloses Hosting schläft ein, Daten gehen verloren | hoch | mittel | Ab der Testphase VPS mit Postgres und täglichem Backup |
| Exploits (Duping, Speedhack, Bots) | mittel | hoch | Server-Autorität, Transaktionen, Audit-Log, Rate-Limits, Tests pro Exploit-Klasse |
| iOS-Safari-Eigenheiten (WebSocket im Hintergrund, Audio) | hoch | mittel | Automatisches Wiederverbinden; Position liegt auf dem Server, nicht im Client |
| `node:sqlite` ist experimentell | mittel | gering | Nur für Entwicklung und Tests; Produktion läuft mit Postgres |
| Einzelprozess als Engpass | gering (anfangs) | mittel | Zonen-Aufteilung vorbereitet (Karten-Instanzen sind schon isoliert) |
| Markenrecht (Ähnlichkeit zu bekannten Kreaturen) | mittel | hoch | Eigene Bauplan-Silhouetten, Prüfliste im ASSET_GUIDE |
| Moderation und Jugendschutz im Chat | mittel | hoch | Melden-Funktion, Mods, Wortfilter, Blockieren vor dem öffentlichen Start |
| DSGVO | sicher | mittel | Datensparsamkeit (kein E-Mail-Zwang), Löschfunktion, Datenschutzerklärung vor dem öffentlichen Start |
