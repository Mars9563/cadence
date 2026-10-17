import { defineConfig } from 'tsup';

/*
 * Production build: one CommonJS bundle at dist/server.js.
 *
 * The shared workspace packages (@cadence/types, @cadence/validation) point
 * at TypeScript source, which plain `node` cannot load, so they are bundled
 * in. npm dependencies stay external and come from node_modules (in a
 * container: `pnpm --filter @cadence/server deploy --prod <dir>`).
 */
export default defineConfig({
  entry: ['src/server.ts'],
  format: ['cjs'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: [/^@cadence\//],
});
