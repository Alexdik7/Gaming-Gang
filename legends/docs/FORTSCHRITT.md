# Fortschritt

## v1.2 – Kampf-Intro & flüssige Wechsel (aktuell)

### ✅ Neu und getestet
- **Übergang in den Kampf:** zwei Blitze, dann schieben sich schwarze Balken ins Bild.
- **Auftritt:**
  - Beide Plattformen gleiten mit den Trainern herein.
  - Der gegnerische Trainer wirft seinen Bindkristall im Bogen. Der Kristall wackelt, öffnet sich mit Lichtring, und die Kreatur erscheint erst weiß leuchtend, dann in Farbe.
  - Wilde Kreaturen stehen zuerst als dunkle Silhouette da; legendäre lassen dazu den Boden beben.
  - Danach wirft dein eigener Trainer und läuft aus dem Bild.
  - Die Lebensanzeigen schieben sich von der Seite herein.
- **Wechsel:** Die Kreatur leuchtet auf, schrumpft und fliegt als Lichtstrahl zurück; die neue kommt per Kristallwurf. Begleittexte laufen mit.
- **Kampfende:** weich abblenden und die Welt weich einblenden, statt hart zu schneiden. Gilt auch für Doppel- und Raid-Kämpfe, inklusive Kristallwurf.
- **Behoben:**
  - Nach dem Einwechseln infolge eines K.O. blieb die eigene Lebensanzeige verschwunden.
  - Überlagerte Blenden ließen das Kampfende hängen.
- **Wiederverwendbare Tests:** `node tools/e2e/run.cjs all` prüft Neues Spiel, Laufruhe, Trainerkampf und Offline-Start.

## v1.1 – Grafik & flüssige Bewegung

### ✅ Neu und getestet
- **Flüssiges Laufen:**
  - Die Figur läuft ohne Stopp von Feld zu Feld; die Restzeit eines Schritts wird mitgenommen.
  - Kamera und Figuren bewegen sich auf Bruchteile eines Spielpixels genau statt in 1-Pixel-Sprüngen.
  - Gemessen: konstant 1,2 Pixel pro Bild bei 60 Bildern pro Sekunde, ohne einen einzigen Stillstand.
- **Volle Bildschirmauflösung:** Das Spiel zeichnet in der echten Auflösung des Handys, zum Beispiel 5 Pixel pro Spielpixel auf dem iPhone. Dadurch ist alles schärfer.
- **Neue Welt-Grafik:**
  - Gras, Wege, Sand und Wasser mit feiner Struktur und mehreren Farbtönen
  - Gras wächst über Wegränder, Ufer mit Schaum
  - Hohe Laub- und Nadelbäume (1,5 Felder) mit Licht und Schatten; die Krone wird über Figuren gezeichnet, man verschwindet also halb hinter Bäumen
  - Häuser mit Dachziegeln, Holzwänden, Steinsockel, Fensterrahmen und Tür mit Stufe
  - Schatten von Bäumen, Felsen und Häusern, ziehende Wolkenschatten, Sonnenlicht und Vignette
  - Nachts leuchtende Fenster mit Lichtschein auf dem Boden und Glühwürmchen
  - Staub, Grashalme oder Schnee beim Laufen

## v1.0 – Phase 5: Qualität & Android-App

### ✅ Neu und getestet
- **Android-App:**
  - Echte App (Capacitor), die komplett offline und ohne Browser läuft.
  - Nach jeder Änderung baut GitHub automatisch eine neue APK.
  - Download: https://github.com/Alexdik7/Gaming-Gang/releases/latest/download/LegendsUnited.apk
  - Installation: [APP.md](APP.md)
  - Eigenes Icon, Startbild und Vollbild.
  - Alle Versionen tragen dieselbe Signatur, damit Updates den Spielstand behalten.
- **Komponierte Musik:** 11 eigene Stücke statt Zufallsmelodien.
  - Orte: Titel, Stadt, Route, Nacht, Höhle, Arena
  - Kämpfe: Wildkampf, Trainer, Boss (Arenaleiter, Top 4, Rivalen), Legende (Hüter, Raids), Finale (Champion, Umbra, Nihilux)
  - Die Zuordnung zu Ort und Kampf ist automatisch.
- **17 neue Kreaturen**, jetzt **150**. Sie sind über die frühen und mittleren Gebiete verteilt. Neu ist auch die Goldbarbe als seltener Angelfang. Wellenfohlen entwickelt sich zu Wogenross.
- **Doppel- und Raid-Kämpfe** haben jetzt dieselben Effekt-Animationen wie Einzelkämpfe: Strahlen, Blitze, Sturm, Beben, Wolken, Heilung.
- **Offline-Schrift:** Pixelify Sans liegt lokal im Spiel. Es gibt keine externen Anfragen mehr.

## v0.14 – Phase 4.5b: Raids & Nihilux

### ✅ Neu und getestet
- **Neuer Kampfmodus: Raid, 4 gegen 1.**
  - Bis zu 4 Spieler kämpfen gemeinsam gegen einen Boss, der mehrmals pro Runde angreift.
  - Freie Plätze übernehmen **Kian, Lyra und Nyx** als KI-Helfer. So sind Raids auch allein spielbar.
  - **Online:** Der Gastgeber lädt alle Mitspieler auf derselben Karte ein. Der Raid startet, sobald alle geantwortet haben, spätestens nach 25 Sekunden.
  - Der Server berechnet alles. Verliert jemand die Verbindung, kämpft die KI für ihn weiter.
  - Der Server-Koop ist allgemein auf 2–4 Spieler umgebaut. Der 2er-Koop gegen den Felsenkoloss läuft weiter, ein Regressionstest war grün.
- **Dimensionsriss** am alten Altar im Altwald, offen nach Prof. Lindes Geständnis.
  - Er hat eigene wilde Kreaturen (Lv 58–65).
  - Drei Raid-Wächter: **Chronoth** (Metall/Magie), **Vortyx** (Schatten/Luft), **Prismora** (Licht/Magie).
  - Nach einem Sieg bleibt der Wächter geschwächt zurück und kann gebunden werden. Raids lassen sich wiederholen.
- **Nihilux:**
  - Erwacht, sobald alle drei Wächter besiegt sind (Raid-Boss Lv 72).
  - Nach dem Sieg schließt sich Nihilux dir an. Damit endet Phase 4.
- **12 neue Kreaturen**, jetzt 133: Splitterling → Splitterdrache, Leerfalter, Zeitkäfer, Nebelmolch, Sternqualle, Echopilz, Phasenhase, die 3 Wächter und Nihilux. Dazu 5 neue Attacken.
- **Neue Raid-Ansicht:** 4 eigene Kreaturen in einer Reihe mit kompakten KP-Anzeigen.
- **Balancing per Simulation**, allein mit 3 KI-Helfern auf Lv 64:
  - Chronoth 83 %, Prismora 89 %, Vortyx 63 %, Nihilux 58 %
  - Mit 4 Spielern liegt die Siegquote bei fast 100 %.
- **Tests:** Online-Raid mit 3 Browsern bis zum Sieg, mit Verbindungsabbruch mittendrin. Raid allein bis zu Nihilux. Alle 52 Karten sind fehlerfrei.

## v0.13 – Phase 4.5a: Postgame & Hüter

### ✅ Neu und getestet
- **Lindes Geheimnis:**
  - Nach dem Champion-Titel ruft Prof. Linde an.
  - Sie gesteht, dass sie Team Eklipse einst mit Umbra gegründet hat.
  - Sie erzählt von den erwachten Hütern und gibt dir **8 Urkristalle** (zehnfache Bindchance). Hast du keine mehr, legt sie 3 nach.
- **Vier Heiligtümer**, deren Eingänge bis dahin ein Bann versiegelt:
  - **Kraterherz** im Norden von Ignis, mit **Ignarok** (Feuer/Erde)
  - **Gezeitengrotte** auf der Insel vor Route 4 (nur per Surfen), mit **Maristra** (Wasser/Magie)
  - **Frostgipfel** nordöstlich von Frostheim, mit **Boreon** (Eis/Luft)
  - **Drachengipfel** nordöstlich von Drakmor, mit **Ferrodrakon** (Drache/Metall)
- **Die Hüter:**
  - Lv 65, bis zum Binden immer wieder herausforderbar.
  - Jedes Heiligtum hat eigene wilde Kreaturen (Lv 56–64), einen Meistertrainer und Fundstücke.
- **Revanche:** Lunareth und Solarion kehren an ihre Altäre zurück, falls du sie nicht gebunden hast (Lv 60).
- **Linde zählt deine Hüter:** 7 Regionen, 7 Hüter.
- **14 neue Kreaturen**, jetzt 121:
  - Funkwiesel → Blitzwiesel, Glutviper, Obsidrak, Perlnixe, Nachtkrake, Firnwolf, Sturmyak, Donnerdrache, Wolkenwal
  - die 4 Hüter
  - 4 neue Hüter-Attacken
- **Balancing per Simulation:** Ein einfacher Bot gewinnt auf Lv 60 gegen Ignarok, Boreon und Ferrodrakon meistens. Maristra ist die schwerste Hüterin. Mit 5 Urkristallen gelingt das Binden pro Versuch zu etwa 20–45 %.
- Alle 51 Karten sind fehlerfrei.

## v0.12 – Phase 4.4: Liga & Finale

### ✅ Neu und getestet
- **Lyras Entscheidung** am Nordausgang des Drachenhorts (ab 8 Orden):
  - Lyra wechselt die Seite.
  - **Doppelkampf an ihrer Seite** gegen Kommandantin Nyx und Elite Vorax. Lyra kämpft per KI mit, du steuerst deine Kreaturen.
  - Danach steigt Nyx bei Team Eklipse aus.
- **Siegesstraße:** große Höhle mit Brocken-Rätsel (füllt ein Loch → Druckplatte → Steintor), 4 Ass-Trainer (Lv 52–55) und neuen wilden Kreaturen bis Lv 55.
- **Liga-Plateau** mit Heilzentrum, Laden und Liga-Gebäude:
  - **letzter Kampf gegen Rivale Kian**
  - Neu im Laden: **Hypertrank** (heilt 200 KP).
- **Top 4** in vier Räumen hintereinander, ohne Heilung dazwischen:
  - **Ranka** (Pflanze/Gift), **Aeris** (Luft), **Mirella** (Geist), **Thalor** (Magie), Lv 52–58
  - Jeder Sieg öffnet das Tor zum nächsten Raum.
  - Wer verliert oder das Plateau verlässt, beginnt die Liga von vorn.
- **Umbras Finale** in der Champion-Halle:
  - Lyra heilt dich vorher.
  - Umbra hat 6 Kreaturen (Lv 56–60).
  - Danach erhältst du den **Zeit-** und den **Ursprungs-Herzstein**. Damit sind **alle 7 Herzsteine** vereint.
- **Champion Aurin** (6 Kreaturen, Lv 57–60, Ass: Drakonar).
- **Ruhmeshalle mit Abspann.** Danach geht es zurück nach Hause. Liga-Revanchen sind jederzeit möglich.
- **Balancing per Simulation:**
  - Ein einfacher Bot, der Vala auf Lv 52 zu 68 % schlägt, gewinnt gegen Aurin mit 4 Tränken auf Lv 57 zu 49 % und auf Lv 60 zu 81 %.
  - Gegen Umbra gewinnt derselbe Bot auf Lv 60 zu 93 %.
- **Karten:** 47 Karten ohne Fehler. Der Kartenprüfer erkennt jetzt Tore, die sich nach einem Sieg öffnen.

## v0.11 – Phase 4.3: Drakmor

### ✅ Neu und getestet
- **Neue Mechanik: Felsbrocken schieben.**
  - Ein Brocken, den du in ein Felsloch schiebst, füllt es und macht den Weg frei.
  - Brocken lassen sich auch auf Druckplatten schieben.
  - Positionen und gefüllte Löcher werden gespeichert.
- **Route 8 · Drachensteig** südlich von Solaria:
  - nur mit dem Sonnen-Herzstein zugänglich
  - Bergpfad mit Felswänden, Berggras und 3 Trainern
- **Bergstadt Drakmor.**
- **Arena 7:**
  - Schiebe-Rätsel, 4 Brocken für 2 Lochreihen, vom Löser geprüft (33 Züge)
  - **Arenaleiter Brann** (Metall) → **Erzorden**
- **Eklipse-Hauptquartier** im Berg (nur mit Erzorden):
  - Schiebe-Rätsel (41 Züge), 2 Rüpel
  - **erster Kampf gegen Anführer Umbra** (5 Kreaturen, Lv 49–52)
  - Er erklärt seinen Plan, die Zeit anzuhalten → **Drachen-Herzstein** (5/7)
- **Drachenhort** westlich der Stadt, öffnet sich nach Umbra:
  - **Arena 8** mit **Arenaleiterin Vala** (Drache) → **Drachenorden**, dem 8. Orden
- **10 neue Kreaturen**, jetzt 107 insgesamt: Drachling → Flugdrache, Erzkäfer, Felsadler, Kristallwyrm, Eisenbock, Schwelwyrm, Gipfelgolem, Wyvernix, Zackenrücken
- **3 neue Attacken:** Drachenwut, Erzschlag, Steinhagel.
- **Beutel:** Die Herzsteine aus Mondruine und Sonnentempel erscheinen jetzt korrekt.
- Alle 40 Karten sind fehlerfrei, der Levelverlauf steigt gleichmäßig bis 54.

## v0.10 – Phase 4.2: Solaria

### ✅ Neu und getestet
- **Route 7 · Sandmeer** südlich von Nocturna:
  - nur mit dem Mond-Herzstein zugänglich
  - **sichtbarer Sandsturm**, Kakteen, trockenes Gestrüpp und 3 Trainer
- **Wüstenstadt Solaria** mit Oase.
- **Arena 6:**
  - **Druckplatten öffnen goldene Tore.** Man muss die richtigen Platten finden, um zur Leiterin zu kommen.
  - **Arenaleiterin Sahra** (Licht) → **Sonnenorden**
- **Sonnentempel** (nur mit Sonnenorden):
  - Drei Siegelplatten öffnen nacheinander die Tore.
  - **Kampf gegen Nyx** (4 Kreaturen, Lv 42–44). Sie verrät, dass Umbra in Drakmor wartet.
  - Der legendäre Hüter **Solarion** (Lv 45, fangbar) gibt den **Sonnen-Herzstein** frei.
- **10 neue Kreaturen + 1 Legendäres**, jetzt 97 insgesamt: Sandechse → Dünenwaran, Sonnenkäfer, Kaktling → Kaktoroc, Dünenwurm, Fatamor, Sonnfalke, Tempelgolem, Sandspringer, **Solarion**
- **3 neue Attacken:** Sandsturm, Lichtklinge, Fata Morgana.
- **Kartenprüfung:**
  - Sie kennt jetzt Tore und Platten und prüft, dass jedes Tor sich öffnen lässt.
  - Alle 34 Karten sind fehlerfrei.
  - Ein Löser hat bestätigt, dass der Tempel-Altar nur mit allen drei Platten erreichbar ist.

## v0.9 – Phase 4.1: Nocturna

### ✅ Neu und getestet
- **Route 6 · Dämmerwald** südlich von Aqualis:
  - erst nach dem Eis-Herzstein zugänglich
  - Hier ist **immer Nacht**, mit dunklem Wald und 3 Trainern.
- **Stadt Nocturna** in ewiger Nacht.
- **Arena 5:**
  - Labyrinth in völliger Dunkelheit, sichtbar ist nur ein Lichtkreis um dich herum.
  - **Arenaleiterin Morwen** (Geist/Schatten) → **Schattenorden**
- **Mondruine** (nur mit Schattenorden):
  - dunkles Säulenlabyrinth
  - Lyra verrät den wahren Anführer von Team Eklipse: **Umbra**.
  - Am Altar wartet der legendäre Hüter **Lunareth** (Lv 40, fangbar) → **Mond-Herzstein**
- **10 neue Kreaturen + 1 Legendäres**, jetzt 86 insgesamt: Mondfalter, Seelenlaterne, Schattenfuchs → Finsterfuchs, Gruftkäfer, Mondhase, Finstereule, Grabwurm, Albmolch, Spukling, **Lunareth**
- **3 neue Attacken:** Mondstrahl, Schattenklaue, Seelenfeuer.
- Alle 30 Karten sind fehlerfrei, der Levelverlauf steigt gleichmäßig bis 40.

## v0.8 – Phase 3 abgeschlossen

### ✅ Neu und getestet
- **Eisgrotte** nördlich von Frostheim, nur mit 4 Orden:
  - Höhle mit Eis-Kreaturen und 2 Eklipse-Rüpeln
  - Rutsch-Rätsel, das je nach Startpunkt 5 bis 10 Züge braucht (vom Löser geprüft)
- **Finale:** Doppelkampf gegen **Nyx & Lyra**, allein mit 2 Kreaturen oder zu zweit online.
  - Danach erhältst du den **Eis-Herzstein** und Lyra beginnt zu zweifeln.
  - Simulierte Siegchance allein: Lv 30 etwa 35 %, Lv 33 etwa 80 %.
- **Neue Items:**
  - Heilbeere (40 KP), Klarbeere (heilt Status), Beleber (weckt kampfunfähige Kreaturen)
  - Alle drei funktionieren im Kampf, im Doppelkampf und im Beutel.
- **8 Attacken-Kristalle (AK):**
  - Sie lehren starke Attacken, und zwar Kreaturen desselben Typs oder solchen mit der Attacke im Lernset.
  - Zu finden in Gebieten und als Quest-Belohnung.
- **6 Beerenbüsche** auf Route 1, 2 und 4: einmal pro Spieltag Beeren pflücken.
- **3 Nebenquests** „Zeig mir …“:
  - Kind in Ignis → Flammeule
  - Fischer in Aqualis → Geisterflosse
  - Alte Frau in Frostheim → Schneeglock
- **Laden** mit Heilbeere, Klarbeere und Beleber.
- **Balancing-Skript** `tools/balance.mjs`: Der Levelverlauf steigt gleichmäßig von 2 bis 34, ohne große Sprünge.
- Alle 26 Karten sind fehlerfrei.

## v0.7 – Phase 3, Teil 3: Frostheim

### ✅ Neu und getestet
- **Route 5 · Frostpass:**
  - Beginnt am Nordrand von Felsenau, nur mit 3 Orden.
  - Tiefschnee, verschneite Tannen und 2 Trainer
  - **Eissee mit Rutsch-Rätsel:** Auf Eis rutschst du, bis dich ein Fels stoppt.
- **Rivalin Lyra:**
  - Erster Kampf am Pass
  - Danach verrät sie, dass sie Team Eklipse für die Einzigen hält, die verstanden haben, dass die Welt zerfällt.
- **Stadt Frostheim** mit zugefrorenem Teich zum Rutschen, Heilzentrum und Laden.
- **Arena 4:**
  - Eisspiegel-Rätsel mit mindestens 5 Rutschzügen, 2 Arena-Trainer
  - **Arenaleiter Halvar** (Eis) → **Frostorden** + Supertränke und Sternkristalle
- **10 neue Kreaturen:** Schneehase, Frostfuchs → Polarfuchs, Pinguk → Kaiserpingu, Frosteule, Eiszapfling, Nordlicht (episch, nachts), Firnwurm, Schneeglock
  - Insgesamt sind es jetzt 75 Arten.
- **4 neue Attacken:** Blizzard, Hagelschlag, Frostbiss, Eisschild.
- **Neuer Kampfhintergrund** „Schnee“.
- **Kartenprüfung** simuliert jetzt auch das Rutschen auf Eis. Ein Löser-Skript hat beide Eisrätsel auf Lösbarkeit geprüft.
- Alle 25 Karten sind fehlerfrei.

## v0.6 – Phase 3, Teil 2: Aqualis

### ✅ Neu und getestet
- **Route 4 · Küstenweg** südlich von Ignis:
  - Strand und Meer, 3 Trainer
  - eine kleine Insel mit Sternkristallen, nur surfend erreichbar
- **Surfen:**
  - Surferin Malu gibt dir mit dem Glutorden den **Wellenreiter**.
  - Am Wasser A drücken → „Surfen“: Deine erste Wasser-Kreatur zieht dich und ist dabei sichtbar.
  - Auf dem Meer gibt es eigene Begegnungen. An Land steigst du automatisch ab.
- **Stadt Aqualis** am Meer, mit Steg, Heilzentrum und Laden.
  - Die Arena ist verschlossen: Leiterin Meri ist zur Insel aufgebrochen.
- **Eklipse-Versteck** in der Höhle auf der Insel:
  - Labyrinth aus Metallgängen mit 3 Rüpeln
  - **Kampf gegen Kommandantin Nyx** → du erhältst den **Meeres-Herzstein**, Nyx deutet auf Frostheim.
- **Arena 3:**
  - Wasserbecken mit Stegen, Surfen ist dort verboten.
  - 2 Arena-Trainer, **Arenaleiterin Meri** (Wasser) → **Wellenorden** + 4 Sternkristalle
- **10 neue Kreaturen:** Möwix → Sturmmöwe, Quallo → Quallissima, Perlpanzer, Wogenross, Korallgolem, Sternquappe, Geisterflosse (nachts), Tangechse
  - Insgesamt sind es jetzt 65 Arten.
- **4 neue Attacken:** Wellenschlag, Gischt, Perlenglanz, Nesselhieb.
- **Kartenprüfung** kennt jetzt Wege, die nur surfend erreichbar sind: alle 22 Karten fehlerfrei.

## v0.5 – Phase 3, Teil 1: Ignis

### ✅ Neu und getestet
- **Route 3 · Aschepfad** (östlich von Felsenau, nur mit Felsorden):
  - Ascheboden, hohes Aschegras, Lavaseen und Basaltfelsen
  - 3 Trainer, 2 Fundstücke
- **Stadt Ignis:** Heilzentrum, Laden und Arena am Vulkan.
- **Team Eklipse:**
  - Zwei Rüpel besetzen die Arena.
  - Sind beide besiegt, tritt Kommandantin Nyx auf und spricht von den „Herzsteinen“.
- **Arena 2:**
  - Lava-Labyrinth mit 2 Arena-Trainern
  - **Arenaleiterin Selma** (Feuer) → **Glutorden** + 3 Supertränke
- **10 neue Kreaturen:** Aschwurm → Magmawurm, Glutling → Vulkanox, Rauchfalter, Schlackgolem, Funkenkäfer, Kohlenkrebs, Flammeule (selten, nur nachts), Ascheohr
  - Insgesamt sind es jetzt 55 Arten.
- **3 neue Attacken:** Lavabrocken, Hitzeschild, Aschesturm.
- **Neuer Kampfhintergrund** „Vulkan“.
- **Grafik-Feinschliff** (eigener Stil):
  - Bäume mit Schatten, Stammkanten und Lichtbüscheln
  - Wasser mit Tiefenstreifen und Glitzern
  - Augen leuchten auf dunklen Kreaturen
- **Karten-Prüfskript** `tools/checkmaps.mjs`: Alle 18 Karten sind fehlerfrei.

## v0.4 – Phase 2b

### ✅ Neu und getestet (automatisch, mit 2 gleichzeitigen Spielern)
- **Doppelkämpfe:** 2 gegen 2, Zielauswahl, Wechseln, Tränke.
  Im Einzelspiel steuerst du deine ersten beiden Kreaturen selbst.
- **Zwillinge Ria & Rio** (Quellbach, südlich vom Teich):
  - allein mit 2 Kreaturen oder zu zweit online
  - Belohnung: 1200 ◈
- **Felsenkoloss** (Kieselhöhle, oben rechts):
  - Koop-Boss nur für 2 Spieler, mit doppelten KP und 2 Aktionen pro Runde
  - Belohnung: 1500 ◈ + 2 Sternkristalle für beide
  - Danach ist der Gang frei.
- **Koop-Kämpfe:**
  - Der Server berechnet alles, jeder steuert seine eigene Kreatur.
  - Erfahrung und Entwicklungen gehen auf die echten Kreaturen über.
  - Die KP der echten Kreaturen bleiben unberührt.
- **Tausch-Entwicklungen:** Kieselkrebs, Schemenohr, Brockel und Irrlicht entwickeln sich sofort, wenn man sie tauscht.
- **Getauschte Kreaturen** bekommen 1,5× Erfahrung.
- **Sicherung** (ONLINE → SICHERN / WIEDERHERSTELLEN):
  - Der Spielstand wird zusätzlich auf dem Weltserver gesichert, automatisch bei jedem Speichern.
- **Gerät wechseln:**
  - Auf dem alten Gerät zeigt ONLINE → GERÄT WECHSELN einen 8-stelligen Code an.
  - Auf dem neuen Gerät: ONLINE → SPIELSTAND HOLEN.
- **Zu Freund reisen:** ONLINE → ZU FREUND REISEN bringt dich direkt neben einen Mitspieler.
- **Balance per Simulation geprüft** (je 300 Kämpfe):
  - Zwillinge allein mit Lv 14/12: etwa 30–60 % Siegchance, mit Lv 16: über 80 %
  - Koloss zu zweit mit Lv 16: etwa ein Drittel, mit Lv 18: etwa drei Viertel

## v0.3 – Phase 2a

### ✅ Neu und getestet
- **Neue Grafik:** Alle Kreaturen und Trainer sind jetzt echte 2D-Pixel-Art im Stil der 32-Bit-Handhelds:
  - 64×64-Kampfsprites von vorn und hinten, 32×32-Symbole
  - Schattierung in drei Stufen mit Licht von oben links, farbige Innenkonturen und dunkle Außenkontur
  - 20 Körperbautypen; Zusatzteile wie Hörner, Flügel oder Krone erscheinen auch bei Mutationen
  - Alle Grafiken sind eigenständig gestaltet.
- **3D-Teil entfernt:** `3d.html`, Three.js und die 3D-Welt sind gelöscht. Das Spiel lädt dadurch deutlich schneller (ca. 0,8 MB weniger).
- **Online-Koop** (START → ONLINE):
  - **Welten:** Welt erstellen (6-stelliger Code) oder mit Code beitreten, bis zu 4 Spieler. Die letzte Welt wird automatisch wieder betreten.
  - **Auf der Karte:** Mitspieler laufen sichtbar mit Namen herum; Chat-Nachrichten an alle.
  - **Freundschaftskampf:** Vor einen Mitspieler stellen → A → KÄMPFEN.
    - Der **Server** berechnet den Kampf, die Handys senden nur ihre Wahl.
    - Beide Teams kämpfen mit voller KP; danach ist niemand verletzt.
    - Aufgeben ist möglich, Items nicht.
  - **Tausch:** A → TAUSCHEN, beide wählen eine Kreatur, beide bestätigen.
    Die Kreatur merkt sich ihren ursprünglichen Trainer, und auch Mutationen lassen sich tauschen.
- Getestet mit zwei gleichzeitigen Spielern: verbinden, sich sehen, kompletter Kampf, Tausch.


## Handheld-Edition (v0.2)

### ✅ Funktioniert (getestet)

**Präsentation**
- Bildschirm mit 240×160 Pixeln wie beim Handheld.
- Steuerkreuz, A, B, START und SELECT auf dem Handy, im Hoch- und Querformat. Am PC per Tastatur.
- Kachelbewegung in vier Richtungen mit Lauf- und Rennanimation, Kanten zum Runterspringen und hohes Gras, das über die Füße wächst.
- Tag und Nacht mit Abenddämmerung. Manche Kreaturen erscheinen nur nachts.
- Alle Grafiken werden im Code erzeugt:
  - Pixel-Kacheln und Gebäude
  - Spielfiguren mit 4 Richtungen × 3 Frames
  - Kreaturen-Sprites: 64×64 von vorn und hinten (seit v0.3 als echte 2D-Pixel-Art)

**Start**
- Titelbild.
- Intro mit Professorin Linde.
- **Charakter-Editor:** Name, Haut, Haare, Oberteil, Hose und Mütze, mit Live-Vorschau groß und als Laufsprite.

**Welt:** 7 Außengebiete und 7 Innenräume.
- **Gebiete:** Moosgrund, Route 1, Quellbach, Altwald mit Ruinen, Route 2, Kieselhöhle, Felsenau
- **Innenräume:** Zuhause, Nachbarhaus, Labor, Heilzentrum, Laden, Brutstätte, Arena
- Schilder, Fundstücke, Angeln mit der Angel von Angler Jo, PC-Box im Heilzentrum.

**Story**
1. Starterwahl am Kristalltisch, danach der erste Kampf gegen Rivale Kian.
2. Chronik und Bindkristalle von der Professorin.
3. Rivalenkampf 2 auf Route 2.
4. Höhle, Arena Felsenau mit 2 Arena-Trainern und **Arenaleiter Gorm** → **Felsorden**.
5. **Geheimnis:** drei versteckte Runensteine im Altwald, danach erscheint nachts das legendäre **Sylvaron**.

**Trainer:** 7 Trainer, die dich sehen, mit „!“ auf dich zulaufen und dich herausfordern.

**Kreaturen:** 45 Arten in 20 Körperbautypen, dazu Entwicklungen, schillernde Varianten und 15 Typen.

**Kampf**
- Handheld-Layout: Gegner oben, eigene Kreatur von hinten.
- KP-Leisten, die sich abbauen, und eine EP-Leiste.
- Menü mit KAMPF, BEUTEL, TEAM und FLUCHT; Attackenmenü mit AP und Typ.
- Effekte: Partikel, Blitze, Wirbel, Beben und Bildschirmwackeln.
- Bindkristall-Wurf mit Wackeln.
- Levelaufstieg, Attacken lernen mit Vergessen-Dialog und Entwicklungsanimation.

**Brutstätte und Mutationen**
- Du gibst zwei Kreaturen ab. Beim Laufen gewinnen sie EP, und es entsteht ein Ei.
- Die Chance hängt davon ab, wie gut sich die beiden verstehen.
- Aus zwei **verschiedenen** Arten schlüpft eine **Mutation**, eine eigene neue Art:
  - **Name:** aus beiden Namen gemischt, z. B. Funkfux + Flatterlo → *Funkterlo*.
  - **Typen:** von beiden Eltern.
  - **Werte:** Durchschnitt beider Eltern plus 5 %.
  - **Attacken:** die Lernlisten beider Eltern zusammengelegt, plus je eine Erbattacke.
  - **Aussehen:** Körperbau von der **Mutter**, Farben und ein **Merkmal** vom **Vater** (Flügel, Hörner, Flossen, Pilzhut, Ohren …).
  - **Entwicklung:** möglich, wenn die Eltern sich entwickeln können.
- Mit 18 % Chance schlüpft ein **Mutant**: 10 % stärker, mit Stirnjuwel und eigenem Farbton.
- Mutationen lassen sich weiter kreuzen.
- Gleiche Arten ergeben ein normales Junges.
- Feuer-Kreaturen im Team brüten Eier doppelt so schnell aus.
- Schlüpfen mit Animation. Mutationen erscheinen in einer eigenen Rubrik der Chronik.

**Menüs:** Team (mit Reihenfolge tauschen), Bericht (2 Seiten), Chronik, Beutel, Trainerpass mit Orden, Speichern, Optionen (Musik, Effekte, Textgeschwindigkeit).

### ❌ Fehlt noch
- **Weitere Regionen:** Ignis, Frostheim, Aqualis, Nocturna, Solaria, Drakmor.
- **Arenen 2–8, Top 4 und Champion.**
- **Mehr Kreaturen:** Ziel sind 150 Arten, aktuell sind es 45 plus beliebig viele Mutationen.
- **Eigens komponierte Musik:** Die Musik wird derzeit vom Spiel erzeugt.

## 3D-Prototyp (v0.1)
Wurde mit v0.3 entfernt. Kampflogik, Daten und Server leben in der Handheld-Edition weiter.

## v1.3 – Smaragd-Gefühl
- **Kampfhintergründe:** im Stil der GBA-Ära, je Gebiet eigene Pixel-Art. Gras mit Baumreihen und Bergen, Wald, Meer, Berge, Höhle, Wüste, Schnee, Vulkan, Ruine, Arena und Liga. Dazu passende Grasplattformen mit Halmen.
- **Statusboxen wie in Smaragd:**
  - cremefarben mit dunklem Rand und spitzer Seite
  - Geschlechtssymbol ♂/♀, „KP“-Schild, EP-Balken
  - Kristall-Symbol bei schon gebundenen Arten
- **Level-Up-Fenster:** zuerst die Zuwächse (+2 …), dann die neuen Werte.
- **Fang:**
  - eigene Fangmelodie
  - Chronik-Seite beim ersten Fang einer Art (Nr., Typen, Seltenheit, Beschreibung)
- **Sammelbelohnungen:** Prof. Linde meldet sich bei 5, 10, 20, 30, 45, 60, 80, 100, 125 und 150 gebundenen Arten. Bei 45 gibt es das **Glanzamulett** (schimmernde Kreaturen dreimal so oft).
- **Massenausbruch:** Jeden Tag taucht in einem Gebiet eine seltene Art gehäuft auf. Beim Betreten gibt es einen Hinweis, im Heilzentrum ein Gerücht.
- **Schimmernde Kreaturen** funkeln beim Erscheinen.
- **Heilzentrum:** Heilmaschine, auf der die Kristalle nacheinander aufleuchten, mit eigener Heilmelodie.
- **Hohes Gras:** raschelt mit Halmen und Geräusch, wenn man hindurchläuft.

## v1.4 – Smaragd-Oberwelt
- **Neue Figuren im GBA-Format:** 16×24 Pixel, großer Kopf, dunkler Umriss, Kappe und Haarschnitt aus den Farbangaben. Laufphasen mit schwingenden Armen in alle vier Richtungen. Gilt für alle Personen.
- **Spiegelung:** Wer direkt am Wasser steht, spiegelt sich leicht wellend darin.
- **Fußspuren:** Im Sand bleiben Fußspuren, die nach einigen Sekunden verblassen.
- **Trainerkampf-Übergang:** dreimal Aufblitzen, dann schließt sich ein Kreis mit drehendem Kristall. Wilde Kämpfe behalten die Streifen-Blende.
- **Startmenü:** mit Beschreibungszeile unten wie im Original.
- **Beutel:**
  - bildschirmfüllend mit fünf Taschen (Items, Kristalle, A-Kristalle, Beeren, Basis-Items), wechselbar mit ← →
  - Beutelgrafik in Taschenfarbe und Beschreibung des gewählten Gegenstands

## v1.5 – Team, Bericht und Wetter wie in Smaragd
- **Team-Bildschirm im Original-Layout:**
  - erste Kreatur groß links, die anderen als Leisten rechts
  - blaue Felder, orange für die Auswahl, rot bei K.O.
  - hüpfendes Symbol, Status und KP-Schild
- **Bericht mit drei Seiten** (◀ ▶):
  - INFO: Art, Seltenheit, Trainer, Freundschaft, Beschreibung
  - WERTE: Balken je Wert, EP bis zum nächsten Level
  - ATTACKEN: Typ, AP, Stärke, Genauigkeit und eine erzeugte Beschreibung der Wirkung
- **Wetter:**
  - Aschenregen auf Route 3, in Ignis und im Kraterherz
  - Schneefall auf Route 5, in Frostheim und am Frostgipfel
  - Regen wechselt täglich auf sechs Gebieten
- **Türen** öffnen sich sichtbar, bevor man ein Haus betritt.
- **Felsvorsprünge:** Beim Hüpfen bleibt der Schatten am Boden und wird kleiner.

## v1.6 – Mitläufer, VMs und Typ-Fähigkeiten
- **Mitläufer:** Die erste kampffähige Kreatur läuft hinter dir her, auch über Felsvorsprünge. Beim Surfen versteckt sie sich.
  - Ansprechen (A) zeigt Reaktionen auf Wetter, Gelände, Tageszeit, Gesundheit und Freundschaft, oft mit Herz.
  - Manchmal hat sie etwas gefunden, etwa Beeren, Tränke oder Kristalle.
  - Jedes erste Gespräch pro Gebiet steigert die Freundschaft.
- **Fünf VMs** (werden nicht verbraucht, lernbar je nach Typ):

  | VM | Lernbar für | Wirkung außerhalb von Kämpfen | Bekommst du von |
  |---|---|---|---|
  | VM01 Zerschneider | alle | Büsche entfernen | Gärtner in Moosgrund, nach der Starterwahl |
  | VM02 Zertrümmerer | alle außer Luft und Geist | rissige Felsen zerschlagen | Alter Bergmann in Ignis, nach der Befreiung der Arena |
  | VM03 Surfer | Wasser, Eis, Drache | surfen (der alte Weg mit Wasser-Typ und Wellenreiter bleibt erhalten) | Malu, zusammen mit dem Wellenreiter |
  | VM04 Blitz | Elektro, Licht, Feuer, Magie | erhellt die Mondruine | Frau in Nocturna |
  | VM05 Fliegen | Luft, Drache | zu besuchten Städten mit Heilzentrum fliegen | Bergältester in Drakmor, ab 6 Orden |

  Wie gewohnt einsetzbar: vor das Hindernis stellen und A drücken, oder im Team-Menü auswählen.
  Neue Verstecke hinter Büschen gibt es auf Route 1 und 2, hinter einem rissigen Felsen auf Route 3.
- **Typ-Fähigkeiten** im Team-Menü (★):
  - Pflanze **Lockduft**: wilde Begegnung im hohen Gras
  - Erde **Spürnase** und Metall **Metallsinn**: zeigen zwei versteckte Fundstücke je Route
  - Elektro **Magnetsinn**: Arten, die hier noch fehlen, dazu Massenausbruch
  - Magie **Teleport**: zum Heilzentrum
  - Geist, Schatten, Drache und Gift: **Schleier**, 150 Schritte keine Begegnungen
  - Luft **Rückenwind**: 200 Schritte schneller
  - Feuer **Glut** und Licht **Leuchten**: mehr Licht im Dunkeln
  - Wasser **Quellwasser**: 20 KP für alle, einmal pro Gebiet
  - Eis **Frostatem**: heilt Verbrennungen in Hitzegebieten
- **Test:** Der Lauftest wertet nur noch die Laufphase. Stillstand nach dem Loslassen zählt nicht als Ruckler.

## v1.7 – iPhone-Bildschirm und Dr. Vato
- **Hochformat:**
  - Das Spielbild reicht über die ganze Breite, ohne Konsolenrahmen.
  - Die Oberwelt nutzt die zusätzliche Höhe (`VH` bis 280 statt 160 Pixel) und zeigt fast doppelt so viele Felder.
  - Dialoge und Menüs sitzen unten, Kämpfe und Vollbild-Menüs bleiben 240×160 und werden mittig gezeigt.
  - Antippen rechnet den Versatz mit ein.
- **Querformat:** Das Spielbild nutzt die volle Höhe, die Tasten liegen halbtransparent links und rechts.
- **Professor:** heißt jetzt **Dr. Vato** (männlich, alle Texte angepasst). Neues Aussehen: lange blonde Haare zum Zopf gebunden, kantiges Kinn, Augenbrauen. Neue `look`-Felder `pony` und `jaw`, gültig für Oberwelt-Figur und großes Bild.
- **Lauftest:** erlaubt höchstens zwei einzelne ausgelassene Bilder (Testrechner ohne Grafikkarte). Stillstände zählen weiterhin als Fehler.

## v1.8 – Fangen mit Gefühl
- **Wurf-Timing:** Nach der Kristallwahl zieht sich ein Ring um die Kreatur zusammen. A drücken oder tippen, wenn er den weißen Zielring trifft.
  - Wertung: Gut ×1,3, Super ×1,7, PERFEKT ×2,4. Bei Legendären läuft der Ring schneller.
  - **Kritischer Fang:** Ein perfekter Wurf löst ihn zu 40 % aus, zu 60 % bei bereits gefangener Art; ein Super-Wurf zu 12 %. Es gibt dann nur eine Prüfung, der Kristall wackelt nur einmal.
- **Neue Kristalle**, im Laden ab Orden freigeschaltet (`SHOP`-Eintrag `[id, preis, orden]`, `ITEMS.cond`):
  - Tempo- und Freundkristall ab 1 Orden, Nacht ab 2, Flut ab 3, Echo ab 4.
  - Gefangene Kreaturen merken sich ihren Kristall (`m.ball`). Der Bericht zeigt ihn in Kristallfarbe.
- **Kreaturen-Spuren:**
  - Im hohen Gras erscheint zufällig eine raschelnde Stelle, selten auch eine funkelnde.
  - Kommt man zu nah, huscht sie bis zu zweimal weg und hinterlässt Pfotenabdrücke.
  - Wer drauftritt, trifft eine seltene Art des Gebiets: 1–3 Level über dem Maximum und mit 3 perfekten Werten. Bei der funkelnden Stelle ist sie zu 50 % schimmernd. Code: `overworld.trail`, `game.trailBattle`.

## v1.9 – Resonanz-Form und Geheimbasis
- **Resonanz-Form** (`RESO_MIN` = 200 Freundschaft):
  - Einmal pro Kampf im Kampfmenü über SELECT oder Antippen von „◆ RESONANZ“ scharfschalten. Die nächste Attacke startet die Verwandlung: Lichtsäule, Ringe, neue Seelenfarbe mit hellem Umriss (`resoSprite`) und pulsierende Aura.
  - Werte: alle ×1,3, Attacken des eigenen Typs zusätzlich ×1,2. Endet beim Auswechseln.
  - Champion, Top-4, Umbra und Hüter lassen ihre letzte Kreatur in Resonanz gehen (`trainer.reso`).
  - Freundschaft steigt: +3 pro Level-Up, +1 pro gewonnenem Kampf, +2 alle 150 Schritte für die Spitze. Bei 200 sind die Herzen im Bericht golden.
- **Geheimbasis** (`js/gb/base.js`):
  - Auf 7 Routen gibt es einen Platz: hohler Baum mit Ranken, Felsspalt oder Eishöhle (`baseSpots()` sucht ihn automatisch).
  - Beim ersten Mal schickt Dr. Vato das Basis-Set und 5 Möbel.
  - Man hat eine Basis; Umziehen nimmt die Möbel mit. Auf der eigenen Basis weht ein Fähnchen.
  - **Basis-PC:** Möbel aufstellen (Platzier-Modus mit Vorschau, grün/rot), wegräumen, Katalog mit 15 Möbeln und Kreaturen-Box.
  - Die 15 Möbel umfassen u. a. Plüschfigur und Poster mit einer gefangenen Art, ein Aquarium mit Fischen, einen flackernden Fernseher, Kristallstatue, Pokal, Teppiche, Bett und Sprungmatte. Im Bett heilt das Team, auf der Sprungmatte hüpft man.
  - **Basis-Code teilen:** Der Code (`LU-…`) wird kopiert und angezeigt. Freunde geben ihn bei „Freund besuchen“ ein, sehen die Basis samt Besitzer und kämpfen gegen dessen Team. Einmal am Tag pro Freund gibt es 1000 ◈ und ein zufälliges Möbelstück. Ganz ohne Server.

## v2.0 – Grafik-Feinschliff
- **Gras:** ruhige Grundfläche mit weichen Flecken und gezeichneten Büscheln statt Pixelrauschen.
- **Hohes Gras:** aufrechte Blattbüschel in zwei versetzten Reihen mit hellem Rand, dunkler Seite und Kontur (`tallBlades`). Der wehende Frame bleibt erhalten.
- **Wege und Wasser:** klare Flächen. Wasser mit gezeichneten Wellenbögen (dunkle Unterkante, helle Krone, Glanzpunkt), pro Variante versetzt.
- **Kanten (Ledges):** Grasnarbe mit Lichtkante, Erdwand mit hellen und dunklen Streifen, dunkle Fußlinie.
- **Zäune:** Pfosten mit Kappe, Licht- und Schattenseite, Querlatten, Bodenschatten.
- **Kreaturen und Trainer:** Feinschliff `polish()` in sprites.js für alle 150 Arten und alle Trainer.
  - Umrisse auf der Lichtseite nehmen die Farbe der Fläche an (Sel-Out), auf der Schattenseite werden sie kühl abgedunkelt.
  - Randlicht oben links, Umgebungsschatten unten rechts.
- **Kampf-Textbox:** goldener Innenrahmen, Blauverlauf, Glanzkante. Weiße Menüboxen mit zartem Innenschatten.

## v2.1 – Kreaturen-Box wie im Original (`js/gb/boxui.js`)
- 8 Boxen mit je 30 Plätzen. Jede Box hat einen Namen (umbenennbar) und einen von 8 Hintergründen.
- Links stehen ein Infofeld (großes Bild, Name, Level, Typ) und die Team-Spalte mit Lebensbalken.
- Bedienung:
  - **SELECT** oder „Verschieben“ greift eine Kreatur, **A** legt sie ab oder tauscht sie mit der Kreatur am Ziel.
  - Kreaturen lassen sich zwischen Team und Box und zwischen Boxen verschieben; am rechten Rand blättert die Box weiter.
  - **B** legt eine gegriffene Kreatur zurück an ihren Platz.
  - Antippen geht auch: einmal wählen, zweimal ausführen.
- Menü einer Kreatur: Verschieben, Bericht, Ins Team/Ablegen (schnell), Spitzname, Freilassen (doppelte Nachfrage).
- Box-Menü über die Kopfzeile: Hintergrund, Umbenennen, nach Nummer bzw. Level sortieren.
- Schutz: Mindestens eine kampffähige Kreatur bleibt immer im Team.
- Daten: Box-Kreaturen haben `m.slot` (Box × 30 + Platz), `s.boxMeta` enthält Name und Hintergrund. Alte Spielstände bekommen ihre Plätze beim ersten Öffnen (`ensureSlots`).

## v2.1.1 – Basis-Code teilen auf dem iPhone
- Das Code-Fenster hat die Knöpfe **Teilen** (iOS-Teilen-Menü, z. B. WhatsApp) und **Kopieren**.
- Beide werden direkt im Fingertipp ausgelöst, denn iOS erlaubt Teilen und Kopieren nur dort.
- Klappt das Kopieren nicht, wird der Code markiert. `inputName(…, { share: true })`.

## v2.2 – Sicherungs-Code (ohne Server)
- START → SPEICHERN → **Sicherungs-Code** erzeugt den Code und öffnet das Code-Fenster mit Teilen und Kopieren.
  - Der Spielstand wird gzip-komprimiert und als Text kodiert (`LUS1-…`, ca. 8 000 Zeichen bei 120 Box-Kreaturen; ohne `CompressionStream` `LUS0-…`).
- Titelbild → **CODE LADEN**: Code einfügen, prüfen, Nachfrage, danach geht es direkt ins Spiel. So kommt der Spielstand auf ein neues Handy.
- Code: `packSave` / `unpackSave`, `game.exportSave` / `importSave`.

## v2.3 – Bälle statt Kristalle
- Eigene Ball-Designs (`ballIcon(kind)` in pixel.js): oben farbig, unten creme, dunkles Band, kleiner runder Knopf, je Sorte ein eigenes Emblem.

  | Ball | Emblem |
  |---|---|
  | Bindball (türkis) | weiße „52“ |
  | Sternball | Stern |
  | Nachtball | Mond |
  | Flutball | Wellen |
  | Tempoball | Blitz |
  | Echoball | Ringe |
  | Freundball | Herz |
  | Urball | Gold mit Runen |

- `crystalIcon(col)` bleibt als Brücke erhalten und liefert jetzt den passenden Ball. Item-IDs bleiben gleich, alte Spielstände funktionieren also.
- Alle Texte sind angepasst: Bindbälle, Beutel-Tasche BÄLLE, Starter liegen in Bällen. Beim Einwechseln fliegt der Ball, in dem die Kreatur gefangen wurde. Der Trainer-Übergang zeigt einen drehenden Ball.
- **52-Ball** (`ball52`, `master: true`): schwarz mit goldener „52“, fängt jede Kreatur garantiert.
  - 11 Stück, so viele wie es legendäre Kreaturen gibt, liegen in Sackgassen: Route 1, Altwald, Kieselhöhle (2×), Route 5, Eisgrotte, Route 7, Tempel, Route 8, Gezeitengrotte und Drachengipfel (`it_b52_1…11`).
  - Beim Fund zählt das Spiel mit („Nummer n von 11“).
  - Der normale Bindball trägt jetzt ein Winkel-Emblem.

## v2.4 – Attacken-Effekte und neue Schrift
- **Effekte** (`js/gb/fx.js`): Jeder Typ hat eigene Partikel.

  | Typ | Partikel |
  |---|---|
  | Feuer | Flammen mit Rauch |
  | Wasser | Tropfen mit Schwerkraft und Spritzern |
  | Pflanze | wirbelnde Blätter |
  | Elektro | Funkenlinien |
  | Eis | Splitter, die stehen bleiben |
  | Erde | Felsbrocken und Staub |
  | Gift | Blasen |
  | Geist, Schatten | Schwaden |
  | Licht, Magie | Sterne |
  | Luft | Windsicheln |
  | Drache | violette Flammen |
  | Metall | Silbersplitter |

  - Bewegungsarten: Geschoss mit Spur, Salven (Blätter, Splitter, Tropfen, Felsen), Strahl mit Leuchtkern, Wirbel, Bodenbeben mit Fontänen, Blitze von oben, Nahkampf mit Ausholen, Schnittspuren, Biss.
  - Einschlag: typischer Ausbruch, Druckring, bei sehr effektiven Treffern zusätzlich ein Blitz.
- **Schrift:** Atkinson Hyperlegible (lokal in `fonts/`). Buchstaben wie I/l/1, O/0 und G/6 sind eindeutig unterscheidbar; unter 8,5 px wird sie fett gesetzt.
- **Gebäude neu gezeichnet** (`building()` in pixel.js, Art aus `sign`/`heal`):
  - **Wohnhaus:** Schindeldach mit First und Traufe, Schornstein, Fensterläden in Dachfarbe, Blumenkästen, Türlampe.
  - **Heilzentrum:** korallrotes Dach mit weißem Kreuz-Emblem, Schild „HEILZENTRUM“, Glasschiebetür, gestreifte Markise, Farbband.
  - **Markt:** blaues Dach, Schild „MARKT“, Schaufenster mit bunten Waren, Markise.
  - **Arena:** Säulen am Eingang, goldgerahmtes Schild.
  - **Labor:** Blechdach, Satellitenschüssel, Antenne.
- **Marktstände** (Karten-Feld `props`, `standArt`): Obststand in Felsenau, Hafenstand in Aqualis, Nachtmarkt in Nocturna, jeder mit eigenem Sortiment (`game.shop(list, name, hello)`).

## v2.5 – Neue Kreaturen-Namen und Item-Bilder
- **139 neue Namen**: ausgefallen und eigen, mit gemeinsamer Wurzel je Entwicklungslinie.
  - Beispiele: Glimmrik → Pyrovulp, Plätscho → Tidalotl, Knöspi → Wurzelgrimm, Piepsix → Piepsturm, Mümmel → Mümmelux, Quabbel → Quabbelissa, Pinguli → Imperguin, Umbravulp → Noctivulp.
  - Die 11 Legendären behalten ihre Namen.
  - IDs bleiben unverändert, alte Spielstände funktionieren also. Texte und Aufträge wurden mit angepasst.
- **Beutel:** Unter der Tasche erscheint ein Bild des gewählten Items (`itemIcon(id, ITEMS[id])`): Bälle, Sprühflaschen in drei Farben, Beeren, Beleber, Attacken-Kristall-Scheibe, goldene VM-Scheibe, Angel, Wellenreiter, Amulett, Herzsteine und Paket. `choose` gibt dafür den Index an `side(ctx, i)` weiter.

- **v2.5.1 – zweite Namensrunde:** international und klangvoll, Tier + Element + Mythos, z. B. Fennix → Infernyx, Axolulu → Maelotl, Sprigo → Rootan, Tweeko → Galeko, Glupsi → Toxiglup, Bunzel → Luxlapin, Pinguo → Emperon, Shadefenn → Duskfenn, Emberchick → Flarooster. Übersicht aller 150 Arten: `docs/kreaturen.png`.

## v2.6 – Kampfablauf wie im Original und neue Kampfmusik
- **Keine Vorschau mehr:** Die Kampfszene zeigt den *angezeigten* Stand (`dF`, `dP`, `dLvl`) statt des vorausberechneten Rundenergebnisses.
  - Die nächste gegnerische Kreatur erscheint erst nach dem `send`-Ereignis, also nachdem die alte besiegt ist.
  - Level, KP-Maximum und EP-Balken springen erst beim `lvl`-Ereignis. Der EP-Balken füllt sich bis zur Levelgrenze, leert sich beim Aufstieg und füllt den Rest nach.
- **Wechseln nach einem Sieg** (Trainerkämpfe): „X wird Y einsetzen. Möchtest du Z auswechseln?“ Bei Ja wird das eigene Team gewählt, die alte Kreatur zurückgerufen und die neue geschickt, ohne dass der Gegner angreift.
- **Neue Musik** (`TRACKS` in music.js; Engine-Erweiterung in audio.js):
  - Neue Klänge: Sägezahn-Lead, zweite Stimme `harm`, Bass `drive`, Arpeggio `fast` in 16teln, Schlagzeug `double` und `tribal`.
  - Wilde Kämpfe: `battle`, `battle2` (Wald, Nacht), `battle3` (Wasser, Höhle, Schnee), zufällig gemischt.
  - Trainer: `trainer` und `trainer2`, je nach Name.
  - Jeder Arenaleiter hat ein eigenes Thema (`ldr0`–`ldr7`):

    | Thema | Leiter | Stil |
    |---|---|---|
    | `ldr0` | Gorm | Stampf-Rock |
    | `ldr1` | Selma | Flamenco-Rock |
    | `ldr2` | Meri | fließende Arpeggios |
    | `ldr3` | Halvar | kristallklares Eis |
    | `ldr4` | Morwen | düstere Trommeln |
    | `ldr5` | Sahra | orientalische Tonleiter |
    | `ldr6` | Brann | episch |
    | `ldr7` | Vala | Doppelbass-Finale |

## v2.7 – Geschlechter, langsamere Brutstätte, versteckte 52-Bälle
- **Geschlecht überall:**
  - ♂/♀ als Pixel-Zeichen (`genderMark` in gbui, `genderOf` jetzt in `data/mon.js`) in Team-Liste, Bericht, PC-Box, Kampfbox und Brutstätte.
  - Beim Fang gibt es den Hinweis „ist ein Männchen/Weibchen“.
- **Brutstätte:**
  - Ein Ei gibt es nur noch von Männchen + Weibchen, die Mutter ist immer das Weibchen (`parentsOf`).
  - Chance nur alle 256 Schritte statt 80, mit 20/35/50 % statt 40/60/75 %. Das ergibt im Schnitt ca. 520 Schritte bei gleicher Art (vorher ca. 107) und ca. 1300 bei Mutationen.
  - Brutzeit über `eggSteps`: 1000 Schritte (Mutation 1400), seltene und epische Arten ×1,25 bzw. ×1,5. Vorher waren es 260 bzw. 360.
- **52-Bälle:**
  - Sie liegen unsichtbar (`ow.secret`) und sind nicht mehr als Ball zu sehen. Auch Erd-Schnüffeln zeigt sie nicht.
  - Freischaltung per `need` in `maps.js`: 2–8 Orden bzw. `'champion'` (3 Stück erst im Postgame).
  - Nur direkt daneben funkelt es alle 2,6 s kurz auf. Dieses Funkeln wird über den Baumkronen gezeichnet.

## v2.8 – Alpha-Kreaturen, Tauschen/Kämpfen per Code, Zwischensequenzen
- **Alpha-Kreaturen** (`game.alphaFor`, `alphaBattle`; Oberwelt in `ow.load`, gezeichnet mit `redSil` und `glow`):
  - Jeden Tag streift auf knapp jeder zweiten Route ein Alpha sichtbar umher. Es ist groß, hat einen roten Umriss und eine rote Aura und läuft im Radius 2.
  - Werte: höchstes Level der Route + 7, alle IVs 31. Gekämpft wird mit Boss-Musik, im Kampf mit roter Aura und rotem Namen.
  - Fangen ist schwerer (×0,45 in `tryCatch`, Flag `m.alpha`). Gefangene Alphas tragen im Bericht ein „ALPHA“-Schild.
  - Nach Sieg oder Fang gibt es Beute (Bälle, Tränke, Attacken-Kristall) und Geld. Danach ist das Alpha bis zum nächsten Tag weg (`alpha:<tag>:<karte>`).
- **Per Code ohne Server** (`js/gb/codes.js`, ONLINE → PER CODE):
  - **Tausch** in zwei Schritten: Angebot `LUT1-…`, die Kreatur wartet in `s.tradeOut`. Antwort-Code zurück. Doppeltes Einlösen wird über `s.tradeIn` verhindert. Das Angebot kann zurückgezogen werden.
  - **Kampf** über einen Team-Code `LUK1-…`. Man kämpft gegen eine Kopie des Freund-Teams (`trainerFight` mit `t.mons`, ohne Verlust). Die Bilanz steht in `s.codeFights`.
- **Zwischensequenzen** (`game.cutIn(ziel)`, `ow.cine`):
  - Kinobalken, leichte Abdunklung und ein weicher Kameraschwenk zur Figur. Das Ende kommt automatisch, sobald die Steuerung frei ist.
  - Eingebaut bei: Kian (Route 2, Liga), Nyx (Ignis, Versteck, Tempel), Lyra, Umbra (Hauptquartier, Finale) und Nihilux.
