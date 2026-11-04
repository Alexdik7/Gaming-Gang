# QA und Veröffentlichung

## Test-Pyramide (billig → teuer)
1. `node --check` für jede geänderte Datei.
2. **Reine Logik in Node:** Kampf, Fangformel, Kodierung von Codes, Balancing-Simulation (200–300 Läufe).
3. **Datenprüfer:** `tools/checkmaps.mjs` meldet Warps, Kanten, erreichbare Items.
4. **e2e mit Playwright:** `tools/e2e/run.cjs all`, für Sonderfälle `lib.cjs` (start / moves / battle / shot).
5. **Sichtprüfung:**
   - Kontaktbogen der Screenshots, einmal ansehen.
   - Hoch- und Querformat, iPhone SE (klein) und 13 (Standard).

## Was jedes Feature testen muss
- Glücklicher Pfad: Es funktioniert.
- Abbruch: B, Zurück, Schließen mitten in der Aktion.
- Grenzen: leer, voll, letzte Kreatur, kein Geld, alter Spielstand ohne neue Felder (Migration).
- Speichern → neu laden → alles noch da? Laufzeit-Karten neu erzeugen?
- Touch statt Tasten.

## Veröffentlichen
1. `sw.js`: `CACHE` erhöhen und neue Dateien in `FILES` eintragen.
2. Doku (FORTSCHRITT, CLAUDE.md-Stand), Commit mit Attribution, `git push origin main`.
3. **Deploy prüfen:** `gh run list -R Alexdik7/Gaming-Gang -L 3`. Erfolg dauert meist ca. 30 s.

## GitHub Pages hängt (schon passiert)
- **Symptom:** Run „pages build and deployment“ schlägt mit `Timeout reached` fehl. Danach scheitert der nächste mit „in progress deployment … cancel first“, und der Nutzer bekommt eine Fehler-Mail.
- **Lösung:**
  - Ein **neuer Push** (notfalls ein leerer Commit `git commit --allow-empty`) erzeugt einen frischen Deploy. Der klappt meist sofort.
  - `gh run rerun` des fehlgeschlagenen Runs bleibt dagegen oft ewig in der Warteschlange.
  - Die Pages-Deployments-API ist über den Proxy gesperrt.
- Dem Nutzer erklären: Das Spiel ist nicht kaputt. Online bleibt der letzte erfolgreiche Stand.

## Bericht an den Nutzer
- Kurz und auf Deutsch, mit Link.
- Was ist neu (aus Spielersicht, nicht Code), wie bekommt man das Update aufs iPhone, was ist getestet und was nicht.
- Ein Bild (Kontaktbogen) sagt mehr als Aufzählungen.
