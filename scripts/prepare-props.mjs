import { NodeIO } from '@gltf-transform/core';
import { mkdirSync, existsSync, writeFileSync, statSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Descarga los props del terreno (naturaleza y decoración) del pack medieval CC0 de
 * KayKit y los convierte a GLB autocontenido en public/models/props/.
 *
 * Los props vienen como .gltf con el .bin y un atlas de textura compartido al lado, con
 * rutas relativas. Se descarga cada pieza respetando esas rutas y luego se empaqueta todo
 * en un GLB. El atlas son ~15 KB, así que embeberlo en cada prop no compensa complicarlo
 * más; el juego comparte una sola copia en memoria al cargarlos.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = resolve(root, '.model-cache/props');
const outDir = resolve(root, 'public/models/props');

const ASSETS =
  'https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0/main/addons/kaykit_medieval_hexagon_pack/Assets/gltf/';

/** id del juego -> ruta dentro del pack */
const PROPS = {
  'tree-a': 'decoration/nature/tree_single_A',
  'tree-b': 'decoration/nature/tree_single_B',
  'trees-large': 'decoration/nature/trees_A_large',
  'trees-medium': 'decoration/nature/trees_A_medium',
  'trees-small': 'decoration/nature/trees_A_small',
  'stump-a': 'decoration/nature/tree_single_A_cut',
  'stump-b': 'decoration/nature/tree_single_B_cut',
  'rock-a': 'decoration/nature/rock_single_A',
  'rock-c': 'decoration/nature/rock_single_C',
  'rock-e': 'decoration/nature/rock_single_E',
  'hill-a': 'decoration/nature/hill_single_A',
  'mountain-trees': 'decoration/nature/mountain_A_grass_trees',
  barrel: 'decoration/props/barrel',
  'crate-big': 'decoration/props/crate_A_big',
  'crate-small': 'decoration/props/crate_A_small',
  sack: 'decoration/props/sack',
  lumber: 'decoration/props/resource_lumber',
  stone: 'decoration/props/resource_stone',
  tent: 'decoration/props/tent',
  weaponrack: 'decoration/props/weaponrack',
  target: 'decoration/props/target',
  wheelbarrow: 'decoration/props/wheelbarrow',
};

async function fetchBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar ${url}: HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function downloadTo(url, destination) {
  if (existsSync(destination)) {
    return;
  }
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, await fetchBuffer(url));
}

mkdirSync(cacheDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

const io = new NodeIO();
let total = 0;

for (const [id, path] of Object.entries(PROPS)) {
  const dir = resolve(cacheDir, id);
  const gltfUrl = `${ASSETS}${path}.gltf`;
  const gltfFile = resolve(dir, `${id}.gltf`);

  await downloadTo(gltfUrl, gltfFile);

  // Las URIs del gltf son relativas a su propia ubicación: se resuelven como URLs.
  const definition = JSON.parse(readFileSync(gltfFile, 'utf8'));
  const resources = [
    ...(definition.buffers ?? []).map((entry) => entry.uri),
    ...(definition.images ?? []).map((entry) => entry.uri),
  ].filter((uri) => typeof uri === 'string' && !uri.startsWith('data:'));

  for (const uri of new Set(resources)) {
    const remote = new URL(uri, gltfUrl).toString();
    const local = resolve(dir, uri);
    await downloadTo(remote, local);
  }

  const doc = await io.read(gltfFile);
  const target = resolve(outDir, `${id}.glb`);
  await io.write(target, doc);

  const size = statSync(target).size;
  if (readFileSync(target).toString('ascii', 0, 4) !== 'glTF') {
    throw new Error(`${id}.glb no tiene cabecera GLB`);
  }
  total += size;
  console.log(`${id.padEnd(16)} ${(size / 1024).toFixed(0).padStart(4)} KB`);
}

console.log(`\n${Object.keys(PROPS).length} props, ${(total / 1024).toFixed(0)} KB en total`);
