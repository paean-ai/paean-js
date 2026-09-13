# @paean-ai/paean-js

Paean / 8x game SDK with native three.js APIs, vector and skeletal 2D, interchangeable outfits, and standardized pixel-game modules. MIT licensed.

This package is built from the three.js-derived [Paean JS repository](https://github.com/paean-ai/paean-js). The root repository package remains upstream `three`; this is the separately packaged Paean game layer.

## Use

```js
import { Game2D, VectorShape, Skeleton2D, PixelAtlas } from '@paean-ai/paean-js';
import { Mesh } from '@paean-ai/paean-js'; // Original three.js Mesh.
import { OrbitControls } from '@paean-ai/paean-js/addons/controls/OrbitControls.js';
```

Use the exact `three` peer version declared in package.json. ESM/CommonJS core/game entries, TypeScript declarations, addon/source aliases, and upstream WebGPU/TSL entries are included. Paean 2D materials are currently validated on WebGL 2. Existing three.js imports continue working.

See the [quick start](https://github.com/paean-ai/paean-js#readme), [API reference](https://github.com/paean-ai/paean-js/blob/main/paean/docs/api.md), [examples](https://github.com/paean-ai/paean-js/tree/main/packages/paean-js/examples), and [compatibility contract](https://github.com/paean-ai/paean-js/blob/main/paean/docs/compatibility.md).

Use seconds and radians. World Y points up; atlas pixels and map rows start at the top-left. Dispose geometry/material, shared atlas, and source texture according to ownership. Platform services require the canonical PaeanSDK helper; local play requires no host.

The initial 0.x API is evolving. Publication to npm is a separate maintainer action; build a tarball with `npm pack` from the repository package when using a source checkout. See LICENSE and NOTICE for attribution and redistribution terms.
