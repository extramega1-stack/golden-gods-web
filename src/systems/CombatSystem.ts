import { COMBAT } from '../data/balance';
import type { Unit } from '../entities/Unit';
import type { Fx } from './Fx';

export class CombatSystem {
  static attack(attacker: Unit, defender: Unit, fx?: Fx): boolean {
    if (!attacker.isAlive || !defender.isAlive) {
      return false;
    }
    const now = performance.now();
    if (now < attacker.nextAttackAt) {
      return false;
    }
    attacker.nextAttackAt = now + attacker.stats.attackCooldown * 1000;

    const reduced = Math.max(
      COMBAT.minDamage,
      attacker.stats.attack - defender.stats.defense
    );
    CombatSystem.damage(defender, reduced, fx);
    return true;
  }

  static damage(target: Unit, amount: number, fx?: Fx): number {
    const dealt = target.takeDamage(amount);
    if (dealt > 0 && fx) {
      fx.floatingText(
        target.worldX,
        target.worldY + target.barHeight + 0.6,
        target.worldZ,
        String(dealt),
        '#ffd76a'
      );
    }
    return dealt;
  }
}
