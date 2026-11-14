// @ts-check
/* Fachlogik (Service-Schicht). Seiten rufen nur diese Funktionen auf, nie IndexedDB direkt.
   Entspricht den späteren API-Endpunkten eines Servers. */
import * as db from '../core/db.js';
import { today, daysUntil } from '../core/ui.js';
import { calc, endDate, planLabel } from '../core/pricing.js';
import { validate, personalSchema, membershipSchema, paymentSchema, cleanIban } from '../core/validate.js';
import { sha256Hex } from '../core/crypto.js';
import { getEmailService, varsFor, buildEmail } from './email.js';

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const PH = (/** @type {string} */ t) => `[Platzhalter] Hier wird später ${t} des Gyms eingefügt.`;

export function defaultSettings() {
  return {
    id: 'gym', name: 'Mein Gym', logo: null, street: 'Musterstraße 1', zip: '12345', city: 'Musterstadt',
    phone: '+49 000 0000000', email: 'info@example.com', website: 'https://example.com',
    hours: 'Mo–Fr 06:00–23:00\nSa–So 08:00–20:00',
    legal: { agb: PH('die AGB'), datenschutz: PH('die Datenschutzerklärung'), hausordnung: PH('die Hausordnung'),
      sepa: PH('der Text des SEPA-Lastschriftmandats'), werbung: PH('der Einwilligungstext für Werbung per E-Mail'),
      kontakt: PH('der Einwilligungstext zur Kontaktaufnahme per E-Mail'), sonstiges: PH('sonstige Vereinbarungen') },
    consents: [
      { key: 'agb', label: 'Ich habe die AGB gelesen und akzeptiere sie.', text: 'agb', required: true },
      { key: 'hausordnung', label: 'Ich akzeptiere die Hausordnung.', text: 'hausordnung', required: true },
      { key: 'datenschutz', label: 'Ich habe die Datenschutzerklärung zur Kenntnis genommen.', text: 'datenschutz', required: true },
      { key: 'sepa', label: 'Ich erteile das SEPA-Lastschriftmandat.', text: 'sepa', required: true, onlySepa: true },
      { key: 'kontakt', label: 'Das Gym darf mich zu meiner Mitgliedschaft per E-Mail kontaktieren.', text: 'kontakt', required: false },
      { key: 'werbung', label: 'Ich möchte Angebote und Neuigkeiten per E-Mail erhalten (jederzeit widerrufbar).', text: 'werbung', required: false },
    ],
    autoLockMin: 15, expiringDays: 60, mail: { mode: 'mock', fromName: 'Mein Gym', from: 'angebote@example.com', endpoint: '' },
  };
}

export async function getSettings() {
  const s = await db.get('settings', 'gym');
  const d = defaultSettings();
  return s ? { ...d, ...s, legal: { ...d.legal, ...s.legal }, mail: { ...d.mail, ...s.mail } } : d;
}
/** @param {any} s */
export async function saveSettings(s) {
  await db.put('settings', s);
  await db.put('meta', { id: 'public', name: s.name, logo: s.logo || null });
}

/** @param {any[]} l */
const byName = (l) => l.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name));
export const getPlans = async () => byName(await db.all('plans'));
export const getAddons = async () => byName(await db.all('addons'));
/** @param {any} p */
export const savePlan = (p) => db.put('plans', { id: p.id || uid(), ...p });
/** @param {any} a */
export const saveAddon = (a) => db.put('addons', { id: a.id || uid(), ...a });

/* ---------- Status ---------- */
/** @param {any} c @param {number} expDays */
export function contractState(c, expDays = 60) {
  if (!c) return 'entwurf';
  if (c.status === 'aktiv' && !c.membership.autoRenew && daysUntil(c.end) <= expDays) return 'auslaufend';
  return c.status;
}

/** Lädt alles, was die Übersichten brauchen (bei kleinen Datenmengen schnell genug). */
export async function loadAll() {
  const [settings, plans, addons, members, contracts, consents, offers] = await Promise.all([
    getSettings(), getPlans(), getAddons(), db.all('members'), db.all('contracts'), db.all('consents'), db.all('offers')]);
  return { settings, plans, addons, members, contracts, consents, offers };
}

/** @typedef {Awaited<ReturnType<typeof loadAll>>} AllData */
/** @typedef {{m:any, c:any, contracts:any[], state:string, daysLeft:number|null, marketing:boolean}} Row */

/** Mitglied + aktueller Vertrag + abgeleiteter Status @param {AllData} d @returns {Row[]} */
export function memberRows(d) {
  return d.members.map((m) => {
    const cs = d.contracts.filter((c) => c.memberId === m.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const c = cs[0] || null;
    const marketing = !!c && d.consents.some((x) => x.contractId === c.id && x.key === 'werbung' && x.given && !x.revokedAt);
    return { m, c, contracts: cs, state: m.active ? contractState(c, d.settings.expiringDays) : 'deaktiviert',
      daysLeft: c ? daysUntil(c.end) : null, marketing };
  });
}

/* ---------- Aktivitäten ---------- */
/** @param {string} memberId @param {string|null} contractId @param {string} type @param {string} text @param {string} [at] */
export const activity = (memberId, contractId, type, text, at) =>
  /** @type {[string, any]} */ (['activity', { id: uid(), memberId, contractId, type, text, at: at || now() }]);

/** @param {string} memberId */
export const getActivity = async (memberId) => (await db.by('activity', 'memberId', memberId)).sort((a, b) => b.at.localeCompare(a.at));

/* ---------- Anmeldung abschließen ---------- */
/** Validiert die gesamte Anmeldung erneut (wie ein Server es tun würde). @param {any} f @param {any} d @param {{allowPast?:boolean}} [o] */
export function validateSignup(f, d, o = {}) {
  const e = { ...validate(f.personal, personalSchema), ...validate(f, membershipSchema(o)), ...validate(f.payment, paymentSchema) };
  const plan = d.plans.find((/** @type {any} */ p) => p.id === f.planId && p.active);
  if (!plan) e.planId = 'Die gewählte Mitgliedschaft ist nicht verfügbar.';
  for (const c of applicableConsents(d.settings, f)) if (c.required && !f.consents[c.key]) e['consent_' + c.key] = 'Diese Zustimmung ist erforderlich.';
  if (!f.signature) e.signature = 'Bitte unterschreiben und die Unterschrift bestätigen.';
  return e;
}

/** @param {any} settings @param {any} f */
export const applicableConsents = (settings, f) => settings.consents.filter((/** @type {any} */ c) => !c.onlySepa || f.payment.method === 'sepa');

/**
 * Legt Mitglied, Vertrag (inkl. Mitgliedschaft + Leistungen + Zahlung), Unterschrift, Einwilligungen
 * und Aktivität in EINER Transaktion an.
 * @param {any} f Formularzustand @param {any} d Stammdaten @param {{at?:string, status?:string, allowPast?:boolean}} [o]
 */
export async function completeSignup(f, d, o = {}) {
  const errors = validateSignup(f, d, o);
  if (Object.keys(errors).length) throw Object.assign(new Error('Die Anmeldung ist unvollständig.'), { errors });
  const at = o.at || now();
  const plan = d.plans.find((/** @type {any} */ p) => p.id === f.planId);
  const addons = d.addons.filter((/** @type {any} */ a) => f.addonIds.includes(a.id));
  const price = calc(plan, addons);
  const year = at.slice(0, 4);
  const memberNo = 'M-' + String(await db.nextNumber('member')).padStart(5, '0');
  const contractNo = `V-${year}-${String(await db.nextNumber('contract_' + year)).padStart(4, '0')}`;
  const p = f.personal;
  const member = { id: uid(), memberNo, ...trimAll(p), email: p.email.trim().toLowerCase(), active: true, createdAt: at, updatedAt: at };
  const payment = { method: f.payment.method, holder: (f.payment.holder || '').trim(), iban: f.payment.method === 'sepa' ? cleanIban(f.payment.iban) : '', note: f.payment.note || '' };
  const membership = { planId: plan.id, name: plan.name, category: plan.category, termMonths: plan.termMonths, minTermMonths: plan.minTermMonths,
    interval: plan.interval, price: plan.price, setupFee: plan.setupFee || 0, noticeWeeks: plan.noticeWeeks, autoRenew: !!plan.autoRenew, description: plan.description };
  const consentDefs = applicableConsents(d.settings, f);
  const consentRows = consentDefs.map((/** @type {any} */ c) => ({ key: c.key, label: c.label, required: c.required, given: !!f.consents[c.key], text: d.settings.legal[c.text] || '' }));
  const contractId = uid(), signatureId = uid();
  const snapshot = { personal: trimAll(p), membership, addons: addons.map((a) => ({ id: a.id, name: a.name, price: a.price, billing: a.billing })),
    start: f.start, end: endDate(f.start, plan.termMonths), price, payment, consents: consentRows };
  const hash = await sha256Hex(JSON.stringify({ contractNo, memberNo, at, snapshot, signature: f.signature }));
  const contract = { id: contractId, contractNo, memberId: member.id, membership, addons: snapshot.addons, start: f.start, end: snapshot.end,
    price, payment, status: o.status || 'aktiv', signatureId, signedAt: at, createdAt: at, locked: true, hash, snapshot, notes: [] };
  /** @type {[string, any][]} */
  const writes = [
    ['members', member], ['contracts', contract],
    ['signatures', { id: signatureId, contractId, memberId: member.id, dataUrl: f.signature, signedAt: at }],
    ...consentRows.map((c) => /** @type {[string, any]} */ (['consents', { id: uid(), contractId, memberId: member.id, ...c, at }])),
    activity(member.id, contractId, 'anmeldung', `Anmeldung erstellt – Vertrag ${contractNo} (${planLabel(membership)})`, at),
  ];
  if (o.status && o.status !== 'aktiv') writes.push(activity(member.id, contractId, 'status', `Status geändert: Aktiv → ${o.status}`, at));
  await db.putMany(writes, f.draftId ? [['drafts', f.draftId]] : []);
  return { member, contract };
}

/** @param {Record<string, any>} o */
function trimAll(o) {
  /** @type {Record<string, any>} */ const r = {};
  for (const [k, v] of Object.entries(o)) r[k] = typeof v === 'string' ? v.trim() : v;
  return r;
}

/* ---------- Mitglieder ändern ---------- */
const LABELS = /** @type {Record<string,string>} */ ({ salutation: 'Anrede', firstName: 'Vorname', lastName: 'Nachname', birthDate: 'Geburtsdatum',
  street: 'Straße', houseNo: 'Hausnummer', zip: 'PLZ', city: 'Ort', phone: 'Telefon', email: 'E-Mail', emergencyName: 'Notfallkontakt', emergencyPhone: 'Notfall-Telefon' });

/** @param {string} id @param {Record<string, any>} patch */
export async function updateMember(id, patch) {
  const errors = validate(patch, personalSchema);
  if (Object.keys(errors).length) throw Object.assign(new Error('Bitte die markierten Felder prüfen.'), { errors });
  const m = await db.get('members', id);
  const clean = trimAll(patch);
  const changed = Object.keys(LABELS).filter((k) => (m[k] ?? '') !== (clean[k] ?? ''));
  if (!changed.length) return m;
  const next = { ...m, ...clean, updatedAt: now() };
  await db.putMany([['members', next], activity(id, null, 'stammdaten', 'Stammdaten geändert: ' + changed.map((k) => LABELS[k]).join(', '))]);
  return next;
}

/** @param {string} id @param {boolean} active */
export async function setMemberActive(id, active) {
  const m = await db.get('members', id);
  await db.putMany([['members', { ...m, active, updatedAt: now() }], activity(id, null, 'status', active ? 'Mitglied reaktiviert' : 'Mitglied deaktiviert')]);
}

export const CONTRACT_STATUS = [['aktiv', 'Aktiv'], ['pausiert', 'Pausiert'], ['gekuendigt', 'Gekündigt'], ['abgelaufen', 'Abgelaufen'], ['entwurf', 'Entwurf']];
const statusName = (/** @type {string} */ s) => CONTRACT_STATUS.find((x) => x[0] === s)?.[1] || s;

/** Vertragsinhalt bleibt unverändert; nur Status/Notiz werden protokolliert geändert. @param {string} contractId @param {string} status @param {string} note */
export async function setContractStatus(contractId, status, note) {
  const c = await db.get('contracts', contractId);
  if (c.status === status) return c;
  const text = `Status geändert: ${statusName(c.status)} → ${statusName(status)}${note ? ' – ' + note : ''}`;
  const next = { ...c, status, notes: [...(c.notes || []), { at: now(), text }] };
  await db.putMany([['contracts', next], activity(c.memberId, c.id, 'status', text)]);
  return next;
}

/** Widerruf der Werbe-Einwilligung @param {string} memberId */
export async function revokeMarketing(memberId) {
  const list = (await db.by('consents', 'memberId', memberId)).filter((c) => c.key === 'werbung' && c.given && !c.revokedAt);
  const at = now();
  await db.putMany([...list.map((c) => /** @type {[string, any]} */ (['consents', { ...c, revokedAt: at }])), activity(memberId, null, 'einwilligung', 'Einwilligung zu Werbe-E-Mails widerrufen')]);
}

/** @param {string} memberId */
export const getMemberDetail = async (memberId) => {
  const [m, contracts, consents, sigs, log, mails] = await Promise.all([db.get('members', memberId), db.by('contracts', 'memberId', memberId),
    db.by('consents', 'memberId', memberId), db.by('signatures', 'memberId', memberId), getActivity(memberId), db.by('emailLog', 'memberId', memberId)]);
  return { m, contracts: contracts.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), consents, sigs, log, mails: mails.sort((a, b) => b.at.localeCompare(a.at)) };
};

/** @param {string} id */
export async function getContractDetail(id) {
  const c = await db.get('contracts', id);
  if (!c) return null;
  const [m, sig, consents] = await Promise.all([db.get('members', c.memberId), db.get('signatures', c.signatureId), db.by('consents', 'contractId', id)]);
  const memberNo = m?.memberNo;
  const check = await sha256Hex(JSON.stringify({ contractNo: c.contractNo, memberNo, at: c.createdAt, snapshot: c.snapshot, signature: sig?.dataUrl }));
  return { c, m, sig, consents, intact: check === c.hash };
}

/* ---------- Entwürfe ---------- */
export const getDraft = () => db.get('drafts', 'signup');
/** @param {any} f */
export const saveDraft = (f) => db.put('drafts', { ...f, id: 'signup', signature: null, savedAt: now() });
export const dropDraft = () => db.del('drafts', 'signup');

/* ---------- Angebote ---------- */
/** @param {any} o */
export function offerState(o) {
  if (o.status === 'versendet') return 'versendet';
  if (o.validUntil && daysUntil(o.validUntil) < 0) return 'abgelaufen';
  return o.status;
}

export function newOffer() {
  const until = new Date(); until.setDate(until.getDate() + 30);
  return { id: uid(), name: '', subject: '', headline: '', description: '', price: '', discount: '', validFrom: today(), validUntil: today(until),
    termMonths: '', coupon: '', cta: 'Jetzt im Studio sichern', ctaUrl: '',
    body: 'Hallo {{vorname}},\n\ndeine Mitgliedschaft {{mitgliedschaft}} läuft am {{vertragsende}} aus.\n\nWir haben deshalb ein exklusives Angebot für dich: …\n\nSportliche Grüße\nDein Team von {{gym}}',
    audience: { mode: 'filter', memberIds: [], filter: { planIds: [], terms: [], statuses: ['aktiv', 'auslaufend'], maxDaysLeft: '' }, marketingOnly: true },
    status: 'entwurf', scheduledAt: '', createdAt: now(), updatedAt: now(), sentAt: null, recipientCount: 0 };
}
/** @param {any} o */
export const saveOffer = (o) => db.put('offers', { ...o, updatedAt: now() });
/** @param {string} id */
export const deleteOffer = (id) => db.del('offers', id);
/** @param {string} id */
export const getOfferMails = async (id) => (await db.by('emailLog', 'offerId', id)).sort((a, b) => a.to.localeCompare(b.to));

/** @param {any} c */
export const termKey = (c) => (c.membership.autoRenew ? 'flex' : String(c.membership.termMonths));

/** Empfänger nach Auswahl/Filter. Nur aktive Mitglieder mit E-Mail; Werbung nur mit Einwilligung. @param {any} offer @param {Row[]} rows */
export function resolveRecipients(offer, rows) {
  const a = offer.audience;
  let list = rows.filter((r) => r.m.active && r.m.email);
  if (a.mode !== 'filter') list = list.filter((r) => a.memberIds.includes(r.m.id));
  else {
    const f = a.filter;
    if (f.planIds.length) list = list.filter((r) => r.c && f.planIds.includes(r.c.membership.planId));
    if (f.terms.length) list = list.filter((r) => r.c && f.terms.includes(termKey(r.c)));
    if (f.statuses.length) list = list.filter((r) => f.statuses.includes(r.state));
    if (f.maxDaysLeft !== '' && f.maxDaysLeft != null) list = list.filter((r) => r.c && !r.c.membership.autoRenew && r.daysLeft != null && r.daysLeft >= 0 && r.daysLeft <= Number(f.maxDaysLeft));
  }
  if (a.marketingOnly) list = list.filter((r) => r.marketing);
  return list;
}

/** Versand über EmailService (Standard: Mock). @param {any} offer @param {{at?:string}} [o] */
export async function sendOffer(offer, o = {}) {
  const d = await loadAll();
  const list = resolveRecipients(offer, memberRows(d));
  if (!list.length) throw new Error('Keine Empfänger – bitte Auswahl prüfen.');
  const svc = getEmailService(d.settings);
  const at = o.at || now();
  /** @type {[string, any][]} */ const writes = [];
  for (const r of list) {
    const mail = buildEmail(offer, varsFor(r, offer, d.settings), d.settings, r.m.email);
    const res = await svc.send(mail);
    writes.push(['emailLog', { id: uid(), offerId: offer.id, memberId: r.m.id, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html, provider: svc.provider.name, status: res.status, at }],
      ['offerRecipients', { id: uid(), offerId: offer.id, memberId: r.m.id, status: res.status, at }],
      activity(r.m.id, null, 'angebot', `Angebot „${offer.name}“ versendet (${svc.provider.name === 'mock' ? 'Testversand' : 'E-Mail'})`, at));
  }
  const sent = { ...offer, status: 'versendet', sentAt: at, recipientCount: list.length, updatedAt: at };
  writes.push(['offers', sent]);
  await db.putMany(writes);
  return sent;
}

/* ---------- Wartung beim Start ---------- */
export async function maintenance() {
  const contracts = await db.all('contracts');
  /** @type {[string, any][]} */ const writes = [];
  for (const c of contracts) {
    if (!['aktiv', 'gekuendigt'].includes(c.status) || daysUntil(c.end) >= 0) continue;
    if (c.status === 'aktiv' && c.membership.autoRenew) {
      let end = c.end;
      while (daysUntil(end) < 0) end = endDate(addDay(end), c.membership.termMonths || 1);
      writes.push(['contracts', { ...c, end }], activity(c.memberId, c.id, 'vertrag', `Vertrag automatisch verlängert bis ${end.split('-').reverse().join('.')}`));
    } else {
      writes.push(['contracts', { ...c, status: 'abgelaufen' }], activity(c.memberId, c.id, 'status', `Status geändert: ${statusName(c.status)} → Abgelaufen (Vertragsende erreicht)`));
    }
  }
  if (writes.length) await db.putMany(writes);
  for (const o of await db.all('offers')) {
    if (o.status === 'geplant' && o.scheduledAt && new Date(o.scheduledAt) <= new Date() && offerState(o) !== 'abgelaufen') {
      try { await sendOffer(o); } catch { /* bleibt geplant, Hinweis in der Übersicht */ }
    }
  }
}
/** @param {string} iso */
function addDay(iso) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + 1); return today(d); }
