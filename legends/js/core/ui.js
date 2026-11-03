// Kleine UI-Helfer (DOM)
import { sfx } from './audio.js';
import { TYPES } from '../data/types.js';
import { SPECIES } from '../data/creatures.js';

export const $ = s => document.querySelector(s);
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const typeChip = t => `<span class="chip" style="--c:${TYPES[t].color}">${TYPES[t].name}</span>`;

export function toast(text, ms = 2600) {
  const box = $('#toasts'), d = document.createElement('div');
  d.className = 'toast'; d.innerHTML = text; box.appendChild(d);
  setTimeout(() => d.classList.add('out'), ms); setTimeout(() => d.remove(), ms + 400);
}

// Modal mit Auswahl → Promise<index | null>
export function choose(title, items, { cancel = 'Abbrechen', html = '' } = {}) {
  return new Promise(res => {
    const m = $('#modal');
    m.innerHTML = `<div class="panel"><h3>${title}</h3>${html}<div class="list">${items.map((it, i) =>
      `<button class="item${it.disabled ? ' dis' : ''}" data-i="${i}" ${it.disabled ? 'disabled' : ''}>${it.html || esc(it.label)}</button>`).join('')}</div>
      ${cancel ? `<button class="btn ghost" data-i="-1">${cancel}</button>` : ''}</div>`;
    m.hidden = false; sfx('open');
    m.onclick = e => {
      const b = e.target.closest('[data-i]'); if (!b) return;
      sfx('click'); m.hidden = true; m.onclick = null;
      const i = +b.dataset.i; res(i < 0 ? null : i);
    };
  });
}

// Dialog (NPC) mit Weitertippen
export function dialog(name, lines) {
  return new Promise(res => {
    const d = $('#dialog'); let i = 0;
    const show = () => { d.innerHTML = `<div class="dname">${esc(name)}</div><div class="dtext">${lines[i]}</div><div class="dnext">▼</div>`; };
    d.hidden = false; show(); sfx('click');
    const next = e => {
      e.stopPropagation(); i++; sfx('click');
      if (i >= lines.length) { d.hidden = true; d.onclick = null; removeEventListener('keydown', key); res(); } else show();
    };
    const key = e => { if (['Space', 'Enter', 'KeyE'].includes(e.code)) next(e); };
    d.onclick = next; setTimeout(() => addEventListener('keydown', key), 150);
  });
}

export function monCard(m, extra = '') {
  const S = SPECIES[m.sp];
  return `<div class="mcard"><div class="mc-top"><b>${esc(m.nick || S.name)}</b><span>Lv ${m.lvl}</span></div>
    <div class="mc-types">${S.types.map(typeChip).join('')}</div>${extra}</div>`;
}
