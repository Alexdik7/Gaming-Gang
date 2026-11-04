# Multiplayer einrichten (für 4 Freunde)

Ihr braucht einen **Weltserver**, der rund um die Uhr läuft. Er speichert eure gemeinsame Welt.
Das Spiel selbst bekommt jeder einfach über den Link.

## Variante A: Kostenlos und dauerhaft (Render + MongoDB Atlas) – empfohlen

Der Server läuft kostenlos bei Render. Alle Welten und Spielstände liegen dauerhaft in einer kostenlosen MongoDB-Datenbank.
Der Server pingt sich alle 10 Minuten selbst an und schläft deshalb nicht ein.

### 1. Datenbank (MongoDB Atlas, ca. 5 Minuten)
1. https://www.mongodb.com/cloud/atlas/register öffnen und mit Google oder E-Mail registrieren.
2. **Create Cluster** → Tarif **M0 (Free)**, Anbieter beliebig, Region **Frankfurt** → **Create**.
3. **Benutzer anlegen** (Fenster „Connect“ bzw. *Database Access*):
   - Benutzername z. B. `legends`.
   - Passwort **nur aus Buchstaben und Zahlen**, ohne Sonderzeichen. Aufschreiben!
4. **Netzwerk:**
   - Unter *Network Access* → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) → Confirm.
   - Nötig, weil der kostenlose Render-Server keine feste IP hat.
5. **Verbindungsadresse kopieren:**
   - **Connect** → **Drivers** → die Adresse kopieren, sie sieht so aus: `mongodb+srv://legends:<db_password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
   - `<db_password>` durch dein Passwort ersetzen, ohne die spitzen Klammern.

### 2. Server (Render, ca. 5 Minuten)
1. https://render.com → **Get Started** → mit **GitHub** anmelden und Zugriff auf `Gaming-Gang` erlauben.
2. **New** → **Blueprint** → Repository `Gaming-Gang` wählen. Render findet die Datei `render.yaml` automatisch.
3. Bei **MONGODB_URI** die Adresse aus Schritt 1.5 einfügen → **Apply**.
4. Nach ca. 3–5 Minuten steht im Log `Speicher: mongodb – …` und `Server läuft`.
   Oben steht dann die Adresse, z. B. `https://legends-united-xxxx.onrender.com`.
5. Diese Adresse an Claude schicken. Claude trägt sie fest ins Spiel ein, dann muss niemand mehr etwas eintippen.

### Gut zu wissen
- Kostenlos: Render erlaubt 750 Stunden pro Monat, das reicht für einen Server rund um die Uhr. Atlas M0 bietet 512 MB Speicher, genug für viele tausend Spielstände.
- Updates: Jeder Push auf `main` startet den Server neu. Die Daten bleiben in der Datenbank.
- Lokal ohne `MONGODB_URI` speichert der Server wie bisher in `legends/server/data/worlds.json`.

## Variante B: Auf einem eigenen PC (für Tests im selben WLAN)

1. Node.js installieren: https://nodejs.org (LTS-Version).
2. Im Ordner `legends/server` diese Befehle ausführen:
   ```bash
   npm install
   npm start
   ```
3. Der Server läuft dann auf Port 8052 und liefert auch das Spiel selbst aus.
   Die anderen öffnen `http://<IP-des-PCs>:8052` im selben WLAN.

## Ablauf im Spiel

1. Im Spiel **START → ONLINE** öffnen.
   Beim ersten Mal fragt das Spiel nach der **Server-Adresse**, z. B. `https://legends-united-xyz.onrender.com`.
   Wer das Spiel direkt vom eigenen Server öffnet (Variante B), muss nichts eintragen.
2. Einer wählt **WELT ERSTELLEN** und bekommt einen **6-stelligen Welt-Code**.
3. Die anderen wählen **WELT BEITRETEN** und geben den Code ein.
   Beim nächsten Spielstart verbindet sich das Spiel automatisch wieder.
4. Jeder spielt mit **seinem eigenen** Charakter und Spielstand, alle in derselben Welt:
   - Ihr seht euch auf der Karte, mit Namen über dem Kopf.
   - Unter **ONLINE → NACHRICHT** schickt ihr Nachrichten an alle.
   - **Vor einen Mitspieler stellen und A drücken:**
     - **KÄMPFEN:** Freundschaftskampf. Der Server berechnet ihn, also kann niemand schummeln. Danach ist niemand verletzt.
     - **TAUSCHEN:** Beide wählen eine Kreatur und bestätigen. Das klappt auch mit Mutationen aus der Brutstätte.
   - **Zu zweit gegen Koop-Gegner:** Ria & Rio in Quellbach oder den Felsenkoloss in der Kieselhöhle ansprechen und „Mit …“ wählen.
     Der Mitspieler muss auf derselben Karte sein. Mit ONLINE → ZU FREUND REISEN geht das sofort.
   - **Raids zu viert (nach dem Champion-Titel):** Im Dimensionsriss, am Altar im Altwald, einen Wächter ansprechen und „Mit … Mitspielern“ wählen.
     - Alle Mitspieler auf derselben Karte bekommen eine Einladung. Der Raid startet, sobald alle geantwortet haben, spätestens nach 25 Sekunden.
     - Freie Plätze übernehmen Kian, Lyra und Nyx.
     - Verliert jemand die Verbindung, kämpft die KI für ihn weiter.
5. **Spielstand sichern:**
   - Jedes Speichern legt automatisch eine Sicherung auf dem Server an.
   - ONLINE → GERÄT WECHSELN zeigt einen Code an, den ihr auf dem neuen Handy unter ONLINE → SPIELSTAND HOLEN eingebt.

