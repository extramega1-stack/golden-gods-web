import { Unit, type WorldRefs } from './Unit';
import { createUnitMesh, wrapModel } from './MeshFactory';
import { TILE_SIZE } from '../config/constants';
import { BOT_MODELS, MODEL_HEIGHTS, MODEL_WEAPONS } from '../assets/manifest';
import type { ModelProvider } from './ModelProvider';
import type { BotDef } from '../data/bots';

const BODY_RADIUS = 1;
const BODY_HEIGHT = 3.2;

/** Compañero de party: aliado que sigue al héroe y entra en combate. */
export class PartyBotUnit extends Unit {
  readonly botName: string;
  readonly engageRange: number;

  constructor(
    refs: WorldRefs,
    x: number,
    z: number,
    def: BotDef,
    models?: ModelProvider | null
  ) {
    const modelId = BOT_MODELS[def.id];
    const instantiated = modelId
      ? models?.instantiate(modelId, MODEL_HEIGHTS.bot, MODEL_WEAPONS[modelId] ?? []) ?? null
      : null;

    const mesh = instantiated
      ? wrapModel(instantiated.root)
      : createUnitMesh({
          color: def.color,
          radius: BODY_RADIUS,
          height: BODY_HEIGHT,
          markerColor: 0xffffff,
        });

    super(refs, x, z, mesh, BODY_HEIGHT + 0.8, { ...def.stats });
    if (instantiated) {
      this.animation = instantiated.controller;
    }

    this.botName = def.name;
    this.engageRange = def.engageRange * TILE_SIZE;
  }
}
