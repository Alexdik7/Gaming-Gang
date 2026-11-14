// @ts-check
/* Testdaten – eindeutig als Test erkennbar (example.com, Musterstadt, Test-IBANs). */
import * as db from '../core/db.js';
import { today } from '../core/ui.js';
import { defaultSettings, saveSettings, completeSignup, loadAll, sendOffer, newOffer, saveOffer, maintenance } from '../services/data.js';

const PLANS = [
  { id: 'plan-basic12', name: 'Basic', category: 'Basic', termMonths: 12, minTermMonths: 12, price: 29.9, interval: 'monatlich', setupFee: 29.9, noticeWeeks: 4, description: 'Gerätetraining & Cardio, Standardzeiten.', sort: 1 },
  { id: 'plan-premium12', name: 'Premium', category: 'Premium', termMonths: 12, minTermMonths: 12, price: 49.9, interval: 'monatlich', setupFee: 29.9, noticeWeeks: 4, description: 'Alle Bereiche inkl. Kurse, Premium-Zone und längerer Öffnungszeiten.', sort: 2 },
  { id: 'plan-premium24', name: 'Premium', category: 'Premium', termMonths: 24, minTermMonths: 24, price: 44.9, interval: 'monatlich', setupFee: 0, noticeWeeks: 4, description: 'Premium mit Treuepreis bei 24 Monaten Laufzeit.', sort: 3 },
  { id: 'plan-year', name: 'Jahresmitgliedschaft', category: 'Basic', termMonths: 12, minTermMonths: 12, price: 299, interval: 'jährlich', setupFee: 0, noticeWeeks: 4, description: 'Basic, einmal pro Jahr bezahlt.', sort: 4 },
  { id: 'plan-flex', name: 'Flex', category: 'Flex', termMonths: 1, minTermMonths: 1, price: 59.9, interval: 'monatlich', setupFee: 39.9, noticeWeeks: 2, autoRenew: true, description: 'Ohne lange Bindung – verlängert sich monatlich.', sort: 5 },
].map((p) => ({ ...p, active: true }));

const ADDONS = [
  { id: 'ad-drinks', name: 'Getränke-Flat', price: 9.9, billing: 'monatlich', description: 'Wasser & isotonische Getränke unbegrenzt.' },
  { id: 'ad-sauna', name: 'Sauna', price: 7.9, billing: 'monatlich', description: 'Zugang zum Saunabereich.' },
  { id: 'ad-solar', name: 'Solarium', price: 5, billing: 'monatlich', description: '4 Sitzungen pro Monat.' },
  { id: 'ad-pt', name: 'Personal Training', price: 79, billing: 'monatlich', description: '2 Einheiten à 45 Minuten pro Monat.' },
  { id: 'ad-kurse', name: 'Kurse', price: 9.9, billing: 'monatlich', description: 'Alle Gruppenkurse laut Kursplan.' },
  { id: 'ad-plan', name: 'Trainingsplan-Erstellung', price: 49, billing: 'einmalig', description: 'Individueller Plan mit Einweisung.' },
  { id: 'ad-chip', name: 'Chip-Armband', price: 15, billing: 'einmalig', description: 'Zutrittsmedium (Platzhalter).' },
].map((a, i) => ({ ...a, active: true, sort: i }));

/** Gültige Test-IBAN aus Bankleitzahl + Konto @param {string} blz @param {string} acct */
function makeIban(blz, acct) {
  const bban = blz + acct.padStart(10, '0');
  const num = (bban + 'DE00').replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let m = 0;
  for (const ch of num) m = (m * 10 + +ch) % 97;
  return 'DE' + String(98 - m).padStart(2, '0') + bban;
}

/** Erzeugt eine erkennbar künstliche Unterschrift als SVG. @param {string} name */
export function fakeSignature(name) {
  let x = 30, d = 'M30 90';
  for (const [i, ch] of [...name].entries()) {
    const c = ch.charCodeAt(0);
    const y = 60 + (c % 40), w = 14 + (c % 11);
    d += ` Q${x + w / 2} ${i % 2 ? y - 40 : y + 30} ${x + w} ${y}`;
    x += w;
  }
  d += ` Q${x + 30} 120 ${x + 60} 80`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${x + 90}" height="160" viewBox="0 0 ${x + 90} 160"><path d="${d}" fill="none" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/** @param {number} months @param {number} [days] */
const ago = (months, days = 0) => { const d = new Date(); d.setMonth(d.getMonth() - months); d.setDate(d.getDate() + days); return today(d); };

const PEOPLE = [
  ['Herr', 'Max', 'Mustermann', '1990-01-01', 'plan-premium12', ['ad-drinks', 'ad-sauna'], ago(11, 25), 'aktiv', true, 'sepa'],
  ['Frau', 'Erika', 'Musterfrau', '1985-06-15', 'plan-basic12', [], ago(3), 'aktiv', true, 'sepa'],
  ['Frau', 'Lena', 'Test', '1998-03-09', 'plan-flex', ['ad-kurse'], ago(5), 'aktiv', false, 'sepa'],
  ['Herr', 'Jonas', 'Beispiel', '1979-11-30', 'plan-premium24', ['ad-pt', 'ad-plan'], ago(2), 'aktiv', true, 'sepa'],
  ['Frau', 'Sophie', 'Probe', '2001-08-21', 'plan-year', ['ad-solar'], ago(11, 12), 'aktiv', true, 'ueberweisung'],
  ['Herr', 'Tim', 'Testmann', '1993-02-14', 'plan-basic12', [], ago(14), 'aktiv', true, 'sepa'],
  ['Divers', 'Mika', 'Demo', '1996-12-05', 'plan-premium12', ['ad-sauna'], ago(6), 'gekuendigt', false, 'sepa'],
  ['Herr', 'Paul', 'Platzhalter', '1988-04-27', 'plan-basic12', ['ad-drinks'], ago(1), 'pausiert', false, 'sepa'],
  ['Frau', 'Hanna', 'Muster', '2003-09-02', 'plan-premium12', ['ad-kurse', 'ad-drinks', 'ad-chip'], ago(0, -5), 'aktiv', true, 'sepa'],
  ['Herr', 'Felix', 'Fiktiv', '1999-07-18', 'plan-flex', [], ago(0, -10), 'aktiv', true, 'bar'],
];

/** @param {string} gymName */
export async function seedBase(gymName) {
  const s = { ...defaultSettings(), name: gymName || 'Mein Gym' };
  s.mail.fromName = s.name;
  await saveSettings(s);
  await db.putMany([...PLANS.map((p) => /** @type {[string, any]} */ (['plans', p])), ...ADDONS.map((a) => /** @type {[string, any]} */ (['addons', a]))]);
}

export async function seedDemo() {
  const d = await loadAll();
  let i = 0;
  for (const [sal, first, last, birth, planId, addonIds, start, status, marketing, method] of PEOPLE) {
    i++;
    const consents = { agb: true, hausordnung: true, datenschutz: true, sepa: method === 'sepa', kontakt: true, werbung: marketing };
    const f = {
      personal: { salutation: sal, firstName: first, lastName: last, birthDate: birth, street: 'Teststraße', houseNo: String(i * 3), zip: '12345', city: 'Musterstadt',
        phone: `0151 0000 ${String(1000 + i)}`, email: `${String(first).toLowerCase()}.${String(last).toLowerCase()}@example.com`,
        emergencyName: i % 3 ? '' : 'Notfall Testkontakt', emergencyPhone: i % 3 ? '' : '0170 0000 0000' },
      planId, start, addonIds, consents, signature: fakeSignature(`${first} ${last}`),
      payment: { method, holder: `${first} ${last}`, iban: method === 'sepa' ? makeIban('50010517', String(5400000 + i * 17)) : '', note: '' },
    };
    const at = new Date(String(start) + 'T10:15:00'); at.setDate(at.getDate() - 2);
    await completeSignup(f, d, { at: at.toISOString(), status: String(status), allowPast: true });
  }
  const summer = { ...newOffer(), name: 'Sommer-Special 2026', subject: '☀️ {{vorname}}, dein Sommer-Special ist da', headline: 'Sommer-Special für dich, {{vorname}}!',
    description: '2 Monate Sauna gratis', discount: '2 Monate Sauna gratis', price: '', validFrom: '2026-07-01', validUntil: '2026-08-31', coupon: 'SOMMER26',
    body: 'Hallo {{vorname}},\n\ndanke, dass du mit {{mitgliedschaft}} bei {{gym}} trainierst!\n\nDiesen Sommer schenken wir dir zwei Monate Sauna – einfach an der Theke den Code {{gutschein}} nennen.', createdAt: '2026-06-28T09:00:00.000Z' };
  summer.audience.filter.statuses = ['aktiv', 'auslaufend'];
  await sendOffer(summer, { at: '2026-07-01T08:00:00.000Z' });
  const renew = { ...newOffer(), name: 'Verlängerungsbonus', subject: '{{vorname}}, verlängere jetzt mit Bonus', headline: 'Bleib dran, {{vorname}}!',
    description: 'Verlängerung mit 10 % Rabatt', price: '44,90', discount: '10 %', termMonths: '12', coupon: 'TREUE10' };
  renew.audience.filter = { planIds: [], terms: [], statuses: ['auslaufend'], maxDaysLeft: '60' };
  await saveOffer(renew);
  const black = { ...newOffer(), name: 'Black Week', subject: 'Black Week bei {{gym}}', headline: 'Black Week: Premium zum Sonderpreis',
    price: '39,90', discount: '20 %', validUntil: ago(-1, 2), coupon: 'BLACK26', status: 'geplant', scheduledAt: ago(0, 13) + 'T09:00',
    body: 'Hallo {{vorname}},\n\nnur in der Black Week: Premium für {{preis}} im Monat.\n\nDein Team von {{gym}}' };
  await saveOffer(black);
  await maintenance();
}
