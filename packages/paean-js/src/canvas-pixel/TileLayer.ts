import { Node2D } from '../canvas/Node2D.js';
import { finite, integer, positive } from '../core/validate.js';
import type { TileMapDefinition } from '../formats/types.js';
import type { SpriteSheet } from './SpriteSheet.js';

/** Editable Canvas tile layer. Data rows are top-down; local origin and collision rows are bottom-up. */
export class TileLayer extends Node2D {
  readonly columns: number;
  readonly rows: number;
  readonly tileSize: number;
  private readonly tiles: (string | null)[];
  private readonly solid: Set<string>;
  constructor(readonly atlas: SpriteSheet, definition: TileMapDefinition) {
    super(); this.columns = integer(definition.columns, 'columns', 1); this.rows = integer(definition.rows, 'rows', 1);
    this.tileSize = positive(definition.tileSize ?? 16, 'tileSize');
    if (definition.tiles.length !== this.columns * this.rows) throw new Error('Tile data length must equal columns × rows.');
    for (const frame of definition.tiles) if (frame !== null) atlas.frame(frame);
    for (const frame of definition.solid ?? []) atlas.frame(frame);
    this.tiles = [...definition.tiles]; this.solid = new Set(definition.solid ?? []);
  }
  getTile(column: number, row: number): string | null {
    if (!Number.isInteger(column) || !Number.isInteger(row) || column < 0 || row < 0 || column >= this.columns || row >= this.rows) return null;
    return this.tiles[row * this.columns + column]!;
  }
  setTile(column: number, row: number, frame: string | null): this { return this.setTiles([{ column, row, frame }]); }
  setTiles(changes: readonly { column: number; row: number; frame: string | null }[]): this {
    for (const { column, row, frame } of changes) {
      integer(column, 'column'); integer(row, 'row');
      if (column >= this.columns || row >= this.rows) throw new RangeError('Tile coordinates are outside the map.');
      if (frame !== null) this.atlas.frame(frame);
    }
    for (const { column, row, frame } of changes) this.tiles[row * this.columns + column] = frame;
    return this;
  }
  pointToTile(x: number, y: number): { column: number; row: number } {
    return { column: Math.floor(finite(x, 'x') / this.tileSize), row: this.rows - 1 - Math.floor(finite(y, 'y') / this.tileSize) };
  }
  isSolid(column: number, bottomRow: number, outside = true): boolean {
    if (column < 0 || bottomRow < 0 || column >= this.columns || bottomRow >= this.rows) return outside;
    const frame = this.getTile(column, this.rows - 1 - bottomRow); return frame !== null && this.solid.has(frame);
  }
  toJSONDefinition(): TileMapDefinition { return { columns: this.columns, rows: this.rows, tileSize: this.tileSize, tiles: [...this.tiles], solid: [...this.solid] }; }
  protected override draw(context: CanvasRenderingContext2D): void {
    const size = this.tileSize; context.save();
    try {
      context.imageSmoothingEnabled = false; context.scale(1, -1);
      for (let row = 0; row < this.rows; row++) for (let column = 0; column < this.columns; column++) {
        const name = this.getTile(column, row); if (name === null) continue; const frame = this.atlas.frame(name);
        context.drawImage(this.atlas.image, frame.x, frame.y, frame.width, frame.height, column * size, (row - this.rows) * size, size, size);
      }
    } finally { context.restore(); }
  }
}
