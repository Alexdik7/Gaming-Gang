# Turbofieber

Eigenes 3D-Straßenrennspiel für das iPhone: Fahren durch die Stadt Velara, mit Tag und Nacht, Drift und Nitro.
Technik: three.js r160 (lokal in `lib/`, MIT-Lizenz) mit Bloom-Nachbearbeitung, ES-Module mit Importmap, kein Build-Schritt.

## Dateien
- `js/world.js`: Stadt (Raster 9×9, `BLOCK` 64 m, `ROAD` 22 m), Gebäude mit Fenster-Shader (`onBeforeCompile`, Fenster aus der Weltposition berechnet), Leuchtreklamen, Laternen mit Lichtkegeln, Zebrastreifen, Parks, Skyline, Himmels-Shader, Tageszeit `setTime(tod)`, Kollision `collide(x, z, r)`
- `js/car.js`: Sportwagen aus extrudiertem Seitenprofil (Klarlack-Material), Räder, Scheinwerfer (SpotLight), Nitro-Flammen. Physik in `Car.update(dt, input)`
- `js/fx.js`: Reifenqualm und Funken als Punktwolken, Bremsspuren als Ringpuffer
- `js/audio.js`: Motor (Oszillatoren über Tiefpass), Reifen, Nitro, Wind, Aufprall
- `js/main.js`: Renderer, Qualitätsstufen (hoch/mittel/niedrig, automatisch je nach Bildrate), Kamera, Touch-Steuerung, HUD, Minikarte

## Fahrphysik (Arcade)
- Antrieb entlang der Fahrzeugnase: 0–100 km/h in ca. 3,5 s, Spitze ca. 215 km/h, mit Nitro ca. 290 km/h
- Gierrate aus dem Einspurmodell, begrenzt durch die Haftung (17 m/s² quer)
- Die Fahrtrichtung dreht zur Nase hin (normal schnell, im Drift langsam), der Betrag der Geschwindigkeit bleibt erhalten. Deshalb kosten Drifts kaum Tempo. Driftwinkel höchstens ca. 60°.
- Nitro lädt langsam von selbst und schneller beim Driften auf

## Steuerung
Touch: ◀ ▶, GAS, BREMSE (rückwärts), DRIFT (Handbremse), NITRO. Tastatur: Pfeile/WASD, Leertaste, Shift, P.

## Test
`window.TF`: state, car, world, touch, bloom, tod, start(), spawn(), step(dt, input).
Im Headless-Browser rendert SwiftShader sehr langsam. Physik deshalb mit `TF.car.update` in Schleifen messen, nicht in Echtzeit.

## Roadmap
1. ✔ Fahrgefühl, Stadt, Tageszeiten, Touch-Steuerung
2. Verkehr, Regen, größere Stadt (Highway, Hafen, Bergstraße)
3. Garage und Tuning (Lack, Felgen, Spoiler, Motor, Turbo, Reifen, Nitro)
4. Rennen (Sprint, Rundkurs, Drift, Zeitrennen) und Tagesmissionen
5. Polizei und Verfolgungsjagden
6. Hauptstory mit Crews und Bossrennen, Nebenquests
