import Phaser from 'phaser';
import { MapLoader } from '../world/MapLoader';
import { Player } from '../entities/Player';
import { Enemy, enemyTextureKey } from '../entities/Enemy';
import { Projectile, PROJECTILE_TEXTURE } from '../entities/Projectile';
import { Pickup, pickupTextureKey } from '../entities/Pickup';
import { PartyBot } from '../entities/PartyBot';
import { POP_TEXTURE } from '../entities/PopulationHero';
import type { Actor } from '../entities/Actor';
import { InputManager } from '../core/InputManager';
import { Joystick } from '../ui/Joystick';
import { SkillBar } from '../ui/SkillBar';
import { TalentPanel } from '../ui/TalentPanel';
import { InventoryPanel } from '../ui/InventoryPanel';
import { SavePanel } from '../ui/SavePanel';
import { SaveManager, type SaveData } from '../core/SaveManager';
import { makeCircle } from '../world/textures';
import { depthFor, screenDirToWorldDir, worldToScreen } from '../world/iso';
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
import { EVENTS } from '../core/events';
import { ENEMIES } from '../data/enemies';
import { PARTY_BOTS, botTextureKey } from '../data/bots';
import { SKILLS } from '../data/skills';
import { TALENTS } from '../data/talents';
import { getGod, playerTextureKey } from '../data/gods';
import { getItem } from '../data/items';
import { PLAYER_RESPAWN_SECONDS, expToNext } from '../data/balance';
import { STARTER_SMITH, STARTER_SPAWN, STARTER_SPAWNS, STARTER_ZONE, regionAt } from '../data/zones';
import type { ItemSlot, SkillDef, SpawnDef, Vec2 } from '../types';

const HP_REGEN_PER_SEC = 0.01;
const MP_REGEN_PER_SEC = 0.035;
const PICKUP_RADIUS = 0.7;
const SMITH_NPC_TEXTURE = 'npc-smith';

interface HudButton {
  bg: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
}

export class WorldScene extends Phaser.Scene {
  private gameMap!: MapLoader;
  private player!: Player;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private pickups: Pickup[] = [];
  private bots: PartyBot[] = [];
  private population!: PopulationSystem;
  private controls!: InputManager;
  private joystick?: Joystick;
  private spawnSystem!: SpawnSystem;
  private skillBar!: SkillBar;
  private talentPanel!: TalentPanel;
  private inventoryPanel!: InventoryPanel;
  private savePanel!: SavePanel;
  private hudText!: Phaser.GameObjects.Text;
  private hudButtons: HudButton[] = [];
  private playerRespawnAt = 0;
  private godId = 'aureon';
  private loadFromSave = false;

  constructor() {
    super('World');
  }

  init(data: { godId?: string; load?: boolean }): void {
    if (data.godId) {
      this.godId = data.godId;
    }
    this.loadFromSave = data.load === true;
    this.hudButtons = [];
  }

  create(): void {
    const god = getGod(this.godId);
    makeCircle(this, playerTextureKey(god.id), 14, god.color, 0x000000);
    makeCircle(this, PROJECTILE_TEXTURE, 6, 0xffffff);
    makeCircle(this, SMITH_NPC_TEXTURE, 15, 0x9a8c6a, 0x000000);
    makeCircle(this, POP_TEXTURE, 11, 0xffffff);
    for (const bot of PARTY_BOTS) {
      makeCircle(this, botTextureKey(bot.id), 12, bot.color, 0x000000);
    }

    this.gameMap = new MapLoader(this, STARTER_ZONE);
    this.player = new Player(this, STARTER_SPAWN.x, STARTER_SPAWN.y, god);

    if (this.loadFromSave) {
      const save = SaveManager.load();
      if (save) {
        this.applySave(save);
      } else {
        SaveManager.clear();
      }
    } else {
      SaveManager.clear();
    }
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.bots = [
      new PartyBot(this, 14.5, 4.5, PARTY_BOTS[0]),
      new PartyBot(this, 16.5, 4.5, PARTY_BOTS[1]),
    ];
    this.population = new PopulationSystem(this, this.gameMap, 6);
    this.spawnSystem = new SpawnSystem(STARTER_SPAWNS, (def) => this.createEnemy(def));
    this.controls = new InputManager(this);

    if (this.sys.game.device.input.touch) {
      this.joystick = new Joystick(this);
    }

    this.createSmith();

    const bounds = this.gameMap.getScreenBounds();
    this.cameras.main.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.hudText = this.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#e8d9a0',
        lineSpacing: 3,
      })
      .setScrollFactor(0)
      .setDepth(200000);

    this.skillBar = new SkillBar(
      this,
      this.player.skills.map((id) => SKILLS[id]),
      (id) => this.castSkill(id)
    );

    this.talentPanel = new TalentPanel(this, TALENTS, (id) => this.spendTalent(id));
    this.talentPanel.setPlayer(this.player);

    this.inventoryPanel = new InventoryPanel(
      this,
      (uid) => this.equipItem(uid),
      (slot) => this.unequipItem(slot)
    );
    this.inventoryPanel.setPlayer(this.player);

    this.savePanel = new SavePanel(this, [
      { label: 'Guardar ahora', onClick: () => this.saveNowAndReport() },
      { label: 'Exportar código de héroe', onClick: () => this.exportHero() },
      { label: 'Importar código de héroe', onClick: () => this.importHero() },
      { label: 'Borrar partida guardada', onClick: () => this.deleteSave() },
    ]);

    this.makeHudButton('TALENTOS (T)', () => this.talentPanel.toggle(this.player));
    this.makeHudButton('EQUIPO (I)', () => this.inventoryPanel.toggle(this.player));
    this.makeHudButton('HERRERÍA (G)', () => this.trySmith());
    this.makeHudButton('PARTIDA (O)', () => this.savePanel.toggle());

    const keyboard = this.input.keyboard;
    if (keyboard) {
      for (const id of this.player.skills) {
        const skill = SKILLS[id];
        keyboard.on(`keydown-${skill.key}`, () => this.castSkill(id));
      }
      keyboard.on('keydown-T', () => this.talentPanel.toggle(this.player));
      keyboard.on('keydown-I', () => this.inventoryPanel.toggle(this.player));
      keyboard.on('keydown-G', () => this.trySmith());
      keyboard.on('keydown-O', () => this.savePanel.toggle());
    }

    this.events.on(EVENTS.ActorDied, this.onActorDied, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(EVENTS.ActorDied, this.onActorDied, this);
      this.saveNow();
    });

    this.time.addEvent({ delay: 15000, loop: true, callback: () => this.saveNow() });

    this.layoutHud();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layoutHud, this);
  }

  private createSmith(): void {
    const p = worldToScreen(STARTER_SMITH.x, STARTER_SMITH.y);
    this.add
      .sprite(p.x, p.y, SMITH_NPC_TEXTURE)
      .setOrigin(0.5, 0.9)
      .setDepth(depthFor(STARTER_SMITH.x, STARTER_SMITH.y));
    this.add
      .text(p.x, p.y - 40, 'Herrería', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#e8d9a0',
      })
      .setOrigin(0.5, 1)
      .setDepth(depthFor(STARTER_SMITH.x, STARTER_SMITH.y) + 1);
  }

  private makeHudButton(label: string, onClick: () => void): void {
    const bg = this.add
      .rectangle(0, 0, 124, 28, 0x2a2438, 0.9)
      .setStrokeStyle(2, 0x8a7a3f)
      .setScrollFactor(0)
      .setDepth(200000)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(0, 0, label, { fontFamily: 'monospace', fontSize: '11px', color: '#e8d9a0' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200001);
    bg.on('pointerdown', onClick);
    this.hudButtons.push({ bg, text });
  }

  private layoutHud(): void {
    const { width } = this.scale;
    this.hudText.setPosition(12, 10);
    this.hudButtons.forEach((button, i) => {
      const y = 26 + i * 36;
      button.bg.setPosition(width - 72, y);
      button.text.setPosition(width - 72, y);
    });
  }

  private createEnemy(def: SpawnDef): Enemy {
    const enemyDef = ENEMIES[def.enemyId];
    makeCircle(this, enemyTextureKey(enemyDef), enemyDef.radiusPx, enemyDef.color, 0x000000);
    const enemy = new Enemy(this, def.x, def.y, enemyDef);
    this.enemies.push(enemy);
    return enemy;
  }

  private onActorDied(actor: Actor): void {
    if (actor instanceof Enemy) {
      const ex = actor.x;
      const ey = actor.y;
      ProgressionSystem.awardExp(this.player, actor.def.expReward);
      const loot = LootSystem.roll(actor.def);
      this.player.gold += loot.gold;
      CombatSystem.floatingText(this, ex, ey, `+${loot.gold} oro`, '#ffd76a');
      if (loot.itemId) {
        this.spawnPickup(actor.worldX, actor.worldY, loot.itemId);
      }
      this.enemies = this.enemies.filter((e) => e !== actor);
      actor.setVisible(true);
      this.tweens.add({
        targets: actor,
        alpha: 0,
        scale: actor.scale * 1.25,
        duration: 220,
        onComplete: () => actor.destroy(),
      });
      return;
    }
    if (actor === this.player) {
      this.playerRespawnAt = this.time.now + PLAYER_RESPAWN_SECONDS * 1000;
    }
  }

  private spawnPickup(wx: number, wy: number, itemId: string): void {
    const def = getItem(itemId);
    makeCircle(this, pickupTextureKey(itemId), 7, def.color, 0x000000);
    this.pickups.push(new Pickup(this, wx, wy, def));
  }

  private collectPickups(): void {
    for (const pickup of this.pickups) {
      if (pickup.isCollected) {
        continue;
      }
      const dist = Math.hypot(
        pickup.worldX - this.player.worldX,
        pickup.worldY - this.player.worldY
      );
      if (dist <= PICKUP_RADIUS) {
        InventorySystem.addItem(this.player, pickup.itemId);
        CombatSystem.floatingText(this, pickup.x, pickup.y, getItem(pickup.itemId).name, '#c9ffd0');
        pickup.collect();
      }
    }
    this.pickups = this.pickups.filter((p) => !p.isCollected);
  }

  private castSkill(id: string): void {
    if (!this.player.isAlive) {
      return;
    }
    const skill = SKILLS[id];
    const result = SkillSystem.cast(
      this.player,
      skill,
      {
        enemies: this.enemies,
        map: this.gameMap,
        spawnProjectile: (s, damage, dir) => this.spawnProjectile(s, damage, dir),
      },
      this.time.now
    );
    if (result === 'mana') {
      CombatSystem.floatingText(
        this,
        this.player.x,
        this.player.y - this.player.height,
        'Sin maná',
        '#ff8a8a'
      );
    }
  }

  private spawnProjectile(skill: SkillDef, damage: number, dir: Vec2): void {
    const projectile = new Projectile(
      this,
      this.player.worldX,
      this.player.worldY,
      dir,
      skill.projectileSpeed ?? 9,
      skill.projectileRange ?? 6,
      damage,
      skill.color
    );
    this.projectiles.push(projectile);
  }

  private spendTalent(id: string): void {
    TalentSystem.spend(this.player, id);
  }

  private saveNow(): void {
    if (!this.player) {
      return;
    }
    SaveManager.persist(SaveManager.capture(this.player, this.godId));
  }

  private saveNowAndReport(): void {
    this.saveNow();
    this.savePanel.setStatus('Partida guardada');
  }

  private applySave(save: SaveData): void {
    const p = this.player;
    p.level = save.level;
    p.exp = save.exp;
    p.gold = save.gold;
    p.talentPoints = save.talentPoints;

    for (const key of Object.keys(save.talentRanks)) {
      p.talentRanks[key] = save.talentRanks[key];
    }

    p.inventory.length = 0;
    for (const item of save.inventory) {
      p.inventory.push({ ...item });
    }
    p.equipped.weapon = save.equipped.weapon ? { ...save.equipped.weapon } : null;
    p.equipped.armor = save.equipped.armor ? { ...save.equipped.armor } : null;

    InventorySystem.reseed([
      ...p.inventory,
      ...(p.equipped.weapon ? [p.equipped.weapon] : []),
      ...(p.equipped.armor ? [p.equipped.armor] : []),
    ]);

    ProgressionSystem.recompute(p, true);
    p.setWorldPos(save.x, save.y);
  }

  private exportHero(): void {
    const code = SaveManager.exportCode(SaveManager.capture(this.player, this.godId));
    this.copyToClipboard(code);
    this.savePanel.setStatus(`Código copiado al portapapeles:\n${code}`);
  }

  private importHero(): void {
    const code = window.prompt('Pega el código de héroe:');
    if (!code) {
      return;
    }
    const save = SaveManager.importCode(code);
    if (!save) {
      this.savePanel.setStatus('Código inválido o corrupto');
      return;
    }
    SaveManager.persist(save);
    this.scene.start('World', { godId: save.godId, load: true });
  }

  private deleteSave(): void {
    if (!window.confirm('¿Borrar la partida guardada?')) {
      return;
    }
    SaveManager.clear();
    this.scene.start('HeroSelect');
  }

  private copyToClipboard(text: string): void {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => undefined);
    }
  }

  private equipItem(uid: string): void {
    InventorySystem.equip(this.player, uid);
  }

  private unequipItem(slot: ItemSlot): void {
    InventorySystem.unequip(this.player, slot);
  }

  private isNearSmith(): boolean {
    const dist = Math.hypot(
      this.player.worldX - STARTER_SMITH.x,
      this.player.worldY - STARTER_SMITH.y
    );
    return dist <= STARTER_SMITH.radius;
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
      this.smithMessage('No estás en la herrería');
      return;
    }
    const slot = this.smithSlot();
    if (!slot) {
      this.smithMessage('No llevas equipo que mejorar');
      return;
    }
    const result = InventorySystem.upgrade(this.player, slot);
    if (result === 'poor') {
      this.smithMessage('Oro insuficiente');
    } else {
      this.smithMessage(`${slot === 'weapon' ? 'Arma' : 'Armadura'} mejorada`);
    }
  }

  private smithMessage(text: string): void {
    CombatSystem.floatingText(this, this.player.x, this.player.y - 34, text, '#ffe58a');
  }

  override update(_time: number, delta: number): void {
    const time = this.time.now;
    const dt = Math.min(delta, 50) / 1000;

    this.player.updateBuffs(time);

    if (!this.player.isAlive) {
      if (time >= this.playerRespawnAt) {
        this.player.respawn(STARTER_SPAWN.x, STARTER_SPAWN.y);
      }
    } else {
      let move = this.controls.getMoveVector();
      const joy = this.joystick?.getVector();
      if (joy && (joy.x !== 0 || joy.y !== 0)) {
        move = joy;
      }

      if (move.x !== 0 || move.y !== 0) {
        const dir = screenDirToWorldDir(move.x, move.y);
        this.player.facing = dir;
        this.player.moveWorld(
          dir.x * this.player.stats.moveSpeed * dt,
          dir.y * this.player.stats.moveSpeed * dt,
          this.gameMap
        );
      }

      this.regenerate(dt);
      this.collectPickups();

      const target = this.nearestEnemyInRange();
      if (target) {
        CombatSystem.attack(this.player, target);
      }
    }

    AISystem.update(dt, this.player, this.enemies, this.gameMap);
    PartyAISystem.update(dt, this.player, this.bots, this.enemies, this.gameMap);
    this.population.update(dt, time);

    for (const projectile of this.projectiles) {
      projectile.update(dt, this.enemies, this.gameMap);
    }
    this.projectiles = this.projectiles.filter((p) => !p.isDead);

    this.spawnSystem.update(time);
    this.skillBar.update(this.player, time);
    this.updateHud(time);
  }

  private regenerate(dt: number): void {
    const s = this.player.stats;
    s.hp = Math.min(s.maxHp, s.hp + s.maxHp * HP_REGEN_PER_SEC * dt);
    s.mp = Math.min(s.maxMp, s.mp + s.maxMp * MP_REGEN_PER_SEC * dt);
  }

  private nearestEnemyInRange(): Enemy | null {
    let best: Enemy | null = null;
    let bestDist = this.player.stats.attackRange;
    for (const enemy of this.enemies) {
      if (!enemy.isAlive) {
        continue;
      }
      const dist = Math.hypot(
        enemy.worldX - this.player.worldX,
        enemy.worldY - this.player.worldY
      );
      if (dist <= bestDist) {
        bestDist = dist;
        best = enemy;
      }
    }
    return best;
  }

  private updateHud(time: number): void {
    const hint = this.sys.game.device.input.touch
      ? 'Joystick abajo-izq · toca las habilidades'
      : 'WASD/flechas · Q/E/R skills · T talentos · I equipo · G herrería · O partida';

    let status: string;
    if (!this.player.isAlive) {
      const remaining = Math.max(0, (this.playerRespawnAt - time) / 1000);
      status = `Has muerto — reapareciendo en ${remaining.toFixed(1)}s`;
    } else {
      const s = this.player.stats;
      const alive = this.enemies.filter((e) => e.isAlive).length;
      status =
        `Nv ${this.player.level}  EXP ${this.player.exp}/${expToNext(this.player.level)}  Oro ${this.player.gold}\n` +
        `HP ${Math.ceil(s.hp)}/${s.maxHp}  MP ${Math.ceil(s.mp)}/${s.maxMp}  ATQ ${s.attack}  DEF ${s.defense}\n` +
        `Puntos: ${this.player.talentPoints}   ·   Enemigos: ${alive}`;

      if (this.isNearSmith()) {
        const slot = this.smithSlot();
        const cost = slot ? InventorySystem.getCostFor(this.player, slot) : null;
        status += cost
          ? `\nHerrería: G mejora ${slot === 'weapon' ? 'el arma' : 'la armadura'} (${cost} oro)`
          : '\nHerrería: no llevas equipo equipado';
      }
    }

    const region = regionAt(Math.floor(this.player.worldY));
    const place = region ? `${region} · ` : '';
    this.hudText.setText(`${this.player.god.name} — ${place}${hint}\n${status}`);
  }
}
