import { createUnitMesh, wrapModel } from './MeshFactory';
import { Unit, type WorldRefs } from './Unit';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { GOD_MODELS, MODEL_HEIGHTS } from '../assets/manifest';
import type { ModelProvider } from './ModelProvider';
import type {
  Buff,
  GodDef,
  InventoryItem,
  ItemSlot,
  SkillBuffSpec,
  Stats,
} from '../types';

const BODY_RADIUS = 1.1;
const BODY_HEIGHT = 3.4;
const BAR_HEIGHT = BODY_HEIGHT + 0.8;

/**
 * Héroe jugable. Cumple estructuralmente el contrato SaveableHero, así que SaveManager
 * lo acepta sin que haya que acoplar nada.
 */
export class PlayerUnit extends Unit {
  readonly god: GodDef;
  level = 1;
  exp = 0;
  gold = 0;
  talentPoints = 0;
  readonly talentRanks: Record<string, number> = {};
  readonly inventory: InventoryItem[] = [];
  readonly equipped: Record<ItemSlot, InventoryItem | null> = {
    weapon: null,
    armor: null,
  };
  readonly skillReadyAt: Record<string, number> = {};
  readonly skills: string[];
  readonly baseStats: Stats;
  buffs: Buff[] = [];

  constructor(
    refs: WorldRefs,
    x: number,
    z: number,
    god: GodDef,
    models?: ModelProvider | null
  ) {
    const modelId = GOD_MODELS[god.id];
    const instantiated = modelId ? models?.instantiate(modelId, MODEL_HEIGHTS.god) ?? null : null;

    const mesh = instantiated
      ? wrapModel(instantiated.root)
      : createUnitMesh({
          color: god.color,
          radius: BODY_RADIUS,
          height: BODY_HEIGHT,
          markerColor: 0xffffff,
        });

    super(refs, x, z, mesh, BAR_HEIGHT, { ...god.baseStats });
    if (instantiated) {
      this.animation = instantiated.controller;
    }

    this.god = god;
    this.baseStats = { ...god.baseStats };
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

  /** Quita los buffs caducados; devuelve true si hubo cambios (y recalculó stats). */
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
