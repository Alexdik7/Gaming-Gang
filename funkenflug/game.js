/*
 * Funkenflug – Arcade-Flugspiel.
 * Pip, ein kleines Leuchtwesen, fliegt durch Lücken zwischen schwebenden Kristallsäulen.
 *
 * Aufbau (alles in einer IIFE, damit keine globalen Variablen entstehen):
 *   1. Konstanten & Hilfsfunktionen
 *   2. Speicher & Spielstand (Rekord, Splitter, Figuren, Tagesmissionen)
 *   3. DOM & Ansicht (Canvas-Skalierung)
 *   4. Sound (Web Audio, alles synthetisch)
 *   5. Partikel (fester Pool, keine Speicherlecks)
 *   6. Spielzustand & Logik (Combo, Power-Ups, Welten, Missionen)
 *   7. Zeichnen
 *   8. Menüs (Figuren, Missionen, Toasts)
 *   9. Eingabe
 *  10. Game Loop
 * Inhalte (Welten, Figuren, Missionen, Power-Ups) stehen in data.js.
 */
(() => {
  'use strict';

  /* ================= 1. Konstanten & Hilfsfunktionen ================= */
  const { DIFFS, WORLDS, RARITY, SKINS, HATS, MISSIONS, POWERS, BONUS } = window.FUNKENFLUG_DATA;
  const H = 640;                 // logische Welthöhe – alles wird darauf skaliert
  const MIN_W = 320;             // schmaler als das wird nicht gezeigt (dann mehr Himmel oben)
  const GROUND_H = 84;
  const GROUND_Y = H - GROUND_H; // Oberkante des Bodens
  const MAX_FALL = 720;          // maximale Fallgeschwindigkeit
  const BIRD_R = 12;             // Kollisionsradius (etwas kleiner als die Figur = fair)
  const PILLAR_W = 72;
  const CAP_H = 26;              // Höhe des Kristallkopfs an der Lücke
  const SPACING = 250;           // Abstand zwischen zwei Säulenpaaren
  const MAX_STEP = 1 / 120;      // größter Physik-Teilschritt
  const WORLD_EVERY = 25;        // Punkte pro Welt
  const SLOW_FACTOR = 0.6;
  const MAGNET_R = 170;
  const KEY_SAVE = 'funkenflug.save';
  const KEY_OLD_BEST = 'funkenflug.best';   // Rekord aus v1.0 wird übernommen
  const KEY_MUTE = 'funkenflug.mute';
  const RANKS = [[0, 'Funke'], [10, 'Glühwürmchen'], [25, 'Sternschnuppe'], [50, 'Komet'], [100, 'Polarlicht']];
  const POWER_KINDS = Object.keys(POWERS);
  const POWER_COOLDOWN = 6;      // mindestens so viele Säulen zwischen zwei Power-Ups
  const TAU = Math.PI * 2;
  const INK = '#2b1d55';

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const hash = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const smooth = t => t * t * (3 - 2 * t);

  // Farben mischen (für weiche Weltübergänge); Hex-Werte werden einmal zerlegt
  const rgbCache = new Map();
  function rgb(hex) {
    let c = rgbCache.get(hex);
    if (!c) { c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); rgbCache.set(hex, c); }
    return c;
  }
  function mix(a, b, t, alpha = 1) {
    const A = rgb(a), B = rgb(b);
    return `rgba(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))},${alpha})`;
  }

  // Zufall mit festem Startwert (gleiche Tagesmissionen für den ganzen Tag)
  function mulberry(a) {
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function strSeed(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* ================= 2. Speicher & Spielstand ================= */
  // localStorage kann im privaten Modus oder bei file:// fehlen → nie abstürzen
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, String(value)); } catch (e) { /* ignorieren */ }
    }
  };

  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  const missionDef = id => MISSIONS.find(m => m.id === id);

  function pickMissions(date) {
    const r = mulberry(strSeed(date));
    const pool = MISSIONS.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const out = [], used = new Set();
    for (const m of pool) {
      if (used.has(m.stat)) continue;      // drei verschiedene Aufgabenarten
      used.add(m.stat); out.push(m);
      if (out.length === 3) break;
    }
    return out;
  }
  function newDay() {
    const date = today();
    return { date, best: 0, stats: { shards: 0, perfect: 0, powers: 0, runs: 0, bonus: 0 }, missions: pickMissions(date).map(m => ({ id: m.id, prog: 0, done: false })) };
  }

  function loadSave() {
    let s = null;
    try { s = JSON.parse(store.get(KEY_SAVE, 'null')); } catch (e) { s = null; }
    if (!s || typeof s !== 'object') s = {};
    const oldBest = parseInt(store.get(KEY_OLD_BEST, '0'), 10) || 0;
    const out = {
      best: Math.max(0, Number(s.best) || 0, oldBest),
      shards: Math.max(0, Number(s.shards) || 0),
      skin: typeof s.skin === 'string' ? s.skin : 'pip',
      owned: Array.isArray(s.owned) ? s.owned.filter(id => SKINS.some(k => k.id === id)) : [],
      day: s.day && typeof s.day === 'object' ? s.day : null,
      bests: Object.assign({ easy: 0, normal: 0, hard: 0, hardcore: 0 }, s.bests && typeof s.bests === 'object' ? s.bests : {}),
      diff: typeof s.diff === 'string' ? s.diff : 'normal',
      hats: Array.isArray(s.hats) ? s.hats.filter(id => HATS.some(h => h.id === id)) : [],
      hat: typeof s.hat === 'string' ? s.hat : null,
      shopSeen: typeof s.shopSeen === 'string' ? s.shopSeen : ''
    };
    if (!out.owned.includes('pip')) out.owned.unshift('pip');
    if (!out.owned.includes(out.skin)) out.skin = 'pip';
    if (!s.bests) out.bests.normal = Math.max(out.bests.normal, out.best);   // Rekord aus v1.x
    if (!DIFFS.some(d => d.id === out.diff)) out.diff = 'normal';
    if (out.hat && !out.hats.includes(out.hat)) out.hat = null;
    return out;
  }
  const save = loadSave();
  function persist() { store.set(KEY_SAVE, JSON.stringify(save)); }

  // Neuer Tag oder kaputte Daten → frische Missionen
  function ensureDay() {
    const d = save.day;
    const valid = d && d.date === today() && d.stats && Array.isArray(d.missions) &&
      d.missions.length === 3 && d.missions.every(m => missionDef(m.id));
    if (!valid) { save.day = newDay(); persist(); }
    return save.day;
  }
  ensureDay();
  let skin = SKINS.find(k => k.id === save.skin) || SKINS[0];
  let hat = save.hat;
  let diff = DIFFS.find(d => d.id === save.diff) || DIFFS[1];
  // Tageszähler robust erhöhen (ältere Spielstände kennen manche Felder noch nicht)
  function addDay(stat, n) { const st = ensureDay().stats; st[stat] = (st[stat] || 0) + n; }

  /* ================= 3. DOM & Ansicht ================= */
  const $ = id => document.getElementById(id);
  const stage = $('stage');
  const canvas = $('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const ui = {
    score: $('score'), combo: $('combo'), runShards: $('runShards'), powers: $('powers'), toast: $('toast'),
    wallet: $('walletAmount'), diffSeg: $('diffSeg'), diffInfo: $('diffInfo'), titleBest: $('titleBest'), titleToday: $('titleToday'),
    missionBadge: $('missionBadge'), shopBadge: $('shopBadge'),
    overDiff: $('overDiff'), overScore: $('overScore'), overBest: $('overBest'), overToday: $('overToday'),
    newBest: $('newBest'), overRewards: $('overRewards'), overMissions: $('overMissions'),
    shopShards: $('shopShards'), shopTimer: $('shopTimer'), shopSkins: $('shopSkins'), shopHats: $('shopHats'),
    wardPreview: $('wardPreview'), wardName: $('wardName'), wardGrid: $('wardGrid'),
    missionList: $('missionList'), missionToday: $('missionToday'),
    btnMute: $('btnMute'), btnPause: $('btnPause'),
    screens: { title: $('titleScreen'), pause: $('pauseScreen'), over: $('overScreen'), shop: $('shopScreen'), wardrobe: $('wardScreen'), missions: $('missionScreen') }
  };

  // W = sichtbare Weltbreite, oy = zusätzlicher Himmel oben bei sehr schmalen Bildschirmen
  const view = { W: 400, scale: 1, dpr: 1, oy: 0 };
  const cache = { stars: document.createElement('canvas'), grounds: [] };

  function resize() {
    const r = stage.getBoundingClientRect();
    const cssW = Math.max(1, r.width), cssH = Math.max(1, r.height);
    view.dpr = Math.min(window.devicePixelRatio || 1, 2); // 3x auf dem iPhone kostet nur Akku
    view.scale = cssH / H;
    view.W = cssW / view.scale;
    view.oy = 0;
    if (view.W < MIN_W) {           // Hochformat sehr schmal: nach Breite skalieren
      view.scale = cssW / MIN_W;
      view.W = MIN_W;
      view.oy = cssH / view.scale - H;
    }
    canvas.width = Math.max(1, Math.round(cssW * view.dpr));
    canvas.height = Math.max(1, Math.round(cssH * view.dpr));
    buildStars();
    cache.grounds = WORLDS.map(buildGround);
    if (game.state !== 'play' && game.state !== 'dying' && game.state !== 'paused') game.bird.x = birdX();
  }
  const birdX = () => clamp(view.W * 0.28, 80, 300);

  /* ================= 4. Sound ================= */
  const sfx = (() => {
    let ac = null, master = null, noiseBuf = null;
    let muted = store.get(KEY_MUTE, '0') === '1';

    // AudioContext erst bei einer Nutzergeste erzeugen (Pflicht auf iOS)
    function ensure() {
      if (muted) return false;
      if (ac) { if (ac.state === 'suspended') ac.resume(); return true; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try {
        ac = new AC();
        master = ac.createGain();
        master.gain.value = 0.5;
        master.connect(ac.destination);
        noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { ac = null; return false; }
      return true;
    }
    function tone(type, f0, f1, dur, vol, delay = 0) {
      const t = ac.currentTime + delay;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.03);
    }
    function noise(dur, vol, freq, delay = 0) {
      const t = ac.currentTime + delay;
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noiseBuf;
      f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.9;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(master);
      s.start(t); s.stop(t + dur + 0.03);
    }
    const arp = (notes, type, gap, dur, vol) => notes.forEach((f, i) => tone(type, f, f, dur, vol, i * gap));
    return {
      unlock: ensure,
      get muted() { return muted; },
      setMuted(m) {
        muted = m;
        store.set(KEY_MUTE, m ? '1' : '0');
        if (master) master.gain.setTargetAtTime(m ? 0 : 0.5, ac.currentTime, 0.02);
        if (!m) ensure();
      },
      flap() { if (!ensure()) return; tone('sine', 420, 860, 0.13, 0.22); noise(0.07, 0.08, 3200); },
      point() { if (!ensure()) return; tone('triangle', 1046, 1046, 0.12, 0.2); tone('triangle', 1568, 1568, 0.2, 0.18, 0.07); },
      perfect(combo) {      // steigt mit der Combo um je einen Ganzton
        if (!ensure()) return;
        const f = 880 * Math.pow(2, Math.min(combo, 8) * 2 / 12);
        tone('triangle', f, f, 0.1, 0.2); tone('sine', f * 1.5, f * 1.5, 0.22, 0.18, 0.06); tone('sine', f * 2, f * 2, 0.25, 0.1, 0.12);
      },
      shard() { if (!ensure()) return; tone('sine', 1800, 2400, 0.08, 0.12); },
      power() { if (!ensure()) return; tone('sawtooth', 300, 1200, 0.25, 0.1); arp([660, 880, 1320], 'triangle', 0.05, 0.15, 0.14); },
      shatter() { if (!ensure()) return; noise(0.3, 0.4, 2600); arp([1568, 1175, 784], 'triangle', 0.04, 0.12, 0.14); },
      milestone() { if (!ensure()) return; arp([784, 988, 1175, 1568], 'triangle', 0.06, 0.16, 0.16); },
      world() { if (!ensure()) return; arp([523, 659, 784, 1046, 784, 1046, 1318], 'sine', 0.09, 0.3, 0.14); },
      hit() { if (!ensure()) return; noise(0.35, 0.45, 600); tone('square', 240, 50, 0.38, 0.12); },
      thud() { if (!ensure()) return; noise(0.18, 0.3, 180); },
      best() { if (!ensure()) return; arp([523, 659, 784, 1046, 1318], 'sine', 0.08, 0.22, 0.18); }
    };
  })();

  /* ================= 5. Partikel ================= */
  // Fester Pool: es werden nie neue Objekte erzeugt → keine Müllsammlung während des Spiels
  const particles = Array.from({ length: 260 }, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: '#fff', kind: 0, g: 0, text: '' }));
  const P_DOT = 0, P_RING = 1, P_TEXT = 2;

  function emit(x, y, o) {
    for (const p of particles) {
      if (p.on) continue;
      p.on = true; p.x = x; p.y = y;
      p.vx = o.vx || 0; p.vy = o.vy || 0;
      p.life = p.max = o.life || 0.6;
      p.size = o.size || 3; p.color = o.color || '#fff';
      p.kind = o.kind || P_DOT; p.g = o.g || 0; p.text = o.text || '';
      return;
    }
  }
  function burst(x, y, n, colors, speed, life, g = 0) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = rand(speed * 0.3, speed);
      emit(x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(life * 0.6, life), size: rand(2, 4.5), color: colors[i % colors.length], g });
    }
  }
  function updateParticles(dt) {
    for (const p of particles) {
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) { p.on = false; continue; }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }
  function clearParticles() { for (const p of particles) p.on = false; }

  /* ================= 6. Spielzustand & Logik ================= */
  const game = {
    state: 'title',   // title | menu | play | paused | dying | over
    time: 0,          // Animationsuhr (läuft immer, außer in der Pause)
    t: 0,             // Spielzeit der aktuellen Runde
    score: 0,
    passed: 0,        // durchflogene Säulenpaare (steuert die Schwierigkeit)
    combo: 0,
    speed: 0,
    scroll: 0,        // zurückgelegte Strecke (für Parallaxe und Boden)
    pillars: [],
    items: [],        // Splitter und Power-Ups
    bird: { x: 100, y: H * 0.45, vy: 0, rot: 0, wing: 0, flapT: 0 },
    shield: false, slowT: 0, magnetT: 0, invT: 0,
    bonusT: 0, bonusSpawn: 0, bonusPhase: 0, sincePower: 0, sinceBonus: 0,
    world: 0, worldFrom: 0, worldT: 1,
    run: null,        // Statistik der Runde (für Missionen)
    shake: 0, flash: 0,
    deadT: 0, landed: false, overAt: 0, newBest: false
  };
  const newRun = () => ({ score: 0, combo: 0, perfect: 0, shards: 0, powers: 0, bonus: 0, hardScore: 0 });
  game.run = newRun();

  function setState(s) {
    game.state = s;
    stage.dataset.state = s;
    ui.btnPause.textContent = s === 'paused' ? '▶' : '❚❚';
  }
  function showScreen(name) {
    for (const key in ui.screens) ui.screens[key].classList.toggle('show', key === name);
  }

  // 0 = Anfang, 1 = maximale Schwierigkeit. Steigt mit durchflogenen Säulen UND Zeit.
  const difficulty = () => Math.min(1, game.passed * 0.035 + game.t * 0.0035);

  function reset() {
    game.pillars.length = 0;
    game.items.length = 0;
    game.score = 0; game.passed = 0; game.combo = 0; game.t = 0;
    game.speed = diff.speed[0];
    game.shield = false; game.slowT = 0; game.magnetT = 0; game.invT = 0;
    game.bonusT = 0; game.bonusSpawn = 0; game.bonusPhase = 0; game.sincePower = 0; game.sinceBonus = 0;
    game.world = 0; game.worldFrom = 0; game.worldT = 1;
    game.shake = 0; game.flash = 0;
    game.deadT = 0; game.landed = false; game.newBest = false;
    game.run = newRun();
    const b = game.bird;
    b.x = birdX(); b.y = H * 0.45; b.vy = 0; b.rot = 0; b.flapT = 0;
    clearParticles();
    ui.score.textContent = '0';
    ui.combo.textContent = '';
    hudShards();
    hudPowers();
  }

  function spawnPillar(x) {
    const d = difficulty();
    const gap = lerp(diff.gap[0], diff.gap[1], d) + rand(-12, 12);       // Lücke wird kleiner, schwankt leicht
    const margin = 58;
    const minC = margin + gap / 2, maxC = GROUND_Y - margin - gap / 2;
    const prev = game.pillars[game.pillars.length - 1];
    const prevY = prev ? prev.gapY : (minC + maxC) / 2;
    const maxShift = lerp(diff.shift[0], diff.shift[1], d);                  // Höhenwechsel werden größer
    const gapY = clamp(prevY + rand(-maxShift, maxShift), minC, maxC);
    game.pillars.push({ x, gapY, gap, w: game.world, pal: Math.floor(Math.random() * 3), seed: Math.random() * 10, scored: false, broken: false, dev: 0 });
    spawnItems(x, gapY, prev);
  }

  // Splitter in der Lückenmitte (belohnt Perfekt-Flüge), Bögen, seltene Power-Ups und Bonus-Portale zwischen den Säulen
  function spawnItems(x, gapY, prev) {
    const items = game.items, seed = () => Math.random() * 10;
    if (Math.random() < 0.7) items.push({ kind: 'shard', x: x + PILLAR_W / 2, y: gapY, seed: seed() });
    if (!prev) return;
    game.sincePower++;
    game.sinceBonus++;
    const mx = x - SPACING / 2 + PILLAR_W / 2, my = (prev.gapY + gapY) / 2;
    const powerBusy = game.shield || game.slowT > 0 || game.magnetT > 0 || items.some(i => i.kind in POWERS);
    if (game.passed >= BONUS.minPassed && game.sinceBonus >= BONUS.cooldown && Math.random() < BONUS.chance) {
      game.sinceBonus = 0;
      items.push({ kind: 'portal', x: mx, y: my, seed: seed() });
    } else if (game.passed >= 3 && game.sincePower >= POWER_COOLDOWN && !powerBusy && Math.random() < diff.power) {
      game.sincePower = 0;
      items.push({ kind: POWER_KINDS[Math.floor(Math.random() * POWER_KINDS.length)], x: mx, y: my, seed: seed() });
    } else if (Math.random() < 0.35) {
      for (let i = -1; i <= 1; i++) items.push({ kind: 'shard', x: mx + i * 34, y: my - (1 - i * i) * 16, seed: seed() });
    }
  }

  // Bonus-Level: Säulen vor Pip zerspringen, dann fliegen Splitter-Wellen mit dreifachem Wert heran
  function startBonus() {
    const b = game.bird;
    game.bonusT = BONUS.dur;
    game.bonusSpawn = 80;
    game.bonusPhase = 0;
    game.run.bonus++;
    addDay('bonus', 1);
    for (const p of game.pillars) {
      if (p.broken || p.x < b.x - 10) continue;
      p.broken = true; p.scored = true;
      const pal = WORLDS[p.w].pillars[p.pal];
      burst(p.x + PILLAR_W / 2, p.gapY, 14, [pal[0], pal[1], '#ffe28a'], 320, 0.8, 400);
    }
    for (const it of game.items) if (it.x > b.x + 10) it.gone = true;
    game.flash = 0.5;
    sfx.world();
    toast(`BONUS-LEVEL · Splitter ×${BONUS.mult}`, true);
  }
  function updateBonus(dx) {
    game.bonusSpawn -= dx;
    while (game.bonusSpawn <= 0) {
      game.bonusSpawn += 30;
      game.bonusPhase += 0.3;
      const y = GROUND_Y * 0.45 + Math.sin(game.bonusPhase) * 140;
      game.items.push({ kind: 'shard', x: view.W + 30, y, seed: game.bonusPhase });
    }
  }

  function startGame() {
    sfx.unlock();
    reset();
    addDay('runs', 1);
    setState('play');
    showScreen(null);
    // Erste Säule mit etwas Vorlauf, damit man sich orientieren kann
    spawnPillar(Math.max(view.W + 40, game.bird.x + 380));
    flap();
    checkMissions();
  }

  function flap() {
    if (game.state !== 'play') return;
    const b = game.bird;
    b.vy = diff.flap;
    b.flapT = 1;
    sfx.flap();
    for (let i = 0; i < 4; i++) {
      emit(b.x - 14, b.y + 6, { vx: rand(-160, -60), vy: rand(20, 120), life: rand(0.3, 0.5), size: rand(2, 3.5), color: i % 2 ? '#ffd27a' : skin.core });
    }
  }

  function bumpScore() {
    ui.score.textContent = String(game.score);
    ui.score.classList.remove('bump');
    void ui.score.offsetWidth;          // Reflow erzwingen, damit die Animation neu startet
    ui.score.classList.add('bump');
  }

  // Säulenpaar geschafft: Punkte, Combo, Effekte, Weltwechsel, Missionen
  function passPillar(p) {
    game.passed++;
    const perfect = p.dev <= p.gap * diff.perfect;
    let pts = 1;
    if (perfect) {
      game.combo++;
      pts += Math.min(game.combo, 3);           // Bonus: +1, +2, ab ×3 immer +3
      game.run.perfect++;
      addDay('perfect', 1);
      game.run.combo = Math.max(game.run.combo, game.combo);
    } else {
      game.combo = 0;
    }
    const before = game.score;
    game.score += pts;
    game.run.score = game.score;
    if (diff.mult >= 2) game.run.hardScore = game.score;
    bumpScore();
    ui.combo.textContent = game.combo >= 2 ? `Combo ×${game.combo}` : '';

    const b = game.bird;
    emit(b.x, b.y, { kind: P_RING, life: 0.45, size: 14, color: perfect ? '#ffd27a' : '#5ef2d6' });
    const label = perfect ? (game.combo > 1 ? `PERFEKT ×${game.combo}` : 'PERFEKT!') : '+1';
    emit(b.x + 6, b.y - 24, { kind: P_TEXT, vy: -60, life: 0.8, text: label, color: perfect ? '#ffd27a' : '#fff7e8' });
    burst(p.x + PILLAR_W / 2, p.gapY, perfect ? 14 : 8, ['#5ef2d6', '#ffd27a', '#ffffff'], perfect ? 200 : 140, 0.5);

    if (Math.floor(before / 10) !== Math.floor(game.score / 10)) { sfx.milestone(); game.flash = 0.25; }
    else if (perfect) sfx.perfect(game.combo);
    else sfx.point();
    worldCheck();
    checkMissions();
  }

  function worldCheck() {
    const w = Math.floor(game.score / WORLD_EVERY) % WORLDS.length;
    if (w === game.world) return;
    game.worldFrom = game.world;
    game.world = w;
    game.worldT = 0;
    sfx.world();
    toast(`Welt ${w + 1} · ${WORLDS[w].name}`, true);
  }

  function collect(it) {
    const b = game.bird;
    if (it.kind === 'shard') {
      const v = diff.mult * (game.bonusT > 0 ? BONUS.mult : 1);   // Schwierigkeit und Bonus-Level vervielfachen
      game.run.shards += v; save.shards += v;
      addDay('shards', v);
      sfx.shard();
      burst(it.x, it.y, 5, ['#ffd27a', '#ffffff'], 110, 0.35);
      if (v > 1) emit(it.x, it.y - 14, { kind: P_TEXT, vy: -70, life: 0.5, text: '+' + v, color: '#ffd27a' });
      hudShards();
    } else if (it.kind === 'portal') {
      startBonus();
    } else {
      game.run.powers++;
      addDay('powers', 1);
      const pw = POWERS[it.kind];
      if (it.kind === 'shield') game.shield = true;
      else if (it.kind === 'slow') game.slowT = pw.dur;
      else if (it.kind === 'magnet') game.magnetT = pw.dur;
      sfx.power();
      emit(b.x, b.y, { kind: P_RING, life: 0.5, size: 18, color: pw.color });
      emit(b.x, b.y - 30, { kind: P_TEXT, vy: -50, life: 0.9, text: pw.name, color: pw.color });
      hudPowers();
    }
    checkMissions();
  }

  // Schild fängt einen Treffer ab: Säule zerspringt, kurz unverwundbar
  function breakPillar(p) {
    p.broken = true;
    game.shield = false;
    game.invT = 0.8;
    game.shake = 8;
    sfx.shatter();
    const pal = WORLDS[p.w].pillars[p.pal];
    burst(p.x + PILLAR_W / 2, game.bird.y, 30, [pal[0], pal[1], pal[3]], 360, 0.9, 700);
    hudPowers();
  }

  function die(cause) {
    if (game.state !== 'play') return;
    setState('dying');
    game.deadT = 0;
    game.shake = 12;
    game.flash = 0.9;
    game.slowT = 0; game.magnetT = 0; game.bonusT = 0;
    const b = game.bird;
    game.landed = cause === 'ground';
    if (!game.landed) b.vy = -260;      // kleiner Abpraller vom Kristall
    sfx.hit();
    burst(b.x, b.y, 26, [skin.lamp, skin.core, skin.body[0], '#ff8ac4'], 320, 0.8, 500);
    ui.combo.textContent = '';
    hudPowers();
    if (navigator.vibrate) navigator.vibrate(40);
  }

  function showOver() {
    setState('over');
    game.overAt = performance.now();
    const day = ensureDay();
    game.newBest = game.score > (save.bests[diff.id] || 0);
    if (game.newBest) { save.bests[diff.id] = game.score; sfx.best(); }
    save.best = Math.max(save.best, game.score);
    day.best = Math.max(day.best, game.score);
    persist();
    ui.overDiff.textContent = diff.name;
    ui.overDiff.style.background = diff.color;
    countUp(ui.overScore, game.score);
    ui.overBest.textContent = String(save.bests[diff.id]);
    ui.overToday.textContent = String(day.best);
    ui.newBest.classList.toggle('show', game.newBest);
    let rank = RANKS[0][1];
    for (const [min, name] of RANKS) if (game.score >= min) rank = name;
    const r = game.run;
    ui.overRewards.innerHTML =
      `<div><span>Rang</span><b class="mint">${rank}</b></div>` +
      `<div><span>Splitter</span><b class="amber">+${r.shards} ✦</b></div>` +
      `<div><span>Perfekt</span><b>${r.perfect}</b></div>` +
      `<div><span>Beste Combo</span><b>×${r.combo}</b></div>` +
      (r.bonus ? `<div><span>Bonus-Level</span><b class="amber">${r.bonus}</b></div>` : '') +
      (diff.mult > 1 ? `<div><span>${diff.name}</span><b class="amber">✦ ×${diff.mult}</b></div>` : '');
    ui.overMissions.innerHTML = missionRows(day);
    showScreen('over');
  }

  // Punktzahl hochzählen lassen
  let countRaf = 0;
  function countUp(el, to) {
    cancelAnimationFrame(countRaf);
    const t0 = performance.now(), dur = Math.min(900, 250 + to * 25);
    const step = now => {
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = String(Math.round(to * smooth(k)));
      if (k < 1) countRaf = requestAnimationFrame(step);
    };
    countRaf = requestAnimationFrame(step);
  }

  function toTitle() {
    reset();
    setState('title');
    refreshTitle();
    showScreen('title');
  }

  function pause() {
    if (game.state !== 'play') return;
    setState('paused');
    showScreen('pause');
    persist();
  }
  function resume() {
    if (game.state !== 'paused') return;
    setState('play');
    game.bird.vy = Math.min(game.bird.vy, 0);   // nach der Pause nicht sofort abstürzen
    showScreen(null);
  }

  // Tagesmissionen prüfen: Lauf-Missionen zählen den besten Wert, Tages-Missionen die Summe
  function checkMissions() {
    const day = save.day;
    if (!day) return;
    for (const m of day.missions) {
      if (m.done) continue;
      const d = missionDef(m.id);
      if (!d) continue;
      const v = d.run ? (game.run[d.stat] || 0) : (day.stats[d.stat] || 0);
      m.prog = d.run ? Math.max(m.prog, v) : v;
      if (m.prog >= d.goal) {
        m.done = true;
        m.prog = d.goal;
        save.shards += d.reward;
        sfx.best();
        toast(`✔ ${d.text} · +${d.reward} ✦`);
        persist();
      }
    }
  }

  // Kreis gegen Rechteck: nächsten Punkt im Rechteck suchen und Abstand prüfen
  function circleRect(cx, cy, r, rx, ry, rw, rh) {
    const nx = clamp(cx, rx, rx + rw), ny = clamp(cy, ry, ry + rh);
    const dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }
  function hitsPillar(p, b) {
    if (b.x + BIRD_R < p.x || b.x - BIRD_R > p.x + PILLAR_W) return false;  // schneller Ausschluss
    const top = p.gapY - p.gap / 2, bot = p.gapY + p.gap / 2;
    return circleRect(b.x, b.y, BIRD_R, p.x, -5000, PILLAR_W, top + 5000) ||
           circleRect(b.x, b.y, BIRD_R, p.x, bot, PILLAR_W, GROUND_Y - bot + 100);
  }

  function updateBirdAnim(dt) {
    const b = game.bird;
    b.wing += dt * (9 + b.flapT * 28);
    b.flapT = Math.max(0, b.flapT - dt * 4);
  }

  // Wetter je Welt: Schnee, Glut, Kometen
  function ambient(dt) {
    const type = WORLDS[game.world].ambient;
    if (!type || Math.random() > dt * 9) return;
    const W = view.W, top = -view.oy;
    if (type === 'snow') emit(rand(0, W + 120), top - 10, { vx: -40 - game.speed * 0.2, vy: rand(30, 60), life: 7, size: rand(1.5, 3), color: '#ffffff' });
    else if (type === 'ember') emit(rand(0, W + 60), GROUND_Y, { vx: -game.speed * 0.3, vy: rand(-70, -30), life: 4, size: rand(1.5, 3), color: Math.random() < 0.5 ? '#ffb050' : '#ff6a2a' });
    else if (type === 'comet' && Math.random() < 0.25) emit(W + 20, rand(top, 320), { vx: rand(-620, -420), vy: rand(60, 120), life: 1.6, size: 2.5, color: '#e0f0ff' });
  }

  function updateTitle(dt) {
    const b = game.bird;
    game.scroll += 70 * dt;
    b.x = birdX();
    b.y = H * 0.34 + Math.sin(game.time * 2.6) * 12;   // über der Titelkarte
    b.rot = Math.cos(game.time * 2.6) * -0.12;
    if (Math.random() < dt * 6) emit(b.x - 16, b.y + 4, { vx: rand(-80, -30), vy: rand(-10, 30), life: 0.6, size: 2, color: skin.core });
  }

  function updateItems(dx, dt) {
    const b = game.bird, items = game.items;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (it.gone) { items.splice(i, 1); continue; }
      it.x -= dx;
      if (game.magnetT > 0 && it.kind === 'shard') {
        const mx = b.x - it.x, my = b.y - it.y, d = Math.hypot(mx, my);
        if (d < MAGNET_R && d > 1) { const s = Math.min(d, 560 * dt) / d; it.x += mx * s; it.y += my * s; }
      }
      const r = (it.kind === 'shard' ? 14 : it.kind === 'portal' ? 26 : 20) + BIRD_R;
      const cx = b.x - it.x, cy = b.y - it.y;
      if (cx * cx + cy * cy < r * r) { items.splice(i, 1); collect(it); continue; }
      if (it.x < -40) items.splice(i, 1);
    }
  }

  function updatePlay(dt) {
    game.t += dt;
    game.speed = lerp(diff.speed[0], diff.speed[1], difficulty());
    const b = game.bird;

    // Physik der Figur
    b.vy = Math.min(b.vy + diff.gravity * dt, MAX_FALL);
    b.y += b.vy * dt;
    if (b.y < -view.oy - 40) { b.y = -view.oy - 40; b.vy = Math.max(b.vy, 0); } // weiche Decke
    const target = clamp(b.vy / 520, -0.5, 1.25);   // nach oben neigen beim Steigen, nach unten beim Fallen
    b.rot += (target - b.rot) * Math.min(1, dt * 12);

    // Säulen bewegen, Abweichung von der Mitte messen, Punkte vergeben, Kollision prüfen
    const dx = game.speed * dt;
    game.scroll += dx;
    const ps = game.pillars;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.x -= dx;
      if (b.x + BIRD_R > p.x && b.x - BIRD_R < p.x + PILLAR_W) p.dev = Math.max(p.dev, Math.abs(b.y - p.gapY));
      if (!p.scored && p.x + PILLAR_W < b.x) { p.scored = true; passPillar(p); }
      if (!p.broken && game.invT <= 0 && hitsPillar(p, b)) {
        if (game.shield) breakPillar(p);
        else { die('pillar'); return; }
      }
    }
    // Nachschub rechts (im Bonus-Level Splitter-Wellen statt Säulen), Aufräumen links
    if (game.bonusT > 0) {
      if (game.bonusT > 1.6) updateBonus(dx);    // am Ende kurze Pause vor den nächsten Säulen
    } else {
      let last = ps[ps.length - 1];
      while (!last || last.x <= view.W + 40 - SPACING) {
        // nie mitten im Bild auftauchen (z. B. direkt nach dem Bonus-Level)
        spawnPillar(last ? Math.max(last.x + SPACING, view.W + 40) : view.W + 40);
        last = ps[ps.length - 1];
      }
    }
    while (ps.length && ps[0].x + PILLAR_W < -40) ps.shift();

    updateItems(dx, dt);
    ambient(dt);

    // Boden: mit Schild abprallen, sonst Absturz
    if (b.y + BIRD_R >= GROUND_Y) {
      if (game.shield) {
        game.shield = false; game.invT = 0.8; game.shake = 6;
        b.y = GROUND_Y - BIRD_R - 1; b.vy = diff.flap * 1.1;
        sfx.shatter();
        burst(b.x, GROUND_Y, 16, [POWERS.shield.color, '#ffffff'], 260, 0.6, 500);
        hudPowers();
      } else {
        b.y = GROUND_Y - BIRD_R;
        die('ground');
      }
    }
  }

  function updateDying(dt) {
    game.deadT += dt;
    const b = game.bird;
    if (!game.landed) {
      b.vy = Math.min(b.vy + diff.gravity * dt, MAX_FALL);
      b.y += b.vy * dt;
      b.rot += dt * 9;                   // Trudeln
      if (b.y + BIRD_R >= GROUND_Y) {
        b.y = GROUND_Y - BIRD_R;
        game.landed = true;
        game.shake = Math.max(game.shake, 6);
        sfx.thud();
        burst(b.x, GROUND_Y, 10, WORLDS[game.world].ground.moss, 120, 0.5, 300);
      }
    }
    if ((game.landed && game.deadT > 0.8) || game.deadT > 2.5) showOver();
  }

  function update(dt) {
    // Power-Up-Zeiten laufen in Echtzeit, auch während der Zeitlupe
    if (game.state === 'play') {
      game.slowT = Math.max(0, game.slowT - dt);
      game.magnetT = Math.max(0, game.magnetT - dt);
      game.invT = Math.max(0, game.invT - dt);
      game.bonusT = Math.max(0, game.bonusT - dt);
    }
    if (game.state === 'play' && game.slowT > 0) dt *= SLOW_FACTOR;
    game.time += dt;
    game.flash = Math.max(0, game.flash - dt * 2.5);
    game.shake = Math.max(0, game.shake - dt * 30);
    game.worldT = Math.min(1, game.worldT + dt / 1.6);
    updateBirdAnim(dt);
    if (game.state === 'title' || game.state === 'menu') updateTitle(dt);
    else if (game.state === 'play') updatePlay(dt);
    else if (game.state === 'dying') updateDying(dt);
    updateParticles(dt);
  }

  /* ================= 7. Zeichnen ================= */
  // Kristall-Verläufe je Welt einmal anlegen (lokale Koordinaten 0..PILLAR_W, gelten nach translate)
  const PALETTES = WORLDS.map(w => w.pillars.map(([a, b, c, cap]) => {
    const body = ctx.createLinearGradient(0, 0, PILLAR_W, 0);
    body.addColorStop(0, a); body.addColorStop(0.34, b); body.addColorStop(0.35, c); body.addColorStop(1, INK);
    const head = ctx.createLinearGradient(-4, 0, PILLAR_W + 4, 0);
    head.addColorStop(0, cap); head.addColorStop(0.5, a); head.addColorStop(1, b);
    return { body, head };
  }));

  // Sterne auf transparenter Ebene (einmal pro Größenänderung)
  function buildStars() {
    const c = cache.stars;
    c.width = canvas.width; c.height = canvas.height;
    const g = c.getContext('2d');
    const k = view.scale * view.dpr, top = -view.oy, W = view.W;
    g.setTransform(k, 0, 0, k, 0, view.oy * k);
    let s = 7;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const n = Math.round(W * (H - top) / 2600);
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, y = top + rnd() * (H * 0.55 - top);
      g.globalAlpha = 0.25 + 0.75 * (1 - (y - top) / (H * 0.55 - top)) * rnd();
      g.fillStyle = rnd() < 0.15 ? '#ffe3a8' : '#ffffff';
      g.beginPath(); g.arc(x, y, 0.5 + rnd() * 1.2, 0, TAU); g.fill();
    }
  }

  // Bodenkachel je Welt; x exakt auf ganze Pixel skaliert → keine Nähte
  function buildGround(world) {
    const { soil, moss, deco } = world.ground;
    const k = view.scale * view.dpr;
    const tw = 64, th = GROUND_H + 16;            // Kachel beginnt 16 Einheiten über dem Boden
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(tw * k));
    c.height = Math.max(1, Math.ceil(th * k) + 2);
    const g = c.getContext('2d');
    g.setTransform(c.width / tw, 0, 0, k, 0, 0);
    const sg = g.createLinearGradient(0, 16, 0, th);
    sg.addColorStop(0, soil[0]); sg.addColorStop(1, soil[1]);
    g.fillStyle = sg; g.fillRect(0, 14, tw, th);
    g.fillStyle = 'rgba(0,0,0,0.12)';             // schräge Bänder geben Tempo-Gefühl
    for (let x = -64; x < 64; x += 32) {
      g.beginPath(); g.moveTo(x, th); g.lineTo(x + 16, th); g.lineTo(x + 56, 26); g.lineTo(x + 40, 26); g.closePath(); g.fill();
    }
    g.fillStyle = 'rgba(255,240,200,0.4)';
    [[10, 50], [42, 66], [26, 80]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); });
    const wave = (y0, yEdge, col) => {           // Welle mit Periode 64 → nahtlos
      g.fillStyle = col;
      g.beginPath(); g.moveTo(0, y0);
      for (let x = 0; x <= tw; x += 4) g.lineTo(x, yEdge + Math.sin(x / tw * TAU * 2) * 3);
      g.lineTo(tw, y0); g.closePath(); g.fill();
    };
    wave(30, 19, moss[0]);
    wave(22, 15, moss[1]);
    if (deco === 'mushroom') {
      g.fillStyle = '#e9dcff'; g.fillRect(45, 6, 3, 10);
      g.fillStyle = '#ff8ac4'; g.beginPath(); g.ellipse(46.5, 7, 7, 4.5, 0, Math.PI, TAU); g.fill();
      g.fillStyle = '#fff'; g.fillRect(43, 4, 2, 1.5); g.fillRect(48, 3.5, 1.5, 1.5);
    } else if (deco === 'icicle') {
      g.fillStyle = '#e8fbff'; g.beginPath(); g.moveTo(40, 15); g.lineTo(44, 0); g.lineTo(48, 15); g.closePath(); g.fill();
      g.fillStyle = '#9fd8f5'; g.beginPath(); g.moveTo(44, 15); g.lineTo(44, 0); g.lineTo(48, 15); g.closePath(); g.fill();
    } else if (deco === 'ember') {
      g.fillStyle = '#2a0e0e'; g.beginPath(); g.ellipse(44, 14, 8, 6, 0, Math.PI, TAU); g.fill();
      g.fillStyle = '#ffb050'; g.fillRect(41, 10, 2, 2); g.fillRect(46, 9, 2, 2);
    } else if (deco === 'crater') {
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(30, 50, 9, 4, 0, 0, TAU); g.fill();
      g.fillStyle = '#c0bce0'; g.beginPath(); g.arc(46, 12, 3, 0, TAU); g.fill();
    }
    return c;
  }

  // Aktuelle Weltmischung: a = alte Welt, b = neue Welt, t = Überblendung 0..1
  const wm = { a: WORLDS[0], b: WORLDS[0], t: 1 };
  function worldMix() {
    wm.a = WORLDS[game.worldFrom]; wm.b = WORLDS[game.world]; wm.t = smooth(game.worldT);
    return wm;
  }

  function drawSky(m) {
    const top = -view.oy;
    const g = ctx.createLinearGradient(0, top, 0, GROUND_Y);
    [0, 0.42, 0.75, 1].forEach((pos, i) => g.addColorStop(pos, mix(m.a.sky[i], m.b.sky[i], m.t)));
    ctx.fillStyle = g;
    ctx.fillRect(0, top, view.W, H - top + 2);
  }

  // Himmelskörper je Welt (Planet, Mond, Sonne, Galaxie)
  function drawBody(type, alpha) {
    if (alpha <= 0.01) return;
    const px = view.W * 0.78, py = -view.oy + 120;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (type === 'planet') {
      ctx.fillStyle = 'rgba(255,200,230,0.12)'; ctx.beginPath(); ctx.arc(px, py, 70, 0, TAU); ctx.fill();
      const pg = ctx.createRadialGradient(px - 14, py - 14, 4, px, py, 44);
      pg.addColorStop(0, '#ffe9c4'); pg.addColorStop(1, '#e27aa8');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, 44, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,220,0.7)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(px, py, 72, 14, -0.3, 0, TAU); ctx.stroke();
    } else if (type === 'moon') {
      ctx.fillStyle = 'rgba(230,245,255,0.15)'; ctx.beginPath(); ctx.arc(px, py, 80, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f4f8ff'; ctx.beginPath(); ctx.arc(px, py, 50, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d6e2f2';
      [[-16, -10, 10], [14, 8, 13], [-6, 22, 6], [20, -20, 5]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(px + x, py + y, r, 0, TAU); ctx.fill(); });
    } else if (type === 'sun') {
      const sg = ctx.createRadialGradient(px, py, 20, px, py, 130);
      sg.addColorStop(0, 'rgba(255,140,60,0.5)'); sg.addColorStop(1, 'rgba(255,80,40,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(px, py, 130, 0, TAU); ctx.fill();
      const dg = ctx.createLinearGradient(0, py - 56, 0, py + 56);
      dg.addColorStop(0, '#ffe28a'); dg.addColorStop(1, '#ff5a2a');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(px, py, 56, 0, TAU); ctx.fill();
    } else if (type === 'galaxy') {
      ctx.translate(px, py);
      ctx.rotate(game.time * 0.05);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        ctx.rotate(TAU / 3);
        const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, 90);
        gg.addColorStop(0, 'rgba(200,170,255,0.35)'); gg.addColorStop(1, 'rgba(120,80,255,0)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(20, 0, 90, 26, 0.4, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,250,240,0.9)'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawAurora(m) {
    const t = game.time, W = view.W;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      for (let x = -24; x <= W + 24; x += 24) {
        const y = 70 - view.oy * 0.5 + i * 50 + Math.sin(x * 0.007 + t * 0.35 + i * 2) * 30 + Math.sin(x * 0.019 - t * 0.6) * 10;
        if (x === -24) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      const A = m.a.aurora[i], B = m.b.aurora[i];
      ctx.strokeStyle = mix(A[0], B[0], m.t, lerp(A[1], B[1], m.t));
      ctx.lineWidth = 40; ctx.stroke();
      ctx.lineWidth = 12; ctx.stroke();
    }
    ctx.restore();
  }

  // Bergkette mit Parallaxe; Stützpunkte an Welt-Koordinaten gebunden → kein Wabern
  function drawRidge(par, base, amp, color, f1, f2) {
    const off = game.scroll * par, step = 16;
    const start = Math.floor(off / step) * step;
    ctx.beginPath();
    ctx.moveTo(start - off, GROUND_Y);
    for (let wx = start; wx - off <= view.W + step; wx += step) {
      const y = base - (Math.sin(wx * f1) * 0.6 + Math.sin(wx * f2 + 1.3) * 0.4) * amp - Math.abs(Math.sin(wx * f1 * 0.5)) * amp * 0.7;
      ctx.lineTo(wx - off, y);
    }
    ctx.lineTo(view.W + step, GROUND_Y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawIsland(x, y, s, i) {
    ctx.save();
    ctx.translate(x, y + Math.sin(game.time * 0.8 + i) * 5);
    ctx.scale(s, s);
    ctx.fillStyle = '#5b3a8c';                      // Felsen unten
    ctx.beginPath(); ctx.moveTo(-50, 0); ctx.lineTo(50, 0); ctx.lineTo(14, 46); ctx.lineTo(-8, 62); ctx.lineTo(-22, 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7b54b0';
    ctx.beginPath(); ctx.moveTo(-50, 0); ctx.lineTo(0, 0); ctx.lineTo(-8, 62); ctx.lineTo(-22, 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#58c9a0';                      // Wiese oben
    ctx.beginPath(); ctx.ellipse(0, 0, 54, 10, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c9a7ff';                      // kleiner Kristall
    ctx.beginPath(); ctx.moveTo(14, -2); ctx.lineTo(20, -30); ctx.lineTo(26, -2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#efe6ff';
    ctx.beginPath(); ctx.moveTo(14, -2); ctx.lineTo(20, -30); ctx.lineTo(19, -2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3fa889';                      // Baum
    ctx.beginPath(); ctx.arc(-20, -16, 12, 0, TAU); ctx.arc(-10, -12, 9, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawIslands(alpha) {
    if (alpha <= 0.01) return;
    const P = 560, off = game.scroll * 0.3;
    ctx.globalAlpha = alpha;
    for (let i = Math.floor((off - 300) / P); ; i++) {
      const x = i * P + hash(i) * 220 - off;
      if (x > view.W + 120) break;
      drawIsland(x, 220 + hash(i + 7) * 150, 0.7 + hash(i + 3) * 0.5, i);
    }
    ctx.globalAlpha = 1;
  }

  function drawClouds(color) {
    const P = 300, off = game.scroll * 0.55;
    ctx.fillStyle = color;
    for (let i = Math.floor((off - 200) / P); ; i++) {
      const x = i * P + hash(i + 11) * 160 - off;
      if (x > view.W + 100) break;
      const y = 380 + hash(i + 5) * 110, s = 0.8 + hash(i + 2) * 0.7;
      ctx.beginPath();
      ctx.arc(x, y, 26 * s, 0, TAU); ctx.arc(x + 30 * s, y - 10 * s, 32 * s, 0, TAU);
      ctx.arc(x + 64 * s, y, 24 * s, 0, TAU); ctx.rect(x, y, 64 * s, 22 * s);
      ctx.fill();
    }
  }

  // Eine Säulenhälfte. Lokal: Lücke bei y=0, Säule wächst nach -y (dir spiegelt für unten).
  function drawPillarHalf(pal, e, dir, len, pulse) {
    ctx.save();
    ctx.translate(0, e);
    ctx.scale(1, dir);
    ctx.fillStyle = pal.body;
    ctx.fillRect(0, -len, PILLAR_W, len - CAP_H + 1);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';          // Glanzstreifen
    ctx.fillRect(9, -len, 5, len - CAP_H - 4);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';                // Facettenkerben
    for (let y = -CAP_H - 46; y > -len; y -= 70) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(PILLAR_W, y - 18); ctx.lineTo(PILLAR_W, y - 14); ctx.lineTo(0, y + 4); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = pal.head;                          // Kristallkopf
    ctx.beginPath();
    ctx.moveTo(-4, -CAP_H); ctx.lineTo(PILLAR_W + 4, -CAP_H);
    ctx.lineTo(PILLAR_W + 4, -8); ctx.lineTo(PILLAR_W - 10, 0);
    ctx.lineTo(10, 0); ctx.lineTo(-4, -8); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.35 + pulse * 0.35})`;   // pulsierender Edelstein
    ctx.beginPath(); ctx.moveTo(PILLAR_W / 2, -CAP_H + 5); ctx.lineTo(PILLAR_W / 2 + 7, -13); ctx.lineTo(PILLAR_W / 2, -6); ctx.lineTo(PILLAR_W / 2 - 7, -13); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawPillars() {
    for (const p of game.pillars) {
      if (p.broken || p.x > view.W + 10 || p.x + PILLAR_W < -10) continue;
      const pal = PALETTES[p.w][p.pal];
      const top = p.gapY - p.gap / 2, bot = p.gapY + p.gap / 2;
      const pulse = 0.5 + 0.5 * Math.sin(game.time * 3 + p.seed);
      ctx.save();
      ctx.translate(p.x, 0);
      drawPillarHalf(pal, top, 1, top + view.oy + 20, pulse);
      drawPillarHalf(pal, bot, -1, GROUND_Y - bot + 4, pulse);
      ctx.strokeStyle = INK; ctx.lineWidth = 2;          // Umriss der Körper
      ctx.strokeRect(0, -view.oy - 20, PILLAR_W, top - CAP_H + view.oy + 20);
      ctx.strokeRect(0, bot + CAP_H, PILLAR_W, GROUND_Y - bot - CAP_H + 4);
      ctx.restore();
    }
  }

  function drawItems() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '18px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif';
    for (const it of game.items) {
      if (it.x < -30 || it.x > view.W + 30) continue;
      const y = it.y + Math.sin(game.time * 3 + it.seed) * 4;
      ctx.save();
      ctx.translate(it.x, y);
      if (it.kind === 'portal') {
        drawPortal(it);
      } else if (it.kind === 'shard') {
        const sx = Math.cos(game.time * 3 + it.seed);   // dreht sich um die Hochachse
        ctx.scale(Math.max(0.15, Math.abs(sx)), 1);
        ctx.fillStyle = sx > 0 ? '#ffd27a' : '#ffb53d';
        ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(7, 0); ctx.lineTo(0, 9); ctx.lineTo(-7, 0); ctx.closePath();
        ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.fillRect(-2, -5, 2, 4);
      } else {
        const pw = POWERS[it.kind];
        const r = 17 + Math.sin(game.time * 5 + it.seed) * 1.5;
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(27,20,64,0.55)';
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = pw.color; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.fillText(pw.icon, 0, 1);
      }
      ctx.restore();
    }
    ctx.textBaseline = 'alphabetic';
  }

  // Goldenes Bonus-Portal: drehender Ring mit Funken
  function drawPortal(it) {
    const t = game.time;
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 40);
    g.addColorStop(0, 'rgba(255,240,180,0.9)'); g.addColorStop(0.5, 'rgba(255,190,60,0.35)'); g.addColorStop(1, 'rgba(255,190,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU); ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ffd27a';
    ctx.beginPath(); ctx.ellipse(0, 0, 18 + Math.sin(t * 4) * 1.5, 28, 0, 0, TAU); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = INK;
    ctx.beginPath(); ctx.ellipse(0, 0, 21 + Math.sin(t * 4) * 1.5, 31, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#fff7e8';
    for (let i = 0; i < 6; i++) {
      const a = t * 2.5 + i * TAU / 6;
      ctx.beginPath(); ctx.arc(Math.cos(a) * 20, Math.sin(a) * 30, 2.2, 0, TAU); ctx.fill();
    }
    ctx.font = '900 15px system-ui, sans-serif';
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.fillStyle = '#ffd27a';
    ctx.strokeText('×' + BONUS.mult, 0, 1); ctx.fillText('×' + BONUS.mult, 0, 1);
    ctx.font = '18px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif';
  }

  function drawGroundTile(tile, alpha, sx, sy) {
    const k = view.scale * view.dpr;
    const gy = Math.round((GROUND_Y - 16 + view.oy + sy) * k);
    const off = Math.round(((game.scroll % 64) / 64) * tile.width);
    const sxp = Math.round(sx * k);
    ctx.globalAlpha = alpha;
    for (let x = -off - tile.width + sxp; x < canvas.width; x += tile.width) ctx.drawImage(tile, x, gy);
    ctx.globalAlpha = 1;
    if (gy + tile.height < canvas.height) { ctx.fillStyle = '#120c26'; ctx.fillRect(0, gy + tile.height, canvas.width, canvas.height); }
  }
  function drawGround(m, sx, sy) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (m.t < 1) drawGroundTile(cache.grounds[game.worldFrom], 1, sx, sy);
    drawGroundTile(cache.grounds[game.world], m.t < 1 ? m.t : 1, sx, sy);
  }

  function wing(c, x, y, a, col) {
    c.save();
    c.translate(x, y);
    c.rotate(-a);
    c.fillStyle = col;
    c.beginPath(); c.ellipse(-8, -6, 13, 6, -0.5, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(43,29,85,0.55)'; c.lineWidth = 1.5; c.stroke();
    c.restore();
  }

  function star(c, x, y, r) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      if (i) c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
  }

  // Pip und seine Varianten: rundes Wesen mit Leuchtlaterne als Schwanz, Visier-Auge und Glasflügeln.
  function drawPip(c, wingA, glow, sk, hatId) {
    const hg = c.createRadialGradient(-15, 3, 0, -15, 3, 36);
    hg.addColorStop(0, `rgba(${sk.glow},${0.55 * glow})`); hg.addColorStop(1, `rgba(${sk.glow},0)`);
    if (glow > 0) { c.fillStyle = hg; c.beginPath(); c.arc(-15, 3, 36, 0, TAU); c.fill(); }   // ohne Leuchten in Vorschaubildern

    wing(c, -3, -9, wingA + 0.35, `rgba(${sk.wing},0.45)`);           // hinterer Flügel

    c.lineWidth = 2; c.strokeStyle = INK;
    c.fillStyle = sk.lamp;                                             // Laterne
    c.beginPath(); c.ellipse(-15, 4, 10, 8.5, 0, 0, TAU); c.fill(); c.stroke();
    c.globalAlpha = 0.6 + glow * 0.4;
    c.fillStyle = sk.core;
    c.beginPath(); c.ellipse(-16, 3, 5, 4, 0, 0, TAU); c.fill();
    c.globalAlpha = 1;

    const bg = c.createLinearGradient(0, -16, 0, 16);                  // Körper
    if (sk.rainbow) {                                                  // Prisma schillert in allen Farben
      const h = (game.time * 60) % 360;
      bg.addColorStop(0, `hsl(${h},90%,78%)`); bg.addColorStop(0.5, `hsl(${(h + 60) % 360},85%,62%)`); bg.addColorStop(1, `hsl(${(h + 120) % 360},80%,50%)`);
    } else {
      bg.addColorStop(0, sk.body[0]); bg.addColorStop(1, sk.body[1]);
    }
    c.fillStyle = bg; c.beginPath(); c.arc(2, 0, 15, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath(); c.ellipse(4, 8, 8, 4, 0, 0, TAU); c.fill();

    // Zubehör je Figur
    if (sk.acc === 'horns' && !hatId) {
      c.fillStyle = '#ffd040';
      c.beginPath(); c.moveTo(-6, -11); c.lineTo(-9, -22); c.lineTo(0, -14); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(6, -14); c.lineTo(10, -24); c.lineTo(13, -10); c.closePath(); c.fill(); c.stroke();
    } else if (sk.acc === 'scarf') {
      c.strokeStyle = '#ff6a8a'; c.lineWidth = 5;
      c.beginPath(); c.arc(2, 0, 13, 0.6, 2.4); c.stroke();
      c.lineWidth = 4; c.beginPath(); c.moveTo(-6, 11); c.quadraticCurveTo(-14, 18 + Math.sin(game.time * 12) * 3, -22, 16); c.stroke();
      c.strokeStyle = INK; c.lineWidth = 2;
    } else if (sk.acc === 'crown' && !hatId) {
      c.fillStyle = '#ffe14a';
      c.beginPath(); c.moveTo(-6, -12); c.lineTo(-7, -23); c.lineTo(-2, -17); c.lineTo(2, -25); c.lineTo(6, -17); c.lineTo(11, -23); c.lineTo(10, -12); c.closePath(); c.fill(); c.stroke();
    }

    if (!hatId && sk.acc !== 'crown' && sk.acc !== 'horns') {                     // Antenne
      c.beginPath(); c.moveTo(1, -14); c.quadraticCurveTo(0, -25, -7, -27); c.stroke();
      c.fillStyle = sk.acc === 'star' ? '#ffe14a' : '#ffd27a';
      if (sk.acc === 'star') { star(c, -7, -28, 6); c.fill(); c.stroke(); }
      else { c.beginPath(); c.arc(-7, -27, 3.2, 0, TAU); c.fill(); }
    }

    if (sk.acc === 'visor') {                                          // Visier statt Auge
      c.fillStyle = sk.lamp;
      c.beginPath(); c.ellipse(9, -4, 8, 4.5, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#fff'; c.fillRect(8, -6, 6, 1.6);
    } else {
      c.fillStyle = '#fff';                                            // Auge
      c.beginPath(); c.ellipse(9, -4, 7.5, 7, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = INK; c.beginPath(); c.arc(11, -4, 3.6, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(12.4, -5.5, 1.3, 0, TAU); c.fill();
    }

    c.fillStyle = sk.nose;                                             // Nasenspitze
    c.beginPath(); c.moveTo(15, 2); c.lineTo(23, 5); c.lineTo(15, 9); c.closePath(); c.fill(); c.stroke();

    wing(c, -1, -8, wingA, `rgba(${sk.wing},0.8)`);                   // vorderer Flügel
    if (hatId) drawHat(c, hatId, sk);
  }

  // Kopfschmuck. Ursprung = Kopfoberseite, y nach oben negativ.
  function drawHat(c, id, sk) {
    const t = game.time;
    c.save();
    c.translate(3, -12);
    c.rotate(-0.12);
    c.lineWidth = 2; c.strokeStyle = INK;
    const shape = (fill, fn) => { c.fillStyle = fill; c.beginPath(); fn(); c.fill(); c.stroke(); };
    switch (id) {
      case 'party':
        shape('#ff8ac4', () => { c.moveTo(-9, 1); c.lineTo(9, 1); c.lineTo(1, -22); c.closePath(); });
        c.strokeStyle = '#ffe14a'; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(-6, -6); c.lineTo(6, -9); c.moveTo(-3, -14); c.lineTo(4, -16); c.stroke();
        c.strokeStyle = INK; c.lineWidth = 2;
        shape('#5ef2d6', () => c.arc(1, -23, 3.5, 0, TAU));
        break;
      case 'flower':
        c.translate(-8, -1);
        for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + t; shape('#ffd0ea', () => c.arc(Math.cos(a) * 4.5, Math.sin(a) * 4.5, 3.6, 0, TAU)); }
        shape('#ffe14a', () => c.arc(0, 0, 3, 0, TAU));
        break;
      case 'beanie':
        shape('#ff6a5a', () => c.ellipse(0, 2, 13, 13, 0, Math.PI, TAU));
        shape('#fff0e0', () => c.rect(-13.5, -2, 27, 5));
        shape('#ffffff', () => c.arc(0, -13, 4.5, 0, TAU));
        break;
      case 'cap':
        shape('#2a5ad0', () => c.ellipse(11, 0, 10, 3, 0, 0, TAU));
        shape('#4a8aff', () => c.ellipse(0, 1, 12, 10, 0, Math.PI, TAU));
        shape('#ffe14a', () => c.arc(0, -9, 2, 0, TAU));
        break;
      case 'catears':
        for (const [x0, x1, x2] of [[-12, -9, -2], [3, 9, 12]]) {
          shape(sk.body[1], () => { c.moveTo(x0, 3); c.lineTo(x1, -12); c.lineTo(x2, 1); c.closePath(); });
          c.fillStyle = '#ff9ac0'; c.beginPath(); c.moveTo(x0 + 3, 1); c.lineTo(x1, -7); c.lineTo(x2 - 2, 0); c.closePath(); c.fill();
        }
        break;
      case 'chef':
        shape('#ffffff', () => { c.arc(-7, -11, 7, 0, TAU); c.arc(7, -11, 7, 0, TAU); c.arc(0, -15, 8, 0, TAU); });
        shape('#ffffff', () => c.rect(-9, -9, 18, 10));
        break;
      case 'headphones':
        c.lineWidth = 3.5; c.strokeStyle = '#3a3050';
        c.beginPath(); c.arc(-1, 7, 13, Math.PI * 1.02, Math.PI * 1.95); c.stroke();
        c.lineWidth = 2; c.strokeStyle = INK;
        shape('#ff4a6a', () => { c.ellipse(-10, 8, 5, 7, 0, 0, TAU); });
        shape('#ffd0dc', () => c.ellipse(-10, 8, 2, 3.5, 0, 0, TAU));
        break;
      case 'propeller':
        shape('#ff4a6a', () => c.ellipse(0, 1, 12, 10, 0, Math.PI, Math.PI * 1.5));
        shape('#4a8aff', () => { c.moveTo(0, 1); c.ellipse(0, 1, 12, 10, 0, Math.PI * 1.5, TAU); c.closePath(); });
        c.beginPath(); c.moveTo(0, -9); c.lineTo(0, -14); c.stroke();
        shape('#ffe14a', () => c.ellipse(0, -15, Math.max(1, Math.abs(Math.cos(t * 18)) * 13), 2.5, 0, 0, TAU));
        break;
      case 'tophat':
        shape('#22183a', () => c.ellipse(0, 0, 15, 3.5, 0, 0, TAU));
        shape('#22183a', () => c.rect(-9, -21, 18, 21));
        shape('#ff4a6a', () => c.rect(-9, -6, 18, 4));
        c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(-6, -19, 3, 12);
        break;
      case 'pirate':
        shape('#22183a', () => { c.moveTo(-17, 1); c.quadraticCurveTo(-8, -6, 0, -17); c.quadraticCurveTo(8, -6, 17, 1); c.quadraticCurveTo(0, -3, -17, 1); });
        shape('#ffffff', () => c.arc(0, -7, 3, 0, TAU));
        c.fillStyle = INK; c.fillRect(-1.5, -7.5, 1, 1); c.fillRect(0.5, -7.5, 1, 1);
        break;
      case 'viking':
        for (const s of [-1, 1]) shape('#fff0d0', () => { c.moveTo(s * 10, -3); c.quadraticCurveTo(s * 20, -6, s * 18, -17); c.quadraticCurveTo(s * 15, -8, s * 6, -6); c.closePath(); });
        shape('#b8c0d0', () => c.ellipse(0, 2, 13, 12, 0, Math.PI, TAU));
        shape('#8a6a3a', () => c.rect(-13, -2, 26, 4));
        break;
      case 'wizard':
        shape('#4a3ab0', () => { c.moveTo(-11, 0); c.lineTo(11, 0); c.lineTo(4, -16); c.quadraticCurveTo(8, -24, 16, -24); c.quadraticCurveTo(4, -28, -2, -18); c.closePath(); });
        shape('#4a3ab0', () => c.ellipse(0, 0, 16, 3.5, 0, 0, TAU));
        c.fillStyle = '#ffe14a';
        star(c, -2, -8, 3); c.fill(); star(c, 5, -15, 2); c.fill();
        break;
      case 'halo': {
        const y = -9 + Math.sin(t * 3) * 1.5;
        c.shadowColor = '#ffe14a'; c.shadowBlur = 8;
        c.strokeStyle = '#ffe14a'; c.lineWidth = 3.5;
        c.beginPath(); c.ellipse(0, y, 11, 3.5, 0, 0, TAU); c.stroke();
        c.shadowBlur = 0;
        break;
      }
      case 'diadem':
        c.strokeStyle = '#ffd27a'; c.lineWidth = 3;
        c.beginPath(); c.arc(0, 8, 12, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
        c.lineWidth = 2; c.strokeStyle = INK;
        c.fillStyle = '#5ef2d6'; c.shadowColor = '#5ef2d6'; c.shadowBlur = 6 + Math.sin(t * 4) * 3;
        star(c, 0, -6, 6); c.fill(); c.stroke();
        c.shadowBlur = 0;
        c.fillStyle = '#ff8ac4'; c.beginPath(); c.arc(-8, -1, 2, 0, TAU); c.arc(8, -1, 2, 0, TAU); c.fill();
        break;
      default: break;
    }
    c.restore();
  }

  function drawParticles() {
    ctx.textAlign = 'center';
    ctx.font = '900 20px system-ui, sans-serif';
    for (const p of particles) {
      if (!p.on) continue;
      const a = p.life / p.max;
      ctx.globalAlpha = Math.min(1, a * 1.5);
      if (p.kind === P_DOT) {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, TAU); ctx.fill();
      } else if (p.kind === P_RING) {
        ctx.strokeStyle = p.color; ctx.lineWidth = 3 * a;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + (1 - a) * 3), 0, TAU); ctx.stroke();
      } else {
        ctx.fillStyle = p.color; ctx.strokeStyle = INK; ctx.lineWidth = 4;
        ctx.strokeText(p.text, p.x, p.y); ctx.fillText(p.text, p.x, p.y);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawBird() {
    const b = game.bird;
    if (game.magnetT > 0) {
      ctx.strokeStyle = `rgba(255,138,196,${0.12 + 0.08 * Math.sin(game.time * 8)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, MAGNET_R * 0.6, 0, TAU); ctx.stroke();
    }
    if (game.invT > 0 && Math.floor(game.invT * 16) % 2) return;   // Blinken nach Schildtreffer
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    drawPip(ctx, Math.sin(b.wing) * 0.8, 0.8 + Math.sin(game.time * 6) * 0.2, skin, hat);
    ctx.restore();
    if (game.shield) {
      const r = 25 + Math.sin(game.time * 6) * 1.5;
      ctx.fillStyle = 'rgba(94,242,214,0.12)';
      ctx.strokeStyle = 'rgba(94,242,214,0.8)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, r - 5, -2.4, -1.6); ctx.stroke();
    }
  }

  function render() {
    const k = view.scale * view.dpr;
    const m = worldMix();
    ctx.setTransform(k, 0, 0, k, 0, view.oy * k);
    drawSky(m);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = clamp(lerp(m.a.stars, m.b.stars, m.t), 0, 1);
    ctx.drawImage(cache.stars, 0, 0);
    ctx.globalAlpha = 1;

    let sx = 0, sy = 0;
    if (game.shake > 0) { sx = (Math.random() * 2 - 1) * game.shake; sy = (Math.random() * 2 - 1) * game.shake; }
    ctx.setTransform(k, 0, 0, k, 0, view.oy * k);
    if (m.t < 1) drawBody(m.a.body, 1 - m.t);
    drawBody(m.b.body, m.t);
    drawAurora(m);
    drawRidge(0.08, 470, 70, mix(m.a.ridge1, m.b.ridge1, m.t), 0.006, 0.013);
    drawIslands(lerp(m.a.islands ? 1 : 0, m.b.islands ? 1 : 0, m.t) * 0.75);
    drawRidge(0.18, 520, 50, mix(m.a.ridge2, m.b.ridge2, m.t), 0.011, 0.023);
    drawClouds(mix(m.a.cloud[0], m.b.cloud[0], m.t, lerp(m.a.cloud[1], m.b.cloud[1], m.t)));

    ctx.setTransform(k, 0, 0, k, sx * k, (view.oy + sy) * k);
    drawPillars();
    drawItems();
    drawGround(m, sx, sy);

    ctx.setTransform(k, 0, 0, k, sx * k, (view.oy + sy) * k);
    drawParticles();
    drawBird();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (game.state === 'play' && game.slowT > 0) {
      ctx.fillStyle = `rgba(120,160,255,${Math.min(0.12, game.slowT * 0.06)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (game.state === 'play' && game.bonusT > 0) {
      ctx.fillStyle = `rgba(255,200,80,${Math.min(0.14, game.bonusT * 0.07)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (game.flash > 0) {
      ctx.fillStyle = `rgba(255,245,230,${Math.min(1, game.flash) * 0.8})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  /* ================= 8. Menüs, HUD & Toasts ================= */
  function hudShards() { ui.runShards.textContent = '✦ ' + game.run.shards; }

  let lastPowers = null;
  function hudPowers() {
    const parts = [];
    if (game.bonusT > 0) parts.push('⭐ BONUS ×' + BONUS.mult + ' · ' + Math.ceil(game.bonusT));
    if (game.shield) parts.push(POWERS.shield.icon);
    if (game.slowT > 0) parts.push(POWERS.slow.icon + ' ' + Math.ceil(game.slowT));
    if (game.magnetT > 0) parts.push(POWERS.magnet.icon + ' ' + Math.ceil(game.magnetT));
    const key = parts.join('|');
    if (key === lastPowers) return;          // DOM nur bei Änderung anfassen
    lastPowers = key;
    ui.powers.innerHTML = parts.map(p => `<span class="chip${p[0] === '⭐' ? ' gold' : ''}">${p}</span>`).join('');
  }

  // Meldungen nacheinander zeigen (Missionen, Weltwechsel, Freischaltungen)
  const toastQueue = [];
  let toastBusy = false;
  function toast(msg, big = false) {
    toastQueue.push([msg, big]);
    if (!toastBusy) nextToast();
  }
  function nextToast() {
    const item = toastQueue.shift();
    if (!item) { toastBusy = false; return; }
    toastBusy = true;
    ui.toast.textContent = item[0];
    ui.toast.className = 'show' + (item[1] ? ' big' : '');
    setTimeout(() => { ui.toast.className = item[1] ? 'big' : ''; setTimeout(nextToast, 300); }, item[1] ? 2000 : 2400);
  }

  function refreshTitle() {
    const day = ensureDay();
    ui.wallet.textContent = String(save.shards);
    for (const b of ui.diffSeg.children) b.classList.toggle('on', b.dataset.diff === diff.id);
    ui.diffInfo.innerHTML = `${diff.desc} · Splitter <b>×${diff.mult}</b>` + (diff.power ? '' : ' · keine Power-Ups');
    ui.titleBest.textContent = String(save.bests[diff.id] || 0);
    ui.titleToday.textContent = String(day.best);
    ui.missionBadge.textContent = `${day.missions.filter(m => m.done).length}/3`;
    ui.shopBadge.hidden = save.shopSeen === today();
  }

  function backToTitle() {
    setState('title');
    refreshTitle();
    showScreen('title');
  }

  // Schwierigkeit wählen (Knöpfe werden aus DIFFS erzeugt)
  function setDiff(id) {
    const d = DIFFS.find(x => x.id === id);
    if (!d) return;
    diff = d;
    save.diff = id;
    persist();
    refreshTitle();
  }
  for (const d of DIFFS) {
    const b = document.createElement('button');
    b.textContent = d.name;
    b.dataset.diff = d.id;
    b.style.setProperty('--c', d.color);
    b.setAttribute('role', 'radio');
    b.addEventListener('pointerdown', e => e.stopPropagation());
    b.addEventListener('click', () => { b.blur(); sfx.unlock(); sfx.shard(); setDiff(d.id); });
    ui.diffSeg.append(b);
  }

  // Vorschaubilder von Figur + Kopfschmuck (einmal je Kombination)
  const thumbs = new Map();
  function thumb(sk, hatId) {
    const key = sk.id + '|' + (hatId || '');
    let url = thumbs.get(key);
    if (url) return url;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.setTransform(2.2, 0, 0, 2.2, 66, hatId ? 80 : 72);
    drawPip(g, 0.5, 0, sk, hatId);
    url = c.toDataURL('image/png');
    thumbs.set(key, url);
    return url;
  }
  const rarityOf = it => RARITY[it.rarity] || RARITY.common;
  const hatName = id => (HATS.find(h => h.id === id) || { name: '' }).name;
  function applyLook() {
    skin = SKINS.find(k => k.id === save.skin) || SKINS[0];
    hat = save.hat;
  }
  // Dynamisch erzeugte Knöpfe dürfen keinen Flügelschlag auslösen
  function tapButton(el, fn) {
    el.addEventListener('pointerdown', e => e.stopPropagation());
    el.addEventListener('click', e => { e.currentTarget.blur(); fn(); });
  }

  // ---- Shop: jeden Tag 3 Figuren + 3 Kopfschmuck, eins davon 30 % günstiger ----
  function shopToday() {
    const r = mulberry(strSeed('shop-' + today()));
    const pick = (list, n) => {
      const pool = list.filter(x => x.price > 0), out = [];
      while (out.length < n && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
      return out;
    };
    const offers = [...pick(SKINS, 3).map(item => ({ type: 'skin', item })), ...pick(HATS, 3).map(item => ({ type: 'hat', item }))];
    const deal = Math.floor(r() * offers.length);
    offers.forEach((o, i) => { o.deal = i === deal; o.price = o.deal ? Math.round(o.item.price * 0.7) : o.item.price; });
    return offers;
  }
  const isOwned = o => (o.type === 'skin' ? save.owned : save.hats).includes(o.item.id);

  function untilMidnight() {
    const now = new Date(), mid = new Date(now);
    mid.setHours(24, 0, 0, 0);
    const sec = Math.max(0, Math.floor((mid - now) / 1000));
    return [Math.floor(sec / 3600), Math.floor(sec / 60) % 60, sec % 60].map(v => String(v).padStart(2, '0')).join(':');
  }

  let shopTimer = 0, shopDate = '';
  function openShop() {
    setState('menu');
    renderShop();
    showScreen('shop');
    clearInterval(shopTimer);
    shopTimer = setInterval(() => {
      if (!ui.screens.shop.classList.contains('show')) { clearInterval(shopTimer); return; }
      ui.shopTimer.textContent = untilMidnight();
      if (shopDate !== today()) renderShop();     // Mitternacht erlebt: neue Auswahl
    }, 1000);
  }
  function renderShop() {
    shopDate = today();
    ui.shopShards.textContent = String(save.shards);
    ui.shopTimer.textContent = untilMidnight();
    ui.shopSkins.textContent = '';
    ui.shopHats.textContent = '';
    for (const o of shopToday()) {
      const owned = isOwned(o), rar = rarityOf(o.item);
      const el = document.createElement('div');
      el.className = 'offer' + (o.deal ? ' deal' : '');
      el.style.setProperty('--rar', rar.color);
      const src = o.type === 'skin' ? thumb(o.item, hat) : thumb(skin, o.item.id);
      const price = owned ? 'Im Besitz' : (o.deal ? `<s>${o.item.price}</s> ` : '') + `✦ ${o.price}`;
      el.innerHTML = (o.deal ? '<span class="ribbon">Angebot −30 %</span>' : '') +
        `<img alt="" src="${src}"><b>${o.item.name}</b><small class="rar">${rar.name}</small>` +
        `<button class="buy${!owned && save.shards < o.price ? ' poor' : ''}"${owned ? ' disabled' : ''}>${price}</button>`;
      if (!owned) tapButton(el.querySelector('.buy'), () => buy(o));
      (o.type === 'skin' ? ui.shopSkins : ui.shopHats).append(el);
    }
    if (save.shopSeen !== shopDate) { save.shopSeen = shopDate; persist(); }
  }
  function buy(o) {
    sfx.unlock();
    if (isOwned(o)) return;
    if (save.shards < o.price) {
      sfx.thud();
      toast(`Dir fehlen noch ${o.price - save.shards} ✦`);
      return;
    }
    save.shards -= o.price;
    if (o.type === 'skin') { save.owned.push(o.item.id); save.skin = o.item.id; }
    else { save.hats.push(o.item.id); save.hat = o.item.id; }
    applyLook();
    persist();
    sfx.best();
    toast(`${o.item.name} gekauft und angelegt!`);
    renderShop();
    refreshTitle();
  }

  // ---- Garderobe: gekaufte Figuren und Kopfschmuck anlegen ----
  let wardTab = 'skins';
  function openWardrobe() {
    setState('menu');
    renderWardrobe();
    showScreen('wardrobe');
  }
  function renderWardrobe() {
    ui.wardPreview.src = thumb(skin, hat);
    ui.wardName.textContent = skin.name + (hat ? ' · ' + hatName(hat) : '');
    document.querySelectorAll('[data-wtab]').forEach(b => b.classList.toggle('on', b.dataset.wtab === wardTab));
    ui.wardGrid.textContent = '';
    const isSkins = wardTab === 'skins';
    const list = isSkins ? SKINS : [{ id: null, name: 'Ohne', rarity: 'common' }, ...HATS];
    for (const it of list) {
      const owned = isSkins ? save.owned.includes(it.id) : (it.id === null || save.hats.includes(it.id));
      const active = isSkins ? save.skin === it.id : save.hat === it.id;
      const b = document.createElement('button');
      b.className = 'tile' + (active ? ' sel' : '') + (owned ? '' : ' locked');
      b.style.setProperty('--rar', rarityOf(it).color);
      const src = isSkins ? thumb(it, null) : thumb(skin, it.id);
      b.innerHTML = `<img alt="" src="${src}"><b>${it.name}</b><small>${active ? 'Angelegt' : owned ? 'Anlegen' : '🔒 Shop'}</small>`;
      tapButton(b, () => {
        sfx.unlock();
        if (!owned) { sfx.thud(); toast('Gibt es im Shop – schau jeden Tag rein!'); return; }
        if (isSkins) save.skin = it.id; else save.hat = it.id;
        applyLook();
        persist();
        sfx.shard();
        renderWardrobe();
      });
      ui.wardGrid.append(b);
    }
  }

  // ---- Missionen ----
  function missionRows(day) {
    return day.missions.map(m => {
      const d = missionDef(m.id);
      const prog = Math.min(m.prog, d.goal);
      const pct = Math.round(prog / d.goal * 100);
      return `<li class="${m.done ? 'done' : ''}"><div class="mtop"><span class="mtext">${m.done ? '✔ ' : ''}${d.text}</span>` +
        `<span class="mrew">✦ ${d.reward}</span></div><div class="bar"><i style="width:${pct}%"></i></div><small>${prog} / ${d.goal}</small></li>`;
    }).join('');
  }
  function openMissions() {
    const day = ensureDay();
    setState('menu');
    ui.missionList.innerHTML = missionRows(day);
    ui.missionToday.textContent = String(day.best);
    showScreen('missions');
  }

  /* ================= 9. Eingabe ================= */
  function press() {
    switch (game.state) {
      case 'title': startGame(); break;
      case 'play': flap(); break;
      case 'over': if (performance.now() - game.overAt > 600) startGame(); break; // Schutz vor Versehen-Tipp
      default: break;   // menu, paused, dying: Tippen ins Leere tut nichts
    }
  }

  function toggleMute() {
    sfx.setMuted(!sfx.muted);
    ui.btnMute.textContent = sfx.muted ? '🔇' : '🔊';
  }

  stage.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    press();
  }, { passive: false });

  // Buttons und Links lösen keinen Flügelschlag aus
  stage.querySelectorAll('button, a').forEach(el => el.addEventListener('pointerdown', e => e.stopPropagation()));
  const onClick = (id, fn) => $(id).addEventListener('click', e => { e.currentTarget.blur(); fn(); });
  onClick('btnStart', startGame);
  onClick('btnRetry', startGame);
  onClick('btnHome', toTitle);
  onClick('btnResume', resume);
  onClick('btnQuit', toTitle);
  onClick('btnPause', () => (game.state === 'paused' ? resume() : pause()));
  onClick('btnMute', toggleMute);
  onClick('btnShop', openShop);
  onClick('btnWardrobe', openWardrobe);
  onClick('btnMissions', openMissions);
  document.querySelectorAll('[data-close]').forEach(el => tapButton(el, backToTitle));
  document.querySelectorAll('[data-wtab]').forEach(el => tapButton(el, () => { wardTab = el.dataset.wtab; renderWardrobe(); }));

  window.addEventListener('keydown', e => {
    const k = e.code;
    if (k === 'Space' || k === 'ArrowUp' || k === 'KeyW' || k === 'Enter') {
      e.preventDefault();
      if (e.repeat) return;               // gedrückt halten ≠ Dauerflattern
      if (game.state === 'paused') resume(); else press();
    } else if (k === 'KeyP' || k === 'Escape') {
      if (game.state === 'play') pause();
      else if (game.state === 'paused') resume();
      else if (game.state === 'menu') backToTitle();
    } else if (k === 'KeyM') {
      toggleMute();
    }
  });

  // Kein Scrollen, Zoomen oder Kontextmenü während des Spiels (vor allem iOS Safari)
  document.addEventListener('touchmove', e => { if (!(e.target.closest && e.target.closest('.scroll'))) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault());
  stage.addEventListener('contextmenu', e => e.preventDefault());

  // Automatisch pausieren und speichern, wenn der Tab/die App verlassen wird
  document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); persist(); } });
  window.addEventListener('pagehide', persist);
  window.addEventListener('blur', pause);
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));

  /* ================= 10. Game Loop ================= */
  let lastTime = 0;
  function frame(now) {
    let dt = lastTime ? (now - lastTime) / 1000 : 0;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;             // nach Tab-Wechsel keinen Riesensprung machen
    if (game.state !== 'paused' && dt > 0) {
      // In gleich große Teilschritte ≤ 1/120 s zerlegen: flüssig bei 60 und 120 Hz
      const steps = Math.ceil(dt / MAX_STEP), h = dt / steps;
      for (let i = 0; i < steps; i++) update(h);
      if (game.state === 'play') hudPowers();
    }
    render();
    requestAnimationFrame(frame);
  }

  // Start
  ui.btnMute.textContent = sfx.muted ? '🔇' : '🔊';
  setState('title');
  refreshTitle();
  resize();
  requestAnimationFrame(frame);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Kleine Test-/Werkzeugschnittstelle (automatische Tests und App-Icon)
  window.FF = {
    get state() { return game.state; },
    get score() { return game.score; },
    get best() { return save.best; },
    get bird() { return game.bird; },
    get pillars() { return game.pillars; },
    get items() { return game.items; },
    get world() { return game.world; },
    get combo() { return game.combo; },
    get shield() { return game.shield; },
    get save() { return save; },
    get diff() { return diff.id; },
    get bonusT() { return game.bonusT; },
    setDiff,
    start: startGame, flap, pause, resume,
    cheat: {
      score(n) { game.score = n; game.run.score = n; bumpScore(); worldCheck(); checkMissions(); },
      give(kind) { collect({ kind, x: game.bird.x, y: game.bird.y }); },
      hat(id) { save.hats.push(id); save.hat = id; applyLook(); },
      skin(id) { save.owned.push(id); save.skin = id; applyLook(); },
      shards(n) { save.shards += n; persist(); refreshTitle(); }
    },
    icon(size) {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, size);
      gr.addColorStop(0, '#2a1b66'); gr.addColorStop(1, '#c45a9a');
      g.fillStyle = gr; g.fillRect(0, 0, size, size);
      g.setTransform(size / 70, 0, 0, size / 70, size * 0.54, size * 0.52);
      g.rotate(-0.2);
      drawPip(g, 0.5, 1, SKINS[0], null);
      return c.toDataURL('image/png');
    }
  };
})();
