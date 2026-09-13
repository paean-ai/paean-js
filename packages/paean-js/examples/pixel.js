import { CanvasTexture } from '@paean-ai/paean-js/3d';
import { Game2D, GridCollision, PixelAtlas, PixelSprite, SpriteAnimator, TileMap } from '@paean-ai/paean-js/3d/pixel';
import { VectorShape } from '@paean-ai/paean-js/3d/vector';
import { PaeanPlatform } from '@paean-ai/paean-js/platform';
import { Random } from '@paean-ai/paean-js/core';

const source = document.createElement('canvas'); source.width = 64; source.height = 16;
const brush = source.getContext('2d');
for (let frame = 0; frame < 2; frame++) {
  const x = frame * 16;
  brush.fillStyle = '#244c54'; brush.fillRect(x + 3, 3, 10, 11);
  brush.fillStyle = '#91f4cc'; brush.fillRect(x + 4, 1, 8, 8); brush.fillRect(x + 5, 9, 6, 4);
  brush.fillStyle = '#112c3d'; brush.fillRect(x + 5, 4, 6, 3);
  brush.fillStyle = '#f4c77b'; brush.fillRect(x + 5, 5, 2, 1); brush.fillRect(x + 9, 5, 2, 1);
  brush.fillStyle = '#64bfae'; brush.fillRect(x + 3 + frame, 13, 4, 3); brush.fillRect(x + 9 - frame, 13, 4, 3);
}
brush.fillStyle = '#35485a'; brush.fillRect(32, 0, 16, 16); brush.fillStyle = '#6f94a0'; brush.fillRect(32, 0, 16, 3);
brush.fillStyle = '#263748'; brush.fillRect(33, 5, 6, 3); brush.fillRect(42, 10, 5, 3);
brush.fillStyle = '#ffc978'; brush.fillRect(54, 2, 4, 12); brush.fillRect(51, 5, 10, 6);
brush.fillStyle = '#fff0b6'; brush.fillRect(54, 3, 2, 7);
const texture = new CanvasTexture(source), atlas = PixelAtlas.grid(texture, 64, 16, 16);
const random = new Random(42), stage = document.querySelector('#stage'), status = document.querySelector('#status');
const platform = new PaeanPlatform({ namespace: 'paean-crystal-courier-v1' });
let save = platform.loadLocal('save', { best: 0 });
if (!save || typeof save.best !== 'number' || !Number.isFinite(save.best)) save = { best: 0 };
const state = { playing: false, score: 0, best: save.best, x: 24, y: 32, vy: 0, grounded: false };
let time = 0, hero, animation, collision;
const coins = [];
const game = new Game2D({ canvas: document.querySelector('#game'), clearColor: 0x111f30, update(dt) {
  time += dt;
  if (state.playing) {
    const axis = game.input.axis('left', 'right');
    if (game.input.justPressed('jump') && state.grounded) state.vy = 190;
    state.vy -= 420 * dt;
    const next = collision.move({ x: state.x, y: state.y, width: 10, height: 14 }, axis * 80 * dt, state.vy * dt);
    state.x = next.x; state.y = next.y; state.grounded = next.grounded;
    if (next.hitY) state.vy = 0;
    if (axis) { hero.setFlip(axis < 0); animation.update(dt); } else hero.setFrame('0');
    for (const coin of coins) if (coin.visible && Math.abs(state.x + 5 - coin.position.x) < 12 && Math.abs(state.y + 7 - coin.position.y) < 16) {
      coin.visible = false; state.score++; state.best = Math.max(state.best, state.score);
      platform.saveLocal('save', { best: state.best }); renderStatus();
      if (state.score === coins.length) { state.playing = false; status.textContent = `All crystals collected! Best ${state.best}/5`; document.querySelector('#play').textContent = 'Play again'; }
    }
  } else if (state.score === 0) animation.update(dt);
  hero.position.set(Math.round(state.x + 5), Math.round(state.y + 7), 0);
  coins.forEach((coin, i) => { coin.position.y = coin.userData.baseY + Math.round(Math.sin(time * 3 + i) * 2); });
} });

for (let i = 0; i < 40; i++) {
  const star = VectorShape.rectangle(1, 1, { color: 0x5b7895 }); star.position.set(random.int(0, 319), random.int(50, 175), -2); game.scene.add(star);
}
for (let i = 0; i < 10; i++) {
  const ridge = VectorShape.polygon([[0, 0], [25, random.int(25, 65)], [55, 0]], { color: i % 2 ? 0x1a3042 : 0x213a4b });
  ridge.position.set(i * 36 - 20, 16, -1); game.scene.add(ridge);
}
const tiles = Array(20 * 11).fill(null);
for (let column = 0; column < 20; column++) tiles[10 * 20 + column] = '2';
for (const [start, end, row] of [[5, 8, 8], [11, 14, 6], [16, 18, 8]]) for (let column = start; column <= end; column++) tiles[row * 20 + column] = '2';
const map = new TileMap(atlas, { columns: 20, rows: 11, tiles, tileSize: 16, solid: ['2'] }); map.renderOrder = 1; game.scene.add(map);
collision = new GridCollision(16, (x, y) => map.isSolid(x, y));
hero = new PixelSprite(atlas, '0'); hero.renderOrder = 3; game.scene.add(hero);
animation = new SpriteAnimator(hero).define('walk', { frames: ['0', '1'], fps: 8 }).play('walk');
for (const [x, y] of [[58, 28], [108, 61], [154, 28], [200, 94], [280, 61]]) {
  const coin = new PixelSprite(atlas, '3'); coin.position.set(x, y, 0); coin.renderOrder = 2; coin.userData.baseY = y;
  coins.push(coin); game.scene.add(coin);
}
function renderStatus() { status.textContent = `Crystals ${state.score}/5 · Best ${state.best}/5`; }
document.querySelector('#play').addEventListener('click', async () => {
  const access = await platform.requireAccess();
  if (!access.unlocked) { status.textContent = 'Demo mode · Open on 8x to unlock play.'; return; }
  Object.assign(state, { playing: true, score: 0, x: 24, y: 32, vy: 0, grounded: false });
  coins.forEach(coin => { coin.visible = true; }); document.querySelector('#play').textContent = 'Restart';
  game.input.reset(); game.canvas.focus(); renderStatus();
});
document.querySelector('#sync').addEventListener('click', async () => {
  await platform.connect(['storage.kv']);
  const result = await platform.syncSave('save', { best: state.best }, (cloud, local) => ({ best: Math.max(typeof cloud?.best === 'number' ? cloud.best : 0, local.best) }));
  state.best = result.value.best; renderStatus();
  document.querySelector('#platform-status').textContent = result.synced ? 'Best score synced with Paean.' : 'Saved on this device. Cloud sync is available inside Paean / 8x.';
});
for (const button of document.querySelectorAll('[data-action]')) {
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); game.input.setAction(button.dataset.action, true); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => game.input.setAction(button.dataset.action, false));
}
const observer = new ResizeObserver(() => { if (stage.clientWidth && stage.clientHeight) game.viewport.resize(stage.clientWidth, stage.clientHeight); }); observer.observe(stage);
renderStatus(); game.start();
window.demo = { game, state, hero, map, coins, platform };
window.addEventListener('pagehide', () => {
  observer.disconnect(); game.stop(); platform.dispose();
  game.scene.traverse(object => { if (object.isMesh) { object.geometry.dispose(); object.material.dispose(); } });
  atlas.dispose(); texture.dispose(); game.dispose();
}, { once: true });
