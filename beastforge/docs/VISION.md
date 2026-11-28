# Beastforge – Vision „From Good to Premium“ (verbindlich ab v0.37.2)

Vom Nutzer vorgegeben. Gilt für **jede** künftige Änderung an Beastforge.

## Leitfrage
Nicht „Wie baue ich das?“, sondern **„Wie baue ich das so, dass der Spieler es *fühlt*?“**
Das Spiel soll ein kleines, überraschend hochwertiges Anime-Strategiespiel sein, bei dem man „nur noch einen Run“ spielen will. Die eigene Identität ist Shinobi + Yokai + Anime + Fantasy, mit taktischer Tiefe und spektakulären Evolutionen. Keine fremden Marken, Figuren, Assets oder Namen.

**Neugier-Kreislauf:** Entdecken → Aufrüsten → sichtbare Veränderung → stärker → neue Mechanik → Belohnung → nächstes Ziel.

## Prioritäten (in dieser Reihenfolge)
1. **Game Feel:** Jeder Angriff hat eine sichtbare Abfolge:
   1. Vorbereitung: Körper spannt sich, Energie sammelt sich.
   2. Auslösen: Mündungsblitz.
   3. Flug mit eigener Spur.
   4. Treffer mit Gewicht.
   5. Reaktion des Gegners.
   6. Partikel, Ton, kleiner Kamera-Impuls, Zahl.
   7. Gegebenenfalls Elementreaktion und Kill-Feedback.
2. **Jede Stufe ist sichtbar.** 0-0-0, 5-0-0, 0-5-0 und 0-0-5 sehen klar verschieden aus. Jeder Pfad hat eine eigene Bildsprache, und auch Kreuzpfade sind sichtbar, etwa Akzente des zweiten Pfads. Keine reinen „+20 %“-Upgrades ohne sichtbare Wirkung.
3. **„Juice“-Regel:** Jede Aktion = Bewegung + Effekt + Ton + UI-Rückmeldung. Wichtige Aktionen bekommen zusätzlich einen Kamera-Impuls, aber dezent und angenehm auf dem Handy.
4. **Lesbarkeit vor Effektflut.** Effekt-Prioritäten:
   1. Mega
   2. Boss
   3. Ultimate
   4. große Reaktion
   5. Elite
   6. normaler Angriff

   Bei Massen greift ein reduzierter Effekt-Modus. Wichtiges bleibt immer sichtbar.
5. **Lieber klein und extrem poliert als groß und billig.** Keine Platzhalter-Effekte, keine identischen Attacken, kein Powercreep als Ersatz für Design.

## Technische Pflichten (unverändert gültig)
- **Simulation (`world.js`) strikt deterministisch:**
  - Nur der eigene RNG und ein fester Tick.
  - Kein `Math.random`, kein `Date`, kein `performance.now`, kein DOM.
  - Alle Welt-Änderungen über `game.cmd()`. Nötig für den Koop.
- **Die Darstellung verändert nie den Spielzustand.** Visuelles läuft über `world.events`.
- **Daten in `js/data/`, Zahlen in `js/config.js`.** Keine fest eingebauten Balance-Werte in Darstellung, UI oder Audio.
- **iPhone-Safari-Web-App:** 60 fps als Ziel und dynamische Qualität in der Reihenfolge Partikel → Umgebung → Schatten → Postprocessing → LOD → Animationen → Massenmodus. Das Gameplay ändert sich dabei nie.
- **Alte Spielstände:** `migrate()` erweitern, nichts zerstören.
- **Offline:** `sw.js` CACHE erhöhen und `FILES` ergänzen.
- **Bestehendes bleibt erhalten** und wird nur ausgebaut, nicht entfernt.
- **Vorgehen je Feature:** Architektur → Daten → Simulation → Darstellung → UI → Audio → Balancing → Save → Koop → Offline → Tests → erst dann Code.

## Qualitätsstandard
**Neue Kreatur gilt erst als fertig mit:**
- Basisform, 3 Pfade mit 15 Upgrades und 15 sichtbaren Veränderungen
- unterscheidbare Angriffe, Fähigkeit und Ultimate
- mindestens eine Synergie
- Balance-Werte und Codex-Eintrag
- getestet für Save, Koop und Leistung

**Mega-Form:** eigene Silhouette, Farbsprache, Attacke, Effekte, Ton, Auftritt, Ruhepose, Fähigkeit, Freischaltbedingung, Codex-Eintrag, Balancing, Koop- und Save-Unterstützung.

**Mega-Moment** (0,8–1,8 s):
1. Zeitlupe, Glow und leichter Zoom.
2. Partikel sammeln sich, eigener Ton.
3. Pose, Aufbau der neuen Form, Aura-Explosion.
4. Name der Form erscheint, kurze Kampfpose.
5. Sofort zurück ins Spiel.

## Bestandsaufnahme (Stand v0.37.2) → Lücken
| Bereich | Vorhanden | Lücke zur Vision |
|---|---|---|
| Angriffe | Angriffs-Posen je Kampfstil, präzise Treffer-Effekte, Ausholbewegung | Keine echte Vorbereitung/Auslösen je Kreatur, wenig eigene Projektil-Spuren, kaum eigene Töne |
| Upgrade-Optik | Jede Stufe zeigt Zubehör (looks.js), Stufe 4/5 Farbton, Stufe-5-Einblendung | Kreuzpfad-Akzente fehlen, Stufe 3 ändert die Silhouette noch zu wenig |
| Endformen | Ahnenform (Paragon) | Mega-Formen A/B/C mit Bedingungen fehlen |
| Fusionen | 12 Fusionen | Varianten je Build, Codex, Mega-Fusionen fehlen |
| HUD | Genre-Stil, Wellen-Vorschau, AUTO, Kräfte | Münzflug, Herz/roter Rand, Bereit-Puls und Ult-Ring nur teilweise oder gar nicht vorhanden |
| Kampf-Meta | Reaktionen (10), Synergien, Rudel | Reaktionsketten, Combo-System, neue Reaktionen fehlen |
| Bosse | Phasen, Warnung, Varianten | Telegraphing am Boden, Schwachpunkte, Phasenwechsel-Inszenierung fehlen |
| Audio | WebAudio-Synth, Musik je Karte, Plopp je Schicht | Klang je Kreatur, Prioritäten/Pooling, Musik-Ebenen (Erkunden/Kampf/Boss/Sieg) fehlen |
| Meta | Akademie (4 Schulen, 24 Knoten), Täglich, Woche, Truhen, Kosmetik | Akademie 2.0 mit Meisterprüfungen, Seltenheiten bei Truhen, Event-Regeln fehlen |
| Ende des Runs | Ergebnis mit Top 5, Kräfte, Truhen | „Noch ein Run“-Ziele (Fortschritt zum nächsten Ziel), Rekorde fehlen |
| Endgame | Endlos, freies Spiel, Herausforderungen | Boss Rush, Prüfungen (Fusion, Mega, Akademie), Bestenliste fehlen |

## Fahrplan (je „Weiter“ ein Schritt, jeweils komplett poliert)
1. **P1 Kampfgefühl** – ✅ Teil 1 (v0.38): Vorbereitung vor dem Schuss für alle 16 Kreaturen, Fusionen und Helden (`render/attackfx.js`, `view.charge/release`), Pfadfarbe + Kreuzpfad-Akzent, Signaturen Fuchsfeuer/Donner/Spritzer, Einschlag je Element mit Budget. Offen: eigene Projektil-Spuren je Pfad, Kill-Feedback, Animations-Werkzeug (→ mit P2).
   Ursprünglicher Plan: Animations-Werkzeug (`render/anim.js`: tween, spring, punch, shake, easeOutBack …). Angriffs-Choreografie als Daten (`ATTACK_FX` je Kreatur und Pfad: Vorbereitung, Auslösen, Spur, Treffer). Effekt-Budget mit Prioritäten. Zuerst Kitsune, Donnertiger, Schildkröte, dann alle 16.
2. **P2 HUD-Juice + Combo** – ✅ v0.39 (dazu P1 Teil 2: Spuren je Pfad, Seele/Elite-Kill, Treffer-Stopp):
   - Münzflug, Herz-Blinken mit rotem Rand, Bereit-Puls und Ult-Ring.
   - Combo-Zähler deterministisch in der Simulation, mit Bonus-Münzen und Abklingen.
3. **P3 Audio 2.0** – ✅ v0.40 Klangsignatur je Kreatur (`audio.voice`, `VOICE`), Prioritäten/Last (`audio.admit`, `LOWPRIO`); Musik-Intensität gab es schon. Offen: getrennte Musik-Ebenen je Karte: Klangsignatur je Kreatur, Prioritäten/Pooling, Musik-Ebenen je Karte.
4. **P4 Upgrade-Fenster 2.0** – ✅ Teil 1 v0.41: „Was du bekommst“-Chips (`hud.gains`, Vergleich über `baseStats`), Kauf-Moment (`hud.upFx`: Knopf-Punch, Ring + Münzflug zur Kreatur, Wackeln bei zu wenig Geld), größeres Porträt. Offen: Angriffs-Vorschau-Animation: großes 3D-Porträt, Vorschau „Was du bekommst“ mit kommendem Aussehen und Angriff, Kreuzpfad-Akzente.
5. **P5 Codex** – ✅ Teil 1 v0.42: `data/codex.js` (87 Einträge in 7 Reitern, `P.codex.seen`, Truhe je 10 Einträge), Entdecken im Run (`game.found`: Setzen, Kill, Boss, Reaktion, Synergie, Fusion), Bildschirm `s_codex` mit Silhouetten und „??? + ???“. Offen: Fusions-Varianten je Ausgangs-Build: Kreaturen, Formen, Fusionen, Gegner, Bosse, Reaktionen. Unentdecktes erscheint als „??? + ???“. Dazu Fusions-Varianten je Ausgangs-Build.
6. **P6 Mega-Formen** – ✅ v0.43: 48 Mega-Formen (je Kreatur A Zorn/B Bann/C Klinge, `data/megas.js`, eigene Namen u. a. Amaterasu-Kitsune), `world.megaInfo/mega` (Stufe 5 + `BAL.run.mega` Besiegte/Level/Kosten), Werte in `stats.js`, Geist-Doppelgänger hinter der Kreatur, Mega-Moment (Zeitlupe, Einströmen, Säule, Aura, Name), Codex-Reiter. Offen: eigene Attacke je Mega-Form: System + Mega-Moment, zuerst Kitsune (3 Formen), dann weitere Kreaturen.
7. **P7 Elemente 2.0** – ✅ v0.45: 6 neue Reaktionen (Höllenbrand, Reinigung, Verderbnis, Seelenfrost, Sonnenglut, Sternfall), Symbole für alle 16, Wirkungen `vuln`/`strip`, Kettenreaktion (`e.chainN`, `BAL.elem.chainWin/chainMul`, „CHAIN REACTION ×N“): neue Reaktionen (Überladung, Höllenbrand, Schneesturm, Reinigung, Verderbnis, toxischer Brand) und „CHAIN REACTION“.
8. **P8 Bosse 2.0** – ✅ v0.46: Vorwarnung vor dem Atem (`e.teleT`, `bossTele`: rote Zielkreise + Warnlinien), Schwachpunkt (+60 % Schaden beim Aufladen), Unterbrechen ab 3,5 % Max-KP (`bossStagger`, Taumeln), inszenierter Phasenwechsel (Dunkel, Säule, Bodenriss, „PHASE N“), `BAL.boss`: Boden-Warnungen, Schwachpunkt, inszenierter Phasenwechsel (Farbe, Musik, Umgebung).
9. **P9 Akademie 2.0** – ✅ v0.47: Meisterprüfung je Schule (eigene Regeln, Siegel +2 Punkte), Spezialisierungen (2 je Schule, eine aktiv), 4 geheime Knoten mit Hinweis: Spezialisierungen, geheime Knoten, Meisterprüfungen.
10. **P10 „Noch ein Run“** – ✅ Teil 1 v0.44: persönliche Rekorde (Welle je Karte, Combo, Kills, Münzen), „🎯 Nächste Ziele“ (Konto, nächste Form, Codex-Truhe, Wochen-Event), Knopf „▶ NOCH EIN RUN“. ✅ Teil 2 v0.50: Truhen-Seltenheiten (5 Stufen, ab Legendär Shinobi-Punkte). Offen: Aufgaben/Events mit eigenen Regeln:
    - Ergebnis-Bildschirm mit Zielbalken und persönlichen Rekorden.
    - Truhen-Seltenheiten (Selten, Episch, Legendär, Mythisch).
    - Abwechslungsreichere Tagesaufgaben und Events mit eigenen Regeln.
11. **P11 Endgame** – ✅ Teil 1 v0.48: Boss-Rush (6 Bosse, Kriegskasse, Rekord). ✅ Teil 2 v0.51: Prüfungsturm (10 Etagen). Offen: Mega-Fusionen, Fusions-/Mega-Prüfungen, Bestenliste. Ursprünglich: Boss Rush, Prüfungsturm, Fusions- und Mega-Prüfungen, Mega-Fusionen.
12. **P12 Koop-Extras** – ✅ v0.49: Seelenband (Kreaturen beider Spieler nebeneinander +10 % Schaden/+6 % Tempo), Spieler-Leiste mit Held, Geld, Anzahl, Status. Ursprünglich: Koop-Synergien (z. B. Spirit-Link), Spieler-Leiste mit Held, Geld, Anzahl und Status.

## Ehrliche Grenzen
- **3D-Modelle:** Neue Gestalten entstehen prozedural im Code oder aus CC0-Modellen, die per Knochen umgebaut werden. Handmodellierte Premium-Modelle kann ich nicht erzeugen.
- **Töne und Musik:** Sie werden synthetisch im Browser erzeugt (WebAudio). Echte Aufnahmen gibt es nur, wenn freie CC0-Klänge eingebunden werden.
