import type { LootTable } from '../types';

export const LOOT_TABLES: Record<string, LootTable> = {
  slime: {
    entries: [
      { itemId: 'cloth_armor', chance: 0.22 },
      { itemId: 'rusty_sword', chance: 0.15 },
    ],
  },
  brute: {
    entries: [
      { itemId: 'leather_armor', chance: 0.3 },
      { itemId: 'bronze_blade', chance: 0.22 },
      { itemId: 'titan_plate', chance: 0.06 },
      { itemId: 'titan_cleaver', chance: 0.06 },
    ],
  },
  titan: {
    entries: [
      { itemId: 'titan_plate', chance: 0.6 },
      { itemId: 'titan_cleaver', chance: 0.6 },
      { itemId: 'bronze_blade', chance: 0.7 },
    ],
  },
};
