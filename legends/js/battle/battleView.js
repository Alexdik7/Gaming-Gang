// Inszenierung der Kämpfe: Kamera, Partikel, Animationen, Kampf-UI
import * as THREE from '../vendor/three.module.min.js';
import { Battle } from './battle.js';
import { buildCreature, animateCreature, toon } from '../world/models.js';
import { SPECIES } from '../data/creatures.js';
import { MOVES } from '../data/moves.js';
import { TYPES } from '../data/types.js';
import { maxHp, monName, xpForLevel, evolve } from '../data/mon.js';
import { sfx, cry, setMusic } from '../core/audio.js';
import { $, esc, typeChip, choose } from '../core/ui.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// ------------------------------------------------------------ Partikelsystem (ein Draw-Call)
class Particles {
  constructor(scene, max = 1500) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.size = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max); this.grav = new Float32Array(max); this.s0 = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    this.mesh = new THREE.Points(g, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      vertexShader: `attribute float size; varying vec3 vC; void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize = size*300./-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vC; void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard; float a = smoothstep(.5,0.,d); gl_FragColor=vec4(vC*a*1.6, a); }`,
    }));
    this.mesh.frustumCulled = false; scene.add(this.mesh);
  }
  emit(p, v, color, size = 0.4, life = 0.8, grav = 0) {
    if (this.n >= this.max) return;
    const i = this.n++, c = new THREE.Color(color);
    this.pos.set([p.x, p.y, p.z], i * 3); this.vel.set([v.x, v.y, v.z], i * 3);
    this.col.set([c.r, c.g, c.b], i * 3); this.size[i] = this.s0[i] = size; this.life[i] = this.maxLife[i] = life; this.grav[i] = grav;
  }
  burst(p, color, n = 30, speed = 4, size = 0.35, life = 0.7, grav = 0) {
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
      this.emit(p, v, color, size * (0.6 + Math.random() * 0.8), life * (0.6 + Math.random() * 0.6), grav);
    }
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { // swap remove
        const j = --this.n;
        for (const [a, k] of [[this.pos, 3], [this.vel, 3], [this.col, 3]]) for (let q = 0; q < k; q++) a[i * k + q] = a[j * k + q];
        this.size[i] = this.size[j]; this.life[i] = this.life[j]; this.maxLife[i] = this.maxLife[j]; this.grav[i] = this.grav[j]; this.s0[i] = this.s0[j];
        i--; continue;
      }
      this.vel[i * 3 + 1] -= this.grav[i] * dt;
      for (let q = 0; q < 3; q++) this.pos[i * 3 + q] += this.vel[i * 3 + q] * dt;
      this.size[i] = this.s0[i] * Math.min(1, this.life[i] / this.maxLife[i] * 1.5);
    }
    const g = this.mesh.geometry; g.setDrawRange(0, this.n);
    g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.size.needsUpdate = true;
  }
}

export class BattleView {
  constructor(game) {
    this.g = game; this.parts = new Particles(game.scene);
    this.active = false; this.models = { p: null, f: null }; this.t = 0;
    this.cam = { pos: new THREE.Vector3(), look: new THREE.Vector3(), tpos: new THREE.Vector3(), tlook: new THREE.Vector3(), shake: 0, speed: 3 };
    this.anims = [];
    this.ui = $('#battle'); this.bolts = [];
  }

  // ---------------------------------------------------------- Ablauf
  async run({ team, foeTeam, wild = true, trainer = null, intro = 'wild', canCatch = true }) {
    const g = this.g, P = g.player.pos.clone();
    this.active = true; g.mode = 'battle';
    // freiste Richtung für die Arena wählen (bevorzugt Blickrichtung)
    let best = g.player.rot, bestScore = -1;
    for (let k = 0; k < 12; k++) {
      const a = g.player.rot + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 6);
      let score = 0;
      for (let d = 1; d <= 10; d += 1) {
        const x = P.x + Math.sin(a) * d, z = P.z + Math.cos(a) * d;
        if (g.world.height(x, z) < -0.3 || Math.abs(g.world.height(x, z) - P.y) > 2.5 || g.world.colliders.some(c => c.hw > 1 && Math.abs(x - c.x) < c.hw && Math.abs(z - c.z) < c.hd)) break;
        score++;
      }
      if (score > bestScore) { bestScore = score; best = a; }
      if (score >= 10) break;
    }
    g.player.rot = best; g.player.model.rotation.y = best;
    const fwd = new THREE.Vector3(Math.sin(best), 0, Math.cos(best));
    this.d = fwd; this.side = new THREE.Vector3(fwd.z, 0, -fwd.x);
    this.A = P.clone().addScaledVector(fwd, 1.6); this.B = P.clone().addScaledVector(fwd, 8.2);
    for (const v of [this.A, this.B]) v.y = Math.max(0.05, g.world.height(v.x, v.z));
    g.world.hideTreesNear([P, this.A, this.B, P.clone().addScaledVector(fwd, -4)], 7.5);
    this.rings = [[this.A, '#5dffb0'], [this.B, '#ff6a5c']].map(([at, col]) => {
      const r = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.25, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
      r.rotation.x = -Math.PI / 2; r.position.copy(at).add(new THREE.Vector3(0, 0.06, 0)); g.scene.add(r); return r;
    });
    this.battle = new Battle({ team, foeTeam, wild, trainer, canCatch });
    const bt = this.battle;
    setMusic(intro === 'legend' ? 'legend' : 'battle');
    sfx('encounter');
    $('#flash').classList.add('on'); await wait(260); $('#flash').classList.remove('on');
    // Gegner erscheint
    this.spawn('f', bt.f, true);
    this.cam.pos.copy(this.B).addScaledVector(fwd, 5).addScaledVector(this.side, 3).add(new THREE.Vector3(0, 2.5, 0));
    this.cam.look.copy(this.B).add(new THREE.Vector3(0, 0.8, 0));
    this.setCam('foe');
    this.ui.hidden = false; this.renderCards(); $('#own-card').classList.add('hide');
    cry(SPECIES[bt.f.sp].cry);
    await this.say(trainer ? `${trainer.name} fordert dich heraus!` : (intro === 'legend' ? `Das legendäre ${SPECIES[bt.f.sp].name} erscheint!` : `Ein wildes ${SPECIES[bt.f.sp].name} taucht auf!`));
    await this.sendIn('p', bt.p);
    $('#own-card').classList.remove('hide');
    this.setCam('main');
    // Rundenschleife
    while (!bt.over) {
      const action = await this.chooseAction();
      if (!action) continue;
      const ev = bt.turn(action);
      await this.play(ev);
      if (bt.awaitSwitch) {
        const i = await this.pickTeam('Wer soll kämpfen?', false);
        await this.play(bt.forcedSwitch(i));
      }
    }
    await wait(400);
    // Entwicklungen nach dem Kampf
    for (const pe of bt.pendingEvos) {
      const m = team.find(x => x.uid === pe.uid);
      if (m && m.hp > 0) await this.evolution(m, pe.to);
    }
    this.cleanup();
    return { result: bt.result, caught: bt.caught };
  }

  cleanup() {
    for (const s of ['p', 'f']) if (this.models[s]) { this.g.scene.remove(this.models[s]); this.models[s] = null; }
    this.ui.hidden = true; $('#cmd').innerHTML = ''; this.active = false;
    this.g.world.restoreTrees();
    for (const r of this.rings || []) this.g.scene.remove(r); this.rings = null;
    if (this.crystal) { this.g.scene.remove(this.crystal); this.crystal = null; }
  }

  // ---------------------------------------------------------- UI
  renderCards() {
    const bt = this.battle;
    const card = (m, own) => {
      const S = SPECIES[m.sp], mx = maxHp(m), pct = Math.max(0, m.hp / mx * 100);
      const xpP = own ? ((m.xp - xpForLevel(m.lvl)) / (xpForLevel(m.lvl + 1) - xpForLevel(m.lvl)) * 100) : 0;
      return `<div class="bc-top"><b>${esc(monName(m))}</b>${m.shiny ? '<span class="shiny">✦</span>' : ''}<span class="lv">Lv ${m.lvl}</span></div>
        <div class="bc-types">${S.types.map(typeChip).join('')}${m.status ? `<span class="chip st">${{ brand: 'BRD', gift: 'GIF', starre: 'STR' }[m.status]}</span>` : ''}</div>
        <div class="hpbar"><i style="width:${pct}%" class="${pct < 25 ? 'low' : pct < 50 ? 'mid' : ''}"></i></div>
        ${own ? `<div class="hpnum">${m.hp} / ${mx}</div><div class="xpbar"><i style="width:${Math.min(100, xpP)}%"></i></div>` : ''}`;
    };
    $('#foe-card').innerHTML = card(bt.f, false);
    $('#own-card').innerHTML = card(bt.p, true);
  }

  say(text, ms) {
    return new Promise(res => {
      const box = $('#bmsg'); box.innerHTML = esc(text); box.classList.add('on');
      let done = false;
      const fin = () => { if (done) return; done = true; box.onclick = null; res(); };
      box.onclick = fin;
      setTimeout(fin, ms ?? Math.min(2200, 650 + text.length * 22));
    });
  }

  chooseAction() {
    const bt = this.battle, cmd = $('#cmd');
    $('#bmsg').innerHTML = `Was soll ${esc(monName(bt.p))} tun?`;
    return new Promise(res => {
      const main = () => {
        cmd.innerHTML = `<button class="bbtn fight" data-c="fight">⚔️ Kampf</button><button class="bbtn" data-c="team">🐾 Team</button>
          <button class="bbtn" data-c="bag">🎒 Tasche</button><button class="bbtn" data-c="run">🏃 Flucht</button>`;
      };
      const moves = () => {
        cmd.innerHTML = bt.p.moves.map((mv, i) => {
          const M = MOVES[mv.id];
          return `<button class="bbtn mv" style="--c:${TYPES[M.type].color}" data-m="${i}" ${mv.pp <= 0 ? 'disabled' : ''}>
            <b>${M.name}</b><small>${TYPES[M.type].name} · ${M.cat === 'status' ? 'Status' : 'St. ' + M.pow} · AP ${mv.pp}/${M.pp}</small></button>`;
        }).join('') + `<button class="bbtn back" data-c="back">↩</button>`;
      };
      main();
      cmd.onclick = async e => {
        const b = e.target.closest('button'); if (!b || b.disabled) return;
        sfx('click');
        if (b.dataset.m !== undefined) { cmd.innerHTML = ''; cmd.onclick = null; return res({ t: 'move', i: +b.dataset.m }); }
        const c = b.dataset.c;
        if (c === 'fight') { if (bt.p.moves.every(m => m.pp <= 0)) { bt.p.moves[0].pp = 1; } moves(); }
        else if (c === 'back') main();
        else if (c === 'run') { cmd.innerHTML = ''; cmd.onclick = null; res({ t: 'run' }); }
        else if (c === 'team') {
          const i = await this.pickTeam('Kreatur wechseln', true);
          if (i === null || i === bt.pi) return main();
          cmd.innerHTML = ''; cmd.onclick = null; res({ t: 'switch', i });
        } else if (c === 'bag') {
          const bag = this.g.state.bag;
          const opts = [
            { label: `💎 Bindkristall ×${bag.kristall || 0}`, disabled: !bag.kristall || !bt.canCatch },
            { label: `💎 Sternkristall ×${bag.sternkristall || 0} (bessere Chance)`, disabled: !bag.sternkristall || !bt.canCatch },
            { label: `🧪 Heiltrank ×${bag.trank || 0} (+30 KP)`, disabled: !bag.trank },
          ];
          const i = await choose('Tasche', opts);
          if (i === 0) { bag.kristall--; cmd.innerHTML = ''; cmd.onclick = null; return res({ t: 'catch', bonus: SPECIES[bt.f.sp].legendary ? 1.2 : 1 }); }
          if (i === 1) { bag.sternkristall--; cmd.innerHTML = ''; cmd.onclick = null; return res({ t: 'catch', bonus: 2 }); }
          if (i === 2) {
            const ti = await this.pickTeam('Wen heilen?', true, true);
            if (ti === null) return main();
            bag.trank--; cmd.innerHTML = ''; cmd.onclick = null; return res({ t: 'item', target: ti, amount: 30 });
          }
          main();
        }
      };
    });
  }

  async pickTeam(title, cancelable, allowActive = false) {
    const bt = this.battle;
    const items = bt.team.map((m, i) => ({
      html: `<span class="pi"><b>${esc(monName(m))}</b> Lv ${m.lvl}</span><span class="pi-hp">${m.hp}/${maxHp(m)} KP</span>`,
      disabled: m.hp <= 0 || (!allowActive && i === bt.pi),
    }));
    let r;
    do { r = await choose(title, items, { cancel: cancelable ? 'Zurück' : null }); } while (r === null && !cancelable);
    return r;
  }

  // ---------------------------------------------------------- Ereignisse abspielen
  async play(events) {
    const bt = this.battle;
    for (const e of events) {
      switch (e.t) {
        case 'msg': await this.say(e.text); break;
        case 'move': await this.animMove(e.side, e.move, e.hit); break;
        case 'hp': {
          if (e.heal) { this.healFx(e.side); sfx('heal'); }
          else if (e.dot) { this.parts.burst(this.pos(e.side, 0.6), TYPES[e.type].color, 25, 2, 0.3, 0.8, -2); this.blink(e.side); sfx('weak'); }
          else this.impact(e.side, e);
          this.renderCards(); await wait(e.heal ? 500 : 450); break;
        }
        case 'stat': this.statFx(e.side, e.up); sfx(e.up ? 'buff' : 'debuff'); await wait(500); break;
        case 'status': this.parts.burst(this.pos(e.side, 0.7), { brand: '#ff6a2b', gift: '#b45ce0', starre: '#ffd23a' }[e.status], 40, 3); this.renderCards(); await wait(300); break;
        case 'faint': await this.faint(e.side); break;
        case 'send': await this.say(e.text, 900); await this.sendIn(e.side, e.mon); this.renderCards(); break;
        case 'recall': await this.say(e.text, 700); await this.recall(e.side); break;
        case 'catch': await this.catchAnim(e.shakes, e.ok); break;
        case 'xp': this.renderCards(); await wait(250); break;
        case 'lvl': sfx('lvl'); this.parts.burst(this.pos('p', 0.6), '#ffe27a', 40, 3, 0.3, 1, -1); this.renderCards(); await this.say(e.text); break;
        case 'learn': await this.learn(bt.team.find(m => m.uid === e.uid), e.id); break;
        case 'needSwitch': break;
        case 'end': break;
      }
    }
    this.renderCards();
  }

  async learn(m, id) {
    if (!m) return;
    const M = MOVES[id];
    if (m.moves.length < 4) { m.moves.push({ id, pp: M.pp }); sfx('lvl'); return this.say(`${monName(m)} hat ${M.name} erlernt!`); }
    await this.say(`${monName(m)} möchte ${M.name} lernen, kennt aber schon vier Attacken.`);
    const i = await choose(`Welche Attacke soll für ${M.name} vergessen werden?`, m.moves.map(mv => ({ label: `${MOVES[mv.id].name} (${TYPES[MOVES[mv.id].type].name})` })), { cancel: `${M.name} nicht lernen` });
    if (i === null) return this.say(`${monName(m)} hat ${M.name} nicht erlernt.`);
    const old = MOVES[m.moves[i].id].name; m.moves[i] = { id, pp: M.pp };
    return this.say(`1, 2 und … Schwupp! ${monName(m)} hat ${old} vergessen und ${M.name} erlernt!`);
  }

  async evolution(m, to) {
    const name = monName(m);
    this.ui.hidden = false; $('#cmd').innerHTML = ''; $('#foe-card').innerHTML = ''; $('#own-card').classList.add('hide');
    if (this.models.f) { this.g.scene.remove(this.models.f); this.models.f = null; }
    if (!this.models.p) this.spawn('p', m);
    this.setCam('evo');
    await this.say(`Nanu? ${name} entwickelt sich!`);
    sfx('evo');
    const mdl = this.models.p;
    for (let i = 0; i < 24; i++) {
      mdl.visible = i % 2 === 0 || i > 20; this.parts.burst(this.pos('p', 0.7), '#ffffff', 6, 3, 0.4, 0.6);
      await wait(Math.max(40, 160 - i * 5));
    }
    evolve(m, to);
    this.g.scene.remove(mdl); this.spawn('p', m);
    this.parts.burst(this.pos('p', 0.8), '#fff6c0', 120, 7, 0.5, 1.2);
    sfx('caught'); cry(SPECIES[to].cry);
    await this.say(`Glückwunsch! Dein ${name} hat sich zu ${SPECIES[to].name} entwickelt!`, 2600);
    this.g.onDex?.(to, true);
  }

  // ---------------------------------------------------------- Modelle & Kamera
  spawn(side, mon, visible = true) {
    if (this.models[side]) this.g.scene.remove(this.models[side]);
    const mdl = buildCreature(SPECIES[mon.sp].model, mon.shiny);
    const at = side === 'p' ? this.A : this.B;
    mdl.position.copy(at);
    mdl.rotation.y = Math.atan2(this.d.x, this.d.z) + (side === 'f' ? Math.PI : 0);
    mdl.visible = visible; mdl.userData.base = at.clone(); mdl.userData.scaleK = 1;
    this.g.scene.add(mdl); this.models[side] = mdl;
    return mdl;
  }
  pos(side, h = 0.6) {
    const m = this.models[side];
    const base = m ? m.position : side === 'p' ? this.A : this.B;
    return base.clone().add(new THREE.Vector3(0, h * (m ? m.userData.size : 1) + (m?.userData.P.hover || 0), 0));
  }
  setCam(mode, side) {
    const { A, B, d, side: s } = this, c = this.cam, up = new THREE.Vector3(0, 1, 0);
    const mid = A.clone().lerp(B, 0.55);
    if (mode === 'main') { c.tpos.copy(A).addScaledVector(d, -4.6).addScaledVector(s, -2.4).addScaledVector(up, 2.6); c.tlook.copy(mid).addScaledVector(up, 0.6); c.speed = 2.5; }
    if (mode === 'foe') { c.tpos.copy(B).addScaledVector(d, -3.2).addScaledVector(s, -1.4).addScaledVector(up, 1.4); c.tlook.copy(B).addScaledVector(up, 0.8); c.speed = 1.2; }
    if (mode === 'own') { c.tpos.copy(A).addScaledVector(d, 3).addScaledVector(s, 1.6).addScaledVector(up, 1.3); c.tlook.copy(A).addScaledVector(up, 0.7); c.speed = 3; }
    if (mode === 'attackP') { c.tpos.copy(A).addScaledVector(d, -3.4).addScaledVector(s, 2.6).addScaledVector(up, 1.9); c.tlook.copy(B).addScaledVector(up, 0.8); c.speed = 4; }
    if (mode === 'attackF') { c.tpos.copy(B).addScaledVector(d, 3.4).addScaledVector(s, -2.6).addScaledVector(up, 2.0); c.tlook.copy(A).addScaledVector(up, 0.8); c.speed = 4; }
    if (mode === 'wide') { c.tpos.copy(mid).addScaledVector(s, -8).addScaledVector(up, 3.5); c.tlook.copy(mid).addScaledVector(up, 0.6); c.speed = 3; }
    if (mode === 'evo') { c.tpos.copy(A).addScaledVector(d, 4).addScaledVector(up, 1.8); c.tlook.copy(A).addScaledVector(up, 0.8); c.speed = 2; }
  }
  tween(dur, fn) { return new Promise(res => this.anims.push({ t: 0, dur, fn, res })); }

  update(dt, camera) {
    this.t += dt;
    this.parts.update(dt);
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i]; a.t += dt; const k = Math.min(1, a.t / a.dur);
      a.fn(k); if (k >= 1) { this.anims.splice(i, 1); a.res(); }
    }
    for (const s of ['p', 'f']) { const m = this.models[s]; if (m && m.visible) animateCreature(m, this.t, false); }
    if (this.rings) this.rings.forEach((r, i) => { r.rotation.z = this.t * (i ? -0.5 : 0.5); r.material.opacity = 0.4 + Math.sin(this.t * 3 + i) * 0.15; });
    for (let i = this.bolts.length - 1; i >= 0; i--) { const b = this.bolts[i]; b.life -= dt; b.line.visible = Math.random() > 0.3; if (b.life <= 0) { this.g.scene.remove(b.line); this.bolts.splice(i, 1); } }
    if (!this.active && !this.parts.n) return;
    if (!this.active) return;
    const c = this.cam, k = 1 - Math.exp(-c.speed * dt);
    c.pos.lerp(c.tpos, k); c.look.lerp(c.tlook, k);
    camera.position.copy(c.pos);
    if (c.shake > 0) { c.shake = Math.max(0, c.shake - dt * 2.5); camera.position.add(new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(c.shake * 0.5)); }
    camera.lookAt(c.look);
  }

  // ---------------------------------------------------------- Effekte
  async sendIn(side, mon) {
    const mdl = this.spawn(side, mon, true);
    const from = side === 'p' ? this.g.player.pos.clone().add(new THREE.Vector3(0, 1.2, 0)) : this.B.clone().addScaledVector(this.d, 3).add(new THREE.Vector3(0, 1, 0));
    const to = this.pos(side, 0.5);
    for (let i = 0; i < 14; i++) this.parts.emit(from.clone().lerp(to, i / 14), new THREE.Vector3(0, 0.5, 0), '#9ff3ff', 0.35, 0.4);
    mdl.scale.setScalar(0.01);
    sfx('whoosh');
    await this.tween(0.35, k => mdl.scale.setScalar(Math.max(0.01, ease(k) * 1.1 - (k > 0.8 ? (k - 0.8) * 0.5 : 0))));
    mdl.scale.setScalar(1);
    this.parts.burst(to, '#bff8ff', 40, 4, 0.35, 0.6);
    cry(SPECIES[mon.sp].cry);
    await wait(300);
  }
  async recall(side) {
    const mdl = this.models[side]; if (!mdl) return;
    this.parts.burst(this.pos(side), '#9ff3ff', 25, 2);
    await this.tween(0.3, k => mdl.scale.setScalar(Math.max(0.01, 1 - k)));
    this.g.scene.remove(mdl); this.models[side] = null;
  }
  blink(side) {
    const m = this.models[side]; if (!m) return;
    let n = 0; const iv = setInterval(() => { m.visible = !m.visible; if (++n >= 6) { m.visible = true; clearInterval(iv); } }, 70);
  }
  impact(side, e) {
    const col = TYPES[e.type].color, p = this.pos(side, 0.6), big = e.eff > 1 || e.crit;
    if (e.eff === 0) { sfx('weak'); return; }
    this.parts.burst(p, col, big ? 70 : 35, big ? 7 : 4.5, big ? 0.5 : 0.38, 0.6);
    this.parts.burst(p, '#ffffff', big ? 20 : 8, 3, 0.3, 0.3);
    this.blink(side);
    const m = this.models[side];
    if (m) {
      const dir = side === 'f' ? this.d : this.d.clone().negate(), base = m.userData.base;
      this.tween(0.35, k => m.position.copy(base).addScaledVector(dir, Math.sin(k * Math.PI) * (big ? 0.7 : 0.35)));
    }
    this.cam.shake = big ? 1.1 : e.eff < 1 ? 0.2 : 0.45;
    sfx(big ? 'super' : e.eff < 1 ? 'weak' : 'hit');
    if (big) { $('#flash').classList.add('on', 'soft'); setTimeout(() => $('#flash').classList.remove('on', 'soft'), 120); }
  }
  healFx(side) {
    const p = this.pos(side, 0);
    for (let i = 0; i < 50; i++) {
      const a = Math.random() * 6.28, r = 0.4 + Math.random() * 0.6;
      this.parts.emit(p.clone().add(new THREE.Vector3(Math.cos(a) * r, Math.random() * 0.5, Math.sin(a) * r)), new THREE.Vector3(0, 1.5 + Math.random() * 1.5, 0), '#7dffb0', 0.3, 1.1);
    }
  }
  statFx(side, up) {
    const p = this.pos(side, up ? 0 : 1.6);
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * 6.28, r = 0.5 + Math.random() * 0.4;
      this.parts.emit(p.clone().add(new THREE.Vector3(Math.cos(a) * r, Math.random() * 0.3, Math.sin(a) * r)), new THREE.Vector3(0, up ? 2.2 : -1.6, 0), up ? '#ffb24a' : '#6aa8ff', 0.28, 0.9);
    }
  }
  zap(from, to, color) {
    const pts = [], n = 9;
    for (let i = 0; i <= n; i++) {
      const p = from.clone().lerp(to, i / n);
      if (i && i < n) p.add(new THREE.Vector3((Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.7));
      pts.push(p);
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending }));
    this.g.scene.add(line); this.bolts.push({ line, life: 0.35 });
  }

  async animMove(side, id, hit) {
    const M = MOVES[id], col = TYPES[M.type].color, foe = side === 'p' ? 'f' : 'p';
    const user = this.models[side], tgt = this.models[foe];
    if (!user) return;
    this.setCam(side === 'p' ? 'attackP' : 'attackF');
    await wait(250);
    const base = user.userData.base, dir = (side === 'p' ? this.d : this.d.clone().negate());
    const from = this.pos(side, 0.7), to = this.pos(foe, 0.6);
    const dist = base.distanceTo(foe === 'f' ? this.B : this.A);
    switch (M.fx) {
      case 'dash': case 'bite': case 'slash': {
        sfx('whoosh');
        const lunge = M.fx === 'dash' ? dist - 1.1 : dist - 1.4;
        await this.tween(0.22, k => { user.position.copy(base).addScaledVector(dir, ease(k) * lunge); user.position.y = base.y + Math.sin(k * Math.PI) * 0.5; });
        if (hit) {
          if (M.fx === 'slash') for (let i = 0; i < 3; i++) for (let j = 0; j < 10; j++) this.parts.emit(to.clone().add(new THREE.Vector3((j / 10 - 0.5) * 1.2, (j / 10 - 0.5) * 1.0 + (i - 1) * 0.3, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(this.d.x, this.d.z))), new THREE.Vector3(0, 0, 0), col, 0.25, 0.35);
          if (M.fx === 'bite') for (const s of [1, -1]) for (let j = 0; j < 8; j++) this.parts.emit(to.clone().add(new THREE.Vector3(0, s * 0.5, 0)), new THREE.Vector3((j - 4) * 0.2, -s * 2.5, 0), '#ffffff', 0.25, 0.25);
        }
        await this.tween(0.3, k => { user.position.copy(base).addScaledVector(dir, (1 - ease(k)) * lunge); });
        user.position.copy(base);
        break;
      }
      case 'bolt': case 'beam': {
        sfx('whoosh');
        const dur = M.fx === 'beam' ? 0.55 : 0.4;
        await this.tween(dur, k => {
          if (M.fx === 'beam') for (let i = 0; i < 4; i++) this.parts.emit(from.clone().lerp(to, Math.random() * k), new THREE.Vector3((Math.random() - .5), (Math.random() - .5), (Math.random() - .5)), col, 0.35, 0.25);
          else { const p = from.clone().lerp(to, ease(k)); p.y += Math.sin(k * Math.PI) * 0.6; for (let i = 0; i < 3; i++) this.parts.emit(p, new THREE.Vector3((Math.random() - .5) * 0.6, (Math.random() - .5) * 0.6, (Math.random() - .5) * 0.6), col, 0.55, 0.3); }
        });
        break;
      }
      case 'zap': {
        for (let i = 0; i < 4; i++) { this.zap(from, to, col); this.zap(from, to, '#ffffff'); await wait(70); }
        break;
      }
      case 'storm': {
        sfx('whoosh');
        await this.tween(0.9, k => {
          for (let i = 0; i < 6; i++) {
            const a = k * 18 + i * 1.05, r = 1.4 - k * 0.6;
            this.parts.emit(to.clone().add(new THREE.Vector3(Math.cos(a) * r, -0.5 + k * 1.6 + i * 0.1, Math.sin(a) * r)), new THREE.Vector3(0, 0.8, 0), i % 2 ? col : '#ffffff', 0.4, 0.4);
          }
        });
        this.cam.shake = 0.6;
        break;
      }
      case 'quake': {
        this.setCam('wide'); this.cam.shake = 1.4; sfx('hit');
        for (let r = 0; r < 3; r++) {
          for (let i = 0; i < 24; i++) { const a = i / 24 * 6.28; this.parts.emit(this.pos(foe, 0).add(new THREE.Vector3(0, 0.1, 0)), new THREE.Vector3(Math.cos(a) * 5, 1.5, Math.sin(a) * 5), col, 0.45, 0.5, 6); }
          await wait(160);
        }
        break;
      }
      case 'cloud': {
        for (let i = 0; i < 60; i++) this.parts.emit(to.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.6, (Math.random() - 0.3) * 1.2, (Math.random() - 0.5) * 1.6)), new THREE.Vector3(0, 0.3, 0), col, 0.7, 1.0);
        await wait(500); break;
      }
      case 'roar': {
        cry(SPECIES[this.battle.mon(side).sp].cry);
        await this.tween(0.5, k => user.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.18));
        for (let i = 0; i < 30; i++) { const a = i / 30 * 6.28; this.parts.emit(from, new THREE.Vector3(Math.cos(a) * 4, 0, Math.sin(a) * 4), '#ffffff', 0.25, 0.4); }
        break;
      }
      case 'buff': case 'heal': {
        await this.tween(0.4, k => user.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.1));
        break;
      }
    }
    if (M.cat !== 'status' || M.fx === 'cloud') this.setCam(side === 'p' ? 'attackP' : 'attackF');
    setTimeout(() => this.active && this.setCam('main'), 700);
  }

  async faint(side) {
    const m = this.models[side]; if (!m) return;
    sfx('faint');
    const b = m.position.clone();
    await this.tween(0.6, k => { m.position.y = b.y - k * 0.6; m.scale.setScalar(Math.max(0.01, 1 - k * 0.9)); m.rotation.z = k * 0.4; });
    this.parts.burst(b.clone().add(new THREE.Vector3(0, 0.3, 0)), '#bbbbbb', 25, 2, 0.4, 0.8);
    this.g.scene.remove(m); this.models[side] = null;
  }

  async catchAnim(shakes, ok) {
    const fm = this.models.f;
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), toon('#8ff0ff', '#3fd8ff', 1.2));
    crystal.scale.y = 1.4; this.crystal = crystal;
    const start = this.g.player.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), end = this.pos('f', 0.9);
    this.g.scene.add(crystal); sfx('throw'); this.setCam('wide');
    await this.tween(0.6, k => { crystal.position.copy(start).lerp(end, k); crystal.position.y += Math.sin(k * Math.PI) * 2.5; crystal.rotation.y = k * 12; });
    this.parts.burst(end, '#9ff3ff', 50, 4);
    if (fm) await this.tween(0.35, k => { fm.scale.setScalar(Math.max(0.01, 1 - k)); fm.position.lerpVectors(fm.userData.base, end, k); });
    if (fm) fm.visible = false;
    const ground = this.B.clone().add(new THREE.Vector3(0, 0.38, 0));
    await this.tween(0.35, k => { crystal.position.copy(end).lerp(ground, ease(k)); });
    this.cam.tpos.copy(this.B).addScaledVector(this.d, -2.5).addScaledVector(this.side, -1).add(new THREE.Vector3(0, 1.3, 0)); this.cam.tlook.copy(ground);
    for (let i = 0; i < shakes; i++) {
      await wait(450); sfx('wobble');
      await this.tween(0.45, k => (crystal.rotation.z = Math.sin(k * Math.PI * 2) * 0.5));
    }
    await wait(400);
    if (ok) {
      sfx('caught');
      for (let i = 0; i < 5; i++) this.parts.burst(ground.clone().add(new THREE.Vector3(0, 0.5, 0)), ['#ffe27a', '#ffffff', '#9ff3ff'][i % 3], 25, 3, 0.35, 1, 2);
      crystal.material = toon('#ffe27a', '#ffc24a', 1.4);
      await wait(600);
    } else {
      this.parts.burst(ground, '#9ff3ff', 60, 5);
      this.g.scene.remove(crystal); this.crystal = null;
      if (fm) { fm.visible = true; fm.position.copy(fm.userData.base); await this.tween(0.3, k => fm.scale.setScalar(Math.max(0.01, k))); }
      cry(SPECIES[this.battle.f.sp].cry);
    }
    this.setCam('main');
  }
}
