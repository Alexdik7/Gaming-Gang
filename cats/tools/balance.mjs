// Balance-Bot: spielt Runden ohne Browser und zeigt, wie weit ein einfacher Bot kommt.
// Aufruf: node cats/tools/balance.mjs [map|all] [diff|all] [trupp: starter|mid|late|all] [spieler] [-v]
import { World } from '../js/sim/world.js';
import { CATS } from '../js/data/cats.js';
import { MAPS } from '../js/data/maps.js';
import { canBuild } from '../js/sim/maps.js';
import { canUpgrade, upgradeCost, placeCost } from '../js/sim/upgrades.js';
import { GRID } from '../js/config.js';

export const SQUADS = {
  starter: ['scout', 'bomb'],
  early: ['scout', 'bomb', 'ice', 'gunner', 'sniper', 'fire'],
  mid: ['scout', 'bomb', 'ice', 'sniper', 'commander', 'tesla'],
  late: ['scout', 'ninja', 'rocket', 'ice', 'shadow', 'laser'],
  all: Object.keys(CATS)
};

// Bestes freies Feld: möglichst viel Weg in Reichweite (bei mehreren Wegen abwechselnd je Weg)
function bestTile(W, range, near, lane) {
  let best = null, bs = -1;
  for (let y = 0; y < GRID.rows; y++) for (let x = 0; x < GRID.cols; x++) {
    if (!canBuild(W.map, x, y) || W.towers.at(x, y)) continue;
    let s = 0;
    for (const p of W.map.samples) if ((p.x - x - .5) ** 2 + (p.y - y - .5) ** 2 <= range * range) s += lane === undefined || p.pi === lane ? 1 : 0.4;
    if (near) s = s > 0 ? 100 - Math.hypot(near.x - x - .5, near.y - y - .5) : -1;
    if (s > bs) { bs = s; best = { x, y }; }
  }
  return best;
}

// Einfacher, aber vernünftiger Spieler: baut breit auf, lässt kein Futter liegen, baut die beste Katze aus.
export function botTurn(W, pi = 0, o = {}) {
  const P = W.players[pi];
  const attackers = P.loadout.filter(c => !['eco', 'support'].includes(CATS[c].base.atk));
  const price = c => placeCost(CATS[c], P.bonus);
  for (let guard = 0; guard < 80; guard++) {
    const my = W.towers.list.filter(t => t.owner === pi), want = 3 + Math.floor(W.wave / 3);
    const sup = P.loadout.find(c => CATS[c].base.atk === 'support' && !my.some(t => t.cat === c));
    const eco = P.loadout.find(c => CATS[c].base.atk === 'eco' && my.filter(t => t.cat === c).length < 2);
    const ok = attackers.filter(c => !CATS[c].limit || !my.some(t => t.cat === c));
    const counts = ok.map(c => my.filter(t => t.cat === c).length * (0.6 + CATS[c].cost / 500));
    let cat = sup && my.length >= 5 ? sup : eco && my.length >= 3 && W.wave < W.wavesTotal * 0.4 ? eco : ok[counts.indexOf(Math.min(...counts))];
    const up = nextUpgrade(W, pi, my);
    const place = c => {
      const def = CATS[c], anchor = def.base.atk === 'support' ? my.slice().sort((a, b) => b.dmgDone - a.dmgDone)[0] : null;
      const tile = bestTile(W, Math.min(def.base.range, 4), anchor, W.map.paths.length > 1 ? my.length % W.map.paths.length : undefined);
      return tile && !W.cmd(pi, { t: 'place', cat: c, x: tile.x, y: tile.y }).err;
    };
    if (my.length < want && cat) {
      if (P.fish >= price(cat)) { if (place(cat)) continue; }
      else if (my.length < 3) { const alt = ok.filter(c => price(c) <= P.fish).sort((a, b) => price(b) - price(a))[0]; if (alt && place(alt)) continue; }
      else if (!up || up.cost > P.fish || price(cat) < up.cost * 1.3) break;      // auf die gewünschte Katze sparen
    }
    if (up && up.cost <= P.fish) { if (!W.cmd(pi, { t: 'upgrade', id: up.id, path: up.path }).err) continue; }
    if (cat && P.fish >= price(cat) && my.length < want + 4 && (!up || up.cost > P.fish * 1.5)) { if (place(cat)) continue; }
    break;
  }
}
// Upgrade-Vorliebe: die Katze mit dem meisten Schaden je Futter, ein Hauptpfad bis zur Meisterstufe, dann ein Nebenpfad
function nextUpgrade(W, pi, my) {
  const P = W.players[pi];
  const order = my.slice().sort((a, b) => (b.dmgDone / b.spent) - (a.dmgDone / a.spent));
  for (const t of order) {
    const main = t.tiers.indexOf(Math.max(...t.tiers)), start = t.tiers[main] ? main : (t.cat === 'scout' && W.wave >= 9 && t.id % 3 === 0) ? 2 : t.id % 2;
    for (const p of [start, (start + 1) % 3, (start + 2) % 3]) {
      if (canUpgrade(t.def, t.tiers, p, P.bonus)) continue;
      return { id: t.id, path: p, cost: upgradeCost(t.def, t.tiers, p, P.bonus, P.discount) };
    }
  }
  return null;
}

export function playBot(mapId, diff, squad, nPlayers = 1, o = {}) {
  const players = Array.from({ length: nPlayers }, (_, i) => ({ id: 'b' + i, loadout: SQUADS[squad] || squad, bonus: o.bonus }));
  const W = new World({ mapId, diff, players, mode: o.mode, seed: o.seed || 7 });
  const dt = 1 / 20, log = [];
  while (!W.over && W.wave < (o.maxWave || 200)) {
    for (let i = 0; i < nPlayers; i++) botTurn(W, i, o);
    const lives = W.lives;
    W.startWave();
    for (let n = 0; W.phase === 'wave' && n < 20 * 600; n++) { W.step(dt); if (n % 40 === 0) W.events.length = 0; }
    if (o.verbose) log.push(`  W${W.wave}: Leben ${W.lives}${lives !== W.lives ? ' (' + (W.lives - lives) + ')' : ''} Futter ${Math.round(W.players[0].fish)} Katzen ${W.towers.list.length}`);
  }
  return { win: W.phase === 'won', wave: W.wave, lives: W.lives, total: W.wavesTotal, log, W };
}

if (process.argv[1] && process.argv[1].endsWith('balance.mjs')) {
  const [m = 'all', d = 'all', s = 'all', n = '1'] = process.argv.slice(2).filter(a => a[0] !== '-'), verbose = process.argv.includes('-v');
  const maps = m === 'all' ? MAPS.map(x => x.id) : [m], diffs = d === 'all' ? ['easy', 'normal', 'hard'] : [d];
  const squads = s === 'all' ? ['starter', 'early', 'mid', 'late'] : [s];
  for (const map of maps) for (const diff of diffs) {
    const row = squads.map(sq => {
      const r = playBot(map, diff, sq, +n, { verbose });
      if (verbose) console.log(r.log.join('\n'));
      return `${sq}: ${r.win ? 'SIEG' : 'W' + r.wave}/${r.total} ♥${r.lives}`.padEnd(24);
    });
    console.log(`${map.padEnd(9)} ${diff.padEnd(7)} ${row.join('')}`);
  }
}
