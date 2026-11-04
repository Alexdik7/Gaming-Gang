# Pixel-Art auf Konsolen-Niveau (prozedural per Canvas)

## Farben
- **Farbrampen statt Helligkeitsstufen:**
  - 4–6 Töne pro Material.
  - Dunklere Töne wandern im Farbton Richtung Blau/Violett und werden *gesättigter*. Hellere wandern Richtung Gelb und werden *entsättigter*.
  - Beispiel Gras: `#2e6a2c → #3e8e3c → #62b650 → #74c862 → #9ae078`.
  - Reines Abdunkeln (`shade(c,-0.3)`) wirkt matschig und billig.
- **Begrenzte Palette pro Szene** (ca. 16–32 Farben). Gleiche Grüntöne für Gras, Bäume und UI-Akzente schaffen Einheit.
- **Kontrast-Hierarchie:**
  - Hintergrund: mittlere Helligkeit, wenig Sättigung.
  - Interaktive Dinge und Figuren: stärkerer Kontrast und dunkle Kontur.
  - UI: höchster Kontrast.
- **Nacht und Höhle:** Farbton verschieben (kühl, violett) statt nur abdunkeln. Lichtquellen warm.

## Formen und Linien
- **Umrisse:**
  - Eine 1-px-Kontur für alles, womit man interagieren kann.
  - **Sel-Out** (selektive Kontur): auf der Lichtseite die Kontur als dunklen Ton der Füllfarbe, auf der Schattenseite fast schwarz-kühl. Umgesetzt in `polish()` (sprites.js).
- **Pixel-Treppen sauber:**
  - Linien in gleichmäßigen Stufen (1-1-1, 2-2-2, 1-2-1-2), keine „Jaggies“ wie 1-3-1.
  - Keine doppelten Pixel an Ecken (Doubles).
- **Cluster statt Pixelrauschen:**
  - Flächen bestehen aus zusammenhängenden Gruppen von 3+ Pixeln.
  - Einzelne verstreute Pixel nur als bewusste Glanzpunkte.
- **Anti-Aliasing** nur innen an Kurven (Zwischenton), nie an der Außenkontur gegen Transparenz.
- **Dithering** sparsam: nur für Verläufe in großen Flächen (Himmel, Wasser) und als Schachbrett mit 2 nahen Tönen.

## Licht und Volumen
- Licht von **oben links**, überall gleich.
- **Bauchlicht und Randlicht:** Ein heller Rand an der Lichtseite trennt die Figur vom Hintergrund. Leichter Umgebungsschatten unten rechts.
- **Kontaktschatten:**
  - Jede Figur und jedes Objekt bekommt eine weiche Ellipse am Boden (`softShadow`), etwa 20–25 % Deckkraft.
  - Ohne Schatten „schweben“ die Dinge.
- **Glanzpunkt** (1–2 px weiß) auf runden, glatten Dingen: Augen, Kristalle, Wasser.

## Kacheln (16×16)
- **Grundfläche ruhig:** Eine Grundfarbe, weiche großflächige Flecken in 2 Nachbartönen (über `hash` mit 4-px-Raster), dazu 2–3 gezeichnete Details.
- **Varianten:** 4–8 pro Kachelart, ausgewählt per Positions-Hash. So entstehen keine sichtbaren Diagonalmuster.
- **Übergänge (Autotiling):**
  - Kanten zwischen Materialien nie als harte Gitterlinie zeigen.
  - Minimum: 4 Seiten-Ränder (`grassFringe`, `shore`).
  - Profi: 16 Ecken- und Kantenkombinationen (Bitmaske N/O/S/W) bzw. 47er-Blob-Set.
- **Höhe lesbar machen:**
  - Klippen und Kanten haben eine helle Oberkante, eine dunkle Wand mit senkrechten Streifen und eine schwarze Fußlinie.
  - Schatten fällt nach unten rechts.
- **Tiefensortierung:** Baumkronen, Dächer und Brückengeländer werden *über* Figuren gezeichnet (eigene Ebene). Figuren nach y sortieren.
- **Animation in Kacheln** (Wasser, Blumen, hohes Gras): 2–4 Frames, 250–500 ms je Frame. Phasen per Position versetzen, damit nicht alles synchron blinkt.

## Figuren und Kreaturen
- **Silhouette zuerst:** Komplett schwarz gefüllt muss die Figur noch erkennbar sein.
- **Proportionen:**
  - Chibi-Figuren 16×24 mit großem Kopf (≈ 40 %).
  - Kampf-Sprites 64×64 mit klarer Pose, leicht von der Seite (3/4-Ansicht).
- **Augen** bestimmen den Charakter: 2×2 bis 3×3 px mit Glanzpunkt. Für einen bösen Blick die Brauen schräg setzen.
- **Idle-Animation:** 2–4 Frames Atmen (1 px hoch und runter, Körper leicht breiter), 400–600 ms je Frame.
- **Lauf-Zyklus:** 4 Frames (Kontakt, Durchgang, Kontakt, Durchgang). Kopf beim Durchgang 1 px höher.
- **Schillernde Variante:** den Farbton der Hauptfarbe verschieben, Kontur und Augen behalten.

## UI im Handheld-Stil
- **Rahmen:** 9-Slice mit 2–3 Ringen (dunkle Kontur, Akzentfarbe, Papierfläche). Ecken abgerundet mit 2–3 px. Ein Rahmenset für alles.
- **Schrift:**
  - Pixelschrift in ganzzahligen Größen.
  - Schatten 1 px nach unten rechts in hellem Grau auf Papier bzw. dunkel auf dunklem Grund.
- **Cursor:** ein pulsierender Pfeil bzw. eine Hand. Die Auswahl zusätzlich farbig hinterlegen.
- **Zahlen:** rechtsbündig. Balken haben Rahmen, Farbwechsel grün → gelb → rot und laufen weich nach (tween).
- **Infos verdichten:** Symbole (Typ-Plaketten, Geschlechtssymbole, Kristallfarbe) statt Text, wo möglich.

## Checkliste vor dem Abgeben
1. Screenshot bei 1× und gezoomt bei 4× ansehen.
2. Auf Rauschen, Jaggies, fehlende Schatten und Inkonsistenz beim Licht prüfen.
3. Kontrast: Ist die Spielfigur in jeder Umgebung sofort zu finden?
4. Farben gegen Dunkelmodus und Nacht-Overlay prüfen.
