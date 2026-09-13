# Paean API reference

Use the selective entry points below for new code. The root and `/game` retain the original native-three game API. Generated TypeScript declarations are the precise signature reference. Upstream classes retain their [three.js documentation](https://threejs.org/docs/).

## Entry selection

| Entry | Public runtime exports |
| --- | --- |
| `/core` | FixedStepLoop, Input, AssetStore, Random, PAEAN_VERSION |
| `/2d` | Node2D, CanvasGame |
| `/vector` | VectorPath, Rig2D |
| `/pixel` | SpriteSheet, Sprite2D, FrameAnimator, TileLayer, PixelGame, GridCollision |
| `/formats` | parseAseprite, importTiledLayer; shared asset types |
| `/platform` | PaeanPlatform, PlatformUnavailableError |
| `/3d` | Exact upstream three.js namespace |
| `/3d/vector` | VectorShape, Skeleton2D |
| `/3d/pixel` | Game2D, PixelAtlas, PixelSprite, SpriteAnimator, PixelViewport, TileMap, GridCollision, importAseprite, importTiledLayer |

The first six entries have no three.js runtime or type dependency. Native-three adapters require the optional pinned renderer peer. See [modular examples and migration](modules.md) for installation, browser delivery, and the distinction between Node2D and Object3D.

## Node2D (`/2d`)

`new Node2D()` creates a Canvas transform/group. Mutable properties are `name`, `x`, `y`, `rotation`, `scaleX`, `scaleY`, `visible`, `opacity`, and sibling painter `order`. Defaults are identity transform, visible, opacity 1, order 0. Supply finite transform values; radians and Y-up coordinates apply. Children with equal order retain insertion order. Opacity multiplies through the hierarchy.

- `add(...nodes)` reparents after validating the whole operation; cycles and non-Node2D attachments throw. `remove(node)` and `clear()` detach without disposing children. All return the parent for chaining.
- `parent` and `children` expose the hierarchy for reading. Change it only through add/remove/clear.
- `localMatrix()` / `worldMatrix()` return Canvas affine `[a, b, c, d, e, f]` tuples. `localToWorld({x,y})` / `worldToLocal({x,y})` return new points. Inverting a zero-scale transform throws.
- `render(context)` applies transform/opacity and restores Canvas state even if drawing throws. Subclasses implement protected `draw(context)` with Y-up local coordinates. The game calls rendering automatically.

These are Canvas objects, not three.js Object3D instances. Canvas nodes own no GPU resources and need no generic dispose method. Detach unused objects and release application resources explicitly.

## CanvasGame (`/2d`) and PixelGame (`/pixel`)

`new CanvasGame({ canvas?, width = 320, height = 180, frequency = 60, pixelArt = false, background = '#151b2a', update?, beforeRender?, onError? })`

Creates a Canvas 2D context, Node2D scene, `{ x: 0, y: 0, zoom: 1 }` bottom-left camera, scoped Input, AssetStore, and FixedStepLoop. `canvas`, `context`, `scene`, `camera`, `input`, `assets`, `loop`, logical `width`/`height`, and `pixelArt` are readable. `background` is a CSS color or null for transparency. Callbacks receive `(seconds, game)` and `(interpolationAlpha, game)` respectively. Construct with a browser canvas that has not already acquired a different context. Importing the module itself requires no DOM.

`PixelGame` accepts the same options except `pixelArt`, which is always true.

- `resize(cssWidth, cssHeight, pixelRatio = ownerWindow.devicePixelRatio)` fits the logical world into available positive CSS dimensions. Vector mode allocates a display-density framebuffer. Pixel mode keeps exactly the logical framebuffer, disables smoothing, enlarges by integer CSS factors, and shrinks fractionally only when necessary.
- `screenToWorld(clientX, clientY)` converts viewport pointer coordinates using the actual canvas bounds, camera translation and zoom. It rejects zero-sized CSS bounds. The canvas content box should have no CSS border/padding/transform; put decoration on a wrapper.
- `render()` draws one frame; camera zoom must be positive. Keep pixel camera positions and sprite display transforms on logical pixels for crisp scrolling. Simulation positions can remain fractional.
- `start()` / `stop()` control the loop. Visibility changes pause and resume without catch-up bursts; stopping while hidden cancels resume. `loop.advance(seconds)` supports manual simulation.
- `dispose()` is idempotent. It releases listeners, loop, and owned assets, and detaches scene children. It does not remove the DOM canvas or close caller-owned source images. Render/start/resize/conversion after disposal throw.

## VectorPath (`/vector`)

`new VectorPath(path: Path2D, style?)` retains a Canvas Path2D. Style contains `fill` (default white), `stroke` (default absent), positive `lineWidth` (default 1), and `fillRule` (`nonzero` or `evenodd`). Fill/stroke accept CSS strings, CanvasGradient, CanvasPattern, or null. Use the `style` object to change drawing styles.

Factories: `rectangle(width, height, style?)` and `circle(radius, style?)` are centered; `polygon([[x,y], ...], style?)` closes three or more points; `fromSVGPath(data, style?)` accepts only SVG path-data syntax, not a whole SVG document. Native Path2D supports holes, curves, and strokes. SVG source coordinates are usually Y-down; set the returned node's `scaleY = -1` to preserve that source orientation in a Y-up world. Path construction needs browser Path2D; import does not.

## Rig2D (`/vector`)

`new Rig2D(definition)` accepts the same `Skeleton2DDefinition` and skeleton schema as the native-three rig. `bones` and `slots` are maps of Node2D. Bone properties are scalar `x`, `y`, `rotation`, `scaleX`, `scaleY`. Read these maps and animate transforms; do not replace entries or reparent rig bones/slots. Attach art only through slots. The rig reserves its child hierarchy for bones and renders slots in global `order` within the rig.

- `addSlot({name, bone, x?, y?, order?})` validates identifiers and references and returns a slot Node2D.
- `defineSkin(name, attachments)` registers a complete record of distinct, caller-owned Node2D attachments. `setSkin(name)` validates before modifying any slot, detaches the previous outfit, and leaves omitted slots empty. Bone pose is retained. Ancestors, internal rig nodes, repeated nodes, and nested attachments within one skin are rejected.
- `createClip(name, durationSeconds, tracks, loop = true)` returns an immutable RigClip bound to this rig. Each track has `bone`, `property`, strictly increasing `times`, and matching numeric `values`. Times must lie within the positive duration. Duplicate bone/property tracks are rejected.
- `play(clip, fadeSeconds = 0)` starts at zero; a positive fade blends from the current pose into the advancing new clip. Untracked properties return toward the rest pose. Interpolation is linear in authored radians, so author wraparound explicitly. This is a pose transition, not three.js AnimationMixer action blending.
- `update(seconds)` advances the active clip; looped clips wrap, one-shot clips hold the final pose. `onComplete(name)` fires once after both a one-shot clip and its entrance fade finish. `stop()` freezes the pose. Read `running` and `current` for state.
- `dispose()` detaches attachments and clears clip/skin references. It does not dispose caller-owned art. Mutation/play/update after disposal throw.

This is cutout skeletal animation, without weighted mesh deformation, inverse kinematics, or proprietary rig importers. Canvas sprites can occupy slots by explicitly importing `/pixel` as well.

## SpriteSheet, Sprite2D, FrameAnimator (`/pixel`)

`new SpriteSheet(decodedImage, atlasDefinition)` validates source dimensions and named top-left frame rectangles. `SpriteSheet.grid(image, width, height, tileWidth, tileHeight = tileWidth)` names cells `'0'`, `'1'`, … in top-down row order. `frame(name)` returns immutable metadata; unknown names throw. The sheet does not load, clone, close, or mutate its image. Decode images before constructing a sheet. Atlas dimensions and source rectangles are integer pixels.

`new Sprite2D(sheet, frame, { pixelsPerUnit = 1, flipX = false, flipY = false }?)` creates a centered Node2D sprite with nearest sampling. `setFrame(name)` changes source dimensions without overwriting the node's transform. `setFlip(x, y = currentFlipY)` changes image orientation. `frameName`, flip flags, `atlas`, and `pixelsPerUnit` are public. The source's top-down pixels are rendered upright in the Y-up world.

`new FrameAnimator(sprite)` accepts any structural target with `atlas.frame(name)` and `setFrame(name)`. Its `define`, `play`, `stop`, `update`, `running`, `current`, and `onComplete` contract matches SpriteAnimator below. Both implementations share the same animation logic. Only targets/asset representations differ. Use the same SpriteClip schema and seconds-based frame durations.

## TileLayer (`/pixel`)

`new TileLayer(sheet, tileMapDefinition)` uses the same definition, row convention, editing and collision APIs as native TileMap below. It is a Node2D whose local origin is bottom-left; serialized and get/set row indices are top-down. `getTile`, `setTile`, `setTiles`, `pointToTile`, `isSolid`, and `toJSONDefinition` share the native helper's contracts. Batch edits validate before modifying any cell.

Canvas draws each occupied tile, unlike the native adapter's merged geometry. Use separate visible layers/chunks for large worlds; automatic culling and streaming are not implemented. Collision inputs are local coordinates before layer transforms. The layer does not own or dispose its sheet/image.

## parseAseprite (`/formats`)

`parseAseprite(json)` returns `{ atlas: PixelAtlasDefinition, clips: Record<string, SpriteClip> }` without creating a texture or requiring a DOM. Frame dimensions, bounds, tags and durations are validated; trimming/rotation is rejected. Pass the atlas metadata to SpriteSheet for Canvas, or use native `importAseprite(texture, json)` from `/3d/pixel`. `importTiledLayer` is the same renderer-independent converter described below. Read [asset formats](formats.md) for supported authoring options.

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
