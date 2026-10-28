# Historical browser release material

The current repository builds the browser game and native macOS/Windows screensaver hosts. Python, Docker, and Keycloak are not required or included in this checkout.

The local costume, particles, HUD, camera and victory-pose changes present before this update are retained in the shared scene. Obsolete fallback emitters and unused Vite starter SVGs are removed. The required browser audio remains under `frontend/public/audio/`; native animation builds exclude it.

The existing leaderboard GIF, palette images, and full demo video remain under `docs/gifs/` and `docs/videos/` as historical browser-only media. Current captures are in [the screenshot gallery](../screenshots/README.md).

Existing `frontend/playtest_out*`, `frontend/screenshots*`, and other diagnostic directories are preserved locally and ignored; they are not part of the prepared change. Local backups and temporary scanner reports are outside this repository.

See the [architecture](../architecture-notes.md), [security review](../security-review.md), and [changelog](../../CHANGELOG.md) for the maintained implementation and validation boundaries.
