# Contributing to Paean JS

Discuss substantial API changes in an issue with a concrete use case. Small fixes, documentation improvements, and focused reproductions are welcome as pull requests.

## Development

1. Install Node.js 22 or later and clone the repository.
2. Run `npm ci --prefix packages/paean-js` from the root.
3. Run `npm run build --prefix packages/paean-js` and `npm run dev --prefix packages/paean-js`.
4. Keep additions under `packages/paean-js`, `paean`, or `scripts/paean`.
5. Run the validation commands in the README before submitting a pull request.

Use clear English for new documentation, identifiers, comments, issues, and pull requests. Add types and reference documentation with API changes. Test behavior, ownership, invalid input, and browser interaction. Keep runtime modules free of Node.js APIs and import-time browser side effects.

Preserve upstream-owned paths listed in `paean/upstream.json`. Do not rename the root package or regenerate upstream files as part of a Paean change. Propose renderer fixes upstream and integrate them through a recorded update. The [upstream contribution guide](../paean/upstream/CONTRIBUTING.md) is preserved for renderer work.

Read [the module boundaries](../paean/docs/architecture.md) before adding dependencies. Keep Canvas vector and pixel modules independent from three.js and from each other; import shared primitives directly. Core, formats, and platform must remain independently loadable. Dependency graph, package-installation, and transfer-budget tests enforce these boundaries.

## Pull requests

Explain the problem, resulting behavior, compatibility impact, and validation. Include runnable examples for substantial features. Update `paean/api.json`, agent guidance, schemas, and the changelog when their contract changes. Avoid speculative APIs, hidden data loss, unrelated formatting, and new external services without an application need.

Do not commit distribution files, dependency folders, access tokens, private assets, or player data. Contributions and assets require compatible licensing and attribution. Contributions are licensed under the project's MIT license.

Repository maintainers review changes. Upstream merges require human review even when CI passes. Read [the maintenance guide](../paean/docs/upstream.md) for release work.
