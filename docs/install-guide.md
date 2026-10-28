# Install and develop

## Browser prerequisites

Use Node.js 22.12+ and npm 10+. Node 24 LTS was used for the current checks. Browser screenshot/playtest tooling is a development dependency. Use an installed Chrome (detected automatically on macOS), set `PUPPETEER_EXECUTABLE_PATH`, or explicitly install the browser with `npx puppeteer browsers install chrome`. Dependency installation skips browser download scripts.

The browser app needs no Python, database, Docker service, Keycloak instance, account, or environment file.

```sh
cd frontend
npm ci --ignore-scripts
npm run dev
```

Vite binds to `127.0.0.1` and uses a strict port. Open `http://127.0.0.1:5173/` for the game or `/screensaver.html` for autoplay. If the port is occupied, stop the conflicting process or supply a different port. Dependencies are installed from `package-lock.json`; lifecycle scripts are skipped.

## Verify the checkout

From the repository root:

```sh
npm --prefix frontend run test:run
npm --prefix frontend run build
npm --prefix frontend run build:screensaver
```

The browser build is `frontend/dist/`. The three-file offline payload is `frontend/dist-screensaver/`. Both are generated and ignored by Git.

## Native prerequisites

| Target                      | Build requirements                              | Target-machine requirements                                        |
| --------------------------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| macOS Intel / Apple Silicon | macOS, Xcode build tools, frontend dependencies | macOS 12+; approved and selected screensaver                       |
| Windows x64 / ARM64         | Windows, .NET 10 SDK, frontend dependencies     | Windows 11; WebView2 Evergreen Runtime; complete generated package |

Builds do not install a saver or change OS settings. Follow the [screensaver guide](screensaver-guide.md) for build commands, installation, password-on-resume settings, and signing requirements. See the [gallery](screenshots/README.md) for current appearance and the [security review](security-review.md) for validation limits.

## Local capture tools

With the Vite server running, use `npm --prefix frontend run playtest -- http://127.0.0.1:5173/` for startup checks or `npm --prefix frontend run screenshots -- http://127.0.0.1:5173/screensaver.html` for fresh-profile captures. Run from `frontend/` to place default output in its ignored `artifacts/` folder. Both tools accept loopback HTTP(S) targets only, keep Chromium sandboxing enabled, and close the browser on failure. They do not write HTML dumps or stack traces to the repository.
