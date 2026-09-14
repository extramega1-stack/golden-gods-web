import Phaser from 'phaser';
import { depthFor, worldToScreen } from '../world/iso';
import type { ItemDef } from '../types';

export function pickupTextureKey(itemId: string): string {
  return `pickup-${itemId}`;
}

export class Pickup extends Phaser.GameObjects.Sprite {
  worldX: number;
  worldY: number;
  readonly itemId: string;
  private collected = false;

  constructor(scene: Phaser.Scene, wx: number, wy: number, def: ItemDef) {
    super(scene, 0, 0, pickupTextureKey(def.id));
    scene.add.existing(this);
    this.setOrigin(0.5, 0.5);
    this.worldX = wx;
    this.worldY = wy;
    this.itemId = def.id;
    const p = worldToScreen(wx, wy);
    this.setPosition(p.x, p.y);
    this.setDepth(depthFor(wx, wy) + 2);
    scene.tweens.add({
      targets: this,
      y: p.y - 4,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
  }

  get isCollected(): boolean {
    return this.collected;
  }

  collect(): void {
    this.collected = true;
    this.destroy();
  }
}
