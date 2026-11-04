---
name: game-dev-fast
description: Schlanke, token-sparende Vorgehensweise für neue Browser-/Handy-Spiele in der Gaming-Gang-Sammlung – Technikwahl, Projektvorlage, Asset-freie Grafik/Ton, Testen, Balancing per Simulation, Veröffentlichung als iPhone-Web-App und Android-APK.
---

# Spiele schnell, günstig und gut bauen

## Grundsätze (in dieser Reihenfolge)
1. **Kleinster spielbarer Kern zuerst:** Bewegung, ein Ziel, ein Sieg-/Verlustzustand. Dann in sichtbaren Schritten erweitern. Jeder Schritt ist spielbar und wird gepusht.
2. **Keine Abhängigkeiten, kein Build:**
   - Vanilla-JS-ES-Module mit Canvas 2D, eine `index.html`.
   - Kleine Spiele dürfen eine einzige Datei sein, wie `plug52/`.
3. **Keine Asset-Dateien:**
   - Grafik prozedural (Pixel-Art per Code, gecachte Offscreen-Canvases).
   - Ton per WebAudio (Synth-Effekte, Musik als Notenstrings).
   - Spart Lizenzfragen, Downloads und Tokens.
   - Fremde Marken und Assets (Pokémon, Nintendo …) nie kopieren; nur das Spielgefühl nachbauen.
4. **Wiederverwenden statt neu schreiben.** Aus `legends/` übernehmen:
   - `js/gb/engine.js`: Szenen, Eingabe, Fade/Wipe, Subpixel-Skalierung
   - `gbui.js`: Dialoge und Menüs
   - `core/audio.js` + `music.js`: Synth-Musik
   - `tools/e2e/lib.cjs`: Tests
   - `sw.js` + `manifest.webmanifest`: Offline-Web-App
   - `legends/app/` + `.github/workflows/android.yml`: APK
5. **Daten statt Code.** Inhalte (Level, Gegner, Karten, Dialoge) als Tabellen bzw. Objekte. Neue Inhalte sind dann Daten-Einträge, kein neuer Code.

## Token sparen (Arbeitsweise)
- **Lesen:** gezielt mit `grep -n` und `sed -n a,bp`, nie große Dateien komplett. Was im Gespräch schon bekannt ist, nicht erneut lesen.
- **Ändern:** mehrere Änderungen in einem `python3`-Skript mit `assert s.count(old)==1`. Neue Dateien direkt mit `Write`.
- **Prüfen:**
  - Syntax: `node --check datei.js`
  - Daten: kleine Prüfwerkzeuge (z. B. `checkmaps.mjs`) statt Browserklicks
  - Ablauf: vorhandene e2e-Szenarien statt neuer Skripte
- **Balancing:** Node-Simulation mit 200–300 Durchläufen statt Ausprobieren. Einen Bot gegen eine bekannte Referenz kalibrieren.
- **Bilder:** mehrere Screenshots zu **einem** Kontaktbogen zusammensetzen und einmal ansehen.
- **Warten:**
  - Lange Läufe (CI, Raids) mit `run_in_background` bzw. Monitor starten, nicht pollen.
  - GitHub-Actions-Status per `gh api …/runs`.
- **Rhythmus:** kein Subagent, keine Rückfragen bei offensichtlichen Entscheidungen. Kurz berichten: was neu ist, was getestet wurde, Link.

## Qualität, die man sieht (günstige Hebel)
- **Bewegung:**
  - Restzeit des Schritts übertragen; Kamera und Sprites auf `1/SCALE` runden, nicht auf ganze Pixel.
  - Canvas in Geräteauflösung (`ceil(cssBreite*dpr/W)`).
- **Welt:**
  - Kacheln mit Mehrfarben-Rauschen und Licht von oben links.
  - Übergänge (Gras über Wegrand, Uferschaum), weiche Schatten, Baumkronen über Figuren.
  - Wolkenschatten, Vignette (vorgezeichnet), Nachtlichter.
- **Kampf:**
  - Intro (Plattformen gleiten herein, Wurf, Aufleuchten), einschiebende Lebensbalken.
  - Weiches Abblenden zurück zur Welt.
  - Effekte nach Attacken-`fx` (beam, zap, storm, quake …).
- **Ton:** eigene Stücke pro Kontext (Stadt, Route, Nacht, Höhle, Kampf, Boss, Finale) statt Zufallsmelodien.

## Veröffentlichen (Handy)
- **Web-App:**
  - `manifest.webmanifest` + `sw.js` (Cache-Liste und Version!) + Apple-Meta-Tags + `viewport-fit=cover` + Safe-Area-Padding.
  - Schrift lokal einbinden, damit das Spiel offline läuft.
  - iPhone: Safari → Teilen → „Zum Home-Bildschirm“.
- **Android:** Capacitor-Ordner `app/` (package.json, `capacitor.config.json`, `res/`, `debug.keystore`) plus Workflow, der `www/` kopiert, baut, die Signatur prüft und ein eigenes Release pro Version anlegt.
- **Daten sichern:** automatisch speichern bei `visibilitychange`/`pagehide`. Multiplayer-Sicherung optional über den Server.

## Fertig-Checkliste pro Schritt
1. `node --check`
2. Datenprüfer
3. e2e-Szenario
4. Screenshot ansehen
5. `sw.js` `CACHE` erhöhen
6. Doku: `FORTSCHRITT.md` (+ `ROADMAP.md`) und `CLAUDE.md`-Stand
7. Commit mit Attribution, `git push -u origin main` (bei Fehler wiederholen)
8. APK-Workflow **nur auf Wunsch** starten (der Nutzer spielt auf dem iPhone)
9. Kurzer deutscher Bericht mit Link
