# LEGENDS UNITED – Technisches Konzept

## 1. Machbarkeitsanalyse (ehrlich)

Der Auftrag beschreibt ein AAA-Spiel. Spiele dieses Umfangs entstehen normalerweise mit Teams von 50 bis 200 Menschen über mehrere Jahre.
Realistisch ist deshalb ein **schrittweiser Aufbau**. Am Anfang steht ein echtes, spielbares Grundgerüst, das wir Phase für Phase erweitern.

| Anforderung | Machbar? | Umsetzung |
|---|---|---|
| Spielbare Welt, Bewegung, Kämpfe, Fangen | ✅ | umgesetzt (Handheld-Edition) |
| Koop für 4 Spieler in einer dauerhaften Welt | ✅ | Phase 2: gemeinsame Welt, Mitspieler sehen, Freundschaftskämpfe und Tausch umgesetzt |
| 150+ Kreaturen, 7 Regionen, 8 Arenen, Top 4 | ✅, braucht Zeit | datengetriebenes System: neue Kreaturen und Regionen sind Daten statt neuer Code |
| Grafik | ✅ | eigene Pixel-Art im Stil der 32-Bit-Handhelds (240×160, 16×16-Kacheln, 64×64-Kampfsprites). Alle Grafiken sind eigenständig gestaltet, nichts ist aus fremden Spielen übernommen. |
| Windows-Installer, Android, iOS | ✅ | als installierbare App über PWA, später zusätzlich Tauri (Windows) und Capacitor (Stores) |

## 2. Wahl der Technik: Canvas 2D + Node.js statt Unity/Unreal

**Entscheidung:** Das Spiel nutzt eine eigene kleine Engine auf Basis von **Canvas 2D** (keine Fremdbibliothek). Der Weltserver läuft mit **Node.js + WebSockets**.
Der frühere 3D-Prototyp (Three.js) wurde mit v0.3 entfernt.

Gründe:

1. **Eure Geräte:** Ihr spielt auf Handys **und** PCs. Ein einziger Code läuft überall und lässt sich wie eine App installieren.
2. **Keine Entwicklungsumgebung nötig:** Link öffnen, „Zum Startbildschirm“ tippen, fertig.
3. **Updates sofort für alle:** Jede neue Version liegt nach dem Upload bei allen vier Spielern.
4. **Gemeinsame Logik:** Kampf- und Kreaturen-Code laufen unverändert im Browser und auf dem Server.

## 3. Architektur

```
legends/
├── index.html, style.css           App-Hülle, UI-Layer, Ladebildschirm
├── manifest.webmanifest, sw.js     Installierbare App + Offline-Cache
├── js/
│   ├── main.js                     Spielablauf: Zustände, Story, Quests, HUD, Menüs, Speichern, Netzwerk-Anbindung
│   ├── core/                       Engine-Bausteine
│   │   ├── noise.js                deterministisches Rauschen / Zufall mit Seed
│   │   └── audio.js                Synthesizer: Effekte, Kreaturenrufe, prozedurale Musik
│   ├── data/                       reine Spieldaten (leicht erweiterbar)
│   │   ├── types.js · moves.js     15 Typen, 58 Attacken
│   │   ├── creatures.js/creatures2.js  45 Kreaturen (Werte, Lernsets, Entwicklung, Lore, Aussehen, Ruf)
│   │   ├── breeding.js             Brutstätte, Eier, Mutationen
│   │   └── mon.js                  Werteberechnung, EP, Level, Entwicklung
│   ├── battle/battle.js            Kampflogik ohne Grafik – läuft im Browser UND auf dem Server (PvP)
│   ├── gb/                         Handheld-Edition (Canvas 2D, 240×160)
│   │   ├── engine.js               Spielschleife, Szenen-Stapel, Eingabe, Zeichenhilfen
│   │   ├── pixel.js                Kacheln, Gebäude, Laufsprites
│   │   ├── monart.js               2D-Pixel-Art-Generator für Kreaturen und Trainer
│   │   ├── maps.js · overworld.js  Karten, Bewegung, NPCs, Trainer
│   │   ├── battle2d.js             Kampfbildschirm
│   │   ├── gbui.js                 Dialoge, Menüs, Team, Bericht, Chronik
│   │   ├── online.js               Koop: Mitspieler, Freundschaftskampf, Tausch
│   │   └── game.js                 Story, Ereignisse, Speichern
│   └── net/net.js                  Netzwerk-Client mit automatischer Wiederverbindung
├── server/                         Weltserver (Node.js)
│   └── server.js
└── docs/                           Konzept, Roadmap, Fortschritt, Multiplayer-Anleitung
```

### Wichtige Prinzipien

- **Datengetrieben:** Eine neue Kreatur ist ein Eintrag in `creatures.js`. Das Pixel-Sprite entsteht über einen Körperbau-Typ, Farben und Zusatzteile, der Ruf über Synthesizer-Parameter.
- **Logik getrennt von Grafik:** `battle.js` erzeugt nur Ereignislisten, `battle2d.js` spielt sie ab.
  Kämpfe zwischen Spielern berechnet deshalb der Server selbst; die Clients senden nur ihre Wahl.
- **Deterministische Welt:** Gelände, Bäume und Wetter entstehen aus einem Seed. Alle Spieler sehen exakt dieselbe Welt, ohne dass der Server sie übertragen muss.

## 4. Multiplayer- und Datenstruktur

**Modell:** dedizierter Weltserver mit Server-Autorität. Es gibt **keinen** Host-Spieler.
Die Welt lebt auf dem Server und bleibt bestehen, auch wenn der Ersteller offline ist.

```
accounts[pid]   = { secret(Hash), name, worlds[] }
worlds[code]    = { name, owner, seed, timeBase, flags{}, members{pid: {name, look, save, pos}} }
```

| Nachricht (Client → Server) | Zweck |
|---|---|
| `hello {pid, secret}` | Anmeldung, Konto wird bei Bedarf angelegt |
| `create {name, char}` / `join {code, char}` | Welt erstellen oder per 6-stelligem Code beitreten (max. 4 Spieler) |
| `pos {x,y,z,r,s,b}` | Position mit 10 Hz. Der Server prüft die Geschwindigkeit und korrigiert Teleport-Cheats. |
| `save {data}` | Spielstand. Der Server prüft ihn auf Plausibilität (Level, Teamgröße, Geld). |
| `flag {id}` | gemeinsamer Weltfortschritt, z. B. Runensteine |
| `chat {text}` | Chat |

| Server → Client | |
|---|---|
| `snap` (10 Hz) | Positionen der Mitspieler |
| `clock` (alle 5 s) | Weltzeit und Wetter. Server-autoritativ, damit alle dieselbe Tageszeit und dasselbe Wetter haben. |
| `flags` | Weltfortschritt hat sich geändert |
| `correct` | Positionskorrektur |

**Persistenz:** Die Spielstände liegen in einer JSON-Datei auf dem Server (Phase 2: SQLite/PostgreSQL).
Zusätzlich gibt es eine lokale Kopie auf jedem Gerät, damit man nach einem Verbindungsabbruch nichts verliert.

## 5. Kampfsystem

- Rundenbasiert. Initiative entscheidet die Reihenfolge.
- Schadensformel mit Level, Angriff/Verteidigung (physisch und speziell), STAB ×1,5, Typ-Effektivität (×0 bis ×4), Volltreffer (1/16, ×1,5) und Zufallsfaktor.
- Statuswerte-Stufen ±6, Statusprobleme (Verbrennung, Vergiftung, Starre), Genauigkeit.
- Fangen: Chance hängt von der Fangrate, den verbleibenden KP und dem Status ab. Es gibt 0 bis 3 Wackler.
- EP-Verteilung an alle Teilnehmer, Levelaufstiege, neue Attacken (mit Vergessen-Dialog) und Entwicklung nach dem Kampf.
- Inszenierung:
  - Kamerafahrt beim Auftauchen, Schulter-Kamera, Angriffsperspektiven
  - 9 Effektarten: Sprint, Klaue, Biss, Geschoss, Strahl, Blitz, Wirbel, Beben, Wolke
  - Partikel in Typfarbe, Treffer-Rückstoß, Kamerawackeln, Blitz bei sehr effektiven Treffern
