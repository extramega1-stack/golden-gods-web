import { Unit, type WorldRefs } from './Unit';
import { createUnitMesh, wrapModel } from './MeshFactory';
import { TILE_SIZE } from '../config/constants';
import { ENEMY_MODELS, MODEL_HEIGHTS } from '../assets/manifest';
import type { ModelProvider } from './ModelProvider';
import type { EnemyDef } from '../types';

/** Altura del modelo según el tipo de enemigo; el jefe es mucho más grande. */
const ENEMY_MODEL_HEIGHTS: Record<string, number> = {
  slime: MODEL_HEIGHTS.minion,
  brute: MODEL_HEIGHTS.brute,
  titan: MODEL_HEIGHTS.boss,
};

/** Enemigo 3D: radio y rango de aggro se derivan del dato, en celdas, a unidades de mundo. */
export class EnemyUnit extends Unit {
  readonly def: EnemyDef;
  readonly aggroRange: number;

  bossPhase = 1;
  slamReadyAt = 0;
  slamPendingAt = 0;
  slamDamage = 0;
  slamX = 0;
  slamZ = 0;

  constructor(
    refs: WorldRefs,
    x: number,
    z: number,
    def: EnemyDef,
    models?: ModelProvider | null
  ) {
    const radius = def.radiusTiles * TILE_SIZE;
    const primitiveHeight = radius * 2.4;
    const modelHeight = ENEMY_MODEL_HEIGHTS[def.id] ?? primitiveHeight;
    const modelId = ENEMY_MODELS[def.id];
    const instantiated = modelId ? models?.instantiate(modelId, modelHeight) ?? null : null;

    const mesh = instantiated
      ? wrapModel(instantiated.root)
      : createUnitMesh({
          color: def.color,
          radius,
          height: primitiveHeight,
          markerColor: 0x14101c,
        });

    super(refs, x, z, mesh, modelHeight + 0.8, {
      hp: def.stats.maxHp,
      mp: def.stats.maxMp,
      ...def.stats,
    });

    if (instantiated) {
      this.animation = instantiated.controller;
    }

    this.def = def;
    this.aggroRange = def.aggroRange * TILE_SIZE;
  }
}
