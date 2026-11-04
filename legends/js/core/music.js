// Komponierte Musik (eigene Stücke). Jedes Stück: 8 Takte à 8 Achtel, Akkorde pro Takt und eine Melodie.
// Melodie-Notation: Notenname mit Oktave (C5, F#4, Bb5), "-" = Ton halten, "." = Pause.
// Bass, Begleitung und Schlagzeug werden aus den Akkorden und dem Stil erzeugt.

export const TRACKS = {
  title: {
    bpm: 104, lead: 'square', bass: 'walk', arp: 'up', drums: 'march',
    chords: 'C G Am F C G F G',
    melody: `E5 - G5 - C6 - B5 A5 | G5 - - - D5 - G5 - | A5 - C6 - E6 - D6 C6 | C6 - A5 - F5 - - - |
             E5 - G5 - C6 - D6 E6 | D6 - B5 - G5 - A5 B5 | C6 - A5 - F5 - A5 C6 | B5 - - - G5 - - -`,
  },
  town: {
    bpm: 96, lead: 'triangle', bass: 'long', arp: 'up', drums: 'soft',
    chords: 'F C Dm Bb F C Bb C',
    melody: `A4 - C5 - F5 - E5 D5 | E5 - G5 - - - C5 - | D5 - F5 - A5 - G5 F5 | F5 - D5 - Bb4 - - - |
             A4 - C5 - F5 - G5 A5 | G5 - E5 - C5 - D5 E5 | F5 - D5 - Bb4 - D5 F5 | E5 - - - C5 - - -`,
  },
  route: {
    bpm: 120, lead: 'square', bass: 'walk', arp: 'up', drums: 'rock',
    chords: 'G D Em C G D C D',
    melody: `B4 - D5 G5 - - F#5 G5 | A5 - F#5 - D5 - - - | E5 - G5 B5 - - A5 G5 | G5 - E5 - C5 - D5 E5 |
             D5 - G5 - B5 - C6 B5 | A5 - F#5 - D5 - E5 F#5 | G5 - E5 - C5 - E5 G5 | F#5 - - - D5 - A4 -`,
  },
  night: {
    bpm: 76, lead: 'sine', bass: 'long', arp: 'up', drums: 'none',
    chords: 'Am F C G Am Dm E E',
    melody: `E5 - - - A5 - G5 - | F5 - - - C5 - - - | E5 - G5 - C6 - B5 - | B5 - - - G5 - - - |
             A5 - - - E5 - C5 - | D5 - F5 - A5 - - - | G#5 - - - B5 - - - | E5 - - - - - - -`,
  },
  cave: {
    bpm: 84, lead: 'triangle', bass: 'long', arp: 'block', drums: 'soft',
    chords: 'Dm Dm Bb A Dm Gm A A',
    melody: `D5 . . F5 . . A5 . | G5 . F5 . E5 . . . | F5 . . D5 . . Bb4 . | C#5 . . . E5 . . . |
             D5 . F5 . A5 . D6 . | Bb5 . A5 . G5 . . . | A5 . G5 . F5 . E5 . | C#5 - - - - - - -`,
  },
  gym: {
    bpm: 112, lead: 'square', bass: 'walk', arp: 'up', drums: 'march',
    chords: 'Gm Eb F D Gm Eb Cm D',
    melody: `G4 - Bb4 - D5 - G5 - | G5 - F5 Eb5 - - Bb4 - | C5 - D5 - F5 - A5 - | F#5 - - - D5 - - - |
             G5 - - A5 Bb5 - D6 - | C6 - Bb5 - G5 - Eb5 - | Eb5 - G5 - C6 - Bb5 A5 | A5 - - - F#5 - D5 -`,
  },
  battle: {
    bpm: 160, lead: 'square', bass: 'pulse', arp: 'none', drums: 'rock',
    chords: 'Em C D B Em C Am B',
    melody: `E5 E5 G5 E5 B5 - A5 G5 | G5 - E5 - C5 - E5 G5 | F#5 F#5 A5 F#5 D6 - C6 B5 | B5 - D#5 - F#5 - B5 - |
             E5 E5 G5 E5 B5 - E6 D6 | C6 - B5 - G5 - E5 G5 | A5 - C6 - E6 - D6 C6 | B5 - - - D#6 - B5 -`,
  },
  trainer: {
    bpm: 168, lead: 'square', bass: 'pulse', arp: 'up', drums: 'rock',
    chords: 'Am G F E Am G F E',
    melody: `A5 - E5 A5 C6 - B5 A5 | B5 - G5 - D5 - G5 B5 | C6 - A5 - F5 - A5 C6 | B5 - G#5 - E5 - G#5 B5 |
             E6 - D6 C6 B5 - A5 B5 | D6 - B5 - G5 - B5 D6 | C6 - A5 - F5 - C6 A5 | G#5 - B5 - E6 - - -`,
  },
  boss: {
    bpm: 152, lead: 'square', bass: 'pulse', arp: 'up', drums: 'march',
    chords: 'Cm Ab Bb G Cm Ab Fm G',
    melody: `C5 - Eb5 - G5 - C6 - | Ab5 - G5 - Eb5 - C5 - | D5 - F5 - Bb5 - D6 - | B5 - G5 - D5 - B4 - |
             C6 - - Bb5 Ab5 - G5 - | Ab5 - - G5 F5 - Eb5 - | F5 - Ab5 - C6 - Eb6 - | D6 - - - B5 - G5 -`,
  },
  legend: {
    bpm: 132, lead: 'triangle', bass: 'pulse', arp: 'block', drums: 'march',
    chords: 'Dm Bb C A Dm Bb Gm A',
    melody: `D5 - - - A5 - - - | Bb5 - A5 - F5 - - - | G5 - - - E5 - C5 - | C#5 - E5 - A5 - - - |
             D6 - - - C6 - A5 - | Bb5 - - - D6 - F5 - | G5 - Bb5 - D6 - C6 Bb5 | A5 - - - C#6 - E6 -`,
  },
  finale: {
    bpm: 172, lead: 'square', bass: 'pulse', arp: 'up', drums: 'rock',
    chords: 'Bm G A F# Bm G Em F#',
    melody: `B5 - F#5 B5 D6 - C#6 B5 | B5 - G5 - D5 - G5 B5 | C#6 - A5 - E5 - A5 C#6 | A#5 - F#5 - C#6 - A#5 - |
             D6 - C#6 B5 F#6 - E6 D6 | D6 - B5 - G5 - B5 D6 | E6 - D6 C#6 B5 - G5 B5 | A#5 - C#6 - F#6 - - -`,
  },
  // ---------------- Wilde Kämpfe (Varianten) und Trainer
  battle2: { // Wald / Nacht
    bpm: 164, lead: 'square', bass: 'pulse', arp: 'up', drums: 'rock',
    chords: 'Dm Bb C A Dm Bb Gm A',
    melody: `D5 F5 A5 - D6 - A5 F5 | Bb5 - A5 - F5 - D5 F5 | C5 E5 G5 - C6 - G5 E5 | C#6 - A5 - E5 - C#5 - |
             D6 - C6 Bb5 A5 - F5 A5 | Bb5 - D6 - F6 - D6 Bb5 | G5 - Bb5 - D6 - C6 Bb5 | A5 - - - C#6 - E6 -`,
  },
  battle3: { // Wasser / Höhle / Schnee
    bpm: 156, lead: 'triangle', harm: -12, bass: 'drive', arp: 'fast', drums: 'march',
    chords: 'Gm Eb F D Gm Eb Cm D',
    melody: `G5 - D5 G5 Bb5 - A5 G5 | Eb5 - G5 - Bb5 - Eb6 - | F5 - A5 - C6 - F6 - | F#5 - A5 - D6 - - - |
             G6 - F6 - D6 - Bb5 D6 | Eb6 - D6 - Bb5 - G5 - | C6 - Eb6 - G6 - F6 Eb6 | D6 - F#6 - A6 - - -`,
  },
  trainer2: {
    bpm: 174, lead: 'square', harm: -5, bass: 'pulse', arp: 'up', drums: 'double',
    chords: 'Em C G D Em C Am B',
    melody: `E5 - G5 - B5 - E6 D6 | C6 - B5 - G5 - E5 G5 | D6 - B5 - G5 - D6 - | F#6 - E6 D6 A5 - F#5 - |
             G5 - B5 E6 G6 - F#6 E6 | E6 - C6 - G5 - C6 E6 | A5 - C6 - E6 - D6 C6 | B5 - D#6 - F#6 - B6 -`,
  },
  // ---------------- Arenaleiter: jedes Thema mit eigenem Charakter
  ldr0: { // Gorm – Fels: stampfender Rock
    bpm: 168, lead: 'square', harm: -5, bass: 'drive', arp: 'none', drums: 'tribal',
    chords: 'Em Em C D Em Em C B',
    melody: `E5 - E5 G5 A5 - G5 E5 | B5 - A5 G5 E5 - D5 E5 | C6 - B5 A5 G5 - E5 G5 | F#5 - - - A5 - D5 - |
             E5 - E5 G5 A5 - B5 D6 | E6 - D6 B5 G5 - A5 B5 | C6 - E6 - D6 C6 B5 G5 | B5 - D#6 - F#6 - B5 -`,
  },
  ldr1: { // Selma – Feuer: feuriger Flamenco-Rock
    bpm: 182, lead: 'sawtooth', bass: 'drive', arp: 'fast', drums: 'double',
    chords: 'Am F G E Am F Dm E',
    melody: `A5 B5 C6 - E6 - C6 B5 | A5 - F5 - A5 - C6 - | B5 C6 D6 - G6 - D6 B5 | G#5 - B5 - E6 - G#5 - |
             A5 - E6 - D6 C6 B5 A5 | F5 - A5 - C6 - F6 - | D6 - F6 - E6 D6 C6 B5 | B5 - G#5 - E5 - - -`,
  },
  ldr2: { // Meri – Wasser: fließend und schnell
    bpm: 170, lead: 'triangle', harm: -12, bass: 'pulse', arp: 'fast', drums: 'rock',
    chords: 'Bm G D A Bm G Em F#',
    melody: `B5 - C#6 D6 F#6 - E6 D6 | D6 - B5 - G5 - B5 D6 | A5 - D6 - F#6 - A6 - | A6 - G6 F#6 E6 - C#6 - |
             B5 - F#6 - E6 D6 C#6 B5 | G5 - B5 - D6 - G6 - | E6 - D6 - C#6 - B5 C#6 | A#5 - C#6 - F#6 - - -`,
  },
  ldr3: { // Halvar – Eis: kristallklar, glitzernde Arpeggios
    bpm: 160, lead: 'triangle', harm: 12, bass: 'pulse', arp: 'fast', drums: 'march',
    chords: 'F#m D E C# F#m D Bm C#',
    melody: `F#5 - A5 - C#6 - F#6 - | D6 - C#6 - A5 - F#5 - | E5 - G#5 - B5 - E6 - | C#6 - - - E#5 - G#5 - |
             A5 - C#6 F#6 E6 - D6 C#6 | D6 - F#6 - A6 - F#6 D6 | B5 - D6 - F#6 - E6 D6 | C#6 - E#6 - G#6 - C#6 -`,
  },
  ldr4: { // Morwen – Schatten: düster, Trommeln aus dem Nebel
    bpm: 150, lead: 'sawtooth', bass: 'drive', arp: 'up', drums: 'tribal',
    chords: 'Cm Ab Fm G Cm Db Bb G',
    melody: `C5 - Eb5 - G5 - F#5 G5 | Ab5 - - - G5 - Eb5 - | F5 - Ab5 - C6 - B5 C6 | D6 - B5 - G5 - - - |
             C6 - Bb5 Ab5 G5 - Eb5 G5 | Db6 - C6 - Ab5 - F5 - | Bb5 - D6 - F6 - Eb6 D6 | B5 - D6 - G6 - - -`,
  },
  ldr5: { // Sahra – Wüste/Licht: orientalische Tonleiter
    bpm: 176, lead: 'square', harm: -12, bass: 'drive', arp: 'none', drums: 'tribal',
    chords: 'E F E Dm E F G E',
    melody: `E5 F5 G#5 - B5 - A5 G#5 | F5 - A5 - C6 - B5 A5 | G#5 - B5 - E6 - D6 C6 | B5 - A5 G#5 F5 - E5 - |
             E6 - D6 C6 B5 - A5 G#5 | A5 - C6 - F6 - E6 D6 | D6 - B5 - G5 - B5 D6 | E6 - - - G#5 - E5 -`,
  },
  ldr6: { // Brann – Drache: episch und wuchtig
    bpm: 178, lead: 'square', harm: -5, bass: 'drive', arp: 'fast', drums: 'double',
    chords: 'Dm Bb F C Dm Bb Gm A',
    melody: `D5 - A5 - D6 - C6 A5 | Bb5 - F5 - D5 - F5 Bb5 | A5 - C6 - F6 - E6 C6 | G5 - C6 - E6 - G6 - |
             F6 - E6 D6 A5 - D6 F6 | F6 - D6 - Bb5 - D6 F6 | G6 - F6 E6 D6 - Bb5 G5 | A5 - C#6 - E6 - A6 -`,
  },
  ldr7: { // Vala – letzte Arena: Sägezahn, Doppelbass, volle Wucht
    bpm: 186, lead: 'sawtooth', harm: -12, bass: 'drive', arp: 'fast', drums: 'double',
    chords: 'Gm Eb Bb F Gm Eb Cm D',
    melody: `G5 - Bb5 - D6 - G6 F6 | Eb6 - D6 - Bb5 - G5 - | F5 - Bb5 - D6 - F6 - | F6 - Eb6 D6 C6 - A5 - |
             G6 - F6 Eb6 D6 - Bb5 D6 | Eb6 - G6 - Bb6 - G6 Eb6 | C6 - Eb6 - G6 - F6 Eb6 | D6 - F#6 - A6 - D6 -`,
  },
};
// Alte Modusnamen weiter unterstützen
export const ALIAS = { day: 'route' };

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function noteToMidi(n) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n); if (!m) return null;
  return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
// Akkord → MIDI-Töne (Grundton in Oktave 3)
export function chordNotes(c) {
  const m = /^([A-G])([#b]?)(m?)$/.exec(c); if (!m) return [48, 52, 55];
  const root = 48 + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return [root, root + (m[3] ? 3 : 4), root + 7];
}
// Melodie in Ereignisse zerlegen: [{ step, midi, len }]
export function parseMelody(src) {
  const tok = src.replace(/\|/g, ' ').trim().split(/\s+/), ev = [];
  tok.forEach((t, i) => {
    if (t === '-') { if (ev.length && ev[ev.length - 1].open) ev[ev.length - 1].len++; return; }
    if (ev.length) ev[ev.length - 1].open = false;
    if (t === '.') return;
    const midi = noteToMidi(t); if (midi !== null) ev.push({ step: i, midi, len: 1, open: true });
  });
  return { ev, steps: tok.length };
}
const cache = {};
export function compiled(name) {
  if (cache[name]) return cache[name];
  const T = TRACKS[ALIAS[name] || name]; if (!T) return null;
  const { ev, steps } = parseMelody(T.melody);
  const lead = {}; ev.forEach(e => (lead[e.step] = e));
  return (cache[name] = { ...T, voice: T.lead, lead, steps, chords: T.chords.split(/\s+/).map(chordNotes) });
}
