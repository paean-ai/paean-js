import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const temporary = await mkdtemp(join(tmpdir(), 'paean-package-'));
try {
  const packed = JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', temporary], { encoding: 'utf8' }))[0];
  await writeFile(join(temporary, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', join(temporary, packed.filename)], { cwd: temporary, stdio: 'pipe' });
  // A 2D consumer installs neither three nor its types, and can combine entries in either module system.
  await writeFile(join(temporary, 'canvas.mjs'), `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Node2D } from '@paean-ai/paean-js/2d';
import { Rig2D } from '@paean-ai/paean-js/vector';
import { SpriteSheet, Sprite2D } from '@paean-ai/paean-js/pixel';
import { Random } from '@paean-ai/paean-js/core';
import { PaeanPlatform } from '@paean-ai/paean-js/platform';
import { parseAseprite } from '@paean-ai/paean-js/formats';
const require = createRequire(import.meta.url);
assert.throws(() => require.resolve('three'), { code: 'MODULE_NOT_FOUND' });
assert.throws(() => require.resolve('@types/three/package.json'), { code: 'MODULE_NOT_FOUND' });
new Node2D().add(new Rig2D({ bones: [] }), new Sprite2D(SpriteSheet.grid({ width: 8, height: 8 }, 8, 8, 8), '0'));
const cjs = require('@paean-ai/paean-js/2d'), vector = require('@paean-ai/paean-js/vector');
new cjs.Node2D().add(new vector.Rig2D({ bones: [] }));
for (const entry of ['core', '2d', 'vector', 'pixel', 'platform', 'formats']) require('@paean-ai/paean-js/' + entry);
assert.equal(typeof parseAseprite, 'function'); assert.equal(typeof PaeanPlatform, 'function'); new Random(1).next();
console.log('Packed Canvas 2D consumer passes without three.js or @types/three installed.');
`);
  execFileSync('node', ['canvas.mjs'], { cwd: temporary, stdio: 'inherit' });
  await writeFile(join(temporary, 'canvas.ts'), `
import { CanvasGame, Node2D } from '@paean-ai/paean-js/2d';
import { Rig2D, VectorPath } from '@paean-ai/paean-js/vector';
import { PixelGame, SpriteSheet, Sprite2D, FrameAnimator } from '@paean-ai/paean-js/pixel';
const sheet = SpriteSheet.grid(document.createElement('canvas'), 300, 150, 10);
const sprite = new Sprite2D(sheet, '0'); new FrameAnimator(sprite).define('idle', { frames: ['0'], fps: 10 });
new Node2D().add(new Rig2D({ bones: [] }), sprite, VectorPath.circle(3));
void [CanvasGame, PixelGame];
`);
  const compiler = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url));
  execFileSync('node', [compiler, '--strict', '--noEmit', '--module', 'NodeNext', '--target', 'ES2022', 'canvas.ts'], { cwd: temporary, stdio: 'inherit' });
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', `three@${pkg.peerDependencies.three}`, `@types/three@${pkg.peerDependencies['@types/three']}`], { cwd: temporary, stdio: 'pipe' });
  const source = `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as THREE from 'three';
import * as PAEAN from '@paean-ai/paean-js';
import * as THREE_ONLY from '@paean-ai/paean-js/3d';
import { GLTFLoader } from '@paean-ai/paean-js/addons/loaders/GLTFLoader.js';
import { GLTFLoader as Original } from 'three/addons/loaders/GLTFLoader.js';
for (const name of Object.keys(THREE)) assert.equal(PAEAN[name], THREE[name], name);
assert.deepEqual(Object.keys(THREE_ONLY), Object.keys(THREE));
for (const name of Object.keys(THREE)) assert.equal(THREE_ONLY[name], THREE[name], name);
assert.equal(GLTFLoader, Original);
assert.equal(new PAEAN.Random(1).next(), new PAEAN.Random(1).next());
const require = createRequire(import.meta.url);
const cjs = require('@paean-ai/paean-js'), threeCjs = require('three');
for (const name of Object.keys(threeCjs)) assert.equal(cjs[name], threeCjs[name], name);
assert.ok(new cjs.Skeleton2D({ bones: [] }) instanceof threeCjs.Group);
assert.equal(require('@paean-ai/paean-js/3d/vector').Skeleton2D, cjs.Skeleton2D);
assert.equal(require('@paean-ai/paean-js/3d/pixel').PixelSprite, cjs.PixelSprite);
console.log('Packed consumer passes ESM, CommonJS, addon, and constructor identity checks.');
`;
  await writeFile(join(temporary, 'consumer.mjs'), source);
  execFileSync('node', ['consumer.mjs'], { cwd: temporary, stdio: 'inherit' });
  const files = packed.files.map(file => file.path);
  for (const required of ['LICENSE', 'NOTICE', 'README.md', 'llms.txt', 'schemas/skeleton.schema.json', 'dist/index.d.ts']) {
    if (!files.includes(required)) throw new Error(`Missing published file: ${required}`);
  }
  console.log(`Package: ${files.length} files, ${packed.size} compressed bytes.`);
} finally { await rm(temporary, { recursive: true, force: true }); }
