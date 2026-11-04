# Wolkenpfad

Endlos-Läufer in echtem 3D (three.js, lokal in `lib/`) über einen Tempelpfad hoch über dem Nebelwald – im Stil der klassischen Tempel-Läufer. Mira hat das Sonnenherz geholt, zwei Schattenwesen des Nebelschlunds jagen sie.

**Spielen:** https://alexdik7.github.io/Gaming-Gang/wolkenpfad/
**Aufs iPhone:** in Safari öffnen → Teilen → „Zum Home-Bildschirm“. Danach läuft es offline.

## Steuerung
- **Steuerung wählbar:** Wischen oder Neigen (Handy kippen zum Ausweichen; Wischen bleibt für Springen, Rutschen, Abbiegen).
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
  - Münzmagnet
  - Schutzamulett
  - Sonnenflug (unverwundbar, biegt selbst ab)
  - Goldrausch
- **Läufer:** Mira, Taro, Kitsu, Sola, Nox
- **Missionen:** Je drei geschaffte Missionen erhöhen den Punkte-Multiplikator.
- **Wiederbeleben:** kostet Münzen (250, dann jeweils das Doppelte).
- **Tageszeiten:** Alle 1000 m wechseln sie: Morgenrot → Mittag → Abendglut → Sternennacht.
- **Technik:**
  - Eigene Musik und Effekte per WebAudio
  - WebGL mit three.js: Licht, Schatten, Nebel, prozedurale Texturen (Stein, Mauer, Rinde, Dschungel)
  - 3D-Läuferin mit Laufanimation, Intro-Kamera am Tempel
  - Code in `game.js`, Oberfläche in `index.html`

## Technik-Notizen
- **Strecke:**
  - Segmente mit Ende `L`, `R` oder `T`, Richtungsbilanz `bal` ∈ {-1, 0, 1}. Dadurch kreuzt sich der Weg nie.
  - Bei T-Kreuzungen werden beide Arme erzeugt.
  - Die Abbiegung rechnet die Position exakt um (kein Sprung). Die Kamera schwenkt weich.
- **Fairness:** Der Autopilot-Test in Playwright läuft über 1000 m ohne Fehler. Der Mindestabstand zwischen Hindernissen beträgt ca. 0,85 s.
- **Updates:** bei Änderungen `CACHE` in `sw.js` erhöhen.
- **Testzugriff:** `window.WP` (`G`, `S`, `act`, `cur`, `fps`).
