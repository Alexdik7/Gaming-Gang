# Wolkenpfad

Endlos-Läufer über schwebende Tempelruinen über einem Wolkenmeer. Mira hat das Sonnenherz geholt, der Nebelschlund jagt sie.

**Spielen:** https://alexdik7.github.io/Gaming-Gang/wolkenpfad/
**Aufs iPhone:** in Safari öffnen → Teilen → „Zum Home-Bildschirm“. Danach läuft es offline.

## Steuerung
- **Wischen ← →:** Spur wechseln. Kurz vor einer Kreuzung wird damit abgebogen; goldene Pfeile zeigen die Richtung.
- **Wischen ↑:** springen (über Säulen, Geröll und Lücken)
- **Wischen ↓:** rutschen (unter Torbalken). In der Luft schnell landen.
- Am PC: Pfeiltasten bzw. WASD, Leertaste, P für Pause.

## Inhalt
- **Hindernisse:**
  - Säulen: springen
  - Torbalken: rutschen
  - Lücken: springen
  - Geröll: springen oder ausweichen
  - Statuen, Kristallfelsen und Feuerschalen: ausweichen
- **Kreuzungen:** links, rechts oder T-Kreuzung. Wer verpasst abzubiegen, prallt gegen die Wand.
- **Stolpern:** Wer seitlich gegen ein Hindernis stößt, stolpert und der Nebelschlund holt auf. Ein zweites Stolpern innerhalb von 8 Sekunden beendet den Lauf.
- **Kräfte** (im Shop in 5 Stufen verlängerbar):
  - Splittermagnet
  - Lichtschild
  - Sonnenflug (unverwundbar, biegt selbst ab)
  - Doppelglanz
- **Läufer:** Mira, Taro, Kitsu, Sola, Nox
- **Missionen:** Je drei geschaffte Missionen erhöhen den Punkte-Multiplikator.
- **Wiederbeleben:** kostet Splitter (250, dann jeweils das Doppelte).
- **Tageszeiten:** Alle 1000 m wechseln sie: Morgenrot → Mittag → Abendglut → Sternennacht.
- **Technik:**
  - Eigene Musik und Effekte per WebAudio
  - Grafik als Pseudo-3D in Canvas 2D, ohne Assets
  - Alles in `index.html`

## Technik-Notizen
- **Strecke:**
  - Segmente mit Ende `L`, `R` oder `T`, Richtungsbilanz `bal` ∈ {-1, 0, 1}. Dadurch kreuzt sich der Weg nie.
  - Bei T-Kreuzungen werden beide Arme erzeugt.
  - Die Abbiegung rechnet die Position exakt um (kein Sprung). Die Kamera schwenkt weich.
- **Fairness:** Der Autopilot-Test in Playwright läuft über 1000 m ohne Fehler. Der Mindestabstand zwischen Hindernissen beträgt ca. 0,85 s.
- **Updates:** bei Änderungen `CACHE` in `sw.js` erhöhen.
- **Testzugriff:** `window.WP` (`G`, `S`, `act`, `cur`, `fps`).
