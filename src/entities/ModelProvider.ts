import type * as THREE from 'three';
import type { AnimationController } from '../entities/AnimationController';
import type { WeaponSpec } from '../assets/manifest';

/** Modelo ya clonado y con su mixer, listo para colgar de una entidad. */
export interface InstantiatedModel {
  root: THREE.Object3D;
  controller: AnimationController;
}

/**
 * Lo que las entidades necesitan del cargador de assets. Es una interfaz estrecha a
 * propósito: así las entidades no arrastran GLTFLoader y se pueden probar sin navegador.
 */
export interface ModelProvider {
  instantiate(id: string, targetHeight: number, weapons?: WeaponSpec[]): InstantiatedModel | null;
}
