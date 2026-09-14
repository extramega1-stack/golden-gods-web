import type { EnemyDef } from '../types';
import { LOOT_TABLES } from '../data/lootTables';

export interface LootResult {
  gold: number;
  itemId: string | null;
}

export class LootSystem {
  static roll(def: EnemyDef): LootResult {
    const table = LOOT_TABLES[def.lootTableId];
    let itemId: string | null = null;
    if (table) {
      for (const entry of table.entries) {
        if (Math.random() < entry.chance) {
          itemId = entry.itemId;
          break;
        }
      }
    }
    return { gold: def.goldReward, itemId };
  }
}
