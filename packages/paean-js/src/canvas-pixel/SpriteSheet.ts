import { integer } from '../core/validate.js';
import type { AtlasFrame, PixelAtlasDefinition } from '../formats/types.js';

/** Named source-image rectangles. The caller owns and decodes the image; no GPU texture is created. */
export class SpriteSheet {
  readonly width: number;
  readonly height: number;
  readonly frames: Readonly<Record<string, Readonly<AtlasFrame>>>;
  constructor(readonly image: CanvasImageSource, definition: PixelAtlasDefinition) {
    this.width = integer(definition.width, 'width', 1); this.height = integer(definition.height, 'height', 1);
    const source = image as unknown as { naturalWidth?: number; naturalHeight?: number; videoWidth?: number; videoHeight?: number; width?: number; height?: number };
    const width = source.naturalWidth ?? source.videoWidth ?? source.width;
    const height = source.naturalHeight ?? source.videoHeight ?? source.height;
    if (typeof width === 'number' && width !== this.width || typeof height === 'number' && height !== this.height) {
      throw new Error('Decode the source image and match the declared atlas dimensions before creating a sheet.');
    }
    const frames: Record<string, Readonly<AtlasFrame>> = Object.create(null);
    for (const [name, frame] of Object.entries(definition.frames)) {
      integer(frame.x, 'frame.x'); integer(frame.y, 'frame.y'); integer(frame.width, 'frame.width', 1); integer(frame.height, 'frame.height', 1);
      if (frame.x + frame.width > this.width || frame.y + frame.height > this.height) throw new RangeError(`Frame outside sheet: ${name}`);
      frames[name] = Object.freeze({ ...frame });
    }
    this.frames = Object.freeze(frames);
  }
  static grid(image: CanvasImageSource, width: number, height: number, tileWidth: number, tileHeight = tileWidth): SpriteSheet {
    integer(width, 'width', 1); integer(height, 'height', 1); integer(tileWidth, 'tileWidth', 1); integer(tileHeight, 'tileHeight', 1);
    if (width % tileWidth || height % tileHeight) throw new Error('Sheet dimensions must be multiples of tile dimensions.');
    const frames: Record<string, AtlasFrame> = {}; let index = 0;
    for (let y = 0; y < height; y += tileHeight) for (let x = 0; x < width; x += tileWidth) frames[String(index++)] = { x, y, width: tileWidth, height: tileHeight };
    return new SpriteSheet(image, { width, height, frames });
  }
  frame(name: string): Readonly<AtlasFrame> {
    const frame = this.frames[name]; if (!frame) throw new Error(`Unknown sheet frame: ${name}`); return frame;
  }
}
