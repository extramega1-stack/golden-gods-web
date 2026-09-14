import * as THREE from 'three';
import type { SceneRoot } from '../engine/SceneRoot';

const CAPACITY = 320;
const GRAVITY = 9;
/**
 * Tamaño en unidades de mundo. Referencia: un personaje mide 3,4 unidades de alto y una
 * celda 4. Con 0,8 las chispas parecían bolas; ~0,4 se leen como chispas.
 */
const PARTICLE_SIZE = 0.42;

export interface BurstOptions {
  count?: number;
  speed?: number;
  ttl?: number;
  spread?: number;
  lift?: number;
}

/**
 * Partículas en un único THREE.Points: todas las chispas del juego se dibujan en una sola
 * llamada de dibujo, que es lo que permite tenerlas en el WebView de Android.
 *
 * Se usa mezcla aditiva y se desvanece bajando el color a negro: con aditivo, negro es
 * invisible, así que no hace falta alpha por vértice (que PointsMaterial no soporta).
 */
export class Particles {
  readonly points: THREE.Points;

  private readonly positions = new Float32Array(CAPACITY * 3);
  private readonly colors = new Float32Array(CAPACITY * 3);
  private readonly baseColors = new Float32Array(CAPACITY * 3);
  private readonly velocities = new Float32Array(CAPACITY * 3);
  private readonly life = new Float32Array(CAPACITY);
  private readonly ttl = new Float32Array(CAPACITY);
  private cursor = 0;

  constructor(root: SceneRoot) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const material = new THREE.PointsMaterial({
      size: PARTICLE_SIZE,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      map: Particles.createSoftTexture(),
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.name = 'particles';
    root.add(this.points);

    // Todo apagado al empezar.
    for (let i = 0; i < CAPACITY; i++) {
      this.life[i] = this.ttl[i];
    }
  }

  /** Lanza un puñado de partículas desde un punto. */
  burst(
    x: number,
    y: number,
    z: number,
    color: number,
    options: BurstOptions = {}
  ): void {
    const count = options.count ?? 12;
    const speed = options.speed ?? 6;
    const ttl = options.ttl ?? 0.5;
    const spread = options.spread ?? 0.4;
    const lift = options.lift ?? 3;
    const tint = new THREE.Color(color);

    for (let n = 0; n < count; n++) {
      const index = this.cursor;
      this.cursor = (this.cursor + 1) % CAPACITY;
      const i3 = index * 3;

      this.positions[i3] = x + (Math.random() - 0.5) * spread;
      this.positions[i3 + 1] = y + (Math.random() - 0.5) * spread;
      this.positions[i3 + 2] = z + (Math.random() - 0.5) * spread;

      const theta = Math.random() * Math.PI * 2;
      const horizontal = Math.random() * speed * 0.7;
      this.velocities[i3] = Math.cos(theta) * horizontal;
      this.velocities[i3 + 1] = lift * (0.4 + Math.random() * 0.8);
      this.velocities[i3 + 2] = Math.sin(theta) * horizontal;

      this.baseColors[i3] = tint.r;
      this.baseColors[i3 + 1] = tint.g;
      this.baseColors[i3 + 2] = tint.b;
      this.colors[i3] = tint.r;
      this.colors[i3 + 1] = tint.g;
      this.colors[i3 + 2] = tint.b;

      this.life[index] = 0;
      this.ttl[index] = ttl * (0.7 + Math.random() * 0.6);
    }
  }

  update(dt: number): void {
    let anyAlive = false;

    for (let index = 0; index < CAPACITY; index++) {
      const remaining = this.ttl[index] - this.life[index];
      if (remaining <= 0) {
        continue;
      }
      anyAlive = true;

      const i3 = index * 3;
      this.life[index] += dt;

      this.velocities[i3 + 1] -= GRAVITY * dt;
      this.positions[i3] += this.velocities[i3] * dt;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * dt;

      const fade = Math.max(0, 1 - this.life[index] / this.ttl[index]);
      this.colors[i3] = this.baseColors[i3] * fade;
      this.colors[i3 + 1] = this.baseColors[i3 + 1] * fade;
      this.colors[i3 + 2] = this.baseColors[i3 + 2] * fade;
    }

    if (!anyAlive) {
      return;
    }
    (this.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.points.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }

  /** Textura suave generada a mano: sin canvas, funciona igual en cualquier entorno. */
  private static createSoftTexture(): THREE.DataTexture {
    const size = 16;
    const data = new Uint8Array(size * size * 4);
    const center = (size - 1) / 2;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const distance = Math.hypot(x - center, y - center) / center;
        const alpha = Math.max(0, 1 - distance);
        const i = (y * size + x) * 4;
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = Math.round(alpha * alpha * 255);
      }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.needsUpdate = true;
    return texture;
  }
}
