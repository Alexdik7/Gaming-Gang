// Prüft, dass alle 16 Arena-Rätsel im echten Spiel lösbar sind (Wegsuche + Brocken schieben).
// Aufruf: node tools/e2e/gyms.cjs [arena1 arena5 …]   (Server auf Port 8053 muss laufen)
const { open } = require('./lib.cjs');
const P = {
  arena1: [{ go: [1, 11] }, { go: [11, 8] }, { go: [1, 6] }, { go: [6, 2] }],
  arena2: [{ go: [3, 13] }, { push: ['up', 'up', 'up'] }, { go: [10, 9] }, { push: ['up', 'up', 'up', 'up', 'up'] }, { go: [6, 2] }],
  arena3: [{ go: [12, 4] }, { go: [6, 2] }],
  arena4: [{ go: [1, 4] }, { go: [11, 4] }, { go: [6, 5] }, { go: [6, 2] }],
  arena5: [{ go: [11, 12] }, { go: [1, 8] }, { go: [11, 4] }, { go: [6, 2] }],
  arena6: [{ go: [11, 14] }, { go: [5, 10] }, { push: ['right', 'right', 'right', 'right', 'right', 'right', 'right', 'right'] }, { go: [1, 5] }, { go: [6, 2] }],
  arena7: [{ go: [11, 11] }, { push: ['up'] }, { go: [2, 7] }, { push: ['left'] }, { go: [6, 2] }],
  arena8: [{ go: [6, 4] }, { go: [11, 8] }, { push: ['up', 'up', 'up', 'up', 'up', 'up'] }, { go: [1, 10] }, { push: ['up', 'left', 'up', 'right', 'up', 'left', 'up', 'left'] }, { go: [6, 2] }],
  arena9: [{ go: [3, 12] }, { go: [2, 9] }, { go: [2, 5] }, { go: [6, 2] }],
  arena10: [{ go: [1, 9] }, { push: ['up', 'up', 'up', 'up'] }, { go: [0, 4] }, { go: [6, 4] }, { go: [12, 8] }, { push: ['up', 'up', 'up', 'up', 'up', 'up'] }, { go: [6, 2] }],
  arena12: [{ go: [4, 14] }, { push: ['up', 'up', 'up'] }, { go: [2, 11] }, { push: ['up', 'up', 'up', 'up'] }, { go: [7, 4] }, { push: ['down'] }, { go: [6, 2] }],
  arena13: [{ go: [1, 10] }, { push: ['up', 'up'] }, { go: [6, 2] }],
  arena14: [{ go: [5, 5] }, { go: [0, 4] }, { go: [1, 6] }, { go: [7, 5] }, { go: [12, 4] }, { go: [11, 6] }, { go: [5, 10] }, { go: [0, 13] }, { go: [1, 10] }, { go: [7, 10] }, { go: [12, 13] }, { go: [11, 10] }, { go: [6, 2] }],
  arena15: [{ go: [12, 4] }, { go: [12, 14] }, { go: [6, 2] }],
  arena16: [{ go: [2, 11] }, { push: ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'] }, { go: [11, 9] }, { push: ['left', 'left', 'left', 'left'] }, { go: [6, 2] }],
  // arena11 (Eis) wird von tools/checkmaps.mjs mit Rutsch-Simulation geprüft
};
// Breitensuche zu einem Ziel; meidet Runen, Wind und feste Felder (außer dem Ziel selbst)
const route = (T, tx, ty) => T.p.evaluate(([tx, ty]) => {
  const ow = LU2.ow, start = [ow.p.x, ow.p.y], prev = new Map([[start.join(), null]]), q = [start], D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  while (q.length) { const [x, y] = q.shift(); if (x === tx && y === ty) break; for (const [d, [dx, dy]] of Object.entries(D)) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny, isT = nx === tx && ny === ty; if (prev.has(k) || ((ow.solid(nx, ny) || (ow.M.warps || []).some(w => w.x === nx && w.y === ny) || ow.M.wind?.[k]) && !isT)) continue; prev.set(k, [x + ',' + y, d]); q.push([nx, ny]); } }
  if (!prev.has(tx + ',' + ty)) return null; const path = []; let k = tx + ',' + ty; while (prev.get(k)) { const [pk, d] = prev.get(k); path.unshift(d); k = pk; } return path;
}, [tx, ty]);
(async () => {
  const list = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(P);
  let fail = 0;
  for (const map of list) {
    const T = await open(); await T.start({ map, x: 6, y: 16, noEnc: true, strong: true });
    await T.p.evaluate(() => { for (let a = 1; a <= 16; a++) for (const c of 'abc') LU2.state.flags['tr_gym' + a + c] = true; LU2.ow.load(LU2.ow.id, 6, 16, 'up'); });
    await T.until();
    let ok = true;
    for (const st of P[map]) {
      if (st.go) { const path = await route(T, ...st.go); if (!path) { ok = false; break; } await T.moves(path); }
      if (st.push) for (const d of st.push) { await T.p.evaluate(d => { LU2.ow.p.dir = d; }, d); await T.moves([d]); await T.p.waitForTimeout(200); }
      await T.p.waitForTimeout(250); await T.until(30);
    }
    const pos = await T.p.evaluate(() => [LU2.ow.id, LU2.ow.p.x, LU2.ow.p.y]);
    ok = ok && pos[0] === map && pos[1] === 6 && pos[2] === 2 && !T.errs.length;
    if (!ok) fail++;
    console.log(`${ok ? '✓' : '✗'} ${map}`, ok ? '' : JSON.stringify({ pos, errs: T.errs }));
    await T.b.close();
  }
  process.exit(fail ? 1 : 0);
})();
