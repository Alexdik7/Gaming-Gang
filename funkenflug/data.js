/*
 * Funkenflug – Inhalte als Daten (Schwierigkeiten, Welten, Figuren, Kopfschmuck, Missionen, Power-Ups).
 * Neue Inhalte = neuer Eintrag hier, kein neuer Code nötig.
 */
window.FUNKENFLUG_DATA = (() => {
  'use strict';

  // Schwierigkeiten. speed/gap/shift: [Start, Maximum]. power = Chance pro Säule (nach Abklingzeit).
  // mult = Splitter-Wert · perfect = erlaubte Abweichung von der Lückenmitte (Anteil der Lücke)
  const DIFFS = [
    { id: 'easy', name: 'Leicht', color: '#5ef2d6', desc: 'Entspannt fliegen', gravity: 1350, flap: -410, speed: [135, 225], gap: [210, 165], shift: [100, 170], power: 0.12, mult: 1, perfect: 0.35 },
    { id: 'normal', name: 'Mittel', color: '#ffb53d', desc: 'Der klassische Flug', gravity: 1550, flap: -440, speed: [155, 270], gap: [182, 140], shift: [120, 200], power: 0.10, mult: 1, perfect: 0.3 },
    { id: 'hard', name: 'Schwer', color: '#ff7a59', desc: 'Schnell und eng', gravity: 1650, flap: -455, speed: [185, 305], gap: [162, 128], shift: [120, 190], power: 0.08, mult: 2, perfect: 0.28 },
    { id: 'hardcore', name: 'Hardcore', color: '#ff4a6a', desc: 'Keine Power-Ups, keine Gnade', gravity: 1750, flap: -470, speed: [215, 335], gap: [145, 120], shift: [110, 175], power: 0, mult: 3, perfect: 0.25 }
  ];

  // Alle 25 Punkte wechselt die Welt (danach beginnt der Kreis von vorn).
  // sky: 4 Verlaufsfarben von oben nach unten · cloud/aurora: [Farbe, Deckkraft]
  const WORLDS = [
    {
      name: 'Abendhimmel', body: 'planet', stars: 1, islands: true, ambient: null,
      sky: ['#140f35', '#47298a', '#c45a9a', '#ffb07a'],
      ridge1: '#3a2470', ridge2: '#2c1a5a',
      cloud: ['#ffe1f0', 0.22], aurora: [['#ff78c8', 0.08], ['#5ef2d6', 0.09]],
      ground: { soil: ['#5a338f', '#1e1440'], moss: ['#3fb98a', '#7ef0c0'], deco: 'mushroom' },
      pillars: [['#d8c2ff', '#9b6cf5', '#4b2aa8', '#efe6ff'], ['#b9fff3', '#3fd0c0', '#17707f', '#e6fffb'], ['#ffd0ea', '#f07ab8', '#9c2f72', '#fff0f8']]
    },
    {
      name: 'Frostgrotte', body: 'moon', stars: 0.6, islands: true, ambient: 'snow',
      sky: ['#0b1e3a', '#1f5a8a', '#7cc4e0', '#e6f6ff'],
      ridge1: '#3c6f9c', ridge2: '#285580',
      cloud: ['#f0faff', 0.35], aurora: [['#78ffdc', 0.10], ['#8cb4ff', 0.10]],
      ground: { soil: ['#5f8fc0', '#1d3558'], moss: ['#bfe8ff', '#ffffff'], deco: 'icicle' },
      pillars: [['#e8fbff', '#8fd8f5', '#3b7fb0', '#ffffff'], ['#d6e4ff', '#8fa8f0', '#3d4fa0', '#f2f6ff'], ['#d9fff6', '#7fe0cc', '#2c8a80', '#f0fffb']]
    },
    {
      name: 'Glutberge', body: 'sun', stars: 0.25, islands: false, ambient: 'ember',
      sky: ['#1a0a12', '#4a1420', '#b8402a', '#ffb050'],
      ridge1: '#3a1418', ridge2: '#250c10',
      cloud: ['#3c1e1e', 0.35], aurora: [['#ff7828', 0.07], ['#ff3c3c', 0.06]],
      ground: { soil: ['#3a1a1a', '#120606'], moss: ['#ff6a2a', '#ffc04a'], deco: 'ember' },
      pillars: [['#ffcf8a', '#ff7a2a', '#8a2410', '#fff0c8'], ['#ffb0a0', '#e04a4a', '#701818', '#ffe0d8'], ['#ffe28a', '#f0a020', '#8a5010', '#fff6d0']]
    },
    {
      name: 'Sternenmeer', body: 'galaxy', stars: 1, islands: false, ambient: 'comet',
      sky: ['#02020c', '#0c0a2a', '#2a1a5a', '#5a3a8a'],
      ridge1: '#1a1640', ridge2: '#110e2c',
      cloud: ['#8c78ff', 0.12], aurora: [['#a064ff', 0.10], ['#50c8ff', 0.08]],
      ground: { soil: ['#4a4660', '#16141f'], moss: ['#9a96b8', '#d0ccee'], deco: 'crater' },
      pillars: [['#f0e0ff', '#b080ff', '#4a2a90', '#ffffff'], ['#d0f0ff', '#60b0ff', '#203a90', '#f0faff'], ['#ffe0f8', '#ff80d0', '#902a70', '#fff0fa']]
    }
  ];

  const RARITY = {
    common: { name: 'Gewöhnlich', color: '#c9bfe6' },
    rare: { name: 'Selten', color: '#5ec8f2' },
    epic: { name: 'Episch', color: '#c07aff' },
    legend: { name: 'Legendär', color: '#ffb53d' }
  };

  // Figuren: rein optisch (faire Runden für alle). wing/glow = "r,g,b". Kauf im täglichen Shop.
  const SKINS = [
    { id: 'pip', name: 'Pip', price: 0, rarity: 'common', body: ['#9dfbe9', '#1fae9b'], lamp: '#ffb53d', core: '#fff1b8', nose: '#ff7a59', wing: '225,250,255', glow: '255,190,80', acc: null },
    { id: 'glut', name: 'Glut', price: 80, rarity: 'common', body: ['#ffc08a', '#e0542a'], lamp: '#ff4a3a', core: '#ffe08a', nose: '#ffd040', wing: '255,220,190', glow: '255,110,60', acc: 'horns' },
    { id: 'kiwi', name: 'Kiwi', price: 90, rarity: 'common', body: ['#d8ff9a', '#5ab83a'], lamp: '#ffe14a', core: '#fffbd0', nose: '#ff9a3a', wing: '235,255,215', glow: '230,255,120', acc: null },
    { id: 'ozean', name: 'Ozean', price: 140, rarity: 'rare', body: ['#a8e0ff', '#2a7ae0'], lamp: '#5ef2d6', core: '#e0fffa', nose: '#ffd040', wing: '210,240,255', glow: '94,242,214', acc: null },
    { id: 'frost', name: 'Frosti', price: 160, rarity: 'rare', body: ['#eaf8ff', '#7ab8e8'], lamp: '#8fe8ff', core: '#ffffff', nose: '#5a8ae0', wing: '230,245,255', glow: '150,220,255', acc: 'scarf' },
    { id: 'kirsche', name: 'Kirsche', price: 180, rarity: 'rare', body: ['#ffc0d0', '#e03a6a'], lamp: '#ff4a6a', core: '#ffe0e8', nose: '#ffd040', wing: '255,225,235', glow: '255,90,130', acc: null },
    { id: 'nova', name: 'Nova', price: 300, rarity: 'epic', body: ['#e0b8ff', '#8a4ae0'], lamp: '#ff7ad0', core: '#ffe0f4', nose: '#ffd040', wing: '240,220,255', glow: '255,120,220', acc: 'star' },
    { id: 'mondi', name: 'Mondi', price: 350, rarity: 'epic', body: ['#f4f4ff', '#9aa0d0'], lamp: '#c0c8ff', core: '#ffffff', nose: '#8a7ad0', wing: '240,240,255', glow: '190,200,255', acc: null },
    { id: 'lava', name: 'Lava', price: 420, rarity: 'epic', body: ['#5a3030', '#1a0808'], lamp: '#ff6a2a', core: '#ffd27a', nose: '#ff6a2a', wing: '255,180,140', glow: '255,110,40', acc: 'horns' },
    { id: 'gold', name: 'Goldi', price: 600, rarity: 'legend', body: ['#fff0a0', '#e0a020'], lamp: '#ffffff', core: '#fff8d0', nose: '#ff7a59', wing: '255,245,200', glow: '255,230,120', acc: 'crown' },
    { id: 'umbra', name: 'Umbra', price: 800, rarity: 'legend', body: ['#5a5478', '#1e1a30'], lamp: '#5ef2d6', core: '#e0fffa', nose: '#5ef2d6', wing: '160,255,240', glow: '94,242,214', acc: 'visor' },
    { id: 'prisma', name: 'Prisma', price: 950, rarity: 'legend', body: ['#ffffff', '#cccccc'], lamp: '#ffffff', core: '#ffffff', nose: '#ffd040', wing: '255,255,255', glow: '255,255,255', acc: null, rainbow: true }
  ];

  // Kopfschmuck (wird in game.js → drawHat gezeichnet)
  const HATS = [
    { id: 'party', name: 'Partyhut', price: 60, rarity: 'common' },
    { id: 'flower', name: 'Blüte', price: 70, rarity: 'common' },
    { id: 'beanie', name: 'Bommelmütze', price: 80, rarity: 'common' },
    { id: 'cap', name: 'Basecap', price: 90, rarity: 'common' },
    { id: 'catears', name: 'Katzenohren', price: 150, rarity: 'rare' },
    { id: 'chef', name: 'Kochmütze', price: 160, rarity: 'rare' },
    { id: 'headphones', name: 'Kopfhörer', price: 180, rarity: 'rare' },
    { id: 'propeller', name: 'Propellermütze', price: 220, rarity: 'rare' },
    { id: 'tophat', name: 'Zylinder', price: 300, rarity: 'epic' },
    { id: 'pirate', name: 'Piratenhut', price: 340, rarity: 'epic' },
    { id: 'viking', name: 'Wikingerhelm', price: 380, rarity: 'epic' },
    { id: 'wizard', name: 'Zauberhut', price: 550, rarity: 'legend' },
    { id: 'halo', name: 'Heiligenschein', price: 650, rarity: 'legend' },
    { id: 'diadem', name: 'Sternendiadem', price: 800, rarity: 'legend' }
  ];

  // Tagesmissionen: jeden Tag werden 3 mit unterschiedlicher Statistik ausgelost.
  // run: true = bester Wert einer Runde zählt · false = Summe des Tages
  const MISSIONS = [
    { id: 's10', text: 'Erreiche 10 Punkte in einer Runde', stat: 'score', run: true, goal: 10, reward: 25 },
    { id: 's20', text: 'Erreiche 20 Punkte in einer Runde', stat: 'score', run: true, goal: 20, reward: 45 },
    { id: 'w2', text: 'Erreiche die Frostgrotte (25 Punkte)', stat: 'score', run: true, goal: 25, reward: 60 },
    { id: 'c3', text: 'Schaffe eine Combo ×3', stat: 'combo', run: true, goal: 3, reward: 30 },
    { id: 'c5', text: 'Schaffe eine Combo ×5', stat: 'combo', run: true, goal: 5, reward: 50 },
    { id: 'p8', text: '8 Perfekt-Durchflüge heute', stat: 'perfect', run: false, goal: 8, reward: 35 },
    { id: 'sh40', text: 'Sammle heute 40 Splitter', stat: 'shards', run: false, goal: 40, reward: 30 },
    { id: 'pw2', text: 'Sammle heute 2 Power-Ups', stat: 'powers', run: false, goal: 2, reward: 30 },
    { id: 'r5', text: 'Spiele heute 5 Runden', stat: 'runs', run: false, goal: 5, reward: 20 },
    { id: 'bon1', text: 'Fliege durch ein Bonus-Portal', stat: 'bonus', run: false, goal: 1, reward: 40 },
    { id: 'hs10', text: '10 Punkte auf Schwer oder Hardcore', stat: 'hardScore', run: true, goal: 10, reward: 55 }
  ];

  // dur in Sekunden (Echtzeit); Schild hält bis zum nächsten Treffer
  const POWERS = {
    shield: { name: 'Schild', icon: '🛡️', dur: 0, color: '#5ef2d6' },
    slow: { name: 'Zeitlupe', icon: '⏳', dur: 5, color: '#8fb8ff' },
    magnet: { name: 'Magnet', icon: '🧲', dur: 8, color: '#ff8ac4' }
  };

  // Bonus-Level: säulenfreie Phase mit Splitter-Wellen
  const BONUS = { dur: 9, mult: 3, minPassed: 6, cooldown: 14, chance: 0.12 };

  return { DIFFS, WORLDS, RARITY, SKINS, HATS, MISSIONS, POWERS, BONUS };
})();
