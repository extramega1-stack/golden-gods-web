import type { Player } from '../entities/Player';
import { COMBAT, MAX_LEVEL, STAT_KEYS, expToNext } from '../data/balance';
import { TALENTS } from '../data/talents';
import { effectiveMods } from '../data/items';
import type { ItemSlot, Stats } from '../types';

export class ProgressionSystem {
  static recompute(player: Player, healFull = false): void {
    const stats: Stats = { ...player.baseStats };
    const levelsGained = player.level - 1;

    for (const key of STAT_KEYS) {
      stats[key] += player.growth[key] * levelsGained;
    }

    for (const node of TALENTS) {
      const rank = player.talentRanks[node.id] ?? 0;
      if (rank === 0) {
        continue;
      }
      for (const mod of node.modifiers) {
        ProgressionSystem.apply(stats, mod.stat, mod.mode, mod.value * rank);
      }
    }

    for (const slot of ['weapon', 'armor'] as ItemSlot[]) {
      const item = player.equipped[slot];
      if (!item) {
        continue;
      }
      for (const mod of effectiveMods(item)) {
        ProgressionSystem.apply(stats, mod.stat, mod.mode, mod.value);
      }
    }

    for (const buff of player.buffs) {
      ProgressionSystem.apply(stats, buff.stat, buff.mode, buff.value);
    }

    stats.maxHp = Math.round(stats.maxHp);
    stats.maxMp = Math.round(stats.maxMp);
    stats.attack = Math.round(stats.attack * 10) / 10;
    stats.defense = Math.round(stats.defense * 10) / 10;
    stats.attackCooldown = Math.max(COMBAT.minAttackCooldown, stats.attackCooldown);
    stats.attackRange = Math.max(0.8, stats.attackRange);
    stats.moveSpeed = Math.round(stats.moveSpeed * 100) / 100;

    const prevHp = player.stats.hp;
    const prevMp = player.stats.mp;
    stats.hp = healFull ? stats.maxHp : Math.min(prevHp, stats.maxHp);
    stats.mp = healFull ? stats.maxMp : Math.min(prevMp, stats.maxMp);

    player.stats = stats;
  }

  private static apply(
    stats: Stats,
    stat: keyof Stats,
    mode: 'add' | 'mult',
    value: number
  ): void {
    if (mode === 'add') {
      stats[stat] += value;
    } else {
      stats[stat] *= 1 + value;
    }
  }

  static awardExp(player: Player, amount: number): number {
    if (player.level >= MAX_LEVEL) {
      return 0;
    }

    player.exp += amount;
    let gained = 0;
    while (player.level < MAX_LEVEL && player.exp >= expToNext(player.level)) {
      player.exp -= expToNext(player.level);
      player.level += 1;
      player.talentPoints += 1;
      gained += 1;
    }

    if (gained > 0) {
      ProgressionSystem.recompute(player, true);
      const scene = player.scene;
      const label = scene.add
        .text(player.x, player.y - 40, `¡NIVEL ${player.level}!`, {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#ffe58a',
          stroke: '#000000',
          strokeThickness: 4,
        })
        .setOrigin(0.5, 1)
        .setDepth(96000);
      scene.tweens.add({
        targets: label,
        y: label.y - 30,
        alpha: 0,
        duration: 1200,
        onComplete: () => label.destroy(),
      });
    }

    return gained;
  }
}
