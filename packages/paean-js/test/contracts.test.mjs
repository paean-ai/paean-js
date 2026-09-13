import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import Ajv from 'ajv/dist/2020.js';
import * as GAME from '../dist/game.js';

const json = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
test('machine-readable catalog exactly matches runtime exports and public methods', async () => {
  const catalog = await json('../../../paean/api.json'), pkg = await json('../package.json');
  assert.equal(catalog.version, GAME.PAEAN_VERSION); assert.equal(catalog.version, pkg.version);
  assert.equal(catalog.upstream.version, pkg.peerDependencies.three);
  assert.deepEqual(catalog.gameExports.map(item => item.name).sort(), Object.keys(GAME).sort());
  for (const item of catalog.gameExports) {
    for (const method of item.methods ?? []) assert.equal(typeof GAME[item.name].prototype[method], 'function', `${item.name}.${method}`);
    for (const method of item.staticMethods ?? []) assert.equal(typeof GAME[item.name][method], 'function', `${item.name}.${method}`);
    if (item.example) await access(new URL(`../../../${item.example}`, import.meta.url));
  }
});
test('asset schemas accept supported definitions and reject malformed data', async () => {
  const cases = [
    ['atlas', { width: 16, height: 16, frames: { idle: { x: 0, y: 0, width: 16, height: 16 } } }, { width: -1, height: 16, frames: {} }],
    ['skeleton', { bones: [{ name: 'root' }], slots: [{ name: 'body', bone: 'root' }] }, { bones: [{ name: 'bad.name' }] }],
    ['tilemap', { columns: 2, rows: 1, tiles: [null, '0'] }, { columns: 2, rows: 1, tiles: [0, 1] }],
    ['sprite-clip', { frames: ['0'], durations: [0.1] }, { frames: ['0'], fps: 10, durations: [0.1] }],
  ];
  for (const [name, valid, invalid] of cases) {
    const validate = new Ajv({ strict: true }).compile(await json(`../schemas/${name}.schema.json`));
    assert.equal(validate(valid), true, JSON.stringify(validate.errors)); assert.equal(validate(invalid), false, name);
  }
});
test('evaluation tasks reference real examples and implemented APIs', async () => {
  const tasks = await json('../../../paean/evals/tasks.json');
  assert.equal(tasks.sdkVersion, GAME.PAEAN_VERSION);
  for (const task of tasks.tasks) {
    await access(new URL(`../../../${task.reference}`, import.meta.url));
    for (const api of task.requiredAPIs) assert.ok(api in GAME, api);
  }
});
