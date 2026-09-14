import { buildSync } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

buildSync({
  entryPoints: ['tests/entry.mjs'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: 'tests/.bundle/entry.mjs',
  logLevel: 'warning',
});

const files = readdirSync('tests')
  .filter((name) => name.endsWith('.test.mjs'))
  .sort();

let failed = 0;
const failures = [];

for (const file of files) {
  console.log(`\n=== ${file} ===`);
  let result = spawnSync(process.execPath, [`tests/${file}`], { stdio: 'inherit' });

  // Un código nulo significa que el proceso murió por una señal, no que el test fallara.
  // Eso es un hipo del entorno, así que se reintenta una vez antes de darlo por roto.
  // Un fallo de verdad (código distinto de cero) NO se reintenta: ocultaría bugs.
  if (result.status === null) {
    console.log(`\n(${file} murió por señal; se reintenta una vez)`);
    result = spawnSync(process.execPath, [`tests/${file}`], { stdio: 'inherit' });
  }

  const status = result.status;
  if (status !== 0) {
    failed += 1;
    // Si una suite muere en silencio, sin esta línea no hay forma de saber cuál fue.
    failures.push(
      `${file} (código ${status ?? 'señal'}${result.signal ? `, señal ${result.signal}` : ''})`
    );
  }
}

if (failures.length > 0) {
  console.log('\nSuites que fallaron:');
  for (const failure of failures) {
    console.log(`  - ${failure}`);
  }
}

console.log(`\n${files.length - failed}/${files.length} suites OK`);
process.exit(failed === 0 ? 0 : 1);
