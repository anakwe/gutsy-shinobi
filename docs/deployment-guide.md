# Build and deployment

## Static web release

From the repository root:

```sh
npm --prefix frontend ci --ignore-scripts
npm --prefix frontend run test:run
npm --prefix frontend run build
npm --prefix frontend run preview
```

Preview binds to `127.0.0.1:4173`. Deploy the entire `frontend/dist/` directory to a static host, keeping `audio/` and `assets/` beside the generated HTML pages. Relative asset paths support subdirectory hosting. `/index.html` is playable; `/screensaver.html` is silent autoplay. Vite's development and preview servers are local verification tools, not production servers.

HTML includes a content security policy. A production host can additionally send CSP and `X-Content-Type-Options: nosniff` as response headers; preserve required image and style sources when doing so. The native payload has a stricter offline policy. The browser documents retain loopback HMR allowances for development; they do not allow arbitrary remote data connections.

## Native packages

Follow [screensaver-guide.md](screensaver-guide.md). The macOS build produces a universal `.saver`; the Windows script produces a self-contained .NET package for x64 or ARM64. All builds go under `screensaver/build/`, outside the commit. Keep the Windows apphost, managed assemblies, native loader, runtime, and `Web/` payload together.

Before distribution, apply the appropriate release signatures and macOS notarization. The existing local macOS ad-hoc signature is a build verification aid. Neither build script installs a saver, changes system policy, or fetches WebView2 on target devices.

## Checks before a release

Automated checks cover 27 frontend cases, 21 launch-argument cases, web/offline builds, and native compilation. GitHub Actions has read-only repository permissions and references official actions by full commit IDs. See the dated [security review](security-review.md) for results and historical-content findings.

Manually verify browser jump/deflect/restart, name entry and persistence, native settings previews, actual idle activation, password-on-resume, mouse/keyboard dismissal, repeated starts/stops, multiple monitors, display sleep, and offline operation on each target OS. A Windows cross-build cannot verify secure-desktop behavior. Confirm screenshots still match the shipped version; the [current gallery](screenshots/README.md) was captured on 2026-10-28.

## Rollback

Keep a known-good web release and native package for each target. Roll back by redeploying the previous web output or selecting/installing the earlier native saver. Recheck sign-in behavior after a native change. Generated packages and signing identities must stay outside the repository.
