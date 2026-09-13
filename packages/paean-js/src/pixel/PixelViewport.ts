import { OrthographicCamera, Vector3 } from 'three';
import type { WebGLRenderer } from 'three';
import { integer, positive } from '../core/validate.js';

/** Fixed logical resolution, integer CSS enlargement, and a bottom-left, Y-up orthographic camera. */
export class PixelViewport {
  readonly camera: OrthographicCamera;
  constructor(readonly renderer: Pick<WebGLRenderer, 'domElement' | 'setPixelRatio' | 'setSize'>, readonly width = 320, readonly height = 180) {
    integer(width, 'width', 1); integer(height, 'height', 1);
    this.camera = new OrthographicCamera(0, width, height, 0, 0.1, 2000);
    this.camera.position.z = 1000;
    renderer.setPixelRatio(1); renderer.setSize(width, height, false);
    renderer.domElement.style.imageRendering = 'pixelated';
  }

  /** Returns CSS dimensions for centering. Small containers use fractional downscaling to avoid cropping. */
  resize(availableWidth: number, availableHeight: number): { width: number; height: number; scale: number } {
    positive(availableWidth, 'availableWidth'); positive(availableHeight, 'availableHeight');
    const fit = Math.min(availableWidth / this.width, availableHeight / this.height);
    const scale = fit >= 1 ? Math.floor(fit) : fit;
    const width = this.width * scale, height = this.height * scale;
    this.renderer.domElement.style.width = `${width}px`; this.renderer.domElement.style.height = `${height}px`;
    return { width, height, scale };
  }

  /** Convert client coordinates into world coordinates on the camera's Z=0 plane. */
  screenToWorld(clientX: number, clientY: number, target = new Vector3()): Vector3 {
    const rect = this.renderer.domElement.getBoundingClientRect();
    positive(rect.width, 'canvas width'); positive(rect.height, 'canvas height');
    this.camera.updateMatrixWorld();
    target.set((clientX - rect.left) / rect.width * 2 - 1, 1 - (clientY - rect.top) / rect.height * 2, 0).unproject(this.camera);
    // This helper's camera is axis-aligned. Use Raycaster for a rotated camera.
    target.z = 0; return target;
  }
  snap(value: number): number { return Math.round(value); }
}
