// Hunde – reine Daten. Neuer Gegner = neuer Eintrag.
// hp/speed(Felder pro s)/armor = Grundwerte bei Welle 1 (Skalierung in sim/waves.js + config.js)
// cost = Bedrohungs-Punkte für den Wellen-Generator, from = früheste Welle, w = Häufigkeit
// Eigenschaften:
//   res:{typ:0..1}  Resistenz           shield: Schild-LP (Blitz ×2, Schatten ignoriert)
//   ccRes: 0..1     ignoriert Kontrolle  dodge: Ausweich-Chance gegen Geschosse
//   stealth         nur für Katzen mit „Entdecken“ sichtbar
//   burrow:[unten,oben] gräbt sich zyklisch ein (unangreifbar)
//   spawn:[typ,n]   hinterlässt Hunde    heal:[radius,%LP/s]   aura:[radius,tempo+]
//   douse: radius   löscht Brände        noKnock / noBurn / noSlow
//   abil: Boss-Fähigkeiten [{k:'stomp'|'summon'|'howl'|'phase'|'enrage'|'shield', …}]

export const DOGS = {
  mutt:    { n: ['Streuner', 'Mutt'], hp: 20, speed: 1.0, cost: 1, from: 1, w: 10, reward: 4,
             d: ['Ganz normaler Straßenhund.', 'A perfectly ordinary street dog.'],
             look: { c: '#c98d4f', c2: '#f3dcc0', ear: 'flop', size: 0.8 } },
  whippet: { n: ['Windhund', 'Whippet'], hp: 12, speed: 2.1, cost: 1.3, from: 3, w: 7, reward: 4,
             d: ['Sehr schnell, wenig Leben.', 'Very fast, low health.'],
             look: { c: '#b9bcc7', c2: '#eceef3', ear: 'back', size: 0.72, slim: true } },
  pug:     { n: ['Panzer-Mops', 'Armored Pug'], hp: 62, speed: 0.65, armor: 3, cost: 3.6, from: 6, w: 6, reward: 9,
             d: ['Langsam und gepanzert. Schwache Treffer prallen ab.', 'Slow and armored. Weak hits bounce off.'],
             look: { c: '#e0b98a', c2: '#3a2a22', ear: 'flop', size: 0.9, acc: 'armor', flat: true } },
  pack:    { n: ['Rudelhund', 'Pack Dog'], hp: 36, speed: 0.95, cost: 3.2, from: 8, w: 5, reward: 5, spawn: ['pup', 3],
             d: ['Hinterlässt drei Welpen, wenn er fällt.', 'Leaves three puppies behind when defeated.'],
             look: { c: '#8b6b4a', c2: '#d9c2a3', ear: 'point', size: 0.95, acc: 'backpack' } },
  pup:     { n: ['Welpe', 'Puppy'], hp: 7, speed: 1.5, cost: 0.5, from: 99, w: 0, reward: 1,
             d: ['Klein, flink, überall.', 'Small, quick, everywhere.'],
             look: { c: '#d8a868', c2: '#fff0d8', ear: 'flop', size: 0.5 } },
  sniffer: { n: ['Spürhund', 'Sniffer'], hp: 42, speed: 1.15, cost: 2.6, from: 9, w: 5, reward: 6, ccRes: 0.7,
             d: ['Folgt stur der Fährte: ignoriert Bremsen und Betäubung größtenteils.', 'Follows the scent: mostly ignores slows and stuns.'],
             look: { c: '#a0522d', c2: '#2b1d14', ear: 'long', size: 0.85, acc: 'hat' } },
  guard:   { n: ['Wachhund', 'Guard Dog'], hp: 30, speed: 0.9, shield: 40, cost: 3.6, from: 10, w: 5, reward: 8,
             d: ['Trägt einen Energieschild. Blitze knacken ihn doppelt so schnell.', 'Carries an energy shield. Lightning cracks it twice as fast.'],
             look: { c: '#3d3d4a', c2: '#c08a3a', ear: 'point', size: 0.92, acc: 'vest' } },
  chi:     { n: ['Chihuahua-Schwarm', 'Chihuahua Swarm'], hp: 6, speed: 2.3, cost: 0.55, from: 11, w: 4, reward: 1.5,
             d: ['Winzig, kläffend, in Massen.', 'Tiny, yappy, and many.'],
             look: { c: '#e8c48a', c2: '#fff4dd', ear: 'bat', size: 0.45 } },
  sneak:   { n: ['Schleichhund', 'Sneak Dog'], hp: 26, speed: 1.2, cost: 3.2, from: 12, w: 4, reward: 7, stealth: true,
             d: ['Getarnt. Nur Katzen mit „Entdecken“ können ihn angreifen.', 'Stealthed. Only cats with detection can attack it.'],
             look: { c: '#5d6b7a', c2: '#9fb0c2', ear: 'point', size: 0.8, acc: 'ghost' } },
  shiba:   { n: ['Ninja-Shiba', 'Ninja Shiba'], hp: 24, speed: 1.8, cost: 3.2, from: 13, w: 4, reward: 7, dodge: 0.4,
             d: ['Weicht 40 % aller Geschosse aus. Flächenschaden trifft immer.', 'Dodges 40% of projectiles. Area damage always hits.'],
             look: { c: '#e39a4a', c2: '#fff3e0', ear: 'point', size: 0.78, acc: 'mask' } },
  fire:    { n: ['Feuerwehrhund', 'Fire Dog'], hp: 55, speed: 1.0, cost: 3.8, from: 14, w: 4, reward: 8, res: { fire: 0.9 }, douse: 1.6,
             d: ['Fast feuerfest und löscht Brände bei Hunden in der Nähe.', 'Nearly fireproof and puts out burns on nearby dogs.'],
             look: { c: '#f4f4f4', c2: '#222', ear: 'flop', size: 0.9, acc: 'firehat', spots: true } },
  elite:   { n: ['Elite-Dobermann', 'Elite Doberman'], hp: 230, speed: 1.1, armor: 2, cost: 12, from: 15, w: 2, reward: 26, lives: 3, ccRes: 0.4, elite: true,
             d: ['Stark in allem. Kostet 3 Leben.', 'Strong at everything. Costs 3 lives.'],
             look: { c: '#2a2224', c2: '#b0703a', ear: 'crop', size: 1.08, acc: 'spikes' } },
  medic:   { n: ['Sani-Dackel', 'Medic Dachshund'], hp: 40, speed: 0.9, cost: 4.2, from: 16, w: 3, reward: 9, heal: [1.8, 0.05],
             d: ['Heilt Hunde in seiner Nähe. Zuerst ausschalten!', 'Heals dogs around it. Take it out first!'],
             look: { c: '#9a5a2e', c2: '#fff', ear: 'long', size: 0.7, acc: 'cross', long: true } },
  husky:   { n: ['Eis-Husky', 'Ice Husky'], hp: 52, speed: 1.4, cost: 3.8, from: 17, w: 3, reward: 8, res: { ice: 1 }, noSlow: true,
             d: ['Kälte macht ihm nichts: kann nicht gebremst werden.', 'Cold means nothing to it: cannot be slowed.'],
             look: { c: '#8fa3b8', c2: '#ffffff', ear: 'point', size: 0.9, acc: 'mask2' } },
  digger:  { n: ['Buddler-Terrier', 'Digger Terrier'], hp: 46, speed: 1.0, cost: 4.2, from: 18, w: 3, reward: 9, burrow: [2, 3.5],
             d: ['Gräbt sich immer wieder ein und ist dann nicht angreifbar.', 'Keeps burrowing and cannot be attacked while underground.'],
             look: { c: '#e9e2d2', c2: '#8a5a3a', ear: 'fold', size: 0.72, acc: 'miner' } },
  bernard: { n: ['Bernhardiner', 'St. Bernard'], hp: 430, speed: 0.5, cost: 14, from: 19, w: 2, reward: 30, lives: 5, noKnock: true,
             d: ['Ein wandelnder Berg. Kostet 5 Leben, lässt sich nicht wegstoßen.', 'A walking mountain. Costs 5 lives, cannot be knocked back.'],
             look: { c: '#b5651d', c2: '#fff', ear: 'flop', size: 1.3, acc: 'barrel' } },
  drummer: { n: ['Trommel-Pudel', 'Drummer Poodle'], hp: 50, speed: 1.0, cost: 4.6, from: 20, w: 3, reward: 10, aura: [2.0, 0.3],
             d: ['Sein Trommelwirbel macht Hunde im Umkreis 30 % schneller.', 'Its drum roll makes nearby dogs 30% faster.'],
             look: { c: '#f6d6e8', c2: '#fff', ear: 'puff', size: 0.85, acc: 'drum' } },
  robo:    { n: ['Robo-Hund', 'Robo Dog'], hp: 95, speed: 0.8, armor: 5, cost: 7.5, from: 22, w: 3, reward: 15, res: { volt: 0.6, fire: 0.4, acid: -0.5 }, noBurn: true,
             d: ['Schwer gepanzert, brennt nicht, leitet Blitze ab. Säure frisst ihn.', 'Heavily armored, fireproof, grounds lightning. Acid eats it.'],
             look: { c: '#9aa3ad', c2: '#3ad6ff', ear: 'antenna', size: 0.95, acc: 'robot' } },

  // ---------------------------------------------------------------- Bosse
  bulldozer: { n: ['Bulldozer', 'Bulldozer'], boss: true, hp: 520, speed: 0.42, armor: 3, cost: 0, reward: 150, lives: 20, noKnock: true, ccRes: 0.5,
               d: ['Unmengen Leben. Sein Stampfen betäubt Katzen in der Nähe.', 'Tons of health. Its stomp stuns nearby cats.'],
               abil: [{ k: 'stomp', cd: 9, r: 2.3, stun: 2.5 }],
               look: { c: '#d9c7b0', c2: '#6b4a3a', ear: 'flop', size: 1.9, acc: 'bulldozer', flat: true } },
  alpha:     { n: ['Alpha-Hund', 'Alpha Dog'], boss: true, hp: 430, speed: 0.6, armor: 2, cost: 0, reward: 180, lives: 20, noKnock: true, ccRes: 0.5, aura: [3, 0.25],
               d: ['Macht sein Rudel schneller und heult Verstärkung herbei.', 'Speeds up its pack and howls for reinforcements.'],
               abil: [{ k: 'summon', cd: 8, type: 'mutt', n: 4 }, { k: 'howl', cd: 14, r: 3.2, heal: 0.15 }],
               look: { c: '#6d6f7a', c2: '#e3e6ee', ear: 'point', size: 1.7, acc: 'scar' } },
  shade:     { n: ['Schattenhund', 'Shadow Hound'], boss: true, hp: 400, speed: 0.75, cost: 0, reward: 200, lives: 20, noKnock: true, ccRes: 0.6, dodge: 0.2,
               d: ['Verschwindet immer wieder im Schatten – dann sehen ihn nur Entdecker.', 'Keeps fading into shadow – then only detectors can see it.'],
               abil: [{ k: 'phase', cd: 9, dur: 4.5 }, { k: 'summon', cd: 12, type: 'sneak', n: 2 }],
               look: { c: '#2b2440', c2: '#7b5cff', ear: 'point', size: 1.7, acc: 'shadow' } },
  mecha:     { n: ['Eisenkiefer', 'Ironjaw'], boss: true, hp: 480, speed: 0.5, armor: 6, shield: 260, cost: 0, reward: 230, lives: 20, noKnock: true, noBurn: true, ccRes: 0.6, res: { volt: 0.3, acid: -0.4 },
               d: ['Eine Kampfmaschine: lädt ihren Schild immer wieder auf.', 'A war machine: keeps recharging its shield.'],
               abil: [{ k: 'shield', cd: 11, amount: 0.5 }, { k: 'stomp', cd: 13, r: 2.6, stun: 2.2 }],
               look: { c: '#7f8a96', c2: '#ff5a36', ear: 'antenna', size: 1.9, acc: 'robot' } },
  king:      { n: ['König des Rudels', 'King of the Pack'], boss: true, hp: 900, speed: 0.46, armor: 4, cost: 0, reward: 400, lives: 99, noKnock: true, ccRes: 0.7, aura: [3.2, 0.2],
               d: ['Der Endgegner. Ruft Elite herbei, brüllt Katzen in den Schlaf und wird wütend.', 'The final boss. Summons elites, roars cats to sleep and enrages.'],
               abil: [{ k: 'summon', cd: 10, type: 'elite', n: 1 }, { k: 'stomp', cd: 12, r: 3, stun: 3 }, { k: 'enrage', at: 0.4, speed: 1.6 }, { k: 'howl', cd: 16, r: 3.5, heal: 0.12 }],
               look: { c: '#c9a227', c2: '#fff3c4', ear: 'point', size: 2.15, acc: 'crown' } }
};

export const DOG_IDS = Object.keys(DOGS);
for (const id of DOG_IDS) DOGS[id].id = id;

// Boss-Reihenfolge: Welle 10, 20, 30 … (danach von vorn, aber zäher)
export const BOSS_ORDER = ['bulldozer', 'alpha', 'shade', 'mecha', 'king'];
