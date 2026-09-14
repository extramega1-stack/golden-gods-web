import { Renderer } from '../engine/Renderer';
import { SceneRoot } from '../engine/SceneRoot';
import { Wc3Camera } from '../engine/Wc3Camera';
import { Loop } from '../engine/Loop';
import { Zone } from '../world/Zone';
import { cellToWorld } from '../world/heightmap';
import { PlayerUnit } from '../entities/PlayerUnit';
import { InputManager } from '../core/InputManager';
import { Joystick } from '../ui/Joystick';
import { GODS } from '../data/gods';
import { STARTER_SPAWN, STARTER_ZONE, regionAt } from '../data/zones';
import { TILE_SIZE } from '../config/constants';

export class App {
  private readonly renderer: Renderer;
  private readonly root: SceneRoot;
  private readonly rig: Wc3Camera;
  private readonly loop: Loop;
  private readonly zone: Zone;
  private readonly player: PlayerUnit;
  private readonly input: InputManager;
  private readonly hud: HTMLElement;

  private fps = 0;
  private fpsAccum = 0;
  private fpsFrames = 0;

  constructor(container: HTMLElement) {
    this.renderer = new Renderer(container);
    this.root = new SceneRoot();
    this.rig = new Wc3Camera(this.renderer.aspect);
    window.addEventListener('resize', () => this.rig.setAspect(this.renderer.aspect));

    this.zone = new Zone(STARTER_ZONE);
    this.root.add(this.zone.mesh);

    const uiHost = document.getElementById('ui') ?? document.body;
    this.hud = document.createElement('div');
    this.hud.id = 'hud';
    uiHost.appendChild(this.hud);

    const spawn = cellToWorld(STARTER_SPAWN.col, STARTER_SPAWN.row);
    const refs = { root: this.root, nav: this.zone.nav };
    this.player = new PlayerUnit(refs, spawn.x, spawn.z, GODS[0]);
    this.player.setFacing(0, 1);

    this.input = new InputManager(new Joystick(uiHost));

    this.rig.snapTo(this.player.worldX, this.player.worldY, this.player.worldZ);

    this.loop = new Loop((dt) => this.update(dt));
    this.loop.start();
  }

  private update(dt: number): void {
    const move = this.input.getMoveVector();
    if (move.x !== 0 || move.y !== 0) {
      const dir = this.rig.groundDirection(move.x, move.y);
      this.player.setFacing(dir.x, dir.z);
      const step = this.player.worldSpeed * dt;
      this.player.moveWorld(dir.x * step, dir.z * step);
    }

    this.updateFps(dt);

    this.player.updateBar(this.rig.camera);
    this.rig.follow(this.player.worldX, this.player.worldY, this.player.worldZ, dt);

    this.renderer.render(this.root.scene, this.rig.camera);
    this.updateHud();
  }

  private updateFps(dt: number): void {
    this.fpsAccum += dt;
    this.fpsFrames += 1;
    if (this.fpsAccum >= 0.5) {
      this.fps = this.fpsFrames / this.fpsAccum;
      this.fpsAccum = 0;
      this.fpsFrames = 0;
    }
  }

  private updateHud(): void {
    const col = Math.floor(this.player.worldX / TILE_SIZE);
    const row = Math.floor(this.player.worldZ / TILE_SIZE);
    this.hud.textContent =
      `Fase 2 — héroe\n` +
      `WASD/flechas o joystick para moverte\n` +
      `${this.player.god.name} · ${regionAt(row) || '—'} · celda ${col},${row} · altura ${this.player.terrainLevel}\n` +
      `${this.fps.toFixed(0)} fps`;
  }
}
