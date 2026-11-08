# ✦ Aetherwild Online (Project Aether)

Eigenständiges 2D-Online-Kreaturen-MMORPG im Browser und auf dem iPhone. Eigene Welt (Lumara), eigene Kreaturen (Wildlinge), eigene Story. Spielprinzip angelehnt an klassische Handheld-RPGs bzw. MMOs wie PRO, aber **ohne** fremde Inhalte.

**Stand: Fundament 0.1** – Konzept komplett (Meilenstein 1), technisches Fundament spielbar und getestet (Meilenstein 2).

Was jetzt **wirklich funktioniert**:
- Registrierung und Login (scrypt, Sitzungs-Tokens, Rate-Limit)
- Charaktere: bis 3 pro Account, Aussehen, Partnerwahl. Der Server würfelt die Werte des Starters.
- Persistente Welt mit 2 Karten (Funkenrast, Route 1) und Kartenwechsel
- Mehrere Spieler gleichzeitig sichtbar. Die Bewegung ist serverautoritativ, mit Vorhersage und Speedhack-Schutz.
- Chat: Karte, Welt, Flüstern (`/w Name Text`), mit Spam-Bremse
- Position und Daten überstehen Neuverbindung und Serverneustart (SQLite)

Was **noch nicht** existiert: Kämpfe, Fangen, NPCs, Quests, Handel, Gilden. Das kommt laut [Roadmap](docs/DEVELOPMENT_ROADMAP.md), nächster Schritt ist der Vertical Slice.

## Starten
```bash
cd aether/server && npm install && npm start   # → http://localhost:8070
npm test                                       # 17 Tests
node ../tools/e2e.cjs /tmp/e2e.png             # Browser-Test mit zwei Spielern
```
Den Client auf GitHub Pages (`/aether/client/`) startest du mit `?server=https://dein-server`.

## Dokumente
- [Game Design Document](docs/GAME_DESIGN_DOCUMENT.md): Analyse, Vision, Marke, Systeme, Elementtabelle
- [World Design Document](docs/WORLD_DESIGN_DOCUMENT.md): Lore, Mythologie, Zeitlinie, Fraktionen, Kontinente, Weltkarte, Story, 10 Wildlinge
- [Technische Architektur](docs/TECHNICAL_ARCHITECTURE.md): Technologievergleich, Entscheidung, Multiplayer, Sicherheit, Risiken
- [Datenbankschema](docs/DATABASE_SCHEMA.md) · [Roadmap und Aufwand](docs/DEVELOPMENT_ROADMAP.md) · [Testanleitung](docs/TESTING_GUIDE.md) · [Art Style Guide](docs/ASSET_GUIDE.md) · [Changelog](CHANGELOG.md)
