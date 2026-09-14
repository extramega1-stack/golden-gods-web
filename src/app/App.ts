import { Renderer } from '../engine/Renderer';
import { SceneRoot } from '../engine/SceneRoot';
import { Wc3Camera } from '../engine/Wc3Camera';
import { Loop } from '../engine/Loop';
import { Zone } from '../world/Zone';
import { cellToWorld } from '../world/heightmap';
import { PlayerUnit } from '../entities/PlayerUnit';
import { EnemyUnit } from '../entities/EnemyUnit';
import { InputManager } from '../core/InputManager';
import { Joystick } from '../ui/Joystick';
import { Fx } from '../systems/Fx';
import { CombatSystem } from '../systems/CombatSystem';
import { AISystem } from '../systems/AISystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { GODS } from '../data/gods';
import { ENEMIES } from '../data/enemies';
import { PLAYER_RESPAWN_SECONDS } from '../data/balance';
import { STARTER_SPAWN, STARTER_SPAWNS, STARTER_ZONE, regionAt } from '../data/zones';
import { TILE_SIZE } from '../config/constants';
import type { SpawnDef } from '../types';

export class App {
  private readonly renderer: Renderer;
  private readonly root: SceneRoot;
  private readonly rig: Wc3Camera;
  private readonly loop: Loop;
  private readonly zone: Zone;
  private readonly player: PlayerUnit;
  private readonly input: InputManager;
  private readonly hud: HTMLElement;
  private readonly fx: Fx;
  private readonly spawnSystem: SpawnSystem;
  private readonly enemies: EnemyUnit[] = [];
  private readonly refs: { root: SceneRoot; nav: Zone['nav'] };

  private playerRespawnAt = 0;
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

    this.fx = new Fx(uiHost, this.root, this.rig);
    this.refs = { root: this.root, nav: this.zone.nav };

    const spawn = cellToWorld(STARTER_SPAWN.col, STARTER_SPAWN.row);
    this.player = new PlayerUnit(this.refs, spawn.x, spawn.z, GODS[0]);
    this.player.setFacing(0, 1);
    this.player.onDeath = () => {
      this.playerRespawnAt = performance.now() + PLAYER_RESPAWN_SECONDS * 1000;
    };

    this.spawnSystem = new SpawnSystem(STARTER_SPAWNS, (def) => this.createEnemy(def));
    this.input = new InputManager(new Joystick(uiHost));

    this.rig.snapTo(this.player.worldX, this.player.worldY, this.player.worldZ);

    this.loop = new Loop((dt) => this.update(dt));
    this.loop.start();
  }

  private createEnemy(def: SpawnDef): EnemyUnit {
    const cell = cellToWorld(def.col, def.row);
    const enemy = new EnemyUnit(this.refs, cell.x, cell.z, ENEMIES[def.enemyId]);
    enemy.onDeath = (unit) => this.onEnemyDeath(unit as EnemyUnit);
    this.enemies.push(enemy);
    return enemy;
  }

  private onEnemyDeath(enemy: EnemyUnit): void {
    this.fx.ring(enemy.worldX, enemy.worldY, enemy.worldZ, 3.2, 0x9a6ad8, 0.35);
    this.fx.dissolve(enemy.mesh, 0.3);
    const index = this.enemies.indexOf(enemy);
    if (index !== -1) {
      this.enemies.splice(index, 1);
    }
  }

  private update(dt: number): void {
    const now = performance.now();

    if (!this.player.isAlive) {
      if (now >= this.playerRespawnAt) {
        const spawn = cellToWorld(STARTER_SPAWN.col, STARTER_SPAWN.row);
        this.player.respawn(spawn.x, spawn.z);
      }
    } else {
      const move = this.input.getMoveVector();
      if (move.x !== 0 || move.y !== 0) {
        const dir = this.rig.groundDirection(move.x, move.y);
        this.player.setFacing(dir.x, dir.z);
        const step = this.player.worldSpeed * dt;
        this.player.moveWorld(dir.x * step, dir.z * step);
      }

      const target = this.nearestEnemyInRange();
      if (target) {
        this.player.setFacing(target.worldX - this.player.worldX, target.worldZ - this.player.worldZ);
        CombatSystem.attack(this.player, target, this.fx);
      }
    }

    AISystem.update(dt, this.player, this.enemies, this.fx);
    this.spawnSystem.update(now);
    this.fx.update(dt);

    this.updateFps(dt);
    this.player.updateBar(this.rig.camera);
    for (const enemy of this.enemies) {
      enemy.updateBar(this.rig.camera);
    }
    this.rig.follow(this.player.worldX, this.player.worldY, this.player.worldZ, dt);

    this.renderer.render(this.root.scene, this.rig.camera);
    this.updateHud();
  }

  private nearestEnemyInRange(): EnemyUnit | null {
    let best: EnemyUnit | null = null;
    let bestDist = this.player.attackRange;
    for (const enemy of this.enemies) {
      if (!enemy.isAlive) {
        continue;
      }
      const dist = Math.hypot(enemy.worldX - this.player.worldX, enemy.worldZ - this.player.worldZ);
      if (dist <= bestDist) {
        bestDist = dist;
        best = enemy;
      }
    }
    return best;
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
    const s = this.player.stats;
    const alive = this.enemies.filter((e) => e.isAlive).length;

    const status = this.player.isAlive
      ? `HP ${Math.ceil(s.hp)}/${s.maxHp} · enemigos ${alive}`
      : 'Has muerto — reapareciendo…';

    this.hud.textContent =
      `Fase 3 — combate\n` +
      `WASD/flechas o joystick para moverte · ataque automático\n` +
      `${this.player.god.name} · ${regionAt(row) || '—'} · celda ${col},${row} · altura ${this.player.terrainLevel}\n` +
      `${status}\n` +
      `${this.fps.toFixed(0)} fps`;
  }
}
