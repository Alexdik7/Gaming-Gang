// Turbofieber – Rennen: Startpunkte in der Welt, KI-Rivalen, Checkpoints, Countdown, Wertung und Preisgeld.
import * as THREE from 'three';
import { roadCenter as rc } from './world.js';
import { ringAt, RING_LEN, MOUNTAIN } from './outskirts.js';
import { defaultCfg } from './cars.js';

const $ = id => document.getElementById(id);
const fmtT = t => { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };
const fmt = n => Math.round(n).toLocaleString('de-DE');
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

/* ---------- Strecken ---------- */
function ringCps(s0, n) {
  const o = {}, out = [];
  for (let k = 1; k <= n; k++) { ringAt(s0 + RING_LEN * k / n, -3.5, o); out.push([o.x, o.z]); }
  return out;
}
const RING_S0 = 448;
const ringStart = (() => { const o = {}; ringAt(RING_S0, -3.5, o); return { x: o.x, z: o.z, h: Math.atan2(o.tx, o.tz) }; })();
const mStart = MOUNTAIN[5], mNext = MOUNTAIN[10];

export const RACES = [
  { id: 'downtown', name: 'Downtown-Rundkurs', type: 'circuit', laps: 2, rivals: 3, reward: 1500, desc: '2 Runden um die Innenstadt gegen drei Rivalen.',
    start: [rc(3) + 40, rc(3)], cps: [[rc(6), rc(3)], [rc(6), rc(6)], [rc(3), rc(6)], [rc(3), rc(3)], [rc(3) + 40, rc(3)]], r: 13 },
  { id: 'zickzack', name: 'Zickzack-Sprint', type: 'sprint', rivals: 3, reward: 1300, desc: 'Quer durch Velara – jede Kreuzung zählt.',
    start: [rc(1) - 30, rc(1)], cps: [[rc(3), rc(1)], [rc(3), rc(3)], [rc(5), rc(3)], [rc(5), rc(5)], [rc(7), rc(5)], [rc(7), rc(7)], [rc(8), rc(7)], [rc(8), rc(8)]], r: 13 },
  { id: 'hafen', name: 'Hafen-Sprint', type: 'sprint', rivals: 3, reward: 1200, desc: 'Von der Innenstadt über die Ausfahrt bis an den Kai.',
    start: [rc(5), rc(7)], cps: [[rc(5), rc(5)], [rc(5), rc(3)], [rc(4), rc(3)], [rc(4), rc(1)], [rc(4), -430], [rc(4), -520], [rc(4), -640], [rc(4), -720]], r: 13 },
  { id: 'berg', name: 'Bergkönig', type: 'sprint', rivals: 3, reward: 2000, desc: 'Die Bergstraße hinauf – wer ist zuerst am Gipfel?',
    start: [mStart.x, mStart.z], heading: Math.atan2(mNext.x - mStart.x, mNext.z - mStart.z),
    cps: [40, 80, 120, 160, 200, 240, 280, 318].map(i => [MOUNTAIN[i].x, MOUNTAIN[i].z]), r: 10, path: 'mountain' },
  { id: 'highway', name: 'Highway-Zeitrennen', type: 'time', rivals: 0, reward: 1800, desc: 'Eine Runde Highway gegen die Uhr.',
    start: [ringStart.x, ringStart.z], heading: ringStart.h, cps: ringCps(RING_S0, 10), r: 16, medals: [72, 85, 100] },
  { id: 'drift', name: 'Drift-Arena', type: 'drift', rivals: 0, reward: 1500, desc: '60 Sekunden im Hafen – sammle so viele Drift-Punkte wie möglich.',
    start: [rc(4), -600], heading: Math.PI, time: 60, medals: [120000, 70000, 35000] }
];

const RIVALS = [
  { name: 'Kaito', car: 'nyx', paint: '#22e8ff', skill: 0.9, perf: 1 },
  { name: 'Rhea', car: 'vandal', paint: '#9a3cff', skill: 0.86, perf: 1 },
  { name: 'Moss', car: 'kestrel', paint: '#2aff8a', skill: 0.84, perf: 2 }
];

// Fahrlinie als dichte Punktkette (alle ~4 m)
function densify(pts, step = 4) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / step));
    for (let k = 0; k < n; k++) out.push({ x: ax + (bx - ax) * k / n, z: az + (bz - az) * k / n });
  }
  const [lx, lz] = pts[pts.length - 1];
  out.push({ x: lx, z: lz });
  return out;
}
function racePath(race) {
  if (!race.cps) return [];                          // Drift-Arena: freie Fläche, keine Strecke
  if (race.path === 'mountain') return MOUNTAIN.slice(3).map(p => ({ x: p.x, z: p.z }));
  if (race.type === 'time') { const o = {}, out = []; for (let s = 0; s <= RING_LEN; s += 4) { ringAt(RING_S0 + s, -3.5, o); out.push({ x: o.x, z: o.z }); } return out; }
  return densify([race.start, ...race.cps]);
}

// Leuchtsäule + Bodenring
function beacon(color, radius, height) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 64;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0.75)');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 64);
  const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const grp = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 40, 1, true), mat);
  beam.position.y = height / 2;
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius - 0.5, radius, 48).rotateX(-Math.PI / 2), ringMat);
  ring.position.y = 0.06;
  grp.add(beam, ring);
  grp.userData = { mat, ringMat };
  return grp;
}
function label(text, color) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(8,10,20,0.75)';
  g.beginPath();
  if (g.roundRect) g.roundRect(8, 16, 496, 96, 26); else g.rect(8, 16, 496, 96);
  g.fill();
  g.strokeStyle = color; g.lineWidth = 5; g.stroke();
  let fs = 50;
  do { g.font = `italic 900 ${fs}px system-ui, sans-serif`; fs -= 2; } while (g.measureText('🏁 ' + text).width > 460 && fs > 20);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#fff'; g.fillText('🏁 ' + text, 256, 66);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, toneMapped: false, fog: false }));
  s.scale.set(16, 4, 1);
  return s;
}

export class Races {
  // ctx: { scene, world, car, profile, save(), makeCar(id, cfg, perf), dropCar(car), score, audio, teleport(x, z, h), onFinish(result) }
  constructor(ctx) {
    this.ctx = ctx;
    this.state = 'idle';          // idle | card | countdown | run | done
    this.race = null;
    this.rivals = [];
    this.armed = new Set();
    this.markers = RACES.map(r => {
      const [x, z] = r.start, y = ctx.world.heightAt(x, z);
      const g = beacon(r.type === 'drift' ? '#ff2a8a' : r.type === 'time' ? '#22e8ff' : '#ffb51e', 5, 9);
      g.position.set(x, y, z);
      const l = label(r.name, r.type === 'drift' ? '#ff2a8a' : r.type === 'time' ? '#22e8ff' : '#ffb51e');
      l.position.set(0, 11, 0);
      g.add(l);
      ctx.scene.add(g);
      return g;
    });
    this.cpBeacon = beacon('#ffe14a', 7, 14);
    this.cpBeacon.visible = false;
    ctx.scene.add(this.cpBeacon);
    this.finishBeacon = beacon('#5dff9a', 8, 18);
    this.finishBeacon.visible = false;
    ctx.scene.add(this.finishBeacon);
    this.bindUi();
  }

  get active() { return this.state === 'countdown' || this.state === 'run'; }
  get frozen() { return this.state === 'countdown'; }

  bindUi() {
    const tap = (id, fn) => $(id).addEventListener('click', e => { e.preventDefault(); fn(); });
    tap('rcStart', () => this.start(this.pending));
    tap('rcCancel', () => { this.hideCard(); this.armed.delete(this.pending.id); });
    tap('rrAgain', () => { const r = this.race; this.clear(); this.start(r); });
    tap('rrGo', () => this.clear());
  }

  showCard(race) {
    this.pending = race;
    this.state = 'card';
    const best = this.ctx.profile.races[race.id];
    $('rcName').textContent = race.name;
    $('rcType').textContent = { circuit: 'Rundkurs', sprint: 'Sprint', time: 'Zeitrennen', drift: 'Drift-Wettbewerb' }[race.type] + (race.rivals ? ` · ${race.rivals} Rivalen` : '');
    $('rcDesc').textContent = race.desc;
    $('rcReward').textContent = '$ ' + fmt(race.reward);
    $('rcBest').textContent = best ? (race.type === 'drift' ? fmt(best.score) + ' Punkte' : 'Bestzeit ' + fmtT(best.time) + (best.pos ? ` · Platz ${best.pos}` : '')) : 'Noch nicht gefahren';
    $('raceCard').classList.add('show');
  }
  hideCard() { $('raceCard').classList.remove('show'); if (this.state === 'card') this.state = 'idle'; }

  start(race) {
    const c = this.ctx, car = c.car;
    this.hideCard();
    this.race = race;
    this.path = racePath(race);
    this.ncp = race.cps ? race.cps.length : 0;
    const [sx, sz] = race.start;
    const first = race.cps ? race.cps[0] : [sx, sz + 1];
    const h = race.heading ?? Math.atan2(first[0] - sx, first[1] - sz);
    c.teleport(sx, sz, h);
    car.nitro = 1;
    this.player = { cp: 0, lap: 0, done: false, time: 0 };
    // Rivalen in Startaufstellung hinter dem Spieler
    this.rivals = [];
    const fx = Math.sin(h), fz = Math.cos(h), rx = -fz, rz = fx;
    const grid = [[-4, -8], [4, -8], [0, -16]];
    for (let i = 0; i < race.rivals; i++) {
      const d = RIVALS[i], cfg = defaultCfg(d.paint);
      const p = { motor: d.perf, turbo: d.perf, tires: d.perf, chassis: d.perf, nitro: 1 };
      const rcar = c.makeCar(d.car, cfg, p);
      const [lat, back] = grid[i];
      rcar.place(sx + rx * lat + fx * back, sz + rz * lat + fz * back, h);
      rcar.pos.y = c.world.heightAt(rcar.pos.x, rcar.pos.z);
      this.rivals.push({ name: d.name, car: rcar, skill: d.skill, base: d.skill, cp: 0, lap: 0, done: false, time: 0, pi: 0, inp: { steer: 0, gas: false, brake: false, drift: false, nitro: false } });
    }
    for (const m of this.markers) m.visible = false;
    this.t = 0;
    this.count = 3.2;
    this.lastBeep = 4;
    this.drift = 0;
    this.state = 'countdown';
    document.body.classList.add('racing');
    $('raceHud').classList.add('show');
    this.updateBeacons();
  }

  // Rennen beenden/aufräumen (Rivalen entfernen)
  clear() {
    for (const r of this.rivals) this.ctx.dropCar(r.car);
    this.rivals = [];
    this.race = null;
    this.state = 'idle';
    this.cpBeacon.visible = this.finishBeacon.visible = false;
    for (const m of this.markers) m.visible = true;
    document.body.classList.remove('racing');
    $('raceHud').classList.remove('show');
    $('raceResult').classList.remove('show');
    $('countdown').classList.remove('show');
  }
  abort() { if (this.race) this.clear(); }

  addDrift(points) { if (this.race && this.race.type === 'drift' && this.state === 'run') this.drift += points; }

  // Nächster Checkpoint eines Fahrers
  target(rr) { return this.race.cps[rr.cp]; }
  isFinal(rr) { const laps = this.race.laps || 1; return rr.cp === this.ncp - 1 && rr.lap === laps - 1; }
  progress(rr, c) {
    if (rr.done) return 1e9 - rr.time;
    const [tx, tz] = this.target(rr);
    return (rr.lap * this.ncp + rr.cp) * 10000 - Math.hypot(tx - c.pos.x, tz - c.pos.z);
  }
  advance(rr, c) {
    if (rr.done || !this.race.cps) return false;
    const [tx, tz] = this.target(rr);
    if (Math.hypot(tx - c.pos.x, tz - c.pos.z) > this.race.r) return false;
    rr.cp++;
    if (rr.cp >= this.ncp) { rr.cp = 0; rr.lap++; }
    if (rr.lap >= (this.race.laps || 1)) { rr.done = true; rr.time = this.t; }
    return true;
  }

  // KI: Fahrlinie verfolgen, vor Kurven bremsen, leichtes Gummiband
  ai(r, playerProg) {
    const c = r.car, P = this.path, n = P.length, loop = this.race.type === 'circuit';
    const idx = i => (loop ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i)));
    let best = 1e18, bi = r.pi;
    for (let k = -4; k < 40; k++) {
      const p = P[idx(r.pi + k)], d = (p.x - c.pos.x) ** 2 + (p.z - c.pos.z) ** 2;
      if (d < best) { best = d; bi = idx(r.pi + k); }
    }
    r.pi = bi;
    const look = Math.round(3 + c.speed * 0.11);
    const tp = P[idx(bi + look)];
    const diff = wrap(Math.atan2(tp.x - c.pos.x, tp.z - c.pos.z) - c.heading);
    let corner = 0;
    for (const [ahead, w] of [[7, 1], [13, 0.85], [22, 0.6]]) {
      const q = P[idx(bi + ahead)];
      corner = Math.max(corner, Math.abs(wrap(Math.atan2(q.x - c.pos.x, q.z - c.pos.z) - c.heading)) * w);
    }
    const lead = this.progress(r, c) - playerProg;          // > 0: Rivale vorn
    r.skill = Math.max(r.base - 0.12, Math.min(r.base + 0.1, r.base - lead * 0.00002));
    const vT = c.st.vmax * r.skill * Math.max(0.22, 1 - corner * 0.9);
    const inp = r.inp;
    inp.steer = Math.max(-1, Math.min(1, -diff * 2.4));
    inp.gas = c.speed < vT;
    inp.brake = c.speed > vT + 4;
    inp.nitro = corner < 0.06 && c.speed > 25 && r.skill > r.base - 0.02;
    inp.drift = false;
  }

  updateBeacons() {
    if (!this.race || !this.race.cps || this.player.done) { this.cpBeacon.visible = this.finishBeacon.visible = false; return; }
    const [x, z] = this.target(this.player), y = this.ctx.world.heightAt(x, z);
    const fin = this.isFinal(this.player);
    this.cpBeacon.visible = !fin;
    this.finishBeacon.visible = fin;
    (fin ? this.finishBeacon : this.cpBeacon).position.set(x, y, z);
  }

  // pro Frame (nach der Physik)
  update(dt, speedOk) {
    const c = this.ctx, car = c.car;
    const pulse = 0.4 + 0.25 * Math.sin(performance.now() / 250);
    for (const m of this.markers) m.userData.mat.opacity = pulse;
    if (this.state === 'idle' || this.state === 'card') {
      // Startpunkt anfahren → Rennkarte
      for (let i = 0; i < RACES.length; i++) {
        const r = RACES[i], d = Math.hypot(car.pos.x - r.start[0], car.pos.z - r.start[1]);
        if (d > 14) this.armed.add(r.id);
        if (this.state === 'idle' && d < 5.5 && speedOk && this.armed.has(r.id)) { this.armed.delete(r.id); this.showCard(r); }
        if (this.state === 'card' && this.pending === r && d > 9) this.hideCard();
      }
      return;
    }
    if (this.state === 'countdown') {
      this.count -= dt;
      const n = Math.ceil(this.count - 0.2);
      if (n !== this.lastBeep && n >= 0) {
        this.lastBeep = n;
        c.audio.ui(n > 0 ? 'tick' : 'buy');
        const el = $('countdown');
        el.textContent = n > 0 ? String(n) : 'LOS!';
        el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
      }
      if (this.count <= 0.2) this.state = 'run';
      this.hud();
      return;
    }
    if (this.state !== 'run') return;
    this.t += dt;
    const race = this.race;
    if (race.type === 'drift') {
      if (this.t >= race.time) { c.score.bank(); this.finish(); }
      this.hud();
      return;
    }
    if (this.advance(this.player, car)) { c.audio.ui('tick'); this.updateBeacons(); }
    const pp = this.progress(this.player, car);
    for (const r of this.rivals) {
      if (r.done) { r.inp.gas = false; r.inp.brake = true; r.inp.steer = 0; continue; }
      this.ai(r, pp);
      this.advance(r, r.car);
    }
    if (this.player.done) this.finish();
    this.hud();
  }

  // Platz des Spielers (1 = vorn)
  position() {
    const pp = this.progress(this.player, this.ctx.car);
    return 1 + this.rivals.filter(r => this.progress(r, r.car) > pp).length;
  }

  hud() {
    const race = this.race;
    let main;
    if (race.type === 'drift') {
      const left = Math.max(0, race.time - this.t);
      main = `DRIFT-ARENA · ${Math.ceil(left)} s · ${fmt(this.drift + this.ctx.score.points * this.ctx.score.mult)} Pkt`;
    } else if (race.type === 'time') {
      main = `ZEIT ${fmtT(this.t)} · Gold ${fmtT(race.medals[0])}`;
    } else {
      main = `PLATZ ${this.position()}/${this.rivals.length + 1}` + (race.laps ? ` · RUNDE ${Math.min(this.player.lap + 1, race.laps)}/${race.laps}` : '') + ` · ${fmtT(this.t)}`;
    }
    let sub = '';
    if (race.cps && !this.player.done) {
      const [x, z] = this.target(this.player), car = this.ctx.car;
      sub = (this.isFinal(this.player) ? 'Ziel' : `Checkpoint ${this.player.cp + 1 + this.player.lap * this.ncp}/${this.ncp * (race.laps || 1)}`) + ` · ${Math.round(Math.hypot(x - car.pos.x, z - car.pos.z))} m`;
    }
    $('rhMain').textContent = main;
    $('rhSub').textContent = sub;
  }

  finish() {
    const race = this.race, prof = this.ctx.profile;
    this.state = 'done';
    this.cpBeacon.visible = this.finishBeacon.visible = false;
    let title, line, cash, medal = 0, pos = 0;
    const prev = prof.races[race.id] || {};
    if (race.type === 'drift') {
      const pts = Math.round(this.drift);
      medal = race.medals.findIndex(m => pts >= m) + 1;          // 1 = Gold
      cash = medal ? Math.round(race.reward * [1, 0.6, 0.35][medal - 1]) : 150;
      title = medal ? ['🥇 Gold!', '🥈 Silber', '🥉 Bronze'][medal - 1] : 'Geschafft';
      line = `${fmt(pts)} Drift-Punkte`;
      prof.races[race.id] = { score: Math.max(prev.score || 0, pts) };
    } else if (race.type === 'time') {
      medal = race.medals.findIndex(m => this.t <= m) + 1;
      cash = medal ? Math.round(race.reward * [1, 0.6, 0.35][medal - 1]) : 150;
      title = medal ? ['🥇 Gold!', '🥈 Silber', '🥉 Bronze'][medal - 1] : 'Ziel erreicht';
      line = `Zeit ${fmtT(this.t)}`;
      prof.races[race.id] = { time: Math.min(prev.time || 1e9, this.t) };
    } else {
      pos = 1 + this.rivals.filter(r => r.done && r.time < this.player.time).length;
      cash = Math.round(race.reward * [1, 0.5, 0.3, 0.15][pos - 1]);
      title = pos === 1 ? '🏆 1. Platz!' : `${pos}. Platz`;
      line = `Zeit ${fmtT(this.player.time)}`;
      prof.races[race.id] = { time: Math.min(prev.time || 1e9, this.player.time), pos: Math.min(prev.pos || 9, pos) };
    }
    const newBest = race.type === 'drift' ? (prof.races[race.id].score > (prev.score || 0)) : (prof.races[race.id].time < (prev.time || 1e9));
    prof.cash += cash;
    this.ctx.save();
    $('rrTitle').textContent = title;
    $('rrLine').textContent = line + (newBest ? ' · Neue Bestleistung!' : '');
    $('rrCash').textContent = '+$ ' + fmt(cash);
    $('raceHud').classList.remove('show');
    $('raceResult').classList.add('show');
    this.ctx.audio.ui('buy');
    this.ctx.onFinish({ race, pos, medal, win: pos === 1 || medal === 1, cash });
  }

  // für die Minikarte
  mapInfo() {
    if (!this.race || !this.race.cps) return null;
    return { path: this.path, next: this.player.done ? null : this.target(this.player), rivals: this.rivals.map(r => r.car.pos) };
  }
}
