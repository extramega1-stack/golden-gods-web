import { CombatSystem } from './CombatSystem';
import { TILE_SIZE } from '../config/constants';
import type { PartyBotUnit } from '../entities/PartyBotUnit';
import type { EnemyUnit } from '../entities/EnemyUnit';
import type { PlayerUnit } from '../entities/PlayerUnit';
import type { Fx } from './Fx';

const FOLLOW_DIST = 2.2 * TILE_SIZE;
const LEASH_FROM_PLAYER = 14 * TILE_SIZE;

export class PartyAISystem {
  static update(
    dt: number,
    player: PlayerUnit,
    bots: PartyBotUnit[],
    enemies: EnemyUnit[],
    fx?: Fx
  ): void {
    if (!player.isAlive) {
      return;
    }

    for (const bot of bots) {
      if (!bot.isAlive) {
        continue;
      }

      let target: EnemyUnit | null = null;
      let targetDist = bot.engageRange;
      for (const enemy of enemies) {
        if (!enemy.isAlive) {
          continue;
        }
        const dist = Math.hypot(enemy.worldX - bot.worldX, enemy.worldZ - bot.worldZ);
        if (dist <= targetDist) {
          targetDist = dist;
          target = enemy;
        }
      }

      const distToPlayer = Math.hypot(player.worldX - bot.worldX, player.worldZ - bot.worldZ);

      if (target && distToPlayer <= LEASH_FROM_PLAYER) {
        bot.setFacing(target.worldX - bot.worldX, target.worldZ - bot.worldZ);
        if (targetDist <= bot.attackRange) {
          CombatSystem.attack(bot, target, fx);
        } else {
          PartyAISystem.stepToward(bot, target.worldX, target.worldZ, dt);
        }
      } else if (distToPlayer > FOLLOW_DIST) {
        bot.setFacing(player.worldX - bot.worldX, player.worldZ - bot.worldZ);
        PartyAISystem.stepToward(bot, player.worldX, player.worldZ, dt);
      }
    }
  }

  private static stepToward(bot: PartyBotUnit, x: number, z: number, dt: number): void {
    const dx = x - bot.worldX;
    const dz = z - bot.worldZ;
    const dist = Math.hypot(dx, dz);
    if (dist === 0) {
      return;
    }
    const step = bot.worldSpeed * dt;
    bot.moveWorld((dx / dist) * step, (dz / dist) * step);
  }
}
