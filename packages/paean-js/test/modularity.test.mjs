import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { init, parse } from 'es-module-lexer';
import { build } from 'esbuild';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('..', import.meta.url));
await init;

// Traverse actual ESM imports, including re-exports, without tree shaking. Browsers load this graph.
async function graph(path, visited = new Set()) {
  path = resolve(root, path); if (visited.has(path)) return visited; visited.add(path);
  const [imports] = parse(await readFile(path, 'utf8'));
  for (const item of imports) {
    assert.ok(item.n, `Nonliteral import in ${path}`);
    assert.ok(item.n.startsWith('.'), `Unexpected external dependency ${item.n} in ${relative(root, path)}`);
    await graph(resolve(dirname(path), item.n), visited);
  }
  return visited;
}

const families = {
  core: /canvas|pixel|vector|platform|formats|animation|three|two\//,
  '2d': /canvas-pixel|canvas-vector|\/pixel\/|\/two\/|platform|three/,
  vector: /canvas-pixel|\/pixel\/|\/two\/|platform|three|CanvasGame/,
  pixel: /canvas-vector|\/pixel\/|\/two\/|platform|three/,
  platform: /canvas|pixel|vector|three|two\//,
  formats: /canvas|\/pixel\/|\/two\/|platform|three/,
};

for (const [entry, forbidden] of Object.entries(families)) test(`${entry} unbundled ESM has no unrelated visual or platform dependencies`, async () => {
  for (const path of await graph(`dist/${entry}.js`)) assert.doesNotMatch(relative(root, path), forbidden);
  // Also inspect the published, split browser bundles. They must not hide a renderer in a shared chunk.
  for (const path of await graph(`dist/bundles/${entry}.js`)) {
    const map = JSON.parse(await readFile(`${path}.map`, 'utf8'));
    for (const source of map.sources) assert.doesNotMatch(source, forbidden, `${entry}: ${source}`);
  }
});

test('3d is exactly the upstream namespace with no Paean runtime', async () => {
  const three = await import('three'), entry = await import('@paean-ai/paean-js/3d');
  assert.deepEqual(Object.keys(entry), Object.keys(three));
  for (const key of Object.keys(three)) assert.equal(entry[key], three[key], key);
  const [imports] = parse(await readFile(resolve(root, 'dist/3d.js'), 'utf8'));
  assert.deepEqual(imports.map(item => item.n), ['three']);
});

test('ESM, CommonJS, and split browser entries each share their own Node2D constructor', async () => {
  const require = createRequire(import.meta.url);
  const { Node2D } = require('@paean-ai/paean-js/2d'), { Rig2D } = require('@paean-ai/paean-js/vector');
  new Node2D().add(new Rig2D({ bones: [] }));
  const esm = await import('@paean-ai/paean-js/2d'), vector = await import('@paean-ai/paean-js/vector');
  esm.Node2D.prototype.add.call(new esm.Node2D(), new vector.Rig2D({ bones: [] }));
  const browser = await import('../dist/bundles/2d.js'), browserVector = await import('../dist/bundles/vector.js');
  new browser.Node2D().add(new browserVector.Rig2D({ bones: [] }));
});

test('complete visual entry bundles stay within dependency and transfer budgets', async () => {
  const cases = [
    ['core', ['core'], 5000, /canvas|pixel|vector|platform|three/],
    ['vector', ['2d', 'vector'], 9000, /canvas-pixel|\/pixel\/|\/two\/|platform|node_modules/],
    ['pixel', ['pixel'], 8500, /canvas-vector|\/pixel\/|\/two\/|platform|node_modules/],
    ['platform', ['platform'], 6500, /canvas|pixel|vector|three|node_modules/],
  ];
  for (const [name, entries, limit, forbidden] of cases) {
    const contents = entries.map((entry, i) => `import * as api${i} from './src/${entry}.ts'; console.log(api${i});`).join('\n');
    const result = await build({ stdin: { contents, resolveDir: root }, bundle: true, write: false, minify: true, format: 'esm', target: 'es2022', metafile: true });
    for (const path of Object.keys(result.metafile.inputs)) assert.doesNotMatch(path, forbidden, `${name}: ${path}`);
    const bytes = result.outputFiles[0].contents, compressed = gzipSync(bytes).length;
    assert.ok(compressed < limit, `${name}: ${compressed} gzip bytes exceed ${limit}`);
    // Transfer for unbundled module loading is measured separately from a consumer's bundled output.
    const paths = new Set(); for (const entry of entries) for (const path of await graph(`dist/${entry}.js`)) paths.add(path);
    let raw = 0; for (const path of paths) raw += (await stat(path)).size;
    console.log(`${name}: ${bytes.length} minified bytes / ${compressed} gzip bytes; unbundled ${paths.size} modules / ${raw} bytes.`);
  }
});
