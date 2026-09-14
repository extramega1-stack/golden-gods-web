import { NodeIO } from '@gltf-transform/core';
import { mkdirSync, existsSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

/**
 * Descarga un .gltf con sus recursos (binarios e imágenes), resolviendo sus rutas
 * relativas como URLs, y lo empaqueta en un GLB autocontenido.
 *
 * Los packs de KayKit vienen así: el .gltf suelto con el .bin y los atlas al lado, con
 * rutas relativas que apuntan a veces a subcarpetas. Resolverlas como URL es lo único
 * que funciona de forma general.
 */
export async function downloadAndConvert({ remoteGltfUrl, id, cacheDir, outDir }) {
  mkdirSync(outDir, { recursive: true });

  const dir = resolve(cacheDir, id);
  const gltfFile = resolve(dir, `${id}.gltf`);

  if (!existsSync(gltfFile)) {
    mkdirSync(dir, { recursive: true });
    const response = await fetch(remoteGltfUrl);
    if (!response.ok) {
      throw new Error(`No se pudo descargar ${remoteGltfUrl}: HTTP ${response.status}`);
    }
    writeFileSync(gltfFile, Buffer.from(await response.arrayBuffer()));
  }

  const definition = JSON.parse(readFileSync(gltfFile, 'utf8'));
  const resources = [
    ...(definition.buffers ?? []).map((entry) => entry.uri),
    ...(definition.images ?? []).map((entry) => entry.uri),
  ].filter((uri) => typeof uri === 'string' && !uri.startsWith('data:'));

  for (const uri of new Set(resources)) {
    const local = resolve(dir, uri);
    if (existsSync(local)) {
      continue;
    }
    const response = await fetch(new URL(uri, remoteGltfUrl).toString());
    if (!response.ok) {
      throw new Error(`No se pudo descargar "${uri}" de ${id}: HTTP ${response.status}`);
    }
    mkdirSync(dirname(local), { recursive: true });
    writeFileSync(local, Buffer.from(await response.arrayBuffer()));
  }

  const io = new NodeIO();
  const doc = await io.read(gltfFile);
  const target = resolve(outDir, `${id}.glb`);
  await io.write(target, doc);

  if (readFileSync(target).toString('ascii', 0, 4) !== 'glTF') {
    throw new Error(`${id}.glb no tiene cabecera GLB`);
  }
  return { path: target, size: statSync(target).size };
}
