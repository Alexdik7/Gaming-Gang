# Fortschritt

## v1.0 – Phase 5: Qualität & Android-App (aktuell)

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
