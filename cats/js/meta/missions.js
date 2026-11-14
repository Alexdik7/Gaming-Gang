// MissionManager, DailyRewardManager und Achievements – alles reine Funktionen auf dem Spielstand.
import { MISSIONS, ACHIEVEMENTS, DAILY, DAILY_HOURS, STREAK_BREAK } from '../data/meta.js';
import { CATS } from '../data/cats.js';
import { rng, hash } from '../sim/maps.js';
import { grant } from './currency.js';
import { calcRewards, resultStats } from './progression.js';

const H = 3600e3;
export const dayKey = now => { const d = new Date(now); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

// ---------------------------------------------------------------- Tägliche Missionen
// Jeden Tag 3 neue Missionen; die Auswahl hängt nur vom Datum (und Konto) ab.
export function ensureMissions(s, now = Date.now()) {
  const key = dayKey(now);
  if (s.missions.date === key && s.missions.list.length) return false;
  const r = rng(hash(key + s.uid)), pool = MISSIONS.filter(m => !m.lvl || s.level >= m.lvl), list = [];
  while (list.length < 3 && pool.length) {
    const m = pool.splice(Math.floor(r() * pool.length), 1)[0];
    const tier = Math.min(2, Math.floor(s.level / 8));
    list.push({ id: m.id, n: m.n[tier], p: 0, claimed: false, mul: 1 + tier * 0.5 });
  }
  s.missions = { date: key, list };
  return true;
}
export const missionDef = id => MISSIONS.find(m => m.id === id);
export function missionReward(m) {
  const r = missionDef(m.id).r, out = {};
  for (const k in r) out[k] = k === 'power' ? r[k] : Math.round(r[k] * m.mul);
  return out;
}
export function claimMission(s, i) {
  const m = s.missions.list[i];
  if (!m || m.claimed || m.p < m.n) return null;
  m.claimed = true;
  return grant(s, missionReward(m));
}
export const msToMidnight = now => { const d = new Date(now); d.setHours(24, 0, 0, 0); return d - now; };

// Statistik erhöhen – zählt gleichzeitig für Missionen und Erfolge
export function bumpStats(s, delta) {
  for (const k in delta) {
    if (!delta[k]) continue;
    s.stats[k] = (s.stats[k] || 0) + delta[k];
    for (const m of s.missions.list) if (missionDef(m.id).stat === k && !m.claimed) m.p = Math.min(m.n, m.p + delta[k]);
  }
}

// ---------------------------------------------------------------- Tägliche Belohnung
export function dailyState(s, now = Date.now()) {
  const since = now - s.daily.last, wait = DAILY_HOURS * H;
  const ready = !s.daily.last || since >= wait;
  const broken = s.daily.last && since >= STREAK_BREAK * H;
  return { ready, msLeft: ready ? 0 : wait - since, day: broken ? 0 : s.daily.day % DAILY.length, streak: broken ? 0 : s.daily.streak };
}
export function claimDaily(s, now = Date.now()) {
  const st = dailyState(s, now);
  if (!st.ready) return null;
  const got = grant(s, DAILY[st.day]);
  s.daily = { day: st.day + 1, last: now, streak: st.streak + 1 };
  s.stats.bestStreak = Math.max(s.stats.bestStreak || 0, s.daily.streak);
  return got;
}
export function fmtTime(ms, lang = 0) {
  const m = Math.ceil(ms / 60000), h = Math.floor(m / 60);
  return h > 0 ? `${h} ${lang ? 'h' : 'Std.'} ${m % 60} ${lang ? 'min' : 'Min.'}` : `${m} ${lang ? 'min' : 'Min.'}`;
}

// ---------------------------------------------------------------- Erfolge
export function statValue(s, stat) {
  if (stat === 'level') return s.level;
  if (stat === 'catsOwned') return Object.keys(s.cats).length;
  if (stat === 'legendOwned') return Object.keys(s.cats).filter(c => CATS[c] && CATS[c].cls.includes('legend')).length;
  return s.stats[stat] || 0;
}
export function achState(s) {
  return ACHIEVEMENTS.map(a => {
    const tier = s.ach[a.id] || 0, val = statValue(s, a.stat), max = tier >= a.n.length;
    return { a, tier, val, max, goal: a.n[Math.min(tier, a.n.length - 1)], ready: !max && val >= a.n[tier] };
  });
}
export function claimAch(s, id) {
  const st = achState(s).find(x => x.a.id === id);
  if (!st || !st.ready) return null;
  s.ach[id] = st.tier + 1;
  return grant(s, { crystals: st.a.r[st.tier] });
}
export const claimable = s => ({
  ach: achState(s).filter(x => x.ready).length,
  missions: s.missions.list.filter(m => !m.claimed && m.p >= m.n).length,
  daily: dailyState(s).ready ? 1 : 0
});

// ---------------------------------------------------------------- Rundenende: alles verbuchen
export function finishRound(s, result) {
  const rew = calcRewards(result, s);
  bumpStats(s, resultStats(result, s.uid));
  const got = grant(s, rew);
  const m = s.maps[result.mapId] || (s.maps[result.mapId] = {});
  if (result.mode === 'endless') { m.endless = Math.max(m.endless || 0, result.wave); s.stats.bestEndless = Math.max(s.stats.bestEndless || 0, result.wave); }
  else if (result.win) m[result.diff] = (m[result.diff] || 0) + 1;
  return Object.assign(got, { first: rew.first });
}
