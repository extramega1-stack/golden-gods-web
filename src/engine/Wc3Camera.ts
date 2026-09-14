import * as THREE from 'three';

export interface CameraConfig {
  fov: number;
  pitchDeg: number;
  yawDeg: number;
  distance: number;
}

export const WC3_CAMERA: CameraConfig = {
  fov: 45,
  pitchDeg: 55,
  yawDeg: 45,
  distance: 46,
};

export class Wc3Camera {
  readonly camera: THREE.PerspectiveCamera;

  private readonly offset = new THREE.Vector3();
  private readonly focus = new THREE.Vector3();
  private readonly scratch = new THREE.Vector3();
  private readonly yaw: number;
  private shakeRemaining = 0;
  private shakeIntensity = 0;

  constructor(aspect: number, config: CameraConfig = WC3_CAMERA) {
    const pitch = THREE.MathUtils.degToRad(config.pitchDeg);
    const yaw = THREE.MathUtils.degToRad(config.yawDeg);
    this.yaw = yaw;

    this.offset.set(
      config.distance * Math.cos(pitch) * Math.cos(yaw),
      config.distance * Math.sin(pitch),
      config.distance * Math.cos(pitch) * Math.sin(yaw)
    );

    this.camera = new THREE.PerspectiveCamera(config.fov, aspect, 0.5, 700);
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  snapTo(x: number, y: number, z: number): void {
    this.focus.set(x, y, z);
    this.apply(0);
  }

  follow(x: number, y: number, z: number, dt: number): void {
    this.scratch.set(x, y, z);
    const t = Math.min(1, 1 - Math.pow(0.0015, dt));
    this.focus.lerp(this.scratch, t);
    this.apply(dt);
  }

  shake(seconds: number, intensity: number): void {
    this.shakeRemaining = Math.max(this.shakeRemaining, seconds);
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  /**
   * Convierte una dirección en pantalla (y hacia arriba = -1) a una dirección sobre el
   * plano del suelo, según el yaw de la cámara.
   */
  groundDirection(screenX: number, screenY: number): { x: number; z: number } {
    const forwardX = -Math.cos(this.yaw);
    const forwardZ = -Math.sin(this.yaw);
    const rightX = Math.sin(this.yaw);
    const rightZ = -Math.cos(this.yaw);

    const x = rightX * screenX + forwardX * -screenY;
    const z = rightZ * screenX + forwardZ * -screenY;
    const len = Math.hypot(x, z);
    if (len === 0) {
      return { x: 0, z: 0 };
    }
    return { x: x / len, z: z / len };
  }

  private apply(dt: number): void {
    this.camera.position.copy(this.focus).add(this.offset);

    if (this.shakeRemaining > 0) {
      this.shakeRemaining -= dt;
      const amount = Math.max(0, this.shakeRemaining) * this.shakeIntensity * 6;
      this.camera.position.x += (Math.random() * 2 - 1) * amount;
      this.camera.position.y += (Math.random() * 2 - 1) * amount;
      this.camera.position.z += (Math.random() * 2 - 1) * amount;
      if (this.shakeRemaining <= 0) {
        this.shakeIntensity = 0;
      }
    }

    this.camera.lookAt(this.focus);
  }
}
