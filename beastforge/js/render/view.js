// Darstellung eines Runs: liest world (Zustand) + Ereignisse, besitzt alle three.js-Objekte des Spielfelds.
import * as THREE from 'three';
import { MapView, HEIGHT } from './mapview.js';
import { Ambient } from './ambient.js';
import { afxFor } from './attackfx.js';
import { megaDef } from '../data/megas.js';
const MEGA_COL = [0xff6a2a, 0x5fe6ff, 0xb07bff];
import { Particles, Rings, Bolts, Pillars, Projectiles, Floaters, Flashes, Sparks, Arcs, projStyle } from './fx.js';
import { RAFT_TOP } from './mapview.js';
import { ENEMY_MODELS, bakeFrames, buildBig } from './assets.js';
import { buildModel, ENEMY_GEO, ENEMY_GLOW, ENEMY_ALPHA, buildOni, buildDragon } from './models.js';
import { enemyMat, enemyOutline, glow, toon, geo, lodGeo, mk } from './toon.js';
import { ELEMENT_COLORS, ENEMIES } from '../data/enemies.js';
import { CREATURES } from '../data/creatures.js';

const PI = Math.PI;
const TOWER_SCALE = 1.75, ENEMY_SCALE = 1.5;
const backOut = k => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const TINT = { flash: [1, 1, 1, 0.75], burn: [1, 0.45, 0.1, 0.32], frost: [0.45, 0.8, 1, 0.38], stun: [1, 0.95, 0.4, 0.4], shield: [0.7, 0.5, 1, 0.35], vuln: [1, 0.25, 0.35, 0.22], elite: [1, 0.82, 0.3, 0.16], none: [0, 0, 0, 0] };

export const OWNER_COL = [0x4aa8ff, 0xffa03a];   // Koop-Farben: Spieler 1 (Gastgeber) blau, Spieler 2 orange
export class GameView {
  constructor(stage, world, opts = {}) {
    this.stage = stage; this.world = world; this.scene = stage.scene; this.opts = opts;
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.map = new MapView(this.root, world.map);
    if (opts.heart && opts.heart.id !== 'default' && this.map.heartCore) {   // Kosmetik: Herzkristall
      const M = this.map; M.heartCore.material = M.heartCore.material.clone(); M.heartCore.material.color.setHex(opts.heart.core); M.heartCore.material.emissive.setHex(opts.heart.glow);
      M.heartGlow.material.color.setHex(opts.heart.glow); M.heartLight.color.setHex(opts.heart.glow);
    }
    this.popCols = opts.pop?.cols || null;   // Kosmetik: Plopp-Effekt
    stage.mapW = this.map.W; stage.mapH = this.map.H; stage.fit();
    this.parts = new Particles(this.root); this.rings = new Rings(this.root); this.bolts = new Bolts(this.root); this.pillars = new Pillars(this.root); this.flashes = new Flashes(this.root); this.sparks = new Sparks(this.root); this.arcs = new Arcs(this.root); this.later = [];
    this.amb = new Ambient(this.root, this.map, world.map.theme, { rings: this.rings, parts: this.parts });   // lebendige Karte (ambient.js)
    this.projs = new Projectiles(this.root);
    this.floaters = new Floaters(document.getElementById('floaters'));
    this.towers = new Map(); this.bigs = new Map(); this.t = 0; this.numCount = 0;
    this.buildEnemyPools(); this.buildHelpers();
    this.petalT = 0; this.sky = world.map.theme.sky ?? 0xbfe6dc; this.ash = !!world.map.theme.ash; this.snow = !!world.map.theme.snow;
    this.stage.hemi.color.setHex(this.ash ? 0xffd8c0 : 0xdff4ff);
  }
  toW(x, y) { return [x - this.map.W / 2, y - this.map.H / 2]; }
  hAt(cx, cy) { return this.map.heightAt(cx, cy); }
  ty(t) { return t.raft != null ? RAFT_TOP : this.hAt(t.cx, t.cy); }

  buildEnemyPools() {
    this.pools = {}; const cap = { slime: 120, wolf: 140, boar: 90, wisp: 90, shade: 90, mage: 50, healer: 50, beetle: 90, mite: 200, golem: 24, demon: 120, bearer: 60, bearerX: 60, l1: 220, l2: 200, l3: 180, l4: 160, l5: 160, kokon: 60, whale: 30, whale2: 12 };
    // Echte Modelle: N vorgebackene Posen je Gegnerart (je Pose ein InstancedMesh). Ohne Modelle: alte Formen.
    const ENEMY_H = { ...Object.fromEntries(Object.entries(ENEMIES).map(([k, d]) => [k, d.h])), bearerX: ENEMIES.bearer.h };
    for (const k of new Set([...Object.keys(ENEMY_GEO), ...Object.keys(ENEMY_MODELS)])) {
      const spec = ENEMY_MODELS[k], baked = spec ? bakeFrames({ ...spec, h: (ENEMY_H[k] || 0.6) * spec.h }) : null;
      const geos = baked || (ENEMY_GEO[k] ? [ENEMY_GEO[k]()] : null); if (!geos) continue;
      this.pools[k] = this.makePool(k, geos, !!baked, spec, cap[k]);
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
  towerKey(t) {   // (Besitzer ändert sich nie → kein Teil des Schlüssels)
 return t.cid + (t.ascended ? 'A' : '') + (t.mega != null ? 'M' + t.mega : '') + '|' + (t.hero ? 'h' + (t.hlvl >= 20 ? 2 : t.hlvl >= 15 ? 1 : 0) : t.stage + ':' + t.tiers.join('') + ':' + (this.opts.branch?.(t.cid) || '') + (this.opts.skin?.(t.cid) || '')); }
  makeTower(t) {
    const m = buildModel(t.cid, { stage: t.stage, tiers: t.tiers, branch: this.opts.branch?.(t.cid), skin: this.opts.skin?.(t.cid), hlvl: t.hlvl });
    const g = new THREE.Group(), pose = new THREE.Group(); pose.rotation.order = 'YXZ'; pose.add(m.root); g.add(pose); g.scale.setScalar(TOWER_SCALE * (t.ascended ? 1.45 : 1));
    if (t.ascended) { // Ahnenform: goldene Aura, Runenring, Lichtsäule
      const aura = new THREE.Group(); g.add(aura);
      aura.add(mk(geo.torus(0.03), glow(0xffd257, 0.9), { r: [PI / 2, 0, 0], s: 0.62, ol: false })); aura.add(mk(geo.torus(0.02), glow(0xffffff, 0.7), { r: [PI / 2, 0, 0], s: 0.7, ol: false }));
      for (let i = 0; i < 8; i++) { const q = i / 8 * PI * 2; aura.add(mk(geo.box(), glow(i % 2 ? 0xffd257 : 0xff9af0, 0.9), { p: [Math.cos(q) * 0.62, 0.08, Math.sin(q) * 0.62], r: [0, -q, 0], s: [0.07, 0.11, 0.012], ol: false })); }
      const col = mk(geo.cyl(16), glow(0xffd257, 0.12), { p: [0, 0.9, 0], s: [0.5, 1.8, 0.5], ol: false }); g.add(col);
      const tick0 = m.tick; m.tick = (tt, dt, s) => { tick0(tt, dt, s); aura.rotation.y = tt * 0.6; col.material.opacity = 0.09 + Math.sin(tt * 2.2) * 0.04; };
    }
    let spirit = null;
    if (t.mega != null) {   // Mega-Form: riesiger leuchtender Geist der Kreatur hinter ihr (bewegt sich mit, schlägt beim Angriff mit aus)
      const sm = buildModel(t.cid, { stage: t.stage, tiers: t.tiers, branch: this.opts.branch?.(t.cid), hlvl: 1 }), col = MEGA_COL[t.mega];
      const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false });
      sm.root.traverse(o => { if (o.isMesh) { o.material = mat; o.castShadow = false; } });
      spirit = { m: sm, mat, g: new THREE.Group() }; spirit.g.add(sm.root); spirit.g.position.set(0, 0.12, -0.32); spirit.g.scale.setScalar(2.1); pose.add(spirit.g);
      g.add(mk(geo.torus(0.035), glow(col, 0.9), { r: [PI / 2, 0, 0], s: 0.6, p: [0, 0.04, 0], ol: false }));
    }
    const [x, z] = this.toW(t.x, t.y); g.position.set(x, this.ty(t), z);
    // Schatten-Kreis unter der Figur
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false })); sh.position.y = 0.01; g.add(sh);
    if (this.world.players > 1) {   // Koop: farbiger Besitzer-Ring (Spieler 1 blau, Spieler 2 orange)
      const col = OWNER_COL[t.owner || 0];
      g.add(mk(geo.torus(0.06), toon(col, { emissive: col, emissiveIntensity: 0.6 }), { p: [0, 0.04, 0], r: [PI / 2, 0, 0], s: 0.46, ol: false }));
      g.add(mk(new THREE.CircleGeometry(0.42, 24).rotateX(-PI / 2), glow(col, 0.35), { p: [0, 0.02, 0], ol: false }));
    }
    this.root.add(g);
    return { g, m, pose, spirit, key: this.towerKey(t), atk: 0, rot: t.ang, born: 0, evoT: 0, flash: 0, at: 9, flip: 1, chg: 0, lastFire: -9 };
  }
  // Angriffs-Bewegung je Kampfstil: Ausholen → Zuschlagen → Nachfedern (auf der Zwischengruppe `pose`)
  atkPose(v, t) {
    const P = v.pose, st = t.s?.atk || 'proj', D = Math.min(0.42, Math.max(0.16, 0.85 / Math.max(0.5, t.s?.rate || 1))), u = Math.min(1, v.at / D);
    let lean = 0, fwd = 0, lift = 0, sy = 1, sxz = 1, twist = 0;
    if (u < 1) {
      const ant = u < 0.22 ? u / 0.22 : Math.max(0, 1 - (u - 0.22) / 0.12);            // Ausholen
      const hit = u < 0.22 ? 0 : u < 0.34 ? (u - 0.22) / 0.12 : Math.pow(1 - (u - 0.34) / 0.66, 2); // Schlag + Abklingen
      const wob = u > 0.34 ? Math.sin((u - 0.34) / 0.66 * Math.PI * 2.5) * (1 - u) * 0.5 : 0;          // Nachfedern
      if (st === 'proj') { lean = -0.14 * ant + 0.2 * hit; fwd = -0.03 * ant + 0.07 * hit; sy = 1 - 0.06 * ant + 0.05 * hit + 0.03 * wob; sxz = 1 + 0.03 * ant - 0.03 * hit; }
      else if (st === 'chain') { sy = 1 - 0.12 * ant + 0.09 * hit; sxz = 1 + 0.06 * ant - 0.03 * hit; lean = 0.08 * ant - 0.26 * hit; lift = 0.05 * hit; }
      else if (st === 'pulse') { // Sprung und Stampfen: Landung bei u = 0.6
        const air = u > 0.22 && u < 0.6 ? Math.sin((u - 0.22) / 0.38 * Math.PI) : 0, land = u >= 0.6 ? Math.pow(1 - (u - 0.6) / 0.4, 2) : 0;
        lift = 0.2 * air; sy = 1 - 0.12 * ant + 0.08 * air - 0.18 * land; sxz = 1 + 0.06 * ant - 0.04 * air + 0.12 * land; lean = 0.06 * air;
      } else if (st === 'breath') { lean = -0.24 * ant + 0.2 * hit; fwd = -0.04 * ant + 0.06 * hit; sy = 1 + 0.04 * ant - 0.04 * hit; sxz = 1 + 0.05 * hit; }
      else if (st === 'slash') { fwd = 0.2 * hit - 0.02 * ant; twist = v.flip * (-0.35 * ant + 0.5 * hit); lean = 0.12 * hit; sy = 1 - 0.05 * ant; }
      sy += 0; lean += wob * 0.06;
    } else if (v.chg > 0) {   // Vorbereitung: zurücklehnen, ducken, Spannung aufbauen (Auslösen = Schlag oben)
      const c = v.chg * v.chg, pu = st === 'pulse' ? 1.6 : 1;
      lean = (st === 'slash' ? 0.05 : -0.13) * c; sy = 1 - 0.07 * c * pu; sxz = 1 + 0.035 * c * pu; twist = st === 'slash' ? -v.flip * 0.3 * c : 0;
      if (v.chg > 0.85) { const j = Math.sin(this.t * 70) * 0.012; sxz += j; }   // kurzes Zittern kurz vor dem Schuss
    }
    P.rotation.set(lean, v.rot + twist, 0);
    P.position.set(Math.sin(v.rot) * fwd, lift, Math.cos(v.rot) * fwd);
    P.scale.set(sxz, sy, sxz);
  }
  // Auslösen eines Angriffs: Pose starten + Mündungsblitz an der „Hand“
  atkStart(t, color, delay = 0) {
    const v = this.towers.get(t.id); if (!v) return null;
    v.atk = 1; v.at = -delay; v.flip = -v.flip;
    if (v.fx && v.chg > 0.15 && this.stage.quality > 0) this.release(v, t);
    v.lastFire = this.t; v.chg = 0;
    if (color != null) { const [x, z] = this.toW(t.x, t.y), h = this.ty(t), f = 0.32 * TOWER_SCALE; this.flashes.add(x + Math.sin(v.rot) * f, h + 0.55, z + Math.cos(v.rot) * f, color, 0.22, 0.09, { k: 0.8 }); }
    return v;
  }
  // ───────── Angriffs-Choreografie (attackfx.js): Vorbereitung vor dem Schuss, Auslösen, Signatur ─────────
  // Liest nur t.cd (Abklingzeit) aus der Simulation – ändert nie den Spielzustand.
  mouth(v, t) { const s = t.s, pulse = s?.atk === 'pulse', f = pulse ? 0 : 0.32 * TOWER_SCALE, [x, z] = this.toW(t.x, t.y), h = this.ty(t); return [x + Math.sin(v.rot) * f, h + (pulse ? 0.3 : 0.55), z + Math.cos(v.rot) * f, x, h, z, f]; }
  charge(v, t, dt) {
    const s = t.s; if (!s || s.atk === 'none' || t.disabledT > 0) { v.chg = 0; if (v.orb) v.orb.visible = false; return; }
    if (!v.fx || v.fxKey !== v.key) { v.fx = afxFor(t); v.fxKey = v.key; }
    const W = Math.min(0.42, 0.65 / Math.max(0.5, s.rate)), engaged = this.t - v.lastFire < 2.2;
    const c = engaged && W >= 0.14 && t.cd > 0 && t.cd < W ? 1 - t.cd / W : 0;
    v.chg = c;
    const F = v.fx, [mx, my, mz, x, h, z] = this.mouth(v, t), sc = v.g.scale.x;
    if (!v.orb) { v.orb = mk(geo.sphere(10), new THREE.MeshBasicMaterial({ color: F.col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), { ol: false }); v.g.add(v.orb); }
    v.orb.visible = c > 0;
    if (c <= 0) return;
    const k = c * c; v.orb.position.set((mx - x) / sc, (my - h) / sc, (mz - z) / sc); v.orb.material.color.setHex(F.col);
    v.orb.scale.setScalar((0.05 + 0.15 * k * Math.min(1.7, F.power)) * (1 + Math.sin(this.t * 40) * 0.08) / sc); v.orb.material.opacity = 0.3 + 0.65 * k;
    if (this.stage.quality === 0 || this.crowd) return;
    const rate = 16 * F.power * (this.world.enemies.length > 120 ? 0.35 : 1);
    if (Math.random() < dt * rate) this.gatherFx(F.gather, mx, my, mz, x, h, z, F.accent && Math.random() < 0.35 ? F.accent : F.col);
  }
  gatherFx(kind, mx, my, mz, x, h, z, col) {
    const P = this.parts, r = Math.random;
    if (kind === 'spark') { const a = r() * PI * 2, R = 0.22 + r() * 0.2; this.sparks.add(x + Math.cos(a) * R, h + 0.2 + r() * 0.5, z + Math.sin(a) * R, (r() - 0.5) * 2, 1 + r() * 2, (r() - 0.5) * 2, col, 0.12, 0.025); return; }
    if (kind === 'swirl') { const a = r() * PI * 2, R = 0.45; P.spawn(x + Math.cos(a) * R, h + 0.22 + r() * 0.2, z + Math.sin(a) * R, -Math.sin(a) * 2.2 - Math.cos(a) * 0.6, 0.45, Math.cos(a) * 2.2 - Math.sin(a) * 0.6, col, 0.1, 0.4, { drag: 0.5 }); return; }
    if (kind === 'dust') { const a = r() * PI * 2, R = 0.4 + r() * 0.15; P.spawn(x + Math.cos(a) * R, h + 0.03, z + Math.sin(a) * R, -Math.cos(a) * 0.6, 0.9 + r() * 0.6, -Math.sin(a) * 0.6, col, 0.08, 0.45, { drag: 1 }); return; }
    if (kind === 'glint') { if (r() < 0.35) this.flashes.add(mx + (r() - 0.5) * 0.25, my + 0.05, mz + (r() - 0.5) * 0.25, col, 0.12, 0.08, { k: 0.9 }); return; }
    // flame / leaf / smoke / star: Energie strömt von außen ins Maul
    const a = r() * PI * 2, b = (r() - 0.3) * 1.2, R = 0.38, L = 0.28, px = mx + Math.cos(a) * Math.cos(b) * R, py = my + Math.sin(b) * R, pz = mz + Math.sin(a) * Math.cos(b) * R;
    P.spawn(px, py, pz, (mx - px) / L, (my - py) / L + (kind === 'flame' ? 0.3 : 0), (mz - pz) / L, col, kind === 'smoke' ? 0.14 : kind === 'star' ? 0.07 : 0.09, L, { drag: 0, grow: kind === 'smoke' ? 0.8 : -1.2 });
  }
  // Auslösen: Mündungsblitz in Pfadfarbe, Funkenfächer (+ Kreuzpfad-Akzent), Signatur je Kreatur
  release(v, t) {
    const F = v.fx, [mx, my, mz, x, h, z] = this.mouth(v, t), dx = Math.sin(v.rot), dz = Math.cos(v.rot), pw = Math.min(1.8, F.power) * (0.6 + 0.4 * v.chg);
    this.flashes.add(mx, my, mz, F.col, 0.38 * pw, 0.11, { k: 0.85 });
    if (this.crowd) return;
    this.sparks.fan(mx, my, mz, dx, dz, F.accent ? [F.col, F.accent, 0xffffff] : [F.col, 0xffffff], 3 + Math.round(pw * 2), 3.2, 0.45, { len: 0.03, life: 0.16 });
    if (F.sig === 'thunder') { this.rings.add(x, h + 0.05, z, 0.1, 0.55 + 0.25 * pw, F.col, 0.22, { alpha: 0.8 }); if (F.top >= 3) this.bolts.add([{ x, y: h + 1.6, z }, { x: x + (Math.random() - 0.5) * 0.2, y: h + 0.8, z }, { x, y: h + 0.2, z }], 0xfff6c0, 0.05, 0.12); }
    else if (F.sig === 'splash') this.parts.burst(mx, my, mz, [F.col, 0xffffff], 6, 1.6, 0.06, 0.4, { grav: 5, up: 1.4 });
    else if (F.sig === 'foxfire' && F.top >= 3) for (let i = 0; i < 2; i++) { const a = v.rot + (i ? 0.8 : -0.8); this.parts.spawn(x + Math.sin(a) * 0.35, h + 0.6, z + Math.cos(a) * 0.35, dx * 2.5, 0.3, dz * 2.5, F.col, 0.12, 0.35, { drag: 1.5, grow: -0.8 }); }
  }
  after(d, fn) { this.later.push({ t: this.t + d, fn }); }
  syncTowers(dt) {
    const alive = new Set();
    for (const t of this.world.towers) {
      alive.add(t.id);
      let v = this.towers.get(t.id);
      if (!v) { v = this.makeTower(t); this.towers.set(t.id, v); }
      const key = this.towerKey(t);
      if (v.evoT > 0) { v.evoT -= dt; v.m.root.rotation.y += dt * 14; const s = 1 + Math.sin(v.evoT * 30) * 0.06; v.m.root.scale.setScalar(s); }
      else if (key !== v.key) { this.root.remove(v.g); const nv = this.makeTower(t); nv.born = 0.5; nv.atk = 0; nv.rot = v.rot; this.towers.set(t.id, nv); v = nv; }
      else v.m.root.rotation.y = 0;
      // drehen zum Ziel
      const target = PI / 2 - t.ang; let d = target - v.rot; d = Math.atan2(Math.sin(d), Math.cos(d)); v.rot += d * Math.min(1, dt * 12);
      v.atk = Math.max(0, v.atk - dt * 5); v.at += dt;
      this.charge(v, t, dt);
      this.atkPose(v, t);
      if (v.born < 1) { v.born = Math.min(1, v.born + dt * 3); if (v.evoT <= 0) v.m.root.scale.setScalar(backOut(v.born)); }
      if (t.raft != null) { const [x, z] = this.toW(t.x, t.y); v.g.position.set(x, RAFT_TOP, z); }
      const dis = t.disabledT > 0;
      v.m.tick(this.t, dt, { atk: v.atk, dis, cannon: v.rot, hlvl: t.hlvl });
      if (v.spirit) { const S = v.spirit; S.m.tick?.(this.t, dt, { atk: v.atk }); S.g.position.y = 0.12 + Math.sin(this.t * 1.6) * 0.05; S.g.scale.setScalar(2.1 + v.atk * 0.35 + v.chg * 0.15); S.mat.opacity = 0.32 + 0.1 * Math.sin(this.t * 2.4) + v.atk * 0.3; }
      if (dis && Math.random() < dt * 14) { const [x, z] = this.toW(t.x, t.y); this.parts.spawn(x + (Math.random() - 0.5) * 0.4, 0.4, z + (Math.random() - 0.5) * 0.4, 0, 0.8, 0, Math.random() < 0.5 ? (t.disCol || 0xff6a20) : (t.disCol ? 0xffffff : 0x3a3030), 0.22, 0.6, { drag: 1 }); }
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
    // Rudel-Band: feine Lichtfunken zwischen benachbarten Kreaturen (mehr, je größer das Rudel)
    for (const pk of this.world.packs || []) if (Math.random() < dt * (1.5 + pk.grp.length * 0.4)) {
      const [a, b] = pk.links[Math.floor(Math.random() * pk.links.length)] || []; if (!a) continue;
      const [ax, az] = this.toW(a.x, a.y), [bx, bz] = this.toW(b.x, b.y), f = Math.random(), c = pk.grp.length >= 6 ? 0xff9bf0 : pk.grp.length >= 4 ? 0xffd257 : 0x9ff6ff;
      this.parts.spawn(ax + (bx - ax) * f, 0.12 + Math.sin(f * PI) * 0.18, az + (bz - az) * f, 0, 0.25, 0, c, 0.09, 0.7, { drag: 1 });
    }
    // Synergie-Funken
    if (Math.random() < dt * 3) for (const s of this.world.synergies) for (const [a, b] of s.links) {
      const [ax, az] = this.toW(a.x, a.y), [bx, bz] = this.toW(b.x, b.y), f = Math.random();
      this.parts.spawn(ax + (bx - ax) * f, 0.35 + Math.sin(f * PI) * 0.4, az + (bz - az) * f, (bx - ax) * 0.4, 0, (bz - az) * 0.4, 0xffe9a0, 0.12, 0.6, { drag: 0.5 });
    }
  }

  // Ein Instanz-Puffer je Gegnerart und Pose (Körper + Umriss teilen die Matrizen)
  makePool(k, geos, baked, spec, N) {
    const glowK = ENEMY_GLOW[k] && !baked, alpha = ENEMY_ALPHA[k];
    const mat = glowK ? new THREE.MeshBasicMaterial({ vertexColors: true }) : enemyMat(alpha ? { transparent: true, opacity: alpha } : {});
    const frames = geos.map(g => {
      const tint = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4); tint.setUsage(THREE.DynamicDrawUsage); g.setAttribute('aTint', tint);
      const m = new THREE.InstancedMesh(g, mat, N); m.count = 0; m.castShadow = !glowK && !baked; m.frustumCulled = false; this.root.add(m);
      let ol = null;
      // Massen-LOD: vereinfachte Form, teilt Matrizen und Tönung mit dem vollen Modell
      let lod = null, tintL = null;
      if (baked) { g.userData.lod ||= lodGeo(g, 9); tintL = new THREE.InstancedBufferAttribute(tint.array, 4); tintL.setUsage(THREE.DynamicDrawUsage); g.userData.lod.setAttribute('aTint', tintL); lod = new THREE.InstancedMesh(g.userData.lod, mat, N); lod.instanceMatrix = m.instanceMatrix; lod.count = 0; lod.visible = false; lod.frustumCulled = false; this.root.add(lod); }
      if (!glowK && !alpha) { ol = new THREE.InstancedMesh(g, enemyOutline(baked ? 0.016 : 0.022), N); ol.instanceMatrix = m.instanceMatrix; ol.count = 0; ol.frustumCulled = false; this.root.add(ol); }
      return { m, ol, tint, lod, tintL };
    });
    let halo = null;
    if (ENEMY_GLOW[k]) { halo = new THREE.InstancedMesh(geo.sphere(10), glow(0x7df3ff, baked ? 0.2 : 0.35), N); halo.count = 0; halo.frustumCulled = false; this.root.add(halo); }
    return { frames, halo, cap: N, cyc: spec?.cyc ?? 1, baked: !!baked, hn: 0, geos, spec };
  }
  // Puffer zu klein (z. B. 150 Wölfe in Welle 56) → mit doppelter Größe neu anlegen, Geometrien bleiben
  growPool(k) {
    const P = this.pools[k]; if (!P) return;
    for (const F of P.frames) { for (const x of [F.m, F.ol, F.lod]) if (x) { this.root.remove(x); x.dispose(); } }
    if (P.halo) { this.root.remove(P.halo); P.halo.dispose(); }
    this.pools[k] = this.makePool(k, P.geos, P.baked, P.spec, P.cap * 2);
  }

  // ───────── Gegner ─────────
  syncEnemies(dt) {
    if (this.grow?.size) { for (const k of this.grow) this.growPool(k); this.grow.clear(); }
    for (const k in this.pools) { const P = this.pools[k]; P.hn = 0; for (const F of P.frames) F.m.count = 0; }
    // Massenmodus: ab vielen Gegnern keine Umrisse (halbiert die Dreiecke), weniger Funken
    const nE = this.world.enemies.length, crowd = this.crowd = this.forceCrowd ?? nE > (this.stage.quality >= 2 ? 260 : 140);
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
        if (!b) { b = buildBig(e.boss ? e.kind : 'oni', e.def.model) || (e.boss ? buildDragon() : buildOni()); this.root.add(b.root); b.rise = 0; this.bigs.set(e.id, b); }
        b.rise = Math.min(1, b.rise + dt * 0.8);
        b.root.position.set(x, -1.2 * (1 - b.rise) * (1 - b.rise), z); b.root.scale.setScalar(ENEMY_SCALE * (e.def.scale || 1));
        const tr = PI / 2 - e.ang; let d = tr - b.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); b.root.rotation.y += d * Math.min(1, dt * 4);
        b.tick(this.t, dt, { fly: e.flying, breath: e.boss && e.roarT > 0 && e.phase >= 2, roar: e.roarT > 0, phase: e.phase, cry: e.cryT > 2.5 });
        b.flash = e.hitT > 0 ? 1 : 0;
      } else {
        const pk = e.kind === 'bearer' && e.guard <= 0 ? 'bearerX' : e.kind, P = this.pools[pk]; if (!P) continue;
        if (P.hn >= P.cap) { (this.grow ||= new Set()).add(pk); continue; }
        // Pose: an zurückgelegten Weg gekoppelt (cyc Felder je Zyklus) oder zeitbasiert; betäubt = Standbild
        const nF = P.frames.length, ph = P.cyc ? e.d / P.cyc : (e.stunT > 0 ? 0 : this.t * 1.6 * (e.speed || 1)), F = P.frames[nF > 1 ? (Math.floor((ph + e.id * 0.618) * nF) % nF + nF) % nF : 0];
        const i = F.m.count++; P.hn++;
        const old = !P.baked, bob = old && e.kind === 'slime' ? Math.abs(Math.sin(this.t * 6 + e.id)) : 0;
        const sq = old && e.kind === 'slime' ? 1 + Math.sin(this.t * 12 + e.id) * 0.08 : 1;
        const sc = (e.elite ? 1.25 : 1) * ENEMY_SCALE;
        this.E.set(0, PI / 2 - e.ang, old && (e.kind === 'wolf' || e.kind === 'boar') ? Math.sin(this.t * 14 + e.id) * 0.06 : 0, 'YXZ');
        this.M.compose(this.V.set(x, (e.kind === 'wisp' ? 0.75 : (e.def.hover || 0)) + fly + bob * 0.08, z), this.Q.setFromEuler(this.E), this.S.set(sc * sq, sc / sq, sc * sq));
        F.m.setMatrixAt(i, this.M);
        if (P.baked && blobs < 600) { const r = e.r * sc * 2.6 * (fly || e.kind === 'wisp' ? 0.7 : 1); this.M.compose(this.V.set(x, 0.015, z), this.Q.identity(), this.S.set(r, 1, r)); this.blobs.setMatrixAt(blobs++, this.M); this.Q.setFromEuler(this.E); }
        const T = e.hitT > 0 ? TINT.flash : e.stunT > 0 ? TINT.stun : e.burnT > 0 ? TINT.burn : e.slowT > 0 ? TINT.frost : e.shield > 0 ? TINT.shield : e.vulnT > 0 ? TINT.vuln : e.elite ? TINT.elite : TINT.none;
        F.tint.array.set(T, i * 4);
        if (P.halo) { this.M.compose(this.V.set(x, (e.kind === 'wisp' ? 0.75 : (e.def.hover || 0)) + fly + 0.3, z), this.Q, this.S.setScalar(0.33 + Math.sin(this.t * 8 + e.id) * 0.03)); P.halo.setMatrixAt(P.hn - 1, this.M); }
        if (e.elite && crowns < 200) { this.M.compose(this.V.set(x, e.h * sc + fly + 0.12, z), this.Q.identity(), this.S.setScalar(1)); this.crowns.setMatrixAt(crowns++, this.M); }
        if (e.burnT > 0 && Math.random() < dt * (crowd ? 2 : 8)) this.parts.spawn(x, 0.4 + fly, z, 0, 0.7, 0, 0xff7a2a, 0.14, 0.4);
        if (e.camo && e.revealT <= 0 && Math.random() < dt * (crowd ? 1 : 4)) this.parts.spawn(x, 0.5, z, 0, 0.3, 0, 0x6a3aa0, 0.2, 0.6);
      }
      // KP-Balken
      if (e.hp < e.maxHp && bars < 400 && !e.boss) {
        const w = Math.min(0.9, 0.35 + e.maxHp / 400), f = Math.max(0, e.hp / e.maxHp), y = (e.h || 0.6) * (e.elite ? 1.25 : 1) * ENEMY_SCALE + fly + 0.2 + (e.kind === 'wisp' ? 0.75 : (e.def.hover || 0));
        this.M.compose(this.V.set(x, y, z), camQ, this.S.set(w + 0.04, 0.09, 1)); this.hpBg.setMatrixAt(bars, this.M);
        const off = (this.OFF ||= new THREE.Vector3()).set(-(w * (1 - f)) / 2, 0, 0.001).applyQuaternion(camQ);
        this.M.compose(this.V.set(x + off.x, y + off.y, z + off.z), camQ, this.S.set(Math.max(0.001, w * f), 0.055, 1)); this.hpFg.setMatrixAt(bars, this.M);
        this.hpFg.setColorAt(bars, this.C.setRGB(f > 0.5 ? (1 - f) * 2 : 1, f > 0.5 ? 1 : f * 2, 0.25).multiplyScalar(e.shield > 0 ? 0.6 : 1)); if (e.shield > 0) { this.C.r += 0.3; this.C.g += 0.2; this.C.b += 0.5; } this.hpFg.setColorAt(bars, this.C);
        bars++;
      }
    }
    this.blobs.count = blobs; this.blobs.instanceMatrix.needsUpdate = true;
    for (const [id, b] of this.bigs) if (!seen.has(id)) { this.root.remove(b.root); this.bigs.delete(id); }
    for (const k in this.pools) {
      const P = this.pools[k];
      for (const F of P.frames) {
        F.m.instanceMatrix.needsUpdate = true; F.tint.needsUpdate = true; const on = F.m.count > 0;
        if (F.lod) { F.lod.count = F.m.count; F.lod.visible = on && crowd; F.tintL.needsUpdate = true; F.m.visible = on && !crowd; } else F.m.visible = on;
        if (F.ol) { F.ol.count = F.m.count; F.ol.visible = on && !crowd; }
      }
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
        // Genau am Einschlag: Richtung vom Angreifer, Blitz an der Körperseite, Funken fliegen nach hinten weg
        let [x, z] = at(ev.x, ev.y); const col = ELEMENT_COLORS[ev.type] || 0xffffff, y = (ev.e.h || 0.5) * 0.6 + (ev.e.flying && !ev.e.boss ? 0.85 : 0);
        let dx = 0, dz = 1; if (ev.sx != null) { const [sx, sz] = at(ev.sx, ev.sy); dx = x - sx; dz = z - sz; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L; }
        const er = Math.min(0.5, (ev.e.r || 0.3) * 0.8); x -= dx * er; z -= dz * er;
        if (ev.guard) { this.flashes.add(x, y, z, 0xe8eeff, 0.2, 0.07, { k: 0.7 }); this.sparks.fan(x, y, z, -dx, -dz, [0xffffff, 0xc8d4e8], 3, 3, 1.2, { up: 0.6, grav: 6 }); break; }
        const many = this.world.enemies.length > 120;
        this.flashes.add(x, y, z, col, ev.crit ? 0.5 : ev.big ? 0.32 : 0.2, ev.crit ? 0.14 : 0.08, { k: ev.crit ? 1 : 0.65 });
        if (!many || ev.crit) this.sparks.fan(x, y, z, dx, dz, [col, 0xffffff], ev.crit ? 7 : 3, ev.crit ? 4.5 : 3, ev.crit ? 0.8 : 0.55, { len: ev.crit ? 0.045 : 0.03 });
        if (ev.crit) P.burst(x, y, z, [col, 0xffffff], 4, 1.6, 0.08, 0.22);
        if (settings.dmgNums && (ev.crit || ev.big || ev.dmg >= 25 || (this.numCount++ % 4 === 0))) this.floaters.add(x, y + 0.3, z, Math.round(ev.dmg), ev.crit ? 'crit' : ev.big ? 'big' : '', ev.crit ? 0.95 : 0.7);
        if (ev.crit && ev.dmg > 60) this.stage.addShake(0.08);
        if (!many && this.fxBudget-- > 0 && this.stage.quality > 0) switch (ev.type) {   // Einschlag je Element (Budget je Bild)
          case 'fire': P.burst(x, y, z, [0xff7a2f, 0xffd27a, 0xff4a10], 4, 1.2, 0.07, 0.35, { up: 2, grav: -1 }); break;
          case 'lightning': if (Math.random() < 0.5) this.bolts.add([{ x: x + (Math.random() - 0.5) * 0.25, y: y + 0.8, z }, { x, y, z }], 0xfff27a, 0.03, 0.09); break;
          case 'ice': this.rings.add(x, 0.05, z, 0.05, 0.38, 0x9fe8ff, 0.25, { alpha: 0.6 }); P.burst(x, y, z, [0xffffff, 0x9fe8ff], 4, 1.4, 0.05, 0.35, { grav: 5, up: 1.5 }); break;
          case 'shadow': P.burst(x, y, z, [0x3a2a5a, 0xb07bff], 3, 0.6, 0.12, 0.45, { grow: 0.8 }); break;
          case 'earth': P.burst(x, 0.1, z, [0xc8b090, 0x8a7a68], 4, 1, 0.08, 0.35, { flat: true }); break;
          case 'spirit': case 'light': case 'astral': this.rings.add(x, y, z, 0.05, 0.3, col, 0.18, { alpha: 0.7 }); break;
        }
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
        const [x, z] = at(ev.x, ev.y), col = [0, 0x6ff0ff, 0x5ad85a, 0xff8a2a, 0xa05aff, 0xffd23a, 0x8a7ab0, 0x5a9aff, 0xb07bff][ev.layer] || 0xffffff;
        if (ev.layer >= 7) { this.rings.add(x, 0.1, z, 0.3, 2.6, col, 0.5); this.flashes.add(x, 0.8, z, col, 1.4, 0.2); P.burst(x, 0.8, z, [col, 0xffffff], 34, 4, 0.16, 0.7, { up: 2 }); this.stage.addShake(0.4); }
        this.flashes.add(x, 0.35, z, col, 0.3 + ev.layer * 0.03, 0.1, { k: 0.8 }); this.rings.add(x, 0.3, z, 0.1, 0.4 + ev.layer * 0.05, col, 0.16, { alpha: 0.6 });
        P.burst(x, 0.35, z, [col, 0xffffff], 3 + ev.layer, 2.2, 0.07, 0.26, { up: 1.5 });
        if (settings.dmgNums && this.numCount++ % 3 === 0) this.floaters.add(x, 0.8, z, ['', 'plopp', 'plopp!', 'PLOPP', 'PLOPP!', 'KRACH', 'KRACK!', 'WUMMS!', 'STURM!'][ev.layer], ev.layer >= 5 ? 'crit' : '', 0.6);
        break;
      }
      case 'kill': {
        const [x, z] = at(ev.x, ev.y), e = ev.e, big = e.boss || e.miniboss || e.kind === 'golem' || e.def.big;
        const col = { slime: 0x9af070, wolf: 0xb0a070, boar: 0xc0a090, wisp: 0x9ff6ff, shade: 0xa070ff, mage: 0xc0a0ff, healer: 0xffb070, beetle: 0x5ae8d8, mite: 0x5ae8d8, golem: 0xc0b8a8, demon: 0xff7a2a, bearer: 0xc8b8a0, l1: 0x6ff0ff, l2: 0x5ad85a, l3: 0xff8a2a, l4: 0xa05aff, l5: 0xffd23a, kokon: 0x8a7ab0 }[e.kind] || 0xffffff;
        P.burst(x, 0.35, z, this.popCols || [col, 0xffffff], big ? 40 : (this.popCols ? 9 : 6), big ? 3.6 : 2, big ? 0.22 : 0.1, big ? 0.8 : 0.4, { grav: 4, up: 1.4 });
        this.flashes.add(x, 0.4, z, col, big ? 1.6 : 0.38, big ? 0.25 : 0.11, { k: 0.75 });
        if (big) this.rings.add(x, 0.05, z, 0.1, 2.2, col, 0.6); else this.rings.add(x, 0.05, z, 0.1, 0.5, col, 0.25, { alpha: 0.5 });
        if (ev.coins && settings.dmgNums !== false && (this.world.players < 2 || (ev.src?.owner ?? this.world.who) === this.world.who)) this.floaters.add(x, 0.9, z, '+' + ev.coins, 'coin', 0.8);
        if (big) { this.stage.addShake(0.6); this.stage.zoomPunch = Math.max(this.stage.zoomPunch, 0.5); }
        if (!this.crowd && this.stage.quality > 0 && this.fxBudget-- > 0) {   // Seele steigt auf; Elite: goldener Sternenkranz
          P.spawn(x, 0.5, z, 0, 0.9, 0, 0x9ff6ff, 0.09, 0.9, { drag: 0.6, grow: -0.4 });
          if (e.elite) { P.burst(x, 0.5, z, [0xffd257, 0xffffff], 14, 2.6, 0.08, 0.5, { up: 1.6 }); this.rings.add(x, 0.06, z, 0.1, 0.9, 0xffd257, 0.35); this.floaters.add(x, 1.2, z, '★ ELITE', 'lvl', 0.9); }
        }
        break;
      }
      case 'shot': { const st = projStyle(ev.special ? 'fireball' : ev.tower.s?.proj); this.atkStart(ev.tower, ev.extra ? null : st.trail); if (ev.special) { const [x, z] = at(ev.tower.x, ev.tower.y); this.flashes.add(x, 0.7, z, 0xffa030, 0.6, 0.16); P.burst(x, 0.7, z, [0xffa030, 0xffe0a0], 6, 1.6, 0.12, 0.35); } break; }
      case 'mortar': { this.atkStart(ev.tower, 0xffd27a); const [x, z] = at(ev.tower.x, ev.tower.y); P.burst(x, 0.75, z, [0xd8c8a0, 0x8a8070], 4, 1.2, 0.14, 0.45, { up: 2 }); break; }
      case 'pulse': {
        const t = ev.tower, D = Math.min(0.42, Math.max(0.16, 0.85 / Math.max(0.5, t.s?.rate || 1)));
        this.atkStart(t, null);
        const [x, z] = at(t.x, t.y), h = this.ty(t), r = ev.r;
        this.after(D * 0.6, () => { // Landung: Staubring am Boden, Risslinien nach außen, kleiner Ruck
          this.rings.add(x, h + 0.06, z, 0.3, r, 0xe8dcc0, 0.35, { alpha: 0.7 }); this.rings.add(x, h + 0.05, z, 0.2, r * 0.9, 0x8a7a68, 0.45, { disc: true, alpha: 0.18 });
          for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2 + Math.random() * 0.3; this.sparks.add(x + Math.cos(a) * 0.3, h + 0.08, z + Math.sin(a) * 0.3, Math.cos(a) * r * 6, 0.3, Math.sin(a) * r * 6, 0xe8d8b0, 0.2, 0.03); }
          P.burst(x, h + 0.08, z, [0xc8b090, 0x8a7a68], 6, 2.2, 0.12, 0.35, { flat: true });
          this.stage.addShake(0.05);
        });
        break;
      }
      case 'cone': {
        const t = ev.tower, [x, z] = at(t.x, t.y), h = this.ty(t), fire = ev.type === 'fire';
        const col = fire ? [0xffd27a, 0xff7a2a, 0xff4a10] : [0xffffff, 0xbff4ff, 0x7ad0ff];
        this.atkStart(t, null);
        this.after(0.06, () => { // Strahl aus dem Maul: dichter Kern, Rand verwirbelt, Frostsplitter als feine Striche
          const mx = x + Math.cos(ev.ang) * 0.3, mz = z + Math.sin(ev.ang) * 0.3;
          this.flashes.add(mx, h + 0.55, mz, col[1], 0.3, 0.12, { k: 0.7 });
          for (let i = 0; i < 12; i++) { const k = Math.random(), a = ev.ang + (Math.random() - 0.5) * ev.cone * (0.4 + k * 0.6), sp = ev.r * (1.8 + Math.random() * 1.4); P.spawn(mx, h + 0.52, mz, Math.cos(a) * sp, 0.05, Math.sin(a) * sp, col[i % 3], 0.1 + Math.random() * 0.08, 0.32, { drag: 2.4, grow: 1.6 }); }
          this.sparks.fan(mx, h + 0.52, mz, Math.cos(ev.ang), Math.sin(ev.ang), fire ? [0xffd27a, 0xffffff] : [0xffffff, 0xbff4ff], 5, ev.r * 3.2, ev.cone * 0.45, { up: 0.1, len: 0.04, life: 0.22 });
        });
        break;
      }
      case 'slash': {
        const v = this.atkStart(ev.tower, null), t = ev.tower;
        const [x, z] = at(ev.x, ev.y), [tx, tz] = at(t.x, t.y), ang = Math.atan2(z - tz, x - tx);
        this.arcs.add(x, 0.42, z, ang, t.stage >= 2 ? 0xff8aa0 : 0xd8fff0, 0.42, 0.14, 0.55, v ? v.flip : 1);
        break;
      }
      case 'power': {   // Kräfte (data/powers.js)
        const hp = this.map.heart?.getWorldPosition(new THREE.Vector3()) || new THREE.Vector3();
        if (ev.id === 'bomb') {
          const [x, z] = at(ev.x, ev.y);
          this.pillars.add(x, z, 0.4, 9, 0xffd0a0, 0.5);
          this.after(0.25, () => { this.flashes.add(x, 0.8, z, 0xffffff, 6, 0.35); this.flashes.add(x, 0.8, z, 0xff7a3a, 4, 0.7, { delay: 0.05 });
            for (let i = 0; i < 3; i++) this.rings.add(x, 0.06 + i * 0.08, z, 0.3, ev.r * (1 + i * 0.25), i ? 0xffd257 : 0xff7a3a, 0.6 + i * 0.15);
            this.rings.add(x, 0.04, z, 0.2, ev.r, 0x3a1a10, 1.4, { disc: true, alpha: 0.4 });
            P.burst(x, 0.5, z, [0xff7a3a, 0xffd257, 0x3a2a2a], 140, 7, 0.3, 1.1, { up: 2 }); this.sparks.fan(x, 0.5, z, 0, 0, 0xffb43a, 50, 10, PI);
            this.flashSky = 0.6; this.stage.addShake(1.6); });
          this.stage.focus = new THREE.Vector3(x, 0, z); this.stage.zoomPunch = 0.8;
        } else if (ev.id === 'freeze') {
          this.flashSky = 0.5; this.darken = 0.8;
          for (const e of this.world.enemies) { const [x, z] = this.toW(e.x, e.y); this.flashes.add(x, 0.6, z, 0x9fe0ff, 0.9, 0.5); P.burst(x, 0.6, z, [0xbff4ff, 0xffffff], 6, 1.2, 0.15, 0.7); }
          this.rings.add(0, 0.08, 0, 0.5, 16, 0x9fe0ff, 1.2);
        } else if (ev.id === 'rage') {
          for (const t of this.world.towers) { const [x, z] = this.toW(t.x, t.y); this.pillars.add(x, z, 0.35, 3, 0xff5a5a, 0.8); P.burst(x, 0.6, z, [0xff5a5a, 0xffb43a], 20, 2.5, 0.16, 0.8, { up: 1.5 }); }
          this.stage.addShake(0.6);
        } else if (ev.id === 'gold') {
          for (let i = 0; i < 40; i++) this.after(i * 0.02, () => P.spawn((Math.random() - 0.5) * 16, 5 + Math.random() * 2, (Math.random() - 0.5) * 10, 0, -6, 0, 0xffd257, 0.16, 1.2, { drag: 0.01 }));
          this.floaters.add(hp.x, 2, hp.z, '+◈' + ev.coins, 'lvl', 1.6);
        } else if (ev.id === 'heal') {
          this.pillars.add(hp.x, hp.z, 0.8, 6, 0x5fe68a, 1.2); this.rings.add(hp.x, 0.06, hp.z, 0.3, 3, 0x5fe68a, 1.0);
          P.burst(hp.x, 0.8, hp.z, [0x5fe68a, 0xffffff], 60, 3, 0.2, 1, { up: 2 }); this.floaters.add(hp.x, 2, hp.z, '+' + ev.lives + ' ❤', 'lvl', 1.6);
        }
        break;
      }
      case 'heal2': this.map.heartGlow && this.rings.add(this.map.heart.getWorldPosition(new THREE.Vector3()).x, 0.06, this.map.heart.getWorldPosition(new THREE.Vector3()).z, 0.2, 1.8, 0xff9ac8, 0.8); break;
      case 'bolt': {
        this.atkStart(ev.tower, 0x9fe8ff);
        const pts = ev.pts.map((p, i) => { const [x, z] = at(p.x, p.y); return { x, z, y: i === 0 ? 0.8 : 0.45 }; });
        const lt = ev.tower.s?.dmgType === 'light' || ev.tower.cid === 'kirin'; this.bolts.add(pts, 0xffffff, 0.025, 0.12); this.bolts.add(pts, lt ? 0xffd257 : 0x5ab8ff, 0.07, 0.09);
        for (const p of pts.slice(1)) { this.flashes.add(p.x, 0.45, p.z, 0x9fe8ff, 0.3, 0.09); this.sparks.fan(p.x, 0.45, p.z, 1, 0, [0xffffff, 0x9fe8ff], 3, 2.6, PI, { up: 0.8 }); }
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
        this.rings.add(x, 0.06, z, 0.1, ev.r, st.trail, 0.3, { alpha: 0.7 }); this.rings.add(x, 0.05, z, 0.1, ev.r * 0.85, st.c, 0.25, { disc: true, alpha: 0.22 });
        this.flashes.add(x, 0.35, z, st.trail, 0.5 + ev.r * 0.6, 0.14);
        this.sparks.fan(x, 0.3, z, 1, 0, c, ev.r > 1 ? 12 : 7, 3.5 + ev.r * 2, PI, { up: 0.9, grav: 5, len: 0.04 });
        P.burst(x, 0.3, z, c, ev.r > 1 ? 10 : 5, 2.4, 0.14, 0.4, { grav: 2, up: 1.6 });
        if (ev.r >= 1) this.stage.addShake(0.12);
        break;
      }
      case 'react': { const [x, z] = at(ev.x, ev.y); this.floaters.add(x, 1.1, z, (ev.icon ? ev.icon + ' ' : '') + ev.name + '!' + (ev.chain >= 2 ? ` ×${ev.chain}` : ''), 'react', 0.9);
        if (ev.chain >= 2) { this.floaters.add(x, 1.55, z, 'CHAIN REACTION ×' + ev.chain, 'lvl', 1.1); this.rings.add(x, 0.07, z, 0.1, 1.6 + ev.chain * 0.3, 0xffffff, 0.45); this.stage.addShake(0.08 + ev.chain * 0.04); } this.floaters.live[this.floaters.live.length - 1].d.style.color = ev.color; P.burst(x, 0.5, z, ev.color, 16, 3, 0.2, 0.45); this.rings.add(x, 0.07, z, 0.1, 1.2, ev.color, 0.35); break; }
      case 'stun': { const [x, z] = at(ev.e.x, ev.e.y); for (let i = 0; i < 3; i++) P.spawn(x + Math.cos(i * 2.1) * 0.2, 0.8, z + Math.sin(i * 2.1) * 0.2, 0, 0.2, 0, 0xffe14d, 0.14, 0.6); break; }
      case 'heal': case 'shield': case 'cry': { const [x, z] = at(ev.x, ev.y); const c = ev.t === 'heal' ? 0x7aff9a : ev.t === 'shield' ? 0xb07bff : 0xff4a3a; this.rings.add(x, 0.06, z, 0.2, ev.r, c, 0.6); P.burst(x, 0.6, z, c, 10, 1.4, 0.16, 0.6, { lift: 0.8 }); break; }
      case 'leak': this.stage.addShake(ev.e.boss ? 1 : 0.25); break;
      case 'rebirth': { // Wiedergeburt: Aschesäule, Sonnenblitz, Feuerwelle
        const t = ev.tower, [x, z] = at(t.x, t.y);
        this.pillars.add(x, z, 1.2, 14, 0xffb43a, 2.2); this.flashes.add(x, 1.5, z, 0xffe27a, 6, 0.6);
        for (let i = 0; i < 4; i++) this.after(i * 0.15, () => this.rings.add(x, 0.07, z, 0.3, 5 + i, i % 2 ? 0xff7a2a : 0xffe27a, 0.8));
        P.burst(x, 0.6, z, [0xffd27a, 0xff7a2a, 0x3a2a28, 0xffffff], 120, 6, 0.3, 1.4, { up: 2.5, grav: 1 });
        this.floaters.add(x, 1.8, z, 'WIEDERGEBURT! +' + ev.lives + ' ❤', 'crit', 2.2);
        this.flashSky = 1; this.stage.addShake(1.2); this.stage.focus = new THREE.Vector3(x, 0, z); this.stage.zoomPunch = 1; break;
      }
      case 'place': {
        const t = ev.tower, [x, z] = at(t.x, t.y), h = this.ty(t);
        this.rings.add(x, h + 0.04, z, 0.2, 0.9, 0xffffff, 0.4); P.burst(x, h + 0.1, z, [0xd8c8a0, 0xffffff], 14, 2, 0.18, 0.5, { flat: true });
        this.stage.addShake(0.06);
        break;
      }
      case 'upgrade': {
        const t = ev.tower, [x, z] = at(t.x, t.y), h = this.ty(t), col = ['#ff7a3d', '#5fd6ff', '#c39bff'][ev.path];
        this.rings.add(x, h + 0.05, z, 0.2, 1.1, col, 0.45); P.burst(x, h + 0.4, z, [col, 0xffffff], ev.tier >= 5 ? 50 : 18, 2.5, 0.18, 0.7, { lift: 1.5 });
        if (ev.tier >= 5) { this.pillars.add(x, z, 0.5, 6, col, 1.2); this.pillars.add(x, z, 0.25, 6, 0xffffff, 1.0, 0.1); this.flashes.add(x, h + 0.8, z, 0xffffff, 3, 0.4); this.flashes.add(x, h + 0.8, z, col, 2.2, 0.6, { delay: 0.08 }); this.sparks.fan(x, h + 0.5, z, 0, 0, col, 40, 9, PI); this.rings.add(x, h + 0.06, z, 0.3, 3, col, 0.8); this.stage.addShake(0.7); this.stage.focus = new THREE.Vector3(x, h, z); this.stage.zoomPunch = 1; }
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
      case 'mega': {   // Mega-Moment (~1,5 s): Dunkel → Energie strömt ein → Lichtsäule + Aura-Explosion → Name
        const t = ev.tower, [x, z] = at(t.x, t.y), h = this.ty(t), col = MEGA_COL[ev.p], md = megaDef(t.cid, ev.p);
        this.darken = 1.9; this.stage.focus = new THREE.Vector3(x, h, z); this.stage.zoomPunch = 1.2;
        for (let i = 0; i < 40; i++) this.after(i * 0.018, () => { const a = Math.random() * PI * 2, R = 1.6 + Math.random(), px = x + Math.cos(a) * R, pz = z + Math.sin(a) * R, py = h + 0.2 + Math.random() * 1.2, L = 0.45; P.spawn(px, py, pz, (x - px) / L, (h + 0.6 - py) / L, (z - pz) / L, i % 3 ? col : 0xffffff, 0.1, L, { drag: 0, grow: -1 }); });
        this.after(0.75, () => { this.pillars.add(x, z, 0.8, 10, col, 1.6); this.pillars.add(x, z, 0.4, 10, 0xffffff, 1.2, 0.08); this.flashes.add(x, h + 1, z, 0xffffff, 4.5, 0.45); this.flashes.add(x, h + 1, z, col, 3, 0.8, { delay: 0.08 }); });
        this.after(1.0, () => { P.burst(x, h + 0.8, z, [col, 0xffffff, 0xffd257], 150, 6.5, 0.3, 1.2, { up: 1.4 }); for (let i = 0; i < 3; i++) this.rings.add(x, h + 0.06 + i * 0.1, z, 0.3, 4 + i * 1.6, i ? 0xffffff : col, 0.8 + i * 0.2); this.floaters.add(x, 2.1, z, '✦ ' + (md?.name || 'MEGA').toUpperCase(), 'lvl', 2.2); this.flashSky = 0.6; this.stage.addShake(1.2); });
        break;
      }
      case 'ascend': {
        const t = ev.tower, [x, z] = at(t.x, t.y), h = this.ty(t), v = this.towers.get(t.id);
        this.darken = 2.2;
        ev.from.forEach((p, i) => this.after(0.1 + i * 0.12, () => { const [fx, fz] = at(p.x, p.y); this.pillars.add(fx, fz, 0.35, 6, 0xffd257, 0.8); this.bolts.add([{ x: fx, z: fz, y: 0.8 }, { x: (fx + x) / 2, z: (fz + z) / 2, y: 2.4 }, { x, z, y: 1.2 }], 0xfff2a8, 0.06, 0.9); P.burst(fx, 0.5, fz, [0xffd257, 0xffffff], 30, 3, 0.2, 0.7, { up: 1.5 }); }));
        this.after(0.9, () => { if (v) v.evoT = 0.9; this.pillars.add(x, z, 1.0, 12, 0xffd257, 2.0); this.pillars.add(x, z, 0.5, 12, 0xffffff, 1.6, 0.1); this.flashes.add(x, h + 1, z, 0xffffff, 5, 0.5); this.flashes.add(x, h + 1, z, 0xffd257, 3.5, 0.8, { delay: 0.1 }); });
        this.after(1.6, () => { P.burst(x, h + 0.8, z, [0xffd257, 0xffffff, 0xff9af0], 180, 7, 0.35, 1.3, { up: 1.5 }); for (let i = 0; i < 3; i++) this.rings.add(x, h + 0.06 + i * 0.1, z, 0.3, 5 + i * 1.5, i ? 0xff9af0 : 0xffd257, 0.9 + i * 0.2); this.sparks.fan(x, h + 0.7, z, 0, 0, 0xffd257, 60, 12, PI); this.floaters.add(x, 2, z, '⛩ AHNENFORM · GRAD ' + ev.grade, 'lvl', 2); this.flashSky = 0.7; this.stage.addShake(1.4); });
        this.stage.focus = new THREE.Vector3(x, h, z); this.stage.zoomPunch = 1.4;
        break;
      }
      case 'fuse': {
        const t = ev.tower, [x, z] = at(t.x, t.y), [gx, gz] = at(ev.gone.x, ev.gone.y), h = this.ty(t), v = this.towers.get(t.id);
        const cA = new THREE.Color(ev.def.color).getHex(), cB = new THREE.Color(CREATURES[ev.def.parents[1]].color).getHex();
        // Essenz der zweiten Kreatur fliegt in einem Bogen hinüber
        for (let i = 0; i < 40; i++) this.after(i * 0.012, () => { const f = Math.random(); P.spawn(gx + (x - gx) * f * 0.2, h + 0.5, gz + (z - gz) * f * 0.2, (x - gx) * 2.2, 1.6 + Math.random(), (z - gz) * 2.2, i % 2 ? cB : 0xffffff, 0.2, 0.5, { grav: 6, drag: 0.4 }); });
        this.flashes.add(gx, h + 0.5, gz, cB, 1.4, 0.35);
        this.after(0.45, () => {
          if (v) v.evoT = 0.6;
          this.pillars.add(x, z, 0.7, 10, cA, 1.6); this.pillars.add(x, z, 0.35, 10, cB, 1.3, 0.1);
          this.flashes.add(x, h + 0.7, z, 0xffffff, 3, 0.4); this.flashes.add(x, h + 0.7, z, cB, 2.2, 0.6, { delay: 0.1 });
          for (let i = 0; i < 80; i++) { const a = i * 0.4, r = 0.5 + (i % 7) * 0.06; P.spawn(x + Math.cos(a) * r, h + 0.1 + i * 0.015, z + Math.sin(a) * r, -Math.sin(a) * 1.8, 2.4, Math.cos(a) * 1.8, i % 2 ? cA : cB, 0.2, 1.1, { drag: 0.8 }); }
        });
        this.after(1.05, () => {
          P.burst(x, h + 0.6, z, [0xffffff, cA, cB], 110, 5.5, 0.3, 1.0, { up: 1.2 });
          this.rings.add(x, h + 0.06, z, 0.3, 4.5, cA, 0.8); this.rings.add(x, h + 0.08, z, 0.3, 3.2, cB, 0.6, { delay: 0.12 });
          this.sparks.fan(x, h + 0.6, z, 0, 0, cB, 34, 7, PI, { up: 0.5 });
          this.floaters.add(x, 1.6, z, 'FUSION! ' + ev.def.name, 'lvl', 1.6); this.stage.addShake(0.9);
        });
        this.stage.focus = new THREE.Vector3(x, h, z); this.stage.zoomPunch = 1;
        break;
      }
      case 'gust': { for (let i = 0; i < 60; i++) this.after(i * 0.05, () => { const z = (Math.random() - 0.5) * 13; this.sparks.add(-12, 0.3 + Math.random() * 1.5, z, 16 + Math.random() * 6, 0, (Math.random() - 0.5) * 1.5, 0xffffff, 0.9, 0.025); }); break; }
      case 'storm': { if (ev.on) { this.flashSky = 0.08; for (let i = 0; i < 40; i++) this.parts.spawn(-12, 1 + Math.random() * 3, (Math.random() - 0.5) * 14, 6 + Math.random() * 3, -0.5, 0.5, 0xffffff, 0.12, 3, { drag: 0.02 }); } break; }
      case 'sell': { const [x, z] = at(ev.tower.x, ev.tower.y); P.burst(x, 0.4, z, [0xffd257, 0xffffff], 20, 2.5, 0.16, 0.6, { grav: 3, up: 1.5 }); this.floaters.add(x, 0.9, z, '+' + ev.value, 'coin', 0.9); break; }
      case 'rock': { this.map.removeRock(ev.cx, ev.cy); const [x, z] = at(ev.cx + 0.5, ev.cy + 0.5); P.burst(x, 0.3, z, [0x9a9aa0, 0xc8c0b0], 30, 3, 0.25, 0.7, { grav: 6, up: 1.5 }); this.stage.addShake(0.3); break; }
      case 'boss': case 'spawn': {
        if (ev.e.boss || ev.e.miniboss) { const [x, z] = at(ev.e.x, ev.e.y); P.burst(x, 0.2, z, [0x3a1050, 0xff4a20, 0x1a0a20], 80, 3, 0.4, 1.4, { up: 2 }); this.rings.add(x, 0.05, z, 0.3, 3.5, 0xff4a20, 1.0); this.stage.addShake(0.8); }
        break;
      }
      case 'bossPhase': { const [x, z] = at(ev.e.x, ev.e.y); this.rings.add(x, 0.06, z, 0.4, 5, 0xff3a20, 0.8); P.burst(x, 1.5, z, [0xff6a20, 0xffd27a], 60, 5, 0.3, 0.8); this.stage.addShake(1); this.stage.focus = new THREE.Vector3(x, 0, z); this.stage.zoomPunch = 0.8; break; }
      case 'bossFly': { const [x, z] = at(ev.e.x, ev.e.y); P.burst(x, 0.2, z, [0xc8b8a8, 0x8a7a6a], 40, 4, 0.3, 0.7, { flat: true }); break; }
      case 'breath': {
        const [bx, bz] = at(ev.e.x, ev.e.y), bc = ev.e.def.breathColor;
        for (const t of ev.targets) {
          const [x, z] = at(t.x, t.y);
          for (let i = 0; i < 40; i++) { const f = i / 40; P.spawn(bx + (x - bx) * f + (Math.random() - 0.5) * 0.3, 1.8 - f * 1.3, bz + (z - bz) * f + (Math.random() - 0.5) * 0.3, (x - bx) * 0.8, 0.5, (z - bz) * 0.8, f < 0.5 ? (bc ? 0xffffff : 0xffd27a) : (bc || 0xff4a10), 0.35, 0.5 + f * 0.4); }
          this.rings.add(x, 0.06, z, 0.2, 1, bc || 0xff4a10, 0.6); if (bc) { this.flashes.add(x, 0.6, z, bc, 1.2, 0.4); P.burst(x, 0.5, z, [0xffffff, bc], 18, 2, 0.15, 0.8, { up: 0.6 }); }
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
      case 'sunrise': { // Flammenrad: Sonnenscheibe steigt auf, Feuerring rollt nach außen, Funkenstrahlen
        this.pillars.add(tx, tz, 0.6, 5, 0xffb43a, 0.9); this.flashes.add(tx, 1.2, tz, 0xffd27a, 3, 0.35);
        for (let i = 0; i < 3; i++) this.after(i * 0.12, () => { this.rings.add(tx, 0.07, tz, 0.3, ev.r * (0.7 + i * 0.15), i ? 0xff7a2a : 0xffe27a, 0.55); });
        this.rings.add(tx, 0.05, tz, 0.3, ev.r, 0xff5a10, 0.7, { disc: true, alpha: 0.35 });
        for (let i = 0; i < 36; i++) { const a = i / 36 * PI * 2; this.sparks.add(tx, 0.5, tz, Math.cos(a) * 14, 1.5, Math.sin(a) * 14, i % 2 ? 0xffe27a : 0xff7a2a, 0.35, 0.05); }
        P.burst(tx, 0.4, tz, [0xffd27a, 0xff7a2a, 0xff3a10], 60, 5, 0.22, 0.8, { flat: true });
        this.flashSky = 0.35; this.stage.addShake(0.6); break;
      }
      case 'hex': { // Fluch: violetter Bannkreis, Giftnebel springt auf jedes Ziel
        this.rings.add(tx, 0.06, tz, 0.3, ev.r, 0xc08aff, 0.7); this.rings.add(tx, 0.05, tz, 0.3, ev.r, 0x3fd06a, 0.9, { disc: true, alpha: 0.25 });
        this.flashes.add(tx, 0.8, tz, 0xc08aff, 1.8, 0.3);
        ev.pts.forEach((p, i) => this.after(0.05 + i * 0.02, () => { const [x, z] = this.toW(p.x, p.y); this.flashes.add(x, 0.5, z, 0x8aff6a, 0.9, 0.3); P.burst(x, 0.4, z, [0x8aff6a, 0xc08aff, 0x2a6a3a], 10, 1.4, 0.2, 0.9, { up: 0.8, drag: 1.5 }); this.floaters.add(x, 1, z, 'Fluch', 'react', 0.7); }));
        this.stage.addShake(0.35); break;
      }
      case 'tornado': { // Wirbelsturm: drehende Windringe steigen auf, Funken kreisen nach außen
        for (let i = 0; i < 5; i++) this.after(i * 0.07, () => this.rings.add(tx, 0.1 + i * 0.25, tz, 0.4 + i * 0.15, ev.r * (0.5 + i * 0.1), 0xdff8ff, 0.6));
        for (let i = 0; i < 70; i++) { const a = i * 0.35, r = 0.3 + (i % 10) * 0.12; P.spawn(tx + Math.cos(a) * r, 0.1 + i * 0.025, tz + Math.sin(a) * r, -Math.sin(a) * 5, 1.5, Math.cos(a) * 5, i % 3 ? 0xdff8ff : 0x8fe0ff, 0.18, 0.9, { drag: 0.6 }); }
        for (let i = 0; i < 30; i++) { const a = i / 30 * PI * 2; this.sparks.add(tx, 0.4, tz, Math.cos(a) * 11, 0.5, Math.sin(a) * 11, 0xffffff, 0.3, 0.04); }
        this.stage.addShake(0.5); break;
      }
      case 'rift': { // Realitätsriss: Spalt öffnet sich über dem Ziel, Lichtstrahl, Sterne werden hineingesogen
        const [x, z] = this.toW(ev.x, ev.y);
        this.flashes.add(tx, 0.7, tz, 0xa070ff, 1.2, 0.25);
        for (let i = 0; i < 40; i++) { const a = i / 40 * PI * 2, r = 1.4; P.spawn(x + Math.cos(a) * r, 0.5 + (i % 4) * 0.2, z + Math.sin(a) * r, -Math.cos(a) * 4, 0, -Math.sin(a) * 4, i % 2 ? 0xffffff : 0xa070ff, 0.14, 0.35, { drag: 0.2 }); }
        this.after(0.3, () => { this.pillars.add(x, z, 0.5, 6, 0x6a20ff, 1.0); this.pillars.add(x, z, 0.22, 6, 0xffffff, 0.8, 0.05); this.flashes.add(x, 0.8, z, 0xffffff, 3, 0.4); this.flashes.add(x, 0.8, z, 0xa070ff, 2.2, 0.6, { delay: 0.08 });
          this.rings.add(x, 0.06, z, 0.2, 2, 0xa070ff, 0.6); this.sparks.fan(x, 0.7, z, 0, 0, 0xcfb0ff, 26, 8, PI); this.flashSky = 0.3; this.stage.addShake(0.8); });
        break;
      }
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
      case 'ancestral': { this.darken = 1.8; this.pillars.add(tx, tz, 0.8, 9, 0xffd257, 1.2); ev.targets.forEach((p, i) => this.after(i * 0.02, () => { const [x, z] = this.toW(p.x, p.y); this.pillars.add(x, z, 0.3, 5, i % 2 ? 0xffd257 : 0xff9af0, 0.7); this.flashes.add(x, 0.6, z, 0xffffff, 1, 0.3); })); this.flashSky = 0.8; this.stage.addShake(1.2); break; }
      case 'flood': { for (let i = 0; i < 3; i++) this.after(i * 0.1, () => this.rings.add(tx, 0.1, tz, 0.3, ev.r * (0.6 + i * 0.2), i ? 0x7ad8ff : 0xdff8ff, 0.6)); this.rings.add(tx, 0.05, tz, 0.3, ev.r, 0x3a9ad8, 0.9, { disc: true, alpha: 0.4 }); for (let i = 0; i < 100; i++) { const a = Math.random() * PI * 2, r = Math.random() * ev.r; P.spawn(tx + Math.cos(a) * r, 0.15, tz + Math.sin(a) * r, Math.cos(a) * 2.5, 1.5 + Math.random() * 1.5, Math.sin(a) * 2.5, i % 2 ? 0x9fe8ff : 0xffffff, 0.14, 0.8, { grav: 6 }); } this.stage.addShake(0.5); break; }
      case 'radiance': { this.pillars.add(tx, tz, 0.5, 6, 0xffe27a, 1.0); this.flashes.add(tx, 1, tz, 0xfff2a8, 2.6, 0.35); this.rings.add(tx, 0.06, tz, 0.3, ev.r, 0xffd257, 0.9); for (let i = 0; i < 24; i++) { const a = i / 24 * PI * 2; this.sparks.add(tx, 0.6, tz, Math.cos(a) * 9, 2, Math.sin(a) * 9, 0xfff2a8, 0.35, 0.05); } for (const o of this.world.towers) if (Math.hypot(o.x - ev.tower.x, o.y - ev.tower.y) <= ev.r) { const [x, z] = this.toW(o.x, o.y); this.pillars.add(x, z, 0.25, 1.6, 0xffd257, 0.8); } this.flashSky = 0.3; break; }
      case 'guardbite': { const [x, z] = this.toW(ev.x, ev.y); for (let k = 0; k < 2; k++) this.arcs.add(x, 0.6 - k * 0.2, z, Math.atan2(z - tz, x - tx) + (k ? PI : 0), 0xffd257, 0.6, 0.25, 0.2, k ? -1 : 1); this.flashes.add(x, 0.6, z, 0xffffff, 1.8, 0.25); P.burst(x, 0.5, z, [0xd8c8a8, 0xffd257, 0xffffff], 30, 3, 0.18, 0.6); this.stage.addShake(0.6); break; }
      case 'volley': { const [x, z] = this.toW(ev.x, ev.y); for (let i = 0; i < 24; i++) this.after(i * 0.025, () => { const ox = (Math.random() - 0.5) * 3.4, oz = (Math.random() - 0.5) * 3.4; this.sparks.add(x + ox - 1, 4, z + oz - 0.5, 5, -20, 2.5, 0xf0e0c0, 0.2, 0.06); this.after(0.18, () => P.burst(x + ox, 0.1, z + oz, [0xd8c8a0, 0xffffff], 5, 1.5, 0.1, 0.3, { flat: true })); }); break; }
      case 'skyshot': { this.runGhost(this.ghostFox, 'path', 1.0, 0x8fe0a0); this.flashSky = 0.4; this.stage.addShake(0.8); break; }
      case 'puppets': { for (let i = 0; i < 3; i++) { const a = i * 2.1; P.burst(tx + Math.cos(a) * 0.9, 0.5, tz + Math.sin(a) * 0.9, [0x2a1a3a, 0xb07bff], 24, 2, 0.25, 0.7); this.flashes.add(tx + Math.cos(a) * 0.9, 0.6, tz + Math.sin(a) * 0.9, 0xb07bff, 0.9, 0.3); } break; }
      case 'bind': { this.darken = 2; ev.targets.forEach((p, i) => this.after(i * 0.01, () => { const [x, z] = this.toW(p.x, p.y); this.bolts.add([{ x: tx, z: tz, y: 1.2 }, { x, z, y: 0.6 }], 0xb07bff, 0.02, 0.6); this.rings.add(x, 0.07, z, 0.2, 0.7, 0x6a2aa8, 1.0); })); this.stage.addShake(0.6); break; }
      case 'petals': { for (let i = 0; i < 4; i++) this.after(i * 0.08, () => this.arcs.add(tx, 0.45, tz, i * 1.6, 0xffb8d4, 1.2 + i * 0.5, 0.25, 0.3, i % 2 ? 1 : -1)); for (let i = 0; i < 90; i++) { const a = Math.random() * PI * 2, r = Math.random() * 3; P.spawn(tx + Math.cos(a) * r, 0.3 + Math.random() * 0.6, tz + Math.sin(a) * r, -Math.sin(a) * 3, 0.6, Math.cos(a) * 3, i % 3 ? 0xffb8d4 : 0xffffff, 0.12, 1.0, { drag: 0.8 }); } this.stage.addShake(0.4); break; }
      case 'thousand': { ev.targets.forEach((p, i) => this.after(i * 0.06, () => { const [x, z] = this.toW(p.x, p.y); for (let k = 0; k < 3; k++) this.arcs.add(x, 0.5, z, Math.random() * PI * 2, k ? 0xffb8d4 : 0xffffff, 0.7, 0.2, 0.6, k % 2 ? 1 : -1); this.flashes.add(x, 0.6, z, 0xffffff, 1.1, 0.2); })); this.darken = 0.8; this.stage.addShake(0.8); break; }
      case 'wall': { this.rings.add(tx, 0.06, tz, 0.3, ev.r, 0xc8a070, 0.8); for (let i = 0; i < 18; i++) { const a = i / 18 * PI * 2, x = tx + Math.cos(a) * ev.r * 0.8, z = tz + Math.sin(a) * ev.r * 0.8; this.after(i * 0.02, () => { this.pillars.add(x, z, 0.18, 0.9, 0x9a8a78, 1.6); P.burst(x, 0.2, z, [0xc8b090, 0x8a7a68], 8, 2, 0.2, 0.6, { grav: 6, up: 1.5 }); }); } this.stage.addShake(0.7); break; }
      case 'meteor': { const [x, z] = this.toW(ev.x, ev.y); for (let i = 0; i < 24; i++) this.after(i * 0.025, () => P.spawn(x - 4 + i * 0.16, 7 - i * 0.28, z - 2 + i * 0.08, 0, 0, 0, i % 2 ? 0xff8a2a : 0xffd27a, 0.5 - i * 0.012, 0.35)); this.after(0.65, () => { this.flashes.add(x, 0.8, z, 0xffd27a, 4, 0.45); this.rings.add(x, 0.06, z, 0.3, ev.r * 1.3, 0xff8a2a, 0.7); this.rings.add(x, 0.05, z, 0.3, ev.r, 0x8a5a3a, 0.9, { disc: true, alpha: 0.5 }); P.burst(x, 0.3, z, [0xff8a2a, 0xffd27a, 0x6a5a48], 140, 8, 0.3, 1.0, { up: 2, grav: 5 }); this.sparks.fan(x, 0.4, z, 0, 0, 0xffb050, 40, 10, PI); this.flashSky = 0.5; this.stage.addShake(1.4); }); break; }
      case 'veil': { this.darken = 1.6; this.rings.add(tx, 0.06, tz, 0.3, ev.r, 0x9fb4ff, 1.0); this.rings.add(tx, 0.05, tz, 0.3, ev.r, 0x3a4a9a, 1.2, { disc: true, alpha: 0.35 }); for (const e of this.world.enemies) if (Math.hypot(e.x - ev.tower.x, e.y - ev.tower.y) < ev.r) { const [x, z] = this.toW(e.x, e.y); this.flashes.add(x, 0.6, z, 0x9fb4ff, 0.8, 0.4); } break; }
      case 'starfall': { this.darken = 1.4; ev.targets.forEach((p, i) => this.after(i * 0.05, () => { const [x, z] = this.toW(p.x, p.y); this.sparks.add(x - 0.8, 4, z - 0.4, 6, -22, 3, 0xfff2a8, 0.2, 0.05); this.after(0.16, () => { this.flashes.add(x, 0.4, z, i % 2 ? 0x9fb4ff : 0xfff2a8, 1.1, 0.3); P.burst(x, 0.3, z, [0xffffff, 0x9fb4ff], 10, 2.5, 0.15, 0.5); }); })); this.flashSky = 0.3; break; }
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
    this.fxBudget = this.stage.quality >= 2 ? 24 : 10;   // Einschlag-Effekte je Bild begrenzen (Lesbarkeit + Leistung)
    this.t += dt;
    this.syncTowers(dt); this.syncEnemies(dt);
    this.projs.sync(this.world.projs, (x, y) => this.toW(x, y), this.t, this.parts, this.crowd ? 0 : this.stage.quality, p => p.src && this.towers.get(p.src.id)?.fx);
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
      else if (this.snow) { const st = this.world.stormT > 0; for (let i = 0; i < (st ? 7 : 2); i++) this.parts.spawn((Math.random() - 0.5) * 24, 2.5 + Math.random() * 2.5, (Math.random() - 0.5) * 14, st ? 3.5 : 0.3, st ? -1.4 : -0.45, st ? 0.6 : 0.1, Math.random() < 0.8 ? 0xffffff : 0xcfeaff, st ? 0.08 : 0.07, 5, { drag: 0.02 }); }
      else this.parts.spawn((Math.random() - 0.5) * 14, 3 + Math.random() * 2, (Math.random() - 0.5) * 18, 0.4, -0.35, 0.2, Math.random() < 0.7 ? 0xffb8d0 : 0xffffff, 0.09, 6, { drag: 0.05 });
    }
    this.parts.update(dt); this.rings.update(dt); this.bolts.update(dt); this.pillars.update(dt);
    this.flashes.update(dt, this.stage.camera); this.sparks.update(dt); this.arcs.update(dt);
    if (this.later.length) this.later = this.later.filter(L => { if (this.t < L.t) return true; L.fn(); return false; });
    const lf = this.world.lives / this.world.maxLives;
    this.map.wt = this.world.t; this.map.update(dt, lf); this.amb?.update(dt, this.stage.quality);
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
