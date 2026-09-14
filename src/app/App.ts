import * as THREE from 'three';
import { Renderer } from '../engine/Renderer';
import { SceneRoot } from '../engine/SceneRoot';
import { Wc3Camera } from '../engine/Wc3Camera';
import { Loop } from '../engine/Loop';

export class App {
  private readonly renderer: Renderer;
  private readonly root: SceneRoot;
  private readonly rig: Wc3Camera;
  private readonly loop: Loop;
  private readonly spinner: THREE.Mesh;

  constructor(container: HTMLElement) {
    this.renderer = new Renderer(container);
    this.root = new SceneRoot();
    this.rig = new Wc3Camera(this.renderer.aspect);

    window.addEventListener('resize', () => this.rig.setAspect(this.renderer.aspect));

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 90),
      new THREE.MeshLambertMaterial({ color: 0x2e3b2a })
    );
    ground.rotation.x = -Math.PI / 2;
    this.root.add(ground);

    this.spinner = new THREE.Mesh(
      new THREE.BoxGeometry(3, 4, 3),
      new THREE.MeshLambertMaterial({ color: 0xe8d9a0 })
    );
    this.spinner.position.set(0, 2, 0);
    this.root.add(this.spinner);

    this.rig.snapTo(0, 0, 0);

    this.loop = new Loop((dt) => this.update(dt));
    this.loop.start();
  }

  private update(dt: number): void {
    this.spinner.rotation.y += dt * 0.8;
    this.rig.follow(this.spinner.position.x, 0, this.spinner.position.z, dt);
    this.renderer.render(this.root.scene, this.rig.camera);
  }
}
