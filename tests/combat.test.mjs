import {
  Zone,
  SceneRoot,
  Unit,
  EnemyUnit,
  CombatSystem,
  AISystem,
  SpawnSystem,
  ENEMIES,
  cellToWorld,
  STARTER_ZONE,
  TILE_SIZE,
  THREE,
} from './.bundle/entry.mjs';

const results = {};
const check = (name, value) => {
  results[name] = value === true;
};

const root = new SceneRoot();
const zone = new Zone(STARTER_ZONE);
const refs = { root, nav: zone.nav };

const makeStats = (over = {}) => ({
  maxHp: 100,
  hp: 100,
  maxMp: 50,
  mp: 50,
  attack: 12,
  defense: 3,
  attackRange: 2,
  attackCooldown: 1,
  moveSpeed: 4,
  ...over,
});
const makeUnit = (col, row, over) => {
  const cell = cellToWorld(col, row);
  return new Unit(refs, cell.x, cell.z, new THREE.Group(), 4, makeStats(over));
};

// --- Daño y mitigación ---
const attacker = makeUnit(5, 5, { attack: 12 });
const defender = makeUnit(6, 5, { defense: 3 });
CombatSystem.attack(attacker, defender);
check('el daño se mitiga con la defensa', defender.stats.hp === 100 - 9);

// --- Cooldown ---
const rateLimited = CombatSystem.attack(attacker, defender);
check('el segundo ataque inmediato no pasa el cooldown', rateLimited === false && defender.stats.hp === 91);

// --- Daño mínimo ---
const weak = makeUnit(5, 6, { attack: 1 });
const tanky = makeUnit(6, 6, { defense: 99 });
CombatSystem.attack(weak, tanky);
check('siempre se hace al menos daño mínimo', tanky.stats.hp === 100 - 1);

// --- Muerte ---
let died = false;
const victim = makeUnit(7, 6, { maxHp: 5, hp: 5 });
victim.onDeath = () => {
  died = true;
};
// Atacante propio: `weak` ya está en cooldown y hace demasiado poco daño.
const killer = makeUnit(8, 6, { attack: 10 });
CombatSystem.attack(killer, victim);
check('al llegar a 0 de vida la unidad muere', victim.stats.hp === 0 && !victim.isAlive && died);
check('una unidad muerta ya no recibe daño', victim.takeDamage(10) === 0);

// --- Derivación de datos del enemigo ---
const slimeCell = cellToWorld(6, 7);
const slime = new EnemyUnit(refs, slimeCell.x, slimeCell.z, ENEMIES.slime);
check('el enemigo arranca con la vida de su dato', slime.stats.hp === ENEMIES.slime.stats.maxHp);
check(
  'alcance y aggro pasan de celdas a unidades de mundo',
  Math.abs(slime.attackRange - ENEMIES.slime.stats.attackRange * TILE_SIZE) < 1e-9 &&
    Math.abs(slime.aggroRange - ENEMIES.slime.aggroRange * TILE_SIZE) < 1e-9
);

// --- IA: persigue y luego ataca ---
const hero = makeUnit(10, 10, { moveSpeed: 0 });
const farCell = cellToWorld(12, 10);
const chaser = new EnemyUnit(refs, farCell.x, farCell.z, ENEMIES.slime);
const distBefore = Math.hypot(chaser.worldX - hero.worldX, chaser.worldZ - hero.worldZ);
AISystem.update(0.2, hero, [chaser]);
const distAfter = Math.hypot(chaser.worldX - hero.worldX, chaser.worldZ - hero.worldZ);
check('el enemigo se acerca si estás en su radio de aggro', distAfter < distBefore);

const closeCell = cellToWorld(10, 11);
const biter = new EnemyUnit(refs, closeCell.x, closeCell.z, ENEMIES.slime);
const hpBefore = hero.stats.hp;
AISystem.update(0.1, hero, [biter]);
check('el enemigo pega cuando estás en su alcance', hero.stats.hp < hpBefore);

// Un héroe muerto no es atacado ni perseguido
hero.stats.hp = 0;
hero.isAlive = false;
const hpDead = hero.stats.hp;
check('sin héroe vivo la IA no hace nada', AISystem.update(0.1, hero, [biter]) === undefined && hero.stats.hp === hpDead);

// --- Apariciones y respawn ---
const spawns = [{ id: 't', col: 4, row: 4, enemyId: 'slime', respawnSeconds: 5 }];
const created = [];
const system = new SpawnSystem(spawns, (def) => {
  const cell = cellToWorld(def.col, def.row);
  const enemy = new EnemyUnit(refs, cell.x, cell.z, ENEMIES[def.enemyId]);
  created.push(enemy);
  return enemy;
});

system.update(1000);
check('la aparición crea el enemigo', system.active === 1);

const spawned = created[0];
spawned.stats.hp = 0;
spawned.die();
check('sin vida la aparición queda libre', system.active === 0);

system.update(2000);
check('no reaparece antes de tiempo', system.active === 0);

system.update(2000 + 5000);
check('reaparece pasado su tiempo', system.active === 1 && created.length === 2);

let ok = true;
for (const [name, value] of Object.entries(results)) {
  console.log(`${value ? 'PASS' : 'FAIL'}  ${name}`);
  if (!value) ok = false;
}
process.exit(ok ? 0 : 1);
