// Beastforge-Codex: Entdeckungsbuch (Profil P.codex.seen = { schlüssel: 1 }). Unentdecktes erscheint als „???“.
// Schlüssel: c:<kreatur> · h:<held> · f:<fusion> · e:<gegner> · b:<boss> · r:<reaktion> · s:<synergie>
import { CREATURES } from './creatures.js';
import { HEROES } from './heroes.js';
import { FUSIONS } from './fusions.js';
import { ENEMIES, BOSSES } from './enemies.js';
import { REACTIONS, SYNERGIES } from './meta.js';

export const CODEX_TABS = [
  { id: 'c', name: 'Kreaturen', icon: '🦊' }, { id: 'f', name: 'Fusionen', icon: '⚭' }, { id: 'h', name: 'Helden', icon: '🥷' },
  { id: 'e', name: 'Gegner', icon: '👾' }, { id: 'b', name: 'Bosse', icon: '👑' }, { id: 'r', name: 'Reaktionen', icon: '🌈' }, { id: 's', name: 'Synergien', icon: '🔗' },
];
export const CODEX_STEP = 10;   // alle 10 Entdeckungen eine Truhe

export function codexEntries() {
  return [
    ...Object.values(CREATURES).map(d => ({ key: 'c:' + d.id, tab: 'c', id: d.id, name: d.name, desc: d.role })),
    ...FUSIONS.map(f => ({ key: 'f:' + f.id, tab: 'f', id: f.id, name: f.name, desc: f.desc, parents: [f.a, f.b], color: f.color })),
    ...Object.entries(HEROES).map(([id, h]) => ({ key: 'h:' + id, tab: 'h', id, name: h.name, desc: h.title })),
    ...Object.entries(ENEMIES).map(([id, e]) => ({ key: 'e:' + id, tab: 'e', id, name: e.name, desc: e.desc || '' })),
    ...Object.entries(BOSSES).map(([id, b]) => ({ key: 'b:' + id, tab: 'b', id, name: b.name, desc: b.title || '' })),
    ...Object.entries(REACTIONS).map(([id, r]) => ({ key: 'r:' + id, tab: 'r', id, name: r.name, desc: r.desc, color: r.color, parts: id.split('+') })),
    ...SYNERGIES.map(s => ({ key: 's:' + s.id, tab: 's', id: s.id, name: s.name, desc: s.desc, parents: [s.a, s.b] })),
  ];
}
export const codexSeen = (P, key) => !!P.codex?.seen?.[key];
export function discover(P, key) { P.codex ||= { seen: {}, claimed: 0 }; if (P.codex.seen[key]) return false; P.codex.seen[key] = 1; return true; }
export const codexCount = P => Object.keys(P.codex?.seen || {}).length;
export const reactionKey = name => Object.keys(REACTIONS).find(k => REACTIONS[k].name === name) || null;
// Belohnung abholen: je volle CODEX_STEP Einträge eine Truhe
export function codexClaimable(P) { return Math.floor(codexCount(P) / CODEX_STEP) - (P.codex?.claimed || 0); }
export function claimCodex(P) { const n = codexClaimable(P); if (n <= 0) return 0; P.codex.claimed += n; P.chests = (P.chests || 0) + n; return n; }
