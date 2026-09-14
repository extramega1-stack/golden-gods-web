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
for (const file of files) {
  console.log(`\n=== ${file} ===`);
  const result = spawnSync(process.execPath, [`tests/${file}`], { stdio: 'inherit' });
  if (result.status !== 0) {
    failed += 1;
  }
}

console.log(`\n${files.length - failed}/${files.length} suites OK`);
process.exit(failed === 0 ? 0 : 1);
