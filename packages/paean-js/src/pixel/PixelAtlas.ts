import { ClampToEdgeWrapping, NearestFilter, SRGBColorSpace, Texture } from 'three';
import { integer } from '../core/validate.js';

export interface AtlasFrame { x: number; y: number; width: number; height: number }
export interface PixelAtlasDefinition { width: number; height: number; frames: Readonly<Record<string, AtlasFrame>> }

/** Named, unrotated atlas frames. Rectangles use top-left image pixels, independent of world coordinates. */
export class PixelAtlas {
  readonly texture: Texture;
  readonly width: number;
  readonly height: number;
  readonly frames: Readonly<Record<string, Readonly<AtlasFrame>>>;

  constructor(texture: Texture, definition: PixelAtlasDefinition) {
    this.width = integer(definition.width, 'width', 1); this.height = integer(definition.height, 'height', 1);
    const frames: Record<string, Readonly<AtlasFrame>> = Object.create(null);
    for (const [name, frame] of Object.entries(definition.frames)) {
      integer(frame.x, 'frame.x'); integer(frame.y, 'frame.y');
      integer(frame.width, 'frame.width', 1); integer(frame.height, 'frame.height', 1);
      if (frame.x + frame.width > this.width || frame.y + frame.height > this.height) throw new RangeError(`Frame outside atlas: ${name}`);
      frames[name] = Object.freeze({ ...frame });
    }
    this.frames = Object.freeze(frames);
    // A private sampler prevents nearest filtering from changing the caller's 3D texture.
    this.texture = texture.clone();
    this.texture.magFilter = NearestFilter; this.texture.minFilter = NearestFilter;
    this.texture.wrapS = this.texture.wrapT = ClampToEdgeWrapping;
    this.texture.generateMipmaps = false; this.texture.colorSpace = SRGBColorSpace;
    this.texture.needsUpdate = true;
  }

  static grid(texture: Texture, width: number, height: number, tileWidth: number, tileHeight = tileWidth): PixelAtlas {
    integer(width, 'width', 1); integer(height, 'height', 1);
    integer(tileWidth, 'tileWidth', 1); integer(tileHeight, 'tileHeight', 1);
    if (width % tileWidth || height % tileHeight) throw new RangeError('Atlas dimensions must be multiples of tile dimensions.');
    const frames: Record<string, AtlasFrame> = {};
    let index = 0;
    for (let y = 0; y < height; y += tileHeight) for (let x = 0; x < width; x += tileWidth) {
      frames[String(index++)] = { x, y, width: tileWidth, height: tileHeight };
    }
    return new PixelAtlas(texture, { width, height, frames });
  }

  frame(name: string): Readonly<AtlasFrame> {
    const frame = this.frames[name]; if (!frame) throw new Error(`Unknown atlas frame: ${name}`); return frame;
  }

  /** PlaneGeometry vertex order: top-left, top-right, bottom-left, bottom-right. */
  uv(name: string, flipX = false, flipY = false): number[] {
    const frame = this.frame(name);
    let left = frame.x / this.width, right = (frame.x + frame.width) / this.width;
    let top = 1 - frame.y / this.height, bottom = 1 - (frame.y + frame.height) / this.height;
    if (flipX) [left, right] = [right, left];
    if (flipY) [top, bottom] = [bottom, top];
    return [left, top, right, top, left, bottom, right, bottom];
  }
  /** Dispose after all sprites and tilemaps using this atlas have been released. */
  dispose(): void { this.texture.dispose(); }
}
