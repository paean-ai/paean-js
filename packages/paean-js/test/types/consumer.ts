import * as THREE from 'three';
import { Mesh, Game2D, Skeleton2D, PixelAtlas, PixelSprite, SpriteAnimator, PaeanPlatform, VectorShape, Random } from '@paean-ai/paean-js';
import { GLTFLoader } from '@paean-ai/paean-js/addons/loaders/GLTFLoader.js';
import { WebGPURenderer } from '@paean-ai/paean-js/webgpu';
import { vec3 } from '@paean-ai/paean-js/tsl';
import { parseSVG } from '@paean-ai/paean-js/vector-svg';

const mesh: THREE.Mesh = new Mesh();
const group: THREE.Group = new Skeleton2D({ bones: [{ name: 'root' }] });
const sprite = new PixelSprite(PixelAtlas.grid(new THREE.Texture(), 16, 16, 16), '0');
new SpriteAnimator(sprite).define('idle', { frames: ['0'], durations: [0.1] });
const platform = new PaeanPlatform({ namespace: 'types' });
void platform.syncSave('save', { best: 3 }, (cloud, local) => ({ best: Math.max(cloud?.best ?? 0, local.best) }));
new Game2D({ update(dt, game) { game.scene.add(mesh, group); sprite.position.x += dt; } });
void [new GLTFLoader(), WebGPURenderer, vec3(1, 2, 3), parseSVG, VectorShape.circle(1), new Random(3)];
// @ts-expect-error A sprite animation must specify a frame rate or durations.
new SpriteAnimator(sprite).define('invalid', { frames: ['0'] });
// @ts-expect-error Bone rotations are numeric radians.
new Skeleton2D({ bones: [{ name: 'root', rotation: '90deg' }] });
