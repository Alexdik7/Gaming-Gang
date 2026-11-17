// Elementreaktionen, Synergien, Konto-Belohnungen, Erfolge – alles Daten.

// Reaktion: Gegner trägt Element-Mal A, Treffer mit Element B (Schlüssel alphabetisch sortiert)
export const REACTIONS = {
  'fire+lightning':   { name: 'Plasma',       color: '#ffb84d', aoe: 1.3, aoeMul: 0.6, desc: 'Explosion trifft Gegner in der Nähe.' },
  'fire+spirit':      { name: 'Seelenfeuer',  color: '#7df3ff', burnMul: 3, desc: 'Starker Brand, der Panzer ignoriert.' },
  'shadow+spirit':    { name: 'Seelenraub',   color: '#d07bff', bonus: 0.6, coins: 2, desc: '+60 % Schaden, +2 Münzen.' },
  'earth+lightning':  { name: 'Magnetbruch',  color: '#ffe14d', brk: 4, desc: 'Panzer bricht für 4 s.' },
  'earth+fire':       { name: 'Magma',        color: '#ff5a2a', bonus: 0.3, slow: [0.4, 2], desc: '+30 % Schaden, verlangsamt.' },
  'light+shadow':     { name: 'Zwielicht',    color: '#fff2a8', bonus: 0.4, stun: 0.6, desc: '+40 % Schaden, betäubt kurz.' },
  'lightning+spirit': { name: 'Geistblitz',   color: '#a9f6ff', aoe: 1.6, aoeMul: 0.4, desc: 'Blitz springt auf Nahe über.' },
};

// Synergien: zwei Kreaturen im Abstand ≤ BAL.run.synergyRange
export const SYNERGIES = [
  { id: 'seelenhain', a: 'kitsune', b: 'deer',   name: 'Seelenhain',    desc: 'Kitsune: +1 Geist-Orb · Hirsch: Aura +3 % Tempo', fxA: { add: { 'orbs.n': 1, 'orbs.dmg': 4 } }, fxB: { add: { 'support.rate': 0.03 } } },
  { id: 'sturmpanzer', a: 'tiger', b: 'turtle',  name: 'Sturmpanzer',   desc: 'Tiger: Kette +1 · Schildkröte: +8 % Betäubung', fxA: { add: { 'chain.n': 1 } }, fxB: { add: { 'stun.ch': 0.08, 'stun.dur': 0.5 } } },
  { id: 'schattenfuchs', a: 'kitsune', b: 'raven', name: 'Schattenfuchs', desc: 'Kitsune erkennt Getarnte · Rabe: +5 % Krit', fxA: { set: { camo: true } }, fxB: { add: { 'crit.ch': 0.05 } } },
  { id: 'gewitternacht', a: 'tiger', b: 'raven', name: 'Gewitternacht', desc: 'Tiger: +0,3 Reichweite · Rabe: Krits +0,5×', fxA: { add: { range: 0.3 } }, fxB: { add: { 'crit.mult': 0.5 } } },
  { id: 'waldquelle', a: 'deer', b: 'turtle',    name: 'Waldquelle',    desc: 'Hirsch: +15 Münzen/Welle · Schildkröte: +0,2 Reichweite', fxA: { add: { income: 15 } }, fxB: { add: { range: 0.2 } } },
  { id: 'fuchsbund', a: 'kairo', b: 'kitsune',   name: 'Fuchsbund',     desc: 'Kairo und Kitsune: +10 % Schaden', fxA: { mul: { dmg: 1.1 } }, fxB: { mul: { dmg: 1.1 } } },
];

// Konto-Level → Freischaltungen (wird abgeleitet, nicht gespeichert)
export const ACCOUNT_REWARDS = [
  { lvl: 1,  type: 'creature', id: 'kitsune', text: 'Kitsune' },
  { lvl: 1,  type: 'creature', id: 'turtle',  text: 'Eisenschildkröte' },
  { lvl: 1,  type: 'creature', id: 'raven',   text: 'Schattenrabe' },
  { lvl: 2,  type: 'hero',     id: 'kairo',   text: 'Held: Kairo, der Fuchs-Shinobi' },
  { lvl: 3,  type: 'creature', id: 'tiger',   text: 'Donnertiger' },
  { lvl: 4,  type: 'creature', id: 'deer',    text: 'Geisthirsch' },
  { lvl: 5,  type: 'mode',     id: 'hard',    text: 'Schwierigkeit: Schwer' },
  { lvl: 6,  type: 'frame',    id: 'bronze',  text: 'Porträtrahmen: Bronze' },
  { lvl: 7,  type: 'mode',     id: 'endless', text: 'Modus: Endlos' },
  { lvl: 8,  type: 'title',    id: 'warden',  text: 'Titel: Hainwächter' },
  { lvl: 10, type: 'frame',    id: 'silver',  text: 'Porträtrahmen: Silber' },
  { lvl: 12, type: 'title',    id: 'shinobi', text: 'Titel: Schatten-Shinobi' },
  { lvl: 15, type: 'frame',    id: 'gold',    text: 'Porträtrahmen: Gold' },
  { lvl: 20, type: 'title',    id: 'legend',  text: 'Titel: Legende des Hains' },
  { lvl: 25, type: 'frame',    id: 'astral',  text: 'Porträtrahmen: Astral' },
];
export const FRAMES = { none: '#3a4256', bronze: '#c98a4b', silver: '#cfd8e6', gold: '#ffd257', astral: '#9fb4ff' };
export const TITLES = { none: 'Neuling', warden: 'Hainwächter', shinobi: 'Schatten-Shinobi', legend: 'Legende des Hains' };

// Erfolge: stat = Zähler in profile.stats, oder get(p) für abgeleitete Werte
export const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'Erstes Blut', desc: 'Besiege deinen ersten Gegner.', stat: 'kills', goal: 1, xp: 50 },
  { id: 'hunter', name: 'Jäger des Hains', desc: 'Besiege 500 Gegner.', stat: 'kills', goal: 500, xp: 150 },
  { id: 'slayer', name: 'Schlächter', desc: 'Besiege 5.000 Gegner.', stat: 'kills', goal: 5000, xp: 500 },
  { id: 'first_win', name: 'Hüter des Schreins', desc: 'Gewinne deinen ersten Run.', stat: 'wins', goal: 1, xp: 200 },
  { id: 'veteran', name: 'Veteran', desc: 'Gewinne 10 Runs.', stat: 'wins', goal: 10, xp: 400 },
  { id: 'boss_slayer', name: 'Bosstöter', desc: 'Besiege Vharox, den Abgrunddrachen.', stat: 'bossKills', goal: 1, xp: 300 },
  { id: 'dragon_bane', name: 'Drachenbann', desc: 'Besiege Vharox 10-mal.', stat: 'bossKills', goal: 10, xp: 600 },
  { id: 'oni', name: 'Oni-Jäger', desc: 'Besiege den Oni-Hauptmann.', stat: 'minibossKills', goal: 1, xp: 120 },
  { id: 'perfect', name: 'Perfekte Verteidigung', desc: 'Gewinne einen Run ohne ein Leben zu verlieren.', stat: 'perfect', goal: 1, xp: 300 },
  { id: 'hard_win', name: 'Nichts für Schwache', desc: 'Gewinne auf Schwer.', stat: 'winsHard', goal: 1, xp: 500 },
  { id: 'hard_perfect', name: 'Unberührbar', desc: 'Gewinne auf Schwer ohne Lebensverlust.', stat: 'perfectHard', goal: 1, xp: 800 },
  { id: 'endless30', name: 'Ausdauer', desc: 'Erreiche Welle 30 im Endlos-Modus.', stat: 'bestEndless', goal: 30, xp: 400 },
  { id: 'endless50', name: 'Unendlicher Wille', desc: 'Erreiche Welle 50 im Endlos-Modus.', stat: 'bestEndless', goal: 50, xp: 1000 },
  { id: 'waves100', name: '100 Wellen', desc: 'Überstehe insgesamt 100 Wellen.', stat: 'waves', goal: 100, xp: 250 },
  { id: 'waves1000', name: 'Tausend Wellen', desc: 'Überstehe insgesamt 1.000 Wellen.', stat: 'waves', goal: 1000, xp: 1000 },
  { id: 'evolve1', name: 'Verwandlung', desc: 'Entwickle eine Kreatur im Kampf.', stat: 'evolves', goal: 1, xp: 100 },
  { id: 'evolve_master', name: 'Evolutionsmeister', desc: 'Entwickle 50 Kreaturen im Kampf.', stat: 'evolves', goal: 50, xp: 500 },
  { id: 'ascension', name: 'Aufstieg', desc: 'Erwecke die Neunschweif-Wächterin im Kampf.', stat: 'ninetail', goal: 1, xp: 400 },
  { id: 'level10', name: 'Treue Gefährten', desc: 'Bringe eine Kreatur auf Level 10.', get: p => maxLevel(p), goal: 10, xp: 200 },
  { id: 'level30', name: 'Seelenbund', desc: 'Bringe eine Kreatur auf Level 30.', get: p => maxLevel(p), goal: 30, xp: 600 },
  { id: 'legend', name: 'Legende', desc: 'Bringe eine Kreatur auf Level 50.', get: p => maxLevel(p), goal: 50, xp: 1500 },
  { id: 'tier5', name: 'Höchste Kunst', desc: 'Kaufe ein Upgrade der Stufe 5.', stat: 't5', goal: 1, xp: 300 },
  { id: 'strategist', name: 'Meisterstratege', desc: 'Kaufe 10 Upgrades der Stufe 5.', stat: 't5', goal: 10, xp: 700 },
  { id: 'ability', name: 'Entfesselt', desc: 'Setze 25 Fähigkeiten ein.', stat: 'abilities', goal: 25, xp: 200 },
  { id: 'ult', name: 'Urteil der Neun', desc: 'Setze das Ultimate der Kitsune ein.', stat: 'ults', goal: 1, xp: 300 },
  { id: 'reactions', name: 'Elementarist', desc: 'Löse 100 Elementreaktionen aus.', stat: 'reactions', goal: 100, xp: 250 },
  { id: 'synergy', name: 'Im Einklang', desc: 'Aktiviere eine Synergie.', stat: 'synergies', goal: 1, xp: 100 },
  { id: 'allcreatures', name: 'Ganze Bande', desc: 'Setze alle 5 Kreaturen in einem Run ein.', stat: 'allFive', goal: 1, xp: 200 },
  { id: 'hero10', name: 'Shinobi-Ausbildung', desc: 'Bringe Kairo im Run auf Level 10.', stat: 'hero10', goal: 1, xp: 200 },
  { id: 'hero20', name: 'Neun Flammenschweife', desc: 'Erreiche Kairos Meisterform.', stat: 'hero20', goal: 1, xp: 600 },
  { id: 'rich', name: 'Schatzhüter', desc: 'Verdiene insgesamt 50.000 Münzen.', stat: 'coins', goal: 50000, xp: 300 },
  { id: 'economy', name: 'Tempelkasse', desc: 'Erhalte 5.000 Münzen durch Einkommen.', stat: 'income', goal: 5000, xp: 300 },
  { id: 'rocks', name: 'Platz da!', desc: 'Räume 3 Felsbrocken.', stat: 'rocks', goal: 3, xp: 80 },
  { id: 'crits', name: 'Kritische Masse', desc: 'Landet 1.000 kritische Treffer.', stat: 'crits', goal: 1000, xp: 250 },
  { id: 'mastery3', name: 'Meisterschaft', desc: 'Erreiche Mastery 3 mit einer Kreatur.', get: p => Math.max(0, ...Object.values(p.chars).map(c => c.mastery || 0)), goal: 3, xp: 500 },
  { id: 'account10', name: 'Aufsteiger', desc: 'Erreiche Konto-Level 10.', get: p => p.account.level, goal: 10, xp: 300 },
];
function maxLevel(p) { return Math.max(1, ...Object.values(p.chars).map(c => c.level)); }
