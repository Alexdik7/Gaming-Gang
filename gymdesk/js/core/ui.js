// @ts-check
/* UI-Grundbausteine: sicherer DOM-Builder (kein innerHTML mit Nutzerdaten → XSS-Schutz),
   Icons, Formatierer, Felder, Toasts, Dialoge. */

const SVGNS = 'http://www.w3.org/2000/svg';

/**
 * Erzeugt ein Element. Texte werden immer als Textknoten eingefügt.
 * @param {string} tag
 * @param {Record<string, any>|null} [attrs]
 * @param {...any} kids
 * @returns {HTMLElement}
 */
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  setAttrs(el, attrs);
  append(el, kids);
  return el;
}

/** @param {Element} el @param {Record<string, any>|null|undefined} attrs */
function setAttrs(el, attrs) {
  if (!attrs) return;
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.setAttribute('class', Array.isArray(v) ? v.filter(Boolean).join(' ') : v);
    else if (k === 'style') Object.assign(/** @type {HTMLElement} */ (el).style, v);
    else if (k === 'dataset') Object.assign(/** @type {HTMLElement} */ (el).dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected') /** @type {any} */ (el)[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
}

/** @param {Node} el @param {any[]} kids */
export function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

/** @param {Element} el @param {...any} kids */
export function replace(el, ...kids) { el.replaceChildren(); append(el, kids); }

const ICONS = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  userPlus: 'M15 20c0-3.3-2.7-6-6-6s-6 2.7-6 6M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M16 11h6',
  users: 'M16 20c0-3.3-2.7-6-6-6s-6 2.7-6 6M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 20c0-2.6-1.6-4.6-4-5.5M15.5 3.3a4 4 0 0 1 0 7.4',
  file: 'M14 3H6v18h12V7zM14 3v4h4M9 12h6M9 16h6',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  sliders: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-4-4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  chevR: 'M9 6l6 6-6 6',
  chevL: 'M15 6l-6 6 6 6',
  pen: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  lock: 'M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  plus: 'M12 5v14M5 12h14',
  print: 'M6 9V3h12v6M6 17H4v-7h16v7h-2M7 14h10v7H7z',
  alert: 'M12 3l10 18H2zM12 10v4M12 17.5v.5',
  calendar: 'M4 5h16v16H4zM4 10h16M8 3v4M16 3v4',
  send: 'M3 11l18-8-8 18-2-8z',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  upload: 'M12 15V3M7 8l5-5 5 5M4 21h16',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
  dumbbell: 'M6 6v12M3 9v6M18 6v12M21 9v6M6 12h12',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6zM9 12l2 2 4-4',
  tag: 'M3 12V3h9l9 9-9 9zM7.5 7.5h.01',
  card: 'M3 6h18v12H3zM3 10h18M7 15h4',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 11v6M12 7.5v.5',
  film: 'M4 4h16v16H4zM8 4v16M16 4v16M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4',
};

/** @param {keyof typeof ICONS} name @param {number} [size] */
export function icon(name, size = 22) {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('width', String(size));
  s.setAttribute('height', String(size));
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', 'ico');
  const p = document.createElementNS(SVGNS, 'path');
  p.setAttribute('d', ICONS[name] || '');
  s.appendChild(p);
  return s;
}

/* ---------- Formatierung ---------- */
const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
/** @param {number} n */
export const fmtEUR = (n) => eur.format(Number(n) || 0);
/** @param {string|null|undefined} iso YYYY-MM-DD oder ISO-Zeitpunkt */
export function fmtDate(iso) {
  if (!iso) return '–';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}
/** @param {string|null|undefined} iso */
export function fmtDateTime(iso) {
  if (!iso) return '–';
  const d = new Date(iso);
  return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' Uhr';
}
/** Lokales Datum als YYYY-MM-DD @param {Date} [d] */
export function today(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
/** Tage von heute bis iso (negativ = vergangen) @param {string} iso */
export function daysUntil(iso) {
  const a = new Date(today() + 'T00:00:00'), b = new Date(iso.slice(0, 10) + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/* ---------- Formularfelder ---------- */
/**
 * @param {{label:string,name:string,type?:string,value?:any,required?:boolean,options?:[string,string][],
 *  hint?:string,placeholder?:string,inputmode?:string,autocomplete?:string,rows?:number,
 *  onInput?:(v:string)=>void,attrs?:Record<string,any>,wide?:boolean}} o
 */
export function field(o) {
  const id = 'f_' + o.name.replace(/\W/g, '_') + '_' + Math.random().toString(36).slice(2, 7);
  const common = {
    id, name: o.name, 'aria-describedby': id + '_err', autocomplete: o.autocomplete || 'off',
    placeholder: o.placeholder || null, inputmode: o.inputmode || null, required: o.required || null,
    ...(o.attrs || {}),
    oninput: (/** @type {Event} */ e) => {
      const t = /** @type {HTMLInputElement} */ (e.target);
      setError(wrap, null);
      o.onInput?.(t.value);
    },
  };
  let input;
  if (o.type === 'select') {
    input = h('select', { ...common, onchange: common.oninput },
      (o.options || []).map(([v, l]) => h('option', { value: v, selected: String(o.value ?? '') === v }, l)));
  } else if (o.type === 'textarea') {
    input = h('textarea', { ...common, rows: o.rows || 4 });
    /** @type {HTMLTextAreaElement} */ (input).value = o.value ?? '';
  } else {
    input = h('input', { ...common, type: o.type || 'text', value: o.value ?? '' });
  }
  const wrap = h('div', { class: ['field', o.wide && 'wide'], dataset: { field: o.name } },
    h('label', { for: id }, o.label, o.required ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null),
    input,
    o.hint ? h('p', { class: 'hint' }, o.hint) : null,
    h('p', { class: 'err', id: id + '_err', role: 'alert' }));
  return wrap;
}

/** @param {Element} wrap @param {string|null} msg */
export function setError(wrap, msg) {
  const err = wrap.querySelector('.err');
  const inp = wrap.querySelector('input,select,textarea');
  if (err) err.textContent = msg || '';
  wrap.classList.toggle('invalid', !!msg);
  if (inp) msg ? inp.setAttribute('aria-invalid', 'true') : inp.removeAttribute('aria-invalid');
}

/** Zeigt Fehler direkt an den Feldern und scrollt zum ersten. @param {Element} root @param {Record<string,string>} errors */
export function showErrors(root, errors) {
  root.querySelectorAll('[data-field]').forEach((w) => setError(w, errors[/** @type {HTMLElement} */ (w).dataset.field || ''] || null));
  const first = root.querySelector('.field.invalid, .invalid');
  if (first) {
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    /** @type {HTMLElement|null} */ (first.querySelector('input,select,textarea,button'))?.focus({ preventScroll: true });
  }
}

/* ---------- Badges ---------- */
export const STATUS = {
  entwurf: ['Entwurf', 'slate'], aktiv: ['Aktiv', 'green'], auslaufend: ['Läuft aus', 'amber'],
  pausiert: ['Pausiert', 'blue'], gekuendigt: ['Gekündigt', 'red'], abgelaufen: ['Abgelaufen', 'slate'],
  deaktiviert: ['Deaktiviert', 'slate'], geplant: ['Geplant', 'blue'], versendet: ['Versendet', 'green'],
};
/** @param {string} key */
export function badge(key) {
  const [l, c] = STATUS[/** @type {keyof typeof STATUS} */ (key)] || [key, 'slate'];
  return h('span', { class: ['badge', c] }, l);
}

/* ---------- Toast & Dialoge ---------- */
/** @param {string} msg @param {'ok'|'err'|'info'} [kind] */
export function toast(msg, kind = 'ok') {
  let box = document.getElementById('toasts');
  if (!box) { box = h('div', { id: 'toasts', 'aria-live': 'polite' }); document.body.appendChild(box); }
  const t = h('div', { class: ['toast', kind] }, icon(kind === 'err' ? 'alert' : kind === 'info' ? 'info' : 'check', 20), h('span', null, msg));
  box.appendChild(t);
  while (box.children.length > 3) box.firstChild?.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3200);
}

/**
 * Modal-Dialog. Gibt die Wurzel zurück; close() schließt.
 * @param {{title:string, body:any, actions?:any, wide?:boolean, onClose?:()=>void}} o
 */
export function modal(o) {
  const close = () => { back.remove(); document.removeEventListener('keydown', esc); o.onClose?.(); };
  const esc = (/** @type {KeyboardEvent} */ e) => { if (e.key === 'Escape') close(); };
  const back = h('div', { class: 'modal-back', onclick: (/** @type {Event} */ e) => { if (e.target === back) close(); } },
    h('div', { class: ['modal', o.wide && 'wide'], role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title },
      h('div', { class: 'modal-head' }, h('h2', null, o.title),
        h('button', { class: 'icon-btn', 'aria-label': 'Schließen', onclick: close }, icon('x'))),
      h('div', { class: 'modal-body' }, o.body),
      o.actions ? h('div', { class: 'modal-foot' }, o.actions) : null));
  document.body.appendChild(back);
  document.addEventListener('keydown', esc);
  setTimeout(() => /** @type {HTMLElement|null} */ (back.querySelector('.modal-body input, .modal-foot .btn.primary'))?.focus(), 30);
  return { root: back, close };
}

/**
 * Bestätigungsdialog als Promise.
 * @param {{title:string, text:any, ok?:string, cancel?:string, danger?:boolean}} o
 * @returns {Promise<boolean>}
 */
export function confirmDialog(o) {
  return new Promise((res) => {
    let done = false;
    const fin = (/** @type {boolean} */ v) => { if (done) return; done = true; m.close(); res(v); };
    const m = modal({
      title: o.title, body: h('div', { class: 'confirm-text' }, o.text),
      onClose: () => { if (!done) { done = true; res(false); } },
      actions: [
        h('button', { class: 'btn', onclick: () => fin(false) }, o.cancel || 'Abbrechen'),
        h('button', { class: ['btn', o.danger ? 'danger' : 'primary'], onclick: () => fin(true) }, o.ok || 'OK'),
      ],
    });
  });
}

/** Leerer Zustand @param {string} title @param {string} text @param {any} [action] */
export function empty(title, text, action) {
  return h('div', { class: 'empty' }, h('div', { class: 'empty-ico' }, icon('info', 28)), h('h3', null, title), h('p', null, text), action || null);
}

/** Ladeanzeige */
export function loading() { return h('div', { class: 'loading', 'aria-busy': 'true' }, h('span', { class: 'spinner' }), 'Lade …'); }

/** @param {string} title @param {any} [sub] @param {any} [actions] */
export function pageHead(title, sub, actions) {
  return h('header', { class: 'page-head' }, h('div', null, h('h1', null, title), sub ? h('p', { class: 'sub' }, sub) : null),
    actions ? h('div', { class: 'head-actions' }, actions) : null);
}

/** @param {string} title @param {any} body @param {any} [extra] */
export function card(title, body, extra) {
  return h('section', { class: 'card' }, title ? h('div', { class: 'card-head' }, h('h2', null, title), extra || null) : null, body);
}

/** Definitionsliste @param {[string, any][]} rows */
export function dl(rows) {
  return h('dl', { class: 'dl' }, rows.map(([k, v]) => [h('dt', null, k), h('dd', null, v == null || v === '' ? '–' : v)]));
}

/** @param {(...a:any[])=>void} fn @param {number} ms */
export function debounce(fn, ms) {
  /** @type {any} */ let t;
  return (/** @type {any[]} */ ...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
