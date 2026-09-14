import {
  Zone,
  SceneRoot,
  Wc3Camera,
  Unit,
  PlayerUnit,
  GODS,
  SaveManager,
  createQuestState,
  cellToWorld,
  STARTER_ZONE,
  STARTER_SPAWN,
  THREE,
} from './.bundle/entry.mjs';

const results = {};
const check = (name, value) => {
  results[name] = value === true;
};

const stats = {
  maxHp: 100,
  hp: 100,
  maxMp: 50,
  mp: 50,
  attack: 5,
  defense: 1,
  attackRange: 2,
  attackCooldown: 1,
  moveSpeed: 4,
};

// --- Dirección de cámara: pantalla → mundo ---
const rig = new Wc3Camera(1);
const up = rig.groundDirection(0, -1);
const right = rig.groundDirection(1, 0);
const near = (a, b) => Math.abs(a - b) < 1e-6;

check(
  'arriba en pantalla va hacia el fondo de la cámara',
  near(up.x, -Math.SQRT1_2) && near(up.z, -Math.SQRT1_2)
);
check('derecha en pantalla va a la derecha de la cámara', near(right.x, Math.SQRT1_2) && near(right.z, -Math.SQRT1_2));
check(
  'la dirección de pantalla se normaliza',
  (() => {
    const d = rig.groundDirection(1, -1);
    return near(Math.hypot(d.x, d.z), 1);
  })()
);
check('sin entrada no hay dirección', rig.groundDirection(0, 0).x === 0 && rig.groundDirection(0, 0).z === 0);

// --- Movimiento de una unidad sobre el terreno real ---
const root = new SceneRoot();
const zone = new Zone(STARTER_ZONE);
const refs = { root, nav: zone.nav };

const nearWall = at(10, 7);
function at(col, row) {
  return cellToWorld(col, row);
}

const unit = new Unit(refs, nearWall.x, nearWall.z, new THREE.Group(), 4, { ...stats });
check('la unidad arranca en el suelo', unit.terrainLevel === 0);

// Muro dos niveles más alto justo al lado (celda 10,8)
unit.moveWorld(0, 4);
check('no atraviesa el muro', near(unit.worldZ, nearWall.z) && unit.worldX === nearWall.x);

// Mesa elevada dos niveles: desde su celda contigua no se sube
const nextToMesa = at(11, 18);
const climber = new Unit(refs, nextToMesa.x, nextToMesa.z, new THREE.Group(), 4, { ...stats });
check('la unidad arranca en la región intermedia', climber.terrainLevel === 1);
climber.moveWorld(-4, 0);
check('no escala el acantilado de la mesa', near(climber.worldX, nextToMesa.x));

// Escalón de un nivel: sí se sube
const stairBase = at(15, 13);
const walker = new Unit(refs, stairBase.x, stairBase.z, new THREE.Group(), 4, { ...stats });
check('arranca en el nivel bajo', walker.terrainLevel === 0);
walker.moveWorld(0, 4);
check('sube el escalón de un nivel', near(walker.worldZ, stairBase.z + 4) && walker.terrainLevel === 1);

// Fuera del mapa: bloqueado
const corner = new Unit(refs, 4, 4, new THREE.Group(), 4, { ...stats });
corner.moveWorld(-20, -20);
check('no se sale del mapa', corner.worldX >= 0 && corner.worldZ >= 0);

// --- El héroe compone con SaveManager sin acoplarse ---
const spawn = cellToWorld(STARTER_SPAWN.col, STARTER_SPAWN.row);
const hero = new PlayerUnit(refs, spawn.x, spawn.z, GODS[0]);
hero.level = 4;
hero.gold = 123;

const save = SaveManager.capture(hero, hero.god.id, createQuestState());
check('captura del héroe', save.godId === GODS[0].id && save.level === 4 && save.gold === 123);
check('la posición se guarda en x/z', near(save.x, hero.worldX) && near(save.z, hero.worldZ));
check('mochila y equipo vacíos al empezar', save.inventory.length === 0 && save.equipped.weapon === null);

const code = SaveManager.exportCode(save);
check('código de héroe ida y vuelta', JSON.stringify(SaveManager.importCode(code)) === JSON.stringify(save));

// El héroe respeta el terreno al moverse
const beforeX = hero.worldX;
hero.moveWorld(-100, 0);
check('el héroe no atraviesa el terreno de una zancada', hero.worldX > beforeX - 100);

let ok = true;
for (const [name, value] of Object.entries(results)) {
  console.log(`${value ? 'PASS' : 'FAIL'}  ${name}`);
  if (!value) ok = false;
}
process.exit(ok ? 0 : 1);
