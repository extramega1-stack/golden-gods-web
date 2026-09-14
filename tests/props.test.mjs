import { readFileSync, existsSync } from 'node:fs';
import {
  planProps,
  PROP_TABLES,
  ALL_PROP_IDS,
  regionOf,
  createRng,
  STARTER_ZONE,
  STARTER_SPAWN,
  STARTER_SMITH,
  STARTER_SPAWNS,
  TILE_SIZE,
  Tile,
} from './.bundle/entry.mjs';

const results = {};
const check = (name, value) => {
  results[name] = value === true;
};

const zone = STARTER_ZONE;
const keepClear = [
  { col: STARTER_SPAWN.col, row: STARTER_SPAWN.row, radius: 3 },
  { col: STARTER_SMITH.col, row: STARTER_SMITH.row, radius: 2.5 },
  ...STARTER_SPAWNS.map((spawn) => ({ col: spawn.col, row: spawn.row, radius: 1.5 })),
];

const placements = planProps(zone, 20260914, keepClear);

// --- Semilla: el mundo es estable ---
const again = planProps(zone, 20260914, keepClear);
check('con la misma semilla el reparto es idéntico', JSON.stringify(again) === JSON.stringify(placements));

const other = planProps(zone, 7, keepClear);
check('con otra semilla el reparto cambia', JSON.stringify(other) !== JSON.stringify(placements));

const rngA = createRng(1);
const rngB = createRng(1);
check('el generador es reproducible', rngA() === rngB() && rngA() === rngB());
check(
  'el generador reparte en [0,1)',
  (() => {
    const rng = createRng(99);
    for (let i = 0; i < 500; i++) {
      const value = rng();
      if (!(value >= 0 && value < 1)) {
        return false;
      }
    }
    return true;
  })()
);

// --- El reparto es sensato ---
check('hay decoración de sobra', placements.length > 40);
check('el reparto no se desborda', placements.length < 260);

const insideMap = placements.every(
  (p) => p.x > 0 && p.z > 0 && p.x < zone.cols * TILE_SIZE && p.z < zone.rows * TILE_SIZE
);
check('todo prop cae dentro del mapa', insideMap);

const notOnWall = placements.every((p) => {
  const col = Math.floor(p.x / TILE_SIZE);
  const row = Math.floor(p.z / TILE_SIZE);
  return zone.data[row][col] !== Tile.Wall;
});
check('ningún prop se coloca sobre un muro', notOnWall);

const respectsClear = placements.every((p) => {
  const col = Math.floor(p.x / TILE_SIZE);
  const row = Math.floor(p.z / TILE_SIZE);
  const near = keepClear.some((zone) => Math.hypot(col - zone.col, row - zone.row) <= zone.radius - 1);
  return !near;
});
check('se respetan las zonas reservadas (inicio, herrería, apariciones)', respectsClear);

const knownProps = new Set(Object.values(PROP_TABLES).flatMap((t) => t.map((e) => e.id)));
check('todos los props repartidos existen en las tablas', placements.every((p) => knownProps.has(p.propId)));

const scaleRange = placements.every((p) => p.scale >= 0.85 && p.scale <= 1.2);
const rotationRange = placements.every((p) => p.rotY >= 0 && p.rotY < Math.PI * 2 + 1e-9);
check('escala y rotación están en rango', scaleRange && rotationRange);

// --- Se reparte en las tres zonas ---
const zonesUsed = new Set(
  placements.map((p) => regionOf(Math.floor(p.z / TILE_SIZE)))
);
check(
  'las tres regiones reciben decoración',
  zonesUsed.has('prado') && zonesUsed.has('ruinas') && zonesUsed.has('cima')
);

// --- Cada prop tiene su fichero ---
let missing = 0;
let invalid = 0;
let totalBytes = 0;
for (const id of ALL_PROP_IDS) {
  const path = `public/models/props/${id}.glb`;
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

check('todos los props del juego tienen GLB', missing === 0);
check('todos los props son GLB válidos', invalid === 0);
check(
  'los props pesan poco en total (menos de 1 MB)',
  totalBytes > 0 && totalBytes < 1024 * 1024
);
check(
  'no hay props en las tablas sin fichero',
  ALL_PROP_IDS.every((id) => existsSync(`public/models/props/${id}.glb`))
);

let ok = true;
for (const [name, value] of Object.entries(results)) {
  console.log(`${value ? 'PASS' : 'FAIL'}  ${name}`);
  if (!value) ok = false;
}
console.log(
  `\nrepartidos ${placements.length} props de ${ALL_PROP_IDS.length} tipos, ${(totalBytes / 1024).toFixed(0)} KB de GLB`
);
process.exit(ok ? 0 : 1);
