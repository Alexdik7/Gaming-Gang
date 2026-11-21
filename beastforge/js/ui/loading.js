// Ladebildschirm: Torii mit Fuchsmaske, 9 Fuchsfeuer als Fortschritt, Kirschblüten, Tipps.
const TIPS = [
  'Anhöhen geben +15 % Reichweite – perfekt für Fernkämpfer.',
  'Die Eisenschildkröte arbeitet im Wasser 20 % schneller.',
  'Getarnte Gegner sieht nur, wer Erkennung hat: Schattenrabe, Geistsicht oder Sternenblick.',
  'Charakter-Level schalten Formen frei – im Kampf erweckst du sie mit Münzen.',
  'Feuer + Blitz = Plasma! Kombiniere Elemente für Reaktionen.',
  'Stehen Kitsune und Geisthirsch nah beieinander, aktiviert sich „Seelenhain“.',
  'Zielmodus „Stärkster“ hilft gegen Kolosse und Bosse.',
  'Früh gerufene Wellen bringen Bonus-Münzen.',
  'Ein Geistpriester-Hirsch bringt jede Welle Münzen – spare früh, ernte spät.',
  'Kreuzpfade: ein Pfad bis Stufe 5, ein zweiter bis Stufe 2.',
  'Im Glutkrater tragen Basalt-Flöße deine Kreaturen über die Lava – dort machen sie 15 % mehr Schaden.',
  'Feuerdämonen lachen über Feuer. Eis-Atem des Drachenwolfs wirkt dafür doppelt.',
  'Mastery-Sterne schalten Skins frei – gewinne mit deinen Lieblingen.',
  'Bosse haben Phasen: Achte auf Flug und Feueratem!',
];
const MASK = `<svg viewBox="0 0 200 200" class="ldmask"><defs><radialGradient id="ldg" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#ffe9d8"/></radialGradient></defs>
  <path d="M40 30 L72 82 L100 70 L128 82 L160 30 L150 110 Q140 160 100 178 Q60 160 50 110 Z" fill="url(#ldg)" stroke="#1a1028" stroke-width="6" stroke-linejoin="round"/>
  <path d="M52 48 L70 80 L60 88 Z M148 48 L130 80 L140 88 Z" fill="#e8304a"/>
  <path d="M66 104 Q80 92 92 106 Q80 112 66 104 Z M134 104 Q120 92 108 106 Q120 112 134 104 Z" fill="#1a1028"/>
  <path d="M74 96 L60 86 M126 96 L140 86" stroke="#e8304a" stroke-width="5" stroke-linecap="round"/>
  <path d="M92 132 L100 142 L108 132" fill="none" stroke="#1a1028" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M100 56 l6 10 l-6 10 l-6 -10 Z" fill="#e8304a"/><circle cx="100" cy="150" r="4" fill="#1a1028"/></svg>`;
const TORII = `<svg viewBox="0 0 300 220" class="ldtorii"><g fill="#d8342c" stroke="#1a0c14" stroke-width="5">
  <rect x="62" y="70" width="20" height="150" rx="3"/><rect x="218" y="70" width="20" height="150" rx="3"/>
  <rect x="44" y="80" width="212" height="16" rx="3"/>
  <path d="M10 30 Q150 50 290 30 L282 56 Q150 72 18 56 Z" fill="#2a1a24"/>
  <rect x="138" y="54" width="24" height="30" rx="2" fill="#2a1a24"/></g></svg>`;

export class Loader {
  constructor() {
    this.el = document.getElementById('boot');
    this.el.innerHTML = `<div class="ldsky"></div><div class="ldpetals">${Array.from({ length: 18 }, (_, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:${(i * 0.73) % 6}s;animation-duration:${6 + (i % 5)}s"></i>`).join('')}</div>
      <div class="ldcore">${TORII}<div class="ldglow"></div>${MASK}</div>
      <div class="ldtitle"><b>BEAST<span>FORGE</span></b><small id="ldSub">Shinobi Creature Defense</small></div>
      <div class="ldfires">${Array.from({ length: 9 }, (_, i) => `<i style="--d:${i * 0.07}s"></i>`).join('')}</div>
      <div class="ldlabel" id="ldLabel">Fuchsfeuer wird entzündet …</div><div class="ldtip" id="ldTip"></div>`;
    this.fires = [...this.el.querySelectorAll('.ldfires i')];
    this.t0 = performance.now(); this.tipI = Math.floor(Math.random() * TIPS.length);
  }
  show(sub = 'Shinobi Creature Defense', label = 'Lade …') {
    this.el.classList.remove('gone'); this.el.style.opacity = 1; this.el.style.display = '';
    this.el.querySelector('#ldSub').textContent = sub; this.set(0, label); this.nextTip(); this.t0 = performance.now();
    clearInterval(this.tipTimer); this.tipTimer = setInterval(() => this.nextTip(), 3200);
  }
  nextTip() { const el = this.el.querySelector('#ldTip'); el.style.opacity = 0; setTimeout(() => { el.textContent = '💡 ' + TIPS[this.tipI++ % TIPS.length]; el.style.opacity = 1; }, 180); }
  set(p, label) {
    const n = Math.round(Math.max(0, Math.min(1, p)) * 9);
    this.fires.forEach((f, i) => f.classList.toggle('on', i < n));
    if (label) this.el.querySelector('#ldLabel').textContent = label;
  }
  // Schritte nacheinander ausführen, je ein Bild Pause, damit die Anzeige mitläuft
  async run(steps, minMs = 900) {
    for (let i = 0; i < steps.length; i++) {
      const [label, fn] = steps[i]; this.set(i / steps.length, label);
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)));
      try { await fn(); } catch (e) { console.warn('Ladeschritt', label, e); }
    }
    this.set(1, 'Bereit!');
    const rest = minMs - (performance.now() - this.t0); if (rest > 0) await new Promise(r => setTimeout(r, rest));
  }
  hide() {
    clearInterval(this.tipTimer);
    this.el.style.opacity = 0; setTimeout(() => { this.el.style.display = 'none'; }, 500);
  }
}
