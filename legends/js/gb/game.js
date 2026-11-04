// LEGENDS UNITED – Handheld-Edition: Spielablauf, Story, Brutstätte, Speichern
import { G, W, H, COL, push, pop, input, text, box, cursor, wait, fade, initEngine, bindPad, frame, wrap } from './engine.js';
import { MAPS, LOOK, ENC, SHOP, ITEMS } from './maps.js';
import { Overworld } from './overworld.js';
import { battle } from './battle2d.js';
import { say, ask, choose, party, summary, dex, card, inputName, hatchScene, settings, typeTag } from './gbui.js';
import { drawChar } from './pixel.js';
import { monSprite, trainerSprite } from './sprites.js';
import { SPECIES, STARTERS } from '../data/creatures.js';
import '../data/creatures2.js';
import { createMon, healMon, maxHp, monName } from '../data/mon.js';
import { ensureSpecies, stepBreeding, hatch, canBreed, compatibility } from '../data/breeding.js';
import { initAudio, sfx, cry, setMusic, setAudio, audioState } from '../core/audio.js';
import { mulberry } from '../core/noise.js';
import { Online } from './online.js';
import { doubleBattle, localDouble } from './double2d.js';
import { COOP, foeSlots } from '../data/coop.js';

const SAVE = 'lu2-save', OPT = 'lu2-opt', DAY = 24 * 60;
const GYMS = {
  gorm: {
    badge: 0, badgeName: 'FELSORDEN', team: [['kaeferix', 13], ['kieselkrebs', 14], ['brockel', 16]], reward: 1600,
    intro: ['Willkommen in der Arena von Felsenau! Ich bin Gorm.', 'Meine Kreaturen sind so standhaft wie die Berge selbst.', 'Zeig mir, ob dein Wille stärker ist als Stein!'],
    lose: 'Unglaublich… Du hast meine Felsen zertrümmert!',
    gift: { text: ['Gorm: Und nimm diese drei Sternkristalle. Du hast sie dir verdient.'], items: { sternkristall: 3 } },
    outro: ['Gorm: Östlich von hier führt der Aschepfad nach Ignis, der Stadt am Vulkan.', 'Dort wartet Selma, die Arenaleiterin des Feuers. Mit meinem Orden lässt dich der Wächter durch!'],
    after: ['Der Felsorden steht dir gut.', 'Der Aschepfad im Osten führt nach Ignis. Selma wartet dort auf dich!'],
  },
  selma: {
    badge: 1, badgeName: 'GLUTORDEN', team: [['glutling', 19], ['funkenkaefer', 20], ['vulkanox', 22]], reward: 2400, bg: 'vulkan',
    intro: ['Endlich ist meine Arena wieder frei – danke dir!', 'Ich bin Selma. Mein Feuer brennt für alle, die mutig genug sind.', 'Zeig mir, wie heiß dein Kampfgeist ist!'],
    lose: 'Was für eine Glut! Du hast mich überstrahlt.',
    gift: { text: ['Selma: Nimm auch diese Supertränke. Feuer heilt nicht – aber die hier schon!'], items: { supertrank: 3 } },
    outro: ['Selma: Team Eklipse war hinter der Glut des Vulkans her. Sie sprachen von „Herzsteinen“.', 'Ihre Kommandantin Nyx ist Richtung Küste gezogen – nach Aqualis.', '(Ende des aktuellen Abschnitts. Aqualis und Frostheim folgen in der nächsten Lieferung!)'],
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
  isNight() { const h = this.hour(); return h >= 20 || h < 6; }
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
    await document.fonts?.load('8px "Pixelify Sans"').catch(() => {});
    this.title();
  }

  async title() {
    setMusic('day');
    const T = new TitleScene(this); push(T);
    const r = await T.done;
    initAudio(); sfx('open');
    const has = !!localStorage.getItem(SAVE);
    const items = [...(has ? ['WEITER'] : []), 'NEUES SPIEL', 'OPTIONEN'];
    for (;;) {
      const i = await choose(items, { x: 70, y: 96, w: 100, cancel: false });
      const k = items[i];
      if (k === 'WEITER') { pop(T); this.state = this.load(); return this.enterWorld(); }
      if (k === 'NEUES SPIEL') { if (has && !(await ask('Dein alter Spielstand wird beim Speichern überschrieben. Trotzdem neu beginnen?'))) continue; pop(T); return this.intro(); }
      if (k === 'OPTIONEN') await this.options();
    }
  }

  async intro() {
    const I = new IntroScene(this); push(I);
    await fade(0, 300);
    const P = { name: 'Prof. Linde' };
    await say(['Hallo! Herzlich willkommen in der Welt von LEGENDS UNITED!', 'Mein Name ist Linde. Die Leute nennen mich die Kreaturen-Professorin.'], P);
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
    this.ow.load(s.map, s.x, s.y, s.dir);
    push(this.ow); this.started = true;
    await fade(0, 400);
    this.online.autoJoin();
    if (fresh) { this.ow.busy = true; await say(['Mama: Guten Morgen, ' + s.name + '!', 'Mama: Prof. Linde wartet in ihrem Labor auf dich – das große graue Haus im Süden des Dorfes.'], {}); this.ow.busy = false; this.save(true); }
  }

  // ---------------------------------------------------------- Menüs
  async startMenu() {
    const s = this.state, ow = this.ow; ow.busy = true;
    const items = [...(s.flags.dex ? ['CHRONIK'] : []), ...(s.team.length ? ['TEAM'] : []), 'BEUTEL', s.name.toUpperCase(), 'ONLINE', 'SPEICHERN', 'OPTIONEN', 'ZURÜCK'];
    for (;;) {
      const i = await choose(items, { above: false, x: W - 86, w: 83 });
      const k = items[i];
      if (i === null || k === 'ZURÜCK') break;
      if (k === 'CHRONIK') await dex(s);
      if (k === 'TEAM') await party(s);
      if (k === 'BEUTEL') await this.bagMenu();
      if (k === s.name.toUpperCase()) await card(s);
      if (k === 'SPEICHERN') { if (await ask('Möchtest du das Spiel speichern?')) { this.save(); await say(`${s.name} hat das Spiel gespeichert.`); } }
      if (k === 'OPTIONEN') await this.options();
      if (k === 'ONLINE') { await this.online.menu(); break; }
    }
    ow.busy = false;
  }
  async quickTeam() { if (!this.state.team.length) return; this.ow.busy = true; await party(this.state); this.ow.busy = false; }
  async bagMenu() {
    const s = this.state;
    for (;;) {
      const keys = Object.keys(ITEMS).filter(k => s.bag[k]);
      if (!keys.length) return say('Der Beutel ist leer.');
      const i = await choose([...keys.map(k => ({ label: ITEMS[k].name, right: ITEMS[k].key ? '' : '×' + s.bag[k] })), 'Zurück'], { title: 'BEUTEL', above: false, x: 4, w: 150 });
      if (i === null || i === keys.length) return;
      const k = keys[i], it = ITEMS[k];
      await say(it.desc);
      if (it.heal) {
        const t = await party(s, { select: true, prompt: 'Wen heilen?', filter: m => !m.egg && m.hp > 0 && m.hp < maxHp(m) });
        if (t === null) continue;
        const m = s.team[t], a = Math.min(it.heal, maxHp(m) - m.hp); m.hp += a; s.bag[k]--; sfx('heal');
        await say(`${monName(m)} wurde um ${a} KP geheilt.`);
      }
    }
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
    if (map === 'felsenau' && to === 'route3' && !s.badges[0]) {
      this.ow.busy = true;
      (async () => { await say(['Ein Wächter hält dich auf: Der Aschepfad ist gefährlich!', 'Nur Trainer mit dem Felsorden aus der Arena von Felsenau dürfen hier durch.']); this.ow.busy = false; })();
      return true;
    }
    if (map === 'moosgrund' && to === 'route1' && !s.flags.gotBalls) {
      this.ow.busy = true;
      (async () => {
        await say(s.flags.starter ? 'Prof. Linde: Warte, ' + s.name + '! Ich habe noch etwas für dich – komm kurz ins Labor!' : 'Eine Stimme ruft: Halt! Ohne eigene Kreatur ist das hohe Gras viel zu gefährlich! Geh erst zu Prof. Linde ins Labor.');
        this.ow.busy = false;
      })();
      return true;
    }
    return false;
  }
  remoteActors(id) { return this.online.actors(id); }
  async onMapLoad(id) {
    const s = this.state;
    this.online.pos(true);
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
  pickWild(encId) {
    const night = this.isNight(), list = ENC[encId].list.filter(e => !e[4] || (e[4] === 'night') === night);
    let r = Math.random() * list.reduce((a, e) => a + e[1], 0);
    for (const e of list) { r -= e[1]; if (r <= 0) return createMon(e[0], e[2] + Math.floor(Math.random() * (e[3] - e[2] + 1))); }
    return createMon(list[0][0], list[0][2]);
  }
  async wildBattle(encId, bg, mon) {
    const s = this.state; if (!s.team.some(m => !m.egg && m.hp > 0)) return;
    this.ow.busy = true;
    const foe = mon || this.pickWild(encId);
    this.markDex(foe.sp);
    sfx('encounter'); await this.flashIn();
    const r = await battle(this, { foeTeam: [foe], bg, intro: foe.sp === 'sylvaron' ? 'legend' : 'wild' });
    await this.afterBattle(r);
    return r;
  }
  async flashIn() { for (let i = 0; i < 3; i++) { await fade(0.8, 60); await fade(0, 60); } await fade(1, 200); setTimeout(() => fade(0, 200), 30); }
  async trainerFight(t) {
    const s = this.state;
    if (!s.team.some(m => !m.egg && m.hp > 0)) { await say('Deine Kreaturen sind erschöpft!'); return false; }
    const rnd = mulberry(t.name.length * 911);
    const foe = t.team.map(([sp, l]) => createMon(sp, l, rnd));
    foe.forEach(m => this.markDex(m.sp));
    sfx('encounter'); await this.flashIn();
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
      this.markDex(m.sp, true);
      await fade(0, 150);
      await say(`${SPECIES[m.sp].name} wurde in deiner Chronik eingetragen!`);
      if (await ask(`Möchtest du ${SPECIES[m.sp].name} einen Spitznamen geben?`)) m.nick = await inputName('Spitzname', SPECIES[m.sp].name);
      if (s.team.length < 6) s.team.push(m); else { s.box.push(m); await say(`${monName(m)} wurde in die Box im Heilzentrum geschickt.`); }
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
  }
  async rest() { await say('Du legst dich kurz hin…'); await fade(1, 300); this.state.team.forEach(healMon); sfx('heal'); await fade(0, 300); await say('Du fühlst dich erholt! Dein Team ist geheilt.'); }
  async heal(who) {
    const s = this.state;
    await say(['Willkommen im Heilzentrum!', 'Ich kümmere mich kurz um deine Kreaturen…'], { name: who });
    await fade(0.6, 200); sfx('heal'); await wait(900); await fade(0, 200);
    s.team.forEach(healMon);
    s.healPoint = { ...(s.ret || {}), map: s.ret?.map || 'quellbach' };
    await say('Deine Kreaturen sind wieder topfit. Komm jederzeit wieder!', { name: who });
  }
  async shop() {
    const s = this.state;
    await say('Willkommen! Was darf es sein?', { name: 'Verkäufer' });
    for (;;) {
      const i = await choose([...SHOP.map(([k, p]) => ({ label: ITEMS[k].name, right: p + '◈', disabled: s.money < p })), 'Fertig'], { title: `Geld: ${s.money} ◈`, above: false, x: 60, w: 176 });
      if (i === null || i === SHOP.length) break;
      const [k, p] = SHOP[i];
      const n = await choose(['1 Stück', '5 Stück', '10 Stück'].map((l, j) => ({ label: l, right: [1, 5, 10][j] * p + '◈', disabled: s.money < [1, 5, 10][j] * p })), { title: ITEMS[k].name });
      if (n === null) continue;
      const q = [1, 5, 10][n]; s.money -= q * p; s.bag[k] = (s.bag[k] || 0) + q; sfx('caught');
      await say(`Hier sind ${q}× ${ITEMS[k].name}. Vielen Dank!`, { name: 'Verkäufer' });
    }
  }
  async pc() {
    const s = this.state;
    await say(`${s.name} schaltet den PC ein. Kreaturen-Box geöffnet.`);
    for (;;) {
      const i = await choose(['Kreatur nehmen', 'Kreatur ablegen', 'Tschüss'], { title: `BOX (${s.box.length})` });
      if (i === null || i === 2) break;
      if (i === 0) {
        if (!s.box.length) { await say('Die Box ist leer.'); continue; }
        if (s.team.length >= 6) { await say('Dein Team ist voll.'); continue; }
        const k = await choose(s.box.map(m => ({ label: monName(m), right: 'Lv' + m.lvl })), { title: 'Welche?', max: 7 });
        if (k === null) continue;
        const m = s.box.splice(k, 1)[0]; healMon(m); s.team.push(m); sfx('click');
      } else {
        const k = await party(s, { select: true, prompt: 'Welche ablegen?', filter: m => s.team.filter(x => !x.egg && x.hp > 0 && x !== m).length > 0 });
        if (k === null) continue;
        s.box.push(s.team.splice(k, 1)[0]); sfx('click');
      }
    }
  }
  async fish() {
    const s = this.state;
    if (!s.bag.angel) return say('Das Wasser ist glasklar. Mit einer Angel könnte man hier etwas fangen.');
    if (!s.team.some(m => !m.egg && m.hp > 0)) return say('Deine Kreaturen sind zu erschöpft.');
    await say('Du wirfst die Angel aus…');
    await wait(600 + Math.random() * 1400);
    if (Math.random() < 0.3) return say('Nichts beißt an…');
    sfx('encounter'); await say('Oh! Etwas beißt an!');
    await this.wildBattle('wasser', 'wasser');
  }
  async rune(id) {
    const s = this.state;
    if (s.flags[id]) return say('Der Runenstein leuchtet in einem ruhigen, grünen Licht.');
    await say(['Ein uralter Stein mit einer eingeritzten Rune.', 'Du legst deine Hand darauf…']);
    s.flags[id] = true; sfx('rune');
    s.bag.sternkristall = (s.bag.sternkristall || 0) + 1;
    const n = ['rune_nord', 'rune_insel', 'rune_hain'].filter(r => s.flags[r]).length;
    await say([`Die Rune beginnt zu leuchten! (${n}/3)`, 'Am Fuß des Steins liegt ein Sternkristall!']);
    if (n === 3) await say('Ein tiefes Summen geht durch den ganzen Wald… Der Altar in den Ruinen ruft dich – bei Nacht.');
  }
  async altar() {
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
    if (s.flags.starter) return say('Auf dem Tisch liegen nur noch zwei Kristalle. Die gehören der Professorin.');
    if (!s.flags.lindeTalked) return say('Drei Kristalle leuchten auf dem Tisch. Vielleicht sollte ich zuerst mit Prof. Linde sprechen.');
    for (;;) {
      const i = await choose(STARTERS.map(id => ({ label: SPECIES[id].name, right: SPECIES[id].types[0].toUpperCase() })), { title: 'Welcher Kristall?' });
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
      await say(['Prof. Linde: Fantastisch! Hier, nimm diese Chronik – sie zeichnet jede Kreatur auf, die du siehst oder bindest.', 'Und 5 Bindkristalle! Schwäche wilde Kreaturen und wirf dann einen Kristall.', 'In Quellbach, nördlich von hier, gibt es ein Heilzentrum und eine Brutstätte. Dort entstehen aus zwei Kreaturen sogar neue Mutationen!'], {});
      s.flags.dex = true; s.flags.gotBalls = true; s.bag.kristall = (s.bag.kristall || 0) + 5; sfx('lvl');
      this.save(true);
      return;
    }
  }

  // ---------------------------------------------------------- Gespräche
  async talk(n) {
    const s = this.state, N = { name: n.name };
    if (n.trainer) { if (s.flags[n.id]) return say(n.trainer.after || n.trainer.lose || 'Guter Kampf!', N); return this.trainerBattle(n); }
    switch (n.id) {
      case 'mama':
        if (!s.flags.starter) return say(['Prof. Linde wartet im Labor auf dich, Schatz!', 'Das Labor ist das große Haus mit dem grauen Dach im Süden.'], N);
        await say('Du siehst erschöpft aus. Ruh dich kurz aus!', N); s.team.forEach(healMon); sfx('heal'); return say('Dein Team ist wieder fit. Pass auf dich auf!', N);
      case 'nachbarin': return say(['Hast du schon gehört? In Quellbach gibt es eine Brutstätte.', 'Wenn man zwei Kreaturen dort lässt, finden die manchmal ein Ei. Und was da rauskommt… unglaublich!'], N);
      case 'kid1': return say(s.flags.starter ? 'Mit dem SELECT-Knopf siehst du sofort dein Team!' : 'Im hohen Gras leben wilde Kreaturen! Ohne eigene darfst du da nicht rein.', N);
      case 'bauer': return say(['Am Teich kann man angeln – wenn man eine Angel hat.', 'Angler Jo in Quellbach verschenkt manchmal welche.'], N);
      case 'linde':
        if (!s.flags.lindeTalked) { s.flags.lindeTalked = true; return say([`Da bist du ja, ${s.name}!`, 'Jeder Trainer braucht einen Partner. Auf dem Tisch dort liegen drei Kristalle mit Kreaturen.', 'Feuer, Wasser oder Pflanze – wähle weise! Sieh sie dir am Tisch an.'], N); }
        if (!s.flags.starter) return say('Die Kristalle liegen auf dem Tisch. Sieh sie dir an!', N);
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
      case 'gorm': case 'selma': return this.gym(n);
      case 'guide2': return say(['Selma ist die Herrin des Feuers.', 'Wasser- und Erd-Attacken löschen ihre Flammen am schnellsten!'], N);
      case 'ig_opa': return say(s.flags.eklipse1 ? ['Danke, dass du die Gauner vertrieben hast!', 'Seit Wochen schleichen Leute in dunklen Uniformen um den Krater. Sie suchen etwas, das sie „Herzstein“ nennen…'] : ['Diese Leute in den dunklen Uniformen… Team Eklipse nennen sie sich.', 'Sie haben die Arena besetzt! Kann sie denn niemand vertreiben?'], N);
      case 'ig_kid': return say(['Ignis liegt direkt am Vulkan. Nachts sieht man die Lava glühen!', 'Flammeulen kommen nur in der Dämmerung raus. Ich hab noch nie eine gefangen.'], N);
      case 'ria': case 'rio': return this.coopNpc('zwillinge', n);
      case 'koloss': return this.coopNpc('koloss', n);
      default: return say('…', N);
    }
  }

  // ---------------------------------------------------------- Story-Ereignisse nach Trainerkämpfen
  async story() {
    const s = this.state, ow = this.ow;
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
  async coopReward(id) {
    const d = COOP[id], s = this.state;
    if (s.flags['coop_' + id]) { await say('Super Kampf! (Die Belohnung gab es schon.)'); return; }
    s.flags['coop_' + id] = true;
    if (d.lose) await say(d.lose);
    s.money += d.reward; await say(`Du erhältst ${d.reward} ◈ Preisgeld!`);
    if (d.item) { s.bag[d.item[0]] = (s.bag[d.item[0]] || 0) + d.item[1]; sfx('caught'); await say(`Du findest ${d.item[1]}× ${ITEMS[d.item[0]].name}!`); }
    if (id === 'koloss') this.ow.npcs = this.ow.npcs.filter(x => x.id !== 'koloss');
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
game.start();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
