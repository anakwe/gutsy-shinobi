# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added

- Silent offline autoplay and native macOS universal `.saver` and Windows x64/ARM64 `.scr` hosts.
- Automatic progression/restart, private webviews, bounded effects, and framework-free Windows launch-argument checks.
- Current screenshots, native installation/signing guides, security review, and pinned CI build actions.

### Changed

- Extracted the shared scene while retaining local costume, particle, HUD, camera and victory-pose work.
- Updated Vite, Vitest and browser capture tooling; moved Puppeteer to development dependencies.
- Reworked local capture scripts to use loopback targets, fresh browser profiles and enabled Chromium sandboxing.
- Refreshed docs, comments and ignore rules; retained the MIT license and historical demo media.

### Fixed

- Validated untrusted local score data and handled unavailable storage.
- Released sound/listener resources and culled offscreen or embedded projectiles during long runs.
- Kept ricocheted shots in the update list and migrated particle effects to the Phaser 3.90 emitter API.
- Removed the previously documented sanitisation assertion failure and unused Vite template assets.

## [1.0.0] - 2026-05-20

### Added

- Public release docs for setup, gameplay, deployment, and release readiness.
- `docs/release-checklist.md` for pre-publish quality and security checks.
- `SECURITY.md` with vulnerability reporting guidance.
- `LICENSE` (MIT).

### Changed

- Updated `README.md` with desktop quick start, controls, testing, and privacy notes.
- Updated frontend metadata in `frontend/package.json` for public repository publishing.
- Improved HTML metadata in `frontend/index.html`.
- Switched to stable Vite 7 for reliable local build behavior.

### Fixed

- Corrected leaderboard name-sanitization test expectation in `frontend/src/game/persistence/leaderboardStore.test.js`.
- Resolved npm dependency advisories via `npm audit fix`.
