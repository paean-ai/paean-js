import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const temporary = await mkdtemp(join(tmpdir(), 'paean-package-'));
try {
  const packed = JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', temporary], { encoding: 'utf8' }))[0];
  await writeFile(join(temporary, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', join(temporary, packed.filename)], { cwd: temporary, stdio: 'pipe' });
  const source = `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as THREE from 'three';
import * as PAEAN from '@paean-ai/paean-js';
import { GLTFLoader } from '@paean-ai/paean-js/addons/loaders/GLTFLoader.js';
import { GLTFLoader as Original } from 'three/addons/loaders/GLTFLoader.js';
for (const name of Object.keys(THREE)) assert.equal(PAEAN[name], THREE[name], name);
assert.equal(GLTFLoader, Original);
assert.equal(new PAEAN.Random(1).next(), new PAEAN.Random(1).next());
const require = createRequire(import.meta.url);
const cjs = require('@paean-ai/paean-js'), threeCjs = require('three');
for (const name of Object.keys(threeCjs)) assert.equal(cjs[name], threeCjs[name], name);
assert.ok(new cjs.Skeleton2D({ bones: [] }) instanceof threeCjs.Group);
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
