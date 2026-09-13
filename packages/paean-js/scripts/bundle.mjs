import { build } from 'esbuild';
import { readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

async function sources(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sources(path));
    else if (entry.name.endsWith('.ts')) files.push(path);
  }
  return files;
}

// Preserve module identity across CommonJS subpaths, including shared Node2D and loop constructors.
// Rewriting source specifiers before transformation also keeps source maps accurate.
await build({
  entryPoints: await sources('src'), outbase: 'src', outdir: 'dist', outExtension: { '.js': '.cjs' },
  bundle: false, format: 'cjs', platform: 'neutral', target: 'es2022', sourcemap: true,
  plugins: [{ name: 'cjs-relative-specifiers', setup(build) {
    build.onLoad({ filter: /\.ts$/ }, async ({ path }) => ({
      contents: (await readFile(path, 'utf8')).replace(/((?:from|import)\s*['"])(\.[^'"]+)\.js(['"])/g, '$1$2.cjs$3'), loader: 'ts',
    }));
  } }],
});

// Browser bundles share hashed chunks: combining vector and pixel modules still uses one Node2D.
await rm('dist/bundles', { recursive: true, force: true });
await build({
  entryPoints: ['core', '2d', 'vector', 'pixel', 'platform', 'formats', '3d', 'three-vector', 'three-pixel'].map(name => `src/${name}.ts`),
  outdir: 'dist/bundles', bundle: true, splitting: true, format: 'esm', platform: 'browser', target: 'es2022',
  external: ['three', 'three/*'], sourcemap: true, minify: true,
});
// Retain the 0.1 browser aggregate for existing applications.
await build({ entryPoints: ['src/game.ts'], outfile: 'dist/paean.game.js', bundle: true, format: 'esm', platform: 'browser', target: 'es2022', external: ['three', 'three/*'], sourcemap: true });
