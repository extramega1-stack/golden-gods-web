import { Tile, type Region, type SpawnDef, type ZoneMap } from '../types';

const COLS = 30;
const ROWS = 30;

const WALLS = new Set([
  '10,8',
  '11,8',
  '10,9',
  '18,17',
  '19,17',
  '18,19',
  '3,20',
  '4,20',
  '7,6',
  '22,8',
  '13,25',
  '18,25',
  '26,12',
  '5,24',
]);

/** Mesas elevadas: se levantan dos niveles sobre su región (acantilado por los cuatro lados). */
const MESAS = [
  { col: 8, row: 18, radius: 2.6 },
  { col: 22, row: 8, radius: 2.2 },
];

function baseTile(row: number): number {
  if (row <= 13) {
    return Tile.Floor;
  }
  if (row <= 22) {
    return Tile.Path;
  }
  return Tile.Arena;
}

/** Cada región está un nivel por encima de la anterior: se sube por un escalón de un nivel. */
function regionLevel(row: number): number {
  if (row <= 13) {
    return 0;
  }
  if (row <= 22) {
    return 1;
  }
  return 2;
}

function buildTiles(): number[][] {
  const data: number[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const row: number[] = [];
    for (let c = 0; c < COLS; c++) {
      const border = r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1;
      row.push(border || WALLS.has(`${c},${r}`) ? Tile.Wall : baseTile(r));
    }
    data.push(row);
  }
  return data;
}

function inMesa(col: number, row: number): boolean {
  return MESAS.some((m) => Math.hypot(col - m.col, row - m.row) <= m.radius);
}

function buildHeights(tiles: number[][]): number[][] {
  const heights: number[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const row: number[] = [];
    for (let c = 0; c < COLS; c++) {
      const base = regionLevel(r);
      const wall = tiles[r][c] === Tile.Wall;
      row.push(wall || inMesa(c, r) ? base + 2 : base);
    }
    heights.push(row);
  }
  return heights;
}

const TILES = buildTiles();

export const STARTER_ZONE: ZoneMap = {
  cols: COLS,
  rows: ROWS,
  data: TILES,
  heights: buildHeights(TILES),
};

export const STARTER_REGIONS: Region[] = [
  { name: 'Prado Dorado', fromRow: 1, toRow: 13 },
  { name: 'Ruinas de Khar', fromRow: 14, toRow: 22 },
  { name: 'Cima del Titán', fromRow: 23, toRow: 28 },
];

export function regionAt(row: number): string {
  const found = STARTER_REGIONS.find((rg) => row >= rg.fromRow && row <= rg.toRow);
  return found ? found.name : '';
}

export const STARTER_SPAWN = { col: 15, row: 3 };

export const STARTER_SMITH = { col: 18, row: 4, radius: 1.8 };

export const STARTER_SPAWNS: SpawnDef[] = [
  { id: 'a1', col: 5, row: 5, enemyId: 'slime', respawnSeconds: 6 },
  { id: 'a2', col: 12, row: 4, enemyId: 'slime', respawnSeconds: 6 },
  { id: 'a3', col: 20, row: 6, enemyId: 'slime', respawnSeconds: 6 },
  { id: 'a4', col: 8, row: 11, enemyId: 'slime', respawnSeconds: 7 },
  { id: 'a5', col: 24, row: 10, enemyId: 'slime', respawnSeconds: 7 },

  { id: 'b1', col: 6, row: 17, enemyId: 'slime', respawnSeconds: 7 },
  { id: 'b2', col: 22, row: 16, enemyId: 'slime', respawnSeconds: 7 },
  { id: 'b3', col: 12, row: 20, enemyId: 'brute', respawnSeconds: 12 },
  { id: 'b4', col: 25, row: 20, enemyId: 'brute', respawnSeconds: 12 },

  { id: 'boss', col: 15, row: 26, enemyId: 'titan', respawnSeconds: 60 },
];
