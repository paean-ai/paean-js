import { execFileSync, spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const arguments_ = process.argv.slice(2);
const check = arguments_.includes('--check');
const refIndex = arguments_.indexOf('--ref');
const requested = refIndex >= 0 ? arguments_[refIndex + 1] : undefined;
if (refIndex >= 0 && (!requested || !/^r\d+$/.test(requested))) throw Error('--ref must be a stable upstream tag such as r186.');
for (let index = 0; index < arguments_.length; index++) {
  if (arguments_[index] === '--check') continue;
  if (arguments_[index] === '--ref') { index++; continue; }
  throw Error(`Unknown argument: ${arguments_[index]}`);
}
const metadataFile = resolve(root, 'paean/upstream.json');
const metadata = JSON.parse(await readFile(metadataFile, 'utf8'));
if (metadata.repository !== 'https://github.com/mrdoob/three.js.git') throw Error('Unexpected upstream URL.');
if (!check && git(['status', '--porcelain'])) throw Error('Start from a clean working tree. The sync command never discards local changes.');
// Fetch a separate namespace so upstream tags cannot overwrite locally signed release tags.
git(['fetch', '--no-tags', metadata.repository, '+refs/tags/r*:refs/paean-upstream/tags/r*']);
const refs = git(['for-each-ref', '--format=%(refname:strip=3)', 'refs/paean-upstream/tags/']).split('\n').filter(ref => /^r\d+$/.test(ref));
const ref = requested ?? refs.sort((a, b) => Number(b.slice(1)) - Number(a.slice(1)))[0];
if (!ref || !refs.includes(ref)) throw Error('Stable upstream tag was not found.');
const target = `refs/paean-upstream/tags/${ref}`;
const commit = git(['rev-parse', `${target}^{commit}`]);
const upstreamPackage = JSON.parse(git(['show', `${commit}:package.json`]));
const changed = commit !== metadata.commit;
if (check || !changed) { console.log(JSON.stringify({ changed, ref, commit, version: upstreamPackage.version })); process.exit(0); }
if (Number(ref.slice(1)) <= Number(metadata.ref.slice(1))) throw Error('Refusing a downgrade or a moved release tag.');
// Release tags can live on separate release branches. Require shared ancestry, not a linear chain.
git(['merge-base', metadata.commit, commit]);
execFileSync('node', ['scripts/paean/check-upstream.mjs'], { cwd: root, stdio: 'inherit' });
// DefinitelyTyped patch releases are independent of renderer patch releases.
const revisionLine = upstreamPackage.version.split('.').slice(0, 2).join('.');
const publishedTypes = JSON.parse(execFileSync('npm', ['view', `@types/three@${revisionLine}`, 'version', '--json'], { encoding: 'utf8' }));
const typeVersions = (Array.isArray(publishedTypes) ? publishedTypes : [publishedTypes]).filter(version => typeof version === 'string' && /^\d+\.\d+\.\d+$/.test(version) && version.startsWith(revisionLine + '.'));
const typesVersion = typeVersions.sort((a, b) => Number(b.split('.')[2]) - Number(a.split('.')[2]))[0];
if (!typesVersion) throw Error(`Matching @types/three definitions are not yet available for ${revisionLine}.`);
const branch = `upstream/${ref}`;
git(['switch', '-c', branch]);
const merge = spawnSync('git', ['merge', '--no-ff', '--no-commit', commit], { cwd: root, encoding: 'utf8' });
if (merge.status !== 0 && !git(['diff', '--name-only', '--diff-filter=U'])) {
  console.error(merge.stdout, merge.stderr);
  throw Error(`Git could not start the merge on ${branch}. No branch was pushed.`);
}
// The preflight proved these files are pristine upstream. Select the complete new upstream tree,
// including generated builds, instead of combining artifacts from divergent release branches.
const targetFiles = new Set(git(['ls-tree', '-r', '--name-only', '-z', commit, '--', ...metadata.protectedPaths]).split('\0').filter(Boolean));
const indexFiles = new Set(git(['ls-files', '-z', '--', ...metadata.protectedPaths]).split('\0').filter(Boolean));
const removedFiles = [...indexFiles].filter(path => !targetFiles.has(path));
// git restore cannot resolve an unmerged path that the target release deleted.
if (removedFiles.length) git(['rm', '-f', '--ignore-unmatch', '--', ...removedFiles]);
const existingPaths = git(['ls-tree', '--name-only', commit, '--', ...metadata.protectedPaths]).split('\n').filter(Boolean);
git(['restore', '--source', commit, '--staged', '--worktree', '--', ...existingPaths]);
const conflicts = git(['diff', '--name-only', '--diff-filter=U']).split('\n').filter(Boolean);
if (conflicts.length) {
  const branding = ['README.md', 'llms.txt', 'SECURITY.md', '.github/CONTRIBUTING.md'];
  if (conflicts.some(path => !branding.includes(path))) {
    console.error(merge.stdout, merge.stderr);
    throw Error(`Manual merge resolution required on ${branch}. Inspect git status; use git merge --abort to cancel. No branch was pushed.`);
  }
  git(['checkout', '--ours', '--', ...conflicts]); git(['add', '--', ...conflicts]);
}
// Keep upstream documentation available while retaining the Paean project identity.
await mkdir(resolve(root, 'paean/upstream'), { recursive: true });
for (const path of ['README.md', 'llms.txt', 'SECURITY.md', '.github/CONTRIBUTING.md']) {
  await writeFile(resolve(root, 'paean/upstream', path.replace('.github/', '')), git(['show', `${commit}:${path}`]) + '\n');
}
const sdkFile = resolve(root, 'packages/paean-js/package.json');
const sdk = JSON.parse(await readFile(sdkFile, 'utf8'));
sdk.peerDependencies.three = sdk.devDependencies.three = upstreamPackage.version;
sdk.dependencies['@types/three'] = typesVersion;
await writeFile(sdkFile, JSON.stringify(sdk, null, 2) + '\n');
await writeFile(metadataFile, JSON.stringify({ ...metadata, ref, commit, version: upstreamPackage.version, typesVersion }, null, 2) + '\n');
const catalogFile = resolve(root, 'paean/api.json');
const catalog = JSON.parse(await readFile(catalogFile, 'utf8'));
catalog.upstream.version = upstreamPackage.version;
await writeFile(catalogFile, JSON.stringify(catalog, null, 2) + '\n');
execFileSync('npm', ['install', '--package-lock-only', '--ignore-scripts'], { cwd: resolve(root, 'packages/paean-js'), stdio: 'inherit' });
// A lightweight local tag is enough for provenance checks; never rewrite an existing tag.
try { if (git(['rev-parse', `${ref}^{commit}`]) !== commit) throw Error(`Existing tag ${ref} has different provenance.`); }
catch (error) { if (error.status) git(['tag', ref, commit]); else throw error; }
git(['add', 'paean/upstream.json', 'paean/upstream', 'paean/api.json', 'packages/paean-js/package.json', 'packages/paean-js/package-lock.json']);
git(['commit', '-m', `Merge three.js ${ref} and align Paean runtime dependencies`]);
console.log(JSON.stringify({ branch, ref, commit, version: upstreamPackage.version, next: 'Run Paean and upstream checks, review the merge, then push this branch.' }));
