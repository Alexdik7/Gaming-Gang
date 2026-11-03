# LEGENDS UNITED – Technisches Konzept

## 1. Machbarkeitsanalyse (ehrlich)

Der Auftrag beschreibt ein AAA-Spiel. Spiele dieses Umfangs entstehen normalerweise mit Teams von 50 bis 200 Menschen über mehrere Jahre.
Realistisch ist deshalb ein **schrittweiser Aufbau**. Am Anfang steht ein echtes, spielbares Grundgerüst, das wir Phase für Phase erweitern.

| Anforderung | Machbar? | Umsetzung |
|---|---|---|
| Spielbare 3D-Welt, Bewegung, Kamera, Kämpfe, Fangen | ✅ sofort | in Phase 1 umgesetzt |
| Koop für 4 Spieler in einer dauerhaften Welt | ✅ | Grundlage in Phase 1 umgesetzt, gemeinsame Kämpfe folgen in Phase 2 |
| 150+ Kreaturen, 7 Regionen, 8 Arenen, Top 4 | ✅, braucht Zeit | datengetriebenes System: neue Kreaturen und Regionen sind Daten statt neuer Code |
| Grafik auf dem Niveau von Unreal und AAA | ⚠️ eingeschränkt | eigener stilisierter Look mit Toon-Shading, Outlines, Licht, Wetter und Partikeln. Fotorealismus bräuchte Profi-3D-Modelle. |
| Windows-Installer, Android, iOS | ✅ | als installierbare App über PWA, später zusätzlich Electron/Tauri (Windows) und Capacitor (Stores) |

## 2. Wahl der Technik: Three.js (WebGL) + Node.js statt Unity/Unreal

**Entscheidung:** Das Spiel nutzt eine eigene Engine-Schicht auf Basis von **Three.js**. Der Weltserver läuft mit **Node.js + WebSockets**.

Gründe:

1. **Eure Geräte:** Ihr spielt auf Handys **und** PCs. Ein einziger Code läuft auf Windows, Android, iOS, Mac und Linux und lässt sich überall wie eine App installieren.
2. **Keine Entwicklungsumgebung nötig:** Unity und Unreal brauchen Editor, Lizenzen und Build-Rechner. Für iOS braucht man zusätzlich einen Mac und ein Apple-Entwicklerkonto für 99 €/Jahr.
   Mit Three.js öffnet ihr einfach einen Link und tippt auf „Zum Startbildschirm“.
3. **Updates sofort für alle:** Jede neue Version liegt nach dem Upload bei allen vier Spielern, ohne neuen Download.
4. **Echte Spiele-Engine-Funktionen:** Echtzeit-3D, Schatten, eigene Shader (Wasser, Gras, Himmel, Wasserfall), Instancing für tausende Objekte und ein Partikelsystem.

Das ist ausdrücklich **keine Website, die nur wie ein Spiel aussieht**. Es ist ein echtzeitgerendertes 3D-Spiel mit eigener Spielschleife.

**Plan B:** Wenn das Projekt später Grafik auf Unreal-Niveau braucht, lassen sich Spieldaten, Kampflogik und Server weiterverwenden. Neu geschrieben würde nur der Darstellungsteil.

## 3. Architektur

```
legends/
├── index.html, style.css           App-Hülle, UI-Layer, Ladebildschirm
├── manifest.webmanifest, sw.js     Installierbare App + Offline-Cache
├── js/
│   ├── main.js                     Spielablauf: Zustände, Story, Quests, HUD, Menüs, Speichern, Netzwerk-Anbindung
│   ├── core/                       Engine-Bausteine
│   │   ├── noise.js                deterministisches Rauschen (gleiche Welt für alle Spieler)
│   │   ├── input.js                Tastatur/Maus + Touch-Joystick
│   │   ├── audio.js                Synthesizer: Effekte, Kreaturenrufe, prozedurale Musik
│   │   └── ui.js                   Dialoge, Auswahlfenster, Hinweise
│   ├── data/                       reine Spieldaten (leicht erweiterbar)
│   │   ├── types.js                15 Typen + Effektivitäts-Tabelle
│   │   ├── moves.js                Attacken
│   │   ├── creatures.js            Kreaturen (Werte, Lernsets, Entwicklung, Lore, Modell, Ruf)
│   │   └── mon.js                  Werteberechnung, EP, Level, Entwicklung
│   ├── world/
│   │   ├── world.js                Region Verdantia: Gelände, Wasser, Wälder, Dorf, Tempel, Tag/Nacht, Wetter
│   │   └── models.js               prozedurale 3D-Modelle (Kreaturen + Menschen) und Animationen
│   ├── battle/
│   │   ├── battle.js               Kampflogik (ohne Grafik, daher auch auf dem Server lauffähig)
│   │   └── battleView.js           Inszenierung: Kamerafahrten, Partikel, Effekte, Kampf-UI
│   ├── net/net.js                  Netzwerk-Client mit automatischer Wiederverbindung
│   └── vendor/three.module.min.js  Three.js r170 (MIT-Lizenz)
├── server/                         Weltserver (Node.js)
│   └── server.js
└── docs/                           Konzept, Roadmap, Fortschritt, Multiplayer-Anleitung
```

### Wichtige Prinzipien

- **Datengetrieben:** Eine neue Kreatur ist ein Eintrag in `creatures.js`. Das 3D-Modell entsteht über einen Baukasten-Typ und Farben, der Ruf über Synthesizer-Parameter.
- **Logik getrennt von Grafik:** `battle.js` erzeugt nur Ereignislisten, `battleView.js` spielt sie ab.
  Dadurch kann der Server Kämpfe später selbst berechnen; das ist der Weg zur vollständigen Server-Autorität.
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
