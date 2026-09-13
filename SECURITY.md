# Security policy

Report vulnerabilities privately through [GitHub private vulnerability reporting](https://github.com/paean-ai/paean-js/security/advisories/new). Include the affected version, a minimal reproduction, and expected impact. Do not publish credentials, player data, or an exploit in a public issue. If private reporting is unavailable, ask a maintainer for a private channel without including exploit details.

Security fixes target the latest Paean development release and pinned upstream version. No long-term support commitment is made for 0.x. Maintainers coordinate upstream issues with three.js; its original policy is preserved in `paean/upstream/SECURITY.md`.

Applications must treat remote assets and save data as untrusted. Validate schemas and application-specific values, enforce download/geometry limits, and process only trusted SVG with `parseSVG`. This SDK is not an asset sandbox or an authoritative multiplayer server. Local storage does not establish paid ownership, financial transactions, or competitive score validity.

Platform integrations use the canonical PaeanSDK helper. This repository contains no authentication tokens, private endpoints, or replacement transport. Optional services remain subject to the host's consent, ownership, quota, and error contracts.
