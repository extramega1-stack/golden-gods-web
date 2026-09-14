import * as THREE from 'three';

export class SceneRoot {
  readonly scene = new THREE.Scene();
  readonly sun = new THREE.DirectionalLight(0xffe9c0, 1.15);

  constructor() {
    this.scene.background = new THREE.Color(0x0f0e13);
    this.scene.fog = new THREE.Fog(0x0f0e13, 80, 190);

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.sun.position.set(-45, 85, 40);
    this.scene.add(ambient, this.sun);
  }

  add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  remove(object: THREE.Object3D): void {
    this.scene.remove(object);
  }
}
