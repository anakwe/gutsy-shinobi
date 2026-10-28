# Architecture

## Shared game, two entry points

`frontend/src/main.js` boots interactive browser play with responsive sizing, keyboard/pointer controls, audio, and local scores. `frontend/src/screensaver.js` boots the same `MainScene` with a fixed 960×640 logical canvas scaled to fit its host, 30 FPS, disabled input/audio, hidden HUD, and no access to leaderboard storage. It advances through the six palettes, restarts after collisions or completion, and shifts the camera slowly.

`MainScene.createInteractiveFeatures()` creates the browser-only audio, input adapter, and leaderboard UI. Shutdown removes external listeners and destroys sounds. Scenery and victory effects are cleared before replacement, and projectiles leaving any outer edge are destroyed. The screensaver entry point also destroys its game on page unload or a development hot reload.

## Scene helpers

| Module                                 | Responsibility                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `game/input/inputAdapter.js`           | Keyboard/pointer events to jump, deflect, confirm, and leaderboard callbacks; listener disposal   |
| `game/persistence/leaderboardStore.js` | Bounded JSON loading, validated score rows, name normalisation, sorting, storage failure handling |
| `game/runtime/autoplay.js`             | Pure controller that predicts vertical motion and follows the next gate opening                   |

`game/effects/particleEffects.js` creates capped Phaser 3.90 emitters for trails, dust, sparks and drifting leaves. Level costumes, lacquered HUD panels, look-ahead, and randomized victory poses preserve the local visual changes present before the screensaver adaptation. Ricocheted projectiles remain in the update list; embedded projectiles are destroyed after a short delay.

The scene owns the rendering, physics, collision, level transitions, and overlay lifecycle. The helpers are independent of Phaser. Scene regression tests mock the renderer and verify projectile lifetime, reflected-shot behavior, automatic restart, and palette wrapping.

## Levels

| Level | Palette | Hazards                                      |
| ----- | ------- | -------------------------------------------- |
| 1     | Dawn    | Bamboo gates                                 |
| 2     | Day     | Faster gates and tighter gaps                |
| 3     | Dusk    | Moving bamboo and wind                       |
| 4     | Night   | Enemy ninjas and shurikens; sword deflection |
| 5     | Storm   | Moving bamboo, wind, and shurikens           |
| 6     | Inferno | Combined hazards at maximum configured speed |

The unattended controller uses a narrower range of gate centres for smoother viewing. It uses the actual game jump, collision, and deflection mechanics; it does not bypass collisions.

## Build outputs

The ordinary Vite build includes `index.html`, `screensaver.html`, shared module assets, and game audio. Paths are relative for hosting under a subdirectory.

`vite.screensaver.config.js` produces only `index.html`, `screensaver.js` (a classic IIFE), and `screensaver.css`. Audio and other public assets are excluded. This three-file payload runs without a server in the native hosts.

## Native hosts

The macOS `ScreenSaverView` embeds a nonpersistent WKWebView, serves the three packaged resources through `gutsy://saver/`, and blocks other requests with WebKit content rules. It defers input handling to ScreenSaverEngine and releases the webview on stop. The bundle targets macOS 12+ and includes Intel and Apple Silicon code.

The Windows `.scr` is a WinForms application with WebView2. It uses an isolated temporary profile in private browsing mode, exact resource/navigation allowlists, denied permissions/downloads/popups, and no web messages or host objects. `/s` creates a window per monitor; `/p` embeds a preview in the supplied settings window. Native input polling dismisses all full-screen windows. Temporary profile deletion is best effort because the browser process can briefly retain handles.

Neither host implements authentication, installs system components, or modifies lock policy. Windows requires an already installed WebView2 Evergreen Runtime; macOS uses the system WebKit. See [native setup](screensaver-guide.md), the [security review](security-review.md), and [current screenshots](screenshots/README.md).
