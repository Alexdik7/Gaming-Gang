# GymDesk – Mitgliederverwaltung fürs Gym

Web-App für das iPad an der Theke: Mitglieder digital anmelden und unterschreiben lassen, Mitglieder und Verträge verwalten, Angebote personalisiert per E-Mail vorbereiten.

- **App:** https://alexdik7.github.io/Gaming-Gang/gymdesk/ → in Safari „Teilen → Zum Home-Bildschirm“
- **Making-of-Film:** https://alexdik7.github.io/Gaming-Gang/gymdesk/film/ (Akt 1: Claude baut die App, Akt 2: So wird sie bedient)
- **Architektur, Datenmodell, Abläufe, Annahmen:** [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md), Ziel-Schema [docs/schema.prisma](docs/schema.prisma)

## Erster Start
1. Gym-Namen und Passwort festlegen (mind. 8 Zeichen, Buchstaben und Ziffern).
2. „Testdaten laden“ anhaken: 10 Testmitglieder, 5 Mitgliedschaften, 7 Leistungen, 3 Angebote.
3. Für den echten Betrieb: Einstellungen → Sicherheit & Daten → „Alle Daten löschen“ und ohne Testdaten neu einrichten. Danach Gym-Daten, Preise und Vertragstexte eintragen.

## Entwicklung
```bash
cd gymdesk && python3 -m http.server 8061       # http://localhost:8061
npx -p typescript@5.6 tsc -p gymdesk            # Typprüfung (checkJs)
node gymdesk/tools/e2e.cjs                       # Ende-zu-Ende-Test (31 Prüfungen)
```
Bei jeder Änderung `CACHE` in `sw.js` erhöhen und neue Dateien in `FILES` eintragen.

## Stand v1.0 (MVP)
Alle 18 Punkte der Zielliste sind umgesetzt: Anmeldung in 9 Schritten mit Validierung, Entwurf und Verlassen-Warnung · Unterschrift per Finger oder Pencil · Mitgliederliste mit Suche, Filter und Sortierung · Kundenmaske mit Historie · schreibgeschützte Formulare mit Prüfsumme · Angebote mit Empfängerfiltern, Platzhaltern, Vorschau, Sicherheitsabfrage und geplantem Versand · Mock-Mailversand mit Postausgang · Einstellungen für Gym-Daten, Tarife, Leistungen, Texte, Passwort und Sicherung · alles AES-256-verschlüsselt, offline-fähig.
Echter E-Mail-Versand braucht später ein kleines Backend (siehe Architektur, Abschnitt 6).
