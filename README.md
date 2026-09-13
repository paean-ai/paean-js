# Paean JS

**Independent 3D, vector 2D, and pixel game modules for Paean and 8x.**

[![Paean SDK](https://github.com/paean-ai/paean-js/actions/workflows/paean-ci.yml/badge.svg)](https://github.com/paean-ai/paean-js/actions/workflows/paean-ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Paean JS provides the complete three.js API alongside independent Canvas vector and pixel modules, skeletal cutout animation, interchangeable outfits, and optional Paean platform services. Pure 2D games run without installing or loading three.js. Each visual module has its own import boundary; platform services are opt-in. Existing three.js objects remain native objects: Paean re-exports upstream constructors instead of wrapping or replacing them.

This repository preserves three.js history and its source tree. The independently versioned SDK lives in [`packages/paean-js`](packages/paean-js). The root package remains upstream `three` so upstream builds and tests retain their original behavior.

**Current release:** Paean JS `0.2.0`, aligned with three.js **r186 / 0.186.0**. This is a development release; APIs may evolve before 1.0. The authoritative upstream reference is [`paean/upstream.json`](paean/upstream.json).

## Start here

```sh
git clone https://github.com/paean-ai/paean-js.git
cd paean-js/packages/paean-js
npm ci
npm run build
npm run dev
```

Open [the local examples](http://127.0.0.1:4173). Node.js 22 or later is required for development. Canvas examples use only Canvas 2D; native-three examples require WebGL 2.

To install this initial release into another project, build a package from the checkout:

```sh
# Run in packages/paean-js. The prepack hook builds distribution files.
npm pack

# Run in your application, using the actual path to the tarball.
npm install /path/to/paean-ai-paean-js-0.2.0.tgz

# Only for 3D or native-three adapters:
npm install three@0.186.0
# TypeScript applications using those entries also install:
npm install --save-dev @types/three@0.186.0
```

The package name is `@paean-ai/paean-js`. **An npm registry publication is not implied by this repository release.** CI produces an installable package artifact. Installing the repository root directly installs upstream `three`, not the Paean SDK.

## Keep your three.js knowledge

```js
import { Scene, Mesh, BoxGeometry, MeshStandardMaterial } from '@paean-ai/paean-js/3d';
import { OrbitControls } from '@paean-ai/paean-js/addons/controls/OrbitControls.js';
import { WebGPURenderer } from '@paean-ai/paean-js/webgpu';
import { vec3 } from '@paean-ai/paean-js/tsl';

// All of these are the original upstream exports.
const scene = new Scene();
scene.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial()));
```

You can keep importing `three`, `three/addons/*`, `three/webgpu`, and `three/tsl` directly. The optional renderer peer is pinned to the tested upstream revision; it is required only when using three.js entries or the compatibility aggregates. See the [compatibility contract](paean/docs/compatibility.md), including renderer boundaries and browser import maps.

## Load the visual modules you need

| Workload | Imports | Rendering dependency |
| --- | --- | --- |
| Vector characters and outfits | `/2d` + `/vector` | Canvas 2D only |
| Pixel games and tile worlds | `/pixel` | Canvas 2D only |
| Native three.js scenes | `/3d`, optional `/core` | Canonical three.js peer |
| 2D attachments inside a three.js scene | `/3d/vector`, `/3d/pixel` | Canonical three.js peer |
| Input, loops, resources, random | `/core` | None |
| Aseprite / Tiled data | `/formats` | None |
| Paean / 8x services | `/platform` | Optional canonical host helper |

```js
import { CanvasGame } from '@paean-ai/paean-js/2d';
import { VectorPath } from '@paean-ai/paean-js/vector';

const player = VectorPath.rectangle(16, 24, { fill: '#85ebc5' });
player.x = 160; player.y = 90;
const game = new CanvasGame({
  width: 320, height: 180,
  update(dt, game) {
    player.x += game.input.axis('left', 'right') * 80 * dt;
  },
});
game.scene.add(player);
document.body.append(game.canvas);
game.resize(640, 360);
game.start();
// On exit: game.dispose();
```

The root and `/game` entries retain the 0.1 combined API. Prefer selective imports for new applications: they work without relying on tree shaking, and the prebuilt browser bundles fetch only reachable shared chunks. One npm tarball contains all optional modules, but applications load only the selected graph. See [selective imports and migration](paean/docs/modules.md).

Canvas vector art supports Path2D fills/strokes, polygons, SVG path data, hierarchical cutout rigs, and outfits. Canvas pixel games include nearest sampling, named sheets, frame timing, tile editing, integer enlargement, and swept grid collision. Both backends share asset definitions and can be combined explicitly in one Canvas scene. Native three.js 2D adapters remain available for mixed 2D/3D scenes. Weighted deformation, full SVG-document rendering in Canvas, and new WebGPU game materials remain outside the implemented scope.

## Examples and documentation

- [Canvas crystal run](packages/paean-js/examples/canvas-pixel.html): pixel-only game, no three.js dependency.
- [Canvas wardrobe](packages/paean-js/examples/canvas-vector.html): vector-only bones and outfits, no pixel dependency.
- [Native-three crystal courier](packages/paean-js/examples/pixel.html): playable pixel game with collisions, touch controls, collection, and progress.
- [Native-three vector wardrobe](packages/paean-js/examples/skeleton.html): animated vector character and live outfit changes.
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

Checks cover dependency boundaries, transfer budgets, upstream export identity, game behavior, strict consumer types without renderer peers, installed packages, and browser rendering and interaction with WebGL disabled for Canvas examples. Upstream test suites are retained separately. The sync workflow runs upstream lint and unit/addon suites before proposing an upgrade. See the [validation records](paean/docs/validation.md) for executed checks and their boundaries.

## Follow upstream

```sh
node scripts/paean/sync-upstream.mjs --check
node scripts/paean/sync-upstream.mjs --ref r186
```

The workflow checks stable releases daily and supports manual dispatch. It prepares tested update branches and opens pull requests when organization policy permits. Otherwise, the run summary links to a manual PR. Updates are never merged automatically. The command preserves common ancestry and refuses a dirty working tree. Read [the maintenance guide](paean/docs/upstream.md) before promoting an upstream release.

## Open source and model familiarity

Paean additions are MIT-licensed. Upstream copyright, license, authorship, and history are retained. See [NOTICE](NOTICE).

The English reference, schemas, executable examples, API catalog, and evaluation tasks help people and coding models such as Praxis learn the framework. Inclusion in training data and reliable model familiarity require a separate training and evaluation process; this repository does not claim that it has already happened.
