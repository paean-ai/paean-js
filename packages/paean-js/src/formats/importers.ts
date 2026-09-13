import type { AtlasFrame, PixelAtlasDefinition, SpriteClip, TileMapDefinition } from './types.js';
import { integer, positive } from '../core/validate.js';

export interface AsepriteFrame {
  filename?: string; frame: { x: number; y: number; w: number; h: number };
  duration: number; rotated?: boolean; trimmed?: boolean;
}
export interface AsepriteSheet {
  frames: Record<string, AsepriteFrame> | AsepriteFrame[];
  meta: { size: { w: number; h: number }; frameTags?: { name: string; from: number; to: number; direction?: string }[] };
}

/** Import Aseprite JSON hash/array exports with frame durations and tag directions. Disable trimming and rotation. */
export function parseAseprite(sheet: AsepriteSheet): { atlas: PixelAtlasDefinition; clips: Record<string, SpriteClip> } {
  const width = integer(sheet.meta.size.w, 'atlas.width', 1), height = integer(sheet.meta.size.h, 'atlas.height', 1);
  const entries: [string, AsepriteFrame][] = Array.isArray(sheet.frames)
    ? sheet.frames.map((frame, i) => [frame.filename ?? String(i), frame]) : Object.entries(sheet.frames);
  if (!entries.length) throw new Error('Aseprite sheet contains no frames.');
  const frames: Record<string, AtlasFrame> = Object.create(null);
  for (const [name, frame] of entries) {
    if (frames[name]) throw new Error(`Duplicate Aseprite frame: ${name}`);
    if (frame.rotated || frame.trimmed) throw new Error('Rotated or trimmed Aseprite frames are unsupported. Export without trimming/rotation.');
    positive(frame.duration, 'Aseprite frame duration');
    integer(frame.frame.x, 'frame.x'); integer(frame.frame.y, 'frame.y');
    integer(frame.frame.w, 'frame.width', 1); integer(frame.frame.h, 'frame.height', 1);
    if (frame.frame.x + frame.frame.w > width || frame.frame.y + frame.frame.h > height) throw new Error(`Frame outside atlas: ${name}`);
    frames[name] = { x: frame.frame.x, y: frame.frame.y, width: frame.frame.w, height: frame.frame.h };
  }
  const clips: Record<string, SpriteClip> = Object.create(null);
  const tags = sheet.meta.frameTags?.length ? sheet.meta.frameTags : [{ name: 'default', from: 0, to: entries.length - 1, direction: 'forward' }];
  for (const tag of tags) {
    integer(tag.from, 'tag.from'); integer(tag.to, 'tag.to');
    if (tag.from > tag.to || tag.to >= entries.length || clips[tag.name]) throw new Error(`Invalid or duplicate Aseprite tag: ${tag.name}`);
    let indices = Array.from({ length: tag.to - tag.from + 1 }, (_, i) => tag.from + i);
    const direction = tag.direction ?? 'forward';
    if (!['forward', 'reverse', 'pingpong', 'pingpong_reverse'].includes(direction)) throw new Error(`Unsupported tag direction: ${direction}`);
    if (direction === 'reverse' || direction === 'pingpong_reverse') indices.reverse();
    if (direction.startsWith('pingpong')) indices = [...indices, ...indices.slice(1, -1).reverse()];
    clips[tag.name] = { frames: indices.map(i => entries[i]![0]), durations: indices.map(i => entries[i]![1].duration / 1000), loop: true };
  }
  return { atlas: { width, height, frames }, clips };
}

export interface TiledLayer {
  name: string; type: string; width?: number; height?: number; data?: number[];
  x?: number; y?: number; offsetx?: number; offsety?: number; opacity?: number; visible?: boolean;
  tintcolor?: string; parallaxx?: number; parallaxy?: number;
}
export interface TiledMap {
  orientation: string; infinite?: boolean; width: number; height: number; tilewidth: number; tileheight: number;
  tilesets: { firstgid: number; tilecount?: number; source?: string }[];
  layers: TiledLayer[];
}

/**
 * Convert one finite orthogonal Tiled JSON tile layer using one supplied grid atlas.
 * Rejects unsupported encodings, transforms, and multiple tilesets instead of silently changing the map.
 */
export function importTiledLayer(map: TiledMap, name: string, solid: readonly string[] = []): TileMapDefinition {
  if (map.orientation !== 'orthogonal' || map.infinite || map.tilesets.length !== 1) throw new Error('Expected a finite orthogonal map with exactly one tileset.');
  integer(map.width, 'map.width', 1); integer(map.height, 'map.height', 1);
  integer(map.tilewidth, 'tilewidth', 1); integer(map.tileheight, 'tileheight', 1);
  if (map.tilewidth !== map.tileheight) throw new Error('This tile layer helper requires square tiles.');
  const layer = map.layers.find(candidate => candidate.name === name);
  if (!layer || layer.type !== 'tilelayer' || !Array.isArray(layer.data)) throw new Error('Expected an uncompressed numeric tile layer.');
  if (layer.width !== map.width || layer.height !== map.height || layer.data.length !== map.width * map.height) throw new Error('Layer dimensions must match the map.');
  if (layer.x || layer.y || layer.offsetx || layer.offsety || layer.tintcolor || layer.opacity !== undefined && layer.opacity !== 1 || layer.visible === false ||
      layer.parallaxx !== undefined && layer.parallaxx !== 1 || layer.parallaxy !== undefined && layer.parallaxy !== 1) {
    throw new Error('Layer offsets, tint, opacity, hidden layers, and parallax require explicit application handling.');
  }
  const tileset = map.tilesets[0]!; integer(tileset.firstgid, 'firstgid', 1);
  const tiles = layer.data.map(gid => {
    integer(gid, 'gid');
    if (gid === 0) return null;
    if (gid > 0xffffffff || (gid & 0xf0000000) !== 0) throw new Error('Flipped/rotated Tiled GIDs are unsupported by this converter.');
    const id = gid - tileset.firstgid;
    if (id < 0 || tileset.tilecount !== undefined && id >= tileset.tilecount) throw new Error('GID is outside the tileset.');
    return String(id);
  });
  return { columns: map.width, rows: map.height, tileSize: map.tilewidth, tiles, solid: [...solid] };
}
