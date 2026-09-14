import * as THREE from 'three';
import { levelToWorldY } from './heightmap';
import type { Navigation } from './Navigation';
import type { SceneRoot } from '../engine/SceneRoot';
import type { PropPlacement } from './props';

/**
 * Coloca la decoración usando InstancedMesh: una llamada de dibujo por tipo de prop en
 * vez de una por objeto. Importante en el WebView de Android, donde las draw calls son
 * el cuello de botella.
 */
export class PropField {
  private readonly instanced: THREE.InstancedMesh[] = [];

  constructor(
    root: SceneRoot,
    nav: Navigation,
    models: Map<string, THREE.Object3D>,
    placements: PropPlacement[]
  ) {
    const byProp = new Map<string, PropPlacement[]>();
    for (const placement of placements) {
      const list = byProp.get(placement.propId);
      if (list) {
        list.push(placement);
      } else {
        byProp.set(placement.propId, [placement]);
      }
    }

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const rotation = new THREE.Euler();

    for (const [propId, spots] of byProp) {
      const model = models.get(propId);
      if (!model) {
        continue;
      }
      model.updateMatrixWorld(true);

      model.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!(mesh as unknown as { isMesh?: boolean }).isMesh) {
          return;
        }

        const instanced = new THREE.InstancedMesh(mesh.geometry, mesh.material, spots.length);
        spots.forEach((spot, index) => {
          position.set(spot.x, levelToWorldY(nav.levelAt(spot.x, spot.z)), spot.z);
          rotation.set(0, spot.rotY, 0);
          quaternion.setFromEuler(rotation);
          scale.setScalar(spot.scale);
          matrix.compose(position, quaternion, scale).multiply(mesh.matrixWorld);
          instanced.setMatrixAt(index, matrix);
        });
        instanced.instanceMatrix.needsUpdate = true;
        instanced.computeBoundingSphere();
        instanced.name = `prop:${propId}`;
        root.add(instanced);
        this.instanced.push(instanced);
      });
    }
  }

  get count(): number {
    return this.instanced.reduce((sum, mesh) => sum + mesh.count, 0);
  }

  dispose(): void {
    // La geometría y el material son del modelo cacheado: no se destruyen aquí.
    for (const mesh of this.instanced) {
      mesh.removeFromParent();
      mesh.dispose();
    }
    this.instanced.length = 0;
  }
}
