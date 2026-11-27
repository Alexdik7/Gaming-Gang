// HUD während eines Runs (DOM). Querformat: Shop rechts, Upgrade-Panel links, Fähigkeiten unten links.
// Hochformat: Shop unten, Panel als Blatt von unten. Farben: RUN Gold · CHARAKTER Cyan · KONTO Violett.
import { BAL } from '../config.js';
import { CREATURES, PATH_COLORS } from '../data/creatures.js';
import { HEROES } from '../data/heroes.js';
import { POWERS } from '../data/powers.js';
import { punch, shake, ring, flyTo } from './anim.js';
import { MOD_NAMES } from '../data/waves.js';
import { ENEMIES, BOSSES, ELEMENT_NAMES, ELEMENT_COLORS } from '../data/enemies.js';
import { TARGETS, TARGET_NAMES } from '../sim/world.js';
import { canTier } from '../sim/stats.js';
import { charNeed, accNeed, nextFormByLevel, formAt } from '../meta/progression.js';
import { portrait } from '../render/icons.js';
import { appSize } from '../render/stage.js';
import { saveProfile } from '../meta/profile.js';

const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString('de-DE');
const esc = s => String(s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const land = () => { const [w, h] = appSize(); return w > h; };

export class Hud {
  constructor(game) {
    this.g = game; this.w = game.world; this.P = game.P;
    $('hud').classList.remove('hidden'); $('menu').innerHTML = '';
    $('panel').classList.add('hidden'); $('bossBar').classList.add('hidden'); $('toasts').innerHTML = ''; $('banner').innerHTML = ''; $('bubbles').innerHTML = '';
    this.last = {}; this.abT = 0;
    $('bPause').onclick = () => this.pause();
    $('bPlay').onclick = () => this.playBtn();
    $('bAuto').onclick = () => { const S = this.g.settings(); S.autoWave = !S.autoWave; saveProfile(this.P); this.g.app.audio.play('click'); this.last.auto = null; if (S.autoWave && !this.w.waveRunning() && !this.w.over) this.playBtn(); };
    $('bCancel').onclick = () => this.g.cancelPlace();
    $('bPow').onclick = () => { $('powbar').classList.toggle('hidden'); this.g.app.audio.play('click'); this.updPowers(); };
    $('powbar').classList.add('hidden'); this.updPowers();
    $('bEarly').onclick = () => this.early();
    this.buildTray(); this.updAcc();
    document.querySelector('.runbox .coop')?.remove();
    if (game.net) { const c = document.createElement('div'); c.className = 'pill coop'; c.title = 'Geld deines Mitspielers'; c.innerHTML = `<span class="ic">🤝</span><b id="hMate">◈ 0</b>`; document.querySelector('.runbox').appendChild(c); document.querySelector('.runbox .coins')?.classList.add('p' + game.me); c.classList.add('p' + (1 - game.me)); }
    this.coachStep = this.P.seen.intro ? -1 : 0; this.coach();
    this.resizeObs = () => { this.insets(); this.coach(); }; addEventListener('resize', this.resizeObs); setTimeout(() => this.insets(), 0);
  }
  insets() {
    const top = $('hud').querySelector('.top').getBoundingClientRect().bottom + 4, sh = $('shop').getBoundingClientRect();
    const panel = !$('panel').classList.contains('hidden') && land() ? $('panel').getBoundingClientRect().width : 0;
    if (land()) this.g.app.stage.setInsets({ top, right: appSize()[0] - sh.left + 2, bottom: 6, left: 6 + panel * 0 });
    else this.g.app.stage.setInsets({ top, right: 0, bottom: appSize()[1] - sh.top + 2, left: 0 });
    $('rotate').classList.add('hidden'); // Hochformat wird jetzt unterstützt (Karte gedreht)
  }
  destroy() { $('hud').classList.add('hidden'); removeEventListener('resize', this.resizeObs); document.querySelector('.coach')?.remove(); $('bubbles').innerHTML = ''; }

  // ───────── Shop ─────────
  buildTray() {
    const g = this.g, ids = [...g.loadout]; if (g.heroId) ids.unshift(g.heroId);
    this.trayIds = ids.filter(id => id !== g.heroId).concat(g.heroId ? [g.heroId] : []);
    $('tray').innerHTML = ids.map(id => {
      const hero = id === g.heroId, cost = this.w.costOf(id), c = this.P.chars[id];
      const img = portrait(id, { stage: 0, branch: c?.branch, skin: g.skinOf(id), hlvl: 1 });
      const name = hero ? HEROES[id].name : CREATURES[id].name;
      const lv = hero ? `★${this.P.heroes[id]?.rank || 1}` : `Lv ${c.level}`;
      return `<button class="card ${hero ? 'hero' : ''} ${g.placing === id ? 'sel' : ''}" data-id="${id}"><span class="lv">${lv}</span><img src="${img}" alt="" draggable="false"><b>${esc(name)}</b><div class="cost">◈ ${fmt(cost)}</div></button>`;
    }).join('');
    $('tray').querySelectorAll('.card').forEach(b => {
      let st = null;
      // Hoch/runter wischen = Leiste scrollen (Browser, touch-action: pan-y); zur Seite ziehen = platzieren
      const out = e => { const dx = e.clientX - st.x, dy = e.clientY - st.y; return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2; };
      b.onpointerdown = e => { this.g.app.audio.init(); st = { x: e.clientX, y: e.clientY, y0: $('tray').scrollTop }; try { b.releasePointerCapture(e.pointerId); } catch (_) { /* egal */ } };
      b.onpointermove = e => { if (!st || g.dragging) return; if (Math.abs(e.clientY - st.y) > 14 && !out(e)) { st = null; return; } if (out(e)) { st = null; g.startPlace(b.dataset.id, true); } };
      b.onpointerleave = e => { if (st && e.buttons && out(e)) { st = null; g.startPlace(b.dataset.id, true); } };
      b.onpointercancel = () => { st = null; };
      b.onpointerup = () => { if (st && Math.abs($('tray').scrollTop - st.y0) < 4) g.startPlace(b.dataset.id, false); st = null; };
    });
    const tr = $('tray'), endChk = () => tr.classList.toggle('end', tr.scrollTop + tr.clientHeight >= tr.scrollHeight - 4);
    tr.onscroll = endChk; requestAnimationFrame(endChk);
    $('bCancel').classList.toggle('hidden', !g.placing);
    this.last.trayCoins = -1;
  }
  updTray() {
    const coins = Math.floor(this.w.coins); if (coins === this.last.trayCoins) return; this.last.trayCoins = coins;
    $('tray').querySelectorAll('.card').forEach(b => {
      const id = b.dataset.id; b.classList.toggle('poor', coins < this.w.costOf(id));
      b.classList.toggle('used', id === this.g.heroId && this.w.towers.some(t => t.hero && (t.owner || 0) === this.g.me));
    });
  }
  updAcc() {
    const a = this.P.account; $('hAccLv').textContent = a.level;
    $('hAccBar').style.width = (a.level >= BAL.acc.maxLevel ? 100 : a.xp / accNeed(a.level) * 100) + '%';
  }

  // ───────── jedes Bild ─────────
  update(dt) {
    const w = this.w;
    const coins = Math.floor(w.coins);
    if (w.players > 1) { const mc = Math.floor(w.wallet[1 - this.g.me] || 0); if (mc !== this.last.mate) { this.last.mate = mc; const el = $('hMate'); if (el) el.textContent = '◈ ' + fmt(mc); } }
    if (coins !== this.last.coins) { $('hCoins').textContent = fmt(coins); if (coins > (this.last.coins ?? 0) && performance.now() - (this.punchT || 0) > 120) { this.punchT = performance.now(); punch($('hCoins').parentElement, 1.14, 220); } this.last.coins = coins; }
    this.updCombo();
    if (w.lives !== this.last.lives) { $('hLives').textContent = w.lives; if (w.lives < (this.last.lives ?? 1e9)) { const p = $('hLives').parentElement; p.classList.remove('hurt'); void p.offsetWidth; p.classList.add('hurt'); } this.last.lives = w.lives; }
    const wl = `${Math.max(1, w.wave)}<small>/${w.maxWave === Infinity ? '∞' : w.maxWave}</small>`; if (wl !== this.last.wave) { $('hWave').innerHTML = wl; this.last.wave = wl; }
    this.updTray(); this.updAcc();
    // Start-/Tempo-Knopf
    const can = w.canStartWave(), running = w.waveRunning();
    const key = [can, running, this.g.speed].join();
    if (key !== this.last.play) {
      this.last.play = key; const b = $('bPlay');
      b.className = 'play ' + (running ? 'fast s' + this.g.speed : 'go');
      b.innerHTML = running ? `<span>${this.g.speed > 1 ? '▶▶' : '▶'}</span><small>${this.g.speed}×</small>` : `<span>▶</span><small>Start</small>`;
      $('bEarly').classList.toggle('hidden', !(can && running));
      $('bEarly').innerHTML = `⏩ Nächste Welle <b>+◈${BAL.run.earlyCall(w.wave)}</b>`;
    }
    // Auto-Start-Schalter + Vorschau der nächsten Welle
    const auto = !!this.g.settings().autoWave; if (auto !== this.last.auto) { this.last.auto = auto; $('bAuto').classList.toggle('on', auto); }
    const pk = !running ? w.peekWave() : null, pkKey = pk ? pk.n : 0;
    if (pkKey !== this.last.prev) { this.last.prev = pkKey; $('wprev').innerHTML = pk ? this.wavePreview(pk) : ''; $('wprev').classList.toggle('hidden', !pk); }
    if (w.boss) {
      $('bossBar').classList.remove('hidden');
      $('bossFill').style.width = Math.max(0, w.boss.hp / w.boss.maxHp * 100) + '%';
      const ph = w.boss.def.phases[w.boss.phase]; $('bossPhase').textContent = `Phase ${w.boss.phase + 1}: ${ph.name}`; $('bossName').textContent = w.boss.def.name;
    } else $('bossBar').classList.add('hidden');
    this.abT -= dt; if (this.abT <= 0) { this.abT = 0.1; this.updAbilities(); }
    if (this.sel !== this.g.sel) this.showPanel(this.g.sel);
    if (this.g.sel) { this.panelT = (this.panelT || 0) - dt; if (this.panelT <= 0) { this.panelT = 0.25; this.refreshPanel(true); } }
    this.updBubbles();
  }
  wavePreview(pk) {
    const g = new Map(); for (const x of pk.def.groups) g.set(x.e, (g.get(x.e) || 0) + Math.round(x.n));
    const tags = new Set(pk.def.mods || []);
    const items = [...g].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => { const d = ENEMIES[k] || BOSSES[k]; if (!d) return ''; if (d.flying) tags.add('fly'); if (d.camo) tags.add('camo'); if (d.res?.phys < 0.7) tags.add('armor');
      return `<span class="${d.boss ? 'bossT' : ''}"><b>${d.boss ? '👑' : n + '×'}</b> ${esc(d.name.split(',')[0])}</span>`; }).join('');
    const T = { fly: '🪽 Fliegend', camo: '👁 Getarnt', armor: '🛡 Gepanzert', fast: '⚡ Schnell', regen: '✚ Regeneration', elite: '👑 Elite', armored: '🛡 Gepanzert' };
    return `<small>WELLE ${pk.n}</small>${items}${[...tags].filter(t => T[t]).map(t => `<i>${T[t]}</i>`).join('')}`;
  }
  playBtn() {
    this.g.app.audio.init();
    const w = this.w;
    if (!w.waveRunning()) { if (this.g.cmd('startWave').ok) this.g.app.audio.play('click'); return; }
    this.cycleSpeed();
  }
  early() { if (this.w.waveRunning() && this.g.cmd('startWave').ok) this.g.app.audio.play('click'); }
  cycleSpeed() { if (this.g.net && !this.g.net.host) { this.tip('Das Tempo bestimmt der Gastgeber', 1.5); return; } this.g.speed = this.g.speed >= 3 ? 1 : this.g.speed + 1; this.g.app.audio.play('click'); }
  // Kräfte-Leiste: Vorrat aus dem Profil, Tippen = einsetzen (Ziel-Kräfte: danach auf die Karte tippen)
  updPowers() {
    const P = this.P, tot = POWERS.reduce((a, p) => a + (P.powers[p.id] || 0), 0);
    $('hPowN').textContent = tot; $('bPow').classList.toggle('empty', !tot);
    const bar = $('powbar'); if (bar.classList.contains('hidden')) return;
    const list = POWERS.filter(p => P.powers[p.id] > 0);
    bar.innerHTML = list.length ? list.map(p => `<button class="pw ${this.g.aiming === p.id || this.g.placePow === p.id ? 'on' : ''}" data-pw="${p.id}" style="--c:${p.color}" title="${esc(p.desc)}"><span>${p.icon}</span><b>${P.powers[p.id]}</b><small>${esc(p.name)}</small></button>`).join('')
      : '<div class="pwnone">Keine Kräfte – du bekommst neue für Siege, alle 10 Wellen und Tagesaufgaben.</div>';
    bar.querySelectorAll('[data-pw]').forEach(b => b.onclick = () => {
      const id = b.dataset.pw;
      if (this.g.aiming === id) { this.g.aimPower(null); return; }
      if (this.g.placePow === id) { this.g.cancelPlace(); this.updPowers(); return; }
      bar.classList.add('hidden'); this.g.usePower(id); this.updPowers();
    });
  }
  // Münzen fliegen vom besiegten Gegner zum Zähler (eigenes Geld, gedrosselt)
  coinFly(e) {
    const w = this.w; if (!e.coins || w.enemies.length > 120 || this.g.view.crowd) return;
    if (w.players > 1 && (e.src?.owner ?? w.who) !== w.who) return;
    const now = performance.now(); if (now - (this.flyT || 0) < 110) return; this.flyT = now;
    const p = this.g.view.screenPos(e.x, e.y, 0.5); if (p) flyTo(p[0], p[1], $('hCoins').parentElement, '◈');
  }
  // Combo-Anzeige: wächst mit der Serie, Stufen knallen mit Bonus
  updCombo() {
    const n = this.w.comboN, el = $('combo'), show = n >= BAL.combo.show;
    if (n !== this.last.combo) {
      this.last.combo = n;
      if (show) { el.className = 'on c' + Math.min(4, Math.floor(Math.log2(n / 5 + 1))); el.innerHTML = `<small>COMBO</small><b>×${n}</b>${this.comboBonus ? `<i>+◈${fmt(this.comboBonus)}</i>` : ''}`; if (n % 5 === 0) punch(el, 1.12, 200); }
      else if (el.classList.contains('on')) { el.classList.remove('on'); el.classList.add('off'); this.comboBonus = 0; }
    }
  }
  comboPop(e) {
    this.comboBonus = e.coins; this.last.combo = -1; this.updCombo(); punch($('combo'), 1.45, 420);
    this.g.app.audio.play(e.step >= 2 ? 'tier5' : 'upgrade');
    if (e.step >= 1) this.toast('syn', `🔥 COMBO ×${e.n}!`, `+◈${fmt(e.coins)}${BAL.combo.cdr[e.step] ? ` · Fähigkeiten −${BAL.combo.cdr[e.step]} s` : ''}`);
  }
  updAbilities() {
    const list = [];
    for (const t of this.w.towers) if (this.w.mine(t)) for (const a of this.w.abilityInfo(t)) if (a.ready) list.push({ t, a });
    const key = list.map(x => x.t.id + x.a.slot).join(',');
    const box = $('abilities');
    if (key !== this.last.abKey) {
      this.last.abKey = key;
      box.innerHTML = list.slice(0, 8).map(({ t, a }) => `<button class="ab ${a.slot === 'ult' ? 'ult' : ''}" data-id="${t.id}" data-slot="${a.slot}" title="${esc(a.name)}"><img src="${this.icon(t)}" alt=""><span class="cd"></span><small>${esc(a.name.split(' ')[0])}</small></button>`).join('');
      box.querySelectorAll('.ab').forEach(el => el.onclick = () => {
        const r = this.g.cmd('useAbility', +el.dataset.id, el.dataset.slot);
        if (!r.ok) this.err(r.why); else this.coachEvent('ability');
      });
    }
    box.querySelectorAll('.ab').forEach(el => {
      const t = this.w.tower(+el.dataset.id); if (!t) return;
      const info = this.w.abilityInfo(t).find(a => a.slot === el.dataset.slot); if (!info) return;
      const cd = el.dataset.slot === 'ab' ? t.abCd : t.ultCd, cdr = t.hero ? this.w.heroCdr(t) : 0;
      const p = cd > 0 ? cd / (info.cd * (1 - cdr)) * 100 : 0;
      el.querySelector('.cd').style.setProperty('--p', p + '%'); el.querySelector('.cd').textContent = cd > 0 ? Math.ceil(cd) : '';
      const rdy = cd <= 0; if (rdy && el.dataset.r === '0') ring(el, el.classList.contains('ult') ? '#ffd257' : '#5fe6ff'); el.dataset.r = rdy ? '1' : '0';   // Bereit-Moment: Ring
      el.classList.toggle('ready', rdy);
    });
  }
  icon(t, tiers) {
    return t.hero ? portrait(t.cid, { hlvl: t.hlvl >= 20 ? 20 : t.hlvl >= 15 ? 15 : 1 }) : portrait(t.cid, { stage: t.stage, branch: this.P.chars[t.cid]?.branch, skin: this.g.skinOf(t.cid), tiers: tiers || t.tiers.map(x => Math.min(x, 4)) });
  }

  // ───────── Upgrade-Panel ─────────
  showPanel(t) {
    this.sel = t;
    if (!t) { $('panel').classList.add('hidden'); $('hud').classList.remove('psel'); document.querySelector('.coach')?.classList.remove('hidden'); this.insets(); return; }
    const el = $('panel'), fresh = el.classList.contains('hidden') || this.panelFor !== t; this.panelFor = t;
    el.classList.remove('hidden'); $('hud').classList.add('psel'); document.querySelector('.coach')?.classList.add('hidden');
    // Geister-Tipp verhindern: das Fenster nimmt kurz nach dem Öffnen keine Tipps an (sonst landet der Tipp auf der Kreatur als Upgrade-Kauf)
    if (fresh) { el.classList.add('fresh'); clearTimeout(this.freshT); this.freshT = setTimeout(() => el.classList.remove('fresh'), 450); this.panelFresh = performance.now(); }
    // unten anzeigen – steht die Kreatur selbst unten, rutscht das Fenster nach oben
    const sp = this.g.view.screenPos?.(t.x, t.y, 0), H = appSize()[1];
    const W = appSize()[0], right = !!sp && sp[0] < W * 0.42 && !this.g.app.stage.portrait;   // Kreatur links → Fenster rechts (über dem Shop)
    el.classList.toggle('atright', right); $('hud').classList.toggle('pright', right); void H;
    this.refreshPanel();
    requestAnimationFrame(() => $('hud').style.setProperty('--ph', el.getBoundingClientRect().height + 'px'));
  }
  refreshPanel(soft) {
    const t = this.sel; if (!t || !this.w.towers.includes(t)) return;
    const key = JSON.stringify([t.id, t.stage, t.tiers, t.target, Math.floor(this.w.coins / 5), t.hlvl, Math.floor(t.hxp / 20), this.P.chars[t.cid]?.level, (this.P.chars[t.cid]?.xp || 0) >> 4, t.kills, t.disabledT > 0, Math.floor(t.dmg / 100)]);
    if (soft && key === this.last.panelKey) return; this.last.panelKey = key;
    const w = this.w, s = t.s, el = $('panel');
    const chips = `<span title="Schaden">⚔ <b>${s.dmg.toFixed(s.dmg < 10 ? 1 : 0)}</b></span><span title="Angriffe pro Sekunde">⏱ <b>${s.rate.toFixed(2)}</b></span><span title="Reichweite">◎ <b>${s.range.toFixed(1)}</b></span><span title="Besiegt">☠ <b>${t.kills}</b></span><span title="Gesamtschaden">Σ <b>${fmt(t.dmg)}</b></span>`;
    let body = '', title, sub;
    if (t.hero) {
      const h = HEROES[t.cid], need = BAL.hero.need(t.hlvl);
      title = h.name; sub = h.title;
      const next = h.milestones.find(m => m.lvl > t.hlvl);
      body = `<div class="xpline hero"><b>Held Lv ${t.hlvl}</b><div class="bar hero"><u style="width:${t.hlvl >= 20 ? 100 : t.hxp / need * 100}%"></u></div><small>${t.hlvl >= 20 ? 'MAX' : fmt(t.hxp) + ' / ' + fmt(need)}</small></div>
        <div class="chips">${chips}</div><!--main-->
        ${next ? `<div class="nextm">Nächster Meilenstein · <b>Lv ${next.lvl}: ${esc(next.name)}</b><br><small>${esc(next.desc)}</small></div>` : ''}
        <div class="miles">${h.milestones.map(m => `<div class="${t.hlvl >= m.lvl ? 'on' : ''}"><i>${t.hlvl >= m.lvl ? '✓' : m.lvl}</i><span><b>${esc(m.name)}</b> ${esc(m.desc)}</span></div>`).join('')}</div>
        <small class="mut">${esc(h.name)} steigt durch Schaden und Wellen auf – kein Münzkauf nötig.</small>`;
    } else {
      const def = CREATURES[t.cid], c = this.P.chars[t.cid] || { level: w.levelOf(t.cid), xp: 0, branch: 'spirit' }, need = charNeed(c.level), br = c.branch;
      const form = formAt(t.cid, t.stage, br);
      title = form.name; sub = def.role + ' · ' + def.elements.map(e => `<i style="color:${ELEMENT_COLORS[e]}">●</i> ${ELEMENT_NAMES[e]}`).join(' ');
      const nx = nextFormByLevel(t.cid, c.level, br), ev = w.nextEvo(t);
      let evo = '';
      if (ev) {
        const img = portrait(t.cid, { stage: ev.form.stage, branch: br });
        if (!ev.unlocked) evo = `<div class="evo lock"><img src="${img}" alt=""><div><b>${esc(ev.form.name)}</b><small>Erwachen ab <b>Charakter-Lv ${ev.form.lvl}</b> – sammle XP mit ${esc(def.name)}</small></div><span>🔒</span></div>`;
        else evo = `<button class="evo ${w.coins < ev.form.cost ? 'poor' : ''}" data-evo><img src="${img}" alt=""><div><b>✦ Erwecken: ${esc(ev.form.name)}</b><small>${esc(ev.form.desc)}</small></div><span class="price">◈ ${fmt(ev.form.cost)}</span></button>`;
      }
      const rows = def.paths.map((p, i) => {
        const tier = t.tiers[i], next = p.tiers[tier], chk = canTier(t.tiers, i);
        const pips = [0, 1, 2, 3, 4].map(k => `<i class="${k < tier ? 'on' : ''}"></i>`).join('');
        const cur = tier ? p.tiers[tier - 1].name : 'Basis';
        let right;
        if (!next) right = `<div class="up max"><b>MEISTER</b><small>${esc(p.tiers[4].name)}</small></div>`;
        else {
          const nt = t.tiers.slice(); nt[i]++;
          const img = this.icon(t, nt.map(x => Math.min(x, 4)));
          const poor = w.coins < w.upCost(next.cost);
          right = !chk.ok ? `<div class="up lock"><img src="${img}" alt=""><div><b>${esc(next.name)}</b><small>🔒 ${esc(chk.why)}</small></div></div>`
            : `<button class="up ${poor ? 'poor' : ''}" data-up="${i}"><img src="${img}" alt=""><div><b>${esc(next.name)}</b><small>${esc(next.desc)}</small></div><span class="price">◈ ${fmt(w.upCost(next.cost))}</span></button>`;
        }
        return `<div class="prow2" style="--pc:${PATH_COLORS[i]}"><div class="pl"><b>${p.icon} ${esc(p.name)}</b><div class="pips">${pips}</div><small>${esc(cur)}</small></div>${right}</div>`;
      }).join('');
      // Fusionen: Partner daneben stellen, beide erwecken → verschmelzen
      const ai = w.ascendInfo(t);
      const asc = ai ? (ai.ok ? `<button class="ascend" data-ascend><span class="aseal">⛩</span><div><b>Ahnenform erwecken</b><small>${esc(ai.name)} · Grad ${ai.grade} · verschmilzt ${ai.n} Kreaturen</small></div><span class="price">◈ ${fmt(ai.cost)}</span></button>`
        : `<div class="ascend off"><span class="aseal">⛩</span><div><b>Ahnenform</b><small>${esc(ai.why)} · ${ai.have.map((h, i) => (h ? '✓' : '✗') + ' ' + esc(def.paths[i].name)).join(' · ')}</small></div></div>`) : '';
      if (t.ascended) { title = 'Ahnen-' + def.name; sub = '⛩ Ahnenform · Grad ' + t.ascended; }
      const fus = w.fuseOptions(t).map(o => o.ok
        ? `<button class="fuse" data-fuse="${o.f.id}" style="--fa:${o.def.color}"><img src="${portrait(o.f.id)}" alt=""><div><b>⚭ Fusion: ${esc(o.def.name)}</b><small>mit ${esc(CREATURES[o.other].name)} · ${esc(o.def.role)}</small></div><span class="price">◈ ${fmt(o.cost)}</span></button>`
        : `<div class="fuse off" style="--fa:${o.def.color}"><img src="${portrait(o.f.id)}" alt=""><div><b>⚭ ${esc(o.def.name)}</b><small>${esc(o.why)}</small></div></div>`).join('');
      const auraTxt = s.aura ? `<div class="aura">✿ Aura: ${s.aura.rate ? '+' + Math.round(s.aura.rate * 100) + '% Tempo ' : ''}${s.aura.dmg ? '+' + Math.round(s.aura.dmg * 100) + '% Schaden ' : ''}${s.aura.camo ? '· erkennt Getarnte' : ''}</div>` : '';
      const ab = w.abilityInfo(t).map(a => `<div class="abi ${a.ready ? 'on' : ''}"><b>${a.slot === 'ult' ? '★ ' : ''}${esc(a.name)}</b> <small>${a.ready ? (a.left > 0 ? Math.ceil(a.left) + ' s' : 'bereit') : '🔒 ' + esc(a.need)}</small></div>`).join('');
      body = `<div class="xpline"><b>${esc(def.name)} Lv ${c.level}</b><div class="bar"><u style="width:${c.level >= 50 ? 100 : c.xp / need * 100}%"></u></div><small>${c.level >= 50 ? 'MAX' : fmt(c.xp) + ' / ' + fmt(need) + ' XP'}${nx ? ' · ' + esc(nx.name) + ' bei Lv ' + nx.lvl : ''}</small></div>
        <div class="chips">${chips}${s.camo ? '<span>👁 Erkennung</span>' : ''}${!s.flying ? '<span class="warn">⛔ keine Fliegenden</span>' : ''}${t.disabledT > 0 ? '<span class="warn">🔥 Gestört!</span>' : ''}${t.pack > 1 ? `<span class="pack" title="Rudel-Bonus">🐾 Rudel ${t.pack} · <b>×${s.packMul.toFixed(2)}</b></span>` : ''}${def.fusion ? '<span class="fz">⚭ Fusion</span>' : ''}</div>${auraTxt}<!--main-->
        ${t.ascended ? '' : evo}${asc}${fus ? `<div class="fuses">${fus}</div>` : ''}<div class="prows">${rows}</div>${ab ? `<div class="abis">${ab}</div>` : ''}`;
    }
    const [info, main] = body.split('<!--main-->');
    el.innerHTML = `<div class="pinfo"><div class="ph"><img src="${this.icon(t)}" alt=""><div class="nm"><b>${esc(title)}</b><small>${sub}</small></div><button class="x" data-x>✕</button></div>${info}
      <div class="pact"><div class="tgt"><button data-tg="-1">◀</button><div><small>Ziel</small><b>${TARGET_NAMES[t.target]}</b></div><button data-tg="1">▶</button></div>
      <button class="sell" data-sell>Verkaufen <b>◈ ${fmt(t.spent * BAL.run.sellRefund)}</b></button></div></div><div class="pmain">${main || ''}</div>`;
    const foreign = !w.mine(t); el.classList.toggle('foreign', foreign);   // Koop: Kreatur des Mitspielers nur ansehen
    if (foreign) el.querySelector('.pinfo')?.insertAdjacentHTML('afterbegin', '<div class="own2">🤝 Kreatur deines Mitspielers – nur ansehen</div>');
    const guard = fn => e => { if (performance.now() - (this.panelFresh || 0) < 450) return; fn(e); };
    el.querySelector('[data-x]').onclick = () => this.g.select(null);
    el.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => { const i = TARGETS.indexOf(t.target), n = TARGETS.length; this.g.cmd('setTarget', t.id, TARGETS[(i + +b.dataset.tg + n) % n]); this.g.app.audio.play('click'); this.refreshPanel(); });
    el.querySelector('[data-sell]').onclick = guard(() => this.confirm('Verkaufen?', `Du bekommst ◈${fmt(t.spent * BAL.run.sellRefund)} zurück. Die Charakter-XP bleiben erhalten.`, 'Verkaufen', () => { this.g.cmd('sell', t.id); this.g.select(null); }));
    el.querySelectorAll('[data-up]').forEach(b => b.onclick = guard(() => { const r = this.g.cmd('upgrade', t.id, +b.dataset.up); if (!r.ok) this.err(r.why); else this.coachEvent('upgrade'); this.refreshPanel(); }));
    el.querySelector('[data-ascend]')?.addEventListener('click', guard(() => { const r = this.g.cmd('ascend', t.id); if (!r.ok) this.err(r.why); else if (r.tower) this.g.select(r.tower); }));
    el.querySelectorAll('[data-fuse]').forEach(b => b.onclick = guard(() => { const r = this.g.cmd('fuse', t.id, b.dataset.fuse); if (!r.ok) this.err(r.why); else if (r.tower) { this.g.select(r.tower); this.toast('evo', '⚭ Fusion gelungen!', CREATURES[r.tower.cid].name + ' ist erwacht'); } }));
    const ev = el.querySelector('[data-evo]'); if (ev) ev.onclick = guard(() => { const r = this.g.cmd('evolve', t.id); if (!r.ok) this.err(r.why); this.refreshPanel(); });
  }

  // ───────── Ereignisse ─────────
  handle(e) {
    switch (e.t) {
      case 'wave': {
        const def = e.def, kinds = [...new Set(def.groups.map(g => g.e))].filter(k => ENEMIES[k]);
        const fresh = kinds.filter(k => !this.P.seen.tips['e_' + k]);
        fresh.forEach(k => this.P.seen.tips['e_' + k] = 1);
        let tip = def.tip || (fresh.length && this.w.wave > 1 ? 'Neu: ' + fresh.map(k => `<b>${ENEMIES[k].name}</b> – ${ENEMIES[k].desc}`).join('<br>') : '');
        if (def.mods?.length) tip = (tip ? tip + '<br>' : '') + def.mods.map(m => MOD_NAMES[m]).join(' · ');
        if (tip) this.tip(tip, 5);
        if (!def.boss) this.banner('WELLE ' + e.wave, def.mods?.length ? def.mods.map(m => MOD_NAMES[m]).join(' ') : '');
        this.coachEvent('wave');
        break;
      }
      case 'bossWarn': this.banner('⚠ BOSS ⚠', BOSSES[e.boss]?.warn || 'Vharox erwacht', 'boss'); this.g.app.stage.addShake(0.5); break;
      case 'bossPhase': this.banner(e.name.toUpperCase(), e.desc, 'boss'); break;
      case 'bossDie': this.banner('BOSS BESIEGT!', (e.e?.def?.name || 'Vharox').split(',')[0] + ({ wolf: ' zerfällt zu Schnee', owl: ' verweht im Sturm' }[e.e?.def?.model] || ' fällt in die Tiefe'), 'evo'); break;
      case 'waveEnd': for (let i = 0; i < 5; i++) setTimeout(() => flyTo(innerWidth * (0.4 + Math.random() * 0.2), innerHeight * 0.45, $('hCoins').parentElement, '◈'), i * 70); this.toast('syn', `Welle ${e.wave} geschafft · +◈${fmt(e.bonus + e.income)}`, e.income ? `Wellenbonus ${fmt(e.bonus)} · Einkommen ${fmt(e.income)}` : ''); break;
      case 'synergy': this.toast('syn', '✦ Synergie: ' + e.sy.name, e.sy.desc); break;
      case 'say': this.bubble(e.tower, e.text); break;
      case 'heroLevel': if (e.milestone) this.toast('char', `${HEROES[e.tower.cid].name} Lv ${e.lvl}: ${e.milestone.name}`, e.milestone.desc); if (this.sel === e.tower) this.refreshPanel(); break;
      case 'evolve': if (this.sel === e.tower) this.refreshPanel(); this.coachEvent('evolve'); break;
      case 'leak': { const v = $('vig'); v.getAnimations?.().forEach(a => a.cancel()); v.animate?.([{ opacity: e.e.boss ? 1 : 0.75 }, { opacity: 0 }], { duration: e.e.boss ? 900 : 550, easing: 'ease-out' }); shake($('hLives').parentElement, e.e.boss ? 9 : 5); break; }   // roter Rand + Herz wackelt
      case 'kill': this.coinFly(e); break;
      case 'combo': this.comboPop(e); break;
      case 'gust': this.banner('🌬 WINDBÖE', 'Bodengegner auf Brücken werden zurückgedrückt · Fliegende schneller', 'boss'); break;
      case 'upgrade': if (e.tier === 5) this.t5Splash(e); break;
      case 'ascend': this.ascendSplash(e); break;
      case 'storm': if (e.on) this.banner('❄ SCHNEESTURM ❄', 'Gegner langsamer · Eiskreaturen schneller · andere frieren', 'boss'); else this.toast('syn', 'Der Sturm legt sich', ''); break;
      case 'power': { const pw = POWERS.find(x => x.id === e.id); this.flash(e.id === 'bomb' ? 0.45 : 0.3, pw?.color || '#fff'); if (pw) this.banner(pw.icon + ' ' + pw.name.toUpperCase(), e.id === 'gold' ? '+◈' + e.coins : e.id === 'heal' ? '+' + e.lives + ' Leben' : '', 'evo'); this.updPowers(); break; }
      case 'rebirth': this.flash(0.5, '#ffb43a'); this.banner('WIEDERGEBURT', 'Der Phönix schenkt dir ' + e.lives + ' Leben', 'evo'); break;
      case 'early': this.toast('syn', `+◈${e.coins} früh gerufen`, ''); break;
    }
  }
  ascendSplash(e) {
    const d = document.createElement('div'); d.className = 't5 asc'; d.style.setProperty('--pc', '#ffd257');
    d.innerHTML = `<div class="t5rays"></div><img src="${this.icon(e.tower)}" alt=""><div class="t5txt"><small>⛩ AHNENFORM · GRAD ${e.grade}</small><b>${esc(e.name)}</b><span>Alle drei Stufe-5-Kräfte vereint · neue Ultimate „Ahnenzorn“</span></div>`;
    document.getElementById('hud').appendChild(d); setTimeout(() => d.remove(), 3400);
  }
  // Stufe-5-Kauf: Vollbild-Einblendung mit neuem Aussehen, Name und Pfadfarbe
  t5Splash(e) {
    const t = e.tower, def = CREATURES[t.cid], p = def.paths[e.path], col = ['#ff7a3d', '#5fd6ff', '#c39bff'][e.path];
    const d = document.createElement('div'); d.className = 't5'; d.style.setProperty('--pc', col);
    d.innerHTML = `<div class="t5rays"></div><img src="${this.icon(t)}" alt=""><div class="t5txt"><small>${esc(p.icon)} ${esc(p.name)} · STUFE 5</small><b>${esc(p.tiers[4].name)}</b><span>${esc(p.tiers[4].desc)}</span></div>`;
    document.getElementById('hud').appendChild(d); setTimeout(() => d.remove(), 2600);
  }
  banner(text, sub = '', cls = '') { $('banner').innerHTML = `<div class="b ${cls}">${esc(text)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>`; }
  toast(cls, title, text) {
    const d = document.createElement('div'); d.className = 'toast ' + cls; d.innerHTML = `<b>${esc(title)}</b>${esc(text || '')}`;
    $('toasts').appendChild(d); while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
    setTimeout(() => d.remove(), 3900);
  }
  tip(html, sec = 4) { const el = $('tip'); el.innerHTML = html; el.classList.remove('hidden'); clearTimeout(this.tipT); this.tipT = setTimeout(() => el.classList.add('hidden'), sec * 1000); }
  hint(html) { if (!html) { if (this.hintOn) { $('tip').classList.add('hidden'); this.hintOn = false; } return; } this.hintOn = true; clearTimeout(this.tipT); const el = $('tip'); el.innerHTML = html; el.classList.remove('hidden'); }
  err(why) { if (!why) return; this.g.app.audio.play('error'); this.tip('⚠ ' + esc(why), 1.6); }
  flash(a = 0.5, color = '#fff') { const f = $('flash'); f.style.background = color; f.style.transition = 'none'; f.style.opacity = a; void f.offsetWidth; f.style.transition = 'opacity .5s'; f.style.opacity = 0; }
  bubble(t, text) {
    const d = document.createElement('div'); d.className = 'bubble'; d.textContent = text; d.dataset.tid = t.id; $('bubbles').appendChild(d);
    setTimeout(() => d.remove(), 2800); this.updBubbles();
  }
  updBubbles() {
    for (const d of $('bubbles').children) { const t = this.w.tower(+d.dataset.tid); if (!t) { d.remove(); continue; } const [x, y] = this.g.view.screenPos(t.x, t.y, 1.4); d.style.left = x + 'px'; d.style.top = y + 'px'; }
  }
  rockPrompt(c) { this.confirm('Felsbrocken räumen?', `Kostet ◈${BAL.run.rockClear}. Danach ist hier Platz für eine Kreatur.`, 'Räumen', () => { const r = this.g.cmd('clearRock', c.x, c.y); if (!r.ok) this.err(r.why); }); }
  confirm(title, text, ok, fn) {
    const m = $('modal'); m.classList.remove('hidden');
    m.innerHTML = `<div class="mbox"><h3>${esc(title)}</h3><p>${esc(text)}</p><button class="btn pri" data-ok>${esc(ok)}</button><button class="btn" data-no>Abbrechen</button></div>`;
    m.querySelector('[data-ok]').onclick = () => { m.classList.add('hidden'); fn(); };
    m.querySelector('[data-no]').onclick = () => m.classList.add('hidden');
  }
  pause() {
    const g = this.g; g.paused = true; const m = $('modal'); m.classList.remove('hidden'); const co = g.net && !g.net.gone;
    m.innerHTML = `<div class="mbox"><h3>Pause</h3><p>${esc(this.w.map.name)} · ${esc(this.w.diff.name)} · Welle ${this.w.wave}</p>
      <button class="btn pri" data-r>▶ Weiter</button><button class="btn" data-s>⚙ Optionen</button><button class="btn danger" data-q>Aufgeben</button>
      <p style="font-size:12px">${co ? (g.net.host ? '🤝 Koop: dein Mitspieler wartet, solange du pausierst.' : '🤝 Koop: das Spiel läuft beim Gastgeber weiter.') + ' Aufgeben beendet den Koop.' : 'Charakter- und Konto-XP sind bereits gespeichert.'}</p></div>`;
    m.querySelector('[data-r]').onclick = () => { m.classList.add('hidden'); g.paused = false; };
    m.querySelector('[data-s]').onclick = () => { m.classList.add('hidden'); g.app.menus.settingsModal(() => this.pause()); };
    m.querySelector('[data-q]').onclick = () => { m.classList.add('hidden'); g.paused = false; if (g.net) { g.net.close(); g.net = null; } this.w.lives = 0; this.w.over = true; this.w.won = false; };
  }

  // ───────── Tutorial (erster Run) ─────────
  coach() {
    document.querySelector('.coach')?.remove();
    const steps = [
      'Willkommen im <b>Ahnenhain</b>! Zieh die <b>Kitsune</b> aus dem Shop auf die Karte (oder antippen, dann auf die Karte tippen).',
      'Grüner Kreis = guter Platz, rot = geht nicht. Die helle <b>Anhöhe</b> gibt mehr Reichweite. Loslassen zum Platzieren!',
      'Stark! Tippe auf <b>▶</b>, um die erste Welle zu starten. Nochmal tippen = schneller.',
      'Besiegte Gegner geben <b style="color:#c08a00">◈ Münzen</b> (nur für diesen Run). Tippe deine Kitsune an und kaufe ein <b>Upgrade</b>.',
      'Jede Kreatur sammelt <b style="color:#0aa">Charakter-XP</b> – dauerhaft! Mit Level 5 erweckst du sie im Kampf zur <b>Flammen-Kitsune</b>.',
    ];
    if (this.coachStep < 0 || this.coachStep >= steps.length) return;
    const d = document.createElement('div'); d.className = 'coach'; d.innerHTML = steps[this.coachStep]; document.body.appendChild(d);
    if (this.coachStep === 3) { const s = this.coachStep; setTimeout(() => { if (this.coachStep === s) { this.coachStep++; this.coach(); } }, 14000); }
    if (this.coachStep === 4) setTimeout(() => { if (this.coachStep === 4) { this.coachStep = -1; this.P.seen.intro = true; d.remove(); } }, 7000);
  }
  coachEvent(ev) {
    if (this.coachStep < 0) return;
    const map = { pick: 0, placed: 1, wave: 2, upgrade: 3 };
    if (map[ev] === this.coachStep) { this.coachStep++; this.coach(); }
    else if (ev === 'wave' && this.coachStep < 3) { this.coachStep = 3; this.coach(); }
    else if (ev === 'placed' && this.coachStep === 0) { this.coachStep = 2; this.coach(); }
  }
}
