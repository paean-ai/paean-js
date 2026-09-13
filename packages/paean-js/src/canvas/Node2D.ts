import { finite } from '../core/validate.js';

export interface Point2D { x: number; y: number }
/** Canvas affine matrix [a, b, c, d, e, f]. */
export type Matrix2D = readonly [number, number, number, number, number, number];

function multiply(a: Matrix2D, b: Matrix2D): Matrix2D {
  return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
}

/** Lightweight Canvas 2D transform hierarchy. No three.js objects or browser globals at import time. */
export class Node2D {
  name = '';
  x = 0; y = 0; rotation = 0; scaleX = 1; scaleY = 1;
  opacity = 1; visible = true; order = 0;
  private owner: Node2D | null = null;
  private readonly nodes: Node2D[] = [];
  get parent(): Node2D | null { return this.owner; }
  get children(): readonly Node2D[] { return this.nodes; }

  add(...children: Node2D[]): this {
    // Validate the whole operation before reparenting any child.
    for (const child of children) {
      if (!(child instanceof Node2D)) throw new TypeError('Expected a Node2D attachment.');
      for (let node: Node2D | null = this; node; node = node.parent) {
        if (node === child) throw new Error('A Node2D hierarchy cannot contain a cycle.');
      }
    }
    for (const child of children) {
      child.owner?.remove(child); child.owner = this; this.nodes.push(child);
    }
    return this;
  }
  remove(child: Node2D): this {
    const index = this.nodes.indexOf(child);
    if (index >= 0) { this.nodes.splice(index, 1); child.owner = null; }
    return this;
  }
  clear(): this { for (const child of this.nodes) child.owner = null; this.nodes.length = 0; return this; }

  localMatrix(): Matrix2D {
    const c = Math.cos(this.rotation), s = Math.sin(this.rotation);
    return [c * this.scaleX, s * this.scaleX, -s * this.scaleY, c * this.scaleY, this.x, this.y];
  }
  worldMatrix(): Matrix2D { return this.parent ? multiply(this.parent.worldMatrix(), this.localMatrix()) : this.localMatrix(); }
  localToWorld(point: Point2D): Point2D {
    const m = this.worldMatrix(); finite(point.x, 'x'); finite(point.y, 'y');
    return { x: m[0] * point.x + m[2] * point.y + m[4], y: m[1] * point.x + m[3] * point.y + m[5] };
  }
  worldToLocal(point: Point2D): Point2D {
    const m = this.worldMatrix(), determinant = m[0] * m[3] - m[1] * m[2];
    if (!Number.isFinite(determinant) || determinant === 0) throw new Error('Cannot invert a singular transform.');
    const x = finite(point.x, 'x') - m[4], y = finite(point.y, 'y') - m[5];
    return { x: (m[3] * x - m[2] * y) / determinant, y: (m[0] * y - m[1] * x) / determinant };
  }

  /** Called by CanvasGame. Subclasses implement draw() in local, Y-up coordinates. */
  render(context: CanvasRenderingContext2D): void {
    if (!this.visible || this.opacity <= 0) return;
    context.save();
    try {
      context.transform(...this.localMatrix());
      context.globalAlpha *= Math.min(1, this.opacity);
      this.draw(context); this.renderChildren(context);
    } finally { context.restore(); }
  }
  protected draw(_context: CanvasRenderingContext2D): void {}
  protected renderChildren(context: CanvasRenderingContext2D): void {
    for (const child of [...this.nodes].sort((a, b) => a.order - b.order)) child.render(context);
  }
}
