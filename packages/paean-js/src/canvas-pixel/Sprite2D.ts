import { Node2D } from '../canvas/Node2D.js';
import { positive } from '../core/validate.js';
import type { SpriteSheet } from './SpriteSheet.js';

export interface Sprite2DOptions { pixelsPerUnit?: number; flipX?: boolean; flipY?: boolean }

/** Centered Canvas sprite. Atlas images are Y-down; local game coordinates remain Y-up. */
export class Sprite2D extends Node2D {
  readonly pixelsPerUnit: number;
  frameName: string;
  flipX: boolean;
  flipY: boolean;
  constructor(readonly atlas: SpriteSheet, frame: string, options: Sprite2DOptions = {}) {
    super(); atlas.frame(frame); this.frameName = frame;
    this.pixelsPerUnit = positive(options.pixelsPerUnit ?? 1, 'pixelsPerUnit');
    this.flipX = options.flipX ?? false; this.flipY = options.flipY ?? false;
  }
  setFrame(name: string): this { this.atlas.frame(name); this.frameName = name; return this; }
  setFlip(x: boolean, y = this.flipY): this { this.flipX = x; this.flipY = y; return this; }
  protected override draw(context: CanvasRenderingContext2D): void {
    const frame = this.atlas.frame(this.frameName), width = frame.width / this.pixelsPerUnit, height = frame.height / this.pixelsPerUnit;
    context.save();
    try {
      context.imageSmoothingEnabled = false; context.scale(this.flipX ? -1 : 1, this.flipY ? 1 : -1);
      context.drawImage(this.atlas.image, frame.x, frame.y, frame.width, frame.height, -width / 2, -height / 2, width, height);
    } finally { context.restore(); }
  }
}
