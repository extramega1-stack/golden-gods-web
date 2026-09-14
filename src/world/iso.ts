import { TILE_W, TILE_H } from '../config/constants';
import type { Vec2 } from '../types';

export const HALF_W = TILE_W / 2;
export const HALF_H = TILE_H / 2;

export function worldToScreen(wx: number, wy: number): Vec2 {
  return {
    x: (wx - wy) * HALF_W,
    y: (wx + wy) * HALF_H,
  };
}

export function screenToWorld(sx: number, sy: number): Vec2 {
  return {
    x: (sx / HALF_W + sy / HALF_H) / 2,
    y: (sy / HALF_H - sx / HALF_W) / 2,
  };
}

export function screenDirToWorldDir(dx: number, dy: number): Vec2 {
  const x = dx / TILE_W + dy / TILE_H;
  const y = -dx / TILE_W + dy / TILE_H;
  const len = Math.hypot(x, y);
  if (len === 0) {
    return { x: 0, y: 0 };
  }
  return { x: x / len, y: y / len };
}

export function depthFor(wx: number, wy: number): number {
  return (wx + wy) * HALF_H;
}
