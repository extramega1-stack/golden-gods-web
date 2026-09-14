import type Phaser from 'phaser';
import { Actor } from './Actor';
import type { EnemyDef } from '../types';

export function enemyTextureKey(def: EnemyDef): string {
  return `enemy-${def.id}`;
}

export class Enemy extends Actor {
  readonly def: EnemyDef;
  readonly aggroRange: number;
  bossPhase = 1;
  slamReadyAt = 0;

  constructor(scene: Phaser.Scene, wx: number, wy: number, def: EnemyDef) {
    super(scene, wx, wy, enemyTextureKey(def), {
      hp: def.stats.maxHp,
      mp: def.stats.maxMp,
      ...def.stats,
    });
    this.def = def;
    this.aggroRange = def.aggroRange;
    this.radius = def.radiusTiles;
  }
}
