# Paean API reference

Import the following from `@paean-ai/paean-js` or the narrower `@paean-ai/paean-js/game`. Generated TypeScript declarations are the precise signature reference. Upstream classes retain their [three.js documentation](https://threejs.org/docs/).

## Game2D

`new Game2D({ canvas?, width = 320, height = 180, frequency = 60, clearColor?, update?, beforeRender?, onError? })`

Creates a WebGL renderer, scene, pixel viewport, input, asset store, and fixed-step loop. `update(dt, game)` receives seconds. `beforeRender(alpha, game)` runs immediately before drawing. `game.scene`, `camera`, `canvas`, `renderer`, `viewport`, `input`, `assets`, and `loop` are public native/composable objects.

Call `start()`, `stop()`, and `dispose()` explicitly. Hidden documents pause simulation; a game that was running resumes without a giant delta. Calling `stop()` while hidden cancels automatic resume. Attach the canvas to the DOM and call `viewport.resize()` when its container changes. Scene resources remain application-owned. Construction requires WebGL 2; renderer/context failures propagate to the caller.

## FixedStepLoop

`new FixedStepLoop({ update, render?, frequency = 60, maxSteps = 5, maxFrameTime = 0.25, requestFrame?, cancelFrame?, onError? })`

- `advance(seconds): number` runs zero or more simulation steps and one render callback, returning the step count. It works without a browser.
- `start()` / `stop()` control browser scheduling and are idempotent. `running` reports status. `dispose()` permanently ends the loop.
- The render callback receives `alpha` in `[0, 1)`. Maintain previous/current transforms in the application if interpolation is needed.
- Long frames are clamped and excess catch-up work is discarded. This keeps UI responsive but intentionally drops elapsed simulation time after stalls.
- Callback errors stop scheduling. `onError` receives the failure; without it, the failure is thrown.

## Input

`new Input(element, { bindings?, preventDefault = true })`

Default actions are `left` (A/Left), `right` (D/Right), `up` (W/Up), `down` (S/Down), and `jump` (Space). Bindings use `KeyboardEvent.code`.

`down(action)`, `justPressed(action)`, `justReleased(action)`, and `axis(negative, positive)` read actions. `setAction(action, held)` injects a touch/gamepad/replay action. It does not automatically poll gamepads. `endFrame()` clears edges after each simulation step; `Game2D` does this automatically. `reset()` clears held and edge state; blur, pointer cancellation, and document hiding prevent sticky input.

`pointer` contains element-relative CSS-pixel `x`, `y`, `down`, and `id`. One primary pointer is tracked. Input attaches listeners only to the supplied surface/document and restores the prior tab index on `dispose()`. Use `touch-action: none` on game canvases or touch controls that should capture gestures.

## Random

`new Random(seed = 1)` provides `next()` in `[0, 1)`, `range(min, max)`, inclusive `int(min, max)`, and `pick(items)`. Save and restore numeric `state` for reproducibility. The generator is Mulberry32 and is unsuitable for secrets, purchases, or authoritative competitive outcomes. Integer ranges contain at most 2^32 values.

## AssetStore

`load(key, loader, own = true): Promise<T>` deduplicates loading by key. Failed loads leave no cache entry and can be retried. The caller chooses how to load textures, audio, models, or data using existing three.js loaders or application code. A key must always refer to the same resource type.

`has(key)` includes pending loads. `dispose()` releases owned values that have a `dispose()` method, including late arrivals, and attempts all releases even if one throws. Shared cached object identities are disposed once. External resources use `own = false`. There is no implicit traversal of model materials, textures, or nested scene graphs; register a composite disposer if needed.

## VectorShape and SVG

`new VectorShape(shapeOrShapes, { color = 0xffffff, opacity = 1, curveSegments = 12 })` creates a native `Mesh<ShapeGeometry, MeshBasicMaterial>` in XY. Holes use native `Shape.holes`.

Factories: `rectangle(width, height, style?)`, `circle(radius, style?)`, `polygon(points, style?)`. Primitives are centered except polygons, which retain supplied coordinates. Control position, rotation, scale, material, and `renderOrder` with normal three.js APIs. Call `dispose()` for geometry/material.

`parseSVG(source): Group` is exported separately from `@paean-ai/paean-js/vector-svg`. It uses the upstream SVGLoader, converts fill paths, and flips SVG's Y axis. It requires browser DOMParser and trusted SVG input. Strokes, gradients, filters, text, and external resources are outside this helper's scope. Dispose generated meshes yourself; the returned group is native.

## Skeleton2D

`new Skeleton2D({ bones, slots? })` creates a native group. Bones have `name`, optional `parent`, `x`, `y`, `rotation` in radians, `scaleX`, and `scaleY`. Declaration order is flexible; cycles, unknown parents, and duplicate names throw. Names use `[A-Za-z_][A-Za-z0-9_]*` for reliable animation binding.

Slots have `name`, `bone`, optional `x`, `y`, and `order`. `addSlot(definition)` creates a group attached to a bone. Public `bones` and `slots` are maps of native objects. Slot `order` sets group ordering; nested groups and attachment renderOrder continue to follow native three.js sorting.

```js
const rig = new Skeleton2D({
  bones: [{ name: 'root' }, { name: 'arm', parent: 'root', x: 12 }],
  slots: [{ name: 'sleeve', bone: 'arm' }],
});
rig.defineSkin('green', { sleeve: VectorShape.rectangle(8, 24, { color: 0x85ebc5 }) });
rig.defineSkin('gold', { sleeve: VectorShape.rectangle(8, 24, { color: 0xf0bf78 }) });
rig.setSkin('green');
const clip = rig.createClip('wave', 1, [
  { bone: 'arm', property: 'rotation', times: [0, 0.5, 1], values: [-0.2, 0.4, -0.2] },
]);
rig.play(clip);
// In update(dt): rig.update(dt). Later: rig.setSkin('gold').
```

`defineSkin(name, attachments)` registers caller-owned objects keyed by slot name. One object cannot occupy two slots in the same skin. `setSkin(name)` replaces the complete outfit; omitted slots become empty, old attachments detach, and bone pose remains intact. Do not mutate attachments into cyclic hierarchies after registration.

`createClip(name, duration, tracks)` builds native number tracks. Supported properties: `x`, `y`, `rotation`, `scaleX`, `scaleY`. Keyframe times must strictly increase within the duration. `play(clip, fadeSeconds = 0)` returns the native `AnimationAction`; configure its loop/repetition/clamp behavior using three.js methods. `update(seconds)` advances the mixer. `dispose()` releases animation bindings and detaches attachments without disposing them.

## PixelAtlas

`new PixelAtlas(texture, { width, height, frames })` defines named rectangles `{ x, y, width, height }` in top-left image pixels. Names are strings. Frames must be positive, unrotated, and within bounds. `PixelAtlas.grid(texture, width, height, tileWidth, tileHeight = tileWidth)` creates row-major frame names `"0"`, `"1"`, etc.

`frame(name)` returns a frozen rectangle. `uv(name, flipX = false, flipY = false)` returns UV pairs in PlaneGeometry vertex order. `texture` is a private cloned sampler using nearest filtering, clamp wrapping, no mipmaps, and sRGB color. The source image must use the normal three.js image orientation; data textures/ImageBitmap orientation must be prepared appropriately by the caller. The caller's sampler is not modified. Dispose the atlas after its sprites and maps; dispose the original texture separately.

## PixelSprite and SpriteAnimator

`new PixelSprite(atlas, frame, { pixelsPerUnit = 1, flipX = false, flipY = false })` creates a centered quad. `setFrame(name)` updates geometry bounds and per-instance UVs while preserving Object3D.scale. `setFlip(x, y?)` updates UV mirroring. `frameName` reports the current frame. Sprites share the atlas texture without modifying each other's frame state. `dispose()` releases only the sprite geometry/material.

`new SpriteAnimator(sprite)` supports `define(name, clip)`, `play(name, restart = false)`, `stop()`, and `update(seconds)`. A clip contains frame names, optional `loop` (default true), and either `fps` or one duration per frame in seconds. `current` and `running` report state. `onComplete(name)` fires once for a non-looping clip; the last frame stays visible. A large delta is reduced modulo the duration for looping clips.

## PixelViewport

`new PixelViewport(renderer, width = 320, height = 180)` configures a logical-size drawing buffer at pixel ratio 1 and creates a bottom-left, Y-up orthographic camera. Use the camera with a renderer normally.

`resize(availableWidth, availableHeight)` sets CSS dimensions using the largest fitting integer scale. Containers smaller than the logical resolution use fractional downscaling and cannot preserve one-to-one physical pixels. It returns `{ width, height, scale }`; center the canvas with CSS. `screenToWorld(clientX, clientY, target?)` maps to the axis-aligned camera's Z=0 plane. For a rotated camera, use a raycaster. `snap(value)` rounds a display coordinate; retain fractional simulation positions separately.

## TileMap and GridCollision

`new TileMap(atlas, { columns, rows, tileSize = 16, tiles, solid? })` creates one geometry/material per layer. `tiles` is row-major from the top-left, containing frame names or `null`. World origin is bottom-left. All quads use the configured square tile size; atlas frames may have different source dimensions.

`getTile(column, row)` returns a frame or null, including outside the map. `setTile(column, row, frame)` and atomic `setTiles(changes)` rebuild the layer. `pointToTile(localX, localY)` converts local Y-up coordinates into serialized row indices. `isSolid(column, bottomRow, outside = true)` accepts bottom-up grid indices for collision. `toJSONDefinition()` returns an independent serializable definition. `dispose()` releases geometry/material, not the atlas.

`new GridCollision(tileSize, isSolid)` provides `overlaps(box)` and `move(box, dx, dy)`. A box is `{ x, y, width, height }` with a bottom-left local origin. Move returns a new box plus `hitX`, `hitY`, and `grounded`. Horizontal sweep precedes vertical sweep; large moves do not tunnel through solid cells. Starting inside a solid tile throws. Motion must be in the same local, axis-aligned coordinate system as the grid. This is not slope, one-way-platform, rotated-body, or rigid-body physics.

## Importers and platform

`importAseprite(texture, sheet)` returns `{ atlas, clips }`. `importTiledLayer(map, layerName, solid?)` returns a TileMap definition. Supported subsets and validation rules are documented in [Asset formats](formats.md).

`PaeanPlatform`, `PlatformUnavailableError`, consent, saves, score delivery, and optional services are documented in [Platform integration](platform.md). `PAEAN_VERSION` identifies the game SDK version; upstream `REVISION` remains the renderer revision.
