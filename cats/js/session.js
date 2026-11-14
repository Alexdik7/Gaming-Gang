// Eine Session verbindet Oberfläche und Simulation. Es gibt drei Arten:
//   LocalSession  – Einzelspieler: die World läuft direkt hier
//   HostSession   – Koop-Gastgeber: wie lokal, sendet aber den Zustand an alle (net/multiplayer.js)
//   ClientSession – Koop-Mitspieler: zeigt nur an, was der Gastgeber sendet, und schickt Befehle
// Die Oberfläche kennt nur diese gemeinsame Schnittstelle: view, me, cmd(), step(), drain(), speed.
import { World } from './sim/world.js';

export class LocalSession {
  constructor(opts) {
    this.world = new World(opts);
    this.view = this.world; this.me = 0; this.speed = 1; this.paused = false; this.isHost = true; this.online = false;
    this.acc = 0;
  }
  cmd(c) { return this.world.cmd(this.me, c); }
  // feste Zeitschritte (1/60 s) – bei Tempo ×2/×3 einfach mehr Schritte pro Bild
  step(dt) {
    if (this.paused) return;
    this.acc += Math.min(dt, 0.1) * this.speed;
    let n = 0;
    while (this.acc >= 1 / 60 && n++ < 12) { this.world.step(1 / 60); this.acc -= 1 / 60; }
    if (n >= 12) this.acc = 0;
  }
  drain() { return this.world.drain(); }
  get result() { return this.world.result; }
  close() {}
}
