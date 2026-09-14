import type { StatKey } from '../types';

export const STAT_KEYS: StatKey[] = [
  'maxHp',
  'maxMp',
  'attack',
  'defense',
  'attackRange',
  'attackCooldown',
  'moveSpeed',
];

export const MAX_LEVEL = 10;

export const COMBAT = {
  minDamage: 1,
  minAttackCooldown: 0.25,
} as const;

export const PLAYER_RESPAWN_SECONDS = 2.5;

export function expToNext(level: number): number {
  const n = level - 1;
  return Math.round(30 + 25 * n + 5 * n * n);
}
