---
name: legends-dev
description: Landkarte, Rezepte und Stolperfallen für Legends United (legends/). Laden vor jeder Änderung am Kreaturen-RPG – Karten, Kreaturen, Trainer, Story, Kämpfe, Musik, Grafik, Online/Server, Tests, Veröffentlichung.
---

# Legends United – Entwickler-Spickzettel

Vanilla-JS-ES-Module, Canvas 2D, 240×160 logische Pixel. Es gibt keinen Build-Schritt und keine Assets: Grafik und Ton sind prozedural. Der Server (`legends/server/server.js`) ist Node + ws und importiert die Kampflogik des Clients.

## Wo steht was (nur gezielt lesen!)
| Datei | Inhalt |
|---|---|
| `js/gb/engine.js` | Szenen-Stapel (`push/pop/top`) und Eingabe (`input.pressed/held/dir`). `fade(to,ms)`, `wipe(ms)`, `wait`. `SCALE` (dynamisch), `snap()` für Subpixel. |
| `js/gb/game.js` | Klasse Game (`window.LU2`): Zustand, Speichern, Menüs, alle Gespräche (`talk` switch), `story()` nach Trainersiegen, `blockEdge/blockMove` (Sperren), `onMapLoad` (Ereignisse), `GYMS`, `LIGA`, `QUESTS`, Raids, Ruhmeshalle. |
| `js/gb/maps.js` | `MAPS` (Kachelzeilen), `TILE`/`SOLID`, `LOOK` (Figurenfarben), `ENC` (Begegnungen), `SHOP`, `ITEMS`. |
| `js/gb/overworld.js` | Bewegung (`tryMove`, `stepMove`, Übertrag), `arrive` (Warps, Eis, Platten, Begegnungen), `draw` (Kacheln, Übergänge, Schatten, Kronen, Licht, Wetter). |
| `js/gb/pixel.js` | Kachel-Maler `DRAW.<name>`, `noiseFill`, `shadedBlob`, `tallTree`, `building()`, Figuren (`drawChar`), Atmosphäre (`grassFringe`, `shore`, `softShadow`, `cloudShadow`, `glow`). |
| `js/gb/monart.js`, `sprites.js` | Kreaturenbilder aus `model {kind, main, accent, glow, size, extras}`; `monSprite(sp, view)`. |
| `js/gb/battle2d.js` | Einzelkampf-Szene: Intro (Plattformen, `throwCrystal`, `appear`), `recall`, `showBox/hideBox`, `animMove` nach `fx`, weiches Ende. |
| `js/gb/battlebg.js` | Kampfhintergründe `bgArt(key, cols)` und Plattformen `platArt` (gecacht, für beide Kampfszenen). |
| `js/gb/double2d.js` | Doppel- und Raid-Szene (`p0..p3` gegen `f0/f1`, Boss). |
| `js/battle/battle.js`, `double.js` | Reine Kampflogik (läuft auch auf dem Server). |
| `js/gb/gbui.js` | `say(text\|[...], {name})`, `choose(opts,{title})`, `ask(q)`, `party(state,{select,filter})`, `inputName`, `dexEntry(sp,n)`, `healAnim(n)`. |
| `js/data/creatures*.js` | Arten per `C(id, num, name, types, rarity, stats[6], catchRate, xp, 'lvl:move …', evo\|null, lore, model, cry, {legendary})`. Neue Datei in `creatures2.js` importieren und in `sw.js` eintragen. |
| `js/data/coop.js` | `COOP` (Duo-, Boss- und Raid-Gegner), `HELPERS` (Kian/Lyra/Nyx), `foeSlots`, `helperSlots`. |
| `js/core/audio.js`, `music.js` | `sfx(name)`, `cry`, `setMusic(track)`. `TRACKS` = 8 Takte mit Akkorden und Melodienotation (`C5 - . …`). |
| `js/gb/online.js`, `server/server.js` | Welten, Duell, Tausch, Koop (`beginCoop` mit 2–4 Mitgliedern), Raid-Lobby, KI-Übernahme bei Verbindungsabbruch. |
| `tools/` | `checkmaps.mjs`, `balance.mjs`, `e2e/run.cjs` + `e2e/lib.cjs`. |
| `app/` | Capacitor-Android: `res/` (Icons, Splash, Vollbild-Style), `debug.keystore`. |

## Rezepte
**Neue Karte**
1. In `MAPS` vor `home:` einfügen: `{ name, outdoor|indoor|cave, enc, bg, rows:[…], edges:{n:{to,dx}}, warps:[{x,y,to,tx,ty,dir}], buildings:[{x,y,w,h,door,roof,to,sign,heal}], npcs:[…], items:[{id,x,y,item,n}], plates, gates, boulders, music, night, dark }`.
2. Auf der Gegenseite den Rückweg anlegen: Kante bzw. Warp.
3. `node tools/checkmaps.mjs` muss **0 Fehler** melden.
- Warp-Kachel `O` nie auf den Kartenrand legen (der Prüfer hält sie für eine Kante) und nicht auf Fundstücke oder in Gebäude.

**Trainer**
- NPC `{ id, x, y, dir, look: LOOK.x, name, trainer: { team: [[sp, lv]], reward, sight, lines: [...], lose } }`. Optional `hideIf/showIf: 'flag'`.
- Ein Sieg setzt `flags[id]` und ruft danach `story()` auf; dort Folgeereignisse per `ow.id`- und Flag-Prüfung.

**VM-Hindernis:** In Kartenzeilen `$` (Busch, VM01) oder `&` (rissiger Fels, VM02) setzen. Beide sind fest (SOLID) und wachsen beim Neubetreten nach. Dahinter ein Fundstück legen; `checkmaps` meldet es nur als Hinweis.

**Typ-Fähigkeit:** In `game.fieldOptions` die Tabelle `AB` (`typ: [Name, art]`) erweitern und in `game.ability` einen `case art` ergänzen.

**Gespräch:** In `talk()` `case 'id': return say([...], N);`. Sonderfälle kommen als Methode in die Klasse.

**Sperre:** `blockEdge(map, to)` für Kartenränder, `blockMove(map, x, y)` für einzelne Felder (z. B. Höhleneingang). `true` heißt blockiert; dabei `this.ow.busy` setzen bzw. zurücksetzen.

**Neue Kreatur**
1. Mit `C(...)` in `creatures11.js` oder einer neuen Datei anlegen. Nummern lückenlos weiterführen (zurzeit 150).
2. Ins passende `ENC.<tabelle>.list` als `[sp, gewicht, minLv, maxLv, 'day'|'night'?]` eintragen.
3. Bild prüfen: Galerie mit `monSprite(id,'front')` rendern (siehe e2e `lib.cjs`, eigenes Mini-Skript).

**Arena / Liga:** `GYMS[npcId]` bzw. `LIGA[npcId]` (`team`, `intro`, `lose`, `gift`/`after`). Die Liga setzt beim Betreten von `liga` ihre Flags zurück.

**Raid:** Eintrag in `COOP` mit `raid: true, boss: { sp, lvl, hp: KP-Multiplikator, acts }`. NPC-ID = Schlüssel. In `talk` `raidNpc(id)` aufrufen.

**Musik:** Stück in `TRACKS` (`bpm`, `lead`, `bass`, `arp`, `drums`, `chords`, `melody`). Zuordnung: Karten in `overworld.music()` (oder Kartenfeld `music`), Kämpfe über das Feld `music` (`trainerFight` setzt boss/finale per Name).

**Grafik:** Kacheln in `DRAW` sind 16×16 und werden gecacht; sie wirken mit `noiseFill`/`shadedBlob` hochwertig. Atmosphäre gehört in `overworld.draw` und wird **vorgezeichnet bzw. gecacht** (siehe `lightLayer`). Gradienten nicht pro Frame erzeugen.

## Balancing (schnell und günstig)
- Kein Durchspielen im Browser. Stattdessen ein Node-Skript mit `Battle`/`DoubleBattle` und KI auf beiden Seiten, 200–300 Läufe.
- Aussagekräftiger Bot: beste Attacke nach Effektivität × STAB, beim K.O. die beste Typwahl einwechseln.
- Referenz: dieser Bot schlägt Vala auf Lv 52 zu 68 %. Bosse auf etwa 50–80 % für das erwartete Level einstellen.
- Raids: allein mit 3 Helfern 60–90 %, mit 4 Menschen fast 100 %. Werte: Chronoth hp12/acts4/Lv72 … Nihilux hp4/acts3/Lv72.

## Testen
- `node tools/e2e/run.cjs all` prüft Neues Spiel, Laufruhe (Pixel pro Frame konstant), Trainerkampf (Lebensanzeigen nach Wechsel) und Offline-Start.
- `run.cjs world` erzeugt einen Kontaktbogen der Gebiete. Die Bilder selbst ansehen, bevor du sie dem Nutzer schickst.
- Für Sonderfälle `lib.cjs` nutzen:
  - `start({map,x,y,team,flags,badges,bag,time,noEnc,strong})`
  - `moves([...])` für exakte Schritte, `until()` drückt A bis zur freien Steuerung
  - `battle()` liefert den Kampfzustand, dazu `put`, `flags`, `shot`
- Tests nur mit A-Drücken verlieren gegen schwere Bosse, dann `strong: true` und hohe Level nutzen. Lange Raids (~10 min) im Hintergrund laufen lassen.

## Stolperfallen (schon einmal passiert)
- `sw.js`: `CACHE` erhöhen und neue Dateien in `FILES` aufnehmen, sonst bekommen iPhones kein Update bzw. es fehlt offline etwas.
- Pfade in `fonts/fonts.css` sind relativ zu `fonts/`. Der Server braucht MIME `.woff2`.
- `setMusic` vor `initAudio` hat keine Wirkung (Titel startet deshalb nach dem Freischalten neu). Auf dem iPhone gelten `navigator.audioSession.type='playback'` und Resume bei Sichtbarkeit bzw. Touch.
- Namensfeld: nach Eingabe `blur()`, sonst bleibt die PC-Tastatur tot.
- Kampf-Lebensanzeige: Nach K.O. wird sie per `hideBox` ausgeblendet und muss bei `send` mit `showBox` zurückkommen.
- Kampfende: Die Szene blendet selbst ab und wieder auf, außer bei Niederlage offline (Blackout übernimmt).
- `fade()` löst eine noch laufende Blende sofort auf. Vorher hing `afterBattle` für immer, wenn zwei Blenden sich überlagerten: keine Trainer-Flags, keine Story, keine Raid-Belohnung. Immer prüfen, dass `trainerFight` wirklich `true` liefert (e2e `battle`).
- Online-Koop: Server-Ereignisse müssen 1:1 zu Client-Aktionen passen. Zusatzmeldungen in `co.pend` legen, nie separat senden.
- `onMapLoad`-Ereignisse erst nach `await wait(450)` auf `busy` setzen (Warp setzt busy am Ende zurück).
- Android: Signatur explizit in Gradle setzen (der Workflow prüft SHA256), sonst verlieren Updates den Spielstand.
- `page.evaluate` nie auf Menü- oder Kampf-Promises warten lassen (z. B. `LU2.startMenu()` in `{ }` ohne return), sonst hängt der Test.
- Figuren sind 16×24 und werden bei `y - 9` gezeichnet. Namensschilder und „!“ liegen deshalb höher.
- Sichthöhe: Szenen mit `tall = true` (nur Oberwelt) zeichnen mit `VH`. Alles andere zeichnet weiter mit `H` = 160 und wird von der Engine versetzt (Overlays unten, Vollbild mittig). In der Oberwelt nie `H` verwenden.
- Spielstand-Tests: `LU2.newState(name, look)` braucht ein vollständiges `look`, sonst Fehler in `shade()`.
