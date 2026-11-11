// Turbofieber – Garage: Neon-Showroom mit Drehteller, Autokauf, Optik (mit Vorschau) und Leistungs-Upgrades.
import * as THREE from 'three';
import { buildCar, disposeTree } from './car.js';
import { CARS, OPTIONS, PERF, PERF_MAX, perfPrice, optionPrice, statsFor, ratings, defaultCfg, defaultPerf } from './cars.js';

const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString('de-DE');
const clone = o => JSON.parse(JSON.stringify(o));

export class Garage {
  constructor(renderer, profile, hooks) {
    this.profile = profile;
    this.hooks = hooks;              // { save(), exit(), sound(kind) }
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.angle = 0.6;
    this.drag = null;
    this.tab = 'optik';
    this.cat = 'paint';
    this.buildRoom(renderer);
    this.bindUi();
  }

  /* ---------- Showroom ---------- */
  buildRoom(renderer) {
    const s = this.scene;
    s.background = new THREE.Color('#06070c');
    const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 64).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#121419', roughness: 0.16, metalness: 0.5 }));
    floor.receiveShadow = true;
    s.add(floor);
    const table = new THREE.Mesh(new THREE.CylinderGeometry(3.7, 3.8, 0.12, 64), new THREE.MeshStandardMaterial({ color: '#2a2d33', metalness: 0.8, roughness: 0.3 }));
    table.position.y = 0.06;
    table.receiveShadow = true;
    s.add(table);
    this.table = table;
    const neon = (c, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.76, 0.04, 8, 96).rotateX(Math.PI / 2), neon('#22e8ff', 3));
    ring.position.y = 0.12;
    s.add(ring);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 12, 48, 1, true), new THREE.MeshStandardMaterial({ color: '#171a22', roughness: 0.8, side: THREE.BackSide }));
    wall.position.y = 6;
    s.add(wall);
    for (let k = 0; k < 18; k++) {                           // senkrechte Neonleisten
      const a = k / 18 * Math.PI * 2;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 8, 0.18), neon(k % 2 ? '#ff2a8a' : '#22e8ff', 2.2));
      strip.position.set(Math.cos(a) * 21.7, 5, Math.sin(a) * 21.7);
      s.add(strip);
    }
    const halo = new THREE.Mesh(new THREE.TorusGeometry(6, 0.12, 8, 64).rotateX(Math.PI / 2), neon('#ffffff', 2.5));
    halo.position.y = 8;
    s.add(halo);
    // Reifenstapel und Werkzeugwagen als Kulisse
    const tireMat = new THREE.MeshStandardMaterial({ color: '#151515', roughness: 0.9 });
    for (const [x, z] of [[-12, -9], [-12.5, -6.5], [13, -8]]) {
      for (let l = 0; l < 4; l++) {
        const t = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.2, 8, 20).rotateX(Math.PI / 2), tireMat);
        t.position.set(x, 0.2 + l * 0.4, z);
        s.add(t);
      }
    }
    const chest = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.8), new THREE.MeshStandardMaterial({ color: '#c0262f', metalness: 0.5, roughness: 0.4 }));
    chest.position.set(11, 0.6, -11);
    s.add(chest);

    // Spiegelungen aus dem Raum selbst (vor dem Auto berechnet)
    const pmrem = new THREE.PMREMGenerator(renderer);
    s.environment = pmrem.fromScene(s, 0, 0.1, 100).texture;
    pmrem.dispose();

    const top = new THREE.SpotLight('#ffffff', 420, 30, 0.62, 0.5, 1.4);
    top.position.set(0, 10, 2);
    top.castShadow = true;
    top.shadow.mapSize.set(1024, 1024);
    s.add(top, top.target);
    const pink = new THREE.PointLight('#ff2a8a', 60, 20, 1.6); pink.position.set(-6, 2.5, -3);
    const cyan = new THREE.PointLight('#22e8ff', 60, 20, 1.6); cyan.position.set(6, 2.5, 3);
    s.add(pink, cyan, new THREE.HemisphereLight('#8090b0', '#101014', 0.35));
  }

  /* ---------- Öffnen / Schließen ---------- */
  open() {
    const p = this.profile;
    this.viewCar = p.car;
    this.cfg = clone(p.cars[p.car].cfg);
    this.$root.classList.add('show');
    this.render3d();
    this.renderUi();
  }
  close() {
    this.$root.classList.remove('show');
    if (this.preview) { this.scene.remove(this.preview); disposeTree(this.preview); this.preview = null; }
  }

  owned(id) { return !!this.profile.cars[id]; }
  savedCfg() { return this.owned(this.viewCar) ? this.profile.cars[this.viewCar].cfg : defaultCfg(); }
  perf() { return this.owned(this.viewCar) ? this.profile.cars[this.viewCar].perf : defaultPerf(); }

  // Kosten aller noch nicht gekauften Optik-Änderungen
  pending() {
    if (!this.owned(this.viewCar)) return { cost: 0, n: 0 };
    const saved = this.savedCfg();
    let cost = 0, n = 0;
    for (const k of Object.keys(OPTIONS)) if (this.cfg[k] !== saved[k]) { cost += optionPrice(k, this.cfg[k]); n++; }
    return { cost, n };
  }

  render3d() {
    if (this.preview) { this.scene.remove(this.preview); disposeTree(this.preview); }
    this.preview = buildCar(this.viewCar, this.cfg);
    this.preview.position.y = 0.12;
    this.preview.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.preview.userData.headMat.color.multiplyScalar(2.5);
    this.preview.userData.tailMat.color.multiplyScalar(1.8);
    this.scene.add(this.preview);
  }

  /* ---------- Bedienoberfläche ---------- */
  bindUi() {
    this.$root = $('garage');
    const tap = (el, fn) => el.addEventListener('click', e => { e.preventDefault(); fn(e); });
    tap($('gBack'), () => this.exit());
    document.querySelectorAll('[data-gtab]').forEach(b => tap(b, () => { this.tab = b.dataset.gtab; this.hooks.sound('tick'); this.renderUi(); }));
    tap($('gReset'), () => { this.cfg = clone(this.savedCfg()); this.render3d(); this.renderUi(); });
    tap($('gBuyBtn'), () => this.buyPending());
    // Auto drehen per Wischen
    const cv = document.getElementById('game');
    cv.addEventListener('pointerdown', e => { if (this.$root.classList.contains('show')) this.drag = { x: e.clientX, a: this.angle }; });
    window.addEventListener('pointermove', e => { if (this.drag) this.angle = this.drag.a - (e.clientX - this.drag.x) * 0.008; });
    window.addEventListener('pointerup', () => { this.drag = null; });
  }

  exit() {
    // Ungekaufte Optik verwerfen, gewähltes Auto bleibt
    this.close();
    this.hooks.exit();
  }

  buyPending() {
    const { cost } = this.pending();
    if (cost > this.profile.cash) { this.hooks.sound('no'); this.flash(`Dir fehlen $${fmt(cost - this.profile.cash)}`); return; }
    this.profile.cash -= cost;
    this.profile.cars[this.viewCar].cfg = clone(this.cfg);
    this.hooks.save();
    this.hooks.sound('buy');
    this.flash('Gekauft!');
    this.renderUi();
  }

  flash(text) {
    const f = $('gFlash');
    f.textContent = text;
    f.classList.remove('show'); void f.offsetWidth; f.classList.add('show');
  }

  renderUi() {
    const p = this.profile;
    $('gCash').textContent = fmt(p.cash);
    $('gCar').textContent = CARS[this.viewCar].name;
    $('gDesc').textContent = CARS[this.viewCar].desc;
    document.querySelectorAll('[data-gtab]').forEach(b => b.classList.toggle('on', b.dataset.gtab === this.tab));
    // Werte-Balken
    const r = ratings(statsFor(this.viewCar, this.perf()));
    const st = statsFor(this.viewCar, this.perf());
    $('gStats').innerHTML = Object.entries(r).map(([k, v]) =>
      `<div class="bar"><span>${k}</span><i><b style="width:${Math.round(Math.max(0.04, v) * 100)}%"></b></i></div>`).join('') +
      `<p class="gsmall">Spitze ${Math.round((st.vmax) * 3.6)} km/h · mit Nitro ${Math.round((st.vmax + 18) * 3.6)} km/h</p>`;
    const cats = $('gCats'), items = $('gItems');
    cats.textContent = ''; items.textContent = '';
    if (this.tab === 'optik') this.uiOptics(cats, items);
    else if (this.tab === 'leistung') this.uiPerf(items);
    else this.uiCars(items);
    const pend = this.tab === 'optik' ? this.pending() : { n: 0 };
    $('gBuy').hidden = pend.n === 0;
    if (pend.n) $('gBuyTxt').textContent = `${pend.n} Änderung${pend.n > 1 ? 'en' : ''} · $${fmt(pend.cost)}`;
  }

  card(html, cls, onClick) {
    const b = document.createElement('button');
    b.className = 'gcard ' + (cls || '');
    b.innerHTML = html;
    b.addEventListener('click', e => { e.preventDefault(); onClick(); });
    return b;
  }

  uiOptics(cats, items) {
    if (!this.owned(this.viewCar)) {
      items.append(this.card('<b>Erst kaufen</b><small>Optik gibt es für eigene Autos</small>', 'wide', () => { this.tab = 'autos'; this.renderUi(); }));
      return;
    }
    for (const [k, o] of Object.entries(OPTIONS)) {
      const b = document.createElement('button');
      b.className = 'gcat' + (k === this.cat ? ' on' : '');
      b.textContent = o.name;
      b.addEventListener('click', () => { this.cat = k; this.hooks.sound('tick'); this.renderUi(); });
      cats.append(b);
    }
    const saved = this.savedCfg();
    for (const [val, name, price] of OPTIONS[this.cat].items) {
      const isColor = typeof val === 'string' && val[0] === '#';
      const sw = isColor ? `<i class="sw" style="background:${val}"></i>` : '';
      const tag = saved[this.cat] === val ? 'Montiert' : price ? '$' + fmt(price) : 'gratis';
      items.append(this.card(`${sw}<b>${name}</b><small>${tag}</small>`, this.cfg[this.cat] === val ? 'on' : '', () => {
        this.cfg[this.cat] = val;
        this.hooks.sound('tick');
        this.render3d();
        this.renderUi();
      }));
    }
  }

  uiPerf(items) {
    if (!this.owned(this.viewCar)) {
      items.append(this.card('<b>Erst kaufen</b><small>Upgrades gibt es für eigene Autos</small>', 'wide', () => { this.tab = 'autos'; this.renderUi(); }));
      return;
    }
    const perf = this.perf();
    for (const [k, o] of Object.entries(PERF)) {
      const lv = perf[k];
      const pips = '●'.repeat(lv) + '○'.repeat(PERF_MAX - lv);
      const max = lv >= PERF_MAX, price = max ? 0 : perfPrice(k, lv);
      items.append(this.card(`<b>${o.name}</b><span class="pips">${pips}</span><small>${max ? 'Maximum' : 'Stufe ' + (lv + 1) + ' · $' + fmt(price)}</small>`,
        max ? 'done' : price > this.profile.cash ? 'poor' : '', () => {
          if (max) return;
          if (price > this.profile.cash) { this.hooks.sound('no'); this.flash(`Dir fehlen $${fmt(price - this.profile.cash)}`); return; }
          this.profile.cash -= price;
          perf[k]++;
          this.hooks.save();
          this.hooks.sound('buy');
          this.flash(`${o.name} Stufe ${perf[k]}!`);
          this.renderUi();
        }));
    }
  }

  uiCars(items) {
    const p = this.profile;
    for (const [id, c] of Object.entries(CARS)) {
      const own = this.owned(id), active = p.car === id;
      const tag = active ? 'Dein Auto' : own ? 'Fahren' : '$' + fmt(c.price);
      items.append(this.card(`<b>${c.name}</b><small>${tag}</small>`, (this.viewCar === id ? 'on ' : '') + (!own && c.price > p.cash ? 'poor' : ''), () => {
        if (this.viewCar !== id) {                   // erst ansehen
          this.viewCar = id;
          this.cfg = clone(this.savedCfg());
          this.hooks.sound('tick');
          this.render3d();
          this.renderUi();
          return;
        }
        if (own) { p.car = id; this.hooks.save(); this.hooks.sound('buy'); this.flash(c.name + ' ausgewählt'); }
        else if (c.price > p.cash) { this.hooks.sound('no'); this.flash(`Dir fehlen $${fmt(c.price - p.cash)}`); }
        else {
          p.cash -= c.price;
          p.cars[id] = { cfg: clone(this.cfg), perf: defaultPerf() };
          p.car = id;
          this.hooks.save();
          this.hooks.sound('buy');
          this.flash(c.name + ' gekauft!');
        }
        this.renderUi();
      }));
    }
  }

  /* ---------- pro Frame ---------- */
  update(dt, aspect) {
    if (!this.drag) this.angle += dt * 0.25;
    const portrait = aspect < 1, dist = portrait ? 11.5 : 7.6;
    this.camera.aspect = aspect;
    this.camera.fov = portrait ? 50 : 40;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(Math.sin(this.angle) * dist, portrait ? 2.6 : 2.0, Math.cos(this.angle) * dist);
    this.camera.lookAt(0, portrait ? 0.3 : 0.55, 0);
    if (this.preview) this.preview.rotation.y = 0;
  }
}
