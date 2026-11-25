// Menü-Bildschirme (DOM). Alle Inhalte kommen aus den Daten-Dateien.
import { BAL, VERSION, LEVEL_PERKS } from '../config.js';
import { CREATURES, PATH_COLORS } from '../data/creatures.js';
import { POWER, givePowers } from '../data/powers.js';
import { Coop, makeCode, cleanCode, explain, diagnose } from '../net.js';
import { academyFx } from '../data/academy.js';
import { heroStartLevel } from '../meta/progression.js';
import { COSMETICS, COS_KINDS, hasCos, ensureEvent, eventDef, eventProgress, claimEvent, eventDot, openChest, daysLeft, EVENT_CHESTS } from '../data/events.js';
import { HEROES } from '../data/heroes.js';
import { MAPS } from '../data/maps.js';
import { ELEMENT_NAMES } from '../data/enemies.js';
import { ACCOUNT_REWARDS, ACHIEVEMENTS, FRAMES, TITLES, SYNERGIES } from '../data/meta.js';
import { addAccXp } from '../meta/progression.js';
import { charNeed, accNeed, formsFor, maxStage, perkList, unlocked, unlockLevel, unlockedCreatures, achValue, hasBranch, MASTERY_REWARDS, nextFormByLevel } from '../meta/progression.js';
import { baseStats, dps } from '../sim/stats.js';
import { portrait, Preview, mapThumb } from '../render/icons.js';
import { ELEMENT_COLORS } from '../data/enemies.js';
import { saveProfile, resetProfile } from '../meta/profile.js';
import { CHALLENGES, CH, chUnlocked } from '../data/challenges.js';
import { QUESTS, ensureDaily, dailyChallenge, questProgress, DAILY_XP, dayKey } from '../data/daily.js';
import { FUSIONS, FUSE } from '../data/fusions.js';
import { SCHOOLS, ACADEMY, ACADEMY_BY_ID, shinobiPoints, canLearn, learn, resetAcademy } from '../data/academy.js';

const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString('de-DE');
const esc = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const u0 = (id, P, sel) => { const c = CH[id || 'std']; return `${c.icon} <b>${esc(c.name)}:</b> ${esc(c.desc)}${chUnlocked(P, sel, c.id) ? '' : ` <i>(🔒 erst ${c.need === 'hard' ? 'auf Schwer' : ''} gewinnen)</i>`}`; };
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
    m.querySelectorAll('.med, .btile, .bTop > *, .grid > *, .list > .li, .evorow, .tiles > *, .scr > .box, .hubTop > *, .ccard').forEach((el, i) => { el.style.animationDelay = Math.min(i, 14) * 38 + 'ms'; el.classList.add('pop'); });
  }
  show(name, arg) { if (name !== 'coop' && this.coopNet && !this.coopGo) { this.coopNet.close(); this.coopNet = null; } this.cur = name; this.app.showMenuScene(name); this['s_' + name](arg); }
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
    const tile = (go, img, label, cls = '', dot = false) => `<button class="btile ${cls}" data-go="${go}"><span class="bti">${img}</span><b>${label}</b>${dot ? '<i class="dot"></i>' : ''}</button>`;
    const sp = shinobiPoints(P);
    this.render(`<div class="hub bhub">
      <div class="bTop">
        <button class="bLevel" data-go="account"><span class="bStar"><b>${a.level}</b></span><span class="bName"><b>${esc(TITLES[a.title] || TITLES.none)}</b><i class="bXp"><u style="width:${a.xp / need * 100}%"></u></i></span></button>
        <div class="bLogo">BEAST<span>FORGE</span></div>
        <div class="bRight"><button class="bCur" data-go="academy" title="Shinobi-Punkte"><span>⛩</span><b>${sp.free}</b></button><button class="bGear" data-go="settings" aria-label="Optionen">⚙</button></div>
      </div>
      <div class="bLeft">${tile('collection', pimg('kitsune', { stage: maxStage('kitsune', k.level, k.branch), branch: k.branch }), 'Kreaturen', 'big')}${tile('hero', pimg(hero, { hlvl: 1 }), 'Helden', 'big')}${tile('evo', pimg('golem', { stage: 2 }), 'Entwicklung', 'big')}</div>
      <div class="bRightCol">${tile('chests', '🎁', 'Truhen', 'sq gold', eventDot(P))}${tile('daily', '📅', 'Täglich', 'sq', this.dailyDot())}${tile('coop', '🤝', 'Koop', 'sq')}${tile('ach', '🏆', 'Erfolge', 'sq', newAch)}${tile('academy', '⛩', 'Akademie', 'sq', sp.free > 0)}${tile('stats', '📜', 'Statistik', 'sq')}</div>
      <button class="bPlay" data-go="play"><span>SPIELEN</span></button>
    </div>`);
    this.app.audio.playSong('menu');
  }

  // ───────── Koop zu zweit (net.js): Raum erstellen oder per Code beitreten ─────────
  coopInfo() { const P = this.P, un = unlockedCreatures(P), hero = unlocked(P, 'hero', P.hero) ? P.hero : unlocked(P, 'hero', 'kairo') ? 'kairo' : null;
    return { name: TITLES[P.account.title] || 'Shinobi', lvl: P.account.level, unlocked: un, hero, heroStart: hero ? Math.min(20, heroStartLevel(P.heroes[hero]?.rank || 1) + (academyFx(P).heroLvl || 0)) : 1, levels: Object.fromEntries(un.map(c => [c, P.chars[c].level])), branch: Object.fromEntries(un.map(c => [c, P.chars[c].branch])) }; }
  coopSetup(map, diff) {   // gemeinsame Startwerte: Team = beide Freischaltungen, Stufe = jeweils die höhere
    const P = this.P, mate = this.coopNet.mate || {}, mine = unlockedCreatures(P);
    const loadout = [...new Set([...mine, ...(Array.isArray(mate.unlocked) ? mate.unlocked : []).filter(c => CREATURES[c])])];
    const levels = {}, branch = {};
    for (const c of loadout) { levels[c] = Math.max(1, Math.min(50, Math.max(mine.includes(c) ? P.chars[c].level : 0, Math.round(+mate.levels?.[c] || 0)))); branch[c] = mine.includes(c) ? P.chars[c].branch : (mate.branch?.[c] === 'shadow' ? 'shadow' : 'spirit'); }
    const ac = academyFx(P), hero = unlocked(P, 'hero', P.hero) ? P.hero : unlocked(P, 'hero', 'kairo') ? 'kairo' : null;
    const mh = HEROES[mate.hero] ? mate.hero : null;   // jeder bringt seinen eigenen Helden mit
    return { map, diff, seed: (Date.now() % 1e6) | 0, loadout, levels, branch, heroes: [hero, mh], heroStarts: [hero ? Math.min(20, heroStartLevel(P.heroes[hero]?.rank || 1) + (ac.heroLvl || 0)) : 1, Math.max(1, Math.min(20, Math.round(+mate.heroStart || 1)))], ac };
  }
  s_coop(state) {
    const P = this.P, N = this.coopNet; state = state || (N ? (N.host ? (N.mate ? 'ready' : 'wait') : 'joined') : 'start');
    const maps = Object.keys(MAPS).filter(id => unlocked(P, 'map', id)), sel = this.coopMap && maps.includes(this.coopMap) ? this.coopMap : maps[0];
    const diffs = ['normal', ...(unlocked(P, 'mode', 'hard') ? ['hard'] : [])], dsel = diffs.includes(this.coopDiff) ? this.coopDiff : 'normal';
    const body = {
      start: `<div class="cpbox"><p>Spielt zu zweit auf derselben Karte: <b>gemeinsame Münzen und Leben</b>, jeder setzt und verbessert Kreaturen. Euer Team besteht aus den Kreaturen von euch beiden.</p>
        <button class="big" id="cpHost">🏠 Raum erstellen</button>
        <div class="cpjoin"><span>BF-</span><input id="cpCode" inputmode="numeric" maxlength="4" placeholder="1234" autocomplete="off"><button class="btn pri" id="cpJoin">Beitreten</button></div>
        <small class="mut">Beide brauchen Internet. Der Gastgeber wählt Karte und Schwierigkeit.</small><button class="btn" id="cpDiag">🩺 Verbindung testen</button></div>`,
      wait: `<div class="cpbox"><small class="mut">Dein Raumcode</small><div class="cpcode">${esc(N?.code || '')}</div><p>Sag deinem Mitspieler den Code. Er tippt in Beastforge auf <b>Koop → Beitreten</b>.</p>${navigator.share ? '<button class="btn pri" id="cpShare">📤 Code teilen</button>' : ''}<div class="cpwait" id="cpStat">⏳ Warte auf Mitspieler …</div><small class="mut">Du kannst kurz zu WhatsApp &amp; Co. wechseln – komm danach zurück in Beastforge und bleib auf diesem Bildschirm, bis dein Mitspieler da ist.</small></div>`,
      ready: `<div class="cpbox"><div class="cpmate">🤝 <b>${esc(N?.mate?.name || 'Mitspieler')}</b> · Konto-Lv ${+N?.mate?.lvl || 1} ist da!</div>
        <div class="cpheroes">${(() => { const myH = unlocked(P, 'hero', P.hero) ? P.hero : unlocked(P, 'hero', 'kairo') ? 'kairo' : null, mh = HEROES[N?.mate?.hero] ? N.mate.hero : null; const hh = (id, who, c) => `<div class="cph" style="--c:${c}">${id ? `<img src="${portrait(id, { hlvl: 1 })}" alt="">` : '<span>–</span>'}<small>${who}</small><b>${id ? esc(HEROES[id].name) : 'kein Held'}</b></div>`; return hh(myH, 'Dein Held', '#4aa8ff') + hh(mh, 'Held deines Mitspielers', '#ffa03a'); })()}</div>
        <div class="wlabel">Karte</div><div class="cpsel">${maps.map(id => `<button class="btn ${id === sel ? 'pri' : ''}" data-cm="${id}">${esc(MAPS[id].name)}</button>`).join('')}</div>
        <div class="wlabel">Schwierigkeit</div><div class="cpsel">${diffs.map(d => `<button class="btn ${d === dsel ? 'pri' : ''}" data-cd="${d}">${esc(BAL.diff[d].name)}</button>`).join('')}</div>
        <button class="big" id="cpGo">⚔ Gemeinsam starten</button></div>`,
      joined: `<div class="cpbox"><div class="cpcode">${esc(N?.code || '')}</div><div class="cpwait">✓ Verbunden – der Gastgeber wählt die Karte …</div></div>`,
      busy: `<div class="cpbox"><div class="cpwait">⏳ Verbinde …</div><p id="cpProg">${esc(this.coopProg || '')}</p><small class="mut" id="cpTime"></small><button class="btn" id="cpCancel">Abbrechen</button></div>`,
      diag: `<div class="cpbox"><b>🩺 Verbindungstest</b><div class="cpdiag" id="cpDiagOut"></div><small class="mut">Dauert ca. 20 Sekunden. Macht den Test bei beiden Handys und schickt mir ein Bildschirmfoto.</small><button class="btn" id="cpBack">Zurück</button></div>`,
    }[state];
    this.render(`<div class="scr coopScr">${this.hdr('🤝 Koop')}${body}${this.coopErr ? `<p class="cperr">⚠ ${esc(this.coopErr)}</p>` : ''}</div>`, m => {
      this.coopErr = null;
      const fail = e => { this.coopNet = null; this.coopErr = explain(e); this.s_coop('start'); };
      const wire = N2 => { N2.on.hello = () => { this.app.audio.play('levelup'); this.s_coop(); }; N2.on.status = st => { const el = document.getElementById('cpStat'); if (el) el.textContent = st === 'open' ? '⏳ Raum offen – warte auf Mitspieler …' : '🔄 Verbindung kurz weg – Raum wird wiederhergestellt …'; };
        N2.on.leave = () => { this.coopNet = null; this.coopErr = 'Verbindung getrennt.'; if (this.cur === 'coop') this.s_coop('start'); };
        N2.on.setup = s => { this.coopGo = true; const net = this.coopNet; this.coopNet = null; this.app.startRun(s.map, s.diff, 'std', { net, setup: s }).finally(() => { this.coopGo = false; }); }; };
      const tok = this.coopTok = (this.coopTok || 0) + 1, t0 = Date.now();
      const prog = txt => { this.coopProg = txt; const el = document.getElementById('cpProg'); if (el) el.textContent = txt; };
      if (state === 'busy') { const ti = setInterval(() => { const el = document.getElementById('cpTime'); if (!el || this.coopTok !== tok) { clearInterval(ti); return; } el.textContent = Math.round((Date.now() - t0) / 1000) + ' s'; }, 500); }
      const live = N2 => { if (this.coopTok === tok + 1 && this.cur === 'coop') return true; N2.close(); return false; };   // abgebrochen → Verbindung wieder schließen
      m.querySelector('#cpCancel')?.addEventListener('click', () => { this.coopTok++; this.s_coop('start'); });
      m.querySelector('#cpBack')?.addEventListener('click', () => { this.coopTok++; this.s_coop('start'); });
      m.querySelector('#cpDiag')?.addEventListener('click', () => {
        this.s_coop('diag'); const my = this.coopTok;
        const L = (ok, txt, bad) => `<div class="${ok === undefined ? 'wait' : ok ? 'ok' : 'bad'}">${ok === undefined ? '⏳' : ok ? '✅' : '❌'} ${txt}${ok === false && bad ? `<small>${bad}</small>` : ''}</div>`;
        diagnose(o => {
          const el = document.getElementById('cpDiagOut'); if (!el || this.coopTok !== my) return;
          const verdict = !o.done ? '' : !o.server ? 'Der Vermittlungs-Server ist nicht erreichbar → Internet prüfen, VPN aus, später nochmal.' : o.rtc === false ? 'WebRTC ist auf diesem Gerät aus → Blockierungsmodus ausschalten.' : !o.srflx && !o.relay ? 'Das Netz blockiert alle Verbindungswege → anderes Netz (mobile Daten) probieren.' : !o.relay ? 'Direkte Wege gehen, das Relay nicht. Meist trotzdem ok – sonst Hotspot probieren.' : 'Alles erreichbar ✓ – an diesem Gerät liegt es nicht.';
          el.innerHTML = L(o.lib, 'Koop-Baustein geladen', 'App neu laden') + L(o.lib ? o.server : undefined, 'Vermittlungs-Server erreichbar', 'Internet/VPN prüfen')
            + L(o.server === undefined ? undefined : o.rtc ?? (o.host || o.srflx ? true : undefined), 'WebRTC verfügbar', 'Blockierungsmodus aus?')
            + L(o.done ? o.srflx : o.srflx || undefined, 'Öffentliche Adresse (STUN)', 'Netz blockiert direkte Wege') + L(o.done ? o.relay : o.relay || undefined, 'Relay-Server (TURN)', 'Relay blockiert')
            + (verdict ? `<p class="cpverd">${verdict}</p>` : '');
        });
      });
      m.querySelector('#cpHost')?.addEventListener('click', () => { this.app.audio.init(); this.coopProg = ''; this.s_coop('busy'); const mk = (n) => Coop.create(makeCode(), prog).catch(e => n > 0 && /unavailable-id/.test(e?.type) ? mk(n - 1) : Promise.reject(e)); mk(3).then(N2 => { if (!live(N2)) return; this.coopNet = N2; wire(N2); this.s_coop(); }, e => { if (this.coopTok === tok + 1) fail(e); }); });
      m.querySelector('#cpShare')?.addEventListener('click', () => { navigator.share({ title: 'Beastforge Koop', text: `Spiel Beastforge mit mir im Koop! Öffne Beastforge → Koop → Beitreten und gib ${this.coopNet?.code || ''} ein.` }).catch(() => {}); });
      m.querySelector('#cpJoin')?.addEventListener('click', () => { this.app.audio.init(); const code = cleanCode(m.querySelector('#cpCode').value); if (!code) { this.coopErr = 'Bitte die 4 Ziffern eingeben.'; this.s_coop('start'); return; }
        this.coopProg = ''; this.s_coop('busy'); Coop.join(code, prog).then(N2 => { if (!live(N2)) return; this.coopNet = N2; wire(N2); N2.hello(this.coopInfo()); this.s_coop(); }, e => { if (this.coopTok === tok + 1) fail(e); }); });
      m.querySelectorAll('[data-cm]').forEach(b => b.onclick = () => { this.coopMap = b.dataset.cm; this.click(); this.s_coop(); });
      m.querySelectorAll('[data-cd]').forEach(b => b.onclick = () => { this.coopDiff = b.dataset.cd; this.click(); this.s_coop(); });
      m.querySelector('#cpGo')?.addEventListener('click', () => { this.app.audio.init(); const s = this.coopSetup(sel, dsel); const net = this.coopNet; net.send({ setup: s }); this.coopGo = true; this.coopNet = null; this.app.startRun(s.map, s.diff, 'std', { net, setup: s }).finally(() => { this.coopGo = false; }); });
    });
  }

  // ───────── Truhen, Wochen-Event, Kosmetik ─────────
  s_chests(reveal) {
    const P = this.P, E = ensureEvent(P), d = eventDef(P), v = eventProgress(P);
    const ms = d.goals.map((g, i) => { const got = E.claimed.includes(i), ok = v >= g;
      return `<div class="evm ${got ? 'got' : ok ? 'ok' : ''}"><b>${fmt(g)}</b><small>🎁×${EVENT_CHESTS[i]}</small>${got ? '<span class="aok">✓</span>' : `<button class="btn ${ok ? 'pri' : ''}" data-ev="${i}" ${ok ? '' : 'disabled'}>Abholen</button>`}</div>`; }).join('');
    const top = d.goals[2], pct = Math.min(100, v / top * 100);
    const rv = reveal ? `<div class="crev ${reveal.type}">${reveal.type === 'cos' ? `<span class="cri">${reveal.kind === 'heart' ? '💎' : '✨'}</span><b>Neu: ${esc(reveal.item.name)}</b><small>${COS_KINDS[reveal.kind]} – unten auswählen</small>`
      : reveal.type === 'powers' ? `<span class="cri">${reveal.got.map(p => p.icon).join('')}</span><b>${reveal.got.map(p => esc(p.name)).join(' + ')}</b><small>Kräfte für deine Runs</small>`
      : `<span class="cri">✦</span><b>+${reveal.xp} Konto-XP</b><small>Weiter so!</small>`}</div>` : '';
    const sw = (kind, c) => { const own = hasCos(P, kind, c.id), on = (P.cos[kind] || 'default') === c.id, col = kind === 'heart' ? '#' + c.glow.toString(16).padStart(6, '0') : c.cols ? `conic-gradient(${c.cols.map(x => '#' + x.toString(16).padStart(6, '0')).join(',')})` : 'linear-gradient(#fff,#9ad0ff)';
      return `<button class="cosw ${on ? 'on' : ''} ${own ? '' : 'lock'}" data-cos="${kind}:${c.id}" ${own ? '' : 'disabled'}><i style="background:${col}"></i><small>${own ? esc(c.name) : '???'}</small></button>`; };
    this.render(`<div class="scr chestScr">${this.hdr('Truhen & Event')}
      <div class="cgrid">
        <div class="evc"><div class="evh"><span class="evi">${d.icon}</span><div><small>WOCHEN-EVENT · noch ${daysLeft()} Tag${daysLeft() > 1 ? 'e' : ''}</small><b>${esc(d.name)}</b><p>${esc(d.desc)}</p></div></div>
          <div class="bar evb"><u style="width:${pct}%"></u>${d.goals.slice(0, 2).map(g => `<i style="left:${g / top * 100}%"></i>`).join('')}</div><small class="mut">Fortschritt: <b style="color:#ffd257">${fmt(v)}</b> / ${fmt(top)}</small>
          <div class="evms">${ms}</div></div>
        <div class="cbox"><div class="chest ${reveal ? 'opened' : ''}" id="chest"><div class="lid"></div><div class="body"><i></i></div></div>
          <b class="ccount">${P.chests} Truhe${P.chests === 1 ? '' : 'n'}</b>${rv}
          <button class="big" id="copen" ${P.chests > 0 ? '' : 'disabled'}>🎁 Öffnen</button>
          <small class="mut">Truhen gibt es für Siege, den Tageskampf und das Wochen-Event.</small></div>
      </div>
      ${Object.keys(COSMETICS).map(kind => `<div class="wlabel">${COS_KINDS[kind]}</div><div class="cosr">${COSMETICS[kind].map(c => sw(kind, c)).join('')}</div>`).join('')}
    </div>`, m => {
      m.querySelectorAll('[data-ev]').forEach(b => b.onclick = () => { const n = claimEvent(P, +b.dataset.ev); if (n) { saveProfile(P); this.app.audio.play('levelup'); this.s_chests(); } });
      m.querySelectorAll('[data-cos]').forEach(b => b.onclick = () => { const [k, id] = b.dataset.cos.split(':'); P.cos[k] = id; saveProfile(P); this.click(); this.s_chests(); });
      const ob = m.querySelector('#copen'); ob.onclick = () => {
        if (this.opening || !(P.chests > 0)) return; this.opening = true;
        const ch = m.querySelector('#chest'); ch.classList.remove('opened'); ch.classList.add('shake'); this.app.audio.play('tier5');
        setTimeout(() => { const r = openChest(P); saveProfile(P); this.opening = false; this.app.audio.play(r?.type === 'cos' ? 'evolve' : 'levelup'); if (r?.type === 'xp') addAccXp(P, r.xp), saveProfile(P); this.s_chests(r); }, 900);
      };
    });
  }

  // ───────── Täglich: Tageskampf + Tagesaufgaben ─────────
  dailyDot() { const P = this.P, D = ensureDaily(P); return !D.won || D.quests.some(id => { const q = QUESTS.find(x => x.id === id); return !D.claimed[id] && questProgress(P, q) >= q.goal; }); }
  s_daily() {
    const P = this.P, D = ensureDaily(P), dc = dailyChallenge(P, id => unlocked(P, 'map', id)), map = MAPS[dc.map];
    const qs = D.quests.map(id => {
      const q = QUESTS.find(x => x.id === id), v = Math.min(q.goal, questProgress(P, q)), done = v >= q.goal, got = D.claimed[id];
      return `<div class="dq ${got ? 'got' : done ? 'done' : ''}"><div><b>${esc(q.text)}</b><div class="bar"><u style="width:${v / q.goal * 100}%"></u></div><small>${fmt(v)} / ${fmt(q.goal)} · ✦ ${q.xp} Konto-XP · ⚡ +1 Kraft</small></div>
        ${got ? '<span class="aok">✓</span>' : `<button class="btn ${done ? 'pri' : ''}" data-q="${id}" ${done ? '' : 'disabled'}>Abholen</button>`}</div>`;
    }).join('');
    const [y, m, d] = dayKey().split('-');
    this.render(`<div class="scr dailyScr">${this.hdr('Täglich <small style="color:var(--mut);font-size:14px">' + d + '.' + m + '.' + y + '</small>')}
      <div class="dgrid"><div class="dkcard ${D.won ? 'won' : ''}"><img data-thumb="${dc.map}" alt=""><div class="dct"><small>⚔ TAGESKAMPF</small><b>${esc(map.name)} · ${dc.diff === 'hard' ? '🔥 Schwer' : '🌿 Normal'}</b>
        <div class="dmods">${dc.mods.map(id => `<span title="${esc(CH[id].desc)}">${CH[id].icon} ${esc(CH[id].name)}</span>`).join('')}</div>
        <small class="mut">Belohnung beim ersten Sieg heute: <b style="color:#ffd257">+1 Shinobi-Punkt</b> · ✦ ${DAILY_XP} Konto-XP</small>
        ${D.won ? '<div class="aok">✓ Heute geschafft – morgen gibt es einen neuen Kampf</div>' : '<button class="big" id="dgo">⚔ Antreten</button>'}</div></div>
      <div class="dqs"><div class="wlabel">Tagesaufgaben</div>${qs}${this.lastPow ? `<div class="newform">${POWER[this.lastPow].icon} Neue Kraft: <b>${esc(POWER[this.lastPow].name)}</b></div>` : ''}<small class="mut">Neue Aufgaben gibt es jeden Tag um Mitternacht.</small></div></div></div>`, m2 => {
      this.thumbs(m2);
      $('dgo')?.addEventListener('click', () => { this.app.audio.init(); this.app.startRun(dc.map, dc.diff, 'daily'); });
      m2.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { const q = QUESTS.find(x => x.id === b.dataset.q); if (D.claimed[q.id] || questProgress(P, q) < q.goal) return; D.claimed[q.id] = 1; addAccXp(P, q.xp); const pg = givePowers(P, 1)[0]; saveProfile(P); this.lastPow = pg; this.app.audio.play('levelup'); this.s_daily(); });
    });
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
    const NODES = { ahnenhain: [22, 64], dorf: [48, 42], glut: [72, 68], frost: [84, 34], sky: [62, 18] };
    const FOG = [];
    const nodes = Object.values(MAPS).map(m => {
      const [x, y] = NODES[m.id] || [50, 50], ok = unlocked(P, 'map', m.id), b = P.maps[m.id] || {};
      const st = (b.normal >= 20 ? 1 : 0) + (b.hard >= BAL.diff.hard.waves ? 1 : 0) + ((b.master || 0) >= BAL.diff.master.waves ? 1 : 0) + ((b.endless || 0) >= 30 ? 1 : 0);
      return `<button class="wnode ${ok ? '' : 'lock'} ${sel === m.id ? 'on' : ''}" data-map="${m.id}" style="left:${x}%;top:${y}%"><span class="ring"><img data-thumb="${m.id}" alt=""></span><b>${esc(m.name)}</b><small>${ok ? '★'.repeat(st) + '☆'.repeat(4 - st) : '🔒 Konto-Lv ' + unlockLevel('map', m.id)}</small></button>`;
    }).join('');
    const fog = FOG.map(([n, x, y, ic]) => `<div class="wnode fog" style="left:${x}%;top:${y}%"><span class="ring">${ic}</span><b>${n}</b><small>unerforscht</small></div>`).join('');
    const team = unlockedCreatures(P);
    const critters = team.slice(0, 8).map((id, i) => `<img class="critter" src="${portrait(id, { stage: maxStage(id, P.chars[id].level, P.chars[id].branch), branch: P.chars[id].branch })}" style="left:${8 + (i * 11) % 80}%;top:${70 + (i % 3) * 8}%;--dur:${9 + i * 1.7}s;--del:-${i * 1.3}s" alt="">`).join('');
    let panel = '';
    if (sel) {
      const map = MAPS[sel], ok = unlocked(P, 'map', sel), best = P.maps[sel] || {};
      const modes = [['normal', '🌿', 'Normal · 20'], ['hard', '🔥', 'Schwer · 40'], ['master', '👑', 'Meister · 60'], ['endless', '∞', 'Endlos']];
      const heroes = Object.values(HEROES);
      if (!unlocked(P, 'hero', P.hero)) P.hero = 'kairo';
      panel = `<aside class="wpanel"><button class="x" id="wx">✕</button><img class="wthumb" data-thumb="${sel}" alt="">
        <b class="wname">${esc(map.name)}</b><small class="mut">${esc(map.level)} · ${map.paths ? map.paths.length + ' Eingänge' : '1 Eingang'}</small><p>${esc(map.desc)}</p>
        ${ok ? `<div class="wlabel">Modus</div><div class="pills">${modes.map(([k, ic, n]) => { const u = unlocked(P, 'mode', k); return `<button data-d="${k}" class="${this.diff === k ? 'on' : ''}" ${u ? '' : 'disabled'}>${u ? ic : '🔒'} ${n}<small>${u ? 'Beste: ' + (best[k] || 0) : 'Lv ' + unlockLevel('mode', k)}</small></button>`; }).join('')}</div>
        ${this.diff !== 'endless' ? `<div class="wlabel">Herausforderung <small class="mut">· 🏅 ${Object.keys(best.medals || {}).length}/${CHALLENGES.length - 1}</small></div><div class="chs">${CHALLENGES.map(c => { const u = chUnlocked(P, sel, c.id), m = best.medals?.[c.id]; return `<button data-ch="${c.id}" class="${(this.ch || 'std') === c.id ? 'on' : ''}" ${u ? '' : 'disabled'} title="${esc(c.desc)}"><span>${u ? c.icon : '🔒'}</span>${esc(c.name)}${m ? '<i>🏅</i>' : ''}</button>`; }).join('')}</div><p class="chdesc">${u0(this.ch, P, sel)}</p>` : ''}
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
      m.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { this.click(); this.ch = b.dataset.ch; this.s_play(sel); });
      m.querySelectorAll('[data-hero]').forEach(b => b.onclick = () => { this.click(); P.hero = b.dataset.hero; saveProfile(P); this.s_play(sel); });
      $('wx')?.addEventListener('click', () => { this.click(); this.s_play(); });
      const go = $('go'); if (go) go.onclick = () => { this.app.audio.init(); const ch = chUnlocked(P, sel, this.ch || 'std') ? this.ch || 'std' : 'std'; this.app.startRun(sel, CH[ch].diff || this.diff, ch); };
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
      <div class="box"><b>⚭ Fusionen</b><div class="fgrid">${FUSIONS.map(f => { const ok = unlocked(P, 'creature', f.a) && unlocked(P, 'creature', f.b), D = CREATURES[f.id];
        return `<div class="fcard ${ok ? '' : 'locked'}" style="--cc:${f.color}"><img src="${portrait(f.id)}" alt=""><div><b>${ok ? esc(f.name) : '???'}</b><small>${esc(CREATURES[f.a].name)} + ${esc(CREATURES[f.b].name)}</small><small class="mut">${ok ? esc(f.desc) : 'Schalte beide Kreaturen frei'}</small></div></div>`; }).join('')}</div>
        <small style="color:var(--mut)">So geht's: beide Kreaturen nebeneinander stellen (höchstens ${FUSE.range} Felder), beide erwecken, eine antippen → <b>Fusion</b>. Die Fusion behält die Pfadstufen und ist sofort mit Fähigkeiten bereit.</small></div>
      <div class="box"><b>🐾 Rudel</b><small style="display:block;color:var(--mut);margin-top:4px">Kreaturen, die direkt nebeneinander stehen, bilden ein Rudel: jede weitere Kreatur gibt allen <b>×${(1 + BAL.run.packDmg).toFixed(2)} Schaden</b> und <b>×${(1 + BAL.run.packRate).toFixed(3)} Tempo</b> – multiplikativ und ohne Obergrenze.</small></div>
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
    const dm = Object.entries(r.dmg || {}).filter(([k, v]) => v > 0).sort((x, y) => y[1] - x[1]).slice(0, 5), top = dm[0]?.[1] || 1;
    const mvp = dm.length ? `<div class="sect mvp"><h3>🏅 BESTE KREATUREN</h3>${dm.map(([k, v], i) => { const isH = !!HEROES[k], nm = isH ? HEROES[k].name : (CREATURES[k]?.name || k), img = isH ? portrait(k, { hlvl: 1 }) : portrait(k, { stage: 0 });
      return `<div class="mrow"><span class="mpl">${['🥇', '🥈', '🥉', '4', '5'][i]}</span><img src="${img}" alt=""><div><b>${esc(nm)}</b><div class="bar"><u data-w="${v / top * 100}" style="width:0"></u></div></div><span class="gain">${fmt(v)}</span></div>`; }).join('')}<small style="color:var(--mut)">nach verursachtem Schaden</small></div>` : '';
    const a = P.account, need = accNeed(a.level);
    this.render(`<div class="scr res">
      <h1 class="${r.won ? 'win' : 'lose'}">${r.won ? 'SIEG' : 'NIEDERLAGE'}</h1>${r.daily ? `<p style="margin:0;color:#ffd257;font-weight:900;text-align:center">📅 Tageskampf geschafft! +1 Shinobi-Punkt</p>` : ''}${r.medal ? `<p style="margin:0;color:#ffd257;font-weight:900;text-align:center">🏅 Neue Medaille: ${esc(r.medal.name)} · +1 Shinobi-Punkt</p>` : r.ch && r.ch.id !== 'std' ? `<p style="margin:0;color:var(--mut)">${r.ch.icon} ${esc(r.ch.name)}</p>` : ''}${r.freeplay ? `<p style="margin:0;color:#ffd257;font-weight:800">⚔ Freies Spiel bis Welle ${r.wave}</p>` : ''}
      <p style="text-align:center;margin:0;color:var(--mut)">${esc(r.map)} · ${esc(r.diff)} · Welle ${r.wave}${r.maxWave === Infinity ? '' : '/' + r.maxWave}${r.perfect ? ' · <b style="color:var(--run)">PERFEKT!</b>' : ''}</p>
      ${mvp}<div class="rgrid"><div class="sect run"><h3>RUN</h3><div class="kv"><span>Leben</span><b>${r.lives}/${r.maxLives}</b><span>Gegner besiegt</span><b>${fmt(r.kills)}</b><span>Münzen verdient</span><b>◈${fmt(r.coins)}</b><span>Evolutionen</span><b>${r.evolves}</b><span>Elementreaktionen</span><b>${r.reactions}</b>${r.hero ? `<span>${esc(HEROES[r.hero.id]?.name || 'Held')} erreichte</span><b>Lv ${r.hero.lvl}</b>` : ''}</div><small style="color:var(--mut)">Run-Münzen verfallen – dein Fortschritt bleibt.</small></div>
      <div class="sect char"><h3>CHARAKTER-XP</h3>${xpRows}${r.won ? '<small style="color:var(--mut)">inkl. +25 % Siegbonus</small>' : '<small style="color:var(--mut)">Alle verdienten XP bleiben erhalten.</small>'}
        ${r.masteryUps.map(m => `<div class="newform">★ ${esc(CREATURES[m.cid].name)}: Meisterschaft ${m.m}!</div>`).join('')}</div>
      <div class="sect acc"><h3>KONTO</h3><div class="xprow" style="grid-template-columns:1fr auto"><div><b>Level ${a.level}</b>${r.accUps.length ? ` <span class="up2" style="color:var(--acc)">⬆ +${r.accUps.length}</span>` : ''}<div class="bar acc"><u data-w="${a.xp / need * 100}" style="width:0%"></u></div></div><span class="gain" style="color:var(--acc)">+${fmt(r.accGain)}</span></div>
        ${r.accUps.length ? `<div class="newform" style="background:linear-gradient(90deg,rgba(255,210,87,.25),transparent);color:#ffe9a0">✦ +${r.accUps.length} Shinobi-Punkt${r.accUps.length > 1 ? 'e' : ''} – ab in die Akademie!</div>` : ''}
        ${r.accUps.flatMap(u => u.rewards).map(x => `<div class="newform" style="background:linear-gradient(90deg,rgba(185,140,255,.25),transparent);color:#e0ccff">🔓 ${esc(x.text)}</div>`).join('')}
        ${r.achs.map(x => `<div class="newform">🏆 ${esc(x.name)} <small>+${x.xp}</small></div>`).join('')}
        ${r.chests ? `<div class="newform" style="color:#ffe9a0">🎁 +${r.chests} Truhe${r.chests > 1 ? 'n' : ''} – im Menü unter „Truhen“ öffnen</div>` : ''}
        ${r.powGot?.length ? `<h3 style="margin-top:8px">⚡ NEUE KRÄFTE</h3><div class="rpow">${r.powGot.map(id => `<span>${POWER[id].icon} ${esc(POWER[id].name)}</span>`).join('')}</div>` : ''}</div>
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
