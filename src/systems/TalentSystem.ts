import type { Player } from '../entities/Player';
import { ProgressionSystem } from './ProgressionSystem';
import { TALENTS } from '../data/talents';

export class TalentSystem {
  static spend(player: Player, nodeId: string): boolean {
    const node = TALENTS.find((n) => n.id === nodeId);
    if (!node) {
      return false;
    }
    const rank = player.talentRanks[nodeId] ?? 0;
    if (player.talentPoints <= 0 || rank >= node.maxRank) {
      return false;
    }
    player.talentRanks[nodeId] = rank + 1;
    player.talentPoints -= 1;
    ProgressionSystem.recompute(player);
    return true;
  }
}
