import type { Actor } from '../entities/Actor';
import type Phaser from 'phaser';
import { COMBAT } from '../data/balance';

export class CombatSystem {
  static attack(attacker: Actor, defender: Actor): boolean {
    if (!attacker.isAlive || !defender.isAlive) {
      return false;
    }
    const time = attacker.scene.time.now;
    if (time < attacker.nextAttackAt) {
      return false;
    }
    attacker.nextAttackAt = time + attacker.stats.attackCooldown * 1000;

    const reduced = Math.max(
      COMBAT.minDamage,
      attacker.stats.attack - defender.stats.defense
    );
    CombatSystem.applyDamage(defender, reduced);
    return true;
  }

  static applyDamage(target: Actor, amount: number): number {
    const dealt = target.takeDamage(amount);
    if (dealt > 0) {
      CombatSystem.floatingText(
        target.scene,
        target.x,
        target.y - target.height * 0.9 - 12,
        String(dealt),
        '#ffd76a'
      );
    }
    return dealt;
  }

  static floatingText(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    color: string
  ): void {
    const label = scene.add
      .text(x, y, text, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(95000);

    scene.tweens.add({
      targets: label,
      y: y - 22,
      alpha: 0,
      duration: 650,
      onComplete: () => label.destroy(),
    });
  }
}
