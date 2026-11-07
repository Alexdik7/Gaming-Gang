// Extras aus dem Wunschzettel: Kopfgeldbrett, Wetterglas, Fährtenleser, Logbuch-Lupe, Angel-Minispiel, Geisterschiff
import { say, ask, choose } from './gbui.js';
import { G, W, H, push, pop, input, text, fade, wait } from './engine.js';
import { sfx, cry, setMusic } from '../core/audio.js';
import { SPECIES } from '../data/creatures.js';
import { MAPS, ENC, ITEMS, LOOK } from './maps.js';

Object.assign(ITEMS, {
  wetterglas: { name: 'Wetterglas', desc: 'Neu! Ruft für 10 Minuten ein Wetter herbei: Regen (Gezeitenkugeln!), Sonne, Nebel oder Schnee.', key: true },
  faehrtenleser: { name: 'Fährtenleser', desc: 'Neu! Zeigt im hohen Gras sofort die Spur einer seltenen Kreatur – manchmal sogar einer schillernden.', key: true },
  logbuchlupe: { name: 'Logbuch-Lupe', desc: 'Neu! Zeigt, wo die fehlenden Seiten aus dem Logbuch der Morgenstern zu finden sind.', key: true },
});
const BOARDS = { ankerbrueck: { x: 3, y: 7 }, perlhafen: { x: 12, y: 7 }, lumara: { x: 4, y: 7 } };
for (const [m, P] of Object.entries(BOARDS)) MAPS[m]?.npcs.push({ id: 'kopfgeld_' + m, x: P.x, y: P.y, dir: 'down', look: LOOK.matrose, name: 'Kopfgeldjägerin Brix' });
MAPS.nebelklippe.npcs.push({ id: 'geisterfaehre', x: 10, y: 16, dir: 'up', look: { skin: '#b8c8d8', hair: '#e8f0f8', outfit: '#3a4a5a', pants: '#2a3040', cap: '#2a3040', accent: '#a8f8ff' }, name: 'Bleicher Fährmann', showIf: 'aebtissin1' });
MAPS.geisterschiff = {
  name: 'Das Geisterschiff', indoor: true, banner: true, enc: null, night: true, darkRadius: 70,
  rows: ['################', '#oooooo##oooooo#', '#oKKooo##oootoo#', '#oooooooooooooo#', '###oo######oo###', '#oooooooooooooo#', '#ootoooooooKKoo#', '#oooooooooooooo#', '######oooo######', '#oooooooooooooo#', '#oKoooooooooKoo#', '#oooooooooooooo#', '#######mm#######'],
  npcs: [
    { id: 'tr_geist1', x: 3, y: 5, dir: 'right', look: LOOK.matrose, name: 'Geistermatrose', trainer: { team: [['bilgenratz', 52], ['nebelquall', 53], ['ankerling', 53]], reward: 2600, sight: 3, lines: ['Hoooo … Wer stört unsere ewige Fahrt?'], lose: 'Hoooo … gut gekämpft …' } },
    { id: 'tr_geist2', x: 12, y: 9, dir: 'left', look: LOOK.fischer, name: 'Geisterfischer', trainer: { team: [['seelenkrebs', 54], ['phantomedusa', 54]], reward: 2700, sight: 3, lines: ['Ich angle seit hundert Jahren. Nichts beißt.'], lose: 'Endlich … ein Biss …' } },
    { id: 'grimbart', x: 12, y: 1, dir: 'down', look: { skin: '#a8b8c8', hair: '#e8f0f8', outfit: '#2a2a3a', pants: '#1a1a24', cap: '#1a1a24', accent: '#a8ffe0', jaw: true }, name: 'Geisterkapitän Grimbart' },
  ],
  items: [{ id: 'it_gs1', x: 1, y: 1, item: 'ball52', n: 1 }, { id: 'it_gs2', x: 14, y: 11, item: 'topbeleber', n: 2 }, { id: 'it_gs3', x: 1, y: 9, item: 'sonderbonbon', n: 3 }],
};

let HE; export function init(h) { HE = h; }
export const LOGS = { 19: ['Tag 2. Ein Schiff ohne Licht hat uns begleitet. Der Kapitän grüßte – mit einer Hand, durch die man hindurchsah.', 'Er sagte: „Wer das Ende des Meeres sucht, findet zuerst die, die es nie erreicht haben.“'] };
export const HINTS = { 1: 'Leuchtturm von Muschelbucht', 2: 'Ankerbrück – die alte Seefrau', 3: 'Alte Werft in Ankerbrück', 4: 'Sandgrotte bei Dünenhain', 5: 'Glimmwald – beim Waldherz', 6: 'Glimmdorf – der alte Jäger', 7: 'Kraftwerk von Funkenhafen', 8: 'Wrack der Abendstern', 9: 'Glutkrater', 10: 'Sturmspitze – die Windmüllerin', 11: 'Kloster von Kronfels', 12: 'Liga – Admiral Brann', 13: 'Werft von Perlhafen', 14: 'Coralis – die alte Korallenhüterin', 15: 'Erzmine in Frostholm', 16: 'Geisterbucht – Jägerin Vex', 17: 'Grund der Tiefe', 18: 'Station Halo', 19: 'Das Geisterschiff (Nebelklippe, nachts)' };
export const QUESTS = {};

// ---------------------------------------------------------------- Kopfgeldbrett (täglich eine gesuchte Kreatur)
function bounty(g) {
  const s = g.state, day = Math.floor(Date.now() / 864e5), wld = s.world || 1;
  if (s.bounty?.day === day && s.bounty.w === wld) return s.bounty;
  const encs = Object.values(MAPS).filter(M => M.enc && ENC[M.enc] && (wld === 1 ? !M.alien && !MAPS2ish(M) : wld === 3 ? M.alien : MAPS2ish(M))).map(M => M.enc);
  const pool = [...new Set(encs)].flatMap(e => ENC[e].list.filter(x => x[1] <= 14 && !SPECIES[x[0]]?.legendary).map(x => x[0]));
  const list = pool.length ? pool : ['silberzack'];
  const sp = list[(day * 7 + wld * 13) % list.length];
  return (s.bounty = { day, w: wld, sp, done: false, claimed: false });
}
const W2MAPS = new Set(['treibholz', 'perlhafen', 'korallenriff', 'korallenstadt', 'frosthafen', 'frostpfad', 'erzmine', 'eisgipfel', 'wolkenhafen', 'wolkenpfad', 'astralis', 'nocthal', 'geisterbucht', 'nachtfels', 'tiefe']);
const MAPS2ish = M => W2MAPS.has(Object.keys(MAPS).find(k => MAPS[k] === M));
async function board(g, n) {
  const s = g.state, B = bounty(g), N = { name: n.name }, Sp = SPECIES[B.sp];
  if (B.claimed) return say(['Brix: Für heute ist das Brett leer. Morgen hänge ich einen neuen Steckbrief auf!'], N);
  if (!B.done) return say([`Brix: GESUCHT – ${Sp.name}! Typ: ${Sp.types.map(t => t[0].toUpperCase() + t.slice(1)).join('/')}.`, `Brix: Fang heute ein ${Sp.name} in dieser Welt und komm zurück. Die Belohnung ist fett!`], N);
  B.claimed = true; s.bountyCount = (s.bountyCount || 0) + 1;
  const special = ['wetterglas', 'faehrtenleser', 'logbuchlupe'][s.bountyCount - 1];
  const money = 2500 * (s.world || 1); s.money += money; sfx('caught');
  await say([`Brix: Du hast ein ${Sp.name} gefangen? Ausgezeichnete Arbeit, Kopfgeldjäger!`, `${s.name} erhält ${money} ◈!`], N);
  if (special) return HE.give(g, special);
  const it = ['sonderbonbon', 'sternkristall', 'toptrank', 'topbeleber', 'echomuschel'][s.bountyCount % 5]; return HE.give(g, it, 2);
}
export async function afterBattle(g, r) {
  const s = g.state; if (r?.result !== 'caught' || !r.caught) return;
  const B = s.bounty; if (B && !B.done && B.day === Math.floor(Date.now() / 864e5) && r.caught.sp === B.sp) { B.done = true; g.ow.notify(`Steckbrief erfüllt: ${SPECIES[B.sp].name}! Ab zum Kopfgeldbrett.`); }
}

// ---------------------------------------------------------------- Angel-Minispiel
class FishScene {
  constructor(res) { this.res = res; this.t = 0; this.bite = 1 + Math.random() * 2.2; this.win = 0.62; this.state = 'wait'; }
  update(dt) {
    this.t += dt; const a = input.pressed('a') || input.tap;
    if (this.state === 'wait') { if (a) return this.end(false, 'zu früh'); if (this.t >= this.bite) { this.state = 'bite'; this.t0 = this.t; sfx('encounter'); } }
    else if (this.state === 'bite') { if (a) return this.end(true); if (this.t - this.t0 > this.win) return this.end(false, 'zu spät'); }
  }
  end(ok, why) { if (this.done) return; this.done = true; pop(this); this.res({ ok, why }); }
  draw(ctx) {
    ctx.fillStyle = 'rgba(10,20,40,.45)'; ctx.fillRect(0, H - 56, W, 56);
    const bx = W / 2, by = H - 30 + (this.state === 'bite' ? Math.sin(this.t * 40) * 3 : Math.sin(this.t * 3) * 1.5);
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.moveTo(bx + 60, H - 60); ctx.lineTo(bx, by); ctx.stroke();
    ctx.fillStyle = '#f84a4a'; ctx.fillRect(bx - 3, by - 4, 6, 4); ctx.fillStyle = '#f8f8f8'; ctx.fillRect(bx - 3, by, 6, 3);
    for (let i = 0; i < 3; i++) { const r = ((this.t * 14 + i * 7) % 20); ctx.strokeStyle = `rgba(255,255,255,${0.4 - r / 50})`; ctx.beginPath(); ctx.ellipse(bx, by + 3, r, r * 0.3, 0, 0, 7); ctx.stroke(); }
    if (this.state === 'bite') { text('!', bx, by - 22, '#ffe040', 16, 'center', '#3a1a10', true); text('JETZT A!', bx, H - 52, '#ffffff', 8, 'center', '#000', true); }
    else text('Warte, bis es beißt …', bx, H - 52, '#d8e8ff', 7.5, 'center', '#000');
  }
}
export async function fishGame(g) {
  const s = g.state;
  if (!s.bag.angel) return say('Das Wasser ist glasklar. Mit einer Angel könnte man hier etwas fangen.');
  if (!s.team.some(m => !m.egg && m.hp > 0)) return say('Deine Kreaturen sind zu erschöpft.');
  await say('Du wirfst die Angel aus …');
  const r = await new Promise(res => push(new FishScene(res)));
  if (!r.ok) { if (Math.random() < 0.25) { s.bag.fisch = (s.bag.fisch || 0) + 1; return say(`${r.why === 'zu früh' ? 'Zu früh gezogen!' : 'Zu spät!'} Die Kreatur entwischt – aber ein Frischer Fisch bleibt am Haken hängen.`); } return say(r.why === 'zu früh' ? 'Zu früh gezogen! Es hat noch gar nichts angebissen.' : 'Zu spät! Es ist entwischt.'); }
  sfx('encounter'); await say('Volltreffer! Etwas Großes hängt am Haken!');
  await g.wildBattle(g.ow.M.fishEnc || 'wasser', g.ow.M.underwater ? 'wasser' : 'wasser');
}

// ---------------------------------------------------------------- Neue Werkzeuge im Beutel
export async function useItem(g, k) {
  const s = g.state, ow = g.ow;
  if (k === 'wetterglas') {
    if (!ow.M.outdoor) { await say('Unter freiem Himmel funktioniert das Wetterglas besser.'); return true; }
    const opts = [['Regen', 'rain'], ['Sonne', 'sun'], ['Nebel', 'fog'], ['Schnee', 'snow']];
    const i = await choose([...opts.map(o => o[0]), 'Zurück'], { title: 'WETTERGLAS' }); if (i === null || i >= opts.length) return true;
    s.wx = { w: opts[i][1], until: Date.now() + 10 * 60000 }; sfx('shiny'); await say(`Das Glas beschlägt … ${opts[i][0]} zieht auf! (10 Minuten)`); return true;
  }
  if (k === 'faehrtenleser') {
    if (!ow.M.enc || !ow.M.outdoor) { await say('Hier gibt es keine Spuren zu lesen.'); return true; }
    ow.trail = null; ow.spawnTrail(); if (ow.trail) { if (Math.random() < 0.35) ow.trail.kind = 'glitzer'; await say('Der Fährtenleser piept! Im hohen Gras ist eine frische Spur. Schleich dich an!'); g.fieldExit = true; } else await say('Kein hohes Gras in der Nähe.'); return true;
  }
  if (k === 'logbuchlupe') {
    const miss = Object.keys(HINTS).filter(n => !s.flags['log' + n]);
    await say(miss.length ? ['Die Lupe zeigt verschwommene Orte …', ...miss.slice(0, 6).map(n => `Seite ${n}: ${HINTS[n]}`)] : 'Du hast alle Seiten gefunden! Das Logbuch der Morgenstern ist vollständig.'); return true;
  }
  return false;
}

export async function talk(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  if (n.id.startsWith('kopfgeld_')) return board(g, n);
  switch (n.id) {
    case 'geisterfaehre':
      if (!g.isNight()) return say(['Der bleiche Fährmann starrt durch dich hindurch.', '„Komm wieder … wenn der Mond scheint.“'], N);
      if (!await ask('Den bleichen Fährmann zum Geisterschiff begleiten?')) return;
      await fade(1, 500); s.ret = { map: 'nebelklippe', x: 10, y: 15 }; g.ow.load('geisterschiff', 7, 11, 'up'); setMusic('night'); await fade(0, 600); return;
    case 'grimbart': {
      if (f.grimbart) return say('Geisterkapitän Grimbart: Fahr gut, Lebende. Wir segeln weiter – für immer.', N);
      if (!f.tr_geist1 || !f.tr_geist2) return say('Geisterkapitän Grimbart: Erst meine Mannschaft. Dann ich.', N);
      await say(['Geisterkapitän Grimbart: Hundert Jahre suche ich das Ende des Meeres. Und du hast es gefunden?', 'Geisterkapitän Grimbart: Dann zeig mir, was ein Lebender kann!'], N);
      const won = await g.trainerFight({ name: 'Geisterkapitän Grimbart', look: n.look, team: [['ankerfuerst', 56], ['totenrabe', 56], ['laternix', 57], ['phantomedusa', 58]], reward: 6000, lose: 'Endlich … endlich darf ich ruhen …', music: 'boss', bg: 'ruine' });
      if (!won) return;
      f.grimbart = true; await say('Geisterkapitän Grimbart: Nimm das. Ich trage es seit hundert Jahren mit mir.', N);
      await HE.addLog(g, 19); return HE.give(g, 'ankerkugel', 5);
    }
    default: return false;
  }
}
