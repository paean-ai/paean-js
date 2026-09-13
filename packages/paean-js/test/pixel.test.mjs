import test from 'node:test';
import assert from 'node:assert/strict';
import { Texture, NearestFilter } from 'three';
import { PixelAtlas, PixelSprite, SpriteAnimator, TileMap, GridCollision, PixelViewport } from '../dist/game.js';

const atlas = () => PixelAtlas.grid(new Texture(), 32, 16, 16);
test('atlas validates image rectangles and does not mutate the source sampler', () => {
  const texture = new Texture(), original = texture.magFilter, grid = PixelAtlas.grid(texture, 32, 16, 16);
  assert.equal(grid.texture.magFilter, NearestFilter); assert.equal(texture.magFilter, original); assert.notEqual(grid.texture, texture);
  assert.deepEqual(grid.frame('1'), { x: 16, y: 0, width: 16, height: 16 });
  assert.deepEqual(grid.uv('0'), [0, 1, 0.5, 1, 0, 0, 0.5, 0]);
  assert.throws(() => PixelAtlas.grid(texture, 31, 16, 16));
  assert.throws(() => new PixelAtlas(texture, { width: 16, height: 16, frames: { bad: { x: 15, y: 0, width: 2, height: 1 } } }));
});
test('sprite UVs and flips are independent even when an atlas is shared', () => {
  const shared = atlas(), a = new PixelSprite(shared, '0'), b = new PixelSprite(shared, '0');
  a.setFrame('1').setFlip(true); assert.equal(b.frameName, '0');
  assert.equal(a.material.map, b.material.map);
  assert.notDeepEqual([...a.geometry.getAttribute('uv').array], [...b.geometry.getAttribute('uv').array]);
  a.scale.set(2, 2, 1); a.setFrame('0'); assert.equal(a.scale.x, 2);
  let disposed = false; shared.texture.addEventListener('dispose', () => { disposed = true; });
  a.dispose(); assert.equal(disposed, false); shared.dispose(); assert.equal(disposed, true);
});
test('frame animations loop by elapsed time and finish non-looping clips exactly once', () => {
  const sprite = new PixelSprite(atlas(), '0'), animation = new SpriteAnimator(sprite); let completed = 0;
  animation.define('walk', { frames: ['0', '1'], fps: 10 }).play('walk');
  animation.update(0.11); assert.equal(sprite.frameName, '1'); animation.update(200); assert.equal(sprite.frameName, '1');
  animation.define('once', { frames: ['0', '1'], fps: 10, loop: false }).play('once');
  animation.onComplete = () => completed++;
  animation.update(0.25); animation.update(1); assert.equal(completed, 1); assert.equal(sprite.frameName, '1'); assert.equal(animation.running, false);
  assert.throws(() => animation.define('bad', { frames: [], fps: 10 })); assert.throws(() => animation.update(-1));
});
test('tilemap batches quads, maps top-down data to Y-up world, and changes tiles atomically', () => {
  const map = new TileMap(atlas(), { columns: 2, rows: 2, tiles: ['0', null, '1', '1'], solid: ['1'] });
  assert.equal(map.geometry.getAttribute('position').count, 12); assert.equal(map.geometry.index.count, 18);
  assert.deepEqual(map.pointToTile(1, 1), { column: 0, row: 1 }); assert.equal(map.isSolid(0, 0), true);
  assert.equal(map.isSolid(0, 1), false); assert.equal(map.isSolid(-1, 0), true);
  assert.throws(() => map.setTiles([{ column: 0, row: 0, frame: null }, { column: 1, row: 0, frame: 'missing' }]));
  assert.equal(map.getTile(0, 0), '0'); map.setTile(0, 0, null); assert.equal(map.geometry.index.count, 12);
  assert.deepEqual(new TileMap(map.atlas, map.toJSONDefinition()).toJSONDefinition(), map.toJSONDefinition());
});
test('grid collision sweeps large movements in all four directions without tunneling', () => {
  const grid = new GridCollision(10, (x, y) => x === 0 || x === 5 || y === 0 || y === 5);
  const box = { x: 20, y: 20, width: 5, height: 5 };
  assert.equal(grid.move(box, 100, 0).x, 45); assert.equal(grid.move(box, -100, 0).x, 10);
  assert.equal(grid.move(box, 0, 100).y, 45);
  const down = grid.move(box, 0, -100); assert.equal(down.y, 10); assert.equal(down.grounded, true);
  assert.equal(grid.move({ ...box, y: 10 }, 0, -1).grounded, true);
  assert.equal(grid.overlaps({ x: 10, y: 10, width: 10, height: 10 }), false);
  assert.throws(() => grid.move({ ...box, x: 1 }, 1, 0), /overlaps/);
});
test('swept collision agrees with a fine-step oracle for seeded random open starts', () => {
  const grid = new GridCollision(10, (x, y) => x < 0 || y < 0 || x > 9 || y > 9 || (x * 7 + y * 3) % 11 === 0);
  for (let x = 1; x < 9; x++) for (let y = 1; y < 9; y++) {
    const box = { x: x * 10 + 2, y: y * 10 + 2, width: 5, height: 5 };
    if (grid.overlaps(box)) continue;
    for (const [dx, dy] of [[50, 0], [-50, 0], [0, 50], [0, -50]]) {
      const swept = grid.move(box, dx, dy); let stepped = box;
      for (let step = 0; step < 500; step++) stepped = grid.move(stepped, dx / 500, dy / 500);
      assert.ok(Math.abs(swept.x - stepped.x) < 1e-8 && Math.abs(swept.y - stepped.y) < 1e-8);
      assert.equal(grid.overlaps(swept), false);
    }
  }
});
test('pixel viewport preserves logical pixels and scales down small screens', () => {
  let size, ratio;
  const renderer = { domElement: { style: {}, getBoundingClientRect: () => ({ left: 10, top: 20, width: 640, height: 360 }) }, setPixelRatio: value => { ratio = value; }, setSize: (...values) => { size = values; } };
  const viewport = new PixelViewport(renderer);
  assert.equal(ratio, 1); assert.deepEqual(size, [320, 180, false]);
  assert.equal(viewport.resize(1000, 700).scale, 3); assert.equal(viewport.resize(160, 90).scale, 0.5);
  const world = viewport.screenToWorld(330, 200); assert.ok(Math.abs(world.x - 160) < 1e-8); assert.ok(Math.abs(world.y - 90) < 1e-8);
});
