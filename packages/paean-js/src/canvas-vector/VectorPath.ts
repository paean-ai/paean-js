import { Node2D } from '../canvas/Node2D.js';
import { finite, positive } from '../core/validate.js';

export interface PathStyle {
  fill?: string | CanvasGradient | CanvasPattern | null;
  stroke?: string | CanvasGradient | CanvasPattern | null;
  lineWidth?: number;
  fillRule?: CanvasFillRule;
}

/** Retained Canvas Path2D geometry. Colors use CSS syntax; coordinates are Y-up. */
export class VectorPath extends Node2D {
  readonly style: PathStyle;
  constructor(readonly path: Path2D, style: PathStyle = {}) {
    super(); positive(style.lineWidth ?? 1, 'lineWidth'); this.style = { fill: '#ffffff', ...style };
  }
  static rectangle(width: number, height: number, style: PathStyle = {}): VectorPath {
    positive(width, 'width'); positive(height, 'height');
    const path = new Path2D(); path.rect(-width / 2, -height / 2, width, height); return new VectorPath(path, style);
  }
  static circle(radius: number, style: PathStyle = {}): VectorPath {
    positive(radius, 'radius'); const path = new Path2D(); path.arc(0, 0, radius, 0, Math.PI * 2); return new VectorPath(path, style);
  }
  static polygon(points: readonly (readonly [number, number])[], style: PathStyle = {}): VectorPath {
    if (points.length < 3) throw new Error('A polygon needs at least three points.');
    for (const [x, y] of points) { finite(x, 'x'); finite(y, 'y'); }
    const path = new Path2D(); path.moveTo(...points[0]!);
    for (const point of points.slice(1)) path.lineTo(...point);
    path.closePath(); return new VectorPath(path, style);
  }
  /** SVG path data only, not an SVG document. SVG coordinates are Y-down; set scaleY = -1 when needed. */
  static fromSVGPath(data: string, style: PathStyle = {}): VectorPath { return new VectorPath(new Path2D(data), style); }
  protected override draw(context: CanvasRenderingContext2D): void {
    if (this.style.fill != null) { context.fillStyle = this.style.fill; context.fill(this.path, this.style.fillRule ?? 'nonzero'); }
    if (this.style.stroke != null) {
      context.strokeStyle = this.style.stroke; context.lineWidth = positive(this.style.lineWidth ?? 1, 'lineWidth'); context.stroke(this.path);
    }
  }
}
