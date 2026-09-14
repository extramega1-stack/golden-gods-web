import { SceneRoot, Particles, THREE } from './.bundle/entry.mjs';

const results = {};
const check = (name, value) => {
  results[name] = value === true;
};

const root = new SceneRoot();
const particles = new Particles(root);

const positions = particles.points.geometry.getAttribute('position');
const colors = particles.points.geometry.getAttribute('color');

// --- Arranque ---
check('el sistema crea una sola malla de puntos', particles.points.isPoints === true);
check('la geometría tiene el pool completo', positions.count > 100);
check('hay un color por partícula', colors.count === positions.count);
check('arranca sin nada encendido', Array.from(colors.array).every((value) => value === 0));

// --- Un estallido enciende partículas ---
particles.burst(0, 2, 0, 0xff8800, { count: 12, speed: 5 });
const litAfterBurst = Array.from(colors.array).filter((value) => value > 0).length;
check('el estallido enciende partículas', litAfterBurst > 0);
check(
  'las posiciones son números finitos',
  Array.from(positions.array).every((value) => Number.isFinite(value))
);

// --- Se apagan solas ---
particles.update(2);
check(
  'tras su tiempo de vida todo vuelve a negro',
  Array.from(colors.array).every((value) => value === 0)
);

// --- El pool da la vuelta sin salirse ---
let overflowed = false;
try {
  for (let i = 0; i < 60; i++) {
    particles.burst(i, 1, i * 0.5, 0x00ff00, { count: 20, speed: 2 });
  }
} catch {
  overflowed = true;
}
check('desbordar el pool no revienta', !overflowed);
check(
  'tras desbordar, todo sigue siendo finito',
  Array.from(positions.array).every((value) => Number.isFinite(value)) &&
    Array.from(colors.array).every((value) => Number.isFinite(value))
);

// --- Se integra el movimiento ---
particles.update(5);
const beforeMove = positions.array.slice();
particles.burst(10, 10, 10, 0xffffff, { count: 8, speed: 4, lift: 4 });
const nearBurst = (() => {
  for (let i = 0; i < positions.array.length; i += 3) {
    const [x, y, z] = [positions.array[i], positions.array[i + 1], positions.array[i + 2]];
    if (Math.hypot(x - 10, y - 10, z - 10) < 1.5) {
      return true;
    }
  }
  return false;
})();
particles.update(0.1);
const movedSomewhere = Array.from(positions.array).some(
  (value, index) => value !== beforeMove[index]
);
check('las partículas se mueven al actualizar', movedSomewhere);
check('alguna partícula nace en el punto del estallido', nearBurst);

// --- La textura es propia y no depende del navegador ---
const material = particles.points.material;
check('usa mezcla aditiva', material.blending === THREE.AdditiveBlending);
check('la textura suave es un DataTexture', material.map instanceof THREE.DataTexture);
check('la textura tiene tamaño', material.map.image.width === 16 && material.map.image.height === 16);

let ok = true;
for (const [name, value] of Object.entries(results)) {
  console.log(`${value ? 'PASS' : 'FAIL'}  ${name}`);
  if (!value) ok = false;
}
process.exit(ok ? 0 : 1);
