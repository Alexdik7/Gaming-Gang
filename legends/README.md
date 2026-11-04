# LEGENDS UNITED

Ein Kreaturen-Abenteuer im Stil der klassischen Handheld-Rollenspiele: Draufsicht, Steuerkreuz, A/B, START und SELECT.

Alles ist eigenständig gestaltet: eigene Kreaturen, Karten und Geschichte. Dazu kommen eine **Brutstätte**, in der aus zwei Kreaturen ein Ei mit einer **Mutation** beider Eltern entsteht.

**Spielen:** https://alexdik7.github.io/Gaming-Gang/legends/

**Android-App (APK, läuft offline ohne Browser):** https://github.com/Alexdik7/Gaming-Gang/releases/latest/download/LegendsUnited.apk
Installation und iPhone-Hinweise: [docs/APP.md](docs/APP.md)

**Zusammen spielen (bis zu 4):** START → ONLINE → Welt erstellen, den Code an Freunde geben.
Vor einem Mitspieler A drücken → **Kämpfen** oder **Tauschen**; zu zweit gegen Trainer-Duos und Bosse; Spielstand-Sicherung auf dem Server. Den nötigen Weltserver richtet ihr einmalig ein, siehe [docs/MULTIPLAYER.md](docs/MULTIPLAYER.md).

Auf PC und Handy spielbar und installierbar:
- **PC (Chrome/Edge):** Adressleiste → „App installieren“
- **iPhone (Safari):** Teilen → „Zum Home-Bildschirm“
- **Android (Chrome):** ⋮ → „App installieren“

## Steuerung

| | PC | Handy |
|---|---|---|
| Laufen | Pfeiltasten / WASD | Steuerkreuz |
| A (sprechen, bestätigen) | Z / Leertaste | A |
| B (zurück, **gedrückt halten = rennen**) | X / Shift | B |
| START (Menü) | Enter | START |
| SELECT (Team) | C / Tab | SELECT |

## Dokumentation

- [docs/KONZEPT.md](docs/KONZEPT.md): Machbarkeit, Technikwahl, Architektur, Netzwerk- und Datenstruktur
- [docs/FORTSCHRITT.md](docs/FORTSCHRITT.md): was funktioniert und was noch fehlt
- [docs/ROADMAP.md](docs/ROADMAP.md): Meilensteine und Story-Leitfaden
- [docs/MULTIPLAYER.md](docs/MULTIPLAYER.md): Weltserver für euch vier einrichten

## Lokal starten (inklusive Multiplayer-Server)

```bash
cd legends/server && npm install && npm start
```

Danach http://localhost:8052 öffnen.
