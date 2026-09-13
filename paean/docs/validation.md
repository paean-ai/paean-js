# Validation records

## Modular architecture acceptance — 0.2.0

Validated on 2026-09-13 with the same canonical three.js r186 baseline. The independently installed Canvas consumer had neither `three` nor `@types/three` present; its ESM, CommonJS and strict TypeScript checks passed. All 63 SDK behavior/contract/dependency tests and all 16 Chromium browser tests passed locally. Upstream protected files remained byte-for-byte identical. New English documentation links resolved locally.

Browser verification covered both new Canvas examples with WebGL context creation blocked, actual rendered pixels, paused-pose outfit replacement, keyboard/touch input, pixel-game completion/restart, mobile sizing, image orientation, global rig slot order, camera coordinate conversion, and high-DPI vector sizing. The three native-three examples also passed. Request checks confirmed the 3D example loaded no Paean 2D or platform modules. ESM import walks and browser-bundle source maps rejected cross-family dependencies without relying on tree shaking.

Complete-entry consumer bundles measured by esbuild 0.28.2, minified ESM for ES2022, using all exports in each listed entry:

| Entry set | Minified bytes | Gzip bytes | Unbundled modules / source bytes |
| --- | ---: | ---: | ---: |
| `/core` | 6,371 | 2,445 | 7 / 12,262 |
| `/2d` + `/vector` | 15,562 | 5,519 | 10 / 30,404 |
| `/pixel` | 16,400 | 5,773 | 13 / 32,492 |
| `/platform` | 4,822 | 1,932 | 3 / 11,146 |

Vector and pixel figures include their shared runtime dependencies. Assets, application code, source maps, HTTP overhead, and three.js are excluded. This measures a complete-entry consumer bundle, not the sum of separately compressed browser chunks and not the npm tarball. The distribution still includes optional modules/proxies. Transfer budgets are regression gates in `test/modularity.test.mjs`, not universal performance claims; rerun them after changing the build or modules.

### Real modular upstream merge rehearsal

The 0.2 implementation was placed on canonical r185 (`2431a09f46f34c560bc8e44b33be0e567723d5b9`, three 0.185.1 / types 0.185.0) in an isolated worktree. The production sync command merged r186 into a real two-parent commit (`e0b7b13b4a`, parents `64905ba6c5` and `148ef33ecb`). Both optional peer pins and development copies were updated correctly. A source diff against the main 0.2 implementation was empty: Canvas modules required no renderer-driven edits.

After the merge, canonical provenance, all 63 SDK tests, strict consumer types, the renderer-free and native-three installed-package consumers, and all 16 browser tests passed. The browser suite served the isolated merged worktree on a separate local port. The rehearsal branch is test-only and is not published as a product branch. This adds modular-package validation to the original merge rehearsal recorded below.

## Initial 0.1.0 acceptance

The initial Paean JS 0.1.0 implementation was validated on 2026-09-13 against three.js r186 (`148ef33ecb6d2502ff796d4554abd1549c95d519`). This record describes executed checks, not a promise that every possible game or device has been covered.

| Check | Observed result |
| --- | --- |
| Protected upstream files | No differences from the recorded canonical release |
| Paean behavior and contract tests | 46 passed, 0 failed |
| TypeScript consumer | Passed with strict checking and upstream types |
| Installed package consumer | ESM, CommonJS, addons, and constructor identity passed |
| Browser acceptance | 9 passed, 0 failed, including real rendering and complete collection-game win/restart |
| Upstream lint | Passed |
| Upstream core unit suite | 1,315 passed, 0 failed, 1 upstream TODO |
| Upstream addon unit suite | 385 passed, 0 failed |
| SDK dependency audit | 0 reported vulnerabilities at validation time |
| Workflow syntax | All workflow YAML parsed successfully |
| English documentation links | No broken local links in the new reference documentation |

Local execution used macOS, Node.js 26, and Playwright 1.63 Chromium. The Paean CI workflow separately targets Node.js 22 and 24 on Linux; consult [its runs](https://github.com/paean-ai/paean-js/actions/workflows/paean-ci.yml) for the status of a specific commit. Browser tests read framebuffer colors as well as renderer geometry counts, so an empty canvas does not count as a successful render.

## Real upstream merge rehearsal

An isolated worktree started from the actual r185 release (`2431a09f46f34c560bc8e44b33be0e567723d5b9`, package version 0.185.1), with the Paean layer added. The production synchronization script merged r186, preserved both merge parents, restored protected paths to the exact new upstream tree, and aligned the runtime/type dependencies. Provenance, all 46 Paean tests, strict consumer types, installed package tests, and all 9 browser tests passed after that merge.

This exercised two real upstream edge cases: adjacent tags on divergent release branches and generated files deleted by a new release. Type-definition patch numbers are tracked independently from renderer patch numbers. The rehearsal branch is test-only and is not published as a product branch.

## Boundaries

The entire upstream visual example baseline, WebGPU-specific Paean materials, Safari/Firefox/mobile hardware, and real native Paean hosts were not exercised by this local acceptance run. Platform cases use deterministic helper mocks and browser integration tests. The canonical host SDK remains responsible for transport, consent, ownership, and billing behavior. Follow the maintenance and platform guides for release-specific integration testing.
