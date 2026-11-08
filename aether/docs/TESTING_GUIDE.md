# Testanleitung

## Einmalig
```bash
cd aether/server && npm install       # nur „ws“
```
Voraussetzung: Node ≥ 22.13 (wegen `node:sqlite`).

## Automatische Tests
```bash
cd aether/server && npm test          # Unit- und Integrationstests (ca. 15 s)
cd aether && node tools/e2e.cjs out.png   # Browser-E2E: zwei Spieler, Kontaktbogen-Screenshot
```

## Was abgedeckt ist

| Datei | Art | Prüft |
|---|---|---|
| `test/unit.test.js` | Unit | Elementtabelle (Vollständigkeit, Stärke und Schwäche je Element, Doppel-Elemente), Werteformel, 25 Wesenszüge, EP-Kurve, Bestiarium-Vollständigkeit, gültige Attacken und Entwicklungen, Individualität der Exemplare, reproduzierbarer Seed, Karten (rechteckig, Spawns, Übergänge, keine Warp-Schleifen), Protokoll-Validierung, Chat-Reinigung, Token-Bucket, Passwort-Hash |
| `test/integration.test.js` | Integration (echter Server, echte WebSockets, SQLite-Datei) | Registrierung und Login inkl. Fehlerfälle; Charaktererstellung mit Manipulationsversuchen (fremde Felder, Geld, Nicht-Starter); fremden Charakter übernehmen; zwei Spieler sehen sich; Bewegung synchron; **Speedhack abgewehrt**; Wände; Kartenwechsel; Chat (Karte, Welt, Flüstern, offline, Spam-Bremse); Position nach Neuverbindung; Doppelanmeldung; **Serverneustart** (Sitzung und Position bleiben); Path-Traversal; übergroße Anfragen; Müll-Nachrichten trennen; Login-Rate-Limit |
| `tools/e2e.cjs` | Browser-E2E (Playwright, Chromium) | Komplette UI: Registrieren → Charakter erstellen → Welt; iPhone-Ansicht und Desktop; Bewegung sichtbar beim anderen Spieler; Chat; keine Konsolenfehler |

## Manuell testen (zwei Spieler)
```bash
cd aether/server && npm start         # http://localhost:8070
```
Zwei Browserfenster öffnen (eines privat), in beiden registrieren, Charakter erstellen und laufen (Pfeiltasten/WASD bzw. Steuerkreuz). Chat-Kurzbefehl zum Flüstern: `/w Name Text`.

Vom iPhone im selben WLAN: `http://<PC-IP>:8070`.

## Regeln für neue Tests
- Jedes neue System: mindestens ein Integrationstest über den echten Server (siehe Definition of Done im GDD).
- Jeder gefundene Exploit bekommt einen Regressionstest, **bevor** er behoben wird.
- Zufall in Tests nur mit festem Seed (`rng(seed)` aus `shared/stats.js`).
- **Geplant:**
  - Lasttest `tools/load.mjs` (N simulierte Clients, Latenz-Perzentile)
  - Handels-Parallelitätstests
  - Postgres-Integrationslauf in CI
