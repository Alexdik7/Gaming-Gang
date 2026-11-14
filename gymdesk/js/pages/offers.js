// @ts-check
/* Angebote: Übersicht, Editor mit Empfängerauswahl, Personalisierung, Vorschau und (Mock-)Versand. */
import { h, icon, pageHead, card, badge, fmtDate, fmtDateTime, empty, field, showErrors, toast, confirmDialog, modal, replace, debounce } from '../core/ui.js';
import { loadAll, memberRows, offerState, newOffer, saveOffer, deleteOffer, resolveRecipients, sendOffer, getOfferMails, termKey } from '../services/data.js';
import { validate, R } from '../core/validate.js';
import { planLabel } from '../core/pricing.js';
import { PLACEHOLDERS, varsFor, buildEmail } from '../services/email.js';
import * as db from '../core/db.js';
import { setGuard } from '../app.js';

/** @param {{params:string[], query:Record<string,string>}} ctx */
export async function render(ctx) {
  const d = await loadAll();
  const rows = memberRows(d);
  if (ctx.params[0]) {
    const o = ctx.params[0] === 'neu' ? template(ctx.query.vorlage) : await db.get('offers', ctx.params[0]);
    if (!o) return empty('Angebot nicht gefunden', '', h('a', { class: 'btn', href: '#/angebote' }, 'Zur Übersicht'));
    return o.status === 'versendet' ? sentView(o, d, rows) : editor(o, d, rows, ctx.params[0] === 'neu');
  }
  const list = [...d.offers].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return h('div', { class: 'page' },
    pageHead('Angebote', 'Angebote erstellen und personalisiert per E-Mail versenden', h('a', { class: 'btn primary big', href: '#/angebote/neu' }, icon('plus', 22), 'Neues Angebot')),
    d.settings.mail.mode !== 'live' ? h('div', { class: 'notice' }, icon('shield', 22), h('span', null, h('b', null, 'Testmodus: '), 'Es werden keine echten E-Mails verschickt. Fertige Mails landen im Postausgang des Angebots.')) : null,
    h('div', { class: 'card flush' }, list.length ? h('table', { class: 'table rtable' },
      h('thead', null, h('tr', null, ['Angebot', 'Erstellt', 'Gültig bis', 'Empfänger', 'Status', 'Versand', ''].map((t) => h('th', null, t)))),
      h('tbody', null, list.map((o) => {
        const st = offerState(o);
        return h('tr', { tabindex: '0', onclick: () => { location.hash = '#/angebote/' + o.id; }, onkeydown: (/** @type {KeyboardEvent} */ e) => { if (e.key === 'Enter') location.hash = '#/angebote/' + o.id; } },
          h('td', { 'data-label': 'Angebot', class: 'td-name' }, h('b', null, o.name)), h('td', { 'data-label': 'Erstellt' }, fmtDate(o.createdAt)),
          h('td', { 'data-label': 'Gültig bis' }, fmtDate(o.validUntil)),
          h('td', { 'data-label': 'Empfänger' }, String(st === 'versendet' ? o.recipientCount : resolveRecipients(o, rows).length)),
          h('td', { 'data-label': 'Status' }, badge(st)),
          h('td', { 'data-label': 'Versand' }, o.sentAt ? fmtDateTime(o.sentAt) : o.status === 'geplant' ? 'geplant: ' + fmtDateTime(o.scheduledAt) : '–'),
          h('td', { class: 'td-act' }, h('span', { class: 'icon-btn' }, icon('chevR', 20))));
      }))) : empty('Noch keine Angebote', 'Erstelle dein erstes Angebot.', h('a', { class: 'btn primary', href: '#/angebote/neu' }, 'Neues Angebot'))));
}

/** @param {string} [kind] */
function template(kind) {
  const o = newOffer();
  if (kind === 'verlaengerung') Object.assign(o, { name: 'Verlängerungsangebot', subject: '{{vorname}}, deine Mitgliedschaft läuft bald aus', headline: 'Jetzt verlängern und sparen',
    discount: '10 %', audience: { ...o.audience, filter: { planIds: [], terms: [], statuses: ['auslaufend'], maxDaysLeft: '60' } } });
  return o;
}

/** Live-Vorschau einer personalisierten Mail @param {any} mail */
function mailPreview(mail) {
  return h('div', { class: 'mail' },
    h('div', { class: 'mail-meta' }, h('div', null, h('small', null, 'An'), h('span', null, mail.to || '–')), h('div', null, h('small', null, 'Betreff'), h('b', null, mail.subject || '(kein Betreff)'))),
    h('div', { class: 'mail-body' },
      h('div', { class: 'mail-brand' }, mail.gym),
      h('h3', null, mail.headline),
      String(mail.body || '').split(/\n{2,}/).map((p) => h('p', null, p.split('\n').map((l, i) => [i ? h('br') : null, l]))),
      mail.facts.length ? h('dl', { class: 'mail-facts' }, mail.facts.map((/** @type {any} */ f) => [h('dt', null, f[0]), h('dd', null, f[1])])) : null,
      mail.cta ? h('span', { class: 'mail-cta' }, mail.cta) : null,
      h('p', { class: 'mail-foot' }, 'Du erhältst diese Mail, weil du der Kontaktaufnahme zu Werbezwecken zugestimmt hast. [Platzhalter: Abmeldelink]')));
}

/** @param {any} o @param {any} d @param {import('../services/data.js').Row[]} rows @param {boolean} isNew */
function editor(o, d, rows, isNew) {
  let dirty = false;
  setGuard(() => (dirty ? 'Das Angebot hat ungespeicherte Änderungen. Möchtest du wirklich verlassen?' : null));
  const touch = () => { dirty = true; refresh(); };
  /** @param {string} n @param {string} l @param {any} [x] */
  const F = (n, l, x = {}) => field({ name: n, label: l, value: o[n], onInput: (v) => { o[n] = v; touch(); }, ...x });

  const body = F('body', 'E-Mail-Inhalt', { type: 'textarea', rows: 9, required: true, wide: true, hint: 'Platzhalter werden beim Versand pro Mitglied ersetzt.' });
  const ta = /** @type {HTMLTextAreaElement} */ (body.querySelector('textarea'));
  const phs = h('div', { class: 'ph-chips wide' }, h('small', { class: 'muted' }, 'Platzhalter einfügen:'), PLACEHOLDERS.map(([k, l]) => h('button', { type: 'button', class: 'chip sm', title: l, onclick: () => {
    const s = ta.selectionStart ?? ta.value.length, e = ta.selectionEnd ?? s;
    ta.setRangeText(`{{${k}}}`, s, e, 'end'); o.body = ta.value; ta.focus(); touch();
  } }, `{{${k}}}`)));

  const form = h('div', { class: 'form-grid' },
    F('name', 'Angebotsname', { required: true, placeholder: 'z. B. Frühjahrs-Aktion' }), F('subject', 'Betreff', { required: true, placeholder: 'z. B. {{vorname}}, dein exklusives Angebot' }),
    F('headline', 'Überschrift', { wide: true }), F('description', 'Kurzbeschreibung (intern)', { wide: true }),
    F('price', 'Preis (€)', { inputmode: 'decimal', placeholder: '39,90' }), F('discount', 'Rabatt', { placeholder: 'z. B. 20 % oder 1 Monat gratis' }),
    F('validFrom', 'Gültig ab', { type: 'date' }), F('validUntil', 'Gültig bis', { type: 'date', required: true }),
    F('termMonths', 'Laufzeit (Monate)', { inputmode: 'numeric' }), F('coupon', 'Gutscheincode (optional)', { attrs: { autocapitalize: 'characters' } }),
    F('cta', 'Call-to-Action (Button-Text)'), F('ctaUrl', 'Link für den Button (optional, https://…)', { type: 'url' }),
    body, phs);

  /* Empfänger */
  const a = o.audience;
  const aud = h('div', { class: 'audience' });
  const countBox = h('div', { class: 'count-box', role: 'status', 'aria-live': 'polite' });
  const preview = h('div');
  const previewSel = /** @type {HTMLSelectElement} */ (h('select', { 'aria-label': 'Vorschau für Mitglied', onchange: () => drawPreview() }));
  const eligible = rows.filter((r) => r.m.active && r.m.email);

  function drawAudience() {
    const modes = [['single', 'Einzelnes Mitglied'], ['multi', 'Mehrere Mitglieder'], ['filter', 'Nach Filter']];
    const seg = h('div', { class: 'seg' }, modes.map(([k, l]) => h('button', { type: 'button', class: a.mode === k ? 'on' : '', onclick: () => { a.mode = k; touch(); drawAudience(); } }, l)));
    let inner;
    if (a.mode === 'single') {
      inner = h('div', { class: 'field' }, h('label', null, 'Mitglied'), h('select', { onchange: (/** @type {Event} */ e) => { a.memberIds = [/** @type {HTMLSelectElement} */ (e.target).value]; touch(); } },
        h('option', { value: '' }, 'Bitte wählen …'), eligible.map((r) => h('option', { value: r.m.id, selected: a.memberIds[0] === r.m.id }, `${r.m.firstName} ${r.m.lastName} (${r.m.memberNo})${r.marketing ? '' : ' – ohne Werbe-Einwilligung'}`))));
    } else if (a.mode === 'multi') {
      const listBox = h('div', { class: 'pick-list' });
      const drawList = (/** @type {string} */ q) => replace(listBox, eligible.filter((r) => !q || `${r.m.firstName} ${r.m.lastName} ${r.m.memberNo}`.toLowerCase().includes(q.toLowerCase())).map((r) =>
        h('label', { class: 'check-row slim' }, h('input', { type: 'checkbox', checked: a.memberIds.includes(r.m.id), onchange: (/** @type {Event} */ e) => {
          const on = /** @type {HTMLInputElement} */ (e.target).checked; a.memberIds = on ? [...a.memberIds, r.m.id] : a.memberIds.filter((/** @type {string} */ x) => x !== r.m.id); touch();
        } }), h('span', null, `${r.m.firstName} ${r.m.lastName}`, h('small', null, ` · ${r.c ? planLabel(r.c.membership) : '–'}${r.marketing ? '' : ' · ohne Werbe-Einwilligung'}`)))));
      drawList('');
      inner = h('div', null, h('div', { class: 'search' }, icon('search', 20), h('input', { type: 'search', class: 'search-in', placeholder: 'Mitglied suchen', oninput: (/** @type {Event} */ e) => drawList(/** @type {HTMLInputElement} */ (e.target).value) })), listBox);
    } else {
      const f = a.filter;
      /** @param {string} title @param {string} key @param {[string,string][]} opts */
      const multi = (title, key, opts) => h('div', { class: 'filter-group' }, h('span', { class: 'lbl' }, title), h('div', { class: 'chips' }, opts.map(([v, l]) =>
        h('button', { type: 'button', class: ['chip', f[key].includes(v) && 'on'], 'aria-pressed': String(f[key].includes(v)), onclick: (/** @type {Event} */ e) => {
          f[key] = f[key].includes(v) ? f[key].filter((/** @type {string} */ x) => x !== v) : [...f[key], v];
          /** @type {HTMLElement} */ (e.currentTarget).classList.toggle('on'); touch();
        } }, l))));
      const terms = [...new Set(rows.filter((r) => r.c).map((r) => termKey(r.c)))].sort((x, y) => (x === 'flex' ? 1 : y === 'flex' ? -1 : +x - +y));
      inner = h('div', null,
        multi('Mitgliedschaft', 'planIds', d.plans.map((/** @type {any} */ p) => [p.id, planLabel(p)])),
        multi('Laufzeit', 'terms', terms.map((t) => [t, t === 'flex' ? 'Flex' : `${t} Monate`])),
        multi('Status', 'statuses', [['aktiv', 'Aktiv'], ['auslaufend', 'Läuft aus'], ['pausiert', 'Pausiert'], ['gekuendigt', 'Gekündigt'], ['abgelaufen', 'Abgelaufen']]),
        h('div', { class: 'filter-group' }, h('label', { class: 'lbl', for: 'maxdays' }, 'Restlaufzeit höchstens (Tage)'),
          h('input', { id: 'maxdays', class: 'short', inputmode: 'numeric', value: f.maxDaysLeft, placeholder: 'z. B. 60', oninput: (/** @type {Event} */ e) => { f.maxDaysLeft = /** @type {HTMLInputElement} */ (e.target).value.replace(/\D/g, ''); touch(); } })),
        h('p', { class: 'muted small' }, 'Alle gewählten Filter werden kombiniert (UND). Keine Auswahl in einer Gruppe = alle.'));
    }
    replace(aud, seg, inner,
      h('label', { class: 'check-row' }, h('input', { type: 'checkbox', checked: a.marketingOnly, onchange: (/** @type {Event} */ e) => { a.marketingOnly = /** @type {HTMLInputElement} */ (e.target).checked; touch(); drawAudience(); } }),
        h('span', null, h('b', null, 'Nur Mitglieder mit Werbe-Einwilligung'), h('small', null, 'Empfohlen (DSGVO/UWG). Werbung ohne Einwilligung ist in der Regel unzulässig.'))),
      !a.marketingOnly ? h('div', { class: 'notice warn' }, icon('alert', 22), h('span', null, 'Achtung: Es werden auch Mitglieder ohne Werbe-Einwilligung angeschrieben. Nur für reine Vertragsinformationen verwenden.')) : null);
    refresh();
  }

  const recipients = () => resolveRecipients(o, rows);
  function drawPreview() {
    const list = recipients();
    const pick = list.find((r) => r.m.id === previewSel.value) || list[0] || eligible[0];
    const mail = buildEmail(o, varsFor(pick, o, d.settings), d.settings, pick?.m.email || '');
    replace(preview, mailPreview({ ...mail, gym: d.settings.name, cta: o.cta }));
  }
  const refresh = debounce(() => {
    const list = recipients();
    const without = a.marketingOnly ? resolveRecipients({ ...o, audience: { ...a, marketingOnly: false } }, rows).length - list.length : 0;
    replace(countBox, icon('users', 22), h('div', null, h('b', null, `Dieses Angebot wird an ${list.length} ${list.length === 1 ? 'Mitglied' : 'Mitglieder'} gesendet.`),
      without > 0 ? h('small', null, `${without} weitere passen, haben aber keine Werbe-Einwilligung.`) : null));
    countBox.classList.toggle('zero', !list.length);
    const keep = previewSel.value;
    replace(previewSel, list.map((r) => h('option', { value: r.m.id, selected: r.m.id === keep }, `Vorschau für ${r.m.firstName} ${r.m.lastName}`)));
    if (!list.length) replace(previewSel, h('option', null, 'Vorschau mit Beispiel-Mitglied'));
    drawPreview();
  }, 120);

  function check() {
    const e = validate(o, { name: ['required'], subject: ['required'], body: ['required'], validUntil: ['required', 'date', (v) => (v && o.validFrom && v < o.validFrom ? 'Das Enddatum liegt vor dem Startdatum.' : null)],
      price: ['money'], termMonths: [(v) => (!v || /^\d{1,3}$/.test(String(v)) ? null : 'Bitte nur Ziffern.')], ctaUrl: [(v) => (!v || /^https:\/\//.test(v) ? null : 'Bitte mit https:// beginnen.')] });
    if (Object.keys(e).length) { showErrors(form, e); toast('Bitte die markierten Felder prüfen.', 'err'); }
    return !Object.keys(e).length;
  }
  async function save(/** @type {string} */ status, /** @type {string} */ msg) {
    if (!check()) return false;
    o.status = status;
    await saveOffer(o); dirty = false; toast(msg);
    return true;
  }
  async function send() {
    if (!check()) return;
    const list = recipients();
    if (!list.length) { toast('Keine Empfänger ausgewählt.', 'err'); return; }
    const ok = await confirmDialog({ title: 'Angebot jetzt versenden?', ok: `An ${list.length} senden`, text: h('div', null,
      h('p', { class: 'big-confirm' }, `Dieses Angebot wird an ${list.length} ${list.length === 1 ? 'Mitglied' : 'Mitglieder'} gesendet.`),
      h('p', { class: 'muted small' }, list.slice(0, 8).map((r) => `${r.m.firstName} ${r.m.lastName}`).join(', ') + (list.length > 8 ? ` und ${list.length - 8} weitere` : '')),
      d.settings.mail.mode !== 'live' ? h('p', { class: 'notice' }, 'Testmodus: Es wird nichts wirklich verschickt.') : null) });
    if (!ok) return;
    try { await sendOffer(o); dirty = false; toast(`Angebot an ${list.length} Mitglieder versendet (Test).`); location.hash = '#/angebote/' + o.id; }
    catch (e) { toast(/** @type {Error} */ (e).message, 'err'); }
  }
  function schedule() {
    const inp = /** @type {HTMLInputElement} */ (h('input', { type: 'datetime-local', value: o.scheduledAt || '' }));
    const md = modal({ title: 'Versand planen', body: [h('p', { class: 'muted' }, 'Geplante Angebote werden verschickt, sobald die App nach diesem Zeitpunkt geöffnet wird.'), h('div', { class: 'field' }, h('label', null, 'Zeitpunkt'), inp)],
      actions: [h('button', { class: 'btn', onclick: () => md.close() }, 'Abbrechen'), h('button', { class: 'btn primary', onclick: async () => {
        if (!inp.value || new Date(inp.value) <= new Date()) { toast('Bitte einen Zeitpunkt in der Zukunft wählen.', 'err'); return; }
        o.scheduledAt = inp.value;
        if (await save('geplant', 'Versand geplant.')) { md.close(); location.hash = '#/angebote'; }
      } }, 'Planen')] });
  }

  drawAudience();
  return h('div', { class: 'page' },
    h('a', { class: 'back', href: '#/angebote' }, icon('chevL', 18), 'Angebote'),
    pageHead(isNew ? 'Neues Angebot' : o.name || 'Angebot', o.status === 'geplant' ? `Geplant für ${fmtDateTime(o.scheduledAt)} – noch bearbeitbar` : 'Entwurf – noch bearbeitbar'),
    h('div', { class: 'offer-grid' },
      h('div', null, card('Angebot & E-Mail', form), card('Empfänger', aud)),
      h('div', { class: 'sticky' }, countBox, card('Vorschau', h('div', null, previewSel, preview)),
        h('div', { class: 'stack-btns' },
          h('button', { class: 'btn primary big', onclick: send }, icon('send', 20), 'Jetzt versenden'),
          h('button', { class: 'btn big', onclick: schedule }, icon('calendar', 20), 'Versand planen'),
          h('button', { class: 'btn big', onclick: async () => { if (await save(o.status === 'geplant' ? 'geplant' : 'entwurf', 'Gespeichert.')) location.hash = '#/angebote'; } }, 'Speichern'),
          !isNew ? h('button', { class: 'btn danger-ghost', onclick: async () => {
            if (await confirmDialog({ title: 'Angebot löschen?', text: 'Der Entwurf wird endgültig gelöscht.', ok: 'Löschen', danger: true })) { await deleteOffer(o.id); dirty = false; location.hash = '#/angebote'; }
          } }, icon('trash', 18), 'Löschen') : null))));
}

/** Versendetes Angebot: nur lesen @param {any} o @param {any} d @param {any[]} _rows */
async function sentView(o, d, _rows) {
  const mails = await getOfferMails(o.id);
  return h('div', { class: 'page' },
    h('a', { class: 'back', href: '#/angebote' }, icon('chevL', 18), 'Angebote'),
    pageHead(o.name, `Versendet am ${fmtDateTime(o.sentAt)} an ${o.recipientCount} Mitglieder · nicht mehr bearbeitbar`, badge('versendet')),
    h('div', { class: 'grid-2' },
      card('Details', h('dl', { class: 'dl' }, [['Betreff', o.subject], ['Überschrift', o.headline], ['Gültig', `${fmtDate(o.validFrom)} – ${fmtDate(o.validUntil)}`], ['Preis', o.price || '–'], ['Rabatt', o.discount || '–'], ['Gutschein', o.coupon || '–'], ['Versandweg', mails[0]?.provider === 'mock' ? 'Testversand (Mock) – nichts verschickt' : 'E-Mail']]
        .map(([k, v]) => [h('dt', null, k), h('dd', null, v)]))),
      card(`Postausgang (${mails.length})`, mails.length ? h('ul', { class: 'list' }, mails.map((m) => h('li', null, h('button', { class: 'list-row', onclick: () => {
        modal({ title: m.subject, wide: true, body: h('pre', { class: 'mail-text' }, `An: ${m.to}\nBetreff: ${m.subject}\nStatus: ${m.status} · ${fmtDateTime(m.at)}\n\n${m.text}`) });
      } }, icon('mail', 18), h('span', { class: 'grow' }, h('b', null, m.to), h('small', null, m.subject)), h('span', { class: 'pill' }, m.status))))) : empty('Leer', ''))));
}
