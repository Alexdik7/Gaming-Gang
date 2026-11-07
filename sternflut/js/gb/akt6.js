// Akt 6 – Welt 2, Teil 2: Mit der Albatros ins Wolkenreich (Arenen 13–14), das Schattenmeer (Arenen 15–16),
// die Tiefe – Liv, Kehl, Thalassyr, das Stille Ei –, die Liga der Weiten See und das Sternentor
import { say, ask, choose } from './gbui.js';
import { G, fade, wait } from './engine.js';
import { sfx, cry, setMusic } from '../core/audio.js';
import { SPECIES } from '../data/creatures.js';
import { createMon, healMon, monName } from '../data/mon.js';
import { MAPS, ENC, LOOK } from './maps.js';
import { MAPS3, ENC3, LOOK3 } from './maps3.js';
import { addPort, travelScene } from './travel.js';
import '../data/welt2b.js';

Object.assign(MAPS, MAPS3); Object.assign(ENC, ENC3);
MAPS.frosthafen.npcs.push({ id: 'corvin_fr', x: 4, y: 7, dir: 'down', look: LOOK.corvin, name: 'Corvin', showIf: 'albatros' });
MAPS.perlhafen.npcs.push({ id: 'corvin_ph', x: 4, y: 7, dir: 'down', look: LOOK.corvin, name: 'Corvin', showIf: 'albatros' });
addPort('nocthal', { name: 'Nocthal (Schattenmeer)', x: 2, y: 9, dir: 'right', world: 2 });
addPort('meereskrone', { name: 'Meereskrone (Liga)', x: 10, y: 12, dir: 'up', world: 2 });
const AIR = { frosthafen: { name: 'Frosthafen', x: 4, y: 8 }, perlhafen: { name: 'Perlhafen', x: 4, y: 8 }, wolkenhafen: { name: 'Wolkenhafen', x: 4, y: 8 }, astralis: { name: 'Astralis', x: 3, y: 7 } };

let H; export function init(h) { H = h; }

export const GYMS = {
  seraphine: { badge: 12, double: true, badgeName: 'WOLKENORDEN', team: [['wolkenbaer', 79], ['sturmfalke', 79], ['regenbogling', 80], ['federkoenig', 81], ['gewitterbock', 82]], reward: 10400, bg: 'berg',
    intro: ['Seraphine: Willkommen über den Wolken! Hier oben gibt es keinen Boden – nur Vertrauen.', 'Seraphine: Ich bin Seraphine. Ich bin noch nie gefallen. Mal sehen, ob du mich zum ersten Mal stolpern lässt!', 'Seraphine: Und hier oben tanzt man nie allein – wir kämpfen im Doppel!'],
    lose: 'Seraphine: Huch! … Ich bin gefallen. Und es war wunderschön.',
    gift: { text: ['Seraphine: Nimm diese Sonderbonbons – leicht wie Wolken!'], items: { sonderbonbon: 5, toptrank: 2 } },
    outro: ['Seraphine: In Astralis, am Ende des Wolkenpfads, liegt die Sternwarte. Orion wartet dort.', 'Seraphine: Er sagt, er habe in den Sternen ein Lied gefunden. Dein Lied.'],
    after: ['Seraphine: Der Wolkenorden steht dir. Flieg hoch!'] },
  orion: { badge: 13, badgeName: 'STERNENORDEN', team: [['kometara', 81], ['mondmagier', 81], ['teleskopix', 82], ['nebulix', 83], ['sternhirsch', 84]], reward: 11000, bg: 'liga',
    intro: ['Orion: Die Sterne haben dich angekündigt. Schon vor zehn Jahren.', 'Orion: Ich bin Orion. Ich lese den Himmel. Und der Himmel sagt: Kämpfe!'],
    lose: 'Orion: Die Sterne lügen nicht. Sie haben dich gewinnen sehen.',
    gift: { text: ['Orion: Nimm diese Top-Beleber. Wer in die Tiefe will, braucht sie.'], items: { topbeleber: 4, sternkristall: 10 } },
    outro: ['Orion: Komm, sieh durch das Teleskop.'],
    after: ['Orion: Der Sternenorden steht dir. Die Sterne warten – auf dich.'] },
  mortis: { badge: 14, badgeName: 'GEISTERORDEN', team: [['geisterkrabbe', 83], ['laternenhai', 83], ['wrackgolem', 84], ['seelenfalter', 84], ['tiefenwal', 86]], reward: 11600, bg: 'ruine',
    intro: ['Mortis: Willkommen in Nocthal. Hier ist immer Nacht – damit die Toten ruhig schlafen.', 'Mortis: Ich bin Mortis. Ich grabe Gräber und höre zu. Die Toten erzählen viel über dich.'],
    lose: 'Mortis: Die Toten applaudieren. Leise, aber sie tun es.',
    gift: { text: ['Mortis: Nimm diese Schattenkapseln. Im Dunkeln sind sie Gold wert.'], items: { nachtkristall: 8, hypertrank: 4 } },
    outro: ['Mortis: Die Gezeitenjäger sind in der Geisterbucht. Ihre Anführerin sucht etwas – oder jemanden.', 'Mortis: Selene, die Mondpriesterin von Nachtfels, ist ihnen nach.'],
    after: ['Mortis: Der Geisterorden steht dir. Schlaf gut – das wünsche ich jedem.'] },
  selene: { badge: 15, badgeName: 'NACHTORDEN', team: [['finsterqualle', 85], ['nachtrochen', 85], ['mondmagier', 86], ['abyssor', 86], ['nachtfuerst', 88]], reward: 12400, bg: 'ruine',
    intro: ['Selene: Sechzehn Orden. Das hat noch niemand geschafft – weder in deiner Welt noch in meiner.', 'Selene: Ich bin Selene. Der Mond ist mein Zeuge. Zeig mir dein Licht in der tiefsten Nacht!'],
    lose: 'Selene: Der Mond geht auf. Für dich.',
    gift: { text: ['Selene: Nimm diese Top-Tränke. Unten in der Tiefe gibt es kein Heilzentrum.'], items: { toptrank: 5, topbeleber: 3 } },
    outro: ['Selene: Spürst du das? Das Meer zittert. Es kommt von unten – aus der Tiefe.', 'Selene: Dein kleiner Freund wartet draußen. Er sieht aus, als hätte er Angst.'],
    after: ['Selene: Der Nachtorden steht dir. Geh – die Tiefe ruft.'] },
};
export const QUESTS = {
  wh_kind: { want: 'flauschling', title: 'Flausch-Wolke', ask: ['Ich hab noch nie einen Flauschling gestreichelt!', 'Auf dem Wolkenpfad hüpfen welche. Mit Honig kriegt man sie, sagt Oma.'], thanks: ['SO WEICH! {mon} ist wie eine Wolke!', 'Hier, für dich. Opa hat gesagt, das ist für Notfälle.'], reward: { topbeleber: 2, honig: 3 }, after: 'Wenn ich groß bin, baue ich ein Haus aus Flauschlingen.' },
  nt_laterne: { want: 'laternenhai', title: 'Das Licht in der Tiefe', ask: ['Ein Laternenhai bringt Seeleute nach Hause, sagt man.', 'Zeigst du mir einen? Dann weiß ich, dass mein Bruder einen Weg zurück hat.'], thanks: ['{mon} … Das Licht ist so warm.', 'Danke. Nimm diese Lampe – ich meine, diese Kugeln.'], reward: { tiefseekugel: 5, sonderbonbon: 3 }, after: 'Ich lasse jede Nacht eine Laterne für ihn brennen.' },
};
export const LOGS = {
  16: ['Tag 1200. Thalassyr träumt. Ich sehe seine Träume, wenn ich singe: Sterne, ein violetter Planet, eine Station aus Licht.', 'Es kam von dort. Es fiel als Kind ins Meer und wuchs. Eines Tages will es nach Hause.'],
  17: ['Tag 3650. Heute habe ich ein Licht von oben gesehen. Ein Kompass, der leuchtet.', 'Ich singe weiter. Nur noch ein bisschen. Mein Kind ist unterwegs.'],
};
export const SONG = {};
export const CALLS = {
  seraphine: ['Seraphine: Aerion kreist wieder über dem Wolkenpfad. Er wartet auf jemanden, der keine Angst vor der Höhe hat.'],
  orion: ['Orion: Die Sterne bewegen sich. Ein Tor öffnet sich – nicht im Meer, sondern am Himmel.'],
  mortis: ['Mortis: Die Toten sind ruhig. Seit du da warst, singen sie sogar manchmal.'],
  selene: ['Selene: Noctyra zeigt sich nachts in Nachtfels. Nur denen, die den Mond nicht fürchten.'],
  liv: ['Liv: Hallo, mein Schatz. Ich bin hier, in Perlhafen. Ich koche gerade Suppe. … Sie ist furchtbar.', 'Liv: Pass auf dich auf. Und auf Pip. Er ist wichtiger, als du denkst.'],
};
export function contacts(s, c) {
  for (const [i, id, nm] of [[12, 'seraphine', 'Seraphine'], [13, 'orion', 'Orion'], [14, 'mortis', 'Mortis'], [15, 'selene', 'Selene']]) if (s.badges[i]) c.push({ id, name: nm });
  if (s.flags.livFrei) c.push({ id: 'liv', name: 'Mama (Liv)' });
}
export function goal(s) {
  const f = s.flags;
  if (!f.albatros) return null;
  if (!s.badges[12]) return { t: 'Das Wolkenreich', d: 'Corvin fliegt dich mit der Albatros nach Wolkenhafen. Fordere Seraphine heraus! Elektro-, Eis- und Erd-Attacken helfen gegen Luft.', map: 'wolkenhafen' };
  if (!s.badges[13]) return { t: 'Die Sternwarte', d: 'Folge dem Wolkenpfad nach Astralis. Sterndeuter Orion wartet in der Sternwarte. Schatten- und Metall-Attacken helfen gegen Magie.', map: 'astralis' };
  if (!s.badges[14]) return { t: 'Das Schattenmeer', d: 'Segle mit der Morgenstern nach Nocthal und fordere Mortis heraus. Schatten-Attacken treffen Geister hart.', map: 'nocthal' };
  if (!f.vex2) return { t: 'Die Geisterbucht', d: 'Jägerin Vex ist in der Geisterbucht nördlich von Nocthal. Selene ist ihr gefolgt.', map: 'geisterbucht' };
  if (!s.badges[15]) return { t: 'Arena Nachtfels', d: 'Fordere Mondpriesterin Selene in Nachtfels heraus! Licht- und Magie-Attacken helfen gegen Schatten.', map: 'nachtfels' };
  if (!f.livFrei) return { t: 'Die Tiefe', d: 'Pip wartet in Nachtfels. Der Glockentaucher bringt euch hinunter in die Tiefe – bis zum Grund.', map: 'nachtfels' };
  if (!f.champion2) return { t: 'Die Liga der Weiten See', d: 'Segle zur Meereskrone. Vier Meister und Meereskaiserin Maris warten.', map: 'meereskrone' };
  if (!f.portalOffen) return { t: 'Das Sternentor', d: 'Flieg nach Astralis. Orion hat etwas am Himmel entdeckt.', map: 'astralis' };
  return null;
}

async function fly(g) {
  const s = g.state, list = Object.entries(AIR).filter(([id]) => id !== g.ow.id && (s.flags['air_' + id] || id === 'wolkenhafen'));
  const i = await choose([...list.map(([, P]) => ({ label: P.name, desc: 'Mit der Albatros dorthin fliegen.' })), 'Hierbleiben'], { title: 'FLUGZIEL' });
  if (i === null || i >= list.length) return;
  const [id, P] = list[i];
  sfx('whoosh'); await fade(1, 300); await fade(0, 1); await travelScene(g, 'plane');
  await fade(1, 200); g.ow.load(id, P.x, P.y, 'down'); g.ow.music(); await fade(0, 300); g.save(true);
}
const LIGA2 = {
  w2e4_1: { team: [['korallendrache', 88], ['tiefenhai', 88], ['maelstrax', 89], ['ozeanwal', 89], ['lavawal', 90]], reward: 12000, intro: ['Korvan: Ich bin Korvan. Ich habe die tiefsten Gräben der Weiten See bezwungen.', 'Korvan: Wasser und Drachen – die ältesten Kräfte des Meeres. Halt den Atem an!'], lose: 'Korvan: Weiter. Freya wartet.' },
  w2e4_2: { team: [['gletschwyrm', 88], ['aurorafuchs', 89], ['frostschwinge', 89], ['federkoenig', 90], ['polarstern', 90]], reward: 12200, intro: ['Freya: Kälte und Wind. Ich bin Freya, und ich habe noch nie gefroren.', 'Freya: Mal sehen, ob du das änderst!'], lose: 'Freya: … Ich friere. Zum ersten Mal. Geh weiter.' },
  w2e4_3: { team: [['nachtfuerst', 89], ['tiefenkrake', 89], ['finsterqualle', 90], ['wrackgolem', 90], ['abyssor', 91]], reward: 12400, intro: ['Nyra: Ich bin Nyra. Die Schatten des Meeres gehören mir.', 'Nyra: Du hast die Tiefe gesehen. Aber hast du sie auch überlebt?'], lose: 'Nyra: Du hast. Geh – Solon wartet.' },
  w2e4_4: { team: [['sternhirsch', 90], ['kristalldrache', 90], ['perlfuerstin', 91], ['nebulix', 91], ['aurorafalter', 92]], reward: 12600, intro: ['Solon: Ich bin Solon, der Letzte der Top 4. Licht und Magie – das Erbe der Sterne.', 'Solon: Hinter mir wartet Maris. Sie hat die Weite See zwanzig Jahre lang regiert.'], lose: 'Solon: Dein Licht ist heller. Geh.' },
  maris: { team: [['ozeanwal', 92], ['kronwyrm', 92], ['gletschwyrm', 93], ['korallendrache', 93], ['nachtfuerst', 94], ['mantarion', 95]], reward: 30000, intro: ['Maris: Livs Kind. Zwei Welten, sechzehn Orden – und du hast deine Mutter aus der Tiefe geholt.', 'Maris: Ich bin Maris, Meereskaiserin der Weiten See. Ich verneige mich vor niemandem.', 'Maris: Außer vor dem, der mich besiegt. Zeig es mir!'], lose: 'Maris: … Die Weite See hat eine neue Kaiserin. Oder einen neuen Kaiser. Wie du willst.' },
};
const ORDER2 = ['w2e4_1', 'w2e4_2', 'w2e4_3', 'w2e4_4', 'maris'];

export async function talk(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  switch (n.id) {
    case 'corvin_fr': case 'corvin_ph': case 'corvin_wh': case 'corvin_as': await say(['Corvin: Die Albatros ist startklar! Wohin soll’s gehen?'], N); return fly(g);
    case 'seraphine': case 'orion': case 'mortis': case 'selene': return g.gym(n);
    case 'wh_frau': return say(['Die Inseln hier schweben, weil Aerion sie trägt. Jeder Atemzug von ihm hebt uns ein Stück.', 'Aber seit einiger Zeit sinken wir. Ganz langsam. Als würde jemand ihm die Kraft stehlen.'], N);
    case 'wh_alte': return say(['Vor tausend Jahren fiel ein Stern ins Meer. Seitdem schläft er dort und wächst.', 'Wir hier oben haben ihn fallen sehen. Wir erzählen es jedem Kind.'], N);
    case 'as_forscher': return say(['Orion hat in den Sternen ein Muster gefunden. Acht Sternbilder in einer Reihe – wie Strophen eines Liedes.', 'Er sagt, sie zeigen auf einen Planeten, den es eigentlich nicht geben dürfte.'], N);
    case 'nt_alte': return say(['In Nocthal brennt in jedem Haus eine Laterne. Für die Seelen, die das Schattenmeer behalten hat.', 'Noctyra sammelt ihre Erinnerungen. Damit niemand ganz vergessen wird.'], N);
    case 'crew_nt': case 'crew_mk': { const { sailMenu } = await import('./travel.js'); await say('Jaro: Wohin, Käpt’n?', { name: 'Jaro' }); return sailMenu(g, g.ow.id); }
    case 'vex2': return vex2(g, n);
    case 'pip_nf': f.tiefeOffen = true; await say(['Pip: Hörst du es? Das Meer singt. Aber falsch. Ganz falsch.', 'Pip: Kehl hat angefangen. Sie weckt es. Und deine Mama … sie singt dagegen an. Allein.', 'Pip: Wir müssen runter. Jetzt. Der Glockentaucher bringt uns hin.'], { name: 'Pip' }); g.ow.npcs = g.ow.npcs.filter(x => x !== n); g.save(true); return;
    case 'tauchglocke':
      if (!f.tiefeOffen) return say(['Bo: Mit meiner Tauchglocke komme ich tiefer als jeder Helm. Aber da unten ist nichts. Nur Dunkelheit.', 'Bo: Na ja. Und manchmal ein Gesang.'], N);
      if (!await ask('Mit der Tauchglocke in die Tiefe hinab?')) return;
      sfx('whoosh'); await fade(1, 500); g.ow.load('tiefe', 9, 10, 'up'); g.ow.music(); await fade(0, 600); return;
    case 'liv': case 'kehl_grund': return finale(g);
    case 'mk_waechter': return say(f.champion2 ? ['Willkommen zurück, Kaiserin der Weiten See!'] : ['Sechzehn Orden? Dann darfst du hinein. Zwischen den Kämpfen gibt es keine Heilung!'], N);
    case 'w2e4_1': case 'w2e4_2': case 'w2e4_3': case 'w2e4_4': case 'maris': return liga2(g, n);
    default: return false;
  }
}
async function vex2(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  if (!f.tr_medium2 || !f.tr_wrack) return say('Jägerin Vex: …', N);
  await g.cutIn(n);
  await say(['Jägerin Vex: Ich hab gewusst, dass du kommst.', 'Jägerin Vex: Weißt du, warum ich für die Professorin jage? Mein Vater ist im Schattenmeer verschollen. Sie hat versprochen, ihn zurückzuholen, wenn Thalassyr ihr gehorcht.', 'Jägerin Vex: Ich will wissen, ob ich auf der richtigen Seite stehe. Kämpf gegen mich – mit allem!'], N);
  const won = await g.trainerFight({ name: 'Jägerin Vex', look: n.look, team: [['tiefenhai', 83], ['krakador', 83], ['voltrex', 84], ['mantarion', 84], ['nachtfuerst', 85]], reward: 8000, lose: 'So fühlt sich die richtige Seite an.', music: 'boss', bg: 'ruine' });
  if (!won) return say('Jägerin Vex: Noch nicht.', N);
  await say(['Jägerin Vex: Kehl wird niemanden zurückholen. Sie will Thalassyr für sich. Das habe ich in ihren Notizen gelesen.', 'Jägerin Vex: Hier. Diese Seite hat sie deiner Mutter vor Jahren gestohlen. Sie gehört dir.', 'Jägerin Vex: Ich gehe jetzt meinen Vater suchen. Auf meine Art.'], N);
  await fade(1, 300); f.vex2 = true; g.ow.npcs = g.ow.npcs.filter(x => x !== n); await fade(0, 300);
  await H.addLog(g, 16);
  await say('Selene ist zurück nach Nachtfels gegangen. Ihre Arena ist offen.'); g.save(true);
}
async function finale(g) {
  const s = g.state, f = s.flags, ow = g.ow, LN = { name: 'Kapitänin Liv' }, KN = { name: 'Prof. Kehl' };
  if (f.livFrei) return;
  ow.busy = true; setMusic('finale');
  await g.cutIn('liv');
  await say(['In einer Blase aus Licht schwebt eine Frau mit Kapitänshut. Sie singt. Leise, erschöpft – und unendlich schön.', 'Hinter ihr, im Dunkel, öffnet sich ein Auge. Größer als die Morgenstern.'], {});
  await say([`Liv: … ${s.name}? Nein. Nein, du solltest nicht hier sein. Nicht jetzt!`], LN);
  await say(['Kehl: Doch, genau jetzt. Hallo, Liv. Lange nicht gesehen.', 'Kehl: Sechs Splitter. Und der siebte – um deinen Hals.'], KN);
  G.shake = 1; sfx('shiny'); await fade(0.9, 150); await fade(0, 500);
  await say(['Kehl reißt Liv eine Kette vom Hals. Das Lied bricht ab. Die Lichtblase erlischt.', 'Das Meer bebt. Das Auge in der Dunkelheit leuchtet auf.'], {});
  await say(['Kehl: Thalassyr erwacht. Und wer ihm zuerst einen Namen gibt, dem gehört es. Aber vorher …', 'Kehl: … muss ich mich wohl um dich kümmern. Komm, Livs Kind. Ein letztes Mal.'], KN);
  const won = await g.trainerFight({ name: 'Prof. Kehl', look: LOOK.kehl, team: [['phantomedusa', 88], ['gletschwyrm', 89], ['kristalldrache', 89], ['abyssor', 90], ['nachtfuerst', 90], ['arkanuvia', 91]], reward: 20000, lose: 'Nein … nicht jetzt …', music: 'finale', bg: 'wasser', noBlackout: true });
  if (!won) { ow.busy = false; s.team.forEach(healMon); return say(['Kehl: Du bist erschöpft. Ruh dich aus – ich warte. Thalassyr auch.'], KN); }
  ow.busy = true;
  await say(['Kehl: Es ist zu spät. Hörst du? Es ist wach.'], KN);
  G.shake = 1.4; await fade(0.8, 200); await fade(0, 400);
  await say(['Aus der Dunkelheit erhebt sich ein Wesen aus Wasser und Sternenlicht. So groß, dass man sein Ende nicht sieht.', 'In deiner Tasche wird das Stille Ei heiß. Es pocht. Es bricht.']);
  // Das Stille Ei schlüpft
  await fade(1, 300); sfx('evo'); await wait(400); await fade(0, 500);
  const A = createMon('aurelune', 70, Math.random, { friendship: 255 }); A.bond = 'gezeiten'; delete s.bag.stillesei; g.markDex('aurelune', true); cry(SPECIES.aurelune.cry);
  if (s.team.length < 6) s.team.push(A); else s.box.push(A);
  await say(['Aus dem Ei steigt ein Wesen aus Perlmutt und Mondlicht: AURELUNE, die Mutter der Gezeiten!', 'Liv: Das Ei … das ist ihr Kind. Ich habe es all die Jahre gesucht und dir geschickt, damit es in Sicherheit schlüpft.', `Liv: ${s.name}, sing mit mir! Das Lied der Gezeiten. Du kennst es!`], LN);
  const songs = Object.keys(f).filter(k => /^song\d$/.test(k)).length;
  await say(songs >= 8 ? ['Du kennst alle acht Strophen. Du singst – und Liv singt mit. Aurelune stimmt ein.', '„Wo die Flut den Mond verschluckt … bis das Tor sich für dich zieht.“'] : [`Du kennst ${songs} von 8 Strophen. Den Rest summst du – Liv singt die Worte. Aurelune stimmt ein.`]);
  const r = await g.wildBattle(null, 'wasser', Object.assign(createMon('thalassyr', 90), { revier: true }), { noCatch: true, noBlackout: true });
  ow.busy = true; s.team.forEach(healMon);
  await say([r?.result === 'win' ? 'Thalassyr sinkt zurück in die Tiefe. Seine Augen werden schwer.' : 'Thalassyr hält inne. Das Lied umhüllt es wie eine warme Strömung.', 'Ein letzter Atemzug – dann schläft es wieder. Aber in seinem Traum siehst du kurz etwas: Sterne. Einen violetten Planeten. Eine Station aus Licht.']);
  await say(['Kehl: Die Sterne … Ich sehe sie. Dort kommt es her. Dort ist seine wahre Kraft!', 'Ein Riss aus Sternenlicht öffnet sich über ihr. Kehl lacht – und lässt sich hineinziehen.', 'Kehl: Wir sehen uns zwischen den Sternen, Livs Kind!'], KN);
  await fade(1, 500); ow.npcs = ow.npcs.filter(x => x.id !== 'kehl_grund'); f.kehlFinal = true; await fade(0, 500); setMusic('title');
  await say([`Liv: ${s.name} … Du bist so groß geworden.`, 'Liv: Ich habe jeden Abend an dich gedacht. Jeden einzelnen.', 'Liv: Lass uns nach Hause gehen. Na ja – erst mal nach Perlhafen. Ich koche uns Suppe.', 'Pip: (leise) Sie kann keine Suppe kochen.'], LN);
  await H.addLog(g, 17);
  await fade(1, 400); f.livFrei = true; f.port_meereskrone = true; ow.npcs = ow.npcs.filter(x => x.id !== 'liv'); ow.load('perlhafen', 8, 8, 'down'); ow.music(); await fade(0, 500);
  await say(['Liv ist frei! Sie wartet in Perlhafen. Jaro hat geweint – er sagt, es war das Salzwasser.', 'Die Meereskrone, Sitz der Liga der Weiten See, ist jetzt mit der Morgenstern erreichbar.']);
  ow.busy = false; g.save(true);
}
async function liga2(g, n) {
  const s = g.state, f = s.flags, i = ORDER2.indexOf(n.id), L = LIGA2[n.id], N = { name: n.name };
  if (f['liga2_' + n.id]) return say('Geh weiter.', N);
  if (!s.badges[15]) return say('Nur mit sechzehn Orden.', N);
  if (i > 0 && !f['liga2_' + ORDER2[i - 1]]) return say('Fang ganz unten an – die Top 4 der Reihe nach!', N);
  await say(L.intro, N);
  const won = await g.trainerFight({ name: n.id === 'maris' ? 'Champion Maris' : n.name, look: n.look, team: L.team, reward: L.reward, lose: L.lose, bg: 'liga', music: n.id === 'maris' ? 'finale' : 'boss', reso: true });
  if (!won) { for (const k of ORDER2) delete f['liga2_' + k]; return; }
  f['liga2_' + n.id] = true; await say(L.lose, N);
  if (n.id !== 'maris') return;
  const first = !f.champion2; f.champion2 = true; g.save(true);
  await fade(1, 500); for (const k of ORDER2) delete f['liga2_' + k]; g.ow.load('perlhafen', 8, 8, 'down'); g.ow.music(); await fade(0, 500);
  if (!first) return;
  await say(['Perlhafen feiert. Liv, Jaro, Pip, Corvin, Nalu, Kalle – alle stehen am Hafen.', 'Liv: Champion zweier Welten. Und ich hab nur eine Suppe hinbekommen. Eine schlechte.', 'Jaro: Ich hab’s dir doch gesagt. Das Ende des Meeres sehen wir zusammen. Und jetzt? Jetzt kommt der Himmel.']);
  sfx('dex'); await say(['Dein Muschelfon klingelt …', 'Orion: Komm nach Astralis! Am Himmel über der Sternwarte hat sich ein Tor geöffnet. Ein Tor zu den Sternen!']);
  await say(['Pip: … Ich weiß jetzt, wo ich herkomme.', 'Pip: Ich bin ein Stück von Thalassyr. Ein Splitter, der ans Ufer gespült wurde, als es fiel. Ich wollte immer wissen, warum mich das Meer ruft.', 'Pip: Kehl ist dort oben. Und wenn sie Thalassyrs wahre Kraft findet … Bitte. Komm mit mir zu den Sternen.']);
  await say('Welt 2 ist geschafft! Die Reise geht weiter – zu den Sternen.');
}

export async function afterGym(g, id) {
  const s = g.state, f = s.flags;
  if (id === 'orion') {
    f.badgeOrion = true; f.port_nocthal = true;
    await fade(0.85, 400);
    await say(['Durch das Teleskop siehst du acht Sternbilder in einer Reihe. Jedes hat die Form einer Strophe – du erkennst die Zeilen des Lieds der Gezeiten.', 'Sie zeigen auf einen violetten Punkt am Rand des Himmels.', 'Orion: Nyxara. Ein Planet, den es nicht geben dürfte. Von dort ist Thalassyr gefallen – vor tausend Jahren.', 'Orion: Und Kehl weiß das. Sie hat vor einem Monat genau dieses Teleskop benutzt.']);
    await fade(0, 400);
    await say(['Jaro ruft an: Käpt’n, das Schattenmeer ist jetzt befahrbar! Nocthal liegt auf unserer Karte.']);
  }
  if (id === 'selene') f.badgeSelene = true;
}
export async function mapEvent(g, id) {
  const s = g.state, ow = g.ow, f = s.flags;
  if (AIR[id] && f.albatros) f['air_' + id] = true;
  if (id === 'wolkenhafen' && !f.reachedWH) { f.reachedWH = true; ow.busy = true; await wait(450); await say(['Wolkenhafen! Eine Stadt auf einer schwebenden Insel. Unter dir: nichts als Wolken.', 'Jaro: Ich schau nicht runter. Ich schau NICHT runter.']); ow.busy = false; g.save(true); }
  if (id === 'nocthal' && !f.reachedNT) { f.reachedNT = true; ow.busy = true; await wait(450); await say(['Nocthal. Hier geht die Sonne nie auf. In jedem Fenster brennt eine Laterne.']); ow.busy = false; g.save(true); }
  if (id === 'grund' && !f.livFrei) { ow.busy = true; await wait(600); await finale(g); }
  if (id === 'liga2') for (const k of ORDER2) delete f['liga2_' + k];
  if (id === 'astralis' && f.champion2 && !f.portalOffen) {
    f.portalOffen = true; ow.busy = true; await wait(500); G.shake = 0.6; sfx('shiny');
    await say(['Über der Sternwarte dreht sich ein Wirbel aus Sternen – ein Tor, das bis in den Weltraum reicht.', 'Orion: Das Sternentor. Es hat sich geöffnet, als Kehl hindurchging. Und es bleibt offen – für dich.', 'Pip: Bald. Sehr bald.', '(Welt 3 – Nyxara und die Raumstation Halo – kommt mit dem nächsten Update!)']);
    ow.busy = false; g.save(true);
  }
}
