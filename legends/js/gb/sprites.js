// Kreaturen- und Trainer-Sprites: reine 2D-Pixel-Art (monart.js), zwischengespeichert
import { paintCreature, paintTrainer, shiftHue } from './monart.js';
import { SPECIES } from '../data/creatures.js';
import { ensureSpecies } from '../data/breeding.js';

const cache = new Map();
// view: 'front' | 'back' | 'icon'
export function monSprite(sp, view = 'front', shiny = false, mut = false) {
  const k = sp + view + shiny + mut;
  if (cache.has(k)) return cache.get(k);
  const S = SPECIES[sp] || ensureSpecies(sp);
  let spec = S.model;
  if (mut) spec = { ...spec, main: shiftHue(spec.main, -0.12), extras: [...new Set([...(spec.extras || []), 'gem'])] };
  const img = view === 'icon' ? paintCreature(spec, 'front', shiny, 32) : paintCreature(spec, view, shiny);
  cache.set(k, img);
  return img;
}
export function trainerSprite(look, back = false) {
  const k = 'tr' + JSON.stringify(look) + back;
  if (cache.has(k)) return cache.get(k);
  const img = paintTrainer(look, back);
  cache.set(k, img);
  return img;
}
