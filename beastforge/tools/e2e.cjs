// Browser-Test (Playwright): node beastforge/tools/e2e.cjs [boot|run|menus|all] [ordner-für-screenshots]
// Vorher: cd beastforge && python3 -m http.server 8055
const { chromium } = require('playwright');
const URL = process.env.BF_URL || 'http://localhost:8055/index.html';
const [which = 'all', shots] = process.argv.slice(2);
const assert = (ok, msg) => { if (!ok) throw new Error('FEHLER: ' + msg); };
async function open(browser, q = '', vp = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|fonts\.g|ERR_/.test(m.text())) p.errs.push(m.text()); });
  await p.goto(URL + q); await p.waitForFunction(() => window.BF, null, { timeout: 30000 });
  await p.waitForTimeout(600);
  return p;
}
const shot = async (p, n) => { if (shots) await p.screenshot({ path: `${shots}/${n}.png` }); };
const S = {
  async boot(b) { const p = await open(b); await shot(p, 'b1_home'); assert(!p.errs.length, p.errs.join(' | ')); await p.context().close(); },
  async menus(b) {
    const p = await open(b);
    await p.evaluate(() => { BF.level(16); BF.profile.account.level = 8; BF.profile.chars.kitsune.mastery = 3; BF.app.refreshShowcase(); BF.menu('home'); });
    await p.waitForTimeout(500); await shot(p, 'm1_home');
    for (const s of ['collection', 'hero', 'account', 'ach', 'stats', 'settings', 'play']) { await p.evaluate(n => BF.menu(n), s); await p.waitForTimeout(500); await shot(p, 'm_' + s); }
    await p.evaluate(() => BF.menu('collection')); await p.click('[data-c=kitsune]'); await p.waitForTimeout(700); await shot(p, 'm_kitsune');
    await p.click('[data-f=shadow]'); await p.waitForTimeout(500); await shot(p, 'm_kitsune_shadow');
    await p.click('[data-branch=shadow]'); assert(await p.evaluate(() => BF.profile.chars.kitsune.branch) === 'shadow', 'Zweig gewählt');
    await p.click('[data-tab=perks]'); await p.waitForTimeout(200); await shot(p, 'm_kitsune_perks');
    await p.click('[data-tab=paths]'); await p.waitForTimeout(200); await shot(p, 'm_kitsune_paths');
    await p.click('[data-f], [data-tab=evo]'); await p.click('[data-tab=mastery]'); await p.click('[data-skin="1"]'); assert(await p.evaluate(() => BF.profile.chars.kitsune.skin) === 1, 'Skin gewählt');
    await p.waitForTimeout(400); await shot(p, 'm_kitsune_skin');
    // Ergebnis nach Sieg
    await p.evaluate(() => { BF.start('normal'); const w = BF.world; w.coins = 99999; w.place('kitsune', 4, 4); w.place('raven', 5, 4); w.startWave(); });
    await p.evaluate(() => { const w = BF.world; for (let i = 0; i < 60 * 30; i++) w.step(1 / 60); w.wave = 20; w.doneWave = 19; w.spawners = []; w.enemies = []; });
    await p.waitForTimeout(3500); await p.waitForSelector('.res', { timeout: 8000 }); await p.waitForTimeout(1300); await shot(p, 'm_results');
    assert(await p.evaluate(() => BF.profile.stats.wins) === 1, 'Sieg gezählt');
    assert(!p.errs.length, p.errs.join(' | '));
    await p.context().close();
  },
  async land(b) {
    const p = await open(b, '', { width: 844, height: 390 });
    await p.evaluate(() => { BF.start('normal'); const w = BF.world; w.coins = 9999; w.place('kitsune', 4, 4); w.place('turtle', 5, 8); w.startWave(); });
    await p.waitForTimeout(2500); await shot(p, 'l1_game');
    await p.evaluate(() => BF.game.select(BF.world.towers[0])); await p.waitForTimeout(400); await shot(p, 'l2_panel');
    assert(!p.errs.length, p.errs.join(' | '));
    await p.context().close();
  },
  async run(b) {
    const p = await open(b);
    await p.click('text=SPIELEN'); await p.waitForTimeout(300); await shot(p, 'r0_play');
    await p.click('#go'); await p.waitForTimeout(1500);
    await shot(p, 'r1_start');
    // Kitsune per Antippen setzen: Karte → Feld (4,4) Anhöhe
    await p.locator('.card[data-id=kitsune]').tap();
    const pos = await p.evaluate(() => BF.game.view.screenPos(4.5, 4.5, 0.34));
    await p.touchscreen.tap(pos[0], pos[1]); await p.waitForTimeout(200); await shot(p, 'r2_ghost');
    await p.touchscreen.tap(pos[0], pos[1]); await p.waitForTimeout(400);
    assert(await p.evaluate(() => BF.world.towers.length) === 1, 'Kitsune per Tippen gesetzt');
    await shot(p, 'r3_panel');
    await p.evaluate(() => { const w = BF.world; w.coins += 3000; w.place('turtle', 5, 8); w.place('raven', 5, 4); BF.game.select(null); });
    await p.click('#bWave'); await p.waitForTimeout(200);
    await p.evaluate(() => { BF.game.speed = 3; });
    await p.waitForTimeout(3500); await shot(p, 'r4_wave');
    assert(await p.evaluate(() => BF.world.wave) === 1, 'Welle 1 läuft');
    await p.evaluate(() => { const w = BF.world; for (let i = 0; i < 60 * 40; i++) w.step(1 / 60); });
    assert(await p.evaluate(() => BF.world.doneWave) >= 1, 'Welle 1 beendet');
    assert(await p.evaluate(() => BF.profile.chars.kitsune.total) > 0, 'Kitsune hat XP');
    // Upgrade + Evolution
    await p.evaluate(() => { BF.level(30); const w = BF.world; w.coins += 20000; const t = w.towers[0]; w.upgrade(t.id, 0); w.upgrade(t.id, 0); w.upgrade(t.id, 2); w.evolve(t.id); w.evolve(t.id); w.evolve(t.id); BF.game.select(t); });
    await p.waitForTimeout(1600); await shot(p, 'r5_evolved');
    assert(await p.evaluate(() => BF.world.towers[0].stage) === 3, 'Evolution Stufe 3');
    await p.evaluate(() => { const w = BF.world; w.startWave(); for (let i = 0; i < 4; i++) w.spawn('wolf', [], i); w.spawn('oni', [], 3); });
    await p.waitForTimeout(1200); await p.evaluate(() => { const w = BF.world; const t = w.towers[0]; w.useAbility(t.id, 'ult'); });
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
