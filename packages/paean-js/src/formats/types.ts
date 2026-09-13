export interface AtlasFrame { x: number; y: number; width: number; height: number }
export interface PixelAtlasDefinition { width: number; height: number; frames: Readonly<Record<string, AtlasFrame>> }


export type SpriteClip = { frames: readonly string[]; loop?: boolean } &
  ({ fps: number; durations?: never } | { durations: readonly number[]; fps?: never });

export interface TileMapDefinition {
  columns: number; rows: number; tileSize?: number;
  /** Row-major, top-to-bottom. null is empty; frame names are strings. */
  tiles: readonly (string | null)[];
  solid?: readonly string[];
}


export interface Bone2DDefinition {
  name: string; parent?: string; x?: number; y?: number; rotation?: number; scaleX?: number; scaleY?: number;
}
export interface Slot2DDefinition { name: string; bone: string; x?: number; y?: number; order?: number }
export interface Skeleton2DDefinition { bones: readonly Bone2DDefinition[]; slots?: readonly Slot2DDefinition[] }
export interface BoneTrack {
  bone: string; property: 'x' | 'y' | 'rotation' | 'scaleX' | 'scaleY'; times: readonly number[]; values: readonly number[];
}

