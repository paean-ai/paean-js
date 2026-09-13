import { DoubleSide, Mesh, MeshBasicMaterial, Shape, ShapeGeometry } from 'three';
import type { ColorRepresentation } from 'three';
import { finite, integer, positive } from '../core/validate.js';

export interface VectorStyle { color?: ColorRepresentation; opacity?: number; curveSegments?: number }

/** Filled vector geometry in the XY plane. Paths and holes use native three.js Shape. */
export class VectorShape extends Mesh<ShapeGeometry, MeshBasicMaterial> {
  constructor(shape: Shape | Shape[], style: VectorStyle = {}) {
    const opacity = finite(style.opacity ?? 1, 'opacity');
    if (opacity < 0 || opacity > 1) throw new RangeError('opacity must be between 0 and 1.');
    super(new ShapeGeometry(shape, integer(style.curveSegments ?? 12, 'curveSegments', 1)), new MeshBasicMaterial({
      color: style.color ?? 0xffffff, opacity, transparent: true, side: DoubleSide, depthWrite: false,
    }));
  }

  static rectangle(width: number, height: number, style?: VectorStyle): VectorShape {
    positive(width, 'width'); positive(height, 'height');
    const shape = new Shape();
    shape.moveTo(-width / 2, -height / 2); shape.lineTo(width / 2, -height / 2);
    shape.lineTo(width / 2, height / 2); shape.lineTo(-width / 2, height / 2); shape.closePath();
    return new VectorShape(shape, style);
  }

  static circle(radius: number, style?: VectorStyle): VectorShape {
    positive(radius, 'radius');
    const shape = new Shape(); shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
    return new VectorShape(shape, style);
  }

  static polygon(points: readonly (readonly [number, number])[], style?: VectorStyle): VectorShape {
    if (points.length < 3) throw new RangeError('A polygon needs at least three points.');
    const shape = new Shape();
    points.forEach(([x, y], i) => {
      finite(x, 'x'); finite(y, 'y');
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    });
    shape.closePath(); return new VectorShape(shape, style);
  }

  /** Disposes this object's geometry and material. Does not detach it from its parent. */
  dispose(): void { this.geometry.dispose(); this.material.dispose(); }
}
