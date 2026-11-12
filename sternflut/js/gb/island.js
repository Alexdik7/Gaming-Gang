// Heimatinsel: eigene kleine Insel, die man mit Geld und Schätzen ausbaut
// Hütte (Bett + PC), Beerenfeld, Weide (Kreaturen trainieren täglich), Werkstatt (Kugeln & Tränke herstellen), Leuchtfeuer
import { fade, wait } from './engine.js';
import { MAPS, LOOK, ITEMS } from './maps.js';
import { say, ask, choose, party } from './gbui.js';
import { sfx, cry, setMusic } from '../core/audio.js';
import { SPECIES } from '../data/creatures.js';
import { giveXp, monName } from '../data/mon.js';
import { placeSpot } from './dig.js';

ITEMS.inselkompass = { name: 'Inselkompass', desc: 'Zeigt immer zu deiner Heimatinsel. Im Freien benutzen, um hinzusegeln.', key: true };
const today = () => Math.floor(Date.now() / 864e5);
const W = 24, H = 20;
export const PROJECTS = {
  haus: { name: 'Hütte', cost: 3000, items: {}, desc: 'Ein Bett zum Ausruhen und ein PC für deine Boxen.' },
  feld: { name: 'Beerenfeld', cost: 2000, items: { goldmuschel: 1 }, desc: 'Sechs Beerensträucher. Jeden Tag reife Beeren.' },
  weide: { name: 'Weide', cost: 4000, items: { sternquarz: 1 }, desc: 'Bis zu 6 Kreaturen aus der Box grasen hier und trainieren jeden Tag.' },
  werk: { name: 'Werkstatt', cost: 5000, items: { urbernstein: 1 }, desc: 'Tüftler Bo stellt aus Schätzen und Beeren Kugeln und Tränke her.' },
  feuer: { name: 'Leuchtfeuer', cost: 8000, items: { meteorit: 1 }, desc: 'Ein Leuchtturm wie in Muschelbucht. Nachts leuchtet die ganze Insel.' },
};
const RECIPES = [
  { name: '5 Sternkugeln', need: { sternquarz: 1 }, get: { sternkristall: 5 } },
  { name: '3 Bandkugeln', need: { goldmuschel: 1 }, get: { freundkristall: 3 } },
  { name: '3 Echokugeln', need: { urbernstein: 1 }, get: { echokristall: 3 } },
  { name: '3 Sonderbonbons', need: { meteorit: 1 }, get: { sonderbonbon: 3 } },
  { name: '1 Hypertrank', need: { heilbeere: 3 }, get: { hypertrank: 1 } },
  { name: '2 Top-Tränke', need: { heilbeere: 4, klarbeere: 2 }, get: { toptrank: 2 } },
];
const st = s => (s.island ||= { built: {}, weide: [], day: today() });

// ---------------------------------------------------------------- Karte nach Ausbaustand erzeugen
export function buildIsland(s) {
  const I = s ? st(s) : { built: {}, weide: [] }, B = I.built, g = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) { const d = ((x - 11.5) / 11.2) ** 2 + ((y - 8) / 8.2) ** 2; r.push(d > 1 ? '~' : d > 0.8 ? 's' : d > 0.64 ? 'T' : (x * 7 + y * 3) % 11 === 0 ? ',' : '.'); } g.push(r); }
  const set = (x, y, c) => { if (g[y]) g[y][x] = c; }, fill = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
  fill(4, 3, 9, 7, '.'); fill(14, 3, 19, 7, '.'); fill(3, 10, 9, 14, '.'); fill(15, 10, 19, 14, '.');
  for (let y = 9; y <= 16; y++) { set(11, y, '='); set(12, y, '='); }
  fill(5, 7, 18, 8, '.'); for (let x = 6; x <= 17; x++) set(x, 8, '=');
  set(11, 17, 'B'); set(12, 17, 'B'); set(11, 18, 'B'); set(12, 18, 'B'); set(13, 16, 's'); set(10, 16, 's');
  const signs = {}, buildings = [], npcs = [];
  if (B.haus) buildings.push({ x: 4, y: 3, w: 6, h: 4, door: 2, roof: '#c86a48', wall: '#f8ecd8', to: 'inselhaus' });
  else { set(6, 6, 'S'); signs['6,6'] = 'BAUPLATZ: HÜTTE\nFrag Baumeisterin Tilda.'; }
  if (B.feld) { for (const x of [14, 16, 18]) { set(x, 4, 'U'); set(x, 6, 'U'); } }
  else { set(16, 5, 'S'); signs['16,5'] = 'BAUPLATZ: BEERENFELD\nFrag Baumeisterin Tilda.'; }
  if (B.weide) {
    for (let x = 3; x <= 9; x++) { set(x, 10, 'F'); if (x !== 6) set(x, 14, 'F'); }
    for (let y = 10; y <= 14; y++) { set(3, y, 'F'); set(9, y, 'F'); }
    I.weide.forEach((m, i) => npcs.push({ id: 'weide_' + i, x: 4 + (i % 3) * 2, y: 11 + Math.floor(i / 3) * 2, dir: 'down', mon: m.sp, name: monName(m), wander: 1 }));
    npcs.push({ id: 'hirtin', x: 10, y: 13, dir: 'left', look: LOOK.kid || LOOK.lass, name: 'Hirtin Ronja' });
  } else { set(6, 12, 'S'); signs['6,12'] = 'BAUPLATZ: WEIDE\nFrag Baumeisterin Tilda.'; }
  if (B.werk) buildings.push({ x: 15, y: 10, w: 5, h: 4, door: 2, roof: '#5a7ab8', wall: '#e8f0f8', to: 'inselwerk' });
  else { set(17, 12, 'S'); signs['17,12'] = 'BAUPLATZ: WERKSTATT\nFrag Baumeisterin Tilda.'; }
  if (B.feuer) buildings.push({ x: 19, y: 3, w: 3, h: 3, door: 1, tower: true, lock: 'never', lockText: ['Das Leuchtfeuer brennt hell. Von hier sieht man bis zum Horizont.'] });
  npcs.push({ id: 'tilda', x: 13, y: 7, dir: 'down', look: { skin: '#e8b892', hair: '#c86a28', outfit: '#f8a830', pants: '#4a4a6a', cap: '#f8d040', accent: '#ffffff', pony: true }, name: 'Baumeisterin Tilda' });
  npcs.push({ id: 'bootsfrau', x: 13, y: 16, dir: 'left', look: LOOK.matrose, name: 'Bootsfrau Ebbe' });
  const M = MAPS.heimatinsel ||= {};
  Object.assign(M, { name: s?.name ? `Insel von ${s.name}` : 'Heimatinsel', outdoor: true, enc: null, fishing: true, fishEnc: 'wasser', bg: 'wasser', rows: g.map(r => r.join('')), signs, buildings, npcs, warps: [], edges: {}, sig: JSON.stringify(B) + I.weide.length });
  return M;
}
MAPS.inselhaus = { name: 'Deine Hütte', indoor: true, rows: ['#K#ww#Q#', 'oooooooo', 'ottooooY', 'ottooooo', 'oooouuoo', 'kooouuok', 'ooommooo'], npcs: [] };
MAPS.inselwerk = { name: 'Werkstatt', indoor: true, rows: ['#KMwwMK#', 'oooooooo', 'oCCCCCoo', 'oooooooo', 'oooouuoo', 'kooouuok', 'ooommooo'], npcs: [{ id: 'tueftler', x: 3, y: 1, dir: 'down', look: LOOK.hiker, name: 'Tüftler Bo' }] };
buildIsland(null);

// ---------------------------------------------------------------- Akt-Schnittstelle
let HE; export function init(h) { HE = h; const M = MAPS.ankerbrueck; if (M) { const p = placeSpot(M, 12, 12); if (p) M.npcs.push({ id: 'wenke', x: p.x, y: p.y, dir: 'down', look: LOOK.fischer, name: 'Kapitänin Wenke' }); } }
export const QUESTS = {}, LOGS = {}, GYMS = {};
async function reload(g) { const p = g.ow.p; await fade(1, 300); buildIsland(g.state); g.ow.load('heimatinsel', p.x, p.y, p.dir); await fade(0, 300); }
export async function mapEvent(g, id) {
  const s = g.state;
  if (id !== 'heimatinsel') return;
  const I = st(s);
  if (MAPS.heimatinsel.sig !== JSON.stringify(I.built) + I.weide.length) { buildIsland(s); const p = g.ow.p; g.ow.load('heimatinsel', p.x, p.y, p.dir); }
  const days = Math.min(7, today() - (I.day || today()));
  if (days > 0 && I.weide.length) {
    const msg = [];
    for (const m of I.weide) { const before = m.lvl; giveXp(m, Math.floor(days * (40 + m.lvl * m.lvl * 0.6))); if (m.lvl > before) msg.push(`${monName(m)} ist jetzt Level ${m.lvl}!`); }
    await say(['Hirtin Ronja winkt: Deine Kreaturen haben auf der Weide fleißig trainiert!', ...msg]);
  }
  I.day = today();
}
export async function useItem(g, k) {
  if (k !== 'inselkompass') return false;
  const s = g.state, ow = g.ow;
  if (ow.id === 'heimatinsel') { await say('Du bist schon auf deiner Insel!'); return true; }
  if (!ow.M.outdoor || ow.M.space || ow.p.surf) { await say('Die Nadel dreht sich … Hier draußen ist kein Wasser in Sicht. Geh ins Freie.'); return true; }
  if (!await ask('Zur Heimatinsel segeln?')) return true;
  s.islandRet = { map: ow.id, x: ow.p.x, y: ow.p.y, dir: ow.p.dir };
  await fade(1, 500); buildIsland(s); ow.load('heimatinsel', 12, 15, 'up'); await fade(0, 500);
  g.fieldExit = true; return true;
}
export async function talk(g, n) {
  const s = g.state, N = { name: n.name }, I = st(s);
  if (n.id === 'wenke') {
    if (s.bag.inselkompass) return say(['Kapitänin Wenke: Na, wie geht es deiner Insel? Pflanz was Schönes!'], N);
    if (!s.badges.some(Boolean)) return say(['Kapitänin Wenke: Ich hab da draußen eine kleine Insel, um die sich keiner kümmert.', 'Kapitänin Wenke: Komm wieder, wenn du einen Orden hast. Dann vertraue ich sie dir an.'], N);
    await say(['Kapitänin Wenke: Du bist doch das Kind von Liv! Du hast ihre Augen.', 'Kapitänin Wenke: Deine Mutter und ich haben als Kinder auf einer kleinen Insel gespielt. Seitdem steht sie leer.', 'Kapitänin Wenke: Sie gehört jetzt dir. Hier, der Kompass zeigt immer dorthin.'], N);
    s.bag.inselkompass = 1; sfx('caught');
    return say(['Du erhältst den INSELKOMPASS!', 'Benutze ihn im Beutel, wenn du im Freien bist. Auf der Insel wartet Baumeisterin Tilda.']);
  }
  if (n.id === 'bootsfrau') {
    const r = s.islandRet || { map: 'ankerbrueck', x: 10, y: 10, dir: 'down' };
    if (!await ask(`Zurück nach ${MAPS[r.map]?.name || 'Ankerbrück'} segeln?`)) return true;
    await fade(1, 500); g.ow.load(r.map, r.x, r.y, r.dir); g.ow.music?.(); await fade(0, 500); return true;
  }
  if (n.id === 'tilda') {
    await say(Object.keys(I.built).length ? 'Baumeisterin Tilda: Was bauen wir als Nächstes?' : ['Baumeisterin Tilda: Hallo! Wenke hat mich geschickt. Ich baue dir hier alles, was du willst.', 'Baumeisterin Tilda: Du bezahlst, ich hämmere. Für manche Bauten brauche ich auch besondere Schätze – die findest du beim Graben.'], N);
    for (;;) {
      const keys = Object.keys(PROJECTS).filter(k => !I.built[k]);
      if (!keys.length) return say('Baumeisterin Tilda: Alles gebaut! Die schönste Insel der Welt.', N);
      const can = k => s.money >= PROJECTS[k].cost && Object.entries(PROJECTS[k].items).every(([i, q]) => (s.bag[i] || 0) >= q);
      const c = await choose([...keys.map(k => ({ label: PROJECTS[k].name, right: PROJECTS[k].cost + '◈', desc: PROJECTS[k].desc + (Object.keys(PROJECTS[k].items).length ? ' Braucht: ' + Object.entries(PROJECTS[k].items).map(([i, q]) => `${q}× ${ITEMS[i].name}`).join(', ') : ''), disabled: !can(k) })), 'Später'], { title: `Geld: ${s.money} ◈`, w: 176 });
      if (c === null || c === keys.length) return;
      const k = keys[c], P = PROJECTS[k];
      if (!can(k)) { await say('Baumeisterin Tilda: Dafür fehlt noch etwas.', N); continue; }
      if (!await ask(`${P.name} für ${P.cost} ◈ bauen?`)) continue;
      s.money -= P.cost; for (const [i, q] of Object.entries(P.items)) { s.bag[i] -= q; if (s.bag[i] <= 0) delete s.bag[i]; }
      I.built[k] = true;
      await say('Baumeisterin Tilda: Ran an die Arbeit! * Hämmern * * Sägen * …', N);
      sfx('caught'); await reload(g);
      await say(`${P.name} ist fertig!`);
      if (k === 'feuer' && !s.flags.log40) { await say(['Als das Leuchtfeuer zum ersten Mal brennt, fällt dir der Pager aus der Tasche.', 'Aus seinem Futter rutscht ein Blatt, das du noch nie gesehen hast …']); await HE.addLog(g, 40); }
      g.save?.(true); return;
    }
  }
  if (n.id === 'hirtin') {
    for (;;) {
      const c = await choose(['Kreatur auf die Weide', 'Kreatur abholen', 'Tschüss'], { title: `Weide ${I.weide.length}/6` });
      if (c === null || c === 2) return;
      if (c === 0) {
        if (I.weide.length >= 6) { await say('Hirtin Ronja: Die Weide ist voll!', N); continue; }
        if (!s.box.length) { await say('Hirtin Ronja: In deiner Box ist niemand. Schick erst Kreaturen in die Box!', N); continue; }
        const i = await choose(s.box.map(m => ({ label: monName(m), right: 'Lv' + m.lvl })), { title: 'Aus der Box', max: 7 });
        if (i === null) continue;
        const [m] = s.box.splice(i, 1); I.weide.push(m); cry(SPECIES[m.sp].cry);
        await say(`${monName(m)} springt fröhlich auf die Weide!`); await reload(g); continue;
      }
      if (!I.weide.length) { await say('Hirtin Ronja: Die Weide ist leer.', N); continue; }
      const i = await choose(I.weide.map(m => ({ label: monName(m), right: 'Lv' + m.lvl })), { title: 'Abholen' });
      if (i === null) continue;
      const [m] = I.weide.splice(i, 1);
      if (s.team.length < 6) s.team.push(m); else s.box.push(m);
      await say(`${monName(m)} kommt zurück${s.team.includes(m) ? ' ins Team' : ' in die Box'}.`); await reload(g);
    }
  }
  if (n.id.startsWith('weide_')) { const m = I.weide[+n.id.slice(6)]; if (m) { cry(SPECIES[m.sp].cry); return say(`${monName(m)} (Lv ${m.lvl}) grast zufrieden und schaut dich an.`); } return true; }
  if (n.id === 'tueftler') {
    await say('Tüftler Bo: Bring mir Schätze, ich bastle was draus!', N);
    for (;;) {
      const has = r => Object.entries(r.need).every(([i, q]) => (s.bag[i] || 0) >= q);
      const c = await choose([...RECIPES.map(r => ({ label: r.name, desc: 'Braucht: ' + Object.entries(r.need).map(([i, q]) => `${q}× ${ITEMS[i].name}`).join(', '), disabled: !has(r) })), 'Fertig'], { title: 'Werkstatt', w: 176 });
      if (c === null || c === RECIPES.length) return;
      const r = RECIPES[c]; if (!has(r)) { await say('Tüftler Bo: Dafür fehlen mir die Zutaten.', N); continue; }
      for (const [i, q] of Object.entries(r.need)) { s.bag[i] -= q; if (s.bag[i] <= 0) delete s.bag[i]; }
      for (const [i, q] of Object.entries(r.get)) s.bag[i] = (s.bag[i] || 0) + q;
      sfx('caught'); await say(`* Klopf, klopf * Du erhältst ${r.name}!`);
    }
  }
  return false;
}
