import { readFileSync, existsSync } from 'node:fs';
import {
  GODS,
  ENEMIES,
  PARTY_BOTS,
  GOD_MODELS,
  ENEMY_MODELS,
  BOT_MODELS,
  POPULATION_MODELS,
  ALL_MODEL_IDS,
  pickAnimation,
  resolveAnimations,
} from './.bundle/entry.mjs';

const results = {};
const check = (name, value) => {
  results[name] = value === true;
};

// --- Emparejado de animaciones ---
const kaykitNames = [
  'Idle',
  'Walking_A',
  'Running_A',
  '1H_Melee_Attack_Chop',
  'Spellcast_Shoot',
  'Hit_A',
  'Death_A',
];

const resolved = resolveAnimations(kaykitNames);
const states = ['idle', 'walk', 'run', 'attack', 'cast', 'hit', 'die'];
check(
  'con los nombres de KayKit se cubren los siete estados',
  states.every((state) => typeof resolved[state] === 'string')
);
check('el estado idle elige el primer candidato', resolved.idle === 'Idle');
check('el ataque elige el candidato preferido', resolved.attack === '1H_Melee_Attack_Chop');
check('morir se empareja con Death_A', resolved.die === 'Death_A');

check('sin candidatos no se inventa nada', pickAnimation(['Cualquiera'], 'die') === null);
check(
  'con varios candidatos gana el orden de preferencia',
  pickAnimation(['Running_B', 'Running_A'], 'run') === 'Running_A'
);

const partial = resolveAnimations(['Idle', 'Running_A']);
check('un modelo parcial solo mapea lo que tiene', partial.idle === 'Idle' && partial.run === 'Running_A' && partial.die === undefined);

// --- El manifiesto cubre todo el contenido ---
check(
  'cada dios tiene modelo',
  GODS.every((god) => typeof GOD_MODELS[god.id] === 'string')
);
check(
  'cada enemigo tiene modelo',
  Object.values(ENEMIES).every((enemy) => typeof ENEMY_MODELS[enemy.id] === 'string')
);
check(
  'cada compañero tiene modelo',
  PARTY_BOTS.every((bot) => typeof BOT_MODELS[bot.id] === 'string')
);
check('hay modelos para la población', POPULATION_MODELS.length > 0);
check(
  'la lista de precarga es única',
  new Set(ALL_MODEL_IDS).size === ALL_MODEL_IDS.length
);

const referenced = [
  ...Object.values(GOD_MODELS),
  ...Object.values(ENEMY_MODELS),
  ...Object.values(BOT_MODELS),
  ...POPULATION_MODELS,
];
check(
  'todo modelo referenciado está en la lista de precarga',
  referenced.every((id) => ALL_MODEL_IDS.includes(id))
);

// --- Los ficheros existen y traen las animaciones que el juego espera ---
const expectedStates = ['idle', 'walk', 'run', 'attack', 'cast', 'hit', 'die'];

function readGlbAnimations(id) {
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
  return (json.animations ?? []).map((animation) => animation.name);
}

let allFilesPresent = true;
let allFilesValid = true;
let allAnimationsCovered = true;
let totalBytes = 0;

for (const id of ALL_MODEL_IDS) {
  const animations = readGlbAnimations(id);
  if (animations === null) {
    allFilesPresent = false;
    continue;
  }
  totalBytes += readFileSync(`public/models/${id}.glb`).length;

  const mapped = resolveAnimations(animations);
  if (!expectedStates.every((state) => typeof mapped[state] === 'string')) {
    allAnimationsCovered = false;
    console.log(`   (${id} no cubre todos los estados: ${animations.join(', ')})`);
  }
  if (animations.length !== expectedStates.length) {
    allFilesValid = false;
  }
}

check('todos los modelos referenciados existen como GLB válido', allFilesPresent);
check('cada modelo conserva exactamente las animaciones podadas', allFilesValid);
check('cada modelo cubre los siete estados del juego', allAnimationsCovered);
check(
  'los modelos pesan menos de 6 MB en total (poda aplicada)',
  totalBytes > 0 && totalBytes < 6 * 1024 * 1024
);

let ok = true;
for (const [name, value] of Object.entries(results)) {
  console.log(`${value ? 'PASS' : 'FAIL'}  ${name}`);
  if (!value) ok = false;
}
console.log(`\nmodelos: ${ALL_MODEL_IDS.length} ficheros, ${(totalBytes / 1048576).toFixed(2)} MB`);
process.exit(ok ? 0 : 1);
