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

Apple erlaubt Apps außerhalb des App Stores nur mit einem kostenpflichtigen Entwicklerkonto. Als Web-App vom Home-Bildschirm läuft das Spiel aber wie eine echte App: Vollbild, eigenes Icon, offline.

1. In **Safari** öffnen: https://alexdik7.github.io/Gaming-Gang/legends/
   Es muss Safari sein; in Chrome auf dem iPhone fehlt die Option.
2. Unten auf **Teilen** tippen, das Quadrat mit dem Pfeil nach oben.
3. Nach unten scrollen → **„Zum Home-Bildschirm“** → **Hinzufügen**.
   Bei neueren iOS-Versionen den Schalter **„Als Web-App öffnen“** eingeschaltet lassen.
4. Das Spiel ab jetzt **nur noch über das Icon** auf dem Home-Bildschirm starten.

**Gut zu wissen:**
- **Offline:** Nach dem ersten Start ist alles auf dem iPhone gespeichert, das Spiel läuft danach auch im Flugmodus.
- **Ton:** Der Ton läuft auch bei eingeschaltetem Stummschalter, ab iOS 16.4. Nach einem Anruf oder App-Wechsel reicht ein Tippen, dann geht er weiter.
- **Spielstand:**
  - Die Home-Bildschirm-App hat einen **eigenen** Speicher, getrennt von Safari. Ein Spielstand aus dem Safari-Tab ist dort nicht automatisch drin.
  - Am besten nur noch die App vom Home-Bildschirm benutzen.
  - Das Icon nicht löschen, sonst ist der Spielstand weg.
  - Mit Online-Server sichert ONLINE → GERÄT WECHSELN den Spielstand per Code.
- **Updates:** kommen automatisch. Neue Versionen lädt das Spiel im Hintergrund und nutzt sie beim nächsten Start.

## Online zusammen spielen in der App

- Für Kämpfe, Tausch, Koop und Raids braucht ihr den eigenen Weltserver, siehe [MULTIPLAYER.md](MULTIPLAYER.md).
- In der App fragt das Spiel beim ersten ONLINE nach der Server-Adresse.

## Technik

- Die App wird mit Capacitor gebaut. Die Projektdateien liegen in `legends/app/`, der Bauablauf in `.github/workflows/android.yml`.
- Es ist ein Debug-signierter Build. Der Signaturschlüssel `legends/app/debug.keystore` liegt bewusst im Repository, damit Updates den Spielstand behalten.
  - Für eine Veröffentlichung im Play Store bräuchte es einen eigenen, geheimen Release-Schlüssel als GitHub-Secret und ein Play-Developer-Konto.
