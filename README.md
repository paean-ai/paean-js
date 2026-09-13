# Paean JS

**A composable game SDK for Paean and 8x, built on three.js.**

[![Paean SDK](https://github.com/paean-ai/paean-js/actions/workflows/paean-ci.yml/badge.svg)](https://github.com/paean-ai/paean-js/actions/workflows/paean-ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Paean JS combines the complete three.js API with vector characters, skeletal cutout animation, interchangeable outfits, pixel worlds, and optional Paean platform services. Existing three.js objects remain native objects: Paean re-exports upstream constructors instead of wrapping or replacing them.

This repository preserves three.js history and its source tree. The independently versioned SDK lives in [`packages/paean-js`](packages/paean-js). The root package remains upstream `three` so upstream builds and tests retain their original behavior.

**Current release:** Paean JS `0.1.0`, aligned with three.js **r186 / 0.186.0**. This is an initial development release; APIs may evolve before 1.0. The authoritative upstream reference is [`paean/upstream.json`](paean/upstream.json).

## Start here

```sh
git clone https://github.com/paean-ai/paean-js.git
cd paean-js/packages/paean-js
npm ci
npm run build
npm run dev
```

Open [the local examples](http://127.0.0.1:4173). Node.js 22 or later is required for development. Examples run locally and require WebGL 2.

To install this initial release into another project, build a package from the checkout:

```sh
# Run in packages/paean-js. The prepack hook builds distribution files.
npm pack

# Run in your application, using the actual path to the tarball.
npm install /path/to/paean-ai-paean-js-0.1.0.tgz three@0.186.0
```

The package name is `@paean-ai/paean-js`. **An npm registry publication is not implied by this repository release.** CI produces an installable package artifact. Installing the repository root directly installs upstream `three`, not the Paean SDK.

## Keep your three.js knowledge

```js
import { Scene, Mesh, BoxGeometry, MeshStandardMaterial } from '@paean-ai/paean-js';
import { OrbitControls } from '@paean-ai/paean-js/addons/controls/OrbitControls.js';
import { WebGPURenderer } from '@paean-ai/paean-js/webgpu';
import { vec3 } from '@paean-ai/paean-js/tsl';

// All of these are the original upstream exports.
const scene = new Scene();
scene.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial()));
```

You can keep importing `three`, `three/addons/*`, `three/webgpu`, and `three/tsl` directly. The pinned peer dependency prevents a second renderer revision from being installed silently. See the [compatibility contract](paean/docs/compatibility.md), including renderer boundaries and browser import maps.

## Add game capabilities

```js
import { Game2D, VectorShape } from '@paean-ai/paean-js';

const player = VectorShape.rectangle(16, 24, { color: 0x85ebc5 });
player.position.set(160, 90, 0);
const game = new Game2D({
  width: 320,
  height: 180,
  update(dt, game) {
    player.position.x += game.input.axis('left', 'right') * 80 * dt;
  },
});
game.scene.add(player);
document.body.append(game.canvas);
game.viewport.resize(window.innerWidth, window.innerHeight);
game.start();

// On exit: player.dispose(); game.dispose();
```

| Area | Included capabilities |
| --- | --- |
| three.js | Complete core namespace, addon/source aliases, WebGPU and TSL entry points |
| Runtime | Fixed steps, bounded catch-up, visibility-aware Game2D, keyboard/pointer/touch actions, seeded randomness, async resources |
| Vector 2D | Native shapes, holes and polygons, SVG fills through upstream SVGLoader |
| Skeletal 2D | Hierarchical bones, native clips/mixer, crossfades, attachment slots, complete outfit switching |
| Pixel games | Nearest-filtered atlases, isolated sprite UVs, variable-duration animation, integer enlargement, tile layers, swept grid collision |
| Asset formats | Aseprite JSON frame/tag import; finite orthogonal Tiled JSON conversion; JSON Schemas |
| Paean / 8x | Explicit consent, preview-safe access, local saves, read-before-write cloud merges, offline score queue, service discovery |
| Developer experience | TypeScript, ESM/CommonJS, examples, API reference, agent guide, machine-readable catalog, tested package installation |

The 2D game materials are validated with `WebGLRenderer`. Upstream WebGPU remains available unchanged; this does not claim every Paean material has a WebGPU implementation. `Skeleton2D` is a cutout rig; native `SkinnedMesh` remains available for weighted meshes. See [supported boundaries and roadmap](paean/docs/roadmap.md).

## Examples and documentation

- [Crystal courier](packages/paean-js/examples/pixel.html): playable pixel game with collisions, touch controls, collection, and progress.
- [Vector wardrobe](packages/paean-js/examples/skeleton.html): animated vector character and live outfit changes.
- [Native 3D](packages/paean-js/examples/three.html): standard scene and OrbitControls through Paean imports.
- [API reference](paean/docs/api.md) · [Architecture](paean/docs/architecture.md) · [Platform integration](paean/docs/platform.md)
- [Asset formats](paean/docs/formats.md) · [Upstream synchronization](paean/docs/upstream.md) · [Contributing](.github/CONTRIBUTING.md)
- [Praxis and coding-agent guide](paean/docs/agents.md) · [API catalog](paean/api.json) · [llms.txt](llms.txt)
- [Original three.js README](paean/upstream/README.md) · [three.js documentation](https://threejs.org/docs/)

## Validate changes

```sh
# From the repository root:
node scripts/paean/check-upstream.mjs
npm ci --prefix packages/paean-js
npm run check --prefix packages/paean-js
cd packages/paean-js
npx playwright install chromium
npm run test:browser
```

Checks cover upstream export identity, game behavior, consumer types, an installed package, and browser rendering and interaction. Upstream test suites are retained separately. The sync workflow runs upstream lint and unit/addon suites before proposing an upgrade.

## Follow upstream

```sh
node scripts/paean/sync-upstream.mjs --check
node scripts/paean/sync-upstream.mjs --ref r186
```

The workflow checks stable releases daily and supports manual dispatch. It prepares tested update branches and opens pull requests when organization policy permits. Otherwise, the run summary links to a manual PR. Updates are never merged automatically. The command preserves common ancestry and refuses a dirty working tree. Read [the maintenance guide](paean/docs/upstream.md) before promoting an upstream release.

## Open source and model familiarity

Paean additions are MIT-licensed. Upstream copyright, license, authorship, and history are retained. See [NOTICE](NOTICE).

The English reference, schemas, executable examples, API catalog, and evaluation tasks help people and coding models such as Praxis learn the framework. Inclusion in training data and reliable model familiarity require a separate training and evaluation process; this repository does not claim that it has already happened.
