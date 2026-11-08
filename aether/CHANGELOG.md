# Changelog

## 0.1.0 – Fundament (2026-11-08)
### Konzept
- GDD, World Design, technische Architektur mit Technologievergleich (ADR-001/002), Datenbankschema, Roadmap mit Aufwandsschätzung, Art Style Guide, Testanleitung.
- 14 Elemente mit vollständiger, getesteter Effektivitätstabelle. 25 Wesenszüge. Werteformel.
- 10 vollständig ausgearbeitete Wildlinge (Daten, Lore, Lernlisten, Entwicklungen inkl. Bindung bei Nacht), 21 Attacken.
### Technik
- Node.js-Server (HTTP + WebSocket), SQLite-Persistenz mit Migrationen, Transaktionen, Audit-Log.
- Accounts, Sitzungen, Charaktere (max. 3), serverseitig erzeugter Starter.
- Autoritative Kachelbewegung (Token-Bucket), Karteninstanzen, Übergänge, Karten-/Welt-/Flüster-Chat.
- Browser-Client: Login, Charaktererstellung mit Vorschau, Welt mit prozeduraler Pixel-Art, Vorhersage und Interpolation, Touch-Steuerkreuz, Chat.
- Tests: 8 Unit, 9 Integration (inkl. Speedhack, Neustart, Path-Traversal, Rate-Limits), Browser-E2E mit zwei Spielern.
