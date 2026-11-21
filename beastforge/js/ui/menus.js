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
import { SCHOOLS, ACADEMY, ACADEMY_BY_ID, shinobiPoints, canLearn, learn, resetAcademy } from '../data/academy.js';

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
    const m = $('menu'); m.innerHTML = html; m.scrollTop = 0; m.classList.toggle('dim', !/class="(title|hub)/.test(html));
    m.querySelectorAll('[data-go]').forEach(b => b.onclick = e => { this.click(); this.go(b.dataset.go, b.dataset.arg, e); });
    after?.(m);
    // Gestaffeltes Einfliegen (Vorbereitung → Bewegung → Nachschwingen)
    m.querySelectorAll('.med, .grid > *, .list > .li, .evorow, .tiles > *, .scr > .box, .hubTop > *, .ccard').forEach((el, i) => { el.style.animationDelay = Math.min(i, 14) * 38 + 'ms'; el.classList.add('pop'); });
  }
  show(name, arg) { this.cur = name; this.app.showMenuScene(name); this['s_' + name](arg); }
  // Bildschirmwechsel mit Fuchsfeuer-Wipe: Kreis wächst vom Tipp-Punkt, Inhalt wechselt verdeckt, dann blendet er weg
  go(name, arg, e) {
    if (this.busy) return;
    const w = $('wipe'); if (!w?.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) { this.show(name, arg); return; }
    this.busy = true; this.app.audio.play('whoosh');
    const x = e?.clientX ?? innerWidth / 2, y = e?.clientY ?? innerHeight / 2, R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 20;
    w.classList.add('on');
    w.animate([{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${R}px at ${x}px ${y}px)` }], { duration: 280, easing: 'cubic-bezier(.55,0,.85,.45)', fill: 'forwards' }).onfinish = () => {
      this.show(name, arg);
      w.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.08)' }], { duration: 320, easing: 'ease-out', fill: 'forwards' }).onfinish = () => { w.classList.remove('on'); w.getAnimations().forEach(a => a.cancel()); this.busy = false; };
    };
    setTimeout(() => { this.busy = false; }, 1500); // Sicherheitsnetz
  }
  hdr(title, back = 'home', label = 'Zurück') { return `<div class="hdr"><button class="back" data-go="${back}">‹ ${label}</button><h2>${title}</h2></div>`; }

  // ───────── Titelbildschirm (beim Öffnen der App) ─────────
  s_title() {
    const L = 'BEASTFORGE'.split('').map((c, i) => `<i style="--i:${i}" class="${i >= 5 ? 'o' : ''}">${c}</i>`).join('');
    this.render(`<div class="titleScr title"><div class="tlogo">${L}</div><p class="tsub">SHINOBI CREATURE DEFENSE</p>
      <div class="ttap">Tippe, um zu beginnen</div><small class="tver">v${VERSION}</small></div>`, m => {
      const start = e => { if (this.busy) return; this.app.audio.init(); this.app.audio.play('start'); this.go('home', undefined, e); };
      m.querySelector('.titleScr').addEventListener('pointerup', start, { once: true });
    });
    this.app.audio.playSong('menu');
  }

  // ───────── Hub: runde Medaillons rund um die 3D-Bühne ─────────
  s_home() {
    const P = this.P, a = P.account, need = accNeed(a.level);
    const newAch = ACHIEVEMENTS.some(x => !P.ach[x.id] && achValue(P, x) >= x.goal);
    const frame = FRAMES[a.frame] || FRAMES.none, k = P.chars.kitsune;
    const med = (go, img, label, cls = '', dot = false) => `<button class="med ${cls}" data-go="${go}"><span class="mc">${img}</span><b>${label}</b>${dot ? '<i class="dot"></i>' : ''}</button>`;
    const pimg = (id, o) => `<img src="${portrait(id, o)}" alt="">`;
    const hero = unlocked(P, 'hero', P.hero) ? P.hero : 'kairo';
    this.render(`<div class="hub">
      <div class="hubTop">
        <button class="profile mini" data-go="account"><div class="fr" style="--fc:${frame}">${pimg('kitsune', { stage: maxStage('kitsune', k.level, k.branch), branch: k.branch })}</div>
          <div class="pi"><b>Lv ${a.level}</b> <span>${esc(TITLES[a.title] || TITLES.none)}</span><div class="bar acc"><u style="width:${a.xp / need * 100}%"></u></div></div></button>
        <div class="hubLogo">BEAST<span>FORGE</span></div>
        <div class="rbtns">${med('ach', '🏆', 'Erfolge', 'sm', newAch)}${med('stats', '📜', 'Statistik', 'sm')}${med('settings', '⚙', 'Optionen', 'sm')}</div>
      </div>
      <div class="hubM">
        ${med('collection', pimg('kitsune', { stage: maxStage('kitsune', k.level, k.branch), branch: k.branch }), 'Kreaturen')}
        ${med('hero', pimg(hero, { hlvl: 1 }), 'Helden')}
        ${med('play', '<span class="playI">▶</span>', 'SPIELEN', 'mbig')}
        ${med('evo', pimg('golem', { stage: 2 }), 'Entwicklung')}
        ${med('academy', '<span class="acI">⛩</span>', 'Akademie', 'acad', shinobiPoints(P).free > 0)}
      </div></div>`);
    this.app.audio.playSong('menu');
  }

  // ───────── Shinobi-Akademie: Wissensbaum mit Shinobi-Punkten ─────────
  s_academy(sel) {
    const P = this.P, pts = shinobiPoints(P), own = P.academy.owned, keep = sel ? $('menu').scrollTop : 0;
    const rows = SCHOOLS.map(sc => {
      const nodes = ACADEMY.filter(n => n.school === sc.id).map(n => {
        const st = own[n.id] ? 'own' : canLearn(P, n.id).ok ? 'can' : (n.tier === 1 || own[ACADEMY.find(x => x.school === n.school && x.tier === n.tier - 1).id]) ? 'poor' : 'lock';
        return `<button class="anode ${st} ${sel === n.id ? 'sel' : ''}" data-n="${n.id}" style="--sc:${sc.color}"><span>${st === 'lock' ? '🔒' : st === 'own' ? '✓' : n.tier}</span><i>${n.cost}</i></button>`;
      }).join('<b class="alink"></b>');
      return `<div class="arow"><div class="ahead" style="--sc:${sc.color}"><b>${sc.icon} ${esc(sc.name)}</b><small>${esc(sc.desc)}</small></div><div class="anodes">${nodes}</div></div>`;
    }).join('');
    const n = sel && ACADEMY_BY_ID[sel], c = n && canLearn(P, n.id);
    const info = n ? `<div class="ainfo" style="--sc:${SCHOOLS.find(s => s.id === n.school).color}"><div><b>${esc(n.name)}</b> <small>Stufe ${n.tier} · ${n.cost} Punkt${n.cost > 1 ? 'e' : ''}</small><p>${esc(n.desc)}</p></div>
      ${own[n.id] ? '<span class="aok">✓ Erlernt</span>' : `<button class="btn pri" id="alearn" ${c.ok ? '' : 'disabled'}>${c.ok ? 'Erlernen' : esc(c.why)}</button>`}</div>`
      : '<div class="ainfo"><p>Tippe auf einen Knoten. Shinobi-Punkte gibt es für jedes Konto-Level und für jeden ersten Sieg auf einer Karte (Normal und Schwer).</p></div>';
    this.render(`<div class="scr acadScr">${this.hdr('Shinobi-Akademie')}
      <div class="apts"><span class="spi">✦</span><b>${pts.free}</b> freie Shinobi-Punkte <small>· ${pts.earned} verdient · ${pts.spent} eingesetzt</small>${pts.spent ? '<button class="aReset" id="areset">↺ Neu verteilen</button>' : ''}</div>
      <div class="atree">${rows}</div>${info}</div>`, m => {
      m.scrollTop = keep;
      m.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { this.click(); this.s_academy(b.dataset.n); });
      const L = $('alearn'); if (L) L.onclick = () => { if (learn(P, sel).ok) { saveProfile(P); this.app.audio.play('levelup'); this.s_academy(sel); } };
      const R = $('areset'); if (R) R.onclick = () => { if (confirm('Alle Shinobi-Punkte zurückholen und neu verteilen?')) { resetAcademy(P); saveProfile(P); this.click(); this.s_academy(); } };
    });
  }

  // ───────── Entwicklungszentrum: alle Entwicklungsreihen auf einen Blick ─────────
  s_evo() {
    const P = this.P, ids = Object.keys(CREATURES).sort((a, b) => unlocked(P, 'creature', b) - unlocked(P, 'creature', a));
    const rows = ids.map(id => {
      const d = CREATURES[id], c = P.chars[id], ok = unlocked(P, 'creature', id);
      const stages = [...new Set(d.forms.map(f => f.stage))].sort((a, b) => a - b);
      const next = d.forms.filter(f => f.lvl > c.level).sort((a, b) => a.lvl - b.lvl)[0];
      const chain = stages.map(st => {
        const fs = d.forms.filter(f => f.stage === st);
        return `<div class="estage">${fs.map(f => {
          const got = ok && c.level >= f.lvl && (!f.branch || !c.branch || f.branch === c.branch || true), isNext = next && f.id === next.id;
          return `<div class="eform ${got ? 'got' : ''} ${isNext ? 'next' : ''} ${ok ? '' : 'lock'}"><span class="ering"><img src="${portrait(id, { stage: f.stage, branch: f.branch || c.branch })}" alt=""></span><b>${esc(f.name)}</b><small>${got ? '✓ bereit' : 'Lv ' + f.lvl}</small></div>`;
        }).join('<i class="eor">oder</i>')}</div>`;
      }).join('<i class="earr">➜</i>');
      const prog = !ok ? `🔒 Konto-Lv ${unlockLevel('creature', id)}` : next ? `Lv ${c.level} · noch <b>${next.lvl - c.level}</b> Level bis <b>${esc(next.name)}</b>` : '<b>Alle Formen erweckt!</b>';
      const pct = !ok ? 0 : next ? Math.min(100, (c.level - 1 + (c.level >= 50 ? 0 : c.xp / charNeed(c.level))) / (next.lvl - 1) * 100) : 100;
      return `<button class="evorow ${ok ? '' : 'locked'}" ${ok ? `data-go="creature" data-arg="${id}"` : ''} style="--cc:${d.color}"><div class="einfo"><b>${esc(d.name)}</b><small>${prog}</small><div class="bar"><u style="width:${pct}%"></u></div></div><div class="echain">${chain}</div></button>`;
    }).join('');
    this.render(`<div class="scr evoScr">${this.hdr('Entwicklungszentrum')}<p class="evohint">Kreaturen sammeln in jedem Run Charakter-XP. Erreichen sie das Level einer Form, kannst du sie <b>im Kampf</b> mit Münzen erwecken.</p>${rows}</div>`);
  }

  // ───────── Spielen: Weltkarte mit Kartenpunkten, wandernden Kreaturen, Seitenleiste ─────────
  s_play(sel) {
    const P = this.P;
    this.diff = this.diff && unlocked(P, 'mode', this.diff) ? this.diff : 'normal';
    const NODES = { ahnenhain: [22, 64], dorf: [48, 42], glut: [72, 68] };
    const FOG = [['Frosttempel', 84, 38, '❄'], ['Himmelsinseln', 64, 26, '☁']];
    const nodes = Object.values(MAPS).map(m => {
      const [x, y] = NODES[m.id] || [50, 50], ok = unlocked(P, 'map', m.id), b = P.maps[m.id] || {};
      const st = (b.normal >= 20 ? 1 : 0) + (b.hard >= 20 ? 1 : 0) + ((b.endless || 0) >= 30 ? 1 : 0);
      return `<button class="wnode ${ok ? '' : 'lock'} ${sel === m.id ? 'on' : ''}" data-map="${m.id}" style="left:${x}%;top:${y}%"><span class="ring"><img data-thumb="${m.id}" alt=""></span><b>${esc(m.name)}</b><small>${ok ? '★'.repeat(st) + '☆'.repeat(3 - st) : '🔒 Konto-Lv ' + unlockLevel('map', m.id)}</small></button>`;
    }).join('');
    const fog = FOG.map(([n, x, y, ic]) => `<div class="wnode fog" style="left:${x}%;top:${y}%"><span class="ring">${ic}</span><b>${n}</b><small>unerforscht</small></div>`).join('');
    const team = unlockedCreatures(P);
    const critters = team.slice(0, 8).map((id, i) => `<img class="critter" src="${portrait(id, { stage: maxStage(id, P.chars[id].level, P.chars[id].branch), branch: P.chars[id].branch })}" style="left:${8 + (i * 11) % 80}%;top:${70 + (i % 3) * 8}%;--dur:${9 + i * 1.7}s;--del:-${i * 1.3}s" alt="">`).join('');
    let panel = '';
    if (sel) {
      const map = MAPS[sel], ok = unlocked(P, 'map', sel), best = P.maps[sel] || {};
      const modes = [['normal', '🌿', 'Normal'], ['hard', '🔥', 'Schwer'], ['endless', '∞', 'Endlos']];
      const heroes = Object.values(HEROES);
      if (!unlocked(P, 'hero', P.hero)) P.hero = 'kairo';
      panel = `<aside class="wpanel"><button class="x" id="wx">✕</button><img class="wthumb" data-thumb="${sel}" alt="">
        <b class="wname">${esc(map.name)}</b><small class="mut">${esc(map.level)} · ${map.paths ? map.paths.length + ' Eingänge' : '1 Eingang'}</small><p>${esc(map.desc)}</p>
        ${ok ? `<div class="wlabel">Modus</div><div class="pills">${modes.map(([k, ic, n]) => { const u = unlocked(P, 'mode', k); return `<button data-d="${k}" class="${this.diff === k ? 'on' : ''}" ${u ? '' : 'disabled'}>${u ? ic : '🔒'} ${n}<small>${u ? 'Beste: ' + (best[k] || 0) : 'Lv ' + unlockLevel('mode', k)}</small></button>`; }).join('')}</div>
        <div class="wlabel">Held</div><div class="heroes">${heroes.map(h => { const u = unlocked(P, 'hero', h.id); return `<button class="hpick ${P.hero === h.id ? 'on' : ''}" data-hero="${h.id}" ${u ? '' : 'disabled'} title="${esc(h.name)}"><img src="${portrait(h.id, { hlvl: 1 })}" alt=""><span>${u ? esc(h.name) : '🔒 ' + unlockLevel('hero', h.id)}</span></button>`; }).join('')}</div>
        <div class="wlabel">Team <small class="mut">· ${team.length} Kreaturen im Shop</small></div><div class="teamrow">${team.map(id => `<img src="${portrait(id, { stage: 0, branch: P.chars[id].branch })}" title="${esc(CREATURES[id].name)}" alt="">`).join('')}</div>
        <button class="big" id="go">⚔ LOS GEHT'S</button>` : `<div class="wlock">🔒 Erreiche Konto-Level ${unlockLevel('map', sel)}, um diese Karte zu betreten.</div>`}</aside>`;
    }
    this.render(`<div class="world">
      <svg class="wmap" viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid slice">
        <defs><pattern id="wv" width="60" height="30" patternUnits="userSpaceOnUse"><path d="M0 15 Q15 5 30 15 T60 15" fill="none" stroke="#7ec8e0" stroke-width="2" opacity=".45"/></pattern>
        <radialGradient id="wl" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#f6e9c4"/><stop offset="1" stop-color="#d9c08a"/></radialGradient></defs>
        <rect width="1000" height="560" fill="#5ab4d0"/><rect width="1000" height="560" fill="url(#wv)"/>
        <path d="M40 470 Q20 330 120 260 Q160 120 330 110 Q470 30 640 70 Q800 40 900 120 Q990 220 940 360 Q960 470 820 520 Q620 560 430 520 Q250 560 120 530 Z" fill="url(#wl)" stroke="#8a6a3a" stroke-width="5"/>
        <path d="M80 450 Q120 360 230 340 Q300 400 260 470 Q170 510 80 450 Z" fill="#7ab85a" opacity=".85"/>
        <path d="M390 160 Q480 120 560 170 Q570 260 470 270 Q380 250 390 160 Z" fill="#c8a070" opacity=".7"/>
        <path d="M640 330 Q740 300 800 370 Q790 450 690 450 Q620 420 640 330 Z" fill="#a85a3a" opacity=".55"/>
        <path d="M720 90 Q820 70 880 130 Q860 190 780 180 Q700 160 720 90 Z" fill="#dff4ff" opacity=".85"/>
        ${[[300, 230], [330, 250], [360, 225], [600, 300], [630, 280], [870, 300], [900, 330]].map(([x, y]) => `<path d="M${x - 22} ${y + 18} L${x} ${y - 20} L${x + 22} ${y + 18} Z" fill="#9a8a72" stroke="#6a5a42" stroke-width="3"/><path d="M${x - 8} ${y - 6} L${x} ${y - 20} L${x + 8} ${y - 6} Z" fill="#fff"/>`).join('')}
        ${[[120, 400], [150, 420], [180, 395], [210, 430], [140, 450], [190, 460], [100, 420]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="#3a8a4a" stroke="#2a5a32" stroke-width="3"/>`).join('')}
        ${[[160, 380], [235, 440]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="14" fill="#ffb8d0" stroke="#c87898" stroke-width="3"/>`).join('')}
        <path d="M240 340 C 300 300, 420 260, 500 200 S 680 330, 740 360 S 820 160, 820 130 M 500 200 C 560 140, 600 90, 600 70" fill="none" stroke="#7a5a2a" stroke-width="5" stroke-dasharray="4 14" stroke-linecap="round"/>
        <path d="M560 30 Q590 120 540 200" fill="none" stroke="#5ab4d0" stroke-width="10" opacity=".8"/>
      </svg>
      <div class="wtop"><button class="back" data-go="home">‹ Menü</button><h2>Weltkarte</h2><div class="wmini"><button data-go="collection" title="Sammlung">🦊</button><button data-go="hero" title="Helden">🥷</button><button data-go="account" title="Konto">🏯</button><button data-go="settings" title="Optionen">⚙</button></div></div>
      ${critters}${fog}${nodes}${panel}</div>`, m => {
      m.querySelectorAll('[data-map]').forEach(b => b.onclick = () => { this.click(); this.s_play(b.dataset.map); });
      m.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { this.click(); this.diff = b.dataset.d; this.s_play(sel); });
      m.querySelectorAll('[data-hero]').forEach(b => b.onclick = () => { this.click(); P.hero = b.dataset.hero; saveProfile(P); this.s_play(sel); });
      $('wx')?.addEventListener('click', () => { this.click(); this.s_play(); });
      const go = $('go'); if (go) go.onclick = () => { this.app.audio.init(); this.app.startRun(sel, this.diff); };
      this.thumbs(m);
    });
  }
  thumbs(root) { root.querySelectorAll('[data-thumb]').forEach(async img => { img.src = await mapThumb(img.dataset.thumb); }); }
  s_diff(mapId = 'ahnenhain') { this.s_play(mapId); }

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
    m => m.querySelectorAll('[data-c]').forEach(b => b.onclick = e => { this.click(); if (unlocked(this.P, 'creature', b.dataset.c)) this.go('creature', b.dataset.c, e); }));
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
      $('bk').onclick = e => { this.click(); this.go('collection', undefined, e); };
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
    const P = this.P, hid = this.heroSel || P.hero || 'kairo', h = HEROES[hid], r = P.heroes[hid], ok = unlocked(P, 'hero', hid), need = BAL.hero.rankNeed(r.rank);
    const lv = this.heroView || 1;
    this.render(`<div class="scr">${this.hdr('Helden')}
      <div class="heroes" style="max-width:420px">${Object.values(HEROES).map(x => `<button class="hpick ${x.id === hid ? 'on' : ''}" data-h="${x.id}"><img src="${portrait(x.id, { hlvl: 1 })}" alt=""><span>${unlocked(P, 'hero', x.id) ? esc(x.name) + (P.hero === x.id ? ' ✓' : '') : '🔒 Konto ' + unlockLevel('hero', x.id)}</span></button>`).join('')}</div>
      <div class="preview"><canvas id="pv"></canvas><div class="pv"><b>${esc(h.name)} – ${esc(h.title)}</b><small>${ok ? esc(h.personality) : '🔒 Konto-Level ' + unlockLevel('hero', hid)}</small></div></div>
      <div class="charline" style="background:rgba(255,155,61,.08);border-color:rgba(255,155,61,.35)"><b style="color:#ff9b3d">Rang ${r.rank}</b><div class="bar hero"><u style="width:${r.xp / need * 100}%"></u></div><small>${fmt(r.xp)}/${fmt(need)} · Start im Run: Lv ${1 + Math.floor((r.rank - 1) / 10)}</small></div>
      <div class="seg"><button data-v="1" class="${lv === 1 ? 'on' : ''}">Basis</button><button data-v="15" class="${lv === 15 ? 'on' : ''}">Aufstieg (Lv 15)</button><button data-v="20" class="${lv === 20 ? 'on' : ''}">Meister (Lv 20)</button></div>
      <div class="box"><b>Entwicklung im Run (Level 1–20)</b><div class="list" style="margin-top:6px">${h.milestones.map(m => `<div class="li on"><span class="lv">Lv ${m.lvl}</span><div class="d">${esc(m.name)}<small>${esc(m.desc)}</small></div></div>`).join('')}</div>
      <small style="color:var(--mut)">Ein Held kostet ◈${BAL.hero.cost}, nur einmal pro Run. Er steigt durch Schaden und Wellen auf. Der Rang (dauerhaft) lässt ihn später höher starten.</small>${ok && P.hero !== hid ? `<button class="btn pri" id="hsel" style="margin-top:8px">${esc(h.name)} als Held wählen</button>` : ''}</div>
      <div class="box"><p style="margin:0;line-height:1.5">${esc(h.lore)}</p><p style="color:var(--mut);margin:8px 0 0;font-style:italic">„${esc(h.lines.place[0])}“</p></div></div>`, m => {
      m.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { this.click(); this.heroView = +b.dataset.v; this.s_hero(); });
      m.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { this.click(); this.heroSel = b.dataset.h; this.s_hero(); });
      const hs = $('hsel'); if (hs) hs.onclick = () => { this.click(); P.hero = hid; saveProfile(P); this.s_hero(); };
      this.preview = new Preview($('pv')); this.preview.show(hid, { hlvl: lv });
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
      <h1 class="${r.won ? 'win' : 'lose'}">${r.won ? 'SIEG' : 'NIEDERLAGE'}</h1>${r.freeplay ? `<p style="margin:0;color:#ffd257;font-weight:800">⚔ Freies Spiel bis Welle ${r.wave}</p>` : ''}
      <p style="text-align:center;margin:0;color:var(--mut)">${esc(r.map)} · ${esc(r.diff)} · Welle ${r.wave}${r.maxWave === Infinity ? '' : '/' + r.maxWave}${r.perfect ? ' · <b style="color:var(--run)">PERFEKT!</b>' : ''}</p>
      <div class="rgrid"><div class="sect run"><h3>RUN</h3><div class="kv"><span>Leben</span><b>${r.lives}/${r.maxLives}</b><span>Gegner besiegt</span><b>${fmt(r.kills)}</b><span>Münzen verdient</span><b>◈${fmt(r.coins)}</b><span>Evolutionen</span><b>${r.evolves}</b><span>Elementreaktionen</span><b>${r.reactions}</b>${r.hero ? `<span>${esc(HEROES[r.hero.id]?.name || 'Held')} erreichte</span><b>Lv ${r.hero.lvl}</b>` : ''}</div><small style="color:var(--mut)">Run-Münzen verfallen – dein Fortschritt bleibt.</small></div>
      <div class="sect char"><h3>CHARAKTER-XP</h3>${xpRows}${r.won ? '<small style="color:var(--mut)">inkl. +25 % Siegbonus</small>' : '<small style="color:var(--mut)">Alle verdienten XP bleiben erhalten.</small>'}
        ${r.masteryUps.map(m => `<div class="newform">★ ${esc(CREATURES[m.cid].name)}: Meisterschaft ${m.m}!</div>`).join('')}</div>
      <div class="sect acc"><h3>KONTO</h3><div class="xprow" style="grid-template-columns:1fr auto"><div><b>Level ${a.level}</b>${r.accUps.length ? ` <span class="up2" style="color:var(--acc)">⬆ +${r.accUps.length}</span>` : ''}<div class="bar acc"><u data-w="${a.xp / need * 100}" style="width:0%"></u></div></div><span class="gain" style="color:var(--acc)">+${fmt(r.accGain)}</span></div>
        ${r.accUps.length ? `<div class="newform" style="background:linear-gradient(90deg,rgba(255,210,87,.25),transparent);color:#ffe9a0">✦ +${r.accUps.length} Shinobi-Punkt${r.accUps.length > 1 ? 'e' : ''} – ab in die Akademie!</div>` : ''}
        ${r.accUps.flatMap(u => u.rewards).map(x => `<div class="newform" style="background:linear-gradient(90deg,rgba(185,140,255,.25),transparent);color:#e0ccff">🔓 ${esc(x.text)}</div>`).join('')}
        ${r.achs.map(x => `<div class="newform">🏆 ${esc(x.name)} <small>+${x.xp}</small></div>`).join('')}</div>
      </div><div class="seg" style="grid-template-columns:1fr 1fr;max-width:520px;margin:0 auto;width:100%"><button class="btn" data-go="home">Menü</button><button class="big" id="again" style="font-size:18px;padding:12px">↻ Nochmal</button></div>
      ${r.charUps.some(u => u.forms.length) ? '<button class="btn" data-go="collection">🦊 Neue Form in der Sammlung ansehen</button>' : ''}</div>`, m => {
      $('again').onclick = () => { this.app.audio.init(); this.app.startRun(r.mapId || 'ahnenhain', r.diffKey); };
      setTimeout(() => m.querySelectorAll('[data-w]').forEach(u => u.style.width = u.dataset.w + '%'), 250);
      if (r.charUps.length) setTimeout(() => this.app.audio.play('levelup'), 500);
      if (r.accUps.length) setTimeout(() => this.app.audio.play('acclevel'), 1100);
    });
  }
}
export { LEVEL_PERKS };
