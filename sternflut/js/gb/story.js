// STERNFLUT – Story von Welt 1 (Kalmara). Alles, was hier passiert, zahlt sich später aus (siehe docs/KONZEPT.md).
// Die Klasse Game ruft: talkStory, afterTrainer, mapEvent, edgeBlock, moveBlock, songStone, altarStory, onCaught.
import { say, ask, choose } from './gbui.js';
import { fade, wait } from './engine.js';
import { sfx, cry, setMusic } from '../core/audio.js';
import { SPECIES } from '../data/creatures.js';
import { createMon, healMon, monName } from '../data/mon.js';
import { LOOK, ITEMS, MAPS } from './maps.js';
import { TYPES, effectiveness } from '../data/types.js';
import * as A3 from './akt3.js';
import * as A4 from './akt4.js';
import * as A5 from './akt5.js';
import * as A6 from './akt6.js';
import * as A7 from './akt7.js';
import * as EX from './extras.js';
import * as DG from './dig.js';
import * as IS from './island.js';
import * as AR from './ari.js';
import * as VA from './vato.js';
const ACTS = [A3, A4, A5, A6, A7, EX, DG, IS, AR, VA];
export const fishGame = g => EX.fishGame(g);
export const useItem = async (g, k) => { for (const A of ACTS) if (await A.useItem?.(g, k)) return true; return false; };

const give = async (g, k, n = 1) => { const s = g.state; s.bag[k] = (s.bag[k] || 0) + n; sfx('caught'); await say(`${s.name} erhält ${n > 1 ? n + '× ' : ''}${ITEMS[k].name.toUpperCase()}!`); };
const COUNTER = { zundrak: 'tidolin', tidolin: 'moospip', moospip: 'zundrak' };
export const counterOf = s => COUNTER[s.flags.starter] || 'tidolin';

// ---------------------------------------------------------------- Arenen, Liga, Such-Aufträge
// Arena-Berater: liest Leiter und Team der Arena, in der er steht, und gibt passende Tipps
const tn = t => TYPES[t]?.name || t, list = a => a.length > 1 ? a.slice(0, -1).map(x => x + '-').join(', ') + ' und ' + a[a.length - 1] : a[0]; // „Feuer-, Eis- und Luft-Attacken“
export function guideTips(g) {
  const s = g.state, npcs = MAPS[g.ow.id]?.npcs || [], L = npcs.find(n => GYMS[n.id]), G = L && GYMS[L.id];
  if (!G) return ['Hey, zukünftiger Champion! Der Arenaleiter wartet ganz oben. Viel Erfolg!'];
  const mons = G.team.map(([sp]) => SPECIES[sp]).filter(Boolean), cnt = {};
  for (const m of mons) m.types.forEach((t, i) => (cnt[t] = (cnt[t] || 0) + (i ? 0.6 : 1)));
  const main = Object.entries(cnt).sort((a, b) => b[1] - a[1]), top = main.filter(([, v]) => v >= Math.max(1, main[0][1] * 0.5)).slice(0, 2).map(([t]) => t);
  // Angriffstypen nach durchschnittlicher Wirkung gegen das ganze Team
  const score = Object.keys(TYPES).map(t => [t, mons.reduce((a, m) => a + effectiveness(t, m.types), 0) / mons.length]).filter(([, v]) => v > 1.05).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => tn(t));
  const bad = Object.keys(TYPES).filter(d => d !== 'normal' && top.some(t => effectiveness(t, [d]) > 1)).slice(0, 3).map(tn);
  const mono = top.length === 1 && main[0][1] >= mons.length * 0.8, lvl = Math.max(...G.team.map(x => x[1]));
  const done = s.badges?.[G.badge];
  const out = [done ? `Den ${G.badgeName} hast du schon! ${L.name} trainiert trotzdem jeden Tag weiter.` : `Hey, zukünftiger Champion! ${L.name} wartet ganz oben auf dich.`,
    mono ? `In dieser Arena dreht sich alles um ${tn(top[0])}-Kreaturen.` : `${L.name} kämpft vor allem mit ${list(top.map(tn))}-Kreaturen – aber nicht nur!`];
  if (score.length) out.push(`Am besten wirken ${list(score)}-Attacken. Damit triffst du hier richtig hart!`);
  else out.push('Kein Typ hat hier einen klaren Vorteil – setz auf deine stärksten Kreaturen.');
  if (bad.length) out.push(`Vorsicht mit ${list(bad)}-Kreaturen: Gegen die hat ${L.name} leichtes Spiel.`);
  if (!done) { out.push(`Die stärkste Kreatur ist auf Level ${lvl}${G.double ? ', und gekämpft wird hier zu zweit – zwei gegen zwei!' : '.'}`); out.push('Und denk dran: Heil dein Team vor dem Kampf vollständig auf!'); }
  return out;
}
export const GYMS = {
  rhea: {
    badge: 0, badgeName: 'ANKERORDEN', team: [['kneifling', 12], ['quallux', 12], ['perlschild', 14]], reward: 1600, bg: 'wasser',
    intro: ['Rhea: Du hast mein Leuchtfeuer wieder entzündet. Ohne dich würde ich noch immer im Nebel treiben.', 'Rhea: Aber Dankbarkeit ist eine Sache – ein Orden eine andere.', 'Rhea: Ich bin Kapitänin Rhea. Meine Kreaturen sind die Brandung von Ankerbrück. Halte stand!'],
    lose: 'Rhea: Ha! Du segelst gegen den Wind und kommst trotzdem an. Genau wie deine Mutter.',
    gift: { text: ['Rhea: Nimm auch diesen Attacken-Kristall. Gezeitenschlag – den hat mir einst Liv Sund gezeigt.'], items: { ak_gezeitenschlag: 1, sternkristall: 3 } },
    outro: ['Rhea: Deine Mutter … Liv war meine beste Freundin. Wir sind zusammen zur See gefahren, bevor sie die Morgenstern bekam.', 'Rhea: An ihrem letzten Abend sagte sie: „Der Kompass wird den Weg finden, wenn ich es nicht kann.“', 'Rhea: Ich habe nie verstanden, was sie meinte. Bis heute.'],
    after: ['Rhea: Der Ankerorden steht dir! Wenn du Fragen über Liv hast – ruf mich an.'],
  },
  okko: {
    badge: 1, badgeName: 'DÜNENORDEN', team: [['kieselkopp', 18], ['dunaro', 19], ['sandvipa', 19], ['kaktoral', 21]], reward: 2200, bg: 'wueste',
    intro: ['Okko: Du hast mich aus der Grotte geholt – und die Quelle wieder zum Fließen gebracht.', 'Okko: In Dünenhain sagt man: Wer Wasser bringt, dem gehört der Sand.', 'Okko: Aber meinen Orden bekommst du nur, wenn du mich in meinem Element schlägst. Los!'],
    lose: 'Okko: Der Sand rinnt mir durch die Finger … Du bist schnell. Schneller als der Wind.',
    gift: { text: ['Okko: Nimm diesen Attacken-Kristall. Sandsturz – damit wirbelst du jeden Gegner durcheinander.'], items: { ak_sandsturz: 1, supertrank: 3 } },
    outro: ['Okko: Die Kutten-Leute haben nach der Strophe gegraben. Und Schwester Nebel trug Seiten aus einem alten Logbuch bei sich.', 'Okko: Seiten mit dem Wappen der Morgenstern. Woher hat der Orden die?', 'Okko: Westlich von hier liegt der Glimmwald. Mira ist dort Arenaleiterin – aber ich habe seit Tagen nichts von ihr gehört.'],
    after: ['Okko: Der Dünenorden steht dir! Der Glimmpfad beginnt im Westen der Oase.'],
  },
  mira: {
    badge: 2, badgeName: 'SPORENORDEN', team: [['myzelchen', 23], ['toxquak', 24], ['glimmhut', 24], ['fungorax', 27]], reward: 2800, bg: 'wald',
    intro: ['Mira: Das Waldherz schläft wieder, und mein Dorf ist wach. Das verdanke ich dir.', 'Mira: Ich bin Mira. Meine Kreaturen sind leise, giftig und geduldig – wie der Wald selbst.', 'Mira: Zeig mir, ob du das Dunkel nicht fürchtest!'],
    lose: 'Mira: Du leuchtest heller als jeder Glimmhut. Der Wald hat dich gesehen.',
    gift: { text: ['Mira: Nimm dieses Schutzamulett. Es hat mich einmal vor einem Waldkoloss gerettet.'], items: { schutzamulett: 1, hypertrank: 2 } },
    outro: ['Mira: Unter den Wurzeln des Waldherzens lag einst ein Splitter aus Sternenglas. Er ist weg.', 'Mira: Wer ihn genommen hat, wusste genau, wonach er sucht. Der Orden … oder jemand, der ihm Befehle gibt.', 'Mira: Die nächste Arena ist in Funkenhafen, auf der Ostinsel. Dorthin kommt man nur mit dem Schiff.'],
    after: ['Mira: Der Sporenorden steht dir. Pass auf dich auf, wenn die Nacht kommt.'],
  },
};
export const LIGA = {};
export const QUESTS = {
  mb_frau: { want: 'lumoth', title: 'Licht für Ines', ask: ['Nachts sehe ich auf dem Dünenpfad manchmal kleine Lichter tanzen. Lumoths sollen das sein.', 'Würdest du mir eins zeigen? Mein Sohn hat früher immer davon erzählt …'], thanks: ['Oh … {mon}! Es leuchtet genau so, wie er es beschrieben hat.', 'Danke. Nimm das hier – damit finden dich Kreaturen leichter.'], reward: { lockfutter: 3 }, after: 'Mein Sohn ist Matrose auf einem großen Schiff. Vielleicht siehst du ihn eines Tages.' },
  ab_kid: { want: 'zappgecko', title: 'Der knisternde Gecko', ask: ['Kennst du Zappgeckos? Die kleben an Masten und knistern!', 'Die gibt es auf dem Dünenpfad. Bringst du mir einen zum Anschauen?'], thanks: ['WOW, {mon} knistert ja wirklich!', 'Hier, das hab ich am Hafen gefunden.'], reward: { ak_funkenkette: 1 }, after: 'Wenn ich groß bin, werde ich Ingenieur in Funkenhafen!' },
  dh_kind: { want: 'skarabix', title: 'Tariks Sonnenkäfer', ask: ['Ich will einen Skarabix sehen! Die rollen Sonnenkugeln!', 'Am Küstenweg gibt es welche, aber nur am Tag.'], thanks: ['Er rollt wirklich eine Kugel aus Licht! {mon} ist der Beste!', 'Hier, die hat mir Okko geschenkt. Ich brauch sie nicht.'], reward: { ankerkugel: 3 }, after: 'Wenn ich groß bin, werde ich Sandläufer wie Okko!' },
  gd_jaeger: { want: 'nachtwolp', title: 'Der Welpe im Mondlicht', ask: ['Früher hatte ich einen Nachtwolp. Er ist mit dem Rudel gezogen, als er groß war.', 'Zeig mir einen – nachts im Glimmwald. Ich habe dafür etwas, das ein Seemann vor Jahren hier verloren hat.'], thanks: ['{mon} … Die gleichen Augen. Danke.', 'Diese Seite trug ein Seemann der Morgenstern bei sich. Er kam vor zehn Jahren durch den Wald – allein.'], reward: { echomuschel: 2 }, log: 6, after: 'Der Seemann sagte, er müsse eine Nachricht nach Muschelbucht bringen. Angekommen ist er dort wohl nie.' },
  ab_alte: { want: 'perlschild', title: 'Perlen der Seefrau', ask: ['Früher hat mir ein Perlschild jeden Morgen eine Perle an den Steg gebracht.', 'Man angelt sie im Hafenbecken. Zeigst du mir eines? Ich gebe dir dafür etwas, das ich lange aufbewahrt habe.'], thanks: ['Ach, {mon} … Die Perlen auf seinem Panzer glänzen wie früher.', 'Hier. Diese Seite hat vor Jahren ein Fischer aus dem Netz gezogen. Ich glaube, sie gehört dir.'], reward: { echomuschel: 2 }, log: 2, after: 'Liv hat in diesem Haus oft Tee getrunken. Sie lachte so laut, dass die Möwen erschraken.' },
};

// ---------------------------------------------------------------- Logbuch der Morgenstern (40 Seiten über drei Welten)
export const LOGS = {
  1: ['Tag 1. Die Morgenstern läuft aus. {name} hat geweint, als ich ging.', 'Ich habe Mama Wella versprochen, in einem Jahr zurück zu sein. Der Kompass zeigt hinaus – weiter, als jede Karte reicht.'],
  2: ['Tag 19. Wir haben einen Stein mit einer Strophe gefunden. Das Lied der Gezeiten!', 'Acht Steine im Archipel. Ich glaube, zusammen ergeben sie keinen Text – sondern eine Karte.'],
  4: ['Tag 51. In der Sandgrotte unter Dünenhain steht die zweite Strophe. Die Quelle dort singt dieselbe Melodie.', 'Ich habe die Hälfte meiner Seiten versteckt. Falls die Stille sie findet, soll sie nur Bruchstücke haben.'],
  5: ['Tag 64. Im Glimmwald leuchtet nachts ein Herz aus Pilzen. Unter seinen Wurzeln liegt ein Splitter aus Sternenglas.', 'Er ist kalt und warm zugleich – wie das Ei, das wir an Bord haben. Ich habe ihn dort gelassen. Er gehört dem Wald.'],
  6: ['Tag 70. Kurs Südost. Die Nadel zittert jetzt stärker. Wir sind nah.', 'Rhea, wenn du das liest: Kümmere dich um mein Kind. Und sag ihm, dass ich jeden Abend an es denke.'],
  3: ['Tag 33. In Ankerbrück fragte mich eine Frau in grauer Kutte nach dem Kompass. Sie nannte sich „die Stille“.', 'Ich habe ihr nichts gesagt. Aber sie wusste von dem Tor. Woher?'],
};
export const SONG = {
  song1: ['Strophe I – Ankerbrück', '„Wo die Flut den Mond verschluckt, / liegt ein Kompass, der nicht ruht.', 'Folg der Nadel, nicht dem Nord – / Heimat ist ein ferner Ort.“'],
  song2: ['Strophe II – Sandgrotte', '„Wo der Sand das Wasser trinkt, / wo die Quelle leise singt,', 'zähl die Sterne, sieben weit – / dort beginnt die Gezeitenzeit.“'],
  song3: ['Strophe III – Glimmdorf', '„Wo das Herz im Dunkeln glüht, / wo kein Licht die Wurzeln sieht,', 'liegt ein Splitter, kalt und klar – / Spiegel dessen, was einst war.“'],
};
export async function addLog(g, n) {
  const s = g.state; if (s.flags['log' + n]) return;
  s.flags['log' + n] = true; s.bag.logbuch = 1; sfx('dex');
  const c = Object.keys(s.flags).filter(k => /^log\d+$/.test(k)).length;
  await say([`${s.name} findet eine LOGBUCHSEITE der Morgenstern! (${c}/${Object.keys(LOGS).length})`, ...LOGS[n].map(t => t.replace('{name}', s.name))]);
}

// ---------------------------------------------------------------- Pager: aktuelles Ziel
export function mainGoal(s) {
  const f = s.flags;
  if (!f.prolog) return { t: 'Der Morgen nach dem Sturm', d: 'Pip wartet am Strand südlich von Muschelbucht. Etwas Glänzendes wurde angespült!', map: 'strand' };
  if (!f.gotBalls) return { t: 'Der Kompass', d: 'Prof. Kehl will den Kompass im Labor von Dr. Vato in Muschelbucht untersuchen. Sie forscht dort als Gast.', map: 'muschelbucht' };
  if (!f.promise) return { t: 'Das Versprechen', d: 'Jaro wartet oben im alten Leuchtturm am Ostrand von Muschelbucht.', map: 'muschelbucht' };
  if (!f.reachedAnker) return { t: 'Auf nach Ankerbrück', d: 'Folge dem Dünenpfad nach Norden bis zur Hafenstadt Ankerbrück.', map: 'ankerbrueck' };
  if (!f.heardBeacon) return { t: 'Ein dunkler Hafen', d: 'Irgendetwas stimmt in Ankerbrück nicht. Sprich mit dem Matrosen am Steg im Osten.', map: 'ankerbrueck' };
  if (!f.werftFrei) return { t: 'Die gestohlene Linse', d: 'Der Orden der Stillen See hat die Feuerlinse in die Alte Werft im Süden des Hafens gebracht. Hol sie zurück!', map: 'ankerbrueck' };
  if (!f.beaconLit) return { t: 'Licht für die Schiffe', d: 'Bring die Feuerlinse in den Leuchtfeuer-Turm am Hafen und entzünde das Licht.', map: 'ankerbrueck' };
  if (!s.badges[0]) return { t: 'Arena Ankerbrück', d: 'Kapitänin Rhea ist zurück. Fordere sie in ihrer Arena heraus! Pflanzen- und Elektro-Attacken helfen gegen Wasser.', map: 'ankerbrueck' };
  if (!f.jaro2) return { t: 'Jaro am Hafen', d: 'Jaro wartet auf dem Marktplatz von Ankerbrück auf dich.', map: 'ankerbrueck' };
  if (!f.reachedDH) return { t: 'Über die Brücke', d: 'Die Brücke im Norden von Ankerbrück ist repariert. Folge dem Küstenweg nach Dünenhain.', map: 'duenenhain' };
  if (!f.heardOkko) return { t: 'Die versiegte Oase', d: 'In Dünenhain stimmt etwas nicht. Sprich mit Oma Sefa an der Oase.', map: 'duenenhain' };
  if (!f.okkoBack) return { t: 'Die Sandgrotte', d: 'Okko verfolgt den Orden in die Sandgrotte – der Eingang liegt in den Felsen im Nordosten von Dünenhain.', map: 'duenenhain' };
  if (!s.badges[1]) return { t: 'Arena Dünenhain', d: 'Fordere Sandläufer Okko heraus! Wasser- und Pflanzen-Attacken helfen gegen Erde.', map: 'duenenhain' };
  if (!f.reachedGD) return { t: 'Der Glimmwald', d: 'Folge dem Glimmpfad nach Westen und durch den Glimmwald bis nach Glimmdorf.', map: 'glimmdorf' };
  if (!f.waldherz) return f.heardWaldherz ? { t: 'Das Waldherz', d: 'Beruhige das Waldherz – eine riesige Revierkreatur auf der Lichtung im Westen des Glimmwalds. Schleich dich an!', map: 'glimmwald' } : { t: 'Das schlafende Dorf', d: 'In Glimmdorf schlafen alle. Finde Mira, die Arenaleiterin.', map: 'glimmdorf' };
  if (!s.badges[2]) return { t: 'Arena Glimmdorf', d: 'Fordere Sporenhexe Mira heraus! Feuer-, Luft- und Magie-Attacken helfen gegen Pflanze und Gift.', map: 'glimmdorf' };
  if (!f.jaro3) return { t: 'Jaro', d: 'Jaro wartet am Nordrand von Glimmdorf.', map: 'glimmdorf' };
  for (const A of ACTS) { const r = A.goal?.(s); if (r) return r; }
  return { t: 'Fortsetzung folgt', d: 'Die nächste Etappe kommt mit dem nächsten Update! Bis dahin: Kreaturen sammeln, Revierkreaturen besiegen, kochen, Lied und Logbuch suchen.', map: g_lastMap(s) };
}
export function sideTasks(s) {
  const extra = ACTS.flatMap(A => A.sideTasks?.(s) || []);
  return [...extra, ...Object.entries(QUESTS).filter(([id]) => s.flags['qa_' + id] || s.flags['quest_' + id]).map(([id, q]) => ({ t: q.title, d: s.flags['quest_' + id] ? 'Erledigt!' : `Zeige ${SPECIES[q.want].name}.`, done: !!s.flags['quest_' + id] }))];
}

// ---------------------------------------------------------------- Telefon
export function contacts(s) {
  const f = s.flags, c = [];
  if (s.bag.telefon) c.push({ id: 'oma', name: 'Oma Wella' });
  if (s.bag.telefon) c.push({ id: 'kehl', name: 'Prof. Kehl' });
  if (f.promise) c.push({ id: 'jaro', name: 'Jaro' });
  if (s.badges[0]) c.push({ id: 'rhea', name: 'Kapitänin Rhea' });
  if (s.badges[1]) c.push({ id: 'okko', name: 'Okko' });
  if (s.badges[2]) c.push({ id: 'mira', name: 'Mira' });
  for (const A of ACTS) A.contacts?.(s, c);
  return c;
}
const OMA = ['Deine Mutter hat als Kind jeden Morgen am Strand nach Flaschenpost gesucht. Gefunden hat sie nie eine – aber sie hat nie aufgehört.', 'Liv konnte keine Suppe kochen. Gar keine. Aber sie konnte einen Sturm riechen, Stunden bevor er kam.', 'Weißt du, warum das Schiff Morgenstern hieß? Weil du an einem Morgen geboren wurdest, als der letzte Stern noch am Himmel stand.', 'Der Wärter Bosse und deine Mutter haben oft im Leuchtturm gesessen und über Karten gebrütet. Frag ihn doch mal.'];
export async function call(g, id) {
  const s = g.state, N = { name: contacts(s).find(c => c.id === id)?.name };
  sfx('click'); await say('Tuut … tuut …'); await wait(300);
  for (const A of ACTS) if (A.CALLS?.[id]) return say(A.CALLS[id], N);
  if (id === 'oma') { s.flags.omaCall = ((s.flags.omaCall || 0) + 1) % OMA.length; return say([`Hallo, ${s.name}! Schön, dass du anrufst.`, OMA[s.flags.omaCall]], N); }
  if (id === 'kehl') {
    const n = Object.keys(s.dex.caught).length;
    return say([`Kehl: ${s.name}! Wie geht es dem Kompass? … Ich meine – wie geht es dir?`, `Kehl: Deine Chronik zählt ${n} gebundene Kreaturen. ${n < 10 ? 'Da geht noch mehr!' : 'Beeindruckend!'}`, `Kehl: Mein Tipp: ${mainGoal(s).d}`], N);
  }
  if (id === 'jaro') return say(s.badges[0] ? ['Jaro: Du hast den Ankerorden? Pff. Ich hol ihn mir morgen.', 'Jaro: Und dann hol ich dich ein. Versprochen ist versprochen!'] : ['Jaro: Was gibt’s? Ich trainiere gerade!', 'Jaro: Wir sehen uns in Ankerbrück. Und dann zeig ich dir, wer zuerst das Ende des Meeres sieht!'], N);
  if (id === 'okko') return say(['Okko: Hey! Die Oase ist wieder voll. Die Kinder baden jeden Tag!', 'Okko: Tipp von mir: Revierkreaturen warnen dich, bevor sie angreifen. Wer sich duckt und anschleicht, wird nicht bemerkt.'], N);
  if (id === 'mira') return say(['Mira: Der Wald ist ruhig. Aber der Splitter unter dem Waldherz … er fehlt mir.', 'Mira: Scheue Kreaturen mögen Beeren. Jede hat ihre Lieblingssorte – probier es aus.'], N);
  if (id === 'rhea') return say(['Rhea: Ahoi! Liv hat mir mal erzählt, dass in jeder Arenastadt ein alter Liedstein steht.', 'Rhea: Acht Strophen. Sie war überzeugt, dass sie zusammen etwas zeigen – nicht erzählen.'], N);
}

// ---------------------------------------------------------------- Gespräche
// Rückgabe false = nicht zuständig (Game übernimmt Standardfälle)
export async function talkStory(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  switch (n.id) {
    case 'oma':
      if (!f.prolog) return say(['Pip ist schon zum Strand gelaufen. Lauf ihm nach – im Süden des Dorfes!', 'Und vergiss nicht: START öffnet das Menü, dort ist auch der PAGER.'], N);
      if (f.prolog && !f.omaEgg) { f.omaEgg = true; await say(['Ein Kompass … mit dem Wappen der Morgenstern?', '…', 'Den hat Liv getragen. Jeden Tag. Ich würde ihn unter tausend erkennen.', 'Wenn er hier angespült wurde … dann hat das Meer ihn uns zurückgegeben. Oder geschickt.'], N); }
      await say('Du siehst müde aus. Leg dich kurz hin, ich mache Tee.', N); s.team.forEach(healMon); sfx('heal'); return say('Dein Team ist wieder fit. Pass auf dich auf, Schatz!', N);
    case 'pip_dorf':
      return say([['Pip: Hihi. Das Meer redet manchmal mit mir. Heute hat es gesagt: „Endlich.“'], ['Pip: Ich hab keine Eltern. Ich bin einfach eines Morgens am Strand aufgewacht. So wie dein Kompass!'], ['Pip: Wenn du traurig bist, musst du nur aufs Wasser gucken. Es guckt zurück.']][(s.steps >> 3) % 3], N);
    case 'mb_fischer':
      if (!s.bag.angel && f.promise) { await say(['Du willst los? Dann nimm meine alte Angel. Am Wasser A drücken!', 'Wer angelt, findet Kreaturen, die nie ans Ufer kommen.'], N); return give(g, 'angel'); }
      return say(['Seit zehn Jahren fahre ich jeden Morgen raus. Und jeden Morgen schaue ich, ob am Horizont ein Segel mit einem Stern auftaucht.', 'Deine Mutter war die beste Kapitänin, die Muschelbucht je hatte.'], N);
    case 'mb_frau': return false;
    case 'jaro_mama': return say(f.promise ? ['Jaro ist schon los. Er hat nicht mal sein Frühstück aufgegessen!', 'Pass ein bisschen auf ihn auf, ja? Er ist mutiger, als gut für ihn ist.'] : ['Jaro redet seit Tagen von nichts anderem als seiner ersten Kreatur.', 'Er sagt, er wird der beste Trainer im ganzen Archipel.'], N);
    case 'jaro_home': return say(['Jaro: Hast du den Sturm heute Nacht gehört? Der Leuchtturm hat gewackelt!', 'Jaro: Prof. Kehl ist am Strand Proben sammeln. Ich geh gleich auch hin!'], N);
    case 'kehl': return kehl(g, n);
    case 'lab_helfer': return say(f.gotBalls ? ['Die Professorin hat die ganze Nacht über alten Seekarten gesessen.', 'Sie sucht seit Jahren etwas, das sie „das Tor“ nennt. Fragen Sie mich nicht, was das ist.'] : ['Psst! Die Professorin ist ganz aufgeregt seit dem Sturm.'], N);
    case 'bosse': case 'jaro_turm': return lighthouse(g, n);
    case 'strand_alt': return say(['Seit dem Sturm liegen hier Muscheln, die ich noch nie gesehen habe.', 'Manche sagen, das Meer gibt zurück, was es einmal genommen hat.'], N);
    case 'pip_strand': return prologue(g, n);
    case 'pip_route':
      f.pipRoute = true; await say(['Pip: Da bist du ja endlich!', 'Pip: Wie ich so schnell hierhergekommen bin? … Weiß nicht. Ich war einfach hier.', 'Pip: Hier, die hab ich gefunden. Für dich!'], N);
      await give(g, 'heilbeere', 3); g.ow.npcs = g.ow.npcs.filter(x => x !== n); return;
    case 'ab_matrose':
      if (!f.heardBeacon) { f.heardBeacon = true; g.save(true); return say(['Du kommst aus Muschelbucht? Dann hast du den Sturm auch gesehen.', 'Heute Nacht sind Leute in grauen Kutten in den Leuchtfeuer-Turm eingebrochen und haben die Feuerlinse gestohlen!', 'Ohne Leuchtfeuer finden die Fischer nicht zurück – und Kapitänin Rhea ist mit ihrem Boot noch draußen.', 'Die Kutten-Leute sind in die Alte Werft im Süden gelaufen. „Orden der Stillen See“ nennen die sich.'], N); }
      return say(f.beaconLit ? ['Das Leuchtfeuer brennt wieder! Alle Boote sind zurück. Danke dir!'] : ['Die Alte Werft liegt im Süden des Hafens. Pass auf dich auf!'], N);
    case 'ab_frau': return say(f.beaconLit ? ['Mein Mann ist wieder da! Das Leuchtfeuer hat ihn heimgebracht.'] : ['Mein Mann ist noch draußen auf See … Ohne Leuchtfeuer …'], N);
    case 'guide': return say(guideTips(g), N);
    case 'rhea': case 'okko': case 'mira': return g.gym(n);
    case 'nebel': return nebel(g, n);
    case 'jaro_ank': return jaroAnker(g, n);
    case 'pip_r2':
      s.flags.pipR2 = true; await say(['Pip: Psst. Hast du das Dunaro da oben gesehen? Es verteidigt sein Revier.', 'Pip: Wenn du im hohen Gras A drückst, duckst du dich. Dann hört dich keiner kommen!', 'Pip: Und scheue Kreaturen kann man mit Beeren füttern. Woher ich das weiß? Das Meer hat’s mir erzählt.'], N);
      await give(g, 'lockfutter', 2); g.ow.npcs = g.ow.npcs.filter(x => x !== n); return;
    case 'dh_sefa':
      if (!f.heardOkko) { f.heardOkko = true; g.save(true); return say(['Die Oase … sie trocknet aus. Seit gestern fließt die Quelle in der Sandgrotte nicht mehr.', 'Leute in grauen Kutten sind in die Grotte gestiegen. Sie suchen einen alten Stein mit Versen.', 'Mein Enkel Okko – unser Arenaleiter – ist ihnen hinterher. Er ist noch nicht zurück.', 'Die Grotte liegt in den Felsen im Nordosten. Bitte, hilf ihm!'], N); }
      return say(f.okkoBack ? ['Die Quelle singt wieder. Hörst du sie?', 'Wer genau hinhört, erkennt eine Melodie. Ganz alt.'] : ['Die Sandgrotte liegt in den Felsen im Nordosten. Bitte beeil dich!'], N);
    case 'dh_haendler': return say(['Der Basar hat Kugeln, die es nur hier gibt! Ankerkugeln für Revierkreaturen, Splitterkugeln für Mutige.', 'Und Lockfutter – streu es im Gras, dann kommen doppelt so viele Kreaturen.'], N);
    case 'dh_okkovater': return say(['Okko war schon als Kind schneller als jeder Sandsturm.', 'Seine Mutter … sie fuhr auf der Morgenstern mit. Als Steuerfrau. Er spricht nicht gern darüber.'], N);
    case 'jaro_dh':
      await say(['Jaro: Na endlich! Ich warte hier schon seit Stunden!', 'Jaro: Hab ein Wettrennen mit einem Fennika gemacht. Verloren. Aber nur knapp!', `Jaro: Weißt du, ${s.name} … in der Nacht vor dem Sturm habe ich geträumt, deine Mutter steht am Leuchtturm und winkt.`, 'Jaro: Blöd, oder? Egal. Ich trainiere im Glimmwald. Bis dann!'], N);
      await fade(1, 250); f.jaroDH = true; g.ow.npcs = g.ow.npcs.filter(x => x !== n); await fade(0, 250); return;
    case 'okko_grotte': return say(f.nebel2 ? ['Okko: Du hast sie vertrieben? Wahnsinn! Ich geh zurück und öffne die Arena.'] : ['Okko: Wer bist du? … Egal. Die Kutten-Leute sind ganz hinten, beim alten Liedstein.', 'Okko: Ihre Kreaturen haben meine besiegt. Pass auf – ihre Anführerin ist stark.'], N);
    case 'nebel2': return nebel2(g, n);
    case 'kehl_wald': return kehlWald(g, n);
    case 'mira_dorf':
      if (!f.heardWaldherz) { f.heardWaldherz = true; g.save(true); return say(['Mira: Du bist wach? Gut. Dann bist du nicht von hier.', 'Mira: Seit drei Nächten stößt das Waldherz Schlafsporen aus. Das ganze Dorf schläft. Meine Kreaturen auch.', 'Mira: Das Waldherz ist ein uraltes Fungorax, eine Revierkreatur. Jemand hat unter seinen Wurzeln gegraben – jetzt ist es außer sich.', 'Mira: Es lebt auf der Lichtung im Westen des Glimmwalds. Schleich dich im Gras an, sonst greift es aus der Ferne an.', 'Mira: Bitte – beruhige es.'], N); }
      return say('Mira: Die Lichtung liegt im Westen des Glimmwalds. Sei vorsichtig!', N);
    case 'gd_schlaf1': case 'gd_schlaf2': return say(f.waldherz ? ['Ahh … Was für ein langer Schlaf. Ich habe von leuchtenden Pilzen geträumt.'] : ['Zzz … Zzz …', '(Der Dorfbewohner schläft tief und fest.)'], N);
    case 'gd_oma': return say(['Im Glimmwald gibt es scheue Waldwesen. Sylphie heißen sie.', 'Sie lieben bittere Klarbeeren. Wer ihnen eine schenkt, gewinnt vielleicht eine Freundin.'], N);
    case 'jaro_gd': return jaroGlimm(g, n);
    case 'heal_gast': return say(['Im Hafen beißen die Fische am besten bei Nacht.', 'Und wenn du eine Kreatur zum ersten Mal bindest, bekommst du einen Eintrag in der Chronik. Prof. Kehl ruft an, wenn du viele hast!'], N);
    default: for (const A of ACTS) { const r = await A.talk(g, n); if (r !== false) return r; } return false;
  }
}

async function prologue(g, n) {
  const s = g.state, ow = g.ow, f = s.flags;
  await say(['Pip: Da bist du ja! Schau, da vorne – es glitzert im Sand!'], { name: 'Pip' });
  await fade(1, 300); await wait(250); await fade(0, 300);
  sfx('shiny');
  await say(['Im nassen Sand liegt ein Kompass aus Messing. Auf dem Deckel: ein Stern über einer Welle.', 'Die Nadel zittert … und zeigt nicht nach Norden, sondern hinaus aufs offene Meer.', 'Daneben, halb im Sand vergraben: ein Ei. Es ist kalt wie Stein.']);
  s.bag.kompass = 1; s.bag.stillesei = 1; sfx('caught');
  await say([`${s.name} hebt den GEZEITENKOMPASS auf!`, `${s.name} hebt das STILLE EI auf!`]);
  await say(['Pip: …', 'Pip: Es hat auf dich gewartet.'], { name: 'Pip' });
  // Revierkreatur greift an
  sfx('encounter'); ow.emote = { n, t: 1 };
  await say(['Plötzlich klackert es hinter den Felsen. Ein riesiger Kneifling stürmt auf Pip zu!', 'Kneifling verteidigt sein Revier!']);
  const kehl = { id: 'kehl_s', name: 'Prof. Kehl', look: LOOK.kehl, x: 9, y: 1, dir: 'down', px: 144, py: 16 };
  const jaro = { id: 'jaro_s', name: 'Jaro', look: LOOK.jaro, x: 10, y: 1, dir: 'down', px: 160, py: 16 };
  ow.npcs.push(kehl, jaro); await g.cutIn(kehl);
  const free = (x, y) => y >= 1 && !ow.solid(x, y) && !ow.npcs.some(q => q !== kehl && q !== jaro && q.x === x && q.y === y) && !(ow.p.x === x && ow.p.y === y);
  const spot = [[ow.p.x, ow.p.y - 1], [ow.p.x - 1, ow.p.y], [ow.p.x + 1, ow.p.y], [ow.p.x - 1, ow.p.y - 1]].find(([x, y]) => free(x, y)) || [ow.p.x, ow.p.y - 2];
  await ow.npcWalkTo(kehl, spot[0], spot[1]); kehl.dir = ow.p.y > kehl.y ? 'down' : ow.p.x > kehl.x ? 'right' : 'left';
  await say(['Kehl: Zurück, Kinder! Ein Revier-Kneifling – die sind nach Stürmen gereizt!', `Kehl: ${s.name}! In meiner Tasche sind drei Kugeln mit jungen Kreaturen. Schnell, nimm eine!`], { name: 'Prof. Kehl' });
  const sp = await g.pickStarter();
  const r = await g.wildBattle(null, 'strand', Object.assign(createMon('kneifling', 3), { revier: true }), { noCatch: true, noBlackout: true });
  ow.busy = true; s.team.forEach(healMon);
  await say(r?.result === 'win' ? ['Der Kneifling zieht sich klackernd ins Wasser zurück.', 'Pip: Du warst toll!'] : ['Der Kneifling verliert das Interesse und verschwindet im Wasser.']);
  const opp = counterOf(s);
  await say([`Jaro: Wow! Dann nehme ich ${SPECIES[opp].name}! Professorin, darf ich?`, 'Kehl: … Na gut. Aber geht vorsichtig mit ihnen um.', `Jaro: ${s.name}, wir sind jetzt beide Trainer. Weißt du, was das heißt? KAMPF!`], { name: 'Jaro' });
  { const js = [[ow.p.x + 1, ow.p.y], [ow.p.x - 1, ow.p.y], [ow.p.x + 1, ow.p.y - 1]].find(([x, y]) => free(x, y) && !(kehl.x === x && kehl.y === y)) || [ow.p.x + 1, ow.p.y - 1]; await ow.npcWalkTo(jaro, js[0], js[1]); }
  const won = await g.trainerFight({ name: 'Rivale Jaro', look: LOOK.jaro, team: [[opp, 5]], reward: 300, lose: 'Was?! Mein erster Kampf und ich verliere?!', noBlackout: true, music: 'trainer', bg: 'strand' });
  ow.busy = true; s.team.forEach(healMon);
  await say(won ? ['Jaro: Glück gehabt. Beim nächsten Mal gewinne ich!'] : ['Jaro: Ha! Ich bin eben ein Naturtalent.'], { name: 'Jaro' });
  await say(['Kehl: Genug für heute. Kommt ins Labor, ich will mir diesen Kompass genauer ansehen.', `Kehl: Und ${s.name} … pass gut auf dieses Ei auf.`], { name: 'Prof. Kehl' });
  await fade(1, 300);
  f.prolog = true; f.starter = sp;
  ow.npcs = ow.npcs.filter(x => ![kehl, jaro, n].includes(x));
  ow.cine && (ow.cine.on = false);
  await fade(0, 300); g.save(true);
}

async function kehl(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  if (!f.prolog) return say('Die Professorin ist nicht da. Auf dem Tisch liegt ein Zettel: „Proben am Strand sammeln.“');
  if (!f.gotBalls) {
    await say(['Da bist du! Zeig mir den Kompass.', '… Ein Stern über einer Welle. Das Wappen der Morgenstern.', 'Und die Nadel zeigt nach Südosten. Immer. Egal wie ich ihn drehe.', `${s.name} … Darf ich ihn eine Weile behalten? Für meine Forschung.`], N);
    const yes = await ask('Den Kompass Prof. Kehl überlassen?');
    if (yes) await say(['Kehl: …', 'Kehl: Nein. Nein, behalte ihn. Er hat dich gewählt, nicht mich.', 'Kehl: (Sie lächelt. Aber ihre Hand zittert ein wenig.)'], N);
    else await say(['Kehl: Natürlich. Er gehört dir. Ich … verstehe das.', 'Kehl: (Für einen Moment wirkt ihr Blick sehr weit weg.)'], N);
    await say(['Kehl: Das Ei ist rätselhaft. Kein Herzschlag, keine Wärme – und doch lebt es. Ich habe so etwas noch nie gesehen.', 'Kehl: Hier, nimm diese Chronik. Sie zeichnet jede Kreatur auf, die du siehst oder bindest.', 'Kehl: Dazu 5 Fangkugeln. Schwäche wilde Kreaturen und wirf dann eine Kugel.', 'Kehl: Und das hier ist ein Muschelfon. Damit erreichst du mich – und deine Oma – jederzeit.'], N);
    f.dex = true; f.gotBalls = true; s.bag.kristall = (s.bag.kristall || 0) + 5; s.bag.telefon = 1; sfx('caught');
    await say([`${s.name} erhält die CHRONIK, 5× FANGKUGEL und das MUSCHELFON!`, 'Kehl: Wärter Bosse wollte dich übrigens sprechen. Jaro ist schon im alten Leuchtturm.']);
    g.save(true); return;
  }
  const c = Object.keys(s.dex.caught).length;
  return say([`Deine Chronik: ${Object.keys(s.dex.seen).length} gesehen, ${c} gebunden.`, c < 5 ? 'Auf dem Dünenpfad leben viele Arten. Geh auf Entdeckungsreise!' : 'Großartig! Jede Kreatur erzählt ein Stück Geschichte dieses Archipels.'], N);
}

async function lighthouse(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  if (!f.gotBalls) return say(n.id === 'bosse' ? ['Ah, Wellas Enkelkind. Der Sturm hat meinen alten Turm ganz schön durchgeschüttelt.', 'Komm wieder, wenn du deine erste Kreatur hast. Ich muss dir etwas erzählen.'] : '…', N);
  if (f.promise) return say(n.id === 'bosse' ? ['Acht Liedsteine gibt es im Archipel. Deine Mutter hat sie alle gesehen.', 'Der erste steht in Ankerbrück, auf dem Platz vor dem Hafen.'] : '…', N);
  await say(['Bosse: Da seid ihr beide. Wisst ihr noch, wie ihr hier oben gesessen habt? Ihr wart sieben.'], { name: 'Wärter Bosse' });
  await fade(0.7, 300);
  await say(['(Erinnerung) Zwei Kinder sitzen am Fenster des Leuchtturms. Draußen nur Meer.', '„Wer zuerst das Ende des Meeres sieht, wartet auf den anderen!“', '„Versprochen! Und wer nicht wartet, muss ein Jahr lang Seetang essen!“']);
  await fade(0, 300);
  await say([`Jaro: Ich hab’s nicht vergessen, ${s.name}. Ich werde der stärkste Trainer von Kalmara.`, 'Jaro: Und dann segle ich los. Bis ans Ende des Meeres. Und du?'], { name: 'Jaro' });
  const c = await choose([{ label: 'Ich finde meine Mutter.', desc: 'Liv Sund und die Morgenstern – irgendwo da draußen.' }, { label: 'Ich werde Champion.', desc: 'Stärker als alle anderen.' }, { label: 'Ich passe auf dich auf.', desc: 'Einer muss es ja tun.' }], { title: 'Was antwortest du?', cancel: false });
  f.dream = ['mutter', 'champion', 'freund'][c];
  await say([['Jaro: … Dann finden wir sie. Zusammen. Aber ich bin trotzdem schneller!'], ['Jaro: Champion? Ha! Da musst du erst an mir vorbei!'], ['Jaro: Pff! Ich brauche keinen Aufpasser! … Aber danke.']][c], { name: 'Jaro' });
  await say(['Bosse: Deine Mutter hat oft hier gestanden und eine alte Melodie gesummt. Das Lied der Gezeiten.', 'Bosse: Acht Steine im Archipel tragen je eine Strophe. Der erste steht in Ankerbrück.', 'Bosse: Liv sagte immer: „Das Lied ist kein Lied. Es ist ein Weg.“'], { name: 'Wärter Bosse' });
  await say(['Jaro: Ich geh schon mal vor nach Ankerbrück. Wer zuerst da ist!'], { name: 'Jaro' });
  await fade(1, 250); f.promise = true; g.ow.npcs = g.ow.npcs.filter(x => x.id !== 'jaro_turm'); await fade(0, 250);
  await addLog(g, 1);
  await say('Pager: Neues Ziel – Ankerbrück im Norden.'); g.save(true);
}

async function nebel(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  if (!f.tr_orden1 || !f.tr_orden2) return say('Schwester Nebel: Meine Novizen kümmern sich um dich.', N);
  await g.cutIn(n);
  await say(['Schwester Nebel: Ein Kind. Natürlich schicken sie ein Kind.', 'Schwester Nebel: Weißt du, wie viele Menschen das Meer jedes Jahr verschluckt? Väter. Mütter. Kapitäninnen.', 'Schwester Nebel: Die Äbtissin wird die Gezeiten anhalten. Dann ist das Meer still – und niemand verschwindet mehr.', 'Schwester Nebel: … Was trägst du da? Dieser Kompass … WOHER HAST DU DEN?!'], N);
  const won = await g.trainerFight({ name: 'Schwester Nebel', look: n.look, team: [['sibilith', 10], ['echolot', 10], ['flackerl', 12]], reward: 900, lose: 'Unmöglich … die Stille verliert gegen ein Kind?', music: 'boss' });
  if (!won) return say('Schwester Nebel: Geh nach Hause, Kind. Das Meer ist kein Spielplatz.', N);
  await say(['Schwester Nebel: Behalte deine Linse. Ein Leuchtfeuer mehr oder weniger ändert nichts.', 'Schwester Nebel: Aber der Kompass … Die Äbtissin wird von dir erfahren. Und dann kommt sie ihn holen.'], N);
  await fade(1, 300); f.nebel1 = true; f.werftFrei = true; g.ow.npcs = g.ow.npcs.filter(x => x !== n); await fade(0, 300);
  await give(g, 'feuerlinse');
  await say('Zwischen den Kisten des Ordens liegt ein zerknittertes Papier …');
  await addLog(g, 3);
  await say('Pager: Bring die Feuerlinse in den Leuchtfeuer-Turm am Hafen!'); g.save(true);
}

async function nebel2(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  if (!f.tr_orden3 || !f.tr_orden4) return say('Schwester Nebel: Meine Novizen sind noch nicht fertig mit dir.', N);
  await g.cutIn(n);
  await say(['Schwester Nebel: Du schon wieder. Mit dem Kompass.', 'Schwester Nebel: Weißt du, was hier steht? „Zähl die Sterne, sieben weit.“ Deine Mutter hat das auch gelesen.', 'Schwester Nebel: Wir haben ihre Seiten. Nicht alle – aber genug, um zu wissen, dass sie das Tor gefunden hat.', 'Schwester Nebel: Und dass sie dort geblieben ist. Willst du wissen, warum? Dann besiege mich!'], N);
  const won = await g.trainerFight({ name: 'Schwester Nebel', look: n.look, team: [['sandvipa', 16], ['echolot', 16], ['flackerl', 17], ['quarzel', 18]], reward: 1600, lose: 'Wieder … Wie kann das sein?', music: 'boss', bg: 'hoehle' });
  if (!won) return say('Schwester Nebel: Komm wieder, wenn du erwachsen bist.', N);
  await say(['Schwester Nebel: … Die Äbtissin sagt, deine Mutter hat sich entschieden. Für das Meer. Gegen dich.', 'Schwester Nebel: Ich habe ihr nie geglaubt. Bis heute nicht. Aber ich habe meine Befehle.', 'Schwester Nebel: Hier. Diese Seite ist mir aus dem Mantel gefallen. Behalte sie.'], N);
  await fade(1, 300); f.nebel2 = true; f.okkoBack = true; g.ow.npcs = g.ow.npcs.filter(x => x !== n && x.id !== 'okko_grotte'); await fade(0, 300);
  await addLog(g, 4);
  sfx('heal'); await say(['Irgendwo tief in der Grotte gluckert es. Die Quelle fließt wieder!', 'Okko ist zurück nach Dünenhain gelaufen. Die Arena ist offen!', '(Der Liedstein hinten in der Grotte ist jetzt frei.)']); g.save(true);
}

async function kehlWald(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  await say([`Kehl: ${s.name}! Was für ein Zufall. Ich sammle hier Sporenproben.`, 'Kehl: Sag mal … zeigt der Kompass hier im Wald immer noch nach Südosten?', 'Kehl: Hm. Faszinierend. Ich kannte jemanden, der hatte auch so einen. Lange her.', 'Kehl: Ach, und falls du zum Waldherz willst: Es mag keine Eindringlinge. Duck dich im hohen Gras – mit A.', 'Kehl: Hier, das Schutzamulett hat mir oft geholfen. Nimm es.'], N);
  if (!s.bag.schutzamulett) await give(g, 'schutzamulett'); else await give(g, 'lockfutter', 2);
  await say('Kehl: Wir sehen uns. Viel früher, als du denkst.', N);
  await fade(1, 250); f.kehlWald = true; g.ow.npcs = g.ow.npcs.filter(x => x !== n); await fade(0, 250); g.save(true);
}

async function jaroGlimm(g, n) {
  const s = g.state, f = s.flags;
  await say(['Jaro: Drei Orden. Du hast drei, ich habe zwei. Noch!', 'Jaro: Weißt du, wer mir im Wald begegnet ist? Eine Frau in einer weißen Kutte. Ganz ruhig. Unheimlich ruhig.', `Jaro: Sie hat gefragt, ob ich ${s.name} kenne. Und ob du gut auf deinen Kompass aufpasst.`, 'Jaro: Ich hab ihr gesagt, sie soll sich verziehen. Und jetzt: Zeig mir, ob du stärker geworden bist!'], { name: 'Jaro' });
  const opp = counterOf(s), evo = SPECIES[opp].evo?.to || opp;
  const won = await g.trainerFight({ name: 'Rivale Jaro', look: LOOK.jaro, team: [['boebrisel', 24], ['kieselkopp', 24], ['nachtwolp', 25], [evo, 28]], reward: 2600, lose: 'Argh! Wieder nicht! Aber knapp, oder?', bg: 'wald' });
  await say([won ? 'Jaro: Okay, okay. Du bist gut. Aber ich hol auf!' : 'Jaro: Ha! Diesmal ich!', 'Jaro: Für Funkenhafen brauchen wir ein Schiff. Mein Onkel in Ankerbrück baut gerade eins …', 'Jaro: Ich sag dir Bescheid, wenn es fertig ist. Versprochen ist versprochen!'], { name: 'Jaro' });
  await fade(1, 250); f.jaro3 = true; g.ow.npcs = g.ow.npcs.filter(x => x !== n); await fade(0, 250);
  g.save(true);
}

// Revierkreatur mit Story (Waldherz)
export async function revierStory(g, n, r) {
  const s = g.state, f = s.flags;
  if (n.revier.id !== 'waldherz') return;
  if (r?.result === 'win' || r?.result === 'caught') {
    f.waldherz = true; sfx('heal');
    await say(['Das riesige Fungorax sinkt zu Boden. Seine Sporen werden golden – dann verlöschen sie.', 'Ruhig atmet das Waldherz unter den Bäumen. Zwischen seinen Wurzeln liegt ein aufgewühltes Loch … und darin ein Blatt Papier.']);
    await addLog(g, 5);
    await say(['Von Norden her hört man Stimmen. Glimmdorf erwacht!', 'Mira ist zurück in ihrer Arena.']); g.save(true);
  }
}

async function jaroAnker(g, n) {
  const s = g.state, f = s.flags;
  await say(['Jaro: Da bist du! Du hast den Ankerorden?! Ich war zuerst in der Stadt – aber die Arena war zu!', 'Jaro: Egal. Zeig mir, wie stark du geworden bist!'], { name: 'Jaro' });
  const opp = counterOf(s), evo = SPECIES[opp].evo?.to || opp;
  const won = await g.trainerFight({ name: 'Rivale Jaro', look: LOOK.jaro, team: [['brisel', 12], ['kieselkopp', 12], [evo, 16]], reward: 1200, lose: 'Schon wieder?! Ich trainiere doppelt so hart!' });
  await say([won ? 'Jaro: … Okay. Du bist gut. Richtig gut.' : 'Jaro: Ha! Sieg für mich!', 'Jaro: Hör mal. Die Kutten-Leute fragen in jeder Stadt nach einem Kompass mit Stern und Welle.', 'Jaro: Das ist deiner, oder? Pass auf dich auf. Ich will nicht, dass mein Rivale verschwindet.', 'Jaro: Die Brücke nach Dünenhain wird gerade repariert. Wer zuerst drüben ist!'], { name: 'Jaro' });
  await fade(1, 250); f.jaro2 = true; g.ow.npcs = g.ow.npcs.filter(x => x !== n); await fade(0, 250);
  // Prof. Kehl ruft an: EP-Teiler
  sfx('dex'); await say(['Dein Muschelfon klingelt …', `Kehl: ${s.name}! Ich habe von deinem Sieg gehört. Ich habe etwas für dich!`, 'Kehl: Ein paar Sonderbonbons für schwere Kämpfe.', 'Kehl: … Und sag mal, zeigt der Kompass noch immer nach Südosten?']);
  await give(g, 'sonderbonbon', 5);
  await say(['Pager: Die Brücke im Norden von Ankerbrück ist repariert – weiter nach Dünenhain!']);
  g.save(true);
}

// ---------------------------------------------------------------- Nach Trainerkämpfen
export async function afterTrainer(g) {
  const s = g.state, ow = g.ow;
  if (ow.id === 'ankerbrueck' && s.flags.orden_wache) {
    const w = ow.npcs.find(n => n.id === 'orden_wache');
    if (w) { await say('Der Novize stolpert zur Seite. Der Weg in die Werft ist frei!'); ow.npcs = ow.npcs.filter(n => n !== w); }
  }
  for (const A of ACTS) await A.afterTrainer?.(g);
}

export async function afterGym(g, id) { const f = g.state.flags; if (id === 'rhea') f.badge1Jaro = true; if (id === 'mira') f.badge3Jaro = true; for (const A of ACTS) await A.afterGym?.(g, id); }

// ---------------------------------------------------------------- Ereignisse beim Betreten
export async function mapEvent(g, id) {
  const s = g.state, ow = g.ow, f = s.flags;
  for (const A of ACTS) await A.mapEvent?.(g, id);
  if (id === 'ankerbrueck' && !f.reachedAnker) {
    f.reachedAnker = true; ow.busy = true; await wait(450);
    await say(['Ankerbrück! Der größte Hafen im Süden von Kalmara.', 'Aber irgendetwas ist seltsam. Der Leuchtfeuer-Turm am Hafen ist dunkel, und die Leute schauen besorgt aufs Meer.']);
    ow.busy = false; g.save(true);
  }
  if (id === 'duenenhain' && !f.reachedDH) { f.reachedDH = true; ow.busy = true; await wait(450); await say(['Dünenhain – die Oasenstadt zwischen den Dünen.', 'Doch die Oase ist nur noch eine Pfütze. Die Leute schauen besorgt auf den ausgetrockneten Brunnen.']); ow.busy = false; g.save(true); }
  if (id === 'glimmdorf' && !f.reachedGD) { f.reachedGD = true; ow.busy = true; await wait(450); await say(['Glimmdorf. Zwischen den Baumhäusern leuchten Pilze in Türkis und Gold.', 'Aber es ist seltsam still. Auf den Wegen liegen Dorfbewohner – und schlafen.']); ow.busy = false; g.save(true); }
  if (id === 'strand' && !f.prolog && f.pagerGiven) {
    const pip = ow.npcs.find(n => n.id === 'pip_strand'); if (!pip) return;
    ow.busy = true; await wait(500); ow.emote = { n: pip, t: 1 }; sfx('encounter');
    await g.cutIn(pip);
    await say(['Pip: Hier unten! Komm schnell, am Wasser glitzert was!', '(Lauf zu Pip und sprich ihn mit A an.)'], { name: 'Pip' });
    ow.busy = false;
  }
}

// ---------------------------------------------------------------- Sperren
const block = (g, lines) => { g.ow.busy = true; (async () => { await say(lines); g.ow.busy = false; })(); return true; };
export function edgeBlock(g, map, to) {
  const f = g.state.flags;
  if (map === 'muschelbucht' && to === 'duenenpfad') {
    if (!f.prolog) return block(g, ['Pip ruft vom Strand her: „Hierher! Komm schnell, hier glitzert was!“', '(Der Strand liegt im Süden des Dorfes.)']);
    if (!f.gotBalls) return block(g, ['Prof. Kehl wartet im Labor auf dich – das Haus mit dem Schild LABOR.']);
    if (!f.promise) return block(g, ['Wärter Bosse und Jaro warten im alten Leuchtturm im Nordosten des Dorfes.']);
  }
  if (map === 'ankerbrueck' && to === 'kuestenweg' && !f.jaro2) return block(g, ['Bauarbeiter: Halt! Die Brücke ist noch nicht ganz fertig.', 'Bauarbeiter: Komm wieder, wenn du dir den Ankerorden geholt hast – dann sind wir durch.']);
  if (map === 'duenenhain' && to === 'glimmpfad' && !g.state.badges[1]) return block(g, ['Ein Karawanenwächter: Der Glimmpfad ist bei Sandsturm gefährlich.', 'Erst wenn Okko dir seinen Orden gibt, lasse ich dich durch.']);
  return false;
}
export function moveBlock(g, map, x, y) { for (const A of ACTS) if (A.moveBlock?.(g, map, x, y)) return true; return false; }
export async function afterBattleHook(g, r) { for (const A of ACTS) await A.afterBattle?.(g, r); }

// ---------------------------------------------------------------- Liedsteine und Altar
export async function songStone(g, id) {
  const s = g.state, S = SONG[id]; if (!S) return say('Ein alter Stein mit verwitterten Zeichen.');
  await say(['Ein alter Liedstein. Unter Moos und Salz sind Zeilen eingemeißelt:', ...S.slice(1)]);
  if (!s.flags[id]) { s.flags[id] = true; sfx('dex'); const c = Object.keys(s.flags).filter(k => /^song\d$/.test(k)).length; await say(`${S[0]} ist jetzt im Pager unter LIED gespeichert. (${c}/8)`); g.save(true); }
}
export async function altarStory(g) {
  const s = g.state, f = s.flags;
  if (g.ow.id !== 'feuerturm') return say('Ein steinerner Sockel.');
  if (f.beaconLit) return say('Die Feuerlinse strahlt hell über das Meer. Weit draußen antworten Schiffshörner.');
  if (!s.bag.feuerlinse) return say(['Ein leerer Sockel. Hier gehört die große Feuerlinse hin.', 'Ohne sie bleibt das Leuchtfeuer dunkel.']);
  await say('Du setzt die Feuerlinse vorsichtig in den Sockel …');
  delete s.bag.feuerlinse; await fade(0.9, 200); sfx('shiny'); await fade(0, 500);
  f.beaconLit = true;
  await say(['Ein gleißendes Licht schießt durch die Fenster hinaus aufs Meer!', 'Aus der Ferne antwortet ein Schiffshorn. Dann noch eins. Und noch eins.', 'Die Boote von Ankerbrück finden heim – und mit ihnen Kapitänin Rhea.', 'Die Arena von Ankerbrück ist jetzt geöffnet!']);
  g.save(true);
}

// ---------------------------------------------------------------- Erster Bund
export async function onCaught(g, m) {
  const s = g.state;
  if (s.flags.firstBond) return;
  s.flags.firstBond = true; m.bond = 'erster';
  await say([`${monName(m)} schaut dich lange an. Ein seltsames Gefühl – als würdet ihr euch schon ewig kennen.`, `${monName(m)} trägt jetzt das Zeichen ERSTER BUND. Vergiss es nicht.`]);
}

// ---------------------------------------------------------------- Neues Spiel: Prolog-Erzählung und erster Morgen
export const PROLOG = ['Vor zehn Jahren lief ein Schiff aus dem Hafen von Muschelbucht aus: die MORGENSTERN.', 'Am Steuer stand Kapitänin Liv Sund. Ihr Ziel war ein Ort, den keine Karte kennt – das Ende des Meeres.', 'Sie kehrte nie zurück.', 'Zurück blieben ihre Mutter Wella … und ein Kind, das jeden Abend aufs Meer hinausschaute.', 'Letzte Nacht tobte über dem Kalmara-Archipel der größte Sturm seit zehn Jahren.', 'Und am Morgen danach …'];
export async function firstMorning(g) {
  const s = g.state, N = { name: 'Oma Wella' };
  await say([`Guten Morgen, ${s.name}! Hast du bei dem Sturm überhaupt geschlafen?`, 'Pip war schon in aller Frühe hier. Er sagt, am Strand liegt etwas Glänzendes.', 'Ach, und bevor ich es vergesse – alles Gute zum Geburtstag, Schatz.', 'Das hier hat deiner Mutter gehört. Ihr alter Pager. Ich habe ihn reparieren lassen.'], N);
  s.bag.pager = 1; s.flags.pagerGiven = true; sfx('caught');
  await say([`${s.name} erhält den PAGER!`, 'Der Pager zeigt dir immer, was als Nächstes zu tun ist. Drück START und wähle PAGER.', 'Oben rechts siehst du außerdem eine Minikarte.']);
  await say('Der Strand liegt im Süden des Dorfes. Lauf schon – Pip wartet!', N);
}

const g_lastMap = s => s.map || 'muschelbucht';
export async function afterChampion(g, first) { for (const A of ACTS) if (A.afterChampion) return A.afterChampion(g, first); }
// Akte einhängen: Arenen, Aufträge, Logbuch und Lied zusammenführen
for (const A of ACTS) { A.init?.({ give, addLog }); Object.assign(GYMS, A.GYMS); Object.assign(QUESTS, A.QUESTS); Object.assign(LOGS, A.LOGS); Object.assign(SONG, A.SONG); }
