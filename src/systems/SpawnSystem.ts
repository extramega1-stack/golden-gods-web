import type { EnemyUnit } from '../entities/EnemyUnit';
import type { SpawnDef } from '../types';

interface SpawnPoint {
  def: SpawnDef;
  enemy: EnemyUnit | null;
  respawnAt: number;
}

export class SpawnSystem {
  private readonly points: SpawnPoint[];

  constructor(
    spawns: SpawnDef[],
    private readonly create: (def: SpawnDef) => EnemyUnit
  ) {
    this.points = spawns.map((def) => ({ def, enemy: null, respawnAt: 0 }));
  }

  get active(): number {
    return this.points.filter((p) => p.enemy && p.enemy.isAlive).length;
  }

  update(now: number): void {
    for (const point of this.points) {
      if (point.enemy && !point.enemy.isAlive) {
        point.enemy = null;
        point.respawnAt = now + point.def.respawnSeconds * 1000;
      }
      if (!point.enemy && now >= point.respawnAt) {
        point.enemy = this.create(point.def);
      }
    }
  }
}
