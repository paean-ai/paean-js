import { readdir, readFile, writeFile, mkdir, rm, copyFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { init, parse } from 'es-module-lexer';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const threeRoot = resolve(dirname(fileURLToPath(import.meta.resolve('three'))), '..');
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const upstream = JSON.parse(await readFile(join(threeRoot, 'package.json'), 'utf8'));
if (upstream.version !== pkg.peerDependencies.three) throw new Error(`Expected three ${pkg.peerDependencies.three}, received ${upstream.version}.`);
const destination = join(root, 'compat');
await rm(destination, { recursive: true, force: true });
let count = 0;
await init;

async function generate(directory) {
  let entries;
  try { entries = await readdir(join(threeRoot, directory), { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  for (const entry of entries) {
    const path = join(directory, entry.name), source = join(threeRoot, path), target = join(destination, path);
    if (entry.isDirectory()) { await generate(path); continue; }
    await mkdir(dirname(target), { recursive: true });
    if (!entry.name.endsWith('.js')) { await copyFile(source, target); continue; }
    const specifier = `three/${relative(threeRoot, source).split('\\').join('/')}`;
    const text = await readFile(source, 'utf8');
    const [imports, exports] = parse(text);
    // Decoder scripts are fetched as text or run as classic workers, not imported as modules.
    if (imports.length === 0 && exports.length === 0) { await copyFile(source, target); continue; }
    const hasDefault = exports.some(entry => entry.n === 'default');
    const wrapper = `// Generated upstream proxy. Do not edit.\nexport * from '${specifier}';\n${hasDefault ? `export { default } from '${specifier}';\n` : ''}`;
    await writeFile(target, wrapper);
    // Some legacy addons have no DefinitelyTyped declaration; consumers receive upstream's type coverage.
    await writeFile(target.replace(/\.js$/, '.d.ts'), wrapper);
    count++;
  }
}

await generate('src'); await generate('examples/jsm'); await generate('examples/fonts');
console.log(`Generated ${count} identity-preserving three.js module proxies (${upstream.version}).`);
