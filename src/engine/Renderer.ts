import * as THREE from 'three';
import { MAX_DPR } from '../config/constants';

export class Renderer {
  readonly three: THREE.WebGLRenderer;

  constructor(private readonly container: HTMLElement) {
    this.three = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.three.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
    this.three.shadowMap.enabled = false;
    container.appendChild(this.three.domElement);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  get aspect(): number {
    const width = this.container.clientWidth || window.innerWidth || 1;
    const height = this.container.clientHeight || window.innerHeight || 1;
    return width / height;
  }

  resize(): void {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.three.setSize(width, height);
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.three.render(scene, camera);
  }
}
