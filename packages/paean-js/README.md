# @paean-ai/paean-js

Independent 3D, Canvas vector, and Canvas pixel modules for Paean / 8x. Native three.js APIs, cutout rigs and outfits, standardized pixel assets, and optional platform services. MIT licensed.

## Select a visual backend

```js
// Canvas vector application: no three.js or pixel dependency.
import { CanvasGame, Node2D } from '@paean-ai/paean-js/2d';
import { VectorPath, Rig2D } from '@paean-ai/paean-js/vector';

// Canvas pixel application: no three.js or vector dependency.
import { PixelGame, SpriteSheet, Sprite2D, TileLayer } from '@paean-ai/paean-js/pixel';

// Native 3D application: exact upstream exports, no Paean game runtime.
import { Scene, Mesh, WebGLRenderer } from '@paean-ai/paean-js/3d';
import { OrbitControls } from '@paean-ai/paean-js/addons/controls/OrbitControls.js';
```

Choose the applicable imports; an application does not need all three groups. `/core`, `/formats`, and `/platform` are independent opt-in entry points. `/3d/vector` and `/3d/pixel` retain the native-three 2D adapters for mixed scenes. The root and `/game` retain the original combined 0.1 API; new Canvas APIs are available only at their explicit subpaths.

Pure Canvas/core/formats/platform consumers do not install or load `three` or `@types/three`. Native-three entries require the exact optional renderer peer declared in package.json; TypeScript consumers of those entries also install the matching optional types peer. The current baseline is `three@0.186.0` and `@types/three@0.186.0`. ESM/CommonJS preserve shared identities within each module system. Addons, source proxies, WebGPU, TSL and the legacy SVG helper follow upstream ESM usage.

Static applications can copy `dist/bundles` and import `bundles/pixel.js`, or `bundles/2d.js` plus `bundles/vector.js`, without a bundler or three.js import map. Keep the shared hashed chunks from the same build. Browsers fetch only reachable modules. The single tarball contains optional modules; runtime loading remains selective.

## Learn and build

See the [quick start](https://github.com/paean-ai/paean-js#readme), [modular usage and migration](https://github.com/paean-ai/paean-js/blob/main/paean/docs/modules.md), [API reference](https://github.com/paean-ai/paean-js/blob/main/paean/docs/api.md), [examples](https://github.com/paean-ai/paean-js/tree/main/packages/paean-js/examples), and [architecture](https://github.com/paean-ai/paean-js/blob/main/paean/docs/architecture.md).

Use seconds and radians. World Y points up; source image rectangles and serialized map rows start at the top-left. Canvas Node2D objects and three.Object3D objects are separate scene graphs. Canvas source images remain caller-owned; native-three geometry/material/texture ownership follows the API reference. Platform services require the canonical PaeanSDK helper; local play requires no host.

This package is built from the three.js-derived [Paean JS repository](https://github.com/paean-ai/paean-js). The root repository package remains upstream `three`; build and run `npm pack` inside `packages/paean-js` for the Paean SDK. The 0.x API is evolving. npm publication is a separate maintainer action. See LICENSE and NOTICE for attribution and redistribution terms.
