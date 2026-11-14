/* GymDesk Making-of: zeitgesteuerter Film (pausierbar, Kapitel springen).
   Akt 1: Claude baut die App Phase für Phase. Akt 2: So wird die fertige App bedient. */
const $ = (s, r = document) => r.querySelector(s);
const stage = $('#stage'), cam = $('#cam'), closeup = $('#closeup');
/* Aufnahmemodus (?rec): ohne Bedienleiste, Töne werden für die Videospur protokolliert. */
const REC = new URLSearchParams(location.search).has('rec');
if (REC) { document.body.classList.add('rec'); window.__sfx = []; }

/* ---------- Claude-Figur ---------- */
function claudeSVG(front) {
  const rays = Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4, l = i % 2 ? 11 : 16; return `<line x1="100" y1="20" x2="${100 + Math.cos(a) * l}" y2="${20 + Math.sin(a) * l}"/>`; }).join('');
  const face = front ? `
    <g class="eyes"><g class="eye-o"><ellipse cx="78" cy="128" rx="10" ry="14" fill="#2a1a14"/><circle cx="81.5" cy="122" r="3.6" fill="#fff"/>
      <ellipse cx="122" cy="128" rx="10" ry="14" fill="#2a1a14"/><circle cx="125.5" cy="122" r="3.6" fill="#fff"/></g>
      <g class="eye-happy" fill="none" stroke="#2a1a14" stroke-width="6" stroke-linecap="round"><path d="M66 132 Q78 114 90 132"/><path d="M110 132 Q122 114 134 132"/></g></g>
    <g class="lids" fill="#D97757"><rect x="64" y="110" width="28" height="34"/><rect x="108" y="110" width="28" height="34"/></g>
    <ellipse cx="60" cy="152" rx="11" ry="6" fill="#f2a08a" opacity=".75"/><ellipse cx="140" cy="152" rx="11" ry="6" fill="#f2a08a" opacity=".75"/>
    <path class="mouth-n" d="M90 156 Q100 165 110 156" stroke="#2a1a14" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path class="mouth-h" d="M85 151 Q100 176 115 151 Z" fill="#7a2e1e"/>` : `<path d="M100 70 Q104 140 100 205" stroke="#c4694a" stroke-width="3" fill="none" opacity=".5"/>`;
  return `<svg viewBox="0 0 200 230" width="100%" height="100%">
    <ellipse cx="100" cy="222" rx="62" ry="8" fill="rgba(0,0,0,.28)"/>
    <g class="body-bob">
      <ellipse cx="74" cy="210" rx="19" ry="10" fill="#b85c3e"/><ellipse cx="126" cy="210" rx="19" ry="10" fill="#b85c3e"/>
      <g class="arm l"><rect x="20" y="${front ? 120 : 100}" width="26" height="56" rx="13" fill="#c96646"/></g>
      <g class="arm r"><rect x="154" y="${front ? 120 : 100}" width="26" height="56" rx="13" fill="#c96646"/></g>
      <path d="M100 52 C152 52 172 92 172 138 C172 186 142 210 100 210 C58 210 28 186 28 138 C28 92 48 52 100 52Z" fill="#D97757"/>
      <ellipse cx="${front ? 82 : 118}" cy="92" rx="30" ry="17" fill="#eea184" opacity=".55"/>
      ${face}
      <path d="M100 54 L100 34" stroke="#b85c3e" stroke-width="5" stroke-linecap="round"/>
      <g class="spark" stroke="#e8875f" stroke-width="6" stroke-linecap="round">${rays}<circle cx="100" cy="20" r="6" fill="#fff3ea" stroke="none"/></g>
    </g></svg>`;
}

/* ---------- Szene: Zimmer mit Laptop ---------- */
function buildRoom() {
  const stars = Array.from({ length: 26 }, () => `<i class="star" style="left:${Math.random() * 300}px;top:${Math.random() * 180}px;animation-delay:${Math.random() * 3}s"></i>`).join('');
  const city = [[0, 60, 50], [55, 95, 40], [100, 70, 60], [165, 110, 45], [215, 80, 55], [275, 60, 40]].map(([l, hh, w]) => `<i style="left:${l}px;height:${hh}px;width:${w}px"></i>`).join('');
  const books = [['#5b7bd5', 22, 70], ['#e0614a', 18, 62], ['#e9c46a', 26, 76], ['#3f8f63', 20, 58], ['#9a6fd0', 16, 66]].map(([c, w, hh], i) =>
    `<i class="book" style="left:${20 + i * 30}px;width:${w}px;height:${hh}px;background:${c}"></i>`).join('');
  const leaves = [[-30, 20], [-12, 0], [8, 10], [26, -6], [44, 18]].map(([r, l], i) => `<i class="leaf" style="left:${38 + l}px;top:${20 + (i % 2) * 14}px;rotate:${r}deg;animation-delay:${i * .4}s"></i>`).join('');
  cam.innerHTML = `<div class="room"></div>
    <div class="window">${stars}<div class="moon"></div><div class="city">${city}</div></div>
    <div class="shelf">${books}</div><div class="poster">GYM</div>
    <div class="glow lamp-light"></div><div class="lamp"><div class="arm"></div><div class="head"></div><div class="foot"></div></div>
    <div class="desk"></div><div class="notes">To-do:<br>Gym-App<br>fürs iPad ✓</div>
    <div class="mug"><b>✳</b><i class="steam" style="left:20px;top:-50px"></i><i class="steam" style="left:40px;top:-60px;animation-delay:1.2s"></i></div>
    <div class="plant">${leaves}<div class="pot"></div></div>
    <div class="lid"></div><div id="screen"><div id="mock"></div></div><div class="base"></div>
    <div class="glow screen-light"></div>
    <div class="claude back" id="fig-back">${claudeSVG(false)}</div>`;
  closeup.innerHTML = `${[[200, 200, 140, '#d97757'], [1350, 160, 180, '#5b7bd5'], [300, 650, 120, '#e9c46a'], [1400, 640, 150, '#9a6fd0'], [900, 90, 90, '#3f8f63']]
    .map(([l, t, s, c]) => `<i class="bokeh" style="left:${l}px;top:${t}px;width:${s}px;height:${s}px;background:${c}"></i>`).join('')}
    <div class="claude front" id="fig-front">${claudeSVG(true)}</div><div class="lidback"></div>
    <div class="bubble" id="bubble"></div>`;
  $('#start-figure').innerHTML = claudeSVG(true);
}

/* ---------- Kamera, Untertitel, Titel, Ton ---------- */
const SHOTS = { wide: [0, 0, 1], desk: [800 - 800 * 1.35, 450 - 470 * 1.35, 1.35], screen: [800 - 800 * 1.74, 424 - 398 * 1.74, 1.74] };
function camTo(n, instant) {
  const [x, y, s] = SHOTS[n];
  if (instant) cam.style.transition = 'none';
  cam.style.transform = `translate(${x}px,${y}px) scale(${s})`;
  if (instant) { cam.offsetHeight; cam.style.transition = ''; }
}
function caption(text) {
  const el = $('#cap-text');
  el.style.opacity = 0;
  setTimeout(() => { el.textContent = text; el.style.transition = 'opacity .35s'; el.style.opacity = 1; }, 180);
}
function titleCard(on, kicker = '', h = '', p = '') {
  const tc = $('#titlecard');
  if (on) tc.innerHTML = `<div><div class="kicker">${kicker}</div><h1>${h}</h1><p>${p}</p></div>`;
  tc.classList.toggle('on', on);
}
function figure(mode) {
  for (const f of document.querySelectorAll('.claude')) { f.classList.remove('typing', 'cheer', 'think'); if (mode) f.classList.add(mode); }
}
function closeShot(on, mood = '', bubble = '') {
  closeup.classList.toggle('on', on);
  const fig = $('#fig-front');
  fig.classList.toggle('mood-happy', mood === 'happy');
  const b = $('#bubble');
  b.classList.remove('on');
  if (on && bubble) setTimeout(() => { b.innerHTML = bubble; b.classList.add('on'); sfx.pop(); }, 450);
}
function confetti() {
  const box = $('#confetti');
  box.innerHTML = Array.from({ length: 90 }, () => `<i style="left:${Math.random() * 1600}px;background:${['#d97757', '#2f5bea', '#e9c46a', '#3f8f63', '#fff'][Math.floor(Math.random() * 5)]};animation-duration:${2 + Math.random() * 2.5}s;animation-delay:${Math.random() * .8}s"></i>`).join('');
}

let soundOn = false, ac = null, lastKey = 0;
const sfx = {
  beep(f, d, type = 'sine', v = .05) {
    if (REC) window.__sfx.push({ at: Date.now() / 1000, f, d, type, v });
    if (!soundOn) return;
    ac = ac || new AudioContext();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f; g.gain.value = v;
    g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + d);
    o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + d);
  },
  key() { const n = performance.now(); if (n - lastKey > 45) { lastKey = n; this.beep(1800 + Math.random() * 900, .03, 'square', .012); } },
  tap() { this.beep(660, .08, 'sine', .05); },
  pop() { this.beep(520, .12, 'triangle', .05); setTimeout(() => this.beep(780, .12, 'triangle', .04), 70); },
  chime() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.beep(f, .35, 'sine', .04), i * 110)); },
};

/* ---------- Mini-App ---------- */
const M = () => $('#mock');
const q = (s) => M().querySelector(s);
const qa = (s) => [...M().querySelectorAll(s)];
let fp = { x: 640, y: 900 };
function setMock(html) {
  M().innerHTML = html + '<div class="finger"></div>';
  placeFinger();
}
function placeFinger() { const f = q('.finger'); if (f) { f.style.left = fp.x + 'px'; f.style.top = fp.y + 'px'; } }
function rel(e) {
  const m = M().getBoundingClientRect(), r = e.getBoundingClientRect(), k = m.width / 1280;
  return { x: (r.left - m.left) / k, y: (r.top - m.top) / k, w: r.width / k, h: r.height / k };
}
const ease = (p) => (p < .5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
const euro = (v) => v.toFixed(2).replace('.', ',') + ' €';

const NAV = [['dash', '▦', 'Dashboard'], ['anm', '✚', 'Neue Anmeldung'], ['mit', '☰', 'Mitglieder'], ['frm', '▤', 'Formulare'], ['ang', '✉', 'Angebote'], ['set', '⚙', 'Einstellungen']];
const side = (active, b = '') => `<aside class="m-side ${b ? 'slide' : ''}"><div class="m-brand"><span class="m-logo">⇿</span><div>Mein Gym<small>Mitgliederverwaltung</small></div></div>
  ${NAV.map(([k, i, l]) => `<div class="m-nav ${k === active ? 'on' : ''} ${b}" id="nav-${k}"><b>${i}</b>${l}</div>`).join('')}</aside>`;
const app = (active, main, b = '') => `<div class="m-app">${side(active, b)}<main class="m-main">${main}</main></div><div class="m-toast" id="toast"></div>`;
const S = (b) => (b ? 'pop' : 'pop show');

const V = {
  doc: () => `<div class="doc"><h2>Anforderungen: Gym-Mitgliederverwaltung</h2><p>Für das iPad an der Theke · modular · sicher</p>
    ${['Neue Anmeldung in 9 Schritten', 'Digitale Unterschrift auf dem iPad', 'Mitglieder: Suche, Filter, Kundenmaske', 'Abgeschlossene Formulare unveränderbar', 'Angebote per E-Mail mit Platzhaltern', 'Einstellungen ohne Code', 'Datenschutz & Verschlüsselung von Anfang an']
      .map((t) => `<div class="req-item"><i>✓</i>${t}</div>`).join('')}</div>`,
  er: () => {
    const B = [['Member', 60, 60, ['id', 'memberNo', 'name, adresse']], ['Contract', 420, 60, ['memberId →', 'contractNo', 'status, hash']], ['Signature', 800, 40, ['contractId →', 'dataUrl', 'signedAt']],
      ['Consent', 800, 300, ['contractId →', 'key, given', 'text, at']], ['MembershipPlan', 420, 330, ['name, preis', 'laufzeit', 'kündigungsfrist']], ['AddOn', 60, 330, ['name, preis', 'abrechnung']],
      ['Offer', 60, 560, ['betreff, inhalt', 'filter, status']], ['EmailLog', 420, 580, ['offerId →', 'memberId →', 'status']], ['ActivityLog', 800, 560, ['memberId →', 'text, at']]];
    const L = ['M250 110 L420 110', 'M610 100 L800 90', 'M610 130 Q700 300 800 340', 'M515 190 L515 330', 'M420 160 Q300 300 250 370', 'M250 600 L420 620', 'M250 120 Q330 520 420 640', 'M250 130 Q600 560 800 600'];
    return `<div class="er"><svg width="1280" height="800">${L.map((d) => `<path d="${d}"/>`).join('')}</svg>${B.map(([n, x, y, f]) => `<div class="er-box pop" style="left:${x + 60}px;top:${y + 20}px"><b>${n}</b>${f.map((s) => `<span>${s}</span>`).join('')}</div>`).join('')}</div>`;
  },
  dash: (b) => app('dash', `<div class="m-head"><div><h1 class="m-h1">Dashboard</h1><div class="m-sub" style="margin-top:4px">Mein Gym · Samstag, 14. November</div></div><span class="m-btn p ${S(b)}" id="btn-new">✚ Neue Anmeldung</span></div>
    <div class="m-row">${[['Aktive Mitglieder', 'k1', '#e6eeff', '#1d4ed8', '☰'], ['Neu (30 Tage)', 'k2', '#e8f7ee', '#15803d', '✚'], ['Laufen aus', 'k3', '#fff4e0', '#b45309', '◷'], ['Offene Angebote', 'k4', '#f1eafe', '#6d28d9', '✉'], ['Monatl. Beiträge', 'k5', '#eef1f5', '#475569', '↗']]
      .map(([l, id, bg, c, i]) => `<div class="m-card m-kpi ${S(b)}"><div class="ico" style="background:${bg};color:${c}">${i}</div><div class="v" id="${id}">${{ k1: 7, k2: 2, k3: 2, k4: 2, k5: '450,82 €' }[id]}</div><div class="l">${l}</div></div>`).join('')}</div>
    <div class="m-row"><div class="m-card ${S(b)}"><h3>Kürzlich abgeschlossene Anmeldungen</h3>
      ${[['HM', 'Hanna Muster', 'Premium – 12 Monate'], ['FF', 'Felix Fiktiv', 'Flex – monatlich kündbar'], ['PP', 'Paul Platzhalter', 'Basic – 12 Monate']].map(([a, n, p]) => `<div class="m-li"><span class="m-av">${a}</span><div>${n}<small>${p}</small></div></div>`).join('')}</div>
      <div class="m-card ${S(b)}"><h3>Laufen bald aus</h3>${[['Sophie Probe', 'Jahresmitgliedschaft · endet 25.12.2026', '41 Tage'], ['Max Mustermann', 'Premium – 12 Monate · endet 07.01.2027', '54 Tage']].map(([n, p, d]) => `<div class="m-li"><div>${n}<small>${p}</small></div><span class="m-pill a">${d}</span></div>`).join('')}</div></div>`, b),
  signup: () => {
    const steps = ['Daten', 'Mitgliedschaft', 'Leistungen', 'Zahlung', 'Einverständnis', 'Übersicht', 'Unterschrift', 'Abschluss', 'Fertig'];
    const fld = (l, id, w = '') => `<div class="m-field" ${w}><label>${l} *</label><div class="m-in" id="${id}"></div></div>`;
    const ch = (id, t, n, p, s, on = '') => `<div class="m-choice ${on}" id="${id}"><span class="ck">✓</span>${t ? `<div class="t">${t}</div>` : ''}<b>${n}</b><div class="pr">${p}</div><small>${s}</small></div>`;
    const btn = (id, l = 'Weiter ›', c = 'p') => `<div style="display:flex;justify-content:flex-end"><span class="m-btn ${c}" id="${id}">${l}</span></div>`;
    const sum = `<div class="m-card"><div class="m-dl"><dt>Name</dt><dd>Herr Neo Testkunde</dd><dt>Geburtsdatum</dt><dd>05.05.1995</dd><dt>E-Mail</dt><dd>neo.testkunde@example.com</dd>
      <dt>Mitgliedschaft</dt><dd><b>Premium – 12 Monate</b> ab 14.11.2026</dd><dt>Leistungen</dt><dd>Getränke-Flat, Sauna</dd><dt>Preis</dt><dd><b>67,70 € / Monat</b> · einmalig 29,90 €</dd><dt>Zahlung</dt><dd>SEPA · DE89 •••• •••• •••• 3000</dd></div></div>`;
    const sigsvg = (id) => `<svg viewBox="0 0 700 300" preserveAspectRatio="none" width="100%" height="100%"><path id="${id}" pathLength="1" d="M60 200 C90 110 125 105 130 190 S175 115 200 180 S245 235 262 150 C272 105 305 112 300 172 S345 215 372 150 S425 118 442 192 S505 205 532 140 C560 98 600 152 645 128" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1"/></svg>`;
    return app('anm', `<div class="m-head"><h1 class="m-h1">Neue Anmeldung</h1><span class="m-sub" style="margin:0" id="stepno">Schritt 1 von 9</span></div>
      <div class="m-stepper">${steps.map((s, i) => `<div id="st${i}"><i></i>${s}</div>`).join('')}</div>
      <div class="m-wiz"><div class="m-card" style="display:flex;flex-direction:column">
        <div class="m-step on" id="s0"><h3 style="font-size:21px;margin:0">Persönliche Daten</h3><div class="m-grid">${fld('Vorname', 'i-fn')}${fld('Nachname', 'i-ln')}${fld('Geburtsdatum', 'i-bd')}${fld('E-Mail-Adresse', 'i-em')}${fld('Straße & Nr.', 'i-st')}${fld('PLZ & Ort', 'i-ort')}${fld('Telefonnummer', 'i-tel')}</div>${btn('w0')}</div>
        <div class="m-step" id="s1"><h3 style="font-size:21px;margin:0">Mitgliedschaft</h3><div class="m-choices">${ch('c-bas', 'Basic', 'Basic – 12 Monate', '29,90 €', 'Geräte & Cardio')}${ch('c-prem', 'Premium', 'Premium – 12 Monate', '49,90 €', 'Alle Bereiche inkl. Kurse')}${ch('c-flex', 'Flex', 'Flex – monatlich', '59,90 €', 'Ohne lange Bindung')}${ch('c-p24', 'Premium', 'Premium – 24 Monate', '44,90 €', 'Treuepreis')}${ch('c-yr', 'Basic', 'Jahresmitgliedschaft', '299 €', 'jährlich')}</div>
          <div class="m-grid">${fld('Vertragsbeginn', 'i-start')}<div class="m-field"><label>Vertragsende</label><div class="m-in" id="i-end" style="border-style:dashed;color:#64748b">wird berechnet</div></div></div>${btn('w1')}</div>
        <div class="m-step" id="s2"><h3 style="font-size:21px;margin:0">Zusatzleistungen</h3><div class="m-choices">${ch('a-dr', '', 'Getränke-Flat', '9,90 €', 'pro Monat')}${ch('a-sa', '', 'Sauna', '7,90 €', 'pro Monat')}${ch('a-so', '', 'Solarium', '5,00 €', 'pro Monat')}${ch('a-pt', '', 'Personal Training', '79,00 €', 'pro Monat')}${ch('a-ku', '', 'Kurse', '9,90 €', 'pro Monat')}${ch('a-tp', '', 'Trainingsplan', '49,00 €', 'einmalig')}</div>${btn('w2')}</div>
        <div class="m-step" id="s3"><h3 style="font-size:21px;margin:0">Zahlung</h3><div class="m-seg"><span class="on">SEPA-Lastschrift</span><span>Überweisung</span><span>Barzahlung</span><span>Sonstige</span></div>
          <div class="m-grid"><div class="m-field"><label>Kontoinhaber *</label><div class="m-in">Neo Testkunde</div></div><div class="m-field"><label>IBAN *</label><div class="m-in" id="i-iban"></div><div id="iban-ok" style="color:#15803d;font-weight:700;font-size:14px;margin-top:5px;opacity:0">✓ IBAN gültig · wird verschlüsselt gespeichert</div></div></div>${btn('w3')}</div>
        <div class="m-step" id="s4"><h3 style="font-size:21px;margin:0">Einverständnisse</h3>${[['k1', 'Ich akzeptiere die AGB.', 1], ['k2', 'Ich akzeptiere die Hausordnung.', 1], ['k3', 'Datenschutzerklärung zur Kenntnis genommen.', 1], ['k4', 'Ich erteile das SEPA-Lastschriftmandat.', 1], ['k5', 'Angebote per E-Mail erhalten (optional)', 0]]
          .map(([id, l, r]) => `<div class="m-check" id="${id}"><i>✓</i>${l}${r ? '<em>Pflicht</em>' : ''}</div>`).join('')}${btn('w4')}</div>
        <div class="m-step" id="s5"><h3 style="font-size:21px;margin:0">Zusammenfassung</h3>${sum}${btn('w5', 'Weiter zur Unterschrift ›')}</div>
        <div class="m-step" id="s6"><h3 style="font-size:21px;margin:0">Unterschrift</h3><p style="margin:0;font-size:15.5px">Ich, Neo Testkunde, beantrage die Mitgliedschaft „Premium – 12 Monate“ ab 14.11.2026 zu 67,70 € monatlich.</p>
          <div class="m-sig" id="sigbox"><div class="line"></div>${sigsvg('sigp')}</div><div style="display:flex;gap:10px;justify-content:flex-end"><span class="m-btn">🗑 Unterschrift löschen</span><span class="m-btn p" id="sigok">✓ Unterschrift bestätigen</span></div></div>
        <div class="m-step" id="s7"><h3 style="font-size:21px;margin:0">Abschluss</h3>${sum}<div class="m-card" style="height:120px;padding:6px">${sigsvg('sigp2')}</div><span class="m-btn g" id="fin" style="height:62px;font-size:19px">✓ Anmeldung verbindlich abschließen</span></div>
        <div class="m-step m-success" id="s8"><div class="c">✓</div><h2 style="margin:0;font-size:28px">Mitgliedschaft erfolgreich abgeschlossen.</h2><p style="margin:0;color:#475569">Neo Testkunde ist jetzt Mitglied.</p>
          <div class="m-ids"><div><small>Mitgliedsnummer</small><b>M-00011</b></div><div><small>Vertragsnummer</small><b>V-2026-0011</b></div></div><span class="m-btn p" style="height:60px">✚ Nächste Anmeldung</span></div>
      </div>
      <div class="m-aside" id="aside"><b>Deine Auswahl</b><div id="as-plan" style="font-weight:750;font-size:17px">–</div><div id="as-add" style="color:#64748b;font-size:14px;min-height:40px">Keine Zusatzleistungen</div>
        <div style="border-top:1px solid #e5e7eb;padding-top:8px;display:flex;justify-content:space-between;align-items:baseline"><span>Monatlich</span><span class="big" id="as-price">0,00 €</span></div>
        <div style="display:flex;justify-content:space-between;color:#475569"><span>Einmalig</span><b id="as-once">0,00 €</b></div></div></div>`);
  },
  members: (b) => {
    const rows = [['MM', 'Max Mustermann', 'max.mustermann@example.com', 'Premium – 12 Monate', '07.01.2027', 'a', 'Läuft aus'], ['EM', 'Erika Musterfrau', 'erika.musterfrau@example.com', 'Basic – 12 Monate', '13.08.2027', 'g', 'Aktiv'],
      ['LT', 'Lena Test', 'lena.test@example.com', 'Flex – monatlich', 'monatlich', 'g', 'Aktiv'], ['JB', 'Jonas Beispiel', 'jonas.beispiel@example.com', 'Premium – 24 Monate', '13.09.2028', 'g', 'Aktiv'],
      ['SP', 'Sophie Probe', 'sophie.probe@example.com', 'Jahresmitgliedschaft', '25.12.2026', 'a', 'Läuft aus'], ['TT', 'Tim Testmann', 'tim.testmann@example.com', 'Basic – 12 Monate', '13.09.2026', '', 'Abgelaufen'],
      ['MD', 'Mika Demo', 'mika.demo@example.com', 'Premium – 12 Monate', '13.05.2027', 'r', 'Gekündigt'], ['NT', 'Neo Testkunde', 'neo.testkunde@example.com', 'Premium – 12 Monate', '13.11.2027', 'g', 'Aktiv']];
    return app('mit', `<div class="m-head"><div><h1 class="m-h1">Mitglieder</h1><div class="m-sub" style="margin-top:4px">11 Mitglieder</div></div><span class="m-btn p">✚ Neue Anmeldung</span></div>
      <div class="m-search ${S(b)}">⌕ <b id="srch"></b><span id="srch-ph">Suche: Name, E-Mail, Telefon, Mitgliedsnr.</span></div>
      <div class="m-chips ${S(b)}">${['Alle', 'Aktiv', 'Neu', 'Läuft aus', 'Pausiert', 'Gekündigt', 'Abgelaufen'].map((c, i) => `<span class="m-chip ${i ? '' : 'on'}">${c}</span>`).join('')}</div>
      <div class="m-table"><div class="m-tr h"><span>Name</span><span>E-Mail</span><span>Mitgliedschaft</span><span>Ende</span><span>Status</span><span>Nr.</span></div>
      ${rows.map(([a, n, e, p, end, c, s], i) => `<div class="m-tr ${b ? 'slide' : ''}" data-n="${n.toLowerCase()}" id="${a === 'NT' ? 'r-neo' : ''}"><span><span class="m-av">${a}</span>${n}</span><span style="color:#475569">${e}</span><span>${p}</span><span>${end}</span><span><span class="m-pill ${c}" style="margin:0">${s}</span></span><span style="font-family:Menlo,monospace;font-size:13px">M-${String(i + 1).padStart(5, '0')}</span></div>`).join('')}</div>`, b ? 'pop show' : '');
  },
  profile: (b) => app('mit', `<div class="m-card ${S(b)}" style="display:flex;align-items:center;gap:16px"><span class="m-av" style="width:64px;height:64px;font-size:22px">NT</span><div style="flex:1"><h1 class="m-h1">Neo Testkunde</h1><div style="color:#64748b">M-00011 · Mitglied seit 14.11.2026</div></div><span class="m-pill g" style="margin:0">Aktiv</span><span class="m-btn">✎ Bearbeiten</span></div>
    <div class="m-row"><div class="m-card ${S(b)}"><h3>Stammdaten</h3><div class="m-dl"><dt>Geburtsdatum</dt><dd>05.05.1995</dd><dt>Adresse</dt><dd>Probeweg 7a, 12345 Musterstadt</dd><dt>Telefon</dt><dd>0151 2222333</dd><dt>E-Mail</dt><dd>neo.testkunde@example.com</dd></div></div>
      <div class="m-card ${S(b)}"><h3>Mitgliedschaft</h3><div class="m-dl"><dt>Mitgliedschaft</dt><dd><b>Premium – 12 Monate</b></dd><dt>Laufzeit</dt><dd>14.11.2026 – 13.11.2027</dd><dt>Preis</dt><dd>67,70 € / Monat</dd><dt>Leistungen</dt><dd>Getränke-Flat, Sauna</dd></div></div></div>
    <div class="m-row"><div class="m-card ${S(b)}"><h3>Zahlung & Vertrag</h3><div class="m-dl"><dt>Zahlungsart</dt><dd>SEPA-Lastschrift</dd><dt>IBAN</dt><dd><span id="iban" style="font-family:Menlo,monospace">DE89 •••• •••• •••• 3000</span> <span class="m-btn" id="iban-btn" style="height:34px;padding:0 10px;font-size:13px">👁 Anzeigen</span></dd><dt>Vertrag</dt><dd>V-2026-0011</dd><dt>Prüfsumme</dt><dd style="color:#15803d;font-weight:700">🛡 Original unverändert</dd></div></div>
      <div class="m-card ${S(b)}"><h3>Aktivitäten</h3><div class="m-tl"><div>Angebot „Winter-Bonus“ versendet<small>14.11.2026, 10:42 Uhr</small></div><div>Stammdaten geändert: Telefon<small>14.11.2026, 10:21 Uhr</small></div><div>Anmeldung erstellt – Vertrag V-2026-0011<small>14.11.2026, 10:15 Uhr</small></div></div></div></div>`, b ? 'pop show' : ''),
  offer: (b) => app('ang', `<div class="m-head"><h1 class="m-h1">Neues Angebot</h1><span class="m-pill" style="margin:0">Entwurf</span></div>
    <div class="m-row" style="align-items:flex-start"><div style="display:flex;flex-direction:column;gap:14px;flex:1.3"><div class="m-card ${S(b)}"><div class="m-grid"><div class="m-field"><label>Angebotsname *</label><div class="m-in" id="o-n"></div></div><div class="m-field"><label>Betreff *</label><div class="m-in" id="o-s"></div></div></div>
      <div class="m-field" style="margin-top:12px"><label>E-Mail-Inhalt</label><div class="m-in" style="height:auto;padding:10px 14px;white-space:normal;display:block;font-size:15px">Hallo <b style="color:#6d28d9">{{vorname}}</b>, deine Mitgliedschaft <b style="color:#6d28d9">{{mitgliedschaft}}</b> läuft am <b style="color:#6d28d9">{{vertragsende}}</b> aus …</div></div></div>
      <div class="m-card ${S(b)}"><h3>Empfänger</h3><div class="m-chips" style="margin-bottom:10px"><span class="m-chip">Einzeln</span><span class="m-chip">Mehrere</span><span class="m-chip on">Nach Filter</span></div>
        <div class="m-chips"><span class="m-chip" id="f-prem">Premium</span><span class="m-chip" id="f-basic">Basic</span><span class="m-chip" id="f-akt">Aktiv</span><span class="m-chip" id="f-aus">Läuft aus</span><span class="m-chip">≤ 60 Tage Rest</span></div>
        <div class="m-check on" style="margin-top:12px"><i>✓</i>Nur Mitglieder mit Werbe-Einwilligung</div></div></div>
      <div style="display:flex;flex-direction:column;gap:14px;flex:1"><div class="m-count ${S(b)}" id="o-cnt-box">Dieses Angebot wird an <span id="o-cnt">0</span> Mitglieder gesendet.</div>
        <div class="m-mail ${S(b)}"><div style="margin-bottom:8px"><small style="color:#64748b">An</small> max.mustermann@example.com<br><small style="color:#64748b">Betreff</small> <b id="o-subj">…</b></div><div class="hd">Mein Gym</div><div class="bd">Hallo <mark>Max</mark>,<br>deine Mitgliedschaft <mark>Premium – 12 Monate</mark> läuft am <mark>07.01.2027</mark> aus.<br><br>Wir haben ein exklusives Angebot für dich …</div></div>
        <span class="m-btn p ${S(b)}" id="o-send">➤ Jetzt versenden</span><div id="outbox" class="m-card pop"><h3>Postausgang (Testversand)</h3><div id="ob"></div></div></div></div>
    <div class="m-modal" id="o-modal"><div><h2 style="margin:0">Angebot jetzt versenden?</h2><p style="margin:0;font-size:21px;font-weight:750">Dieses Angebot wird an 7 Mitglieder gesendet.</p><p style="margin:0;color:#64748b">Max Mustermann, Erika Musterfrau, Jonas Beispiel, Sophie Probe … · Testmodus: Es wird nichts wirklich verschickt.</p>
      <div style="display:flex;gap:10px;justify-content:flex-end"><span class="m-btn">Abbrechen</span><span class="m-btn p" id="o-ok">An 7 senden</span></div></div></div>`, b ? 'pop show' : ''),
  settings: (b) => app('set', `<h1 class="m-h1">Einstellungen</h1><div class="m-tabs ${S(b)}"><span>Gym-Daten</span><span class="on">Mitgliedschaften</span><span>Leistungen & Preise</span><span>Vertragstexte</span><span>E-Mail</span><span>Sicherheit</span></div>
    <div class="m-card ${S(b)}">${[['Basic – 12 Monate', '29,90 € / Monat · Kündigung 4 Wo.'], ['Premium – 12 Monate', '<span id="pp">49,90 €</span> / Monat · Kündigung 4 Wo.'], ['Premium – 24 Monate', '44,90 € / Monat'], ['Jahresmitgliedschaft', '299,00 € / Jahr'], ['Flex – monatlich kündbar', '59,90 € / Monat']]
      .map(([n, d], i) => `<div class="m-li ${b ? 'slide' : ''}"><div>${n}<small>${d}</small></div><span class="m-btn" style="margin-left:auto;height:40px" id="${i === 1 ? 'ed-prem' : ''}">✎ Bearbeiten</span><span class="m-btn" style="height:40px">Deaktivieren</span></div>`).join('')}</div>
    <div class="m-card ${S(b)}"><h3>Vertragstexte</h3><div style="color:#64748b">[Platzhalter] Hier werden später die AGB des Gyms eingefügt.</div></div>
    <div class="m-modal" id="pmodal"><div><h2 style="margin:0">Mitgliedschaft bearbeiten</h2><div class="m-grid"><div class="m-field"><label>Name</label><div class="m-in">Premium</div></div><div class="m-field"><label>Preis (€)</label><div class="m-in" id="p-in">49,90</div></div></div><p style="margin:0;color:#64748b;font-size:14px">Gilt nur für neue Anmeldungen – bestehende Verträge bleiben unverändert.</p><div style="display:flex;justify-content:flex-end"><span class="m-btn p" id="p-save">Speichern</span></div></div></div>`, b ? 'pop show' : ''),
  lock: () => `<div class="m-lock"><div><span class="m-logo">⇿</span><h2 style="margin:0">Mein Gym</h2><div style="color:#64748b;margin-top:-8px">Mitgliederverwaltung</div><div class="m-field" style="text-align:left"><label>Passwort</label><div class="m-in" id="pw"></div></div><span class="m-btn p" id="unlock">🔒 Entsperren</span><small style="color:#64748b">AES-256 verschlüsselt · sperrt automatisch</small></div></div>`,
  checks: () => `<div class="checks" id="chk"></div>`,
  blank: () => `<div style="position:absolute;inset:0;background:#1b1d27"></div>`,
};

/* ---------- Code-Ausschnitte (aus dem echten Projekt) ---------- */
const CODE = {
  html: `<meta http-equiv="Content-Security-Policy"\n  content="default-src 'self'; script-src 'self'">\n<link rel="manifest" href="manifest.webmanifest">\n<script type="module" src="js/app.js"></script>`,
  schema: `model Member {\n  id        String     @id\n  memberNo  String     @unique\n  contracts Contract[]\n}\nmodel Contract {\n  member    Member     @relation(fields: [memberId])\n  signature Signature?\n  consents  Consent[]\n  hash      String   // SHA-256 beim Abschluss\n}`,
  nav: `const NAV = [\n  ['dashboard', 'Dashboard', 'grid'],\n  ['anmeldung', 'Neue Anmeldung', 'userPlus'],\n  ['mitglieder', 'Mitglieder', 'users'],\n  ['formulare', 'Formulare', 'file'],\n  ['angebote', 'Angebote', 'mail'],\n  ['einstellungen', 'Einstellungen', 'sliders'],\n];`,
  dash: `const active = rows.filter((r) => r.state === 'aktiv');\nconst expiring = rows.filter((r) => r.state === 'auslaufend');\nkpi('Aktive Mitglieder', active.length, '#/mitglieder?f=aktiv');\nkpi('Laufen aus', expiring.length, '#/mitglieder?f=auslaufend');`,
  form: `export const personalSchema = {\n  firstName: ['required', 'name'],\n  birthDate: ['required', 'date', 'birthDate'],\n  zip:       ['required', 'zip'],\n  email:     ['required', 'email'],\n};\n// IBAN: Prüfsumme nach ISO 7064 (mod 97)`,
  sig: `canvas.addEventListener('pointermove', (e) => {\n  const evs = e.getCoalescedEvents?.() || [e];\n  for (const ce of evs) cur.push(pt(ce)); // Druck vom Pencil\n  drawStroke(cur, start);\n});\n// touch-action: none → kein Scrollen beim Schreiben`,
  members: `return [m.firstName, m.lastName, m.email,\n  m.phone, m.memberNo]\n  .some((v) => v.toLowerCase().includes(q));`,
  hash: `const hash = await sha256Hex(JSON.stringify(\n  { contractNo, memberNo, at, snapshot, signature }));\n// Formular bleibt schreibgeschützt – jede\n// spätere Änderung fällt an der Prüfsumme auf`,
  offer: `if (f.planIds.length) list = list.filter(byPlan);\nif (f.statuses.length) list = list.filter(byStatus);\nif (a.marketingOnly) list = list.filter((r) => r.marketing);\n// "Dieses Angebot wird an 7 Mitglieder gesendet."`,
  mail: `export class MockProvider {\n  name = 'mock';\n  async send(m) { // verschickt NICHTS\n    return { ok: true, status: 'simuliert' };\n  }\n}\n// später: Resend, SendGrid, SES, SMTP …`,
  settings: `legal: {\n  agb: '[Platzhalter] Hier wird später die AGB …',\n  datenschutz: '[Platzhalter] …',\n},\nautoLockMin: 15, expiringDays: 60,`,
};
const FILES = ['index.html', 'styles.css', 'sw.js', 'js/app.js', 'js/core/crypto.js', 'js/core/db.js', 'js/core/auth.js', 'js/core/validate.js', 'js/services/data.js', 'js/services/email.js', 'js/pages/signup.js', 'js/pages/signature.js', 'js/pages/members.js', 'js/pages/offers.js', 'js/pages/settings.js'];

const RX = /(\/\/[^\n]*)|('[^'\n]*'?|`[^`]*`?|"[^"\n]*"?)|\b(const|let|function|return|export|import|from|async|await|if|new|class|model|for|of)\b|(\b\d+\b)|(\w+)(?=\()/g;
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
function hl(src) {
  let out = '', i = 0;
  src.replace(RX, (m, c, s, k, n, f, off) => { out += esc(src.slice(i, off)) + `<span class="${c ? 'c' : s ? 's' : k ? 'k' : n ? 'n2' : 'f'}">${esc(m)}</span>`; i = off + m.length; return m; });
  return out + esc(src.slice(i));
}

/* ---------- Aktionen (zeitgesteuert) ---------- */
const at = (t, f) => ({ t, d: 0, f: () => f() });
const show = (t, sel) => at(t, () => qa(sel).forEach((e) => e.classList.add('show')));
const seq = (t, sel, gap) => qa(sel).map((e, i) => at(t + i * gap, () => { e.classList.add('show'); sfx.key(); }));
const type = (t, sel, text, d = 1) => ({ t, d, f: (p, a) => {
  const e = q(sel); if (!e) return;
  const n = Math.round(p * text.length);
  if (a.n !== n) { a.n = n; e.textContent = text.slice(0, n); sfx.key(); }
  e.classList.toggle('f', p < 1);
} });
const tap = (t, sel, fn, d = .75) => ({ t, d, f: (p, a) => {
  const e = q(sel), fg = q('.finger'); if (!e || !fg) return;
  if (!a.from) { a.from = { ...fp }; const r = rel(e); a.to = { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
  const k = ease(p);
  fp = { x: a.from.x + (a.to.x - a.from.x) * k, y: a.from.y + (a.to.y - a.from.y) * k };
  placeFinger();
  if (p >= 1) {
    fg.classList.remove('tap'); fg.offsetWidth; fg.classList.add('tap');
    e.classList.add('press'); setTimeout(() => e.classList.remove('press'), 160);
    sfx.tap(); fn && fn(e);
  }
} });
const count = (t, sel, a, b, d, fmt = (v) => String(Math.round(v))) => ({ t, d, f: (p) => { const e = q(sel); if (e) e.textContent = fmt(a + (b - a) * ease(p)); } });
const draw = (t, sel, d, follow) => ({ t, d, f: (p, a) => {
  const path = q(sel); if (!path) return;
  path.style.strokeDashoffset = String(1 - p);
  if (follow) {
    const svg = path.ownerSVGElement, r = rel(svg);
    if (!a.len) a.len = path.getTotalLength();
    const pt = path.getPointAtLength(p * a.len);
    fp = { x: r.x + (pt.x * r.w) / 700, y: r.y + (pt.y * r.h) / 300 }; placeFinger();
    if (Math.random() < .3) sfx.key();
  }
} });
const view = (t, html) => at(t, () => setMock(html));
const cap = (t, text) => at(t, () => caption(text));
const shot = (t, n) => at(t, () => camTo(n));
const fig = (t, m) => at(t, () => figure(m));
const close = (t, on, mood, bubble) => at(t, () => closeShot(on, mood, bubble));
const step = (t, n) => at(t, () => {
  qa('.m-step').forEach((e) => e.classList.toggle('on', e.id === 's' + n));
  for (let i = 0; i < 9; i++) q('#st' + i)?.classList.toggle('d', i <= n);
  const sn = q('#stepno'); if (sn) sn.textContent = n < 8 ? `Schritt ${n + 1} von 9` : 'Geschafft!';
  const as = q('#aside'); if (as) as.style.display = n >= 1 && n <= 4 ? '' : 'none';
});
const asideFill = (plan, add, price, once) => { q('#as-plan').textContent = plan; q('#as-add').textContent = add; q('#as-price').textContent = price; q('#as-once').textContent = once; };
const toast = (t, text) => at(t, () => { const e = q('#toast'); if (!e) return; e.textContent = '✓ ' + text; e.classList.add('show'); setTimeout(() => e.classList.remove('show'), 1800); sfx.pop(); });
/** Editor öffnen und Code tippen */
const code = (t, file, src, d, newFiles = 0) => [
  at(t, () => {
    q('.ed')?.remove();
    const ed = document.createElement('div');
    ed.className = 'ed';
    const shown = newFiles ? FILES.slice(0, 2) : FILES;
    ed.innerHTML = `<div class="ed-tabs"><span>${file}</span></div><div class="ed-tree">${shown.map((f) => `<div class="${f === file || f.endsWith(file) ? 'n' : ''}">${f}</div>`).join('')}</div><pre class="ed-code"></pre><div class="ed-term"></div>`;
    M().appendChild(ed);
    figure('typing');
  }),
  { t: t + .2, d, f: (p, a) => { const e = q('.ed-code'); if (!e) return; const n = Math.round(p * src.length); if (a.n !== n) { a.n = n; e.innerHTML = hl(src.slice(0, n)); sfx.key(); } } },
];
const term = (t, sel, lines, gap) => lines.map((l, i) => at(t + i * gap, () => { const e = q(sel); if (!e) return; const div = document.createElement('div'); div.textContent = l; if (l.startsWith('✓')) div.className = 'ok'; if (l.startsWith('$') || l.startsWith('▸')) div.className = 'hd'; e.appendChild(div); sfx.key(); }));
const away = (t) => at(t, () => { q('.ed')?.classList.add('away'); figure(''); });

/* ---------- Kapitel ---------- */
const CH = [];
const add = (act, label, dur, enter, steps) => CH.push({ act, label, dur, enter, steps });
const A1 = 'Akt 1 · Bauen', A2 = 'Akt 2 · Bedienen';

add(1, 'Making-of', 7, () => { setMock(V.doc()); camTo('wide', true); }, () => [
  at(0, () => titleCard(true, 'Ein Making-of', 'GymDesk', 'Eine kleine Claude-Figur baut eine Mitgliederverwaltung fürs Gym')),
  at(3.6, () => titleCard(false)), fig(4.2, 'think'),
  cap(4.4, 'Abends am Schreibtisch. Der Auftrag: eine iPad-App für ein Fitnessstudio.')]);
add(1, 'Analyse', 9, () => setMock(V.doc()), () => [
  close(0, true, '', '<small>Claude denkt nach …</small>Erst verstehen,<br>dann bauen.'), cap(.3, 'Bevor eine Zeile Code entsteht, liest Claude die Anforderungen.'),
  close(3.2, false), shot(3.3, 'screen'), cap(4, 'Haken für Haken: Anmeldung, Unterschrift, Mitglieder, Angebote, Sicherheit.'), ...seq(4.2, '.req-item', .55), fig(4.2, '')]);
add(1, 'Phase 1 · Projektstruktur', 8, () => setMock(V.blank()), () => [
  shot(0, 'desk'), ...code(.2, 'index.html', CODE.html, 3, 1), cap(.5, 'Entscheidung: eine Web-App ohne Server. Sie speichert verschlüsselt direkt auf dem iPad und läuft auch offline.'),
  shot(3, 'screen'), ...FILES.slice(2).map((f, i) => at(3.4 + i * .2, () => { const tr = q('.ed-tree'); if (tr) { const d = document.createElement('div'); d.className = 'n'; d.textContent = f; tr.appendChild(d); sfx.key(); } })),
  ...term(3.6, '.ed-term', ['$ mkdir gymdesk && cd gymdesk', '✓ 22 Dateien · ohne Build-Schritt · TypeScript-geprüft', '✓ Service Worker: offline bereit'], .9), cap(4.6, 'Die Projektstruktur: Kern, Daten, Dienste und Seiten, sauber getrennt und erweiterbar.')]);
add(1, 'Phase 2 · Datenmodell', 9, () => setMock(V.er()), () => [
  ...code(0, 'docs/schema.prisma', CODE.schema, 2.6), cap(.3, 'Das Datenmodell: Wer gehört zu wem?'), away(3),
  ...seq(3.3, '.er-box', .28), ...qa('.er svg path').map((e, i) => at(5.2 + i * .15, () => e.classList.add('show'))),
  cap(4, 'Ein Mitglied hat Verträge, jeder Vertrag hat eine Unterschrift und Einwilligungen. Jede Aktion landet im Protokoll.')]);
add(1, 'Phase 3 · Layout & Navigation', 7, () => setMock(app('dash', '', 'pop')), () => [
  ...code(0, 'js/app.js', CODE.nav, 2.4), away(2.8), show(3, '.m-side'), ...seq(3.3, '.m-nav', .2), at(4.7, () => q('#nav-dash')?.classList.add('on')),
  cap(.4, 'Phase 3: Navigation mit sechs Bereichen.'), cap(3.4, 'Große Touchflächen: Seitenleiste am iPad, Tab-Leiste am Handy.')]);
add(1, 'Phase 4 · Dashboard', 7.5, () => setMock(V.dash(true)), () => [
  ...code(0, 'js/pages/dashboard.js', CODE.dash, 2.3), away(2.7), ...seq(3, '.m-card', .22), show(4.6, '#btn-new'),
  count(3.2, '#k1', 0, 7, 1.4), count(3.4, '#k2', 0, 2, 1.2), count(3.6, '#k3', 0, 2, 1.2), count(3.8, '#k4', 0, 2, 1.2), count(4, '#k5', 0, 450.82, 1.6, euro),
  cap(.4, 'Phase 4: Das Dashboard.'), cap(3.2, 'Echte Zahlen aus der Datenbank. Jede Kachel führt direkt zu den passenden Mitgliedern.')]);
add(1, 'Phase 5 · Anmeldeformular', 8, () => { setMock(V.signup()); }, () => [
  ...code(0, 'js/core/validate.js', CODE.form, 2.5), step(0, 0), away(2.9),
  type(3.3, '#i-fn', 'Max', .4), type(3.8, '#i-ln', 'Mustermann', .6), type(4.5, '#i-bd', '01.01.1990', .5), type(5.1, '#i-em', 'max@example.com', .7),
  step(6.2, 1), at(6.6, () => q('#c-prem')?.classList.add('on')),
  cap(.4, 'Phase 5: Das Herzstück, die Anmeldung in 9 Schritten.'), cap(3.3, 'Jedes Feld wird geprüft. Fehler stehen direkt am Feld, nicht in einem Popup.')]);
add(1, 'Phase 6 · Digitale Unterschrift', 7.5, () => { setMock(V.signup()); }, () => [
  ...code(0, 'js/pages/signature.js', CODE.sig, 2.5), step(0, 6), away(2.9), draw(3.3, '#sigp', 2.6, true), tap(6.1, '#sigok'),
  cap(.4, 'Phase 6: Die digitale Unterschrift.'), cap(3.3, 'Mit Finger oder Apple Pencil: Druckstärke, glatte Linien, kein Scrollen beim Schreiben.')]);
add(1, 'Phase 7 · Mitgliederverwaltung', 7, () => setMock(V.members(true)), () => [
  ...code(0, 'js/pages/members.js', CODE.members, 2.2), away(2.6), ...seq(2.9, '.m-tr.slide', .18),
  cap(.4, 'Phase 7: Alle Mitglieder auf einen Blick.'), cap(3, 'Suche nach Name, E-Mail, Telefon oder Mitgliedsnummer, dazu Filter und Sortierung.')]);
add(1, 'Phase 8 · Kundenmaske & Formulare', 7, () => setMock(V.profile(true)), () => [
  ...code(0, 'js/services/data.js', CODE.hash, 2.4), away(2.8), ...seq(3.1, '.m-card', .3),
  cap(.4, 'Phase 8: Kundenmaske und abgeschlossene Formulare.'), cap(3.2, 'Das Original-Formular ist schreibgeschützt. Eine Prüfsumme zeigt, dass nichts verändert wurde.')]);
add(1, 'Phase 9 · Angebote', 7.5, () => setMock(V.offer(true)), () => [
  ...code(0, 'js/services/data.js', CODE.offer, 2.4), away(2.8), ...seq(3, '.m-main .pop:not(#outbox)', .25),
  at(4.6, () => q('#f-prem')?.classList.add('on')), at(5, () => q('#f-akt')?.classList.add('on')), count(4.6, '#o-cnt', 0, 7, 1),
  at(4.4, () => { q('#o-n').textContent = 'Winter-Bonus'; q('#o-subj').textContent = 'Max, dein Winter-Bonus'; }),
  cap(.4, 'Phase 9: Angebote mit Empfängerauswahl.'), cap(3.2, 'Filter lassen sich kombinieren. Vor dem Versand steht immer da, wie viele die Mail bekommen.')]);
add(1, 'Phase 10 · E-Mail-System', 7, () => { setMock(V.offer(false)); q('#outbox').classList.add('show'); q('#o-cnt').textContent = '7'; }, () => [
  ...code(0, 'js/services/email.js', CODE.mail, 2.4), away(2.8),
  ...Array.from({ length: 7 }, (_, i) => ({ t: 3.1 + i * .3, d: .9, f: (p, a) => {
    if (!a.el) { a.el = document.createElement('div'); a.el.className = 'm-env'; a.el.textContent = '✉'; M().appendChild(a.el); }
    a.el.style.left = (900 + p * 160) + 'px'; a.el.style.top = (420 + p * 230 - Math.sin(p * Math.PI) * 120) + 'px'; a.el.style.opacity = String(1 - p * .6);
    if (p >= 1) { a.el.remove(); const ob = q('#ob'); if (ob) { const r = document.createElement('div'); r.className = 'm-li'; r.innerHTML = `<span>✉</span><div>${['max', 'erika', 'jonas', 'sophie', 'hanna', 'felix', 'neo'][i]}@example.com<small>simuliert · nicht verschickt</small></div>`; ob.prepend(r); } sfx.tap(); }
  } })),
  cap(.4, 'Phase 10: Ein E-Mail-Dienst mit austauschbarem Anbieter.'), cap(3.2, 'Während der Entwicklung nur Testversand: Platzhalter werden ersetzt, aber nichts geht raus.')]);
add(1, 'Phase 11 · Einstellungen', 6.5, () => setMock(V.settings(true)), () => [
  ...code(0, 'js/services/data.js', CODE.settings, 2.2), away(2.6), ...seq(2.9, '.m-main > .pop', .25), ...seq(3.3, '.m-li.slide', .15),
  cap(.4, 'Phase 11: Einstellungen.'), cap(3, 'Mitgliedschaften, Preise, Leistungen und Vertragstexte pflegt das Gym selbst, ganz ohne Code.')]);
add(1, 'Phase 12 · Prüfen & absichern', 9.5, () => setMock(V.checks()), () => [
  fig(0, 'typing'), cap(.3, 'Zum Schluss wird alles geprüft: Typen, Abläufe, Sicherheit.'),
  ...term(.3, '#chk', ['$ tsc --checkJs', '✓ 0 Typfehler', '$ node tools/e2e.cjs', '✓ Pflichtfelder werden am Feld gemeldet', '✓ Falsche IBAN wird erkannt', '✓ Preis automatisch berechnet (67,70 €)', '✓ Ohne Unterschrift kein Weiter',
    '✓ Formular schreibgeschützt + Prüfsumme gültig', '✓ Mock-Versand im Postausgang', '✓ Falsches Passwort abgelehnt', '✓ Mitgliedsdaten liegen verschlüsselt in IndexedDB', '✓ Kein horizontales Scrollen am Handy'], .5),
  at(6.6, () => { const c = q('#chk'); if (c) c.insertAdjacentHTML('beforeend', '<span class="badge">31 / 31 Tests bestanden · AES-256 · keine Konsolenfehler</span>'); sfx.chime(); }), fig(6.6, ''),
  cap(4.5, 'Daten verschlüsselt, Passwort nie gespeichert, automatische Sperre, keine fremden Skripte.')]);
add(1, 'Fertig gebaut', 8, () => setMock(V.dash(false)), () => [
  shot(0, 'wide'), close(.2, true, 'happy', 'Fertig gebaut! 🎉<small style="margin-top:6px">Alle Tests grün.</small>'), at(.4, () => sfx.chime()),
  close(3, false), fig(3.2, 'cheer'), at(3.2, confetti), cap(3.3, 'Die App läuft. Jetzt zeigt Claude, wie man sie benutzt.'),
  at(6, () => titleCard(true, 'Akt 2', "So funktioniert's", 'Von der Anmeldung bis zum Angebot, Schritt für Schritt'))]);

/* Akt 2 */
add(2, 'Entsperren', 6.5, () => { titleCard(false); figure(''); setMock(V.lock()); camTo('screen'); fp = { x: 640, y: 760 }; placeFinger(); }, () => [
  cap(.4, 'Morgens an der Theke: iPad entsperren. Alle Daten sind verschlüsselt.'), tap(1, '#pw'), type(1.8, '#pw', '••••••••', 1), tap(3.2, '#unlock'),
  view(4, V.dash(false)), cap(4.2, 'Nach 15 Minuten ohne Bedienung sperrt sich die App von selbst.')]);
add(2, 'Dashboard', 6, () => setMock(V.dash(false)), () => [
  cap(.3, 'Das Dashboard: aktive, neue und auslaufende Mitgliedschaften auf einen Blick.'), tap(1.2, '.m-kpi:nth-child(3)'), tap(2.6, '.m-kpi:nth-child(1)'),
  cap(3.4, 'Ein neues Mitglied steht an der Theke? Auf „Neue Anmeldung“ tippen.'), tap(4.3, '#btn-new')]);
add(2, 'Schritt 1 · Persönliche Daten', 8.5, () => { setMock(V.signup()); }, () => [
  step(0, 0), cap(.3, 'Schritt 1: Persönliche Daten. Große Felder, gut mit dem Finger zu treffen.'),
  tap(.4, '#i-fn'), type(1.1, '#i-fn', 'Neo', .4), type(1.7, '#i-ln', 'Testkunde', .6), type(2.5, '#i-bd', '05.05.1995', .6), type(3.3, '#i-em', 'neo.testkunde@example.com', 1.1),
  type(4.6, '#i-st', 'Probeweg 7a', .6), type(5.3, '#i-ort', '12345 Musterstadt', .7), type(6.1, '#i-tel', '0151 2222333', .6), tap(7, '#w0', () => qa('.m-in').forEach((e) => e.classList.add('ok')))]);
add(2, 'Schritt 2 · Mitgliedschaft', 6.5, () => { setMock(V.signup()); q('#c-prem').classList.remove('on'); }, () => [
  step(0, 1), cap(.3, 'Schritt 2: Mitgliedschaft wählen. Preise kommen aus den Einstellungen.'),
  tap(.8, '#c-prem', (e) => { e.classList.add('on'); q('#as-plan').textContent = 'Premium – 12 Monate'; }), count(1.6, '#as-price', 0, 49.9, .6, euro), count(1.6, '#as-once', 0, 29.9, .6, euro),
  type(2.4, '#i-start', '14.11.2026', .5), at(3.1, () => { q('#i-end').textContent = '13.11.2027 (automatisch)'; }), cap(3, 'Vertragsende, Mindestlaufzeit und Kündigungsfrist rechnet die App selbst aus.'), tap(4.6, '#w1')]);
add(2, 'Schritt 3 · Zusatzleistungen', 6.5, () => { setMock(V.signup()); asideFill('Premium – 12 Monate', 'Keine Zusatzleistungen', '49,90 €', '29,90 €'); }, () => [
  step(0, 2), cap(.3, 'Schritt 3: Zusatzleistungen antippen, mehrere sind möglich.'),
  tap(.8, '#a-dr', (e) => { e.classList.add('on'); q('#as-add').textContent = 'Getränke-Flat'; }), count(1.6, '#as-price', 49.9, 59.8, .5, euro),
  tap(2.2, '#a-sa', (e) => { e.classList.add('on'); q('#as-add').textContent = 'Getränke-Flat, Sauna'; }), count(3, '#as-price', 59.8, 67.7, .5, euro),
  cap(3.2, 'Der Monatspreis wird sofort neu berechnet: 49,90 + 9,90 + 7,90 = 67,70 €.'), tap(4.8, '#w2')]);
add(2, 'Schritt 4 · Zahlung', 6.5, () => { setMock(V.signup()); asideFill('Premium – 12 Monate', 'Getränke-Flat, Sauna', '67,70 €', '29,90 €'); }, () => [
  step(0, 3), cap(.3, 'Schritt 4: Zahlungsart. Für die SEPA-Lastschrift die IBAN eintippen.'),
  tap(.6, '#i-iban'), type(1.3, '#i-iban', 'DE89 3704 0044 0532 0130 00', 1.6), at(3, () => { q('#iban-ok').style.opacity = 1; q('#i-iban').classList.add('ok'); sfx.pop(); }),
  cap(3.1, 'Die Prüfsumme wird sofort kontrolliert. Gespeichert wird die IBAN verschlüsselt und später nur maskiert angezeigt.'), tap(4.8, '#w3')]);
add(2, 'Schritt 5 · Einverständnisse', 7, () => { setMock(V.signup()); asideFill('Premium – 12 Monate', 'Getränke-Flat, Sauna', '67,70 €', '29,90 €'); }, () => [
  step(0, 4), cap(.3, 'Schritt 5: Jede Erklärung wird einzeln bestätigt. Die Texte sind Platzhalter fürs Gym.'),
  ...['#k1', '#k2', '#k3', '#k4', '#k5'].map((k, i) => tap(.8 + i * .75, k, (e) => e.classList.add('on'), .6)),
  cap(4.4, 'Ohne die Pflicht-Zustimmungen geht es nicht weiter. Werbung bleibt freiwillig.'), tap(5.4, '#w4')]);
add(2, 'Schritt 6 + 7 · Übersicht & Unterschrift', 9, () => { setMock(V.signup()); }, () => [
  step(0, 5), cap(.3, 'Schritt 6: Alles noch einmal gemeinsam prüfen.'), tap(2, '#w5'), step(2.8, 6),
  cap(2.9, 'Schritt 7: Das iPad geht ans Mitglied, das mit dem Finger unterschreibt.'), draw(3.4, '#sigp', 2.8, true), tap(6.6, '#sigok'),
  cap(7.2, 'Unterschrift bestätigt. Ohne Unterschrift lässt sich nicht abschließen.')]);
add(2, 'Schritt 8 + 9 · Abschluss', 7, () => { setMock(V.signup()); const p = q('#sigp2'); if (p) p.style.strokeDashoffset = '0'; }, () => [
  step(0, 7), cap(.3, 'Schritt 8: Verbindlich abschließen.'), tap(1.6, '#fin'), step(2.5, 8), at(2.5, () => sfx.chime()),
  cap(2.6, '„Mitgliedschaft erfolgreich abgeschlossen.“ Mitglieds- und Vertragsnummer werden automatisch vergeben.'),
  cap(5, 'Mitglied, Vertrag, Leistungen, Zahlung, Einwilligungen und Unterschrift sind mit Uhrzeit gespeichert.')]);
add(2, 'Mitglieder', 7.5, () => setMock(V.members(false)), () => [
  cap(.3, 'Im Bereich Mitglieder sind alle Personen aufgelistet.'), tap(1, '.m-search'), at(1.7, () => { q('#srch-ph').textContent = ''; }),
  type(1.8, '#srch', 'Neo', .5), at(2.5, () => qa('.m-tr[data-n]').forEach((r) => { if (!r.dataset.n.includes('neo')) r.style.display = 'none'; })),
  cap(2.6, 'Suchen nach Name, E-Mail, Telefon oder Mitgliedsnummer, dazu Filter nach Status.'), tap(3.8, '#r-neo'), view(4.8, V.profile(false)),
  cap(5, 'Ein Tipp öffnet die Kundenmaske.')]);
add(2, 'Kundenmaske', 7, () => setMock(V.profile(false)), () => [
  cap(.3, 'Stammdaten, Mitgliedschaft, gebuchte Leistungen und Zahlungsdaten.'), tap(1.6, '#iban-btn', () => { q('#iban').textContent = 'DE89 3704 0044 0532 0130 00'; }),
  at(3.6, () => { q('#iban').textContent = 'DE89 •••• •••• •••• 3000'; }), cap(2.4, 'Die IBAN erscheint nur auf Wunsch und verschwindet nach ein paar Sekunden wieder.'),
  cap(4.4, 'Unten die Historie: jede Änderung mit Datum und Uhrzeit.'), tap(5.4, '.m-tl')]);
add(2, 'Angebote', 10, () => setMock(V.dash(false)), () => [
  tap(.3, '#nav-ang'), view(1.1, V.offer(false)), cap(1, 'Angebote: Name, Betreff und Text mit Platzhaltern wie {{vorname}}.'),
  type(1.6, '#o-n', 'Winter-Bonus', .6), type(2.3, '#o-s', '{{vorname}}, dein Winter-Bonus', .8), at(3.1, () => { q('#o-subj').textContent = 'Max, dein Winter-Bonus'; }),
  tap(3.4, '#f-prem', (e) => e.classList.add('on'), .55), count(3.9, '#o-cnt', 0, 4, .4), tap(4.2, '#f-akt', (e) => e.classList.add('on'), .55), tap(4.9, '#f-aus', (e) => e.classList.add('on'), .55), count(5.4, '#o-cnt', 4, 7, .4),
  cap(4, 'Empfänger per Filter, z. B. Premium-Mitglieder, aktiv oder bald auslaufend. Nur wer eingewilligt hat.'),
  tap(6, '#o-send', () => q('#o-modal').classList.add('show')), cap(6.6, 'Sicherheitsabfrage: „Dieses Angebot wird an 7 Mitglieder gesendet.“'),
  tap(7.8, '#o-ok', () => { q('#o-modal').classList.remove('show'); q('#outbox').classList.add('show'); q('#ob').innerHTML = ['max', 'erika', 'jonas', 'sophie', 'hanna', 'felix', 'neo'].map((n) => `<div class="m-li">✉ ${n}@example.com<span class="m-pill">simuliert</span></div>`).join(''); }),
  toast(8.6, 'An 7 Mitglieder versendet (Test)')]);
add(2, 'Einstellungen', 7, () => setMock(V.settings(false)), () => [
  cap(.3, 'In den Einstellungen pflegt das Gym Mitgliedschaften, Preise, Leistungen und Vertragstexte.'), tap(1.2, '#ed-prem', () => q('#pmodal').classList.add('show')),
  at(2.2, () => { q('#p-in').textContent = ''; }), type(2.3, '#p-in', '52,90', .5), tap(3.3, '#p-save', () => { q('#pmodal').classList.remove('show'); q('#pp').textContent = '52,90 €'; }), toast(3.9, 'Mitgliedschaft gespeichert'),
  cap(4.2, 'Neue Preise gelten für neue Anmeldungen. Bestehende Verträge bleiben unverändert.')]);
add(2, 'Ende', 9, () => setMock(V.dash(false)), () => [
  shot(0, 'wide'), fig(.6, 'cheer'), cap(.6, 'Alles da: Anmeldung, Unterschrift, Mitglieder, Formulare, Angebote, Einstellungen.'),
  close(3, true, 'happy', 'Jetzt bist du dran!<small style="margin-top:6px">Ab aufs iPad damit.</small>'), at(3.2, confetti),
  at(6.2, () => { closeShot(false); titleCard(true, 'GymDesk', 'Bereit für die erste Anmeldung', 'Zum Home-Bildschirm hinzufügen und loslegen'); })]);

/* ---------- Abspielen ---------- */
let ci = 0, t = 0, playing = false, acts = [], last = performance.now();
function startCh(i) {
  ci = Math.max(0, Math.min(CH.length - 1, i)); t = 0;
  const ch = CH[ci];
  closeShot(false); $('#confetti').innerHTML = ''; figure('');
  if (ch.act === 2 || ci > 0) titleCard(false);
  if (ch.act === 2 && ci !== CH.findIndex((c) => c.act === 2)) camTo('screen');
  if (ch.act === 1 && ci > 1 && ci < CH.length) camTo('screen');
  ch.enter();
  acts = ch.steps();
  acts = acts.flat().map((a) => ({ ...a, done: false }));
  $('#cap-chapter').textContent = (ch.act === 1 ? A1 : A2) + ' · ' + ch.label;
  $('#cap-chapter').classList.add('on');
  document.querySelectorAll('#timeline span').forEach((s, k) => { s.classList.toggle('done', k < ci); s.querySelector('i').style.width = k < ci ? '100%' : '0'; });
  $('#b-act1').classList.toggle('on', ch.act === 1); $('#b-act2').classList.toggle('on', ch.act === 2);
}
function frame(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  if (playing) {
    t += dt;
    for (const a of acts) if (!a.done && t >= a.t) { const p = a.d ? Math.min(1, (t - a.t) / a.d) : 1; a.f(p, a); if (p >= 1) a.done = true; }
    const bar = document.querySelectorAll('#timeline span i')[ci]; if (bar) bar.style.width = Math.min(100, (t / CH[ci].dur) * 100) + '%';
    if (t >= CH[ci].dur) { if (ci < CH.length - 1) startCh(ci + 1); else finish(); }
  }
  requestAnimationFrame(frame);
}
function setPlay(v) { playing = v; stage.classList.toggle('paused', !v); $('#b-play').textContent = v ? '⏸' : '▶'; }
function finish() {
  setPlay(false);
  if (REC) { window.__done = true; return; }
  const s = $('#start'); s.style.display = '';
  s.querySelector('h1').textContent = 'Ende – danke fürs Zuschauen!';
  s.querySelector('p').textContent = 'Die echte App ist fertig und wartet auf die erste Anmeldung.';
  $('#b-start').textContent = '↻ Nochmal ansehen';
}
function fit() {
  const W = innerWidth, H = innerHeight - (REC ? 0 : 64), k = Math.min(W / 1600, H / 900);
  stage.style.transform = `translate(${(W - 1600 * k) / 2}px,${(H - 900 * k) / 2}px) scale(${k})`;
}

buildRoom();
$('#timeline').innerHTML = CH.map((c, i) => `<span class="${c.act === 2 ? 'a2' : ''}" title="${c.label}" data-i="${i}"><i></i></span>`).join('');
$('#timeline').addEventListener('click', (e) => { const s = e.target.closest('span'); if (s) { startCh(+s.dataset.i); setPlay(true); } });
$('#b-play').onclick = () => setPlay(!playing);
$('#b-prev').onclick = () => { startCh(ci - 1); setPlay(true); };
$('#b-next').onclick = () => { startCh(ci + 1); setPlay(true); };
$('#b-act1').onclick = () => { camTo('wide', true); startCh(0); setPlay(true); };
$('#b-act2').onclick = () => { startCh(CH.findIndex((c) => c.act === 2)); setPlay(true); };
$('#b-sound').onclick = () => { soundOn = !soundOn; $('#b-sound').textContent = soundOn ? '🔊' : '🔇'; if (soundOn) { ac = ac || new AudioContext(); ac.resume(); } };
$('#b-start').onclick = () => {
  $('#start').style.display = 'none';
  soundOn = true; $('#b-sound').textContent = '🔊'; ac = ac || new AudioContext(); ac.resume();
  camTo('wide', true); startCh(0); setPlay(true);
};
addEventListener('resize', fit);
addEventListener('keydown', (e) => { if (e.key === ' ') { e.preventDefault(); setPlay(!playing); } if (e.key === 'ArrowRight') $('#b-next').click(); if (e.key === 'ArrowLeft') $('#b-prev').click(); });
fit();
startCh(0); setPlay(false);
requestAnimationFrame(frame);
window.FILM = { begin() { camTo('wide', true); startCh(0); setPlay(true); }, CH, startCh, setPlay, get t() { return t; }, set t(v) { t = v; }, get ci() { return ci; } };
