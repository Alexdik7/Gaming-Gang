// Kreaturen als DATEN. Effekte (fx) sind Operationen auf Werte:
//   add: { pfad: +x }  mul: { pfad: ×x }  set: { pfad: wert }   (Pfade mit Punkt, z. B. 'burn.dps')
// Formen wirken kumulativ (Stufe 3 enthält 1+2), Pfadstufen ebenso.

export const BASE_STATS = {
  atk: 'proj', proj: 'kunai', dmg: 5, rate: 1, range: 3, speed: 14, pierce: 1, shots: 1, spread: 0.2,
  aoe: 0, dmgType: 'phys', flying: true, camo: false, homing: true, pierceArmor: 0, knock: 0, bossMul: 1,
  burn: { dps: 0, dur: 0 }, slow: { pct: 0, dur: 0 }, crit: { ch: 0, mult: 2 }, stun: { ch: 0, dur: 0 },
  chain: { n: 0, range: 2.2, fall: 0.78 }, orbs: { n: 0, dmg: 0, r: 1.0, slow: 0 },
  every: { n: 0, mul: 0, aoe: 0, proj: '', dmgType: '', shots: 1 },
  every2: { n: 0, mul: 0, aoe: 0, proj: '', dmgType: '', shots: 1 },
  mortar: { dmg: 0, rate: 0, aoe: 0, range: 0, burn: 0, stun: 0 },
  support: { range: 0, rate: 0, dmg: 0, rng: 0, camo: false, protect: false },
  income: 0, dash: { every: 0, mul: 0 }, multi: 0, mark: 0, brk: 0, water: 0,
  cone: 0.7, cleave: 0, bounty: 0, lifeRegen: 0,
  interest: 0, icap: 0, lucky: 0, rebirth: 0,   // Phönix: einmal pro Run bei 0 Leben mit so vielen Leben wiederauferstehen
    // Glückskatze: Zinsen auf gesparte Münzen (max. icap je Welle), Münzen je besiegtem Gegner in Reichweite
};

export const CREATURES = {
  // ───────────────────────── KITSUNE (Qualitäts-Benchmark) ─────────────────────────
  kitsune: {
    id: 'kitsune', name: 'Kitsune', role: 'Schneller Fernkampf', elements: ['fire', 'spirit'],
    color: '#ff8a3d', cost: 500, place: ['ground', 'high'], model: 'fox',
    lore: 'Füchse, die hundert Jahre im Ahnenhain wachen, erhalten einen zweiten Schweif. Diese junge Kitsune hat gerade erst gelernt, Kunai aus Fuchsfeuer zu formen – doch in ihren Augen glimmt bereits das Licht der Neunschweifigen.',
    base: { dmg: 7, rate: 1.7, range: 3.0, proj: 'kunai', speed: 15, pierce: 1 },
    forms: [
      { id: 'young', stage: 0, lvl: 1, cost: 0, name: 'Junge Kitsune', desc: 'Kleine, flinke Fuchskreatur. Wirft Kunai.' },
      { id: 'flame', stage: 1, lvl: 5, cost: 400, name: 'Flammen-Kitsune', desc: 'Feuer-Kunai mit Nachbrennen. Zweiter Schweif.',
        fx: { mul: { dmg: 1.3, rate: 1.08 }, set: { dmgType: 'fire', proj: 'firekunai' }, add: { 'burn.dps': 2, 'burn.dur': 1.5 } } },
      { id: 'spirit', stage: 2, lvl: 15, cost: 1000, branch: 'spirit', name: 'Geist-Kitsune', desc: 'Leuchtende Augen, Geist-Orbs umkreisen sie. Sieht Getarnte.',
        fx: { mul: { dmg: 1.2 }, add: { range: 0.4, 'orbs.n': 1, 'orbs.dmg': 5, pierce: 1 }, set: { camo: true } } },
      { id: 'shadow', stage: 2, lvl: 15, cost: 1000, branch: 'shadow', name: 'Schatten-Kitsune', desc: 'Violette Schattenflammen. Kritische Treffer durchbrechen Panzer.',
        fx: { mul: { dmg: 1.25 }, add: { 'crit.ch': 0.15, pierceArmor: 0.4 }, set: { 'crit.mult': 2.5, dmgType: 'shadow', proj: 'shadowkunai' } } },
      { id: 'ninetail', stage: 3, lvl: 30, cost: 2400, name: 'Neunschweif-Wächterin', desc: 'Neun Schweife, Fuchsfeuer-Fächer aus drei Klingen. Schaltet das Ultimate frei.',
        fx: { mul: { dmg: 1.35 }, add: { shots: 2, 'orbs.n': 1, range: 0.2 }, set: { proj: 'foxfire' } } },
      { id: 'celestial', stage: 4, lvl: 40, cost: 4200, name: 'Himmels-Neunschweif', desc: 'Leuchtende Runen. Jeder 4. Angriff entfesselt drei Himmelsrunen.',
        fx: { mul: { dmg: 1.15, rate: 1.15 }, set: { 'every2.n': 4, 'every2.mul': 2.2, 'every2.proj': 'rune', 'every2.dmgType': 'light', 'every2.shots': 3, 'every2.aoe': 0.6 } } },
      { id: 'astral', stage: 5, lvl: 50, cost: 7500, name: 'Astrale Fuchsgottheit', desc: 'Endform. Astralschaden ignoriert Resistenzen, Sternenaura stärkt Verbündete.',
        fx: { mul: { dmg: 1.4 }, set: { dmgType: 'astral', proj: 'astral', 'every2.proj': 'star' }, add: { 'every2.shots': 2, 'every2.mul': 1, 'orbs.n': 2, 'support.dmg': 0.1, 'support.range': 2.2 } } },
    ],
    paths: [
      { id: 'flame', name: 'Flamme', icon: '🔥', tiers: [
        { name: 'Schärfere Kunai', cost: 200, desc: '+2 Schaden', fx: { add: { dmg: 2 } } },
        { name: 'Flammen-Kunai', cost: 450, desc: 'Kunai setzen Gegner in Brand', fx: { set: { dmgType: 'fire' }, add: { 'burn.dps': 3, 'burn.dur': 2 } } },
        { name: 'Fuchsfeuer', cost: 1100, desc: 'Jeder 3. Wurf: explodierender Feuerball (×3)', fx: { set: { 'every.n': 3, 'every.mul': 3, 'every.aoe': 1.2, 'every.proj': 'fireball', 'every.dmgType': 'fire' } } },
        { name: 'Feuerwirbel', cost: 2600, desc: 'Brand ×2,2, Kunai explodieren klein', fx: { mul: { 'burn.dps': 2.2 }, add: { aoe: 0.7, 'every.aoe': 0.4 } } },
        { name: 'Inferno-Fuchs', cost: 6500, desc: 'Schaden ×2, jeder 2. Wurf ein Feuerball, Höllenbrand', fx: { mul: { dmg: 2 }, set: { 'every.n': 2 }, add: { 'burn.dps': 20, 'every.mul': 1 } } },
      ] },
      { id: 'spirit', name: 'Geist', icon: '👁', tiers: [
        { name: 'Geistsicht', cost: 180, desc: '+0,6 Reichweite, erkennt Getarnte', fx: { add: { range: 0.6 }, set: { camo: true } } },
        { name: 'Irrlichter', cost: 420, desc: '2 Geist-Orbs kreisen und verbrennen Nahe', fx: { add: { 'orbs.n': 2, 'orbs.dmg': 5 } } },
        { name: 'Geisterklinge', cost: 1000, desc: 'Kunai durchbohren 3 weitere Gegner, ignorieren Panzer', fx: { add: { pierce: 3, pierceArmor: 0.6 } } },
        { name: 'Seelenband', cost: 2700, desc: '+2 Orbs, Orbs verlangsamen', fx: { add: { 'orbs.n': 2, 'orbs.dmg': 9 }, set: { 'orbs.slow': 0.25 } } },
        { name: 'Ahnenfuchs', cost: 7000, desc: 'Alle 5 s jagt ein Geisterfuchs den Pfad entlang', fx: { set: { 'dash.every': 5 }, add: { 'dash.mul': 40, 'orbs.dmg': 10 } } },
      ] },
      { id: 'shinobi', name: 'Shinobi', icon: '🗡', tiers: [
        { name: 'Flinke Hände', cost: 200, desc: '+20 % Angriffstempo', fx: { mul: { rate: 1.2 } } },
        { name: 'Doppelwurf', cost: 480, desc: 'Wirft 2 Kunai', fx: { add: { shots: 1 } } },
        { name: 'Schattenschritt', cost: 950, desc: '20 % Krit-Chance (×2,5)', fx: { add: { 'crit.ch': 0.2 }, set: { 'crit.mult': 2.5 } } },
        { name: 'Kunai-Fächer', cost: 2300, desc: '+2 Kunai, +15 % Tempo', fx: { add: { shots: 2 }, mul: { rate: 1.15 } } },
        { name: 'Tausend Klingen', cost: 6200, desc: 'Tempo ×1,8, +2 Kunai, Krits ×3', fx: { mul: { rate: 1.8 }, add: { shots: 2, 'crit.ch': 0.1 }, set: { 'crit.mult': 3 } } },
      ] },
    ],
    ability: { id: 'foxstorm', name: 'Fuchsfeuer-Sturm', lvl: 8, stage: 1, cd: 45, desc: 'Ein riesiger Fuchsgeist stürzt sich auf die dichteste Gegnergruppe: gewaltige Feuerexplosion + Brand.' },
    ultimate: { id: 'judgement', name: 'Urteil der Neun', stage: 3, cd: 90, desc: 'Neun Säulen aus Seelenfeuer treffen die neun stärksten Gegner und betäuben sie.' },
    passives: {
      20: { name: 'Fuchsglut', desc: 'Brand +50 % Schaden, +1 s', fx: { mul: { 'burn.dps': 1.5 }, add: { 'burn.dur': 1 } } },
      40: { name: 'Seelenecho', desc: '12 % Chance auf eine zweite Salve', fx: { add: { multi: 0.12 } } },
      50: { name: 'Sternenfuchs', desc: 'Meister: +10 % Schaden, Orbs ×2 Schaden', fx: { mul: { dmg: 1.1, 'orbs.dmg': 2 } } },
    },
    mastery: { title: 'Fuchsflüsterer', skins: [{ name: 'Mondweiß', pal: 'moon' }, { name: 'Sternenfell', pal: 'star' }] },
  },

  // ───────────────────────── DONNERTIGER ─────────────────────────
  tiger: {
    id: 'tiger', name: 'Donnertiger', role: 'Burst-Schaden', elements: ['lightning'],
    color: '#ffd23d', cost: 600, place: ['ground', 'high'], model: 'tiger',
    lore: 'Wo der Donnertiger brüllt, schlägt der Blitz zweimal ein. Er jagt nicht – er wählt.',
    base: { atk: 'chain', dmg: 17, rate: 0.85, range: 2.6, dmgType: 'lightning', 'chain.n': 1 },
    forms: [
      { id: 'cub', stage: 0, lvl: 1, cost: 0, name: 'Junger Donnertiger', desc: 'Blitze springen auf einen zweiten Gegner.' },
      { id: 'storm', stage: 1, lvl: 10, cost: 700, name: 'Sturmtiger', desc: 'Blitzhörner, Kette +1.', fx: { mul: { dmg: 1.3 }, add: { 'chain.n': 1 } } },
      { id: 'king', stage: 2, lvl: 25, cost: 2600, name: 'Donnerkönig', desc: 'Sturmmähne. Jeder 5. Angriff: Donnerschlag.', fx: { mul: { dmg: 1.45, rate: 1.15 }, set: { 'every2.n': 5, 'every2.mul': 3, 'every2.aoe': 1.4, 'every2.proj': 'thunder', 'every2.dmgType': 'lightning' } } },
    ],
    paths: [
      { id: 'storm', name: 'Sturm', icon: '⛈', tiers: [
        { name: 'Funkenschlag', cost: 250, desc: 'Kette +1', fx: { add: { 'chain.n': 1 } } },
        { name: 'Kettenblitz', cost: 600, desc: 'Kette +2, weiter springend', fx: { add: { 'chain.n': 2, 'chain.range': 0.6 } } },
        { name: 'Gewitterzelle', cost: 1400, desc: 'Jeder 4. Angriff: Donnerschlag (×3, Fläche)', fx: { set: { 'every.n': 4, 'every.mul': 3, 'every.aoe': 1.4, 'every.proj': 'thunder', 'every.dmgType': 'lightning' } } },
        { name: 'Sturmfront', cost: 3000, desc: 'Kette +3, 15 % Betäubung', fx: { add: { 'chain.n': 3, 'stun.ch': 0.15, 'stun.dur': 0.6 } } },
        { name: 'Himmelszorn', cost: 7500, desc: 'Schaden ×2, Kette +6, jeder 3. ein Donnerschlag', fx: { mul: { dmg: 2 }, add: { 'chain.n': 6 }, set: { 'every.n': 3 } } },
      ] },
      { id: 'predator', name: 'Raubtier', icon: '🐾', tiers: [
        { name: 'Scharfe Krallen', cost: 220, desc: '+6 Schaden', fx: { add: { dmg: 6 } } },
        { name: 'Jagdinstinkt', cost: 520, desc: '20 % Krit (×2,5)', fx: { add: { 'crit.ch': 0.2 }, set: { 'crit.mult': 2.5 } } },
        { name: 'Fangbiss', cost: 1300, desc: 'Ignoriert 60 % Panzer, +25 % Bossschaden', fx: { add: { pierceArmor: 0.6 }, mul: { bossMul: 1.25 } } },
        { name: 'Blutrausch', cost: 3200, desc: 'Tempo ×1,5, +20 Schaden', fx: { mul: { rate: 1.5 }, add: { dmg: 20 } } },
        { name: 'Spitzenjäger', cost: 8000, desc: 'Schaden ×2,5, Krits ×3, Bossschaden +50 %', fx: { mul: { dmg: 2.5, bossMul: 1.5 }, add: { 'crit.ch': 0.15 }, set: { 'crit.mult': 3 } } },
      ] },
      { id: 'god', name: 'Donnergott', icon: '⚡', tiers: [
        { name: 'Statik', cost: 200, desc: '+0,5 Reichweite', fx: { add: { range: 0.5 } } },
        { name: 'Donnerhall', cost: 550, desc: '10 % Betäubung (0,5 s)', fx: { add: { 'stun.ch': 0.1, 'stun.dur': 0.5 } } },
        { name: 'Blitzthron', cost: 1250, desc: 'Tempo ×1,35, Kette springt weiter', fx: { mul: { rate: 1.35 }, add: { 'chain.range': 1 } } },
        { name: 'Gewitteraura', cost: 2900, desc: 'Türme in der Nähe +10 % Tempo', fx: { add: { 'support.range': 2.2, 'support.rate': 0.1 } } },
        { name: 'Donnerherr', cost: 7800, desc: 'Tempo und Schaden ×1,6, Kette +4', fx: { mul: { rate: 1.6, dmg: 1.6 }, add: { 'chain.n': 4, 'stun.ch': 0.1 } } },
      ] },
    ],
    ability: { id: 'roar', name: 'Donnerbrüllen', lvl: 8, stage: 1, cd: 40, desc: 'Ein Blitzgewitter trifft bis zu 12 Gegner und betäubt sie 1,5 s.' },
    passives: {
      20: { name: 'Überladung', desc: 'Kette +1', fx: { add: { 'chain.n': 1 } } },
      40: { name: 'Gewitterkern', desc: '+5 % Betäubung', fx: { add: { 'stun.ch': 0.05, 'stun.dur': 0.3 } } },
      50: { name: 'Blitzfürst', desc: 'Meister: Kette verliert kaum Schaden', fx: { set: { 'chain.fall': 0.95 } } },
    },
    mastery: { title: 'Sturmbändiger', skins: [{ name: 'Schneetiger', pal: 'moon' }, { name: 'Sternenfell', pal: 'star' }] },
  },

  // ───────────────────────── EISENSCHILDKRÖTE ─────────────────────────
  turtle: {
    id: 'turtle', name: 'Eisenschildkröte', role: 'Kontrolle / Wasser', elements: ['earth'],
    color: '#6fb3c8', cost: 450, place: ['ground', 'high', 'water'], model: 'turtle',
    lore: 'Ihr Panzer stammt aus dem Erz eines gefallenen Sterns. Im Wasser erwacht ihre wahre Kraft.',
    base: { atk: 'pulse', dmg: 9, rate: 0.55, range: 1.6, dmgType: 'earth', flying: false, camo: true, 'slow.pct': 0.25, 'slow.dur': 1, knock: 0.25, water: 0.2 },
    forms: [
      { id: 'young', stage: 0, lvl: 1, cost: 0, name: 'Eisenschildkröte', desc: 'Schockwellen um sich herum, verlangsamt. Im Wasser +20 % Tempo.' },
      { id: 'bastion', stage: 1, lvl: 10, cost: 600, name: 'Bollwerk-Schildkröte', desc: 'Stachelpanzer, stärkere Wellen.', fx: { mul: { dmg: 1.3 }, add: { range: 0.2 } } },
      { id: 'mountain', stage: 2, lvl: 25, cost: 2200, name: 'Bergpanzer', desc: 'Ein wandelnder Berg. Wellen betäuben.', fx: { mul: { dmg: 1.5 }, add: { knock: 0.2, 'stun.ch': 0.1, 'stun.dur': 0.6 } } },
    ],
    paths: [
      { id: 'fortress', name: 'Festung', icon: '🛡', tiers: [
        { name: 'Dicker Panzer', cost: 200, desc: '+10 % Verlangsamung', fx: { add: { 'slow.pct': 0.1 } } },
        { name: 'Erdbeben', cost: 500, desc: '+8 Schaden, +0,3 Reichweite', fx: { add: { dmg: 8, range: 0.3 } } },
        { name: 'Bollwerk', cost: 1200, desc: 'Stärkerer Rückstoß, 15 % Betäubung', fx: { add: { knock: 0.4, 'stun.ch': 0.15, 'stun.dur': 0.8 } } },
        { name: 'Panzerbrecher', cost: 2600, desc: 'Getroffene verlieren 4 s ihren Panzer', fx: { add: { pierceArmor: 1 }, set: { brk: 4 } } },
        { name: 'Unerschütterlich', cost: 6500, desc: 'Schaden ×3, +0,8 Reichweite, 30 % Betäubung', fx: { mul: { dmg: 3 }, add: { range: 0.8, 'stun.ch': 0.15, 'stun.dur': 0.2 } } },
      ] },
      { id: 'siege', name: 'Belagerung', icon: '💥', tiers: [
        { name: 'Rückenkanone', cost: 300, desc: 'Mörser auf dem Panzer (Fläche, Reichweite 4,5)', fx: { add: { 'mortar.dmg': 14, 'mortar.rate': 0.45, 'mortar.aoe': 1.0, 'mortar.range': 4.5 } } },
        { name: 'Schwere Ladung', cost: 650, desc: 'Mörser +14 Schaden, größere Explosion', fx: { add: { 'mortar.dmg': 14, 'mortar.aoe': 0.3 } } },
        { name: 'Brandgeschosse', cost: 1400, desc: 'Mörser setzt in Brand', fx: { add: { 'mortar.burn': 9 } } },
        { name: 'Zwillingsrohr', cost: 3000, desc: 'Mörser-Tempo ×2', fx: { mul: { 'mortar.rate': 2 } } },
        { name: 'Bergbrecher', cost: 7000, desc: 'Mörser ×3, riesige Explosion, betäubt', fx: { mul: { 'mortar.dmg': 3 }, add: { 'mortar.aoe': 0.7, 'mortar.stun': 0.6 } } },
      ] },
      { id: 'titan', name: 'Titanenpanzer', icon: '🗿', tiers: [
        { name: 'Stachelpanzer', cost: 180, desc: '+4 Schaden', fx: { add: { dmg: 4 } } },
        { name: 'Schutzschild', cost: 450, desc: 'Türme in der Nähe sind vor Störung geschützt, +5 % Schaden', fx: { add: { 'support.range': 2, 'support.dmg': 0.05 }, set: { 'support.protect': true } } },
        { name: 'Schildwall', cost: 1100, desc: '+0,6 Reichweite, Tempo ×1,3', fx: { add: { range: 0.6 }, mul: { rate: 1.3 } } },
        { name: 'Titanenstoß', cost: 2600, desc: 'Gewaltiger Rückstoß, 50 % Verlangsamung', fx: { add: { knock: 0.8 }, set: { 'slow.pct': 0.5 } } },
        { name: 'Uralter Titan', cost: 6800, desc: 'Schaden ×3, trifft auch Fliegende', fx: { mul: { dmg: 3 }, add: { range: 0.6 }, set: { flying: true } } },
      ] },
    ],
    ability: { id: 'fortress', name: 'Panzerfestung', lvl: 8, stage: 1, cd: 40, desc: 'Gewaltige Schockwelle: schleudert alle Gegner in der Nähe zurück und verlangsamt sie stark.' },
    passives: {
      20: { name: 'Gezeitenpanzer', desc: 'Wasserbonus +15 %', fx: { add: { water: 0.15 } } },
      40: { name: 'Erdkern', desc: '+10 % Schaden, +0,2 Reichweite', fx: { mul: { dmg: 1.1 }, add: { range: 0.2 } } },
      50: { name: 'Weltenpanzer', desc: 'Meister: Wellen treffen Fliegende', fx: { set: { flying: true } } },
    },
    mastery: { title: 'Felsenherz', skins: [{ name: 'Jadepanzer', pal: 'moon' }, { name: 'Sternenpanzer', pal: 'star' }] },
  },

  // ───────────────────────── GEISTHIRSCH ─────────────────────────
  deer: {
    id: 'deer', name: 'Geisthirsch', role: 'Unterstützung / Wirtschaft', elements: ['spirit'],
    color: '#7be0a8', cost: 400, place: ['ground', 'high'], model: 'deer',
    lore: 'Wo der Geisthirsch grast, blühen die Kirschbäume außerhalb der Zeit. Seine Nähe gibt anderen Mut.',
    base: { dmg: 4, rate: 0.9, range: 2.6, proj: 'leaf', speed: 11, dmgType: 'spirit', 'slow.pct': 0.15, 'slow.dur': 0.8, 'support.range': 2.4, 'support.rate': 0.08 },
    forms: [
      { id: 'fawn', stage: 0, lvl: 1, cost: 0, name: 'Geisthirsch-Kitz', desc: 'Stärkt Türme in der Nähe (+8 % Tempo).' },
      { id: 'forest', stage: 1, lvl: 10, cost: 500, name: 'Waldhirsch', desc: 'Blühendes Geweih, stärkere Aura.', fx: { add: { 'support.rate': 0.04, 'support.range': 0.3, dmg: 2 } } },
      { id: 'celestial', stage: 2, lvl: 25, cost: 1800, name: 'Himmelshirsch', desc: 'Leuchtendes Geweih. Aura gibt auch Schaden.', fx: { add: { 'support.dmg': 0.06, 'support.rate': 0.03, dmg: 4 }, set: { dmgType: 'light', proj: 'light' } } },
    ],
    paths: [
      { id: 'guardian', name: 'Waldhüter', icon: '🌿', tiers: [
        { name: 'Wurzelgriff', cost: 200, desc: '+15 % Verlangsamung', fx: { add: { 'slow.pct': 0.15, 'slow.dur': 0.4 } } },
        { name: 'Dornenranken', cost: 500, desc: '+5 Schaden, Blätter durchbohren 3', fx: { add: { dmg: 5, pierce: 3 } } },
        { name: 'Hainwächter', cost: 1200, desc: 'Aura: +12 % Tempo, +10 % Reichweite', fx: { add: { 'support.rate': 0.12, 'support.rng': 0.1 } } },
        { name: 'Uralter Wald', cost: 2800, desc: 'Aura: +15 % Schaden', fx: { add: { 'support.dmg': 0.15, 'support.range': 0.4 } } },
        { name: 'Herz des Waldes', cost: 6500, desc: 'Aura: +20 % Tempo/Schaden, alle erkennen Getarnte', fx: { add: { 'support.rate': 0.2, 'support.dmg': 0.2, 'support.rng': 0.05 }, set: { 'support.camo': true } } },
      ] },
      { id: 'priest', name: 'Geistpriester', icon: '🪙', tiers: [
        { name: 'Opfergabe', cost: 250, desc: '+45 Münzen je Welle', fx: { add: { income: 45 } } },
        { name: 'Segensgeld', cost: 600, desc: '+90 Münzen je Welle', fx: { add: { income: 90 } } },
        { name: 'Glücksschrein', cost: 1400, desc: '+170 Münzen je Welle, kämpft schwächer', fx: { add: { income: 170 }, mul: { dmg: 0.6 } } },
        { name: 'Goldhain', cost: 3000, desc: '+380 Münzen je Welle', fx: { add: { income: 380 } } },
        { name: 'Tempel der Fülle', cost: 7000, desc: '+950 Münzen je Welle', fx: { add: { income: 950 } } },
      ] },
      { id: 'sky', name: 'Himmelshirsch', icon: '✨', tiers: [
        { name: 'Sternenblick', cost: 200, desc: 'Türme in der Aura erkennen Getarnte', fx: { set: { 'support.camo': true, camo: true } } },
        { name: 'Lichtstrahl', cost: 550, desc: '+6 Schaden (Licht)', fx: { add: { dmg: 6 }, set: { dmgType: 'light', proj: 'light' } } },
        { name: 'Himmelssegen', cost: 1300, desc: 'Aura: +12 % Schaden', fx: { add: { 'support.dmg': 0.12 } } },
        { name: 'Lichtgeweih', cost: 2900, desc: 'Jeder 3. Angriff: Lichtnova (×4)', fx: { set: { 'every.n': 3, 'every.mul': 4, 'every.aoe': 1.5, 'every.proj': 'nova', 'every.dmgType': 'light' } } },
        { name: 'Hirschgöttin', cost: 7200, desc: 'Schaden ×3, Aura +25 % Schaden, +15 % Tempo', fx: { mul: { dmg: 3 }, add: { 'support.dmg': 0.25, 'support.rate': 0.15 } } },
      ] },
    ],
    ability: { id: 'blessing', name: 'Segen des Hains', lvl: 8, stage: 1, cd: 50, desc: 'Alle Türme in der Nähe: +40 % Tempo, +20 % Schaden für 8 s.' },
    passives: {
      20: { name: 'Blütenduft', desc: 'Aura-Reichweite +0,3', fx: { add: { 'support.range': 0.3 } } },
      40: { name: 'Ewiger Frühling', desc: '+20 Münzen je Welle', fx: { add: { income: 20 } } },
      50: { name: 'Hainkönig', desc: 'Meister: Aura +5 % Tempo und Schaden', fx: { add: { 'support.rate': 0.05, 'support.dmg': 0.05 } } },
    },
    mastery: { title: 'Hainbewahrer', skins: [{ name: 'Herbstfell', pal: 'moon' }, { name: 'Sternenfell', pal: 'star' }] },
  },

  // ───────────────────────── SCHATTENRABE ─────────────────────────
  raven: {
    id: 'raven', name: 'Schattenrabe', role: 'Tarnung / Kritisch', elements: ['shadow'],
    color: '#9a7bff', cost: 350, place: ['ground', 'high'], model: 'raven',
    lore: 'Kein Feind bleibt vor dem Schattenraben verborgen. Er sieht durch Nebel, Tarnung und Lügen.',
    base: { dmg: 5, rate: 1.5, range: 3.4, proj: 'feather', speed: 18, camo: true, dmgType: 'shadow', 'crit.ch': 0.15, 'crit.mult': 2.5 },
    forms: [
      { id: 'raven', stage: 0, lvl: 1, cost: 0, name: 'Schattenrabe', desc: 'Erkennt Getarnte, trifft oft kritisch.' },
      { id: 'masked', stage: 1, lvl: 10, cost: 450, name: 'Maskenrabe', desc: 'Weiße Kampfmaske. Präziser.', fx: { mul: { dmg: 1.25 }, add: { 'crit.ch': 0.05 } } },
      { id: 'void', stage: 2, lvl: 25, cost: 1700, name: 'Leerenrabe', desc: 'Vier Schwingen aus Leere. Doppelte Federn.', fx: { mul: { dmg: 1.4 }, add: { shots: 1 } } },
    ],
    paths: [
      { id: 'night', name: 'Nacht', icon: '🌙', tiers: [
        { name: 'Nachtaugen', cost: 150, desc: '+0,6 Reichweite', fx: { add: { range: 0.6 } } },
        { name: 'Eulenblick', cost: 400, desc: 'Türme in der Nähe erkennen Getarnte', fx: { add: { 'support.range': 2.2 }, set: { 'support.camo': true } } },
        { name: 'Mondschwingen', cost: 1000, desc: '+1 Feder pro Angriff', fx: { add: { shots: 1 } } },
        { name: 'Nachtschwarm', cost: 2500, desc: '+2 Federn, Tempo ×1,3', fx: { add: { shots: 2 }, mul: { rate: 1.3 } } },
        { name: 'Ewige Nacht', cost: 6400, desc: '+3 Federn, Schaden ×2,2, Treffer markieren', fx: { add: { shots: 3, mark: 0.2 }, mul: { dmg: 2.2 } } },
      ] },
      { id: 'assassin', name: 'Assassine', icon: '🎯', tiers: [
        { name: 'Scharfe Federn', cost: 200, desc: '+3 Schaden', fx: { add: { dmg: 3 } } },
        { name: 'Schwachstelle', cost: 480, desc: '+15 % Krit', fx: { add: { 'crit.ch': 0.15 } } },
        { name: 'Todesmarke', cost: 1150, desc: 'Krits ×4, ignoriert 50 % Panzer', fx: { set: { 'crit.mult': 4 }, add: { pierceArmor: 0.5 } } },
        { name: 'Kopfgeld', cost: 2700, desc: '+10 % Krit, Bossschaden +30 %', fx: { add: { 'crit.ch': 0.1 }, mul: { bossMul: 1.3 } } },
        { name: 'Schattenklinge', cost: 7000, desc: 'Schaden ×3, Krits ×5', fx: { mul: { dmg: 3 }, add: { 'crit.ch': 0.1 }, set: { 'crit.mult': 5 } } },
      ] },
      { id: 'void', name: 'Leere', icon: '🕳', tiers: [
        { name: 'Leerenfeder', cost: 220, desc: 'Federn durchbohren 2 weitere', fx: { add: { pierce: 2 } } },
        { name: 'Leerenriss', cost: 520, desc: 'Ignoriert 30 % Panzer', fx: { add: { pierceArmor: 0.3 } } },
        { name: 'Verschlingen', cost: 1200, desc: 'Treffer: Gegner nehmen 15 % mehr Schaden', fx: { add: { mark: 0.15 } } },
        { name: 'Leerenschlund', cost: 2800, desc: 'Jeder 5. Angriff: Leerenkugel (×5, Fläche)', fx: { set: { 'every.n': 5, 'every.mul': 5, 'every.aoe': 1.4, 'every.proj': 'voidorb', 'every.dmgType': 'shadow' } } },
        { name: 'Herr der Leere', cost: 7600, desc: 'Jeder 3. Angriff: Leerenkugel (×8)', fx: { set: { 'every.n': 3, 'every.mul': 8 }, add: { 'every.aoe': 0.4 } } },
      ] },
    ],
    ability: { id: 'eclipse', name: 'Mondfinsternis', lvl: 8, stage: 1, cd: 50, desc: 'Alle Gegner werden 8 s enttarnt und nehmen 30 % mehr Schaden.' },
    passives: {
      20: { name: 'Schattenblick', desc: '+0,3 Reichweite', fx: { add: { range: 0.3 } } },
      40: { name: 'Rabenschwarm', desc: '+5 % Krit', fx: { add: { 'crit.ch': 0.05 } } },
      50: { name: 'Nachtkönig', desc: 'Meister: Krits ×1,5 stärker', fx: { mul: { 'crit.mult': 1.5 } } },
    },
    mastery: { title: 'Schattenseher', skins: [{ name: 'Silberfeder', pal: 'moon' }, { name: 'Sternenfeder', pal: 'star' }] },
  },
};

// ───────────────────────── DRACHENWOLF (Atem-Kegel, Eis/Feuer) ─────────────────────────
CREATURES.dragonwolf = {
  id: 'dragonwolf', name: 'Drachenwolf', role: 'Hybrid / Atem-Kegel', elements: ['ice', 'fire'],
  color: '#7ad0ff', cost: 550, place: ['ground', 'high'], model: 'dragonwolf',
  lore: 'Ein Wolf, dessen Ahnin ein Eisdrache war. Sein Atem friert Flüsse – oder bringt sie zum Kochen, wenn er wütend ist.',
  base: { atk: 'breath', dmg: 4, rate: 2, range: 2.2, dmgType: 'ice', cone: 0.75, 'slow.pct': 0.2, 'slow.dur': 0.8 },
  forms: [
    { id: 'pup', stage: 0, lvl: 1, cost: 0, name: 'Junger Drachenwolf', desc: 'Frostatem in einem Kegel, verlangsamt alle darin.' },
    { id: 'frostfang', stage: 1, lvl: 10, cost: 650, name: 'Frostfang', desc: 'Eishörner, breiterer Atem.', fx: { mul: { dmg: 1.3 }, add: { cone: 0.2, range: 0.2 } } },
    { id: 'skywolf', stage: 2, lvl: 25, cost: 2400, name: 'Sturmdrachen-Wolf', desc: 'Drachenschwingen. Jeder 5. Atem: Drachen-Nova.', fx: { mul: { dmg: 1.45 }, set: { 'every2.n': 5, 'every2.mul': 4, 'every2.aoe': 1.5, 'every2.proj': 'nova', 'every2.dmgType': 'ice' } } },
  ],
  paths: [
    { id: 'frost', name: 'Frost', icon: '❄', tiers: [
      { name: 'Eiszähne', cost: 200, desc: '+15 % Verlangsamung', fx: { add: { 'slow.pct': 0.15 } } },
      { name: 'Frostatem', cost: 480, desc: '+3 Schaden, Kälte hält länger', fx: { add: { dmg: 3, 'slow.dur': 1 } } },
      { name: 'Gefrieren', cost: 1150, desc: '12 % Chance zu erstarren (0,8 s)', fx: { add: { 'stun.ch': 0.12, 'stun.dur': 0.8 } } },
      { name: 'Permafrost', cost: 2700, desc: '+0,4 Reichweite, 60 % Verlangsamung', fx: { add: { range: 0.4 }, set: { 'slow.pct': 0.6 } } },
      { name: 'Weißer Winter', cost: 6900, desc: 'Schaden ×2,5, 25 % Erstarren, bricht Panzer', fx: { mul: { dmg: 2.5 }, add: { 'stun.ch': 0.13, 'stun.dur': 0.4 }, set: { brk: 2 } } },
    ] },
    { id: 'inferno', name: 'Inferno', icon: '🔥', tiers: [
      { name: 'Glutkehle', cost: 250, desc: 'Feueratem: setzt in Brand', fx: { set: { dmgType: 'fire' }, add: { 'burn.dps': 3, 'burn.dur': 2 } } },
      { name: 'Feuerlunge', cost: 550, desc: '+4 Schaden', fx: { add: { dmg: 4 } } },
      { name: 'Flammenwalze', cost: 1300, desc: 'Breiterer Kegel, Brand ×2', fx: { add: { cone: 0.35 }, mul: { 'burn.dps': 2 } } },
      { name: 'Höllenschlund', cost: 3100, desc: 'Tempo ×1,4, +8 Brand', fx: { mul: { rate: 1.4 }, add: { 'burn.dps': 8 } } },
      { name: 'Inferno-Drache', cost: 7400, desc: 'Schaden ×2,6, +25 Brand', fx: { mul: { dmg: 2.6 }, add: { 'burn.dps': 25 } } },
    ] },
    { id: 'dragon', name: 'Drache', icon: '🐉', tiers: [
      { name: 'Drachenschuppen', cost: 220, desc: '+0,3 Reichweite, +10 % Bossschaden', fx: { add: { range: 0.3 }, mul: { bossMul: 1.1 } } },
      { name: 'Schwingenschlag', cost: 500, desc: 'Atem stößt zurück', fx: { add: { knock: 0.3 } } },
      { name: 'Drachenblut', cost: 1250, desc: 'Jeder 4. Atem: Drachenfeuerball (×4)', fx: { set: { 'every.n': 4, 'every.mul': 4, 'every.aoe': 1.3, 'every.proj': 'fireball', 'every.dmgType': 'fire' } } },
      { name: 'Drachenzorn', cost: 2900, desc: '15 % Krit (×2,5)', fx: { add: { 'crit.ch': 0.15 }, set: { 'crit.mult': 2.5 } } },
      { name: 'Urdrache', cost: 7600, desc: 'Jeder 3. Atem: Feuerball ×7, Schaden ×1,6', fx: { set: { 'every.n': 3, 'every.mul': 7 }, mul: { dmg: 1.6 } } },
    ] },
  ],
  ability: { id: 'blizzard', name: 'Eissturm', lvl: 8, stage: 1, cd: 45, desc: 'Alle Gegner in der Nähe erstarren 2,5 s und nehmen schweren Frostschaden.' },
  passives: {
    20: { name: 'Kalte Glut', desc: '+10 % Verlangsamung', fx: { add: { 'slow.pct': 0.1 } } },
    40: { name: 'Drachenatem', desc: 'Kegel +0,15', fx: { add: { cone: 0.15 } } },
    50: { name: 'Eisfeuer-Herrscher', desc: 'Meister: +15 % Schaden', fx: { mul: { dmg: 1.15 } } },
  },
  mastery: { title: 'Frostzähmer', skins: [{ name: 'Glutfell', pal: 'moon' }, { name: 'Sternenfell', pal: 'star' }] },
};

// ───────────────────────── MANTISKLINGE (extremes Tempo, Nahkampf) ─────────────────────────
CREATURES.mantis = {
  id: 'mantis', name: 'Mantisklinge', role: 'Extremes Tempo / Nahkampf', elements: ['phys', 'shadow'],
  color: '#7af07a', cost: 400, place: ['ground', 'high'], model: 'mantis',
  lore: 'Die Mantisklingen trainieren tausend Jahre lang nur einen einzigen Schnitt – und führen ihn dann tausendmal pro Minute aus.',
  base: { atk: 'slash', dmg: 2.6, rate: 4, range: 1.45, dmgType: 'phys', cleave: 1 },
  forms: [
    { id: 'blade', stage: 0, lvl: 1, cost: 0, name: 'Mantisklinge', desc: 'Rasend schnelle Hiebe, trifft auch einen Nachbarn.' },
    { id: 'queen', stage: 1, lvl: 10, cost: 450, name: 'Sichelmeisterin', desc: 'Vier Sicheln, präziser.', fx: { mul: { dmg: 1.3, rate: 1.1 } } },
    { id: 'crimson', stage: 2, lvl: 25, cost: 1700, name: 'Purpurmantis', desc: 'Purpurne Klingen, mehr Nachbartreffer.', fx: { mul: { dmg: 1.45 }, add: { cleave: 1, pierceArmor: 0.3 } } },
  ],
  paths: [
    { id: 'assassin', name: 'Assassine', icon: '🗡', tiers: [
      { name: 'Schärfere Sicheln', cost: 180, desc: '+1,5 Schaden', fx: { add: { dmg: 1.5 } } },
      { name: 'Lautlos', cost: 420, desc: 'Erkennt Getarnte, 10 % Krit', fx: { set: { camo: true }, add: { 'crit.ch': 0.1 } } },
      { name: 'Todesstoß', cost: 1000, desc: '25 % Krit (×3)', fx: { add: { 'crit.ch': 0.15 }, set: { 'crit.mult': 3 } } },
      { name: 'Kopfjäger', cost: 2500, desc: '+40 % Bossschaden, +4 Schaden', fx: { mul: { bossMul: 1.4 }, add: { dmg: 4 } } },
      { name: 'Schattensense', cost: 6600, desc: 'Schaden ×2,5, Krits ×4', fx: { mul: { dmg: 2.5 }, set: { 'crit.mult': 4 } } },
    ] },
    { id: 'master', name: 'Klingenmeister', icon: '⚔', tiers: [
      { name: 'Flinke Klingen', cost: 200, desc: 'Tempo ×1,25', fx: { mul: { rate: 1.25 } } },
      { name: 'Doppelsichel', cost: 480, desc: '+1 Nachbartreffer', fx: { add: { cleave: 1 } } },
      { name: 'Klingenwirbel', cost: 1100, desc: '+2 Nachbartreffer, +0,3 Reichweite', fx: { add: { cleave: 2, range: 0.3 } } },
      { name: 'Tausend Schnitte', cost: 2600, desc: 'Tempo ×1,6', fx: { mul: { rate: 1.6 } } },
      { name: 'Sturm der Klingen', cost: 6400, desc: 'Tempo ×2, +3 Nachbartreffer', fx: { mul: { rate: 2 }, add: { cleave: 3 } } },
    ] },
    { id: 'reaper', name: 'Purpurschnitter', icon: '🩸', tiers: [
      { name: 'Blutsichel', cost: 220, desc: 'Blutung (2/s)', fx: { add: { 'burn.dps': 2, 'burn.dur': 2 } } },
      { name: 'Purpurklinge', cost: 520, desc: 'Schattenschaden, ignoriert 50 % Panzer', fx: { set: { dmgType: 'shadow' }, add: { pierceArmor: 0.5 } } },
      { name: 'Ernte', cost: 1200, desc: '+1 Münze je Kill', fx: { add: { bounty: 1 } } },
      { name: 'Seelenernte', cost: 2800, desc: 'Tempo ×1,3, +1 Münze je Kill', fx: { mul: { rate: 1.3 }, add: { bounty: 1 } } },
      { name: 'Purpurner Schnitter', cost: 7000, desc: 'Jeder 6. Hieb: Rundumschlag (×6)', fx: { set: { 'every.n': 6, 'every.mul': 6, 'every.aoe': 2.3, 'every.proj': 'reap', 'every.dmgType': 'shadow' } } },
    ] },
  ],
  ability: { id: 'flurry', name: 'Klingensturm', lvl: 8, stage: 1, cd: 40, desc: '6 s lang dreifaches Angriffstempo.' },
  passives: {
    20: { name: 'Jagdreflex', desc: '+10 % Tempo', fx: { mul: { rate: 1.1 } } },
    40: { name: 'Schnittmuster', desc: '+1 Nachbartreffer', fx: { add: { cleave: 1 } } },
    50: { name: 'Klingenheilige', desc: 'Meister: +5 % Krit', fx: { add: { 'crit.ch': 0.05 } } },
  },
  mastery: { title: 'Klingentänzer', skins: [{ name: 'Orchideenmantis', pal: 'moon' }, { name: 'Sternenmantis', pal: 'star' }] },
};

// ───────────────────────── FELSGOLEM (Fläche / Kontrolle) ─────────────────────────
CREATURES.golem = {
  id: 'golem', name: 'Felsgolem', role: 'Fläche / Betäubung', elements: ['earth'],
  color: '#c8a070', cost: 650, place: ['ground', 'high'], model: 'golem',
  lore: 'Ein Wächter aus dem Fels unter dem Schrein. Er schläft hundert Jahre und erwacht, wenn der Herzkristall flackert.',
  base: { atk: 'pulse', dmg: 14, rate: 0.42, range: 1.8, dmgType: 'earth', flying: false, camo: true, 'stun.ch': 0.15, 'stun.dur': 0.7 },
  forms: [
    { id: 'rock', stage: 0, lvl: 1, cost: 0, name: 'Felsgolem', desc: 'Stampft – betäubt Gegner in der Nähe.' },
    { id: 'crystal', stage: 1, lvl: 10, cost: 700, name: 'Kristallgolem', desc: 'Leuchtende Kristalle, häufiger Betäubung.', fx: { mul: { dmg: 1.3 }, add: { 'stun.ch': 0.05 } } },
    { id: 'titan', stage: 2, lvl: 25, cost: 2600, name: 'Bergtitan', desc: 'Ein wandelnder Berg.', fx: { mul: { dmg: 1.5 }, add: { range: 0.3 } } },
  ],
  paths: [
    { id: 'stone', name: 'Stein', icon: '🪨', tiers: [
      { name: 'Granitfäuste', cost: 220, desc: '+6 Schaden', fx: { add: { dmg: 6 } } },
      { name: 'Beben', cost: 520, desc: '+0,4 Reichweite', fx: { add: { range: 0.4 } } },
      { name: 'Felsbrecher', cost: 1200, desc: 'Getroffene verlieren 3 s ihren Panzer', fx: { set: { brk: 3 } } },
      { name: 'Erdriss', cost: 2800, desc: '25 % Betäubung (1 s)', fx: { add: { 'stun.ch': 0.1, 'stun.dur': 0.3 } } },
      { name: 'Weltenbeben', cost: 7000, desc: 'Schaden ×3, +0,6 Reichweite', fx: { mul: { dmg: 3 }, add: { range: 0.6 } } },
    ] },
    { id: 'obsidian', name: 'Obsidian', icon: '🌋', tiers: [
      { name: 'Obsidiansplitter', cost: 200, desc: 'Ignoriert 50 % Panzer', fx: { add: { pierceArmor: 0.5 } } },
      { name: 'Glasklingen', cost: 480, desc: '15 % Krit (×2,5)', fx: { add: { 'crit.ch': 0.15 }, set: { 'crit.mult': 2.5 } } },
      { name: 'Lavakern', cost: 1150, desc: 'Feuer: setzt in Brand', fx: { set: { dmgType: 'fire' }, add: { 'burn.dps': 6, 'burn.dur': 3 } } },
      { name: 'Magmaherz', cost: 2700, desc: 'Brand ×2, Tempo ×1,3', fx: { mul: { 'burn.dps': 2, rate: 1.3 } } },
      { name: 'Obsidiantitan', cost: 6800, desc: 'Schaden ×2,5, +20 Brand', fx: { mul: { dmg: 2.5 }, add: { 'burn.dps': 20 } } },
    ] },
    { id: 'mountain', name: 'Bergtitan', icon: '⛰', tiers: [
      { name: 'Felsenwurf', cost: 300, desc: 'Wirft Felsen (Fläche, Reichweite 5)', fx: { add: { 'mortar.dmg': 18, 'mortar.rate': 0.35, 'mortar.aoe': 1.1, 'mortar.range': 5 } } },
      { name: 'Felsbrocken', cost: 650, desc: 'Felsen +18 Schaden', fx: { add: { 'mortar.dmg': 18 } } },
      { name: 'Steinhagel', cost: 1400, desc: 'Felsen-Tempo ×1,8', fx: { mul: { 'mortar.rate': 1.8 } } },
      { name: 'Bergsturz', cost: 3000, desc: 'Größere Einschläge, betäuben', fx: { add: { 'mortar.aoe': 0.5, 'mortar.stun': 0.6 } } },
      { name: 'Gipfelsturm', cost: 7200, desc: 'Felsen ×3', fx: { mul: { 'mortar.dmg': 3 } } },
    ] },
  ],
  ability: { id: 'quake', name: 'Erdbeben', lvl: 8, stage: 1, cd: 45, desc: 'Alle Bodengegner in der Nähe: schwerer Schaden und 2 s Betäubung.' },
  passives: {
    20: { name: 'Steinhaut', desc: '+0,2 Reichweite', fx: { add: { range: 0.2 } } },
    40: { name: 'Grollen', desc: '+5 % Betäubung', fx: { add: { 'stun.ch': 0.05 } } },
    50: { name: 'Urfels', desc: 'Meister: +15 % Schaden', fx: { mul: { dmg: 1.15 } } },
  },
  mastery: { title: 'Bergrufer', skins: [{ name: 'Marmorgolem', pal: 'moon' }, { name: 'Sternengolem', pal: 'star' }] },
};

// ───────────────────────── GLÜCKSKATZE (Wirtschaft) ─────────────────────────
CREATURES.neko = {
  id: 'neko', name: 'Glückskatze', role: 'Wirtschaft / Glück', elements: ['light'],
  color: '#ffd257', cost: 450, place: ['ground', 'high'], model: 'neko',
  lore: 'Die winkende Katze am Tempeltor. Wer sie ehrt, dem fällt das Gold von selbst in die Hände – sagen die Händler von Ahnenhain.',
  base: { dmg: 3, rate: 0.8, range: 2.4, proj: 'coin', speed: 12, dmgType: 'light', income: 25, icap: 100 },
  forms: [
    { id: 'kitten', stage: 0, lvl: 1, cost: 0, name: 'Glückskätzchen', desc: 'Winkt Münzen herbei: +25 je Welle.' },
    { id: 'golden', stage: 1, lvl: 10, cost: 500, name: 'Goldene Glückskatze', desc: 'Goldenes Fell. +40 je Welle, 1 % Zinsen.', fx: { add: { income: 40, interest: 0.01, icap: 100 } } },
    { id: 'shrine', stage: 2, lvl: 25, cost: 2000, name: 'Tempelkatze', desc: 'Hüterin des Schreins. +120 je Welle, Glück +2.', fx: { add: { income: 120, lucky: 2, dmg: 4 } } },
  ],
  paths: [
    { id: 'vault', name: 'Schatzkammer', icon: '🏦', tiers: [
      { name: 'Spardose', cost: 250, desc: '2 % Zinsen auf deine Münzen je Welle', fx: { add: { interest: 0.02, icap: 100 } } },
      { name: 'Tresor', cost: 600, desc: '+2 % Zinsen, höhere Obergrenze', fx: { add: { interest: 0.02, icap: 250 } } },
      { name: 'Zinseszins', cost: 1500, desc: '+3 % Zinsen', fx: { add: { interest: 0.03, icap: 600 } } },
      { name: 'Goldspeicher', cost: 3200, desc: '+4 % Zinsen, viel höhere Obergrenze', fx: { add: { interest: 0.04, icap: 1600 } } },
      { name: 'Kaiserliche Schatzkammer', cost: 7500, desc: '+6 % Zinsen (bis 5.000 je Welle)', fx: { add: { interest: 0.06, icap: 3000 } } },
    ] },
    { id: 'market', name: 'Marktstand', icon: '🏮', tiers: [
      { name: 'Bauchladen', cost: 250, desc: '+50 Münzen je Welle', fx: { add: { income: 50 } } },
      { name: 'Teehaus', cost: 650, desc: '+110 Münzen je Welle', fx: { add: { income: 110 } } },
      { name: 'Marktplatz', cost: 1500, desc: '+240 Münzen je Welle', fx: { add: { income: 240 } } },
      { name: 'Handelskontor', cost: 3300, desc: '+520 Münzen je Welle', fx: { add: { income: 520 } } },
      { name: 'Goldene Straße', cost: 7800, desc: '+1.250 Münzen je Welle', fx: { add: { income: 1250 } } },
    ] },
    { id: 'luck', name: 'Glücksbringer', icon: '🍀', tiers: [
      { name: 'Glückspfote', cost: 200, desc: 'Besiegte Gegner in Reichweite: +1 Münze', fx: { add: { lucky: 1, range: 0.3 } } },
      { name: 'Winkekatze', cost: 550, desc: 'Aura: +6 % Tempo für Nachbarn', fx: { add: { 'support.range': 2.4, 'support.rate': 0.06 } } },
      { name: 'Goldregen-Pfote', cost: 1300, desc: 'Glück +2, Aura +6 % Schaden', fx: { add: { lucky: 2, 'support.dmg': 0.06 } } },
      { name: 'Glücksstern', cost: 2900, desc: 'Glück +3, Aura +6 % Tempo/Schaden', fx: { add: { lucky: 3, 'support.rate': 0.06, 'support.dmg': 0.06, range: 0.4 } } },
      { name: 'Fortuna', cost: 7000, desc: 'Glück +5, Aura +15 % Schaden, +10 % Tempo', fx: { add: { lucky: 5, 'support.dmg': 0.15, 'support.rate': 0.1 } } },
    ] },
  ],
  ability: { id: 'goldrain', name: 'Goldregen', lvl: 8, stage: 1, cd: 60, desc: 'Ein Münzregen: sofort 60 + 15 × Welle Münzen.' },
  passives: {
    20: { name: 'Glänzendes Fell', desc: '+15 Münzen je Welle', fx: { add: { income: 15 } } },
    40: { name: 'Sparsamkeit', desc: '+1 % Zinsen', fx: { add: { interest: 0.01, icap: 100 } } },
    50: { name: 'Glücksgöttin', desc: 'Meister: Glück +1, +30 je Welle', fx: { add: { lucky: 1, income: 30 } } },
  },
  mastery: { title: 'Glückskind', skins: [{ name: 'Mondkatze', pal: 'moon' }, { name: 'Sternenkatze', pal: 'star' }] },
};

// ───────────────────────── PHÖNIX (Feuer / Wiedergeburt) ─────────────────────────
CREATURES.phoenix = {
  id: 'phoenix', name: 'Phönix', role: 'Feuer / Wiedergeburt', elements: ['fire', 'light'],
  color: '#ff8a2a', cost: 700, place: ['ground', 'high', 'water'], model: 'phoenix',
  lore: 'Er verbrennt alle tausend Jahre zu Asche – und steigt heller wieder auf. Wo er kreist, verliert selbst die Nacht ihren Mut.',
  base: { proj: 'phoenix', dmg: 5, rate: 1.25, range: 3.2, speed: 13, pierce: 2, dmgType: 'fire', 'burn.dps': 2, 'burn.dur': 2 },
  forms: [
    { id: 'chick', stage: 0, lvl: 1, cost: 0, name: 'Glutküken', desc: 'Wirft Glutfedern, die durch zwei Gegner fliegen und anzünden.' },
    { id: 'firebird', stage: 1, lvl: 10, cost: 750, name: 'Feuervogel', desc: 'Schwingen aus Flammen. Mehr Schaden und Brand.', fx: { mul: { dmg: 1.35 }, add: { 'burn.dps': 2, pierce: 1, range: 0.2 } } },
    { id: 'sunbird', stage: 2, lvl: 25, cost: 2700, name: 'Sonnenphönix', desc: 'Leuchtet wie die Morgensonne. Lichtschaden durchdringt Widerstände.', fx: { mul: { dmg: 1.5 }, add: { 'burn.dps': 4, range: 0.3 }, set: { pierceArmor: 0.4 } } },
  ],
  paths: [
    { id: 'feathers', name: 'Glutfedern', icon: '🪶', tiers: [
      { name: 'Scharfe Kiele', cost: 230, desc: '+2 Schaden', fx: { add: { dmg: 2 } } },
      { name: 'Federfächer', cost: 520, desc: '3 Federn pro Wurf', fx: { add: { shots: 2, spread: 0.2 } } },
      { name: 'Brennende Kiele', cost: 1200, desc: '+2 Durchschlag, Tempo ×1,2', fx: { add: { pierce: 2 }, mul: { rate: 1.2 } } },
      { name: 'Federsturm', cost: 2800, desc: '5 Federn, +4 Schaden', fx: { add: { shots: 2, dmg: 4, spread: 0.1 } } },
      { name: 'Flügel der Sonne', cost: 7200, desc: 'Schaden ×2,5, Tempo ×1,4', fx: { mul: { dmg: 2.5, rate: 1.4 } } },
    ] },
    { id: 'flame', name: 'Sonnenflamme', icon: '☀', tiers: [
      { name: 'Glutherz', cost: 200, desc: 'Brand ×2', fx: { mul: { 'burn.dps': 2 } } },
      { name: 'Hitzeflimmern', cost: 500, desc: 'Jede 5. Feder: Feuerball (Fläche)', fx: { set: { 'every.n': 5, 'every.mul': 3, 'every.aoe': 1.2, 'every.proj': 'fireball', 'every.dmgType': 'fire' } } },
      { name: 'Sonnenwind', cost: 1150, desc: '+0,5 Reichweite, Brand länger', fx: { add: { range: 0.5, 'burn.dur': 2 } } },
      { name: 'Flammenkrone', cost: 2700, desc: 'Brand ×2,5, Feuerball jede 3.', fx: { mul: { 'burn.dps': 2.5 }, set: { 'every.n': 3 } } },
      { name: 'Zweite Sonne', cost: 7000, desc: 'Feuerbälle ×4, riesige Einschläge', fx: { mul: { 'every.mul': 4 }, add: { 'every.aoe': 1 } } },
    ] },
    { id: 'ash', name: 'Asche & Wiedergeburt', icon: '🔥', tiers: [
      { name: 'Warme Asche', cost: 250, desc: '+2 Leben je Welle', fx: { add: { lifeRegen: 2 } } },
      { name: 'Flammenkreis', cost: 600, desc: 'Aura: +10 % Schaden für Nachbarn', fx: { add: { 'support.range': 2.4, 'support.dmg': 0.1 } } },
      { name: 'Glutwacht', cost: 1400, desc: '+4 Leben je Welle, Aura +8 % Tempo', fx: { add: { lifeRegen: 4, 'support.rate': 0.08 } } },
      { name: 'Ewige Flamme', cost: 3000, desc: 'Aura +15 % Schaden, Nachbarn sehen Getarnte', fx: { add: { 'support.dmg': 0.15 }, set: { 'support.camo': true, camo: true } } },
      { name: 'Wiedergeburt', cost: 7500, desc: 'Einmal pro Run: bei 0 Leben mit 100 Leben wiederauferstehen', fx: { add: { rebirth: 100, lifeRegen: 4 } } },
    ] },
  ],
  ability: { id: 'sunrise', name: 'Sonnenaufgang', lvl: 8, stage: 1, cd: 55, desc: 'Ein Flammenrad: schwerer Feuerschaden und Brand in großem Umkreis, +5 Leben.' },
  passives: {
    20: { name: 'Glutkern', desc: '+15 % Brand', fx: { mul: { 'burn.dps': 1.15 } } },
    40: { name: 'Lichtschwingen', desc: '+0,2 Reichweite', fx: { add: { range: 0.2 } } },
    50: { name: 'Unsterblich', desc: 'Meister: +10 % Schaden', fx: { mul: { dmg: 1.1 } } },
  },
  mastery: { title: 'Feuerhüter', skins: [{ name: 'Mondphönix', pal: 'moon' }, { name: 'Sternenphönix', pal: 'star' }] },
};

export const CREATURE_IDS = Object.keys(CREATURES);
export const PATH_COLORS = ['#ff7a3d', '#5fd6ff', '#c39bff'];
