# Entwicklungs-Roadmap

**Legende:** ✅ fertig und getestet · 🔨 in Arbeit · ⬜ offen

## Meilenstein 1 – Projektkonzeption ✅
- ✅ Spielvision, Marke und GDD: [GAME_DESIGN_DOCUMENT.md](GAME_DESIGN_DOCUMENT.md)
- ✅ Weltkonzept, Regionen, Weltkarte und Story: [WORLD_DESIGN_DOCUMENT.md](WORLD_DESIGN_DOCUMENT.md)
- ✅ Kreaturenkonzept mit 10 vollständigen Arten (als Daten in `shared/creatures.js`, testgeprüft)
- ✅ Architekturvergleich und Entscheidung: [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md)
- ✅ Datenmodell: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- ✅ Art Style Guide: [ASSET_GUIDE.md](ASSET_GUIDE.md)

## Meilenstein 2 – Technisches Fundament ✅ (Version 0.1)
- ✅ Repository-Struktur `shared/ server/ client/ tools/ docs/`
- ✅ Server: HTTP und WebSocket auf einem Port, Migrationen, Transaktionen, Audit-Log
- ✅ Registrierung, Login, Sitzungen, Abmelden, Rate-Limit
- ✅ Charakterverwaltung: bis 3 pro Account, Aussehen, Partnerwahl. Der Starter wird vom Server erzeugt.
- ✅ Client: Login, Charakterwahl und -erstellung, Welt mit Touch-Steuerkreuz
- ✅ Client-Server-Verbindung mit autoritativer Bewegung, Vorhersage und Korrektur
- ✅ Zwei Karten (Funkenrast, Route 1) mit Übergang
- ✅ Sichtbare andere Spieler, Karten-, Welt- und Flüster-Chat
- ✅ Tests: 8 Unit-Tests, 9 Integrationstests, Browser-E2E mit zwei Spielern

## Meilenstein 3 – Spielbarer Vertical Slice ⬜ (nächster Schritt)

Definition of Done: Zwei Spieler können gleichzeitig das Folgende durchspielen.

1. ⬜ Kampf-Engine `shared/battle/` als reine Funktion: Schaden, Elemente, STAB, Volltreffer, Genauigkeit, Stufen, Status, Fähigkeiten-Hooks, Protokoll
2. ⬜ Server-Kampf-Sitzungen: Wildbegegnung im hohen Gras (Begegnungstabelle mit Tageszeit/Wetter), Aktionen, Zeitlimit, Abbruch bei Trennung
3. ⬜ Kampf-UI im Client: Intro, KP-Balken, Attackenwahl mit Effektivität, Protokoll-Abspielen
4. ⬜ Fangen: Bindkugeln, Formel, Team/Box, Bestiarium „gesehen/gefangen“
5. ⬜ EP, Level-Up, neue Attacken, Entwicklung (Level + Bindung nachts)
6. ⬜ Dornwald-Karte, Heilzentrum in Funkenrast, Häuser begehbar
7. ⬜ 3 NPCs (Professorin Lindqvist, Schmiedin Brenna, Oma Hedda) mit Dialogen
8. ⬜ Questreihe „Der erste Funke“ (3 Quests) als Daten
9. ⬜ Tag/Nacht-Zyklus und Wetter pro Region (serverseitig, an Clients gesendet)
10. ⬜ Kampf- und Musik-Audio (Synth, aus Legends übernommen und angepasst)
11. ⬜ Tests: Kampf-Unit-Tests (Tabellen), Fang-Statistik (10 000 Würfe), Integrationstest „Begegnung → Fang → Speicherung“ und „Kampfabbruch bei Trennung“

## Meilenstein 4 – MMO-Grundfunktionen ⬜
- PostgreSQL-Adapter, Docker Compose und Integrationstests gegen beide Datenbanken
- Freundesliste, Online-Status, Blockieren, Spielersuche, Profile
- Gruppen (bis 4) mit Gruppenchat, gemeinsamer Koop-Wildkampf
- Automatisches Wiederverbinden (iOS-Hintergrund), Kanäle bei vollen Karten
- Melden und Moderation (mod-Rolle), Wortfilter
- Lasttest: 200 simulierte Clients

## Meilenstein 5 – Kernspielsysteme ⬜
Bestiarium mit Forschung, Inventar und Beutel, Kreaturenboxen, Progression, Fähigkeiten, alle Entwicklungsarten, Quest-Engine (alle Schritt-Typen), NPC-Shops, Funken-Wirtschaft.

## Meilenstein 6 – Welt und Story ⬜
Aurenland komplett (Velmar, Dornwald, Ostmark, Kronsee), Kapitel 1–4, Arenen 1–5, 40 weitere Arten, Aurenruinen-Dungeon, Karten-Editor-Werkzeug (Text-Raster und Vorschau).

## Meilenstein 7 – Sozial und kompetitiv ⬜
Sicherer Handel (siehe Architektur §6), Handelshaus und Auktionen, Gilden, PvP-Freundschaftskampf, Rangliste (Glicko-2, normiert), Turniere.

## Meilenstein 8 – Content-Erweiterung ⬜
Archipel und Frostkamm, Kapitel 5–8, Arenen 6–8, Elite-Liga, über 150 Arten, Berufe und Crafting, Events und Admin-Panel, Raids und Weltbosse, Erfolge.

## Meilenstein 9 – Veröffentlichung ⬜
Performance, Sicherheits-Review, Lasttest mit 500 Clients, VPS mit Backups und Monitoring (Uptime + Logs), Datenschutzerklärung, geschlossene Beta mit Freunden, danach öffentlicher Start.

## Realistische Aufwandsschätzung

Ein „Schritt“ ist eine Arbeitssitzung mit Bau, Tests, Doku und Push.

| Meilenstein | Schritte (geschätzt) | Kommentar |
|---|---|---|
| 1 + 2 | erledigt | diese Sitzung |
| 3 Vertical Slice | 4–6 | Kampf-Engine ist der größte Brocken |
| 4 MMO-Grundlagen | 3–4 | |
| 5 Kernsysteme | 5–7 | |
| 6 Aurenland + Kapitel 1–4 | 8–12 | Inhalt (Karten, Dialoge, Arten) dominiert |
| 7 Sozial/kompetitiv | 5–7 | Handel braucht die meisten Tests |
| 8 Inhalt (2 Kontinente, Liga, Endgame) | 15–25 | |
| 9 Release | 3–5 | dazu laufende Hosting-Kosten ab ca. 5 €/Monat |
| **Summe** | **ca. 45–65 Schritte** | bis zu einem spielbaren MMO mit 3 Kontinenten und ca. 150–200 Arten |

**Ehrliche Einordnung:** Ein kommerzielles MMORPG mit über 500 Arten braucht ein Team über Jahre. Auch mit KI-Unterstützung sind 500–1000 hochwertige Arten (Sprite, Lore, Balancing) ein Langzeitprojekt. Das Fundament ist dafür ausgelegt: Daten-Dateien pro Region, Prüftests und ein Sprite-Baukasten. Realistisches erstes Ziel sind ca. 150 Arten für Version 1.0.
