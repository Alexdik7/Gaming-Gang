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

## Ideen für später
Charaktere/Skins, Power-Ups, Missionen, Tagesrekord, Welten, Combo-System.
