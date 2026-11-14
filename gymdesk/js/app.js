// @ts-check
/* App-Hülle: Zugangsschutz, Navigation, Hash-Router, Verlassen-Schutz. */
import { h, replace, icon, toast, confirmDialog, loading } from './core/ui.js';
import * as db from './core/db.js';
import * as auth from './core/auth.js';
import { getSettings, maintenance } from './services/data.js';

const NAV = /** @type {const} */ ([
  ['dashboard', 'Dashboard', 'grid'], ['anmeldung', 'Neue Anmeldung', 'userPlus'], ['mitglieder', 'Mitglieder', 'users'],
  ['formulare', 'Formulare', 'file'], ['angebote', 'Angebote', 'mail'], ['einstellungen', 'Einstellungen', 'sliders'],
]);

/** @type {Record<string, () => Promise<any>>} */
const PAGES = {
  dashboard: () => import('./pages/dashboard.js'), anmeldung: () => import('./pages/signup.js'),
  mitglieder: () => import('./pages/members.js'), formulare: () => import('./pages/forms.js'),
  angebote: () => import('./pages/offers.js'), einstellungen: () => import('./pages/settings.js'),
};

const root = /** @type {HTMLElement} */ (document.getElementById('app'));
/** @type {HTMLElement|null} */ let main = null;
/** @type {(() => string|null)|null} */ let guard = null;
let current = '';
let ignore = false;
let renderId = 0;

/** Seiten können einen Verlassen-Schutz setzen (gibt Warntext zurück oder null). @param {(() => string|null)|null} fn */
export function setGuard(fn) { guard = fn; }
/** @param {string} hash */
export function go(hash) { location.hash = hash; }

addEventListener('beforeunload', (e) => { if (guard?.()) { e.preventDefault(); e.returnValue = ''; } });

function parse() {
  const raw = location.hash.replace(/^#\/?/, '') || 'dashboard';
  const [path, qs] = raw.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { page: parts[0] || 'dashboard', params: parts.slice(1), query: Object.fromEntries(new URLSearchParams(qs || '')) };
}

async function onHash() {
  if (ignore) { ignore = false; return; }
  if (!db.hasKey()) return;
  const msg = guard?.();
  if (msg && location.hash !== current) {
    const leave = await confirmDialog({ title: 'Formular verlassen?', text: msg, ok: 'Verlassen', cancel: 'Weiter ausfüllen', danger: true });
    if (!leave) { ignore = true; location.hash = current; return; }
  }
  guard = null;
  current = location.hash;
  await render();
}

async function render() {
  if (!main) shell(await getSettings());
  const r = parse();
  const id = ++renderId;
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', /** @type {HTMLElement} */ (a).dataset.nav === r.page));
  const m = /** @type {HTMLElement} */ (main);
  replace(m, loading());
  try {
    const mod = await (PAGES[r.page] || PAGES.dashboard)();
    const node = await mod.render({ ...r, refresh: render });
    if (id !== renderId) return;
    replace(m, node);
    m.focus({ preventScroll: true });
    scrollTo(0, 0);
  } catch (e) {
    console.error('Seitenfehler', /** @type {Error} */ (e).message);
    replace(m, h('div', { class: 'empty' }, h('h3', null, 'Da ist etwas schiefgelaufen.'), h('p', null, 'Bitte Seite neu laden. Deine Daten sind gespeichert.'),
      h('button', { class: 'btn', onclick: () => location.reload() }, 'Neu laden')));
  }
}

/** @param {any} s */
function shell(s) {
  const brand = h('div', { class: 'brand' }, s.logo ? h('img', { src: s.logo, alt: '' }) : h('span', { class: 'brand-mark' }, icon('dumbbell', 22)),
    h('div', { class: 'brand-txt' }, h('b', null, s.name), h('small', null, 'Mitgliederverwaltung')));
  const links = NAV.map(([k, l, i]) => h('a', { href: '#/' + k, class: 'nav-link', dataset: { nav: k } }, icon(i, 22), h('span', { class: 'lbl' }, l)));
  const side = h('aside', { class: 'side' }, brand, h('nav', { 'aria-label': 'Hauptnavigation' }, links),
    h('div', { class: 'side-foot' },
      h('a', { class: 'nav-link small', href: 'film/' }, icon('film', 20), h('span', { class: 'lbl' }, 'Making-of')),
      h('button', { class: 'nav-link small', onclick: () => auth.lock() }, icon('lock', 20), h('span', { class: 'lbl' }, 'Sperren'))));
  const tabs = h('nav', { class: 'tabbar', 'aria-label': 'Navigation' },
    NAV.map(([k, l, i]) => h('a', { href: '#/' + k, dataset: { nav: k } }, icon(i, 22), h('span', null, l.replace('Neue ', '')))));
  main = h('main', { class: 'main', tabindex: '-1' });
  replace(root, h('div', { class: 'shell' }, side, main, tabs));
}

/* ---------- Einrichten & Entsperren ---------- */
/** @param {any} pub */
function brandBox(pub) {
  return h('div', { class: 'auth-brand' }, pub?.logo ? h('img', { src: pub.logo, alt: '' }) : h('span', { class: 'brand-mark big' }, icon('dumbbell', 34)),
    h('h1', null, pub?.name || 'GymDesk'), h('p', null, 'Mitgliederverwaltung'));
}

function setupScreen() {
  const err = h('p', { class: 'err', role: 'alert' });
  const name = h('input', { id: 'su-name', value: 'Mein Gym', autocomplete: 'organization' });
  const pw = h('input', { id: 'su-pw', type: 'password', autocomplete: 'new-password' });
  const pw2 = h('input', { id: 'su-pw2', type: 'password', autocomplete: 'new-password' });
  const demo = h('input', { type: 'checkbox', checked: true, id: 'su-demo' });
  const btn = h('button', { class: 'btn primary block', type: 'submit' }, 'Einrichten');
  const form = h('form', { class: 'auth-card', onsubmit: async (/** @type {Event} */ e) => {
    e.preventDefault();
    const p = /** @type {HTMLInputElement} */ (pw).value, p2 = /** @type {HTMLInputElement} */ (pw2).value;
    const prob = auth.passwordProblem(p) || (p !== p2 ? 'Die Passwörter stimmen nicht überein.' : null);
    if (prob) { err.textContent = prob; return; }
    btn.setAttribute('disabled', ''); btn.textContent = 'Wird eingerichtet …';
    try {
      await auth.setup(p);
      const seed = await import('./data/seed.js');
      await seed.seedBase(/** @type {HTMLInputElement} */ (name).value.trim());
      if (/** @type {HTMLInputElement} */ (demo).checked) await seed.seedDemo();
      start();
    } catch (x) { err.textContent = 'Einrichtung fehlgeschlagen: ' + /** @type {Error} */ (x).message; btn.removeAttribute('disabled'); btn.textContent = 'Einrichten'; }
  } },
  brandBox(null),
  h('h2', null, 'Willkommen! Zugang einrichten'),
  h('p', { class: 'muted' }, 'Alle Daten werden verschlüsselt nur auf diesem Gerät gespeichert. Das Passwort schützt den Zugang – es kann nicht wiederhergestellt werden.'),
  h('div', { class: 'field' }, h('label', { for: 'su-name' }, 'Name des Gyms'), name),
  h('div', { class: 'field' }, h('label', { for: 'su-pw' }, 'Passwort (mind. 8 Zeichen, Buchstaben + Ziffern)'), pw),
  h('div', { class: 'field' }, h('label', { for: 'su-pw2' }, 'Passwort wiederholen'), pw2),
  h('label', { class: 'check-row' }, demo, h('span', null, h('b', null, 'Testdaten laden'), h('small', null, '10 Testmitglieder, Mitgliedschaften, Leistungen und Angebote zum Ausprobieren'))),
  err, btn);
  replace(root, h('div', { class: 'auth' }, form));
  /** @type {HTMLElement} */ (pw).focus();
}

async function lockScreen() {
  main = null;
  const pub = await db.get('meta', 'public');
  const err = h('p', { class: 'err', role: 'alert' });
  const pw = /** @type {HTMLInputElement} */ (h('input', { id: 'lk-pw', type: 'password', autocomplete: 'current-password' }));
  const btn = h('button', { class: 'btn primary block', type: 'submit' }, icon('lock', 20), 'Entsperren');
  const form = h('form', { class: 'auth-card', onsubmit: async (/** @type {Event} */ e) => {
    e.preventDefault();
    btn.setAttribute('disabled', ''); err.textContent = '';
    try { await auth.unlock(pw.value); start(); }
    catch (x) { err.textContent = /** @type {Error} */ (x).message; pw.value = ''; pw.focus(); btn.removeAttribute('disabled'); }
  } }, brandBox(pub), h('div', { class: 'field' }, h('label', { for: 'lk-pw' }, 'Passwort'), pw), err, btn,
  h('p', { class: 'muted small' }, 'Nach Inaktivität sperrt sich die App automatisch.'));
  replace(root, h('div', { class: 'auth' }, form));
  pw.focus();
}

async function start() {
  const s = await getSettings();
  auth.startSession(() => { guard = null; lockScreen(); toast('App wurde gesperrt.', 'info'); }, s.autoLockMin);
  try { await maintenance(); } catch (e) { console.warn('Wartung übersprungen'); }
  main = null;
  current = location.hash;
  await render();
}

addEventListener('hashchange', onHash);

(async () => {
  if (!window.crypto?.subtle || !window.indexedDB) {
    replace(root, h('div', { class: 'auth' }, h('div', { class: 'auth-card' }, h('h2', null, 'Browser nicht unterstützt'),
      h('p', null, 'Bitte die App über HTTPS in Safari oder Chrome öffnen.'))));
    return;
  }
  await db.open();
  if (await auth.isSetUp()) lockScreen(); else setupScreen();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
