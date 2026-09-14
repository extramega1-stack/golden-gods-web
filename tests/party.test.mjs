import {
  Zone,
  SceneRoot,
  PlayerUnit,
  EnemyUnit,
  PartyBotUnit,
  PartyAISystem,
  ENEMIES,
  PARTY_BOTS,
  getGod,
  cellToWorld,
  STARTER_ZONE,
  TILE_SIZE,
} from './.bundle/entry.mjs';

const results = {};
const check = (name, value) => {
  results[name] = value === true;
};
const dist = (a, b) => Math.hypot(a.worldX - b.worldX, a.worldZ - b.worldZ);

const root = new SceneRoot();
const zone = new Zone(STARTER_ZONE);
const refs = { root, nav: zone.nav };

const makeHero = (col, row) => {
  const cell = cellToWorld(col, row);
  return new PlayerUnit(refs, cell.x, cell.z, getGod('aureon'));
};
const makeBot = (col, row, def = PARTY_BOTS[0]) => {
  const cell = cellToWorld(col, row);
  return new PartyBotUnit(refs, cell.x, cell.z, def);
};
const makeEnemy = (col, row, enemyId = 'slime') => {
  const cell = cellToWorld(col, row);
  return new EnemyUnit(refs, cell.x, cell.z, ENEMIES[enemyId]);
};

// --- Sigue al héroe ---
const hero = makeHero(15, 3);
const farBot = makeBot(20, 3);
const beforeFollow = dist(farBot, hero);
PartyAISystem.update(0.2, hero, [farBot], []);
check('el compañero se acerca si te alejas', dist(farBot, hero) < beforeFollow);

const nearBot = makeBot(15, 4);
const beforeIdle = dist(nearBot, hero);
PartyAISystem.update(0.2, hero, [nearBot], []);
check('pegado al héroe y sin enemigos, no se mueve', Math.abs(dist(nearBot, hero) - beforeIdle) < 1e-9);

// --- Entra en combate ---
const fighter = makeBot(15, 5, PARTY_BOTS[1]);
const prey = makeEnemy(17, 5);
const beforeEngage = dist(fighter, prey);
PartyAISystem.update(0.2, hero, [fighter], [prey]);
check('con un enemigo cerca, se acerca a por él', dist(fighter, prey) < beforeEngage);

const biter = makeBot(24, 5, PARTY_BOTS[1]);
const victim = makeEnemy(24, 6);
const hpBefore = victim.stats.hp;
PartyAISystem.update(0.1, hero, [biter], [victim]);
check('en rango, el compañero pega', victim.stats.hp < hpBefore);

// La correa: si el héroe está lejísimos (más allá de 14 celdas), el bot vuelve con él
// en vez de perseguir al enemigo.
const farHero = makeHero(5, 3);
const leashed = makeBot(26, 5, PARTY_BOTS[1]);
const bait = makeEnemy(30, 5);
const leashDistance = dist(leashed, farHero);
PartyAISystem.update(0.2, farHero, [leashed], [bait]);
check('si el héroe se aleja demasiado, vuelve a su lado', dist(leashed, farHero) < leashDistance);
check('la correa salta a más de 14 celdas', leashDistance > 14 * TILE_SIZE);

// Un héroe muerto no arrastra a los compañeros
const deadHero = makeHero(15, 6);
deadHero.isAlive = false;
const idleBot = makeBot(19, 6);
const beforeDead = dist(idleBot, deadHero);
PartyAISystem.update(0.2, deadHero, [idleBot], []);
check('sin héroe vivo los compañeros no actúan', Math.abs(dist(idleBot, deadHero) - beforeDead) < 1e-9);

// --- Datos del compañero ---
check('el nombre del compañero sale de su dato', PARTY_BOTS[0].name === 'Aelia' && makeBot(15, 8).botName === 'Aelia');
check(
  'el rango de combate se mide en unidades de mundo',
  Math.abs(makeBot(15, 9).engageRange - PARTY_BOTS[0].engageRange * TILE_SIZE) < 1e-9
);

// --- Contrato que usa la población simulada para aparecer ---
check('la navegación expone el tamaño del mapa', zone.nav.cols === 30 && zone.nav.rows === 30);

// Replica la búsqueda de punto de aparición de la población (misma lógica, sin DOM).
// Con azar fijo: un test que depende de Math.random puede fallar "a veces".
let spawnSeed = 12345;
const nextRandom = () => {
  spawnSeed = (spawnSeed * 1103515245 + 12345) & 0x7fffffff;
  return spawnSeed / 0x7fffffff;
};
const randomSpawn = () => {
  for (let i = 0; i < 30; i++) {
    const col = 1 + Math.floor(nextRandom() * (zone.nav.cols - 2));
    const row = 1 + Math.floor(nextRandom() * (zone.nav.rows - 2));
    if (zone.nav.isWalkableCell(col, row)) {
      return { col, row };
    }
  }
  return null;
};
let allValid = true;
let found = 0;
for (let i = 0; i < 200; i++) {
  const spot = randomSpawn();
  if (!spot) {
    allValid = false;
    break;
  }
  if (!zone.nav.isWalkableCell(spot.col, spot.row)) {
    allValid = false;
    break;
  }
  found += 1;
}
check('la población siempre encuentra suelo transitable', allValid && found === 200);

// Un héroe de población no puede acabar dentro de un muro ni fuera del mapa
const insideWall = makeBot(10, 8);
PartyAISystem.update(1, hero, [insideWall], []);
check(
  'el compañero nunca queda fuera del mapa',
  insideWall.worldX >= 0 && insideWall.worldZ >= 0 &&
    insideWall.worldX <= zone.nav.cols * TILE_SIZE &&
    insideWall.worldZ <= zone.nav.rows * TILE_SIZE
);

let ok = true;
for (const [name, value] of Object.entries(results)) {
  console.log(`${value ? 'PASS' : 'FAIL'}  ${name}`);
  if (!value) ok = false;
}
process.exit(ok ? 0 : 1);
