// @ts-check
/* Zugang: Passwort → PBKDF2 (310.000 Runden) → Schlüssel, der den zufälligen Datenschlüssel entsperrt.
   Das Passwort selbst wird nie gespeichert. Fehlversuche bremsen exponentiell. Auto-Sperre bei Inaktivität. */
import * as db from './db.js';
import { rand, keyFromPassword, encryptBytes, decryptBytes, importKey } from './crypto.js';

const ITER = 310000;
/** @type {any} */ let timer = null;
let minutes = 15;
/** @type {() => void} */ let onLock = () => {};

export async function isSetUp() { return !!(await db.get('meta', 'auth')); }

/** @param {string} pw */
export function passwordProblem(pw) {
  if (pw.length < 8) return 'Mindestens 8 Zeichen.';
  if (!/[A-Za-zÄÖÜäöü]/.test(pw) || !/\d/.test(pw)) return 'Bitte Buchstaben und Ziffern kombinieren.';
  return null;
}

/** @param {string} pw */
export async function setup(pw) {
  const salt = rand(16), raw = rand(32);
  const kek = await keyFromPassword(pw, salt, ITER);
  await db.put('meta', { id: 'auth', salt, iter: ITER, wrapped: await encryptBytes(kek, raw), fails: 0, lockUntil: 0 });
  db.setKey(await importKey(raw));
  raw.fill(0);
}

/** @param {string} pw */
export async function unlock(pw) {
  const a = await db.get('meta', 'auth');
  const wait = a.lockUntil - Date.now();
  if (wait > 0) throw new Error(`Zu viele Fehlversuche. Bitte ${Math.ceil(wait / 1000)} Sekunden warten.`);
  /** @type {Uint8Array|null} */ let raw = null;
  try {
    raw = await decryptBytes(await keyFromPassword(pw, a.salt, a.iter), a.wrapped);
  } catch {
    a.fails++;
    if (a.fails >= 5) a.lockUntil = Date.now() + Math.min(15 * 60000, 30000 * 2 ** (a.fails - 5));
    await db.put('meta', a);
    throw new Error(a.fails >= 5 ? 'Passwort falsch. Zugang vorübergehend gesperrt.' : 'Das Passwort ist nicht richtig.');
  }
  db.setKey(await importKey(raw));
  raw.fill(0);
  a.fails = 0; a.lockUntil = 0;
  await db.put('meta', a);
}

/** @param {string} oldPw @param {string} newPw */
export async function changePassword(oldPw, newPw) {
  const a = await db.get('meta', 'auth');
  let raw;
  try { raw = await decryptBytes(await keyFromPassword(oldPw, a.salt, a.iter), a.wrapped); }
  catch { throw new Error('Das aktuelle Passwort ist nicht richtig.'); }
  const salt = rand(16);
  a.salt = salt; a.iter = ITER;
  a.wrapped = await encryptBytes(await keyFromPassword(newPw, salt, ITER), raw);
  raw.fill(0);
  await db.put('meta', a);
}

export function lock() {
  db.setKey(null);
  clearTimeout(timer);
  onLock();
}

const bump = () => { clearTimeout(timer); timer = setTimeout(lock, minutes * 60000); };

/** @param {() => void} cb @param {number} mins */
export function startSession(cb, mins) {
  onLock = cb; minutes = Math.max(1, mins || 15);
  for (const ev of ['pointerdown', 'keydown', 'scroll']) addEventListener(ev, () => db.hasKey() && bump(), { passive: true });
  bump();
}
/** @param {number} mins */
export function setTimeoutMinutes(mins) { minutes = Math.max(1, mins); bump(); }
