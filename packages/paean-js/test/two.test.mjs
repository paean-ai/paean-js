import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Vector3 } from 'three';
import { Skeleton2D, VectorShape } from '../dist/game.js';

function rig() {
  return new Skeleton2D({ bones: [{ name: 'arm', parent: 'body', x: 10 }, { name: 'body', y: 20 }], slots: [{ name: 'hand', bone: 'arm', x: 5 }] });
}
test('vector primitives create valid three.js geometry, including bounds', () => {
  const rectangle = VectorShape.rectangle(10, 20); rectangle.geometry.computeBoundingBox();
  assert.deepEqual(rectangle.geometry.boundingBox.getSize(new Vector3()).toArray(), [10, 20, 0]);
  assert.ok(VectorShape.circle(10).geometry.getAttribute('position').count > 10);
  assert.throws(() => VectorShape.polygon([[0, 0]])); assert.throws(() => VectorShape.rectangle(-1, 2));
  assert.throws(() => VectorShape.circle(1, { opacity: 2 })); rectangle.dispose();
});
test('bones accept arbitrary declaration order and propagate transforms to attachments', () => {
  const skeleton = rig(), attachment = new Group();
  skeleton.defineSkin('base', { hand: attachment }).setSkin('base');
  skeleton.updateMatrixWorld(true); assert.deepEqual(attachment.getWorldPosition(new Vector3()).toArray(), [15, 20, 0]);
  skeleton.bones.get('body').rotation.z = Math.PI / 2;
  skeleton.updateMatrixWorld(true); const world = attachment.getWorldPosition(new Vector3());
  assert.ok(Math.abs(world.x) < 1e-10); assert.ok(Math.abs(world.y - 35) < 1e-10);
});
test('skin swaps preserve animation pose, empty omitted slots, and never dispose caller resources', () => {
  const skeleton = rig(), red = VectorShape.circle(2), blue = VectorShape.circle(3);
  let disposed = 0; red.geometry.addEventListener('dispose', () => disposed++);
  skeleton.defineSkin('red', { hand: red }).defineSkin('blue', { hand: blue }).defineSkin('empty', {});
  skeleton.setSkin('red'); skeleton.bones.get('arm').rotation.z = 0.3; skeleton.setSkin('blue');
  assert.equal(red.parent, null); assert.equal(blue.parent, skeleton.slots.get('hand'));
  assert.equal(skeleton.bones.get('arm').rotation.z, 0.3);
  assert.throws(() => skeleton.setSkin('unknown')); assert.equal(blue.parent, skeleton.slots.get('hand'));
  skeleton.setSkin('empty'); assert.equal(blue.parent, null);
  skeleton.dispose(); assert.equal(disposed, 0); red.dispose(); blue.dispose();
});
test('skeleton validation catches cycles, missing parents, invalid names and duplicate attachments', () => {
  for (const bones of [[{ name: 'a', parent: 'b' }, { name: 'b', parent: 'a' }], [{ name: 'a', parent: 'missing' }], [{ name: 'bad.name' }], [{ name: 'a' }, { name: 'a' }]]) {
    assert.throws(() => new Skeleton2D({ bones }));
  }
  const skeleton = rig(); skeleton.addSlot({ name: 'other', bone: 'body' }); const attachment = new Group();
  assert.throws(() => skeleton.defineSkin('bad', { hand: attachment, other: attachment }));
  assert.throws(() => skeleton.defineSkin('bad', { hand: skeleton }));
  assert.throws(() => skeleton.defineSkin('bad', { missing: attachment }));
});
test('native animation clips animate named bones, crossfade, and clean up bindings', () => {
  const skeleton = rig();
  const a = skeleton.createClip('wave', 1, [{ bone: 'arm', property: 'rotation', times: [0, 1], values: [0, 1] }]);
  skeleton.play(a); skeleton.update(0.5); assert.ok(Math.abs(skeleton.bones.get('arm').rotation.z - 0.5) < 1e-6);
  const b = skeleton.createClip('rest', 1, [{ bone: 'arm', property: 'rotation', times: [0, 1], values: [0, 0] }]);
  skeleton.play(b, 0.2); skeleton.update(0.3); assert.ok(Math.abs(skeleton.bones.get('arm').rotation.z) < 1e-6);
  skeleton.dispose(); assert.equal(skeleton.mixer.stats.actions.inUse, 0);
  assert.throws(() => skeleton.play(a));
});
test('malformed animation tracks fail before entering the mixer', () => {
  const skeleton = rig();
  for (const track of [
    { bone: 'missing', property: 'x', times: [0], values: [1] },
    { bone: 'arm', property: 'x', times: [0, 0], values: [1, 2] },
    { bone: 'arm', property: 'x', times: [2], values: [1] },
    { bone: 'arm', property: 'x', times: [0], values: [] },
  ]) assert.throws(() => skeleton.createClip('bad', 1, [track]));
});
