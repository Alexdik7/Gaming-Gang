// @ts-check
/* Gemeinsame Vertragsansicht: Zusammenfassung in der Anmeldung UND Original-Formular im Archiv. */
import { h, icon, fmtDate, fmtEUR, dl } from '../core/ui.js';
import { planLabel } from '../core/pricing.js';
import { maskIban, fmtIban } from '../core/validate.js';

export const PAY = /** @type {Record<string,string>} */ ({ sepa: 'SEPA-Lastschrift', ueberweisung: 'Überweisung', bar: 'Barzahlung', sonstige: 'Sonstige' });
export const INTERVAL_TXT = /** @type {Record<string,string>} */ ({ monatlich: 'Monat', vierteljährlich: 'Quartal', halbjährlich: 'Halbjahr', jährlich: 'Jahr' });

/**
 * @param {any} s Snapshot {personal, membership, addons, start, end, price, payment, consents}
 * @param {{signature?:string|null, onEdit?:(step:number)=>void, showIban?:boolean, meta?:[string,any][]}} [o]
 */
export function contractView(s, o = {}) {
  const p = s.personal, ms = s.membership;
  /** @param {string} t @param {number} step @param {any} body */
  const sec = (t, step, body) => h('section', { class: 'sum-sec' }, h('div', { class: 'sum-head' }, h('h3', null, t),
    o.onEdit ? h('button', { class: 'btn ghost sm', type: 'button', onclick: () => o.onEdit?.(step) }, icon('pen', 16), 'Ändern') : null), body);
  const per = INTERVAL_TXT[ms.interval] || 'Monat';
  return h('div', { class: 'summary' },
    o.meta ? h('section', { class: 'sum-sec meta' }, dl(o.meta)) : null,
    sec('Persönliche Daten', 0, dl([
      ['Name', `${p.salutation && p.salutation !== 'Keine Angabe' ? p.salutation + ' ' : ''}${p.firstName} ${p.lastName}`],
      ['Geburtsdatum', fmtDate(p.birthDate)], ['Adresse', `${p.street} ${p.houseNo}, ${p.zip} ${p.city}`],
      ['Telefon', p.phone], ['E-Mail', p.email],
      ['Notfallkontakt', p.emergencyName ? `${p.emergencyName}${p.emergencyPhone ? ' · ' + p.emergencyPhone : ''}` : null]])),
    sec('Mitgliedschaft', 1, dl([
      ['Mitgliedschaft', h('b', null, planLabel(ms))], ['Vertragsbeginn', fmtDate(s.start)],
      ['Vertragsende', ms.autoRenew ? `${fmtDate(s.end)} (verlängert sich monatlich)` : fmtDate(s.end)],
      ['Mindestlaufzeit', `${ms.minTermMonths} ${ms.minTermMonths === 1 ? 'Monat' : 'Monate'}`], ['Kündigungsfrist', `${ms.noticeWeeks} Wochen`],
      ['Zahlungsintervall', ms.interval]])),
    sec('Zusatzleistungen', 2, s.addons.length ? h('ul', { class: 'tick-list' }, s.addons.map((/** @type {any} */ a) =>
      h('li', null, icon('check', 18), h('span', { class: 'grow' }, a.name), h('span', { class: 'muted' }, `${fmtEUR(a.price)}${a.billing === 'monatlich' ? ' / Monat' : ' einmalig'}`)))) : h('p', { class: 'muted' }, 'Keine Zusatzleistungen gewählt.')),
    sec('Preis', 2, h('div', { class: 'price-box' },
      h('div', null, h('span', null, 'Monatlicher Preis'), h('b', { class: 'big-num' }, fmtEUR(s.price.monthly))),
      ms.interval !== 'monatlich' ? h('div', null, h('span', null, `Zahlbetrag je ${per}`), h('b', null, fmtEUR(s.price.intervalAmount))) : null,
      h('div', null, h('span', null, 'Einmalige Gebühren'), h('b', null, fmtEUR(s.price.once))),
      h('div', null, h('span', null, ms.autoRenew ? 'Gesamt erster Monat' : `Gesamt über ${ms.termMonths} Monate`), h('b', null, fmtEUR(s.price.total))))),
    sec('Zahlung', 3, dl(/** @type {[string, any][]} */ ([['Zahlungsart', PAY[s.payment.method]],
      s.payment.method === 'sepa' ? ['Kontoinhaber', s.payment.holder] : ['Hinweis', s.payment.note || null],
      s.payment.method === 'sepa' ? ['IBAN', o.showIban ? fmtIban(s.payment.iban) : maskIban(s.payment.iban)] : ['', null]].filter((r) => r[0])))),
    sec('Einverständnisse', 4, h('ul', { class: 'consent-sum' }, s.consents.map((/** @type {any} */ c) =>
      h('li', { class: c.given ? 'yes' : 'no' }, icon(c.given ? 'check' : 'x', 18), h('span', null, c.label, c.required ? h('small', null, ' (Pflicht)') : null))))),
    o.signature !== undefined ? sec('Unterschrift', 6, o.signature ? h('figure', { class: 'sig-preview' }, h('img', { src: o.signature, alt: 'Unterschrift' })) : h('p', { class: 'muted' }, 'Noch nicht unterschrieben.')) : null);
}
