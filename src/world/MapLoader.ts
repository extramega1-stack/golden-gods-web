import type Phaser from 'phaser';
import { Tile, type ZoneMap } from '../types';
import { TILE_W } from '../config/constants';
import { HALF_H, HALF_W, worldToScreen } from './iso';
import { makeIsoTile } from './textures';

export const TILE_TEXTURE = {
  floor: 'tile-floor',
  wall: 'tile-wall',
  path: 'tile-path',
  arena: 'tile-arena',
} as const;

export class MapLoader {
  readonly cols: number;
  readonly rows: number;
  private readonly data: number[][];

  constructor(
    private readonly scene: Phaser.Scene,
    map: ZoneMap
  ) {
    this.data = map.data;
    this.rows = map.rows;
    this.cols = map.cols;
    this.createTextures();
    this.render();
  }

  private createTextures(): void {
    makeIsoTile(this.scene, TILE_TEXTURE.floor, 0x2e3b2a, 0x24301f);
    makeIsoTile(this.scene, TILE_TEXTURE.path, 0x4a4033, 0x3a3228);
    makeIsoTile(this.scene, TILE_TEXTURE.wall, 0x6b5a78, 0x4b3f55);
    makeIsoTile(this.scene, TILE_TEXTURE.arena, 0x2a2334, 0x1e1a26);
  }

  private render(): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tile = this.data[r][c];
        const key =
          tile === Tile.Wall
            ? TILE_TEXTURE.wall
            : tile === Tile.Path
              ? TILE_TEXTURE.path
              : tile === Tile.Arena
                ? TILE_TEXTURE.arena
                : TILE_TEXTURE.floor;
        const p = worldToScreen(c + 0.5, r + 0.5);
        this.scene.add
          .image(p.x, p.y, key)
          .setOrigin(0.5, 0.5)
          .setDepth(-100000 + (r * this.cols + c) * 0.01);
      }
    }
  }

  isWalkable(col: number, row: number): boolean {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) {
      return false;
    }
    return this.data[row][col] !== Tile.Wall;
  }

  isAreaWalkable(wx: number, wy: number, radius: number): boolean {
    const minC = Math.floor(wx - radius);
    const maxC = Math.floor(wx + radius);
    const minR = Math.floor(wy - radius);
    const maxR = Math.floor(wy + radius);
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (!this.isWalkable(c, r)) {
          return false;
        }
      }
    }
    return true;
  }

  getScreenBounds(): { x: number; y: number; width: number; height: number } {
    const minX = -this.rows * HALF_W - TILE_W;
    const maxX = this.cols * HALF_W + TILE_W;
    const minY = -TILE_W;
    const maxY = (this.cols + this.rows) * HALF_H + TILE_W;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
}
