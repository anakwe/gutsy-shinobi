# Release checklist

Screensaver support is unreleased. Run these checks in this GitHub-connected checkout before a release; generated packages are not committed.

## Source and privacy

- [ ] Review the complete staged diff, including pre-existing local changes.
- [ ] Scan source and staged files for credentials, unintended personal paths and screenshot metadata.
- [ ] Keep MIT attribution and public repository URLs intact; omit optional personal package metadata.
- [ ] Confirm environment files, signing keys, diagnostic output, dependencies and build outputs are ignored.

## Automated checks

- [ ] `npm --prefix frontend ci --ignore-scripts`
- [ ] `npm --prefix frontend run test:run`
- [ ] `npm --prefix frontend run build`
- [ ] `npm --prefix frontend run build:screensaver`
- [ ] `npm --prefix frontend audit` (include development tooling)
- [ ] `dotnet run --project screensaver/tests/LaunchOptions.Tests.csproj`
- [ ] Build the universal macOS bundle and both Windows packages; review NuGet audit results.

## Target-device behavior

- [ ] Browser controls, costume progression, effects, scores, overlays and restart flow.
- [ ] Native settings previews, repeated start/stop, multiple monitors, offline operation and display sleep.
- [ ] Actual idle activation and password-on-resume on each supported OS. A manual preview does not prove locking.
- [ ] Developer ID signing/notarization for macOS and Authenticode signing for Windows distribution.

## Documentation and publication

- [ ] Verify [README](../README.md), [native setup](screensaver-guide.md), [security review](security-review.md), and [screenshots](screenshots/README.md).
- [ ] Update the unreleased [changelog](../CHANGELOG.md) and version only when tagging a release.
- [ ] Review package contents and signing provenance; preserve every Windows package file together.
- [ ] Publish only after explicit approval; repository edits do not authorize a push or release.
