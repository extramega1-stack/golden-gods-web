import type { Player } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import type { MapLoader } from '../world/MapLoader';
import type { SkillDef, Vec2 } from '../types';
import { CombatSystem } from './CombatSystem';

export interface SkillContext {
  enemies: Enemy[];
  map: MapLoader;
  spawnProjectile: (skill: SkillDef, damage: number, dir: Vec2) => void;
}

export type CastResult = 'ok' | 'cooldown' | 'mana';

export class SkillSystem {
  static cast(player: Player, skill: SkillDef, ctx: SkillContext, now: number): CastResult {
    if (!player.isAlive) {
      return 'cooldown';
    }
    if (now < (player.skillReadyAt[skill.id] ?? 0)) {
      return 'cooldown';
    }
    if (player.stats.mp < skill.cost) {
      return 'mana';
    }

    player.stats.mp -= skill.cost;
    player.skillReadyAt[skill.id] = now + skill.cooldown * 1000;

    const damage = Math.round(player.stats.attack * skill.damageMult);
    switch (skill.effect) {
      case 'aoe':
        SkillSystem.castAoe(player, skill, ctx, damage);
        break;
      case 'heal':
        SkillSystem.castHeal(player, skill, damage);
        break;
      case 'buff':
        SkillSystem.castBuff(player, skill, now);
        break;
      case 'dash':
        SkillSystem.castDash(player, skill, ctx);
        break;
      case 'projectile':
        SkillSystem.castProjectile(player, skill, ctx, damage);
        break;
    }
    return 'ok';
  }

  private static castAoe(
    player: Player,
    skill: SkillDef,
    ctx: SkillContext,
    damage: number
  ): void {
    const radius = skill.radius ?? 2;
    for (const enemy of ctx.enemies) {
      if (!enemy.isAlive) {
        continue;
      }
      const dist = Math.hypot(enemy.worldX - player.worldX, enemy.worldY - player.worldY);
      if (dist <= radius + enemy.radius) {
        CombatSystem.applyDamage(enemy, damage);
      }
    }
    SkillSystem.ring(player, skill.color, radius);
  }

  private static castHeal(player: Player, skill: SkillDef, damage: number): void {
    const heal = Math.round((skill.flat ?? 0) + damage);
    player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + heal);
    CombatSystem.floatingText(
      player.scene,
      player.x,
      player.y - player.height,
      `+${heal}`,
      '#8ef0a0'
    );
  }

  private static castBuff(player: Player, skill: SkillDef, now: number): void {
    if (!skill.buff) {
      return;
    }
    player.addBuff(skill.buff, now);
    CombatSystem.floatingText(
      player.scene,
      player.x,
      player.y - player.height,
      skill.name,
      '#c9b6ff'
    );
  }

  private static castDash(player: Player, skill: SkillDef, ctx: SkillContext): void {
    const distance = skill.dashDistance ?? 3;
    const steps = 8;
    const stepLen = distance / steps;
    for (let i = 0; i < steps; i++) {
      player.moveWorld(player.facing.x * stepLen, player.facing.y * stepLen, ctx.map);
    }
  }

  private static castProjectile(
    player: Player,
    skill: SkillDef,
    ctx: SkillContext,
    damage: number
  ): void {
    let dir: Vec2 = player.facing;
    let best: Enemy | null = null;
    let bestDist = Infinity;
    for (const enemy of ctx.enemies) {
      if (!enemy.isAlive) {
        continue;
      }
      const dist = Math.hypot(enemy.worldX - player.worldX, enemy.worldY - player.worldY);
      if (dist < bestDist) {
        bestDist = dist;
        best = enemy;
      }
    }
    if (best) {
      const dx = best.worldX - player.worldX;
      const dy = best.worldY - player.worldY;
      const len = Math.hypot(dx, dy) || 1;
      dir = { x: dx / len, y: dy / len };
    }
    ctx.spawnProjectile(skill, damage, dir);
  }

  private static ring(player: Player, color: number, radiusTiles: number): void {
    const ring = player.scene.add
      .circle(player.x, player.y, radiusTiles * 32, color, 0.18)
      .setDepth(85000);
    ring.setStrokeStyle(2, color, 0.7);
    ring.setScale(0.4);
    player.scene.tweens.add({
      targets: ring,
      scale: 1,
      alpha: 0,
      duration: 320,
      onComplete: () => ring.destroy(),
    });
  }
}
