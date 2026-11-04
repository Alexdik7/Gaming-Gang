# Multiplayer einrichten (für 4 Freunde)

Ihr braucht einen **Weltserver**, der rund um die Uhr läuft. Er speichert eure gemeinsame Welt.
Das Spiel selbst bekommt jeder einfach über den Link.

## Variante A: Kostenlos bei Render.com (empfohlen, ohne eigenen PC)

1. Konto auf https://render.com anlegen (Anmeldung mit GitHub).
2. **New → Web Service** wählen und das Repository `Gaming-Gang` verbinden.
3. Einstellungen:
   - **Root Directory:** `legends/server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Nach ein paar Minuten bekommt ihr eine Adresse wie `https://legends-united-xyz.onrender.com`.
5. Im Spiel: **Multiplayer-Welten** → diese Adresse eintragen → **Verbinden**.

**Hinweis:** Der kostenlose Render-Server schläft nach 15 Minuten ohne Spieler ein. Der erste Verbindungsversuch dauert dann bis zu einer Minute.
Außerdem wird die Speicherdatei bei kostenlosen Diensten bei Neustarts zurückgesetzt.
Für dauerhafte Welten braucht ihr eine „Persistent Disk“ (ca. 1 €/Monat) und die Umgebungsvariable `DATA_FILE=/var/data/worlds.json`.
Auch für eine Datenbank ist das der Plan in Phase 2.

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
5. **Spielstand sichern:**
   - Jedes Speichern legt automatisch eine Sicherung auf dem Server an.
   - ONLINE → GERÄT WECHSELN zeigt einen Code an, den ihr auf dem neuen Handy unter ONLINE → SPIELSTAND HOLEN eingebt.

