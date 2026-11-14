// @ts-check
/* Abgeschlossene Formulare: Liste + schreibgeschützte Originalansicht mit Prüfsumme. */
import { h, icon, pageHead, badge, fmtDate, fmtDateTime, empty, card, replace } from '../core/ui.js';
import { loadAll, contractState, getContractDetail } from '../services/data.js';
import { planLabel } from '../core/pricing.js';
import { contractView } from './contractview.js';

/** @param {{params:string[]}} ctx */
export async function render(ctx) {
  if (ctx.params[0]) return detail(ctx.params[0]);
  const d = await loadAll();
  const name = (/** @type {string} */ id) => { const m = d.members.find((x) => x.id === id); return m ? `${m.firstName} ${m.lastName}` : '–'; };
  const list = [...d.contracts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const body = h('div');
  const draw = (/** @type {string} */ q) => {
    const f = list.filter((c) => !q || `${name(c.memberId)} ${c.contractNo}`.toLowerCase().includes(q.toLowerCase()));
    replace(body, f.length ? h('table', { class: 'table rtable' }, h('thead', null, h('tr', null, ['Datum', 'Mitglied', 'Mitgliedschaft', 'Laufzeit', 'Vertrag', 'Status', ''].map((t) => h('th', null, t)))),
      h('tbody', null, f.map((c) => h('tr', { tabindex: '0', onclick: () => { location.hash = '#/formulare/' + c.id; }, onkeydown: (/** @type {KeyboardEvent} */ e) => { if (e.key === 'Enter') location.hash = '#/formulare/' + c.id; } },
        h('td', { 'data-label': 'Datum' }, fmtDate(c.createdAt)), h('td', { 'data-label': 'Mitglied', class: 'td-name' }, h('b', null, name(c.memberId))),
        h('td', { 'data-label': 'Mitgliedschaft' }, c.membership.name), h('td', { 'data-label': 'Laufzeit' }, c.membership.autoRenew ? 'Flex (monatlich)' : `${c.membership.termMonths} Monate`),
        h('td', { 'data-label': 'Vertrag' }, h('code', null, c.contractNo)), h('td', { 'data-label': 'Status' }, badge(contractState(c, d.settings.expiringDays))),
        h('td', { class: 'td-act' }, h('span', { class: 'icon-btn' }, icon('chevR', 20)))))))
      : empty('Keine Formulare', q ? 'Keine Treffer.' : 'Abgeschlossene Anmeldungen erscheinen hier automatisch.'));
  };
  draw('');
  return h('div', { class: 'page' }, pageHead('Abgeschlossene Formulare', `${list.length} vollständig abgeschlossene Anmeldungen · schreibgeschützt`),
    h('div', { class: 'toolbar' }, h('div', { class: 'search' }, icon('search', 20), h('input', { type: 'search', class: 'search-in', placeholder: 'Name oder Vertragsnummer', 'aria-label': 'Formulare suchen',
      oninput: (/** @type {Event} */ e) => draw(/** @type {HTMLInputElement} */ (e.target).value) }))),
    h('div', { class: 'card flush' }, body));
}

/** @param {string} id */
async function detail(id) {
  const x = await getContractDetail(id);
  if (!x) return empty('Formular nicht gefunden', '', h('a', { class: 'btn', href: '#/formulare' }, 'Zur Übersicht'));
  const { c, m, sig } = x;
  const snap = { ...c.snapshot, consents: c.snapshot.consents };
  return h('div', { class: 'page print-page' },
    h('a', { class: 'back no-print', href: '#/formulare' }, icon('chevL', 18), 'Formulare'),
    pageHead(`Anmeldeformular ${c.contractNo}`, `${m ? m.firstName + ' ' + m.lastName : ''} · abgeschlossen am ${fmtDateTime(c.createdAt)}`,
      [h('a', { class: 'btn big no-print', href: '#/mitglieder/' + c.memberId }, 'Zum Mitglied'), h('button', { class: 'btn big no-print', onclick: () => print() }, icon('print', 20), 'Drucken / PDF')]),
    h('div', { class: ['notice', x.intact ? 'ok' : 'warn'] }, icon(x.intact ? 'shield' : 'alert', 22),
      h('span', null, x.intact ? h('span', null, h('b', null, 'Original unverändert. '), 'Dieses Formular ist schreibgeschützt; die Prüfsumme (SHA-256) stimmt mit dem Stand bei Vertragsabschluss überein.')
        : h('span', null, h('b', null, 'Achtung: '), 'Die Prüfsumme stimmt nicht. Das Formular wurde nachträglich verändert.'))),
    card('', contractView(snap, { signature: sig?.dataUrl || null, showIban: false, meta: [['Vertragsnummer', h('code', null, c.contractNo)], ['Mitgliedsnummer', h('code', null, m?.memberNo || '–')],
      ['Abgeschlossen', fmtDateTime(c.createdAt)], ['Mitgliedschaft', planLabel(c.membership)], ['Prüfsumme', h('code', { class: 'hash' }, c.hash.slice(0, 16) + '…')]] })),
    c.notes?.length ? card('Spätere Statusänderungen (protokolliert)', h('ol', { class: 'timeline' }, c.notes.map((/** @type {any} */ n) => h('li', null, h('b', null, n.text), h('small', null, fmtDateTime(n.at)))))) : null);
}
