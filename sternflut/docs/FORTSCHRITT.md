# Sternflut – Fortschritt

## v0.1 – Phase 1: Fundament und Akt 1
- Eigenes Spiel auf Basis der Legends-Technik (flüssige Bewegung, Kampf, Brutstätte, Tausch/Kampf per Code)
- Titelbild: Nachtmeer mit Sternen, Mond und Leuchtturm mit rotierendem Lichtkegel
- Prolog-Erzählung: die Morgenstern, Kapitänin Liv Sund, der Sturm
- 45 neue Kreaturen (Starter Zundrak, Tidolin, Moospip mit je 3 Stufen) + 28 neue Attacken
- Neue Bälle: Fangkugel, Sternkugel, Gezeitenkugel, Blitzkugel, Echokugel (wird jede Runde stärker), Bandkugel, Schattenkapsel, Ankerkugel (Alpha/Revier), Splitterkugel
- Neue Items: Echomuschel, Lockfutter, Schutzamulett
- Pager (Ziel, Aufgaben, Logbuch, Lied, Karte), Minikarte, Muschelfon (Oma, Prof. Kehl, Jaro, Rhea)
- Story Akt 1: Gezeitenkompass + Stilles Ei, Revier-Kneifling, Starterwahl am Strand, Rivale Jaro, Versprechen im Leuchtturm, Erster Bund, Orden der Stillen See in der Werft (Schwester Nebel), Leuchtfeuer entzünden, Arena 1 (Kapitänin Rhea), Liedstein 1, Logbuchseiten 1–3
- Karten: Muschelbucht, Muschelstrand, Dünenpfad, Ankerbrück + Innenräume

## v0.2 – Phase 2: Dünenhain und Glimmwald (Arenen 2 und 3)
- 30 neue Kreaturen (Nr. 46–75) + 18 neue Attacken, Datei `js/data/kalmara2.js`
- Karten: Küstenweg, Dünenhain (Oase, Basar), Sandgrotte, Glimmpfad, Glimmwald, Glimmdorf, Arena 2 und 3
- **Revierkreaturen** (`M.revier`): warnen im Umkreis, greifen an, wer näher kommt; geduckt nur aus 1 Feld. Täglich neu, seltene Beute. Story-Revier „Waldherz“
- **Schleichen**: im hohen Gras A drücken → ducken (langsamer, weniger Begegnungen, seltene Arten häufiger, überraschte Kreaturen 1,5× leichter zu fangen, Spuren hüpfen nicht weg)
- **Füttern** (`M.shy`): scheue Kreaturen mit der Lieblingsbeere füttern → schließen sich freiwillig an (falsche Beere → flieht bis morgen)
- Story: Okko und Schwester Nebel in der Sandgrotte (Quelle versiegt), Prof. Kehl im Glimmwald, schlafendes Glimmdorf und das Waldherz, Jaro und die Frau in der weißen Kutte
- Arenen: Okko (Erde, Dünenorden), Mira (Pflanze/Gift, Sporenorden); Liedsteine 2 und 3; Logbuchseiten 4–6; 2 neue Suchaufträge

## v0.3 – Phase 3: Die Seeschwalbe (Arenen 4 und 5)
- Schiffsreisen mit Kapitän Harm (`travel.js`: `PORTS`, `sailMenu`, Reise-Szene), Häfen Ankerbrück, Funkenhafen, Nebelklippe
- Reiten (Sattel von Hedda, START → REITEN, `RIDE` in kalmara3.js), Lager mit Kochen (Zelt, START → LAGER, 8 Rezepte, Zutaten in der Markthalle)
- 20 neue Kreaturen (76–95) + 10 Attacken; Karten: Funkenhafen, Ostweide (Ranch), Kraftwerk (Schaltplatten-Rätsel), Nebelklippe (Nebel), Nebelpfad, Wrack der Abendstern (dunkel), Arenen 4 und 5
- Story (`akt3.js`): Bruder Funke und der Tor-Kristall, Livs Sattel, Schwester Nebel verlässt den Orden, Kapitän Morrow und Livs Brief, Ysoldes Vision, erste Begegnung mit der Äbtissin Sela – und Pips Licht

## v0.4 – Phase 4: Ende von Welt 1 (Arenen 6–8, Orden-Finale, Liga)
- 15 neue Kreaturen (96–110) inkl. der drei Wächter Ignivar, Zephyra, Kronar (legendär, fangbar als `revier` mit `legend: true`)
- Glutinsel + Glutpfad + Glutkrater (Arena 6 Hekla), Sturmspitze + Windpass (Arena 7 Corvin), Kronfels + Kloster (Finale gegen Äbtissin Sela, Kehls Verrat, Okko findet seine Mutter), Arena 8 Tamas
- Liga-Insel: Jaros letzter Kampf, Top 4 (Lio, Marisol, Raven, Saphira), Champion Admiral Brann; Ruhmeshalle mit neuem Abspann; Ende in Muschelbucht – der Kompass erwacht
- Logbuchseiten 9–12, Strophen VI–VIII (Lied vollständig)

## v0.5 – Phase 5: Welt 2, Teil 1 – Die Weite See
- Durch das Tor (Portal-Szene), Treibholzinsel, Perlhafen: die Morgenstern wird dein Schiff (Jaro als Steuermann), Häfen mit `world: 2`
- Tauchen (`M.underwater`: blaue Tönung, Lichtstrahlen, Blasen) ins Korallenriff und nach Coralis; Tiefseekugel
- Frostholm: Frosthafen, Frostpfad, Erzmine (Kampf gegen Prof. Kehl), Erzheim, Eisgipfel (Boreal)
- Arenen 9–12 (Nami, Thalia, Ingrid mit Eisrutsch-Arena, Bjarne), Gezeitenjäger und Jägerin Vex, Corvin kommt mit der Albatros
- 50 neue Kreaturen (111–160), Logbuchseiten 13–15

## v1.0 – Phase 6–8: Welt 2 komplett, Welt 3, Extras – das Spiel steht
- **Welt 2, Teil 2** (`akt6.js`, `maps3.js`, `welt2b.js` Nr. 161–210): Flüge mit Corvins Albatros (`AIR`), Wolkenreich (Wolkenmeer-Kachel `°`, Arenen 13 Seraphine, 14 Orion in der Sternwarte), Schattenmeer (Nocthal, Geisterbucht mit Vex, Nachtfels, Arenen 15 Mortis, 16 Selene), die Tiefe und der Grund: Liv, Kehl, Thalassyr, das Stille Ei schlüpft (Aurelune), Lied der Gezeiten. Liga der Weiten See (Korvan, Freya, Nyra, Solon, Kaiserin Maris). Legendäre: Aerion, Noctyra, Boreal
- **Welt 3** (`akt7.js`, `maps4.js`, `welt3.js` Nr. 211–255, neuer Typ **Astral**): Sternentor, Nyxara (violettes Licht), Lumara und Ältester Oru, Prüfung der Nacht (Nyxion), Himmelsfaden, Raumstation Halo (Rask, AURA), Stationsausbau mit Sternstaub (6 Module: Brutkammer, Sternengarten, Hangar mit Expeditionen, Observatorium, Kampfsimulator, Sternenantrieb für Weltenreisen), Verteidigung gegen Schwärme, Finale im Sternenherz (Kehl, Thalassyrs Sternengestalt, Kosmara, Erster Bund lernt Ursprungsflut, Pip schließt sich an), Abspann über alle drei Welten. Postgame-Legendäre: Solaryx, Halora, Kosmara
- **Extras** (`extras.js`): Kopfgeldbrett (Brix in Ankerbrück, Perlhafen, Lumara; täglicher Steckbrief), Wetterglas, Fährtenleser, Logbuch-Lupe, Angel-Minispiel mit Timing, Geisterschiff (Nebelklippe, nachts) mit Kapitän Grimbart
- Logbuch: 19 Seiten über drei Welten

## v1.1 – Doppelkämpfe und Duostein
- **Doppelkämpfe nur gegen Trainer** (`duo.js`: Liste `DOUBLE`, 17 Trainer über alle Welten) und Arenen 4 (Volta) + 13 (Seraphine) mit `double: true`. `trainerFight` leitet bei `t.double` auf `duoFight` um (2 gegen 2, beide Gegner-Plätze aus einem Team). Mit nur einer kampffähigen Kreatur gibt es einen normalen Kampf.
- **Duostein**: Belohnung für den ersten gewonnenen Doppelkampf. Danach steht im Doppelkampf statt FLUCHT **KOMBO** im Menü (nur für Platz p0, einmal pro Kampf).
- **Kombos** (`data/combos.js`, `DoubleBattle.useCombo`): Typpaar der beiden ersten Typen → Name und Zusatzwirkung, z. B. Dampfgeysir (Feuer+Wasser), Lebensquell (Pflanze+Wasser heilt), Gewitterflut (Elektro+Wasser lähmt). Gleiche Typen haben eigene Namen, alle übrigen heißen Duo-Sturm. Die Kombo trifft alle Gegner mit Stärke 120 und dem besseren der beiden Typen und geht immer zuerst.

## v1.2 – Ausgrabungen
- `dig.js` (als Akt-Modul in `ACTS`): 8 Grabstellen („Glitzernder Fels“, `n.dig`) in Sandgrotte, Glutkrater, Erzmine und Kristallwald. `placeSpot` sucht freie Felder an der Wand, ohne die Karte zu zerschneiden (Erreichbarkeitsprüfung). Die Stellen werden erst in `init` platziert, wenn MAPS2–4 geladen sind. Jede Stelle füllt sich täglich neu (`flags[grab_i] = Tag`).
- Dr. Fossa (Dünenhain, am Eingang der Sandgrotte) gibt das **Grabset**, erweckt Fossilien und kauft Schätze (Urbernstein, Sternquarz, Goldmuschel, Meteorit).
- Minispiel `DigScene`: 13×7 Felder mit Erdschichten. HACKE (Kreuz, kostet 1) oder HAMMER (3×3, kostet 2), die Wandleiste hält 54 Punkte. 2–4 Funde je nach Welt (`LOOT`), Bedienung mit Tippen oder Steuerkreuz + A/B.
- 6 Ur-Kreaturen (`data/fossil.js`, Nr. 256–261): Ammolit→Ammokron, Krallix→Urkrallor, Schwingstein→Aerodax (Entwicklung mit Lv 40, Erweckung mit Lv 25).

## v1.3 – Heimatinsel
- `island.js` (Akt-Modul): Kapitänin Wenke in Ankerbrück gibt ab Orden 1 den **Inselkompass**. Im Freien aus dem Beutel benutzen → Heimatinsel (`s.islandRet` merkt den Ort). Zurück geht es mit Bootsfrau Ebbe am Steg.
- Karte `heimatinsel` wird aus dem Ausbaustand erzeugt (`buildIsland(s)`, Prüfung über `M.sig` in `mapEvent`).
- Baumeisterin Tilda baut 5 Projekte (`PROJECTS`) gegen Geld und Grabschätze: Hütte (`inselhaus`: Bett + PC), Beerenfeld (6 Sträucher), Weide (6 Kreaturen aus der Box, die täglich EP sammeln, höchstens 7 Tage), Werkstatt (`inselwerk`: Tüftler Bo, `RECIPES` für Kugeln und Tränke) und Leuchtfeuer.
- `story.useItem` fragt jetzt alle Akt-Module ab.

## v1.4 – Kreaturen-Grafik
- `monart.js`: `variant(spec)` leitet aus den Farben jeder Art eine feste Abwandlung ab:
  - Kopfgröße und Körperbreite/-höhe (`morphParts`/`morphMeta`)
  - Fellmuster nur auf der Hauptfarbe (Streifen, Flecken, Sattel, farbige Spitzen; der Ton bleibt über `cv.tn` erhalten)
  - Augen mit Irisfarbe, Punktaugen, Brauen bei Entwicklungen, Wangenröte bei Babys
  - Kronen gibt es nur noch bei Legendären (Größe ≥ 1,45), sonst wechseln Kamm, Hörner und Krone ab.

## v1.5 – Nebenquest „Rette die Prinzessin Ari“ + Fehlerbehebung
- `ari.js` (Akt-Modul):
  - Hauptmann Gerold in Kronfels startet die Quest (`ari_start`). Fischer Jonte gibt danach den Weg in die neue **Möwengrotte** frei (Eingang am Ostrand von Kronfels).
  - In der Grotte warten 3 Sturmpiraten, davon die Zwillinge Flick & Flack im Doppelkampf. Sie geben den Kerkerschlüssel (`ari_key`), der das Gitter `E` öffnet.
  - Danach folgt die Befreiung und ein Doppelkampf **mit Ari als Partnerin** gegen Käpt’n Krähe und Bootsfrau Gischt.
  - Belohnung: 7000 ◈, 52-Ball und 3 Sonderbonbons (`ari_done`).
  - Neue Hooks in story.js: `sideTasks` und `afterTrainer` fragen jetzt alle Akt-Module ab (Pager → AUFGABEN).
- Fehler: Der Charakter-Editor beim neuen Spiel blieb schwarz, weil nach dem Prolog nicht wieder eingeblendet wurde. Behoben in `editor()` mit `fade(0)`.
- Neu: OPTIONEN → **Aussehen ändern** (Name und Look jederzeit änderbar).

## v1.5.1 – EP-Teiler ab Spielbeginn
- Den EP-Teiler gibt es jetzt von Anfang an: im Start-Beutel (`newState`) und für alte Spielstände in `enterWorld`. Kehls Anruf nach dem 2. Jaro-Kampf bringt nur noch die Sonderbonbons.

## v1.5.2 – Dr. Vato
- `vato.js` (Akt-Modul): Dr. Vato (blonder Zopf, `LOOK_VATO`) leitet das Labor in Muschelbucht („Labor von Dr. Vato“). **Prof. Kehl forscht dort als Gast.**
- Erstes Gespräch: Vorstellung, Erfinder des EP-Teilers, Geschenk (5 Fangkugeln, 3 Heiltränke), danach Kontakt im PAGER (`CALLS.vato`).
- Nach dem Champion-Titel (`flags.champion`): Kampf gegen Dr. Vato (6 Kreaturen, Lv 66–70). Belohnung: 9000 ◈ und das **Glanzamulett** (neu in `ITEMS`, mehr schillernde Kreaturen).

## v1.5.3 – Fehlerbehebungen
- Gift/Verbrennung nach einem Wechsel: Bei der Wechsel-Frage („… wird X einsetzen. Auswechseln?“) wurde sofort mitten in der Runde gewechselt. Der Schaden der alten Kreatur am Rundenende erschien dann bei der neuen. Jetzt merkt sich `battle2d.play` den Wechsel in `pendingShift` und führt ihn erst nach allen Ereignissen der Runde aus.
- Alle Menschen und Trainer drehen sich beim Ansprechen zum Spieler (vorher nicht bei ungeschlagenen Trainern). Ausnahme: Grabstellen (`n.dig`).

## v1.5.4 – Doppelkämpfe sauberer
- Effektivität im Doppelkampf: Zeichen je Gegner hinter jeder Attacke (Reihenfolge wie oben links/rechts), rechts im Feld „Name – Sehr eff./Wenig eff./Keine/Normal“ für beide Gegner, bei der Zielwahl zusätzlich Hinweis über den Gegnern. `effMark` aus battle2d exportiert, `effOn`/`drawTargetEff` in double2d.
- Anzeige folgt jetzt den Ereignissen (`this.dm[slot]`) statt dem schon fertig berechneten Zug: Beim Zurückrufen sieht man die alte Kreatur, beim Umfallen die besiegte (nicht schon die nachrückende), Statusbox verschwindet nach dem Besiegen. `send`-Ereignisse tragen `hp`.
- Hänger behoben: Fallen beide eigenen Kreaturen und es gibt nur noch eine Reserve, wird der zweite Platz leer gelassen (`forcedSwitch(id, -1)`), statt endlos eine Auswahl zu verlangen.

## v1.5.5 – Offline-Schutz
- `sw.js`: Netz zuerst, aber nur `r.ok`-Antworten werden gespeichert. Bei 404/Fehlerseite (z. B. Seite offline/gesperrt) liefert der Service Worker die gespeicherte Fassung, bei Navigation notfalls `index.html`. Vorher hat eine 404-Seite den Speicher überschrieben → Spiel startete gar nicht mehr. Getestet mit Server, der auf 404 umschaltet (alt: „Error response“, neu: Spiel startet).

## v1.5.6 – Nie mehr in der Wand stecken
- `overworld.load()`: Steht die Figur beim Laden auf einem festen Feld (`wallAt`: Wand, Gebäude, geschlossenes Tor, Felsen, Deko), wird sie per Breitensuche auf das nächste freie Feld gesetzt (nicht auf einen Warp). Greift bei jedem Kartenwechsel und beim Fortsetzen eines Spielstands.
- Rettung eines bestehenden Spielstands ohne Update: Sicherungs-Code (LUS1-… = gzip+base64 JSON) mit `map/x/y` lesen, Position korrigieren, neu packen → im Titel „CODE LADEN“.

## v1.5.7 – Kraftwerk-Tür
- Ursache des Wand-Bugs: Die Kraftwerk-Tür in Funkenhafen führt per `enterDoor` hinein, das Kraftwerk hat aber keine Fußmatte `m` → Start bei 0,0 in der Wand. `enterDoor` nimmt jetzt ohne Matte das Feld über dem Warp zurück zur Ausgangskarte (Kraftwerk: 6,10).
- Rettung beim Laden wählt nur Felder, von denen ein Ausgang erreichbar ist (`canLeave`), also nie hinter geschlossene Tore.
- `checkmaps` meldet Türen in Innenkarten ohne Matte und ohne Rückweg.

## v1.5.8 – Updates kommen sofort an
- `sw.js`: Installation lädt alle Dateien mit `cache: 'reload'`, Abrufe mit `cache: 'no-cache'` → kein bis zu 10 Minuten alter Browser-Zwischenspeicher von GitHub Pages mehr (Nutzer bekam nach dem Push weiter die alte Kraftwerk-Tür).
