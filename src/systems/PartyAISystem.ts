import { CombatSystem } from './CombatSystem';
import type { PartyBot } from '../entities/PartyBot';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { MapLoader } from '../world/MapLoader';

const FOLLOW_DIST = 2.2;
const LEASH_FROM_PLAYER = 14;

export class PartyAISystem {
  static update(
    dt: number,
    player: Player,
    bots: PartyBot[],
    enemies: Enemy[],
    map: MapLoader
  ): void {
    if (!player.isAlive) {
      return;
    }

    for (const bot of bots) {
      if (!bot.isAlive) {
        continue;
      }

      let target: Enemy | null = null;
      let targetDist = bot.engageRange;
      for (const enemy of enemies) {
        if (!enemy.isAlive) {
          continue;
        }
        const dist = Math.hypot(enemy.worldX - bot.worldX, enemy.worldY - bot.worldY);
        if (dist <= targetDist) {
          targetDist = dist;
          target = enemy;
        }
      }

      const distToPlayer = Math.hypot(player.worldX - bot.worldX, player.worldY - bot.worldY);

      if (target && distToPlayer <= LEASH_FROM_PLAYER) {
        if (targetDist <= bot.stats.attackRange) {
          CombatSystem.attack(bot, target);
        } else {
          PartyAISystem.moveToward(bot, target.worldX, target.worldY, dt, map);
        }
      } else if (distToPlayer > FOLLOW_DIST) {
        PartyAISystem.moveToward(bot, player.worldX, player.worldY, dt, map);
      }
    }
  }

  private static moveToward(
    bot: PartyBot,
    wx: number,
    wy: number,
    dt: number,
    map: MapLoader
  ): void {
    const dx = wx - bot.worldX;
    const dy = wy - bot.worldY;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) {
      return;
    }
    const step = bot.stats.moveSpeed * dt;
    bot.moveWorld((dx / dist) * step, (dy / dist) * step, map);
  }
}
