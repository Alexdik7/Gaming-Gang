// @ts-check
/* Neue Anmeldung: 9 Schritte, Validierung je Schritt, verschlüsselter Entwurf, Verlassen-Schutz, Unterschrift. */
import { h, icon, field, showErrors, fmtEUR, fmtDate, fmtDateTime, toast, confirmDialog, debounce, today } from '../core/ui.js';
import { validate, personalSchema, membershipSchema, paymentSchema, fmtIban, cleanIban, ibanValid, ageOf } from '../core/validate.js';
import { calc, endDate, planLabel } from '../core/pricing.js';
import { loadAll, getDraft, saveDraft, dropDraft, completeSignup, applicableConsents } from '../services/data.js';
import { setGuard, go } from '../app.js';
import { signaturePad } from './signature.js';
import { contractView, PAY, INTERVAL_TXT } from './contractview.js';

const STEPS = ['Persönliche Daten', 'Mitgliedschaft', 'Zusatzleistungen', 'Zahlung', 'Einverständnisse', 'Zusammenfassung', 'Unterschrift', 'Abschluss', 'Bestätigung'];

const blank = () => ({
  personal: { salutation: '', firstName: '', lastName: '', birthDate: '', street: '', houseNo: '', zip: '', city: '', phone: '', email: '', emergencyName: '', emergencyPhone: '' },
  planId: '', start: today(), addonIds: /** @type {string[]} */ ([]), payment: { method: 'sepa', holder: '', iban: '', note: '' },
  consents: /** @type {Record<string, boolean>} */ ({}), signature: /** @type {string|null} */ (null), draftId: /** @type {string|null} */ (null),
});

export async function render() {
  const d = await loadAll();
  const plans = d.plans.filter((p) => p.active), addons = d.addons.filter((a) => a.active);
  let draft = await getDraft();
  let f = blank(), step = 0, dirty = false, saving = false, done = /** @type {any} */ (null);
  /** @type {ReturnType<typeof signaturePad>|null} */ let pad = null;

  const root = h('div', { class: 'page signup' });
  const persist = debounce(() => { if (dirty && step < 8) saveDraft({ ...f, step }).catch(() => {}); }, 600);
  setGuard(() => (dirty && step < 8 ? 'Das Formular ist noch nicht abgeschlossen. Möchtest du wirklich verlassen? Ein Entwurf bleibt gespeichert (ohne Unterschrift).' : null));
  const touch = () => { dirty = true; persist(); refreshAside(); };

  const plan = () => plans.find((p) => p.id === f.planId);
  const chosen = () => addons.filter((a) => f.addonIds.includes(a.id));
  const price = () => (plan() ? calc(/** @type {any} */ (plan()), chosen()) : null);
  const snapshot = () => ({ personal: f.personal, membership: plan(), addons: chosen(), start: f.start, end: endDate(f.start, plan()?.termMonths || 1), price: price(), payment: f.payment,
    consents: applicableConsents(d.settings, f).map((/** @type {any} */ c) => ({ ...c, given: !!f.consents[c.key] })) });

  /* ---------- Seitenaufbau ---------- */
  const aside = h('aside', { class: 'sum-aside' });
  function refreshAside() {
    const p = plan(), pr = price();
    aside.replaceChildren(h('h3', null, 'Deine Auswahl'),
      p ? h('div', null, h('p', { class: 'aside-plan' }, planLabel(p)),
        chosen().length ? h('ul', { class: 'aside-list' }, chosen().map((a) => h('li', null, a.name, h('span', null, fmtEUR(a.price) + (a.billing === 'einmalig' ? ' einm.' : ''))))) : h('p', { class: 'muted small' }, 'Keine Zusatzleistungen'),
        h('div', { class: 'aside-price' }, h('span', null, 'Monatlich'), h('b', null, fmtEUR(pr?.monthly || 0))),
        p.interval !== 'monatlich' ? h('div', { class: 'aside-row' }, h('span', null, `Je ${INTERVAL_TXT[p.interval]}`), h('b', null, fmtEUR(pr?.intervalAmount || 0))) : null,
        h('div', { class: 'aside-row' }, h('span', null, 'Einmalig'), h('b', null, fmtEUR(pr?.once || 0))))
        : h('p', { class: 'muted small' }, 'Noch keine Mitgliedschaft gewählt.'));
  }

  function draw() {
    pad?.destroy(); pad = null;
    const body = h('form', { class: 'step-body', novalidate: true, onsubmit: (/** @type {Event} */ e) => { e.preventDefault(); next(); } }, STEP_VIEWS[step]());
    const showAside = step >= 1 && step <= 4;
    if (showAside) refreshAside();
    root.replaceChildren(
      h('div', { class: 'signup-top' }, h('h1', null, step === 8 ? 'Geschafft!' : 'Neue Anmeldung'), step < 8 ? h('span', { class: 'step-count' }, `Schritt ${step + 1} von 9`) : null),
      stepper(),
      h('div', { class: ['signup-grid', showAside && 'with-aside'] }, h('div', { class: 'card step-card' }, h('h2', { class: 'step-title' }, STEPS[step]), body), showAside ? aside : null),
      step < 7 ? h('div', { class: 'step-foot' },
        step > 0 ? h('button', { class: 'btn big', type: 'button', onclick: back }, icon('chevL', 22), 'Zurück') : h('span'),
        h('button', { class: 'btn primary big', type: 'button', onclick: next }, step === 5 ? 'Weiter zur Unterschrift' : step === 6 ? 'Weiter zum Abschluss' : 'Weiter', icon('chevR', 22))) : null);
    if (step === 7 || step === 8) root.querySelector('.step-foot')?.remove();
    if (step === 1) updateEnd();
  }

  function stepper() {
    return h('ol', { class: 'stepper', 'aria-label': 'Fortschritt' }, STEPS.map((s, i) => h('li', { class: [i < step && 'done', i === step && 'now'], 'aria-current': i === step ? 'step' : null },
      h('span', { class: 'dot' }, i < step ? icon('check', 14) : String(i + 1)), h('span', { class: 'st-lbl' }, s))));
  }

  /** @param {number} s */
  const jump = (s) => { step = s; draw(); };
  function back() { if (step > 0) { step--; draw(); } }
  function next() {
    const errs = stepErrors();
    if (Object.keys(errs).length) { showErrors(root, errs); toast('Bitte die markierten Angaben prüfen.', 'err'); return; }
    if (step === 3 && f.payment.method === 'sepa') f.payment.iban = cleanIban(f.payment.iban);
    step++; draw(); persist();
  }
  function stepErrors() {
    if (step === 0) return validate(f.personal, personalSchema);
    if (step === 1) return validate(f, membershipSchema());
    if (step === 3) return validate(f.payment, paymentSchema);
    if (step === 4) {
      /** @type {Record<string,string>} */ const e = {};
      for (const c of applicableConsents(d.settings, f)) if (c.required && !f.consents[c.key]) e['consent_' + c.key] = 'Diese Zustimmung ist für die Anmeldung erforderlich.';
      return e;
    }
    if (step === 6 && !f.signature) return { signature: 'Bitte unterschreiben und auf „Unterschrift bestätigen“ tippen.' };
    return {};
  }

  /* ---------- Schritte ---------- */
  /** @param {string} name @param {string} label @param {Partial<Parameters<typeof field>[0]>} [o] */
  const pf = (name, label, o = {}) => field({ name, label, value: /** @type {any} */ (f.personal)[name], onInput: (v) => { /** @type {any} */ (f.personal)[name] = v; touch(); }, ...o });

  /** @param {string} name @param {string[][]} opts @param {string} value @param {(v:string)=>void} on @param {string} label */
  function segmented(name, opts, value, on, label) {
    const wrap = h('div', { class: 'field wide', dataset: { field: name } }, h('span', { class: 'lbl' }, label),
      h('div', { class: 'seg', role: 'radiogroup', 'aria-label': label }, opts.map(([v, l]) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(v === value), class: v === value ? 'on' : '',
        onclick: (/** @type {Event} */ e) => {
          wrap.querySelectorAll('.seg button').forEach((b) => { b.classList.remove('on'); b.setAttribute('aria-checked', 'false'); });
          const t = /** @type {HTMLElement} */ (e.currentTarget); t.classList.add('on'); t.setAttribute('aria-checked', 'true');
          wrap.classList.remove('invalid'); const er = wrap.querySelector('.err'); if (er) er.textContent = '';
          on(v);
        } }, l))),
      h('p', { class: 'err', role: 'alert' }));
    return wrap;
  }

  const STEP_VIEWS = [
    () => h('div', null,
      draft?.personal && !dirty ? h('div', { class: 'notice' }, icon('info', 22), h('div', { class: 'grow' }, h('b', null, 'Nicht abgeschlossener Entwurf gefunden'),
        h('small', null, `${draft.personal.firstName || '(ohne Namen)'} ${draft.personal.lastName || ''} · gespeichert ${fmtDateTime(draft.savedAt)}`)),
        h('button', { class: 'btn', type: 'button', onclick: async () => { await dropDraft(); draft = null; draw(); } }, 'Verwerfen'),
        h('button', { class: 'btn primary', type: 'button', onclick: () => { const { step: s, savedAt, id, ...rest } = draft; f = { ...blank(), ...rest, signature: null, draftId: 'signup' }; dirty = true; draft = null; step = Math.min(s || 0, 5); draw(); } }, 'Fortsetzen')) : null,
      h('div', { class: 'form-grid' },
        segmented('salutation', [['Frau', 'Frau'], ['Herr', 'Herr'], ['Divers', 'Divers'], ['Keine Angabe', 'Keine Angabe']], f.personal.salutation, (v) => { f.personal.salutation = v; touch(); }, 'Anrede *'),
        pf('firstName', 'Vorname', { required: true, autocomplete: 'given-name' }),
        pf('lastName', 'Nachname', { required: true, autocomplete: 'family-name' }),
        pf('birthDate', 'Geburtsdatum', { required: true, type: 'date', attrs: { max: today() }, autocomplete: 'bday' }),
        h('div'),
        pf('street', 'Straße', { required: true, autocomplete: 'address-line1' }),
        pf('houseNo', 'Hausnummer', { required: true }),
        pf('zip', 'PLZ', { required: true, inputmode: 'numeric', autocomplete: 'postal-code', attrs: { maxlength: 5 } }),
        pf('city', 'Ort', { required: true, autocomplete: 'address-level2' }),
        pf('phone', 'Telefonnummer', { required: true, type: 'tel', inputmode: 'tel', autocomplete: 'tel' }),
        pf('email', 'E-Mail-Adresse', { required: true, type: 'email', inputmode: 'email', autocomplete: 'email', attrs: { autocapitalize: 'off', spellcheck: 'false' } }),
        h('h3', { class: 'sub-title wide' }, 'Notfallkontakt ', h('small', null, '(optional)')),
        pf('emergencyName', 'Name Notfallkontakt'),
        pf('emergencyPhone', 'Telefon Notfallkontakt', { type: 'tel', inputmode: 'tel' }))),

    () => h('div', null,
      plans.length ? h('div', { class: 'choice-grid', dataset: { field: 'planId' }, role: 'radiogroup', 'aria-label': 'Mitgliedschaft' }, plans.map((p) => {
        const b = h('button', { type: 'button', role: 'radio', 'aria-checked': String(f.planId === p.id), class: ['choice', f.planId === p.id && 'on'], onclick: () => {
          f.planId = p.id; touch();
          b.parentElement?.querySelectorAll('.choice').forEach((x) => { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); });
          b.classList.add('on'); b.setAttribute('aria-checked', 'true'); b.parentElement?.classList.remove('invalid'); updateEnd();
        } },
        h('span', { class: 'choice-check' }, icon('check', 18)),
        h('span', { class: 'tagline' }, p.category || ''),
        h('b', { class: 'choice-name' }, planLabel(p)),
        h('span', { class: 'choice-price' }, fmtEUR(p.price), h('small', null, ' / ' + INTERVAL_TXT[p.interval])),
        h('span', { class: 'choice-desc' }, p.description || ''),
        h('span', { class: 'choice-meta' }, `Mindestlaufzeit ${p.minTermMonths} M. · Kündigung ${p.noticeWeeks} Wo.${p.setupFee ? ' · Anmeldegebühr ' + fmtEUR(p.setupFee) : ''}`));
        return b;
      }), h('p', { class: 'err wide', role: 'alert' })) : h('p', { class: 'notice' }, 'Es sind keine Mitgliedschaften angelegt. Bitte unter Einstellungen → Mitgliedschaften anlegen.'),
      h('div', { class: 'form-grid' }, field({ name: 'start', label: 'Vertragsbeginn', type: 'date', required: true, value: f.start, onInput: (v) => { f.start = v; touch(); updateEnd(); } }),
        h('div', { class: 'end-info', id: 'end-info' }))),

    () => h('div', null, h('p', { class: 'muted' }, 'Mehrere Leistungen möglich. Tippe zum An- und Abwählen.'),
      addons.length ? h('div', { class: 'choice-grid', role: 'group', 'aria-label': 'Zusatzleistungen' }, addons.map((a) => {
        const on = f.addonIds.includes(a.id);
        const b = h('button', { type: 'button', role: 'checkbox', 'aria-checked': String(on), class: ['choice small', on && 'on'], onclick: () => {
          const has = f.addonIds.includes(a.id);
          f.addonIds = has ? f.addonIds.filter((x) => x !== a.id) : [...f.addonIds, a.id];
          b.classList.toggle('on', !has); b.setAttribute('aria-checked', String(!has)); touch();
        } }, h('span', { class: 'choice-check' }, icon('check', 18)), h('b', { class: 'choice-name' }, a.name),
        h('span', { class: 'choice-price' }, fmtEUR(a.price), h('small', null, a.billing === 'monatlich' ? ' / Monat' : ' einmalig')),
        h('span', { class: 'choice-desc' }, a.description || ''));
        return b;
      })) : h('p', { class: 'muted' }, 'Keine Zusatzleistungen angelegt.')),

    () => {
      if (!f.payment.holder && f.personal.firstName) f.payment.holder = `${f.personal.firstName} ${f.personal.lastName}`.trim();
      const sepa = h('div', { class: 'form-grid' });
      const drawSepa = () => {
        sepa.replaceChildren();
        if (f.payment.method === 'sepa') {
          const ibanField = field({ name: 'iban', label: 'IBAN', required: true, value: fmtIban(f.payment.iban), placeholder: 'DE00 0000 0000 0000 0000 00', autocomplete: 'off',
            attrs: { autocapitalize: 'characters', spellcheck: 'false', maxlength: 42 }, hint: 'Wird verschlüsselt gespeichert und später nur maskiert angezeigt.',
            onInput: (v) => { f.payment.iban = cleanIban(v); touch(); ok.textContent = ibanValid(v) ? '✓ IBAN gültig' : ''; } });
          const inp = /** @type {HTMLInputElement} */ (ibanField.querySelector('input'));
          inp.addEventListener('blur', () => { inp.value = fmtIban(inp.value); });
          const ok = h('span', { class: 'ok-note' }, ibanValid(f.payment.iban) ? '✓ IBAN gültig' : '');
          ibanField.appendChild(ok);
          sepa.append(field({ name: 'holder', label: 'Kontoinhaber', required: true, value: f.payment.holder, autocomplete: 'name', onInput: (v) => { f.payment.holder = v; touch(); } }), ibanField);
        } else {
          sepa.append(h('div', { class: 'notice wide' }, icon('info', 22), h('span', null, f.payment.method === 'bar' ? 'Barzahlung an der Theke. Es werden keine Bankdaten gespeichert.' :
            f.payment.method === 'ueberweisung' ? 'Das Mitglied überweist selbst. Die Bankverbindung des Gyms steht später in den Vertragsunterlagen (Platzhalter).' : 'Bitte kurz beschreiben, wie gezahlt wird.')),
          f.payment.method === 'sonstige' ? field({ name: 'note', label: 'Hinweis zur Zahlung', value: f.payment.note, wide: true, onInput: (v) => { f.payment.note = v; touch(); } }) : null);
        }
      };
      drawSepa();
      return h('div', null, h('div', { class: 'form-grid' }, segmented('method', Object.entries(PAY), f.payment.method, (v) => { f.payment.method = v; touch(); drawSepa(); }, 'Zahlungsart *')), sepa);
    },

    () => h('div', null, h('p', { class: 'muted' }, 'Bitte jede Erklärung einzeln bestätigen. Mit * markierte Punkte sind für die Anmeldung erforderlich.'),
      h('div', { class: 'consents' }, applicableConsents(d.settings, f).map((/** @type {any} */ c) => {
        const text = h('div', { class: 'legal-text', hidden: true }, d.settings.legal[c.text] || '[Platzhalter]');
        const cb = h('input', { type: 'checkbox', checked: !!f.consents[c.key], onchange: (/** @type {Event} */ e) => {
          f.consents[c.key] = /** @type {HTMLInputElement} */ (e.target).checked; touch(); wrap.classList.remove('invalid'); const er = wrap.querySelector('.err'); if (er) er.textContent = '';
        } });
        const wrap = h('div', { class: 'consent', dataset: { field: 'consent_' + c.key } },
          h('label', { class: 'check-row' }, cb, h('span', null, h('b', null, c.label, c.required ? h('span', { class: 'req' }, ' *') : h('small', { class: 'opt' }, ' optional')))),
          h('button', { type: 'button', class: 'btn ghost sm', 'aria-expanded': 'false', onclick: (/** @type {Event} */ e) => {
            text.hidden = !text.hidden; /** @type {HTMLElement} */ (e.currentTarget).setAttribute('aria-expanded', String(!text.hidden));
          } }, icon('file', 16), 'Text anzeigen'), text, h('p', { class: 'err', role: 'alert' }));
        return wrap;
      }))),

    () => h('div', null, h('p', { class: 'muted' }, 'Bitte alle Angaben gemeinsam mit dem Mitglied prüfen. Danach unterschreibt das Mitglied auf dem iPad.'),
      contractView(snapshot(), { onEdit: jump, showIban: true })),

    () => {
      const minor = ageOf(f.personal.birthDate) < 18;
      const status = h('p', { class: 'err', role: 'alert' });
      const confirmBtn = h('button', { type: 'button', class: 'btn primary big', disabled: true, onclick: () => {
        if (!pad || pad.isEmpty()) { status.textContent = 'Die Unterschrift ist zu kurz. Bitte vollständig unterschreiben.'; return; }
        f.signature = pad.toDataURL(); dirty = true; draw();
        toast('Unterschrift bestätigt.');
      } }, icon('check', 22), 'Unterschrift bestätigen');
      const area = h('div', { class: 'sig-area', dataset: { field: 'signature' } });
      if (f.signature) {
        area.append(h('figure', { class: 'sig-preview big' }, h('img', { src: f.signature, alt: 'Bestätigte Unterschrift' }), h('figcaption', null, icon('check', 18), 'Unterschrift bestätigt')),
          h('div', { class: 'row-btns' }, h('button', { type: 'button', class: 'btn big', onclick: () => { f.signature = null; draw(); } }, icon('pen', 20), 'Neu unterschreiben')));
      } else {
        pad = signaturePad({ onChange: (empty) => { confirmBtn.toggleAttribute('disabled', empty); status.textContent = ''; } });
        area.append(pad.el, h('div', { class: 'row-btns' },
          h('button', { type: 'button', class: 'btn big', onclick: () => pad?.clear() }, icon('trash', 20), 'Unterschrift löschen'), confirmBtn), status);
      }
      const p = plan();
      return h('div', null,
        h('div', { class: 'sig-intro' }, h('p', null, `Ich, ${f.personal.firstName} ${f.personal.lastName}, beantrage die Mitgliedschaft „${p ? planLabel(p) : ''}“ ab ${fmtDate(f.start)} zu ${fmtEUR(price()?.monthly || 0)} monatlich und bestätige die Richtigkeit meiner Angaben.`),
          h('p', { class: 'muted small' }, `${d.settings.city || 'Ort'}, ${fmtDate(today())}`),
          minor ? h('div', { class: 'notice warn' }, icon('alert', 22), h('span', null, 'Das Mitglied ist minderjährig. Bitte zusätzlich die Unterschrift eines Erziehungsberechtigten einholen (Annahme – rechtlich prüfen lassen).')) : null),
        area);
    },

    () => {
      const btn = h('button', { type: 'button', class: 'btn success huge', onclick: finish }, icon('check', 24), 'Anmeldung verbindlich abschließen');
      return h('div', null, contractView(snapshot(), { signature: f.signature, onEdit: jump }),
        h('div', { class: 'final-bar' }, h('button', { type: 'button', class: 'btn big', onclick: back }, icon('chevL', 22), 'Zurück'), btn));
    },

    () => h('div', { class: 'success-box' }, h('div', { class: 'success-ico' }, icon('check', 56)),
      h('h2', null, 'Mitgliedschaft erfolgreich abgeschlossen.'),
      h('p', null, `${done.member.firstName} ${done.member.lastName} ist jetzt Mitglied.`),
      h('div', { class: 'ids' }, h('div', null, h('small', null, 'Mitgliedsnummer'), h('b', null, done.member.memberNo)), h('div', null, h('small', null, 'Vertragsnummer'), h('b', null, done.contract.contractNo))),
      h('div', { class: 'row-btns center' },
        h('button', { type: 'button', class: 'btn primary huge', onclick: () => { f = blank(); step = 0; dirty = false; done = null; draft = null; draw(); } }, icon('userPlus', 24), 'Nächste Anmeldung'),
        h('a', { class: 'btn big', href: '#/mitglieder/' + done.member.id }, 'Mitglied öffnen'),
        h('a', { class: 'btn big', href: '#/formulare/' + done.contract.id }, 'Formular ansehen'))),
  ];

  function updateEnd() {
    const el = root.querySelector('#end-info');
    const p = plan();
    if (!el) return;
    el.replaceChildren(p && f.start ? h('div', null, h('small', null, 'Vertragsende'), h('b', null, p.autoRenew ? `${fmtDate(endDate(f.start, 1))} · verlängert sich monatlich` : fmtDate(endDate(f.start, p.termMonths)))) : h('small', { class: 'muted' }, 'Vertragsende wird automatisch berechnet.'));
  }

  async function finish() {
    if (saving) return;
    const all = { ...f, draftId: 'signup' };
    saving = true;
    const btn = root.querySelector('.btn.success');
    btn?.setAttribute('disabled', ''); if (btn) btn.textContent = 'Wird gespeichert …';
    try {
      done = await completeSignup(all, d);
      dirty = false; step = 8; draw();
    } catch (e) {
      const errs = /** @type {any} */ (e).errors || {};
      const first = Object.keys(errs)[0] || '';
      toast(/** @type {Error} */ (e).message + (first ? ' ' + errs[first] : ''), 'err');
      if (first) step = first === 'signature' ? 6 : first.startsWith('consent_') ? 4 : ['planId', 'start'].includes(first) ? 1 : ['method', 'holder', 'iban'].includes(first) ? 3 : 0;
      draw(); if (first) showErrors(root, errs);
    } finally { saving = false; }
  }

  draw();
  return root;
}
export { go };
