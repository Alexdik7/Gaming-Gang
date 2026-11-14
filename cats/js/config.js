// CATS TOWER DEFENSE – zentrale Balance-Werte.
// Alles, was die Schwierigkeit oder die Wirtschaft bestimmt, steht HIER (oder in js/data/*).
// Wer balancen will, ändert Zahlen in dieser Datei und startet `node cats/tools/balance.mjs`.

export const VERSION = '1.0.0';
export const GRID = { cols: 12, rows: 16 };

export const BALANCE = {
  // --- globale Regler (Spezifikation: zentral konfigurierbar) ---
  enemy_health_multiplier: 1,
  enemy_speed_multiplier: 1,
  enemy_spawn_multiplier: 1,
  enemy_armor_multiplier: 1,
  boss_multiplier: 1.6,
  // --- Wellen-Skalierung (nicht linear) ---
  wave_scaling: {
    hpLin: 0.13,        // +13 % LP je Welle …
    hpPowBase: 11,      // … plus ((w-1)/11)^2.2 obendrauf
    hpPow: 2.2,
    budgetBase: 7,      // Bedrohungs-Budget der Welle 1
    budgetLin: 3.0,     // + je Welle
    budgetPow: 1.22,    // w^1.22
    armorPer10: 0.25,   // Rüstung wächst je 10 Wellen um 25 %
    speedPer10: 0.03,   // Tempo wächst je 10 Wellen um 3 % (gedeckelt)
    speedCap: 1.25,
    rewardDecay: 0.085, // Futter je LP sinkt mit jeder Welle: Hunde werden schneller zäh als wertvoll
    bossEvery: 10,
    diffRamp: 12,       // Schwierigkeits-Faktor für LP wird erst bis Welle 12 voll wirksam (sanfter Einstieg)
    finalBoss: 1.25,    // der letzte Boss einer Map ist so viel zäher
    miniBoss: 0.55,     // der erste Boss (Welle 10) ist ein Mini-Boss
    bossHpPerCycle: 2.3 // Bosse der 2. Runde (Welle 60+) sind so viel zäher
  },
  // --- Runde ---
  startFish: 320,
  startLives: 20,
  waveBonus: w => 45 + 7 * w,     // Futter für eine geschaffte Welle
  sellRefund: 0.7,
  upgradePoints: 5,               // Trainingspunkte je Katze (3-2-0, 3-1-1, 2-2-1 …)
  maxTier: 3,
  maxLoadout: 6,
  powerSlots: 2,
  powerCooldown: 25,
  stunBossFactor: 0.3,            // Bosse werden nur 30 % so lange betäubt
  critMul: 2.5,
  minArmorDmg: 0.15,              // Rüstung lässt immer mindestens 15 % durch
  // --- Schwierigkeitsgrade ---
  difficulty: {
    easy:   { hp: 0.72, speed: 0.94, count: 0.9, waves: 20, lives: 25, fish: 1.15, coins: 0.7, xp: 0.7, crystals: 2,  minLevel: 1 },
    normal: { hp: 1.0,  speed: 1.0,  count: 1.0, waves: 30, lives: 20, fish: 1.0,  coins: 1.0, xp: 1.0, crystals: 5,  minLevel: 1 },
    hard:   { hp: 1.25, speed: 1.06, count: 1.05, waves: 40, lives: 15, fish: 0.95, coins: 1.55, xp: 1.5, crystals: 11, minLevel: 6 }
  },
  // --- Mehrspieler (Index = Spielerzahl − 1) ---
  multiplayer: {
    hp:     [1, 1.6, 2.2, 2.9],   // +60 % / +120 % / +190 % Gegnerstärke
    count:  [1, 1.15, 1.3, 1.45],
    boss:   [1, 1.8, 2.6, 3.4],
    fish:   [1, 0.72, 0.6, 0.52], // Anteil je Spieler am Futter
    reward: [1, 1.15, 1.25, 1.35] // Münzen/XP-Bonus für Koop
  },
  // --- Belohnungen nach der Runde ---
  reward: {
    coinsPerWave: 11, coinsPerKill: 0.12, winMul: 1.5,
    xpPerWave: 10, xpWin: 90,
    mapTier: 0.09,                // je Map-Stufe +9 %
    firstClearCrystals: 1,        // × Kristalle des Schwierigkeitsgrads zusätzlich
    bossCrystal: 1,               // je besiegtem Boss (ab Normal)
    endlessFrom: 10               // Spielerlevel für den Endlos-Modus
  },
  xpNeed: lvl => Math.round(100 + 45 * lvl + 3 * lvl * lvl),
  maxLevel: 100
};

export const DIFFS = ['easy', 'normal', 'hard'];
