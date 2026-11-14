// Browser-Tests (Playwright): node cats/tools/e2e.cjs [menu|game|mp|all] [ordner-für-screenshots]
// Vorher: cd cats && python3 -m http.server 8054
const { chromium } = require('playwright');
const URL = process.env.CTD_URL || 'http://localhost:8054/index.html';
const [which = 'all', shots] = process.argv.slice(2);
const assert = (ok, msg) => { if (!ok) throw new Error('FEHLER: ' + msg); };

async function page(browser, ctx, query = '') {
  const c = ctx || await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await c.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|peerjs|WebSocket|ERR_/.test(m.text())) p.errs.push(m.text()); });
  await p.goto(URL + query); await p.waitForFunction(() => window.CTD);
  return p;
}
const shot = async (p, name) => { if (shots) await p.screenshot({ path: `${shots}/${name}.png` }); };

const S = {
  async menu(b) {
    const p = await page(b);
    await p.evaluate(() => { const s = CTD.save; s.level = 12; s.coins = 9000; s.crystals = 80; s.cats.ice = { r: 2 }; s.cats.sniper = { r: 0 }; s.stats.kills = 1500; CTD.menus.show('home'); });
    await shot(p, 'm1_home');
    for (const scr of ['play', 'cats', 'academy', 'missions', 'shop', 'ach', 'mp', 'settings']) {
      await p.evaluate(s => CTD.menus.show(s), scr); await p.waitForTimeout(120);
      assert(await p.locator('#menu .body').count() === 1, 'Bildschirm ' + scr); await shot(p, 'm_' + scr);
    }
    // Käufe und Belohnungen über echte Klicks
    await p.evaluate(() => CTD.menus.show('missions'));
    await p.click('[data-act=daily]'); await p.click('#modal [data-close]');
    assert(await p.evaluate(() => CTD.save.coins) === 9200, 'tägliche Belohnung');
    assert(await p.locator('text=/Std\\.|Min\\./').count() > 0, 'Countdown sichtbar');
    await p.evaluate(() => CTD.menus.show('academy')); await p.click('[data-research=claws]');
    assert(await p.evaluate(() => CTD.save.research.claws) === 1, 'Forschung');
    await p.click('[data-tab="academy:ranks"]'); await p.click('[data-rank=scout]');
    assert(await p.evaluate(() => CTD.save.cats.scout.r) === 1, 'Rang');
    await p.evaluate(() => CTD.menus.show('cats')); await p.click('.cat[data-cat=gunner]'); await shot(p, 'm_catmodal'); await p.click('[data-buycat=gunner]');
    assert(await p.evaluate(() => !!CTD.save.cats.gunner && CTD.save.loadout.includes('gunner')), 'Katze gekauft');
    await p.evaluate(() => CTD.menus.show('ach')); await p.click('[data-ach=hunter]'); await p.click('#modal [data-close]');
    assert(await p.evaluate(() => CTD.save.ach.hunter) === 1, 'Erfolg');
    await p.evaluate(() => CTD.menus.show('shop')); await p.click('[data-power=freeze]');
    assert(await p.evaluate(() => CTD.save.powers.freeze) === 1, 'Power-up gekauft');
    await p.evaluate(() => CTD.menus.show('settings')); await p.selectOption('[data-set=lang]', 'en');
    assert(await p.locator('text=Settings').count() > 0, 'Englisch');
    await p.selectOption('[data-set=lang]', 'de');
    // Spielstand überlebt Neuladen
    await p.evaluate(() => CTD.sm.save()); await p.reload(); await p.waitForFunction(() => window.CTD);
    assert(await p.evaluate(() => CTD.save.level === 12 && CTD.save.cats.gunner && CTD.save.research.claws === 1), 'Spielstand nach Neuladen');
    assert(!p.errs.length, 'Konsole: ' + p.errs.join(' | '));
    await p.context().close();
  },

  async game(b) {
    const p = await page(b);
    await p.click('[data-go=play]'); await p.click('[data-act=start]'); await p.waitForTimeout(500);
    assert(await p.locator('#coach:not(.hidden)').count() === 1, 'Tutorial startet');
    // Katze per Antippen setzen: Leiste → Feld
    const tap = async (tx, ty) => { const r = await p.locator('#field').boundingBox(); await p.touchscreen.tap(r.x + (tx + .5) * r.width / 12, r.y + (ty + .5) * r.height / 16); };
    await p.locator('.slot[data-cat=scout]').tap(); await tap(3, 3);
    assert(await p.evaluate(() => CTD.game.V.towers.list.length) === 1, 'Katze gesetzt');
    await p.locator('.slot[data-cat=scout]').tap(); await tap(3, 2);                       // auf dem Weg: abgelehnt
    assert(await p.evaluate(() => CTD.game.V.towers.list.length) === 1, 'Weg ist nicht bebaubar');
    await tap(5, 3);
    assert(await p.evaluate(() => CTD.game.V.towers.list.length) === 2, 'zweite Katze');
    await tap(3, 3); await p.waitForTimeout(150); await shot(p, 'g1_panel');
    await p.locator('#panel [data-up="0"]').tap();
    assert(await p.evaluate(() => CTD.game.V.towers.list[0].tiers[0]) === 1, 'Upgrade gekauft');
    await p.locator('#panel [data-p=mode]').tap(); await p.locator('#panel [data-p=close]').tap();
    await p.locator('#h-start').tap(); await p.locator('#h-speed').tap(); await p.locator('#h-speed').tap();
    await p.waitForFunction(() => CTD.game.V.wave === 1 && CTD.game.V.phase === 'build', null, { timeout: 30000 });
    assert(await p.evaluate(() => CTD.game.V.stats.kills) >= 5, 'Welle 1 geschafft');
    // Power-up mit Ziel
    await p.locator('#h-start').tap(); await p.waitForTimeout(1500);
    await p.locator('.pw[data-pw=megapaw]').tap(); await tap(2, 2); await p.waitForTimeout(200);
    assert(await p.evaluate(() => CTD.save.powers.megapaw) === 1, 'Power-up verbraucht');
    await shot(p, 'g2_wave');
    // Pause, dann schnell zum Sieg vorspulen
    await p.locator('[data-a=pause]').tap(); assert(await p.evaluate(() => CTD.game.s.paused), 'Pause'); await p.locator('#modal [data-close]').tap();
    await p.evaluate(() => { const W = CTD.game.s.world; W.players[0].fish = 1e6; W.players[0].loadout.push('laser'); let n = 0; for (let y = 1; y < 16 && n < 14; y++) for (let x = 0; x < 12 && n < 14; x += 2) { const r = W.cmd(0, { t: 'place', cat: 'laser', x, y }); if (r.ok) { n++; for (let i = 0; i < 3; i++) W.cmd(0, { t: 'upgrade', id: r.id, path: 0 }); } }
      for (let g = 0; g < 400000 && !W.over; g++) { if (W.phase === 'build') W.startWave(); W.step(1 / 30); if (g % 50 === 0) W.events.length = 0; } });
    await p.waitForSelector('.title-big.win', { timeout: 8000 }); await p.waitForTimeout(700); await shot(p, 'g3_win');
    const st = await p.evaluate(() => ({ lvl: CTD.save.level, coins: CTD.save.coins, wins: CTD.save.stats.wins, clear: CTD.save.maps.city.easy, tut: CTD.save.tutorial }));
    assert(st.wins === 1 && st.clear === 1 && st.coins > 300 && st.lvl >= 2, 'Belohnung verbucht ' + JSON.stringify(st));
    await p.click('[data-e=menu]'); assert(await p.locator('#menu:not(.hidden)').count() === 1, 'zurück im Menü');
    assert(!p.errs.length, 'Konsole: ' + p.errs.join(' | '));
    await p.context().close();
  },

  async mp(b) {
    // Zwei Spieler im selben Browser-Kontext (BroadcastChannel-Transport)
    const ctx = await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const h = await page(b, ctx, '?net=local'), c = await page(b, ctx, '?net=local&p=2');
    await c.evaluate(() => { CTD.save.uid = 'client01'; CTD.save.name = 'Mieze'; });
    await h.evaluate(() => CTD.menus.show('mp')); await h.click('[data-act=mpCreate]');
    await h.waitForSelector('.code'); const code = (await h.textContent('.code')).trim();
    assert(/^CAT-\d{4}$/.test(code), 'Raumcode ' + code);
    await c.evaluate(() => CTD.menus.show('mp')); await c.fill('#mp-code', code.slice(4)); await c.click('[data-act=mpJoin]');
    await h.waitForFunction(() => CTD.menus.lobby && CTD.menus.lobby.players.length === 2);
    await c.waitForFunction(() => CTD.menus.lobby && CTD.menus.lobby.players.length === 2);
    await shot(h, 'p1_lobby');
    await h.click('[data-act=mpStart]');
    await c.waitForFunction(() => CTD.game.s && CTD.game.s.me === 1); await h.waitForFunction(() => CTD.game.s);
    // Mitspieler setzt eine Katze – der Gastgeber entscheidet
    await c.waitForFunction(() => CTD.game.V.players[1].fish > 0);
    await c.evaluate(() => CTD.game.s.cmd({ t: 'place', cat: 'scout', x: 3, y: 3 }));
    await h.waitForFunction(() => CTD.game.V.towers.list.length === 1 && CTD.game.V.towers.list[0].owner === 1);
    await c.waitForFunction(() => CTD.game.V.towers.list.length === 1);
    // Schummeln: fremde Katze verkaufen und Futter erfinden wird abgelehnt
    await h.evaluate(() => CTD.game.s.cmd({ t: 'place', cat: 'scout', x: 5, y: 3 }));
    await c.evaluate(() => { const id = CTD.game.V.towers.list.find(t => t.owner === 0); CTD.game.V.players[1].fish = 99999; CTD.game.s.cmd({ t: 'place', cat: 'nyx', x: 7, y: 4 }); if (id) CTD.game.s.cmd({ t: 'sell', id: id.id }); });
    await c.evaluate(() => CTD.game.s.cmd({ t: 'start' }));
    await h.waitForFunction(() => CTD.game.V.wave === 1);
    await c.waitForFunction(() => CTD.game.V.enemies.list.length > 0, null, { timeout: 8000 });
    await h.waitForTimeout(600);
    const hs = await h.evaluate(() => ({ n: CTD.game.V.towers.list.length, hp: CTD.game.V.enemies.list[0] && CTD.game.V.enemies.list[0].maxHp, fish: CTD.game.V.players[1].fish }));
    assert(hs.n === 2 && hs.fish < 1000, 'Gastgeber lehnt Schummeln ab ' + JSON.stringify(hs));
    assert(hs.hp >= 20 * 1.59, 'Koop-Skalierung: Hunde haben mehr LP (' + hs.hp + ')');
    await shot(c, 'p2_client');
    // Verbindung trennen und wieder einsteigen
    await c.evaluate(() => CTD.game.s.net.close());
    await h.waitForFunction(() => CTD.game.V.players[1].connected === false);
    await c.evaluate(() => CTD.game.s.reconnect());
    await h.waitForFunction(() => CTD.game.V.players[1].connected === true, null, { timeout: 8000 });
    await c.waitForFunction(() => CTD.game.s.lost === false, null, { timeout: 8000 });
    // Futter schenken
    const f0 = await h.evaluate(() => CTD.game.V.players[0].fish);
    await c.evaluate(() => CTD.game.s.cmd({ t: 'gift', to: 0, n: 50 }));
    await h.waitForFunction(f => CTD.game.V.players[0].fish >= f + 50, f0);
    // Sieg überträgt sich
    await h.evaluate(() => { const W = CTD.game.s.world; W.wave = W.wavesTotal; W.enemies.list.forEach(e => e.dead = true); W.waves.queue.length = 0; });
    await h.waitForSelector('.title-big.win', { timeout: 10000 });
    assert(await h.evaluate(() => CTD.save.stats.mpWins) === 1, 'Koop-Sieg beim Gastgeber verbucht');
    assert(!h.errs.length && !c.errs.length, 'Konsole: ' + h.errs.concat(c.errs).join(' | '));
    await ctx.close();
  }
};

(async () => {
  const b = await chromium.launch(); let bad = 0;
  for (const name of which === 'all' ? Object.keys(S) : [which]) {
    const t = Date.now();
    try { await S[name](b); console.log(`✔ ${name} (${((Date.now() - t) / 1000).toFixed(1)} s)`); } catch (e) { bad++; console.log(`✘ ${name}: ${e.message.split('\n')[0]}`); }
  }
  await b.close(); process.exit(bad ? 1 : 0);
})();
