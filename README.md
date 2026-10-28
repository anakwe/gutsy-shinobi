# Gutsy Shinobi

A Phaser browser game and silent, automatic screensaver animation for macOS and Windows. Guide the shinobi through bamboo gates in browser play, or let the automatic player cycle through six levels of scenery. Scores stay in the browser; there is no backend, account system, advertising service, or shared leaderboard.

![Silent screensaver animation in the dawn palette](docs/screenshots/screensaver-dawn.png)

## Play or preview

Requires Node.js 22.12+; Node 24 LTS is the tested development version.

```sh
cd frontend
npm ci --ignore-scripts
npm run dev
```

Open `http://127.0.0.1:5173/` to play, or `http://127.0.0.1:5173/screensaver.html` for silent autoplay. The preview is a web page; it does not lock your computer.

| Input                    | Browser game action                                       |
| ------------------------ | --------------------------------------------------------- |
| Space or pointer press   | Jump                                                      |
| Enter or pointer release | Deflect during a timing window; otherwise confirm/restart |
| L                        | Toggle the local leaderboard                              |
| Esc                      | Close the leaderboard outside name entry                  |
| Typing / Backspace       | Enter / edit a high-score name                            |

![Browser gameplay with HUD and decorative side gutters](docs/screenshots/gameplay.png)

Screenshots were captured on 2026-10-28. See the [screenshot gallery](docs/screenshots/README.md) for night and native macOS views and capture details. The visible ad boxes are decorative placeholders drawn on the game canvas.

## Build native screensavers

From the repository root, after installing frontend dependencies:

```sh
# macOS with Xcode build tools: Intel and Apple Silicon in one bundle.
bash screensaver/macos/build.sh
```

```powershell
# Windows with the .NET 10 SDK; use -Runtime win-arm64 for ARM64.
./screensaver/windows/build.ps1
```

Outputs live under `screensaver/build/` and are excluded from Git. Windows packages need an installed WebView2 Evergreen Runtime, and all generated files must stay together. See the [screensaver guide](docs/screensaver-guide.md) for installation, signing, platform limits, and password settings.

The operating system handles authentication. Configure password protection on resume; input dismisses the native saver. Interactive play is available after signing in. These hosts do not replace the OS lock screen or preboot login display.

## Validate

```sh
npm --prefix frontend run test:run
npm --prefix frontend run build
npm --prefix frontend run build:screensaver
dotnet run --project screensaver/tests/LaunchOptions.Tests.csproj
```

The current suite has 27 frontend tests and 21 Windows launch-argument cases. GitHub Actions checks the frontend audit and builds the macOS bundle and Windows x64/ARM64 packages. Platform lock/resume and release signing remain manual release checks; see the [security review](docs/security-review.md).

## Repository and documentation

| Path                   | Purpose                                                                                                                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/`            | Browser game, shared scene, tests, offline animation build                                                                                                                                                                          |
| `screensaver/macos/`   | ScreenSaverView/WKWebView host and universal build script                                                                                                                                                                           |
| `screensaver/windows/` | WinForms/WebView2 host and Windows build script                                                                                                                                                                                     |
| `screensaver/tests/`   | Framework-free launch-argument checks                                                                                                                                                                                               |
| `docs/`                | [Install](docs/install-guide.md), [usage](docs/user-guide.md), [deployment](docs/deployment-guide.md), [architecture](docs/architecture-notes.md), [security](docs/security-review.md), and [cleanup notes](docs/archive/README.md) |

Local leaderboard data is editable and is not a trusted competition record. Screensaver mode does not read or display it. The app requires no backend or authentication service. Attribution and historical package metadata are covered separately in the security review.

## License and earlier media

[MIT License](LICENSE). The copyright notice is retained as required by the license. Repository, issue-tracker and homepage URLs continue to identify the existing GitHub project.

The [leaderboard GIF](docs/gifs/leaderboard-showcase.gif) and [full demo video](docs/videos/full-demo.mp4) from the browser-only release are retained as historical media. The dated screenshot gallery above represents the current implementation, including native screensaver mode.
