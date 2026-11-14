// @ts-check
/* E-Mail-Versand über eine Abstraktion. Während der Entwicklung nur MockProvider:
   Es wird NICHTS verschickt, die fertigen Mails landen im Postausgang-Protokoll (emailLog).
   Für echten Versand (SMTP, Resend, SendGrid, Amazon SES …) braucht es ein Backend,
   das die Zugangsdaten sicher hält; dafür ist HttpApiProvider vorgesehen. */
import { fmtDate, fmtEUR } from '../core/ui.js';
import { planLabel, parseMoney } from '../core/pricing.js';

export const PLACEHOLDERS = [
  ['vorname', 'Vorname'], ['nachname', 'Nachname'], ['mitgliedschaft', 'Mitgliedschaft'], ['vertragsende', 'Vertragsende'],
  ['preis', 'Preis'], ['angebot', 'Angebotsname'], ['rabatt', 'Rabatt'], ['gutschein', 'Gutscheincode'], ['gym', 'Name des Gyms'],
];

/** @param {string} tpl @param {Record<string,string>} vars */
export const fill = (tpl, vars) => String(tpl || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in vars ? vars[k] : m));

/** @param {string} s */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => /** @type {any} */ ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Platzhalter-Werte für ein Mitglied @param {any} row @param {any} offer @param {any} settings */
export function varsFor(row, offer, settings) {
  const c = row?.c;
  return {
    vorname: row?.m.firstName || '', nachname: row?.m.lastName || '',
    mitgliedschaft: c ? planLabel(c.membership) : '–',
    vertragsende: c ? (c.membership.autoRenew ? 'monatlich' : fmtDate(c.end)) : '–',
    preis: offer.price !== '' && offer.price != null ? fmtEUR(parseMoney(offer.price)) : c ? fmtEUR(c.price.monthly) : '–',
    angebot: offer.name || '', rabatt: offer.discount || '', gutschein: offer.coupon || '', gym: settings.name || '',
  };
}

/**
 * Baut die fertige, personalisierte Mail (Text + HTML – alle Nutzerdaten escaped).
 * @param {any} offer @param {Record<string,string>} vars @param {any} settings @param {string} to
 */
export function buildEmail(offer, vars, settings, to) {
  const subject = fill(offer.subject || offer.name, vars);
  const headline = fill(offer.headline, vars);
  const body = fill(offer.body, vars);
  const facts = [
    offer.price !== '' && offer.price != null ? ['Preis', fmtEUR(parseMoney(offer.price))] : null,
    offer.discount ? ['Rabatt', offer.discount] : null,
    offer.termMonths ? ['Laufzeit', `${offer.termMonths} Monate`] : null,
    offer.validUntil ? ['Gültig bis', fmtDate(offer.validUntil)] : null,
    offer.coupon ? ['Gutscheincode', offer.coupon] : null,
  ].filter(Boolean);
  const text = [headline, '', body, '', ...facts.map((f) => `${f?.[0]}: ${f?.[1]}`), '', offer.cta ? `→ ${offer.cta}${offer.ctaUrl ? ': ' + offer.ctaUrl : ''}` : '',
    '', '—', settings.name, settings.street ? `${settings.street}, ${settings.zip} ${settings.city}` : '', settings.phone || ''].join('\n');
  const html = `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#1e3a8a;color:#fff;padding:20px 28px;font-size:18px;font-weight:bold">${esc(settings.name)}</td></tr>
<tr><td style="padding:28px"><h1 style="margin:0 0 16px;font-size:24px">${esc(headline)}</h1>
${body.split(/\n{2,}/).map((p) => `<p style="line-height:1.55;margin:0 0 14px">${esc(p).replace(/\n/g, '<br>')}</p>`).join('')}
${facts.length ? `<table style="margin:12px 0;border-collapse:collapse">${facts.map((f) => `<tr><td style="padding:4px 16px 4px 0;color:#6b7280">${esc(f?.[0])}</td><td style="padding:4px 0;font-weight:bold">${esc(f?.[1])}</td></tr>`).join('')}</table>` : ''}
${offer.cta ? `<p style="margin:22px 0 0"><a href="${esc(/^https?:\/\//.test(offer.ctaUrl || '') ? offer.ctaUrl : '#')}" style="background:#2563eb;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">${esc(offer.cta)}</a></p>` : ''}
</td></tr><tr><td style="padding:16px 28px;background:#f9fafb;color:#6b7280;font-size:12px">${esc(settings.name)} · ${esc(settings.street || '')} ${esc(settings.zip || '')} ${esc(settings.city || '')}<br>Du erhältst diese Mail, weil du der Kontaktaufnahme zu Werbezwecken zugestimmt hast. [Platzhalter: Abmeldelink]</td></tr>
</table></td></tr></table></body></html>`;
  return { to, subject, text, html, headline, body, facts };
}

/** @typedef {{to:string, subject:string, text:string, html:string}} Mail */
/** @typedef {{name:string, send:(m:Mail)=>Promise<{ok:boolean, status:string, providerId?:string}>}} Provider */

/** Entwicklungs-Provider: verschickt nichts. @implements {Provider} */
export class MockProvider {
  name = 'mock';
  /** @param {Mail} _m */
  async send(_m) { return { ok: true, status: 'simuliert', providerId: 'mock-' + crypto.randomUUID().slice(0, 8) }; }
}

/** Vorgesehen für ein eigenes Backend (z. B. /api/mail → Resend/SendGrid/SES/SMTP). @implements {Provider} */
export class HttpApiProvider {
  name = 'http';
  /** @param {string} endpoint */
  constructor(endpoint) { this.endpoint = endpoint; }
  /** @param {Mail} _m */
  async send(_m) { if (this.endpoint) throw new Error('Echter Versand ist erst mit angebundenem Mail-Backend möglich.'); return { ok: false, status: 'fehler' }; }
}

export class EmailService {
  /** @param {Provider} provider */
  constructor(provider) { this.provider = provider; }
  /** @param {Mail} m */
  send(m) { return this.provider.send(m); }
}

/** Liefert IMMER den Mock, außer echter Versand wurde ausdrücklich aktiviert UND ein Backend ist eingetragen. @param {any} settings */
export function getEmailService(settings) {
  const e = settings.mail || {};
  if (e.mode === 'live' && e.endpoint) return new EmailService(new HttpApiProvider(e.endpoint));
  return new EmailService(new MockProvider());
}
