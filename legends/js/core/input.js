// Eingabe: Tastatur + Maus (PC) und virtueller Joystick + Kamera-Wischen (Handy)
export class Input {
  constructor(canvas, ui) {
    this.keys = new Set(); this.move = { x: 0, y: 0 }; this.camDelta = { x: 0, y: 0 }; this.zoom = 0;
    this.run = false; this.actionQueue = []; this.enabled = true;
    addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      this.keys.add(e.code);
      if (['KeyE', 'Space', 'Enter'].includes(e.code)) this.actionQueue.push('interact');
      if (e.code === 'KeyM') this.actionQueue.push('map');
      if (e.code === 'KeyT') this.actionQueue.push('team');
      if (e.code === 'Escape') this.actionQueue.push('menu');
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    // Maus-Kamera
    let drag = null;
    canvas.addEventListener('mousedown', e => (drag = { x: e.clientX, y: e.clientY }));
    addEventListener('mouseup', () => (drag = null));
    addEventListener('mousemove', e => {
      if (!drag) return;
      this.camDelta.x += (e.clientX - drag.x) * 0.006; this.camDelta.y += (e.clientY - drag.y) * 0.004;
      drag = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('wheel', e => { this.zoom += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    // Touch
    const stick = ui.stick, knob = ui.knob;
    this.touchStick = null; this.touchCam = null;
    canvas.addEventListener('touchstart', e => {
      for (const t of e.changedTouches) {
        if (t.clientX < innerWidth * 0.45 && !this.touchStick) {
          this.touchStick = { id: t.identifier, ox: t.clientX, oy: t.clientY };
          stick.style.left = t.clientX + 'px'; stick.style.top = t.clientY + 'px'; stick.classList.add('on');
        } else if (!this.touchCam) this.touchCam = { id: t.identifier, x: t.clientX, y: t.clientY };
      }
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        if (this.touchStick && t.identifier === this.touchStick.id) {
          let dx = t.clientX - this.touchStick.ox, dy = t.clientY - this.touchStick.oy;
          const len = Math.hypot(dx, dy), max = 55;
          if (len > max) { dx *= max / len; dy *= max / len; }
          knob.style.transform = `translate(${dx}px,${dy}px)`;
          this.move.x = dx / max; this.move.y = dy / max; this.run = len > max * 0.95;
        } else if (this.touchCam && t.identifier === this.touchCam.id) {
          this.camDelta.x += (t.clientX - this.touchCam.x) * 0.008; this.camDelta.y += (t.clientY - this.touchCam.y) * 0.005;
          this.touchCam.x = t.clientX; this.touchCam.y = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });
    const end = e => {
      for (const t of e.changedTouches) {
        if (this.touchStick && t.identifier === this.touchStick.id) {
          this.touchStick = null; this.move.x = this.move.y = 0; this.run = false;
          knob.style.transform = ''; stick.classList.remove('on');
        }
        if (this.touchCam && t.identifier === this.touchCam.id) this.touchCam = null;
      }
    };
    canvas.addEventListener('touchend', end); canvas.addEventListener('touchcancel', end);
  }
  axis() {
    if (!this.enabled) return { x: 0, y: 0, run: false };
    let x = this.move.x, y = this.move.y, run = this.run;
    const k = this.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('ShiftLeft') || k.has('ShiftRight')) run = true;
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y, run };
  }
  takeCam() { const d = { ...this.camDelta, zoom: this.zoom }; this.camDelta.x = this.camDelta.y = 0; this.zoom = 0; return d; }
  takeActions() { const a = this.actionQueue; this.actionQueue = []; return a; }
}
