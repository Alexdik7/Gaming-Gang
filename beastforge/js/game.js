// Ein Run: Simulation + Ansicht + Eingabe + Fortschritts-Hooks (Charakter-/Konto-XP live, nie verlieren).
import * as THREE from 'three';
import { World } from './sim/world.js';
import { baseStats } from './sim/stats.js';
import { GameView } from './render/view.js';
import { buildModel } from './render/models.js';
import { Hud } from './ui/hud.js';
import { BAL } from './config.js';
import { CREATURES } from './data/creatures.js';
import { HEROES } from './data/heroes.js';
import { addCharXp, addAccXp, addHeroRankXp, heroStartLevel, unlocked, unlockedCreatures, addMastery, checkAchievements, formsFor } from './meta/progression.js';
import { saveProfile } from './meta/profile.js';

export class Game {
  constructor(app, { map = 'ahnenhain', diff = 'normal' }) {
    this.app = app; const P = this.P = app.profile;
    this.mapId = map; this.diffKey = diff;
    this.loadout = unlockedCreatures(P).filter(id => P.loadout.includes(id)).slice(0, 5);
    if (!this.loadout.length) this.loadout = ['kitsune'];
    this.heroId = unlocked(P, 'hero', P.hero) ? P.hero : null;
    this.snap = { acc: { ...P.account }, chars: Object.fromEntries(Object.entries(P.chars).map(([k, c]) => [k, { level: c.level, xp: c.xp }])) };
    this.accGain = 0; this.charUps = []; this.accUps = []; this.achs = [];
    const hooks = {
      level: cid => P.chars[cid]?.level ?? 1,
      branch: cid => P.chars[cid]?.branch || 'spirit',
      charXp: (cid, raw, wave) => {
        const r = addCharXp(P, cid, raw, { wave, diff });
        for (const up of r.ups) this.onCharUp(up);
        return r.xp;
      },
      accXp: amt => this.giveAcc(amt),
      stat: (k, n, max) => { P.stats[k] = max ? Math.max(P.stats[k] || 0, n) : (P.stats[k] || 0) + n; },
      heroXp: amt => { if (this.heroId) addHeroRankXp(P, this.heroId, amt * 0.5); },
      heroStart: () => heroStartLevel(P.heroes[this.heroId]?.rank || 1),
    };
    this.world = new World({ map, diff, loadout: this.loadout, hero: this.heroId, hooks, seed: (Date.now() % 1e6) | 0 });
    if (app.devGod) this.world.god = true;
    app.stage.setMode('game');
    this.view = new GameView(app.stage, this.world, { branch: hooks.branch, skin: cid => this.skinOf(cid) });
    this.speed = 1; this.paused = false; this.placing = null; this.sel = null; this.ghost = null; this.ghostCell = null;
    this.slowT = 0; this.endT = -1; this.finished = false; this.saveT = 0;
    this.hud = new Hud(this);
    this.bindInput();
    app.audio.playSong('forest'); app.audio.setIntensity(0.2);
    this.hud.banner(this.world.map.name, this.world.diff.name + ' · ' + (this.world.maxWave === Infinity ? 'Endlos' : this.world.maxWave + ' Wellen'));
    P.stats.runs = P.stats.runs; // Zähler erst am Ende
  }
  skinOf(cid) { const c = this.P.chars[cid]; if (!c || !c.skin) return null; return CREATURES[cid]?.mastery?.skins?.[c.skin - 1]?.pal || null; }
  settings() { return this.P.settings; }

  // ───────── Fortschritt ─────────
  giveAcc(amt) {
    const r = addAccXp(this.P, amt); this.accGain += r.xp;
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

  // ───────── Eingabe ─────────
  bindInput() {
    const cv = this.app.stage.canvas;
    let down = null;
    this.onDown = e => { this.app.audio.init(); down = { x: e.clientX, y: e.clientY, t: performance.now(), type: e.pointerType }; };
    this.onUp = e => {
      if (!down) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); const d = down; down = null;
      if (moved > 14) return;
      this.tap(e.clientX, e.clientY, d.type === 'mouse');
    };
    this.onMove = e => { if (e.pointerType === 'mouse' && this.placing && !down) { const c = this.cellAt(e.clientX, e.clientY); if (c) this.setGhost(c); } };
    cv.addEventListener('pointerdown', this.onDown); cv.addEventListener('pointerup', this.onUp); cv.addEventListener('pointermove', this.onMove);
    this.onKey = e => {
      if (e.key === ' ') { e.preventDefault(); this.hud.waveBtn(); }
      else if (e.key === 'Escape') { if (this.placing) this.cancelPlace(); else if (this.sel) this.select(null); else this.hud.pause(); }
      else if (/^[1-6]$/.test(e.key)) { const c = this.hud.trayIds[+e.key - 1]; if (c) this.startPlace(c); }
      else if (e.key === 'f') this.hud.cycleSpeed();
    };
    addEventListener('keydown', this.onKey);
  }
  cellAt(cx, cy) {
    const st = this.app.stage, W = this.world.W, H = this.world.H;
    let p = st.ground(cx, cy, 0); if (!p) return null;
    let x = Math.floor(p.x + W / 2), y = Math.floor(p.z + H / 2);
    if (this.world.cellType(x, y) === '^' || this.world.cellType(x, y + 1) === '^') {
      const q = st.ground(cx, cy, 0.34); if (q) { const x2 = Math.floor(q.x + W / 2), y2 = Math.floor(q.z + H / 2); if (this.world.cellType(x2, y2) === '^') { x = x2; y = y2; } }
    }
    if (x < 0 || y < 0 || x >= W || y >= H) return null;
    return { x, y };
  }
  tap(cx, cy, mouse) {
    const c = this.cellAt(cx, cy); if (!c) { if (!this.placing) this.select(null); return; }
    const w = this.world;
    if (this.placing) {
      const ok = w.canPlace(this.placing, c.x, c.y);
      if ((mouse || (this.ghostCell && this.ghostCell.x === c.x && this.ghostCell.y === c.y)) && ok.ok) { this.doPlace(c); return; }
      if (!ok.ok && this.ghostCell && this.ghostCell.x === c.x && this.ghostCell.y === c.y) { this.hud.err(ok.why); }
      const t = w.towerAt(c.x, c.y); if (t && !ok.ok && ok.why === 'Feld belegt') { this.cancelPlace(); this.select(t); return; }
      this.setGhost(c); return;
    }
    const t = w.towerAt(c.x, c.y);
    if (t) { this.select(t === this.sel ? null : t); this.app.audio.play('click'); return; }
    if (w.cellType(c.x, c.y) === 'R') { this.hud.rockPrompt(c); return; }
    this.select(null);
  }
  startPlace(cid) {
    if (this.world.over) return;
    if (this.placing === cid) { this.cancelPlace(); return; }
    this.select(null); this.cancelPlace();
    if (this.world.coins < this.world.costOf(cid)) { this.hud.err('Zu wenig Münzen'); return; }
    if (cid === this.heroId && this.world.towers.some(t => t.hero)) { this.hud.err('Kairo ist schon im Einsatz'); return; }
    this.placing = cid; this.app.audio.play('click');
    this.view.showArrows(1.5);
    this.hud.buildTray(); this.hud.coachEvent('pick');
    // Vorschlag: erste freie gute Position zeigen? → nein, Spieler wählt. Hinweis anzeigen.
    this.hud.hint(cid === this.heroId ? 'Tippe ein Feld für <b>Kairo</b> – nochmal tippen zum Platzieren' : 'Tippe ein Feld neben dem Pfad – <b>nochmal tippen</b> zum Platzieren');
  }
  setGhost(c) {
    const w = this.world, cid = this.placing; if (!cid) return;
    this.ghostCell = c;
    const ok = w.canPlace(cid, c.x, c.y);
    if (!this.ghost || this.ghost.cid !== cid) {
      if (this.ghost) this.view.root.remove(this.ghost.m.root);
      const m = buildModel(cid, { stage: 0, branch: this.P.chars[cid]?.branch, skin: this.skinOf(cid), hlvl: 1 });
      this.view.root.add(m.root); this.ghost = { cid, m };
    }
    const h = this.view.hAt(c.x, c.y), [x, z] = this.view.toW(c.x + 0.5, c.y + 0.5);
    this.ghost.m.root.position.set(x, h, z); this.ghost.m.root.scale.setScalar(1.3); this.ghost.m.root.visible = true;
    const hero = cid === this.heroId;
    const s = baseStats({ cid, hero, stage: 0, tiers: [0, 0, 0], hlvl: 1 }, this.P.chars[cid]?.level || 1, this.P.chars[cid]?.branch);
    let r = s.range * (w.cellType(c.x, c.y) === '^' ? 1 + BAL.run.highRange : 1);
    this.view.showRange(c.x + 0.5, c.y + 0.5, r, ok.ok ? 0xffffff : 0xff5a6a, h);
    this.view.showCell(c.x, c.y, ok.ok);
    this.hud.hint(ok.ok ? 'Nochmal tippen zum <b>Platzieren</b>' + (w.cellType(c.x, c.y) === '^' ? ' · Anhöhe: +15 % Reichweite' : w.cellType(c.x, c.y) === '~' ? ' · Wasser: +20 % Tempo' : '') : '⚠ ' + ok.why);
  }
  doPlace(c) {
    const r = this.world.place(this.placing, c.x, c.y);
    if (!r.ok) { this.hud.err(r.why); return; }
    this.app.audio.play('place');
    this.cancelPlace();
    this.select(r.tower);
    this.hud.coachEvent('placed');
  }
  cancelPlace() {
    this.placing = null; this.ghostCell = null;
    if (this.ghost) { this.view.root.remove(this.ghost.m.root); this.ghost = null; }
    this.view.hideRange(); this.view.hideCell(); this.hud.hint(null); this.hud.buildTray();
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
    if (this.ghost) { this.ghost.m.tick(performance.now() / 1000, dt, {}); this.ghost.m.root.position.y = this.view.hAt(this.ghostCell?.x ?? 0, this.ghostCell?.y ?? 0) + 0.05 + Math.sin(performance.now() / 200) * 0.04; }
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
      case 'wave': if (this.world.boss == null && this.app.audio.song?.name !== 'forest') this.app.audio.playSong('forest'); break;
      case 'waveEnd': {
        saveProfile(this.P);
        for (const a of checkAchievements(this.P)) { this.achs.push(a); this.hud.toast('ach', '🏆 ' + a.name, a.desc); this.giveAcc(a.xp); }
        if (!this.world.boss && this.app.audio.song?.name === 'boss') this.app.audio.playSong('forest');
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
      case 'kill': if (e.e.boss || e.e.miniboss || e.e.kind === 'golem') A.play('bigdie'); else { A.play('pop'); A.play('coin'); } break;
      case 'leak': A.play('leak'); break; case 'react': A.play('react'); break;
      case 'upgrade': A.play(e.tier === 5 ? 'tier5' : 'upgrade', { tier: e.tier }); break;
      case 'evolve': A.play('evolve'); break; case 'sell': A.play('sell'); break; case 'rock': A.play('boom'); break;
      case 'wave': A.play('wave'); break; case 'waveEnd': A.play('waveEnd'); break;
      case 'bossWarn': A.play('bossWarn'); break; case 'bossPhase': A.play('roar'); break; case 'breath': A.play('breath'); break; case 'bossDie': A.play('roar'); break;
      case 'ability': A.play(e.id === 'judgement' || e.id === 'whirl' ? 'ult' : 'ability'); if (e.id === 'roar') A.play('thunder'); break;
      case 'dash': A.play('ability'); break; case 'say': A.play('say'); break; case 'heroLevel': A.play('levelup'); break;
    }
  }

  // ───────── Abschluss: Ergebnisse, Boni, Speichern ─────────
  finish() {
    const P = this.P, w = this.world, won = w.won, d = this.diffKey, D = BAL.diff[d];
    P.stats.runs++; if (won) P.stats.wins++; else P.stats.losses++;
    const perfect = won && w.lives >= w.maxLives;
    if (won && d === 'hard') P.stats.winsHard++;
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
    if (this.heroId) P.heroes[this.heroId].runs++;
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
      won, perfect, firstClear, map: w.map.name, diff: D.name, diffKey: d, wave: w.doneWave, maxWave: w.maxWave, lives: w.lives, maxLives: w.maxLives,
      kills: w.stats.kills, coins: w.stats.coins, leaks: w.stats.leaks, reactions: w.stats.reactions, evolves: w.stats.evolves,
      used, xp: w.stats.xp, winBonus, snap: this.snap, charUps: this.charUps, accGain: this.accGain, accUps: this.accUps, achs: this.achs, masteryUps,
      hero: hero ? { lvl: hero.hlvl, id: hero.cid } : null, dmg: w.stats.dmg,
    });
  }
  quit() { this.world.over = true; this.finished = true; }
  destroy() {
    const cv = this.app.stage.canvas;
    cv.removeEventListener('pointerdown', this.onDown); cv.removeEventListener('pointerup', this.onUp); cv.removeEventListener('pointermove', this.onMove);
    removeEventListener('keydown', this.onKey);
    this.cancelPlace(); this.view.dispose(); this.hud.destroy();
  }
}
export { formsFor, HEROES, THREE };
