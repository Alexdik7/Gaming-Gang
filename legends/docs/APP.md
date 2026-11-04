# Legends United als App installieren

## Android: echte App (APK)

**Download:** https://github.com/Alexdik7/Gaming-Gang/releases/download/app/LegendsUnited.apk

1. Den Link auf dem Android-Handy öffnen. Die Datei `LegendsUnited.apk` wird heruntergeladen.
2. Die Datei antippen, zum Beispiel in der Benachrichtigung oder unter „Downloads“.
3. Beim ersten Mal fragt Android, ob Apps aus dieser Quelle installiert werden dürfen.
   - Unter **„Einstellungen“** den Schalter **„Aus dieser Quelle zulassen“** aktivieren.
   - Danach **„Installieren“** antippen.
4. Fertig: **Legends United** liegt jetzt als App auf dem Startbildschirm.
   - Sie startet im Vollbild und läuft komplett offline, ohne Browser.
   - Das Spiel ist in der App enthalten, Musik und Schrift eingeschlossen.

**Updates:**
- Nach jeder Änderung am Spiel baut GitHub automatisch eine neue APK unter demselben Link.
- Einfach herunterladen und über die alte App installieren. **Der Spielstand bleibt erhalten**, weil jede Version mit demselben Schlüssel signiert ist.
- Einen neuen Build kannst du auch von Hand starten: GitHub → **Actions** → **Android-App bauen** → **Run workflow**.
- Die App **nicht** vorher deinstallieren, sonst wird der Spielstand auf dem Handy gelöscht.
  - Mit Online-Sicherung kannst du ihn vorher über ONLINE → GERÄT WECHSELN mitnehmen.

**Google Play Protect:**
- Weil die App nicht aus dem Play Store kommt, warnt Android eventuell.
- Mit „Trotzdem installieren“ geht es weiter.

## iPhone / iPad

Apple erlaubt Apps außerhalb des App Stores nur mit einem kostenpflichtigen Entwicklerkonto. Die beste Lösung ohne App Store:

1. https://alexdik7.github.io/Gaming-Gang/legends/ in **Safari** öffnen.
2. **Teilen** (Quadrat mit Pfeil) → **„Zum Home-Bildschirm“** → **Hinzufügen**.
3. Das Spiel startet dann vom Home-Bildschirm wie eine App:
   - im Vollbild, ohne Adressleiste
   - offline, nachdem es einmal geladen wurde

## Online zusammen spielen in der App

- Für Kämpfe, Tausch, Koop und Raids braucht ihr den eigenen Weltserver, siehe [MULTIPLAYER.md](MULTIPLAYER.md).
- In der App fragt das Spiel beim ersten ONLINE nach der Server-Adresse.

## Technik

- Die App wird mit Capacitor gebaut. Die Projektdateien liegen in `legends/app/`, der Bauablauf in `.github/workflows/android.yml`.
- Es ist ein Debug-signierter Build. Der Signaturschlüssel `legends/app/debug.keystore` liegt bewusst im Repository, damit Updates den Spielstand behalten.
  - Für eine Veröffentlichung im Play Store bräuchte es einen eigenen, geheimen Release-Schlüssel als GitHub-Secret und ein Play-Developer-Konto.
