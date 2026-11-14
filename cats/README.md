# Cats Tower Defense – Paws Against the Pack

Tower-Defense mit Katzen-Soldaten gegen ein Hunderudel. Eigenes Universum, eigene Grafik (alles per Code gezeichnet), eigene Töne (WebAudio). Kein Build, keine Abhängigkeiten außer PeerJS für den Koop-Modus.

- Spielen: https://alexdik7.github.io/Gaming-Gang/cats/
- Lokal: `cd cats && python3 -m http.server 8054` → http://localhost:8054
- Version: `js/config.js` (`VERSION`), Offline-Cache: `sw.js` (`CACHE` bei jeder Änderung erhöhen, neue Dateien in `FILES`)

## Inhalt (v1.0)

| Bereich | Umfang |
|---|---|
| Katzen | 19 (2 legendär), je 3 Upgrade-Pfade × 3 Stufen = 171 Upgrades, 9 Klassen |
| Hunde | 18 Typen + 5 Bosse mit eigenen Fähigkeiten |
| Maps | 10, je Leicht (20 Wellen) / Normal (30) / Schwer (40) + Endlos-Modus |
| Power-ups | 7 |
| Fortschritt | Spielerlevel 1–100, Münzen + Kristalle, Akademie (13 Forschungen + Rang 1–10 je Katze) |
| Täglich | 7-Tage-Belohnung mit Countdown, 3 Missionen pro Tag |
| Erfolge | 14 Erfolge mit Stufen, Statistik |
| Koop | 2–4 Spieler über Raumcode `CAT-1234` |
| Sonstiges | Tutorial, Deutsch/Englisch, Einstellungen, Sicherungs-Code, Offline-PWA |

## Technik-Entscheidungen (kurz begründet)

- **Vanilla-JS-Module + Canvas 2D, kein Build:** wie alle Spiele der Sammlung; läuft direkt über GitHub Pages und als iPhone-Web-App.
- **Simulation ohne Browser-Abhängigkeit (`js/sim/`):** dieselbe `World` läuft im Spiel, in den Node-Tests, im Balance-Bot und als autoritativer Koop-Gastgeber.
- **Menüs als DOM/CSS, Spielfeld als Canvas:** scharfe, responsive Oberfläche; das Feld bleibt schnell.
- **Koop über WebRTC (PeerJS, öffentlicher Vermittler):** kein eigener Server nötig. Der Gastgeber rechnet alles, Mitspieler senden nur Befehle.
- **In der Runde heißt die Währung „Futter“ (🐟)**, damit sie nicht mit den dauerhaften Münzen verwechselt wird. Münzen und Kristalle gibt es am Rundenende.

## Architektur

```
js/config.js            zentrale Balance-Werte (enemy_health_multiplier, wave_scaling, Schwierigkeit, Koop …)
js/data/                REINE DATEN: cats.js, dogs.js, maps.js, waves.js, meta.js
js/sim/                 Simulation (kein DOM)
  world.js              GameManager einer Runde: Befehle (cmd), Zeitschritt, Sieg/Niederlage
  waves.js              WaveManager: Skalierung, Wellen-Generator, Spawns
  enemies.js            EnemyManager: Pool, Bewegung, Zustände, Boss-Fähigkeiten, Suchraster
  towers.js             TowerManager: Angriffe, Geschoss-Pool, Auren, Geschütze, Schwarzes Loch
  upgrades.js           UpgradeManager: Punkte-Regel, Kosten, Werte, Effekt-Texte
  powerups.js           PowerUpManager
  maps.js               MapManager: Wege, bebaubare Felder, Boni
  damage.js             Schadensformel (reine Funktion)
js/meta/                Konto (reine Funktionen auf dem Spielstand)
  save.js               SaveManager: 2 Kopien + Prüfsumme, Umzugs-Code
  currency.js           CurrencyManager: Münzen/Kristalle, Käufe
  progression.js        ProgressionManager: Level, Freischaltungen, Boni, Runden-Belohnung
  missions.js           MissionManager, DailyRewardManager, Achievements, finishRound()
js/session.js           LocalSession (Einzelspieler) – gemeinsame Schnittstelle für die Oberfläche
js/net/multiplayer.js   MultiplayerManager: Transporte, HostSession, ClientSession, NetView, sanitizeSetup
js/net/lobby.js         LobbyManager: Raum, Code, Start
js/audio.js             AudioManager: SOUNDS-Tabelle + Musik als Notenfolgen
js/ui/ui.js             UIManager: alle Menüs       js/ui/hud.js   Runden-HUD, Eingabe, Tutorial
js/ui/render.js         Renderer + Partikel-Pool    js/ui/art.js   Katzen/Hunde/Waffen zeichnen, Sprite-Cache
js/main.js              App: verbindet alles
```

Ablauf einer Runde: `Oberfläche → session.cmd({t:'place'|'upgrade'|'sell'|'target'|'start'|'power'|'gift'}) → World prüft und führt aus → World.emit(Ereignis) → Renderer/Ton/HUD reagieren`. Die Oberfläche verändert den Zustand nie direkt.

## Spielregeln, die man kennen sollte

- **Trainingspunkte:** jede Katze hat 5 Punkte (Rang 10: 6). Nur **ein** Pfad darf die Meisterstufe (3) erreichen → Builds wie 3-2-0, 3-1-1, 2-2-1.
- **Schadensarten:** Physisch und Explosion werden von Rüstung gebremst (Explosion nur halb, mindestens 15 % kommen durch). Feuer/Eis/Blitz/Säure/Licht ignorieren Rüstung, haben aber Resistenzen. Blitz ×2 gegen Schilde, Schatten ignoriert Schilde.
- **Getarnte Hunde** sind nur für Katzen mit „Entdecken“ angreifbar (Scout-Späherpfad, Sniper-Wärmebild, Ninja, Shadow, Sphinx, Nyx) oder wenn sie enttarnt werden (Leuchtfeuer, Luftaufklärung). Flächenschaden trifft sie trotzdem.
- **Auren stapeln nicht:** von gleichen Boni zählt nur der stärkste (kein Ein-Katzen-Meta).
- **Betäubung:** danach kurze Immunität; Bosse nur 30 % Dauer. Boss-Stampfen betäubt Katzen – Medic Cat schützt.
- **Bosse:** Welle 10 Mini-Boss (kostet 10 Leben), danach alle 10 Wellen; der letzte Boss einer Map ist ihr eigener. Kommt ein großer Boss durch, ist die Runde verloren.

## Etwas hinzufügen (nur Daten)

- **Neue Katze:** Eintrag in `js/data/cats.js` (`base`, `look`, 3 `paths`). Vorhandene Effekt-Schlüssel stehen in `FX_TEXT` (`js/sim/upgrades.js`). Neues Zubehör/neue Waffe optional in `js/ui/art.js` (`ACC`, `drawWeapon`).
- **Neuer Hund/Boss:** Eintrag in `js/data/dogs.js` (Eigenschaften sind oben in der Datei erklärt). Boss-Reihenfolge: `BOSS_ORDER`.
- **Neue Map:** Eintrag in `js/data/maps.js` (Wegpunkte, Wasser, Bonusfelder, `mods`, `threat`). Neues Thema in `THEMES`.
- **Feste Welle:** `FIXED[mapId][Welle]` in `js/data/waves.js`. Neues Wellen-Thema: `THEMES_W`.
- **Power-up, Forschung, Mission, Erfolg, tägliche Belohnung, Level-Freischaltung:** Tabellen in `js/data/meta.js`.
- **Ton austauschen:** `SOUNDS` in `js/audio.js` ändern oder `audio.register('boom', 'datei.mp3')`.

## Balancing

Alle Regler stehen in `js/config.js`. Werkzeuge:

```
node cats/tools/curve.mjs city normal        # je Welle: Gegner-LP, verdientes Futter, Verhältnis
node cats/tools/balance.mjs all all all      # Bot spielt alle Maps/Stufen mit 4 Beispiel-Trupps
node cats/tools/balance.mjs city hard late -v
```

Faustregel aus `curve.mjs`: „LP/Futter“ bis etwa 1,0 ist gut machbar, ab etwa 1,5 braucht es starke Builds, Akademie-Boni oder Power-ups. Der Bot spielt absichtlich einfach (keine Power-ups, keine Akademie); Menschen kommen weiter.

## Tests

```
node --test cats/tools/test.mjs              # 15 Tests: Schaden, Skalierung, Wellen, Upgrades, Runde, Währung,
                                             # Freischaltungen, Missionen, Spielstand, Koop-Prüfungen, Leistung
node cats/tools/e2e.cjs all [bilder-ordner]  # Browser: Menüs, Runde mit Antippen, Koop mit 2 Spielern
```

Der Koop-Browsertest nutzt `?net=local` (BroadcastChannel statt WebRTC), damit er ohne Internet läuft.

## Koop im Detail

- Gemeinsame Map und gemeinsame Leben; jeder hat eigenes Futter, eigenen Trupp, eigene Power-ups. Futter schenken über ☰.
- Skalierung je Spielerzahl in `BALANCE.multiplayer` (LP +60 % / +120 % / +190 %, mehr Hunde, stärkere Bosse, geteiltes Futter, Bonus auf Belohnungen).
- **Autorität:** Nur die `World` des Gastgebers zählt. Welcher Spieler einen Befehl schickt, bestimmt die Verbindung (nicht die Nachricht). Akademie-Angaben der Mitspieler werden mit `sanitizeSetup` auf das im Spiel Mögliche gekappt.
- **Verbindungsabbruch:** Katzen bleiben stehen; der Mitspieler klopft 60 s lang erneut an und steigt mit derselben Spieler-ID wieder ein.
- **Grenzen:** Fällt der Gastgeber aus, endet die Runde. Verbindung braucht Internet auf beiden Geräten und den öffentlichen PeerJS-Vermittler; in manchen Mobilfunknetzen klappt WebRTC ohne TURN-Server nicht (dann WLAN nutzen).

## Bekannte Grenzen / nächste Schritte

- Balancing stammt aus Simulation, nicht aus langem Spieltest am iPhone → Rückmeldung einarbeiten.
- Koop wurde automatisch nur lokal getestet, noch nicht zwischen zwei echten Handys.
- Ideen: mehr Katzen (System trägt 30–50), Wochen-Events, kosmetische Skins, Musik je Map, Tages-Herausforderung.
