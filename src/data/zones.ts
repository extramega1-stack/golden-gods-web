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

function baseTile(r: number): number {
  if (r <= 13) {
    return Tile.Floor;
  }
  if (r <= 22) {
    return Tile.Path;
  }
  return Tile.Arena;
}

function buildWorld(): number[][] {
  const data: number[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const row: number[] = [];
    for (let c = 0; c < COLS; c++) {
      const border = r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1;
      if (border || WALLS.has(`${c},${r}`)) {
        row.push(Tile.Wall);
      } else {
        row.push(baseTile(r));
      }
    }
    data.push(row);
  }
  return data;
}

export const STARTER_ZONE: ZoneMap = {
  cols: COLS,
  rows: ROWS,
  data: buildWorld(),
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

export const STARTER_SPAWN = { x: 15.5, y: 3.5 };

export const STARTER_SMITH = { x: 18.5, y: 4.5, radius: 1.8 };

export const STARTER_SPAWNS: SpawnDef[] = [
  { id: 'a1', x: 5.5, y: 5.5, enemyId: 'slime', respawnSeconds: 6 },
  { id: 'a2', x: 12.5, y: 4.5, enemyId: 'slime', respawnSeconds: 6 },
  { id: 'a3', x: 20.5, y: 6.5, enemyId: 'slime', respawnSeconds: 6 },
  { id: 'a4', x: 8.5, y: 11.5, enemyId: 'slime', respawnSeconds: 7 },
  { id: 'a5', x: 24.5, y: 10.5, enemyId: 'slime', respawnSeconds: 7 },

  { id: 'b1', x: 6.5, y: 17.5, enemyId: 'slime', respawnSeconds: 7 },
  { id: 'b2', x: 22.5, y: 16.5, enemyId: 'slime', respawnSeconds: 7 },
  { id: 'b3', x: 12.5, y: 20.5, enemyId: 'brute', respawnSeconds: 12 },
  { id: 'b4', x: 25.5, y: 20.5, enemyId: 'brute', respawnSeconds: 12 },

  { id: 'boss', x: 15.5, y: 26.5, enemyId: 'titan', respawnSeconds: 60 },
];
