import { Scene, OrthographicCamera, WebGLRenderer, Group, FixedStepLoop, Skeleton2D, VectorShape } from '@paean-ai/paean-js';
import { parseSVG } from '../dist/vector-svg.js';

const stage = document.querySelector('#stage'), canvas = document.querySelector('#game');
const scene = new Scene(), camera = new OrthographicCamera(-160, 160, 100, -100, 0.1, 1000); camera.position.z = 100;
const renderer = new WebGLRenderer({ canvas, antialias: true }); renderer.setClearColor(0x172332);
const floor = VectorShape.rectangle(250, 1, { color: 0x486074 }); floor.position.y = -70; scene.add(floor);
const halo = VectorShape.circle(74, { color: 0x213748, curveSegments: 48 }); halo.position.set(0, 2, -1); scene.add(halo);
const rig = new Skeleton2D({ bones: [
  { name: 'root', y: -8 }, { name: 'head', parent: 'root', y: 36 },
  { name: 'leftArm', parent: 'root', x: -18, y: 20 }, { name: 'rightArm', parent: 'root', x: 18, y: 20 },
  { name: 'leftLeg', parent: 'root', x: -9, y: -16 }, { name: 'rightLeg', parent: 'root', x: 9, y: -16 },
], slots: [
  { name: 'leftSleeve', bone: 'leftArm', order: 1 }, { name: 'rightSleeve', bone: 'rightArm', order: 1 },
  { name: 'leftBoot', bone: 'leftLeg', order: 2 }, { name: 'rightBoot', bone: 'rightLeg', order: 2 },
  { name: 'body', bone: 'root', order: 3 }, { name: 'face', bone: 'head', order: 4 },
] });

function piece(width, height, color, y = 0) { const shape = VectorShape.rectangle(width, height, { color }); shape.position.y = y; return shape; }
function makeSkin(explorer) {
  const body = new Group(), face = new Group();
  const primary = explorer ? 0xf2bf78 : 0x86e8c1, secondary = explorer ? 0xb17150 : 0x407d79;
  body.add(piece(34, 44, primary, 4)); body.add(piece(34, 8, secondary, -12));
  const badge = parseSVG('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12"><path fill="#244355" d="M6 0L12 6L6 12L0 6Z"/><path fill="#eaf5de" d="M6 3L9 6L6 9L3 6Z"/></svg>');
  badge.position.set(-6, 15, 0.1); body.add(badge);
  face.add(VectorShape.circle(16, { color: primary, curveSegments: 24 }));
  face.add(piece(25, 11, 0x183347, 0));
  for (const x of [-6, 6]) { const eye = piece(4, 3, 0xc9f7dd, 0); eye.position.x = x; eye.position.z = 0.2; face.add(eye); }
  if (explorer) { face.add(piece(44, 5, secondary, 13)); face.add(piece(25, 12, secondary, 20)); }
  else { const antenna = piece(2, 10, secondary, 21); face.add(antenna); const light = VectorShape.circle(3, { color: 0xf0be78 }); light.position.y = 27; face.add(light); }
  const limb = (color, boot) => { const group = new Group(); group.add(piece(11, boot ? 31 : 26, color, boot ? -16 : -12)); group.add(piece(boot ? 16 : 11, 8, secondary, boot ? -31 : -25)); return group; };
  return { body, face, leftSleeve: limb(primary, false), rightSleeve: limb(primary, false), leftBoot: limb(0x54798b, true), rightBoot: limb(0x54798b, true) };
}
const courier = makeSkin(false), explorer = makeSkin(true);
rig.defineSkin('courier', courier).defineSkin('explorer', explorer).setSkin('courier'); scene.add(rig);
const times = [0, 0.5, 1, 1.5, 2];
const clip = rig.createClip('greeting', 2, [
  { bone: 'root', property: 'y', times, values: [-8, -5, -8, -5, -8] },
  { bone: 'head', property: 'rotation', times, values: [0.06, -0.08, 0.06, -0.08, 0.06] },
  { bone: 'leftArm', property: 'rotation', times, values: [-0.2, 0.1, -0.2, 0.1, -0.2] },
  { bone: 'rightArm', property: 'rotation', times, values: [2.3, 1.8, 2.3, 1.8, 2.3] },
  { bone: 'leftLeg', property: 'rotation', times, values: [-0.08, 0.08, -0.08, 0.08, -0.08] },
  { bone: 'rightLeg', property: 'rotation', times, values: [0.08, -0.08, 0.08, -0.08, 0.08] },
]);
rig.play(clip);
const state = { skin: 'courier', paused: false };
const loop = new FixedStepLoop({ update: dt => { if (!state.paused) rig.update(dt); }, render: () => renderer.render(scene, camera) });
document.querySelector('#outfit').addEventListener('click', () => {
  state.skin = state.skin === 'courier' ? 'explorer' : 'courier'; rig.setSkin(state.skin);
  document.querySelector('#outfit').textContent = `Switch to ${state.skin === 'courier' ? 'explorer' : 'courier'}`;
  document.querySelector('#status').textContent = `${state.skin === 'courier' ? 'Courier' : 'Explorer'} · Native AnimationMixer`;
});
document.querySelector('#motion').addEventListener('click', () => { state.paused = !state.paused; document.querySelector('#motion').textContent = state.paused ? 'Resume animation' : 'Pause animation'; });
const observer = new ResizeObserver(() => {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(stage.clientWidth, stage.clientHeight);
  const aspect = stage.clientWidth / stage.clientHeight; camera.left = -100 * aspect; camera.right = 100 * aspect; camera.updateProjectionMatrix();
}); observer.observe(stage); loop.start();
window.demo = { rig, state, loop, renderer, scene, camera };
window.addEventListener('pagehide', () => {
  observer.disconnect(); loop.dispose(); rig.dispose();
  const resources = new Set();
  for (const skin of [courier, explorer]) for (const attachment of Object.values(skin)) attachment.traverse(object => {
    if (object.isMesh) { resources.add(object.geometry); resources.add(object.material); }
  });
  floor.dispose(); halo.dispose(); for (const resource of resources) resource.dispose(); renderer.dispose();
}, { once: true });
