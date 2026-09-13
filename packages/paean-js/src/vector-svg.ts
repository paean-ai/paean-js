import { Group } from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { VectorShape } from './two/VectorShape.js';

/**
 * Parse trusted SVG fills through upstream SVGLoader. Requires a browser DOMParser.
 * Strokes, filters, gradients, text, and external resources are not implemented by this helper.
 */
export function parseSVG(source: string): Group {
  const data = new SVGLoader().parse(source);
  const group = new Group();
  for (const path of data.paths) {
    const style = path.userData?.style as { fill?: string; visibility?: string; display?: string; fillOpacity?: number; opacity?: number } | undefined;
    if (style?.fill === 'none' || style?.visibility === 'hidden' || style?.display === 'none') continue;
    const shape = new VectorShape(SVGLoader.createShapes(path), {
      color: path.color, opacity: (style?.fillOpacity ?? 1) * (style?.opacity ?? 1),
    });
    shape.renderOrder = group.children.length;
    group.add(shape);
  }
  // SVG is Y-down; the game world is Y-up.
  group.scale.y = -1;
  return group;
}
