import { DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { PixelAtlas } from './PixelAtlas.js';
import { delta, positive } from '../core/validate.js';

export interface PixelSpriteOptions { pixelsPerUnit?: number; flipX?: boolean; flipY?: boolean }
export type SpriteClip = { frames: readonly string[]; loop?: boolean } &
  ({ fps: number; durations?: never } | { durations: readonly number[]; fps?: never });
interface NormalizedClip { frames: readonly string[]; ends: number[]; duration: number; loop: boolean }

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

/** Frame animation uses elapsed seconds, independent of the browser's refresh rate. */
export class SpriteAnimator {
  private readonly clips = new Map<string, NormalizedClip>();
  private clip: NormalizedClip | undefined;
  private elapsed = 0;
  private playing = false;
  current: string | undefined;
  onComplete: ((name: string) => void) | undefined;
  constructor(readonly sprite: PixelSprite) {}

  define(name: string, clip: SpriteClip): this {
    if (!clip.frames.length) throw new Error('An animation must have at least one frame.');
    for (const frame of clip.frames) this.sprite.atlas.frame(frame);
    if (clip.durations && clip.durations.length !== clip.frames.length) throw new Error('Each frame requires one duration in seconds.');
    const durations = clip.durations ?? clip.frames.map(() => 1 / positive(clip.fps!, 'fps'));
    let duration = 0;
    const ends = durations.map(value => { duration += positive(value, 'frame duration'); return duration; });
    positive(duration, 'clip duration');
    this.clips.set(name, { frames: [...clip.frames], ends, duration, loop: clip.loop ?? true }); return this;
  }
  play(name: string, restart = false): this {
    const clip = this.clips.get(name); if (!clip) throw new Error(`Unknown sprite animation: ${name}`);
    if (this.current === name && this.playing && !restart) return this;
    this.clip = clip; this.current = name; this.elapsed = 0; this.playing = true;
    this.sprite.setFrame(clip.frames[0]!); return this;
  }
  stop(): void { this.playing = false; }
  get running(): boolean { return this.playing; }
  update(seconds: number): void {
    delta(seconds);
    if (!this.clip || !this.playing) return;
    const duration = this.clip.duration;
    this.elapsed += seconds;
    if (this.clip.loop) this.elapsed %= duration;
    else if (this.elapsed >= duration) {
      this.sprite.setFrame(this.clip.frames.at(-1)!); this.playing = false;
      this.onComplete?.(this.current!); return;
    }
    const index = this.clip.ends.findIndex(end => this.elapsed < end);
    this.sprite.setFrame(this.clip.frames[index < 0 ? this.clip.frames.length - 1 : index]!);
  }
}
