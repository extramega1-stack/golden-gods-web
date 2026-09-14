import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadAndConvert } from './lib/gltf-to-glb.mjs';

/**
 * Descarga las armas del pack de aventureros CC0 de KayKit y las convierte a GLB en
 * public/models/weapons/.
 *
 * Los personajes ya traen nodos de enganche con nombre propio (1H_Sword, 2H_Axe,
 * Round_Shield...), así que el arma solo hay que colgarla del nodo que le toca.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = resolve(root, '.model-cache/weapons');
const outDir = resolve(root, 'public/models/weapons');

const ASSETS =
  'https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures/Assets/gltf/';

/** id del juego -> nombre del fichero en el pack */
const WEAPONS = {
  'sword-1h': 'sword_1handed',
  'shield-round': 'shield_round',
  'axe-2h': 'axe_2handed',
  'crossbow-2h': 'crossbow_2handed',
  staff: 'staff',
  dagger: 'dagger',
};

let total = 0;
for (const [id, file] of Object.entries(WEAPONS)) {
  const { size } = await downloadAndConvert({
    remoteGltfUrl: `${ASSETS}${file}.gltf`,
    id,
    cacheDir,
    outDir,
  });
  total += size;
  console.log(`${id.padEnd(16)} ${(size / 1024).toFixed(0).padStart(4)} KB`);
}

console.log(`\n${Object.keys(WEAPONS).length} armas, ${(total / 1024).toFixed(0)} KB en total`);
