# Paean JS repository guide

- Read `README.md`, `paean/upstream.json`, and `paean/docs/architecture.md` first.
- The root package is upstream `three`. The Paean SDK is `packages/paean-js`.
- Preserve upstream-owned files in `paean/upstream.json`; implement extensions by composition.
- Use English for new documentation, comments, identifiers, and contribution text.
- Preserve original exports and constructor identity. Do not wrap, monkey-patch, or embed another three.js copy.
- Prefer selective entry points. Keep core, Canvas/vector/pixel, formats, and platform free of three.js runtime/type imports. Keep `/3d` a pure upstream re-export; use explicit native-three adapters for mixed scenes.
- Public APIs need types, ownership rules, runnable examples, and behavioral tests.
- Use seconds and radians. The world is Y-up; atlas pixels and serialized tile rows are top-down.
- Platform services are optional. Use the canonical PaeanSDK helper; no prompts on boot or in preview, no fake bridge, and no credentials.
- Read cloud state before writing it. Applications define merge policy. Local state never establishes paid ownership.
- Run `node scripts/paean/check-upstream.mjs`, `npm run check --prefix packages/paean-js`, and relevant browser tests.
- Keep `paean/api.json`, schemas, examples, `llms.txt`, and the API reference aligned with exports.
- Follow `paean/docs/upstream.md` for maintenance. Never force-push or auto-merge updates.
- Do not claim model familiarity, platform certification, unsupported formats, or untested renderer compatibility.
