# Compatibility contract

The supported upstream baseline is recorded in `paean/upstream.json`. The initial release uses three.js r186. Paean's package version is independent of this baseline.

## Entry points

| Existing three.js import | Paean equivalent | Contract |
| --- | --- | --- |
| `three` | `@paean-ai/paean-js/3d` | Exact upstream namespace, no game runtime |
| `three` plus Paean 0.1 game APIs | `@paean-ai/paean-js` | Compatibility aggregate; every upstream export plus noncolliding Paean exports |
| `three/addons` | `@paean-ai/paean-js/addons` | Original addon barrel |
| `three/addons/*` | `@paean-ai/paean-js/addons/*` | Generated export proxies, including default exports |
| `three/examples/jsm/*` | `@paean-ai/paean-js/examples/jsm/*` | Same proxy modules as addons |
| `three/examples/fonts/*` | `@paean-ai/paean-js/examples/fonts/*` | Assets present in the installed upstream package |
| `three/src/*` | `@paean-ai/paean-js/src/*` | Original source exports; these remain upstream internal APIs |
| `three/webgpu` | `@paean-ai/paean-js/webgpu` | Exact WebGPU namespace |
| `three/tsl` | `@paean-ai/paean-js/tsl` | Exact TSL namespace |
| — | `@paean-ai/paean-js/game` | Paean game exports without the core namespace barrel |
| — | `@paean-ai/paean-js/vector-svg` | Optional SVG fill helper |

All canonical `three/*` imports continue working. Addon assets that upstream does not ship in its npm package are not synthesized. Supply external decoder/worker/model resources exactly as upstream requires. Paean does not bundle every example model or development font into its SDK.

ESM and CommonJS are provided for root/game, core, 2d, vector, pixel, platform, formats, 3d, and the native-three 2D adapters. Addons, source proxies, WebGPU, TSL, and SVG follow upstream's ESM usage. Type coverage for upstream internals and addons follows `@types/three`; a generated forwarding declaration cannot provide types absent upstream.

## Independent Canvas entries

`/2d`, `/vector`, `/pixel`, `/core`, `/formats`, and `/platform` contain no three.js runtime or type dependency. They can be installed and type-checked without either optional renderer peer. `/3d/vector` and `/3d/pixel` preserve the existing native-three game APIs through selective imports. The root and `/game` remain full compatibility aggregates.

The 0.2 packaging change makes `three` and `@types/three` optional peers. Existing applications using the root/game/3d/addon entries must install the tested `three` version explicitly, and TypeScript consumers of those entries must install its matching `@types/three` version. Public 0.1 names, methods, and identities are preserved; automatic peer installation is intentionally changed. See [migration](modules.md#migration-from-01).

## Browser import maps

The examples use local modules. A minimal application using addon aliases needs both an exact `three` mapping and a `three/` prefix mapping because generated proxies refer to canonical upstream module paths:

```html
<script type="importmap">
{
  "imports": {
    "three": "/vendor/three/build/three.module.js",
    "three/": "/vendor/three/",
    "three/addons/": "/vendor/three/examples/jsm/",
    "@paean-ai/paean-js/3d": "/vendor/paean/dist/3d.js",
    "@paean-ai/paean-js/addons/": "/vendor/paean/compat/examples/jsm/"
  }
}
</script>
```

Serve the package trees at those paths or use a bundler. The generated `dist/paean.game.js` retains the 0.1 aggregate with `three` external. New Canvas applications can use the independent `dist/bundles/2d.js`, `vector.js`, or `pixel.js` files and shared chunks without an import map or three.js installation. Browser imports do not execute package.json exports; configure each additional entry you use explicitly.

## What is checked

CI enumerates every upstream top-level export and verifies strict identity, checks for Paean name collisions, verifies complete WebGPU and TSL namespace identity, exercises representative loaders/controls/source/default exports, and installs the tarball into an isolated consumer. The repository integrity check compares all upstream-owned files against the recorded upstream commit. Browser tests render all five examples and exercise gameplay, input, outfits, resizing, and access decline.

Namespace compatibility does not imply every rendering configuration or every hardware/browser combination has been tested. New upstream releases are pinned, merged, tested, and reviewed before promotion. `src/*` is an upstream internal surface and may change between revisions.

## Renderer boundaries

Native three.js 3D, loaders, animation, audio, WebXR, WebGPU, and TSL remain available. Paean's added `MeshBasicMaterial`-based vector/sprite/tile helpers and `Game2D` are currently tested on WebGL 2. The WebGPU entry intentionally exports only upstream WebGPU; do not treat it as a promise of node-material implementations for the game layer.

Applications may use three.js materials and renderers directly, including native weighted `SkinnedMesh`, without adopting `Game2D`. Engine limitations, browser requirements, color management, depth ordering, and optional addon licensing continue to follow upstream.
