// Karten-Prüfung: node tools/checkmaps.mjs
// Prüft Zeilenbreiten, Übergänge (Kanten/Warps/Türen), Figuren auf begehbaren Feldern und Erreichbarkeit.
// Browser-Funktionen werden nicht gebraucht: maps.js ist reine Daten.
import { MAPS, SOLID } from '../js/gb/maps.js';

let errors = 0, warns = 0;
const err = (m, t) => { errors++; console.log(`✗ ${m}: ${t}`); };
const warn = (m, t) => { warns++; console.log(`! ${m}: ${t}`); };
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };

function grid(id) {
  const M = MAPS[id], w = M.rows[0].length, h = M.rows.length;
  const bld = (x, y) => (M.buildings || []).find(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
  const walk = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    const c = M.rows[y][x]; if (SOLID.has(c) || c === 'L') return false;
    const b = bld(x, y); if (b) return false;
    return true;
  };
  return { M, w, h, walk, bld };
}

for (const id of Object.keys(MAPS)) {
  const { M, w, h, walk } = grid(id);
  if (new Set(M.rows.map(r => r.length)).size !== 1) err(id, 'Zeilen unterschiedlich lang');
  // Startpunkte für die Erreichbarkeit: Kanten, Warps, Ausgang
  const starts = [];
  for (const [dir, e] of Object.entries(M.edges || {})) {
    if (!MAPS[e.to]) { err(id, `Kante ${dir} → unbekannte Karte ${e.to}`); continue; }
    const back = MAPS[e.to].edges?.[OPP[dir]];
    if (!back || back.to !== id) err(id, `Kante ${dir} → ${e.to} hat keine Rück-Kante`);
    const T = grid(e.to);
    // jede offene Randkachel muss auf der Gegenseite begehbar sein
    for (let k = 0; k < (dir === 'n' || dir === 's' ? w : h); k++) {
      const [x, y] = dir === 'n' ? [k, 0] : dir === 's' ? [k, h - 1] : dir === 'w' ? [0, k] : [w - 1, k];
      if (!walk(x, y)) continue;
      starts.push([x, y]);
      const [tx, ty] = dir === 'n' ? [x + (e.dx || 0), T.h - 1] : dir === 's' ? [x + (e.dx || 0), 0] : dir === 'w' ? [T.w - 1, y + (e.dy || 0)] : [0, y + (e.dy || 0)];
      if (!T.walk(tx, ty)) err(id, `Rand (${x},${y}) führt auf blockiertes Feld ${e.to} (${tx},${ty})`);
    }
  }
  for (const wp of M.warps || []) {
    if (!MAPS[wp.to]) { err(id, `Warp → unbekannte Karte ${wp.to}`); continue; }
    if (!grid(wp.to).walk(wp.tx, wp.ty)) err(id, `Warp (${wp.x},${wp.y}) → ${wp.to} (${wp.tx},${wp.ty}) blockiert`);
    starts.push([wp.x, wp.y]);
  }
  for (const b of M.buildings || []) {
    if (b.x + b.w > w || b.y + b.h > h) err(id, `Gebäude ${b.to} ragt aus der Karte`);
    if (b.to && !MAPS[b.to]) err(id, `Tür → unbekannte Karte ${b.to}`);
    if (!walk(b.x + b.door, b.y + b.h)) err(id, `Feld vor der Tür von ${b.to} ist blockiert`);
  }
  M.rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'm') starts.push([x, y]); }));
  for (const n of M.npcs || []) if (!walk(n.x, n.y) && M.rows[n.y]?.[n.x] !== 'C') warn(id, `Figur ${n.id} steht auf festem Feld (${n.x},${n.y})`);
  for (const it of M.items || []) if (!walk(it.x, it.y)) err(id, `Fundstück ${it.id} auf festem Feld`);
  // Erreichbarkeit (Figuren/Fundstücke zählen als Hindernis, außer Trainer, die man besiegt)
  if (!starts.length) continue;
  const block = new Set([...(M.npcs || []).filter(n => !n.trainer && !n.hideIf).map(n => n.x + ',' + n.y), ...(M.items || []).map(i => i.x + ',' + i.y)]);
  const bfs = surf => {
    const seen = new Set([starts[0].join(',')]), q = [starts[0]];
    const ok = (x, y) => walk(x, y) || (surf && M.rows[y]?.[x] === '~');
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
        if (seen.has(k)) continue;
        if (M.rows[ny]?.[nx] === 'L' && dy === 1 && walk(nx, ny + 1)) { const k2 = nx + ',' + (ny + 1); if (!seen.has(k2)) { seen.add(k2); q.push([nx, ny + 1]); } continue; }
        if (!ok(nx, ny) || block.has(k)) continue;
        // Eis: weiterrutschen, bis ein Hindernis kommt
        let sx = nx, sy = ny;
        while (M.rows[sy][sx] === 'i' && ok(sx + dx, sy + dy) && !block.has((sx + dx) + ',' + (sy + dy))) { sx += dx; sy += dy; }
        const ks = sx + ',' + sy; if (seen.has(ks)) continue;
        seen.add(ks); q.push([sx, sy]);
      }
    }
    return seen;
  };
  const surfMap = !!M.surfEnc, seen = bfs(surfMap), walkOnly = surfMap ? bfs(false) : seen;
  for (const it of M.items || []) if (surfMap && seen.has(it.x + ',' + it.y) && !walkOnly.has(it.x + ',' + it.y)) console.log(`· ${id}: Fundstück ${it.id} nur mit Surfen erreichbar`);
  const near = (x, y) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((x + dx) + ',' + (y + dy)));
  for (const s of starts) if (!seen.has(s.join(','))) warn(id, `Übergang (${s}) nicht vom ersten Eingang erreichbar`);
  for (const b of M.buildings || []) if (!seen.has(`${b.x + b.door},${b.y + b.h}`)) err(id, `Tür von ${b.to} nicht erreichbar`);
  for (const n of M.npcs || []) if (!near(n.x, n.y)) warn(id, `Figur ${n.id} nicht erreichbar`);
  for (const it of M.items || []) if (!near(it.x, it.y)) warn(id, `Fundstück ${it.id} nicht erreichbar`);
}
console.log(`\n${Object.keys(MAPS).length} Karten geprüft: ${errors} Fehler, ${warns} Hinweise`);
process.exit(errors ? 1 : 0);
