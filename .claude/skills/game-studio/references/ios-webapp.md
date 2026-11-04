# iPhone-Web-App (Home-Bildschirm) – Eigenheiten und Lösungen

## Installation und Anzeige
- **Meta-Tags:**
  - `apple-mobile-web-app-capable=yes` und `apple-mobile-web-app-status-bar-style=black-translucent`
  - `viewport-fit=cover`
  - `apple-touch-icon` als PNG 180×180
- **Safe Areas:** `env(safe-area-inset-*)` für Notch und Home-Leiste. Bedienelemente nie in die untersten ca. 20 px.
- **Höhe:** `100vh` ist auf iOS unzuverlässig. Nimm `100dvh`, `innerHeight` oder ein Layout mit `position:fixed; inset:0`. Bei `resize` und `orientationchange` neu messen.
- **Kein Fullscreen-API und keine Orientierungssperre auf dem iPhone.** Beide Ausrichtungen sauber unterstützen (Legends: `VH` hoch, Querformat mit Seitentasten).
- **Zoom und Scrollen verhindern:**
  - `touch-action:none` auf der Spielfläche, `user-select:none`, `-webkit-touch-callout:none`.
  - Doppeltipp-Zoom per `touch-action: manipulation` auf Knöpfen verhindern.

## Eingabe
- `pointerdown` statt `click`, damit es keine 300-ms-Verzögerung gibt. Mehrfinger für Steuerkreuz und A gleichzeitig.
- Tasten mindestens 44×44 pt. Ein Druck gibt optische Rückmeldung (Farbe bzw. Skalierung).
- **Keine Vibration:** `navigator.vibrate` gibt es auf iOS nicht. Stattdessen Bildschirm-Wackeln und Ton.
- **Texteingabe:** echtes `<input>` einblenden. Danach `blur()`, sonst bleibt die Tastatur oder der Fokus hängen. `autocapitalize="off"`.

## Ton
- AudioContext erst nach einer Nutzergeste starten bzw. `resume()`. Bei `visibilitychange` und `pageshow` erneut `resume()`.
- `navigator.audioSession.type = 'playback'` (Safari 16.4+): Ton läuft dann auch bei Stummschalter … bzw. mischt korrekt.
- iOS stoppt Audio im Hintergrund. Musik beim Zurückkehren neu ansetzen.

## Speichern und Daten
- **Speicher:**
  - `localStorage` ist synchron, ca. 5 MB, und reicht für Spielstände. Größeres gehört in IndexedDB.
  - Home-Bildschirm-Apps haben **eigenen** Speicher, getrennt von Safari. Ein Spielstand aus Safari ist in der App nicht da.
  - Safari löscht Speicher von Seiten, die 7 Tage nicht besucht wurden (ITP). Installierte Apps sind meist ausgenommen, trotzdem Export-Code bzw. Server-Sicherung anbieten.
- **Sicher speichern:** bei `visibilitychange` (hidden) und `pagehide`. `beforeunload` feuert auf iOS kaum.
- **Zwischenablage:**
  - `navigator.clipboard.writeText` geht nur in einer Nutzergeste. Nach `await` ist die Geste oft verbraucht.
  - Immer eine Rückfallebene: Text in einem `<input>` anzeigen und markieren.
- **Teilen:** `navigator.share({text})` öffnet das iOS-Teilen-Menü (WhatsApp usw.). Ebenfalls nur aus einer Geste heraus. Ideal für Codes.

## Updates (Service Worker)
- `CACHE`-Version bei **jeder** Änderung erhöhen und neue Dateien in `FILES` eintragen.
- Neuer SW: `skipWaiting()` + `clients.claim()`. Den Spieler anweisen, die App einmal zu öffnen, ganz zu schließen und neu zu öffnen.
- Ein kaputter SW kann die App „einfrieren“. Darum `fetch`-Handler mit Netzwerk-Fallback und keine Fehler beim `install` (ein fehlender Eintrag in `FILES` lässt die ganze Installation scheitern).

## Grafik-Grenzen (Safari)
- **Canvas:**
  - Gesamt-Speicher aller Canvases ist begrenzt (ca. 384 MB). Einzelne Canvas höchstens ca. 16,7 Mio. Pixel.
  - Offscreen-Caches klein halten, Größen nicht vervielfachen, nicht benötigte freigeben (`width=0`).
- `ctx.filter` erst ab Safari 18. Lieber vorberechnete Bilder (Tönung per `source-in`, Pixel-Manipulation einmalig).
- `shadowBlur` und große Gradienten pro Frame sind teuer. Vorrendern.
- **WebGL:** auf `webglcontextlost` reagieren. Pixelratio auf ≤ 2 begrenzen.
- `image-rendering: pixelated` für scharfe Pixel. Canvas in ganzzahligem Vielfachen der logischen Auflösung × dpr.
