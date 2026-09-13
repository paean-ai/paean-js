# Scope and roadmap

Paean JS 0.2.0 adds independently loadable Canvas vector and pixel modules to the native-three compatibility boundary. The implementation, tests, and examples are the source of truth. The following distinction prevents aspirational features from being mistaken for shipped capabilities.

| Area | Shipped | Potential future work |
| --- | --- | --- |
| Renderer | Independent Canvas 2D and native three.js entries, aliases, WebGPU/TSL namespaces | Game-specific node materials and a WebGPU validation matrix |
| Vector | Canvas Path2D fills/strokes, holes, polygons and SVG path data; native-three shapes and trusted SVG fills | GPU stroke tessellation, native-three gradient materials, batching, richer SVG-document support |
| Skeleton | Canvas Rig2D and native-three Skeleton2D, hierarchical cutouts, fades, slots, outfits | 2D weighted deformation, constraints, inverse kinematics, editor tooling |
| Pixel | Atlases, variable-duration clips, integer enlargement, tile layers | Trimmed/rotated atlas metadata, chunk streaming, per-tile UV transforms |
| Authoring | Aseprite JSON and limited Tiled JSON conversion | Additional importers with explicit compatibility and licensing tests |
| Runtime | Fixed-step loop, input actions, seeded random, resource ownership | Scene transition helpers, gamepad profiles, deterministic replay recordings |
| Collision | Swept static-grid AABB | Slopes, one-way platforms, collision events, optional physics adapters |
| Services | Optional canonical host adapter, saves, scores, service detection | Stronger application-specific sync policies, room/reconnect recipes |
| Model tooling | English docs, schemas, API catalog, executable tasks | Licensed game corpus, held-out benchmarks, Praxis training and evaluation |

Native three.js capabilities such as audio, loaders, weighted SkinnedMesh, WebXR, and postprocessing remain available through upstream APIs. Their existence does not imply a new Paean abstraction is necessary.

No date or compatibility commitment is made for future work. Before adding an API, provide a real game use case, an ownership/lifecycle contract, a minimal example, measurable acceptance tests, and a plan to keep upstream merges small.
