// Fertige Prüfszenarien: node legends/tools/e2e/run.cjs <szenario> [ausgabeordner]
// Szenarien: newgame | walk | battle | offline | world | all
const { open, sheet } = require('./lib.cjs');
const fs = require('fs'), path = require('path');
const OUT = process.argv[3] || '/tmp/e2e'; fs.mkdirSync(OUT, { recursive: true });
const S = {
  // Titel → Charakter → Zuhause, ohne Fehler
  async newgame() {
    const T = await open();
    for (let i = 0; i < 160; i++) {
      if (await T.p.evaluate(() => !document.getElementById('nameinput').hidden)) { await T.p.fill('#nameinput input', 'Alex'); await T.p.press('#nameinput input', 'Enter'); await T.p.waitForTimeout(300); if (await T.top() === 'EditorScene') for (let k = 0; k < 6; k++) await T.press(1, 120, 'ArrowDown'); continue; }
      if (await T.top() === 'Overworld') break; await T.press(1, 300);
    }
    const r = await T.p.evaluate(() => [LU2.ow?.id, LU2.state?.name]); await T.b.close();
    return { ok: r[0] === 'home', r, errs: T.errs };
  },
  // Laufruhe: Pixel pro Frame müssen konstant sein, keine Stillstände
  async walk() {
    const T = await open({ w: 390, h: 844, dpr: 3 });
    await T.start({ map: 'route1', x: 2, y: 15, dir: 'right', noEnc: true });
    await T.p.evaluate(() => { window.SM = []; const l = () => { if (LU2.ow?.p) SM.push(LU2.ow.p.px); requestAnimationFrame(l); }; requestAnimationFrame(l); });
    await T.p.waitForTimeout(500); await T.p.evaluate(() => (SM.length = 0)); await T.hold('ArrowRight', 2000);
    const S2 = await T.p.evaluate(() => SM); let d = S2.slice(1).map((v, i) => +(v - S2[i]).toFixed(2));
    // nur die Laufphase werten (Stillstand vor dem Start und nach dem Loslassen abschneiden)
    while (d.length && d[d.length - 1] === 0) d.pop(); d = d.slice(10, -4);
    await T.b.close();
    const zeros = d.filter(v => v === 0).length, pos = d.filter(v => v > 0), mn = Math.min(...pos), spikes = pos.filter(v => v > mn * 1.5).length, mx = Math.max(...pos.filter(v => v <= mn * 1.5));
    // einzelne ausgelassene Bilder (Testrechner ohne Grafikkarte) sind erlaubt, Stillstände nicht
    return { ok: d.length > 30 && zeros === 0 && mx - mn < 0.5 && spikes <= 2, frames: d.length, zeros, spikes, min: mn, max: mx, errs: T.errs };
  },
  // Trainerkampf: Intro, Zwangswechsel nach K.O., Lebensanzeigen nach Wechsel sichtbar, weiches Ende
  async battle() {
    const T = await open({ w: 390, h: 700, dpr: 2 });
    await T.start({ map: 'route1', x: 8, y: 12, team: [['hoppel', 3], ['glutfux', 40]] });
    // ohne return: sonst wartet evaluate auf das Kampfende
    await T.p.evaluate(() => { LU2.trainerFight({ name: 'Test Tom', look: { skin: '#a06a44', hair: '#3a2a1a', outfit: '#b8784a', pants: '#4a3a2a', accent: '#c4462e' }, team: [['brockel', 12], ['kaeferix', 12]], reward: 100, lose: 'Gut!' }).then(r => (window.FR = r)); });
    for (const [i, ms] of [600, 1500, 3000].entries()) { await T.p.waitForTimeout(ms - (i ? [600, 1500][i - 1] : 0)); await T.shot(path.join(OUT, `battle-${i}.png`)); }
    const bad = [];
    for (let i = 0; i < 500; i++) {
      const st = await T.battle(); if (!st) break;
      if (st.mode === 'menu' && (!st.own || !st.foe)) bad.push(st);
      const top = await T.top();
      if (process.env.DBG && i % 25 === 0) console.log(i, top, JSON.stringify(st));
      if (top && !/BattleScene|Overworld/.test(top)) { await T.press(1, 150, 'ArrowDown'); await T.press(2, 250); continue; }
      await T.press(1, 150);
    }
    await T.p.waitForTimeout(1200); const res = await T.p.evaluate(() => window.FR); await T.b.close();
    return { ok: !bad.length && res === true, won: res, hpBoxProblems: bad, errs: T.errs };
  },
  // Offline: Service Worker cacht alles, Neustart ohne Netz
  async offline() {
    const T = await open();
    await T.p.evaluate(async () => { await navigator.serviceWorker.register('sw.js'); await navigator.serviceWorker.ready; });
    await T.p.waitForTimeout(3000); await T.ctx.setOffline(true); await T.p.reload(); await T.p.waitForTimeout(2500);
    const r = await T.p.evaluate(async () => [!!window.LU2, (await import('./js/gb/engine.js')).top()?.constructor?.name]); await T.b.close();
    return { ok: r[0] && r[1] === 'TitleScene', r, errs: T.errs };
  },
  // Kontaktbogen mehrerer Gebiete (Grafik-Kontrolle)
  async world() {
    const T = await open({ w: 420, h: 700, dpr: 2 }); await T.start({ map: 'route1', x: 8, y: 12, noEnc: true });
    const maps = [['route1', 8, 12], ['quellbach', 10, 9], ['frostheim', 10, 13], ['route4', 18, 10]], files = [];
    for (const [m, x, y] of maps) { await T.put(m, x, y); await T.p.waitForTimeout(600); const f = path.join(OUT, `world-${m}.png`); await T.shot(f); files.push(f); }
    await T.b.close(); sheet(files, path.join(OUT, 'world.png'), 2);
    return { ok: !T.errs.length, sheet: path.join(OUT, 'world.png'), errs: T.errs };
  },
};
(async () => {
  const which = process.argv[2] || 'all', list = which === 'all' ? ['newgame', 'walk', 'battle', 'offline'] : [which];
  let fail = 0;
  for (const n of list) { const r = await S[n](); if (!r.ok || r.errs?.length) fail++; console.log((r.ok && !r.errs?.length ? '✓ ' : '✗ ') + n, JSON.stringify(r)); }
  process.exit(fail ? 1 : 0);
})();
