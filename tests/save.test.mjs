import {
  Zone,
  SceneRoot,
  PlayerUnit,
  InventorySystem,
  TalentSystem,
  SaveManager,
  applySaveToHero,
  getGod,
  cellToWorld,
  STARTER_ZONE,
} from './.bundle/entry.mjs';

const results = {};
const check = (name, value) => {
  results[name] = value === true;
};
const near = (a, b) => Math.abs(a - b) < 1e-6;

// Almacenamiento en memoria para poder guardar y cargar sin navegador.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const root = new SceneRoot();
const zone = new Zone(STARTER_ZONE);
const refs = { root, nav: zone.nav };
const makeHero = (col = 15, row = 3) => {
  const cell = cellToWorld(col, row);
  return new PlayerUnit(refs, cell.x, cell.z, getGod('kael'));
};

// --- Héroe con progreso de verdad ---
const original = makeHero(12, 9);
original.level = 6;
original.exp = 42;
original.gold = 250;
original.talentPoints = 3;
TalentSystem.spend(original, 'vigor');
TalentSystem.spend(original, 'fury');

InventorySystem.addItem(original, 'bronze_blade');
InventorySystem.addItem(original, 'leather_armor');
InventorySystem.addItem(original, 'rusty_sword');
const blade = original.inventory.find((i) => i.itemId === 'bronze_blade');
const armor = original.inventory.find((i) => i.itemId === 'leather_armor');
InventorySystem.equip(original, blade.uid);
InventorySystem.equip(original, armor.uid);
InventorySystem.upgrade(original, 'weapon');

const attackBefore = original.stats.attack;
const maxHpBefore = original.stats.maxHp;
// La mejora del arma cuesta oro, así que el valor a comparar es el de después.
const goldBefore = original.gold;

// --- Guardar en almacenamiento, con el mismo camino que usa el juego ---
SaveManager.persist(SaveManager.capture(original, original.god.id));
const stored = SaveManager.load();
check('la partida se guarda y se recupera', stored !== null && stored.godId === 'kael');

// --- Continuar en un héroe nuevo ---
const reloaded = makeHero();
applySaveToHero(reloaded, stored);
check('se recupera el nivel, la experiencia y el oro', reloaded.level === 6 && reloaded.exp === 42 && reloaded.gold === goldBefore);
check('mejorar el arma descontó su coste', goldBefore < 250 && goldBefore > 0);
check('se recuperan los puntos y los rangos de talento', reloaded.talentPoints === 1 && reloaded.talentRanks.vigor === 1 && reloaded.talentRanks.fury === 1);
check('se recupera el equipo puesto', reloaded.equipped.weapon?.itemId === 'bronze_blade' && reloaded.equipped.armor?.itemId === 'leather_armor');
check('se recupera el nivel de mejora del arma', reloaded.equipped.weapon.upgradeLevel === 1);
check('se recupera la mochila', reloaded.inventory.length === 1 && reloaded.inventory[0].itemId === 'rusty_sword');
check('se recupera la posición', near(reloaded.worldX, original.worldX) && near(reloaded.worldZ, original.worldZ));
check('los stats efectivos coinciden con los de antes', near(reloaded.stats.attack, attackBefore) && near(reloaded.stats.maxHp, maxHpBefore));
check('la vida y el maná se restauran llenos', reloaded.stats.hp === reloaded.stats.maxHp && reloaded.stats.mp === reloaded.stats.maxMp);

// --- Los identificadores no chocan tras recargar ---
const beforeCount = reloaded.inventory.length;
InventorySystem.addItem(reloaded, 'cloth_armor');
const freshUid = reloaded.inventory[beforeCount].uid;
const allUids = [
  ...reloaded.inventory.map((i) => i.uid),
  reloaded.equipped.weapon?.uid,
  reloaded.equipped.armor?.uid,
].filter(Boolean);
check('tras continuar, los identificadores siguen siendo únicos', new Set(allUids).size === allUids.length);
check('y el objeto nuevo se puede equipar', InventorySystem.equip(reloaded, freshUid));

// --- Código de héroe ---
const code = SaveManager.exportCode(SaveManager.capture(original, original.god.id));
const fromCode = SaveManager.importCode(code);
check('el código de héroe se importa', fromCode !== null && fromCode.level === 6);
const restored = makeHero();
applySaveToHero(restored, fromCode);
check('el héroe importado del código queda igual', near(restored.stats.attack, attackBefore));
check('un código manipulado se rechaza', SaveManager.importCode(code.slice(0, -1) + 'x') === null);
check('un código basura se rechaza', SaveManager.importCode('no-es-un-codigo') === null);

// --- Borrar partida ---
SaveManager.clear();
check('borrar deja sin partida guardada', SaveManager.load() === null);

// --- Una partida nueva no arrastra nada ---
const brandNew = makeHero();
check('un héroe nuevo arranca limpio', brandNew.level === 1 && brandNew.gold === 0 && brandNew.inventory.length === 0 && brandNew.equipped.weapon === null);

let ok = true;
for (const [name, value] of Object.entries(results)) {
  console.log(`${value ? 'PASS' : 'FAIL'}  ${name}`);
  if (!value) ok = false;
}
process.exit(ok ? 0 : 1);
