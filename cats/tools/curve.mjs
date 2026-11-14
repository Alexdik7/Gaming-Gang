// Zeigt je Welle: Gesamt-LP der Hunde, bis dahin verdientes Futter und das Verhältnis (Faustregel: < 2 ist machbar).
import { BALANCE } from '../js/config.js';
import { DOGS } from '../js/data/dogs.js';
import { MAP_BY_ID } from '../js/data/maps.js';
import { buildWave, scaleEnemy } from '../js/sim/waves.js';
const [map = 'city', diff = 'normal', players = '1'] = process.argv.slice(2), D = BALANCE.difficulty[diff];
let fish = BALANCE.startFish * D.fish; const rows = [];
for (let w = 1; w <= D.waves; w++) {
  const W = buildWave(w, MAP_BY_ID[map], { diff, players: +players, total: D.waves }); let hp = 0, rew = 0, n = 0, boss = 0;
  for (const g of W.groups) { const s = scaleEnemy(DOGS[g.type], w, { diff, players: +players, dense: g.boss ? 1 : W.dense, final: W.final && g.boss, mini: W.mini && g.boss }); if (g.boss) boss = s.hp; else { hp += (s.hp + s.shield) * g.count; n += g.count; } rew += s.reward * g.count; }
  rows.push(`W${String(w).padStart(2)} ${String(W.theme || 'fest').padEnd(6)} n=${String(n).padStart(3)} LP=${String(Math.round(hp)).padStart(7)} Boss=${String(boss).padStart(6)} Futter=${String(Math.round(fish)).padStart(6)}  LP/Futter=${(hp / fish).toFixed(2)} Boss/Futter=${(boss / fish).toFixed(2)}  ${W.groups.map(g => g.type + '×' + g.count).join(' ')}`);
  fish += rew + BALANCE.waveBonus(w);
}
console.log(rows.join('\n'));
