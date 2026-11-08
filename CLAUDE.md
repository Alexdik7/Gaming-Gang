# Gaming Gang – Projektgedächtnis

Repo `Alexdik7/Gaming-Gang`, Branch `main`. GitHub Pages ist live: https://alexdik7.github.io/Gaming-Gang/
Spiele: `sternflut/` (NEU, Nachfolger von Legends: eigenes Kreaturen-RPG, 3 Welten – Bauplan `sternflut/docs/KONZEPT.md`), `plug52/` (Tycoon, eine HTML-Datei), `legends/` (Kreaturen-RPG „Legends United“, Hauptprojekt), `wolkenpfad/` (3D-Endlos-Läufer à la Temple Run, eigene Welt; three.js lokal in `lib/`, Logik in `game.js`, Doku in `wolkenpfad/README.md`, Test über `window.WP` + Autopilot).

## Nutzer
- Deutsch, spielt auf dem **iPhone**: Web-App über „Zum Home-Bildschirm“, Updates kommen über GitHub Pages und `sw.js`. Android interessiert ihn nicht.
- Arbeitsweise: „Weiter“ = nächsten sinnvollen Schritt der Roadmap bauen. Am Ende jedes Schritts:
  1. bauen
  2. testen
  3. Doku aktualisieren
  4. committen und pushen
  5. Screenshot senden
  6. kurzer deutscher Bericht mit Link
- Will: flüssig, schön (eigene Pixel-Art, **keine** Nintendo-/Pokémon-Assets), sparsam mit Tokens.

## Pflicht-Regeln (spart Tokens)
- Vor Arbeit an Legends den Skill **legends-dev** laden: Landkarte, Rezepte, Stolperfallen. Für neue Spiele den Skill **game-dev-fast**.
- Für Qualität den Skill **game-studio** laden, und zwar bei neuen Features, Grafik, Spielgefühl, Design-Entscheidungen, iPhone-Eigenheiten und Deploy-Problemen. Dort nur die passende Referenz lesen: `pixel-art`, `game-feel`, `game-design`, `ios-webapp`, `performance` oder `release-qa`.
- **Nicht** ganze große Dateien lesen. Stattdessen `grep -n` und gezielte `sed -n a,bp`.
  - `maps.js` hat >1000 Zeilen, `game.js` ~1200.
- Mehrere Änderungen in **einem** `python3`-Skript mit `assert s.count(a)==1` erledigen.
- Testen mit `node legends/tools/e2e/run.cjs <newgame|walk|battle|offline|world|all>`. Der Server muss laufen: `cd legends/server && node server.js &`.
  - Kein neues Testskript schreiben, wenn ein Szenario passt; sonst `tools/e2e/lib.cjs` nutzen.
- Prüfwerkzeuge: `node legends/tools/checkmaps.mjs` (Karten) und `node legends/tools/balance.mjs` (Levelkurve).
- Keine Subagents ohne ausdrücklichen Wunsch.

## Veröffentlichen
- **Web und iPhone:** Push auf `main` → Pages deployt automatisch.
  - Bei jeder Änderung an Spieldateien `CACHE` in `legends/sw.js` erhöhen, sonst bekommen Handys das Update nicht.
  - Neue Dateien in die `FILES`-Liste von `sw.js` eintragen.
- **Android-APK:** nur auf ausdrücklichen Wunsch bauen, da der Nutzer ein iPhone hat. Die APK ist nur für Freunde mit Android. Workflow: `.github/workflows/android.yml`.
  - Pushes aus Claude-Sitzungen lösen den Workflow nicht aus → manuell starten:
    `gh api -X POST repos/Alexdik7/Gaming-Gang/actions/workflows/406802438/dispatches -f ref=main`
  - Ergebnis: Release `app-v1.N`. Download: https://github.com/Alexdik7/Gaming-Gang/releases/latest/download/LegendsUnited.apk
  - Releases sind unveränderlich, Secrets und Releases darf Claude nicht anlegen oder löschen.
- Commit-Nachricht endet mit den Attributionszeilen aus dem System-Hinweis. Keine Modell-IDs in Commits.
- Ist ein Push fehlgeschlagen, einfach erneut pushen (passiert gelegentlich).

## Stand (aktualisieren!)
- **Sternflut v1.5.4 (alle 3 Welten spielbar, 255 Kreaturen, Doppelkämpfe + Duo-Kombos in `duo.js`/`combos.js`, Ausgrabungen + Fossilien in `dig.js`/`fossil.js`, Heimatinsel in `island.js`, Sprite-Varianten `variant()` in monart.js, Nebenquest Prinzessin Ari in `ari.js` + Möwengrotte, OPTIONEN → Aussehen ändern, Dr. Vato leitet das Labor in `vato.js` – Prof. Kehl ist dort Gast-Forscherin, EP-Teiler ab Start, Doppelkampf zeigt Effektivität je Gegner + Anzeige über `dm[slot]`)** – Fork der Legends-Technik in `sternflut/` (eigener Spielstand `sf-save`, Test-Server: `cd sternflut && python3 -m http.server 8053`, Tests `node sternflut/tools/e2e/run.cjs all`, Karten `node sternflut/tools/checkmaps.mjs`):
  - Story/Talk/Sperren in `js/gb/story.js` (game.js delegiert: talkStory, afterTrainer, mapEvent, edgeBlock, songStone, altarStory, onCaught, afterGym), Pager in `js/gb/pager.js`, Minikarte `overworld.drawMini`, Leuchtturm `building({tower})`
  - Kreaturen in `js/data/kalmara1.js` (Nr. 1–45 + Aurelune 250) und `kalmara2.js` (46–75)
  - Mechaniken: Revier (`M.revier`, `overworld.revierCheck`, `game.revierBattle`), Schleichen (`p.sneak`, A im hohen Gras), Füttern (`M.shy`, `game.feedShy`), neue Regionsdateien in `creatures2.js` importieren
  - Akte als Module (`akt3.js` …) in `story.js` → `ACTS` einhängen (GYMS/QUESTS/LOGS/SONG/CALLS/goal/talk/mapEvent/afterGym); Reisen/Lager/Reiten in `travel.js`
  - Akt 1+2: Muschelbucht → Ankerbrück (Arena 1) → Küstenweg → Dünenhain/Sandgrotte (Arena 2) → Glimmpfad → Glimmwald → Glimmdorf (Arena 3). Akt 3: Schiff → Funkenhafen (Arena 4) → Nebelklippe (Arena 5). Akt 4 (`akt4.js`): Arenen 6–8, Kloster, Liga, Ende W1. Welt 2 (`akt5.js`, Karten in `maps2.js`, Kreaturen `welt2a.js`, `s.world = 2`, Häfen mit `world: 2`): Treibholz, Perlhafen (Morgenstern), Tauchen ins Korallenriff (`M.underwater`), Coralis, Frostholm, Erzmine (Kehl), Erzheim → Arenen 9–12. Welt 2 Teil 2: `akt6.js` + `maps3.js` (Flug `AIR`, Wolkenreich, Schattenmeer, Tiefe/Grund-Finale, Liga 2). Welt 3: `akt7.js` + `maps4.js` + `welt3.js` (`s.world = 3`, `M.alien`/`M.space`/`M.station`, Station `s.station` mit Modulen/Expedition/Verteidigung, Finale `sternenherz`). Extras in `extras.js` (Kopfgeld, Wetterglas `s.wx`, Fährtenleser, Lupe, Angel-Minispiel `fishGame`, Geisterschiff). Karten-Prüfer lädt maps2–4 mit. Mögliche nächste Schritte: Balancing nach Spieltest, Berufe
- **Legends United v2.10.1** (Vorbild ab jetzt: **Pokémon Smaragd** – Grafik, Bewegung, Menüs):
  - Inhalt: 150 Kreaturen, 8 Arenen, Liga, Postgame (Hüter), Raids 4v1 mit KI-Helfern und Online-Koop, Nihilux
  - Technik: komponierte Musik, Android-App, flüssige Subpixel-Bewegung, neue Weltgrafik
  - Kampf: Kampf-Intro mit Kristallwürfen, Smaragd-Hintergründe (`battlebg.js`), Smaragd-Statusboxen, Level-Up-Fenster
  - Oberwelt: Figuren 16×24 (`figure()` in pixel.js), Spiegelung, Fußspuren, Trainer-Übergang `iris()`, Startmenü mit Beschreibung, Beutel mit Taschen (`choose` mit `tabs`, `side`, `desc`)
  - Menüs: Team-Layout wie im Original, Bericht mit 3 Seiten (`moveDesc`), Wetter (`overworld.weather()`), Türen öffnen sich
  - Feld: Mitläufer (`ow.f`), 5 VMs (`vk_*`, Hindernisse `$` Busch / `&` Riss, `fieldObstacle`), Typ-Fähigkeiten (`fieldOptions`/`ability`), versteckte Funde (`genHidden`), Fliegen (`fly_<map>`-Flags)
  - iPhone: Hochformat mit hoher Oberwelt (`VH` in engine.js, Szene mit `tall = true`), Professor heißt **Dr. Vato** (blonder Zopf, `look.pony/jaw`)
  - Fangen: Wurf-Timing mit kritischem Fang (`aim` in battle2d), 7 Kristallarten (`ITEMS.cond`), Kreaturen-Spuren (`ow.trail`)
  - Resonanz-Form (`RESO_MIN`, `resoSprite`), Geheimbasis (`base.js`: Plätze, Möbel, Basis-Code `LU-…`, Karten `basis`/`gast` zur Laufzeit)
  - Grafik v2.0: ruhiges Gras, neue Büschel im hohen Gras, Wellen, Kanten, Zäune; `polish()` gibt allen Sprites Sel-Out-Umrisse und Randlicht
  - Server: dauerhaft in MongoDB Atlas (`server/store.js`, `MONGODB_URI`), Render-Blueprint `render.yaml`, Selbst-Ping gegen Einschlafen
  - Sicherungs-Code ohne Server (`exportSave`/`importSave`, Titel → CODE LADEN)
  - PC: Box-Bildschirm `boxui.js` (8×30, `m.slot`, `s.boxMeta`, Greifen/Tauschen)
  - v2.3–2.5: eigene Bälle (`ballIcon`, 52-Ball = Meisterball, 11 versteckt), Attacken-Effekte (`fx.js`), Schrift Atkinson Hyperlegible, neue Gebäude + Marktstände (`props`), 139 neue Kreaturen-Namen (IDs unverändert), Item-Bilder im Beutel (`itemIcon`)
  - v2.6–2.7: Kampfablauf wie im Original (Anzeige-Zustand `dF/dP/dLvl`), Wechsel-Frage, neue Kampf- und Arenamusik; Geschlecht ♂/♀ überall (`genderOf` in mon.js, `genderMark`), Brutstätte langsamer (256er-Takt, `eggSteps`), 52-Bälle unsichtbar mit `need` (`ow.secret`)
  - v2.8: Alpha-Kreaturen (`alphaFor`/`alphaBattle`, `m.alpha`), Tausch/Kampf per Code ohne Server (`codes.js`, ONLINE → PER CODE), Zwischensequenzen (`game.cutIn`, `ow.cine`)
  - v2.9: EP-Teiler (`battle.expShare`, Anruf nach Orden 1), Sonderbonbon (`useCandy`), Top-Trank/Top-Beleber
  - v2.9.1–2.10: Effektivität in der Attackenwahl (`effMark`), Gegner-KP als Zahl, Menschen neu (`people.js`, 5 Bilder: Stand/Schritt A/B/Durchgang/Blinzeln), Mitläufer stellt sich hinter den Rücken (`F.anim`)
  - Idee für später (Nutzer fragte): gemeinsame Koop-Welt mit eigener Story, evtl. WebRTC im selben WLAN
  - Sammeln: Chronik-Seite beim Erstfang, Belohnungen von Prof. Linde, Massenausbruch pro Tag, Glanzamulett
- Details in `legends/docs/FORTSCHRITT.md` und `ROADMAP.md`.
- **Wolkenpfad v2.0:** WebGL/three.js, Dschungel-Tempelpfad, 3D-Läuferin, Neigen-Steuerung, Kreuzungen, 6 Hindernisarten, 4 Kräfte, 5 Läufer, Missionen, Tageszeiten, Offline-PWA. `sw.js`-CACHE bei Änderungen erhöhen.
