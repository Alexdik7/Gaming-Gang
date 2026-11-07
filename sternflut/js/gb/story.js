// STERNFLUT – Story von Welt 1 (Kalmara). Alles, was hier passiert, zahlt sich später aus (siehe docs/KONZEPT.md).
// Die Klasse Game ruft: talkStory, afterTrainer, mapEvent, edgeBlock, moveBlock, songStone, altarStory, onCaught.
import { say, ask, choose } from './gbui.js';
import { fade, wait } from './engine.js';
import { sfx, cry, setMusic } from '../core/audio.js';
import { SPECIES } from '../data/creatures.js';
import { createMon, healMon, monName } from '../data/mon.js';
import { LOOK, ITEMS } from './maps.js';

const give = async (g, k, n = 1) => { const s = g.state; s.bag[k] = (s.bag[k] || 0) + n; sfx('caught'); await say(`${s.name} erhält ${n > 1 ? n + '× ' : ''}${ITEMS[k].name.toUpperCase()}!`); };
const COUNTER = { zundrak: 'tidolin', tidolin: 'moospip', moospip: 'zundrak' };
export const counterOf = s => COUNTER[s.flags.starter] || 'tidolin';

// ---------------------------------------------------------------- Arenen, Liga, Such-Aufträge
export const GYMS = {
  rhea: {
    badge: 0, badgeName: 'ANKERORDEN', team: [['kneifling', 12], ['quallux', 12], ['perlschild', 14]], reward: 1600, bg: 'wasser',
    intro: ['Rhea: Du hast mein Leuchtfeuer wieder entzündet. Ohne dich würde ich noch immer im Nebel treiben.', 'Rhea: Aber Dankbarkeit ist eine Sache – ein Orden eine andere.', 'Rhea: Ich bin Kapitänin Rhea. Meine Kreaturen sind die Brandung von Ankerbrück. Halte stand!'],
    lose: 'Rhea: Ha! Du segelst gegen den Wind und kommst trotzdem an. Genau wie deine Mutter.',
    gift: { text: ['Rhea: Nimm auch diesen Attacken-Kristall. Gezeitenschlag – den hat mir einst Liv Sund gezeigt.'], items: { ak_gezeitenschlag: 1, sternkristall: 3 } },
    outro: ['Rhea: Deine Mutter … Liv war meine beste Freundin. Wir sind zusammen zur See gefahren, bevor sie die Morgenstern bekam.', 'Rhea: An ihrem letzten Abend sagte sie: „Der Kompass wird den Weg finden, wenn ich es nicht kann.“', 'Rhea: Ich habe nie verstanden, was sie meinte. Bis heute.'],
    after: ['Rhea: Der Ankerorden steht dir! Wenn du Fragen über Liv hast – ruf mich an.'],
  },
};
export const LIGA = {};
export const QUESTS = {
  mb_frau: { want: 'lumoth', title: 'Licht für Ines', ask: ['Nachts sehe ich auf dem Dünenpfad manchmal kleine Lichter tanzen. Lumoths sollen das sein.', 'Würdest du mir eins zeigen? Mein Sohn hat früher immer davon erzählt …'], thanks: ['Oh … {mon}! Es leuchtet genau so, wie er es beschrieben hat.', 'Danke. Nimm das hier – damit finden dich Kreaturen leichter.'], reward: { lockfutter: 3 }, after: 'Mein Sohn ist Matrose auf einem großen Schiff. Vielleicht siehst du ihn eines Tages.' },
  ab_kid: { want: 'zappgecko', title: 'Der knisternde Gecko', ask: ['Kennst du Zappgeckos? Die kleben an Masten und knistern!', 'Die gibt es auf dem Dünenpfad. Bringst du mir einen zum Anschauen?'], thanks: ['WOW, {mon} knistert ja wirklich!', 'Hier, das hab ich am Hafen gefunden.'], reward: { ak_funkenkette: 1 }, after: 'Wenn ich groß bin, werde ich Ingenieur in Funkenhafen!' },
  ab_alte: { want: 'perlschild', title: 'Perlen der Seefrau', ask: ['Früher hat mir ein Perlschild jeden Morgen eine Perle an den Steg gebracht.', 'Man angelt sie im Hafenbecken. Zeigst du mir eines? Ich gebe dir dafür etwas, das ich lange aufbewahrt habe.'], thanks: ['Ach, {mon} … Die Perlen auf seinem Panzer glänzen wie früher.', 'Hier. Diese Seite hat vor Jahren ein Fischer aus dem Netz gezogen. Ich glaube, sie gehört dir.'], reward: { echomuschel: 2 }, log: 2, after: 'Liv hat in diesem Haus oft Tee getrunken. Sie lachte so laut, dass die Möwen erschraken.' },
};

// ---------------------------------------------------------------- Logbuch der Morgenstern (40 Seiten über drei Welten)
export const LOGS = {
  1: ['Tag 1. Die Morgenstern läuft aus. {name} hat geweint, als ich ging.', 'Ich habe Mama Wella versprochen, in einem Jahr zurück zu sein. Der Kompass zeigt hinaus – weiter, als jede Karte reicht.'],
  2: ['Tag 19. Wir haben einen Stein mit einer Strophe gefunden. Das Lied der Gezeiten!', 'Acht Steine im Archipel. Ich glaube, zusammen ergeben sie keinen Text – sondern eine Karte.'],
  3: ['Tag 33. In Ankerbrück fragte mich eine Frau in grauer Kutte nach dem Kompass. Sie nannte sich „die Stille“.', 'Ich habe ihr nichts gesagt. Aber sie wusste von dem Tor. Woher?'],
};
export const SONG = {
  song1: ['Strophe I – Ankerbrück', '„Wo die Flut den Mond verschluckt, / liegt ein Kompass, der nicht ruht.', 'Folg der Nadel, nicht dem Nord – / Heimat ist ein ferner Ort.“'],
};
export async function addLog(g, n) {
  const s = g.state; if (s.flags['log' + n]) return;
  s.flags['log' + n] = true; s.bag.logbuch = 1; sfx('dex');
  const c = Object.keys(s.flags).filter(k => /^log\d+$/.test(k)).length;
  await say([`${s.name} findet eine LOGBUCHSEITE der Morgenstern! (${c}/40)`, ...LOGS[n].map(t => t.replace('{name}', s.name))]);
}

// ---------------------------------------------------------------- Pager: aktuelles Ziel
export function mainGoal(s) {
  const f = s.flags;
  if (!f.prolog) return { t: 'Der Morgen nach dem Sturm', d: 'Pip wartet am Strand südlich von Muschelbucht. Etwas Glänzendes wurde angespült!', map: 'strand' };
  if (!f.gotBalls) return { t: 'Der Kompass', d: 'Prof. Kehl will den Kompass in ihrem Labor in Muschelbucht untersuchen.', map: 'muschelbucht' };
  if (!f.promise) return { t: 'Das Versprechen', d: 'Jaro wartet oben im alten Leuchtturm am Ostrand von Muschelbucht.', map: 'muschelbucht' };
  if (!f.reachedAnker) return { t: 'Auf nach Ankerbrück', d: 'Folge dem Dünenpfad nach Norden bis zur Hafenstadt Ankerbrück.', map: 'ankerbrueck' };
  if (!f.heardBeacon) return { t: 'Ein dunkler Hafen', d: 'Irgendetwas stimmt in Ankerbrück nicht. Sprich mit dem Matrosen am Steg im Osten.', map: 'ankerbrueck' };
  if (!f.werftFrei) return { t: 'Die gestohlene Linse', d: 'Der Orden der Stillen See hat die Feuerlinse in die Alte Werft im Süden des Hafens gebracht. Hol sie zurück!', map: 'ankerbrueck' };
  if (!f.beaconLit) return { t: 'Licht für die Schiffe', d: 'Bring die Feuerlinse in den Leuchtfeuer-Turm am Hafen und entzünde das Licht.', map: 'ankerbrueck' };
  if (!s.badges[0]) return { t: 'Arena Ankerbrück', d: 'Kapitänin Rhea ist zurück. Fordere sie in ihrer Arena heraus! Pflanzen- und Elektro-Attacken helfen gegen Wasser.', map: 'ankerbrueck' };
  if (!f.jaro2) return { t: 'Jaro am Hafen', d: 'Jaro wartet auf dem Marktplatz von Ankerbrück auf dich.', map: 'ankerbrueck' };
  return { t: 'Fortsetzung folgt', d: 'Die Brücke nach Dünenhain wird repariert. Dort warten Arena 2 und neue Kreaturen. (Kommt in Phase 2!) Bis dahin: Kreaturen sammeln, Aufgaben erfüllen, Lied und Logbuch suchen.', map: 'ankerbrueck' };
}
export function sideTasks(s) {
  return Object.entries(QUESTS).filter(([id]) => s.flags['qa_' + id] || s.flags['quest_' + id]).map(([id, q]) => ({ t: q.title, d: s.flags['quest_' + id] ? 'Erledigt!' : `Zeige ${SPECIES[q.want].name}.`, done: !!s.flags['quest_' + id] }));
}

// ---------------------------------------------------------------- Telefon
export function contacts(s) {
  const f = s.flags, c = [];
  if (s.bag.telefon) c.push({ id: 'oma', name: 'Oma Wella' });
  if (s.bag.telefon) c.push({ id: 'kehl', name: 'Prof. Kehl' });
  if (f.promise) c.push({ id: 'jaro', name: 'Jaro' });
  if (s.badges[0]) c.push({ id: 'rhea', name: 'Kapitänin Rhea' });
  return c;
}
const OMA = ['Deine Mutter hat als Kind jeden Morgen am Strand nach Flaschenpost gesucht. Gefunden hat sie nie eine – aber sie hat nie aufgehört.', 'Liv konnte keine Suppe kochen. Gar keine. Aber sie konnte einen Sturm riechen, Stunden bevor er kam.', 'Weißt du, warum das Schiff Morgenstern hieß? Weil du an einem Morgen geboren wurdest, als der letzte Stern noch am Himmel stand.', 'Der Wärter Bosse und deine Mutter haben oft im Leuchtturm gesessen und über Karten gebrütet. Frag ihn doch mal.'];
export async function call(g, id) {
  const s = g.state, N = { name: contacts(s).find(c => c.id === id)?.name };
  sfx('click'); await say('Tuut … tuut …'); await wait(300);
  if (id === 'oma') { s.flags.omaCall = ((s.flags.omaCall || 0) + 1) % OMA.length; return say([`Hallo, ${s.name}! Schön, dass du anrufst.`, OMA[s.flags.omaCall]], N); }
  if (id === 'kehl') {
    const n = Object.keys(s.dex.caught).length;
    return say([`Kehl: ${s.name}! Wie geht es dem Kompass? … Ich meine – wie geht es dir?`, `Kehl: Deine Chronik zählt ${n} gebundene Kreaturen. ${n < 10 ? 'Da geht noch mehr!' : 'Beeindruckend!'}`, `Kehl: Mein Tipp: ${mainGoal(s).d}`], N);
  }
  if (id === 'jaro') return say(s.badges[0] ? ['Jaro: Du hast den Ankerorden? Pff. Ich hol ihn mir morgen.', 'Jaro: Und dann hol ich dich ein. Versprochen ist versprochen!'] : ['Jaro: Was gibt’s? Ich trainiere gerade!', 'Jaro: Wir sehen uns in Ankerbrück. Und dann zeig ich dir, wer zuerst das Ende des Meeres sieht!'], N);
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
    case 'guide': return say(['Hey, zukünftiger Champion! Kapitänin Rhea wartet ganz oben.', 'Ihre Kreaturen sind Wasser-Typen. Pflanzen- und Elektro-Attacken treffen sie hart!'], N);
    case 'rhea': return g.gym(n);
    case 'nebel': return nebel(g, n);
    case 'jaro_ank': return jaroAnker(g, n);
    case 'heal_gast': return say(['Im Hafen beißen die Fische am besten bei Nacht.', 'Und wenn du eine Kreatur zum ersten Mal bindest, bekommst du einen Eintrag in der Chronik. Prof. Kehl ruft an, wenn du viele hast!'], N);
    default: return false;
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

async function jaroAnker(g, n) {
  const s = g.state, f = s.flags;
  await say(['Jaro: Da bist du! Du hast den Ankerorden?! Ich war zuerst in der Stadt – aber die Arena war zu!', 'Jaro: Egal. Zeig mir, wie stark du geworden bist!'], { name: 'Jaro' });
  const opp = counterOf(s), evo = SPECIES[opp].evo?.to || opp;
  const won = await g.trainerFight({ name: 'Rivale Jaro', look: LOOK.jaro, team: [['brisel', 12], ['kieselkopp', 12], [evo, 16]], reward: 1200, lose: 'Schon wieder?! Ich trainiere doppelt so hart!' });
  await say([won ? 'Jaro: … Okay. Du bist gut. Richtig gut.' : 'Jaro: Ha! Sieg für mich!', 'Jaro: Hör mal. Die Kutten-Leute fragen in jeder Stadt nach einem Kompass mit Stern und Welle.', 'Jaro: Das ist deiner, oder? Pass auf dich auf. Ich will nicht, dass mein Rivale verschwindet.', 'Jaro: Die Brücke nach Dünenhain wird gerade repariert. Wer zuerst drüben ist!'], { name: 'Jaro' });
  await fade(1, 250); f.jaro2 = true; g.ow.npcs = g.ow.npcs.filter(x => x !== n); await fade(0, 250);
  // Prof. Kehl ruft an: EP-Teiler
  sfx('dex'); await say(['Dein Muschelfon klingelt …', `Kehl: ${s.name}! Ich habe von deinem Sieg gehört. Ich habe etwas für dich – den EP-Teiler.`, 'Kehl: Damit bekommt dein ganzes Team Erfahrung. Und hier ein paar Sonderbonbons für schwere Kämpfe.', 'Kehl: … Und sag mal, zeigt der Kompass noch immer nach Südosten?']);
  s.bag.epteiler = 1; await give(g, 'sonderbonbon', 5);
  await say(['Den EP-Teiler schaltest du im Beutel unter BASIS-ITEMS an und aus.', 'Pager: Fortsetzung folgt – die Brücke nach Dünenhain kommt in Phase 2!']);
  g.save(true);
}

// ---------------------------------------------------------------- Nach Trainerkämpfen
export async function afterTrainer(g) {
  const s = g.state, ow = g.ow;
  if (ow.id === 'ankerbrueck' && s.flags.orden_wache) {
    const w = ow.npcs.find(n => n.id === 'orden_wache');
    if (w) { await say('Der Novize stolpert zur Seite. Der Weg in die Werft ist frei!'); ow.npcs = ow.npcs.filter(n => n !== w); }
  }
}

export async function afterGym(g, id) { if (id === 'rhea') g.state.flags.badge1Jaro = true; }

// ---------------------------------------------------------------- Ereignisse beim Betreten
export async function mapEvent(g, id) {
  const s = g.state, ow = g.ow, f = s.flags;
  if (id === 'ankerbrueck' && !f.reachedAnker) {
    f.reachedAnker = true; ow.busy = true; await wait(450);
    await say(['Ankerbrück! Der größte Hafen im Süden von Kalmara.', 'Aber irgendetwas ist seltsam. Der Leuchtfeuer-Turm am Hafen ist dunkel, und die Leute schauen besorgt aufs Meer.']);
    ow.busy = false; g.save(true);
  }
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
  return false;
}
export function moveBlock() { return false; }

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
