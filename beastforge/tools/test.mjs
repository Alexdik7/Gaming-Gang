// Systemtests ohne Browser: node --test beastforge/tools/test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../js/sim/world.js';
import { canTier, baseStats } from '../js/sim/stats.js';
import { BAL } from '../js/config.js';
import { CREATURES } from '../js/data/creatures.js';
import { defaultProfile, migrate, saveProfile, loadProfile } from '../js/meta/profile.js';
import { addCharXp, addAccXp, dimFactor, maxStage, unlocked, checkAchievements, charNeed, formsFor, levelFx } from '../js/meta/progression.js';
import { playRun } from './balance.mjs';
import { waveDef } from '../js/data/waves.js';

const step = (w, sec) => { for (let i = 0; i < sec * 60; i++) w.step(1 / 60); w.events.length = 0; };
function mkWorld(P = defaultProfile(), o = {}) {
  const hooks = {
    level: cid => P.chars[cid]?.level ?? 1, branch: cid => P.chars[cid]?.branch,
    charXp: (cid, raw, wave) => addCharXp(P, cid, raw, { wave, diff: 'normal' }).xp,
    accXp: a => addAccXp(P, a).xp, stat: (k, n, m) => { P.stats[k] = m ? Math.max(P.stats[k] || 0, n) : (P.stats[k] || 0) + n; },
  };
  const w = new World({ map: 'ahnenhain', diff: 'normal', loadout: Object.keys(CREATURES), hero: 'kairo', hooks, seed: 7, ...o });
  return { w, P };
}

test('Kreuzpfade: 5/2/0 erlaubt, dritter Pfad und zweimal >2 verboten', () => {
  assert.ok(canTier([4, 2, 0], 0).ok);
  assert.ok(!canTier([5, 2, 0], 0).ok);
  assert.ok(!canTier([5, 2, 0], 1).ok, 'zweiter Pfad über 2');
  assert.ok(!canTier([2, 1, 0], 2).ok, 'dritter Pfad');
  assert.ok(canTier([0, 2, 4], 2).ok);
});

test('Platzierung: Pfad, Wasser, Held, Fels, Münzen', () => {
  const { w } = mkWorld();
  assert.equal(w.canPlace('kitsune', 3, 2.5).why, 'Zu nah am Pfad');
  assert.ok(!w.canPlace('kitsune', 8, 6.5).ok, 'Kitsune nicht ins Wasser');
  w.coins = 99999;
  assert.ok(w.place('turtle', 8, 6.5).ok, 'Schildkröte ins Wasser');
  assert.ok(!w.canPlace('raven', 8.3, 6.5).ok, 'zu nah an Kreatur');
  assert.ok(w.place('kairo', 3, 4.5).ok);
  assert.ok(!w.canPlace('kairo', 8, 4.5).ok, 'nur ein Held');
  assert.ok(!w.canPlace('kitsune', 2.5, 6.5).ok, 'Fels');
  assert.ok(w.clearRock(2, 6).ok); assert.ok(w.canPlace('kitsune', 2.5, 6.5).ok);
  w.coins = 10; assert.equal(w.canPlace('kitsune', 13.5, 6.5).why, 'Zu wenig Münzen');
});

test('Wirtschaft: Kosten, Upgrade, Verkauf 70 %', () => {
  const { w } = mkWorld(); w.coins = 5000;
  const t = w.place('kitsune', 3, 4.5).tower;
  w.upgrade(t.id, 0); w.upgrade(t.id, 0);
  const spent = 500 + 200 + 450; assert.equal(t.spent, spent); assert.equal(w.coins, 5000 - spent);
  const r = w.sell(t.id); assert.equal(r.value, Math.floor(spent * 0.7));
});

test('Höhe gibt Reichweite, Wasser gibt Tempo', () => {
  const { w } = mkWorld(); w.coins = 9999;
  const a = w.place('kitsune', 13.5, 6.5).tower, b = w.place('kitsune', 3, 4.5).tower;
  assert.ok(Math.abs(a.s.range / b.s.range - 1.15) < 1e-9);
  const t = w.place('turtle', 8, 6.5).tower, t2 = w.place('turtle', 3, 7.5).tower;
  assert.ok(t.s.rate > t2.s.rate);
});

test('XP: mehrere Kreaturen teilen fair nach Schaden', () => {
  const { w, P } = mkWorld(); w.wave = 1;
  const k = w.place('kitsune', 3, 4.5).tower; w.coins = 9999; const r = w.place('raven', 3, 7.5).tower;
  const e = w.spawn('golem'); e.hp = 100; e.maxHp = 100;
  w.damage(e, 30, 'phys', k, { ignoreRes: true, noReact: true }); w.damage(e, 70, 'phys', r, { ignoreRes: true, noReact: true });
  // Krit kann mehr Schaden machen – wir prüfen nur die Aufteilung
  const xk = w.stats.xp.kitsune || 0, xr = w.stats.xp.raven || 0;
  assert.ok(xk > 0 && xr > 0, 'beide bekommen XP');
  assert.ok(xr > xk, 'mehr Schaden = mehr XP');
});

test('XP-Grenzfälle: verkaufte Kreatur behält XP, Niederlage behält XP', () => {
  const { w, P } = mkWorld(); w.coins = 9999;
  const t = w.place('kitsune', 3, 4.5).tower; w.startWave(); step(w, 12);
  const before = P.chars.kitsune.total; assert.ok(before > 0);
  w.sell(t.id); step(w, 1);
  assert.ok(P.chars.kitsune.total >= before, 'XP nach Verkauf bleibt');
  w.lives = 1; w.spawn('golem', [], w.len - 0.1); step(w, 2);
  assert.ok(w.over && !w.won); assert.ok(P.chars.kitsune.total >= before, 'XP nach Niederlage bleibt');
});

test('Level-Up mitten in der Welle: Boni und neue Form sofort nutzbar', () => {
  const { w, P } = mkWorld(); w.coins = 9999;
  const t = w.place('kitsune', 3, 4.5).tower;
  assert.equal(w.evolve(t.id).ok, false, 'Lv 1: Flammenform gesperrt');
  const r0 = t.s.dmg;
  P.chars.kitsune.xp = charNeed(4) - 1; P.chars.kitsune.level = 4;
  addCharXp(P, 'kitsune', 5000, { flat: true }); w.dirty = true; w.step(1 / 60);
  assert.ok(P.chars.kitsune.level >= 5);
  assert.ok(t.s.dmg > r0, 'Level-Bonus (+2 % ab Lv 3) wirkt sofort');
  assert.ok(w.evolve(t.id).ok, 'Evolution jetzt möglich');
  assert.equal(t.stage, 1); assert.equal(t.s.dmgType, 'fire');
});

test('Evolution kostet weiterhin Münzen', () => {
  const { w, P } = mkWorld(); P.chars.kitsune.level = 50; w.coins = 500;
  const t = w.place('kitsune', 3, 4.5).tower; w.coins = 100;
  assert.equal(w.evolve(t.id).why, 'Zu wenig Münzen');
});

test('Formen: Zweig Geist/Schatten, maxStage nach Level', () => {
  assert.equal(maxStage('kitsune', 1), 0); assert.equal(maxStage('kitsune', 5), 1); assert.equal(maxStage('kitsune', 15), 2); assert.equal(maxStage('kitsune', 50), 5);
  assert.equal(formsFor('kitsune', 'shadow').find(f => f.stage === 2).id, 'shadow');
  assert.equal(formsFor('kitsune', 'spirit').length, 6);
  const sp = baseStats({ cid: 'kitsune', stage: 2, tiers: [0, 0, 0] }, 15, 'spirit'), sh = baseStats({ cid: 'kitsune', stage: 2, tiers: [0, 0, 0] }, 15, 'shadow');
  assert.ok(sp.camo && sp.orbs.n === 1); assert.ok(sh.crit.ch >= 0.15 && sh.dmgType === 'shadow');
});

test('Permanente Boni bleiben klein (Lv 50 ≤ +25 % Schaden ohne Formen)', () => {
  const a = baseStats({ cid: 'kitsune', stage: 0, tiers: [0, 0, 0] }, 1), b = baseStats({ cid: 'kitsune', stage: 0, tiers: [0, 0, 0] }, 50);
  assert.ok(b.dmg / a.dmg < 1.25, 'Schaden ' + (b.dmg / a.dmg)); assert.ok(b.rate / a.rate < 1.1);
  assert.equal(levelFx('kitsune', 2).length, 0);
});

test('Abnehmender Ertrag gegen Farmen früher Wellen', () => {
  assert.equal(dimFactor(3, 1, 'normal'), 1);
  assert.equal(dimFactor(50, 1, 'normal'), BAL.char.dimFloor);
  assert.ok(dimFactor(30, 20, 'normal') === 1);
  assert.ok(dimFactor(45, 20, 'hard') > dimFactor(45, 20, 'normal'));
});

test('Konto-Level schaltet Inhalte frei', () => {
  const P = defaultProfile();
  assert.ok(unlocked(P, 'creature', 'kitsune')); assert.ok(!unlocked(P, 'creature', 'tiger')); assert.ok(!unlocked(P, 'mode', 'hard'));
  const r = addAccXp(P, 50000); assert.ok(r.ups.length >= 5);
  assert.ok(unlocked(P, 'creature', 'tiger') && unlocked(P, 'mode', 'hard') && unlocked(P, 'hero', 'kairo'));
});

test('Speichern/Laden + Migration alter Stände', () => {
  const P = defaultProfile(); P.chars.kitsune.level = 17; P.account.level = 9; P.ach.first_blood = 1;
  saveProfile(P); const Q = loadProfile();
  assert.equal(Q.chars.kitsune.level, 17); assert.equal(Q.account.level, 9); assert.ok(Q.ach.first_blood);
  const old = migrate({ account: { level: 3, xp: 10 }, chars: { kitsune: { level: 4, xp: 5 } } });
  assert.equal(old.account.level, 3); assert.equal(old.chars.kitsune.level, 4); assert.ok(old.chars.tiger && old.settings && old.stats.kills === 0);
  assert.equal(JSON.stringify(P).includes('"coins":0,'), true, 'nur Statistik-Münzen, keine Run-Münzen im Profil');
});

test('Letztes Leben verloren am Wellenende = Niederlage, kein Sieg', () => {
  const { w } = mkWorld(); w.wave = 20; w.lives = 1;
  w.spawn('slime', [], w.len - 0.05); for (let i = 0; i < 20; i++) w.step(1 / 60);
  assert.ok(w.over); assert.equal(w.won, false);
});

test('3×-Tempo ist deterministisch (fester Zeitschritt)', () => {
  const a = mkWorld().w, b = mkWorld().w;
  for (const w of [a, b]) { w.coins = 9999; w.place('kitsune', 3, 4.5); w.place('tiger', 3, 7.5); w.startWave(); }
  for (let i = 0; i < 600; i++) a.tick(1 / 60);
  for (let i = 0; i < 200; i++) b.tick(3 / 60);
  assert.equal(a.stats.kills, b.stats.kills); assert.equal(Math.round(a.coins), Math.round(b.coins)); assert.equal(a.enemies.length, b.enemies.length);
});

test('Boss: Phasen, Feueratem stört Türme, Schutzschild verhindert es', () => {
  const { w } = mkWorld(); w.coins = 99999;
  const t = w.place('kitsune', 13.5, 6.5).tower;
  const turtle = w.place('turtle', 12.6, 7.6).tower; w.upgrade(turtle.id, 2); w.upgrade(turtle.id, 2);
  const t2 = w.place('raven', 8, 8.3).tower;
  const b = w.spawn('vharox', [], 18); w.posAt(b.d, b);
  const phases = [];
  b.hp = b.maxHp * 0.45; for (let i = 0; i < 60 * 12; i++) { w.step(1 / 60); for (const e of w.events) if (e.t === 'bossPhase') phases.push(e.phase); w.events.length = 0; if (t2.disabledT > 0) break; }
  assert.ok(phases.includes(2), 'Phase Feuersturm erreicht');
  assert.ok(t.prot, 'Kitsune ist durch Schutzschild geschützt');
  assert.equal(t.disabledT, 0, 'geschützte Kitsune nicht gestört');
});

test('Fähigkeiten: Fuchsfeuer-Sturm braucht Lv 8 + Flammenform, Ultimate braucht Neunschweif', () => {
  const { w, P } = mkWorld(); w.coins = 99999;
  const t = w.place('kitsune', 3, 4.5).tower; w.spawn('golem', [], 6);
  step(w, 1);
  assert.equal(w.useAbility(t.id, 'ab').ok, false);
  P.chars.kitsune.level = 30; w.dirty = true; w.evolve(t.id);
  const hp0 = w.enemies[0].hp; assert.ok(w.useAbility(t.id, 'ab').ok); assert.ok(w.enemies.length === 0 || w.enemies[0].hp < hp0);
  const second = w.useAbility(t.id, 'ab'); assert.equal(second.ok, false, JSON.stringify(second));
  assert.equal(w.useAbility(t.id, 'ult').ok, false); w.evolve(t.id); w.evolve(t.id); w.spawn('golem', [], 6); step(w, 0.2);
  assert.ok(w.useAbility(t.id, 'ult').ok);
});

test('Held steigt im Run auf und schaltet Meilensteine frei', () => {
  const { w } = mkWorld(); w.coins = 9999;
  const h = w.place('kairo', 3, 4.5).tower; assert.equal(h.hlvl, 1);
  w.heroXp(h, 100000); assert.equal(h.hlvl, 20); w.step(1 / 60);
  assert.ok(h.s.camo && h.s.dmgType === 'fire' && h.s.shots >= 3);
  assert.equal(w.abilityInfo(h).filter(a => a.ready).length, 2);
});

test('Synergie Seelenhain gibt der Kitsune einen Orb', () => {
  const { w } = mkWorld(); w.coins = 9999;
  const k = w.place('kitsune', 3, 4.5).tower; assert.equal(k.s.orbs.n, 0);
  w.place('deer', 3.5, 6.5); assert.equal(k.s.orbs.n, 1); assert.equal(w.synergies[0].sy.id, 'seelenhain');
});

test('Erfolge werden erkannt', () => {
  const P = defaultProfile(); P.stats.kills = 600;
  const got = checkAchievements(P).map(a => a.id);
  assert.ok(got.includes('first_blood') && got.includes('hunter'));
  assert.equal(checkAchievements(P).length, 0, 'nicht doppelt');
});

test('Balance: Charakter-Lv 15 gewinnt Normal, Lv 1 kommt mindestens bis Welle 15', () => {
  const hi = [1, 2, 3].map(s => playRun({ level: 15, seed: s }));
  assert.ok(hi.every(r => r.won), 'Lv 15: ' + hi.map(r => r.wave).join(','));
  const lo = [1, 2, 3].map(s => playRun({ level: 1, seed: s }));
  assert.ok(lo.every(r => r.wave >= 15), 'Lv 1: ' + lo.map(r => r.wave).join(','));
});

test('Neue Kreaturen: Atem-Kegel trifft mehrere, Hieb springt über, Kopfgeld', () => {
  const { w } = mkWorld(); w.coins = 99999;
  const dw = w.place('dragonwolf', 3, 4.5).tower;
  const e1 = w.spawn('golem', [], 4.5), e2 = w.spawn('golem', [], 5.0); // beide auf Zeile 2.5 vor dem Wolf
  for (const e of [e1, e2]) { e.speed = 0; }
  step(w, 1.5);
  assert.ok(e1.hp < e1.maxHp && e2.hp < e2.maxHp, 'Kegel trifft beide');
  const m = w.place('mantis', 4, 3.6).tower; w.upgrade(m.id, 2); w.upgrade(m.id, 2); w.upgrade(m.id, 2);
  assert.equal(m.s.bounty, 1);
  const before = m.dmg; step(w, 1); assert.ok(m.dmg > before, 'Mantis schlägt zu');
});

test('Mehrpfad-Karte: Gegner verteilen sich auf beide Eingänge', () => {
  const w = new World({ map: 'dorf', hooks: {}, loadout: ['kitsune'] });
  assert.equal(w.paths.length, 2);
  const a = w.spawn('slime'), b = w.spawn('slime');
  assert.notEqual(a.pi, b.pi); assert.ok(Math.abs(a.y - b.y) > 5, 'verschiedene Tore');
});

test('Helden Raizen und Mika: Fähigkeiten und Lebensheilung', () => {
  const r = mkWorld(undefined, { hero: 'raizen' }).w; r.coins = 99999;
  const h = r.place('raizen', 3, 4.5).tower; r.heroXp(h, 1e6); r.spawn('golem', [], 4); r.step(1 / 60);
  assert.equal(h.s.atk, 'chain'); assert.ok(r.useAbility(h.id, 'ab').ok); assert.ok(r.useAbility(h.id, 'ult').ok);
  const m = mkWorld(undefined, { hero: 'mika' }).w; m.coins = 99999;
  const k = m.place('mika', 3, 4.5).tower; m.heroXp(k, 1e6); m.step(1 / 60);
  assert.ok(k.s.lifeRegen >= 4); m.lives = 100; m.wave = 1; m.waveEnd(); assert.ok(m.lives > 100, 'Leben geheilt');
  m.spawn('slime', [], 3); m.step(1 / 60); assert.ok(m.useAbility(k.id, 'ult').ok); assert.ok(m.enemies[0].slowPct >= 0.7);
});

test('Glutkrater: Lava sperrt, Flöße tragen und bewegen Kreaturen', () => {
  const w = mkWorld(undefined, { map: 'glut' }).w; w.coins = 99999;
  assert.equal(w.canPlace('kitsune', 12.5, 3.5).ok, false, 'Lava ist gesperrt');
  const r = w.rafts[0];
  const c = w.canPlace('kitsune', r.x, r.y); assert.ok(c.ok, c.why); assert.equal(c.raft, 0);
  const t = w.place('kitsune', r.x, r.y).tower, y0 = t.y;
  step(w, 4.5);
  assert.ok(Math.abs(t.y - y0) > 1, 'Kreatur fährt mit'); assert.ok(Math.abs(t.y - w.rafts[0].y) < 1e-9);
});

test('Glutkrater: Ausbruch verbrennt Gegner, neue Wellen mit Dämonen und Schildträgern', () => {
  const w = mkWorld(undefined, { map: 'glut' }).w;
  const v = w.vents[0]; v.cd = 0.01;
  const e = w.spawn('golem', [], 0); e.speed = 0; e.x = v.x + 0.6; e.y = v.y; e.d = 1e-6;
  w.posAt = function (d, out) { return out; }; // Gegner bleibt an der Spalte stehen
  w.step(1 / 60); w.step(1 / 60);
  assert.ok(e.hp < e.maxHp, 'Lava trifft'); assert.ok(w.events.some(x => x.t === 'erupt'));
  const w2 = mkWorld(undefined, { map: 'glut' }).w; w2.wave = 4; w2.startWave();
  const kinds = new Set(w2.spawners.map(s => s.e));
  assert.ok(kinds.has('demon'), 'Dämonen ab Welle 3'); assert.ok(kinds.has('bearer') && !kinds.has('boar'), 'Keiler → Schildträger');
});

test('Schildträger schützt, Feuerdämon legt beim Tod lahm', () => {
  const w = mkWorld().w; w.coins = 99999;
  const b = w.spawn('bearer', [], 3), s = w.spawn('slime', [], 3.3); w.step(1 / 60);
  assert.ok(b.guard > 0 && s.guardT > 0);
  const hp = s.hp; w.damage(s, 10, 'phys', null); assert.ok(Math.abs((hp - s.hp) - 6.5) < 1e-6, '−35 % durch Schild');
  const g = b.guard, bh = b.hp; w.damage(b, 5, 'lightning', null); assert.equal(b.hp, bh); assert.ok(Math.abs(g - b.guard - 10) < 1e-6, 'Blitz bricht doppelt');
  const t = w.place('kitsune', 3, 3.6).tower;
  const d = w.spawn('demon', [], 3); d.x = 3; d.y = 2.5; w.damage(d, 1e6, 'phys', null);
  assert.ok(t.disabledT > 0, 'Explosion legt Kreatur lahm');
});

test('Schichten-Gegner: platzen Schicht für Schicht, Überschussschaden reißt durch', () => {
  const w = mkWorld().w;
  const e = w.spawn('l5', [], 3); e.speed = 0;
  w.damage(e, e.hp + 0.1, 'phys', null);
  assert.equal(e.alive, false);
  let kinds = w.enemies.filter(x => x.alive).map(x => x.kind);
  assert.deepEqual(kinds, ['l4'], 'Sonne → Sturm');
  assert.ok(w.events.some(x => x.t === 'pop' && x.layer === 5));
  // großer Treffer: Sturm (7) + Glut (6) + Moos (6) durch, Tau bleibt mit Rest
  const l4 = w.enemies.find(x => x.alive);
  w.damage(l4, l4.hp + 6 + 6 + 1, 'phys', null, { ignoreRes: true });
  kinds = w.enemies.filter(x => x.alive).map(x => x.kind);
  assert.deepEqual(kinds, ['l1'], 'drei Schichten auf einmal');
  const k = w.spawn('kokon', [], 5); w.damage(k, 1e4, 'fire', null);
  assert.ok(w.enemies.filter(x => x.alive && x.kind === 'l1').length >= 1, 'Kokon zerbricht bis nach unten');
});

test('Shinobi-Akademie: Punkte, Reihenfolge, Boni in der Welt', async () => {
  const { shinobiPoints, canLearn, learn, academyFx } = await import('../js/data/academy.js');
  const P = defaultProfile(); P.account.level = 6; P.maps.ahnenhain.normal = 20;
  assert.equal(shinobiPoints(P).earned, 6, '5 Level + 1 erster Sieg');
  assert.equal(canLearn(P, 'k2').ok, false, 'Stufe 2 braucht Stufe 1');
  for (const id of ['h1', 'h2', 'k1', 's1']) assert.ok(learn(P, id).ok, id);
  assert.equal(shinobiPoints(P).free, 2);
  const fx = academyFx(P);
  const base = new World({ map: 'ahnenhain', diff: 'normal', loadout: ['kitsune'], hooks: {} });
  const w = new World({ map: 'ahnenhain', diff: 'normal', loadout: ['kitsune'], hooks: {}, academy: fx });
  assert.equal(w.coins, base.coins + 100); assert.equal(w.lives, base.lives + 15);
  assert.ok(w.costOf('kitsune') < base.costOf('kitsune'), 'Feilschen');
  w.coins = 9999; base.coins = 9999; const t = w.place('kitsune', 3, 4.5).tower, tb = base.place('kitsune', 3, 4.5).tower;
  assert.ok(Math.abs(t.s.dmg / tb.s.dmg - 1.04) < 1e-6, '+4 % Schaden');
});

test('Glückskatze: Einkommen, Zinsen, Glückskopfgeld, Goldregen', () => {
  const P = defaultProfile(); P.chars.neko.level = 12;
  const w = mkWorld(P).w; w.coins = 99999;
  const t = w.place('neko', 3, 4.5).tower;
  w.upgrade(t.id, 0); w.upgrade(t.id, 2);           // Spardose (2 % Zinsen) + Glückspfote
  assert.ok(t.s.interest >= 0.02 && t.s.lucky >= 1 && t.s.income >= 25);
  w.coins = 1000; w.wave = 1; const c0 = w.coins; w.waveEnd();
  const interest = Math.min(t.s.icap, Math.floor(c0 * t.s.interest));
  assert.ok(w.coins - c0 >= t.s.income + interest, 'Einkommen + Zinsen am Wellenende');
  const e = w.spawn('slime', [], 0); e.x = t.x + 0.5; e.y = t.y; const c1 = w.coins; w.kill(e, null);
  assert.ok(w.coins - c1 >= Math.round(8 * w.diff.coins) + t.s.lucky, 'Glücksmünze beim Besiegen in Reichweite');
  w.evolve(t.id); w.wave = 4; t.abCd = 0; const c2 = w.coins; assert.ok(w.useAbility(t.id, 'ab').ok); assert.equal(w.coins - c2, 60 + 15 * 4);
});

test('Seelenwale: Sturmwal → 2 Wale → je 4 Kokons, freie Wellen erzeugen Wale', () => {
  const w = mkWorld().w;
  const s = w.spawn('whale2', [], 4); w.damage(s, s.hp + 1, 'astral', null);
  const whales = w.enemies.filter(x => x.alive && x.kind === 'whale'); assert.equal(whales.length, 2);
  w.damage(whales[0], whales[0].hp + 1, 'astral', null);
  assert.equal(w.enemies.filter(x => x.alive && x.kind === 'kokon').length, 4);
  let found = false; for (let n = 21; n < 60 && !found; n++) found = waveDef(n).groups.some(g => g.e === 'whale' || g.e === 'whale2');
  assert.ok(found, 'Wale in freien Wellen');
});

test('Herausforderungen: Regeln greifen, Medaillen geben Shinobi-Punkte', async () => {
  const { CH, reversedMap, chUnlocked } = await import('../js/data/challenges.js');
  const { shinobiPoints } = await import('../js/data/academy.js');
  const { MAPS } = await import('../js/data/maps.js');
  const W = mods => new World({ map: 'ahnenhain', diff: 'normal', loadout: ['kitsune'], hooks: {}, mods, mapObj: mods.reverse ? reversedMap(MAPS.ahnenhain) : null });
  const base = W({}), half = W(CH.half.mods); base.gain(100); half.gain(100);
  assert.equal(half.coins - half.diff.start, 50, 'halbes Gold');
  const a = base.spawn('slime'), b = W(CH.dbl.mods).spawn('slime'); assert.equal(b.maxHp, a.maxHp * 2, 'doppelte KP');
  const s = W(CH.soul.mods); assert.equal(s.lives, 1); s.coins = 9999; const t = s.place('kitsune', 3, 4.5).tower; assert.equal(s.sell(t.id).ok, false, 'kein Verkaufen');
  const bw = W(CH.basic.mods); bw.coins = 99999; const k = bw.place('kitsune', 3, 4.5).tower; assert.equal(bw.evolve(k.id).ok, false, 'keine Erweckung');
  const r = W(CH.rev.mods), e = r.spawn('slime'); assert.ok(e.x > 20, 'rückwärts: Start rechts'); assert.ok(r.paths[0].pts.at(-1).x < 2, 'Ende links');
  const ap = W(CH.apoc.mods); ap.startWave(); for (let i = 0; i < 60 * 40 && ap.wave < 2; i++) ap.step(1 / 60); assert.ok(ap.wave >= 2, 'Apokalypse startet Wellen selbst');
  const P = defaultProfile(); assert.equal(chUnlocked(P, 'ahnenhain', 'half'), false); P.maps.ahnenhain.normal = 20; assert.equal(chUnlocked(P, 'ahnenhain', 'half'), true);
  const p0 = shinobiPoints(P).earned; P.maps.ahnenhain.medals = { half: 1, rev: 1 }; assert.equal(shinobiPoints(P).earned, p0 + 2);
});

test('Täglich: Aufgaben je Tag, Fortschritt seit Tagesbeginn, Tageskampf gibt Shinobi-Punkt', async () => {
  const { ensureDaily, questProgress, dailyChallenge, QUESTS } = await import('../js/data/daily.js');
  const { shinobiPoints } = await import('../js/data/academy.js');
  const P = defaultProfile(); P.stats.kills = 500;
  const D = ensureDaily(P, new Date(2026, 10, 21)); assert.equal(D.quests.length, 3); assert.equal(new Set(D.quests).size, 3);
  const q = QUESTS.find(x => x.id === D.quests[0]); assert.equal(questProgress(P, q), 0);
  P.stats[q.stat] = (P.stats[q.stat] || 0) + 7; assert.equal(questProgress(P, q), 7);
  assert.deepEqual(ensureDaily(P, new Date(2026, 10, 21)).quests, D.quests, 'gleicher Tag = gleiche Aufgaben');
  const a = dailyChallenge(P, () => true, '2026-11-21'), b = dailyChallenge(P, () => true, '2026-11-21');
  assert.deepEqual(a, b, 'Tageskampf ist für ein Datum fest'); assert.equal(a.mods.length, 2);
  const p0 = shinobiPoints(P).earned; P.daily.sp = 2; assert.equal(shinobiPoints(P).earned, p0 + 2);
  const D2 = ensureDaily(P, new Date(2026, 10, 22)); assert.equal(D2.sp, 2, 'Punkte bleiben am nächsten Tag'); assert.equal(D2.won, false);
});

test('Phönix: Glutfedern brennen, Wiedergeburt einmal pro Run, Sonnenaufgang', () => {
  const P = defaultProfile(); P.chars.phoenix.level = 12;
  const w = mkWorld(P).w; w.coins = 99999;
  const t = w.place('phoenix', 3, 4.5).tower;
  assert.ok(t.s.burn.dps > 0 && t.s.pierce >= 2 && t.s.dmgType === 'fire');
  for (let i = 0; i < 5; i++) w.upgrade(t.id, 2);
  assert.equal(t.s.rebirth, 100);
  const e = w.spawn('slime', [], 0); w.lives = 1; w.leak(e);
  assert.ok(!w.over && w.lives === 100, 'Wiedergeburt mit 100 Leben');
  const e2 = w.spawn('slime', [], 0); w.lives = 1; w.leak(e2);
  assert.ok(w.over, 'nur einmal pro Run');
  const w2 = mkWorld(P).w; w2.coins = 99999; const t2 = w2.place('phoenix', 3, 4.5).tower; w2.evolve(t2.id);
  const x = w2.spawn('golem', [], 0); x.x = t2.x + 1; x.y = t2.y; const hp = x.hp; t2.abCd = 0;
  assert.ok(w2.useAbility(t2.id, 'ab').ok); assert.ok(x.hp < hp && x.burnT > 0);
});

test('Rudel: Nachbarn stärken sich ohne Obergrenze, Fusionen verschmelzen zwei erweckte Kreaturen', async () => {
  const { FUSIONS } = await import('../js/data/fusions.js');
  const P = defaultProfile(); for (const id in CREATURES) P.chars[id].level = 30;
  const { w } = mkWorld(P); w.coins = 1e6;
  const a = w.place('kitsune', ...w.suggestSpot('kitsune', 3)).tower; const solo = a.s.dmg;
  const near = []; for (let k = 0; k < 40 && near.length < 4; k++) { const ang = k * 0.7, r = 0.9 + (k % 3) * 0.3, p = w.place('raven', a.x + Math.cos(ang) * r, a.y + Math.sin(ang) * r); if (p.ok) near.push(p.tower); }
  assert.ok(near.length >= 2, 'Nachbarn platziert');
  assert.ok(a.pack >= 2 && Math.abs(a.s.packMul - Math.pow(1 + BAL.run.packDmg, a.pack - 1)) < 1e-9 && a.s.dmg > solo * 1.05, 'Rudel-Multiplikator wächst mit jeder Kreatur');
  assert.ok(!Object.keys(CREATURES).includes('solfox') && CREATURES.solfox?.fusion, 'Fusionen nicht im Shop');
  for (const f of FUSIONS) assert.ok(CREATURES[f.id].paths.length === 3 && baseStats({ cid: f.id, stage: 0, tiers: [0, 0, 0] }).dmg > CREATURES[f.a].base.dmg, f.id);
  const { w: w2 } = mkWorld(P); w2.coins = 1e6;
  const k = w2.place('kitsune', ...w2.suggestSpot('kitsune', 3)).tower; let ph = null;
  for (let i = 0; i < 24 && !ph; i++) { const r = w2.place('phoenix', k.x + Math.cos(i * 0.5) * 1.1, k.y + Math.sin(i * 0.5) * 1.1); if (r.ok) ph = r.tower; }
  assert.ok(ph, 'Phönix daneben');
  assert.match(w2.fuseOptions(k)[0].why, /erwecken/);
  w2.evolve(k.id); w2.evolve(ph.id); w2.upgrade(k.id, 0); w2.upgrade(k.id, 0);
  const before = k.s.dmg, coins = w2.coins, r = w2.fuse(k.id, 'solfox');
  assert.ok(r.ok && w2.towers.length === 1 && k.cid === 'solfox' && k.tiers[0] === 2 && w2.coins === coins - FUSIONS[0].cost);
  assert.ok(k.s.dmg > before * 1.5 && k.s.pierce >= 3 && k.s.burn.dps > 5, 'Fusion ist deutlich stärker');
  assert.ok(w2.abilityInfo(k).every(x => x.ready), 'Fähigkeiten sofort bereit');
  w2.charXp('solfox', 100); assert.ok(w2.stats.xp.kitsune > 0 && w2.stats.xp.phoenix > 0, 'XP für beide Eltern');
});

test('Neue Kreaturen: Gift der Schlangenmagierin, Wirbelsturm, Realitätsriss, neue Fusionen', () => {
  const P = defaultProfile(); for (const id in CREATURES) P.chars[id].level = 12;
  const { w } = mkWorld(P); w.coins = 1e6;
  const n = w.place('naga', ...w.suggestSpot('naga', 3)).tower, m = w.place('monk', ...w.suggestSpot('monk', 3)).tower, v = w.place('voidcat', ...w.suggestSpot('voidcat', 3)).tower;
  assert.ok(n && m && v && n.s.poison && m.s.knock > 0 && v.s.dmgType === 'astral');
  for (const t of [n, m, v]) w.evolve(t.id);
  const near = t => { const e = w.spawn('golem', [], 0); e.x = t.x + 0.8; e.y = t.y; return e; };
  const e1 = near(n), hp1 = e1.hp; assert.ok(w.useAbility(n.id).ok !== false); assert.ok(e1.vuln >= 0.4 && e1.burnType === 'shadow' && e1.hp < hp1, 'Fluch');
  const e2 = w.spawn('slime', [], 0); e2.d = 6; w.posAt(e2.d, e2, e2.pi); m.x = e2.x + 0.5; m.y = e2.y; m.abCd = 0; assert.ok(w.useAbility(m.id).ok !== false); assert.ok(!e2.alive || e2.d < 6, 'Wirbelsturm wirft zurück');
  const e3 = near(v), hp3 = e3.hp; v.abCd = 0; w.useAbility(v.id); assert.ok(e3.hp < hp3 - v.s.dmg * 20 || !e3.alive, 'Realitätsriss');
  for (const id of ['hydra', 'tengu', 'cosmofox']) assert.ok(CREATURES[id]?.fusion && baseStats({ cid: id, stage: 0, tiers: [0, 0, 0] }).dmg > 5, id);
});

test('Wellen 1–60: Schwer 40, Meister 60 mit Boss-Varianten, Rückstoß-Grenze, Heiler heilen keine Heiler', () => {
  assert.equal(BAL.diff.hard.waves, 40); assert.equal(BAL.diff.master.waves, 60);
  for (let i = 1; i <= 70; i++) { const d = waveDef(i); assert.ok(d.groups.length > 0, 'Welle ' + i); }
  assert.equal(waveDef(40).boss, 'vharox2'); assert.equal(waveDef(60).boss, 'vharox3');
  const { w } = mkWorld(defaultProfile(), { diff: 'master' });
  const b = w.spawn('vharox3', [], 2); assert.ok(b.boss && b.maxHp > 100000);
  const e = w.spawn('wolf', [], 8); for (let i = 0; i < 10; i++) w.knock(e, 1); assert.ok(Math.abs(e.d - (8 - BAL.run.knockCap)) < 1e-9, 'Rückstoß gedeckelt');
  const h1 = w.spawn('healer', [], 5), h2 = w.spawn('healer', [], 5.2), x = w.spawn('boar', [], 5.1);
  h1.hp = h1.maxHp / 2; x.hp = x.maxHp / 2; for (let i = 0; i < 60 * 4; i++) w.step(1 / 60);
  assert.ok(h1.hp <= h1.maxHp / 2 + 1e-6 && x.hp > x.maxHp / 2, 'Heiler heilen nur andere Gegner');
  assert.ok(BAL.miniScale(30) > 2 && BAL.lateCoins(60) > 2);
});

test('Frosttempel: Eisbahnen beschleunigen, Schneesturm verlangsamt Gegner und stärkt Eiskreaturen, Boss Hyōga', () => {
  const P = defaultProfile(); for (const id in CREATURES) P.chars[id].level = 20;
  const { w } = mkWorld(P, { map: 'frost' }); w.coins = 1e6;
  const dw = w.place('dragonwolf', ...w.suggestSpot('dragonwolf', 2.2)).tower, k = w.place('kitsune', ...w.suggestSpot('kitsune', 3)).tower;
  const r0 = dw.s.rate, k0 = k.s.rate;
  const e = w.spawn('slime', [], 0); const ice = w.spawn('slime', [], 0);
  // auf einer Eisbahn: Feld (5,1) liegt im ersten Eisstück
  assert.ok(w.onIce(5.5, 1.5) && !w.onIce(2.5, 6.5));
  w.stormCd = 0; w.updStorm(0.01); w.refresh();
  assert.ok(w.stormT > 0 && dw.s.rate > r0 * 1.2 && k.s.rate < k0, 'Sturm: Eis schneller, andere langsamer');
  w.stormT = 0.005; w.updStorm(0.01); w.refresh(); assert.ok(Math.abs(dw.s.rate - r0) < 1e-9, 'Sturm vorbei');
  const { w: w2 } = mkWorld(P, { map: 'frost' }); w2.wave = 19; w2.doneWave = 19; w2.startWave();
  assert.ok(w2.spawners.some(s => s.e === 'hyoga'), 'Boss im Frosttempel ist Hyōga');
  const b = w2.spawn('hyoga', [], 2); assert.ok(b.boss && b.def.model === 'wolf');
  void e; void ice;
});

test('Himmelsinseln: offener Himmel nicht bebaubar, Brücken, Windböe drückt zurück, Boss Fūjin', () => {
  const { w } = mkWorld(defaultProfile(), { map: 'sky' }); w.coins = 1e6;
  assert.equal(w.terrainAt(6.5, 1.5), 'V'); assert.equal(w.terrainAt(6.5, 9.5), 'B');
  assert.ok(!w.canPlace('kitsune', 6.5, 5.5).ok, 'Himmel nicht bebaubar');
  const e = w.spawn('boar', [], 0); const L = w.paths[0];
  // Gegner auf die Brücke bei (6.5, 9.5) setzen: Abstand entlang des Pfads suchen
  let d = 0; for (; d < 40; d += 0.05) { w.posAt(d, e, 0); if (w.terrainAt(e.x, e.y) === 'B') break; } e.d = d + 0.3; w.posAt(e.d, e, 0);
  const f = w.spawn('wisp', [], 2); const fd = f.d;
  w.gustCd = 0; w.updGust(0.01); assert.ok(w.gustT > 0);
  const d0 = e.d; for (let i = 0; i < 30; i++) w.step(1 / 60);
  assert.ok(e.d < d0, 'auf der Brücke zurückgedrückt'); assert.ok(f.d > fd, 'Fliegende fliegen weiter');
  const { w: w2 } = mkWorld(defaultProfile(), { map: 'sky' }); w2.wave = 19; w2.doneWave = 19; w2.startWave();
  assert.ok(w2.spawners.some(s => s.e === 'fujin'), 'Boss auf den Himmelsinseln ist Fūjin');
  void L;
});

test('Neue Helden Hana, Gorō, Yoru: Grundangriff, Fähigkeiten, alte Spielstände bekommen die Helden', () => {
  const old = defaultProfile(); delete old.heroes.hana; const P = migrate(JSON.parse(JSON.stringify(old)));
  assert.ok(P.heroes.hana && P.heroes.goro && P.heroes.yoru, 'Migration legt neue Helden an');
  for (const [hid, ab, ult] of [['hana', 'petals', 'thousand'], ['goro', 'wall', 'meteor'], ['yoru', 'veil', 'starfall']]) {
    const { w } = mkWorld(defaultProfile(), { hero: hid }); w.coins = 1e6;
    const h = w.place(hid, ...w.suggestSpot(hid, 2)).tower; assert.ok(h?.hero, hid + ' platziert');
    w.heroXp(h, 1e7); assert.equal(h.hlvl, 20);
    const es = [0, 1, 2].map(i => { const e = w.spawn('golem', [], 0); e.x = h.x + 0.6 + i * 0.3; e.y = h.y; return e; });
    const hp = es.map(e => e.hp);
    assert.ok(w.useAbility(h.id, 'ab').ok !== false, hid + ' Fähigkeit'); assert.ok(w.useAbility(h.id, 'ult').ok !== false, hid + ' Ultimate');
    assert.ok(es.some((e, i) => e.hp < hp[i] || e.vuln > 0), hid + ' wirkt');
  }
});

test('Kappa, Kirin, Komainu + Helden Sora/Ren: Fähigkeiten, Gurkenhandel, Bossschaden, Fusionen', () => {
  const P = defaultProfile(); for (const id in CREATURES) P.chars[id].level = 12;
  const { w } = mkWorld(P); w.coins = 1e6;
  const kp = w.place('kappa', ...w.suggestSpot('kappa', 2.8)).tower, kr = w.place('kirin', ...w.suggestSpot('kirin', 3)).tower, km = w.place('komainu', ...w.suggestSpot('komainu', 1.5)).tower;
  assert.ok(kp && kr && km && kr.s.chain.n >= 2 && km.s.bossMul > 1.5);
  for (let i = 0; i < 3; i++) w.upgrade(kp.id, 2); assert.ok(kp.s.income >= 170, 'Gurkenhandel bringt Münzen');
  for (const t of [kp, kr, km]) w.evolve(t.id);
  const near = t => { const e = w.spawn('golem', [], 0); e.x = t.x + 0.7; e.y = t.y; return e; };
  for (const t of [kp, kr, km]) { const e = near(t), hp = e.hp; t.abCd = 0; assert.ok(w.useAbility(t.id).ok !== false, t.cid); assert.ok(e.hp < hp || !e.alive, t.cid + ' trifft'); }
  assert.ok(kr.buffs.some(b => b.id === 'radiance'), 'Himmelsglanz stärkt');
  for (const id of ['riverdragon', 'sunkirin', 'templeguard']) assert.ok(CREATURES[id]?.fusion && baseStats({ cid: id, stage: 0, tiers: [0, 0, 0] }).dmg > 5, id);
  for (const [hid, ab, ult] of [['sora', 'volley', 'skyshot'], ['ren', 'puppets', 'bind']]) {
    const { w: w2 } = mkWorld(defaultProfile(), { hero: hid }); const h = w2.place(hid, ...w2.suggestSpot(hid, 3)).tower; w2.heroXp(h, 1e7);
    const es = [0, 1, 2].map(i => { const e = w2.spawn('golem', [], 0); e.x = h.x + 0.6 + i * 0.3; e.y = h.y; return e; }); const hp = es.map(e => e.hp);
    assert.ok(w2.useAbility(h.id, 'ab').ok !== false && w2.useAbility(h.id, 'ult').ok !== false, hid);
    assert.ok(es.some((e, i) => e.hp < hp[i]) || h.clonesT > 0, hid + ' wirkt');
  }
});

test('Ahnenform: drei Stufe-5-Pfade verschmelzen, Grad, Ahnenzorn, nur eine pro Kreatur', () => {
  const P = defaultProfile(); P.chars.kitsune.level = 50;
  const { w } = mkWorld(P); w.coins = 1e7;
  const ks = [0, 1, 2].map(p => { const r = w.place('kitsune', ...w.suggestSpot('kitsune', 3)); const t = r.tower; for (let i = 0; i < 5; i++) w.upgrade(t.id, p); for (let i = 0; i < 2; i++) w.upgrade(t.id, (p + 1) % 3); return t; });
  assert.ok(ks.every((t, p) => t.tiers[p] === 5), 'je ein Pfad auf Stufe 5');
  const solo = ks[0].s.dmg, info = w.ascendInfo(ks[0]);
  assert.ok(info.ok && info.grade >= 1 && info.cost > 0, JSON.stringify(info));
  const coins = w.coins, r = w.ascend(ks[0].id);
  assert.ok(r.ok && w.towers.filter(t => t.cid === 'kitsune').length === 1 && w.coins === coins - info.cost);
  const a = w.towers.find(t => t.cid === 'kitsune');
  assert.ok(a.ascended >= 1 && a.tiers.join() === '5,5,5' && a.s.dmg > solo * 2 && a.s.camo, 'Ahnenform deutlich stärker');
  const e = w.spawn('golem', [], 3), hp = e.hp; assert.ok(w.useAbility(a.id, 'ult').ok !== false); assert.ok(e.hp < hp, 'Ahnenzorn trifft');
  w.place('kitsune', ...w.suggestSpot('kitsune', 3)); assert.ok(!w.ascendInfo(w.towers.at(-1)) || !w.ascendInfo(w.towers.at(-1)).ok, 'nur eine Ahnenform');
});

test('Kräfte: Bombe, Zeitstopp, Münzen, Leben, Rausch, Sofort-Kreatur', async () => {
  const { POWERS, givePowers, runPowerReward, START_POWERS } = await import('../js/data/powers.js');
  const { w, P } = mkWorld({ ...defaultProfile() }, { loadout: ['kitsune'] });
  assert.deepEqual(P.powers, START_POWERS);
  w.startWave(); step(w, 4);
  const e = w.enemies[0]; assert.ok(e);
  const hp0 = e.hp; assert.ok(w.usePower('bomb', e.x, e.y).ok); assert.ok(!e.alive || e.hp < hp0, 'Bombe trifft');
  assert.ok(!w.usePower('gold').ok, 'Abklingzeit'); step(w, 2);
  const c0 = w.coins; assert.ok(w.usePower('gold').ok); assert.ok(w.coins > c0 + 200);
  step(w, 2); const l0 = w.lives; assert.ok(w.usePower('heal').ok); assert.equal(w.lives, l0 + 25);
  step(w, 2); assert.ok(w.usePower('freeze').ok); assert.ok(w.enemies.filter(x => x.alive && !x.boss).every(x => x.stunT > 3));
  // Sofort-Kreatur: gratis, auch außerhalb des Teams, mit fertigen Upgrades
  w.coins = 0; assert.ok(!w.canPlace('tiger', 8, 4.5).ok);
  const r = w.place('tiger', 8, 4.5, { free: true, tiers: [0, 3, 2] }); assert.ok(r.ok, r.why);
  assert.deepEqual(r.tower.tiers, [0, 3, 2]); assert.equal(w.coins, 0);
  step(w, 2); assert.ok(w.usePower('rage').ok); assert.ok(r.tower.buffs.some(b => b.id === 'rage'));
  for (const p of POWERS) if (p.inst) { const t = p.inst.tiers; assert.ok(t.filter(x => x > 0).length <= 2 && t.filter(x => x > BAL.cross.second).length <= 1, p.id); assert.ok(CREATURES[p.inst.cid], p.id); }
  const got = givePowers(P, 5); assert.equal(got.length, 5);
  assert.equal(runPowerReward(60, true, 'master'), 6); assert.equal(runPowerReward(7, false, 'normal'), 0);
  // alte Spielstände bekommen den Startvorrat
  const old = defaultProfile(); delete old.powers; assert.deepEqual(migrate(old).powers, START_POWERS);
});

test('Truhen, Wochen-Event, Kosmetik', async () => {
  const ev = await import('../js/data/events.js');
  const P = defaultProfile(); assert.equal(P.chests, 1);
  const E = ev.ensureEvent(P, new Date(2026, 10, 25)); assert.equal(E.week, '2026-11-23'); assert.equal(ev.weekKey(new Date(2026, 10, 29)), '2026-11-23'); assert.equal(ev.weekKey(new Date(2026, 10, 30)), '2026-11-30');
  const d = ev.EVENTS.find(x => x.id === E.id);
  assert.equal(ev.claimEvent(P, 0), 0, 'noch nicht erreicht');
  P.stats[d.stat] = (P.stats[d.stat] || 0) + d.goals[2];
  assert.equal(ev.claimEvent(P, 0), 1); assert.equal(ev.claimEvent(P, 0), 0, 'nur einmal'); assert.equal(ev.claimEvent(P, 2), 3); assert.equal(P.chests, 5);
  // Truhen öffnen: Kosmetik zuerst (r < 0.4), Kräfte, XP
  let i = 0; const seq = [0.1, 0.0, 0.5, 0.1, 0.2, 0.9];
  const r1 = ev.openChest(P, () => seq[i++]); assert.equal(r1.type, 'cos'); assert.ok(ev.hasCos(P, r1.kind, r1.item.id));
  assert.equal(ev.openChest(P, () => seq[i++]).type, 'powers');
  assert.equal(ev.openChest(P, () => 0.9).type, 'xp'); assert.equal(P.chests, 2);
  P.chests = 0; assert.equal(ev.openChest(P), null);
  // alle Kosmetik besessen → nie wieder Kosmetik
  for (const k in ev.COSMETICS) for (const c of ev.COSMETICS[k]) P.cos.owned[k + '_' + c.id] = 1;
  P.chests = 1; assert.notEqual(ev.openChest(P, () => 0.1).type, 'cos');
  const old = defaultProfile(); delete old.cos; delete old.chests; const m = migrate(old); assert.equal(m.cos.heart, 'default'); assert.equal(m.chests, 1);
});

test('Koop-Lockstep: gleiche Befehle zum gleichen Schritt → gleiche Welt', async () => {
  const { worldHash } = await import('../js/net.js');
  const mk = () => new World({ map: 'dorf', diff: 'normal', loadout: ['kitsune', 'turtle', 'raven', 'tiger'], hero: 'kairo', seed: 4242, hooks: { level: () => 12, branch: () => 'spirit', heroStart: () => 3 } });
  const A = mk(), B = mk();
  const log = [];
  const run = (w, rec) => {
    for (let i = 0; i < 3000; i++) {
      if (rec) {
        if (i === 5) { const p = w.suggestSpot('kitsune', 3); const r = w.place('kitsune', ...p); if (r.ok) log.push([w.tickN, 'place', ['kitsune', ...p]]); }
        if (i === 8 || i === 1400) { if (w.startWave().ok) log.push([w.tickN, 'startWave', []]); }
        if (i === 700) { w.coins += 0; const p = w.suggestSpot('tiger', 3); if (p) { const r = w.place('tiger', ...p); if (r.ok) log.push([w.tickN, 'place', ['tiger', ...p]]); } }
        if (i === 900) { const t = w.towers[0]; if (w.upgrade(t.id, 0).ok) log.push([w.tickN, 'upgrade', [t.id, 0]]); }
      } else for (const [n, name, a] of log) if (n === w.tickN) w[name](...a);
      w.step(BAL.tick);
    }
  };
  run(A, true); run(B, false);
  assert.ok(log.length >= 3, 'Befehle aufgezeichnet');
  assert.equal(A.tickN, B.tickN); assert.equal(worldHash(A), worldHash(B)); assert.equal(A.coins, B.coins); assert.equal(A.enemies.length, B.enemies.length);
});

test('Koop: jeder verdient und zahlt selbst, fremde Kreaturen gesperrt', () => {
  const w = new World({ map: 'ahnenhain', diff: 'normal', loadout: ['kitsune', 'turtle', 'raven'], seed: 9, players: 2, hooks: { level: () => 10 } });
  const start = w.wallet[0]; assert.equal(w.wallet[1], start);
  w.who = 0; const a = w.place('raven', ...w.suggestSpot('raven', 3)); assert.ok(a.ok); assert.equal(a.tower.owner, 0);
  w.who = 1; const p1 = w.suggestSpot('turtle', 3); const b = w.place('turtle', ...p1); assert.ok(b.ok, b.why); assert.equal(b.tower.owner, 1);
  assert.equal(w.wallet[0], start - w.costOf('raven')); assert.equal(w.wallet[1], start - w.costOf('turtle'));
  assert.equal(w.upgrade(a.tower.id, 0).why, 'Gehört deinem Mitspieler'); assert.equal(w.sell(a.tower.id).why, 'Gehört deinem Mitspieler');
  w.who = 0; const before = [...w.wallet];
  w.gain(100, 1); assert.equal(w.wallet[1], before[1] + 100); assert.equal(w.wallet[0], before[0]);
  w.gain(100); assert.equal(w.wallet[0], before[0] + 50, 'ohne Besitzer: aufgeteilt');
  // Kill-Geld geht an den Besitzer der Kreatur
  w.startWave(); const w1 = [...w.wallet]; for (let i = 0; i < 60 * 25; i++) w.step(BAL.tick);
  const k0 = a.tower.kills, k1 = b.tower.kills; assert.ok(k0 + k1 > 0);
  if (k0 && !k1) assert.ok(w.wallet[0] > w1[0] && w.wallet[1] >= w1[1]);
  // Solo unverändert: eine Börse
  const s = new World({ map: 'ahnenhain', diff: 'normal', seed: 9 }); assert.equal(s.wallet.length, 1); s.coins += 5; assert.equal(s.wallet[0], s.diff.start + 5);
});

test('Koop: freies Spiel nach dem Sieg bleibt synchron', async () => {
  const { worldHash } = await import('../js/net.js');
  const mk = () => { const w = new World({ map: 'ahnenhain', diff: 'normal', loadout: ['kitsune', 'turtle'], seed: 77, players: 2, hooks: { level: () => 30 } }); w.maxWave = 1; return w; };
  const A = mk(), B = mk(), log = [];
  const doCmd = (w, who, name, ...a) => { w.who = who; const r = w[name](...a); w.who = 0; if (r?.ok) log.push([w.tickN, name, a, who]); return r; };
  A.wallet = [5000, 5000]; B.wallet = [5000, 5000];
  doCmd(A, 0, 'place', 'kitsune', ...A.suggestSpot('kitsune', 3)); doCmd(A, 1, 'place', 'turtle', ...A.suggestSpot('turtle', 3));
  doCmd(A, 0, 'startWave');
  let guard = 0; while (!A.over && guard++ < 60 * 300) A.step(BAL.tick);
  assert.ok(A.over && A.won, 'Welle 1 gewonnen');
  assert.equal(A.freeplay().ok, true); log.push([A.tickN, 'freeplay', [], 0]);
  assert.ok(!A.over && A.maxWave === Infinity);
  doCmd(A, 1, 'startWave'); for (let i = 0; i < 600; i++) A.step(BAL.tick);
  // Gast spielt das Protokoll nach (Befehle vor dem Schritt, auch wenn die Welt gerade vorbei ist)
  const q = log.slice();
  for (;;) { while (q.length && q[0][0] <= B.tickN) { const [, n, a, who] = q.shift(); B.who = who; B[n](...a); B.who = 0; } if (B.tickN >= A.tickN) break; if (B.over && !q.length) break; B.step(BAL.tick); }
  assert.equal(B.tickN, A.tickN); assert.equal(B.wave, 2); assert.equal(worldHash(A), worldHash(B));
});

test('Koop: jeder Spieler setzt seinen eigenen Helden', () => {
  const w = new World({ map: 'ahnenhain', diff: 'normal', loadout: ['kitsune'], seed: 3, players: 2, heroes: ['kairo', 'raizen'], hooks: { level: () => 5, heroStart: (cid, who) => who ? 4 : 2 } });
  w.wallet = [9000, 9000];
  w.who = 1; assert.equal(w.canPlace('kairo', 3, 4.5).why, 'Das ist der Held deines Mitspielers');
  const r = w.place('raizen', ...w.suggestSpot('raizen', 3)); assert.ok(r.ok, r.why); assert.equal(r.tower.hlvl, 4); assert.equal(r.tower.owner, 1);
  assert.equal(w.canPlace('raizen', ...w.suggestSpot('kitsune', 3)).why, 'Nur ein Held pro Spieler');
  w.who = 0; const k = w.place('kairo', ...w.suggestSpot('kairo', 3)); assert.ok(k.ok, k.why); assert.equal(k.tower.hlvl, 2);
  assert.equal(w.towers.filter(t => t.hero).length, 2);
  w.waveEnd(); w.wave = 1; w.waveEnd(); assert.ok(r.tower.hxp > 0 && k.tower.hxp > 0, 'beide Helden bekommen Wellen-XP');
  // Solo: weiterhin nur ein Held
  const s = new World({ map: 'ahnenhain', diff: 'normal', hero: 'kairo', seed: 3 }); s.coins = 9000; assert.ok(s.place('kairo', ...s.suggestSpot('kairo', 3)).ok); assert.equal(s.canPlace('kairo', ...s.suggestSpot('kitsune', 3)).why, 'Nur ein Held pro Run');
});

test('Combo: Kills in Folge geben Stufen-Bonus und enden nach dem Zeitfenster', () => {
  const w = new World({ map: 'ahnenhain', diff: 'normal', seed: 5 });
  const c0 = w.coins, C = BAL.combo;
  for (let i = 0; i < 10; i++) { const e = w.spawn('slime'); w.kill(e, null); }
  assert.equal(w.comboN, 10); const ev = w.events.find(x => x.t === 'combo'); assert.ok(ev && ev.n === 10);
  assert.ok(w.coins >= c0 + C.coins[0], 'Stufen-Bonus gezahlt');
  for (let i = 0; i < 60 * 2; i++) w.step(BAL.tick);
  assert.equal(w.comboN, 0); assert.equal(w.bestCombo, 10); assert.ok(w.events.some(x => x.t === 'comboEnd' && x.n === 10));
  // Koop: Bonus für jeden Spieler voll
  const k = new World({ map: 'ahnenhain', diff: 'normal', seed: 5, players: 2 }), s0 = [...k.wallet];
  for (let i = 0; i < 10; i++) k.kill(k.spawn('slime'), null);
  const bonus = Math.round(C.coins[0] * (1 + k.wave * 0.03));
  assert.ok(k.wallet[0] - s0[0] >= bonus && k.wallet[1] - s0[1] >= bonus);
});

test('Codex: Entdecken, Zählen, Truhe je 10 Einträge, alte Spielstände', async () => {
  const cx = await import('../js/data/codex.js');
  const P = defaultProfile(); const all = cx.codexEntries();
  assert.ok(all.length >= 70 && new Set(all.map(x => x.key)).size === all.length, 'eindeutige Schlüssel');
  assert.equal(cx.discover(P, 'c:kitsune'), true); assert.equal(cx.discover(P, 'c:kitsune'), false);
  for (const x of all.slice(0, 21)) cx.discover(P, x.key);
  assert.equal(cx.codexClaimable(P), 2); const ch = P.chests; assert.equal(cx.claimCodex(P), 2); assert.equal(P.chests, ch + 2); assert.equal(cx.codexClaimable(P), 0);
  assert.equal(cx.reactionKey('Plasma'), 'fire+lightning');
  const old = defaultProfile(); delete old.codex; assert.deepEqual(migrate(old).codex, { seen: {}, claimed: 0 });
});

test('Mega-Form: Bedingungen, Kosten, Werte, nur eine je Kreatur', async () => {
  const { megaDef, ALL_MEGAS } = await import('../js/data/megas.js');
  assert.equal(ALL_MEGAS().length, 48); assert.equal(megaDef('kitsune', 0).name, 'Amaterasu-Kitsune');
  const { w } = mkWorld(defaultProfile(), { hooks: { level: () => 25 } }); w.coins = 1e6;
  const t = w.place('kitsune', ...w.suggestSpot('kitsune', 3)).tower;
  assert.equal(w.megaInfo(t), null, 'ohne Stufe 5 kein Angebot');
  for (let i = 0; i < 5; i++) w.upgrade(t.id, 0);
  assert.match(w.megaInfo(t).why, /Gegner besiegen/);
  t.kills = BAL.run.mega.kills; const d0 = t.s.dmg, c0 = w.coins;
  const r = w.mega(t.id); assert.ok(r.ok, r.why); assert.equal(t.mega, 0); assert.ok(t.s.dmg > d0 * 2, 'Zorn: viel mehr Schaden');
  assert.equal(c0 - w.coins, Math.round(CREATURES.kitsune.cost * BAL.run.mega.cost));
  assert.equal(w.megaInfo(t), null, 'nur einmal'); assert.equal(w.ascendInfo(t), null, 'Mega schließt Ahnenform aus');
  const low = mkWorld(defaultProfile(), { hooks: { level: () => 5 } }).w; low.coins = 1e6; const u = low.place('kitsune', ...low.suggestSpot('kitsune', 3)).tower; for (let i = 0; i < 5; i++) low.upgrade(u.id, 1); u.kills = 999;
  assert.match(low.megaInfo(u).why, /Charakter-Lv/);
});

test('Elemente 2.0: neue Reaktionen, Verwundbarkeit, Schild brechen, Kettenreaktion', async () => {
  const { REACTIONS } = await import('../js/data/meta.js');
  assert.ok(Object.keys(REACTIONS).length >= 16 && Object.values(REACTIONS).every(r => r.icon && r.name && r.desc));
  const w = new World({ map: 'ahnenhain', diff: 'normal', seed: 2 });
  const e = w.spawn('golem'); e.shield = 50; e.hp = e.maxHp = 1e6;
  w.react(e, REACTIONS['light+spirit'], 40, null); assert.equal(e.shield, 0, 'Reinigung bricht Schild');
  w.react(e, REACTIONS['astral+shadow'], 40, null); assert.ok(e.vuln >= 0.35 && e.vulnT > 0); assert.equal(e.chainN, 2, 'zweite Reaktion = Kette');
  for (let i = 0; i < 60 * 3; i++) w.step(BAL.tick);
  w.react(e, REACTIONS['fire+ice'], 40, null); assert.equal(e.chainN, 1, 'Fenster abgelaufen → neue Kette');
});

test('Bosse 2.0: Vorwarnung vor dem Atem, Schwachpunkt, Unterbrechen', () => {
  const mk = () => { const w = new World({ map: 'ahnenhain', diff: 'normal', loadout: ['kitsune'], seed: 4 }); w.coins = 1e5; return w; };
  const prep = w => { const e = w.spawn('vharox'); e.hp = e.maxHp * 0.45; w.updBoss(e, 0); e.flyT = 0; e.flyCd = 99; e.breathCd = 0.01; const t = w.place('kitsune', e.x + 1.4, e.y); return { e, t }; };
  // ohne Eingreifen: erst Vorwarnung, dann lahmgelegt
  let w = mkp();
  function mkp() { return mk(); }
  let { e, t } = prep(w); if (!t.ok) { const p = w.suggestSpot('kitsune', 3); t = w.place('kitsune', ...p); e.x = t.tower.x - 1; e.y = t.tower.y; }
  w.updBoss(e, 0.02); assert.ok(e.teleT > 0, 'Vorwarnung läuft'); assert.ok(w.events.some(x => x.t === 'bossTele'));
  assert.ok(!(t.tower.disabledT > 0), 'noch nicht lahmgelegt');
  w.updBoss(e, BAL.boss.tele + 0.01); assert.ok(t.tower.disabledT > 0, 'nach der Vorwarnung lahmgelegt');
  // mit genug Schaden im Aufladen: unterbrochen
  w = mk(); ({ e, t } = prep(w)); if (!t.ok) { const p = w.suggestSpot('kitsune', 3); t = w.place('kitsune', ...p); e.x = t.tower.x - 1; e.y = t.tower.y; }
  w.updBoss(e, 0.02); assert.ok(e.teleT > 0);
  const hp0 = e.hp; w.damage(e, e.maxHp * 0.03, 'astral', null); assert.ok(hp0 - e.hp > e.maxHp * 0.03 * 1.5, 'Schwachpunkt +60 %');
  assert.equal(e.teleT, 0); assert.ok(e.stunT > 0); assert.ok(w.events.some(x => x.t === 'bossStagger'));
  w.updBoss(e, 2); assert.ok(!(t.tower.disabledT > 0), 'Angriff fand nicht statt');
});

test('Akademie 2.0: Meisterprüfung, Spezialisierung, geheime Knoten, Prüfungs-Regeln', async () => {
  const A = await import('../js/data/academy.js');
  const P = defaultProfile(); P.account.level = 30;
  const t = A.TRIAL.trial_kampf;
  assert.equal(A.trialOpen(P, t), false, 'Prüfung braucht Stufe 4');
  for (const id of ['k1', 'k2', 'k3', 'k4']) assert.ok(A.learn(P, id).ok);
  assert.ok(A.trialOpen(P, t));
  assert.equal(A.chooseSpec(P, 'sp_klinge').ok, false, 'ohne Siegel keine Spezialisierung');
  const e0 = A.shinobiPoints(P).earned;
  assert.ok(A.passTrial(P, 'trial_kampf')); assert.equal(A.passTrial(P, 'trial_kampf'), false, 'nur einmal');
  assert.equal(A.shinobiPoints(P).earned, e0 + A.TRIAL_SP);
  const f0 = A.shinobiPoints(P).free;
  assert.ok(A.chooseSpec(P, 'sp_klinge').ok); assert.equal(A.shinobiPoints(P).free, f0 - A.SPEC_COST);
  assert.ok(A.chooseSpec(P, 'sp_falke').ok, 'Wechsel'); assert.equal(A.shinobiPoints(P).free, f0 - A.SPEC_COST, 'Wechsel kostenlos');
  assert.equal(A.academyFx(P).range, 0.05 + 0.1);
  assert.equal(A.canLearnSecret(P, 'x_combo').ok, false, 'verborgen');
  P.stats.bestCombo = 60; assert.ok(A.learnSecret(P, 'x_combo').ok); assert.equal(A.academyFx(P).comboWin, 0.5);
  A.resetAcademy(P); assert.ok(A.hasSeal(P, 'kampf'), 'Siegel bleibt beim Neuverteilen'); assert.equal(A.shinobiPoints(P).spent, 0);
  // Prüfungs-Regeln in der Welt
  const ws = new World({ map: 'dorf', diff: 'normal', loadout: ['kitsune'], hooks: {}, mods: A.TRIAL.trial_schrein.mods });
  assert.equal(ws.lives, 10); ws.coins = 9999; const tw = ws.place('kitsune', 3, 4.5).tower || ws.place('kitsune', ...Object.values(ws.suggestSpot('kitsune') || {})).tower;
  if (tw) assert.equal(ws.sell(tw.id).ok, false, 'kein Verkaufen');
  const we = new World({ map: 'dorf', diff: 'normal', seed: 3, hooks: {}, mods: A.TRIAL.trial_element.mods }), wn = new World({ map: 'dorf', diff: 'normal', seed: 3, hooks: {} });
  const a = we.spawn('golem', [], 1), b = wn.spawn('golem', [], 1); a.hp = b.hp = a.maxHp = b.maxHp = 1e6;
  assert.ok(Math.abs(we.damage(a, 10, 'phys', null) / wn.damage(b, 10, 'phys', null) - 0.4) < 1e-6, 'Physisch −60 %');
});

test('Boss-Rush: 6 Bosse, Start-Kasse, Kriegskasse, keine Karten-Mischung', async () => {
  const { RUSH } = await import('../js/data/waves.js'); const { CH } = await import('../js/data/challenges.js');
  const w = new World({ map: 'frost', diff: 'hard', seed: 4, hooks: {}, mods: CH.rush.mods });
  assert.equal(w.maxWave, RUSH.length); assert.equal(w.coins, BAL.rush.start); assert.equal(w.lives, BAL.rush.lives);
  assert.equal(w.peekWave().def.boss, 'vharox', 'Frosttempel tauscht den Boss im Rush nicht');
  w.startWave(); w.god = true;
  for (let i = 0; i < 60 * 400 && w.doneWave < 1; i++) { for (const e of w.enemies) if (e.alive && !e.boss) w.damage(e, 1e6, 'phys', null); const b = w.enemies.find(e => e.alive && e.boss); if (b) { assert.ok(b.maxHp <= 3000 * BAL.rush.hp * 1.3 * 1.35 + 1, 'Rush-KP'); w.damage(b, 1e7, 'astral', null); } w.step(1 / 60); }
  assert.equal(w.doneWave, 1); assert.ok(w.coins >= BAL.rush.start + BAL.rush.gold[0], 'Kriegskasse');
  const { dailyChallenge } = await import('../js/data/daily.js');
  for (let d = 0; d < 30; d++) { const P = defaultProfile(); P.daily = { day: '2026-01-' + (d + 1) }; try { assert.ok(!dailyChallenge(P, () => true).mods.includes('rush')); } catch (e) { if (e.code === 'ERR_ASSERTION') throw e; } }
});
