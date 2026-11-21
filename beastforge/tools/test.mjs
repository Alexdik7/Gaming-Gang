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
