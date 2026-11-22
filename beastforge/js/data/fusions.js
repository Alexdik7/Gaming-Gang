// Fusionen: zwei erweckte Kreaturen nebeneinander → eine neue, stärkere Kreatur.
// Die Fusion übernimmt Körper + Formen von A (bis Stufe 3), Pfade aus beiden Eltern und eine Fusions-Gabe (fx).
// Fusionen werden NICHT aufgezählt (kein Shop, kein Profil-Eintrag): CREATURES[id] funktioniert, Object.keys nicht.
import { CREATURES } from './creatures.js';

export const FUSE = { range: 2.2, minStage: 1 };

export const FUSIONS = [
  { id: 'solfox', a: 'kitsune', b: 'phoenix', name: 'Sonnenfuchs', role: 'Brennender Fernkampf', elements: ['fire', 'light'], color: '#ffb43a', cost: 1500,
    desc: 'Fuchsfeuer, das nie erlischt: Kunai durchbohren mehrere Gegner und setzen sie in Brand.',
    fx: { mul: { dmg: 1.35, rate: 1.1 }, add: { pierce: 2, 'burn.dps': 8, 'burn.dur': 2.5, range: 0.3 }, set: { dmgType: 'fire' } }, paths: [['a', 0], ['b', 1], ['a', 2]] },
  { id: 'thunderwolf', a: 'dragonwolf', b: 'tiger', name: 'Donnerdrachenwolf', role: 'Blitzatem', elements: ['ice', 'lightning'], color: '#9fe0ff', cost: 1500,
    desc: 'Sein Atem trägt Blitze: Treffer springen auf bis zu 3 weitere Gegner über.',
    fx: { mul: { dmg: 1.45 }, add: { 'chain.n': 3, range: 0.3, 'stun.ch': 0.06, 'stun.dur': 0.4 }, set: { dmgType: 'lightning' } }, paths: [['a', 0], ['b', 0], ['a', 2]] },
  { id: 'bastion', a: 'golem', b: 'turtle', name: 'Bergfestung', role: 'Unbezwingbares Bollwerk', elements: ['earth', 'water'], color: '#b0c8a0', cost: 1400,
    desc: 'Ein wandelnder Berg mit Panzer: Schockwellen betäuben öfter und verlangsamen alles.',
    fx: { mul: { dmg: 1.6, rate: 1.15 }, add: { range: 0.4, 'stun.ch': 0.12, 'slow.pct': 0.3, 'slow.dur': 1.5, pierceArmor: 0.3 } }, paths: [['a', 0], ['b', 0], ['a', 2]] },
  { id: 'luckdeer', a: 'deer', b: 'neko', name: 'Glückshirsch', role: 'Segen & Gold', elements: ['spirit', 'light'], color: '#c8f07a', cost: 1200,
    desc: 'Goldene Blüten: stärkt Verbündete in der Nähe und bringt jede Welle Münzen.',
    fx: { mul: { dmg: 1.3 }, add: { income: 60, 'support.range': 1, 'support.dmg': 0.1, 'support.rate': 0.08, lucky: 1 } }, paths: [['a', 0], ['b', 0], ['a', 1]] },
  { id: 'nightblade', a: 'mantis', b: 'raven', name: 'Nachtklinge', role: 'Unsichtbarer Assassine', elements: ['phys', 'shadow'], color: '#a07bff', cost: 1300,
    desc: 'Schattenklingen: sieht Getarnte, trifft Fliegende und landet viele kritische Treffer.',
    fx: { mul: { dmg: 1.4, rate: 1.1 }, add: { 'crit.ch': 0.25, range: 0.35, cleave: 1 }, set: { camo: true, flying: true, dmgType: 'shadow', 'crit.mult': 2.6 } }, paths: [['a', 0], ['b', 0], ['a', 2]] },
  { id: 'aurora', a: 'phoenix', b: 'dragonwolf', name: 'Polarphönix', role: 'Feuer und Eis', elements: ['fire', 'ice'], color: '#ffa0e0', cost: 1600,
    desc: 'Federn aus Polarlicht: brennen UND verlangsamen. Gegner unter Frost nehmen mehr Schaden.',
    fx: { mul: { dmg: 1.45, rate: 1.1 }, add: { pierce: 1, 'slow.pct': 0.35, 'slow.dur': 1.2, 'burn.dps': 4, range: 0.3, 'crit.ch': 0.1 } }, paths: [['a', 0], ['b', 0], ['a', 2]] },
  { id: 'hydra', a: 'naga', b: 'turtle', name: 'Hydra', role: 'Vielköpfiges Gift', elements: ['shadow', 'earth'], color: '#3fc0a0', cost: 1400,
    desc: 'Drei Köpfe spucken gleichzeitig: drei Giftkugeln, die verlangsamen und lange vergiften.',
    fx: { mul: { dmg: 1.4 }, add: { shots: 2, spread: 0.35, 'burn.dps': 6, 'slow.pct': 0.2, range: 0.3 } }, paths: [['a', 0], ['b', 0], ['a', 1]] },
  { id: 'tengu', a: 'monk', b: 'raven', name: 'Sturmtengu', role: 'Sturm aus Federn', elements: ['phys', 'shadow'], color: '#7ab0ff', cost: 1400,
    desc: 'Mönch mit Rabenschwingen: Windklingen treffen Fliegende und Getarnte und schneiden noch tiefer.',
    fx: { mul: { dmg: 1.45, rate: 1.1 }, add: { pierce: 3, shots: 1, 'crit.ch': 0.15, range: 0.3 }, set: { flying: true, camo: true } }, paths: [['a', 0], ['b', 0], ['a', 1]] },
  { id: 'cosmofox', a: 'voidcat', b: 'kitsune', name: 'Kosmosfuchs', role: 'Sternenfeuer', elements: ['astral', 'fire'], color: '#ff9af0', cost: 1700,
    desc: 'Fuchsfeuer aus dem All: drei Leerenkugeln, die brennen, und kreisende Sterne.',
    fx: { mul: { dmg: 1.35 }, add: { shots: 2, spread: 0.3, 'orbs.n': 2, 'orbs.dmg': 8, 'burn.dps': 5, range: 0.2 } }, paths: [['a', 0], ['b', 0], ['a', 2]] },
  { id: 'riverdragon', a: 'kappa', b: 'naga', name: 'Flussdrache', role: 'Giftige Flut', elements: ['ice', 'shadow'], color: '#3fb0b0', cost: 1300,
    desc: 'Ein Wasserdrache mit Kappa-Schale: drei giftige Blasen, die zurückstoßen und lange vergiften.',
    fx: { mul: { dmg: 1.4 }, add: { shots: 2, spread: 0.3, 'burn.dps': 6, aoe: 0.3, range: 0.3 }, set: { poison: true } }, paths: [['a', 0], ['b', 0], ['a', 1]] },
  { id: 'sunkirin', a: 'kirin', b: 'phoenix', name: 'Sonnenkirin', role: 'Brennendes Licht', elements: ['light', 'fire'], color: '#ffb040', cost: 1700,
    desc: 'Hufe aus Sonnenfeuer: Lichtketten springen weiter und setzen alles in Brand.',
    fx: { mul: { dmg: 1.4 }, add: { 'chain.n': 3, 'burn.dps': 8, 'burn.dur': 2.5, range: 0.3 } }, paths: [['a', 0], ['b', 1], ['a', 2]] },
  { id: 'templeguard', a: 'komainu', b: 'golem', name: 'Tempelkoloss', role: 'Bossbrecher', elements: ['earth', 'phys'], color: '#d8a060', cost: 1500,
    desc: 'Ein Löwenhund aus ganzem Tempelstein: zermalmt Bosse und betäubt alles um sich.',
    fx: { mul: { dmg: 1.5, bossMul: 1.4 }, add: { cleave: 2, 'stun.ch': 0.12, 'stun.dur': 0.6, range: 0.2 } }, paths: [['a', 0], ['b', 0], ['a', 1]] },
];
export const FUSION_IDS = FUSIONS.map(f => f.id);
export const fusionFor = (a, b) => FUSIONS.find(f => (f.a === a && f.b === b) || (f.a === b && f.b === a)) || null;
export const fusionsWith = cid => FUSIONS.filter(f => f.a === cid || f.b === cid);

for (const f of FUSIONS) {
  const A = CREATURES[f.a], B = CREATURES[f.b];
  const top = A.forms.filter(x => x.stage <= 3 && (!x.branch || x.branch === 'spirit'));
  const def = {
    id: f.id, fusion: true, parents: [f.a, f.b], name: f.name, role: f.role, elements: f.elements, color: f.color, cost: A.cost + B.cost,
    place: [...new Set([...A.place, ...B.place])], model: A.model, modelStage: 3,
    lore: f.desc, base: A.base,
    // alle Formen von A bis Stufe 3 sind schon eingebaut (eine einzige Fusionsform)
    forms: [{ id: 'fused', stage: 0, lvl: 1, cost: 0, name: f.name, desc: f.desc, fx: null }],
    baseFx: [...top.filter(x => x.stage > 0).map(x => x.fx), f.fx],
    paths: f.paths.map(([w, i]) => (w === 'a' ? A : B).paths[i]),
    pathSrc: f.paths,
    ability: A.ability && { ...A.ability, lvl: 1, stage: 0 },
    ultimate: A.ultimate ? { ...A.ultimate, stage: 0 } : B.ultimate ? { ...B.ultimate, stage: 0 } : (B.ability && { ...B.ability, lvl: 1, stage: 0, slotUlt: true }),
    passives: {}, mastery: null, recipe: f,
  };
  Object.defineProperty(CREATURES, f.id, { value: def, enumerable: false, configurable: true, writable: true });
}
