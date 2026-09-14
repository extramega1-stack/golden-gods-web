import { TILE_SIZE } from '../config/constants';
import { PopulationHero3D } from '../entities/PopulationHero3D';
import type { WorldRefs } from '../entities/Unit';
import type { Wc3Camera } from '../engine/Wc3Camera';

const NAMES = [
  'Kira',
  'Dorn',
  'Mavel',
  'Rook',
  'Selene',
  'Tarek',
  'Ula',
  'Vex',
  'Nyx',
  'Orin',
  'Pia',
  'Quill',
];

const COLORS = [0x8fd0ff, 0xe0a0c0, 0xa0e0c0, 0xc0b0ff, 0xffc890, 0x90d0d0];

/** Población simulada: héroes que deambulan para dar vida al mundo. */
export class PopulationSystem {
  private readonly heroes: PopulationHero3D[] = [];

  constructor(refs: WorldRefs, rig: Wc3Camera, host: HTMLElement, count: number) {
    for (let i = 0; i < count; i++) {
      const spot = PopulationSystem.randomSpawn(refs);
      this.heroes.push(
        new PopulationHero3D(
          refs,
          rig,
          host,
          spot.x,
          spot.z,
          NAMES[i % NAMES.length],
          COLORS[i % COLORS.length]
        )
      );
    }
  }

  private static randomSpawn(refs: WorldRefs): { x: number; z: number } {
    const nav = refs.nav;
    for (let i = 0; i < 30; i++) {
      const col = 1 + Math.floor(Math.random() * (nav.cols - 2));
      const row = 1 + Math.floor(Math.random() * (nav.rows - 2));
      if (nav.isWalkableCell(col, row)) {
        return { x: (col + 0.5) * TILE_SIZE, z: (row + 0.5) * TILE_SIZE };
      }
    }
    return { x: (nav.cols / 2) * TILE_SIZE, z: (nav.rows / 2) * TILE_SIZE };
  }

  update(dt: number, now: number): void {
    for (const hero of this.heroes) {
      hero.update(dt, now);
    }
  }

  dispose(): void {
    for (const hero of this.heroes) {
      hero.dispose();
    }
    this.heroes.length = 0;
  }
}
