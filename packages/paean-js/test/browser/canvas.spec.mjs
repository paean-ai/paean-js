import { test, expect } from '@playwright/test';

for (const name of ['canvas-vector', 'canvas-pixel']) test(`${name} renders through Canvas 2D with WebGL blocked and no three.js requests`, async ({ page }) => {
  const errors = [], modules = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => { if (request.url().endsWith('.js')) modules.push(request.url()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`); });
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...options) {
      if (type !== '2d') throw Error(`Unexpected rendering backend: ${type}`);
      return getContext.call(this, type, ...options);
    };
  });
  await page.goto(`/examples/${name}.html`); await page.waitForFunction(() => !!window.demo);
  const result = await page.evaluate(() => {
    const { game } = window.demo; game.render();
    const data = game.context.getImageData(0, 0, game.canvas.width, game.canvas.height).data, colors = new Set();
    for (let i = 0; i < data.length; i += 4) colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    return { colors: colors.size, width: game.canvas.width, height: game.canvas.height };
  });
  expect(result.colors).toBeGreaterThan(8);
  for (const url of modules) expect(url).not.toMatch(/node_modules|three|compat|\/index\.js|\/game\.js/);
  if (name === 'canvas-pixel') { expect(result.width).toBe(320); expect(result.height).toBe(180); }
  await page.screenshot({ path: `test-results/${name}-desktop.png`, fullPage: true }); expect(errors).toEqual([]);
});

test('Canvas rig switches visible outfits without changing the paused pose', async ({ page }) => {
  await page.goto('/examples/canvas-vector.html'); await page.waitForFunction(() => !!window.demo);
  await page.getByRole('button', { name: 'Pause animation' }).click();
  const before = await page.evaluate(() => {
    const { game, rig } = window.demo; game.render(); window.previousFace = rig.slots.get('face').children[0];
    return { rotation: rig.bones.get('rightArm').rotation, pixels: game.canvas.toDataURL() };
  });
  await page.getByRole('button', { name: 'Switch to explorer' }).click();
  const after = await page.evaluate(() => {
    const { game, rig } = window.demo; game.render();
    return { rotation: rig.bones.get('rightArm').rotation, changed: rig.slots.get('face').children[0] !== window.previousFace, pixels: game.canvas.toDataURL() };
  });
  expect(after.rotation).toBe(before.rotation); expect(after.changed).toBe(true); expect(after.pixels).not.toBe(before.pixels);
});

test('Canvas pixel game accepts keyboard movement and jumping, completes, and restarts', async ({ page }) => {
  await page.goto('/examples/canvas-pixel.html'); await page.waitForFunction(() => !!window.demo);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.keyboard.down('Space'); await expect.poll(() => page.evaluate(() => window.demo.state.y)).toBeGreaterThan(20); await page.keyboard.up('Space');
  await expect.poll(() => page.evaluate(() => window.demo.state.grounded)).toBe(true);
  await page.keyboard.down('ArrowRight'); await expect.poll(() => page.evaluate(() => window.demo.state.score)).toBeGreaterThan(0); await page.keyboard.up('ArrowRight');
  const score = await page.evaluate(() => {
    const { game, state } = window.demo; game.stop(); game.input.setAction('right', true);
    for (let i = 0; i < 300 && state.playing; i++) game.loop.advance(1 / 60);
    game.input.setAction('right', false); return state.score;
  });
  expect(score).toBe(5); await expect(page.locator('#status')).toContainText('Collected!');
  await page.getByRole('button', { name: 'Play again' }).click(); expect(await page.evaluate(() => window.demo.state.score)).toBe(0);
});

test('Canvas pixel mobile sizing, touch controls, and camera coordinate conversion agree', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/examples/canvas-pixel.html'); await page.waitForFunction(() => !!window.demo);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Move right' }).hover(); await page.mouse.down();
  await expect.poll(() => page.evaluate(() => window.demo.state.x)).toBeGreaterThan(30); await page.mouse.up();
  expect(await page.evaluate(() => window.demo.game.input.down('right'))).toBe(false);
  const result = await page.evaluate(() => {
    const { game } = window.demo; game.camera.x = 10; game.camera.y = 20; game.camera.zoom = 2;
    const bounds = game.canvas.getBoundingClientRect();
    return { point: game.screenToWorld(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2), width: game.canvas.width,
      css: bounds.width, overflow: document.documentElement.scrollWidth > innerWidth };
  });
  expect(result.point).toEqual({ x: 90, y: 65 }); expect(result.width).toBe(320); expect(result.css).toBeLessThanOrEqual(375); expect(result.overflow).toBe(false);
  await page.screenshot({ path: 'test-results/canvas-pixel-mobile.png', fullPage: true });
});

test('Canvas rendering preserves image orientation, nearest sampling, slot order, and high-DPI vector resolution', async ({ page }) => {
  await page.goto('/examples/canvas-vector.html'); await page.waitForFunction(() => !!window.demo);
  const result = await page.evaluate(async () => {
    const { CanvasGame } = await import('/dist/2d.js');
    const { SpriteSheet, Sprite2D, TileLayer } = await import('/dist/pixel.js');
    const { Rig2D, VectorPath } = await import('/dist/vector.js');
    const source = document.createElement('canvas'); source.width = source.height = 2;
    const ctx = source.getContext('2d'); ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 2, 1); ctx.fillStyle = '#0000ff'; ctx.fillRect(0, 1, 2, 1);
    const canvas = document.createElement('canvas'), game = new CanvasGame({ canvas, width: 8, height: 8, pixelArt: true });
    const sheet = SpriteSheet.grid(source, 2, 2, 2), sprite = new Sprite2D(sheet, '0'); sprite.x = 4; sprite.y = 4; game.scene.add(sprite); game.render();
    const pixel = (x, y) => [...game.context.getImageData(x, y, 1, 1).data].slice(0, 3);
    const top = pixel(3, 3), bottom = pixel(3, 4); sprite.setFlip(false, true); game.render(); const flipped = pixel(3, 3);
    game.scene.clear(); const map = new TileLayer(sheet, { columns: 1, rows: 1, tileSize: 2, tiles: ['0'] }); game.scene.add(map); game.render(); const tileTop = pixel(0, 6), tileBottom = pixel(0, 7);
    game.scene.clear();
    const rig = new Rig2D({ bones: [{ name: 'a', x: 4, y: 4 }, { name: 'b', parent: 'a' }], slots: [{ name: 'front', bone: 'a', order: 10 }, { name: 'back', bone: 'b', order: -10 }] });
    rig.defineSkin('paint', { front: VectorPath.rectangle(4, 4, { fill: '#00ff00' }), back: VectorPath.rectangle(4, 4, { fill: '#ff0000' }) }).setSkin('paint');
    game.scene.add(rig); game.render(); const ordered = pixel(4, 4); game.dispose();
    const vector = window.demo.game; vector.resize(640, 400, 2); const highDPI = { width: vector.canvas.width, height: vector.canvas.height }; vector.render();
    return { top, bottom, flipped, tileTop, tileBottom, ordered, highDPI };
  });
  expect(result.top).toEqual([255, 0, 0]); expect(result.bottom).toEqual([0, 0, 255]); expect(result.flipped).toEqual([0, 0, 255]);
  expect(result.tileTop).toEqual([255, 0, 0]); expect(result.tileBottom).toEqual([0, 0, 255]); expect(result.ordered).toEqual([0, 255, 0]);
  expect(result.highDPI).toEqual({ width: 1280, height: 800 });
});

test('3d example requests no Paean 2D, pixel, vector, or platform modules', async ({ page }) => {
  const modules = []; page.on('request', request => modules.push(new URL(request.url()).pathname));
  await page.goto('/examples/three.html'); await page.waitForFunction(() => !!window.demo);
  for (const path of modules.filter(path => path.startsWith('/dist/'))) expect(path).not.toMatch(/canvas|pixel|vector|\/two\/|platform|game|index/);
});
