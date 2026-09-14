import type * as THREE from 'three';
import { TILE_SIZE } from '../config/constants';
import { levelToWorldY } from '../world/heightmap';
import { HealthBar } from './HealthBar';
import type { Navigation } from '../world/Navigation';
import type { SceneRoot } from '../engine/SceneRoot';
import type { Stats } from '../types';

export interface WorldRefs {
  root: SceneRoot;
  nav: Navigation;
}

/**
 * Entidad base agnóstica del motor: guarda posición, stats y vida, y expone un handle
 * de Three.js para dibujarse. Toda la lógica vive aquí, no en el motor de render.
 */
export class Unit {
  worldX = 0;
  worldZ = 0;
  radius = 1.1;
  isAlive = true;
  nextAttackAt = 0;
  stats: Stats;
  facing = { x: 0, z: 1 };
  onDeath?: (unit: Unit) => void;

  readonly mesh: THREE.Group;

  protected readonly refs: WorldRefs;
  private readonly bar: HealthBar;
  private readonly barY: number;

  constructor(
    refs: WorldRefs,
    x: number,
    z: number,
    mesh: THREE.Group,
    barY: number,
    stats: Stats
  ) {
    this.refs = refs;
    this.mesh = mesh;
    this.barY = barY;
    this.stats = stats;
    refs.root.add(mesh);
    this.bar = new HealthBar(refs.root);
    this.setWorldPos(x, z);
  }

  /** Nivel de terreno de la celda que ocupa. */
  get terrainLevel(): number {
    return this.refs.nav.levelAt(this.worldX, this.worldZ);
  }

  get worldY(): number {
    return levelToWorldY(this.terrainLevel);
  }

  get hpRatio(): number {
    return Math.min(1, Math.max(0, this.stats.hp / this.stats.maxHp));
  }

  /** Velocidad en unidades de mundo por segundo (moveSpeed está en celdas por segundo). */
  get worldSpeed(): number {
    return this.stats.moveSpeed * TILE_SIZE;
  }

  setWorldPos(x: number, z: number): void {
    this.worldX = x;
    this.worldZ = z;
    this.syncTransform();
  }

  syncTransform(): void {
    this.mesh.position.set(this.worldX, this.worldY, this.worldZ);
  }

  setFacing(x: number, z: number): void {
    this.facing = { x, z };
    this.mesh.rotation.y = Math.atan2(x, z);
  }

  /** Movimiento con separación de ejes, respetando muros y la regla de escalón. */
  moveWorld(dx: number, dz: number): void {
    const level = this.terrainLevel;
    const nav = this.refs.nav;
    if (dx !== 0 && nav.isAreaWalkable(this.worldX + dx, this.worldZ, this.radius, level)) {
      this.worldX += dx;
    }
    if (dz !== 0 && nav.isAreaWalkable(this.worldX, this.worldZ + dz, this.radius, level)) {
      this.worldZ += dz;
    }
    this.syncTransform();
  }

  updateBar(camera: THREE.Camera): void {
    this.bar.update(this.worldX, this.worldY + this.barY, this.worldZ, camera);
  }

  takeDamage(amount: number): number {
    if (!this.isAlive) {
      return 0;
    }
    const damage = Math.max(1, Math.round(amount));
    this.stats.hp = Math.max(0, this.stats.hp - damage);
    this.bar.setRatio(this.hpRatio);
    if (this.stats.hp <= 0) {
      this.die();
    }
    return damage;
  }

  die(): void {
    if (!this.isAlive) {
      return;
    }
    this.isAlive = false;
    this.mesh.visible = false;
    this.bar.setVisible(false);
    this.onDeath?.(this);
  }

  respawn(x: number, z: number): void {
    this.stats.hp = this.stats.maxHp;
    this.stats.mp = this.stats.maxMp;
    this.isAlive = true;
    this.mesh.visible = true;
    this.bar.setVisible(true);
    this.bar.setRatio(1);
    this.setWorldPos(x, z);
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.bar.dispose();
  }
}
