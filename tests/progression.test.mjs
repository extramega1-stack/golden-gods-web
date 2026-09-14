import {
  Zone,
  SceneRoot,
  PlayerUnit,
  EnemyUnit,
  ProgressionSystem,
  TalentSystem,
  SkillSystem,
  SKILLS,
  TALENTS,
  ENEMIES,
  expToNext,
  MAX_LEVEL,
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
const makePlayer = (godId = 'aureon', col = 15, row = 3) => {
  const cell = cellToWorld(col, row);
  return new PlayerUnit(refs, cell.x, cell.z, getGod(godId));
};
const makeEnemy = (col, row, enemyId = 'slime') => {
  const cell = cellToWorld(col, row);
  return new EnemyUnit(refs, cell.x, cell.z, ENEMIES[enemyId]);
};

// --- Nivel 1 = stats base, una vez normalizados ---
const hero = makePlayer('aureon');
const base = getGod('aureon').baseStats;
check(
  'a nivel 1 los stats son los del dios',
  near(hero.stats.maxHp, base.maxHp) &&
    near(hero.stats.attack, base.attack) &&
    near(hero.stats.moveSpeed, base.moveSpeed)
);

// --- Los niveles aplican el crecimiento del dios ---
const growth = getGod('aureon').growth;
hero.level = 3;
ProgressionSystem.recompute(hero, true);
check(
  'subir de nivel aplica el crecimiento',
  near(hero.stats.maxHp, Math.round(base.maxHp + growth.maxHp * 2)) &&
    near(hero.stats.attack, Math.round((base.attack + growth.attack * 2) * 10) / 10)
);

// --- La altura y el alcance siguen en unidades de mundo ---
check('el alcance se convierte a unidades de mundo', near(hero.attackRange, hero.stats.attackRange * TILE_SIZE));

// --- Experiencia: sube de nivel y da puntos ---
const rookie = makePlayer('kael', 15, 4);
const before = rookie.level;
ProgressionSystem.awardExp(rookie, 400);
check('la experiencia sube de nivel', rookie.level > before);
check('cada nivel da un punto de talento', rookie.talentPoints === rookie.level - 1);
check('la experiencia sobrante se conserva', rookie.exp < expToNext(rookie.level));
check('el nivel está acotado', rookie.level <= MAX_LEVEL);

const maxed = makePlayer('kael', 15, 5);
ProgressionSystem.awardExp(maxed, 100000);
check('no se pasa del nivel máximo', maxed.level === MAX_LEVEL && maxed.talentPoints === MAX_LEVEL - 1);
check('al máximo ya no se gana experiencia', ProgressionSystem.awardExp(maxed, 100) === 0);

// --- Talentos ---
const talentHero = makePlayer('aureon', 15, 6);
talentHero.talentPoints = 2;
const hpBeforeTalent = talentHero.stats.maxHp;
const spent = TalentSystem.spend(talentHero, 'vigor');
check('gastar un talento descuenta el punto', spent && talentHero.talentPoints === 1);
check('el talento sube los stats', talentHero.stats.maxHp > hpBeforeTalent);
check('no se puede gastar sin puntos', (() => {
  talentHero.talentPoints = 0;
  return TalentSystem.spend(talentHero, 'fury') === false;
})());
check('no se pasa del rango máximo', (() => {
  talentHero.talentPoints = 99;
  const node = TALENTS.find((n) => n.id === 'reach');
  for (let i = 0; i < node.maxRank + 3; i++) TalentSystem.spend(talentHero, 'reach');
  return talentHero.talentRanks.reach === node.maxRank;
})());

// --- Habilidades: coste, cooldown y mana ---
const caster = makePlayer('aureon', 15, 7);
const ctx = { enemies: [], spawnProjectile: () => {} };
const mpBefore = caster.stats.mp;
const castOk = SkillSystem.cast(caster, SKILLS.bash, ctx, 1000);
check('la habilidad consume maná', castOk === 'ok' && near(caster.stats.mp, mpBefore - SKILLS.bash.cost));
check('no se puede repetir hasta pasar el cooldown', SkillSystem.cast(caster, SKILLS.bash, ctx, 1100) === 'cooldown');
check('tras el cooldown vuelve a estar lista', SkillSystem.cast(caster, SKILLS.bash, ctx, 1000 + SKILLS.bash.cooldown * 1000) === 'ok');

const thirsty = makePlayer('aureon', 15, 8);
thirsty.stats.mp = 0;
check('sin maná la habilidad no sale', SkillSystem.cast(thirsty, SKILLS.bash, ctx, 5000) === 'mana');

// --- Área: daña a los enemigos dentro del radio ---
const areaCaster = makePlayer('aureon', 15, 9);
const inRange = makeEnemy(16, 9);
const outOfRange = makeEnemy(20, 9);
const areaCtx = { enemies: [inRange, outOfRange], spawnProjectile: () => {} };
SkillSystem.cast(areaCaster, SKILLS.bash, areaCtx, 1000);
check('el área daña a quien está dentro', inRange.stats.hp < inRange.stats.maxHp);
check('el área no toca a quien está fuera', outOfRange.stats.hp === outOfRange.stats.maxHp);

// --- Curación ---
const healer = makePlayer('sira', 15, 10);
const hpBeforeHeal = healer.stats.hp = 10;
SkillSystem.cast(healer, SKILLS.mend, ctx, 1000);
check('la curación restaura vida', healer.stats.hp > hpBeforeHeal);

// --- Buff: aplica y caduca ---
const buffer = makePlayer('aureon', 15, 11);
const defBefore = buffer.stats.defense;
SkillSystem.cast(buffer, SKILLS.bulwark, ctx, 1000);
check('el buff sube la defensa', buffer.stats.defense > defBefore);
buffer.updateBuffs(1000 + SKILLS.bulwark.buff.duration * 1000 - 1);
check('el buff dura lo que dice', buffer.stats.defense > defBefore);
buffer.updateBuffs(1000 + SKILLS.bulwark.buff.duration * 1000 + 1);
check('el buff caduca y devuelve los stats', near(buffer.stats.defense, defBefore));

// --- Proyectil: se lanza hacia el enemigo más cercano ---
const shooter = makePlayer('nel', 15, 13);
let launched = null;
const shootCtx = {
  enemies: [makeEnemy(18, 13)],
  spawnProjectile: (skill, damage, dir) => {
    launched = { skill, damage, dir };
  },
};
SkillSystem.cast(shooter, SKILLS.shot, shootCtx, 1000);
check('el proyectil se lanza', launched !== null && launched.damage > 0);
check(
  'apunta al enemigo más cercano',
  launched !== null && launched.dir.x > 0.9 && Math.abs(launched.dir.z) < 0.1
);
check('sin enemigos dispara hacia donde mira', (() => {
  let fallback = null;
  SkillSystem.cast(
    makePlayer('nel', 15, 14),
    SKILLS.shot,
    { enemies: [], spawnProjectile: (s, d, dir) => (fallback = dir) },
    2000
  );
  return fallback !== null && near(fallback.x, 0) && near(fallback.z, 1);
})());

// --- Embestida: mueve al héroe ---
const dasher = makePlayer('kael', 15, 16);
const zBefore = dasher.worldZ;
SkillSystem.cast(dasher, SKILLS.lunge, ctx, 3000);
check('la embestida desplaza al héroe', dasher.worldZ > zBefore);

let ok = true;
for (const [name, value] of Object.entries(results)) {
  console.log(`${value ? 'PASS' : 'FAIL'}  ${name}`);
  if (!value) ok = false;
}
process.exit(ok ? 0 : 1);
