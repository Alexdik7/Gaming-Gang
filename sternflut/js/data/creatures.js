// Sternflut – Kreaturen-Datenbank. Arten werden in den Regionsdateien (kalmara*.js …) mit C(...) eingetragen.
// stats: hp, atk, def, spa, spd, spe · model: Baukasten für monart.js · cry: synthetischer Ruf
export const RARITY = {
  gewoehnlich: { name: 'Gewöhnlich', color: '#c9d1c9' },
  ungewoehnlich: { name: 'Ungewöhnlich', color: '#6fe08a' },
  selten: { name: 'Selten', color: '#5cb4ff' },
  episch: { name: 'Episch', color: '#c07bff' },
  legendaer: { name: 'Legendär', color: '#ffc94a' },
};
export const SPECIES = {};
export const STARTERS = ['zundrak', 'tidolin', 'moospip'];
const L = str => str.trim().split(/\s+/).map(t => { const [l, id] = t.split(':'); return [+l, id]; });
const ST = a => ({ hp: a[0], atk: a[1], def: a[2], spa: a[3], spd: a[4], spe: a[5] });
// C(id, nr, name, typen, seltenheit, werte[6], fangrate, ep, 'lv:attacke …', entwicklung|null, chronik, modell, ruf, extra)
export function C(id, num, name, types, rarity, stats, catchRate, xp, learn, evo, lore, model, cry, extra = {}) {
  SPECIES[id] = { num, name, types, rarity, stats: ST(stats), catchRate, xp, learn: L(learn), evo, lore, model, cry, ...extra };
}
