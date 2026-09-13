# Initial acceptance record

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
