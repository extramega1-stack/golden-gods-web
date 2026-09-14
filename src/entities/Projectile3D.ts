import * as THREE from 'three';
import { TILE_SIZE } from '../config/constants';
import { levelToWorldY } from '../world/heightmap';
import { CombatSystem } from '../systems/CombatSystem';
import type { WorldRefs } from './Unit';
import type { EnemyUnit } from './EnemyUnit';
import type { Fx } from '../systems/Fx';

const HIT_RADIUS = 1.6;

/** Proyectil 3D: avanza en línea, choca con muros y con el primer enemigo que toca. */
export class Projectile3D {
  worldX: number;
  worldZ: number;

  private readonly dirX: number;
  private readonly dirZ: number;
  private readonly speed: number;
  private readonly damage: number;
  private readonly color: number;
  private remaining: number;
  private trailAccum = 0;
  private dead = false;
  private readonly mesh: THREE.Mesh;
  private readonly refs: WorldRefs;

  constructor(
    refs: WorldRefs,
    x: number,
    z: number,
    dirX: number,
    dirZ: number,
    speed: number,
    range: number,
    damage: number,
    color: number
  ) {
    this.refs = refs;
    this.worldX = x;
    this.worldZ = z;
    this.dirX = dirX;
    this.dirZ = dirZ;
    this.speed = speed;
    this.remaining = range;
    this.damage = damage;
    this.color = color;

    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 10, 8),
      new THREE.MeshBasicMaterial({ color })
    );
    refs.root.add(this.mesh);
    this.sync();
  }

  get isDead(): boolean {
    return this.dead;
  }

  update(dt: number, enemies: EnemyUnit[], fx?: Fx): void {
    if (this.dead) {
      return;
    }

    const step = this.speed * TILE_SIZE * dt;
    const nextX = this.worldX + this.dirX * step;
    const nextZ = this.worldZ + this.dirZ * step;

    // La regla de escalón se evalúa desde el nivel actual del proyectil, no desde el destino.
    const currentLevel = this.refs.nav.levelAt(this.worldX, this.worldZ);
    if (!this.refs.nav.isAreaWalkable(nextX, nextZ, 0.4, currentLevel)) {
      this.kill();
      return;
    }

    this.worldX = nextX;
    this.worldZ = nextZ;
    this.remaining -= step;
    this.sync();

    // Rastro: chispas sueltas para que se vea de dónde viene.
    this.trailAccum += dt;
    if (this.trailAccum >= 0.045 && fx) {
      this.trailAccum = 0;
      fx.burst(this.worldX, this.mesh.position.y, this.worldZ, this.color, {
        count: 2,
        speed: 0.8,
        ttl: 0.22,
        spread: 0.25,
        lift: 0.4,
      });
    }

    for (const enemy of enemies) {
      if (!enemy.isAlive) {
        continue;
      }
      const dist = Math.hypot(enemy.worldX - this.worldX, enemy.worldZ - this.worldZ);
      if (dist <= HIT_RADIUS + enemy.radius) {
        CombatSystem.damage(enemy, this.damage, fx);
        fx?.burst(this.worldX, this.mesh.position.y, this.worldZ, this.color, {
          count: 14,
          speed: 5,
          ttl: 0.3,
          spread: 0.5,
          lift: 2,
        });
        this.kill();
        return;
      }
    }

    if (this.remaining <= 0) {
      this.kill();
    }
  }

  private sync(): void {
    const y = levelToWorldY(this.refs.nav.levelAt(this.worldX, this.worldZ)) + 2;
    this.mesh.position.set(this.worldX, y, this.worldZ);
  }

  private kill(): void {
    this.dead = true;
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
