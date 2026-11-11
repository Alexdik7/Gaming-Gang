# Turbofieber

Eigenes 3D-Straßenrennspiel für das iPhone: Fahren durch die Stadt Velara, mit Tag und Nacht, Drift und Nitro.
Technik: three.js r160 (lokal in `lib/`, MIT-Lizenz) mit Bloom-Nachbearbeitung, ES-Module mit Importmap, kein Build-Schritt.

## Dateien
- `js/world.js`: Stadt (Raster 9×9, `BLOCK` 64 m, `ROAD` 22 m), Gebäude mit Fenster-Shader (`onBeforeCompile`, Fenster aus der Weltposition berechnet), Leuchtreklamen, Laternen mit Lichtkegeln, Zebrastreifen, Parks, Skyline, Himmels-Shader, Tageszeit `setTime(tod)`, Kollision `collide(x, z, r)`
- `js/car.js`: `buildCar(carId, cfg)` baut das Auto aus dem Seitenprofil (Lackart, Felgen, Spoiler, Bodykit, Unterboden, Streifen per Alpha-Overlay, Tönung, Tieferlegung). Physik in `Car.update(dt, input)` mit Fahrwerten `car.st`; `setConfig` baut um
- `js/fx.js`: Reifenqualm und Funken als Punktwolken, Bremsspuren als Ringpuffer
- `js/audio.js`: Motor (Oszillatoren über Tiefpass), Reifen, Nitro, Wind, Aufprall
- `js/outskirts.js`: Umland – Highway-Ring (`HW_IN`/`HW_OUT`, Verkehrsbahn `ringAt`), Ausfahrten an Straße k = 4, Hafen (Container, Kräne, Lagerhallen, Wasser), Bergstraße (`MOUNTAIN`, Catmull-Rom, 321 Punkte) mit eingeschnittenem Gelände, Wald und Gipfelplateau. Kollision: Hindernisse + befahrbare Bereiche (Rechtecke und Kapseln), `heightAt` für die Bergstraße
- `js/traffic.js`: Verkehr – Stadtautos von Kreuzung zu Kreuzung (Rechtsverkehr, Abbiegen), Highway-Autos auf dem Ring; je Typ ein InstancedMesh (Limousine, Transporter, Taxi), Abstandhalten, Anfahren mit `knock`
- `js/weather.js`: Regen (1500 Striche um die Kamera), Nässe `wet`, Blitze mit Donner
- `js/cars.js`: Daten – Modelle (`MODELS`: Profil, Räder, Maße), Autos (`CARS`: Preis, Grundwerte), Optik (`OPTIONS`: Kategorie → [Wert, Name, Preis]), Upgrades (`PERF`, 5 Stufen, Preis = Basis × Stufe), `statsFor` (Fahrwerte), `ratings` (Balken)
- `js/save.js`: Spielstand `tf.save` (Geld, Autos mit `cfg` + `perf`, Bestwerte), wird beim Laden bereinigt
- `js/score.js`: Street-Punkte – Drift (Schlupf × Tempo), knapp vorbei (+300), Highspeed über 190 km/h; Multiplikator bis ×5; nach 1,8 s Pause gebankt (20 Punkte = 1 $), Crash löscht die Kette
- `js/garage.js`: Garage – eigene Szene (Neon-Showroom, Drehteller, eigene Spiegelungen), Reiter Autos/Optik/Leistung, Optik als Vorschau mit Sammelkauf, Upgrades sofort
- `js/main.js`: Renderer, Qualitätsstufen (hoch/mittel/niedrig, automatisch je nach Bildrate), Kamera, Touch-Steuerung, HUD, Minikarte

## Fahrphysik (Arcade)
- Antrieb entlang der Fahrzeugnase: 0–100 km/h in ca. 3,5 s, Spitze ca. 215 km/h, mit Nitro ca. 290 km/h
- Gierrate aus dem Einspurmodell, begrenzt durch die Haftung (17 m/s² quer)
- Die Fahrtrichtung dreht zur Nase hin (normal schnell, im Drift langsam), der Betrag der Geschwindigkeit bleibt erhalten. Deshalb kosten Drifts kaum Tempo. Driftwinkel höchstens ca. 60°.
- Nitro lädt langsam von selbst und schneller beim Driften auf

## Steuerung
Touch: ◀ ▶, GAS, BREMSE (rückwärts), DRIFT (Handbremse), NITRO. Tastatur: Pfeile/WASD, Leertaste, Shift, P.

## Test
`window.TF`: state, car, world, touch, bloom, tod, start(), spawn(), step(dt, input), teleport('stadt'|'highway'|'hafen'|'berg'), traffic, weather, mountain, profile, garage, score, enterGarage(), GARAGE.
Im Headless-Browser rendert SwiftShader sehr langsam. Physik deshalb mit `TF.car.update` in Schleifen messen, nicht in Echtzeit.

## Roadmap
1. ✔ Fahrgefühl, Stadt, Tageszeiten, Touch-Steuerung
2. ✔ Verkehr, Regen, größere Welt (Highway, Hafen, Bergstraße), Schnellreise
3. ✔ Garage und Tuning (3 Autos, 10 Optik-Kategorien, 5 Upgrades), Street-Punkte als Geldquelle
4. Rennen (Sprint, Rundkurs, Drift, Zeitrennen) und Tagesmissionen
5. Polizei und Verfolgungsjagden
6. Hauptstory mit Crews und Bossrennen, Nebenquests
