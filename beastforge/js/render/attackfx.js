// Angriffs-Choreografie (nur Optik): Farben + Art der Energie-Sammlung je Kreatur und Pfad.
// base = Grundfarbe, p = Farbe je Pfad (dominanter Pfad färbt die Ladung, zweiter Pfad setzt Akzente = Kreuzpfad sichtbar),
// gather = wie sich Energie vor dem Schuss sammelt, sig = Signatur-Effekt beim Auslösen.
import { CREATURES } from '../data/creatures.js';

export const AFX = {
  kitsune:    { base: 0xff8a3a, p: [0xff4a10, 0x7df3ff, 0xa070ff], gather: 'flame', sig: 'foxfire' },
  tiger:      { base: 0xffe14d, p: [0xfff27a, 0xffb43a, 0x9fd8ff], gather: 'spark', sig: 'thunder' },
  turtle:     { base: 0x5fd6ff, p: [0x9ad0ff, 0x5ae8d8, 0x3a8aff], gather: 'swirl', sig: 'splash' },
  deer:       { base: 0x9af07a, p: [0x6fdc5a, 0x7df3ff, 0xfff2a8], gather: 'leaf' },
  raven:      { base: 0xb07bff, p: [0x6a5aff, 0xff5a8a, 0x8a6aff], gather: 'smoke' },
  dragonwolf: { base: 0x9fe8ff, p: [0xbff4ff, 0xff7a2a, 0xffd257], gather: 'flame' },
  mantis:     { base: 0xd8fff0, p: [0xff8aa0, 0xd8fff0, 0xff3a5a], gather: 'glint' },
  golem:      { base: 0xc8a060, p: [0xc8b090, 0x8a6aff, 0xffb43a], gather: 'dust', sig: 'quake' },
  neko:       { base: 0xffd257, p: [0xffd257, 0xff9a4a, 0x7aff8a], gather: 'spark' },
  phoenix:    { base: 0xffa030, p: [0xff6a1a, 0xffe27a, 0xff4a2a], gather: 'flame', sig: 'foxfire' },
  naga:       { base: 0x7aff8a, p: [0x5aff6a, 0xb07bff, 0xff7ad8], gather: 'smoke' },
  monk:       { base: 0xe8f4ff, p: [0xbff4ff, 0x9ad0ff, 0xfff2a8], gather: 'swirl' },
  voidcat:    { base: 0x9f7bff, p: [0x6a4aff, 0xff7ad8, 0xbfd0ff], gather: 'star' },
  kappa:      { base: 0x5ae8d8, p: [0x3fb4d8, 0x5fd6ff, 0x9af07a], gather: 'swirl', sig: 'splash' },
  kirin:      { base: 0xfff2a8, p: [0xfff2a8, 0xffffff, 0xffd257], gather: 'spark', sig: 'thunder' },
  komainu:    { base: 0xffb43a, p: [0xff7a3d, 0xffd257, 0xc8a060], gather: 'glint' },
};
const ELEM = { fire: 0xff7a2f, ice: 0x9fe8ff, lightning: 0xffe14d, earth: 0xc8a060, spirit: 0x7df3ff, shadow: 0xb07bff, light: 0xfff2a8, astral: 0x9fb4ff, phys: 0xe8eef8 };

const mix = (a, b, k) => { const r = (a >> 16) + (((b >> 16) - (a >> 16)) * k), g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * k), bl = (a & 255) + (((b & 255) - (a & 255)) * k); return (r << 16) | (g << 8) | bl; };

// Fertiger Stil für eine Kreatur im aktuellen Ausbau (Fusion → Körper A, Held → Element)
export function afxFor(t) {
  const def = CREATURES[t.cid];
  const src = AFX[t.cid] || (def?.fusion ? AFX[def.parents[0]] : null);
  const el = def?.elements?.[0];
  const base = src || { base: ELEM[el] || 0xffffff, p: [ELEM[el] || 0xffffff, 0xffffff, 0xffffff], gather: t.hero ? 'spark' : 'flame' };
  const tiers = t.tiers || [0, 0, 0], order = [0, 1, 2].sort((a, b) => tiers[b] - tiers[a]), dom = order[0], sec = order[1];
  const top = tiers[dom];
  return {
    col: top ? mix(base.base, base.p[dom], Math.min(1, top / 3)) : base.base,
    accent: tiers[sec] > 0 ? base.p[sec] : null,                       // Kreuzpfad-Akzent
    gather: base.gather, sig: base.sig, power: 1 + top * 0.18 + (t.ascended ? 0.6 : 0) + (t.stage || 0) * 0.08, top, dom,
  };
}
export const ELEM_HEX = ELEM;
