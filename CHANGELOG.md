# Changelog

All notable changes to this project are documented in this file.

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

