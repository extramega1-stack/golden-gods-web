import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { AnimationController } from '../entities/AnimationController';
import { resolveAnimations, type AnimState } from './manifest';
import type { InstantiatedModel, ModelProvider } from '../entities/ModelProvider';

interface LoadedModel {
  scene: THREE.Group;
  animations: Partial<Record<AnimState, THREE.AnimationClip>>;
}

/**
 * Carga los GLB una sola vez y entrega copias. Cada copia usa SkeletonUtils.clone
 * (un .clone() normal rompería el esqueleto) y su propio AnimationMixer, pero
 * comparte los clips originales, que es lo que quiere Three.js.
 */
export class AssetLoader implements ModelProvider {
  private readonly loader = new GLTFLoader();
  private readonly cache = new Map<string, LoadedModel>();

  async load(id: string): Promise<LoadedModel> {
    const cached = this.cache.get(id);
    if (cached) {
      return cached;
    }

    const gltf = await this.loader.loadAsync(`models/${id}.glb`);
    const names = gltf.animations.map((clip) => clip.name);
    const mapping = resolveAnimations(names);

    const animations: Partial<Record<AnimState, THREE.AnimationClip>> = {};
    for (const [state, name] of Object.entries(mapping)) {
      const clip = gltf.animations.find((candidate) => candidate.name === name);
      if (clip) {
        animations[state as AnimState] = clip;
      }
    }

    const model: LoadedModel = { scene: gltf.scene, animations };
    this.cache.set(id, model);
    return model;
  }

  /** Carga todo lo que se le pase; si algo falla, esa entidad usará la primitiva. */
  async preload(ids: string[]): Promise<void> {
    await Promise.all(
      ids.map((id) =>
        this.load(id).catch((error) => {
          console.warn(`No se pudo cargar el modelo "${id}", se usará la primitiva.`, error);
          return null;
        })
      )
    );
  }

  isReady(id: string): boolean {
    return this.cache.has(id);
  }

  instantiate(id: string, targetHeight: number): InstantiatedModel | null {
    const loaded = this.cache.get(id);
    if (!loaded) {
      return null;
    }

    const root = cloneSkinned(loaded.scene) as THREE.Group;

    // Normalizar: escala a la altura deseada y baja los pies al suelo. Así da igual
    // en qué escala venga el modelo original.
    const initial = new THREE.Box3().setFromObject(root);
    const size = initial.getSize(new THREE.Vector3());
    const scale = size.y > 0 ? targetHeight / size.y : 1;
    root.scale.setScalar(scale);

    const scaled = new THREE.Box3().setFromObject(root);
    root.position.y -= scaled.min.y;

    const mixer = new THREE.AnimationMixer(root);
    const controller = new AnimationController(mixer, loaded.animations);
    controller.setLocomotion('idle');

    return { root, controller };
  }
}
