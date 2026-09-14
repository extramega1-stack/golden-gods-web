import Phaser from 'phaser';
import { depthFor, worldToScreen } from '../world/iso';
import { CombatSystem } from '../systems/CombatSystem';
import type { Enemy } from './Enemy';
import type { MapLoader } from '../world/MapLoader';
import type { Vec2 } from '../types';

export const PROJECTILE_TEXTURE = 'projectile';

export class Projectile extends Phaser.GameObjects.Sprite {
  worldX: number;
  worldY: number;
  private readonly dir: Vec2;
  private readonly speed: number;
  private remaining: number;
  private readonly damage: number;
  private dead = false;
  private readonly hitRadius = 0.45;

  constructor(
    scene: Phaser.Scene,
    wx: number,
    wy: number,
    dir: Vec2,
    speed: number,
    range: number,
    damage: number,
    color: number
  ) {
    super(scene, 0, 0, PROJECTILE_TEXTURE);
    scene.add.existing(this);
    this.setOrigin(0.5, 0.5);
    this.setTint(color);
    this.worldX = wx;
    this.worldY = wy;
    this.dir = dir;
    this.speed = speed;
    this.remaining = range;
    this.damage = damage;
    this.syncTransform();
  }

  get isDead(): boolean {
    return this.dead;
  }

  private syncTransform(): void {
    const p = worldToScreen(this.worldX, this.worldY);
    this.setPosition(p.x, p.y);
    this.setDepth(depthFor(this.worldX, this.worldY) + 1);
  }

  override update(dt: number, enemies: Enemy[], map: MapLoader): void {
    if (this.dead) {
      return;
    }

    const step = this.speed * dt;
    const nx = this.worldX + this.dir.x * step;
    const ny = this.worldY + this.dir.y * step;
    if (!map.isAreaWalkable(nx, ny, 0.1)) {
      this.kill();
      return;
    }

    this.worldX = nx;
    this.worldY = ny;
    this.remaining -= step;
    this.syncTransform();

    for (const enemy of enemies) {
      if (!enemy.isAlive) {
        continue;
      }
      const dist = Math.hypot(enemy.worldX - this.worldX, enemy.worldY - this.worldY);
      if (dist <= this.hitRadius + enemy.radius) {
        CombatSystem.applyDamage(enemy, this.damage);
        this.kill();
        return;
      }
    }

    if (this.remaining <= 0) {
      this.kill();
    }
  }

  private kill(): void {
    this.dead = true;
    this.destroy();
  }
}
