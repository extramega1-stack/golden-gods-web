import { CombatSystem } from './CombatSystem';
import { BossSystem } from './BossSystem';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { MapLoader } from '../world/MapLoader';

export class AISystem {
  static update(dt: number, player: Player, enemies: Enemy[], map: MapLoader): void {
    if (!player.isAlive) {
      return;
    }

    const now = player.scene.time.now;

    for (const enemy of enemies) {
      if (!enemy.isAlive) {
        continue;
      }

      if (enemy.def.isBoss) {
        BossSystem.update(enemy, player, now);
      }

      const dx = player.worldX - enemy.worldX;
      const dy = player.worldY - enemy.worldY;
      const dist = Math.hypot(dx, dy);

      if (dist <= enemy.stats.attackRange) {
        CombatSystem.attack(enemy, player);
      } else if (dist <= enemy.aggroRange && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        enemy.moveWorld(
          nx * enemy.stats.moveSpeed * dt,
          ny * enemy.stats.moveSpeed * dt,
          map
        );
      }
    }
  }
}
