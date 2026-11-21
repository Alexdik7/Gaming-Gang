// Darstellung eines Runs: liest world (Zustand) + Ereignisse, besitzt alle three.js-Objekte des Spielfelds.
import * as THREE from 'three';
import { MapView, HEIGHT } from './mapview.js';
import { Particles, Rings, Bolts, Pillars, Projectiles, Floaters, projStyle } from './fx.js';
import { RAFT_TOP } from './mapview.js';
import { ENEMY_MODELS, bakeFrames, buildBig } from './assets.js';
import { buildModel, ENEMY_GEO, ENEMY_GLOW, ENEMY_ALPHA, buildOni, buildDragon } from './models.js';
import { enemyMat, enemyOutline, glow, toon, geo } from './toon.js';
import { ELEMENT_COLORS, ENEMIES } from '../data/enemies.js';
import { CREATURES } from '../data/creatures.js';

const PI = Math.PI;
const TOWER_SCALE = 1.75, ENEMY_SCALE = 1.5;
const backOut = k => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const TINT = { flash: [1, 1, 1, 0.75], burn: [1, 0.45, 0.1, 0.32], frost: [0.45, 0.8, 1, 0.38], stun: [1, 0.95, 0.4, 0.4], shield: [0.7, 0.5, 1, 0.35], vuln: [1, 0.25, 0.35, 0.22], elite: [1, 0.82, 0.3, 0.16], none: [0, 0, 0, 0] };

export class GameView {
  constructor(stage, world, opts = {}) {
    this.stage = stage; this.world = world; this.scene = stage.scene; this.opts = opts;
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.map = new MapView(this.root, world.map);
    stage.mapW = this.map.W; stage.mapH = this.map.H; stage.fit();
    this.parts = new Particles(this.root); this.rings = new Rings(this.root); this.bolts = new Bolts(this.root); this.pillars = new Pillars(this.root);
    this.projs = new Projectiles(this.root);
    this.floaters = new Floaters(document.getElementById('floaters'));
    this.towers = new Map(); this.bigs = new Map(); this.t = 0; this.numCount = 0;
    this.buildEnemyPools(); this.buildHelpers();
    this.petalT = 0; this.sky = world.map.theme.sky ?? 0xbfe6dc; this.ash = !!world.map.theme.ash;
    this.stage.hemi.color.setHex(this.ash ? 0xffd8c0 : 0xdff4ff);
  }
  toW(x, y) { return [x - this.map.W / 2, y - this.map.H / 2]; }
  hAt(cx, cy) { return this.map.heightAt(cx, cy); }
  ty(t) { return t.raft != null ? RAFT_TOP : this.hAt(t.cx, t.cy); }

  buildEnemyPools() {
    this.pools = {}; const cap = { slime: 120, wolf: 140, boar: 90, wisp: 90, shade: 90, mage: 50, healer: 50, beetle: 90, mite: 200, golem: 24, demon: 120, bearer: 60, bearerX: 60, l1: 220, l2: 200, l3: 180, l4: 160, l5: 160, kokon: 60 };
    // Echte Modelle: N vorgebackene Posen je Gegnerart (je Pose ein InstancedMesh). Ohne Modelle: alte Formen.
    const ENEMY_H = { ...Object.fromEntries(Object.entries(ENEMIES).map(([k, d]) => [k, d.h])), bearerX: ENEMIES.bearer.h };
    for (const k of new Set([...Object.keys(ENEMY_GEO), ...Object.keys(ENEMY_MODELS)])) {
      const spec = ENEMY_MODELS[k], baked = spec ? bakeFrames({ ...spec, h: (ENEMY_H[k] || 0.6) * spec.h }) : null;
      const geos = baked || (ENEMY_GEO[k] ? [ENEMY_GEO[k]()] : null); if (!geos) continue;
      const glowK = ENEMY_GLOW[k] && !baked, alpha = ENEMY_ALPHA[k];
      const mat = glowK ? new THREE.MeshBasicMaterial({ vertexColors: true }) : enemyMat(alpha ? { transparent: true, opacity: alpha } : {});
      const frames = geos.map(g => {
        const tint = new THREE.InstancedBufferAttribute(new Float32Array(cap[k] * 4), 4); tint.setUsage(THREE.DynamicDrawUsage); g.setAttribute('aTint', tint);
        const m = new THREE.InstancedMesh(g, mat, cap[k]); m.count = 0; m.castShadow = !glowK && !baked; m.frustumCulled = false; this.root.add(m);
        let ol = null;
        if (!glowK && !alpha) { ol = new THREE.InstancedMesh(g, enemyOutline(baked ? 0.016 : 0.022), cap[k]); ol.instanceMatrix = m.instanceMatrix; ol.count = 0; ol.frustumCulled = false; this.root.add(ol); }
        return { m, ol, tint };
      });
      let halo = null;
      if (ENEMY_GLOW[k]) { halo = new THREE.InstancedMesh(geo.sphere(10), glow(0x7df3ff, baked ? 0.2 : 0.35), cap[k]); halo.count = 0; halo.frustumCulled = false; this.root.add(halo); }
      this.pools[k] = { frames, halo, cap: cap[k], cyc: spec?.cyc ?? 1, baked: !!baked, hn: 0 };
    }
    // Weiche Schattenscheiben unter Gegnern (ersetzt Schattenwurf: ein Draw-Call für alle)
    const sc = document.createElement('canvas'); sc.width = sc.height = 64; const sg = sc.getContext('2d'), gr = sg.createRadialGradient(32, 32, 4, 32, 32, 31);
    gr.addColorStop(0, 'rgba(0,0,0,0.42)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = gr; sg.fillRect(0, 0, 64, 64);
    this.blobs = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }), 600);
    this.blobs.count = 0; this.blobs.frustumCulled = false; this.blobs.renderOrder = -1; this.root.add(this.blobs);
    const crownG = new THREE.ConeGeometry(0.07, 0.12, 5);
    this.crowns = new THREE.InstancedMesh(crownG, toon(0xffd257, { emissive: 0xa07010, emissiveIntensity: 0.5 }), 200); this.crowns.count = 0; this.crowns.frustumCulled = false; this.root.add(this.crowns);
    const bar = new THREE.PlaneGeometry(1, 1);
    this.hpBg = new THREE.InstancedMesh(bar, new THREE.MeshBasicMaterial({ color: 0x1a1424, transparent: true, opacity: 0.75, depthTest: false }), 400);
    this.hpFg = new THREE.InstancedMesh(bar, new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }), 400);
    for (const b of [this.hpBg, this.hpFg]) { b.count = 0; b.frustumCulled = false; b.renderOrder = 10; this.root.add(b); }
    this.orbMesh = new THREE.InstancedMesh(geo.sphere(10), glow(0x9ff6ff, 1), 120); this.orbMesh.count = 0; this.orbMesh.frustumCulled = false; this.root.add(this.orbMesh);
    this.orbHalo = new THREE.InstancedMesh(geo.sphere(10), glow(0x5ad8ff, 0.3), 120); this.orbHalo.count = 0; this.orbHalo.frustumCulled = false; this.root.add(this.orbHalo);
    this.M = new THREE.Matrix4(); this.Q = new THREE.Quaternion(); this.V = new THREE.Vector3(); this.S = new THREE.Vector3(); this.E = new THREE.Euler(); this.C = new THREE.Color();
  }
  buildHelpers() {
    const ringG = new THREE.RingGeometry(0.965, 1, 64); ringG.rotateX(-PI / 2);
    const discG = new THREE.CircleGeometry(1, 64); discG.rotateX(-PI / 2);
    this.rangeRing = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }));
    this.rangeDisc = new THREE.Mesh(discG, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, depthWrite: false }));
    this.rangeRing.visible = this.rangeDisc.visible = false; this.root.add(this.rangeRing, this.rangeDisc);
    this.supportRing = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: 0x7be0a8, transparent: true, opacity: 0.5, depthWrite: false })); this.supportRing.visible = false; this.root.add(this.supportRing);
    const sq = new THREE.CircleGeometry(0.42 * 1.05, 32); sq.rotateX(-PI / 2);
    this.cellMark = new THREE.Mesh(sq, new THREE.MeshBasicMaterial({ color: 0x5aff8a, transparent: true, opacity: 0.45, depthWrite: false })); this.cellMark.visible = false; this.root.add(this.cellMark);
    this.selRing = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.44, 40).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.9, depthWrite: false })); this.selRing.visible = false; this.root.add(this.selRing);
    // Pfeile entlang des Pfads
    const tri = new THREE.Shape(); tri.moveTo(0, 0.16); tri.lineTo(0.13, -0.08); tri.lineTo(0, -0.02); tri.lineTo(-0.13, -0.08);
    const tg = new THREE.ShapeGeometry(tri); tg.rotateX(-PI / 2);
    this.arrows = new THREE.InstancedMesh(tg, glow(0xfff2a8, 0.85), 40); this.arrows.count = 0; this.arrows.frustumCulled = false; this.root.add(this.arrows);
    this.arrowT = 0;
    // Geisterfuchs (Fähigkeit, Ahnenfuchs-Sprint)
    this.ghostFox = buildModel('kitsune', { stage: 3 });
    this.ghostFox.root.traverse(o => { if (o.isMesh) { o.material = o.material.side === THREE.BackSide ? glow(0x2a8aff, 0.0) : glow(0x8ff6ff, 0.5); o.castShadow = false; } });
    this.ghostFox.root.visible = false; this.root.add(this.ghostFox.root); this.ghostAnim = null;
    this.ghostFire = buildModel('kitsune', { stage: 3 });
    this.ghostFire.root.traverse(o => { if (o.isMesh) { o.material = o.material.side === THREE.BackSide ? glow(0xff2a00, 0.0) : glow(0xffa040, 0.6); o.castShadow = false; } });
    this.ghostFire.root.visible = false; this.root.add(this.ghostFire.root);
  }

  // ───────── Türme ─────────
  towerKey(t) { return t.hero ? 'h' + (t.hlvl >= 20 ? 2 : t.hlvl >= 15 ? 1 : 0) : t.stage + ':' + t.tiers.join('') + ':' + (this.opts.branch?.(t.cid) || '') + (this.opts.skin?.(t.cid) || ''); }
  makeTower(t) {
    const m = buildModel(t.cid, { stage: t.stage, tiers: t.tiers, branch: this.opts.branch?.(t.cid), skin: this.opts.skin?.(t.cid), hlvl: t.hlvl });
    const g = new THREE.Group(); g.add(m.root); g.scale.setScalar(TOWER_SCALE);
    const [x, z] = this.toW(t.x, t.y); g.position.set(x, this.ty(t), z);
    // Schatten-Kreis unter der Figur
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false })); sh.position.y = 0.01; g.add(sh);
    this.root.add(g);
    return { g, m, key: this.towerKey(t), atk: 0, rot: t.ang, born: 0, evoT: 0, flash: 0 };
  }
  syncTowers(dt) {
    const alive = new Set();
    for (const t of this.world.towers) {
      alive.add(t.id);
      let v = this.towers.get(t.id);
      if (!v) { v = this.makeTower(t); this.towers.set(t.id, v); }
      const key = this.towerKey(t);
      if (v.evoT > 0) { v.evoT -= dt; v.m.root.rotation.y += dt * 14; const s = 1 + Math.sin(v.evoT * 30) * 0.06; v.m.root.scale.setScalar(s); }
      else if (key !== v.key) { this.root.remove(v.g); const nv = this.makeTower(t); nv.born = 0.5; nv.atk = 0; nv.rot = v.rot; this.towers.set(t.id, nv); v = nv; }
      // drehen zum Ziel
      const target = PI / 2 - t.ang; let d = target - v.rot; d = Math.atan2(Math.sin(d), Math.cos(d)); v.rot += d * Math.min(1, dt * 12);
      if (v.evoT <= 0) v.m.root.rotation.y = v.rot;
      v.atk = Math.max(0, v.atk - dt * 5);
      if (v.born < 1) { v.born = Math.min(1, v.born + dt * 3); if (v.evoT <= 0) v.m.root.scale.setScalar(backOut(v.born)); }
      if (t.raft != null) { const [x, z] = this.toW(t.x, t.y); v.g.position.set(x, RAFT_TOP, z); }
      const dis = t.disabledT > 0;
      v.m.tick(this.t, dt, { atk: v.atk, dis, cannon: v.rot, hlvl: t.hlvl });
      if (dis && Math.random() < dt * 14) { const [x, z] = this.toW(t.x, t.y); this.parts.spawn(x + (Math.random() - 0.5) * 0.4, 0.4, z + (Math.random() - 0.5) * 0.4, 0, 0.8, 0, Math.random() < 0.5 ? 0xff6a20 : 0x3a3030, 0.22, 0.6, { drag: 1 }); }
    }
    for (const [id, v] of this.towers) if (!alive.has(id)) { this.root.remove(v.g); this.towers.delete(id); }
    // Orbs
    let n = 0;
    for (const t of this.world.towers) {
      const o = t.s?.orbs; if (!o || !o.n) continue;
      const R = o.r + 0.15 * o.n, [x, z] = this.toW(t.x, t.y), h = this.ty(t);
      for (let i = 0; i < o.n && n < 120; i++) {
        const a = this.world.t * 2.2 + i * PI * 2 / o.n, ox = x + Math.cos(a) * R, oz = z + Math.sin(a) * R, oy = h + 0.55 + Math.sin(this.t * 3 + i) * 0.08;
        this.M.compose(this.V.set(ox, oy, oz), this.Q.identity(), this.S.setScalar(0.07)); this.orbMesh.setMatrixAt(n, this.M);
        this.M.compose(this.V, this.Q, this.S.setScalar(0.15)); this.orbHalo.setMatrixAt(n, this.M); n++;
        if (Math.random() < dt * 10) this.parts.spawn(ox, oy, oz, 0, 0.1, 0, 0x7df3ff, 0.1, 0.35);
      }
    }
    this.orbMesh.count = this.orbHalo.count = n; this.orbMesh.visible = this.orbHalo.visible = n > 0; this.orbMesh.instanceMatrix.needsUpdate = this.orbHalo.instanceMatrix.needsUpdate = true;
    // Synergie-Funken
    if (Math.random() < dt * 3) for (const s of this.world.synergies) for (const [a, b] of s.links) {
      const [ax, az] = this.toW(a.x, a.y), [bx, bz] = this.toW(b.x, b.y), f = Math.random();
      this.parts.spawn(ax + (bx - ax) * f, 0.35 + Math.sin(f * PI) * 0.4, az + (bz - az) * f, (bx - ax) * 0.4, 0, (bz - az) * 0.4, 0xffe9a0, 0.12, 0.6, { drag: 0.5 });
    }
  }

  // ───────── Gegner ─────────
  syncEnemies(dt) {
    for (const k in this.pools) { const P = this.pools[k]; P.hn = 0; for (const F of P.frames) F.m.count = 0; }
    let blobs = 0;
    let crowns = 0, bars = 0;
    const camQ = this.stage.camera.quaternion;
    const seen = new Set();
    for (const e of this.world.enemies) {
      const [x, z] = this.toW(e.x, e.y);
      let fly = e.flying ? (e.boss ? 0 : 0.85 + Math.sin(this.t * 3 + e.id) * 0.1) : 0;
      if (e.boss || e.kind === 'oni') {
        seen.add(e.id);
        let b = this.bigs.get(e.id);
        if (!b) { b = buildBig(e.boss ? 'vharox' : 'oni') || (e.boss ? buildDragon() : buildOni()); this.root.add(b.root); b.rise = 0; this.bigs.set(e.id, b); }
        b.rise = Math.min(1, b.rise + dt * 0.8);
        b.root.position.set(x, -1.2 * (1 - b.rise) * (1 - b.rise), z); b.root.scale.setScalar(ENEMY_SCALE);
        const tr = PI / 2 - e.ang; let d = tr - b.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); b.root.rotation.y += d * Math.min(1, dt * 4);
        b.tick(this.t, dt, { fly: e.flying, breath: e.boss && e.roarT > 0 && e.phase >= 2, roar: e.roarT > 0, phase: e.phase, cry: e.cryT > 2.5 });
        b.flash = e.hitT > 0 ? 1 : 0;
      } else {
        const P = this.pools[e.kind === 'bearer' && e.guard <= 0 ? 'bearerX' : e.kind]; if (!P || P.hn >= P.cap) continue;
        // Pose: an zurückgelegten Weg gekoppelt (cyc Felder je Zyklus) oder zeitbasiert; betäubt = Standbild
        const nF = P.frames.length, ph = P.cyc ? e.d / P.cyc : (e.stunT > 0 ? 0 : this.t * 1.6 * (e.speed || 1)), F = P.frames[nF > 1 ? (Math.floor((ph + e.id * 0.618) * nF) % nF + nF) % nF : 0];
        const i = F.m.count++; P.hn++;
        const old = !P.baked, bob = old && e.kind === 'slime' ? Math.abs(Math.sin(this.t * 6 + e.id)) : 0;
        const sq = old && e.kind === 'slime' ? 1 + Math.sin(this.t * 12 + e.id) * 0.08 : 1;
        const sc = (e.elite ? 1.25 : 1) * ENEMY_SCALE;
        this.E.set(0, PI / 2 - e.ang, old && (e.kind === 'wolf' || e.kind === 'boar') ? Math.sin(this.t * 14 + e.id) * 0.06 : 0, 'YXZ');
        this.M.compose(this.V.set(x, (e.kind === 'wisp' ? 0.75 : 0) + fly + bob * 0.08, z), this.Q.setFromEuler(this.E), this.S.set(sc * sq, sc / sq, sc * sq));
        F.m.setMatrixAt(i, this.M);
        if (P.baked && blobs < 600) { const r = e.r * sc * 2.6 * (fly || e.kind === 'wisp' ? 0.7 : 1); this.M.compose(this.V.set(x, 0.015, z), this.Q.identity(), this.S.set(r, 1, r)); this.blobs.setMatrixAt(blobs++, this.M); this.Q.setFromEuler(this.E); }
        const T = e.hitT > 0 ? TINT.flash : e.stunT > 0 ? TINT.stun : e.burnT > 0 ? TINT.burn : e.slowT > 0 ? TINT.frost : e.shield > 0 ? TINT.shield : e.vulnT > 0 ? TINT.vuln : e.elite ? TINT.elite : TINT.none;
        F.tint.array.set(T, i * 4);
        if (P.halo) { this.M.compose(this.V.set(x, (e.kind === 'wisp' ? 0.75 : 0) + fly + 0.3, z), this.Q, this.S.setScalar(0.33 + Math.sin(this.t * 8 + e.id) * 0.03)); P.halo.setMatrixAt(P.hn - 1, this.M); }
        if (e.elite && crowns < 200) { this.M.compose(this.V.set(x, e.h * sc + fly + 0.12, z), this.Q.identity(), this.S.setScalar(1)); this.crowns.setMatrixAt(crowns++, this.M); }
        if (e.burnT > 0 && Math.random() < dt * 8) this.parts.spawn(x, 0.4 + fly, z, 0, 0.7, 0, 0xff7a2a, 0.14, 0.4);
        if (e.camo && e.revealT <= 0 && Math.random() < dt * 4) this.parts.spawn(x, 0.5, z, 0, 0.3, 0, 0x6a3aa0, 0.2, 0.6);
      }
      // KP-Balken
      if (e.hp < e.maxHp && bars < 400 && !e.boss) {
        const w = Math.min(0.9, 0.35 + e.maxHp / 400), f = Math.max(0, e.hp / e.maxHp), y = (e.h || 0.6) * (e.elite ? 1.25 : 1) * ENEMY_SCALE + fly + 0.2 + (e.kind === 'wisp' ? 0.75 : 0);
        this.M.compose(this.V.set(x, y, z), camQ, this.S.set(w + 0.04, 0.09, 1)); this.hpBg.setMatrixAt(bars, this.M);
        const off = new THREE.Vector3(-(w * (1 - f)) / 2, 0, 0.001).applyQuaternion(camQ);
        this.M.compose(this.V.set(x + off.x, y + off.y, z + off.z), camQ, this.S.set(Math.max(0.001, w * f), 0.055, 1)); this.hpFg.setMatrixAt(bars, this.M);
        this.hpFg.setColorAt(bars, this.C.setRGB(f > 0.5 ? (1 - f) * 2 : 1, f > 0.5 ? 1 : f * 2, 0.25).multiplyScalar(e.shield > 0 ? 0.6 : 1).add(e.shield > 0 ? new THREE.Color(0.3, 0.2, 0.5) : new THREE.Color(0, 0, 0)));
        bars++;
      }
    }
    this.blobs.count = blobs; this.blobs.instanceMatrix.needsUpdate = true;
    for (const [id, b] of this.bigs) if (!seen.has(id)) { this.root.remove(b.root); this.bigs.delete(id); }
    for (const k in this.pools) {
      const P = this.pools[k];
      for (const F of P.frames) { F.m.instanceMatrix.needsUpdate = true; F.tint.needsUpdate = true; F.m.visible = F.m.count > 0; if (F.ol) { F.ol.count = F.m.count; F.ol.visible = F.m.visible; } }
      if (P.halo) { P.halo.count = P.hn; P.halo.instanceMatrix.needsUpdate = true; P.halo.visible = P.hn > 0; }
    }
    this.crowns.count = crowns; this.crowns.visible = crowns > 0; this.crowns.instanceMatrix.needsUpdate = true;
    this.hpBg.count = this.hpFg.count = bars; this.hpBg.visible = this.hpFg.visible = bars > 0; this.hpBg.instanceMatrix.needsUpdate = this.hpFg.instanceMatrix.needsUpdate = true; if (this.hpFg.instanceColor) this.hpFg.instanceColor.needsUpdate = true;
  }

  // ───────── Platzierung / Auswahl ─────────
  showRange(x, y, r, color = 0xffffff, h = 0) {
    const [wx, wz] = this.toW(x, y);
    for (const m of [this.rangeRing, this.rangeDisc]) { m.visible = true; m.position.set(wx, h + 0.03, wz); m.scale.setScalar(Math.max(0.01, r)); m.material.color.set(color); }
  }
  hideRange() { this.rangeRing.visible = this.rangeDisc.visible = this.supportRing.visible = false; }
  showFoot(x, y, ok, h = 0) { this.cellMark.visible = true; const [wx, wz] = this.toW(x, y); this.cellMark.position.set(wx, h + 0.025, wz); this.cellMark.material.color.set(ok ? 0x5aff8a : 0xff4a5a); }
  hideFoot() { this.cellMark.visible = false; }
  showCell(cx, cy, ok) { this.cellMark.visible = true; const [x, z] = this.toW(cx + 0.5, cy + 0.5); this.cellMark.position.set(x, this.hAt(cx, cy) + 0.02, z); this.cellMark.material.color.set(ok ? 0x5aff8a : 0xff4a5a); }
  hideCell() { this.cellMark.visible = false; }
  select(t) {
    if (!t) { this.selRing.visible = false; this.hideRange(); return; }
    const [x, z] = this.toW(t.x, t.y), h = this.ty(t);
    this.selRing.visible = true; this.selRing.position.set(x, h + 0.03, z);
    this.showRange(t.x, t.y, t.s.range, 0xffffff, h);
    if (t.s.support.range) { this.supportRing.visible = true; this.supportRing.position.set(x, h + 0.035, z); this.supportRing.scale.setScalar(t.s.support.range); } else this.supportRing.visible = false;
  }
  showArrows(sec = 3) { this.arrowT = sec; }

  // ───────── Ereignisse → Effekte ─────────
  handle(ev, settings) {
    const P = this.parts;
    const at = (x, y) => this.toW(x, y);
    switch (ev.t) {
      case 'hit': {
        const [x, z] = at(ev.x, ev.y), col = ELEMENT_COLORS[ev.type] || 0xffffff, y = (ev.e.h || 0.5) * 0.6 + (ev.e.flying && !ev.e.boss ? 0.85 : 0);
        P.burst(x, y, z, col, ev.crit ? 10 : 3, ev.crit ? 3 : 1.6, ev.crit ? 0.16 : 0.1, 0.3);
        if (ev.guard) { if (this.numCount++ % 6 === 0) P.burst(x, y, z, [0xd8e0f0, 0xffffff], 3, 1.4, 0.08, 0.2); break; }
        if (settings.dmgNums && (ev.crit || ev.big || ev.dmg >= 25 || (this.numCount++ % 4 === 0))) this.floaters.add(x, y + 0.3, z, Math.round(ev.dmg), ev.crit ? 'crit' : ev.big ? 'big' : '', ev.crit ? 0.95 : 0.7);
        if (ev.crit && ev.dmg > 60) this.stage.addShake(0.08);
        break;
      }
      case 'ventWarn': { const [x, z] = at(ev.x, ev.y); this.rings.add(x, 0.06, z, ev.r, 0.3, 0xff6a20, 1.5); P.burst(x, 0, z, [0xff8a2a, 0xffd060], 10, 1.2, 0.1, 0.8, { up: 1 }); break; }
      case 'erupt': {
        const [x, z] = at(ev.x, ev.y);
        this.pillars.add(x, z, 0.45, 2.6, 0xff6a20, 0.6);
        P.burst(x, 0.2, z, [0xff5a10, 0xffb040, 0xffe080, 0x3a2a28], 46, 4.5, 0.2, 1.0, { grav: 6, up: 4 });
        this.rings.add(x, 0.05, z, 0.2, ev.r, 0xff7a2a, 0.5);
        this.stage.addShake(0.18); break;
      }
      case 'blast': { const [x, z] = at(ev.x, ev.y); P.burst(x, 0.4, z, [0xff6a1a, 0xffc040, 0x2a1a18], 20, 3, 0.16, 0.6, { up: 2 }); this.rings.add(x, 0.05, z, 0.1, ev.r, 0xff5a1a, 0.4); break; }
      case 'guardBreak': { const [x, z] = at(ev.x, ev.y); P.burst(x, 0.5, z, [0xd8e0f0, 0x8a96a8, 0xffffff], 22, 3.2, 0.14, 0.5, { grav: 5, up: 1.5 }); this.floaters.add(x, 1.2, z, 'Schild gebrochen!', 'crit', 0.9); break; }
      case 'pop': { // Schicht platzt: Ring + Funken in Schichtfarbe, kleines „Plopp“-Wort
        const [x, z] = at(ev.x, ev.y), col = [0, 0x6ff0ff, 0x5ad85a, 0xff8a2a, 0xa05aff, 0xffd23a, 0x8a7ab0][ev.layer] || 0xffffff;
        this.rings.add(x, 0.3, z, 0.1, 0.55 + ev.layer * 0.06, col, 0.22); P.burst(x, 0.35, z, [col, 0xffffff], 8 + ev.layer * 2, 2.8, 0.1, 0.3, { up: 1.5 });
        if (settings.dmgNums && this.numCount++ % 3 === 0) this.floaters.add(x, 0.8, z, ['', 'plopp', 'plopp!', 'PLOPP', 'PLOPP!', 'KRACH', 'KRACK!'][ev.layer], ev.layer >= 5 ? 'crit' : '', 0.6);
        break;
      }
      case 'kill': {
        const [x, z] = at(ev.x, ev.y), e = ev.e, big = e.boss || e.miniboss || e.kind === 'golem';
        const col = { slime: 0x9af070, wolf: 0xb0a070, boar: 0xc0a090, wisp: 0x9ff6ff, shade: 0xa070ff, mage: 0xc0a0ff, healer: 0xffb070, beetle: 0x5ae8d8, mite: 0x5ae8d8, golem: 0xc0b8a8, demon: 0xff7a2a, bearer: 0xc8b8a0, l1: 0x6ff0ff, l2: 0x5ad85a, l3: 0xff8a2a, l4: 0xa05aff, l5: 0xffd23a, kokon: 0x8a7ab0 }[e.kind] || 0xffffff;
        P.burst(x, 0.35, z, [col, 0xffffff], big ? 60 : 12, big ? 4 : 2.4, big ? 0.3 : 0.16, big ? 0.9 : 0.5, { grav: 4, up: 1.4 });
        this.rings.add(x, 0.05, z, 0.1, big ? 2.5 : 0.7, col, big ? 0.7 : 0.35);
        if (ev.coins && settings.dmgNums !== false) this.floaters.add(x, 0.9, z, '+' + ev.coins, 'coin', 0.8);
        if (big) { this.stage.addShake(0.6); this.stage.zoomPunch = Math.max(this.stage.zoomPunch, 0.5); }
        break;
      }
      case 'shot': { const v = this.towers.get(ev.tower.id); if (v) v.atk = 1; if (ev.special) { const [x, z] = at(ev.tower.x, ev.tower.y); P.burst(x, 0.7, z, 0xffa030, 10, 2, 0.2, 0.4); } break; }
      case 'mortar': { const [x, z] = at(ev.tower.x, ev.tower.y); P.burst(x, 0.75, z, [0xd8c8a0, 0x8a8070], 8, 1.6, 0.2, 0.5, { up: 2 }); break; }
      case 'pulse': {
        const v = this.towers.get(ev.tower.id); if (v) v.atk = 1;
        const [x, z] = at(ev.tower.x, ev.tower.y), h = this.ty(ev.tower);
        this.rings.add(x, h + 0.06, z, 0.3, ev.r, 0xbfe8ff, 0.4); this.rings.add(x, h + 0.05, z, 0.2, ev.r * 0.92, 0x7ab0c8, 0.5, { disc: true, alpha: 0.25 });
        P.burst(x, h + 0.1, z, [0xc8b090, 0x8a7a68], 10, 2.5, 0.16, 0.4, { flat: true });
        break;
      }
      case 'cone': {
        const v = this.towers.get(ev.tower.id); if (v) v.atk = 1;
        const t = ev.tower, [x, z] = at(t.x, t.y), h = this.ty(t);
        const col = ev.type === 'fire' ? [0xffd27a, 0xff7a2a, 0xff4a10] : [0xffffff, 0xbff4ff, 0x7ad0ff];
        for (let i = 0; i < 14; i++) { const a = ev.ang + (Math.random() - 0.5) * ev.cone, sp = ev.r * (2 + Math.random() * 1.5); P.spawn(x + Math.cos(a) * 0.3, h + 0.55, z + Math.sin(a) * 0.3, Math.cos(a) * sp, 0.1, Math.sin(a) * sp, col[i % 3], 0.18 + Math.random() * 0.12, 0.35, { drag: 2.2, grow: 1.2 }); }
        break;
      }
      case 'slash': {
        const v = this.towers.get(ev.tower.id); if (v) v.atk = 1;
        const [x, z] = at(ev.x, ev.y); this.rings.add(x, 0.4, z, 0.1, 0.55, 0xd8fff0, 0.12);
        P.burst(x, 0.45, z, [0xffffff, 0xc8ffd8], 4, 2.6, 0.08, 0.18, { flat: true });
        break;
      }
      case 'heal2': this.map.heartGlow && this.rings.add(this.map.heart.getWorldPosition(new THREE.Vector3()).x, 0.06, this.map.heart.getWorldPosition(new THREE.Vector3()).z, 0.2, 1.8, 0xff9ac8, 0.8); break;
      case 'bolt': {
        const v = this.towers.get(ev.tower.id); if (v) v.atk = 1;
        const pts = ev.pts.map((p, i) => { const [x, z] = at(p.x, p.y); return { x, z, y: i === 0 ? 0.8 : 0.45 }; });
        this.bolts.add(pts, 0xbff4ff, 0.06, 0.16); this.bolts.add(pts, 0x5ab8ff, 0.12, 0.1);
        for (const p of pts.slice(1)) P.burst(p.x, 0.45, p.z, [0xffffff, 0x9fe8ff], 5, 2.5, 0.12, 0.25);
        break;
      }
      case 'strike': {
        const [x, z] = at(ev.x, ev.y);
        if (ev.kind === 'thunder') { this.bolts.add([{ x, z, y: 6 }, { x: x + 0.3, z, y: 3 }, { x: x - 0.2, z, y: 1.5 }, { x, z, y: 0.05 }], 0xffffff, 0.14, 0.25); this.stage.addShake(0.2); }
        this.rings.add(x, 0.06, z, 0.2, ev.r + 0.3, ev.kind === 'thunder' ? 0xfff27a : 0xfff2c8, 0.4);
        P.burst(x, 0.3, z, [0xfff27a, 0xffffff], 18, 3.5, 0.2, 0.45, { up: 1.5 });
        break;
      }
      case 'boom': {
        const [x, z] = at(ev.x, ev.y), st = projStyle(ev.kind);
        const c = ev.kind === 'shell' ? [0xff9a40, 0x8a7a6a, 0xffd27a] : [st.c, st.trail, 0xffffff];
        this.rings.add(x, 0.06, z, 0.1, ev.r + 0.2, st.trail, 0.35); this.rings.add(x, 0.05, z, 0.1, ev.r, st.c, 0.3, { disc: true, alpha: 0.4 });
        P.burst(x, 0.3, z, c, ev.r > 1 ? 26 : 14, 3.2, 0.22, 0.5, { grav: 2, up: 1.6 });
        if (ev.r >= 1) this.stage.addShake(0.12);
        break;
      }
      case 'react': { const [x, z] = at(ev.x, ev.y); this.floaters.add(x, 1.1, z, ev.name + '!', 'react', 0.9); this.floaters.live[this.floaters.live.length - 1].d.style.color = ev.color; P.burst(x, 0.5, z, ev.color, 16, 3, 0.2, 0.45); this.rings.add(x, 0.07, z, 0.1, 1.2, ev.color, 0.35); break; }
      case 'stun': { const [x, z] = at(ev.e.x, ev.e.y); for (let i = 0; i < 3; i++) P.spawn(x + Math.cos(i * 2.1) * 0.2, 0.8, z + Math.sin(i * 2.1) * 0.2, 0, 0.2, 0, 0xffe14d, 0.14, 0.6); break; }
      case 'heal': case 'shield': case 'cry': { const [x, z] = at(ev.x, ev.y); const c = ev.t === 'heal' ? 0x7aff9a : ev.t === 'shield' ? 0xb07bff : 0xff4a3a; this.rings.add(x, 0.06, z, 0.2, ev.r, c, 0.6); P.burst(x, 0.6, z, c, 10, 1.4, 0.16, 0.6, { lift: 0.8 }); break; }
      case 'leak': this.stage.addShake(ev.e.boss ? 1 : 0.25); break;
      case 'place': {
        const t = ev.tower, [x, z] = at(t.x, t.y), h = this.ty(t);
        this.rings.add(x, h + 0.04, z, 0.2, 0.9, 0xffffff, 0.4); P.burst(x, h + 0.1, z, [0xd8c8a0, 0xffffff], 14, 2, 0.18, 0.5, { flat: true });
        this.stage.addShake(0.06);
        break;
      }
      case 'upgrade': {
        const t = ev.tower, [x, z] = at(t.x, t.y), h = this.ty(t), col = ['#ff7a3d', '#5fd6ff', '#c39bff'][ev.path];
        this.rings.add(x, h + 0.05, z, 0.2, 1.1, col, 0.45); P.burst(x, h + 0.4, z, [col, 0xffffff], ev.tier >= 5 ? 50 : 18, 2.5, 0.18, 0.7, { lift: 1.5 });
        if (ev.tier >= 5) { this.pillars.add(x, z, 0.5, 6, col, 1.2); this.stage.addShake(0.4); }
        const v = this.towers.get(t.id); if (v) v.born = 0.55;
        break;
      }
      case 'evolve': {
        const t = ev.tower, [x, z] = at(t.x, t.y), v = this.towers.get(t.id), h = this.ty(t);
        if (v) v.evoT = 0.55;
        this.pillars.add(x, z, 0.65, 9, 0xfff6d8, 1.6); this.pillars.add(x, z, 0.35, 9, 0xffffff, 1.2, 0.1);
        for (let i = 0; i < 70; i++) { const a = i * 0.45, r = 0.6 + (i % 7) * 0.05; P.spawn(x + Math.cos(a) * r, h + 0.1 + i * 0.02, z + Math.sin(a) * r, -Math.sin(a) * 1.5, 2.2, Math.cos(a) * 1.5, i % 3 ? 0xfff2a8 : 0x9ff6ff, 0.22, 1.1, { drag: 0.8 }); }
        setTimeout(() => {
          P.burst(x, h + 0.6, z, [0xffffff, 0xfff2a8, 0xffb050], 90, 5, 0.3, 1.0, { up: 1.2 });
          this.rings.add(x, h + 0.06, z, 0.3, 4, 0xfff2a8, 0.7); this.rings.add(x, h + 0.05, z, 0.3, 3, 0xffffff, 0.5, { disc: true, alpha: 0.5 });
          this.stage.addShake(0.7);
        }, 520);
        this.stage.focus = new THREE.Vector3(x, h, z); this.stage.zoomPunch = 1;
        break;
      }
      case 'sell': { const [x, z] = at(ev.tower.x, ev.tower.y); P.burst(x, 0.4, z, [0xffd257, 0xffffff], 20, 2.5, 0.16, 0.6, { grav: 3, up: 1.5 }); this.floaters.add(x, 0.9, z, '+' + ev.value, 'coin', 0.9); break; }
      case 'rock': { this.map.removeRock(ev.cx, ev.cy); const [x, z] = at(ev.cx + 0.5, ev.cy + 0.5); P.burst(x, 0.3, z, [0x9a9aa0, 0xc8c0b0], 30, 3, 0.25, 0.7, { grav: 6, up: 1.5 }); this.stage.addShake(0.3); break; }
      case 'boss': case 'spawn': {
        if (ev.e.boss || ev.e.miniboss) { const [x, z] = at(ev.e.x, ev.e.y); P.burst(x, 0.2, z, [0x3a1050, 0xff4a20, 0x1a0a20], 80, 3, 0.4, 1.4, { up: 2 }); this.rings.add(x, 0.05, z, 0.3, 3.5, 0xff4a20, 1.0); this.stage.addShake(0.8); }
        break;
      }
      case 'bossPhase': { const [x, z] = at(ev.e.x, ev.e.y); this.rings.add(x, 0.06, z, 0.4, 5, 0xff3a20, 0.8); P.burst(x, 1.5, z, [0xff6a20, 0xffd27a], 60, 5, 0.3, 0.8); this.stage.addShake(1); this.stage.focus = new THREE.Vector3(x, 0, z); this.stage.zoomPunch = 0.8; break; }
      case 'bossFly': { const [x, z] = at(ev.e.x, ev.e.y); P.burst(x, 0.2, z, [0xc8b8a8, 0x8a7a6a], 40, 4, 0.3, 0.7, { flat: true }); break; }
      case 'breath': {
        const [bx, bz] = at(ev.e.x, ev.e.y);
        for (const t of ev.targets) {
          const [x, z] = at(t.x, t.y);
          for (let i = 0; i < 40; i++) { const f = i / 40; P.spawn(bx + (x - bx) * f + (Math.random() - 0.5) * 0.3, 1.8 - f * 1.3, bz + (z - bz) * f + (Math.random() - 0.5) * 0.3, (x - bx) * 0.8, 0.5, (z - bz) * 0.8, f < 0.5 ? 0xffd27a : 0xff4a10, 0.35, 0.5 + f * 0.4); }
          this.rings.add(x, 0.06, z, 0.2, 1, 0xff4a10, 0.6);
        }
        this.stage.addShake(0.5);
        break;
      }
      case 'bossDie': { const [x, z] = at(ev.e.x, ev.e.y); for (let i = 0; i < 5; i++) setTimeout(() => { P.burst(x + (Math.random() - 0.5), 1, z + (Math.random() - 0.5), [0xff6a20, 0xffd27a, 0xffffff], 60, 5, 0.35, 1.1, { grav: 2 }); this.stage.addShake(0.6); }, i * 180); this.pillars.add(x, z, 1.2, 12, 0xffd27a, 2); this.stage.focus = new THREE.Vector3(x, 0, z); this.stage.zoomPunch = 1; break; }
      case 'heroLevel': { const t = ev.tower, [x, z] = at(t.x, t.y); this.rings.add(x, 0.06, z, 0.2, 1, 0xffb050, 0.6); P.burst(x, 0.6, z, [0xffb050, 0xffffff], ev.milestone ? 40 : 14, 2.5, 0.18, 0.8, { lift: 1.5 }); this.floaters.add(x, 1.4, z, 'Lv ' + ev.lvl, 'lvl', 1.1); if (ev.lvl === 15 || ev.lvl === 20) this.pillars.add(x, z, 0.5, 6, 0xff8a2a, 1.4); break; }
      case 'dash': this.runGhost(this.ghostFox, 'path', 1.0, 0x8ff6ff); break;
      case 'ability': this.ability(ev); break;
      case 'wave': this.showArrows(2.5); break;
    }
  }
  runGhost(gm, mode, dur, col, from, to) {
    gm.root.visible = true; this.ghostAnim = { gm, mode, t: 0, dur, col, from, to };
  }
  ability(ev) {
    const P = this.parts, t = ev.tower, [tx, tz] = this.toW(t.x, t.y);
    switch (ev.id) {
      case 'goldrain': {
        this.rings.add(tx, 0.06, tz, 0.2, 2.6, 0xffd257, 0.7);
        for (let i = 0; i < 40; i++) setTimeout(() => this.parts.spawn(tx + (Math.random() - 0.5) * 3, 3 + Math.random(), tz + (Math.random() - 0.5) * 3, 0, -3, 0, Math.random() < 0.7 ? 0xffd257 : 0xfff2b0, 0.12, 1.2, { grav: 2 }), i * 25);
        this.floaters.add(tx, 1.4, tz, '+' + ev.coins, 'coin', 1.2); break;
      }
      case 'foxstorm': {
        const [x, z] = this.toW(ev.x, ev.y);
        this.runGhost(this.ghostFire, 'leap', 0.55, 0xffa040, [tx, tz], [x, z]);
        setTimeout(() => {
          this.rings.add(x, 0.06, z, 0.2, 3, 0xffa040, 0.6); this.rings.add(x, 0.05, z, 0.2, 2.4, 0xff5a10, 0.7, { disc: true, alpha: 0.6 });
          P.burst(x, 0.5, z, [0xffd27a, 0xff7a2a, 0xff3a10, 0x7df3ff], 140, 6, 0.35, 1.0, { up: 1.3, grav: 1 });
          this.pillars.add(x, z, 1.5, 4, 0xff7a2a, 0.8);
          this.stage.addShake(1); this.stage.focus = new THREE.Vector3(x, 0, z); this.stage.zoomPunch = 0.9;
        }, 520);
        break;
      }
      case 'judgement': {
        this.darken = 1.6;
        ev.targets.forEach((p, i) => { const [x, z] = this.toW(p.x, p.y); this.pillars.add(x, z, 0.45, 10, i % 2 ? 0x9ff6ff : 0xffe9a0, 1.1, i * 0.07); setTimeout(() => { P.burst(x, 0.4, z, [0xffffff, 0x9ff6ff, 0xffd27a], 40, 4, 0.28, 0.8, { up: 1.5 }); this.rings.add(x, 0.06, z, 0.2, 1.6, 0x9ff6ff, 0.5); }, 150 + i * 70); });
        setTimeout(() => this.stage.addShake(1.1), 300);
        this.pillars.add(tx, tz, 0.9, 12, 0xffffff, 1.6);
        break;
      }
      case 'roar': {
        const pts = ev.pts.map((p, i) => { const [x, z] = this.toW(p.x, p.y); return { x, z, y: i ? 0.5 : 1 }; });
        for (let i = 1; i < pts.length; i++) { this.bolts.add([{ x: pts[i].x, z: pts[i].z, y: 7 }, { x: pts[i].x + 0.2, z: pts[i].z, y: 3 }, pts[i]], 0xffffff, 0.12, 0.35); P.burst(pts[i].x, 0.4, pts[i].z, [0xffffff, 0xfff27a, 0x9fe8ff], 14, 3, 0.2, 0.5); }
        this.rings.add(tx, 0.06, tz, 0.3, 5, 0xfff27a, 0.6); this.stage.addShake(0.9); this.flashSky = 0.8;
        break;
      }
      case 'fortress': { this.rings.add(tx, 0.06, tz, 0.3, 3.5, 0xbfe8ff, 0.6); this.rings.add(tx, 0.05, tz, 0.3, 3.5, 0x6ab0d0, 0.7, { disc: true, alpha: 0.4 }); P.burst(tx, 0.2, tz, [0xc8b090, 0x8a7a68, 0xffffff], 90, 6, 0.3, 0.8, { flat: true }); this.stage.addShake(1); break; }
      case 'blessing': { this.rings.add(tx, 0.06, tz, 0.3, 3.5, 0x9aff9a, 1.0); for (let i = 0; i < 80; i++) { const a = Math.random() * PI * 2, r = Math.random() * 3.5; P.spawn(tx + Math.cos(a) * r, 0.1, tz + Math.sin(a) * r, 0, 1.2 + Math.random(), 0, i % 2 ? 0xffa8c8 : 0x9aff9a, 0.16, 1.4, { drag: 0.5 }); } break; }
      case 'eclipse': { this.darken = 2.2; for (const e of this.world.enemies) { const [x, z] = this.toW(e.x, e.y); P.burst(x, 0.6, z, 0xb07bff, 8, 1.5, 0.18, 0.6); } this.stage.addShake(0.4); break; }
      case 'clones': { for (let i = 0; i < 3; i++) { const a = i * 2.1; P.burst(tx + Math.cos(a) * 0.9, 0.5, tz + Math.sin(a) * 0.9, [0x3a3a48, 0xffffff], 20, 2, 0.25, 0.6); } break; }
      case 'whirl': { this.runGhost(this.ghostFire, 'path', 1.1, 0xff8a2a); this.stage.addShake(0.6); break; }
      case 'blizzard': { this.rings.add(tx, 0.06, tz, 0.3, ev.r, 0xbff4ff, 0.8); this.rings.add(tx, 0.05, tz, 0.3, ev.r, 0x7ad0ff, 0.9, { disc: true, alpha: 0.5 }); for (let i = 0; i < 120; i++) { const a = Math.random() * PI * 2, r = Math.random() * ev.r; P.spawn(tx + Math.cos(a) * r, 2 + Math.random() * 2, tz + Math.sin(a) * r, 0.5, -2, 0, i % 2 ? 0xffffff : 0xbff4ff, 0.14, 1.4, { drag: 0.3 }); } this.flashSky = 0.6; this.stage.addShake(0.7); break; }
      case 'flurry': { for (let i = 0; i < 6; i++) setTimeout(() => this.rings.add(tx, 0.4, tz, 0.2, 1.4, 0xc8ffd8, 0.25), i * 90); P.burst(tx, 0.5, tz, [0xc8ffd8, 0xffffff], 30, 3, 0.12, 0.4, { flat: true }); break; }
      case 'quake': { this.rings.add(tx, 0.06, tz, 0.3, ev.r, 0xc8a070, 0.7); this.rings.add(tx, 0.05, tz, 0.3, ev.r * 0.9, 0x8a6a48, 0.8, { disc: true, alpha: 0.45 }); P.burst(tx, 0.2, tz, [0xc8b090, 0x8a7a68, 0x6a5a48], 120, 7, 0.3, 0.9, { flat: true, grav: 3 }); this.stage.addShake(1.2); break; }
      case 'storm': case 'thunderfall': {
        const many = ev.id === 'thunderfall';
        ev.targets.forEach((p, i) => { const [x, z] = this.toW(p.x, p.y); setTimeout(() => { this.bolts.add([{ x, z, y: 7 }, { x: x + 0.3, z, y: 4 }, { x: x - 0.2, z, y: 2 }, { x, z, y: 0.1 }], 0xffffff, many ? 0.16 : 0.13, 0.3); P.burst(x, 0.4, z, [0xffffff, 0x9fe8ff, 0xfff27a], 16, 3.5, 0.2, 0.45); this.rings.add(x, 0.06, z, 0.2, 1.2, 0x9fe8ff, 0.4); }, i * (many ? 25 : 70)); });
        this.flashSky = many ? 1 : 0.6; this.stage.addShake(many ? 1.3 : 0.7); if (many) this.darken = 1.2;
        break;
      }
      case 'bloom': { this.rings.add(tx, 0.06, tz, 0.3, ev.r, 0xff9ac8, 1.0); for (let i = 0; i < 90; i++) { const a = Math.random() * PI * 2, r = Math.random() * ev.r; P.spawn(tx + Math.cos(a) * r, 0.1, tz + Math.sin(a) * r, 0, 1 + Math.random(), 0, i % 2 ? 0xffb8d0 : 0xffffff, 0.15, 1.4, { drag: 0.5 }); } break; }
      case 'sanctuary': { this.darken = 0.8; for (const e of this.world.enemies) { const [x, z] = this.toW(e.x, e.y); this.rings.add(x, 0.07, z, 0.2, 0.8, 0xff9ac8, 1.2); } this.rings.add(tx, 0.06, tz, 0.5, 9, 0xffd2e8, 1.4); this.pillars.add(tx, tz, 0.8, 8, 0xffb8d8, 1.5); break; }
    }
  }
  updGhost(dt) {
    const G = this.ghostAnim; if (!G) return;
    G.t += dt; const k = Math.min(1, G.t / G.dur), r = G.gm.root;
    if (G.mode === 'path') {
      const w = this.world, d = w.len * (1 - k), p = w.posAt(d, {}, 0), [x, z] = this.toW(p.x, p.y);
      r.position.set(x, 0.1, z); r.rotation.y = PI / 2 - p.ang + PI; r.scale.setScalar(1.3);
      if (Math.random() < 0.9) this.parts.burst(x, 0.5, z, G.col, 3, 1.2, 0.2, 0.5);
    } else {
      const [ax, az] = G.from, [bx, bz] = G.to; r.position.set(ax + (bx - ax) * k, Math.sin(k * PI) * 3, az + (bz - az) * k); r.rotation.y = Math.atan2(bx - ax, bz - az); r.scale.setScalar(1 + k * 2.2);
      this.parts.burst(r.position.x, r.position.y + 0.5, r.position.z, G.col, 4, 1.5, 0.25, 0.5);
    }
    G.gm.tick(this.t, dt, {});
    if (k >= 1) { r.visible = false; this.ghostAnim = null; }
  }

  update(dt, settings) {
    this.t += dt;
    this.syncTowers(dt); this.syncEnemies(dt);
    this.projs.sync(this.world.projs, (x, y) => this.toW(x, y), this.t, this.parts, this.stage.quality);
    this.updGhost(dt);
    // Pfeile
    if (this.arrowT > 0) {
      this.arrowT -= dt; const w = this.world, n = 24, a = Math.min(1, this.arrowT);
      for (let i = 0; i < n; i++) {
        const pi = i % w.paths.length, L = w.paths[pi].len, d = ((this.t * 2.4 + i * L / n) % L), p = w.posAt(d, {}, pi), [x, z] = this.toW(p.x, p.y);
        this.E.set(0, PI / 2 - p.ang, 0); this.M.compose(this.V.set(x, 0.02, z), this.Q.setFromEuler(this.E), this.S.setScalar(a * 1.3)); this.arrows.setMatrixAt(i, this.M);
      }
      this.arrows.count = n; this.arrows.visible = true; this.arrows.instanceMatrix.needsUpdate = true;
    } else { this.arrows.count = 0; this.arrows.visible = false; }
    // Umgebung: Blütenblätter + Glühwürmchen
    this.petalT += dt;
    if (this.petalT > 0.12 && this.stage.quality > 0) {
      this.petalT = 0;
      if (this.ash) this.parts.spawn((Math.random() - 0.5) * 20, 0.1, (Math.random() - 0.5) * 12, 0.15, 0.5 + Math.random() * 0.4, 0, Math.random() < 0.6 ? 0xff8a2a : 0x6a5a58, 0.07, 5, { drag: 0.05 });
      else this.parts.spawn((Math.random() - 0.5) * 14, 3 + Math.random() * 2, (Math.random() - 0.5) * 18, 0.4, -0.35, 0.2, Math.random() < 0.7 ? 0xffb8d0 : 0xffffff, 0.09, 6, { drag: 0.05 });
    }
    this.parts.update(dt); this.rings.update(dt); this.bolts.update(dt); this.pillars.update(dt);
    const lf = this.world.lives / this.world.maxLives;
    this.map.wt = this.world.t; this.map.update(dt, lf);
    // Himmel abdunkeln (Ultimates)
    const bg = this.stage.scene.background;
    if (this.darken > 0) { this.darken -= dt; bg.setHex(this.sky).lerp(new THREE.Color(0x1a1030), Math.min(1, this.darken) * 0.75); this.stage.hemi.intensity = 1.25 - Math.min(1, this.darken) * 0.7; }
    else if (this.flashSky > 0) { this.flashSky -= dt * 2; bg.setHex(this.sky).lerp(new THREE.Color(0xffffff), Math.max(0, this.flashSky)); }
    else { bg.setHex(this.sky); this.stage.hemi.intensity = 1.25; }
    this.stage.scene.fog.color.copy(bg);
    this.floaters.update(dt, this.stage.camera, this.stage.w, this.stage.h);
  }
  screenPos(x, y, h = 1) { const [wx, wz] = this.toW(x, y); const v = new THREE.Vector3(wx, h, wz).project(this.stage.camera); return [(v.x * 0.5 + 0.5) * this.stage.w, (-v.y * 0.5 + 0.5) * this.stage.h]; }
  dispose() {
    this.scene.remove(this.root); this.floaters.clear();
    this.stage.scene.background.setHex(0xbfe6dc); this.stage.hemi.color.setHex(0xdff4ff);
  }
}
