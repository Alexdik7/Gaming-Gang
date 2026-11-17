// Menü-Bildschirme (DOM). Alle Inhalte kommen aus den Daten-Dateien.
import { BAL, VERSION, LEVEL_PERKS } from '../config.js';
import { CREATURES, PATH_COLORS } from '../data/creatures.js';
import { HEROES } from '../data/heroes.js';
import { MAPS } from '../data/maps.js';
import { ELEMENT_NAMES } from '../data/enemies.js';
import { ACCOUNT_REWARDS, ACHIEVEMENTS, FRAMES, TITLES, SYNERGIES } from '../data/meta.js';
import { charNeed, accNeed, formsFor, maxStage, perkList, unlocked, unlockLevel, unlockedCreatures, achValue, hasBranch, MASTERY_REWARDS, nextFormByLevel } from '../meta/progression.js';
import { baseStats, dps } from '../sim/stats.js';
import { portrait, Preview, mapThumb } from '../render/icons.js';
import { ELEMENT_COLORS } from '../data/enemies.js';
import { saveProfile, resetProfile } from '../meta/profile.js';

const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString('de-DE');
const esc = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const stars = n => '★'.repeat(n) + `<i>${'★'.repeat(5 - n)}</i>`;

export class Menus {
  constructor(app) { this.app = app; this.preview = null; }
  get P() { return this.app.profile; }
  click() { this.app.audio.init(); this.app.audio.play('click'); }
  closePreview() { if (this.preview) { this.preview.dispose(); this.preview = null; } }
  render(html, after) {
    this.closePreview();
    const m = $('menu'); m.innerHTML = html; m.scrollTop = 0; m.classList.toggle('dim', !html.includes('class="title"'));
    m.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { this.click(); this.show(b.dataset.go); });
    after?.(m);
  }
  show(name, arg) { this.app.showMenuScene(name === 'home'); this['s_' + name](arg); }
  hdr(title) { return `<div class="hdr"><button class="back" data-go="home">‹ Zurück</button><h2>${title}</h2></div>`; }

  // ───────── Titel ─────────
  s_home() {
    const P = this.P, a = P.account, need = accNeed(a.level);
    const newAch = ACHIEVEMENTS.some(x => !P.ach[x.id] && achValue(P, x) >= x.goal);
    const frame = FRAMES[a.frame] || FRAMES.none, k = P.chars.kitsune;
    this.render(`
      <div class="homeL title"><h1>BEAST<span>FORGE</span></h1><p>SHINOBI CREATURE DEFENSE</p></div>
      <div class="homeR">
        <button class="profile" data-go="account"><div class="fr" style="--fc:${frame}"><img src="${portrait('kitsune', { stage: maxStage('kitsune', k.level, k.branch), branch: k.branch })}" alt=""></div>
          <div class="pi"><b>Konto-Level ${a.level}</b> · ${esc(TITLES[a.title] || TITLES.none)}<div class="bar acc" style="margin-top:4px"><u style="width:${a.xp / need * 100}%"></u></div><small>${fmt(a.xp)} / ${fmt(need)} Konto-XP</small></div></button>
        <button class="big" data-go="play">▶ SPIELEN</button>
        <div class="tiles">
          <button class="tile" data-go="collection"><span>🦊</span>Sammlung</button>
          <button class="tile" data-go="hero"><span>🥷</span>Held</button>
          <button class="tile" data-go="account"><span>🏯</span>Konto</button>
          <button class="tile" data-go="ach"><span>🏆</span>Erfolge${newAch ? '<i class="dot"></i>' : ''}</button>
          <button class="tile" data-go="stats"><span>📜</span>Statistik</button>
          <button class="tile" data-go="settings"><span>⚙</span>Optionen</button>
        </div>
      </div>`);
    this.app.audio.playSong('menu');
  }

  // ───────── Spielen: Karte → Modus ─────────
  s_play() {
    const P = this.P;
    const cards = Object.values(MAPS).map(m => { const b = P.maps[m.id] || {}; return `<button class="mcard" data-map="${m.id}"><span class="tag">${esc(m.level)}</span><img data-thumb="${m.id}" alt=""><div class="mi"><b>${esc(m.name)}</b><small>${esc(m.sub)}</small>
      <div class="medals"><span class="${b.normal >= 20 ? 'on' : ''}">${b.normal >= 20 ? '🏅' : '○'} Normal</span><span class="${b.hard >= 20 ? 'on' : ''}">${b.hard >= 20 ? '🏅' : '○'} Schwer</span><span class="${b.endless ? 'on' : ''}">∞ ${b.endless || 0}</span></div></div></button>`; }).join('');
    this.render(`<div class="scr">${this.hdr('Karte wählen')}<div class="maps">${cards}<div class="mcard soon">Weitere Karten folgen mit den nächsten Updates</div></div></div>`, m => {
      m.querySelectorAll('[data-map]').forEach(b => b.onclick = () => { this.click(); this.s_diff(b.dataset.map); });
      this.thumbs(m);
    });
  }
  thumbs(root) { root.querySelectorAll('[data-thumb]').forEach(async img => { img.src = await mapThumb(img.dataset.thumb); }); }
  s_diff(mapId = 'ahnenhain') {
    const P = this.P, map = MAPS[mapId], best = P.maps[mapId] || {};
    this.diff = this.diff && unlocked(P, 'mode', this.diff) ? this.diff : 'normal';
    const modes = [['normal', '🌿', 'Normal', `${BAL.diff.normal.lives} Leben · 20 Wellen · Boss Vharox`], ['hard', '🔥', 'Schwer', `${BAL.diff.hard.lives} Leben · stärkere Gegner · ×1,5 Charakter-XP`], ['endless', '∞', 'Endlos', 'Wellen ohne Ende · alle 10 Wellen ein Boss']];
    const team = unlockedCreatures(P), heroOk = unlocked(P, 'hero', 'kairo');
    this.render(`<div class="scr"><div class="hdr"><button class="back" id="bk">‹ Karten</button><h2>${esc(map.name)}</h2></div>
      <div class="dsel"><div style="display:grid;gap:12px"><div class="dmap"><img data-thumb="${mapId}" alt=""><div><b>${esc(map.name)}</b><small>${esc(map.desc)}</small></div></div>
        <div class="box"><b>Dein Team</b><small class="mut"> · alle freigeschalteten Kreaturen</small>
        <div class="team" style="margin-top:8px">${Object.keys(CREATURES).map(id => { const ok = team.includes(id), c = P.chars[id]; return `<div class="tm" style="${ok ? '' : 'opacity:.35'}"><img src="${portrait(id, { stage: 0, branch: c.branch })}" alt=""><br>${ok ? 'Lv ' + c.level : '🔒 Konto ' + unlockLevel('creature', id)}</div>`; }).join('')}
        <div class="tm" style="${heroOk ? '' : 'opacity:.35'}"><img src="${portrait('kairo', { hlvl: 1 })}" alt=""><br>${heroOk ? 'Held ★' + P.heroes.kairo.rank : '🔒 Konto 2'}</div></div></div></div>
      <div style="display:grid;gap:12px"><div class="dcards">${modes.map(([k, ic, n, d]) => { const ok = unlocked(P, 'mode', k); return `<button class="dcard ${k} ${this.diff === k ? 'on' : ''}" data-d="${k}" ${ok ? '' : 'disabled'}><span class="di">${ok ? ic : '🔒'}</span><span><b>${n}</b><small>${ok ? d : 'Ab Konto-Level ' + unlockLevel('mode', k)}</small></span><span class="best">Beste<br><b>${best[k] || 0}</b></span></button>`; }).join('')}</div>
        <button class="big" id="go">⚔ LOS GEHT'S</button></div></div></div>`, m => {
      $('bk').onclick = () => { this.click(); this.s_play(); };
      m.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { this.click(); this.diff = b.dataset.d; this.s_diff(mapId); });
      $('go').onclick = () => { this.app.audio.init(); this.app.startRun(mapId, this.diff); };
      this.thumbs(m);
    });
  }

  // ───────── Sammlung ─────────
  s_collection() {
    const P = this.P;
    this.render(`<div class="scr">${this.hdr('Sammlung')}
      <div class="grid">${Object.keys(CREATURES).map(id => {
        const d = CREATURES[id], c = P.chars[id], ok = unlocked(P, 'creature', id), st = maxStage(id, c.level, c.branch);
        return `<button class="ccard ${ok ? '' : 'locked'}" data-c="${id}" style="--cc:${d.color}">${ok ? `<span class="lvl">Lv ${c.level}</span><span class="els">${d.elements.map(e => `<i style="color:${ELEMENT_COLORS[e]};font-style:normal">●</i>`).join('')}</span>` : ''}<img src="${portrait(id, { stage: st, branch: c.branch })}" alt=""><b>${ok ? esc(d.name) : '???'}</b><small>${ok ? esc(d.role) : '🔒 Konto-Lv ' + unlockLevel('creature', id)}</small>
          ${ok ? `<div class="bar"><u style="width:${c.level >= 50 ? 100 : c.xp / charNeed(c.level) * 100}%"></u></div><div class="stars">${stars(c.mastery)}</div>` : ''}</button>`;
      }).join('')}</div>
      <div class="box"><b>Synergien</b><div class="list" style="margin-top:6px">${SYNERGIES.map(s => `<div class="li"><div class="d"><b>${esc(s.name)}</b><small>${esc(s.desc)}</small></div></div>`).join('')}</div><small style="color:var(--mut)">Aktiv, wenn beide Partner höchstens ${BAL.run.synergyRange} Felder auseinander stehen.</small></div></div>`,
    m => m.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { this.click(); if (unlocked(this.P, 'creature', b.dataset.c)) this.s_creature(b.dataset.c); }));
  }
  s_creature(id, tab = 'evo', view) {
    const P = this.P, d = CREATURES[id], c = P.chars[id], need = charNeed(c.level);
    const forms = formsFor(id, c.branch), cur = maxStage(id, c.level, c.branch);
    const all = d.forms;
    const sel = view ?? cur;
    const selForm = all.find(f => f.id === sel) || forms.find(f => f.stage === sel) || forms[0];
    const nx = nextFormByLevel(id, c.level, c.branch);
    const tabs = [['evo', 'Evolution'], ['perks', 'Boni'], ['paths', 'Pfade'], ['stats', 'Werte'], ['mastery', 'Meisterschaft'], ['lore', 'Lore']];
    let body = '';
    if (tab === 'evo') {
      const stages = [...new Set(all.map(f => f.stage))].sort((a, b) => b - a);
      const node = f => {
        const got = c.level >= f.lvl && (!f.branch || f.branch === c.branch), isCur = f.stage === cur && got, lock = c.level < f.lvl;
        return `<button class="node ${got ? 'got' : ''} ${isCur ? 'cur' : ''} ${lock ? 'lock' : ''} ${selForm.id === f.id ? 'view' : ''}" data-f="${f.id}"><span class="tag">${got ? '✓' : lock ? '🔒' : '○'}</span><img src="${portrait(id, { stage: f.stage, branch: f.branch || c.branch })}" alt=""><b>${esc(f.name)}</b><small>Lv ${f.lvl}${f.cost ? ' · ◈' + fmt(f.cost) + ' im Run' : ''}</small></button>`;
      };
      body = `<div class="tree">${stages.map((s, i) => { const fs = all.filter(f => f.stage === s); const on = cur >= s; return (i ? `<div class="link ${on ? 'on' : ''}"></div>` : '') + `<div class="trow">${fs.map(node).join('')}</div>`; }).join('')}</div>
        <div class="box" style="background:rgba(95,230,255,.06)"><b>${esc(selForm.name)}</b> <small style="color:var(--mut)">· ab Charakter-Lv ${selForm.lvl}</small><br><small>${esc(selForm.desc)}</small>
        ${selForm.branch && hasBranch(id) ? (c.branch === selForm.branch ? '<br><small style="color:var(--char)">✓ Gewählter Weg</small>' : `<br><button class="btn" data-branch="${selForm.branch}" style="margin-top:6px">Diesen Weg wählen</button>`) : ''}</div>
        <small style="color:var(--mut)">Charakter-Level schalten Formen <b>frei</b>. Im Kampf erweckst du sie mit Run-Münzen ◈ – Schritt für Schritt.</small>`;
    } else if (tab === 'perks') {
      body = `<div class="list">${perkList(id).map(p => `<div class="li ${c.level >= p.lvl ? 'on' : ''}"><span class="lv">Lv ${p.lvl}</span><div class="d">${esc(p.name)}${p.desc ? `<small>${esc(p.desc)}</small>` : ''}</div>${c.level >= p.lvl ? '✓' : ''}</div>`).join('')}
        ${all.filter(f => f.stage > 0).map(f => `<div class="li ${c.level >= f.lvl && (!f.branch || f.branch === c.branch) ? 'on' : ''}"><span class="lv">Lv ${f.lvl}</span><div class="d">Form: ${esc(f.name)}<small>${esc(f.desc)}</small></div></div>`).join('')}</div>
        <small style="color:var(--mut)">Permanente Boni bleiben bewusst klein – Strategie entscheidet.</small>`;
    } else if (tab === 'paths') {
      body = `<div class="paths">${d.paths.map((p, i) => `<div class="path" style="--pc:${PATH_COLORS[i]}"><div class="pn">${p.icon} ${esc(p.name)}</div>${p.tiers.map((t, k) => `<div><span class="tn">${k + 1}. ${esc(t.name)}</span><div class="td">◈${fmt(t.cost)} · ${esc(t.desc)}</div></div>`).join('')}</div>`).join('')}</div>
        <small style="color:var(--mut)">Kreuzpfade: höchstens zwei Pfade, nur einer über Stufe ${BAL.cross.second} (z. B. 5/2/0 oder 2/0/5).</small>
        ${d.ability ? `<div class="box"><b>Fähigkeit: ${esc(d.ability.name)}</b> <small>(Lv ${d.ability.lvl}, ${d.ability.cd} s)</small><br><small>${esc(d.ability.desc)}</small>${d.ultimate ? `<br><br><b style="color:var(--run)">Ultimate: ${esc(d.ultimate.name)}</b> <small>(${esc(formsFor(id, c.branch).find(f => f.stage === d.ultimate.stage).name)}, ${d.ultimate.cd} s)</small><br><small>${esc(d.ultimate.desc)}</small>` : ''}</div>` : ''}`;
    } else if (tab === 'stats') {
      const s = baseStats({ cid: id, stage: 0, tiers: [0, 0, 0] }, c.level, c.branch), s1 = baseStats({ cid: id, stage: 0, tiers: [0, 0, 0] }, 1, c.branch);
      const row = (k, v, v1) => `<span>${k}</span><b>${v}${v1 !== undefined && v1 !== v ? ` <small style="color:var(--char)">(Lv1: ${v1})</small>` : ''}</b>`;
      body = `<div class="box kv">${row('Kosten', '◈' + d.cost)}${row('Element', d.elements.map(e => ELEMENT_NAMES[e]).join(' / '))}${row('Schaden', s.dmg.toFixed(1), s1.dmg.toFixed(1))}${row('Angriffe/s', s.rate.toFixed(2), s1.rate.toFixed(2))}${row('Reichweite', s.range.toFixed(2), s1.range.toFixed(2))}${row('DPS (Basis)', dps(s).toFixed(1), dps(s1).toFixed(1))}${row('Erkennung', s.camo ? 'ja' : 'nein')}${row('Trifft Fliegende', s.flying ? 'ja' : 'nein')}${row('Platzierbar', d.place.map(p => ({ ground: 'Boden', high: 'Anhöhe', water: 'Wasser' })[p]).join(', '))}</div>
        <div class="box kv"><span>Gespielte Runs</span><b>${c.runs}</b><span>Siege</span><b>${c.wins}</b><span>Gesamt-XP</span><b>${fmt(c.total)}</b></div>`;
    } else if (tab === 'mastery') {
      const skins = d.mastery.skins;
      body = `<div class="box"><div class="stars" style="font-size:22px">${stars(c.mastery)}</div><small>Meisterpunkte: ${c.mp} · nächste Stufe bei ${BAL.mastery[c.mastery + 1] ?? '—'} (Sieg = 1, Bosssieg = +1)</small></div>
        <div class="list">${MASTERY_REWARDS.slice(1).map((r, i) => `<div class="li ${c.mastery > i ? 'on' : ''}"><span class="lv">M${i + 1}</span><div class="d">${i === 0 ? 'Titel: ' + esc(d.mastery.title) : esc(r.text)}</div>${c.mastery > i ? '✓' : ''}</div>`).join('')}</div>
        <div class="box"><b>Skins</b><div class="seg" style="margin-top:6px"><button data-skin="0" class="${!c.skin ? 'on' : ''}">Standard</button>${skins.map((s, i) => { const need = i === 0 ? 3 : 5, ok = c.mastery >= need; return `<button data-skin="${i + 1}" class="${c.skin === i + 1 ? 'on' : ''}" ${ok ? '' : 'disabled'}>${ok ? esc(s.name) : '🔒 M' + need}</button>`; }).join('')}</div></div>`;
    } else {
      body = `<div class="box"><p style="margin:0;line-height:1.5">${esc(d.lore)}</p></div><div class="box kv"><span>Rolle</span><b>${esc(d.role)}</b><span>Elemente</span><b>${d.elements.map(e => ELEMENT_NAMES[e]).join(', ')}</b></div>`;
    }
    this.render(`<div class="scr"><div class="hdr"><button class="back" id="bk">‹ Sammlung</button><h2>${esc(d.name)}</h2></div>
      <div class="cdet"><div class="side"><div class="preview"><canvas id="pv"></canvas><div class="els">${d.elements.map(e => `<span style="color:${ELEMENT_COLORS[e]}">● ${ELEMENT_NAMES[e]}</span>`).join('')}<span>${esc(d.role)}</span></div><div class="pv"><b>${esc(selForm.name)}</b><small>Ziehen zum Drehen · Tippen = Angriff</small></div></div>
      <div class="charline"><b>Lv ${c.level}</b><div class="bar"><u style="width:${c.level >= 50 ? 100 : c.xp / need * 100}%"></u></div><small>${c.level >= 50 ? 'MAX' : fmt(c.xp) + ' / ' + fmt(need) + ' XP'}${nx ? ' · ' + esc(nx.name) + ' bei Lv ' + nx.lvl : ''}</small></div><div class="stars" style="text-align:center;font-size:18px">${stars(c.mastery)}</div></div>
      <div style="display:grid;gap:10px;align-content:start"><div class="tabs">${tabs.map(([k, n]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div>${body}</div></div></div>`, m => {
      $('bk').onclick = () => { this.click(); this.s_collection(); };
      m.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { this.click(); this.s_creature(id, b.dataset.tab, view); });
      m.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { this.click(); this.s_creature(id, 'evo', b.dataset.f); });
      m.querySelectorAll('[data-branch]').forEach(b => b.onclick = () => { this.click(); c.branch = b.dataset.branch; saveProfile(P); this.s_creature(id, 'evo', view); });
      m.querySelectorAll('[data-skin]').forEach(b => b.onclick = () => { this.click(); c.skin = +b.dataset.skin; saveProfile(P); this.s_creature(id, 'mastery'); });
      this.preview = new Preview($('pv'));
      const skin = c.skin ? d.mastery.skins[c.skin - 1]?.pal : null;
      this.preview.show(id, { stage: selForm.stage, branch: selForm.branch || c.branch, skin, tiers: [0, 0, 0] });
    });
  }

  // ───────── Held ─────────
  s_hero() {
    const P = this.P, h = HEROES.kairo, r = P.heroes.kairo, ok = unlocked(P, 'hero', 'kairo'), need = BAL.hero.rankNeed(r.rank);
    const lv = this.heroView || 1;
    this.render(`<div class="scr">${this.hdr('Held')}
      <div class="preview"><canvas id="pv"></canvas><div class="pv"><b>${esc(h.name)} – ${esc(h.title)}</b><small>${ok ? esc(h.personality) : '🔒 Konto-Level 2'}</small></div></div>
      <div class="charline" style="background:rgba(255,155,61,.08);border-color:rgba(255,155,61,.35)"><b style="color:#ff9b3d">Rang ${r.rank}</b><div class="bar hero"><u style="width:${r.xp / need * 100}%"></u></div><small>${fmt(r.xp)}/${fmt(need)} · Start im Run: Lv ${1 + Math.floor((r.rank - 1) / 10)}</small></div>
      <div class="seg"><button data-v="1" class="${lv === 1 ? 'on' : ''}">Basis</button><button data-v="15" class="${lv === 15 ? 'on' : ''}">Aufstieg (Lv 15)</button><button data-v="20" class="${lv === 20 ? 'on' : ''}">Meister (Lv 20)</button></div>
      <div class="box"><b>Entwicklung im Run (Level 1–20)</b><div class="list" style="margin-top:6px">${h.milestones.map(m => `<div class="li on"><span class="lv">Lv ${m.lvl}</span><div class="d">${esc(m.name)}<small>${esc(m.desc)}</small></div></div>`).join('')}</div>
      <small style="color:var(--mut)">Kairo kostet ◈${BAL.hero.cost}, nur einmal pro Run. Er steigt durch Schaden und Wellen auf. Sein Rang (dauerhaft) lässt ihn später höher starten.</small></div>
      <div class="box"><p style="margin:0;line-height:1.5">${esc(h.lore)}</p><p style="color:var(--mut);margin:8px 0 0;font-style:italic">„${esc(h.lines.place[0])}“</p></div></div>`, m => {
      m.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { this.click(); this.heroView = +b.dataset.v; this.s_hero(); });
      this.preview = new Preview($('pv')); this.preview.show('kairo', { hlvl: lv });
    });
  }

  // ───────── Konto ─────────
  s_account() {
    const P = this.P, a = P.account, need = accNeed(a.level);
    const frames = ['none', ...ACCOUNT_REWARDS.filter(r => r.type === 'frame').map(r => r.id)], titles = ['none', ...ACCOUNT_REWARDS.filter(r => r.type === 'title').map(r => r.id)];
    const have = (type, id) => id === 'none' || unlocked(P, type, id);
    this.render(`<div class="scr">${this.hdr('Konto')}
      <div class="box" style="border-color:rgba(185,140,255,.4)"><div class="profile"><div class="fr" style="--fc:${FRAMES[a.frame]}"><img src="${portrait('kitsune', { stage: maxStage('kitsune', P.chars.kitsune.level, P.chars.kitsune.branch), branch: P.chars.kitsune.branch })}" alt=""></div><div class="pi"><b style="font-size:20px">Konto-Level ${a.level}</b><small>${esc(TITLES[a.title])}</small></div></div>
        <div class="bar acc" style="margin-top:8px;height:9px"><u style="width:${a.xp / need * 100}%"></u></div><small style="color:var(--mut)">${fmt(a.xp)} / ${fmt(need)} Konto-XP · gesamt ${fmt(a.total || 0)}</small>
        <p style="font-size:12px;color:var(--mut);margin:8px 0 0">Konto-XP gibt es für Wellen, Siege, Bosse, Erfolge und jedes Charakter-Level. Sie schalten Kreaturen, Modi und Kosmetik frei.</p></div>
      <div class="box"><b>Belohnungen</b><div class="list" style="margin-top:6px">${ACCOUNT_REWARDS.map(r => `<div class="li acc ${a.level >= r.lvl ? 'on' : ''}"><span class="lv">Lv ${r.lvl}</span><div class="d">${esc(r.text)}</div>${a.level >= r.lvl ? '✓' : '🔒'}</div>`).join('')}
        <div class="li"><span class="lv">…</span><div class="d"><small>Weitere Kreaturen, Karten und Modi kommen mit den nächsten Updates.</small></div></div></div></div>
      <div class="box"><b>Rahmen</b><div class="seg" style="margin-top:6px;grid-template-columns:repeat(5,1fr)">${frames.map(f => `<button data-fr="${f}" class="${a.frame === f ? 'on' : ''}" ${have('frame', f) ? '' : 'disabled'} style="border-color:${a.frame === f ? FRAMES[f] : 'transparent'}"><span style="color:${FRAMES[f]}">■</span><small>${f === 'none' ? 'Keiner' : have('frame', f) ? f : '🔒'}</small></button>`).join('')}</div>
        <b style="display:block;margin-top:10px">Titel</b><div class="seg" style="margin-top:6px;grid-template-columns:repeat(2,1fr)">${titles.map(t => `<button data-ti="${t}" class="${a.title === t ? 'on' : ''}" ${have('title', t) ? '' : 'disabled'}>${have('title', t) ? esc(TITLES[t]) : '🔒'}</button>`).join('')}</div></div></div>`, m => {
      m.querySelectorAll('[data-fr]').forEach(b => b.onclick = () => { this.click(); a.frame = b.dataset.fr; saveProfile(P); this.s_account(); });
      m.querySelectorAll('[data-ti]').forEach(b => b.onclick = () => { this.click(); a.title = b.dataset.ti; saveProfile(P); this.s_account(); });
    });
  }

  // ───────── Erfolge / Statistik ─────────
  s_ach() {
    const P = this.P, done = ACHIEVEMENTS.filter(a => P.ach[a.id]).length;
    this.render(`<div class="scr">${this.hdr(`Erfolge <small style="color:var(--mut);font-size:14px">${done}/${ACHIEVEMENTS.length}</small>`)}
      <div class="box"><div class="list">${ACHIEVEMENTS.map(a => { const v = achValue(P, a), ok = !!P.ach[a.id]; return `<div class="li ach ${ok ? 'on' : ''}"><span class="lv">${ok ? '🏆' : Math.floor(Math.min(1, v / a.goal) * 100) + '%'}</span><div class="d"><b>${esc(a.name)}</b><small>${esc(a.desc)} · +${a.xp} Konto-XP</small>${ok ? '' : `<div class="bar acc" style="margin-top:4px"><u style="width:${Math.min(1, v / a.goal) * 100}%"></u></div>`}</div></div>`; }).join('')}</div></div></div>`);
  }
  s_stats() {
    const S = this.P.stats;
    const rows = [['Runs', S.runs], ['Siege', S.wins], ['Niederlagen', S.losses], ['Siege auf Schwer', S.winsHard], ['Perfekte Siege', S.perfect], ['Beste Endlos-Welle', S.bestEndless], ['Wellen überstanden', S.waves], ['Gegner besiegt', S.kills], ['Bosse besiegt', S.bossKills], ['Gesamtschaden', S.dmg], ['Münzen verdient', S.coins], ['Upgrades', S.upgrades], ['Stufe-5-Upgrades', S.t5], ['Evolutionen im Kampf', S.evolves], ['Fähigkeiten', S.abilities], ['Elementreaktionen', S.reactions], ['Kritische Treffer', S.crits], ['Level-Aufstiege', S.levelUps], ['Spielzeit', Math.round((S.playTime || 0) / 60) + ' min']];
    this.render(`<div class="scr">${this.hdr('Statistik')}<div class="box kv">${rows.map(([k, v]) => `<span>${k}</span><b>${typeof v === 'number' ? fmt(v || 0) : v}</b>`).join('')}</div></div>`);
  }

  // ───────── Einstellungen ─────────
  settingsBody() {
    const S = this.P.settings;
    return `<div class="box">
      <div class="row">Musik<input type="range" min="0" max="1" step="0.05" value="${S.music}" data-s="music"></div>
      <div class="row">Effekte<input type="range" min="0" max="1" step="0.05" value="${S.sfx}" data-s="sfx"></div>
      <div class="row">Grafik<select data-s="quality"><option value="auto">Automatisch</option><option value="2">Hoch</option><option value="1">Mittel</option><option value="0">Sparsam</option></select></div>
      <div class="row">Schadenszahlen<button class="tog ${S.dmgNums ? 'on' : ''}" data-t="dmgNums"></button></div>
      <div class="row">Wackeln & Zeitlupe<button class="tog ${S.shake ? 'on' : ''}" data-t="shake"></button></div>
      <div class="row">Wellen automatisch starten<button class="tog ${S.autoWave ? 'on' : ''}" data-t="autoWave"></button></div></div>`;
  }
  bindSettings(root) {
    const S = this.P.settings;
    root.querySelectorAll('[data-s]').forEach(el => {
      if (el.tagName === 'SELECT') el.value = String(S.quality);
      el.oninput = el.onchange = () => {
        const k = el.dataset.s; S[k] = k === 'quality' ? el.value : +el.value;
        this.app.applySettings(); saveProfile(this.P);
      };
    });
    root.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { S[b.dataset.t] = !S[b.dataset.t]; b.classList.toggle('on'); this.click(); saveProfile(this.P); });
  }
  s_settings() {
    this.render(`<div class="scr">${this.hdr('Optionen')}${this.settingsBody()}
      <div class="box"><small style="color:var(--mut)">Beastforge v${VERSION} · eigene IP, alle Modelle, Klänge und Musik werden im Spiel erzeugt.<br>Spielstand wird automatisch gespeichert (nach jeder Welle).</small></div>
      <button class="btn danger" id="reset">Spielstand löschen</button><a class="btn" href="../" style="text-align:center;color:inherit;text-decoration:none">← Gaming Gang</a></div>`, m => {
      this.bindSettings(m);
      $('reset').onclick = () => { if (confirm('Wirklich ALLES löschen? Level, Konto und Erfolge gehen verloren.')) { this.app.profile = resetProfile(); saveProfile(this.app.profile); this.app.applySettings(); this.show('home'); } };
    });
  }
  settingsModal(onClose) {
    const m = $('modal'); m.classList.remove('hidden');
    m.innerHTML = `<div class="mbox" style="text-align:left"><h3>Optionen</h3>${this.settingsBody()}<button class="btn pri" data-c>Fertig</button></div>`;
    this.bindSettings(m); m.querySelector('[data-c]').onclick = () => { m.classList.add('hidden'); onClose?.(); };
  }

  // ───────── Ergebnis ─────────
  s_results(r) {
    const P = this.P;
    const xpRows = r.used.map(cid => {
      const d = CREATURES[cid], c = P.chars[cid], s = r.snap.chars[cid], ups = r.charUps.filter(u => u.cid === cid);
      const total = Math.round((r.xp[cid] || 0) + (r.winBonus[cid] || 0));
      const forms = ups.flatMap(u => u.forms);
      return `<div class="xprow"><img src="${portrait(cid, { stage: maxStage(cid, c.level, c.branch), branch: c.branch })}" alt=""><div><b>${esc(d.name)}</b> <span class="up2">${ups.length ? `Lv ${s.level} → ${c.level} ⬆` : 'Lv ' + c.level}</span>
        <div class="bar"><u data-w="${c.level >= 50 ? 100 : c.xp / charNeed(c.level) * 100}" style="width:${ups.length ? 0 : s.xp / charNeed(s.level) * 100}%"></u></div>
        ${forms.length ? `<div class="newform">✦ Neue Form freigeschaltet: <b>${forms.map(esc).join(', ')}</b></div>` : ''}</div><span class="gain">+${fmt(total)}</span></div>`;
    }).join('') || '<small style="color:var(--mut)">Keine Kreatur eingesetzt.</small>';
    const a = P.account, need = accNeed(a.level);
    this.render(`<div class="scr res">
      <h1 class="${r.won ? 'win' : 'lose'}">${r.won ? 'SIEG' : 'NIEDERLAGE'}</h1>
      <p style="text-align:center;margin:0;color:var(--mut)">${esc(r.map)} · ${esc(r.diff)} · Welle ${r.wave}${r.maxWave === Infinity ? '' : '/' + r.maxWave}${r.perfect ? ' · <b style="color:var(--run)">PERFEKT!</b>' : ''}</p>
      <div class="rgrid"><div class="sect run"><h3>RUN</h3><div class="kv"><span>Leben</span><b>${r.lives}/${r.maxLives}</b><span>Gegner besiegt</span><b>${fmt(r.kills)}</b><span>Münzen verdient</span><b>◈${fmt(r.coins)}</b><span>Evolutionen</span><b>${r.evolves}</b><span>Elementreaktionen</span><b>${r.reactions}</b>${r.hero ? `<span>Kairo erreichte</span><b>Lv ${r.hero.lvl}</b>` : ''}</div><small style="color:var(--mut)">Run-Münzen verfallen – dein Fortschritt bleibt.</small></div>
      <div class="sect char"><h3>CHARAKTER-XP</h3>${xpRows}${r.won ? '<small style="color:var(--mut)">inkl. +25 % Siegbonus</small>' : '<small style="color:var(--mut)">Alle verdienten XP bleiben erhalten.</small>'}
        ${r.masteryUps.map(m => `<div class="newform">★ ${esc(CREATURES[m.cid].name)}: Meisterschaft ${m.m}!</div>`).join('')}</div>
      <div class="sect acc"><h3>KONTO</h3><div class="xprow" style="grid-template-columns:1fr auto"><div><b>Level ${a.level}</b>${r.accUps.length ? ` <span class="up2" style="color:var(--acc)">⬆ +${r.accUps.length}</span>` : ''}<div class="bar acc"><u data-w="${a.xp / need * 100}" style="width:0%"></u></div></div><span class="gain" style="color:var(--acc)">+${fmt(r.accGain)}</span></div>
        ${r.accUps.flatMap(u => u.rewards).map(x => `<div class="newform" style="background:linear-gradient(90deg,rgba(185,140,255,.25),transparent);color:#e0ccff">🔓 ${esc(x.text)}</div>`).join('')}
        ${r.achs.map(x => `<div class="newform">🏆 ${esc(x.name)} <small>+${x.xp}</small></div>`).join('')}</div>
      </div><div class="seg" style="grid-template-columns:1fr 1fr;max-width:520px;margin:0 auto;width:100%"><button class="btn" data-go="home">Menü</button><button class="big" id="again" style="font-size:18px;padding:12px">↻ Nochmal</button></div>
      ${r.charUps.some(u => u.forms.length) ? '<button class="btn" data-go="collection">🦊 Neue Form in der Sammlung ansehen</button>' : ''}</div>`, m => {
      $('again').onclick = () => { this.app.audio.init(); this.app.startRun('ahnenhain', r.diffKey); };
      setTimeout(() => m.querySelectorAll('[data-w]').forEach(u => u.style.width = u.dataset.w + '%'), 250);
      if (r.charUps.length) setTimeout(() => this.app.audio.play('levelup'), 500);
      if (r.accUps.length) setTimeout(() => this.app.audio.play('acclevel'), 1100);
    });
  }
}
export { LEVEL_PERKS };
