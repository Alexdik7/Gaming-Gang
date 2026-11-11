// Turbofieber – Reifenqualm, Funken (Punktwolken) und Bremsspuren (Ringpuffer).
import * as THREE from 'three';
import { softCircle } from './world.js';

// Partikel als eine einzige Punktwolke (1 Draw-Call)
class Particles {
  constructor(scene, count, opts) {
    this.n = count;
    this.pos = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    this.max = new Float32Array(count).fill(1);
    this.size = new Float32Array(count);
    this.alpha = new Float32Array(count);
    this.next = 0;
    this.opts = opts;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: softCircle(64) }, uColor: { value: new THREE.Color(opts.color) }, uScale: { value: 300 } },
      vertexShader: `attribute float aSize; attribute float aAlpha; varying float vA; uniform float uScale;
        void main(){ vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D uMap; uniform vec3 uColor; varying float vA;
        void main(){ vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(uColor, t.a * vA); }`,
      transparent: true, depthWrite: false, blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  emit(x, y, z, vx, vy, vz, life, size) {
    const i = this.next;
    this.next = (i + 1) % this.n;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.life[i] = this.max[i] = life;
    this.size[i] = size;
  }
  update(dt) {
    const o = this.opts;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      this.life[i] -= dt;
      const k = Math.max(0, this.life[i] / this.max[i]);
      this.vel[i * 3 + 1] += o.gravity * dt;
      const drag = Math.exp(-o.drag * dt);
      this.vel[i * 3] *= drag; this.vel[i * 3 + 2] *= drag;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] = Math.max(0.05, this.pos[i * 3 + 1] + this.vel[i * 3 + 1] * dt);
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.size[i] += o.grow * dt;
      this.alpha[i] = o.alpha * (o.fadeIn ? Math.min(1, (1 - k) * 6) * k : k);
    }
    const a = this.points.geometry.attributes;
    a.position.needsUpdate = a.aSize.needsUpdate = a.aAlpha.needsUpdate = true;
  }
  setScale(h) { this.mat.uniforms.uScale.value = h * 0.5; }
}

export class Effects {
  constructor(scene) {
    this.smoke = new Particles(scene, 240, { color: '#d6d4d0', gravity: 1.2, drag: 1.6, grow: 2.6, alpha: 0.42, fadeIn: true });
    this.sparks = new Particles(scene, 120, { color: '#ffb048', gravity: -14, drag: 0.6, grow: -0.6, alpha: 1, additive: true });
    // Bremsspuren: Ringpuffer aus flachen Streifen
    this.skidN = 700;
    this.skid = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.28, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }),
      this.skidN);
    this.skid.frustumCulled = false;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.skidN; i++) this.skid.setMatrixAt(i, zero);
    scene.add(this.skid);
    this.skidNext = 0;
    this.lastMarks = [null, null];
    this.dummy = new THREE.Object3D();
  }

  // Reifenqualm und Spuren an den Hinterrädern, solange das Auto rutscht
  tires(car, dt, wet = 0) {
    const sl = car.slip + (car.braking && car.speed > 8 ? 6 : 0);
    const y0 = car.pos.y;
    const sh = Math.sin(car.heading), ch = Math.cos(car.heading);
    const wheels = [[0.9, -1.36], [-0.9, -1.36]];
    for (let w = 0; w < 2; w++) {
      const [lx, lz] = wheels[w];
      const x = car.pos.x + lx * ch + lz * sh, z = car.pos.z - lx * sh + lz * ch;
      if (sl > 3.2) {
        if (Math.random() < Math.min(1, sl * dt * 3)) {
          this.smoke.emit(x, y0 + 0.3, z, -car.vx * 0.15 + (Math.random() - 0.5) * 2, 0.6 + Math.random(), -car.vz * 0.15 + (Math.random() - 0.5) * 2, 1.4 + Math.random() * 0.8, 1.1 + Math.random());
        }
        const last = this.lastMarks[w];
        if (last) {
          const dx = x - last.x, dz = z - last.z, len = Math.hypot(dx, dz);
          if (len > 0.35) {
            const d = this.dummy;
            d.position.set((x + last.x) / 2, y0 + 0.025, (z + last.z) / 2);
            d.rotation.set(0, Math.atan2(dx, dz), 0);
            d.scale.set(1, 1, len + 0.05);
            d.updateMatrix();
            this.skid.setMatrixAt(this.skidNext, d.matrix);
            this.skidNext = (this.skidNext + 1) % this.skidN;
            this.skid.instanceMatrix.needsUpdate = true;
            this.lastMarks[w] = { x, z };
          }
        } else this.lastMarks[w] = { x, z };
      } else this.lastMarks[w] = null;
      // Sprühnebel bei nasser Straße
      if (wet > 0.25 && car.speed > 8 && Math.random() < wet * car.speed * dt * 0.35) {
        this.smoke.emit(x, y0 + 0.25, z, -car.vx * 0.3 + (Math.random() - 0.5) * 2, 0.8 + Math.random(), -car.vz * 0.3 + (Math.random() - 0.5) * 2, 0.5 + Math.random() * 0.3, 0.7);
      }
    }
  }

  crash(x, y, z, power) {
    for (let i = 0; i < Math.min(30, 6 + power * 2); i++) {
      this.sparks.emit(x, y, z, (Math.random() - 0.5) * 14, 3 + Math.random() * 6, (Math.random() - 0.5) * 14, 0.4 + Math.random() * 0.4, 0.35);
    }
  }

  update(dt) {
    this.smoke.update(dt);
    this.sparks.update(dt);
  }
  setViewport(h) { this.smoke.setScale(h); this.sparks.setScale(h); }
}
