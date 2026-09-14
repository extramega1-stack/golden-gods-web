export interface Vec2 {
  x: number;
  y: number;
}

export type Role = 'tank' | 'melee' | 'ranged' | 'support';

export enum Tile {
  Floor = 0,
  Wall = 1,
  Path = 2,
  Arena = 3,
}

export interface ZoneMap {
  cols: number;
  rows: number;
  data: number[][];
  heights: number[][];
}

export interface Stats {
  maxHp: number;
  hp: number;
  maxMp: number;
  mp: number;
  attack: number;
  defense: number;
  attackRange: number;
  attackCooldown: number;
  moveSpeed: number;
}

export type StatKey =
  | 'maxHp'
  | 'maxMp'
  | 'attack'
  | 'defense'
  | 'attackRange'
  | 'attackCooldown'
  | 'moveSpeed';

export interface StatModifier {
  stat: StatKey;
  mode: 'add' | 'mult';
  value: number;
}

export interface Buff extends StatModifier {
  until: number;
}

export type ItemSlot = 'weapon' | 'armor';

export interface ItemDef {
  id: string;
  name: string;
  slot: ItemSlot;
  tier: number;
  statMods: StatModifier[];
  baseUpgradeCost: number;
  color: number;
}

export interface InventoryItem {
  uid: string;
  itemId: string;
  upgradeLevel: number;
}

export interface LootEntry {
  itemId: string;
  chance: number;
}

export interface LootTable {
  entries: LootEntry[];
}

export interface TalentNode {
  id: string;
  name: string;
  description: string;
  branch: 'offense' | 'defense' | 'utility';
  maxRank: number;
  modifiers: StatModifier[];
}

export type SkillEffect = 'aoe' | 'projectile' | 'heal' | 'dash' | 'buff';

export interface SkillBuffSpec extends StatModifier {
  duration: number;
}

export interface SkillDef {
  id: string;
  name: string;
  key: string;
  cost: number;
  cooldown: number;
  effect: SkillEffect;
  damageMult: number;
  color: number;
  radius?: number;
  projectileSpeed?: number;
  projectileRange?: number;
  flat?: number;
  dashDistance?: number;
  buff?: SkillBuffSpec;
}

export interface GodDef {
  id: string;
  name: string;
  role: Role;
  description: string;
  color: number;
  baseStats: Stats;
  growth: Record<StatKey, number>;
  skills: string[];
}

export interface EnemyDef {
  id: string;
  name: string;
  radiusPx: number;
  radiusTiles: number;
  color: number;
  stats: Omit<Stats, 'hp' | 'mp'> & { maxMp: number };
  aggroRange: number;
  expReward: number;
  goldReward: number;
  lootTableId: string;
  isBoss?: boolean;
  slamCooldown?: number;
  slamRadius?: number;
  slamDamageMult?: number;
}

export interface SpawnDef {
  id: string;
  col: number;
  row: number;
  enemyId: string;
  respawnSeconds: number;
}

export interface Region {
  name: string;
  fromRow: number;
  toRow: number;
}

/** Contrato mínimo que SaveManager necesita de un héroe, sin acoplarse a la entidad concreta. */
export interface SaveableHero {
  level: number;
  exp: number;
  gold: number;
  talentPoints: number;
  talentRanks: Record<string, number>;
  inventory: InventoryItem[];
  equipped: Record<ItemSlot, InventoryItem | null>;
  worldX: number;
  worldZ: number;
}
