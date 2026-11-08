# Art Style Guide und Asset-Regeln

## 1. Grundsatz
Alle Grafiken und Töne sind **selbst erzeugt**: prozedural per Code (`client/js/art.js`) oder später als eigene Pixel-Dateien unter `client/assets/`. Fremde Assets, Pokémon-Material, Nintendo-Material oder Rips sind **verboten**. Lizenzierte Assets nur mit dokumentierter Lizenz (CC0/CC-BY) in `client/assets/LICENSES.md`.

## 2. Perspektive und Raster
- Draufsicht mit leichter Schräge (¾-Top-Down): Wände zeigen ihre Front, Dächer ihre Fläche.
- **Kachel: 16×16 px.** Sichtfeld 15×11 Kacheln, ganzzahlig auf Gerätepixel skaliert (`image-rendering: pixelated`).
- **Figuren: 16×20 px** (Kopf 7 px, Körper 6 px, Beine 4 px, 2 px Schatten). Sie stehen auf der Kachelunterkante und ragen 4–6 px nach oben.
- **Wildlinge:**
  - Oberwelt 16×16 (Mitläufer)
  - Kampf 64×64 (Front)
  - Rücken 48×48
  - Bestiarium 96×96 (hochskaliert und nachgezeichnet)

## 3. Palette und Licht

| Rolle | Farben |
|---|---|
| Wiese | `#5fae4e` `#6cbd58` `#529a44` `#7bcb63` |
| Weg | `#d8bf8a` `#cdb07a` `#e4cd9a` `#bfa16c` |
| Wasser | `#3a7fd0` `#4c93e0` `#7ab8f0` `#2c66b0` |
| Baum | `#1f5a32` `#2d7a40` `#3f9450` `#5fb060` (Stamm `#5a3a24`) |
| UI | Nachtviolett `#1a1830`, Karte `#26233f`, Gold `#f0c040`, Äther-Blau `#64b0f0` |

- Elementfarben sind in `shared/types.js` (`TYPE_INFO.color`) festgelegt und werden überall verwendet (Typ-Chips, Attacken, Effekte).
- **Licht von oben links.** Glanzpunkt oben links, Schatten unten rechts, Schlagschatten halbtransparent schwarz (25 %).
- Pro Sprite höchstens 4 Farben plus Umriss. **Sel-out-Umriss:** dunkles Violett `#181420` statt reinem Schwarz.
- Tag und Nacht: Nachts liegt ein Multiplikations-Overlay `#3040a0` mit 45 % über der Szene, Lichtquellen sind additiv (Meilenstein 3).

## 4. Kreaturen-Design-Regeln
1. **Bauplan zuerst:** Jede Art hat einen Körpertyp (`sprite.body`: marder, blob, molch, eule, larve, motte, krabbe, schnecke …) und eine eigene Silhouette, die auch schwarz gefüllt erkennbar ist.
2. **Ein Merkmal, das die Lore erzählt:** etwa der glimmende Schweif oder das Moos auf dem Rücken.
3. **Entwicklungen** behalten Farbcode und Merkmal und werden größer und komplexer.
4. **Ähnlichkeitsprüfung vor der Aufnahme:**
   - Erinnert die Silhouette an eine bekannte Figur?
   - Erinnern Farbschema und Name an eine bekannte Figur?
   - Erinnert die Kombination aus Element und Tier an eine bekannte Figur?

   Bei zwei Treffern wird umgestaltet.
5. **Namen:** deutsch, zusammengesetzt aus Merkmal und Tier/Ding (Kohl-Wiesel, Echo-Schnecke). Keine Anspielungen auf bekannte Marken.

## 5. Animation
- **Figuren:** 4 Richtungen × 3 Bilder (Stand, Schritt A, Schritt B). Ein Schritt dauert 200 ms, das Bild wechselt bei der halben Strecke.
- **Wasser:** 4 Bilder à 250 ms. Gras und Bäume sind statisch, Wind kommt als Effekt-Ebene.
- **Wildlinge im Kampf:**
  - Atem-Idle mit 2 Bildern, 600 ms
  - Treffer: 2 Bilder weiß blinkend
  - Angriff: Ausfallbewegung
  - Entwicklung: Silhouette pulsiert weiß, mit Partikeln
- Alle Animationen laufen über die Zeit (`performance.now()`), nicht über Frames. Das Ergebnis ist bei 60 und 120 Hz gleich schnell.

## 6. UI
- Karten-Panels mit 2 px Rand und 6 px Schatten nach unten, abgerundete Ecken mit 6–10 px.
- Systemschrift im Fundament. Ab Meilenstein 3 eine eigene Pixel-Schrift, lokal eingebunden (offline).
- Touch-Ziele mindestens 44×44 pt. Steuerkreuz unten, Chat darunter, Safe-Area beachten.

## 7. Audio
- Alles läuft über WebAudio-Synthese:
  - Musik als Notenstrings pro Kontext (Stadt, Route, Wald, Nacht, Kampf, Arena, Boss, Finale)
  - Effekte als kurze Hüllkurven
- Der **Ruf jeder Art** ist in ihren Daten beschrieben (`sound: {wave, notes, dur}`). Das sind kleine, wiedererkennbare Motive.
- Lautstärken: Musik −14 dB, Effekte −8 dB, Rufe −10 dB. Stummschalter in den Einstellungen.
