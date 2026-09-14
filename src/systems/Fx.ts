import * as THREE from 'three';
import type { SceneRoot } from '../engine/SceneRoot';
import type { Wc3Camera } from '../engine/Wc3Camera';

interface FloatingText {
  el: HTMLElement;
  x: number;
  y: number;
  z: number;
  age: number;
  ttl: number;
  rise: number;
}

interface Ring {
  mesh: THREE.Mesh;
  age: number;
  ttl: number;
  maxRadius: number;
}

interface Dissolve {
  object: THREE.Object3D;
  age: number;
  ttl: number;
}

/**
 * Efectos de juego desacoplados del motor de entidades: textos flotantes proyectados a
 * DOM (más nítidos que texto 3D), anillos en el suelo y disolución de mallas al morir.
 */
export class Fx {
  private readonly texts: FloatingText[] = [];
  private readonly rings: Ring[] = [];
  private readonly dissolves: Dissolve[] = [];
  private readonly projected = new THREE.Vector3();

  constructor(
    private readonly host: HTMLElement,
    private readonly root: SceneRoot,
    private readonly rig: Wc3Camera
  ) {}

  floatingText(x: number, y: number, z: number, text: string, color: string, ttl = 0.9): void {
    const el = document.createElement('div');
    el.className = 'fx-text';
    el.textContent = text;
    el.style.color = color;
    this.host.appendChild(el);
    this.texts.push({ el, x, y, z, age: 0, ttl, rise: 0 });
  }

  ring(x: number, y: number, z: number, radius: number, color: number, ttl = 0.4): void {
    const geometry = new THREE.RingGeometry(0.55, 1, 32);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y + 0.15, z);
    this.root.add(mesh);
    this.rings.push({ mesh, age: 0, ttl, maxRadius: radius });
  }

  dissolve(object: THREE.Object3D, ttl = 0.35): void {
    for (const material of Fx.materialsOf(object)) {
      material.transparent = true;
    }
    this.dissolves.push({ object, age: 0, ttl });
  }

  shake(seconds: number, intensity: number): void {
    this.rig.shake(seconds, intensity);
  }

  update(dt: number): void {
    this.updateTexts(dt);
    this.updateRings(dt);
    this.updateDissolves(dt);
  }

  private updateTexts(dt: number): void {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const item = this.texts[i];
      item.age += dt;
      item.rise += dt * 2.4;
      if (item.age >= item.ttl) {
        item.el.remove();
        this.texts.splice(i, 1);
        continue;
      }
      this.project(item.x, item.y + item.rise, item.z);
      item.el.style.transform = `translate(-50%, -50%) translate(${this.projected.x}px, ${this.projected.y}px)`;
      item.el.style.opacity = String(1 - item.age / item.ttl);
    }
  }

  private updateRings(dt: number): void {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const item = this.rings[i];
      item.age += dt;
      const k = Math.min(1, item.age / item.ttl);
      item.mesh.scale.setScalar(0.35 + k * item.maxRadius);
      (item.mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - k);
      if (item.age >= item.ttl) {
        item.mesh.removeFromParent();
        item.mesh.geometry.dispose();
        (item.mesh.material as THREE.Material).dispose();
        this.rings.splice(i, 1);
      }
    }
  }

  private updateDissolves(dt: number): void {
    for (let i = this.dissolves.length - 1; i >= 0; i--) {
      const item = this.dissolves[i];
      item.age += dt;
      const k = Math.min(1, item.age / item.ttl);
      item.object.scale.setScalar(1 + k * 0.35);
      item.object.position.y += dt * 0.8;
      for (const material of Fx.materialsOf(item.object)) {
        material.opacity = 1 - k;
      }
      if (item.age >= item.ttl) {
        Fx.disposeObject(item.object);
        this.dissolves.splice(i, 1);
      }
    }
  }

  private project(x: number, y: number, z: number): void {
    this.projected.set(x, y, z).project(this.rig.camera);
    this.projected.x = (this.projected.x * 0.5 + 0.5) * window.innerWidth;
    this.projected.y = (-this.projected.y * 0.5 + 0.5) * window.innerHeight;
  }

  private static materialsOf(object: THREE.Object3D): THREE.Material[] {
    const found: THREE.Material[] = [];
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.material) {
        return;
      }
      if (Array.isArray(mesh.material)) {
        found.push(...mesh.material);
      } else {
        found.push(mesh.material);
      }
    });
    return found;
  }

  private static disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      for (const material of Fx.materialsOf(mesh)) {
        material.dispose();
      }
    });
    object.removeFromParent();
  }
}
