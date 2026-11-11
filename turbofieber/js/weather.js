// Turbofieber – Regen: Tropfen-Striche rund um die Kamera, Nässe, Blitze.
import * as THREE from 'three';

const BOX = 70, TOP = 26, BOTTOM = -8, N = 1500;

export class Weather {
  constructor(scene) {
    this.rain = 0;             // aktuelle Regenstärke 0 … 1
    this.target = 0;
    this.wet = 0;              // Nässe der Straße (folgt langsamer)
    this.flash = 0;            // Blitz-Helligkeit
    this.thunderAt = -1;
    this.off = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      this.off[i * 3] = (Math.random() - 0.5) * BOX;
      this.off[i * 3 + 1] = BOTTOM + Math.random() * (TOP - BOTTOM);
      this.off[i * 3 + 2] = (Math.random() - 0.5) * BOX;
    }
    this.pos = new Float32Array(N * 6);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.mat = new THREE.LineBasicMaterial({ color: '#b8ccff', transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.lines = new THREE.LineSegments(g, this.mat);
    this.lines.frustumCulled = false;
    this.lines.visible = false;
    scene.add(this.lines);
    this.lastCam = new THREE.Vector3();
  }

  // cam = Kameraposition, night = 0 … 1. Gibt true zurück, wenn gerade ein Donner fällig ist.
  update(dt, cam, night) {
    this.rain += Math.max(-dt * 0.12, Math.min(dt * 0.12, this.target - this.rain));
    this.wet += Math.max(-dt * 0.04, Math.min(dt * 0.1, this.rain - this.wet));
    const moved = cam.clone().sub(this.lastCam);
    this.lastCam.copy(cam);
    if (moved.lengthSq() > 400) moved.set(0, 0, 0);          // Teleport: nicht durchwischen

    this.flash = Math.max(0, this.flash - dt * 3);
    let thunder = false;
    if (this.rain > 0.6 && night > 0.4 && Math.random() < dt * 0.06) {
      this.flash = 1;
      this.thunderAt = 0.6 + Math.random() * 1.8;
    }
    if (this.thunderAt > 0) { this.thunderAt -= dt; if (this.thunderAt <= 0) thunder = true; }

    const vis = this.rain > 0.02;
    this.lines.visible = vis;
    if (!vis) return thunder;
    this.mat.opacity = this.rain * (0.32 + night * 0.15);
    const fall = 28 * dt, half = BOX / 2;
    // Tropfen relativ zur Kamera; bei Fahrt strömen sie entgegen
    const sx = moved.x * 0.04, sz = moved.z * 0.04;
    for (let i = 0; i < N; i++) {
      let x = this.off[i * 3] - moved.x, y = this.off[i * 3 + 1] - fall - moved.y, z = this.off[i * 3 + 2] - moved.z;
      if (x < -half) x += BOX; else if (x > half) x -= BOX;
      if (z < -half) z += BOX; else if (z > half) z -= BOX;
      if (y < BOTTOM) y += TOP - BOTTOM; else if (y > TOP) y -= TOP - BOTTOM;
      this.off[i * 3] = x; this.off[i * 3 + 1] = y; this.off[i * 3 + 2] = z;
      const j = i * 6;
      this.pos[j] = cam.x + x; this.pos[j + 1] = cam.y + y; this.pos[j + 2] = cam.z + z;
      this.pos[j + 3] = cam.x + x + 0.1 + sx; this.pos[j + 4] = cam.y + y - 0.75; this.pos[j + 5] = cam.z + z + sz;
    }
    this.lines.geometry.attributes.position.needsUpdate = true;
    return thunder;
  }
}
