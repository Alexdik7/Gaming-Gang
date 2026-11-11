// Turbofieber – Spielstand: Geld, Autos mit Optik und Upgrades, Bestwerte. Abgesichert gegen kaputte Daten.
import { CARS, OPTIONS, defaultCfg, defaultPerf, PERF_MAX } from './cars.js';

const KEY = 'tf.save';

function cleanCfg(c, paint) {
  const out = defaultCfg(paint);
  if (c && typeof c === 'object') {
    for (const k of Object.keys(out)) {
      if (k in c && OPTIONS[k].items.some(i => i[0] === c[k])) out[k] = c[k];
    }
  }
  return out;
}
function cleanPerf(p) {
  const out = defaultPerf();
  if (p && typeof p === 'object') for (const k of Object.keys(out)) out[k] = Math.max(0, Math.min(PERF_MAX, p[k] | 0));
  return out;
}

export function loadProfile(paint) {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
  if (!s || typeof s !== 'object') s = {};
  const p = {
    cash: Number.isFinite(s.cash) ? Math.max(0, Math.round(s.cash)) : 3000,
    car: CARS[s.car] ? s.car : 'kestrel',
    cars: {},
    best: { chain: 0, earned: 0, ...(s.best && typeof s.best === 'object' ? s.best : {}) }
  };
  const src = s.cars && typeof s.cars === 'object' ? s.cars : {};
  for (const id of Object.keys(CARS)) {
    if (src[id] || id === 'kestrel') p.cars[id] = { cfg: cleanCfg(src[id] && src[id].cfg, paint), perf: cleanPerf(src[id] && src[id].perf) };
  }
  if (!p.cars[p.car]) p.car = 'kestrel';
  return p;
}

export function saveProfile(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* ignorieren */ }
}
