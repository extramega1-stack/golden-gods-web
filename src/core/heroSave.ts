import { InventorySystem } from '../systems/InventorySystem';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import type { PlayerUnit } from '../entities/PlayerUnit';
import type { SaveData } from './SaveManager';

/** Vuelca un guardado sobre un héroe recién creado. Pura: sin DOM ni estado global. */
export function applySaveToHero(player: PlayerUnit, save: SaveData): void {
  player.level = save.level;
  player.exp = save.exp;
  player.gold = save.gold;
  player.talentPoints = save.talentPoints;

  for (const key of Object.keys(save.talentRanks)) {
    player.talentRanks[key] = save.talentRanks[key];
  }

  player.inventory.length = 0;
  for (const item of save.inventory) {
    player.inventory.push({ ...item });
  }
  player.equipped.weapon = save.equipped.weapon ? { ...save.equipped.weapon } : null;
  player.equipped.armor = save.equipped.armor ? { ...save.equipped.armor } : null;

  // Los identificadores nuevos no deben chocar con los recuperados.
  InventorySystem.reseed([
    ...player.inventory,
    ...(player.equipped.weapon ? [player.equipped.weapon] : []),
    ...(player.equipped.armor ? [player.equipped.armor] : []),
  ]);

  ProgressionSystem.recompute(player, true);
  player.setWorldPos(save.x, save.z);
}
