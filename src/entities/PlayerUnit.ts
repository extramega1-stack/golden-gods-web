import { createUnitMesh } from './MeshFactory';
import { Unit, type WorldRefs } from './Unit';
import type { GodDef, InventoryItem, ItemSlot, Stats } from '../types';

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

  constructor(refs: WorldRefs, x: number, z: number, god: GodDef) {
    const mesh = createUnitMesh({
      color: god.color,
      radius: BODY_RADIUS,
      height: BODY_HEIGHT,
      markerColor: 0xffffff,
    });
    super(refs, x, z, mesh, BAR_HEIGHT, { ...god.baseStats });
    this.god = god;
    this.baseStats = { ...god.baseStats };
    this.skills = [...god.skills];
  }
}
