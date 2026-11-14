// UpgradeManager: Regeln der Upgrade-Bäume und Berechnung der Katzen-Werte.
import { BALANCE } from '../config.js';
import { RANK } from '../data/meta.js';

const PCT = { dmg: 1, rate: 1, range: 1 };                       // prozentuale Schlüssel
const SPECIAL = ['burn', 'stun', 'freeze'];                        // skaliert mit „Spezial“-Boni
const SUPPORT = ['aDmg', 'aRate', 'aRange', 'aCrit', 'aPen', 'gDmg', 'gRate', 'gRange'];
export const NO_BONUS = Object.freeze({ dmg: 0, rate: 0, range: 0, special: 0, support: 0, veteran: 0, rank: {} });

export const rankOf = (bonus, catId) => (bonus && bonus.rank && bonus.rank[catId]) || 0;
export const rankPerk = (bonus, catId, key) => {
  const r = rankOf(bonus, catId); let v = 0;
  for (const lv in RANK.perks) if (r >= +lv && RANK.perks[lv].key === key) v += RANK.perks[lv].val;
  return v;
};

// Trainingspunkte: höchstens `points` Stufen insgesamt, und nur EIN Pfad darf auf die Meisterstufe.
export const pointsOf = (bonus, catId) => BALANCE.upgradePoints + rankPerk(bonus, catId, 'point');
export function canUpgrade(def, tiers, path, bonus) {
  const t = tiers[path];
  if (t >= BALANCE.maxTier || t >= def.paths[path].tiers.length) return 'max';
  if (tiers[0] + tiers[1] + tiers[2] >= pointsOf(bonus, def.id)) return 'points';
  if (t === BALANCE.maxTier - 1 && tiers.some((v, i) => i !== path && v >= BALANCE.maxTier)) return 'master';
  return null;
}
export function upgradeCost(def, tiers, path, bonus, discount = 0) {
  let c = def.paths[path].tiers[tiers[path]][2];
  if (tiers[0] + tiers[1] + tiers[2] === 0 && bonus) c *= 1 - (bonus.veteran || 0);
  return Math.round(c * (1 - discount) / 5) * 5;
}
export const placeCost = (def, bonus) => Math.round(def.cost * (1 - rankPerk(bonus, def.id, 'cheap')) / 5) * 5;

// Endwerte einer Katze aus Grundwerten + Upgrades + dauerhaften Boni
export function computeStats(def, tiers, bonus = NO_BONUS) {
  const s = Object.assign({}, def.base), pct = { dmg: 0, rate: 0, range: 0 };
  for (let p = 0; p < 3; p++) for (let t = 0; t < tiers[p]; t++) {
    const fx = def.paths[p].tiers[t][3];
    for (const k in fx) {
      const v = fx[k];
      if (PCT[k]) pct[k] += v; else if (typeof v === 'number') s[k] = (s[k] || 0) + v; else s[k] = v;
    }
  }
  const r = rankOf(bonus, def.id);
  s.dmg = (def.base.dmg || 0) * (1 + pct.dmg) * (1 + (bonus.dmg || 0) + r * RANK.dmg);
  s.rate = (def.base.rate || 0) * (1 + pct.rate) * (1 + (bonus.rate || 0) + r * RANK.rate);
  s.range = def.base.range * (1 + pct.range) * (1 + (bonus.range || 0) + rankPerk(bonus, def.id, 'range'));
  const sp = 1 + (bonus.special || 0) + rankPerk(bonus, def.id, 'special');
  for (const k of SPECIAL) if (s[k]) s[k] *= sp;
  if (s.slow) s.slow = Math.min(0.8, s.slow * (1 + (sp - 1) * 0.5));
  if (s.freeze) s.freeze = Math.min(0.6, s.freeze);
  const su = 1 + (bonus.support || 0);
  for (const k of SUPPORT) if (s[k]) s[k] *= su;
  if (s.turretCd) s.turretCd = Math.max(3, s.turretCd);
  if (s.hole) s.hole = Math.max(5, s.hole);
  if (s.turretDmg) s.turretDmg *= 1 + (bonus.dmg || 0) + r * RANK.dmg;
  s.crit = Math.min(0.75, s.crit || 0);
  s.pen = Math.min(1, s.pen || 0);
  s.mode = s.mode || 'first';
  return s;
}

// Lesbare Beschreibung eines Upgrade-Effekts (für beide Sprachen automatisch erzeugt)
const pc = v => (v > 0 ? '+' : '') + Math.round(v * 100) + ' %';
const nm = v => (v > 0 ? '+' : '') + (Math.round(v * 10) / 10);
const FX_TEXT = {
  dmg: v => [`${pc(v)} Schaden`, `${pc(v)} damage`], rate: v => [`${pc(v)} Tempo`, `${pc(v)} speed`], range: v => [`${pc(v)} Reichweite`, `${pc(v)} range`],
  pen: v => [`${pc(v)} Rüstungsdurchschlag`, `${pc(v)} armor pierce`], crit: v => [`${pc(v)} kritische Treffer`, `${pc(v)} crit chance`],
  shots: v => [`${nm(v)} Geschoss`, `${nm(v)} projectile`], pierce: v => [`durchschlägt ${nm(v)} Hund`, `pierces ${nm(v)} dog`],
  detect: () => ['sieht Getarnte', 'detects stealth'], reveal: () => ['enttarnt Hunde für alle Katzen', 'reveals dogs to all cats'],
  vuln: v => [`Ziele erleiden ${pc(v)} Schaden`, `targets take ${pc(v)} damage`], splash: v => [`${nm(v)} Explosionsradius`, `${nm(v)} blast radius`],
  cluster: v => [`${v} Nachexplosionen`, `${v} cluster blasts`], slow: v => [`bremst ${pc(v)}`, `slows ${pc(v)}`], slowT: v => [`${nm(v)} s Bremsdauer`, `${nm(v)} s slow`],
  stun: v => [`betäubt ${nm(v)} s`, `stuns ${nm(v)} s`], freeze: v => [`${pc(v)} Chance einzufrieren`, `${pc(v)} freeze chance`],
  shred: v => [`zerstört ${nm(v)} Rüstung`, `shreds ${nm(v)} armor`], shredT: v => [`${nm(v)} s Rüstungsbruch`, `${nm(v)} s shred`],
  burn: v => [`${nm(v)} Brand/s`, `${nm(v)} burn/s`], burnT: v => [`${nm(v)} s Brenndauer`, `${nm(v)} s burn`],
  bossDmg: v => [`${pc(v)} gegen Bosse & Elite`, `${pc(v)} vs bosses & elites`], line: () => ['durchbohrt die ganze Reihe', 'pierces the whole line'],
  cone: v => [`${pc(v)} breiterer Kegel`, `${pc(v)} wider cone`], spread: () => ['Brand springt bei Tod über', 'burn spreads on death'],
  income: v => [`${nm(v)} Futter je Welle`, `${nm(v)} fish per wave`], interest: v => [`${pc(v)} Zinsen je Welle`, `${pc(v)} interest per wave`],
  bounty: v => [`${pc(v)} Futter für Hunde im Umkreis`, `${pc(v)} fish from dogs in range`], discount: v => [`Upgrades ${pc(-v)}`, `upgrades ${pc(-v)}`],
  aRate: v => [`Aura: ${pc(v)} Tempo`, `aura: ${pc(v)} speed`], aDmg: v => [`Aura: ${pc(v)} Schaden`, `aura: ${pc(v)} damage`],
  aRange: v => [`Aura: ${pc(v)} Reichweite`, `aura: ${pc(v)} range`], aCrit: v => [`Aura: ${pc(v)} Krit`, `aura: ${pc(v)} crit`],
  aPen: v => [`Aura: ${pc(v)} Durchschlag`, `aura: ${pc(v)} pierce`], aStun: v => [`Aura: ${pc(-v)} Betäubung`, `aura: ${pc(-v)} stun taken`],
  lifeEvery: v => v > 0 ? [`+1 Leben alle ${v} Wellen`, `+1 life every ${v} waves`] : ['Leben eine Welle früher', 'life one wave sooner'],
  lifeMax: v => [`bis zu ${nm(v)} Extra-Leben`, `up to ${nm(v)} bonus lives`], knock: v => [`${nm(v)} Felder Rückstoß`, `${nm(v)} tiles knockback`],
  turretDmg: v => [`Geschütz ${nm(v)} Schaden`, `turret ${nm(v)} damage`], turretRate: v => [`Geschütz ${nm(v)} Schuss/s`, `turret ${nm(v)} shots/s`],
  turretPen: v => [`Geschütz ${pc(v)} Durchschlag`, `turret ${pc(v)} pierce`], turretCd: v => [`baut ${nm(-v)} s schneller`, `builds ${nm(-v)} s faster`],
  turrets: v => [`${nm(v)} Geschütz gleichzeitig`, `${nm(v)} turret at once`], turretLife: v => [`${nm(v)} s Lebensdauer`, `${nm(v)} s lifetime`],
  chain: v => [`${nm(v)} Kettensprünge`, `${nm(v)} chain jumps`], jump: v => [`${nm(v)} Sprungweite`, `${nm(v)} jump range`],
  shieldBreak: () => ['zerreißt Schilde', 'tears shields apart'], exec: v => [`erledigt Hunde unter ${Math.round(v * 100)} % LP`, `executes dogs below ${Math.round(v * 100)}% HP`],
  instant: () => ['trifft sofort', 'hits instantly'], ramp: v => [`${pc(v)} Aufheizen`, `${pc(v)} ramp-up`], beams: v => [`${nm(v)} Strahl`, `${nm(v)} beam`],
  gDmg: v => [`ALLE Katzen ${pc(v)} Schaden`, `ALL cats ${pc(v)} damage`], gRate: v => [`ALLE Katzen ${pc(v)} Tempo`, `ALL cats ${pc(v)} speed`],
  gRange: v => [`ALLE Katzen ${pc(v)} Reichweite`, `ALL cats ${pc(v)} range`], gReveal: () => ['enttarnt ALLE Hunde', 'reveals ALL dogs'],
  hole: v => [`Schwarzes Loch ${nm(-v)} s öfter`, `black hole ${nm(-v)} s sooner`], holePull: v => [`${nm(v)} Sog`, `${nm(v)} pull`], holeDmg: v => [`Loch: ${v} Schaden/s`, `hole: ${v} damage/s`]
};
export function describeFx(fx, lang = 0) {
  return Object.keys(fx).map(k => FX_TEXT[k] ? FX_TEXT[k](fx[k])[lang] : k).join(' · ');
}
