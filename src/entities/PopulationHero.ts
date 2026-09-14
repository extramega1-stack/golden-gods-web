import Phaser from 'phaser';
import { depthFor, worldToScreen } from '../world/iso';
import type { MapLoader } from '../world/MapLoader';
import type { Vec2 } from '../types';

export const POP_TEXTURE = 'pop-hero';
const MAX_LEVEL = 9;
const LEVEL_INTERVAL_MS = 18000;

export class PopulationHero {
  worldX: number;
  worldY: number;
  level = 1;

  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly label: Phaser.GameObjects.Text;
  private target: Vec2;
  private retargetAt = 0;
  private levelUpAt = 0;
  private readonly speed = 2.6;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: MapLoader,
    wx: number,
    wy: number,
    private readonly heroName: string,
    color: number
  ) {
    this.worldX = wx;
    this.worldY = wy;
    const p = worldToScreen(wx, wy);
    this.sprite = scene.add
      .sprite(p.x, p.y, POP_TEXTURE)
      .setOrigin(0.5, 0.9)
      .setTint(color)
      .setAlpha(0.85);
    this.label = scene.add
      .text(p.x, p.y - 32, `${heroName} Lv${this.level}`, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#cfc6e0',
      })
      .setOrigin(0.5, 1)
      .setAlpha(0.9);
    this.target = this.randomTarget();
    this.sync();
  }

  update(dt: number, now: number): void {
    if (now >= this.retargetAt) {
      this.target = this.randomTarget();
    }

    const dx = this.target.x - this.worldX;
    const dy = this.target.y - this.worldY;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.15) {
      const step = this.speed * dt;
      this.worldX += (dx / dist) * step;
      this.worldY += (dy / dist) * step;
      this.sync();
    } else {
      this.retargetAt = 0;
    }

    if (now >= this.levelUpAt) {
      this.levelUpAt = now + LEVEL_INTERVAL_MS;
      if (this.level < MAX_LEVEL) {
        this.level += 1;
        this.label.setText(`${this.heroName} Lv${this.level}`);
      }
    }
  }

  private sync(): void {
    const p = worldToScreen(this.worldX, this.worldY);
    this.sprite.setPosition(p.x, p.y);
    this.sprite.setDepth(depthFor(this.worldX, this.worldY));
    this.label.setPosition(p.x, p.y - 32);
    this.label.setDepth(depthFor(this.worldX, this.worldY) + 1);
  }

  private randomTarget(): Vec2 {
    for (let i = 0; i < 20; i++) {
      const x = 1 + Math.random() * (this.map.cols - 2);
      const y = 1 + Math.random() * (this.map.rows - 2);
      if (this.map.isAreaWalkable(x, y, 0.3)) {
        this.retargetAt = this.scene.time.now + 2500 + Math.random() * 4000;
        return { x, y };
      }
    }
    this.retargetAt = this.scene.time.now + 3000;
    return { x: this.worldX, y: this.worldY };
  }

  destroy(): void {
    this.sprite.destroy();
    this.label.destroy();
  }
}
