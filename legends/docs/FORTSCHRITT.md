# Fortschritt

## v0.4 – Phase 2b (aktuell)

### ✅ Neu und getestet (automatisch, mit 2 gleichzeitigen Spielern)
- **Doppelkämpfe:** 2 gegen 2, Zielauswahl, Wechseln, Tränke.
  Im Einzelspiel steuerst du deine ersten beiden Kreaturen selbst.
- **Zwillinge Ria & Rio** (Quellbach, südlich vom Teich):
  - allein mit 2 Kreaturen oder zu zweit online
  - Belohnung: 1200 ◈
- **Felsenkoloss** (Kieselhöhle, oben rechts):
  - Koop-Boss nur für 2 Spieler, mit doppelten KP und 2 Aktionen pro Runde
  - Belohnung: 1500 ◈ + 2 Sternkristalle für beide
  - Danach ist der Gang frei.
- **Koop-Kämpfe:**
  - Der Server berechnet alles, jeder steuert seine eigene Kreatur.
  - Erfahrung und Entwicklungen gehen auf die echten Kreaturen über.
  - Die KP der echten Kreaturen bleiben unberührt.
- **Tausch-Entwicklungen:** Kieselkrebs, Schemenohr, Brockel und Irrlicht entwickeln sich sofort, wenn man sie tauscht.
- **Getauschte Kreaturen** bekommen 1,5× Erfahrung.
- **Sicherung** (ONLINE → SICHERN / WIEDERHERSTELLEN):
  - Der Spielstand wird zusätzlich auf dem Weltserver gesichert, automatisch bei jedem Speichern.
- **Gerät wechseln:**
  - Auf dem alten Gerät zeigt ONLINE → GERÄT WECHSELN einen 8-stelligen Code an.
  - Auf dem neuen Gerät: ONLINE → SPIELSTAND HOLEN.
- **Zu Freund reisen:** ONLINE → ZU FREUND REISEN bringt dich direkt neben einen Mitspieler.
- **Balance per Simulation geprüft** (je 300 Kämpfe):
  - Zwillinge allein mit Lv 14/12: etwa 30–60 % Siegchance, mit Lv 16: über 80 %
  - Koloss zu zweit mit Lv 16: etwa ein Drittel, mit Lv 18: etwa drei Viertel

## v0.3 – Phase 2a

### ✅ Neu und getestet
- **Neue Grafik:** Alle Kreaturen und Trainer sind jetzt echte 2D-Pixel-Art im Stil der 32-Bit-Handhelds:
  - 64×64-Kampfsprites von vorn und hinten, 32×32-Symbole
  - Schattierung in drei Stufen mit Licht von oben links, farbige Innenkonturen und dunkle Außenkontur
  - 20 Körperbautypen; Zusatzteile wie Hörner, Flügel oder Krone erscheinen auch bei Mutationen
  - Alle Grafiken sind eigenständig gestaltet.
- **3D-Teil entfernt:** `3d.html`, Three.js und die 3D-Welt sind gelöscht. Das Spiel lädt dadurch deutlich schneller (ca. 0,8 MB weniger).
- **Online-Koop** (START → ONLINE):
  - **Welten:** Welt erstellen (6-stelliger Code) oder mit Code beitreten, bis zu 4 Spieler. Die letzte Welt wird automatisch wieder betreten.
  - **Auf der Karte:** Mitspieler laufen sichtbar mit Namen herum; Chat-Nachrichten an alle.
  - **Freundschaftskampf:** Vor einen Mitspieler stellen → A → KÄMPFEN.
    - Der **Server** berechnet den Kampf, die Handys senden nur ihre Wahl.
    - Beide Teams kämpfen mit voller KP; danach ist niemand verletzt.
    - Aufgeben ist möglich, Items nicht.
  - **Tausch:** A → TAUSCHEN, beide wählen eine Kreatur, beide bestätigen.
    Die Kreatur merkt sich ihren ursprünglichen Trainer, und auch Mutationen lassen sich tauschen.
- Getestet mit zwei gleichzeitigen Spielern: verbinden, sich sehen, kompletter Kampf, Tausch.


## Handheld-Edition (v0.2)

### ✅ Funktioniert (getestet)

**Präsentation**
- Bildschirm mit 240×160 Pixeln wie beim Handheld.
- Steuerkreuz, A, B, START und SELECT auf dem Handy, im Hoch- und Querformat. Am PC per Tastatur.
- Kachelbewegung in vier Richtungen mit Lauf- und Rennanimation, Kanten zum Runterspringen und hohes Gras, das über die Füße wächst.
- Tag und Nacht mit Abenddämmerung. Manche Kreaturen erscheinen nur nachts.
- Alle Grafiken werden im Code erzeugt:
  - Pixel-Kacheln und Gebäude
  - Spielfiguren mit 4 Richtungen × 3 Frames
  - Kreaturen-Sprites: 64×64 von vorn und hinten (seit v0.3 als echte 2D-Pixel-Art)

**Start**
- Titelbild.
- Intro mit Professorin Linde.
- **Charakter-Editor:** Name, Haut, Haare, Oberteil, Hose und Mütze, mit Live-Vorschau groß und als Laufsprite.

**Welt:** 7 Außengebiete und 7 Innenräume.
- **Gebiete:** Moosgrund, Route 1, Quellbach, Altwald mit Ruinen, Route 2, Kieselhöhle, Felsenau
- **Innenräume:** Zuhause, Nachbarhaus, Labor, Heilzentrum, Laden, Brutstätte, Arena
- Schilder, Fundstücke, Angeln mit der Angel von Angler Jo, PC-Box im Heilzentrum.

**Story**
1. Starterwahl am Kristalltisch, danach der erste Kampf gegen Rivale Kian.
2. Chronik und Bindkristalle von der Professorin.
3. Rivalenkampf 2 auf Route 2.
4. Höhle, Arena Felsenau mit 2 Arena-Trainern und **Arenaleiter Gorm** → **Felsorden**.
5. **Geheimnis:** drei versteckte Runensteine im Altwald, danach erscheint nachts das legendäre **Sylvaron**.

**Trainer:** 7 Trainer, die dich sehen, mit „!“ auf dich zulaufen und dich herausfordern.

**Kreaturen:** 45 Arten in 20 Körperbautypen, dazu Entwicklungen, schillernde Varianten und 15 Typen.

**Kampf**
- Handheld-Layout: Gegner oben, eigene Kreatur von hinten.
- KP-Leisten, die sich abbauen, und eine EP-Leiste.
- Menü mit KAMPF, BEUTEL, TEAM und FLUCHT; Attackenmenü mit AP und Typ.
- Effekte: Partikel, Blitze, Wirbel, Beben und Bildschirmwackeln.
- Bindkristall-Wurf mit Wackeln.
- Levelaufstieg, Attacken lernen mit Vergessen-Dialog und Entwicklungsanimation.

**Brutstätte und Mutationen**
- Du gibst zwei Kreaturen ab. Beim Laufen gewinnen sie EP, und es entsteht ein Ei.
- Die Chance hängt davon ab, wie gut sich die beiden verstehen.
- Aus zwei **verschiedenen** Arten schlüpft eine **Mutation**, eine eigene neue Art:
  - **Name:** aus beiden Namen gemischt, z. B. Funkfux + Flatterlo → *Funkterlo*.
  - **Typen:** von beiden Eltern.
  - **Werte:** Durchschnitt beider Eltern plus 5 %.
  - **Attacken:** die Lernlisten beider Eltern zusammengelegt, plus je eine Erbattacke.
  - **Aussehen:** Körperbau von der **Mutter**, Farben und ein **Merkmal** vom **Vater** (Flügel, Hörner, Flossen, Pilzhut, Ohren …).
  - **Entwicklung:** möglich, wenn die Eltern sich entwickeln können.
- Mit 18 % Chance schlüpft ein **Mutant**: 10 % stärker, mit Stirnjuwel und eigenem Farbton.
- Mutationen lassen sich weiter kreuzen.
- Gleiche Arten ergeben ein normales Junges.
- Feuer-Kreaturen im Team brüten Eier doppelt so schnell aus.
- Schlüpfen mit Animation. Mutationen erscheinen in einer eigenen Rubrik der Chronik.

**Menüs:** Team (mit Reihenfolge tauschen), Bericht (2 Seiten), Chronik, Beutel, Trainerpass mit Orden, Speichern, Optionen (Musik, Effekte, Textgeschwindigkeit).

### ❌ Fehlt noch
- **Weitere Regionen:** Ignis, Frostheim, Aqualis, Nocturna, Solaria, Drakmor.
- **Arenen 2–8, Top 4 und Champion.**
- **Mehr Kreaturen:** Ziel sind 150 Arten, aktuell sind es 45 plus beliebig viele Mutationen.
- **Eigens komponierte Musik:** Die Musik wird derzeit vom Spiel erzeugt.

## 3D-Prototyp (v0.1)
Wurde mit v0.3 entfernt. Kampflogik, Daten und Server leben in der Handheld-Edition weiter.
