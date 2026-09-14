import * as THREE from 'three';
import { TILE_SIZE } from '../config/constants';
import { levelToWorldY } from '../world/heightmap';
import { createUnitMesh, wrapModel } from './MeshFactory';
import { MODEL_WEAPONS } from '../assets/manifest';
import type { AnimationController } from './AnimationController';
import type { ModelProvider } from './ModelProvider';
import type { WorldRefs } from './Unit';
import type { Wc3Camera } from '../engine/Wc3Camera';

const MAX_LEVEL = 9;
const LEVEL_INTERVAL_MS = 18000;
const SPEED = 2.6 * TILE_SIZE;
const MODEL_HEIGHT = 2.9;

/**
 * Héroe de la población simulada: deambula por la zona, sube de nivel con el tiempo y
 * lleva su nombre flotando proyectado a DOM. Es decorativo: da sensación de servidor vivo.
 */
export class PopulationHero3D {
  worldX: number;
  worldZ: number;
  level = 1;

  private readonly mesh: THREE.Object3D;
  private readonly animation?: AnimationController;
  private readonly label: HTMLDivElement;
  private readonly projected = new THREE.Vector3();
  private readonly refs: WorldRefs;
  private readonly rig: Wc3Camera;
  private target: { x: number; z: number };
  private retargetAt = 0;
  private levelUpAt = 0;
  private moved = false;
  private disposed = false;

  constructor(
    refs: WorldRefs,
    rig: Wc3Camera,
    host: HTMLElement,
    x: number,
    z: number,
    private readonly heroName: string,
    color: number,
    models?: ModelProvider | null,
    modelId?: string
  ) {
    this.refs = refs;
    this.rig = rig;
    this.worldX = x;
    this.worldZ = z;

    const instantiated = modelId
      ? models?.instantiate(modelId, MODEL_HEIGHT, MODEL_WEAPONS[modelId] ?? []) ?? null
      : null;
    this.mesh = instantiated
      ? wrapModel(instantiated.root)
      : createUnitMesh({ color, radius: 0.85, height: 2.9, markerColor: 0x2a2438 });
    if (instantiated) {
      this.animation = instantiated.controller;
    }
    refs.root.add(this.mesh);

    this.label = document.createElement('div');
    this.label.className = 'pop-label';
    this.label.textContent = `${heroName} Lv${this.level}`;
    host.appendChild(this.label);

    this.target = this.randomTarget();
    this.sync();
  }

  update(dt: number, now: number): void {
    if (this.disposed) {
      return;
    }

    if (now >= this.retargetAt) {
      this.target = this.randomTarget();
    }

    const dx = this.target.x - this.worldX;
    const dz = this.target.z - this.worldZ;
    const dist = Math.hypot(dx, dz);

    this.moved = false;
    if (dist > 0.3) {
      const step = Math.min(SPEED * dt, dist);
      this.moveStep((dx / dist) * step, (dz / dist) * step);
    } else {
      this.retargetAt = 0;
    }

    if (now >= this.levelUpAt) {
      this.levelUpAt = now + LEVEL_INTERVAL_MS;
      if (this.level < MAX_LEVEL) {
        this.level += 1;
        this.label.textContent = `${this.heroName} Lv${this.level}`;
      }
    }

    if (this.animation) {
      this.animation.setLocomotion(this.moved ? 'run' : 'idle');
      this.animation.update(dt);
    }

    this.sync();
  }

  dispose(): void {
    this.disposed = true;
    this.animation?.dispose();
    this.mesh.removeFromParent();
    this.label.remove();
  }

  private moveStep(dx: number, dz: number): void {
    const nav = this.refs.nav;
    const level = nav.levelAt(this.worldX, this.worldZ);
    if (dx !== 0 && nav.isAreaWalkable(this.worldX + dx, this.worldZ, 0.8, level)) {
      this.worldX += dx;
      this.moved = true;
    }
    if (dz !== 0 && nav.isAreaWalkable(this.worldX, this.worldZ + dz, 0.8, level)) {
      this.worldZ += dz;
      this.moved = true;
    }
    if (this.moved) {
      this.mesh.rotation.y = Math.atan2(dx, dz);
    }
  }

  private sync(): void {
    const y = levelToWorldY(this.refs.nav.levelAt(this.worldX, this.worldZ));
    this.mesh.position.set(this.worldX, y, this.worldZ);

    this.projected.set(this.worldX, y + 4.2, this.worldZ).project(this.rig.camera);
    const screenX = (this.projected.x * 0.5 + 0.5) * window.innerWidth;
    const screenY = (-this.projected.y * 0.5 + 0.5) * window.innerHeight;
    this.label.style.transform = `translate(-50%, -100%) translate(${screenX}px, ${screenY}px)`;
  }

  private randomTarget(): { x: number; z: number } {
    const nav = this.refs.nav;
    for (let i = 0; i < 20; i++) {
      const col = 1 + Math.floor(Math.random() * (nav.cols - 2));
      const row = 1 + Math.floor(Math.random() * (nav.rows - 2));
      if (nav.isWalkableCell(col, row)) {
        this.retargetAt = performance.now() + 2500 + Math.random() * 4000;
        return { x: (col + 0.5) * TILE_SIZE, z: (row + 0.5) * TILE_SIZE };
      }
    }
    this.retargetAt = performance.now() + 3000;
    return { x: this.worldX, z: this.worldZ };
  }
}
