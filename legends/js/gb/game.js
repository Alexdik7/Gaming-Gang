// LEGENDS UNITED – Handheld-Edition: Spielablauf, Story, Brutstätte, Speichern
import { G, W, H, COL, push, pop, input, text, box, cursor, wait, fade, wipe, iris, initEngine, bindPad, frame, wrap } from './engine.js';
import { MAPS, LOOK, ENC, SHOP, ITEMS } from './maps.js';
import { Overworld } from './overworld.js';
import { battle } from './battle2d.js';
import { say, ask, choose, party, summary, dex, card, inputName, hatchScene, settings, typeTag, dexEntry, healAnim } from './gbui.js';
import { drawChar } from './pixel.js';
import { monSprite, trainerSprite } from './sprites.js';
import { SPECIES, STARTERS } from '../data/creatures.js';
import '../data/creatures2.js';
import { createMon, healMon, maxHp, monName } from '../data/mon.js';
import { MOVES } from '../data/moves.js';
import { itemFilter } from './battle2d.js';
import { ensureSpecies, stepBreeding, hatch, canBreed, compatibility } from '../data/breeding.js';
import { initAudio, sfx, cry, setMusic, setAudio, audioState } from '../core/audio.js';
import { mulberry } from '../core/noise.js';
import { Online } from './online.js';
import { doubleBattle, localDouble } from './double2d.js';
import { COOP, foeSlots, helperSlots } from '../data/coop.js';
import { DoubleBattle } from '../battle/double.js';
import { HUETER } from '../data/creatures9.js';
import { boxScreen } from './boxui.js';
import { baseMap, DECOR, placeDecor, encodeBase, decodeBase, decorAt } from './base.js';

const SAVE = 'lu2-save', OPT = 'lu2-opt', DAY = 24 * 60;
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
const QUESTS = {
  ig_kid: { want: 'flammeule', ask: ['Ich habe noch nie eine Flammeule aus der Nähe gesehen!', 'Sie fliegen nur nachts über den Aschepfad. Bringst du mir eine zum Anschauen?'], thanks: ['WOW! {mon} ist ja wunderschön!', 'Danke! Hier, das hab ich am Vulkan gefunden.'], reward: { ak_magmaflut: 1, beleber: 2 }, after: 'Ich will später auch mal eine Flammeule haben!' },
  aq_fischer: { want: 'geisterflosse', ask: ['Seit Jahren jage ich die Geisterflosse. Man sagt, sie schwimmt nachts vor der Küste.', 'Wenn du eine fängst, zeig sie mir. Ich will wissen, ob sie wirklich lächelt!'], thanks: ['Sie lächelt tatsächlich… {mon} ist echt!', 'Jetzt kann ich in Ruhe in Rente gehen. Nimm das hier!'], reward: { ak_wellenschlag: 1, sternkristall: 3 }, after: 'Ich träume immer noch von dem Lächeln der Geisterflosse.' },
  fh_oma: { want: 'schneeglock', ask: ['Früher blühten überall in Frostheim Schneeglocks. Heute sieht man sie kaum noch.', 'Wenn du eines findest – bei Tag am Frostpass –, würdest du es mir zeigen?'], thanks: ['Ach, wie schön! {mon} läutet ja richtig!', 'Das erinnert mich an meine Jugend. Hier, für deine Reise.'], reward: { ak_sonnenstrahl: 1, klarbeere: 5 }, after: 'Danke noch mal für das Schneeglock. Mein Herz ist ganz warm.' },
};
// Top 4 und Champion: Teams, Texte, Belohnung
const RAID3 = ['r_chronoth', 'r_vortyx', 'r_prismora'];
const LIGA = {
  e4_1: {
    team: [['sporanox', 52], ['tangechse', 53], ['schneeglock', 53], ['kaktoroc', 54], ['hainfeste', 55]], reward: 6600,
    intro: ['Willkommen in der Liga. Ich bin Ranka, die Erste der Top 4.', 'Meine Kreaturen wurzeln tief. Gift und Dornen – wer sie unterschätzt, bleibt hängen.', 'Und denk daran: Zwischen den Räumen gibt es keine Heilung!'],
    lose: 'Du hast meine Wurzeln durchtrennt. Geh weiter – Aeris wartet.', after: 'Das Tor ist offen. Viel Glück bei den anderen!',
  },
  e4_2: {
    team: [['sturmmoewe', 53], ['donnerfalter', 54], ['felsadler', 54], ['vampyra', 55], ['flugdrache', 56]], reward: 6720,
    intro: ['Spürst du den Wind? Ich bin Aeris, die Zweite der Top 4.', 'Meine Kreaturen gehören dem Himmel. Mal sehen, ob du sie herunterholst!'],
    lose: 'Ein Sturm, der sich legt… und du stehst noch. Respekt!', after: 'Der Wind trägt dich weiter. Mirella wartet.',
  },
  e4_3: {
    team: [['seelenlaterne', 54], ['geisterflosse', 55], ['gruftkaefer', 55], ['spukflamme', 56], ['grabwurm', 57]], reward: 6840,
    intro: ['Psst… Hörst du sie flüstern? Ich bin Mirella, die Dritte der Top 4.', 'Meine Geister kennen jede Angst. Auch deine.'],
    lose: 'Die Geister sind still geworden. Das ist selten.', after: 'Geh. Thalor ist der Letzte vor dem Champion.',
  },
  e4_4: {
    team: [['runenkaefer', 55], ['fatamor', 56], ['nordlicht', 56], ['sternuhu', 57], ['kristallwyrm', 58]], reward: 6960,
    intro: ['Ich bin Thalor, der Stärkste der Top 4. Magie ist die älteste Kraft der Welt.', 'Hinter mir liegt die Champion-Halle. Aber vorhin kam jemand durch diese Tür – ohne mich herauszufordern.', 'Erst ich, dann er. Los!'],
    lose: 'Meine Runen sind erloschen. Geh – und halte ihn auf!', after: 'Die Champion-Halle liegt im Norden. Beeil dich!',
  },
  aurin: {
    team: [['hoppelion', 57], ['tiefenkiemer', 58], ['gletscherkoloss', 58], ['lavawaran', 58], ['hornkoloss', 59], ['drakonar', 60]], reward: 20000,
    intro: ['Aurin: Ich habe viele Herausforderer gesehen. Aber keinen, der vorher die Zeit selbst überzeugt hat.', 'Aurin: Ich bin Aurin, Champion der Liga. Keine Rücksicht, keine Gnade – so wie es sich gehört.', 'Aurin: Zeig mir alles, was du hast!'],
    lose: 'Aurin: … Die Liga hat einen neuen Champion.', after: 'Aurin: Du bist der Champion. Komm jederzeit wieder – ich trainiere schon für die Revanche!',
  },
};

const GYMS = {
  gorm: {
    badge: 0, badgeName: 'FELSORDEN', team: [['kaeferix', 13], ['kieselkrebs', 14], ['brockel', 16]], reward: 1600,
    intro: ['Willkommen in der Arena von Felsenau! Ich bin Gorm.', 'Meine Kreaturen sind so standhaft wie die Berge selbst.', 'Zeig mir, ob dein Wille stärker ist als Stein!'],
    lose: 'Unglaublich… Du hast meine Felsen zertrümmert!',
    gift: { text: ['Gorm: Und nimm diese drei Sternbälle. Du hast sie dir verdient.'], items: { sternkristall: 3 } },
    outro: ['Gorm: Östlich von hier führt der Aschepfad nach Ignis, der Stadt am Vulkan.', 'Dort wartet Selma, die Arenaleiterin des Feuers. Mit meinem Orden lässt dich der Wächter durch!'],
    after: ['Der Felsorden steht dir gut.', 'Der Aschepfad im Osten führt nach Ignis. Selma wartet dort auf dich!'],
  },
  morwen: {
    badge: 4, badgeName: 'SCHATTENORDEN', team: [['spukling', 35], ['finstereule', 36], ['nachtmahr', 37], ['finsterfuchs', 38]], reward: 4800,
    intro: ['Du hast den Weg durch die Finsternis gefunden. Wer im Dunkeln nicht verzagt, verdient mein Gehör.', 'Ich bin Morwen. Meine Kreaturen sind Schatten – sie kommen, wenn du sie am wenigsten erwartest.'],
    lose: 'Ein Licht, das selbst meine Schatten nicht schlucken können… Bemerkenswert.',
    gift: { text: ['Morwen: Nimm diese Beleber. In der Mondruine wirst du sie brauchen.'], items: { beleber: 3, supertrank: 3 } },
    outro: ['Morwen: Die Mondruine liegt östlich der Stadt. Der Wächter wird dich nun einlassen.', 'Dort wacht Lunareth über den Mond-Herzstein. Sei respektvoll – es ist älter als jede Stadt.'],
    after: ['Der Schattenorden steht dir. Die Mondruine erwartet dich im Osten.'],
  },
  brann: {
    badge: 6, badgeName: 'ERZORDEN', team: [['erzkaefer', 46], ['eisenbock', 47], ['zackenruecken', 48], ['tempelgolem', 49]], reward: 6000, bg: 'berg',
    intro: ['Du hast meine Brocken bewegt! Kraft und Köpfchen – genau, was ich sehen wollte.', 'Ich bin Brann. Meine Kreaturen sind aus Erz geschmiedet. Mal sehen, ob du sie verbiegen kannst!'],
    lose: 'Wie geschmolzenes Eisen… Du hast mich weich gekocht!',
    gift: { text: ['Brann: Nimm die hier – Beleber und Supertränke. Im Hauptquartier wirst du sie brauchen.'], items: { beleber: 4, supertrank: 5 } },
    outro: ['Brann: Team Eklipse hat sich östlich der Stadt in den Berg gegraben.', 'Mit meinem Orden kannst du ihr Stahltor aufbrechen. Aber sei vorsichtig: Ihr Anführer Umbra ist dort.'],
    after: ['Der Erzorden steht dir! Das Hauptquartier liegt im Osten.'],
  },
  vala: {
    badge: 7, badgeName: 'DRACHENORDEN', team: [['wyvernix', 50], ['kristallwyrm', 51], ['schwelwyrm', 52], ['flugdrache', 54]], reward: 8000, bg: 'berg',
    intro: ['Du hast Umbra die Stirn geboten. Die Drachen haben es gespürt.', 'Ich bin Vala, Meisterin des Drachenhorts. Dies ist die letzte Arena.', 'Zeig mir, ob dein Herz so stark ist wie ein Drachenherz!'],
    lose: 'Die Drachen verneigen sich vor dir. Und ich mich auch.',
    gift: { text: ['Vala: Acht Orden. Nimm diese Sternbälle und Beleber für die Siegesstraße.'], items: { sternkristall: 6, beleber: 4 } },
    outro: ['Vala: Mit acht Orden darfst du die Siegesstraße betreten – und danach die Top 4 herausfordern.', 'Umbra sucht die beiden ältesten Herzsteine. Man sagt, der Champion der Liga hütet sie.', 'Der Eingang zur Siegesstraße liegt im Norden des Hortes.'],
    after: ['Der Drachenorden steht dir. Die Siegesstraße wartet!'],
  },
  sahra: {
    badge: 5, badgeName: 'SONNENORDEN', team: [['fatamor', 40], ['sonnenkaefer', 41], ['tempelgolem', 42], ['sonnfalke', 43]], reward: 5400, bg: 'wueste',
    intro: ['Die Tore meiner Arena öffnen sich nur denen, die das Licht lesen können. Du hast es geschafft.', 'Ich bin Sahra. Das Licht der Wüste blendet die Unachtsamen – und wärmt die Mutigen.'],
    lose: 'Du strahlst heller als die Mittagssonne. Respekt!',
    gift: { text: ['Sahra: Nimm diese Beleber und Supertränke. Im Tempel ist es heiß.'], items: { beleber: 3, supertrank: 4 } },
    outro: ['Sahra: Der Sonnentempel liegt östlich der Stadt. Mit meinem Orden lässt dich der Wächter ein.', 'Drinnen musst du die alten Siegelplatten finden. Und sei vorsichtig: Seit gestern ist dort jemand.'],
    after: ['Der Sonnenorden steht dir! Der Tempel wartet im Osten.'],
  },
  halvar: {
    badge: 3, badgeName: 'FROSTORDEN', team: [['frosteule', 30], ['eiszapfling', 31], ['kaiserpingu', 32], ['gletscherkoloss', 34]], reward: 4000, bg: 'schnee',
    intro: ['Du hast den Weg über das Eis gefunden. Das gelingt nicht vielen.', 'Ich bin Halvar. Das Eis lehrt Geduld – und Geduld macht stark.', 'Zeig mir, ob dein Feuer meinen Winter schmelzen kann!'],
    lose: 'Das Eis… ist gebrochen. Gut gemacht, junger Trainer.',
    gift: { text: ['Halvar: Nimm diese Supertränke und Sternbälle für den Weg, der vor dir liegt.'], items: { supertrank: 4, sternkristall: 4 } },
    outro: ['Halvar: Vier Orden. Du hast die Hälfte der Region bereist.', 'Lyra war vor dir hier. Sie sucht die Eisgrotte im Norden – und Team Eklipse ebenso.', '(Ende von Phase 3 · Teil 3. Als Nächstes: Items, Nebenquests und Balancing – danach die Regionen Nocturna, Solaria und Drakmor!)'],
    after: ['Der Frostorden steht dir! Das Eis wird sich an dich erinnern.'],
  },
  meri: {
    badge: 2, badgeName: 'WELLENORDEN', team: [['sternquappe', 24], ['perlpanzer', 25], ['wogenross', 27]], reward: 3000,
    intro: ['Danke, dass du mir im Versteck geholfen hast!', 'Ich bin Meri. Meine Kreaturen fließen wie das Meer – mal sanft, mal als Sturmflut.', 'Mal sehen, ob du gegen den Strom schwimmen kannst!'],
    lose: 'Was für eine Welle! Du hast mich einfach weggespült.',
    gift: { text: ['Meri: Nimm diese Sternbälle. Im Meer gibt es seltene Kreaturen zu finden!'], items: { sternkristall: 4 } },
    outro: ['Meri: Team Eklipse sammelt die Herzsteine. Einen haben wir gerettet – aber Nyx sprach von einem Stein im ewigen Eis.', 'Frostheim liegt hoch im Norden. Der Frostpass beginnt am Nordrand von Felsenau.', 'Mit drei Orden lässt dich der Bergwächter durch!'],
    after: ['Der Wellenorden steht dir! Pass gut auf den Meeres-Herzstein auf.'],
  },
  selma: {
    badge: 1, badgeName: 'GLUTORDEN', team: [['glutling', 19], ['funkenkaefer', 20], ['vulkanox', 22]], reward: 2400, bg: 'vulkan',
    intro: ['Endlich ist meine Arena wieder frei – danke dir!', 'Ich bin Selma. Mein Feuer brennt für alle, die mutig genug sind.', 'Zeig mir, wie heiß dein Kampfgeist ist!'],
    lose: 'Was für eine Glut! Du hast mich überstrahlt.',
    gift: { text: ['Selma: Nimm auch diese Supertränke. Feuer heilt nicht – aber die hier schon!'], items: { supertrank: 3 } },
    outro: ['Selma: Team Eklipse war hinter der Glut des Vulkans her. Sie sprachen von „Herzsteinen“.', 'Ihre Kommandantin Nyx ist Richtung Küste gezogen – nach Aqualis, südlich von hier.', 'Auf dem Küstenweg verleiht Surferin Malu Wellenreiter. Mit meinem Orden gibt sie dir bestimmt einen!'],
    after: ['Der Glutorden steht dir! Pass auf dich auf, wenn du Team Eklipse begegnest.'],
  },
};
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
    this.state = null; this.ow = new Overworld(this); this.online = new Online(this);
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
      bag: { trank: 2 }, dex: { seen: {}, caught: {} }, flags: {}, badges: [], time: DAY * 8 / 24, playtime: 0, steps: 0,
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
    await fade(0, 300);
    const P = { name: 'Dr. Vato' };
    await say(['Hallo! Herzlich willkommen in der Welt von LEGENDS UNITED!', 'Mein Name ist Vato – Dr. Vato. Die Leute nennen mich den Kreaturen-Doktor.'], P);
    I.showMon = 'hoppel'; cry(SPECIES.hoppel.cry);
    await say(['Diese Welt wird von Wesen bewohnt, die wir Kreaturen nennen.', 'Manche leben im hohen Gras, andere tief in Höhlen – und manche zeigen sich nur bei Nacht.', 'Wir Menschen und Kreaturen leben als Freunde zusammen. Manche Trainer lassen sie sogar gemeinsam Eier ausbrüten…', '… und daraus schlüpfen manchmal Mutationen, die es noch nie gegeben hat!'], P);
    I.showMon = null;
    await say('Aber nun erzähl mir etwas über dich. Wie siehst du aus?', P);
    pop(I);
    const st = await this.editor();
    this.state = this.newState(st.name, st.look);
    const I2 = new IntroScene(this); I2.look = st.look; push(I2);
    await say([`${st.name} also! Ein schöner Name.`, 'Dein eigenes Abenteuer beginnt jetzt. Ich warte in meinem Labor in Moosgrund auf dich!', 'Auf geht’s!'], P);
    await fade(1, 600); pop(I2);
    this.enterWorld(true);
  }

  editor(preset) {
    return new Promise(res => { const E = new EditorScene(this, preset, v => { pop(E); res(v); }); push(E); });
  }

  async enterWorld(fresh) {
    const s = this.state;
    s.flags ||= {}; s.daycare ||= { mons: [], steps: 0, egg: null }; s.badges ||= [];
    if (s.base) MAPS.basis = baseMap(s.base.theme, `${s.name}s Geheimbasis`, s.base.items);
    if (s.map === 'gast' || (s.map === 'basis' && !s.base)) { const r = s.ret || { map: 'moosgrund', x: 4, y: 9 }; s.map = r.map; s.x = r.x; s.y = r.y; }
    this.ow.load(s.map, s.x, s.y, s.dir);
    push(this.ow); this.started = true;
    await fade(0, 400);
    this.online.autoJoin();
    if (fresh) { this.ow.busy = true; await say(['Mama: Guten Morgen, ' + s.name + '!', 'Mama: Dr. Vato wartet in seinem Labor auf dich – das große graue Haus im Süden des Dorfes.'], {}); this.ow.busy = false; this.save(true); }
  }

  // ---------------------------------------------------------- Menüs
  async startMenu() {
    const s = this.state, ow = this.ow; ow.busy = true;
    const items = [...(s.flags.dex ? ['CHRONIK'] : []), ...(s.team.length ? ['TEAM'] : []), 'BEUTEL', s.name.toUpperCase(), 'ONLINE', 'SPEICHERN', 'OPTIONEN', 'ZURÜCK'];
    const D = { CHRONIK: 'Ein Verzeichnis aller Kreaturen, die du gesehen oder gebunden hast.', TEAM: 'Zeigt dein Team, Werte und Attacken. Hier kannst du auch die Reihenfolge ändern.', BEUTEL: 'Gegenstände, Bälle und Basis-Items, die du gesammelt hast.', ONLINE: 'Mit Freunden kämpfen, tauschen, gemeinsam spielen und Raids bestreiten.', SPEICHERN: 'Fortschritt speichern oder als Sicherungs-Code teilen.', OPTIONEN: 'Textgeschwindigkeit, Musik und Ton einstellen.', 'ZURÜCK': 'Das Menü schließen und weiterspielen.' };
    const opts = items.map(k => ({ label: k, desc: D[k] || 'Dein Trainerpass mit Orden, Geld und Spielzeit.' }));
    for (;;) {
      const i = await choose(opts, { above: false, x: W - 86, w: 83 });
      const k = items[i];
      if (i === null || k === 'ZURÜCK') break;
      if (k === 'CHRONIK') await dex(s);
      if (k === 'TEAM') { const po = { field: m => this.fieldOptions(m) }; await party(s, po); if (po.picked) { this.fieldExit = false; await po.picked.run(); if (this.fieldExit) { this.fieldExit = false; break; } } }
      if (k === 'BEUTEL') await this.bagMenu();
      if (k === s.name.toUpperCase()) await card(s);
      if (k === 'SPEICHERN') { const c = await choose([{ label: 'Speichern', desc: 'Fortschritt auf diesem Gerät speichern.' }, { label: 'Sicherungs-Code', desc: 'Spielstand als Code teilen – so geht nie etwas verloren, auch bei einem neuen Handy.' }, 'Zurück']); if (c === 0) { this.save(); await say(`${s.name} hat das Spiel gespeichert.`); } else if (c === 1) await this.exportSave(); }
      if (k === 'OPTIONEN') await this.options();
      if (k === 'ONLINE') { await this.online.menu(); break; }
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
      const side = ctx => { // Beutel-Grafik links
        ctx.fillStyle = '#f0e8d0'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#e2d8bc'; for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2); ctx.fillStyle = shadeHex(pc); ctx.fillRect(0, 0, 76, 113);
        const bx = 14, by = 26; ctx.fillStyle = '#28202c'; ctx.fillRect(bx - 1, by - 1, 50, 50); ctx.fillStyle = pc; ctx.fillRect(bx, by, 48, 48);
        ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(bx + 2, by + 2, 44, 6); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(bx, by + 30, 48, 18);
        ctx.fillStyle = '#28202c'; ctx.fillRect(bx + 16, by - 9, 16, 3); ctx.fillRect(bx + 14, by - 7, 3, 7); ctx.fillRect(bx + 31, by - 7, 3, 7); ctx.fillStyle = '#f8d870'; ctx.fillRect(bx + 20, by + 18, 8, 6);
        text(pn, 38, 82, COL.ink, 7, 'center', COL.shadow, true);
        POCK.forEach((_, q) => { ctx.fillStyle = q === this.pocket ? '#e84a5f' : '#a8a090'; ctx.fillRect(18 + q * 9, 96, 6, 4); });
        text('◀  ▶', 38, 102, COL.inkSoft, 6.5, 'center');
      };
      const opts = keys.length ? keys.map(k => ({ label: ITEMS[k].name, right: ITEMS[k].key ? '' : '×' + s.bag[k], desc: ITEMS[k].desc })) : [{ label: '(leer)', desc: 'In dieser Tasche ist noch nichts.', disabled: true }];
      const i = await choose([...opts, { label: 'Zurück', desc: 'Den Beutel schließen.' }], { title: '◀ ' + pn + ' ▶', above: false, x: 78, w: 159, tabs: true, side, max: 7 });
      if (i === 'L' || i === 'R') { this.pocket = (this.pocket + (i === 'L' ? POCK.length - 1 : 1)) % POCK.length; continue; }
      if (i === null || i === opts.length || !keys.length) return;
      const k = keys[i], it = ITEMS[k];
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
        const hp = s.healPoint || { map: 'quellbach', x: 6, y: 7 };
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
    if (s.flags[f]) return say(q.after, N);
    const has = s.team.find(m => !m.egg && m.sp === q.want);
    if (!has) return say(q.ask, N);
    await say(q.thanks.map(t => t.replace('{mon}', monName(has))), N);
    for (const [k, v] of Object.entries(q.reward)) { s.bag[k] = (s.bag[k] || 0) + v; sfx('caught'); await say(`${s.name} erhält ${v > 1 ? v + '× ' : ''}${ITEMS[k].name}!`); }
    s.flags[f] = true; this.save(true);
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
      const i = await choose([`Musik: ${audioState.music ? 'AN' : 'AUS'}`, `Effekte: ${audioState.sfx ? 'AN' : 'AUS'}`, `Text: ${['LANGSAM', 'NORMAL', 'SCHNELL', 'SOFORT'][settings.textSpeed]}`, 'Zurück'], { title: 'OPTIONEN', above: false, x: 40, w: 160 });
      if (i === null || i === 3) break;
      if (i === 0) setAudio('music', !audioState.music);
      if (i === 1) setAudio('sfx', !audioState.sfx);
      if (i === 2) settings.textSpeed = (settings.textSpeed + 1) % 4;
      this.saveOpt();
    }
  }

  // ---------------------------------------------------------- Bewegungs-Sperren & Ereignisse
  blockEdge(map, to) {
    const s = this.state;
    if (map === 'solaria' && to === 'route8' && !s.bag.herzstein_sonne) {
      this.ow.busy = true;
      (async () => { await say(['Ein Felssturz versperrt den Drachensteig.', 'Die Leute in Solaria sagen, erst wenn der Sonnentempel seinen Stein freigibt, wird der Weg nach Drakmor sicher.']); this.ow.busy = false; })();
      return true;
    }
    if (map === 'drakmor' && to === 'hq' && !s.badges[6]) {
      this.ow.busy = true;
      (async () => { await say(['Ein schweres Stahltor im Fels. Ein Eklipse-Rüpel ruft: „Nur Mitglieder!“', 'Der Bergältere meint, mit Branns Erzorden könntest du das Tor aufbrechen.']); this.ow.busy = false; })();
      return true;
    }
    if (map === 'drakmor' && to === 'drachenhort' && !s.flags.umbra1) {
      this.ow.busy = true;
      (async () => { await say(['Drachenhüterin: Der Hort ist versiegelt, solange Team Eklipse im Berg sitzt.', 'Vertreibe sie aus ihrem Hauptquartier im Osten – dann öffnen wir dir den Weg.']); this.ow.busy = false; })();
      return true;
    }
    if (map === 'nocturna' && to === 'route7' && !s.bag.herzstein_mond) {
      this.ow.busy = true;
      (async () => { await say(['Am Stadtrand tobt ein Sandsturm. Ohne Schutz kommst du hier nicht weiter.', 'Die Leute sagen, nur wer den Segen des Mondes trägt, findet den Weg durch das Sandmeer.']); this.ow.busy = false; })();
      return true;
    }
    if (map === 'solaria' && to === 'tempel' && !s.badges[5]) {
      this.ow.busy = true;
      (async () => { await say(['Tempelwächter: Der Sonnentempel ist versiegelt.', 'Nur wer Sahras Sonnenorden trägt, darf die Siegel berühren.']); this.ow.busy = false; })();
      return true;
    }
    if (map === 'aqualis' && to === 'route6' && !s.bag.herzstein_eis) {
      this.ow.busy = true;
      (async () => { await say(['Ein Seemann hält dich auf: Der Dämmerwald ist verflucht! Seit Jahren geht dort die Sonne nicht mehr auf.', 'Komm wieder, wenn du dich in Frostheim bewährt hast – man erzählt von einem Stein im Eis…']); this.ow.busy = false; })();
      return true;
    }
    if (map === 'nocturna' && to === 'mondruine' && !s.badges[4]) {
      this.ow.busy = true;
      (async () => { await say(['Ruinenwächter: Halt! Die Mondruine darf nur betreten, wer Morwens Schattenorden trägt.', 'Dort drinnen sieht man kaum die Hand vor Augen.']); this.ow.busy = false; })();
      return true;
    }
    if (map === 'frostheim' && to === 'eisgrotte' && !s.badges[3]) {
      this.ow.busy = true;
      (async () => { await say(['Ein eisiger Sturm peitscht dir entgegen.', 'Die Leute in Frostheim sagen, nur wer Halvars Frostorden trägt, übersteht den Weg zur Eisgrotte.']); this.ow.busy = false; })();
      return true;
    }
    if (map === 'felsenau' && to === 'route5' && !s.badges[2]) {
      this.ow.busy = true;
      (async () => { await say(['Ein Bergwächter versperrt den Frostpass: Lawinengefahr!', 'Nur wer drei Orden besitzt – Fels, Glut und Welle –, darf in die Berge.']); this.ow.busy = false; })();
      return true;
    }
    if (map === 'felsenau' && to === 'route3' && !s.badges[0]) {
      this.ow.busy = true;
      (async () => { await say(['Ein Wächter hält dich auf: Der Aschepfad ist gefährlich!', 'Nur Trainer mit dem Felsorden aus der Arena von Felsenau dürfen hier durch.']); this.ow.busy = false; })();
      return true;
    }
    if (map === 'moosgrund' && to === 'route1' && !s.flags.gotBalls) {
      this.ow.busy = true;
      (async () => {
        await say(s.flags.starter ? 'Dr. Vato: Warte, ' + s.name + '! Ich habe noch etwas für dich – komm kurz ins Labor!' : 'Eine Stimme ruft: Halt! Ohne eigene Kreatur ist das hohe Gras viel zu gefährlich! Geh erst zu Dr. Vato ins Labor.');
        this.ow.busy = false;
      })();
      return true;
    }
    return false;
  }
  blockMove(map, x, y) {
    const s = this.state, pg = { ignis: [12, 0], route4: [22, 14], frostheim: [20, 10], drakmor: [24, 1], altwald: [10, 2] }[map];
    if (pg && pg[0] === x && pg[1] === y && !s.flags.linde_pg) {
      this.ow.busy = true;
      (async () => { await say(s.flags.champion ? ['Der Bann vor dem Eingang flackert, als würde er dich erkennen.', 'Dr. Vato in Moosgrund weiß bestimmt, was das bedeutet.'] : ['Ein uralter Bann aus Licht versiegelt den Eingang.', 'Nur jemand, der stärker ist als alle Trainer der Liga, könnte ihn brechen.']); this.ow.busy = false; })();
      return true;
    }
    if (map === 'drachenhort' && x === 10 && y === 0) {
      if (!s.badges[7]) { this.ow.busy = true; (async () => { await say(['Drachenhüterin: Dort beginnt die Siegesstraße.', 'Nur wer alle acht Orden trägt, darf sie betreten.']); this.ow.busy = false; })(); return true; }
      if (!s.flags.lyra5) { this.lyraDecision(); return true; }
    }
    return false;
  }
  remoteActors(id) { return this.online.actors(id); }
  async onMapLoad(id) {
    const s = this.state;
    if ((MAPS[id]?.buildings || []).some(b => b.heal)) s.flags['fly_' + id] = true;
    if (s.bag.wellenreiter && !s.bag.vk_surfer) s.bag.vk_surfer = 1;
    this.online.pos(true);
    // Wer das Plateau betritt, beginnt die Liga von vorn (wie es sich gehört)
    if (id === 'liga') for (const k of ['e4_1', 'e4_2', 'e4_3', 'e4_4', 'aurin']) delete s.flags[k];
    if (id === 'liga' && !s.flags.kian3) await this.kianFinal();
    { const sw = this.swarm(), M = MAPS[id]; if (M?.enc === sw.enc && s.flags.swarmDay !== sw.day && s.team.length) { s.flags.swarmDay = sw.day; this.ow.busy = true; await wait(450); sfx('dex'); await say(`Massenausbruch! Hier im Gebiet tauchen heute besonders viele ${SPECIES[sw.sp].name} auf!`); this.ow.busy = false; } }
    if (id === 'ligachamp' && !s.flags.umbra_end) await this.lyraHeal();
    if (id === 'route2' && s.flags.gotBalls && !s.flags.kian2) {
      this.ow.busy = true;
      await wait(500);
      const n = { id: 'kian_r2', name: 'Kian', look: LOOK.kian, x: 4, y: 4, dir: 'down', px: 64, py: 64 };
      this.ow.npcs.push(n); this.ow.emote = { n, t: 0.8 }; sfx('encounter'); await wait(700);
      await this.ow.npcWalkTo(n, this.ow.p.x, this.ow.p.y - 1 >= 0 && !this.ow.solid(this.ow.p.x, this.ow.p.y - 1) ? this.ow.p.y - 1 : this.ow.p.y + 1);
      await say(['Kian: Da bist du ja! Ich habe extra in der Kieselhöhle trainiert.', 'Kian: Mal sehen, ob du mit mir mithalten kannst!']);
      const won = await this.trainerFight({ name: 'Rivale Kian', look: LOOK.kian, team: [[this.counterOf(), 13], ['flatterlo', 11]], reward: 800, lose: 'Was?! Schon wieder… Ich muss härter trainieren!' });
      s.flags.kian2 = true;
      await say(won ? ['Kian: Hinter der Kieselhöhle liegt Felsenau. Dort ist die erste Arena – Gorm ist knallhart!', 'Kian: Wir sehen uns!'] : ['Kian: Ha! Trainiere mehr, dann wird das schon.']);
      this.ow.npcs = this.ow.npcs.filter(x => x !== n);
      this.ow.busy = false;
    }
  }
  counterOf() { return { funkfux: 'tropfmolch', tropfmolch: 'sprossling', sprossling: 'funkfux' }[this.state.flags.starter] || 'funkfux'; }

  onStep() {
    const s = this.state;
    this.online.pos();
    if (s.steps % 150 === 0) { const L = s.team.find(m => !m.egg && m.hp > 0); if (L) { const before = L.friendship || 70; L.friendship = Math.min(255, before + 2); if (before < 200 && L.friendship >= 200) setTimeout(() => this.ow.notify(`${monName(L)} vertraut dir blind. Resonanz ist jetzt möglich!`), 50); } }
    const ev = stepBreeding(s);
    for (const e of ev) {
      if (e.t === 'eggReady') this.ow.notify('Die Brutstätte in Quellbach hat ein Ei für dich!');
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
  shinyRoll(m) { if (!m.shiny && this.state.bag.glanzamulett && Math.random() < 2 / 512) m.shiny = true; return m; }
  pickWild(encId) {
    const sw = this.swarm();
    if (encId === sw.enc && Math.random() < 0.4) return this.shinyRoll(createMon(sw.sp, sw.lv[0] + Math.floor(Math.random() * (sw.lv[1] - sw.lv[0] + 1))));
    const night = this.isNight(), list = ENC[encId].list.filter(e => !e[4] || (e[4] === 'night') === night);
    let r = Math.random() * list.reduce((a, e) => a + e[1], 0);
    for (const e of list) { r -= e[1]; if (r <= 0) return this.shinyRoll(createMon(e[0], e[2] + Math.floor(Math.random() * (e[3] - e[2] + 1)))); }
    return this.shinyRoll(createMon(list[0][0], list[0][2]));
  }
  // Dr. Vato belohnt das Füllen der Chronik
  async dexRewards() {
    const s = this.state, n = Object.keys(s.dex.caught).filter(id => !SPECIES[id]?.fusion).length;
    const R = [[5, { kristall: 5 }], [10, { sternkristall: 5 }], [20, { supertrank: 5 }], [30, { hypertrank: 3, sternkristall: 5 }], [45, { glanzamulett: 1 }], [60, { sternkristall: 10 }], [80, { urkristall: 1 }], [100, { hypertrank: 10, money: 20000 }], [125, { sternkristall: 20 }], [150, { urkristall: 2, money: 50000 }]];
    for (const [k, rew] of R) {
      if (n < k || s.flags['dexR' + k]) continue;
      s.flags['dexR' + k] = true; sfx('dex');
      await say([`Dein Funkgerät klingelt …`, `Dr. Vato: ${s.name}, du hast schon ${k} verschiedene Kreaturen gebunden! Das ist großartig für meine Forschung!`, 'Dr. Vato: Hier, eine kleine Belohnung. Ich schicke sie dir direkt in den Beutel!']);
      for (const [it, v] of Object.entries(rew)) {
        if (it === 'money') { s.money += v; sfx('caught'); await say(`${s.name} erhält ${v} ◈!`); continue; }
        s.bag[it] = (s.bag[it] || 0) + v; sfx('caught'); await say(`${s.name} erhält ${v > 1 ? v + '× ' : ''}${ITEMS[it].name}!`);
      }
      if (rew.glanzamulett) await say('Dr. Vato: Mit dem Glanzamulett begegnest du schimmernden Kreaturen viel häufiger. Halt die Augen offen!');
      const next = R.find(([kk]) => kk > k); if (next) await say(`Dr. Vato: Melde dich wieder, wenn du ${next[0]} Arten gebunden hast!`);
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
  async wildBattle(encId, bg, mon) {
    const s = this.state; if (!s.team.some(m => !m.egg && m.hp > 0)) return;
    this.ow.busy = true;
    const foe = mon || this.pickWild(encId);
    this.markDex(foe.sp);
    sfx('encounter'); await this.flashIn();
    const r = await battle(this, { foeTeam: [foe], bg, intro: SPECIES[foe.sp].legendary ? 'legend' : 'wild' });
    await this.afterBattle(r);
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
    const foe = t.team.map(([sp, l]) => createMon(sp, l, rnd));
    foe.forEach(m => this.markDex(m.sp));
    sfx('encounter'); await this.trainerIn();
    t.reso ??= /Champion|Top-4|^Umbra|Hüter/.test(t.name);
    const r = await battle(this, { foeTeam: foe, trainer: t, canCatch: false, bg: t.bg || (this.ow.M.gym ? 'arena' : this.ow.M.cave ? 'hoehle' : 'gras') });
    await this.afterBattle(r, t.noBlackout);
    return r.result === 'win';
  }
  async trainerBattle(n) {
    const tr = n.trainer;
    await say(tr.lines, { name: n.name });
    const won = await this.trainerFight({ name: n.name, look: n.look, team: tr.team, reward: tr.reward, lose: tr.lose, bg: this.ow.M.bg });
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
      if (await ask(`Möchtest du ${SPECIES[m.sp].name} einen Spitznamen geben?`)) m.nick = await inputName('Spitzname', SPECIES[m.sp].name);
      if (s.team.length < 6) s.team.push(m); else { s.box.push(m); await say(`${monName(m)} wurde in die Box im Heilzentrum geschickt.`); }
      if (isNew) await this.dexRewards();
    }
    for (const m of s.team) delete m._fainted;
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
    if (it.item === 'ball52') { sfx('shiny'); const n = Object.keys(s.flags).filter(k => k.startsWith('it_b52_')).length; await say([`Ein echter 52-Ball! Er fängt jede Kreatur – garantiert.`, `Das ist Nummer ${n} von 11. Irgendwo in der Welt sind noch ${11 - n} versteckt …`]); }
  }
  async rest() { await say('Du legst dich kurz hin…'); await fade(1, 300); this.state.team.forEach(healMon); sfx('heal'); await fade(0, 300); await say('Du fühlst dich erholt! Dein Team ist geheilt.'); }
  async heal(who) {
    const s = this.state;
    await say(['Willkommen im Heilzentrum!', 'Ich kümmere mich kurz um deine Kreaturen…'], { name: who });
    await healAnim(s.team.length);
    s.team.forEach(healMon);
    s.healPoint = { ...(s.ret || {}), map: s.ret?.map || 'quellbach' };
    await say('Deine Kreaturen sind wieder topfit. Komm jederzeit wieder!', { name: who });
    const sw = this.swarm();
    if (!s.dex.caught[sw.sp]) await say(`Übrigens: Heute wurden in ${sw.name} auffällig viele ${SPECIES[sw.sp].name} gesehen!`, { name: who });
  }
  async shop() {
    const s = this.state;
    await say('Willkommen! Was darf es sein?', { name: 'Verkäufer' });
    for (;;) {
      const SH = SHOP.filter(e => !(e[2] > s.badges.filter(Boolean).length));
      const i = await choose([...SH.map(([k, p]) => ({ label: ITEMS[k].name, right: p + '◈', disabled: s.money < p, desc: ITEMS[k].desc })), 'Fertig'], { title: `Geld: ${s.money} ◈`, above: false, x: 60, w: 176 });
      if (i === null || i === SH.length) break;
      const [k, p] = SH[i];
      const n = await choose(['1 Stück', '5 Stück', '10 Stück'].map((l, j) => ({ label: l, right: [1, 5, 10][j] * p + '◈', disabled: s.money < [1, 5, 10][j] * p })), { title: ITEMS[k].name });
      if (n === null) continue;
      const q = [1, 5, 10][n]; s.money -= q * p; s.bag[k] = (s.bag[k] || 0) + q; sfx('caught');
      await say(`Hier sind ${q}× ${ITEMS[k].name}. Vielen Dank!`, { name: 'Verkäufer' });
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
    if (n.trainer) { if (s.flags[n.id]) return say(n.trainer.after || n.trainer.lose || 'Guter Kampf!', N); return this.trainerBattle(n); }
    if (QUESTS[n.id]) return this.quest(n, QUESTS[n.id]);
    switch (n.id) {
      case 'gast_owner': return this.visitFight(n);
      case 'mama':
        if (!s.flags.starter) return say(['Dr. Vato wartet im Labor auf dich, Schatz!', 'Das Labor ist das große Haus mit dem grauen Dach im Süden.'], N);
        if (s.flags.champion && !s.flags.linde_pg) await say(['Dr. Vato hat angerufen! Er möchte dich dringend im Labor sprechen.', 'Er klang… nervös. So kenne ich ihn gar nicht.'], N);
        await say('Du siehst erschöpft aus. Ruh dich kurz aus!', N); s.team.forEach(healMon); sfx('heal'); return say('Dein Team ist wieder fit. Pass auf dich auf!', N);
      case 'nachbarin': return say(['Hast du schon gehört? In Quellbach gibt es eine Brutstätte.', 'Wenn man zwei Kreaturen dort lässt, finden die manchmal ein Ei. Und was da rauskommt… unglaublich!'], N);
      case 'kid1': return say(s.flags.starter ? 'Mit dem SELECT-Knopf siehst du sofort dein Team!' : 'Im hohen Gras leben wilde Kreaturen! Ohne eigene darfst du da nicht rein.', N);
      case 'bauer':
        if (s.flags.starter && !s.bag.vk_zerschneider) { await say(['Na, du hast ja jetzt eine eigene Kreatur!', 'Dann kannst du mir einen Gefallen tun: Überall wuchern kleine Büsche. Mit dieser Technik bekommst du sie weg.'], N); s.bag.vk_zerschneider = 1; sfx('caught'); await say(`${s.name} erhält VM01 ZERSCHNEIDER!`); return say(['Bring sie einer Kreatur bei – im Beutel unter A-KRISTALLE. VMs kann man immer wieder benutzen.', 'Stell dich dann vor einen Busch und drück A. Auf Route 1 und 2 gibt es welche, hinter denen etwas liegt!'], N); }
        return say(['Am Teich kann man angeln – wenn man eine Angel hat.', 'Angler Jo in Quellbach verschenkt manchmal welche.'], N);
      case 'linde':
        if (!s.flags.lindeTalked) { s.flags.lindeTalked = true; return say([`Da bist du ja, ${s.name}!`, 'Jeder Trainer braucht einen Partner. Auf dem Tisch dort liegen drei Bälle mit Kreaturen.', 'Feuer, Wasser oder Pflanze – wähle weise! Sieh sie dir am Tisch an.'], N); }
        if (!s.flags.starter) return say('Die Bälle liegen auf dem Tisch. Sieh sie dir an!', N);
        if (s.flags.champion && !s.flags.linde_pg) return this.lindeSecret(n);
        if (s.flags.linde_pg && !s.bag.urkristall && HUETER.some(k => !s.dex.caught[k])) { s.bag.urkristall = 3; sfx('caught'); await say(['Keine Urbälle mehr? Ich habe noch ein paar gefunden.', `${s.name} erhält 3× URBALL!`], N); }
        if (s.flags.linde_pg && !s.flags.nihilux) await say('Der Riss am Altar im Altwald ist noch offen. Dort warten Kian, Lyra und Nyx – und Nihilux.', N);
        if (s.flags.linde_pg) { const h = HUETER.filter(k => s.dex.caught[k]).length; await say(`Hüter in deiner Chronik: ${h} von 7.${h < 7 ? ' Krater von Ignis, Grotte vor Route 4, Frostgipfel, Drachengipfel – und die Altäre von Mondruine und Sonnentempel.' : ' Alle sieben! Du bist der erste Mensch, dem das gelingt.'}`, N); }
        { const c = Object.keys(s.dex.caught).length, m = Object.keys(s.dex.caught).filter(k => SPECIES[k]?.fusion).length;
          return say([`Deine Chronik: ${Object.keys(s.dex.seen).length} gesehen, ${c} gebunden.`, m ? `Und ${m} Mutation${m > 1 ? 'en' : ''}! So etwas habe ich noch nie gesehen!` : 'Versuch doch mal die Brutstätte in Quellbach – Mutationen sind mein Forschungsgebiet!'], N); }
      case 'nia': return this.heal('Heilerin Nia');
      case 'heal_gast': return say(['Feuer-Kreaturen im Team halten Eier warm – dann schlüpfen sie doppelt so schnell!', 'Und Mutationen können sich sogar weiterentwickeln, wenn ihre Eltern es konnten.'], N);
      case 'clerk': return this.shop();
      case 'hilde': return this.daycare(n);
      case 'opa': return say(['Eine Mutation erbt den Körperbau der Mutter – das ist die Kreatur, die du zuerst abgibst.', 'Vom Vater kommen Farbe und ein besonderes Merkmal: Flügel, Hörner, Flossen …', 'Und manchmal schlüpft ein echter Mutant – stärker als alle anderen!'], N);
      case 'ilse_out': {
        const tips = ['Im Altwald stehen drei Runensteine. Wer alle entzündet, dem erscheint der Hüter des Waldes – aber nur bei Nacht.', 'Einer der Steine steht auf einer kleinen Insel. Eine Brücke führt hinüber.', 'Einer schläft ganz im Westen, wo die Bäume am dichtesten stehen.', 'Und einer wacht im Norden, gleich neben den Ruinen hinter dem hohen Gras.'];
        this.ilse = ((this.ilse ?? -1) + 1) % tips.length; return say(tips[this.ilse], N);
      }
      case 'jo':
        if (!s.bag.angel) { await say(['Du interessierst dich fürs Angeln? Gute Leute erkennt man sofort!', 'Hier, nimm meine alte Angel. Stell dich ans Wasser und drück A!'], N); s.bag.angel = 1; sfx('caught'); return say(`${s.name} erhält die ANGEL!`); }
        return say('In tiefen Seen soll es goldene Drachenfische geben. Ich habe noch nie einen gesehen…', N);
      case 'kid2': return say(['Wasser ist stark gegen Feuer und Erde. Pflanze schlägt Wasser!', 'Und Elektro kann Erde gar nichts anhaben – merk dir das für die Arena!'], N);
      case 'fan': return say(['Arenaleiter Gorm benutzt Erd- und Metall-Kreaturen.', 'Wasser, Pflanze und Feuer haben es leichter gegen ihn!'], N);
      case 'guide': return say(['Hey, Champion in spe! Gorm wartet ganz oben.', 'Seine Kreaturen sind hart wie Stein. Wasser- und Pflanzenattacken helfen enorm!'], N);
      case 'gorm': case 'selma': case 'meri': case 'halvar': return this.gym(n);
      case 'guide4': return say(['Halvars Arena ist ein einziger Eisspiegel. Wer losrutscht, hält erst am nächsten Hindernis!', 'Feuer-, Metall- und Kampfgeist helfen gegen Eis. Viel Glück!'], N);
      case 'fh_kind': return say(['Auf dem zugefrorenen Teich kann man super rutschen!', 'Aber pass auf: Wenn du einmal losrutschst, kannst du nicht mehr bremsen.'], N);
      case 'fh_oma': return say(s.flags.lyra_met ? ['Ein Mädchen mit eisblauem Haar ist durch die Stadt gekommen. Lyra hieß sie, glaube ich.', 'Sie fragte nach der Eisgrotte im Norden. Dort soll ein uralter Stein im Eis schlafen…'] : ['Frostheim ist die kälteste Stadt der Welt.', 'Aber unsere Herzen sind warm!'], N);
      case 'malu':
        if (s.bag.wellenreiter) return say(['Das Meer ist heute spiegelglatt – perfekt zum Surfen!', 'Auf der Insel vor Aqualis haben sich Leute in dunklen Uniformen verschanzt…'], N);
        if (!s.badges[1]) return say(['Ich bin Malu! Ich verleihe Wellenreiter – aber nur an Trainer mit dem Glutorden aus Ignis.', 'Das Meer ist nichts für Anfänger!'], N);
        await say(['Der Glutorden! Respekt. Dann bist du bereit fürs Meer.', 'Hier, nimm diesen Wellenreiter! Stell dich ans Wasser, drück A – und eine Wasser-Kreatur zieht dich.'], N);
        s.bag.wellenreiter = 1; s.bag.vk_surfer = 1; sfx('caught'); await say(`${s.name} erhält den WELLENREITER und VM03 SURFER!`); return say('Bring einer Wasser-, Eis- oder Drachen-Kreatur SURFER bei – oder nimm einfach eine Wasser-Kreatur mit.', N);
      case 'guide3': return say(['Meri lässt dich über ihre Wasserbecken laufen – nur über die Stege!', 'Pflanzen- und Elektro-Attacken sind gegen ihre Kreaturen spitze.'], N);
      case 'aq_fischer': return say(s.flags.eklipse2 ? ['Seit die Uniformierten weg sind, beißen die Fische wieder!'] : ['Auf der Insel im Osten ist eine Höhle. Seit Tagen gehen dort Leute in dunklen Uniformen ein und aus.', 'Ohne Boot kommt man nicht hin… oder man surft!'], N);
      case 'aq_girl': return say(['Nachts leuchten die Quallos in der Bucht. Wunderschön!', 'Aber nicht anfassen – die nesseln!'], N);
      case 'aq_mann': return say(['Arenaleiterin Meri ist zur Insel rausgeschwommen. Sie wollte nachsehen, was Team Eklipse dort treibt.', 'Seitdem ist die Arena zu.'], N);
      case 'guide2': return say(['Selma ist die Herrin des Feuers.', 'Wasser- und Erd-Attacken löschen ihre Flammen am schnellsten!'], N);
      case 'ig_opa': if (s.flags.eklipse1 && !s.bag.vk_zertruemmerer) { await say(['Du hast die Gauner vertrieben! Dafür bekommst du etwas aus meiner alten Bergmannskiste.'], N); s.bag.vk_zertruemmerer = 1; sfx('caught'); await say(`${s.name} erhält VM02 ZERTRÜMMERER!`); return say(['Damit zerschlägt eine Kreatur rissige Felsen. Auf dem Aschepfad liegt hinter so einem Brocken noch was Schönes.'], N); }
        return say(s.flags.eklipse1 ? ['Danke, dass du die Gauner vertrieben hast!', 'Seit Wochen schleichen Leute in dunklen Uniformen um den Krater. Sie suchen etwas, das sie „Herzstein“ nennen…'] : ['Diese Leute in den dunklen Uniformen… Team Eklipse nennen sie sich.', 'Sie haben die Arena besetzt! Kann sie denn niemand vertreiben?'], N);
      case 'ig_kid': return say(['Ignis liegt direkt am Vulkan. Nachts sieht man die Lava glühen!', 'Flammeulen kommen nur in der Dämmerung raus. Ich hab noch nie eine gefangen.'], N);
      case 'ria': case 'rio': return this.coopNpc('zwillinge', n);
      case 'koloss': return this.coopNpc('koloss', n);
      case 'nyx3': case 'lyra3': return this.coopNpc('finale', n);
      case 'morwen': case 'sahra': case 'brann': case 'vala': return this.gym(n);
      case 'r_chronoth': case 'r_vortyx': case 'r_prismora': case 'r_nihilux': return this.raidNpc(n.id);
      case 'riss_kian': return say(['Kian: Zu viert sind wir unschlagbar! Sprich einen der Wächter an – Lyra, Nyx und ich kämpfen mit.', 'Kian: Und wenn deine Freunde online sind, nehmen sie unsere Plätze ein.'], N);
      case 'riss_lyra': return say(s.flags.nihilux ? ['Lyra: Der Riss wird kleiner. Die Welten sind wieder getrennt – aber nicht mehr allein.'] : ['Lyra: Drei Wächter halten den schwarzen Kern im Norden versiegelt.', 'Lyra: Besiegt Chronoth, Vortyx und Prismora. Dann erwacht Nihilux.'], N);
      case 'riss_nyx': return say(['Nyx: Ich kämpfe nicht mehr für Umbra.', 'Nyx: Aber gegen das Ende der Welt? Da bin ich dabei.'], N);
      case 'h_ignarok': case 'h_maristra': case 'h_boreon': case 'h_ferrodrakon': return this.hueter(n);
      case 'e4_1': case 'e4_2': case 'e4_3': case 'e4_4': case 'aurin': return this.liga(n);
      case 'liga_waechter': return say(s.flags.champion ? ['Champion! Die Top 4 nehmen jede Herausforderung an – so oft du willst.'] : ['Dies ist die Liga. Vier Meister und ein Champion warten dort drinnen.', 'Zwischen den Kämpfen gibt es keine Heilung. Wer verliert, fängt von vorn an.'], N);
      case 'dk_alt': if (s.badges[5] && !s.bag.vk_fliegen) { await say(['Du trägst sechs Orden … Dann bist du bereit für die Lüfte.'], N); s.bag.vk_fliegen = 1; sfx('caught'); await say(`${s.name} erhält VM05 FLIEGEN!`); return say('Eine Luft- oder Drachen-Kreatur trägt dich damit zu jeder Stadt, in der du schon ein Heilzentrum besucht hast.', N); }
        return say(s.flags.umbra1 ? ['Ihr habt Umbra vertrieben! Seit hundert Jahren hat niemand gewagt, sich ihm entgegenzustellen.', 'Der Drachenhort im Westen ist jetzt offen. Vala, die Drachenmeisterin, wartet.'] : ['Im Osten hat Team Eklipse den Berg ausgehöhlt. Dort steht ihr Hauptquartier.', 'Mit Branns Erzorden bekommst du das Stahltor auf. Schiebe die Felsbrocken, wo der Weg versperrt ist!'], N);
      case 'dk_kind': return say(['Wenn du einen Felsbrocken in ein Loch schiebst, kann man darüber laufen!', 'Aber man kann Brocken nur schieben, nicht ziehen. Überleg vorher!'], N);
      case 'hort_waechter': return say(['Willkommen im Drachenhort. Hier kämpft Vala, die Meisterin aller Drachen.', 'Wer ihren Orden trägt, hat alle acht Arenen bezwungen.'], N);
      case 'so_waechter': return say(s.badges[5] ? ['Der Tempel liegt östlich der Stadt. Tritt auf die goldenen Platten, um die Tore zu öffnen.', 'Vorhin ist eine Frau in dunklem Mantel hineingegangen…'] : ['Ich bewache den Sonnentempel im Osten.', 'Erst wenn Sahra dir ihren Orden gibt, lasse ich dich ein.'], N);
      case 'so_haendler': return say(['Wasser, frisches Wasser! … Ach, du hast ja schon Beeren.', 'Im Sandmeer gibt es Kaktlinge. Wer ihnen den Hut zurückgibt, hat einen Freund fürs Leben.'], N);
      case 'nc_waechter': return say(s.badges[4] ? ['Die Ruine im Osten ist offen für dich. Pass auf – dort drinnen ist es stockfinster.', 'Ganz hinten soll der Hüter Lunareth wachen.'] : ['Ich bewache die Mondruine. Nur Trägern des Schattenordens lasse ich Einlass.', 'Morwen, unsere Arenaleiterin, entscheidet, wer würdig ist.'], N);
      case 'nc_frau': if (!s.bag.vk_blitz) { await say(['In der ewigen Nacht verirrt man sich leicht. Hier, die hat mir mein Vater gegeben.'], N); s.bag.vk_blitz = 1; sfx('caught'); await say(`${s.name} erhält VM04 BLITZ!`); return say('In der Mondruine erhellt Blitz die Dunkelheit. Elektro-, Licht-, Feuer- und Magie-Kreaturen können ihn lernen.', N); }
        return say(['Seit ich ein Kind war, ist es in Nocturna Nacht. Die Alten sagen, ein Hüter halte die Sonne fern.', 'Manche sagen, er beschütze damit etwas. Andere sagen, er sei einfach einsam.'], N);
      case 'lyra4': {
        await say(['Lyra: Du schon wieder. Ich war vor dir hier – aber ich habe den Stein nicht angerührt.', 'Lyra: Nyx gehorcht jemandem. Der wahre Anführer von Team Eklipse heißt Umbra.', 'Lyra: Er will alle sieben Herzsteine vereinen und die Zeit anhalten. Für immer.', 'Lyra: … Ich weiß nicht mehr, ob das richtig ist. Hol du den Stein. Ich halte Ausschau.'], N);
        s.flags.lyra4 = true; this.ow.npcs = this.ow.npcs.filter(x => x.id !== 'lyra4'); return;
      }
      default: return say('…', N);
    }
  }

  // ---------------------------------------------------------- Story-Ereignisse nach Trainerkämpfen
  async story() {
    const s = this.state, ow = this.ow;
    if (ow.id === 'ligachamp' && s.flags.umbra2 && !s.flags.umbra_end) return this.umbraEnd();
    if (ow.id === 'hq' && s.flags.umbra && !s.flags.umbra1) {
      ow.busy = true;
      await say(['Umbra: Du kämpfst, als hättest du nichts zu verlieren. Oder als hättest du schon alles verloren.', 'Umbra: Behalte den Drachen-Herzstein. Die zwei ältesten Steine hütet der Champion der Liga – die hole ich mir zuerst. Den Rest danach von dir.', 'Umbra: Wir sehen uns dort, wo die Stärksten kämpfen.'], { name: 'Umbra' });
      await fade(1, 300); s.flags.umbra1 = true; ow.npcs = ow.npcs.filter(n => n.id !== 'umbra'); await fade(0, 300);
      s.bag.herzstein_drache = 1; sfx('caught');
      await say([`${s.name} findet im Tresor den DRACHEN-HERZSTEIN!`, 'Fünf von sieben Herzsteinen sind jetzt in Sicherheit.', 'Die Drachenhüterin öffnet den Weg zum Drachenhort westlich von Drakmor.']);
      ow.busy = false; this.save(true); return;
    }
    if (ow.id === 'tempel' && s.flags.nyx4 && !s.flags.nyx4_gone) {
      ow.busy = true;
      await say(['Nyx: … Er wird mich nicht mehr brauchen, wenn ich noch einmal versage.', 'Nyx: Umbra wartet im Drachengebirge Drakmor. Dort laufen alle Fäden zusammen.', 'Nyx: Wenn du klug bist, kommst du nie dorthin.'], { name: 'Kommandantin Nyx' });
      await fade(1, 300); s.flags.nyx4_gone = true; ow.npcs = ow.npcs.filter(n => n.id !== 'nyx4'); await fade(0, 300);
      await say('Der Weg zum Altar ist frei.');
      ow.busy = false; this.save(true); return;
    }
    if (ow.id === 'route5' && s.flags.lyra1 && !s.flags.lyra_met) {
      ow.busy = true;
      const N = { name: 'Lyra' };
      await say(['Team Eklipse will die Herzsteine vereinen, um die Zeit anzuhalten.', 'Du hältst sie für Bösewichte. Ich halte sie für die Einzigen, die verstanden haben, dass unsere Welt zerfällt.', 'Wir sehen uns in Frostheim – oder in der Eisgrotte. Bis dahin: Werde stärker.'], N);
      await fade(1, 300);
      s.flags.lyra_met = true; ow.npcs = ow.npcs.filter(n => n.id !== 'lyra1');
      await fade(0, 300);
      ow.busy = false; this.save(true);
      return;
    }
    if (ow.id === 'versteck' && s.flags.nyx2 && !s.flags.eklipse2) {
      ow.busy = true;
      const N = { name: 'Kommandantin Nyx' };
      await say(['Zweimal… Zweimal von einem Kind besiegt.', 'Behalte den Meeres-Herzstein meinetwegen. Es gibt sieben davon – und der nächste schläft im ewigen Eis von Frostheim.', 'Wenn du dort auftauchst, werde ich nicht mehr spielen.'], N);
      await fade(1, 300);
      s.flags.eklipse2 = true; s.bag.herzstein_meer = 1;
      ow.npcs = ow.npcs.filter(n => n.id !== 'nyx2');
      await fade(0, 300);
      sfx('caught'); await say([`${s.name} erhält den MEERES-HERZSTEIN!`, 'Draußen ist Arenaleiterin Meri zurück in Aqualis. Ihre Arena ist jetzt offen!']);
      ow.busy = false; this.save(true);
      return;
    }
    if (ow.id === 'ignis' && s.flags.ek1 && s.flags.ek2 && !s.flags.eklipse1) {
      ow.busy = true;
      const p = ow.p, nyx = { id: 'nyx', name: 'Kommandantin Nyx', look: LOOK.nyx, x: p.x, y: Math.min(15, p.y + 1), dir: 'up', px: p.x * 16, py: Math.min(15, p.y + 1) * 16 };
      if (ow.solid(nyx.x, nyx.y)) { nyx.y = p.y - 1; nyx.py = nyx.y * 16; nyx.dir = 'down'; }
      await wait(300); ow.npcs.push(nyx); ow.emote = { n: nyx, t: 1 }; sfx('encounter');
      p.dir = nyx.y > p.y ? 'down' : 'up';
      const N = { name: 'Kommandantin Nyx' };
      await say(['So, so. Du bist also das Kind, das meine Rüpel blamiert hat.', 'Ich bin Nyx, Kommandantin von Team Eklipse.', 'Die Glut dieses Vulkans hätte uns einen Herzstein gezeigt. Aber gut – es gibt noch andere.', 'Die Welt zerfällt, und nur wir werden sie anhalten. Merk dir mein Gesicht, Kleines.'], N);
      await fade(1, 300);
      s.flags.eklipse1 = true;
      ow.npcs = ow.npcs.filter(n => !['nyx', 'ek1', 'ek2'].includes(n.id));
      await fade(0, 300);
      await say('Team Eklipse ist verschwunden. Die Arena von Ignis ist wieder offen!');
      ow.busy = false; this.save(true);
    }
  }

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
    ow.emote = { n, t: 0.8 }; sfx('encounter'); await wait(600);
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
    ow.busy = true;
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
    await say(['Aurin: Komm mit. Es ist Zeit, dich in der Ruhmeshalle zu verewigen.']);
    await fade(1, 500);
    await new Promise(res => { push(new HallScene(this, res)); fade(0, 300); });
    await fade(1, 300);
    this.ow.load('home', 2, 3, 'down');
    await fade(0, 500);
    if (first) await say(['Zuhause riecht es nach Pfannkuchen.', 'Mama: Champion! Ich habe es immer gewusst!', 'Mama: Ach ja – Dr. Vato hat angerufen. Er möchte dich dringend im Labor sprechen.']);
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
    const won = await this.trainerFight({ name: n.name, look: n.look, team: G.team, reward: G.reward, lose: G.lose, bg: G.bg || 'arena' });
    if (!won) return say('Komm wieder, wenn du stärker bist!', N);
    s.badges[G.badge] = true; sfx('caught');
    await say([`${s.name} erhält den ${G.badgeName}!`, ...G.gift.text]);
    for (const [k, v] of Object.entries(G.gift.items)) s.bag[k] = (s.bag[k] || 0) + v;
    await say(G.outro, N);
    this.save(true);
  }

  async daycare(n) {
    const s = this.state, dc = s.daycare, N = { name: n.name };
    if (dc.egg) {
      await say('Da bist du ja! Wir haben bei deinen Kreaturen ein Ei gefunden!', N);
      if (s.team.length >= 6) return say('Aber dein Team ist voll. Mach erst Platz!', N);
      if (await ask('Möchtest du das Ei mitnehmen?')) {
        s.team.push(dc.egg); dc.egg = null; dc.steps = 0; sfx('caught');
        await say([`${s.name} erhält das Ei!`, 'Lauf viel herum, dann schlüpft es bald. Feuer-Kreaturen im Team halten es schön warm.'], N);
      }
      return;
    }
    await say(dc.mons.length ? `Deine ${dc.mons.map(monName).join(' und ')} ${dc.mons.length > 1 ? 'spielen fröhlich miteinander' : 'wartet auf Gesellschaft'}.` : 'Willkommen in der Brutstätte! Gib mir zwei Kreaturen – vielleicht finden sie ein Ei.', N);
    for (;;) {
      const i = await choose(['Kreatur abgeben', 'Kreatur abholen', 'Was ist eine Mutation?', 'Tschüss']);
      if (i === null || i === 3) return;
      if (i === 2) { await say(['Geben zwei verschiedene Kreaturen ein Ei, schlüpft daraus eine Mutation – eine ganz neue Art!', 'Körperbau von der ersten Kreatur, die du abgibst. Farben und ein Merkmal von der zweiten.', 'Die Typen mischen sich, die Attacken auch. Gleiche Arten ergeben ein ganz normales Junges.'], N); continue; }
      if (i === 0) {
        if (dc.mons.length >= 2) { await say('Ich passe schon auf zwei Kreaturen auf.', N); continue; }
        const k = await party(s, { select: true, prompt: 'Welche Kreatur abgeben?', filter: m => canBreed(m) && s.team.filter(x => !x.egg && x.hp > 0 && x !== m).length > 0 });
        if (k === null) continue;
        const m = s.team.splice(k, 1)[0]; dc.mons.push(m); dc.steps = 0;
        await say(`${monName(m)} bleibt in der Brutstätte.${dc.mons.length === 1 ? ' Es ist die MUTTER – es vererbt den Körperbau.' : ' Es ist der VATER – es vererbt Farbe und Merkmal.'}`, N);
        if (dc.mons.length === 2) {
          const c = compatibility(dc.mons[0], dc.mons[1]);
          await say(['Die beiden ignorieren einander…', 'Die beiden spielen miteinander.', 'Die beiden verstehen sich gut!', 'Die beiden verstehen sich prächtig!'][c], N);
          if (c) await say('Lauf ein bisschen herum – vielleicht finden wir bald ein Ei!', N);
        }
      }
      if (i === 1) {
        if (!dc.mons.length) { await say('Ich passe gerade auf keine Kreatur auf.', N); continue; }
        if (s.team.length >= 6) { await say('Dein Team ist voll.', N); continue; }
        const k = dc.mons.length === 1 ? 0 : await choose(dc.mons.map(m => ({ label: monName(m), right: 'Lv' + m.lvl })));
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
    this.credits = ['LEGENDS UNITED', '', `Champion: ${s.name}`, `Chronik: ${seen} gesehen, ${caught} gebunden`, `Orden: ${s.badges.filter(Boolean).length} · Herzsteine: 7/7`, '', 'Rivale: Kian', 'Verbündete: Lyra', 'Anführer von Team Eklipse: Umbra', '', 'Arenaleiter', 'Gorm · Selma · Meri · Halvar', 'Morwen · Sahra · Brann · Vala', '', 'Top 4', 'Ranka · Aeris · Mirella · Thalor', 'Champion a.D.: Aurin', '', 'Idee & Spieltest: Gaming Gang', 'Code, Pixel-Art & Musik: mit Claude', '', 'Danke fürs Spielen!'];
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
  constructor(g) { this.g = g; this.done = new Promise(r => (this.res = r)); this.mons = ['funkfux', 'glibbo', 'hoppel', 'eulix', 'brockel', 'flatterlo']; this.waiting = true; }
  update() { if (this.waiting && (input.pressed('a') || input.pressed('start') || input.tap)) { this.waiting = false; this.res(); } }
  draw(ctx) {
    const t = G.t, g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a3a6a'); g.addColorStop(0.6, '#4a8ab8'); g.addColorStop(1, '#8ad0a0'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect((i * 53 + t * 4) % W, (i * 31) % 60, 1, 1); }
    ctx.fillStyle = '#2e6a48'; for (let x = 0; x < W; x += 2) { const y = 118 + Math.sin(x * 0.04 + t * 0.2) * 8; ctx.fillRect(x, y, 2, H - y); }
    ctx.fillStyle = '#3e8a58'; for (let x = 0; x < W; x += 2) { const y = 132 + Math.sin(x * 0.06 + 2) * 5; ctx.fillRect(x, y, 2, H - y); }
    this.mons.forEach((sp, i) => { const x = ((i * 48 + t * 12) % (W + 64)) - 64, y = 100 + Math.sin(t * 3 + i) * 3; ctx.drawImage(monSprite(sp, 'icon'), x, y); });
    text('LEGENDS', W / 2, 18, '#ffffff', 26, 'center', '#20406a', true);
    text('UNITED', W / 2, 46, '#ffd36b', 22, 'center', '#7a3a10', true);
    text('Handheld-Edition · Region Verdantia', W / 2, 74, '#e8f4ff', 7.5, 'center', 'rgba(0,0,0,.4)');
    if (this.waiting && Math.sin(t * 5) > -0.3) text('DRÜCKE  A  ODER  START', W / 2, 92, '#ffffff', 8.5, 'center', 'rgba(0,0,0,.5)', true);
    text('Gaming Gang', W - 4, H - 10, 'rgba(255,255,255,.7)', 6.5, 'right', null);
  }
}
class IntroScene {
  constructor(g) { this.g = g; this.showMon = null; this.look = null; }
  draw(ctx) {
    const g = ctx.createRadialGradient(W / 2, 60, 10, W / 2, 60, 160); g.addColorStop(0, '#f8f0d8'); g.addColorStop(1, '#a8c0d8'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(W / 2, 104, 50, 8, 0, 0, 7); ctx.fill();
    if (this.look) { ctx.drawImage(trainerSprite(this.look), W / 2 - 32, 40); return; }
    ctx.drawImage(trainerSprite(LOOK.linde), this.showMon ? W / 2 - 64 : W / 2 - 32, 40);
    if (this.showMon) ctx.drawImage(monSprite(this.showMon, 'front'), W / 2 + 4, 42 + Math.abs(Math.sin(G.t * 4)) * -3);
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
    ctx.save(); ctx.translate(40, 108); ctx.scale(2, 2); drawChar(ctx, this.look, d, Math.floor(G.t * 5) % 3, 0, 0); ctx.restore();
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
