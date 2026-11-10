// Kreaturen- und Trainer-Sprites: reine 2D-Pixel-Art (monart.js), zwischengespeichert
import { paintCreature, paintTrainer, shiftHue } from './monart.js';
import { SPECIES } from '../data/creatures.js';
import { ensureSpecies } from '../data/breeding.js';

const cache = new Map();
// Profi-Feinschliff: farbige Umrisse auf der Lichtseite (Sel-Out), Randlicht oben links, Umgebungsschatten unten rechts,
// Schatten leicht ins Kühle, Lichter leicht ins Warme verschoben
export function polish(cnv, small) {
  const w = cnv.width, h = cnv.height, x = cnv.getContext('2d'), d = x.getImageData(0, 0, w, h), p = d.data;
  const A = i => p[i * 4 + 3] > 20, L = i => p[i * 4] * 0.3 + p[i * 4 + 1] * 0.59 + p[i * 4 + 2] * 0.11;
  const N = w * h, out = new Uint8Array(N), src = new Uint8ClampedArray(p);
  for (let i = 0; i < N; i++) { if (!A(i)) continue; const X = i % w, Y = (i / w) | 0; if (X === 0 || Y === 0 || X === w - 1 || Y === h - 1 || !A(i - 1) || !A(i + 1) || !A(i - w) || !A(i + w)) out[i] = 1; }
  const set = (i, r, g, b) => { p[i * 4] = Math.max(0, Math.min(255, r)); p[i * 4 + 1] = Math.max(0, Math.min(255, g)); p[i * 4 + 2] = Math.max(0, Math.min(255, b)); };
  for (let i = 0; i < N; i++) {
    if (!A(i)) continue;
    const X = i % w, Y = (i / w) | 0, o = i * 4;
    if (out[i] && L(i) < 70) {
      // inneren Nachbarn suchen (Farbe der Fläche)
      let j = -1; for (const k of [i + w, i + 1, i - 1, i - w, i + w + 1, i + w - 1]) if (k >= 0 && k < N && A(k) && !out[k] && L(k) >= 70) { j = k; break; }
      if (j < 0) continue;
      const lit = (Y > 0 && !A(i - w)) || (X > 0 && !A(i - 1));
      const k = lit ? 0.5 : 0.28, r = src[j * 4], g = src[j * 4 + 1], b = src[j * 4 + 2];
      set(i, r * k + (lit ? 0 : 6), g * k + (lit ? 2 : 4), b * k + (lit ? 14 : 22));
    } else if (!out[i]) {
      const up = i - w, lf = i - 1, dn = i + w, rt = i + 1;
      const nearTop = (up >= 0 && out[up] && L(up) < 70) || (lf >= 0 && out[lf] && L(lf) < 70 && X > 0);
      const nearBot = (dn < N && out[dn] && L(dn) < 70) || (rt < N && out[rt] && L(rt) < 70);
      const l = L(i);
      if (l < 60 || src[o + 3] < 200) continue; // Augen/Details unverändert
      if (nearTop && !nearBot) set(i, src[o] + (255 - src[o]) * 0.16 + 4, src[o + 1] + (255 - src[o + 1]) * 0.16 + 2, src[o + 2] + (255 - src[o + 2]) * 0.1);
      else if (nearBot && !nearTop && !small) set(i, src[o] * 0.86 - 2, src[o + 1] * 0.86, src[o + 2] * 0.9 + 8);
    }
  }
  x.putImageData(d, 0, 0);
  return cnv;
}
// view: 'front' | 'back' | 'icon'
// Stufe in der Entwicklungskette (1 = Basis) und Länge der Kette – damit Entwicklungen sichtbar wachsen
let PRE = null;
function evoTier(sp) {
  if (!PRE) { PRE = {}; for (const [id, v] of Object.entries(SPECIES)) if (v.evo?.to) PRE[v.evo.to] = id; }
  let tier = 1, x = sp; while (PRE[x] && tier < 4) { x = PRE[x]; tier++; }
  let len = tier; x = SPECIES[sp]; while (x?.evo?.to && SPECIES[x.evo.to] && len < 4) { x = SPECIES[x.evo.to]; len++; }
  return { tier, chainLen: len };
}
export function monSprite(sp, view = 'front', shiny = false, mut = false) {
  const k = sp + view + shiny + mut;
  if (cache.has(k)) return cache.get(k);
  const S = SPECIES[sp] || ensureSpecies(sp);
  let spec = { ...S.model, ...evoTier(sp), type: S.types?.[0] };
  if (mut) spec = { ...spec, main: shiftHue(spec.main, -0.12), extras: [...new Set([...(spec.extras || []), 'gem'])] };
  const small = view === 'icon' || view === 'iconback'; // 'iconback': kleine Rückansicht für Mitläufer und Surfen
  const img = polish(small ? paintCreature(spec, view === 'iconback' ? 'back' : 'front', shiny, 32) : paintCreature(spec, view, shiny), small);
  cache.set(k, img);
  return img;
}
export function trainerSprite(look, back = false) {
  const k = 'tr' + JSON.stringify(look) + back;
  if (cache.has(k)) return cache.get(k);
  const img = polish(paintTrainer(look, back));
  cache.set(k, img);
  return img;
}
