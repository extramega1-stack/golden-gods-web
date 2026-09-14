import type * as THREE from 'three';
import { TILE_SIZE } from '../config/constants';
import { levelToWorldY } from '../world/heightmap';
import { HealthBar } from './HealthBar';
import type { AnimationController } from './AnimationController';
import type { Navigation } from '../world/Navigation';
import type { SceneRoot } from '../engine/SceneRoot';
import type { Stats } from '../types';

export interface WorldRefs {
  root: SceneRoot;
  nav: Navigation;
}

type FlashMaterial = THREE.MeshStandardMaterial | THREE.MeshLambertMaterial;

/**
 * Entidad base agnóstica del motor: guarda posición, stats y vida, y expone un handle
 * de Three.js (primitiva o modelo animado) para dibujarse. Toda la lógica vive aquí,
 * no en el motor de render.
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

  /** Presente solo si la entidad se creó con un modelo; si no, se usan primitivas. */
  animation?: AnimationController;

  readonly mesh: THREE.Group;

  protected readonly refs: WorldRefs;
  private readonly bar: HealthBar;
  private readonly barY: number;
  private movedThisFrame = false;
  private flashRestore: { material: FlashMaterial; emissive: number }[] | null = null;
  private flashUntil = 0;

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

  /** Alcance de ataque en unidades de mundo (el dato está en celdas). */
  get attackRange(): number {
    return this.stats.attackRange * TILE_SIZE;
  }

  /** Altura a la que flota la barra de vida, sobre la cabeza. */
  get barHeight(): number {
    return this.barY;
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
    const beforeX = this.worldX;
    const beforeZ = this.worldZ;

    if (dx !== 0 && nav.isAreaWalkable(this.worldX + dx, this.worldZ, this.radius, level)) {
      this.worldX += dx;
    }
    if (dz !== 0 && nav.isAreaWalkable(this.worldX, this.worldZ + dz, this.radius, level)) {
      this.worldZ += dz;
    }

    if (this.worldX !== beforeX || this.worldZ !== beforeZ) {
      this.movedThisFrame = true;
      this.syncTransform();
    }
  }

  /**
   * Avanza el mixer y elige la animación de locomoción según si se movió este frame.
   * Hay que llamarlo después de mover a la unidad.
   */
  updateAnimation(dt: number): void {
    this.updateFlash();
    if (!this.animation) {
      return;
    }
    this.animation.setLocomotion(this.movedThisFrame ? 'run' : 'idle');
    this.movedThisFrame = false;
    this.animation.update(dt);
  }

  /** Destello blanco al recibir un golpe, para que se note. */
  private flash(): void {
    if (!this.flashRestore) {
      this.flashRestore = [];
      this.mesh.traverse((child) => {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as FlashMaterial | undefined;
        if (material && material.emissive) {
          this.flashRestore!.push({ material, emissive: material.emissive.getHex() });
        }
      });
    }
    for (const entry of this.flashRestore) {
      entry.material.emissive.setHex(0xffffff);
    }
    this.flashUntil = performance.now() + 70;
  }

  private updateFlash(): void {
    if (this.flashUntil === 0 || performance.now() < this.flashUntil || !this.flashRestore) {
      return;
    }
    for (const entry of this.flashRestore) {
      entry.material.emissive.setHex(entry.emissive);
    }
    this.flashUntil = 0;
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
    this.flash();
    if (this.stats.hp <= 0) {
      this.die();
    } else {
      this.animation?.trigger('hit');
    }
    return damage;
  }

  die(): void {
    if (!this.isAlive) {
      return;
    }
    this.isAlive = false;
    this.bar.setVisible(false);
    if (this.animation) {
      // Con modelo, la muerte se ve: se reproduce la animación y el mundo decide
      // cuándo retirar la malla.
      this.animation.die();
    } else {
      this.mesh.visible = false;
    }
    this.onDeath?.(this);
  }

  respawn(x: number, z: number): void {
    this.stats.hp = this.stats.maxHp;
    this.stats.mp = this.stats.maxMp;
    this.isAlive = true;
    this.mesh.visible = true;
    this.bar.setVisible(true);
    this.bar.setRatio(1);
    this.animation?.reset();
    this.setWorldPos(x, z);
  }

  dispose(): void {
    this.animation?.dispose();
    this.mesh.removeFromParent();
    this.bar.dispose();
  }
}
