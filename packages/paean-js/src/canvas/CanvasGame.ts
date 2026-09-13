import { AssetStore } from '../core/AssetStore.js';
import { FixedStepLoop } from '../core/FixedStepLoop.js';
import { Input } from '../core/Input.js';
import { finite, integer, positive } from '../core/validate.js';
import { Node2D } from './Node2D.js';
import type { Point2D } from './Node2D.js';

export interface CanvasGameOptions {
  canvas?: HTMLCanvasElement; width?: number; height?: number; frequency?: number;
  /** Logical framebuffer for pixel art; high-DPI framebuffer for vector art. */
  pixelArt?: boolean;
  background?: string | null;
  update?: (dt: number, game: CanvasGame) => void;
  beforeRender?: (alpha: number, game: CanvasGame) => void;
  onError?: (error: unknown) => void;
}

/** Shared Canvas 2D runtime. Visual modules are supplied by the application, never imported here. */
export class CanvasGame {
  readonly scene = new Node2D();
  readonly camera = { x: 0, y: 0, zoom: 1 };
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
  readonly input: Input;
  readonly assets = new AssetStore();
  readonly loop: FixedStepLoop;
  readonly width: number;
  readonly height: number;
  readonly pixelArt: boolean;
  background: string | null;
  private resume = false;
  private disposed = false;
  private readonly document: Document;

  constructor(options: CanvasGameOptions = {}) {
    this.width = integer(options.width ?? 320, 'width', 1);
    this.height = integer(options.height ?? 180, 'height', 1);
    this.pixelArt = options.pixelArt ?? false;
    this.background = options.background === undefined ? '#151b2a' : options.background;
    this.canvas = options.canvas ?? globalThis.document.createElement('canvas');
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable or the canvas already has another context.');
    this.context = context; this.document = this.canvas.ownerDocument;
    this.resize(this.width, this.height);
    this.input = new Input(this.canvas);
    this.loop = new FixedStepLoop({
      frequency: options.frequency,
      update: dt => { options.update?.(dt, this); this.input.endFrame(); },
      render: alpha => { options.beforeRender?.(alpha, this); this.render(); },
      onError: options.onError,
    });
    this.document.addEventListener('visibilitychange', this.visibility);
  }

  /** Fit inside CSS dimensions. Pixel mode enlarges by whole integers and only shrinks when necessary. */
  resize(availableWidth: number, availableHeight: number, pixelRatio = this.canvas.ownerDocument.defaultView?.devicePixelRatio ?? 1): this {
    this.assertAlive(); positive(availableWidth, 'availableWidth'); positive(availableHeight, 'availableHeight'); positive(pixelRatio, 'pixelRatio');
    const fit = Math.min(availableWidth / this.width, availableHeight / this.height);
    const scale = this.pixelArt && fit >= 1 ? Math.floor(fit) : fit;
    const cssWidth = this.width * scale, cssHeight = this.height * scale;
    this.canvas.style.width = `${cssWidth}px`; this.canvas.style.height = `${cssHeight}px`;
    this.canvas.style.imageRendering = this.pixelArt ? 'pixelated' : 'auto';
    this.canvas.width = this.pixelArt ? this.width : Math.max(1, Math.round(cssWidth * pixelRatio));
    this.canvas.height = this.pixelArt ? this.height : Math.max(1, Math.round(cssHeight * pixelRatio));
    this.context.imageSmoothingEnabled = !this.pixelArt;
    return this;
  }
  screenToWorld(clientX: number, clientY: number): Point2D {
    this.assertAlive(); const bounds = this.canvas.getBoundingClientRect(), zoom = positive(this.camera.zoom, 'camera.zoom');
    positive(bounds.width, 'canvas CSS width'); positive(bounds.height, 'canvas CSS height');
    return { x: (finite(clientX, 'clientX') - bounds.left) / bounds.width * this.width / zoom + this.camera.x,
      y: (1 - (finite(clientY, 'clientY') - bounds.top) / bounds.height) * this.height / zoom + this.camera.y };
  }
  render(): void {
    this.assertAlive(); const ctx = this.context, zoom = positive(this.camera.zoom, 'camera.zoom');
    ctx.save();
    try {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (this.background !== null) { ctx.fillStyle = this.background; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); }
      ctx.imageSmoothingEnabled = !this.pixelArt;
      ctx.setTransform(this.canvas.width / this.width, 0, 0, -this.canvas.height / this.height, 0, this.canvas.height);
      ctx.scale(zoom, zoom); ctx.translate(-this.camera.x, -this.camera.y);
      this.scene.render(ctx);
    } finally { ctx.restore(); }
  }
  start(): this {
    this.assertAlive(); if (this.document.hidden) this.resume = true; else this.loop.start(); return this;
  }
  stop(): this { this.resume = false; this.loop.stop(); return this; }
  /** Release listeners, loop and registered assets. Scene nodes and source images remain caller-owned. */
  dispose(): void {
    if (this.disposed) return; this.disposed = true;
    this.document.removeEventListener('visibilitychange', this.visibility);
    this.loop.dispose(); this.input.dispose(); this.scene.clear(); this.assets.dispose();
  }
  private assertAlive(): void { if (this.disposed) throw new Error('The game has been disposed.'); }
  private readonly visibility = (): void => {
    if (this.document.hidden) { this.resume = this.loop.running || this.resume; this.loop.stop(); }
    else if (this.resume) { this.resume = false; this.loop.start(); }
  };
}
