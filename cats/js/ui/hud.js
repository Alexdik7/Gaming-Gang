// GameScreen: Spielfeld-Bedienung und HUD während einer Runde (Teil des UIManagers).
import { BALANCE, GRID } from '../config.js';
import { CATS, TARGET_MODES, DMG_TYPES } from '../data/cats.js';
import { DOGS } from '../data/dogs.js';
import { POWERUPS } from '../data/meta.js';
import { canBuild } from '../sim/maps.js';
import { buildWave } from '../sim/waves.js';
import { canUpgrade, upgradeCost, placeCost, describeFx, pointsOf, computeStats } from '../sim/upgrades.js';
import { Renderer, OWNER_COL } from './render.js';
import { catPortrait, dogPortrait } from './art.js';
import { IC, POWER_EMOJI, fmt } from './icons.js';
import { eventSound } from '../audio.js';
import { BALANCE as B } from '../config.js';

const $ = s => document.querySelector(s);
const PATH_COL = ['#ff5d5d', '#5ab4ff', '#6fd15a'];
const MODE_TXT = { first: ['Erster', 'First'], last: ['Letzter', 'Last'], strong: ['Stärkster', 'Strongest'], close: ['Nächster', 'Closest'] };
const ERR = {
  fish: ['Nicht genug Futter!', 'Not enough fish!'], tile: ['Hier kann keine Katze stehen.', 'A cat cannot stand here.'], limit: ['Davon darf nur eine aufs Feld.', 'Only one of these allowed.'],
  points: ['Keine Trainingspunkte mehr.', 'No training points left.'], master: ['Nur ein Pfad darf Meister werden.', 'Only one path can be mastered.'], max: ['Schon voll ausgebaut.', 'Already maxed.'],
  cooldown: ['Lädt noch …', 'Still recharging …'], none: ['Keins mehr übrig.', 'None left.'], full: ['Die Basis ist schon heil.', 'Base is already at full health.'], phase: ['Die Welle läuft noch.', 'Wave still running.']
};

export class GameScreen {
  constructor(app) {
    this.app = app; this.s = null; this.r = new Renderer($('#field'), app.save.settings);
    this.ui = { sel: 0, placing: null, aim: null }; this.raf = 0; this.last = 0; this.shown = {}; this.frame = 0;
    const cv = $('#field');
    cv.addEventListener('pointerdown', e => this.down(e));
    cv.addEventListener('pointermove', e => this.move(e));
    cv.addEventListener('pointerup', e => this.up(e));
    cv.addEventListener('pointercancel', () => { this.pointer = false; });
    document.addEventListener('pointermove', e => { if (this.drag) this.dragMove(e); });
    document.addEventListener('pointerup', e => { if (this.drag) this.dragEnd(e); });
    $('#hud-bottom').addEventListener('pointerdown', e => this.barDown(e));
    $('#hud-bottom').addEventListener('click', e => this.barClick(e));
    $('#hud-top').addEventListener('click', e => this.topClick(e));
    $('#panel').addEventListener('click', e => this.panelClick(e));
  }
  get V() { return this.s.view; }
  get P() { return this.V.players[this.s.me]; }
  tr(a, b) { return this.app.tr(a, b); }

  // ---------------------------------------------------------------- Start / Ende
  start(session) {
    this.s = session; this.ended = false; this.ui = { sel: 0, placing: null, aim: null }; this.shown = {}; this.coach = null; this.bannerT = 0;
    this.auto = !!this.app.save.settings.auto && !session.online;
    if (this.auto) session.cmd({ t: 'auto', on: true });
    if (session.onNo !== undefined) session.onNo = err => this.deny(err);
    this.buildHud(); this.r.setView(this.V); this.closePanel();
    this.app.audio.music('battle');
    const sv = this.app.save;
    this.tut = (!sv.tutorial && !session.online && this.V.mapDef.id === 'city') ? 1 : 0; this.tutT = 0;
    $('#boss-bar').classList.add('hidden'); $('#coach').classList.add('hidden');
    cancelAnimationFrame(this.raf); this.last = performance.now();
    this.raf = requestAnimationFrame(t => this.loop(t));
    setTimeout(() => this.resize(), 30);
    this.banner(this.app.L(this.V.mapDef.n), this.tr('Setze Katzen und drücke START', 'Place cats and press START'), '#fff');
  }
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; if (this.s) this.s.close(); this.s = null; }
  resize() { if (this.s) this.r.resize(); }
  autoPause() { if (this.s && !this.s.online && !this.ended && !this.s.paused) this.pause(); }

  // ---------------------------------------------------------------- HUD aufbauen
  buildHud() {
    const P = this.P, tr = this.tr.bind(this);
    $('#hud-top').innerHTML = `<button class="hb" data-a="pause">☰</button>
      <span class="pill" id="h-fish">${IC.fish}<b>0</b></span><span class="pill" id="h-lives">${IC.heart}<b>0</b></span>
      <span class="pill wave" id="h-wave"></span><button class="hb" data-a="speed" id="h-speed">×1</button>`;
    const slots = P.loadout.map(id => `<button class="slot" data-cat="${id}"><img src="${catPortrait(id, 112)}" alt=""><span class="c">${IC.fish}${placeCost(CATS[id], P.bonus)}</span></button>`).join('');
    const pws = Object.keys(P.powers).map(id => `<button class="pw" data-pw="${id}" title="${this.app.L(POWERUPS[id].n)}">${POWER_EMOJI[id]}<span class="n"></span><span class="cd hidden"></span></button>`).join('');
    $('#hud-bottom').innerHTML = `<div class="next" id="h-next"></div><div class="catbar">${slots}</div>
      <div class="actions">${pws}${this.s.online ? '' : `<button class="pw" data-a="auto" id="h-auto" style="font-size:12px">AUTO</button>`}<button class="btn go" data-a="start" id="h-start">START</button></div>`;
    let mates = $('#field-wrap .mates'); if (mates) mates.remove();
    if (this.V.players.length > 1) { mates = document.createElement('div'); mates.className = 'mates'; $('#field-wrap').appendChild(mates); }
    this.shown = {}; this.refresh(true);
  }
  set(id, key, val, html) { if (this.shown[key] === val) return false; this.shown[key] = val; const el = $(id); if (el) { if (html) el.innerHTML = val; else el.textContent = val; } return true; }

  refresh(force) {
    const V = this.V, P = this.P, tr = this.tr.bind(this); if (!P) return;
    if (this.set('#h-fish b', 'fish', fmt(Math.floor(P.fish))) && !force) this.bump('#h-fish');
    if (this.set('#h-lives b', 'lives', String(V.lives)) && !force) this.bump('#h-lives');
    const total = V.wavesTotal === Infinity ? '∞' : V.wavesTotal;
    this.set('#h-wave', 'wave', `${tr('Welle', 'Wave')} <b>${Math.max(1, V.wave)}</b>/${total}`, true);
    this.set('#h-speed', 'speed', '×' + this.s.speed);
    // Start-Knopf
    const build = V.phase === 'build';
    const label = build ? (V.wave === 0 ? 'START' : tr('NÄCHSTE WELLE', 'NEXT WAVE')) : tr('Welle läuft …', 'Wave running …');
    if (this.set('#h-start', 'start', label)) $('#h-start').classList.toggle('wait', !build);
    if (this.shown.auto !== this.auto) { this.shown.auto = this.auto; const a = $('#h-auto'); if (a) a.classList.toggle('on', this.auto); }
    // Katzenleiste: bezahlbar?
    const fishKey = P.loadout.map(id => P.fish >= placeCost(CATS[id], P.bonus) ? 1 : 0).join('') + (this.ui.placing ? this.ui.placing.cat : '');
    if (this.shown.slots !== fishKey) { this.shown.slots = fishKey; document.querySelectorAll('#hud-bottom .slot').forEach(el => { const id = el.dataset.cat; el.classList.toggle('poor', P.fish < placeCost(CATS[id], P.bonus)); el.classList.toggle('on', !!this.ui.placing && this.ui.placing.cat === id); }); }
    // Power-ups
    document.querySelectorAll('#hud-bottom .pw[data-pw]').forEach(el => {
      const id = el.dataset.pw, n = P.powers[id] || 0, cd = Math.ceil(P.powerCd[id] || 0), key = n + ':' + cd + ':' + (this.ui.aim && this.ui.aim.id === id ? 1 : 0);
      if (el._k === key) return; el._k = key;
      el.querySelector('.n').textContent = n; el.classList.toggle('empty', n <= 0); el.classList.toggle('on', !!this.ui.aim && this.ui.aim.id === id);
      const c = el.querySelector('.cd'); c.classList.toggle('hidden', cd <= 0); c.textContent = cd;
    });
    // Vorschau der nächsten Welle
    const nw = V.wave + (build ? 1 : 0);
    if (this.shown.next !== nw + V.phase) {
      this.shown.next = nw + V.phase;
      let html = '';
      if (build && nw <= V.wavesTotal) {
        const w = buildWave(nw, V.mapDef, { diff: V.diff, players: V.players.length, total: V.wavesTotal });
        html = `${tr('Als Nächstes', 'Up next')}: ` + w.groups.map(g => `<img src="${dogPortrait(g.type, 48)}" alt="">${g.boss ? '<b style="color:#ff5d7a">BOSS</b>' : '×' + g.count}`).join(' ');
      }
      $('#h-next').innerHTML = html;
    }
    // Mitspieler
    if (V.players.length > 1) { const k = V.players.map(p => p.name + Math.floor(p.fish) + p.connected).join('|'); if (this.shown.mates !== k) { this.shown.mates = k; $('#field-wrap .mates').innerHTML = V.players.map((p, i) => `<div class="${p.connected ? '' : 'off'}"><i style="background:${OWNER_COL[i]}"></i>${p.name}${i === this.s.me ? ' ★' : ''} · ${fmt(Math.floor(p.fish))}</div>`).join(''); } }
    // Boss-Balken
    const boss = V.enemies.list.find(e => e.boss);
    const bb = $('#boss-bar');
    if (boss) { bb.classList.remove('hidden'); const k = boss.type; if (this.shown.boss !== k) { this.shown.boss = k; bb.innerHTML = `<div>👑 ${this.app.L(boss.def.n)}</div><div class="bar"><i></i></div>`; } bb.querySelector('i').style.width = Math.max(0, boss.hp / boss.maxHp * 100) + '%'; }
    else if (this.shown.boss) { this.shown.boss = null; bb.classList.add('hidden'); }
  }
  bump(sel) { const el = $(sel); if (!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  banner(txt, sub, col) { const b = $('#banner'); b.innerHTML = `<span style="color:${col || '#ffc93c'}">${txt}</span>${sub ? `<small>${sub}</small>` : ''}`; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
  deny(err) { const m = ERR[err]; if (m) this.app.toast(this.app.L(m), true); else this.app.audio.play('deny'); }

  // ---------------------------------------------------------------- Hauptschleife
  loop(now) {
    this.raf = requestAnimationFrame(t => this.loop(t));
    const s = this.s; if (!s) return;
    let dt = Math.min(.1, (now - this.last) / 1000); this.last = now;
    s.step(dt);
    const evs = s.drain(), A = this.app.audio;
    for (const ev of evs) {
      this.r.handle(ev);
      const snd = eventSound(ev); if (snd) A.play(snd);
      if (ev.e === 'wave') { if (ev.boss) { this.banner('⚠ BOSS ⚠', this.app.L(DOGS[ev.boss].n), '#ff5d7a'); A.music('boss'); } else this.banner(`${this.tr('Welle', 'Wave')} ${ev.w}`, '', '#fff'); }
      else if (ev.e === 'waveEnd') { A.music('battle'); if (this.V.phase === 'build' || !this.V.over) this.r.text(GRID.cols / 2, 3, '+' + Math.round(BALANCE.waveBonus(ev.w) * (this.V.share || 1)) + ' 🐟', '#ffe680', .5); }
      else if (ev.e === 'power' && ev.pi === s.me) this.app.usedPower(ev.id);
      else if (ev.e === 'gift' && ev.to === s.me) this.app.toast(`🎁 +${ev.n} ${this.tr('Futter von', 'fish from')} ${this.V.players[ev.pi].name}`);
      else if (ev.e === 'life') this.r.text(GRID.cols / 2, 2, '+1 ♥', '#ff8fb0', .5);
    }
    if (this.app.save.settings.fps === 30 && (this.frame++ & 1)) return;
    if (this.ui.sel && !this.V.towers.byId(this.ui.sel)) this.closePanel();
    this.refresh();
    if ((this.panelT = (this.panelT || 0) + dt) > .35 && this.ui.sel) { this.panelT = 0; this.renderPanel(); }
    if (this.tut) this.tutorial(dt);
    this.r.draw(dt * (s.paused ? 0 : 1), this.ui);
    if (s.lost && !this.ended) this.set('#h-wave', 'wave', this.tr('Verbindung verloren – verbinde neu …', 'Connection lost – reconnecting …'));
    if (s.gone && !this.ended) { this.ended = true; this.app.toast(this.tr('Der Gastgeber hat das Spiel verlassen.', 'The host left the game.'), true); this.quit(); return; }
    if (s.result && !this.ended) { this.ended = true; setTimeout(() => this.showEnd(), s.result.win ? 1500 : 900); }
  }

  // ---------------------------------------------------------------- Eingabe auf dem Feld
  tile(e) { const w = this.r.toWorld(e.clientX, e.clientY); return { x: w.x, y: w.y, tx: Math.floor(w.x), ty: Math.floor(w.y) }; }
  ghost(t) {
    const P = this.ui.placing; if (!P) return;
    const V = this.V; P.tx = t.tx; P.ty = t.ty;
    P.ok = canBuild(V.map, t.tx, t.ty) && !V.towers.at(t.tx, t.ty);
    const bo = P.ok ? V.map.bonus[t.ty * GRID.cols + t.tx] : 0;
    P.range = P.base * (bo === 1 ? 1.25 : 1);
  }
  down(e) {
    e.preventDefault(); this.pointer = true;
    const t = this.tile(e), ui = this.ui;
    if (ui.placing) return this.ghost(t);
    if (ui.aim) { ui.aim.x = t.x; ui.aim.y = t.y; return; }
    const tw = this.V.towers.at(t.tx, t.ty);
    if (tw) { ui.sel = tw.id; this.renderPanel(true); this.app.audio.play('click'); } else this.closePanel();
  }
  move(e) { if (!this.pointer) return; const t = this.tile(e), ui = this.ui; if (ui.placing) this.ghost(t); else if (ui.aim) { ui.aim.x = t.x; ui.aim.y = t.y; } }
  up(e) {
    if (!this.pointer) return; this.pointer = false;
    const t = this.tile(e), ui = this.ui;
    if (ui.placing) { this.ghost(t); this.tryPlace(); }
    else if (ui.aim) { const r = this.s.cmd({ t: 'power', id: ui.aim.id, x: t.x, y: t.y }); if (r.err) this.deny(r.err); ui.aim = null; }
  }
  tryPlace() {
    const P = this.ui.placing; if (!P || P.tx < 0) return;
    if (!P.ok) { this.deny('tile'); P.tx = -1; return; }
    const r = this.s.cmd({ t: 'place', cat: P.cat, x: P.tx, y: P.ty });
    if (r.err) { this.deny(r.err); if (r.err !== 'tile') this.ui.placing = null; else P.tx = -1; return; }
    this.ui.placing = null; if (r.id) { this.ui.sel = 0; }
  }
  pick(cat) {
    if (this.ui.placing && this.ui.placing.cat === cat) { this.ui.placing = null; return; }
    this.closePanel(); this.ui.aim = null;
    this.ui.placing = { cat, tx: -1, ty: -1, ok: false, base: computeStats(CATS[cat], [0, 0, 0], this.P.bonus).range, range: 0 };
  }
  // Katze aus der Leiste aufs Feld ziehen
  barDown(e) {
    const slot = e.target.closest('.slot'); if (!slot) return;
    const cat = slot.dataset.cat;
    if (this.P.fish < placeCost(CATS[cat], this.P.bonus)) { this.deny('fish'); return; }
    const was = this.ui.placing && this.ui.placing.cat === cat;
    if (!was) this.pick(cat);
    this.drag = { cat, moved: false, was, x: e.clientX, y: e.clientY };
  }
  dragMove(e) {
    const d = this.drag; if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 12) return;
    d.moved = true;
    const r = $('#field').getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) this.ghost(this.tile(e)); else if (this.ui.placing) this.ui.placing.tx = -1;
  }
  dragEnd(e) {
    const d = this.drag; this.drag = null;
    if (d.moved) { if (this.ui.placing && this.ui.placing.tx >= 0) this.tryPlace(); }
    else if (d.was) this.ui.placing = null;
  }
  barClick(e) {
    const b = e.target.closest('[data-a],[data-pw]'); if (!b) return;
    const a = b.dataset.a, pw = b.dataset.pw, s = this.s;
    if (a === 'start') { const r = s.cmd({ t: 'start' }); if (r.err) this.app.audio.play('deny'); }
    else if (a === 'auto') { this.auto = !this.auto; s.cmd({ t: 'auto', on: this.auto }); this.app.save.settings.auto = this.auto; this.app.changed(); }
    else if (pw) {
      const def = POWERUPS[pw], P = this.P;
      if (!(P.powers[pw] > 0)) return this.deny('none');
      if (P.powerCd[pw] > 0) return this.deny('cooldown');
      this.ui.placing = null; this.closePanel();
      if (def.target) { this.ui.aim = this.ui.aim && this.ui.aim.id === pw ? null : { id: pw, x: 6, y: 8, r: def.radius || def.range, col: def.col }; if (this.ui.aim) this.app.toast(this.tr('Tippe aufs Feld, um zu zielen.', 'Tap the field to aim.')); }
      else { const r = s.cmd({ t: 'power', id: pw }); if (r.err) this.deny(r.err); }
    }
  }
  topClick(e) {
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'pause') this.pause();
    else if (b.dataset.a === 'speed') { if (!this.s.isHost) return this.app.toast(this.tr('Das Tempo bestimmt der Gastgeber.', 'The host controls the speed.')); this.s.speed = this.s.speed >= 3 ? 1 : this.s.speed + 1; }
  }

  // ---------------------------------------------------------------- Katzen-Fenster (Upgrades, Ziel, Verkaufen)
  closePanel() { this.ui.sel = 0; $('#panel').classList.add('hidden'); this.panelKey = ''; }
  renderPanel(force) {
    const t = this.V.towers.byId(this.ui.sel); if (!t) return this.closePanel();
    const P = this.V.players[t.owner], mine = t.owner === this.s.me, app = this.app, tr = this.tr.bind(this), st = t.stats, lang = app.lang;
    const key = t.id + t.tiers.join('') + Math.floor(this.P.fish / 5) + t.mode + t.kills + Math.round(t.dmgDone / 50) + P.discount;
    if (!force && key === this.panelKey) return; this.panelKey = key;
    const used = t.tiers[0] + t.tiers[1] + t.tiers[2], pts = pointsOf(P.bonus, t.cat);
    const attacker = st.atk !== 'eco' && st.atk !== 'support';
    const ups = t.def.paths.map((path, p) => {
      const tier = t.tiers[p], why = canUpgrade(t.def, t.tiers, p, P.bonus), next = path.tiers[tier];
      const pips = `<div class="pp">${[0, 1, 2].map(i => `<i class="${i < tier ? 'on' : ''}"></i>`).join('')}</div>`;
      if (!next || why === 'max') return `<div class="up no" style="--pc:${PATH_COL[p]}">${pips}<b>${app.L(path.n)}</b><span>${tr('Meisterstufe erreicht', 'Mastered')}</span></div>`;
      const cost = upgradeCost(t.def, t.tiers, p, P.bonus, P.discount), poor = this.P.fish < cost;
      const lockTxt = why === 'points' ? tr('Keine Punkte mehr', 'No points left') : why === 'master' ? tr('Nur 1 Meisterpfad', 'Only 1 master path') : '';
      return `<button class="up ${why || !mine ? 'no' : poor ? 'poor' : ''}" style="--pc:${PATH_COL[p]}" data-up="${p}">${pips}<b>${next[lang]}</b><span>${lockTxt || describeFx(next[3], lang)}</span><em>${IC.fish}${cost}</em></button>`;
    }).join('');
    const info = attacker
      ? `<span>${tr('Schaden', 'Damage')} <b>${Math.round(st.dmg * 10) / 10}</b></span><span>${tr('Tempo', 'Speed')} <b>${Math.round(st.rate * 100) / 100}/s</b></span><span>${tr('Reichweite', 'Range')} <b>${Math.round(t.range * 10) / 10}</b></span><span>${app.L(DMG_TYPES[st.type])}</span><span>${tr('Besiegt', 'Kills')} <b>${t.kills || 0}</b></span>`
      : `<span>${describeFx(Object.fromEntries(Object.entries(st).filter(([k, v]) => /^(a[A-Z]|g[A-Z]|income|interest|bounty|discount|lifeEvery)/.test(k) && v)), lang)}</span><span>${tr('Reichweite', 'Range')} <b>${Math.round(t.range * 10) / 10}</b></span>`;
    $('#panel').innerHTML = `<div class="in"><div class="head"><img src="${catPortrait(t.cat, 112)}" alt=""><div class="grow"><b>${t.def.n}</b>${this.V.players.length > 1 ? ` <span class="mut">· ${P.name}</span>` : ''}
      <div class="mut">${tr('Trainingspunkte', 'Training points')} ${used}/${pts}${t.tile === 1 ? ' · ' + tr('Hochsitz', 'High seat') : t.tile === 2 ? ' · ' + tr('Energiefeld', 'Power tile') : ''}</div></div>
      ${mine && attacker ? `<button class="btn sm" data-p="mode">🎯 ${app.L(MODE_TXT[t.mode])}</button>` : ''}
      ${mine ? `<button class="btn sm bad" data-p="sell">${IC.fish}${Math.round(t.spent * B.sellRefund)}</button>` : ''}<button class="btn sm" data-p="close">✕</button></div>
      <div class="mini">${info}</div><div class="ups">${ups}</div></div>`;
    $('#panel').classList.remove('hidden');
  }
  panelClick(e) {
    const t = this.V.towers.byId(this.ui.sel); if (!t) return;
    const up = e.target.closest('[data-up]'), p = e.target.closest('[data-p]');
    if (up) {
      if (up.classList.contains('no')) return this.app.audio.play('deny');
      const r = this.s.cmd({ t: 'upgrade', id: t.id, path: +up.dataset.up });
      if (r.err) this.deny(r.err); this.renderPanel(true);
    } else if (p) {
      const a = p.dataset.p;
      if (a === 'close') this.closePanel();
      else if (a === 'mode') { this.s.cmd({ t: 'target', id: t.id, mode: TARGET_MODES[(TARGET_MODES.indexOf(t.mode) + 1) % 4] }); t.mode = TARGET_MODES[(TARGET_MODES.indexOf(t.mode) + 1) % 4]; this.renderPanel(true); }
      else if (a === 'sell') { this.s.cmd({ t: 'sell', id: t.id }); this.closePanel(); }
    }
  }

  // ---------------------------------------------------------------- Tutorial (kurz, 7 Hinweise)
  tutorial(dt) {
    const V = this.V, tr = this.tr.bind(this), ui = this.ui; this.tutT += dt;
    const steps = [null,
      [tr('Willkommen, Kommandant! Tippe unten eine <b>Katze</b> an.', 'Welcome, commander! Tap a <b>cat</b> below.'), () => ui.placing || V.towers.list.length],
      [tr('Tippe jetzt auf ein <b>freies Feld</b> neben dem Weg.', 'Now tap a <b>free tile</b> next to the path.'), () => V.towers.list.length > 0],
      [tr('Stark! Setze noch eine Katze – oder drücke <b>START</b>.', 'Nice! Place another cat – or press <b>START</b>.'), () => V.wave >= 1],
      [tr('Katzen greifen von selbst an. Jeder Hund bringt <b>Futter</b> 🐟.', 'Cats attack on their own. Every dog drops <b>fish</b> 🐟.'), () => V.wave >= 1 && V.phase === 'build'],
      [tr('Tippe eine Katze an und kaufe ein <b>Upgrade</b>. Drei Pfade – wähle deinen Stil!', 'Tap a cat and buy an <b>upgrade</b>. Three paths – pick your style!'), () => V.towers.list.some(t => t.tiers[0] + t.tiers[1] + t.tiers[2] > 0) || V.wave >= 3],
      [tr('Im Notfall helfen <b>Power-ups</b> (unten links). Die Mega-Pfote 🐾 räumt auf!', 'In a pinch use <b>power-ups</b> (bottom left). The Mega Paw 🐾 clears the lane!'), () => this.tutT > 9 || V.wave >= 5],
      [tr('Überstehe alle Wellen, dann gewinnst du. Viel Erfolg!', 'Survive every wave to win. Good luck!'), () => this.tutT > 6]
    ];
    const st = steps[this.tut]; if (!st) { this.tut = 0; $('#coach').classList.add('hidden'); this.app.save.tutorial = 1; this.app.changed(); return; }
    if (this.coach !== this.tut) { this.coach = this.tut; this.tutT = 0; const c = $('#coach'); c.innerHTML = `<img src="${catPortrait('commander', 96)}" alt=""><div>${st[0]}</div>`; c.classList.remove('hidden'); c.style.bottom = this.ui.sel ? '' : '10px'; }
    $('#coach').classList.toggle('hidden', !!ui.sel);
    if (st[1]()) this.tut++;
  }

  // ---------------------------------------------------------------- Pause und Ergebnis
  pause() {
    const s = this.s, tr = this.tr.bind(this), app = this.app; if (!s || this.ended) return;
    if (!s.online) s.paused = true;
    const set = app.save.settings;
    const m = app.modal(`<h2>${s.online ? tr('Menü', 'Menu') : tr('Pause', 'Paused')}</h2><p class="mut">${app.L(this.V.mapDef.n)} · ${tr('Welle', 'Wave')} ${this.V.wave}</p>
      <div class="field"><span>🎵 ${tr('Musik', 'Music')}</span><input type="range" min="0" max="1" step="0.05" value="${set.music}" data-s="music"></div>
      <div class="field"><span>🔊 ${tr('Effekte', 'Sound')}</span><input type="range" min="0" max="1" step="0.05" value="${set.sfx}" data-s="sfx"></div>
      ${s.online ? `<div class="field"><span>🎁 ${tr('Futter schenken', 'Gift fish')}</span><span>${this.V.players.map((p, i) => i === s.me ? '' : `<button class="btn sm" data-gift="${i}">100 → ${p.name}</button>`).join(' ')}</span></div>` : ''}
      <div style="display:grid;gap:8px;margin-top:12px"><button class="btn go wide" data-close>${tr('Weiter', 'Resume')}</button>
      ${s.online ? '' : `<button class="btn wide" data-m="restart">${tr('Neu starten', 'Restart')}</button>`}<button class="btn bad wide" data-m="quit">${tr('Runde verlassen', 'Leave round')}</button></div>`, { mid: true, onClose: () => { if (this.s) this.s.paused = false; this.last = performance.now(); } });
    m.addEventListener('input', e => { const k = e.target.dataset.s; if (k) { set[k] = +e.target.value; app.audio.volumes(); app.changed(); } });
    m.addEventListener('click', e => {
      const g = e.target.closest('[data-gift]'); if (g) { if (this.P.fish >= 100) { s.cmd({ t: 'gift', to: +g.dataset.gift, n: 100 }); app.toast('🎁 −100'); } else this.deny('fish'); return; }
      const a = e.target.closest('[data-m]'); if (!a) return;
      if (a.dataset.m === 'quit') { app.modalClose = null; app.closeModal(); this.quit(); }
      else { const V = this.V, o = [V.mapDef.id, V.diff, V.mode]; app.modalClose = null; app.closeModal(); this.stop(); app.startSolo(...o); }
    });
  }
  quit() { this.stop(); $('#coach').classList.add('hidden'); this.app.toMenu('home'); }

  showEnd() {
    const s = this.s; if (!s) return;
    const R = s.result, app = this.app, tr = this.tr.bind(this), got = app.finish(R), sv = app.save;
    app.audio.music(null); app.audio.play(R.win ? 'win' : 'lose');
    const endless = R.mode === 'endless';
    const need = BALANCE.xpNeed(sv.level), ups = sv.level - got.levelBefore;
    const unlocks = got.unlocks.map(u => `<div class="unlock">${u.kind === 'cat' ? `<img src="${catPortrait(u.id, 76)}" alt="">` : '🔓'} <span>${tr('Neu', 'New')}: <b>${app.L(u.n)}</b></span></div>`).join('');
    const powers = Object.keys(got.powers || {}).map(id => `<div class="rew">${POWER_EMOJI[id]}<small>${app.L(POWERUPS[id].n)}</small></div>`).join('');
    const m = app.modal(`<p class="title-big ${R.win ? 'win' : 'lose'}">${R.win ? tr('SIEG!', 'VICTORY!') : endless ? tr('RUNDE VORBEI', 'RUN OVER') : tr('NIEDERLAGE', 'DEFEAT')}</p>
      <p class="center mut">${app.L(this.V.mapDef.n)} · ${endless ? tr('Endlos', 'Endless') : tr({ easy: 'Leicht', normal: 'Normal', hard: 'Schwer' }[R.diff], { easy: 'Easy', normal: 'Normal', hard: 'Hard' }[R.diff])} · ${tr('Welle', 'Wave')} ${R.wave}${endless ? '' : '/' + R.wavesTotal} · ${R.kills} ${tr('Hunde besiegt', 'dogs defeated')}${R.perfect ? ' · ⭐ ' + tr('Makellos', 'Flawless') : ''}</p>
      ${got.first ? `<p class="center" style="color:var(--gold)">★ ${tr('Erster Sieg auf dieser Stufe – Bonus-Kristalle!', 'First clear on this difficulty – bonus crystals!')}</p>` : ''}
      <div class="rewards"><div class="rew">${IC.coin} ${fmt(got.coins)}<small>${tr('Münzen', 'Coins')}</small></div>${got.crystals ? `<div class="rew">${IC.crystal} ${got.crystals}<small>${tr('Kristalle', 'Crystals')}</small></div>` : ''}<div class="rew">${IC.xp} ${fmt(got.xp)}<small>XP</small></div>${powers}</div>
      <div class="row"><div class="lvl" style="flex:1"><span class="badge">${sv.level}</span><div class="xp"><div class="bar gold"><i style="width:${Math.min(100, sv.xp / need * 100)}%"></i></div><small>${ups ? `<b style="color:var(--gold)">LEVEL UP! +${ups}</b> · ` : ''}${sv.xp}/${need} XP</small></div></div></div>
      ${unlocks}
      ${!R.win && !endless ? `<p class="mut center" style="margin-top:10px">💡 ${this.tip()}</p>` : ''}
      <div style="display:grid;grid-template-columns:${s.online ? '1fr' : '1fr 1fr'};gap:8px;margin-top:14px">${s.online ? '' : `<button class="btn go" data-e="again">${tr('Nochmal', 'Again')}</button>`}<button class="btn" data-e="menu">${tr('Zum Menü', 'Menu')}</button></div>`, { mid: true, sticky: true });
    if (ups) app.audio.play('levelup');
    m.addEventListener('click', e => {
      const a = e.target.closest('[data-e]'); if (!a) return;
      const V = this.V, o = [V.mapDef.id, V.diff, V.mode];
      app.closeModal(); this.stop();
      if (a.dataset.e === 'again') app.startSolo(...o); else app.toMenu(s.online ? 'mp' : 'play');
    });
  }
  tip() {
    const tr = this.tr.bind(this), T = [
      tr('Getarnte Hunde? Scout (Späher-Pfad), Sniper mit Wärmebild, Ninja oder Shadow Cat sehen sie.', 'Stealth dogs? Scout (Recon path), Sniper with Thermal Scope, Ninja or Shadow Cat can see them.'),
      tr('Gepanzerte Hunde lachen über schwache Treffer. Nimm Sniper, Bomben oder Säure.', 'Armored dogs shrug off weak hits. Bring Sniper, bombs or acid.'),
      tr('Bremse schnelle Hunde mit der Ice Cat – am besten in Kurven.', 'Slow fast dogs with the Ice Cat – ideally at corners.'),
      tr('Eine Katze voll ausbauen ist oft stärker als drei neue.', 'Fully upgrading one cat often beats three new ones.'),
      tr('Die Katzen-Akademie macht alle Katzen dauerhaft stärker.', 'The Cat Academy makes all your cats permanently stronger.')];
    return T[Math.floor(Math.random() * T.length)];
  }
}
