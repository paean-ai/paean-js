import { finite, positive } from '../core/validate.js';

export interface AABB { x: number; y: number; width: number; height: number }
export interface GridMove extends AABB { hitX: boolean; hitY: boolean; grounded: boolean }

/** Axis-separated swept AABB against a static, bottom-up grid. No rotation, slopes, or rigid-body dynamics. */
export class GridCollision {
  constructor(readonly tileSize: number, readonly isSolid: (column: number, row: number) => boolean) { positive(tileSize, 'tileSize'); }

  overlaps(box: AABB): boolean {
    this.validate(box);
    const s = this.tileSize;
    for (let x = Math.floor(box.x / s); x < Math.ceil((box.x + box.width) / s); x++) {
      for (let y = Math.floor(box.y / s); y < Math.ceil((box.y + box.height) / s); y++) if (this.isSolid(x, y)) return true;
    }
    return false;
  }

  /** The initial box must not overlap solid cells. Horizontal motion is resolved before vertical motion. */
  move(box: AABB, dx: number, dy: number): GridMove {
    this.validate(box); finite(dx, 'dx'); finite(dy, 'dy');
    if (this.overlaps(box)) throw new Error('The starting box overlaps a solid tile. Resolve spawn positions before moving.');
    const s = this.tileSize;
    let x = box.x + dx, y = box.y + dy;
    finite(x + box.width, 'destination x'); finite(y + box.height, 'destination y');
    const minRow = Math.floor(box.y / s), maxRow = Math.ceil((box.y + box.height) / s) - 1;
    if (dx > 0) {
      const first = Math.ceil((box.x + box.width) / s), last = Math.ceil((x + box.width) / s) - 1;
      outer: for (let col = first; col <= last; col++) for (let row = minRow; row <= maxRow; row++) if (this.isSolid(col, row)) {
        x = Math.min(x, col * s - box.width); break outer;
      }
    } else if (dx < 0) {
      const first = Math.floor(box.x / s) - 1, last = Math.floor(x / s);
      outer: for (let col = first; col >= last; col--) for (let row = minRow; row <= maxRow; row++) if (this.isSolid(col, row)) {
        x = Math.max(x, (col + 1) * s); break outer;
      }
    }
    const minCol = Math.floor(x / s), maxCol = Math.ceil((x + box.width) / s) - 1;
    if (dy > 0) {
      const first = Math.ceil((box.y + box.height) / s), last = Math.ceil((y + box.height) / s) - 1;
      outer: for (let row = first; row <= last; row++) for (let col = minCol; col <= maxCol; col++) if (this.isSolid(col, row)) {
        y = Math.min(y, row * s - box.height); break outer;
      }
    } else if (dy < 0) {
      const first = Math.floor(box.y / s) - 1, last = Math.floor(y / s);
      outer: for (let row = first; row >= last; row--) for (let col = minCol; col <= maxCol; col++) if (this.isSolid(col, row)) {
        y = Math.max(y, (row + 1) * s); break outer;
      }
    }
    return { ...box, x, y, hitX: x !== box.x + dx, hitY: y !== box.y + dy, grounded: dy < 0 && y !== box.y + dy };
  }
  private validate(box: AABB): void {
    finite(box.x, 'x'); finite(box.y, 'y'); positive(box.width, 'width'); positive(box.height, 'height');
    finite(box.x + box.width, 'right'); finite(box.y + box.height, 'top');
  }
}
