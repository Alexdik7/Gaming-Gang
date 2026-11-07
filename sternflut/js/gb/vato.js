// Dr. Vato: Leiter des Labors in Muschelbucht, Erfinder des EP-Teilers. Prof. Kehl forscht dort als Gast.
import { MAPS, ITEMS } from './maps.js';
import { say, ask } from './gbui.js';
import { sfx } from '../core/audio.js';

export const LOOK_VATO = { skin: '#e2b088', hair: '#f2d26a', outfit: '#f4f4f4', pants: '#4a5466', accent: '#6fa8dc', pony: true, jaw: true };
export function init() {
  if (MAPS.lab) MAPS.lab.name = 'Labor von Dr. Vato';
  MAPS.lab?.npcs.push({ id: 'vato', x: 7, y: 2, dir: 'left', look: LOOK_VATO, name: 'Dr. Vato' });
  ITEMS.glanzamulett ||= { name: 'Glanzamulett', desc: 'Von Dr. Vato. Schillernde Kreaturen begegnen dir öfter.', key: true };
  if (ITEMS.epteiler) ITEMS.epteiler.desc = 'Eine Erfindung von Dr. Vato. Ist er an, bekommen alle Kreaturen im Team, die nicht gekämpft haben, die Hälfte der EP. Zum Ein- und Ausschalten auswählen.';
}
export const QUESTS = {}, LOGS = {}, GYMS = {};
export const CALLS = { vato: ['Dr. Vato: Hallo! Hier ist Vato, aus dem Labor in Muschelbucht.', 'Dr. Vato: Kleiner Tipp: Lass den EP-Teiler an, dann wächst dein ganzes Team mit.', 'Dr. Vato: Und wenn du die Liga geschafft hast, komm vorbei – ich will sehen, wie stark du geworden bist!'] };
export function contacts(s, c) { if (s.flags.vato1) c.push({ id: 'vato', name: 'Dr. Vato' }); }
export async function talk(g, n) {
  if (n.id !== 'vato') return false;
  const s = g.state, f = s.flags, N = { name: 'Dr. Vato' };
  if (!f.vato1) {
    f.vato1 = true;
    await say(['Dr. Vato: Oh, hallo! Willkommen in meinem Labor! Du musst das Enkelkind von Wella sein.', 'Dr. Vato: Ich bin Dr. Vato und leite dieses Labor. Prof. Kehl forscht hier als Gast – wir haben zusammen studiert.', 'Dr. Vato: Kehl kümmert sich um den Kompass, ich um die Kreaturen von Kalmara. Es gibt noch so viel zu entdecken!', 'Dr. Vato: Den EP-Teiler in deinem Beutel habe übrigens ich erfunden. Damit lernt dein ganzes Team mit.', 'Dr. Vato: Und hier, ein Willkommensgeschenk für deine Reise.'], N);
    s.bag.kristall = (s.bag.kristall || 0) + 5; s.bag.trank = (s.bag.trank || 0) + 3; sfx('caught');
    await say(`${s.name} erhält 5 Fangkugeln und 3 Heiltränke!`);
    return say('Dr. Vato: Ruf mich mit dem PAGER an, wenn du Fragen hast. Viel Glück!', N);
  }
  if (f.champion && !f.vatoKampf) {
    await say(['Dr. Vato: Der neue Champion! Ich wusste es.', 'Dr. Vato: Weißt du, ich war früher selbst Trainer. Lust auf einen Kampf unter Freunden?'], N);
    if (!await ask('Gegen Dr. Vato kämpfen?')) return say('Dr. Vato: Jederzeit, wenn du bereit bist!', N);
    const won = await g.trainerFight({ name: 'Dr. Vato', look: LOOK_VATO, team: [['kronwyrm', 66], ['juwelwyrm', 66], ['mirageon', 67], ['orkanadler', 67], ['ankerfuerst', 68], ['glutfalke', 70]], reward: 9000, lose: 'Dr. Vato: Großartig! Ich bin stolz, dich zu kennen.', noBlackout: true, music: 'boss', bg: 'arena' });
    if (!won) return say('Dr. Vato: Ha! Die alte Forscherhand hat es noch drauf. Versuch es nochmal!', N);
    f.vatoKampf = true; s.bag.glanzamulett ||= 1; sfx('caught');
    return say(['Dr. Vato: Hier, mein Glanzamulett. Damit begegnest du öfter schillernden Kreaturen.', `${s.name} erhält das GLANZAMULETT!`], N);
  }
  return say([['Dr. Vato: Mein Gast Prof. Kehl sitzt Tag und Nacht über dem Kompass deiner Mutter. Spannend …'], ['Dr. Vato: Wusstest du, dass Kreaturen im Doppelkampf gemeinsame KOMBOS beherrschen? Faszinierend!'], ['Dr. Vato: In meiner Heimat gibt es auch einen Professor-Pager. Na ja, so ähnlich.'], ['Dr. Vato: Fülle deine Chronik! Jede neue Kreatur hilft der Forschung.']][Math.floor(Math.random() * 4)], N);
}
