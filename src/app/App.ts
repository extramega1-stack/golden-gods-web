import { Renderer } from '../engine/Renderer';
import { SceneRoot } from '../engine/SceneRoot';
import { Wc3Camera } from '../engine/Wc3Camera';
import { Loop } from '../engine/Loop';
import { Zone } from '../world/Zone';
import { cellToWorld, levelToWorldY } from '../world/heightmap';
import { InputManager } from '../core/InputManager';
import { Joystick } from '../ui/Joystick';
import { HeroSelect } from '../ui/HeroSelect';
import { World } from './World';
import { getGod } from '../data/gods';
import { STARTER_SPAWN, STARTER_ZONE } from '../data/zones';

const IDLE_ORBIT_RADIUS = 14;

/**
 * Orquesta motor y estados: menú de selección y partida. El terreno existe siempre y
 * sirve de fondo del menú; el mundo (héroe, enemigos, UI) se crea al elegir dios.
 */
export class App {
  private readonly renderer: Renderer;
  private readonly root: SceneRoot;
  private readonly rig: Wc3Camera;
  private readonly loop: Loop;
  private readonly zone: Zone;
  private readonly input: InputManager;
  private readonly uiHost: HTMLElement;

  private world: World | null = null;
  private idleTime = 0;
  private readonly spawn: { x: number; z: number };
  private readonly spawnY: number;

  constructor(container: HTMLElement) {
    this.renderer = new Renderer(container);
    this.root = new SceneRoot();
    this.rig = new Wc3Camera(this.renderer.aspect);
    window.addEventListener('resize', () => this.rig.setAspect(this.renderer.aspect));

    this.zone = new Zone(STARTER_ZONE);
    this.root.add(this.zone.mesh);

    this.uiHost = document.getElementById('ui') ?? document.body;
    this.input = new InputManager(new Joystick(this.uiHost));

    this.spawn = cellToWorld(STARTER_SPAWN.col, STARTER_SPAWN.row);
    this.spawnY = levelToWorldY(this.zone.nav.levelAt(this.spawn.x, this.spawn.z));
    this.rig.snapTo(this.spawn.x, this.spawnY, this.spawn.z);

    new HeroSelect(this.uiHost, (godId) => this.startGame(godId));

    this.loop = new Loop((dt) => this.update(dt));
    this.loop.start();
  }

  private startGame(godId: string): void {
    this.world?.dispose();
    this.world = new World(
      { root: this.root, nav: this.zone.nav },
      this.rig,
      this.uiHost,
      this.input,
      getGod(godId)
    );
  }

  private update(dt: number): void {
    if (this.world) {
      this.world.update(dt);
    } else {
      // Fondo del menú: la cámara deriva en círculo sobre el punto de inicio.
      this.idleTime += dt;
      const x = this.spawn.x + Math.cos(this.idleTime * 0.18) * IDLE_ORBIT_RADIUS;
      const z = this.spawn.z + Math.sin(this.idleTime * 0.18) * IDLE_ORBIT_RADIUS;
      this.rig.follow(x, levelToWorldY(this.zone.nav.levelAt(x, z)), z, dt);
    }

    this.renderer.render(this.root.scene, this.rig.camera);
  }
}
