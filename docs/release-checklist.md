# Public Release Checklist

Use this checklist before making the repository public.

## Repository hygiene

- [ ] Confirm no secrets in tracked files (`.env`, tokens, keys, private certs).
- [ ] Confirm `.gitignore` covers generated artifacts and local secrets.
- [ ] Verify archived files in `docs/archive/` contain no sensitive data.

## Quality checks

- [ ] Run frontend tests: `cd frontend && npm run test:run`.
- [ ] Run production build: `cd frontend && npm run build`.
- [ ] Run dependency audit: `cd frontend && npm audit --omit=dev`.
- [ ] Perform a manual playthrough and restart flow check.

## Public metadata

- [ ] Update `frontend/package.json` `repository`, `homepage`, and `bugs` URLs.
- [ ] Verify `README.md` quick start and controls are accurate.
- [ ] Confirm license file is present and correct (`LICENSE`).
- [ ] Add release notes / tag (`v1.0.0` or chosen version).

## Optional hardening

- [ ] Enable GitHub secret scanning and dependency alerts.
- [ ] Add branch protection and required checks before merge.
