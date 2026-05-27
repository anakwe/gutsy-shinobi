# Deployment Guide

This project is static-compatible and can run from any static web host.

## Local production-style run

```bash
cd frontend
npm install
npm run build
npm run preview
```

## Static host deployment

1. Build artifacts from `frontend/dist`.
2. Upload `frontend/dist` to a static host (GitHub Pages, Netlify, Azure Static Web Apps, S3 static hosting, etc.).
3. Ensure `/audio/*` assets are deployed under the same origin.

## GitHub Pages option (manual)

1. Run `npm run build` in `frontend/`.
2. Publish the `frontend/dist` folder with your preferred GitHub Pages flow.
3. Verify audio files load and gameplay works from the deployed URL.

## Rollback plan

- Keep previous build artifact bundles by release tag/date.
- If regression is found, redeploy last known-good `dist` artifact.
- Clear browser cache for validation when switching builds.

## Release-readiness checks

```bash
cd frontend
npm run test:run
npm run build
npm audit --omit=dev
```

Security leak quick checks (run from repository root):

```bash
rg -n "AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|-----BEGIN .*PRIVATE KEY-----"
```

Manual smoke tests:

- Start game, jump/deflect, and complete one level.
- Verify keyboard and touch interactions.
- Verify game-over and restart behavior.
- Verify leaderboard persists after page refresh.

