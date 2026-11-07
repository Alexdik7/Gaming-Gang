// Nebenquest „Rette die Prinzessin Ari“ (Kronfels, Welt 1): Sturmpiraten entführen die Prinzessin in die Möwengrotte
import { fade, wait } from './engine.js';
import { MAPS, LOOK, ITEMS } from './maps.js';
import { say, ask } from './gbui.js';
import { sfx } from '../core/audio.js';
import { createMon, healMon } from '../data/mon.js';
import { mulberry } from '../core/noise.js';
import { DoubleBattle } from '../battle/double.js';
import { doubleBattle } from './double2d.js';
import { DOUBLE } from './duo.js';

const L = {
  ari: { skin: '#f8dcc8', hair: '#f88ab8', outfit: '#f8f0ff', pants: '#c86aa8', cap: '#f8d040', accent: '#f8d040', pony: true },
  gerold: { skin: '#e0b090', hair: '#8a8a98', outfit: '#3a5ab8', pants: '#2a2a3a', cap: '#c8c8d8', accent: '#f8d040', jaw: true },
  pirat: { skin: '#d8a070', hair: '#2a1a14', outfit: '#c83a3a', pants: '#2a2a3a', cap: '#2a2a3a', accent: '#f8f8f8' },
  pirat2: { skin: '#a06a44', hair: '#f8d070', outfit: '#3a3a4a', pants: '#5a3a2a', accent: '#c83a3a', pony: true },
  kraehe: { skin: '#e0b090', hair: '#1a1420', outfit: '#1a1420', pants: '#3a2a2a', cap: '#1a1420', accent: '#f8d040', jaw: true },
};
const tr = (id, x, y, dir, look, name, team, reward, line, lose, sight = 3) => ({ id, x, y, dir, look, name, showIf: 'ari_start', trainer: { team, reward, sight, lines: [line], lose } });

// Möwengrotte: Eingang unten, Zelle oben rechts hinter einem Gitter (Tor 'E', öffnet mit dem Kerkerschlüssel)
MAPS.moewengrotte = {
  name: 'Möwengrotte', cave: true, enc: 'wrack', bg: 'hoehle', darkRadius: 90,
  rows: [
    'WWWWWWWWWWWWWWWW',
    'WWcccccWWWWcccWW',
    'WWcccccWWWWcccWW',
    'WWccWccccWWWEWWW',
    'W~~ccWcccccccccW',
    'W~~cccccWWWccccW',
    'WW~~cWWccccccWWW',
    'WWccccWccWWcccWW',
    'WcccWWccccccccWW',
    'WcccWWcccWWWcccW',
    'WWcccccccWWcccWW',
    'WWWccccccccccWWW',
    'WWWWWccccccWWWWW',
    'WWWWWWWcWWWWWWWW',
  ],
  gates: { '12,3': 'ari_key' },
  warps: [{ x: 7, y: 13, to: 'kronfels', tx: 20, ty: 12, dir: 'left' }],
  npcs: [
    tr('tr_pirat1', 2, 9, 'right', L.pirat, 'Sturmpirat Ruck', [['bilgenratz', 50], ['seelenkrebs', 51], ['ankerling', 51]], 2600, 'Halt! Hier kommt keiner rein – Befehl vom Käpt’n!', 'Autsch … der Käpt’n wird toben.'),
    tr('tr_pirat2', 8, 8, 'down', L.pirat2, 'Piratenzwillinge Flick & Flack', [['klingenhai', 51], ['nebelquall', 51], ['orkanadler', 52], ['phantomedusa', 52]], 3400, 'Wir zwei gegen dich zwei! Den Schlüssel kriegst du nie!', 'Na gut, na gut … nimm das blöde Ding!'),
    tr('tr_pirat3', 12, 5, 'left', L.pirat, 'Sturmpirat Hook', [['sturmross', 52], ['totenrabe', 53]], 3000, 'Die Prinzessin bringt uns ein Vermögen! Verschwinde!', 'Ich hätte Fischer werden sollen …', 4),
    { id: 'ari_zelle', x: 12, y: 1, dir: 'down', look: L.ari, name: 'Prinzessin Ari', showIf: 'ari_start', hideIf: 'ari_done' },
  ],
};
DOUBLE.add('tr_pirat2');

let HE;
export function init(h) {
  HE = h;
  ITEMS.kerkerschluessel = { name: 'Kerkerschlüssel', desc: 'Ein rostiger Schlüssel der Sturmpiraten. Er öffnet das Gitter in der Möwengrotte.', key: true };
  const K = MAPS.kronfels;
  if (K) {
    K.rows = K.rows.map((r, y) => (y === 12 ? r.slice(0, 21) + 'O' : r));
    (K.warps ||= []).push({ x: 21, y: 12, to: 'moewengrotte', tx: 7, ty: 12, dir: 'up' });
    K.npcs.push({ id: 'gerold', x: 18, y: 13, dir: 'left', look: L.gerold, name: 'Hauptmann Gerold' });
    K.npcs.push({ id: 'ari_wache', x: 20, y: 12, dir: 'left', look: LOOK.fischer, name: 'Fischer Jonte', hideIf: 'ari_start' });
    K.npcs.push({ id: 'ari_kf', x: 17, y: 13, dir: 'right', look: L.ari, name: 'Prinzessin Ari', showIf: 'ari_done' });
  }
}
export const QUESTS = {}, LOGS = {}, GYMS = {};
export function sideTasks(s) {
  const f = s.flags; if (!f.ari_start) return [];
  const d = f.ari_done ? 'Erledigt! Ari wartet in Kronfels.' : f.ari_key ? 'Du hast den Kerkerschlüssel. Öffne das Gitter in der Möwengrotte!' : 'Die Sturmpiraten halten Ari in der Möwengrotte (Osten von Kronfels) gefangen.';
  return [{ t: 'Rette die Prinzessin Ari', d, done: !!f.ari_done }];
}
export async function afterTrainer(g) {
  const s = g.state;
  if (s.flags.tr_pirat2 && !s.bag.kerkerschluessel && !s.flags.ari_key) {
    s.bag.kerkerschluessel = 1; s.flags.ari_key = true; sfx('caught');
    await say(['Flick wirft dir einen rostigen Schlüssel zu.', 'Du erhältst den KERKERSCHLÜSSEL!', 'Das Gitter im Norden der Grotte ist jetzt offen.']);
  }
}
export async function talk(g, n) {
  const s = g.state, f = s.flags, N = { name: n.name };
  switch (n.id) {
    case 'gerold':
      if (f.ari_done) return say(['Hauptmann Gerold: Kronfels steht für immer in deiner Schuld.', 'Hauptmann Gerold: Und die Prinzessin redet von nichts anderem als von dir.'], N);
      if (f.ari_start) return say('Hauptmann Gerold: Die Möwengrotte liegt am Ostrand der Insel. Bitte – bring Ari zurück!', N);
      await say(['Hauptmann Gerold: Du! Du bist doch der Trainer, von dem alle reden!', 'Hauptmann Gerold: Ein Unglück! Die Sturmpiraten haben Prinzessin Ari entführt. Heute Morgen, direkt vom Steg!', 'Hauptmann Gerold: Sie verstecken sich in der Möwengrotte im Osten. Meine Wachen kommen gegen ihre Kreaturen nicht an.'], N);
      if (!await ask('Hilfst du, Prinzessin Ari zu retten?')) return say('Hauptmann Gerold: … Ich verstehe. Falls du es dir anders überlegst – ich bin hier.', N);
      f.ari_start = true; sfx('caught');
      g.ow.npcs = g.ow.npcs.filter(x => x.id !== 'ari_wache');
      return say(['Hauptmann Gerold: Danke! Der Eingang ist gleich hinter mir, im Osten.', 'Hauptmann Gerold: Vorsicht – Käpt’n Krähe kämpft unfair. Er hat immer jemanden dabei.', '(Neue Aufgabe im PAGER: Rette die Prinzessin Ari)'], N);
    case 'ari_wache': return say(['Fischer Jonte: Da hinten in der Grotte hausen Piraten. Ich würde da nicht reingehen.', 'Fischer Jonte: Hauptmann Gerold sucht übrigens verzweifelt nach Hilfe.'], N);
    case 'ari_kf': return say(['Prinzessin Ari: Weißt du, was das Beste am Gerettetwerden war?', 'Prinzessin Ari: Dass ich selbst mitkämpfen durfte! Nächstes Mal rette ich dich.'], N);
    case 'ari_zelle':
      if (!f.ari_key) return say(['Prinzessin Ari: Hallo? Ist da jemand? Ich bin hier hinter dem Gitter!', 'Prinzessin Ari: Der Schlüssel – die Zwillinge haben ihn! Bitte hol mich hier raus!'], N);
      return rescue(g, n);
  }
  return false;
}
async function rescue(g, n) {
  const s = g.state, ow = g.ow, p = ow.p, A = { name: 'Prinzessin Ari' };
  await say(['Prinzessin Ari: Du hast es geschafft! Endlich!', 'Prinzessin Ari: Ich bin Ari. Und ich bin keine Prinzessin, die nur wartet.', 'Prinzessin Ari: Die Piraten haben meine Kreaturen in die Kiste da gesperrt. Moment … ha, offen!'], A);
  sfx('heal'); await wait(300);
  ow.busy = true;
  const k = g.spawn('kraehe', 'Käpt’n Krähe', L.kraehe, 12, 4, 'up'); ow.emote = { n: k, t: 0.8 }; sfx('encounter');
  await g.cutIn?.(k);
  const gi = g.spawn('gischt', 'Bootsfrau Gischt', L.pirat2, 13, 4, 'up');
  await say(['Käpt’n Krähe: Na, na, na. Wer stiehlt mir denn da meinen Schatz?', 'Käpt’n Krähe: Für die Prinzessin zahlt die Königin Gold, so viel ihr Schiff tragen kann!', 'Bootsfrau Gischt: Zu zweit gegen zwei Kinder? Das wird ein Spaß, Käpt’n!'], { name: 'Käpt’n Krähe' });
  await say('Prinzessin Ari: Zwei Kinder, die zusammen kämpfen. Das wird kein Spaß – für euch!', A);
  if (!s.team.some(m => !m.egg && m.hp > 0)) { ow.npcs = ow.npcs.filter(x => !['kraehe', 'gischt'].includes(x.id)); ow.busy = false; return; }
  const rnd = mulberry(1312), mk = t => t.map(([sp, l]) => createMon(sp, l, rnd));
  const b = new DoubleBattle({ slots: {
    p0: { pool: s.team, owner: s.name },
    p1: { pool: mk([['mirageon', 53], ['juwelwyrm', 54], ['laternix', 54]]), owner: 'Ari', ai: true },
    f0: { pool: mk([['totenrabe', 54], ['klingenhai', 55], ['ankerfuerst', 57]]), owner: 'Krähe', ai: true },
    f1: { pool: mk([['bilgenratz', 53], ['glutfalke', 54], ['phantomedusa', 55]]), owner: 'Gischt', ai: true },
  } });
  sfx('encounter'); await g.flashIn();
  const r = await doubleBattle(g, { b, mine: ['p0'], bg: 'hoehle', music: 'boss', title: 'Krähe & Gischt', trainers: [{ look: L.kraehe }, { look: L.pirat2 }], ownLooks: [s.look, L.ari] });
  if (r.result !== 'win') {
    ow.npcs = ow.npcs.filter(x => !['kraehe', 'gischt'].includes(x.id));
    await g.afterBattle(r);
    return;
  }
  await g.afterBattle(r); ow.busy = true;
  s.money += 7000; await say('Du erhältst 7000 ◈ Preisgeld!');
  await say(['Käpt’n Krähe: Geschlagen … von einem Kind und einer Prinzessin!', 'Käpt’n Krähe: Rückzug! Alle Mann zum Schiff!'], { name: 'Käpt’n Krähe' });
  await fade(1, 300); ow.npcs = ow.npcs.filter(x => !['kraehe', 'gischt'].includes(x.id)); await fade(0, 300);
  await say(['Prinzessin Ari: Wir waren großartig! Komm, wir gehen nach Hause.'], A);
  await fade(1, 500);
  s.flags.ari_done = true; delete s.bag.kerkerschluessel;
  ow.load('kronfels', 16, 13, 'right'); ow.music?.();
  await fade(0, 500); ow.busy = true;
  await say(['Hauptmann Gerold: PRINZESSIN! Ihr seid zurück!', 'Prinzessin Ari: Dank meines neuen Freundes. Gerold, wir brauchen die Schatzkammer.', 'Hauptmann Gerold: Sofort, Hoheit!'], { name: 'Kronfels' });
  s.bag.ball52 = (s.bag.ball52 || 0) + 1; s.bag.sonderbonbon = (s.bag.sonderbonbon || 0) + 3; s.team.forEach(healMon); sfx('caught');
  await say(['Prinzessin Ari: Das ist der 52-Ball aus der Schatzkammer von Kronfels. Er fängt jede Kreatur – garantiert.', `${s.name} erhält den 52-BALL und 3 SONDERBONBONS!`, 'Prinzessin Ari: Und deine Kreaturen habe ich auch gleich geheilt. Danke, dass du gekommen bist.', '(Aufgabe erledigt: Rette die Prinzessin Ari)'], A);
  ow.busy = false; g.save(true);
}
