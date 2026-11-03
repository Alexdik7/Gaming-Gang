# LEGENDS UNITED

Ein Kreaturen-Abenteuer im Stil der klassischen Handheld-Rollenspiele: Draufsicht, Steuerkreuz, A/B, START und SELECT.

Alles ist eigenständig gestaltet: eigene Kreaturen, Karten und Geschichte. Dazu kommen eine **Brutstätte**, in der aus zwei Kreaturen ein Ei mit einer **Mutation** beider Eltern entsteht.

**Spielen (Handheld-Edition):** https://alexdik7.github.io/Gaming-Gang/legends/
**3D-Prototyp mit Koop-Grundlage:** https://alexdik7.github.io/Gaming-Gang/legends/3d.html

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
