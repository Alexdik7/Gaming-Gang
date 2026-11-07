// Akt 7 – Welt 3: Durch das Sternentor nach Nyxara. Lumara, die Prüfung der Nacht, die Raumstation Halo
// (erobern und ausbauen: Module, Expeditionen, Verteidigung) und das Sternenherz – das Finale von Sternflut.
import { say, ask, choose } from './gbui.js';
import { G, W, H, push, pop, input, text, fade, wait } from './engine.js';
import { sfx, cry, setMusic } from '../core/audio.js';
import { SPECIES } from '../data/creatures.js';
import { createMon, healMon, monName } from '../data/mon.js';
import { MOVES } from '../data/moves.js';
import { MAPS, ENC, ITEMS, LOOK } from './maps.js';
import { MAPS4, ENC4, LOOK4 } from './maps4.js';
import { monSprite } from './sprites.js';
import '../data/welt3.js';

Object.assign(MAPS, MAPS4); Object.assign(ENC, ENC4);
Object.assign(ITEMS, {
  sternsegen: { name: 'Sternensegen', desc: 'Vom Ältesten Oru. Der Himmelsfaden zur Station Halo öffnet sich für dich.', key: true },
  sternenkern: { name: 'Sternenkern', desc: 'Eine Kugel aus verdichtetem Sternenlicht. Bei Astral-Kreaturen und auf Nyxara 4-fache Chance.', ball: 1, col: '#7a6aff', cond: 'astral' },
});
MAPS.astralis.npcs.push({ id: 'sternentor', x: 6, y: 7, dir: 'down', look: LOOK.pip, name: 'Pip', showIf: 'portalOffen', hideIf: 'w3start' });
MAPS.landeplatz.revier = [{ id: 'solaryx', sp: 'solaryx', lv: 98, x: 16, y: 4, r: 1, story: true, legend: true, showIf: 'finale3', hideIf: 'solaryx' }];

let HX; export function init(h) { HX = h; }
export const GYMS = {};
export const QUESTS = {
  ly_kind: { want: 'sternkatze', title: 'Die Katze mit den Sternen', ask: ['Bei uns erzählt man, auf dem Fell jeder Sternkatze steht ein anderes Sternbild.', 'Kannst du mir eine zeigen? Ich suche das Sternbild meiner Großmutter.'], thanks: ['Da! Das ist es! Auf {mon} steht Omas Sternbild!', 'Danke, Fremde. Nimm das – Sternenkerne aus unserem Brunnen.'], reward: { sternenkern: 5 }, after: 'Oma sagt, Sterne vergessen nie, wen sie einmal geliebt haben.' },
};
export const LOGS = {
  18: ['Notiz von Maren Kehl, gefunden auf Station Halo:', 'Als Kind habe ich zugesehen, wie meine Eltern im Sturm ertranken. Ich wollte das Meer beherrschen, damit es nie wieder jemanden nimmt.', 'Liv hat das nie verstanden. Oder vielleicht hat sie es zu gut verstanden.'],
};
export const SONG = {};
export const CALLS = {
  aura: ['AURA: Kommandant, alle Systeme laufen. Die Crew-Mäuse lassen grüßen.'],
};
export function contacts(s, c) { if (s.flags.haloFrei) c.push({ id: 'aura', name: 'AURA (Station Halo)' }); }

export function goal(s) {
  const f = s.flags;
  if (!f.portalOffen) return null;
  if (!f.w3start) return { t: 'Das Sternentor', d: 'Pip wartet in Astralis vor dem Sternentor.', map: 'astralis' };
  if (!f.nyxStart) return { t: 'Nyxara', d: 'Sprich mit Jaro und Pip am Landeplatz.', map: 'landeplatz' };
  if (!f.oruMet) return { t: 'Lumara', d: 'Folge dem Kristallwald nach Norden bis ins Dorf der Nyxari. Der Älteste Oru weiß, was mit der Station geschehen ist.', map: 'lumara' };
  if (!f.sternsegen) return { t: 'Die Prüfung der Nacht', d: 'Stell dich Nyxion, dem Wächter der Nacht, am Nordrand des Kristallwalds. Dann kehre zu Oru zurück.', map: 'kristallwald' };
  if (!f.haloFrei) return { t: 'Station Halo', d: 'Fahr mit dem Himmelsfaden östlich des Kristallwalds hinauf zur Station. Kehls Jäger halten sie besetzt.', map: 'halofuss' };
  if (!f.finale3) return { t: 'Das Sternenherz', d: 'Im Kern der Station wartet Pip am Tor zum Sternenherz. Dort ist Kehl.', map: 'halofuss' };
  return { t: 'Kommandant von Halo', d: 'Die Geschichte ist erzählt – aber die Reise geht weiter! Baue die Station aus (AURA im Andockring), schicke Kreaturen auf Expedition, verteidige Halo und finde alle Legendären: Solaryx, Halora, Kosmara und mehr.', map: 'halofuss' };
}

// ---------------------------------------------------------------- Station Halo: Module, Expeditionen, Verteidigung
const MODS = [
  { id: 'labor', name: 'Brutkammer', cost: 300, desc: 'Eier in der Brutstätte entwickeln sich doppelt so schnell.' },
  { id: 'gewaechs', name: 'Sternengarten', cost: 250, desc: 'Einmal pro Tag Ernte: Beeren und Zutaten fürs Lager.' },
  { id: 'hangar', name: 'Hangar', cost: 350, desc: 'Schicke Kreaturen aus der Box auf Expedition. Sie bringen Sternstaub und Schätze mit.' },
  { id: 'observatorium', name: 'Observatorium', cost: 400, desc: 'Schillernde Kreaturen begegnen dir öfter – in allen Welten.' },
  { id: 'simulator', name: 'Kampfsimulator', cost: 500, desc: 'Kämpfe gegen Erinnerungen an alte Gegner (Level 95+) für Sternstaub.' },
  { id: 'antrieb', name: 'Sternenantrieb', cost: 600, desc: 'Reise von Halo aus in alle drei Welten: Muschelbucht, Perlhafen, Nyxara.' },
];
export const station = s => (s.station ||= { mods: {}, dust: 0, exp: null, lastDef: 0, harvest: -1 });
export function hasMod(s, id) { return !!s.station?.mods?.[id]; }
async function stationMenu(g) {
  const s = g.state, st = station(s), N = { name: 'AURA' };
  for (;;) {
    const opts = [{ label: 'Module bauen', desc: 'Neue Bereiche der Station freischalten.' }];
    if (hasMod(s, 'gewaechs')) opts.push({ label: 'Ernte', desc: 'Der Sternengarten trägt einmal pro Tag Früchte.' });
    if (hasMod(s, 'hangar')) opts.push({ label: 'Expedition', desc: st.exp ? 'Eine Kreatur ist unterwegs.' : 'Eine Kreatur aus der Box losschicken.' });
    if (hasMod(s, 'simulator')) opts.push({ label: 'Simulator', desc: 'Kampf gegen eine Erinnerung.' });
    if (hasMod(s, 'antrieb')) opts.push({ label: 'Weltenreise', desc: 'Mit dem Sternenantrieb in eine andere Welt reisen.' });
    opts.push('Zurück');
    const i = await choose(opts, { title: `HALO · ${st.dust} STERNSTAUB` });
    const k = opts[i]?.label || opts[i];
    if (i === null || k === 'Zurück') return;
    if (k === 'Module bauen') {
      const list = MODS.filter(m => !st.mods[m.id]);
      if (!list.length) { await say('AURA: Alle Module sind gebaut. Halo leuchtet heller als vor tausend Jahren.', N); continue; }
      const j = await choose([...list.map(m => ({ label: m.name, right: m.cost + '✦', disabled: st.dust < m.cost, desc: m.desc })), 'Zurück'], { title: 'MODULE' });
      if (j === null || j >= list.length) continue;
      const m = list[j]; st.dust -= m.cost; st.mods[m.id] = true; sfx('lvl'); G.shake = 0.3;
      await say([`AURA: Modul ${m.name.toUpperCase()} wird gebaut …`, `AURA: Fertig! ${m.desc}`], N); g.save(true);
    }
    if (k === 'Ernte') {
      const day = Math.floor(Date.now() / 864e5); if (st.harvest === day) { await say('AURA: Der Garten braucht Zeit. Morgen gibt es wieder etwas.', N); continue; }
      st.harvest = day; const loot = ['heilbeere', 'klarbeere', 'honig', 'pilz', 'kraeuter', 'fisch', 'muschel']; const got = {};
      for (let n = 0; n < 5; n++) { const it = loot[Math.floor(Math.random() * loot.length)]; got[it] = (got[it] || 0) + 1; s.bag[it] = (s.bag[it] || 0) + 1; }
      sfx('caught'); await say(`Ernte: ${Object.entries(got).map(([k2, v]) => v + '× ' + ITEMS[k2].name).join(', ')}.`); g.save(true);
    }
    if (k === 'Expedition') await expedition(g);
    if (k === 'Simulator') await simulator(g);
    if (k === 'Weltenreise') await worldTravel(g);
  }
}
async function expedition(g) {
  const s = g.state, st = station(s), N = { name: 'AURA' };
  if (st.exp) {
    const left = st.exp.until - Date.now();
    if (left > 0) return say(`AURA: ${st.exp.name} ist noch unterwegs. Rückkehr in etwa ${Math.ceil(left / 60000)} Minuten.`, N);
    const dust = 40 + Math.floor(Math.random() * 60), pool = ['sternenkern', 'sonderbonbon', 'toptrank', 'topbeleber', 'sternkristall', 'echomuschel'], it = pool[Math.floor(Math.random() * pool.length)];
    st.dust += dust; s.bag[it] = (s.bag[it] || 0) + 2; const nm = st.exp.name; st.exp = null; sfx('caught');
    await say([`AURA: ${nm} ist zurück von der Expedition!`, `Mitgebracht: ${dust} Sternstaub und 2× ${ITEMS[it].name}.`], N); return g.save(true);
  }
  const box = s.box.filter(m => !m.egg);
  if (!box.length) return say('AURA: Deine Box ist leer. Nur Kreaturen aus der Box können auf Expedition gehen.', N);
  const i = await choose(box.slice(0, 40).map(m => ({ label: monName(m), right: 'Lv' + m.lvl })), { title: 'WER GEHT?' });
  if (i === null) return;
  const m = box[i]; st.exp = { name: monName(m), until: Date.now() + 10 * 60000 };
  sfx('whoosh'); await say([`${monName(m)} startet zu einer Expedition durch das Sternenmeer!`, 'AURA: Rückkehr in etwa 10 Minuten. Echtzeit, Kommandant.'], N); g.save(true);
}
const SIMS = [['Erinnerung: Admiral Brann', LOOK.brann, [['kronwyrm', 96], ['sturmross', 96], ['nebelhirsch', 97]]], ['Erinnerung: Äbtissin Sela', LOOK.aebtissin, [['phantomedusa', 96], ['ankerfuerst', 96], ['kronwyrm', 97]]], ['Erinnerung: Kaiserin Maris', LOOK.maris || LOOK.rhea, [['ozeanwal', 97], ['korallendrache', 97], ['mantarion', 98]]], ['Erinnerung: Rivale Jaro', LOOK.jaro, [['zyklorn', 96], ['mondheuler', 96], ['kronwyrm', 97]]]];
async function simulator(g) {
  const s = g.state, st = station(s), [name, look, team] = SIMS[Math.floor(Math.random() * SIMS.length)];
  await say(`AURA: Simulation geladen – ${name}.`, { name: 'AURA' });
  const won = await g.trainerFight({ name, look, team, reward: 5000, lose: 'Simulation beendet.', bg: 'liga', noBlackout: true, music: 'boss' });
  s.team.forEach(healMon);
  if (won) { st.dust += 80; await say('AURA: Simulation gewonnen! +80 Sternstaub.', { name: 'AURA' }); g.save(true); }
}
async function worldTravel(g) {
  const W3 = [['Muschelbucht (Welt 1)', 'muschelbucht', 9, 9, 1], ['Perlhafen (Welt 2)', 'perlhafen', 8, 8, 2], ['Nyxara – Landeplatz', 'landeplatz', 9, 7, 3]];
  const i = await choose([...W3.map(w => w[0]), 'Hierbleiben'], { title: 'STERNENANTRIEB' });
  if (i === null || i >= W3.length) return;
  const [, map, x, y, w] = W3[i]; g.state.world = w;
  sfx('shiny'); await fade(1, 400); g.ow.load(map, x, y, 'down'); g.ow.music(); await fade(0, 600); g.save(true);
  await say('Der Sternenantrieb hat dich durch die Welten getragen. Über AURA im Andockring kommst du jederzeit zurück – und über das Sternentor in Astralis.');
}
async function defense(g) {
  const s = g.state, st = station(s);
  await say(['ALARM! Ein Schwarm wilder Sternenkreaturen greift die Station an!', 'AURA: Kommandant, wir brauchen dich an den Schleusen!']);
  const pool = ['nebelhai', 'pulsarpanther', 'kometrix', 'gravitroll', 'kosmomeduse'];
  for (let w = 0; w < 2; w++) {
    const r = await g.wildBattle(null, 'liga', Object.assign(createMon(pool[Math.floor(Math.random() * pool.length)], 92 + w * 2), { revier: true }), { noCatch: w === 0, noBlackout: true });
    if (r?.result === 'lose' || r?.result === 'run') { await say('AURA: Wir haben uns zurückgezogen. Die Station hält stand – knapp.'); return; }
  }
  st.dust += 60; st.lastDef = Date.now(); sfx('caught');
  await say(['AURA: Angriff abgewehrt! Der Schwarm zieht weiter.', '+60 Sternstaub für die Verteidigung.']); g.save(true);
}

// ---------------------------------------------------------------- Abspann
class Credits {
  constructor(g, res) { this.g = g; this.res = res; this.t = 0; const s = g.state;
    this.lines = ['STERNFLUT', 'Die Reise ans Ende des Meeres – und darüber hinaus', '', `Kapitän und Champion: ${s.name}`, `Chronik: ${Object.keys(s.dex.seen).length} gesehen, ${Object.keys(s.dex.caught).length} gebunden`, `Orden: ${s.badges.filter(Boolean).length} · Logbuchseiten: ${Object.keys(s.flags).filter(k => /^log\d+$/.test(k)).length}`, '', 'Welt 1 – Der Kalmara-Archipel', 'Welt 2 – Die Weite See', 'Welt 3 – Nyxara und die Station Halo', '', 'Die Mannschaft der Morgenstern', 'Liv Sund · Jaro · Pip', 'Wella · Bosse · Harm · Corvin', '', 'Freunde unterwegs', 'Rhea · Okko · Mira · Volta · Ysolde', 'Hekla · Corvin · Tamas · Nami · Thalia', 'Ingrid · Bjarne · Seraphine · Orion', 'Mortis · Selene · Nalu · Kalle · Oru', '', 'Die einmal Gegner waren', 'Schwester Nebel · Bruder Funke · Sela', 'Jägerin Vex · Maren Kehl', '', 'Die Wächter', 'Ignivar · Zephyra · Kronar · Boreal', 'Aerion · Noctyra · Nyxion · Solaryx', 'Halora · Aurelune · Thalassyr · Kosmara', '', 'Idee & Spieltest: Gaming Gang', 'Code, Pixel-Art, Story & Musik: mit Claude', '', 'Danke fürs Spielen!', '', 'Die Sterne warten noch – Halo braucht seinen Kommandanten.'];
    this.dur = 4 + this.lines.length * 1.0; }
  update(dt) { this.t += dt; if ((input.pressed('a') || input.tap) && this.t > 2) this.t = Math.max(this.t, this.dur - 1); if (this.t > this.dur + 1.5) { pop(this); this.res(); } }
  draw(ctx) {
    const t = this.t; ctx.fillStyle = '#06041a'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { const x = (i * 97.3) % W, y = ((i * 41.7) + t * (4 + (i % 4) * 3)) % H; ctx.fillStyle = `rgba(230,230,255,${0.3 + 0.7 * Math.abs(Math.sin(t + i))})`; ctx.fillRect(x | 0, y | 0, 1, 1); }
    const team = this.g.state.team.filter(m => !m.egg); team.forEach((m, i) => { ctx.globalAlpha = 0.35; ctx.drawImage(monSprite(m.sp, 'icon', m.shiny, m.mut), 10 + i * 38, H - 36 + Math.sin(t * 2 + i) * 2); ctx.globalAlpha = 1; });
    const y0 = H - t * 14 + 20;
    this.lines.forEach((l, i) => { const y = y0 + i * 14; if (y > -12 && y < H) text(l, W / 2, y, i === 0 ? '#fff0b0' : '#e8e8ff', i === 0 ? 14 : 8, 'center', '#1a1040', i === 0); });
    if (t > this.dur) text('ENDE', W / 2, H / 2 - 8, '#fff0b0', 16, 'center', '#1a1040', true);
  }
}
const credits = g => new Promise(res => { push(new Credits(g, res)); setMusic('title'); });

// ---------------------------------------------------------------- Gespräche
export async function talk(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  switch (n.id) {
    case 'sternentor': {
      await say(['Pip: Das Tor. Ich spüre es – dahinter ist mein Zuhause. Und Kehl.', 'Pip: Jaro kommt mit. Deine Mama bleibt in Perlhafen und passt auf Thalassyr auf.'], { name: 'Pip' });
      if (!await ask('Durch das Sternentor nach Nyxara?')) return;
      sfx('shiny'); G.shake = 1; await fade(1, 600); f.w3start = true; s.world = 3;
      g.ow.load('landeplatz', 9, 7, 'down'); g.ow.music(); await fade(0, 1200);
      return say(['Violettes Gras. Bäume aus Kristall. Am Himmel zwei Sonnen – und ein Ring aus Sternenstaub, der sich bis zum Horizont spannt.', 'Hoch über dir, an einem Faden aus Licht, schwebt eine riesige Station.']);
    }
    case 'pip_ny': case 'jaro_ny':
      if (f.nyxStart) return;
      await say(['Jaro: Okay. Okay okay okay. Zwei Sonnen. Kristallbäume. Ich bin ganz ruhig.', 'Pip: Nyxara. Hier ist Thalassyr geboren. Ich … ich erinnere mich an diesen Ort.', 'Pip: Die Station da oben heißt Halo. Sie hat einmal die Sterne beschützt. Jetzt gehört sie Kehl.', 'Jaro: Dann holen wir sie uns. Käpt’n?'], { name: 'Jaro' });
      await fade(1, 250); f.nyxStart = true; g.ow.npcs = g.ow.npcs.filter(x => !['pip_ny', 'jaro_ny'].includes(x.id)); await fade(0, 250); g.save(true); return;
    case 'oru': return oru(g, n);
    case 'ly_frau': return say(['Fremde von den Wassersternen! Willkommen. Wir handeln mit Licht – möchtest du Sternenkerne?', 'Sie fangen Kreaturen unserer Welt viel besser als eure Kugeln.'], N);
    case 'rask': return rask(g, n);
    case 'aura_ki':
      if (!f.haloFrei) return say(['Ein flackerndes Hologramm: KOMMANDANT … NICHT … ERKANNT …'], N);
      if (!f.auraIntro) { f.auraIntro = true; station(s).dust += 200; await say(['AURA: Willkommen an Bord, Kommandant. Ich bin AURA, die Stationsintelligenz von Halo.', 'AURA: Tausend Jahre habe ich gewartet. Die Station ist beschädigt – aber du kannst sie wieder aufbauen.', 'AURA: Mit Sternstaub baust du Module. Du bekommst ihn für Siege auf Nyxara, durch Expeditionen und wenn du die Station verteidigst.', 'AURA: Hier sind 200 Sternstaub als Startkapital.'], N); }
      return stationMenu(g);
    case 'tor_herz':
      await say(['Pip: Das hier ist das Tor zum Sternenherz. Dort werden Sterne geboren. Und dort ist Kehl.', 'Pip: Was immer passiert – ich bin froh, dass ich an deinem Strand aufgewacht bin.'], { name: 'Pip' });
      if (!await ask('Durch das Tor zum Sternenherz?')) return;
      sfx('shiny'); await fade(1, 500); g.ow.load('sternenherz', 7, 10, 'up'); g.ow.music(); await fade(0, 700); return;
    case 'kehl_herz': return finale(g, n);
    default: return false;
  }
}
async function oru(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  if (!f.oruMet) {
    f.oruMet = true; g.save(true);
    return say(['Oru: Ein Kind von den Wassersternen. Mit einem Splitter des Großen Kindes an der Seite.', 'Oru: Vor einem Mond kam eine Frau durch das Tor. Sie hat die Station genommen und zapft das Sternenherz an, wo Sterne geboren werden.', 'Oru: Wenn sie die Kraft des Großen Kindes – ihr nennt es Thalassyr – an sich bindet, verlöschen die Sterne. Einer nach dem anderen.', 'Oru: Der Himmelsfaden zur Station öffnet sich nur mit dem Sternensegen. Den gibt dir nur einer: Nyxion, der Wächter der Nacht.', 'Oru: Er wohnt am Nordrand des Kristallwalds. Stell dich ihm. Sieg oder Bindung – beides zählt.'], N);
  }
  if (!f.sternsegen && (s.dex.caught.nyxion || f.nyxionBesiegt)) {
    f.sternsegen = true; s.bag.sternsegen = 1; sfx('caught');
    await say(['Oru: Die Nacht hat dich erkannt. Nimm den Sternensegen.', `${s.name} erhält den STERNENSEGEN!`, 'Oru: Der Himmelsfaden liegt östlich des Kristallwalds. Möge das Licht dich tragen.'], N); return g.save(true);
  }
  if (!f.sternsegen) return say('Oru: Nyxion wartet am Nordrand des Kristallwalds.', N);
  return say(f.finale3 ? ['Oru: Die Sterne leuchten wieder. Und das Große Kind schläft ruhig in euren Meeren.'] : ['Oru: Der Himmelsfaden wartet.'], N);
}
async function rask(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  if (!f.tr_jaeger7 || !f.tr_jaeger8) return say('Kommandant Rask: Erst meine Leute.', N);
  await g.cutIn(n);
  await say(['Kommandant Rask: Die Professorin ist im Sternenherz. Sie wird zur Herrin aller Gezeiten. Und ich halte die Tür.', 'Kommandant Rask: Niemand kommt an mir vorbei!'], N);
  const won = await g.trainerFight({ name: 'Kommandant Rask', look: n.look, team: [['halowaechter', 95], ['satellor', 95], ['nebelhai', 96], ['auroradrache', 97]], reward: 15000, lose: 'Sie wird es … trotzdem schaffen …', music: 'boss', bg: 'liga' });
  if (!won) return say('Kommandant Rask: Raus aus meiner Station!', N);
  await fade(1, 300); f.haloFrei = true; g.ow.npcs = g.ow.npcs.filter(x => x !== n); await fade(0, 300); sfx('lvl');
  await say(['Die Lichter der Station flackern – dann werden sie golden.', 'Eine Stimme hallt durch die Gänge: „NEUER KOMMANDANT ERKANNT.“', 'Auf Rasks Konsole liegt eine Notiz.']);
  await HX.addLog(g, 18);
  await say(['Sprich mit AURA im Andockring, um die Station auszubauen.', 'Im Kern der Station wartet Pip am Tor zum Sternenherz.']); g.save(true);
}
async function finale(g, n) {
  const s = g.state, f = s.flags, ow = g.ow, KN = { name: 'Maren Kehl' };
  if (f.finale3) return;
  ow.busy = true; setMusic('finale'); await g.cutIn(n);
  await say(['Um dich herum: Nebel aus Licht, in dem winzige Sterne geboren werden. Mitten darin steht Kehl. Ihr Kittel glüht.', 'Kehl: Du bist gekommen. Natürlich. Livs Kind kommt immer.', 'Kehl: Weißt du, was ich hier gefunden habe? Thalassyrs wahre Kraft. Die Kraft, die es als Stern hatte, bevor es fiel.', 'Kehl: Mit ihr halte ich jede Welle an. In allen Welten. Kein Kind wird mehr am Strand warten.', 'Kehl: … Das wollte ich doch immer. Oder?'], KN);
  const won = await g.trainerFight({ name: 'Maren Kehl', look: n.look, team: [['galaxora', 96], ['kristalldrache', 97], ['halowaechter', 97], ['auroradrache', 98], ['riesenstern', 99], ['urmeduse', 100]], reward: 50000, lose: 'Warum … warum fühlt sich das an wie Erleichterung?', music: 'finale', bg: 'liga', noBlackout: true });
  if (!won) { ow.busy = false; s.team.forEach(healMon); return say('Kehl: Ruh dich aus. Die Sterne haben Zeit. Ich nicht.', KN); }
  ow.busy = true; s.team.forEach(healMon);
  await say(['Kehl: Es ist zu spät. Ich habe die Kraft schon gerufen.'], KN);
  G.shake = 1.5; await fade(0.9, 200); await fade(0, 500);
  await say(['Aus dem Sternennebel formt sich ein Wesen aus reinem Licht – Thalassyrs Sternengestalt. Es ist wütend. Verwirrt. Allein.', 'Pip: Es weiß nicht, wo es ist. Es sucht seine Mutter!'], {});
  // Erster Bund: die erste Kreatur lernt Ursprungsflut
  const fb = s.team.find(m => m.bond === 'erster') || s.box.find(m => m.bond === 'erster');
  if (fb && !fb.moves.some(x => x.id === 'ursprungsflut')) {
    const worst = fb.moves.reduce((a, b) => ((MOVES[a.id]?.pow || 0) <= (MOVES[b.id]?.pow || 0) ? a : b));
    if (fb.moves.length >= 4) fb.moves.splice(fb.moves.indexOf(worst), 1);
    fb.moves.push({ id: 'ursprungsflut', pp: 5 });
    await say([`${monName(fb)} – deine allererste Kreatur, vom Dünenpfad – leuchtet auf.`, `Der ERSTE BUND erwacht! ${monName(fb)} lernt URSPRUNGSFLUT!`]);
  }
  const r = await g.wildBattle(null, 'liga', Object.assign(createMon('thalassyr', 100), { revier: true }), { noCatch: true, noBlackout: true });
  ow.busy = true; s.team.forEach(healMon);
  await say([r?.result === 'win' ? 'Thalassyrs Sternengestalt sinkt in sich zusammen.' : 'Thalassyrs Sternengestalt hält inne.', 'Da öffnet sich der Nebel. Ein gewaltiges Wesen, so groß wie ein Mond, beugt sich herab: KOSMARA, die Mutter der Sterne.', 'Sie berührt Thalassyrs Licht. Es wird ruhig. Es lächelt. Und dann fließt es zurück – durch das Tor, in die Meere, wo es weiterschlafen und wachsen darf.']);
  await say(['Kehl: … Ich wollte das Meer beherrschen, damit es niemanden mehr nimmt.', 'Kehl: Aber es hat nie jemanden genommen. Es hat nur … gewartet. So wie ich.', `Kehl: Ich bleibe hier, ${s.name}. Kosmara braucht jemanden, der ihr hilft, die neuen Sterne zu zählen. Ich glaube, das kann ich.`], KN);
  await say(['Pip: …', 'Pip: Ich könnte jetzt auch zurück. Zu Kosmara. Nach Hause.', `Pip: Aber weißt du was? Mein Zuhause ist da, wo ${s.name} ist. Und Jaro. Und Oma Wellas furchtbar leckere Pfannkuchen.`, 'Pip: Ich komm mit dir. Für immer. Na ja – solange du mich lässt.'], { name: 'Pip' });
  const P = createMon('pipstern', 70, Math.random, { friendship: 255 }); P.nick = 'Pip'; P.bond = 'pip'; g.markDex('pipstern', true);
  if (s.team.length < 6) s.team.push(P); else s.box.push(P);
  sfx('caught'); await say('Pip schließt sich deinem Team an!');
  f.finale3 = true; f.w3done = true; station(s).lastDef = Date.now(); ow.npcs = ow.npcs.filter(x => x !== n); g.save(true);
  await fade(1, 800); await credits(g); ow.load('halo_kern', 7, 9, 'down'); setMusic(null); ow.music(); await fade(0, 800);
  await say(['Station Halo. Die Lichter leuchten golden. Jaro schläft auf einer Kiste, Pip zählt Sterne durch das Fenster.', 'Die Geschichte ist erzählt – aber Halo braucht seinen Kommandanten. Baue die Station aus, erkunde Nyxara und finde die letzten Legendären!']);
  ow.busy = false; g.save(true);
}

export async function afterGym() {}
export async function mapEvent(g, id) {
  const s = g.state, ow = g.ow, f = s.flags;
  if ((id === 'halo_dock' || id === 'halo_kern') && f.haloFrei && f.finale3 !== undefined) {
    const st = station(s);
    if (Date.now() - (st.lastDef || 0) > 30 * 60000 && Math.random() < 0.5 && s.team.some(m => !m.egg && m.hp > 0)) { st.lastDef = Date.now(); ow.busy = true; await wait(500); await defense(g); ow.busy = false; }
  }
  if (id === 'lumara' && !f.reachedLY) { f.reachedLY = true; ow.busy = true; await wait(450); await say(['Lumara. Häuser aus gewachsenem Kristall, Laternen aus Glühwürmchen. Die Nyxari mustern euch neugierig.']); ow.busy = false; g.save(true); }
}
// Sternstaub für Siege auf Nyxara und in Halo; Nyxion zählt auch als Sieg für die Prüfung
export async function afterBattle(g, r) {
  const s = g.state; if ((s.world || 1) !== 3 || !s.flags.w3start) return;
  if (r?.result === 'win' || r?.result === 'caught') station(s).dust += 8;
}
export function moveBlock(g, map, x, y) {
  const f = g.state.flags;
  if (map === 'halofuss' && y === 1 && (x === 8 || x === 9) && !f.sternsegen) { g.ow.busy = true; (async () => { await say(['Der Himmelsfaden summt, aber er reagiert nicht.', 'Eine Inschrift in leuchtenden Zeichen: „Nur wer den Segen der Nacht trägt, steigt zu den Sternen.“']); g.ow.busy = false; })(); return true; }
  return false;
}
