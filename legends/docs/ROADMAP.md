# Roadmap – Meilensteine und Ablaufplan

Jede Phase endet mit einer spielbaren, getesteten Version auf GitHub Pages. Gebaut wird in festen **Arbeitspaketen** (AP).
Pro AP gilt dieselbe Reihenfolge: Daten → Logik → Darstellung → automatischer Test (Playwright, auch mit 2 Spielern) → Doku → Upload.
So bleibt das Spiel nach jedem Schritt spielbar, und nichts wird doppelt gebaut.

| Phase | Inhalt | Status |
|---|---|---|
| **1 – Grundgerüst** | Welt, Bewegung, Kämpfe, Fangen, Menüs, Speichern, Netzwerk-Grundlage | ✅ v0.1 |
| **1b – Handheld-Edition** | 240×160-Darstellung, Steuerkreuz, Charakter-Editor, 45 Kreaturen, Brutstätte & Mutationen, Arena 1 | ✅ v0.2 |
| **2a – Grafik & Koop** | eigene 2D-Pixel-Art statt 3D-Renderings, 3D-Teil entfernt, Online-Welt, Mitspieler auf der Karte, Freundschaftskampf (Server berechnet), Tausch, Chat | ✅ v0.3 |
| **2b – Koop-Ausbau** | Doppelkämpfe 2 gegen 2, Koop gegen Trainer-Duo und Boss, Tausch-Entwicklungen, Server-Sicherung & Geräte-Übertragung, Zu Freund reisen | ✅ v0.4 |
| **3 – Hauptspiel** | Regionen Ignis, Aqualis, Frostheim · Arenen 2–4 mit Rätseln · Team Eklipse · Rivalin Lyra · 75 Kreaturen · Items (Beeren, Attacken-Kristalle) · Nebenquests | ✅ v0.5–v0.8 |
| **4 – Endgame** ⏳ läuft (4.1 ✅ v0.9 · 4.2 ✅ v0.10 · 4.3 ✅ v0.11) | Regionen Nocturna, Solaria, Drakmor · Arenen 5–8 · Top 4 · Champion · legendäre Hüter · Geheimorte nur zu viert · Postgame · 150 Kreaturen | geplant |
| **5 – Qualität** | komponierte Musik, Animationen, Balancing, Performance, Windows-App (Tauri), Store-Apps (Capacitor) | geplant |

## Phase 2b – erledigt (v0.4)

| AP | Inhalt | Status |
|---|---|---|
| 2b.6 | Tausch-Entwicklungen (Kieselkrebs, Schemenohr, Brockel, Irrlicht) + 1,5× EP für getauschte Kreaturen | ✅ |
| 2b.4 | Spielstand auf dem Server sichern/wiederherstellen, Übertragung auf neues Gerät per Code | ✅ |
| 2b.1 | Doppelkampf-Logik (2 gegen 2, 2 gegen Boss mit 2 Aktionen pro Runde) | ✅ |
| 2b.2 | Doppelkampf-Bildschirm mit Zielauswahl | ✅ |
| 2b.3 | Koop-Kämpfe zu zweit (Server berechnet): Zwillinge Ria & Rio, Felsenkoloss | ✅ |
| 2b.5 | „Zu Freund reisen“ (ONLINE-Menü) | ✅ |
| – | Freundesliste über Welten hinweg, Spielerhäuser | verschoben nach Phase 5 (wenig Nutzen bei 4 festen Freunden) |

## Ablaufplan Phase 3

| AP | Inhalt | Status |
|---|---|---|
| 3.1 | Karten-Werkzeug: Karten als Textzeilen + Prüfskript `tools/checkmaps.mjs` (Übergänge, Türen, Erreichbarkeit) | ✅ v0.5 |
| 3.2 | Region Ignis: Route 3 (Aschepfad), Stadt Ignis, Arena 2 (Selma, Feuer, Lava-Labyrinth), 10 Kreaturen, 3 Attacken | ✅ v0.5 |
| 3.3 | Team Eklipse: Rüpel besetzen die Arena, Kommandantin Nyx, Versteck auf der Insel, Meeres-Herzstein | ✅ v0.5/v0.6 |
| 3.4 | Region Aqualis: Route 4, Surfen (Wellenreiter), Arena 3 (Meri, Wasser), Eklipse-Versteck, 10 Kreaturen | ✅ v0.6 |
| 3.5 | Region Frostheim: Frostpass mit Eissee, Arena 4 (Halvar, Eisrutsch-Rätsel), Rivalin Lyra, 10 Kreaturen | ✅ v0.7 |
| 3.6 | Eisgrotte mit Doppel-Finale gegen Nyx & Lyra, Items (Beeren, Klarbeere, Beleber, 8 Attacken-Kristalle), Beerenbüsche, 3 Nebenquests, Balancing-Skript `tools/balance.mjs` | ✅ v0.8 |

## Ablaufplan Phase 4 (Entwurf)

| AP | Inhalt | Status |
|---|---|---|
| 4.1 | Region Nocturna (ewige Nacht, Geister/Schatten), Arena 5, Herzstein 3 | ✅ v0.9 |
| 4.2 | Region Solaria (Wüste & Tempel, Licht/Magie), Arena 6, Herzstein 4 | ✅ v0.10 |
| 4.3 | Region Drakmor (Drachengebirge), Arenen 7–8, Team-Eklipse-Hauptquartier | ✅ v0.11 |
| 4.4 | Lyras Entscheidung, Siegesstraße, Top 4 und Champion, Umbras Finale | ⏳ als Nächstes |
| 4.5 | Legendäre Hüter, Geheimorte nur zu viert (Koop-Raids), Postgame, Ziel 150 Kreaturen, Level bis 60+ | geplant |

## Story-Leitfaden (Entwurf für alle Phasen)

- **Die Welt:** Die sieben Regionen von **Aurelion** waren einst durch die **Herzsteine** verbunden. Jeder Stein wird von einem legendären Hüter bewacht.
- **Gegenspieler:** **Team Eklipse** will die Herzsteine bündeln, um die Hüter zu kontrollieren und die Zeit anzuhalten.
  Ihr Anführer ist überzeugt, damit den Verfall der Welt aufzuhalten.
- **Rivalen:**
  - **Kian**, ehrgeizig und laut, wird später ein echter Verbündeter.
  - **Lyra**, eiskalt und brillant, steht lange auf der falschen Seite.
- **Wendung:** Professorin Linde war früher Teil von Team Eklipse.
- **Finale:** Die Hüter aller sieben Regionen kämpfen gemeinsam mit den vier Spielern gegen **Nihilux**, das Wesen zwischen den Dimensionen.
- **Postgame:** Dimensionstore, der geheime achte Hüter und Vierer-Raids.
