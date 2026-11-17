// HUD während eines Runs (DOM). Getrennte Darstellung: RUN (Gold) · CHARAKTER (Cyan) · KONTO (Violett).
import { BAL } from '../config.js';
import { CREATURES, PATH_COLORS } from '../data/creatures.js';
import { HEROES } from '../data/heroes.js';
import { MOD_NAMES, waveDef } from '../data/waves.js';
import { ENEMIES } from '../data/enemies.js';
import { TARGETS, TARGET_NAMES } from '../sim/world.js';
import { canTier } from '../sim/stats.js';
import { charNeed, accNeed, nextFormByLevel, formAt } from '../meta/progression.js';
import { portrait } from '../render/icons.js';

const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString('de-DE');
const esc = s => String(s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

export class Hud {
  constructor(game) {
    this.g = game; this.w = game.world; this.P = game.P;
    $('hud').classList.remove('hidden'); $('menu').innerHTML = '';
    $('panel').classList.add('hidden'); $('bossBar').classList.add('hidden'); $('toasts').innerHTML = ''; $('banner').innerHTML = ''; $('bubbles').innerHTML = '';
    this.last = {}; this.abT = 0;
    $('bPause').onclick = () => this.pause();
    $('bSpeed').onclick = () => this.cycleSpeed();
    $('bWave').onclick = () => this.waveBtn();
    this.buildTray(); this.updAcc(); this.setSpeedLabel();
    this.coachStep = this.P.seen.intro ? -1 : 0; this.coach();
    this.resizeObs = () => this.insets(); addEventListener('resize', this.resizeObs); setTimeout(() => this.insets(), 0);
  }
  insets() {
    const land = innerWidth > innerHeight && innerHeight < 520;
    const top = $('hud').querySelector('.top').getBoundingClientRect().bottom + 4;
    const tr = $('tray'); if (!tr.classList.contains('hidden') && !land) this.trayH = innerHeight - tr.getBoundingClientRect().top;
    const bottom = land ? 8 : (this.trayH || 100) + 4;
    this.g.app.stage.setInsets(top, bottom);
  }
  destroy() { $('hud').classList.add('hidden'); removeEventListener('resize', this.resizeObs); document.querySelector('.coach')?.remove(); $('bubbles').innerHTML = ''; }

  // ───────── Leiste ─────────
  buildTray() {
    const g = this.g, ids = [...g.loadout]; if (g.heroId) ids.push(g.heroId);
    this.trayIds = ids;
    $('tray').innerHTML = ids.map((id, i) => {
      const hero = id === g.heroId, cost = this.w.costOf(id), c = this.P.chars[id];
      const img = portrait(id, { stage: 0, branch: c?.branch, skin: g.skinOf(id), hlvl: 1 });
      const lv = hero ? `★${this.P.heroes[id]?.rank || 1}` : `Lv ${c.level}`;
      return `<button class="card ${hero ? 'hero' : ''} ${g.placing === id ? 'sel' : ''}" data-id="${id}" title="${hero ? HEROES[id].name : CREATURES[id].name} (${i + 1})"><span class="lv">${lv}</span><img src="${img}" alt=""><div class="cost">◈${fmt(cost)}</div></button>`;
    }).join('');
    $('tray').querySelectorAll('.card').forEach(b => b.onclick = () => { this.g.app.audio.init(); g.startPlace(b.dataset.id); });
    this.last.trayCoins = -1;
  }
  updTray() {
    const coins = this.w.coins; if (coins === this.last.trayCoins) return; this.last.trayCoins = coins;
    $('tray').querySelectorAll('.card').forEach(b => {
      const id = b.dataset.id; b.classList.toggle('poor', coins < this.w.costOf(id));
      b.classList.toggle('used', id === this.g.heroId && this.w.towers.some(t => t.hero));
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
    if (coins !== this.last.coins) { $('hCoins').textContent = fmt(coins); if (coins > (this.last.coins ?? 0)) { const p = $('hCoins').parentElement; p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); } this.last.coins = coins; }
    if (w.lives !== this.last.lives) { $('hLives').textContent = w.lives; if (w.lives < (this.last.lives ?? 1e9)) { const p = $('hLives').parentElement; p.classList.remove('hurt'); void p.offsetWidth; p.classList.add('hurt'); } this.last.lives = w.lives; }
    const wl = w.wave + '/' + (w.maxWave === Infinity ? '∞' : w.maxWave); if (wl !== this.last.wave) { $('hWave').textContent = wl; this.last.wave = wl; }
    this.updTray(); this.updAcc();
    // Wellen-Knopf
    const b = $('bWave'), can = w.canStartWave();
    const label = !can ? '' : w.waveRunning() ? `⏩ Früh rufen +${BAL.run.earlyCall(w.wave)}` : `▶ Welle ${w.wave + 1}`;
    if (label !== this.last.wbtn) { b.textContent = label; b.classList.toggle('off', !can); b.classList.toggle('early', can && w.waveRunning()); this.last.wbtn = label; }
    // Boss
    if (w.boss) {
      $('bossBar').classList.remove('hidden');
      $('bossFill').style.width = Math.max(0, w.boss.hp / w.boss.maxHp * 100) + '%';
      const ph = w.boss.def.phases[w.boss.phase]; $('bossPhase').textContent = `Phase ${w.boss.phase + 1}: ${ph.name}`; $('bossName').textContent = w.boss.def.name;
    } else $('bossBar').classList.add('hidden');
    // Fähigkeiten
    this.abT -= dt; if (this.abT <= 0) { this.abT = 0.1; this.updAbilities(); }
    if (this.sel !== this.g.sel) this.showPanel(this.g.sel);
    if (this.g.sel) { this.panelT = (this.panelT || 0) - dt; if (this.panelT <= 0) { this.panelT = 0.25; this.refreshPanel(true); } }
    this.updBubbles();
  }
  updAbilities() {
    const list = [];
    for (const t of this.w.towers) for (const a of this.w.abilityInfo(t)) if (a.ready) list.push({ t, a });
    const key = list.map(x => x.t.id + x.a.slot).join(',');
    const box = $('abilities');
    if (key !== this.last.abKey) {
      this.last.abKey = key;
      box.innerHTML = list.slice(0, 7).map(({ t, a }) => `<button class="ab ${a.slot === 'ult' ? 'ult' : ''}" data-id="${t.id}" data-slot="${a.slot}" title="${esc(a.name)}"><img src="${this.icon(t)}" alt=""><span class="cd"></span><small>${esc(a.name.split(' ')[0])}</small></button>`).join('');
      box.querySelectorAll('.ab').forEach(el => el.onclick = () => {
        const r = this.w.useAbility(+el.dataset.id, el.dataset.slot);
        if (!r.ok) this.err(r.why); else this.g.hud.coachEvent('ability');
      });
    }
    box.querySelectorAll('.ab').forEach(el => {
      const t = this.w.tower(+el.dataset.id); if (!t) return;
      const info = this.w.abilityInfo(t).find(a => a.slot === el.dataset.slot); if (!info) return;
      const cd = el.dataset.slot === 'ab' ? t.abCd : t.ultCd, cdr = t.hero ? this.w.heroCdr(t) : 0;
      const p = cd > 0 ? cd / (info.cd * (1 - cdr)) * 100 : 0;
      el.querySelector('.cd').style.setProperty('--p', p + '%'); el.querySelector('.cd').textContent = cd > 0 ? Math.ceil(cd) : '';
      el.classList.toggle('ready', cd <= 0);
    });
  }
  icon(t) {
    return t.hero ? portrait(t.cid, { hlvl: t.hlvl >= 20 ? 20 : t.hlvl >= 15 ? 15 : 1 }) : portrait(t.cid, { stage: t.stage, branch: this.P.chars[t.cid].branch, skin: this.g.skinOf(t.cid) });
  }

  // ───────── Turm-Panel ─────────
  showPanel(t) {
    this.sel = t;
    if (!t) { $('panel').classList.add('hidden'); $('tray').classList.remove('hidden'); $('bWave').style.visibility = ''; this.insets(); return; }
    $('panel').classList.remove('hidden'); if (innerWidth <= innerHeight || innerHeight >= 520) { $('tray').classList.add('hidden'); }
    this.refreshPanel();
  }
  refreshPanel(soft) {
    const t = this.sel; if (!t || !this.w.towers.includes(t)) return;
    const key = JSON.stringify([t.id, t.stage, t.tiers, t.target, Math.floor(this.w.coins / 10), t.hlvl, Math.floor(t.hxp / 20), this.P.chars[t.cid]?.level, this.P.chars[t.cid]?.xp >> 4, t.kills, t.disabledT > 0]);
    if (soft && key === this.last.panelKey) return; this.last.panelKey = key;
    const w = this.w, s = t.s, el = $('panel');
    const dpsTxt = `<span>⚔ <b>${s.dmg.toFixed(s.dmg < 10 ? 1 : 0)}</b></span><span>⏱ <b>${s.rate.toFixed(2)}/s</b></span><span>◎ <b>${s.range.toFixed(1)}</b></span><span>☠ <b>${t.kills}</b></span><span>Σ <b>${fmt(t.dmg)}</b></span>`;
    let body = '';
    if (t.hero) {
      const h = HEROES[t.cid], need = BAL.hero.need(t.hlvl);
      body = `<div class="charline" style="background:rgba(255,155,61,.08);border-color:rgba(255,155,61,.35)"><b style="color:#ff9b3d">Held Lv ${t.hlvl}</b><div class="bar hero"><u style="width:${t.hlvl >= 20 ? 100 : t.hxp / need * 100}%"></u></div><small>${t.hlvl >= 20 ? 'MAX' : fmt(t.hxp) + '/' + fmt(need)}</small></div>
        <div class="stats">${dpsTxt}</div>
        <div class="milestones">${h.milestones.map(m => `<div class="${t.hlvl >= m.lvl ? 'on' : ''}">${t.hlvl >= m.lvl ? '✓' : '·'} Lv ${m.lvl} – <b>${m.name}</b>: ${m.desc}</div>`).join('')}</div>`;
    } else {
      const def = CREATURES[t.cid], c = this.P.chars[t.cid], need = charNeed(c.level);
      const nx = nextFormByLevel(t.cid, c.level, c.branch);
      const ev = w.nextEvo(t);
      let evo = '';
      if (ev) {
        if (!ev.unlocked) evo = `<button class="evo lock" disabled><span>🔒 ${esc(ev.form.name)}</span><span>ab Charakter-Lv ${ev.form.lvl}</span></button>`;
        else evo = `<button class="evo ${w.coins < ev.form.cost ? 'poor' : ''}" data-evo><span>✦ Erwecken: ${esc(ev.form.name)}</span><span>◈${fmt(ev.form.cost)}</span></button>`;
      }
      const paths = def.paths.map((p, i) => {
        const tier = t.tiers[i], next = p.tiers[tier], chk = canTier(t.tiers, i);
        const pips = [0, 1, 2, 3, 4].map(k => `<i class="${k < tier ? 'on' : ''}"></i>`).join('');
        const btn = !next ? `<button disabled>MAX</button>` : !chk.ok ? `<button disabled>🔒 ${esc(chk.why)}</button>` : `<button data-up="${i}" class="${w.coins < next.cost ? 'poor' : ''}">◈${fmt(next.cost)}</button>`;
        return `<div class="path" style="--pc:${PATH_COLORS[i]}"><div class="pn">${p.icon} ${esc(p.name)}</div><div class="pips">${pips}</div><div class="tn">${next ? esc(next.name) : '— Meister —'}</div><div class="td">${next ? esc(next.desc) : esc(p.tiers[4].name)}</div>${btn}</div>`;
      }).join('');
      const auraTxt = s.aura ? `<div class="aura">✿ Aura: ${s.aura.rate ? '+' + Math.round(s.aura.rate * 100) + '% Tempo ' : ''}${s.aura.dmg ? '+' + Math.round(s.aura.dmg * 100) + '% Schaden ' : ''}${s.aura.camo ? '· erkennt Getarnte' : ''}</div>` : '';
      body = `<div class="charline"><b>${esc(def.name)} Lv ${c.level}</b><div class="bar"><u style="width:${c.level >= 50 ? 100 : c.xp / need * 100}%"></u></div><small>${c.level >= 50 ? 'MAX' : fmt(c.xp) + '/' + fmt(need) + ' XP'}${nx ? ' · nächste Form Lv ' + nx.lvl : ''}</small></div>
        <div class="stats">${dpsTxt}${s.camo ? '<span>👁 Erkennung</span>' : ''}${!s.flying ? '<span>⛔ trifft keine Fliegenden</span>' : ''}${t.disabledT > 0 ? '<span style="color:#ff7a5a">🔥 Gestört!</span>' : ''}</div>${auraTxt}${evo}<div class="paths">${paths}</div>`;
    }
    const formName = t.hero ? HEROES[t.cid].title : formAt(t.cid, t.stage, this.P.chars[t.cid].branch)?.name;
    el.innerHTML = `<div class="ph"><img src="${this.icon(t)}" alt=""><div class="nm"><b>${esc(t.hero ? HEROES[t.cid].name : formName)}</b><small>${t.hero ? 'Held' : esc(CREATURES[t.cid].role)}</small></div><button data-tg>🎯 ${TARGET_NAMES[t.target]}</button><button data-x>✕</button></div>${body}
      <div class="prow"><button class="sell" data-sell>Verkaufen ◈${fmt(t.spent * BAL.run.sellRefund)}</button></div>`;
    el.querySelector('[data-x]').onclick = () => this.g.select(null);
    el.querySelector('[data-tg]').onclick = () => { const i = TARGETS.indexOf(t.target); w.setTarget(t.id, TARGETS[(i + 1) % TARGETS.length]); this.g.app.audio.play('click'); this.refreshPanel(); };
    el.querySelector('[data-sell]').onclick = () => this.confirm('Verkaufen?', `Du bekommst ◈${fmt(t.spent * BAL.run.sellRefund)} zurück. Die Charakter-XP bleiben erhalten.`, 'Verkaufen', () => { w.sell(t.id); this.g.select(null); });
    el.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { const r = w.upgrade(t.id, +b.dataset.up); if (!r.ok) this.err(r.why); else this.coachEvent('upgrade'); this.refreshPanel(); });
    const ev = el.querySelector('[data-evo]'); if (ev) ev.onclick = () => { const r = w.evolve(t.id); if (!r.ok) this.err(r.why); this.refreshPanel(); };
    this.insets();
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
      case 'bossWarn': this.banner('⚠ BOSS ⚠', 'Vharox, der Abgrunddrache erwacht', 'boss'); this.g.app.stage.addShake(0.5); break;
      case 'bossPhase': this.banner(e.name.toUpperCase(), e.desc, 'boss'); break;
      case 'bossDie': this.banner('BOSS BESIEGT!', 'Vharox fällt in die Tiefe', 'evo'); break;
      case 'waveEnd': if (e.income) this.toast('syn', `+◈${fmt(e.bonus + e.income)}`, `Wellenbonus ${fmt(e.bonus)} · Einkommen ${fmt(e.income)}`); break;
      case 'synergy': this.toast('syn', '✦ Synergie: ' + e.sy.name, e.sy.desc); break;
      case 'say': this.bubble(e.tower, e.text); break;
      case 'heroLevel': if (e.milestone) this.toast('char', `Kairo Lv ${e.lvl}: ${e.milestone.name}`, e.milestone.desc); if (this.sel === e.tower) this.refreshPanel(); break;
      case 'evolve': if (this.sel === e.tower) this.refreshPanel(); this.coachEvent('evolve'); break;
      case 'leak': this.flash(0.15, '#ff2040'); break;
      case 'early': this.toast('syn', `+◈${e.coins} früh gerufen`, ''); break;
    }
  }
  banner(text, sub = '', cls = '') { $('banner').innerHTML = `<div class="b ${cls}">${esc(text)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>`; }
  toast(cls, title, text) {
    const d = document.createElement('div'); d.className = 'toast ' + cls; d.innerHTML = `<b>${esc(title)}</b>${esc(text || '')}`;
    $('toasts').appendChild(d); while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
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
    for (const d of $('bubbles').children) { const t = this.w.tower(+d.dataset.tid); if (!t) { d.remove(); continue; } const [x, y] = this.g.view.screenPos(t.x, t.y, 1.3); d.style.left = x + 'px'; d.style.top = y + 'px'; }
  }
  rockPrompt(c) { this.confirm('Felsbrocken räumen?', `Kostet ◈${BAL.run.rockClear}. Danach kannst du hier eine Kreatur platzieren.`, 'Räumen', () => { const r = this.w.clearRock(c.x, c.y); if (!r.ok) this.err(r.why); }); }
  confirm(title, text, ok, fn) {
    const m = $('modal'); m.classList.remove('hidden');
    m.innerHTML = `<div class="mbox"><h3>${esc(title)}</h3><p>${esc(text)}</p><button class="btn pri" data-ok>${esc(ok)}</button><button class="btn" data-no>Abbrechen</button></div>`;
    m.querySelector('[data-ok]').onclick = () => { m.classList.add('hidden'); fn(); };
    m.querySelector('[data-no]').onclick = () => m.classList.add('hidden');
  }
  waveBtn() { this.g.app.audio.init(); if (this.w.startWave().ok) this.g.app.audio.play('click'); }
  cycleSpeed() { this.g.speed = this.g.speed >= 3 ? 1 : this.g.speed + 1; this.setSpeedLabel(); this.g.app.audio.play('click'); }
  setSpeedLabel() { $('bSpeed').textContent = this.g.speed + '×'; }
  pause() {
    const g = this.g; g.paused = true; const m = $('modal'); m.classList.remove('hidden');
    m.innerHTML = `<div class="mbox"><h3>Pause</h3><p>${esc(this.w.map.name)} · ${esc(this.w.diff.name)} · Welle ${this.w.wave}</p>
      <button class="btn pri" data-r>Weiter</button><button class="btn" data-s>Einstellungen</button><button class="btn danger" data-q>Aufgeben</button>
      <p style="font-size:12px">Charakter- und Konto-XP sind bereits gespeichert.</p></div>`;
    m.querySelector('[data-r]').onclick = () => { m.classList.add('hidden'); g.paused = false; };
    m.querySelector('[data-s]').onclick = () => { m.classList.add('hidden'); g.app.menus.settingsModal(() => this.pause()); };
    m.querySelector('[data-q]').onclick = () => { m.classList.add('hidden'); g.paused = false; this.w.lives = 0; this.w.over = true; this.w.won = false; };
  }

  // ───────── Tutorial (erster Run) ─────────
  coach() {
    document.querySelector('.coach')?.remove();
    const steps = [
      'Willkommen im <b>Ahnenhain</b>! Tippe unten die <b>Kitsune</b> an.',
      'Tippe ein <b>grünes Feld neben dem Pfad</b>, dann <b>nochmal</b> zum Platzieren. Die Anhöhe (hell) gibt mehr Reichweite!',
      'Stark! Starte jetzt die erste <b>Welle</b> (Knopf rechts).',
      'Besiegte Gegner geben <b style="color:#c08a00">◈ Münzen</b> (nur für diesen Run). Tippe deine Kitsune an, um sie zu <b>verbessern</b>.',
      'Jede Kreatur sammelt <b style="color:#0aa">Charakter-XP</b> – dauerhaft! Mit Level 5 kannst du sie im Kampf zur <b>Flammen-Kitsune</b> erwecken.',
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
  }
}
export { waveDef };
