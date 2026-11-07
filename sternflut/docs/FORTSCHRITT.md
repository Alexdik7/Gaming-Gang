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
