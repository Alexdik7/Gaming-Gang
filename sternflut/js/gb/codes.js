// Tauschen und Kämpfen mit Freunden per Code – ganz ohne Server (auch im Flugmodus, Code per WhatsApp/AirDrop).
// Tausch in zwei Schritten:
//   1. A erstellt ein Angebot (LUT1-…). Die Kreatur liegt so lange im Tausch-Fach (s.tradeOut).
//   2. B löst es ein, gibt eine eigene Kreatur und bekommt einen Antwort-Code. A löst die Antwort ein → fertig.
// Kampf: A erstellt einen Team-Code (LUK1-…). B kämpft gegen eine Kopie von A's Team (gesteuert vom Spiel).
import { say, ask, choose, party, inputName } from './gbui.js';
import { sfx } from '../core/audio.js';
import { SPECIES } from '../data/creatures.js';
import { monName, healMon, genderOf } from '../data/mon.js';
import { ensureSpecies } from '../data/breeding.js';

const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
async function pack(pre, obj) {
  const raw = new TextEncoder().encode(JSON.stringify(obj));
  if (typeof CompressionStream === 'undefined') return pre + '0-' + b64(raw);
  const z = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  return pre + '1-' + b64(z);
}
async function unpack(pre, code) {
  try {
    const t = String(code).replace(/\s+/g, ''), m = new RegExp('^' + pre + '([01])-(.+)$').exec(t); if (!m) return null;
    let u8 = unb64(m[2]);
    if (m[1] === '1') u8 = new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    return JSON.parse(new TextDecoder().decode(u8));
  } catch { return null; }
}
const G2 = m => ['', ' ♂', ' ♀'][genderOf(m)];
const label = m => `${monName(m)}${G2(m)} (Lv${m.lvl}${m.shiny ? ', schillernd' : ''}${m.alpha ? ', ALPHA' : ''})`;
const okMon = m => { if (!m?.sp || !Array.isArray(m.moves)) return false; try { ensureSpecies(m.sp); } catch { return false; } return !!SPECIES[m.sp]; };
const clean = m => { const c = JSON.parse(JSON.stringify(m)); delete c.slot; delete c._fainted; delete c.reso; return c; };

// Kreatur aus Team oder Box wählen (Box als Liste)
async function pickMon(g, prompt) {
  const s = g.state;
  const w = await choose(['Aus dem Team', 'Aus der Box', 'Zurück'], { title: prompt });
  if (w === 0) {
    const k = await party(s, { select: true, prompt, filter: m => !m.egg && s.team.filter(x => !x.egg && x.hp > 0 && x !== m).length > 0 });
    return k === null ? null : { m: s.team[k], from: 'team' };
  }
  if (w === 1) {
    const list = s.box.filter(m => !m.egg);
    if (!list.length) { await say('Deine Box ist leer.'); return null; }
    const k = await choose(list.slice(0, 60).map(m => ({ label: monName(m) + G2(m), right: 'Lv' + m.lvl })), { title: prompt });
    return k === null ? null : { m: list[k], from: 'box' };
  }
  return null;
}
function take(s, { m, from }) { const L = from === 'team' ? s.team : s.box; L.splice(L.indexOf(m), 1); }
async function receive(g, m) {
  const s = g.state; ensureSpecies(m.sp); healMon(m);
  g.markDex?.(m.sp, true);
  if (s.team.length < 6) s.team.push(m); else { s.box.push(m); await say(`${monName(m)} wurde in die Box geschickt.`); }
}
const share = (title, code) => inputName(title, code, 400000, { share: true });

export async function tradeMenu(g) {
  const s = g.state; s.tradeIn ||= {};
  for (;;) {
    const opts = [
      { label: s.tradeOut ? 'Angebot erneut zeigen' : 'Angebot erstellen', desc: 'Eine Kreatur anbieten und den Code an einen Freund schicken.' },
      { label: 'Code einlösen', desc: 'Ein Angebot oder eine Antwort von einem Freund einfügen.' },
      ...(s.tradeOut ? [{ label: 'Angebot zurückziehen', desc: `${monName(s.tradeOut.mon)} kommt zurück ins Team.` }] : []),
      'Zurück'];
    const i = await choose(opts, { title: 'TAUSCH PER CODE' });
    const k = opts[i]?.label || opts[i];
    if (i === null || k === 'Zurück') return;
    if (k === 'Angebot erstellen') {
      const p = await pickMon(g, 'Was bietest du an?'); if (!p) continue;
      if (!await ask(`${label(p.m)} anbieten? Bis der Tausch fertig ist, wartet es im Tausch-Fach.`)) continue;
      take(s, p); s.tradeOut = { id: Math.random().toString(36).slice(2, 10), mon: clean(p.m) }; g.save(true);
    }
    if (k === 'Angebot erstellen' || k === 'Angebot erneut zeigen') {
      const code = await pack('SFT', { k: 'offer', id: s.tradeOut.id, from: s.name, mon: s.tradeOut.mon });
      await say([`Dein Angebot: ${label(s.tradeOut.mon)}.`, 'Schick den Code an deinen Freund (Teilen → WhatsApp). Er wählt ONLINE → PER CODE → TAUSCH → Code einlösen.', 'Danach bekommst du von ihm einen Antwort-Code. Den löst du hier ein.']);
      await share('Tausch-Angebot', code);
    }
    if (k === 'Angebot zurückziehen') {
      if (!await ask(`Angebot zurückziehen? Achtung: Hat dein Freund es schon eingelöst, ist sein Tausch dann wertlos.`)) continue;
      await receive(g, s.tradeOut.mon); s.tradeOut = null; g.save(true); await say('Das Angebot wurde zurückgezogen.');
    }
    if (k === 'Code einlösen') {
      const code = await inputName('Tausch-Code einfügen', '', 400000); if (!code) continue;
      const d = await unpack('SFT', code);
      if (!d || !d.mon || !okMon(d.mon)) { sfx('weak'); await say('Dieser Code ist ungültig oder unvollständig.'); continue; }
      if (d.k === 'reply') {
        if (!s.tradeOut || s.tradeOut.id !== d.id) { await say('Diese Antwort passt zu keinem offenen Angebot (vielleicht schon eingelöst).'); continue; }
        sfx('evo'); await say([`${d.from} schickt dir ${label(d.mon)}!`, `Dein ${monName(s.tradeOut.mon)} ist jetzt bei ${d.from}. Pass gut darauf auf, ${d.from}!`]);
        d.mon.ot ||= d.from; await receive(g, d.mon); s.tradeOut = null; s.tradeIn[d.id] = true; g.save(true); sfx('caught');
        continue;
      }
      if (d.k !== 'offer') continue;
      if (s.tradeIn[d.id]) { await say('Dieses Angebot hast du schon eingelöst.'); continue; }
      if (s.tradeOut?.id === d.id) { await say('Das ist dein eigenes Angebot.'); continue; }
      await say(`${d.from} bietet dir ${label(d.mon)} an.`);
      const p = await pickMon(g, 'Was gibst du dafür?'); if (!p) continue;
      if (!await ask(`${label(p.m)} gegen ${label(d.mon)} tauschen?`)) continue;
      take(s, p); const mine = clean(p.m); mine.ot ||= s.name;
      d.mon.ot ||= d.from; await receive(g, d.mon); s.tradeIn[d.id] = true; g.save(true);
      sfx('evo'); await say([`Tausch geschafft! ${monName(d.mon)} gehört jetzt zu dir.`, `Jetzt schick ${d.from} den Antwort-Code, damit er ${monName(mine)} bekommt.`]);
      await share('Antwort für ' + d.from, await pack('SFT', { k: 'reply', id: d.id, from: s.name, mon: mine }));
    }
  }
}

export async function fightMenu(g) {
  const s = g.state;
  for (;;) {
    const i = await choose([{ label: 'Team-Code erstellen', desc: 'Dein Team als Code verschicken – dein Freund kämpft dann gegen dein Team.' }, { label: 'Gegen Code kämpfen', desc: 'Den Team-Code eines Freundes einfügen und gegen sein Team antreten.' }, 'Zurück'], { title: 'KAMPF PER CODE' });
    if (i === null || i === 2) return;
    if (i === 0) {
      const team = s.team.filter(m => !m.egg).map(clean);
      if (!team.length) { await say('Du hast keine Kreaturen im Team.'); continue; }
      const code = await pack('SFK', { k: 'team', name: s.name, look: s.look, badges: s.badges.filter(Boolean).length, team, at: Date.now() });
      await say(['Dein Team-Code ist fertig!', 'Schick ihn deinem Freund. Er wählt ONLINE → PER CODE → KAMPF → Gegen Code kämpfen.']);
      await share(`Team von ${s.name}`, code);
    }
    if (i === 1) {
      const code = await inputName('Team-Code einfügen', '', 400000); if (!code) continue;
      const d = await unpack('SFK', code);
      if (!d || d.k !== 'team' || !Array.isArray(d.team) || !d.team.length || !d.team.every(okMon)) { sfx('weak'); await say('Dieser Code ist ungültig oder unvollständig.'); continue; }
      await say([`${d.name} (${d.badges || 0} Orden) fordert dich heraus!`, d.team.map(m => label(m)).join(', ')]);
      if (!s.team.some(m => !m.egg && m.hp > 0)) { await say('Deine Kreaturen sind erschöpft!'); continue; }
      if (!await ask('Kampf starten? Danach wird dein Team geheilt – verlieren kostet nichts.')) continue;
      g.ow.busy = true;
      const won = await g.trainerFight({ name: `Freund ${d.name}`, look: d.look, mons: d.team, reward: 0, noBlackout: true, music: 'trainer2', bg: 'arena', lines: [], lose: 'Gut gekämpft!' });
      s.team.forEach(healMon);
      s.codeFights ||= {}; const r = (s.codeFights[d.name] ||= { win: 0, lose: 0 }); won ? r.win++ : r.lose++;
      await say([won ? `Du hast gegen ${d.name} gewonnen!` : `${d.name} war diesmal stärker …`, `Bilanz gegen ${d.name}: ${r.win} Siege, ${r.lose} Niederlagen.`]);
      g.save(true); g.ow.busy = false;
    }
  }
}
