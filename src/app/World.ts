import type * as THREE from 'three';
import { PropField } from '../world/PropField';
import { planProps } from '../world/props';
import { cellToWorld, levelToWorldY } from '../world/heightmap';
import { PlayerUnit } from '../entities/PlayerUnit';
import { EnemyUnit } from '../entities/EnemyUnit';
import { Projectile3D } from '../entities/Projectile3D';
import { Pickup3D } from '../entities/Pickup3D';
import { PartyBotUnit } from '../entities/PartyBotUnit';
import { createUnitMesh } from '../entities/MeshFactory';
import { Hud } from '../ui/Hud';
import { SkillBar } from '../ui/SkillBar';
import { TalentPanel } from '../ui/TalentPanel';
import { InventoryPanel } from '../ui/InventoryPanel';
import { SavePanel } from '../ui/SavePanel';
import { SaveManager, type SaveData } from '../core/SaveManager';
import { applySaveToHero } from '../core/heroSave';
import { Fx } from '../systems/Fx';
import { CombatSystem } from '../systems/CombatSystem';
import { AISystem } from '../systems/AISystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { PartyAISystem } from '../systems/PartyAISystem';
import { PopulationSystem } from '../systems/PopulationSystem';
import { SkillSystem } from '../systems/SkillSystem';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { TalentSystem } from '../systems/TalentSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { LootSystem } from '../systems/LootSystem';
import { SKILLS } from '../data/skills';
import { ENEMIES } from '../data/enemies';
import { PARTY_BOTS } from '../data/bots';
import { getItem } from '../data/items';
import { PLAYER_RESPAWN_SECONDS, expToNext } from '../data/balance';
import { PROPS_SEED } from '../assets/manifest';
import {
  STARTER_SMITH,
  STARTER_SPAWN,
  STARTER_SPAWNS,
  STARTER_ZONE,
  regionAt,
} from '../data/zones';
import { TILE_SIZE } from '../config/constants';
import type { InputManager } from '../core/InputManager';
import type { Wc3Camera } from '../engine/Wc3Camera';
import type { WorldRefs } from '../entities/Unit';
import type { ModelProvider } from '../entities/ModelProvider';
import type { AnimationController } from '../entities/AnimationController';
import type { GodDef, ItemSlot, SkillDef, SpawnDef } from '../types';

const HP_REGEN_PER_SEC = 0.01;
const MP_REGEN_PER_SEC = 0.035;

/** Una partida en curso: héroe, enemigos, sistemas y su capa de UI. */
export class World {
  private readonly container: HTMLDivElement;
  private readonly fx: Fx;
  private readonly player: PlayerUnit;
  private readonly enemies: EnemyUnit[] = [];
  private readonly spawnSystem: SpawnSystem;
  private readonly hud: Hud;
  private readonly skillBar: SkillBar;
  private readonly talentPanel: TalentPanel;
  private readonly inventoryPanel: InventoryPanel;
  private readonly savePanel: SavePanel;
  private readonly smithButton: HTMLButtonElement;
  private readonly smith: { x: number; z: number };
  private readonly bots: PartyBotUnit[] = [];
  private readonly population: PopulationSystem;
  private readonly propField: PropField;

  private pickups: Pickup3D[] = [];
  private projectiles: Projectile3D[] = [];
  /** Mixers de enemigos que están muriendo: siguen avanzando hasta disolverse. */
  private readonly dyingAnimations: { controller: AnimationController; remaining: number }[] = [];
  private playerRespawnAt = 0;
  private notice = '';
  private fps = 0;
  private fpsAccum = 0;
  private fpsFrames = 0;
  private saveAccum = 0;
  private disposed = false;

  /** Los pone App: reiniciar con otro guardado, o volver al menú. */
  onRestart?: (save: SaveData) => void;
  onExit?: () => void;

  constructor(
    private readonly refs: WorldRefs,
    private readonly rig: Wc3Camera,
    uiHost: HTMLElement,
    private readonly input: InputManager,
    private readonly god: GodDef,
    save: SaveData | null,
    private readonly models: ModelProvider | null = null,
    propModels: Map<string, THREE.Object3D> = new Map()
  ) {
    this.container = document.createElement('div');
    this.container.className = 'world-ui';
    uiHost.appendChild(this.container);

    this.fx = new Fx(this.container, this.refs.root, this.rig);

    // Decoración del terreno, repartida de forma determinista y dejando libres los
    // sitios con contenido: inicio, herrería y puntos de aparición.
    this.propField = new PropField(
      this.refs.root,
      this.refs.nav,
      propModels,
      planProps(STARTER_ZONE, PROPS_SEED, [
        { col: STARTER_SPAWN.col, row: STARTER_SPAWN.row, radius: 3 },
        { col: STARTER_SMITH.col, row: STARTER_SMITH.row, radius: 2.5 },
        ...STARTER_SPAWNS.map((spawn) => ({ col: spawn.col, row: spawn.row, radius: 1.5 })),
      ])
    );

    const spawn = cellToWorld(STARTER_SPAWN.col, STARTER_SPAWN.row);
    this.player = new PlayerUnit(this.refs, spawn.x, spawn.z, god, models);
    this.player.setFacing(0, 1);
    this.player.onDeath = () => {
      this.playerRespawnAt = performance.now() + PLAYER_RESPAWN_SECONDS * 1000;
    };

    if (save) {
      applySaveToHero(this.player, save);
    }

    this.spawnSystem = new SpawnSystem(STARTER_SPAWNS, (def) => this.createEnemy(def));

    const smithCell = cellToWorld(STARTER_SMITH.col, STARTER_SMITH.row);
    this.smith = { x: smithCell.x, z: smithCell.z };
    const smithMesh = createUnitMesh({
      color: 0x9a8c6a,
      radius: 1.25,
      height: 3.2,
      markerColor: 0xc9b58a,
    });
    smithMesh.position.set(
      smithCell.x,
      levelToWorldY(this.refs.nav.levelAt(smithCell.x, smithCell.z)),
      smithCell.z
    );
    this.refs.root.add(smithMesh);

    const botSpots = [
      cellToWorld(STARTER_SPAWN.col - 1, STARTER_SPAWN.row),
      cellToWorld(STARTER_SPAWN.col + 1, STARTER_SPAWN.row),
    ];
    PARTY_BOTS.forEach((def, index) => {
      const spot = botSpots[index % botSpots.length];
      this.bots.push(new PartyBotUnit(this.refs, spot.x, spot.z, def, models));
    });
    this.population = new PopulationSystem(this.refs, this.rig, this.container, 6, models);

    this.hud = new Hud(this.container);
    this.skillBar = new SkillBar(
      this.container,
      this.player.skills.map((id) => SKILLS[id]),
      (id) => this.castSkill(id)
    );
    this.talentPanel = new TalentPanel(this.container, (id) => this.spendTalent(id));
    this.inventoryPanel = new InventoryPanel(
      this.container,
      (uid) => this.equipItem(uid),
      (slot) => this.unequipItem(slot)
    );
    this.savePanel = new SavePanel(this.container, [
      { label: 'Guardar ahora', onClick: () => this.saveNowAndReport() },
      { label: 'Exportar código de héroe', onClick: () => this.exportHero() },
      { label: 'Importar código de héroe', onClick: () => this.importHero() },
      { label: 'Borrar partida y volver al menú', onClick: () => this.deleteSave() },
    ]);

    this.smithButton = document.createElement('button');
    this.smithButton.type = 'button';
    this.smithButton.className = 'smith-button';
    this.smithButton.hidden = true;
    this.smithButton.addEventListener('click', () => this.trySmith());
    this.container.appendChild(this.smithButton);

    window.addEventListener('keydown', this.onKeyDown);
    // Guardar al cerrar la pestaña o la app; el autoguardado cubre el resto.
    window.addEventListener('beforeunload', this.onBeforeUnload);
    this.rig.snapTo(this.player.worldX, this.player.worldY, this.player.worldZ);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    for (const id of this.player.skills) {
      if (SKILLS[id].key.toLowerCase() === key) {
        this.castSkill(id);
        return;
      }
    }
    if (key === 't') {
      this.talentPanel.toggle(this.player);
    } else if (key === 'i') {
      this.inventoryPanel.toggle(this.player);
    } else if (key === 'g') {
      this.trySmith();
    } else if (key === 'o') {
      this.savePanel.toggle();
    }
  };

  private createEnemy(def: SpawnDef): EnemyUnit {
    const cell = cellToWorld(def.col, def.row);
    const enemy = new EnemyUnit(this.refs, cell.x, cell.z, ENEMIES[def.enemyId], this.models);
    enemy.onDeath = () => this.onEnemyDeath(enemy);
    this.enemies.push(enemy);
    return enemy;
  }

  private onEnemyDeath(enemy: EnemyUnit): void {
    ProgressionSystem.awardExp(this.player, enemy.def.expReward, this.fx);

    const loot = LootSystem.roll(enemy.def);
    this.player.gold += loot.gold;
    this.fx.floatingText(
      enemy.worldX,
      enemy.worldY + 2.4,
      enemy.worldZ,
      `+${loot.gold} oro`,
      '#ffd76a'
    );
    if (loot.itemId) {
      this.spawnPickup(enemy.worldX, enemy.worldZ, loot.itemId);
    }

    this.fx.ring(enemy.worldX, enemy.worldY, enemy.worldZ, 3.2, enemy.def.color, 0.35);

    const index = this.enemies.indexOf(enemy);
    if (index !== -1) {
      this.enemies.splice(index, 1);
    }

    // Con modelo se deja ver la animación de muerte antes de disolverlo; sin él, inmediato.
    if (enemy.animation) {
      this.dyingAnimations.push({ controller: enemy.animation, remaining: 0.8 });
      window.setTimeout(() => this.fx.dissolve(enemy.mesh, 0.35), 800);
    } else {
      this.fx.dissolve(enemy.mesh, 0.3);
    }

    if (this.talentPanel.isOpen()) {
      this.talentPanel.refresh(this.player);
    }
    if (this.inventoryPanel.isOpen()) {
      this.inventoryPanel.refresh(this.player);
    }
  }

  private spawnPickup(x: number, z: number, itemId: string): void {
    this.pickups.push(new Pickup3D(this.refs, x, z, getItem(itemId)));
  }

  private castSkill(id: string): void {
    const result = SkillSystem.cast(
      this.player,
      SKILLS[id],
      {
        enemies: this.enemies,
        spawnProjectile: (skill, damage, dir) => this.spawnProjectile(skill, damage, dir),
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

  private saveNow(): void {
    if (this.disposed) {
      return;
    }
    SaveManager.persist(SaveManager.capture(this.player, this.god.id));
  }

  private saveNowAndReport(): void {
    this.saveNow();
    this.savePanel.setStatus('Partida guardada');
  }

  private exportHero(): void {
    const code = SaveManager.exportCode(SaveManager.capture(this.player, this.god.id));
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).catch(() => undefined);
    }
    this.savePanel.setStatus(`Código copiado al portapapeles:\n${code}`);
  }

  private importHero(): void {
    const code = window.prompt('Pega el código de héroe:');
    if (!code) {
      return;
    }
    const loaded = SaveManager.importCode(code);
    if (!loaded) {
      this.savePanel.setStatus('Código inválido o corrupto');
      return;
    }
    SaveManager.persist(loaded);
    this.onRestart?.(loaded);
  }

  private deleteSave(): void {
    if (!window.confirm('¿Borrar la partida guardada y volver al menú?')) {
      return;
    }
    SaveManager.clear();
    this.onExit?.();
  }

  private readonly onBeforeUnload = (): void => {
    this.saveNow();
  };

  private equipItem(uid: string): void {
    InventorySystem.equip(this.player, uid);
    this.inventoryPanel.refresh(this.player);
  }

  private unequipItem(slot: ItemSlot): void {
    InventorySystem.unequip(this.player, slot);
    this.inventoryPanel.refresh(this.player);
  }

  private isNearSmith(): boolean {
    const dist = Math.hypot(this.player.worldX - this.smith.x, this.player.worldZ - this.smith.z);
    return dist <= STARTER_SMITH.radius * TILE_SIZE;
  }

  private smithSlot(): ItemSlot | null {
    if (this.player.equipped.weapon) {
      return 'weapon';
    }
    if (this.player.equipped.armor) {
      return 'armor';
    }
    return null;
  }

  private trySmith(): void {
    if (!this.player.isAlive) {
      return;
    }
    if (!this.isNearSmith()) {
      this.notice = 'No estás en la herrería';
      return;
    }
    const slot = this.smithSlot();
    if (!slot) {
      this.notice = 'No llevas equipo que mejorar';
      return;
    }

    const result = InventorySystem.upgrade(this.player, slot);
    if (result === 'poor') {
      this.notice = 'Oro insuficiente';
    } else {
      this.notice = `${slot === 'weapon' ? 'Arma' : 'Armadura'} mejorada`;
    }
    if (this.inventoryPanel.isOpen()) {
      this.inventoryPanel.refresh(this.player);
    }
  }

  update(dt: number): void {
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
        this.player.setFacing(
          target.worldX - this.player.worldX,
          target.worldZ - this.player.worldZ
        );
        CombatSystem.attack(this.player, target, this.fx);
      }
    }

    AISystem.update(dt, this.player, this.enemies, this.fx);
    PartyAISystem.update(dt, this.player, this.bots, this.enemies, this.fx);
    this.population.update(dt, now);

    // Con todo el movimiento ya resuelto, se elige animación de cada unidad.
    this.player.updateAnimation(dt);
    for (const enemy of this.enemies) {
      enemy.updateAnimation(dt);
    }
    for (const bot of this.bots) {
      bot.updateAnimation(dt);
    }

    for (let i = this.dyingAnimations.length - 1; i >= 0; i--) {
      const dying = this.dyingAnimations[i];
      dying.remaining -= dt;
      dying.controller.update(dt);
      if (dying.remaining <= 0) {
        this.dyingAnimations.splice(i, 1);
      }
    }

    for (const projectile of this.projectiles) {
      projectile.update(dt, this.enemies, this.fx);
    }
    this.projectiles = this.projectiles.filter((p) => !p.isDead);

    for (const pickup of this.pickups) {
      pickup.update(dt, this.player, this.fx);
    }
    const collected = this.pickups.some((p) => p.isCollected);
    this.pickups = this.pickups.filter((p) => !p.isCollected);
    if (collected && this.inventoryPanel.isOpen()) {
      this.inventoryPanel.refresh(this.player);
    }

    this.spawnSystem.update(now);
    this.fx.update(dt);

    // Autoguardado periódico.
    this.saveAccum += dt;
    if (this.saveAccum >= 15) {
      this.saveAccum = 0;
      this.saveNow();
    }

    this.updateFps(dt);
    this.player.updateBar(this.rig.camera);
    for (const enemy of this.enemies) {
      enemy.updateBar(this.rig.camera);
    }
    for (const bot of this.bots) {
      bot.updateBar(this.rig.camera);
    }
    this.rig.follow(this.player.worldX, this.player.worldY, this.player.worldZ, dt);

    this.skillBar.update(this.player, now);
    this.updateSmith();
    this.updateHud();
  }

  private updateSmith(): void {
    const near = this.player.isAlive && this.isNearSmith();
    this.smithButton.hidden = !near;

    if (!near) {
      return;
    }
    const slot = this.smithSlot();
    const cost = slot ? InventorySystem.getCostFor(this.player, slot) : null;
    this.smithButton.textContent = cost
      ? `HERRERÍA (G): mejorar ${slot === 'weapon' ? 'arma' : 'armadura'} · ${cost} oro`
      : 'HERRERÍA (G): no llevas equipo equipado';
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('beforeunload', this.onBeforeUnload);
    this.fx.dispose();
    this.player.dispose();
    for (const enemy of this.enemies) {
      enemy.dispose();
    }
    for (const bot of this.bots) {
      bot.dispose();
    }
    this.population.dispose();
    this.propField.dispose();
    this.enemies.length = 0;
    this.bots.length = 0;
    this.dyingAnimations.length = 0;
    this.projectiles = [];
    this.pickups = [];
    this.container.remove();
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
      ? `Oro: ${this.player.gold}   ·   Enemigos: ${alive}   ·   Talentos: ${this.player.talentPoints} (T)   ·   ${this.fps.toFixed(0)} fps` +
        (this.notice ? `\n${this.notice}` : '')
      : 'Has muerto — reapareciendo…';

    this.hud.update({
      title: `${this.god.name} · Nv ${this.player.level} · ${regionAt(row) || '—'} · celda ${col},${row}`,
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
