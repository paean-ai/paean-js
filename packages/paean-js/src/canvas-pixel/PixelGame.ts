import { CanvasGame } from '../canvas/CanvasGame.js';
import type { CanvasGameOptions } from '../canvas/CanvasGame.js';

export type PixelGameOptions = Omit<CanvasGameOptions, 'pixelArt'>;
/** Canvas game with a fixed logical framebuffer, nearest sampling, and integer CSS enlargement. */
export class PixelGame extends CanvasGame {
  constructor(options: PixelGameOptions = {}) { super({ ...options, pixelArt: true }); }
}
