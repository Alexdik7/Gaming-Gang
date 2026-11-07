// Balancing-Übersicht: node tools/balance.mjs
// (Der Altwald ist ein optionales Nebengebiet und steht deshalb hinter Route 2.)
// Zeigt Level von Wildkreaturen, Trainern und Arenaleitern in Story-Reihenfolge und warnt bei zu großen Sprüngen.
import { MAPS, ENC } from '../js/gb/maps.js';
import { COOP } from '../js/data/coop.js';

const ORDER = ['route1', 'quellbach', 'route2', 'altwald', 'hoehle', 'felsenau', 'arena', 'route3', 'ignis', 'arena2', 'route4', 'aqualis', 'versteck', 'arena3', 'route5', 'frostheim', 'arena4', 'eisgrotte', 'route6', 'nocturna', 'arena5', 'mondruine', 'route7', 'solaria', 'arena6', 'tempel', 'route8', 'drakmor', 'arena7', 'hq', 'drachenhort', 'arena8', 'siegesstrasse', 'liga', 'liga1', 'liga2', 'liga3', 'liga4', 'ligachamp', 'kraterherz', 'gezeitengrotte', 'frostgipfel', 'drachengipfel', 'riss'];
const LEADERS = { arena: [13, 14, 16], arena2: [19, 20, 22], arena3: [24, 25, 27], arena4: [30, 31, 32, 34], arena5: [35, 36, 37, 38], mondruine: [40], arena6: [40, 41, 42, 43], tempel: [42, 43, 42, 44, 45], arena7: [46, 47, 48, 49], hq: [49, 50, 49, 50, 52], arena8: [50, 51, 52, 54], drachenhort: [52, 53, 54], liga: [53, 54, 54, 54, 56], liga1: [52, 53, 53, 54, 55], liga2: [53, 54, 54, 55, 56], liga3: [54, 55, 55, 56, 57], liga4: [55, 56, 56, 57, 58], ligachamp: [57, 58, 58, 58, 59, 60], kraterherz: [65], gezeitengrotte: [65], frostgipfel: [65], drachengipfel: [65], riss: [72, 68, 66, 72] };
let prevTop = 5, warn = 0;
console.log('Gebiet       Wild      Trainer (Ø/max)  Leiter/Boss');
for (const id of ORDER) {
  const M = MAPS[id]; if (!M) continue;
  const e = ENC[M.enc] || ENC[M.surfEnc];
  const wild = e ? `${Math.min(...e.list.map(x => x[2]))}–${Math.max(...e.list.map(x => x[3]))}` : '–';
  const tl = (M.npcs || []).filter(n => n.trainer).flatMap(n => n.trainer.team.map(t => t[1]));
  const tr = tl.length ? `${(tl.reduce((a, b) => a + b, 0) / tl.length).toFixed(1)} / ${Math.max(...tl)}` : '–';
  let boss = LEADERS[id]?.join('/') || '';
  if (id === 'eisgrotte') boss = COOP.finale.teams.flat().map(t => t[1]).join('/') + ' (Doppel)';
  const top = Math.max(...tl, ...(LEADERS[id] || []), 0);
  const flag = top && top - prevTop > 6 ? `  ⚠ Sprung +${top - prevTop}` : '';
  if (flag) warn++;
  if (top) prevTop = Math.max(prevTop, top);
  console.log(`${id.padEnd(12)} ${wild.padEnd(9)} ${tr.padEnd(16)} ${boss}${flag}`);
}
console.log(warn ? `\n${warn} Warnung(en)` : '\nKeine großen Level-Sprünge.');
