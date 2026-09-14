import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { SkillDef } from '../types';

const DEPTH = 210000;
const RADIUS = 26;
const GAP = 68;

interface Slot {
  skill: SkillDef;
  ring: Phaser.GameObjects.Arc;
  cd: Phaser.GameObjects.Rectangle;
  key: Phaser.GameObjects.Text;
  name: Phaser.GameObjects.Text;
  cost: Phaser.GameObjects.Text;
}

export class SkillBar {
  private readonly slots: Slot[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    skills: SkillDef[],
    onCast: (id: string) => void
  ) {
    for (const skill of skills) {
      const ring = scene.add
        .circle(0, 0, RADIUS, 0x2a2438, 0.9)
        .setStrokeStyle(3, skill.color)
        .setScrollFactor(0)
        .setDepth(DEPTH)
        .setInteractive({ useHandCursor: true });
      const key = scene.add
        .text(0, 0, skill.key, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH + 3);
      const name = scene.add
        .text(0, 0, skill.name, {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#cfc6e0',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH + 3);
      const cost = scene.add
        .text(0, 0, String(skill.cost), {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#8fd0ff',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH + 3);
      const cd = scene.add
        .rectangle(0, 0, RADIUS * 2, RADIUS * 2, 0x000000, 0.62)
        .setOrigin(0.5, 1)
        .setScrollFactor(0)
        .setDepth(DEPTH + 2)
        .setVisible(false);

      ring.on('pointerdown', () => onCast(skill.id));
      this.slots.push({ skill, ring, cd, key, name, cost });
    }

    this.layout();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
  }

  private layout(): void {
    const total = (this.slots.length - 1) * GAP;
    const startX = this.scene.scale.width / 2 - total / 2;
    const y = this.scene.scale.height - 66;

    this.slots.forEach((slot, i) => {
      const x = startX + i * GAP;
      slot.ring.setPosition(x, y);
      slot.key.setPosition(x, y);
      slot.name.setPosition(x, y - RADIUS - 10);
      slot.cost.setPosition(x, y + RADIUS + 10);
      slot.cd.setPosition(x, y + RADIUS);
    });
  }

  update(player: Player, now: number): void {
    for (const slot of this.slots) {
      const readyAt = player.skillReadyAt[slot.skill.id] ?? 0;
      const remaining = Math.max(0, readyAt - now);
      const ratio = remaining / (slot.skill.cooldown * 1000);
      slot.cd.setVisible(ratio > 0);
      slot.cd.scaleY = ratio;

      const affordable = player.stats.mp >= slot.skill.cost;
      slot.ring.setFillStyle(0x2a2438, affordable ? 0.9 : 0.5);
      slot.key.setAlpha(affordable ? 1 : 0.45);
      slot.name.setAlpha(affordable ? 1 : 0.45);
    }
  }
}
