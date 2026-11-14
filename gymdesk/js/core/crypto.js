// @ts-check
/* Verschlüsselung mit WebCrypto: PBKDF2 (Passwort → Schlüssel), AES-GCM 256 (Daten). */
const te = new TextEncoder(), td = new TextDecoder();

/** @param {number} n */
export const rand = (n) => crypto.getRandomValues(new Uint8Array(n));

/** Schlüssel aus Passwort ableiten. @param {string} pw @param {Uint8Array} salt @param {number} iter */
export async function keyFromPassword(pw, salt, iter) {
  const base = await crypto.subtle.importKey('raw', te.encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** @param {Uint8Array} raw */
export const importKey = (raw) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);

/** @typedef {{iv:Uint8Array, ct:Uint8Array}} Sealed */

/** @param {CryptoKey} key @param {Uint8Array} bytes @returns {Promise<Sealed>} */
export async function encryptBytes(key, bytes) {
  const iv = rand(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
  return { iv, ct: new Uint8Array(ct) };
}
/** @param {CryptoKey} key @param {Sealed} s */
export async function decryptBytes(key, s) {
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: s.iv }, key, s.ct));
}
/** @param {CryptoKey} key @param {any} obj */
export const encryptJSON = (key, obj) => encryptBytes(key, te.encode(JSON.stringify(obj)));
/** @param {CryptoKey} key @param {Sealed} s */
export const decryptJSON = async (key, s) => JSON.parse(td.decode(await decryptBytes(key, s)));

/** @param {string} s */
export async function sha256Hex(s) {
  const d = await crypto.subtle.digest('SHA-256', te.encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** @param {Uint8Array} u */
export const toB64 = (u) => btoa(String.fromCharCode(...u));
/** @param {string} s */
export const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
