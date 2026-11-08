// Gibt die Effektivitätstabelle als Markdown aus (für docs/GAME_DESIGN_DOCUMENT.md).
import { TYPES, TYPE_INFO, single } from '../shared/types.js';
const ab = (t) => TYPE_INFO[t].name.slice(0, 3);
const sym = { 0: '✕', 0.5: '½', 1: '·', 2: '**2**' };
console.log('| Angr. ↓ / Vert. → | ' + TYPES.map(ab).join(' | ') + ' |');
console.log('|---|' + TYPES.map(() => ':-:').join('|') + '|');
for (const a of TYPES) console.log(`| **${TYPE_INFO[a].name}** | ` + TYPES.map((d) => sym[single(a, d)]).join(' | ') + ' |');
