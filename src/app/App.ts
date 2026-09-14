import * as THREE from 'three';
import { Renderer } from '../engine/Renderer';
import { SceneRoot } from '../engine/SceneRoot';
import { Wc3Camera } from '../engine/Wc3Camera';
import { Loop } from '../engine/Loop';
import { Zone } from '../world/Zone';
import { cellToWorld, clampToMap, levelToWorldY } from '../world/heightmap';
import { STARTER_SPAWN, STARTER_ZONE, regionAt } from '../data/zones';
import { TILE_SIZE } from '../config/constants';

const PAN_SPEED = 26;

export class App {
  private readonly renderer: Renderer;
  private readonly root: SceneRoot;
  private readonly rig: Wc3Camera;
  private readonly loop: Loop;
  private readonly zone: Zone;
  private readonly keys = new Set<string>();
  private readonly focus: { x: number; z: number };
  private readonly hint: HTMLElement;

  constructor(container: HTMLElement) {
    this.renderer = new Renderer(container);
    this.root = new SceneRoot();
    this.rig = new Wc3Camera(this.renderer.aspect);
    window.addEventListener('resize', () => this.rig.setAspect(this.renderer.aspect));

    this.zone = new Zone(STARTER_ZONE);
    this.root.add(this.zone.mesh);

    const spawn = cellToWorld(STARTER_SPAWN.col, STARTER_SPAWN.row);
    this.focus = { x: spawn.x, z: spawn.z };

    const spawnY = levelToWorldY(this.zone.nav.levelAt(spawn.x, spawn.z));
    const marker = new THREE.Mesh(
      new THREE.ConeGeometry(1.1, 3, 6),
      new THREE.MeshLambertMaterial({ color: 0xe8d9a0 })
    );
    marker.position.set(spawn.x, spawnY + 1.5, spawn.z);
    this.root.add(marker);

    this.rig.snapTo(spawn.x, spawnY, spawn.z);

    this.hint = this.createHint();

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    this.loop = new Loop((dt) => this.update(dt));
    this.loop.start();
  }

  private createHint(): HTMLElement {
    const host = document.getElementById('ui') ?? document.body;
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.top = '10px';
    el.style.left = '12px';
    el.style.fontSize = '13px';
    el.style.lineHeight = '1.5';
    el.style.textShadow = '0 1px 2px #000';
    host.appendChild(el);
    return el;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.key.toLowerCase());
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key.toLowerCase());
  };

  private update(dt: number): void {
    // Cámara de prueba: se sustituye por el héroe en la fase 2.
    let mx = 0;
    let mz = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) {
      mx -= 1;
      mz -= 1;
    }
    if (this.keys.has('s') || this.keys.has('arrowdown')) {
      mx += 1;
      mz += 1;
    }
    if (this.keys.has('a') || this.keys.has('arrowleft')) {
      mx -= 1;
      mz += 1;
    }
    if (this.keys.has('d') || this.keys.has('arrowright')) {
      mx += 1;
      mz -= 1;
    }

    if (mx !== 0 || mz !== 0) {
      const len = Math.hypot(mx, mz);
      this.focus.x += (mx / len) * PAN_SPEED * dt;
      this.focus.z += (mz / len) * PAN_SPEED * dt;
      const clamped = clampToMap(this.focus.x, this.focus.z, this.zone.width, this.zone.depth);
      this.focus.x = clamped.x;
      this.focus.z = clamped.z;
    }

    const y = levelToWorldY(this.zone.nav.levelAt(this.focus.x, this.focus.z));
    this.rig.follow(this.focus.x, y, this.focus.z, dt);

    const col = Math.floor(this.focus.x / TILE_SIZE);
    const row = Math.floor(this.focus.z / TILE_SIZE);
    const walkable = this.zone.nav.isWalkablePoint(this.focus.x, this.focus.z) ? 'sí' : 'no';
    this.hint.textContent =
      `Fase 1 — terreno 3D\n` +
      `WASD/flechas: mover la cámara\n` +
      `${regionAt(row) || '—'} · celda ${col},${row} · altura ${this.zone.nav.levelAt(this.focus.x, this.focus.z)} · transitable: ${walkable}`;

    this.renderer.render(this.root.scene, this.rig.camera);
  }
}
