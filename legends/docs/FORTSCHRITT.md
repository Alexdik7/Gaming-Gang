# Fortschritt – Stand Phase 1 (v0.1.0)

## ✅ Funktioniert (getestet)

**Engine und Technik**
- Echtzeit-3D mit Three.js:
  - Schatten, Tone-Mapping, Nebel
  - eigene Shader für Wasser, Himmel mit Sonne und Mond, Wasserfall und Gras im Wind
  - Instancing für über 1.200 Bäume, über 4.000 Grashalme, 1.400 Blumen und über 200 Felsen
- Ladebildschirm mit Fortschritt. Installierbar als App (PWA) mit Offline-Cache.
- Drei Grafikstufen (hoch, mittel, niedrig) für PC und Handy.
- Steuerung:
  - Tastatur und Maus
  - Touch-Joystick und Kamera-Wischen am Handy
  - Kamera mit Zoom und Kollision mit Gebäuden

**Region 1: Verdantia**
- Dorf **Moosgrund** mit Labor, Heilzentrum, Kristallladen, eigenem Zuhause, Brunnen, Laternen und Zäunen.
- **Tempelruinen** mit Säulenring, Torbogen und Altar mit schwebendem Kristall.
- **Kristallsee** mit versteckter Sandbank zur Insel, Fluss und **Wasserfall** mit Höhle dahinter.
- **Schattenhain**: dunkler Wald, nur durch einen schmalen Pfad erreichbar.
- Gebirge als Weltgrenze.
- Tag-Nacht-Zyklus (24 Minuten pro Spieltag) mit Sonnenauf- und -untergang, Sternen, Mond, Glühwürmchen und Fensterlicht.
- Wetter: klar, wolkig, Regen mit Regenpartikeln, stärkerem Wind und dichterem Nebel.

**Kreaturen:** 10 eigenständige Arten und 3 Entwicklungen, also 13 Einträge in der Chronik.
- **Starter:** Funkfux (Feuer) → Glutfux (Feuer/Magie), Tropfmolch (Wasser) → Gezeitenmolch (Wasser/Drache), Sprossling (Pflanze) → Knorrwurz (Pflanze/Erde)
- **Wild:** Zirpfink, Voltmotte, Sporlich, Kieselkrebs, Schemenohr, Moospanzer
- **Legendär:** Sylvaron, der Hüter Verdantias
- Jede Art hat:
  - eigenes prozedurales 3D-Modell mit Animation (Idle, Laufen, Flattern, Glühen)
  - eigenen synthetischen Ruf
  - Werte, Lernset, Seltenheit und Hintergrundgeschichte
- Schillernde Varianten (1:512) mit anderer Farbe.
- Wilde Kreaturen laufen sichtbar in der Welt herum, abhängig von Gebiet, Tageszeit und Wetter.
- Dein erster Partner folgt dir durch die Welt.

**Kampfsystem**
- Rundenbasiert mit 15 Typen und vollständiger Effektivitätstabelle.
- 30 Attacken mit physischem, speziellem und Status-Schaden.
- Volltreffer, Statuswerte, Verbrennung, Vergiftung und Starre.
- Fangen mit Wackel-Animation.
- EP, Levelaufstieg, neue Attacken (mit Vergessen-Auswahl) und Entwicklung mit Animation.
- Inszenierung:
  - Kamerafahrten und 9 Effekttypen mit Partikeln in Typfarbe
  - Rückstoß, Kamerawackeln und Blitz bei sehr effektiven Treffern
  - Arena-Ringe; Bäume im Kampfbereich werden ausgeblendet
- Trainerkämpfe: Rivale Kian und drei Trainer in der Region.
- Niederlage: Rückkehr ins Heilzentrum.

**Story (Prolog):**
1. Ein neuer Morgen
2. Starterwahl
3. Rivalenkampf
4. „Erste Freunde“ (3 Kreaturen binden)
5. Ruinen untersuchen
6. Drei versteckte Runensteine finden (keiner ist auf der Karte markiert)
7. Nachts am Altar: Kampf gegen das legendäre **Sylvaron**

**Menüs:** Titel, Charaktererstellung, Team, Chronik, Tasche, Aufgaben, Karte, Koop, Statistik, Optionen, Laden, Kreaturen-Box, Dialoge.

**Speichern:** automatisch alle 20 Sekunden, nach Kämpfen und beim Schließen der App.

**Multiplayer-Grundlage**
- Weltserver (Node.js): Konten, Welt erstellen, Beitritt per 6-stelligem Code, maximal 4 Spieler.
- Die Welt bleibt bestehen, auch wenn der Ersteller offline ist.
- Mitspieler sind live sichtbar, mit Namensschild und flüssiger Interpolation.
- Gemeinsame Weltuhr und gemeinsames Wetter. Gemeinsamer Weltfortschritt: Runensteine gelten für alle.
- Chat.
- Speicherstände liegen auf dem Server.
- Wiederverbindung nach Abbruch.
- Schutz vor Manipulation: Prüfung der Geschwindigkeit, Plausibilitätsprüfung der Spielstände, Flood-Bremse.

## ❌ Fehlt noch (bewusst nicht als „fertig“ markiert)

| Bereich | Status |
|---|---|
| Tauschen, PvP, Doppel- und 2-gegen-2-Kämpfe, Koop-Bosse | Phase 2. Die Kampflogik ist dafür vorbereitet (getrennt von der Grafik). |
| Kampfberechnung auf dem Server | Phase 2. Kämpfe laufen aktuell auf dem Gerät des Spielers. |
| Freundesliste, Häuser besuchen | Phase 2 |
| Regionen 2–7, Arenen, Top 4, Champion | Phase 3–4. Verdantia hat noch keine Arena. |
| 150 Kreaturen | derzeit 13 |
| Gemeinsame Story-Entscheidungen | Phase 3 |
| Windows-Installer (.exe), Store-Apps | Phase 5. Bis dahin lässt sich das Spiel auf jedem Gerät als App installieren. |
| Professionelle 3D-Modelle und Animationen | Modelle sind stilisiert-prozedural, also absichtlich ein eigener Look ohne gekaufte Assets. |
| Musik | prozedural synthetisiert; komponierte Stücke folgen später |
