// Turbofieber – Polizei: Streifenwagen, Fahndungsstufen ★1–5, Verfolgung über das Straßennetz,
// Straßensperren mit Nagelbändern, Abhängen (Kopfgeld) und Gestellt-Werden (Strafe).
import * as THREE from 'three';
import { roadCenter as rc, N, CELL, OFF, ROAD, BLOCK } from './world.js';
import { policeCfg } from './cars.js';

const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString('de-DE');
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const clampK = k => Math.max(0, Math.min(N, k));
const kOf = v => clampK(Math.round((v - rc(0)) / CELL));     // nächste Straßenlinie
const inCity = (x, z) => Math.abs(x) < -OFF - 2 && Math.abs(z) < -OFF - 2;
const LANE = 4;
const CHASERS = [0, 2, 3, 4, 5, 6];                            // Verfolger je Stufe

// Nagelband-Textur
function spikeTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = '#1a1a1a'; g.fillRect(0, 0, 128, 16);
  g.fillStyle = '#d8d8d8';
  for (let x = 2; x < 128; x += 6) { g.beginPath(); g.moveTo(x, 13); g.lineTo(x + 2, 3); g.lineTo(x + 4, 13); g.fill(); }
  g.fillStyle = '#ffcf3a'; g.fillRect(0, 0, 128, 2); g.fillRect(0, 14, 128, 2);
  return new THREE.CanvasTexture(c);
}

export class Police {
  // ctx: { scene, world, car, profile, makeCar(id, cfg, perf), dropCar(car), audio, popup(text, cls), save(), onBusted(fine), onEscaped(bounty) }
  constructor(ctx) {
    this.ctx = ctx;
    this.units = [];               // { car, mode: 'patrol'|'chase'|'block', inp, ... }
    this.level = 0;                // Fahndungsstufe
    this.enabled = true;
    this.bounty = 0;
    this.escape = 0; this.bust = 0;
    this.sinceLevel = 0; this.ramCd = 0; this.spawnCd = 0; this.blockCd = 0;
    this.blocks = [];
    this.stripTex = spikeTexture();
    this.hudKey = '';
    for (let i = 0; i < 4; i++) this.spawnPatrol();
  }

  get wanted() { return this.level > 0; }

  setEnabled(on) {
    this.enabled = on;
    if (!on) { this.clearAll(); }
    else if (!this.units.length) for (let i = 0; i < 4; i++) this.spawnPatrol();
  }

  newUnit(x, z, h, mode, fast) {
    const lv = Math.min(5, Math.max(1, this.level));
    const car = this.ctx.makeCar(fast ? 'nyx' : 'kestrel', policeCfg(), { motor: lv, turbo: lv, tires: lv, chassis: lv, nitro: 1 });
    car.place(x, z, h);
    car.pos.y = this.ctx.world.heightAt(x, z);
    const u = { car, mode, inp: { steer: 0, gas: false, brake: false, drift: false, nitro: false }, stuck: 0, life: 0 };
    this.units.push(u);
    return u;
  }
  dropUnit(u) { this.ctx.dropCar(u.car); this.units = this.units.filter(x => x !== u); }
  clearAll() {
    for (const u of this.units) this.ctx.dropCar(u.car);
    this.units = [];
    for (const b of this.blocks) this.removeBlock(b);
    this.blocks = [];
    this.level = 0; this.bounty = 0; this.escape = 0; this.bust = 0;
  }

  /* ---------- Streife: von Kreuzung zu Kreuzung ---------- */
  spawnPatrol() {
    const p = this.ctx.car.pos;
    for (let tries = 0; tries < 20; tries++) {
      const a = Math.floor(Math.random() * (N + 1)), b = Math.floor(Math.random() * N);
      const x = rc(a), z = rc(b) + CELL / 2;
      if (Math.hypot(x - p.x, z - p.z) < 160) continue;
      const u = this.newUnit(x - LANE, z, 0, 'patrol', false);
      u.dir = [0, 1];
      u.ti = [a, b + 1];
      this.planPatrol(u);
      return u;
    }
    return null;
  }
  planPatrol(u) {
    const [a, b] = u.ti, [dx, dz] = u.dir;
    const opts = [[dx, dz], [dx, dz], [-dz, dx], [dz, -dx]].filter(([ex, ez]) => a + ex >= 0 && b + ez >= 0 && a + ex <= N && b + ez <= N);
    u.next = opts.length ? opts[Math.floor(Math.random() * opts.length)] : [-dx, -dz];
    const cx = rc(a), cz = rc(b), [nx, nz] = u.next;
    u.wps = [[cx - dx * 13 - dz * LANE, cz - dz * 13 + dx * LANE], [cx + nx * 13 - nz * LANE, cz + nz * 13 + nx * LANE]];
  }

  // Lenken und Gas zu einem Zielpunkt
  drive(u, tx, tz, vmax, turnSlow) {
    const c = u.car, inp = u.inp;
    const diff = wrap(Math.atan2(tx - c.pos.x, tz - c.pos.z) - c.heading);
    inp.steer = Math.max(-1, Math.min(1, -diff * 2.4));
    const vT = Math.abs(diff) > 0.5 ? Math.min(vmax, turnSlow) : vmax;
    inp.gas = c.speed < vT;
    inp.brake = c.speed > vT + 3;
    inp.drift = false;
    inp.nitro = false;
    return diff;
  }

  /* ---------- Verfolgung: Ziel über das Straßenraster ansteuern ---------- */
  chaseTarget(u) {
    const p = this.ctx.car, c = u.car;
    const d = Math.hypot(p.pos.x - c.pos.x, p.pos.z - c.pos.z);
    const lead = Math.min(1.2, d / 45);
    let tx = p.pos.x + p.vx * lead, tz = p.pos.z + p.vz * lead;
    if (d < 30 || !inCity(c.pos.x, c.pos.z) || !inCity(tx, tz)) return [tx, tz];
    const kx = kOf(c.pos.x), kz = kOf(c.pos.z);
    const onV = Math.abs(c.pos.x - rc(kx)) < 9, onH = Math.abs(c.pos.z - rc(kz)) < 9;
    const px = kOf(tx), pz = kOf(tz);
    if (onV && onH) {                                          // auf einer Kreuzung: Richtung wählen
      const dk = px - kx, dj = pz - kz;
      if (!dk && !dj) return [tx, tz];
      if (dk && (Math.abs(tx - c.pos.x) > Math.abs(tz - c.pos.z) || !dj)) return [rc(kx + Math.sign(dk)), rc(kz)];
      return [rc(kx), rc(kz + Math.sign(dj))];
    }
    if (onV) {                                                 // senkrechte Straße
      if (Math.abs(tx - rc(kx)) < 9) return [tx, tz];
      const j = clampK(tz > c.pos.z ? Math.ceil((c.pos.z - rc(0)) / CELL) : Math.floor((c.pos.z - rc(0)) / CELL));
      return [rc(kx), rc(j)];
    }
    if (onH) {                                                 // waagrechte Straße
      if (Math.abs(tz - rc(kz)) < 9) return [tx, tz];
      const i = clampK(tx > c.pos.x ? Math.ceil((c.pos.x - rc(0)) / CELL) : Math.floor((c.pos.x - rc(0)) / CELL));
      return [rc(i), rc(kz)];
    }
    return [tx, tz];
  }

  // Neuen Verfolger hinter dem Spieler auf einer Straße absetzen (außer Sicht)
  spawnBehind() {
    const p = this.ctx.car, w = this.ctx.world;
    const fx = Math.sin(p.heading), fz = Math.cos(p.heading);
    for (const d of [140, 170, 110, 200]) for (const side of [0, 30, -30]) {
      let x = p.pos.x - fx * d - fz * side, z = p.pos.z - fz * d + fx * side;
      if (inCity(x, z)) {                                       // auf die nächste Straßenmitte schieben
        const kx = kOf(x), kz = kOf(z);
        if (Math.abs(x - rc(kx)) < Math.abs(z - rc(kz))) x = rc(kx); else z = rc(kz);
      }
      if (w.collide(x, z, 1.4)) continue;
      return this.newUnit(x, z, Math.atan2(p.pos.x - x, p.pos.z - z), 'chase', this.level >= 3);
    }
    return null;
  }

  /* ---------- Straßensperre ---------- */
  spawnBlock() {
    const p = this.ctx.car;
    if (!inCity(p.pos.x, p.pos.z) || p.speed < 8) return;
    const kx = kOf(p.pos.x), kz = kOf(p.pos.z);
    const vert = Math.abs(p.pos.x - rc(kx)) < 9 && Math.abs(p.vz) > Math.abs(p.vx);
    const hor = Math.abs(p.pos.z - rc(kz)) < 9 && Math.abs(p.vx) >= Math.abs(p.vz);
    if (!vert && !hor) return;
    const sgn = Math.sign(vert ? p.vz : p.vx) || 1;
    const ahead = (vert ? p.pos.z : p.pos.x) + sgn * 140;
    const seg = Math.max(0, Math.min(N - 1, Math.floor((ahead - OFF - ROAD) / CELL)));
    const mid = OFF + ROAD + seg * CELL + BLOCK / 2;
    if ((mid - (vert ? p.pos.z : p.pos.x)) * sgn < 60) return;   // zu nah oder hinter dem Spieler
    const line = vert ? rc(kx) : rc(kz);
    const blk = { units: [], strip: null, t: 0 };
    for (const o of [-6.2, 6.2]) {
      const x = vert ? line + o : mid, z = vert ? mid : line + o;
      const u = this.newUnit(x, z, vert ? Math.PI / 2 : 0, 'block', false);
      u.car.siren = true;
      blk.units.push(u);
    }
    if (this.level >= 4) {                                      // Nagelband in der Lücke, 9 m davor
      const sz = mid - sgn * 9;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 0.7).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: this.stripTex, roughness: 0.6 }));
      if (vert) m.position.set(line, 0.03, sz); else { m.rotation.y = Math.PI / 2; m.position.set(sz, 0.03, line); }
      this.ctx.scene.add(m);
      blk.strip = { mesh: m, vert, x: vert ? line : sz, z: vert ? sz : line };
    }
    this.blocks.push(blk);
    this.ctx.popup('STRASSENSPERRE VORAUS!', 'red');
  }
  removeBlock(b) {
    for (const u of b.units) if (this.units.includes(u)) this.dropUnit(u);
    if (b.strip) { this.ctx.scene.remove(b.strip.mesh); b.strip.mesh.geometry.dispose(); b.strip.mesh.material.dispose(); }
  }

  /* ---------- Auslöser ---------- */
  startPursuit(reason) {
    if (!this.enabled || this.level > 0) return;
    this.level = 1; this.sinceLevel = 0; this.bounty = 0; this.escape = 0; this.bust = 0;
    for (const u of this.units) if (u.mode === 'patrol') { u.mode = 'chase'; u.car.siren = true; }
    this.ctx.popup('POLIZEI! ' + reason, 'red');
    this.ctx.audio.ui('no');
  }
  raise(text) {
    if (this.level >= 5) return;
    this.level++; this.sinceLevel = 0;
    this.ctx.popup(`FAHNDUNG ★${this.level}` + (text ? ' – ' + text : ''), 'red');
  }
  // Spieler hat Verkehr gerammt (aus der Physik gemeldet)
  crime(x, z) {
    if (!this.enabled || this.level) return;
    if (this.units.some(u => Math.hypot(u.car.pos.x - x, u.car.pos.z - z) < 90)) this.startPursuit('Unfallflucht');
  }
  // Spieler hat einen Streifenwagen gerammt
  rammed(power) {
    if (!this.enabled || power < 5 || this.ramCd > 0) return;
    this.ramCd = 5;
    this.bounty += 250;
    if (!this.level) this.startPursuit('Polizeiauto gerammt');
    else this.raise('Rammen');
  }

  /* ---------- pro Frame ---------- */
  update(dt, allowed) {
    const p = this.ctx.car;
    this.ramCd = Math.max(0, this.ramCd - dt);
    if (!this.enabled) { this.hud(); return; }
    if (!allowed && this.level) this.endPursuit();             // z. B. Rennen gestartet

    // Streife erkennt Raser
    if (!this.level && allowed && p.speed > 33) {
      for (const u of this.units) {
        if (u.mode === 'patrol' && Math.hypot(u.car.pos.x - p.pos.x, u.car.pos.z - p.pos.z) < 75) { this.startPursuit('Raser erwischt'); break; }
      }
    }

    // KI steuern
    for (const u of this.units) {
      u.life += dt;
      if (u.mode === 'patrol') {
        const [tx, tz] = u.wps[0];
        this.drive(u, tx, tz, 13, 7);
        if (Math.hypot(tx - u.car.pos.x, tz - u.car.pos.z) < 3.5) {
          u.wps.shift();
          if (!u.wps.length) { u.dir = u.next; u.ti = [u.ti[0] + u.dir[0], u.ti[1] + u.dir[1]]; this.planPatrol(u); }
        }
      } else if (u.mode === 'chase') {
        const [tx, tz] = this.chaseTarget(u);
        const d = Math.hypot(p.pos.x - u.car.pos.x, p.pos.z - u.car.pos.z);
        const vmax = u.car.st.vmax * (0.86 + this.level * 0.03);
        this.drive(u, tx, tz, d < 14 ? Math.max(p.speed + 3, 8) : vmax, 12);
        u.inp.nitro = d > 60 && this.level >= 2;
        // festgefahren → außer Sicht neu einsetzen
        u.stuck = u.car.speed < 2 && d > 40 ? u.stuck + dt : 0;
        if (u.stuck > 3 || d > 420) { this.dropUnit(u); this.spawnCd = 0; }
      } else {
        u.inp.gas = false; u.inp.brake = true; u.inp.steer = 0;
      }
    }

    if (this.level) this.pursuit(dt);
    else if (this.units.filter(u => u.mode === 'patrol').length < 4 && Math.random() < dt * 0.3) this.spawnPatrol();
    this.hud();
  }

  pursuit(dt) {
    const p = this.ctx.car;
    this.sinceLevel += dt;
    this.bounty += dt * 7 * this.level;
    if (this.sinceLevel > 35) this.raise('Verstärkung');
    // Verfolger nachführen
    this.spawnCd -= dt;
    const chasers = this.units.filter(u => u.mode === 'chase');
    if (chasers.length < CHASERS[this.level] && this.spawnCd <= 0) { this.spawnBehind(); this.spawnCd = 3; }
    // Straßensperren ab ★3
    this.blockCd -= dt;
    if (this.level >= 3 && this.blockCd <= 0) { this.spawnBlock(); this.blockCd = 22; }
    for (const b of this.blocks) {
      b.t += dt;
      if (b.strip && p.flat <= 0) {
        const s = b.strip, along = s.vert ? Math.abs(p.pos.x - s.x) : Math.abs(p.pos.z - s.z), across = s.vert ? Math.abs(p.pos.z - s.z) : Math.abs(p.pos.x - s.x);
        if (along < 3.7 && across < 1.2) { p.flat = 12; this.ctx.popup('NAGELBAND – Reifen platt!', 'red'); this.ctx.audio.hit(8); }
      }
    }
    for (const b of this.blocks.slice()) {
      const u0 = b.units[0];
      if (b.t > 35 || (u0 && Math.hypot(u0.car.pos.x - p.pos.x, u0.car.pos.z - p.pos.z) > 260)) { this.removeBlock(b); this.blocks = this.blocks.filter(x => x !== b); }
    }
    // Abhängen oder gestellt werden
    let near = Infinity;
    for (const u of this.units) if (u.mode !== 'patrol') near = Math.min(near, Math.hypot(u.car.pos.x - p.pos.x, u.car.pos.z - p.pos.z));
    if (near > 150) this.escape += dt / (4 + this.level * 1.5);
    else this.escape = Math.max(0, this.escape - dt * 0.6);
    if (near < 7.5 && p.speed < 4) this.bust += dt; else this.bust = Math.max(0, this.bust - dt * 0.7);
    if (this.escape >= 1) {
      const bounty = Math.round(this.bounty);
      this.ctx.onEscaped(bounty);
      this.endPursuit();
    } else if (this.bust >= 2.5) {
      const fine = Math.min(this.ctx.profile.cash, 400 * this.level);
      this.endPursuit();
      this.ctx.onBusted(fine);
    }
  }

  endPursuit() {
    // Verfolger und Sperren verschwinden, Streife fährt weiter
    for (const b of this.blocks) this.removeBlock(b);
    this.blocks = [];
    const p = this.ctx.car.pos;
    for (const u of this.units.slice()) {
      if (Math.hypot(u.car.pos.x - p.x, u.car.pos.z - p.z) < 120 || u.mode !== 'chase') this.dropUnit(u);
    }
    for (const u of this.units) { u.mode = 'patrol'; u.car.siren = false; u.dir = [0, 1]; u.ti = [kOf(u.car.pos.x), clampK(kOf(u.car.pos.z) + 1)]; this.planPatrol(u); }
    this.level = 0; this.escape = 0; this.bust = 0; this.bounty = 0;
  }

  // nächster Verfolger (für die Sirene)
  sirenLevel() {
    if (!this.level) return 0;
    const p = this.ctx.car.pos;
    let near = Infinity;
    for (const u of this.units) if (u.mode !== 'patrol') near = Math.min(near, Math.hypot(u.car.pos.x - p.x, u.car.pos.z - p.z));
    return Math.max(0, 1 - near / 180);
  }

  hud() {
    const el = $('wanted');
    const key = this.level ? this.level + '|' + Math.round(this.bounty / 10) + '|' + Math.round(this.escape * 20) + '|' + Math.round(this.bust * 8) : '';
    if (key === this.hudKey) return;
    this.hudKey = key;
    el.classList.toggle('show', this.level > 0);
    if (!this.level) return;
    $('wStars').textContent = '★'.repeat(this.level) + '☆'.repeat(5 - this.level);
    $('wInfo').textContent = this.bust > 0.3 ? 'Anhalten droht – fahr weiter!' : this.escape > 0.05 ? 'Abhängen …' : 'Kopfgeld $' + fmt(this.bounty);
    const bar = $('wBar');
    bar.style.width = Math.round((this.bust > 0.3 ? this.bust / 2.5 : this.escape) * 100) + '%';
    bar.classList.toggle('red', this.bust > 0.3);
  }

  mapDots() { return this.units.map(u => ({ x: u.car.pos.x, z: u.car.pos.z, chase: u.mode !== 'patrol' })); }
}
