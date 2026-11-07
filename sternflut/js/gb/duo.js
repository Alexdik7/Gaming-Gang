// Doppelkämpfe gegen Trainer (nie gegen wilde Kreaturen) und der Duostein
import { say } from './gbui.js';
import { sfx } from '../core/audio.js';
import { doubleBattle, localDouble } from './double2d.js';
import { ITEMS } from './maps.js';

ITEMS.duostein = { name: 'Duostein', desc: 'Zwei Hälften, die immer zueinander finden. Im Doppelkampf: KOMBO – beide Kreaturen greifen einmal pro Kampf gemeinsam an.', key: true };

// Trainer, die immer zu zweit kämpfen (beide Kreaturen gleichzeitig)
export const DOUBLE = new Set(['tr_ben', 'tr_hexe', 'tr_hirtin', 'tr_medium', 'tr_gym4b', 'tr_feuer1', 'tr_berg', 'tr_orden13', 'tr_gym8b',
  'tr_ski', 'tr_pelz', 'tr_gym10b', 'tr_wolke', 'tr_medium2', 'tr_gym14b', 'tr_nyx2', 'tr_robo2']);

const BGMAP = { wald: 'gras', grund: 'ruine', all: 'liga', station: 'liga' };
export async function duoFight(game, t, foe) {
  const s = game.state;
  const b = localDouble(game, { f0: { pool: foe, owner: t.name, ai: true }, f1: { pool: foe, owner: t.name, ai: true } });
  const bg = BGMAP[t.bg] || t.bg || (game.ow.M.gym ? 'arena' : game.ow.M.cave ? 'hoehle' : 'gras');
  const r = await doubleBattle(game, { b, mine: ['p0', 'p1'], bg, music: t.music, title: t.name, intro: `${t.name} fordert dich zum DOPPELKAMPF heraus!`, trainer: t, trainers: [{ look: t.look }], ownLooks: [s.look] });
  await game.afterBattle(r, t.noBlackout);
  if (r.result === 'win' && !s.bag.duostein) {
    s.bag.duostein = 1; sfx('caught');
    await say([`${t.name}: Ihr zwei wart ein echtes Team! Hier, das hat mir mal ein Reisender geschenkt.`, `${s.name} erhält den DUOSTEIN!`, 'Im Doppelkampf erscheint jetzt KOMBO im Menü: Beide Kreaturen greifen einmal pro Kampf zusammen alle Gegner an.', 'Welche Kombo es wird, hängt von den Typen der beiden ab. Probier verschiedene Paare aus!']);
  }
  return r.result === 'win';
}
export const canDouble = s => s.team.filter(m => !m.egg && m.hp > 0).length >= 2;
