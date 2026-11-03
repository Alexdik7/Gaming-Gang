// LEGENDS UNITED – Hauptprogramm (Phase 1: Verdantia-Prototyp)
import * as THREE from './vendor/three.module.min.js';
import { World, VILLAGE, TEMPLE, RUNES, LAKE, SIZE } from './world/world.js';
import { buildHuman, animateHuman, buildCreature, animateCreature } from './world/models.js';
import { BattleView } from './battle/battleView.js';
import { SPECIES, STARTERS, RARITY } from './data/creatures.js';
import { MOVES } from './data/moves.js';
import { TYPES } from './data/types.js';
import { createMon, healMon, maxHp, monName, calcStats, xpForLevel } from './data/mon.js';
import { Input } from './core/input.js';
import { initAudio, sfx, cry, setMusic, setAudio, audioState } from './core/audio.js';
import { $, esc, toast, choose, dialog, typeChip } from './core/ui.js';
import { Net } from './net/net.js';
import { mulberry } from './core/noise.js';

const VERSION = '0.1.0';
const DAY = 24 * 60;
const SAVE_SOLO = 'lu-save-solo';
const SETTINGS = 'lu-settings';
const wait = ms => new Promise(r => setTimeout(r, ms));
const frame = () => new Promise(r => requestAnimationFrame(() => r()));

const LOOKS = {
  skin: ['#f6d2b8', '#e8b892', '#c98e62', '#a06a44', '#6e4a30'],
  hair: ['#2a1d16', '#6b3f22', '#d9a441', '#e8e2d6', '#c4462e', '#3d5bd9', '#9b5de5'],
  outfit: ['#e84a5f', '#3d8bfd', '#2ec27e', '#f6b73c', '#8e5cf7', '#2b2d42'],
  cap: [null, '#e84a5f', '#2b2d42', '#3d8bfd', '#f6f6f6'],
};

function weatherAt(t, seed = 52) {
  const slot = Math.floor(t / 360); const r = Math.abs(Math.sin(slot * 91.7 + seed * 3.1)) % 1;
  if (slot <= 1) return 'klar';
  return r < 0.55 ? 'klar' : r < 0.8 ? 'wolkig' : 'regen';
}

// Wildgebiete: [Art, Gewicht, minLv, maxLv, Zeit]
const POOLS = {
  wiese: [['zirpfink', 30, 2, 5, 'day'], ['sporlich', 14, 3, 5], ['moospanzer', 8, 4, 6], ['voltmotte', 18, 4, 7, 'night'], ['funkfux', 2, 4, 6]],
  wald: [['sporlich', 26, 3, 6], ['zirpfink', 14, 3, 5, 'day'], ['schemenohr', 14, 5, 8, 'night'], ['sprossling', 2, 4, 6], ['voltmotte', 8, 5, 7, 'night']],
  ufer: [['kieselkrebs', 24, 4, 8], ['moospanzer', 16, 5, 8], ['tropfmolch', 3, 5, 7], ['zirpfink', 8, 4, 6, 'day']],
  ruinen: [['schemenohr', 20, 8, 12, 'night'], ['kieselkrebs', 14, 8, 11], ['voltmotte', 10, 8, 11, 'night'], ['moospanzer', 10, 8, 11, 'day']],
};

const QUESTS = {
  start: { title: 'Ein neuer Morgen', text: 'Besuche Professorin Linde in ihrem Labor im Westen des Dorfes.' },
  rival: { title: 'Die erste Herausforderung', text: 'Dein Rivale Kian wartet am Nordausgang des Dorfes.' },
  catch3: { title: 'Erste Freunde', text: 'Binde 3 wilde Kreaturen mit Bindkristallen. (Kristalle gibt es im Laden.)' },
  ruins: { title: 'Das Flüstern der Ruinen', text: 'Folge dem Pfad nach Norden und untersuche den Altar in den Tempelruinen.' },
  runes: { title: 'Die drei Runensteine', text: 'Finde und entzünde die drei Runensteine Verdantias.' },
  night: { title: 'Das Herz des Waldes', text: 'Kehre bei Nacht zum Altar zurück. Etwas erwartet dich.' },
  done: { title: 'Fortsetzung folgt', text: 'Verdantia ist erkundet! Die Arena von Moosgrund, weitere Regionen und Koop-Kämpfe folgen in den nächsten Entwicklungsphasen.' },
};

class Game {
  constructor() {
    this.settings = Object.assign({ quality: matchMedia('(pointer:coarse)').matches ? 'mittel' : 'hoch', music: true, sfx: true, server: '', camSens: 1 }, safeJSON(localStorage.getItem(SETTINGS)) || {});
    setAudio('music', this.settings.music); setAudio('sfx', this.settings.sfx);
    this.mode = 'boot'; this.t = 0; this.remotes = new Map(); this.wilds = []; this.npcs = [];
    this.net = new Net(); this.saveKey = SAVE_SOLO; this.lastBattleEnd = 0;
  }

  // ---------------------------------------------------------- Setup
  async boot() {
    const bar = $('#boot-bar'), txt = $('#boot-txt');
    const step = async (p, msg) => { bar.style.width = p + '%'; txt.textContent = msg; await frame(); await frame(); };
    await step(5, 'Starte Engine…');
    const canvas = $('#c');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.settings.quality !== 'niedrig', powerPreference: 'high-performance' });
    this.applyQuality();
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog('#cfeaff', 60, 210);
    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1200);
    const sun = new THREE.DirectionalLight('#fff2dd', 2.2);
    sun.castShadow = true; const sc = sun.shadow.camera; sc.left = sc.bottom = -45; sc.right = sc.top = 45; sc.far = 220;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
    this.scene.add(sun, sun.target);
    const hemi = new THREE.HemisphereLight('#d8ecff', '#4a6a3a', 1.0); this.scene.add(hemi);
    this.lights = { sun, hemi };
    this.applyShadows();
    await step(15, 'Erschaffe Verdantia – Gelände, Flüsse, Wälder…');
    this.world = new World(this.scene, 52);
    await step(70, 'Wecke die Kreaturen…');
    this.map = this.world.makeMap(256);
    this.input = new Input(canvas, { stick: $('#stick'), knob: $('#knob') });
    this.bv = new BattleView(this);
    this.player = { pos: new THREE.Vector3(VILLAGE.x, 0, VILLAGE.z + 8), rot: Math.PI, speed: 0, model: null };
    this.cam = { yaw: 0, pitch: 0.42, dist: 9, tdist: 9 };
    this.setupNPCs();
    await step(90, 'Fast fertig…');
    addEventListener('resize', () => this.resize()); this.resize();
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.save(); });
    this.bindUI(); this.bindNet();
    this.state = null;
    // Hintergrund für Titelbildschirm
    this.cam.yaw = 2.4; this.player.pos.set(TEMPLE.x + 6, 0, TEMPLE.z + 30);
    await step(100, 'Bereit!');
    this.last = performance.now();
    this.renderer.setAnimationLoop(() => this.loop());
    $('#boot-start').hidden = false; $('#boot-txt').textContent = 'Tippe zum Starten';
    await new Promise(r => ($('#boot-start').onclick = r));
    initAudio(); sfx('open');
    $('#boot').classList.add('gone'); setTimeout(() => ($('#boot').hidden = true), 700);
    this.showTitle();
  }
  applyQuality() {
    const q = this.settings.quality;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, q === 'hoch' ? 2 : q === 'mittel' ? 1.5 : 1));
  }
  applyShadows() {
    const q = this.settings.quality;
    this.renderer.shadowMap.enabled = q !== 'niedrig';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const s = q === 'hoch' ? 2048 : 1024; this.lights.sun.shadow.mapSize.set(s, s);
  }
  resize() {
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
  }
  saveSettings() { try { localStorage.setItem(SETTINGS, JSON.stringify(this.settings)); } catch {} }

  // ---------------------------------------------------------- Titel & Charaktererstellung
  showTitle() {
    this.mode = 'title'; setMusic('day');
    const has = !!safeJSON(localStorage.getItem(SAVE_SOLO));
    const t = $('#title'); t.hidden = false;
    t.innerHTML = `<div class="logo"><small>Gaming Gang präsentiert</small><h1>LEGENDS<br><span>UNITED</span></h1><p>Ein Kreaturen-Abenteuer für bis zu 4 Freunde</p></div>
      <div class="tmenu">
        ${has ? '<button class="btn big" data-a="continue">▶ Fortsetzen (Solo)</button>' : ''}
        <button class="btn big ${has ? 'ghost' : ''}" data-a="new">✦ Neues Abenteuer (Solo)</button>
        <button class="btn big ghost" data-a="mp">👥 Multiplayer-Welten</button>
        <button class="btn ghost" data-a="settings">⚙ Einstellungen</button>
      </div><div class="ver">Phase 1 · v${VERSION}</div>`;
    t.onclick = async e => {
      const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
      sfx('click');
      if (a === 'continue') { t.hidden = true; this.startGame(safeJSON(localStorage.getItem(SAVE_SOLO)), SAVE_SOLO); }
      if (a === 'new') {
        if (has && (await choose('Vorhandenen Solo-Spielstand überschreiben?', [{ label: 'Ja, neu beginnen' }])) !== 0) return;
        t.hidden = true; const st = await this.createCharacter(); this.startGame(st, SAVE_SOLO);
      }
      if (a === 'mp') { t.hidden = true; this.showMultiplayer(); }
      if (a === 'settings') this.openSettings();
    };
  }

  createCharacter(preset) {
    return new Promise(res => {
      this.mode = 'create';
      const look = preset?.look || { skin: LOOKS.skin[1], hair: LOOKS.hair[0], outfit: LOOKS.outfit[0], cap: LOOKS.cap[1], accent: '#f2d16b' };
      let name = preset?.name || '';
      this.player.pos.set(VILLAGE.x - 6, 0, VILLAGE.z + 14); this.player.pos.y = this.world.height(this.player.pos.x, this.player.pos.z); this.player.rot = 0;
      this.cam.yaw = 0; this.snapCam = true; this.player.model?.position.copy(this.player.pos);
      this.setPlayerModel(look);
      const cc = $('#create'); cc.hidden = false;
      const sw = (k) => `<div class="row"><label>${{ skin: 'Haut', hair: 'Haare', outfit: 'Outfit', cap: 'Mütze' }[k]}</label><div class="sw">${LOOKS[k].map(c =>
        `<button class="swc ${look[k] === c ? 'on' : ''}" data-k="${k}" data-c="${c}" style="--c:${c || 'transparent'}">${c ? '' : '✕'}</button>`).join('')}</div></div>`;
      const render = () => {
        cc.innerHTML = `<div class="panel cpanel"><h2>Wer bist du?</h2>
          <input id="cname" maxlength="14" placeholder="Dein Name" value="${esc(name)}">
          ${sw('skin')}${sw('hair')}${sw('outfit')}${sw('cap')}
          <button class="btn big" data-a="ok">Abenteuer beginnen</button></div>`;
        $('#cname').oninput = e => (name = e.target.value);
      };
      render();
      cc.onclick = e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.k) { look[b.dataset.k] = b.dataset.c === 'null' ? null : b.dataset.c; sfx('click'); this.setPlayerModel(look); render(); }
        if (b.dataset.a === 'ok') {
          name = name.trim(); if (!name) { $('#cname').focus(); toast('Bitte gib einen Namen ein.'); return; }
          sfx('open'); cc.hidden = true; cc.onclick = null;
          res(this.newState(name, look));
        }
      };
    });
  }
  newState(name, look) {
    return {
      v: 1, name, look, created: Date.now(), pos: { x: VILLAGE.x - 8, z: VILLAGE.z + 12 }, rot: Math.PI,
      team: [], box: [], bag: { kristall: 0, sternkristall: 0, trank: 3 }, money: 1500,
      dex: { seen: {}, caught: {} }, flags: {}, quest: 'start', time: DAY * 0.3,
      stats: { battles: 0, wins: 0, caught: 0, dist: 0, playtime: 0 },
    };
  }
  setPlayerModel(look) {
    if (this.player.model) this.scene.remove(this.player.model);
    this.player.model = buildHuman(look); this.player.model.position.copy(this.player.pos); this.scene.add(this.player.model);
  }

  // ---------------------------------------------------------- Spielstart
  startGame(state, key, online = null) {
    this.state = state; this.saveKey = key; this.online = online;
    state.flags ||= {}; state.stats ||= { battles: 0, wins: 0, caught: 0, dist: 0, playtime: 0 };
    this.setPlayerModel(state.look);
    this.player.pos.set(state.pos.x, this.world.height(state.pos.x, state.pos.z), state.pos.z); this.player.rot = state.rot || 0;
    this.cam.yaw = this.player.rot + Math.PI; this.snapCam = true;
    this.mode = 'world'; $('#hud').hidden = false;
    this.refreshWorldFlags(); this.updateFollower(); this.updateHud(true);
    if (state.quest === 'start' && !state.flags.intro) {
      state.flags.intro = true;
      setTimeout(() => dialog('Mama', [
        `Guten Morgen, ${esc(state.name)}! Heute ist dein großer Tag.`,
        'Professorin Linde hat nach dir gefragt – ihr Labor ist das Haus mit der Kuppel, gleich westlich vom Brunnen.',
        'Und vergiss nicht: In Verdantia ist der Wald nie still. Pass gut auf dich auf!',
      ]), 600);
    }
    clearInterval(this.autosave); this.autosave = setInterval(() => this.save(), 20000);
  }

  save() {
    const s = this.state; if (!s || this.mode === 'title') return;
    s.pos = { x: +this.player.pos.x.toFixed(2), z: +this.player.pos.z.toFixed(2) }; s.rot = this.player.rot; s.savedAt = Date.now();
    try { localStorage.setItem(this.saveKey, JSON.stringify(s)); } catch {}
    if (this.net.online) this.net.send({ t: 'save', data: s });
  }

  // ---------------------------------------------------------- NPCs
  setupNPCs() {
    const V = VILLAGE;
    const defs = [
      { id: 'linde', name: 'Prof. Linde', x: V.x - 10, z: V.z - 4, rot: Math.PI / 2, look: { skin: '#f0c8a8', hair: '#e8e2d6', outfit: '#f4f4f4', pants: '#5a6b7a', accent: '#6fa8dc' } },
      { id: 'kian', name: 'Kian', x: V.x + 2.5, z: V.z - 33, rot: Math.PI, look: { skin: '#c98e62', hair: '#1a1a2a', outfit: '#2b2d42', cap: '#e84a5f', accent: '#e84a5f' } },
      { id: 'ilse', name: 'Oma Ilse', x: V.x + 3, z: V.z + 3, rot: -0.8, look: { skin: '#f6d2b8', hair: '#d8d8d8', outfit: '#9b5de5', pants: '#6b4a7a', accent: '#d9c7a0' } },
      { id: 'nia', name: 'Heilerin Nia', x: V.x + 10.5, z: V.z - 3, rot: -Math.PI / 2, look: { skin: '#e8b892', hair: '#c4462e', outfit: '#7cf2a0', pants: '#f4f4f4', accent: '#ffffff' } },
      { id: 'mara', name: 'Pilzsammlerin Mara', x: -30, z: -22, rot: 0.9, trainer: { team: [['sporlich', 7], ['zirpfink', 8]], reward: 600 }, look: { skin: '#a06a44', hair: '#6b3f22', outfit: '#c94a6a', accent: '#fff2dc' } },
      { id: 'jo', name: 'Angler Jo', x: 31, z: -1, rot: 1.6, trainer: { team: [['kieselkrebs', 9], ['moospanzer', 10]], reward: 900 }, look: { skin: '#e8b892', hair: '#2a1d16', outfit: '#3d8bfd', cap: '#f6b73c', accent: '#f6b73c' } },
      { id: 'wache', name: 'Ruinenwächterin Sera', x: 4, z: -55, rot: Math.PI, trainer: { team: [['schemenohr', 11], ['voltmotte', 11], ['kieselkrebs', 12]], reward: 1500 }, look: { skin: '#6e4a30', hair: '#e8e2d6', outfit: '#5b4a7a', accent: '#8e7bff' } },
    ];
    for (const d of defs) {
      const m = buildHuman(d.look); m.position.set(d.x, this.world.height(d.x, d.z), d.z); m.rotation.y = d.rot;
      this.scene.add(m); this.npcs.push({ ...d, model: m, baseRot: d.rot });
      this.world.colliders.push({ x: d.x, z: d.z, hw: 0.45, hd: 0.45 });
    }
  }

  async talk(npc) {
    const s = this.state;
    npc.model.rotation.y = Math.atan2(this.player.pos.x - npc.x, this.player.pos.z - npc.z);
    if (npc.id === 'linde') {
      if (s.quest === 'start') {
        await dialog('Prof. Linde', [
          `Da bist du ja, ${esc(s.name)}! Ich bin Professorin Linde und erforsche die Kreaturen Verdantias.`,
          'Seit Wochen spielen die Runensteine im Wald verrückt. Irgendetwas regt sich im Herzen des Waldes…',
          'Dafür brauche ich mutige Trainer. Und jeder Trainer braucht einen Partner. Wähle weise!',
        ]);
        let pick = null;
        while (pick === null) {
          pick = await choose('Wähle deinen Partner', STARTERS.map(id => {
            const S = SPECIES[id];
            return { html: `<div class="starter"><b>${S.name}</b><div>${S.types.map(typeChip).join('')}</div><small>${S.lore}</small></div>` };
          }), { cancel: null });
        }
        const sp = STARTERS[pick];
        const mon = createMon(sp, 5, Math.random, { friendship: 120 });
        this.addMon(mon, true);
        s.bag.kristall += 5; s.quest = 'rival';
        sfx('caught'); cry(SPECIES[sp].cry);
        await dialog('Prof. Linde', [
          `${SPECIES[sp].name} scheint dich sofort zu mögen!`,
          'Hier sind 5 Bindkristalle. Schwäche wilde Kreaturen im Kampf und wirf dann einen Kristall – so bindest du sie an dich.',
          'Ach ja: Mein Enkel Kian ist vorhin losgezogen. Er wartet bestimmt schon am Nordausgang auf dich…',
        ]);
        this.updateFollower(); this.updateHud(true); this.save();
      } else {
        const seen = Object.keys(s.dex.seen).length, caught = Object.keys(s.dex.caught).length;
        await dialog('Prof. Linde', [`Deine Chronik: ${seen} gesehen, ${caught} gebunden. ${caught >= 10 ? 'Unglaublich! Du kennst Verdantia besser als ich.' : 'Jede Kreatur hat ihre Zeit – manche zeigen sich nur nachts oder bei Regen.'}`]);
      }
    } else if (npc.id === 'kian') {
      if (s.quest === 'start') return dialog('Kian', ['Hm? Ohne Kreatur gehst du nirgendwohin. Hol dir erst einen Partner bei Oma… äh, Professorin Linde.']);
      if (!s.flags.kian1) {
        await dialog('Kian', [`Na endlich, ${esc(s.name)}! Ich hab extra auf dich gewartet.`, 'Lass uns sehen, wer von uns der bessere Trainer ist!']);
        const counter = { funkfux: 'tropfmolch', tropfmolch: 'sprossling', sprossling: 'funkfux' }[s.team[0]?.sp] || 'funkfux';
        const won = await this.trainerBattle({ name: 'Kian', team: [[counter, 5]], reward: 500 });
        if (won) {
          s.flags.kian1 = true; s.quest = 'catch3';
          await dialog('Kian', ['Pff… Glück gehabt! Beim nächsten Mal mach ich dich fertig.', 'Wusstest du, dass in den Ruinen im Norden nachts seltsame Lichter leuchten? Ich hab mich nicht hingetraut… noch nicht!']);
        } else await dialog('Kian', ['Ha! Ich hab gewonnen. Lass deine Kreaturen im Heilzentrum heilen und komm wieder!']);
        this.updateHud(true);
      } else await dialog('Kian', ['Ich trainiere gerade an der Wiese. Beim nächsten Mal gewinne ich!']);
    } else if (npc.id === 'ilse') {
      const tips = [
        'Früher erzählte man sich von einem weißen Hirsch mit leuchtendem Geweih. Er soll nur erscheinen, wenn die drei Steine singen.',
        'Ein Stein schläft hinter dem Wasserfall – man hört ihn nur, wenn man ganz nah an das Rauschen geht.',
        'Am See gibt es eine Sandbank, die zu einer kleinen Insel führt. Man muss nur genau hinschauen.',
        'Im Westen liegt ein Hain, so dunkel, dass selbst die Vögel verstummen. Ein schmaler Pfad führt hinein.',
        'Manche Kreaturen kommen nur nachts heraus. Und bei Regen wird der Wald ganz anders…',
      ];
      await dialog('Oma Ilse', [tips[(this.ilseIdx = ((this.ilseIdx ?? -1) + 1) % tips.length)]]);
    } else if (npc.id === 'nia') {
      await this.heal('Heilerin Nia');
    } else if (npc.trainer) {
      if (s.flags['tr_' + npc.id]) return dialog(npc.name, ['Ein toller Kampf war das! Trainiere weiter.']);
      if (!s.team.length) return dialog(npc.name, ['Du hast ja gar keine Kreaturen dabei!']);
      await dialog(npc.name, [{ mara: 'Psst! Du störst meine Pilze… Na gut, ein Kampf!', jo: 'Die Fische beißen heute nicht. Dann eben ein Kampf!', wache: 'Niemand betritt die Ruinen, der nicht stark genug ist. Beweise es!' }[npc.id]]);
      const won = await this.trainerBattle({ name: npc.name, team: npc.trainer.team, reward: npc.trainer.reward });
      if (won) { s.flags['tr_' + npc.id] = true; if (npc.id === 'wache') await dialog(npc.name, ['Du bist würdig. Die Ruinen gehören dir – aber hüte dich vor der Nacht.']); }
    }
  }

  async heal(who) {
    await dialog(who, ['Ich kümmere mich um deine Kreaturen…']);
    this.state.team.forEach(healMon); sfx('heal');
    toast('💚 Dein Team ist vollständig geheilt!');
    this.save();
  }

  // ---------------------------------------------------------- Interaktionen
  nearestInteract() {
    const p = this.player.pos; let best = null, bd = 1e9;
    for (const it of this.world.interact) { const d = Math.hypot(p.x - it.x, p.z - it.z); if (d < it.r && d < bd) { bd = d; best = { ...it, type: 'obj' }; } }
    for (const n of this.npcs) { const d = Math.hypot(p.x - n.x, p.z - n.z); if (d < 2.4 && d < bd) { bd = d; best = { id: n.id, label: n.name, type: 'npc', npc: n }; } }
    return best;
  }

  async interact(it) {
    if (this.busy) return; this.busy = true; this.input.enabled = false;
    try {
      if (it.type === 'npc') await this.talk(it.npc);
      else await this.useObject(it.id);
    } finally { this.busy = false; this.input.enabled = true; this.updateHud(true); }
  }

  async useObject(id) {
    const s = this.state;
    if (id === 'lab') return this.talk(this.npcs.find(n => n.id === 'linde'));
    if (id === 'heal') return this.heal('Heilzentrum');
    if (id === 'well') return dialog('Alter Brunnen', ['Auf dem Brunnenrand ist eine Inschrift: „Drei Steine, drei Lieder – erst wenn sie gemeinsam klingen, erwacht der Hüter.“']);
    if (id === 'sign_dorf') return dialog('Schild', ['MOOSGRUND – Das Tor zum Wald von Verdantia.', 'Norden: Tempelruinen · Osten: Kristallsee & Wasserfall · Westen: Schattenhain']);
    if (id === 'shop') return this.shop();
    if (id === 'home') return this.home();
    if (id.startsWith('rune_')) return this.rune(id);
    if (id === 'altar') return this.altar();
  }

  async shop() {
    const s = this.state;
    const items = [['kristall', 'Bindkristall', 200], ['trank', 'Heiltrank', 300], ['sternkristall', 'Sternkristall', 700]];
    for (;;) {
      const i = await choose(`Kristallladen · Dein Geld: ${s.money} ◈`, items.map(([k, n, p]) => ({ label: `${n} – ${p} ◈ (du hast ${s.bag[k] || 0})`, disabled: s.money < p })), { cancel: 'Fertig' });
      if (i === null) break;
      const [k, n, p] = items[i]; s.money -= p; s.bag[k] = (s.bag[k] || 0) + 1; sfx('caught'); toast(`${n} gekauft!`);
    }
    this.save();
  }

  async home() {
    const s = this.state;
    const i = await choose('Dein Zuhause', [{ label: '🛏 Ausruhen (Team heilen)' }, { label: `📦 Kreaturen-Box (${s.box.length})` }], { cancel: 'Gehen' });
    if (i === 0) { await dialog('Zuhause', ['Du ruhst dich eine Weile aus…']); s.team.forEach(healMon); sfx('heal'); toast('💚 Team geheilt'); }
    if (i === 1) await this.boxMenu();
    this.save();
  }

  async boxMenu() {
    const s = this.state;
    for (;;) {
      const i = await choose('Kreaturen-Box', [
        ...s.box.map(m => ({ label: `📦 ${monName(m)} · Lv ${m.lvl} → ins Team` })),
        ...s.team.map(m => ({ label: `🐾 ${monName(m)} · Lv ${m.lvl} → in die Box`, disabled: s.team.length <= 1 })),
      ], { cancel: 'Fertig' });
      if (i === null) break;
      if (i < s.box.length) {
        const m = s.box[i];
        if (s.team.length >= 6) { toast('Dein Team ist voll (6). Lege zuerst eine Kreatur in die Box.'); continue; }
        healMon(m); s.box.splice(i, 1); s.team.push(m); sfx('click');
      } else { const m = s.team.splice(i - s.box.length, 1)[0]; s.box.push(m); sfx('click'); }
      this.updateFollower();
    }
  }

  async rune(id) {
    const s = this.state, flags = this.worldFlags();
    if (flags[id]) return dialog('Runenstein', ['Der Stein leuchtet in einem ruhigen, grünen Licht.']);
    if (!['runes', 'ruins'].includes(s.quest) && !s.flags.ruinsSeen) return dialog('Runenstein', ['Ein alter Stein mit einer Rune. Er fühlt sich kalt an. Vielleicht weiß jemand in den Ruinen mehr…']);
    await dialog('Runenstein', ['Du legst die Hand auf die Rune…', 'Ein Summen erfüllt die Luft. Der Stein beginnt zu leuchten!']);
    this.setWorldFlag(id);
    sfx('rune');
    s.bag.sternkristall = (s.bag.sternkristall || 0) + 1;
    toast('✨ Runenstein entzündet! Am Fuß des Steins liegt ein <b>Sternkristall</b>.');
    this.checkRunes();
  }
  checkRunes() {
    const s = this.state, f = this.worldFlags();
    const n = RUNES.filter(r => f[r.id]).length;
    this.world.setAltar(n);
    if (n >= 3 && (s.quest === 'runes' || s.quest === 'ruins')) { s.quest = 'night'; toast('🌙 Alle drei Runen singen gemeinsam… Der Altar ruft dich – bei Nacht.', 4500); }
    this.updateHud(true);
  }

  async altar() {
    const s = this.state, f = this.worldFlags();
    const n = RUNES.filter(r => f[r.id]).length;
    if (s.quest === 'start' || s.quest === 'rival' || s.quest === 'catch3' || (s.quest === 'ruins' && false)) {
      if (!s.flags.ruinsSeen) { s.flags.ruinsSeen = true; }
    }
    if (n < 3) {
      await dialog('Altar des Waldes', [
        'Ein uralter Altar. In seiner Mitte schwebt ein Kristall – matt, als würde er schlafen.',
        'In den Stein sind drei Runen eingraviert. Darunter steht:',
        ...RUNES.map(r => `„${r.hint}“${f[r.id] ? ' ✓' : ''}`),
      ]);
      s.flags.ruinsSeen = true;
      if (['start', 'rival', 'catch3', 'ruins'].includes(s.quest) && s.team.length) s.quest = 'runes';
      return;
    }
    if (s.flags.sylvaron) return dialog('Altar des Waldes', ['Der Kristall pulsiert sanft im Takt deines Herzens. Der Wald ist ruhig.']);
    if (!this.isNight()) return dialog('Altar des Waldes', ['Der Kristall leuchtet hell, doch nichts geschieht.', 'Vielleicht muss man warten, bis die Sterne über Verdantia stehen…']);
    if (!s.team.some(m => m.hp > 0)) return dialog('Altar des Waldes', ['Deine Kreaturen sind zu erschöpft…']);
    await dialog('???', ['Der Boden bebt. Das Licht des Kristalls schießt in den Himmel…', 'Zwischen den Säulen tritt eine gewaltige Gestalt hervor. Ihr Geweih glüht wie tausend Glühwürmchen.']);
    const foe = createMon('sylvaron', 22, Math.random);
    this.markSeen('sylvaron');
    const r = await this.battle([foe], { intro: 'legend', canCatch: true });
    if (r.result === 'caught') { s.flags.sylvaron = true; s.quest = 'done'; await dialog('Prof. Linde (Funk)', ['Ist das… SYLVARON?! Der Hüter von Verdantia hat dich erwählt!', 'Das ist erst der Anfang. Hinter den Bergen liegen sechs weitere Regionen…']); }
    else if (r.result === 'win') { await dialog('Altar des Waldes', ['Sylvaron löst sich in tausend Lichter auf… Es wird in einer anderen Nacht zurückkehren.']); }
    this.updateHud(true);
  }

  isNight() { const tod = this.tod(); return tod < 0.23 || tod > 0.79; }
  tod() { return ((this.time() / DAY) % 1 + 1) % 1; }
  time() { return this.online ? this.clock.base + (performance.now() - this.clock.at) / 1000 : this.state?.time ?? DAY * 0.4; }
  weather() { return this.online ? (this.clock.weather || 'klar') : weatherAt(this.time()); }

  worldFlags() { return this.online ? this.online.flags : this.state.flags; }
  setWorldFlag(id) {
    if (this.online) { this.online.flags[id] = { by: this.state.name }; this.net.send({ t: 'flag', id }); }
    else this.state.flags[id] = true;
    this.refreshWorldFlags();
  }
  refreshWorldFlags() {
    const f = this.worldFlags();
    for (const r of RUNES) this.world.setRuneActive(r.id, !!f[r.id]);
    this.world.setAltar(RUNES.filter(r => f[r.id]).length);
  }

  // ---------------------------------------------------------- Kreaturen
  addMon(m, silent = false) {
    const s = this.state;
    this.markSeen(m.sp); s.dex.caught[m.sp] = 1;
    if (s.team.length < 6) s.team.push(m); else { s.box.push(m); if (!silent) toast(`${monName(m)} wurde in die Box geschickt.`); }
  }
  markSeen(sp) { this.state.dex.seen[sp] = 1; }
  onDex(sp, caught) { this.markSeen(sp); if (caught) this.state.dex.caught[sp] = 1; }

  updateFollower() {
    const lead = this.state?.team.find(m => m.hp > 0) || this.state?.team[0];
    const key = lead ? lead.sp + lead.shiny : null;
    if (this.follower?.key === key) return;
    if (this.follower) this.scene.remove(this.follower.model);
    this.follower = null;
    if (!lead) return;
    const model = buildCreature(SPECIES[lead.sp].model, lead.shiny);
    model.scale.setScalar(Math.min(1, 1.1 / SPECIES[lead.sp].model.size));
    const p = this.player.pos.clone().add(new THREE.Vector3(1, 0, 1));
    model.position.copy(p); this.scene.add(model);
    this.follower = { model, key, pos: p };
  }

  // ---------------------------------------------------------- Kämpfe
  async battle(foeTeam, opts = {}) {
    const s = this.state;
    this.mode = 'battle'; $('#hud').classList.add('inbattle'); this.input.enabled = false;
    for (const w of this.wilds) w.model.visible = false;
    if (this.follower) this.follower.model.visible = false;
    foeTeam.forEach(m => this.markSeen(m.sp));
    s.stats.battles++;
    const r = await this.bv.run({ team: s.team, foeTeam, wild: !opts.trainer, trainer: opts.trainer, intro: opts.intro || 'wild', canCatch: opts.canCatch !== false });
    for (const w of this.wilds) w.model.visible = true;
    if (this.follower) this.follower.model.visible = true;
    $('#hud').classList.remove('inbattle'); this.input.enabled = true;
    this.mode = 'world'; this.lastBattleEnd = performance.now();
    if (r.result === 'caught') {
      r.caught.status = null; r.caught._fainted = false;
      this.addMon(r.caught); s.stats.caught++;
      toast(`📗 ${SPECIES[r.caught.sp].name} wurde in deiner Chronik eingetragen!`);
      if (s.quest === 'catch3' && s.stats.caught >= 3) { s.quest = 'ruins'; toast('🗺 Neue Aufgabe: Das Flüstern der Ruinen', 3500); }
    }
    if (r.result === 'win') s.stats.wins++;
    if (r.result === 'lose') {
      const lost = Math.floor(s.money / 4); s.money -= lost;
      $('#flash').classList.add('on', 'dark'); await wait(600);
      this.player.pos.set(VILLAGE.x + 10, 0, VILLAGE.z - 3); this.pendingWarp = 'heal'; this.player.pos.y = this.world.height(this.player.pos.x, this.player.pos.z);
      s.team.forEach(healMon);
      $('#flash').classList.remove('on', 'dark');
      await dialog('Heilerin Nia', [`Du bist ins Heilzentrum gebracht worden. Deine Kreaturen sind wieder fit. (Du hast ${lost} ◈ verloren.)`]);
    }
    for (const m of s.team) delete m._fainted;
    this.updateFollower(); this.updateHud(true); this.save();
    setMusic(this.isNight() ? 'night' : 'day');
    return r;
  }

  async trainerBattle({ name, team, reward }) {
    const rnd = mulberry(name.length * 777);
    const foe = team.map(([sp, l]) => createMon(sp, l, rnd));
    if (!this.state.team.some(m => m.hp > 0)) { await dialog(name, ['Deine Kreaturen sind erschöpft. Heile sie zuerst!']); return false; }
    const r = await this.battle(foe, { trainer: { name }, canCatch: false });
    if (r.result === 'win') { this.state.money += reward; toast(`🏆 Sieg gegen ${esc(name)}! +${reward} ◈`); return true; }
    return false;
  }

  // ---------------------------------------------------------- Wilde Kreaturen
  spawnWilds(dt) {
    const p = this.player.pos, night = this.isNight(), rain = this.weather() === 'regen';
    for (let i = this.wilds.length - 1; i >= 0; i--) {
      const w = this.wilds[i];
      if (w.pos.distanceTo(p) > 60 || w.despawn) { this.scene.remove(w.model); this.wilds.splice(i, 1); }
    }
    if (this.wilds.length >= 11 || Math.random() > dt * 2) return;
    const a = Math.random() * Math.PI * 2, r = 16 + Math.random() * 26;
    const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
    if (this.world.blocked(x, z, 0.6) || this.world.height(x, z) < 0.15) return;
    const zone = this.world.zoneAt(x, z);
    const pool = POOLS[zone]; if (!pool) return;
    const opts = pool.filter(([sp, w, a2, b, time]) => !time || (time === 'night') === night).map(o => {
      let w = o[1]; if (rain && (o[0] === 'sporlich' || o[0] === 'voltmotte' || o[0] === 'tropfmolch')) w *= 2; return [o, w];
    });
    let tot = opts.reduce((s, o) => s + o[1], 0), roll = Math.random() * tot, pick = opts[0]?.[0];
    for (const [o, w] of opts) { roll -= w; if (roll <= 0) { pick = o; break; } }
    if (!pick) return;
    const [sp, , lo, hi] = pick, lvl = lo + Math.floor(Math.random() * (hi - lo + 1));
    const mon = createMon(sp, lvl);
    const model = buildCreature(SPECIES[sp].model, mon.shiny);
    const pos = new THREE.Vector3(x, this.world.height(x, z), z);
    model.position.copy(pos); model.scale.setScalar(0.01); this.scene.add(model);
    this.wilds.push({ mon, model, pos, target: pos.clone(), timer: 0, born: this.t, zone });
  }

  updateWilds(dt) {
    const p = this.player.pos;
    for (const w of this.wilds) {
      const age = this.t - w.born;
      const sc = Math.min(1, age * 2); w.model.scale.setScalar(Math.min(1, Math.max(0.01, sc)) * (SPECIES[w.mon.sp].legendary ? 1 : 1));
      w.timer -= dt;
      if (w.timer <= 0) {
        w.timer = 2 + Math.random() * 4;
        const a = Math.random() * Math.PI * 2, r = Math.random() * 5;
        const tx = w.pos.x + Math.cos(a) * r, tz = w.pos.z + Math.sin(a) * r;
        if (!this.world.blocked(tx, tz, 0.5) && this.world.zoneAt(tx, tz) !== 'dorf' && this.world.height(tx, tz) > 0.1) w.target.set(tx, 0, tz);
      }
      const dx = w.target.x - w.pos.x, dz = w.target.z - w.pos.z, d = Math.hypot(dx, dz);
      const moving = d > 0.2;
      if (moving) { const sp = 1.4 * dt; w.pos.x += dx / d * Math.min(sp, d); w.pos.z += dz / d * Math.min(sp, d); w.model.rotation.y = Math.atan2(dx, dz); }
      w.pos.y = this.world.height(w.pos.x, w.pos.z);
      w.model.position.copy(w.pos);
      animateCreature(w.model, this.t, moving);
      // Begegnung
      if (this.mode === 'world' && !this.busy && age > 1 && performance.now() - this.lastBattleEnd > 2500 && w.pos.distanceTo(p) < 1.6 && this.state?.team.some(m => m.hp > 0)) {
        w.despawn = true; this.busy = true;
        this.player.rot = Math.atan2(w.pos.x - p.x, w.pos.z - p.z);
        this.battle([w.mon]).finally(() => (this.busy = false));
        break;
      }
    }
  }

  // ---------------------------------------------------------- Hauptschleife
  loop() {
    const now = performance.now(), dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.t += dt;
    const s = this.state;
    if (s && !this.online) s.time += dt;
    if (s) s.stats.playtime += dt;
    const tod = this.tod(), weather = this.weather();
    if (this.mode === 'world') this.updatePlayer(dt);
    else if (this.mode === 'title' || this.mode === 'boot') { this.cam.yaw += dt * 0.05; this.updateCamera(dt, true); }
    else if (this.mode === 'create') { this.player.model.rotation.y += dt * 0.6; this.updateCamera(dt, false, true); animateHuman(this.player.model, this.t, 0); }
    const focus = this.mode === 'battle' ? this.bv.A || this.player.pos : this.player.pos;
    const env = this.world.update(dt, this.t, tod, weather, focus, this.lights);
    this.env = env;
    if (this.mode === 'battle') this.bv.update(dt, this.camera);
    else if (this.bv.parts.n) this.bv.parts.update(dt);
    if (s && this.mode !== 'title') {
      this.updateWilds(dt);
      if (this.mode === 'world') this.spawnWilds(dt);
    }
    // NPCs leicht animieren
    for (const n of this.npcs) animateHuman(n.model, this.t + n.x, 0);
    this.updateRemotes(dt);
    if (this.mode === 'world' && s) {
      if (Math.floor(this.t * 2) !== this.hudTick) { this.hudTick = Math.floor(this.t * 2); this.updateHud(); }
      if (this.mode === 'world' && !this.busy) {
        const mus = this.isNight() ? 'night' : 'day'; setMusic(mus);
      }
    }
    this.renderer.render(this.scene, this.camera);
    this.drawNameTags();
  }

  updatePlayer(dt) {
    const pl = this.player, inp = this.input.axis();
    const cd = this.input.takeCam();
    this.cam.yaw -= cd.x * this.settings.camSens; this.cam.pitch = Math.min(1.2, Math.max(0.08, this.cam.pitch + cd.y * this.settings.camSens));
    this.cam.tdist = Math.min(16, Math.max(4, this.cam.tdist + cd.zoom * 0.8));
    for (const a of this.input.takeActions()) this.handleAction(a);
    const yaw = this.cam.yaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = -fz, rz = fx;
    let mx = fx * -inp.y + rx * inp.x, mz = fz * -inp.y + rz * inp.x;
    const mag = Math.hypot(mx, mz);
    const target = this.busy ? 0 : mag * (inp.run ? 8.5 : 4.6);
    pl.speed += (target - pl.speed) * Math.min(1, dt * 10);
    if (mag > 0.05 && !this.busy) {
      mx /= mag; mz /= mag;
      const want = Math.atan2(mx, mz);
      let d = want - pl.rot; d = Math.atan2(Math.sin(d), Math.cos(d)); pl.rot += d * Math.min(1, dt * 12);
      const step = pl.speed * dt;
      const tryMove = (nx, nz) => {
        if (this.world.blocked(nx, nz, 0.35)) return false;
        const h0 = this.world.height(pl.pos.x, pl.pos.z), h1 = this.world.height(nx, nz);
        if (h1 - h0 > Math.max(0.05, step * 0.95)) return false;
        pl.pos.x = nx; pl.pos.z = nz; return true;
      };
      const nx = pl.pos.x + mx * step, nz = pl.pos.z + mz * step;
      if (!tryMove(nx, nz)) { if (!tryMove(nx, pl.pos.z)) tryMove(pl.pos.x, nz); }
      if (this.state) this.state.stats.dist += step;
      this.stepAcc = (this.stepAcc || 0) + step; if (this.stepAcc > 1.6) { this.stepAcc = 0; sfx('step'); }
    }
    pl.pos.y += (this.world.height(pl.pos.x, pl.pos.z) - pl.pos.y) * Math.min(1, dt * 18);
    pl.model.position.copy(pl.pos); pl.model.rotation.y = pl.rot;
    animateHuman(pl.model, this.t, pl.speed);
    // Begleiter
    if (this.follower) {
      const f = this.follower, back = new THREE.Vector3(pl.pos.x - Math.sin(pl.rot) * 1.6 + Math.cos(pl.rot) * 0.8, 0, pl.pos.z - Math.cos(pl.rot) * 1.6 - Math.sin(pl.rot) * 0.8);
      const d = Math.hypot(back.x - f.pos.x, back.z - f.pos.z);
      if (d > 6) f.pos.copy(back);
      const moving = d > 0.4;
      if (moving) { const k = Math.min(1, dt * (d > 2 ? 6 : 3)); f.pos.x += (back.x - f.pos.x) * k; f.pos.z += (back.z - f.pos.z) * k; f.model.rotation.y = Math.atan2(back.x - f.pos.x, back.z - f.pos.z); }
      f.pos.y = this.world.height(f.pos.x, f.pos.z);
      f.model.position.copy(f.pos); animateCreature(f.model, this.t, moving);
    }
    this.updateCamera(dt);
    // Interaktionshinweis
    const it = this.busy ? null : this.nearestInteract();
    this.curInteract = it;
    const ab = $('#act');
    if (it) { ab.hidden = false; ab.querySelector('span').textContent = it.label; } else ab.hidden = true;
    // Netzwerk
    if (this.net.online && this.t - (this.lastNet || 0) > 0.1) {
      this.lastNet = this.t;
      this.net.send({ t: 'pos', x: +pl.pos.x.toFixed(2), y: +pl.pos.y.toFixed(2), z: +pl.pos.z.toFixed(2), r: +pl.rot.toFixed(2), s: +pl.speed.toFixed(1), b: this.mode === 'battle', warp: this.pendingWarp });
      this.pendingWarp = null;
    }
  }

  updateCamera(dt, orbit = false, close = false) {
    const c = this.cam, pl = this.player;
    c.dist += (c.tdist - c.dist) * Math.min(1, dt * 6);
    const portrait = innerHeight > innerWidth;
    const dist = close ? (portrait ? 7.5 : 6) : c.dist, pitch = close ? 0.12 : c.pitch;
    const tgt = pl.pos.clone().add(new THREE.Vector3(0, close ? (portrait ? -0.9 : -0.6) : 1.5, 0));
    const want = tgt.clone().add(new THREE.Vector3(Math.sin(c.yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, Math.cos(c.yaw) * Math.cos(pitch) * dist));
    if (!orbit && !close) { // Kamera-Kollision mit Gebäuden
      const dir = want.clone().sub(tgt), len = dir.length(); dir.divideScalar(len);
      for (let d = 0.6; d < len; d += 0.3) {
        const px = tgt.x + dir.x * d, pz = tgt.z + dir.z * d, py = tgt.y + dir.y * d;
        if (this.world.colliders.some(c => c.hw > 1 && Math.abs(px - c.x) < c.hw - 0.2 && Math.abs(pz - c.z) < c.hd - 0.2 && py < this.world.height(c.x, c.z) + 6) || this.world.inFoliage(px, py, pz)) { want.copy(tgt).addScaledVector(dir, Math.max(1.2, d - 0.4)); break; }
      }
    }
    const gh = this.world.height(want.x, want.z) + 0.7; if (want.y < gh) want.y = gh;
    if (orbit) { want.copy(TEMPLE.x !== undefined ? new THREE.Vector3(Math.sin(c.yaw) * 40, 18, TEMPLE.z + 45 + Math.cos(c.yaw) * 30) : want); tgt.set(0, 6, TEMPLE.z); }
    this.camera.position.lerp(want, orbit || this.snapCam ? 1 : Math.min(1, dt * 8)); this.snapCam = false;
    this.camera.lookAt(tgt);
  }

  handleAction(a) {
    if (this.busy || this.mode !== 'world') return;
    if (a === 'interact' && this.curInteract) this.interact(this.curInteract);
    if (a === 'map') this.openMenu('karte');
    if (a === 'team') this.openMenu('team');
    if (a === 'menu') this.openMenu();
  }

  // ---------------------------------------------------------- HUD & Menüs
  updateHud(force) {
    const s = this.state; if (!s) return;
    const tod = this.tod(), h = Math.floor(tod * 24), m = Math.floor((tod * 24 - h) * 60);
    const w = this.weather();
    const icon = this.isNight() ? '🌙' : w === 'regen' ? '🌧' : w === 'wolkig' ? '⛅' : '☀️';
    $('#h-time').textContent = `${icon} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    $('#h-money').textContent = `${s.money} ◈`;
    const q = QUESTS[s.quest] || QUESTS.done;
    let qt = q.text;
    if (s.quest === 'runes') qt += ` (${RUNES.filter(r => this.worldFlags()[r.id]).length}/3)`;
    if (s.quest === 'catch3') qt = `Binde 3 wilde Kreaturen (${Math.min(3, s.stats.caught)}/3). Kristalle gibt es im Laden.`;
    $('#h-quest').innerHTML = `<b>${q.title}</b><span>${qt}</span>`;
    $('#h-team').innerHTML = s.team.map(m => `<i class="${m.hp <= 0 ? 'ko' : ''}" style="--p:${m.hp / maxHp(m) * 100}%"></i>`).join('');
    $('#h-net').hidden = !this.online;
    if (this.online) $('#h-net').innerHTML = `🌐 ${esc(this.online.name)} · <b>${this.online.code}</b> · ${this.remotes.size + 1}/4 · ${this.net.status === 'online' ? '●' : '○ ' + this.net.status}`;
    // Minikarte
    const mm = $('#minimap'), ctx = mm.getContext('2d');
    const p = this.player.pos, S = 256 / SIZE, R = 40;
    ctx.clearRect(0, 0, 120, 120);
    ctx.save(); ctx.beginPath(); ctx.arc(60, 60, 58, 0, 7); ctx.clip();
    ctx.translate(60, 60); ctx.rotate(this.cam.yaw);
    ctx.drawImage(this.map, (-(p.x + SIZE / 2) * S) * (120 / (R * 2 * S)), (-(p.z + SIZE / 2) * S) * (120 / (R * 2 * S)), 256 * 120 / (R * 2 * S), 256 * 120 / (R * 2 * S));
    for (const r of this.remotes.values()) {
      const dx = (r.pos.x - p.x) * 60 / R, dz = (r.pos.z - p.z) * 60 / R;
      ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(dx, dz, 4, 0, 7); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.beginPath();
    const a = this.player.rot - this.cam.yaw + Math.PI;
    ctx.save(); ctx.translate(60, 60); ctx.rotate(-a); ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }

  bindUI() {
    $('#act').onclick = () => this.handleAction('interact');
    $('#b-menu').onclick = () => this.openMenu();
    $('#b-map').onclick = () => this.openMenu('karte');
    $('#b-run').onclick = () => { this.input.run = !this.input.run; $('#b-run').classList.toggle('on', this.input.run); };
    $('#menu').onclick = e => {
      const tab = e.target.closest('[data-tab]')?.dataset.tab; if (tab) { sfx('click'); return this.renderMenu(tab); }
      const act = e.target.closest('[data-act]'); if (act) this.menuAction(act.dataset.act, act.dataset);
    };
  }

  openMenu(tab = 'team') {
    if (this.mode !== 'world' || this.busy) return;
    sfx('open'); this.busy = true; this.input.enabled = false;
    $('#menu').hidden = false; this.renderMenu(tab);
  }
  closeMenu() { $('#menu').hidden = true; this.busy = false; this.input.enabled = true; sfx('click'); this.updateHud(true); }

  renderMenu(tab) {
    this.menuTab = tab;
    const s = this.state, tabs = [['team', '🐾 Team'], ['chronik', '📗 Chronik'], ['tasche', '🎒 Tasche'], ['quests', '📜 Aufgaben'], ['karte', '🗺 Karte'], ['multi', '👥 Koop'], ['stats', '📊 Statistik'], ['opt', '⚙ Optionen']];
    let body = '';
    if (tab === 'team') {
      body = `<div class="tlist">${s.team.map((m, i) => {
        const S = SPECIES[m.sp], st = calcStats(m), mx = st.hp;
        const xpP = (m.xp - xpForLevel(m.lvl)) / (xpForLevel(m.lvl + 1) - xpForLevel(m.lvl)) * 100;
        return `<div class="tm"><div class="tm-h"><b>${esc(monName(m))}${m.shiny ? ' ✦' : ''}</b><span>Lv ${m.lvl}</span></div>
          <div>${S.types.map(typeChip).join('')} <span class="rar" style="color:${RARITY[S.rarity].color}">${RARITY[S.rarity].name}</span></div>
          <div class="hpbar"><i style="width:${m.hp / mx * 100}%"></i></div><small>${m.hp}/${mx} KP · EP ${Math.floor(xpP)}%${m.status ? ' · ' + m.status : ''}</small>
          <div class="stats">ANG ${st.atk} · VER ${st.def} · SP.ANG ${st.spa} · SP.VER ${st.spd} · INIT ${st.spe}</div>
          <div class="mvs">${m.moves.map(mv => `<span style="--c:${TYPES[MOVES[mv.id].type].color}">${MOVES[mv.id].name} <small>${mv.pp}/${MOVES[mv.id].pp}</small></span>`).join('')}</div>
          ${i > 0 ? `<button class="btn sm" data-act="lead" data-i="${i}">An die Spitze</button>` : '<small class="lead">★ Partner (folgt dir)</small>'}</div>`;
      }).join('') || '<p>Noch keine Kreaturen. Besuche Professorin Linde!</p>'}</div>`;
    } else if (tab === 'chronik') {
      const all = Object.entries(SPECIES).sort((a, b) => a[1].num - b[1].num);
      body = `<p class="sub">Gesehen: ${Object.keys(s.dex.seen).length} · Gebunden: ${Object.keys(s.dex.caught).length} / ${all.length} (Region Verdantia)</p><div class="dex">${all.map(([id, S]) => {
        const seen = s.dex.seen[id], c = s.dex.caught[id];
        return `<div class="dx ${c ? 'c' : seen ? 's' : ''}"><small>#${String(S.num).padStart(3, '0')}</small><b>${seen ? S.name : '???'}</b>${seen ? `<div>${S.types.map(typeChip).join('')}</div>` : ''}${c ? `<p>${S.lore}</p>` : seen ? '<p>Gesehen – noch nicht gebunden.</p>' : ''}</div>`;
      }).join('')}</div>`;
    } else if (tab === 'tasche') {
      body = `<div class="bag"><div>💎 Bindkristall <b>×${s.bag.kristall || 0}</b><small>Bindet geschwächte wilde Kreaturen.</small></div>
        <div>🌟 Sternkristall <b>×${s.bag.sternkristall || 0}</b><small>Doppelte Bindungschance.</small></div>
        <div>🧪 Heiltrank <b>×${s.bag.trank || 0}</b><small>Heilt 30 KP (im Kampf nutzbar).</small></div>
        <div>◈ Geld <b>${s.money}</b></div></div>`;
    } else if (tab === 'quests') {
      const order = Object.keys(QUESTS), cur = order.indexOf(s.quest);
      body = `<div class="qlist">${order.map((k, i) => i > cur ? '' : `<div class="q ${i < cur ? 'done' : 'cur'}"><b>${i < cur ? '✓ ' : '▸ '}${QUESTS[k].title}</b>${i === cur ? `<p>${QUESTS[k].text}</p>` : ''}</div>`).join('')}</div>`;
    } else if (tab === 'karte') {
      body = `<div class="bigmap"><canvas id="bigmap" width="512" height="512"></canvas><div class="legend">◉ Du · <span style="color:#ffd23a">●</span> Mitspieler · Nicht jeder Ort ist markiert…</div></div>`;
    } else if (tab === 'multi') {
      body = this.online ? `<div class="mp"><p>Welt: <b>${esc(this.online.name)}</b></p><p class="code">Einladungscode<br><b>${this.online.code}</b></p>
          <p class="sub">Gib diesen Code deinen Freunden. Sie wählen im Hauptmenü „Multiplayer-Welten“ → „Welt beitreten“.</p>
          <h4>Mitspieler</h4><ul>${[...this.remotes.values()].map(r => `<li>🟢 ${esc(r.name)}</li>`).join('') || '<li>Gerade niemand sonst online.</li>'}</ul>
          <div class="chat"><input id="chatin" maxlength="140" placeholder="Nachricht an alle…"><button class="btn sm" data-act="chat">Senden</button></div></div>`
        : `<div class="mp"><p>Du spielst gerade solo.</p><p class="sub">Um mit Freunden in einer gemeinsamen Welt zu spielen, gehe ins Hauptmenü → „Multiplayer-Welten“. Dafür braucht ihr einen laufenden Weltserver (Anleitung in docs/MULTIPLAYER.md).</p></div>`;
    } else if (tab === 'stats') {
      const st = s.stats, pt = Math.floor(st.playtime / 60);
      body = `<div class="bag"><div>⏱ Spielzeit <b>${Math.floor(pt / 60)} h ${pt % 60} min</b></div><div>⚔ Kämpfe <b>${st.battles}</b></div><div>🏆 Siege <b>${st.wins}</b></div>
        <div>💎 Gebunden <b>${st.caught}</b></div><div>👣 Strecke <b>${(st.dist / 1000).toFixed(2)} km</b></div><div>📦 In der Box <b>${s.box.length}</b></div></div>`;
    } else if (tab === 'opt') {
      body = `<div class="opts">
        <label>Musik <button class="btn sm" data-act="tog" data-k="music">${this.settings.music ? 'An' : 'Aus'}</button></label>
        <label>Soundeffekte <button class="btn sm" data-act="tog" data-k="sfx">${this.settings.sfx ? 'An' : 'Aus'}</button></label>
        <label>Grafik <button class="btn sm" data-act="quality">${this.settings.quality}</button></label>
        <button class="btn" data-act="save">💾 Jetzt speichern</button>
        <button class="btn ghost" data-act="title">⏏ Zum Hauptmenü</button>
        <p class="sub">PC: WASD/Pfeile bewegen · Shift rennen · Maus ziehen = Kamera · Mausrad = Zoom · E = Interagieren · M = Karte · T = Team<br>Handy: linke Bildschirmhälfte = Joystick · rechts wischen = Kamera</p></div>`;
    }
    $('#menu').innerHTML = `<div class="mpanel"><div class="mtabs">${tabs.map(([k, n]) => `<button class="${k === tab ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}<button class="x" data-act="close">✕</button></div><div class="mbody">${body}</div></div>`;
    if (tab === 'karte') this.drawBigMap();
  }

  drawBigMap() {
    const cv = $('#bigmap'), ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = true; ctx.drawImage(this.map, 0, 0, 512, 512);
    const P = (x, z) => [(x / SIZE + 0.5) * 512, (z / SIZE + 0.5) * 512];
    ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
    const label = (x, z, t) => { const [a, b] = P(x, z); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(t, a, b); ctx.fillStyle = '#fff'; ctx.fillText(t, a, b); };
    label(VILLAGE.x, VILLAGE.z, 'Moosgrund'); label(TEMPLE.x, TEMPLE.z, 'Tempelruinen'); label(LAKE.x, LAKE.z + 4, 'Kristallsee');
    for (const r of this.remotes.values()) { const [a, b] = P(r.pos.x, r.pos.z); ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(a, b, 6, 0, 7); ctx.fill(); }
    const [a, b] = P(this.player.pos.x, this.player.pos.z);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#e84a5f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(a, b, 7, 0, 7); ctx.fill(); ctx.stroke();
  }

  async menuAction(act, ds) {
    const s = this.state;
    if (act === 'close') return this.closeMenu();
    if (act === 'lead') { const m = s.team.splice(+ds.i, 1)[0]; s.team.unshift(m); this.updateFollower(); sfx('click'); return this.renderMenu('team'); }
    if (act === 'tog') { this.settings[ds.k] = !this.settings[ds.k]; setAudio(ds.k, this.settings[ds.k]); this.saveSettings(); return this.renderMenu('opt'); }
    if (act === 'quality') {
      const o = ['hoch', 'mittel', 'niedrig']; this.settings.quality = o[(o.indexOf(this.settings.quality) + 1) % 3];
      this.saveSettings(); this.applyQuality(); this.applyShadows(); this.resize(); return this.renderMenu('opt');
    }
    if (act === 'save') { this.save(); toast('💾 Gespeichert'); return; }
    if (act === 'chat') { const v = $('#chatin').value.trim(); if (v) { this.net.send({ t: 'chat', text: v }); $('#chatin').value = ''; } return; }
    if (act === 'title') {
      this.save(); $('#menu').hidden = true; this.busy = false; this.input.enabled = true;
      $('#hud').hidden = true; this.net.disconnect(); this.clearRemotes(); this.online = null;
      for (const w of this.wilds) this.scene.remove(w.model); this.wilds = [];
      if (this.follower) { this.scene.remove(this.follower.model); this.follower = null; }
      this.state = null; clearInterval(this.autosave);
      this.cam.yaw = 2.4; this.showTitle();
    }
  }

  openSettings() {
    choose('Einstellungen', [
      { label: `Musik: ${this.settings.music ? 'An' : 'Aus'}` }, { label: `Soundeffekte: ${this.settings.sfx ? 'An' : 'Aus'}` }, { label: `Grafik: ${this.settings.quality}` },
    ], { cancel: 'Zurück' }).then(i => {
      if (i === null) return;
      if (i === 0) { this.settings.music = !this.settings.music; setAudio('music', this.settings.music); }
      if (i === 1) { this.settings.sfx = !this.settings.sfx; setAudio('sfx', this.settings.sfx); }
      if (i === 2) { const o = ['hoch', 'mittel', 'niedrig']; this.settings.quality = o[(o.indexOf(this.settings.quality) + 1) % 3]; this.applyQuality(); this.applyShadows(); this.resize(); }
      this.saveSettings(); this.openSettings();
    });
  }

  // ---------------------------------------------------------- Multiplayer
  showMultiplayer() {
    const el = $('#mpscreen'); el.hidden = false; this.mode = 'title';
    const def = this.settings.server || (location.protocol.startsWith('http') && location.port === '8052' ? location.origin : '');
    const render = (msg = '') => {
      const connected = this.net.status === 'online';
      el.innerHTML = `<div class="panel mppanel"><h2>👥 Multiplayer-Welten</h2>
        <p class="sub">Bis zu 4 Freunde teilen sich eine dauerhafte Welt. Jeder hat eigenen Charakter, eigenes Team und eigenen Fortschritt – Weltereignisse wie Runensteine sind gemeinsam.</p>
        <label>Weltserver-Adresse</label><div class="row"><input id="srv" placeholder="z. B. https://mein-server.onrender.com" value="${esc(def)}"><button class="btn sm" data-a="conn">${connected ? '✓ Verbunden' : 'Verbinden'}</button></div>
        <div class="msg">${msg}</div>
        ${connected ? `<h4>Deine Welten</h4><div class="list">${(this.myWorlds || []).map(w => `<button class="item" data-a="enter" data-c="${w.code}">🌍 ${esc(w.name)} <small>${w.code} · ${w.members}/4</small></button>`).join('') || '<small>Noch keine – erstelle eine oder tritt bei.</small>'}</div>
          <h4>Neue Welt erstellen</h4><div class="row"><input id="wname" maxlength="32" placeholder="Name der Welt"><button class="btn sm" data-a="create">Erstellen</button></div>
          <h4>Welt beitreten</h4><div class="row"><input id="wcode" maxlength="6" placeholder="Einladungscode" style="text-transform:uppercase"><button class="btn sm" data-a="join">Beitreten</button></div>` : ''}
        <button class="btn ghost" data-a="back">Zurück</button></div>`;
    };
    render();
    this.mpRender = render;
    el.onclick = async e => {
      const b = e.target.closest('[data-a]'); if (!b) return; sfx('click');
      const a = b.dataset.a;
      if (a === 'back') { el.hidden = true; this.net.disconnect(); return this.showTitle(); }
      if (a === 'conn') {
        const url = $('#srv').value.trim(); if (!url) return render('Bitte Serveradresse eingeben.');
        this.settings.server = url; this.saveSettings();
        render('Verbinde…');
        try { const w = await this.net.connect(url, 'Trainer'); this.myWorlds = w.worlds; render('Verbunden!'); }
        catch (err) { this.net.disconnect(); render('❌ Keine Verbindung. Läuft der Server? (' + esc(err.message) + ')'); }
      }
      if (a === 'create' || a === 'join' || a === 'enter') {
        const code = a === 'enter' ? b.dataset.c : a === 'join' ? $('#wcode').value.trim().toUpperCase() : null;
        if (a === 'join' && code.length !== 6) return render('Der Code hat 6 Zeichen.');
        const wname = a === 'create' ? ($('#wname').value.trim() || 'Verdantia der Gang') : null;
        // Charakter: vorhandenen lokalen Stand dieser Welt nutzen, sonst neu erstellen
        const local = code ? safeJSON(localStorage.getItem('lu-save-' + code)) : null;
        this.pendingWorld = { kind: a, code, wname, local };
        if (a === 'create') { const st = local || await this.charForWorld(); this.pendingWorld.state = st; this.net.create(wname, { name: st.name, look: st.look }); }
        else { const peek = local; this.pendingWorld.state = peek; this.net.join(code, peek ? { name: peek.name, look: peek.look } : null); }
      }
    };
  }

  async charForWorld() { $('#mpscreen').hidden = true; const st = await this.createCharacter(); return st; }

  bindNet() {
    const n = this.net;
    n.on('err', m => { toast('⚠ ' + esc(m.msg)); if (!$('#mpscreen').hidden) this.mpRender?.('❌ ' + esc(m.msg)); });
    n.on('status', () => this.state && this.updateHud());
    n.on('joined', async m => {
      if (this.online && this.online.code === m.code) { // Wiederverbindung
        this.online.flags = m.flags; this.clock = { base: m.time, at: performance.now(), weather: this.clock?.weather }; this.refreshWorldFlags(); toast('🌐 Wieder verbunden'); return;
      }
      const pw = this.pendingWorld || {};
      let st = m.save || pw.state;
      if (!st) { $('#mpscreen').hidden = true; st = await this.createCharacter(); n.send({ t: 'join', code: m.code, char: { name: st.name, look: st.look } }); }
      $('#mpscreen').hidden = true;
      this.clock = { base: m.time, at: performance.now(), weather: 'klar' };
      this.online = { code: m.code, name: m.name, flags: m.flags || {} };
      this.startGame(st, 'lu-save-' + m.code, this.online);
      this.save();
      toast(`🌐 Willkommen in „${esc(m.name)}“! Einladungscode: <b>${m.code}</b>`, 6000);
    });
    n.on('clock', m => { if (this.clock) { this.clock.base = m.time; this.clock.at = performance.now(); this.clock.weather = m.weather; } });
    n.on('flags', m => {
      if (!this.online) return;
      this.online.flags = m.flags; this.refreshWorldFlags();
      if (m.by && m.by !== this.state?.name) toast(`✨ ${esc(m.by)} hat einen Runenstein entzündet!`);
      this.checkRunes();
    });
    n.on('snap', m => {
      const seen = new Set();
      for (const p of m.players) {
        seen.add(p.pid);
        let r = this.remotes.get(p.pid);
        if (!r) {
          const model = buildHuman({ skin: '#e8b892', hair: '#2a1d16', outfit: '#3d8bfd', accent: '#ffd23a', ...p.look });
          this.scene.add(model);
          const tag = document.createElement('div'); tag.className = 'ntag'; tag.textContent = p.name; $('#tags').appendChild(tag);
          r = { model, tag, name: p.name, pos: new THREE.Vector3(p.x, p.y, p.z), target: new THREE.Vector3(), rot: p.r, speed: 0 };
          this.remotes.set(p.pid, r); toast(`👋 ${esc(p.name)} ist in der Nähe.`);
        }
        r.target.set(p.x, p.y, p.z); r.trot = p.r; r.speed = p.s; r.inBattle = p.b;
      }
      for (const [pid, r] of this.remotes) if (!seen.has(pid)) this.removeRemote(pid);
    });
    n.on('left', m => this.removeRemote(m.pid));
    n.on('chat', m => toast(`💬 <b>${esc(m.from)}</b>: ${esc(m.text)}`, 5000));
    n.on('correct', m => { this.player.pos.set(m.x, m.y, m.z); });
  }
  removeRemote(pid) { const r = this.remotes.get(pid); if (!r) return; this.scene.remove(r.model); r.tag.remove(); this.remotes.delete(pid); }
  clearRemotes() { for (const pid of [...this.remotes.keys()]) this.removeRemote(pid); }
  updateRemotes(dt) {
    for (const r of this.remotes.values()) {
      if (r.pos.distanceTo(r.target) > 12) r.pos.copy(r.target);
      r.pos.lerp(r.target, Math.min(1, dt * 10));
      let d = (r.trot ?? 0) - r.rot; d = Math.atan2(Math.sin(d), Math.cos(d)); r.rot += d * Math.min(1, dt * 10);
      r.model.position.copy(r.pos); r.model.rotation.y = r.rot;
      animateHuman(r.model, this.t, r.speed);
    }
  }
  drawNameTags() {
    if (!this.remotes.size) return;
    const v = new THREE.Vector3();
    for (const r of this.remotes.values()) {
      v.copy(r.pos); v.y += 2.3; v.project(this.camera);
      const vis = v.z < 1 && this.mode !== 'battle';
      r.tag.style.display = vis ? '' : 'none';
      if (vis) r.tag.style.transform = `translate(${(v.x * 0.5 + 0.5) * innerWidth}px, ${(-v.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-100%)`;
      r.tag.classList.toggle('fight', !!r.inBattle);
    }
  }
}

function safeJSON(s) { try { return JSON.parse(s); } catch { return null; } }

const game = new Game();
window.LU = game; // für Tests/Debug
game.boot().catch(e => { console.error(e); $('#boot-txt').textContent = 'Fehler beim Start: ' + e.message; });

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
