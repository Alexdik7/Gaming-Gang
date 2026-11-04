# Game-Feel („Juice“): warum sich etwas gut anfühlt

## Die 12 Hebel (günstig → aufwendig)
1. **Easing statt linear:**
   - Einblenden mit `easeOut` (cubic), Rückprall mit `backOut`, Schwingen mit `sin`.
   - Lineare Bewegungen wirken mechanisch.
2. **Vorbereitung → Aktion → Nachschwingen:** Vor dem Sprung kurz ducken (2–4 Frames), nach der Landung leicht stauchen (Squash & Stretch, Volumen bleibt gleich).
3. **Hit-Stop:** Bei starken Treffern 50–120 ms einfrieren. Das Gehirn liest das als Wucht.
4. **Bildschirmwackeln:** Kurz (0,2–0,5 s), mit Abklingen und richtungsabhängig. Sparsam einsetzen, sonst stumpft es ab. In Legends `G.shake`.
5. **Weißes Aufblitzen** des getroffenen Sprites (1–2 Frames) bzw. ein Vollbild-Blitz bei Kritischem.
6. **Partikel:** Treffer-Funken in Typfarbe, Staub beim Laufen, Gras beim Rascheln.
   - Kurze Lebensdauer (0,3–0,6 s), Schwerkraft, verblassen.
   - Höchstens ca. 60 gleichzeitig auf dem iPhone.
7. **Zahlen und Text-Popups:** „PERFEKT!“ oder Schaden springt hoch, skaliert, verblasst. Farbe nach Qualität (grau → grün → blau → gold).
8. **Ton-Schichten:**
   - Jede Aktion = Grundklang + Akzent.
   - Tonhöhe ±5 % zufällig.
   - Fortschritt steigt in der Tonhöhe an (Kombos, Münzen in Serie).
   - Erfolgs-Jingles in Dur, Fehler tief und kurz.
9. **Eingabe großzügig auswerten:**
   - Eingabe-Puffer: Ein Tastendruck kurz vor Ende einer Animation wird gemerkt.
   - Coyote-Time beim Springen.
   - Tippflächen größer als die Grafik (mind. 44×44 CSS-px).
10. **Reaktionszeit:** Jede Eingabe zeigt im selben Frame eine Wirkung (Klick-Ton, Cursor zuckt), auch wenn die eigentliche Aktion länger dauert.
11. **Kamera:**
    - Weich folgen (Lerp 0,1–0,2 pro Frame oder Subpixel-Runden).
    - Leicht in Blick- bzw. Laufrichtung vorausschauen.
    - Bei großen Momenten kurz zoomen bzw. einrahmen.
12. **Übergänge:** Nie hart schneiden. Fade, Wipe, Iris, Blitz-Doppel beim Kampfbeginn. 200–600 ms.

## Timing-Richtwerte
| Aktion | Dauer |
|---|---|
| Knopf-Rückmeldung | sofort, ≤ 1 Frame |
| Menü öffnen | 120–200 ms |
| Szenenwechsel | 300–600 ms |
| Text-Schreibgeschwindigkeit | 60–80 Zeichen/s, A beschleunigt |
| Belohnungs-Moment (Fang, Level-Up) | 1–2 s inkl. Jingle; danach sofort weiter |

## Spannung bauen (Fang-, Loot-, Gacha-Momente)
- **Verzögerte Auflösung:** Der Kristall wackelt 1–3-mal, mit Pausen dazwischen, und der Ton steigt. Die Spannung liegt *vor* dem Ergebnis.
- **Eigenes Können einbinden:** Ein Timing-Ring gibt dem Spieler das Gefühl, das Ergebnis beeinflusst zu haben, auch bei nur moderatem Bonus.
- **Beinahe-Treffer zeigen** („Argh! Beinahe!“). Das motiviert zum nächsten Versuch, aber nicht zu oft lügen.
- **Seltenheit sichtbar machen:** Funkeln, eigener Sound, eigene Farbe. Der Spieler soll es *vor* dem Kampf bemerken.

## Prüffragen
- Was hört und sieht man in den ersten 100 ms nach jedem Tastendruck?
- Gibt es eine Stelle, an der man wartet, ohne dass sich etwas bewegt? → Animation oder Überspringen anbieten.
- Fühlt sich der stärkste Angriff stärker an als der schwächste? (Wackeln, Hit-Stop, Partikelmenge staffeln.)
