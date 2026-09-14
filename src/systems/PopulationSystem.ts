import type Phaser from 'phaser';
import { PopulationHero } from '../entities/PopulationHero';
import type { MapLoader } from '../world/MapLoader';

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

export class PopulationSystem {
  private readonly heroes: PopulationHero[] = [];

  constructor(scene: Phaser.Scene, map: MapLoader, count: number) {
    for (let i = 0; i < count; i++) {
      const pos = PopulationSystem.randomSpawn(map);
      this.heroes.push(
        new PopulationHero(
          scene,
          map,
          pos.x,
          pos.y,
          NAMES[i % NAMES.length],
          COLORS[i % COLORS.length]
        )
      );
    }
  }

  private static randomSpawn(map: MapLoader): { x: number; y: number } {
    for (let i = 0; i < 30; i++) {
      const x = 1 + Math.random() * (map.cols - 2);
      const y = 1 + Math.random() * (map.rows - 2);
      if (map.isAreaWalkable(x, y, 0.3)) {
        return { x, y };
      }
    }
    return { x: map.cols / 2, y: map.rows / 2 };
  }

  update(dt: number, now: number): void {
    for (const hero of this.heroes) {
      hero.update(dt, now);
    }
  }
}
