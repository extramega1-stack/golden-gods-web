import { Unit, type WorldRefs } from './Unit';
import { createUnitMesh } from './MeshFactory';
import { TILE_SIZE } from '../config/constants';
import type { BotDef } from '../data/bots';

const BODY_RADIUS = 1;
const BODY_HEIGHT = 3.2;

/** Compañero de party: aliado que sigue al héroe y entra en combate. */
export class PartyBotUnit extends Unit {
  readonly botName: string;
  readonly engageRange: number;

  constructor(refs: WorldRefs, x: number, z: number, def: BotDef) {
    const mesh = createUnitMesh({
      color: def.color,
      radius: BODY_RADIUS,
      height: BODY_HEIGHT,
      markerColor: 0xffffff,
    });
    super(refs, x, z, mesh, BODY_HEIGHT + 0.8, { ...def.stats });
    this.botName = def.name;
    this.engageRange = def.engageRange * TILE_SIZE;
  }
}
