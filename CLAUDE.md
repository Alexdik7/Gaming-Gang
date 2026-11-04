# Gaming Gang – Projektgedächtnis

Repo `Alexdik7/Gaming-Gang`, Branch `main`. GitHub Pages ist live: https://alexdik7.github.io/Gaming-Gang/
Spiele: `plug52/` (Tycoon, eine HTML-Datei), `legends/` (Kreaturen-RPG „Legends United“, Hauptprojekt).

## Nutzer
- Deutsch, spielt auf dem **iPhone**: Web-App über „Zum Home-Bildschirm“, Updates kommen über GitHub Pages und `sw.js`. Android interessiert ihn nicht.
- Arbeitsweise: „Weiter“ = nächsten sinnvollen Schritt der Roadmap bauen. Am Ende jedes Schritts:
  1. bauen
  2. testen
  3. Doku aktualisieren
  4. committen und pushen
  5. Screenshot senden
  6. kurzer deutscher Bericht mit Link
- Will: flüssig, schön (eigene Pixel-Art, **keine** Nintendo-/Pokémon-Assets), sparsam mit Tokens.

## Pflicht-Regeln (spart Tokens)
- Vor Arbeit an Legends den Skill **legends-dev** laden: Landkarte, Rezepte, Stolperfallen. Für neue Spiele den Skill **game-dev-fast**.
- **Nicht** ganze große Dateien lesen. Stattdessen `grep -n` und gezielte `sed -n a,bp`.
  - `maps.js` hat >1000 Zeilen, `game.js` ~1200.
- Mehrere Änderungen in **einem** `python3`-Skript mit `assert s.count(a)==1` erledigen.
- Testen mit `node legends/tools/e2e/run.cjs <newgame|walk|battle|offline|world|all>`. Der Server muss laufen: `cd legends/server && node server.js &`.
  - Kein neues Testskript schreiben, wenn ein Szenario passt; sonst `tools/e2e/lib.cjs` nutzen.
- Prüfwerkzeuge: `node legends/tools/checkmaps.mjs` (Karten) und `node legends/tools/balance.mjs` (Levelkurve).
- Keine Subagents ohne ausdrücklichen Wunsch.

## Veröffentlichen
- **Web und iPhone:** Push auf `main` → Pages deployt automatisch.
  - Bei jeder Änderung an Spieldateien `CACHE` in `legends/sw.js` erhöhen, sonst bekommen Handys das Update nicht.
  - Neue Dateien in die `FILES`-Liste von `sw.js` eintragen.
- **Android-APK:** nur auf ausdrücklichen Wunsch bauen, da der Nutzer ein iPhone hat. Die APK ist nur für Freunde mit Android. Workflow: `.github/workflows/android.yml`.
  - Pushes aus Claude-Sitzungen lösen den Workflow nicht aus → manuell starten:
    `gh api -X POST repos/Alexdik7/Gaming-Gang/actions/workflows/406802438/dispatches -f ref=main`
  - Ergebnis: Release `app-v1.N`. Download: https://github.com/Alexdik7/Gaming-Gang/releases/latest/download/LegendsUnited.apk
  - Releases sind unveränderlich, Secrets und Releases darf Claude nicht anlegen oder löschen.
- Commit-Nachricht endet mit den Attributionszeilen aus dem System-Hinweis. Keine Modell-IDs in Commits.
- Ist ein Push fehlgeschlagen, einfach erneut pushen (passiert gelegentlich).

## Stand (aktualisieren!)
- **Legends United v1.2:**
  - Inhalt: 150 Kreaturen, 8 Arenen, Liga, Postgame (Hüter), Raids 4v1 mit KI-Helfern und Online-Koop, Nihilux
  - Technik: komponierte Musik, Android-App, flüssige Subpixel-Bewegung, neue Weltgrafik
  - Kampf: Kampf-Intro mit Kristallwürfen
- Details in `legends/docs/FORTSCHRITT.md` und `ROADMAP.md`.
