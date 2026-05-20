# Architecture Notes (MVP)

## High-level component view

- `frontend/src/main.js`: Phaser scene orchestration and game lifecycle.
- `frontend/src/game/input/inputAdapter.js`: input event mapping layer (keyboard/touch -> game actions).
- `frontend/src/game/persistence/leaderboardStore.js`: local leaderboard storage adapter and sanitization logic.

## Data flow

1. Input adapter emits action callbacks (`jump`, `confirm`, `deflect`, UI toggles).
2. Main scene applies gameplay state changes and physics updates.
3. Leaderboard store reads/writes local score data in `localStorage`.

## Dependency direction

- `main.js` depends on small domain helpers (`inputAdapter`, `leaderboardStore`).
- Helpers are framework-agnostic and testable in isolation.

## Key trade-offs

- Keep single-scene gameplay to avoid risky rewrites.
- Extract only high-value seams (input + persistence) to improve testability now.
- Local-only persistence keeps MVP simple but has no cross-device integrity.

## Future evolution path

- Split scene systems further (obstacles, shurikens, UI overlays).
- Add deterministic simulation tests around scoring/collision windows.
- Introduce optional cloud leaderboard behind same persistence interface.
