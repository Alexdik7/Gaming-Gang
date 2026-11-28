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
import { academyFx, TRIAL, passTrial } from './data/academy.js';
import { CH, reversedMap } from './data/challenges.js';
import { ensureDaily, dailyChallenge, DAILY_XP } from './data/daily.js';
import { HEROES } from './data/heroes.js';
import { POWER, givePowers, runPowerReward } from './data/powers.js';
import { cosOf, ensureEvent } from './data/events.js';
import { discover, reactionKey, codexEntries } from './data/codex.js';
import { megaDef } from './data/megas.js';
import { addCharXp, addAccXp, addHeroRankXp, heroStartLevel, unlocked, unlockedCreatures, addMastery, checkAchievements, formsFor } from './meta/progression.js';
import { saveProfile } from './meta/profile.js';
import { worldHash } from './net.js';

export class Game {
  constructor(app, { map = 'ahnenhain', diff = 'normal', ch = 'std', coop = null }) {
    this.app = app; const P = this.P = app.profile;
    const S = coop?.setup || null; this.net = coop?.net || null; this.coop = S; const me = this.net && !this.net.host ? 1 : 0;   // Koop: gemeinsame Startwerte vom Gastgeber
    if (S) { map = S.map; diff = S.diff; ch = 'std'; }
    this.mapId = map; this.diffKey = diff; this.ch = CH[ch] || TRIAL[ch] || ch === 'daily' ? ch : 'std'; this.music = MAPS[map]?.music || 'forest';
    this.loadout = S ? S.loadout.slice() : unlockedCreatures(P);
    if (!this.loadout.length) this.loadout = ['kitsune'];
    this.heroId = S ? (S.heroes?.[me] ?? null) : unlocked(P, 'hero', P.hero) ? P.hero : (unlocked(P, 'hero', 'kairo') ? 'kairo' : null);
    this.rec0 = { combo: P.stats.bestCombo || 0, kills: P.stats.bestKills || 0, coins: P.stats.bestCoins || 0, wave: P.maps[map]?.[diff] || 0 };   // Rekorde vor dem Run
    this.snap = { acc: { ...P.account }, chars: Object.fromEntries(Object.entries(P.chars).map(([k, c]) => [k, { level: c.level, xp: c.xp }])) };
    this.accGain = 0; this.charUps = []; this.accUps = []; this.achs = [];
    this.ac = academyFx(P); ensureEvent(P);   // Event-Woche vor dem Run festlegen, damit der Run mitzählt
    const hooks = {
      level: cid => S ? S.levels[cid] ?? 1 : P.chars[cid]?.level ?? 1,   // Koop: feste Tabelle, sonst laufen die Welten auseinander
      branch: cid => S ? S.branch[cid] || 'spirit' : P.chars[cid]?.branch || 'spirit',
      charXp: (cid, raw, wave) => {
        const r = addCharXp(P, cid, raw * (1 + (this.ac.charXp || 0)), { wave, diff });
        for (const up of r.ups) this.onCharUp(up);
        return r.xp;
      },
      accXp: amt => this.giveAcc(amt),
      stat: (k, n, max) => { P.stats[k] = max ? Math.max(P.stats[k] || 0, n) : (P.stats[k] || 0) + n; },
      heroXp: (amt, t) => { if (this.heroId && t?.cid === this.heroId && (t.owner || 0) === me) addHeroRankXp(P, this.heroId, amt * 0.5); },   // nur der eigene Held bringt Rang-XP
      heroStart: (cid, who) => S ? (S.heroStarts?.[who] ?? 1) : Math.min(20, heroStartLevel(P.heroes[this.heroId]?.rank || 1) + (this.ac.heroLvl || 0)),
    };
    const mods = S ? {} : this.ch === 'daily' ? Object.assign({}, ...dailyChallenge(P, id => unlocked(P, 'map', id)).mods.map(id => CH[id].mods)) : TRIAL[this.ch] ? { ...TRIAL[this.ch].mods } : CH[this.ch].mods || {};
    this.world = new World({ map, diff, loadout: this.loadout, hero: this.heroId, heroes: S ? S.heroes : undefined, hooks, academy: S ? S.ac : this.ac, mods, mapObj: mods.reverse ? reversedMap(MAPS[map]) : null, seed: S ? S.seed : (Date.now() % 1e6) | 0, players: S ? 2 : 1 });
    this.me = this.net && !this.net.host ? 1 : 0; this.world.who = this.me;   // Koop: Gastgeber = Spieler 0, Mitspieler = Spieler 1
    if (app.devGod && !S) this.world.god = true;
    if (this.net) { this.net.on.leave = () => this.mateLeft(); this.net.on.fin = () => { this.hostDone = true; }; if (!this.net.host) this.askedFree = true; }   // Koop: der Gastgeber entscheidet über freies Spiel
    app.stage.setMode('game');
    this.view = new GameView(app.stage, this.world, { branch: hooks.branch, skin: cid => this.skinOf(cid), heart: cosOf(P, 'heart'), pop: cosOf(P, 'pop') });
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
      if (this.dragging) { this.dragging = false; if (!onMap) { this.cancelPlace(); return; } this.releaseGhost(); return; }   // genau dort lassen, wo die Vorschau angezeigt wurde (nicht unter dem Finger)
      if (!d) return;
      if (this.placing) { if (rel && !onMap) { this.cancelPlace(); return; } this.releaseGhost(); return; }
      if (e.target !== cv) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 14) return;
      this.tap(e.clientX, e.clientY);
    };
    cv.addEventListener('pointerdown', this.onDown); addEventListener('pointermove', this.onMove); addEventListener('pointerup', this.onUp);
    this.onKey = e => {
      if (e.key === ' ') { e.preventDefault(); this.hud.playBtn(); }
      else if (e.key === 'Escape') { if (this.aiming) this.aimPower(null); else if (this.placing) this.cancelPlace(); else if (this.sel) this.select(null); else this.hud.pause(); }
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
    const p = this.groundAt(cx, cy), w = this.world;
    if (this.aiming) { if (p) this.firePower(this.aiming, p.x, p.y); return; }
    if (!p) { this.select(null); return; }
    // Kreatur per Bildschirm-Abstand finden (Finger trifft meist den Körper, nicht den Boden darunter)
    let t = null, bd = 40;
    for (const o of w.towers) for (const h of [0.15, 0.6]) { const q = this.view.screenPos(o.x, o.y, h), d = Math.hypot(q[0] - cx, q[1] - cy); if (d < bd) { bd = d; t = o; } }
    t = t || w.towerNear(p.x, p.y, 0.6);
    if (t) { this.select(t === this.sel ? null : t); this.app.audio.play('click'); return; }
    const c = { x: Math.floor(p.x), y: Math.floor(p.y) };
    if (w.cellType(c.x, c.y) === 'R') { this.hud.rockPrompt(c); return; }
    this.select(null);
  }
  // ───────── Kräfte: Vorrat im Profil, Wirkung in world.usePower ─────────
  usePower(id) {
    const pw = POWER[id], P = this.P; if (!pw || this.world.over) return;
    if (!(P.powers[id] > 0)) { this.hud.err('Keine ' + pw.name + ' mehr'); return; }
    this.aimPower(null);
    if (pw.inst) { this.startPlace(pw.inst.cid, false, id); return; }
    if (pw.target) { this.select(null); this.cancelPlace(); this.aiming = id; this.hud.hint(pw.icon + ' <b>' + pw.name + '</b>: tippe auf die Karte – nochmal auf die Kraft = abbrechen'); this.hud.updPowers(); return; }
    this.firePower(id);
  }
  aimPower(id) { this.aiming = id; if (!id) this.hud.hint(null); this.hud.updPowers(); }
  firePower(id, x, y) {
    const r = this.cmd('usePower', id, x, y);
    if (!r.ok) { this.hud.err(r.why); return; }
    this.P.powers[id]--; this.P.stats.powers = (this.P.stats.powers || 0) + 1; saveProfile(this.P);
    this.app.audio.play(id === 'gold' ? 'coin' : 'ult'); this.aimPower(null);
  }
  startPlace(cid, drag = false, pow = null) {
    if (this.world.over) return;
    if (this.placing === cid && !drag && this.placePow === pow) { this.cancelPlace(); return; }
    this.select(null); this.cancelPlace(); this.aimPower(null);
    if (!pow && this.world.coins < this.world.costOf(cid)) { this.hud.err('Zu wenig Münzen'); return; }
    this.placePow = pow;
    if (cid === this.heroId && this.world.towers.some(t => t.hero && (t.owner || 0) === this.me)) { this.hud.err(HEROES[cid].name + ' ist schon im Einsatz'); return; }
    this.placing = cid; this.dragging = drag; this.app.audio.play('click');
    this.view.showArrows(1.5);
    this.hud.buildTray(); this.hud.coachEvent('pick');
    this.hud.hint(pow ? POWER[pow].icon + ' <b>' + POWER[pow].name + '</b> (gratis, ' + POWER[pow].inst.tiers.join('-') + '): auf die Karte tippen – <b>loslassen</b> zum Platzieren' : drag ? 'Auf die Karte <b>ziehen</b> und loslassen' : 'Auf die Karte tippen – Finger bewegen – <b>loslassen</b> zum Platzieren');
  }
  setGhost(p) {
    const w = this.world, cid = this.placing; if (!cid) return;
    p = { x: Math.max(0.3, Math.min(w.W - 0.3, p.x)), y: Math.max(0.3, Math.min(w.H - 0.3, p.y)) };
    // kein Einrasten: die Vorschau steht genau unter dem Finger (auch rot), damit man bis an den Rand ziehen kann
    this.ghostPos = p;
    const ok = w.canPlace(cid, p.x, p.y, !!this.placePow);
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
    const pw = POWER[this.placePow];
    const r = this.cmd('place', this.placing, p.x, p.y, pw ? { free: true, tiers: pw.inst.tiers } : {});
    if (!r.ok) { this.hud.err(r.why); return; }
    if (pw) { this.P.powers[pw.id]--; this.P.stats.powers = (this.P.stats.powers || 0) + 1; saveProfile(this.P); this.hud.toast('evo', pw.icon + ' ' + pw.name, 'Fertig ausgebaut: ' + pw.inst.tiers.join('-')); }
    this.app.audio.play('place');
    this.cancelPlace();
    // Hochformat: Shop offen lassen (weiter platzieren); Upgrades per Antippen der Kreatur
    if (r.tower) { if (!this.app.stage.portrait) this.select(r.tower); else this.view.showSel?.(r.tower); }
    this.hud.coachEvent('placed');
  }
  cancelPlace() {
    this.placing = null; this.placePow = null; this.ghostPos = null; this.dragging = false; this.ghostLocked = false; this.rel = null;
    if (this.ghost) { this.view.root.remove(this.ghost.m.root); this.ghost = null; }
    this.view.hideRange(); this.view.hideFoot(); this.hud.hint(null); this.hud.buildTray(); this.hud.updPowers?.();
  }
  select(t) {
    this.sel = t; this.view.select(t); this.hud.showPanel(t);
  }

  // ───────── Koop (Lockstep, net.js): alle Welt-Änderungen laufen über cmd() ─────────
  cmd(name, ...a) {
    const w = this.world, N = this.net;
    if (!N || N.gone) return w[name](...a);
    if (N.host) { const r = w[name](...a); if (r?.ok) N.out.push([w.tickN, name, a, 0]); return r; }
    N.send({ c: [name, a] }); return { ok: true, pending: true };   // Gast: Gastgeber reiht ein, Ergebnis kommt mit dem Takt zurück
  }
  hostIn() { const N = this.net, w = this.world; for (const [name, a] of N.inbox.splice(0)) { w.who = 1; const r = w[name](...a); w.who = this.me; if (r?.ok) N.out.push([w.tickN, name, a, 1]); } }
  hostOut() {
    const N = this.net, w = this.world; if (N.gone) return;
    if (w.tickN === N.lastSent && !N.out.length && this.paused === N.lastP) return;
    const m = { n: w.tickN, cmds: N.out.splice(0), p: this.paused };
    if (Math.floor(w.tickN / 120) !== N.hk) { N.hk = Math.floor(w.tickN / 120); m.h = [w.tickN, worldHash(w)]; }
    N.send(m); N.lastSent = w.tickN; N.lastP = this.paused;
  }
  guestStep() {
    const N = this.net, w = this.world, q = N.inbox; let k = 0;
    for (;;) {
      while (q.length && q[0][0] <= w.tickN) {   // Befehle vor dem Schritt anwenden – auch wenn die Welt gerade vorbei ist (freies Spiel)
        const [, name, a, who] = q.shift(); w.who = who || 0; const r = w[name](...a); w.who = this.me;
        if (name === 'freeplay' && r?.ok && !this.freeplay) { this.winRes = this.finish(true); this.freeplay = true; this.hud.banner('FREIES SPIEL', 'Wie lange haltet ihr durch?', 'boss'); }
      }
      if (w.over || w.tickN >= N.hostN || k >= 45) break;
      w.step(BAL.tick); k++;
      const h = N.hashes?.find(x => x[0] === w.tickN);
      if (h && h[1] !== worldHash(w) && !this.desync) { this.desync = true; this.hud.toast('acc', '⚠ Koop asynchron', 'Die Spielstände weichen ab – bitte neu starten.'); }
    }
    this.lag = N.hostN - w.tickN;
  }
  mateLeft() {
    if (this.finished || !this.net) return;
    const host = this.net.host; this.net = null;
    this.hud.toast('acc', '🤝 Mitspieler weg', host ? 'Du spielst allein weiter.' : 'Der Gastgeber hat das Spiel verlassen.');
    if (!host && !this.world.over) { const w = this.world; w.over = true; w.won = false; }
    this.hostDone = true;
  }

  // ───────── Hauptschleife ─────────
  update(dt) {
    const w = this.world;
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) w.timeScale = 1; }
    if (this.net && !this.net.host) this.guestStep();
    else { if (this.net) this.hostIn(); if (!this.paused) w.tick(dt * this.speed); if (this.net) this.hostOut(); }
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
      if (w.won && !this.freeplay && !this.askedFree && this.diffKey !== 'endless') { this.askedFree = true; this.askFree(); return; }
      if (w.won && this.net && !this.net.host && !this.freeplay && !this.hostDone && this.diffKey !== 'endless') {   // Koop-Gast: wartet auf die Entscheidung des Gastgebers
        if (!this.waitShown) { this.waitShown = true; this.app.audio.play('win'); this.hud.banner('🏆 SIEG!', 'Der Gastgeber entscheidet: freies Spiel oder Abschließen …', 'evo'); }
        return;
      }
      if (this.endT < 0) { this.endT = 2.2; this.app.audio.play(w.won ? 'win' : 'lose'); this.hud.banner(w.won ? 'SIEG!' : this.freeplay ? 'FREIES SPIEL ENDE' : 'NIEDERLAGE', w.won ? 'Der Schrein ist sicher' : this.freeplay ? 'Bis Welle ' + w.doneWave + ' durchgehalten' : 'Der Herzkristall ist erloschen', w.won ? 'evo' : 'boss'); }
      this.endT -= dt; if (this.endT <= 0) { this.finished = true; this.finish(); }
    }
  }
  // Codex: neue Entdeckung → kurzer Hinweis (gedrosselt, nicht im Massengefecht zugemüllt)
  found(key) {
    const en = (this.codexMap ||= Object.fromEntries(codexEntries().map(x => [x.key, x])))[key];
    if (!en || !discover(this.P, key)) return false;
    const now = performance.now(); if (en && now - (this.foundT || 0) > 1500) { this.foundT = now; this.hud.toast('syn', '📖 Neu im Codex', en.name); }
    return true;
  }
  slow(scale, sec) { if (!this.settings().shake && scale < 1) return; this.world.timeScale = scale; this.slowT = sec; }
  react(e) {
    switch (e.t) {
      case 'ascend': this.slow(0.2, 1.8); setTimeout(() => this.hud.flash(0.8, '#ffd257'), 1100); break;
      case 'mega': { const md = megaDef(e.tower.cid, e.p); this.found('m:' + md.id); this.slow(0.2, 1.5); setTimeout(() => { this.hud.banner(md.name.toUpperCase(), '✦ MEGA-ENTWICKLUNG · ' + md.kind.name, 'evo'); this.hud.flash(0.7, ['#ff6a2a', '#5fe6ff', '#b07bff'][e.p]); }, 950); break; }
      case 'fuse': this.found('f:' + e.def.id); this.slow(0.25, 1.2); this.hud.banner(e.def.name.toUpperCase(), '⚭ Fusion!', 'evo'); setTimeout(() => this.hud.flash(0.6, e.def.color), 1000); break;
      case 'place': this.found((e.tower.hero ? 'h:' : 'c:') + e.tower.cid); break;
      case 'kill': if (e.e.boss) this.found('b:' + e.e.kind); else this.found('e:' + e.e.kind); break;
      case 'bossWarn': break;
      case 'react': { const k = reactionKey(e.name); if (k) this.found('r:' + k); break; }
      case 'synergy': this.found('s:' + e.sy.id); break;
      case 'evolve': this.slow(0.2, 0.9); this.hud.banner(e.form.name.toUpperCase(), 'Evolution!', 'evo'); this.hud.flash(0.5); break;
      case 'ability': this.slow(0.35, 0.45); if (e.id === 'judgement') this.hud.flash(0.6); break;
      case 'bossDie': this.slow(0.25, 1.4); this.hud.flash(0.8); break;
      case 'bossTele': if (!this.teleTip) { this.teleTip = true; this.hud.tip('⚠ Der Boss lädt einen Angriff auf! <b>Schwachpunkt offen</b>: jetzt Fähigkeiten einsetzen – genug Schaden <b>unterbricht</b> ihn.', 4); } break;
      case 'bossStagger': this.slow(0.35, 0.35); this.hud.flash(0.35, '#ffd257'); break;
      case 'kill': if (e.e.elite || e.e.miniboss) this.slow(0.35, 0.12); break;   // kurzer Treffer-Stopp für wichtige Kills
      case 'bossPhase': this.slow(0.4, 0.6); break;
      case 'upgrade': if (e.tier === 5) { this.slow(0.3, 0.6); this.hud.flash(0.35); } break;
      case 'boss': this.app.audio.playSong('boss'); break;
      case 'wave': if (this.world.boss == null && this.app.audio.song?.name !== this.music) this.app.audio.playSong(this.music); break;
      case 'waveEnd': {
        saveProfile(this.P);
        for (const a of checkAchievements(this.P)) { this.achs.push(a); this.hud.toast('ach', '🏆 ' + a.name, a.desc); this.giveAcc(a.xp); }
        if (!this.world.boss && this.app.audio.song?.name === 'boss') this.app.audio.playSong(this.music);
        if (this.settings().autoWave && !this.world.over && (!this.net || this.net.host)) setTimeout(() => { if (!this.world.over && !this.world.waveRunning()) this.cmd('startWave'); }, 900);
        break;
      }
    }
  }
  sound(e) {
    const A = this.app.audio;
    if (e.tower && !e.tower.hero && (e.t === 'shot' || e.t === 'pulse' || e.t === 'cone' || e.t === 'slash' || e.t === 'bolt' || e.t === 'mortar') && !e.extra) {   // Klangsignatur der Kreatur
      const d = CREATURES[e.tower.cid]; A.voice(d?.fusion ? d.parents[0] : e.tower.cid, Math.max(...e.tower.tiers));
    }
    switch (e.t) {
      case 'shot': { const k = e.tower.s?.proj || ''; A.play(e.special ? 'fire' : k.includes('fire') || k === 'foxfire' ? 'fire' : k === 'feather' ? 'feather' : k === 'leaf' || k === 'light' ? 'leaf' : k.includes('shuriken') ? 'shuriken' : 'kunai'); break; }
      case 'bolt': A.play('zap'); break; case 'pulse': A.play('pulse'); break; case 'mortar': A.play('mortar'); break;
      case 'boom': A.play('boom'); break; case 'strike': A.play(e.kind === 'thunder' ? 'thunder' : 'boom'); break;
      case 'hit': if (e.crit) A.play('crit'); else A.play('hit'); break;
      case 'kill': if (e.e.boss || e.e.miniboss || e.e.kind === 'golem' || e.e.def.big) A.play('bigdie'); else { A.play('pop', { layer: e.e.def.layer || 0 }); A.play('coin'); } break;
      case 'leak': A.play('leak'); break; case 'react': A.play('react'); break;
      case 'upgrade': A.play(e.tier === 5 ? 'tier5' : 'upgrade', { tier: e.tier }); break;
      case 'rebirth': A.play('ult'); A.play('evolve'); break;
      case 'fuse': A.play('ult'); setTimeout(() => A.play('evolve'), 900); break;
      case 'mega': A.play('ult'); setTimeout(() => A.play('tier5'), 700); setTimeout(() => A.play('evolve'), 1000); break;
      case 'ascend': A.play('ult'); setTimeout(() => A.play('tier5'), 500); setTimeout(() => A.play('evolve'), 1100); break;
      case 'evolve': A.play('evolve'); break; case 'sell': A.play('sell'); break; case 'rock': A.play('boom'); break;
      case 'wave': A.play('wave'); break; case 'waveEnd': A.play('waveEnd'); break;
      case 'bossTele': A.play('bossWarn'); break; case 'bossStagger': A.play('tier5'); A.play('crit'); break;
      case 'bossWarn': A.play('bossWarn'); break; case 'bossPhase': A.play('roar'); break; case 'breath': A.play('breath'); break; case 'bossDie': A.play('roar'); break;
      case 'ability': A.play(['judgement', 'whirl', 'thunderfall', 'sanctuary'].includes(e.id) ? 'ult' : 'ability'); if (e.id === 'roar' || e.id === 'storm' || e.id === 'thunderfall') A.play('thunder'); break;
      case 'cone': A.play(e.type === 'fire' ? 'fire' : 'frost'); break; case 'slash': A.play('slash'); break; case 'heal2': A.play('levelup'); break;
      case 'dash': A.play('ability'); break; case 'say': A.play('say'); break; case 'heroLevel': A.play('levelup'); break;
    }
  }

  // ───────── Abschluss: Ergebnisse, Boni, Speichern ─────────
  // Sieg: Abschließen oder im freien Spiel weiterkämpfen (der Sieg zählt sofort)
  askFree() {
    this.paused = true; this.app.audio.play('win');
    const m = document.getElementById('modal'); m.classList.remove('hidden');
    const co = this.net && !this.net.gone ? '<br><small>🤝 Ihr spielt gemeinsam weiter – dein Mitspieler wartet auf deine Wahl.</small>' : '';
    m.innerHTML = `<div class="mbox"><h3>🏆 Sieg!</h3><p>Der Schrein ist sicher. Wollt ihr im <b>freien Spiel</b> weiterkämpfen, bis ihr verliert? Die Wellen werden immer härter – XP gibt es weiter, der Sieg ist schon gespeichert.${co}</p>
      <button class="btn pri" data-f>⚔ Weiterspielen</button><button class="btn" data-e>Abschließen</button></div>`;
    m.querySelector('[data-e]').onclick = () => { m.classList.add('hidden'); this.paused = false; if (this.net && !this.net.gone) this.net.send({ n: this.world.tickN, fin: 1 }); };
    m.querySelector('[data-f]').onclick = () => {
      m.classList.add('hidden'); this.winRes = this.finish(true);
      this.cmd('freeplay'); this.freeplay = true; this.paused = false;
      this.hud.banner('FREIES SPIEL', this.net ? 'Wie lange haltet ihr durch?' : 'Wie lange hältst du durch?', 'boss');
    };
  }
  finish(silent = false) {
    const P = this.P, w = this.world;
    if (this.freeplay && this.winRes) { // Ende des freien Spiels: Sieg ist schon verbucht, nur Rekord + Ergebnis
      const mp = P.maps[this.mapId] ||= { normal: 0, hard: 0, master: 0, endless: 0 };
      mp.free = Math.max(mp.free || 0, w.doneWave); P.stats.bestFree = Math.max(P.stats.bestFree || 0, w.doneWave);
      for (const a of checkAchievements(P)) { this.achs.push(a); this.giveAcc(a.xp); }
      saveProfile(P);
      this.app.results({ ...this.winRes, wave: w.doneWave, freeplay: true, kills: w.stats.kills, coins: w.stats.coins, leaks: w.stats.leaks, reactions: w.stats.reactions, evolves: w.stats.evolves,
        xp: w.stats.xp, charUps: this.charUps, accGain: this.accGain, accUps: this.accUps, achs: this.achs, dmg: w.stats.dmg, lives: w.lives });
      return;
    }
    const won = w.won, d = this.diffKey, D = BAL.diff[d];
    P.stats.runs++; if (won) P.stats.wins++; else P.stats.losses++;
    const perfect = won && w.lives >= w.maxLives;
    if (won && (d === 'hard' || d === 'master')) P.stats.winsHard++; if (won && d === 'master') P.stats.winsMaster = (P.stats.winsMaster || 0) + 1;
    if (won && this.mapId === 'dorf') P.stats.winDorf = (P.stats.winDorf || 0) + 1;
    if (won && this.mapId === 'glut') P.stats.winGlut = (P.stats.winGlut || 0) + 1;
    if (won && this.mapId === 'frost') P.stats.winFrost = (P.stats.winFrost || 0) + 1;
    if (won && this.mapId === 'sky') P.stats.winSky = (P.stats.winSky || 0) + 1;
    if (perfect) P.stats.perfect++; if (perfect && d === 'hard') P.stats.perfectHard++;
    if (d === 'endless') P.stats.bestEndless = Math.max(P.stats.bestEndless || 0, w.doneWave);
    const mp = P.maps[this.mapId] ||= { normal: 0, hard: 0, master: 0, endless: 0 };
    const firstClear = won && !(mp[d] >= w.maxWave);
    // Persönliche Rekorde (Vision P10)
    const R0 = this.rec0, records = [], bc = Math.max(w.bestCombo, w.comboN);
    if (w.doneWave > R0.wave && R0.wave > 0) records.push(`Höchste Welle hier: ${w.doneWave}`);
    if (bc > R0.combo && bc >= BAL.combo.show) records.push(`Beste Combo: ×${bc}`);
    if (w.stats.kills > R0.kills && R0.kills > 0) records.push(`Meiste Kills in einem Run: ${w.stats.kills}`);
    if (w.stats.coins > R0.coins && R0.coins > 0) records.push(`Meiste Münzen in einem Run: ◈${Math.round(w.stats.coins)}`);
    P.stats.bestKills = Math.max(R0.kills, w.stats.kills); P.stats.bestCoins = Math.max(R0.coins, Math.round(w.stats.coins));
    let medal = null;
    let daily = false;
    let chests = won ? 1 : 0;   // Truhen: Sieg +1, Tageskampf +1
    if (won && this.ch === 'daily') { const D0 = ensureDaily(P); if (!D0.won) { D0.won = true; D0.sp = (D0.sp || 0) + 1; daily = true; chests++; this.giveAcc(DAILY_XP); } }
    let trial = null;   // Meisterprüfung bestanden → Siegel + Truhe (Vision P9)
    if (won && TRIAL[this.ch] && passTrial(P, this.ch)) { trial = TRIAL[this.ch]; chests++; this.giveAcc(BAL.acc.firstMapClear); }
    P.stats.staggers = (P.stats.staggers || 0) + (w.stats.staggers || 0);
    P.chests = (P.chests || 0) + chests; ensureEvent(P);
    if (won && CH[this.ch] && this.ch !== 'std') { mp.medals ||= {}; if (!mp.medals[this.ch]) { mp.medals[this.ch] = 1; medal = CH[this.ch]; this.giveAcc(BAL.acc.firstMapClear); } }
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
    const powGot = givePowers(P, runPowerReward(w.doneWave, won, d));
    saveProfile(P);
    const hero = w.towers.find(t => t.hero && (t.owner || 0) === this.me);
    const res = ({
      won, perfect, firstClear, map: w.map.name, mapId: this.mapId, diff: D.name, diffKey: d, wave: w.doneWave, maxWave: w.maxWave, lives: w.lives, maxLives: w.maxLives,
      kills: w.stats.kills, coins: w.stats.coins, leaks: w.stats.leaks, reactions: w.stats.reactions, evolves: w.stats.evolves, combo: Math.max(w.bestCombo, w.comboN),
      used, xp: w.stats.xp, winBonus, snap: this.snap, charUps: this.charUps, accGain: this.accGain, accUps: this.accUps, achs: this.achs, masteryUps,
      hero: hero ? { lvl: hero.hlvl, id: hero.cid } : null, dmg: w.stats.dmg, medal, ch: CH[this.ch], daily, powGot, chests, records, trial,
    });
    if (silent) return res;
    this.app.results(res);
  }
  quit() { this.world.over = true; this.finished = true; }
  destroy() {
    if (this.net) { this.net.close(); this.net = null; }
    const cv = this.app.stage.canvas;
    cv.removeEventListener('pointerdown', this.onDown); removeEventListener('pointerup', this.onUp); removeEventListener('pointermove', this.onMove);
    removeEventListener('keydown', this.onKey);
    this.cancelPlace(); this.view.dispose(); this.hud.destroy();
  }
}
export { formsFor, HEROES, THREE };
