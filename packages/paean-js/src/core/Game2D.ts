import { Scene, WebGLRenderer } from 'three';
import type { ColorRepresentation } from 'three';
import { AssetStore } from './AssetStore.js';
import { FixedStepLoop } from './FixedStepLoop.js';
import { Input } from './Input.js';
import { PixelViewport } from '../pixel/PixelViewport.js';

export interface Game2DOptions {
  canvas?: HTMLCanvasElement; width?: number; height?: number; frequency?: number;
  clearColor?: ColorRepresentation;
  update?: (dt: number, game: Game2D) => void;
  beforeRender?: (alpha: number, game: Game2D) => void;
  onError?: (error: unknown) => void;
}

/** Browser convenience runtime. Use the individual modules with your existing three.js application. */
export class Game2D {
  readonly scene = new Scene();
  readonly renderer: WebGLRenderer;
  readonly viewport: PixelViewport;
  readonly input: Input;
  readonly assets = new AssetStore();
  readonly loop: FixedStepLoop;
  private resume = false;
  private disposed = false;
  private readonly document: Document;

  constructor(options: Game2DOptions = {}) {
    this.renderer = new WebGLRenderer({ canvas: options.canvas, antialias: false, alpha: false });
    this.renderer.setClearColor(options.clearColor ?? 0x151b2a);
    this.viewport = new PixelViewport(this.renderer, options.width, options.height);
    this.input = new Input(this.renderer.domElement);
    this.document = this.renderer.domElement.ownerDocument;
    this.loop = new FixedStepLoop({
      frequency: options.frequency,
      update: dt => { options.update?.(dt, this); this.input.endFrame(); },
      render: alpha => { options.beforeRender?.(alpha, this); this.renderer.render(this.scene, this.viewport.camera); },
      onError: options.onError,
    });
    this.document.addEventListener('visibilitychange', this.visibility);
  }
  get canvas(): HTMLCanvasElement { return this.renderer.domElement; }
  get camera(): PixelViewport['camera'] { return this.viewport.camera; }
  start(): this {
    if (this.disposed) throw new Error('The game has been disposed.');
    if (this.document.hidden) this.resume = true; else this.loop.start(); return this;
  }
  stop(): this { this.resume = false; this.loop.stop(); return this; }
  /** Scene objects remain caller-owned. Register disposable resources with assets or dispose them explicitly. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.document.removeEventListener('visibilitychange', this.visibility);
    this.loop.dispose(); this.input.dispose();
    try { this.assets.dispose(); } finally { this.renderer.dispose(); }
  }
  private readonly visibility = (): void => {
    if (this.document.hidden) { this.resume = this.loop.running || this.resume; this.loop.stop(); }
    else if (this.resume) { this.resume = false; this.loop.start(); }
  };
}
