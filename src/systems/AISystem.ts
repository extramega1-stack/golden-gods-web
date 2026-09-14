import { CombatSystem } from './CombatSystem';
import { BossSystem } from './BossSystem';
import type { EnemyUnit } from '../entities/EnemyUnit';
import type { PlayerUnit } from '../entities/PlayerUnit';
import type { Fx } from './Fx';

export class AISystem {
  static update(dt: number, player: PlayerUnit, enemies: EnemyUnit[], fx?: Fx): void {
    if (!player.isAlive) {
      return;
    }

    const now = performance.now();

    for (const enemy of enemies) {
      if (!enemy.isAlive) {
        continue;
      }

      if (enemy.def.isBoss) {
        BossSystem.update(enemy, player, now, fx);
      }

      const dx = player.worldX - enemy.worldX;
      const dz = player.worldZ - enemy.worldZ;
      const dist = Math.hypot(dx, dz);

      if (dist <= enemy.attackRange) {
        enemy.setFacing(dx, dz);
        CombatSystem.attack(enemy, player, fx);
      } else if (dist <= enemy.aggroRange && dist > 0) {
        enemy.setFacing(dx, dz);
        const step = enemy.worldSpeed * dt;
        enemy.moveWorld((dx / dist) * step, (dz / dist) * step);
      }
    }
  }
}
