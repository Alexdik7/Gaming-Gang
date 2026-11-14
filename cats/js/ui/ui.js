// UIManager (Menüs): alle Bildschirme außerhalb der Runde. Reines DOM, Daten kommen aus js/data/*.
import { BALANCE, DIFFS } from '../config.js';
import { CATS, CAT_IDS, CLASSES, DMG_TYPES } from '../data/cats.js';
import { DOGS, DOG_IDS } from '../data/dogs.js';
import { MAPS, MAP_BY_ID, THEMES } from '../data/maps.js';
import { POWERUPS, POWER_IDS, RESEARCH, RESEARCH_IDS, RANK, DAILY, ACHIEVEMENTS } from '../data/meta.js';
import { describeFx, computeStats } from '../sim/upgrades.js';
import { mapUnlocked, diffUnlocked, cleared, nextUnlocks, loadoutSize, powerSlots, playerSetup, playerBonus } from '../meta/progression.js';
import { buyCat, buyRank, buyResearch, buyPower, catCost, canAfford } from '../meta/currency.js';
import { ensureMissions, missionDef, missionReward, claimMission, dailyState, claimDaily, fmtTime, achState, claimAch, claimable, msToMidnight, statValue } from '../meta/missions.js';
import { Lobby } from '../net/lobby.js';
import { catPortrait, dogPortrait } from './art.js';
import { IC, POWER_EMOJI, fmt, costHtml, rewardHtml } from './icons.js';
import { OWNER_COL } from './render.js';

const $ = s => document.querySelector(s);
const DIFF_N = { easy: ['Leicht', 'Easy'], normal: ['Normal', 'Normal'], hard: ['Schwer', 'Hard'], endless: ['Endlos', 'Endless'] };
const PATH_COL = ['#ff5d5d', '#5ab4ff', '#6fd15a'];
const WHY = { money: ['Dafür reicht es noch nicht.', 'You cannot afford that yet.'], level: ['Dein Level ist noch zu niedrig.', 'Your level is too low.'], max: ['Schon auf Maximum.', 'Already maxed.'], owned: ['Schon in deinem Besitz.', 'Already owned.'] };

export class Menus {
  constructor(app) {
    this.app = app; this.el = $('#menu'); this.screen = 'home'; this.tab = {}; this.lobby = null;
    this.el.addEventListener('click', e => this.click(e));
    this.el.addEventListener('input', e => this.input(e));
    setInterval(() => { if (!this.el.classList.contains('hidden') && (this.screen === 'home' || this.screen === 'missions')) this.tick(); }, 20000);
  }
  get s() { return this.app.save; }
  tr(a, b) { return this.app.tr(a, b); }
  L(p) { return this.app.L(p); }

  show(screen, arg) {
    if (this.screen === 'mp' && screen !== 'mp' && this.lobby && !this.lobby.session) { this.lobby.leave(); this.lobby = null; }
    this.screen = screen; this.arg = arg;
    ensureMissions(this.s);
    this.el.innerHTML = this[screen]();
    this.after();
    this.app.audio.music('menu');
  }
  redraw() { const b = this.el.querySelector('.body'), y = b ? b.scrollTop : 0, m = this.el.querySelector('.maps'), x = m ? m.scrollLeft : 0; this.el.innerHTML = this[this.screen](); this.after(); const b2 = this.el.querySelector('.body'); if (b2) b2.scrollTop = y; const m2 = this.el.querySelector('.maps'); if (m2) m2.scrollLeft = x; }
  tick() { this.redraw(); }
  after() { this.el.querySelectorAll('canvas[data-map]').forEach(c => drawThumb(c, MAP_BY_ID[c.dataset.map])); const on = this.el.querySelector('.map.on'); if (on && this.fresh) { on.scrollIntoView({ inline: 'center', block: 'nearest' }); this.fresh = false; } }

  head(title, back = 'home') {
    const s = this.s;
    return `<div class="top"><button class="back" data-go="${back}">‹</button><h2>${title}</h2><span class="pill">${IC.coin}${fmt(s.coins)}</span><span class="pill">${IC.crystal}${fmt(s.crystals)}</span></div>`;
  }

  // ====================================================================== Startseite
  home() {
    const s = this.s, tr = this.tr.bind(this), need = BALANCE.xpNeed(s.level), cl = claimable(s), d = dailyState(s);
    const next = nextUnlocks(s.level, 1)[0];
    const dot = n => n ? `<span class="dot">${n}</span>` : '';
    const buyable = CAT_IDS.filter(id => !s.cats[id] && s.level >= CATS[id].unlock.lvl && canAfford(s, catCost(CATS[id]))).length;
    const tile = (go, em, t, sub, n) => `<button class="tile" data-go="${go}"><span class="em">${em}</span><span><span>${t}</span><small>${sub}</small></span>${dot(n)}</button>`;
    return `<div class="top"><div class="lvl"><span class="badge">${s.level}</span><div class="xp"><div class="bar gold"><i style="width:${Math.min(100, s.xp / need * 100)}%"></i></div><small>${s.name} · ${s.xp}/${need} XP${next ? ` · ${tr('Lv.', 'Lv.')} ${next.lvl}: ${this.L(next.n)}` : ''}</small></div></div>
      <span class="pill">${IC.coin}${fmt(s.coins)}</span><span class="pill">${IC.crystal}${fmt(s.crystals)}</span></div>
    <div class="body">
      <div class="logo"><div class="cats"><img src="${catPortrait('ninja', 184)}" alt=""><img src="${catPortrait('commander', 224)}" alt=""><img src="${catPortrait('scout', 184)}" alt=""></div>
        <h1>CATS <span>TOWER</span><br>DEFENSE</h1><p>Paws Against the Pack</p></div>
      <button class="btn go big" data-go="play" style="margin-top:14px">▶ ${tr('SPIELEN', 'PLAY')}</button>
      ${d.ready ? `<button class="card row" data-go="missions" style="width:100%;text-align:left;outline:2px solid var(--gold);outline-offset:-2px"><span style="font-size:30px">🎁</span><span class="grow"><b>${tr('Tägliche Belohnung abholbereit!', 'Daily reward ready!')}</b><br><span class="mut">${tr('Tag', 'Day')} ${d.day + 1} ${tr('von 7', 'of 7')}</span></span><span class="btn sm ok">${tr('Abholen', 'Claim')}</span></button>`
        : `<div class="card row"><span style="font-size:26px">⏳</span><span class="grow mut">${tr('Nächste Belohnung in', 'Next reward in')} <b style="color:#fff">${fmtTime(d.msLeft, this.app.lang)}</b></span></div>`}
      <div class="tiles">
        ${tile('cats', '🐱', tr('Katzen', 'Cats'), `${Object.keys(s.cats).length}/${CAT_IDS.length} ${tr('freigeschaltet', 'unlocked')}`, buyable)}
        ${tile('academy', '🎓', tr('Katzen-Akademie', 'Cat Academy'), tr('Dauerhafte Upgrades', 'Permanent upgrades'))}
        ${tile('play', '🗺️', 'Maps', `${MAPS.filter(m => mapUnlocked(s, m.id)).length}/${MAPS.length} ${tr('offen', 'open')}`)}
        ${tile('missions', '📋', tr('Missionen', 'Missions'), tr('Täglich neu', 'New every day'), cl.missions + cl.daily)}
        ${tile('shop', '🛒', 'Shop', tr('Power-ups & Freischaltungen', 'Power-ups & unlocks'))}
        ${tile('ach', '🏆', 'Achievements', tr('Erfolge & Statistik', 'Achievements & stats'), cl.ach)}
        ${tile('mp', '👥', 'Multiplayer', tr('Koop für 2–4', 'Co-op for 2–4'))}
        ${tile('settings', '⚙️', tr('Einstellungen', 'Settings'), 'v' + this.app.version)}
      </div>
      <p class="mut center" style="margin-top:14px">${tr('Alles im Spiel wird erspielt – kein Echtgeld, kein Pay-to-Win.', 'Everything is earned by playing – no real money, no pay-to-win.')}</p>
    </div>`;
  }

  // ====================================================================== Spielen: Map, Schwierigkeit, Trupp
  play() {
    const s = this.s, tr = this.tr.bind(this);
    if (!this.sel) { this.sel = { map: mapUnlocked(s, s.lastMap) ? s.lastMap : 'city', diff: s.lastDiff || 'easy' }; this.fresh = true; }
    const sel = this.sel, M = MAP_BY_ID[sel.map];
    if (!diffUnlocked(s, sel.map, sel.diff)) sel.diff = 'easy';
    const maps = MAPS.map(m => {
      const open = mapUnlocked(s, m.id);
      const stars = DIFFS.map(d => cleared(s, m.id, d) ? '<b>★</b>' : '★').join('');
      return `<button class="map ${m.id === sel.map ? 'on' : ''} ${open ? '' : 'locked'}" data-map="${m.id}"><canvas data-map="${m.id}" width="120" height="160"></canvas>${open ? '' : `<span class="lock">${IC.lock} Level ${m.lvl}</span>`}<div>${this.L(m.n)}</div><div class="stars">${stars}</div></button>`;
    }).join('');
    const D = d => BALANCE.difficulty[d];
    const diffs = [...DIFFS, 'endless'].map(d => {
      const open = diffUnlocked(s, sel.map, d);
      const sub = d === 'endless' ? (s.maps[sel.map] && s.maps[sel.map].endless ? `${tr('Rekord', 'Best')} ${s.maps[sel.map].endless}` : '∞') : `${D(d).waves} ${tr('Wellen', 'waves')}`;
      const why = d === 'hard' ? `Lv. ${D('hard').minLevel} + Normal` : d === 'endless' ? `Lv. ${BALANCE.reward.endlessFrom} + Normal` : '';
      return `<button class="${sel.diff === d ? 'on' : ''} ${open ? '' : 'locked'}" data-diff="${d}">${open ? '' : IC.lock}${this.L(DIFF_N[d])}<small>${open ? sub : why}</small></button>`;
    }).join('');
    const dd = sel.diff === 'endless' ? 'normal' : sel.diff;
    const mods = [M.high && tr('Hochsitze', 'High seats'), M.power && tr('Energiefelder', 'Power tiles'), M.fast && tr('Schnell-Abschnitt', 'Speed lane'), M.paths.length > 1 && tr('2 Wege', '2 lanes'), ...(Object.entries(M.mods || {}).map(([k, v]) => `${this.L(DMG_TYPES[k])} ${v > 1 ? '+' : ''}${Math.round((v - 1) * 100)} %`))].filter(Boolean);
    return this.head(tr('Einsatz wählen', 'Choose mission')) + `<div class="body">
      <div class="maps">${maps}</div>
      <div class="card"><h3>${this.L(M.n)} <span class="mut">· Boss: ${this.L(DOGS[M.boss].n)}</span></h3><div class="mut">${this.L(M.d)}</div><div style="margin-top:4px">${mods.map(m => `<span class="tag">${m}</span>`).join('')}</div>
        <div class="diffs" style="margin-top:10px">${diffs}</div>
        <div class="mut" style="margin-top:8px">${tr('Belohnung', 'Reward')}: ${IC.coin}×${D(dd).coins} · ${IC.crystal}${Math.round(D(dd).crystals * (1 + M.idx * .08))} · ${IC.heart}${D(dd).lives} ${tr('Leben', 'lives')}</div></div>
      ${this.squadCard()}
      <button class="btn go big" data-act="start" style="margin-top:14px" ${mapUnlocked(s, sel.map) ? '' : 'disabled'}>▶ START</button>
    </div>`;
  }
  squadCard() {
    const s = this.s, tr = this.tr.bind(this), size = loadoutSize(s), slots = powerSlots(s);
    const cats = CAT_IDS.filter(id => s.cats[id]).map(id => `<button class="chip ${s.loadout.includes(id) ? 'on' : ''}" data-squad="${id}"><img src="${catPortrait(id, 120)}" alt="">${CATS[id].n.replace(' Cat', '')}</button>`).join('');
    const pws = POWER_IDS.filter(id => s.level >= POWERUPS[id].lvl).map(id => `<button class="chip ${s.powerLoad.includes(id) ? 'on' : ''}" data-pload="${id}"><span class="n">${s.powers[id] || 0}</span><div class="pic">${POWER_EMOJI[id]}</div>${this.L(POWERUPS[id].n).split(' ')[0]}</button>`).join('');
    return `<div class="card"><h3>${tr('Dein Trupp', 'Your squad')} <span class="mut">${s.loadout.length}/${size}</span></h3><div class="squad">${cats}</div>
      <h3 style="margin-top:12px">Power-ups <span class="mut">${s.powerLoad.filter(id => s.level >= POWERUPS[id].lvl).length}/${slots} · ${tr('je max. 3 Einsätze pro Runde', 'max. 3 uses each per round')}</span></h3><div class="squad">${pws}</div></div>`;
  }

  // ====================================================================== Katzen
  cats() {
    const s = this.s, tr = this.tr.bind(this);
    const cards = CAT_IDS.map(id => {
      const c = CATS[id], own = s.cats[id], lvlOk = s.level >= c.unlock.lvl, legend = c.cls.includes('legend');
      const sub = own ? (own.r ? `${tr('Rang', 'Rank')} ${own.r}` : tr('Bereit', 'Ready')) : lvlOk ? costHtml(catCost(c)) : `${IC.lock} Level ${c.unlock.lvl}`;
      return `<button class="cat ${own ? '' : lvlOk ? 'buy' : 'locked'} ${legend ? 'legend' : ''}" data-cat="${id}"><img src="${catPortrait(id, 168)}" alt="">${c.n}<small>${sub}</small></button>`;
    }).join('');
    const tab = this.tab.cats || 'cats';
    const dogs = DOG_IDS.map(id => { const d = DOGS[id]; return `<div class="item"><span class="em"><img src="${dogPortrait(id, 104)}" alt=""></span><div class="grow"><b>${this.L(d.n)}${d.boss ? ' 👑' : ''}</b><span class="mut">${this.L(d.d)}</span><span class="mut">${tr('LP', 'HP')} ${d.hp} · ${tr('Tempo', 'Speed')} ${d.speed}${d.armor ? ` · ${tr('Rüstung', 'Armor')} ${d.armor}` : ''}${d.from < 99 && !d.boss ? ` · ${tr('ab Welle', 'from wave')} ${d.from}` : ''}</span></div></div>`; }).join('');
    return this.head(tr('Katzen', 'Cats')) + `<div class="body"><div class="tabs"><button class="${tab === 'cats' ? 'on' : ''}" data-tab="cats:cats">🐱 ${tr('Katzen', 'Cats')}</button><button class="${tab === 'dogs' ? 'on' : ''}" data-tab="cats:dogs">🐶 ${tr('Hunde-Lexikon', 'Dog index')}</button></div>
      ${tab === 'cats' ? `<div class="grid" style="margin-top:8px">${cards}</div>` : dogs}</div>`;
  }
  catModal(id) {
    const s = this.s, c = CATS[id], own = s.cats[id], tr = this.tr.bind(this), lang = this.app.lang, st = computeStats(c, [0, 0, 0], own ? playerBonus(s) : undefined);
    const lvlOk = s.level >= c.unlock.lvl, cost = catCost(c);
    const paths = c.paths.map((p, i) => `<div class="path"><h4><i style="background:${PATH_COL[i]}"></i>${this.L(p.n)}</h4>${p.tiers.map((t, j) => `<div class="tier"><b>${j + 1}. ${t[lang]}</b><span>${describeFx(t[3], lang)}</span><em>${IC.fish}${t[2]}</em></div>`).join('')}</div>`).join('');
    const attacker = st.atk !== 'eco' && st.atk !== 'support';
    const action = own ? `<button class="btn wide" data-go="academy" data-close>🎓 ${tr('Rang', 'Rank')} ${own.r}/${RANK.max} – ${tr('zur Akademie', 'to the Academy')}</button>`
      : lvlOk ? `<button class="btn go wide" data-buycat="${id}">${tr('Freischalten', 'Unlock')} &nbsp;${costHtml(cost)}</button>`
        : `<button class="btn wide" disabled>${IC.lock} ${tr('Ab Spielerlevel', 'From player level')} ${c.unlock.lvl} · ${costHtml(cost)}</button>`;
    this.app.modal(`<button class="x" data-close>✕</button><div class="hero"><img src="${catPortrait(id, 220)}" alt=""><div><h2>${c.n}</h2>${c.cls.map(k => `<span class="tag t-${k}">${this.L(CLASSES[k])}</span>`).join('')}<p class="mut" style="margin:6px 0 0">${this.L(c.d)}</p></div></div>
      <div class="stats"><div>${IC.fish}${c.cost}<small>${tr('Kosten', 'Cost')}</small></div>${attacker ? `<div>${Math.round(st.dmg * 10) / 10}<small>${tr('Schaden', 'Damage')}</small></div><div>${Math.round(st.rate * 100) / 100}/s<small>${tr('Tempo', 'Speed')}</small></div>` : `<div>–<small>${tr('Schaden', 'Damage')}</small></div><div>–<small>${tr('Tempo', 'Speed')}</small></div>`}<div>${Math.round(st.range * 10) / 10}<small>${tr('Reichweite', 'Range')}</small></div></div>
      <div class="mut">${attacker ? `${tr('Schadensart', 'Damage type')}: <b style="color:#fff">${this.L(DMG_TYPES[st.type])}</b> · ` : ''}${tr('5 Trainingspunkte pro Katze, nur EIN Pfad bis zur Meisterstufe (3).', '5 training points per cat, only ONE path can reach mastery (3).')}</div>
      ${paths}<div style="margin-top:14px">${action}</div>`);
  }

  // ====================================================================== Akademie
  academy() {
    const s = this.s, tr = this.tr.bind(this), tab = this.tab.academy || 'research';
    let body;
    if (tab === 'research') body = RESEARCH_IDS.map(id => {
      const R = RESEARCH[id], lv = s.research[id] || 0, max = lv >= R.max, locked = s.level < R.lvl, cost = max ? null : R.cost(lv);
      return `<div class="item"><div class="grow"><b>${this.L(R.n)} <span class="mut" style="display:inline">${lv}/${R.max}</span></b><span class="mut">${this.L(R.d)}</span><div class="pips">${Array.from({ length: R.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div></div>
        ${max ? `<span class="tag">MAX</span>` : locked ? `<span class="tag">${IC.lock} Lv. ${R.lvl}</span>` : `<button class="btn sm ${canAfford(s, cost) ? 'ok' : 'off'}" data-research="${id}">${costHtml(cost)}</button>`}</div>`;
    }).join('');
    else body = (s.level < 3 ? `<div class="card mut">${IC.lock} ${tr('Katzen-Ränge gibt es ab Spielerlevel 3.', 'Cat ranks unlock at player level 3.')}</div>` : '') + CAT_IDS.filter(id => s.cats[id]).map(id => {
      const r = s.cats[id].r, max = r >= RANK.max, cost = max ? null : RANK.cost(r);
      const perk = Object.keys(RANK.perks).map(Number).find(l => l > r);
      return `<div class="item"><span class="em"><img src="${catPortrait(id, 104)}" alt=""></span><div class="grow"><b>${CATS[id].n} <span class="mut" style="display:inline">${tr('Rang', 'Rank')} ${r}/${RANK.max}</span></b><span class="mut">+${Math.round(r * RANK.dmg * 100)} % ${tr('Schaden', 'damage')} · +${(r * RANK.rate * 100).toFixed(1)} % ${tr('Tempo', 'speed')}${perk ? ` · ${tr('Rang', 'Rank')} ${perk}: ${this.L(RANK.perks[perk].n)}` : ''}</span><div class="pips">${Array.from({ length: RANK.max }, (_, i) => `<i class="${i < r ? 'on' : ''}"></i>`).join('')}</div></div>
        ${max ? `<span class="tag">MAX</span>` : `<button class="btn sm ${s.level >= 3 && canAfford(s, cost) ? 'ok' : 'off'}" data-rank="${id}">${costHtml(cost)}</button>`}</div>`;
    }).join('');
    return this.head(tr('Katzen-Akademie', 'Cat Academy')) + `<div class="body"><p class="mut" style="margin:0 0 6px">${tr('Dauerhafte Verbesserungen für dein Konto – sie gelten in jeder Runde.', 'Permanent improvements for your account – they apply in every round.')}</p>
      <div class="tabs"><button class="${tab === 'research' ? 'on' : ''}" data-tab="academy:research">🔬 ${tr('Allgemeine Forschung', 'General research')}</button><button class="${tab === 'ranks' ? 'on' : ''}" data-tab="academy:ranks">⭐ ${tr('Katzen-Ränge', 'Cat ranks')}</button></div>${body}</div>`;
  }

  // ====================================================================== Missionen + tägliche Belohnung
  missions() {
    const s = this.s, tr = this.tr.bind(this), d = dailyState(s), lang = this.app.lang;
    const days = DAILY.map((r, i) => `<div class="day ${i < d.day ? 'got' : i === d.day ? 'now' : ''}">${tr('Tag', 'Day')} ${i + 1}<b>${r.coins && r.crystals ? '🎁' : r.coins ? '🪙' : r.crystals ? '💎' : '⚡'}</b>${r.coins ? fmt(r.coins) : r.crystals ? r.crystals : '×' + r.power}</div>`).join('');
    const list = s.missions.list.map((m, i) => {
      const def = missionDef(m.id), ready = m.p >= m.n && !m.claimed;
      return `<div class="item ${m.claimed ? 'done' : ready ? 'ready' : ''}"><span class="em">${m.claimed ? '✅' : '📋'}</span><div class="grow"><b>${this.L(def.t).replace('{n}', m.n)}</b><span class="mut">${rewardHtml(missionReward(m))}</span><div class="bar" style="margin-top:5px"><i style="width:${Math.min(100, m.p / m.n * 100)}%"></i></div></div>
        ${m.claimed ? '' : ready ? `<button class="btn sm ok" data-mission="${i}">${tr('Abholen', 'Claim')}</button>` : `<span class="mut">${fmt(m.p)}/${fmt(m.n)}</span>`}</div>`;
    }).join('');
    return this.head(tr('Missionen', 'Missions')) + `<div class="body">
      <div class="card"><h3>🎁 ${tr('Tägliche Belohnung', 'Daily reward')} <span class="mut">· ${tr('Serie', 'Streak')} ${d.streak}</span></h3><div class="days">${days}</div>
        ${d.ready ? `<button class="btn ok wide" data-act="daily">${tr('Belohnung abholen', 'Claim reward')}</button>` : `<div class="center mut">⏳ ${tr('Noch', 'Next reward in')} <b style="color:#fff">${fmtTime(d.msLeft, lang)}</b>${tr(' bis zur nächsten Belohnung', '')}</div>`}</div>
      <h3 style="margin:16px 0 0">📋 ${tr('Tägliche Missionen', 'Daily missions')} <span class="mut">· ${tr('neue in', 'new in')} ${fmtTime(msToMidnight(Date.now()), lang)}</span></h3>${list}</div>`;
  }

  // ====================================================================== Shop
  shop() {
    const s = this.s, tr = this.tr.bind(this);
    const pws = POWER_IDS.map(id => {
      const P = POWERUPS[id], locked = s.level < P.lvl;
      return `<div class="item"><span class="em">${POWER_EMOJI[id]}</span><div class="grow"><b>${this.L(P.n)} <span class="mut" style="display:inline">×${s.powers[id] || 0}</span></b><span class="mut">${this.L(P.d)}</span></div>${locked ? `<span class="tag">${IC.lock} Lv. ${P.lvl}</span>` : `<button class="btn sm ${s.coins >= P.price ? 'ok' : 'off'}" data-power="${id}">${costHtml({ coins: P.price })}</button>`}</div>`;
    }).join('');
    const ul = nextUnlocks(s.level, 8).map(u => `<div class="unlock"><span class="tag" style="margin:0">Lv. ${u.lvl}</span>${u.kind === 'cat' ? `<img src="${catPortrait(u.id, 76)}" alt="">` : { map: '🗺️', power: '⚡', research: '🔬', feature: '✨' }[u.kind]} <span>${this.L(u.n)}</span></div>`).join('');
    return this.head('Shop') + `<div class="body"><h3 style="margin:4px 0 0">⚡ Power-ups</h3>${pws}
      <h3 style="margin:18px 0 0">🔓 ${tr('Nächste Freischaltungen', 'Upcoming unlocks')}</h3>${ul || `<p class="mut">${tr('Alles freigeschaltet!', 'Everything unlocked!')}</p>`}
      <div class="card mut" style="margin-top:16px">💛 ${tr('Kein Echtgeld-Shop. Münzen und Kristalle gibt es nur durchs Spielen. Falls je ein Shop kommt, dann nur für Kosmetik.', 'No real-money shop. Coins and crystals come from playing only. If a shop ever arrives, it will be cosmetics only.')}</div></div>`;
  }

  // ====================================================================== Erfolge + Statistik
  ach() {
    const s = this.s, tr = this.tr.bind(this), lang = this.app.lang, tab = this.tab.ach || 'ach';
    let body;
    if (tab === 'ach') body = achState(s).sort((a, b) => (b.ready - a.ready) || (a.max - b.max)).map(x => {
      const a = x.a, i = Math.min(x.tier, a.n.length - 1);
      return `<div class="item ${x.max ? 'done' : x.ready ? 'ready' : ''}"><span class="em">${x.max ? '🏆' : '🎖️'}</span><div class="grow"><b>${a.t[lang][i]} <span class="mut" style="display:inline">${'★'.repeat(x.tier)}${'☆'.repeat(a.n.length - x.tier)}</span></b><span class="mut">${this.L(a.d).replace('{n}', fmt(a.n[i]))}</span><div class="bar" style="margin-top:5px"><i style="width:${Math.min(100, x.val / x.goal * 100)}%"></i></div></div>
        ${x.max ? '' : x.ready ? `<button class="btn sm ok" data-ach="${a.id}">${IC.crystal}${a.r[x.tier]}</button>` : `<span class="mut">${fmt(x.val)}/${fmt(x.goal)}<br>${IC.crystal}${a.r[x.tier]}</span>`}</div>`;
    }).join('');
    else {
      const rows = [['games', 'Runden gespielt', 'Rounds played'], ['wins', 'Siege', 'Wins'], ['kills', 'Hunde besiegt', 'Dogs defeated'], ['bossKills', 'Bosse besiegt', 'Bosses defeated'], ['waves', 'Wellen überstanden', 'Waves survived'], ['perfectWins', 'Makellose Siege', 'Flawless wins'], ['hardWins', 'Siege auf Schwer', 'Hard wins'], ['mpGames', 'Koop-Runden', 'Co-op rounds'], ['mpWins', 'Koop-Siege', 'Co-op wins'], ['placed', 'Katzen eingesetzt', 'Cats deployed'], ['upgrades', 'Upgrades gekauft', 'Upgrades bought'], ['powerUsed', 'Power-ups benutzt', 'Power-ups used'], ['coinsEarned', 'Münzen verdient', 'Coins earned'], ['bestEndless', 'Beste Endlos-Welle', 'Best endless wave'], ['bestStreak', 'Längste Login-Serie', 'Longest login streak']];
      body = `<div class="card">${rows.map(([k, de, en]) => `<div class="field"><span>${tr(de, en)}</span><b>${fmt(statValue(s, k))}</b></div>`).join('')}</div>`;
    }
    return this.head('Achievements') + `<div class="body"><div class="tabs"><button class="${tab === 'ach' ? 'on' : ''}" data-tab="ach:ach">🏆 ${tr('Erfolge', 'Achievements')}</button><button class="${tab === 'stats' ? 'on' : ''}" data-tab="ach:stats">📊 ${tr('Statistik', 'Statistics')}</button></div>${body}</div>`;
  }

  // ====================================================================== Einstellungen
  settings() {
    const st = this.s.settings, tr = this.tr.bind(this);
    const sel = (k, opts) => `<select data-set="${k}">${opts.map(([v, t]) => `<option value="${v}" ${String(st[k]) === String(v) ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
    return this.head(tr('Einstellungen', 'Settings')) + `<div class="body"><div class="card">
      <div class="field"><span>🎵 ${tr('Musik', 'Music')}</span><input type="range" min="0" max="1" step="0.05" value="${st.music}" data-set="music"></div>
      <div class="field"><span>🔊 ${tr('Soundeffekte', 'Sound effects')}</span><input type="range" min="0" max="1" step="0.05" value="${st.sfx}" data-set="sfx"></div>
      <div class="field"><span>🖼️ ${tr('Grafikqualität', 'Graphics quality')}</span>${sel('quality', [['auto', 'Auto'], ['low', tr('Niedrig', 'Low')], ['high', tr('Hoch', 'High')]])}</div>
      <div class="field"><span>✨ ${tr('Effekte', 'Effects')}</span>${sel('fx', [[true, tr('An', 'On')], [false, tr('Reduziert', 'Reduced')]])}</div>
      <div class="field"><span>📳 ${tr('Bildschirm-Wackeln', 'Screen shake')}</span>${sel('shake', [[true, tr('An', 'On')], [false, tr('Aus', 'Off')]])}</div>
      <div class="field"><span>🎞️ FPS</span>${sel('fps', [[60, '60'], [30, '30 (' + tr('spart Akku', 'saves battery') + ')']])}</div>
      <div class="field"><span>🌐 ${tr('Sprache', 'Language')}</span>${sel('lang', [['de', 'Deutsch'], ['en', 'English']])}</div>
      <div class="field"><span>⛶ ${tr('Vollbild', 'Fullscreen')}</span><button class="btn sm" data-act="fullscreen">${tr('Umschalten', 'Toggle')}</button></div>
      <div class="field"><span>🏷️ ${tr('Spielername', 'Player name')}</span><input type="text" maxlength="14" value="${this.s.name}" data-set="name"></div></div>
      <div class="card"><h3>💾 ${tr('Spielstand', 'Save data')}</h3><p class="mut">${tr('Der Spielstand liegt auf diesem Gerät (mit automatischer Sicherungskopie). Mit dem Code ziehst du auf ein anderes Gerät um.', 'Your save lives on this device (with an automatic backup copy). Use the code to move to another device.')}</p>
      <div class="row"><button class="btn sm grow" data-act="export">${tr('Code kopieren', 'Copy code')}</button><button class="btn sm grow" data-act="import">${tr('Code laden', 'Load code')}</button><button class="btn sm bad" data-act="reset">${tr('Löschen', 'Reset')}</button></div></div>
      <p class="mut center" style="margin-top:14px">Cats Tower Defense v${this.app.version}<br>${tr('Auf dem iPhone: Teilen → „Zum Home-Bildschirm“ für Vollbild.', 'On iPhone: Share → "Add to Home Screen" for fullscreen.')}</p></div>`;
  }

  // ====================================================================== Multiplayer-Lobby
  mp() {
    const tr = this.tr.bind(this), lb = this.lobby, s = this.s;
    if (!lb) return this.head('Multiplayer') + `<div class="body"><div class="card center"><div style="font-size:44px">👥</div><h3>${tr('Koop für bis zu 4 Spieler', 'Co-op for up to 4 players')}</h3>
      <p class="mut">${tr('Alle bauen gemeinsam auf einer Map und teilen sich die Leben. Jeder hat eigenes Futter und eigene Katzen – ihr könnt euch Futter schenken. Mehr Spieler = stärkere Hunde.', 'Everyone builds on one map and shares the lives. Each player has their own fish and cats – you can gift fish. More players = stronger dogs.')}</p>
      <button class="btn go wide" data-act="mpCreate">${tr('Raum erstellen', 'Create room')}</button></div>
      <div class="card"><h3>${tr('Mit Code beitreten', 'Join with code')}</h3><input class="code-in" id="mp-code" inputmode="numeric" maxlength="8" placeholder="CAT-0000"><button class="btn wide" data-act="mpJoin" style="margin-top:8px">${tr('Beitreten', 'Join')}</button></div>
      <p class="mut center">${tr('Beide Geräte brauchen Internet. Verbindung direkt von Gerät zu Gerät (WebRTC).', 'Both devices need internet. Direct device-to-device connection (WebRTC).')}</p></div>`;
    const players = lb.players.map((p, i) => `<div class="player"><i style="background:${OWNER_COL[i]}"></i><b class="grow">${p.setup.name}</b><span class="mut">Lv. ${p.level}${i === 0 ? ' · ' + tr('Gastgeber', 'Host') : ''}</span></div>`).join('');
    const n = lb.players.length, MP = BALANCE.multiplayer;
    const mapSel = lb.isHost ? `<div class="field"><span>Map</span><select data-lobby="map">${MAPS.filter(m => mapUnlocked(s, m.id)).map(m => `<option value="${m.id}" ${m.id === lb.mapId ? 'selected' : ''}>${this.L(m.n)}</option>`).join('')}</select></div>
      <div class="field"><span>${tr('Schwierigkeit', 'Difficulty')}</span><select data-lobby="diff">${DIFFS.filter(d => d !== 'hard' || s.level >= BALANCE.difficulty.hard.minLevel).map(d => `<option value="${d}" ${d === lb.diff ? 'selected' : ''}>${this.L(DIFF_N[d])}</option>`).join('')}</select></div>`
      : `<div class="field"><span>Map</span><b>${this.L(MAP_BY_ID[lb.mapId].n)}</b></div><div class="field"><span>${tr('Schwierigkeit', 'Difficulty')}</span><b>${this.L(DIFF_N[lb.diff])}</b></div>`;
    return this.head('Multiplayer') + `<div class="body"><div class="card center"><div class="mut">ROOM CODE</div><div class="code">${lb.code}</div><button class="btn sm" data-act="mpCopy">${tr('Code kopieren', 'Copy code')}</button></div>
      <div class="card"><h3>${tr('Spieler', 'Players')} ${n}/4</h3>${players || `<p class="mut">${tr('Verbinde …', 'Connecting …')}</p>`}</div>
      <div class="card">${mapSel}<div class="mut" style="margin-top:6px">${tr('Gegnerstärke bei', 'Enemy strength with')} ${n} ${tr('Spielern', 'players')}: <b style="color:#fff">+${Math.round((MP.hp[Math.max(0, n - 1)] - 1) * 100)} % ${tr('LP', 'HP')}</b>, ${tr('Belohnung', 'rewards')} ×${MP.reward[Math.max(0, n - 1)]}</div></div>
      ${lb.isHost ? `<button class="btn go big" data-act="mpStart" style="margin-top:14px">▶ ${tr('SPIEL STARTEN', 'START GAME')}</button>` : `<p class="center mut" style="margin-top:14px">⏳ ${tr('Warte auf den Gastgeber …', 'Waiting for the host …')}</p>`}
      <button class="btn bad wide" data-act="mpLeave" style="margin-top:10px">${tr('Raum verlassen', 'Leave room')}</button></div>`;
  }
  newLobby() {
    const s = this.s, lb = this.lobby = new Lobby(playerSetup(s), s.level);
    lb.mapId = mapUnlocked(s, s.lastMap) ? s.lastMap : 'city';
    lb.onChange = () => { if (this.screen === 'mp' && !this.el.classList.contains('hidden')) this.redraw(); };
    lb.onError = why => { this.app.toast(why === 'full' ? this.tr('Der Raum ist voll (max. 4).', 'The room is full (max. 4).') : why === 'running' ? this.tr('Die Runde läuft schon.', 'The round already started.') : this.tr('Verbindung zum Gastgeber verloren.', 'Lost connection to the host.'), true); this.lobby = null; if (this.screen === 'mp') this.redraw(); };
    lb.onStart = session => { this.lobby = null; this.app.startSession(session); };
    return lb;
  }

  // ====================================================================== Eingaben
  click(e) {
    const t = e.target.closest('button,[data-go]'); if (!t) return;
    const d = t.dataset, s = this.s, app = this.app, tr = this.tr.bind(this);
    const fail = why => app.toast(this.L(WHY[why] || WHY.money), true);
    const done = (msg) => { app.audio.play('reward'); app.sm.save(); if (msg) app.toast(msg); this.redraw(); };
    if (d.go) return this.show(d.go);
    if (d.tab) { const [k, v] = d.tab.split(':'); this.tab[k] = v; return this.redraw(); }
    if (d.map && t.classList.contains('map')) { if (!mapUnlocked(s, d.map)) return app.toast(`${IC.lock} ${tr('Ab Spielerlevel', 'From player level')} ${MAP_BY_ID[d.map].lvl}`, true); this.sel.map = d.map; return this.redraw(); }
    if (d.diff) { if (!diffUnlocked(s, this.sel.map, d.diff)) return app.toast(d.diff === 'easy' || d.diff === 'normal' ? `${IC.lock} Level ${MAP_BY_ID[this.sel.map].lvl}` : tr('Erst diese Map auf Normal gewinnen (und Level erreichen).', 'Win this map on Normal first (and reach the level).'), true); this.sel.diff = d.diff; return this.redraw(); }
    if (d.squad) {
      const i = s.loadout.indexOf(d.squad);
      if (i >= 0) { if (s.loadout.length <= 1) return; s.loadout.splice(i, 1); } else { if (s.loadout.length >= loadoutSize(s)) return app.toast(tr('Trupp ist voll – erst eine Katze abwählen.', 'Squad is full – deselect a cat first.'), true); s.loadout.push(d.squad); }
      app.changed(); return this.redraw();
    }
    if (d.pload) {
      const i = s.powerLoad.indexOf(d.pload);
      if (i >= 0) s.powerLoad.splice(i, 1); else { s.powerLoad = s.powerLoad.filter(id => s.level >= POWERUPS[id].lvl); if (s.powerLoad.length >= powerSlots(s)) s.powerLoad.shift(); s.powerLoad.push(d.pload); }
      app.changed(); return this.redraw();
    }
    if (d.cat) return this.catModal(d.cat);
    if (d.research) { const r = buyResearch(s, d.research); return r ? fail(r) : done(); }
    if (d.rank) { const r = buyRank(s, d.rank); return r ? fail(r) : done(); }
    if (d.power) { const r = buyPower(s, d.power); return r ? fail(r) : done(); }
    if (d.mission) { const g = claimMission(s, +d.mission); if (g) { this.rewardPop(g); done(); } return; }
    if (d.ach) { const g = claimAch(s, d.ach); if (g) { this.rewardPop(g); done(); } return; }
    switch (d.act) {
      case 'start': {
        const sel = this.sel, mode = sel.diff === 'endless' ? 'endless' : 'campaign';
        return app.startSolo(sel.map, mode === 'endless' ? 'normal' : sel.diff, mode);
      }
      case 'daily': { const g = claimDaily(s); if (g) { this.rewardPop(g); done(); } return; }
      case 'fullscreen': { const el = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); else app.toast(tr('Auf dem iPhone: „Zum Home-Bildschirm“ hinzufügen.', 'On iPhone: add to Home Screen.')); return; }
      case 'export': { const code = app.sm.exportCode(); (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => app.toast(tr('Code kopiert!', 'Code copied!')), () => app.modal(`<button class="x" data-close>✕</button><h2>Code</h2><textarea style="width:100%;height:160px;user-select:text;-webkit-user-select:text">${code}</textarea>`, { mid: true })); return; }
      case 'import': {
        const m = app.modal(`<button class="x" data-close>✕</button><h2>${tr('Code laden', 'Load code')}</h2><p class="mut">${tr('Achtung: ersetzt den Spielstand auf diesem Gerät.', 'Warning: replaces the save on this device.')}</p><textarea id="imp" style="width:100%;height:120px;user-select:text;-webkit-user-select:text"></textarea><button class="btn go wide" id="imp-ok" style="margin-top:8px">OK</button>`, { mid: true });
        m.querySelector('#imp-ok').onclick = () => { if (app.sm.importCode(m.querySelector('#imp').value)) { app.save = app.sm.data; location.reload(); } else app.toast(tr('Der Code ist ungültig.', 'That code is invalid.'), true); };
        return;
      }
      case 'reset': {
        const m = app.modal(`<h2>${tr('Wirklich alles löschen?', 'Really delete everything?')}</h2><p class="mut">${tr('Level, Katzen und Währungen gehen verloren.', 'Level, cats and currencies will be lost.')}</p><div class="row"><button class="btn grow" data-close>${tr('Abbrechen', 'Cancel')}</button><button class="btn bad grow" id="rs">${tr('Löschen', 'Delete')}</button></div>`, { mid: true });
        m.querySelector('#rs').onclick = () => { app.sm.reset(); location.reload(); };
        return;
      }
      case 'mpCreate': { const lb = this.newLobby(); app.toast(tr('Erstelle Raum …', 'Creating room …')); lb.create().then(() => this.redraw(), () => { this.lobby = null; app.toast(tr('Raum konnte nicht erstellt werden. Internet prüfen.', 'Could not create room. Check your internet.'), true); this.redraw(); }); return; }
      case 'mpJoin': { const code = $('#mp-code').value, lb = this.newLobby(); app.toast(tr('Verbinde …', 'Connecting …')); lb.join(code).then(() => this.redraw(), err => { this.lobby = null; app.toast(err && err.message === 'code' ? tr('Bitte den 4-stelligen Code eingeben.', 'Please enter the 4-digit code.') : tr('Raum nicht gefunden.', 'Room not found.'), true); this.redraw(); }); return; }
      case 'mpCopy': { if (navigator.clipboard) navigator.clipboard.writeText(this.lobby.code).then(() => app.toast(tr('Code kopiert!', 'Code copied!')), () => {}); return; }
      case 'mpStart': return void this.lobby.start();
      case 'mpLeave': { if (this.lobby) this.lobby.leave(); this.lobby = null; return this.redraw(); }
    }
  }
  input(e) {
    const d = e.target.dataset, s = this.s, app = this.app;
    if (d.set) {
      let v = e.target.value; const k = d.set;
      if (k === 'name') { s.name = v.replace(/[<>&]/g, '').slice(0, 14) || 'Katze'; app.changed(); return; }
      if (k === 'music' || k === 'sfx') v = +v; else if (k === 'fps') v = +v; else if (v === 'true' || v === 'false') v = v === 'true';
      s.settings[k] = v; app.changed(); app.audio.volumes();
      if (k === 'sfx') app.audio.play('click');
      if (k === 'quality') app.qualityChanged();
      if (k === 'lang') { document.documentElement.lang = v; this.redraw(); }
    }
    if (d.lobby && this.lobby) { if (d.lobby === 'map') this.lobby.setMap(e.target.value, this.lobby.diff); else this.lobby.setMap(this.lobby.mapId, e.target.value); }
  }
  // Kauf einer Katze aus dem Fenster heraus
  buyCat(id) {
    const r = buyCat(this.s, id), app = this.app;
    if (r) return app.toast(this.L(WHY[r] || WHY.money), true);
    if (this.s.loadout.length < loadoutSize(this.s)) this.s.loadout.push(id);
    app.sm.save(); app.audio.play('levelup'); app.closeModal(); app.toast(`🎉 ${CATS[id].n} ${this.tr('ist jetzt in deinem Team!', 'joined your team!')}`); this.redraw();
  }
  rewardPop(g) {
    const tr = this.tr.bind(this), app = this.app;
    const pw = Object.keys(g.powers).map(id => `<div class="rew">${POWER_EMOJI[id]} ×${g.powers[id]}<small>${this.L(POWERUPS[id].n)}</small></div>`).join('');
    app.modal(`<p class="title-big win">${tr('Belohnung!', 'Reward!')}</p><div class="rewards">${g.coins ? `<div class="rew">${IC.coin} ${fmt(g.coins)}<small>${tr('Münzen', 'Coins')}</small></div>` : ''}${g.crystals ? `<div class="rew">${IC.crystal} ${g.crystals}<small>${tr('Kristalle', 'Crystals')}</small></div>` : ''}${g.xp ? `<div class="rew">${IC.xp} ${g.xp}<small>XP</small></div>` : ''}${pw}</div>${g.levels.length ? `<p class="center" style="color:var(--gold)">LEVEL UP! → ${g.levels[g.levels.length - 1]}</p>` : ''}<button class="btn go wide" data-close>OK</button>`, { mid: true });
  }
}

// Kauf-Knopf im Katzen-Fenster (liegt außerhalb von #menu)
document.addEventListener('click', e => { const b = e.target.closest('[data-buycat]'); if (b && window.CTD) window.CTD.menus.buyCat(b.dataset.buycat); const g = e.target.closest('#modal [data-go]'); if (g && window.CTD) window.CTD.menus.show(g.dataset.go); });

// Mini-Vorschau einer Map
function drawThumb(cv, m) {
  const c = cv.getContext('2d'), T = THEMES[m.theme], k = cv.width / 12;
  c.fillStyle = T.g; c.fillRect(0, 0, cv.width, cv.height);
  for (const [x, y, w, h] of m.water || []) { c.fillStyle = T.w; c.beginPath(); c.roundRect(x * k, y * k, w * k, h * k, k * .3); c.fill(); }
  c.lineJoin = c.lineCap = 'round';
  for (const [w, col] of [[k * .95, T.pe], [k * .7, T.p]]) { c.strokeStyle = col; c.lineWidth = w; for (const pts of m.paths) { c.beginPath(); pts.forEach(([x, y, tp], i) => { if (i === 0 || tp) c.moveTo((x + .5) * k, (y + .5) * k); else c.lineTo((x + .5) * k, (y + .5) * k); }); c.stroke(); } }
  for (const [x, y] of m.high || []) { c.fillStyle = '#b98a4a'; c.fillRect(x * k + 1, y * k + 1, k - 2, k - 2); }
  for (const [x, y] of m.power || []) { c.fillStyle = '#22d3ee'; c.fillRect(x * k + 1, y * k + 1, k - 2, k - 2); }
  for (const p of m.paths) { const [x, y] = p[p.length - 1]; c.fillStyle = '#e2466f'; c.beginPath(); c.arc(Math.min(11.5, Math.max(.5, x + .5)) * k, Math.min(15.5, Math.max(.5, y + .5)) * k, k * .55, 0, 7); c.fill(); }
}
