# Asset formats and pixel-game conventions

The native definitions are plain JSON-shaped data described by schemas in `packages/paean-js/schemas`. They are versioned with the SDK. Runtime constructors validate cross-field relationships such as frame bounds, map lengths, unique names, and parent references; JSON Schema alone cannot express all of those constraints.

## Coordinates and atlas definition

Atlas rectangles use top-left source-image pixels. The game world is Y-up, and sprites are centered. Native frames are unrotated and untrimmed. Keep transparent padding in the original frame if needed to maintain an attachment pivot. Texture source orientation must match ordinary three.js image textures.

```json
{
  "width": 32,
  "height": 16,
  "frames": {
    "idle": { "x": 0, "y": 0, "width": 16, "height": 16 },
    "walk": { "x": 16, "y": 0, "width": 16, "height": 16 }
  }
}
```

The texture is loaded separately with existing three.js loaders. Metadata contains no implicit URL fetch or network behavior. `PixelAtlas.grid` provides the standard regular-sheet convention: decimal string frame names, row-major from the top-left, no margins or spacing.

## Aseprite JSON

`importAseprite(texture, sheet)` accepts both JSON hash and array exports. It preserves each frame's duration (Aseprite milliseconds become engine seconds) and generates clips for `frameTags`. Forward, reverse, ping-pong, and reverse ping-pong directions are supported. Ping-pong playback does not duplicate its endpoint frames. Without tags, a `default` clip contains every exported frame.

```sh
aseprite --batch hero.aseprite --sheet hero.png --data hero.json --format json-array --list-tags
```

Disable trimming and rotation. Rotated/trimmed frame metadata is rejected so the engine cannot silently shift pivots or reinterpret UVs. Slice pivots, layer reconstruction, tilemap cels, palettes, and arbitrary Aseprite document features are not imported. The engine accepts exported metadata and images, not the binary `.aseprite` document.

```js
const { atlas, clips } = importAseprite(texture, metadata);
const first = Object.values(clips)[0].frames[0];
const sprite = new PixelSprite(atlas, first);
const animator = new SpriteAnimator(sprite);
for (const [name, clip] of Object.entries(clips)) animator.define(name, clip);
animator.play(Object.keys(clips)[0]);
```

Reference: [Aseprite CLI and export options](https://www.aseprite.org/docs/cli/).

## Native tile layers and Tiled JSON

A native layer contains `columns`, `rows`, `tileSize`, a row-major top-to-bottom `tiles` array, and optional solid frame names. Empty cells are `null`; numeric zero is not used as an empty frame. The local origin is bottom-left.

```json
{
  "columns": 3, "rows": 2, "tileSize": 16,
  "tiles": [null, "0", null, "1", "1", "1"],
  "solid": ["1"]
}
```

`importTiledLayer(map, name, solid?)` converts one finite orthogonal, square-tile layer with an uncompressed numeric GID array and exactly one tileset. The application supplies the corresponding `PixelAtlas`; the converter maps GIDs to decimal frame names after subtracting `firstgid`. A zero GID becomes null.

Infinite chunks, base64/compressed data, multiple tilesets, object/group/image layers, flipped/rotated GIDs, rectangular tiles, offsets, tint, opacity, hidden layers, and parallax need explicit application handling. Unsupported data is rejected. External tileset files and tile images are not fetched by the converter. Validate atlas bounds by constructing `TileMap` after conversion.

Reference: [Tiled JSON map format](https://doc.mapeditor.org/en/stable/reference/json-map-format/).

## Skeleton definition

`skeleton.schema.json` describes hierarchical bones and attachment slots. Bone names are stable animation identifiers, rotations are radians, and positive Y points upward. Attachments are native Object3D instances constructed separately and registered as named skins. This keeps assets, geometry, and animation independent and allows vectors, pixel sprites, and ordinary 3D objects to share a rig.

Spine, DragonBones, and Live2D files are not accepted by this schema. Their binary/runtime formats, weighted deformation, inverse kinematics, constraints, licensing, and editor features are not implied by `Skeleton2D`. Native three.js weighted skeletons remain available for appropriate 3D/mesh workflows.
