// Lebendige Städte (Welt 1): Gebäude mit echter Aufgabe
// Hafenamt Ankerbrück (Akten der Morgenstern → Hinweise auf fehlende Logbuchseiten),
// Bibliothek Glimmdorf (deutet das Lied der Gezeiten), Fossilien-Museum Dünenhain, Gasthaus Kronfels (tägliche Gerüchte)
import { say } from './gbui.js';
import { sfx } from '../core/audio.js';
import { MAPS, LOOK, ITEMS } from './maps.js';
import { SPECIES } from '../data/creatures.js';
import { freeTiles, reach } from './dig.js';

const today = () => Math.floor(Date.now() / 864e5);

// Freien Bauplatz w×h finden: nur Wiese, Tür-Vorplatz begehbar, Karte bleibt zusammenhängend
export function placeLot(M, w, h, x0, y0) {
  const { ok } = freeTiles(M), base = reach(M, new Set()), W = M.rows[0].length, H = M.rows.length, cand = [];
  for (let y = 1; y + h < H - 1; y++) for (let x = 1; x + w < W - 1; x++) {
    let good = true;
    for (let yy = y; yy < y + h && good; yy++) for (let xx = x; xx < x + w; xx++) if (!ok(xx, yy) || !'.,s'.includes(M.rows[yy][xx])) { good = false; break; }
    const door = Math.floor(w / 2);
    if (good && ok(x + door, y + h)) cand.push([Math.abs(x - x0) + Math.abs(y - y0), x, y, door]);
  }
  cand.sort((a, b) => a[0] - b[0]);
  for (const [, x, y, door] of cand) {
    const block = new Set(); for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) block.add(xx + ',' + yy);
    if (reach(M, block) === base - w * h) return { x, y, door };
  }
  return null;
}

const ROOM = (rows, npc) => ({ indoor: true, rows, npcs: [npc] });
const LOTS = [
  { town: 'ankerbrueck', near: [20, 16], to: 'hafenamt', sign: 'HAFEN', roof: '#2a4a7a', wall: '#e8eef8', name: 'Hafenamt',
    rows: ['#KK#w#KK#', 'ooooooooo', 'oCCCoCCCo', 'ooooooooo', 'otoooooto', 'koooooook', 'oooommooo'],
    npc: { id: 'st_hafenamt', x: 4, y: 1, dir: 'down', look: LOOK.harm, name: 'Hafenmeisterin Dörte' } },
  { town: 'glimmdorf', near: [16, 4], to: 'bibliothek', sign: 'BÜCHER', roof: '#6a3a8a', wall: '#f4ecdc', name: 'Bibliothek',
    rows: ['#KKKwKKK#', 'ooooooooo', 'oKKoooKKo', 'ooooooooo', 'ottoootto', 'koooooook', 'oooommooo'],
    npc: { id: 'st_bibliothek', x: 4, y: 1, dir: 'down', look: LOOK.mira, name: 'Bibliothekar Theo' } },
  { town: 'duenenhain', near: [4, 4], to: 'museum', sign: 'MUSEUM', roof: '#a86a2a', wall: '#f8ecd0', name: 'Fossilien-Museum',
    rows: ['#K#www#K#', 'ooooooooo', 'oZoZoZoZo', 'ooooooooo', 'oZoooooZo', 'koooooook', 'oooommooo'],
    npc: { id: 'st_museum', x: 4, y: 3, dir: 'down', look: LOOK.hiker, name: 'Kuratorin Amalie' } },
  { town: ['kronfels', 'funkenhafen', 'sturmspitze', 'nebelklippe', 'glutinsel', 'muschelbucht', 'duenenhain', 'glimmdorf'], near: [4, 14], to: 'gasthaus', sign: 'GASTHOF', roof: '#8a3a2a', wall: '#f4e4c8', name: 'Gasthaus „Zur Ankerkette“',
    rows: ['#K#ww#KK#', 'ooooooooo', 'oCCCCCCoo', 'ooooooooo', 'ottoottoo', 'koooooook', 'oooommooo'],
    npc: { id: 'st_gasthaus', x: 3, y: 1, dir: 'down', look: LOOK.hilde, name: 'Wirtin Marthe' } },
];

export function init() {
  for (const L of LOTS) {
    if (MAPS[L.to]) continue;
    let p = null, w = 0, h = 0, M = null;
    for (const t of [L.town].flat()) { M = MAPS[t]; if (!M) continue; for ([w, h] of [[5, 4], [4, 3], [3, 3]]) if ((p = placeLot(M, w, h, ...L.near))) break; if (p) { L.at = t; break; } } // erste Stadt mit Platz, so groß wie möglich
    if (!p) continue;
    (M.buildings ||= []).push({ x: p.x, y: p.y, w, h, door: p.door, roof: L.roof, wall: L.wall, to: L.to, sign: L.sign, signCol: '#fff6d8' });
    MAPS[L.to] = { name: L.name, ...ROOM(L.rows, L.npc) };
  }
}
export const QUESTS = {}, LOGS = {}, GYMS = {};

// ---------------------------------------------------------------- Hafenamt: wo fehlen noch Logbuchseiten?
const LOGHINT = {
  20: 'Nachbarin Ines in Muschelbucht hat einen Brief für ihren Sohn auf der Glutinsel.', 21: 'Ein Junge in Ankerbrück hat ein seltsames Kabel – Ingenieurin Pia weiß mehr.',
  22: 'Junge Tarik in Dünenhain hat eine Frage an die Chronistin von Kronfels.', 23: 'Mia in Funkenhafen hat etwas für die Mechanikerin in Sturmspitze gebaut.',
  24: 'Die Kerzenmacherin von Nebelklippe hat Kerzen für Glimmdorf.', 25: 'Junge Ari auf der Glutinsel hat warme Steine für Oma Sefa.',
  26: 'Die Perlenhändlerin in Perlhafen tauscht mit Erzheim.', 27: 'Ein Mädchen in Frosthafen hat ewigen Schnee für die Wolkengärten.',
  28: 'Der Wolkenjunge hat leuchtende Federn für Sternforscher Elio.', 29: 'Die Laternenträgerin in Nocthal schickt Licht ins Eis.',
  30: 'Ein Nyxari-Kind in Lumara hat Sternenstaub verloren.', 31: 'Wer Rheas Arena bezwingt, trifft danach Bootsmann Hinnerk.',
  32: 'Nach dem Sieg über Okko wartet in seiner Arena jemand mit Fundstücken.', 33: 'Nach Miras Orden: Frag in ihrer Arena nach den Kräutern.',
  34: 'Nach Voltas Orden: In seiner Arena wartet ein Monteur.', 35: 'Nach Ysoldes Orden trägt jemand in ihrer Arena eine Laterne.',
  36: 'Nach Heklas Orden kommt ein Erzhändler in ihre Arena.', 37: 'Nach Corvins Orden misst jemand in seiner Arena den Wind.',
  38: 'Nach Tamas’ Orden wacht ein Drachenwächter in seiner Arena.', 39: 'Dr. Fossa in Dünenhain fand etwas in einem Fossil – erwecke eines!',
  40: 'Diese Seite findest du erst, wenn du selbst ein Zuhause mit eigenem Licht hast.',
};
async function hafenamt(g, n) {
  const f = g.state.flags, N = { name: n.name }, have = Array.from({ length: 40 }, (_, i) => i + 1).filter(i => f['log' + i]).length;
  if (!f.st_hafen1) { f.st_hafen1 = true; await say(['Dörte: Willkommen im Hafenamt! Hier steht jedes Schiff, das je aus Ankerbrück ausgelaufen ist.', 'Dörte: Die Morgenstern … Kapitänin Liv Sund. Ihre Akte ist dicker als alle anderen. Sie hat ihr Logbuch zerrissen und überall verteilt.'], N); }
  if (have >= 40) return say(['Dörte: Alle 40 Seiten? Du hast die ganze Reise deiner Mutter zusammengesetzt.', 'Dörte: Ich schließe ihre Akte jetzt. Nicht, weil sie verschwunden ist – sondern weil ihre Geschichte endlich vollständig ist.'], N);
  const miss = Object.keys(LOGHINT).map(Number).filter(i => !f['log' + i]);
  const pick = miss[today() % Math.max(1, miss.length)];
  await say([`Dörte: Du hast ${have} von 40 Seiten. In den Akten steht ein Hinweis auf eine weitere:`, pick ? `„${LOGHINT[pick]}“` : '„Folge der Hauptgeschichte – dort warten die übrigen Seiten.“', 'Dörte: Morgen suche ich dir einen anderen Hinweis heraus.'], N);
}

// ---------------------------------------------------------------- Bibliothek: das Lied deuten
const MEANING = {
  song1: 'Strophe I meint den Kompass: Er zeigt nicht nach Norden, sondern dorthin, wo jemand auf dich wartet.',
  song2: 'Strophe II zählt Sterne: Sieben Tagesreisen von der Quelle beginnt das offene Meer – eine Seekarte, versteckt in Versen.',
  song3: 'Strophe III spricht vom Sternenglas unter dem Waldherz. Es ist ein Splitter desselben Lichts, aus dem dein Ei gemacht ist.',
  song4: 'Strophe IV handelt vom gespeicherten Licht. Ohne Licht öffnet sich kein Tor – Funkenhafen war schon immer das Herz der Laternen.',
  song5: 'Strophe V warnt vor der Stille: Wer das Meer anhalten will, hält auch die Herzen an, die darauf warten.',
  song6: 'Strophe VI erzählt von Glut, die nicht verbrennt, sondern schmiedet. Ein Wächter prüft, wer hindurch darf.',
  song7: 'Strophe VII ist ein Wegweiser im Wind: Der Kompass will hinaus, über die Wolken hinaus.',
  song8: 'Strophe VIII ist das Ende des Liedes – oder sein Anfang. Liest man alle acht rückwärts, wird es ein Wiegenlied.',
};
async function bibliothek(g, n) {
  const f = g.state.flags, N = { name: n.name }, found = Object.keys(MEANING).filter(k => f[k]);
  if (!found.length) return say(['Theo: Das Lied der Gezeiten? Man sagt, acht Steine im Archipel tragen je eine Strophe.', 'Theo: Bring mir, was du findest. Ich kann alte Verse lesen wie andere Leute Wetterberichte.'], N);
  const fresh = found.filter(k => !f['deut_' + k]);
  if (!fresh.length) return say([`Theo: ${found.length} von 8 Strophen hast du. Die Deutungen stehen in deinem Pager unter LIED.`, found.length < 8 ? 'Theo: Such weiter – in jeder Arenastadt steht ein Stein.' : 'Theo: Alle acht … Jetzt bist du bereit für das, was hinter dem Meer liegt.'], N);
  for (const k of fresh) { f['deut_' + k] = true; await say([`Theo: ${MEANING[k]}`], N); }
  if (found.length >= 4 && !f.st_bib4) { f.st_bib4 = true; await say('Theo: Für deine Mühe – ein Buch über die Kreaturen der Gezeiten. Ach nein, das hier ist nützlicher.', N); g.state.bag.sonderbonbon = (g.state.bag.sonderbonbon || 0) + 2; sfx('caught'); await say(`${g.state.name} erhält 2× ${ITEMS.sonderbonbon.name}!`); }
  if (found.length >= 8 && !f.st_bib8) { f.st_bib8 = true; g.state.bag.topbeleber = (g.state.bag.topbeleber || 0) + 2; sfx('caught'); await say(['Theo: Alle acht Strophen! Das hat seit deiner Mutter niemand geschafft.', `${g.state.name} erhält 2× ${ITEMS.topbeleber.name}!`], N); }
}
export const SONG_MEANING = MEANING;

// ---------------------------------------------------------------- Museum: Fossilien ausstellen
const FOSS = ['ammolit', 'krallix', 'schwingstein'];
async function museum(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name }, have = FOSS.filter(sp => s.dex?.caught?.[sp] || [...s.team, ...(s.box || [])].some(m => m.sp === sp));
  if (!f.st_mus1) { f.st_mus1 = true; await say(['Amalie: Willkommen im Fossilien-Museum! Die Vitrinen sind noch leer – noch.', 'Amalie: Dr. Fossa erweckt Fossilien wieder zum Leben. Jede Art, die du erweckst, stellen wir hier aus.'], N); }
  const names = have.map(sp => SPECIES[sp]?.name).filter(Boolean);
  await say(names.length ? [`Amalie: Ausgestellt: ${names.join(', ')}. (${names.length} von ${FOSS.length})`] : ['Amalie: Grabstellen findest du in Höhlen – mit dem Grabset von Dr. Fossa.'], N);
  for (const [k, need, item, num] of [['st_mus1x', 1, 'hypertrank', 2], ['st_mus3x', 3, 'sonderbonbon', 3]]) if (have.length >= need && !f[k]) { f[k] = true; s.bag[item] = (s.bag[item] || 0) + num; sfx('caught'); await say([need === 3 ? 'Amalie: Alle drei Urzeit-Arten! Die Ausstellung ist komplett!' : 'Amalie: Unser erstes Ausstellungsstück! Danke!', `${s.name} erhält ${num}× ${ITEMS[item].name}!`], N); }
}

// ---------------------------------------------------------------- Gasthaus: jeden Tag ein anderes Gerücht
async function gasthaus(g, n) {
  const N = { name: n.name }, d = today(), sw = g.swarm?.();
  const R = [
    sw && `Ein Fischer erzählte, auf ${sw.name} wimmelt es heute nur so von ${SPECIES[sw.sp]?.name}!`,
    'Man sagt, auf manchen Routen streift heute ein riesiges Alpha-Exemplar umher. Wer es besiegt, bekommt was Seltenes!',
    'In der Arena von Nebelklippe sollen die Geister-Trainer verraten, welche Rune die richtige ist.',
    'Ein Reisender schwört, nachts im Glimmwald leuchten die Pilze im Takt des Lieds der Gezeiten.',
    'Das Hafenamt in Ankerbrück hat die Akte der Morgenstern. Dörte hilft dir, verlorene Logbuchseiten zu finden.',
    'Bei Regen sollen andere Kreaturen aus dem hohen Gras kommen als bei Sonne. Ein Wetterglas zeigt es dir.',
    'Wer im hohen Gras schleicht, kommt scheuen Kreaturen viel näher. Halte dabei den Knopf gedrückt!',
    'In Dünenhain gibt es jetzt ein Museum. Die Kuratorin sucht dringend Urzeit-Kreaturen.',
    'Kapitänin Wenke in Ankerbrück soll einen Kompass haben, der zu einer eigenen Insel führt!',
    'Die Bibliothek in Glimmdorf deutet das Lied der Gezeiten. Theo kann alte Verse lesen wie Wetterberichte.',
  ].filter(Boolean);
  await say(['Marthe: Willkommen in der „Ankerkette“! Setz dich, iss was.', `Marthe: Das Neueste vom Tag: ${R[d % R.length]}`, 'Marthe: Komm morgen wieder, dann weiß ich was anderes.'], N);
}

export async function talk(g, n) {
  switch (n.id) {
    case 'st_hafenamt': return hafenamt(g, n);
    case 'st_bibliothek': return bibliothek(g, n);
    case 'st_museum': return museum(g, n);
    case 'st_gasthaus': return gasthaus(g, n);
  }
  return false;
}
