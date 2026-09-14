import { CombatSystem } from './CombatSystem';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';

const PHASE_ATTACK_STEP = 0.4;
const PHASE_SPEED_STEP = 0.15;

export class BossSystem {
  static update(enemy: Enemy, player: Player, now: number): void {
    if (!enemy.isAlive) {
      return;
    }

    const def = enemy.def;
    const ratio = enemy.hpRatio;
    const targetPhase = ratio <= 0.33 ? 3 : ratio <= 0.66 ? 2 : 1;

    if (targetPhase > enemy.bossPhase) {
      enemy.bossPhase = targetPhase;
      const tier = targetPhase - 1;
      enemy.stats.attack = Math.round(def.stats.attack * (1 + PHASE_ATTACK_STEP * tier));
      enemy.stats.moveSpeed = def.stats.moveSpeed * (1 + PHASE_SPEED_STEP * tier);
      CombatSystem.floatingText(
        player.scene,
        enemy.x,
        enemy.y - enemy.height,
        `¡Fase ${targetPhase}!`,
        '#ff9a6a'
      );
    }

    const slamCooldown = def.slamCooldown;
    if (slamCooldown === undefined) {
      return;
    }

    if (enemy.slamReadyAt === 0) {
      enemy.slamReadyAt = now + slamCooldown * 1000;
      return;
    }

    if (now < enemy.slamReadyAt) {
      return;
    }
    enemy.slamReadyAt = now + slamCooldown * 1000;

    const radius = def.slamRadius ?? 3;
    BossSystem.telegraph(player, enemy.x, enemy.y, radius);

    const dist = Math.hypot(player.worldX - enemy.worldX, player.worldY - enemy.worldY);
    if (player.isAlive && dist <= radius + player.radius) {
      const damage = Math.round(enemy.stats.attack * (def.slamDamageMult ?? 1.5));
      CombatSystem.applyDamage(player, damage);
      player.scene.cameras.main.shake(160, 0.006);
    }
  }

  private static telegraph(player: Player, x: number, y: number, radiusTiles: number): void {
    const scene = player.scene;
    const ring = scene.add.circle(x, y, radiusTiles * 32, 0xff7a5a, 0.12).setDepth(85000);
    ring.setStrokeStyle(3, 0xff7a5a, 0.8);
    ring.setScale(0.5);
    scene.tweens.add({
      targets: ring,
      scale: 1,
      alpha: 0,
      duration: 380,
      onComplete: () => ring.destroy(),
    });
  }
}
