// Browser-Test (Playwright): node beastforge/tools/e2e.cjs [boot|run|menus|all] [ordner-für-screenshots]
// Vorher: cd beastforge && python3 -m http.server 8055
const { chromium } = require('playwright');
const URL = process.env.BF_URL || 'http://localhost:8055/index.html';
const [which = 'all', shots] = process.argv.slice(2);
const assert = (ok, msg) => { if (!ok) throw new Error('FEHLER: ' + msg); };
async function open(browser, q = '', vp = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  ctx.setDefaultTimeout(15000);
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|fonts\.g|ERR_/.test(m.text())) p.errs.push(m.text()); });
  await p.goto(URL + q); await p.waitForFunction(() => window.BF && document.getElementById('boot').style.display === 'none', null, { timeout: 30000 });
  await p.waitForTimeout(600);
  return p;
}
const LAND = { width: 844, height: 390 };
const shot = async (p, n) => { if (shots) await p.screenshot({ path: `${shots}/${n}.png` }); };
const S = {
  async boot(b) { const p = await open(b); await shot(p, 'b1_home'); assert((await p.evaluate(() => BF.models().length)) >= 32, '3D-Modelle geladen'); assert(!p.errs.length, p.errs.join(' | ')); await p.context().close(); },
  async menus(b) {
    const p = await open(b, '', LAND);
    await p.evaluate(() => { BF.level(16); BF.profile.account.level = 8; BF.profile.chars.kitsune.mastery = 3; BF.app.refreshShowcase(); BF.menu('home'); });
    await p.waitForTimeout(500); await shot(p, 'm1_home');
    for (const s of ['collection', 'hero', 'account', 'ach', 'stats', 'settings', 'play']) { await p.evaluate(n => BF.menu(n), s); await p.waitForTimeout(700); await shot(p, 'm_' + s); }
    await p.click('[data-map=ahnenhain]'); await p.waitForTimeout(1200); await shot(p, 'm_diff');
    await p.evaluate(() => BF.menu('academy')); await p.click('[data-n=k1]'); await p.click('#alearn'); await p.waitForTimeout(300); await shot(p, 'm_academy');
    assert(await p.evaluate(() => !!BF.profile.academy.owned.k1), 'Akademie: Knoten erlernt');
    await p.evaluate(() => BF.menu('collection')); await p.click('[data-c=kitsune]'); await p.waitForTimeout(800); await shot(p, 'm_kitsune');
    await p.click('[data-f=shadow]'); await p.waitForTimeout(500);
    await p.click('[data-branch=shadow]'); assert(await p.evaluate(() => BF.profile.chars.kitsune.branch) === 'shadow', 'Zweig gewählt');
    await p.click('[data-tab=paths]'); await p.waitForTimeout(200); await shot(p, 'm_kitsune_paths');
    await p.click('[data-tab=mastery]'); await p.click('[data-skin="1"]'); assert(await p.evaluate(() => BF.profile.chars.kitsune.skin) === 1, 'Skin gewählt');
    await p.evaluate(() => { BF.start('normal'); BF.world.coins = 99999; BF.put('kitsune'); BF.put('raven'); BF.world.startWave(); });
    await p.evaluate(() => { const w = BF.world; for (let i = 0; i < 60 * 30; i++) w.step(1 / 60); w.wave = 20; w.doneWave = 19; w.spawners = []; w.enemies = []; });
    await p.waitForTimeout(3500); await p.waitForSelector('.res', { timeout: 8000 }); await p.waitForTimeout(1300); await shot(p, 'm_results');
    assert(await p.evaluate(() => BF.profile.stats.wins) === 1, 'Sieg gezählt');
    assert(!p.errs.length, p.errs.join(' | '));
    await p.context().close();
  },
  async port(b) {
    const p = await open(b);
    await p.evaluate(() => { BF.start('normal'); BF.world.coins = 9999; BF.put('kitsune'); BF.put('turtle', 1.7); BF.world.startWave(); });
    await p.waitForTimeout(2500); await shot(p, 'p1_turn');
    assert(await p.evaluate(() => getComputedStyle(document.getElementById('turn')).display !== 'none'), 'Dreh-Hinweis im Hochformat');
    await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(600);
    assert(await p.evaluate(() => getComputedStyle(document.getElementById('turn')).display === 'none'), 'Kein Hinweis im Querformat');
    await p.evaluate(() => BF.game.select(BF.world.towers[0])); await p.waitForTimeout(500); await shot(p, 'p2_panel');
    assert(!p.errs.length, p.errs.join(' | '));
    await p.context().close();
  },
  async dorf(b) {
    const p = await open(b, '', LAND);
    await p.evaluate(() => { BF.profile.account.level = 12; BF.level(26); BF.profile.hero = 'raizen'; BF.menu('play'); });
    await p.waitForTimeout(900); await shot(p, 'd0_world');
    await p.click('[data-map=dorf]'); await p.waitForTimeout(900); await shot(p, 'd1_panel');
    await p.click('[data-hero=mika]'); assert(await p.evaluate(() => BF.profile.hero) === 'mika', 'Heldin gewählt');
    await p.click('[data-hero=raizen]');
    await p.click('#go'); await p.waitForFunction(() => window.BF.game && document.getElementById('boot').style.display === 'none', null, { timeout: 20000 });
    await p.evaluate(() => { const w = BF.world; w.coins = 99999; for (const c of ['dragonwolf', 'mantis', 'golem', 'raizen', 'kitsune']) BF.put(c, 2.2); for (const t of w.towers) if (!t.hero) { w.evolve(t.id); w.evolve(t.id); } w.startWave(); BF.game.speed = 3; });
    await p.waitForTimeout(3000); await shot(p, 'd2_game');
    await p.evaluate(() => { const w = BF.world; for (const t of w.towers) for (const a of w.abilityInfo(t)) if (a.ready) w.useAbility(t.id, a.slot); const h = w.towers.find(t => t.hero); w.heroXp(h, 1e6); });
    await p.waitForTimeout(700); await shot(p, 'd3_abil');
    await p.evaluate(() => { const w = BF.world; const h = w.towers.find(t => t.hero); w.spawn('wolf'); w.spawn('wolf'); w.useAbility(h.id, 'ult'); BF.game.select(w.towers.find(t => t.cid === 'golem')); });
    await p.waitForTimeout(800); await shot(p, 'd4_panel');
    assert(await p.evaluate(() => BF.world.towers.length) >= 5, 'alle neuen Kreaturen gesetzt');
    await p.evaluate(() => BF.menu('hero')); await p.waitForTimeout(800); await shot(p, 'd5_heroes');
    assert(!p.errs.length, p.errs.join(' | '));
    await p.context().close();
  },
  async run(b) {
    const p = await open(b, '', LAND);
    await p.click('.titleScr'); await p.waitForTimeout(900);
    await p.click('text=SPIELEN'); await p.waitForTimeout(400); await p.click('[data-map=ahnenhain]'); await p.waitForTimeout(400);
    await p.click('#go'); await p.waitForFunction(() => window.BF.game && document.getElementById('boot').style.display === 'none', null, { timeout: 20000 }); await p.waitForTimeout(300);
    await shot(p, 'r1_start');
    // Kitsune: Karte antippen, dann auf der Karte tippen
    await p.locator('.card[data-id=kitsune]').tap();
    const spot = await p.evaluate(() => BF.spot('kitsune', 3.1));
    const pos = await p.evaluate(s => BF.game.view.screenPos(s[0], s[1], 0), spot);
    await p.touchscreen.tap(pos[0], pos[1]); await p.waitForTimeout(400);
    assert(await p.evaluate(() => BF.world.towers.length) === 1, 'Kitsune per Tippen gesetzt');
    await shot(p, 'r3_panel');
    // Ziehen vom Shop auf die Karte (Maus)
    await p.evaluate(() => { BF.game.select(null); BF.world.coins += 3000; });
    const s2 = await p.evaluate(() => BF.spot('raven', 3.4)); const q = await p.evaluate(s => BF.game.view.screenPos(s[0], s[1], 0), s2);
    const card = await p.locator('.card[data-id=raven]').boundingBox();
    await p.mouse.move(card.x + 30, card.y + 30); await p.mouse.down(); await p.mouse.move(q[0], q[1], { steps: 8 }); await shot(p, 'r2_drag'); await p.mouse.up();
    assert(await p.evaluate(() => BF.world.towers.length) === 2, 'Rabe per Ziehen gesetzt');
    await p.evaluate(() => { BF.put('turtle', 1.7); BF.game.select(null); });
    await p.click('#bPlay'); await p.waitForTimeout(200);
    await p.evaluate(() => { BF.game.speed = 3; });
    await p.waitForTimeout(3500); await shot(p, 'r4_wave');
    assert(await p.evaluate(() => BF.world.wave) === 1, 'Welle 1 läuft');
    await p.evaluate(() => { const w = BF.world; for (let i = 0; i < 60 * 40; i++) w.step(1 / 60); });
    assert(await p.evaluate(() => BF.world.doneWave) >= 1, 'Welle 1 beendet');
    assert(await p.evaluate(() => BF.profile.chars.kitsune.total) > 0, 'Kitsune hat XP');
    await p.evaluate(() => { BF.level(30); const w = BF.world; w.coins += 20000; const t = w.towers[0]; w.upgrade(t.id, 0); w.upgrade(t.id, 0); w.upgrade(t.id, 2); w.evolve(t.id); w.evolve(t.id); w.evolve(t.id); BF.game.select(t); });
    await p.waitForTimeout(1600); await shot(p, 'r5_evolved');
    assert(await p.evaluate(() => BF.world.towers[0].stage) === 3, 'Evolution Stufe 3');
    await p.evaluate(() => { const w = BF.world; w.startWave(); for (let i = 0; i < 4; i++) w.spawn('wolf', [], i); w.spawn('oni', [], 3); });
    await p.waitForTimeout(1200); await p.evaluate(() => { const w = BF.world; const t = w.towers[0]; w.useAbility(t.id, 'ult'); BF.game.select(null); });
    await p.waitForTimeout(500); await shot(p, 'r6_ult');
    await p.evaluate(() => { const w = BF.world; w.spawn('vharox', [], 12); });
    await p.waitForTimeout(2500); await shot(p, 'r7_boss');
    assert(!p.errs.length, p.errs.join(' | '));
    await p.context().close();
  },
};
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try { for (const k of which === 'all' ? Object.keys(S) : [which]) { const t = Date.now(); await S[k](b); console.log('✓', k, Date.now() - t, 'ms'); } }
  catch (e) { console.error(e.message); process.exitCode = 1; }
  await b.close();
})();
