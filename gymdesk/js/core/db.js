// @ts-check
/* Datenschicht (Repository): IndexedDB, jeder Datensatz außer "meta" wird mit AES-GCM
   verschlüsselt gespeichert. Klartext liegen nur die zufälligen IDs und Fremdschlüssel.
   Später kann diese Datei durch einen API-Client (Server + PostgreSQL) ersetzt werden –
   die Seiten sprechen nur mit services/data.js. */
import { encryptJSON, decryptJSON, toB64, fromB64 } from './crypto.js';

const NAME = 'gymdesk';
const VERSION = 1;
export const STORES = ['meta', 'settings', 'plans', 'addons', 'members', 'contracts', 'signatures', 'consents',
  'offers', 'offerRecipients', 'emailLog', 'activity', 'drafts'];
const LINKS = ['memberId', 'contractId', 'offerId'];

/** @type {Promise<IDBDatabase>|null} */ let dbp = null;
/** @type {CryptoKey|null} */ let KEY = null;

/** @param {CryptoKey|null} k */
export function setKey(k) { KEY = k; }
export const hasKey = () => !!KEY;

export function open() {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open(NAME, VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      for (const s of STORES) if (!db.objectStoreNames.contains(s)) {
        const os = db.createObjectStore(s, { keyPath: 'id' });
        for (const l of LINKS) os.createIndex(l, l);
      }
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}

/** @template T @param {IDBRequest<T>} r @returns {Promise<T>} */
const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

/** @param {string} store @param {any} v */
async function seal(store, v) {
  if (store === 'meta') return v;
  if (!KEY) throw new Error('Gesperrt');
  /** @type {any} */ const row = { id: v.id, enc: await encryptJSON(KEY, v) };
  for (const l of LINKS) if (v[l]) row[l] = v[l];
  return row;
}
/** @param {string} store @param {any} row */
async function unseal(store, row) {
  if (!row || store === 'meta') return row;
  if (!KEY) throw new Error('Gesperrt');
  return decryptJSON(KEY, row.enc);
}

/** @param {string} store @param {string} id */
export async function get(store, id) {
  const db = await open();
  return unseal(store, await req(db.transaction(store).objectStore(store).get(id)));
}
/** @param {string} store @returns {Promise<any[]>} */
export async function all(store) {
  const db = await open();
  const rows = await req(db.transaction(store).objectStore(store).getAll());
  return Promise.all(rows.map((r) => unseal(store, r)));
}
/** Datensätze über Fremdschlüssel @param {string} store @param {string} link @param {string} id */
export async function by(store, link, id) {
  const db = await open();
  const rows = await req(db.transaction(store).objectStore(store).index(link).getAll(id));
  return Promise.all(rows.map((r) => unseal(store, r)));
}
/** @param {string} store @param {any} v */
export const put = (store, v) => putMany([[store, v]]);

/**
 * Schreibt mehrere Datensätze in EINER Transaktion (alles oder nichts).
 * Verschlüsselung passiert vorher, weil IndexedDB-Transaktionen nicht über fremde Promises hinweg offen bleiben.
 * @param {[string, any][]} items @param {[string,string][]} [deletes]
 */
export async function putMany(items, deletes = []) {
  const sealed = await Promise.all(items.map(async ([s, v]) => /** @type {[string, any]} */ ([s, await seal(s, v)])));
  const db = await open();
  const names = [...new Set([...items.map((i) => i[0]), ...deletes.map((d) => d[0])])];
  const tx = db.transaction(names, 'readwrite');
  for (const [s, row] of sealed) tx.objectStore(s).put(row);
  for (const [s, id] of deletes) tx.objectStore(s).delete(id);
  await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
}
/** @param {string} store @param {string} id */
export const del = (store, id) => putMany([], [[store, id]]);

/** Komplette Sicherung (bleibt verschlüsselt). */
export async function dump() {
  const db = await open();
  /** @type {Record<string, any[]>} */ const out = {};
  for (const s of STORES) {
    const rows = await req(db.transaction(s).objectStore(s).getAll());
    out[s] = rows.map((r) => JSON.parse(JSON.stringify(r, (_k, v) => (v instanceof Uint8Array ? { $b: toB64(v) } : v))));
  }
  return { app: 'gymdesk', version: VERSION, exportedAt: new Date().toISOString(), stores: out };
}
/** @param {any} data */
export async function restore(data) {
  if (data?.app !== 'gymdesk') throw new Error('Keine GymDesk-Sicherung.');
  const db = await open();
  const tx = db.transaction(STORES, 'readwrite');
  for (const s of STORES) {
    const os = tx.objectStore(s); os.clear();
    for (const r of data.stores[s] || []) os.put(JSON.parse(JSON.stringify(r), (_k, v) => (v && v.$b ? fromB64(v.$b) : v)));
  }
  await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
}
export async function wipe() {
  const db = await open();
  const tx = db.transaction(STORES, 'readwrite');
  for (const s of STORES) tx.objectStore(s).clear();
  await new Promise((res) => { tx.oncomplete = res; });
}
/** Fortlaufender Zähler (z. B. Mitgliedsnummer) @param {string} name */
export async function nextNumber(name) {
  const m = (await get('meta', 'counter_' + name)) || { id: 'counter_' + name, n: 0 };
  m.n++;
  await put('meta', m);
  return m.n;
}
