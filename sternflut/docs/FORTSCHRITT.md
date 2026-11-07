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
