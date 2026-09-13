import { BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshBasicMaterial } from 'three';
import { PixelAtlas } from './PixelAtlas.js';
import { finite, integer, positive } from '../core/validate.js';

export type { TileMapDefinition } from '../formats/types.js';
import type { TileMapDefinition } from '../formats/types.js';

/** A single draw-call, editable tile layer. Local origin is bottom-left; data row zero is the top. */
export class TileMap extends Mesh<BufferGeometry, MeshBasicMaterial> {
  readonly columns: number;
  readonly rows: number;
  readonly tileSize: number;
  private readonly tiles: (string | null)[];
  private readonly solid: Set<string>;

  constructor(readonly atlas: PixelAtlas, definition: TileMapDefinition) {
    const columns = integer(definition.columns, 'columns', 1), rows = integer(definition.rows, 'rows', 1);
    const tileSize = positive(definition.tileSize ?? 16, 'tileSize');
    if (definition.tiles.length !== columns * rows) throw new Error('Tile data length must equal columns × rows.');
    for (const frame of definition.tiles) if (frame !== null) atlas.frame(frame);
    for (const frame of definition.solid ?? []) atlas.frame(frame);
    super(new BufferGeometry(), new MeshBasicMaterial({ map: atlas.texture, transparent: true, alphaTest: 0.01, depthWrite: false, side: DoubleSide }));
    this.columns = columns; this.rows = rows; this.tileSize = tileSize;
    this.tiles = [...definition.tiles]; this.solid = new Set(definition.solid ?? []); this.rebuild();
  }

  getTile(column: number, row: number): string | null {
    if (!Number.isInteger(column) || !Number.isInteger(row) || column < 0 || row < 0 || column >= this.columns || row >= this.rows) return null;
    return this.tiles[row * this.columns + column]!;
  }

  /** Apply a batch atomically and rebuild once. Prefer separate layers/chunks for large worlds. */
  setTiles(changes: readonly { column: number; row: number; frame: string | null }[]): this {
    for (const { column, row, frame } of changes) {
      integer(column, 'column'); integer(row, 'row');
      if (column >= this.columns || row >= this.rows) throw new RangeError('Tile coordinates are outside the map.');
      if (frame !== null) this.atlas.frame(frame);
    }
    for (const { column, row, frame } of changes) this.tiles[row * this.columns + column] = frame;
    this.rebuild(); return this;
  }
  setTile(column: number, row: number, frame: string | null): this { return this.setTiles([{ column, row, frame }]); }
  /** Accepts local coordinates before the TileMap's Object3D transform. */
  pointToTile(x: number, y: number): { column: number; row: number } {
    finite(x, 'x'); finite(y, 'y');
    return { column: Math.floor(x / this.tileSize), row: this.rows - 1 - Math.floor(y / this.tileSize) };
  }
  /** GridCollision uses a bottom-up grid; this method handles the row conversion. */
  isSolid(column: number, bottomRow: number, outside = true): boolean {
    if (column < 0 || bottomRow < 0 || column >= this.columns || bottomRow >= this.rows) return outside;
    const frame = this.getTile(column, this.rows - 1 - bottomRow);
    return frame !== null && this.solid.has(frame);
  }
  toJSONDefinition(): TileMapDefinition {
    return { columns: this.columns, rows: this.rows, tileSize: this.tileSize, tiles: [...this.tiles], solid: [...this.solid] };
  }
  dispose(): void { this.geometry.dispose(); this.material.dispose(); }

  private rebuild(): void {
    const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
    for (let row = 0; row < this.rows; row++) for (let column = 0; column < this.columns; column++) {
      const frame = this.getTile(column, row); if (frame === null) continue;
      const x = column * this.tileSize, y = (this.rows - row - 1) * this.tileSize, s = this.tileSize, offset = positions.length / 3;
      positions.push(x, y + s, 0, x + s, y + s, 0, x, y, 0, x + s, y, 0);
      uvs.push(...this.atlas.uv(frame)); indices.push(offset, offset + 2, offset + 1, offset + 2, offset + 3, offset + 1);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices);
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    this.geometry.dispose(); this.geometry = geometry;
  }
}
