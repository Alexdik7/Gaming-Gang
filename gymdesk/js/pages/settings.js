// @ts-check
/* Einstellungen: Gym-Daten, Mitgliedschaften, Leistungen, Vertragstexte, E-Mail, Sicherheit & Daten. */
import { h, icon, pageHead, card, field, showErrors, toast, confirmDialog, modal, fmtEUR, badge, replace } from '../core/ui.js';
import { getSettings, saveSettings, getPlans, getAddons, savePlan, saveAddon } from '../services/data.js';
import { validate, R } from '../core/validate.js';
import { planLabel, parseMoney, INTERVALS } from '../core/pricing.js';
import { INTERVAL_TXT } from './contractview.js';
import * as auth from '../core/auth.js';
import * as db from '../core/db.js';

const TABS = [['gym', 'Gym-Daten'], ['plans', 'Mitgliedschaften'], ['addons', 'Leistungen & Preise'], ['legal', 'Vertragstexte'], ['mail', 'E-Mail'], ['security', 'Sicherheit & Daten']];

/** @param {{query:Record<string,string>, refresh:()=>void}} ctx */
export async function render(ctx) {
  const tab = ctx.query.tab || 'gym';
  const s = await getSettings();
  const content = await (/** @type {Record<string, (s:any, r:()=>void)=>Promise<any>>} */ ({ gym: gymTab, plans: plansTab, addons: addonsTab, legal: legalTab, mail: mailTab, security: securityTab }))[tab]?.(s, ctx.refresh) ?? h('div');
  return h('div', { class: 'page' }, pageHead('Einstellungen', 'Alles, was sich für dein Gym ändern lässt – ohne Code.'),
    h('div', { class: 'tabs', role: 'tablist' }, TABS.map(([k, l]) => h('a', { role: 'tab', class: ['tab', tab === k && 'on'], 'aria-selected': String(tab === k), href: '#/einstellungen?tab=' + k }, l))),
    content);
}

/** @param {any} s */
async function gymTab(s) {
  const v = { ...s };
  /** @param {string} n @param {string} l @param {any} [o] */
  const F = (n, l, o = {}) => field({ name: n, label: l, value: v[n], onInput: (x) => { v[n] = x; }, ...o });
  const logoImg = h('div', { class: 'logo-prev' }, v.logo ? h('img', { src: v.logo, alt: 'Logo' }) : icon('dumbbell', 32));
  const file = /** @type {HTMLInputElement} */ (h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', class: 'visually-hidden', id: 'logo-in' }));
  file.addEventListener('change', async () => {
    const f = file.files?.[0]; if (!f) return;
    if (f.size > 5e6) { toast('Bild ist zu groß (max. 5 MB).', 'err'); return; }
    v.logo = await shrink(f, 256);
    replace(logoImg, h('img', { src: v.logo, alt: 'Logo' }));
  });
  const form = h('div', { class: 'form-grid' },
    h('div', { class: 'field wide logo-row' }, logoImg, h('div', null, h('label', { class: 'btn', for: 'logo-in' }, icon('upload', 18), 'Logo hochladen'), file,
      v.logo ? h('button', { class: 'btn ghost', type: 'button', onclick: () => { v.logo = null; replace(logoImg, icon('dumbbell', 32)); } }, 'Entfernen') : null)),
    F('name', 'Name des Gyms', { required: true }), F('website', 'Website', { type: 'url' }),
    F('street', 'Straße und Hausnummer'), F('zip', 'PLZ', { inputmode: 'numeric' }), F('city', 'Ort'), F('phone', 'Telefon', { type: 'tel' }), F('email', 'E-Mail', { type: 'email' }),
    F('hours', 'Öffnungszeiten', { type: 'textarea', rows: 3, wide: true }),
    F('expiringDays', '„Läuft aus“ ab Restlaufzeit (Tage)', { inputmode: 'numeric' }), F('autoLockMin', 'Automatische Sperre nach (Minuten)', { inputmode: 'numeric' }));
  return card('Gym-Daten', h('div', null, form, h('div', { class: 'form-foot' }, h('button', { class: 'btn primary big', onclick: async () => {
    const e = validate(v, { name: ['required'], email: ['email'], phone: ['phone'], zip: ['zip'], expiringDays: [(x) => (/^\d{1,3}$/.test(String(x)) ? null : 'Bitte Zahl eingeben.')], autoLockMin: [(x) => (/^\d{1,3}$/.test(String(x)) && +x >= 1 ? null : 'Mindestens 1 Minute.')] });
    if (Object.keys(e).length) { showErrors(form, e); return; }
    v.expiringDays = +v.expiringDays; v.autoLockMin = +v.autoLockMin;
    await saveSettings(v); auth.setTimeoutMinutes(v.autoLockMin); toast('Gym-Daten gespeichert.');
    setTimeout(() => location.reload(), 600);
  } }, 'Speichern'))));
}

/** Bild verkleinern (Logo) @param {File} f @param {number} max */
function shrink(f, max) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      /** @type {CanvasRenderingContext2D} */ (c.getContext('2d')).drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src); res(c.toDataURL('image/png'));
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(f);
  });
}

/** Generische Liste mit Bearbeiten/Deaktivieren @param {string} title @param {any[]} items @param {(x:any)=>any} line @param {(x:any|null)=>void} edit @param {(x:any)=>Promise<void>} save @param {string} addLabel */
function listCard(title, items, line, edit, save, addLabel) {
  return card(title, items.length ? h('ul', { class: 'list' }, items.map((x) => h('li', { class: !x.active ? 'inactive' : '' }, h('div', { class: 'list-row' },
    h('span', { class: 'grow' }, line(x)), x.active ? null : badge('deaktiviert'),
    h('button', { class: 'btn ghost sm', onclick: () => edit(x) }, icon('pen', 16), 'Bearbeiten'),
    h('button', { class: 'btn ghost sm', onclick: async () => { await save({ ...x, active: !x.active }); toast(x.active ? 'Deaktiviert – erscheint nicht mehr in neuen Anmeldungen.' : 'Wieder aktiv.'); } }, x.active ? 'Deaktivieren' : 'Aktivieren'))))) : h('p', { class: 'muted' }, 'Noch keine Einträge.'),
  h('button', { class: 'btn primary', onclick: () => edit(null) }, icon('plus', 18), addLabel));
}

/** @param {any} _s @param {()=>void} refresh */
async function plansTab(_s, refresh) {
  const plans = await getPlans();
  /** @param {any|null} p */
  const edit = (p) => {
    const v = p ? { ...p, price: String(p.price).replace('.', ','), setupFee: String(p.setupFee || 0).replace('.', ',') } :
      { name: '', category: '', termMonths: '12', minTermMonths: '12', price: '', interval: 'monatlich', setupFee: '0', noticeWeeks: '4', autoRenew: false, description: '', active: true };
    /** @param {string} n @param {string} l @param {any} [o] */
    const F = (n, l, o = {}) => field({ name: n, label: l, value: v[n], onInput: (x) => { v[n] = x; }, ...o });
    const auto = /** @type {HTMLInputElement} */ (h('input', { type: 'checkbox', checked: !!v.autoRenew }));
    const form = h('div', { class: 'form-grid' }, F('name', 'Name', { required: true, placeholder: 'z. B. Premium' }), F('category', 'Kategorie (für Filter)', { placeholder: 'Basic / Premium / Flex' }),
      F('price', 'Preis (€)', { required: true, inputmode: 'decimal' }), F('interval', 'Zahlungsintervall', { type: 'select', options: Object.keys(INTERVALS).map((k) => [k, k]) }),
      F('termMonths', 'Laufzeit (Monate)', { required: true, inputmode: 'numeric' }), F('minTermMonths', 'Mindestlaufzeit (Monate)', { inputmode: 'numeric' }),
      F('noticeWeeks', 'Kündigungsfrist (Wochen)', { inputmode: 'numeric' }), F('setupFee', 'Anmeldegebühr einmalig (€)', { inputmode: 'decimal' }),
      F('description', 'Beschreibung', { type: 'textarea', rows: 2, wide: true }),
      h('label', { class: 'check-row wide' }, auto, h('span', null, h('b', null, 'Verlängert sich automatisch (Flex)'), h('small', null, 'Vertrag läuft monatlich weiter statt auszulaufen.'))));
    const num = (/** @type {any} */ x) => (/^\d{1,3}$/.test(String(x)) ? null : 'Bitte ganze Zahl eingeben.');
    const md = modal({ title: p ? 'Mitgliedschaft bearbeiten' : 'Neue Mitgliedschaft', wide: true, body: [form, h('p', { class: 'muted small' }, 'Änderungen gelten nur für neue Anmeldungen. Bestehende Verträge behalten ihre Konditionen.')],
      actions: [h('button', { class: 'btn', onclick: () => md.close() }, 'Abbrechen'), h('button', { class: 'btn primary', onclick: async () => {
        const e = validate(v, { name: ['required'], price: ['required', 'money'], setupFee: ['money'], termMonths: ['required', num], minTermMonths: [num], noticeWeeks: [num] });
        if (Object.keys(e).length) { showErrors(form, e); return; }
        await savePlan({ ...v, price: parseMoney(v.price), setupFee: parseMoney(v.setupFee), termMonths: +v.termMonths, minTermMonths: +v.minTermMonths || +v.termMonths, noticeWeeks: +v.noticeWeeks || 0, autoRenew: auto.checked, sort: v.sort ?? 99 });
        md.close(); toast('Mitgliedschaft gespeichert.'); refresh();
      } }, 'Speichern')] });
  };
  return listCard('Mitgliedschaften', plans, (p) => h('span', { class: 'stack' }, h('b', null, planLabel(p)), h('small', { class: 'muted' }, `${fmtEUR(p.price)} / ${INTERVAL_TXT[p.interval]} · Mindestlaufzeit ${p.minTermMonths} M. · Kündigung ${p.noticeWeeks} Wo. · Anmeldegebühr ${fmtEUR(p.setupFee || 0)}`)),
    edit, async (x) => { await savePlan(x); refresh(); }, 'Mitgliedschaft anlegen');
}

/** @param {any} _s @param {()=>void} refresh */
async function addonsTab(_s, refresh) {
  const addons = await getAddons();
  /** @param {any|null} a */
  const edit = (a) => {
    const v = a ? { ...a, price: String(a.price).replace('.', ',') } : { name: '', price: '', billing: 'monatlich', description: '', active: true };
    /** @param {string} n @param {string} l @param {any} [o] */
    const F = (n, l, o = {}) => field({ name: n, label: l, value: v[n], onInput: (x) => { v[n] = x; }, ...o });
    const form = h('div', { class: 'form-grid' }, F('name', 'Name', { required: true }), F('price', 'Preis (€)', { required: true, inputmode: 'decimal' }),
      F('billing', 'Abrechnung', { type: 'select', options: [['monatlich', 'monatlich'], ['einmalig', 'einmalig']] }), F('description', 'Beschreibung', { wide: true }));
    const md = modal({ title: a ? 'Leistung bearbeiten' : 'Neue Leistung', wide: true, body: form,
      actions: [h('button', { class: 'btn', onclick: () => md.close() }, 'Abbrechen'), h('button', { class: 'btn primary', onclick: async () => {
        const e = validate(v, { name: ['required'], price: ['required', 'money'] });
        if (Object.keys(e).length) { showErrors(form, e); return; }
        await saveAddon({ ...v, price: parseMoney(v.price), sort: v.sort ?? 99 }); md.close(); toast('Leistung gespeichert.'); refresh();
      } }, 'Speichern')] });
  };
  return listCard('Zusatzleistungen & Preise', addons, (a) => h('span', { class: 'stack' }, h('b', null, a.name), h('small', { class: 'muted' }, `${fmtEUR(a.price)} ${a.billing === 'monatlich' ? 'pro Monat' : 'einmalig'} · ${a.description || ''}`)),
    edit, async (x) => { await saveAddon(x); refresh(); }, 'Leistung anlegen');
}

/** @param {any} s */
async function legalTab(s) {
  const v = { ...s.legal };
  const names = [['agb', 'AGB'], ['datenschutz', 'Datenschutzerklärung'], ['hausordnung', 'Hausordnung'], ['sepa', 'SEPA-Lastschriftmandat'], ['kontakt', 'Einwilligung Kontakt per E-Mail'], ['werbung', 'Einwilligung Werbung'], ['sonstiges', 'Sonstige Vereinbarungen']];
  return card('Vertragstexte', h('div', null, h('div', { class: 'notice' }, icon('info', 22), h('span', null, 'Hier die echten Texte deines Gyms einfügen (am besten rechtlich prüfen lassen). Bei jeder Anmeldung wird der aktuelle Text mit der Zustimmung gespeichert – spätere Änderungen verändern alte Verträge nicht.')),
    names.map(([k, l]) => field({ name: k, label: l, type: 'textarea', rows: 4, value: v[k], wide: true, onInput: (x) => { v[k] = x; } })),
    h('div', { class: 'form-foot' }, h('button', { class: 'btn primary big', onclick: async () => { await saveSettings({ ...s, legal: v }); toast('Vertragstexte gespeichert.'); } }, 'Speichern'))));
}

/** @param {any} s */
async function mailTab(s) {
  const v = { ...s.mail };
  return card('E-Mail-Versand', h('div', null,
    h('div', { class: 'notice ok' }, icon('shield', 22), h('span', null, h('b', null, 'Aktiv: Testversand (Mock). '), 'Mails werden vollständig erzeugt und im Postausgang gespeichert, aber nicht verschickt.')),
    h('div', { class: 'form-grid' }, field({ name: 'fromName', label: 'Absendername', value: v.fromName, onInput: (x) => { v.fromName = x; } }), field({ name: 'from', label: 'Absenderadresse', type: 'email', value: v.from, onInput: (x) => { v.from = x; } })),
    h('p', { class: 'muted' }, 'Echter Versand (SMTP, Resend, SendGrid, Amazon SES …) braucht ein kleines Backend, das die Zugangsdaten sicher verwahrt. Die App ist dafür vorbereitet (EmailService → HttpApiProvider), siehe docs/ARCHITEKTUR.md.'),
    h('div', { class: 'form-foot' }, h('button', { class: 'btn primary big', onclick: async () => { await saveSettings({ ...s, mail: { ...v, mode: 'mock' } }); toast('Gespeichert.'); } }, 'Speichern'))));
}

/** @param {any} s */
async function securityTab(s) {
  const pw = { old: '', n1: '', n2: '' };
  const form = h('div', { class: 'form-grid' },
    field({ name: 'old', label: 'Aktuelles Passwort', type: 'password', autocomplete: 'current-password', onInput: (x) => { pw.old = x; } }), h('div'),
    field({ name: 'n1', label: 'Neues Passwort', type: 'password', autocomplete: 'new-password', onInput: (x) => { pw.n1 = x; } }),
    field({ name: 'n2', label: 'Neues Passwort wiederholen', type: 'password', autocomplete: 'new-password', onInput: (x) => { pw.n2 = x; } }));
  const imp = /** @type {HTMLInputElement} */ (h('input', { type: 'file', accept: 'application/json', class: 'visually-hidden', id: 'imp' }));
  imp.addEventListener('change', async () => {
    const f = imp.files?.[0]; if (!f) return;
    if (!(await confirmDialog({ title: 'Sicherung einspielen?', text: 'Alle aktuellen Daten auf diesem Gerät werden ersetzt. Danach mit dem Passwort der Sicherung entsperren.', ok: 'Einspielen', danger: true }))) return;
    try { await db.restore(JSON.parse(await f.text())); toast('Sicherung eingespielt.'); auth.lock(); } catch (e) { toast('Import fehlgeschlagen: ' + /** @type {Error} */ (e).message, 'err'); }
  });
  return h('div', null,
    card('Passwort ändern', h('div', null, form, h('div', { class: 'form-foot' }, h('button', { class: 'btn primary', onclick: async () => {
      const prob = auth.passwordProblem(pw.n1);
      const e = { ...(prob ? { n1: prob } : {}), ...(pw.n1 !== pw.n2 ? { n2: 'Die Passwörter stimmen nicht überein.' } : {}) };
      if (Object.keys(e).length) { showErrors(form, e); return; }
      try { await auth.changePassword(pw.old, pw.n1); toast('Passwort geändert.'); form.querySelectorAll('input').forEach((i) => { i.value = ''; }); }
      catch (x) { showErrors(form, { old: /** @type {Error} */ (x).message }); }
    } }, 'Passwort ändern')))),
    card('Datenschutz & Sicherheit', h('ul', { class: 'tick-list' }, [
      'Alle Daten liegen verschlüsselt (AES-256-GCM) nur auf diesem Gerät.',
      'Das Passwort wird nie gespeichert – nur ein daraus abgeleiteter Schlüssel (PBKDF2, 310.000 Runden).',
      `Automatische Sperre nach ${s.autoLockMin} Minuten ohne Bedienung; nach 5 Fehlversuchen Wartezeit.`,
      'IBANs erscheinen nur maskiert und werden nicht protokolliert.',
      'Strenge Content-Security-Policy: keine fremden Skripte, keine Tracker.',
    ].map((t) => h('li', null, icon('check', 18), h('span', null, t)))),
    h('button', { class: 'btn', onclick: () => auth.lock() }, icon('lock', 18), 'Jetzt sperren')),
    card('Sicherung', h('div', null, h('p', { class: 'muted' }, 'Die Sicherung bleibt verschlüsselt und lässt sich nur mit deinem Passwort öffnen. Bitte regelmäßig sichern – wird Safari-Websitedaten gelöscht, sind sonst alle Daten weg.'),
      h('div', { class: 'row-btns' }, h('button', { class: 'btn primary', onclick: async () => {
        const blob = new Blob([JSON.stringify(await db.dump())], { type: 'application/json' });
        const a = h('a', { href: URL.createObjectURL(blob), download: `gymdesk-sicherung-${new Date().toISOString().slice(0, 10)}.json` });
        document.body.appendChild(a); a.click(); a.remove();
        toast('Sicherung erstellt.');
      } }, icon('download', 18), 'Sicherung herunterladen'), h('label', { class: 'btn', for: 'imp' }, icon('upload', 18), 'Sicherung einspielen'), imp))),
    card('Alles zurücksetzen', h('div', null, h('p', { class: 'muted' }, 'Löscht alle Mitglieder, Verträge, Angebote und Einstellungen auf diesem Gerät. Danach wird die App neu eingerichtet (z. B. ohne Testdaten).'),
      h('button', { class: 'btn danger', onclick: async () => {
        if (!(await confirmDialog({ title: 'Wirklich alles löschen?', text: 'Das kann nicht rückgängig gemacht werden. Vorher eine Sicherung herunterladen!', ok: 'Endgültig löschen', danger: true }))) return;
        await db.wipe(); location.hash = ''; location.reload();
      } }, icon('trash', 18), 'Alle Daten löschen'))));
}
