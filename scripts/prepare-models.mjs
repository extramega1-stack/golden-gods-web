import { NodeIO } from '@gltf-transform/core';
import { mkdirSync, existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Descarga los personajes CC0 de KayKit y poda cada modelo para dejar solo las
 * animaciones que el juego usa. Sin poda cada personaje pesa ~4 MB (traen 70+
 * animaciones) y el APK se dispara.
 *
 * Se usa solo @gltf-transform/core: el paquete `functions` arrastra `sharp`, que
 * no tiene binario para Android ARM64 y revienta al importarse.
 *
 * Los modelos resultantes se versionan en public/models, así que esto solo hace
 * falta si quieres cambiarlos o actualizarlos.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = resolve(root, '.model-cache');
const outDir = resolve(root, 'public/models');

const PACKS = {
  adventures:
    'https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures/Characters/gltf/',
  skeletons:
    'https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0/main/addons/kaykit_character_pack_skeletons/Characters/gltf/',
};

const MODELS = [
  { id: 'knight', pack: 'adventures', file: 'Knight.glb' },
  { id: 'barbarian', pack: 'adventures', file: 'Barbarian.glb' },
  { id: 'rogue', pack: 'adventures', file: 'Rogue.glb' },
  { id: 'mage', pack: 'adventures', file: 'Mage.glb' },
  { id: 'skeleton-minion', pack: 'skeletons', file: 'Skeleton_Minion.glb' },
  { id: 'skeleton-warrior', pack: 'skeletons', file: 'Skeleton_Warrior.glb' },
  { id: 'skeleton-mage', pack: 'skeletons', file: 'Skeleton_Mage.glb' },
];

/** Animaciones que interesan, por estado del juego; se queda la primera que exista. */
const WANTED = {
  idle: ['Idle', 'Unarmed_Idle', '2H_Melee_Idle'],
  walk: ['Walking_A', 'Walking_B'],
  run: ['Running_A', 'Running_B'],
  attack: [
    '1H_Melee_Attack_Chop',
    '2H_Melee_Attack_Slice',
    'Unarmed_Melee_Attack_Punch_A',
    '1H_Melee_Attack_Slice_Horizontal',
  ],
  cast: ['Spellcast_Shoot', 'Spellcasting', 'Spellcast_Raise', 'Spellcast_Long'],
  hit: ['Hit_A', 'Hit_B'],
  die: ['Death_A', 'Death_B'],
};

async function download(url, destination) {
  if (existsSync(destination)) {
    return;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar ${url}: HTTP ${response.status}`);
  }
  writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
}

function pickWanted(names) {
  const keep = new Map();
  for (const [state, candidates] of Object.entries(WANTED)) {
    const found = candidates.find((name) => names.includes(name));
    if (found) {
      keep.set(state, found);
    }
  }
  return keep;
}

/** Elimina del documento las animaciones no deseadas y todo lo que quede huérfano. */
function pruneToWanted(doc, keepNames) {
  const documentRoot = doc.getRoot();

  const usedAccessors = new Set();
  for (const mesh of documentRoot.listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      for (const semantic of primitive.listSemantics()) {
        usedAccessors.add(primitive.getAttribute(semantic));
      }
      if (primitive.getIndices()) {
        usedAccessors.add(primitive.getIndices());
      }
      for (const target of primitive.listTargets()) {
        for (const semantic of target.listSemantics()) {
          usedAccessors.add(target.getAttribute(semantic));
        }
      }
    }
  }
  for (const skin of documentRoot.listSkins()) {
    if (skin.getInverseBindMatrices()) {
      usedAccessors.add(skin.getInverseBindMatrices());
    }
  }

  let removed = 0;
  for (const animation of documentRoot.listAnimations()) {
    if (keepNames.has(animation.getName())) {
      for (const sampler of animation.listSamplers()) {
        usedAccessors.add(sampler.getInput());
        usedAccessors.add(sampler.getOutput());
      }
      continue;
    }
    for (const sampler of animation.listSamplers()) {
      sampler.dispose();
    }
    animation.dispose();
    removed += 1;
  }

  for (const accessor of documentRoot.listAccessors()) {
    if (!usedAccessors.has(accessor)) {
      accessor.dispose();
    }
  }

  // En gltf-transform v4 no existe BufferView: `Buffer` hace de vista de datos.
  const usedBuffers = new Set();
  for (const accessor of documentRoot.listAccessors()) {
    const buffer = accessor.getBuffer();
    if (buffer) {
      usedBuffers.add(buffer);
    }
  }
  for (const buffer of documentRoot.listBuffers()) {
    if (!usedBuffers.has(buffer)) {
      buffer.dispose();
    }
  }

  return removed;
}

mkdirSync(cacheDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

const io = new NodeIO();
let totalBefore = 0;
let totalAfter = 0;

for (const model of MODELS) {
  const source = resolve(cacheDir, model.file);
  await download(PACKS[model.pack] + model.file, source);

  const doc = await io.read(source);
  const names = doc
    .getRoot()
    .listAnimations()
    .map((animation) => animation.getName());
  const keep = pickWanted(names);

  if (keep.size === 0) {
    throw new Error(`${model.id}: sin animaciones esperadas entre: ${names.join(', ')}`);
  }

  const removed = pruneToWanted(doc, new Set(keep.values()));

  const target = resolve(outDir, `${model.id}.glb`);
  await io.write(target, doc);

  const before = statSync(source).size;
  const after = statSync(target).size;
  totalBefore += before;
  totalAfter += after;

  const mapping = [...keep].map(([state, name]) => `${state}=${name}`).join(' ');
  console.log(
    `${model.id.padEnd(16)} ${(before / 1048576).toFixed(2)} MB -> ${(after / 1048576).toFixed(2)} MB  (${removed} animaciones fuera)\n                 ${mapping}`
  );
}

console.log(
  `\nTotal: ${(totalBefore / 1048576).toFixed(1)} MB -> ${(totalAfter / 1048576).toFixed(1)} MB`
);

// Verificación: los ficheros escritos deben ser GLB válidos y conservar las animaciones.
for (const model of MODELS) {
  const path = resolve(outDir, `${model.id}.glb`);
  const buffer = readFileSync(path);
  if (buffer.toString('ascii', 0, 4) !== 'glTF') {
    throw new Error(`${model.id}.glb no tiene cabecera GLB`);
  }
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength));
  const kept = (json.animations ?? []).map((animation) => animation.name);
  if (kept.length === 0) {
    throw new Error(`${model.id}.glb se quedó sin animaciones`);
  }
  console.log(`${model.id.padEnd(16)} animaciones conservadas: ${kept.join(', ')}`);
}
console.log('Todos los modelos son GLB válidos.');
