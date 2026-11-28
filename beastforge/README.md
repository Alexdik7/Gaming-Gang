# BEASTFORGE – Shinobi Creature Defense

3D-Anime-Tower-Defense mit eigener IP: mystische Kreaturen, Shinobi, Elemente, Evolutionen und drei getrennte Fortschrittssysteme.
Läuft im Browser und als iPhone-Web-App („Zum Home-Bildschirm“). Alles (Modelle, Effekte, Musik, Klänge) wird im Spiel erzeugt – keine Fremd-Assets.

**Spielen:** https://alexdik7.github.io/Gaming-Gang/beastforge/ · Dev-Menü: `…/beastforge/?dev`

## Stand: v0.52.0 – Mega-Fusionen (Vision P11 Teil 3)
**0.52:** Fusionen können jetzt Mega werden: `megaDef` kennt Fusionen (`fusion: true`, eigene Namen `FUSE_NAMES` + Art, z. B. „Ur-Hydra · Zorn“), `ALL_MEGAS` = 48 + 36 (Codex-Reiter Mega zählt mit), `world.megaInfo` nimmt für Fusionen `BAL.run.megaFuse` (Kosten Fusionspreis × 7, 150 Besiegte, Charakter-Lv 25), `stats.js` gibt Mega-Fusionen zusätzlich ×1,3 Schaden, +0,25 Reichweite, +1 Durchschlag, ×1,15 Boss. Banner „✦ MEGA-FUSION“, Fenster-Unterzeile „Mega-Fusion · Art“.

## Stand davor: v0.51.0 – Prüfungsturm (Vision P11 Teil 2)
**0.51:** `data/tower.js`: `FLOORS` (10 Etagen mit Karte, Schwierigkeit, Wellenzahl `mods.waves` und Regeln aus vorhandenen Mods, Etage 10 = Boss-Rush), offen ab Konto-Lv `TOWER_LVL` 15 und nur der Reihe nach (`floorOpen`), Sieg → `clearFloor` (`P.tower.best`), Truhe je neuer Etage, alle 5 Etagen +1 Shinobi-Punkt (in `shinobiPoints`). Welt: `mods.waves` kürzt `maxWave`. Run-Kennung `ch = 'tower_<n>'`. Bildschirm `s_tower` (Hub-Kachel 🗼 Turm), Ergebnis-Zeile. Fix: Bonus-Kräfte aus Truhen nutzen den eigenen Zufall `rr` (Test war wackelig).

## Stand davor: v0.50.0 – Truhen-Seltenheiten (Vision P10 Teil 2)
**0.50:** `data/events.js`: `RARITY` (Gewöhnlich 58 %, Selten 27 %, Episch 11 %, Legendär 3,4 %, Mythisch 0,6 %), `rollRarity(x)`, `openChest(P, r, rr)` würfelt die Seltenheit getrennt (Typ-Wahl unverändert): mehr Kräfte/XP, ab Episch Bonus-Kräfte (`extra`), ab Legendär Shinobi-Punkte `P.chestSp` (zählt in `shinobiPoints`). Anzeige: Seltenheits-Schriftzug, Truhe/Leuchten in Seltenheitsfarbe, gleiche Kräfte als „×N“.

## Stand davor: v0.49.0 – Koop-Extras (Vision P12)
**0.49:** **Seelenband** in `world.refresh`: Kreaturen verschiedener Spieler im Abstand `BAL.coop.linkR` (2,2) → je +10 % Schaden, +6 % Tempo (nicht stapelnd), `world.coopLinks`, Ereignis `coopLink` (Hinweis beim ersten Mal), Funken in beiden Spielerfarben (view). **Spieler-Leiste** `#hMateBox`: Porträt des Mitspieler-Helden, Rolle, Geld `#hMate`, Kreaturen-Anzahl `#hMateN`, Status-Punkt (grau = getrennt). e2e `coop` prüft Seelenband + Leiste.

## Stand davor: v0.48.0 – Boss-Rush (Vision P11 Teil 1)
**0.48:** Herausforderung `rush` in `data/challenges.js` (frei nach Sieg auf Schwer, `endgame: true` → nicht im Tageskampf): `RUSH` in `data/waves.js` = 6 Bosswellen (Vharox, Hyōga, Fūjin, dann die Erwacht-Stufen) mit Gefolge; `world.waveDef(n)` nimmt im Rush `rushDef`, Karten-`mix` ist aus. `BAL.rush`: Start-Kasse 7500, 100 Leben, Boss-KP ×0,65, Kriegskasse nach jedem Boss (Ereignis `rushGold` → Banner + Münzflug). Rekord `P.stats.bestRush`. Balance-Bot: `RUSH=1 node tools/balance.mjs hard 30 4` (Lv 30 gewinnt, Lv 15 nicht).

## Stand davor: v0.47.0 – Akademie 2.0 (Vision P9)
**0.47:** `data/academy.js` erweitert: **Meisterprüfung** je Schule (`TRIALS`, offen ab Stufe `TRIAL_NEED` = 4; Start über `startRun(map, diff, 'trial_<schule>')`, `game.ch` → `TRIAL[ch].mods`), neue Regeln in der Welt `mods.physWeak` (Physisch −60 %), `lifeCap` (feste Leben), `noSell`. Sieg → `passTrial` = Siegel `P.academy.master[schule]` (+`TRIAL_SP` 2 Shinobi-Punkte, Truhe, bleibt beim Neuverteilen). **Spezialisierungen** `SPECS` (2 je Schule, eine aktiv `P.academy.spec[schule]`, `SPEC_COST` 2, Wechsel kostenlos) mit neuen Welt-Boni `critMul`, `chain`, `bounty`, `heroDmg`. **Geheime Knoten** `SECRETS` (als „?“ mit Hinweis, enthüllt durch Combo ×50, 40 Codex-Einträge, Mega-Form, 5 Boss-Unterbrechungen `P.stats.staggers`), Bonus `comboWin`. Bildschirm `s_academy`: Raute = Prüfung, Quadrate = Spezialisierungen, Reihe „✧ Geheime Knoten“.

## Stand davor: v0.46.0 – Bosse 2.0 (Vision P8)
**0.46:** Boss-Atem mit Vorwarnung: `updBoss` wählt Ziele, setzt `e.teleT = BAL.boss.tele` (1,6 s) und `e.teleIds`, Ereignis `bossTele` (rote, sich zusammenziehende Zielkreise unter den Kreaturen, Warnlinien, „◎ SCHWACHPUNKT!“, Hinweis beim ersten Mal); erst danach `breath`. Schwachpunkt: während `teleT` +60 % Schaden (`weakMul`); erreicht der Schaden `breakPct` (3,5 %) der Max-KP → Angriff abgebrochen, Boss taumelt `stagger` s (`bossStagger`: „💥 UNTERBROCHEN!“, Zeitlupe, Klang). Phasenwechsel: Verdunkelung, rote Säule, Bodenriss-Funken, „PHASE N“. Gilt für alle 9 Boss-Varianten.

## Stand davor: v0.45.0 – Elemente 2.0 (Vision P7)
**0.45:** 6 neue Reaktionen in `data/meta.js` (Höllenbrand fire+shadow, Reinigung light+spirit, Verderbnis astral+shadow, Seelenfrost ice+spirit, Sonnenglut fire+light, Sternfall astral+light) – jetzt 16, alle mit Symbol `icon`. Neue Wirkungen in `world.react`: `vuln` (Verwundbarkeit), `strip` (Schild/Wache brechen). **Kettenreaktion:** weitere Reaktion auf demselben Gegner innerhalb `BAL.elem.chainWin` (2,5 s) → `e.chainN`, +25 % je Glied (`chainMul`), Anzeige „CHAIN REACTION ×N“ mit Ring und kleinem Ruck, Statistik `chains`. Codex zählt die neuen Reaktionen automatisch mit.

## Stand davor: v0.44.0 – Ergebnis „Noch ein Run“ (Vision P10)
**0.44:** Ergebnis-Bildschirm: „🏅 NEUER REKORD“ (höchste Welle je Karte/Modus, beste Combo, meiste Kills, meiste Münzen; Stand vor dem Run in `game.rec0`, neu `P.stats.bestKills`/`bestCoins`), Abschnitt „🎯 Nächste Ziele“ (`menus.goals`: Konto-Level, nächste Form einer eingesetzten Kreatur, Codex-Truhe, Wochen-Event-Stufe) mit animierten Balken, Hauptknopf „▶ NOCH EIN RUN“ (pulsiert). Combo-Anzeige verschwindet bei Spielende.

## Stand davor: v0.43.0 – Mega-Formen (Vision P6)
**0.43:** `js/data/megas.js`: je Kreatur 3 Mega-Formen (A Zorn = Pfad 1, B Bann = Pfad 2, C Klinge = Pfad 3; eigene Namen für Kitsune/Tiger/Schildkröte/Phönix/Kirin, sonst „Mega-<Stufe-5-Name>“) = 48. `world.megaInfo(t)`/`mega(id)` (Befehl in `CMDS`): Stufe 5 auf einem Pfad + `BAL.run.mega.kills` (100) Besiegte im Run + Charakter-Lv 20, Kosten Kaufpreis × 14; schließt Ahnenform aus. Werte in `stats.baseStats` (`t.mega`). Optik: leuchtender Riesen-Geist der Kreatur in Pfadfarbe hinter ihr (`view.makeTower` → `spirit`, schlägt beim Angriff mit aus). Mega-Moment (`view.handle('mega')` + `game.react`): Zeitlupe, Dunkel, Energie strömt ein, Lichtsäule, Aura-Ringe, Name, Banner, Klangfolge. Upgrade-Fenster zeigt Mega-Knopf mit Fortschritt (☠ x/100). Codex-Reiter „Mega-Formen“.

## Stand davor: v0.42.0 – Beastforge-Codex (Vision P5)
**0.42:** `js/data/codex.js`: 87 Einträge (Kreaturen, Fusionen, Helden, Gegner, Bosse, Reaktionen, Synergien), Profil `P.codex = { seen, claimed }`, `discover`, alle 10 Entdeckungen 1 Truhe (`claimCodex`). Im Run entdeckt `game.found(key)` (Setzen, Kill, Boss-Kill, Reaktion, Synergie, Fusion) mit Hinweis „📖 Neu im Codex“. Bildschirm `menus.s_codex` (Hub-Kachel „Codex“ statt „Statistik“, Statistik als Knopf im Codex): Fortschritt, Reiter mit Zählern, Unentdecktes als schwarze Silhouette mit „???“ bzw. „??? + ???“, Reaktionen zeigen ihre Element-Farben als Hinweis.

## Stand davor: v0.41.0 – Upgrade-Fenster: „Was du bekommst“ (Vision P4)
**0.41:** Jeder Upgrade-Knopf zeigt bis zu 3 Wert-Chips (`hud.gains`: Schaden alt→neu, Tempo %, Reichweite, Durchschlag, Geschosse, Kette, Krit, Brand, Verlangsamung, Betäubung, Fläche, Einkommen, Panzer ignorieren, Getarnte/Fliegende, gegen Bosse; Vergleich `baseStats` mit aktuellen vs. nächsten Stufen). Kauf-Moment `hud.upFx`: Knopf springt, Ring in Pfadfarbe an der Kreatur, Münze fliegt vom Zähler zur Kreatur; zu wenig Geld = Knopf wackelt. Porträt im Fenster größer.

## Stand davor: v0.40.0 – Audio 2.0 (Vision P3)
**0.40:** Klangsignatur je Kreatur als leise Schicht über dem Angriffsklang (`audio.voice(cid, stufe)`, Tabelle `VOICE`: Kitsune Glöckchen, Tiger Donner-Wumms, Schildkröte Blubb, Kirin Glockenspiel, Mantis Klingen-Shing, Golem Felsschlag …; Fusion = Körper, höher je Stufe, gedrosselt). Prioritäten: `audio.admit` mit abklingender Last – bei Klangflut fallen Treffer/Plopp/Münze (`LOWPRIO`) weg, Boss/Ultimate/Entwicklung bleiben.

## Stand davor: v0.39.0 – Kampfgefühl Teil 2 + HUD-Juice + Combo (Vision P1/P2)
**0.39:** Geschoss-Spuren mit Pfad-Identität (`Projectiles.sync(…, fxOf)`: Pfad 1 Glut fällt, Pfad 2 Geist steigt, Pfad 3 Schattenrauch, Kreuzpfad-Akzent). Kill-Feedback: aufsteigende Seele, Elite = goldener Kranz + „★ ELITE“ + Treffer-Stopp (`game.react` → `slow`). `js/ui/anim.js` (Easings, `punch`, `shake`, `ring`, `flyTo` über Web Animations API). HUD: Münzen fliegen vom Gegner zum Zähler (gedrosselt, nur eigenes Geld), Zähler-Punch, roter Rand `#vig` + Herz-Wackeln bei Leck, Ring wenn Fähigkeit/Ultimate bereit wird, Wellenbonus-Münzregen. **Combo** in der Simulation (`world.comboHit/comboEnd`, `BAL.combo`: Fenster 1,4 s, Stufen ×10/25/50/100/200 → Münzen für jeden Spieler + Fähigkeiten-Abklingzeit −1…4 s), Anzeige `#combo` (Farbe/Größe je Stufe), Ergebnis „Beste Combo“, Statistik `bestCombo`. Fix: große Schadenszahl nutzte die Knopf-Klasse `.big` → `.fbig`.

## Stand davor: v0.38.0 – Kampfgefühl, Teil 1 (Vision P1, siehe docs/VISION.md)
**0.38:** `js/render/attackfx.js` (`AFX` je Kreatur: Grund-/Pfadfarben, Art der Energie-Sammlung `gather` flame/spark/swirl/dust/glint/leaf/smoke/star, Signatur `sig` foxfire/thunder/splash/quake; `afxFor(t)` mischt Farbe nach dominantem Pfad, zweiter Pfad = Akzent). `view.charge(v,t,dt)` liest `t.cd`: kurz vor dem Schuss Ladekugel am Maul, einströmende Partikel, Ausholen/Ducken + Zittern in `atkPose`; `view.release` beim Auslösen (Blitz, Funkenfächer, Signatur). Einschlag-Effekte je Element in `handle('hit')` mit Budget `fxBudget` je Bild; im Massenmodus/Qualität 0 reduziert. Simulation unverändert.

## Stand davor: v0.37.2 – Koop: jeder mit eigenem Helden
**0.37.2:** `world.heroIds[spieler]` (Option `heroes`, Solo `[hero]`), `isHeroId(cid)`; im Koop darf jeder nur seinen eigenen Helden setzen („Das ist der Held deines Mitspielers“, „Nur ein Held pro Spieler“), Startlevel je Spieler über `hooks.heroStart(cid, who)` / `setup.heroStarts`, Wellen- und Schadens-XP für alle Helden, Rang-XP nur für den eigenen (`hooks.heroXp(amt, t)`). Gast schickt Held + Startlevel im `hello`, Lobby zeigt beide Helden (`.cpheroes`).

## Stand davor: v0.37.1 – Koop: freies Spiel nach dem Sieg
**0.37.1:** Neuer Welt-Befehl `world.freeplay()` (in `CMDS`). Nach dem Sieg fragt nur der Gastgeber (`askFree`); „Weiterspielen“ läuft über `game.cmd('freeplay')`, der Gast übernimmt ihn in `guestStep` (Befehle werden jetzt auch angewendet, wenn die Welt gerade vorbei ist) und verbucht seinen Sieg mit `finish(true)`. „Abschließen“ schickt `{fin:1}` → Gast beendet ebenfalls. Bis dahin zeigt der Gast „Der Gastgeber entscheidet …“. Test „Koop: freies Spiel nach dem Sieg bleibt synchron“.

## Stand davor: v0.37.0 – Koop: eigenes Geld, klare Besitzer
**0.37:** Geldbörsen `world.wallet[spieler]` (Solo 1, Koop 2), `world.coins` ist jetzt Getter/Setter auf `wallet[world.who]`; `who` = wer gerade einen Befehl ausführt (Gastgeber 0, Mitspieler 1; Befehls-Log trägt den Spieler mit). Die Simulation liest `who` nie: `gain(c, owner)` schreibt Kill-Geld, Kopfgeld, Glücks- und Goldregen-Münzen, Einkommen und Zinsen dem Besitzer der Kreatur gut, Wellenbonus bekommt jeder voll, Geld ohne Besitzer wird geteilt. Kreatur `t.owner`; `world.mine(t)` sperrt Upgrade/Verkauf/Erwecken/Ahnenform/Fusion/Ziel/Fähigkeit für fremde Kreaturen. Anzeige: farbiger Besitzer-Ring (`OWNER_COL` blau/orange), Mitspieler-Geld in der Koop-Pille (`#hMate`), eigenes Geld farbig umrandet, fremdes Panel „nur ansehen“ (`#panel.foreign`). Prüfsumme nutzt alle Börsen. Dazu (0.36.3) Verbindungsfortschritt mit Abbrechen und **🩺 Verbindungstest** (`diagnose()`: Vermittler, WebRTC, STUN, TURN).

## Stand davor: v0.36.2 – Koop-Verbindung robuster
**0.36.2:** Gastgeber-Raum überlebt den App-Wechsel auf dem iPhone (Code per WhatsApp teilen): `PeerTransport.heal()` stellt die Vermittler-Verbindung bei Rückkehr (`visibilitychange`) und alle 4 s wieder her, legt den Raum notfalls mit demselben Code neu an; Statusanzeige `#cpStat`, Knopf „Code teilen“ (`navigator.share`). Mitspieler versucht 3× beizutreten. Mehr STUN-Server + PeerJS-TURN ausdrücklich gesetzt (`opts()`), verständliche Fehler `explain(e)` je PeerJS-Fehlertyp; belegter Code → automatisch neuer Code.

## Stand davor: v0.36.1 – Update-Fix
**0.36.1:** iPhone zeigte nach dem Merge weiter die alte Version: sw.js lieferte zuerst aus dem Cache, und beim Installieren konnte der Browser-Puffer alte Dateien in den neuen Cache legen. Jetzt: Code/HTML/CSS zuerst aus dem Netz (offline aus dem Cache), Modelle/Bilder zuerst aus dem Cache, Install mit `cache: 'reload'`, `reg.update()` beim Start und beim Zurückkehren in die App, bei neuer Version einmal automatisch neu laden (nur im Menü).

## Stand davor: v0.36.0 – Koop zu zweit
**0.36:** `js/net.js` (Transport aus Cats TD: PeerJS `lib/peerjs.min.js`, Test `?net=local` über BroadcastChannel; Raumcode `BF-1234`). **Lockstep:** beide Geräte rechnen dieselbe Welt (Seed, fester Schritt, `world.tickN`). Alle Welt-Änderungen laufen über `game.cmd(name, …args)` (`CMDS` in net.js); der Gastgeber führt sie aus und verschickt `{n, cmds:[[tick, name, args]], p, h}`, der Gast rechnet in `game.guestStep()` bis zur Schrittzahl des Gastgebers nach und wendet Befehle vor dem passenden Schritt an. Prüfsumme `worldHash` alle 120 Schritte → Warnung „Koop asynchron“. Gemeinsame Startwerte `menus.coopSetup` (Team = beide Freischaltungen, Kreaturen-Stufe = jeweils die höhere, feste Tabelle statt Live-Level, Akademie/Held vom Gastgeber). Gemeinsame Münzen und Leben, Tempo und Pause beim Gastgeber, kein freies Spiel, Verlassen → `game.mateLeft`. Bildschirm `menus.s_coop` (Hub-Kachel „Koop“), HUD-Pille `.pill.coop`. Tests: Unit „Koop-Lockstep“, e2e `coop` (zwei Seiten).

## Stand davor: v0.35.0 – Truhen, Wochen-Event, Kosmetik
**0.35:** `js/data/events.js`: Truhen `P.chests` (Sieg +1, Tageskampf +1, Event-Stufen 1/2/3; Start 1), `openChest` (40 % fehlende Kosmetik, sonst 2 Kräfte oder 300 Konto-XP). Wochen-Event je Kalenderwoche ab Montag (`weekKey`, `ensureEvent` beim Run-Start, Fortschritt = Statistik seit Wochenbeginn, `claimEvent`), 6 Events rotieren. Kosmetik `P.cos` (`COSMETICS.heart` Herzkristall-Farbe, `COSMETICS.pop` Plopp-Farben) → `GameView` opts `heart`/`pop` (`view.popCols`). Bildschirm `menus.s_chests` (Hub-Kachel „Truhen“, Truhe mit Wackel- und Öffnen-Animation), Ergebnis zeigt „+N Truhe“.

## Stand davor: v0.34.0 – Lebendige Karten
**0.34:** `js/render/ambient.js`: Wind-Wiegen für Bäume und Grasbüschel per Shader (`addSway(mat, amp, speed)`, gemeinsame Uhr `WIND`), Klasse `Ambient` (in `view.amb`): Schmetterlinge, kreisende Vögel mit Schatten am Kartenrand, springende Fische mit Spritzern im Wasser, flackernde Laternen. Glutkrater ohne Falter/Fische/Vögel, Frosttempel ohne Falter. Qualität 0 = aus.

## Stand davor: v0.33.0 – Kräfte und Sofort-Kreaturen
**0.33:** Verbrauchs-Kräfte (`js/data/powers.js`, Vorrat `P.powers`, Start `START_POWERS`): Seelenbombe (Ziel antippen, `BAL.power.bomb/bombWave/bombR`), Zeitstopp, Kampfrausch (Buff `rage`), Münzregen, Lebensquelle sowie Sofort-Kreaturen (Kitsune 3-0-2, Schildkröte 2-3-0, Donnertiger 0-3-2: `world.place(cid, x, y, { free, tiers })`, auch außerhalb des Teams). Simulation `world.usePower(id, x, y)` mit Abklingzeit `BAL.power.cd`, Ereignis `power` (Effekte in view.js, Banner in hud.js). HUD: ⚡-Knopf `#bPow` mit Zähler, Leiste `#powbar` (`hud.updPowers`), Zielmodus `game.aiming`, Sofort-Platzieren `game.placePow`. Nachschub: Rundenende `runPowerReward` (1 je 10 Wellen, max 4, +1 Sieg, +1 Schwer/Meister) → Ergebnis „Neue Kräfte“, jede abgeholte Tagesaufgabe +1 Kraft.

**0.32:** Über dem Start-Knopf zeigt `#wprev` die nächste Welle (`world.peekWave()` inkl. Karten-Mix: Anzahl je Gegnerart, Boss, Merkmale fliegend/getarnt/gepanzert/schnell/Elite). Runder AUTO-Schalter `#bAuto` neben dem Start-Knopf (Einstellung `autoWave`, gold = an, startet beim Einschalten sofort). Ergebnis-Bildschirm mit „Beste Kreaturen“ (Top 5 nach Schaden, Balken, Medaillen). Plopp-Klänge je Schicht gab es schon (`A.play('pop', {layer})`).

## v0.31.0 – Ahnenform (Ultra-Entwicklung)
**0.31:** Paragon-Prinzip: Stehen für jeden der 3 Pfade Kreaturen derselben Art mit Stufe 5 auf der Karte, kann man sie im Upgrade-Fenster zur **Ahnenform** verschmelzen (`world.ascendInfo`/`ascend`, Kosten Kaufpreis × `BAL.run.ascendCost` = 40). Alle Kreaturen dieser Art werden geopfert; **Ahnen-Grad 1–100** aus investierten Münzen, Siegen und Anzahl. Werte: alle drei Stufe-5-Pfade gleichzeitig (`tiers` = [5,5,5]), Schaden ×2 × (1 + Grad·2 %), +Tempo, +Reichweite, Erkennung, Bossschaden ×1,5 (`stats.baseStats` über `t.ascended`). Neue Ultimate „Ahnenzorn“ (`ancestral`, ganze Karte). Optik: alle drei Stufe-5-Optiken, Modell ×1,45, goldene Aura + Runenring + Lichtsäule; Zwischensequenz `ascend` (Lichtstrahlen von den Geopferten, Säulen, Zeitlupe, Zoom) + Vollbild-Einblendung `hud.ascendSplash`. Eine Ahnenform pro Kreaturart.

## v0.30.0 – Alle 20 Kreaturen mit sichtbaren Upgrades
**0.30:** `KIT` für Phönix, Schlangenmagierin, Windmönch, Leerenkatze, Kappa, Komainu und Kirin (mit Kopfpositionen `head`). Damit zeigt jede der 20 Grund-Kreaturen alle 15 Pfadstufen sichtbar (Kitsune über eigene `LOOKS`, die anderen über den Baukasten). Fusionen erben die Optik ihres Körpers.

## v0.29.0 – Upgrade-Optik für Drachenwolf, Mantis, Golem, Glückskatze
**0.29:** Neue Bauteile `rocks`, `scythe`, `chest`, `lanterns`, `clover`; `KIT.dragonwolf/mantis/golem/neko`. Prozedurale Modelle ohne Knochen bekommen eine Kopfposition `KIT[cid].head` = [x, y, z] als Anteil der Höhe. Halsband schmaler. Damit haben 9 von 20 Kreaturen eigene Optiken für alle 15 Stufen.

## v0.28.0 – Upgrade-Optik-Baukasten (Tiger, Schildkröte, Hirsch, Rabe)
**0.28:** Neuer Baukasten `js/render/looks.js`: Bauteile (`PART`: horns, gem, mask, collar, halo, crown, orbs, shards, coins, ring, flames, bolts, cloud, drums, wings, pillar, shield, spikes, cannon, twin, crates, muzzle, stones, roots, leaves, trees, torii, blades, hole, eyes, claws, stripes) und je Kreatur eine Liste `KIT[cid].paths[pfad][stufe]` = [[bauteil, farbe, n], …]. `pathGear(R, tiers, sc, { cid })` bzw. `gearOn(m, tiers, cid)` nutzen automatisch den Baukasten; Größen richten sich nach der Modellhöhe (Breite gedeckelt, sonst zählen Schwänze/Flügel mit). Fertig: Donnertiger (Sturmwolke, Raijin-Trommeln, Flammenkrone …), Eisenschildkröte (Schutzschild, Kanonen, Menhire …), Geisthirsch (Wurzeln, Mini-Wald, Torii, Lichtflügel …), Schattenrabe (Mondschwingen, Klingenring, Schwarzes Loch …).

## v0.27.0 – Jedes Upgrade sichtbar (Vorlage Kitsune)
**0.27:** Upgrade-Optik-System `LOOKS` in assets.js (eine Funktion pro Kreatur, sonst Rückfall `pathGear`). Regel: Stufe 1–2 Zubehör · 3 Farbe/Material (`tintByTier`) · 4 Umriss · 5 eigene Gestalt; Kreuzpfade kombinieren sich. Kitsune komplett: Flamme (Rücken-Kunai → brennende Kunai → kreisendes Fuchsfeuer → Flammenring + Schulterflammen → Inferno-Fuchs mit Flammenmähne, Feuerflügeln, Glut), Geist (Stirnjuwel → Papierlaterne → Geisterklinge → Seelenbänder → Ahnenfuchs mit Geisterkopf + Torii), Shinobi (Schal → Stirnband → Schatten-Nachbild → Kunai-Fächer → Tausend Klingen mit Klingenring, Maske, Schattenmantel). Höhen je Modell (`adult`). Stufe-5-Kauf: Vollbild-Einblendung `hud.t5Splash` (Strahlen in Pfadfarbe, neues Porträt, Name, Wirkung) + Kamera-Fokus/Effekte in view. Porträts führen jetzt einen Animationsschritt aus (`icons.portrait` → `m.tick`), damit kreisende Teile sichtbar sind.

## v0.26.0 – Hauptmenü im Genre-Stil
**0.26:** Hub `menus.s_home` neu: Konto-Level als Stern `.bStar` + Titel/XP oben links, Logo in Comic-Schrift, oben rechts Shinobi-Punkte `.bCur` und runder Optionen-Knopf `.bGear`; links große Kacheln (Kreaturen, Helden, Entwicklung), rechts orange Kacheln (Täglich, Erfolge, Akademie, Statistik) mit roten Hinweis-Punkten, unten mittig großer grüner SPIELEN-Knopf `.bPlay`. Titel, Bildschirmköpfe, Zurück-Knopf und Sammlungs-Karten im gleichen Comic-Stil (`--cartoon`, `--ol`).

## v0.25.0 – HUD im Genre-Stil
**0.25:** Spielerwunsch: HUD wie im Genre-Vorbild. Leben/Münzen/Runde als große umrandete Comic-Zahlen ohne Kästen (Schrift „Luckiest Guy“, Umriss über `--ol`), blaues Shop-Panel mit hellen Karten und umrandeten Preisen, runder grüner Start-/Tempo-Knopf, runder Pause-Knopf. Upgrade-Fenster wieder als Seitenleiste (Landscape): drei Pfadreihen untereinander mit grünen Kauf-Knöpfen (grau = zu teuer, gold = MAX), darunter Erwecken/Fusion, Werte, unten Ziel + roter Verkaufen-Knopf; es öffnet auf der Seite, auf der die Kreatur NICHT steht (`.atright`, `#hud.pright`). Reihenfolge per CSS `order` (`.pinfo`/`.pmain` als `display: contents`). Geister-Tipp-Sperre bleibt.

## v0.24.0 – Kappa, Kirin, Komainu, Sora und Ren
**0.24:** Neue Kreaturen (prozedural in beasts.js): **Kappa** `kappa` (Konto-Lv 14, Wasserblasen `bubble` mit Fläche/Rückstoß/Verlangsamung, im Wasser schneller, Pfad Gurkenhandel = Einkommen, Fähigkeit `flood`), **Komainu** `komainu` (Lv 16, Nahkampf-Bossjäger `bossMul`, Fähigkeit `guardbite`), **Kirin** `kirin` (Lv 18, Licht-Kettenstrahlen – Blitzfarbe Gold, Segens-Aura, Fähigkeit `radiance`). Fusionen Flussdrache (Kappa+Schlangenmagierin), Sonnenkirin (Kirin+Phönix), Tempelkoloss (Komainu+Golem) – jetzt 12. Helden **Sora, Windbogenschützin** (Lv 17, `arrow`, Reichweite 4, `volley`/`skyshot`) und **Ren, Schattenpuppenspieler** (Lv 19, `puppets` = Klon-Mechanik, `bind` lähmt die ganze Karte). Animationen mit `scale` immer relativ zur Grundgröße setzen (sonst riesige Teile).

## v0.23.0 – Drei neue Helden
**0.23:** Helden 4–6 in `data/heroes.js`, Figuren in `HEROES3D` (assets.js, KayKit-Modelle umgefärbt + eigenes Zubehör, Rückfall in models.js): **Hana, Blütenklinge** (Konto-Lv 11, Nahkampf `atk:'slash'`, Fähigkeit `petals` Blütensturm mit Blutung, Ultimate `thousand` trifft die 12 stärksten Gegner), **Gorō, Steinmönch** (Lv 13, Erdstoß `pulse` mit Betäubung, Aura schützt vor Boss-Lähmung `support.protect`, Fähigkeit `wall` Steinwall 3 s Erstarren, Ultimate `meteor` in die dichteste Gruppe), **Yoru, Mondmagierin** (Lv 15, Astralsterne mit Verwundbarkeit `mark`, Aura +Reichweite, Fähigkeit `veil` enttarnt + 50 % Verwundbarkeit, Ultimate `starfall` 30 Sterne). Alte Spielstände bekommen neue Helden über `migrate`.

## v0.22.0 – Himmelsinseln und Boss Fūjin
**0.22:** Neue Karte **Himmelsinseln** `sky` (Konto-Lv 12, Schwer, `hpMul` 1,1): Rasterzeichen `V` offener Himmel (nicht bebaubar, kein Feld, Höhe −3) und `B` Brücke (Pfad über `V`, wird in `build()` automatisch gesetzt). mapview: tiefe Inselklippen (`theme.isles`), Holzbrücken mit Pfosten/Seilen und Wolkenmeer (`buildClouds`) statt Waldrand. Windböen `map.gust` alle 20 s für 4 s (`world.updGust`/`gustT`): Bodengegner auf Brücken werden zurückgedrückt (`back`), Fliegende ×1,15; Ereignis `gust` → Banner + Windstreifen. Ab Welle 4 zusätzliche Irrlichter. Neuer Boss **Fūjin, Sturmeule** (`fujin`/2/3, Modell `owl`, schwebt immer, Blitzschrei `breathColor` gelb, ruft Irrlichter); `buildBig` mit `CLIP_ALIAS` (fehlende Animationen → idle/call). Erfolg „Über den Wolken“. Bot: Normal Lv5 4/4, Schwer Lv30 Ø Welle 37.

## v0.21.0 – Frosttempel und Boss Hyōga
**0.21:** Neue Karte **Frosttempel** `frost` (Konto-Lv 10, Schwer, `hpMul` 1,35): Eisbahnen `map.ice` (Rechtecke auf dem Pfad, Gegner +40 % Tempo, `world.onIce`, hellblaue Pfadfelder in mapview), Schneesturm `map.storm` alle 28 s für 7 s (`world.updStorm`/`stormT`: Gegner −25 % Tempo, Kreaturen mit Element Eis Tempo ×1,25, andere ×0,85; Ereignis `storm` → Banner, Schneetreiben). Schnee-Thema `theme.snow` (verschneite Tannen, Eiskristalle, keine Seerosen/Blumen, Schneeflocken). Neuer Boss **Hyōga, Frostwolf** (`BOSSES.hyoga`/`hyoga2`/`hyoga3` für Welle 20/40/60) mit Modell `wolf` + Eisstacheln (`buildBig(kind, model)`, `BIG_LOOK`), Phasen Frostsprünge/Eisatem (`breathColor`, eingefrorene Kreaturen `disCol`)/Rudelruf; `map.mix` darf den Boss tauschen (`boss`). Erfolg „Ewiger Winter“.

## v0.20.0 – Leistung für Gegner-Massen
**0.20:** Masterplan A2. Messung (Desktop, 1.000 Gegner): Simulation 0,7 ms, Szene-Abgleich 1,8 ms, aber 1,8 Mio. Dreiecke pro Bild → Engpass ist die Grafik, nicht die Simulation (daher kein Web Worker nötig). Neu: **Massen-LOD** (`lodGeo` in toon.js bündelt Eckpunkte beim Laden, −40…85 % Dreiecke, Golem 5.864 → 915), **Massenmodus** `view.crowd` ab 260 Gegnern (Stufe Hoch) bzw. 140 (Mittel/Spar): LOD-Modelle statt voller Modelle, keine Umrisse, weniger Funken → 1.000 Gegner 0,74 Mio. statt 1,8 Mio. Dreiecke. **Mitwachsende Gegner-Puffer** (`makePool`/`growPool`, doppelte Größe bei Überlauf) – vorher waren z. B. Wolf Nr. 141+ unsichtbar (Welle 56 hat 150). KP-Balken ohne neue Objekte pro Bild. Automatische Grafikstufe regelt jetzt laufend nach (gleitender Schnitt, höchstens alle 8 s eine Stufe runter). Test: e2e-Szenario `crowd` (700 Gegner), `view.forceCrowd` zum Vergleichen.

## v0.19.0 – Wellen 1–60 und Meister-Modus
**0.19:** Masterplan A3: 40 neue handgebaute Wellen 21–60 in `data/waves.js` (Endlos-Generator erst ab 61, `BAL.endlessScale` ab 60). Schwer jetzt 40 Wellen, neuer Modus **Meister** (60 Wellen, Konto-Lv 9, `BAL.diff.master`, XP ×2). Boss-Varianten `vharox2` (Welle 40, 26.000 KP, ×1,2 groß) und `vharox3` „Urfeuer“ (Welle 60, 120.000 KP, ruft Seelenwale) mit `scale` und eigenem `warn`-Text. Mini-Bosse wachsen ab Welle 10 mit (`BAL.miniScale`), Belohnungen ab Welle 21 (`BAL.lateCoins`, Welle 60 ×2,4). Fixes aus dem Balance-Bot: Rückstoß insgesamt ≤ 4 Felder pro Gegner (`world.knock`, `BAL.run.knockCap`) und Heiler heilen keine Heiler – beides verhinderte endlose Wellen. Weltkarte: 4 Sterne pro Karte (Normal 20, Schwer 40, Meister 60, Endlos 30). Erfolg „Großmeister“. Balance-Bot baut im Spätspiel bis Stufe 5 aus. Ergebnis: Schwer Lv 30 3/4 Siege, Meister Lv 40 scheitert am Endboss, Lv 50 3/3 Siege.

## v0.18.0 – Drei neue Kreaturen
**0.18:** Neue Grund-Kreaturen (prozedural in `render/beasts.js`, je 3 Formen, 3 Pfade × 5 Stufen): **Schlangenmagierin** `naga` (Konto-Lv 7, Gift über `poison` → Brand als Schattenschaden `e.burnType`, Verwundbarkeit `mark`, Fähigkeit `hex`), **Windmönch** `monk` (Lv 10, Windklingen mit Durchschlag + `knock`, Aura-Pfad, Fähigkeit `tornado`), **Leerenkatze** `voidcat` (Lv 13, Astralschaden mit Fläche, Sterne `orbs`, Fähigkeit `rift`). Neue Geschosse `venom`/`windblade` in fx.js. Drei neue Fusionen: Hydra (Schlangenmagierin + Schildkröte), Sturmtengu (Windmönch + Rabe), Kosmosfuchs (Leerenkatze + Kitsune) – jetzt 9 Fusionen.

## v0.17.0 – Rudel & Fusionen
**0.17:** Ziehen ohne Einrasten: die Vorschau steht exakt unter dem Finger (auch rot), so kann man bis an den Rand ziehen (`setGhost` nutzt `canPlace`, nicht mehr `nearestPlace`). Upgrade-Fenster unten und breit (Infospalte `.pinfo` + Pfade nebeneinander `.pmain`); steht die Kreatur selbst unten, rutscht es nach oben (`.attop`). Kein Geister-Tipp mehr: das Fenster nimmt 450 ms nach dem Öffnen keine Tipps an (`.fresh` + `guard`). Kreaturen werden über den Bildschirm-Abstand angetippt (Körper statt Boden). **Rudel**: zusammenhängende Gruppen benachbarter Kreaturen (`BAL.run.packR`) bekommen je weiterer Kreatur ×1,06 Schaden / ×1,025 Tempo – ohne Obergrenze (`world.packs`, `t.pack`, `s.packMul`, Funkenband in view). **Fusionen** (`data/fusions.js`): 6 neue Fusionskreaturen (Sonnenfuchs, Donnerdrachenwolf, Bergfestung, Glückshirsch, Nachtklinge, Polarphönix), nicht aufzählbar in `CREATURES` registriert (kein Shop/Profil), `world.fuseOptions/fuse` (Partner ≤ 2,2 Felder, beide erweckt, Münzen), Pfade aus beiden Eltern (`pathSrc`), Stufen werden übernommen, XP geht an beide Eltern, Modell `fusionModel` (Körper A Stufe 3 + Halo/Krone/Splitter in Farbe B), Fusions-Animation `fuse`, Rezepte in der Sammlung.

**0.16:** Spieltest-Rückmeldung: Kreaturen +35 % Schaden (`BAL.run.dmgMul`, wirkt in `world.damage` für alle Türme/Helden); Ziehen setzt die Kreatur genau dort ab, wo die Vorschau steht (kein Neuberechnen am Fingerpunkt beim Loslassen). Neue Kreatur **Phönix** (`CREATURES.phoenix`, Konto-Lv 5, prozedurales Modell `phoenix` in `render/beasts.js`: Glutküken im Nest → schwebender Feuervogel → Sonnenphönix mit Sonnenrad; Flügelschlag, Federkrone, Glutfunken): Glutfedern (`proj: 'phoenix'`, Durchschlag + Brand), Pfade Glutfedern / Sonnenflamme (Feuerbälle) / Asche & Wiedergeburt (Leben je Welle, Aura, Stufe 5 `rebirth`: einmal pro Run bei 0 Leben mit 100 Leben weiter, nicht in Seelenbrand), Fähigkeit `sunrise`.

**0.15:** Kreaturen-Leiste scrollbar (hoch/runter wischen = scrollen, zur Seite ziehen = platzieren; `touch-action: pan-y`, Ausblendung unten). Treffer-Effekte dezenter, aber genau: `Flashes` (Lichtstern am Einschlagpunkt, zur Kamera gedreht), `Sparks` (feine Funkenstriche weg vom Angreifer, `hit` trägt jetzt `sx/sy`), `Arcs` (Hiebsicheln der Mantis) in `render/fx.js`; weniger/kleinere Partikel, schwächere Lichtsäulen. Angriffs-Bewegungen je Kampfstil in `view.atkPose` (Zwischengruppe `pose`: Ausholen → Schlag → Nachfedern; Wurf, Blitz-Aufbäumen, Sprung + Stampfen mit Ring genau bei der Landung über `view.after`, Atem mit Ausholen, Hieb mit Ausfallschritt und wechselnder Seite) + Mündungsblitz `atkStart`.

**0.14:** Neuer Hub-Knopf 📅 **Täglich** (`menus.s_daily`, Daten `js/data/daily.js`): **Tageskampf** – für jedes Datum feste Bedingungen (Karte aus den freigeschalteten, Normal/Schwer, 2 kombinierte Herausforderungen, `dailyChallenge`), erster Sieg am Tag = +1 Shinobi-Punkt (`daily.sp`) + 500 Konto-XP; **3 Tagesaufgaben** aus 12 (`QUESTS`, `ensureDaily`), Fortschritt = Statistik seit Tagesbeginn (`daily.snap`), Belohnung Konto-XP zum Abholen. Neuer Zähler `stats.pops` (geplatzte Schichten). Roter Punkt am Knopf, wenn etwas offen ist.

## Stand v0.13.0 – Herausforderungen
**0.13:** Pro Karte 6 **Herausforderungen** (`data/challenges.js`, Auswahl in der Kartenwahl, `World({ mods })`): Nur Grundformen (`basic`, kein Erwecken), Halbes Gold (`halfCash` in `gain`), Umgekehrt (`reversedMap`, Schrein/Torii wandern mit), Doppelte KP (`dblHp`), Apokalypse (`apoc`, Wellen ohne Pause), Seelenbrand (`soulburn`: Schwer, 1 Leben, kein Verkaufen, kein Einkommen). Freigeschaltet nach Sieg auf der Karte (Seelenbrand nach Sieg auf Schwer). Sieg = **Medaille** 🏅 (`maps[id].medals`), Konto-XP und +1 Shinobi-Punkt.

## Stand v0.12.0 – Seelenwale + freies Spiel
**0.12:** **Großgegner-Klasse Seelenwale** (Quaternius „Glub Evolved“, schwebend `hover`, `big`): Seelenwal (520 KP, zerbricht in 4 Kokons) und Sturmwal (1.500 KP, zerbricht in 2 Seelenwale), großes Platz-Spektakel (`pop` ab Schicht 7: Ring, Funken, Wackeln, „WUMMS!“). Erster Wal in Welle 19, in freien Wellen im Pool und bei Boss-Wellen ab 30/40. **Freies Spiel:** Nach dem Sieg (Normal/Schwer) Auswahl „Weiterspielen“ oder „Abschließen“ (`game.askFree`); der Sieg wird sofort verbucht (`finish(true)`), danach laufen Endlos-Wellen (`maxWave = ∞`), am Ende Rekord `maps[id].free` und Ergebnis „Freies Spiel bis Welle N“.

## Stand v0.11.0 – Glückskatze (Wirtschaft)
**0.11:** Neue Kreatur **Glückskatze** (`neko`, Konto-Lv 4, 450 Münzen): sitzende Vuena-Katze (Animation `sit`, winkt mit `call`), Goldkoban, Formen Glückskätzchen → Goldene Glückskatze (Münzen kreisen) → Tempelkatze (Torii). Pfade: **Schatzkammer** = Zinsen auf gesparte Münzen je Welle (`interest`, Obergrenze `icap`), **Marktstand** = Einkommen (`income`), **Glücksbringer** = Münzen für jeden besiegten Gegner in Reichweite (`lucky`, `world.luckyT`) + Aura. Fähigkeit **Goldregen** (60 + 15 × Welle Münzen). Wirft Goldmünzen (`proj: 'coin'`). Pipeline: `ONLY=cat` erzeugt nur einzelne Modelle neu.

## Stand v0.10.0 – Shinobi-Akademie
**0.10:** **Shinobi-Akademie** (Hub-Medaillon ⛩, `menus.s_academy`, Daten `js/data/academy.js`): Wissensbaum mit 4 Schulen × 6 Stufen – Kampfkunst (Schaden, Tempo, Reichweite, Krit, Bossschaden), Elementarwissen (Brand, Frost, Reaktionen, Element-Schaden), Handelshaus (Startmünzen, günstigere Kreaturen/Upgrades, Wellenlohn, Verkauf, Einkommen), Ahnenschrein (Leben, Helden-Startlevel, Charakter-/Konto-XP, Fähigkeits-Abklingzeit). **Shinobi-Punkte** ✦ = 1 je Konto-Level + 1 je erstem Sieg (Karte × Normal/Schwer), rückwirkend; Kosten 1/1/1/2/2/3, jede Stufe braucht die vorige, kostenlos neu verteilbar. Boni gehen als `academy` an die Welt (`world.ac`: `costOf`, `upCost`, `sell`, `refresh`, `waveEnd`, `react`, Fähigkeiten) bzw. an die Hooks in `game.js` (XP, Held). Ergebnisbildschirm meldet neue Punkte.

## Stand v0.9.0 – Ziehen wie im Genre + Schichten-Gegner
**0.9:** **Platzieren:** ziehen → loslassen; auf ungültigem Platz bleibt die Kreatur **rot** liegen (Modell rot getönt, Ring rot), dann von **irgendwo** auf der Karte weiterziehen (relativ zur Fingerbewegung, `game.rel`), Loslassen auf freiem Platz setzt sie, zurück auf den Shop = abbrechen (`releaseGhost`, `groundRaw`, Einrasten nur noch 0,35 Felder). **Schichten-Gegner (Masterplan A1):** Seelenschleime `l1`–`l5` (Tau, Moos, Glut, Sturm, Sonne – jede Schicht schneller) platzen in die nächstkleinere (`split` + `layer`), **Überschussschaden** reißt mehrere Schichten auf einmal durch (`kill(e, src, over, type)`), Seelenkokon `kokon` (gepanzert) zerbricht in 2 Sonnenschleime; Ereignis `pop` mit Ring, Funken in Schichtfarbe, „plopp/KRACH“, Ton steigt mit der Schicht. Eingestreut in Wellen 2/4/7/9/11/16 + Endlos; Glutkrater-Dämonen leicht reduziert (Bot: alle Karten 12/12).

## Stand v0.8.3 – iOS-Fix Bildgröße
**0.8.3:** iOS-Web-App (Home-Bildschirm) meldet nach dem Drehen eine veraltete/zu kleine Fenstergröße → Grafik war verzerrt, Karte winzig, unten ein schwarzer Balken. `appSize()` in `render/stage.js` nimmt im Web-App-Modus die echten Bildschirmmaße (`screen` + `window.orientation`), setzt `--appW/--appH` für alle Vollbild-Ebenen; `main.js` berechnet nach Drehen/Größenänderung sofort und nach 0,1/0,35/0,8/1,5 s neu (`relayout`).

## Stand v0.8.2 – nur Querformat
**0.8.2:** Gespielt wird nur im Querformat (Wunsch des Spielers): Manifest `orientation: landscape`, im Hochformat Vollbild-Hinweis `#turn` mit drehendem Handy (CSS `@media (orientation: portrait)`), laufender Run pausiert automatisch (`resize`/`orientationchange` in `main.js`), `screen.orientation.lock` wo möglich (iOS kann nicht sperren). Die Hochformat-Kamera aus 0.8.1 bleibt als Rückfall im Code.

## Stand v0.8.1 – iPhone-Hochformat
**Fix 0.8.1** (Rückmeldung vom iPhone): Im Hochformat dreht sich die Kamera um 90° (`stage.portrait`, `fit()` mit Gierwinkel) – die Karte füllt den Bildschirm statt winzig zu sein; kein „Quer halten“-Hinweis mehr. Platzieren rastet auf den nächsten freien Platz ein (`world.nearestPlace`, bis 0,9 Felder), beim Ziehen mit dem Finger sitzt die Vorschau 46 px über dem Finger. Im Hochformat öffnet sich nach dem Platzieren nicht mehr das Upgrade-Fenster (Shop bleibt sichtbar), das Fenster ist dort max. 46 % hoch.

## Stand v0.8.0 – Menü wie ein fertiges Spiel
**Neu in 0.8:** **Titelbildschirm** nach dem Laden (Buchstaben fallen ein, „Tippe, um zu beginnen“ – schaltet auch den iPhone-Ton frei, `menus.s_title`). **Hub** mit runden Medaillons (`s_home`, CSS `.med`/`.mbig`): Kreaturen, Helden, großes pulsierendes SPIELEN, Entwicklung, Konto; oben Profil-Chip, Logo, Erfolge/Statistik/Optionen. **Entwicklungszentrum** (`s_evo`): alle Entwicklungsreihen mit Porträts, „noch N Level bis …“, nächste Form pulsiert. **Übergänge:** `menus.go(name, arg, event)` – Fuchsfeuer-Wipe wächst vom Tipp-Punkt (`#wipe`, Web Animations API), Inhalte fliegen gestaffelt ein (`.pop`), Kamera fährt je Bildschirm weich an eine eigene Position (`app.camT`), Geräusche `whoosh`/`start`. **Eisenschildkröte und Mantis neu** (`js/render/beasts.js`): Schildkröte mit Sechseck-Schuppen → Stahlpanzer mit Nieten, Stacheln, Helm, Nasenhorn → wandelnder Berg (Gipfel, Schnee, Kiefern, Wasserfall, Schrein); Mantis mit Facettenaugen, Fühlern, Flügeln und Fangarmen → Sichelkönigin (Krone, vier Sicheln) → Purpurmantis (glühende Klingen, ausgebreitete Flügel, Aura). Gelenk-Animationen: Stampfen, Sichelhieb, Beine, Atmen.

## Stand v0.7.0 – Jede Entwicklung ein eigenes Modell
**Neu in 0.7:** Entwicklungsformen nutzen eigene Grundmodelle (Übersicht `docs/evolutions.png`): Kitsune junger Vuena-Fuchs → ab Neunschweif erwachsene Quaternius-Füchsin · Geisthirsch Hirschkuh-Kitz → Hirsch → Himmelshirsch · Schattenrabe dunkler Rabe (Quaternius „Pigeon“) → Maskeneule → Leereneule mit vier Schwingen · Drachenwolf Shiba-Welpe → Husky → geflügelter Wolf · Felsgolem kleiner Goleling → KayKit-Frostgolem als Kristallgolem → Steintitan mit Moos + Lavakern (Stampf-Animation) · Donnertiger orange → Sturmtiger mit Leuchtstreifen + Blitzhörnern → weißer Donnerkönig mit Goldmähne. Kairo ist jetzt der KayKit-Ninja (mit Fuchsohren). Stufe 4/5 eines Pfads lässt das Modell selbst in Pfadfarbe glühen und wachsen; Schildkröte und Mantis (weiter prozedural – kein CC0-Modell im Stil gefunden; Codepawl-Voxel verworfen) tragen die Pfad-Ausrüstung über `gearOn`.

## Stand v0.6.0 – Masterplan Schritt B2: Helden + Tiger als Modelle, sichtbare Pfadstufen
**Neu in 0.6:** Helden Kairo (Kapuzen-Schurke mit Fuchsohren + rotem Schal), Raizen (Blitz-Stirnband, zuckende Blitze), Mika (Magierin mit Lotus + Geistkugel) als KayKit-Figuren (CC0) mit Leerlauf/Wurf/Zauber/Treffer; Stufe 15 Aura, Stufe 20 Lichtpartikel (Kairo: Fuchsschweife). Donnertiger = Vuena-Katze mit Tigerstreifen per Shader (`stripes` in `tintMat`), Blitzhörner, Sturmmähne. **Jede Pfadstufe ist am Modell sichtbar** (`pathGear` in `assets.js`, Farben wie die Pfad-Knöpfe): Pfad 1 Kopf (Stirnband → Juwel → Schulterflammen → Ring → Lichtkrone), Pfad 2 Rücken (Kragen → Wappen → 2/4 kreisende Kugeln → Heiligenschein), Pfad 3 Boden (Runenkreis → helle Runen → 3/5 Runensteine → Lichtsäule); Stufe 5 baut das Modell jetzt neu (`towerKey`). Noch prozedural: Eisenschildkröte, Mantisklinge (kein passendes CC0-Modell gefunden).
- Animationen der KayKit-Figuren liegen getrennt (`kk_anim1–3.glb`) und werden im `Rig` über `anims`/`alias` zugeordnet.

## Stand v0.5.0 – „Meisterwerk“ Schritt 1: echte 3D-Modelle
**Neu in 0.5:** Echte animierte Modelle (alle **CC0**, siehe `assets/models/LIZENZEN.md`): Quaternius „Ultimate Monsters“ als Gegner (Schleim, Geist, Schädelgeist, Magier, Pilzkönig, Panzerbienen, Goleling, Dämon, Orc mit Schild, Drache als Vharox, roter Orc als Oni), Quaternius-Tiere (Wolf, Stier, Husky, Hirsch) und Vuena-Tiere (Fuchs, Eule, Katze). Kitsune, Geisthirsch, Schattenrabe, Drachenwolf, Felsgolem sind jetzt Skin-Modelle mit Leerlauf-/Angriffs-/Treffer-Animation, Farbton je Form und Zubehör an den Knochen (Zusatzschweife, Halsseil, Halo, Runen, Hörner, Flügel …). Tiger, Schildkröte, Mantis und Helden sind noch prozedural.
- **Pipeline:** `tools/models.mjs` (gltf-transform + meshoptimizer): nur benötigte Animationen, Gegner-Netze vereinfacht (800–1.900 Dreiecke), Texturen 512 px → `assets/models/*.glb` (≈2,5 MB, vom Service Worker gecacht).
- **Laufzeit:** `js/render/assets.js` – `loadAssets()` im Ladebildschirm; Gegner werden in 6 Posen **vorgebacken** (Farben aus Textur → Eckpunktfarben, `bakeFrames`), je Pose ein InstancedMesh, Pose folgt dem zurückgelegten Weg (`ENEMY_MODELS[k].cyc`) → Hunderte animierte Gegner ohne Skinning. Kreaturen/Bosse: `Rig` (Klon + AnimationMixer + Toon-Material mit Farbton `uTint`, Skin-Umriss, `attach(knochen, obj)`). Weiche Schattenscheiben statt Schattenwurf für Gegner.
- **Rückfall:** ohne Modelle (oder mit `?models=0`) laufen die alten prozeduralen Formen. Entwickler-Galerie: `tools/gallery.html?mode=enemies|bigs|creatures&id=kitsune&st=0,1,2`.
- Leistung (360 Gegner, Headless): 1,19 Mio. Dreiecke / 217 Draw-Calls (vorher 1,0 Mio. / 111).

## Stand v0.4.0
**Neu in 0.4:** **Karte 3 Glutkrater** (Konto-Lv 6, `hpMul` 1,4, Stufe „Schwer“): Lavafelder (`L`, nicht bebaubar, eigener Shader + Glutlicht), 4 **Lava-Spalten** am Weg brechen alle 14 s aus (Warnring 1,6 s vorher, Feuerschaden + Brand, Bosse nur 30 %; `map.vents`/`map.lava`, `world.updVents`), 2 **Basalt-Flöße** treiben über die Lava und tragen Kreaturen mit (+15 % Schaden; `map.rafts`, `raftPos()` in `data/maps.js` für Simulation *und* Grafik, `world.raftAt`, Turm hat `raft/ox/oy`). Wellen werden je Karte über `map.mix(w, groups)` angepasst. **Neue Gegner:** Feuerdämon (fast feuerimmun, Eis ×1,5, Explosion legt nahe Kreatur 1,6 s lahm – `blast`) und Schildträger (Schild = 60 % KP schluckt zuerst Schaden, Blitz/Erde ×2; schützt Gegner im Umkreis um 35 % – `guard`, `e.guardT`). Eigene Musik `crater`, Aschefunken statt Blüten, verkohlte Bäume. Fix: Wasser-/Lava-Shader beachten jetzt die Instanz-Matrix; „Nochmal“ startet die gespielte Karte.

## Stand v0.3.0
**Neu in 0.3:** Ladebildschirm (Torii, Fuchsmaske, 9 Fuchsfeuer als echter Fortschritt, Tipps; auch beim Betreten einer Karte – `ui/loading.js`), **Weltkarte** als Auswahl (gezeichnete Karte, Kartenpunkte als Medaillons, wandernde Kreaturen, Seitenleiste mit Modus/Held/Team), **Karte 2 Shinobi-Dorf** (zwei Eingänge, Dächer als Anhöhe, `hpMul` 1,25), **3 neue Kreaturen** – Drachenwolf (Atem-Kegel Eis/Feuer, `atk: 'breath'`), Mantisklinge (Hiebe mit Nachbartreffern + Kopfgeld, `atk: 'slash'`), Felsgolem (Betäubung, Panzerbruch, Felswurf) – **2 neue Helden** Raizen (Kettenblitz, Blitzschlag, Donnerfall) und Mika (Heilerin: Aura, Leben pro Welle, Blütensegen, Lotusheiligtum), Heldenwahl, neues Element Eis mit 3 Reaktionen, 5 neue Synergien.

## Stand v0.2.0 (Vertical Slice + Genre-Optik)
**Neu in 0.2:** Querformat-Karte 22×13 mit steiler Kamera, Kreaturen **frei platzieren** (aus dem Shop ziehen oder antippen → Finger bewegen → loslassen; Kreis-Fußabdruck, Abstand zum Pfad), Shop-Leiste rechts mit großer ▶-/Tempo-Taste, Upgrade-Panel links mit 3D-Vorschau jeder nächsten Stufe, Kartenauswahl mit gerenderten Vorschaubildern + Modus-Karten, zweispaltige Sammlung, deutlich detailliertere Figuren (Anime-Augen, Fellbüschel, Pfoten, Rüstung, Schmuck), Normal spürbar leichter (150 Leben, mehr Startgeld, Boss schwächer; ein durchgelassener Boss kostet 100 Leben statt sofortiger Niederlage).

| Bereich | Inhalt |
|---|---|
| Karten (3) | Glutkrater (Lava, Spalten-Ausbrüche, treibende Flöße), Shinobi-Dorf (2 Eingänge), Ahnenhain (22×13, Querformat): verschlungener Pfad, Anhöhe (+15 % Reichweite), Teich (nur Wasserkreaturen, +20 % Tempo), räumbare Felsen, Torii, Laternen, Schrein mit Herzkristall (leuchtet nach Leben) |
| Kreaturen (8) | Drachenwolf, Mantisklinge, Felsgolem (je 3 Formen) + Kitsune (Benchmark, 7 Formen inkl. Zweig Geist/Schatten), Donnertiger, Eisenschildkröte, Geisthirsch (Support + Wirtschaft), Schattenrabe – je 3 Pfade × 5 Stufen, Kreuzpfade 5/2/0 |
| Helden (3) | Raizen (Blitz), Mika (Heilerin), Kairo, Fuchs-Shinobi: Level 1–20 im Run, Meilensteine (Passiv, Fähigkeit, Ultimate, Aufstieg, Meisterform), Sprüche, dauerhafter Rang |
| Gegner (13 + Boss) | Feuerdämon, Schildträger (nur Glutkrater), Moorschleim, Dornwolf, Eisenkeiler (Panzer), Irrlicht (fliegt), Schattenschleicher (getarnt), Nebelmagier (Schilde), Lotusmönch (heilt), Spaltkäfer → Käferlinge, Felskoloss (Titan), Oni-Hauptmann (Mini-Boss), **Vharox, Abgrunddrache** (4 Phasen: Erwachen, Schwingen/Flug, Feuersturm legt Türme lahm, Raserei + Diener) |
| Wellen | 20 handgebaute Wellen mit Modifikatoren (schnell, gepanzert, Regeneration, Elite), Endlos-Generator ab 21 (Boss alle 10) |
| Modi | Normal, Schwer (Konto-Lv 5), Endlos (Konto-Lv 7) |
| Systeme | Zielmodi (8), Elementreaktionen (7), Synergien (6), Fähigkeiten + Ultimate, Erfolge (35), Mastery mit Skins, Konto-Belohnungen, Tutorial |

## Die drei Fortschrittssysteme (nie vermischt)
| System | Farbe | Lebt in | Wofür |
|---|---|---|---|
| **A – Run-Münzen ◈** | Gold | `sim/world.js` (`world.coins`) | Kreaturen, Upgrades, Evolutionen *im Run*. Verfallen am Ende, werden nie gespeichert. |
| **B – Charakter-XP** | Cyan | `profile.chars[id]` | Pro Kreatur Level 1–50: schaltet Formen frei (kosten im Run trotzdem Münzen!), kleine permanente Boni, Passiven, Fähigkeit ab Lv 8. |
| **C – Konto-XP** | Violett | `profile.account` | Spieler-Level 1–100: Kreaturen, Held, Modi, Rahmen, Titel. |

XP wird **live** gutgeschrieben (Verkauf, Niederlage, Absturz verlieren nichts) und nach jeder Welle gespeichert.
Gegen Farmen: XP je Kill wächst mit der Welle, wird nach Schadensanteil geteilt und sinkt, wenn das Level weit über dem Niveau der Welle liegt (`dimFactor`, min. 15 %).

## Architektur
```
js/config.js            ALLE Balance-Regler (Wirtschaft, Kurven, Schwierigkeiten, Level-Boni)
js/data/*.js            Inhalte als Daten: creatures, enemies (+Boss), heroes, maps, waves, meta (Reaktionen, Synergien, Konto, Erfolge)
js/sim/world.js         Simulation eines Runs (ohne DOM/three): Wellen, Gegner, Türme, Projektile, Schaden, Status, Reaktionen,
                        Boss-Phasen, Fähigkeiten, Wirtschaft, XP-Verteilung. Fester Zeitschritt 1/60 s → 3× bleibt deterministisch.
js/sim/stats.js         Werte = Basis → Formen → Pfadstufen → Level-Boni (danach in world.refresh: Synergien → Auren → Buffs → Gelände)
js/meta/progression.js  Charakter-/Konto-XP, Formen, Boni, Mastery, Erfolge (ohne DOM)
js/meta/profile.js      Spielstand (localStorage `beastforge.save`), Migration alter Stände
js/render/              three.js: stage (Renderer, Kamera-Einpassung, Bloom, Wackeln), view (Welt → Szene), mapview, models
                        (prozedurale Modelle + Rückfall), assets (GLB laden, Gegner-Posen backen, Rig für Skin-Modelle), toon (Toon-Material, Umrisse, Verschmelzen/optimize), fx (Partikel, Ringe, Blitze,
                        Säulen, Projektil-Instanzen, Schadenszahlen), icons (Porträts + 3D-Vorschau)
js/ui/hud.js, menus.js  Oberfläche (DOM)
js/game.js              Ein Run: verbindet Welt, Ansicht, Eingabe, Hooks (XP live ins Profil), Zeitlupe, Abschluss
js/audio.js             WebAudio: Koto, Flöte, Taiko, eigene Stücke (Menü, Wald, Boss – dynamisch), alle Effekte
```
- **Neue Kreatur** = Eintrag in `data/creatures.js` (Basis, Formen, Pfade mit `fx`-Operationen `add/mul/set`) + Modell-Funktion in `render/models.js`.
- **Neue Welle/Karte/Gegner/Erfolg** = nur Daten.
- Ereignisse: `world.events` (z. B. `hit`, `kill`, `evolve`, `bossPhase`) → `view.handle`, `game.sound`, `hud.handle`.
- Leistung: Gegner/Projektile/Bäume als InstancedMesh, Modelle werden pro animierter Gruppe und Material verschmolzen (`optimize`), Partikel in einem Points-Objekt. Auto-Qualität senkt Auflösung/Schatten bei schwachen Geräten.

## Steuerung
- Kreatur im Shop (rechts) **auf die Karte ziehen** – oder antippen, dann auf die Karte tippen, Finger bewegen und loslassen. Grüner Kreis = gültig. Maus: Vorschau folgt, Klick platziert.
- Kreatur antippen → Panel links: 3 Pfade mit Vorschau, Erwecken (Evolution), Zielmodus ◀ ▶, Verkaufen. Fähigkeiten unten links. ▶ startet die Welle, nochmal tippen = 2×/3× Tempo.
- Tastatur: `1–6` Kreatur wählen, `Leertaste` Welle, `F` Tempo, `Esc` abbrechen/Pause.

## Testen
```bash
node --test beastforge/tools/test.mjs              # 21 Systemtests (Kreuzpfade, Platzierung, Wirtschaft, XP-Grenzfälle, Boss, Fähigkeiten, Speichern, 3×-Determinismus, Balance)
cd beastforge && python3 -m http.server 8055 &      # dann:
node beastforge/tools/e2e.cjs all [screenshot-ordner]   # Browser: boot, menus, land (Querformat), run
node beastforge/tools/balance.mjs normal 15 20      # Balance-Bot: diff, Charakter-Level, Runs
```
Test-API im Browser: `window.BF` (`BF.start()`, `BF.world`, `BF.profile`, `BF.level(30)`, `BF.menu('collection')`).

## Balance (Bot, 12 Runs je Zeile)
| Normal | Ergebnis |
|---|---|
| Charakter-Lv 1 | gewinnt (Ø ~70 von 150 Leben übrig) |
| Lv 5+ | gewinnt sicher (Ø ~110 Leben) |
Schwer: Bot ab ~Lv 35 gelegentlich – Langzeitziel. Werte in `config.js`, Wellen in `data/waves.js`.

## Veröffentlichen
Bei jeder Änderung `CACHE` in `sw.js` erhöhen, neue Dateien in `FILES` eintragen.
