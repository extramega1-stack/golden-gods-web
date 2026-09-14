import { Unit, type WorldRefs } from './Unit';
import { createUnitMesh } from './MeshFactory';
import { TILE_SIZE } from '../config/constants';
import type { EnemyDef } from '../types';

/** Enemigo 3D: radio y rango de aggro se derivan del dato, en celdas, a unidades de mundo. */
export class EnemyUnit extends Unit {
  readonly def: EnemyDef;
  readonly aggroRange: number;

  constructor(refs: WorldRefs, x: number, z: number, def: EnemyDef) {
    const radius = def.radiusTiles * TILE_SIZE;
    const height = radius * 2.4;
    const mesh = createUnitMesh({
      color: def.color,
      radius,
      height,
      markerColor: 0x14101c,
    });
    super(refs, x, z, mesh, height + 0.8, {
      hp: def.stats.maxHp,
      mp: def.stats.maxMp,
      ...def.stats,
    });
    this.def = def;
    this.aggroRange = def.aggroRange * TILE_SIZE;
  }
}
