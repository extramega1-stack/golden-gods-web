import * as THREE from 'three';
import type { SceneRoot } from '../engine/SceneRoot';

const WIDTH = 2.4;
const HEIGHT = 0.3;

/** Barra de vida como cartel que mira siempre a la cámara. */
export class HealthBar {
  private readonly group = new THREE.Group();
  private readonly fill: THREE.Mesh;
  private ratio = 1;

  constructor(root: SceneRoot) {
    const background = new THREE.Mesh(
      new THREE.PlaneGeometry(WIDTH, HEIGHT),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6 })
    );

    const fillGeometry = new THREE.PlaneGeometry(WIDTH - 0.08, HEIGHT - 0.08);
    fillGeometry.translate((WIDTH - 0.08) / 2, 0, 0);
    this.fill = new THREE.Mesh(
      fillGeometry,
      new THREE.MeshBasicMaterial({ color: 0x59d65a })
    );
    this.fill.position.set(-(WIDTH - 0.08) / 2, 0, 0.01);

    this.group.add(background, this.fill);
    this.group.renderOrder = 10;
    root.add(this.group);
  }

  setRatio(ratio: number): void {
    this.ratio = Math.min(1, Math.max(0, ratio));
    this.fill.scale.x = this.ratio;
    const material = this.fill.material as THREE.MeshBasicMaterial;
    material.color.setHex(this.ratio > 0.5 ? 0x59d65a : this.ratio > 0.25 ? 0xe0c341 : 0xd9534f);
  }

  get currentRatio(): number {
    return this.ratio;
  }

  update(worldX: number, worldY: number, worldZ: number, camera: THREE.Camera): void {
    this.group.position.set(worldX, worldY, worldZ);
    this.group.quaternion.copy(camera.quaternion);
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  dispose(): void {
    this.group.removeFromParent();
  }
}
