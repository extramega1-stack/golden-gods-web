import type Phaser from 'phaser';
import { Actor } from './Actor';
import { playerTextureKey } from '../data/gods';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import type {
  Buff,
  GodDef,
  InventoryItem,
  ItemSlot,
  SkillBuffSpec,
  StatKey,
  Stats,
  Vec2,
} from '../types';

export class Player extends Actor {
  readonly god: GodDef;
  level = 1;
  exp = 0;
  gold = 0;
  talentPoints = 0;
  readonly talentRanks: Record<string, number> = {};
  readonly skillReadyAt: Record<string, number> = {};
  readonly skills: string[];
  readonly baseStats: Stats;
  readonly growth: Record<StatKey, number>;
  readonly inventory: InventoryItem[] = [];
  readonly equipped: Record<ItemSlot, InventoryItem | null> = {
    weapon: null,
    armor: null,
  };
  buffs: Buff[] = [];
  facing: Vec2 = { x: 0, y: 1 };

  constructor(scene: Phaser.Scene, wx: number, wy: number, god: GodDef) {
    super(scene, wx, wy, playerTextureKey(god.id), { ...god.baseStats });
    this.god = god;
    this.radius = 0.33;
    this.baseStats = { ...god.baseStats };
    this.growth = { ...god.growth };
    this.skills = [...god.skills];
    ProgressionSystem.recompute(this, true);
  }

  addBuff(buff: SkillBuffSpec, now: number): void {
    this.buffs.push({
      stat: buff.stat,
      mode: buff.mode,
      value: buff.value,
      until: now + buff.duration * 1000,
    });
    ProgressionSystem.recompute(this);
  }

  updateBuffs(now: number): boolean {
    const before = this.buffs.length;
    this.buffs = this.buffs.filter((b) => b.until > now);
    if (this.buffs.length !== before) {
      ProgressionSystem.recompute(this);
      return true;
    }
    return false;
  }
}
