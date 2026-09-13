# Architecture

Paean JS is a compositional SDK maintained in a three.js-derived repository. It has two independent version axes: the upstream renderer revision and the Paean game API version. This allows renderer changes to be reviewed separately from game semantics.

## Repository boundaries

| Location | Owner and purpose |
| --- | --- |
| `src`, `build`, `examples`, `test`, `utils`, other protected paths | Unmodified upstream three.js |
| Root `package.json` and lockfile | Original upstream development environment |
| `packages/paean-js/src` | Paean runtime and public types |
| `packages/paean-js/examples` | Small, complete, locally runnable applications |
| `packages/paean-js/test` | Behavior, consumer, package, and browser verification |
| `paean/upstream.json` | Reproducible upstream tag, commit, version, and ownership boundary |
| `scripts/paean` | Upstream integrity and update tooling |
| `paean/docs`, `paean/api.json`, `llms.txt` | Human and model-readable contract |
| `paean/upstream` | Original upstream project documentation |

The root package intentionally remains `three`. Do not install the Git repository root expecting the Paean package. Build and pack `packages/paean-js` instead.

## Dependency identity

The SDK's main ESM entry exports everything from `three` and adds game exports. The CommonJS entry externalizes `three` and uses its original CommonJS module. Generated addon/source proxies forward exports to their original modules. The exact runtime peer and matching type dependency are pinned to the recorded stable upstream version.

Applications should resolve one version of `three` in one module system. Mixing ESM and CommonJS constructor identities, or loading a second copy through a CDN or bundler alias, has the same risks as in upstream three.js. Do not bundle the SDK with an embedded second renderer.

## Game composition

`Game2D` is a small browser convenience layer over `Scene`, `WebGLRenderer`, `PixelViewport`, `Input`, `AssetStore`, and `FixedStepLoop`. Existing applications can use the modules independently. There is no required entity-component architecture, custom scene graph, proprietary math type, global game singleton, or replacement asset transport.

`Skeleton2D` extends `Group`, creates native `Bone` objects, and animates with `AnimationMixer`. Slots are groups parented to bones. Outfit switching changes the child attachments without changing the bone transforms. This supports vector and raster cutouts in one hierarchy; it is not a weighted-mesh file-format runtime.

`VectorShape` extends `Mesh`. `PixelSprite` extends `Mesh` and owns its geometry and material, while sharing an atlas. `TileMap` merges one layer into one geometry/material. `GridCollision` operates independently on local AABBs and a tile-solid callback.

The platform adapter uses a lazily resolved canonical `PaeanSDK` helper. It neither implements the native bridge nor sends its own HTTP requests. Platform use is optional and never a prerequisite for constructing a game.

## Conventions and ownership

- Time is in seconds and rotation in radians. Simulation updates are fixed-step; display rendering receives an interpolation fraction.
- The world is Y-up. `PixelViewport` starts at bottom-left `(0, 0)`. Atlas rectangles and serialized map row zero are top-left.
- Pixel sprites default to one world unit per source pixel. `pixelsPerUnit` is explicit when mixing with a differently scaled 3D scene.
- A game owns its renderer, input listeners, loop, and asset store. It does not own arbitrary objects added to its scene.
- Shapes, sprites, and tilemaps own their geometry/material. Atlases own cloned samplers. Attachments and the source texture remain caller-owned.
- An asset store disposes owned resources after async resolution, including resources arriving after shutdown. Use one key per resource type and `own: false` for externally owned resources.
- `PaeanPlatform.dispose()` prevents future operations; an already submitted host request cannot be recalled.

## Intentional boundaries

Paean does not change three.js rendering semantics or promise binary compatibility between upstream revisions. WebGL game materials are validated separately from the unchanged WebGPU/TSL surface. Physics, networking authority, economy validation, and entitlement enforcement remain explicit application/host concerns. See the roadmap for future work.
