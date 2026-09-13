import { test, expect } from '@playwright/test';

for (const name of ['pixel', 'skeleton', 'three']) test(`${name} renders real geometry without console or network errors`, async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`); });
  await page.goto(`/examples/${name}.html`); await page.waitForFunction(() => !!window.demo);
  await expect.poll(() => page.evaluate(() => (window.demo.renderer ?? window.demo.game.renderer).info.render.triangles)).toBeGreaterThan(10);
  const colors = await page.evaluate(() => {
    const demo = window.demo, renderer = demo.renderer ?? demo.game.renderer;
    renderer.render(demo.scene ?? demo.game.scene, demo.camera ?? demo.game.camera);
    const gl = renderer.getContext(), pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const colors = new Set(); for (let i = 0; i < pixels.length; i += 16) colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
    return colors.size;
  });
  expect(colors).toBeGreaterThan(8);
  await page.screenshot({ path: `test-results/${name}-desktop.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test('pixel gameplay accepts keyboard and touch, collides with the floor, and persists progress', async ({ page }) => {
  await page.goto('/examples/pixel.html'); await page.waitForFunction(() => !!window.demo);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.demo.state.grounded)).toBe(true);
  await page.keyboard.down('Space');
  await expect.poll(() => page.evaluate(() => window.demo.state.y), { intervals: [16, 32, 50] }).toBeGreaterThan(30);
  await page.keyboard.up('Space');
  await expect.poll(() => page.evaluate(() => window.demo.state.grounded)).toBe(true);
  const start = await page.evaluate(() => window.demo.state.x);
  await page.keyboard.down('ArrowRight');
  await expect.poll(() => page.evaluate(() => window.demo.state.x)).toBeGreaterThan(start + 24);
  await page.keyboard.up('ArrowRight');
  await expect.poll(() => page.evaluate(() => window.demo.state.score)).toBe(1);
  await page.getByRole('button', { name: 'Sync best score' }).click();
  await expect(page.locator('#platform-status')).toContainText('Saved on this device');
  await page.reload(); await page.waitForFunction(() => !!window.demo);
  expect(await page.evaluate(() => window.demo.state.best)).toBe(1);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  const button = page.getByRole('button', { name: 'Move right', exact: true });
  await button.hover(); await page.mouse.down();
  await expect.poll(() => page.evaluate(() => window.demo.state.x)).toBeGreaterThan(35);
  await page.mouse.up();
  expect(await page.evaluate(() => window.demo.game.input.down('right'))).toBe(false);
});

test('pixel input resets on blur and keeps multiple bindings for one action consistent', async ({ page }) => {
  await page.goto('/examples/pixel.html'); await page.waitForFunction(() => !!window.demo);
  await page.locator('canvas').focus(); await page.keyboard.down('KeyA'); await page.keyboard.down('ArrowLeft'); await page.keyboard.up('KeyA');
  expect(await page.evaluate(() => window.demo.game.input.down('left'))).toBe(true);
  await page.getByRole('button', { name: 'Play', exact: true }).focus();
  expect(await page.evaluate(() => window.demo.game.input.down('left'))).toBe(false);
  await page.keyboard.up('ArrowLeft');
});

test('all five crystals are reachable through normal movement and jumping', async ({ page }) => {
  await page.goto('/examples/pixel.html'); await page.waitForFunction(() => !!window.demo);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  const final = await page.evaluate(() => {
    const { game, state } = window.demo; game.stop();
    function until(predicate, actions = {}, limit = 600) {
      for (const action of ['left', 'right', 'jump']) game.input.setAction(action, !!actions[action]);
      for (let i = 0; i < limit; i++) { game.loop.advance(1 / 60); if (predicate()) return; }
      throw Error(`Unreachable waypoint: ${JSON.stringify(state)}`);
    }
    until(() => state.grounded);
    until(() => state.x >= 55, { right: true });
    until(() => state.grounded, { right: true, jump: true });
    until(() => state.x >= 149, { right: true });
    until(() => state.grounded);
    until(() => state.x <= 126, { left: true, jump: true });
    until(() => state.grounded);
    until(() => state.x >= 130, { right: true });
    until(() => state.grounded, { right: true, jump: true });
    until(() => state.score === 5, { right: true });
    return { ...state };
  });
  expect(final.score).toBe(5); expect(final.playing).toBe(false);
  await expect(page.locator('#status')).toContainText('All crystals collected');
  await page.getByRole('button', { name: 'Play again' }).click();
  expect(await page.evaluate(() => window.demo.state.score)).toBe(0);
});

test('outfit switching retains the animated pose and changes visible attachments', async ({ page }) => {
  await page.goto('/examples/skeleton.html'); await page.waitForFunction(() => !!window.demo);
  await page.getByRole('button', { name: 'Pause animation' }).click();
  const before = await page.evaluate(() => ({ rotation: window.demo.rig.bones.get('rightArm').rotation.z, uuid: window.demo.rig.slots.get('face').children[0].uuid }));
  await page.getByRole('button', { name: 'Switch to explorer' }).click();
  const after = await page.evaluate(() => ({ rotation: window.demo.rig.bones.get('rightArm').rotation.z, uuid: window.demo.rig.slots.get('face').children[0].uuid }));
  expect(after.rotation).toBe(before.rotation); expect(after.uuid).not.toBe(before.uuid);
  await expect(page.locator('#status')).toContainText('Explorer');
  await page.screenshot({ path: 'test-results/skeleton-explorer.png', fullPage: true });
});

test('small screens keep the logical framebuffer and fit the canvas within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/examples/pixel.html'); await page.waitForFunction(() => !!window.demo);
  const size = await page.locator('canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height, css: canvas.getBoundingClientRect().width }));
  expect(size.width).toBe(320); expect(size.height).toBe(180); expect(size.css).toBeLessThanOrEqual(375);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.screenshot({ path: 'test-results/pixel-mobile.png', fullPage: true });
});

test('preview boots without prompts and a declined paid gate retains the demo', async ({ page }) => {
  await page.addInitScript(() => {
    window.__paeanPreview = true; window.prompts = [];
    window.PaeanSDK = { detect: () => ({ supported: !window.__paeanPreview, reason: window.__paeanPreview ? 'preview' : null }), access: { require: async () => { window.prompts.push('access'); return { unlocked: false }; } } };
  });
  await page.goto('/examples/pixel.html'); await page.waitForFunction(() => !!window.demo);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  expect(await page.evaluate(() => window.prompts)).toEqual([]);
  await page.evaluate(() => { window.__paeanPreview = false; });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Demo mode');
  expect(await page.evaluate(() => window.demo.state.playing)).toBe(false);
  expect(await page.evaluate(() => window.prompts)).toEqual(['access']);
});
