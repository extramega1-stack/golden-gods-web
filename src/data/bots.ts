import type { Stats } from '../types';

export interface BotDef {
  id: string;
  name: string;
  color: number;
  stats: Stats;
  engageRange: number;
}

export function botTextureKey(id: string): string {
  return `bot-${id}`;
}

export const PARTY_BOTS: BotDef[] = [
  {
    id: 'aelia',
    name: 'Aelia',
    color: 0xc8a2ff,
    engageRange: 6.5,
    stats: {
      maxHp: 95,
      hp: 95,
      maxMp: 60,
      mp: 60,
      attack: 9,
      defense: 2,
      attackRange: 3.2,
      attackCooldown: 1,
      moveSpeed: 4,
    },
  },
  {
    id: 'brann',
    name: 'Brann',
    color: 0xffb27a,
    engageRange: 6,
    stats: {
      maxHp: 135,
      hp: 135,
      maxMp: 40,
      mp: 40,
      attack: 12,
      defense: 4,
      attackRange: 1.4,
      attackCooldown: 0.9,
      moveSpeed: 4.1,
    },
  },
];
