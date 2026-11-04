// Region Nocturna (Phase 4): 10 Nacht-Kreaturen + legendärer Hüter Lunareth
import { SPECIES } from './creatures.js';
import { MOVES } from './moves.js';

Object.assign(MOVES, {
  mondstrahl: { name: 'Mondstrahl', type: 'magie', cat: 'spez', pow: 90, acc: 95, pp: 10, fx: 'beam' },
  schattenklaue: { name: 'Schattenklaue', type: 'schatten', cat: 'phys', pow: 80, acc: 100, pp: 15, fx: 'slash' },
  seelenfeuer: { name: 'Seelenfeuer', type: 'geist', cat: 'spez', pow: 65, acc: 100, pp: 15, fx: 'bolt', effect: { status: 'brand', chance: 20 } },
});

const L = str => str.trim().split(/\s+/).map(t => { const [l, id] = t.split(':'); return [+l, id]; });
const ST = a => ({ hp: a[0], atk: a[1], def: a[2], spa: a[3], spd: a[4], spe: a[5] });
function C(id, num, name, types, rarity, stats, catchRate, xp, learn, evo, lore, model, cry, extra = {}) {
  SPECIES[id] = { num, name, types, rarity, stats: ST(stats), catchRate, xp, learn: L(learn), evo, lore, model, cry, ...extra };
}

C('mondfalter', 76, 'Mondfalter', ['schatten', 'licht'], 'ungewoehnlich', [60, 45, 55, 85, 75, 80], 120, 110,
  '1:lichtpfeil 1:nachtschleier 14:funkelstaub 22:mondstrahl', null,
  'Seine Flügel speichern Mondlicht. In ganz dunklen Nächten leuchtet er wie eine kleine Laterne.',
  { kind: 'moth', main: '#2a2a5a', accent: '#e8e0a8', glow: '#fff8d0', size: 0.85 }, { f: 1000, f2: 1300, len: 0.35, wave: 'sine', wob: 18 });
C('seelenlaterne', 77, 'Seelenlaterne', ['geist', 'licht'], 'selten', [65, 40, 65, 95, 90, 70], 60, 150,
  '1:spukgriff 1:lichtpfeil 18:seelenfeuer 26:sonnenstrahl', null,
  'Sie schwebt über verlassenen Wegen und leuchtet Verirrten heim – manchmal aber auch tiefer in den Wald.',
  { kind: 'wisp', main: '#5a4a8a', accent: '#f8e898', glow: '#fff4c0', size: 0.85, extras: ['crown'] }, { f: 700, f2: 1100, len: 0.5, wave: 'sine', wob: 6 });
C('schattenfuchs', 78, 'Schattenfuchs', ['schatten'], 'gewoehnlich', [50, 65, 45, 50, 45, 75], 160, 70,
  '1:kratzer 1:nachtschleier 10:schattenbiss 18:flammenbiss 24:schattenklaue', { to: 'finsterfuchs', lvl: 34 },
  'Er huscht von Schatten zu Schatten und ist nur zu sehen, wenn er gesehen werden will.',
  { kind: 'fox', main: '#2a2438', accent: '#8a7aa8', glow: '#c86af8', stage: 1, size: 0.8 }, { f: 520, f2: 760, len: 0.25, wave: 'square', wob: 15 });
C('finsterfuchs', 79, 'Finsterfuchs', ['schatten', 'geist'], 'selten', [75, 95, 70, 80, 70, 100], 45, 175,
  '1:schattenklaue 1:spukgriff 34:albtraum 40:schattenball', null,
  'Seine Schweife sind aus purer Dunkelheit. Wo er vorbeiläuft, verlöschen Kerzen.',
  { kind: 'fox', main: '#1a1428', accent: '#5a4a7a', glow: '#e858f8', stage: 2, size: 1.2, extras: ['horns'] }, { f: 380, f2: 820, len: 0.4, wave: 'sawtooth', wob: 9 });
C('gruftkaefer', 80, 'Gruftkäfer', ['geist', 'metall'], 'ungewoehnlich', [60, 80, 95, 50, 70, 40], 120, 110,
  '1:eisenkralle 1:spukgriff 14:metallstoss 20:schattenball', null,
  'Er wohnt in alten Gemäuern und poliert seinen Panzer an Grabsteinen, bis er wie Silber glänzt.',
  { kind: 'beetle', main: '#5a5a6a', accent: '#a8a8c8', glow: '#a8f8e8', size: 0.8 }, { f: 300, f2: 500, len: 0.2, wave: 'square', wob: 30 });
C('mondhase', 81, 'Mondhase', ['magie'], 'ungewoehnlich', [65, 55, 60, 80, 75, 85], 100, 115,
  '1:funkelstaub 1:sprungtritt 16:mondlicht 24:mondstrahl', null,
  'Man sagt, er springe in Vollmondnächten so hoch, dass er den Mond berührt.',
  { kind: 'bunny', main: '#d8d8f0', accent: '#a888e8', glow: '#fff8c0', size: 0.7, extras: ['gem'] }, { f: 1100, f2: 1500, len: 0.25, wave: 'sine', wob: 20 });
C('finstereule', 82, 'Finstereule', ['schatten', 'luft'], 'ungewoehnlich', [70, 75, 60, 70, 65, 85], 100, 120,
  '1:windstoss 1:schattenbiss 16:sturzflug 24:schattenklaue 30:orkan', null,
  'Ihre Augen sehen in völliger Finsternis. Ihr Flügelschlag ist vollkommen lautlos.',
  { kind: 'owl', main: '#2e2a40', accent: '#7a6a9a', glow: '#f8d040', size: 0.9 }, { f: 420, f2: 300, len: 0.45, wave: 'sine', wob: 5 });
C('grabwurm', 83, 'Grabwurm', ['geist', 'erde'], 'selten', [80, 90, 85, 60, 70, 45], 60, 160,
  '1:steinwurf 1:spukgriff 18:bodenstoss 26:schattenball 32:felsgranate', null,
  'Er schlängelt sich unter alten Friedhöfen hindurch und flüstert mit den Wurzeln.',
  { kind: 'serpent', main: '#6a6058', accent: '#b8a8d8', glow: '#a8ffd0', size: 1.0, extras: ['spikes'] }, { f: 180, f2: 120, len: 0.55, wave: 'sawtooth', wob: 7 });
C('albmolch', 84, 'Albmolch', ['schatten', 'wasser'], 'ungewoehnlich', [70, 60, 65, 75, 70, 60], 120, 110,
  '1:wasserstrahl 1:nachtschleier 14:blasenwirbel 22:albtraum', null,
  'Er lebt in schwarzen Waldteichen. Wer in sein Spiegelbild schaut, träumt drei Nächte lang wirr.',
  { kind: 'axolotl', main: '#3a3a6a', accent: '#c86ae8', glow: '#a8c8ff', stage: 1, size: 0.85 }, { f: 300, f2: 450, len: 0.35, wave: 'sine', wob: 10 });
C('spukling', 85, 'Spukling', ['geist', 'gift'], 'gewoehnlich', [55, 50, 55, 65, 60, 45], 160, 70,
  '1:sporenwolke 1:spukgriff 12:giftnebel 18:seelenfeuer', null,
  'Ein Pilz, der nachts kichert. Seine Sporen leuchten grün und lassen Wanderer im Kreis laufen.',
  { kind: 'mushroom', main: '#4a3a6a', accent: '#c8f8a8', glow: '#a8ff88', size: 0.65 }, { f: 900, f2: 600, len: 0.3, wave: 'triangle', wob: 25 });
C('lunareth', 86, 'Lunareth', ['schatten', 'magie'], 'legendaer', [100, 90, 95, 120, 110, 95], 4, 280,
  '1:mondstrahl 1:schattenklaue 1:mondlicht 1:albtraum', null,
  'Hüter von Nocturna. Seit es den Herzstein des Mondes bewacht, geht über Nocturna die Sonne nicht mehr auf.',
  { kind: 'stag', main: '#2a2a5a', accent: '#c8c8f8', glow: '#fff8d0', size: 1.9, extras: ['aura'] }, { f: 260, f2: 900, len: 0.9, wave: 'sine', wob: 3 }, { legendary: true });

export const NOCTURNA = ['mondfalter', 'seelenlaterne', 'schattenfuchs', 'finsterfuchs', 'gruftkaefer', 'mondhase', 'finstereule', 'grabwurm', 'albmolch', 'spukling', 'lunareth'];
