import * as PAEAN from '@paean-ai/paean-js';
import { OrbitControls } from '@paean-ai/paean-js/addons/controls/OrbitControls.js';

const stage = document.querySelector('#stage'), canvas = document.querySelector('#game');
const renderer = new PAEAN.WebGLRenderer({ canvas, antialias: true }); renderer.setClearColor(0x172332);
const scene = new PAEAN.Scene(), camera = new PAEAN.PerspectiveCamera(42, 1, 0.1, 100); camera.position.set(5, 3.3, 6);
const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.minDistance = 3; controls.maxDistance = 15;
scene.add(new PAEAN.HemisphereLight(0xcbefe5, 0x243144, 3));
const light = new PAEAN.DirectionalLight(0xffe7bd, 5); light.position.set(3, 4, 5); scene.add(light);
const geometry = new PAEAN.TorusKnotGeometry(1, 0.32, 160, 24), material = new PAEAN.MeshStandardMaterial({ color: 0x83d9bb, roughness: 0.3, metalness: 0.55 });
const sculpture = new PAEAN.Mesh(geometry, material); scene.add(sculpture);
const grid = new PAEAN.GridHelper(12, 24, 0x426072, 0x253d4e); grid.position.y = -1.8; scene.add(grid);
const state = { paused: false };
const loop = new PAEAN.FixedStepLoop({ update: dt => { if (!state.paused) sculpture.rotation.y += dt * 0.25; controls.update(dt); }, render: () => renderer.render(scene, camera) });
document.querySelector('#motion').addEventListener('click', () => { state.paused = !state.paused; document.querySelector('#motion').textContent = state.paused ? 'Resume rotation' : 'Pause rotation'; });
const observer = new ResizeObserver(() => { renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(stage.clientWidth, stage.clientHeight); camera.aspect = stage.clientWidth / stage.clientHeight; camera.updateProjectionMatrix(); });
observer.observe(stage); loop.start();
window.demo = { scene, camera, renderer, sculpture, state, loop };
window.addEventListener('pagehide', () => { observer.disconnect(); loop.dispose(); controls.dispose(); geometry.dispose(); material.dispose(); grid.geometry.dispose(); grid.material.dispose(); renderer.dispose(); }, { once: true });
