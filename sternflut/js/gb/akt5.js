// Akt 5 – Welt 2, Teil 1: Durch das Tor in die Weite See. Treibholzinsel, Perlhafen (Arena 9), die Morgenstern,
// Tauchen ins Korallenriff, Coralis (Arena 10), Frostholm (Arena 11), Erzmine mit Prof. Kehl, Erzheim (Arena 12)
import { say, ask } from './gbui.js';
import { G, W, H, push, pop, input, text, fade, wait } from './engine.js';
import { sfx, cry, setMusic } from '../core/audio.js';
import { MAPS, ENC, ITEMS, LOOK } from './maps.js';
import { MAPS2, ENC2, ITEMS2, LOOK2 } from './maps2.js';
import { addPort, sailMenu } from './travel.js';
import { counterOf } from './story.js';
import '../data/welt2a.js';

Object.assign(MAPS, MAPS2); Object.assign(ENC, ENC2); Object.assign(ITEMS, ITEMS2);
// Muschelstrand: Pip wartet auf den Aufbruch
MAPS.strand.npcs.push({ id: 'pip_tor', x: 13, y: 9, dir: 'down', look: LOOK.pip, name: 'Pip', showIf: 'w1done', hideIf: 'w2start' });
addPort('treibholz', { name: 'Treibholzinsel', x: 19, y: 8, dir: 'left', world: 2 });
addPort('perlhafen', { name: 'Perlhafen', x: 2, y: 9, dir: 'right', world: 2 });
addPort('frosthafen', { name: 'Frosthafen (Frostholm)', x: 2, y: 9, dir: 'right', world: 2 });

let H2; export function init(h) { H2 = h; }

export const GYMS = {
  nami: {
    badge: 8, badgeName: 'PERLORDEN', team: [['tauchling', 62], ['perlmu', 63], ['krakador', 64], ['rifftaenzer', 64], ['perlfuerstin', 66]], reward: 8000, bg: 'wasser',
    intro: ['Nami: Du kommst von der anderen Seite des Tors, oder? Man sieht es an deinen Augen. Sie suchen etwas.', 'Nami: Ich bin Nami, Taucherin und Arenaleiterin. Hier in der Weiten See ist alles größer – auch die Kreaturen.', 'Nami: Zeig mir, ob du tief genug tauchen kannst!'],
    lose: 'Nami: Du hast mehr Atem als jeder Taucher, den ich kenne.',
    gift: { text: ['Nami: Nimm meinen alten Taucherhelm. Damit kannst du am Tauchsteg unter Wasser gehen – bis ins Korallenriff.', 'Nami: Und hier: Tiefseekugeln. Unter Wasser sind sie unschlagbar.'], items: { taucherhelm: 1, tiefseekugel: 5 } },
    outro: ['Nami: Unter dem Riff liegt Coralis, die Korallenstadt. Thalia ist dort Arenaleiterin.', 'Nami: Und Werftmeister Kalle wollte dich unbedingt sprechen. Er klang … aufgeregt.'],
    after: ['Nami: Der Perlorden steht dir. Der Tauchsteg ist im Süden des Hafens.'],
  },
  thalia: {
    badge: 9, badgeName: 'KORALLENORDEN', team: [['korallion', 67], ['kronengecko', 67], ['palmzange', 68], ['tiefenhai', 68], ['ozeanwal', 70]], reward: 8600, bg: 'wasser',
    intro: ['Thalia: Du hast unseren Tempel gerettet. Coralis steht in deiner Schuld.', 'Thalia: Aber ein Orden wird nicht geschenkt. Das Riff ist stark, weil es nie aufgibt. Ich auch nicht!'],
    lose: 'Thalia: Das Riff verneigt sich. Und Coralis mit ihm.',
    gift: { text: ['Thalia: Nimm diese Top-Beleber. Und das hier – ein Stück Sternenglas, das die Jäger übersehen haben.'], items: { topbeleber: 3, sonderbonbon: 4 } },
    outro: ['Thalia: Die Gezeitenjäger suchen überall Sternenglas. Ihre Spuren führen nach Norden – nach Frostholm.', 'Thalia: Dort, unter dem ewigen Eis, liegt die größte Sternenglas-Ader der Weiten See.'],
    after: ['Thalia: Der Korallenorden steht dir. Möge die Strömung dich tragen.'],
  },
  ingrid: {
    badge: 10, badgeName: 'FROSTORDEN', team: [['aurorafuchs', 71], ['kaiserpin', 71], ['lawinhase', 72], ['walrosser', 72], ['polarstern', 73], ['gletschbaer', 74]], reward: 9200, bg: 'schnee',
    intro: ['Ingrid: Ein Kind aus der Wärme. Das Eis wird dich lehren, was Geduld heißt.', 'Ingrid: Ich bin Ingrid. In Frostholm sagt man: Wer auf dem Eis tanzt, muss wissen, wann er stillsteht.'],
    lose: 'Ingrid: Das Eis bricht. Und ich lächle. Das passiert selten.',
    gift: { text: ['Ingrid: Nimm diese Hypertränke. In der Erzmine wird es kalt – und gefährlich.'], items: { hypertrank: 5, toptrank: 2 } },
    outro: ['Ingrid: Die Gezeitenjäger bohren in der Erzmine am Ende des Frostpfads. Bjarne ist hinein, um sie aufzuhalten.', 'Ingrid: Und da war eine Frau bei ihnen. Mit weißem Kittel und kaltem Blick.'],
    after: ['Ingrid: Der Frostorden steht dir. Die Erzmine liegt am Frostpfad im Norden.'],
  },
  bjarne: {
    badge: 11, badgeName: 'ERZORDEN', team: [['bohrkoenig', 75], ['frostkoloss', 75], ['getriebor', 76], ['scherator', 76], ['kronwyrm', 77], ['voltrex', 78]], reward: 9800, bg: 'berg',
    intro: ['Bjarne: Die Mine ist frei, die Bohrer schweigen. Danke, Fremde.', 'Bjarne: Ich bin Bjarne, der Bergkönig. Meine Kreaturen sind hart wie Erz. Zeig mir, ob du härter bist!'],
    lose: 'Bjarne: Ha! Du hast mich glatt gespalten. Wie ein Stück Kohle.',
    gift: { text: ['Bjarne: Nimm diese Sonderbonbons. Bergleute schwören drauf.'], items: { sonderbonbon: 5, topbeleber: 2 } },
    outro: ['Bjarne: Vier Orden der Weiten See. Du bist schneller als jeder Wind hier oben.', 'Bjarne: Über den Wolken, im Osten, schwebt das Wolkenreich. Dorthin kommt kein Schiff. Nur Flügel.'],
    after: ['Bjarne: Der Erzorden steht dir. Möge dein Weg nie verschüttet sein.'],
  },
};
export const QUESTS = {
  ph_frau: { want: 'perlmu', title: 'Die leuchtende Perle', ask: ['Ein Perlmu! Ich brauche nur einen Blick auf eine echte Riffperle.', 'Im Korallenriff gibt es welche – tauch doch mal!'], thanks: ['{mon} … Diese Perle leuchtet wie ein kleiner Mond!', 'Nimm das. Ein Taucher hat dafür bezahlt, aber nie abgeholt.'], reward: { tiefseekugel: 5, sonderbonbon: 2 }, after: 'Seit ich die Riffperle gesehen habe, träume ich vom Meeresgrund.' },
  fr_kind: { want: 'firnhase', title: 'Der weiße Hase', ask: ['Ich hab einen weißen Hasen im Schnee gesehen! Oder war es nur Schnee?', 'Am Frostpfad. Fängst du einen für mich zum Anschauen?'], thanks: ['Es WAR ein Hase! {mon} ist sooo flauschig!', 'Hier, Oma Siv hat gesagt, ich soll das jemandem Nettem geben.'], reward: { toptrank: 2, honig: 3 }, after: 'Ich nenn ihn Schneeflocke. Den, den ich gesehen hab.' },
};
export const LOGS = {
  13: ['Tag 104. Die Weite See. Zwei Monde, Inseln in den Wolken, ein Meer so tief, dass es keinen Grund hat.', 'Ich habe die Morgenstern in Perlhafen gelassen. Wer sie findet, soll sie für mein Kind bereithalten.'],
  14: ['Tag 140. In Coralis singen sie ein Lied, das ich kenne. Das Lied der Gezeiten – nur rückwärts.', 'Hier ist es kein Weg, sondern ein Wiegenlied. Für etwas, das schläft.'],
  15: ['Tag 171. Thalassyr. So heißt es. Das Wesen unter allen Meeren.', 'Es ist nicht böse. Es ist ein Kind, das schlafen muss, bis es groß genug ist, nicht alles zu verschlingen. Ich singe ihm jede Nacht vor.'],
};
export const SONG = {};
export const CALLS = {
  nami: ['Nami: Unter Wasser ist alles leiser. Wenn du traurig bist – tauch einfach.'],
  thalia: ['Thalia: Coralis singt jeden Abend das Wiegenlied. Seit du da warst, singen sie es für deine Mutter.'],
  ingrid: ['Ingrid: Das Nordlicht war heute grün und violett. Das bedeutet Glück. Sagt man.'],
  bjarne: ['Bjarne: Die Mine läuft wieder. Und wir haben das Sternenglas gut versteckt – vor allen.'],
};
export function contacts(s, c) {
  if (s.badges[8]) c.push({ id: 'nami', name: 'Nami' });
  if (s.badges[9]) c.push({ id: 'thalia', name: 'Thalia' });
  if (s.badges[10]) c.push({ id: 'ingrid', name: 'Ingrid' });
  if (s.badges[11]) c.push({ id: 'bjarne', name: 'Bjarne' });
}
export function goal(s) {
  const f = s.flags;
  if (!f.w1done) return null;
  if (!f.w2start) return { t: 'Das Tor', d: 'Pip wartet am Strand von Muschelbucht. Der Kompass zeigt nach oben – es ist Zeit.', map: 'strand' };
  if (!f.w2crew) return { t: 'Gestrandet', d: 'Sprich mit Jaro und Pip auf der Treibholzinsel.', map: 'treibholz' };
  if (!f.port_perlhafen) return { t: 'Eine Fischerin', d: 'Fischerin Nalu am Steg kann euch zur nächsten Stadt bringen.', map: 'treibholz' };
  if (!s.badges[8]) return { t: 'Arena Perlhafen', d: 'Fordere Taucherin Nami heraus! Pflanzen- und Elektro-Attacken treffen Wasser hart.', map: 'perlhafen' };
  if (!f.morgenstern) return { t: 'Die Werft', d: 'Werftmeister Kalle in Perlhafen will dir etwas zeigen.', map: 'perlhafen' };
  if (!f.vex1) return { t: 'Unter dem Riff', d: 'Tauch am Steg im Süden von Perlhafen ins Korallenriff und schwimm nach Norden bis Coralis. Im Tempel kämpft Thalia gegen die Gezeitenjäger.', map: 'perlhafen' };
  if (!s.badges[9]) return { t: 'Arena Coralis', d: 'Fordere Riffhüterin Thalia heraus! Feuer- und Luft-Attacken helfen gegen Pflanze, Elektro gegen Wasser.', map: 'perlhafen' };
  if (!s.badges[10]) return { t: 'Frostholm', d: 'Segle mit der Morgenstern nach Frosthafen und fordere Eiskönigin Ingrid heraus. Feuer, Metall und Erde helfen gegen Eis.', map: 'frosthafen' };
  if (!f.kehlMine) return { t: 'Die Erzmine', d: 'Die Gezeitenjäger bohren in der Erzmine am Ende des Frostpfads. Prof. Kehl ist bei ihnen.', map: 'frosthafen' };
  if (!s.badges[11]) return { t: 'Arena Erzheim', d: 'Erzheim liegt hinter der Erzmine. Fordere Bergkönig Bjarne heraus! Feuer-, Erd- und Wasser-Attacken helfen.', map: 'frosthafen' };
  if (!f.albatros) return { t: 'Flügel', d: 'Geh zurück nach Frosthafen. Am Himmel über dem Hafen ist etwas Seltsames aufgetaucht …', map: 'frosthafen' };
  return null;
}

// ---------------------------------------------------------------- Durch das Tor (Wirbel aus Licht)
class PortalScene {
  constructor(res) { this.res = res; this.t = 0; }
  update(dt) { this.t += dt; if (this.t > 4.2 || (this.t > 1.2 && (input.pressed('a') || input.tap))) { pop(this); this.res(); } }
  draw(ctx) {
    const t = this.t, cx = W / 2, cy = H / 2;
    ctx.fillStyle = '#05040f'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { const a = i * 2.39996 + t * (0.6 + (i % 5) * 0.2), r = ((i * 13 + t * 90) % 170); ctx.fillStyle = `rgba(${200 + (i % 3) * 20},${220},255,${Math.min(1, r / 120)})`; ctx.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7, 1 + (r > 100), 1 + (r > 100)); }
    for (let k = 0; k < 7; k++) { const rr = ((t * 40 + k * 22) % 154); ctx.strokeStyle = `hsla(${190 + k * 22 + t * 40},90%,70%,${0.6 - rr / 260})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, rr, rr * 0.62, t * 0.6 + k, 0, 7); ctx.stroke(); }
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40 + Math.sin(t * 4) * 6); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.4, 'rgba(160,220,255,.6)'); g.addColorStop(1, 'rgba(80,60,200,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (t > 3.4) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, (t - 3.4) * 1.5)})`; ctx.fillRect(0, 0, W, H); }
    text('DIE WEITE SEE', cx, 12, `rgba(255,240,200,${Math.min(1, t / 2)})`, 10, 'center', '#1a1040', true);
  }
}
const portal = () => new Promise(res => push(new PortalScene(res)));

export async function talk(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  switch (n.id) {
    case 'pip_tor': return aufbruch(g, n);
    case 'jaro_w2': case 'pip_w2a': return crew(g);
    case 'nalu': case 'nalu_ph':
      if (!f.port_perlhafen) { await say(['Nalu: Ihr seid vom Himmel gefallen? Mit einem Wirbel aus Licht? … Klar. Passiert hier jeden Dienstag.', 'Nalu: Spaß. Ich bin Nalu. Ich bringe euch nach Perlhafen – dort gibt es alles, was Schiffbrüchige brauchen.'], N); f.port_treibholz = true; f.port_perlhafen = true; }
      return sailMenu(g, g.ow.id);
    case 'crew_ph': case 'crew_fr': await say('Jaro: Wohin, Käpt’n?', { name: 'Jaro' }); return sailMenu(g, g.ow.id);
    case 'pip_ph': return say([['Pip: Hier riecht das Meer anders. Älter.'], ['Pip: Manchmal träume ich, ich bin ganz groß und schlafe unter dem Meer. Komisch, oder?'], ['Pip: Das Ei in deiner Tasche … es wird wärmer, je weiter wir kommen.']][(s.steps >> 3) % 3], N);
    case 'kalle': return kalle(g, n);
    case 'tauchmeister':
      if (!s.bag.taucherhelm) return say(['Oke: Das hier ist der Tauchsteg. Darunter liegt das Korallenriff – und noch tiefer Coralis.', 'Oke: Ohne Taucherhelm geht da keiner runter. Nami verleiht ihren nur an Leute, die sie besiegt haben.'], N);
      if (!await ask('Abtauchen ins Korallenriff?')) return;
      sfx('whoosh'); await fade(1, 400); g.ow.load('korallenriff', 10, 13, 'up'); g.ow.music(); await fade(0, 500);
      if (!f.diveTip) { f.diveTip = true; await say(['Mit dem Taucherhelm atmest du ganz normal. Im Seegras leben wilde Kreaturen.', 'Über die helle Öffnung im Süden tauchst du wieder auf. Im Norden liegt Coralis.']); }
      return;
    case 'ph_alte': return say(['Vor neun Jahren lag hier ein Schiff im Hafen, ganz ohne Mannschaft. Mit einem Stern auf dem Segel.', 'Die Kapitänin war nur kurz in der Stadt. Sie kaufte Brot, Seil – und eine Spieluhr. Dann ging sie zu Fuß nach Westen. Aufs Wasser.'], N);
    case 'ks_waechterin': return say(f.vex1 ? ['Der Tempel ist frei! Thalia wartet in ihrer Arena.'] : ['Die Gezeitenjäger sind in unseren Tempel eingedrungen. Sie wollen das Sternenglas im Altar!', 'Thalia ist allein hineingegangen.'], N);
    case 'ks_kind': return say(['Wusstest du, dass die Luft hier unten nach Salz schmeckt? Weil wir unter einer Glaskuppel wohnen!', 'Die Korallenhüter singen jeden Abend ein Lied. Damit der Riese unter dem Meer weiterschläft.'], N);
    case 'ks_alte': if (!f.log14) { await say(['Eine Kapitänin hat hier vor Jahren gewohnt. Sie hat unser Wiegenlied gelernt und es in ein Buch geschrieben.', 'Dieses Blatt hat sie dagelassen. Ich habe es immer aufbewahrt.'], N); return H2.addLog(g, 14); } return say('Sie sang das Lied schöner als wir alle. Und trauriger.', N);
    case 'vex': return vex(g, n);
    case 'thalia_t': return say(['Thalia: Die Jäger wollen das Sternenglas im Altar! Meine Kreaturen sind erschöpft – halt sie auf!'], N);
    case 'nami': case 'thalia': case 'ingrid': case 'bjarne': return g.gym(n);
    case 'fr_fischer': return say(['Das Eis im Fjord ist dieses Jahr früh aufgebrochen. Als hätte etwas darunter sich bewegt.', 'Ingrids Arena ist ein einziger Eisspiegel. Wer rutscht, hält erst an der nächsten Wand!'], N);
    case 'fr_alte': return say(['Unter dem Eisgipfel schläft Boreal, der Wächter des Nordens. Er wacht nur auf, wenn jemand das Eis verletzt.', 'Die Fremden in der Mine haben es verletzt.'], N);
    case 'eh_bergmann': return say(f.kehlMine ? ['Die Mine ist frei! Bjarne ist zurück in der Arena.'] : ['Fremde bohren in unserer Mine. Mit Maschinen, wie ich sie noch nie gesehen habe.', 'Bjarne ist hinein. Und nicht wieder heraus.'], N);
    case 'eh_alte': return say(['Sternenglas ist gefrorenes Sternenlicht. In Frostholm sagt man, es sei vom Himmel gefallen, als der Riese unter dem Meer geboren wurde.'], N);
    case 'kehl_mine': return kehlMine(g, n);
    default: return false;
  }
}

async function aufbruch(g, n) {
  const s = g.state, f = s.flags, ow = g.ow;
  await say(['Pip: Da bist du ja. Jaro wartet schon – er kommt mit. Natürlich kommt er mit.', 'Pip: Ich komme auch mit. Ich weiß nicht warum. Ich weiß nur, dass ich da hingehöre.', 'Pip: Halt den Kompass hoch.'], { name: 'Pip' });
  if (!await ask('Den Gezeitenkompass zum Himmel halten?')) return say('Pip: Ich warte. Aber nicht zu lange!', { name: 'Pip' });
  const J = { id: 'jaro_t', name: 'Jaro', look: LOOK.jaro, x: 9, y: 1, dir: 'down', px: 144, py: 16 };
  ow.npcs.push(J); await ow.npcWalkTo(J, ow.p.x - 1, ow.p.y);
  await say(['Jaro: Wehe, du gehst ohne mich! Versprochen ist versprochen.', 'Oma Wella ruft vom Dorf herunter: „Bring sie nach Hause, Schatz! Und iss genug!“'], { name: 'Jaro' });
  G.shake = 1.2; sfx('shiny'); await fade(0.9, 300);
  await say(['Ein Lichtstrahl schießt aus dem Kompass in den Himmel. Über dem Meer reißt der Himmel auf – ein Wirbel aus Sternen.', 'Das Wasser hebt sich und trägt euch nach oben …']);
  setMusic('title'); await portal();
  f.w2start = true; s.world = 2;
  await fade(1, 1); ow.load('treibholz', 10, 7, 'down'); ow.music(); await fade(0, 1200);
  await say(['… Sand. Warmer Sand. Rauschen.', 'Über dir stehen zwei Monde am hellen Himmel. In der Ferne schweben Inseln zwischen den Wolken.', 'Jaro und Pip liegen neben dir im Sand.']);
  g.save(true);
}
async function crew(g) {
  const s = g.state, f = s.flags;
  if (f.w2crew) return;
  await say(['Jaro: Autsch … Wo sind wir? Ist das … sind das ZWEI Monde?!', 'Pip: Die Weite See. Hier ist alles größer. Die Meere, die Kreaturen … und die Gefahren.', 'Pip: Und irgendwo hier ist deine Mama.', `Jaro: ${s.name}, ab jetzt sind wir eine Mannschaft. Du bist die Kapitänin, ich der Steuermann, Pip ist … Pip.`, 'Pip: Ich bin der Schiffsjunge. Hab ich gerade beschlossen.', 'Jaro: Wir brauchen nur noch ein Schiff. Die Fischerin da drüben sieht hilfsbereit aus.'], { name: 'Jaro' });
  await fade(1, 250); f.w2crew = true; g.ow.npcs = g.ow.npcs.filter(x => !['jaro_w2', 'pip_w2a'].includes(x.id)); await fade(0, 250); g.save(true);
}
async function kalle(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  if (f.morgenstern) return say(['Kalle: Die Morgenstern segelt wie am ersten Tag. Pass gut auf sie auf, Käpt’n!'], N);
  if (!s.badges[8]) return say(['Kalle: Du bist das Kind mit dem Kompass, oder? Komm wieder, wenn Nami dir ihren Orden gegeben hat.', 'Kalle: Dann zeig ich dir etwas, worauf ich neun Jahre gewartet habe.'], N);
  await say(['Kalle: Komm mit ins Trockendock.', 'Kalle: Vor neun Jahren trieb dieses Schiff in unseren Hafen. Ohne Mannschaft. Am Steuerrad hing ein Zettel.', '„Für mein Kind. Es wird kommen. Haltet sie bereit.“', 'Kalle: Neun Jahre habe ich sie repariert. Es fehlte nur eines: das Herzstück, eine Fassung im Steuerrad – genau so groß wie dein Kompass.'], N);
  await fade(1, 500); sfx('shiny'); await fade(0, 600);
  await say(['Du setzt den Gezeitenkompass ins Steuerrad. Er passt perfekt. Die Segel blähen sich, obwohl kein Wind weht.', 'Am Bug steht in goldenen Buchstaben: MORGENSTERN.']);
  f.morgenstern = true; sfx('caught');
  await say(['Die Morgenstern gehört jetzt dir! Jaro steht am Steuer und bringt euch zu allen Häfen der Weiten See.', 'Kalle: Und das hier steckte im Kartentisch. Ich hab es nie gelesen. Es ist nicht für mich.']);
  await H2.addLog(g, 13); g.save(true);
}
async function vex(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  if (!f.tr_jaeger1 || !f.tr_jaeger2) return say('Jägerin Vex: Meine Leute kümmern sich um dich.', N);
  await g.cutIn(n);
  await say(['Jägerin Vex: Livs Kind. Die Professorin hat gesagt, dass du kommst.', 'Jägerin Vex: Ich bin Vex, Anführerin der Gezeitenjäger. Wir jagen Sternenglas. Und Leute, die im Weg stehen.', 'Jägerin Vex: Die Professorin braucht sieben Splitter für den Weckruf. Dieser hier ist Nummer vier.'], N);
  const won = await g.trainerFight({ name: 'Jägerin Vex', look: n.look, team: [['tiefenhai', 66], ['krakador', 66], ['voltrex', 67], ['mantarion', 68]], reward: 5200, lose: 'Tch. Du bist so stark, wie sie gesagt hat.', music: 'boss', bg: 'ruine' });
  if (!won) return say('Jägerin Vex: Schwimm nach Hause, Kind.', N);
  await say(['Jägerin Vex: Behalte deinen Tempel. Ich habe gelernt, was ich wissen musste.', 'Jägerin Vex: Wir sehen uns im Norden. Und dann ist es kein Spiel mehr.'], N);
  await fade(1, 300); f.vex1 = true; g.ow.npcs = g.ow.npcs.filter(x => x !== n && x.id !== 'thalia_t'); await fade(0, 300);
  await say('Thalia ist zurück in ihre Arena geschwommen. Der Altar mit dem Sternenglas ist sicher.'); g.save(true);
}
async function kehlMine(g, n) {
  const s = g.state, f = s.flags, N = { name: 'Prof. Kehl' };
  if (!f.tr_jaeger3 || !f.tr_jaeger4) return say('Kehl: Später, Livs Kind. Meine Jäger sind noch nicht fertig mit dir.', N);
  await g.cutIn(n); setMusic('boss');
  await say(['Kehl: Hallo, Kleines. Du siehst müde aus. Schläfst du genug?', 'Kehl: Ich will ehrlich sein – das bin ich dir schuldig. Unter allen Meeren schläft ein Wesen. Thalassyr. Es ist älter als die Welten.', 'Kehl: Wer es weckt und ihm einen Namen gibt, dem gehorchen alle Gezeiten. Alle Meere. Alle Welten.', 'Kehl: Deine Mutter singt es seit neun Jahren in den Schlaf. Allein, am Grund der Tiefe. Sie wird dabei immer schwächer.', 'Kehl: Ich biete dir etwas an: Gib mir den Kompass, und ich hole Liv heraus. Sie muss nie wieder singen.'], N);
  const yes = await ask('Prof. Kehl den Kompass geben?');
  await say(yes ? ['Kehl: … Du würdest es wirklich tun. Für sie. Das ist das Traurigste, was ich je gesehen habe.', 'Kehl: Aber der Kompass gehorcht nur dir. Ich hätte es wissen müssen. Dann eben auf die harte Tour.'] : ['Kehl: Natürlich nicht. Livs Kind. Stur wie die Mutter.', 'Kehl: Dann eben auf die harte Tour.'], N);
  const won = await g.trainerFight({ name: 'Prof. Kehl', look: n.look, team: [['phantomedusa', 74], ['kristallux', 74], ['gletschwyrm', 75], ['mirageon', 75], ['arkanuvia', 76]], reward: 9000, lose: 'Gut. Sehr gut. Du musst stark sein – für das, was kommt.', music: 'finale', bg: 'hoehle' });
  if (!won) return say('Kehl: Ruh dich aus. Wir haben Zeit. Thalassyr nicht.', N);
  await say(['Kehl: Du hast gewonnen. Und doch habe ich, was ich brauche: sechs Splitter. Der siebte liegt bei deiner Mutter.', 'Kehl: Wenn wir uns wiedersehen, Livs Kind, dann am Grund der Tiefe. Und dann entscheidet sich, wer Thalassyr den Namen gibt.'], N);
  await fade(0.9, 200); sfx('shiny'); await fade(1, 300); f.kehlMine = true; f.erzFrei = true; g.ow.npcs = g.ow.npcs.filter(x => x !== n); await fade(0, 400); g.ow.music();
  await say(['Wo Kehl stand, liegt ein Blatt mit der Handschrift deiner Mutter. Kehl hat es wohl absichtlich zurückgelassen.']);
  await H2.addLog(g, 15);
  await say(['Der Weg nach Erzheim ist frei. Bjarne ist zurück in seiner Arena.', 'Hoch oben am Eisgipfel bewegt sich etwas Gewaltiges …']); g.save(true);
}

export async function afterGym(g, id) {
  const f = g.state.flags;
  if (id === 'thalia' && !f.port_frosthafen) { f.port_frosthafen = true; await say(['Jaro ruft an: Käpt’n! Das Eis im Norden ist aufgebrochen. Wir können nach Frosthafen segeln!']); }
}
export async function mapEvent(g, id) {
  const s = g.state, ow = g.ow, f = s.flags;
  if (id === 'perlhafen' && !f.reachedPH) { f.reachedPH = true; ow.busy = true; await wait(450); await say(['Perlhafen! Schiffe mit fremden Flaggen, Händler mit Perlen so groß wie Äpfel – und ein Meer, das bis zum Himmel zu reichen scheint.']); ow.busy = false; g.save(true); }
  if (id === 'korallenstadt' && !f.reachedKS) { f.reachedKS = true; ow.busy = true; await wait(450); await say(['Coralis, die Stadt unter dem Riff. Häuser aus Korallen, Straßen aus Perlmutt, über allem eine Kuppel aus Licht.']); ow.busy = false; g.save(true); }
  if (id === 'frosthafen' && !f.reachedFR) { f.reachedFR = true; ow.busy = true; await wait(450); await say(['Frosthafen. Der Atem gefriert in der Luft. Am Himmel tanzt ein grünes Nordlicht – mitten am Tag.']); ow.busy = false; g.save(true); }
  if (id === 'frosthafen' && s.badges[11] && !f.albatros) return albatros(g);
}
async function albatros(g) {
  const s = g.state, ow = g.ow, f = s.flags;
  ow.busy = true; await wait(600); G.shake = 0.8; sfx('whoosh');
  await say(['Über dem Hafen öffnet sich ein Riss aus Licht. Ein Flugzeug stürzt heraus, fängt sich knapp über dem Wasser – und landet holpernd im Hafenbecken.', 'Corvin: JUHUUU! Ich wusste, dass die Albatros es schafft!'], { name: 'Corvin' });
  await say([`Corvin: ${s.name}! Als das Tor aufging, bin ich einfach hinterhergeflogen. Hat drei Tage gedauert. Und meine Frisur ist ruiniert.`, 'Corvin: Hab gehört, hier gibt es ein Wolkenreich, wohin kein Schiff kommt. Das ist genau mein Ding.', 'Corvin: Wenn du so weit bist – die Albatros bringt dich überall hin.'], { name: 'Corvin' });
  f.albatros = true; ow.busy = false; g.save(true);
  await say('Pager: Das Wolkenreich wartet. (Kommt mit dem nächsten Update!)');
}
