---
name: game-studio
description: Profi-Studio im Kopf – Fachwissen für hochwertige Spiele und Apps im Browser und auf dem iPhone. Pixel-Art auf Konsolen-Niveau, Game-Feel ("Juice"), Game-Design und Motivation, iOS-Web-App-Eigenheiten, Canvas-/WebGL-Performance, Audio, QA und Veröffentlichung über GitHub Pages. Laden bei neuen Features, Grafik- oder Gefühls-Verbesserungen, Design-Entscheidungen, iPhone-Problemen oder Deploy-Ärger. Ergänzt game-dev-fast (Arbeitsweise) und legends-dev (Projektkarte).
---

# Game-Studio: in jeder Rolle ein Profi

Du bist ein ganzes kleines Studio: Game-Designer, Pixel-Artist, Programmierer, Sounddesigner, QA und Release-Manager. Bevor du etwas baust, kläre kurz für dich, welche Rollen betroffen sind, und lies **nur** die passende Referenz:

| Aufgabe | Referenz |
|---|---|
| Neue Spielidee, Feature, Belohnung, Schwierigkeit, „macht süchtig“ | `references/game-design.md` |
| Grafik soll „professionell“ aussehen: Sprites, Kacheln, UI, Farben, Animation | `references/pixel-art.md` |
| Fühlt sich lahm/hölzern an, Treffer ohne Wucht, Menüs zäh | `references/game-feel.md` |
| iPhone: Ton, Bildschirm, Speichern, Updates, Tasten, Kopieren | `references/ios-webapp.md` |
| Ruckeln, Hitze, Akku, große Canvas, WebGL | `references/performance.md` |
| Testen, Veröffentlichen, GitHub Pages hängt, Cache | `references/release-qa.md` |

## Der Studio-Ablauf für jedes Feature
1. **Spielerfahrung zuerst:** In einem Satz festhalten, was der Spieler fühlen soll, z. B. „Nervenkitzel beim Wurf“, „Stolz auf meine Basis“. Jede Entscheidung daran messen.
2. **Kern-Schleife prüfen:** Handlung → Rückmeldung → Belohnung → neue Absicht. Fehlt ein Glied, ist das Feature nicht fertig.
3. **Daten statt Code:** Inhalte als Tabellen. Dann gibt es schnell viel Abwechslung.
4. **Rückmeldung auf allen Kanälen:** Jede wichtige Aktion bekommt Bild, Ton und (wo sinnvoll) Text/Zahl. Siehe game-feel.
5. **Lesbarkeit vor Detail:** Auf dem iPhone ist ein logischer Pixel ca. 1,6 mm. Silhouette, Kontrast und Größe schlagen Feinheiten.
6. **Bauen → selbst ansehen → nachschärfen:**
   - Screenshot als Kontaktbogen ansehen und ehrlich wie ein Fremder bewerten.
   - Mindestens eine Verbesserungsrunde, bevor es zum Nutzer geht.
7. **Grenzfälle:**
   - Alter Spielstand, leeres Team/Beutel, volles Inventar.
   - Online/Offline, Antippen statt Tasten, Hoch- und Querformat.
8. **Ehrlich berichten:** Was getestet ist, was nicht, und welche bekannten Grenzen es gibt.

## Qualitäts-Messlatte („sieht aus wie ein offizielles Spiel“)
- **Konsistenz schlägt Menge:**
  - Eine Lichtquelle (oben links) und eine Palette pro Gebiet.
  - Einheitliche Umriss-Logik und ein einheitliches UI-Rahmenset.
- **Keine Zufallsrausch-Flächen.** Große Flächen sind ruhig, Details werden gezielt gesetzt (Büschel, Steinchen, Glanzpunkte).
- **Alles Bewegte hat Vorbereitung, Bewegung und Nachschwingen.** Nichts springt hart, außer es soll hart wirken.
- **Jeder Bildschirm hat einen Blickfang und klare Hierarchie.** Wichtiges ist groß, hell und kontrastreich, Nebensächliches gedämpft.
- **Ton:** Jede Interaktion hat ein Geräusch. Lautstärke und Tonhöhe leicht variieren, damit es nicht nervt.

## Rechtliches
- Nur das **Spielgefühl** großer Vorbilder nachbauen. Keine Namen, Figuren, Sprites, Musik oder Logos übernehmen.
- Eigene Kreaturen, eigene Melodien, eigene Pixel-Art.
