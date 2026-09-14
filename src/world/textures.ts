import Phaser from 'phaser';
import { TILE_W, TILE_H } from '../config/constants';
import { HALF_W, HALF_H } from './iso';

export function makeIsoTile(
  scene: Phaser.Scene,
  key: string,
  fill: number,
  stroke: number
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const g = scene.add.graphics();
  g.fillStyle(fill, 1);
  g.lineStyle(1, stroke, 1);
  g.beginPath();
  g.moveTo(HALF_W, 0);
  g.lineTo(TILE_W, HALF_H);
  g.lineTo(HALF_W, TILE_H);
  g.lineTo(0, HALF_H);
  g.closePath();
  g.fillPath();
  g.strokePath();
  g.generateTexture(key, TILE_W, TILE_H);
  g.destroy();
}

export function makeCircle(
  scene: Phaser.Scene,
  key: string,
  radius: number,
  fill: number,
  stroke?: number
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const size = radius * 2;
  const g = scene.add.graphics();
  g.fillStyle(fill, 1);
  g.fillCircle(radius, radius, radius);
  if (stroke !== undefined) {
    g.lineStyle(2, stroke, 1);
    g.strokeCircle(radius, radius, radius);
  }
  g.generateTexture(key, size, size);
  g.destroy();
}
