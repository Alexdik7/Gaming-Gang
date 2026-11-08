// Bildschirmfluss: Server → Login/Registrierung → Charakterwahl/-erstellung → Welt.
import { api, session, serverUrl, setServer, connectWorld } from './net.js';
import { WorldView } from './world.js';
import { figure, SKIN, HAIR, SHIRT } from './art.js';
import { SPECIES, STARTERS } from '../../shared/creatures.js';
import { TYPE_INFO } from '../../shared/types.js';

const $ = (s) => document.querySelector(s);
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
function show(id) { for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id; }
function err(id, e) { $(id).textContent = e ? e.message || e : ''; }

// --- Server ----------------------------------------------------------------------------------
$('#f-server').onsubmit = async (e) => {
  e.preventDefault();
  setServer($('#server-url').value.trim());
  try { await fetch(serverUrl() + '/health'); start(); } catch { err('#server-err', 'Server nicht erreichbar.'); }
};

// --- Login -----------------------------------------------------------------------------------
let mode = 'login';
$('#tab-login').onclick = () => setMode('login');
$('#tab-register').onclick = () => setMode('register');
function setMode(m) { mode = m; $('#tab-login').classList.toggle('on', m === 'login'); $('#tab-register').classList.toggle('on', m === 'register'); $('#auth-go').textContent = m === 'login' ? 'Anmelden' : 'Konto erstellen'; err('#auth-err'); }
$('#f-auth').onsubmit = async (e) => {
  e.preventDefault();
  try {
    const r = await api('/api/' + mode, { username: $('#user').value.trim(), password: $('#pass').value });
    session.set(r.token); $('#pass').value = ''; chars();
  } catch (x) { err('#auth-err', x); }
};
$('#change-server').onclick = () => { setServer(null); show('s-server'); };

// --- Charaktere ------------------------------------------------------------------------------
async function chars() {
  let list;
  try { list = (await api('/api/characters')).characters; }
  catch (x) { if (x.code === 'auth') { session.set(null); return show('s-login'); } return err('#auth-err', x); }
  const box = $('#char-list'); box.replaceChildren();
  for (const c of list) {
    const b = el('button', { className: 'char' }, big(figure(c.look, 'd', 0)), el('span', { textContent: c.name }), el('small', { textContent: c.map }));
    b.onclick = () => enter(c);
    box.append(b);
  }
  $('#new-char').hidden = list.length >= 3;
  show('s-chars');
}
$('#logout').onclick = async () => { try { await api('/api/logout', {}); } catch {} session.set(null); show('s-login'); };
function big(src, k = 4) { const c = el('canvas', { width: src.width * k, height: src.height * k }); const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, c.width, c.height); return c; }

// --- Erstellung ------------------------------------------------------------------------------
const look = { body: 0, hair: 0, color: 0 };
let starter = STARTERS[0];
$('#new-char').onclick = () => { renderCreate(); show('s-create'); };
$('#create-back').onclick = chars;
function renderCreate() {
  $('#preview').replaceChildren(...['d', 'l', 'u', 'r'].map((d) => big(figure(look, d, 0), 4)));
  const pick = (key, arr) => { const row = $('#pick-' + key); row.replaceChildren(...arr.map((c, i) => { const b = el('button', { className: 'swatch' + (look[key] === i ? ' on' : ''), title: String(i) }); b.style.background = c; b.onclick = () => { look[key] = i; renderCreate(); }; return b; })); };
  pick('body', SKIN); pick('hair', HAIR); pick('color', SHIRT);
  $('#starters').replaceChildren(...STARTERS.map((id) => {
    const s = SPECIES.get(id);
    const b = el('button', { className: 'starter' + (id === starter ? ' on' : '') }, el('b', { textContent: s.name }), el('small', { textContent: s.types.map((t) => TYPE_INFO[t].name).join(' / ') }), el('p', { textContent: s.desc }));
    b.style.borderColor = TYPE_INFO[s.types[0]].color;
    b.onclick = () => { starter = id; renderCreate(); };
    return b;
  }));
}
$('#f-create').onsubmit = async (e) => {
  e.preventDefault();
  try { await api('/api/characters', { name: $('#char-name').value.trim(), look, starter }); chars(); }
  catch (x) { err('#create-err', x); }
};

// --- Welt ------------------------------------------------------------------------------------
let view, conn;
const hud = {
  place: (name, n) => { $('#place').textContent = name; $('#online').textContent = n + ' hier'; },
};
function enter(c) {
  show('s-game');
  $('#chat-log').replaceChildren();
  conn = connectWorld(c.id, {
    onMessage: (m) => {
      if (m.t === 'chat') return chatLine(m);
      if (m.t === 'err') return chatLine({ ch: 'sys', msg: m.msg });
      if (m.t === 'welcome') { chatLine({ ch: 'sys', msg: `Willkommen in ${m.map === 'funkenrast' ? 'Funkenrast' : m.map}, ${m.you.name}! Partner: ${SPECIES.get(m.team[0]?.species)?.name || '–'} (Lv. ${m.team[0]?.level ?? '?'})` }); }
      view.onMessage(m);
    },
    onClose: (code) => { chatLine({ ch: 'sys', msg: code === 4004 ? 'Anderswo angemeldet – Verbindung getrennt.' : 'Verbindung getrennt.' }); setTimeout(chars, 1500); },
  });
  if (!view) view = new WorldView($('#world'), { send: (m) => conn.send(m) }, hud);
}
function chatLine(m) {
  const log = $('#chat-log');
  const who = m.ch === 'sys' ? '' : m.ch === 'whisper' ? `[${m.from} → ${m.to}] ` : `[${m.ch === 'global' ? 'Welt' : 'Hier'}] ${m.from}: `;
  log.append(el('div', { className: 'ln ' + m.ch, textContent: who + m.msg })); // textContent: niemals HTML aus dem Chat
  while (log.children.length > 60) log.firstChild.remove();
  log.scrollTop = log.scrollHeight;
}
$('#f-chat').onsubmit = (e) => {
  e.preventDefault();
  const v = $('#chat-in').value.trim(); if (!v) return;
  const w = v.match(/^\/w\s+(\S+)\s+(.+)/);
  conn.send(w ? { t: 'chat', ch: 'whisper', to: w[1], msg: w[2] } : { t: 'chat', ch: $('#chat-ch').value, msg: v });
  $('#chat-in').value = ''; $('#chat-in').blur();
};
$('#leave').onclick = () => conn.close();

// --- Start -----------------------------------------------------------------------------------
function start() {
  if (!serverUrl()) return show('s-server');
  if (session.get()) chars(); else show('s-login');
}
start();
