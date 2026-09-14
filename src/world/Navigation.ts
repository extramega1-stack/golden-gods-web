import { MAX_STEP_LEVELS, TILE_SIZE } from '../config/constants';
import { worldToCell } from './heightmap';
import { Tile, type ZoneMap } from '../types';

/**
 * Navegación por rejilla con regla de escalón: no se puede pasar de una celda a otra
 * si la diferencia de altura supera MAX_STEP_LEVELS (el acantilado infranqueable de WC3).
 */
export class Navigation {
  constructor(private readonly zone: ZoneMap) {}

  get cols(): number {
    return this.zone.cols;
  }

  get rows(): number {
    return this.zone.rows;
  }

  inBounds(col: number, row: number): boolean {
    return col >= 0 && row >= 0 && col < this.zone.cols && row < this.zone.rows;
  }

  isWalkableCell(col: number, row: number): boolean {
    return this.inBounds(col, row) && this.zone.data[row][col] !== Tile.Wall;
  }

  levelAtCell(col: number, row: number): number {
    if (!this.inBounds(col, row)) {
      return Number.NEGATIVE_INFINITY;
    }
    return this.zone.heights[row][col];
  }

  levelAt(x: number, z: number): number {
    const { col, row } = worldToCell(x, z);
    return this.levelAtCell(col, row);
  }

  isWalkablePoint(x: number, z: number): boolean {
    const { col, row } = worldToCell(x, z);
    return this.isWalkableCell(col, row);
  }

  /**
   * Comprueba que un círculo de radio `radius` (unidades de mundo) quepa desde la altura
   * `currentLevel`: todas las celdas que toca deben ser transitables y estar dentro del
   * escalón permitido.
   */
  isAreaWalkable(x: number, z: number, radius: number, currentLevel: number): boolean {
    const size = TILE_SIZE;
    const minCol = Math.floor((x - radius) / size);
    const maxCol = Math.floor((x + radius) / size);
    const minRow = Math.floor((z - radius) / size);
    const maxRow = Math.floor((z + radius) / size);

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (!this.isWalkableCell(col, row)) {
          return false;
        }
        if (Math.abs(this.levelAtCell(col, row) - currentLevel) > MAX_STEP_LEVELS) {
          return false;
        }
      }
    }
    return true;
  }
}
