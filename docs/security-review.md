# Security and privacy review

Review date: 2026-10-28. This review applies to the GitHub-connected `gutsy-shinobi` project, including the local visual and capture-tool changes present before the screensaver adaptation. It is source/build validation, not a penetration-test certification or approval to distribute unsigned code.

## Checks

| Check                 | Result                                                                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend tests        | 27 passing cases, including bounded effects, projectile lifetime, denied storage, autoplay, and local capture targets                                                                             |
| Windows arguments     | 21 passing launch-argument cases                                                                                                                                                                  |
| Browser runtime       | A six-level autoplay cycle, 20 forced restarts, bounded particles/listeners, and browser play with denied storage checked                                                                         |
| Build validation      | Browser/offline outputs, universal macOS bundle, and Windows x64/ARM64 packages compile                                                                                                           |
| macOS runtime         | Packaged WKWebView content renders; stopping a preview releases the webview                                                                                                                       |
| npm / NuGet audits    | No known vulnerable dependencies reported after the updates                                                                                                                                       |
| Source scan           | No detected credentials or unintended personal filesystem paths; attribution exceptions are explained below                                                                                       |
| Historical scan       | Gitleaks 8.30.1 found no secrets in this repository's four existing commits                                                                                                                       |
| Screenshots and media | Fresh app-only captures contain no saved names or descriptive PNG metadata; existing GIF/video metadata and the retained audio were checked for personal paths, email addresses and owner details |

Updating Puppeteer cleared four high-severity dependency advisories reported for its previous development-tool dependency tree. Puppeteer is now a development dependency. Local browser tools restrict targets to loopback HTTP(S), keep Chromium sandboxing enabled, use fresh profiles, close browsers on failure, and do not persist diagnostic HTML or stack traces.

Audits reflect advisories available at review time. Gitleaks ran locally with redacted reporting, using the official release verified against its published SHA-256 checksum. Temporary backups, test tools and scan reports are outside this repository. Source contents were not uploaded for scanning.

## Attribution and history

The MIT copyright notice in `LICENSE` is intentionally preserved, including its existing author name. Public repository/homepage/issue URLs are also retained so the software remains associated with its real GitHub project. Optional package author metadata is removed; required legal attribution is not treated as an accidental credential leak.

Earlier commits still contain the prior package author metadata and Git author/committer identities. No history rewriting, force-pushing, credential rotation or publishing was performed. There were no detected live credentials to remove or rotate. A clean next commit does not erase earlier blobs, and a secret scanner does not prove that every possible identifier is absent from history.

## Runtime boundaries

- The app has no backend, account/login service, analytics, remote leaderboard or ad integration. Ad boxes are static canvas placeholders.
- Browser leaderboard data is untrusted and user-editable. Reads/writes can fail; JSON size, row count, names, scores and timestamps are validated before use.
- Native hosts load only three packaged offline animation files and do not read browser scores or load audio. macOS uses nonpersistent WebKit data; Windows uses a private, isolated temporary WebView2 profile.
- Native hosts restrict resources/navigation and provide no JavaScript-to-native bridge. Windows denies permissions, popups and downloads; temporary profile deletion is best effort if browser processes retain handles briefly.
- Burst and foliage emitters have finite particle caps. Projectiles leaving the screen are culled, ricochets stay in the update list, and embedded shots have a short bounded lifetime.
- The OS owns locking and authentication. Enable password-on-resume explicitly; a browser preview or manually launched full-screen window does not lock the computer.

## Repository boundaries

Ignore rules exclude secrets, environment files, signing material, editor/cloud settings, dependencies, generated packages and existing local capture/debug directories. Existing `frontend/playtest_out*` and `frontend/screenshots*` directories remain on disk and are excluded from the change. Their raw diagnostic contents should not be shared without a separate review.

CI uses read-only repository permissions, full commit pins for official actions, disabled checkout credential persistence, and job time limits. Signing material and generated native packages are not uploaded by the workflow. No Git remote settings are replaced by this update.

## Release limits

Windows secure-desktop behavior, actual idle activation/password-on-resume, display sleep, multiple monitors and target-OS policies need manual validation on supported devices. Local macOS builds use ad-hoc signing; Developer ID/notarization and Windows Authenticode signing remain release steps. Keep signing keys outside the repository.

See [native setup](screensaver-guide.md), [deployment](deployment-guide.md), [release checks](release-checklist.md), and [current screenshots](screenshots/README.md).
