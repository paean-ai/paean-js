import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as PAEAN from '@paean-ai/paean-js';
import * as GAME from '@paean-ai/paean-js/game';
import { readFile } from 'node:fs/promises';
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

test('every three.js export retains exact identity and no game export shadows upstream', () => {
  for (const name of Object.keys(THREE)) assert.equal(PAEAN[name], THREE[name], name);
  assert.deepEqual(Object.keys(GAME).filter(name => name in THREE), []);
  assert.equal(THREE.REVISION, packageJson.peerDependencies.three.split('.')[1]);
  assert.ok(new PAEAN.VectorShape(new THREE.Shape()) instanceof THREE.Mesh);
});
test('addon and source aliases retain upstream constructor identity', async () => {
  for (const [suffix, upstream] of [
    ['addons/loaders/GLTFLoader.js', 'addons/loaders/GLTFLoader.js'],
    ['examples/jsm/controls/OrbitControls.js', 'addons/controls/OrbitControls.js'],
    ['src/math/Vector3.js', 'src/math/Vector3.js'],
    ['addons/libs/lil-gui.module.min.js', 'addons/libs/lil-gui.module.min.js'],
  ]) {
    const [actual, expected] = await Promise.all([import(`@paean-ai/paean-js/${suffix}`), import(`three/${upstream}`)]);
    assert.deepEqual(Object.keys(actual), Object.keys(expected));
    for (const name of Object.keys(expected)) assert.equal(actual[name], expected[name], `${suffix}:${name}`);
  }
});
test('WebGPU and TSL entry points expose every upstream export unchanged', async () => {
  for (const suffix of ['webgpu', 'tsl']) {
    const [actual, expected] = await Promise.all([import(`@paean-ai/paean-js/${suffix}`), import(`three/${suffix}`)]);
    assert.deepEqual(Object.keys(actual), Object.keys(expected));
    for (const name of Object.keys(expected)) assert.equal(actual[name], expected[name], `${suffix}:${name}`);
  }
});
