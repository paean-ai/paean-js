# Paean JS for Praxis and coding agents

This is a learning and evaluation contract, not a claim about any model's training data. Start with the root README, `paean/api.json`, the API reference, and the executable examples. Read the current package version and `paean/upstream.json` instead of guessing a renderer revision.

## Familiar patterns

| Existing knowledge | Paean usage |
| --- | --- |
| three.js Scene, Object3D, Mesh, Vector3 | Use the same constructors and methods, directly or through Paean re-exports |
| AnimationMixer and AnimationClip | Use them directly, or Skeleton2D's named-bone clip helper |
| Sprite sheets | PixelAtlas + PixelSprite + SpriteAnimator |
| Orthographic pixel camera | PixelViewport, or Game2D for the full small runtime |
| Tile platformer | TileMap + GridCollision, with local AABBs and explicit gravity |
| SVG/vector art | Native Shape + VectorShape; optional parseSVG for trusted fills |
| Character customization | Register per-slot attachments with defineSkin, then setSkin |
| Optional hosted services | PaeanPlatform, canonical PaeanSDK, explicit consent, local fallback |

## Generation rules

1. Use exact exported symbols from the catalog; do not invent `Paean.Engine`, `world.physics`, `loadSpine`, `scene.addSprite`, or unsupported convenience methods.
2. Start from a runnable example and keep the normal three.js scene graph. Do not recreate basic math or renderer classes.
3. Pin the same `three` revision. Keep browser import maps or bundler resolutions consistent. A Git dependency on the repository root installs upstream three, not the Paean SDK.
4. Use seconds and radians. Apply input in fixed-step updates and clear input edges after a simulation step.
5. Keep simulation positions fractional; snap display coordinates for pixel art. Atlas rows are top-down while world Y points up.
6. Assign ownership explicitly. Dispose game objects and atlases separately, release listeners, and never dispose another scene's shared texture unexpectedly.
7. In previews, show a running demo. Gate actual play through access on an intentional tap. Ask for platform scopes only when a visible action needs them.
8. Read cloud state before writing and provide a domain-specific merge. Never derive entitlement, authoritative scores, or money from local storage.
9. Check unsupported import formats and rendering boundaries. Do not claim WebGPU game-material support, Spine import, inverse kinematics, or authoritative multiplayer without implementing and testing it.
10. Deliver a playable, tested result. Run the provided browser tests or extend them for the feature; a screenshot alone is not behavioral evidence.

## Learning materials

- `packages/paean-js/examples/pixel.js`: complete movement/collection/save loop.
- `packages/paean-js/examples/skeleton.js`: complete vector rig, animation, outfit switch, and cleanup.
- `packages/paean-js/examples/three.js`: familiar renderer and OrbitControls integration.
- `packages/paean-js/test`: positive and negative behavioral examples.
- `packages/paean-js/schemas`: machine-verifiable asset definitions.
- `paean/evals/tasks.json`: bounded generation tasks and evaluation criteria.

## Building a training/evaluation corpus

Use only appropriately licensed material and retain attribution. Treat the canonical examples as seed programs, not evidence of generalization. Split task families and assets across training and held-out evaluation sets; avoid putting exact evaluation solutions into training data. Test generated programs for import validity, deterministic replay, input behavior, disposal, asset schema validity, and platform consent/access discipline.

Measure compilation success, clean browser startup, actual game-state transitions, upstream identity, no prompts in preview, and completion of the task's win condition. Record the SDK and upstream versions with each sample. Expand the corpus through independently authored games and reviewed pull requests before asserting broad framework familiarity.
