import { delta, integer, positive } from './validate.js';

export interface LoopOptions {
  /** Simulation frequency in Hz. All callbacks receive seconds. */
  frequency?: number;
  /** Limit catch-up work after a stalled frame. Excess whole steps are discarded. */
  maxSteps?: number;
  maxFrameTime?: number;
  update: (dt: number) => void;
  render?: (alpha: number) => void;
  requestFrame?: (callback: FrameRequestCallback) => number;
  cancelFrame?: (handle: number) => void;
  onError?: (error: unknown) => void;
}

/** A deterministic fixed-step simulation with bounded catch-up and explicit ownership. */
export class FixedStepLoop {
  readonly step: number;
  readonly maxSteps: number;
  readonly maxFrameTime: number;
  private accumulator = 0;
  private previous: number | undefined;
  private handle: number | undefined;
  private active = false;
  private disposed = false;

  constructor(private readonly options: LoopOptions) {
    this.step = 1 / positive(options.frequency ?? 60, 'frequency');
    this.maxSteps = integer(options.maxSteps ?? 5, 'maxSteps', 1);
    this.maxFrameTime = positive(options.maxFrameTime ?? 0.25, 'maxFrameTime');
  }

  get running(): boolean { return this.active; }

  /** Advance manually for tests, replays, or an external renderer's animation loop. */
  advance(seconds: number): number {
    if (this.disposed) throw new Error('The loop has been disposed.');
    this.accumulator += Math.min(delta(seconds), this.maxFrameTime);
    let steps = 0;
    while (this.accumulator + Number.EPSILON >= this.step && steps < this.maxSteps) {
      this.accumulator = Math.max(0, this.accumulator - this.step);
      this.options.update(this.step);
      steps++;
    }
    if (this.accumulator >= this.step) this.accumulator %= this.step;
    this.options.render?.(this.accumulator / this.step);
    return steps;
  }

  start(): this {
    if (this.disposed) throw new Error('The loop has been disposed.');
    if (this.active) return this;
    this.previous = undefined;
    this.active = true;
    try { this.schedule(); } catch (error) { this.active = false; throw error; }
    return this;
  }

  stop(): this {
    this.active = false;
    if (this.handle !== undefined) {
      (this.options.cancelFrame ?? globalThis.cancelAnimationFrame)?.(this.handle);
    }
    this.handle = undefined;
    this.previous = undefined;
    this.accumulator = 0;
    return this;
  }

  dispose(): void { this.stop(); this.disposed = true; }

  private schedule(): void {
    const request = this.options.requestFrame ?? globalThis.requestAnimationFrame;
    if (!request) throw new Error('requestAnimationFrame is unavailable; use advance() outside a browser.');
    this.handle = request(this.tick);
  }

  private readonly tick = (timestamp: number): void => {
    this.handle = undefined;
    if (!this.active) return;
    const seconds = this.previous === undefined ? 0 : Math.max(0, (timestamp - this.previous) / 1000);
    this.previous = timestamp;
    try {
      this.advance(seconds);
      if (this.active) this.schedule();
    } catch (error) {
      this.stop();
      if (this.options.onError) this.options.onError(error);
      else throw error;
    }
  };
}
