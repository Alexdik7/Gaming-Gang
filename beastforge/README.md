# BEASTFORGE – Shinobi Creature Defense

3D-Anime-Tower-Defense mit eigener IP: mystische Kreaturen, Shinobi, Elemente, Evolutionen und drei getrennte Fortschrittssysteme.
Läuft im Browser und als iPhone-Web-App („Zum Home-Bildschirm“). Alles (Modelle, Effekte, Musik, Klänge) wird im Spiel erzeugt – keine Fremd-Assets.

**Spielen:** https://alexdik7.github.io/Gaming-Gang/beastforge/ · Dev-Menü: `…/beastforge/?dev`

## Stand: v0.2.0 (Vertical Slice + Genre-Optik)
**Neu in 0.2:** Querformat-Karte 22×13 mit steiler Kamera, Kreaturen **frei platzieren** (aus dem Shop ziehen oder antippen → Finger bewegen → loslassen; Kreis-Fußabdruck, Abstand zum Pfad), Shop-Leiste rechts mit großer ▶-/Tempo-Taste, Upgrade-Panel links mit 3D-Vorschau jeder nächsten Stufe, Kartenauswahl mit gerenderten Vorschaubildern + Modus-Karten, zweispaltige Sammlung, deutlich detailliertere Figuren (Anime-Augen, Fellbüschel, Pfoten, Rüstung, Schmuck), Normal spürbar leichter (150 Leben, mehr Startgeld, Boss schwächer; ein durchgelassener Boss kostet 100 Leben statt sofortiger Niederlage).

| Bereich | Inhalt |
|---|---|
| Karte | Ahnenhain (22×13, Querformat): verschlungener Pfad, Anhöhe (+15 % Reichweite), Teich (nur Wasserkreaturen, +20 % Tempo), räumbare Felsen, Torii, Laternen, Schrein mit Herzkristall (leuchtet nach Leben) |
| Kreaturen (5) | Kitsune (Benchmark, 7 Formen inkl. Zweig Geist/Schatten), Donnertiger, Eisenschildkröte, Geisthirsch (Support + Wirtschaft), Schattenrabe – je 3 Pfade × 5 Stufen, Kreuzpfade 5/2/0 |
| Held | Kairo, Fuchs-Shinobi: Level 1–20 im Run, Meilensteine (Passiv, Fähigkeit, Ultimate, Aufstieg, Meisterform), Sprüche, dauerhafter Rang |
| Gegner (11 + Boss) | Moorschleim, Dornwolf, Eisenkeiler (Panzer), Irrlicht (fliegt), Schattenschleicher (getarnt), Nebelmagier (Schilde), Lotusmönch (heilt), Spaltkäfer → Käferlinge, Felskoloss (Titan), Oni-Hauptmann (Mini-Boss), **Vharox, Abgrunddrache** (4 Phasen: Erwachen, Schwingen/Flug, Feuersturm legt Türme lahm, Raserei + Diener) |
| Wellen | 20 handgebaute Wellen mit Modifikatoren (schnell, gepanzert, Regeneration, Elite), Endlos-Generator ab 21 (Boss alle 10) |
| Modi | Normal, Schwer (Konto-Lv 5), Endlos (Konto-Lv 7) |
| Systeme | Zielmodi (8), Elementreaktionen (7), Synergien (6), Fähigkeiten + Ultimate, Erfolge (35), Mastery mit Skins, Konto-Belohnungen, Tutorial |

## Die drei Fortschrittssysteme (nie vermischt)
| System | Farbe | Lebt in | Wofür |
|---|---|---|---|
| **A – Run-Münzen ◈** | Gold | `sim/world.js` (`world.coins`) | Kreaturen, Upgrades, Evolutionen *im Run*. Verfallen am Ende, werden nie gespeichert. |
| **B – Charakter-XP** | Cyan | `profile.chars[id]` | Pro Kreatur Level 1–50: schaltet Formen frei (kosten im Run trotzdem Münzen!), kleine permanente Boni, Passiven, Fähigkeit ab Lv 8. |
| **C – Konto-XP** | Violett | `profile.account` | Spieler-Level 1–100: Kreaturen, Held, Modi, Rahmen, Titel. |

XP wird **live** gutgeschrieben (Verkauf, Niederlage, Absturz verlieren nichts) und nach jeder Welle gespeichert.
Gegen Farmen: XP je Kill wächst mit der Welle, wird nach Schadensanteil geteilt und sinkt, wenn das Level weit über dem Niveau der Welle liegt (`dimFactor`, min. 15 %).

## Architektur
```
js/config.js            ALLE Balance-Regler (Wirtschaft, Kurven, Schwierigkeiten, Level-Boni)
js/data/*.js            Inhalte als Daten: creatures, enemies (+Boss), heroes, maps, waves, meta (Reaktionen, Synergien, Konto, Erfolge)
js/sim/world.js         Simulation eines Runs (ohne DOM/three): Wellen, Gegner, Türme, Projektile, Schaden, Status, Reaktionen,
                        Boss-Phasen, Fähigkeiten, Wirtschaft, XP-Verteilung. Fester Zeitschritt 1/60 s → 3× bleibt deterministisch.
js/sim/stats.js         Werte = Basis → Formen → Pfadstufen → Level-Boni (danach in world.refresh: Synergien → Auren → Buffs → Gelände)
js/meta/progression.js  Charakter-/Konto-XP, Formen, Boni, Mastery, Erfolge (ohne DOM)
js/meta/profile.js      Spielstand (localStorage `beastforge.save`), Migration alter Stände
js/render/              three.js: stage (Renderer, Kamera-Einpassung, Bloom, Wackeln), view (Welt → Szene), mapview, models
                        (prozedurale Modelle), toon (Toon-Material, Umrisse, Verschmelzen/optimize), fx (Partikel, Ringe, Blitze,
                        Säulen, Projektil-Instanzen, Schadenszahlen), icons (Porträts + 3D-Vorschau)
js/ui/hud.js, menus.js  Oberfläche (DOM)
js/game.js              Ein Run: verbindet Welt, Ansicht, Eingabe, Hooks (XP live ins Profil), Zeitlupe, Abschluss
js/audio.js             WebAudio: Koto, Flöte, Taiko, eigene Stücke (Menü, Wald, Boss – dynamisch), alle Effekte
```
- **Neue Kreatur** = Eintrag in `data/creatures.js` (Basis, Formen, Pfade mit `fx`-Operationen `add/mul/set`) + Modell-Funktion in `render/models.js`.
- **Neue Welle/Karte/Gegner/Erfolg** = nur Daten.
- Ereignisse: `world.events` (z. B. `hit`, `kill`, `evolve`, `bossPhase`) → `view.handle`, `game.sound`, `hud.handle`.
- Leistung: Gegner/Projektile/Bäume als InstancedMesh, Modelle werden pro animierter Gruppe und Material verschmolzen (`optimize`), Partikel in einem Points-Objekt. Auto-Qualität senkt Auflösung/Schatten bei schwachen Geräten.

## Steuerung
- Kreatur im Shop (rechts) **auf die Karte ziehen** – oder antippen, dann auf die Karte tippen, Finger bewegen und loslassen. Grüner Kreis = gültig. Maus: Vorschau folgt, Klick platziert.
- Kreatur antippen → Panel links: 3 Pfade mit Vorschau, Erwecken (Evolution), Zielmodus ◀ ▶, Verkaufen. Fähigkeiten unten links. ▶ startet die Welle, nochmal tippen = 2×/3× Tempo.
- Tastatur: `1–6` Kreatur wählen, `Leertaste` Welle, `F` Tempo, `Esc` abbrechen/Pause.

## Testen
```bash
node --test beastforge/tools/test.mjs              # 21 Systemtests (Kreuzpfade, Platzierung, Wirtschaft, XP-Grenzfälle, Boss, Fähigkeiten, Speichern, 3×-Determinismus, Balance)
cd beastforge && python3 -m http.server 8055 &      # dann:
node beastforge/tools/e2e.cjs all [screenshot-ordner]   # Browser: boot, menus, land (Querformat), run
node beastforge/tools/balance.mjs normal 15 20      # Balance-Bot: diff, Charakter-Level, Runs
```
Test-API im Browser: `window.BF` (`BF.start()`, `BF.world`, `BF.profile`, `BF.level(30)`, `BF.menu('collection')`).

## Balance (Bot, 12 Runs je Zeile)
| Normal | Ergebnis |
|---|---|
| Charakter-Lv 1 | gewinnt (Ø ~70 von 150 Leben übrig) |
| Lv 5+ | gewinnt sicher (Ø ~110 Leben) |
Schwer: Bot ab ~Lv 35 gelegentlich – Langzeitziel. Werte in `config.js`, Wellen in `data/waves.js`.

## Veröffentlichen
Bei jeder Änderung `CACHE` in `sw.js` erhöhen, neue Dateien in `FILES` eintragen.
