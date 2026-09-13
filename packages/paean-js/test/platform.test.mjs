import test from 'node:test';
import assert from 'node:assert/strict';
import { PaeanPlatform, PlatformUnavailableError } from '../dist/game.js';

function mock({ grant = ['storage.kv', 'storage.leaderboard'], preview = false, missing = null, readError = null, decline = false } = {}) {
  const grants = new Set(), cloud = new Map(), calls = [], rows = [];
  const sdk = {
    detect: () => ({ supported: !preview, reason: preview ? 'preview' : null }),
    auth: { has: scope => grants.has(scope), ensure: async scopes => { calls.push(['consent', ...scopes]); for (const scope of scopes) { if (!grant.includes(scope)) throw Error('denied'); grants.add(scope); } } },
    storage: {
      get: async key => { calls.push(['get', key]); if (readError) throw readError; return cloud.get(key) ?? missing; },
      put: async (key, value) => { calls.push(['put', key]); cloud.set(key, value); },
    },
    leaderboard: { submitScore: async (...args) => { rows.push(args); }, get: async () => ({ entries: rows }) },
    access: { require: async () => { calls.push(['access']); return { unlocked: !decline }; } },
  };
  return { sdk, grants, cloud, calls, rows, enter: () => { preview = false; } };
}
const adapter = (host, options = {}) => new PaeanPlatform({ namespace: 'test', sdk: () => host?.sdk, storage: null, ...options });
const merge = (cloud, local) => ({ best: Math.max(cloud?.best ?? 0, local.best) });

test('plain browser stays usable with local saves and never performs hidden network work', async () => {
  const platform = adapter(); assert.equal(platform.mode, 'local');
  platform.saveLocal('save', { best: 3 }); assert.deepEqual(platform.loadLocal('save', null), { best: 3 });
  const result = await platform.syncSave('save', { best: 5 }, merge); assert.equal(result.synced, false); assert.equal(result.value.best, 5);
  assert.equal((await platform.requireAccess()).unlocked, true);
  assert.equal((await platform.requireAccess('premium')).unlocked, false);
  assert.throws(() => platform.service('room'), PlatformUnavailableError);
});
test('construction and preview produce no consent, access, or account-bound requests', async () => {
  const host = mock({ preview: true }), platform = adapter(host);
  assert.deepEqual(host.calls, []); await platform.connect(); await platform.requireAccess();
  await platform.syncSave('save', { best: 5 }, merge); await platform.submitScore('main', 5);
  assert.deepEqual(host.calls, []); assert.equal(host.rows.length, 0);
  host.enter(); await platform.connect(['storage.leaderboard']); await platform.flushScores(); assert.equal(host.rows.length, 1);
});
test('global preview detection works even before the SDK helper exists', async () => {
  const platform = adapter(undefined, { isPreview: () => true });
  assert.equal(platform.mode, 'preview'); assert.equal((await platform.requireAccess()).unlocked, false);
});
test('partial grants do not disable supported storage', async () => {
  const host = mock({ grant: ['storage.kv'] }), platform = adapter(host);
  const grants = await platform.connect(['storage.leaderboard', 'storage.kv']);
  assert.equal(grants['storage.leaderboard'], false); assert.equal(grants['storage.kv'], true);
  assert.equal((await platform.syncSave('save', { best: 5 }, merge)).synced, true);
  assert.equal(await platform.submitScore('main', 20), false);
});
test('cloud reads precede writes and merge protects progress on another device', async () => {
  const host = mock(), platform = adapter(host); host.cloud.set('save', { best: 50 });
  await platform.connect(); const result = await platform.syncSave('save', { best: 20 }, merge);
  assert.equal(result.value.best, 50); assert.deepEqual(host.calls.slice(-2), [['get', 'save'], ['put', 'save']]);
});
test('failed cloud reads never write, and local data survives reporting failures', async () => {
  const host = mock({ readError: Error('network') }), platform = adapter(host, { onError() { throw Error('UI failed'); } });
  await platform.connect(); const result = await platform.syncSave('save', { best: 4 }, merge);
  assert.equal(result.synced, false); assert.equal(result.value.best, 4); assert.equal(host.calls.some(call => call[0] === 'put'), false);
});
test('missing save rejection and normalized bare values are handled without unwrapping user objects', async () => {
  const host = mock({ readError: Object.assign(Error('key not found'), { code: 'KEY_NOT_FOUND' }) }), platform = adapter(host);
  await platform.connect(); assert.equal((await platform.syncSave('save', { best: 9 }, merge)).synced, true);
  const plain = mock(), p = adapter(plain); plain.cloud.set('object', { value: 12 }); await p.connect();
  const result = await p.syncSave('object', { value: 3 }, (cloud, local) => ({ value: Math.max(cloud.value, local.value) }));
  assert.deepEqual(result.value, { value: 12 });
});
test('local edits during a cloud read are incorporated and same-key syncs are serialized', async () => {
  const host = mock(), platform = adapter(host); await platform.connect();
  let release, reads = 0;
  host.sdk.storage.get = () => { reads++; return new Promise(resolve => { release = resolve; }); };
  const a = platform.syncSave('save', { best: 5 }, merge);
  await new Promise(resolve => setTimeout(resolve, 0));
  const b = platform.syncSave('save', { best: 20 }, merge);
  assert.equal(reads, 1); release({ best: 10 }); const first = await a; assert.equal(first.value.best, 20);
  await new Promise(resolve => setTimeout(resolve, 0)); assert.equal(reads, 2);
  release({ best: 20 }); await b; assert.equal(platform.loadLocal('save', null).best, 20);
});
test('quota failures retain a memory fallback and namespaced persistence survives adapter recreation', () => {
  const broken = { getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); }, removeItem() {} };
  const platform = adapter(undefined, { storage: broken }); platform.saveLocal('a', 12); assert.equal(platform.loadLocal('a', 0), 12);
  const data = new Map(), storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  adapter(undefined, { storage }).saveLocal('save', 8); assert.equal(adapter(undefined, { storage }).loadLocal('save', 0), 8);
  assert.equal(adapter(undefined, { namespace: 'another', storage }).loadLocal('save', 0), 0);
});
test('late host injection activates services without reconstructing the game', async () => {
  let current; const platform = new PaeanPlatform({ namespace: 'late', sdk: () => current, storage: null });
  assert.equal(platform.mode, 'local'); current = mock().sdk; assert.equal(platform.mode, 'paean');
  assert.equal((await platform.connect())['storage.kv'], true);
});
test('missing host namespaces do not throw TypeError or lose queued scores', async () => {
  const host = mock(), platform = adapter(host); await platform.connect(['storage.leaderboard']);
  delete host.sdk.leaderboard;
  assert.equal(await platform.submitScore('main', 10), false); assert.throws(() => platform.service('room'), /unavailable/);
  host.sdk.leaderboard = { submitScore: async (...args) => host.rows.push(args) }; await platform.flushScores(); assert.equal(host.rows.length, 1);
});
test('concurrent score flushing preserves scores appended during an in-flight request', async () => {
  const host = mock(), platform = adapter(host); await platform.connect(['storage.leaderboard']);
  let release; host.sdk.leaderboard.submitScore = (...args) => { host.rows.push(args); return new Promise(resolve => { release = resolve; }); };
  const first = platform.submitScore('main', 1); const second = platform.submitScore('main', 2);
  assert.equal(host.rows.length, 1); release(); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(host.rows.length, 2); release(); await Promise.all([first, second]); assert.equal(await platform.flushScores(), 0);
});
test('declined paid access keeps the demo and local paid policy never implies ownership', async () => {
  const host = mock({ decline: true }), platform = adapter(host);
  assert.equal((await platform.requireAccess()).unlocked, false);
  assert.equal((await adapter(undefined, { localAccess: 'demo' }).requireAccess()).unlocked, false);
  host.sdk.detect = () => ({ supported: false });
  await platform.requireAccess(); assert.equal(host.calls.filter(call => call[0] === 'access').length, 2);
});
test('adapter has explicit lifetime and no post-disposal write after an in-flight read', async () => {
  const host = mock(), platform = adapter(host); await platform.connect(); let release;
  host.sdk.storage.get = () => new Promise(resolve => { release = resolve; });
  const pending = platform.syncSave('save', { best: 1 }, merge);
  await new Promise(resolve => setTimeout(resolve, 0)); platform.dispose(); release(null);
  assert.equal((await pending).synced, false); assert.equal(host.calls.some(call => call[0] === 'put'), false);
  assert.throws(() => platform.saveLocal('save', 1));
});
