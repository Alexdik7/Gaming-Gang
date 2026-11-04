// Doppel- und Koop-Gegner. Wird vom Client (Einzelspieler-Doppelkampf) und vom Server (Koop zu zweit) genutzt.
import { createMon, maxHp } from './mon.js';

export const COOP = {
  zwillinge: {
    name: 'Zwillinge Ria & Rio', owners: ['Ria', 'Rio'], solo: true, bg: 'gras', reward: 1200,
    looks: [
      { skin: '#f6d2b8', hair: '#f6b73c', outfit: '#e84a5f', pants: '#2b2d42', accent: '#ffffff' },
      { skin: '#f6d2b8', hair: '#f6b73c', outfit: '#3d8bfd', pants: '#2b2d42', accent: '#ffffff' },
    ],
    teams: [[['hoppel', 10], ['funkenhase', 11]], [['zirpfink', 10], ['glibbo', 11]]],
    intro: ['Ria: Wir kämpfen nur im Doppel!', 'Rio: Zwei gegen zwei – bring zwei Kreaturen mit. Oder einen Freund!'],
    lose: 'Ria & Rio: Ihr seid ein echtes Team!',
  },
  koloss: {
    name: 'Felsenkoloss', owners: ['Felsenkoloss'], solo: false, bg: 'hoehle', reward: 1500, item: ['sternkristall', 2],
    boss: { sp: 'brockolith', lvl: 16, hp: 2, acts: 2 },
    intro: ['Der Boden bebt… Ein uralter Felsenkoloss versperrt den Gang!', 'Er ist viel zu stark für einen allein. Kommt zu zweit wieder!'],
    lose: 'Der Felsenkoloss zerfällt zu Geröll – und gibt den Gang frei.',
  },
};

// Gegnerplätze für DoubleBattle
export function foeSlots(id, rnd = Math.random) {
  const d = COOP[id];
  if (d.boss) {
    const m = createMon(d.boss.sp, d.boss.lvl, rnd, { boss: d.boss.hp });
    m.hp = maxHp(m);
    return { f0: { pool: [m], owner: d.owners[0], ai: true, acts: d.boss.acts } };
  }
  return Object.fromEntries(d.teams.map((t, k) => ['f' + k, { pool: t.map(([sp, l]) => createMon(sp, l, rnd)), owner: d.owners[k], ai: true }]));
}
