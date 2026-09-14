import {
  Zone,
  SceneRoot,
  PlayerUnit,
  InventorySystem,
  LootSystem,
  ENEMIES,
  ITEMS,
  getGod,
  getItem,
  upgradeCost,
  effectiveMods,
  describeItem,
  cellToWorld,
  STARTER_ZONE,
} from './.bundle/entry.mjs';

const results = {};
const check = (name, value) => {
  results[name] = value === true;
};
const near = (a, b) => Math.abs(a - b) < 1e-6;

const root = new SceneRoot();
const zone = new Zone(STARTER_ZONE);
const refs = { root, nav: zone.nav };
const makeHero = (godId = 'kael') => {
  const cell = cellToWorld(15, 15);
  return new PlayerUnit(refs, cell.x, cell.z, getGod(godId));
};

// --- Botín ---
const originalRandom = Math.random;
Math.random = () => 0;
const generous = LootSystem.roll(ENEMIES.slime);
check('el botín da el oro del enemigo', generous.gold === ENEMIES.slime.goldReward);
check('con tirada baja suelta el primer objeto de la tabla', generous.itemId === 'cloth_armor');

Math.random = () => 0.99;
const stingy = LootSystem.roll(ENEMIES.slime);
check('con tirada alta no suelta objeto', stingy.itemId === null);
check('aun sin objeto, da oro', stingy.gold === ENEMIES.slime.goldReward);
Math.random = originalRandom;

// --- Inventario ---
const hero = makeHero();
InventorySystem.addItem(hero, 'rusty_sword');
InventorySystem.addItem(hero, 'cloth_armor');
check('los objetos entran en la mochila', hero.inventory.length === 2);

const swordUid = hero.inventory.find((i) => i.itemId === 'rusty_sword').uid;
const attackBefore = hero.stats.attack;
InventorySystem.equip(hero, swordUid);
check('equipar saca el objeto de la mochila', hero.inventory.length === 1);
check('equipar coloca el objeto en su ranura', hero.equipped.weapon?.itemId === 'rusty_sword');
check('el arma equipada sube el ataque', hero.stats.attack > attackBefore);

InventorySystem.addItem(hero, 'bronze_blade');
const bladeUid = hero.inventory.find((i) => i.itemId === 'bronze_blade').uid;
InventorySystem.equip(hero, bladeUid);
check('al cambiar de arma la nueva queda equipada', hero.equipped.weapon?.itemId === 'bronze_blade');
check('la anterior vuelve a la mochila', hero.inventory.some((i) => i.itemId === 'rusty_sword'));

const attackWithBlade = hero.stats.attack;
InventorySystem.unequip(hero, 'weapon');
check('quitar el arma deja la ranura vacía', hero.equipped.weapon === null);
check('al quitarla, el ataque vuelve a bajar', hero.stats.attack < attackWithBlade);

// --- Mejoras en la herrería ---
const blade = hero.inventory.find((i) => i.itemId === 'bronze_blade');
InventorySystem.equip(hero, blade.uid);
hero.gold = 0;
check('sin oro no se mejora', InventorySystem.upgrade(hero, 'weapon') === 'poor');
check('sin objeto no se mejora', InventorySystem.upgrade(hero, 'armor') === 'none');

const cost = InventorySystem.getCostFor(hero, 'weapon');
hero.gold = cost;
const attackBeforeUpgrade = hero.stats.attack;
check('con oro la mejora sale adelante', InventorySystem.upgrade(hero, 'weapon') === 'ok');
check('la mejora cuesta exactamente su coste', hero.gold === 0);
check('la mejora sube el nivel del objeto', hero.equipped.weapon.upgradeLevel === 1);
check('la mejora sube los stats', hero.stats.attack > attackBeforeUpgrade);
check('cada mejora encarece la siguiente', upgradeCost(hero.equipped.weapon) > cost);

// --- Escalado y descripción ---
const plain = { uid: 'x', itemId: 'bronze_blade', upgradeLevel: 0 };
const improved = { uid: 'y', itemId: 'bronze_blade', upgradeLevel: 2 };
const baseMod = effectiveMods(plain)[0].value;
const improvedMod = effectiveMods(improved)[0].value;
check('los modificadores escalan con el nivel de mejora', near(improvedMod, baseMod * 1.4));

const text = describeItem(improved);
check(
  'la descripción incluye nombre, nivel y stats',
  text.includes(ITEMS.bronze_blade.name) && text.includes('+2') && text.includes('ATQ')
);
check('los objetos del catálogo se recuperan por id', getItem('titan_plate').slot === 'armor');

// --- Uids únicos tras recargar una partida ---
InventorySystem.reseed([{ uid: '50', itemId: 'rusty_sword', upgradeLevel: 0 }]);
InventorySystem.addItem(hero, 'cloth_armor');
check('tras recargar, los uids nuevos no chocan', hero.inventory[hero.inventory.length - 1].uid === '51');

let ok = true;
for (const [name, value] of Object.entries(results)) {
  console.log(`${value ? 'PASS' : 'FAIL'}  ${name}`);
  if (!value) ok = false;
}
process.exit(ok ? 0 : 1);
