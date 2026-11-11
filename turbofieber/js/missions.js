// Turbofieber – Tagesmissionen: jeden Tag 3 neue Aufgaben (fest ausgelost nach Datum) mit Geldbelohnung.
const POOL = [
  { id: 'pts', text: 'Sammle 15.000 Street-Punkte', stat: 'pts', goal: 15000, reward: 600 },
  { id: 'near', text: '5× knapp an Autos vorbei', stat: 'near', goal: 5, reward: 500 },
  { id: 'win', text: 'Gewinne ein Rennen', stat: 'wins', goal: 1, reward: 900 },
  { id: 'races', text: 'Fahre 3 Rennen', stat: 'races', goal: 3, reward: 700 },
  { id: 'km', text: 'Fahre 8 km', stat: 'km', goal: 8, reward: 500 },
  { id: 'top', text: 'Erreiche 240 km/h', stat: 'top', goal: 240, reward: 600, max: true },
  { id: 'summit', text: 'Fahre auf den Berggipfel', stat: 'summit', goal: 1, reward: 400, max: true },
  { id: 'mult', text: 'Drift-Kette mit ×4', stat: 'mult', goal: 4, reward: 700, max: true },
  { id: 'harbor', text: 'Besuche den Hafen', stat: 'harbor', goal: 1, reward: 300, max: true },
  { id: 'rain', text: 'Fahre 3 km im Regen', stat: 'rainKm', goal: 3, reward: 600 },
  { id: 'escape', text: 'Hänge die Polizei ab', stat: 'escapes', goal: 1, reward: 800 },
  { id: 'bounty', text: 'Kassiere 2.000 $ Kopfgeld', stat: 'bounty', goal: 2000, reward: 700 }
];

function today() {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}
function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h = (Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9) | 0; return ((h >>> 0) % 100000) / 100000; };
}

export class Missions {
  constructor(profile, onDone) {
    this.profile = profile;
    this.onDone = onDone;             // (mission) → void
    this.ensure();
  }

  ensure() {
    const p = this.profile, day = today();
    if (!p.daily || p.daily.date !== day || !Array.isArray(p.daily.ids)) {
      const r = seeded(day), pool = POOL.slice(), ids = [];
      while (ids.length < 3) ids.push(pool.splice(Math.floor(r() * pool.length), 1)[0].id);
      p.daily = { date: day, ids, prog: {}, done: [] };
    }
    return p.daily;
  }

  list() {
    const d = this.ensure();
    return d.ids.map(id => POOL.find(m => m.id === id)).filter(Boolean).map(m => ({ ...m, prog: Math.min(m.goal, d.prog[m.stat] || 0), done: d.done.includes(m.id) }));
  }

  // Zähler erhöhen (add) bzw. Höchstwert setzen (max)
  add(stat, n) { this.bump(stat, v => v + n); }
  max(stat, v) { this.bump(stat, old => Math.max(old, v)); }
  bump(stat, fn) {
    const d = this.ensure();
    const relevant = d.ids.some(id => { const m = POOL.find(x => x.id === id); return m && m.stat === stat && !d.done.includes(id); });
    if (!relevant) return;
    d.prog[stat] = fn(d.prog[stat] || 0);
    for (const id of d.ids) {
      const m = POOL.find(x => x.id === id);
      if (m && m.stat === stat && !d.done.includes(id) && d.prog[stat] >= m.goal) {
        d.done.push(id);
        this.onDone(m);
      }
    }
  }
}
