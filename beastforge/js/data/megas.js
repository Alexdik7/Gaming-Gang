// Mega-Formen: drei Endformen je Kreatur (eine je Pfad). A = Pfad 1 (Kampf), B = Pfad 2 (Kontrolle/Unterstützung), C = Pfad 3 (Präzision/Spezial).
// Freischaltung im Run: Stufe 5 auf dem Pfad + BAL.mega.kills Besiegte mit dieser Kreatur + Charakter-Level BAL.mega.lvl.
import { CREATURES } from './creatures.js';
import { FUSIONS } from './fusions.js';

export const MEGA_KIND = [
  { id: 'A', name: 'Zorn', desc: 'Rohe Gewalt: viel mehr Schaden, Fläche und Durchschlag.' },
  { id: 'B', name: 'Bann', desc: 'Kontrolle: verlangsamt, betäubt und stärkt Verbündete in der Nähe.' },
  { id: 'C', name: 'Klinge', desc: 'Präzision: kritische Treffer, Tempo und Bossjagd.' },
];
// Eigene Namen für besondere Mega-Formen (sonst „Mega-<Name der Stufe 5>“)
const NAMES = {
  kitsune: ['Amaterasu-Kitsune', 'Seelenkönigin', 'Schattenkaiserin'],
  tiger: ['Raijin-Tiger', 'Gewitterfürst', 'Blitzreißer'],
  turtle: ['Genbu, Weltenpanzer', 'Gezeitenwächter', 'Titanenschild'],
  phoenix: ['Sonnengott-Phönix', 'Ewige Flamme', 'Aschenkaiser'],
  kirin: ['Himmelskirin', 'Segenskirin', 'Lichtspeer-Kirin'],
};
// Mega-Fusionen (Vision P11): Fusion mit Stufe 5 → gleiche drei Arten, eigener Name, stärkerer Bonus (stats.js)
const FUSE_NAMES = { solfox: 'Sonnenkaiser-Fuchs', thunderwolf: 'Sturmgott-Drachenwolf', bastion: 'Weltenberg', luckdeer: 'Goldener Glückshirsch', nightblade: 'Mondsichel-Klinge',
  aurora: 'Nordlicht-Phönix', hydra: 'Ur-Hydra', tengu: 'Tengu-König', cosmofox: 'Sternenmeer-Fuchs', riverdragon: 'Ryūjin, Flussgott', sunkirin: 'Morgenröte-Kirin', templeguard: 'Tempelgott' };
export const megaId = (cid, p) => cid + ':' + p;
export function megaDef(cid, p) {
  const d = CREATURES[cid]; if (!d) return null;
  if (d.fusion) return { id: megaId(cid, p), cid, p, kind: MEGA_KIND[p], fusion: true, name: (FUSE_NAMES[cid] || 'Mega-' + d.name) + ' · ' + MEGA_KIND[p].name, desc: 'Mega-Fusion – ' + MEGA_KIND[p].desc + ' (' + d.paths[p].name + ')' };
  const path = d.paths[p], name = NAMES[cid]?.[p] || 'Mega-' + path.tiers[4].name;
  return { id: megaId(cid, p), cid, p, kind: MEGA_KIND[p], name, desc: MEGA_KIND[p].desc + ' (' + path.name + ')' };
}
export const ALL_MEGAS = () => [...Object.values(CREATURES).filter(d => !d.fusion), ...FUSIONS.map(f => CREATURES[f.id])].flatMap(d => [0, 1, 2].map(p => megaDef(d.id, p)));
