import type { PlayerUnit } from '../entities/PlayerUnit';
import { effectiveMods, getItem, upgradeCost } from '../data/items';
import { ProgressionSystem } from './ProgressionSystem';
import type { InventoryItem, ItemSlot } from '../types';

let nextUid = 1;

export type UpgradeResult = 'ok' | 'poor' | 'none';

export class InventorySystem {
  static reseed(items: InventoryItem[]): void {
    let max = nextUid - 1;
    for (const item of items) {
      const n = Number(item.uid);
      if (!Number.isNaN(n) && n > max) {
        max = n;
      }
    }
    nextUid = max + 1;
  }

  static addItem(player: PlayerUnit, itemId: string): void {
    player.inventory.push({ uid: String(nextUid++), itemId, upgradeLevel: 0 });
  }

  static equip(player: PlayerUnit, uid: string): boolean {
    const index = player.inventory.findIndex((i) => i.uid === uid);
    if (index === -1) {
      return false;
    }
    const item = player.inventory[index];
    const slot = getItem(item.itemId).slot;

    player.inventory.splice(index, 1);
    const previous = player.equipped[slot];
    if (previous) {
      player.inventory.push(previous);
    }
    player.equipped[slot] = item;
    ProgressionSystem.recompute(player);
    return true;
  }

  static unequip(player: PlayerUnit, slot: ItemSlot): boolean {
    const item = player.equipped[slot];
    if (!item) {
      return false;
    }
    player.equipped[slot] = null;
    player.inventory.push(item);
    ProgressionSystem.recompute(player);
    return true;
  }

  static upgrade(player: PlayerUnit, slot: ItemSlot): UpgradeResult {
    const item = player.equipped[slot];
    if (!item) {
      return 'none';
    }
    const cost = upgradeCost(item);
    if (player.gold < cost) {
      return 'poor';
    }
    player.gold -= cost;
    item.upgradeLevel += 1;
    ProgressionSystem.recompute(player);
    return 'ok';
  }

  static getCostFor(player: PlayerUnit, slot: ItemSlot): number | null {
    const item = player.equipped[slot];
    return item ? upgradeCost(item) : null;
  }

  static describeEquipped(player: PlayerUnit, slot: ItemSlot): string {
    const item = player.equipped[slot];
    if (!item) {
      return '(vacío)';
    }
    const mods = effectiveMods(item)
      .map((m) => `+${Math.round(m.value)}`)
      .join('/');
    return `${getItem(item.itemId).name} +${item.upgradeLevel} [${mods}]`;
  }
}
