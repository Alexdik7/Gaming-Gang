// Schadensberechnung – reine Funktion, damit sie leicht zu testen ist.
import { BALANCE } from '../config.js';

const ARMORED = { phys: 1, boom: 0.5 };   // nur diese Arten werden von Rüstung gebremst

// amount: Rohschaden, type: Schadensart, e: Hund { armor, res, shield, shredT, shredV, vulnT, vulnV, boss, elite }
// o: { pen, bossDmg, shieldBreak, mod } → { hp, shield } (was wirklich abgezogen wird)
export function calcDamage(amount, type, e, o = {}) {
  let d = amount * (o.mod || 1);
  if (e.vulnT > 0) d *= 1 + e.vulnV;
  if (o.bossDmg && (e.boss || e.elite)) d *= 1 + o.bossDmg;
  const res = e.res && e.res[type] || 0;
  d *= 1 - res;
  if (ARMORED[type] && e.armor > 0) {
    const armor = Math.max(0, e.armor - (e.shredT > 0 ? e.shredV : 0)) * (1 - (o.pen || 0)) * ARMORED[type];
    d = Math.max(d * BALANCE.minArmorDmg, d - armor);
  }
  let shield = 0;
  if (e.shield > 0 && type !== 'shadow') {
    const mul = (type === 'volt' ? 2 : 1) * (o.shieldBreak ? 3 : 1);
    shield = Math.min(e.shield, d * mul);
    d -= shield / mul;
  }
  return { hp: Math.max(0, d), shield };
}
