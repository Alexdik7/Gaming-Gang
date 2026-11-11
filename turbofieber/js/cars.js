// Turbofieber – Autos, Optik-Optionen und Leistungs-Upgrades als Daten.

// Karosserie-Maße je Modell. top = Dachlinie [z, y] von vorn unten nach hinten unten.
export const MODELS = {
  kestrel: {
    width: 1.78, wheelX: 0.9, wheelZ: 1.36, wheelR: 0.37, front: 2.22, rear: -2.2,
    top: [[2.32, 0.45], [2.3, 0.56], [2.15, 0.7], [1.7, 0.8], [0.95, 0.9], [-1.15, 0.95], [-1.9, 0.94], [-2.2, 0.86], [-2.3, 0.62]],
    cabin: [[-1.15, 0.9], [-0.95, 1.12], [-0.6, 1.3], [-0.35, 1.34], [0.35, 1.34], [0.6, 1.3], [1.0, 0.88]], cabinW: 1.42,
    deckY: 0.95, deckZ: -1.95, headY: 0.66, tailY: 0.8, hoodY: 0.85
  },
  vandal: {
    width: 1.88, wheelX: 0.96, wheelZ: 1.5, wheelR: 0.4, front: 2.4, rear: -2.4,
    top: [[2.47, 0.5], [2.46, 0.66], [2.38, 0.92], [1.0, 1.0], [-1.25, 1.02], [-2.3, 1.0], [-2.46, 0.86], [-2.48, 0.6]],
    cabin: [[-1.3, 0.98], [-1.0, 1.3], [-0.8, 1.44], [0.3, 1.46], [0.6, 1.3], [0.98, 0.98]], cabinW: 1.5,
    deckY: 1.02, deckZ: -2.15, headY: 0.78, tailY: 0.86, hoodY: 0.98
  },
  nyx: {
    width: 1.92, wheelX: 0.95, wheelZ: 1.4, wheelR: 0.37, front: 2.28, rear: -2.25,
    top: [[2.38, 0.4], [2.3, 0.5], [2.0, 0.6], [1.2, 0.72], [0.6, 0.8], [-1.3, 0.92], [-2.2, 0.88], [-2.32, 0.5]],
    cabin: [[-1.25, 0.88], [-0.85, 1.12], [-0.45, 1.2], [0.15, 1.2], [0.75, 0.78]], cabinW: 1.5,
    deckY: 0.92, deckZ: -2.0, headY: 0.52, tailY: 0.78, hoodY: 0.66
  }
};

// Grundwerte: accel = Faktor, vmax in m/s, grip = Querbeschleunigung, steer = Lenkfaktor, drift = Driftfreude
export const CARS = {
  kestrel: { name: 'Kestrel GT', price: 0, desc: 'Ausgewogenes Coupé – der Allrounder', base: { accel: 1, vmax: 64, grip: 17, steer: 1, drift: 1 } },
  vandal: { name: 'Vandal R', price: 18000, desc: 'Muscle-Car mit Wucht – driftet wie verrückt', base: { accel: 1.12, vmax: 62, grip: 15.5, steer: 0.95, drift: 1.4 } },
  nyx: { name: 'Nyx S', price: 45000, desc: 'Supersportler – schnell und präzise', base: { accel: 1.28, vmax: 72, grip: 19.5, steer: 1.12, drift: 0.9 } }
};

// Optik: Kategorien mit Einträgen [Wert, Name, Preis]
export const OPTIONS = {
  paint: {
    name: 'Lack', items: [
      ['#e0262f', 'Rennrot', 300], ['#f2f2f0', 'Perlweiß', 300], ['#1c1d22', 'Schwarz', 300], ['#1f6fe0', 'Blau', 300],
      ['#ffb51e', 'Gelb', 300], ['#2ad4a0', 'Minze', 300], ['#9a3cff', 'Violett', 300], ['#ff6a1a', 'Orange', 300],
      ['#7a8088', 'Gunmetal', 300], ['#0e3b2e', 'British Green', 300], ['#ff2a8a', 'Neonpink', 300], ['#22e8ff', 'Cyan', 300]
    ]
  },
  finish: { name: 'Lackart', items: [['glanz', 'Glanz', 0], ['metallic', 'Metallic', 600], ['matt', 'Matt', 900], ['perl', 'Perleffekt', 1200], ['chrom', 'Chrom', 2500]] },
  rims: { name: 'Felgen', items: [['speichen5', '5-Speichen', 0], ['mesh', 'Kreuzspeiche', 800], ['turbine', 'Turbine', 1000], ['tiefbett', 'Tiefbett', 1200], ['mono', 'Monoblock', 1500]] },
  rimColor: { name: 'Felgenfarbe', items: [['#2a2c30', 'Anthrazit', 0], ['#c8ccd2', 'Silber', 300], ['#0c0c0e', 'Schwarz', 300], ['#d4a531', 'Gold', 600], ['#a8662e', 'Bronze', 500], ['#f4f4f4', 'Weiß', 400]] },
  spoiler: { name: 'Spoiler', items: [['gt', 'GT-Flügel', 0], ['none', 'Ohne', 0], ['lip', 'Abrisskante', 500], ['big', 'Rennflügel', 1800]] },
  kit: { name: 'Bodykit', items: [[0, 'Serie', 0], [1, 'Sport', 1400], [2, 'Breitbau', 3200]] },
  glow: { name: 'Unterboden', items: [['off', 'Aus', 0], ['#22e8ff', 'Cyan', 1000], ['#ff2a8a', 'Pink', 1000], ['#2aff8a', 'Grün', 1000], ['#a64aff', 'Violett', 1000], ['#ff8a1a', 'Orange', 1000], ['#ffffff', 'Weiß', 1000]] },
  stripes: { name: 'Streifen', items: [['off', 'Keine', 0], ['#f4f4f4', 'Weiß', 400], ['#111214', 'Schwarz', 400], ['#e0262f', 'Rot', 400], ['#ffb51e', 'Gelb', 400], ['#22e8ff', 'Cyan', 400]] },
  tint: { name: 'Scheiben', items: [[0, 'Klar', 0], [1, 'Getönt', 200], [2, 'Dunkel', 300], [3, 'Limo', 400]] },
  lower: { name: 'Tieferlegung', items: [[0, 'Serie', 0], [1, '−3 cm', 500], [2, '−6 cm', 800], [3, '−9 cm', 1100]] }
};

export const PERF = {
  motor: { name: 'Motor', desc: 'Beschleunigung + Topspeed', price: 1500 },
  turbo: { name: 'Turbo', desc: 'Mehr Druck aus jeder Kurve', price: 1800 },
  tires: { name: 'Reifen', desc: 'Mehr Grip, auch im Regen', price: 1000 },
  chassis: { name: 'Fahrwerk', desc: 'Schärfere Lenkung', price: 1200 },
  nitro: { name: 'Nitro', desc: 'Mehr Schub, längere Füllung', price: 1300 }
};
export const PERF_MAX = 5;
export const perfPrice = (key, level) => PERF[key].price * (level + 1);   // Preis für die NÄCHSTE Stufe

export function defaultCfg(paint = '#e0262f') {
  return { paint, finish: 'metallic', rims: 'speichen5', rimColor: '#2a2c30', spoiler: 'gt', kit: 0, glow: 'off', stripes: 'off', tint: 1, lower: 0 };
}
export const defaultPerf = () => ({ motor: 0, turbo: 0, tires: 0, chassis: 0, nitro: 0 });
// Streifenwagen: weiß mit schwarzen Streifen und Blaulicht
export const policeCfg = () => ({ ...defaultCfg('#f2f2f0'), finish: 'glanz', stripes: '#111214', spoiler: 'none', rims: 'mono', rimColor: '#0c0c0e', police: true });

// Fahrwerte aus Grundwerten + Upgrades
export function statsFor(carId, perf) {
  const b = CARS[carId].base, p = perf;
  return {
    accel: b.accel * (1 + p.motor * 0.06 + p.turbo * 0.05),
    vmax: b.vmax + p.motor * 2.2 + p.turbo * 1,
    grip: b.grip * (1 + p.tires * 0.045 + p.chassis * 0.02),
    rainGrip: 1 - p.tires * 0.1,                 // Anteil des Regen-Malus, der übrig bleibt
    steer: b.steer * (1 + p.chassis * 0.07),
    drift: b.drift,
    nitroPow: 8 + p.nitro * 1.4,
    nitroDrain: 0.28 * Math.pow(0.86, p.nitro),
    nitroRegen: 1 + p.nitro * 0.15
  };
}

// Anzeige-Balken 0 … 1 (für Garage)
export function ratings(st) {
  return {
    Beschleunigung: Math.min(1, (st.accel - 0.7) / 0.95),
    Topspeed: Math.min(1, (st.vmax - 50) / 36),
    Handling: Math.min(1, ((st.grip - 13) / 10) * 0.75 + (st.steer - 0.85) * 0.8),
    Nitro: Math.min(1, (st.nitroPow - 6) / 9)
  };
}

export function optionPrice(cat, val) {
  const it = OPTIONS[cat].items.find(i => i[0] === val);
  return it ? it[2] : 0;
}
