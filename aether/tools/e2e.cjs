// Browser-Ende-zu-Ende: zwei echte Browser-Spieler auf einem frischen Server.
// Aufruf: node tools/e2e.cjs [ausgabe.png]   (startet den Server selbst auf Port 8071 mit Wegwerf-DB)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path'), fs = require('fs'), os = require('os');
const out = process.argv[2] || path.join(os.tmpdir(), 'aether-e2e.png');
const db = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'aw-')), 'e2e.db');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const srv = spawn('node', ['--disable-warning=ExperimentalWarning', 'server/src/server.js'], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: '8071', AETHER_DB: db } });
  await sleep(800);
  const browser = await chromium.launch();
  const errors = [];
  async function player(name, starterIdx, colorIdx, phone) {
    const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 900, height: 700 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(name + ': ' + e.message));
    p.on('console', (m) => m.type() === 'error' && errors.push(name + ': ' + m.text()));
    await p.goto('http://localhost:8071/');
    await p.click('#tab-register');
    await p.fill('#user', name); await p.fill('#pass', 'testpass123');
    await p.click('#auth-go');
    await p.waitForSelector('#s-chars:not([hidden])');
    await p.click('#new-char');
    await p.click(`#pick-color .swatch:nth-child(${colorIdx})`);
    await p.click(`#starters .starter:nth-child(${starterIdx})`);
    await p.fill('#char-name', name + 'X');
    const shotCreate = phone ? await p.screenshot() : null;
    await p.click('#f-create > button:not(.link)');
    await p.waitForSelector('.char');
    await p.click('.char');
    await p.waitForSelector('#s-game:not([hidden])');
    await sleep(500);
    return { p, shotCreate };
  }
  const A = await player('Alex', 1, 2, true);
  const B = await player('Mia', 3, 5, false);
  await sleep(500);
  // B läuft drei Schritte nach unten, A muss die Bewegung sehen
  for (let i = 0; i < 3; i++) { await B.p.keyboard.down('ArrowDown'); await sleep(230); }
  await B.p.keyboard.up('ArrowDown');
  await A.p.fill('#chat-in', 'Hallo Mia, ich sehe dich!'); await A.p.press('#chat-in', 'Enter');
  await sleep(600);
  const seen = await A.p.evaluate(() => document.querySelector('#online').textContent);
  const chatB = await B.p.evaluate(() => document.querySelector('#chat-log').textContent);
  const health = await (await fetch('http://localhost:8071/health')).json();
  console.log('A sieht:', seen, '| B-Chat enthält Gruß:', chatB.includes('Hallo Mia'), '| Server:', JSON.stringify(health));
  const shotA = await A.p.screenshot(), shotB = await B.p.screenshot();
  // Kontaktbogen
  const sheet = await (await browser.newContext({ viewport: { width: 1700, height: 860 } })).newPage();
  const b64 = (b) => 'data:image/png;base64,' + b.toString('base64');
  await sheet.setContent(`<body style="margin:0;background:#111;display:flex;gap:8px;align-items:flex-start"><img src="${b64(A.shotCreate)}" style="height:844px"><img src="${b64(shotA)}" style="height:844px"><img src="${b64(shotB)}" style="width:880px"></body>`);
  await sheet.screenshot({ path: out });
  await browser.close(); srv.kill();
  if (errors.length) { console.log('FEHLER:', errors); process.exit(1); }
  const ok = seen.startsWith('2') && chatB.includes('Hallo Mia') && health.players === 2;
  console.log(ok ? 'E2E OK →' : 'E2E FEHLGESCHLAGEN →', out);
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
