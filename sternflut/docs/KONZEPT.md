# STERNFLUT – Bauplan

Eigenes Spiel im Ordner `sternflut/`, Technik geforkt von Legends United (Bewegung, Kampf, Brut, Codes).
Eigener Spielstand (`sf-save`). Keine fremden Assets – alles prozedural.

## Roter Faden (One-Piece-Prinzip: alles vom Anfang zahlt sich am Ende aus)
1. **Gezeitenkompass** – am ersten Morgen am Strand gefunden, zeigt nie nach Norden, sondern auf das „Ende des Meeres“. Erwacht nach der Liga von Welt 1 und reißt dich in Welt 2. In Welt 3 ist er der Schlüssel des Sternentors.
2. **Das stille Ei** – lag neben dem Kompass. Schlüpft erst am Ende von Welt 2 (Legendäre **Aurelune**, Mutter-Gezeiten-Wesen).
3. **Versprechen am Leuchtturm** – Kind-Schwur mit Rivale **Jaro**: „Wer zuerst das Ende des Meeres sieht, wartet auf den anderen.“ Entscheidet das Finale von Welt 2.
4. **Mutter Kapitänin Liv Sund** – vor 10 Jahren mit der *Morgenstern* verschollen. 40 Logbuchseiten über drei Welten verteilt (Flags `log1..log40`).
5. **Lied der Gezeiten** – 8 Strophen auf Steinen in den Arenastädten von Welt 1 (Flags `song1..8`). Welt 1: schönes Lied. Welt 2: Seekarte. Welt 3: Startcode der Raumstation.
6. **Erster Bund** – die erste wilde Kreatur bekommt `m.bond = 'erster'`. Nur sie lernt im Finale „Ursprungsflut“.
7. **Pip** – kleiner Junge aus Muschelbucht, der dir überall „zufällig“ begegnet. Er ist ein Splitter des kosmischen Wesens – am Ende der Schlüssel.

Gegenspieler: **Orden der Stillen See** (Anführerin: die „Stille Äbtissin“). Motiv: Gezeiten anhalten, damit nie wieder jemand auf See verloren geht.
Wendung W1: Champion **Admiral Brann** hat einst das Tor zur äußeren Welt versiegelt. Wendung W2: Gründer des Ordens ist Professorin **Maren Kehl** aus Welt 1.
Finale W3: Ursprung der Gezeiten ist das kosmische Wesen **Thalassyr**.

## Welten
| Welt | Gebiet | Inhalt | Level |
|---|---|---|---|
| 1 | Kalmara-Archipel | 8 Arenen, Top 4, Champion | Arenen 12→55, Top 4 58–64 |
| 2 | Die Weite See (4 Länder) | Schiff (ausbaubar), Flugzeug, Tauchen, Unterwasserhöhlen, 8 Orden, Top 4 | 62→84, Top 4 86–90 |
| 3 | Sternentor → Planet Nyxara, Raumstation Halo | Station erobern und ausbauen, Expeditionen, Sternenkarte, Verteidigung | 90–100 |

## Kreaturen (Ziel 270)
W1 ~110 (Nr. 1–110), W2 ~100 (111–210), W3 ~45 (211–255) + ~19 Legendäre. Neuer Typ **Astral** in Welt 3.
Starter: Zundrak (Feuer) · Tidolin (Wasser) · Moospip (Pflanze).

## Arenen Welt 1
1. Ankerbrück – Kapitänin Rhea (Wasser) · Stadtproblem: Leuchtfeuer erloschen
2. Dünenhain – Sandläufer Okko (Erde)
3. Glimmwald – Sporenhexe Mira (Pflanze/Gift)
4. Funkenhafen – Ingenieur Volta (Elektro)
5. Nebelklippe – Seherin Ysolde (Geist)
6. Glutinsel – Schmiedin Hekla (Feuer)
7. Sturmspitze – Pilot Corvin (Luft)
8. Kronfels – Drachenhüter Tamas (Drache)

## Systeme
- **Pager** (START → PAGER): Story / Nebenaufgaben / Crew, aktuelles Ziel + Markierung. Daten: `QUESTS` in `js/gb/story.js`.
- **Minikarte** oben rechts (abschaltbar in Optionen).
- **Telefon**: Kontakte (Oma, Professorin, Rivale, Arenaleiter nach Sieg) – Tipps, Rückkämpfe, Massenausbruch-Meldungen.
- Revierkreaturen (warnen, dann Alpha-Kampf), Schleichen im hohen Gras, Füttern (Beeren → zutraulich), Spuren lesen, Nester, Wetterereignisse, Gebiete verändern sich (Ebbe/Flut).
- Reittiere: Galopp, Klettern, Graben, Gleiten, Eis, Lava (Bindung = Tempo).
- Lager + Kochen, Berufe, Bälle herstellen, Heimatinsel, Kreaturen-Helfer im Alltag, Kopfgeldbrett, Angel-Minispiel, Ausgrabungen, Geisterschiff.
- Wilde Doppelkämpfe, Titanen, Rätsel-Arenen, Rivale mit Entwicklung, Entscheidungen mit Folgen, Kombo-Attacken (Duo-Stein).
- Neue Bälle: Gezeiten-, Echo-, Anker-, Splitter-, Band-, Schattenkapsel, Tiefsee-, Sternenkern.
- Neue Items: Echomuschel, Typprisma, Wetterglas, Fährtenleser, Schutzamulett, Duo-Stein, Lockfutter, Logbuch-Lupe.
- Weggelassen auf Wunsch: Herden/Schwärme, Nahrungskette.

## Phasen
1. Fundament: Fork, Branding, Kreaturen 1–45, Pager/Minikarte/Telefon, Prolog, Muschelbucht, Route 1, Ankerbrück + Arena 1
2. Welt 1 Akt 1b: Arenen 2–3, Kreaturen bis 75, Schleichen/Füttern/Revier
3. Welt 1 Akt 2: Arenen 4–8, Top 4, Kreaturen bis 110, Reiten, Lager/Kochen
4. Welt 2: Schiff, Tauchen, Flugzeug, Land für Land
5. Welt 3: Portal, Planet, Raumstation
