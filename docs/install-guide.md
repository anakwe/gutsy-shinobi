# Install Guide

## Prerequisites

- Node.js 20+
- npm 10+

Check installed versions:

```bash
node --version
npm --version
```

## Local install (desktop)

```bash
cd frontend
npm install
```

## Run locally

```bash
cd frontend
npm run dev
```

Open the printed Vite URL in your browser (usually `http://localhost:5173`).

## Verify install

```bash
cd frontend
npm run build
npm run test:run
```

If build succeeds, your local setup is ready.

If tests fail, check for known issues in `README.md` and `frontend/src/game/persistence/leaderboardStore.test.js`.
