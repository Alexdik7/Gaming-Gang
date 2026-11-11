# Funkenflug

Arcade-Flugspiel: Pip, ein kleines Leuchtwesen, fliegt durch Lücken zwischen schwebenden Kristallsäulen.
Tippen, Klicken oder SPACE/↑/W = Flügelschlag · P/Esc = Pause · M = Ton.

## Dateien
- `index.html`: Canvas und Oberfläche (Titel, Pause, Game Over)
- `style.css`: Vollbild, Safe-Area, Panels und Buttons
- `game.js`: komplette Logik (IIFE). Abschnitte: Konstanten → Speicher → Ansicht → Sound → Partikel → Logik → Zeichnen → Eingabe → Loop
- `sw.js`, `manifest.webmanifest`, `icon-*.png`: Offline-Web-App (Icons werden mit `FF.icon(size)` erzeugt)

## Technik
- Logische Höhe 640, die Breite passt sich an; bei sehr schmalen Bildschirmen (unter 320) wird mehr Himmel oben gezeigt (`view.oy`).
- Physik mit Teilschritten ≤ 1/120 s. Kollision: Kreis (r = 12) gegen die Rechtecke der Säulen.
- Schwierigkeit `difficulty()` = Punkte·0,035 + Zeit·0,0035 (max. 1): Tempo 155 → 270, Lücke 182 → 140 (±12).
- Rekord: `localStorage['funkenflug.best']`, Ton: `funkenflug.mute`.
- Test-Schnittstelle: `window.FF` (state, score, best, bird, pillars, start, flap, pause, resume, icon).

## Systeme (v1.1)
Inhalte stehen in `data.js` (WORLDS, SKINS, MISSIONS, POWERS). Neuer Inhalt = neuer Eintrag.
- **Combo:** Weicht Pip beim Durchflug höchstens 30 % der Lücke von der Mitte ab (`PERFECT`, `p.dev`), gibt es „PERFEKT“ mit +1/+2/+3 Bonus. Die Schwierigkeit richtet sich nach `game.passed`, nicht nach den Punkten.
- **Power-Ups:** Schild (fängt einen Treffer ab, die Säule zerspringt), Zeitlupe (5 s, Faktor 0,6), Magnet (8 s, zieht Splitter an). Splitter liegen in der Lückenmitte und in Bögen zwischen den Säulen.
- **Welten:** alle 25 Punkte (`WORLD_EVERY`) Abendhimmel → Frostgrotte → Glutberge → Sternenmeer, mit Farbüberblendung über 1,6 s und Wetter (`ambient`).
- **Figuren:** 6 Figuren, rein optisch, mit Splittern kaufen. Gezeichnet von `drawPip(c, wing, glow, skin)`.
- **Tagesmissionen:** 3 pro Tag, ausgelost mit dem Datum als Startwert. `run: true` zählt den besten Wert einer Runde, sonst die Tagessumme. Dazu ein Tagesrekord.
- **Spielstand:** `localStorage['funkenflug.save']` als JSON (best, shards, skin, owned, day). Der Rekord aus v1.0 wird übernommen.
- **Test:** `FF.cheat.score(n)`, `FF.cheat.give('shield'|'slow'|'magnet')`, `FF.cheat.shards(n)`.
