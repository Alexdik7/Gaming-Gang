// PowerUpManager: begrenzte Spezialaktionen in der Runde.
import { BALANCE } from '../config.js';
import { POWERUPS } from '../data/meta.js';

export const POWER_USES = 3;   // höchstens so oft je Power-up und Runde

export class PowerUpManager {
  constructor(world) { this.world = world; }

  // Prüft Besitz, Abklingzeit und Ziel – dann wirkt das Power-up.
  use(pi, id, x, y) {
    const W = this.world, P = W.players[pi], def = POWERUPS[id];
    if (!def || !P) return 'unknown';
    if (!(P.powers[id] > 0)) return 'none';
    if (P.powerCd[id] > 0) return 'cooldown';
    if (W.phase === 'won' || W.phase === 'lost') return 'over';
    if (def.target && !(x >= 0 && y >= 0 && x <= 12 && y <= 16)) return 'target';
    if (id === 'heal' && W.lives >= W.maxLives) return 'full';
    P.powers[id]--; P.stats.powerUsed++;
    P.powerCd[id] = BALANCE.powerCooldown * (1 - (P.bonus.cooldown || 0));
    const E = W.enemies, fx = W.fx, w = Math.max(1, W.wave);
    if (id === 'catnip') { fx.catnip = def.dur; fx.catnipV = def.val; }
    else if (id === 'goldfish') fx.gold = def.dur;
    else if (id === 'double') fx.double = def.dur;
    else if (id === 'heal') W.lives = Math.min(W.maxLives, W.lives + def.val);
    else if (id === 'freeze') for (const e of E.list) e.stunT = Math.max(e.stunT, e.boss ? 2 : def.dur);
    else if (id === 'megapaw') {
      const dmg = (def.dmg + def.dmgPerWave * w) * (1 + w * 0.04);
      E.inRange(x, y, def.radius, e => E.damage(e, e.boss ? dmg * 2 : dmg, 'light', null, null));
    } else if (id === 'emergency') {
      W.towers.addMinion({ kind: 'ecat', x, y, dmg: def.dmg + def.dmgPerWave * w, rate: def.rate, range: def.range, life: def.dur, pen: 0.5, by: null, owner: pi });
    }
    W.emit({ e: 'power', id, pi, x, y });
    return null;
  }

  update(dt) {
    const W = this.world, fx = W.fx;
    if (fx.catnip > 0) fx.catnip -= dt;
    if (fx.gold > 0) fx.gold -= dt;
    if (fx.double > 0) fx.double -= dt;
    for (const P of W.players) for (const id in P.powerCd) if (P.powerCd[id] > 0) P.powerCd[id] -= dt;
  }
}
