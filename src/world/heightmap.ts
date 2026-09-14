import { HEIGHT_STEP, TILE_SIZE } from '../config/constants';

export function levelToWorldY(level: number): number {
  return level * HEIGHT_STEP;
}

export function cellToWorld(col: number, row: number): { x: number; z: number } {
  return { x: (col + 0.5) * TILE_SIZE, z: (row + 0.5) * TILE_SIZE };
}

export function worldToCell(x: number, z: number): { col: number; row: number } {
  return { col: Math.floor(x / TILE_SIZE), row: Math.floor(z / TILE_SIZE) };
}

export function clampToMap(
  x: number,
  z: number,
  cols: number,
  rows: number
): { x: number; z: number } {
  return {
    x: Math.min(Math.max(x, 0), cols * TILE_SIZE),
    z: Math.min(Math.max(z, 0), rows * TILE_SIZE),
  };
}
