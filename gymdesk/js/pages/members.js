// @ts-check
/* Mitgliederliste (Suche, Filter, Sortierung) und Kundenmaske. */
import { h, icon, pageHead, card, badge, fmtDate, fmtDateTime, fmtEUR, dl, empty, modal, field, showErrors, toast, confirmDialog, replace } from '../core/ui.js';
import { loadAll, memberRows, getMemberDetail, updateMember, setMemberActive, setContractStatus, revokeMarketing, CONTRACT_STATUS } from '../services/data.js';
import { planLabel } from '../core/pricing.js';
import { fmtIban, maskIban } from '../core/validate.js';
import { PAY, INTERVAL_TXT } from './contractview.js';

const FILTERS = [['alle', 'Alle'], ['aktiv', 'Aktiv'], ['neu', 'Neu (30 T.)'], ['auslaufend', 'Läuft aus'], ['pausiert', 'Pausiert'], ['gekuendigt', 'Gekündigt'], ['abgelaufen', 'Abgelaufen'], ['deaktiviert', 'Deaktiviert']];
const SORTS = [['name', 'Name A–Z'], ['neu', 'Neueste zuerst'], ['ende', 'Vertragsende'], ['nr', 'Mitgliedsnummer']];

/** @param {{params:string[], query:Record<string,string>, refresh:()=>void}} ctx */
export async function render(ctx) {
  if (ctx.params[0]) return profile(ctx.params[0], ctx.refresh);
  const d = await loadAll();
  const rows = memberRows(d);
  const st = { q: ctx.query.q || '', f: ctx.query.f || 'alle', plan: '', sort: 'name' };
  const since = new Date(); since.setDate(since.getDate() - 30);

  const body = h('div');
  const count = h('span', { class: 'muted' });
  function apply() {
    const q = st.q.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (st.f === 'aktiv' && !['aktiv', 'auslaufend'].includes(r.state)) return false;
      if (st.f === 'neu' && new Date(r.m.createdAt) < since) return false;
      if (!['alle', 'aktiv', 'neu'].includes(st.f) && r.state !== st.f) return false;
      if (st.plan && r.c?.membership.planId !== st.plan) return false;
      if (!q) return true;
      const m = r.m;
      return [m.firstName, m.lastName, `${m.firstName} ${m.lastName}`, m.email, m.phone, m.phone.replace(/\D/g, ''), m.memberNo].some((v) => String(v || '').toLowerCase().includes(q));
    });
    const S = /** @type {Record<string, (a:any,b:any)=>number>} */ ({
      name: (a, b) => `${a.m.lastName} ${a.m.firstName}`.localeCompare(`${b.m.lastName} ${b.m.firstName}`),
      neu: (a, b) => b.m.createdAt.localeCompare(a.m.createdAt),
      ende: (a, b) => (a.c?.end || '9').localeCompare(b.c?.end || '9'),
      nr: (a, b) => a.m.memberNo.localeCompare(b.m.memberNo),
    });
    list.sort(S[st.sort]);
    count.textContent = `${list.length} von ${rows.length} Mitgliedern`;
    replace(body, list.length ? table(list) : empty('Keine Treffer', st.q ? `Niemand passt zu „${st.q}“.` : 'Für diesen Filter gibt es keine Mitglieder.'));
    history.replaceState(null, '', `#/mitglieder${st.f !== 'alle' || st.q ? '?' + new URLSearchParams({ ...(st.f !== 'alle' ? { f: st.f } : {}), ...(st.q ? { q: st.q } : {}) }) : ''}`);
  }

  /** @param {import('../services/data.js').Row[]} list */
  function table(list) {
    return h('table', { class: 'table rtable' },
      h('thead', null, h('tr', null, ['Name', 'Kontakt', 'Mitgliedschaft', 'Beginn', 'Ende', 'Status', 'Nr.', ''].map((t) => h('th', null, t)))),
      h('tbody', null, list.map((r) => h('tr', { tabindex: '0', onclick: (/** @type {Event} */ e) => { if (!/** @type {HTMLElement} */ (e.target).closest('button')) location.hash = '#/mitglieder/' + r.m.id; },
        onkeydown: (/** @type {KeyboardEvent} */ e) => { if (e.key === 'Enter') location.hash = '#/mitglieder/' + r.m.id; } },
        h('td', { 'data-label': 'Name', class: 'td-name' }, h('span', { class: 'avatar' }, (r.m.firstName[0] || '') + (r.m.lastName[0] || '')), h('b', null, `${r.m.firstName} ${r.m.lastName}`)),
        h('td', { 'data-label': 'Kontakt' }, h('div', { class: 'stack' }, h('span', null, r.m.email), h('small', { class: 'muted' }, r.m.phone))),
        h('td', { 'data-label': 'Mitgliedschaft' }, r.c ? planLabel(r.c.membership) : '–'),
        h('td', { 'data-label': 'Beginn' }, fmtDate(r.c?.start)),
        h('td', { 'data-label': 'Ende' }, r.c ? (r.c.membership.autoRenew ? 'monatlich' : fmtDate(r.c.end)) : '–'),
        h('td', { 'data-label': 'Status' }, badge(r.state)),
        h('td', { 'data-label': 'Nr.' }, h('code', null, r.m.memberNo)),
        h('td', { class: 'td-act' },
          h('button', { class: 'icon-btn', title: 'Bearbeiten', 'aria-label': 'Bearbeiten', onclick: () => editMember(r.m, ctx.refresh) }, icon('pen', 20)),
          h('a', { class: 'icon-btn', href: '#/mitglieder/' + r.m.id, 'aria-label': 'Öffnen' }, icon('chevR', 20)))))));
  }

  const search = h('input', { type: 'search', class: 'search-in', placeholder: 'Suche: Name, E-Mail, Telefon, Mitgliedsnr.', value: st.q, 'aria-label': 'Mitglieder suchen',
    oninput: (/** @type {Event} */ e) => { st.q = /** @type {HTMLInputElement} */ (e.target).value; apply(); } });
  const chips = h('div', { class: 'chips', role: 'tablist' }, FILTERS.map(([k, l]) => h('button', { class: ['chip', st.f === k && 'on'], role: 'tab', 'aria-selected': String(st.f === k),
    onclick: (/** @type {Event} */ e) => { st.f = k; chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('on')); /** @type {HTMLElement} */ (e.currentTarget).classList.add('on'); apply(); } }, l)));
  const planSel = h('select', { 'aria-label': 'Nach Mitgliedschaft filtern', onchange: (/** @type {Event} */ e) => { st.plan = /** @type {HTMLSelectElement} */ (e.target).value; apply(); } },
    h('option', { value: '' }, 'Alle Mitgliedschaften'), d.plans.map((p) => h('option', { value: p.id }, planLabel(p))));
  const sortSel = h('select', { 'aria-label': 'Sortierung', onchange: (/** @type {Event} */ e) => { st.sort = /** @type {HTMLSelectElement} */ (e.target).value; apply(); } },
    SORTS.map(([k, l]) => h('option', { value: k }, l)));
  apply();
  return h('div', { class: 'page' },
    pageHead('Mitglieder', count, h('a', { class: 'btn primary big', href: '#/anmeldung' }, icon('userPlus', 22), 'Neue Anmeldung')),
    h('div', { class: 'toolbar' }, h('div', { class: 'search' }, icon('search', 20), search), planSel, sortSel), chips, h('div', { class: 'card flush' }, body));
}

/** Stammdaten bearbeiten @param {any} m @param {()=>void} done */
function editMember(m, done) {
  const v = { ...m };
  /** @param {string} n @param {string} l @param {any} [o] */
  const F = (n, l, o = {}) => field({ name: n, label: l, value: v[n], onInput: (x) => { v[n] = x; }, ...o });
  const form = h('div', { class: 'form-grid' },
    F('salutation', 'Anrede', { type: 'select', options: [['Frau', 'Frau'], ['Herr', 'Herr'], ['Divers', 'Divers'], ['Keine Angabe', 'Keine Angabe']] }),
    F('birthDate', 'Geburtsdatum', { type: 'date' }), F('firstName', 'Vorname'), F('lastName', 'Nachname'),
    F('street', 'Straße'), F('houseNo', 'Hausnummer'), F('zip', 'PLZ', { inputmode: 'numeric' }), F('city', 'Ort'),
    F('phone', 'Telefon', { type: 'tel' }), F('email', 'E-Mail', { type: 'email' }), F('emergencyName', 'Notfallkontakt'), F('emergencyPhone', 'Notfall-Telefon', { type: 'tel' }));
  const md = modal({ title: `${m.firstName} ${m.lastName} bearbeiten`, wide: true, body: [h('p', { class: 'muted' }, 'Änderungen werden mit Datum und Uhrzeit in der Historie protokolliert. Der abgeschlossene Vertrag bleibt unverändert.'), form],
    actions: [h('button', { class: 'btn', onclick: () => md.close() }, 'Abbrechen'), h('button', { class: 'btn primary', onclick: async () => {
      try {
        const { salutation, firstName, lastName, birthDate, street, houseNo, zip, city, phone, email, emergencyName, emergencyPhone } = v;
        await updateMember(m.id, { salutation, firstName, lastName, birthDate, street, houseNo, zip, city, phone, email, emergencyName, emergencyPhone });
        md.close(); toast('Stammdaten gespeichert.'); done();
      } catch (e) { showErrors(form, /** @type {any} */ (e).errors || {}); toast(/** @type {Error} */ (e).message, 'err'); }
    } }, 'Speichern')] });
}

/** Kundenmaske @param {string} id @param {()=>void} refresh */
async function profile(id, refresh) {
  const x = await getMemberDetail(id);
  if (!x.m) return empty('Mitglied nicht gefunden', 'Vielleicht wurde der Link falsch kopiert.', h('a', { class: 'btn', href: '#/mitglieder' }, 'Zur Liste'));
  const d = await loadAll();
  const row = memberRows(d).find((r) => r.m.id === id);
  const m = x.m, c = x.contracts[0];
  const sig = c && x.sigs.find((s) => s.id === c.signatureId);
  const cons = c ? x.consents.filter((k) => k.contractId === c.id) : [];
  const marketing = cons.find((k) => k.key === 'werbung');

  const ibanEl = h('span', { class: 'mono' }, c?.payment.iban ? maskIban(c.payment.iban) : '–');
  let shown = false;
  const ibanBtn = c?.payment.iban ? h('button', { class: 'btn ghost sm', onclick: () => {
    shown = !shown; ibanEl.textContent = shown ? fmtIban(c.payment.iban) : maskIban(c.payment.iban);
    ibanBtn.lastChild && (ibanBtn.lastChild.textContent = shown ? 'Verbergen' : 'Anzeigen');
    if (shown) setTimeout(() => { if (shown) { shown = false; ibanEl.textContent = maskIban(c.payment.iban); if (ibanBtn.lastChild) ibanBtn.lastChild.textContent = 'Anzeigen'; } }, 15000);
  } }, icon('eye', 16), h('span', null, 'Anzeigen')) : null;

  const statusSel = c ? /** @type {HTMLSelectElement} */ (h('select', { 'aria-label': 'Vertragsstatus' }, CONTRACT_STATUS.map(([k, l]) => h('option', { value: k, selected: c.status === k }, l)))) : null;
  statusSel?.addEventListener('change', async () => {
    const note = await askNote(statusSel.options[statusSel.selectedIndex].text);
    if (note === null) { statusSel.value = c.status; return; }
    await setContractStatus(c.id, statusSel.value, note); toast('Status geändert.'); refresh();
  });

  return h('div', { class: 'page' },
    h('a', { class: 'back', href: '#/mitglieder' }, icon('chevL', 18), 'Mitglieder'),
    h('header', { class: 'profile-head card' },
      h('span', { class: 'avatar xl' }, (m.firstName[0] || '') + (m.lastName[0] || '')),
      h('div', { class: 'grow' }, h('h1', null, `${m.firstName} ${m.lastName}`), h('p', { class: 'muted' }, h('code', null, m.memberNo), ' · Mitglied seit ', fmtDate(m.createdAt)), row ? badge(row.state) : null),
      h('div', { class: 'head-actions' },
        h('button', { class: 'btn big', onclick: () => editMember(m, refresh) }, icon('pen', 20), 'Bearbeiten'),
        h('button', { class: ['btn big', m.active && 'danger-ghost'], onclick: async () => {
          if (await confirmDialog({ title: m.active ? 'Mitglied deaktivieren?' : 'Mitglied reaktivieren?', text: m.active ? 'Das Mitglied erscheint als „Deaktiviert“ und erhält keine Angebote mehr. Alle Daten bleiben erhalten.' : 'Das Mitglied wird wieder aktiv geführt.', ok: m.active ? 'Deaktivieren' : 'Reaktivieren', danger: m.active })) {
            await setMemberActive(m.id, !m.active); toast(m.active ? 'Mitglied deaktiviert.' : 'Mitglied reaktiviert.'); refresh();
          }
        } }, m.active ? 'Deaktivieren' : 'Reaktivieren'))),
    h('div', { class: 'grid-2' },
      card('Stammdaten', dl([['Name', `${m.salutation && m.salutation !== 'Keine Angabe' ? m.salutation + ' ' : ''}${m.firstName} ${m.lastName}`], ['Geburtsdatum', fmtDate(m.birthDate)],
        ['Adresse', `${m.street} ${m.houseNo}, ${m.zip} ${m.city}`], ['Telefon', h('a', { href: 'tel:' + m.phone.replace(/[^\d+]/g, '') }, m.phone)],
        ['E-Mail', h('a', { href: 'mailto:' + m.email }, m.email)], ['Notfallkontakt', m.emergencyName ? `${m.emergencyName} · ${m.emergencyPhone}` : null]])),
      c ? card('Mitgliedschaft', h('div', null, dl([['Mitgliedschaft', h('b', null, planLabel(c.membership))], ['Laufzeit', c.membership.autoRenew ? 'monatlich, verlängert sich automatisch' : `${c.membership.termMonths} Monate`],
        ['Startdatum', fmtDate(c.start)], ['Enddatum', fmtDate(c.end)], ['Preis', `${fmtEUR(c.price.monthly)} / Monat`],
        ['Zahlungsintervall', `${c.membership.interval} (${fmtEUR(c.price.intervalAmount)} je ${INTERVAL_TXT[c.membership.interval]})`], ['Kündigungsfrist', `${c.membership.noticeWeeks} Wochen`]]),
        h('div', { class: 'field inline' }, h('label', null, 'Vertragsstatus'), statusSel))) : card('Mitgliedschaft', empty('Kein Vertrag', 'Für dieses Mitglied gibt es keinen Vertrag.'))),
    c ? h('div', { class: 'grid-2' },
      card('Gewählte Leistungen', c.addons.length ? h('ul', { class: 'tick-list' }, c.addons.map((/** @type {any} */ a) => h('li', null, icon('check', 18), h('span', { class: 'grow' }, a.name), h('span', { class: 'muted' }, fmtEUR(a.price) + (a.billing === 'monatlich' ? ' / Monat' : ' einmalig')))))
        : h('p', { class: 'muted' }, 'Keine Zusatzleistungen gebucht.')),
      card('Zahlungsinformationen', dl([['Zahlungsart', PAY[c.payment.method]], ['IBAN', c.payment.iban ? h('span', { class: 'iban-row' }, ibanEl, ibanBtn) : null], ['Kontoinhaber', c.payment.holder || null]]))) : null,
    c ? card('Vertrag', h('div', { class: 'grid-2 tight' }, h('div', null, dl([['Vertragsnummer', h('code', null, c.contractNo)], ['Abgeschlossen am', fmtDateTime(c.createdAt)]]),
      h('h3', { class: 'mini' }, 'Einverständniserklärungen'),
      h('ul', { class: 'consent-sum' }, cons.map((k) => h('li', { class: k.given && !k.revokedAt ? 'yes' : 'no' }, icon(k.given && !k.revokedAt ? 'check' : 'x', 18),
        h('span', null, k.label, k.revokedAt ? h('small', null, ` (widerrufen ${fmtDate(k.revokedAt)})`) : null)))),
      marketing?.given && !marketing.revokedAt ? h('button', { class: 'btn ghost sm', onclick: async () => {
        if (await confirmDialog({ title: 'Werbe-Einwilligung widerrufen?', text: 'Das Mitglied erhält danach keine Angebots-Mails mehr. Der Widerruf wird protokolliert.', ok: 'Widerrufen', danger: true })) { await revokeMarketing(m.id); toast('Widerruf gespeichert.'); refresh(); }
      } }, 'Werbe-Einwilligung widerrufen') : null),
      h('div', null, h('h3', { class: 'mini' }, 'Unterschrift'), sig ? h('figure', { class: 'sig-preview' }, h('img', { src: sig.dataUrl, alt: 'Unterschrift' }), h('figcaption', null, 'unterschrieben ' + fmtDateTime(sig.signedAt))) : h('p', { class: 'muted' }, '–'),
        h('a', { class: 'btn', href: '#/formulare/' + c.id }, icon('file', 18), 'Original-Formular öffnen'))),
      x.contracts.length > 1 ? h('span', { class: 'muted small' }, `+ ${x.contracts.length - 1} frühere Verträge`) : null) : null,
    h('div', { class: 'grid-2' },
      card('Aktivitäten', x.log.length ? h('ol', { class: 'timeline' }, x.log.map((a) => h('li', null, h('b', null, a.text), h('small', null, fmtDateTime(a.at))))) : empty('Keine Aktivitäten', '')),
      card('E-Mails', x.mails.length ? h('ul', { class: 'list' }, x.mails.map((ml) => h('li', null, h('div', { class: 'list-row' }, icon('mail', 18), h('span', { class: 'grow' }, h('b', null, ml.subject), h('small', null, `${fmtDateTime(ml.at)} · ${ml.status}`)))))) : h('p', { class: 'muted' }, 'Noch keine Angebote erhalten.'))));
}

/** @param {string} to @returns {Promise<string|null>} */
function askNote(to) {
  return new Promise((res) => {
    let done = false;
    const inp = /** @type {HTMLInputElement} */ (h('input', { placeholder: 'z. B. Kündigung per E-Mail eingegangen' }));
    const md = modal({ title: `Status auf „${to}“ ändern`, body: [h('p', { class: 'muted' }, 'Der Vertrag selbst bleibt unverändert. Die Änderung wird mit Zeitstempel protokolliert.'), h('div', { class: 'field' }, h('label', null, 'Notiz (optional)'), inp)],
      onClose: () => { if (!done) res(null); },
      actions: [h('button', { class: 'btn', onclick: () => md.close() }, 'Abbrechen'), h('button', { class: 'btn primary', onclick: () => { done = true; md.close(); res(inp.value.trim()); } }, 'Status ändern')] });
  });
}
