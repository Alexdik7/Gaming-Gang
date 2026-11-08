// Erzeugt individuelle Kreaturen-Exemplare. Wird NUR serverseitig mit echtem Zufall aufgerufen;
// der Client bekommt fertige Exemplare und kann deren Werte nicht bestimmen.
import { SPECIES } from './creatures.js';
import { STATS, IV_MAX, TEMPERAMENTS, GROWTH, SHINY_ODDS, calcAll } from './stats.js';

export function movesAt(species, level) {
  const known = species.learnset.filter(([l]) => l <= level).map(([, m]) => m);
  return [...new Set(known)].slice(-4);
}

export function createMon(speciesId, level, rand) {
  const sp = SPECIES.get(speciesId);
  if (!sp) throw new Error('unknown species ' + speciesId);
  const ivs = {}, evs = {};
  for (const s of STATS) { ivs[s] = Math.floor(rand() * (IV_MAX + 1)); evs[s] = 0; }
  const temperament = Math.floor(rand() * TEMPERAMENTS.length);
  const mon = {
    species: speciesId, level, exp: GROWTH[sp.growth](level),
    ivs, evs, temperament, shiny: rand() < SHINY_ODDS, bond: 70,
    moves: movesAt(sp, level), status: null,
  };
  mon.stats = calcAll(sp, level, ivs, evs, temperament);
  mon.hp = mon.stats.kp;
  return mon;
}
