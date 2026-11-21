# BEASTFORGE – Shinobi Creature Defense

3D-Anime-Tower-Defense mit eigener IP: mystische Kreaturen, Shinobi, Elemente, Evolutionen und drei getrennte Fortschrittssysteme.
Läuft im Browser und als iPhone-Web-App („Zum Home-Bildschirm“). Alles (Modelle, Effekte, Musik, Klänge) wird im Spiel erzeugt – keine Fremd-Assets.

**Spielen:** https://alexdik7.github.io/Gaming-Gang/beastforge/ · Dev-Menü: `…/beastforge/?dev`

## Stand: v0.8.1 – iPhone-Hochformat
**Fix 0.8.1** (Rückmeldung vom iPhone): Im Hochformat dreht sich die Kamera um 90° (`stage.portrait`, `fit()` mit Gierwinkel) – die Karte füllt den Bildschirm statt winzig zu sein; kein „Quer halten“-Hinweis mehr. Platzieren rastet auf den nächsten freien Platz ein (`world.nearestPlace`, bis 0,9 Felder), beim Ziehen mit dem Finger sitzt die Vorschau 46 px über dem Finger. Im Hochformat öffnet sich nach dem Platzieren nicht mehr das Upgrade-Fenster (Shop bleibt sichtbar), das Fenster ist dort max. 46 % hoch.

## Stand v0.8.0 – Menü wie ein fertiges Spiel
**Neu in 0.8:** **Titelbildschirm** nach dem Laden (Buchstaben fallen ein, „Tippe, um zu beginnen“ – schaltet auch den iPhone-Ton frei, `menus.s_title`). **Hub** mit runden Medaillons (`s_home`, CSS `.med`/`.mbig`): Kreaturen, Helden, großes pulsierendes SPIELEN, Entwicklung, Konto; oben Profil-Chip, Logo, Erfolge/Statistik/Optionen. **Entwicklungszentrum** (`s_evo`): alle Entwicklungsreihen mit Porträts, „noch N Level bis …“, nächste Form pulsiert. **Übergänge:** `menus.go(name, arg, event)` – Fuchsfeuer-Wipe wächst vom Tipp-Punkt (`#wipe`, Web Animations API), Inhalte fliegen gestaffelt ein (`.pop`), Kamera fährt je Bildschirm weich an eine eigene Position (`app.camT`), Geräusche `whoosh`/`start`. **Eisenschildkröte und Mantis neu** (`js/render/beasts.js`): Schildkröte mit Sechseck-Schuppen → Stahlpanzer mit Nieten, Stacheln, Helm, Nasenhorn → wandelnder Berg (Gipfel, Schnee, Kiefern, Wasserfall, Schrein); Mantis mit Facettenaugen, Fühlern, Flügeln und Fangarmen → Sichelkönigin (Krone, vier Sicheln) → Purpurmantis (glühende Klingen, ausgebreitete Flügel, Aura). Gelenk-Animationen: Stampfen, Sichelhieb, Beine, Atmen.

## Stand v0.7.0 – Jede Entwicklung ein eigenes Modell
**Neu in 0.7:** Entwicklungsformen nutzen eigene Grundmodelle (Übersicht `docs/evolutions.png`): Kitsune junger Vuena-Fuchs → ab Neunschweif erwachsene Quaternius-Füchsin · Geisthirsch Hirschkuh-Kitz → Hirsch → Himmelshirsch · Schattenrabe dunkler Rabe (Quaternius „Pigeon“) → Maskeneule → Leereneule mit vier Schwingen · Drachenwolf Shiba-Welpe → Husky → geflügelter Wolf · Felsgolem kleiner Goleling → KayKit-Frostgolem als Kristallgolem → Steintitan mit Moos + Lavakern (Stampf-Animation) · Donnertiger orange → Sturmtiger mit Leuchtstreifen + Blitzhörnern → weißer Donnerkönig mit Goldmähne. Kairo ist jetzt der KayKit-Ninja (mit Fuchsohren). Stufe 4/5 eines Pfads lässt das Modell selbst in Pfadfarbe glühen und wachsen; Schildkröte und Mantis (weiter prozedural – kein CC0-Modell im Stil gefunden; Codepawl-Voxel verworfen) tragen die Pfad-Ausrüstung über `gearOn`.

## Stand v0.6.0 – Masterplan Schritt B2: Helden + Tiger als Modelle, sichtbare Pfadstufen
**Neu in 0.6:** Helden Kairo (Kapuzen-Schurke mit Fuchsohren + rotem Schal), Raizen (Blitz-Stirnband, zuckende Blitze), Mika (Magierin mit Lotus + Geistkugel) als KayKit-Figuren (CC0) mit Leerlauf/Wurf/Zauber/Treffer; Stufe 15 Aura, Stufe 20 Lichtpartikel (Kairo: Fuchsschweife). Donnertiger = Vuena-Katze mit Tigerstreifen per Shader (`stripes` in `tintMat`), Blitzhörner, Sturmmähne. **Jede Pfadstufe ist am Modell sichtbar** (`pathGear` in `assets.js`, Farben wie die Pfad-Knöpfe): Pfad 1 Kopf (Stirnband → Juwel → Schulterflammen → Ring → Lichtkrone), Pfad 2 Rücken (Kragen → Wappen → 2/4 kreisende Kugeln → Heiligenschein), Pfad 3 Boden (Runenkreis → helle Runen → 3/5 Runensteine → Lichtsäule); Stufe 5 baut das Modell jetzt neu (`towerKey`). Noch prozedural: Eisenschildkröte, Mantisklinge (kein passendes CC0-Modell gefunden).
- Animationen der KayKit-Figuren liegen getrennt (`kk_anim1–3.glb`) und werden im `Rig` über `anims`/`alias` zugeordnet.

## Stand v0.5.0 – „Meisterwerk“ Schritt 1: echte 3D-Modelle
**Neu in 0.5:** Echte animierte Modelle (alle **CC0**, siehe `assets/models/LIZENZEN.md`): Quaternius „Ultimate Monsters“ als Gegner (Schleim, Geist, Schädelgeist, Magier, Pilzkönig, Panzerbienen, Goleling, Dämon, Orc mit Schild, Drache als Vharox, roter Orc als Oni), Quaternius-Tiere (Wolf, Stier, Husky, Hirsch) und Vuena-Tiere (Fuchs, Eule, Katze). Kitsune, Geisthirsch, Schattenrabe, Drachenwolf, Felsgolem sind jetzt Skin-Modelle mit Leerlauf-/Angriffs-/Treffer-Animation, Farbton je Form und Zubehör an den Knochen (Zusatzschweife, Halsseil, Halo, Runen, Hörner, Flügel …). Tiger, Schildkröte, Mantis und Helden sind noch prozedural.
- **Pipeline:** `tools/models.mjs` (gltf-transform + meshoptimizer): nur benötigte Animationen, Gegner-Netze vereinfacht (800–1.900 Dreiecke), Texturen 512 px → `assets/models/*.glb` (≈2,5 MB, vom Service Worker gecacht).
- **Laufzeit:** `js/render/assets.js` – `loadAssets()` im Ladebildschirm; Gegner werden in 6 Posen **vorgebacken** (Farben aus Textur → Eckpunktfarben, `bakeFrames`), je Pose ein InstancedMesh, Pose folgt dem zurückgelegten Weg (`ENEMY_MODELS[k].cyc`) → Hunderte animierte Gegner ohne Skinning. Kreaturen/Bosse: `Rig` (Klon + AnimationMixer + Toon-Material mit Farbton `uTint`, Skin-Umriss, `attach(knochen, obj)`). Weiche Schattenscheiben statt Schattenwurf für Gegner.
- **Rückfall:** ohne Modelle (oder mit `?models=0`) laufen die alten prozeduralen Formen. Entwickler-Galerie: `tools/gallery.html?mode=enemies|bigs|creatures&id=kitsune&st=0,1,2`.
- Leistung (360 Gegner, Headless): 1,19 Mio. Dreiecke / 217 Draw-Calls (vorher 1,0 Mio. / 111).

## Stand v0.4.0
**Neu in 0.4:** **Karte 3 Glutkrater** (Konto-Lv 6, `hpMul` 1,4, Stufe „Schwer“): Lavafelder (`L`, nicht bebaubar, eigener Shader + Glutlicht), 4 **Lava-Spalten** am Weg brechen alle 14 s aus (Warnring 1,6 s vorher, Feuerschaden + Brand, Bosse nur 30 %; `map.vents`/`map.lava`, `world.updVents`), 2 **Basalt-Flöße** treiben über die Lava und tragen Kreaturen mit (+15 % Schaden; `map.rafts`, `raftPos()` in `data/maps.js` für Simulation *und* Grafik, `world.raftAt`, Turm hat `raft/ox/oy`). Wellen werden je Karte über `map.mix(w, groups)` angepasst. **Neue Gegner:** Feuerdämon (fast feuerimmun, Eis ×1,5, Explosion legt nahe Kreatur 1,6 s lahm – `blast`) und Schildträger (Schild = 60 % KP schluckt zuerst Schaden, Blitz/Erde ×2; schützt Gegner im Umkreis um 35 % – `guard`, `e.guardT`). Eigene Musik `crater`, Aschefunken statt Blüten, verkohlte Bäume. Fix: Wasser-/Lava-Shader beachten jetzt die Instanz-Matrix; „Nochmal“ startet die gespielte Karte.

## Stand v0.3.0
**Neu in 0.3:** Ladebildschirm (Torii, Fuchsmaske, 9 Fuchsfeuer als echter Fortschritt, Tipps; auch beim Betreten einer Karte – `ui/loading.js`), **Weltkarte** als Auswahl (gezeichnete Karte, Kartenpunkte als Medaillons, wandernde Kreaturen, Seitenleiste mit Modus/Held/Team), **Karte 2 Shinobi-Dorf** (zwei Eingänge, Dächer als Anhöhe, `hpMul` 1,25), **3 neue Kreaturen** – Drachenwolf (Atem-Kegel Eis/Feuer, `atk: 'breath'`), Mantisklinge (Hiebe mit Nachbartreffern + Kopfgeld, `atk: 'slash'`), Felsgolem (Betäubung, Panzerbruch, Felswurf) – **2 neue Helden** Raizen (Kettenblitz, Blitzschlag, Donnerfall) und Mika (Heilerin: Aura, Leben pro Welle, Blütensegen, Lotusheiligtum), Heldenwahl, neues Element Eis mit 3 Reaktionen, 5 neue Synergien.

## Stand v0.2.0 (Vertical Slice + Genre-Optik)
**Neu in 0.2:** Querformat-Karte 22×13 mit steiler Kamera, Kreaturen **frei platzieren** (aus dem Shop ziehen oder antippen → Finger bewegen → loslassen; Kreis-Fußabdruck, Abstand zum Pfad), Shop-Leiste rechts mit großer ▶-/Tempo-Taste, Upgrade-Panel links mit 3D-Vorschau jeder nächsten Stufe, Kartenauswahl mit gerenderten Vorschaubildern + Modus-Karten, zweispaltige Sammlung, deutlich detailliertere Figuren (Anime-Augen, Fellbüschel, Pfoten, Rüstung, Schmuck), Normal spürbar leichter (150 Leben, mehr Startgeld, Boss schwächer; ein durchgelassener Boss kostet 100 Leben statt sofortiger Niederlage).

| Bereich | Inhalt |
|---|---|
| Karten (3) | Glutkrater (Lava, Spalten-Ausbrüche, treibende Flöße), Shinobi-Dorf (2 Eingänge), Ahnenhain (22×13, Querformat): verschlungener Pfad, Anhöhe (+15 % Reichweite), Teich (nur Wasserkreaturen, +20 % Tempo), räumbare Felsen, Torii, Laternen, Schrein mit Herzkristall (leuchtet nach Leben) |
| Kreaturen (8) | Drachenwolf, Mantisklinge, Felsgolem (je 3 Formen) + Kitsune (Benchmark, 7 Formen inkl. Zweig Geist/Schatten), Donnertiger, Eisenschildkröte, Geisthirsch (Support + Wirtschaft), Schattenrabe – je 3 Pfade × 5 Stufen, Kreuzpfade 5/2/0 |
| Helden (3) | Raizen (Blitz), Mika (Heilerin), Kairo, Fuchs-Shinobi: Level 1–20 im Run, Meilensteine (Passiv, Fähigkeit, Ultimate, Aufstieg, Meisterform), Sprüche, dauerhafter Rang |
| Gegner (13 + Boss) | Feuerdämon, Schildträger (nur Glutkrater), Moorschleim, Dornwolf, Eisenkeiler (Panzer), Irrlicht (fliegt), Schattenschleicher (getarnt), Nebelmagier (Schilde), Lotusmönch (heilt), Spaltkäfer → Käferlinge, Felskoloss (Titan), Oni-Hauptmann (Mini-Boss), **Vharox, Abgrunddrache** (4 Phasen: Erwachen, Schwingen/Flug, Feuersturm legt Türme lahm, Raserei + Diener) |
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
                        (prozedurale Modelle + Rückfall), assets (GLB laden, Gegner-Posen backen, Rig für Skin-Modelle), toon (Toon-Material, Umrisse, Verschmelzen/optimize), fx (Partikel, Ringe, Blitze,
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
