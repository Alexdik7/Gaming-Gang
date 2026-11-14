// @ts-check
/* Preisberechnung – Preise kommen immer aus den Einstellungen, nie aus dem Code. */
export const INTERVALS = /** @type {const} */ ({ monatlich: 1, vierteljährlich: 3, halbjährlich: 6, jährlich: 12 });
/** @param {number} n */
const r2 = (n) => Math.round(n * 100) / 100;

/**
 * @param {{price:number, interval:keyof typeof INTERVALS, termMonths:number, setupFee?:number}} plan
 * @param {{price:number, billing:'monatlich'|'einmalig'}[]} addons
 */
export function calc(plan, addons) {
  const months = INTERVALS[plan.interval] || 1;
  const planMonthly = plan.price / months;
  const addMonthly = addons.filter((a) => a.billing === 'monatlich').reduce((s, a) => s + Number(a.price), 0);
  const once = (plan.setupFee || 0) + addons.filter((a) => a.billing === 'einmalig').reduce((s, a) => s + Number(a.price), 0);
  const monthly = r2(planMonthly + addMonthly);
  const term = plan.termMonths || 1;
  return {
    planMonthly: r2(planMonthly), addMonthly: r2(addMonthly), monthly, once: r2(once),
    intervalAmount: r2(plan.price + addMonthly * months), interval: plan.interval,
    total: r2(monthly * term + once),
  };
}

/** Vertragsende = Beginn + Laufzeit − 1 Tag @param {string} start @param {number} months */
export function endDate(start, months) {
  const d = new Date(start + 'T00:00:00');
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  d.setDate(d.getDate() - 1);
  const z = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

/** "Premium – 12 Monate" @param {{name:string, termMonths:number, autoRenew?:boolean}} p */
export function planLabel(p) {
  if (p.autoRenew) return `${p.name} – monatlich kündbar`;
  return `${p.name} – ${p.termMonths} ${p.termMonths === 1 ? 'Monat' : 'Monate'}`;
}

/** Komma oder Punkt als Dezimaltrenner @param {any} v */
export const parseMoney = (v) => Number(String(v ?? '').replace(',', '.')) || 0;
