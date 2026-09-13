import test from 'node:test';
import assert from 'node:assert/strict';
import { Node2D } from '../dist/2d.js';
import { Rig2D } from '../dist/vector.js';
import { SpriteSheet, Sprite2D, TileLayer, FrameAnimator, GridCollision } from '../dist/pixel.js';
import { parseAseprite, importTiledLayer } from '../dist/formats.js';

test('nested transforms round-trip points and parenting rejects cycles atomically', () => {
  const root = new Node2D(), child = new Node2D(); root.x = 50; root.rotation = Math.PI / 2; root.scaleX = 2;
  child.x = 10; child.scaleY = -1; root.add(child);
  const world = child.localToWorld({ x: 2, y: 3 });
  assert.ok(Math.abs(world.x - 53) < 1e-10); assert.ok(Math.abs(world.y - 24) < 1e-10);
  const local = child.worldToLocal(world); assert.ok(Math.abs(local.x - 2) < 1e-10); assert.ok(Math.abs(local.y - 3) < 1e-10);
  const sibling = new Node2D(); assert.throws(() => child.add(sibling, root), /cycle/); assert.equal(sibling.parent, null);
  child.scaleX = 0; assert.throws(() => child.worldToLocal(world), /singular/);
  root.clear(); assert.equal(child.parent, null);
});

function rig() { return new Rig2D({ bones: [{ name: 'hand', parent: 'body', x: 12 }, { name: 'body', y: 10 }], slots: [{ name: 'outfit', bone: 'hand' }, { name: 'hat', bone: 'body' }] }); }
test('Canvas rig supports unordered hierarchies, immutable clips, fades, and complete outfit changes', () => {
  const actor = rig(), red = new Node2D(), blue = new Node2D(), hat = new Node2D();
  actor.defineSkin('red', { outfit: red, hat }).defineSkin('blue', { outfit: blue }).setSkin('red');
  const times = [0, 1], values = [0, Math.PI];
  const wave = actor.createClip('wave', 1, [{ bone: 'hand', property: 'rotation', times, values }]);
  values[1] = 999; actor.play(wave).update(0.5);
  assert.equal(actor.bones.get('hand').rotation, Math.PI / 2);
  actor.setSkin('blue'); assert.equal(actor.bones.get('hand').rotation, Math.PI / 2);
  assert.equal(red.parent, null); assert.equal(hat.parent, null); assert.equal(blue.parent, actor.slots.get('outfit'));
  const rest = actor.createClip('rest', 1, []); actor.play(rest, 0.5).update(0.25);
  assert.equal(actor.bones.get('hand').rotation, Math.PI / 4);
  actor.update(0.25); assert.equal(actor.bones.get('hand').rotation, 0);
  actor.dispose(); assert.equal(blue.parent, null); assert.throws(() => actor.play(wave), /disposed/);
});
test('Canvas rig rejects invalid tracks and cyclic skins before replacing visible attachments', () => {
  assert.throws(() => new Rig2D({ bones: [{ name: 'a', parent: 'b' }, { name: 'b', parent: 'a' }] }), /cycle/);
  const actor = rig(), original = new Node2D(), next = new Node2D();
  actor.defineSkin('original', { outfit: original }).setSkin('original');
  actor.defineSkin('next', { outfit: next }); next.add(actor);
  assert.throws(() => actor.setSkin('next'), /ancestor/); assert.equal(original.parent, actor.slots.get('outfit'));
  assert.throws(() => actor.createClip('invalid', 1, [{ bone: 'hand', property: 'rotation', times: [0.5, 0.5], values: [0, 1] }]), /increase/);
  assert.throws(() => actor.play(rig().createClip('foreign', 1, [])), /this rig/);
});
test('one-shot rig animation completes once at the authored final pose', () => {
  const actor = rig(); let completed = 0; actor.onComplete = () => completed++;
  actor.play(actor.createClip('reach', 1, [{ bone: 'hand', property: 'x', times: [0, 1], values: [12, 20] }], false));
  actor.update(10); actor.update(10); assert.equal(completed, 1); assert.equal(actor.bones.get('hand').x, 20); assert.equal(actor.running, false);
});

test('sprite sheets isolate immutable metadata and frame animation preserves source ownership', () => {
  const image = { width: 32, height: 16 }, sheet = SpriteSheet.grid(image, 32, 16, 16);
  assert.equal(sheet.image, image); assert.equal(Object.isFrozen(sheet.frame('0')), true);
  assert.throws(() => SpriteSheet.grid(image, 48, 16, 16), /dimensions/);
  const sprite = new Sprite2D(sheet, '0'); let completions = 0;
  const animator = new FrameAnimator(sprite).define('blink', { frames: ['0', '1'], durations: [0.1, 0.2], loop: false });
  animator.onComplete = () => completions++; animator.play('blink'); animator.update(0.15);
  assert.equal(sprite.frameName, '1'); animator.update(1); animator.update(1); assert.equal(completions, 1);
  assert.equal(sprite.setFlip(true).flipX, true); assert.throws(() => sprite.setFrame('missing'), /Unknown/);
});
test('Canvas tiles share the serialized format and bottom-up collision convention', () => {
  const sheet = SpriteSheet.grid({ width: 32, height: 16 }, 32, 16, 16);
  const definition = { columns: 2, rows: 2, tileSize: 16, tiles: [null, '1', '0', '0'], solid: ['0'] };
  const map = new TileLayer(sheet, definition); definition.tiles[0] = '0';
  assert.equal(map.getTile(0, 0), null); assert.equal(map.isSolid(0, 0), true);
  assert.deepEqual(map.pointToTile(17, 31), { column: 1, row: 0 });
  const collision = new GridCollision(16, (x, y) => map.isSolid(x, y, false));
  const result = collision.move({ x: 2, y: 20, width: 8, height: 8 }, 0, -100);
  assert.equal(result.y, 16); assert.equal(result.grounded, true);
  assert.throws(() => map.setTiles([{ column: 0, row: 0, frame: '1' }, { column: 3, row: 0, frame: '0' }]), /outside/);
  assert.equal(map.getTile(0, 0), null); map.setTile(0, 0, '1'); assert.equal(map.toJSONDefinition().tiles[0], '1');
});
test('Aseprite and Tiled conversions are usable without any renderer', () => {
  const data = parseAseprite({ frames: [{ filename: 'idle', frame: { x: 0, y: 0, w: 8, h: 8 }, duration: 120 }], meta: { size: { w: 8, h: 8 } } });
  assert.equal(new SpriteSheet({ width: 8, height: 8 }, data.atlas).frame('idle').width, 8);
  assert.deepEqual(data.clips.default.durations, [0.12]);
  const map = importTiledLayer({ orientation: 'orthogonal', width: 1, height: 1, tilewidth: 8, tileheight: 8, tilesets: [{ firstgid: 1 }], layers: [{ name: 'floor', type: 'tilelayer', width: 1, height: 1, data: [1] }] }, 'floor');
  assert.deepEqual(map.tiles, ['0']);
});
