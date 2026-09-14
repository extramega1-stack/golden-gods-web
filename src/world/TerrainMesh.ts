import * as THREE from 'three';
import { TILE_SIZE } from '../config/constants';
import { levelToWorldY } from './heightmap';
import { Tile, type ZoneMap } from '../types';

const TOP_COLORS: Record<number, number> = {
  [Tile.Floor]: 0x2e3b2a,
  [Tile.Path]: 0x4a4033,
  [Tile.Arena]: 0x2a2334,
  [Tile.Wall]: 0x6b5a78,
};

const CLIFF_COLOR = 0x4a4257;

/** Nivel al que caen los faldones del borde del mapa: dibuja un muro perimetral. */
export const EDGE_DROP_LEVEL = -1;

/**
 * Construye el terreno como una única geometría: cada celda es una tapa plana a su altura
 * y, donde hay salto con la vecina, se añade un faldón vertical: eso es lo que se lee como
 * acantilado. Una sola malla = muy pocas draw calls, importante en el WebView de Android.
 */
export function buildTerrainMesh(zone: ZoneMap): THREE.Mesh {
  const positions: number[] = [];
  const colors: number[] = [];

  const pushVertex = (x: number, y: number, z: number, color: THREE.Color): void => {
    positions.push(x, y, z);
    colors.push(color.r, color.g, color.b);
  };

  const pushTriangle = (
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    cx: number,
    cy: number,
    cz: number,
    color: THREE.Color
  ): void => {
    pushVertex(ax, ay, az, color);
    pushVertex(bx, by, bz, color);
    pushVertex(cx, cy, cz, color);
  };

  const cellColor = (col: number, row: number): THREE.Color => {
    const base = new THREE.Color(TOP_COLORS[zone.data[row][col]] ?? 0x2e3b2a);
    const shade = (col + row) % 2 === 0 ? 0.93 : 1.05;
    return base.multiplyScalar(shade);
  };

  const cliffColor = new THREE.Color(CLIFF_COLOR);

  for (let row = 0; row < zone.rows; row++) {
    for (let col = 0; col < zone.cols; col++) {
      const level = zone.heights[row][col];
      const y = levelToWorldY(level);
      const x0 = col * TILE_SIZE;
      const x1 = x0 + TILE_SIZE;
      const z0 = row * TILE_SIZE;
      const z1 = z0 + TILE_SIZE;
      const color = cellColor(col, row);

      // Tapa de la celda (dos triángulos con normal +Y).
      pushTriangle(x0, y, z0, x1, y, z1, x1, y, z0, color);
      pushTriangle(x0, y, z0, x0, y, z1, x1, y, z1, color);

      // Faldones donde la vecina está más baja (o fuera del mapa).
      const lower = (nCol: number, nRow: number): number | null => {
        if (nCol < 0 || nRow < 0 || nCol >= zone.cols || nRow >= zone.rows) {
          return EDGE_DROP_LEVEL;
        }
        const nLevel = zone.heights[nRow][nCol];
        return nLevel < level ? nLevel : null;
      };

      const east = lower(col + 1, row);
      if (east !== null) {
        const yb = levelToWorldY(east);
        pushTriangle(x1, y, z0, x1, y, z1, x1, yb, z1, cliffColor);
        pushTriangle(x1, y, z0, x1, yb, z1, x1, yb, z0, cliffColor);
      }

      const west = lower(col - 1, row);
      if (west !== null) {
        const yb = levelToWorldY(west);
        pushTriangle(x0, y, z1, x0, y, z0, x0, yb, z0, cliffColor);
        pushTriangle(x0, y, z1, x0, yb, z0, x0, yb, z1, cliffColor);
      }

      const south = lower(col, row + 1);
      if (south !== null) {
        const yb = levelToWorldY(south);
        pushTriangle(x1, y, z1, x0, y, z1, x0, yb, z1, cliffColor);
        pushTriangle(x1, y, z1, x0, yb, z1, x1, yb, z1, cliffColor);
      }

      const north = lower(col, row - 1);
      if (north !== null) {
        const yb = levelToWorldY(north);
        pushTriangle(x0, y, z0, x1, y, z0, x1, yb, z0, cliffColor);
        pushTriangle(x0, y, z0, x1, yb, z0, x0, yb, z0, cliffColor);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'terrain';
  return mesh;
}
