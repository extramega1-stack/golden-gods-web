import { buildSync } from 'esbuild';
import { spawnSync } from 'node:child_process';

buildSync({
  entryPoints: ['tests/entry.mjs'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: 'tests/.bundle/entry.mjs',
  logLevel: 'warning',
});

const result = spawnSync(process.execPath, ['tests/terrain.test.mjs'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
