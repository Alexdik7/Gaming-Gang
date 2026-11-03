# Fortschritt

## Handheld-Edition (v0.2) – aktuelle Hauptversion

### ✅ Funktioniert (getestet)

**Präsentation**
- Bildschirm mit 240×160 Pixeln wie beim Handheld.
- Steuerkreuz, A, B, START und SELECT auf dem Handy, im Hoch- und Querformat. Am PC per Tastatur.
- Kachelbewegung in vier Richtungen mit Lauf- und Rennanimation, Kanten zum Runterspringen und hohes Gras, das über die Füße wächst.
- Tag und Nacht mit Abenddämmerung. Manche Kreaturen erscheinen nur nachts.
- Alle Grafiken werden im Code erzeugt:
  - Pixel-Kacheln und Gebäude
  - Spielfiguren mit 4 Richtungen × 3 Frames
  - Kreaturen-Sprites: 64×64 von vorn und hinten, aus den 3D-Modellen gerendert und zu Pixel-Art verarbeitet

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
- **Koop für 4 Spieler in der Handheld-Edition:** Server und Netzwerk-Code stehen bereit, der 3D-Prototyp nutzt sie schon. Einbau als Nächstes.
- **Tauschen und Kämpfe zwischen Spielern.**
- **Weitere Regionen:** Ignis, Frostheim, Aqualis, Nocturna, Solaria, Drakmor.
- **Arenen 2–8, Top 4 und Champion.**
- **Mehr Kreaturen:** Ziel sind 150 Arten, aktuell sind es 45 plus beliebig viele Mutationen.
- **Eigens komponierte Musik:** Die Musik wird derzeit vom Spiel erzeugt.

## 3D-Prototyp (v0.1)
Der Stand ist unter `3d.html` erhalten: 3D-Welt Verdantia, Kampfinszenierung in 3D und die Multiplayer-Grundlage mit Weltserver.
