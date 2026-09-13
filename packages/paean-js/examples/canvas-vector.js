// Split browser bundles share their Node2D implementation. No import map or three.js installation is needed.
import { CanvasGame, Node2D } from '../dist/bundles/2d.js';
import { VectorPath, Rig2D } from '../dist/bundles/vector.js';

const stage = document.querySelector('#stage'), state = { paused: false, outfit: 'robot' };
const rig = new Rig2D({
  bones: [{ name: 'root', x: 160, y: 74 }, { name: 'head', parent: 'root', y: 55 },
    { name: 'leftArm', parent: 'root', x: -24, y: 26 }, { name: 'rightArm', parent: 'root', x: 24, y: 26 },
    { name: 'leftLeg', parent: 'root', x: -13, y: -6 }, { name: 'rightLeg', parent: 'root', x: 13, y: -6 }],
  slots: [{ name: 'legL', bone: 'leftLeg', order: 0 }, { name: 'legR', bone: 'rightLeg', order: 1 },
    { name: 'armL', bone: 'leftArm', order: 2 }, { name: 'body', bone: 'root', order: 3 },
    { name: 'face', bone: 'head', order: 4 }, { name: 'armR', bone: 'rightArm', order: 5 }],
});
function rectangle(w, h, color, x = 0, y = 0) {
  const node = VectorPath.rectangle(w, h, { fill: color }); node.x = x; node.y = y; return node;
}
function skin(explorer) {
  const body = new Node2D(), face = new Node2D(), color = explorer ? '#e7b465' : '#81ddc5';
  body.add(rectangle(44, 43, color, 0, 16), rectangle(34, 7, '#324557', 0, 3));
  const badge = VectorPath.fromSVGPath('M 0 -7 L 6 0 L 0 7 L -6 0 Z', { fill: '#f9df8b', stroke: '#243d4b', lineWidth: 1.5 }); badge.y = 24; body.add(badge);
  face.add(VectorPath.circle(20, { fill: explorer ? '#f1c3a1' : '#bbefe5', stroke: '#20384a', lineWidth: 2 }));
  face.add(rectangle(26, 9, '#22344c', 0, 1), rectangle(5, 4, '#8bf0dc', -7, 1), rectangle(5, 4, '#8bf0dc', 7, 1));
  if (explorer) face.add(rectangle(46, 6, '#806b4c', 0, 16), rectangle(30, 14, '#b69464', 0, 23));
  else face.add(rectangle(3, 12, '#82d4c5', 0, 25), Object.assign(VectorPath.circle(3, { fill: '#f0b875' }), { y: 32 }));
  return { body, face, armL: rectangle(12, 33, color, 0, -13), armR: rectangle(12, 33, color, 0, -13),
    legL: rectangle(15, 34, '#567b91', 0, -16), legR: rectangle(15, 34, '#567b91', 0, -16) };
}
rig.defineSkin('robot', skin(false)).defineSkin('explorer', skin(true)).setSkin('robot');
rig.play(rig.createClip('wave', 2, [
  { bone: 'rightArm', property: 'rotation', times: [0, 0.5, 1, 1.5, 2], values: [1.5, 2.3, 1.8, 2.4, 1.5] },
  { bone: 'root', property: 'y', times: [0, 1, 2], values: [74, 77, 74] },
  { bone: 'head', property: 'rotation', times: [0, 1, 2], values: [-0.08, 0.08, -0.08] },
]));
const game = new CanvasGame({ canvas: document.querySelector('#game'), width: 320, height: 200, background: '#172b3a', update: dt => { if (!state.paused) rig.update(dt); } });
for (let x = 0; x < 320; x += 20) for (let y = 0; y < 200; y += 20) game.scene.add(rectangle(1, 1, '#2e4657', x, y));
const halo = VectorPath.circle(68, { fill: '#203c4b' }); halo.x = 160; halo.y = 102;
game.scene.add(halo, rectangle(120, 3, '#43636d', 160, 34), rig);
document.querySelector('#outfit').onclick = () => {
  state.outfit = state.outfit === 'robot' ? 'explorer' : 'robot'; rig.setSkin(state.outfit);
  document.querySelector('#outfit').textContent = state.outfit === 'robot' ? 'Switch to explorer' : 'Switch to robot';
  document.querySelector('#status').textContent = `${state.outfit === 'robot' ? 'Robot' : 'Explorer'} · Canvas 2D`;
};
document.querySelector('#motion').onclick = () => {
  state.paused = !state.paused; document.querySelector('#motion').textContent = state.paused ? 'Resume animation' : 'Pause animation';
};
const observer = new ResizeObserver(() => game.resize(stage.clientWidth, stage.clientHeight)); observer.observe(stage);
game.start(); window.demo = { game, rig, state };
window.addEventListener('pagehide', () => { observer.disconnect(); rig.dispose(); game.dispose(); }, { once: true });
