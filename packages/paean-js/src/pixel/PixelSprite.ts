import { DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { PixelAtlas } from './PixelAtlas.js';
import { positive } from '../core/validate.js';

export interface PixelSpriteOptions { pixelsPerUnit?: number; flipX?: boolean; flipY?: boolean }
export type { SpriteClip } from '../formats/types.js';
import { FrameAnimator } from '../animation/FrameAnimator.js';

/** Pixel-aligned quad with per-instance UVs; sprites safely share one atlas texture. */
export class PixelSprite extends Mesh<PlaneGeometry, MeshBasicMaterial> {
  readonly pixelsPerUnit: number;
  frameName: string;
  flipX: boolean;
  flipY: boolean;

  constructor(readonly atlas: PixelAtlas, frame: string, options: PixelSpriteOptions = {}) {
    atlas.frame(frame);
    const pixelsPerUnit = positive(options.pixelsPerUnit ?? 1, 'pixelsPerUnit');
    super(new PlaneGeometry(1, 1), new MeshBasicMaterial({
      map: atlas.texture, transparent: true, alphaTest: 0.01, depthWrite: false, side: DoubleSide,
    }));
    this.pixelsPerUnit = pixelsPerUnit; this.frameName = frame;
    this.flipX = options.flipX ?? false; this.flipY = options.flipY ?? false; this.setFrame(frame);
  }

  /** Updates the quad, leaving Object3D.scale available for gameplay transforms. */
  setFrame(name: string): this {
    const frame = this.atlas.frame(name), width = frame.width / this.pixelsPerUnit, height = frame.height / this.pixelsPerUnit;
    const positions = this.geometry.getAttribute('position');
    const values = [-width / 2, height / 2, 0, width / 2, height / 2, 0, -width / 2, -height / 2, 0, width / 2, -height / 2, 0];
    for (let i = 0; i < 4; i++) positions.setXYZ(i, values[i * 3]!, values[i * 3 + 1]!, 0);
    positions.needsUpdate = true;
    const uv = this.geometry.getAttribute('uv'), coords = this.atlas.uv(name, this.flipX, this.flipY);
    for (let i = 0; i < 4; i++) uv.setXY(i, coords[i * 2]!, coords[i * 2 + 1]!);
    uv.needsUpdate = true; this.geometry.computeBoundingBox(); this.geometry.computeBoundingSphere();
    this.frameName = name; return this;
  }

  setFlip(x: boolean, y = this.flipY): this { this.flipX = x; this.flipY = y; return this.setFrame(this.frameName); }
  dispose(): void { this.geometry.dispose(); this.material.dispose(); }
}

/** Native-three compatibility adapter for the renderer-independent frame animator. */
export class SpriteAnimator extends FrameAnimator {
  constructor(override readonly sprite: PixelSprite) { super(sprite); }
}
