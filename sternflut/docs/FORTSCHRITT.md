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

## v1.6.0 – Eigene Attacken-Animationen + eindrucksvollere Entwicklungen
- Neues Modul `js/gb/anim.js`: **jede der 172 Attacken** hat eine eigene Signatur-Animation (`A[id]`), gebaut aus Bausteinen: `charge`, `orb`, `pillar`, `rain`, `spikes`, `wave`, `vines`, `claws`, `fangs`, `rings`, `tornado`, `lightning`, `shield`, `runeCircle`, `soundArcs`, `moon`, `hands`, `blackhole`, `nova`, `rainbow`, `aurora`, `meteor`, Farbschleier `tint`/`flash`, Bewegungen `lunge`/`hop`/`ram`/`strike`. Bühnen-Objekte in `sc.ov` (`tickOv`/`drawOv`).
- Eingehängt in `battle2d.animMove` und `double2d.animMove` (`signature(sc, id, {a,t,o,to,dir,hit})`); Doppelkampf nutzt jetzt auch `updateParts/drawParts/drawBeam` aus fx.js. Typ `astral` hat eigene Partikel-Palette.
- Entwicklungen: `sprites.js` berechnet Stufe in der Kette (`evoTier` → `tier`, `chainLen`), `monart.js` `evoInfo`: Basis kleiner und heller mit großen Augen, Endform deutlich größer (bis ×1.12), kräftigere Farben, Augenbrauen, typ-eigene Merkmale (`TYPE_EVO`: z. B. Feuer Flammenschweif + Mähne, Erde Hörner + Panzer), Endform einer 3er-Kette funkelt. Neue Merkmale `mane`, `armor`, `thorns`.
- Test: alle 172 Attacken im Kampf abgespielt (keine Fehler, 0,55–1,7 s je Attacke), Doppelkampf, e2e, Karten.

## v1.6.1 – Arena-Berater mit echten Tipps
- `guideTips(g)` in story.js: liest Leiter (NPC mit Eintrag in `GYMS`) und Team der aktuellen Arena, nennt Haupttyp(en), die drei wirksamsten Angriffstypen (Durchschnitt `effectiveness` gegen das Team), gefährdete eigene Typen, höchstes Level und Doppelkampf-Hinweis; nach dem Orden eigener Text. Gilt automatisch für alle 16 Arenen.

## v1.7.0 – Arenen werden Dungeons (Start: Rhea + Okko)
- **Arena Ankerbrück (Rhea):** 13×17, drei Becken mit Wasserkanälen, Schleusentore (`gates`) über Bodenplatten (`plates`) – Reihenfolge A (unten) → B (rechts) → C (links) → Leiterin. Neue Trainerin Schleusenwärterin Gesa, Insel mit Item über Brücke, zweites Item im Nebenbecken.
- **Arena Dünenhain (Okko):** 13×17, Sandwände, Treibsand-Löcher (`@`) mit Brocken füllen, dritter Brocken auf die Platte öffnet das Sandtor. `M.bReset`: solange das Rätsel ungelöst ist, liegen die Brocken beim Betreten wieder am Start (kein Festsitzen). Neue Trainerin Wüstenwächterin Sela.
- Nach dem Sieg: Flag `orden_<leiter>` (in `afterGym`, alte Spielstände in `enterWorld` nachgetragen inkl. offener Rätsel-Tore) → neue NPCs Bootsmann Hinnerk / Grabungshelferin Sandra mit Geschenk.
- Arena-Berater nennt den Rätsel-Tipp der Arena (`M.hint`).
- Test: beide Arenen per Wegsuche + Schieben komplett gelöst (`gymwalk.cjs`), Karten, e2e.

## v1.8.0 – Alle 8 Arenen von Welt 1 sind Rätsel-Dungeons
- Neue Bausteine in `overworld.js`: Tore mit mehreren Schaltern (`gates` mit Flag-Liste, `gateOpen`, Meldung „x von y Schaltern“ über `plateMsg`), schwere Platten nur für Brocken (`M.heavy`), Windfelder (`M.wind` {'x,y': Richtung}, tragen wie Eis, mit Streifen-Animation), Lava in Arenen unbetretbar, eigenes Aussehen für Tore (`M.gateLook` [zu, offen]), begehbare Teleport-Rune `+` (Kachel `runeOn`).
- Arena 3 Mira: Hecken-Irrgarten (Seed-generiert), Sporenplatte im hintersten Winkel öffnet die Heckenpforte. Arena 4 Volta: drei Stromkreise, links öffnet den Mittelgang, alle drei das Tor. Arena 5 Ysolde: Nebel + Nacht, drei Räume mit je einer richtigen Rune, Trainer verraten die Richtung. Arena 6 Hekla: drei Lavaflüsse, Kühlplatten lassen Lava zu Basalt erstarren, die mittlere nur mit Brocken. Arena 7 Corvin: Windströmungen, Aufwind rechts ins Obergeschoss, Aufwind links zu Corvin. Arena 8 Tamas: drei Prüfungen (Eis-Rutschrätsel, Mut-Trainer, Kraft-Brocken) → drei Siegel am Drachentor.
- Jede Arena: dritter Trainer, zwei Funde, Rätsel-Tipp beim Berater, nach dem Sieg neue Person mit Geschenk (`arena_fan3..8`). Okko-Platte jetzt auch „schwer“ (vorher reichte Drauftreten).
- `checkmaps.mjs` versteht mehrteilige Tore und Runen innerhalb der Karte. Test: alle 8 Arenen im echten Spiel bis zum Leiter gelöst (`gymwalk.cjs`).

## v1.9.0 – Botengänge + alle 40 Logbuchseiten
- 21 neue Logbuchseiten (20–40) in `story.js` (`Object.assign(LOGS, …)`): Livs Reise aus ihrer Sicht – Pip als Junge, der nicht altert, Marens Formel zum Anhalten der Gezeiten, das Ei auf der Abendstern, die Arenaleiter als junge Leute, Kronar/Brann und das Tor, ein letzter Brief für die eigene Insel.
- Botengänge `QNEXT` (11 Quests): nach dem Zeigen der Kreatur bittet die Person, etwas in eine andere Stadt zu bringen (`questReq` → Flag `qreq_<id>`), der Empfänger dankt und gibt eine Logbuchseite (`questRun`, Flag `qn_<id>`). Alte Spielstände: erledigte Quest-Personen stellen den Botengang beim nächsten Gespräch. Aufgabenliste im Pager zeigt Botengänge.
- Seiten 31–38 von den Arena-Personen nach dem Sieg (`fanLog`), Seite 39 beim ersten Fossil (Dr. Fossa), Seite 40 beim Bau des Leuchtfeuers auf der Heimatinsel.

## v1.10.0 – Lebendige Städte (Welt 1)
- Neues Modul `js/gb/staedte.js` (in `ACTS`): `placeLot` sucht zur Laufzeit einen freien Bauplatz (5×4, sonst 4×3/3×3), der keine Wege abschneidet (`freeTiles`/`reach` aus dig.js, jetzt exportiert); Innenräume werden als Karten angelegt.
- **Hafenamt** (Ankerbrück, Hafenmeisterin Dörte): Akte der Morgenstern – zählt Logbuchseiten und gibt täglich einen Hinweis auf eine fehlende Seite (`LOGHINT`), Abschluss bei 40/40.
- **Bibliothek** (Glimmdorf, Bibliothekar Theo): deutet jede gefundene Strophe (`MEANING`, Flag `deut_songN`), Deutung erscheint im Pager unter LIED; Belohnung bei 4 und 8 Strophen.
- **Fossilien-Museum** (Dünenhain, Kuratorin Amalie): stellt erweckte Urzeit-Arten aus, Belohnung bei 1 und 3.
- **Gasthof „Zur Ankerkette“** (Muschelbucht – in Kronfels war kein Platz, Wirtin Marthe): jeden Tag ein anderes Gerücht (Massenausbruch, Alphas, Rätsel-Tipps, Hinweise auf andere Systeme).

## v1.11.0 – Alle 8 Arenen von Welt 2 sind Rätsel-Dungeons
- Helfer `dgym(name, rows, lid, look, lname, npcs, extra)` in maps2.js/maps3.js (Leiter 6,1, Berater 4,15, 13×17).
- Arena 9 Nami: Strudel-Inseln (Runen-Warps, manche spülen zurück), Schleusenplatte auf der obersten Insel. Arena 10 Thalia (unter Wasser): drei Perlenschalen (Loch füllen / Mut-Trainer / schwerer Brocken) → mehrteiliges Riff-Tor. Arena 11 Ingrid: Eis-Rutschrätsel (per Löser erzeugt), zwei Frostsiegel. Arena 12 Bjarne: Grube mit zwei Schacht-Reihen (Brocken in Löcher) und Weichenplatte. Arena 13 Seraphine: Wolkenwände, nur der linke Luftstrom führt hoch, der rechte zu einem Fund. Arena 14 Orion (Nacht): vier Sternenkammern über Runen, vier Sterne öffnen die Kuppel. Arena 15 Mortis (Nacht+Nebel): Gruft-Irrgarten, zwei Grablichter. Arena 16 Selene (Nacht+Nebel): Schattenwand, zwei Mondsiegel mit Brocken.
- `bReset` akzeptiert Flag-Listen. Jede Arena: dritter Trainer, zwei Funde, Rätsel-Tipp, Person nach dem Sieg (`arena_fan9..16`).
- Test: alle 8 im echten Spiel bis zum Leiter gelöst (Eis über checkmaps-Simulation), Karten, e2e.

## v1.12.0 – Ebbe und Flut
- `game.tideLow()`: Ebbe in den Spielstunden 0–3, 6–9, 12–15, 18–21 (Wechsel alle 3 echten Minuten). `M.tide` = Liste von Feldern, die bei Ebbe zu Sand werden (`ow.ch` liefert dann `s`). Wechsel wird gemeldet; wer bei Flut auf einem Gezeitenfeld steht, wird an Land gesetzt; `M.tideRefuge`/`M.tideSafe`: auf der Gezeiteninsel bringt ein Fischerboot zurück an den Strand.
- Muschelstrand: Gezeitenstein (Schild), Sandbank nach Südosten zur Gezeiteninsel mit Fund und Eingang zur neuen **Gezeitengrotte** (Begegnungen `gezeiten` mit seltenem Perlmu, zwei Funde, Inschrift von Liv). Gerücht im Gasthof.
- checkmaps nimmt Ebbe an (Gezeitenfelder begehbar).

## v1.13.0 – 15 neue Kreaturen mit besonderem Auftreten (276 Arten)
- `js/data/welt_extra.js` (in creatures2.js importiert): Nr. 262–276 – Pfützling→Regenunke (nur bei Regen), Nebelmotte→Schleierfalter (nachts im Nebel), Ebbkrebs→Gezeitenpanzer (nur bei Ebbe, Gezeitengrotte), Glühwurmling→Lampyra (nachts im Glimmwald), Zuckfuchs→Donnerfähe (tagsüber Ostweide), Firnkauz (nur bei Schnee), Wolkenhüpfer→Himmelshase (Wolkengärten), Sternschnuppling→Kometenwächter (nachts auf Nyxara).
- `SPAWNS` hängt sie in die Begegnungstabellen (Level automatisch wie die Tabelle). Neue Bedingungen im 5. Feld: `rain`, `snow`, `ebbe` neben `night`/`day` → `game.encOk(e)`. Massenausbruch/Alpha nehmen keine bedingten Arten.
- Frostpfad hat an jedem zweiten Tag Schneefall, Eisgipfel immer.

## v1.14.0 – Schleichen mit Sichtkegeln
- Revierkreaturen sehen nur in Blickrichtung (`ow.inCone`/`seesPlayer`, Reichweite `coneRange`: normal r+1, geduckt außerhalb des Grases r/2, geduckt im hohen Gras nur 1) und schauen sich alle 2–4 s in eine andere Richtung um. Sichtkegel als rötliche Felder sichtbar (kräftiger nach der Warnung).
- Scheue Kreaturen fliehen für den Tag, wenn man in 3 Feldern Nähe rennt oder reitet (`scareShy`). Zwei neue Gasthof-Gerüchte erklären beides.

## v1.15.0 – Heimatinsel: Ostinsel
- Insel ist jetzt 36 breit; neues Projekt **Brücke zur Ostinsel** (6000 ◈) lässt eine zweite kleine Insel erscheinen (Ellipse um 29.5/8.5) mit Weg und drei Bauplätzen (Projekte mit `req: 'bruecke'`).
- **Forschungsstation** (Forscherin Nova): Belohnungen für 25/50/100/150/200/250 gebundene Arten (`MILE`). **Inselmarkt** (Händlerin Lotte): täglich drei wechselnde Raritäten (`OFFERS`). **Gästehaus** (Gastwirt Henk): jeden Tag besucht dich ein bereits besiegter Arenaleiter (`visitorToday`), Freundschaftskampf einmal pro Tag mit Team auf deinem Level.

## v1.16.0 – Feinschliff: Synergien, Wegweiser, Stadtleben, Tippflächen, Arena-Test
- Doppelkampf-Synergien (`battle/double.js`): **Gleichklang** (beide Partner gleicher Haupttyp → +15 % Schaden, Ansage zu Kampfbeginn), **Nachsetzen** (trifft ein Partner sehr effektiv, macht der andere auf dasselbe Ziel in derselben Runde +25 %).
- Pager ZIEL zeigt einen **Wegweiser** (`route()` in pager.js: Breitensuche über Kartenränder, Warps und Türen) vom aktuellen Ort zum Ziel.
- Stadtleben: Rauch aus Schornsteinen der Wohnhäuser, Möwen über Küstenorten am Tag (`drawGulls`).
- Tippflächen: Auswahllisten mit bis zu 5 Einträgen haben höhere Zeilen (16 statt 13), Tippbereich etwas breiter.
- Neues Testwerkzeug `tools/e2e/gyms.cjs`: löst alle Rätsel-Arenen im echten Spiel (Eis-Arena über checkmaps).
