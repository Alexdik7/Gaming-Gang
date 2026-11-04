# Game-Design: Motivation, Fortschritt, Balance

## Schleifen
- **Kern-Schleife** (Sekunden): erkunden → Begegnung → Kampf/Fang → Belohnung.
- **Mittlere Schleife** (Minuten): Route → Trainer → Heilzentrum → Arena.
- **Meta-Schleife** (Tage): Chronik füllen, schillernde Kreaturen, Basis einrichten, tägliche Ereignisse, Raids mit Freunden.
- Jedes neue Feature muss an mindestens eine Schleife andocken. Sonst wird es nach einmal Ausprobieren ignoriert.

## Motivation (was „süchtig“ im guten Sinn macht)
- **Sammeltrieb:**
  - Sichtbarer Fortschritt (Zähler, leere Plätze in der Chronik).
  - Meilenstein-Belohnungen bei 5/10/20/45 … (stärkere Abstände später).
- **Variable Belohnung:**
  - Seltenes mit kleiner, aber spürbarer Chance (schillernd 1/512, mit Hilfen 1/100 bis 1/4 bei Spuren).
  - Immer auch etwas Sicheres dazu, damit Pech nicht frustriert.
- **Kompetenz:** Fähigkeiten, die man verbessern kann (Timing-Wurf, Typvorteile, Teambau). Zeige dem Spieler, dass *er* besser wurde.
- **Eigentum und Ausdruck:** Spitznamen, Basis einrichten, Box-Hintergründe, Lieblingskreatur als Mitläufer.
- **Bindung an Figuren:** Freundschaft, die sichtbar wächst (Herzen, Reaktionen, Resonanz-Form).
- **Sozial:** Codes teilen, Besuche, Koop-Raids, Tausch. Asynchron ist auf dem Handy oft besser als Echtzeit.
- **Tägliche Gründe, ohne Druck:** Massenausbruch des Tages, tägliche Geschenke. Nie Strafen fürs Fernbleiben.

## Schwierigkeit
- **Kurve:**
  - Neue Mechanik zuerst gefahrlos vorstellen, dann mit Druck kombinieren.
  - Arenen ca. 2–4 Level über dem erwarteten Team.
  - Bosse mit dem Simulations-Bot auf 50–80 % Siegchance einstellen.
- **Fairness:** Niederlagen erklären sich selbst (Typnachteil sichtbar). Strafe moderat, z. B. ¼ des Geldes und zurück zum Heilzentrum.
- **Aufholhilfen:** Gegner-Level an das Team-Maximum koppeln, wo sinnvoll. Erfahrungs-Bonus für Schwächere im Team.

## Zahlen-Handwerk (Kreaturen-RPG)
- **Fangchance** (Gen-3-artig):
  - `a = (3·max − 2·hp) · rate · ball · status / (3·max)`, danach 4 Wackel-Prüfungen mit `p^(1/4)`.
  - Boni multiplizieren, Gesamtgrenze bedenken.
  - Kritischer Fang = nur 1 Prüfung.
- **Schaden:** `((2L/5+2)·Pow·A/D)/50+2`, dann STAB ×1,5, Typ ×0/0,5/1/2 und Zufall 0,85–1. Kritischer Treffer 1/16 ×1,5.
- **Erfahrung und Level:** Kurve aus der Simulation (`tools/balance.mjs`). Pro Route ca. 2–4 Level Zuwachs.
- **Wirtschaft:**
  - Preisgeld ≈ Level × 40–80.
  - Wichtige Items kosten ca. 2–5 Trainersiege. Luxus (Möbel) deutlich teurer.

## Feature-Bewertung (vor dem Bauen, 30 Sekunden)
| Frage | Ja → gut |
|---|---|
| Versteht man es ohne Text in 10 s? | |
| Gibt es eine Entscheidung oder Fertigkeit? | |
| Belohnt es kurz *und* langfristig? | |
| Passt es zur Welt und zum Vorbild-Gefühl? | |
| Ist es mit Daten erweiterbar? | |
| Funktioniert es mit Touch und offline? | |

## Onboarding
- Ein neues System erklärt sich beim ersten Mal in 1–2 Sätzen durch eine Figur (Dr. Vato per Funk). Danach nie wieder (Flag merken).
- Neue Knöpfe und Aktionen haben einen sichtbaren Hinweis (z. B. „◆ RESONANZ (SELECT)“).
