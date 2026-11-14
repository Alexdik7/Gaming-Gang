// @ts-check
/* Validierung – wird im Formular (sofort am Feld) UND in der Datenschicht vor dem Speichern
   ausgeführt (entspricht serverseitiger Validierung). */
import { today, daysUntil } from './ui.js';

/** @typedef {(v:any, all?:any) => string|null} Rule */

/** @type {Record<string, Rule>} */
export const R = {
  required: (v) => (v == null || String(v).trim() === '' ? 'Pflichtfeld – bitte ausfüllen.' : null),
  name: (v) => (!v || /^[\p{L}][\p{L} .'\-]{0,59}$/u.test(String(v).trim()) ? null : 'Bitte nur Buchstaben, Leerzeichen, Punkt oder Bindestrich.'),
  email: (v) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()) ? null : 'Bitte eine gültige E-Mail-Adresse eingeben, z. B. name@beispiel.de.'),
  phone: (v) => (!v || (/^\+?[0-9 ()/-]{6,20}$/.test(String(v).trim()) && String(v).replace(/\D/g, '').length >= 6) ? null : 'Bitte eine gültige Telefonnummer eingeben, z. B. 0151 1234567.'),
  zip: (v) => (!v || /^\d{5}$/.test(String(v).trim()) ? null : 'Die Postleitzahl hat 5 Ziffern.'),
  houseNo: (v) => (!v || /^\d{1,4}\s?[a-zA-Z]?(\s?[-/]\s?\d{0,4}[a-zA-Z]?)?$/.test(String(v).trim()) ? null : 'Bitte eine gültige Hausnummer eingeben, z. B. 12 oder 12a.'),
  date: (v) => (!v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v))) ? null : 'Bitte ein gültiges Datum wählen.'),
  birthDate: (v) => {
    if (!v) return null;
    const age = ageOf(v);
    if (isNaN(age)) return 'Bitte ein gültiges Datum wählen.';
    if (age < 14) return 'Mitglieder müssen mindestens 14 Jahre alt sein.';
    if (age > 110) return 'Bitte das Geburtsdatum prüfen.';
    return null;
  },
  iban: (v) => (!v || ibanValid(v) ? null : 'Diese IBAN ist ungültig. Bitte Ziffern prüfen (Prüfsumme stimmt nicht).'),
  money: (v) => (v === '' || v == null || (/^\d+([.,]\d{1,2})?$/.test(String(v).trim())) ? null : 'Bitte einen Betrag wie 29,90 eingeben.'),
};

/** @param {string} iso */
export function ageOf(iso) {
  const b = new Date(iso + 'T00:00:00'), n = new Date();
  if (isNaN(b.getTime())) return NaN;
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}

/** Prüft IBAN mit ISO-7064-Prüfsumme (mod 97). @param {string} s */
export function ibanValid(s) {
  const t = cleanIban(s);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(t)) return false;
  if (t.startsWith('DE') && t.length !== 22) return false;
  let m = 0;
  for (const ch of t.slice(4) + t.slice(0, 4)) {
    const v = ch >= 'A' ? ch.charCodeAt(0) - 55 : +ch;
    m = (m * (v > 9 ? 100 : 10) + v) % 97;
  }
  return m === 1;
}
/** @param {string} s */
export const cleanIban = (s) => String(s || '').replace(/\s+/g, '').toUpperCase();
/** @param {string} s */
export const fmtIban = (s) => cleanIban(s).replace(/(.{4})/g, '$1 ').trim();
/** Maskiert: nur Land/Prüfziffer und letzte 4 Stellen sichtbar. @param {string} s */
export const maskIban = (s) => { const t = cleanIban(s); return t ? `${t.slice(0, 4)} •••• •••• •••• ${t.slice(-4, -2)}${t.slice(-2)}` : '–'; };

/**
 * @param {Record<string, any>} values
 * @param {Record<string, (string|Rule)[]>} schema
 * @returns {Record<string,string>}
 */
export function validate(values, schema) {
  /** @type {Record<string,string>} */ const errors = {};
  for (const [k, rules] of Object.entries(schema)) {
    for (const r of rules) {
      const fn = typeof r === 'string' ? R[r] : r;
      const msg = fn(values[k], values);
      if (msg) { errors[k] = msg; break; }
    }
  }
  return errors;
}

/* ---------- Schemata der Anmeldung ---------- */
export const personalSchema = {
  salutation: ['required'],
  firstName: ['required', 'name'], lastName: ['required', 'name'],
  birthDate: ['required', 'date', 'birthDate'],
  street: ['required'], houseNo: ['required', 'houseNo'], zip: ['required', 'zip'], city: ['required', 'name'],
  phone: ['required', 'phone'], email: ['required', 'email'],
  emergencyName: ['name'], emergencyPhone: ['phone'],
};

/** @param {{allowPast?:boolean}} [o] */
export const membershipSchema = (o = {}) => ({
  planId: [(/** @type {any} */ v) => (v ? null : 'Bitte eine Mitgliedschaft auswählen.')],
  start: ['required', 'date', (/** @type {any} */ v) => (!o.allowPast && v && daysUntil(v) < -30 ? 'Der Vertragsbeginn darf höchstens 30 Tage zurückliegen.' : null),
    (/** @type {any} */ v) => (v && daysUntil(v) > 365 ? 'Der Vertragsbeginn liegt zu weit in der Zukunft.' : null)],
});

export const paymentSchema = {
  method: ['required'],
  holder: [(/** @type {any} */ v, /** @type {any} */ a) => (a.method === 'sepa' && !String(v || '').trim() ? 'Bitte den Kontoinhaber angeben.' : null), 'name'],
  iban: [(/** @type {any} */ v, /** @type {any} */ a) => (a.method === 'sepa' && !String(v || '').trim() ? 'Für SEPA-Lastschrift wird eine IBAN benötigt.' : null), 'iban'],
};

export { today };
