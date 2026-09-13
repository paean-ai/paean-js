# Upstream maintenance and releases

## Invariants

Keep the original three.js commit ancestry. Do not squash the renderer into a new root, rewrite upstream commits, or change upstream-owned source to fit the game layer. Paean extends the engine in a separate package. `paean/upstream.json` records the canonical repository, stable tag, commit, runtime version, and protected paths.

`check-upstream.mjs` verifies the tag against the canonical upstream repository, confirms it is an ancestor of HEAD, compares protected files byte-for-byte, and checks the runtime/type pins. Network access to GitHub is required for provenance verification. A local edit under a protected path fails even before it is committed.

The initial baseline is r186. Stable releases are the promotion channel. Upstream `dev` may be inspected and tested independently, but is not silently substituted for a released runtime. Development-channel compatibility is not promised.

## Check and merge

```sh
# Safe on a working tree: fetches release refs, reports JSON, does not change the branch.
node scripts/paean/sync-upstream.mjs --check

# Requires a clean tree. Replace r186 with the release you intend to promote.
node scripts/paean/sync-upstream.mjs --ref r186
```

An unchanged release is a no-op. For an update, the script verifies the existing upstream tree, creates `upstream/rNNN`, performs a real Git merge, updates recorded provenance, aligns `three` and `@types/three`, refreshes the SDK lockfile, preserves original upstream documentation in `paean/upstream`, and commits the merge. It never pushes or force-rewrites a branch.

Adjacent three.js release tags may be on divergent release branches. The script requires a shared ancestor and a strictly newer release number, rather than assuming linear tag ancestry. After proving that protected files have no Paean edits, it restores those paths from the complete target upstream tree. This preserves the merge parents while avoiding a mixture of two release builds or renderer versions.

The four project-identity documents (`README.md`, `llms.txt`, `SECURITY.md`, and `.github/CONTRIBUTING.md`) retain Paean's version if they conflict; their new upstream contents are preserved separately. Any other merge conflict stops with the branch and merge state available for inspection. Resolve deliberately or run `git merge --abort`; do not resolve renderer conflicts by blindly choosing a side.

DefinitelyTyped patch numbers are independent of three.js patch numbers. The sync selects and pins the newest available type package in the same renderer revision line, records it as `typesVersion`, and validates the resulting consumer types. If that revision's type package has not reached npm, the update stops before creating a merge branch. Runtime/lockfile resolution failures still require a maintainer retry. A downgrade, moved release tag, or unrelated upstream history is rejected. Existing update branches are never overwritten.

## Required upgrade checks

```sh
node scripts/paean/check-upstream.mjs
npm ci --prefix packages/paean-js
npm run check --prefix packages/paean-js
cd packages/paean-js
npx playwright install chromium
npm run test:browser
cd ../..
npm ci
npm run lint
npm run test-unit
npm run test-unit-addons
```

Review upstream release notes and the [migration guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide). Audit import paths, material behavior, color management, renderer requirements, resource disposal, and addon/type changes. Update versioned prose, example revision labels, `paean/api.json`, and the changelog. Broader three.js rendering suites remain available at the repository root when an upgrade needs them; the entire upstream visual baseline is not run for every game-layer edit.

## Automation

`.github/workflows/paean-upstream.yml` checks stable releases daily at 03:17 UTC and supports manual dispatch. It creates one update branch per upstream release, runs SDK/browser/provenance checks plus upstream lint/unit/addon suites, and opens a PR. It does not auto-merge. Failures remain visible in Actions; no passing result or clean merge is fabricated.

GitHub Actions must be enabled and permitted to create pull requests in repository/org settings. Default `GITHUB_TOKEN` permissions may be restricted by the organization. If automated PR creation is denied, the prepared branch can be used for a manual PR. Runs made with `GITHUB_TOKEN` do not recursively trigger ordinary push/PR workflows, so all required checks are executed inside the sync workflow itself. Maintainers can also dispatch the Paean SDK workflow on an update branch.

An existing update branch is left untouched. If its PR creation failed, create the PR from that branch. If the branch needs regeneration, inspect and deliberately replace it through normal maintenance rather than expecting the sync command to force-push it.

## Package release

Paean and three.js versions are independent. Use `0.x` for evolving game APIs; after 1.0, follow semantic versioning for Paean APIs and document every upstream upgrade's breaking impact.

1. Update the SDK package version, `PAEAN_VERSION`, lockfile, catalog, and changelog together.
2. Run provenance, SDK, package-consumer, and browser checks; complete any native-host integration validation appropriate to the release.
3. Run `npm pack` in `packages/paean-js` and review the tarball contents and license notices.
4. Tag the reviewed commit with a Paean-specific tag such as `paean-v0.1.0`; do not reuse upstream `rNNN` names.
5. Attach the tarball and release notes to a GitHub release when authorized. Publish to npm only through an explicitly configured maintainer release process; this repository does not embed registry credentials or auto-publish.

The root package remains upstream `three`; never publish it under the upstream name from this repository. CI artifacts provide a reproducible initial distribution before npm publication is configured.
