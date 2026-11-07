// Akt 4: Glutinsel (Arena 6), Sturmspitze (Arena 7), das Kloster der Stillen See, Kronfels (Arena 8), die Liga – Ende von Welt 1
import { say, ask } from './gbui.js';
import { fade, wait, G } from './engine.js';
import { sfx, cry, setMusic } from '../core/audio.js';
import { SPECIES } from '../data/creatures.js';
import { LOOK } from './maps.js';
import { addPort } from './travel.js';
import { counterOf } from './story.js';

let H; export function init(h) { H = h; }
addPort('glutinsel', { name: 'Glutinsel (Südostinsel)', x: 3, y: 9, dir: 'right' });
addPort('sturmspitze', { name: 'Sturmspitze (Bergspitze)', x: 10, y: 15, dir: 'up' });
addPort('kronfels', { name: 'Kronfels (Königsinsel)', x: 10, y: 15, dir: 'up' });
addPort('ligainsel', { name: 'Liga-Insel', x: 10, y: 12, dir: 'up' });

export const GYMS = {
  hekla: {
    badge: 5, badgeName: 'GLUTORDEN', team: [['aschling', 41], ['magmator', 43], ['mirageon', 43], ['glutfalke', 45]], reward: 4600, bg: 'vulkan',
    intro: ['Hekla: Du hast den Berg geheilt. Ignivar schläft wieder ruhig.', 'Hekla: Ich bin Hekla, Schmiedin. Ich schmiede Stahl – und Trainer. Mal sehen, ob du bei Hitze bestehst!'],
    lose: 'Hekla: Gut geschmiedet. Hart und doch biegsam. So muss ein Trainer sein.',
    gift: { text: ['Hekla: Nimm diese Top-Beleber. Wer gegen den Orden kämpft, braucht sie.'], items: { topbeleber: 2, hypertrank: 3 } },
    outro: ['Hekla: Der Orden hat drei Viertel seines Kristalls gefüllt. Mit Strom, mit Glut … als Nächstes mit Wind.', 'Hekla: Auf Sturmspitze tobt seit Tagen ein Sturm, der nicht aufhört. Das ist kein Zufall.'],
    after: ['Hekla: Der Glutorden steht dir. Er ist aus dem Erz unter dem Krater geschmiedet.'],
  },
  corvin: {
    badge: 6, badgeName: 'STURMORDEN', team: [['orkanadler', 46], ['nimbora', 46], ['sturmross', 47], ['zyklorn', 47], ['thanatorr', 49]], reward: 5000, bg: 'berg',
    intro: ['Corvin: Der Himmel ist wieder ruhig. Endlich kann ich wieder fliegen!', 'Corvin: Ich bin Corvin. Pilot, Bastler, Arenaleiter. In der Luft gibt es keine Mauern – nur Mut.'],
    lose: 'Corvin: Abgeschossen! Aber was für ein Flug!',
    gift: { text: ['Corvin: Nimm diese Sonderbonbons. Treibstoff für dein Team!'], items: { sonderbonbon: 4, toptrank: 2 } },
    outro: ['Corvin: Komm mal mit in meinen Hangar. Siehst du das? Die Albatros – mein Flugzeug.', 'Corvin: Eines Tages fliege ich damit weiter als jedes Schiff. Bis ans Ende des Meeres.', 'Corvin: Der Orden sitzt jetzt im Kloster auf Kronfels. Dort wartet auch Tamas, der letzte Arenaleiter.'],
    after: ['Corvin: Der Sturmorden steht dir! Wenn ich die Albatros fertig habe, fliegst du als Erste mit.'],
  },
  tamas: {
    badge: 7, badgeName: 'KRONENORDEN', team: [['sahrakor', 51], ['toxicobra', 51], ['klingenhai', 52], ['juwelwyrm', 53], ['kronwyrm', 55]], reward: 6000, bg: 'berg',
    intro: ['Tamas: Du hast das Kloster befreit. Die Drachen haben es gespürt.', 'Tamas: Ich bin Tamas, Hüter der Drachen von Kronfels. Acht Orden – das ist der letzte.', 'Tamas: Zeig mir, ob dein Herz so groß ist wie ein Drachenherz!'],
    lose: 'Tamas: Die Drachen verneigen sich. Und ich mich mit ihnen.',
    gift: { text: ['Tamas: Nimm diese Sternkugeln und Top-Beleber. Die Liga ist kein Spaziergang.'], items: { sternkristall: 8, topbeleber: 3 } },
    outro: ['Tamas: Acht Orden. Damit darfst du zur Liga-Insel – zur Top 4 und zu Admiral Brann.', 'Tamas: Brann ist mehr als ein Champion. Er ist der Einzige, der weiß, was vor zehn Jahren wirklich geschah.'],
    after: ['Tamas: Der Kronenorden steht dir. Die Liga wartet.'],
  },
};
export const QUESTS = {
  gi_kind: { want: 'lavaschleim', title: 'Aris warmer Freund', ask: ['Ich will einen Lavaschleim als Wärmflasche!', 'Die gibt es am Glutpfad. Zeig mir einen!'], thanks: ['Uuuh, {mon} ist sooo warm!', 'Hier, für dich. Die hab ich am Krater gefunden.'], reward: { toptrank: 1, sonderbonbon: 2 }, after: 'Mama sagt, ein Lavaschleim gehört nicht ins Bett. Pfff.' },
  ss_frau: { want: 'wolkli', title: 'Die Regenwolke', ask: ['Meine Mühle braucht Wind – und mein Garten Regen.', 'Ein Wolkli am Windpass könnte beides! Zeigst du mir eins?'], thanks: ['Oh, {mon} regnet ja ein bisschen! Wie süß.', 'Diese Seite lag in der Mühle. Ein Seemann hat sie vor Jahren dagelassen.'], reward: { sternkristall: 5 }, log: 10, after: 'Der Seemann sagte, er käme von der Morgenstern. Er war der Einzige, der zurück durfte.' },
};
export const LOGS = {
  9: ['Tag 92. Der Tor-Kristall braucht die Kraft von Blitz, Glut und Sturm. Drei Inseln – drei Wächter.', 'Ich bitte sie nicht um Hilfe. Ich bitte sie um Erlaubnis.'],
  10: ['Tag 98. Sela will umkehren. Sie hat Angst um ihren Sohn. Ich verstehe sie.', 'Aber wenn wir jetzt umkehren, öffnet ein anderer das Tor. Jemand, der es nicht schützen, sondern benutzen will.'],
  11: ['Tag 99. Maren war heute an Bord. Sie wollte mitkommen. Ich habe nein gesagt.', 'Ihre Augen, als ich nein sagte … Ich hoffe, ich irre mich in ihr.'],
  12: ['Tag 100. Das Tor ist offen. Die Abendstern bringt Sela und Morrow zurück. Ich gehe hindurch.', 'Brann wird es hinter mir versiegeln. Kronar hat es versprochen. Bis mein Kind den Kompass bringt.'],
};
export const SONG = {
  song6: ['Strophe VI – Glutinsel', '„Wo das Feuer schläft im Stein, / soll dein Mut die Fackel sein,', 'wer die Glut im Herzen trägt, / findet, was die Flut bewegt.“'],
  song7: ['Strophe VII – Sturmspitze', '„Wo der Wind die Sterne kämmt, / wo kein Ufer Wellen hemmt,', 'öffne weit das Herz und sieh: / Himmel ist das Meer von hie.“'],
  song8: ['Strophe VIII – Kronfels', '„Wo die Krone Wache hält, / endet diese kleine Welt.', 'Bring den Kompass, bring das Lied – / bis das Tor sich für dich zieht.“'],
};
export const CALLS = {
  hekla: ['Hekla: Ignivar schläft wieder im Krater. Wenn du stark genug bist, besuch ihn. Er mag mutige Leute.'],
  corvin: ['Corvin: Die Albatros macht Fortschritte! Na ja, ein Flügel ist noch ab.', 'Corvin: Zephyra kreist über dem Windpass. Nur Mutige steigen bis zum Gipfel.'],
  tamas: ['Tamas: Die Drachen sind unruhig. Sie spüren, dass das Siegel schwächer wird.'],
  okko2: ['Okko: Mama ist bei mir. Sie redet nicht viel. Aber sie lächelt manchmal.', 'Okko: Danke. Für alles.'],
};

export function goal(s) {
  const f = s.flags;
  if (!f.aebtissin1) return null;
  if (!f.glutFrei) return { t: 'Der kranke Berg', d: 'Segle zur Glutinsel. Der Orden zapft am Krater die Glut des Vulkans ab – Arenaleiterin Hekla ist schon dort.', map: f.reachedGI ? 'glutpfad' : 'glutinsel' };
  if (!s.badges[5]) return { t: 'Arena Glutinsel', d: 'Fordere Schmiedin Hekla heraus! Wasser- und Erd-Attacken löschen Feuer.', map: 'glutinsel' };
  if (!f.sturmFrei) return { t: 'Der ewige Sturm', d: 'Segle nach Sturmspitze und steig den Windpass hinauf. Dort oben treibt der Orden eine Sturmmaschine an.', map: f.reachedSS ? 'windpass' : 'sturmspitze' };
  if (!s.badges[6]) return { t: 'Arena Sturmspitze', d: 'Fordere Pilot Corvin heraus! Elektro- und Eis-Attacken holen Flieger vom Himmel.', map: 'sturmspitze' };
  if (!f.selaBesiegt) return { t: 'Das Kloster', d: 'Segle nach Kronfels. Im Kloster der Stillen See wartet die Äbtissin Sela mit dem Tor-Kristall.', map: 'kronfels' };
  if (!s.badges[7]) return { t: 'Arena Kronfels', d: 'Fordere Drachenhüter Tamas heraus! Drachen fürchten Drachen- und Eis-Attacken.', map: 'kronfels' };
  if (!f.champion) return { t: 'Die Liga', d: 'Segle zur Liga-Insel. Vier Meister und Admiral Brann warten. Zwischen den Kämpfen gibt es keine Heilung!', map: 'ligainsel' };
  return null;
}
export function contacts(s, c) {
  if (s.badges[5]) c.push({ id: 'hekla', name: 'Hekla' });
  if (s.badges[6]) c.push({ id: 'corvin', name: 'Corvin' });
  if (s.badges[7]) c.push({ id: 'tamas', name: 'Tamas' });
  if (s.flags.selaBesiegt) c.push({ id: 'okko2', name: 'Okko (und Sela)' });
}

const LIGA = {
  e4_1: { team: [['venomlurch', 57], ['fungorax', 57], ['kaktoral', 58], ['toxicobra', 58], ['faerora', 59]], reward: 7000, intro: ['Lio: Willkommen in der Liga. Ich bin Lio, der Erste der Top 4.', 'Lio: Meine Kreaturen sind Gift und Dornen. Wer sie unterschätzt, bleibt hängen.', 'Lio: Und denk dran – zwischen den Kämpfen gibt es keine Heilung!'], lose: 'Lio: Du hast meine Wurzeln durchtrennt. Geh weiter.' },
  e4_2: { team: [['palmquak', 58], ['riffkoloss', 58], ['phantomedusa', 59], ['scherator', 59], ['maelstrax', 60]], reward: 7200, intro: ['Marisol: Ich bin Marisol. Ich bin mit Liv zur See gefahren, als wir jung waren.', 'Marisol: Wenn du ihr Kind bist, dann zeig mir, ob du ihre Wellen geerbt hast!'], lose: 'Marisol: Ja. Das ist Livs Brandung. Geh weiter.' },
  e4_3: { team: [['noktara', 59], ['strigon', 59], ['ankerfuerst', 60], ['mondheuler', 60], ['nachtschwing', 61]], reward: 7400, intro: ['Raven: Psst. Hörst du sie? Die Schatten flüstern deinen Namen.', 'Raven: Ich bin Raven. Meine Kreaturen leben dort, wo das Licht nicht hinkommt.'], lose: 'Raven: Die Schatten sind still geworden. Selten.' },
  e4_4: { team: [['arkanuvia', 60], ['sternmott', 60], ['kristallux', 61], ['lumicap', 61], ['cervalis', 62]], reward: 7600, intro: ['Saphira: Ich bin Saphira, die Letzte der Top 4. Magie und Licht – die ältesten Kräfte.', 'Saphira: Hinter mir wartet Admiral Brann. Er wartet schon sehr lange auf dich.'], lose: 'Saphira: Mein Licht ist erloschen. Geh. Er wartet.' },
  brann: { team: [['widderkraft', 62], ['getriebor', 62], ['sahrakor', 63], ['sturmross', 63], ['nebelhirsch', 64], ['kronwyrm', 65]], reward: 20000, intro: ['Brann: Du bist also gekommen. Mit dem Kompass. Genau wie sie es vorhergesagt hat.', 'Brann: Ich bin Admiral Brann, Champion von Kalmara. Vor zehn Jahren habe ich mit Kronars Hilfe das Tor hinter deiner Mutter versiegelt.', 'Brann: Sie bat mich darum. Und sie bat mich, es nur für jemanden zu öffnen, der stärker ist als ich.', 'Brann: Also – zeig es mir!'], lose: 'Brann: … So ist es. Du bist stärker als ich.' },
};
const ORDER = ['e4_1', 'e4_2', 'e4_3', 'e4_4', 'brann'];

export async function talk(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  switch (n.id) {
    case 'harm_gi': case 'harm_ss': case 'harm_kf': case 'harm_li': { const { sailMenu } = await import('./travel.js'); return sailMenu(g, g.ow.id); }
    case 'gi_schmied': return say(f.glutFrei ? ['Der Berg ist ruhig. Hekla schmiedet wieder – hörst du den Hammer?'] : ['Der Vulkan bebt seit Tagen. Leute in grauen Kutten sind zum Krater am Ende des Glutpfads gestiegen.', 'Hekla ist ihnen nach. Allein. Typisch Hekla.'], N);
    case 'gi_alte': return say(['Im Krater schläft Ignivar, der Wächter der Glut. Er wacht nur auf, wenn jemand ihn ruft – oder ihn bestiehlt.'], N);
    case 'hekla_k': return say(f.funke2 ? ['Hekla: Danke! Ich geh zurück in meine Arena.'] : ['Hekla: Der Kerl da vorne leitet die Glut des Berges in seinen Kristall. Ignivar wird gleich wach – und dann bebt die ganze Insel!', 'Hekla: Meine Kreaturen sind erschöpft. Halt ihn auf!'], N);
    case 'funke2': return funke2(g, n);
    case 'hekla': case 'corvin': case 'tamas': return g.gym(n);
    case 'ss_mech': return say(['Die Albatros? Corvins Baby. Er will damit über das Ende des Meeres hinausfliegen.', 'Ich sag ihm immer: Da ist nichts. Er sagt: Genau deshalb.'], N);
    case 'jaro_ss': return jaro4(g, n);
    case 'corvin_wp': return say(['Corvin: Diese Maschine erzeugt den Sturm! Meine Flieger kommen nicht dagegen an.', 'Corvin: Halt den Kerl auf, dann kümmere ich mich um den Rest.'], N);
    case 'boe': return boe(g, n);
    case 'kf_wache': return say(f.selaBesiegt ? ['Das Kloster ist frei. Die Novizen sind nach Hause gegangen. Manche weinen.'] : ['Der Orden hat das Kloster besetzt. Tamas ist hineingegangen und nicht zurückgekommen.', 'Die Leute sagen, das Meer sei heute so still wie noch nie.'], N);
    case 'kf_alte': return say(['Vor tausend Jahren schlief unter Kronfels ein Wächter. Kronar. Er hütet ein Tor, das in eine andere Welt führt.', 'Brann, unser Champion, ist der Einzige, der mit ihm gesprochen hat.'], N);
    case 'funke3': return funke3(g, n);
    case 'tamas_k': return say(['Tamas: Sie hat den Kristall fast voll. Wenn sie ihn auslöst, steht das Meer still – überall.', 'Tamas: Meine Drachen sind gebannt. Nur du kannst sie aufhalten!'], N);
    case 'sela': return sela(g, n);
    case 'li_waechter': return say(f.champion ? ['Champion! Die Liga erwartet dich jederzeit zur Revanche.'] : s.badges[7] ? ['Acht Orden. Du darfst eintreten. Zwischen den Kämpfen gibt es keine Heilung – bereite dich gut vor!'] : ['Nur mit acht Orden.'], N);
    case 'jaro_li': return jaro5(g, n);
    case 'e4_1': case 'e4_2': case 'e4_3': case 'e4_4': case 'brann': return ligaFight(g, n);
    default: return false;
  }
}

async function funke2(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  if (!f.tr_orden8 || !f.tr_orden9) return say('Bruder Funke: Nicht jetzt!', N);
  await g.cutIn(n);
  await say(['Bruder Funke: Du schon wieder! Siehst du nicht, dass der Kristall fast voll ist?', 'Bruder Funke: Noch ein bisschen Glut, und die Äbtissin kann das Meer anhalten. Für immer!'], N);
  const won = await g.trainerFight({ name: 'Bruder Funke', look: n.look, team: [['voltrex', 42], ['magmator', 42], ['getriebor', 43], ['oelmotte', 43]], reward: 3600, lose: 'Schon wieder …', music: 'boss', bg: 'vulkan' });
  if (!won) return say('Bruder Funke: Hau ab, bevor der Berg explodiert!', N);
  await say(['Bruder Funke: … Weißt du, wer uns den Kristall gebaut hat? Nicht die Äbtissin.', 'Bruder Funke: Eine Professorin. Ich weiß ihren Namen nicht. Nur, dass sie sehr viel Geld hat und sehr wenig Geduld.'], N);
  await fade(1, 300); f.funke2 = true; f.glutFrei = true; g.ow.npcs = g.ow.npcs.filter(x => x !== n && x.id !== 'hekla_k'); G.shake = 1; await fade(0, 300);
  await say(['Der Boden bebt ein letztes Mal. Dann wird es still. Ganz oben im Krater glüht ein riesiger Schatten auf – und legt sich wieder schlafen.', 'Neben Funkes Gerät liegt ein Blatt Papier …']);
  await H.addLog(g, 9); g.save(true);
}
async function jaro4(g, n) {
  const s = g.state, f = s.flags, opp = counterOf(s), fin = SPECIES[SPECIES[opp].evo?.to]?.evo?.to || opp;
  await say(['Jaro: Hey! Sechs Orden? Ich hab fünf. Fünf!', 'Jaro: Ich war auf allen Inseln. Überall erzählen sie von dir. Das nervt.', 'Jaro: Aber weißt du was? Ich hab mich verändert. Zeig ich dir jetzt!'], { name: 'Jaro' });
  const won = await g.trainerFight({ name: 'Rivale Jaro', look: LOOK.jaro, team: [['zyklorn', 45], ['basaltor', 45], ['mondheuler', 46], ['fulgurax', 46], [fin, 48]], reward: 4800, lose: 'Wieder! Wie machst du das?!', bg: 'berg' });
  await say([won ? 'Jaro: … Okay. Du bist besser. Aber nicht mehr lange!' : 'Jaro: HA! Endlich!', 'Jaro: Sag mal … glaubst du, deine Mutter erkennt dich noch? Nach zehn Jahren?', 'Jaro: Blöde Frage. Natürlich tut sie das. Wir sehen uns bei der Liga!'], { name: 'Jaro' });
  await fade(1, 250); f.jaro4 = true; g.ow.npcs = g.ow.npcs.filter(x => x !== n); await fade(0, 250); g.save(true);
}
async function boe(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  if (!f.tr_orden10 || !f.tr_orden11) return say('Bruder Böe: Meine Novizen halten dich auf!', N);
  await g.cutIn(n);
  await say(['Bruder Böe: Der letzte Rest! Der Wind von Sturmspitze füllt den Kristall bis zum Rand.', 'Bruder Böe: Die Äbtissin wartet im Kloster auf Kronfels. Heute Nacht steht das Meer still!'], N);
  const won = await g.trainerFight({ name: 'Bruder Böe', look: n.look, team: [['orkanadler', 46], ['nimbora', 46], ['phantomedusa', 47], ['thanatorr', 48]], reward: 4000, lose: 'Flaute …', music: 'boss', bg: 'berg' });
  if (!won) return say('Bruder Böe: Der Wind ist auf meiner Seite!', N);
  await say(['Bruder Böe: Egal. Der Kristall ist voll. Ich habe ihn heute Morgen nach Kronfels geschickt.'], N);
  await fade(1, 300); f.sturmFrei = true; g.ow.npcs = g.ow.npcs.filter(x => x !== n && x.id !== 'corvin_wp'); sfx('heal'); await fade(0, 300);
  await say(['Die Maschine verstummt. Der Sturm legt sich. Zum ersten Mal seit Tagen sieht man die Sonne über Sturmspitze.', 'Ganz oben am Gipfel ordnen sich die Wolken zu einer Spirale …']);
  await H.give(g, 'sonderbonbon', 3); g.save(true);
}
async function funke3(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  await say(['Bruder Funke: Du. Natürlich du.', 'Bruder Funke: Weißt du, ich hab nachgedacht. Über meinen Bruder. Ob er gewollt hätte, dass das Meer stillsteht.', 'Bruder Funke: Er war Fischer. Er hat das Meer geliebt. … Lass uns ein letztes Mal kämpfen. Ehrlich.'], N);
  const won = await g.trainerFight({ name: 'Bruder Funke', look: n.look, team: [['voltrex', 49], ['magmator', 49], ['getriebor', 50], ['blitzhase', 50]], reward: 3000, lose: 'Danke.', bg: 'arena' });
  if (!won) return say('Bruder Funke: Komm wieder.', N);
  await say(['Bruder Funke: Ich gehe. Nach Hause. Fischen, wie mein Bruder.', 'Bruder Funke: Die Professorin, die uns bezahlt … sie heißt Kehl. Maren Kehl. Pass auf sie auf.'], N);
  await fade(1, 250); f.funke3 = true; g.ow.npcs = g.ow.npcs.filter(x => x !== n); await fade(0, 250); g.save(true);
}
async function sela(g, n) {
  const s = g.state, f = s.flags, N = { name: 'Äbtissin Sela' }, ow = g.ow;
  if (!f.tr_orden12 || !f.tr_orden13 || !f.tr_orden14) return say('Äbtissin Sela: Meine Schwestern und Brüder werden dich aufhalten.', N);
  await g.cutIn(n);
  await say(['Äbtissin Sela: Livs Kind. Ich wusste, dass du kommst.', 'Äbtissin Sela: Siehst du den Kristall? Blitz, Glut und Sturm. Damit halte ich das Meer an.', 'Äbtissin Sela: Kein Schiff wird mehr auslaufen. Kein Kind wird mehr am Strand warten. Kein Tor wird sich je wieder öffnen.'], N);
  await fade(0.6, 400); G.shake = 1; sfx('shiny'); await fade(0, 400);
  await say(['Der Kristall leuchtet auf. Draußen hören die Wellen auf zu rauschen. Das ganze Meer … steht still.'], {});
  await say(['Äbtissin Sela: Hörst du das? Diese Stille? So klingt Frieden.', 'Äbtissin Sela: Wenn du es mir nehmen willst – dann kämpfe!'], N);
  const won = await g.trainerFight({ name: 'Äbtissin Sela', look: n.look, team: [['phantomedusa', 52], ['ankerfuerst', 52], ['nimbora', 52], ['palmquak', 53], ['kronwyrm', 54]], reward: 8000, lose: 'Das Meer … rauscht wieder …', music: 'finale', bg: 'ruine' });
  if (!won) return say('Äbtissin Sela: Geh nach Hause. Das Meer ist still. Es ist vorbei.', N);
  await say(['Äbtissin Sela: … Ich höre die Wellen wieder.', 'Äbtissin Sela: Ich war am Steuer, als das Tor sich öffnete. Ich habe Liv angefleht umzukehren. Ich habe meinen Sohn zehn Jahre lang nicht gesehen, weil ich mich geschämt habe.'], N);
  // Kehl erscheint
  const K = { id: 'kehl_k', name: 'Prof. Kehl', look: LOOK.kehl, x: ow.p.x + 1, y: ow.p.y + 2, dir: 'up', px: (ow.p.x + 1) * 16, py: (ow.p.y + 2) * 16 };
  if (ow.solid(K.x, K.y)) { K.x = ow.p.x - 1; K.px = K.x * 16; }
  ow.npcs.push(K); setMusic('boss'); await g.cutIn(K);
  await say(['Kehl: Bravo. Wirklich, bravo.', `Kehl: Danke, Sela. Du hast den Kristall perfekt geladen. Und danke, ${s.name} – ohne dich hätte ich nie gewusst, dass der Kompass zurück ist.`, 'Äbtissin Sela: … Maren? Was tust du hier?', 'Kehl: Was ich vor zehn Jahren tun wollte. Liv hat mich nicht mitgenommen. Sie meinte, ich würde das Tor „benutzen“ statt es zu schützen.', 'Kehl: Sie hatte recht.'], { name: 'Prof. Kehl' });
  await fade(0.9, 150); sfx('shiny'); G.shake = 1.2; await fade(0, 400);
  await say(['Kehl reißt den Kristall an sich. Ein Riss aus Licht öffnet sich in der Luft – und sie tritt hindurch.', 'Kehl: Der Kompass ist der Schlüssel, der Kristall die Kraft. Ich brauche nur noch eines von beiden. Wir sehen uns hinter dem Tor, Livs Kind.'], {});
  await fade(1, 300); ow.npcs = ow.npcs.filter(x => x !== K); await fade(0, 300);
  const O = { id: 'okko_k', name: 'Okko', look: LOOK.okko, x: 7, y: 12, dir: 'up', px: 112, py: 192 };
  ow.npcs.push(O); await ow.npcWalkTo(O, n.x, n.y + 1);
  await say(['Okko: Mama …?', 'Äbtissin Sela: … Okko. Du bist so groß geworden.', 'Okko: Komm nach Hause. Bitte.'], { name: 'Okko' });
  await fade(1, 500); f.selaBesiegt = true; f.kehlVerrat = true; ow.npcs = ow.npcs.filter(x => ![n, O].includes(x) && x.id !== 'tamas_k'); await fade(0, 500); g.ow.music();
  await H.addLog(g, 11);
  await say(['Das Meer rauscht wieder. Der Orden der Stillen See löst sich auf.', 'Tamas ist frei und wartet in seiner Arena.']); g.save(true);
}
async function jaro5(g, n) {
  const s = g.state, f = s.flags, opp = counterOf(s), fin = SPECIES[SPECIES[opp].evo?.to]?.evo?.to || opp;
  if (!s.badges[7]) return say('Jaro: Ich warte hier auf dich. Hol dir erst deinen achten Orden!', { name: 'Jaro' });
  await say(['Jaro: Acht Orden. Ich auch – seit gestern!', 'Jaro: Weißt du noch? Im Leuchtturm? „Wer zuerst das Ende des Meeres sieht …“', 'Jaro: Die Liga ist der letzte Schritt davor. Und nur einer von uns geht zuerst durch diese Tür!'], { name: 'Jaro' });
  const won = await g.trainerFight({ name: 'Rivale Jaro', look: LOOK.jaro, team: [['zyklorn', 57], ['basaltor', 57], ['mondheuler', 58], ['fulgurax', 58], ['kronwyrm', 59], [fin, 61]], reward: 8000, lose: 'Geh. Du bist dran. … Ich bin stolz auf dich, du Idiot.', bg: 'berg' });
  if (!won) return say('Jaro: Komm wieder, wenn du bereit bist. Ich warte.', { name: 'Jaro' });
  await say(['Jaro: Ich warte hier draußen. Und wenn du rauskommst, will ich alles hören!'], { name: 'Jaro' });
  f.jaro5 = true; g.save(true);
}
async function ligaFight(g, n) {
  const s = g.state, f = s.flags, i = ORDER.indexOf(n.id), L = LIGA[n.id], N = { name: n.name };
  if (f['liga_' + n.id]) return say(n.id === 'brann' ? 'Brann: Du bist der Champion. Geh voran.' : 'Geh weiter. Der Nächste wartet.', N);
  if (i > 0 && !f['liga_' + ORDER[i - 1]]) return say('Du musst die Top 4 der Reihe nach herausfordern. Fang ganz unten an!', N);
  await say(L.intro, N);
  const won = await g.trainerFight({ name: n.id === 'brann' ? 'Champion Brann' : n.name, look: n.look, team: L.team, reward: L.reward, lose: L.lose, bg: 'arena', music: n.id === 'brann' ? 'finale' : 'boss', reso: true });
  if (!won) { for (const k of ORDER) delete f['liga_' + k]; return; }
  f['liga_' + n.id] = true; await say(L.lose, N);
  if (n.id !== 'brann') return;
  await say(['Brann: Zehn Jahre habe ich auf diesen Tag gewartet.', 'Brann: Deine Mutter ist durch das Tor gegangen, weil dahinter etwas schläft, das alle Welten bedroht. Sie bewacht es. Allein.', 'Brann: Und jetzt ist Maren Kehl mit dem Kristall hindurch. Wenn sie es weckt …', 'Brann: Hier. Die letzte Seite aus Livs Logbuch. Sie hat sie mir gegeben, bevor sie ging.'], N);
  await H.addLog(g, 12);
  await g.hallOfFame();
}
// Nach der Ruhmeshalle: zurück nach Muschelbucht, der Kompass erwacht
export async function afterChampion(g, first) {
  const s = g.state, ow = g.ow;
  for (const k of ORDER) delete s.flags['liga_' + k];
  await fade(1, 300); ow.load('muschelbucht', 17, 5, 'up'); await fade(0, 500);
  if (!first) return say('Muschelbucht. Die Möwen kreischen wie immer.');
  setMusic('title');
  await say(['Muschelbucht. Am Abend stehen alle am alten Leuchtturm: Oma Wella, Bosse, Jaro, Okko, Rhea – und Pip.', 'Oma Wella: Champion … Liv wäre so stolz auf dich.', 'Jaro: Ich hab’s nicht gewonnen. Aber weißt du was? Das ist okay. Das Ende des Meeres sehen wir zusammen.']);
  G.shake = 1; sfx('shiny'); await fade(0.9, 200); await fade(0, 600);
  await say(['Der Gezeitenkompass in deiner Tasche wird heiß. Die Nadel dreht sich – schneller, immer schneller.', 'Dann bleibt sie stehen. Sie zeigt nicht mehr hinaus aufs Meer. Sie zeigt nach oben. Und das Stille Ei pocht zum ersten Mal.', 'Pip: Das Siegel ist offen. Kehl hat es von der anderen Seite aufgebrochen.', 'Pip: Morgen früh, am Strand. Dann ist es Zeit.']);
  s.flags.w1done = true; g.save(true);
  await say(['Welt 1 ist geschafft! Herzlichen Glückwunsch, Champion!', 'Die Reise geht weiter: Am Strand von Muschelbucht wartet Pip – und dahinter die Weite See.']);
}

export async function mapEvent(g, id) {
  const s = g.state, ow = g.ow, f = s.flags;
  const unlock = (k, name) => { if (!f['port_' + k]) { f['port_' + k] = true; ow.notify(`Kapitän Harm segelt jetzt auch ${name}!`); } };
  if ((s.world || 1) !== 1) return;
  if (f.aebtissin1) unlock('glutinsel', 'zur Glutinsel');
  if (s.badges[5]) unlock('sturmspitze', 'nach Sturmspitze');
  if (s.badges[6]) unlock('kronfels', 'nach Kronfels');
  if (s.badges[7]) unlock('ligainsel', 'zur Liga-Insel');
  if (id === 'glutinsel' && !f.reachedGI) { f.reachedGI = true; ow.busy = true; await wait(450); await say(['Glutinsel. Die Luft flimmert vor Hitze, und der Boden zittert unter deinen Füßen.', 'Über dem Vulkan im Osten hängt eine rote Wolke.']); ow.busy = false; g.save(true); }
  if (id === 'sturmspitze' && !f.reachedSS) { f.reachedSS = true; ow.busy = true; await wait(450); await say(['Sturmspitze. Der Wind heult so laut, dass man sein eigenes Wort kaum versteht.', 'Die Windmühlen drehen sich rasend schnell – manche haben schon Flügel verloren.']); ow.busy = false; g.save(true); }
  if (id === 'kronfels' && !f.reachedKF) { f.reachedKF = true; ow.busy = true; await wait(450); await say(['Kronfels, die Königsinsel. Über der Stadt thront das Kloster der Stillen See.', 'Das Meer ist unheimlich ruhig. Keine einzige Welle schlägt an den Steg.']); ow.busy = false; g.save(true); }
  if (id === 'kronliga') for (const k of ORDER) delete f['liga_' + k];
}
