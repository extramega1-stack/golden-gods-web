import type { TalentNode } from '../types';

export const TALENTS: TalentNode[] = [
  {
    id: 'vigor',
    name: 'Vigor',
    description: '+30 HP máx.',
    branch: 'defense',
    maxRank: 3,
    modifiers: [{ stat: 'maxHp', mode: 'add', value: 30 }],
  },
  {
    id: 'fury',
    name: 'Furia',
    description: '+4 ataque',
    branch: 'offense',
    maxRank: 3,
    modifiers: [{ stat: 'attack', mode: 'add', value: 4 }],
  },
  {
    id: 'armor',
    name: 'Armadura',
    description: '+3 defensa',
    branch: 'defense',
    maxRank: 3,
    modifiers: [{ stat: 'defense', mode: 'add', value: 3 }],
  },
  {
    id: 'swift',
    name: 'Presteza',
    description: '+0.4 velocidad',
    branch: 'utility',
    maxRank: 3,
    modifiers: [{ stat: 'moveSpeed', mode: 'add', value: 0.4 }],
  },
  {
    id: 'focus',
    name: 'Foco',
    description: '+25 maná máx.',
    branch: 'utility',
    maxRank: 3,
    modifiers: [{ stat: 'maxMp', mode: 'add', value: 25 }],
  },
  {
    id: 'reach',
    name: 'Alcance',
    description: '+0.2 rango de ataque',
    branch: 'offense',
    maxRank: 2,
    modifiers: [{ stat: 'attackRange', mode: 'add', value: 0.2 }],
  },
];
