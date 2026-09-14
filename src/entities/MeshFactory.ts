import * as THREE from 'three';

export interface UnitMeshOptions {
  color: number;
  radius: number;
  height: number;
  markerColor?: number;
}

/**
 * Primitivas 3D por código: una cápsula como cuerpo y un cono delante que marca hacia
 * dónde mira la unidad. Sustituible por modelos reales sin tocar la lógica.
 */
export function createUnitMesh(options: UnitMeshOptions): THREE.Group {
  const group = new THREE.Group();
  const { radius, height } = options;
  const bodyLength = Math.max(0.01, height - radius * 2);

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, bodyLength, 6, 12),
    new THREE.MeshLambertMaterial({ color: options.color })
  );
  body.position.y = radius + bodyLength / 2;
  group.add(body);

  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 0.45, radius * 1.1, 8),
    new THREE.MeshLambertMaterial({ color: options.markerColor ?? options.color })
  );
  marker.rotation.x = Math.PI / 2;
  marker.position.set(0, height * 0.62, radius + radius * 0.5);
  group.add(marker);

  return group;
}
