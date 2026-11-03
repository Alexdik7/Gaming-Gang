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

1. Einer erstellt unter **Multiplayer-Welten → Neue Welt erstellen** eine Welt und bekommt einen **6-stelligen Einladungscode**.
2. Die anderen drei verbinden sich mit demselben Server, wählen **Welt beitreten** und geben den Code ein.
3. Jeder erstellt seinen eigenen Charakter und beginnt seine eigene Geschichte, alle in derselben Welt.
   Ihr seht euch gegenseitig, chattet und teilt Weltereignisse:
   Entzündet einer einen Runenstein, leuchtet er für alle.
