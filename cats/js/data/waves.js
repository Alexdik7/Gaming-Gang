// Wellen-Daten. Der Generator in sim/waves.js baut Wellen aus einem Bedrohungs-Budget;
// hier stehen feste Wellen (Einstieg) und Themen, aus denen der Generator wählt.
// Gruppe: [Hundetyp, Anzahl, Abstand in s, Startverzögerung in s]

// Die ersten Wellen sind auf jeder Map gleich – ein sanfter Einstieg.
export const EARLY = {
  1: [['mutt', 6, 1.1, 0]],
  2: [['mutt', 10, 0.9, 0]],
  3: [['mutt', 8, 0.8, 0], ['whippet', 4, 0.7, 5]],
  4: [['whippet', 8, 0.6, 0], ['mutt', 8, 0.7, 3]],
  5: [['mutt', 16, 0.55, 0], ['whippet', 6, 0.5, 6]]
};

// Feste Wellen einzelner Maps: FIXED[mapId][Welle] = Gruppen (überschreibt den Generator)
export const FIXED = {
  city: { 7: [['pug', 4, 1.6, 0], ['mutt', 12, 0.5, 2]] }
};

// Themen: Der Generator wählt pro Welle eines davon (gewichtet, mit festem Zufalls-Startwert).
// pick = wie viele Hundetypen, only = Filter auf Eigenschaften, gap = Abstands-Faktor, budget = Budget-Faktor
export const THEMES_W = [
  { id: 'mixed', w: 10, pick: 3, gap: 1, budget: 1 },
  { id: 'rush',  w: 5, pick: 2, gap: 0.55, budget: 0.85, only: d => d.speed >= 1.3 },
  { id: 'tanks', w: 4, pick: 2, gap: 1.5, budget: 1.1, only: d => d.hp >= 50 },
  { id: 'swarm', w: 4, pick: 1, gap: 0.4, budget: 1.0, only: d => d.cost <= 1.5 },
  { id: 'tricky', w: 4, pick: 2, gap: 1, budget: 0.95, only: d => d.stealth || d.dodge || d.shield || d.burrow || d.heal || d.aura }
];

// Boss-Begleitung: zusätzliches Budget neben dem Boss
export const BOSS_ESCORT = 0.45;
