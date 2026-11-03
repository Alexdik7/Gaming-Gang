# Roadmap – Meilensteine und Ablaufplan

Jede Phase endet mit einer spielbaren, getesteten Version auf GitHub Pages. Gebaut wird in festen **Arbeitspaketen** (AP).
Pro AP gilt dieselbe Reihenfolge: Daten → Logik → Darstellung → automatischer Test (Playwright, auch mit 2 Spielern) → Doku → Upload.
So bleibt das Spiel nach jedem Schritt spielbar, und nichts wird doppelt gebaut.

| Phase | Inhalt | Status |
|---|---|---|
| **1 – Grundgerüst** | Welt, Bewegung, Kämpfe, Fangen, Menüs, Speichern, Netzwerk-Grundlage | ✅ v0.1 |
| **1b – Handheld-Edition** | 240×160-Darstellung, Steuerkreuz, Charakter-Editor, 45 Kreaturen, Brutstätte & Mutationen, Arena 1 | ✅ v0.2 |
| **2a – Grafik & Koop** | eigene 2D-Pixel-Art statt 3D-Renderings, 3D-Teil entfernt, Online-Welt, Mitspieler auf der Karte, Freundschaftskampf (Server berechnet), Tausch, Chat | ✅ v0.3 |
| **2b – Koop-Ausbau** | Doppelkämpfe 2 gegen 2, Koop gegen Trainer/Bosse, Tausch-Entwicklungen, Spielstand-Sicherung auf dem Server, Freundesliste, Spielerhäuser besuchen | ⏳ als Nächstes |
| **3 – Hauptspiel** | Regionen Ignis, Aqualis, Frostheim · Arenen 2–4 mit Rätseln · Team Eklipse · Rivalin Lyra · 75 Kreaturen · Items (Beeren, Attacken-Kristalle) · Nebenquests | geplant |
| **4 – Endgame** | Regionen Nocturna, Solaria, Drakmor · Arenen 5–8 · Top 4 · Champion · legendäre Hüter · Geheimorte nur zu viert · Postgame · 150 Kreaturen | geplant |
| **5 – Qualität** | komponierte Musik, Animationen, Balancing, Performance, Windows-App (Tauri), Store-Apps (Capacitor) | geplant |

## Ablaufplan Phase 2b (nächste Lieferung)

| AP | Inhalt | Abhängigkeit |
|---|---|---|
| 2b.1 | Kampflogik auf Teams pro Seite erweitern (2 aktive Kreaturen, Zielwahl) | – |
| 2b.2 | Doppelkampf-Bildschirm (2 Sprites pro Seite, Zielauswahl) | 2b.1 |
| 2b.3 | Koop-Kämpfe: 2 Spieler gegen Trainer-Duo bzw. Boss, Server berechnet | 2b.1, 2b.2 |
| 2b.4 | Spielstand-Sicherung auf dem Server + Wiederherstellen auf neuem Gerät | – |
| 2b.5 | Freundesliste, Mitspieler-Teleport („Zu Freund reisen“ im Heilzentrum) | 2b.4 |
| 2b.6 | Tausch-Entwicklungen und Bonus-EP für getauschte Kreaturen | – |

## Ablaufplan Phase 3

| AP | Inhalt |
|---|---|
| 3.1 | Karten-Werkzeug: Karten aus kompakten Textdateien, Übergänge automatisch |
| 3.2 | Region Ignis (Vulkanroute, Stadt, Arena 2 Feuer) + 10 Kreaturen |
| 3.3 | Team Eklipse: Rüpel-Kämpfe, Versteck, erste Story-Wendung |
| 3.4 | Region Aqualis (Surfen als Feldfähigkeit) + Arena 3 + 10 Kreaturen |
| 3.5 | Region Frostheim (Eisrutsch-Rätsel) + Arena 4 + 10 Kreaturen |
| 3.6 | Items und Nebenquests, Balancing bis Level 40 |

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
