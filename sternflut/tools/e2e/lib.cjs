// Wiederverwendbare Playwright-Helfer für Legends United (spart neue Testskripte).
// Voraussetzung: Server läuft (cd legends/server && node server.js) → http://localhost:8052
// Playwright lokal oder global (npm root -g) laden
const pw = (() => { try { return require('playwright'); } catch { return require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'); } })();
const { chromium, devices } = pw;
const LOOK = { skin: '#e8b892', hair: '#2a1d16', outfit: '#3d8bfd', pants: '#384868', cap: '#e84a5f', accent: '#f2d16b' };

async function open({ device = null, w = 420, h = 700, dpr = 1, app = false } = {}) {
  const b = await chromium.launch();
  const ctx = await b.newContext(device ? devices[device] : { viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  if (app) await ctx.addInitScript(() => { window.Capacitor = { isNativePlatform: () => true }; });
  const p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message + '\n' + (e.stack || '').split('\n').slice(1, 3).join('\n')));
  await p.goto('http://localhost:' + (process.env.PORT || 8053) + '/index.html'); await p.waitForTimeout(1200);
  const T = helpers(p); T.b = b; T.p = p; T.errs = errs; T.ctx = ctx;
  return T;
}
function helpers(p) {
  const T = {
    // Spiel direkt in einen Zustand setzen. opts: map,x,y,dir,team:[[sp,lv]],flags,badges,bag,time(720=Mittag),noEnc,strong
    async start(o = {}) {
      await p.keyboard.press('KeyZ'); await p.waitForTimeout(300);
      await p.evaluate(async o => {
        const E = await import('./js/gb/engine.js'); E.G.scenes.length = 0;
        const { createMon } = await import('./js/data/mon.js'); const { MOVES } = await import('./js/data/moves.js');
        if (o.noEnc) { const { ENC } = await import('./js/gb/maps.js'); for (const k in ENC) ENC[k].rate = 0; }
        const s = LU2.newState(o.name || 'Alex', o.look);
        s.flags = { pagerGiven: 1, prolog: 1, starter: 'zundrak', dex: 1, gotBalls: 1, promise: 1, reachedAnker: 1, swarmDay: Math.floor(Date.now() / 864e5), ...(o.flags || {}) };
        s.badges = o.badges || []; Object.assign(s.bag, o.bag || {}); s.time = o.time ?? 720;
        s.team = (o.team || [['pyroskar', 30]]).map(([sp, l]) => createMon(sp, l));
        if (o.strong) s.team.forEach(m => { m.moves.sort((a, b) => MOVES[b.id].pow - MOVES[a.id].pow); m.moves.forEach(mv => (mv.pp = 999)); });
        s.map = o.map || 'muschelbucht'; s.x = o.x ?? 4; s.y = o.y ?? 9; s.dir = o.dir || 'down'; LU2.state = s; LU2.enterWorld(false);
      }, { look: LOOK, ...o });
      await p.waitForTimeout(700);
    },
    press: async (n = 1, ms = 160, key = 'KeyZ') => { for (let i = 0; i < n; i++) { await p.keyboard.press(key); await p.waitForTimeout(ms); } },
    hold: async (key, ms) => { await p.keyboard.down(key); await p.waitForTimeout(ms); await p.keyboard.up(key); await p.waitForTimeout(300); },
    top: () => p.evaluate(async () => { const E = await import('./js/gb/engine.js'); return E.top()?.constructor?.name; }),
    idle: () => p.evaluate(async () => { const E = await import('./js/gb/engine.js'); return E.top() === LU2.ow && !LU2.ow.busy && !E.G.fadeRes; }),
    // A drücken, bis wieder freie Steuerung herrscht (Dialoge/Kämpfe durchklicken)
    async until(max = 400) { let i = 0; for (; i < max; i++) { await T.press(1, 110); if (i > 3 && await T.idle()) break; } return i; },
    where: () => p.evaluate(() => [LU2.ow.id, LU2.ow.p.x, LU2.ow.p.y]),
    put: (m, x, y, d = 'down') => p.evaluate(([m, x, y, d]) => LU2.ow.load(m, x, y, d), [m, x, y, d]),
    flags: (...k) => p.evaluate(k => Object.fromEntries(k.map(x => [x, LU2.state.flags[x]])), k),
    // exakte Schritte über die Spiel-API (kein Tasten-Timing): ['up','up','left']
    moves: keys => p.evaluate(async keys => { const ow = LU2.ow, w = ms => new Promise(r => setTimeout(r, ms)); for (const d of keys) { ow.p.dir = d; ow.tryMove(d); await w(40); let t = 0; while ((ow.p.moving || ow.busy) && t++ < 100) await w(30); if (ow.busy) return ['busy', ow.id, ow.p.x, ow.p.y]; } return [ow.id, ow.p.x, ow.p.y]; }, keys),
    shot: (path) => p.locator('#screen').screenshot({ path }),
    // Zustand der laufenden Kampfszene (Einzel oder Doppel)
    battle: () => p.evaluate(async () => { const E = await import('./js/gb/engine.js'); const s = E.G.scenes.find(x => /BattleScene|DoubleScene/.test(x.constructor.name)); return s ? { mode: s.mode, own: s.showOwnBox, foe: s.showFoeBox, p: s.b.p?.sp, f: s.b.f?.sp, over: s.b.over, result: s.b.result } : null; }),
    evalGame: (fn, arg) => p.evaluate(fn, arg),
  };
  return T;
}
// Mehrere PNGs zu einem Kontaktbogen zusammensetzen (braucht python3 + Pillow)
function sheet(files, out, cols = 3) {
  require('child_process').execFileSync('python3', ['-c', `import sys\nfrom PIL import Image\nf=sys.argv[2:];c=int(sys.argv[1]);ims=[Image.open(x) for x in f];w,h=ims[0].size\nr=(len(ims)+c-1)//c;o=Image.new('RGB',(w*c,h*r),'white')\nfor i,im in enumerate(ims):o.paste(im,((i%c)*w,(i//c)*h))\no.thumbnail((1600,1600));o.save('${out}')`, String(cols), ...files]);
}
module.exports = { open, sheet, LOOK };
