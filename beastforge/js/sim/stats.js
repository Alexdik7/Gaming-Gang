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
  if (t.mega != null) {   // Mega-Form (data/megas.js): A Zorn · B Bann · C Klinge
    s.dmg *= 1.6; s.rate *= 1.15; s.range += 0.4; s.camo = true;
    if (t.mega === 0) { s.dmg *= 1.5; s.pierce += 3; s.aoe = (s.aoe || 0) + 0.4; }
    else if (t.mega === 1) { s.slow.pct = Math.max(s.slow.pct, 0.4); s.slow.dur = Math.max(s.slow.dur, 1.5); s.stun.ch += 0.1; s.stun.dur = Math.max(s.stun.dur, 0.6); s.support.range = Math.max(s.support.range, 1.6); s.support.dmg += 0.12; s.support.rate += 0.08; }
    else { s.crit.ch += 0.3; s.crit.mult += 1; s.rate *= 1.25; s.bossMul *= 1.6; }
    if (def.fusion) { s.dmg *= 1.3; s.range += 0.25; s.pierce += 1; s.bossMul *= 1.15; }   // Mega-Fusion: zusätzlicher Schub
  }
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
