import type { InventoryItem, ItemDef, StatKey, StatModifier } from '../types';

const UPGRADE_STEP = 0.2;

export const ITEMS: Record<string, ItemDef> = {
  rusty_sword: {
    id: 'rusty_sword',
    name: 'Espada oxidada',
    slot: 'weapon',
    tier: 1,
    statMods: [{ stat: 'attack', mode: 'add', value: 5 }],
    baseUpgradeCost: 20,
    color: 0xb0a48a,
  },
  bronze_blade: {
    id: 'bronze_blade',
    name: 'Filo de bronce',
    slot: 'weapon',
    tier: 2,
    statMods: [{ stat: 'attack', mode: 'add', value: 9 }],
    baseUpgradeCost: 45,
    color: 0xcd9550,
  },
  titan_cleaver: {
    id: 'titan_cleaver',
    name: 'Cuchilla del titán',
    slot: 'weapon',
    tier: 3,
    statMods: [{ stat: 'attack', mode: 'add', value: 15 }],
    baseUpgradeCost: 90,
    color: 0xe0d070,
  },
  cloth_armor: {
    id: 'cloth_armor',
    name: 'Túnica de lino',
    slot: 'armor',
    tier: 1,
    statMods: [{ stat: 'maxHp', mode: 'add', value: 20 }],
    baseUpgradeCost: 18,
    color: 0x9aa0b0,
  },
  leather_armor: {
    id: 'leather_armor',
    name: 'Peto de cuero',
    slot: 'armor',
    tier: 2,
    statMods: [
      { stat: 'maxHp', mode: 'add', value: 40 },
      { stat: 'defense', mode: 'add', value: 2 },
    ],
    baseUpgradeCost: 40,
    color: 0xa9743f,
  },
  titan_plate: {
    id: 'titan_plate',
    name: 'Placa del titán',
    slot: 'armor',
    tier: 3,
    statMods: [
      { stat: 'maxHp', mode: 'add', value: 80 },
      { stat: 'defense', mode: 'add', value: 5 },
    ],
    baseUpgradeCost: 85,
    color: 0xc8c2d0,
  },
};

const STAT_LABEL: Record<StatKey, string> = {
  maxHp: 'HP',
  maxMp: 'MP',
  attack: 'ATQ',
  defense: 'DEF',
  attackRange: 'RANGO',
  attackCooldown: 'CD',
  moveSpeed: 'VEL',
};

export function getItem(itemId: string): ItemDef {
  return ITEMS[itemId];
}

export function effectiveMods(item: InventoryItem): StatModifier[] {
  const def = getItem(item.itemId);
  const factor = 1 + item.upgradeLevel * UPGRADE_STEP;
  return def.statMods.map((m) => ({
    stat: m.stat,
    mode: m.mode,
    value: m.mode === 'add' ? m.value * factor : m.value,
  }));
}

export function upgradeCost(item: InventoryItem): number {
  const def = getItem(item.itemId);
  return Math.round(def.baseUpgradeCost * Math.pow(1.6, item.upgradeLevel));
}

export function describeItem(item: InventoryItem): string {
  const def = getItem(item.itemId);
  const mods = def.statMods
    .map((m) => `+${m.value} ${STAT_LABEL[m.stat]}`)
    .join(', ');
  const plus = item.upgradeLevel > 0 ? ` +${item.upgradeLevel}` : '';
  return `${def.name}${plus} (${mods})`;
}
