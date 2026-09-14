import {
  Zone,
  SceneRoot,
  PlayerUnit,
  EnemyUnit,
  BossSystem,
  ENEMIES,
  getGod,
  cellToWorld,
  STARTER_ZONE,
  TILE_SIZE,
} from './.bundle/entry.mjs';

const results = {};
const check = (name, value) => {
  results[name] = value === true;
};
const near = (a, b) => Math.abs(a - b) < 1e-6;

const root = new SceneRoot();
const zone = new Zone(STARTER_ZONE);
const refs = { root, nav: zone.nav };

const arena = cellToWorld(15, 26);
const makeHero = (offsetX = 0) => new PlayerUnit(refs, arena.x + offsetX, arena.z, getGod('aureon'));
const makeTitan = () => new EnemyUnit(refs, arena.x, arena.z, ENEMIES.titan);

const titanDef = ENEMIES.titan;
const cooldownMs = titanDef.slamCooldown * 1000;

// --- Fases ---
const boss = makeTitan();
const hero = makeHero(4);
check('el jefe arranca en la fase 1', boss.bossPhase === 1);

boss.stats.hp = boss.stats.maxHp * 0.6;
BossSystem.update(boss, hero, 1000);
check('baja de vida sube a la fase 2', boss.bossPhase === 2);
check(
  'la fase 2 aumenta el ataque',
  near(boss.stats.attack, Math.round(titanDef.stats.attack * 1.4))
);

boss.stats.hp = boss.stats.maxHp * 0.3;
BossSystem.update(boss, hero, 2000);
check('baja de vida sube a la fase 3', boss.bossPhase === 3);
check(
  'la fase 3 vuelve a aumentar el ataque',
  near(boss.stats.attack, Math.round(titanDef.stats.attack * 1.8))
);
check('el radio de golpe se mide en unidades de mundo', titanDef.slamRadius * TILE_SIZE > 0);

// --- Golpe sísmico: aviso, resolución y esquiva ---
const fresh = makeTitan();
const shortRangedHero = makeHero(4);
const farHero = makeHero(40);
check('el jefe no golpea antes de su primer ciclo', (() => {
  BossSystem.update(fresh, shortRangedHero, 10000);
  return fresh.slamPendingAt === 0;
})());

BossSystem.update(fresh, shortRangedHero, 10000 + cooldownMs);
check('pasado el ciclo, el golpe se anuncia', fresh.slamPendingAt > 10000 + cooldownMs);

const hpDuringTelegraph = shortRangedHero.stats.hp;
BossSystem.update(fresh, shortRangedHero, 10000 + cooldownMs + 100);
check('durante el aviso todavía no hay daño', shortRangedHero.stats.hp === hpDuringTelegraph);

BossSystem.update(fresh, shortRangedHero, 10000 + cooldownMs + 1000);
check('tras el aviso, el golpe conecta', shortRangedHero.stats.hp < hpDuringTelegraph);

// Esquivar: el mismo golpe con el héroe lejos no hace daño
const dodged = makeTitan();
const dodgingHero = makeHero(4);
dodged.slamReadyAt = 0;
BossSystem.update(dodged, dodgingHero, 20000);
BossSystem.update(dodged, dodgingHero, 20000 + cooldownMs);
const hpBeforeDodge = dodgingHero.stats.hp;
BossSystem.update(dodged, farHero, 20000 + cooldownMs + 1000);
check('alejarse del círculo esquiva el golpe', farHero.stats.hp === farHero.stats.maxHp);
check('el que se queda dentro sigue con la vida intacta solo si se movió', dodgingHero.stats.hp === hpBeforeDodge);

// El golpe no encadena sin esperar su ciclo
const chained = makeTitan();
chained.slamReadyAt = 0;
BossSystem.update(chained, hero, 30000);
BossSystem.update(chained, hero, 30000 + cooldownMs);
const pendingAt = chained.slamPendingAt;
chained.slamPendingAt = 0;
const readyAfter = chained.slamReadyAt;
BossSystem.update(chained, hero, 30000 + cooldownMs + 10);
check('el golpe respeta su cooldown', chained.slamPendingAt === 0 && readyAfter > 30000 + cooldownMs && pendingAt > 0);

let ok = true;
for (const [name, value] of Object.entries(results)) {
  console.log(`${value ? 'PASS' : 'FAIL'}  ${name}`);
  if (!value) ok = false;
}
process.exit(ok ? 0 : 1);
