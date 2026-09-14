import Phaser from 'phaser';
import { depthFor, worldToScreen } from '../world/iso';
import { COMBAT } from '../data/balance';
import { EVENTS } from '../core/events';
import type { MapLoader } from '../world/MapLoader';
import type { Stats } from '../types';

const BAR_W = 34;
const BAR_H = 5;
const BAR_DEPTH = 90000;

export class Actor extends Phaser.GameObjects.Sprite {
  worldX = 0;
  worldY = 0;
  radius = 0.35;
  stats: Stats;
  isAlive = true;
  nextAttackAt = 0;

  private readonly barBg: Phaser.GameObjects.Rectangle;
  private readonly barFill: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    wx: number,
    wy: number,
    texture: string,
    stats: Stats
  ) {
    super(scene, 0, 0, texture);
    scene.add.existing(this);
    this.setOrigin(0.5, 0.9);
    this.stats = stats;

    this.barBg = scene.add
      .rectangle(0, 0, BAR_W, BAR_H, 0x000000, 0.65)
      .setDepth(BAR_DEPTH);
    this.barFill = scene.add
      .rectangle(0, 0, BAR_W - 2, BAR_H - 2, 0x59d65a)
      .setOrigin(0, 0.5)
      .setDepth(BAR_DEPTH + 1);

    this.setWorldPos(wx, wy);
  }

  get hpRatio(): number {
    return Phaser.Math.Clamp(this.stats.hp / this.stats.maxHp, 0, 1);
  }

  setWorldPos(wx: number, wy: number): void {
    this.worldX = wx;
    this.worldY = wy;
    this.syncTransform();
  }

  syncTransform(): void {
    const p = worldToScreen(this.worldX, this.worldY);
    this.setPosition(p.x, p.y);
    this.setDepth(depthFor(this.worldX, this.worldY));
    this.updateBars();
  }

  moveWorld(dx: number, dy: number, map: MapLoader): void {
    if (dx !== 0 && map.isAreaWalkable(this.worldX + dx, this.worldY, this.radius)) {
      this.worldX += dx;
    }
    if (dy !== 0 && map.isAreaWalkable(this.worldX, this.worldY + dy, this.radius)) {
      this.worldY += dy;
    }
    this.syncTransform();
  }

  private updateBars(): void {
    const barY = this.y - this.height * this.originY - 6;
    this.barBg.setPosition(this.x, barY);
    this.barFill.setPosition(this.x - (BAR_W - 2) / 2, barY);
    this.barFill.scaleX = this.isAlive ? this.hpRatio : 0;
    const color = this.hpRatio > 0.5 ? 0x59d65a : this.hpRatio > 0.25 ? 0xe0c341 : 0xd9534f;
    this.barFill.setFillStyle(color);
  }

  takeDamage(amount: number): number {
    if (!this.isAlive) {
      return 0;
    }
    const dmg = Math.max(COMBAT.minDamage, Math.round(amount));
    this.stats.hp = Math.max(0, this.stats.hp - dmg);
    this.updateBars();
    this.flash();
    if (this.stats.hp <= 0) {
      this.die();
    }
    return dmg;
  }

  private flash(): void {
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => {
      if (this.active) {
        this.clearTint();
      }
    });
  }

  die(): void {
    if (!this.isAlive) {
      return;
    }
    this.isAlive = false;
    this.setVisible(false);
    this.barBg.setVisible(false);
    this.barFill.setVisible(false);
    this.scene.events.emit(EVENTS.ActorDied, this);
  }

  respawn(wx: number, wy: number): void {
    this.stats.hp = this.stats.maxHp;
    this.stats.mp = this.stats.maxMp;
    this.isAlive = true;
    this.setVisible(true);
    this.barBg.setVisible(true);
    this.barFill.setVisible(true);
    this.setWorldPos(wx, wy);
  }

  override destroy(fromScene?: boolean): void {
    this.barBg.destroy();
    this.barFill.destroy();
    super.destroy(fromScene);
  }
}
