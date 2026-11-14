// Meta-Daten: Power-ups, Katzen-Akademie, Missionen, Erfolge, tägliche Belohnung, Level-Freischaltungen.
// Alles reine Tabellen – neue Einträge brauchen keinen neuen Code (außer bei ganz neuen Effekt-Arten).

// ---------------------------------------------------------------- Power-ups
// kind: sofort | ziel (Feld antippen). price in Münzen. lvl = Spielerlevel zum Freischalten.
export const POWERUPS = {
  catnip:    { n: ['Catnip Boost', 'Catnip Boost'], d: ['Alle Katzen greifen 10 s lang 60 % schneller an.', 'All cats attack 60% faster for 10 s.'], lvl: 1, price: 120, dur: 10, val: 0.6, col: '#6fd15a' },
  megapaw:   { n: ['Mega Paw', 'Mega Paw'], d: ['Eine Riesenpfote schlägt ein: gewaltiger Flächenschaden am Ziel.', 'A giant paw slams down: massive area damage at the target.'], lvl: 1, price: 150, target: true, radius: 2.4, dmg: 160, dmgPerWave: 28, col: '#ff8a3d' },
  heal:      { n: ['Heal Base', 'Heal Base'], d: ['Stellt 5 Leben der Basis wieder her.', 'Restores 5 base lives.'], lvl: 3, price: 180, val: 5, col: '#ff5d7a' },
  freeze:    { n: ['Time Freeze', 'Time Freeze'], d: ['Alle Hunde bleiben 5 s lang stehen (Bosse 2 s).', 'All dogs stop for 5 s (bosses 2 s).'], lvl: 5, price: 200, dur: 5, col: '#5ad1ff' },
  goldfish:  { n: ['Golden Fish', 'Golden Fish'], d: ['20 s lang doppeltes Futter für jeden besiegten Hund.', 'Double fish for every defeated dog for 20 s.'], lvl: 7, price: 160, dur: 20, val: 1, col: '#ffd23f' },
  double:    { n: ['Double Attack', 'Double Attack'], d: ['Alle Katzen machen 8 s lang doppelten Schaden.', 'All cats deal double damage for 8 s.'], lvl: 11, price: 260, dur: 8, val: 1, col: '#c77dff' },
  emergency: { n: ['Emergency Cat', 'Emergency Cat'], d: ['Ruft für 15 s eine starke Notfall-Katze an die gewählte Stelle.', 'Calls in a strong emergency cat at the chosen spot for 15 s.'], lvl: 15, price: 300, target: true, dur: 15, dmg: 14, dmgPerWave: 2.2, rate: 5, range: 3.6, col: '#ff4d6d' }
};
export const POWER_IDS = Object.keys(POWERUPS);
for (const id of POWER_IDS) POWERUPS[id].id = id;

// ---------------------------------------------------------------- Katzen-Akademie
// Allgemeine Forschung: max Stufen, Kosten je Stufe = cost(stufe) in {coins|crystals}, eff = Bonus je Stufe.
const c = (base, grow, cur = 'coins') => l => ({ [cur]: Math.round(base * Math.pow(grow, l)) });
export const RESEARCH = {
  claws:   { n: ['Scharfe Krallen', 'Sharp Claws'], d: ['+2 % Schaden aller Katzen', '+2% damage for all cats'], max: 10, eff: 0.02, key: 'dmg', cost: c(300, 1.6), lvl: 1 },
  paws:    { n: ['Schnelle Pfoten', 'Quick Paws'], d: ['+2 % Angriffstempo', '+2% attack speed'], max: 10, eff: 0.02, key: 'rate', cost: c(300, 1.6), lvl: 2 },
  eyes:    { n: ['Adleraugen', 'Eagle Eyes'], d: ['+2 % Reichweite', '+2% range'], max: 5, eff: 0.02, key: 'range', cost: c(500, 1.9), lvl: 4 },
  tactics: { n: ['Taktische Ausbildung', 'Tactical Training'], d: ['+5 % Erfahrung', '+5% experience'], max: 5, eff: 0.05, key: 'xp', cost: c(400, 1.8), lvl: 1 },
  economy: { n: ['Ökonomische Ausbildung', 'Economic Training'], d: ['+3 % erhaltene Münzen', '+3% coins earned'], max: 10, eff: 0.03, key: 'coins', cost: c(350, 1.6), lvl: 3 },
  capital: { n: ['Startkapital', 'Starting Capital'], d: ['+5 % Start-Futter', '+5% starting fish'], max: 8, eff: 0.05, key: 'startFish', cost: c(400, 1.7), lvl: 2 },
  veteran: { n: ['Veteranenbonus', 'Veteran Bonus'], d: ['Erstes Upgrade jeder Katze 12 % günstiger', 'First upgrade of each cat 12% cheaper'], max: 5, eff: 0.12, key: 'veteran', cost: c(8, 1.5, 'crystals'), lvl: 5 },
  walls:   { n: ['Dicke Mauern', 'Thick Walls'], d: ['+2 Leben der Basis', '+2 base lives'], max: 5, eff: 2, key: 'lives', cost: c(6, 1.6, 'crystals'), lvl: 3 },
  team:    { n: ['Teamgeist', 'Team Spirit'], d: ['Support-Auren +6 % stärker', 'Support auras +6% stronger'], max: 5, eff: 0.06, key: 'support', cost: c(10, 1.5, 'crystals'), lvl: 8 },
  cool:    { n: ['Kühle Köpfe', 'Cool Heads'], d: ['Power-up-Abklingzeit −6 %', 'Power-up cooldown −6%'], max: 5, eff: 0.06, key: 'cooldown', cost: c(8, 1.5, 'crystals'), lvl: 6 },
  special: { n: ['Spezialausbildung', 'Special Training'], d: ['Brennen, Bremsen und Betäuben +5 % stärker', 'Burn, slow and stun +5% stronger'], max: 5, eff: 0.05, key: 'special', cost: c(12, 1.5, 'crystals'), lvl: 10 },
  slot:    { n: ['Power-up-Tasche', 'Power-up Pouch'], d: ['+1 Power-up-Platz pro Runde', '+1 power-up slot per round'], max: 1, eff: 1, key: 'powerSlots', cost: c(60, 1, 'crystals'), lvl: 9 },
  squad:   { n: ['Größerer Trupp', 'Bigger Squad'], d: ['+1 Katzen-Platz im Trupp', '+1 cat slot in the squad'], max: 2, eff: 1, key: 'loadout', cost: c(45, 2.2, 'crystals'), lvl: 12 }
};
export const RESEARCH_IDS = Object.keys(RESEARCH);

// Katzen-Rang (je Katze, dauerhaft): Stufe 1..10
export const RANK = {
  max: 10,
  dmg: 0.03, rate: 0.015,              // je Rang
  cost: r => r < 4 ? { coins: 200 + 250 * r } : { coins: 400 + 300 * r, crystals: 2 + (r - 3) * 3 },
  // Meilensteine
  perks: {
    3: { n: ['−8 % Einsatzkosten', '−8% placement cost'], key: 'cheap', val: 0.08 },
    5: { n: ['Spezialeffekte +15 %', 'Special effects +15%'], key: 'special', val: 0.15 },
    7: { n: ['+8 % Reichweite', '+8% range'], key: 'range', val: 0.08 },
    10: { n: ['+1 Trainingspunkt (6 statt 5)', '+1 training point (6 instead of 5)'], key: 'point', val: 1 }
  }
};

// ---------------------------------------------------------------- Tägliche Missionen
// stat = Zähler aus der Runden-Statistik; n = Ziel; täglich werden 3 gezogen.
export const MISSIONS = [
  { id: 'kill', stat: 'kills', n: [200, 350, 500], t: ['Besiege {n} Hunde', 'Defeat {n} dogs'], r: { coins: 300 } },
  { id: 'win', stat: 'wins', n: [1, 2, 2], t: ['Gewinne {n} Map(s)', 'Win {n} map(s)'], r: { coins: 250, crystals: 3 } },
  { id: 'boss', stat: 'bossKills', n: [1, 2, 3], t: ['Besiege {n} Boss(e)', 'Defeat {n} boss(es)'], r: { crystals: 4 } },
  { id: 'power', stat: 'powerUsed', n: [2, 3, 4], t: ['Verwende {n} Power-ups', 'Use {n} power-ups'], r: { power: 2 } },
  { id: 'waves', stat: 'waves', n: [25, 40, 60], t: ['Überstehe {n} Wellen', 'Survive {n} waves'], r: { coins: 280, xp: 80 } },
  { id: 'flawless', stat: 'cleanWins', n: [1, 1, 1], t: ['Gewinne mit höchstens 5 verlorenen Leben', 'Win while losing at most 5 lives'], r: { crystals: 5 } },
  { id: 'coop', stat: 'mpGames', n: [1, 1, 2], t: ['Spiele {n} Koop-Runde(n)', 'Play {n} co-op round(s)'], r: { coins: 300, crystals: 2 } },
  { id: 'place', stat: 'placed', n: [15, 25, 40], t: ['Setze {n} Katzen ein', 'Deploy {n} cats'], r: { coins: 220 } },
  { id: 'upgrade', stat: 'upgrades', n: [15, 25, 40], t: ['Kaufe {n} Upgrades in Runden', 'Buy {n} upgrades in rounds'], r: { coins: 240, xp: 60 } },
  { id: 'hard', stat: 'hardWins', n: [1, 1, 1], t: ['Gewinne eine Map auf Schwer', 'Win a map on Hard'], r: { crystals: 8 }, lvl: 6 },
  { id: 'elite', stat: 'eliteKills', n: [5, 10, 20], t: ['Besiege {n} Elite-Hunde', 'Defeat {n} elite dogs'], r: { coins: 260, crystals: 2 }, lvl: 5 }
];

// ---------------------------------------------------------------- Erfolge (Stufen)
// stat = Gesamt-Statistik; n = Schwellen; r = Kristalle je Stufe
export const ACHIEVEMENTS = [
  { id: 'hunter', stat: 'kills', n: [1000, 10000, 50000], t: [['Dog Hunter', 'Pack Destroyer', 'Hundeschreck'], ['Dog Hunter', 'Pack Destroyer', 'Dog Terror']], d: ['Besiege {n} Hunde', 'Defeat {n} dogs'], r: [5, 15, 40] },
  { id: 'wins', stat: 'wins', n: [1, 10, 50], t: [['Erster Sieg', 'Veteran', 'Feldmarschall'], ['First Win', 'Veteran', 'Field Marshal']], d: ['Gewinne {n} Maps', 'Win {n} maps'], r: [3, 10, 30] },
  { id: 'untouch', stat: 'perfectWins', n: [1, 5, 20], t: [['Untouchable', 'Makellos', 'Unantastbar'], ['Untouchable', 'Flawless', 'Invincible']], d: ['Gewinne {n}× ohne Lebensverlust', 'Win {n}× without losing a life'], r: [5, 12, 30] },
  { id: 'team', stat: 'mpWins', n: [1, 10, 30], t: [['Teamkatze', 'Team Player', 'Rudelführer'], ['Team Cat', 'Team Player', 'Squad Leader']], d: ['Gewinne {n} Koop-Spiele', 'Win {n} co-op games'], r: [5, 15, 30] },
  { id: 'legend', stat: 'legendOwned', n: [1, 2], t: [['Legendary', 'Mythisch'], ['Legendary', 'Mythic']], d: ['Schalte {n} legendäre Katze(n) frei', 'Unlock {n} legendary cat(s)'], r: [20, 40] },
  { id: 'boss', stat: 'bossKills', n: [1, 25, 100], t: [['Boss-Bezwinger', 'Boss-Jäger', 'Königsmörder'], ['Boss Slayer', 'Boss Hunter', 'Kingslayer']], d: ['Besiege {n} Bosse', 'Defeat {n} bosses'], r: [3, 12, 30] },
  { id: 'hard', stat: 'hardWins', n: [1, 5, 10], t: [['Harter Hund', 'Stahlkralle', 'Meister aller Maps'], ['Tough Cookie', 'Steel Claw', 'Master of Maps']], d: ['Gewinne {n} Maps auf Schwer', 'Win {n} maps on Hard'], r: [8, 20, 50] },
  { id: 'collector', stat: 'catsOwned', n: [5, 10, 19], t: [['Sammler', 'Katzenfreund', 'Vollständiges Rudel'], ['Collector', 'Cat Lover', 'Full Clowder']], d: ['Besitze {n} Katzen', 'Own {n} cats'], r: [3, 10, 30] },
  { id: 'level', stat: 'level', n: [5, 20, 50], t: [['Rekrut', 'Offizier', 'General'], ['Recruit', 'Officer', 'General']], d: ['Erreiche Level {n}', 'Reach level {n}'], r: [3, 12, 40] },
  { id: 'endless', stat: 'bestEndless', n: [40, 60, 100], t: [['Durchhalter', 'Marathon', 'Unendlich'], ['Survivor', 'Marathon', 'Infinite']], d: ['Erreiche Welle {n} im Endlos-Modus', 'Reach wave {n} in Endless mode'], r: [8, 20, 60] },
  { id: 'rich', stat: 'coinsEarned', n: [10000, 100000, 500000], t: [['Sparschwein', 'Schatzmeister', 'Tycoon'], ['Piggy Bank', 'Treasurer', 'Tycoon']], d: ['Verdiene insgesamt {n} Münzen', 'Earn {n} coins in total'], r: [3, 12, 30] },
  { id: 'scholar', stat: 'researchDone', n: [5, 25, 60], t: [['Schüler', 'Gelehrter', 'Professor'], ['Student', 'Scholar', 'Professor']], d: ['Schließe {n} Akademie-Stufen ab', 'Complete {n} academy levels'], r: [3, 12, 30] },
  { id: 'power', stat: 'powerUsed', n: [10, 100], t: [['Trickkiste', 'Zauberkater'], ['Bag of Tricks', 'Wizard Cat']], d: ['Verwende {n} Power-ups', 'Use {n} power-ups'], r: [3, 12] },
  { id: 'streak', stat: 'bestStreak', n: [7, 30], t: [['Stammgast', 'Treue Seele'], ['Regular', 'Loyal Soul']], d: ['Hole {n} Tage in Folge die tägliche Belohnung', 'Claim the daily reward {n} days in a row'], r: [5, 25] }
];

// ---------------------------------------------------------------- Tägliche Belohnung (7-Tage-Zyklus)
export const DAILY = [
  { coins: 200 }, { crystals: 3 }, { power: 2 }, { coins: 400 }, { crystals: 5 }, { power: 3 }, { coins: 800, crystals: 12, power: 2 }
];
export const DAILY_HOURS = 20;   // Stunden bis zur nächsten Belohnung
export const STREAK_BREAK = 48;  // danach beginnt die Serie neu

// ---------------------------------------------------------------- weitere Level-Freischaltungen
export const FEATURES = [
  { lvl: 3, n: ['Katzen-Akademie: Ränge', 'Cat Academy: Ranks'] },
  { lvl: 6, n: ['Schwierigkeit „Schwer“', 'Difficulty "Hard"'] },
  { lvl: 10, n: ['Endlos-Modus', 'Endless mode'] },
  { lvl: 35, n: ['Legendäre Katzen', 'Legendary cats'] }
];
