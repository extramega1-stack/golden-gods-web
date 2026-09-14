import type { GodDef, Role } from '../types';

export const GODS: GodDef[] = [
  {
    id: 'aureon',
    name: 'Aureón',
    role: 'tank',
    description: 'El Bastión. Mucho aguante, pega poco pero no cae.',
    color: 0xd9c07a,
    baseStats: {
      maxHp: 170,
      hp: 170,
      maxMp: 80,
      mp: 80,
      attack: 9,
      defense: 6,
      attackRange: 1.5,
      attackCooldown: 1,
      moveSpeed: 3.7,
    },
    growth: {
      maxHp: 24,
      maxMp: 6,
      attack: 1.6,
      defense: 1.4,
      attackRange: 0.01,
      attackCooldown: -0.02,
      moveSpeed: 0.05,
    },
    skills: ['bash', 'bulwark', 'quake'],
  },
  {
    id: 'kael',
    name: 'Kael',
    role: 'melee',
    description: 'Filo del Alba. DPS cuerpo a cuerpo, rápido y frágil.',
    color: 0xe06a5a,
    baseStats: {
      maxHp: 120,
      hp: 120,
      maxMp: 90,
      mp: 90,
      attack: 16,
      defense: 2,
      attackRange: 1.5,
      attackCooldown: 0.65,
      moveSpeed: 4.6,
    },
    growth: {
      maxHp: 14,
      maxMp: 8,
      attack: 3.2,
      defense: 0.8,
      attackRange: 0.02,
      attackCooldown: -0.02,
      moveSpeed: 0.1,
    },
    skills: ['lunge', 'cleave', 'frenzy'],
  },
  {
    id: 'nel',
    name: 'Nel',
    role: 'ranged',
    description: 'Arquera Astral. Golpea de lejos con proyectiles.',
    color: 0x8fd0ff,
    baseStats: {
      maxHp: 100,
      hp: 100,
      maxMp: 110,
      mp: 110,
      attack: 13,
      defense: 2,
      attackRange: 4.5,
      attackCooldown: 0.9,
      moveSpeed: 4,
    },
    growth: {
      maxHp: 11,
      maxMp: 10,
      attack: 2.6,
      defense: 0.7,
      attackRange: 0.15,
      attackCooldown: -0.015,
      moveSpeed: 0.07,
    },
    skills: ['shot', 'volley', 'pierce'],
  },
  {
    id: 'sira',
    name: 'Sira',
    role: 'support',
    description: 'Voz Serena. Se sostiene curándose y potenciándose.',
    color: 0x8ef0a0,
    baseStats: {
      maxHp: 115,
      hp: 115,
      maxMp: 130,
      mp: 130,
      attack: 10,
      defense: 3,
      attackRange: 3.5,
      attackCooldown: 1,
      moveSpeed: 4.1,
    },
    growth: {
      maxHp: 14,
      maxMp: 14,
      attack: 1.8,
      defense: 1,
      attackRange: 0.1,
      attackCooldown: -0.01,
      moveSpeed: 0.06,
    },
    skills: ['mend', 'blessing', 'sanctuary'],
  },
];

export function getGod(id: string): GodDef {
  return GODS.find((g) => g.id === id) ?? GODS[0];
}

export function playerTextureKey(godId: string): string {
  return `actor-player-${godId}`;
}

export function roleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    tank: 'Tanque',
    melee: 'Cuerpo a cuerpo',
    ranged: 'A distancia',
    support: 'Soporte',
  };
  return labels[role];
}
