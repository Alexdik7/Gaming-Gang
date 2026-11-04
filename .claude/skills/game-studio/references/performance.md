# Performance: 60 fps auf dem iPhone, kühl und akkuschonend

## Hauptschleife
- `requestAnimationFrame`, `dt` in Sekunden, **begrenzen** (`min(dt, 0.05)`), damit nach Tab-Wechsel nichts teleportiert.
- Logik, die exakt sein muss (Physik, Rhythmus): fester Zeitschritt mit Akkumulator, dazu Interpolation beim Zeichnen.
- 120-Hz-Displays (ProMotion): alles über `dt` rechnen, nie „pro Frame“.

## Zeichnen (Canvas 2D)
- **Alles Statische einmal vorzeichnen** und dann nur noch `drawImage`:
  - Kacheln, Gebäude, Schatten, Vignette, Lichtmasken.
  - Cache mit Schlüssel (Name + Frame + Variante).
- **Nur Sichtbares zeichnen** (Kachelbereich der Kamera ± 1).
- **Keine Objekte pro Frame erzeugen:** keine Gradienten, keine Pfade aus vielen Punkten, keine `getImageData`. Partikel-Arrays wiederverwenden bzw. filtern statt neu bauen.
- Ganzzahlige oder auf `1/SCALE` gerundete Koordinaten. Sonst glättet der Browser und es wird teuer.
- **Zustand sparen:**
  - `globalAlpha` und `fillStyle` gruppieren.
  - `save/restore` nur wo nötig.
  - Text ist teuer: statische Texte cachen.
- **Große Vollbild-Effekte** (Nacht, Wetter) als vorgerendertes Bild mit `globalCompositeOperation` und nur bei Änderung neu erstellen (Cache-Schlüssel, z. B. `sun:VH`).

## WebGL / three.js
- Geometrie zusammenführen (merged BufferGeometry), Instancing für Bäume und Münzen. Draw-Calls < 100.
- Schatten nur für 1 Licht mit kleiner Shadow-Map (512–1024). Kein Antialias bei pixelRatio 2.
- Objekte poolen (Strecke, Hindernisse) statt erzeugen und entsorgen. `dispose()` für Geometrie und Texturen, die gehen.

## Messen statt raten
- `performance.now()` um Update und Draw. Im Test Durchschnitt und Ausreißer protokollieren.
- **Lauftest:**
  - Pixel pro Frame konstant, keine Stillstände.
  - Einzelne Aussetzer im GPU-losen Testrechner tolerieren (≤ 2), Stillstände nie.
- Headless-Chromium ist 3–10× langsamer als ein iPhone. Relativ vergleichen (vorher/nachher), nicht absolut.

## Speicher
- Caches begrenzen (z. B. LRU für Sprites). Bei vielen Kreaturen nur benutzte Sprites erzeugen (lazy).
- Spielstand klein halten. Abgeleitete Werte nicht speichern, sondern berechnen.
