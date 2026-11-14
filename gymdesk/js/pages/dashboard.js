// @ts-check
import { h, icon, pageHead, card, fmtDate, fmtDateTime, fmtEUR, badge, empty } from '../core/ui.js';
import { loadAll, memberRows, offerState } from '../services/data.js';
import { planLabel } from '../core/pricing.js';

export async function render() {
  const d = await loadAll();
  const rows = memberRows(d);
  const active = rows.filter((r) => ['aktiv', 'auslaufend'].includes(r.state));
  const since = new Date(); since.setDate(since.getDate() - 30);
  const fresh = rows.filter((r) => new Date(r.m.createdAt) >= since);
  const expiring = rows.filter((r) => r.state === 'auslaufend');
  const offers = d.offers.filter((o) => ['entwurf', 'geplant'].includes(offerState(o)));
  const monthly = active.reduce((s, r) => s + (r.c?.price.monthly || 0), 0);

  /** @param {string} label @param {any} value @param {string} href @param {any} ic @param {string} tone @param {string} [sub] */
  const kpi = (label, value, href, ic, tone, sub) => h('a', { class: ['kpi', tone], href },
    h('span', { class: 'kpi-ico' }, icon(ic, 22)), h('span', { class: 'kpi-val' }, String(value)), h('span', { class: 'kpi-lbl' }, label),
    sub ? h('span', { class: 'kpi-sub' }, sub) : null, h('span', { class: 'kpi-go' }, icon('chevR', 18)));

  const recent = [...d.contracts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const name = (/** @type {string} */ id) => { const m = d.members.find((x) => x.id === id); return m ? `${m.firstName} ${m.lastName}` : '–'; };

  return h('div', { class: 'page' },
    pageHead('Dashboard', `${d.settings.name} · ${new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}`,
      h('a', { class: 'btn primary big', href: '#/anmeldung' }, icon('userPlus', 22), 'Neue Anmeldung')),
    h('div', { class: 'kpis' },
      kpi('Aktive Mitglieder', active.length, '#/mitglieder?f=aktiv', 'users', 'blue'),
      kpi('Neu (30 Tage)', fresh.length, '#/mitglieder?f=neu', 'userPlus', 'green'),
      kpi('Laufen aus', expiring.length, '#/mitglieder?f=auslaufend', 'clock', 'amber', `in den nächsten ${d.settings.expiringDays} Tagen`),
      kpi('Offene Angebote', offers.length, '#/angebote', 'mail', 'violet', 'Entwurf oder geplant'),
      kpi('Monatl. Beiträge', fmtEUR(monthly), '#/mitglieder?f=aktiv', 'trend', 'slate', 'Schätzung aktiver Verträge')),
    h('div', { class: 'grid-2' },
      card('Kürzlich abgeschlossene Anmeldungen', recent.length ? h('ul', { class: 'list' }, recent.map((c) =>
        h('li', null, h('a', { class: 'list-row', href: '#/formulare/' + c.id },
          h('span', { class: 'avatar' }, name(c.memberId).split(' ').map((x) => x[0]).join('').slice(0, 2)),
          h('span', { class: 'grow' }, h('b', null, name(c.memberId)), h('small', null, `${planLabel(c.membership)} · ${fmtDateTime(c.createdAt)}`)),
          icon('chevR', 18))))) : empty('Noch keine Anmeldungen', 'Starte mit „Neue Anmeldung“.'),
      h('a', { class: 'link', href: '#/formulare' }, 'Alle Formulare')),
      card('Laufen bald aus', expiring.length ? h('ul', { class: 'list' }, expiring.sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0)).slice(0, 6).map((r) =>
        h('li', null, h('a', { class: 'list-row', href: '#/mitglieder/' + r.m.id },
          h('span', { class: 'grow' }, h('b', null, `${r.m.firstName} ${r.m.lastName}`), h('small', null, `${planLabel(r.c.membership)} · endet ${fmtDate(r.c.end)}`)),
          h('span', { class: 'pill amber' }, `${r.daysLeft} Tage`))))) : empty('Alles im grünen Bereich', 'Keine Mitgliedschaft läuft demnächst aus.'),
      h('a', { class: 'link', href: '#/angebote/neu?vorlage=verlaengerung' }, 'Verlängerungsangebot erstellen'))),
    card('Angebote', d.offers.length ? h('ul', { class: 'list' }, d.offers.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4).map((o) =>
      h('li', null, h('a', { class: 'list-row', href: '#/angebote/' + o.id }, h('span', { class: 'grow' }, h('b', null, o.name),
        h('small', null, o.sentAt ? `versendet am ${fmtDate(o.sentAt)} an ${o.recipientCount}` : `gültig bis ${fmtDate(o.validUntil)}`)), badge(offerState(o)))))) : empty('Keine Angebote', 'Lege dein erstes Angebot an.')));
}
