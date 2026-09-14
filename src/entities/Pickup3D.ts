import * as THREE from 'three';
import { levelToWorldY } from '../world/heightmap';
import { InventorySystem } from '../systems/InventorySystem';
import type { WorldRefs } from './Unit';
import type { PlayerUnit } from './PlayerUnit';
import type { Fx } from '../systems/Fx';
import type { ItemDef } from '../types';

const PICKUP_RADIUS = 2.6;

/** Objeto en el suelo: gira y flota, y se recoge al pasar cerca. */
export class Pickup3D {
  worldX: number;
  worldZ: number;

  private readonly mesh: THREE.Mesh;
  private readonly def: ItemDef;
  private readonly baseY: number;
  private spin = 0;
  private collected = false;

  constructor(refs: WorldRefs, x: number, z: number, def: ItemDef) {
    this.worldX = x;
    this.worldZ = z;
    this.def = def;
    this.baseY = levelToWorldY(refs.nav.levelAt(x, z)) + 1.4;

    this.mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.9),
      new THREE.MeshLambertMaterial({ color: def.color })
    );
    this.mesh.position.set(x, this.baseY, z);
    refs.root.add(this.mesh);
  }

  get isCollected(): boolean {
    return this.collected;
  }

  update(dt: number, player: PlayerUnit, fx?: Fx): void {
    if (this.collected) {
      return;
    }

    this.spin += dt * 2;
    this.mesh.rotation.y = this.spin;
    this.mesh.position.y = this.baseY + Math.sin(this.spin) * 0.35;

    if (!player.isAlive) {
      return;
    }

    const dist = Math.hypot(player.worldX - this.worldX, player.worldZ - this.worldZ);
    if (dist <= PICKUP_RADIUS) {
      InventorySystem.addItem(player, this.def.id);
      fx?.floatingText(this.worldX, this.baseY + 1.6, this.worldZ, this.def.name, '#c9ffd0');
      this.collect();
    }
  }

  private collect(): void {
    this.collected = true;
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
