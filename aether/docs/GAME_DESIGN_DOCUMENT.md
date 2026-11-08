# Aetherwild Online – Game Design Document

Stand: Fundament 0.1 (Meilenstein 1 abgeschlossen, Meilenstein 2 umgesetzt).
Welt, Mythologie und Story: [WORLD_DESIGN_DOCUMENT.md](WORLD_DESIGN_DOCUMENT.md).

## 1. Projektanalyse: was die Referenz ausmacht

Pokémon Revolution Online (PRO) dient nur als Referenz für Spielprinzipien. Es ist ein Fan-MMO auf fremder Marke. Wir übernehmen von dort **keine** Inhalte, sondern ziehen diese Lehren:

| Beobachtung bei PRO | Was wir daraus machen |
|---|---|
| Klassischer Handheld-Ablauf (Route → Stadt → Arena) in einer geteilten Welt | Behalten: vertrauter Rhythmus, aber eigene Welt, eigene Kreaturen, eigene Story |
| Städte sind Treffpunkte, Chat ist das Herz der Community | Sichere Städte ohne Spieler-Kollision, Karten-Chat und Welt-Chat ab Tag 1 |
| Langzeitmotivation über seltene Spawns, Farbvarianten und Werte-Jagd (IV/EV) | Ja, aber ohne Zwang: Seltenheit über Ort, Zeit, Wetter und Verhalten, nicht nur über Werte |
| Grind und Wartezeiten bei Spawns, Pay-for-Komfort | Kein Pay-to-Win. Tägliche Ziele statt Wartezeiten, faire Spawn-Tabellen |
| Handel hat großen Wert, Betrug und Duping waren reale Probleme | Handel nur serverseitig, mit Transaktionen, Versionierung und Audit-Log (siehe TECHNICAL_ARCHITECTURE §6) |
| Viele Spieler spielen solo, nur wenige Systeme belohnen Zusammenspiel | Koop-Bosse, Gruppenquests und Gildenziele geben Gruppen einen echten Grund |

## 2. Vision

> **„Eine lebendige Welt voller Äther-Wesen, in der jede Begegnung eine Geschichte hat und jeder Mitspieler ein möglicher Freund, Händler oder Rivale ist.“**

Das Spiel ist ein nostalgisches 2D-Top-Down-MMORPG mit klassischem Handheld-Gefühl: Kachelwelt, Rundenkämpfe, Sammeln. Es läuft aber im Browser und auf dem iPhone als Web-App, ohne Installation und ohne App Store.

### Design-Säulen
1. **Entdecken:** Jede Region hat Geheimnisse, Wetter, Tageszeiten und Kreaturen, die nur unter bestimmten Bedingungen auftauchen.
2. **Bindung:** Kreaturen sind Individuen mit Wesenszug, Anlagen und einer Bindung zum Trainer, die mit der Zeit wächst. Manche Entwicklungen gibt es nur durch Vertrauen.
3. **Gemeinsam:** Andere Spieler sind immer sichtbar. Handel, Koop-Bosse und Gilden lohnen sich, sind aber nie Pflicht für die Story.
4. **Fairer Wettbewerb:** Ranglisten-PvP mit normierten Leveln. Strategie schlägt Grind.
5. **Ehrliche Technik:** Der Server entscheidet alles, was Wert hat. Was es im Spiel gibt, funktioniert auch.

### Zielgruppen
- **Gelegenheitsspieler:** spielen 15 Minuten in der Bahn auf dem iPhone. Sie brauchen Story-Häppchen, Tagesziele und Auto-Speichern.
- **Sammler:** wollen das Bestiarium vervollständigen. Sie brauchen Varianten, Fundorte mit Bedingungen und Forschungsstufen.
- **Kompetitive Spieler:** suchen Tiefe. Sie brauchen Ranglisten, Saisons, Turniere und ein Typ- und Wertesystem, das man durchschauen kann.
- **Soziale Spieler:** suchen Gemeinschaft. Sie brauchen Gilden, Handel, Events und Treffpunkte.

## 3. Marke

- **Name:** **Aetherwild Online** (Arbeitstitel „Project Aether“). Die Kreaturen heißen **Wildlinge**, die Trainer **Ätherbinder**.
- **Claim:** *„Binde die Wildnis.“*
- **Logo-Konzept:** Ein vierzackiger Funke (✦), der leicht im Uhrzeigersinn gekippt ist, in Äther-Blau `#64b0f0`. Daneben der Schriftzug „AETHERWILD“ in einer breiten, gesperrten Pixel-Groteske in Goldgelb `#f0c040` auf Nachtviolett `#1a1830`. Das Funken-Symbol ist zugleich App-Icon, Ladesymbol und Fangkugel-Emblem.
- **Tonalität:** warmherzig, neugierig, ein wenig geheimnisvoll. Kein Zynismus, kein Grusel ab Kapitel 1. Die dunkleren Themen (Kapitel 5–8) werden ernst, aber nie brutal.
- **Abgrenzung:** keine Kugel-Fang-Optik mit rot-weißer Teilung, keine bekannten Silhouetten. Unsere Fangwerkzeuge heißen **Bindkugeln**: Sie sind sechseckige Kristallgehäuse, in denen der Äther der Kreatur sichtbar kreist.

## 4. Kernspielschleife

```
Erkunden ──► Begegnung ──► Kampf / Fangen ──► Training / Entwicklung
   ▲                                               │
   │        Handel · Quests · Crafting             ▼
   └──── neue Gebiete (Story, Orden, Fähigkeiten) ◄┘
```

- **Mikro-Schleife (Minuten):** Gras betreten, kämpfen, fangen, heilen.
- **Meso-Schleife (Stunden):** Route abschließen, Quest lösen, nächste Arena.
- **Makro-Schleife (Wochen):** Bestiarium, Ranglisten-Saison, Gildenziele, Weltbosse, Eventvarianten.

## 5. Kreaturen-System

**Datenmodell:** Die Daten liegen in `shared/creatures.js`, das Exemplar in `shared/mon.js`, die Werte in `shared/stats.js`.

- **Art (Species):** ID, Schlüssel, Name, Klasse, Elemente (1–2), Basiswerte, Wachstumskurve, Fangrate, EP-Ausbeute, Fähigkeit, Lernliste, Entwicklungen, Seltenheit, Lebensräume, Spawn-Bedingungen, Verhalten, Beschreibung, Lore, Ruf (Synth-Parameter) und Sprite-Bauplan.
- **Exemplar (Instanz):** Level, EP, sechs **Anlagen** (0–31), sechs **Trainingswerte** (max. 252, Summe max. 510), **Wesenszug** (25 Stück, ±10 %), Schimmer-Variante (1/2048), Bindung (0–255), Attacken (max. 4), Status, Original-Trainer.
- Die **Werte** sind KP, Angriff, Verteidigung, Sp.-Angriff, Sp.-Verteidigung und Initiative. Die Formel ist offen dokumentiert und getestet (`calcStat`).
- **Skalierung:** IDs sind ganze Zahlen ohne Obergrenze. Jede Region bekommt eine eigene Datendatei (`creatures_<region>.js`), damit Ladezeiten und Diffs klein bleiben. Ein Prüfskript (Unit-Test „Bestiarium“) erzwingt vollständige Datensätze. Bei 1000 Arten beträgt der Datenumfang ca. 1,5 MB; im Client wird er pro Region nachgeladen.

### 5.1 Elementarsystem (14 Elemente)
Wild, Glut, Flut, Flor, Funke, Frost, Fels, Wind, Gift, Geist, Licht, Schatten, Metall, Klang.

Regeln:
- Jedes Element außer Wild hat mindestens eine Stärke.
- **Jedes** Element hat mindestens eine Schwäche.
- Bei Doppel-Elementen werden die Faktoren multipliziert (0 / ¼ / ½ / 1 / 2 / 4).
- Drei Immunitäten mit klarer Logik:
  - Fels erdet Funke.
  - Geist ist für Wild unberührbar.
  - Gift wirkt nicht an Metall.
- Besonderheit: **Licht und Schatten verletzen einander doppelt.** Dadurch werden Duelle der Gegenpole riskant.
- Gleiches Element wie die Attacke (STAB): ×1,5.

Die Tabelle wird automatisch aus dem Code erzeugt (`node tools/typechart.mjs`):

| Angr. ↓ / Vert. → | Wil | Glu | Flu | Flo | Fun | Fro | Fel | Win | Gif | Gei | Lic | Sch | Met | Kla |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **Wild** | · | · | · | · | · | · | ½ | · | · | ✕ | · | · | ½ | · |
| **Glut** | · | ½ | ½ | **2** | · | **2** | ½ | · | · | · | · | · | **2** | · |
| **Flut** | · | **2** | ½ | ½ | · | ½ | **2** | · | · | · | · | · | · | · |
| **Flor** | · | ½ | **2** | ½ | · | · | **2** | ½ | ½ | · | · | · | ½ | · |
| **Funke** | · | · | **2** | ½ | ½ | · | ✕ | **2** | · | · | · | · | **2** | · |
| **Frost** | · | ½ | ½ | **2** | · | ½ | · | **2** | · | · | · | · | ½ | · |
| **Fels** | · | **2** | · | ½ | **2** | **2** | · | **2** | · | · | · | · | ½ | · |
| **Wind** | · | · | · | **2** | ½ | · | ½ | · | **2** | · | · | · | ½ | · |
| **Gift** | · | · | · | **2** | · | · | ½ | · | ½ | ½ | **2** | · | ✕ | · |
| **Geist** | ✕ | · | · | · | · | · | · | · | · | **2** | · | ½ | · | **2** |
| **Licht** | · | ½ | · | · | · | · | · | · | · | **2** | ½ | **2** | ½ | · |
| **Schatten** | · | · | · | · | · | · | · | · | · | **2** | **2** | ½ | ½ | · |
| **Metall** | · | ½ | ½ | · | ½ | **2** | **2** | · | · | · | · | · | ½ | · |
| **Klang** | **2** | · | · | ½ | · | **2** | · | · | · | · | · | · | **2** | ½ |

### 5.2 Entwicklung
`evolves: [{ to, how, … }]` erlaubt mehrere Einträge, also verzweigte Entwicklungen. Arten von Bedingungen:
- `level`
- `item` (z. B. Resonanzkristall)
- `bond` (Bindung ≥ Wert, optional mit `time`)
- `place` (Kartenkennung)
- `time` (morgen/tag/abend/nacht)
- `quest` (Flag)
- `battle` (z. B. „3 Volltreffer in einem Kampf“)
- `choice` (Spieler wählt im Moment der Entwicklung)

Der Server prüft die Bedingung, der Client zeigt nur an. Nicht jede Art entwickelt sich (Beispiel: Kieselkrabbe).

### 5.3 Seltenheit
Stufen: gewöhnlich → ungewöhnlich → selten → episch → legendär → einzigartig.

Seltenheit bestimmt **Fundbedingungen und Fangrate**, nicht nur die Stärke. Beispiele:
- Die Laternmotte (episch) ist schwächer als manche seltene Art. Man bekommt sie aber nur über Bindung bei Nacht.
- „Einzigartig“ heißt: Es gibt pro Server genau ein Exemplar, etwa als Turnierpreis. Solche Exemplare sind nicht handelbar und werden nach einer Saison neu vergeben.

**Varianten:**
- **Schimmer:** Farbvariante, 1/2048.
- **Event-Varianten:** kosmetische Kleidung oder Muster.
- **Urzeit-Varianten:** aus Fossilien. Gleiche Art, altes Muster, eine andere Fähigkeit.
- **Boss-Varianten:** größer, mit Aura. Sie sind nur in Raids zu finden.

### 5.4 Langfristige Kreatursysteme (geplant, Meilenstein 5–8)
- **Zucht:** Zwei Exemplare derselben Eiergruppe. Vererbt werden 3 von 12 Anlagen und optional der Wesenszug über einen Gegenstand.
- **Seltene Merkmale:** z. B. „Sternmal“, kosmetisch und sehr selten vererbbar.
- **Training:** Trainingswerte über Kämpfe und Trainingsorte.
- **Spezialisierung:** ab Lv. 50 eine von zwei Rollen-Boni.
- **Kosmetik:** Halsbänder und Muster, ohne Einfluss auf Werte.
- **Balancing-Schutz:** Alle Boni sind gedeckelt. PvP-Ranglisten normieren auf Lv. 50.

## 6. Fangen und Sammeln

Fangchance pro Wurf (Formel serverseitig):

```
a = ((3·KPmax − 2·KPakt) · Fangrate · Kugelbonus) / (3·KPmax) · Statusbonus
Chance = a / 255   (bei ≥ 255 immer Erfolg)
```

- Statusbonus: Schlaf ×2, andere Zustände ×1,5.
- Kugel-Arten:
  - Bindkugel ×1
  - Feinkugel ×1,5
  - Nachtkugel ×3 nachts
  - Netzkugel ×3 gegen Flut/Flor
  - Echokugel: wächst mit der Rundenzahl
  - Meisterkristall: sicherer Fang, sehr selten
- Ein Timing-Wurf (Treffer im Ring) gibt ×1,25. Das Prinzip ist aus Legends United übernommen und hat sich bewährt.

Das **Bestiarium** hat drei Stufen:
1. gesehen
2. gefangen
3. **erforscht** (Forschungsaufgaben pro Art, z. B. „3 gefangen“, „nachts gesehen“, „entwickelt“)

Belohnungen gibt es pro 10 erforschte Arten und pro Region (Kosmetik, Titel, Komfort-Gegenstände).

## 7. Kampfsystem (Meilenstein 3)

- Rundenbasiert. Die Reihenfolge ergibt sich aus Priorität, dann Initiative, bei Gleichstand entscheidet der Zufall.
- Schaden:

```
Schaden = ((2·Lv/5 + 2) · Stärke · A/V / 50 + 2) · STAB · Element · Volltreffer(1,5) · Zufall(0,85–1)
```

- Stufen von −6 bis +6 auf Werte, Genauigkeit und Ausweichen.
- **Status:** Brand, Gift, Schlaf, Lähmung, Frost, Verwirrung.
- **Wetter:** Regen, Sonne, Sandsturm, Hagel, Äthernebel.
- **Feldeffekte:** Klangfeld, Dornenboden.
- **Fähigkeiten:** passiv, durch Hooks wie `onHit`, `onTurnEnd`, `onEnter`.

Die Kampf-Engine ist eine **reine Funktion** `step(state, actions, rng) → {state, log}` in `shared/battle/`:
- Der Server führt sie autoritativ aus.
- Der Client nutzt sie nur, um das Protokoll abzuspielen.
- Dadurch funktionieren PvE, PvP, Raids und Replays mit derselben Logik.

**Modi:**
- wild
- Trainer
- Arena
- Freundschaft
- Ranglisten (normiert Lv. 50, Elo/Glicko-2)
- Turnier (Schweizer System + K.-o.)
- Raid (bis 4 Spieler gegen einen Boss)
- Storykampf (Skript-Hooks)

**Strategische Tiefe:** Wechsel kosten den Zug. Statuskontrolle und Wetter-Teams sind möglich. Die Item-Nutzung im PvP ist begrenzt.

## 8. Quests

Quests sind Daten, kein Code: `shared/quests/*.js` (Meilenstein 5). Beispiel:

```js
{ id: 'velmar.brunnen', kind: 'neben', title: 'Der stille Brunnen', giver: 'npc.oma-hedda',
  requires: { flags: ['story.k1.start'] },
  steps: [ { do: 'talk', npc: 'npc.oma-hedda' },
           { do: 'catch', species: 3, count: 1 },
           { do: 'deliver', npc: 'npc.oma-hedda' } ],
  rewards: { exp: 120, items: { trank: 3 }, flags: ['velmar.brunnen.done'] },
  repeat: null }   // oder 'daily' | 'weekly'
```

- **Schritt-Typen:**
  - talk
  - catch
  - defeat
  - reach
  - collect
  - deliver
  - craft
  - battle
  - flag
  - group (mehrere Spieler)
- **Quest-Arten:**
  - Haupt
  - Neben
  - Tages
  - Wochen
  - Sammel
  - Erkundung
  - Trainer
  - Gruppe
  - wiederholbar
  - versteckt (ohne Eintrag im Log, bis sie entdeckt wird)
- Den Fortschritt zählt nur der Server, über Ereignisse wie `onCatch` oder `onDefeat`.

## 9. Arenen und Liga (Überblick, Details im World Design)

Acht Arenen auf zwei Kontinenten. Jede führt eine Mechanik ein:

| # | Ort | Element | Leiter*in | Lehrt | Arena-Rätsel |
|---|---|---|---|---|---|
| 1 | Funkenrast | Glut | Meisterin Brenna | Elementvorteil | Kohlelaufbänder |
| 2 | Kieselfurt | Fels | Bruno Kiel | Verteidigung und Stufen | Schiebesteine |
| 3 | Dornhain | Flor | Linnea Moos | Status (Schlaf/Gift) | Dornenlabyrinth mit Tageszeit |
| 4 | Brandungshafen | Flut | Kapitän Ysolde | Wetter (Regen) | Gezeiten heben und senken Stege |
| 5 | Sturmzinne | Funke/Wind | Zeno Volt | Initiative und Priorität | Blitzableiter umleiten |
| 6 | Frosthall | Frost | Aurel Weiss | Doppelkämpfe | Rutscheis |
| 7 | Echodom | Klang | Sera Hall | Feldeffekte | Tonfolgen-Türen |
| 8 | Nachtspitz | Geist/Schatten | Morwen | Wechsel-Strategie | Lichtschalter-Gänge |

Die **Elite-Liga** am Kronsee besteht aus 4 Mitgliedern (Metall, Gift, Licht, Wind) und dem Champion **Kael Ardent** (gemischtes Team mit Synergien). Rückkämpfe gibt es mit stärkeren Teams.

## 10. MMO-Systeme

- **Identität:** Account → bis zu 3 Charaktere. Jeder Charakter hat Name, Aussehen, Profil, Fortschritt, Inventar, Kreaturen, Statistiken, Erfolge, Freunde und Online-Status.
- **Echtzeit:** Karteninstanzen, sichtbare Spieler, autoritative Bewegung mit Vorhersage. Spieler kollidieren auf Routen miteinander, in Städten nicht (Treffpunkte bleiben frei). Emotes folgen.
- **Sozial:**
  - **umgesetzt:** Karten-, Welt- und Flüster-Chat
  - **Meilenstein 4:** Freunde, Blockieren, Gruppen bis 4, Gruppenchat, Spielersuche, Profile
  - **Meilenstein 7:** Gilden mit Rängen, Rechten, Logo-Baukasten, Missionen und Wettbewerben
- **Gruppen:** Koop-Begegnungen (2v1 wild), Raids (4v1), Gruppenquests.

## 11. Wirtschaft

- **Währungen:**
  - **Funken (₣):** Spielwährung, erspielbar.
  - **Sternsplitter:** nur aus Erfolgen und Events, für Kosmetik. **Kein Echtgeld-Kauf von Vorteilen.**
- **Quellen:** Trainerkämpfe, Quests, Verkauf an NPCs, Crafting.
- **Senken:** Heilung außerhalb der Zentren, Kugeln, Handelshausgebühr (5 %), Reparaturen, Kosmetik, Gildenhaus.
- **Handel:** direktes Handelsfenster (beide bestätigen, dann 3 s Sperre, dann erneut bestätigen) sowie Handelshaus (Festpreis und Auktion, 48 h, Gebühr).
- Alles läuft als serverseitige Transaktion (siehe TECHNICAL_ARCHITECTURE §6).
- **Wirtschaftsmonitoring:** tägliche Geldmenge, Inflation und Preisindex pro Gut im Admin-Panel.

## 12. Berufe und Crafting (Meilenstein 8)

| Beruf | Sammelt / stellt her | Beispiel |
|---|---|---|
| Kräuterkunde | Kräuter auf Routen (respawnen pro Spieler) | Heilkraut → Trank |
| Bergbau | Erzadern in Höhlen | Ätherquarz → Bindkugel-Gehäuse |
| Alchemie | Tränke, Statusheiler | Funkenwasser |
| Kochen | Bindungs-Snacks (Bindung +) | Beerenküchlein |
| Handwerk | Bindkugeln, Möbel | Feinkugel |
| Forschung | Bestiarium-Boni, Fossilien beleben | Urzeit-Variante |

- Qualitätsstufen 1–5
- Herstellzeit in Sekunden, nicht Stunden
- seltene Rezepte als Quest- oder Bossbeute
- Berufsstufe 1–50
- Spezialisierung ab Stufe 25

## 13. Endgame

- Ranglisten-Saisons (8 Wochen) mit kosmetischen Belohnungen und Titeln
- Wochen-Turniere
- Weltbosse (serverweite KP-Leiste, Event-getaktet)
- Raids mit Boss-Varianten
- Tiefen-Dungeon (zufällige Etagen, Bestenliste)
- Legendäre Quests (eine pro Region, mehrteilig)
- Forschungsgrade im Bestiarium
- Gildenwettbewerbe
- Erfolge (über 300 geplant)
- Rückkämpfe gegen die Liga

**Keine** künstlichen Energie-Timer.

## 14. Events

Ein Event ist ein Datensatz mit Zeitfenster, Region und Effekten. Der Server lädt aktive Events minütlich. Beispiel:

```js
{ id: 'herbstlichter-2027', from: '2027-10-20', to: '2027-11-03', scope: { region: 'velmar' },
  effects: [ { kind: 'spawnBoost', species: 7, factor: 3, time: ['nacht'] },
             { kind: 'quest', id: 'event.laternen' },
             { kind: 'variant', species: 8, variant: 'herbst' } ] }
```

- **Effekt-Arten:**
  - spawnBoost
  - spawnAdd
  - variant
  - expBoost
  - quest
  - boss
  - shopItem
  - mapDecor
- Neue Events brauchen **keinen** Code, nur Daten über das Admin-Panel.

## 15. Monetarisierung und Fairness

Zunächst keine. Später allenfalls freiwillige Unterstützung mit rein kosmetischem Dank. Pay-to-Win ist ausgeschlossen. Das ist auch ein Schutz vor Händler-Bots: Echtgeld-Handel ist verboten, Spielwährung lässt sich nicht kaufen.

## 16. Definition of Done (für jedes System)

1. Die Spezifikation steht hier oder im Systemdokument.
2. Der Code ist modular, die Regeln liegen in `shared/` (wenn reine Logik) oder `server/`.
3. Unit-Tests sind grün, und **mindestens ein Integrationstest** prüft das System über den echten Server.
4. Falls sichtbar: Der Browser-E2E-Test (`tools/e2e.cjs`) läuft fehlerfrei, und ein Screenshot wurde geprüft.
5. Sicherheitsfälle (manipulierte Eingaben, Parallelität) sind getestet.
6. CHANGELOG, Roadmap und betroffene Dokumente sind aktualisiert.
7. Commit und Push sind erfolgt.
