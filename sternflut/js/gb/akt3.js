// Akt 3: Die Seeschwalbe – Funkenhafen (Arena 4), Ostweide (Sattel), Nebelklippe und das Wrack der Abendstern (Arena 5)
import { say, ask } from './gbui.js';
import { fade, wait, G } from './engine.js';
import { sfx, cry, setMusic } from '../core/audio.js';
import { SPECIES } from '../data/creatures.js';
import { LOOK, ITEMS } from './maps.js';
import { sailMenu, travelScene } from './travel.js';

let H; // Helfer aus story.js (give, addLog), werden beim Import gesetzt
export function init(h) { H = h; }

export const GYMS = {
  volta: {
    badge: 3, badgeName: 'FUNKENORDEN', team: [['blitzhase', 30], ['zahnradling', 31], ['medusprak', 31], ['voltrex', 34]], reward: 3400, bg: 'arena',
    intro: ['Volta: Du hast meine Stadt wieder zum Leuchten gebracht. Danke.', 'Volta: Ich bin Volta, Ingenieur und Arenaleiter. Ich rechne alles durch – auch dich.', 'Volta: Laut meinen Berechnungen gewinne ich zu 73 Prozent. Beweis mir das Gegenteil!'],
    lose: 'Volta: 27 Prozent … Ich muss meine Formeln überarbeiten. Beeindruckend.',
    gift: { text: ['Volta: Nimm auch diese Top-Tränke. Selbst gebraut – na ja, gekauft.'], items: { toptrank: 2, ak_funkenkette: 1 } },
    outro: ['Volta: Der Tor-Kristall, den Bruder Funke laden wollte … Ich habe so eine Energiesignatur schon einmal gemessen.', 'Volta: Vor zehn Jahren. In der Nacht, als die Morgenstern auslief. Ein Lichtblitz am Horizont, Richtung Südost.', 'Volta: Ach, und: Rancherin Hedda auf der Ostweide sucht jemanden, dem sie ihren alten Sattel anvertrauen kann.'],
    after: ['Volta: Der Funkenorden steht dir. Sprich mit Kapitän Harm – die Nordinsel ruft.'],
  },
  ysolde: {
    badge: 4, badgeName: 'NEBELORDEN', team: [['nebelquall', 34], ['totenrabe', 35], ['laternix', 35], ['ankerfuerst', 38]], reward: 4000, bg: 'ruine',
    intro: ['Ysolde: Ich habe dich kommen sehen. In einem Traum, vor vielen Jahren.', 'Ysolde: Du hast den Toten Ruhe geschenkt. Jetzt will ich sehen, ob du auch den Lebenden standhältst.'],
    lose: 'Ysolde: Der Nebel lichtet sich … und dahinter steht ein Kind, das nicht aufgibt.',
    gift: { text: ['Ysolde: Nimm diese Schattenkapseln. Im Dunkeln sind sie unschlagbar.'], items: { nachtkristall: 5, topbeleber: 1 } },
    outro: ['Ysolde: Gib mir deine Hand. Ich will dir etwas zeigen.'],
    after: ['Ysolde: Der Nebelorden steht dir. Was ich gesehen habe, bleibt bei dir.'],
  },
};
export const QUESTS = {
  fh_kind: { want: 'funkmaus', title: 'Mias Funkmaus', ask: ['Meine Funkmaus ist weggelaufen, als der Strom ausfiel!', 'Auf der Ostweide gibt es viele. Zeigst du mir eine? Dann weiß ich, dass es ihr gut geht.'], thanks: ['{mon} sieht genau so aus wie meine! Danke!', 'Hier, Papa hat Zutaten vom Markt mitgebracht.'], reward: { fisch: 2, honig: 2, muschel: 2 }, after: 'Ich glaube, meine Funkmaus wohnt jetzt im Kraftwerk. Da ist es schön warm.' },
  nk_frau: { want: 'kraehwacht', title: 'Die Kerzenwache', ask: ['Krähwachten zählen die Seelen, sagt man. Ich möchte eine fragen, ob mein Mann seine Ruhe gefunden hat.', 'Auf dem Nebelpfad gibt es welche.'], thanks: ['{mon} nickt … Ich glaube, das heißt ja.', 'Danke. Nimm diese Kerzen – äh, Kugeln. Ich verwechsle das immer.'], reward: { nachtkristall: 3, sonderbonbon: 2 }, after: 'Die Kerzen im Fenster brennen für alle, die auf See geblieben sind.' },
};
export const LOGS = {
  7: ['Tag 80. Ein Ingenieur aus Funkenhafen hat uns einen Kristall gegeben, der Licht speichert.', 'Wenn der Kompass recht hat, brauchen wir Licht. Sehr viel Licht.'],
  8: ['An mein Kind. Wenn du diesen Brief liest, hat Morrow es zurückgeschafft. Ich nicht.', 'Hinter dem Tor liegt eine Welt, größer als alle Meere. Ich muss bleiben – nicht weil ich will, sondern weil ich jemanden beschützen muss.', 'Folge der Nadel. Aber erst, wenn du stark genug bist. Ich liebe dich. – Mama'],
};
export const SONG = {
  song4: ['Strophe IV – Funkenhafen', '„Wo der Blitz die Nacht durchbricht, / sammle du das stille Licht,', 'denn das Tor im fernen Meer / öffnet nur der Sterne Heer.“'],
  song5: ['Strophe V – Nebelklippe', '„Wo die Toten Wache stehn, / wirst du deine Mutter sehn,', 'nicht im Grab und nicht im Licht – / nur im Lied, das nie zerbricht.“'],
};

export function goal(s) {
  const f = s.flags;
  if (!f.shipCall) return { t: 'Warten auf Jaro', d: 'Jaro wollte sich melden, sobald das Schiff seines Onkels fertig ist. Geh einfach weiter – er ruft gleich an.', map: 'glimmdorf' };
  if (!f.port_funkenhafen) return { t: 'Die Seeschwalbe', d: 'Jaros Onkel, Kapitän Harm, wartet am Hafensteg von Ankerbrück mit seinem Schiff.', map: 'ankerbrueck' };
  if (!f.reachedFH) return { t: 'Auf zur Ostinsel', d: 'Segle mit Kapitän Harm nach Funkenhafen.', map: 'funkenhafen' };
  if (!f.kraftwerkFrei) return { t: 'Stromausfall', d: 'Der Orden hält das Kraftwerk von Funkenhafen besetzt. Tritt auf die Schaltplatten, um die Tore zu öffnen!', map: 'funkenhafen' };
  if (!s.badges[3]) return { t: 'Arena Funkenhafen', d: 'Fordere Ingenieur Volta heraus! Erd-Attacken sind gegen Elektro unschlagbar.', map: 'funkenhafen' };
  if (!s.bag.sattel) return { t: 'Der alte Sattel', d: 'Rancherin Hedda auf der Ostweide (östlich von Funkenhafen) will dir etwas geben.', map: 'ostweide' };
  if (!f.reachedNK) return { t: 'Die Nordinsel', d: 'Segle mit Kapitän Harm nach Nebelklippe.', map: 'nebelklippe' };
  if (!f.wrackFrei) return { t: 'Das Wrack der Abendstern', d: 'Ysolde ist im Wrack am Ende des Nebelpfads. Die Toten sind unruhig – und der Orden war dort.', map: 'nebelpfad' };
  if (!s.badges[4]) return { t: 'Arena Nebelklippe', d: 'Fordere Seherin Ysolde heraus! Schatten- und Geist-Attacken treffen Geister hart.', map: 'nebelklippe' };
  if (!f.aebtissin1) return { t: 'Der Hafen im Nebel', d: 'Geh zurück zum Hafensteg von Nebelklippe.', map: 'nebelklippe' };
  return null;
}
export function contacts(s, c) {
  if (s.badges[3]) c.push({ id: 'volta', name: 'Volta' });
  if (s.badges[4]) c.push({ id: 'ysolde', name: 'Ysolde' });
}
export const CALLS = {
  volta: ['Volta: Funkenhafen leuchtet! Übrigens: Wer im Lager kocht, kämpft besser. Das ist Wissenschaft.', 'Volta: Kraftsuppe aus Glimmpilz und Waldkräutern – Angriff plus eins. Probier es!'],
  ysolde: ['Ysolde: Ich sehe Wasser, das nach oben fällt, und Sterne unter dem Meer.', 'Ysolde: Das ist kein Traum. Das ist dein Weg.'],
};

export async function talk(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  switch (n.id) {
    case 'harm': case 'harm_fh': case 'harm_nk': {
      if (n.id === 'harm' && !f.port_funkenhafen) {
        await say(['Harm: Du bist also das Kind, von dem Jaro ununterbrochen redet. Ich bin Harm.', 'Harm: Die Seeschwalbe ist das schnellste Schiff südlich von Kronfels. Mit ihr kommst du zu allen Inseln.', 'Harm: Ich fahre dich nach Funkenhafen auf der Ostinsel. Und nimm das hier mit – an fremden Stränden schläft man im Zelt.'], N);
        f.port_ankerbrueck = true; f.port_funkenhafen = true; await H.give(g, 'zelt');
        await say(['Mit dem Zelt schlägst du draußen ein Lager auf: START → LAGER.', 'Dort kannst du rasten, mit deinem Team spielen und aus Zutaten Gerichte kochen.']);
      }
      if (s.badges[3] && !f.port_nebelklippe) { f.port_nebelklippe = true; await say(['Harm: Vier Orden! Dann traue ich mich mit dir in den Nebel.', 'Harm: Nebelklippe auf der Nordinsel ist jetzt ein Ziel. Halt dich fest!'], N); }
      return sailMenu(g, g.ow.id);
    }
    case 'fh_ing': return say(f.kraftwerkFrei ? ['Strom ist zurück! Und der Kran funktioniert wieder.'] : ['Seit gestern Nacht ist der ganze Strom weg. Die Kutten-Leute haben das Kraftwerk besetzt!', 'Volta ist hineingegangen, um sie aufzuhalten. Er ist nicht wieder herausgekommen.', 'Drinnen gibt es Schaltplatten am Boden – die öffnen die Sicherheitstore.'], N);
    case 'fh_opa': return say(['Früher habe ich Schiffe gebaut. Die Morgenstern auch.', 'Ihr Rumpf war mit Sternenglas beschlagen. Das hat Liv so gewollt. Keiner wusste, wozu.'], N);
    case 'volta_kw': return say(f.funke1 ? ['Volta: Danke! Ich schalte alles wieder ein. Komm in meine Arena!'] : ['Volta: Pst! Bruder Funke lädt einen Kristall mit dem ganzen Strom der Stadt.', 'Volta: Meine Kreaturen sind erschöpft. Halte ihn auf!'], N);
    case 'funke': return funke(g, n);
    case 'volta': case 'ysolde': return g.gym(n);
    case 'hedda': return hedda(g, n);
    case 'nk_fischer': return say(f.wrackFrei ? ['Der Nebel ist dünner geworden. Die Toten haben ihren Frieden.'] : ['Die Abendstern war das Begleitschiff der Morgenstern. Vor zehn Jahren trieb sie zurück in die Bucht – ohne Mannschaft.', 'Nur der Kapitän war an Bord. Morrow. Tot, aber mit einem Brief in der Hand, den er nicht losließ.', 'Wir haben das Wrack in die Klippenhöhle am Ende des Nebelpfads gezogen. Seitdem spukt es dort.'], N);
    case 'nk_kerze': return say(['Für jeden, der nicht heimkehrt, zünden wir eine Kerze an.', 'Für die Morgenstern brennt seit zehn Jahren eine im Fenster. Für Kapitänin Liv – und für Sela, die Steuerfrau.'], N);
    case 'nebel3': return nebel3(g, n);
    case 'morrow': return morrow(g, n);
    case 'ysolde_wrack': return say(f.morrowRuhe ? ['Ysolde: Er hat Frieden gefunden. Dank dir.'] : ['Ysolde: Kapitän Morrow ruht nicht. Der Orden hat seinen Brief gesucht – den Brief, den er nie losgelassen hat.', 'Ysolde: Er wartet auf jemanden. Ich glaube … auf dich.'], N);
    default: return false;
  }
}

async function funke(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  if (!f.tr_orden5 || !f.tr_orden6) return say('Bruder Funke: Ich bin beschäftigt. Meine Novizen kümmern sich um Besucher.', N);
  await g.cutIn(n);
  await say(['Bruder Funke: Noch drei Minuten und der Tor-Kristall ist voll. Dann kann die Äbtissin das Meer anhalten.', 'Bruder Funke: Das Meer hat meinen Bruder genommen. Und deinen? Deine Mutter, oder? Dann solltest du auf unserer Seite stehen!'], N);
  const won = await g.trainerFight({ name: 'Bruder Funke', look: n.look, team: [['voltrex', 31], ['oelmotte', 31], ['getriebor', 33]], reward: 2400, lose: 'Der Kristall … überladen …', music: 'boss', bg: 'arena' });
  if (!won) return say('Bruder Funke: Geh, Kind. Bevor du verletzt wirst.', N);
  await say(['Bruder Funke: Du verstehst es nicht. Wenn das Meer still ist, verschwindet niemand mehr.', 'Bruder Funke: … Nimm deine Stadt zurück. Den Kristall bekommt die Äbtissin trotzdem – er ist halb voll, das reicht vorerst.'], N);
  await fade(1, 300); f.funke1 = true; f.kraftwerkFrei = true; g.ow.npcs = g.ow.npcs.filter(x => x !== n && x.id !== 'volta_kw'); G.shake = 0.5; sfx('lvl'); await fade(0, 300);
  await say(['Überall im Kraftwerk springen die Lichter an. Funkenhafen hat wieder Strom!', 'Unter Funkes Pult liegt ein zerknittertes Blatt …']);
  await H.addLog(g, 7); g.save(true);
}
async function hedda(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  if (s.bag.sattel) return say(['Hedda: Wie reitet es sich? Denk dran: Im hohen Gras scheuchst du beim Reiten weniger Kreaturen auf.', 'Hedda: Und große Lauftiere wie Widderkraft oder Sturmross sind die besten Reittiere.'], N);
  if (!s.badges[3]) return say(['Hedda: Ein Sattel? Den gebe ich nur jemandem, der Volta besiegt hat. Der Junge ist klüger als er aussieht.'], N);
  await say(['Hedda: Du bist das Kind mit dem Kompass. Volta hat angerufen.', 'Hedda: Dieser Sattel gehörte deiner Mutter. Sie ist hier als Mädchen auf einem Dunaro über die Weiden gejagt.', 'Hedda: Bevor sie ging, sagte sie: „Gib ihn meinem Kind, wenn es hier vorbeikommt.“ Ich hab zehn Jahre gewartet.'], N);
  await H.give(g, 'sattel');
  await say(['Mit dem Sattel reitest du auf großen Lauftieren aus deinem Team: START → REITEN.', 'Zum Beispiel Dunaro, Rankora, Widderkraft, Fohlenwind oder dein entwickelter Starter.']);
  g.save(true);
}
async function nebel3(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  if (!f.tr_orden7) return say('Schwester Nebel: …', N);
  await g.cutIn(n);
  await say(['Schwester Nebel: Ich wusste, dass du kommst. Ich habe auf dich gewartet. Diesmal allein.', 'Schwester Nebel: Wir haben das ganze Wrack durchsucht. Morrows Brief ist nicht hier – er hält ihn fest, auch im Tod.', 'Schwester Nebel: Die Äbtissin heißt Sela. Sie war Steuerfrau auf der Morgenstern. Sie ist als Einzige zurückgekommen.', 'Schwester Nebel: Ich will wissen, was sie gesehen hat. Und warum sie das Meer so hasst. Kämpf gegen mich – ein letztes Mal!'], N);
  const won = await g.trainerFight({ name: 'Schwester Nebel', look: n.look, team: [['echolot', 31], ['laternix', 32], ['phantomedusa', 33], ['kristallux', 33]], reward: 3000, lose: 'Danke. Ich glaube, das habe ich gebraucht.', music: 'boss', bg: 'hoehle' });
  if (!won) return say('Schwester Nebel: Noch nicht stark genug. Komm wieder.', N);
  await say(['Schwester Nebel: Ich verlasse den Orden. Nicht heute – aber bald.', 'Schwester Nebel: Wenn du Sela gegenübertrittst, sieh ihr in die Augen. Sie ist nicht böse. Sie ist nur … zerbrochen.'], N);
  await fade(1, 300); f.nebel3 = true; g.ow.npcs = g.ow.npcs.filter(x => x !== n); await fade(0, 300); g.save(true);
}
async function morrow(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  if (!f.nebel3) return say(['Ein durchscheinender Seemann starrt ins Leere. Er hält etwas fest an die Brust gedrückt.', 'Kapitän Morrow: … Zu viele Fremde. Zu viele Hände. Geht.'], N);
  await g.cutIn(n); cry({ f: 300, f2: 200, len: 0.8, wave: 'sine', wob: 6 });
  await say(['Kapitän Morrow: … Dieser Kompass. Ich kenne ihn.', `Kapitän Morrow: Du hast ihre Augen. Livs Augen. Dann bist du ${s.name}.`, 'Kapitän Morrow: Ich habe versprochen, diesen Brief zu überbringen. Aber erst muss ich wissen, ob du stark genug bist, ihn zu tragen.'], N);
  const won = await g.trainerFight({ name: 'Kapitän Morrow', look: n.look, team: [['ankerfuerst', 35], ['phantomedusa', 35], ['totenrabe', 36]], reward: 0, lose: 'Gut. Sehr gut.', music: 'boss', bg: 'hoehle', noBlackout: true });
  if (!won) { s.team.forEach(m => (m.hp = Math.max(1, m.hp))); return say('Kapitän Morrow: Noch nicht. Komm wieder, wenn du bereit bist.', N); }
  await say(['Kapitän Morrow: Zehn Jahre. Zehn Jahre habe ich ihn gehalten.', 'Kapitän Morrow: Nimm ihn. Und dann lass mich schlafen.'], N);
  await fade(1, 600); f.morrowRuhe = true; f.wrackFrei = true; g.ow.npcs = g.ow.npcs.filter(x => x !== n && x.id !== 'ysolde_wrack'); sfx('heal'); await fade(0, 600);
  await say('Wo Morrow stand, liegt ein Brief. Die Schrift kennst du nicht – und doch weißt du sofort, von wem er ist.');
  await H.addLog(g, 8);
  await say(['Der Nebel in der Höhle lichtet sich. Ysolde ist zurück in ihre Arena gegangen.']); g.save(true);
}

export async function afterGym(g, id) {
  const s = g.state, f = s.flags;
  if (id !== 'ysolde') return;
  await fade(1, 600); setMusic('night');
  await say(['Ysolde legt ihre Hand auf deine Stirn. Alles wird weiß.', '… Ein Meer, das bis in den Himmel reicht. Inseln, die in der Luft schweben.', 'Eine Frau mit einem Kapitänshut steht an einem Tor aus Licht. Sie dreht sich um.', `„${s.name}? … Nein. Komm nicht. Noch nicht.“`, 'Neben ihr: ein riesiges Wesen aus Wasser und Sternen. Es schläft.']);
  await fade(0, 600); g.ow.music();
  await say(['Ysolde: Deine Mutter lebt. Hinter dem Tor. Und sie bewacht etwas, das niemals aufwachen darf.', 'Ysolde: Geh zum Hafen. Ich spüre … jemand wartet dort auf dich.'], { name: 'Ysolde' });
}

export async function mapEvent(g, id) {
  const s = g.state, ow = g.ow, f = s.flags;
  if (f.jaro3 && !f.shipCall && !ow.M.indoor) {
    f.shipCall = true; ow.busy = true; await wait(450); sfx('dex');
    await say(['Dein Muschelfon klingelt …', 'Jaro: Das Schiff ist fertig! Mein Onkel Harm wartet am Hafensteg von Ankerbrück.', 'Jaro: Er bringt dich zu den anderen Inseln. Ich komme nach, sobald ich meinen dritten Orden habe!']);
    ow.busy = false; g.save(true);
  }
  if (id === 'funkenhafen' && !f.reachedFH) { f.reachedFH = true; ow.busy = true; await wait(450); await say(['Funkenhafen, die Stadt der Ingenieure. Normalerweise leuchten hier tausend Lampen.', 'Heute ist alles dunkel. Kein Kran bewegt sich, kein Licht brennt.']); ow.busy = false; g.save(true); }
  if (id === 'nebelklippe' && !f.reachedNK) { f.reachedNK = true; ow.busy = true; await wait(450); await say(['Nebelklippe. Der Nebel ist so dicht, dass man kaum die eigene Hand sieht.', 'In jedem Fenster brennt eine Kerze.']); ow.busy = false; g.save(true); }
  if (id === 'nebelklippe' && s.badges[4] && !f.aebtissin1) return aebtissin(g);
}

async function aebtissin(g) {
  const s = g.state, ow = g.ow, f = s.flags, p = ow.p;
  ow.busy = true; await wait(500);
  const A = { id: 'aeb', name: 'Die Äbtissin', look: LOOK.aebtissin, x: p.x, y: Math.max(1, p.y - 3), dir: 'down', px: p.x * 16, py: Math.max(1, p.y - 3) * 16 };
  if (ow.solid(A.x, A.y)) { A.y = p.y + 2; A.py = A.y * 16; A.dir = 'up'; }
  ow.npcs.push(A); setMusic('boss'); await g.cutIn(A);
  await ow.npcWalkTo(A, p.x, A.y < p.y ? p.y - 1 : p.y + 1); p.dir = A.y < p.y ? 'up' : 'down';
  const N = { name: 'Die Äbtissin' };
  await say(['Die Äbtissin: Du bist also Livs Kind.', 'Die Äbtissin: Ich bin Sela. Ich stand am Steuer der Morgenstern, als das Tor sich öffnete.', 'Die Äbtissin: Ich habe gesehen, was dahinter schläft. Es ist größer als jedes Meer – und wenn es erwacht, verschlingt es alle Gezeiten. Alle Welten.', 'Die Äbtissin: Deine Mutter glaubt, sie kann es bewachen. Ich glaube, man muss das Meer anhalten, bevor es zu spät ist.', 'Die Äbtissin: Gib mir den Kompass. Er ist der Schlüssel. Ohne ihn öffnet sich das Tor nie wieder – und niemand muss mehr gehen.'], N);
  const c = await ask('Der Äbtissin den Kompass geben?');
  if (c) await say(['Du streckst die Hand aus – doch der Kompass wird glühend heiß. Du kannst ihn nicht loslassen.'], {});
  else await say(['Die Äbtissin: Dann nehme ich ihn mir.'], N);
  // Pip greift ein
  const P = { id: 'pip_x', name: 'Pip', look: LOOK.pip, x: p.x + 1, y: p.y, dir: 'left', px: (p.x + 1) * 16, py: p.y * 16 };
  if (ow.solid(P.x, P.y)) { P.x = p.x - 1; P.px = P.x * 16; P.dir = 'right'; }
  ow.npcs.push(P); await fade(0.95, 120); sfx('shiny'); G.shake = 1; await fade(0, 500);
  await say(['Pip: Lass das.', 'Ein Licht, so hell wie der Morgenstern, strahlt aus Pip heraus. Die Äbtissin weicht zurück.'], { name: 'Pip' });
  await say(['Die Äbtissin: … Das Kind der Flut. Also ist es wahr.', 'Die Äbtissin: Genieße deine Zeit, Livs Kind. Das Meer wartet nicht ewig. Wir sehen uns auf der Glutinsel.'], N);
  await fade(1, 400); ow.npcs = ow.npcs.filter(x => x !== A); await fade(0, 400);
  await say(['Pip: … Hab ich was Komisches gemacht?', 'Pip: Ich weiß nicht, wie das ging. Ich wollte nur, dass sie dich in Ruhe lässt.', 'Pip: Ich bin müde. Ich geh nach Hause, nach Muschelbucht.'], { name: 'Pip' });
  await fade(1, 300); ow.npcs = ow.npcs.filter(x => x !== P); f.aebtissin1 = true; await fade(0, 300); g.ow.music();
  await say(['Kapitän Harm kommt angerannt: Alles in Ordnung?! Ich hab ein Licht gesehen, heller als jeder Leuchtturm!', 'Pager: Das nächste Ziel ist die Glutinsel. (Kommt in Phase 4!)']);
  ow.busy = false; g.save(true);
}
