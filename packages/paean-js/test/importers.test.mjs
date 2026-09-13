import test from 'node:test';
import assert from 'node:assert/strict';
import { Texture } from 'three';
import { importAseprite, importTiledLayer, PixelSprite, SpriteAnimator } from '../dist/game.js';

const sheet = () => ({ frames: [0, 1, 2].map(i => ({ filename: `frame${i}`, frame: { x: i * 16, y: 0, w: 16, h: 16 }, duration: (i + 1) * 100 })), meta: { size: { w: 48, h: 16 }, frameTags: [{ name: 'walk', from: 0, to: 2, direction: 'pingpong' }] } });
test('Aseprite preserves variable durations and ping-pong tag order', () => {
  const { atlas, clips } = importAseprite(new Texture(), sheet());
  assert.deepEqual(clips.walk.frames, ['frame0', 'frame1', 'frame2', 'frame1']);
  assert.deepEqual(clips.walk.durations, [0.1, 0.2, 0.3, 0.2]);
  const sprite = new PixelSprite(atlas, 'frame0'), animation = new SpriteAnimator(sprite).define('walk', clips.walk).play('walk');
  animation.update(0.11); assert.equal(sprite.frameName, 'frame1'); animation.update(0.15); assert.equal(sprite.frameName, 'frame1');
  animation.update(0.05); assert.equal(sprite.frameName, 'frame2');
});
test('Aseprite hash format, reverse tags, and unsupported metadata validation', () => {
  const data = sheet(); data.frames = Object.fromEntries(data.frames.map(frame => [frame.filename, frame]));
  data.meta.frameTags[0].direction = 'reverse';
  assert.deepEqual(importAseprite(new Texture(), data).clips.walk.frames, ['frame2', 'frame1', 'frame0']);
  data.frames.frame0.trimmed = true; assert.throws(() => importAseprite(new Texture(), data), /trimmed/);
});
const tiled = () => ({ orientation: 'orthogonal', width: 2, height: 1, tilewidth: 16, tileheight: 16, tilesets: [{ firstgid: 1, tilecount: 2 }], layers: [{ name: 'ground', type: 'tilelayer', width: 2, height: 1, data: [0, 2] }] });
test('Tiled converts zero GIDs to empty cells and offsets real GIDs by firstgid', () => {
  assert.deepEqual(importTiledLayer(tiled(), 'ground', ['1']), { columns: 2, rows: 1, tileSize: 16, tiles: [null, '1'], solid: ['1'] });
});
test('Tiled rejects unsupported shapes and transforms explicitly', () => {
  for (const mutate of [map => { map.infinite = true; }, map => { map.orientation = 'isometric'; }, map => { map.layers[0].data[1] = 0x80000001; }, map => { map.layers[0].offsetx = 5; }, map => { map.tilesets.push({ firstgid: 3 }); }, map => { map.layers[0].data = 'encoded'; }]) {
    const map = tiled(); mutate(map); assert.throws(() => importTiledLayer(map, 'ground'));
  }
});
