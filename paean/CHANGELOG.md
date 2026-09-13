# Changelog

## 0.2.0 — 2026-09-13

Separate 3D, Canvas vector, and Canvas pixel workloads at their runtime and package-import boundaries.

- Add `/core`, `/2d`, `/vector`, `/pixel`, `/formats`, `/platform`, and a pure upstream `/3d` entry. Vector and pixel Canvas modules neither import each other nor depend on three.js.
- Add CanvasGame/Node2D, Path2D shapes, cutout Rig2D animation and outfits, SpriteSheet/Sprite2D, FrameAnimator, TileLayer, and PixelGame with integer enlargement.
- Retain root/game APIs and native-three objects. Add selective `/3d/vector` and `/3d/pixel` adapters, and migrate existing examples to explicit imports.
- Make three.js and its type package optional peers. **Installation change:** native-three/root/game consumers must explicitly install the exact renderer peer; TypeScript consumers of those entries also install matching `@types/three`. Pure 2D consumers install neither.
- Preserve constructor identity across CommonJS subpaths and shared ESM browser chunks. Supply selective static-browser bundles with upstream three.js external.
- Share renderer-independent asset definitions, format conversion, frame timing, and collision logic with native-three adapters.
- Add renderer-free installed-package/type checks, graph and transfer-budget tests, and Canvas browser tests with WebGL disabled.
- Update English API/migration/architecture/model guidance and executable modular evaluation seeds. Upstream synchronization aligns both optional peers and development copies while leaving Canvas implementations independent.

The native three.js baseline remains r186 / 0.186.0. Canvas and native-three scene graphs are distinct; moving an existing native-three game to Canvas requires explicit transform/style/asset adaptation. The root remains compatible, but is an aggregate and therefore intentionally loads the original combined graph. No npm publication is implied.

## 0.1.0 — 2026-09-13

Initial Paean game SDK on the unmodified three.js r186 source/history.

- Preserve upstream core, addon/source, WebGPU, and TSL interfaces through native exports and generated proxies.
- Add fixed-step runtime, scoped input, reproducible random values, and async asset ownership.
- Add vector shapes, trusted SVG fills, native bone animation, attachment slots, and outfit switching.
- Add pixel atlases, variable-duration sprite animation, integer viewport scaling, tile layers, and swept grid collision.
- Add Aseprite and finite orthogonal Tiled JSON conversion with explicit unsupported-format errors.
- Add optional Paean/8x host integration with preview discipline, access gating, local persistence, cloud merge, and queued scores.
- Add TypeScript, ESM/CommonJS distribution, three browser examples, behavioral and consumer tests, English documentation, schemas, and a machine-readable agent contract.
- Add upstream provenance checks and a stable-release synchronization PR workflow.

This release does not include npm publication, a weighted 2D/Spine runtime, WebGPU-specific game materials, or a trained Praxis model. Those are separate release or development activities.
