// BEASTFORGE – alle Balance-Regler an EINEM Ort. Keine Zahlen in der Logik verstreuen.
export const VERSION = '0.54.0';

export const BAL = {
  tick: 1 / 60,               // fester Simulationsschritt (s)
  maxSubsteps: 12,            // pro Bild höchstens so viele Schritte (3× Tempo bleibt stabil)

  run: {
    sellRefund: 0.7,          // Verkauf: 70 % aller Ausgaben zurück
    waveBonus: w => 130 + 28 * w,           // Münzen am Wellenende
    earlyCall: w => 20 + 4 * w,            // Bonus für frühes Rufen der nächsten Welle
    rockClear: 150,           // Felsbrocken räumen
    highRange: 0.15,          // Anhöhe: +15 % Reichweite
    synergyRange: 3.2,        // Abstand für Synergien (Felder)
    maxTowers: 40,
    knockCap: 4,
    ascendCost: 40,           // Ahnenform: Kosten = Kaufpreis × 40
    mega: { cost: 14, kills: 100, lvl: 20 },
    megaAtk: { cd: [6, 8, 5], zornMul: 6, zornR: 1.7, bannMul: 2, bannStun: 1.4, bannBoss: 0.4, klingeMul: 4, klingeN: 6 },   // Mega-Spezialattacken: A Zornschlag · B Bannkreis · C Klingensturm
    megaFuse: { cost: 7, kills: 150, lvl: 25 },   // Mega-Fusion: Kosten = Fusions-Kaufpreis (A+B) × 7   // Mega-Form: Kosten = Kaufpreis × 14, Besiegte im Run, Charakter-Level
              // Rückstoß insgesamt pro Gegner (Felder)
    packR: 1.35,              // Rudel: Kreaturen bis zu diesem Abstand gelten als Nachbarn (zusammenhängende Gruppe)
    packDmg: 0.06, packRate: 0.025, // je weiterer Kreatur im Rudel: ×1,06 Schaden, ×1,025 Tempo – multiplikativ, OHNE Obergrenze
    dmgMul: 1.35,             // globaler Schaden aller Kreaturen/Helden (Spieltest v0.16: zu schwach)
  },

  // Schwierigkeiten: Run-Werte und Fortschritts-Multiplikatoren getrennt
  diff: {
    normal:  { name: 'Normal',   start: 800, lives: 150, hp: 1.00, speed: 1.00, coins: 1.00, xp: 1.0, acc: 1.0, waves: 20 },
    hard:    { name: 'Schwer',   start: 850, lives: 100, hp: 1.3, speed: 1.05, coins: 0.95, xp: 1.5, acc: 1.4, waves: 40 },
    master:  { name: 'Meister',  start: 900, lives: 100, hp: 1.3, speed: 1.08, coins: 0.95, xp: 2.0, acc: 1.8, waves: 60 },
    endless: { name: 'Endlos',   start: 800, lives: 150, hp: 1.00, speed: 1.00, coins: 1.00, xp: 1.15, acc: 1.1, waves: Infinity },
  },
  hpScale: w => 1 + 0.085 * (w - 1) + 0.0034 * (w - 1) ** 2,   // Gegner-KP je Welle
  endlessScale: w => w <= 60 ? 1 : 1 + 0.09 * (w - 60) + 0.004 * (w - 60) ** 2,   // Endlos ab Welle 61
  lateCoins: w => w <= 20 ? 1 : 1 + 0.035 * (w - 20),   // Spätspiel: Belohnungen wachsen mit (Welle 60: ×2,4)
  miniScale: w => Math.max(1, (1 + 0.085 * (w - 1) + 0.0034 * (w - 1) ** 2) / 2.04),   // Mini-Bosse wachsen ab Welle 10 mit

  // Kreuzpfade: ein Pfad bis 5, ein zweiter bis 2, der dritte bleibt zu
  cross: { main: 5, second: 2 },
  boss: { tele: 1.6, weakMul: 0.6, breakPct: 0.035, stagger: 1.5 },   // Bosse 2.0: Vorwarnung (s), Schwachpunkt +60 %, Unterbrechen ab 3,5 % Max-KP Schaden, Taumeln (s)
  combo: { window: 1.4, steps: [10, 25, 50, 100, 200], coins: [15, 40, 100, 250, 600], cdr: [0, 1, 2, 3, 4], show: 5 },   // Combo: Kills in Folge (Zeitfenster s), Belohnung je Stufe, Fähigkeiten-Abklingzeit −s
  coop: { linkR: 2.2, linkDmg: 0.1, linkRate: 0.06 },   // Seelenband: Kreaturen verschiedener Spieler nahe beieinander
  rush: { start: 7500, lives: 100, hp: 0.65, gold: [5000, 7500, 10000, 13000, 15000] },   // Boss-Rush: Start-Kasse, Boss-KP-Faktor, Kriegskasse nach Boss n
  power: { cd: 1.5, bomb: 500, bombWave: 70, bombR: 2.4, gold: 250, goldWave: 25 },   // Kräfte (data/powers.js)

  // ---- SYSTEM B: Charakter-XP (pro Kreatur, dauerhaft) ----
  char: {
    maxLevel: 50,
    need: L => Math.round(120 + 70 * Math.pow(L, 1.45)),     // XP von L nach L+1
    waveScale: 0.07,          // spätere Wellen geben mehr XP
    expected: w => 2 + w * 1.55,  // „angemessenes“ Level für eine Welle
    dimStep: 0.07,            // je Level über Erwartung −7 % …
    dimFloor: 0.15,           // … aber nie unter 15 %
    survive: w => 4 + 1.2 * w,    // XP je eingesetzter Kreatur pro überstandener Welle
    winBonus: 0.25,           // Sieg: +25 % der Run-XP
    bossMul: 1.0,
  },

  // ---- SYSTEM C: Konto-XP (Spieler, dauerhaft) ----
  acc: {
    maxLevel: 100,
    need: L => Math.round(380 + 120 * Math.pow(L, 1.3)),
    wave: w => 8 + 2 * w,
    win: 300, bossKill: 150, miniBoss: 50, charLevelUp: 20, firstMapClear: 400,
  },

  // Held (Kairo): Level IM Run (1–20) + dauerhafter Rang
  hero: {
    cost: 450,
    maxLevel: 20,
    need: L => Math.round(55 * Math.pow(L, 1.45)),   // In-Run-XP
    perLevel: 0.06,             // +6 % Schaden je Level
    dmgXp: 0.3,                // In-Run-XP je Schadenspunkt
    waveXp: w => 25 + 6 * w,
    rankNeed: L => Math.round(300 + 140 * Math.pow(L, 1.3)),  // dauerhafter Rang
    rankMax: 30,
  },

  // Mastery: Meisterpunkte (Siege mit der Kreatur + Bosskills)
  mastery: [0, 1, 4, 10, 22, 45],

  // Elemente: Status hält so lange; Reaktion pro Gegner höchstens alle x s
  elem: { mark: 3.0, reactCd: 1.2, chainWin: 2.5, chainMul: 0.25 },   // Kettenreaktion: Fenster (s), +25 % je weitere Reaktion

  ability: { slowMo: 0.3, slowMoTime: 0.45 },
};

// Permanente Level-Boni für ALLE Kreaturen (klein halten!)
export const LEVEL_PERKS = [
  { lvl: 3,  name: '+2 % Schaden',         fx: { mul: { dmg: 1.02 } } },
  { lvl: 8,  name: 'Aktive Fähigkeit',     ability: true },
  { lvl: 10, name: '+3 % Angriffstempo',   fx: { mul: { rate: 1.03 } } },
  { lvl: 15, name: '+5 % Reichweite',      fx: { mul: { range: 1.05 } } },
  { lvl: 20, name: 'Passive I',            passive: 20 },
  { lvl: 25, name: '+5 % Charakter-XP',    xp: 0.05 },
  { lvl: 30, name: '+8 % Bossschaden',     fx: { mul: { bossMul: 1.08 } } },
  { lvl: 35, name: '+5 % Krit-Chance',     fx: { add: { 'crit.ch': 0.05 } } },
  { lvl: 40, name: 'Passive II',           passive: 40 },
  { lvl: 45, name: '+4 % Schaden',         fx: { mul: { dmg: 1.04 } } },
  { lvl: 50, name: 'Meister-Passive',      passive: 50 },
];
