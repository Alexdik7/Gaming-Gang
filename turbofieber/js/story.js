// Turbofieber – Hauptstory (4 Kapitel mit Crews und Bossrennen) und Nebenquests von Leuten in der Stadt.
// Story-Rennen nutzen die Renn-Technik aus races.js mit eigenen Rivalen.
import { roadCenter as rc } from './world.js';
import { RACES, beacon, label } from './races.js';
import { HW_MID, SUMMIT } from './outskirts.js';

const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString('de-DE');
const fmtT = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');

// Figuren: Farbe für das Porträt
const PEOPLE = {
  Juno: { color: '#ffb51e', role: 'Werkstatt' }, Kaito: { color: '#22e8ff', role: 'Neon Kings' },
  Rhea: { color: '#9a3cff', role: 'Hafenratten' }, Moss: { color: '#2aff8a', role: 'Gipfelstürmer' },
  Phantom: { color: '#e8e8f0', role: '???' }, Pablo: { color: '#ff6a1a', role: 'Kurier' }, Lena: { color: '#ff2a8a', role: 'Notfall' },
  Tariq: { color: '#1f6fe0', role: 'Tüftler' }, Mila: { color: '#ff7ad0', role: 'Influencerin' }, Ozzy: { color: '#c8a020', role: 'Händler' },
  Sami: { color: '#5ec8f2', role: 'Fotograf' }
};

const base = id => RACES.find(r => r.id === id);
const crew = (name, car, paint, skill, perf, cfg) => ({ name, car, paint, skill, perf, cfg });

// Story-Schritte. talk = Dialog am Marker, race = Rennen (win: Sieg nötig, medal: Medaille ≤ n nötig)
const STEPS = [
  { id: 'intro', chapter: 0, goal: 'Lerne Velara kennen', auto: true, talk: [
    ['Juno', 'Da bist du ja! Willkommen in Velara. Ich bin Juno – die Garage mit dem pinken Schild gehört mir.'],
    ['Juno', 'Hier fährt jeder für eine Crew. Die Neon Kings regieren die Innenstadt, die Hafenratten den Hafen, die Gipfelstürmer den Berg.'],
    ['Juno', 'Wenn du dir einen Namen machen willst, schlägst du sie alle. Der violette Marker zeigt dir, wo es weitergeht.'],
    ['Juno', 'Geld bekommst du durch Driften, knappe Manöver, Rennen und Aufträge. Damit tunen wir deinen Wagen. Los geht\'s!']] },
  { id: 'k1', chapter: 1, goal: 'Triff die Neon Kings in der Innenstadt', at: base('zickzack').start, title: 'Neon-Qualifikation',
    talk: [['Kaito', 'Ein Neuer? Bevor du gegen mich fährst, schlägst du meine Jungs. Zickzack durch die Stadt – wer zuerst ankommt.']],
    race: { ...base('zickzack'), id: 'st_k1', name: 'Neon-Qualifikation', rivals: 2, reward: 1200, rivalList: [crew('Vex', 'kestrel', '#22e8ff', 0.8, 0), crew('Dash', 'kestrel', '#1a8aff', 0.78, 0)] },
    win: [['Kaito', 'Nicht schlecht. Aber das waren Anfänger. Wenn du dich traust – Rundkurs, du gegen mich.']],
    lose: [['Kaito', 'Ha! Komm wieder, wenn du fahren gelernt hast.']] },
  { id: 'k2', chapter: 1, goal: 'Boss: Schlage Kaito im Rundkurs', at: base('downtown').start, title: 'Boss: Kaito', boss: true,
    talk: [['Kaito', 'Zwei Runden um mein Revier. Wer gewinnt, regiert die Innenstadt.']],
    race: { ...base('downtown'), id: 'st_k2', name: 'Boss: Kaito', rivals: 1, reward: 3000, rivalList: [crew('Kaito', 'nyx', '#22e8ff', 0.88, 1, { kit: 1, glow: '#22e8ff' })] },
    win: [['Kaito', 'Du … hast mich geschlagen. Die Innenstadt gehört dir. Respekt.'], ['Juno', 'Kaito geschlagen! Die Hafenratten haben davon gehört – Rhea will dich im Hafen sehen.']],
    lose: [['Kaito', 'Die Krone bleibt bei mir. Tune deinen Wagen und versuch es nochmal.']] },
  { id: 'r1', chapter: 2, goal: 'Triff die Hafenratten im Hafen', at: base('drift').start, title: 'Drift-Duell', medal: 2,
    talk: [['Rhea', 'Im Hafen zählt Stil, nicht nur Tempo. Zeig mir einen Drift, der Silber wert ist – 70.000 Punkte in 60 Sekunden.']],
    race: { ...base('drift'), id: 'st_r1', name: 'Drift-Duell', reward: 1500 },
    win: [['Rhea', 'Saubere Linien. Okay, du darfst gegen mich fahren – von der Stadt bis an den Kai.']],
    lose: [['Rhea', 'Das war ein Rutscher, kein Drift. Nochmal.']] },
  { id: 'r2', chapter: 2, goal: 'Boss: Schlage Rhea im Hafen-Sprint', at: base('hafen').start, title: 'Boss: Rhea', boss: true,
    talk: [['Rhea', 'Mein Vandal gegen deine Kiste. Wer zuerst am Kai ist, bekommt den Hafen.']],
    race: { ...base('hafen'), id: 'st_r2', name: 'Boss: Rhea', rivals: 1, reward: 4000, rivalList: [crew('Rhea', 'vandal', '#9a3cff', 0.93, 2, { kit: 2, glow: '#ff2a8a', finish: 'perl' })] },
    win: [['Rhea', 'Verdammt, du bist schnell. Der Hafen gehört dir.'], ['Juno', 'Zwei Crews geschlagen! Moss und die Gipfelstürmer warten oben am Berg. Er testet erst dein Tempo auf dem Highway.']],
    lose: [['Rhea', 'Am Kai gewinnt nur eine. Und das war ich.']] },
  { id: 'm1', chapter: 3, goal: 'Triff die Gipfelstürmer am Highway', at: base('highway').start, title: 'Highway-Test', medal: 2,
    talk: [['Moss', 'Am Berg brauchst du Nerven und Tempo. Fahr eine Highway-Runde mit Silber-Zeit, dann reden wir.']],
    race: { ...base('highway'), id: 'st_m1', name: 'Highway-Test', reward: 1800 },
    win: [['Moss', 'Schnell genug. Treffen am Fuß der Bergstraße – wer zuerst oben ist.']],
    lose: [['Moss', 'Zu langsam. Der Berg würde dich fressen.']] },
  { id: 'm2', chapter: 3, goal: 'Boss: Schlage Moss am Berg', at: base('berg').start, title: 'Boss: Moss', boss: true,
    talk: [['Moss', 'Keine Leitplanke rettet dich, wenn du dich verschätzt. Bis zum Gipfel!']],
    race: { ...base('berg'), id: 'st_m2', name: 'Boss: Moss', rivals: 1, reward: 5000, rivalList: [crew('Moss', 'nyx', '#2aff8a', 0.92, 3, { kit: 2, spoiler: 'big', glow: '#2aff8a' })] },
    win: [['Moss', 'Der Berg gehört dir. Aber pass auf – jemand hat dich beobachtet.'], ['Juno', 'Ich habe eine Nachricht für dich gefunden. Kein Absender, nur ein Wort: PHANTOM. Mitternacht, Highway.']],
    lose: [['Moss', 'Oben steht nur einer. Versuch es mit mehr Grip.']] },
  { id: 'f1', chapter: 4, goal: 'Finale: Triff das Phantom um Mitternacht am Highway', at: base('highway').start, title: 'Finale: Phantom', boss: true, night: true,
    talk: [['Phantom', 'Drei Crews. Drei Kronen. Nicht schlecht für einen Neuen.'], ['Phantom', 'Aber Velara hat nur eine Legende. Eine Runde. Kein Zurück.']],
    race: { ...base('highway'), id: 'st_f1', name: 'Finale: Phantom', type: 'circuit', path: 'ring', laps: 1, rivals: 1, reward: 10000, medals: null,
      rivalList: [crew('Phantom', 'nyx', '#0c0c10', 0.95, 4, { finish: 'chrom', glow: '#a64aff', kit: 2, spoiler: 'big', rimColor: '#0c0c0e', tint: 3 })] },
    win: [['Phantom', '… Du bist es. Die Legende von Velara.'], ['Juno', 'Unglaublich! Ganz Velara spricht von dir. Die Straßen gehören dir – fahr, wohin du willst!']],
    lose: [['Phantom', 'Legenden werden nicht geboren. Sie werden gemacht. Komm wieder.']] },
  { id: 'done', chapter: 5, goal: 'Story geschafft – du bist die Legende von Velara!' }
];

// Nebenquests (einmalig)
const QUESTS = [
  { id: 'kurier', giver: 'Pablo', name: 'Kurierfahrt', at: [rc(2), rc(6)], type: 'deliver', target: [rc(4), -700], time: 75, reward: 900,
    talk: [['Pablo', 'Ein Paket muss sofort zum Hafen, an den Kai. 75 Sekunden – schaffst du das?']], done: [['Pablo', 'Pünktlich! Hier ist dein Anteil.']] },
  { id: 'taxi', giver: 'Lena', name: 'Taxi-Notfall', at: [rc(7), rc(2)], type: 'deliver', target: [SUMMIT.x, SUMMIT.z], time: 95, reward: 1100,
    talk: [['Lena', 'Mein Freund hält oben am Gipfel um meine Hand an – und ich komme zu spät! Bitte, in 95 Sekunden!']], done: [['Lena', 'Geschafft! Er hat noch nicht gefragt. Danke!']] },
  { id: 'blitzer', giver: 'Tariq', name: 'Blitzer-Jagd', at: [HW_MID - 3.5, 260], type: 'speedtrap', min: 200, time: 90,
    traps: [[HW_MID - 3.5, 380], [HW_MID - 10.5, -100], [HW_MID - 3.5, -380]], reward: 1000, dir: Math.PI,
    talk: [['Tariq', 'Ich teste neue Blitzer auf dem Highway. Fahr durch alle drei mit über 200 km/h – Richtung Süden!']], done: [['Tariq', 'Drei Treffer, alle über 200! Die Messdaten sind perfekt.']] },
  { id: 'show', giver: 'Mila', name: 'Drift-Show', at: [rc(6), rc(8)], type: 'drift', points: 40000, time: 45, reward: 900,
    talk: [['Mila', 'Ich streame live! Zeig meinen Followern 40.000 Drift-Punkte in 45 Sekunden.']], done: [['Mila', 'Der Chat dreht durch! Du bist viral.']] },
  { id: 'ablenkung', giver: 'Ozzy', name: 'Ablenkungsmanöver', at: [rc(1), rc(8)], type: 'escape', level: 2, reward: 1200,
    talk: [['Ozzy', 'Ich brauche … sagen wir, etwas Ruhe. Lock die Polizei weg: Fahndung ★★ und dann abhängen.']], done: [['Ozzy', 'Perfekt. Frag nicht, wofür.']] },
  { id: 'nachtfoto', giver: 'Sami', name: 'Nachtfoto', at: [rc(8), rc(1)], type: 'night', target: [SUMMIT.x, SUMMIT.z], reward: 700,
    talk: [['Sami', 'Ich brauche ein Foto vom Gipfel bei Nacht, mit der Stadt im Hintergrund. Fahr nachts rauf!']], done: [['Sami', 'Wunderschön! Das wird mein Titelbild.']] }
];

// Porträt als Bild (Kreis in Crew-Farbe mit Initiale)
const faces = new Map();
function face(name) {
  if (faces.has(name)) return faces.get(name);
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), col = (PEOPLE[name] || { color: '#888' }).color;
  const gr = g.createRadialGradient(64, 50, 10, 64, 64, 64);
  gr.addColorStop(0, col); gr.addColorStop(1, '#0a0c18');
  g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
  g.strokeStyle = col; g.lineWidth = 6; g.shadowColor = col; g.shadowBlur = 14; g.stroke(); g.shadowBlur = 0;
  g.fillStyle = 'rgba(10,12,24,0.75)';                                // Silhouette
  g.beginPath(); g.arc(64, 54, 22, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(64, 112, 40, 28, 0, Math.PI, 0); g.fill();
  g.font = 'italic 900 34px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#fff'; g.fillText(name === 'Phantom' ? '?' : name[0], 64, 56);
  const url = c.toDataURL();
  faces.set(name, url);
  return url;
}

export class Story {
  // ctx: { scene, world, car, profile, races, police, score, audio, save(), popup(t, cls), setNight() }
  constructor(ctx) {
    this.ctx = ctx;
    const p = ctx.profile;
    if (!p.story || typeof p.story !== 'object') p.story = { step: 0 };
    if (!p.quests || typeof p.quests !== 'object') p.quests = {};
    this.talking = false;
    this.lines = []; this.after = null;
    this.quest = null;                 // laufende Nebenquest
    this.armed = new Set();
    // Marker: violett = Story, grün = Nebenquest
    this.storyMarker = beacon('#a64aff', 5, 11);
    this.storyLabel = label('★ Story', '#a64aff');
    this.storyLabel.position.y = 13;
    this.storyMarker.add(this.storyLabel);
    ctx.scene.add(this.storyMarker);
    this.questMarkers = QUESTS.map(q => {
      const m = beacon('#2aff8a', 4, 8);
      const l = label('! ' + q.name, '#2aff8a'); l.position.y = 10; m.add(l);
      m.position.set(q.at[0], ctx.world.heightAt(q.at[0], q.at[1]), q.at[1]);
      ctx.scene.add(m);
      return m;
    });
    this.target = beacon('#2aff8a', 7, 16);
    this.target.visible = false;
    ctx.scene.add(this.target);
    $('dialog').addEventListener('click', () => this.next());
    this.placeStoryMarker();
  }

  get step() { return STEPS[Math.min(this.ctx.profile.story.step, STEPS.length - 1)]; }
  get busy() { return this.talking || !!this.quest; }
  goal() { const s = this.step; return (s.chapter ? `Kapitel ${Math.min(s.chapter, 4)}: ` : '') + s.goal; }

  placeStoryMarker() {
    const s = this.step;
    this.storyMarker.visible = !!s.at;
    if (s.at) this.storyMarker.position.set(s.at[0], this.ctx.world.heightAt(s.at[0], s.at[1]), s.at[1]);
    this.storyLabel.material.map.dispose();
    const fresh = label('★ ' + (s.title || 'Story'), '#a64aff');
    this.storyLabel.material.map = fresh.material.map;
    this.storyLabel.material.needsUpdate = true;
    $('storyGoal').textContent = '★ ' + this.goal();
  }

  /* ---------- Dialoge ---------- */
  say(lines, after) {
    this.lines = lines.slice();
    this.after = after || null;
    this.talking = true;
    $('dialog').classList.add('show');
    this.next();
  }
  next() {
    if (!this.talking) return;
    const l = this.lines.shift();
    if (!l) {
      this.talking = false;
      $('dialog').classList.remove('show');
      const fn = this.after; this.after = null;
      if (fn) fn();
      return;
    }
    const [who, text] = l, p = PEOPLE[who] || {};
    $('dlgFace').src = face(who);
    $('dlgName').textContent = who + (p.role ? ' · ' + p.role : '');
    $('dlgName').style.color = p.color || '#fff';
    $('dlgText').textContent = text;
    this.ctx.audio.ui('tick');
  }

  /* ---------- Story-Fortschritt ---------- */
  advance() {
    this.ctx.profile.story.step++;
    this.ctx.save();
    this.placeStoryMarker();
  }
  // Beim ersten Losfahren: Einführung
  onDriveStart() {
    const s = this.step;
    if (s.auto && !this.talking) this.say(s.talk, () => this.advance());
  }
  startStoryRace() {
    const s = this.step;
    if (s.night) this.ctx.setNight();
    this.ctx.races.start(s.race);
  }
  // Ergebnis eines Rennens (aus main → races.onFinish)
  raceFinished(res) {
    const s = this.step;
    if (!s.race || res.race.id !== s.race.id) return;
    const ok = s.medal ? res.medal >= 1 && res.medal <= s.medal : res.win;
    this.pending = { ok, s };          // Dialog erst, wenn das Ergebnisfenster geschlossen ist
  }
  showPending() {
    const { ok, s } = this.pending;
    this.pending = null;
    if (ok) this.say(s.win, () => { this.advance(); if (this.step.id === 'done') this.ctx.popup('🏆 LEGENDE VON VELARA', 'yellow'); });
    else this.say(s.lose);
  }

  /* ---------- Nebenquests ---------- */
  startQuest(q) {
    const c = this.ctx;
    this.quest = { q, t: 0, i: 0, pts: 0, maxLevel: 0 };
    if (q.type === 'deliver' || q.type === 'night') this.showTarget(q.target);
    if (q.type === 'speedtrap') this.showTarget(q.traps[0]);
    document.body.classList.add('racing');
    $('raceHud').classList.add('show');
    c.audio.ui('buy');
  }
  showTarget(p) {
    this.target.visible = true;
    this.target.position.set(p[0], this.ctx.world.heightAt(p[0], p[1]), p[1]);
  }
  endQuest(ok) {
    const { q } = this.quest, c = this.ctx;
    this.quest = null;
    this.target.visible = false;
    document.body.classList.remove('racing');
    $('raceHud').classList.remove('show');
    if (ok) {
      c.profile.quests[q.id] = true;
      c.profile.cash += q.reward;
      c.save();
      c.popup('AUFTRAG ✔ +$' + fmt(q.reward), 'green');
      this.questMarkers[QUESTS.indexOf(q)].visible = false;
      this.say(q.done);
    } else {
      c.popup('Auftrag gescheitert', 'red');
      c.audio.ui('no');
    }
  }
  abortQuest() { if (this.quest) this.endQuest(false); }
  addDrift(points) { if (this.quest && this.quest.q.type === 'drift') this.quest.pts += points; }
  escaped() { if (this.quest && this.quest.q.type === 'escape' && this.quest.maxLevel >= this.quest.q.level) this.endQuest(true); }

  questUpdate(dt) {
    const Q = this.quest, q = Q.q, c = this.ctx, car = c.car;
    Q.t += dt;
    const left = q.time ? q.time - Q.t : 0;
    let main = q.name, sub = '';
    if (q.type === 'deliver' || q.type === 'night') {
      const d = Math.hypot(q.target[0] - car.pos.x, q.target[1] - car.pos.z);
      main += q.time ? ' · ' + fmtT(Math.max(0, left)) : '';
      sub = (q.type === 'night' && c.world.night < 0.5 ? 'Warte auf die Nacht · ' : '') + Math.round(d) + ' m bis zum Ziel';
      if (d < 13 && (q.type !== 'night' || c.world.night > 0.5)) return this.endQuest(true);
    } else if (q.type === 'speedtrap') {
      const [x, z] = q.traps[Q.i], d = Math.hypot(x - car.pos.x, z - car.pos.z), kmh = car.speed * 3.6;
      main += ` · ${fmtT(Math.max(0, left))} · Blitzer ${Q.i + 1}/3`;
      sub = `${Math.round(d)} m · mindestens ${q.min} km/h`;
      if (d < 14 && !Q.inTrap) {
        Q.inTrap = true;
        if (kmh >= q.min) { c.popup(`📸 ${Math.round(kmh)} km/h!`, 'cyan'); c.audio.ui('buy'); Q.i++; if (Q.i >= q.traps.length) return this.endQuest(true); this.showTarget(q.traps[Q.i]); }
        else c.popup(`Zu langsam (${Math.round(kmh)} km/h)`, 'red');
      }
      if (d > 20) Q.inTrap = false;
    } else if (q.type === 'drift') {
      const live = Q.pts + c.score.points * c.score.mult;
      main += ` · ${Math.ceil(Math.max(0, left))} s`;
      sub = `${fmt(live)} / ${fmt(q.points)} Punkte`;
      if (live >= q.points) { c.score.bank(); return this.endQuest(true); }
    } else if (q.type === 'escape') {
      Q.maxLevel = Math.max(Q.maxLevel, c.police.level);
      main += ' · Fahndung ' + '★'.repeat(c.police.level) + '☆'.repeat(Math.max(0, q.level - c.police.level));
      sub = Q.maxLevel >= q.level ? 'Jetzt abhängen!' : 'Fahr wie ein Verrückter, bis die Polizei kommt';
      if (!c.police.enabled) sub = 'Polizei ist im Pausemenü ausgeschaltet';
    }
    if (q.time && left <= 0) return this.endQuest(false);
    $('rhMain').textContent = main;
    $('rhSub').textContent = sub;
  }

  /* ---------- pro Frame ---------- */
  update(dt) {
    const c = this.ctx, car = c.car;
    // Leuchtsäulen in der Nähe ausblenden (sonst färben sie das ganze Bild)
    const fade = m => { m.userData.mat.opacity = 0.55 * Math.max(0.06, Math.min(1, (Math.hypot(m.position.x - car.pos.x, m.position.z - car.pos.z) - 4) / 18)); };
    fade(this.storyMarker); fade(this.target); this.questMarkers.forEach(fade);
    if (this.quest) { this.questUpdate(dt); return; }
    if (this.talking) return;
    if (this.pending && c.races.state === 'idle') { this.showPending(); return; }
    const free = !c.races.race && !c.police.wanted && car.speed < 8;
    const near = (at, id, r) => {
      const d = Math.hypot(car.pos.x - at[0], car.pos.z - at[1]);
      if (d > 14) this.armed.add(id);
      return d < r && this.armed.has(id);
    };
    const s = this.step;
    this.storyMarker.visible = !!s.at && !c.races.race;
    if (s.at && free && near(s.at, 'story', 6)) {
      this.armed.delete('story');
      this.say(s.talk, () => this.startStoryRace());
      return;
    }
    QUESTS.forEach((q, i) => {
      const m = this.questMarkers[i];
      m.visible = !c.profile.quests[q.id] && !c.races.race;
      if (m.visible && free && near(q.at, q.id, 5.5)) {
        this.armed.delete(q.id);
        this.say(q.talk, () => this.startQuest(q));
      }
    });
  }

  // für Minikarte und Titel
  mapMarks() {
    const out = [];
    if (this.step.at) out.push({ x: this.step.at[0], z: this.step.at[1], c: '#a64aff', r: 7 });
    QUESTS.forEach(q => { if (!this.ctx.profile.quests[q.id]) out.push({ x: q.at[0], z: q.at[1], c: '#2aff8a', r: 5 }); });
    if (this.target.visible) out.push({ x: this.target.position.x, z: this.target.position.z, c: '#ffe14a', r: 6 });
    return out;
  }
  summary() {
    const done = Object.keys(this.ctx.profile.quests).length;
    return `${this.goal()} · Aufträge ${done}/${QUESTS.length}`;
  }
}
