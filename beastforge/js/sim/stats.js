// Werte-Berechnung: Basis → Formen → Pfadstufen → Level-Boni → (Welt: Synergien, Auren, Buffs)
import { BASE_STATS, CREATURES } from '../data/creatures.js';
import { HEROES } from '../data/heroes.js';
import { BAL } from '../config.js';
import { formsFor, levelFx } from '../meta/progression.js';

export const clone = o => JSON.parse(JSON.stringify(o));
function getP(o, path) { const ks = path.split('.'); let c = o; for (const k of ks) c = c?.[k]; return c; }
function setP(o, path, v) { const ks = path.split('.'); let c = o; for (let i = 0; i < ks.length - 1; i++) c = c[ks[i]] ??= {}; c[ks[ks.length - 1]] = v; }

export function applyFx(s, fx) {
  if (!fx) return s;
  if (fx.set) for (const k in fx.set) setP(s, k, fx.set[k]);
  if (fx.add) for (const k in fx.add) setP(s, k, (getP(s, k) || 0) + fx.add[k]);
  if (fx.mul) for (const k in fx.mul) setP(s, k, (getP(s, k) || 0) * fx.mul[k]);
  return s;
}

// Werte einer Kreatur/eines Helden OHNE Welt-Einflüsse
export function baseStats(t, level = 1, branch = 'spirit') {
  const s = clone(BASE_STATS);
  if (t.hero) {
    const h = HEROES[t.cid];
    applyFx(s, { set: h.base });
    for (const m of h.milestones) if (t.hlvl >= m.lvl && m.fx) applyFx(s, m.fx);
    s.dmg *= 1 + BAL.hero.perLevel * (t.hlvl - 1);
    return s;
  }
  const def = CREATURES[t.cid];
  applyFx(s, { set: def.base });
  if (def.baseFx) for (const fx of def.baseFx) applyFx(s, fx);   // Fusion: Formen des Körpers + Fusions-Gabe
  for (const f of formsFor(t.cid, branch)) if (f.stage > 0 && f.stage <= t.stage) applyFx(s, f.fx);
  def.paths.forEach((p, i) => { for (let k = 0; k < t.tiers[i]; k++) applyFx(s, p.tiers[k].fx); });
  for (const fx of levelFx(t.cid, level)) applyFx(s, fx);
  if (t.ascended) { const g = t.ascended; s.dmg *= 2 * (1 + g * 0.02); s.rate *= 1 + g * 0.005; s.range += 0.5; s.camo = true; s.bossMul *= 1.5; s.pierce += 2; }   // Ahnenform
  return s;
}

// Kreuzpfad-Regel: höchstens 2 Pfade, nur einer über Stufe 2
export function canTier(tiers, p) {
  const next = tiers.slice(); next[p]++;
  if (next[p] > BAL.cross.main) return { ok: false, why: 'Maximum erreicht' };
  if (next.filter(x => x > 0).length > 2) return { ok: false, why: 'Nur zwei Pfade möglich' };
  if (next.filter(x => x > BAL.cross.second).length > 1) return { ok: false, why: 'Nur ein Pfad über Stufe ' + BAL.cross.second };
  return { ok: true };
}

export const dps = s => {
  let d = s.dmg * s.rate * (s.atk === 'chain' ? 1 + s.chain.n * s.chain.fall : s.shots) * (1 + s.crit.ch * (s.crit.mult - 1));
  if (s.burn.dps) d += s.burn.dps * 0.6;
  if (s.orbs.n) d += s.orbs.n * s.orbs.dmg * 2.5 * 0.4;
  if (s.mortar.dmg) d += s.mortar.dmg * s.mortar.rate * 1.6;
  if (s.every.n) d += s.dmg * s.rate * s.every.mul * (s.every.shots || 1) / s.every.n;
  return d;
};
