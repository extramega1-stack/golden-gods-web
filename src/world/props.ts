import { TILE_SIZE } from '../config/constants';
import { createRng } from './rng';
import { Tile, type ZoneMap } from '../types';

export type PropRegion = 'prado' | 'ruinas' | 'cima';

export interface PropPlacement {
  propId: string;
  x: number;
  z: number;
  rotY: number;
  scale: number;
}

export interface KeepClear {
  col: number;
  row: number;
  radius: number;
}

/**
 * Qué se reparte en cada zona. Los pesos no hace falta que sumen 100: se elige por
 * acumulación sobre el total.
 */
export const PROP_TABLES: Record<PropRegion, { id: string; weight: number }[]> = {
  prado: [
    { id: 'tree-a', weight: 18 },
    { id: 'tree-b', weight: 12 },
    { id: 'trees-medium', weight: 10 },
    { id: 'trees-small', weight: 12 },
    { id: 'trees-large', weight: 4 },
    { id: 'stump-a', weight: 8 },
    { id: 'rock-a', weight: 12 },
    { id: 'rock-c', weight: 8 },
    { id: 'hill-a', weight: 10 },
    { id: 'mountain-trees', weight: 4 },
  ],
  ruinas: [
    { id: 'rock-a', weight: 18 },
    { id: 'rock-c', weight: 14 },
    { id: 'rock-e', weight: 12 },
    { id: 'stump-b', weight: 10 },
    { id: 'tree-b', weight: 8 },
    { id: 'crate-big', weight: 10 },
    { id: 'crate-small', weight: 8 },
    { id: 'barrel', weight: 8 },
    { id: 'sack', weight: 6 },
    { id: 'wheelbarrow', weight: 4 },
    { id: 'weaponrack', weight: 4 },
    { id: 'target', weight: 4 },
  ],
  cima: [
    { id: 'rock-a', weight: 22 },
    { id: 'rock-c', weight: 18 },
    { id: 'rock-e', weight: 16 },
    { id: 'mountain-trees', weight: 14 },
    { id: 'stump-a', weight: 10 },
    { id: 'stone', weight: 10 },
    { id: 'lumber', weight: 6 },
    { id: 'tent', weight: 4 },
  ],
};

/** Probabilidad de que una celda libre reciba un prop, por zona. */
export const PROP_DENSITY: Record<PropRegion, number> = {
  prado: 0.11,
  ruinas: 0.13,
  cima: 0.09,
};

export function regionOf(row: number): PropRegion {
  if (row <= 13) {
    return 'prado';
  }
  if (row <= 22) {
    return 'ruinas';
  }
  return 'cima';
}

/** Todos los props que el juego puede llegar a usar, para precargarlos. */
export const ALL_PROP_IDS = [
  ...new Set(Object.values(PROP_TABLES).flatMap((table) => table.map((entry) => entry.id))),
];

function pickWeighted(entries: { id: string; weight: number }[], roll: number): string {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let threshold = roll * total;
  for (const entry of entries) {
    threshold -= entry.weight;
    if (threshold <= 0) {
      return entry.id;
    }
  }
  return entries[entries.length - 1].id;
}

function isKeptClear(col: number, row: number, keepClear: KeepClear[]): boolean {
  return keepClear.some(
    (zone) => Math.hypot(col - zone.col, row - zone.row) <= zone.radius
  );
}

/**
 * Reparte la decoración por la zona. Es una función pura: con la misma semilla devuelve
 * exactamente lo mismo, así que se puede probar sin navegador y el mundo es estable.
 *
 * Los props son decorativos: no bloquean el paso ni tocan la navegación.
 */
export function planProps(
  zone: ZoneMap,
  seed: number,
  keepClear: KeepClear[] = []
): PropPlacement[] {
  const rng = createRng(seed);
  const placements: PropPlacement[] = [];

  for (let row = 1; row < zone.rows - 1; row++) {
    const region = regionOf(row);
    const table = PROP_TABLES[region];
    const density = PROP_DENSITY[region];

    for (let col = 1; col < zone.cols - 1; col++) {
      if (zone.data[row][col] === Tile.Wall) {
        continue;
      }
      if (isKeptClear(col, row, keepClear)) {
        continue;
      }
      if (rng() > density) {
        continue;
      }

      const propId = pickWeighted(table, rng());
      const jitter = 0.35;
      placements.push({
        propId,
        x: (col + 0.5 + (rng() - 0.5) * jitter * 2) * TILE_SIZE,
        z: (row + 0.5 + (rng() - 0.5) * jitter * 2) * TILE_SIZE,
        rotY: rng() * Math.PI * 2,
        scale: 0.85 + rng() * 0.35,
      });
    }
  }

  return placements;
}
