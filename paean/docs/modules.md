# Selective imports and Canvas 2D

Use the entry that matches your visual backend. The root and `/game` entries retain the combined 0.1 API; they are appropriate for existing applications that intentionally need that graph. New Canvas games should import `/2d`, `/vector`, or `/pixel` directly.

## Install only the runtime you use

Build a tarball by running `npm pack` in `packages/paean-js`. In another project:

```sh
# Canvas vector/pixel, core, formats, and platform need no renderer peer.
npm install /path/to/paean-ai-paean-js-0.2.0.tgz

# Add the tested renderer only for native three.js imports or compatibility entries.
npm install three@0.186.0
# Add its matching declarations when writing TypeScript with the three.js entries.
npm install --save-dev @types/three@0.186.0
```

Consult `paean/upstream.json` and package peer versions when using a later release. The SDK is not automatically published to npm. A Git installation of this repository's root installs upstream `three` rather than the SDK.

## Vector-only game

```js
import { CanvasGame } from '@paean-ai/paean-js/2d';
import { VectorPath, Rig2D } from '@paean-ai/paean-js/vector';

const rig = new Rig2D({
  bones: [{ name: 'root', x: 160, y: 90 }],
  slots: [{ name: 'body', bone: 'root' }],
});
rig.defineSkin('mint', { body: VectorPath.rectangle(24, 40, { fill: '#85ebc5' }) });
rig.defineSkin('gold', { body: VectorPath.rectangle(24, 40, { fill: '#e7b465' }) });
rig.setSkin('mint');
rig.play(rig.createClip('sway', 2, [
  { bone: 'root', property: 'rotation', times: [0, 1, 2], values: [-0.2, 0.2, -0.2] },
]));
const game = new CanvasGame({ width: 320, height: 180, update: dt => rig.update(dt) });
game.scene.add(rig);
document.body.append(game.canvas);
game.resize(640, 360);
game.start();
// In an outfit button handler: rig.setSkin('gold').
// On teardown: rig.dispose(); game.dispose();
```

This loads no pixel classes, platform code, or three.js. See the complete [Canvas wardrobe example](../../packages/paean-js/examples/canvas-vector.js).

## Pixel-only game

```js
import { PixelGame, SpriteSheet, Sprite2D, FrameAnimator } from '@paean-ai/paean-js/pixel';

const image = new Image();
image.src = '/assets/hero.png';
await image.decode();
const atlas = SpriteSheet.grid(image, image.naturalWidth, image.naturalHeight, 16);
const hero = new Sprite2D(atlas, '0');
hero.x = 160; hero.y = 90;
const animation = new FrameAnimator(hero).define('idle', { frames: ['0'], fps: 8 }).play('idle');
const game = new PixelGame({ width: 320, height: 180, update(dt, game) {
  hero.x += game.input.axis('left', 'right') * 80 * dt;
  animation.update(dt);
} });
game.scene.add(hero);
document.body.append(game.canvas);
game.resize(960, 540); // Fixed 320×180 framebuffer, 3× CSS enlargement.
game.start();
// On teardown: game.dispose(); release the image if your application owns a closable source.
```

Pixel-only code imports no vector rig, Path2D, platform adapter, or three.js. The [Canvas crystal run example](../../packages/paean-js/examples/canvas-pixel.js) includes tiles, collision, jumping, touch controls, collection and restart without external assets.

Asset importers remain opt-in:

```js
import { parseAseprite, importTiledLayer } from '@paean-ai/paean-js/formats';
import { SpriteSheet, TileLayer } from '@paean-ai/paean-js/pixel';
const { atlas, clips } = parseAseprite(asepriteJSON);
const sheet = new SpriteSheet(decodedImage, atlas);
const tileSheet = SpriteSheet.grid(tileImage, tileImage.naturalWidth, tileImage.naturalHeight, tiledJSON.tilewidth, tiledJSON.tileheight);
const tiles = new TileLayer(tileSheet, importTiledLayer(tiledJSON, 'ground', ['0']));
```

Aseprite and Tiled here illustrate separate authoring flows: Tiled numeric frame IDs require a matching grid sheet, while named Aseprite frames use their exported names. Existing atlas, skeleton, tilemap, and sprite-clip schemas work with both backends. Call `FrameAnimator.define(name, clips[name])` to use imported animation tags. Add `/platform` explicitly for hosted services.

## Pure three.js or mixed native scenes

```js
import * as THREE from '@paean-ai/paean-js/3d';
import { OrbitControls } from '@paean-ai/paean-js/addons/controls/OrbitControls.js';
import { FixedStepLoop } from '@paean-ai/paean-js/core';
// Only if the scene needs native-three 2D attachments:
import { VectorShape, Skeleton2D } from '@paean-ai/paean-js/3d/vector';
import { PixelAtlas, PixelSprite } from '@paean-ai/paean-js/3d/pixel';
```

`/3d` exports only the original upstream namespace, with strict constructor identity. Direct `three` imports remain equally valid. The native-three adapters compose with upstream Scene/Object3D; Canvas objects compose with Node2D. They are intentionally distinct scene graphs. To combine vector and pixel Canvas art, import both `/vector` and `/pixel` and attach their Node2D objects to the same scene or rig.

## Static browser delivery

No bundler is required for pure 2D. Copy `dist/bundles` from one build to your static application, retaining its shared chunks:

```js
import { CanvasGame } from './vendor/paean/bundles/2d.js';
import { VectorPath } from './vendor/paean/bundles/vector.js';
// A pixel-only app can instead import PixelGame from bundles/pixel.js.
```

The browser fetches only reachable chunks. Do not mix files from different SDK builds. The ordinary `dist/*.js` entries also work if their relative module tree is deployed. JavaScript source maps are for debugging and are not required at runtime. 3D and native-three adapter entries additionally require the canonical `three` import-map mappings described in [compatibility](compatibility.md).

## Migration from 0.1

| Existing import / object | Selective native-three import | Independent Canvas equivalent |
| --- | --- | --- |
| three.js exports from root | `/3d` | Use `/2d` only for Canvas scenes |
| FixedStepLoop, Input, Random, AssetStore | `/core` | Same renderer-independent classes |
| Game2D | `/3d/pixel` | PixelGame from `/pixel`; CanvasGame from `/2d` |
| VectorShape | `/3d/vector` | VectorPath from `/vector`; CSS fill/stroke styles |
| Skeleton2D | `/3d/vector` | Rig2D from `/vector`; same bone/slot definitions |
| PixelAtlas / PixelSprite / SpriteAnimator | `/3d/pixel` | SpriteSheet / Sprite2D / FrameAnimator from `/pixel` |
| TileMap / GridCollision | `/3d/pixel` | TileLayer / GridCollision from `/pixel` |
| PaeanPlatform | `/platform` | Same adapter |
| importAseprite(texture, json) | `/3d/pixel` | `/formats` parseAseprite(json), then new SpriteSheet(image, atlas) |
| importTiledLayer | `/formats` or `/3d/pixel` | Same pure data conversion |

Changing native-three imports to the selective native entries preserves object identity and behavior. Moving to Canvas requires adapting transforms (`position.x` → `x`, `rotation.z` → `rotation`), styles (numeric `color` → CSS `fill`), sizing (`viewport.resize` → `resize`), and image ownership. It is not an automatic backend substitution. Root/game code continues to work; the intentional packaging change is that three.js and its types must now be installed explicitly when needed.
