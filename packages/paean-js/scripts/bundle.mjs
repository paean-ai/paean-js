import { build } from 'esbuild';

// Externalizing three is essential: embedding another renderer copy breaks constructor identity.
await build({ entryPoints: ['src/index.ts', 'src/game.ts'], outdir: 'dist', outExtension: { '.js': '.cjs' }, bundle: true, format: 'cjs', platform: 'neutral', target: 'es2022', external: ['three', 'three/*'], sourcemap: true });
await build({ entryPoints: ['src/game.ts'], outfile: 'dist/paean.game.js', bundle: true, format: 'esm', platform: 'browser', target: 'es2022', external: ['three', 'three/*'], sourcemap: true });
