import type * as THREE from 'three';
import { Navigation } from './Navigation';
import { buildTerrainMesh } from './TerrainMesh';
import type { ZoneMap } from '../types';

export class Zone {
  readonly nav: Navigation;
  readonly mesh: THREE.Mesh;

  constructor(readonly map: ZoneMap) {
    this.nav = new Navigation(map);
    this.mesh = buildTerrainMesh(map);
  }

  get width(): number {
    return this.map.cols;
  }

  get depth(): number {
    return this.map.rows;
  }
}
