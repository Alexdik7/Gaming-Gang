// Online-Koop (Phase 2): gemeinsame Welt für bis zu 4 Spieler, Mitspieler auf der Karte,
// Freundschaftskämpfe (Kampflogik auf dem Server) und Tauschen.
import { Net } from '../net/net.js';
import { G, W, H, push, pop, text, box, wait, fade } from './engine.js';
import { say, ask, choose, party, inputName, waitMsg, evoScene } from './gbui.js';
import { monSprite } from './sprites.js';
import { battle } from './battle2d.js';
import { doubleBattle } from './double2d.js';
import { DoubleBattle } from '../battle/double.js';
import { COOP } from '../data/coop.js';
import { MOVES } from '../data/moves.js';
import { SPECIES } from '../data/creatures.js';
import { TYPES } from '../data/types.js';
import { ensureSpecies } from '../data/breeding.js';
import { monName, newUid, tradeEvo, evolve, giveXp } from '../data/mon.js';
import { sfx, cry } from '../core/audio.js';

const OPT = 'lu2-online';
const DEF_LOOK = { skin: '#e8b892', hair: '#2a1d16', outfit: '#3d8bfd', pants: '#2b2d42', accent: '#ffd36b' };
const load = () => { try { return JSON.parse(localStorage.getItem(OPT)) || {}; } catch { return {}; } };

export class Online {
  constructor(game) {
    this.g = game; this.net = new Net(); this.cfg = load();
    this.players = new Map(); this.waiters = []; this.reqs = []; this.world = null; this.members = [];
    this.last = performance.now(); this.sent = null;
    const n = this.net;
    n.on('*', m => this.dispatch(m));
    n.on('joined', m => { this.world = { code: m.code, name: m.name }; this.members = m.members; this.cfg.world = m.code; this.saveCfg(); this.sent = null; this.pos(true); });
    n.on('snap', m => this.snap(m.players));
    n.on('left', m => { const p = this.players.get(m.pid); if (p) this.g.ow?.notify(`${p.name} hat die Welt verlassen.`); this.players.delete(m.pid); });
    n.on('chat', m => { if (m.pid !== n.pid) this.g.ow?.notify(`${m.from}: ${m.text}`.slice(0, 44)); });
    n.on('req', m => this.reqs.push(m));
    n.on('err', m => this.g.ow?.notify(m.msg));
    n.on('status', st => { if (st === 'offline') this.players.clear(); });
    n.on('account', m => { n.acc = { pid: m.pid, secret: m.secret }; n.pid = m.pid; try { localStorage.setItem('lu-account', JSON.stringify(n.acc)); } catch {} });
  }
  saveCfg() { try { localStorage.setItem(OPT, JSON.stringify(this.cfg)); } catch {} }
  get on() { return this.net.online; }
  send(m) { this.net.send(m); }
  // Jede eingehende Nachricht kann auf ein wartendes Versprechen treffen
  dispatch(m) {
    const i = this.waiters.findIndex(w => w.types.includes(m.t));
    if (i >= 0) { const [w] = this.waiters.splice(i, 1); w.res(m); }
  }
  next(types, ms = 0) {
    return new Promise(res => {
      const w = { types, res }; this.waiters.push(w);
      if (ms) setTimeout(() => { const i = this.waiters.indexOf(w); if (i >= 0) { this.waiters.splice(i, 1); res({ t: 'timeout' }); } }, ms);
    });
  }

  // ---------------------------------------------------------- Verbindung
  defaultServer() {
    if (this.cfg.server) return this.cfg.server;
    if (location.protocol.startsWith('http') && !location.hostname.endsWith('github.io')) return location.origin;
    return '';
  }
  async connect(ask = true) {
    let url = this.defaultServer();
    if (!url || ask === 'change') {
      url = await inputName('Server-Adresse', url || 'https://', 120);
      if (!/^https?:\/\/|^wss?:\/\//.test(url)) url = 'https://' + url;
    }
    this.cfg.server = url.replace(/\/+$/, ''); this.saveCfg();
    try { await this.net.connect(this.cfg.server, this.g.state.name); return true; }
    catch { this.net.disconnect(); return false; }
  }
  char() { return { name: this.g.state.name, look: this.g.state.look }; }
  async autoJoin() {
    if (!this.cfg.server || !this.cfg.world || this.on) return;
    try { await this.net.connect(this.cfg.server, this.g.state.name); } catch { this.net.disconnect(); return; }
    this.net.join(this.cfg.world, this.char());
    const r = await this.next(['joined', 'err'], 8000);
    if (r.t === 'joined') this.g.ow.notify(`Online: ${r.name}`);
  }

  async menu() {
    const s = this.g.state;
    if (!this.on) {
      const items = ['WELT ERSTELLEN', 'WELT BEITRETEN', ...(this.cfg.world ? ['LETZTE WELT'] : []), 'SPIELSTAND HOLEN', 'SERVER ÄNDERN', 'ZURÜCK'];
      const i = await choose(items, { title: 'ONLINE' }); const k = items[i];
      if (i === null || k === 'ZURÜCK') return;
      if (k === 'SERVER ÄNDERN') { this.cfg.server = ''; await this.connect('change'); this.net.disconnect(); return this.menu(); }
      let close = waitMsg('Verbinde mit dem Weltserver');
      const ok = await this.connect(); close();
      if (!ok) { await say(['Keine Verbindung zum Weltserver.', 'Prüfe die Adresse unter „SERVER ÄNDERN“. Anleitung: docs/MULTIPLAYER.md']); return; }
      if (k === 'SPIELSTAND HOLEN') return this.redeem();
      if (k === 'WELT ERSTELLEN') this.net.create(`${s.name}s Welt`, this.char());
      else if (k === 'LETZTE WELT') this.net.join(this.cfg.world, this.char());
      else { const code = (await inputName('Welt-Code (6 Zeichen)', '', 6)).toUpperCase(); this.net.join(code, this.char()); }
      close = waitMsg('Betrete die Welt');
      const r = await this.next(['joined', 'err'], 10000); close();
      if (r.t !== 'joined') { this.net.disconnect(); await say(r.msg || 'Der Server antwortet nicht.'); return; }
      sfx('lvl');
      await say(k === 'WELT ERSTELLEN' ? [`Deine Welt ist online!`, `Welt-Code: ${r.code}`, 'Gib diesen Code deinen Freunden. Sie wählen ONLINE → WELT BEITRETEN.'] : [`Du bist jetzt in „${r.name}“!`, 'Stell dich vor einen Mitspieler und drücke A, um zu kämpfen oder zu tauschen.']);
      return;
    }
    const items = ['MITSPIELER', 'ZU FREUND REISEN', 'NACHRICHT', 'WELT-CODE', 'SICHERN', 'WIEDERHERSTELLEN', 'GERÄT WECHSELN', 'TRENNEN', 'ZURÜCK'];
    const i = await choose(items, { title: this.world?.name?.slice(0, 16) || 'ONLINE' }); const k = items[i];
    if (k === 'MITSPIELER') {
      const here = [...this.players.values()];
      await say(here.length ? here.map(p => `${p.name} – ${MAPNAME(p.map)}`) : 'Gerade ist niemand außer dir online.');
    }
    if (k === 'ZU FREUND REISEN') {
      const list = [...this.players.values()];
      if (!list.length) { await say('Gerade ist niemand außer dir online.'); return; }
      const c = await choose(list.map(p => ({ label: p.name, right: MAPNAME(p.map) })), { title: 'Zu wem?' });
      if (c === null) return;
      const p = list[c], ow = this.g.ow;
      sfx('whoosh'); await fade(1, 300);
      ow.load(p.map, p.x, p.y, 'down');
      const spot = [[0, 1], [1, 0], [-1, 0], [0, -1], [0, 2], [2, 0], [-2, 0]].map(([dx, dy]) => [p.x + dx, p.y + dy]).find(([x, y]) => !ow.solid(x, y) && !this.playerAt(p.map, x, y));
      if (spot) { ow.p.x = spot[0]; ow.p.y = spot[1]; ow.p.px = spot[0] * 16; ow.p.py = spot[1] * 16; ow.p.dir = spot[1] > p.y ? 'up' : spot[1] < p.y ? 'down' : spot[0] > p.x ? 'left' : 'right'; }
      this.pos(true);
      await fade(0, 300);
      return;
    }
    if (k === 'NACHRICHT') { const t = await inputName('Nachricht an alle', '', 60); if (t) { this.send({ t: 'chat', text: t }); this.g.ow.notify(`Du: ${t}`.slice(0, 44)); } }
    if (k === 'WELT-CODE') await say([`Welt-Code: ${this.world.code}`, 'Mit diesem Code können bis zu drei Freunde beitreten.']);
    if (k === 'SICHERN') { this.g.save(true); const r = await this.backup(true); await say(r ? 'Dein Spielstand ist jetzt auch auf dem Weltserver gesichert.' : 'Die Sicherung hat nicht geklappt.'); }
    if (k === 'WIEDERHERSTELLEN') {
      this.send({ t: 'load' }); const r = await this.next(['loaded'], 8000);
      if (!r.data) { await say('Auf dem Server liegt noch keine Sicherung von dir.'); return; }
      const when = new Date(r.at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
      if (await ask(`Sicherung vom ${when} laden (${r.data.team.length} Kreaturen, ${r.data.badges?.length || 0} Orden)? Der aktuelle Stand wird ersetzt.`)) this.useSave(r.data);
    }
    if (k === 'GERÄT WECHSELN') {
      this.g.save(true); await this.backup(true);
      this.send({ t: 'transferCode' }); const r = await this.next(['transferCode'], 8000);
      if (r.t !== 'transferCode') { await say('Der Server antwortet nicht.'); return; }
      await say([`Dein Übertragungs-Code: ${r.code}`, 'Auf dem neuen Gerät: Spiel öffnen → START → ONLINE → SPIELSTAND HOLEN → Code eingeben.', 'Der Code gilt 15 Minuten. Danach ist dieses Gerät abgemeldet.']);
    }
    if (k === 'TRENNEN') { this.net.disconnect(); this.cfg.world = ''; this.saveCfg(); this.players.clear(); await say('Du spielst jetzt wieder allein.'); }
  }

  // ---------------------------------------------------------- Sicherung auf dem Server
  async backup(wait = false) {
    if (!this.on) return false;
    const now = Date.now(); if (!wait && now - (this.lastBackup || 0) < 15000) return false;
    this.lastBackup = now;
    this.send({ t: 'save', data: this.g.state });
    if (!wait) return true;
    const r = await this.next(['saved', 'err'], 8000); return r.t === 'saved';
  }
  useSave(data) {
    try { localStorage.setItem('lu2-save', JSON.stringify(data)); } catch {}
    location.reload();
  }
  async redeem() {
    const code = (await inputName('Übertragungs-Code (8 Zeichen)', '', 8)).toUpperCase();
    if (!code) return;
    const close = waitMsg('Hole Spielstand');
    const ok = await this.connect(); if (!ok) { close(); await say('Keine Verbindung zum Weltserver.'); return; }
    this.send({ t: 'redeem', code });
    const r = await this.next(['account', 'redeemFail'], 8000); close();
    if (r.t !== 'account') { this.net.disconnect(); await say(r.msg || 'Der Server antwortet nicht.'); return; }
    if (r.world) { this.cfg.world = r.world; this.saveCfg(); }
    if (!r.save) { await say('Konto übertragen, aber es gab noch keine Sicherung. Tritt deiner Welt wieder bei.'); return; }
    await say(`Spielstand von ${r.save.name} gefunden. Das Spiel startet neu.`);
    this.useSave(r.save);
  }

  // ---------------------------------------------------------- Positionen
  pos(force) {
    if (!this.on || !this.g.ow?.p) return;
    const ow = this.g.ow, p = ow.p, x = p.moving ? p.tx : p.x, y = p.moving ? p.ty : p.y;
    const warp = !this.sent || this.sent.map !== ow.id || Math.abs(this.sent.x - x) + Math.abs(this.sent.y - y) > 2;
    if (!force && this.sent && this.sent.map === ow.id && this.sent.x === x && this.sent.y === y && this.sent.dir === p.dir) return;
    this.sent = { map: ow.id, x, y, dir: p.dir };
    this.send({ t: 'pos', ...this.sent, warp });
  }
  snap(list) {
    const seen = new Set();
    for (const r of list) {
      if (!r.map) continue;
      seen.add(r.pid);
      let p = this.players.get(r.pid);
      if (!p || p.map !== r.map) { p = { px: r.x * 16, py: r.y * 16, step: 0 }; this.players.set(r.pid, p); }
      Object.assign(p, { pid: r.pid, name: r.name, look: r.look, map: r.map, x: r.x, y: r.y, dir: r.dir, busy: r.busy });
    }
    for (const k of this.players.keys()) if (!seen.has(k)) this.players.delete(k);
  }
  // Für Overworld.draw: Mitspieler auf dieser Karte, weich interpoliert
  actors(mapId) {
    const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    const out = [];
    for (const p of this.players.values()) {
      if (p.map !== mapId) continue;
      const tx = p.x * 16, ty = p.y * 16, d = Math.hypot(tx - p.px, ty - p.py);
      if (d > 48) { p.px = tx; p.py = ty; }
      else if (d > 0) { const st = Math.min(d, 80 * dt); p.px += (tx - p.px) / d * st; p.py += (ty - p.py) / d * st; p.step += st; }
      const moving = d > 0.5;
      out.push({ look: { ...DEF_LOOK, ...(p.look || {}) }, dir: p.dir, frame: moving ? (Math.floor(p.step / 8) % 2 ? 1 : 2) : 0, px: Math.round(p.px), py: Math.round(p.py), x: p.x, y: p.y, name: p.name + (p.busy ? ' …' : '') });
    }
    return out;
  }
  playerAt(mapId, x, y) { for (const p of this.players.values()) if (p.map === mapId && p.x === x && p.y === y) return p; return null; }

  // ---------------------------------------------------------- Anfragen
  // Wird vom Overworld-Update aufgerufen, wenn der Spieler frei ist
  idle() {
    if (!this.reqs.length) return false;
    const r = this.reqs.shift(); const ow = this.g.ow; ow.busy = true;
    (async () => {
      try {
        sfx('encounter');
        const ok = await ask(r.kind === 'trade' ? `${r.name} möchte mit dir tauschen. Einverstanden?` : r.kind === 'coop' ? `${r.name} möchte mit dir zusammen gegen ${r.npcName} kämpfen! Mitmachen?` : r.kind === 'raid' ? `${r.name} lädt dich zum Raid gegen ${r.npcName} ein! Mitmachen?` : `${r.name} fordert dich zu einem Freundschaftskampf heraus! Annehmen?`);
        const team = this.g.state.team.filter(m => !m.egg);
        if (ok && r.kind !== 'trade' && !team.length) { this.send({ t: 'reqAns', to: r.from, ok: false }); await say('Du hast noch keine Kreaturen!'); return; }
        if (r.kind === 'raid') {
          this.send({ t: 'raidJoin', ok: ok && !!team.length, team });
          if (!ok) return;
          const close = waitMsg('Warte auf den Raid-Start');
          const m = await this.next(['coopStart', 'reqNo'], 40000); close();
          if (m.t === 'coopStart') await this.runCoop(m); else if (m.t === 'reqNo') await say(m.why);
          return;
        }
        this.send({ t: 'reqAns', to: r.from, ok, team: r.kind !== 'trade' ? team : undefined });
        if (!ok) return;
        if (r.kind === 'trade') { const m = await this.next(['tradeStart', 'tradeCancel'], 8000); if (m.t === 'tradeStart') await this.trade(m.with); }
        else if (r.kind === 'coop') { const m = await this.next(['coopStart', 'reqNo'], 8000); if (m.t === 'coopStart') await this.runCoop(m); }
        else { const m = await this.next(['duelStart', 'reqNo'], 8000); if (m.t === 'duelStart') await this.duel(m); }
      } finally { ow.busy = false; }
    })();
    return true;
  }
  async interact(p) {
    const s = this.g.state;
    const i = await choose(['KÄMPFEN', 'TAUSCHEN', 'ZURÜCK'], { title: p.name.slice(0, 14) });
    if (i === null || i === 2) return;
    const kind = i === 0 ? 'battle' : 'trade';
    const team = s.team.filter(m => !m.egg);
    if (!team.length) { await say('Du hast noch keine Kreaturen!'); return; }
    this.send({ t: 'req', to: p.pid, kind, team: kind === 'battle' ? team : undefined });
    const close = waitMsg(`Warte auf Antwort von ${p.name}`);
    const m = await this.next(['reqNo', 'tradeStart', 'duelStart'], 30000); close();
    if (m.t === 'timeout') { this.send({ t: 'tradeCancel' }); await say(`${p.name} antwortet nicht.`); return; }
    if (m.t === 'reqNo') { await say(m.why); return; }
    if (m.t === 'tradeStart') await this.trade(m.with);
    else await this.duel(m);
  }

  // ---------------------------------------------------------- Koop-Kampf (2 Spieler gegen Duo/Boss)
  partners() { return [...this.players.values()].filter(p => p.map === this.g.ow.id && !p.busy); }
  async coop(npc, p) {
    const team = this.g.state.team.filter(m => !m.egg);
    this.send({ t: 'req', to: p.pid, kind: 'coop', npc, team });
    const close = waitMsg(`Warte auf ${p.name}`);
    const m = await this.next(['reqNo', 'coopStart'], 30000); close();
    if (m.t === 'timeout') { await say(`${p.name} antwortet nicht.`); return null; }
    if (m.t === 'reqNo') { await say(m.why); return null; }
    return this.runCoop(m);
  }
  // Raid: Gastgeber lädt bis zu 3 Mitspieler ein; freie Plätze füllen KI-Helfer
  async raid(npc, partners) {
    const team = this.g.state.team.filter(m => !m.egg);
    this.send({ t: 'raidOpen', npc, team, invite: partners.slice(0, 3).map(p => p.pid) });
    const close = waitMsg('Warte auf die Mitspieler');
    const m = await this.next(['reqNo', 'coopStart'], 40000); close();
    if (m.t === 'timeout') { await say('Keine Antwort vom Server.'); return null; }
    if (m.t === 'reqNo') { await say(m.why); return null; }
    return this.runCoop(m);
  }
  async runCoop(m) {
    const d = COOP[m.npc], s = this.g.state;
    const b = new RemoteDouble(this, m);
    sfx('encounter'); await this.g.flashIn();
    const r = await doubleBattle(this.g, {
      b, remote: true, mine: [m.slot], bg: d.bg, boss: !!d.boss, title: d.name,
      trainers: d.looks ? d.looks.map(look => ({ look })) : null, ownLooks: m.looks.map(l => ({ ...DEF_LOOK, ...(l || {}) })),
    });
    this.g.ow.music();
    // EP auf die echten Kreaturen übertragen
    for (const [uid, amt] of Object.entries(r.xpLog || {})) {
      const mon = s.team.find(x => x.uid === uid); if (!mon) continue;
      for (const e of giveXp(mon, amt)) {
        if (e.t === 'lvl') await say(`${monName(mon)} erreicht Level ${e.lvl}!`);
        if (e.t === 'learn' && mon.moves.length < 4) { mon.moves.push({ id: e.id, pp: MOVES[e.id].pp }); await say(`${monName(mon)} hat ${MOVES[e.id].name} erlernt!`); }
        if (e.t === 'evo') {
          const name = monName(mon); sfx('evo');
          await evoScene(monSprite(mon.sp, 'front', mon.shiny, mon.mut), monSprite(e.to, 'front', mon.shiny, mon.mut), `${name} hat sich zu ${SPECIES[e.to].name} entwickelt!`);
          evolve(mon, e.to); this.g.markDex(e.to, true);
        }
      }
    }
    if (r.result === 'win') await this.g.coopReward(m.npc);
    else await say(r.result === 'lose' ? 'Ihr habt verloren… Gemeinsam schafft ihr es beim nächsten Mal!' : 'Der Kampf ist vorbei.');
    this.g.state.team.forEach(x => delete x._fainted);
    this.g.save(true);
    return r.result;
  }

  // ---------------------------------------------------------- Freundschaftskampf
  async duel(m) {
    const rb = new RemoteBattle(this, m);
    m.foeTeam.forEach(x => ensureSpecies(x.sp));
    sfx('encounter'); await this.g.flashIn();
    const r = await battle(this.g, { remote: rb, trainer: { name: m.foeName, look: { ...DEF_LOOK, ...(m.foeLook || {}) } }, canCatch: false, bg: 'arena' });
    this.g.ow.music();
    await say(r.result === 'win' ? `Du hast den Freundschaftskampf gegen ${m.foeName} gewonnen!` : r.result === 'lose' ? `${m.foeName} hat gewonnen. Gut gekämpft!` : 'Der Kampf ist vorbei.');
    await say('Im Freundschaftskampf werden deine Kreaturen nicht verletzt.');
  }

  // ---------------------------------------------------------- Tausch
  async trade(withName) {
    const s = this.g.state;
    const free = s.team.filter(m => !m.egg).length;
    await say(`Tausch mit ${withName}: Welche Kreatur bietest du an?`);
    const i = await party(s, { select: true, prompt: 'Was bietest du an?', filter: m => !m.egg && (free > 1) });
    if (i === null) { this.send({ t: 'tradeCancel' }); if (free <= 1) await say('Du brauchst mindestens zwei Kreaturen im Team, um zu tauschen.'); return; }
    const mine = s.team[i];
    this.send({ t: 'tradeOffer', mon: mine });
    let close = waitMsg(`Warte auf das Angebot von ${withName}`);
    let r = await this.next(['tradeShow', 'tradeCancel'], 120000); close();
    if (r.t !== 'tradeShow') { if (r.t === 'timeout') this.send({ t: 'tradeCancel' }); await say(r.why || 'Der Tausch wurde abgebrochen.'); return; }
    ensureSpecies(r.theirs.sp);
    const T = SPECIES[r.theirs.sp];
    const ok = await ask(`${withName} bietet ${monName(r.theirs)} (Lv ${r.theirs.lvl}, ${T.types.map(t => TYPES[t].name).join('/')}${r.theirs.mut ? ', Mutant' : ''}). Gegen ${monName(mine)} tauschen?`);
    this.send({ t: 'tradeOk', ok });
    if (!ok) return;
    close = waitMsg('Warte auf Bestätigung');
    r = await this.next(['tradeDone', 'tradeCancel'], 60000); close();
    if (r.t !== 'tradeDone') { await say(r.why || 'Der Tausch wurde abgebrochen.'); return; }
    const idx = s.team.findIndex(x => x.uid === r.give); if (idx < 0) return;
    const got = { ...r.get, uid: newUid() };
    ensureSpecies(got.sp);
    await tradeAnim(s.team[idx], got);
    s.team[idx] = got; this.g.markDex(got.sp, true);
    cry(SPECIES[got.sp].cry);
    await say([`${monName(got)} gehört jetzt zu deinem Team!`, `Pass gut auf ${monName(mine)} auf, ${withName}!`]);
    const to = tradeEvo(got);
    if (to) {
      ensureSpecies(to);
      await say(`Nanu? ${monName(got)} verändert sich durch den Tausch!`);
      const name = monName(got); sfx('evo');
      await evoScene(monSprite(got.sp, 'front', got.shiny, got.mut), monSprite(to, 'front', got.shiny, got.mut), `${name} hat sich zu ${SPECIES[to].name} entwickelt!`);
      evolve(got, to); cry(SPECIES[to].cry); this.g.markDex(to, true);
    }
    this.g.save(true);
  }
}

const MAPNAME = id => ({ moosgrund: 'Moosgrund', route1: 'Route 1', quellbach: 'Quellbach', altwald: 'Altwald', route2: 'Route 2', hoehle: 'Kieselhöhle', felsenau: 'Felsenau' })[id] || 'in einem Gebäude';

// Tauschanimation: eigene Kreatur fliegt hinaus, neue kommt herein
function tradeAnim(out, inn) {
  return new Promise(res => {
    const sOut = monSprite(out.sp, 'front', out.shiny, out.mut), sIn = monSprite(inn.sp, 'front', inn.shiny, inn.mut);
    let t = 0;
    const sc = {
      update(dt) { t += dt; if (t > 3.4) { pop(sc); res(); } },
      draw(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#203868'); g.addColorStop(1, '#58a0d8'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 24; i++) { const y = (i * 37 + t * 90) % H, x = (i * 53) % W; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x, y, 1, 3); }
        if (t < 1.5) ctx.drawImage(sOut, W / 2 - 32, 40 - Math.max(0, t - 0.6) * 140);
        else if (t > 1.8) ctx.drawImage(sIn, W / 2 - 32, Math.min(40, -70 + (t - 1.8) * 160));
        box(4, H - 30, W - 8, 26);
        text(t < 1.6 ? `Tschüss, ${monName(out)}!` : `Willkommen, ${monName(inn)}!`, 14, H - 22, '#28283a', 8.5);
      },
    };
    push(sc); sfx('whoosh'); setTimeout(() => sfx('evo'), 1800);
  });
}

// Spiegel eines Koop-Kampfes auf dem Server (gleiche Schnittstelle wie DoubleBattle)
class RemoteDouble extends DoubleBattle {
  constructor(on, m) {
    super({ slots: {} });
    this.o = on; this.mySlot = m.slot;
    for (const [id, d] of Object.entries(m.slots)) { d.pool.forEach(x => ensureSpecies(x.sp)); this.slots[id] = { ...d, st: {} }; }
  }
  async turn(acts) { this.o.send({ t: 'coopAct', a: acts[this.mySlot] }); return this.recv(); }
  async forcedSwitch(id, k) { this.o.send({ t: 'coopSwitch', i: k }); return this.recv(); }
  async recv() {
    const m = await this.o.next(['coopEv'], 300000);
    if (m.t === 'timeout' || !this.o.on) { this.over = true; this.result = 'draw'; return [{ t: 'msg', text: 'Die Verbindung zum Kampf ist abgerissen.' }]; }
    this.over = m.over; this.result = m.result; this.need = m.need || []; if (m.xpLog) this.xpLog = m.xpLog;
    return m.ev;
  }
  apply(e) {
    const id = e.slot;
    if (e.t === 'send' && e.mon) { ensureSpecies(e.mon.sp); const s = this.slots[id], k = s.pool.findIndex(x => x.uid === e.mon.uid); if (k >= 0) { s.pool[k] = e.mon; s.i = k; } }
    if (e.t === 'hp') this.mon(id).hp = e.hp;
    if (e.t === 'status') this.mon(id).status = e.status;
    if (e.t === 'move') { const sl = this.mon(id)?.moves.find(x => x.id === e.move); if (sl) sl.pp = Math.max(0, sl.pp - 1); }
    if (e.t === 'faint') this.mon(id)._fainted = true;
  }
}

// Spiegel eines Server-Kampfes mit derselben Schnittstelle wie Battle
class RemoteBattle {
  constructor(on, m) {
    this.o = on; this.team = m.team; this.foeTeam = m.foeTeam; this.pi = m.pi; this.fi = m.fi;
    this.over = false; this.result = null; this.pendingEvos = []; this.canCatch = false; this.wild = false; this.pvp = true;
    this.awaitSwitch = false; this.waitingOther = false; this.foeName = m.foeName;
  }
  get p() { return this.team[this.pi]; }
  get f() { return this.foeTeam[this.fi]; }
  mon(side) { return side === 'p' ? this.p : this.f; }
  async turn(a) { this.o.send({ t: 'duelAct', a }); return this.recv(); }
  async forcedSwitch(i) { this.o.send({ t: 'duelSwitch', i }); return this.recv(); }
  forfeit() { this.o.send({ t: 'duelQuit' }); }
  async recv() {
    const m = await this.o.next(['duelEv'], 180000);
    if (m.t === 'timeout' || !this.o.on) { this.over = true; this.result = 'draw'; return [{ t: 'msg', text: 'Die Verbindung zum Kampf ist abgerissen.' }, { t: 'end', result: 'draw' }]; }
    this.over = m.over; this.result = m.result;
    this.awaitSwitch = !m.over && m.phase === 'switch' && m.mine;
    this.waitingOther = !m.over && m.phase === 'switch' && !m.mine;
    return m.ev;
  }
  apply(e) {
    if (e.t === 'send' && e.mon) {
      ensureSpecies(e.mon.sp);
      const list = e.side === 'p' ? this.team : this.foeTeam, i = list.findIndex(x => x.uid === e.mon.uid);
      if (i >= 0) { list[i] = e.mon; if (e.side === 'p') this.pi = i; else this.fi = i; }
    }
    if (e.t === 'hp') this.mon(e.side).hp = e.hp;
    if (e.t === 'status') this.mon(e.side).status = e.status;
    if (e.t === 'move') { const sl = this.mon(e.side).moves.find(x => x.id === e.move); if (sl) sl.pp = Math.max(0, sl.pp - 1); }
  }
}
