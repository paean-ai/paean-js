import { AnimationClip, AnimationMixer, Bone, Group, NumberKeyframeTrack } from 'three';
import type { AnimationAction, Object3D } from 'three';
import { delta, finite, positive } from '../core/validate.js';

export interface Bone2DDefinition {
  name: string; parent?: string; x?: number; y?: number; rotation?: number; scaleX?: number; scaleY?: number;
}
export interface Slot2DDefinition { name: string; bone: string; x?: number; y?: number; order?: number }
export interface Skeleton2DDefinition { bones: readonly Bone2DDefinition[]; slots?: readonly Slot2DDefinition[] }
export interface BoneTrack {
  bone: string; property: 'x' | 'y' | 'rotation' | 'scaleX' | 'scaleY'; times: readonly number[]; values: readonly number[];
}

const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;
const properties = { x: 'position[x]', y: 'position[y]', rotation: 'rotation[z]', scaleX: 'scale[x]', scaleY: 'scale[y]' };

/**
 * Hierarchical 2D cutout animation using native Bone, AnimationClip, and AnimationMixer.
 * Attachments can be vectors, sprites, or arbitrary Object3D instances. Radians; Y-up.
 */
export class Skeleton2D extends Group {
  readonly bones = new Map<string, Bone>();
  readonly slots = new Map<string, Group>();
  readonly mixer: AnimationMixer;
  private readonly skins = new Map<string, Readonly<Record<string, Object3D>>>();
  private action: AnimationAction | undefined;
  private disposed = false;

  constructor(definition: Skeleton2DDefinition) {
    super();
    const names = new Set<string>();
    for (const def of definition.bones) {
      if (!identifier.test(def.name) || names.has(def.name)) throw new Error(`Invalid or duplicate bone name: ${def.name}`);
      names.add(def.name);
      for (const key of ['x', 'y', 'rotation', 'scaleX', 'scaleY'] as const) if (def[key] !== undefined) finite(def[key], key);
    }
    const pending = [...definition.bones];
    while (pending.length) {
      const index = pending.findIndex(def => !def.parent || this.bones.has(def.parent));
      if (index < 0) throw new Error('Skeleton contains a cycle or an unknown parent.');
      const def = pending.splice(index, 1)[0]!;
      const bone = new Bone(); bone.name = def.name;
      bone.position.set(def.x ?? 0, def.y ?? 0, 0); bone.rotation.z = def.rotation ?? 0;
      bone.scale.set(def.scaleX ?? 1, def.scaleY ?? 1, 1);
      (def.parent ? this.bones.get(def.parent)! : this).add(bone);
      this.bones.set(def.name, bone);
    }
    for (const def of definition.slots ?? []) this.addSlot(def);
    this.mixer = new AnimationMixer(this);
  }

  addSlot(definition: Slot2DDefinition): Group {
    if (this.disposed) throw new Error('The skeleton has been disposed.');
    const bone = this.bones.get(definition.bone);
    if (!bone) throw new Error(`Unknown bone: ${definition.bone}`);
    if (!identifier.test(definition.name) || this.slots.has(definition.name) || this.bones.has(definition.name)) {
      throw new Error(`Invalid or duplicate slot name: ${definition.name}`);
    }
    const slot = new Group(); slot.name = definition.name;
    slot.position.set(finite(definition.x ?? 0, 'x'), finite(definition.y ?? 0, 'y'), 0);
    slot.renderOrder = finite(definition.order ?? this.slots.size, 'order');
    bone.add(slot); this.slots.set(definition.name, slot); return slot;
  }

  /** Register caller-owned attachments. One attachment may not occupy two slots. */
  defineSkin(name: string, attachments: Readonly<Record<string, Object3D>>): this {
    const used = new Set<Object3D>();
    for (const [slot, attachment] of Object.entries(attachments)) {
      if (!this.slots.has(slot)) throw new Error(`Unknown slot: ${slot}`);
      if (!attachment.isObject3D || used.has(attachment)) throw new Error('Skin attachments must be distinct Object3D instances.');
      if (attachment === this || this.bones.has(attachment.name) && this.bones.get(attachment.name) === attachment || [...this.slots.values()].includes(attachment as Group)) {
        throw new Error('Skeleton nodes cannot be used as attachments.');
      }
      for (let parent = this.parent; parent; parent = parent.parent) if (attachment === parent) throw new Error('An ancestor cannot be used as an attachment.');
      used.add(attachment);
    }
    this.skins.set(name, { ...attachments }); return this;
  }

  /** Replace the complete outfit atomically. Omitted slots become empty; bone pose is retained. */
  setSkin(name: string): this {
    if (this.disposed) throw new Error('The skeleton has been disposed.');
    const skin = this.skins.get(name);
    if (!skin) throw new Error(`Unknown skin: ${name}`);
    for (const [slotName, slot] of this.slots) {
      slot.clear(); const attachment = skin[slotName];
      if (attachment) slot.add(attachment);
    }
    return this;
  }

  createClip(name: string, duration: number, tracks: readonly BoneTrack[]): AnimationClip {
    positive(duration, 'duration');
    return new AnimationClip(name, duration, tracks.map(track => {
      if (!this.bones.has(track.bone)) throw new Error(`Unknown bone: ${track.bone}`);
      if (!(track.property in properties)) throw new Error(`Unknown track property: ${track.property}`);
      if (!track.times.length || track.times.length !== track.values.length) throw new Error('Track times and values must have equal, nonzero lengths.');
      track.times.forEach((time, i) => {
        finite(time, 'time'); finite(track.values[i]!, 'value');
        if (time < 0 || time > duration || i > 0 && time <= track.times[i - 1]!) throw new Error('Track times must increase strictly within the clip duration.');
      });
      return new NumberKeyframeTrack(`${track.bone}.${properties[track.property]}`, [...track.times], [...track.values]);
    }));
  }

  play(clip: AnimationClip, fadeSeconds = 0): AnimationAction {
    if (this.disposed) throw new Error('The skeleton has been disposed.');
    delta(fadeSeconds);
    const next = this.mixer.clipAction(clip);
    if (next === this.action) return next;
    next.reset().play();
    if (this.action) {
      if (fadeSeconds > 0) next.crossFadeFrom(this.action, fadeSeconds, false);
      else this.action.stop();
    }
    this.action = next; return next;
  }

  update(seconds: number): void { if (!this.disposed) this.mixer.update(delta(seconds)); }
  /** Releases animation bindings. Attachments remain caller-owned and are never disposed here. */
  dispose(): void {
    this.mixer.stopAllAction(); this.mixer.uncacheRoot(this); this.skins.clear();
    for (const slot of this.slots.values()) slot.clear();
    this.action = undefined; this.disposed = true;
  }
}
