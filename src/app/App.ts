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
import { AssetLoader } from '../assets/AssetLoader';
import { ALL_MODEL_IDS } from '../assets/manifest';
import { getGod } from '../data/gods';
import { SaveManager, type SaveData } from '../core/SaveManager';
import { STARTER_SPAWN, STARTER_ZONE } from '../data/zones';
import type { WorldRefs } from '../entities/Unit';

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
  private readonly refs: WorldRefs;
  private readonly loader = new AssetLoader();

  private world: World | null = null;
  private menu: HeroSelect | null = null;
  private loading: HTMLDivElement | null = null;
  private starting = false;
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
    this.refs = { root: this.root, nav: this.zone.nav };

    this.uiHost = document.getElementById('ui') ?? document.body;
    this.input = new InputManager(new Joystick(this.uiHost));

    // Se van cargando mientras el jugador mira el menú.
    void this.loader.preload(ALL_MODEL_IDS);

    this.spawn = cellToWorld(STARTER_SPAWN.col, STARTER_SPAWN.row);
    this.spawnY = levelToWorldY(this.zone.nav.levelAt(this.spawn.x, this.spawn.z));
    this.rig.snapTo(this.spawn.x, this.spawnY, this.spawn.z);

    this.showMenu();

    this.loop = new Loop((dt) => this.update(dt));
    this.loop.start();
  }

  private showMenu(): void {
    const save = SaveManager.load();
    this.menu = new HeroSelect(
      this.uiHost,
      (godId) => void this.startGame(godId, null),
      save,
      () => {
        if (save) {
          void this.startGame(save.godId, save);
        }
      }
    );
  }

  private async startGame(godId: string, save: SaveData | null): Promise<void> {
    if (this.starting) {
      return;
    }
    this.starting = true;

    try {
      if (!ALL_MODEL_IDS.every((id) => this.loader.isReady(id))) {
        this.showLoading();
        await this.loader.preload(ALL_MODEL_IDS);
      }
    } finally {
      this.hideLoading();
    }

    this.menu?.hide();
    this.menu = null;
    this.world?.dispose();

    // Empezar de cero descarta la partida anterior.
    if (!save) {
      SaveManager.clear();
    }

    const world = new World(
      this.refs,
      this.rig,
      this.uiHost,
      this.input,
      getGod(godId),
      save,
      this.loader
    );
    world.onRestart = (loaded) => void this.startGame(loaded.godId, loaded);
    world.onExit = () => this.returnToMenu();
    this.world = world;
    this.starting = false;
  }

  private returnToMenu(): void {
    this.world?.dispose();
    this.world = null;
    this.idleTime = 0;
    this.showMenu();
  }

  private showLoading(): void {
    if (this.loading) {
      return;
    }
    const el = document.createElement('div');
    el.id = 'loading';
    el.textContent = 'Cargando modelos…';
    this.uiHost.appendChild(el);
    this.loading = el;
  }

  private hideLoading(): void {
    this.loading?.remove();
    this.loading = null;
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
