import { Renderer } from '../engine/Renderer';
import { SceneRoot } from '../engine/SceneRoot';
import { Wc3Camera } from '../engine/Wc3Camera';
import { Loop } from '../engine/Loop';
import { Zone } from '../world/Zone';
import { cellToWorld } from '../world/heightmap';
import { PlayerUnit } from '../entities/PlayerUnit';
import { EnemyUnit } from '../entities/EnemyUnit';
import { Projectile3D } from '../entities/Projectile3D';
import { InputManager } from '../core/InputManager';
import { Joystick } from '../ui/Joystick';
import { Hud } from '../ui/Hud';
import { SkillBar } from '../ui/SkillBar';
import { TalentPanel } from '../ui/TalentPanel';
import { Fx } from '../systems/Fx';
import { CombatSystem } from '../systems/CombatSystem';
import { AISystem } from '../systems/AISystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { SkillSystem } from '../systems/SkillSystem';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { TalentSystem } from '../systems/TalentSystem';
import { GODS } from '../data/gods';
import { SKILLS } from '../data/skills';
import { ENEMIES } from '../data/enemies';
import { PLAYER_RESPAWN_SECONDS, expToNext } from '../data/balance';
import { STARTER_SPAWN, STARTER_SPAWNS, STARTER_ZONE, regionAt } from '../data/zones';
import { TILE_SIZE } from '../config/constants';
import type { SkillDef, SpawnDef } from '../types';

const HP_REGEN_PER_SEC = 0.01;
const MP_REGEN_PER_SEC = 0.035;

export class App {
  private readonly renderer: Renderer;
  private readonly root: SceneRoot;
  private readonly rig: Wc3Camera;
  private readonly loop: Loop;
  private readonly zone: Zone;
  private readonly player: PlayerUnit;
  private readonly input: InputManager;
  private readonly fx: Fx;
  private readonly hud: Hud;
  private readonly skillBar: SkillBar;
  private readonly talentPanel: TalentPanel;
  private readonly spawnSystem: SpawnSystem;
  private readonly refs: { root: SceneRoot; nav: Zone['nav'] };
  private readonly enemies: EnemyUnit[] = [];
  private projectiles: Projectile3D[] = [];

  private playerRespawnAt = 0;
  private notice = '';
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

    this.hud = new Hud(uiHost);
    this.skillBar = new SkillBar(
      uiHost,
      this.player.skills.map((id) => SKILLS[id]),
      (id) => this.castSkill(id)
    );
    this.talentPanel = new TalentPanel(uiHost, (id) => this.spendTalent(id));

    this.bindKeys();

    this.rig.snapTo(this.player.worldX, this.player.worldY, this.player.worldZ);

    this.loop = new Loop((dt) => this.update(dt));
    this.loop.start();
  }

  private bindKeys(): void {
    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      for (const id of this.player.skills) {
        if (SKILLS[id].key.toLowerCase() === key) {
          this.castSkill(id);
          return;
        }
      }
      if (key === 't') {
        this.talentPanel.toggle(this.player);
      }
    });
  }

  private createEnemy(def: SpawnDef): EnemyUnit {
    const cell = cellToWorld(def.col, def.row);
    const enemy = new EnemyUnit(this.refs, cell.x, cell.z, ENEMIES[def.enemyId]);
    enemy.onDeath = () => this.onEnemyDeath(enemy);
    this.enemies.push(enemy);
    return enemy;
  }

  private onEnemyDeath(enemy: EnemyUnit): void {
    ProgressionSystem.awardExp(this.player, enemy.def.expReward, this.fx);
    this.fx.ring(enemy.worldX, enemy.worldY, enemy.worldZ, 3.2, enemy.def.color, 0.35);
    this.fx.dissolve(enemy.mesh, 0.3);

    const index = this.enemies.indexOf(enemy);
    if (index !== -1) {
      this.enemies.splice(index, 1);
    }

    if (this.talentPanel.isOpen()) {
      this.talentPanel.refresh(this.player);
    }
  }

  private castSkill(id: string): void {
    const skill = SKILLS[id];
    const result = SkillSystem.cast(
      this.player,
      skill,
      {
        enemies: this.enemies,
        spawnProjectile: (s, damage, dir) => this.spawnProjectile(s, damage, dir),
      },
      performance.now(),
      this.fx
    );

    if (result === 'mana') {
      this.notice = 'Sin maná';
    } else if (result === 'ok') {
      this.notice = '';
    }
  }

  private spawnProjectile(skill: SkillDef, damage: number, dir: { x: number; z: number }): void {
    this.projectiles.push(
      new Projectile3D(
        this.refs,
        this.player.worldX,
        this.player.worldZ,
        dir.x,
        dir.z,
        skill.projectileSpeed ?? 9,
        skill.projectileRange ?? 6,
        damage,
        skill.color
      )
    );
  }

  private spendTalent(id: string): void {
    TalentSystem.spend(this.player, id);
    this.talentPanel.refresh(this.player);
  }

  private update(dt: number): void {
    const now = performance.now();

    this.player.updateBuffs(now);

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

      this.regenerate(dt);

      const target = this.nearestEnemyInRange();
      if (target) {
        this.player.setFacing(target.worldX - this.player.worldX, target.worldZ - this.player.worldZ);
        CombatSystem.attack(this.player, target, this.fx);
      }
    }

    AISystem.update(dt, this.player, this.enemies, this.fx);

    for (const projectile of this.projectiles) {
      projectile.update(dt, this.enemies, this.fx);
    }
    this.projectiles = this.projectiles.filter((p) => !p.isDead);

    this.spawnSystem.update(now);
    this.fx.update(dt);

    this.updateFps(dt);
    this.player.updateBar(this.rig.camera);
    for (const enemy of this.enemies) {
      enemy.updateBar(this.rig.camera);
    }
    this.rig.follow(this.player.worldX, this.player.worldY, this.player.worldZ, dt);

    this.skillBar.update(this.player, now);
    this.updateHud();

    this.renderer.render(this.root.scene, this.rig.camera);
  }

  private regenerate(dt: number): void {
    const stats = this.player.stats;
    stats.hp = Math.min(stats.maxHp, stats.hp + stats.maxHp * HP_REGEN_PER_SEC * dt);
    stats.mp = Math.min(stats.maxMp, stats.mp + stats.maxMp * MP_REGEN_PER_SEC * dt);
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
    const stats = this.player.stats;
    const alive = this.enemies.filter((e) => e.isAlive).length;

    const status = this.player.isAlive
      ? `Enemigos: ${alive}   ·   Talentos: ${this.player.talentPoints} (T)   ·   ${this.fps.toFixed(0)} fps` +
        (this.notice ? `\n${this.notice}` : '')
      : 'Has muerto — reapareciendo…';

    this.hud.update({
      title: `${this.player.god.name} · Nv ${this.player.level} · ${regionAt(row) || '—'} · celda ${col},${row}`,
      hp: stats.hp,
      maxHp: stats.maxHp,
      mp: stats.mp,
      maxMp: stats.maxMp,
      exp: this.player.exp,
      expNext: expToNext(this.player.level),
      notice: status,
    });
  }
}
