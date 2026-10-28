# Play and preview

## Browser game

Guide the shinobi through bamboo gates to earn points. Six levels introduce speed, moving bamboo, wind, and enemy shurikens. Sword deflection becomes available in level 4; successful deflections add combo bonuses. Level completion advances automatically after a short victory animation.

![Browser gameplay](screenshots/gameplay.png)

| Input                               | Action                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| Space / pointer press               | Jump                                                                                        |
| Enter / pointer release             | Deflect when the window is open; otherwise confirm, close an overlay, or restart when armed |
| L                                   | Toggle leaderboard                                                                          |
| Esc                                 | Close leaderboard when not entering a name                                                  |
| A–Z, 0–9, space, underscore, hyphen | High-score name entry, up to 12 characters                                                  |
| Backspace / Enter                   | Edit / save a high-score name                                                               |

After a crash, the game waits five seconds before offering high-score entry or restart. A high-score name must be saved before closing that overlay. Resizing the browser restarts the current run.

## Local scores

The top ten scores are stored in that browser's `localStorage`. Clearing site data removes them. Storage restrictions do not stop the game, but scores may not persist. Names and scores remain local; they are editable by the user and are not suitable as a trusted shared leaderboard.

## Screensaver animation

Open `/screensaver.html` on the development or production web host for silent autoplay. It hides the HUD, prompts, ad placeholders, and local scores; it creates no game controls and loads no audio. It cycles through all six palettes and restarts automatically. Close the tab to end a browser preview.

![Screensaver night palette](screenshots/screensaver-night.png)

The installed native hosts let the OS start/stop the animation. Input dismisses a native saver, and the configured OS password policy controls sign-in. The animation cannot be used for interactive play while locked. See [screensaver installation](screensaver-guide.md), [the gallery](screenshots/README.md), and [security notes](security-review.md).
