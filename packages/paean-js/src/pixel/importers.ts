import type { Texture } from 'three';
import { PixelAtlas } from './PixelAtlas.js';
import { parseAseprite } from '../formats/importers.js';
import type { AsepriteSheet } from '../formats/importers.js';
export { importTiledLayer } from '../formats/importers.js';
export type { AsepriteFrame, AsepriteSheet, TiledLayer, TiledMap } from '../formats/importers.js';

/** Adapt renderer-independent Aseprite data to a native three.js texture atlas. */
export function importAseprite(texture: Texture, sheet: AsepriteSheet) {
  const data = parseAseprite(sheet);
  return { atlas: new PixelAtlas(texture, data.atlas), clips: data.clips };
}
