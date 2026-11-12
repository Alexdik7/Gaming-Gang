// LEGENDS UNITED – Handheld-Edition: Spielablauf, Story, Brutstätte, Speichern
import { G, W, H, COL, push, pop, input, text, box, cursor, wait, fade, wipe, iris, initEngine, bindPad, frame, wrap } from './engine.js';
import { MAPS, LOOK, ENC, SHOP, ITEMS } from './maps.js';
import { Overworld } from './overworld.js';
import { battle } from './battle2d.js';
import { say, ask, choose, party, summary, dex, card, inputName, hatchScene, settings, typeTag, dexEntry, healAnim, evoScene } from './gbui.js';
import { drawChar, itemIcon } from './pixel.js';
import { monSprite, trainerSprite } from './sprites.js';
import { SPECIES, STARTERS } from '../data/creatures.js';
import '../data/creatures2.js';
import { createMon, healMon, maxHp, monName, giveXp, xpForLevel, evolve } from '../data/mon.js';
import { MOVES } from '../data/moves.js';
import { itemFilter } from './battle2d.js';
import { ensureSpecies, stepBreeding, hatch, canBreed, compatibility } from '../data/breeding.js';
import { genderOf } from '../data/mon.js';
import { initAudio, sfx, cry, setMusic, setAudio, audioState } from '../core/audio.js';
import { mulberry } from '../core/noise.js';
import { pagerScreen } from './pager.js';
import * as TR from './travel.js';
import { doubleBattle, localDouble } from './double2d.js';
import { COOP, foeSlots, helperSlots } from '../data/coop.js';
import { DoubleBattle } from '../battle/double.js';
import * as DUO from './duo.js';
import * as ST from './story.js';
import { tradeMenu, fightMenu } from './codes.js';
const HUETER = [];
import { boxScreen } from './boxui.js';
import { baseMap, DECOR, placeDecor, encodeBase, decodeBase, decorAt } from './base.js';

const SAVE = 'sf-save', OPT = 'sf-opt', DAY = 24 * 60;
// Sicherungs-Code: Spielstand gzip-komprimiert als Text (LUS1-…), ohne Kompression LUS0-…
const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
async function packSave(state) {
  const raw = new TextEncoder().encode(JSON.stringify(state));
  if (typeof CompressionStream === 'undefined') return 'LUS0-' + b64(raw);
  const z = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  return 'LUS1-' + b64(z);
}
async function unpackSave(code) {
  try {
    const t = String(code).replace(/\s+/g, ''), m = /^LUS([01])-(.+)$/.exec(t); if (!m) return null;
    let u8 = unb64(m[2]);
    if (m[1] === '1') u8 = new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    const s = JSON.parse(new TextDecoder().decode(u8));
    return s && s.name && Array.isArray(s.team) && s.map ? s : null;
  } catch { return null; }
}
const { QUESTS, LIGA, GYMS } = ST;
const RAID3 = [];
const LOOKS = {
  skin: ['#f6d2b8', '#e8b892', '#c98e62', '#a06a44', '#6e4a30'],
  hair: ['#2a1d16', '#6b3f22', '#d9a441', '#e8e2d6', '#c4462e', '#3d5bd9', '#9b5de5', '#2e8b57'],
  outfit: ['#e84a5f', '#3d8bfd', '#2ec27e', '#f6b73c', '#8e5cf7', '#2b2d42', '#ff8ab0', '#f4f4f4'],
  pants: ['#384868', '#2b2d42', '#6a4a2a', '#5a6a7a', '#2e6b4a', '#7a2a3a'],
  cap: [null, '#e84a5f', '#2b2d42', '#3d8bfd', '#f4f4f4', '#2ec27e', '#f6b73c'],
};
const safe = s => { try { return JSON.parse(s); } catch { return null; } };

class Game {
  constructor() {
    const o = safe(localStorage.getItem(OPT)) || {};
    settings.textSpeed = o.textSpeed ?? 2; setAudio('music', o.music ?? true); setAudio('sfx', o.sfx ?? true);
    this.state = null; this.ow = new Overworld(this); this.online = { backup() {}, autoJoin() {}, pos() {}, actors: () => [], playerAt: () => null, interact() {}, idle: () => false, on: () => false, partners: () => [], menu: async () => {} };
  }
  saveOpt() { try { localStorage.setItem(OPT, JSON.stringify({ textSpeed: settings.textSpeed, music: audioState.music, sfx: audioState.sfx })); } catch {} }

  // ---------------------------------------------------------- Zeit
  hour() { return ((this.state?.time ?? DAY / 3) / DAY * 24) % 24; }
  isNight() { if (this.ow?.M?.night && this.started) return true; const h = this.hour(); return h >= 20 || h < 6; }
  dusk() { const h = this.hour(); return h >= 17 && h < 20 ? (h - 17) / 3 : h >= 6 && h < 7.5 ? 1 - (h - 6) / 1.5 : 0; }
  worldFlags() { return this.state?.flags || {}; }

  // ---------------------------------------------------------- Speichern
  newState(name, look) {
    return {
      v: 2, name, look, map: 'home', x: 2, y: 3, dir: 'down', team: [], box: [], money: 1000,
      bag: { trank: 2, epteiler: 1 }, dex: { seen: {}, caught: {} }, flags: {}, badges: [], time: DAY * 8 / 24, playtime: 0, steps: 0,
      daycare: { mons: [], steps: 0, egg: null }, healPoint: { map: 'home', x: 2, y: 3 },
    };
  }
  save(quiet) {
    const s = this.state; if (!s) return;
    if (this.ow.p) { s.map = this.ow.id; s.x = this.ow.p.x; s.y = this.ow.p.y; s.dir = this.ow.p.dir; }
    try { localStorage.setItem(SAVE, JSON.stringify(s)); if (!quiet) sfx('lvl'); } catch {}
    this.online?.backup();
  }
  load() {
    const s = safe(localStorage.getItem(SAVE)); if (!s) return null;
    for (const m of [...s.team, ...s.box, ...(s.daycare?.mons || []), ...(s.daycare?.egg ? [s.daycare.egg] : [])]) ensureSpecies(m.sp);
    for (const id of Object.keys(s.dex.caught)) ensureSpecies(id);
    return s;
  }
  markDex(sp, caught) { const s = this.state; ensureSpecies(sp); s.dex.seen[sp] = 1; if (caught) s.dex.caught[sp] = 1; }

  // ---------------------------------------------------------- Start
  async start() {
    initEngine(document.getElementById('screen'));
    bindPad(document.getElementById('pad'));
    let last = performance.now();
    const loop = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (this.state && this.started) { this.state.time += dt; this.state.playtime += dt; }
      frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    await Promise.all(['8px "Pixelify Sans"', '400 8px "Atkinson Hyperlegible"', '700 8px "Atkinson Hyperlegible"'].map(f => document.fonts?.load(f).catch(() => {})));
    this.title();
  }

  async title() {
    setMusic('title');
    const T = new TitleScene(this); push(T);
    const r = await T.done;
    initAudio(); sfx('open'); setMusic(null); setMusic('title');
    const has = !!localStorage.getItem(SAVE);
    const items = [...(has ? ['WEITER'] : []), 'NEUES SPIEL', 'CODE LADEN', 'OPTIONEN'];
    for (;;) {
      const i = await choose(items, { x: 70, y: 96, w: 100, cancel: false });
      const k = items[i];
      if (k === 'WEITER') { pop(T); this.state = this.load(); return this.enterWorld(); }
      if (k === 'NEUES SPIEL') { if (has && !(await ask('Dein alter Spielstand wird beim Speichern überschrieben. Trotzdem neu beginnen?'))) continue; pop(T); return this.intro(); }
      if (k === 'OPTIONEN') await this.options();
      if (k === 'CODE LADEN' && await this.importSave()) { pop(T); this.state = this.load(); return this.enterWorld(); }
    }
  }
  // Sicherungs-Code erstellen und teilen
  async exportSave() {
    this.save(true);
    const code = await packSave(this.state);
    await say(['Dein Sicherungs-Code ist fertig!', 'Tippe auf „Teilen“ und schick ihn dir selbst, z. B. per WhatsApp oder in die Notizen. Mit „CODE LADEN“ im Titelbild holst du deinen Spielstand auf jedes Handy zurück.']);
    await inputName(`Sicherung (${this.state.team.length} im Team, ${this.state.badges.filter(Boolean).length} Orden)`, code, 400000, { share: true });
  }
  async importSave() {
    const code = await inputName('Sicherungs-Code einfügen', '', 400000); if (!code) return false;
    const s = await unpackSave(code);
    if (!s) { sfx('weak'); await say('Dieser Code ist ungültig oder unvollständig. Bitte den ganzen Code kopieren.'); return false; }
    if (!(await ask(`Spielstand von ${s.name} laden (${s.team.length} im Team, ${(s.badges || []).filter(Boolean).length} Orden)? Ein Spielstand auf diesem Gerät wird ersetzt.`))) return false;
    try { localStorage.setItem(SAVE, JSON.stringify(s)); } catch { await say('Speichern auf diesem Gerät ist fehlgeschlagen.'); return false; }
    sfx('caught'); await say(`Willkommen zurück, ${s.name}!`); return true;
  }

  async intro() {
    const I = new IntroScene(this); push(I);
    setMusic('title'); await fade(0, 600);
    for (const line of ST.PROLOG) { I.line = line; I.k = (I.k || 0) + 1; await say(line); }
    await fade(1, 500); pop(I);
    const st = await this.editor();
    this.state = this.newState(st.name, st.look);
    const I2 = new IntroScene(this); I2.look = st.look; I2.k = 9; push(I2);
    await fade(0, 300);
    await say([`${st.name} – Enkelkind von Wella, Kind von Liv Sund.`, 'Heute ist dein vierzehnter Geburtstag. Und heute beginnt deine Reise.']);
    await fade(1, 600); pop(I2);
    this.enterWorld(true);
  }

  editor(preset) {
    return new Promise(res => { const E = new EditorScene(this, preset, v => { pop(E); res(v); }); push(E); fade(0, 300); });
  }

  async enterWorld(fresh) {
    const s = this.state;
    s.bag ||= {}; s.bag.epteiler ||= 1; // EP-Teiler gibt es von Anfang an
    s.flags ||= {}; s.daycare ||= { mons: [], steps: 0, egg: null }; s.badges ||= [];
    for (const [id, G] of Object.entries(GYMS)) if (s.badges[G.badge]) { s.flags['orden_' + id] = true; const AM = Object.values(MAPS).find(M => M.gym && M.npcs?.some(n => n.id === id)); for (const f of Object.values(AM?.gates || {})) s.flags[f] = true; } // alte Spielstände: Arena-Siege nachtragen, Rätsel-Tore offen
    if (s.base) MAPS.basis = baseMap(s.base.theme, `${s.name}s Geheimbasis`, s.base.items);
    if (s.map === 'gast' || (s.map === 'basis' && !s.base)) { const r = s.ret || { map: 'muschelbucht', x: 4, y: 9 }; s.map = r.map; s.x = r.x; s.y = r.y; }
    this.ow.load(s.map, s.x, s.y, s.dir);
    push(this.ow); this.started = true;
    await fade(0, 400);
    this.online.autoJoin();
    if (fresh) { this.ow.busy = true; await ST.firstMorning(this); this.ow.busy = false; this.save(true); }
  }

  // ---------------------------------------------------------- Menüs
  async startMenu() {
    const s = this.state, ow = this.ow; ow.busy = true;
    const items = [...(s.bag.pager ? ['PAGER'] : []), ...(s.flags.dex ? ['CHRONIK'] : []), ...(s.team.length ? ['TEAM'] : []), 'BEUTEL', ...(s.bag.sattel ? [ow.p.ride ? 'ABSTEIGEN' : 'REITEN'] : []), ...(s.bag.zelt ? ['LAGER'] : []), ...(s.bag.telefon ? ['TELEFON'] : []), s.name.toUpperCase(), 'PER CODE', 'SPEICHERN', 'OPTIONEN', 'ZURÜCK'];
    const D = { REITEN: 'Auf einer großen Kreatur aus deinem Team reiten – viel schneller über Land.', ABSTEIGEN: 'Vom Reittier absteigen.', LAGER: 'Ein Lager aufschlagen: rasten, kochen und mit dem Team spielen.', PAGER: 'Zeigt dein nächstes Ziel, Aufgaben, das Logbuch der Morgenstern und das Lied der Gezeiten.', TELEFON: 'Freunde und Helfer anrufen.', 'PER CODE': 'Mit Freunden per Code tauschen oder gegen ihr Team kämpfen – ohne Internet-Server.', CHRONIK: 'Ein Verzeichnis aller Kreaturen, die du gesehen oder gebunden hast.', TEAM: 'Zeigt dein Team, Werte und Attacken. Hier kannst du auch die Reihenfolge ändern.', BEUTEL: 'Gegenstände, Bälle und Basis-Items, die du gesammelt hast.', ONLINE: 'Mit Freunden kämpfen, tauschen, gemeinsam spielen und Raids bestreiten.', SPEICHERN: 'Fortschritt speichern oder als Sicherungs-Code teilen.', OPTIONEN: 'Textgeschwindigkeit, Musik und Ton einstellen.', 'ZURÜCK': 'Das Menü schließen und weiterspielen.' };
    const opts = items.map(k => ({ label: k, desc: D[k] || 'Dein Trainerpass mit Orden, Geld und Spielzeit.' }));
    for (;;) {
      const i = await choose(opts, { above: false, x: W - 86, w: 83 });
      const k = items[i];
      if (i === null || k === 'ZURÜCK') break;
      if (k === 'CHRONIK') await dex(s);
      if (k === 'TEAM') { const po = { field: m => this.fieldOptions(m) }; await party(s, po); if (po.picked) { this.fieldExit = false; await po.picked.run(); if (this.fieldExit) { this.fieldExit = false; break; } } }
      if (k === 'BEUTEL') { await this.bagMenu(); if (this.fieldExit) { this.fieldExit = false; break; } }
      if (k === s.name.toUpperCase()) await card(s);
      if (k === 'SPEICHERN') { const c = await choose([{ label: 'Speichern', desc: 'Fortschritt auf diesem Gerät speichern.' }, { label: 'Sicherungs-Code', desc: 'Spielstand als Code teilen – so geht nie etwas verloren, auch bei einem neuen Handy.' }, 'Zurück']); if (c === 0) { this.save(); await say(`${s.name} hat das Spiel gespeichert.`); } else if (c === 1) await this.exportSave(); }
      if (k === 'OPTIONEN') await this.options();
      if (k === 'PAGER') await pagerScreen(this);
      if (k === 'REITEN' || k === 'ABSTEIGEN') { await TR.toggleRide(this); s.ride = ow.p.ride; break; }
      if (k === 'LAGER') { await TR.camp(this); break; }
      if (k === 'TELEFON') { const c = ST.contacts(s); const j = await choose([...c.map(x => ({ label: x.name, desc: 'Anrufen' })), 'Zurück'], { title: 'MUSCHELFON' }); if (j !== null && j < c.length) await ST.call(this, c[j].id); }
      if (k === 'PER CODE') { const j = await choose([{ label: 'Tauschen', desc: 'Kreaturen mit Freunden per Code tauschen.' }, { label: 'Kämpfen', desc: 'Gegen das Team eines Freundes kämpfen.' }, 'Zurück'], { title: 'PER CODE' }); if (j === 0) await tradeMenu(this); if (j === 1) await fightMenu(this); }
    }
    ow.busy = false;
  }
  async quickTeam() { if (!this.state.team.length) return; this.ow.busy = true; const po = { field: m => this.fieldOptions(m) }; await party(this.state, po); if (po.picked) { this.fieldExit = false; await po.picked.run(); this.fieldExit = false; } this.ow.busy = false; }
  async bagMenu() {
    const shadeHex = c => c + '55';
    const s = this.state;
    for (;;) {
      const all = Object.keys(ITEMS).filter(k => s.bag[k]);
      if (!all.length) return say('Der Beutel ist leer.');
      // Taschen wie im Original: mit ← → wechseln
      const POCK = [['ITEMS', k => !ITEMS[k].ball && !ITEMS[k].tm && !ITEMS[k].key && !/beere/.test(k), '#e8a040'], ['BÄLLE', k => ITEMS[k].ball, '#5ab0e8'], ['A-KRISTALLE', k => ITEMS[k].tm, '#b070e0'], ['BEEREN', k => /beere/.test(k) && !ITEMS[k].key, '#e85a6a'], ['BASIS-ITEMS', k => ITEMS[k].key && !ITEMS[k].tm, '#58b868']];
      this.pocket = this.pocket || 0;
      const [pn, pf, pc] = POCK[this.pocket], keys = all.filter(pf);
      const side = (ctx, ci) => { // Beutel-Grafik links, darunter das gewählte Item
        ctx.fillStyle = '#f0e8d0'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#e2d8bc'; for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2); ctx.fillStyle = shadeHex(pc); ctx.fillRect(0, 0, 76, 113);
        const bx = 14, by = 10; ctx.fillStyle = '#28202c'; ctx.fillRect(bx - 1, by - 1, 50, 50); ctx.fillStyle = pc; ctx.fillRect(bx, by, 48, 48);
        ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(bx + 2, by + 2, 44, 6); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(bx, by + 30, 48, 18);
        ctx.fillStyle = '#28202c'; ctx.fillRect(bx + 16, by - 9, 16, 3); ctx.fillRect(bx + 14, by - 7, 3, 7); ctx.fillRect(bx + 31, by - 7, 3, 7); ctx.fillStyle = '#f8d870'; ctx.fillRect(bx + 20, by + 18, 8, 6);
        text(pn, 38, 61, COL.ink, 7, 'center', COL.shadow, true);
        const ik = keys[ci]; if (ik) { ctx.fillStyle = '#28202c'; ctx.fillRect(21, 70, 34, 23); ctx.fillStyle = '#fbf8ee'; ctx.fillRect(22, 71, 32, 21); ctx.drawImage(itemIcon(ik, ITEMS[ik]), 0, 0, 16, 16, 30, 73, 16, 16); }
        POCK.forEach((_, q) => { ctx.fillStyle = q === this.pocket ? '#e84a5f' : '#a8a090'; ctx.fillRect(18 + q * 9, 96, 6, 4); });
        text('◀  ▶', 38, 102, COL.inkSoft, 6.5, 'center');
      };
      const opts = keys.length ? keys.map(k => ({ label: ITEMS[k].name, right: ITEMS[k].key ? (k === 'epteiler' ? (s.flags.epOff ? 'AUS' : 'AN') : '') : '×' + s.bag[k], desc: ITEMS[k].desc })) : [{ label: '(leer)', desc: 'In dieser Tasche ist noch nichts.', disabled: true }];
      const i = await choose([...opts, { label: 'Zurück', desc: 'Den Beutel schließen.' }], { title: '◀ ' + pn + ' ▶', above: false, x: 78, w: 159, tabs: true, side, max: 7 });
      if (i === 'L' || i === 'R') { this.pocket = (this.pocket + (i === 'L' ? POCK.length - 1 : 1)) % POCK.length; continue; }
      if (i === null || i === opts.length || !keys.length) return;
      const k = keys[i], it = ITEMS[k];
      if (k === 'epteiler') { s.flags.epOff = !s.flags.epOff; sfx('click'); await say(s.flags.epOff ? 'Der EP-Teiler ist jetzt AUS. Nur Kreaturen, die kämpfen, bekommen EP.' : 'Der EP-Teiler ist jetzt AN. Das ganze Team bekommt EP!'); continue; }
      if (it.candy) { await this.useCandy(k); continue; }
      if (await ST.useItem(this, k)) { if (this.fieldExit) return; continue; }
      if (k === 'lockfutter') { s.bag[k]--; s.lure = 200; sfx('heal'); await say('Du streust Lockfutter aus. 200 Schritte lang tauchen im hohen Gras doppelt so viele Kreaturen auf!'); continue; }
      if (k === 'echomuschel') { const L = this.lastWild; if (!L || !ENC[L.enc]) { await say('Die Muschel rauscht leise. Erst nach einer Begegnung mit einer wilden Kreatur kann sie ein Echo rufen.'); continue; } s.bag[k]--; sfx('dex'); await say(`Du hältst die Echomuschel ans Ohr … Ein ${SPECIES[L.sp].name} antwortet!`); this.fieldExit = true; await this.wildBattle(L.enc, L.bg, this.shinyRoll(createMon(L.sp, L.lvl))); return; }
      if (!(it.heal || it.cure || it.revive || it.tm)) { await say(it.desc); continue; }
      if (it.heal || it.cure || it.revive) {
        const t = await party(s, { select: true, prompt: it.revive ? 'Wen beleben?' : it.cure ? 'Wen kurieren?' : 'Wen heilen?', filter: itemFilter(it) });
        if (t === null) continue;
        const m = s.team[t]; s.bag[k]--; sfx('heal');
        if (it.cure) { m.status = null; await say(`${monName(m)} ist wieder ganz gesund.`); }
        else if (it.revive) { m.hp = Math.floor(maxHp(m) * it.revive); await say(`${monName(m)} ist wieder kampfbereit!`); }
        else { const a = Math.min(it.heal, maxHp(m) - m.hp); m.hp += a; await say(`${monName(m)} wurde um ${a} KP geheilt.`); }
      }
      if (it.tm) await this.useTm(k, it);
    }
  }
  // Sonderbonbon: +1 Level mit neuen Attacken und Entwicklung
  async useCandy(k) {
    const s = this.state;
    const t = await party(s, { select: true, prompt: 'Wem das Sonderbonbon geben?', filter: m => !m.egg && m.lvl < 100 });
    if (t === null) return;
    const m = s.team[t]; s.bag[k]--; sfx('lvl');
    const res = giveXp(m, xpForLevel(m.lvl + 1) - m.xp);
    await say(`${monName(m)} erreicht Level ${m.lvl}!`);
    for (const r of res) if (r.t === 'learn') {
      const M = MOVES[r.id];
      if (m.moves.length < 4) { m.moves.push({ id: r.id, pp: M.pp }); await say(`${monName(m)} hat ${M.name} erlernt!`); continue; }
      if (!await ask(`${monName(m)} möchte ${M.name} lernen. Eine Attacke vergessen?`)) continue;
      const i = await choose([...m.moves.map(x => MOVES[x.id].name), 'Nicht lernen'], { title: 'Vergessen:' });
      if (i === null || i === 4) continue;
      m.moves[i] = { id: r.id, pp: M.pp }; await say(`${monName(m)} hat ${M.name} erlernt!`);
    }
    const ev = res.find(r => r.t === 'evo');
    if (ev) {
      const old = monName(m); sfx('evo');
      await evoScene(monSprite(m.sp, 'front', m.shiny, m.mut), monSprite(ev.to, 'front', m.shiny, m.mut), `${old} hat sich zu ${SPECIES[ev.to].name} entwickelt!`);
      evolve(m, ev.to); cry(SPECIES[ev.to].cry); this.markDex(ev.to, true);
    }
    this.save(true);
  }
  // Attacken-Kristall: passende Kreatur (gleicher Typ oder Attacke im Lernset) lernt die Attacke
  canTm(m, id) {
    const S = SPECIES[m.sp], M = MOVES[id], T = S.types;
    if (m.egg || m.moves.some(x => x.id === id)) return false;
    const HMC = { zerschneider: () => true, zertruemmerer: t => !t.includes('luft') && !t.includes('geist'), surfer: t => t.some(x => ['wasser', 'eis', 'drache'].includes(x)), blitz: t => t.some(x => ['elektro', 'licht', 'feuer', 'magie'].includes(x)), fliegen: t => t.some(x => ['luft', 'drache'].includes(x)) };
    if (HMC[id]) return HMC[id](T);
    return T.includes(M.type) || M.type === 'normal' || S.learn.some(([, l]) => l === id);
  }
  knows(id) { return this.state.team.find(m => !m.egg && m.hp > 0 && m.moves.some(x => x.id === id)); }
  // ---------------------------------------------------------- Feld: VMs & Typ-Fähigkeiten
  async fieldObstacle(mv, x, y) {
    const s = this.state, vk = mv === 'zerschneider' ? 'vk_zerschneider' : 'vk_zertruemmerer', m = this.knows(mv);
    const what = mv === 'zerschneider' ? 'Ein kleiner Busch. Er sieht so aus, als könnte man ihn zerschneiden.' : 'Ein rissiger Felsen. Er sieht so aus, als könnte man ihn zertrümmern.';
    if (!s.bag[vk] || !m) return say(what);
    if (!(await ask(`${what} Soll ${monName(m)} ${MOVES[mv].name} einsetzen?`))) return;
    await this.useObstacle(mv, x, y, m);
  }
  async useObstacle(mv, x, y, m) {
    const ow = this.ow;
    await say(`${monName(m)} setzt ${MOVES[mv].name} ein!`); cry(SPECIES[m.sp].cry);
    const cut = mv === 'zerschneider', col = cut ? ['#2e7a34', '#7ad068', '#48a048'] : ['#8a7c78', '#b0a49c', '#3a3034'];
    for (let i = 0; i < 16; i++) ow.parts.push({ x: x * 16 + 8, y: y * 16 + 8, vx: (Math.random() - 0.5) * 90, vy: -30 - Math.random() * 50, c: col[i % 3], l: 0.6, ml: 0.6, sz: 2 });
    sfx(cut ? 'whoosh' : 'hit'); G.shake = cut ? 0.1 : 0.5;
    ow.cleared.set(x + ',' + y, cut ? '.' : (ow.M.rows[y][x - 1] && 'a'));
  }
  fieldOptions(m) {
    const s = this.state, out = [], ow = this.ow, S = SPECIES[m.sp];
    const HM = [['zerschneider', 'vk_zerschneider'], ['zertruemmerer', 'vk_zertruemmerer'], ['surfer', 'vk_surfer'], ['blitz', 'vk_blitz'], ['fliegen', 'vk_fliegen']];
    for (const [mv, vk] of HM) if (s.bag[vk] && m.moves.some(x => x.id === mv) && m.hp > 0) out.push({ label: MOVES[mv].name.toUpperCase(), run: () => this.useHm(mv, m) });
    const AB = {
      pflanze: ['Lockduft', 'lure'], erde: ['Spürnase', 'sniff'], metall: ['Metallsinn', 'sniff'], elektro: ['Magnetsinn', 'radar'], magie: ['Teleport', 'tele'],
      geist: ['Schattenschleier', 'veil'], schatten: ['Schattenschleier', 'veil'], drache: ['Drachenblick', 'veil'], luft: ['Rückenwind', 'wind'], feuer: ['Glut', 'light'], licht: ['Leuchten', 'light'], wasser: ['Quellwasser', 'spring'], eis: ['Frostatem', 'frost'], gift: ['Giftnebel', 'veil'],
    };
    const seen = new Set();
    if (m.hp > 0) for (const t of S.types) { const a = AB[t]; if (a && !seen.has(a[0])) { seen.add(a[0]); out.push({ label: '★ ' + a[0], run: () => this.ability(a[1], m, t, a[0]) }); } }
    return out;
  }
  async useHm(mv, m) {
    const ow = this.ow, p = ow.p, [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.dir], fx = p.x + dx, fy = p.y + dy;
    if (mv === 'zerschneider' || mv === 'zertruemmerer') { const c = ow.ch(fx, fy); if (c !== (mv === 'zerschneider' ? '$' : '&')) return say('Hier gibt es nichts, wofür man das einsetzen könnte.'); return this.useObstacle(mv, fx, fy, m); }
    if (mv === 'surfer') { if (ow.ch(fx, fy) !== '~' || p.surf) return say('Stell dich ans Wasser und schau darauf, um zu surfen.'); return this.water(fx, fy); }
    if (mv === 'blitz') { if (!ow.M.darkRadius) return say('Hier ist es doch schon hell genug.'); ow.flashLit = 90; sfx('rune'); return say(`${monName(m)} setzt Blitz ein! Die Umgebung wird hell erleuchtet.`); }
    if (mv === 'fliegen') return this.fly(m);
  }
  async fly(m) {
    const s = this.state;
    if (!this.ow.M.outdoor) return say('Fliegen geht nur unter freiem Himmel.');
    const towns = Object.entries(MAPS).filter(([id, M]) => s.flags['fly_' + id] && (M.buildings || []).some(b => b.heal));
    if (!towns.length) return say('Du hast noch keine Stadt mit Heilzentrum besucht.');
    const i = await choose([...towns.map(([, M]) => M.name), 'Abbrechen'], { title: 'WOHIN FLIEGEN?' });
    if (i === null || i === towns.length) return;
    const [id, M] = towns[i], b = M.buildings.find(b => b.heal);
    await say(`${monName(m)} breitet die Flügel aus!`); cry(SPECIES[m.sp].cry); sfx('whoosh');
    this.fieldExit = true;
    await this.ow.warp(id, b.x + b.door, b.y + b.h, 'down');
  }
  async ability(kind, m, type, name) {
    const s = this.state, ow = this.ow, N = monName(m), c = ow.ch(ow.p.x, ow.p.y);
    cry(SPECIES[m.sp].cry);
    switch (kind) {
      case 'lure': {
        if (!ow.M.enc || !(c === ':' || c === 'h' || c === 'y' || c === 'f' || c === '%')) return say(`${N} verströmt einen süßen Duft … aber hier ist kein hohes Gras.`);
        await say(`${N} verströmt einen süßen Duft …`); this.fieldExit = true;
        return this.wildBattle(ow.M.enc, ow.id === 'altwald' ? 'wald' : ow.M.bg || 'gras');
      }
      case 'sniff': {
        ow.revealed = true; const n = ow.hidden.length; sfx('dex');
        return say(n ? `${N} schnuppert am Boden … Hier ${n === 1 ? 'ist noch etwas' : 'sind noch ' + n + ' Dinge'} versteckt! Funkelnde Stellen genau ansehen und A drücken.` : `${N} schnuppert am Boden … hier ist nichts mehr versteckt.`);
      }
      case 'radar': {
        const E = ENC[ow.M.enc]; if (!E) return say(`${N} spürt hier keine wilden Kreaturen.`);
        const miss = [...new Set(E.list.map(e => e[0]))].filter(sp => !s.dex.caught[sp]);
        const sw = this.swarm(); const extra = sw.enc === ow.M.enc ? ` Heute: Massenausbruch von ${SPECIES[sw.sp].name}!` : '';
        return say(miss.length ? `${N} spürt Kreaturen, die du hier noch nicht gebunden hast: ${miss.map(sp => s.dex.seen[sp] ? SPECIES[sp].name : '???').join(', ')}.${extra}` : `${N} spürt nichts Neues – hier hast du schon alle Arten gebunden!${extra}`);
      }
      case 'tele': {
        if (ow.M.indoor) return say('Teleport funktioniert hier drinnen nicht.');
        const hp = s.healPoint || { map: 'muschelbucht', x: 4, y: 8 };
        await say(`${N} setzt Teleport ein!`); this.fieldExit = true;
        return ow.warp(hp.map, hp.x, hp.y, 'down');
      }
      case 'veil': s.repel = 150; sfx('debuff'); return say(type === 'drache' ? `${N} blickt furchteinflößend umher. Wilde Kreaturen halten sich fern (150 Schritte).` : type === 'gift' ? `${N} hüllt euch in einen Giftnebel. Wilde Kreaturen meiden euch (150 Schritte).` : `${N} hüllt euch in Schatten. Wilde Kreaturen bemerken dich nicht (150 Schritte).`);
      case 'wind': s.wind = 200; sfx('whoosh'); return say(`${N} lässt Rückenwind aufkommen! Du bist 200 Schritte lang schneller.`);
      case 'light': if (!ow.M.darkRadius) return say(`${N} glüht warm auf. Hier ist es aber schon hell genug.`); ow.flashLit = Math.max(ow.flashLit || 0, type === 'licht' ? 50 : 30); sfx('buff'); return say(`${N} leuchtet die Dunkelheit ein Stück aus.`);
      case 'spring': {
        if (ow.springUsed) return say(`${N} ist hier schon erschöpft. Versuch es in einem anderen Gebiet.`);
        ow.springUsed = true; s.team.forEach(t => { if (!t.egg && t.hp > 0) t.hp = Math.min(maxHp(t), t.hp + 20); }); sfx('heal');
        return say(`${N} lässt eine klare Quelle sprudeln. Alle Kreaturen erholen sich um 20 KP.`);
      }
      case 'frost': {
        const hot = ow.weather?.() === 'ash' || ['ignis', 'route3', 'kraterherz'].includes(ow.id);
        if (!hot) return say(`${N} haucht eiskalte Luft. Brrr!`);
        s.team.forEach(t => { if (t.status === 'brand') t.status = null; }); sfx('heal');
        return say(`${N} kühlt dein Team in der Hitze ab. Verbrennungen sind geheilt!`);
      }
    }
  }
  // Mitläufer ansprechen
  async talkFollower() {
    const s = this.state, ow = this.ow, m = s.team.find(t => !t.egg && t.hp > 0); if (!m) return;
    const N = monName(m), c = ow.ch(ow.p.x, ow.p.y), r = m.hp / maxHp(m), w = ow.weather?.();
    cry(SPECIES[m.sp].cry);
    if (!ow.fTalked) { ow.fTalked = true; m.friendship = Math.min(255, (m.friendship || 70) + 2); }
    if (s.steps - (s.fFind || 0) > 350 && Math.random() < 0.4) {
      s.fFind = s.steps; const pool = ['heilbeere', 'trank', 'kristall', 'klarbeere', 'heilbeere', 'supertrank', 'sternkristall'], it = pool[Math.floor(Math.random() * pool.length)];
      s.bag[it] = (s.bag[it] || 0) + 1; sfx('caught'); ow.fEmote = { t: 1.4 };
      return say([`${N} hat etwas im Maul …`, `${N} hat ${ITEMS[it].name} gefunden! Du steckst es ein.`]);
    }
    const S = SPECIES[m.sp], f = m.friendship || 70, L = [];
    if (r < 0.3) L.push(`${N} sieht erschöpft aus … Ein Besuch im Heilzentrum wäre gut.`);
    if (m.status) L.push(`${N} fühlt sich nicht gut. ${m.status === 'gift' ? 'Das Gift setzt ihm zu.' : m.status === 'brand' ? 'Die Verbrennung brennt.' : 'Es kann sich kaum rühren.'}`);
    if (w === 'rain') L.push(S.types.includes('wasser') ? `${N} tanzt fröhlich im Regen!` : `${N} schüttelt sich die Regentropfen ab.`);
    if (w === 'snow') L.push(S.types.includes('eis') ? `${N} wirft sich begeistert in den Schnee!` : `${N} zittert ein bisschen in der Kälte.`);
    if (w === 'ash') L.push(S.types.includes('feuer') ? `${N} genießt die Hitze des Vulkans.` : `${N} niest. Die Asche kitzelt in der Nase.`);
    if (c === ':' ) L.push(`${N} schnuppert neugierig im hohen Gras.`);
    if (this.isNight()) L.push(S.types.includes('schatten') || S.types.includes('geist') ? `${N} ist nachts hellwach und voller Energie!` : `${N} gähnt ausgiebig.`);
    if (ow.M.indoor) L.push(`${N} schaut sich neugierig im Raum um.`);
    if (f >= 200) L.push(`${N} schmiegt sich an dich. Ihr seid ein unzertrennliches Team!`); else if (f >= 130) L.push(`${N} schaut dich fröhlich an!`);
    L.push(`${N} hüpft vergnügt um dich herum!`, `${N} schaut sich aufmerksam um.`, `${N} folgt dir auf Schritt und Tritt.`);
    if (f >= 130 || Math.random() < 0.3) ow.fEmote = { t: 1.2 };
    return say(L[Math.floor(Math.random() * Math.min(L.length, L.length > 3 ? L.length - 1 : L.length))]);
  }
  async useTm(k, it) {
    const s = this.state, M = MOVES[it.tm];
    const t = await party(s, { select: true, prompt: `Wer soll ${M.name} lernen?`, filter: m => this.canTm(m, it.tm) });
    if (t === null) return;
    const m = s.team[t];
    if (m.moves.length < 4) m.moves.push({ id: it.tm, pp: M.pp });
    else {
      const i = await choose([...m.moves.map(x => MOVES[x.id].name), 'Abbrechen'], { title: 'Vergessen:' });
      if (i === null || i === 4) return;
      m.moves[i] = { id: it.tm, pp: M.pp };
    }
    if (!it.hm) s.bag[k]--; sfx('lvl'); await say(`${monName(m)} hat ${M.name} erlernt!`);
  }
  // Mondruine: Hüter Lunareth bewacht den Mond-Herzstein
  async moonAltar() {
    const s = this.state;
    if (s.bag.herzstein_mond && s.flags.linde_pg && !s.flags.lunareth) return this.rematch('lunareth', 'ruine', ['Über dem Altar flackert Sternenlicht…', 'Lunareth ist zurückgekehrt! Die vereinten Herzsteine haben es gerufen.']);
    if (s.bag.herzstein_mond) return say('Der Altar ist leer. Über der Ruine schimmert zum ersten Mal ein schwaches Morgenrot.');
    await say(['Auf dem Altar liegt ein silbern glühender Stein – der Mond-Herzstein!', 'Als du die Hand ausstreckst, erhebt sich aus dem Schatten eine riesige Gestalt mit einem Geweih aus Sternenlicht…']);
    const r = await this.wildBattle(null, 'ruine', createMon('lunareth', 40));
    if (!r || r.result === 'lose' || r.result === 'fled') return;
    if (r.result === 'caught') { s.flags.lunareth = true; await say('Lunareth hat dich als würdig anerkannt und schließt sich dir an!'); }
    else await say('Lunareth weicht zurück und verneigt sich. Es gibt den Stein frei.');
    s.bag.herzstein_mond = 1; sfx('caught');
    await say([`${s.name} erhält den MOND-HERZSTEIN!`, 'Drei von sieben Herzsteinen sind jetzt in Sicherheit.', '(Ende von Phase 4.1. Als Nächstes: die Wüstenregion Solaria!)']);
    this.save(true);
  }
  async sunAltar() {
    const s = this.state;
    if (s.bag.herzstein_sonne && s.flags.linde_pg && !s.flags.solarion) return this.rematch('solarion', 'ruine', ['Durch die Decke bricht gleißendes Licht…', 'Solarion ist zurückgekehrt! Die vereinten Herzsteine haben es gerufen.']);
    if (s.bag.herzstein_sonne) return say('Der Altar ist leer. Durch ein Loch in der Decke fällt warmes Licht.');
    if (!s.flags.nyx4) return say('Nyx versperrt den Weg zum Altar.');
    await say(['Auf dem Altar glüht ein goldener Stein – der Sonnen-Herzstein!', 'Plötzlich wird es gleißend hell. Mit einem Schrei wie ein Sonnensturm stößt eine gewaltige Gestalt aus dem Licht herab…']);
    const r = await this.wildBattle(null, 'wueste', createMon('solarion', 45));
    if (!r || r.result === 'lose' || r.result === 'fled') return;
    if (r.result === 'caught') { s.flags.solarion = true; await say('Solarion hat dich als würdig erkannt und schließt sich dir an!'); }
    else await say('Solarion steigt hinauf ins Licht und lässt den Stein zurück.');
    s.bag.herzstein_sonne = 1; sfx('caught');
    await say([`${s.name} erhält den SONNEN-HERZSTEIN!`, 'Vier von sieben Herzsteinen sind jetzt in Sicherheit.', '(Ende von Phase 4.2. Als Nächstes: das Drachengebirge Drakmor und das Hauptquartier von Team Eklipse!)']);
    this.save(true);
  }
  // Nebenquest „Zeig mir …“: eine bestimmte Kreatur im Team vorzeigen
  async quest(n, q) {
    const s = this.state, N = { name: n.name }, f = 'quest_' + n.id;
    if (s.flags[f]) { if (q.next && !s.flags['qreq_' + n.id]) return this.questReq(n, q); return say(q.after, N); }
    const has = s.team.find(m => !m.egg && m.sp === q.want);
    if (!has) { if (!s.flags['qa_' + n.id]) { s.flags['qa_' + n.id] = true; sfx('dex'); } await say(q.ask, N); return say(`Pager: Neue Aufgabe – ${q.title || 'Suchauftrag'}.`); }
    await say(q.thanks.map(t => t.replace('{mon}', monName(has))), N);
    for (const [k, v] of Object.entries(q.reward)) { s.bag[k] = (s.bag[k] || 0) + v; sfx('caught'); await say(`${s.name} erhält ${v > 1 ? v + '× ' : ''}${ITEMS[k].name}!`); }
    if (q.log) await ST.addLog(this, q.log);
    s.flags[f] = true; this.save(true);
    if (q.next) await this.questReq(n, q);
  }
  // Botengang starten: die Person bittet, etwas in eine andere Stadt zu bringen
  async questReq(n, q) {
    const s = this.state; s.flags['qreq_' + n.id] = true; sfx('dex');
    await say(q.next.ask, { name: n.name }); await say(`Pager: Neue Aufgabe – ${q.next.title}. Bring es zu ${q.next.where}.`); this.save(true);
  }
  // Botengang abschließen beim Empfänger: Dank + Logbuchseite
  async questRun(n, qid, q) {
    const s = this.state; s.flags['qn_' + qid] = true;
    await say(q.next.thanks, { name: n.name });
    if (q.next.log) await ST.addLog(this, q.next.log);
    this.save(true);
  }
  // Beerenbusch: einmal pro Spieltag Beeren pflücken
  async berry(x, y) {
    const s = this.state, key = `${this.ow.id},${x},${y}`, day = Math.floor((s.time || 0) / DAY);
    s.berries ||= {};
    if (s.berries[key] === day) return say('An diesem Busch hängen noch keine reifen Beeren. Morgen wieder!');
    const k = (x * 7 + y * 13) % 5 % 2 ? 'klarbeere' : 'heilbeere', n = 1 + ((x + y + day) % 2);
    s.berries[key] = day; s.bag[k] = (s.bag[k] || 0) + n; sfx('caught');
    await say(`${s.name} pflückt ${n}× ${ITEMS[k].name}!`);
  }
  async options() {
    for (;;) {
      const i = await choose([`Musik: ${audioState.music ? 'AN' : 'AUS'}`, `Effekte: ${audioState.sfx ? 'AN' : 'AUS'}`, `Text: ${['LANGSAM', 'NORMAL', 'SCHNELL', 'SOFORT'][settings.textSpeed]}`, ...(this.state ? ['Aussehen ändern'] : []), 'Zurück'], { title: 'OPTIONEN', above: false, x: 40, w: 160 });
      if (i === null || i === (this.state ? 4 : 3)) break;
      if (i === 3 && this.state) { const st = await this.editor({ name: this.state.name, look: this.state.look }); this.state.name = st.name; this.state.look = st.look; this.save(true); await say('Dein neues Aussehen steht dir!'); continue; }
      if (i === 0) setAudio('music', !audioState.music);
      if (i === 1) setAudio('sfx', !audioState.sfx);
      if (i === 2) settings.textSpeed = (settings.textSpeed + 1) % 4;
      this.saveOpt();
    }
  }

  // ---------------------------------------------------------- Bewegungs-Sperren & Ereignisse
  blockEdge(map, to) { return ST.edgeBlock(this, map, to); }
  blockMove(map, x, y) { return ST.moveBlock(this, map, x, y); }
  remoteActors(id) { return this.online.actors(id); }
  async onMapLoad(id) {
    const s = this.state;
    if ((MAPS[id]?.buildings || []).some(b => b.heal)) s.flags['fly_' + id] = true;
    s.flags['seen_' + id] = true;
    { const sw = this.swarm(), M = MAPS[id]; if (sw && M?.enc === sw.enc && s.flags.swarmDay !== sw.day && s.team.length) { s.flags.swarmDay = sw.day; this.ow.busy = true; await wait(450); sfx('dex'); await say(`Massenausbruch! Hier im Gebiet tauchen heute besonders viele ${SPECIES[sw.sp].name} auf!`); this.ow.busy = false; } }
    await ST.mapEvent(this, id);
  }
  counterOf() { return ST.counterOf(this.state); }

  onStep() {
    const s = this.state;
    if (s.shinyBoost > 0 && !--s.shinyBoost) this.ow.notify('Der Glücksspieß wirkt nicht mehr.');
    if (s.catchBoost > 0 && !--s.catchBoost) this.ow.notify('Das Fängerbrot wirkt nicht mehr.');
    this.online.pos();
    if (s.steps % 150 === 0) { const L = s.team.find(m => !m.egg && m.hp > 0); if (L) { const before = L.friendship || 70; L.friendship = Math.min(255, before + 2); if (before < 200 && L.friendship >= 200) setTimeout(() => this.ow.notify(`${monName(L)} vertraut dir blind. Resonanz ist jetzt möglich!`), 50); } }
    const ev = stepBreeding(s); if (s.station?.mods?.labor) ev.push(...stepBreeding(s));
    for (const e of ev) {
      if (e.t === 'eggReady') this.ow.notify('Die Brutstätte in Ankerbrück hat ein Ei für dich!');
      if (e.t === 'hatch' && !this.hatching) { this.hatching = true; setTimeout(() => this.doHatch(e.uid), 50); }
    }
  }
  async doHatch(uid) {
    const s = this.state, i = s.team.findIndex(m => m.uid === uid); if (i < 0) { this.hatching = false; return; }
    const egg = s.team[i]; this.ow.busy = true;
    await say('Oh? Dein Ei bewegt sich!');
    const m = hatch(egg); healMon(m);
    const S = SPECIES[m.sp];
    await hatchScene(S, monSprite(m.sp, 'front', m.shiny, m.mut), `${S.name} ist aus dem Ei geschlüpft!`);
    s.team[i] = m; this.markDex(m.sp, true); cry(S.cry);
    if (S.fusion) await say([`Unglaublich! ${S.name} ist eine Mutation aus ${egg.parents.join(' und ')}!`, `Typ: ${S.types.map(t => t[0].toUpperCase() + t.slice(1)).join('/')}.${m.mut ? ' Und es wirkt besonders kräftig – ein echter Mutant!' : ''}`]);
    if (await ask(`Möchtest du ${S.name} einen Spitznamen geben?`)) m.nick = await inputName('Spitzname', S.name);
    this.hatching = false; this.ow.busy = false; this.save(true);
  }

  // ---------------------------------------------------------- Kämpfe
  // Massenausbruch: jeden Tag taucht eine seltene Art in einem Gebiet gehäuft auf
  swarm() {
    const day = Math.floor(Date.now() / 864e5);
    if (this._sw?.day === day) return this._sw;
    const maps = Object.values(MAPS).filter(m => m.enc && m.outdoor && ENC[m.enc]?.list?.length > 1);
    const encs = [...new Set(maps.map(m => m.enc))], enc = encs[(day * 7) % encs.length];
    const e = ENC[enc].list.filter(x => !SPECIES[x[0]]?.legendary).reduce((a, b) => (b[1] < a[1] ? b : a));
    return (this._sw = { day, enc, sp: e[0], lv: [e[2], e[3]], name: maps.find(m => m.enc === enc).name });
  }
  // Alpha-Kreaturen: an manchen Tagen streift auf einer Route ein riesiges, starkes Exemplar sichtbar umher
  alphaFor(id) {
    const M = MAPS[id], E = M?.enc && ENC[M.enc]; if (!M?.outdoor || !E || M.night) return null;
    const day = Math.floor(Date.now() / 864e5), key = `alpha:${day}:${id}`;
    if (this.state.flags[key]) return null;
    let h = day * 2654435761 >>> 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const r = () => ((h = (h * 1103515245 + 12345) >>> 0) / 4294967296);
    if (r() > 0.45) return null; // knapp jede zweite Route
    const list = E.list.filter(e => !SPECIES[e[0]]?.legendary);
    if (!list.length) return null;
    const pool = [...list].sort((a, b) => a[1] - b[1]).slice(0, Math.max(2, Math.ceil(list.length / 2)));
    const e = pool[Math.floor(r() * pool.length)], top = Math.max(...list.map(x => x[3]));
    return { key, sp: e[0], lv: Math.min(100, top + 7), seed: h };
  }
  // Revierkreatur: stark, aber berechenbar. Wer sich angeschlichen hat, erwischt sie unvorbereitet.
  async revierBattle(n, attacked) {
    const s = this.state, R = n.revier, ow = this.ow, S = SPECIES[R.sp], sneak = !!ow.p.sneak;
    cry(S.cry); G.shake = 0.8;
    if (R.legend) await say([`Die Luft beginnt zu vibrieren. Ein uraltes Wesen erhebt sich vor dir …`, `${S.name}, ein Wächter des Archipels!`]);
    else if (R.story) await say(R.id === 'waldherz' ? ['Zwischen den Bäumen erhebt sich ein riesiges Fungorax. Goldene Sporen wirbeln um seinen Hut.', 'Das WALDHERZ! Es spürt dich – und es ist wütend.'] : `Ein riesiges ${S.name}!`);
    else await say(attacked ? `${S.name} stürmt aus seinem Revier auf dich zu!` : [`Ein mächtiges ${S.name} bewacht dieses Revier.`, 'Revierkreaturen sind stärker als normal – und bringen seltene Beute.']);
    if (!attacked && !R.story && !await ask(`Gegen ${S.name} kämpfen?`)) return;
    const m = createMon(R.sp, R.lv); for (const k of Object.keys(m.iv)) m.iv[k] = Math.max(m.iv[k], 24);
    m.revier = true; m.hp = maxHp(m); this.shinyRoll(m);
    if (sneak) { m.hp = Math.floor(maxHp(m) * 0.75); await say('Du hast dich angeschlichen! Es ist überrascht und angeschlagen.'); }
    if (R.legend) { m.revier = false; m.hp = maxHp(m); }
    const r = await this.wildBattle(ow.M.enc, ow.M.bg || 'gras', m, { noCatch: !!R.story && !R.legend });
    if (R.legend) {
      if (r?.result === 'caught') { s.flags[R.hideIf] = true; ow.npcs = ow.npcs.filter(x => x !== n); await say(`${S.name} hat dich als würdig erkannt!`); this.save(true); }
      else if (r?.result === 'win') { s.flags[R.id + 'Besiegt'] = true; ow.npcs = ow.npcs.filter(x => x !== n); await say(`${S.name} zieht sich zurück. Es wird an diesen Ort zurückkehren …`); }
      return;
    }
    if (R.story) { if (r?.result === 'win') { ow.npcs = ow.npcs.filter(x => x !== n); } await ST.revierStory(this, n, r); return; }
    if (!r || (r.result !== 'win' && r.result !== 'caught')) return;
    s.flags[`rv:${Math.floor(Date.now() / 864e5)}:${R.id}`] = true; ow.npcs = ow.npcs.filter(x => x !== n);
    const L = ['sternkristall', 'ankerkugel', 'sonderbonbon', 'supertrank', 'echomuschel', 'lockfutter'], it = L[Math.floor(Math.random() * L.length)];
    s.bag[it] = (s.bag[it] || 0) + 2; sfx('caught'); await say(`Im Revier findest du 2× ${ITEMS[it].name}!`); this.save(true);
  }
  // Scheue Kreatur: mit der Lieblingsbeere füttern, dann schließt sie sich freiwillig an
  async feedShy(n) {
    const s = this.state, S = n.shy, Sp = SPECIES[S.sp], day = Math.floor(Date.now() / 864e5);
    await say(`Ein scheues ${Sp.name} beobachtet dich mit großen Augen.`);
    const berries = Object.keys(ITEMS).filter(k => /beere/.test(k) && s.bag[k]);
    if (!berries.length) return say('Vielleicht würde es eine Beere annehmen … aber du hast keine dabei.');
    const i = await choose([...berries.map(k => ({ label: ITEMS[k].name, right: '×' + s.bag[k], desc: 'Vorsichtig hinhalten.' })), 'Lieber nicht'], { title: 'Welche Beere?' });
    if (i === null || i >= berries.length) return;
    const k = berries[i]; s.bag[k]--;
    if (k !== S.likes) {
      await say([`${Sp.name} schnuppert an der ${ITEMS[k].name} …`, 'Es rümpft die Nase und huscht davon! (Morgen ist es wieder da.)']);
      s.flags[`shyFled:${day}:${S.id}`] = true; this.ow.npcs = this.ow.npcs.filter(x => x !== n); return;
    }
    n.fed = (n.fed || 0) + 1; cry(Sp.cry);
    if (n.fed < (this.ow.p.sneak ? 1 : 2)) return say([`${Sp.name} frisst die ${ITEMS[k].name} – erst zögerlich, dann gierig!`, 'Es kommt ein Stückchen näher. Vielleicht noch eine?']);
    await say([`${Sp.name} frisst und schmiegt sich an dich!`, `${Sp.name} möchte mit dir kommen!`]);
    const m = createMon(S.sp, S.lv, Math.random, { friendship: 220 }); this.shinyRoll(m);
    s.flags['shy_' + S.id] = true; this.ow.npcs = this.ow.npcs.filter(x => x !== n);
    const isNew = !s.dex.caught[m.sp]; this.markDex(m.sp, true); sfx('caught');
    if (isNew) { await say(`Die Daten von ${Sp.name} werden in der Chronik eingetragen.`); await dexEntry(m.sp, Object.keys(s.dex.caught).length); }
    if (genderOf(m)) await say(`${Sp.name} ist ein${genderOf(m) === 1 ? ' Männchen ♂' : ' Weibchen ♀'}.`);
    if (await ask(`Möchtest du ${Sp.name} einen Spitznamen geben?`)) m.nick = await inputName('Spitzname', Sp.name);
    await ST.onCaught(this, m);
    if (s.team.length < 6) s.team.push(m); else { s.box.push(m); await say(`${monName(m)} wurde in die Box geschickt.`); }
    if (isNew) await this.dexRewards();
    this.save(true);
  }
  async alphaBattle(n) {
    const s = this.state, A = n.alpha, ow = this.ow;
    cry(SPECIES[A.sp].cry); G.shake = 1;
    await say([`Ein riesiges ${SPECIES[A.sp].name} mit rot glühenden Augen!`, 'Das ist eine ALPHA-Kreatur – viel stärker als normal!']);
    if (!await ask('Willst du gegen das Alpha kämpfen?')) return;
    const m = createMon(A.sp, A.lv);
    for (const k of Object.keys(m.iv)) m.iv[k] = 31;
    m.alpha = true; m.hp = maxHp(m); this.shinyRoll(m);
    const r = await this.wildBattle(ow.M.enc, ow.M.bg || 'gras', m);
    if (!r || (r.result !== 'win' && r.result !== 'caught')) return;
    s.flags[A.key] = true; ow.npcs = ow.npcs.filter(x => x !== n);
    const LOOT = ['sternkristall', 'sonderbonbon', 'sonderbonbon', 'topbeleber', 'toptrank', 'beleber', 'hypertrank', 'ak_sandsturz', 'ak_funkenkette', 'ak_gezeitenschlag', 'echomuschel', 'ankerkugel'];
    const it = LOOT[Math.floor(Math.random() * LOOT.length)], k = it.startsWith('ak_') || it.startsWith('top') ? 1 : it === 'sternkristall' ? 3 : 2;
    s.bag[it] = (s.bag[it] || 0) + k; s.money += A.lv * 60; sfx('caught');
    await say([r.result === 'caught' ? 'Das Alpha gehört jetzt zu dir!' : 'Das Alpha zieht sich zurück …', `Es hat etwas fallen lassen: ${k > 1 ? k + '× ' : ''}${ITEMS[it].name}!`, `Dazu findest du ${A.lv * 60} ◈.`]);
    this.save(true);
  }
  // Zwischensequenz starten: Balken fahren ein, Kamera schwenkt zu einer Figur (id, Objekt oder null = Spieler)
  async cutIn(target, music) {
    const ow = this.ow; ow.busy = true;
    const f = typeof target === 'string' ? ow.npcs.find(n => n.id === target) : target;
    ow.cine = { b: ow.cine?.b || 0, k: ow.cine?.k || 0, on: true, focus: f || null };
    if (music) setMusic(music);
    await wait(f ? 900 : 450);
  }
  shinyRoll(m) { const s = this.state; if (!m.shiny && Math.random() < ((s.bag.glanzamulett ? 2 : 0) + (s.shinyBoost > 0 ? 3 : 0) + (s.station?.mods?.observatorium ? 2 : 0)) / 512) m.shiny = true; return m; }
  pickWild(encId, sneak) {
    const sw = this.swarm();
    if (encId === sw.enc && Math.random() < 0.4) return this.shinyRoll(createMon(sw.sp, sw.lv[0] + Math.floor(Math.random() * (sw.lv[1] - sw.lv[0] + 1))));
    const night = this.isNight(), list = ENC[encId].list.filter(e => !e[4] || (e[4] === 'night') === night);
    const wt = e => (sneak ? Math.sqrt(e[1]) * 3 : e[1]); // geduckt: seltene Arten häufiger
    let r = Math.random() * list.reduce((a, e) => a + wt(e), 0);
    for (const e of list) { r -= wt(e); if (r <= 0) return this.shinyRoll(createMon(e[0], e[2] + Math.floor(Math.random() * (e[3] - e[2] + 1)))); }
    return this.shinyRoll(createMon(list[0][0], list[0][2]));
  }
  // Dr. Vato belohnt das Füllen der Chronik
  async dexRewards() {
    const s = this.state, n = Object.keys(s.dex.caught).filter(id => !SPECIES[id]?.fusion).length;
    const R = [[5, { kristall: 5 }], [10, { sternkristall: 5 }], [15, { supertrank: 5, lockfutter: 3 }], [25, { hypertrank: 3, sternkristall: 5, sonderbonbon: 3 }], [35, { schutzamulett: 1, echomuschel: 3 }], [45, { sternkristall: 10, sonderbonbon: 5 }]];
    for (const [k, rew] of R) {
      if (n < k || s.flags['dexR' + k]) continue;
      s.flags['dexR' + k] = true; sfx('dex');
      await say([`Dein Muschelfon klingelt …`, `Prof. Kehl: ${s.name}, du hast schon ${k} verschiedene Kreaturen gebunden! Großartig für meine Forschung!`, 'Prof. Kehl: Hier, eine kleine Belohnung. Ich schicke sie dir direkt in den Beutel!']);
      for (const [it, v] of Object.entries(rew)) {
        if (it === 'money') { s.money += v; sfx('caught'); await say(`${s.name} erhält ${v} ◈!`); continue; }
        s.bag[it] = (s.bag[it] || 0) + v; sfx('caught'); await say(`${s.name} erhält ${v > 1 ? v + '× ' : ''}${ITEMS[it].name}!`);
      }
      const next = R.find(([kk]) => kk > k); if (next) await say(`Prof. Kehl: Melde dich wieder, wenn du ${next[0]} Arten gebunden hast!`);
    }
  }
  // Kreaturen-Spur: seltene, kräftige Kreatur – bei Funkeln oft schimmernd
  async trailBattle(T, bg) {
    const encId = this.ow.M.enc; if (!encId) return;
    const night = this.isNight(), list = ENC[encId].list.filter(e => (!e[4] || (e[4] === 'night') === night) && !SPECIES[e[0]]?.legendary);
    const rare = [...list].sort((a, b) => a[1] - b[1]).slice(0, Math.max(1, Math.ceil(list.length / 3)));
    const e = rare[Math.floor(Math.random() * rare.length)];
    const m = createMon(e[0], Math.min(100, e[3] + 1 + Math.floor(Math.random() * 3)));
    for (const k of Object.keys(m.iv).sort(() => Math.random() - 0.5).slice(0, 3)) m.iv[k] = 31;
    m.hp = maxHp(m);
    if (T.kind === 'glitzer' && Math.random() < 0.5) m.shiny = true; else this.shinyRoll(m);
    this.ow.busy = true; this.ow.emote = { n: this.ow.p, t: 0.8 }; sfx('encounter');
    await say(T.kind === 'glitzer' ? 'Da funkelt etwas im Gras …!' : 'Das Gras raschelt heftig …!');
    this.ow.busy = false;
    return this.wildBattle(encId, bg, m);
  }
  async wildBattle(encId, bg, mon, opt = {}) {
    const s = this.state; if (!s.team.some(m => !m.egg && m.hp > 0)) return;
    this.ow.busy = true;
    const foe = mon || this.pickWild(encId, opt.sneak);
    if (opt.sneak && !mon) foe.surprised = true;
    if (encId) this.lastWild = { sp: foe.sp, lvl: foe.lvl, enc: encId, bg };
    this.markDex(foe.sp);
    sfx('encounter');
    if (foe.surprised) await say(`Psst! Du hast ein ahnungsloses ${SPECIES[foe.sp].name} entdeckt. Überrascht ist es leichter zu fangen!`);
    await this.flashIn();
    const r = await battle(this, { foeTeam: [foe], bg, canCatch: !opt.noCatch, intro: SPECIES[foe.sp].legendary ? 'legend' : foe.alpha ? 'alpha' : 'wild', music: foe.alpha || foe.revier ? 'boss' : undefined });
    await this.afterBattle(r, opt.noBlackout);
    return r;
  }
  // Übergang in den Kampf: zwei Blitze, dann schließen Balken das Bild; der Kampf blendet danach selbst auf
  async trainerIn() { for (let i = 0; i < 3; i++) { await fade(0.85, 60); await fade(0, 80); } await iris(620); setTimeout(() => fade(0, 260), 30); }
  async flashIn() { for (let i = 0; i < 2; i++) { await fade(0.85, 70); await fade(0, 90); } await wipe(520); setTimeout(() => fade(0, 260), 30); }
  async trainerFight(t) {
    const s = this.state;
    if (!s.team.some(m => !m.egg && m.hp > 0)) { await say('Deine Kreaturen sind erschöpft!'); return false; }
    t.music ||= /Champion/.test(t.name) ? 'finale' : /^Umbra/.test(t.name) ? (this.ow.id === 'ligachamp' ? 'finale' : 'boss') : /Arenaleiter|Top-4|Kommandantin|Rivale|Lyra/.test(t.name) ? 'boss' : undefined;
    const rnd = mulberry(t.name.length * 911);
    const foe = t.mons ? t.mons.map(m => { const c = JSON.parse(JSON.stringify(m)); healMon(c); return c; }) : t.team.map(([sp, l]) => createMon(sp, l, rnd));
    foe.forEach(m => this.markDex(m.sp));
    sfx('encounter'); await this.trainerIn();
    if (t.double && DUO.canDouble(s)) return DUO.duoFight(this, t, foe);
    t.reso ??= /Champion|Top-4|^Umbra|Hüter/.test(t.name);
    const r = await battle(this, { foeTeam: foe, trainer: t, canCatch: false, bg: t.bg || (this.ow.M.gym ? 'arena' : this.ow.M.cave ? 'hoehle' : 'gras') });
    await this.afterBattle(r, t.noBlackout);
    return r.result === 'win';
  }
  async trainerBattle(n) {
    const tr = n.trainer;
    await say(tr.lines, { name: n.name });
    const won = await this.trainerFight({ name: n.name, look: n.look, team: tr.team, reward: tr.reward, lose: tr.lose, bg: this.ow.M.bg, double: DUO.DOUBLE.has(n.id) });
    if (won) { this.state.flags[n.id] = true; await this.story(); }
  }
  async afterBattle(r, noBlackout) {
    const s = this.state;
    this.ow.music();
    if (r.result === 'caught') {
      const m = r.caught; m.status = null; delete m._fainted;
      const isNew = !s.dex.caught[m.sp];
      this.markDex(m.sp, true);
      await fade(0, 150);
      if (isNew) {
        await say(`Die Daten von ${SPECIES[m.sp].name} werden in der Chronik eingetragen.`);
        await dexEntry(m.sp, Object.keys(s.dex.caught).filter(id => !SPECIES[id]?.fusion).length);
      }
      if (genderOf(m)) await say(`${SPECIES[m.sp].name} ist ein${genderOf(m) === 1 ? ' Männchen ♂' : ' Weibchen ♀'}.`);
      if (await ask(`Möchtest du ${SPECIES[m.sp].name} einen Spitznamen geben?`)) m.nick = await inputName('Spitzname', SPECIES[m.sp].name);
      await ST.onCaught(this, m);
      if (s.team.length < 6) s.team.push(m); else { s.box.push(m); await say(`${monName(m)} wurde in die Box im Heilzentrum geschickt.`); }
      if (isNew) await this.dexRewards();
    }
    for (const m of s.team) delete m._fainted;
    await ST.afterBattleHook(this, r);
    if (r.result === 'lose' && noBlackout) { s.team.forEach(healMon); await fade(0, 150); }
    else if (r.result === 'lose') {
      const lost = Math.floor(s.money / 4); s.money -= lost;
      await fade(1, 400);
      const hp = s.healPoint || { map: 'home', x: 2, y: 3 };
      this.ow.load(hp.map, hp.x, hp.y, 'down');
      s.team.forEach(healMon);
      await fade(0, 400);
      await say(`Du hast dich schnell zurückgezogen und ${lost} ◈ verloren. Deine Kreaturen wurden geheilt.`);
    } else await fade(0, 150);
    this.ow.busy = false; this.save(true);
  }

  // ---------------------------------------------------------- Interaktionen
  async pickup(it) {
    const s = this.state; s.flags[it.id] = true; s.bag[it.item] = (s.bag[it.item] || 0) + it.n; sfx('caught');
    await say(`${s.name} findet ${it.n > 1 ? it.n + '× ' : ''}${ITEMS[it.item].name}!`);
    if (it.item === 'ball52') { sfx('shiny'); const n = Object.keys(s.flags).filter(k => k.startsWith('it_b52_')).length; await say([`Ein echter 52-Ball! Er fängt jede Kreatur – garantiert.`, `Das ist Nummer ${n} von 11. Die anderen liegen unsichtbar an abgelegenen Orten – manche zeigen sich erst mit mehr Orden.`, 'Steht man direkt daneben, funkelt es ganz kurz. Augen auf!']); }
  }
  async rest() { await say('Du legst dich kurz hin…'); await fade(1, 300); this.state.team.forEach(healMon); sfx('heal'); await fade(0, 300); await say('Du fühlst dich erholt! Dein Team ist geheilt.'); }
  async heal(who) {
    const s = this.state;
    await say(['Willkommen im Heilzentrum!', 'Ich kümmere mich kurz um deine Kreaturen…'], { name: who });
    await healAnim(s.team.length);
    s.team.forEach(healMon);
    s.healPoint = { ...(s.ret || {}), map: s.ret?.map || 'muschelbucht' };
    await say('Deine Kreaturen sind wieder topfit. Komm jederzeit wieder!', { name: who });
    const sw = this.swarm();
    if (!s.dex.caught[sw.sp]) await say(`Übrigens: Heute wurden in ${sw.name} auffällig viele ${SPECIES[sw.sp].name} gesehen!`, { name: who });
  }
  async shop(list = SHOP, who = 'Verkäufer', hello = 'Willkommen! Was darf es sein?') {
    const s = this.state;
    await say(hello, { name: who });
    for (;;) {
      const SH = list.filter(e => !(e[2] > s.badges.filter(Boolean).length));
      const i = await choose([...SH.map(([k, p]) => ({ label: ITEMS[k].name, right: p + '◈', disabled: s.money < p, desc: ITEMS[k].desc })), 'Fertig'], { title: `Geld: ${s.money} ◈`, above: false, x: 60, w: 176 });
      if (i === null || i === SH.length) break;
      const [k, p] = SH[i];
      const n = await choose(['1 Stück', '5 Stück', '10 Stück'].map((l, j) => ({ label: l, right: [1, 5, 10][j] * p + '◈', disabled: s.money < [1, 5, 10][j] * p })), { title: ITEMS[k].name });
      if (n === null) continue;
      const q = [1, 5, 10][n]; s.money -= q * p; s.bag[k] = (s.bag[k] || 0) + q; sfx('caught');
      await say(`Hier sind ${q}× ${ITEMS[k].name}. Vielen Dank!`, { name: who });
    }
  }
  // ---------------------------------------------------------- Geheimbasis
  async baseSpot(sp) {
    const s = this.state;
    if (s.base && s.base.map === sp.map) return this.enterBase();
    await say((sp.theme === 'fels' ? 'Ein schmaler Spalt im Fels.' : sp.theme === 'schnee' ? 'Eine Höhle unter dem verschneiten Baum.' : 'Ein hohler Baum, dicht mit Ranken bewachsen.') + ' Dahinter scheint viel Platz zu sein …');
    if (!s.flags.basisset) {
      await say(['Dein Funkgerät klingelt …', 'Dr. Vato: Ein geheimer Platz? Daraus kannst du dir eine Geheimbasis bauen!', 'Dr. Vato: Ich schicke dir mein altes Basis-Set – und ein paar Möbel zum Einzug!']);
      s.flags.basisset = true; s.decor ||= {}; for (const k of ['stuhl', 'tisch', 'pflanze', 'teppich_rot', 'pluesch']) s.decor[k] = (s.decor[k] || 0) + 1;
      sfx('caught'); await say(`${s.name} erhält das Basis-Set und 5 Möbel!`);
    }
    if (s.base) { if (!await ask(`Deine Basis ist auf ${MAPS[s.base.map].name}. Hierher umziehen? Die Möbel kommen mit.`)) return; }
    else if (!await ask('Hier eine Geheimbasis einrichten?')) return;
    s.base = { map: sp.map, x: sp.x, y: sp.y, theme: sp.theme, items: s.base?.items || [] };
    sfx('lvl'); await say('Du hast deine Geheimbasis eingerichtet!'); this.save(true);
    await this.enterBase();
    if (!s.flags.basisTip) { s.flags.basisTip = true; await say('Am PC in der Ecke kannst du Möbel aufstellen, neue bestellen und deinen Basis-Code mit Freunden teilen.'); }
  }
  async enterBase() {
    const s = this.state, b = s.base;
    s.ret = { map: b.map, x: b.x, y: b.y + 1 };
    MAPS.basis = baseMap(b.theme, `${s.name}s Geheimbasis`, b.items);
    sfx('open'); await this.ow.warp('basis', 4, 6, 'up');
  }
  async baseMenu() {
    const s = this.state; s.decor ||= {};
    for (;;) {
      const i = await choose([{ label: 'Möbel aufstellen', desc: 'Möbel aus deinem Lager im Raum platzieren.' }, { label: 'Möbel wegräumen', desc: 'Aufgestellte Möbel zurück ins Lager legen.' }, { label: 'Möbel-Katalog', desc: 'Neue Möbel bestellen. Sie kommen sofort ins Lager.' }, { label: 'Basis-Code teilen', desc: 'Freunde können damit deine Basis besuchen und gegen dein Team kämpfen.' }, { label: 'Freund besuchen', desc: 'Basis-Code eines Freundes eingeben.' }, { label: 'Kreaturen-Box', desc: 'Kreaturen ablegen oder ins Team holen.' }, 'Tschüss'], { title: 'BASIS-PC' });
      if (i === null || i === 6) return;
      if (i === 0) {
        const ks = Object.keys(DECOR).filter(k => s.decor[k] > 0);
        if (!ks.length) { await say('Dein Lager ist leer. Bestelle neue Möbel im Katalog!'); continue; }
        const c = await choose(ks.map(k => ({ label: DECOR[k].name, right: '×' + s.decor[k] })), { title: 'LAGER', max: 7 }); if (c === null) continue;
        const k = ks[c]; let sp;
        if (DECOR[k].plush) {
          const caught = Object.keys(s.dex.caught).filter(id => SPECIES[id] && !SPECIES[id].fusion);
          const lead = s.team.find(m => !m.egg)?.sp; if (lead && !caught.includes(lead)) caught.unshift(lead);
          const j = await choose(caught.map(id => SPECIES[id].name), { title: 'Welche Kreatur?', max: 7 }); if (j === null) continue; sp = caught[j];
        }
        const pos = await placeDecor(this.ow, k, sp);
        if (pos) { s.base.items.push({ d: k, x: pos.x, y: pos.y, sp }); s.decor[k]--; this.save(true); }
      } else if (i === 1) {
        const L = s.base.items; if (!L.length) { await say('Es stehen noch keine Möbel in deiner Basis.'); continue; }
        const c = await choose(L.map(it => ({ label: DECOR[it.d].name + (it.sp ? ` (${SPECIES[it.sp]?.name})` : '') })), { title: 'WEGRÄUMEN', max: 7 }); if (c === null) continue;
        const it = L.splice(c, 1)[0]; s.decor[it.d] = (s.decor[it.d] || 0) + 1; sfx('click'); this.save(true);
      } else if (i === 2) {
        const ks = Object.keys(DECOR);
        for (;;) {
          const c = await choose([...ks.map(k => ({ label: DECOR[k].name, right: DECOR[k].price + '◈', disabled: s.money < DECOR[k].price })), 'Fertig'], { title: `Geld: ${s.money} ◈`, max: 7, w: 176 });
          if (c === null || c === ks.length) break;
          const k = ks[c]; if (s.money < DECOR[k].price) continue;
          s.money -= DECOR[k].price; s.decor[k] = (s.decor[k] || 0) + 1; sfx('caught'); await say(`${DECOR[k].name} wurde ins Lager geliefert!`);
        }
      } else if (i === 3) {
        const code = encodeBase(s);
        await say('Schick deinen Basis-Code an Freunde – mit „Teilen“ direkt per WhatsApp & Co. Sie können damit deine Basis besuchen und gegen dein Team kämpfen.');
        await inputName('Dein Basis-Code', code, 6000, { share: true });
      } else if (i === 4) {
        const code = await inputName('Basis-Code eingeben', '', 6000); if (!code) continue;
        const o = decodeBase(code);
        if (!o) { sfx('weak'); await say('Dieser Code funktioniert leider nicht.'); continue; }
        o.t = o.t.filter(([sp]) => SPECIES[sp]); if (!o.t.length) o.t = [['glibbo', 5]];
        const M = baseMap(o.th, `${o.n}s Geheimbasis`, o.d); MAPS.gast = M;
        let nx = 4, ny = 3; for (const [x, y] of [[4, 3], [5, 3], [3, 3], [6, 3], [4, 2], [5, 4], [2, 4], [7, 4]]) if (!decorAt(o.d, x, y)) { nx = x; ny = y; break; }
        M.npcs = [{ id: 'gast_owner', x: nx, y: ny, dir: 'down', look: o.l, name: o.n }];
        this._gast = o; await this.ow.warp('gast', 4, 6, 'up'); return;
      } else if (i === 5) { await this.pcBox(); }
    }
  }
  async decorTalk(d) {
    const s = this.state, N = DECOR[d.d].name, own = this.ow.id === 'basis';
    switch (d.d) {
      case 'bett': if (own) return this.rest(); return say('Ein gemütliches Bett. Es ist nicht deins …');
      case 'fernseher': return say(['Im Fernsehen läuft eine Sendung über Kreaturen-Spuren im hohen Gras.', 'Nachrichten: „Glänzende Kreaturen sollen bei Massenausbrüchen häufiger sein!“', 'Eine Kochsendung: „Heute – Beeren-Kuchen für Kreaturen!“'][Math.floor(Math.random() * 3)]);
      case 'aquarium': return say('Kleine bunte Fische ziehen ihre Kreise.');
      case 'pluesch': case 'poster': return say(`Ein${d.d === 'poster' ? ' Poster' : 'e Plüschfigur'} von ${SPECIES[d.sp]?.name || 'einer Kreatur'}. ${d.d === 'pluesch' ? 'Total kuschelig!' : 'Sieht cool aus!'}`);
      case 'pokal': return say(own ? `Ein glänzender Pokal. ${s.badges.filter(Boolean).length} Orden sind eingraviert.` : 'Ein glänzender Pokal voller Orden.');
      case 'statue': return say('Die Kristallstatue funkelt in allen Farben.');
      case 'regal': return say('„Geheimbasen für Anfänger – Band 1“');
      default: return say(`${N}.`);
    }
  }
  async visitFight(n) {
    const s = this.state, o = this._gast, N = { name: n.name };
    if (!o) return say('…', N);
    await say(['Willkommen in meiner Geheimbasis!', 'Lust auf einen Kampf gegen mein Team?'], N);
    if (!await ask('Kämpfen?')) return say('Komm jederzeit wieder vorbei!', N);
    const won = await this.trainerFight({ name: n.name, look: o.l, team: o.t.map(([sp, l]) => [sp, l]), reward: 0, lose: 'Wow – du bist wirklich stark!', noBlackout: true, bg: 'arena' });
    const key = 'gast_' + Math.floor(Date.now() / 864e5) + '_' + n.name;
    if (won && !s.flags[key]) {
      s.flags[key] = true; const ks = Object.keys(DECOR), k = ks[Math.floor(Math.random() * ks.length)];
      s.money += 1000; s.decor ||= {}; s.decor[k] = (s.decor[k] || 0) + 1; sfx('caught');
      await say([`${n.name}: Als Andenken schenke ich dir etwas für deine Basis!`, `${s.name} erhält 1000 ◈ und: ${DECOR[k].name}!`]);
    } else if (won) await say('Heute hast du schon ein Geschenk bekommen. Komm morgen wieder!', N);
  }
  async pc() {
    if (this.ow.id === 'basis') return this.baseMenu();
    return this.pcBox(true);
  }
  async pcBox(intro) {
    if (intro) await say(`${this.state.name} schaltet den PC ein. Kreaturen-Box geöffnet.`);
    await boxScreen(this);
  }

  async fish() {
    return ST.fishGame(this);
    const s = this.state;
    if (!s.bag.angel) return say('Das Wasser ist glasklar. Mit einer Angel könnte man hier etwas fangen.');
    if (!s.team.some(m => !m.egg && m.hp > 0)) return say('Deine Kreaturen sind zu erschöpft.');
    await say('Du wirfst die Angel aus…');
    await wait(600 + Math.random() * 1400);
    if (Math.random() < 0.3) return say('Nichts beißt an…');
    sfx('encounter'); await say('Oh! Etwas beißt an!');
    await this.wildBattle(this.ow.M.fishEnc || 'wasser', 'wasser');
  }
  // Surfen: erste kampffähige Wasser-Kreatur im Team zieht dich übers Wasser
  surfMon() { const s = this.state; return (s.bag.vk_surfer && this.knows('surfer')) || s.team.find(m => !m.egg && m.hp > 0 && SPECIES[m.sp].types.includes('wasser')); }
  async water(x, y) {
    const s = this.state;
    if (this.ow.M.indoor) return say('Im Becken der Arena ist Surfen verboten – nimm die Stege!');
    if (!s.bag.wellenreiter) return this.fish();
    const sm = this.surfMon();
    const opts = [...(sm ? ['Surfen'] : []), ...(s.bag.angel ? ['Angeln'] : []), 'Nichts'];
    if (!sm) await say('Mit dem Wellenreiter könntest du surfen – dazu brauchst du eine Kreatur mit SURFER (VM03) oder eine Wasser-Kreatur im Team.');
    const c = await choose(opts, { title: 'Wasser' });
    if (c === null || opts[c] === 'Nichts') return;
    if (opts[c] === 'Angeln') return this.fish();
    await say(`${monName(sm)} zieht dich auf dem Wellenreiter übers Wasser!`);
    cry(SPECIES[sm.sp].cry);
    const p = this.ow.p; p.surf = true; s.surf = true;
    this.ow.startMove(x, y, false);
  }
  async rune(id) {
    return ST.songStone(this, id);
    const s = this.state;
    if (s.flags[id]) return say('Der Runenstein leuchtet in einem ruhigen, grünen Licht.');
    await say(['Ein uralter Stein mit einer eingeritzten Rune.', 'Du legst deine Hand darauf…']);
    s.flags[id] = true; sfx('rune');
    s.bag.sternkristall = (s.bag.sternkristall || 0) + 1;
    const n = ['rune_nord', 'rune_insel', 'rune_hain'].filter(r => s.flags[r]).length;
    await say([`Die Rune beginnt zu leuchten! (${n}/3)`, 'Am Fuß des Steins liegt ein Sternball!']);
    if (n === 3) await say('Ein tiefes Summen geht durch den ganzen Wald… Der Altar in den Ruinen ruft dich – bei Nacht.');
  }
  async altar() {
    return ST.altarStory(this);
    if (this.ow.id === 'mondruine') return this.moonAltar();
    if (this.ow.id === 'tempel') return this.sunAltar();
    const s = this.state, n = ['rune_nord', 'rune_insel', 'rune_hain'].filter(r => s.flags[r]).length;
    if (n < 3) return say(['Ein uralter Altar mit einem matten Kristall.', '„Drei Steine, drei Lieder: Einer wacht im Norden über die Ruinen, einer ruht auf einer Insel im Wasser, einer schläft im westlichen Dickicht.“', `Leuchtende Runen: ${n}/3`]);
    if (s.flags.sylvaron) return say('Der Kristall pulsiert sanft. Der Wald ist ruhig.');
    if (!this.isNight()) return say(['Der Kristall leuchtet hell, doch nichts geschieht.', 'Vielleicht muss man warten, bis die Sterne über dem Altwald stehen…']);
    await say(['Der Boden bebt! Das Licht des Kristalls schießt in den Himmel…', 'Zwischen den Säulen erscheint eine gewaltige Gestalt mit leuchtendem Geweih!']);
    const r = await this.wildBattle(null, 'ruine', createMon('sylvaron', 25));
    if (r?.result === 'caught') { s.flags.sylvaron = true; await say('Der Hüter des Waldes hat dich erwählt!'); }
    else if (r?.result === 'win') await say('Sylvaron löst sich in tausend Lichter auf… Es wird in einer anderen Nacht zurückkehren.');
  }
  // Starterwahl (Prolog am Strand): Vorschau, Chronik-Text, Spitzname
  async pickStarter() {
    const s = this.state;
    for (;;) {
      const i = await choose(STARTERS.map(id => ({ label: SPECIES[id].name, right: SPECIES[id].types[0].toUpperCase(), desc: SPECIES[id].lore })), { title: 'Welche Kugel?', cancel: false });
      const sp = STARTERS[i], S = SPECIES[sp];
      const pv = new Preview(sp); push(pv); cry(S.cry);
      await say(S.lore);
      const yes = await ask(`${S.name} als Partner wählen?`);
      pop(pv);
      if (!yes) continue;
      const m = createMon(sp, 5, Math.random, { friendship: 120 });
      s.team.push(m); this.markDex(sp, true); sfx('caught');
      await say(`${s.name} hat ${S.name} als Partner gewählt!`);
      if (await ask(`Möchtest du ${S.name} einen Spitznamen geben?`)) m.nick = await inputName('Spitzname', S.name);
      return sp;
    }
  }
  async orbs() {
    const s = this.state;
    if (s.flags.starter) return say('Auf dem Tisch liegen nur noch zwei Bälle. Die gehören Dr. Vato.');
    if (!s.flags.lindeTalked) return say('Drei Bälle liegen auf dem Tisch. Vielleicht sollte ich zuerst mit Dr. Vato sprechen.');
    for (;;) {
      const i = await choose(STARTERS.map(id => ({ label: SPECIES[id].name, right: SPECIES[id].types[0].toUpperCase() })), { title: 'Welcher Ball?' });
      if (i === null) return;
      const sp = STARTERS[i], S = SPECIES[sp];
      const pv = new Preview(sp); push(pv); cry(S.cry);
      await say(S.lore);
      const yes = await ask(`Möchtest du ${S.name} als Partner?`);
      pop(pv);
      if (!yes) continue;
      const m = createMon(sp, 5, Math.random, { friendship: 120 });
      s.team.push(m); s.flags.starter = sp; this.markDex(sp, true); sfx('caught');
      await say(`${s.name} hat ${S.name} als Partner gewählt!`);
      if (await ask(`Möchtest du ${S.name} einen Spitznamen geben?`)) m.nick = await inputName('Spitzname', S.name);
      // Rivale
      const kian = this.ow.npcs.find(n => n.id === 'kian_lab');
      if (kian) {
        const opp = this.counterOf();
        await say([`Kian: Dann nehme ich ${SPECIES[opp].name}!`, 'Kian: Und jetzt zeig mal, was dein Partner kann!']);
        await this.ow.npcWalkTo(kian, this.ow.p.x + 1, this.ow.p.y);
        const won = await this.trainerFight({ name: 'Rivale Kian', look: LOOK.kian, team: [[opp, 5]], reward: 300, lose: 'Was? Ich hab verloren?! Na warte…', noBlackout: true });
        s.team.forEach(healMon);
        await say(won ? 'Kian: Glück gehabt! Beim nächsten Mal gewinne ich. Bis später!' : 'Kian: Ha! Ich bin eben ein Naturtalent. Bis später!');
        s.flags.kian1 = true;
        this.ow.npcs = this.ow.npcs.filter(n => n !== kian);
      }
      await say(['Dr. Vato: Fantastisch! Hier, nimm diese Chronik – sie zeichnet jede Kreatur auf, die du siehst oder bindest.', 'Und 5 Bindbälle! Schwäche wilde Kreaturen und wirf dann einen Ball.', 'In Quellbach, nördlich von hier, gibt es ein Heilzentrum und eine Brutstätte. Dort entstehen aus zwei Kreaturen sogar neue Mutationen!'], {});
      s.flags.dex = true; s.flags.gotBalls = true; s.bag.kristall = (s.bag.kristall || 0) + 5; sfx('lvl');
      this.save(true);
      return;
    }
  }

  // ---------------------------------------------------------- Gespräche
  async talk(n) {
    const s = this.state, N = { name: n.name };
    if (n.alpha) return this.alphaBattle(n);
    if (n.revier) return this.revierBattle(n);
    if (n.trainer && n.trainer.e4) return this.ligaTrainer?.(n);
    if (n.shy) return this.feedShy(n);
    if (n.trainer) { if (s.flags[n.id]) return say(n.trainer.after || n.trainer.lose || 'Guter Kampf!', N); return this.trainerBattle(n); }
    { const run = Object.entries(QUESTS).find(([qid, q]) => q.next?.to === n.id && s.flags['qreq_' + qid] && !s.flags['qn_' + qid]); if (run) return this.questRun(n, run[0], run[1]); }
    if (QUESTS[n.id]) return this.quest(n, QUESTS[n.id]);
    { const r = await ST.talkStory(this, n); if (r !== false) return r; }
    switch (n.id) {
      case 'nia': return this.heal('Heilerin Nia');
      case 'clerk': return this.shop();
      case 'hilde': return this.daycare(n);
      default: return say('…', N);
    }
  }

  // ---------------------------------------------------------- Story-Ereignisse nach Trainerkämpfen
  async story() { return ST.afterTrainer(this); }

  // ---------------------------------------------------------- Doppel- und Koop-Kämpfe
  async coopNpc(id, n) {
    const d = COOP[id], s = this.state, N = { name: d.name };
    if (s.flags['coop_' + id]) return say(id === 'koloss' ? 'Hier liegt nur noch Geröll. Der Gang ist frei.' : ['Ria: Das war knapp!', 'Rio: Komm wieder, wenn du einen Freund mitbringst – zu viert macht es noch mehr Spaß!'], N);
    await say(d.intro, N);
    const partners = this.online.on ? this.online.partners() : [];
    const opts = [...partners.map(p => ({ label: `Mit ${p.name}`.slice(0, 16), p })), ...(d.solo ? [{ label: 'Allein (2 Kreaturen)' }] : []), { label: 'Später' }];
    if (opts.length === 1) return say(this.online.on ? 'Kein Mitspieler auf dieser Karte. Holt euch zu zweit hierher!' : 'Zu zweit geht das nur online: START → ONLINE.', N);
    const c = await choose(opts.map(o => o.label), { title: 'Kämpfen' });
    if (c === null || opts[c].label === 'Später') return;
    if (opts[c].p) { await this.online.coop(id, opts[c].p); return; }
    if (s.team.filter(m => !m.egg && m.hp > 0).length < 2) return say('Du brauchst zwei kampffähige Kreaturen für einen Doppelkampf!');
    sfx('encounter'); await this.flashIn();
    const b = localDouble(this, foeSlots(id));
    b.ids().filter(x => x[0] === 'f').forEach(x => this.markDex(b.mon(x).sp));
    const r = await doubleBattle(this, { b, mine: ['p0', 'p1'], bg: d.bg, title: d.name, boss: !!d.boss, trainers: d.looks?.map(look => ({ look })), ownLooks: [s.look] });
    if (r.result === 'win') { this.ow.music(); await this.coopReward(id); }
    await this.afterBattle(r);
  }
  async finale() {
    const s = this.state;
    this.ow.npcs = this.ow.npcs.filter(x => !['nyx3', 'lyra3'].includes(x.id));
    await say(['Nyx ist verschwunden. Nur Lyra bleibt einen Moment stehen.', 'Lyra: Du kämpfst für Leute, die du nicht einmal kennst. Warum?', 'Lyra: … Vielleicht habe ich mich geirrt. Vielleicht auch nicht. Ich muss nachdenken.', 'Lyra geht, ohne sich umzudrehen.'], { name: 'Eisgrotte' });
    s.bag.herzstein_eis = 1; sfx('caught');
    await say([`${s.name} nimmt den EIS-HERZSTEIN vom Altar!`, 'Zwei von sieben Herzsteinen sind jetzt in Sicherheit.', '(Ende von Phase 3! Als Nächstes: Phase 4 mit Nocturna, Solaria und Drakmor, den Arenen 5–8 und der Top 4.)']);
    this.save(true);
  }
  async coopReward(id) {
    const d = COOP[id], s = this.state;
    if (d.raid) return this.raidReward(id);
    if (s.flags['coop_' + id]) { await say('Super Kampf! (Die Belohnung gab es schon.)'); return; }
    s.flags['coop_' + id] = true;
    if (d.lose) await say(d.lose);
    s.money += d.reward; await say(`Du erhältst ${d.reward} ◈ Preisgeld!`);
    if (d.item) { s.bag[d.item[0]] = (s.bag[d.item[0]] || 0) + d.item[1]; sfx('caught'); await say(`Du findest ${d.item[1]}× ${ITEMS[d.item[0]].name}!`); }
    if (id === 'koloss') this.ow.npcs = this.ow.npcs.filter(x => x.id !== 'koloss');
    if (id === 'finale') await this.finale();
  }

  // ---------------------------------------------------------- Phase 4.4: Lyras Entscheidung, Kian, Liga, Umbras Ende
  spawn(id, name, look, x, y, dir) { const n = { id, name, look, x, y, dir, px: x * 16, py: y * 16, moving: false, step: 0 }; this.ow.npcs.push(n); return n; }
  async lyraDecision() {
    const s = this.state, ow = this.ow, p = ow.p;
    ow.busy = true; p.dir = 'up';
    const ly = this.spawn('lyra5', 'Lyra', LOOK.lyra, 3, 1, 'right');
    await say('Eine Stimme ruft: Warte!');
    await ow.npcWalkTo(ly, 9, 1); ly.dir = 'right'; p.dir = 'left';
    const L = { name: 'Lyra' };
    await say(['Lyra: Seit der Eisgrotte habe ich über alles nachgedacht.', 'Lyra: Umbra will die Zeit anhalten, damit nie wieder etwas verloren geht. Aber dann würde auch nie wieder etwas Neues beginnen.', 'Lyra: Kein erster Schnee, kein Ei, das schlüpft. Kein Wiedersehen.', 'Lyra: Ich habe mich entschieden. Ich stehe auf deiner Seite.'], L);
    const nyx = this.spawn('nyx5', 'Kommandantin Nyx', LOOK.nyx, 18, 1, 'left');
    ow.emote = { n: nyx, t: 0.8 }; sfx('encounter');
    await ow.npcWalkTo(nyx, 12, 1);
    const vx = this.spawn('vorax', 'Elite Vorax', LOOK.grunt, 18, 1, 'left');
    await ow.npcWalkTo(vx, 13, 1); p.dir = 'right';
    await say(['Nyx: Wie rührend. Die Verräterin und das Kind.', 'Nyx: Umbra ist schon auf dem Weg zur Liga. Der Champion hütet die beiden ältesten Herzsteine – Zeit und Ursprung.', 'Nyx: Vorax und ich sorgen dafür, dass ihr nie dort ankommt!'], { name: 'Kommandantin Nyx' });
    await say('Lyra: Zusammen – so wie damals in der Eisgrotte. Nur diesmal auf der richtigen Seite!', L);
    if (!s.team.some(m => !m.egg && m.hp > 0)) { ow.busy = false; return; }
    const rnd = mulberry(4711), mk = t => t.map(([sp, l]) => createMon(sp, l, rnd));
    const b = new DoubleBattle({ slots: {
      p0: { pool: s.team, owner: s.name },
      p1: { pool: mk([['kaiserpingu', 53], ['geisterflosse', 53], ['polarfuchs', 54]]), owner: 'Lyra', ai: true },
      f0: { pool: mk([['nachtmahr', 52], ['finsterfuchs', 53], ['magmawurm', 54]]), owner: 'Nyx', ai: true },
      f1: { pool: mk([['wyvernix', 52], ['grabwurm', 53], ['zackenruecken', 54]]), owner: 'Vorax', ai: true },
    } });
    sfx('encounter'); await this.flashIn();
    const r = await doubleBattle(this, { b, mine: ['p0'], bg: 'berg', music: 'boss', title: 'Nyx & Vorax', trainers: [{ look: LOOK.nyx }, { look: LOOK.grunt }], ownLooks: [s.look, LOOK.lyra] });
    if (r.result !== 'win') {
      ow.npcs = ow.npcs.filter(n => !['lyra5', 'nyx5', 'vorax'].includes(n.id));
      await this.afterBattle(r);
      if (ow.id === 'drachenhort') await say('Lyra ruft dir nach: Wir versuchen es noch einmal!');
      return;
    }
    await this.afterBattle(r); ow.busy = true;
    s.money += 6000; await say('Du erhältst 6000 ◈ Preisgeld!');
    await say(['Nyx: … Ich habe immer gewonnen, wenn es darauf ankam. Bis du kamst.', 'Nyx: Umbra wartet in der Champion-Halle der Liga, hinter der Siegesstraße.', 'Nyx: Ich bin fertig mit ihm. Und mit Team Eklipse.'], { name: 'Kommandantin Nyx' });
    await fade(1, 300); ow.npcs = ow.npcs.filter(n => !['nyx5', 'vorax'].includes(n.id)); await fade(0, 300);
    await say('Lyra: Komm, ich heile deine Kreaturen.', L);
    await fade(0.6, 200); sfx('heal'); s.team.forEach(healMon); await wait(700); await fade(0, 200);
    await say(['Lyra: Die Siegesstraße ist der härteste Weg der Welt. Ich gehe vor und warne die Liga.', 'Lyra: Wir sehen uns oben!'], L);
    await fade(1, 300); s.flags.lyra5 = true; ow.npcs = ow.npcs.filter(n => n.id !== 'lyra5'); await fade(0, 300);
    ow.busy = false; this.save(true);
  }
  async kianFinal() {
    const s = this.state, ow = this.ow, p = ow.p;
    if (!s.flags.kian2 || !s.team.some(m => !m.egg && m.hp > 0)) return;
    await wait(450); ow.busy = true;
    const n = this.spawn('kian3', 'Kian', LOOK.kian, 11, 7, 'down');
    ow.emote = { n, t: 0.8 }; sfx('encounter'); await this.cutIn(n);
    await ow.npcWalkTo(n, p.x, p.y - 1); n.dir = 'down'; p.dir = 'up';
    const K = { name: 'Kian' };
    await say(['Kian: Da bist du ja endlich! Ich habe auch alle acht Orden.', 'Kian: Seit dem Labor laufe ich dir hinterher. Bevor du in die Liga gehst, will ich es wissen.', 'Kian: Ein letztes Mal – du gegen mich!'], K);
    const fin = { funkfux: 'glutfux', tropfmolch: 'gezeitenmolch', sprossling: 'knorrwurz' }[this.counterOf()] || 'glutfux';
    const won = await this.trainerFight({ name: 'Rivale Kian', look: LOOK.kian, team: [['vampyra', 53], ['wogenross', 54], ['hornkoloss', 54], ['donnerfalter', 54], [fin, 56]], reward: 5600, lose: 'Wieder du… Aber diesmal war es knapp, oder?', bg: 'berg' });
    s.flags.kian3 = true;
    if (won) await say(['Kian: Du warst immer einen Schritt voraus. Weißt du was? Das ist okay.', 'Kian: Geh in die Liga und zeig ihnen, was in dir steckt. Ich feuere dich an!'], K);
    else await say(['Kian: Ha! Endlich! … Aber die Top 4 sind härter als ich. Trainier weiter!'], K);
    ow.npcs = ow.npcs.filter(x => x !== n);
    ow.busy = false; this.save(true);
  }
  async lyraHeal() {
    const s = this.state, ow = this.ow;
    await wait(450); ow.busy = true;
    const ly = this.spawn('lyra_h', 'Lyra', LOOK.lyra, 7, 11, 'left'); ow.p.dir = 'right';
    await say(['Lyra: Warte! Ich bin dir durch die Liga gefolgt.', 'Lyra: Umbra steht da vorne. Gegen ihn brauchst du jede Kreatur in Bestform.'], { name: 'Lyra' });
    await fade(0.6, 200); sfx('heal'); s.team.forEach(healMon); await wait(700); await fade(0, 200);
    await say(['Dein Team wurde vollständig geheilt!', 'Lyra: Ich halte hier die Tür. Geh!']);
    ow.npcs = ow.npcs.filter(x => x !== ly); ow.p.dir = 'up';
    ow.busy = false;
  }
  async liga(n) {
    const s = this.state, N = { name: n.name }, L = LIGA[n.id];
    if (n.id === 'aurin' && !s.flags.umbra_end) return say(['Aurin: Umbra… Er hat mich im Schlaf der Zeit gefangen und die Steine genommen.', 'Aurin: Halte ihn auf!'], N);
    if (s.flags[n.id]) return say(L.after, N);
    await say(L.intro, N);
    const won = await this.trainerFight({ name: n.name, look: n.look, team: L.team, reward: L.reward, lose: L.lose, bg: 'liga' });
    if (!won) return;
    s.flags[n.id] = true;
    if (n.id === 'aurin') return this.hallOfFame();
    sfx('lvl'); G.shake = 0.3;
    await say([L.after, 'Das Tor im Norden hat sich geöffnet!'], N);
    this.save(true);
  }
  async umbraEnd() {
    const s = this.state, ow = this.ow, U = { name: 'Umbra' };
    ow.busy = true; await this.cutIn('umbra2');
    await say(['Umbra: Ich habe die Zeit in meinen Händen gehalten…', 'Umbra: Und trotzdem rinnt sie mir durch die Finger.'], U);
    for (let i = 0; i < 3; i++) { await fade(0.9, 120); await fade(0, 120); }
    sfx('evo'); G.shake = 1;
    await say(['Die Herzsteine leuchten auf! Für einen Augenblick steht alles still…', 'Kein Laut. Kein Wind. Nicht einmal ein Herzschlag.', '…dann schlägt die Zeit weiter.']);
    await say(['Umbra: Sie gehorchen mir nicht. Sie haben dich gewählt.', 'Umbra: Ich wollte, dass nie wieder etwas verloren geht. Aber ich habe vergessen, dass man nur verlieren kann, was man einmal hatte.', 'Umbra: Nimm sie. Alle sieben gehören zusammen.'], U);
    s.bag.herzstein_zeit = 1; s.bag.herzstein_ursprung = 1; sfx('caught');
    await say([`${s.name} erhält den ZEIT-HERZSTEIN und den URSPRUNGS-HERZSTEIN!`, 'Alle sieben Herzsteine sind jetzt vereint – und in Sicherheit.']);
    const ly = this.spawn('lyra6', 'Lyra', LOOK.lyra, 6, 11, 'up');
    await ow.npcWalkTo(ly, 6, 6); ly.dir = 'up';
    await say(['Lyra: Es ist vorbei, Umbra. Komm mit.', 'Lyra: Die Welt zerfällt nicht. Sie verändert sich nur.'], { name: 'Lyra' });
    await say('Umbra: … Vielleicht ist das dasselbe. Vielleicht auch nicht. Ich werde es herausfinden.', U);
    await fade(1, 400); ow.npcs = ow.npcs.filter(n => !['lyra6', 'umbra2'].includes(n.id)); s.flags.umbra_end = true; await fade(0, 400);
    await say(['Aurin: Danke. Umbra hat mich mit dem Schlaf der Zeit überrascht, bevor ich kämpfen konnte.', 'Aurin: Lass mich deine Kreaturen heilen. Du sollst mich nicht geschwächt herausfordern.'], { name: 'Champion Aurin' });
    await fade(0.6, 200); sfx('heal'); s.team.forEach(healMon); await wait(800); await fade(0, 200);
    await say('Aurin: Sprich mich an, wenn du bereit bist.', { name: 'Champion Aurin' });
    ow.busy = false; this.save(true);
  }
  async hallOfFame() {
    const s = this.state, first = !s.flags.champion;
    s.flags.champion = true; s.hof = (s.hof || 0) + 1;
    await say(['Brann: Komm mit. Es ist Zeit, dich in der Ruhmeshalle von Kalmara zu verewigen.']);
    await fade(1, 500);
    await new Promise(res => { push(new HallScene(this, res)); fade(0, 300); });
    await ST.afterChampion(this, first);
    this.save(true);
  }

  // ---------------------------------------------------------- Phase 4.5: Postgame, Hüter
  async lindeSecret(n) {
    const s = this.state, N = { name: n.name };
    await say([`${s.name}… Champion. Ich bin so stolz auf dich.`, 'Aber ich schulde dir die Wahrheit.', 'Vor vielen Jahren habe ich zusammen mit Umbra Team Eklipse gegründet.', 'Wir wollten die Herzsteine erforschen, nicht missbrauchen. Als Umbra davon sprach, die Zeit anzuhalten, bin ich gegangen.', 'Deshalb erforsche ich Mutationen. Ich wollte beweisen, dass Veränderung etwas Gutes ist.'], N);
    await say(['Und jetzt hast du alle sieben Herzsteine vereint. Damit sind die vier schlafenden Hüter erwacht.', 'Ignarok im Krater von Ignis, Maristra in einer Grotte vor Route 4, Boreon auf dem Frostgipfel und Ferrodrakon auf dem Drachengipfel.', 'Und wer Lunareth oder Solarion nicht gebunden hat, findet sie wieder an ihren Altären.'], N);
    s.bag.urkristall = (s.bag.urkristall || 0) + 8; s.flags.linde_pg = true; sfx('caught');
    await say(`${s.name} erhält 8× URBALL!`);
    await say(['Diese Urbälle habe ich damals aus dem Hauptquartier mitgenommen. Sie binden zehnmal besser als normale Bälle.', 'Noch etwas… In den Herzsteinen höre ich ein Echo. Etwas lebt zwischen den Welten und wartet.', 'Wenn es erwacht, schafft das niemand allein. Dann braucht ihr euch alle vier.', 'Seit gestern klafft am alten Altar im Altwald ein Riss. Kian, Lyra und Nyx warten dort schon auf dich.'], N);
    this.save(true);
  }
  async hueter(n) {
    const s = this.state, sp = n.mon, S = SPECIES[sp];
    const intro = {
      ignarok: ['Der Boden glüht. Aus der Lava erhebt sich ein Koloss mit Hörnern aus Feuer!'],
      maristra: ['Das Wasser der Grotte beginnt zu singen. Eine riesige Schlange mit einer Krone aus Perlen taucht auf!'],
      boreon: ['Ein eisiger Sturm reißt dich fast von den Füßen. Über dem Gipfel kreist ein Vogel aus Nordlicht!'],
      ferrodrakon: ['Ein Brüllen erschüttert den Gipfel. Ein Drache mit stählernem Panzer schlägt die Augen auf!'],
    }[sp] || [`${S.name} erscheint!`];
    await say([...intro, `${S.name} greift an!`]);
    cry(S.cry);
    const r = await this.wildBattle(null, n.bg || this.ow.M.bg || 'ruine', createMon(sp, 65));
    if (!r || r.result === 'lose') return;
    if (r.result === 'caught') { s.flags[n.id] = true; this.ow.npcs = this.ow.npcs.filter(x => x !== n); await say(`${S.name} hat dich als würdig anerkannt!`); this.save(true); return; }
    this.ow.npcs = this.ow.npcs.filter(x => x !== n);
    await say(r.result === 'win' ? `${S.name} zieht sich zurück… Wenn du wiederkommst, wartet es erneut auf dich.` : `${S.name} sieht dir nach. Es wird hier auf dich warten.`);
  }
  async rematch(sp, bg, lines) {
    const s = this.state;
    await say(lines);
    const r = await this.wildBattle(null, bg, createMon(sp, 60));
    if (r?.result === 'caught') { s.flags[sp] = true; await say(`${SPECIES[sp].name} hat dich als würdig anerkannt!`); this.save(true); }
    else if (r?.result === 'win') await say(`${SPECIES[sp].name} verschwindet im Licht. Es kommt wieder.`);
  }

  // ---------------------------------------------------------- Phase 4.5b: Raids im Dimensionsriss
  async raidNpc(id) {
    const s = this.state, d = COOP[id], N = { name: d.name };
    if (id === 'r_nihilux' && !RAID3.every(k => s.flags['raid_' + k])) return say(['Ein schwarzer Kern pulsiert über dem Abgrund…', 'Drei Wächter halten ihn versiegelt: Chronoth, Vortyx und Prismora. Besiegt sie zuerst!']);
    await say(d.intro, N);
    const partners = this.online.on ? this.online.partners().slice(0, 3) : [];
    const opts = [...(partners.length ? [{ label: `Mit ${partners.length} Mitspieler${partners.length > 1 ? 'n' : ''}`, online: true }] : []), { label: 'Mit Kian, Lyra & Nyx' }, { label: 'Später' }];
    const c = await choose(opts.map(o => o.label), { title: 'Raid · 4 gegen 1' });
    if (c === null || opts[c].label === 'Später') return;
    if (opts[c].online) { await this.online.raid(id, partners); return; }
    if (!s.team.some(m => !m.egg && m.hp > 0)) return say('Deine Kreaturen sind erschöpft!');
    sfx('encounter'); await this.flashIn();
    const hs = helperSlots(1);
    const b = new DoubleBattle({ slots: { p0: { pool: s.team, owner: s.name }, ...hs, ...foeSlots(id) } });
    this.markDex(b.mon('f0').sp);
    const r = await doubleBattle(this, { b, mine: ['p0'], bg: d.bg, title: d.name, boss: true, music: id === 'r_nihilux' ? 'finale' : 'legend', ownLooks: [s.look, ...Object.values(hs).map(h => h.look)] });
    if (r.result === 'win') { this.ow.music(); await fade(0, 150); await this.raidReward(id); }
    await this.afterBattle(r);
  }
  async raidReward(id) {
    const d = COOP[id], s = this.state, sp = d.boss.sp, first = !s.flags['raid_' + id];
    s.flags['raid_' + id] = true;
    await say(d.lose);
    const money = first ? d.reward : Math.floor(d.reward / 4); s.money += money;
    await say(`Der Raid ist gewonnen! Du erhältst ${money} ◈.`);
    if (first && d.item) { s.bag[d.item[0]] = (s.bag[d.item[0]] || 0) + d.item[1]; sfx('caught'); await say(`Du findest ${d.item[1]}× ${ITEMS[d.item[0]].name}!`); }
    if (id === 'r_nihilux') return this.nihiluxEnd();
    if (!s.flags[sp]) {
      await say(['Lyra heilt eure Kreaturen.', `Der geschwächte ${SPECIES[sp].name} bleibt zurück. Versuch, ihn zu binden!`]);
      s.team.forEach(healMon);
      const m = createMon(sp, d.boss.lvl - 6); m.hp = 1; m.status = 'starre';
      const r = await this.wildBattle(null, d.bg, m);
      if (r?.result === 'caught') { s.flags[sp] = true; this.ow.npcs = this.ow.npcs.filter(n => n.id !== id); }
      else await say(`${SPECIES[sp].name} zieht sich in den Riss zurück. Ein neuer Raid gibt dir eine neue Chance.`);
    }
    if (first && RAID3.every(k => s.flags['raid_' + k])) { G.shake = 1; sfx('evo'); await say(['Ein tiefes Grollen geht durch den Riss…', 'Das Siegel um den schwarzen Kern ist gebrochen. Nihilux ist erwacht!']); }
    this.save(true);
  }
  async nihiluxEnd() {
    const s = this.state, N = { name: 'Nihilux' };
    await this.cutIn('r_nihilux');
    await say(['Nihilux: Ich habe Welten enden sehen. Jedes Mal gingen alle fort, und ich blieb allein zurück.', 'Nihilux: Ihr seid geblieben. Alle vier.', 'Nihilux: … Vielleicht muss nicht alles enden. Vielleicht verändert es sich nur.'], N);
    await say('Lyra: Das hat Umbra nie verstanden. Und ich lange auch nicht.', { name: 'Lyra' });
    await say(`Kian: Hey, Nihilux! Wenn du nicht mehr allein sein willst – geh doch mit ${s.name}!`, { name: 'Kian' });
    const m = createMon('nihilux', 70); healMon(m); this.markDex('nihilux', true); s.flags.nihilux = true;
    cry(SPECIES.nihilux.cry); sfx('caught');
    if (s.team.length < 6) s.team.push(m); else s.box.push(m);
    await say([`Nihilux schließt sich ${s.name} an!`, ...(s.team.includes(m) ? [] : ['Nihilux wartet in der Box im Heilzentrum.'])]);
    this.ow.npcs = this.ow.npcs.filter(n => n.id !== 'r_nihilux');
    await say(['Der Riss beginnt sich zu schließen. Die Welten sind wieder getrennt – aber keine ist mehr allein.', '(Ende von Phase 4! Raids gegen die Wächter kannst du jederzeit wiederholen.)']);
    this.save(true);
  }

  async gym(n) {
    const s = this.state, N = { name: n.name }, G = GYMS[n.id];
    if (s.badges[G.badge]) return say(G.after, N);
    if (G.badge > 0 && !s.badges[G.badge - 1]) return say('Komm wieder, wenn du die vorherigen Orden hast!', N);
    await say(G.intro, N);
    const won = await this.trainerFight({ name: n.name, look: n.look, team: G.team, reward: G.reward, lose: G.lose, bg: G.bg || 'arena', music: 'ldr' + G.badge, double: G.double });
    if (!won) return say('Komm wieder, wenn du stärker bist!', N);
    s.badges[G.badge] = true; sfx('caught');
    await say([`${s.name} erhält den ${G.badgeName}!`, ...G.gift.text]);
    for (const [k, v] of Object.entries(G.gift.items)) s.bag[k] = (s.bag[k] || 0) + v;
    await say(G.outro, N);
    await ST.afterGym(this, n.id);
    this.save(true);
  }

  async daycare(n) {
    const s = this.state, dc = s.daycare, N = { name: n.name };
    if (dc.egg) {
      await say('Da bist du ja! Wir haben bei deinen Kreaturen ein Ei gefunden!', N);
      if (s.team.length >= 6) return say('Aber dein Team ist voll. Mach erst Platz!', N);
      if (await ask('Möchtest du das Ei mitnehmen?')) {
        s.team.push(dc.egg); dc.egg = null; dc.steps = 0; sfx('caught');
        await say([`${s.name} erhält das Ei!`, 'Bis es schlüpft, musst du ein ganzes Stück laufen. Feuer-Kreaturen im Team halten es warm – dann geht es doppelt so schnell.'], N);
      }
      return;
    }
    await say(dc.mons.length ? `Deine ${dc.mons.map(monName).join(' und ')} ${dc.mons.length > 1 ? 'spielen fröhlich miteinander' : 'wartet auf Gesellschaft'}.` : 'Willkommen in der Brutstätte! Gib mir ein Männchen und ein Weibchen – mit etwas Geduld finden sie ein Ei.', N);
    for (;;) {
      const i = await choose(['Kreatur abgeben', 'Kreatur abholen', 'Was ist eine Mutation?', 'Tschüss']);
      if (i === null || i === 3) return;
      if (i === 2) { await say(['Geben zwei verschiedene Kreaturen ein Ei, schlüpft daraus eine Mutation – eine ganz neue Art!', 'Körperbau vom Weibchen (Mutter). Farben und ein Merkmal vom Männchen (Vater).', 'Ein Ei gibt es nur von einem Männchen und einem Weibchen – und das dauert seine Zeit.', 'Die Typen mischen sich, die Attacken auch. Gleiche Arten ergeben ein ganz normales Junges.'], N); continue; }
      if (i === 0) {
        if (dc.mons.length >= 2) { await say('Ich passe schon auf zwei Kreaturen auf.', N); continue; }
        const k = await party(s, { select: true, prompt: 'Welche Kreatur abgeben?', filter: m => canBreed(m) && s.team.filter(x => !x.egg && x.hp > 0 && x !== m).length > 0 });
        if (k === null) continue;
        const m = s.team.splice(k, 1)[0]; dc.mons.push(m); dc.steps = 0;
        const gd = genderOf(m);
        await say(`${monName(m)} bleibt in der Brutstätte. ${gd === 2 ? 'Ein Weibchen ♀ – als MUTTER vererbt es den Körperbau.' : 'Ein Männchen ♂ – als VATER vererbt es Farbe und Merkmal.'}`, N);
        if (dc.mons.length === 2) {
          const c = compatibility(dc.mons[0], dc.mons[1]);
          if (genderOf(dc.mons[0]) === genderOf(dc.mons[1])) await say(`Zwei ${genderOf(m) === 1 ? 'Männchen' : 'Weibchen'} … die beiden spielen zwar, aber ein Ei wird es so nie geben.`, N); else
          await say(['Die beiden ignorieren einander…', 'Die beiden spielen miteinander.', 'Die beiden verstehen sich gut!', 'Die beiden verstehen sich prächtig!'][c], N);
          if (c) await say('Lauf ein bisschen herum – vielleicht finden wir bald ein Ei!', N);
        }
      }
      if (i === 1) {
        if (!dc.mons.length) { await say('Ich passe gerade auf keine Kreatur auf.', N); continue; }
        if (s.team.length >= 6) { await say('Dein Team ist voll.', N); continue; }
        const k = dc.mons.length === 1 ? 0 : await choose(dc.mons.map(m => ({ label: monName(m) + ' ' + ['', '♂', '♀'][genderOf(m)], right: 'Lv' + m.lvl })));
        if (k === null) continue;
        const m = dc.mons.splice(k, 1)[0]; healMon(m); s.team.push(m); sfx('click');
        await say(`Du hast ${monName(m)} zurückbekommen. Es ist jetzt Level ${m.lvl}!`, N);
      }
    }
  }
}

// Ruhmeshalle mit Abspann
class HallScene {
  constructor(g, res) {
    this.g = g; this.res = res; this.t = 0; const s = g.state;
    this.team = s.team.filter(m => !m.egg);
    const seen = Object.keys(s.dex.seen).length, caught = Object.keys(s.dex.caught).length;
    this.credits = ['STERNFLUT', 'Welt 1 – Der Kalmara-Archipel', '', `Champion: ${s.name}`, `Chronik: ${seen} gesehen, ${caught} gebunden`, `Orden: ${s.badges.filter(Boolean).length} · Strophen: ${Object.keys(s.flags).filter(k => /^song\d$/.test(k)).length}/8`, '', 'Rivale: Jaro', 'Freund: Pip', 'Großmutter: Wella', 'Kapitän der Seeschwalbe: Harm', '', 'Arenaleiter', 'Rhea · Okko · Mira · Volta', 'Ysolde · Hekla · Corvin · Tamas', '', 'Top 4', 'Lio · Marisol · Raven · Saphira', 'Champion a.D.: Admiral Brann', '', 'Der Orden der Stillen See', 'Äbtissin Sela · Schwester Nebel · Bruder Funke', '', 'Für Liv Sund, Kapitänin der Morgenstern', '', 'Idee & Spieltest: Gaming Gang', 'Code, Pixel-Art & Musik: mit Claude', '', 'Die Reise geht weiter …'];
    this.tEnd = 2 + this.team.length * 0.7 + 3 + this.credits.length * 0.9 + 2;
    setMusic('title');
  }
  update(dt) {
    this.t += dt;
    if (this.t > 3 && (input.pressed('a') || input.pressed('start') || input.tap) && this.t < this.tEnd - 2) this.t = Math.max(this.t, this.tEnd - 2);
    else if (this.t >= this.tEnd && (input.pressed('a') || input.pressed('b') || input.tap)) { pop(this); this.res(); }
  }
  draw(ctx) {
    const t = this.t, g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a1a5a'); g.addColorStop(1, '#8a5ab8'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { const a = (Math.sin(t * 2 + i) + 1) / 2; ctx.fillStyle = `rgba(255,240,180,${a * 0.7})`; ctx.fillRect((i * 61) % W, (i * 37 + t * 8) % H, 1, 1); }
    const tTeam = 2 + this.team.length * 0.7 + 3;
    if (t < tTeam) {
      text('RUHMESHALLE', W / 2, 8, '#ffe8a0', 11, 'center', '#3a2050');
      this.team.forEach((m, i) => {
        const at = 1 + i * 0.7; if (t < at) return;
        const x = 18 + (i % 3) * 72, y = 26 + Math.floor(i / 3) * 64, k = Math.min(1, (t - at) * 3);
        ctx.globalAlpha = k; ctx.drawImage(monSprite(m.sp, 'front', m.shiny, m.mut), x + 6, y, 48, 48); ctx.globalAlpha = 1;
        text(monName(m), x + 30, y + 48, '#ffffff', 7, 'center', '#3a2050'); text('Lv ' + m.lvl, x + 30, y + 56, '#ffe8a0', 6.5, 'center', '#3a2050');
      });
      if (t > 1 + this.team.length * 0.7) text(`${this.g.state.name} – Champion der Liga!`, W / 2, 150, '#ffffff', 8, 'center', '#3a2050');
      return;
    }
    const y0 = H - (t - tTeam) * 14;
    this.credits.forEach((l, i) => { const y = y0 + i * 14; if (y > -10 && y < H + 4) text(l, W / 2, y, i === 0 ? '#ffe8a0' : '#ffffff', i === 0 ? 11 : 8, 'center', '#3a2050'); });
    if (t >= this.tEnd) text('ENDE', W / 2, 70, '#ffe8a0', 14, 'center', '#3a2050');
  }
}

// ---------------------------------------------------------------- Szenen: Titel, Intro, Editor, Vorschau
class TitleScene {
  constructor(g) { this.g = g; this.done = new Promise(r => (this.res = r)); this.mons = ['zundrak', 'tidolin', 'moospip', 'brisel', 'quallux', 'lumoth']; this.waiting = true; }
  update() { if (this.waiting && (input.pressed('a') || input.pressed('start') || input.tap)) { this.waiting = false; this.res(); } }
  draw(ctx) { seaScene(ctx, G.t, true); this.mons.forEach((sp, i) => { const x = ((i * 52 + G.t * 10) % (W + 64)) - 48, y = 128 + Math.sin(G.t * 2.4 + i) * 2; ctx.drawImage(monSprite(sp, 'icon'), x, y); });
    text('STERNFLUT', W / 2 + 1, 23, 'rgba(10,20,50,.6)', 28, 'center', null, true);
    text('STERNFLUT', W / 2, 22, '#fff4d0', 28, 'center', '#3a2a6a', true);
    text('Die Reise ans Ende des Meeres', W / 2, 56, '#d8e8ff', 8, 'center', 'rgba(0,0,0,.5)');
    if (this.waiting && Math.sin(G.t * 5) > -0.3) text('DRÜCKE  A  ODER  START', W / 2, 104, '#ffffff', 8.5, 'center', 'rgba(0,0,0,.6)', true);
    text('Gaming Gang', W - 4, 4, 'rgba(255,255,255,.6)', 6.5, 'right', null);
  }
}
// Nachtmeer mit Sternen, Mond, Spiegelung und Leuchtturm (Titel und Prolog)
function seaScene(ctx, t, tower) {
  const g = ctx.createLinearGradient(0, 0, 0, 96); g.addColorStop(0, '#0a1030'); g.addColorStop(0.55, '#24306a'); g.addColorStop(1, '#6a5a9a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 97);
  for (let i = 0; i < 70; i++) { const x = (i * 97.3) % W, y = (i * 41.7) % 90, a = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.6 + (i % 5) * 0.3) + i)); ctx.fillStyle = `rgba(255,248,220,${a})`; ctx.fillRect(x | 0, y | 0, 1, 1); if (i % 11 === 0) { ctx.fillRect((x | 0) - 1, y | 0, 3, 1); ctx.fillRect(x | 0, (y | 0) - 1, 1, 3); } }
  ctx.fillStyle = 'rgba(255,240,200,.18)'; ctx.beginPath(); ctx.arc(188, 30, 15, 0, 7); ctx.fill(); ctx.fillStyle = '#fff2c8'; ctx.beginPath(); ctx.arc(188, 30, 10, 0, 7); ctx.fill(); ctx.fillStyle = '#e8d8a8'; ctx.fillRect(184, 27, 3, 2); ctx.fillRect(190, 33, 2, 2);
  const sg = ctx.createLinearGradient(0, 96, 0, H); sg.addColorStop(0, '#2a3a7a'); sg.addColorStop(1, '#0a1434'); ctx.fillStyle = sg; ctx.fillRect(0, 96, W, H - 96);
  for (let y = 98, i = 0; y < H; y += 2 + i * 0.35, i++) { const w = 6 + i * 1.6; for (let x = ((i * 23 + t * (8 + i)) % 40) - 40; x < W; x += 30 + i * 3) { ctx.fillStyle = `rgba(160,190,255,${0.12 + i * 0.012})`; ctx.fillRect(x | 0, y | 0, w | 0, 1); } }
  for (let y = 98; y < H; y += 2) { const w = 4 + (y - 96) * 0.5, x = 188 + Math.sin(y * 0.7 + t * 3) * (2 + (y - 96) * 0.08); ctx.fillStyle = 'rgba(255,240,200,.35)'; ctx.fillRect((x - w / 2) | 0, y, w | 0, 1); }
  if (!tower) return;
  ctx.fillStyle = '#141a34'; ctx.beginPath(); ctx.moveTo(0, 97); ctx.lineTo(0, 84); ctx.lineTo(18, 80); ctx.lineTo(40, 86); ctx.lineTo(58, 97); ctx.fill();
  const tx = 26; ctx.fillStyle = '#e8e0d8'; ctx.fillRect(tx - 4, 50, 8, 32); ctx.fillStyle = '#c83a3a'; for (let y = 54; y < 82; y += 8) ctx.fillRect(tx - 4, y, 8, 4); ctx.fillStyle = '#2a2a3a'; ctx.fillRect(tx - 6, 46, 12, 4); ctx.fillStyle = '#fff4b0'; ctx.fillRect(tx - 3, 40, 6, 6); ctx.fillStyle = '#2a2a3a'; ctx.fillRect(tx - 4, 37, 8, 3);
  const a = t * 0.9, len = 260; ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const s of [1, -1]) { const ang = a + (s < 0 ? Math.PI : 0), c = Math.cos(ang); if (c < 0.05 && s > 0) continue; const bg = ctx.createLinearGradient(tx, 43, tx + Math.cos(ang) * len, 43 + Math.sin(ang) * len * 0.15); bg.addColorStop(0, 'rgba(255,240,170,.55)'); bg.addColorStop(1, 'rgba(255,240,170,0)'); ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(tx, 43); ctx.lineTo(tx + Math.cos(ang - 0.08) * len, 43 + Math.sin(ang - 0.08) * len * 0.15 - 10 * Math.abs(c)); ctx.lineTo(tx + Math.cos(ang + 0.08) * len, 43 + Math.sin(ang + 0.08) * len * 0.15 + 10 * Math.abs(c)); ctx.fill(); }
  ctx.restore(); ctx.fillStyle = 'rgba(255,240,180,.25)'; ctx.beginPath(); ctx.arc(tx, 43, 9, 0, 7); ctx.fill();
}
class IntroScene {
  constructor(g) { this.g = g; this.look = null; this.k = 0; }
  draw(ctx) {
    seaScene(ctx, G.t, this.k < 3 || this.k > 5);
    if (this.k >= 1 && this.k <= 3) { const x = 120 + (this.k - 1) * 30 + G.t * 2 % 40; ctx.fillStyle = '#1a1424'; ctx.beginPath(); ctx.moveTo(x - 14, 98); ctx.lineTo(x + 14, 98); ctx.lineTo(x + 10, 103); ctx.lineTo(x - 10, 103); ctx.fill(); ctx.fillRect(x - 1, 78, 2, 20); ctx.fillStyle = '#e8e0d0'; ctx.beginPath(); ctx.moveTo(x + 1, 79); ctx.lineTo(x + 12, 95); ctx.lineTo(x + 1, 95); ctx.fill(); ctx.fillStyle = '#f8d040'; ctx.fillRect(x + 4, 86, 3, 3); }
    if (this.k === 5) { ctx.fillStyle = 'rgba(20,20,40,.45)'; ctx.fillRect(0, 0, W, H); for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(180,200,255,.5)'; ctx.fillRect((i * 37 + G.t * 300) % W, (i * 53 + G.t * 500) % H, 1, 5); } }
    if (this.look) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(W / 2, 104, 26, 5, 0, 0, 7); ctx.fill(); ctx.drawImage(trainerSprite(this.look), W / 2 - 32, 42); }
  }
}
class Preview {
  constructor(sp) { this.sp = sp; this.overlay = true; }
  draw(ctx) { box(84, 18, 72, 76); ctx.drawImage(monSprite(this.sp, 'front'), 88, 22); SPECIES[this.sp].types.forEach((t, i) => typeTag(t, 87 + i * 36, 80)); }
}
class EditorScene {
  constructor(g, preset, done) {
    this.g = g; this.done = done; this.row = 0;
    this.look = preset?.look || { skin: LOOKS.skin[1], hair: LOOKS.hair[0], outfit: LOOKS.outfit[0], pants: LOOKS.pants[0], cap: LOOKS.cap[1], accent: '#f2d16b' };
    this.name = preset?.name || '';
    this.rows = [['Name'], ['Haut', 'skin'], ['Haare', 'hair'], ['Oberteil', 'outfit'], ['Hose', 'pants'], ['Mütze', 'cap'], ['Fertig']];
  }
  change(d) {
    const k = this.rows[this.row][1]; if (!k) return;
    const arr = LOOKS[k], i = arr.indexOf(this.look[k]);
    this.look = { ...this.look, [k]: arr[(i + d + arr.length) % arr.length] }; sfx('click');
  }
  async act() {
    const r = this.rows[this.row][0];
    if (r === 'Name') { this.busy = true; this.name = await inputName('Wie heißt du?', this.name); this.busy = false; }
    else if (r === 'Fertig') { if (!this.name) { this.row = 0; return this.act(); } sfx('open'); this.done({ name: this.name, look: this.look }); }
    else this.change(1);
  }
  update() {
    if (this.busy) return;
    const n = this.rows.length;
    if (input.repeat('down')) { this.row = (this.row + 1) % n; sfx('click'); }
    if (input.repeat('up')) { this.row = (this.row - 1 + n) % n; sfx('click'); }
    if (input.repeat('left')) this.change(-1);
    if (input.repeat('right')) this.change(1);
    const t = input.tap;
    if (t && t.x > 112) { const k = Math.floor((t.y - 26) / 17); if (k >= 0 && k < n) { this.row = k; if (t.x > 210 && this.rows[k][1]) this.change(1); else if (t.x < 135 && this.rows[k][1]) this.change(-1); else this.act(); } }
    else if (input.pressed('a')) this.act();
  }
  draw(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#d8e8f8'); g.addColorStop(1, '#a8c8e0'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    text('WER BIST DU?', 8, 6, COL.frame, 9, 'left', '#fff', true);
    box(4, 20, 104, 136);
    ctx.drawImage(trainerSprite(this.look), 24, 26);
    const dirs = ['down', 'left', 'up', 'right'], d = dirs[Math.floor(G.t * 1.2) % 4];
    ctx.save(); ctx.translate(40, 108); ctx.scale(2, 2); drawChar(ctx, this.look, d, [1, 3, 2, 3][Math.floor(G.t * 6) % 4], 0, 0); ctx.restore();
    text(this.name || '???', 56, 146, COL.ink, 8.5, 'center', COL.shadow, true);
    box(112, 20, 124, 136);
    this.rows.forEach(([lab, k], i) => {
      const y = 28 + i * 17;
      if (i === this.row) cursor(116, y + 1);
      text(lab, 124, y, COL.ink, 8, 'left', COL.shadow, lab === 'Fertig');
      if (lab === 'Name') text(this.name || 'tippen…', 228, y, COL.inkSoft, 7.5, 'right');
      if (k) {
        text('◀', 172, y, COL.inkSoft, 7.5, 'center', null); text('▶', 226, y, COL.inkSoft, 7.5, 'center', null);
        const c = this.look[k]; ctx.fillStyle = '#28283a'; ctx.fillRect(186, y, 26, 9); ctx.fillStyle = c || '#e8e8e8'; ctx.fillRect(187, y + 1, 24, 7);
        if (!c) text('ohne', 199, y + 1, COL.inkSoft, 6, 'center', null);
      }
    });
  }
}

const game = new Game();
window.LU2 = game;
// Handy/App: beim Wechsel in den Hintergrund oder beim Schließen automatisch speichern
const autoSave = () => { if (game.started && game.state && game.ow) game.save(true); };
document.addEventListener('visibilitychange', () => { if (document.hidden) autoSave(); });
window.addEventListener('pagehide', autoSave);
game.start();
if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.Capacitor) navigator.serviceWorker.register('sw.js').catch(() => {});
