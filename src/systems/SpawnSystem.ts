import type { Enemy } from '../entities/Enemy';
import type { SpawnDef } from '../types';

interface SpawnPoint {
  def: SpawnDef;
  enemy: Enemy | null;
  respawnAt: number;
}

export class SpawnSystem {
  private readonly points: SpawnPoint[];

  constructor(
    spawns: SpawnDef[],
    private readonly create: (def: SpawnDef) => Enemy
  ) {
    this.points = spawns.map((def) => ({ def, enemy: null, respawnAt: 0 }));
  }

  update(time: number): void {
    for (const point of this.points) {
      if (point.enemy && !point.enemy.isAlive) {
        point.enemy = null;
        point.respawnAt = time + point.def.respawnSeconds * 1000;
      }
      if (!point.enemy && time >= point.respawnAt) {
        point.enemy = this.create(point.def);
      }
    }
  }
}
