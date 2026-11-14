// Tests der wichtigen Systeme (ohne Browser): node --test cats/tools/test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE } from '../js/config.js';
import { CATS, CAT_IDS } from '../js/data/cats.js';
import { DOGS, DOG_IDS } from '../js/data/dogs.js';
import { MAPS } from '../js/data/maps.js';
import { POWERUPS, RESEARCH, MISSIONS } from '../js/data/meta.js';
import { calcDamage } from '../js/sim/damage.js';
import { buildMap, canBuild, posAt } from '../js/sim/maps.js';
import { waveHp, buildWave, scaleEnemy, isBossWave } from '../js/sim/waves.js';
import { computeStats, canUpgrade, upgradeCost, describeFx, NO_BONUS } from '../js/sim/upgrades.js';
import { World } from '../js/sim/world.js';
import { SaveManager, defaultSave } from '../js/meta/save.js';
import { addXp, calcRewards, unlocksAt, diffUnlocked, playerBonus, playerSetup } from '../js/meta/progression.js';
import { buyCat, buyResearch, buyRank, buyPower, grant, pay } from '../js/meta/currency.js';
import { ensureMissions, bumpStats, claimMission, dailyState, claimDaily, achState, claimAch, finishRound } from '../js/meta/missions.js';
import { sanitizeSetup, packState, NetView, cleanCode } from '../js/net/multiplayer.js';

const mem = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }; };
const dog = o => Object.assign({ armor: 0, shield: 0, res: null }, o);
const world = (o = {}) => new World(Object.assign({ mapId: 'city', diff: 'normal', players: [{ id: 'a', loadout: CAT_IDS }], seed: 3 }, o));
const run = (W, sec) => { for (let i = 0; i < sec * 30; i++) W.step(1 / 30); };

test('Schaden: Rüstung, Durchschlag, Resistenz, Schild', () => {
  assert.equal(calcDamage(10, 'phys', dog({})).hp, 10);
  assert.equal(calcDamage(10, 'phys', dog({ armor: 4 })).hp, 6);
  assert.equal(calcDamage(3, 'phys', dog({ armor: 10 })).hp, 3 * BALANCE.minArmorDmg);          // Mindestschaden
  assert.equal(calcDamage(10, 'phys', dog({ armor: 4 }), { pen: 0.5 }).hp, 8);
  assert.equal(calcDamage(10, 'fire', dog({ armor: 99 })).hp, 10);                               // Feuer ignoriert Rüstung
  assert.ok(Math.abs(calcDamage(10, 'fire', dog({ res: { fire: 0.9 } })).hp - 1) < 1e-9);
  assert.equal(calcDamage(10, 'boom', dog({ armor: 4 })).hp, 8);                                 // Explosion: halbe Rüstung
  const s = calcDamage(10, 'phys', dog({ shield: 6 })); assert.equal(s.shield, 6); assert.equal(s.hp, 4);
  const v = calcDamage(10, 'volt', dog({ shield: 30 })); assert.equal(v.shield, 20); assert.equal(v.hp, 0);   // Blitz ×2 gegen Schild
  assert.equal(calcDamage(10, 'shadow', dog({ shield: 30 })).hp, 10);                            // Schatten ignoriert Schild
  assert.equal(calcDamage(10, 'phys', dog({ boss: true }), { bossDmg: 1 }).hp, 20);
  assert.equal(calcDamage(10, 'phys', dog({ vulnT: 1, vulnV: 0.2 })).hp, 12);
  assert.equal(calcDamage(10, 'phys', dog({ armor: 4, shredT: 1, shredV: 3 })).hp, 9);
});

test('Daten sind vollständig und stimmig', () => {
  assert.ok(CAT_IDS.length >= 19);
  for (const id of CAT_IDS) {
    const c = CATS[id];
    assert.equal(c.paths.length, 3, id);
    for (const p of c.paths) { assert.equal(p.tiers.length, 3, id); for (const t of p.tiers) { assert.ok(t[2] > 0); assert.ok(!describeFx(t[3], 0).match(/\b[a-z]+[A-Z]\w*\b/), id + ': unbeschriebener Effekt ' + describeFx(t[3], 0)); } }
    assert.ok(c.unlock.lvl >= 1 && c.cost > 0 && c.look.fur, id);
  }
  for (const id of DOG_IDS) { const d = DOGS[id]; assert.ok(d.hp > 0 && d.speed > 0 && d.look, id); if (d.spawn) assert.ok(DOGS[d.spawn[0]]); }
  assert.equal(MAPS.length, 10);
  for (const m of MAPS) {
    const map = buildMap(m); assert.ok(DOGS[m.boss].boss, m.id);
    let free = 0; for (let y = 0; y < 16; y++) for (let x = 0; x < 12; x++) if (canBuild(map, x, y)) free++;
    assert.ok(free > 60, m.id + ' hat zu wenig Bauplatz: ' + free);
    for (const p of map.paths) { assert.ok(p.len > 15, m.id); const o = {}; posAt(p, p.len / 2, o); assert.ok(Number.isFinite(o.x)); }
    for (const [x, y] of [...(m.high || []), ...(m.power || [])]) assert.ok(canBuild(map, x, y), `${m.id}: Bonusfeld ${x},${y} nicht bebaubar`);
  }
  for (const m of MISSIONS) assert.equal(m.n.length, 3);
});

test('Gegner-Skalierung ist nicht linear und hängt von Stufe und Spielerzahl ab', () => {
  assert.equal(waveHp(1), 1);
  const d1 = waveHp(11) - waveHp(10), d2 = waveHp(31) - waveHp(30);
  assert.ok(d2 > d1 * 1.5, 'später steilerer Anstieg');
  const e = scaleEnemy(DOGS.mutt, 10, { diff: 'easy' }), n = scaleEnemy(DOGS.mutt, 10, { diff: 'normal' }), h = scaleEnemy(DOGS.mutt, 10, { diff: 'hard' });
  assert.ok(e.hp < n.hp && n.hp < h.hp);
  const p2 = scaleEnemy(DOGS.mutt, 10, { players: 2 }), p4 = scaleEnemy(DOGS.mutt, 10, { players: 4 });
  assert.ok(Math.abs(p2.hp / n.hp - 1.6) < 0.05 && Math.abs(p4.hp / n.hp - 2.9) < 0.05);
  assert.ok(scaleEnemy(DOGS.pug, 30).armor > DOGS.pug.armor);
});

test('Wellen: fester Einstieg, Bosse, mehr Bedrohung, gleiche Welle = gleicher Inhalt', () => {
  const m = MAPS[0];
  assert.deepEqual(buildWave(1, m).groups.map(g => g.type), ['mutt']);
  assert.ok(isBossWave(10, 30) && isBossWave(30, 30) && !isBossWave(7, 30));
  assert.equal(buildWave(30, m, { total: 30 }).boss, m.boss);
  assert.equal(buildWave(20, m, { total: 30 }).boss, 'alpha');
  assert.deepEqual(buildWave(17, m), buildWave(17, m));
  const threat = w => { const x = buildWave(w, m); return x.groups.reduce((a, g) => a + g.count * DOGS[g.type].hp * (DOGS[g.type].boss ? 0 : 1), 0) * waveHp(w) * x.dense; };
  assert.ok(threat(25) > threat(12) * 2 && threat(12) > threat(6));
  for (let w = 1; w <= 100; w++) { const x = buildWave(w, MAPS[w % 10], { total: 1e9 }); assert.ok(x.groups.length > 0); for (const g of x.groups) assert.ok(DOGS[g.type].boss || DOGS[g.type].from <= w, `W${w}: ${g.type} zu früh`); }
  assert.ok(buildWave(9, m, { players: 4 }).groups[0].count > buildWave(9, m).groups[0].count);
});

test('Upgrades: Werte, Punkte-Regel, nur ein Meisterpfad', () => {
  const s = CATS.scout, base = computeStats(s, [0, 0, 0]);
  assert.equal(base.dmg, 6);
  assert.equal(computeStats(s, [1, 0, 0]).dmg, 9);
  assert.ok(computeStats(s, [0, 0, 1]).detect);
  assert.equal(computeStats(s, [0, 2, 0]).shots, 1);
  assert.equal(canUpgrade(s, [3, 0, 0], 0), 'max');
  assert.equal(canUpgrade(s, [3, 2, 0], 2), 'points');           // 5 Punkte verbraucht
  assert.equal(canUpgrade(s, [3, 1, 0], 1), null);
  assert.equal(canUpgrade(s, [3, 2, 0], 1), 'points');
  assert.equal(canUpgrade(s, [2, 2, 0], 2), null);
  const rank10 = { ...NO_BONUS, rank: { scout: 10 } };
  assert.equal(canUpgrade(s, [3, 2, 0], 2, rank10), null);        // Rang 10 = 6. Punkt
  assert.equal(canUpgrade(s, [3, 2, 0], 1, rank10), 'master');    // zweiter Meisterpfad bleibt verboten
  assert.ok(computeStats(s, [0, 0, 0], rank10).dmg > base.dmg);
  assert.ok(upgradeCost(s, [0, 0, 0], 0, { ...NO_BONUS, veteran: 0.24 }) < upgradeCost(s, [0, 0, 0], 0, NO_BONUS));
});

test('Runde: platzieren, bezahlen, kämpfen, gewinnen und verlieren', () => {
  const W = world(), P = W.players[0];
  assert.equal(P.fish, BALANCE.startFish);
  assert.equal(W.cmd(0, { t: 'place', cat: 'scout', x: 0, y: 2 }).err, 'tile');             // Weg
  assert.equal(W.cmd(0, { t: 'place', cat: 'nyx', x: 3, y: 3 }).err, 'fish');
  const r = W.cmd(0, { t: 'place', cat: 'scout', x: 3, y: 3 });
  assert.ok(r.ok); assert.equal(P.fish, BALANCE.startFish - 100);
  assert.equal(W.cmd(0, { t: 'place', cat: 'scout', x: 3, y: 3 }).err, 'tile');             // besetzt
  assert.ok(W.cmd(0, { t: 'upgrade', id: r.id, path: 0 }).ok);
  assert.equal(P.fish, BALANCE.startFish - 170);
  assert.equal(W.cmd(0, { t: 'upgrade', id: 999, path: 0 }).err, 'tower');
  W.cmd(0, { t: 'place', cat: 'scout', x: 5, y: 3 });
  assert.ok(W.cmd(0, { t: 'start' }).ok); assert.equal(W.cmd(0, { t: 'start' }).err, 'phase');
  run(W, 40);
  assert.equal(W.phase, 'build'); assert.equal(W.stats.kills, 6); assert.ok(P.fish > BALANCE.startFish - 270);
  const before = P.fish; W.cmd(0, { t: 'sell', id: r.id }); assert.equal(P.fish, before + Math.round(170 * BALANCE.sellRefund));
  // ohne Verteidigung verliert man
  const L = world(); for (let i = 0; i < 12 && !L.over; i++) { L.cmd(0, { t: 'start' }); run(L, 90); }
  assert.equal(L.phase, 'lost'); assert.equal(L.result.win, false); assert.ok(L.result.livesLost >= 20);
});

test('Runde: Sieg auf Leicht mit starkem Team, Boss wird gezählt', () => {
  const W = world({ diff: 'easy' }), P = W.players[0]; P.fish = 1e6;
  const team = ['laser', 'rocket', 'tesla', 'shadow', 'ice', 'laser', 'ninja', 'rocket', 'laser', 'commander']; let k = 0;
  for (let y = 1; y < 16 && k < team.length; y += 2) for (let x = 1; x < 12 && k < team.length; x += 3) {
    const r = W.cmd(0, { t: 'place', cat: team[k], x, y }); if (!r.ok) continue; k++;
    for (let i = 0; i < 3; i++) W.cmd(0, { t: 'upgrade', id: r.id, path: 0 }); W.cmd(0, { t: 'upgrade', id: r.id, path: 1 }); W.cmd(0, { t: 'upgrade', id: r.id, path: 1 });
  }
  assert.equal(k, team.length);
  for (let i = 0; i < 20 && !W.over; i++) { W.cmd(0, { t: 'start' }); run(W, 240); W.drain(); }
  assert.equal(W.phase, 'won'); assert.ok(W.result.bossKills >= 2); assert.equal(W.result.wave, 20);
});

test('Power-ups: begrenzt, Abklingzeit, Wirkung', () => {
  const W = world({ players: [{ id: 'a', loadout: ['scout'], powers: { megapaw: 9, heal: 1, freeze: 2 } }] });
  assert.equal(W.players[0].powers.megapaw, 3);                                              // höchstens 3 je Runde
  assert.equal(W.cmd(0, { t: 'power', id: 'heal' }).err, 'full');
  assert.equal(W.cmd(0, { t: 'power', id: 'catnip' }).err, 'none');
  W.cmd(0, { t: 'start' }); run(W, 4);
  const n = W.enemies.list.length; assert.ok(n > 0);
  const e = W.enemies.list[0];
  assert.ok(W.cmd(0, { t: 'power', id: 'megapaw', x: e.x, y: e.y }).ok);
  assert.ok(W.stats.kills > 0);
  assert.equal(W.cmd(0, { t: 'power', id: 'megapaw', x: 1, y: 1 }).err, 'cooldown');
  assert.ok(W.cmd(0, { t: 'power', id: 'freeze' }).ok);
  run(W, 0.1); assert.ok(W.enemies.list.every(x => x.stunT > 0));
});

test('Spezial-Mechaniken: Tarnung, Schild, Rudel, Sichtbarkeit', () => {
  const W = world(); W.wave = 12; W.players[0].fish = 1e5;
  const a = W.cmd(0, { t: 'place', cat: 'gunner', x: 3, y: 1 });
  const s = W.enemies.spawn('sneak', 0, 3); run(W, 3);
  assert.equal(s.hp, s.maxHp, 'getarnter Hund darf nicht getroffen werden');
  W.cmd(0, { t: 'place', cat: 'ninja', x: 5, y: 1 }); run(W, 6);
  assert.ok(s.dead || s.hp < s.maxHp, 'Ninja sieht Getarnte');
  const p = W.enemies.spawn('pack', 0, 2); const kills = W.stats.kills; W.enemies.kill(p, null);
  assert.equal(W.enemies.list.filter(e => e.type === 'pup' && !e.dead).length, 3);
  assert.equal(W.stats.kills, kills + 1);
});

test('Währungen und Käufe', () => {
  const s = defaultSave();
  assert.equal(buyCat(s, 'ice'), 'level');
  s.level = 2; s.coins = 100; assert.equal(buyCat(s, 'ice'), 'money');
  s.coins = 1000; assert.equal(buyCat(s, 'ice'), null); assert.equal(s.coins, 750); assert.ok(s.cats.ice);
  assert.equal(buyCat(s, 'ice'), 'owned');
  assert.equal(buyCat(s, 'sphinx'), 'level');
  assert.equal(pay(s, { coins: 1e9 }), false); assert.equal(s.coins, 750);
  const c0 = s.coins; assert.equal(buyResearch(s, 'claws'), null); assert.ok(s.coins < c0); assert.equal(s.research.claws, 1);
  assert.ok(Math.abs(playerBonus(s).dmg - RESEARCH.claws.eff) < 1e-9);
  s.coins = 1e7; for (let i = 0; i < 20; i++) buyResearch(s, 'claws'); assert.equal(s.research.claws, RESEARCH.claws.max);
  assert.equal(buyRank(s, 'scout'), 'level'); s.level = 3; assert.equal(buyRank(s, 'scout'), null); assert.equal(s.cats.scout.r, 1);
  const n = s.powers.megapaw; assert.equal(buyPower(s, 'megapaw'), null); assert.equal(s.powers.megapaw, n + 1);
  assert.equal(buyPower(s, 'emergency'), 'level');
  const g = grant(s, { power: 3 }, () => 0); assert.equal(Object.values(g.powers).reduce((a, b) => a + b, 0), 3);
});

test('Level, Freischaltungen, Belohnungen', () => {
  const s = defaultSave();
  assert.deepEqual(addXp(s, BALANCE.xpNeed(1) + 5), [2]); assert.equal(s.level, 2); assert.equal(s.xp, 5);
  assert.ok(unlocksAt(2).some(u => u.kind === 'cat' && u.id === 'ice') && unlocksAt(2).some(u => u.kind === 'map'));
  assert.equal(diffUnlocked(s, 'city', 'hard'), false);
  s.level = 6; s.maps.city = { normal: 1 }; assert.equal(diffUnlocked(s, 'city', 'hard'), true);
  assert.equal(diffUnlocked(s, 'station', 'easy'), false);
  const res = d => ({ win: true, mode: 'campaign', mapId: 'city', diff: d, wave: BALANCE.difficulty[d].waves, kills: 400, bossKills: 2, eliteKills: 0, livesLost: 0, perfect: true, players: 1, per: [{ id: s.uid, placed: 5, upgrades: 9, powerUsed: 0 }] });
  const e = calcRewards(res('easy'), s), n = calcRewards(res('normal'), s), h = calcRewards(res('hard'), s);
  assert.ok(e.coins < n.coins && n.coins < h.coins && e.crystals < n.crystals && n.crystals < h.crystals);
  assert.ok(h.coins / h.xp > 0 && h.coins < n.coins * 4, 'Schwer lohnt sich, macht Normal aber nicht sinnlos');
  assert.ok(calcRewards({ ...res('normal'), win: false, wave: 12 }, s).coins > 0, 'auch Niederlagen bringen etwas');
  assert.ok(calcRewards({ ...res('normal'), players: 4 }, s).coins > n.coins);
});

test('Missionen, tägliche Belohnung, Erfolge', () => {
  const s = defaultSave(), day = new Date(2026, 5, 1, 10).getTime();
  assert.ok(ensureMissions(s, day)); assert.equal(s.missions.list.length, 3);
  const ids = s.missions.list.map(m => m.id);
  assert.equal(ensureMissions(s, day + 3600e3), false);                                       // gleicher Tag
  assert.ok(ensureMissions(s, day + 24 * 3600e3));                                            // neuer Tag
  s.missions.list = [{ id: 'kill', n: 200, p: 0, claimed: false, mul: 1 }];
  bumpStats(s, { kills: 150 }); assert.equal(claimMission(s, 0), null);
  bumpStats(s, { kills: 100 }); assert.equal(s.missions.list[0].p, 200);
  const c = s.coins; assert.ok(claimMission(s, 0)); assert.equal(s.coins, c + 300); assert.equal(claimMission(s, 0), null);
  // täglich
  assert.ok(dailyState(s, day).ready); const got = claimDaily(s, day); assert.equal(got.coins, 200);
  assert.equal(claimDaily(s, day + 3600e3), null);
  const st = dailyState(s, day + 3600e3); assert.ok(!st.ready && st.msLeft > 18 * 3600e3);
  assert.equal(claimDaily(s, day + 21 * 3600e3).crystals, 3); assert.equal(s.daily.streak, 2);
  assert.equal(dailyState(s, day + 21 * 3600e3 + 50 * 3600e3).day, 0, 'Serie reißt nach 48 h');
  // Erfolge
  s.stats.kills = 1200; const a = achState(s).find(x => x.a.id === 'hunter'); assert.ok(a.ready);
  const cr = s.crystals; assert.ok(claimAch(s, 'hunter')); assert.equal(s.crystals, cr + 5); assert.equal(claimAch(s, 'hunter'), null);
  // Rundenende
  const r = { win: true, mode: 'campaign', mapId: 'city', diff: 'easy', wave: 20, wavesTotal: 20, kills: 300, bossKills: 2, eliteKills: 0, livesLost: 0, perfect: true, players: 1, per: [{ id: s.uid, placed: 4, upgrades: 6, powerUsed: 1 }] };
  const f1 = finishRound(s, r); assert.ok(f1.first && f1.crystals > 0); assert.equal(s.maps.city.easy, 1); assert.equal(s.stats.wins, 1); assert.equal(s.stats.perfectWins, 1);
  assert.equal(finishRound(s, r).first, false);
});

test('Spielstand: speichern, laden, beschädigte Daten, Umzugs-Code', () => {
  const st = mem(), A = new SaveManager(st); A.load(); A.data.coins = 777; A.data.cats.ice = { r: 2 }; assert.ok(A.save());
  A.data.coins = 888; A.save();
  const B = new SaveManager(st); assert.equal(B.load().coins, 888);
  st.setItem('ctd.save', '{kaputt');                                                          // Hauptkopie beschädigt
  const C = new SaveManager(st); assert.equal(C.load().coins, 777); assert.ok(C.recovered);
  st.setItem('ctd.save', JSON.stringify({ c: 'falsch', d: JSON.stringify({ cats: {}, coins: 1e9 }) }));   // manipuliert: Prüfsumme passt nicht
  assert.equal(new SaveManager(st).load().coins, 777);
  const old = { v: 1, cats: { scout: { r: 0 } }, coins: 5 };                                  // alter Spielstand ohne neue Felder
  const D = new SaveManager(mem()); D.data = old; const code = (D.data = Object.assign(defaultSave(), old), D.exportCode());
  const E = new SaveManager(mem()); assert.ok(E.importCode(code)); assert.equal(E.data.coins, 5); assert.ok(E.data.settings && E.data.missions);
  assert.equal(E.importCode('CTD1.x.y'), false); assert.equal(E.importCode(code.slice(0, -4) + 'AAAA'), false);
  assert.ok(playerSetup(E.data).loadout.length >= 1);
});

test('Mehrspieler: Gastgeber prüft alles, Zustand lässt sich übertragen', () => {
  const cheat = sanitizeSetup({ id: 'x', name: '<b>Hacker</b>', loadout: ['nyx', 'nyx', 'gibtsnicht'], powers: { megapaw: 999 }, bonus: { dmg: 50, rank: { scout: 99 } } });
  assert.ok(cheat.bonus.dmg <= 0.2001 && cheat.bonus.rank.scout === 10 && cheat.powers.megapaw === 3 && !cheat.name.includes('<'));
  assert.deepEqual(cheat.loadout, ['nyx']);
  const W = world({ players: [sanitizeSetup({ id: 'a', loadout: ['scout'] }), sanitizeSetup({ id: 'b', loadout: ['bomb'] })] });
  assert.equal(W.cmd(1, { t: 'place', cat: 'scout', x: 3, y: 3 }).err, 'cat');               // nicht im eigenen Trupp
  const r = W.cmd(0, { t: 'place', cat: 'scout', x: 3, y: 3 });
  assert.equal(W.cmd(1, { t: 'upgrade', id: r.id, path: 0 }).err, 'tower');                   // fremde Katze
  assert.equal(W.cmd(1, { t: 'sell', id: r.id }).err, 'tower');
  assert.equal(W.cmd(1, { t: 'gift', to: 0, n: 1e9 }).err, 'gift');
  const f = W.players[1].fish; assert.ok(W.cmd(1, { t: 'gift', to: 0, n: 50 }).ok); assert.equal(W.players[1].fish, f - 50);
  assert.equal(W.cmd(5, { t: 'start' }).err, 'over');
  W.cmd(0, { t: 'start' }); run(W, 5);
  const snap = JSON.parse(JSON.stringify(packState(W)));
  const V = new NetView({ mapId: 'city', diff: 'normal', mode: 'campaign', players: W.players.map(p => ({ id: p.id, name: p.name, loadout: p.loadout, bonus: p.bonus, powers: p.powers })) });
  V.apply(snap);
  assert.equal(V.towers.list.length, 1); assert.equal(V.enemies.list.length, W.enemies.list.length); assert.equal(V.players[1].fish, Math.floor(W.players[1].fish));
  assert.equal(V.towers.list[0].stats.dmg, 6); assert.equal(V.wave, 1);
  // Mehr Spieler = stärkere Gegner
  const solo = world(); solo.wave = 8; W.wave = 8;
  assert.ok(W.enemies.spawn('mutt', 0).maxHp > solo.enemies.spawn('mutt', 0).maxHp * 1.5);
  assert.equal(cleanCode('cat-4821'), 'CAT-4821'); assert.equal(cleanCode('12'), null);
});

test('Leistung: 300 Hunde und 40 Katzen laufen flüssig', () => {
  const W = world(); W.wave = 20; W.players[0].fish = 1e7; let n = 0;
  for (let y = 0; y < 16 && n < 40; y++) for (let x = 0; x < 12 && n < 40; x++) if (W.cmd(0, { t: 'place', cat: CAT_IDS[n % 17], x, y }).ok) n++;
  for (let i = 0; i < 300; i++) W.enemies.spawn(DOG_IDS[i % 18], 0, i * 0.1);
  W.phase = 'wave';
  const t0 = performance.now(); let steps = 0;
  for (; steps < 300; steps++) { W.step(1 / 60); W.events.length = 0; }
  const ms = (performance.now() - t0) / steps;
  assert.ok(ms < 4, `ein Zeitschritt braucht ${ms.toFixed(2)} ms`);
});
