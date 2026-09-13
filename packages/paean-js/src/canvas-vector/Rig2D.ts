import { Node2D } from '../canvas/Node2D.js';
import { delta, finite, positive } from '../core/validate.js';
import type { BoneTrack, Skeleton2DDefinition, Slot2DDefinition } from '../formats/types.js';

export interface RigClip { readonly name: string; readonly duration: number; readonly tracks: readonly BoneTrack[]; readonly loop: boolean }
const properties = ['x', 'y', 'rotation', 'scaleX', 'scaleY'] as const;
type Property = typeof properties[number];
type Pose = Record<Property, number>;
const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Canvas cutout rig. Shares asset definitions with Skeleton2D, but has no three.js dependency. */
export class Rig2D extends Node2D {
  readonly bones = new Map<string, Node2D>();
  readonly slots = new Map<string, Node2D>();
  private readonly rest = new Map<string, Pose>();
  private readonly skins = new Map<string, Readonly<Record<string, Node2D>>>();
  private readonly clips = new Set<RigClip>();
  private clip: RigClip | undefined;
  private elapsed = 0;
  private fade = 0;
  private from = new Map<string, Pose>();
  private active = false;
  private disposed = false;
  onComplete: ((name: string) => void) | undefined;
  get running(): boolean { return this.active; }
  get current(): string | undefined { return this.clip?.name; }

  constructor(definition: Skeleton2DDefinition) {
    super(); const names = new Set<string>();
    for (const def of definition.bones) {
      if (!identifier.test(def.name) || names.has(def.name)) throw new Error(`Invalid or duplicate bone: ${def.name}`);
      names.add(def.name);
      for (const key of properties) if (def[key] !== undefined) finite(def[key], key);
    }
    const pending = [...definition.bones];
    while (pending.length) {
      const index = pending.findIndex(def => !def.parent || this.bones.has(def.parent));
      if (index < 0) throw new Error('Rig contains a cycle or an unknown parent.');
      const def = pending.splice(index, 1)[0]!, bone = new Node2D(); bone.name = def.name;
      for (const key of properties) bone[key] = def[key] ?? (key.startsWith('scale') ? 1 : 0);
      (def.parent ? this.bones.get(def.parent)! : this).add(bone);
      this.bones.set(def.name, bone); this.rest.set(def.name, this.pose(bone));
    }
    for (const def of definition.slots ?? []) this.addSlot(def);
  }
  addSlot(definition: Slot2DDefinition): Node2D {
    this.assertAlive(); const bone = this.bones.get(definition.bone);
    if (!bone) throw new Error(`Unknown bone: ${definition.bone}`);
    if (!identifier.test(definition.name) || this.bones.has(definition.name) || this.slots.has(definition.name)) throw new Error(`Invalid or duplicate slot: ${definition.name}`);
    const slot = new Node2D(); slot.name = definition.name;
    slot.x = finite(definition.x ?? 0, 'x'); slot.y = finite(definition.y ?? 0, 'y');
    slot.order = finite(definition.order ?? this.slots.size, 'order');
    bone.add(slot); this.slots.set(definition.name, slot); return slot;
  }
  defineSkin(name: string, attachments: Readonly<Record<string, Node2D>>): this {
    this.assertAlive(); this.validateSkin(attachments); this.skins.set(name, { ...attachments }); return this;
  }
  /** Validate before changing any slot. Omitted slots become empty; the current bone pose is preserved. */
  setSkin(name: string): this {
    this.assertAlive(); const skin = this.skins.get(name);
    if (!skin) throw new Error(`Unknown skin: ${name}`);
    this.validateSkin(skin);
    for (const [name, slot] of this.slots) { slot.clear(); if (skin[name]) slot.add(skin[name]); }
    return this;
  }
  createClip(name: string, duration: number, tracks: readonly BoneTrack[], loop = true): RigClip {
    this.assertAlive(); positive(duration, 'duration'); const used = new Set<string>();
    const copy = tracks.map(track => {
      const key = `${track.bone}:${track.property}`;
      if (!this.bones.has(track.bone) || !properties.includes(track.property) || used.has(key)) throw new Error(`Invalid or duplicate track: ${key}`);
      used.add(key);
      if (!track.times.length || track.times.length !== track.values.length) throw new Error('Track times and values must have equal, nonzero lengths.');
      track.times.forEach((time, i) => {
        finite(time, 'time'); finite(track.values[i]!, 'value');
        if (time < 0 || time > duration || i > 0 && time <= track.times[i - 1]!) throw new Error('Track times must increase within the clip duration.');
      });
      return Object.freeze({ ...track, times: Object.freeze([...track.times]), values: Object.freeze([...track.values]) });
    });
    const clip = Object.freeze({ name, duration, tracks: Object.freeze(copy), loop }); this.clips.add(clip); return clip;
  }
  /** Fade from the current pose to the advancing new clip. Rotation interpolation uses authored radians. */
  play(clip: RigClip, fadeSeconds = 0): this {
    this.assertAlive(); delta(fadeSeconds);
    if (!this.clips.has(clip)) throw new Error('Create the clip on this rig before playing it.');
    this.from = new Map([...this.bones].map(([name, bone]) => [name, this.pose(bone)]));
    this.clip = clip; this.elapsed = 0; this.fade = fadeSeconds; this.active = true; this.update(0); return this;
  }
  stop(): this { this.active = false; return this; }
  update(seconds: number): void {
    this.assertAlive(); delta(seconds); if (!this.active || !this.clip) return;
    this.elapsed += seconds; const clip = this.clip;
    const time = clip.loop ? this.elapsed % clip.duration : Math.min(this.elapsed, clip.duration);
    const weight = this.fade > 0 ? Math.min(1, this.elapsed / this.fade) : 1;
    // Every clip targets the complete rest pose, preventing stale properties after a clip change.
    const target = new Map([...this.rest].map(([name, pose]) => [name, { ...pose }]));
    for (const track of clip.tracks) {
      let index = track.times.findIndex(value => value > time);
      if (index < 0) index = track.times.length;
      const left = Math.max(0, index - 1), right = Math.min(index, track.times.length - 1);
      const a = track.times[left]!, b = track.times[right]!;
      const t = a === b ? 0 : Math.max(0, (time - a) / (b - a));
      target.get(track.bone)![track.property] = track.values[left]! * (1 - t) + track.values[right]! * t;
    }
    for (const [name, bone] of this.bones) for (const key of properties) {
      bone[key] = this.from.get(name)![key] * (1 - weight) + target.get(name)![key] * weight;
    }
    if (!clip.loop && this.elapsed >= Math.max(clip.duration, this.fade)) { this.active = false; this.onComplete?.(clip.name); }
  }
  /** Detach caller-owned attachments and release animation/skin references. */
  dispose(): void {
    if (this.disposed) return; this.stop(); this.disposed = true;
    for (const slot of this.slots.values()) slot.clear();
    this.skins.clear(); this.clips.clear(); this.from.clear(); this.clip = undefined;
  }
  protected override renderChildren(context: CanvasRenderingContext2D): void {
    // Slot painter order is global within a rig, independent of the bone hierarchy.
    for (const slot of [...this.slots.values()].sort((a, b) => a.order - b.order)) {
      const ancestors: Node2D[] = [];
      for (let node = slot.parent; node && node !== this; node = node.parent) ancestors.unshift(node);
      if (ancestors.some(node => !node.visible || node.opacity <= 0)) continue;
      context.save();
      try {
        for (const node of ancestors) { context.transform(...node.localMatrix()); context.globalAlpha *= Math.min(1, node.opacity); }
        slot.render(context);
      } finally { context.restore(); }
    }
  }
  private pose(node: Node2D): Pose { return { x: node.x, y: node.y, rotation: node.rotation, scaleX: node.scaleX, scaleY: node.scaleY }; }
  private assertAlive(): void { if (this.disposed) throw new Error('The rig has been disposed.'); }
  private validateSkin(skin: Readonly<Record<string, Node2D>>): void {
    const attachments = Object.values(skin), used = new Set<Node2D>();
    for (const [name, attachment] of Object.entries(skin)) {
      if (!this.slots.has(name)) throw new Error(`Unknown slot: ${name}`);
      if (!(attachment instanceof Node2D) || used.has(attachment)) throw new Error('Skin attachments must be distinct Node2D instances.');
      used.add(attachment);
      if ([...this.bones.values(), ...this.slots.values()].includes(attachment)) throw new Error('Rig nodes cannot be attachments.');
      for (let node: Node2D | null = this; node; node = node.parent) if (node === attachment) throw new Error('A rig or its ancestor cannot be an attachment.');
      for (let node = attachment.parent; node; node = node.parent) if (attachments.includes(node)) throw new Error('Skin attachments cannot contain each other.');
    }
  }
}
