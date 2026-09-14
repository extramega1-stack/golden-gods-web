import { CombatSystem } from './CombatSystem';
import { TILE_SIZE } from '../config/constants';
import type { EnemyUnit } from '../entities/EnemyUnit';
import type { PlayerUnit } from '../entities/PlayerUnit';
import type { Fx } from './Fx';

const PHASE_ATTACK_STEP = 0.4;
const PHASE_SPEED_STEP = 0.15;
/** Margen para apartarse tras el aviso del golpe sísmico. */
const SLAM_TELEGRAPH_MS = 450;

/**
 * Comportamiento del jefe: sube de fase a dos umbrales de vida y lanza un golpe en área.
 * El golpe se anuncia con un anillo y solo resuelve daño tras el aviso, de modo que se
 * puede esquivar moviéndose fuera del círculo.
 */
export class BossSystem {
  static update(enemy: EnemyUnit, player: PlayerUnit, now: number, fx?: Fx): void {
    if (!enemy.isAlive) {
      return;
    }

    BossSystem.updatePhase(enemy, fx);
    BossSystem.resolveSlam(enemy, player, now, fx);
    BossSystem.scheduleSlam(enemy, now, fx);
  }

  private static updatePhase(enemy: EnemyUnit, fx?: Fx): void {
    const def = enemy.def;
    const ratio = enemy.hpRatio;
    const targetPhase = ratio <= 0.33 ? 3 : ratio <= 0.66 ? 2 : 1;

    if (targetPhase <= enemy.bossPhase) {
      return;
    }

    enemy.bossPhase = targetPhase;
    const tier = targetPhase - 1;
    enemy.stats.attack = Math.round(def.stats.attack * (1 + PHASE_ATTACK_STEP * tier));
    enemy.stats.moveSpeed = def.stats.moveSpeed * (1 + PHASE_SPEED_STEP * tier);

    fx?.floatingText(
      enemy.worldX,
      enemy.worldY + enemy.barHeight,
      enemy.worldZ,
      `¡Fase ${targetPhase}!`,
      '#ff9a6a',
      1.3
    );
  }

  private static scheduleSlam(enemy: EnemyUnit, now: number, fx?: Fx): void {
    const cooldown = enemy.def.slamCooldown;
    if (cooldown === undefined || enemy.slamPendingAt > 0) {
      return;
    }
    if (enemy.slamReadyAt === 0) {
      enemy.slamReadyAt = now + cooldown * 1000;
      return;
    }
    if (now < enemy.slamReadyAt) {
      return;
    }

    enemy.slamReadyAt = now + cooldown * 1000;
    enemy.slamPendingAt = now + SLAM_TELEGRAPH_MS;
    enemy.slamX = enemy.worldX;
    enemy.slamZ = enemy.worldZ;
    enemy.slamDamage = Math.round(
      enemy.stats.attack * (enemy.def.slamDamageMult ?? 1.5)
    );

    fx?.ring(enemy.slamX, enemy.worldY, enemy.slamZ, enemy.def.slamRadius ?? 3, 0xff7a5a, 0.45);
  }

  private static resolveSlam(enemy: EnemyUnit, player: PlayerUnit, now: number, fx?: Fx): void {
    if (enemy.slamPendingAt === 0 || now < enemy.slamPendingAt) {
      return;
    }

    enemy.slamPendingAt = 0;
    const radius = (enemy.def.slamRadius ?? 3) * TILE_SIZE;
    const dist = Math.hypot(player.worldX - enemy.slamX, player.worldZ - enemy.slamZ);

    if (player.isAlive && dist <= radius + player.radius) {
      CombatSystem.damage(player, enemy.slamDamage, fx);
      fx?.shake(0.2, 0.45);
    }
  }
}
