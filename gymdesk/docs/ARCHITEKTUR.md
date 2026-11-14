# GymDesk – Architektur, Datenmodell, Abläufe

## 1. Architekturentscheidung

**Gewählt: Local-first-Web-App (PWA), Daten verschlüsselt auf dem iPad.**
Reines JavaScript als ES-Module, mit JSDoc-Typen und `tsc --checkJs` geprüft. Kein Build-Schritt, Auslieferung über GitHub Pages.

| | Gewählt: Local-first-PWA | Alternative: Next.js + PostgreSQL + Prisma |
|---|---|---|
| Sofort auf dem iPad nutzbar | ja, über „Zum Home-Bildschirm“ | erst nach Server- und DB-Hosting |
| Kosten / Betrieb | keine | Server, Datenbank, Backups, Updates |
| Offline | ja | nein |
| Datenschutz | Daten verlassen das Gerät nicht | Server muss DSGVO-konform betrieben werden |
| Mehrere Geräte/Benutzer | noch nicht | ja |
| E-Mail-Versand | nur Test (Mock) | echter Versand möglich |

Begründung: Gewünscht ist zunächst ein privater Einsatz auf **einem** iPad an der Theke. Die Fachlogik liegt deshalb in einer Service-Schicht (`js/services/data.js`). Die Seiten sprechen nur mit ihr. Für eine spätere Server-Version wird nur `js/core/db.js` durch einen API-Client ersetzt, und `docs/schema.prisma` beschreibt das relationale Ziel-Datenmodell.

## 2. Projektstruktur

```
gymdesk/
  index.html            App-Hülle, strenge Content-Security-Policy
  styles.css            Design (iPad-first, Touchflächen ≥ 48 px)
  sw.js                 Offline-Cache (CACHE bei jeder Änderung erhöhen)
  js/app.js             Zugang, Navigation, Router, Verlassen-Schutz
  js/core/              ui (sicherer DOM-Builder), crypto, db (Repository), auth, validate, pricing
  js/services/          data (Fachlogik = spätere API), email (EmailService + Provider)
  js/data/seed.js       Testdaten
  js/pages/             dashboard, signup (9 Schritte), signature, contractview, members (+Kundenmaske), forms, offers, settings
  film/                 Making-of-Film (Akt 1 Bauen, Akt 2 Bedienen)
  tools/e2e.cjs         Ende-zu-Ende-Test (Playwright)
  docs/                 diese Datei, schema.prisma
```

## 3. Datenmodell

Entitäten wie gefordert, Beziehungen siehe `schema.prisma`:

- **Member** 1 – n **Contract**
- **Contract** 1 – 1 **Membership**: eingefrorene Kopie des gewählten **MembershipPlan**, damit spätere Preisänderungen alte Verträge nicht verändern.
- **Contract** n – m **AddOn** (mit Preis zum Abschluss)
- **Contract** 1 – 1 **Signature**, 1 – n **Consent** (mit dem Text, dem zugestimmt wurde)
- **Offer** 1 – n **OfferRecipient** n – 1 **Member**; **EmailCampaign**/**EmailLog** protokollieren den Versand
- **ActivityLog** n – 1 Member, **GymSettings** einmalig

In der lokalen Version liegen Membership und Leistungen als Snapshot im Vertrag (`contract.membership`, `contract.addons`, `contract.snapshot`). EmailCampaign ist im `emailLog` je Angebot zusammengefasst.

## 4. Benutzerabläufe

1. **Einrichten** (einmalig): Gym-Name und Passwort festlegen, optional Testdaten laden.
2. **Entsperren** mit Passwort. Automatische Sperre nach 15 Minuten Inaktivität.
3. **Neue Anmeldung**: Daten → Mitgliedschaft → Zusatzleistungen → Zahlung → Einverständnisse → Zusammenfassung → Unterschrift → Abschluss → Bestätigung.
   - Jeder Schritt wird geprüft. Ein verschlüsselter Entwurf wird automatisch gespeichert, beim Verlassen erscheint eine Warnung.
   - Beim Abschluss wird alles erneut geprüft. Danach werden Mitglied, Vertrag, Unterschrift, Einwilligungen und Aktivität in **einer** Transaktion gespeichert.
4. **Mitglieder** suchen, filtern und sortieren → **Kundenmaske**: Stammdaten bearbeiten (protokolliert), Status ändern (mit Notiz), deaktivieren, Werbe-Einwilligung widerrufen.
5. **Formulare**: Original schreibgeschützt anzeigen, Prüfsumme kontrollieren, drucken bzw. als PDF speichern.
6. **Angebote**: Entwurf anlegen → Empfänger wählen (einzeln, mehrere, Filter) → Vorschau pro Mitglied → Versand nach Sicherheitsabfrage mit Empfängerzahl, sofort oder geplant.
7. **Einstellungen**: Gym-Daten und Logo, Mitgliedschaften, Leistungen und Preise, Vertragstexte, E-Mail, Sicherheit (Passwort, Sicherung, Zurücksetzen).

## 5. Sicherheit & Datenschutz

- **Verschlüsselung at rest:** Jeder Datensatz wird mit AES-256-GCM verschlüsselt. Der Datenschlüssel ist zufällig und mit einem Schlüssel aus dem Passwort gesichert (PBKDF2-SHA-256, 310.000 Runden). Das Passwort wird nie gespeichert.
- **Brute-Force-Bremse:** Nach 5 Fehlversuchen steigt die Wartezeit exponentiell, höchstens 15 Minuten.
- **Session:** Der Schlüssel liegt nur im Arbeitsspeicher. Bei Inaktivität oder Tippen auf „Sperren“ wird er verworfen.
- **XSS:** Die Oberfläche entsteht über `h()`, Texte immer als Textknoten, nie als innerHTML mit Nutzerdaten. Dazu kommt eine CSP `default-src 'self'` ohne Inline-Skripte. Inhalte von E-Mails werden escaped.
- **SQL-Injection / CSRF:** Ohne Server und SQL gibt es keine Angriffsfläche. In der Server-Version: Prisma (parametrisiert), SameSite-Cookies und CSRF-Token.
- **Validierung:** im Formular und erneut in der Service-Schicht vor dem Speichern. Das entspricht der serverseitigen Validierung.
- **Keine sensiblen Logs:** Es wird nirgends ein `console.log` mit Daten ausgegeben. Die IBAN erscheint nur maskiert, das Aufdecken geschieht bewusst und endet nach 15 Sekunden automatisch.
- **Werbung:** Standardmäßig gehen Mails nur an Mitglieder mit Werbe-Einwilligung, der Widerruf ist protokolliert.
- **Unveränderbarkeit:** Das abgeschlossene Formular wird als Snapshot mit SHA-256-Prüfsumme gespeichert. Danach ändern sich nur Status und Notizen, und das wird protokolliert.

## 6. E-Mail

`EmailService` erhält einen Provider. Aktiv ist immer `MockProvider`: Er verschickt nichts, die fertig personalisierten Mails landen im Postausgang (`emailLog`).
Echter Versand: Ein kleines Backend (z. B. `/api/mail`) hält die Zugangsdaten für Resend, SendGrid, SES oder SMTP. Danach wird `HttpApiProvider.send()` umgesetzt und `settings.mail.mode = 'live'` gesetzt. Zugangsdaten gehören nie ins Frontend.

Platzhalter: `{{vorname}} {{nachname}} {{mitgliedschaft}} {{vertragsende}} {{preis}} {{angebot}} {{rabatt}} {{gutschein}} {{gym}}`.
`{{preis}}` ist der Angebotspreis. Ist keiner gesetzt, wird der aktuelle Monatsbeitrag des Mitglieds eingesetzt.

## 7. Annahmen (bitte prüfen)

- Ein Benutzer (Theke/Inhaber) mit einem Passwort. Rollen sind vorbereitet, aber nicht umgesetzt.
- Mindestalter 14 Jahre. Unter 18 erscheint ein Hinweis auf die Unterschrift der Erziehungsberechtigten (rechtlich prüfen).
- Vertragsende = Beginn + Laufzeit − 1 Tag. Flex verlängert sich monatlich automatisch.
- „Läuft aus“ = Restlaufzeit ≤ 60 Tage (einstellbar). Abgelaufene Verträge werden beim Start automatisch auf „Abgelaufen“ gesetzt.
- Der Vertragsbeginn darf höchstens 30 Tage zurückliegen.
- Alle Rechtstexte sind Platzhalter, ebenso der Abmeldelink in Mails.
- **Datensicherung:** Löscht Safari die Websitedaten, sind die Daten weg. Deshalb regelmäßig unter Einstellungen → Sicherheit & Daten eine (verschlüsselte) Sicherung herunterladen.

## 8. Erweiterungen (vorbereitet)

PDF-Verträge (Druckansicht existiert), Mitgliederimport, Kündigungsverwaltung (Status + Protokoll vorhanden), Zahlungserinnerungen und Kampagnen (EmailService), mehrere Benutzer/Rollen/Standorte (Server-Version), QR-Code/Check-in (Mitgliedsnummer vorhanden), Statistiken (Dashboard-Daten über `memberRows`).
