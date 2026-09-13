import { delta, positive } from '../core/validate.js';
import type { SpriteClip } from '../formats/types.js';

export interface FrameTarget { atlas: { frame(name: string): unknown }; setFrame(name: string): unknown }
interface NormalizedClip { frames: readonly string[]; ends: number[]; duration: number; loop: boolean }

/** Frame animation uses elapsed seconds, independent of the browser's refresh rate. */
export class FrameAnimator {
  private readonly clips = new Map<string, NormalizedClip>();
  private clip: NormalizedClip | undefined;
  private elapsed = 0;
  private playing = false;
  current: string | undefined;
  onComplete: ((name: string) => void) | undefined;
  constructor(readonly sprite: FrameTarget) {}

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
