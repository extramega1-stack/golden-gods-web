import {
  Navigation,
  cellToWorld,
  worldToCell,
  levelToWorldY,
  buildTerrainMesh,
  EDGE_DROP_LEVEL,
  STARTER_ZONE,
  STARTER_SPAWN,
  STARTER_SPAWNS,
  TILE_SIZE,
  HEIGHT_STEP,
  MAX_STEP_LEVELS,
  Tile,
} from './.bundle/entry.mjs';

const zone = STARTER_ZONE;
const nav = new Navigation(zone);
const at = (col, row) => cellToWorld(col, row);
const results = {};
const check = (name, value) => {
  results[name] = value === true;
};

// Rejillas
check('rejilla 30x30', zone.cols === 30 && zone.rows === 30);
check(
  'alturas del mismo tamaño que tiles',
  zone.heights.length === 30 && zone.heights.every((r) => r.length === 30)
);
check(
  'niveles enteros',
  zone.heights.every((r) => r.every((h) => Number.isInteger(h)))
);
check('tamaño de celda y escalón', TILE_SIZE === 4 && HEIGHT_STEP === 1.6 && MAX_STEP_LEVELS === 1);

// Conversiones
const cell = at(7, 11);
const back = worldToCell(cell.x, cell.z);
check('ida y vuelta celda↔mundo', back.col === 7 && back.row === 11);
check('altura a Y de mundo', levelToWorldY(2) === 2 * HEIGHT_STEP);

// Spawns sobre suelo transitable
const spawnCell = at(STARTER_SPAWN.col, STARTER_SPAWN.row);
check('spawn transitable', nav.isWalkablePoint(spawnCell.x, spawnCell.z));
check(
  'todos los spawns transitables',
  STARTER_SPAWNS.every((s) => {
    const p = at(s.col, s.row);
    return nav.isWalkablePoint(p.x, p.z);
  })
);

// Muros y bordes
check('muro no transitable', !nav.isWalkableCell(10, 8));
check('muro con altura elevada', zone.heights[8][10] === 2);
check('fuera del mapa no transitable', !nav.isWalkablePoint(-1, 40));
check('área sobre muro bloqueada', !nav.isAreaWalkable(at(10, 8).x, at(10, 8).z, 0.8, 0));
check('muro marcado como Tile.Wall', zone.data[8][10] === Tile.Wall);

// Regla de escalón: mesas elevadas dos niveles
const mesa = at(10, 18);
check('mesa elevada 2 niveles sobre su región', zone.heights[18][10] === 3);
check('no se sube a la mesa desde el nivel de al lado', !nav.isAreaWalkable(mesa.x, mesa.z, 0.8, 1));
const mesaEdge = at(11, 18);
check(
  'la celda contigua a la mesa sí es transitable',
  zone.heights[18][11] === 1 && nav.isAreaWalkable(mesaEdge.x, mesaEdge.z, 0.8, 1)
);

// Escalón de un nivel: Prado(0) → Ruinas(1)
check('la frontera sube un nivel', zone.heights[13][15] === 0 && zone.heights[14][15] === 1);
check('escalón de un nivel permitido', nav.isAreaWalkable(at(15, 14).x, at(15, 14).z, 0.8, 0));

// Salto de dos niveles: bloqueado
const cliff = at(15, 23);
check('salto de dos niveles bloqueado', !nav.isAreaWalkable(cliff.x, cliff.z, 0.8, 0));
check('bajada de un nivel permitida', nav.isAreaWalkable(cliff.x, cliff.z, 0.8, 1));

// Malla del terreno construida de verdad (sin WebGL: solo geometría)
const mesh = buildTerrainMesh(zone);
const position = mesh.geometry.getAttribute('position');
const color = mesh.geometry.getAttribute('color');
const normal = mesh.geometry.getAttribute('normal');
const posArray = position.array;

check('la malla tiene vértices', position.count > 0);
check('vértices en múltiplos de triángulo', position.count % 3 === 0);
check('un color por vértice', color.count === position.count);
check('una normal por vértice', normal.count === position.count);
check('sin NaN en posiciones', !Array.from(posArray).some((v) => Number.isNaN(v)));
check(
  'alturas dentro del rango esperado',
  (() => {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 1; i < posArray.length; i += 3) {
      min = Math.min(min, posArray[i]);
      max = Math.max(max, posArray[i]);
    }
    // El borde del mapa cae a EDGE_DROP_LEVEL y lo más alto es un muro de la tercera región.
    // Con tolerancia: la geometría se guarda en float32.
    return (
      Math.abs(min - EDGE_DROP_LEVEL * HEIGHT_STEP) < 1e-5 &&
      Math.abs(max - 4 * HEIGHT_STEP) < 1e-5
    );
  })()
);
check(
  'coordenadas X/Z dentro del mapa',
  (() => {
    const limit = Math.max(zone.cols, zone.rows) * TILE_SIZE;
    for (let i = 0; i < posArray.length; i += 3) {
      if (posArray[i] < 0 || posArray[i] > limit || posArray[i + 2] < 0 || posArray[i + 2] > limit) {
        return false;
      }
    }
    return true;
  })()
);

let ok = true;
for (const [name, value] of Object.entries(results)) {
  console.log(`${value ? 'PASS' : 'FAIL'}  ${name}`);
  if (!value) ok = false;
}
console.log(`\nterreno: ${position.count / 3} triángulos, ${position.count} vértices`);
process.exit(ok ? 0 : 1);
