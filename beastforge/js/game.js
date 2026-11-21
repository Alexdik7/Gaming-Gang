// Ein Run: Simulation + Ansicht + Eingabe + Fortschritts-Hooks (Charakter-/Konto-XP live, nie verlieren).
import * as THREE from 'three';
import { World } from './sim/world.js';
import { baseStats } from './sim/stats.js';
import { GameView } from './render/view.js';
import { buildModel } from './render/models.js';
import { Hud } from './ui/hud.js';
import { BAL } from './config.js';
import { CREATURES } from './data/creatures.js';
import { MAPS } from './data/maps.js';
import { academyFx } from './data/academy.js';
import { HEROES } from './data/heroes.js';
import { addCharXp, addAccXp, addHeroRankXp, heroStartLevel, unlocked, unlockedCreatures, addMastery, checkAchievements, formsFor } from './meta/progression.js';
import { saveProfile } from './meta/profile.js';

export class Game {
  constructor(app, { map = 'ahnenhain', diff = 'normal' }) {
    this.app = app; const P = this.P = app.profile;
    this.mapId = map; this.diffKey = diff; this.music = MAPS[map]?.music || 'forest';
    this.loadout = unlockedCreatures(P);
    if (!this.loadout.length) this.loadout = ['kitsune'];
    this.heroId = unlocked(P, 'hero', P.hero) ? P.hero : (unlocked(P, 'hero', 'kairo') ? 'kairo' : null);
    this.snap = { acc: { ...P.account }, chars: Object.fromEntries(Object.entries(P.chars).map(([k, c]) => [k, { level: c.level, xp: c.xp }])) };
    this.accGain = 0; this.charUps = []; this.accUps = []; this.achs = [];
    this.ac = academyFx(P);
    const hooks = {
      level: cid => P.chars[cid]?.level ?? 1,
      branch: cid => P.chars[cid]?.branch || 'spirit',
      charXp: (cid, raw, wave) => {
        const r = addCharXp(P, cid, raw * (1 + (this.ac.charXp || 0)), { wave, diff });
        for (const up of r.ups) this.onCharUp(up);
        return r.xp;
      },
      accXp: amt => this.giveAcc(amt),
      stat: (k, n, max) => { P.stats[k] = max ? Math.max(P.stats[k] || 0, n) : (P.stats[k] || 0) + n; },
      heroXp: amt => { if (this.heroId) addHeroRankXp(P, this.heroId, amt * 0.5); },
      heroStart: () => Math.min(20, heroStartLevel(P.heroes[this.heroId]?.rank || 1) + (this.ac.heroLvl || 0)),
    };
    this.world = new World({ map, diff, loadout: this.loadout, hero: this.heroId, hooks, academy: this.ac, seed: (Date.now() % 1e6) | 0 });
    if (app.devGod) this.world.god = true;
    app.stage.setMode('game');
    this.view = new GameView(app.stage, this.world, { branch: hooks.branch, skin: cid => this.skinOf(cid) });
    this.speed = 1; this.paused = false; this.placing = null; this.sel = null; this.ghost = null; this.ghostPos = null;
    this.slowT = 0; this.endT = -1; this.finished = false; this.saveT = 0;
    this.hud = new Hud(this);
    this.bindInput();
    app.audio.playSong(this.music); app.audio.setIntensity(0.2);
    this.hud.banner(this.world.map.name, this.world.diff.name + ' · ' + (this.world.maxWave === Infinity ? 'Endlos' : this.world.maxWave + ' Wellen'));
    P.stats.runs = P.stats.runs; // Zähler erst am Ende
  }
  skinOf(cid) { const c = this.P.chars[cid]; if (!c || !c.skin) return null; return CREATURES[cid]?.mastery?.skins?.[c.skin - 1]?.pal || null; }
  settings() { return this.P.settings; }

  // ───────── Fortschritt ─────────
  giveAcc(amt) {
    const r = addAccXp(this.P, amt * (1 + (this.ac?.accXp || 0))); this.accGain += r.xp;
    for (const up of r.ups) {
      this.accUps.push(up);
      this.hud.toast('acc', `Konto-Level ${up.lvl}!`, up.rewards.map(x => 'Neu: ' + x.text).join(' · ') || 'Weiter so!');
      this.app.audio.play('acclevel');
    }
    return r.xp;
  }
  onCharUp(up) {
    this.charUps.push(up);
    const def = CREATURES[up.cid];
    const extra = up.forms.length ? `Neue Form erweckbar: ${up.forms.join(', ')}` : up.perks.length ? up.perks.join(', ') : 'Werte gestiegen';
    this.hud.toast('char', `${def.name} erreicht Lv ${up.lvl}`, extra);
    this.app.audio.play('levelup');
    this.giveAcc(BAL.acc.charLevelUp);
    this.world.dirty = true;
    for (const t of this.world.towers) if (t.cid === up.cid) { const [x, z] = this.view.toW(t.x, t.y); this.view.rings.add(x, 0.05, z, 0.2, 1.1, 0x5fe6ff, 0.6); this.view.parts.burst(x, 0.6, z, [0x5fe6ff, 0xffffff], 24, 2, 0.16, 0.8, { lift: 1.6 }); this.view.floaters.add(x, 1.3, z, 'Lv ' + up.lvl, 'lvl', 1.2); }
    this.hud.refreshPanel(); this.hud.buildTray();
  }

  // ───────── Eingabe: frei platzieren (ziehen oder antippen), Kreatur antippen = auswählen ─────────
  bindInput() {
    const cv = this.app.stage.canvas;
    let down = null;
    // Platzieren wie im Genre üblich: ziehen → loslassen. Ungültig = Kreatur bleibt rot liegen;
    // dann von irgendwo auf der Karte weiterziehen (relativ zur Fingerbewegung), Loslassen auf freiem Platz setzt sie.
    this.onDown = e => {
      this.app.audio.init(); down = { x: e.clientX, y: e.clientY, type: e.pointerType }; this.touchDrag = e.pointerType !== 'mouse';
      if (!this.placing) return;
      const g0 = this.groundRaw(e.clientX, e.clientY);
      if (this.ghostPos && g0) this.rel = { sx: g0.x, sy: g0.y, gx: this.ghostPos.x, gy: this.ghostPos.y };   // liegende Kreatur verschieben
      else { const p = this.groundAt(e.clientX, e.clientY); if (p) this.setGhost(p); }                        // erster Tipp setzt die Vorschau
    };
    this.onMove = e => {
      if (!this.placing) return;
      if (this.dragging) { this.touchDrag = e.pointerType !== 'mouse'; const p = this.groundAt(e.clientX, e.clientY); if (p) this.setGhost(p); return; }
      if (this.rel && down) { const g = this.groundRaw(e.clientX, e.clientY); if (g) this.setGhost({ x: this.rel.gx + g.x - this.rel.sx, y: this.rel.gy + g.y - this.rel.sy }); return; }
      if (e.pointerType === 'mouse' && !this.ghostLocked) { const p = this.groundAt(e.clientX, e.clientY); if (p) this.setGhost(p); }
    };
    this.onUp = e => {
      const d = down; down = null; const rel = this.rel; this.rel = null;
      const onMap = document.elementFromPoint(e.clientX, e.clientY) === cv;
      if (this.dragging) { this.dragging = false; if (!onMap) { this.cancelPlace(); return; } const p = this.groundAt(e.clientX, e.clientY); if (p) this.setGhost(p); this.releaseGhost(); return; }
      if (!d) return;
      if (this.placing) { if (rel && !onMap) { this.cancelPlace(); return; } this.releaseGhost(); return; }
      if (e.target !== cv) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 14) return;
      this.tap(e.clientX, e.clientY);
    };
    cv.addEventListener('pointerdown', this.onDown); addEventListener('pointermove', this.onMove); addEventListener('pointerup', this.onUp);
    this.onKey = e => {
      if (e.key === ' ') { e.preventDefault(); this.hud.playBtn(); }
      else if (e.key === 'Escape') { if (this.placing) this.cancelPlace(); else if (this.sel) this.select(null); else this.hud.pause(); }
      else if (/^[1-6]$/.test(e.key)) { const c = this.hud.trayIds[+e.key - 1]; if (c) this.startPlace(c); }
      else if (e.key === 'f') this.hud.cycleSpeed();
    };
    addEventListener('keydown', this.onKey);
  }
  groundRaw(cx, cy) { const p = this.app.stage.ground(cx, cy, 0); return p ? { x: p.x + this.world.W / 2, y: p.z + this.world.H / 2 } : null; }
  groundAt(cx, cy) {
    if (this.dragging && this.touchDrag) cy -= 46; // beim Ziehen mit dem Finger: Vorschau sichtbar über dem Finger
    const st = this.app.stage, W = this.world.W, H = this.world.H;
    const p = st.ground(cx, cy, 0); if (!p) return null;
    let x = p.x + W / 2, y = p.z + H / 2;
    const q = st.ground(cx, cy, 0.34);
    if (q) { const x2 = q.x + W / 2, y2 = q.z + H / 2; if (this.world.terrainAt(x2, y2) === '^') { x = x2; y = y2; } }
    return { x, y };
  }
  tap(cx, cy) {
    const p = this.groundAt(cx, cy), w = this.world; if (!p) { this.select(null); return; }
    const t = w.towerNear(p.x, p.y, 0.6);
    if (t) { this.select(t === this.sel ? null : t); this.app.audio.play('click'); return; }
    const c = { x: Math.floor(p.x), y: Math.floor(p.y) };
    if (w.cellType(c.x, c.y) === 'R') { this.hud.rockPrompt(c); return; }
    this.select(null);
  }
  startPlace(cid, drag = false) {
    if (this.world.over) return;
    if (this.placing === cid && !drag) { this.cancelPlace(); return; }
    this.select(null); this.cancelPlace();
    if (this.world.coins < this.world.costOf(cid)) { this.hud.err('Zu wenig Münzen'); return; }
    if (cid === this.heroId && this.world.towers.some(t => t.hero)) { this.hud.err(HEROES[cid].name + ' ist schon im Einsatz'); return; }
    this.placing = cid; this.dragging = drag; this.app.audio.play('click');
    this.view.showArrows(1.5);
    this.hud.buildTray(); this.hud.coachEvent('pick');
    this.hud.hint(drag ? 'Auf die Karte <b>ziehen</b> und loslassen' : 'Auf die Karte tippen – Finger bewegen – <b>loslassen</b> zum Platzieren');
  }
  setGhost(p) {
    const w = this.world, cid = this.placing; if (!cid) return;
    p = { x: Math.max(0.3, Math.min(w.W - 0.3, p.x)), y: Math.max(0.3, Math.min(w.H - 0.3, p.y)) };
    const n = w.nearestPlace(cid, p.x, p.y, 0.35); p = { x: n.x, y: n.y };
    this.ghostPos = p;
    const ok = n.c;
    if (!this.ghost || this.ghost.cid !== cid) {
      if (this.ghost) this.view.root.remove(this.ghost.m.root);
      const m = buildModel(cid, { stage: 0, branch: this.P.chars[cid]?.branch, skin: this.skinOf(cid), hlvl: 1 });
      // eigene Materialien, damit die Rot-Tönung nur die Vorschau trifft
      const mats = []; m.root.traverse(o => { if (o.isMesh && o.material?.emissive) { const orig = o.material; o.material = orig.clone(); o.material.onBeforeCompile = orig.onBeforeCompile; o.material.customProgramCacheKey = orig.customProgramCacheKey; mats.push(o.material); } });
      this.view.root.add(m.root); this.ghost = { cid, m, mats };
    }
    const h = this.view.hAt(Math.floor(p.x), Math.floor(p.y)), [x, z] = this.view.toW(p.x, p.y);
    this.ghost.m.root.position.set(x, h, z); this.ghost.m.root.scale.setScalar(1.75); this.ghost.m.root.visible = true;
    const hero = cid === this.heroId;
    const s = baseStats({ cid, hero, stage: 0, tiers: [0, 0, 0], hlvl: 1 }, this.P.chars[cid]?.level || 1, this.P.chars[cid]?.branch);
    const r = s.range * (w.terrainAt(p.x, p.y) === '^' ? 1 + BAL.run.highRange : 1);
    this.view.showRange(p.x, p.y, r, ok.ok ? 0xffffff : 0xff5a6a, h);
    this.view.showFoot(p.x, p.y, ok.ok, h);
    this.ghostOk = ok;
    for (const mt of this.ghost.mats) { mt.emissive.setHex(ok.ok ? 0x000000 : 0xff1a2a); mt.emissiveIntensity = ok.ok ? 0 : 0.85; }
    this.hud.hint(ok.ok ? (w.terrainAt(p.x, p.y) === '^' ? 'Anhöhe: +15 % Reichweite – loslassen' : w.terrainAt(p.x, p.y) === '~' ? 'Wasser: +20 % Tempo – loslassen' : 'Loslassen zum Platzieren') : '⚠ ' + ok.why + ' – irgendwo ziehen zum Verschieben');
  }
  // Finger losgelassen: freier Platz → setzen, sonst bleibt die Kreatur rot liegen
  releaseGhost() {
    if (!this.placing || !this.ghostPos) return;
    if (this.ghostOk?.ok) { this.tryPlace(); return; }
    this.app.audio.play('error'); this.ghostLocked = true;
    this.hud.hint('⚠ ' + (this.ghostOk?.why || 'Hier ist kein Platz') + ' – <b>irgendwo auf der Karte ziehen</b> zum Verschieben, zurück auf den Shop = abbrechen');
  }
  tryPlace() {
    const p = this.ghostPos; if (!p || !this.placing) return;
    const r = this.world.place(this.placing, p.x, p.y);
    if (!r.ok) { this.hud.err(r.why); return; }
    this.app.audio.play('place');
    this.cancelPlace();
    // Hochformat: Shop offen lassen (weiter platzieren); Upgrades per Antippen der Kreatur
    if (!this.app.stage.portrait) this.select(r.tower); else this.view.showSel?.(r.tower);
    this.hud.coachEvent('placed');
  }
  cancelPlace() {
    this.placing = null; this.ghostPos = null; this.dragging = false; this.ghostLocked = false; this.rel = null;
    if (this.ghost) { this.view.root.remove(this.ghost.m.root); this.ghost = null; }
    this.view.hideRange(); this.view.hideFoot(); this.hud.hint(null); this.hud.buildTray();
  }
  select(t) {
    this.sel = t; this.view.select(t); this.hud.showPanel(t);
  }

  // ───────── Hauptschleife ─────────
  update(dt) {
    const w = this.world;
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) w.timeScale = 1; }
    if (!this.paused) w.tick(dt * this.speed);
    const S = this.settings();
    for (const e of w.events) { this.view.handle(e, S); this.sound(e); this.hud.handle(e); this.react(e); }
    w.events.length = 0;
    if (this.ghost && this.ghostPos) { this.ghost.m.tick(performance.now() / 1000, dt, {}); this.ghost.m.root.position.y = this.view.hAt(Math.floor(this.ghostPos.x), Math.floor(this.ghostPos.y)) + 0.08 + Math.sin(performance.now() / 200) * 0.04; }
    if (this.sel && !w.towers.includes(this.sel)) this.select(null);
    if (this.sel && this.selRange !== this.sel.s.range) { this.selRange = this.sel.s.range; this.view.select(this.sel); }
    this.view.update(this.paused ? 0 : dt * Math.min(this.speed, 2), S);
    this.hud.update(dt);
    this.app.audio.setIntensity(w.boss ? (w.boss.phase >= 3 ? 2 : 1) : w.waveRunning() ? 0.8 : 0.2);
    this.saveT += dt; if (this.saveT > 20) { this.saveT = 0; saveProfile(this.P); }
    if (w.over && !this.finished) {
      if (this.endT < 0) { this.endT = 2.2; this.app.audio.play(w.won ? 'win' : 'lose'); this.hud.banner(w.won ? 'SIEG!' : 'NIEDERLAGE', w.won ? 'Der Schrein ist sicher' : 'Der Herzkristall ist erloschen', w.won ? 'evo' : 'boss'); }
      this.endT -= dt; if (this.endT <= 0) { this.finished = true; this.finish(); }
    }
  }
  slow(scale, sec) { if (!this.settings().shake && scale < 1) return; this.world.timeScale = scale; this.slowT = sec; }
  react(e) {
    switch (e.t) {
      case 'evolve': this.slow(0.2, 0.9); this.hud.banner(e.form.name.toUpperCase(), 'Evolution!', 'evo'); this.hud.flash(0.5); break;
      case 'ability': this.slow(0.35, 0.45); if (e.id === 'judgement') this.hud.flash(0.6); break;
      case 'bossDie': this.slow(0.25, 1.4); this.hud.flash(0.8); break;
      case 'bossPhase': this.slow(0.4, 0.6); break;
      case 'upgrade': if (e.tier === 5) { this.slow(0.3, 0.6); this.hud.flash(0.35); } break;
      case 'boss': this.app.audio.playSong('boss'); break;
      case 'wave': if (this.world.boss == null && this.app.audio.song?.name !== this.music) this.app.audio.playSong(this.music); break;
      case 'waveEnd': {
        saveProfile(this.P);
        for (const a of checkAchievements(this.P)) { this.achs.push(a); this.hud.toast('ach', '🏆 ' + a.name, a.desc); this.giveAcc(a.xp); }
        if (!this.world.boss && this.app.audio.song?.name === 'boss') this.app.audio.playSong(this.music);
        if (this.settings().autoWave && !this.world.over) setTimeout(() => { if (!this.world.over && !this.world.waveRunning()) this.world.startWave(); }, 900);
        break;
      }
    }
  }
  sound(e) {
    const A = this.app.audio;
    switch (e.t) {
      case 'shot': { const k = e.tower.s?.proj || ''; A.play(e.special ? 'fire' : k.includes('fire') || k === 'foxfire' ? 'fire' : k === 'feather' ? 'feather' : k === 'leaf' || k === 'light' ? 'leaf' : k.includes('shuriken') ? 'shuriken' : 'kunai'); break; }
      case 'bolt': A.play('zap'); break; case 'pulse': A.play('pulse'); break; case 'mortar': A.play('mortar'); break;
      case 'boom': A.play('boom'); break; case 'strike': A.play(e.kind === 'thunder' ? 'thunder' : 'boom'); break;
      case 'hit': if (e.crit) A.play('crit'); else A.play('hit'); break;
      case 'kill': if (e.e.boss || e.e.miniboss || e.e.kind === 'golem') A.play('bigdie'); else { A.play('pop', { layer: e.e.def.layer || 0 }); A.play('coin'); } break;
      case 'leak': A.play('leak'); break; case 'react': A.play('react'); break;
      case 'upgrade': A.play(e.tier === 5 ? 'tier5' : 'upgrade', { tier: e.tier }); break;
      case 'evolve': A.play('evolve'); break; case 'sell': A.play('sell'); break; case 'rock': A.play('boom'); break;
      case 'wave': A.play('wave'); break; case 'waveEnd': A.play('waveEnd'); break;
      case 'bossWarn': A.play('bossWarn'); break; case 'bossPhase': A.play('roar'); break; case 'breath': A.play('breath'); break; case 'bossDie': A.play('roar'); break;
      case 'ability': A.play(['judgement', 'whirl', 'thunderfall', 'sanctuary'].includes(e.id) ? 'ult' : 'ability'); if (e.id === 'roar' || e.id === 'storm' || e.id === 'thunderfall') A.play('thunder'); break;
      case 'cone': A.play(e.type === 'fire' ? 'fire' : 'frost'); break; case 'slash': A.play('slash'); break; case 'heal2': A.play('levelup'); break;
      case 'dash': A.play('ability'); break; case 'say': A.play('say'); break; case 'heroLevel': A.play('levelup'); break;
    }
  }

  // ───────── Abschluss: Ergebnisse, Boni, Speichern ─────────
  finish() {
    const P = this.P, w = this.world, won = w.won, d = this.diffKey, D = BAL.diff[d];
    P.stats.runs++; if (won) P.stats.wins++; else P.stats.losses++;
    const perfect = won && w.lives >= w.maxLives;
    if (won && d === 'hard') P.stats.winsHard++;
    if (won && this.mapId === 'dorf') P.stats.winDorf = (P.stats.winDorf || 0) + 1;
    if (won && this.mapId === 'glut') P.stats.winGlut = (P.stats.winGlut || 0) + 1;
    if (perfect) P.stats.perfect++; if (perfect && d === 'hard') P.stats.perfectHard++;
    if (d === 'endless') P.stats.bestEndless = Math.max(P.stats.bestEndless || 0, w.doneWave);
    const mp = P.maps[this.mapId] ||= { normal: 0, hard: 0, endless: 0 };
    const firstClear = won && !(mp[d] >= w.maxWave);
    mp[d] = Math.max(mp[d] || 0, w.doneWave);
    const used = [...w.stats.used].filter(c => CREATURES[c]);
    const winBonus = {}, masteryUps = [];
    for (const cid of used) {
      const c = P.chars[cid]; c.runs++;
      if (won) {
        c.wins++;
        const r = addCharXp(P, cid, (w.stats.xp[cid] || 0) * BAL.char.winBonus, { flat: true, diff: 'normal' });
        winBonus[cid] = r.xp; for (const up of r.ups) this.charUps.push(up);
      }
      const m = addMastery(P, cid, (won ? 1 : 0) + (w.stats.bossKills ? 1 : 0)); if (m) masteryUps.push({ cid, m });
    }
    if (this.heroId) { const h = P.heroes[this.heroId]; h.runs++; if (won) h.wins = (h.wins || 0) + 1; }
    if (won) this.giveAcc(BAL.acc.win * D.acc);
    if (firstClear) this.giveAcc(BAL.acc.firstMapClear);
    for (const a of checkAchievements(P)) { this.achs.push(a); this.giveAcc(a.xp); }
    for (const a of checkAchievements(P)) { this.achs.push(a); this.giveAcc(a.xp); }
    P.stats.coins += 0; // laufend über Hooks gezählt
    P.stats.dmg = (P.stats.dmg || 0) + Object.values(w.stats.dmg).reduce((a, b) => a + b, 0);
    P.stats.coins = (P.stats.coins || 0) + w.stats.coins;
    saveProfile(P);
    const hero = w.towers.find(t => t.hero);
    this.app.results({
      won, perfect, firstClear, map: w.map.name, mapId: this.mapId, diff: D.name, diffKey: d, wave: w.doneWave, maxWave: w.maxWave, lives: w.lives, maxLives: w.maxLives,
      kills: w.stats.kills, coins: w.stats.coins, leaks: w.stats.leaks, reactions: w.stats.reactions, evolves: w.stats.evolves,
      used, xp: w.stats.xp, winBonus, snap: this.snap, charUps: this.charUps, accGain: this.accGain, accUps: this.accUps, achs: this.achs, masteryUps,
      hero: hero ? { lvl: hero.hlvl, id: hero.cid } : null, dmg: w.stats.dmg,
    });
  }
  quit() { this.world.over = true; this.finished = true; }
  destroy() {
    const cv = this.app.stage.canvas;
    cv.removeEventListener('pointerdown', this.onDown); removeEventListener('pointerup', this.onUp); removeEventListener('pointermove', this.onMove);
    removeEventListener('keydown', this.onKey);
    this.cancelPlace(); this.view.dispose(); this.hud.destroy();
  }
}
export { formsFor, HEROES, THREE };
