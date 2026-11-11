// Turbofieber – Street-Punkte: Drift-Ketten, knappes Vorbeifahren, Highspeed. Ketten werden zu Geld.
const fmt = n => Math.round(n).toLocaleString('de-DE');

export class StreetScore {
  constructor(onBank) {
    this.onBank = onBank;          // (cash, points) → void
    this.points = 0;
    this.mult = 1;
    this.chainTime = 0;
    this.idle = 0;
    this.label = '';
    this.near = new WeakMap();     // Abklingzeit pro Verkehrsauto
    this.time = 0;
    this.el = document.getElementById('chain');
    this.lbl = document.getElementById('chainLbl');
    this.pts = document.getElementById('chainPts');
    this.pops = document.getElementById('pops');
    this.shown = '';
  }

  add(p, label) {
    if (this.points === 0) { this.mult = 1; this.chainTime = 0; }
    this.points += p;
    this.label = label;
    this.idle = 0;
  }

  popup(text, cls = '') {
    const d = document.createElement('div');
    d.className = 'pop ' + cls;
    d.textContent = text;
    this.pops.append(d);
    setTimeout(() => d.remove(), 1400);
  }

  update(dt, car, traffic) {
    this.time += dt;
    const kmh = car.speed * 3.6;
    let active = false;
    if (car.drifting && kmh > 35 && car.slip > 3) {
      this.add(car.slip * kmh * dt * 0.9, 'DRIFT');
      active = true;
    }
    if (kmh > 190) { this.add((kmh - 150) * dt * 0.8, 'HIGHSPEED'); active = true; }
    // Knapp vorbei: Verkehrsauto seitlich mit 0–1,5 m Abstand passiert
    if (kmh > 70) {
      const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
      for (const t of traffic.cars) {
        const rx = t.x - car.pos.x, rz = t.z - car.pos.z;
        const along = rx * fx + rz * fz, lat = Math.abs(rx * fz - rz * fx);
        if (Math.abs(along) < 2.4 && lat > 1.9 && lat < 3.4 && (this.near.get(t) || 0) < this.time) {
          this.near.set(t, this.time + 2.5);
          this.add(300, 'KNAPP VORBEI');
          this.popup('KNAPP! +300', 'cyan');
          if (this.onNear) this.onNear();
          active = true;
        }
      }
    }
    if (this.points > 0) {
      this.chainTime += active ? dt : 0;
      if (this.chainTime > 2.5 * this.mult && this.mult < 5) { this.mult++; this.popup('×' + this.mult, 'yellow'); }
      if (!active) { this.idle += dt; if (this.idle > 1.8) this.bank(); }
    }
    this.render();
  }

  bank() {
    const total = this.points * this.mult;
    const cash = Math.round(total / 25);   // 25 Punkte = 1 $
    if (cash > 0) { this.onBank(cash, total, this.mult); this.popup('+$' + fmt(cash), 'green'); }
    this.points = 0; this.mult = 1; this.idle = 0;
  }

  // Unfall während einer Kette: alles weg
  crash() {
    if (this.points > 60) this.popup('CRASH – Kette verloren', 'red');
    this.points = 0; this.mult = 1; this.idle = 0;
  }

  render() {
    const key = this.points > 0 ? this.label + Math.round(this.points * this.mult) + this.mult : '';
    if (key === this.shown) return;
    this.shown = key;
    this.el.classList.toggle('on', this.points > 0);
    if (this.points > 0) {
      this.lbl.textContent = this.label + (this.mult > 1 ? '  ×' + this.mult : '');
      this.pts.textContent = fmt(this.points * this.mult);
    }
  }
}
