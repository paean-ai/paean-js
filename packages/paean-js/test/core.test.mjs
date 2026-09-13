import test from 'node:test';
import assert from 'node:assert/strict';
import { AssetStore, FixedStepLoop, Random } from '../dist/game.js';

test('fixed updates do not depend on render frequency', () => {
  for (const hz of [30, 60, 120, 144]) {
    let steps = 0;
    const loop = new FixedStepLoop({ update: dt => { assert.equal(dt, 1 / 60); steps++; } });
    for (let frame = 0; frame < hz; frame++) loop.advance(1 / hz);
    assert.equal(steps, 60, `${hz} Hz`);
  }
});
test('catch-up is bounded and interpolation remains in [0, 1)', () => {
  let updates = 0, alpha;
  const loop = new FixedStepLoop({ update: () => updates++, render: value => { alpha = value; } });
  assert.equal(loop.advance(100), 5); assert.equal(updates, 5); assert.ok(alpha >= 0 && alpha < 1);
  assert.throws(() => loop.advance(-1), RangeError); assert.throws(() => loop.advance(NaN), RangeError);
});
test('loop start/stop is idempotent, releases its frame, and resets elapsed time', () => {
  let callback, requests = 0, cancelled = 0, updates = 0;
  const loop = new FixedStepLoop({ update: () => updates++, requestFrame: cb => { callback = cb; return ++requests; }, cancelFrame: () => cancelled++ });
  loop.start().start(); assert.equal(requests, 1);
  callback(1000); callback(1017); assert.equal(updates, 1);
  loop.stop().stop(); assert.equal(cancelled, 1);
  loop.start(); callback(100000); assert.equal(updates, 1);
  loop.dispose(); assert.throws(() => loop.start()); assert.throws(() => loop.advance(0));
});
test('an update failure stops scheduling and reports once', () => {
  let callback, reported;
  const loop = new FixedStepLoop({ requestFrame: cb => { callback = cb; return 1; }, cancelFrame: () => {}, update: () => { throw new Error('boom'); }, onError: error => { reported = error; } });
  loop.start(); callback(0); callback(20); assert.equal(loop.running, false); assert.equal(reported.message, 'boom');
});
test('invalid loop configuration is rejected', () => {
  for (const options of [{ frequency: 0 }, { frequency: Infinity }, { maxSteps: 1.5 }, { maxSteps: 0 }, { maxFrameTime: -1 }]) {
    assert.throws(() => new FixedStepLoop({ update() {}, ...options }), RangeError);
  }
});
test('random sequences replay from a serializable state', () => {
  const a = new Random(123), b = new Random(123);
  assert.deepEqual(Array.from({ length: 100 }, () => a.next()), Array.from({ length: 100 }, () => b.next()));
  const state = a.state, next = a.next(); a.state = state; assert.equal(a.next(), next);
  for (let i = 0; i < 1000; i++) { const value = a.int(-3, 5); assert.ok(Number.isInteger(value) && value >= -3 && value <= 5); }
  assert.throws(() => a.pick([])); assert.throws(() => a.int(2, 1)); assert.throws(() => a.range(0, Infinity));
});
test('asset loads are deduplicated, rejected loads retry, and owned assets dispose once', async () => {
  const store = new AssetStore(); let loads = 0, disposed = 0;
  const loader = async () => { loads++; return { dispose() { disposed++; } }; };
  const [a, b] = await Promise.all([store.load('a', loader), store.load('a', loader)]);
  assert.equal(a, b); assert.equal(loads, 1);
  await store.load('alias', () => a);
  await assert.rejects(store.load('bad', () => { throw Error('offline'); }));
  assert.equal(await store.load('bad', () => 42), 42);
  store.dispose(); store.dispose(); assert.equal(disposed, 1);
  await assert.rejects(store.load('later', loader));
});
test('resources resolving after disposal are released, never cached', async () => {
  const store = new AssetStore(); let resolve, disposed = 0;
  const promise = store.load('late', () => new Promise(r => { resolve = r; }));
  await Promise.resolve(); store.dispose(); resolve({ dispose() { disposed++; } });
  await assert.rejects(promise, /disposed/); assert.equal(disposed, 1);
});
test('disposal failure does not prevent releasing other assets', async () => {
  const store = new AssetStore(); let disposed = false;
  await store.load('bad', () => ({ dispose() { throw Error('bad'); } }));
  await store.load('good', () => ({ dispose() { disposed = true; } }));
  assert.throws(() => store.dispose(), AggregateError); assert.equal(disposed, true);
});
