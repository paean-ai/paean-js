import { PixelGame, SpriteSheet, Sprite2D, TileLayer, FrameAnimator, GridCollision } from '../dist/bundles/pixel.js';

const source = document.createElement('canvas'); source.width = 80; source.height = 16;
const ctx = source.getContext('2d');
// Source rows are top-down. Each frame is 16 × 16 source pixels.
function block(frame, x, y, width, height, color) { ctx.fillStyle = color; ctx.fillRect(frame * 16 + x, y, width, height); }
block(0, 0, 0, 16, 16, '#31516a'); block(0, 0, 0, 16, 3, '#85c9a7'); block(0, 2, 6, 4, 2, '#45627b'); block(0, 10, 11, 3, 2, '#45627b');
for (const frame of [1, 2]) {
  block(frame, 4, 2, 8, 8, '#f0c58e'); block(frame, 3, 0, 10, 3, '#7cddc3'); block(frame, 9, 5, 2, 2, '#233747');
  block(frame, 3, 10, 10, 4, '#e69e62'); block(frame, frame === 1 ? 3 : 5, 14, 3, 2, '#a2c7dc'); block(frame, frame === 1 ? 10 : 8, 14, 3, 2, '#a2c7dc');
}
block(3, 6, 2, 4, 12, '#86efe0'); block(3, 4, 5, 8, 6, '#86efe0'); block(3, 6, 4, 2, 6, '#e8fff3');
block(4, 2, 8, 12, 6, '#284456'); block(4, 6, 2, 4, 12, '#345a67');
const atlas = SpriteSheet.grid(source, 80, 16, 16);
const tiles = Array(20 * 11).fill(null); for (let i = 20 * 10; i < tiles.length; i++) tiles[i] = '0';
const map = new TileLayer(atlas, { columns: 20, rows: 11, tileSize: 16, tiles, solid: ['0'] });
const collision = new GridCollision(16, (x, y) => map.isSolid(x, y, false));
const player = new Sprite2D(atlas, '1'), animator = new FrameAnimator(player).define('run', { frames: ['1', '2'], fps: 8 });
const coins = [64, 112, 160, 224, 288].map(x => { const coin = new Sprite2D(atlas, '3'); coin.x = x; coin.y = 26; return coin; });
const state = { x: 20, y: 16, vy: 0, score: 0, playing: false, grounded: true };
function status() { document.querySelector('#status').textContent = `${state.score} / 5 crystals · ${state.score === 5 ? 'Collected!' : state.playing ? 'Running' : 'Ready'}`; }
const game = new PixelGame({ canvas: document.querySelector('#game'), width: 320, height: 180, background: '#152b3e', update(dt, game) {
  if (state.playing) {
    const axis = game.input.axis('left', 'right');
    if (game.input.justPressed('jump') && state.grounded) state.vy = 140;
    state.vy -= 400 * dt;
    const next = collision.move({ x: state.x, y: state.y, width: 12, height: 16 }, axis * 80 * dt, state.vy * dt);
    state.x = Math.max(0, Math.min(308, next.x)); state.y = next.y; state.grounded = next.grounded; if (next.hitY) state.vy = 0;
    if (axis) { player.setFlip(axis < 0); animator.play('run').update(dt); } else { animator.stop(); player.setFrame('1'); }
    for (const coin of coins) if (coin.visible && Math.abs(state.x + 6 - coin.x) < 12 && Math.abs(state.y + 8 - coin.y) < 14) {
      coin.visible = false; state.score++; status();
    }
    if (state.score === 5) { state.playing = false; document.querySelector('#play').textContent = 'Play again'; status(); }
  }
  player.x = Math.round(state.x + 6); player.y = Math.round(state.y + 8);
} });
for (let i = 0; i < 20; i++) { const plant = new Sprite2D(atlas, '4'); plant.x = i * 23; plant.y = 24; plant.opacity = 0.45; game.scene.add(plant); }
game.scene.add(map, ...coins, player); player.x = 26; player.y = 24;
document.querySelector('#play').onclick = () => {
  Object.assign(state, { x: 20, y: 16, vy: 0, score: 0, playing: true, grounded: true });
  for (const coin of coins) coin.visible = true; document.querySelector('#play').textContent = 'Restart'; game.canvas.focus(); status();
};
const pointers = new Map();
for (const button of document.querySelectorAll('[data-action]')) {
  button.addEventListener('pointerdown', event => {
    event.preventDefault(); game.canvas.focus(); button.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, button.dataset.action); game.input.setAction(button.dataset.action, true);
  });
  const release = event => {
    const action = pointers.get(event.pointerId); pointers.delete(event.pointerId);
    if (action) game.input.setAction(action, [...pointers.values()].includes(action));
  };
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(event, release);
}
const stage = document.querySelector('#stage'), observer = new ResizeObserver(() => game.resize(stage.clientWidth, stage.clientHeight));
observer.observe(stage); game.start(); window.demo = { game, state, player, coins, atlas, map };
window.addEventListener('pagehide', () => { observer.disconnect(); game.dispose(); }, { once: true });
