import { readFileSync, existsSync } from 'node:fs';
import {
  GODS,
  ENEMIES,
  PARTY_BOTS,
  GOD_MODELS,
  ENEMY_MODELS,
  BOT_MODELS,
  POPULATION_MODELS,
  MODEL_WEAPONS,
  ALL_WEAPON_IDS,
  THREE,
} from './.bundle/entry.mjs';

const results = {};
const check = (name, value) => {
  results[name] = value === true;
};

/** Lee los nombres de nodo de un GLB, ya saneados como los deja three al cargarlos. */
function nodeNames(id) {
  const path = `public/models/${id}.glb`;
  if (!existsSync(path)) {
    return null;
  }
  const buffer = readFileSync(path);
  if (buffer.toString('ascii', 0, 4) !== 'glTF') {
    return null;
  }
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength));
  return (json.nodes ?? []).map((node) =>
    THREE.PropertyBinding.sanitizeNodeName(node.name ?? '')
  );
}

const sanitize = (name) => THREE.PropertyBinding.sanitizeNodeName(name);

// --- El saneado que aplica three, comprobado ---
check(
  'el saneado quita los puntos, como hace three al cargar',
  sanitize('handslot.r') === 'handslotr' && sanitize('1H_Sword') === '1H_Sword'
);

// --- Cada enganche existe en su modelo ---
const problems = [];
for (const [modelId, specs] of Object.entries(MODEL_WEAPONS)) {
  const names = nodeNames(modelId);
  if (names === null) {
    problems.push(`${modelId}: no se pudo leer el modelo`);
    continue;
  }
  for (const spec of specs) {
    if (!names.includes(sanitize(spec.slot))) {
      problems.push(`${modelId}: no existe el nodo "${spec.slot}"`);
    }
  }
}
check(
  'todos los nodos de enganche existen en su modelo',
  problems.length === 0 && (problems.length > 0 ? console.log('   ' + problems.join('\n   ')) : true)
);

// --- Todos los modelos usados tienen armas declaradas ---
const usedModels = new Set([
  ...GODS.map((god) => GOD_MODELS[god.id]),
  ...Object.values(ENEMIES).map((enemy) => ENEMY_MODELS[enemy.id]),
  ...PARTY_BOTS.map((bot) => BOT_MODELS[bot.id]),
  ...POPULATION_MODELS,
].filter(Boolean));

check(
  'todo modelo en uso tiene armas declaradas',
  [...usedModels].every((id) => Array.isArray(MODEL_WEAPONS[id]))
);

// --- Los ficheros de arma existen y son GLB válidos ---
let missing = 0;
let invalid = 0;
let totalBytes = 0;
for (const id of ALL_WEAPON_IDS) {
  const path = `public/models/weapons/${id}.glb`;
  if (!existsSync(path)) {
    missing += 1;
    continue;
  }
  const buffer = readFileSync(path);
  totalBytes += buffer.length;
  if (buffer.toString('ascii', 0, 4) !== 'glTF') {
    invalid += 1;
  }
}

check('todas las armas usadas tienen GLB', missing === 0);
check('todas las armas son GLB válidos', invalid === 0);
check('las armas pesan poco en total', totalBytes > 0 && totalBytes < 512 * 1024);
check(
  'no sobra ninguna arma en la carpeta',
  (() => {
    const files = ALL_WEAPON_IDS.map((id) => `public/models/weapons/${id}.glb`);
    return files.every((path) => existsSync(path));
  })()
);

let ok = true;
for (const [name, value] of Object.entries(results)) {
  console.log(`${value ? 'PASS' : 'FAIL'}  ${name}`);
  if (!value) ok = false;
}
console.log(
  `\n${ALL_WEAPON_IDS.length} armas para ${Object.keys(MODEL_WEAPONS).length} modelos, ${(totalBytes / 1024).toFixed(0)} KB`
);
process.exit(ok ? 0 : 1);
