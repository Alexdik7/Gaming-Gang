/*
 * Funkenflug – Arcade-Flugspiel.
 * Pip, ein kleines Leuchtwesen, fliegt durch Lücken zwischen schwebenden Kristallsäulen.
 *
 * Aufbau (alles in einer IIFE, damit keine globalen Variablen entstehen):
 *   1. Konstanten & Hilfsfunktionen
 *   2. Speicher (localStorage, abgesichert)
 *   3. DOM & Ansicht (Canvas-Skalierung)
 *   4. Sound (Web Audio, alles synthetisch)
 *   5. Partikel (fester Pool, keine Speicherlecks)
 *   6. Spielzustand & Logik
 *   7. Zeichnen
 *   8. Eingabe
 *   9. Game Loop
 */
(() => {
  'use strict';

  /* ================= 1. Konstanten & Hilfsfunktionen ================= */
  const H = 640;                 // logische Welthöhe – alles wird darauf skaliert
  const MIN_W = 320;             // schmaler als das wird nicht gezeigt (dann mehr Himmel oben)
  const GROUND_H = 84;
  const GROUND_Y = H - GROUND_H; // Oberkante des Bodens
  const GRAVITY = 1550;          // Einheiten / s²
  const FLAP_V = -440;           // Auftrieb pro Flügelschlag
  const MAX_FALL = 720;          // maximale Fallgeschwindigkeit
  const BIRD_R = 12;             // Kollisionsradius (etwas kleiner als die Figur = fair)
  const PILLAR_W = 72;
  const CAP_H = 26;              // Höhe des Kristallkopfs an der Lücke
  const SPACING = 250;           // Abstand zwischen zwei Säulenpaaren
  const MAX_STEP = 1 / 120;      // größter Physik-Teilschritt
  const KEY_BEST = 'funkenflug.best';
  const KEY_MUTE = 'funkenflug.mute';
  const RANKS = [[0, 'Funke'], [10, 'Glühwürmchen'], [25, 'Sternschnuppe'], [50, 'Komet'], [100, 'Polarlicht']];
  const TAU = Math.PI * 2;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const hash = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  /* ================= 2. Speicher ================= */
  // localStorage kann im privaten Modus oder bei file:// fehlen → nie abstürzen
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, String(value)); } catch (e) { /* ignorieren */ }
    }
  };

  /* ================= 3. DOM & Ansicht ================= */
  const $ = id => document.getElementById(id);
  const stage = $('stage');
  const canvas = $('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const ui = {
    score: $('score'), titleBest: $('titleBest'),
    overScore: $('overScore'), overBest: $('overBest'), newBest: $('newBest'), rank: $('rank'),
    title: $('titleScreen'), pause: $('pauseScreen'), over: $('overScreen'),
    btnMute: $('btnMute'), btnPause: $('btnPause')
  };

  // W = sichtbare Weltbreite, oy = zusätzlicher Himmel oben bei sehr schmalen Bildschirmen
  const view = { W: 400, scale: 1, dpr: 1, oy: 0 };
  const cache = { sky: document.createElement('canvas'), ground: null };

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
    buildSky();
    buildGround();
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
      milestone() { if (!ensure()) return; [784, 988, 1175, 1568].forEach((f, i) => tone('triangle', f, f, 0.16, 0.16, i * 0.06)); },
      hit() { if (!ensure()) return; noise(0.35, 0.45, 600); tone('square', 240, 50, 0.38, 0.12); },
      thud() { if (!ensure()) return; noise(0.18, 0.3, 180); },
      best() { if (!ensure()) return; [523, 659, 784, 1046, 1318].forEach((f, i) => tone('sine', f, f, 0.22, 0.18, i * 0.08)); }
    };
  })();

  /* ================= 5. Partikel ================= */
  // Fester Pool: es werden nie neue Objekte erzeugt → keine Müllsammlung während des Spiels
  const particles = Array.from({ length: 200 }, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: '#fff', kind: 0, g: 0, text: '' }));
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
    state: 'title',   // title | play | paused | dying | over
    time: 0,          // Animationsuhr (läuft immer, außer in der Pause)
    t: 0,             // Spielzeit der aktuellen Runde
    score: 0,
    best: parseInt(store.get(KEY_BEST, '0'), 10) || 0,
    speed: 0,
    scroll: 0,        // zurückgelegte Strecke (für Parallaxe und Boden)
    pillars: [],
    bird: { x: 100, y: H * 0.45, vy: 0, rot: 0, wing: 0, flapT: 0 },
    shake: 0, flash: 0,
    deadT: 0, landed: false, overAt: 0, newBest: false
  };

  function setState(s) {
    game.state = s;
    stage.dataset.state = s;
    ui.btnPause.textContent = s === 'paused' ? '▶' : '❚❚';
  }
  function showScreen(name) {
    ui.title.classList.toggle('show', name === 'title');
    ui.pause.classList.toggle('show', name === 'pause');
    ui.over.classList.toggle('show', name === 'over');
  }

  // 0 = Anfang, 1 = maximale Schwierigkeit. Steigt mit Punkten UND Zeit.
  const difficulty = () => Math.min(1, game.score * 0.035 + game.t * 0.0035);

  function reset() {
    game.pillars.length = 0;
    game.score = 0; game.t = 0;
    game.speed = 155;
    game.shake = 0; game.flash = 0;
    game.deadT = 0; game.landed = false; game.newBest = false;
    const b = game.bird;
    b.x = birdX(); b.y = H * 0.45; b.vy = 0; b.rot = 0; b.flapT = 0;
    clearParticles();
    ui.score.textContent = '0';
  }

  function spawnPillar(x) {
    const d = difficulty();
    const gap = lerp(182, 140, d) + rand(-12, 12);       // Lücke wird kleiner, schwankt leicht
    const margin = 58;
    const minC = margin + gap / 2, maxC = GROUND_Y - margin - gap / 2;
    const prev = game.pillars.length ? game.pillars[game.pillars.length - 1].gapY : (minC + maxC) / 2;
    const maxShift = lerp(120, 210, d);                  // Höhenwechsel werden größer
    const gapY = clamp(prev + rand(-maxShift, maxShift), minC, maxC);
    game.pillars.push({ x, gapY, gap, scored: false, pal: Math.floor(Math.random() * PALETTES.length), seed: Math.random() * 10 });
  }

  function startGame() {
    sfx.unlock();
    reset();
    setState('play');
    showScreen(null);
    // Erste Säule mit etwas Vorlauf, damit man sich orientieren kann
    spawnPillar(Math.max(view.W + 40, game.bird.x + 380));
    flap();
  }

  function flap() {
    if (game.state !== 'play') return;
    const b = game.bird;
    b.vy = FLAP_V;
    b.flapT = 1;
    sfx.flap();
    for (let i = 0; i < 4; i++) {
      emit(b.x - 14, b.y + 6, { vx: rand(-160, -60), vy: rand(20, 120), life: rand(0.3, 0.5), size: rand(2, 3.5), color: i % 2 ? '#ffd27a' : '#fff1b8' });
    }
  }

  function addPoint(p) {
    game.score++;
    ui.score.textContent = String(game.score);
    ui.score.classList.remove('bump');
    void ui.score.offsetWidth;          // Reflow erzwingen, damit die Animation neu startet
    ui.score.classList.add('bump');
    const b = game.bird;
    emit(b.x, b.y, { kind: P_RING, life: 0.45, size: 14, color: '#5ef2d6' });
    emit(b.x + 6, b.y - 22, { kind: P_TEXT, vy: -60, life: 0.7, text: '+1', color: '#fff7e8' });
    burst(p.x + PILLAR_W / 2, p.gapY, 8, ['#5ef2d6', '#ffd27a', '#ffffff'], 140, 0.5);
    if (game.score % 10 === 0) { sfx.milestone(); game.flash = 0.25; burst(b.x, b.y, 18, ['#ffd27a', '#ff8ac4', '#5ef2d6'], 260, 0.8); }
    else sfx.point();
  }

  function die(cause) {
    if (game.state !== 'play') return;
    setState('dying');
    game.deadT = 0;
    game.shake = 12;
    game.flash = 0.9;
    const b = game.bird;
    game.landed = cause === 'ground';
    if (!game.landed) b.vy = -260;      // kleiner Abpraller vom Kristall
    sfx.hit();
    burst(b.x, b.y, 26, ['#ffb53d', '#fff1b8', '#5ef2d6', '#ff8ac4'], 320, 0.8, 500);
    if (navigator.vibrate) navigator.vibrate(40);
  }

  function showOver() {
    setState('over');
    game.overAt = performance.now();
    if (game.score > game.best) {
      game.best = game.score;
      game.newBest = true;
      store.set(KEY_BEST, game.best);
      sfx.best();
    }
    ui.overScore.textContent = String(game.score);
    ui.overBest.textContent = String(game.best);
    ui.newBest.classList.toggle('show', game.newBest);
    let rank = RANKS[0][1];
    for (const [min, name] of RANKS) if (game.score >= min) rank = name;
    ui.rank.innerHTML = 'Rang: <b>' + rank + '</b>';
    showScreen('over');
  }

  function toTitle() {
    reset();
    setState('title');
    ui.titleBest.textContent = String(game.best);
    showScreen('title');
  }

  function pause() {
    if (game.state !== 'play') return;
    setState('paused');
    showScreen('pause');
  }
  function resume() {
    if (game.state !== 'paused') return;
    setState('play');
    game.bird.vy = Math.min(game.bird.vy, 0);   // nach der Pause nicht sofort abstürzen
    showScreen(null);
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

  function updateTitle(dt) {
    const b = game.bird;
    game.scroll += 70 * dt;
    b.x = birdX();
    b.y = H * 0.45 + Math.sin(game.time * 2.6) * 12;
    b.rot = Math.cos(game.time * 2.6) * -0.12;
    if (Math.random() < dt * 6) emit(b.x - 16, b.y + 4, { vx: rand(-80, -30), vy: rand(-10, 30), life: 0.6, size: 2, color: '#ffd27a' });
  }

  function updatePlay(dt) {
    game.t += dt;
    game.speed = lerp(155, 270, difficulty());
    const b = game.bird;

    // Physik der Figur
    b.vy = Math.min(b.vy + GRAVITY * dt, MAX_FALL);
    b.y += b.vy * dt;
    if (b.y < -view.oy - 40) { b.y = -view.oy - 40; b.vy = Math.max(b.vy, 0); } // weiche Decke
    const target = clamp(b.vy / 520, -0.5, 1.25);   // nach oben neigen beim Steigen, nach unten beim Fallen
    b.rot += (target - b.rot) * Math.min(1, dt * 12);

    // Säulen bewegen, Punkte vergeben, Kollision prüfen
    const dx = game.speed * dt;
    game.scroll += dx;
    const ps = game.pillars;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.x -= dx;
      if (!p.scored && p.x + PILLAR_W < b.x) { p.scored = true; addPoint(p); }
      if (hitsPillar(p, b)) { die('pillar'); return; }
    }
    // Nachschub rechts, Aufräumen links
    let last = ps[ps.length - 1];
    while (!last || last.x <= view.W + 40 - SPACING) {
      spawnPillar(last ? last.x + SPACING : view.W + 40);
      last = ps[ps.length - 1];
    }
    while (ps.length && ps[0].x + PILLAR_W < -40) ps.shift();

    // Boden
    if (b.y + BIRD_R >= GROUND_Y) { b.y = GROUND_Y - BIRD_R; die('ground'); }
  }

  function updateDying(dt) {
    game.deadT += dt;
    const b = game.bird;
    if (!game.landed) {
      b.vy = Math.min(b.vy + GRAVITY * dt, MAX_FALL);
      b.y += b.vy * dt;
      b.rot += dt * 9;                   // Trudeln
      if (b.y + BIRD_R >= GROUND_Y) {
        b.y = GROUND_Y - BIRD_R;
        game.landed = true;
        game.shake = Math.max(game.shake, 6);
        sfx.thud();
        burst(b.x, GROUND_Y, 10, ['#9b7fd6', '#6fe3b4'], 120, 0.5, 300);
      }
    }
    if ((game.landed && game.deadT > 0.8) || game.deadT > 2.5) showOver();
  }

  function update(dt) {
    game.time += dt;
    game.flash = Math.max(0, game.flash - dt * 2.5);
    game.shake = Math.max(0, game.shake - dt * 30);
    updateBirdAnim(dt);
    if (game.state === 'title') updateTitle(dt);
    else if (game.state === 'play') updatePlay(dt);
    else if (game.state === 'dying') updateDying(dt);
    updateParticles(dt);
  }

  /* ================= 7. Zeichnen ================= */
  const INK = '#2b1d55';
  // Kristallfarben: hell (Lichtseite), mittel, dunkel (Schattenseite), Kopf
  const PALETTES = [
    ['#d8c2ff', '#9b6cf5', '#4b2aa8', '#efe6ff'],
    ['#b9fff3', '#3fd0c0', '#17707f', '#e6fffb'],
    ['#ffd0ea', '#f07ab8', '#9c2f72', '#fff0f8']
  ].map(([a, b, c, cap]) => {
    // Verläufe einmal anlegen (lokale Koordinaten 0..PILLAR_W, gelten nach translate)
    const body = ctx.createLinearGradient(0, 0, PILLAR_W, 0);
    body.addColorStop(0, a); body.addColorStop(0.34, b); body.addColorStop(0.35, c); body.addColorStop(1, INK);
    const head = ctx.createLinearGradient(-4, 0, PILLAR_W + 4, 0);
    head.addColorStop(0, cap); head.addColorStop(0.5, a); head.addColorStop(1, b);
    return { body, head, edge: c };
  });

  function buildSky() {
    const c = cache.sky;
    c.width = canvas.width; c.height = canvas.height;
    const g = c.getContext('2d');
    const k = view.scale * view.dpr, top = -view.oy, W = view.W;
    g.setTransform(k, 0, 0, k, 0, view.oy * k);
    const gr = g.createLinearGradient(0, top, 0, GROUND_Y);
    gr.addColorStop(0, '#140f35'); gr.addColorStop(0.42, '#47298a');
    gr.addColorStop(0.75, '#c45a9a'); gr.addColorStop(1, '#ffb07a');
    g.fillStyle = gr;
    g.fillRect(0, top, W, H - top);
    // Sterne mit festem Zufall, damit sie beim Drehen nicht springen
    let s = 7;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const n = Math.round(W * (H - top) / 2600);
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, y = top + rnd() * (H * 0.55 - top);
      g.globalAlpha = 0.25 + 0.75 * (1 - (y - top) / (H * 0.55 - top)) * rnd();
      g.fillStyle = rnd() < 0.15 ? '#ffe3a8' : '#ffffff';
      g.beginPath(); g.arc(x, y, 0.5 + rnd() * 1.2, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    // Ringplanet
    const px = W * 0.78, py = top + 120;
    const pg = g.createRadialGradient(px - 14, py - 14, 4, px, py, 44);
    pg.addColorStop(0, '#ffe9c4'); pg.addColorStop(1, '#e27aa8');
    g.fillStyle = 'rgba(255,200,230,0.12)';
    g.beginPath(); g.arc(px, py, 70, 0, TAU); g.fill();
    g.fillStyle = pg;
    g.beginPath(); g.arc(px, py, 44, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,240,220,0.7)'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(px, py, 72, 14, -0.3, 0, TAU); g.stroke();
  }

  function buildGround() {
    const k = view.scale * view.dpr;
    const tw = 64, th = GROUND_H + 16;            // Kachel beginnt 16 Einheiten über dem Boden (Moos-Kante)
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(tw * k));
    c.height = Math.max(1, Math.ceil(th * k) + 2);
    const g = c.getContext('2d');
    g.setTransform(c.width / tw, 0, 0, k, 0, 0);  // x exakt auf ganze Pixel → keine Nähte
    const soil = g.createLinearGradient(0, 16, 0, th);
    soil.addColorStop(0, '#5a338f'); soil.addColorStop(1, '#1e1440');
    g.fillStyle = soil; g.fillRect(0, 14, tw, th);
    // schräge Bänder geben Tempo-Gefühl
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = -64; x < 64; x += 32) {
      g.beginPath(); g.moveTo(x, th); g.lineTo(x + 16, th); g.lineTo(x + 16 + 40, 26); g.lineTo(x + 40, 26); g.closePath(); g.fill();
    }
    // Leuchtpunkte
    g.fillStyle = 'rgba(255,210,122,0.5)';
    [[10, 50], [42, 66], [26, 80]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); });
    // Moos-Kante (Welle mit Periode 64 → nahtlos)
    g.fillStyle = '#3fb98a';
    g.beginPath(); g.moveTo(0, 30);
    for (let x = 0; x <= tw; x += 4) g.lineTo(x, 19 + Math.sin(x / tw * TAU * 2) * 3);
    g.lineTo(tw, 30); g.closePath(); g.fill();
    g.fillStyle = '#7ef0c0';
    g.beginPath(); g.moveTo(0, 22);
    for (let x = 0; x <= tw; x += 4) g.lineTo(x, 15 + Math.sin(x / tw * TAU * 2) * 3);
    g.lineTo(tw, 22); g.closePath(); g.fill();
    // Leuchtpilz
    g.fillStyle = '#e9dcff'; g.fillRect(45, 6, 3, 10);
    g.fillStyle = '#ff8ac4';
    g.beginPath(); g.ellipse(46.5, 7, 7, 4.5, 0, Math.PI, TAU); g.fill();
    g.fillStyle = '#fff'; g.fillRect(43, 4, 2, 1.5); g.fillRect(48, 3.5, 1.5, 1.5);
    cache.ground = c;
  }

  function drawAurora() {
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
      ctx.strokeStyle = i ? 'rgba(94,242,214,0.09)' : 'rgba(255,120,200,0.08)';
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

  function drawIslands() {
    const P = 560, off = game.scroll * 0.3;
    ctx.globalAlpha = 0.75;
    for (let i = Math.floor((off - 300) / P); ; i++) {
      const x = i * P + hash(i) * 220 - off;
      if (x > view.W + 120) break;
      drawIsland(x, 220 + hash(i + 7) * 150, 0.7 + hash(i + 3) * 0.5, i);
    }
    ctx.globalAlpha = 1;
  }

  function drawClouds() {
    const P = 300, off = game.scroll * 0.55;
    ctx.fillStyle = 'rgba(255,225,240,0.22)';
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
      if (p.x > view.W + 10 || p.x + PILLAR_W < -10) continue;
      const pal = PALETTES[p.pal];
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

  function drawGround(sx, sy) {
    const tile = cache.ground, k = view.scale * view.dpr;
    const gy = Math.round((GROUND_Y - 16 + view.oy + sy) * k);
    const off = ((game.scroll % 64) / 64) * tile.width;
    const sxp = Math.round(sx * k);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let x = -Math.round(off) - tile.width + sxp; x < canvas.width; x += tile.width) ctx.drawImage(tile, x, gy);
    if (gy + tile.height < canvas.height) { ctx.fillStyle = '#1e1440'; ctx.fillRect(0, gy + tile.height, canvas.width, canvas.height); }
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

  // Pip: rundes Minz-Wesen mit Leuchtlaterne als Schwanz, Visier-Auge und Glasflügeln.
  function drawPip(c, wingA, glow) {
    const hg = c.createRadialGradient(-15, 3, 0, -15, 3, 36);
    hg.addColorStop(0, `rgba(255,190,80,${0.55 * glow})`); hg.addColorStop(1, 'rgba(255,190,80,0)');
    c.fillStyle = hg; c.beginPath(); c.arc(-15, 3, 36, 0, TAU); c.fill();

    wing(c, -3, -9, wingA + 0.35, 'rgba(150,220,255,0.45)');           // hinterer Flügel

    c.lineWidth = 2; c.strokeStyle = INK;
    c.fillStyle = '#ffb53d';                                           // Laterne
    c.beginPath(); c.ellipse(-15, 4, 10, 8.5, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = `rgba(255,241,184,${0.6 + glow * 0.4})`;
    c.beginPath(); c.ellipse(-16, 3, 5, 4, 0, 0, TAU); c.fill();

    const bg = c.createLinearGradient(0, -16, 0, 16);                  // Körper
    bg.addColorStop(0, '#9dfbe9'); bg.addColorStop(1, '#1fae9b');
    c.fillStyle = bg; c.beginPath(); c.arc(2, 0, 15, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath(); c.ellipse(4, 8, 8, 4, 0, 0, TAU); c.fill();

    c.beginPath(); c.moveTo(1, -14); c.quadraticCurveTo(0, -25, -7, -27); c.stroke(); // Antenne
    c.fillStyle = '#ffd27a'; c.beginPath(); c.arc(-7, -27, 3.2, 0, TAU); c.fill();

    c.fillStyle = '#fff';                                              // Auge
    c.beginPath(); c.ellipse(9, -4, 7.5, 7, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = INK; c.beginPath(); c.arc(11, -4, 3.6, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(12.4, -5.5, 1.3, 0, TAU); c.fill();

    c.fillStyle = '#ff7a59';                                           // Nasenspitze
    c.beginPath(); c.moveTo(15, 2); c.lineTo(23, 5); c.lineTo(15, 9); c.closePath(); c.fill(); c.stroke();

    wing(c, -1, -8, wingA, 'rgba(225,250,255,0.8)');                  // vorderer Flügel
  }

  function drawParticles() {
    ctx.textAlign = 'center';
    ctx.font = '900 22px system-ui, sans-serif';
    for (const p of particles) {
      if (!p.on) continue;
      const a = p.life / p.max;
      ctx.globalAlpha = a;
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

  function render() {
    const k = view.scale * view.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(cache.sky, 0, 0);

    let sx = 0, sy = 0;
    if (game.shake > 0) { sx = (Math.random() * 2 - 1) * game.shake; sy = (Math.random() * 2 - 1) * game.shake; }
    ctx.setTransform(k, 0, 0, k, 0, view.oy * k);
    drawAurora();
    drawRidge(0.08, 470, 70, '#3a2470', 0.006, 0.013);
    drawIslands();
    drawRidge(0.18, 520, 50, '#2c1a5a', 0.011, 0.023);
    drawClouds();

    ctx.setTransform(k, 0, 0, k, sx * k, (view.oy + sy) * k);
    drawPillars();
    drawGround(sx, sy);

    ctx.setTransform(k, 0, 0, k, sx * k, (view.oy + sy) * k);
    drawParticles();
    const b = game.bird;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    drawPip(ctx, Math.sin(b.wing) * 0.8, 0.8 + Math.sin(game.time * 6) * 0.2);
    ctx.restore();

    if (game.flash > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = `rgba(255,245,230,${Math.min(1, game.flash) * 0.8})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  /* ================= 8. Eingabe ================= */
  function press() {
    switch (game.state) {
      case 'title': startGame(); break;
      case 'play': flap(); break;
      case 'over': if (performance.now() - game.overAt > 600) startGame(); break; // Schutz vor Versehen-Tipp
      default: break;
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

  window.addEventListener('keydown', e => {
    const k = e.code;
    if (k === 'Space' || k === 'ArrowUp' || k === 'KeyW' || k === 'Enter') {
      e.preventDefault();
      if (e.repeat) return;               // gedrückt halten ≠ Dauerflattern
      if (game.state === 'paused') resume(); else press();
    } else if (k === 'KeyP' || k === 'Escape') {
      if (game.state === 'play') pause(); else if (game.state === 'paused') resume();
    } else if (k === 'KeyM') {
      toggleMute();
    }
  });

  // Kein Scrollen, Zoomen oder Kontextmenü während des Spiels (vor allem iOS Safari)
  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault());
  stage.addEventListener('contextmenu', e => e.preventDefault());

  // Automatisch pausieren, wenn der Tab/die App verlassen wird
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('blur', pause);
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));

  /* ================= 9. Game Loop ================= */
  let lastTime = 0;
  function frame(now) {
    let dt = lastTime ? (now - lastTime) / 1000 : 0;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;             // nach Tab-Wechsel keinen Riesensprung machen
    if (game.state !== 'paused' && dt > 0) {
      // In gleich große Teilschritte ≤ 1/120 s zerlegen: flüssig bei 60 und 120 Hz
      const steps = Math.ceil(dt / MAX_STEP), h = dt / steps;
      for (let i = 0; i < steps; i++) update(h);
    }
    render();
    requestAnimationFrame(frame);
  }

  // Start
  ui.btnMute.textContent = sfx.muted ? '🔇' : '🔊';
  ui.titleBest.textContent = String(game.best);
  setState('title');
  resize();
  requestAnimationFrame(frame);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Kleine Test-/Werkzeugschnittstelle (z. B. für automatische Tests und das App-Icon)
  window.FF = {
    get state() { return game.state; },
    get score() { return game.score; },
    get best() { return game.best; },
    get bird() { return game.bird; },
    get pillars() { return game.pillars; },
    start: startGame, flap, pause, resume,
    icon(size) {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, size);
      gr.addColorStop(0, '#2a1b66'); gr.addColorStop(1, '#c45a9a');
      g.fillStyle = gr; g.fillRect(0, 0, size, size);
      g.setTransform(size / 70, 0, 0, size / 70, size * 0.54, size * 0.52);
      g.rotate(-0.2);
      drawPip(g, 0.5, 1);
      return c.toDataURL('image/png');
    }
  };
})();
