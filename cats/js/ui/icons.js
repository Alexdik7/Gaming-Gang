// Kleine Symbole als Inline-SVG (Währungen, Leben) + Text-Helfer für Kosten und Belohnungen.
const svg = (inner, vb = '0 0 24 24') => `<svg class="ic" viewBox="${vb}">${inner}</svg>`;
export const IC = {
  coin: svg('<circle cx="12" cy="12" r="10" fill="#ffc93c" stroke="#a8650a" stroke-width="2"/><circle cx="12" cy="12" r="6" fill="none" stroke="#a8650a" stroke-width="1.6"/><path d="M9 9l1.5 3L9 15m6-6l-1.5 3L15 15" stroke="#a8650a" stroke-width="1.6" fill="none" stroke-linecap="round"/>'),
  crystal: svg('<path d="M12 2l8 7-8 13L4 9z" fill="#8fe3ff" stroke="#1f6f9c" stroke-width="2" stroke-linejoin="round"/><path d="M4 9h16M12 2l-3 7 3 13 3-13z" fill="none" stroke="#1f6f9c" stroke-width="1.4" stroke-linejoin="round"/>'),
  fish: svg('<path d="M2 12c3-6 10-7 14-3l5-4v14l-5-4c-4 4-11 3-14-3z" fill="#7fd6ff" stroke="#1d5f8a" stroke-width="2" stroke-linejoin="round"/><circle cx="7.5" cy="10.5" r="1.4" fill="#1d5f8a"/>'),
  heart: svg('<path d="M12 21C5 15 2 11.5 2 8a5 5 0 0110-1.5A5 5 0 0122 8c0 3.5-3 7-10 13z" fill="#ff5d7a" stroke="#8f1f3a" stroke-width="2" stroke-linejoin="round"/>'),
  lock: svg('<rect x="4" y="10" width="16" height="12" rx="3" fill="#b9b4e6" stroke="#2a2460" stroke-width="2"/><path d="M8 10V7a4 4 0 018 0v3" fill="none" stroke="#b9b4e6" stroke-width="3"/>'),
  xp: svg('<path d="M12 2l3 7 7 .6-5.4 4.6L18.4 21 12 17l-6.4 4 1.8-6.8L2 9.6 9 9z" fill="#b48cff" stroke="#4a2a9c" stroke-width="2" stroke-linejoin="round"/>')
};
export const POWER_EMOJI = { catnip: '🌿', megapaw: '🐾', heal: '💗', freeze: '❄️', goldfish: '🐠', double: '⚔️', emergency: '🚨' };
export const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + ' M' : n >= 10000 ? Math.round(n / 1000) + 'k' : String(Math.round(n));

// „300 🪙 5 💎“
export function costHtml(c) {
  return `<span class="cost">${c.coins ? IC.coin + fmt(c.coins) : ''}${c.coins && c.crystals ? '&nbsp;' : ''}${c.crystals ? IC.crystal + fmt(c.crystals) : ''}${!c.coins && !c.crystals ? '0' : ''}</span>`;
}
export function rewardHtml(r, tr) {
  const out = [];
  if (r.coins) out.push(IC.coin + fmt(r.coins));
  if (r.crystals) out.push(IC.crystal + fmt(r.crystals));
  if (r.xp) out.push(IC.xp + fmt(r.xp));
  if (r.power) out.push('🎁×' + r.power);
  return out.join(' &nbsp;');
}
