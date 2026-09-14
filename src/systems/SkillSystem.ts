import { CombatSystem } from './CombatSystem';
import { TILE_SIZE } from '../config/constants';
import type { PlayerUnit } from '../entities/PlayerUnit';
import type { EnemyUnit } from '../entities/EnemyUnit';
import type { Fx } from './Fx';
import type { SkillDef } from '../types';

export interface SkillContext {
  enemies: EnemyUnit[];
  spawnProjectile: (skill: SkillDef, damage: number, dir: { x: number; z: number }) => void;
}

export type CastResult = 'ok' | 'cooldown' | 'mana' | 'dead';

export class SkillSystem {
  static cast(
    player: PlayerUnit,
    skill: SkillDef,
    ctx: SkillContext,
    now: number,
    fx?: Fx
  ): CastResult {
    if (!player.isAlive) {
      return 'dead';
    }
    if (now < (player.skillReadyAt[skill.id] ?? 0)) {
      return 'cooldown';
    }
    if (player.stats.mp < skill.cost) {
      return 'mana';
    }

    player.stats.mp -= skill.cost;
    player.skillReadyAt[skill.id] = now + skill.cooldown * 1000;
    player.animation?.trigger('cast');

    const damage = Math.round(player.stats.attack * skill.damageMult);
    switch (skill.effect) {
      case 'aoe':
        SkillSystem.castAoe(player, skill, ctx, damage, fx);
        break;
      case 'heal':
        SkillSystem.castHeal(player, skill, damage, fx);
        break;
      case 'buff':
        SkillSystem.castBuff(player, skill, now, fx);
        break;
      case 'dash':
        SkillSystem.castDash(player, skill, fx);
        break;
      case 'projectile':
        SkillSystem.castProjectile(player, skill, ctx, damage, fx);
        break;
    }
    return 'ok';
  }

  private static castAoe(
    player: PlayerUnit,
    skill: SkillDef,
    ctx: SkillContext,
    damage: number,
    fx?: Fx
  ): void {
    const radius = (skill.radius ?? 2) * TILE_SIZE;
    for (const enemy of ctx.enemies) {
      if (!enemy.isAlive) {
        continue;
      }
      const dist = Math.hypot(enemy.worldX - player.worldX, enemy.worldZ - player.worldZ);
      if (dist <= radius + enemy.radius) {
        CombatSystem.damage(enemy, damage, fx);
      }
    }
    // El radio ya está en unidades de mundo: el anillo debe cubrir la zona real.
    fx?.ring(player.worldX, player.worldY, player.worldZ, radius, skill.color, 0.35);
    fx?.burst(player.worldX, player.worldY + 1, player.worldZ, skill.color, {
      count: 22,
      speed: 11,
      ttl: 0.45,
      spread: 1.2,
      lift: 4,
    });
  }

  private static castHeal(player: PlayerUnit, skill: SkillDef, damage: number, fx?: Fx): void {
    const heal = Math.round((skill.flat ?? 0) + damage);
    player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + heal);
    fx?.burst(player.worldX, player.worldY + 0.6, player.worldZ, skill.color, {
      count: 18,
      speed: 3,
      ttl: 0.85,
      spread: 1.4,
      lift: 6,
    });
    fx?.floatingText(
      player.worldX,
      player.worldY + player.barHeight,
      player.worldZ,
      `+${heal}`,
      '#8ef0a0'
    );
  }

  private static castBuff(player: PlayerUnit, skill: SkillDef, now: number, fx?: Fx): void {
    if (!skill.buff) {
      return;
    }
    player.addBuff(skill.buff, now);
    fx?.ring(player.worldX, player.worldY, player.worldZ, 1.6, skill.color, 0.5);
    fx?.burst(player.worldX, player.worldY + 0.4, player.worldZ, skill.color, {
      count: 16,
      speed: 2,
      ttl: 0.7,
      spread: 1.2,
      lift: 5,
    });
    fx?.floatingText(
      player.worldX,
      player.worldY + player.barHeight,
      player.worldZ,
      skill.name,
      '#c9b6ff'
    );
  }

  private static castDash(player: PlayerUnit, skill: SkillDef, fx?: Fx): void {
    const distance = (skill.dashDistance ?? 3) * TILE_SIZE;
    const steps = 8;
    const stepLength = distance / steps;
    const originX = player.worldX;
    const originZ = player.worldZ;

    for (let i = 0; i < steps; i++) {
      player.moveWorld(player.facing.x * stepLength, player.facing.z * stepLength);
    }

    fx?.burst(originX, player.worldY + 0.8, originZ, skill.color, {
      count: 12,
      speed: 4,
      ttl: 0.3,
      spread: 0.8,
      lift: 2,
    });
  }

  private static castProjectile(
    player: PlayerUnit,
    skill: SkillDef,
    ctx: SkillContext,
    damage: number,
    fx?: Fx
  ): void {
    let dir = { x: player.facing.x, z: player.facing.z };
    let best: EnemyUnit | null = null;
    let bestDist = Infinity;
    for (const enemy of ctx.enemies) {
      if (!enemy.isAlive) {
        continue;
      }
      const dist = Math.hypot(enemy.worldX - player.worldX, enemy.worldZ - player.worldZ);
      if (dist < bestDist) {
        bestDist = dist;
        best = enemy;
      }
    }
    if (best) {
      const dx = best.worldX - player.worldX;
      const dz = best.worldZ - player.worldZ;
      const len = Math.hypot(dx, dz) || 1;
      dir = { x: dx / len, z: dz / len };
    }
    if (fx) {
      // Fogonazo de salida, para que se vea que la habilidad se ha lanzado.
      fx.ring(player.worldX, player.worldY, player.worldZ, 1.2, skill.color, 0.2);
      fx.burst(player.worldX, player.worldY + 2, player.worldZ, skill.color, {
        count: 10,
        speed: 5,
        ttl: 0.25,
        spread: 0.6,
        lift: 2,
      });
    }
    ctx.spawnProjectile(skill, damage, dir);
  }
}
