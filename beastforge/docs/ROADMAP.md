# BEASTFORGE – Technische Roadmap

## Technologie-Entscheidung
- **three.js r160** (lokal in `lib/`, wie Turbofieber) statt Engine: läuft ohne Build auf dem iPhone, offline per Service Worker.
- **Prozedurale Modelle** aus Grundformen + Toon-Shading + Umriss → eigener Anime-Look, keine Lizenzfragen, winzige Downloads.
  Modelle sind über `buildModel(id, opts)` austauschbar – später können echte glTF-Modelle dieselbe Schnittstelle bedienen.
- **Simulation getrennt von Darstellung** (`sim/` kennt kein DOM/three) → Node-Tests, Balance-Bot, deterministisches 3× Tempo.
- **Daten statt Code**: Inhalte in `data/`, alle Zahlen in `config.js`.

## Phasen (Stand)
| # | Phase | Status |
|---|---|---|
| 1–2 | Repo-Analyse, Architektur | ✅ |
| 3–8 | Kernschleife, Karte, Gegner, Platzierung, Kampf, Run-Wirtschaft | ✅ |
| 9 | Upgrade-System (3 Pfade × 5, Kreuzpfade) | ✅ |
| 10–12 | Charakter-XP, Level 1–50, Evolutionen (Kitsune 7 Formen, andere 3) | ✅ |
| 13–14 | Konto-XP, Konto-Level + Belohnungen | ✅ |
| 15 | Held Kairo | ✅ |
| 16 | Boss Vharox (4 Phasen), Mini-Boss Oni | ✅ |
| 17–18 | VFX, Audio (Basis+) | ✅ |
| 19 | UI-Polish | ✅ (laufend) |
| 20 | Speichern | ✅ |
| 21 | Balance | ✅ Bot-kalibriert, echter Spieltest offen |
| 22 | Leistung | ✅ Instancing, Verschmelzen, Auto-Qualität |
| 23 | Content-Ausbau | ⏳ nächster Schritt |
| 24 | Final Polish | ⏳ |

## v0.2 erledigt
Genre-Optik (Querformat, steile Kamera, freie Platzierung, Shop rechts, Upgrade-Panel), neue Menüs mit Kartenauswahl, detailliertere Modelle, leichteres Normal.

## v0.3 erledigt
Ladebildschirm, Weltkarte, Karte 2 (Mehrpfad), Kreaturen 6–8, Helden 2–3, Heldenwahl.

## v0.4 erledigt
Karte 3 Glutkrater (Lava-Spalten, Basalt-Flöße), Gegner Feuerdämon + Schildträger, Kartenmusik.

## Masterplan „Bloons-Niveau“ (ab v0.5, je ein „Weiter“)
Ziel: Spielgefühl und Umfang eines Top-Tower-Defense – mit eigener Welt, eigenen Namen, CC0-Modellen.
- **B1 ✅ (v0.5)** Modell-Pipeline + echte animierte Gegner/Bosse + 5 Kreaturen als Skin-Modelle.
- **B2 ✅ (v0.6)** Helden (KayKit) + Tiger (Katze mit Streifen) als Modelle, sichtbare Teile für **jede** Pfadstufe. Offen: Schildkröte, Mantis (kein CC0-Modell – evtl. prozedural aufwerten).
- **A1 ✅ (v0.9, Grundform)** Schichten-Gegner: Hüllen platzen ab und setzen kleinere Gegner frei (Knall, Funken, Ton) – das Herz des Genres. Gegner-Eigenschaften als kombinierbare Merkmale (getarnt, gepanzert, regenerierend, verstärkt).
- **A2 ✅ (v0.20)** Leistung für 1.000+ Gegner: gemessen (Grafik ist der Engpass, Simulation 0,7 ms → kein Worker nötig), Massen-LOD + Massenmodus ohne Umrisse, mitwachsende Instanz-Puffer, laufende Auto-Qualität.
- **A3 ✅ (v0.19)** Wellen 1–60 neu (Schwer 40, Meister 60, Boss-Varianten), freies Weiterspielen, Wirtschafts-Kreatur (Glückskatze v0.11). Offen: Super-Endausbau pro Kreatur.
- **E1 ✅ (v0.27–0.30)** Upgrade-Optik-System, alle 20 Kreaturen, Stufe-5-Einblendung. ✅ Ahnenform (v0.31). Weiter: (Paragon-Prinzip: 3× Stufe 5 opfern, Grad 1–100).
- **C1–C4** Kreaturen 9–16 (Schlangenmagier, Windmönch, Phönix, Leerenkatze …), Helden 4–6, Karten 4–10 in drei Schwierigkeitsgruppen, Bosse 2–5 mit Stufen. ✅ Karte 4 Frosttempel + Boss 2 Hyōga (v0.21), Karte 5 Himmelsinseln + Boss 3 Fūjin (v0.22); Helden 4–6 Hana/Gorō/Yoru (v0.23).
- **D ✅ (v0.13, Grundform)** Herausforderungs-Modi (nur Grundkreaturen, halbes Geld, umgekehrter Weg, doppelte KP, „Seelenbrand“), tägliche Herausforderung, Boss-Events.
- **E** Wissensbaum, Kräfte, Kosmetik-Shop, Quests, Wochen-Events. ✅ Kräfte + Sofort-Kreaturen (v0.33). Weiter: Events/Truhen/Kosmetik.
- **F** Koop 2–4 über Raumcode (Netzcode aus Cats TD übernehmen).
- **G1 ✅ (v0.15)** Kampfgefühl: präzise Treffer (Lichtstern + Funkenstriche), Hiebsicheln, Angriffs-Posen je Kampfstil, scrollbare Kreaturen-Leiste. Offen: eigene Treffer-Töne je Element, Projektil-Spuren als Bänder.
- **G2 ✅ (v0.34)** Lebendige Karten: Wind in Bäumen/Gras, Schmetterlinge, Vögel, Fische, Laternenflackern.
- **G** Feinschliff: Balancing-Bot über alle Karten, Tutorials, Statistiken.

## Nächste Schritte (Content-Ausbau, je ein „Weiter“)
1. **Echter Spieltest auf dem iPhone** → Balance, Lesbarkeit, **Leistung mit den neuen Modellen**.
2. ✅ Kreaturen 6–8 · ✅ Karte 2 · ✅ Helden Raizen + Mika
3. ✅ Karte 3 „Glutkrater“ + Feuerdämon/Schildträger
4. **Kreaturen 9–12**: ✅ Phönix (v0.16) · ✅ Rudel-Bonus + 6 Fusionen (v0.17) · ✅ Schlangenmagierin, Windmönch, Leerenkatze + 3 Fusionen (v0.18)
5. **Helden 4–5**: Akuma (Oni-Krieger), Sora (Himmelskriegerin).
6. **Bosse 2–5**: Leerenkaiser (stört Türme), Titan, Seuchenkönigin (Adds), Himmelsbestie (sehr schnell).
7. **Modi**: Boss-Rush, Herausforderungen mit Modifikatoren, Zufallsmodus, härteste Stufe „Seelenbrand“ (eigener Name).
8. **Karten 3–8**: Vulkan, Frosttempel, Himmelsinseln, Spuksumpf, Neon-Stadt, Himmelsreich (Teleporter, bewegliche Plattformen).
9. Kosmetik-Ausbau (Spuren, Sieges-Animationen), Statistik-Graphen, Wochen-Herausforderung.

## Qualitäts-Check (Vertical Slice)
Start ✓ · Hauptmenü ✓ · Kartenwahl ✓ · Platzierung (Antippen + Maus) ✓ · Gegner/Wellen ✓ · Münzen ✓ · Upgrades/Kreuzpfade ✓ · Charakter-XP/Level ✓ ·
Evolutionen ✓ · permanente Boni ✓ · Konto-XP/-Level ✓ · Held ✓ · Fähigkeiten/Ultimate ✓ · Boss-Phasen ✓ · Synergien ✓ · Speichern/Laden ✓ ·
Audio ✓ · VFX ✓ · 3× Tempo ✓ (deterministisch getestet) · Querformat ✓ · keine bekannten Game-Breaker (Tests grün).
Offen: Gefühl auf echtem iPhone, Feintuning nach Spieltest.
