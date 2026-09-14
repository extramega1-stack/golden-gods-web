import {
  QUESTS,
  questObjectiveText,
  createQuestState,
  activeQuest,
  advance,
  questProgress,
  questIsDone,
  ENEMIES,
} from './.bundle/entry.mjs';

const results = {};
const check = (name, value) => {
  results[name] = value === true;
};

// --- Arranque ---
const state = createQuestState();
check('arranca sin misiones completadas', state.completed.length === 0);
check('la primera misión es la activa', activeQuest(state)?.id === QUESTS[0].id);
check('la activa empieza sin progreso', questProgress(state, QUESTS[0]) === 0);
check('la activa no está cumplida', !questIsDone(state, QUESTS[0]));

// --- Un suceso que no toca no avanza nada ---
const noMatch = advance(state, { level: 1, gold: 0, killedEnemy: 'brute' });
check('matar a otro enemigo no avanza la misión', noMatch.length === 0 && questProgress(state, QUESTS[0]) === 0);

// --- Objetivos por bajas ---
const first = QUESTS[0];
let completed;
for (let i = 0; i < first.objective.count; i++) {
  completed = advance(state, { level: 1, gold: 0, killedEnemy: 'slime' });
}
check('las bajas completan la misión de bajas', completed.length === 1 && completed[0].id === first.id);
check('la misión completada queda registrada', state.completed.includes(first.id));
check('la siguiente pasa a ser la activa', activeQuest(state)?.id === QUESTS[1].id);
check('el contador es por misión, no acumulado', questProgress(state, QUESTS[1]) === 0);

// --- Objetivos por oro y por nivel ---
const goldQuest = QUESTS.find((quest) => quest.objective.kind === 'gold');
const levelQuest = QUESTS.find((quest) => quest.objective.kind === 'level');

check('el oro insuficiente no completa', !questIsDone(state, goldQuest));
check('el nivel insuficiente no completa', !questIsDone(state, levelQuest));

// --- Pasada completa de la cadena ---
const run = createQuestState();
const log = [];
const drive = (event) => {
  for (const quest of advance(run, event)) {
    log.push(quest.id);
  }
};

// 1 y 2: fangos (la segunda solo cuenta desde que se activa)
for (let i = 0; i < 3; i++) drive({ level: 1, gold: 0, killedEnemy: 'slime' });
for (let i = 0; i < 8; i++) drive({ level: 1, gold: 0, killedEnemy: 'slime' });
check('la primera misión de fangos se completa', log.includes('primeros-pasos'));
check('la segunda misión de fangos se completa', log.includes('prado-limpio'));

// 3: nivel
drive({ level: 3, gold: 0 });
check('la misión de nivel se completa al subir', log.includes('aprendiz'));

// 4: brutos
for (let i = 0; i < 4; i++) drive({ level: 3, gold: 0, killedEnemy: 'brute' });
check('la misión de brutos se completa', log.includes('brutos-de-khar'));

// 5: oro
drive({ level: 3, gold: 150 });
check('la misión de oro se completa al reunirlo', log.includes('acaudalado'));

// 6: el jefe
drive({ level: 4, gold: 150, killedEnemy: 'titan' });
check('la misión del jefe se completa', log.includes('titan-caido'));
check('toda la cadena queda completada', run.completed.length === QUESTS.length);
check('sin misiones pendientes, no hay activa', activeQuest(run) === null);
check('tras completar todo, avanzar no hace nada', advance(run, { level: 9, gold: 9999, killedEnemy: 'titan' }).length === 0);

// --- Subir de nivel de golpe no rompe el bucle ---
const jump = createQuestState();
jump.completed.push('primeros-pasos', 'prado-limpio');
const jumped = advance(jump, { level: 10, gold: 0 });
check(
  'un suceso puede cerrar más de una misión de golpe',
  jumped.length >= 1 && jumped.every((quest) => quest.objective.kind === 'level' || quest.id === 'aprendiz')
);

// --- Integridad de los datos ---
check('hay misiones definidas', QUESTS.length >= 5);
check(
  'cada misión tiene identificador único',
  new Set(QUESTS.map((quest) => quest.id)).size === QUESTS.length
);
check(
  'cada misión da alguna recompensa',
  QUESTS.every((quest) => quest.reward.gold || quest.reward.exp || quest.reward.itemId)
);
check(
  'cada misión apunta a un enemigo que existe',
  QUESTS.every(
    (quest) => quest.objective.kind !== 'kill' || ENEMIES[quest.objective.enemyId] !== undefined
  )
);
check(
  'cada misión tiene texto de objetivo',
  QUESTS.every((quest) => {
    const text = questObjectiveText(quest, 0);
    return typeof text === 'string' && text.length > 0;
  })
);
check(
  'una misión de bajas muestra su contador',
  questObjectiveText(QUESTS[0], 1).includes('1/3') &&
    questObjectiveText(QUESTS[0], 1).includes('fangos')
);

let ok = true;
for (const [name, value] of Object.entries(results)) {
  console.log(`${value ? 'PASS' : 'FAIL'}  ${name}`);
  if (!value) ok = false;
}
console.log(`\n${QUESTS.length} misiones en la cadena`);
process.exit(ok ? 0 : 1);
