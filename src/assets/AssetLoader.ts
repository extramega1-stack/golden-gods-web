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
  private readonly scenes = new Map<string, THREE.Group>();

  /** Carga un GLB estático (props del terreno) sin mirar animaciones. */
  async loadScene(key: string, path: string): Promise<THREE.Group> {
    const cached = this.scenes.get(key);
    if (cached) {
      return cached;
    }
    const gltf = await this.loader.loadAsync(path);
    this.scenes.set(key, gltf.scene);
    return gltf.scene;
  }

  getScene(key: string): THREE.Group | null {
    return this.scenes.get(key) ?? null;
  }

  /** Precarga los props y deja una sola copia del atlas compartido en memoria. */
  async preloadProps(ids: string[]): Promise<void> {
    await Promise.all(
      ids.map((id) =>
        this.loadScene(`props/${id}`, `models/props/${id}.glb`).catch((error) => {
          console.warn(`No se pudo cargar el prop "${id}".`, error);
          return null;
        })
      )
    );
    this.sharePropAtlas();
  }

  collectPropModels(ids: string[]): Map<string, THREE.Object3D> {
    const models = new Map<string, THREE.Object3D>();
    for (const id of ids) {
      const scene = this.scenes.get(`props/${id}`);
      if (scene) {
        models.set(id, scene);
      }
    }
    return models;
  }

  /**
   * Cada prop trae embebida la misma imagen de 1024x1024. Sin esto habría 22 texturas
   * idénticas en la GPU (unas 88 MB); con esto queda una sola.
   */
  private sharePropAtlas(): void {
    let shared: THREE.Texture | null = null;
    const redundant: THREE.Texture[] = [];

    const adopt = (material: THREE.Material): void => {
      const withMap = material as THREE.Material & { map?: THREE.Texture | null };
      const map = withMap.map;
      if (!map) {
        return;
      }
      if (shared === null) {
        shared = map;
        return;
      }
      if (map !== shared) {
        withMap.map = shared;
        material.needsUpdate = true;
        redundant.push(map);
      }
    };

    for (const [key, scene] of this.scenes) {
      if (!key.startsWith('props/')) {
        continue;
      }
      scene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!(mesh as unknown as { isMesh?: boolean }).isMesh) {
          return;
        }
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          if (material) {
            adopt(material);
          }
        }
      });
    }

    for (const texture of redundant) {
      texture.dispose();
    }
  }

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
